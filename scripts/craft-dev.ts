import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { scriptLog } from "./logger.ts";
import {
  getDevPort,
  getLocalNextUrl,
  getLocalRevalidateUrl,
  readRootEnv,
} from "./root-env.ts";

const logger = scriptLog("craft");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const craftDir = resolve(rootDir, "craft");
const ddevEnvPath = resolve(craftDir, ".ddev/.env.web");
const craftEnvKeys = [
  "CRAFT_APP_ID",
  "CRAFT_ENVIRONMENT",
  "CRAFT_LICENSE_KEY",
  "CRAFT_DB_DRIVER",
  "CRAFT_DB_SERVER",
  "CRAFT_DB_PORT",
  "CRAFT_DB_DATABASE",
  "CRAFT_DB_USER",
  "CRAFT_DB_PASSWORD",
  "CRAFT_DB_SCHEMA",
  "CRAFT_DB_TABLE_PREFIX",
  "CRAFT_SECURITY_KEY",
  "CRAFT_DEV_MODE",
  "CRAFT_ALLOW_ADMIN_CHANGES",
  "CRAFT_DISALLOW_ROBOTS",
  "REVALIDATE_SECRET",
  "CRAFT_REVALIDATE_URL",
  "CRAFT_PREVIEW_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "PRIMARY_SITE_URL",
  "ASSET_BASE_URL",
  "ASSET_BASE_PATH",
  "MAILPIT_SMTP_HOSTNAME",
  "MAILPIT_SMTP_PORT",
];

export function isCraftRunning() {
  const status = spawnSync("ddev", ["describe", "-j"], {
    cwd: craftDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (status.status !== 0) return false;

  try {
    return hasRunningStatus(JSON.parse(status.stdout));
  } catch {
    const output = `${status.stdout}\n${status.stderr}`;
    return /\brunning\b/i.test(output) && !/\bstopped\b/i.test(output);
  }
}

function hasRunningStatus(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  if (record.running === true || record.status === "running") return true;

  return Object.values(record).some((item) => hasRunningStatus(item));
}

export function startCraftIfNeeded() {
  const envChanged = syncCraftWebEnv();

  if (isCraftRunning()) {
    if (envChanged) {
      logger.info("DDEV environment changed; restarting Craft containers");
      const restart = runDdev(["restart"]);

      if (restart.status !== 0) {
        process.exit(restart.status ?? 1);
      }
    } else {
      logger.info("DDEV is already running");
    }

    ensureCraftReady();
    printCraftUrls();
    return false;
  }

  logger.info("DDEV is not running; starting Craft containers");
  const start = spawnSync("ddev", ["start"], {
    cwd: craftDir,
    stdio: "inherit",
  });

  if (start.status !== 0) {
    process.exit(start.status ?? 1);
  }

  ensureCraftReady();
  printCraftUrls();
  return true;
}

export function ensureCraftReady() {
  ensureComposerDependencies();

  const installState = runDdev(["exec", "php", "craft", "install/check"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = `${installState.stdout ?? ""}\n${installState.stderr ?? ""}`;

  if (installState.status !== 0 && !/not installed/i.test(output)) {
    process.stdout.write(output);
    process.exit(installState.status ?? 1);
  }

  if (!/not installed/i.test(output)) {
    logger.info("Craft is installed");
    return;
  }

  const dumpPath = resolve(craftDir, "_backup-db/db.sql");

  if (!existsSync(dumpPath)) {
    logger.warn("Craft is not installed and no local DB dump was found", {
      expectedDump: "craft/_backup-db/db.sql",
    });
    return;
  }

  logger.info("Craft is not installed; importing local database dump");
  runDdev(["import-db", "--file", "_backup-db/db.sql"]);

  const afterImport = runDdev(["exec", "php", "craft", "install/check"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (afterImport.status !== 0 || /not installed/i.test(String(afterImport.stdout ?? ""))) {
    process.stdout.write(afterImport.stdout ?? "");
    process.stderr.write(afterImport.stderr ?? "");
    process.exit(afterImport.status ?? 1);
  }

  logger.info("applying Craft project config");
  runDdev(["exec", "php", "craft", "project-config/apply"]);
}

function ensureComposerDependencies() {
  if (existsSync(resolve(craftDir, "vendor/autoload.php"))) {
    logger.info("PHP dependencies are installed");
    return;
  }

  logger.info("installing PHP dependencies");
  runDdev(["composer", "install"]);
}

function runDdev(args: string[], options: SpawnSyncOptions = {}) {
  const result = spawnSync("ddev", args, {
    cwd: craftDir,
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

export function syncCraftWebEnv() {
  const env = readRootEnv(rootDir);
  const craftUrl = getCraftUrl();
  const devPort = getDevPort(env);

  if (!env.CRAFT_PREVIEW_SECRET?.trim()) {
    throw new Error("Missing CRAFT_PREVIEW_SECRET. Run bun env:create first.");
  }

  Object.assign(env, {
    CRAFT_ENVIRONMENT: "dev",
    CRAFT_DB_DRIVER: "mysql",
    CRAFT_DB_SERVER: "db",
    CRAFT_DB_PORT: "3306",
    CRAFT_DB_DATABASE: "db",
    CRAFT_DB_USER: "db",
    CRAFT_DB_PASSWORD: "db",
    CRAFT_DB_SCHEMA: "public",
    CRAFT_DB_TABLE_PREFIX: "",
    CRAFT_DEV_MODE: "true",
    CRAFT_ALLOW_ADMIN_CHANGES: "true",
    CRAFT_DISALLOW_ROBOTS: "true",
    CRAFT_REVALIDATE_URL: getLocalRevalidateUrl(devPort),
    NEXT_PUBLIC_SITE_URL: getLocalNextUrl(devPort),
    PRIMARY_SITE_URL: craftUrl,
    ASSET_BASE_URL: craftUrl,
    ASSET_BASE_PATH: "@webroot",
  });

  const lines = craftEnvKeys
    .filter((key) => env[key] !== undefined)
    .map((key) => `${key}=${quoteEnvValue(env[key])}`);
  const content = `${lines.join("\n")}\n`;
  const current = existsSync(ddevEnvPath)
    ? readFileSync(ddevEnvPath, "utf8")
    : "";

  if (current === content) {
    return false;
  }

  writeFileSync(ddevEnvPath, content);
  return true;
}

function quoteEnvValue(value: string | undefined) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function getCraftProjectName() {
  const config = readFileSync(resolve(craftDir, ".ddev/config.yaml"), "utf8");
  const match = config.match(/^name:\s*["']?([^"'\n]+)["']?/m);
  return match?.[1]?.trim() || "craft";
}

export function getCraftUrl() {
  return `http://${getCraftProjectName()}.ddev.site`;
}

export function printCraftUrls() {
  const craftUrl = getCraftUrl();

  logger.info("Craft URLs", {
    site: craftUrl,
    admin: `${craftUrl}/admin`,
    graphql: `${craftUrl}/gql/api`,
  });
}

export function stopCraft() {
  const stop = spawnSync("ddev", ["stop"], {
    cwd: craftDir,
    stdio: "inherit",
  });

  return stop.status ?? 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startCraftIfNeeded();
}

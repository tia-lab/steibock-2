import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCloudflareResourceNames } from "./cloudflare-config.ts";
import { scriptLog } from "./logger.ts";
import {
  DEFAULT_DEV_PORT,
  getDevPort,
  getLocalNextUrl,
} from "./root-env.ts";

const logger = scriptLog("env");
const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const appDir = resolve(rootDir, "app");
const craftDir = resolve(rootDir, "craft");
const source = resolve(rootDir, ".env.example");
const targets = [".env"];
const force = process.argv.includes("--force");
const projectName = getProjectName();
const craftHost = `${projectName}.ddev.site`;
const projectDefaults = {
  PROJECT_NAME: projectName,
  CRAFT_GRAPHQL_ENDPOINT: `http://${craftHost}/gql/api`,
  CRAFT_PRIMARY_URL: `http://${craftHost}`,
};

if (!existsSync(source)) {
  throw new Error(`Missing source env file: ${source}`);
}

for (const target of targets) {
  const targetPath = resolve(rootDir, target);
  const created = !existsSync(targetPath);

  if (created || force) {
    copyFileSync(source, targetPath);
    logger.info("created env file from example", { file: target });
  } else {
    logger.info("env file already exists; syncing template contract", { file: target });
  }

  syncEnvProjectDefaults(targetPath, created || force);
}

syncDdevProjectName();
syncWranglerProjectName();
removeGeneratedDdevFiles();

logger.info("project identity synced", {
  projectName,
  craftHost,
});

function getProjectName() {
  const explicit = readArgValue("--project-name") ?? readArgValue("--project");
  const raw = explicit || process.env.PROJECT_NAME || basename(rootDir);
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error(`Invalid project name: ${raw}`);
  }

  return normalized;
}

function readArgValue(name: string) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function syncEnvProjectDefaults(file: string, overwrite: boolean) {
  let content = readFileSync(file, "utf8");
  const legacyRevalidateSecret =
    readEnvValue(content, "NEXT_REVALIDATE_SECRET") ||
    readEnvValue(content, "CRAFT_REVALIDATE_SECRET");
  content = syncEnvTemplate(content);
  const devPort = getDevPort({
    DEV_PORT: readEnvValue(content, "DEV_PORT") || String(DEFAULT_DEV_PORT),
  });

  for (const [key, value] of Object.entries(projectDefaults)) {
    content = setEnvValue(content, key, value, overwrite);
  }

  content = setEnvValue(content, "DEV_PORT", String(devPort), overwrite);
  content = setLocalNextUrl(content, devPort, overwrite);
  content = syncGeneratedEnvValues(content, overwrite, legacyRevalidateSecret);

  writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`);
}

function setLocalNextUrl(content: string, devPort: number, overwrite: boolean) {
  const current = readEnvValue(content, "NEXT_PUBLIC_SITE_URL");

  if (!overwrite && current && !isLoopbackUrl(current)) {
    return content;
  }

  return setEnvValue(
    content,
    "NEXT_PUBLIC_SITE_URL",
    getLocalNextUrl(devPort),
    true,
  );
}

function isLoopbackUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

function syncEnvTemplate(content: string) {
  const values = new Map(
    content
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => [match[1], match[2]]),
  );

  return readFileSync(source, "utf8")
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
      if (!match || !values.has(match[1])) return line;
      return `${match[1]}=${values.get(match[1])}`;
    })
    .join("\n");
}

function syncGeneratedEnvValues(content: string, overwrite: boolean, legacyRevalidateSecret: string) {
  content = setEnvValue(content, "CRAFT_SECURITY_KEY", `"${randomBytes(32).toString("base64")}"`, overwrite);

  const revalidateSecret =
    readEnvValue(content, "REVALIDATE_SECRET") ||
    legacyRevalidateSecret ||
    randomBytes(32).toString("hex");

  content = setEnvValue(content, "REVALIDATE_SECRET", revalidateSecret, overwrite);

  const previewSecret =
    readEnvValue(content, "CRAFT_PREVIEW_SECRET") ||
    randomBytes(32).toString("hex");

  content = setEnvValue(content, "CRAFT_PREVIEW_SECRET", previewSecret, overwrite);

  return content;
}

function setEnvValue(content: string, key: string, value: string, overwrite: boolean) {
  const linePattern = new RegExp(`^${key}=.*$`, "m");
  const existing = content.match(linePattern)?.[0];

  if (!existing) {
    return `${content.replace(/\s*$/, "")}\n${key}=${value}\n`;
  }

  if (!overwrite && !isStarterDefault(existing)) {
    return content;
  }

  return content.replace(linePattern, `${key}=${value}`);
}

function isStarterDefault(line: string) {
  return (
    line.endsWith("=") ||
    line.includes("ubiq-next") ||
    line.includes("localhost:3000") ||
    line === "PROJECT_NAME=ubiq-next"
  );
}

function readEnvValue(content: string, key: string) {
  const value = content.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();

  if (!value) return "";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function syncDdevProjectName() {
  const configPath = resolve(craftDir, ".ddev/config.yaml");

  if (!existsSync(configPath)) {
    logger.warn("DDEV config is missing; skipped project name sync", {
      file: "craft/.ddev/config.yaml",
    });
    return;
  }

  const content = readFileSync(configPath, "utf8");
  const next = content.match(/^name:/m)
    ? content.replace(/^name:\s*.*$/m, `name: ${projectName}`)
    : `name: ${projectName}\n${content}`;

  if (next !== content) {
    writeFileSync(configPath, next);
    logger.info("DDEV project name synced", { file: "craft/.ddev/config.yaml" });
  }
}

function syncWranglerProjectName() {
  const configPath = resolve(appDir, "wrangler.jsonc");

  if (!existsSync(configPath)) {
    logger.warn("Wrangler config is missing; skipped resource name sync", {
      file: "app/wrangler.jsonc",
    });
    return;
  }

  const { workerName, bucketName, databaseName } =
    getCloudflareResourceNames(projectName);
  const content = readFileSync(configPath, "utf8");
  let next = replaceRequiredProperty(
    content,
    /^(\s*"name"\s*:\s*)"[^"]+"/m,
    `$1"${workerName}"`,
    "Worker name",
  );

  next = syncBindingProperty(
    next,
    "WORKER_SELF_REFERENCE",
    "service",
    workerName,
  );
  next = syncBindingProperty(
    next,
    "NEXT_INC_CACHE_R2_BUCKET",
    "bucket_name",
    bucketName,
  );
  next = syncBindingProperty(
    next,
    "NEXT_TAG_CACHE_D1",
    "database_name",
    databaseName,
    true,
  );

  if (next !== content) {
    writeFileSync(configPath, next);
    logger.info("Cloudflare resource names synced", {
      file: "app/wrangler.jsonc",
    });
  }
}

function syncBindingProperty(
  content: string,
  binding: string,
  property: string,
  value: string,
  clearDatabaseId = false,
) {
  const bindingPattern = new RegExp(
    `\\{[^{}]*"binding"\\s*:\\s*"${binding}"[^{}]*\\}`,
  );
  const block = content.match(bindingPattern)?.[0];

  if (!block) {
    throw new Error(`Unable to locate Wrangler binding: ${binding}`);
  }

  const propertyPattern = new RegExp(`("${property}"\\s*:\\s*)"([^"]*)"`);
  const currentValue = block.match(propertyPattern)?.[2];

  if (currentValue === undefined) {
    throw new Error(`Unable to locate ${property} for Wrangler binding: ${binding}`);
  }

  let updatedBlock = block.replace(propertyPattern, `$1"${value}"`);

  if (clearDatabaseId && currentValue !== value) {
    updatedBlock = updatedBlock.replace(
      /^\s*"database_id"\s*:\s*"[^"]*"\s*,?\r?\n/m,
      "",
    );
  }

  return content.replace(block, updatedBlock);
}

function replaceRequiredProperty(
  content: string,
  pattern: RegExp,
  replacement: string,
  label: string,
) {
  const next = content.replace(pattern, replacement);

  if (next === content && !pattern.test(content)) {
    throw new Error(`Unable to locate Wrangler ${label}.`);
  }

  return next;
}

function removeGeneratedDdevFiles() {
  const files = [resolve(craftDir, ".ddev/.env.web")];
  const traefikConfigDir = resolve(craftDir, ".ddev/traefik/config");

  if (existsSync(traefikConfigDir)) {
    for (const file of readdirSync(traefikConfigDir)) {
      if (file.endsWith(".yaml")) {
        files.push(resolve(traefikConfigDir, file));
      }
    }
  }

  for (const file of files) {
    if (!existsSync(file)) continue;

    rmSync(file);
    logger.info("removed generated DDEV file", {
      file: file.replace(`${rootDir}/`, ""),
    });
  }
}

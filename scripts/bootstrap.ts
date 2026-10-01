import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startCraftIfNeeded } from "./craft-dev.ts";
import { scriptLog } from "./logger.ts";
import {
  getDevPort,
  getLocalRevalidateUrl,
  readRootEnv,
  rootProcessEnv,
} from "./root-env.ts";

const logger = scriptLog("bootstrap");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = resolve(rootDir, "app");
const craftDir = resolve(rootDir, "craft");
const envPath = resolve(rootDir, ".env");
const gqlTokenName = "NextJs";

function run(command: string, args: string[], cwd = rootDir) {
  const label = [command, ...args].join(" ");
  const step = logger.step(label);
  const result = spawnSync(command, args, {
    cwd,
    env: rootProcessEnv(rootDir),
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  step.done(label);
}

function runOutput(command: string, args: string[], cwd = rootDir) {
  return spawnSync(command, args, {
    cwd,
    env: rootProcessEnv(rootDir),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function findGraphqlSchemaUid() {
  const schemasDir = resolve(craftDir, "config/project/graphql/schemas");

  for (const file of readdirSync(schemasDir)) {
    if (!file.endsWith(".yaml")) continue;

    const content = readFileSync(resolve(schemasDir, file), "utf8");

    if (/^name:\s*['"]?NextJs['"]?\s*$/m.test(content)) {
      return file.replace(/\.yaml$/, "");
    }
  }

  throw new Error("Could not find the NextJs GraphQL schema UID.");
}

function getExistingGraphqlToken() {
  const result = runOutput("ddev", [
    "mysql",
    "-N",
    "-B",
    "-e",
    `select accessToken from gqltokens where name='${gqlTokenName}' and enabled=1 order by id desc limit 1;`,
  ], craftDir);

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim().split(/\r?\n/).find(Boolean) ?? null;
}

function isCurrentGraphqlToken(token: string) {
  const result = runOutput("ddev", [
    "mysql",
    "-N",
    "-B",
    "-e",
    `select count(*) from gqltokens where accessToken='${escapeSql(token)}' and enabled=1 limit 1;`,
  ], craftDir);

  return result.status === 0 && Number(result.stdout.trim()) > 0;
}

function createGraphqlToken() {
  const schemaUid = findGraphqlSchemaUid();
  const result = runOutput("ddev", [
    "exec",
    "php",
    "craft",
    "graphql/create-token",
    schemaUid,
    `--name=${gqlTokenName}`,
    "--interactive=0",
  ], craftDir);

  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const match = result.stdout.match(/Token saved:\s*([^\s]+)/);

  if (!match) {
    throw new Error("Craft did not return a GraphQL token.");
  }

  return match[1];
}

function upsertEnvValue(path: string, key: string, value: string) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.trimEnd()}\n${line}\n`;

  if (next !== current) {
    writeFileSync(path, next);
  }
}

function ensureGraphqlToken() {
  const envToken = readRootEnv(rootDir).CRAFT_GRAPHQL_TOKEN;

  if (envToken && isCurrentGraphqlToken(envToken)) {
    logger.info("GraphQL token already exists in .env");
    return envToken;
  }

  if (envToken) {
    logger.warn("GraphQL token in .env is not present in the current Craft database");
  }

  const existingToken = getExistingGraphqlToken();

  if (existingToken) {
    logger.info("found existing local Craft GraphQL token");
    upsertEnvValue(envPath, "CRAFT_GRAPHQL_TOKEN", existingToken);
    return existingToken;
  }

  logger.info("creating local Craft GraphQL token");
  const createdToken = createGraphqlToken();
  upsertEnvValue(envPath, "CRAFT_GRAPHQL_TOKEN", createdToken);
  return createdToken;
}

function escapeSql(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

run("bun", ["scripts/env-create.ts", ...process.argv.slice(2)]);
run("bun", ["install"], appDir);

startCraftIfNeeded();
ensureGraphqlToken();
run("bun", ["run", "gql"]);

const devPort = getDevPort(readRootEnv(rootDir));

logger.info("local Craft revalidation configured", {
  url: getLocalRevalidateUrl(devPort),
});
logger.info(
  "hosted Cyon requires a public tunnel to revalidate local Next; production uses the stable Worker callback",
);
logger.info("bootstrap complete; you can now run bun dev");

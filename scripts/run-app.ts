import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scriptLog } from "./logger.ts";
import { rootProcessEnv } from "./root-env.ts";

const logger = scriptLog("app");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = resolve(rootDir, "app");
const args = process.argv.slice(2);

if (!args.length) {
  logger.error("missing app script name");
  process.exit(1);
}

const result = spawnSync("bun", ["run", ...args], {
  cwd: appDir,
  env: rootProcessEnv(rootDir),
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);

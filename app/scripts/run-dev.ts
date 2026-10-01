import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDevPort, getLocalNextUrl, rootProcessEnv } from "./root-env";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = resolve(appDir, "..");
const env = rootProcessEnv(rootDir);
const devPort = getDevPort(env);

Object.assign(env, {
  DEV_PORT: String(devPort),
  NEXT_PUBLIC_SITE_URL: getLocalNextUrl(devPort),
  PORT: String(devPort),
});

const result = spawnSync(
  "bun",
  ["run", "dev:next", ...process.argv.slice(2)],
  {
    cwd: appDir,
    env,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

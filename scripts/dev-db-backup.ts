import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scriptLog } from "./logger.ts";

const logger = scriptLog("dev:db:backup");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const craftDir = resolve(rootDir, "craft");
const backupDir = resolve(craftDir, "_backup-db");
const filename = `db_${Date.now()}.sql`;
const relativePath = `_backup-db/${filename}`;
const backupPath = resolve(craftDir, relativePath);
const baselinePath = resolve(backupDir, "db.sql");

mkdirSync(backupDir, { recursive: true });

const result = spawnSync(
  "ddev",
  ["export-db", "--gzip=false", "--file", relativePath],
  {
    cwd: craftDir,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!existsSync(backupPath)) {
  throw new Error(`DDEV did not create ${relativePath}.`);
}

copyFileSync(backupPath, baselinePath);

logger.info("Craft database backup created", {
  file: `craft/${relativePath}`,
  baseline: "craft/_backup-db/db.sql",
});

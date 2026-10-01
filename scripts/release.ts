import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scriptLog } from "./logger.ts";

type ReleaseKind = "patch" | "minor" | "major" | "set";

type PackageJson = {
  name?: string;
  version?: string;
  [key: string]: unknown;
};

type RunOptions = {
  cwd?: string;
  stdio?: "inherit" | "pipe";
  trimOutput?: boolean;
};

const logger = scriptLog("release");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = resolve(rootDir, "app");
const rootPackagePath = resolve(rootDir, "package.json");
const appPackagePath = resolve(appDir, "package.json");
const args = process.argv.slice(2);
const kind = args[0] as ReleaseKind | undefined;
const explicitVersion = args[1];
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RELEASE_FILES = ["package.json", "bun.lock", "app/package.json", "app/bun.lock"];

const getPorcelainPath = (line: string) => {
  const path = line.slice(3);
  const renameSeparator = " -> ";

  if (path.includes(renameSeparator)) {
    return path.split(renameSeparator).at(-1) ?? path;
  }

  return path;
};

const run = (command: string, commandArgs: string[], options: RunOptions = {}) => {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? rootDir,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(output || `${command} ${commandArgs.join(" ")} failed.`);
  }

  const output = result.stdout ?? "";

  return options.trimOutput === false ? output : output.trim();
};

const readPackage = (path: string): PackageJson => JSON.parse(readFileSync(path, "utf8"));

const writePackage = (path: string, data: PackageJson) => {
  writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`);
};

const assertVersion = (version: unknown, label: string): string => {
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    throw new Error(`${label} must have a valid x.y.z version.`);
  }

  return version;
};

const bumpVersion = (version: string, releaseKind: ReleaseKind, nextVersion?: string) => {
  if (releaseKind === "set") {
    if (!nextVersion || !VERSION_PATTERN.test(nextVersion)) {
      throw new Error("Explicit release version must use x.y.z format.");
    }

    return nextVersion;
  }

  const [major, minor, patch] = version.split(".").map(Number);

  switch (releaseKind) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error("Release kind must be patch, minor, major, or set.");
  }
};

const assertPreflight = () => {
  run("git", ["--version"]);
  run("bun", ["--version"]);

  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);

  if (branch !== "main") {
    throw new Error(`Release must run on branch "main" (current: ${branch}).`);
  }

  const status = run("git", ["status", "--porcelain"], { trimOutput: false });

  if (status) {
    throw new Error(`Release requires a clean worktree.\n${status}`);
  }
};

if (!kind || !["patch", "minor", "major", "set"].includes(kind)) {
  throw new Error("Usage: bun release patch|minor|major OR bun release set 0.2.0");
}

const step = logger.step("release preflight", { kind, explicitVersion });
assertPreflight();
step.done();

const rootPackage = readPackage(rootPackagePath);
const appPackage = readPackage(appPackagePath);
const rootVersion = assertVersion(rootPackage.version, "Root package.json");
const appVersion = assertVersion(appPackage.version, "App package.json");

if (rootVersion !== appVersion) {
  throw new Error(
    `Root and app package versions must match before release (${rootVersion} !== ${appVersion}).`
  );
}

const nextVersion = bumpVersion(rootVersion, kind, explicitVersion);
const tagName = `ubiq-next-v${nextVersion}`;
const commitMessage = `chore: release ${tagName}`;

const existingTag = run("git", ["tag", "--list", tagName]);

if (existingTag) {
  throw new Error(`Tag already exists: ${tagName}`);
}

logger.info("bumping package versions", {
  from: rootVersion,
  to: nextVersion,
});

rootPackage.version = nextVersion;
appPackage.version = nextVersion;
writePackage(rootPackagePath, rootPackage);
writePackage(appPackagePath, appPackage);

const lockStep = logger.step("refresh lockfiles");
run("bun", ["install", "--lockfile-only"], { stdio: "inherit" });
run("bun", ["install", "--lockfile-only"], { cwd: appDir, stdio: "inherit" });
lockStep.done();

const verifyStep = logger.step("verify release");
run("bun", ["run", "verify"], { stdio: "inherit" });
verifyStep.done();

const changedFiles = run("git", ["status", "--porcelain"], { trimOutput: false })
  .split("\n")
  .filter(Boolean)
  .map(getPorcelainPath)
  .map((line) => line.trim())
  .filter(Boolean)

const unexpectedFiles = changedFiles.filter((file) => !RELEASE_FILES.includes(file));

if (unexpectedFiles.length) {
  throw new Error(`Release produced unexpected changes: ${unexpectedFiles.join(", ")}`);
}

if (!changedFiles.length) {
  throw new Error("Release did not produce any version changes.");
}

logger.info("creating release commit", { commitMessage, files: changedFiles });
run("git", ["add", ...RELEASE_FILES], { stdio: "inherit" });
run("git", ["commit", "-m", commitMessage], { stdio: "inherit" });

logger.info("creating release tag", { tagName });
run("git", ["tag", "-a", tagName, "-m", commitMessage], { stdio: "inherit" });

logger.info("pushing release", { tagName });
run("git", ["push", "origin", "main:main", "--follow-tags"], { stdio: "inherit" });

logger.info("release complete", { version: nextVersion, tagName });

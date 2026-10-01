import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const commitMessagePath = process.argv[2];
const commitSource = process.argv[3] ?? "";

if (!commitMessagePath) {
  process.exit(0);
}

if (["merge", "squash", "commit"].includes(commitSource)) {
  process.exit(0);
}

const message = readFileSync(commitMessagePath, "utf8");
const firstLine = message.split("\n")[0] ?? "";

if (
  /^\[\d+\]\s/.test(firstLine) ||
  /^(fixup|squash)!/.test(firstLine) ||
  firstLine.startsWith("Merge ")
) {
  process.exit(0);
}

const commitCount = Number(
  execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim() || "0",
);
const nextCommitNumber = commitCount + 1;

writeFileSync(
  commitMessagePath,
  message.replace(firstLine, `[${nextCommitNumber}] ${firstLine}`),
);

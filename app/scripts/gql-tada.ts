import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(appDir, "node_modules/gql.tada/bin/cli.js");
const args = process.argv.slice(2);
const schemaRetryDelaysMs = [
  10_000,
  20_000,
  40_000,
  80_000,
  160_000,
  320_000,
  640_000,
];
const shouldRetrySchemaGeneration = args[0] === "generate-schema";

for (let attempt = 0; ; attempt += 1) {
  const result = spawnSync("node", [cliPath, ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error && result.status === null) {
    throw result.error;
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  if (result.status === 0 || isPostSuccessCleanupBug(output)) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exit(0);
  }

  const retryDelayMs = schemaRetryDelaysMs[attempt];
  if (
    shouldRetrySchemaGeneration &&
    retryDelayMs !== undefined &&
    isTransientSchemaFailure(output)
  ) {
    process.stderr.write(
      `[gql:schema] attempt ${attempt + 1}/${schemaRetryDelaysMs.length + 1} failed; retrying in ${retryDelayMs / 1_000}s.\n`,
    );
    await new Promise<void>((resolveDelay) =>
      setTimeout(resolveDelay, retryDelayMs),
    );
    continue;
  }

  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}

function isPostSuccessCleanupBug(output: string) {
  return (
    output.includes("TypeError: t.unref is not a function") &&
    (output.includes("✓ Schema was generated successfully") ||
      output.includes("✓ Introspection output was generated successfully") ||
      output.includes("✓ No problems found"))
  );
}

function isTransientSchemaFailure(output: string) {
  return /(\[network\]|fetch failed|econnreset|econnrefused|etimedout|eai_again|socket hang up|http (?:429|5\d\d))/i.test(
    output,
  );
}

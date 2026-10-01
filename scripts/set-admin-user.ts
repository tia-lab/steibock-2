import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { startCraftIfNeeded } from "./craft-dev.ts";
import { scriptLog } from "./logger.ts";

const logger = scriptLog("craft:user");
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const craftDir = resolve(rootDir, "craft");

startCraftIfNeeded();

const pipedAnswers = input.isTTY ? null : readFileSync(0, "utf8").split(/\r?\n/);
const username = (await promptText("User", "admin")).trim() || "admin";
const password = await promptPassword("Password");
const repeatedPassword = await promptPassword("Repeat password");

if (!password) {
  logger.error("password cannot be empty");
  process.exit(1);
}

if (password !== repeatedPassword) {
  logger.error("passwords do not match");
  process.exit(1);
}

const result = spawnSync(
  "ddev",
  ["exec", "php", "craft", "users/set-password", username, "--password", password],
  {
    cwd: craftDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

if (/No user exists/i.test(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)) {
  process.exit(1);
}

process.exit(result.status ?? 0);

function promptText(label: string, defaultValue: string): Promise<string> {
  if (pipedAnswers) {
    const answer = pipedAnswers.shift() ?? "";
    return Promise.resolve(answer || defaultValue);
  }

  const rl = readline.createInterface({ input, output });

  return new Promise((resolvePrompt) => {
    rl.question(`${label} (${defaultValue}): `, (answer) => {
      rl.close();
      resolvePrompt(answer || defaultValue);
    });
  });
}

function promptPassword(label: string): Promise<string> {
  if (pipedAnswers) {
    return Promise.resolve(pipedAnswers.shift() ?? "");
  }

  return new Promise((resolvePrompt) => {
    let value = "";
    const wasRaw = input.isRaw;

    output.write(`${label}: `);
    input.setRawMode(true);
    input.resume();

    const onData = (chunk: Buffer) => {
      const char = chunk.toString("utf8");

      if (char === "\u0003") {
        output.write("\n");
        cleanup();
        process.exit(130);
      }

      if (char === "\r" || char === "\n") {
        output.write("\n");
        cleanup();
        resolvePrompt(value);
        return;
      }

      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }

      value += char;
    };

    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(wasRaw);
    };

    input.on("data", onData);
  });
}

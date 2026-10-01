import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type RootEnv = Record<string, string | undefined>;

export const DEFAULT_DEV_PORT = 3000;

export const rootEnvFiles = (rootDir: string) => [resolve(rootDir, ".env")];

export function getDevPort(env: RootEnv): number {
  const raw = env.DEV_PORT?.trim() || String(DEFAULT_DEV_PORT);

  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `DEV_PORT must be an integer between 1 and 65535; received "${raw}".`,
    );
  }

  const port = Number(raw);

  if (port < 1 || port > 65535) {
    throw new Error(
      `DEV_PORT must be an integer between 1 and 65535; received "${raw}".`,
    );
  }

  return port;
}

export function getLocalNextUrl(port: number): string {
  return `http://localhost:${port}`;
}

export function getLocalRevalidateUrl(port: number): string {
  return `http://host.docker.internal:${port}/api/revalidate`;
}

export function readRootEnv(
  rootDir: string,
  files = rootEnvFiles(rootDir),
): RootEnv {
  const env: RootEnv = {};

  for (const file of files) {
    if (!existsSync(file)) continue;

    const content = readFileSync(file, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;

      env[match[1]] = unquoteEnvValue(match[2].trim());
    }
  }

  return env;
}

export function rootProcessEnv(rootDir: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...readRootEnv(rootDir),
  };

  Reflect.deleteProperty(env, "NODE_ENV");

  return env;
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

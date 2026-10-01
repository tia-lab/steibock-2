import type { StyleValue } from "./types";

interface ScssMapInput {
  [key: string]: ScssValue;
}

type ScssValue = ScssMapInput | StyleValue | boolean | number | string;

const isStyleValue = (value: ScssValue): value is StyleValue =>
  typeof value === "object" && value !== null && "value" in value;

const isPlainObject = (value: ScssValue): value is ScssMapInput =>
  typeof value === "object" && value !== null && !isStyleValue(value);

const formatKey = (key: string) => {
  if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key)) {
    return key;
  }

  return `"${key.replaceAll('"', '\\"')}"`;
};

const formatScalar = (value: Exclude<ScssValue, ScssMapInput | StyleValue>) => {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value.toString();
};

const renderMapBody = (input: ScssMapInput, depth = 0): string => {
  const childIndent = "\t".repeat(depth + 1);

  return Object.entries(input)
    .map(([key, value]) => {
      if (isStyleValue(value)) {
        return `${childIndent}${formatKey(key)}: ${value.value}`;
      }

      if (isPlainObject(value)) {
        return `${childIndent}${formatKey(key)}: (\n${renderMapBody(value, depth + 1)}\n${childIndent})`;
      }

      return `${childIndent}${formatKey(key)}: ${formatScalar(value)}`;
    })
    .join(",\n");
};

export const renderScssMap = (name: string, input: ScssMapInput) =>
  `$${name}: (\n${renderMapBody(input)}\n);`;

export const renderScssVariable = (name: string, value: boolean | number | string) =>
  `$${name}: ${formatScalar(value)};`;

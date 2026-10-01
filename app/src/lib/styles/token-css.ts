import type { StyleValue } from "./types";

const toKebabCase = (value: string) =>
  value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

export const renderTokenCssVars = (
  prefix: string,
  tokens: Record<string, StyleValue>,
) => [
  ":root {",
  ...Object.entries(tokens).map(
    ([name, value]) => `\t--${prefix}-${toKebabCase(name)}: ${value.value};`,
  ),
  "}",
].join("\n");

export const renderTokenAliases = (
  prefix: string,
  tokens: Record<string, StyleValue>,
) =>
  Object.keys(tokens)
    .map((name) => {
      const tokenName = toKebabCase(name);

      return `$${prefix}-${tokenName}: var(--${prefix}-${tokenName});`;
    })
    .join("\n");

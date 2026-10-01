import type { ResponsiveStyleValue, StyleValue } from "./types";

const toKebabCase = (value: string) =>
  value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

export const renderLayoutMapInput = (
  tokens: Record<string, ResponsiveStyleValue | StyleValue>,
) =>
  Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [toKebabCase(name), value]),
  );

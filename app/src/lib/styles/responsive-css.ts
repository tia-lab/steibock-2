import type { BreakpointMap, ResponsiveStyleValue, StyleValue } from "./types";

const numericValue = (value: string) => Number.parseFloat(value);
const toKebabCase = (value: string) =>
  value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

const sortBreakpoints = (breakpoints: BreakpointMap) =>
  Object.entries(breakpoints)
    .map(([name, value]) => ({ name, value: numericValue(value.value) }))
    .sort((a, b) => a.value - b.value);

const renderRootVars = (lines: string[]) => {
  if (!lines.length) {
    return "";
  }

  return [":root {", ...lines.map((line) => `\t${line}`), "}"].join("\n");
};

const indentBlock = (input: string) =>
  input
    .split("\n")
    .map((line) => `\t${line}`)
    .join("\n");

const shouldEmitCssValue = (value?: StyleValue) =>
  Boolean(value && value.value !== "false");

export const renderResponsiveCssVars = (
  prefix: string,
  tokens: Record<string, ResponsiveStyleValue>,
  breakpoints: BreakpointMap,
  base: string,
) => {
  const orderedBreakpoints = sortBreakpoints(breakpoints);

  if (!base) {
    return "";
  }

  const blocks = [
    renderRootVars(
      Object.entries(tokens)
        .map(([name, values]) => {
          const value = values[base];

          return shouldEmitCssValue(value)
            ? `--${prefix}-${name}: ${value.value};`
            : null;
        })
        .filter((line): line is string => Boolean(line)),
    ),
  ];

  orderedBreakpoints
    .reverse()
    .forEach((breakpoint) => {
      const maxWidth = breakpoint.value - 1;
      const rootVars = renderRootVars(
        Object.entries(tokens)
          .map(([name, values]) => {
            const value = values[breakpoint.name];

            return shouldEmitCssValue(value)
              ? `--${prefix}-${name}: ${value.value};`
              : null;
          })
          .filter((line): line is string => Boolean(line)),
      );

      if (!rootVars) {
        return;
      }

      blocks.push(
        `@media (max-width: ${maxWidth}px) {\n${indentBlock(rootVars)}\n}`,
      );
    });

  return blocks.filter(Boolean).join("\n\n");
};

export const renderCssVarAliases = (
  prefix: string,
  tokens: Record<string, ResponsiveStyleValue | StyleValue>,
) =>
  Object.entries(tokens)
    .map(([name, value]) => {
      if (isStyleValue(value) && !shouldEmitCssValue(value)) {
        return null;
      }

      const tokenName = toKebabCase(name);

      return `$${prefix}-${tokenName}: var(--${prefix}-${tokenName});`;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n");

const isStyleValue = (
  value: ResponsiveStyleValue | StyleValue,
): value is StyleValue => "value" in value;

export const renderMixedResponsiveCssVars = (
  prefix: string,
  tokens: Record<string, ResponsiveStyleValue | StyleValue>,
  breakpoints: BreakpointMap,
  base: string,
) => {
  const responsiveTokens = Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [
      toKebabCase(name),
      isStyleValue(value) ? { [base]: value } : value,
    ]),
  );

  return renderResponsiveCssVars(prefix, responsiveTokens, breakpoints, base);
};

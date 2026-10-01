import {
  expandColorTokenNames,
  expandColorTokensForTheme,
  themeSelector,
} from "./colors";
import type { ThemedStyleValue, ThemeMap } from "./types";

const renderCssVars = (selector: string, lines: string[]) => {
  if (!lines.length) {
    return "";
  }

  return [
    `${selector} {`,
    ...lines.map((line) => `\t${line}`),
    "}",
  ].join("\n");
};

const defaultThemeName = (themes: ThemeMap) => {
  const explicitDefault = Object.entries(themes).find(
    ([, theme]) => theme.default,
  );

  return explicitDefault?.[0] ?? Object.keys(themes)[0];
};

export const renderThemedColorCssVars = (
  prefix: string,
  tokens: Record<string, ThemedStyleValue>,
  themes: ThemeMap,
) => {
  const defaultTheme = defaultThemeName(themes);

  return Object.entries(themes)
    .map(([themeName, theme]) => {
      const values = expandColorTokensForTheme(tokens, themeName);

      return renderCssVars(
        themeSelector(themeName, theme, themeName === defaultTheme),
        Object.entries(values).map(
          ([name, value]) => `--${prefix}-${name}: ${value};`,
        ),
      );
    })
    .filter(Boolean)
    .join("\n\n");
};

export const renderColorAliases = (
  prefix: string,
  tokens: Record<string, ThemedStyleValue>,
) =>
  expandColorTokenNames(tokens)
    .map((name) => `$${prefix}-${name}: var(--${prefix}-${name});`)
    .join("\n");

export const renderColorMap = (
  tokens: Record<string, ThemedStyleValue>,
  themes: ThemeMap,
) => {
  const values = expandColorTokensForTheme(tokens, defaultThemeName(themes));

  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, { value }]),
  );
};

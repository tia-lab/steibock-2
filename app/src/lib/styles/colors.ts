import type { StyleValue, ThemedStyleValue, ThemeMap } from "./types";

export interface ColorExpansionOptions {
  alpha?: boolean;
  palette?: boolean;
}

type ResolvedColorExpansionOptions = Required<ColorExpansionOptions>;

const defaultColorExpansionOptions: ResolvedColorExpansionOptions = {
  alpha: true,
  palette: true,
};

const colorExpansionOptions = new WeakMap<
  ThemedStyleValue,
  ResolvedColorExpansionOptions
>();

const normalizeHex = (input: string) => {
  const value = input.startsWith("#") ? input.slice(1) : input;

  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toLowerCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return `#${value.toLowerCase()}`;
  }

  throw new Error(`Invalid hex color "${input}".`);
};

const hexToRgb = (input: string) => {
  const value = normalizeHex(input).slice(1);

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const alphaValue = (shade: number) => Number((shade / 100).toFixed(2));

export const colorShades = [100, 80, 60, 40, 20, 0] as const;

export const hex = (input: string): StyleValue => ({
  value: normalizeHex(input),
});

export const defineThemes = <const TThemes extends ThemeMap>(themes: TThemes) =>
  themes;

const resolveColorExpansionOptions = (
  options?: ColorExpansionOptions,
): ResolvedColorExpansionOptions => ({
  ...defaultColorExpansionOptions,
  ...options,
});

const optionsForColorToken = (value: ThemedStyleValue) =>
  colorExpansionOptions.get(value) ?? defaultColorExpansionOptions;

export const createThemed =
  <const TThemes extends ThemeMap, const TBase extends keyof TThemes>(
    themes: TThemes,
    base: TBase,
    options?: ColorExpansionOptions,
  ) => {
    void themes;
    void base;
    const resolvedOptions = resolveColorExpansionOptions(options);

    return <
      const TValues extends Partial<Record<keyof TThemes, StyleValue>> &
        Record<TBase, StyleValue>,
    >(
      values: TValues,
    ) => {
      colorExpansionOptions.set(values, resolvedOptions);

      return values;
    };
  };

export const expandColorAlphaValue = (value: StyleValue, shade: number) => {
  const { r, g, b } = hexToRgb(value.value);

  return `rgba(${r}, ${g}, ${b}, ${alphaValue(shade)})`;
};

export const expandColorWhiteValue = (value: StyleValue, shade: number) => {
  const { r, g, b } = hexToRgb(value.value);
  const ratio = alphaValue(shade);
  const mix = (channel: number) => Math.round(channel * ratio + 255 * (1 - ratio));

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

export const expandColorBlackValue = (value: StyleValue, shade: number) => {
  const { r, g, b } = hexToRgb(value.value);
  const ratio = alphaValue(shade);
  const mix = (channel: number) => Math.round(channel * ratio);

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

export const expandColorTokenNames = (
  tokens: Record<string, ThemedStyleValue>,
) =>
  Object.entries(tokens).flatMap(([name, values]) => {
    const options = optionsForColorToken(values);

    return [
      name,
      ...(options.palette
        ? [
            ...colorShades.map((shade) => `${name}-w-${shade}`),
            ...colorShades.map((shade) => `${name}-b-${shade}`),
          ]
        : []),
      ...(options.alpha
        ? colorShades.map((shade) => `${name}-alpha-${shade}`)
        : []),
    ];
  });

export const expandColorTokensForTheme = (
  tokens: Record<string, ThemedStyleValue>,
  themeName: string,
) =>
  Object.fromEntries(
    Object.entries(tokens).flatMap(([name, values]) => {
      const value = values[themeName];

      if (!value) {
        return [];
      }

      const options = optionsForColorToken(values);

      return [
        [name, expandColorWhiteValue(value, 100)],
        ...(options.palette
          ? [
              ...colorShades.map((shade) => [
                `${name}-w-${shade}`,
                expandColorWhiteValue(value, shade),
              ]),
              ...colorShades.map((shade) => [
                `${name}-b-${shade}`,
                expandColorBlackValue(value, shade),
              ]),
            ]
          : []),
        ...(options.alpha
          ? colorShades.map((shade) => [
              `${name}-alpha-${shade}`,
              expandColorAlphaValue(value, shade),
            ])
          : []),
      ];
    }),
  );

export const themeSelector = (
  themeName: string,
  theme: ThemeMap[string],
  isDefault: boolean,
) => {
  if (isDefault) {
    return `:root,\n[data-theme="${themeName}"]`;
  }

  return theme.selector ?? `[data-theme="${themeName}"]`;
};

export type StyleUnit =
  | ""
  | "%"
  | "dvh"
  | "dvw"
  | "em"
  | "px"
  | "rem"
  | "ms"
  | "s"
  | "vh"
  | "vw";

export interface StyleValue {
  value: string;
}

export type ResponsiveStyleValue = Record<string, StyleValue>;

export type BreakpointMap = Record<string, StyleValue>;

export interface ThemeConfig {
  default?: boolean;
  selector?: string;
}

export type ThemeMap = Record<string, ThemeConfig>;

export type ThemedStyleValue = Record<string, StyleValue>;

import type { BreakpointMap, StyleUnit, StyleValue } from "./types";

const formatNumber = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
};

export const styleValue = (value: number | string, unit: StyleUnit = ""): StyleValue => ({
  value: typeof value === "number" ? `${formatNumber(value)}${unit}` : value,
});

export const px = (value: number) => styleValue(value, "px");

export const rem = (value: number) => styleValue(value, "rem");

export const defineBreakpoints = <const TBreakpoints extends BreakpointMap>(
  breakpoints: TBreakpoints,
) => breakpoints;

export const createResponsive =
  <const TBreakpoints extends BreakpointMap, const TBase extends string>(
    breakpoints: TBreakpoints,
    base: TBase,
  ) => {
    void breakpoints;
    void base;

    return <
      const TValues extends Partial<Record<keyof TBreakpoints | TBase, StyleValue>> &
        Record<TBase, StyleValue>,
    >(
      values: TValues,
    ) => values;
  };

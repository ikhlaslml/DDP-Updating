// Validated categorical palette (light mode) — see dataviz skill references/palette.md.
// Order is fixed and never cycled; slot assignment follows the entity, not rank.
import { BRAND_COLORS } from "./brand-colors";

export const SERIES = {
  blue: BRAND_COLORS.navy,
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  green: "#008300",
  violet: BRAND_COLORS.navyMuted,
  red: BRAND_COLORS.maroon,
};

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: BRAND_COLORS.maroon,
};

export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
};

import type { DimensionId } from "../domain/vcti/types";

export const DIMENSION_COLORS: Record<DimensionId, { left: string; right: string }> = {
  MA: { left: "#c44a3a", right: "#2581c4" },
  DV: { left: "#4e79a7", right: "#d37c31" },
  RJ: { left: "#3c9977", right: "#b05693" },
  CP: { left: "#745ec4", right: "#b08e3e" },
};

export function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  return [
    Number.parseInt(cleaned.slice(0, 2), 16),
    Number.parseInt(cleaned.slice(2, 4), 16),
    Number.parseInt(cleaned.slice(4, 6), 16),
  ];
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function withSaturation(hex: string, factor: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.round(255 - (255 - r) * factor),
    Math.round(255 - (255 - g) * factor),
    Math.round(255 - (255 - b) * factor),
  ];
}

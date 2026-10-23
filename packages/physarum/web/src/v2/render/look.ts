// Slime Mould palettes (02-physarum.md § The look): emissive ramps in linear
// RGB. Ember is the Sandbox prototype's fire; Deep sea the cold alternative.
// Each is five stops (t = 0, ¼, ½, ¾, 1) over a log ramp of trail / mean.

export type PaletteId = "ember" | "deepsea";

export interface Palette {
  id: PaletteId;
  label: string;
  stops: [number, number, number][];
  /** Agar: near-black, faintly tinted. */
  bg: [number, number, number];
  spark: [number, number, number];
  /** Chrome accent (sRGB css) echoing the sim. */
  accent: string;
}

export const PALETTES: Record<PaletteId, Palette> = {
  ember: {
    id: "ember",
    label: "Ember",
    stops: [
      [0.0, 0.0, 0.0],
      [0.16, 0.012, 0.002],
      [0.78, 0.13, 0.012],
      [1.0, 0.46, 0.08],
      [1.0, 0.86, 0.58],
    ],
    bg: [0.0045, 0.0032, 0.0028],
    spark: [1.0, 0.72, 0.42],
    accent: "#ff9a4a",
  },
  deepsea: {
    id: "deepsea",
    label: "Deep sea",
    stops: [
      [0.0, 0.0, 0.0],
      [0.0, 0.035, 0.07],
      [0.01, 0.2, 0.34],
      [0.12, 0.62, 0.78],
      [0.74, 1.0, 0.96],
    ],
    bg: [0.0022, 0.0034, 0.0048],
    spark: [0.55, 0.95, 1.0],
    accent: "#5fd4e0",
  },
};

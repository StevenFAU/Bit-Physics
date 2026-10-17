// Art direction — "ink and enamel" (01-reaction-diffusion.md, The look).
// The V field is a height map under soft directional light with a specular
// sheen and a thin translucent rim, so patterns read as raised glossy
// material rather than a colormap. Palettes are small token sets; the chrome
// echoes them through --sim-accent / --sim-key.

import type { FieldLook } from "@bp/render";

export type PaletteId = "nocturne" | "ink" | "enamel" | "coral";

export interface Palette {
  id: PaletteId;
  label: string;
  tone: "dark" | "light";
  look: FieldLook;
  /** Chrome echo on dark surfaces (must stay light). */
  accent: string;
  /** The palette's key colour, for text set directly on a light canvas. */
  key: string;
}

const LIGHT: readonly [number, number, number] = [-0.45, -0.6, 0.66];

export const PALETTES: Record<PaletteId, Palette> = {
  // The Map: pale enamel raised on deep ink, gold where the light catches it.
  nocturne: {
    id: "nocturne",
    label: "Nocturne",
    tone: "dark",
    accent: "#e8c88f",
    key: "#e9dcc0",
    look: {
      background: "#0b1016",
      ink: "#e6d6b5",
      accent: "#ffe7b8",
      rim: "#b5743c",
      rimAmount: 0.35,
      gloss: 0.6,
      shininess: 42,
      relief: 1.2,
      grain: 0.08,
      light: LIGHT,
      coverage: [0.07, 0.3],
    },
  },
  // Black ink on bone paper.
  ink: {
    id: "ink",
    label: "Ink",
    tone: "light",
    accent: "#dccaa6",
    key: "#3a2f22",
    look: {
      background: "#e9e1d0",
      ink: "#141516",
      accent: "#ffffff",
      rim: "#6b4b2c",
      rimAmount: 0.18,
      gloss: 0.42,
      shininess: 36,
      relief: 1.0,
      grain: 0.12,
      light: LIGHT,
      coverage: [0.07, 0.3],
    },
  },
  // Cobalt on porcelain.
  enamel: {
    id: "enamel",
    label: "Enamel",
    tone: "light",
    accent: "#a9c1ff",
    key: "#1f3f95",
    look: {
      background: "#eceef0",
      ink: "#1b3a8f",
      accent: "#f4f8ff",
      rim: "#6f9cff",
      rimAmount: 0.3,
      gloss: 0.75,
      shininess: 64,
      relief: 1.15,
      grain: 0.06,
      light: LIGHT,
      coverage: [0.07, 0.3],
    },
  },
  // Rust on sand.
  coral: {
    id: "coral",
    label: "Coral",
    tone: "light",
    accent: "#f3ae8c",
    key: "#8e3a20",
    look: {
      background: "#e6d3b6",
      ink: "#9c3d22",
      accent: "#fff0dc",
      rim: "#f08d5d",
      rimAmount: 0.4,
      gloss: 0.5,
      shininess: 30,
      relief: 1.3,
      grain: 0.1,
      light: LIGHT,
      coverage: [0.07, 0.3],
    },
  },
};

// Perceptual colormaps as 256-entry LUT textures (00-foundation.md § 3.2).
//
// Sequential maps are matplotlib's viridis / magma / inferno / cividis,
// sampled at 8 evenly spaced stops (the same published values as
// common/common-web/src/colormap.ts) and interpolated to 256 entries in
// OKLab, which keeps the lightness ramp monotone between stops. The two
// diverging maps are our own, authored on the blue–orange axis so both arms
// stay distinct under protan/deutan colour vision (checked in
// colormaps.test.ts with the Viénot et al. 1999 simulation).

export type Rgb = readonly [number, number, number];

export interface ColormapDef {
  name: ColormapName;
  label: string;
  kind: "sequential" | "diverging";
  /** sRGB stops, 0–1, evenly spaced. */
  stops: readonly Rgb[];
}

export type ColormapName = "viridis" | "magma" | "inferno" | "cividis" | "ice-fire" | "teal-rust";

export const COLORMAP_DEFS: readonly ColormapDef[] = [
  {
    name: "viridis",
    label: "Viridis",
    kind: "sequential",
    stops: [
      [0.267, 0.0049, 0.3294], [0.2752, 0.1949, 0.496], [0.2124, 0.3597, 0.5517], [0.1534, 0.497, 0.5577],
      [0.1223, 0.6332, 0.5304], [0.2889, 0.7584, 0.4284], [0.6266, 0.8546, 0.2234], [0.9932, 0.9062, 0.1439],
    ],
  },
  {
    name: "magma",
    label: "Magma",
    kind: "sequential",
    stops: [
      [0.0015, 0.0005, 0.0139], [0.1351, 0.0684, 0.315], [0.3721, 0.0928, 0.4991], [0.5945, 0.1757, 0.5012],
      [0.8289, 0.2622, 0.4306], [0.9734, 0.4615, 0.362], [0.9973, 0.7335, 0.5052], [0.9871, 0.9914, 0.7495],
    ],
  },
  {
    name: "inferno",
    label: "Inferno",
    kind: "sequential",
    stops: [
      [0.0015, 0.0005, 0.0139], [0.1558, 0.0446, 0.3253], [0.3977, 0.0833, 0.4332], [0.6217, 0.1642, 0.3888],
      [0.8323, 0.2839, 0.2574], [0.9613, 0.4887, 0.0843], [0.9812, 0.7591, 0.1569], [0.9884, 0.9984, 0.6449],
    ],
  },
  {
    name: "cividis",
    label: "Cividis",
    kind: "sequential",
    stops: [
      [0.0, 0.1351, 0.3048], [0.1307, 0.2315, 0.4328], [0.2984, 0.3322, 0.424], [0.4251, 0.4313, 0.4477],
      [0.5554, 0.5378, 0.4711], [0.696, 0.6483, 0.4401], [0.8492, 0.7719, 0.3597], [0.9957, 0.9093, 0.2178],
    ],
  },
  {
    name: "ice-fire",
    label: "Ice–fire",
    kind: "diverging",
    stops: [
      [0.04, 0.12, 0.33], [0.13, 0.38, 0.72], [0.48, 0.72, 0.92], [0.93, 0.94, 0.94],
      [0.96, 0.75, 0.52], [0.88, 0.42, 0.16], [0.6, 0.13, 0.05],
    ],
  },
  {
    name: "teal-rust",
    label: "Teal–rust",
    kind: "diverging",
    stops: [
      [0.0, 0.25, 0.3], [0.1, 0.5, 0.53], [0.58, 0.79, 0.78], [0.94, 0.93, 0.9],
      [0.89, 0.72, 0.58], [0.73, 0.4, 0.22], [0.42, 0.16, 0.06],
    ],
  },
];

// --- colour science -----------------------------------------------------------

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(c: number): number {
  const x = Math.min(Math.max(c, 0), 1);
  return x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055;
}

/** Linear sRGB → OKLab (Ottosson 2020). */
export function linearToOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinear([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const lin = (c: Rgb): Rgb => [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2])];

/** Evaluate a colormap at t ∈ [0, 1]; returns sRGB 0–1. */
export function sampleColormap(def: ColormapDef, t: number): Rgb {
  const n = def.stops.length - 1;
  const x = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  const a = linearToOklab(lin(def.stops[i]!));
  const b = linearToOklab(lin(def.stops[i + 1]!));
  const mixed: Rgb = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  const o = oklabToLinear(mixed);
  return [linearToSrgb(o[0]), linearToSrgb(o[1]), linearToSrgb(o[2])];
}

/** 256 RGBA8 sRGB texels. */
export function colormapBytes(def: ColormapDef): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i += 1) {
    const c = sampleColormap(def, i / 255);
    out[i * 4] = Math.round(c[0] * 255);
    out[i * 4 + 1] = Math.round(c[1] * 255);
    out[i * 4 + 2] = Math.round(c[2] * 255);
    out[i * 4 + 3] = 255;
  }
  return out;
}

export function colormapCss(def: ColormapDef, steps = 12): string {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const c = sampleColormap(def, i / steps);
    parts.push(`rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)}) ${((i / steps) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

export function getColormapDef(name: ColormapName): ColormapDef {
  const d = COLORMAP_DEFS.find((c) => c.name === name);
  if (!d) throw new Error(`unknown colormap ${name}`);
  return d;
}

/** GPU LUT cache: one 256×1 rgba8unorm-srgb texture per map (linear on read). */
export class ColormapLibrary {
  private readonly cache = new Map<ColormapName, GPUTexture>();
  constructor(private readonly device: GPUDevice) {}

  view(name: ColormapName): GPUTextureView {
    let tex = this.cache.get(name);
    if (!tex) {
      tex = this.device.createTexture({
        size: [256, 1],
        format: "rgba8unorm-srgb",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        label: `colormap-${name}`,
      });
      this.device.queue.writeTexture({ texture: tex }, colormapBytes(getColormapDef(name)), { bytesPerRow: 256 * 4 }, [256, 1]);
      this.cache.set(name, tex);
    }
    return tex.createView();
  }

  destroy(): void {
    for (const t of this.cache.values()) t.destroy();
    this.cache.clear();
  }
}

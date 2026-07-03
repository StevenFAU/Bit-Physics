// Shared colormap facility — the repo's first (strange-attractors
// feature-expansion-spec § 3.1.a; reusable by all 7 web demos).
//
// Each map is a table of ≤ 8 evenly spaced RGB stops. Two color spaces:
//   - "srgb": perceptually-uniform published tables (matplotlib viridis /
//     inferno / magma / plasma / turbo / cividis, sampled at 8 stops).
//     Linearized at pack time so they read correctly through the demos'
//     linear-HDR → gamma-2.2 blit pipeline.
//   - "linear": the house ramps ("aurora" cool, "ember" warm), authored
//     directly in linear space (values verbatim from the strange-attractors
//     render.wgsl 4-stop ramps) — packed untouched.
//
// packColormap() emits a fixed-size Float32Array block (8 × vec4 + count)
// suitable for direct queue.writeBuffer into a uniform slot, so switching
// maps is a uniform write — never a pipeline rebuild (spec § 3.1.a
// acceptance). emitColormapWgsl() emits the matching WGSL sampler: a
// data-driven piecewise-linear mix() chain over the uniform stops, replacing
// per-sim hand-written ramps.

export type ColormapSpace = "srgb" | "linear";

export interface Colormap {
  /** Registry key + UI label. */
  readonly name: string;
  /** ≤ MAX_STOPS evenly spaced RGB stops, 0–1 in `space`. */
  readonly stops: readonly (readonly [number, number, number])[];
  readonly space: ColormapSpace;
}

export const MAX_STOPS = 8;

/** Floats per packed block: 8 stops × vec4 + (count, pad, pad, pad). */
export const PACKED_FLOATS = MAX_STOPS * 4 + 4;
export const PACKED_BYTES = PACKED_FLOATS * 4;

const srgb = (
  name: string,
  stops: readonly (readonly [number, number, number])[],
): Colormap => ({ name, stops, space: "srgb" });

// Published tables sampled at 8 stops (matplotlib 3.x, t = linspace(0,1,8)).
// House ramps are the committed strange-attractors render.wgsl stops.
export const COLORMAPS: readonly Colormap[] = [
  {
    name: "aurora", // house cool: deep indigo → blue → accent teal → pale
    space: "linear",
    stops: [
      [0.015, 0.022, 0.09], [0.05, 0.19, 0.48],
      [0.13, 0.75, 0.68], [0.88, 0.99, 0.96],
    ],
  },
  {
    name: "ember", // house warm: ember → warm orange → cream
    space: "linear",
    stops: [
      [0.08, 0.02, 0.01], [0.45, 0.1, 0.03],
      [1.0, 0.48, 0.24], [1.0, 0.92, 0.78],
    ],
  },
  srgb("viridis", [
    [0.267, 0.0049, 0.3294], [0.2752, 0.1949, 0.496],
    [0.2124, 0.3597, 0.5517], [0.1534, 0.497, 0.5577],
    [0.1223, 0.6332, 0.5304], [0.2889, 0.7584, 0.4284],
    [0.6266, 0.8546, 0.2234], [0.9932, 0.9062, 0.1439],
  ]),
  srgb("inferno", [
    [0.0015, 0.0005, 0.0139], [0.1558, 0.0446, 0.3253],
    [0.3977, 0.0833, 0.4332], [0.6217, 0.1642, 0.3888],
    [0.8323, 0.2839, 0.2574], [0.9613, 0.4887, 0.0843],
    [0.9812, 0.7591, 0.1569], [0.9884, 0.9984, 0.6449],
  ]),
  srgb("magma", [
    [0.0015, 0.0005, 0.0139], [0.1351, 0.0684, 0.315],
    [0.3721, 0.0928, 0.4991], [0.5945, 0.1757, 0.5012],
    [0.8289, 0.2622, 0.4306], [0.9734, 0.4615, 0.362],
    [0.9973, 0.7335, 0.5052], [0.9871, 0.9914, 0.7495],
  ]),
  srgb("plasma", [
    [0.0504, 0.0298, 0.528], [0.3251, 0.0069, 0.6395],
    [0.5462, 0.039, 0.647], [0.7234, 0.1962, 0.539],
    [0.8598, 0.3606, 0.4069], [0.9555, 0.5331, 0.2855],
    [0.9945, 0.7409, 0.1663], [0.94, 0.9752, 0.1313],
  ]),
  srgb("turbo", [
    [0.19, 0.0718, 0.2322], [0.277, 0.4615, 0.9331],
    [0.1074, 0.8138, 0.8348], [0.3813, 0.9891, 0.4239],
    [0.8233, 0.9125, 0.2066], [0.9967, 0.6098, 0.1784],
    [0.8538, 0.2217, 0.0268], [0.4796, 0.0158, 0.0106],
  ]),
  srgb("cividis", [
    [0.0, 0.1351, 0.3048], [0.1307, 0.2315, 0.4328],
    [0.2984, 0.3322, 0.424], [0.4251, 0.4313, 0.4477],
    [0.5554, 0.5378, 0.4711], [0.696, 0.6483, 0.4401],
    [0.8492, 0.7719, 0.3597], [0.9957, 0.9093, 0.2178],
  ]),
];

export function getColormap(name: string): Colormap {
  const m = COLORMAPS.find((c) => c.name === name);
  if (!m) throw new Error(`unknown colormap: ${name}`);
  return m;
}

// Primary ↔ ghost pairing (spec § 3.1.a acceptance): every primary map gets a
// hue-complementary companion so a paired trajectory stays visually distinct
// under every selection. Symmetric where both directions read well.
const GHOST_PAIR: Readonly<Record<string, string>> = {
  aurora: "ember",
  ember: "aurora",
  viridis: "inferno",
  inferno: "viridis",
  magma: "viridis",
  plasma: "cividis",
  turbo: "ember",
  cividis: "plasma",
};

export function ghostFor(name: string): Colormap {
  return getColormap(GHOST_PAIR[name] ?? "ember");
}

const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/**
 * Pack a colormap into the uniform block layout emitted by
 * emitColormapWgsl(): MAX_STOPS × vec4<f32> (rgb, 0) then
 * (stop_count, 0, 0, 0). Unused stops repeat the last stop so an
 * out-of-range index still reads a valid color.
 */
export function packColormap(map: Colormap, out?: Float32Array): Float32Array {
  const buf = out ?? new Float32Array(PACKED_FLOATS);
  if (buf.length < PACKED_FLOATS) throw new Error("packColormap: buffer too small");
  const n = Math.min(map.stops.length, MAX_STOPS);
  if (n < 2) throw new Error(`colormap ${map.name}: need ≥ 2 stops`);
  for (let i = 0; i < MAX_STOPS; i += 1) {
    const s = map.stops[Math.min(i, n - 1)]!;
    for (let k = 0; k < 3; k += 1) {
      const v = s[k]!;
      buf[i * 4 + k] = map.space === "srgb" ? srgbToLinear(v) : v;
    }
    buf[i * 4 + 3] = 0;
  }
  buf[MAX_STOPS * 4] = n;
  buf[MAX_STOPS * 4 + 1] = 0;
  buf[MAX_STOPS * 4 + 2] = 0;
  buf[MAX_STOPS * 4 + 3] = 0;
  return buf;
}

export interface ColormapWgslOptions {
  /** WGSL expression for the packed stops array (array<vec4<f32>, 8>). */
  stopsExpr: string;
  /** WGSL expression for the stop count (f32). */
  countExpr: string;
  /** Emitted function name. Default "cmap_sample". */
  fnName?: string;
}

/**
 * Emit the WGSL sampler for a packed colormap block: a data-driven
 * piecewise-linear mix() chain over the uniform stops. The host declares the
 * uniform fields (see PACKED layout) and splices this function into its
 * shader source; switching maps is then queue.writeBuffer only.
 */
export function emitColormapWgsl(o: ColormapWgslOptions): string {
  const fn = o.fnName ?? "cmap_sample";
  return `
fn ${fn}(t: f32) -> vec3<f32> {
  let n = max(${o.countExpr}, 2.0);
  let x = clamp(t, 0.0, 1.0) * (n - 1.0);
  let i = u32(clamp(floor(x), 0.0, n - 2.0));
  let f = x - f32(i);
  return mix(${o.stopsExpr}[i].rgb, ${o.stopsExpr}[i + 1u].rgb, f);
}
`;
}

// The reaction–diffusion models behind the live kernel (01-reaction-diffusion.md
// § The model, "Other models"). Every model is two fields (u, v) on the same
// 5-point Laplacian and forward-Euler step as the gated kernel; only the
// reaction terms and the constants differ:
//
//   ∂u/∂t = D_u ∇²u + f(u, v)        ∂v/∂t = D_v ∇²v + g(u, v)
//
// Each model's two headline parameters ride in the live kernel's F and k
// slots (so Tune, share links and history treat every model alike), and one
// extra constant rides in `c`. live.wgsl implements the same reaction terms
// in f32 with the same operation order; `stepCpu` below is the f64 CPU
// mirror, and reaction_diffusion_2d/reference/models.py is the NumPy
// reference that wrote the committed goldens (public/goldens/). The gated
// kernel (gray_scott.wgsl) is untouched by any of this.

export type ModelId = "gray-scott" | "brusselator" | "gierer-meinhardt" | "fitzhugh-nagumo";

export interface ModelParam {
  label: string;
  symbol: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  digits: number;
}

export interface ModelDef {
  id: ModelId;
  /** live.wgsl `model` switch. */
  index: 0 | 1 | 2 | 3;
  name: string;
  /** The two parameters carried in the F and k slots. */
  params: readonly [ModelParam, ModelParam];
  /** Defaults for the F and k slots. */
  p: readonly [number, number];
  /** Extra constant (live.wgsl `L.c.x`). */
  c: number;
  Du: number;
  Dv: number;
  dx: number;
  dt: number;
  /** Uniform steady state (u*, v*) at the defaults, where one exists. */
  rest: readonly [number, number];
  /** What a seed stamp writes. */
  seed: readonly [number, number];
  /** Which field is drawn as the pattern (0 = u, 1 = v), and its coverage ramp. */
  show: 0 | 1;
  coverage: readonly [number, number];
  /** Colormap range for the data view. */
  range: readonly [number, number];
  /** Threshold on the shown field for the pattern statistics. */
  threshold: number;
  /** How it works, two sentences. */
  blurb: string;
  equations: { f: string; g: string };
  /** Primary source. */
  cite: { label: string; href: string };
}

export const MODELS: Record<ModelId, ModelDef> = {
  "gray-scott": {
    id: "gray-scott",
    index: 0,
    name: "Gray–Scott",
    params: [
      { label: "Feed rate", symbol: "F", hint: "How fast fresh U flows in.", min: 0.005, max: 0.08, step: 0.0005, digits: 4 },
      { label: "Kill rate", symbol: "k", hint: "How fast V is removed, on top of the feed.", min: 0.035, max: 0.075, step: 0.0005, digits: 4 },
    ],
    p: [0.0367, 0.0649],
    c: 0,
    Du: 0.16,
    Dv: 0.08,
    dx: 1,
    dt: 1,
    rest: [1, 0],
    seed: [0.5, 0.25],
    show: 1,
    coverage: [0.07, 0.3],
    range: [0, 0.5],
    threshold: 0.15,
    blurb:
      "U is fed in everywhere; one U and two V make three V, and V is removed. U spreads twice as fast as V, so growth is local and starvation long-range.",
    equations: { f: "−uv² + F(1 − u)", g: "uv² − (F + k)v" },
    cite: { label: "Pearson 1993", href: "https://doi.org/10.1126/science.261.5118.189" },
  },
  brusselator: {
    id: "brusselator",
    index: 1,
    name: "Brusselator",
    params: [
      { label: "Supply", symbol: "A", hint: "The steady supply of u; also sets the uniform state u* = A.", min: 3, max: 6, step: 0.05, digits: 2 },
      { label: "Conversion", symbol: "B", hint: "How fast u turns into v. Past B_c the uniform mixture breaks into stripes.", min: 5, max: 14, step: 0.05, digits: 2 },
    ],
    p: [4.5, 6.75],
    c: 0,
    Du: 1,
    Dv: 10,
    dx: 0.5,
    dt: 1 / 256,
    rest: [4.5, 1.5],
    seed: [6.5, 1.5],
    show: 0,
    coverage: [3, 7],
    range: [0, 11],
    threshold: 5,
    blurb:
      "A toy chemical oscillator from Brussels: u is supplied and decays, two u and one v make three u, and u turns into v. Because v spreads ten times faster than u, the uniform mixture is unstable to one band of wavelengths — Turing's mechanism with a dispersion relation you can solve on paper.",
    equations: { f: "A − (B + 1)u + u²v", g: "Bu − u²v" },
    cite: { label: "Prigogine & Lefever 1968", href: "https://doi.org/10.1063/1.1668896" },
  },
  "gierer-meinhardt": {
    id: "gierer-meinhardt",
    index: 2,
    name: "Gierer–Meinhardt",
    params: [
      { label: "Activator decay", symbol: "μ", hint: "How fast the activator u fades on its own.", min: 0.7, max: 1.4, step: 0.01, digits: 2 },
      { label: "Inhibitor decay", symbol: "ν", hint: "How fast the inhibitor v fades. Too slow and spots never settle.", min: 1.2, max: 3, step: 0.01, digits: 2 },
    ],
    p: [1, 2],
    c: 0,
    Du: 1,
    Dv: 30,
    dx: 1,
    dt: 1 / 128,
    rest: [2, 2],
    seed: [8, 2],
    show: 0,
    coverage: [1.2, 6],
    range: [0, 10],
    threshold: 3,
    blurb:
      "Short-range activation, long-range inhibition: the activator u makes more of itself and of the inhibitor v, and v — spreading thirty times faster — shuts u down everywhere around a peak. The model Gierer and Meinhardt proposed for how a hydra knows where to grow its head.",
    equations: { f: "u²/v − μu", g: "u² − νv" },
    cite: { label: "Gierer & Meinhardt 1972", href: "https://doi.org/10.1007/BF00289234" },
  },
  "fitzhugh-nagumo": {
    id: "fitzhugh-nagumo",
    index: 3,
    name: "FitzHugh–Nagumo",
    params: [
      { label: "Recovery rate", symbol: "ε", hint: "How fast the recovery variable v catches up. Smaller is a longer refractory tail.", min: 0.02, max: 0.1, step: 0.002, digits: 3 },
      { label: "Recovery gain", symbol: "a₁", hint: "How strongly v damps itself. Below 1 the medium has one resting state and is excitable.", min: 0.3, max: 0.8, step: 0.01, digits: 2 },
    ],
    p: [0.05, 0.5],
    c: -0.45,
    Du: 1,
    Dv: 0,
    dx: 1,
    dt: 1 / 16,
    rest: [-0.625, -0.375],
    seed: [1, -0.375],
    show: 0,
    coverage: [-0.3, 0.6],
    range: [-1.2, 1.2],
    threshold: 0.2,
    blurb:
      "An excitable medium, the caricature of a nerve: a big enough kick to u fires a pulse that the slow recovery variable v then switches off. Pulses travel, annihilate when they meet, and a broken front curls into a rotating spiral — the geometry of waves in heart muscle.",
    equations: { f: "u − u³ − v", g: "ε(u − a₁v − a₀)" },
    cite: { label: "FitzHugh 1961", href: "https://doi.org/10.1016/S0006-3495(61)86902-6" },
  },
};

export const MODEL_IDS = Object.keys(MODELS) as ModelId[];

export function modelByIndex(i: number): ModelDef {
  return MODEL_IDS.map((id) => MODELS[id]).find((m) => m.index === i) ?? MODELS["gray-scott"];
}

// ---------------------------------------------------------------- mirror --

/**
 * The rates (du/dt, dv/dt) at one cell in f64, given its Laplacians — the
 * same expressions in the same order as live.wgsl (Gray–Scott keeps the
 * gated kernel's order; the others add the bracketed reaction term to the
 * diffusion term).
 */
export function rates(s: MirrorSetup, u: number, v: number, lapU: number, lapV: number): [number, number] {
  const { F, k, c } = s;
  switch (s.model) {
    case "gray-scott": {
      const uvv = u * v * v;
      return [s.Du * lapU - uvv + F * (1.0 - u), s.Dv * lapV + uvv - (F + k) * v];
    }
    case "brusselator": {
      const uuv = u * u * v;
      return [s.Du * lapU + (F - (k + 1.0) * u + uuv), s.Dv * lapV + (k * u - uuv)];
    }
    case "gierer-meinhardt": {
      const uu = u * u;
      return [s.Du * lapU + (uu / v - F * u + c), s.Dv * lapV + (uu - k * v)];
    }
    case "fitzhugh-nagumo":
      return [s.Du * lapU + (u - u * u * u - v), s.Dv * lapV + F * (u - k * v - c)];
  }
}

export interface MirrorSetup {
  model: ModelId;
  w: number;
  h: number;
  F: number;
  k: number;
  c: number;
  Du: number;
  Dv: number;
  dx: number;
  dt: number;
}

/**
 * Forward Euler on a periodic W × H grid, in f64 — the CPU mirror of the
 * live kernel. `state` is interleaved (u, v) per cell, row-major, and is
 * advanced in place. The Laplacian sums left + right + up + down − 4·centre
 * and divides by dx², exactly as live.wgsl does.
 */
export function stepCpu(s: MirrorSetup, state: Float64Array, steps: number): void {
  const { w, h } = s;
  let a: Float64Array = state;
  let b: Float64Array = new Float64Array(state.length);
  const dx2 = s.dx * s.dx;
  for (let n = 0; n < steps; n += 1) {
    for (let j = 0; j < h; j += 1) {
      const jm = j === 0 ? h - 1 : j - 1;
      const jp = j === h - 1 ? 0 : j + 1;
      for (let i = 0; i < w; i += 1) {
        const im = i === 0 ? w - 1 : i - 1;
        const ip = i === w - 1 ? 0 : i + 1;
        const c = (j * w + i) * 2;
        const cl = (j * w + im) * 2;
        const cr = (j * w + ip) * 2;
        const cu = (jm * w + i) * 2;
        const cd = (jp * w + i) * 2;
        const u = a[c]!;
        const v = a[c + 1]!;
        const lapU = (a[cl]! + a[cr]! + a[cu]! + a[cd]! - 4.0 * u) / dx2;
        const lapV = (a[cl + 1]! + a[cr + 1]! + a[cu + 1]! + a[cd + 1]! - 4.0 * v) / dx2;
        const [du, dv] = rates(s, u, v, lapU, lapV);
        b[c] = u + s.dt * du;
        b[c + 1] = v + s.dt * dv;
      }
    }
    [a, b] = [b, a];
  }
  if (a !== state) state.set(a);
}

// ------------------------------------------------- canonical initial state --

/** mix32 / hash3 — the @bp/runtime counter hash, restated here so this module stays dependency-free. */
function mix32(x0: number): number {
  let x = x0 >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

export function hash3(a: number, b: number, c: number): number {
  return mix32((a ^ mix32((b ^ mix32(c >>> 0)) >>> 0)) >>> 0);
}

/**
 * Dyadic noise in [−amp/2, amp/2): `bits` bits of the hash times a power-of-
 * two amp, so the value — and a rest state plus it, when amp·2^−bits is no
 * finer than the rest state's f32 ulp — is exactly representable in f32 and
 * f64 alike (the GPU and the f64 reference start from the same numbers).
 */
export function dyadicNoise(seed: number, cell: number, lane: number, amp: number, bits = 12): number {
  return ((hash3(seed, cell, lane) >>> (32 - bits)) / 2 ** bits - 0.5) * amp;
}

export interface CanonicalIC {
  seed: number;
  /** Noise amplitude (a power of two). */
  amp: number;
  /** A centred square of side `bump` cells set to the model's seed state (0 = none). */
  bump: number;
  /** Hash bits of noise (default 12). */
  bits?: number;
}

/** The canonical starting field of a golden: rest state + dyadic noise (+ a centred seed square). */
export function canonicalField(m: ModelDef, w: number, h: number, ic: CanonicalIC): Float64Array {
  const out = new Float64Array(w * h * 2);
  const x0 = Math.floor((w - ic.bump) / 2);
  const y0 = Math.floor((h - ic.bump) / 2);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const cell = y * w + x;
      const inBump = ic.bump > 0 && x >= x0 && x < x0 + ic.bump && y >= y0 && y < y0 + ic.bump;
      const [bu, bv] = inBump ? m.seed : m.rest;
      out[cell * 2] = bu + dyadicNoise(ic.seed, cell, 1, ic.amp, ic.bits ?? 12);
      out[cell * 2 + 1] = bv + dyadicNoise(ic.seed, cell, 2, ic.amp, ic.bits ?? 12);
    }
  }
  return out;
}

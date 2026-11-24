// The Family (05-strange-attractors.md, scenes): the nine systems of the v1
// registry (src/attractors.ts — the same parameters, Δt and starts), each with
// its own palette, in f64 on the CPU (framing, seeding, the Prove reference)
// and in f32 on the GPU (family.wgsl). Lorenz keeps its own gated-equivalent
// path (ensemble.wgsl); its row here is for the gallery and the Prove check.

import { ATTRACTORS } from "../../attractors.js";
import type { V3 } from "./lorenz.js";

export type Rgb = [number, number, number];

export interface FamilySystem {
  key: string;
  label: string;
  /** family.wgsl's field id (v1's attractors_rk4.wgsl numbering; Lorenz 0). */
  id: number;
  /** p0…p5 in the registry's order (canonical values). */
  params: number[];
  /** Registry names of p0…p5, for captions. */
  names: string[];
  dt: number;
  ic: V3;
  /** Density palette, slow → fast (sRGB). */
  palette: Rgb[];
  /** Model time shown per second at 1× (each system's own pace). */
  tempo: number;
  /** One line for the gallery. */
  blurb: string;
  conservative: boolean;
}

/** Palettes in the plan's spirit: Lorenz magnesium white to cobalt, Rössler amber, Thomas verdigris. */
const LOOK: Record<string, { palette: Rgb[]; tempo: number; blurb: string }> = {
  lorenz: {
    palette: [
      [0.05, 0.12, 0.42],
      [0.16, 0.34, 0.86],
      [0.55, 0.7, 1.0],
      [0.97, 0.98, 1.0],
    ],
    tempo: 2.4,
    blurb: "Convection rolls, 1963. Two wings, and it never settles on either.",
  },
  rossler: {
    palette: [
      [0.22, 0.07, 0.01],
      [0.72, 0.34, 0.05],
      [1.0, 0.68, 0.24],
      [1.0, 0.93, 0.76],
    ],
    tempo: 8,
    blurb: "One scroll: a flat spiral that lifts, folds over and lands back inside itself.",
  },
  aizawa: {
    palette: [
      [0.22, 0.04, 0.14],
      [0.66, 0.22, 0.42],
      [0.95, 0.58, 0.72],
      [1.0, 0.92, 0.95],
    ],
    tempo: 3,
    blurb: "A sphere pierced by a tube: the flow spirals out round it and shoots back up the axis.",
  },
  sprott_a: {
    palette: [
      [0.1, 0.05, 0.28],
      [0.38, 0.2, 0.74],
      [0.72, 0.6, 1.0],
      [0.95, 0.93, 1.0],
    ],
    tempo: 4,
    blurb: "Time-reversible, so no attractor at all: a chaotic sea round islands of nested tori.",
  },
  thomas: {
    palette: [
      [0.03, 0.17, 0.15],
      [0.1, 0.44, 0.37],
      [0.36, 0.75, 0.62],
      [0.86, 0.97, 0.91],
    ],
    tempo: 6,
    blurb: "Three sines, each coordinate chasing the next round a cycle, and a little friction.",
  },
  halvorsen: {
    palette: [
      [0.28, 0.03, 0.04],
      [0.78, 0.15, 0.1],
      [1.0, 0.5, 0.35],
      [1.0, 0.9, 0.82],
    ],
    tempo: 1.6,
    blurb: "Three-fold symmetric: the same quadratic fold, turned a third of the way round each time.",
  },
  dadras: {
    palette: [
      [0.14, 0.19, 0.02],
      [0.44, 0.58, 0.08],
      [0.8, 0.9, 0.36],
      [0.97, 1.0, 0.86],
    ],
    tempo: 2,
    blurb: "Dadras and Momeni, 2009: one system that makes two, three or four scrolls as its parameters change.",
  },
  chen: {
    palette: [
      [0.02, 0.14, 0.24],
      [0.05, 0.44, 0.6],
      [0.4, 0.85, 0.95],
      [0.9, 0.99, 1.0],
    ],
    tempo: 0.9,
    blurb: "Chen, 1999: built as the dual of Lorenz's equations — two wings again, but not the same shape in disguise.",
  },
  fourwing: {
    palette: [
      [0.1, 0.11, 0.15],
      [0.34, 0.39, 0.48],
      [0.7, 0.75, 0.83],
      [0.97, 0.98, 1.0],
    ],
    tempo: 3,
    blurb: "Four wings round one centre, visited in no fixed order.",
  },
};

export const FAMILY: readonly FamilySystem[] = ATTRACTORS.map((a) => ({
  key: a.key,
  label: a.label,
  id: a.fieldId,
  params: a.params.map((p) => p.canonical),
  names: a.params.map((p) => p.label),
  dt: a.dt,
  ic: [...a.ic] as V3,
  conservative: a.conservative,
  ...LOOK[a.key]!,
}));

export function familySystem(key: string): FamilySystem {
  const s = FAMILY.find((f) => f.key === key);
  if (!s) throw new Error(`unknown system: ${key}`);
  return s;
}

/** The field, f64 — the same terms as family.wgsl (and v1's attractors_rk4.wgsl). */
export function field64(id: number, p: readonly number[], s: V3): V3 {
  const [x, y, z] = s;
  const q = (i: number): number => p[i] ?? 0;
  switch (id) {
    case 0:
      return [q(0) * (y - x), x * (q(1) - z) - y, x * y - q(2) * z];
    case 1:
      return [-y - z, x + q(0) * y, q(1) + z * (x - q(2))];
    case 2: {
      const r2 = x * x + y * y;
      return [(z - q(1)) * x - q(3) * y, q(3) * x + (z - q(1)) * y, q(2) + q(0) * z - (z * z * z) / 3 - r2 * (1 + q(4) * z) + q(5) * z * x * x * x];
    }
    case 3:
      return [y, -x + y * z, 1 - y * y];
    case 4:
      return [Math.sin(y) - q(0) * x, Math.sin(z) - q(0) * y, Math.sin(x) - q(0) * z];
    case 5:
      return [-q(0) * x - 4 * y - 4 * z - y * y, -q(0) * y - 4 * z - 4 * x - z * z, -q(0) * z - 4 * x - 4 * y - x * x];
    case 6:
      return [y - q(0) * x + q(1) * y * z, q(2) * y - x * z + z, q(3) * x * y - q(4) * z];
    case 7:
      return [q(0) * (y - x), (q(2) - q(0)) * x - x * z + q(2) * y, x * y - q(1) * z];
    case 8:
      return [q(0) * x + q(2) * y * z, q(1) * x + q(3) * y - x * z, q(4) * z + q(5) * x * y];
    default:
      throw new Error(`unknown field ${id}`);
  }
}

export function rk4f(id: number, p: readonly number[], s: V3, dt: number): V3 {
  const add = (a: V3, b: V3, h: number): V3 => [a[0] + h * b[0], a[1] + h * b[1], a[2] + h * b[2]];
  const k1 = field64(id, p, s);
  const k2 = field64(id, p, add(s, k1, dt / 2));
  const k3 = field64(id, p, add(s, k2, dt / 2));
  const k4 = field64(id, p, add(s, k3, dt));
  return [s[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), s[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]), s[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])];
}

/** `n` points `every` steps apart along one f64 trajectory, after `warm` steps from the system's start. */
export function familyTrajectory(sys: FamilySystem, p: readonly number[], n: number, every: number, warm: number, x0: V3 = sys.ic): Float64Array {
  let s: V3 = [...x0];
  for (let i = 0; i < warm; i += 1) s = rk4f(sys.id, p, s, sys.dt);
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < every; k += 1) s = rk4f(sys.id, p, s, sys.dt);
    out.set(s, i * 3);
  }
  return out;
}

/** Centre, RMS size and the 95th-percentile speed of a sample: framing and the palette's top. */
export function familyFrame(sys: FamilySystem, p: readonly number[], pts: Float64Array): { centre: V3; rms: number; speed: number } {
  const n = pts.length / 3;
  const c: V3 = [0, 0, 0];
  for (let i = 0; i < n; i += 1) for (let k = 0; k < 3; k += 1) c[k] += pts[i * 3 + k]! / n;
  let r2 = 0;
  const speeds: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const s: V3 = [pts[i * 3]!, pts[i * 3 + 1]!, pts[i * 3 + 2]!];
    r2 += ((s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2) / n;
    if (i % 4 === 0) speeds.push(Math.hypot(...field64(sys.id, p, s)));
  }
  speeds.sort((a, b) => a - b);
  return { centre: c, rms: Math.sqrt(r2), speed: Math.max(speeds[Math.floor(speeds.length * 0.95)] ?? 1, 1e-6) };
}

/** Warm-up steps for a system's ensemble: ~20 of its time units, at least 1,500, at most 6,000. */
export const familyWarmSteps = (sys: FamilySystem): number => Math.min(6000, Math.max(1500, Math.round(20 / sys.dt)));

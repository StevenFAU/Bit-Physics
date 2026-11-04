// Swarm — starting flocks for the M3 scenes. Species Matrix starts from the
// v4 lab's own random flock (./init.ts, the same mulberry32 stream) and tags
// each fish with a species by the v4 lab's makeSpeciesData scheme; the tag
// rides in the Boid's `align` slot. Eyes Only starts as the authors' code
// does (Bastien & Romanczuk's VisualSwarm.py): random positions, headings and
// speeds in [0, v₀); the heading ψ rides in `align`, and the velocity slot
// holds the step's displacement v·dt·(cos ψ, sin ψ).

import type { BrainParams } from "./brains.js";
import type { SpeciesParams } from "./brains-m3.js";
import { makeInitData, mulberry32 } from "./init.js";

export type M3Init = "species" | "sight" | "group";

const M3: readonly string[] = ["species", "sight", "group"];

/** The "group" start: one group in a square this many body lengths wide (the authors' xMax = 10 R). */
export const GROUP_BOX_BL = 5;
export const isM3Init = (m: string): m is M3Init => M3.includes(m);

/** v4 makeSpeciesData: a deterministic species per fish from the fractions. */
export function speciesOf(n: number, seed: number, p: Pick<SpeciesParams, "count" | "frac">): Uint8Array {
  const a = new Uint8Array(n);
  const ns = Math.max(1, Math.min(6, p.count | 0));
  if (ns <= 1) return a;
  const rs = mulberry32((seed >>> 0) ^ 0x9e3779b9);
  for (let i = 0; i < n; i += 1) {
    const u = rs();
    let c = 0;
    let s = 0;
    for (; s < ns - 1; s += 1) {
      c += p.frac[s] ?? 0;
      if (u < c) break;
    }
    a[i] = s;
  }
  return a;
}

export function makeInitM3(n: number, seed: number, halfW: number, halfH: number, brain: BrainParams, mode: M3Init): Float32Array<ArrayBuffer> {
  if (mode === "species") {
    if (brain.kind !== "species") throw new Error("the species start needs the species brain");
    const f = makeInitData(n, seed, halfW, halfH, brain.p.speed, "random");
    const sp = speciesOf(n, seed, brain.p);
    for (let i = 0; i < n; i += 1) f[i * 6 + 4] = sp[i]!;
    return f;
  }
  if (brain.kind !== "vision") throw new Error("the sight start needs the vision brain");
  const p = brain.p;
  const rnd = mulberry32(seed >>> 0);
  const f = new Float32Array(n * 6);
  const box = GROUP_BOX_BL * 2 * p.R;
  for (let i = 0; i < n; i += 1) {
    const x = mode === "group" ? (rnd() - 0.5) * box : (rnd() * 2 - 1) * halfW;
    const y = mode === "group" ? (rnd() - 0.5) * box : (rnd() * 2 - 1) * halfH;
    const v = rnd() * p.speed;
    const psi = (rnd() * 2 - 1) * Math.PI;
    f[i * 6] = x;
    f[i * 6 + 1] = y;
    f[i * 6 + 2] = Math.cos(psi) * v * p.dt;
    f[i * 6 + 3] = Math.sin(psi) * v * p.dt;
    f[i * 6 + 4] = psi;
    f[i * 6 + 5] = 0;
  }
  return f;
}

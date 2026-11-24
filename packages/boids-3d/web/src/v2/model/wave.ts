// The alarm wave, measured (07-boids-3d.md, "The proof": "alarm propagation
// speed, measured from the attack point"). Every bird keeps the step of its
// last alarm onset and whether it saw the falcon itself (identity.z, written
// by murmur.wgsl). Some seconds after a wave starts, one readback of the whole
// state gives, for each bird that joined it, when it did and where it is.
//
// The falcon keeps alarming birds directly as it flies through, so there is
// not one attack point but a trail of them. For each bird alarmed by contact,
// the speed the alarm needed to reach it from a direct sighting is distance ÷
// delay; the slowest such speed over the sightings before it (its likeliest
// source) is that bird's sample, and the wave's speed is the median sample.
// The flock flies on together, so distances are taken in its own moving
// frame, between positions now. Model behaviour, not a gate: Attanasi et al.
// 2014 measured 20–40 m/s for turns spreading through real starling flocks.

import { AGENT_BYTES } from "./flock.js";

export interface Wave {
  /** Median propagation speed, model units per second (×2 for m/s). */
  speed: number;
  /** Birds that joined the wave; of them, alarmed by the falcon directly. */
  alarmed: number;
  direct: number;
  /** From the first onset to the last, seconds. */
  duration: number;
  /** A sample of (delay after its source, s; distance from it, model units) for the plot. */
  samples: [number, number][];
  /** The step of the first onset. */
  start: number;
}

const NONE = 0xffffffff;

/**
 * `state`: whole agent records; `now`: the current step; onsets older than
 * `window` steps belong to earlier waves; `minDelay`: samples closer in time
 * to their source than this (s) are dropped (their distance is mostly the
 * reaction delay's rounding). Returns null when fewer than 50 birds joined.
 */
export function measureWave(state: ArrayBuffer, now: number, dt: number, window = 600, minDelay = 0.12): Wave | null {
  const f = new Float32Array(state);
  const u = new Uint32Array(state);
  const n = state.byteLength / AGENT_BYTES;
  const onsetOf = (z: number): number => z & 0x7fffffff;
  let t0 = NONE;
  let last = 0;
  const src: { s: number; x: number; y: number; z: number }[] = [];
  const hit: { s: number; x: number; y: number; z: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    const zr = u[i * 16 + 14]!;
    if (zr === NONE) continue;
    const s = onsetOf(zr);
    if (s > now || now - s > window) continue;
    const b = { s, x: f[i * 16]!, y: f[i * 16 + 1]!, z: f[i * 16 + 2]! };
    if (zr >>> 31 === 1) src.push(b);
    else hit.push(b);
    if (s < t0) t0 = s;
    if (s > last) last = s;
  }
  if (t0 === NONE || src.length === 0 || hit.length < 50) return null;
  src.sort((a, b) => a.s - b.s);
  const speeds: number[] = [];
  const samples: [number, number][] = [];
  const every = Math.max(1, Math.floor(hit.length / 600));
  hit.forEach((b, k) => {
    let best = Infinity;
    let bestD = 0;
    let bestT = 0;
    for (const a of src) {
      if (a.s >= b.s) break;
      const t = (b.s - a.s) * dt;
      if (t < minDelay) continue;
      const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      const v = d / t;
      if (v < best) {
        best = v;
        bestD = d;
        bestT = t;
      }
    }
    if (Number.isFinite(best)) {
      speeds.push(best);
      if (k % every === 0) samples.push([bestT, bestD]);
    }
  });
  if (speeds.length < 20) return null;
  speeds.sort((a, b) => a - b);
  const speed = speeds[Math.floor(speeds.length / 2)]!;
  return { speed, alarmed: src.length + hit.length, direct: src.length, duration: (last - t0) * dt, samples, start: t0 };
}

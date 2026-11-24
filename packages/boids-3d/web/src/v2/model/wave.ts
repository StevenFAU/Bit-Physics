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
 *
 * The work is bounded, since the page runs it on the main thread after every
 * wave: at most `maxHits` contact-alarmed birds (every k-th, in id order) are
 * timed against at most `maxSources` sightings (every k-th by onset) — about
 * 4.5 million distance checks at the defaults, where The Attack's 75,418 and
 * 5,643 would be 400 million. Thinning the sightings can only miss a bird's
 * true source, so it errs towards a faster wave: on a synthetic stoop of
 * 20,000 birds and 3,000 sightings the thinned median is within 1% of the full
 * one, and the defaults take ~14 ms at The Attack's counts (unit test); on The
 * Attack itself (a byte-identical replay) it read 19.6 m/s against the full
 * search's 18.7, 4.8% faster.
 */
export function measureWave(state: ArrayBuffer, now: number, dt: number, o: { window?: number; minDelay?: number; maxHits?: number; maxSources?: number } = {}): Wave | null {
  const window = o.window ?? 600;
  const minDelay = o.minDelay ?? 0.12;
  const maxHits = o.maxHits ?? 1500;
  const maxSources = o.maxSources ?? 3000;
  const f = new Float32Array(state);
  const u = new Uint32Array(state);
  const n = state.byteLength / AGENT_BYTES;
  const onsetOf = (z: number): number => z & 0x7fffffff;
  let t0 = NONE;
  let last = 0;
  const src: number[] = [];
  const hit: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const zr = u[i * 16 + 14]!;
    if (zr === NONE) continue;
    const s = onsetOf(zr);
    if (s > now || now - s > window) continue;
    if (zr >>> 31 === 1) src.push(i);
    else hit.push(i);
    if (s < t0) t0 = s;
    if (s > last) last = s;
  }
  if (t0 === NONE || src.length === 0 || hit.length < 50) return null;
  const alarmed = src.length + hit.length;
  const direct = src.length;
  // the sightings, earliest first, thinned evenly to at most maxSources
  src.sort((a, b) => onsetOf(u[a * 16 + 14]!) - onsetOf(u[b * 16 + 14]!));
  const sStride = Math.max(1, Math.ceil(src.length / maxSources));
  const ns = Math.ceil(src.length / sStride);
  const sx = new Float64Array(ns), sy = new Float64Array(ns), sz = new Float64Array(ns), st = new Float64Array(ns);
  for (let k = 0; k < ns; k += 1) {
    const i = src[k * sStride]!;
    sx[k] = f[i * 16]!; sy[k] = f[i * 16 + 1]!; sz[k] = f[i * 16 + 2]!;
    st[k] = onsetOf(u[i * 16 + 14]!) * dt;
  }
  const hStride = Math.max(1, Math.ceil(hit.length / maxHits));
  const speeds: number[] = [];
  const samples: [number, number][] = [];
  const every = Math.max(1, Math.floor(hit.length / hStride / 600));
  let taken = 0;
  for (let h = 0; h < hit.length; h += hStride) {
    const i = hit[h]!;
    const bx = f[i * 16]!, by = f[i * 16 + 1]!, bz = f[i * 16 + 2]!;
    const bt = onsetOf(u[i * 16 + 14]!) * dt;
    let best = Infinity;
    let bestD = 0;
    let bestT = 0;
    for (let k = 0; k < ns; k += 1) {
      const t = bt - st[k]!;
      if (t <= 0) break;
      if (t < minDelay) continue;
      const dx = bx - sx[k]!, dy = by - sy[k]!, dz = bz - sz[k]!;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const v = d / t;
      if (v < best) {
        best = v;
        bestD = d;
        bestT = t;
      }
    }
    if (Number.isFinite(best)) {
      speeds.push(best);
      if (taken % every === 0) samples.push([bestT, bestD]);
      taken += 1;
    }
  }
  if (speeds.length < 20) return null;
  speeds.sort((a, b) => a - b);
  const speed = speeds[Math.floor(speeds.length / 2)]!;
  return { speed, alarmed, direct, duration: (last - t0) * dt, samples, start: t0 };
}

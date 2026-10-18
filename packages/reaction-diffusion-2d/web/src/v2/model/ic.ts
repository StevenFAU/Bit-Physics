// Initial conditions for the live scenes. Deterministic from (seed, shape):
// a counter-based hash, never Math.random(), so a share link reproduces the
// scene's starting state exactly. The gated scene does not use these — it
// loads the committed seed-42 asset (numpy PCG64, not reproducible here).

import { HashStream } from "@bp/runtime";

/** Interleaved (U, V) per cell, row-major, W × H. */
export type Field = Float32Array<ArrayBuffer>;

export function blank(w: number, h: number, seed: number, noise = 1e-3): Field {
  const out = new Float32Array(w * h * 2);
  const rnd = new HashStream(seed, 1);
  for (let c = 0; c < w * h; c += 1) {
    const n = noise > 0 ? (rnd.next() * 2 - 1) * noise : 0;
    out[c * 2] = Math.min(1, Math.max(0, 1 + n));
    out[c * 2 + 1] = Math.min(1, Math.max(0, n));
  }
  return out;
}

/** Paint a seed disc (U 0.5, V 0.25 — the canonical seed values). */
export function disc(f: Field, w: number, h: number, cx: number, cy: number, r: number, periodic: boolean): void {
  const r2 = r * r;
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy += 1) {
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx += 1) {
      if (dx * dx + dy * dy > r2) continue;
      let x = Math.round(cx) + dx;
      let y = Math.round(cy) + dy;
      if (periodic) {
        x = ((x % w) + w) % w;
        y = ((y % h) + h) % h;
      } else if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 2;
      f[i] = 0.5;
      f[i + 1] = 0.25;
    }
  }
}

export interface ScatterOptions {
  /** Grid spacing between seeds, cells. */
  spacing: number;
  /** Seed radius range, cells. */
  radius: readonly [number, number];
  /** Jitter as a fraction of spacing. */
  jitter?: number;
  periodic: boolean;
}

/** Seeds on a jittered lattice — every region of the domain gets some. */
export function scatter(w: number, h: number, seed: number, o: ScatterOptions): Field {
  const f = blank(w, h, seed);
  const rnd = new HashStream(seed, 2);
  const j = o.jitter ?? 0.4;
  for (let y = o.spacing / 2; y < h; y += o.spacing) {
    for (let x = o.spacing / 2; x < w; x += o.spacing) {
      const px = x + (rnd.next() - 0.5) * 2 * j * o.spacing;
      const py = y + (rnd.next() - 0.5) * 2 * j * o.spacing;
      disc(f, w, h, px, py, rnd.range(o.radius[0], o.radius[1]), o.periodic);
    }
  }
  return f;
}

/** `count` seeds at hashed positions. */
export function sprinkle(
  w: number,
  h: number,
  seed: number,
  count: number,
  radius: readonly [number, number],
  periodic: boolean,
): Field {
  const f = blank(w, h, seed);
  const rnd = new HashStream(seed, 3);
  for (let i = 0; i < count; i += 1) {
    disc(f, w, h, rnd.next() * w, rnd.next() * h, rnd.range(radius[0], radius[1]), periodic);
  }
  return f;
}

/** Pearson's start: one central seed square, everything else at rest. */
export function centre(w: number, h: number, seed: number, half: number): Field {
  const f = blank(w, h, seed);
  for (let y = Math.floor(h / 2 - half); y < h / 2 + half; y += 1) {
    for (let x = Math.floor(w / 2 - half); x < w / 2 + half; x += 1) {
      const i = (y * w + x) * 2;
      f[i] = 0.5;
      f[i + 1] = 0.25;
    }
  }
  return f;
}

/** A model's resting state plus a little uniform noise (the Turing scenes start here). */
export function restNoise(w: number, h: number, seed: number, rest: readonly [number, number], amp: number): Field {
  const out = new Float32Array(w * h * 2);
  const rnd = new HashStream(seed, 4);
  for (let c = 0; c < w * h; c += 1) {
    out[c * 2] = rest[0] + (rnd.next() - 0.5) * amp;
    out[c * 2 + 1] = rest[1] + (rnd.next() - 0.5) * amp;
  }
  return out;
}

/**
 * Excitable-medium start: the resting state with a few broken wave fronts —
 * a short band excited to `fire`, with a refractory band (v raised) on one
 * side so it can only travel the other way. Each free end curls into a
 * spiral.
 */
export function brokenFronts(
  w: number,
  h: number,
  seed: number,
  rest: readonly [number, number],
  fire: number,
  refractory: number,
): Field {
  const out = new Float32Array(w * h * 2);
  for (let c = 0; c < w * h; c += 1) {
    out[c * 2] = rest[0];
    out[c * 2 + 1] = rest[1];
  }
  const rnd = new HashStream(seed, 5);
  const fronts = Math.max(1, Math.round((w * h) / 90000));
  for (let f = 0; f < fronts; f += 1) {
    const len = Math.round(Math.min(w, h) * rnd.range(0.18, 0.3));
    const x0 = Math.floor(rnd.next() * w);
    const y0 = Math.floor(rnd.next() * h);
    const flip = rnd.next() < 0.5 ? 1 : -1;
    for (let dx = 0; dx < len; dx += 1) {
      const x = (x0 + dx) % w;
      for (let dy = -3; dy < 14; dy += 1) {
        const y = (((y0 + flip * dy) % h) + h) % h;
        const i = (y * w + x) * 2;
        if (dy < 3) out[i] = fire;
        else out[i + 1] = rest[1] + refractory;
      }
    }
  }
  return out;
}

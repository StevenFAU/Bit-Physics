// Counter-based hashing (00-foundation.md § 4.2). Mirrors WGSL bp/hash.
// Every random draw is hash(seed, step, index) — replayable, no Math.random().

export function mix32(x0: number): number {
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

/** Uniform in [0, 1) with 24 bits, matching WGSL `bp_unit`. */
export function unit(h: number): number {
  return (h >>> 8) / 16777216;
}

/** A tiny deterministic stream for CPU-side scene construction. */
export class HashStream {
  private i = 0;
  constructor(
    private readonly seed: number,
    private readonly lane = 0,
  ) {}
  next(): number {
    return unit(hash3(this.seed, this.lane, this.i++));
  }
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }
}

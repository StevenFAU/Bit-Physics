// Inside the Cell (M1): one cell's step of the committed rule, worked on the
// CPU so every intermediate can be shown — the 48 perception values, the 128
// hidden units, the 16 changes, the coin and the two alive checks. It follows
// packages/neural-ca/typescript/src/nca_inference.wgsl line by line (same
// sums in the same order, rounded to f32 after each operation with
// Math.fround). It is display arithmetic: the dish is always stepped by the
// GPU, and the page compares the two (Inside the Cell's check line, and
// v2-acceptance.mjs) rather than assuming they agree.

export const CN = 16;
export const HID = 128;
export const PERC = 48;
export const ALIVE = 0.1;

export interface Weights {
  w: Float32Array;
  b1Off: number;
  w1Off: number;
  w2Off: number;
}

/** The kernel's stateless PCG fire hash → [0, 1) (u32 arithmetic, as nca_inference.wgsl pcg_fire). */
export function pcgFire(x: number, y: number, step: number, seed: number): number {
  let v = (Math.imul(x, 1973) + Math.imul(y, 9277) + Math.imul(step, 26699)) >>> 0;
  v = (v + Math.imul(seed, 2654435761 | 0)) >>> 0;
  v = (Math.imul(v, 747796405) + 2891336453) >>> 0;
  let word = Math.imul(((v >>> ((v >>> 28) + 4)) ^ v) >>> 0, 277803737) >>> 0;
  word = ((word >>> 22) ^ word) >>> 0;
  return Math.fround(word / 4294967296);
}

/**
 * A block of cells read back from the dish: `size` × `size` cells (16
 * channels each, cell-major) whose (0, 0) cell is grid cell (x0, y0). Cells
 * outside the grid read as zero, as the kernel's zero padding does.
 */
export interface Block {
  x0: number;
  y0: number;
  size: number;
  grid: number;
  data: Float32Array;
}

export function at(b: Block, x: number, y: number, c: number): number {
  if (x < 0 || y < 0 || x >= b.grid || y >= b.grid) return 0;
  const lx = x - b.x0;
  const ly = y - b.y0;
  if (lx < 0 || ly < 0 || lx >= b.size || ly >= b.size) throw new Error(`cell ${x},${y} is outside the block`);
  return b.data[(ly * b.size + lx) * CN + c]!;
}

const f = Math.fround;

/** Perception of cell (x, y): [value, Sobel-x, Sobel-y] per channel, interleaved (3c + k). */
export function perceive(read: (x: number, y: number, c: number) => number, x: number, y: number): Float32Array {
  const p = new Float32Array(PERC);
  for (let c = 0; c < CN; c += 1) {
    const v00 = read(x - 1, y - 1, c);
    const v01 = read(x, y - 1, c);
    const v02 = read(x + 1, y - 1, c);
    const v10 = read(x - 1, y, c);
    const v11 = read(x, y, c);
    const v12 = read(x + 1, y, c);
    const v20 = read(x - 1, y + 1, c);
    const v21 = read(x, y + 1, c);
    const v22 = read(x + 1, y + 1, c);
    // (-v00 + v02 - 2 v10 + 2 v12 - v20 + v22) / 8, left to right as written in the kernel
    let sx = f(-v00 + v02);
    sx = f(sx - f(2 * v10));
    sx = f(sx + f(2 * v12));
    sx = f(sx - v20);
    sx = f(sx + v22);
    let sy = f(-v00 - f(2 * v01));
    sy = f(sy - v02);
    sy = f(sy + v20);
    sy = f(sy + f(2 * v21));
    sy = f(sy + v22);
    p[3 * c] = v11;
    p[3 * c + 1] = f(sx / 8);
    p[3 * c + 2] = f(sy / 8);
  }
  return p;
}

export interface Think {
  /** Pre-activations (before ReLU). */
  z: Float32Array;
  /** Hidden units after ReLU. */
  h: Float32Array;
  /** The proposed change to each of the 16 channels. */
  dx: Float32Array;
  active: number;
}

/** dx = w2 · relu(w1 · p + b1), in the kernel's order. */
export function think(wt: Weights, p: Float32Array): Think {
  const { w, b1Off, w1Off, w2Off } = wt;
  const z = new Float32Array(HID);
  const hid = new Float32Array(HID);
  const dx = new Float32Array(CN);
  let active = 0;
  for (let o = 0; o < HID; o += 1) {
    let acc = w[b1Off + o]!;
    const row = w1Off + o * PERC;
    for (let j = 0; j < PERC; j += 1) acc = f(acc + f(w[row + j]! * p[j]!));
    z[o] = acc;
    const hv = Math.max(acc, 0);
    hid[o] = hv;
    if (hv !== 0) {
      active += 1;
      for (let c = 0; c < CN; c += 1) dx[c] = f(dx[c]! + f(w[w2Off + c * HID + o]! * hv));
    }
  }
  return { z, h: hid, dx, active };
}

export interface CellStep {
  x: number;
  y: number;
  step: number;
  /** The cell's 16 values now. */
  state: Float32Array;
  perception: Float32Array;
  think: Think;
  /** The coin: the hash value and whether it fell at or under the update chance. */
  coin: number;
  fires: boolean;
  /** Highest opacity in the 3 × 3 neighbourhood before and after the update. */
  maxAlphaBefore: number;
  maxAlphaAfter: number;
  lives: boolean;
  /** The cell's 16 values after the step. */
  next: Float32Array;
}

/**
 * One step of cell (x, y) from a block that holds at least its 5 × 5
 * neighbourhood (the post-update alive check needs its neighbours' updated
 * opacity, and each of those needs its own 3 × 3).
 */
export function stepCell(b: Block, wt: Weights, x: number, y: number, step: number, seed: number, rate: number): CellStep {
  const read = (xx: number, yy: number, c: number): number => at(b, xx, yy, c);
  const state = new Float32Array(CN);
  for (let c = 0; c < CN; c += 1) state[c] = read(x, y, c);
  const perception = perceive(read, x, y);
  const t = think(wt, perception);
  const coin = pcgFire(x, y, step, seed);
  const fires = coin <= Math.fround(rate);
  const mid = new Float32Array(CN);
  for (let c = 0; c < CN; c += 1) mid[c] = f(state[c]! + f(t.dx[c]! * (fires ? 1 : 0)));
  // the neighbours' updated opacity (for the post-update alive check)
  let before = -1e30;
  let after = -1e30;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      before = Math.max(before, read(nx, ny, 3));
      if (nx < 0 || ny < 0 || nx >= b.grid || ny >= b.grid) {
        after = Math.max(after, 0);
        continue;
      }
      if (dx === 0 && dy === 0) {
        after = Math.max(after, mid[3]!);
        continue;
      }
      const pn = perceive(read, nx, ny);
      const tn = think(wt, pn);
      const fn = pcgFire(nx, ny, step, seed) <= Math.fround(rate);
      after = Math.max(after, f(read(nx, ny, 3) + f(tn.dx[3]! * (fn ? 1 : 0))));
    }
  }
  const lives = before > ALIVE && after > ALIVE;
  const next = new Float32Array(CN);
  for (let c = 0; c < CN; c += 1) next[c] = lives ? mid[c]! : 0;
  return { x, y, step, state, perception, think: t, coin, fires, maxAlphaBefore: before, maxAlphaAfter: after, lives, next };
}

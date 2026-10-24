// Swarm — the Vicsek brain's CPU reference, in f64 (03-boids-2d.md § The
// proof: "at small N, the GPU φ(η) curve over K seeds must match the CPU
// reference curve within the declared band"). The same rule as the WGSL in
// ./brains.ts — the unit headings within r, itself included, summed; turn
// to the sum, then by a uniform angle in [−ηπ, ηπ]; one step at v₀; wrap —
// with the same noise hash, in plain f64 arithmetic and a cell list. The
// flock is chaotic, so the GPU and this reference agree on statistics, not
// on paths: the check compares ⟨φ⟩ over seeds.

import { brainSeed, hashU32 } from "./brains.js";

export interface VicsekRun {
  n: number;
  /** Box side (square box, wrapped), in units of r. */
  L: number;
  /** Speed v₀ in units of r per step. */
  v0: number;
  eta: number;
  seed: number;
  steps: number;
  /** Take φ after every `every` steps. */
  every: number;
  /** Starting positions and headings (n × [x, y, vx, vy]) in units of r; x, y ∈ [−L/2, L/2). */
  init: Float64Array;
}

/** The WGSL rnd(id, 0): 24 bits of hash, uniform in [0, 1). */
export function noiseDraw(id: number, frameSeed: number): number {
  const inner = hashU32(frameSeed >>> 0);
  return (hashU32((Math.imul(id >>> 0, 0x9e3779b1) ^ inner) >>> 0) >>> 8) / 16777216;
}

/** Run the reference; returns φ after every `every` steps. */
export function runVicsekCpu(o: VicsekRun): Float64Array {
  const { n, L, v0, eta, steps, every } = o;
  const half = L / 2;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const hx = new Float64Array(n);
  const hy = new Float64Array(n);
  const nx = new Float64Array(n);
  const ny = new Float64Array(n);
  const nhx = new Float64Array(n);
  const nhy = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    x[i] = o.init[i * 4]!;
    y[i] = o.init[i * 4 + 1]!;
    const vx = o.init[i * 4 + 2]!;
    const vy = o.init[i * 4 + 3]!;
    const l = Math.hypot(vx, vy);
    hx[i] = l > 0 ? vx / l : 1;
    hy[i] = l > 0 ? vy / l : 0;
  }
  // cell list: cells of side ≥ 1 (= r); the wrapped 3 × 3 block needs at least 3 a row
  const cells = Math.floor(L);
  if (cells < 3) throw new Error("the reference needs a box at least 3 r wide");
  const cs = L / cells;
  const head = new Int32Array(cells * cells);
  const next = new Int32Array(n);
  const cxs = new Int32Array(n);
  const cys = new Int32Array(n);
  const out = new Float64Array(Math.floor(steps / every));
  let k = 0;
  for (let t = 0; t < steps; t += 1) {
    head.fill(-1);
    for (let i = 0; i < n; i += 1) {
      const cx = Math.min(cells - 1, Math.max(0, Math.floor((x[i]! + half) / cs)));
      const cy = Math.min(cells - 1, Math.max(0, Math.floor((y[i]! + half) / cs)));
      cxs[i] = cx;
      cys[i] = cy;
      const c = cy * cells + cx;
      next[i] = head[c]!;
      head[c] = i;
    }
    const fs = brainSeed(o.seed, t);
    for (let i = 0; i < n; i += 1) {
      let sx = hx[i]!;
      let sy = hy[i]!;
      const xi = x[i]!;
      const yi = y[i]!;
      const cx = cxs[i]!;
      const cy = cys[i]!;
      for (let oy = -1; oy <= 1; oy += 1) {
        let yy = cy + oy;
        if (yy < 0) yy += cells;
        else if (yy >= cells) yy -= cells;
        for (let ox = -1; ox <= 1; ox += 1) {
          let xx = cx + ox;
          if (xx < 0) xx += cells;
          else if (xx >= cells) xx -= cells;
          for (let j = head[yy * cells + xx]!; j >= 0; j = next[j]!) {
            if (j === i) continue;
            let dx = x[j]! - xi;
            if (dx > half) dx -= L;
            else if (dx < -half) dx += L;
            let dy = y[j]! - yi;
            if (dy > half) dy -= L;
            else if (dy < -half) dy += L;
            if (dx * dx + dy * dy < 1) {
              sx += hx[j]!;
              sy += hy[j]!;
            }
          }
        }
      }
      let dxh = hx[i]!;
      let dyh = hy[i]!;
      const l = Math.hypot(sx, sy);
      if (l > 0) {
        dxh = sx / l;
        dyh = sy / l;
      }
      if (eta > 0) {
        const a = (noiseDraw(i, fs) * 2 - 1) * eta * Math.PI;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const rx = dxh * c - dyh * s;
        dyh = dxh * s + dyh * c;
        dxh = rx;
      }
      nhx[i] = dxh;
      nhy[i] = dyh;
      let px = x[i]! + dxh * v0;
      let py = y[i]! + dyh * v0;
      if (px > half) px -= L;
      if (px < -half) px += L;
      if (py > half) py -= L;
      if (py < -half) py += L;
      nx[i] = px;
      ny[i] = py;
    }
    x.set(nx);
    y.set(ny);
    hx.set(nhx);
    hy.set(nhy);
    if ((t + 1) % every === 0 && k < out.length) {
      let ax = 0;
      let ay = 0;
      for (let i = 0; i < n; i += 1) {
        ax += hx[i]!;
        ay += hy[i]!;
      }
      out[k++] = Math.hypot(ax, ay) / n;
    }
  }
  return out;
}

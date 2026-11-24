// The flock's own checks, in the page (Prove) and in the acceptance run:
// the live kernel's grid search against its brute-force twin, byte for byte,
// and the grid's sort and gather as an exact permutation (07-boids-3d.md,
// "The proof"; feature-expansion-spec.md § 8.3 rows 2, 3, 4 and 6).

import type { FlockKernels, StepInput, V3 } from "../model/flock.js";
import { AGENT_BYTES, Flock, MURMURATION, NO_TOOL, cellCount, seedFlock } from "../model/flock.js";

export type Fixture = "flock" | "edge" | "falcon";

/**
 * Initial states: "flock" is the seeded starting flock; "edge" packs the
 * birds against and beyond a corner of the grid's box, where out-of-range
 * birds are clamped into the boundary cells; "falcon" is the flock with the
 * falcon flying through it, so the alarm spreads during the check.
 */
export function fixtureState(kind: Fixture, n: number, seed: number, box: { min: V3; size: V3 }): ArrayBuffer {
  const data = seedFlock(n, MURMURATION, seed);
  if (kind !== "edge") return data;
  const f = new Float32Array(data);
  let s = (seed ^ 0x9e3779b9) >>> 0 || 1;
  const rnd = (): number => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4_294_967_296;
  };
  for (let i = 0; i < n; i += 1) {
    // a 6-unit cube straddling the (+x, +y, +z) corner: half inside, half beyond
    for (let a = 0; a < 3; a += 1) f[i * 16 + a] = box.min[a]! + box.size[a]! - 3 + rnd() * 6;
  }
  return data;
}

export interface IdentityResult {
  fixture: Fixture;
  birds: number;
  steps: number;
  identical: boolean;
  /** First step whose bytes differ, or null. */
  firstMismatch: number | null;
  /** Mean followed neighbours after the last step (behavior.y), so the check is not vacuous. */
  meanNeighbors: number;
  /** Birds that took fright during the check (the falcon fixture). */
  alarmed: number;
}

/** Step the same state through the grid and the brute-force twin; compare every step's bytes. */
export async function gridVsBrute(device: GPUDevice, k: FlockKernels, kind: Fixture, o: { birds?: number; steps?: number; seed?: number } = {}): Promise<IdentityResult> {
  const n = o.birds ?? 2048;
  const steps = o.steps ?? (kind === "falcon" ? 24 : 8);
  const a = new Flock(device, k, n);
  const b = new Flock(device, k, n);
  const g = a.grid;
  const state = fixtureState(kind, n, o.seed ?? 7, { min: g.min, size: [g.dims[0] * g.cell, g.dims[1] * g.cell, g.dims[2] * g.cell] });
  try {
    if (kind === "falcon") {
      // the falcon flies through the flock's middle
      const f = new Float32Array(state);
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < n; i += 1) {
        cx += f[i * 16]!; cy += f[i * 16 + 1]!; cz += f[i * 16 + 2]!;
      }
      const c: V3 = [cx / n, cy / n, cz / n];
      const input = (step: number): StepInput => ({ step, falcon: { position: [c[0] - 6 + step * 0.1, c[1] + 1, c[2]], velocity: [12, 0, 0] }, tool: NO_TOOL });
      a.input = input;
      b.input = input;
    }
    a.load(state);
    b.load(state);
    let firstMismatch: number | null = null;
    let last = new ArrayBuffer(0);
    for (let s = 1; s <= steps; s += 1) {
      const enc = device.createCommandEncoder({ label: "murmur-identity" });
      a.encodeSteps(enc, 1);
      b.encodeSteps(enc, 1, { brute: true });
      device.queue.submit([enc.finish()]);
      const [ga, gb] = await Promise.all([a.readState(), b.readState()]);
      const ua = new Uint32Array(ga);
      const ub = new Uint32Array(gb);
      if (firstMismatch === null) {
        for (let i = 0; i < ua.length; i += 1) {
          if (ua[i] !== ub[i]) {
            firstMismatch = s;
            break;
          }
        }
      }
      last = ga;
    }
    const lf = new Float32Array(last);
    const lu = new Uint32Array(last);
    let nb = 0;
    let alarmed = 0;
    for (let i = 0; i < n; i += 1) {
      nb += lf[i * 16 + 9]!;
      if (lu[i * 16 + 14] !== 0xffffffff) alarmed += 1;
    }
    return { fixture: kind, birds: n, steps, identical: firstMismatch === null, firstMismatch, meanNeighbors: nb / n, alarmed };
  } finally {
    a.destroy();
    b.destroy();
  }
}

export interface PermutationResult {
  birds: number;
  /** The scan's last entry is the bird count. */
  countOk: boolean;
  /** Every id appears exactly once in the order. */
  permutation: boolean;
  /** Every id sits inside its own cell's range. */
  inCell: boolean;
  /** Cell starts never decrease. */
  scanOk: boolean;
  /** The gathered candidates are the ordered birds' positions and ids. */
  gatherOk: boolean;
  maxOccupancy: number;
  occupiedCells: number;
  passed: boolean;
}

/** Rebuild the grid on a flock's current state and check the sort and gather on the CPU. */
export async function checkScatter(device: GPUDevice, flock: Flock): Promise<PermutationResult> {
  const enc = device.createCommandEncoder({ label: "murmur-scatter-check" });
  flock.encodeGrid(enc);
  device.queue.submit([enc.finish()]);
  const n = flock.count;
  const g = flock.grid;
  const cells = cellCount(g);
  const [starts, order, cand, state] = await Promise.all([
    flock.readBuffer(flock.sort.cellStart, (cells + 1) * 4).then((b) => new Uint32Array(b)),
    flock.readBuffer(flock.sort.order, n * 4).then((b) => new Uint32Array(b)),
    flock.readBuffer(flock.cand, n * 16),
    flock.readBuffer(flock.current, n * AGENT_BYTES).then((b) => new Float32Array(b)),
  ]);
  let scanOk = true;
  let maxOcc = 0;
  let occupied = 0;
  for (let c = 0; c < cells; c += 1) {
    const k = starts[c + 1]! - starts[c]!;
    if (starts[c + 1]! < starts[c]!) scanOk = false;
    if (k > maxOcc) maxOcc = k;
    if (k > 0) occupied += 1;
  }
  const countOk = starts[0] === 0 && starts[cells] === n;
  const seen = new Uint8Array(n);
  let permutation = true;
  for (let i = 0; i < n; i += 1) {
    const id = order[i]!;
    if (id >= n || seen[id]) {
      permutation = false;
      break;
    }
    seen[id] = 1;
  }
  // murmur-params.wgsl cell_of: floor((p − min) · (1 / cell)), clamped, in f32
  const inv = Math.fround(1 / g.cell);
  const cellOf = (x: number, lo: number, dim: number): number => Math.min(Math.max(Math.floor(Math.fround(Math.fround(x - Math.fround(lo)) * inv)), 0), dim - 1);
  let inCell = permutation && countOk;
  for (let c = 0; c < cells && inCell; c += 1) {
    for (let k = starts[c]!; k < starts[c + 1]!; k += 1) {
      const id = order[k]!;
      const x = cellOf(state[id * 16]!, g.min[0], g.dims[0]);
      const y = cellOf(state[id * 16 + 1]!, g.min[1], g.dims[1]);
      const z = cellOf(state[id * 16 + 2]!, g.min[2], g.dims[2]);
      if (x + g.dims[0] * (y + g.dims[1] * z) !== c) {
        inCell = false;
        break;
      }
    }
  }
  const cf = new Float32Array(cand);
  const cu = new Uint32Array(cand);
  let gatherOk = permutation;
  for (let k = 0; k < n && gatherOk; k += 1) {
    const id = order[k]!;
    if (cu[k * 4 + 3] !== id || cf[k * 4] !== state[id * 16] || cf[k * 4 + 1] !== state[id * 16 + 1] || cf[k * 4 + 2] !== state[id * 16 + 2]) gatherOk = false;
  }
  return { birds: n, countOk, permutation, inCell, scanOk, gatherOk, maxOccupancy: maxOcc, occupiedCells: occupied, passed: countOk && permutation && inCell && scanOk && gatherOk };
}

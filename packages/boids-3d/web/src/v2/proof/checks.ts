// The flock's own checks, in the page (Prove) and in the acceptance run:
// the counting-sort grid against the brute-force twin of the same kernel,
// byte for byte, and the grid's scatter as an exact permutation (07-boids-3d.md,
// "The proof"; feature-expansion-spec.md § 8.3 rows 2, 3, 4 and 6).

import type { FlockKernels, MurmurationPreset } from "../model/flock.js";
import { AGENT_BYTES, CELL_COUNT, Flock, GRID, presetById, seedFlock } from "../model/flock.js";

export type Fixture = "flock" | "edge";

/**
 * Initial states for the identity check: "flock" is v1's seeded flock;
 * "edge" packs the birds tightly against and beyond a corner of the grid,
 * where out-of-range birds are clamped into the boundary cells.
 */
export function fixtureState(kind: Fixture, n: number, preset: MurmurationPreset, seed: number): ArrayBuffer {
  if (kind === "flock") return seedFlock(n, preset, seed);
  const data = seedFlock(n, preset, seed);
  const f = new Float32Array(data);
  let s = (seed ^ 0x9e3779b9) >>> 0 || 1;
  const rnd = (): number => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4_294_967_296;
  };
  const hi = [-GRID.min[0], -GRID.min[1], -GRID.min[2]];
  for (let i = 0; i < n; i += 1) {
    // a 14-unit cube straddling the (+x, +y, +z) corner: half inside, half beyond
    f[i * 16] = hi[0]! - 7 + rnd() * 14;
    f[i * 16 + 1] = hi[1]! - 7 + rnd() * 14;
    f[i * 16 + 2] = hi[2]! - 7 + rnd() * 14;
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
  /** Mean selected social neighbours after the last step (behavior.y), so the check is not vacuous. */
  meanNeighbors: number;
}

/** Step the same state through the grid and the brute-force twin; compare every step's bytes. */
export async function gridVsBrute(device: GPUDevice, k: FlockKernels, kind: Fixture, o: { birds?: number; steps?: number; preset?: string; seed?: number } = {}): Promise<IdentityResult> {
  const n = o.birds ?? 2048;
  const steps = o.steps ?? 8;
  const preset = presetById(o.preset ?? "starling");
  const state = fixtureState(kind, n, preset, o.seed ?? 7);
  const a = new Flock(device, k, n);
  const b = new Flock(device, k, n);
  try {
    a.load(state, preset);
    b.load(state, preset);
    let firstMismatch: number | null = null;
    let last = new Float32Array(0);
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
      last = new Float32Array(ga);
    }
    let nb = 0;
    for (let i = 0; i < n; i += 1) nb += last[i * 16 + 9]!;
    return { fixture: kind, birds: n, steps, identical: firstMismatch === null, firstMismatch, meanNeighbors: nb / n };
  } finally {
    a.destroy();
    b.destroy();
  }
}

export interface PermutationResult {
  birds: number;
  /** Σ cell counts == birds. */
  countOk: boolean;
  /** Every id appears exactly once in the sorted index. */
  permutation: boolean;
  /** Every id sits inside its own cell's range. */
  inCell: boolean;
  /** Exclusive-scan starts agree with the counts. */
  scanOk: boolean;
  maxOccupancy: number;
  occupiedCells: number;
  passed: boolean;
}

/** Rebuild the grid on a flock's current state and check the scatter on the CPU. */
export async function checkScatter(device: GPUDevice, flock: Flock): Promise<PermutationResult> {
  const enc = device.createCommandEncoder({ label: "murmur-scatter-check" });
  flock.encodeGrid(enc);
  device.queue.submit([enc.finish()]);
  const n = flock.count;
  const [counts, starts, order, state] = await Promise.all([
    flock.readBuffer(flock.cellCount, CELL_COUNT * 4).then((b) => new Uint32Array(b)),
    flock.readBuffer(flock.cellStart, CELL_COUNT * 4).then((b) => new Uint32Array(b)),
    flock.readBuffer(flock.sortedIndex, n * 4).then((b) => new Uint32Array(b)),
    flock.readBuffer(flock.current, n * AGENT_BYTES).then((b) => new Float32Array(b)),
  ]);
  let total = 0;
  let scanOk = true;
  let maxOcc = 0;
  let occupied = 0;
  for (let c = 0; c < CELL_COUNT; c += 1) {
    if (starts[c] !== total) scanOk = false;
    total += counts[c]!;
    maxOcc = Math.max(maxOcc, counts[c]!);
    if (counts[c]! > 0) occupied += 1;
  }
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
  // grid.wgsl's cell_of: floor((p − min) / size), clamped, in f32
  const inv = Math.fround(1 / GRID.cellSize);
  const cellOf = (x: number, lo: number, dim: number): number => Math.min(Math.max(Math.floor(Math.fround(Math.fround(x - lo) * inv)), 0), dim - 1);
  let inCell = permutation;
  for (let c = 0; c < CELL_COUNT && inCell; c += 1) {
    for (let k = starts[c]!; k < starts[c]! + counts[c]!; k += 1) {
      const id = order[k]!;
      const x = cellOf(state[id * 16]!, GRID.min[0], GRID.nx);
      const y = cellOf(state[id * 16 + 1]!, GRID.min[1], GRID.ny);
      const z = cellOf(state[id * 16 + 2]!, GRID.min[2], GRID.nz);
      if (x + GRID.nx * (y + GRID.ny * z) !== c) {
        inCell = false;
        break;
      }
    }
  }
  const countOk = total === n;
  return { birds: n, countOk, permutation, inCell, scanOk, maxOccupancy: maxOcc, occupiedCells: occupied, passed: countOk && permutation && inCell && scanOk };
}

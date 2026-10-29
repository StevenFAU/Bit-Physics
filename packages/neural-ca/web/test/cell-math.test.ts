import { describe, expect, it } from "vitest";
import type { Block } from "../src/v2/model/cell-math.js";
import { CN, pcgFire, stepCell, think } from "../src/v2/model/cell-math.js";
import fixture from "./fixtures/cell-step.json";

const f32 = (b64: string): Float32Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
};

// The committed checkpoint, in its committed layout (nca-layout.json); binary assets import as data URLs.
const inline = import.meta.glob<string>("../public/nca-weights.bin", { eager: true, query: "?inline", import: "default" });
const url = Object.values(inline)[0]!;
const weights = f32(url.slice(url.indexOf(",") + 1));
const W = { w: weights, b1Off: 0, w1Off: 128, w2Off: 6272 };

describe("pcgFire", () => {
  it("matches the kernel's hash (values from neural_ca.reference.nca_numpy.pcg_fire)", () => {
    const cases: [number, number, number, number, number][] = [
      [0, 0, 0, 42, 0.41635022],
      [31, 32, 7, 42, 0.27684677],
      [63, 63, 999, 42, 0.30163056],
      [5, 60, 123456, 7, 0.48824385],
      [17, 3, 1048576, 2147483647, 0.5061744],
    ];
    for (const [x, y, t, s, v] of cases) expect(pcgFire(x, y, t, s)).toBe(Math.fround(v));
  });
});

describe("think", () => {
  it("changes nothing when the last layer is zero (the paper's zero-init)", () => {
    const w = new Float32Array(weights);
    w.fill(0, 6272);
    const t = think({ ...W, w }, Float32Array.from({ length: 48 }, (_, i) => Math.sin(i)));
    expect(Array.from(t.dx).every((v) => v === 0)).toBe(true);
  });
});

describe("stepCell", () => {
  it("reproduces the NumPy reference's next state on an organism's edge (committed checkpoint, step 40 → 41)", () => {
    const block: Block = { x0: fixture.x0, y0: fixture.y0, size: fixture.size, grid: fixture.grid, data: f32(fixture.block) };
    const next = f32(fixture.next);
    let maxAbs = 0;
    let flips = 0;
    let living = 0;
    for (let j = 0; j < fixture.inner; j += 1) {
      for (let i = 0; i < fixture.inner; i += 1) {
        const x = fixture.x0 + 2 + i;
        const y = fixture.y0 + 2 + j;
        const s = stepCell(block, W, x, y, fixture.step, fixture.seed, fixture.rate);
        const o = (j * fixture.inner + i) * CN;
        // a cell that dies is all zeros; one that lives (and has anything in it) is not
        const refZero = Array.from(next.subarray(o, o + CN)).every((v) => v === 0);
        const cpuZero = Array.from(s.next).every((v) => v === 0);
        if (refZero !== cpuZero) flips += 1;
        if (s.lives) living += 1;
        for (let c = 0; c < CN; c += 1) maxAbs = Math.max(maxAbs, Math.abs(s.next[c]! - next[o + c]!));
      }
    }
    // NumPy sums the MLP with BLAS in its own order, so the last bits differ; which cells die may not.
    expect(flips).toBe(0);
    expect(living).toBeGreaterThan(10);
    expect(maxAbs).toBeLessThan(1e-5);
  });
});

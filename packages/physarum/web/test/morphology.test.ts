import { describe, expect, it } from "vitest";
import { downsample, morphology } from "../src/v2/model/morphology.js";

/** A w × h field, 0 everywhere except where `on` says 3 (× the mean). */
function field(w: number, h: number, on: (x: number, y: number) => boolean): Float32Array {
  const f = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (on(x, y)) f[y * w + x] = 3;
  return f;
}

describe("morphology", () => {
  it("counts a closed ring as one piece enclosing one gap", () => {
    const m = morphology(field(64, 64, (x, y) => Math.abs(Math.hypot(x - 32, y - 32) - 14) < 1.5), 64, 64);
    expect(m.pieces).toBe(1);
    expect(m.meshes).toBe(1);
    expect(m.loopiness).toBeCloseTo(0.5);
    expect(m.meshArea).toBeGreaterThan(Math.PI * 12 * 12);
  });

  it("counts separate rods as pieces with no enclosed gaps", () => {
    const m = morphology(field(80, 60, (x, y) => (y === 10 || y === 30 || y === 50) && x > 10 && x < 40), 80, 60);
    expect(m.pieces).toBe(3);
    expect(m.meshes).toBe(0);
    expect(m.loopiness).toBe(0);
    expect(m.width).toBeCloseTo(30 / 31, 2);
  });

  it("counts the cells of a lattice on the periodic dish", () => {
    // lines every 16 cells across a 64 × 64 torus: 4 × 4 closed cells, one connected piece
    const m = morphology(field(64, 64, (x, y) => x % 16 === 0 || y % 16 === 0), 64, 64);
    expect(m.pieces).toBe(1);
    expect(m.meshes).toBe(16);
    expect(m.meshArea).toBe(15 * 15);
  });

  it("joins pieces across the periodic edge", () => {
    const m = morphology(field(40, 40, (x, y) => y === 20 && (x < 6 || x > 33)), 40, 40);
    expect(m.pieces).toBe(1);
  });

  it("does not count the open background as a mesh", () => {
    const m = morphology(field(50, 50, () => false), 50, 50);
    expect(m.meshes).toBe(0);
    expect(m.pieces).toBe(0);
    expect(m.cover).toBe(0);
  });

  it("block-averages a field", () => {
    const f = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const d = downsample(f, 4, 3, 2);
    expect([d.w, d.h]).toEqual([2, 2]);
    expect([...d.field]).toEqual([(1 + 2 + 5 + 6) / 4, (3 + 4 + 7 + 8) / 4, (9 + 10) / 2, (11 + 12) / 2]);
  });
});

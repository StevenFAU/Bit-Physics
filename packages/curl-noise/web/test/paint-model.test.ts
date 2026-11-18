// Flow Sculpture v2, Paint the Stream — the 2D model's pure code
// (packages/curl-noise/web/src/v2/paint/model.ts): the B-spline the kernels
// and the map share, the starting landscape, and the Prove/Learn reductions.
import { describe, expect, it } from "vitest";
import { FLAT_GROUND, blockCounts, bsplineWeights, contourResidual, landscape, landscapeFor, patchSpread, probeStats, psiAt } from "../src/v2/paint/model.js";

describe("the cubic B-spline", () => {
  it("weights are a partition of unity, and reproduce linear functions", () => {
    for (const t of [0, 0.1, 0.37, 0.5, 0.99]) {
      const w = bsplineWeights(t);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 14);
      // the curve of nodes x_i = i passes through t (uniform B-spline, nodes −1…2)
      expect(-1 * w[0] + 0 * w[1] + 1 * w[2] + 2 * w[3]).toBeCloseTo(t, 14);
    }
  });

  it("ψ of a constant grid is that constant everywhere, across the wrap", () => {
    const n = 16;
    const g = new Float32Array(n * n).fill(3.5);
    for (const [x, y] of [[0, 0], [15.7, 0.2], [-3, 40.5]] as const) expect(psiAt(g, n, x, y)).toBeCloseTo(3.5, 12);
  });
});

describe("the starting landscape", () => {
  it("is the same for the same seed, different for another, and periodic", () => {
    const n = 64;
    const a = landscape(n, 5);
    const b = landscape(n, 5);
    const c = landscape(n, 6);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
    // smooth across the seam: neighbours across the wrap differ about as much as inside
    let seam = 0;
    let inside = 0;
    for (let j = 0; j < n; j += 1) {
      seam = Math.max(seam, Math.abs(a[j * n + n - 1]! - a[j * n]!));
      inside = Math.max(inside, Math.abs(a[j * n + 1]! - a[j * n]!));
    }
    expect(seam).toBeLessThan(3 * inside + 1e-9);
  });
  it("flat ground (FLAT_GROUND, the link's seed −1) is ψ ≡ 0; seed 0 is an ordinary landscape", () => {
    const n = 32;
    expect(FLAT_GROUND).toBe(-1);
    expect(landscapeFor(n, FLAT_GROUND).every((v) => v === 0)).toBe(true);
    expect(landscapeFor(n, FLAT_GROUND).length).toBe(n * n);
    expect(Array.from(landscapeFor(n, 0))).toEqual(Array.from(landscape(n, 0)));
    expect(landscapeFor(n, 0).some((v) => v !== 0)).toBe(true);
  });
});

describe("the measurements", () => {
  it("contour residual: zero where the anchors are ψ itself, and it reads a shift", () => {
    const n = 32;
    const g = landscape(n, 2);
    const parts: number[] = [];
    for (const [x, y] of [[3.2, 4.1], [20.5, 7.75], [31.9, 30.1]] as const) parts.push(x, y, psiAt(g, n, x, y), 0);
    expect(contourResidual(g, n, parts).worst).toBe(0);
    parts[2]! += 2;
    expect(contourResidual(g, n, parts).worst).toBeCloseTo(2, 9);
  });

  it("patch counts: an even grid has no spread; blockCounts bins the torus", () => {
    const n = 64;
    const parts: number[] = [];
    for (let j = 0; j < 64; j += 1) for (let i = 0; i < 64; i += 1) parts.push(i + 0.5, j + 0.5, 0, 0);
    const c = blockCounts(parts, n, 8);
    expect(c.every((v) => v === 64)).toBe(true);
    const s = patchSpread(parts, n);
    expect(s.perPatch).toBe(64);
    expect(s.spread).toBe(0);
    expect(s.expected).toBeCloseTo(1 / 8, 12);
  });

  it("probe stats: divergence against its terms, v·∇ψ against |v|²", () => {
    const out = [1e-4, 1e3, 0, 2, -2e-4, 4e3, 0.5, 4];
    const s = probeStats(out);
    expect(s.divRel).toBeCloseTo(1e-7, 15);
    expect(s.termMax).toBe(4e3);
    expect(s.alongRel).toBeCloseTo(0.5 / 16, 12);
  });
});

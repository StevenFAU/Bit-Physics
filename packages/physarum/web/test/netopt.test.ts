import { describe, expect, it } from "vitest";
import type { Pt } from "../src/v2/model/netopt.js";
import { fermat, meanPairDistance, mst, steiner, treeEdges } from "../src/v2/model/netopt.js";

describe("minimum spanning tree", () => {
  it("spans a unit square with three sides", () => {
    const t = mst([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    expect(t.edges).toHaveLength(3);
    expect(t.length).toBeCloseTo(3, 12);
  });

  it("matches a brute-force check on random points (no shorter swap exists)", () => {
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
    const pts: Pt[] = Array.from({ length: 30 }, () => [rnd() * 100, rnd() * 100]);
    const t = mst(pts);
    expect(t.edges).toHaveLength(29);
    // cycle property: every non-tree edge is at least as long as the longest tree edge on its cycle;
    // checked here via Kruskal's total on the complete graph
    const all: [number, number, number][] = [];
    for (let i = 0; i < pts.length; i += 1) for (let j = i + 1; j < pts.length; j += 1) all.push([Math.hypot(pts[i]![0] - pts[j]![0], pts[i]![1] - pts[j]![1]), i, j]);
    all.sort((a, b) => a[0] - b[0]);
    const p = pts.map((_, i) => i);
    const f = (i: number): number => (p[i] === i ? i : (p[i] = f(p[i]!)));
    let total = 0;
    for (const [d, i, j] of all) if (f(i) !== f(j)) (p[f(i)] = f(j)), (total += d);
    expect(t.length).toBeCloseTo(total, 9);
  });
});

describe("Steiner heuristic", () => {
  it("finds the Fermat point of an equilateral triangle (its centre)", () => {
    const s = fermat([0, 0], [1, 0], [0.5, Math.sqrt(3) / 2]);
    expect(s[0]).toBeCloseTo(0.5, 6);
    expect(s[1]).toBeCloseTo(Math.sqrt(3) / 6, 6);
  });

  it("reaches the optimum on an equilateral triangle: √3 against the MST's 2", () => {
    const t = steiner([
      [0, 0],
      [1, 0],
      [0.5, Math.sqrt(3) / 2],
    ]);
    expect(t.length).toBeCloseTo(Math.sqrt(3), 6);
  });

  it("reaches the optimum on a unit square: 1 + √3 against the MST's 3", () => {
    const t = steiner([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    expect(t.length).toBeCloseTo(1 + Math.sqrt(3), 4);
  });

  it("is never longer than the MST, and stays connected", () => {
    let seed = 3;
    const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let trial = 0; trial < 20; trial += 1) {
      const pts: Pt[] = Array.from({ length: 12 + trial }, () => [rnd() * 100, rnd() * 60]);
      const m = mst(pts);
      const s = steiner(pts);
      expect(s.length).toBeLessThanOrEqual(m.length + 1e-9);
      // Steiner ratio bound (Gilbert–Pollak): never below √3/2 of the MST
      expect(s.length / m.length).toBeGreaterThan(Math.sqrt(3) / 2 - 1e-9);
      const d = meanPairDistance(s.pts.length, treeEdges(s), pts.map((_, i) => i));
      expect(Number.isFinite(d)).toBe(true);
    }
  });
});

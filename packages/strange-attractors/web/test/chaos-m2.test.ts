// Chaos v2 M2 — the f64 side of Road to Chaos, Lorenz's Map and Slice.
import { describe, expect, it } from "vitest";
import { Bifurcation, Y0, Y1, bifStart } from "../src/v2/model/bifurcation.js";
import { CLASSIC } from "../src/v2/model/lorenz.js";
import { tvDistance } from "../src/v2/model/measure.js";
import { coarsen, columnHist, hist2d, observeBoxes, peakOf, peaksF64, returnMap, sectionF64 } from "../src/v2/model/observe-f64.js";

describe("peaks", () => {
  it("the parabola through three samples finds the vertex", () => {
    // z = 5 − (t − 0.3)² sampled at t = −1, 0, 1
    const z = (t: number): number => 5 - (t - 0.3) ** 2;
    expect(peakOf(z(-1), z(0), z(1))).toBeCloseTo(5, 12);
    expect(peakOf(1, 2, 2)).toBeCloseTo(2.125, 12);
  });

  it("classic peaks span z ≈ 30–47 and come about 1.3 per time unit", () => {
    const pk = peaksF64(CLASSIC, [1, 1, 1], 3000, 100_000);
    expect(pk.length / 1000).toBeGreaterThan(1.2);
    expect(pk.length / 1000).toBeLessThan(1.45);
    expect(Math.min(...pk)).toBeGreaterThan(29);
    expect(Math.max(...pk)).toBeLessThan(48.5);
  });

  it("Lorenz's map is steeper than the diagonal everywhere (the claim in Learn and the panel)", () => {
    const pairs = returnMap(peaksF64(CLASSIC, [1, 1, 1], 3000, 400_000));
    // the map has two branches meeting at the cusp: bin each by z_n, average z_{n+1}, take slopes
    const cusp = pairs.reduce((m, p) => (p[1] > m[1] ? p : m), pairs[0]!)[0];
    const lo = Math.min(...pairs.map((p) => p[0]));
    const hi = Math.max(...pairs.map((p) => p[0]));
    for (const [a, b] of [
      [lo, cusp],
      [cusp, hi],
    ] as const) {
      const nb = 12;
      const sum = new Float64Array(nb);
      const cnt = new Float64Array(nb);
      for (const [x, y] of pairs) {
        if (x < a || x >= b) continue;
        const k = Math.min(nb - 1, Math.floor(((x - a) / (b - a)) * nb));
        sum[k] += y;
        cnt[k] += 1;
      }
      const w = (b - a) / nb;
      // inner bins only (the cusp's own bin is vertical; the outer edge is sparse)
      for (let k = 1; k + 2 < nb; k += 1) {
        if (cnt[k]! < 20 || cnt[k + 1]! < 20) continue;
        const slope = (sum[k + 1]! / cnt[k + 1]! - sum[k]! / cnt[k]!) / w;
        expect(Math.abs(slope)).toBeGreaterThan(1);
      }
    }
  });
});

describe("the section and the boxes", () => {
  it("upward crossings of z = ρ − 1 lie on the plane's two lines, inside the box", () => {
    const box = observeBoxes(CLASSIC)!;
    expect(box.plane).toBe(27);
    expect(box.mapLo).toBeLessThan(30.2);
    expect(box.mapHi).toBeGreaterThan(47.1);
    const c = sectionF64(CLASSIC, box.plane, [1, 1, 1], 2000, 200_000);
    expect(c.length).toBeGreaterThan(1000);
    const [x0, x1, y0, y1] = box.box;
    const inside = c.filter(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1).length;
    expect(inside / c.length).toBeGreaterThan(0.995);
    // each wing crosses as a nearly straight line through C±: x and y have one sign together
    const sameSign = c.filter(([x, y]) => x * y > 0).length;
    expect(sameSign / c.length).toBeGreaterThan(0.95);
  });

  it("the section box holds the cut at every height the Slice tool reaches, mirror orbits too", () => {
    // a long run from another start, cut every ρ/10 over the slider's range (0.15ρ … 1.75ρ)
    for (const rho of [28, 100.5]) {
      const p = { ...CLASSIC, rho };
      const [x0, x1, y0, y1] = observeBoxes(p)!.box;
      expect(x0).toBe(-x1);
      expect(y0).toBe(-y1);
      let total = 0;
      for (let h = 0.15 * rho; h <= 1.75 * rho; h += rho / 10) {
        const c = sectionF64(p, h, [-7, 3, rho + 2], 2000, 150_000);
        total += c.length;
        const out = c.filter(([x, y]) => x < x0 || x > x1 || y < y0 || y > y1).length;
        expect(out).toBe(0);
      }
      expect(total).toBeGreaterThan(5000);
    }
  });

  it("a motion settling on a fixed point has no boxes", () => {
    expect(observeBoxes({ ...CLASSIC, rho: 15 })).toBeNull();
  });
});

describe("histograms", () => {
  it("hist2d normalises, counts outside, and coarsens without losing mass", () => {
    const pts: [number, number][] = [
      [0.1, 0.1],
      [0.9, 0.9],
      [2, 2],
    ];
    const h = hist2d(pts, 0, 1, 0, 1, 8);
    expect(h.outside).toBeCloseTo(1 / 3, 12);
    const c = coarsen(h, 8, 4);
    expect(c.p.length).toBe(4);
    expect(c.p.reduce((a, b) => a + b, 0)).toBeCloseTo(2 / 3, 12);
    expect(tvDistance(h, h)).toBe(0);
  });

  it("a column histogram bins z / ρ over [Y0, Y1)", () => {
    const h = columnHist([28 * 1.3, 28 * 1.3, 28 * 2], 28, Y0, Y1, 10);
    expect(h.outside).toBeCloseTo(1 / 3, 12);
    expect(h.p[Math.floor(((1.3 - Y0) / (Y1 - Y0)) * 10)]).toBeCloseTo(2 / 3, 12);
  });
});

describe("bifurcation columns", () => {
  it("column ρ values are the column centres", () => {
    expect(Bifurcation.rhoOf(0, 4, 20, 60)).toBe(25);
    expect(Bifurcation.rhoOf(3, 4, 20, 60)).toBe(55);
  });

  it("starts are near the attractor's scale, deterministic per (seed, i)", () => {
    const a = bifStart(1, 5, 28, CLASSIC.beta);
    expect(bifStart(1, 5, 28, CLASSIC.beta)).toEqual(a);
    expect(bifStart(2, 5, 28, CLASSIC.beta)).not.toEqual(a);
    const s = Math.sqrt(CLASSIC.beta * 27);
    expect(Math.abs(a[0])).toBeLessThanOrEqual(s + 1e-6);
    expect(a[2]).toBeGreaterThan(27 * 0.7 - 1e-6);
    expect(a[2]).toBeLessThan(27 * 1.3 + 1e-6);
  });
});

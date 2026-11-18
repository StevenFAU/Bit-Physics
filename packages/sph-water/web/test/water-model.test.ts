// Water in Hand v2 — the pure model code (packages/sph-water/web/src/v2/model)
// and the renderer's glass mesh. GPU work is exercised in the browser by
// v2-acceptance.mjs and the release gate.
import { describe, expect, it } from "vitest";
import { hydrostaticFit } from "../src/v2/model/measure.js";
import {
  BLOB_RADIUS,
  FILL,
  GLASS,
  H_PER_SPACING,
  RHO0,
  blobPositions,
  directorSpot,
  fluidVolume,
  highest,
  latticeSum,
  recipeFor,
  restingLevel,
  seedPositions,
} from "../src/v2/model/water.js";
import { glassMesh } from "../src/v2/render/water-view.js";

describe("the live recipe", () => {
  it("an interior lattice at h = 1.2 s sums to 1.00081 ρ₀ (the measured 1000.8 kg/m³), so the mass is ρ₀ s³ / that", () => {
    const sum = latticeSum(H_PER_SPACING);
    expect(sum).toBeCloseTo(1.0008095483584356, 12);
    // v1's × 1.07 would start the interior 7 % compressed
    expect(1.07 * sum).toBeGreaterThan(1.07);
    const r = recipeFor(80_000);
    expect(r.mass * sum).toBeCloseTo(RHO0 * r.spacing ** 3, 12);
  });

  it("h = 1.2 spacing, dt = 0.4 h / 5, speed cap 0.315 · 2h / dt; spacing from the scene's volume", () => {
    for (const n of [30_000, 80_000, 200_000]) {
      const r = recipeFor(n);
      expect(r.spacing ** 3 * n).toBeCloseTo(fluidVolume(), 9);
      expect(r.h).toBeCloseTo(1.2 * r.spacing, 12);
      expect(r.dt).toBeCloseTo((0.4 * r.h) / 5, 12);
      expect(r.vmax).toBeCloseTo((0.315 * 2 * r.h) / r.dt, 9);
    }
    // finer water takes shorter steps: dt ∝ n^(-1/3)
    expect(recipeFor(30_000).dt / recipeFor(240_000).dt).toBeCloseTo(2, 9);
  });
});

describe("seeding", () => {
  it("fills the glass inside its wall and floor, and a blob of the declared radius", () => {
    const r = recipeFor(30_000);
    const { fill, blob } = seedPositions(r.spacing, FILL, [0.05, 0.8, -0.02]);
    for (let i = 0; i < fill.length; i += 3) {
      expect(Math.hypot(fill[i]!, fill[i + 2]!)).toBeLessThan(GLASS.radius);
      expect(fill[i + 1]!).toBeGreaterThan(GLASS.floor);
      expect(fill[i + 1]!).toBeLessThan(GLASS.floor + FILL);
    }
    for (let i = 0; i < blob.length; i += 3) expect(Math.hypot(blob[i]! - 0.05, blob[i + 1]! - 0.8, blob[i + 2]! + 0.02)).toBeLessThanOrEqual(BLOB_RADIUS + 1e-9);
    // the fill plus one blob is about the budget
    const n = (fill.length + blob.length) / 3;
    expect(n / 30_000).toBeGreaterThan(0.9);
    expect(n / 30_000).toBeLessThan(1.05);
    expect(blobPositions(r.spacing, [0, 0, 0]).length).toBe(blob.length);
  });

  it("the resting level counts the blob merged in", () => {
    expect(restingLevel()).toBeCloseTo(GLASS.floor + FILL + ((4 / 3) * BLOB_RADIUS ** 3) / GLASS.radius ** 2, 12);
  });

  it("the director drops inside the glass, clear of the wall, the same spots for the same seed", () => {
    for (let k = 0; k < 200; k += 1) {
      const [x, z] = directorSpot(7, k);
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(GLASS.radius - BLOB_RADIUS);
    }
    expect(directorSpot(7, 3)).toEqual(directorSpot(7, 3));
    expect(directorSpot(7, 3)).not.toEqual(directorSpot(8, 3));
  });
});

describe("a drop's particles", () => {
  it("are the highest, ties taken by lower index, returned in index order", () => {
    // xyzw: y values 1, 5, 5, 3, 5, 2
    const ys = [1, 5, 5, 3, 5, 2];
    const p = new Float32Array(ys.flatMap((y) => [0, y, 0, 0]));
    expect(Array.from(highest(p, 6, 2))).toEqual([1, 2]);
    expect(Array.from(highest(p, 6, 4))).toEqual([1, 2, 3, 4]);
    expect(Array.from(highest(p, 6, 9))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(highest(p, 6, 0).length).toBe(0);
  });
});

describe("hydrostatics", () => {
  it("recovers ρ₀ g from pressures that grow linearly with depth", () => {
    const n = 4000;
    const pos = new Float32Array(n * 4);
    const aux = new Float32Array(n * 4);
    const kt = new Float32Array(n);
    const level = 0.45;
    for (let i = 0; i < n; i += 1) {
      const y = 0.06 + (0.38 * i) / n;
      pos.set([0.01 * Math.sin(i), y, 0.01 * Math.cos(i), 0], i * 4);
      aux.set([1000, 0, 56, 0], i * 4);
      kt[i] = (10 * (1000 * 9.81 * (level - y) + 12)) / 1000; // p = ρ Σκ / steps, over 10 steps
    }
    const f = hydrostaticFit({ pos, aux, kappaSum: kt }, n, { level, rho0: 1000, g: 9.81, minNeighbours: 45, wallRadius: 0.3, floor: 0.05, margin: 0.02, steps: 10 });
    expect(f.ratio).toBeCloseTo(1, 4);
    expect(f.intercept).toBeCloseTo(12, 1);
    expect(f.r2).toBeGreaterThan(0.999999);
    expect(f.binnedR2).toBeGreaterThan(0.999999);
    expect(f.bins.length).toBeGreaterThan(8);
    // particles without a full neighbourhood are left out
    for (let i = 2000; i < 2100; i += 1) aux[i * 4 + 2] = 10;
    expect(hydrostaticFit({ pos, aux, kappaSum: kt }, n, { level, rho0: 1000, g: 9.81, minNeighbours: 45, wallRadius: 0.3, floor: 0.05, margin: 0.02, steps: 10 }).count).toBeLessThan(f.count);
  });
});

describe("the glass", () => {
  it("a closed shell of triangles: walls, rim and the inner floor", () => {
    const m = glassMesh({ inner: 0.3, outer: 0.32, floor: 0.05, height: 0.95 }, 32);
    expect(m.length % (7 * 3)).toBe(0);
    // 3 quads (6 vertices each) + 1 floor triangle per segment
    expect(m.length / 7).toBe(32 * (3 * 6 + 3));
    for (let v = 0; v < m.length; v += 7) {
      const r = Math.hypot(m[v]!, m[v + 2]!);
      expect(r).toBeLessThanOrEqual(0.32 + 1e-6);
      expect(Math.hypot(m[v + 3]!, m[v + 4]!, m[v + 5]!)).toBeCloseTo(1, 6);
    }
  });
});

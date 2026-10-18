// "On a Shape": the finite-volume Laplace–Beltrami operator on the geodesic
// sphere and the torus (src/v2/model/surface-mesh.ts) against closed forms.

import { describe, expect, it } from "vitest";
import type { SurfaceMesh } from "../src/v2/model/surface-mesh.js";
import { MAX_NBR, TORUS_R, TORUS_r, applyLaplacian, icosphere, torus } from "../src/v2/model/surface-mesh.js";

const field = (m: SurfaceMesh, fn: (x: number, y: number, z: number) => number): Float64Array =>
  Float64Array.from({ length: m.cells }, (_, c) => fn(m.pos[c * 4]!, m.pos[c * 4 + 1]!, m.pos[c * 4 + 2]!));

/** Area-weighted relative L2 error. */
function relL2(m: SurfaceMesh, got: Float64Array, want: Float64Array): number {
  let num = 0;
  let den = 0;
  for (let c = 0; c < m.cells; c += 1) {
    num += m.area[c]! * (got[c]! - want[c]!) ** 2;
    den += m.area[c]! * want[c]! ** 2;
  }
  return Math.sqrt(num / den);
}

/** |Σ A Δf| relative to Σ A |Δf| — zero up to the f32 weights' rounding. */
function imbalance(m: SurfaceMesh, f: Float64Array): number {
  const L = applyLaplacian(m, f);
  let s = 0;
  let sc = 0;
  for (let c = 0; c < m.cells; c += 1) {
    s += m.area[c]! * L[c]!;
    sc += m.area[c]! * Math.abs(L[c]!);
  }
  return Math.abs(s) / sc;
}

describe("geodesic sphere", () => {
  it("has 10n² + 2 cells: 12 pentagons, the rest hexagons, neighbours symmetric", () => {
    const m = icosphere(12, 1);
    expect(m.cells).toBe(10 * 144 + 2);
    let five = 0;
    for (let c = 0; c < m.cells; c += 1) {
      const deg = m.nbr[c * 8 + 6]!;
      expect(deg === 5 || deg === 6).toBe(true);
      if (deg === 5) five += 1;
      for (let q = 0; q < deg; q += 1) {
        const k = m.nbr[c * 8 + q]!;
        expect(k).not.toBe(c);
        expect(Array.from({ length: MAX_NBR }, (_, e) => m.nbr[k * 8 + e]).includes(c)).toBe(true);
      }
    }
    expect(five).toBe(12);
  });

  it("is conservative, and the cell areas tile the sphere", () => {
    const m = icosphere(24, 1);
    expect(imbalance(m, field(m, (x, y, z) => Math.sin(3 * x) + y * y * z + Math.cos(5 * z)))).toBeLessThan(1e-6);
    const total = m.area.reduce((a, b) => a + b, 0);
    expect(total / (4 * Math.PI * m.scale * m.scale)).toBeGreaterThan(0.99);
    expect(total / (4 * Math.PI * m.scale * m.scale)).toBeLessThan(1);
  });

  it("degree-1 and degree-2 harmonics are eigenfunctions with −l(l+1)/R², converging with refinement", () => {
    const errs = [16, 32].map((n) => {
      const m = icosphere(n, 1);
      const R2 = m.scale * m.scale;
      const f1 = field(m, (_x, _y, z) => z);
      const f2 = field(m, (x, y) => x * y);
      return Math.max(
        relL2(m, applyLaplacian(m, f1), f1.map((v) => (-2 / R2) * v)),
        relL2(m, applyLaplacian(m, f2), f2.map((v) => (-6 / R2) * v)),
      );
    });
    expect(errs[0]!).toBeLessThan(0.02);
    expect(errs[1]!).toBeLessThan(errs[0]! * 0.6);
  });

  it("picks the cell under a ray, and misses beside the sphere", () => {
    const m = icosphere(32, 1);
    const c = m.pick([0, 0, 5], [0, 0, -1]);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(m.pos[c * 4 + 2]!).toBeGreaterThan(0.99);
    expect(m.pick([0, 3, 5], [0, 0, -1])).toBe(-1);
  });
});

describe("torus", () => {
  const exact = (m: SurfaceMesh): Float64Array =>
    field(m, (x, _y, z) => -Math.cos(Math.atan2(z, x)) / (Math.hypot(x, z) * m.scale) ** 2);

  it("cos θ: Δf = −cos θ / (R + r cos φ)², second-order convergent", () => {
    const errs = [48, 96].map((n) => {
      const m = torus(n, 1);
      const f = field(m, (x, _y, z) => Math.cos(Math.atan2(z, x)));
      return relL2(m, applyLaplacian(m, f), exact(m));
    });
    expect(errs[0]!).toBeLessThan(0.01);
    expect(errs[1]! / errs[0]!).toBeLessThan(0.35);
  });

  it("is conservative, and areas add up to 4π² R r", () => {
    const m = torus(40, 1);
    expect(imbalance(m, field(m, (x, y, z) => Math.sin(2 * x) * Math.cos(3 * y) + z))).toBeLessThan(1e-6);
    const total = m.area.reduce((a, b) => a + b, 0);
    expect(total / (4 * Math.PI ** 2 * TORUS_R * TORUS_r * m.scale ** 2)).toBeCloseTo(1, 10);
  });

  it("orders neighbours counter-clockwise about the outward normal", () => {
    const m = torus(32, 1);
    for (const c of [0, 100, 777]) {
      const p = [0, 1, 2].map((i) => m.pos[c * 4 + i]!);
      const n = [0, 1, 2].map((i) => m.nrm[c * 4 + i]!);
      const d = (q: number): number[] => [0, 1, 2].map((i) => m.pos[m.nbr[c * 8 + q]! * 4 + i]! - p[i]!);
      const [a, b] = [d(0), d(1)];
      const cr = [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
      expect(cr[0]! * n[0]! + cr[1]! * n[1]! + cr[2]! * n[2]!).toBeGreaterThan(0);
    }
  });

  it("picks the outer equator and misses the hole", () => {
    const m = torus(48, 1);
    const c = m.pick([0, 0, 5], [0, 0, -1]);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(m.pos[c * 4 + 2]!).toBeGreaterThan(TORUS_R + TORUS_r * 0.95);
    expect(m.pick([0, 5, 0], [0, -1, 0])).toBe(-1);
  });
});

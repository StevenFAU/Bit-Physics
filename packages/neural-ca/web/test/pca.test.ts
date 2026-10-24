import { describe, expect, it } from "vitest";
import { HIDDEN, HIDDEN0, hiddenBasis, jacobiEigen } from "../src/v2/model/pca.js";

describe("jacobiEigen", () => {
  it("diagonalises a symmetric matrix: A = V Λ Vᵀ", () => {
    const n = 5;
    const a = new Float64Array(n * n);
    for (let i = 0; i < n; i += 1) for (let j = i; j < n; j += 1) a[i * n + j] = a[j * n + i] = Math.sin(i * 3 + j * 7) + (i === j ? 3 : 0);
    const { values, vectors } = jacobiEigen(a, n);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        let s = 0;
        for (let k = 0; k < n; k += 1) s += vectors[i * n + k]! * values[k]! * vectors[j * n + k]!;
        expect(s).toBeCloseTo(a[i * n + j]!, 9);
      }
    }
  });
});

describe("hiddenBasis", () => {
  const CN = 16;
  const cells = 400;
  /** Living cells whose hidden channels vary along `dir` (plus a weaker second direction). */
  function state(dir: number[], dir2: number[]): Float32Array {
    const s = new Float32Array(cells * CN);
    for (let c = 0; c < cells; c += 1) {
      s[c * CN + 3] = c % 10 === 0 ? 0.05 : 0.9; // every tenth cell is dead and must be ignored
      const t = Math.sin(c * 1.7) * 2;
      const u = Math.cos(c * 2.3) * 0.5;
      for (let k = 0; k < HIDDEN; k += 1) s[c * CN + HIDDEN0 + k] = 0.3 + t * dir[k]! + u * dir2[k]! + (c % 10 === 0 ? 50 : 0);
    }
    return s;
  }
  const unit = (v: number[]): number[] => {
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };

  it("finds the main direction of the living cells' hidden channels", () => {
    const d1 = unit([1, 2, 0, 0, -1, 0, 0, 3, 0, 0, 0, 1]);
    const d2 = unit([0, 0, 1, -1, 0, 0, 2, 0, -1.5, 0, 1, 0]);
    const b = hiddenBasis(state(d1, d2), cells, CN)!;
    expect(b.cells).toBe(360);
    let dot = 0;
    for (let k = 0; k < HIDDEN; k += 1) dot += b.axes[k]! * d1[k]!;
    expect(Math.abs(dot)).toBeGreaterThan(0.999);
    expect(b.explained[0]).toBeGreaterThan(0.85);
    // sign convention: the largest loading of each axis is positive
    for (let r = 0; r < 3; r += 1) {
      const row = Array.from(b.axes.subarray(r * HIDDEN, (r + 1) * HIDDEN));
      const big = row.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
      expect(big).toBeGreaterThan(0);
    }
    expect(b.mean[0]).toBeCloseTo(0.3, 1);
  });

  it("needs at least 16 living cells", () => {
    const s = new Float32Array(10 * CN);
    for (let c = 0; c < 10; c += 1) s[c * CN + 3] = 1;
    expect(hiddenBasis(s, 10, CN)).toBeNull();
  });
});

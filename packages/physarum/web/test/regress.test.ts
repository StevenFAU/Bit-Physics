import { describe, expect, it } from "vitest";
import { bandOf, degreeHistogram, describeDish } from "../src/v2/model/regress.js";

/** A w × h field of tubes: 0 everywhere, 4 on cells within `r` of any of the segments. */
function tubes(w: number, h: number, segs: [number, number, number, number][], r = 2): Float32Array {
  const f = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      for (const [x0, y0, x1, y1] of segs) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
        if ((x - x0 - t * dx) ** 2 + (y - y0 - t * dy) ** 2 <= r * r) f[y * w + x] = 4;
      }
    }
  }
  return f;
}

describe("degree histogram", () => {
  const per = (n: number, w: number, h: number): number => (n * 1e5) / (w * h);
  it("reads a Y as one three-way junction and three loose ends", () => {
    const w = 200;
    const h = 200;
    const d = degreeHistogram(tubes(w, h, [[100, 100, 100, 30], [100, 100, 40, 160], [100, 100, 160, 160]]), w, h);
    expect(d.y3).toBeCloseTo(per(1, w, h));
    expect(d.ends).toBeCloseTo(per(3, w, h));
    expect(d.x4).toBe(0);
  });
  it("reads a cross as one four-way junction (its thinning's tiny links contracted)", () => {
    const w = 200;
    const h = 200;
    const d = degreeHistogram(tubes(w, h, [[30, 100, 170, 100], [100, 30, 100, 170]]), w, h);
    expect(d.x4 + d.y3 / 2).toBeCloseTo(per(1, w, h));
    expect(d.ends).toBeCloseTo(per(4, w, h));
  });
  it("finds no junctions or ends on a ring", () => {
    const w = 200;
    const h = 200;
    const segs: [number, number, number, number][] = [];
    for (let k = 0; k < 24; k += 1) {
      const a = (k / 24) * Math.PI * 2;
      const b = ((k + 1) / 24) * Math.PI * 2;
      segs.push([100 + 60 * Math.cos(a), 100 + 60 * Math.sin(a), 100 + 60 * Math.cos(b), 100 + 60 * Math.sin(b)]);
    }
    const d = degreeHistogram(tubes(w, h, segs), w, h);
    expect(d.ends + d.y3 + d.x4).toBe(0);
  });
});

describe("dish descriptors", () => {
  it("sums colony planes before describing", () => {
    const w = 120;
    const h = 120;
    const a = tubes(w, h, [[10, 60, 110, 60]]);
    const b = tubes(w, h, [[60, 10, 60, 110]]);
    const two = new Float32Array(2 * w * h);
    two.set(a, 0);
    two.set(b, w * h);
    const sum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i += 1) sum[i] = a[i]! + b[i]!;
    expect(describeDish(two, w, h, 2, 1, null)).toEqual(describeDish(sum, w, h, 1, 1, null));
  });
});

describe("bands", () => {
  it("is mean ± 5 SD when the seeds spread more than the floor", () => {
    const b = bandOf("length", [10, 11, 12, 13, 14], 1e6);
    expect(b.mean).toBe(12);
    expect(b.hi - b.mean).toBeCloseTo(5 * Math.sqrt(2.5));
  });
  it("never collapses when the seeds agree: fractions keep ±0.02, feature densities two counting sigmas", () => {
    expect(bandOf("cover", [0.3, 0.3, 0.3], 1e6).hi).toBeCloseTo(0.32);
    // 100 features on 1e6 cells = 10 per 1e5; 2√100 = 20 features = 2 per 1e5
    expect(bandOf("meshes", [10, 10, 10], 1e6).hi).toBeCloseTo(12);
  });
});

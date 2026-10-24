import { describe, expect, it } from "vitest";
import { extractNetwork, scoreNetwork } from "../src/v2/model/graph.js";
import type { Spot } from "../src/v2/model/sim.js";

/** A field with thick tubes (value 5 × the mean) along segments, 0 elsewhere. */
function tubes(w: number, h: number, segs: [number, number, number, number][], width = 3): Float32Array {
  const f = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      for (const [x0, y0, x1, y1] of segs) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
        if (Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= width) f[y * w + x] = 5;
      }
    }
  }
  return f;
}

const spot = (x: number, y: number): Spot => ({ x, y, r: 4 });

describe("network extraction", () => {
  it("finds a Y: three crumbs, one junction, three links, every link a cut", () => {
    const w = 200;
    const h = 200;
    const c: [number, number] = [100, 100];
    const ends: [number, number][] = [
      [100, 20],
      [30, 160],
      [170, 160],
    ];
    const f = tubes(w, h, ends.map(([x, y]) => [c[0], c[1], x, y]));
    const g = extractNetwork(f, w, h, ends.map(([x, y]) => spot(x, y)));
    const s = scoreNetwork(g);
    expect(s.reached).toBe(3);
    expect(s.links).toBe(3);
    expect(s.cutLinks).toBe(3);
    const junctions = g.nodes.filter((n, i) => n.food < 0 && g.links.some((l) => l.a === i || l.b === i));
    expect(junctions).toHaveLength(1);
    expect(Math.hypot(junctions[0]!.x - 100, junctions[0]!.y - 100)).toBeLessThan(5);
    // length along the tubes vs the true 80 + 2·√(70² + 60²) from the junction to the crumbs' centres
    const truth = 80 + 2 * Math.hypot(70, 60);
    expect(Math.abs(s.length - truth) / truth).toBeLessThan(0.03);
  });

  it("finds a triangle loop: no single link cuts a crumb off", () => {
    const w = 220;
    const h = 200;
    const p: [number, number][] = [
      [40, 40],
      [180, 40],
      [110, 170],
    ];
    const f = tubes(w, h, [
      [...p[0]!, ...p[1]!],
      [...p[1]!, ...p[2]!],
      [...p[2]!, ...p[0]!],
    ]);
    const s = scoreNetwork(extractNetwork(f, w, h, p.map(([x, y]) => spot(x, y))));
    expect(s.reached).toBe(3);
    expect(s.links).toBe(3);
    expect(s.cutLinks).toBe(0);
    const perimeter = Math.hypot(140, 0) + 2 * Math.hypot(70, 130);
    expect(Math.abs(s.length - perimeter) / perimeter).toBeLessThan(0.03);
    // mean of the three pairwise shortest routes = the three sides
    expect(Math.abs(s.meanDistance - perimeter / 3) / (perimeter / 3)).toBeLessThan(0.03);
  });

  it("drops a dead-end spur and reports a crumb nothing reaches", () => {
    const w = 200;
    const h = 120;
    const f = tubes(w, h, [
      [30, 60, 170, 60],
      [100, 60, 100, 15],
    ]);
    const g = extractNetwork(f, w, h, [spot(30, 60), spot(170, 60), spot(100, 105)]);
    const s = scoreNetwork(g);
    expect(s.reached).toBe(2);
    expect(s.food).toBe(3);
    expect(s.links).toBe(1);
    expect(Number.isFinite(s.meanDistance)).toBe(false);
  });

  it("works on a block-averaged field (step 2)", () => {
    const w = 240;
    const h = 200;
    const p: [number, number][] = [
      [40, 40],
      [200, 40],
      [120, 170],
    ];
    const f = tubes(
      w,
      h,
      [
        [...p[0]!, ...p[1]!],
        [...p[1]!, ...p[2]!],
        [...p[2]!, ...p[0]!],
      ],
      4,
    );
    const s = scoreNetwork(extractNetwork(f, w, h, p.map(([x, y]) => spot(x, y)), { threshold: 1, step: 2, foodMargin: 4, minLink: 12 }));
    expect(s.reached).toBe(3);
    expect(s.cutLinks).toBe(0);
  });
});

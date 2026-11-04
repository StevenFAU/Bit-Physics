// Chaos v2 — the pure model code (packages/strange-attractors/web/src/v2/model).
import { describe, expect, it } from "vitest";
import { ballPoint, memberAttr } from "../src/v2/model/ball.js";
import type { V3 } from "../src/v2/model/lorenz.js";
import {
  CLASSIC,
  DT,
  Reference,
  deviation,
  deviationStep,
  field,
  fixedPoints,
  pickOnAttractor,
  rk4Step,
  sampleAttractor,
  spreadOf,
  stretchDirection,
} from "../src/v2/model/lorenz.js";
import { pow10, sci } from "../src/v2/format.js";

const onAttractor = (): V3 => {
  let x: V3 = [1, 1, 1];
  for (let i = 0; i < 3000; i += 1) x = rk4Step(CLASSIC, x, DT).next;
  return x;
};

describe("lorenz (f64)", () => {
  it("the deviation field is f(s + e) − f(s) exactly (a quadratic field)", () => {
    const s: V3 = [3.2, -1.7, 22.4];
    for (const e of [
      [1e-3, -2e-3, 5e-4],
      [0.7, 2.1, -3.3],
      [-11, 4, 9],
    ] as V3[]) {
      const a = field(CLASSIC, [s[0] + e[0], s[1] + e[1], s[2] + e[2]]);
      const b = field(CLASSIC, s);
      const d = deviation(CLASSIC, s, e);
      for (let i = 0; i < 3; i += 1) expect(d[i]!).toBeCloseTo(a[i]! - b[i]!, 10);
    }
  });

  it("RK4 on offsets with the reference's stage points is RK4 on the full positions", () => {
    const x0 = onAttractor();
    const e0: V3 = [2e-3, -1e-3, 4e-3];
    let ref = x0;
    let e = e0;
    let full: V3 = [x0[0] + e0[0], x0[1] + e0[1], x0[2] + e0[2]];
    for (let i = 0; i < 500; i += 1) {
      const r = rk4Step(CLASSIC, ref, DT);
      e = deviationStep(CLASSIC, r.stages, e, DT);
      ref = r.next;
      full = rk4Step(CLASSIC, full, DT).next;
    }
    // the same trajectory: agreement limited only by f64 rounding (grown over 5 time units)
    for (let i = 0; i < 3; i += 1) expect(Math.abs(ref[i]! + e[i]! - full[i]!)).toBeLessThan(1e-9);
    expect(Math.hypot(...e)).toBeGreaterThan(1e-2); // it did stretch
  });

  it("a tiny offset keeps its relative precision where absolute coordinates cannot", () => {
    const x0 = onAttractor();
    const eps = 1e-12;
    let ref = x0;
    let e: V3 = [eps, 0, 0];
    for (let i = 0; i < 200; i += 1) {
      const r = rk4Step(CLASSIC, ref, DT);
      e = deviationStep(CLASSIC, r.stages, e, DT);
      ref = r.next;
    }
    // linearised growth: the offset is non-zero and of a sane size
    const n = Math.hypot(...e);
    expect(n).toBeGreaterThan(eps * 1e-2);
    expect(n).toBeLessThan(eps * 1e5);
  });

  it("absolute f32 coordinates near |x| = 20 hold a 10⁻⁶ ball on at most three values per axis", () => {
    const seen = new Set<number>();
    for (let i = 0; i <= 1000; i += 1) seen.add(Math.fround(20 + (i / 500 - 1) * 1e-6));
    expect(seen.size).toBeLessThanOrEqual(3);
  });

  it("fixed points are zeros of the field; C± only above ρ = 1", () => {
    for (const p of fixedPoints(CLASSIC)) {
      for (const v of field(CLASSIC, p)) expect(Math.abs(v)).toBeLessThan(1e-12);
    }
    expect(fixedPoints(CLASSIC)).toHaveLength(3);
    expect(fixedPoints({ ...CLASSIC, rho: 0.5 })).toHaveLength(1);
  });

  it("the Reference steps exactly like rk4Step and counts its steps", () => {
    const r = new Reference([1, 1, 1]);
    let x: V3 = [1, 1, 1];
    for (let i = 0; i < 10; i += 1) {
      r.step(CLASSIC, DT);
      x = rk4Step(CLASSIC, x, DT).next;
    }
    expect(r.x).toEqual(x);
    expect(r.steps).toBe(10);
  });

  it("the attractor sample has the classic Lorenz size and the picker finds it", () => {
    const pts = sampleAttractor(CLASSIC, 4000, 2, 1500);
    const sp = spreadOf(pts);
    // the attractor's centre sits near z = 23.5 and its RMS size near 12
    expect(sp.mean[2]).toBeGreaterThan(20);
    expect(sp.mean[2]).toBeLessThan(27);
    expect(sp.rms).toBeGreaterThan(9);
    expect(sp.rms).toBeLessThan(16);
    const target: V3 = [pts[300]!, pts[301]!, pts[302]!];
    const origin: V3 = [target[0], target[1] - 80, target[2]];
    const hit = pickOnAttractor(pts, origin, [0, 1, 0], 0.5);
    expect(hit).not.toBeNull();
    expect(Math.hypot(hit![0] - target[0], hit![2] - target[2])).toBeLessThan(0.5);
    expect(pickOnAttractor(pts, [500, 500, 500], [1, 0, 0], 0.5)).toBeNull();
  });

  it("the stretch direction is a unit vector, stable for the same start", () => {
    const x0 = onAttractor();
    const v = stretchDirection(CLASSIC, x0);
    expect(Math.hypot(...v)).toBeCloseTo(1, 9);
    expect(stretchDirection(CLASSIC, x0)).toEqual(v);
    expect(v[0] + v[1] + v[2]).toBeGreaterThanOrEqual(0);
  });
});

describe("ball (mirror of release.wgsl)", () => {
  it("member 0 is the centre; the rest are inside the unit ball and uniform-ish", () => {
    expect(ballPoint(1, 0)).toEqual([0, 0, 0]);
    let r2 = 0;
    const n = 4000;
    for (let i = 1; i <= n; i += 1) {
      const u = ballPoint(1, i);
      const d = u[0] * u[0] + u[1] * u[1] + u[2] * u[2];
      expect(d).toBeLessThanOrEqual(1);
      r2 += d;
    }
    // E|u|² = 3/5 for a uniform unit ball
    expect(r2 / n).toBeCloseTo(0.6, 1);
    expect(memberAttr(1, 0, [1, 0, 0])).toBe(0.5);
    const a = memberAttr(1, 7, [0, 0, 1]);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });
});

describe("format", () => {
  it("writes powers of ten with superscripts", () => {
    expect(pow10(-6)).toBe("10⁻⁶");
    expect(pow10(12)).toBe("10¹²");
    expect(sci(1e-6)).toBe("1 × 10⁻⁶");
    expect(sci(3.14e-5)).toBe("3.1 × 10⁻⁵");
    expect(sci(0)).toBe("0");
  });
});

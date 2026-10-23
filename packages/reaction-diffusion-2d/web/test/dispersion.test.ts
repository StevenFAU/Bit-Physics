// The analytic Turing check's TypeScript side (src/v2/model/dispersion.ts)
// against the committed f64 prediction (public/goldens/turing-brusselator-256sq.json,
// written by reaction_diffusion_2d/reference/goldens.py), the textbook closed
// forms, and the measurement estimator on a synthetic spectrum.

import { describe, expect, it } from "vitest";
import {
  brusselatorClosedForms,
  brusselatorJacobian,
  fastestGrowingContinuum,
  fastestGrowingDiscrete,
  growthContinuum,
  growthPeak,
  wavenumberToRing,
} from "../src/v2/model/dispersion.js";
import { MODELS } from "../src/v2/model/models.js";
import Turing from "../public/goldens/turing-brusselator-256sq.json";

const T = Turing as {
  grid: number[];
  params: { F: number; k: number; Du: number; Dv: number; dx: number; dt: number };
  prediction: Record<string, number>;
};

describe("Brusselator dispersion relation", () => {
  const { F: A, k: B, Du, Dv, dx, dt } = T.params;
  const J = brusselatorJacobian(A, B);

  it("the check runs at the Brusselator scene's own parameters", () => {
    const m = MODELS.brusselator;
    expect([m.p[0], m.p[1], m.Du, m.Dv, m.dx, m.dt]).toEqual([A, B, Du, Dv, dx, dt]);
  });

  it("at the onset B_c the growth rate peaks at zero, at q_c", () => {
    const cf = brusselatorClosedForms(A, Du, Dv);
    const at = fastestGrowingContinuum(brusselatorJacobian(A, cf.Bc), Du, Dv);
    expect(at.sigma).toBeCloseTo(0, 9);
    expect(at.Q).toBeCloseTo(cf.qc2, 5);
    // the uniform state's own (q = 0) stability is lost at the Hopf line B_H
    expect(growthContinuum(brusselatorJacobian(A, cf.BH - 1e-9), Du, Dv, 0)).toBeLessThan(0);
    expect(growthContinuum(brusselatorJacobian(A, cf.BH + 1e-9), Du, Dv, 0)).toBeGreaterThan(0);
  });

  it("matches the committed f64 prediction (continuum and discrete scheme)", () => {
    const c = fastestGrowingContinuum(J, Du, Dv);
    expect(Math.sqrt(c.Q)).toBeCloseTo(T.prediction.q_star_continuum!, 8);
    expect(wavenumberToRing(Math.sqrt(c.Q), dx, T.grid[0])).toBeCloseTo(T.prediction.r_star_continuum!, 6);
    const d = fastestGrowingDiscrete(J, Du, Dv, dx, dt, T.grid[0]);
    expect(Math.abs(d.r - T.prediction.r_star!) / T.prediction.r_star!).toBeLessThan(1e-8);
    expect(d.sigma).toBeCloseTo(T.prediction.sigma_star!, 9);
  });
});

describe("growth-rate peak estimator", () => {
  it("recovers the peak of a smooth growth curve to well under a ring", () => {
    const n = 128;
    const truth = 29.37;
    const p1 = new Float64Array(n).fill(1);
    const p2 = new Float64Array(n);
    for (let r = 0; r < n; r += 1) p2[r] = Math.exp(2 * 1.25 * (1.6 - 0.004 * (r - truth) ** 2));
    const { r } = growthPeak(p1, p2, 1, 1.25, 4, 3);
    expect(r).toBeCloseTo(truth, 9);
  });

  it("ignores rings below rMin", () => {
    const p1 = new Float64Array(64).fill(1);
    const p2 = new Float64Array(64).fill(1);
    p2[2] = 1e9;
    p2[20] = 50;
    p2[19] = 30;
    p2[21] = 30;
    expect(growthPeak(p1, p2, 10, 0.1, 4, 2).r).toBeCloseTo(20, 6);
  });
});

// Chaos v2 M1 — Lyapunov spectrum, invariant-measure histograms, the
// digits line fit, and the Prove budgets against tolerance.toml.
import { describe, expect, it } from "vitest";
import tolerance from "../../../../tools/testkit/equivalence/tolerance.toml?raw";
import { fitLine } from "../src/v2/digits-panel.js";
import { CLASSIC } from "../src/v2/model/lorenz.js";
import { LyapunovEstimator, kaplanYorke, lyapunovSpectrum, traceOf } from "../src/v2/model/lyapunov.js";
import { CLASSIC_BOX, histogramXZ, referenceRun, tvDistance } from "../src/v2/model/measure.js";
import { BUDGET, LYAP_T, SPROTT } from "../src/v2/proof/budgets.js";

describe("Lyapunov spectrum (f64)", () => {
  const e = lyapunovSpectrum(CLASSIC, 1000);

  it("the spectrum sums to the Jacobian's trace −(σ + 1 + β), up to RK4's volume error", () => {
    const sum = e.lambdas[0] + e.lambdas[1] + e.lambdas[2];
    const rel = Math.abs(sum - traceOf(CLASSIC)) / Math.abs(traceOf(CLASSIC));
    expect(traceOf(CLASSIC)).toBeCloseTo(-41 / 3, 12);
    expect(rel).toBeLessThan(BUDGET.sumRel);
    expect(rel).toBeGreaterThan(1e-7); // the residual is real (RK4's), not rounding
  });

  it("the residual is RK4's: it falls ~16× when Δt halves", () => {
    const res = (dt: number): number => {
      const est = new LyapunovEstimator(CLASSIC, [1, 1, 1], dt, 10, 20, 50);
      est.step(Math.round(220 / dt));
      const l = est.estimate().lambdas;
      return Math.abs(l[0] + l[1] + l[2] - traceOf(CLASSIC));
    };
    const ratio = res(0.01) / res(0.005);
    expect(ratio).toBeGreaterThan(12);
    expect(ratio).toBeLessThan(20);
  });

  it("λ₁ is near Sprott's 0.9056, λ₂ near 0, ordered, Kaplan–Yorke near 2.06", () => {
    expect(Math.abs(e.lambdas[0] - SPROTT.l1)).toBeLessThan(0.03);
    expect(Math.abs(e.lambdas[1])).toBeLessThan(0.006);
    expect(e.lambdas[0]).toBeGreaterThan(e.lambdas[1]);
    expect(e.lambdas[1]).toBeGreaterThan(e.lambdas[2]);
    expect(kaplanYorke(e.lambdas)).toBeCloseTo(SPROTT.ky, 2);
    expect(e.blocks).toBeGreaterThan(10);
    expect(Number.isFinite(e.se[0])).toBe(true);
  });

  it("Prove's own run lands inside its declared budgets", () => {
    const p = lyapunovSpectrum(CLASSIC, LYAP_T);
    expect(Math.abs(p.lambdas[0] - SPROTT.l1)).toBeLessThan(BUDGET.l1Abs);
    expect(Math.abs(p.lambdas[1])).toBeLessThan(BUDGET.l2Abs);
  });

  it("Kaplan–Yorke dimension: integer part from the positive partial sums", () => {
    expect(kaplanYorke([0.9, 0, -14.5])).toBeCloseTo(2 + 0.9 / 14.5, 12);
    expect(kaplanYorke([-1, -2, -3])).toBe(0);
    expect(kaplanYorke([1, 1, 1])).toBe(3);
  });
});

describe("invariant-measure histograms", () => {
  it("normalise, count overflow and measure total variation", () => {
    const pts = new Float64Array([0, 0, 10, 0, 0, 10, 100, 0, 0, 5, 0, 40]);
    const h = histogramXZ(pts, 3, CLASSIC_BOX);
    expect(h.n).toBe(4);
    expect(h.outside).toBeCloseTo(0.25, 12);
    expect(h.p.reduce((a, b) => a + b, 0)).toBeCloseTo(0.75, 12);
    expect(tvDistance(h, h)).toBe(0);
    const g = histogramXZ(new Float64Array([0, 0, 40]), 3, CLASSIC_BOX);
    expect(tvDistance(h, g)).toBeCloseTo(1, 12);
    // an offset shifts points before binning (ensemble offsets + the reference)
    const off = histogramXZ(new Float32Array([0, 0, -30, 0]), 4, CLASSIC_BOX, [0, 0, 70]);
    expect(off.outside).toBe(0);
  });

  it("two f64 runs of the same system agree; a different ρ does not", () => {
    const a = histogramXZ(referenceRun(CLASSIC, 60000, 10, 2000, [1, 1, 1]), 3, CLASSIC_BOX);
    const b = histogramXZ(referenceRun(CLASSIC, 60000, 10, 2000, [-7, 3, 30]), 3, CLASSIC_BOX);
    const c = histogramXZ(referenceRun({ ...CLASSIC, rho: 35 }, 60000, 10, 2000, [1, 1, 1]), 3, CLASSIC_BOX);
    expect(tvDistance(a, b)).toBeLessThan(0.08);
    expect(tvDistance(a, c)).toBeGreaterThan(0.15);
  });
});

describe("Buy More Digits line", () => {
  it("fits a line through horizon vs digits", () => {
    const f = fitLine([
      { digits: 3, horizon: 8 },
      { digits: 6, horizon: 15.5 },
      { digits: 9, horizon: 23 },
    ])!;
    expect(f.slope).toBeCloseTo(2.5, 12);
    expect(f.intercept).toBeCloseTo(0.5, 12);
    expect(f.r2).toBeCloseTo(1, 12);
    expect(fitLine([{ digits: 3, horizon: 8 }])).toBeNull();
  });
});

describe("Prove budgets ≡ tolerance.toml", () => {
  it("budgets.ts declares exactly what tolerance.toml declares", () => {
    const sec = /\[golden_tolerance\.closed-form\.strange-attractors-lyapunov\]\n([\s\S]*?)(?:\n\n|\n#|$)/.exec(tolerance);
    expect(sec).not.toBeNull();
    const kv = Object.fromEntries(
      sec![1]!
        .split("\n")
        .map((l) => /^(\w+)\s*=\s*([-\d.e+]+)/.exec(l.trim()))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => [m[1]!, Number(m[2])]),
    );
    expect(kv["l1_abs"]).toBe(BUDGET.l1Abs);
    expect(kv["l1_reference"]).toBe(SPROTT.l1);
    expect(kv["l2_abs"]).toBe(BUDGET.l2Abs);
    expect(kv["sum_rel"]).toBe(BUDGET.sumRel);
    expect(kv["invariant_tv"]).toBe(BUDGET.invariantTv);
    expect(kv["averaging_time"]).toBe(LYAP_T);
  });
});

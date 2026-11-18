// Declared budgets of Chaos's M1 Prove checks — measured first, then
// declared, never widened. The same numbers are declared in
// tools/testkit/equivalence/tolerance.toml under
// [golden_tolerance.closed-form.strange-attractors-lyapunov]; a unit test
// (test/chaos-m1.test.ts) holds the two together. None of these is a release
// gate: the capture gate is the only check CI runs; these are Prove cards.

/** Sprott (2003), classic Lorenz σ = 10, ρ = 28, β = 8/3: λ = (0.9056, 0, −14.5723), D_KY 2.0621. */
export const SPROTT = { l1: 0.9056, l2: 0, l3: -14.5723, ky: 2.0621 } as const;

/** Prove's Lyapunov run: averaging time after a 20-unit transient, from (1, 1, 1). */
export const LYAP_T = 4000;

export const BUDGET = {
  /** |λ₁ − 0.9056| for a 4,000-unit run. */
  l1Abs: 0.008,
  /** |λ₂| for a 4,000-unit run. */
  l2Abs: 0.0015,
  /** |Σλ − (−(σ + 1 + β))| / (σ + 1 + β): RK4's own volume error at Δt = 0.01. */
  sumRel: 1.5e-5,
  /** Total-variation distance, the ensemble's (x, z) histogram vs a long f64 run. */
  invariantTv: 0.02,
} as const;

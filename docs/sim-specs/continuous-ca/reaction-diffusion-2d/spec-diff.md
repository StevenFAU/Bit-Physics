# spec-diff.md — reaction-diffusion-2d (differentiable variant)

> **Status:** LANDED (Phase-4 batch-1, sim 1/4). De-stubbed from the Phase-4.0
> pre-stage slot at Stage 1a.
> **Parent reference sim:** `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md`
> (Stack-D port `spec-ref-stack-d.md`).
> **Variant type:** `diff` (differentiable). **Primary stack:** D (Taichi `ti.ad.Tape`).
> **Package:** `packages/reaction-diffusion-2d-diff/` (import `reaction_diffusion_2d_diff`).
> **Foundation consumed:** § 4.2.A (WU-A autodiff substrate `common_py.autodiff`).
> **Stage-0 probe:** `tools/testkit/probes/reports/reaction-diffusion-2d-diff.md`.
> **Charter:** `docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` § 3.1 / § 4.1.

## § 1 Scope

Differentiable 2D Gray-Scott reaction-diffusion. The forward map is re-implemented
with time-indexed `needs_grad` Taichi fields (the DiffTaichi single-write-per-element
pattern) so `ti.ad.Tape` backprops `dLoss/dparams` through the chained explicit-Euler
steps. Inverse problems:

- **Primary (D-PARAM):** recover the diffusion coefficient `D_u` from an observed
  final `u` field (`ParameterIDProblem`; cleanest analytic-gradient case).
- **A3 regime:** recover the feed rate `F` in the well-mixed (uniform) limit.

## § 2 Physics / governing equations

`u_t = D_u Lap(u) - u v^2 + F(1-u)`, `v_t = D_v Lap(v) + u v^2 - (F+k)v` (Pearson,
*Science* 261:189, 1993). Periodic 5-point Laplacian; forward-Euler time stepping —
identical to the landed `reaction-diffusion-2d-stack-d` reference.

## § 3 Verification surfaces

1. **Forward-equivalence (WU-F differentiable axis):** `diff.forward` == reference
   `step()` within relative <= 1e-3 (default; cap 1e-2). Measured <= 1e-12 (same
   physics, f64). `tests/test_forward_equivalence.py`.
2. **Gradient golden table (gate-4, >=3 independent anchors):**
   `tools/testkit/golden/tables/reaction-diffusion-2d-diff-gradient.json` — see § 8.
   `tests/test_gradient_golden.py`; derivation
   `tools/testkit/golden/derivations/reaction-diffusion-2d-diff-gradient.md`.
3. **Inverse recovery:** planted `D_u` recovered to < 1e-3.
   `tests/test_inverse_recovery.py`.
4. **MMS (closes 4.1 § 1.D `reaction_diffusion_2d_mms`):** oracle-grounded source-term
   self-consistency. `tests/test_mms.py`.

## § 4 Determinism

MEASURED bit-exact, same-stack-same-hw (single-thread CPU, seed-pinned IC). Forward
and gradient both bit-identical run-to-run. No EFECT (no training-loss distribution).
Registry: `tools/testkit/determinism/registry.toml`
`[continuous-ca.reaction-diffusion-2d-diff.forward]` +
`[continuous-ca.reaction-diffusion-2d-diff.gradient]`.

## § 5 Capture

Inverse-problem solution capture (recovered field + optimization trajectory) with the
schema-1.1.0 **`gradient_fields`** key populated (`dLoss/dD_u`) — the first real
consumer of `gradient_fields`. Schema `tools/testkit/schemas/capture-v1.json`.

## § 6 PBT invariant declarations (>=2 per spec § 2.14)

1. **`gradient_matches_finite_difference`** (the differentiable-axis invariant):
   autodiff `dLoss/dD_u` agrees with central FD <= 1e-3. **Regime:** smooth interior,
   small step-count (gradient conditioning). Re-declared on falsification, never widened.
2. **`concentration_change_bounded`** (forward-physics; re-scoped from the reference's
   `monotone_bounds`): no explicit-Euler step exceeds its diffusion + reaction rate
   budget. **Regime:** smooth IC, CFL-bounded `dt`.

`packages/reaction-diffusion-2d-diff/reaction_diffusion_2d_diff/invariants.py`;
`tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Pearson, *Science* 261:189 (1993) — Gray-Scott kinetics (A3).
- Strauss, *PDE: An Introduction* 2e, § 4.1 + Ch. 5; Evans, *PDE* 2e § 2.3 — diffusion
  eigenmode decay (A1).
- The landed `reaction-diffusion-2d-stack-d` reference (forward-equivalence).

## § 8 Independent-reference anchors (>=3 per spec § 2.4)

1. **A1 — discrete-Fourier-eigenmode analytic** `dLoss/dD_u`: a single discrete Fourier
   mode is an exact eigenvector of the periodic 5-point Laplacian (eigenvalue lambda),
   so the pure-diffusion forward gives the closed-form
   `dLoss/dD_u = 2T(1+dt D_u lambda)^(2T-1)(dt lambda) sum(phi^2)`, EXACT for the
   discrete operator. Source: Strauss 2e § 4.1 + Ch. 5; Evans 2e § 2.3.
2. **A2 — central finite-difference baseline** `dLoss/dD_u` (full Gray-Scott;
   numerical baseline, close-R2 exemption).
3. **A3 — reaction-ODE-limit analytic** `dLoss/dF` (well-mixed/uniform; independent of
   A1 in physical term, parameter, and method). Source: Pearson 1993; hand-derivation.

**D-ANCHOR Stage-0 SHIFT (on evidence):** the charter's proposed A3=MMS is ill-posed
(the manufactured solution is `D`-independent, so `du*/dD == 0` carries no
parameter-sensitivity); A3 re-declared to the reaction-ODE-limit anchor (mirrors the
dispatch's lenia A3 amendment). The MMS keeps its forward-convergence + mutation-target
role. **D-TOL:** golden-table inline tolerance + the WU-F axis budget
(`tolerance.py _AXIS_BUDGETS["differentiable"]`) + `GradientCheckReport.tolerance`
suffice; NO new `tolerance.toml` row needed (single-stack; no equivalence override).

## § 9 Replayable capture

`tests/fixtures/legacy-captures/phase-4-reaction-diffusion-2d-diff.h5` (LFS; Stage 1c).

## § 10 Determinism <-> capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"` <-> § 4 registry rows.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Optimization wall-clock row in `docs/perf-ledger.md` (gate-12; Stage 1c).

## § 13 Gate-13

Failing-tests evidence replayed at landing (Convention E worktree).

## Gate-14 / mutation

**gate-14 N/A** — single-stack diff (no cross-stack diff sibling); WU-F differentiable-
axis variant-equivalence applies instead. **Mutation targets** (§ 8.7, advisory):
`reaction_diffusion_2d_diff` (sim source) + `reaction_diffusion_2d_mms` (the 4.1 § 1.D
gap). Registered + measured at Stage 1c.

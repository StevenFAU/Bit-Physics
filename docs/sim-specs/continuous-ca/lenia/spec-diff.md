# spec-diff.md — lenia (differentiable variant)

> **Status:** LANDED (Phase-4 batch-1, sim 2/4). De-stubbed from the Phase-4.0
> pre-stage slot at Stage 1a.
> **Parent reference sim:** `docs/sim-specs/continuous-ca/lenia/spec-ref.md`.
> **Variant type:** `diff` (differentiable). **Primary stack:** D (Taichi `ti.ad.Tape`).
> **Package:** `packages/lenia-diff/` (import `lenia_diff`).
> **Foundation consumed:** § 4.2.A (WU-A autodiff substrate `common_py.autodiff`).
> **Stage-0 probe:** `tools/testkit/probes/reports/lenia-diff.md`.
> **Charter:** `docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` § 3.2 / § 4.2.

## § 1 Scope

Differentiable Quad4-Lenia. The forward map is re-implemented with time-indexed
`needs_grad` Taichi fields (real-space Quad4 convolution via `ti.static`-unrolled kernel
taps + Quad4 polynomial growth + clip-Euler) so `ti.ad.Tape` backprops `dLoss/dparams`
through the chained steps. Inverse problems:

- **Primary (D-PARAM):** recover the growth parameters `(μ, σ)` from an observed final
  field (`LeniaGrowthID`, `ParameterIDProblem`).
- **A3 regime:** recover the initial field `A₀` (`LeniaInitialFieldID`,
  `InitialStateRecoveryProblem`) — the convolution-Jacobian anchor.

## § 2 Physics / governing equations

`A_{n+1} = clip(A_n + dt·G(K ∗ A_n), 0, 1)` with the Quad4 kernel `K(r)=(4r(1−r))⁴`
(normalized) and Quad4 polynomial growth `G(u)=2·max(0,1−(u−μ)²/(9σ²))⁴−1` (Chakazul gn=1;
Chan 2019, *Complex Systems* 28(3):251-286). Periodic BC — identical to the landed `lenia`
reference.

## § 3 Verification surfaces

1. **Forward-equivalence (WU-F differentiable axis):** `diff.forward` == reference `step()`
   within relative ≤ 1e-3 (default; cap 1e-2). Measured bit-exact (< 1e-12; same physics,
   same di-outer/dj-inner tap order, f64). `tests/test_forward_equivalence.py`.
2. **Gradient golden table (gate-4, ≥3 independent anchors):**
   `tools/testkit/golden/tables/lenia-diff-gradient.json` — see § 8.
   `tests/test_gradient_golden.py`; derivation
   `tools/testkit/golden/derivations/lenia-diff-gradient.md`.
3. **Inverse recovery:** planted `μ` recovered to < 1e-3 (loss collapses < 1e-9).
   `tests/test_inverse_recovery.py`.

## § 4 Determinism

MEASURED bit-exact, same-stack-same-hw (single-thread CPU, seed-pinned IC). Forward and
gradient both bit-identical run-to-run. No EFECT (no training-loss distribution). Registry:
`tools/testkit/determinism/registry.toml` `[continuous-ca.lenia-diff.forward]` +
`[continuous-ca.lenia-diff.gradient]`.

## § 5 Capture

Inverse-problem solution capture (recovered field + optimization trajectory) with the
schema-1.1.0 **`gradient_fields`** key populated (`dLoss/dμ` + `dLoss/dσ`). Schema
`tools/testkit/schemas/capture-v1.json`.

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`gradient_matches_finite_difference`** (the differentiable-axis invariant): autodiff
   `(∂Loss/∂μ, ∂Loss/∂σ)` agrees with central FD ≤ 1e-3. **Regime:** smooth interior, params
   away from clip saturation. Re-declared on falsification, never widened.
2. **`field_bounded`** (forward-physics; the Phase-3 lenia `monotone_bounds` re-scoped): the
   clip-Euler field stays in `[0,1]` over the horizon. **Regime:** smooth IC.

`packages/lenia-diff/lenia_diff/invariants.py`; `tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Chan, B.W.-C. (2019), "Lenia — Biology of Artificial Life," *Complex Systems* 28(3):251-286
  (arXiv:1812.05433) — Quad4 polynomial growth/kernel family (A1).
- Vendored Chakazul/Lenia @ SHA `adfc542939266de7f4bb7ebb552e8499701ee107`
  (`references/Chakazul-Lenia/Python/LeniaF.py:500` growth / `:493` kernel) — closed-form cite.
- The landed `lenia` reference (forward-equivalence).

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

1. **A1 — Quad4 growth-parameter analytic** `(∂Loss/∂μ, ∂Loss/∂σ)`: closed-form
   `∂G/∂μ = 16·base³·(u−μ)/(9σ²)`, `∂G/∂σ = 16·base³·(u−μ)²/(9σ³)` in the smooth interior
   (`base = 1−(u−μ)²/(9σ²) > 0`), EXACT for one step. Source: Chan 2019 § growth + vendored
   Chakazul grep-cite. Measured `1.04e-14` (probe §1).
2. **A2 — central finite-difference baseline** `(∂Loss/∂μ, ∂Loss/∂σ)` (numerical baseline,
   close-R2 exemption). Measured autodiff-vs-FD `9.49e-10` (probe §1).
3. **A3 — convolution-Jacobian + growth-deriv analytic** `∂Loss/∂A₀`: the convolution
   `U=K∗A₀` is linear with Jacobian `K`, so `∂Loss/∂A₀ = resid + adjoint_K(resid·dt·G′(U))`,
   `G′(u)=−16·base³·(u−μ)/(9σ²)`. Independent of A1 in physical term (spatial convolution /
   kernel), parameter class (the field), and method (convolution adjoint). Measured
   `1.23e-14` (probe §1).

**D-ANCHOR Stage-0 SHIFT (on evidence):** the charter's proposed A3 = `∂K/∂(kernel params)`
is ill-posed — the landed Quad4 kernel `(4r(1−r))⁴` is parameter-free (only the integer
radius `R`); Flow-Lenia (arXiv:2212.07906) is a mass-conservation extension, not a
differentiable method (CONTEXT-ONLY). A3 re-declared to the convolution-Jacobian field
gradient (which DOES exercise the kernel via the conv adjoint). Mirrors sim-1's A3 shift.
**D-GROWTH-FORM:** KEEP Quad4 (clean smooth-interior gradient; no Gaussian fallback).
**D-TOL:** golden-table inline tolerance + the WU-F axis budget + `GradientCheckReport.tolerance`
suffice; NO new `tolerance.toml` row (single-stack; no equivalence override).

## § 9 Replayable capture

`tests/fixtures/legacy-captures/phase-4-lenia-diff.h5` (LFS; Stage 1c).

## § 10 Determinism ↔ capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"` ↔ § 4 registry rows.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Optimization wall-clock row in `docs/perf-ledger.md` (gate-12; Stage 1c).

## § 13 Gate-13

Failing-tests evidence replayed at landing (Convention E worktree).

## Gate-14 / mutation

**gate-14 N/A** — single-stack diff (no cross-stack diff sibling); WU-F differentiable-axis
variant-equivalence applies instead. **Mutation target** (§ 8.7, advisory): `lenia_diff`
(sim source; Lenia has no MMS, so no `*_mms` target). Registered + measured at Stage 1c.

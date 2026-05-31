# spec-diff.md — eulerian-smoke (differentiable variant)

> **Status:** LANDED (Phase-4 batch-1, sim 4/4; FINAL). De-stubbed from the Phase-4.0
> pre-stage slot at Stage 1a.
> **Parent reference sim:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`.
> **Variant type:** `diff` (differentiable). **Primary stack:** E (NVIDIA Warp `wp.Tape`).
> **Package:** `packages/eulerian-smoke-diff/` (import `eulerian_smoke_diff`).
> **Foundation consumed:** § 4.2.A (WU-A autodiff substrate `common_warp.autodiff` — the FIRST
> Stack-E consumer).
> **Stage-0 probe:** `tools/testkit/probes/reports/eulerian-smoke-diff.md`.
> **Charter:** `docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` § 3.4 / § 4.4.

## § 1 Scope

Differentiable Eulerian smoke. The smoke step's two load-bearing primitives — the bilinear
semi-Lagrangian backtrace advect gather and the explicit 5-point diffusion — are re-implemented as
**on-device `requires_grad` `@wp.kernel`s** recorded inside a single `wp.Tape` (the landed
`eulerian-smoke-stack-e` reference's NumPy-marshalling wrappers `wp.from_numpy(...)` →
`out.numpy()` sever the tape, so they are re-implemented, NOT wrapped — Stage-0 probe § 1). Inverse
problem: recover the **initial smoke density field** `u0` of a constant-velocity advection rollout
from its observed final frame (`SmokeInitialFieldID`, `InitialStateRecoveryProblem`). Regime:
**constant velocity, short horizon** (the bilinear advect map is a globally-linear, well-conditioned
operator → `u0` is identifiable).

## § 2 Physics / governing equations

Semi-Lagrangian backtrace advection (Stam 1999): `u(x, t+dt) = u(backtrace(x), t)` with periodic
bilinear interpolation; the explicit-diffusion step `u' = u + dt*nu*Lap(u)` (5-point periodic
Laplacian) — both op-order-identical to the landed `eulerian-smoke-stack-e` reference
(`_sl_advect_2d_k` / `_lap5_k`). Constant velocity `(vx, vy) = (0.6, -0.4)`, `dt=0.03125`,
`dx=1/16` → fractional cell displacement `(0.3, -0.2)` (bounded away from 0.5 → full-rank advect
operator `M`). Diffusion coefficient `nu=0.05` (exercised by the A3 anchor + a PBT).

## § 3 Verification surfaces

1. **Forward-equivalence (WU-F differentiable axis):** `diff` advect/diffuse primitives ==
   `eulerian-smoke-stack-e` reference primitives within relative <= 1e-3 (default; cap 1e-2).
   Measured **bit-exact** (`max|diff - ref| == 0.0`; same op-order, f64, single-thread Warp CPU).
   `tests/test_forward_equivalence.py`.
2. **Gradient golden table (gate-4, >=3 independent anchors):**
   `tools/testkit/golden/tables/eulerian-smoke-diff-gradient.json` — see § 8.
   `tests/test_gradient_golden.py`; derivation
   `tools/testkit/golden/derivations/eulerian-smoke-diff-gradient.md`.
3. **Inverse recovery:** planted smooth `u0` recovered to < 1e-3 (loss collapses < 1e-10).
   `tests/test_inverse_recovery.py`.

## § 4 Determinism

MEASURED bit-exact, same-stack-same-hw (Warp CPU single-thread serial `wp.launch`; seed-pinned
smooth IC). Forward and gradient both bit-identical run-to-run. No EFECT (no training-loss
distribution). Registry: `tools/testkit/determinism/registry.toml`
`[volumetric-grid.eulerian-smoke-diff.forward]` (`atomic_ops = "none"` — pure per-cell gather) +
`[volumetric-grid.eulerian-smoke-diff.gradient]` (`atomic_ops = "sum-only"` — the gather adjoint +
the L2 reduction use `wp.atomic_add`, order-exact under serial CPU launch).

## § 5 Capture

Inverse-problem solution capture (recovered initial smoke field + the autodiff `dLoss/du0`) with
the schema-1.1.0 **`gradient_fields`** key populated, via `common_warp.capture.write_frames_capture`.
Schema `tools/testkit/schemas/capture-v1.json`.

## § 6 PBT invariant declarations (>=2 per spec § 2.14)

1. **`gradient_matches_finite_difference`** (the differentiable-axis invariant): autodiff
   `dLoss/du0` agrees with central FD <= 1e-3. **Regime:** constant velocity, short horizon, small
   grid. Re-declared on falsification, never widened.
2. **`advect_field_bounded_by_input_range`** (forward-physics): bilinear SL advect is a convex
   combination of source cells (non-negative weights summing to 1), so the advected field stays
   within `[min(u0), max(u0)]` (range-preserving). **Regime:** pure advection (no diffusion
   source). The smoke-E reference's `field_values_bounded` re-scoped.

`packages/eulerian-smoke-diff/eulerian_smoke_diff/invariants.py`; `tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Stam, J. (1999), "Stable Fluids," SIGGRAPH '99, 121-128 (DOI 10.1145/311535.311548) — the
  semi-Lagrangian backtrace advection method anchor (A1 cite).
- The heat equation `d_t u = nu*Lap(u)` (textbook) — the A3 diffusion source.
- The landed `eulerian-smoke-stack-e` reference (forward-equivalence).

## § 8 Independent-reference anchors (>=3 per spec § 2.4)

1. **A1 — linear-advection-operator analytic** `dLoss/du0 = 2 (M^K)^T (M^K u0 - target)`: for a
   constant velocity the bilinear backtrace map is the exact sparse linear operator `M`, so the
   gradient is closed-form EXACT. The NumPy `M` mirror is bit-faithful to the Warp engine; measured
   autodiff-vs-analytic ~4e-15 (Stage-1b). Hand-derived; Stam 1999.
2. **A2 — central finite-difference baseline** (numerical baseline; close-R2 exemption). Measured
   autodiff-vs-FD ~3e-10 (Stage-1b).
3. **A3 — discrete-diffusion analytic** `dLoss/dnu = 2 (u' - target) . (dt * Lap(u0))` for one
   explicit step: independent of A1/A2 in physical term (diffusion not advection), parameter class
   (the coefficient `nu` not the field `u0`), and method (heat-operator linearization). Measured
   autodiff-vs-analytic 0.0 EXACT (Stage-1b).

**D-ANCHOR Stage-0 SHIFT (on evidence):** the charter § 4.4 framed A3 as the **continuous**
heat-kernel (Gaussian-spread). The continuous kernel is the motivation, but the EXACT golden TABLE
value must be the derivative of the **discrete** explicit-diffusion operator the sim runs (the
continuous spread is only first-order-accurate → not machine-exact). So A3 is the discrete-diffusion
`dLoss/dnu` analytic, heat-equation retained as the source. Mirrors sim-1's MMS->ODE, sim-2's
`dK`->conv-Jacobian, sim-3's DiffTaichi->neo-Hookean shifts: keep >=3 independent NUMERIC anchors,
document the shift, never force an unsound anchor.
**D-WARP-ADJOINT (Stage-0 BLOCK gate):** CONFIRMED differentiable (autodiff == exact analytic
operator to 1.1e-16; == analytic `dLoss/dnu` to 0.0). Re-implement on-device, do NOT wrap the
reference's NumPy-marshalling primitives.
**D-INVERSE-SCOPE (identifiability):** `advect∘diffuse` is linear but diffusion is a low-pass
operator → recovering `u0` from a diffused target is ill-posed for high frequencies (backward
heat). The canonical recovery is scoped to the **pure-advection** regime (`M` near-permutation,
well-conditioned → `u0` identifiable; MEASURED recovered-err ~6.5e-7, Stage-1b). Diffusion is
exercised by the A3 anchor + a PBT.
**D-TOL:** golden-table inline tolerance + the WU-F axis + `GradientCheckReport.tolerance` suffice;
NO new `tolerance.toml` row (single-stack; no equivalence override).
**D-MYPY (F-RB-3):** `# mypy: ignore-errors` scoped to the Warp-touching `_kernels.py` / `sim.py` /
`capture.py`; the pure-NumPy `forward.py` + `invariants.py` stay mypy-`--strict`.
**D-USD:** DEFER (Stack-E policy, charter § 10; closed-with-shifted — no `common_warp` USD surface).

## § 9 Replayable capture

`tests/fixtures/legacy-captures/phase-4-eulerian-smoke-diff.h5` (LFS; Stage 1c).

## § 10 Determinism <-> capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"`, `atomic_ops = true` (the gradient that
produced the captured `gradient_fields` uses `wp.atomic_add` reductions) <-> § 4 registry rows.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Optimization wall-clock row in `docs/perf-ledger.md` (gate-12; Stage 1c).

## § 13 Gate-13

Failing-tests evidence replayed at landing (Convention E worktree).

## Gate-14 / mutation

**gate-14 N/A** — single-stack diff (no cross-stack diff sibling); WU-F differentiable-axis
variant-equivalence applies instead. **Mutation target** (§ 8.7, advisory): `eulerian_smoke_diff`.

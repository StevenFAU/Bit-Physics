# spec-diff.md — mpm-multimaterial (differentiable variant)

> **Status:** LANDED (Phase-4 batch-1, sim 3/4). De-stubbed from the Phase-4.0
> pre-stage slot at Stage 1a.
> **Parent reference sim:** `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref.md`.
> **Variant type:** `diff` (differentiable). **Primary stack:** D (Taichi `ti.ad.Tape`).
> **Package:** `packages/mpm-multimaterial-diff/` (import `mpm_multimaterial_diff`).
> **Foundation consumed:** § 4.2.A (WU-A autodiff substrate `common_py.autodiff`).
> **Stage-0 probe:** `tools/testkit/probes/reports/mpm-multimaterial-diff.md`.
> **Charter:** `docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` § 3.3 / § 4.3.

## § 1 Scope

Differentiable 3D APIC neo-Hookean MLS-MPM. The forward map is re-implemented with
time-indexed `needs_grad` Taichi fields (P2G `ti.atomic_add` scatter + grid update +
G2P gather + F-update + symplectic advect, `ti.static`-unrolled 27-cell quadratic-B-spline
stencil) so `ti.ad.Tape` backprops `dLoss/dparams` through the chained steps. Inverse
problem (DiffTaichi "throw-to-target"): recover the **shared initial velocity** `v0` of an
elastic blob from its observed final particle positions (`MpmInitialVelocityID`,
`InitialStateRecoveryProblem`). Regime: **interior small-strain elastic, no plastic yield,
short horizon** (the blob free-flights near the domain centre; no boundary clamp activates).

## § 2 Physics / governing equations

MLS-MPM (Hu 2018 88-line APIC variant) with neo-Hookean Kirchhoff stress
`sigma = mu*(B - I) + lam*log(J)*I` (`B = F F^T`, `J = det F`), `F^{n+1} = (I + dt C^{n+1}) F^n`,
`mu = E/(2(1+nu))`, `lam = E*nu/((1+nu)(1-2nu))`, `E=4e3`, `nu=0.3` — identical to the landed
`mpm-multimaterial-stack-d` reference. Grid gravity `g=-9.81 z`; the sticky floor is disabled
(`floor_z_index<0`) in the interior regime.

## § 3 Verification surfaces

1. **Forward-equivalence (WU-F differentiable axis):** `diff.forward` == reference rollout
   within relative <= 1e-3 (default; cap 1e-2). Measured **bit-exact** (the diff is evaluated
   under the conftest f64 runtime before the reference's `_ensure_taichi` re-init — see
   `tests/test_forward_equivalence.py`). `tests/test_forward_equivalence.py`.
2. **Gradient golden table (gate-4, >=3 independent anchors):**
   `tools/testkit/golden/tables/mpm-multimaterial-diff-gradient.json` — see § 8.
   `tests/test_gradient_golden.py`; derivation
   `tools/testkit/golden/derivations/mpm-multimaterial-diff-gradient.md`.
3. **Inverse recovery:** planted `v0` recovered to < 1e-3 (loss collapses < 1e-12).
   `tests/test_inverse_recovery.py`.

## § 4 Determinism

MEASURED bit-exact, same-stack-same-hw (single-thread CPU serialises the P2G `ti.atomic_add`
scatter; seed-pinned IC). Forward and gradient both bit-identical run-to-run. No EFECT (no
training-loss distribution). Registry: `tools/testkit/determinism/registry.toml`
`[hybrid-pg.mpm-multimaterial-diff.forward]` + `[hybrid-pg.mpm-multimaterial-diff.gradient]`
(`atomic_ops = "sum-only"` on the gradient row — the scatter adjoint).

## § 5 Capture

Inverse-problem solution capture (recovered final particle positions + the autodiff
`dLoss/dv0`) with the schema-1.1.0 **`gradient_fields`** key populated. Schema
`tools/testkit/schemas/capture-v1.json`.

## § 6 PBT invariant declarations (>=2 per spec § 2.14)

1. **`gradient_matches_finite_difference`** (the differentiable-axis invariant): autodiff
   `dLoss/dv0` agrees with central FD <= 1e-3. **Regime:** interior small-strain, short
   horizon. Re-declared on falsification, never widened.
2. **`momentum_change_bounded_by_impulse`** (forward-physics): the total particle
   linear-momentum change over the horizon equals the external gravity impulse
   `(0,0,-|g|*dt*STEPS*m_total)` — internal elastic + APIC transfer add no net momentum.
   **Regime:** interior (no boundary clamp).

`packages/mpm-multimaterial-diff/mpm_multimaterial_diff/invariants.py`;
`tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Hu, Y., Anderson, L., Li, T.-M., Sun, Q., Carr, N., Ragan-Kelley, J., Durand, F. (2020),
  "DiffTaichi: Differentiable Programming for Physical Simulation," ICLR 2020
  (arXiv:1910.00935) — the differentiable-MPM method anchor (A3 cite; CITE-DON'T-IMPORT).
- Stomakhin et al. (2013) / Jiang et al. (2016) "The Material Point Method for Simulating
  Continuum Materials," SIGGRAPH course — the neo-Hookean constitutive (as the reference cites).
- The landed `mpm-multimaterial-stack-d` reference (forward-equivalence).

## § 8 Independent-reference anchors (>=3 per spec § 2.4)

1. **A1 — ballistic kinematic analytic** `dLoss/dv0 = 2(dt*STEPS)^2 (v0 - v0_target)`: a single
   particle with `F=I`, `C=0` has zero neo-Hookean stress and zero APIC first moment
   (`sum w*dpos == 0` for the quadratic B-spline), so the APIC round-trip degenerates to PIC
   free-flight with `dx(T)/dv0 = dt*STEPS*I`, EXACT. Hand-derived kinematics. Measured
   autodiff-vs-analytic ~1e-18 (Stage-1b).
2. **A2 — central finite-difference baseline** (numerical baseline; close-R2 exemption).
   Multi-particle grid-coupled `dLoss/dv0`. Measured autodiff-vs-FD ~1.9e-8 (Stage-1b).
3. **A3 — neo-Hookean small-strain constitutive analytic** `d(sigma00)/d(eps) = 2mu+lam` at
   `F=diag(1+eps,1,1)`: independent of A1/A2 in physical term (constitutive not kinematic),
   parameter class (strain not `v0`), and method (elastic linearization). Hand-derived
   (Stomakhin 2013 / Jiang 2016). Measured autodiff-vs-analytic 0.0 EXACT (Stage-1b).

**D-ANCHOR Stage-0 SHIFT (on evidence):** the charter § 4.3 listed A3 = DiffTaichi. DiffTaichi
is a published **method** anchor (FD-validated in the paper) but publishes **no storable
numeric gradient value** for a golden TABLE point, so the third NUMERIC anchor is the
neo-Hookean small-strain constitutive analytic; DiffTaichi is retained as the method citation
(A3-CITE). Mirrors sim-1's MMS->ODE shift and sim-2's `dK`->conv-Jacobian shift: keep >=3
genuinely independent NUMERIC anchors, document the shift, never force an unsound anchor.
**D-DT (Stage-1b MEASURED):** `dt=1e-3` is the largest step keeping the stiff (`E=4e3`)
dynamics smooth (autodiff-vs-FD ~2e-8); `dt>=5e-3` leaves the regime (~3% — the DiffTaichi
"sim gradients aren't always well-conditioned" warning).
**D-TOL:** golden-table inline tolerance + the WU-F axis + `GradientCheckReport.tolerance`
suffice; NO new `tolerance.toml` row (single-stack; no equivalence override).

## § 9 Replayable capture

`tests/fixtures/legacy-captures/phase-4-mpm-multimaterial-diff.h5` (LFS; Stage 1c).

## § 10 Determinism <-> capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"`, `atomic_ops = true` (the P2G
scatter) <-> § 4 registry rows.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Optimization wall-clock row in `docs/perf-ledger.md` (gate-12; Stage 1c).

## § 13 Gate-13

Failing-tests evidence replayed at landing (Convention E worktree).

## Gate-14 / mutation

**gate-14 N/A** — single-stack diff (no cross-stack diff sibling); WU-F differentiable-axis
variant-equivalence applies instead. **Mutation target** (§ 8.7, advisory): `mpm_multimaterial_diff`.

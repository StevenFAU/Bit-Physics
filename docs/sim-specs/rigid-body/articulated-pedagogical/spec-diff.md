# spec-diff.md — articulated-pedagogical (differentiable variant)

> **Status:** LANDED (Phase-4 batch-3, sim 1/3 — the differentiable carry). De-stubbed from the
> Phase-4.0 pre-stage slot at Stage 1a.
> **Parent reference sim:** `docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md`.
> **Variant type:** `diff` (differentiable). **Primary stack:** E (NVIDIA Warp `wp.Tape`).
> **Package:** `packages/articulated-pedagogical-diff/` (import `articulated_pedagogical_diff`).
> **Foundation consumed:** § 4.2.A (WU-A autodiff substrate `common_warp.autodiff`).
> **Stage-0 probe:** `tools/testkit/probes/reports/articulated-pedagogical-diff.md`.
> **Charter:** `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md` § 3.1 / § 4.1.

## § 1 Scope

Differentiable articulated pendulum. The landed parent Featherstone ABA kernel
(`articulated_pedagogical._warp_kernels.aba_kernel`) is launched **on-device inside a `wp.Tape`**
with `requires_grad` arrays (the parent's Python wrapper does `qdd.numpy()`, which severs the tape;
the diff variant keeps everything on device — Stage-0 probe § 1). Inverse problem: recover the
initial state `(q0, qd0)` from the observed final `(q_T, qd_T)` of a short semi-implicit-Euler
rollout (`PendulumStateRecovery`, `InitialStateRecoveryProblem`). **Scope = single pendulum (n=1)**
— the Stage-0 probe MEASURED the `wp.Tape` adjoint machine-exact for `n=1` and divergent for `n≥2`
(the ABA inward pass's in-place `ia[i-1]` accumulation is read-after-write aliasing Warp's reverse
pass cannot replay); the multi-link tape-correct ABA is deferred (surfaced). The FORWARD is exact at
any `n` (the parent-vs-frontier forward-equivalence anchor).

## § 2 Physics / governing equations

Ideal simple pendulum (point mass `m` at the rod tip `cdist = L`, `I_com = 0`, pivot inertia
`H = mL²`, gravity `g`): `q̈ = −(g/L) sin q`. Forward dynamics via the parent's three-pass
Featherstone ABA (`aba_kernel`, op-order-identical → forward bit-exact vs the parent). Rollout:
symplectic semi-implicit Euler `qd' = qd + dt·q̈`, `q' = q + dt·qd'` (the parent integrator default),
`dt=0.01`, 50 steps.

## § 3 Verification surfaces

1. **Forward-equivalence (WU-F differentiable axis):** `diff.forward` `q̈` == the landed parent
   `aba_forward_dynamics` — **bit-exact** (same kernel), MEASURED at n=1 AND n=2.
   `tests/test_forward_equivalence.py`.
2. **Gradient golden table (gate-4, ≥3 independent anchors):**
   `tools/testkit/golden/tables/articulated-pedagogical-diff-gradient.json` — see § 8.
   `tests/test_gradient_golden.py`; derivation
   `tools/testkit/golden/derivations/articulated-pedagogical-diff-gradient.md`.
3. **Inverse recovery:** planted `(q0, qd0)` recovered to < 1e-5 (loss < 1e-12).
   `tests/test_inverse_recovery.py`.

## § 4 Determinism

MEASURED bit-exact, same-stack-same-hw (Warp CPU single-thread serial `wp.launch(dim=1)`; f64;
fixed config). Forward and gradient both bit-identical run-to-run. No EFECT (no training-loss
distribution). Registry: `tools/testkit/determinism/registry.toml`
`[rigid-body.articulated-pedagogical-diff.forward]` (`atomic_ops = "none"` — fixed-size per-link
loop) + `[rigid-body.articulated-pedagogical-diff.gradient]` (`atomic_ops = "sum-only"` — the
`wp.Tape` adjoint of the L2 reduction uses `wp.atomic_add`, order-exact under serial CPU launch).

## § 5 Capture

Inverse-problem solution capture (recovered `(q0, qd0)` + the autodiff `dLoss/dq0` / `dLoss/dqd0`)
with the schema-1.1.0 **`gradient_fields`** key populated, via
`common_warp.capture.write_frames_capture`. Schema `tools/testkit/schemas/capture-v1.json`.

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`gradient_matches_finite_difference`** (the differentiable-axis invariant): autodiff `∂q̈/∂q`
   agrees with central FD ≤ 1e-5. **Regime:** single pendulum (the machine-exact adjoint scope),
   smooth interior, away from the gimbal. Re-declared on falsification, never widened.
2. **`energy_drift_bounded`** (forward-physics; the landed task-4 invariant on the diff forward):
   under the symplectic semi-implicit-Euler rollout the total mechanical energy has bounded
   oscillation and no secular drift; the secular drift rate < 1e-3 per second. **Regime:**
   gravity-only frictionless single pendulum, **horizon ≥ 1 oscillation period** (the windowed-mean
   secular metric is only well-posed once each window averages out the O(dt) oscillation —
   re-scoped on Stage-1a evidence, HARD RULE 2, threshold UNCHANGED).

`packages/articulated-pedagogical-diff/articulated_pedagogical_diff/invariants.py`;
`tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Featherstone, R. (2008), *Rigid Body Dynamics Algorithms*, Ch. 7 §7.3 (the Articulated-Body
  Algorithm) — the forward-dynamics + single-link inertia anchor (A1/A3 cites).
- The simple-pendulum EOM `q̈ = −(g/L) sin q` (textbook; parent `analytic.py`) — the A1 source.
- The landed parent `articulated-pedagogical` reference (forward-equivalence).

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

1. **A1 — analytic state-sensitivity** `∂q̈/∂q = −(g/L) cos q`: closed-form for the single pendulum;
   autodiff matches to relerr ≤ 1.9e-16 (Stage-0/1b). Hand-derived; Featherstone Ch. 7.
2. **A2 — central finite-difference baseline** (numerical baseline; close-R2 exemption). Autodiff
   matches FD to the truncation floor (~1e-7, Stage-1b).
3. **A3 — analytic torque-sensitivity** `∂q̈/∂τ = 1/(mL²)`: independent of A1/A2 in physical term
   (torque- not state-sensitivity), parameter (`τ` not `q`), and method (joint-space-inertia
   inversion not gravity linearization); configuration-independent constant. Autodiff matches EXACTLY
   (relerr 0.0, Stage-1b). Featherstone single-link inertia / parallel-axis.

**D-WARP-ADJOINT (Stage-0 BLOCK gate):** CLEARED for the single-pendulum scope (autodiff == analytic
to 1.9e-16 / 0.0). The `n≥2` coupled adjoint MEASURED diverging (relerr 0.197 vs central FD; the
inward-pass in-place `ia[i-1]` read-after-write aliasing) → single-pendulum scope (on-evidence
SHIFT); the multi-link tape-correct ABA is deferred + surfaced.
**D-INVERSE-SCOPE (identifiability):** recover `(q0, qd0)` from the observed final `(q_T, qd_T)` —
2 unknowns, 2 observations → identifiable in the smooth short-horizon regime (the pendulum map is
locally invertible away from the separatrix; MEASURED recovered-err ~1e-9, Stage-1b).
**D-TOL:** new single-stack `[golden_tolerance.rigid-body.articulated-pedagogical-diff]` (bespoke
per-anchor numeric keys; the golden-tolerance branch). No equivalence override.
**D-MYPY (F-RB-3):** `# mypy: ignore-errors` scoped to the Warp-touching `_kernels.py` / `sim.py` /
`capture.py`; the pure-NumPy `forward.py` + `invariants.py` stay mypy-`--strict`.
**D-CONTACT:** gravity-only frictionless ⇒ smooth gradient (no contact-differentiation).
**D-USD:** DEFER (Stack-E policy, charter § 10; closed-with-shifted — no `common_warp` USD surface).

## § 9 Replayable capture

`tests/fixtures/legacy-captures/phase-4-articulated-pedagogical-diff.h5` (LFS; Stage 1c). Canonical
solution capture `captures/articulated-pedagogical-diff-ref/`.

## § 10 Determinism ↔ capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"`, `atomic_ops = true` (the gradient that
produced the captured `gradient_fields` uses `wp.atomic_add` reductions) ↔ § 4 registry rows.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Optimization wall-clock row in `docs/perf-ledger.md` (gate-12; Stage 1c; one inverse solve 5.306s).

## § 13 Gate-13

Failing-tests evidence replayed at landing (Convention E worktree; MATCHED at the 1a commit).

## Gate-14 / mutation

**gate-14 N/A** — single-stack diff (no cross-stack diff sibling); WU-F differentiable-axis
variant-equivalence (forward bit-exact vs the parent) applies instead. **Mutation target** (§ 8.7,
advisory): `articulated_pedagogical_diff`.

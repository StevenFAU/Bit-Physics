# spec-diff.md — sph-water (differentiable variant)

> **Status:** IN-BUILD (Phase-6 cluster C-1, unit U-1). De-stubbed from the Phase-4.0
> pre-stage slot at C-1 U-1 stage 1a.
> **Parent reference sim:** `docs/sim-specs/particle-fluids/sph-water/spec-ref.md`
> (Stack-D port `spec-ref-stack-d.md`).
> **Variant type:** `diff` (differentiable). **Primary stack:** D (Taichi `ti.ad.Tape`;
> locked v8 amendment).
> **Package:** `packages/sph-water-diff/` (import `sph_water_diff`).
> **Foundation consumed:** § 4.2.A (WU-A autodiff substrate `common_py.autodiff`).
> **Stage-0 probe:** `docs/_audits/phase-6/c1-u1-sph-water-diff-probe-2026-06-11T13-56-06Z.md`.
> **Charter:** `docs/phases/phase-6/c1-charter.md` § 3.1 (RATIFIED § 10); Phase-4 ledger
> row 10 (deferred → Phase-4-Greenfield-CPU), batch-1 EXP-C.

## § 1 Scope

Differentiable SPH water over the **landed parent's canonical physics**
(`packages/sph-water-stack-d`, R-S3/S6 Phase-2 ratified): semi-implicit-Euler gravity
free-fall + Monaghan-cubic-spline SPH density. The forward is re-implemented with
time-indexed `needs_grad` Taichi fields (DiffTaichi single-write-per-element pattern).
Inverse problems:

- **Primary (control, per plan § 8.1):** recover the shared initial vertical velocity
  `v0z` from observed final positions (`ControlProblem`; the map is EXACTLY linear —
  cleanest possible gradient case).
- **Kernel-width ID:** recover the smoothing length `h` from observed densities of a
  static configuration (`ParameterIDProblem`; the SPH-specific gradient surface).

**SHIFT (charter § 3.1 + probe § 2, documented not absorbed):** plan § 8.1's prose
ParamSpec "(viscosity, kernel-size, density-base, surface-tension, damping)" names
parameters that are NOT in the landed parent forward (no pressure/viscosity force
feedback in the R-S3/S6 canonical step). The diff variant differentiates the real landed
physics; ParamSpec covers the live parameters `v0z` (control) and `h` (kernel size).

**EXP-C regime answer (batch-1 hold):** gradient-through-neighbor-search is scoped to a
**fixed-topology interior cloud** — free-fall preserves relative positions exactly, so
the neighbor set is constant over the horizon and the support boundary (q=2) is never
crossed; fixtures sit away from the q=1/q=2 spline knots where the piecewise kernel is
smooth.

## § 2 Physics / governing equations

Free-fall integrator (parent `_integrate`): `v_z(t+1) = v_z(t) + g dt`,
`x(t+1) = x(t) + dt v(t+1)`. SPH density `rho_i = sum_j m_j W(|r_ij|/h, h)`, with the 3D
Monaghan cubic-spline `W(q,h) = sigma_3/h^3 f(q)`, `sigma_3 = 1/pi` (Monaghan 2005,
Rep. Prog. Phys. 68(8) Eq. 2.7; density per Bender & Koschier 2015 SCA Eq. 5) —
identical arithmetic to the landed `sph-water-stack-d` reference; the diff's pair sum is
`ti.static`-unrolled id-order instead of the parent's spatial hash (integer cell indices
are non-differentiable; order is irrelevant at the fixture size, equivalence measured in
`tests/test_forward_equivalence.py`).

## § 3 Verification surfaces

1. **Forward-equivalence (WU-F differentiable axis):** `diff.forward` == parent
   `_evolve` free-fall positions within relative <= 1e-3 (cap 1e-2); density vs the
   parent's spatial-hash density (accumulation-order-only difference). MEASURED values
   recorded at stage 1b. `tests/test_forward_equivalence.py`.
2. **Gradient golden table (gate-4, >=3 independent anchors):**
   `tools/testkit/golden/tables/sph-water-diff-gradient.json` — see § 8.
   `tests/test_gradient_golden.py`; derivation
   `tools/testkit/golden/derivations/sph-water-diff-gradient.md`.
3. **Inverse recovery:** planted `v0z` recovered to < 1e-6 (exact-linear quadratic
   basin). `tests/test_inverse_recovery.py`.

## § 4 Determinism

Expectation: bit-exact, same-stack-same-hw (single-thread CPU, seed-pinned IC; the
loss/density `+=` accumulations are the determinism-sensitive surface, serialised under
`cpu_max_num_threads=1`). MEASURED at stage 1b (`tests/test_determinism.py`); declared in
`tools/testkit/determinism/registry.toml`
`[particle-fluids.sph-water-diff.forward]` + `[particle-fluids.sph-water-diff.gradient]`.
No EFECT (no training-loss distribution).

## § 5 Capture

Inverse-problem solution capture (recovered final positions + gradient) with the
schema-1.1.0 **`gradient_fields`** key populated (`dLoss_dv0z`). Descriptor
`sph-water-diff-recover-v0z-8part-seed42` (problem-scoped, batch-1 diff precedent).
Schema `tools/testkit/schemas/capture-v1.json`.

## § 6 PBT invariant declarations (>=2 per spec § 2.14)

1. **`gradient_matches_finite_difference`** (the differentiable-axis invariant):
   autodiff `dLoss/dv0z` agrees with central FD <= 1e-3. **Regime:** fixed-topology
   interior free-fall cloud. Re-declared on falsification, never widened.
2. **`density_summation_positive`** (forward-physics): kernel positivity (f(q) >= 0,
   f(0)=1) makes every particle's density strictly positive for positive mass.
   **Regime:** any h > 0, finite positions. Exact property (Monaghan 2005).

`packages/sph-water-diff/sph_water_diff/invariants.py`; `tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Monaghan (2005), *Rep. Prog. Phys.* 68(8) Eq. 2.7 — cubic-spline kernel (A3).
- Bender & Koschier (2015), *SCA '15* Eq. 5 — SPH density (parent-shared).
- Hu et al. (2020), "DiffTaichi", *ICLR '20*, arXiv:1910.00935 — differentiable-sim
  method (CITE-DON'T-IMPORT; anchor verified live at the C-1 charter, § 2 row 1).
- The landed `sph-water-stack-d` reference (forward-equivalence; SPlisHSPlasH-anchored
  golden kernel surface).

## § 8 Independent-reference anchors (>=3 per spec § 2.4)

1. **A1 — free-fall control gradient (closed form, hand-derived kinematics):**
   `v_k = v0 + k g dt`, `z_T = z0 + T dt v0 + g dt^2 T(T+1)/2`; gravity/IC cancel in the
   loss difference, so `dLoss/dv0z = 2 N (dt T)^2 (v0z − v0z*)` EXACTLY (the map is
   linear in `v0z`).
2. **A2 — central finite-difference baseline** on `dLoss/dh` (multi-particle cloud
   kernel-width loss; no closed form — distinct numerical method).
3. **A3 — kernel-width pair-density derivative (closed form):**
   `d(rho)/dh = −(m sigma_3/h^4)(3(1+f(q)) + q f'(q))` for a two-particle fixture,
   hand-derived from the Monaghan spline; evaluated on BOTH spline branches (q<1 and
   1<q<2). Distinct physical term (kernel calculus), parameter (`h`), and method.

**D-TOL:** golden-table inline tolerance + the WU-F axis budget +
`GradientCheckReport.tolerance` suffice; NO new `tolerance.toml` row (single-stack;
existing `sph` category resolution; charter § 3.1).

## § 9 Replayable capture

`captures/sph-water-diff/sph-water-diff-recover-v0z-8part-seed42.{h5,json}` + corpus
seed `tests/fixtures/legacy-captures/phase-6-c1-sph-water-diff.{h5,json}` (LFS; stage 1c).

## § 10 Determinism <-> capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"` <-> § 4 registry rows.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Optimization wall-clock row in `docs/perf-ledger.md` (gate-12; stage 1c).

## § 13 Gate-13

Failing-tests evidence replayed at landing (Convention E worktree).

## Gate-14 / mutation

**gate-14 N/A** — single-stack diff (no cross-stack diff sibling); WU-F
differentiable-axis variant-equivalence applies instead (vs the landed Taichi parent).
**Mutation target** (§ 8.7, advisory): `sph_water_diff` (sim source). Registered +
measured at stage 1c.

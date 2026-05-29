# articulated-pedagogical — Reference Spec

> Phase 3 task-4 sim-spec (spec §3.2.8 sheet). Stack E (Python / NVIDIA Warp).
> Reference articulated rigid-body pendulum: Featherstone Articulated-Body
> Algorithm (ABA, reduced/generalized-coordinate forward dynamics) for a planar
> revolute serial chain. Companion: `algebraic.md` (the ABA derivation +
> spatial-algebra conventions). Charter:
> `docs/phases/sub-phase-phase-3-rigid-body.md`.
>
> **D-ALGO (operator-ratified, charter §6):** ABA, reduced-coordinate
> (Featherstone Ch. 7 §7.2–§7.3, pp. 123–131). Spec §5.8 names
> "maximal-coordinate"; that is the verified error — the cited Featherstone
> articulated-body algorithm is reduced-coordinate. Corrigendum **A-1** is filed
> in `docs/spec-amendments-proposed.md` (spec frozen in Phase 3 per
> architecture.md §9.6; operator applies at close).

## 1. Scope

A serial kinematic chain of `n` rigid links joined by revolute joints, all
rotating about the world `z` axis (planar motion in `x-y`), under uniform
gravity in `-y`. Tiers: `single-joint` (simple pendulum, `n=1`),
`double-pendulum` (`n=2`), `6-dof` (`n=6`), `N-link` (arbitrary `n`). The
generalized coordinate `q[i]` is the joint angle of link `i` **relative to its
parent**; the base ("link −1") is the fixed world frame. Joints are frictionless
and unactuated (`τ = 0`); gravity is the only generalized force.

**Out of scope (Phase 4+):** contact mechanics, closed loops (Featherstone Ch.
8/11), maximal-coordinate constraint formulation, differentiable rigid-body,
Newton 1.0 / Isaac Lab integration, USD export (D-USD DEFER → Phase-4 WU-D —
see §-export).

## 2. Upstream and reference anchor

No upstream source code is vendored (Cat 1 trivially passes — textbook citation
only). The algorithm is Featherstone, *Rigid Body Dynamics Algorithms* (Springer
2008): spatial vector algebra (Ch. 2–3), the recursive Newton-Euler / ABA
machinery (Ch. 5, Ch. 7). The analytic pendulum anchors are classical mechanics
(Marion & Thornton; Landau & Lifshitz; NIST DLMF). See §12.

## 3. Algorithm

**Forward dynamics (production):** ABA computes `qdd` from `(q, qd, τ)` in three
passes over the chain (Featherstone Table 7.1):

1. **Outward pass** — propagate link velocities `v_i` and velocity-product
   (bias) terms from base to tip via the joint motion subspace `S_i`.
2. **Inward pass** — propagate the articulated-body inertia `I^A_i` and bias
   force `p^A_i` from tip to base (the recursion that makes ABA O(n) without
   forming the joint-space inertia `H(q)`).
3. **Outward pass** — propagate spatial accelerations `a_i` from base to tip and
   read off the joint accelerations `qdd[i]`.

**Integrators:** semi-implicit (symplectic) Euler is the **default**
(`qd ← qd + dt·qdd; q ← q + dt·qd_new`) — symplectic, so energy drift is bounded
(no secular growth). RK4 is the `--integrator rk4` option (classic 4th-order on
the first-order state `(q, qd)`).

**RK4 reference** (`rk4_reference`): RK4 at `dt/refine` (`refine=100`),
integrating the SAME ABA dynamics — the **numerical baseline** for the
double-pendulum / 6-DOF goldens, explicitly NOT an analytic anchor.

## 4. Algebraic form

See `algebraic.md` for the full ABA derivation (spatial vs body-fixed frames;
Plücker coordinates; revolute joint motion subspace; spatial inertia and
cross-product operators; per-pass equations with Featherstone page+equation
cites). Specialized to the planar revolute chain.

The single-link reduction is the ideal simple pendulum
`q'' = −(g/L) sin(q)` (point mass at distance `L`, `q` from the downward
vertical), which the §7 analytic anchors describe in closed form.

## 5. Implementation

Public API (Cat 2, gate-8) — `articulated_pedagogical`:

- `ArticulatedChain` + `make_simple_pendulum` / `make_double_pendulum` /
  `make_nlink_chain` (model.py — data only).
- `aba_forward_dynamics(chain, q, qd, tau=None) -> qdd` (aba.py — Warp
  `@wp.kernel`, CPU serial, f64).
- `step_semi_implicit_euler` / `step_rk4` / `simulate` / `rk4_reference`
  (integrators.py).
- `total_energy` / `linear_momentum` / `angular_momentum` / `link_positions`
  (dynamics.py).
- `pendulum_period_small_angle` / `pendulum_period_large_angle` /
  `pendulum_angle` (analytic.py — host-side scipy oracles).
- `sim_runner_seeded` (sim.py — canonical capture via common-warp `Capture`).

**Determinism mechanism:** `common_warp.init("cpu", deterministic=True)` +
`set_warp_deterministic(seed)` + `deterministic_context()`. All `wp.array` are
`dtype=wp.float64`; every in-kernel literal is seeded `wp.float64(...)` (the
f64-accumulator discipline carried from the lenia Taichi f32-downcast lesson).

**§-export (D-USD, DEFER).** Spec §2.5 ("every Stack E sim ships USD export")
is **not** satisfied here: common-warp has no USD/Alembic/VDB surface at Phase-3
HEAD, no existing Stack-E sim ships USD export, and building one inline would be
a new load-bearing infrastructure surface with no precedent (Convention I /
rule-of-three). USD export for Stack-E sims is deferred to **Phase-4 WU-D**
(`common_warp.usd`). Carried into the `closed-with-shifted-N` close.

## 6. Verification posture (≥ 2 PBT invariants per spec §2.14)

**Golden anchors (single pendulum, analytic — D-ANCHOR, ≥3 independent):**

- **A1** small-angle period `T0 = 2π√(L/g)` — Marion & Thornton §3.2.
- **A2** large-angle exact period `T = 4√(L/g)·K(sin(θ₀/2))` — NIST DLMF §19.2
  (complete `K`) + §22.19(i) (pendulum) / Landau & Lifshitz *Mechanics* §11.
- **A3** trajectory `θ(t) = 2·arcsin(sin(θ₀/2)·cn(ω₀t, k))`, `k = sin(θ₀/2)`,
  `ω₀ = √(g/L)` — DLMF §22.19(i) + §22.2 (Jacobi `cn`).

The 100×-finer-Δt RK4 reference for the double-pendulum / 6-DOF goldens is a
**numerical baseline, NOT an analytic anchor**.

**PBT invariants (≥2):**

1. `energy_drift_bounded` — frictionless: total-energy drift per second below
   `energy_drift_rel_per_second = 1e-3` under symplectic Euler, random valid ICs.
2. `angular_momentum_about_pivot_conserved` — no external forces (`gravity=0`):
   angular momentum of the base-pinned chain about its pivot is conserved (the
   pin reaction has zero moment about the pin), random valid ICs.

**Physical refinement (Stage 1a SHIFT-on-evidence, mirrors lenia).** The D-PBT
"momentum_conservation (linear + angular)" is physically inapplicable to a
base-**pinned** chain: the pin exerts a reaction force, so linear momentum and
angular-momentum-under-gravity are NOT conserved. The correct realization is
angular momentum about the pivot under zero gravity. This is a re-declaration on
physical evidence, NOT a tolerance widening (HARD RULE 2). Documented in the
stage audits.

## 7. Golden values / Manufactured solutions

- `tools/testkit/golden/tables/rigid-body-pendulum-trajectory.json` — analytic
  single-pendulum `θ(t)` + A1/A2 periods (independent reference: scipy
  `ellipj`/`ellipk` + closed form).
- `tools/testkit/golden/tables/rigid-body-double-pendulum-trajectory.json` —
  RK4-reference Cartesian trajectory (numerical baseline).
- `tools/testkit/golden/tables/rigid-body-6dof-trajectory.json` — RK4-reference
  + energy series (numerical baseline).
- Derivations: `tools/testkit/golden/derivations/rigid-body-pendulum.md`,
  `tools/testkit/golden/derivations/rigid-body-rk4-reference.md`.

Canonical capture (gate-9):
`captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.{h5,json}`.

## 8. Determinism

`[rigid-body.articulated-pedagogical]` (determinism registry): stack `E`, class
`bit-exact`, scope `same-stack-same-hw`, `atomic_ops = none`,
`subgroup_ops = none`, `seed_pinned = true`. MEASURED at Stage 1b via
`assert_deterministic_run` (two runs byte-equal). Capture sidecar
`determinism.claimed = "bit-exact-same-hw"` (gate-10).

## 9. Equivalence

Single-stack Stack-E terminal sim — **no cross-stack equivalence table**, no
`gate-14`. Tolerances land under `[golden_tolerance.rigid-body.articulated-pedagogical]`
in `tools/testkit/equivalence/tolerance.toml` (D-TOL, §S.3): `pendulum_period_rel
= 1e-3`, `trajectory_abs = 1e-2`, `energy_drift_rel_per_second = 1e-3`. No
`[budgets.rigid-body.cross_stack]` cap (no cross-stack pair).

## 10. Diagnostics

Tier-3 diagnostic at `tools/diagnostics/tier3/rigid_body_pedagogical/`
(`Report` classes + `check_*` functions, mirroring the lenia/ising tier-3
shape): energy-conservation bound + period-recovery checks.

## 11. Build and run

`uv sync --all-packages --all-extras`; `python -m articulated_pedagogical --tier
{single-joint,double-pendulum,6-dof,N-link} [--integrator {semi-implicit-euler,rk4}]
[--n N] [--seed N] [--steps N] [--dt F]`. CI job `test-rigid-body-pedagogical`
in `.github/workflows/python-strict.yml` (D-CI; `build-py.yml` does not exist).

## 12. References

- R. Featherstone, *Rigid Body Dynamics Algorithms*, Springer 2008 (Ch. 2–3
  spatial algebra; Ch. 7 §7.2–§7.3 ABA, pp. 123–131).
- J. B. Marion & S. T. Thornton, *Classical Dynamics of Particles and Systems*,
  5th ed., §3.2.
- L. D. Landau & E. M. Lifshitz, *Mechanics*, 3rd ed., §11.
- NIST Digital Library of Mathematical Functions (DLMF), §19.2 (complete
  elliptic integrals), §22.2 + §22.19(i) (Jacobi elliptic functions; pendulum).

## 13. Productization status

Phase-3 reference sim. Frontier variants (Newton 1.0, differentiable rigid-body,
Isaac Lab; spec §5.8) are Phase-4+. USD export deferred to Phase-4 WU-D (D-USD).

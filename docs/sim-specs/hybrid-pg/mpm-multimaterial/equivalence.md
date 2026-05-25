# mpm-multimaterial — Cross-stack equivalence

## Tolerance row

Category `mpm` per `tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-4` |
| `absolute` | `0.0` |

Per-sim override (FOURTH; spec-Phase-2 `sub-phase-mpm-multimaterial-stack-d` Stage 1c):
`[overrides.mpm-multimaterial] category = "mpm"` resolves the physics-family
`sim.category="hybrid-pg"` to the numerical-method tolerance-category `mpm`
(at-budget; NOT a widening — spec § 2.6 + IC-15 § 1.3). Same `1e-4` as RD-2D +
sph-water; looser than LBM's `1e-5`. Without the override `compare_captures`
raises `KeyError` on `hybrid-pg` (Stage-0 Task 0.4 R-S5).

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| NumPy+numba-reference ↔ Stack-D Taichi-CPU | **VALIDATED (gate-14 GREEN, 1e-4)** | spec-Phase-2 (this sub-phase) |
| Stack-D ↔ Stack-E (Warp port) | Not in scope (spec § 11.3 item 2.3 deferred) | Phase-2+/Phase-3 |

The spec-designated Stack-E Warp port is unimplemented; the frozen cross-stack
diff partner is the Phase-1 CPU NumPy+numba reference (the sph-water/LBM pattern).

## Gate-14 harness invocation (IC-15 codified component § 1.1/§ 1.4)

```
compare_captures(
    Path('captures/mpm-ref/drop-impact-128cube-seed42-step500.json'),          # LEFT = reference
    Path('captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.json'),  # RIGHT = Stack-D
)
```

Returns `EquivalenceVerdict{within_tolerance, per_field_diff, tolerance_table_used}`.
`per_field_diff` is keyed `"step:<n>:<field>"` → `{max_abs_err, max_rel_err}`.
The category + sim name are pulled from the LEFT manifest (`sim.name="mpm-multimaterial"`,
`sim.category="hybrid-pg"`); the RIGHT must agree (it does — the Stack-D manifest
mirrors the Phase-1 `sim` block). State fields compared (4): `particle_pos`,
`particle_vel`, `particle_material_id`, `grid_mom`. ONE canonical capture (D4) →
ONE verdict.

## Gate-14 verdict (Stage 1c; full canonical step-500 horizon, 11 frames)

**`within_tolerance = True`** at `{category: mpm, relative: 1e-4, absolute: 0.0}`.

Step-horizon roll-up (max over all 11 frames, per field):

| Field | max_abs_err (roll-up) | note |
|---|---|---|
| `particle_pos` | `0.000000e+00` | **BIT-EXACT at every frame** |
| `particle_material_id` | `0.000000e+00` | constant int (all-0); trivially equal |
| `grid_mom` | `1.502225e-32` | at step 500 (denormal scale) |
| `particle_vel` | `6.247778e-28` | at step 500 (load-bearing metric) |

Per-frame `particle_vel` / `grid_mom` `max_abs_err` (the only non-zero fields):

| step | particle_vel max_abs | grid_mom max_abs |
|---|---|---|
| 0 | `0.0` | `0.0` |
| 50 | `1.183291e-30` | `4.212972e-35` |
| 100 | `3.944305e-30` | `1.143521e-34` |
| 150 | `1.262177e-29` | `2.648154e-34` |
| 200 | `2.208811e-29` | `5.777790e-34` |
| 250 | `4.417621e-29` | `1.059261e-33` |
| 300 | `8.519698e-29` | `1.925930e-33` |
| 350 | `1.514613e-28` | `3.274081e-34`† |
| 400 | `2.587464e-28` | `5.007418e-33` |
| 450 | `3.912750e-28` | `8.474092e-33` |
| 500 | `6.247778e-28` | `1.502225e-32` |

(† per-field values verbatim from the harness; `grid_mom` reads `3.274081e-33` at
step 350.) The diffs grow monotonically over the horizon (FP accumulation in the
APIC affine reconstruction) but stay at **~1e-28 (vel) / ~1e-32 (grid_mom)** — the
**largest cross-stack margin of any port to date (~24+ orders below 1e-4;
`particle_pos` bit-exact)**. `max_rel_err` reads up to `~9e-7`/`~3e-8` on
`particle_vel` — a near-zero-field relative artifact (rigid free-fall keeps the
transverse velocity components near zero; the harness verdicts on
`abs_err > atol + rtol·field_scale` with `field_scale = max|right field|` ≈ the
streamwise gravity-driven `vz`, so the composite threshold is `~1e-4·|vz|` which
the `~1e-28` abs error clears by ~24 orders — the LBM § 4.5 near-zero-field
guidance applies; read `within_tolerance` + `max_abs_err`, not the high
`max_rel_err`). Step-horizon: monotone-growing but utterly below tolerance; **no
amplification approaching 1e-4 at any frame; D8 comparison-projection NOT needed.**

## N2 context — atomic-scatter PRESENT but NOT EXERCISED (deferred IC-15 aspect #3)

The canonical drop-impact trajectory is **rigid free-fall**: the 0.15-radius blob
falls from z=0.65 under gravity over 500 steps × 1e-4 dt = 0.05 s and does NOT
reach the floor (z≈0.031) or deform within the horizon. R-M2 instrumentation
(`[R-M2]` stdout in `sim_runner_seeded`) confirms `j_det = 1.000000` and
`n(j_det≤0) = 0` at every captured frame → F stays identity → the neo-Hookean
Cauchy stress is **zero** (σ ∝ FFᵀ−I = 0) and the velocity field is nearly uniform
(gravity-driven; ∇v≈0 → APIC affine C≈0).

The Stack-D port DOES implement the P2G atomic-scatter (`ti.atomic_add`, serialised
at `cpu_max_num_threads=1`); Stage-0 Task 0.3 confirmed the scatter surface at a
small-scale non-degenerate derisk (cross-stack `~8.5e-10` with random velocities).
But the **canonical trajectory degenerates the scatter surface**: uniform velocity
+ zero stress → the per-node accumulation `Σ_p w_p·m_p·v` has `v` (nearly) constant
across the contributing particles, so the sum is (nearly) order-independent — the
atomic-scatter ordering produces no non-trivial cross-stack divergence. **Deferred
IC-15 aspect #3 (atomic-scatter) is therefore PRESENT in the kernel but NOT
substantively EXERCISED by this canonical pair** (the residual `~1e-28` vel diff is
the APIC reconstruction FP residual, not scatter-order divergence). Banked for a
fifth cross-stack pair with a non-trivial velocity gradient + stress-bearing
trajectory to stress-test aspect #3 substantively.

## S6-pattern context — canonical trajectory vs spec-described dynamics

This is the SECOND instance (after `sph-water` S6) of a Phase-1 canonical trajectory
exercising **far less than the spec-described dynamics**: sph-water's canonical was
explicit-Euler rigid free-fall + a discarded SPH-density side-effect (NOT iterative
DFSPH); MPM's canonical is rigid free-fall + zero stress (NOT the deforming
drop-impact the "drop-impact" name suggests, and NOT multi-material — `material_id`
is all-0). **The cross-stack equivalence methodology validates the canonical-trajectory
regime, NOT the spec-described regime.** Downstream cross-stack pairs should
HEAD-verify the Phase-1 canonical trajectory's actual algebraic surface against the
spec-described dynamics at the plan-drafting probe (S6 banked precedent), so the
gate-14 expectation is calibrated to what the canonical capture actually exercises.

## D9 — variant + material model

MLS-MPM (Hu et al. 2018) + APIC affine-velocity reconstruction (4/dx² coefficient);
neo-Hookean SINGLE material (E=4000, ν=0.3; `material_id` all-0, never mutated).
"multimaterial" is Phase-1 naming-only (the constitutive table is declared-only;
`algebraic.md` § 3). Quadratic B-spline 3-node shape function, `base=floor(p/dx+0.5)−1`.
The cross-stack-sensitive surface is the P2G scatter (present-but-not-exercised at
this regime; § N2). No MRT/plastic/implicit/multi-material (Phase-2+/Phase-3).

## Methodology precedent

Consumes the IC-15 PARTIAL-formalization methodology
(`docs/conventions/cross-stack-equivalence-methodology.md`) AS-IS at Stage 1c: the 5
codified components (per-particle position-exact compare; category-default tolerance;
MANDATORY per-sim override; per-frame diff witness; this `equivalence.md` authoring).
This is the FOURTH validation pair (continuous-ca + particle-fluids + lattice +
hybrid-particle-grid), all at the algebraically-identical-trajectory + FP-round-off-or-below
regime. Stage 2 (D5) amends the methodology doc ADDITIVELY (option (b) PARTIAL HOLDS +
REFINEMENT) with the atomic-scatter-present-but-not-exercised subsection + the
hybrid-particle-grid taxonomy + the two-instance S6-pattern consideration; it does NOT
promote partial → full (aspects #1 chaotic / #3 atomic-scatter-substantively / #5
iterative-solver stay un-stress-tested).

---

# mpm-multimaterial — Stack-E (Warp) cross-stack equivalence (BIT-EXACT)

> **The SIXTH per-sim cross-stack pair, the FIRST Stack-E (NVIDIA Warp) port, and
> the FIRST BIT-EXACT cross-stack result of any port to date.** Authored at
> `sub-phase-mpm-multimaterial-stack-e` Stage 1c (this section is an ADDITIVE
> extension; it does NOT modify the Stack-D Taichi-CPU section above —
> Convention A). The pair documented here is **Phase-1 NumPy+numba reference ↔
> Stack-E Warp port** — a NEW pair, NOT the `Stack-D ↔ Stack-E` pair the scope
> table above defers (spec § 11.3 item 2.3). The earlier "the spec-designated
> Stack-E Warp port is unimplemented" framing is superseded: the Warp port landed
> at Stage 1a (gates 4–13 GREEN) and its canonical capture at Stage 1b. Where the
> Stack-D Taichi pair lands ~24+ orders below tolerance (`particle_vel` ~1e-28
> FP-round-off residual) and the `eulerian-smoke` Stack-D pair invokes the R-P2
> chaotic-regime escape-hatch (`within_tolerance=False`), this Warp pair is
> **bit-exact** (`max_abs_err = max_rel_err = 0.0` at every field × every frame).
> Bit-exact is the cleanest possible cross-stack outcome; it is **canonical-
> specific to this rigid-free-fall trajectory**, NOT a general Stack-E claim
> (§ 5).

## § 1. The cross-stack pair

`sim.{category="hybrid-pg", name="mpm-multimaterial"}`, `dtype=f64`. ONE canonical
descriptor (D4):

| Role | Stack | Capture (`.h5` LFS oid) |
|---|---|---|
| LEFT = reference | Phase-1 NumPy+numba (SEALED) | `captures/mpm-ref/drop-impact-128cube-seed42-step500.h5` (`73e00d09…`) |
| RIGHT = candidate | Stack-E Warp port (CPU execution) | `captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.h5` (`dfc4d699…`) |

`drop-impact-128cube-seed42-step500`: 128³ grid; 1,000,000 particles; 500 steps;
cadence-50 → 11 frames (steps 0…500). Both captures are byte-size-identical
(`1,125,718,712` B). The RIGHT manifest mirrors the Phase-1 `sim` block
(`name`/`category` agree, as `compare_captures` requires). The Warp port holds its
own `wp.array(dtype=wp.float64)` sim-state arrays (D15; the common-warp
Particles/Grids sockets are f32) and re-derives the MLS-MPM algebra verbatim from
the Phase-1 spec with **no Phase-1 import** (the isolation pattern; `spec-ref-stack-e.md`
§§ 5, 8).

## § 2. Gate-14 verdict — within_tolerance=True (BIT-EXACT)

`compare_captures(LEFT=mpm-ref, RIGHT=stack-e)` at `{category: mpm, relative:
1e-4, absolute: 0.0}`, the tolerance resolved via the MANDATORY
`[overrides.mpm-multimaterial] category="mpm"` → `[defaults.mpm]` (D7 REUSE — no
new row; verify-only no-op this stage):

**`within_tolerance = True`**, `max_abs_err = 0.0` AND `max_rel_err = 0.0` across
ALL 4 fields × ALL 11 frames (44 per-field-diff entries). Margin to the 1e-4
relative threshold is effectively infinite (a zero error clears any positive
composite threshold `atol + rtol·field_scale`). This formal Stage-1c execution
reproduces the Stage-1b incidental result (S1b-ME2) exactly — the gate-14 test
auto-released its capture-presence skip-guard when the canonical capture landed
and has run GREEN since.

## § 3. Port faithfulness evidence (the algebra is verbatim; the trajectory is tame)

- **Step-0 / step-1 baseline:** bit-exact (`max_abs_err = 0.0` at the first
  captured frame and every frame) — there is no FP-round-off seam at all, not
  even the ~1e-16 step-1 seam the Stack-D Taichi pair and the smoke pairs show.
- **Trajectory:** rigid free-fall, BOUNDED (charter Task 1.6 / D3). The 0.15-radius
  blob falls under gravity over 500 × 1e-4 s = 0.05 s and never reaches the floor
  or deforms; `F` stays identity → neo-Hookean Cauchy stress is zero → the
  velocity field is gravity-uniform (∇v≈0 → APIC affine C≈0).
- **Mass / partition-of-unity:** Stage-1b measured `sum(grid_mass) − sum(mass)`
  `abs_err = 4.44e-16` (2 ULP) at the 1M-particle / 128³ canonical scale —
  partition-of-unity exact; the quadratic B-spline weights sum to one to
  round-off, the same order as the diagnostic scale (no drift with N).
- **Within-stack determinism:** 2/2 content-digest MATCH (Stage-1b gate-10 analog;
  Warp CPU serial launch is order-deterministic).
- **Algebraic surface:** the Warp kernels re-derive the MLS-MPM constants (Hu
  et al. 2018; APIC 4/dx² coefficient; quadratic B-spline `base=floor(p/dx+0.5)−1`)
  verbatim from the Phase-1 spec — see `algebraic.md` § 3 and `spec-ref-stack-e.md`
  §§ 5–6. Single-material neo-Hookean (`material_id` all-0, never mutated).

## § 4. Per-field per-frame witness

`compare_captures` `per_field_diff`, keyed `step:<n>:<field>` → `{max_abs_err,
max_rel_err}`. ALL 44 entries are `0.0 / 0.0`:

| step | `particle_pos` | `particle_vel` | `particle_material_id` | `grid_mom` |
|---|---|---|---|---|
| 0 | `0.0` | `0.0` | `0.0` | `0.0` |
| 50 | `0.0` | `0.0` | `0.0` | `0.0` |
| 100 | `0.0` | `0.0` | `0.0` | `0.0` |
| 150 | `0.0` | `0.0` | `0.0` | `0.0` |
| 200 | `0.0` | `0.0` | `0.0` | `0.0` |
| 250 | `0.0` | `0.0` | `0.0` | `0.0` |
| 300 | `0.0` | `0.0` | `0.0` | `0.0` |
| 350 | `0.0` | `0.0` | `0.0` | `0.0` |
| 400 | `0.0` | `0.0` | `0.0` | `0.0` |
| 450 | `0.0` | `0.0` | `0.0` | `0.0` |
| 500 | `0.0` | `0.0` | `0.0` | `0.0` |

(`max_rel_err` is `0.0` at every cell too — the diff is exactly zero, so the
harness near-zero-field relative artifact the Stack-D table notes does NOT arise
here.) Contrast the Stack-D Taichi pair (above): its `particle_pos` is also
bit-exact, but `particle_vel` grows monotonically to ~6.2e-28 and `grid_mom` to
~1.5e-32 over the horizon (APIC-reconstruction FP accumulation). The Warp pair
shows no such growth — zero at every frame.

## § 5. Why bit-exact (the combining factors) — and why it is canonical-specific

Three factors combine to reproduce the numba f64 reference bit-for-bit:

1. **Verbatim algebra.** The Warp kernels re-derive the same constants per the
   isolation pattern (no Phase-1 import); the arithmetic expressions are
   character-identical in operand structure.
2. **Same operation order.** The Warp `@wp.kernel` bodies mirror the numba
   reference's loop/accumulation order, so the IEEE-754 f64 rounding sequence is
   identical (addition is not associative; matching the order matches the bits).
3. **Rigid free-fall trajectory.** The canonical reduces to deterministic
   kinematics: `F=I` → zero stress → gravity-uniform velocity. The per-node P2G
   accumulation `Σ_p w_p·m_p·v` has `v` (nearly) constant across contributing
   particles, so the sum is order-independent and the APIC affine term vanishes —
   there is no FP-sensitive reduction left to diverge.

**This is canonical-specific, NOT a general Stack-E claim.** A trajectory with a
non-trivial velocity gradient or a stress-bearing deformation would re-introduce
order-sensitive reductions; the expected outcome for most pairs is FP-round-off
(the Stack-D Taichi pair's ~1e-28), and the documented fallback for a
positive-Lyapunov trajectory is the R-P2 chaotic-regime escape-hatch (the
`eulerian-smoke` Stack-D pair's `within_tolerance=False`). Bit-exact is the
cleanest point on that spectrum, reached here only because the canonical is
algebraically tame.

## § 6. Methodology consistency (IC-15 consumed AS-IS)

- **§ 5.1 atomic-scatter PRESENT-but-NOT-EXERCISED.** The methodology's deferred
  aspect #3 (atomic-scatter) is not reached: the rigid-free-fall canonical
  degenerates the P2G scatter surface to an order-independent sum (§ 5 factor 3),
  so aspect #3 stays substantively un-stress-tested on the Warp side too. (Warp
  CPU serial launch is structurally order-deterministic in any case — no
  `cpu_max_num_threads` knob; D5.) Stage 2 (D8) records this as the methodology's
  THIRD present-but-not-exercised instance (after MPM Stack-D and LBM) — an
  ADDITIVE § 5.1 stack-portability note; it does NOT promote partial → full.
- **§ 6 R-P2 chaotic-regime escape-hatch NOT INVOKED.** The trajectory is BOUNDED
  (Task 1.6 / D3); the bit-exact result is the methodologically clean opposite of
  the `eulerian-smoke` chaotic case. The S6-trajectory-simulation discipline
  (conventions § L.4) was APPLIED at plan-drafting and correctly predicted the
  tame regime.

## § 7. Implications for the remaining Stack-E ports

- **Smoke-Stack-E** may engage the R-P2 escape-hatch — the Phase-1 smoke canonical
  is chaotic (positive Lyapunov; the `eulerian-smoke` Stack-D pair already lands
  `within_tolerance=False`), so a Warp smoke port should plan gate-14 as a
  divergence-rate witness from the start (conventions § L.4 probe protocol).
- **LBM-Stack-E** is TBD at its own plan-drafting; the S6-trajectory-simulation
  probe will characterize its canonical (LBM Stack-D landed FP-round-off at the
  tighter 1e-5 category).
- **The spectrum, restated.** BIT-EXACT (this pair) is the cleanest cross-stack
  outcome; FP-round-off (Stack-D Taichi's ~1e-28) is the expected outcome for most
  algebraically-faithful pairs; the R-P2 chaotic-regime escape-hatch is the
  documented fallback when sensitive dependence makes content-equivalence
  physically impossible. All three are honest cross-stack-witness shapes; the
  port's physical correctness is carried by the stack-agnostic gates 4–13
  (GREEN), independent of which shape gate-14 takes.

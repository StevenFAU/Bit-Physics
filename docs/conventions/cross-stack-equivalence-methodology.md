# IC-15 — Cross-Stack Equivalence Methodology (PARTIAL formalization)

> **Status: PARTIAL formalization.** Codifies ONLY the components empirically
> validated across the first **two** cross-stack pairs
> (`reaction-diffusion-2d` Stack-D + `sph-water` Stack-D). **Both pairs were at
> the algebraically-identical-trajectory regime, where the cross-stack diff stays
> at FP-round-off scale.** The methodology has **NOT** been stress-tested at
> iterative-solver / atomic-scatter / chaotic-amplification / lattice-velocity-
> quantization regimes. **The third cross-stack pair lands the methodology's full
> stress test and the full-formalization opportunity.**
>
> Established: `sub-phase-sph-water-stack-d` Stage 2 (D5 routing = option (c)
> partial formalization). Supersedes the per-pair "IC-15 candidate" framing for
> the codified components below; the deferred components remain candidate-status.

## 0. What IC-15 is

A reusable methodology for verifying that a Stack-D (Taichi-DSL / CPU) per-sim
port is **content-equivalent** to its frozen reference capture, per spec § 2.6
(cross-stack content-equivalence is the relaxation of the IC-13 same-stack
zero-tolerance contract). It is the Phase-2 14th acceptance gate (gate 14).

Validated pairs:
- **RD-2D Stack-D** (`continuous-ca` / reaction-diffusion): Stack-B WGSL reference
  ↔ Stack-D Taichi. `max_abs_err` ~1.9e-14 (~10 orders of margin vs 1e-4).
- **sph-water Stack-D** (`particle-fluids` / DFSPH): NumPy-reference ↔ Stack-D
  Taichi. position+velocity bit-identical; density `max_rel_err` 1.585292e-15
  (~11 orders of margin vs 1e-4).

## 1. CODIFIED components (validated across both pairs)

### 1.1 Per-cell / per-particle position-exact comparison
The diff is element-wise exact over every captured frame × every state field via
`equivalence.harness.compare_captures(left, right)`. RD-2D compares per-cell
scalar fields (`U`, `V` at each lattice point); sph-water compares per-particle
`position`, `velocity`, `density`. Acceptance per element:
`abs_err > atol + rtol·scale` (scale = `max(|right field|)`) flips
`within_tolerance` to `False`. This realises the spec § 2.6 content-equivalent
posture.

### 1.2 Category-default tolerance via `tolerance.toml [defaults.<category>]`
Both pairs run at the category default (no per-sim widening):
`[defaults.reaction-diffusion] relative = 1e-4` and `[defaults.sph]
relative = 1e-4` (both `absolute = 0.0`). The category-default is gated by
`tolerance-budget.toml [budgets.<category>.cross_stack]`; an at-budget value
needs no budget amendment.

### 1.3 Per-sim override pattern (MANDATORY for cross-stack-tested sims)
`[overrides.<sim-name>] category = "<tolerance-category>"` maps the **physics-
family** `sim.category` to the **numerical-method** tolerance-category. Two
instances:
- `[overrides.reaction-diffusion-2d] category = "reaction-diffusion"`
  (`continuous-ca` → `reaction-diffusion`).
- `[overrides.sph-water] category = "sph"` (`particle-fluids` → `sph`).

This is **MANDATORY**: without it, `compare_captures` raises `KeyError` on the
physics-family category (there is no `[defaults.<physics-family>]`). The override
is **resolution wiring, not a widening** (it resolves to the category default).
The two-taxonomy distinction (physics-family vs numerical-method) is the load-
bearing insight; verified empirically at each sub-phase's Stage-0 R-A1/R-S5 task.

### 1.4 Per-frame diff witness format
`compare_captures` returns `EquivalenceVerdict{within_tolerance: bool,
per_field_diff: dict, tolerance_table_used: dict}`. `per_field_diff` is keyed
`"step:<n>:<field>"` → `{max_abs_err, max_rel_err}`. The landing/Stage-1c audit
records the per-frame witness verbatim + a step-horizon roll-up (max over frames,
per field) **regardless of pass/fail**. No silent tolerance widening (spec § 2.6
+ § L): a widening requires a separate operator-approved commit + budget amendment.

### 1.5 Per-sim `equivalence.md` authoring pattern
Each cross-stack-tested sim carries `docs/sim-specs/<family>/<sim>/equivalence.md`
(created de-novo or extended additively from a Phase-1 stub) documenting: the
cross-stack pair; the harness invocation; the two-taxonomy tolerance resolution;
the step-horizon discipline; the per-field witness; the per-pair R-P2 disposition;
and the methodology precedent. RD-2D authored its file de-novo; sph-water extended
a pre-existing Phase-1 stub (Convention A).

## 2. DEFERRED components (NOT codified — candidate-status; third pair stress-tests)

1. **R-P2 chaotic-regime escape-hatch substantive details.** The first four
   validated pairs had R-P2 (chaotic-divergence) empirically dissolved (RD-2D:
   algebraic identity across stacks; sph-water: rigid-free-fall trajectory +
   discarded SPH side-effect per S6; LBM: laminar single-pass dissipative; MPM:
   rigid free-fall). The operator-routing playbook — among tolerance-amendment /
   step-horizon-override / implementation-debug (P27-analog) — was **unproven**.
   **Now FORMALIZED (see § 6):** the FIFTH pair (`eulerian-smoke`) is the first to
   exercise R-P2 substantively — both canonical trajectories are numerically
   unstable (positive Lyapunov), so cross-stack content-equivalence is physically
   impossible at non-trivial horizons; gate-14 `within_tolerance=False` is the
   CORRECT verdict and the escape-hatch is invoked (Option-2 routing). § 6
   formalizes when the escape-hatch applies, the evidence that justifies it, how
   `equivalence.md` documents it, its interaction with gates 4-13, and the
   plan-drafting probe implications. This is a promotion of THIS deferred
   component to formalized; the remaining deferred aspects (#2, #3, #5) stay
   candidate-status, so the methodology overall remains PARTIAL.
2. **D8 comparison-projection axis.** Position-binned histograms / per-particle-
   density / energy-momentum-conservation as alternatives to position-exact
   comparison. Not needed for two algebraically-identical-trajectory pairs.
3. **Atomic-scatter handling.** A Stack-C (Vulkan) forward concern (atomic
   scatter-add in neighbor accumulation; FMA fusion; subgroup collectives — spec
   § 2.5 epsilon-class). Out of scope for Stack-D-only CPU ports.
4. **Lattice-velocity quantization handling.** LBM-specific; surfaced as the
   third pair (`sub-phase-lattice-boltzmann-d3q19-stack-d`). **Now data-backed**
   (see § 4): reframed as collision-step FP-accumulation (D9) and handled by the
   f64 accumulator-seed pattern; the cross-stack diff stayed at FP-round-off scale
   (`~1e-15`), so the validated REGIME is unchanged (still algebraically-identical-
   trajectory). Codified additively in § 4; NOT a promotion to full formalization.
5. **Iterative-solver chaotic amplification.** A true iterative DFSPH pressure
   solve (different from the Phase-1 sph-water reference's explicit-Euler
   trajectory per S6) or other iterative methods would stress-test cross-step FP
   amplification across the horizon.

## 3. Banked methodology-precedents (carry forward)

- **S6 (read Phase-1 `sim.py`):** plan-drafting probes for cross-stack ports MUST
  read the Phase-1 `sim.py` *implementation* at HEAD — not just the spec sheet /
  `algebraic.md` — to understand what behaviour the cross-stack port actually
  validates. The sph-water charter's R-S1/R-S2 framing assumed an iterative DFSPH
  trajectory the Phase-1 reference does not use (it ships explicit-Euler rigid
  free-fall with the SPH continuity as a discarded per-step side-effect).
- **Stage-0 R-A1/R-S5:** empirically invoke `compare_captures` against a synthetic
  manifest carrying the real `sim.category` at Stage 0 to confirm the `KeyError`-
  without-override behaviour (catches the D6 taxonomy-resolution gap pre-Stage-1c).
- **commit-first-then-sha256:** the cross-stack `.json` capture lacks a trailing
  newline; the end-of-files hook rewrites it at commit, so the committed-blob
  sha256 (via `git cat-file`) is authoritative, not the in-memory pre-commit value.

## 4. Third-pair refinements (sub-phase-lattice-boltzmann-d3q19-stack-d Stage 2; D5 (b))

> **ADDITIVE amendment (Convention A); NOT a promotion partial → full.** The third
> cross-stack pair (`lattice` physics family) validated the codified components
> (§ 1) at a third physics family, exercising previously-deferred aspect #4
> (collision-step FP-accumulation, D9) — but at the SAME algebraically-identical-
> trajectory regime where the cross-stack diff stays at FP-round-off scale
> (Poiseuille rho/u max_abs `~5.8e-15`/`6.2e-15`; Couette `~3.3e-15`/`1.3e-15`;
> both `within_tolerance=True` at `1e-5`, ~10 orders of margin). Remaining deferred
> aspects (#1 R-P2 chaotic / #3 atomic-scatter / #5 iterative-solver amplification)
> STAY un-stress-tested → full IC-15 formalization remains DEFERRED to a pair that
> exercises them.

### 4.1 Collision-step FP-accumulation handling (in-kernel f64 reductions)

Sims with **in-kernel reductions** (LBM's per-cell 19-term collision-moment sums)
require explicit `ti.f64(0.0)` accumulator seeds. `set_taichi_deterministic` pins
arch/threads/seed/offline_cache but NOT `default_fp=ti.f64`; a bare `0.0` kernel
local infers f32 and leaked `3.4e-6` at the LBM Stage-0 derisk, vs `7e-15` with the
seed. Port-local config (no IC-11 edit). This is the **cross-stack-non-trivial
surface** for grid-kinetic methods (D9); the f64-seed pattern keeps it at
FP-round-off scale. (sph-water's analogous f64-typed `ti.types.ndarray` args keep
its non-reduction kernels f64; LBM is the first with genuine in-kernel reductions.)

**SECOND-INSTANCE amendment (`sub-phase-lattice-boltzmann-d3q19-stack-e` Stage 2; D11; ADDITIVE).**
LBM Stack-E (NVIDIA Warp CPU port) re-runs the SAME D3Q19 BGK collision-step
FP-accumulation surface (the per-cell 19-term moment reductions — `density_field`
`f.sum(axis=0)`, `momentum_field` `einsum`, the feq polynomial) on a SECOND backend
and is the **FIRST Warp measurement** of deferred aspect #4. The Warp form of the
f64-accumulator-seed discipline is `wp.float64(0.0)` reduction seeds +
`wp.float64(1.0)` feq literal + precomputed f64 `c_s²`-derived constants
(`inv_cs2`/`inv_cs4`/`inv_two_cs2`/`inv_two_cs4`) + the lex 19-direction order
preserved. With those, the collision-step reductions reproduce the sealed NumPy
reference **bit-for-bit** (`max_abs_err = 0.0` full-horizon, both canonicals;
`equivalence.md` § E) — even cleaner than Stack-D Taichi's `~6e-15` (Taichi's
division-form feq + summation order leaves a residual; Warp CPU f64's scalar IEEE-754
ops, with no FMA fusion / no reassociation when op-order is preserved, do not). The
collision-step FP-accumulation is therefore **determinism-safe AND cross-stack
bit-faithful on Warp CPU f64**; aspect #4 stays data-backed but at the same
algebraically-identical-trajectory regime (laminar, dissipative) — NOT a promotion to
full formalization. (See § 6.7 for the within-sim cross-backend reading and § 6.8 for
the backend-pair observation this second data point feeds.)

### 4.2 Dual-arm gate-4 verification surface

A port may carry BOTH a golden-table arm (4a) AND an MMS arm (4b) — LBM Stack-D is
the first (4a: D3Q19 equilibrium golden reproduced bit-identically, max_abs `0.0`;
4b: MMS observed OOA `2.39`, within ±0.5 of formal `p=2`, over the shared
`incompressible_ns_2d` solution). Banked precedent for multi-method verification
surfaces: each arm is independent; both must pass for gate-4 GREEN.

### 4.3 `1e-5` vs `1e-4` tolerance-category routing

Cross-stack tolerance varies by `[defaults.<category>]`: `reaction-diffusion` + `sph`
at `1e-4`; `lbm` at `1e-5` (10x tighter). The category default is authoritative;
subsequent ports verify the `[defaults.<category>]` value at HEAD (Stage 0 routing)
rather than assuming the prior pair's tolerance. A tighter category gives less
gate-14 headroom by design — but the FP-round-off-scale diff (§ 4.1) clears even
`1e-5` by ~10 orders for the algebraically-identical-trajectory regime.

### 4.4 Dual-canonical-capture + two-seeded-runner pattern

Sims with multiple canonical scenarios (LBM's Poiseuille + Couette) ship **two
seeded runners** (`sim_runner_seeded` + `sim_runner_seeded_couette`) → two canonical
captures → two perf-ledger rows → **two independent gate-14 verdicts**. The
methodology applies per-capture; verdicts are independent (a PARTIAL pass — one
GREEN, one FAIL — is a STOP-and-surface signal, not an averaged result). The
schema-corpus carries one entry per capture (both via LFS — § 4.5 note below).

### 4.5 Near-zero-field-value relative-error harness-artifact

When a captured field is near-zero over much of its domain (LBM's transverse
velocity `u_y, u_z ~ 1e-15` in unidirectional Poiseuille/Couette flow), the
per-element `max_rel_err` can read `~2.0` (a signed `~1e-15` difference over a
near-zero denominator). This is an **informational artifact, NOT a failure**:
`compare_captures` verdicts on `abs_err > atol + rtol·field_scale` with
`field_scale = max(|right field|)` (the streamwise component, `~0.01`–`0.05`),
giving a composite threshold `~1e-7` that the `~6e-15` abs error clears. Banked
guidance: read `within_tolerance` (the composite-threshold verdict), treat a high
`max_rel_err` on a near-zero field as expected, and report the `max_abs_err` as the
load-bearing cross-stack metric. (A storage-routing corollary surfaced here too:
full-cadence LBM canonical `.h5` are large — Poiseuille ~202 MB — so the
schema-corpus fixtures route through LFS per the `.gitattributes`
`tests/fixtures/legacy-captures/**/*.h5` rule added this stage.)

## 5. Fourth-pair refinements (sub-phase-mpm-multimaterial-stack-d Stage 2; D5 (b))

> **ADDITIVE amendment (Convention A); NOT a promotion partial → full.** The fourth
> cross-stack pair (`hybrid-pg` physics family; MLS-MPM/APIC neo-Hookean
> single-material) validated the codified components (§ 1) at a fourth physics
> family — but at the SAME algebraically-identical-trajectory regime, this time at
> FP-round-off-or-BELOW scale (`particle_pos` BIT-EXACT `0.0` at every frame;
> `particle_vel` `max_abs 6.25e-28`; `grid_mom` `1.50e-32`; `within_tolerance=True`
> at `1e-4`, ~24-order margin — the largest of any pair to date). The remaining
> deferred aspects (#1 R-P2 chaotic / #3 atomic-scatter / #5 iterative-solver
> amplification) STAY un-stress-tested → full IC-15 formalization remains DEFERRED
> to a pair that exercises them. The methodology now spans four physics families
> (continuous-ca + particle-fluids + lattice + hybrid-particle-grid) at the same
> regime.

### 5.1 Atomic-scatter-PRESENT-but-NOT-EXERCISED pattern (deferred aspect #3)

MPM Stack-D's P2G uses `ti.atomic_add` at grid-node accumulation — the atomic-scatter
surface that deferred IC-15 aspect #3 names. The Stage-0 Task-0.3 derisk demonstrated
a `~8.5e-10` cross-stack diff at a small-scale NON-degenerate scenario (random
velocities → reorderable non-trivial sums; threads=8 run-to-run NOT bit-exact). **But
the canonical trajectory does NOT exercise the surface:** the drop-impact is rigid
free-fall (the blob never reaches the floor or deforms within the horizon), so `F=I` →
neo-Hookean stress is zero → the velocity field is nearly uniform → the per-node
`Σ_p w_p·m_p·v` sums are (nearly) order-independent (no non-trivial values to reorder).
The serialised `cpu_max_num_threads=1` posture makes the scatter run-to-run bit-exact;
the residual `~1e-28` cross-stack vel diff is the APIC reconstruction FP residual, NOT
scatter-order divergence. **Codified pattern:** a deferred aspect can be PRESENT in a
port's kernel yet NOT substantively EXERCISED by its canonical trajectory. Aspect #3
stays substantively un-stress-tested; banked for a fifth pair whose trajectory carries
a non-trivial velocity gradient + a stress-bearing material model (plastic / hyperelastic
deformation; impact/contact) to drive non-trivial reorderable scatter sums. (Analogous
to LBM's #4, which was data-backed but at the same trivial regime.)

**THIRD-INSTANCE amendment (`sub-phase-mpm-multimaterial-stack-e` Stage 2; D8; ADDITIVE).**
MPM Stack-E (NVIDIA Warp CPU port) re-runs the SAME canonical (`drop-impact-128cube-seed42-step500`)
on a SECOND backend and reproduces the present-but-not-exercised disposition exactly:
the rigid-free-fall trajectory degenerates the P2G scatter surface (`F=I` → zero stress
→ gravity-uniform velocity → order-independent per-node sums), so aspect #3 stays
substantively un-stress-tested on Warp too. Two backend-specific notes: (a) Warp CPU's
single-threaded serial `wp.launch` is **structurally** order-deterministic (no
`cpu_max_num_threads` knob to set — contrast Taichi's explicit serialisation); (b) the
cross-stack result is even cleaner than Stack-D's — **BIT-EXACT** (`max_abs_err = 0.0`
all fields/frames) vs Stack-D's `~1e-28` APIC FP residual (`equivalence.md` Stack-E
section). **The pattern is therefore STACK-PORTABLE (Taichi `ti.atomic_add` CPU → Warp
serial-launch CPU), not Taichi-specific** — a deferred aspect that a port's kernel
implements can be left substantively un-exercised by the canonical trajectory regardless
of backend. With three data-backed instances (MPM Stack-D atomic-scatter; LBM #4; MPM
Stack-E atomic-scatter), the present-but-not-exercised pattern GRADUATES from a
two-instance observation to an **established portfolio pattern**. (This does NOT promote
IC-15 partial → full: aspect #3 remains substantively un-stress-tested; it is now
established that it is *consistently* un-exercised by the canonical trajectories, across
backends — a stronger statement of the same gap, banked for a stress-bearing trajectory.)

### 5.2 Hybrid-particle-grid taxonomy (`hybrid-pg` → `mpm`)

`[overrides.mpm-multimaterial] category = "mpm"` resolves the physics-family
`sim.category="hybrid-pg"` to the numerical-method tolerance-category `mpm` (at-budget;
`[defaults.mpm]` = `relative 1e-4, absolute 0.0` — same as RD-2D/sph, looser than LBM's
1e-5). FOURTH instance of the physics-family → numerical-method indirection (§ 1.3):
`continuous-ca`→`reaction-diffusion`, `particle-fluids`→`sph`, `lattice`→`lbm`,
`hybrid-pg`→`mpm`. The pattern is now firmly established across four families; the
MANDATORY-override insight (§ 1.3) holds for the hybrid particle-grid taxonomy too.

### 5.3 S6 two-instance pattern — canonical trajectory vs spec-described dynamics

A Phase-1 canonical trajectory may exercise **far less than the spec-described dynamics**.
This is now a TWO-INSTANCE pattern: (a) `sph-water` S6 — the canonical was explicit-Euler
rigid free-fall + a discarded SPH-density side-effect, NOT iterative DFSPH; (b)
`mpm-multimaterial` N2 — the canonical "drop-impact" is rigid free-fall + zero stress,
NOT a deforming impact, and single-material (`material_id` all-0), NOT multi-material.
**The cross-stack equivalence methodology validates the canonical-trajectory regime, NOT
the spec-described regime.** Methodology consideration (now load-bearing across pairs):
downstream cross-stack-pair plan-drafting probes MUST read the Phase-1 `sim.py` at HEAD
(S6 banked precedent) and HEAD-verify the canonical trajectory's actual algebraic surface
against the spec-described dynamics, so the gate-14 expectation is calibrated to what the
canonical capture actually exercises — not to the richer dynamics the spec/name implies.

### 5.4 Legacy-captures schema-corpus entry size bound (representative-subset class)

The backward-compat schema-corpus (`tests/fixtures/legacy-captures/`; spec § 2.12)
exercises capture-I/O **schema** round-trip, NOT full simulation content. Production
canonical captures can be too large to park there cleanly: MPM Stack-D's canonical is
~1.05 GiB (clearly over the line); LBM's full-cadence Poiseuille (~202 MB) was already
on the edge. **Codified bound: schema-corpus entries SHOULD stay ≤ ~256 MiB**
(`268,435,456` bytes — a round binary bound above the two largest accepted entries: LBM
Poiseuille 202 MB + MPM 2-frame representative 195 MiB, with headroom, and well below the
rejected first-5-frames 511 MB / the 1.05 GiB canonical). When a port's canonical exceeds
the bound, land a **representative subset** (a distinct artifact class from the production
canonical): a deterministic, data-only **first-N-frames** extraction preserving the full
schema structure (every state + diagnostic field × the first N frames) via the canonical
reader + `write_capture` re-emit (NO sim re-run) — see `tools/testkit/scripts/extract_capture_subset.py`.
MPM Stack-D landed the FIRST representative subset (first-2-frames; 195 MiB). Future pairs
needing larger fixtures route a **smaller-scenario variant** (fewer particles / coarser
grid / fewer steps) rather than stretching this bound. (This codifies what was implicit
heuristic across the prior four sub-phases.)

## 6. Fifth-pair refinements (sub-phase-eulerian-smoke-stack-d Stage 2; Option-2 routing)

> **ADDITIVE amendment (Convention A); a PROMOTION of deferred component § 2 item 1
> (R-P2 chaotic-regime escape-hatch) from deferred → FORMALIZED — NOT a promotion
> of the methodology partial → full** (aspects #2/#3/#5 stay candidate-status). The
> fifth cross-stack pair (`volumetric-grid` physics family; Stam-Fedkiw
> stable-fluids) is the FIRST of the five spec-Phase-2 pairs to exercise R-P2
> substantively: BOTH canonical trajectories are numerically UNSTABLE (positive
> Lyapunov exponent), so the cross-stack diff does NOT stay at FP-round-off scale —
> it grows exponentially to O(field). Gate-14 returned `within_tolerance=False` on
> BOTH descriptors, and this is the CORRECT verdict (Option-2 operator routing):
> the equivalence harness is a test, not an aspiration (spec § 3.6); when a pair
> fails the test for a documented physical reason (chaos), the escape-hatch
> acknowledges it. Evidence verbatim from the Stage-1 partial checkpoint § S1-4 /
> § 6 (`docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1-checkpoint-2026-05-24T17-29-59Z.md`).
> The note: the prior four pairs' FP-round-off margins do NOT auto-inherit; each
> pair's regime must be assessed empirically.

### 6.1 The R-P2 chaotic-regime escape-hatch — when it applies

A cross-stack pair invokes the escape-hatch when **BOTH** hold: **(i)** its
canonical trajectory has a **positive Lyapunov exponent** (sensitive dependence on
initial conditions), AND **(ii)** the two backends carry a **non-zero cross-stack
seed-difference** (they differ at FP-round-off scale from the first step). A chaotic
trajectory amplifies that step-1 difference exponentially until it saturates at the
field magnitude; cross-stack content-equivalence at the category tolerance
(`relative=1e-4`) over a non-trivial horizon is then **physically impossible** —
NOT a port defect, NOT a tolerance-calibration problem. The escape-hatch is the
correct disposition; `within_tolerance=False` is the correct verdict.

> **`SHIFTED` (seventh-pair re-characterization; § 6.7):** condition (ii) is
> load-bearing and was IMPLICIT in the first instance. Chaos (i) **amplifies** an
> existing seed-difference; it does NOT **manufacture** one. A pair with a chaotic
> trajectory BUT a **zero** cross-stack seed-difference (verbatim re-derived algebra
> + identical operation order) stays **bit-exact** through the entire chaotic horizon
> — `within_tolerance=True`, NOT the escape-hatch. R-P2 is therefore **NOT
> automatically stack-portable**: it is a property of the backend-PAIR's arithmetic,
> not of the (shared) chaotic trajectory. See § 6.7 (eulerian-smoke Stack-E, the
> data-backed counter-instance).

This is distinct from the four prior pairs, all at the **algebraically-identical-
trajectory regime** (the cross-stack diff stays flat at ~1e-15 across the full
horizon — no amplification). The discriminator is the **divergence RATE across the
horizon**, not the diff at any single frame.

### 6.2 Evidence that justifies invocation (smoke, the data-backed first instance)

Two independent, falsifiable conditions — BOTH must hold:

1. **Port faithfulness at step 1** (the trajectory is not yet diverged): the
   Stack-D port matches the frozen reference to FP-round-off at the first step.
   Smoke: **3D `max_abs_err = 5.6e-16` at step 1; 2D `= 0.0` at step 1** (the 2D
   first step is bit-identical). This rules out an implementation defect — the
   port is computing the same algorithm; the divergence is the flow's, not the
   port's. (Corroborated independently: a fresh NumPy reference run blows up on
   its own — the instability lives in the SEALED Phase-1 reference, not the port;
   a fresh NumPy 2D run reproduces the committed reference capture bit-for-bit,
   `max|u diff|=0.0`.)

2. **Positive divergence rate across the horizon** (cross-stack diff grows
   exponentially, not flat). Smoke step-by-step `max_abs_err` (Stack-D vs
   sealed NumPy reference, same IC):

   | 3D Taylor-Green (64³ derisk) | step 1 | step 10 | step 30 | step 60 |
   |---|---|---|---|---|
   | `max_abs_err` | `5.6e-16` | `7.8e-16` | `1.9e-14` | `1.1e-10` |

   | 2D lid-driven-cavity (128²) | step 1 | step 2 | step 5 |
   |---|---|---|---|
   | `max_abs_err` | `0.0` | `8.9e-16` | `1.0e+03` |

   The growth is exponential and ACCELERATING (the flow develops finer scales).
   The estimated cross-stack-divergence Lyapunov rate for the 3D 64³ window is
   `λ ≈ 0.12 → 0.29 per step` (`ln(1.1e-10/5.6e-16)/59 ≈ 0.21/step` mean, growing
   over the window); the 2D is far more violent (`λ` effectively `≫ 1/step` —
   `~1e18`-fold growth from step 2 to step 5). The underlying FIELD instability is
   confirmed by the canonical-resolution capture: 3D reference `max|u|` evolves
   `0.999 → 8.1e7` (step 50) `→ 5.1e19` (step 250) — a field-amplification rate
   `ln(8.1e7)/50 ≈ 0.36/step` — and the Stack-D capture blows up to a DIFFERENT
   magnitude (`1.2e19`), the signature of chaotic divergence between backends.
   The 2D shear layer reaches `u ~ 1.6e3` by step 5 (Kelvin-Helmholtz instability
   of the thin lid-shear-layer on a periodic grid).

### 6.3 How `equivalence.md` documents a chaotic-regime result (the witness template)

A chaotic-regime pair's `equivalence.md` is a **divergence-rate witness**, NOT a
per-field FP-round-off-margin table. It records: (§) the gate-14 verdict
`within_tolerance=False` with the escape-hatch explicitly invoked; (§) the
step-1 port-faithfulness baseline; (§) the step-by-step `max_abs_err` growth
table + Lyapunov-rate estimate for each descriptor; (§) the physical instability
mechanism cited (here: 3D collocated-grid / under-resolved-Jacobi blow-up; 2D
Kelvin-Helmholtz shear); (§) the within-stack correctness evidence (gates 4-13
GREEN); (§) why this is the correct verdict. The smoke pair's
`docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` is the **template**
future chaotic-regime pairs inherit.

### 6.4 Interaction with gates 4-13 (the stack-agnostic correctness surface)

The escape-hatch applies ONLY to gate-14 (cross-stack content-equivalence). The
13 stack-agnostic correctness gates (4-13) **remain mandatory and must still pass**
— they verify the port's physical correctness independently of cross-stack
content-equivalence. Smoke's gates 4-13 are all GREEN: code-verification (MMS OOA
advection 1.9892 / projection 1.9976, within ±0.5 of formal p=2), Tier-1/Tier-2
diagnostics, citations, API, captures, same-stack determinism (`run_twice_and_diff`
content-equivalent — bit-exact even though the trajectory is chaotic, because
within-stack determinism is order-deterministic), 2 PBT invariants @ 50 examples,
perf-ledger, failing-tests replay. **A chaotic-regime pair is a physically-correct
port whose cross-stack content-equivalence simply does not apply** — the
methodology validation (the escape-hatch is invoked correctly, witnessed) is the
deliverable, not a forced gate-14 PASS (spec § 3.5 / charter § 2).

### 6.5 Implications for future Phase-2 cross-stack ports (plan-drafting probe protocol)

Chaotic-regime risk MUST be assessed at plan-drafting, BEFORE committing to a
canonical descriptor. The S6 banked precedent (read the Phase-1 `sim.py`) is
NECESSARY but INSUFFICIENT — a code-structure read alone gave smoke a false "tame /
laminar" verdict (probe § 6 read the Stam-Fedkiw structure but did not simulate
the trajectory). The refined protocol (now a conventions-doc banked precedent —
`docs/conventions/sub-phase-conventions.md` § L.4): **the plan-drafting probe
additionally EXECUTES `sim_runner_diagnostic` (or a small-N canonical) for ~50-100
steps and reports the max-field-value growth rate.** Bounded growth → tame regime
(FP-round-off cross-stack expected). Exponential growth → chaotic regime (R-P2
escape-hatch expected; plan gate-14 as a divergence-rate witness from the start).
Within-stack determinism (gate-10) is bit-exact even for chaos and finite-NaN/Inf
(gate-5) passes even at `5e19`, so neither stack-agnostic gate surfaces the
instability — only trajectory simulation (or cross-stack execution) does.

### 6.6 Two corollary refinements surfaced by the fifth pair

- **f64-seed (§ 4.1) extends to pure-literal CONSTANTS, not only reductions.** § 4.1
  codified `ti.f64(0.0)` accumulator seeds for in-kernel REDUCTIONS (LBM's 19-term
  moment sums). Smoke is the first port where the f64-seed trap bites a **pure-literal
  numerical constant**: the 3D Jacobi normaliser `1.0/6.0` (both operands literals,
  no f64 ndarray) infers f32 absent `default_fp=ti.f64` and leaked ~1e-9 into the
  3D cross-stack pressure solve (vs ~1e-16 with the seed); seeded
  `ti.f64(1.0) / ti.f64(6.0)`. The 2D Jacobi multiplies by `0.25` (exact in f32, no
  seed). Codified discipline: seed ANY pure-literal non-power-of-2 constant in a
  `@ti.kernel` body, not only reduction accumulators. (Conventions-doc § L.4.)
- **Cross-stack testing is a defect-AMPLIFIER, beyond its equivalence-as-contract
  framing.** The smoke 2D + 3D canonicals are numerically unstable in the SEALED
  Phase-1 reference; Phase-1's within-stack determinism (bit-exact even for chaos)
  and finite-NaN/Inf gate were GREEN and could not see it. Cross-stack execution
  (a second arithmetic backend) made the latent instability visible. Banked
  methodology insight: cross-stack equivalence testing surfaces latent defects that
  within-stack verification structurally cannot. (Conventions-doc § L.4.)

### 6.7 Seventh-pair re-characterization — R-P2 is NOT stack-portable (eulerian-smoke Stack-E, the counter-instance)

(FACT — `sub-phase-eulerian-smoke-stack-e` Stage 1c STOP-evidence audit
`docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-gate-14-evidence-2026-05-25T13-21-16Z.md`
+ Stage 1c-revisited; the citing sim-spec artifact is
`docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` § E. The SEVENTH
cross-stack pair and the SECOND `eulerian-smoke` port — the NVIDIA-Warp CPU port of
the SAME Stam-Fedkiw reference whose Taichi port (Stack-D) was the § 6 first R-P2
instance.)

The plan-drafting prediction was that R-P2 is **stack-portable Taichi → Warp** — the
same chaotic canonicals would produce a second `within_tolerance=False`
divergence-rate verdict on Warp. **Empirically OVERTURNED.** gate-14 returned
`within_tolerance=True` with `max_abs_err = 0.0` on BOTH canonicals — the Warp port
is **byte-identical** to the sealed NumPy reference across the full horizon,
INCLUDING through the 3D Taylor-Green blow-up (reference AND port both reach
`|u| ≈ 5.1e19` at step 500, bit-for-bit). The 3D trajectory IS chaotic (condition
(i) holds), yet the verdict is bit-exact — because **condition (ii) fails**:

- The Stack-D **Taichi** port carried a Taichi-FP-specific step-1 cross-stack
  difference (`5.6e-16` on 3D; the pure-literal `1.0/6.0` f32-inference leak,
  § 6.6) that the chaos amplified to `O(field)`.
- The Stack-E **Warp** port, executing the same algorithm with the **same operation
  order** (the `np.roll` gather order, the `np.mod`-via-floor periodic wrap, the
  fixed-20-sweep Jacobi arithmetic), yields a step-1 cross-stack difference of
  **exactly `0.0`**. There is no seed-difference to amplify, so the trajectories
  stay byte-identical regardless of the Lyapunov regime.

**Re-characterization (load-bearing):** R-P2 invocation requires (i) AND (ii)
(§ 6.1). Chaos alone is **not** sufficient — absence of a cross-stack seed-difference
means R-P2 does not apply even when the trajectory is chaotic. R-P2 is a property of
the **backend-pair's arithmetic faithfulness**, not a stack-portable property of the
sim. The `equivalence.md` witness for a zero-seed-difference chaotic pair is a
**bit-exactness witness** (§ E), NOT a divergence-rate witness (§ 6.3). IC-15 stays
**PARTIAL** (this refines the R-P2 component; aspects #2/#3/#5 unchanged). Taxonomy:
the verdict is shape **(a) bit-exact** (conventions § L.7 O-1, refined at Stage 2
D-S2-1 — the bit-exact condition is a zero cross-stack seed-difference, NOT an
"algebraically-tame trajectory"; smoke Stack-E is the second shape-(a) instance and
the one that decouples bit-exactness from trajectory tameness).

**Within-sim cross-backend corroboration (eighth pair, `lattice-boltzmann-d3q19`
Stack-E; ADDITIVE).** Smoke Stack-E corroborated the "backend-pair property, not the
sim's" claim ACROSS sims at the same backend transition (Stack-D Taichi → Stack-E
Warp, both `eulerian-smoke`). LBM provides the sharper, WITHIN-sim cross-backend
corroboration: the SAME `lattice-boltzmann-d3q19` reference, the SAME laminar
canonicals (Poiseuille + Couette), the SAME sealed NumPy LEFT partner — yet the two
RIGHT backends carry different cross-stack seed-differences:

| Same sim, same laminar canonicals, same NumPy reference | Stack-D **Taichi** | Stack-E **Warp** |
|---|---|---|
| feq form | division-form | reciprocal-operand-form |
| reduction seeds | `ti.f64(0.0)` | `wp.float64(0.0)` |
| `max_abs_err` vs NumPy | `~6e-15` (shape **(b)**) | `0.0` (shape **(a)**) |
| gate-14 verdict | `within_tolerance=True` ×2 | `within_tolerance=True` ×2 |

Holding the sim AND the trajectory regime fixed (laminar, dissipative — no chaos to
amplify) and varying ONLY the backend, the step-1-and-onward seed-difference flips
from `~6e-15` to exactly `0.0`. This is the cleanest possible demonstration of the
§ 6.7 conclusion: the seed-difference is a property of the **backend-pair's
arithmetic faithfulness** (Taichi↔NumPy carries a residual; Warp-CPU-f64↔NumPy does
not, because Warp's scalar IEEE-754 f64 ops reproduce NumPy's lex-sequential
operation order without FMA fusion or reassociation), NOT a property of the sim or
its trajectory. Both verdicts clear the `lbm`/`1e-5` budget by ~10 orders; the point
is the *mechanism* (seed-difference origin), not the pass/fail. (Empirical artifacts:
`sub-phase-lattice-boltzmann-d3q19-stack-e` Stage 1c formal gate-14 +
`docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md` § E; the Stack-D
`~6e-15` from that sub-phase's landing.)

**Within-sim cross-backend corroboration #2 (ninth pair, `reaction-diffusion-2d`
Stack-C; ADDITIVE).** RD-2D supplies a SECOND within-sim demonstration — and the
FIRST that varies the backend to a **non-Warp, non-Taichi** family. The SAME
`reaction-diffusion-2d` reference, the SAME laminar Gray-Scott canonical
(`gray-scott-lambda-128sq-seed42-step2000`), the SAME sealed NumPy LEFT partner —
yet the two RIGHT backends carry different cross-stack seed-differences:

| Same sim, same Gray-Scott canonical, same NumPy reference | Stack-D **Taichi** | Stack-C **Vulkan/C++** |
|---|---|---|
| backend family | Taichi-DSL CPU | Vulkan compute / GLSL `double` on Mesa lavapipe |
| FP discipline | `default_fp=ti.f64` + f64-typed ndarrays | `shaderFloat64` + GLSL `precise` → SPIR-V `NoContraction` |
| `max_abs_err` vs NumPy | `~1.9e-14` (shape **(b)**) | `0.0` (shape **(a)**) |
| gate-14 verdict | `within_tolerance=True` | `within_tolerance=True` |

Holding the sim and the (laminar, bounded) trajectory regime fixed and varying ONLY
the backend, the seed-difference again flips from a residual (`~1.9e-14`) to exactly
`0.0` — confirming the § 6.7 conclusion a second time, now across a THIRD backend
family (Vulkan/C++): the seed-difference is a property of the backend-pair's
arithmetic faithfulness, not of the sim. (Empirical artifacts:
`sub-phase-reaction-diffusion-2d-stack-c` Stage 1c formal gate-14 +
`docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` § C; the Stack-D
`~1.9e-14` from § 1 + that sub-phase's landing.)

### 6.8 Eighth-pair observation — Warp CPU f64 ↔ NumPy (n=2) + the SECOND zero-seed-difference backend pair, Vulkan/C++ f64 ↔ NumPy (n=1) (SUGGESTIVE across two backend pairs, not established)

(FACT — `sub-phase-eulerian-smoke-stack-e` Stage 1c [step-1 `0.0` both canonicals;
bit-exact full horizon incl. the chaotic 3D blow-up] + `sub-phase-lattice-boltzmann-d3q19-stack-e`
Stage 1c [`max_abs_err=0.0` full horizon, both laminar canonicals]. The EIGHTH
cross-stack pair. ADDITIVE; companion to § 6.7's backend-pair framing — NOT a
promotion of the methodology partial → full.)

§ 6.7 establishes that the cross-stack seed-difference is a property of the
backend-PAIR. This subsection records the first cross-sim **data point pattern** for
one specific pair. Across **two structurally different Phase-1 sims** ported onto
**NVIDIA Warp 1.13.0 CPU f64**, the Warp ↔ NumPy pair has reproduced the sealed
NumPy reference **byte-for-byte** (cross-stack seed-difference exactly `0.0`):

| Warp-CPU-f64 ↔ NumPy data point | physics family | trajectory regime | algorithmic surface | result |
|---|---|---|---|---|
| `eulerian-smoke-stack-e` | volumetric-grid (advection–projection) | **chaotic** (`\|u\|→5e19`) | `np.roll` gather + floor-mod wrap + fixed-sweep Jacobi | step-1 `0.0`; bit-exact full horizon |
| `lattice-boltzmann-d3q19-stack-e` | lattice (collision–streaming) | **laminar** (dissipative) | 19-term in-kernel reductions + periodic-mod streaming gather | `max_abs_err=0.0` full horizon |

The pattern spans two physics families AND two trajectory regimes (chaotic +
laminar), which is what makes it suggestive of a **backend-pair FP property** rather
than a per-sim coincidence: when a Warp CPU f64 port preserves NumPy's operation
order + numerical primitives (and seeds `wp.float64()` accumulators/literals per
§ 4.1), Warp's scalar IEEE-754 f64 arithmetic (no FMA fusion, no reassociation in
serial launch) reproduces NumPy's f64 results bit-for-bit. This is the inverse of the
Taichi backend, which carried backend-specific residuals (LBM-D `~6e-15`; smoke-D's
pure-literal `1.0/6.0` f32-inference leak, § 6.6) under the same op-order discipline.

**QUALIFIER (load-bearing — surfaced, not asserted).** This is **`n=2`**. Two data
points on structurally different sims are *suggestive* of a backend-pair property but
**NOT conclusive** — a third Warp-CPU-f64 port could surface a backend-specific
residual (an FMA path, a reduction the port restructures, a non-power-of-2 literal
left unseeded) and reduce this to "bit-exact when the port is disciplined." To
**graduate from suggestive to established**, portfolio-track future cross-stack ports
that target the Warp CPU f64 backend for this property; bank each as an additional
data point. IC-15 stays **PARTIAL** (this neither promotes a deferred aspect nor adds
a codified component; it is an empirical pair-observation companion to § 6.7).

**Home routing (D-S2-1, this sub-phase; agent-selected, surfaced for the record).**
This observation is homed in the methodology doc (here, § 6.8) rather than the
conventions doc (`sub-phase-conventions.md` § L.7 as an "O-3"): the substance is a
cross-stack-equivalence claim about a backend pair's FP faithfulness — methodology
material, the direct empirical follow-on to § 6.7 — and the methodology § 6.x grows
per-pair (§ 6 fifth-pair → § 6.7 seventh-pair → § 6.8 eighth-pair), whereas § L.7 is
`mpm-multimaterial-stack-e`'s attributed locus (per-sub-phase attribution, § L.5
preamble), where an "O-3" would mis-attribute. The conventions doc carries only the
§ L.7 O-1 verdict-taxonomy third-instance refinement (which IS a refinement of MPM-E's
O-1, landed in place).

**SECOND backend pair (`sub-phase-reaction-diffusion-2d-stack-c` Stage 2; ADDITIVE;
Option α per charter § 6).** The ninth cross-stack pair is the FIRST **non-Warp**
zero-seed-difference instance: **Vulkan/C++ f64 (Mesa lavapipe, GLSL `precise` →
SPIR-V `NoContraction`) ↔ NumPy f64**. RD-2D Stack-C reproduces the sealed NumPy
Gray-Scott reference **byte-for-byte** (`max_abs_err = 0.0`, all 11 frames × {U,V},
through the full `step-2000` canonical horizon; gate-14 `within_tolerance=True`).
This pair was established **independently** — NOT inherited from the Warp pair (charter
§ 6) — so the zero-seed-difference observation now spans **two distinct backend
pairs**:

| Zero-seed-difference backend pair | data points (n) | sims | result |
|---|---|---|---|
| Warp-CPU-f64 ↔ NumPy | 2 | `eulerian-smoke-stack-e`, `lattice-boltzmann-d3q19-stack-e` | `max_abs_err=0.0` full horizon |
| Vulkan/C++-f64-lavapipe-NoContraction ↔ NumPy | 1 | `reaction-diffusion-2d-stack-c` | `max_abs_err=0.0` full horizon |

Three bit-exact instances across two backend families generalize the mechanism beyond
any single framework wrapper: **a deterministic f64 backend + verbatim re-derived
algebra + a matching FP discipline (no FMA fusion / no reassociation — Warp's serial
scalar IEEE-754; Vulkan's `NoContraction` decoration) + NumPy's operation order →
cross-stack bit-exactness, regardless of the framework wrapper.** What differs between
the pairs is only HOW the FP discipline is pinned (Warp: serial `wp.launch` + typed
literals; Vulkan/C++: `shaderFloat64` + `precise`/`NoContraction` — Q-CPP1/Q-CPP2), not
the outcome. The Taichi backend is the standing **counter**-example (LBM-D `~6e-15`;
smoke-D `1.0/6.0` f32-inference leak, § 6.6) — bit-faithfulness is a property the
backend-pair either has or lacks under matched op-order, not a universal.

**QUALIFIER (load-bearing — surfaced, not asserted; carries forward).** The Vulkan/C++
pair is **`n=1`** — a single sim on a single (laminar, bounded) trajectory. The
cross-pair generalization above is therefore **SUGGESTIVE, not established**: a second
Vulkan/C++ port (a different algorithmic surface — atomics, subgroup collectives,
denorm-sensitive quiescent regions per Q-CPP2's un-pinnable FTZ) could still surface a
backend-specific residual. To graduate, portfolio-track future Stack-C ports for this
property (as for the Warp pair). IC-15 stays **PARTIAL**. (Empirical artifacts:
`sub-phase-reaction-diffusion-2d-stack-c` Stage 1b ckpt 2 + Stage 1c formal gate-14;
`docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` § C.2.)

## 7. References

- `docs/architecture.md` § 2.5 (IC-13), § 2.6 (cross-stack tolerance table).
- `tools/testkit/equivalence/harness.py` (`compare_captures`); `tolerance.toml`;
  `tolerance-budget.toml`. `tools/testkit/scripts/extract_capture_subset.py` (§ 5.4).
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (pair 1).
- `docs/sim-specs/particle-fluids/sph-water/equivalence.md` (pair 2).
- `docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md` (pair 3).
- `docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md` (pair 4).
- `docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` (pair 5 — the
  chaotic-regime witness template; § 6).
- Landing audits: `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md`;
  `docs/_audits/phase-2/sub-phase-sph-water-stack-d/landing-*.md`;
  `docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/landing-*.md`;
  `docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/landing-*.md`;
  `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/landing-*.md` (pair 5).

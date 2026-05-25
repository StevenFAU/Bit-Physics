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

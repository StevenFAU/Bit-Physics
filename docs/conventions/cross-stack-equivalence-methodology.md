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

1. **R-P2 chaotic-regime escape-hatch substantive details.** Both validated pairs
   had R-P2 (chaotic-divergence) empirically dissolved (RD-2D: algebraic identity
   across stacks; sph-water: rigid-free-fall trajectory + discarded SPH side-
   effect per S6). The operator-routing playbook — among tolerance-amendment /
   step-horizon-override / implementation-debug (P27-analog) — has **not** been
   exercised. The spec § 2.6 framework exists; the practical routing is unproven.
2. **D8 comparison-projection axis.** Position-binned histograms / per-particle-
   density / energy-momentum-conservation as alternatives to position-exact
   comparison. Not needed for two algebraically-identical-trajectory pairs.
3. **Atomic-scatter handling.** A Stack-C (Vulkan) forward concern (atomic
   scatter-add in neighbor accumulation; FMA fusion; subgroup collectives — spec
   § 2.5 epsilon-class). Out of scope for Stack-D-only CPU ports.
4. **Lattice-velocity quantization handling.** LBM-specific; surfaces if an LBM
   Stack-D port is the third pair.
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

## 4. References

- `docs/architecture.md` § 2.5 (IC-13), § 2.6 (cross-stack tolerance table).
- `tools/testkit/equivalence/harness.py` (`compare_captures`); `tolerance.toml`;
  `tolerance-budget.toml`.
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (pair 1).
- `docs/sim-specs/particle-fluids/sph-water/equivalence.md` (pair 2).
- Landing audits: `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md`;
  `docs/_audits/phase-2/sub-phase-sph-water-stack-d/landing-*.md`.

# Phase 4 dispatch ledger

> Per plan § 4.2.G. **Exactly 27 data rows**, 1:1 with spec § 11.5 items
> 4.1-4.27. Status `planned` at Phase-4.0 close; flips to
> `dispatched`/`in-progress`/`landed` as Stages 9-35 land. WU-G stands this
> up; each stage updates its own row + appends to `progress.md`.
>
> **§0.3 CODE-path ratification (consistent with WU-P).** Phase-4 variant
> CODE lands under **flat** `packages/<sim>-<variant-suffix>/` (e.g.
> `packages/eulerian-smoke-sparse-nanovdb/`), NOT the plan's prose
> `<category>/<sim>/<variant>/` (which has ZERO landed precedent). The
> DOCS path `docs/sim-specs/<category>/<sim>/spec-<variant>.md` stays
> category-nested (correct). The exact flat-dir leaf is a per-variant-stage
> decision; this ratifies only that Phase-4 CODE stays under `packages/`.
>
> **PHASE-4 PARTIAL-CLOSE RE-SCOPE (2026-05-31; close landing audit
> `docs/_audits/phase-4/landing-2026-05-31T*.md`).** Phase 4 closed at the
> CPU-tier verified frontier-portfolio: **9 of 27 sims LANDED** (foundation
> 8/8 WU + 4.1 hardening + batches 1-3), **18 DEFERRED-WITH-A-HOME** to two
> proposed named future phases (Status column below; §"Deferred re-scope"
> section). The split is a **planning recommendation SURFACED for operator
> ratification**, not a unilateral commitment. None of the 18 is orphaned —
> each is either a hardware blocker (CUDA) or a greenfield/base-sim
> dependency, all documented in the batch charters + the close audit §4.

| Stage | Spec item | Sim ID | Variant | Stack | Primary infra | Phase-3 carry-in | Hidden deps | Spec path | PBT invariants declared | Perf-ledger row | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 9 | 4.1 | continuous-ca/reaction-diffusion-2d | diff | D | § 4.2.A | (none) | — | docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-diff.md | 2 (gradient_matches_finite_difference + concentration_change_bounded) | yes | batch-1-close | **landed** |
| 10 | 4.2 | particle-fluids/sph-water | diff | D | § 4.2.A | (none) | — | docs/sim-specs/particle-fluids/sph-water/spec-diff.md | TODO (≥2) | no | — | deferred → P4-Greenfield-CPU (5th diff sim; CPU-feasible, operator-decidable future diff batch) |
| 11 | 4.3 | hybrid-pg/mpm-multimaterial | diff | D | § 4.2.A | (none) | — | docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-diff.md | 2 (gradient_matches_finite_difference + momentum_change_bounded_by_impulse) | yes | batch-1-close | **landed** |
| 12 | 4.4 | continuous-ca/lenia | diff | D | § 4.2.A | (none) | — | docs/sim-specs/continuous-ca/lenia/spec-diff.md | 2 (gradient_matches_finite_difference + field_bounded) | yes | batch-1-close | **landed** |
| 13 | 4.5 | volumetric-grid/eulerian-smoke | diff | E | § 4.2.A | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-diff.md | 2 (gradient_matches_finite_difference + advect_field_bounded_by_input_range) | yes | batch-1-close | **landed** |
| 14 | 4.6 | rigid-body/articulated-pedagogical | diff | E | § 4.2.A | Phase 3 task-4 | — | docs/sim-specs/rigid-body/articulated-pedagogical/spec-diff.md | 2 (gradient_matches_finite_difference + energy_drift_bounded) | yes | batch-3-close | **landed** |
| 15 | 4.7 | volumetric-grid/eulerian-smoke | sparse-nanovdb | C+E | § 4.2.B | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-sparse.md | TODO (≥2) | no | — | deferred → P4-CUDA (CUDA-bound; NanoVDB sparse runtime / `wp.Volume`) |
| 16 | 4.8 | hybrid-pg/mpm-multimaterial | sparse-nanovdb | E | § 4.2.B | (none) | — | docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-sparse.md | TODO (≥2) | no | — | deferred → P4-CUDA (CUDA-bound; NanoVDB sparse runtime) |
| 17 | 4.9 | volumetric-grid/eulerian-smoke | sparse-quadtree | C | — | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-sparse.md | TODO (≥2) | no | — | deferred → P4-CUDA (CUDA-bound; Stack-C sparse-volume runtime; WU-B host surface only) |
| 18 | 4.10 | lattice/lattice-boltzmann-d3q19 | sparse-amr | C+E | § 4.2.B | (none) | — | docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-sparse.md | TODO (≥2) | no | — | deferred → P4-CUDA (CUDA-bound; sparse-AMR runtime) |
| 19 | 4.11 | hybrid-pg/mpm-multimaterial | neural (sh-update) | E | § 4.2.C | Phase 3 task-1 + task-8 | — | docs/sim-specs/neural-rendered/3dgs-mpm/spec-sh-update.md | 2 (sh_rotation_equivariant + covariance_spd_preserved) | yes | batch-2-close | **landed** |
| 20 | 4.12 | particle-fluids/sph-water | neural | E | § 4.2.C | Phase 3 task-1 | — | docs/sim-specs/particle-fluids/sph-water/spec-neural.md | TODO (≥2) | no | — | deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; no landed Stack-E SPH parent; operator-HELD batch-2) |
| 21 | 4.13 | volumetric-grid/eulerian-smoke | neural | E | § 4.2.C | Phase 3 task-1 | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-neural.md | 2 (opacity_monotone_bounded + render_similarity_self_identity) | yes | batch-2-close | **landed** |
| 22 | 4.14 | hybrid-pg/mpm-multimaterial | neural-iterative | E | § 4.2.C | Phase 3 task-1 + task-8 | § 4.2.A (if diff render) | docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-neural.md | TODO (≥2) | no | — | deferred → P4-CUDA (CUDA-favoring differentiable-rasterizer gate; operator-HELD batch-2) |
| 23 | 4.15 | volumetric-grid/eulerian-smoke | frontier-clebsch-pfm | C | — | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | TODO (≥2) | no | — | deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; new particle-flow-map substrate, Stack-C) |
| 24 | 4.16 | volumetric-grid/eulerian-smoke | frontier-edge | C | — | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | TODO (≥2) | no | — | deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; EDGE compressible flow-map, Stack-C) |
| 25 | 4.17 | volumetric-grid/eulerian-smoke | frontier-vpfm | C | — | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | TODO (≥2) | no | — | deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; VPFM flow-map, Stack-C) |
| 26 | 4.18 | continuous-ca/lenia | frontier-particle-lenia | D | — | (none) | — | docs/sim-specs/continuous-ca/lenia/spec-frontier-particle.md | 2 (force_matches_finite_difference + total_energy_translation_invariant) | yes | batch-3-close | **landed** |
| 27 | 4.19 | continuous-ca/lenia | frontier-flow-lenia | D | — | (none) | — | docs/sim-specs/continuous-ca/lenia/spec-frontier-flow.md | 2 (total_mass_conserved + mass_non_negative) | yes | batch-3-close | **landed** |
| 28 | 4.20 | continuous-ca/neural-ca | frontier-difflogic-ca | D | § 4.2.A | (none) | — | docs/sim-specs/continuous-ca/neural-ca/spec-frontier.md | TODO (≥2) | no | — | deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; differentiable-logic CA substrate; operator-HELD batch-3) |
| 29 | 4.21 | lattice/lattice-boltzmann-d3q19 | frontier-moment-encoded | C | § 4.2.B | (none) | — | docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-frontier.md | TODO (≥2) | no | — | deferred → P4-Greenfield-CPU (qualitative-anchor-leaning; sound-anchor strategy needed first; operator-HELD batch-3) |
| 30 | 4.22 | volumetric-grid/eulerian-smoke | frontier-gaussian-fluids | E | § 4.2.B + § 4.2.C | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | TODO (≥2) | no | — | deferred → P4-Greenfield-CPU (greenfield-needs-base-sim; new 3DGS-fluid substrate; operator-HELD batch-3) |
| 31 | 4.23 | rigid-body/articulated-locomotion | new | E | § 4.2.D | (none) | § 4.2.F | docs/sim-specs/rigid-body/articulated-locomotion/spec-ref.md | TODO (≥2) | no | — | deferred → P4-CUDA (CUDA-bound; Newton solver runtime — WU-D runtime BLOCKED) |
| 32 | 4.24 | rigid-body/granular-pile | new | E | § 4.2.D | (none) | § 4.2.F | docs/sim-specs/rigid-body/granular-pile/spec-ref.md | TODO (≥2) | no | — | deferred → P4-CUDA (CUDA-bound; Newton solver runtime) |
| 33 | 4.25 | rigid-body/manipulator-grasp | new | E | § 4.2.D | (none) | § 4.2.F | docs/sim-specs/rigid-body/manipulator-grasp/spec-ref.md | TODO (≥2) | no | — | deferred → P4-CUDA (CUDA-bound; Newton solver runtime) |
| 34 | 4.26 | learned-dynamics/gns-particle | new | E | § 4.2.E | (none) | § 4.2.A | docs/sim-specs/learned-dynamics/gns-particle/spec-ref.md | TODO (≥2) | no | — | deferred → P4-CUDA (learned-dynamics; GNS training at scale CUDA/GPU-bound; uses Phase-1 SPH captures) |
| 35 | 4.27 | learned-dynamics/learned-closure-les | new | E | § 4.2.E | (none) | § 4.2.A (train through sim) | docs/sim-specs/learned-dynamics/learned-closure-les/spec-ref.md | TODO (≥2) | no | — | deferred → P4-CUDA (learned-dynamics; learned-LES-closure training CUDA-bound; LES paper cited-at-Stage-0 per A-8) |

## Deferred re-scope — two proposed future-phase homes (SURFACED for operator ratification)

> **This is a planning recommendation, not a unilateral commitment.** Phase 4
> closed partial-complete at the CPU-tier verified frontier portfolio (9/27).
> The 18 un-built sims are grouped below into two named future-phase homes so
> none is orphaned. The operator ratifies (or re-routes) the split; the names
> are placeholders. Detail + the honest WHY-grouping is in the close landing
> audit §4 and the consolidation mid-phase-state audit §4.

### Home 1 — **Phase-4-CUDA** (gated on an A100 / CUDA 12 + driver 545+ host) — 10 sims
The foundation already MEASURED CUDA ABSENT on the build host (WU-D Newton
runtime BLOCKED → operator-ratified CPU-fallback; WU-B `SparseVolume.from_voxels`
CUDA-gated). These cannot land on a CPU-only host.

| Ledger | Stage | Sim / variant | CUDA reason |
|---|---|---|---|
| 15 | 4.7 | eulerian-smoke/sparse-nanovdb | NanoVDB sparse runtime (`wp.Volume` / CUDA) |
| 16 | 4.8 | mpm-multimaterial/sparse-nanovdb | NanoVDB sparse runtime |
| 17 | 4.9 | eulerian-smoke/sparse-quadtree | Stack-C sparse-volume runtime (WU-B host surface only) |
| 18 | 4.10 | lattice-boltzmann/sparse-amr | sparse-AMR runtime |
| 22 | 4.14 | mpm-multimaterial/neural-iterative (i-PhysGaussian) | CUDA-favoring differentiable-rasterizer gate |
| 31 | 4.23 | rigid-body/articulated-locomotion | Newton solver runtime (CUDA 12) |
| 32 | 4.24 | rigid-body/granular-pile | Newton solver runtime |
| 33 | 4.25 | rigid-body/manipulator-grasp | Newton solver runtime |
| 34 | 4.26 | learned-dynamics/gns-particle | GNS training at scale (CUDA/GPU) |
| 35 | 4.27 | learned-dynamics/learned-closure-les | learned-LES-closure training (CUDA) |

### Home 2 — **Phase-4-Greenfield-CPU** (CPU-feasible; each needs a base sim or a sound-anchor strategy FIRST) — 8 sims
These are not hardware-blocked but cannot land soundly until a prerequisite
substrate/parent sim exists or a verifiable anchor strategy is designed (no
fabricated/qualitative-only anchors per spec §2.4 / Cat-3).

| Ledger | Stage | Sim / variant | Prerequisite |
|---|---|---|---|
| 10 | 4.2 | sph-water/diff | a 5th differentiable sim — CPU-feasible; operator-decidable for a future diff batch |
| 20 | 4.12 | sph-water/neural (3dgs-sph) | a landed Stack-E SPH parent (none exists yet) |
| 23 | 4.15 | eulerian-smoke/frontier-clebsch-pfm | new particle-flow-map substrate (greenfield Stack-C) |
| 24 | 4.16 | eulerian-smoke/frontier-edge | EDGE compressible flow-map substrate (greenfield) |
| 25 | 4.17 | eulerian-smoke/frontier-vpfm | VPFM flow-map substrate (greenfield) |
| 28 | 4.20 | neural-ca/frontier-difflogic-ca | differentiable-logic CA substrate (greenfield) |
| 29 | 4.21 | lattice-boltzmann/frontier-moment-encoded | a sound (non-qualitative) anchor strategy |
| 30 | 4.22 | eulerian-smoke/frontier-gaussian-fluids | new 3DGS-fluid substrate (greenfield) |

**Reconciliation:** 9 LANDED (Stages 9/11/12/13/14/19/21/26/27) + 18 DEFERRED
(10 → Phase-4-CUDA, 8 → Phase-4-Greenfield-CPU) = 27 rows = spec § 11.5 4.1-4.27.

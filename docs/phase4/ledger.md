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

| Stage | Spec item | Sim ID | Variant | Stack | Primary infra | Phase-3 carry-in | Hidden deps | Spec path | PBT invariants declared | Perf-ledger row | Audit | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 9 | 4.1 | continuous-ca/reaction-diffusion-2d | diff | D | § 4.2.A | (none) | — | docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-diff.md | 2 (gradient_matches_finite_difference + concentration_change_bounded) | yes | batch-1-close | **landed** |
| 10 | 4.2 | particle-fluids/sph-water | diff | D | § 4.2.A | (none) | — | docs/sim-specs/particle-fluids/sph-water/spec-diff.md | TODO (≥2) | no | — | planned |
| 11 | 4.3 | hybrid-pg/mpm-multimaterial | diff | D | § 4.2.A | (none) | — | docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-diff.md | 2 (gradient_matches_finite_difference + momentum_change_bounded_by_impulse) | yes | batch-1-close | **landed** |
| 12 | 4.4 | continuous-ca/lenia | diff | D | § 4.2.A | (none) | — | docs/sim-specs/continuous-ca/lenia/spec-diff.md | 2 (gradient_matches_finite_difference + field_bounded) | yes | batch-1-close | **landed** |
| 13 | 4.5 | volumetric-grid/eulerian-smoke | diff | E | § 4.2.A | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-diff.md | 2 (gradient_matches_finite_difference + advect_field_bounded_by_input_range) | yes | batch-1-close | **landed** |
| 14 | 4.6 | rigid-body/articulated-pedagogical | diff | E | § 4.2.A | Phase 3 task-4 | — | docs/sim-specs/rigid-body/articulated-pedagogical/spec-diff.md | TODO (≥2) | no | — | planned |
| 15 | 4.7 | volumetric-grid/eulerian-smoke | sparse-nanovdb | C+E | § 4.2.B | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-sparse.md | TODO (≥2) | no | — | planned |
| 16 | 4.8 | hybrid-pg/mpm-multimaterial | sparse-nanovdb | E | § 4.2.B | (none) | — | docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-sparse.md | TODO (≥2) | no | — | planned |
| 17 | 4.9 | volumetric-grid/eulerian-smoke | sparse-quadtree | C | — | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-sparse.md | TODO (≥2) | no | — | planned |
| 18 | 4.10 | lattice/lattice-boltzmann-d3q19 | sparse-amr | C+E | § 4.2.B | (none) | — | docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-sparse.md | TODO (≥2) | no | — | planned |
| 19 | 4.11 | hybrid-pg/mpm-multimaterial | neural | E | § 4.2.C | Phase 3 task-1 + task-8 | — | docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-neural.md | TODO (≥2) | no | — | planned |
| 20 | 4.12 | particle-fluids/sph-water | neural | E | § 4.2.C | Phase 3 task-1 | — | docs/sim-specs/particle-fluids/sph-water/spec-neural.md | TODO (≥2) | no | — | planned |
| 21 | 4.13 | volumetric-grid/eulerian-smoke | neural | E | § 4.2.C | Phase 3 task-1 | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-neural.md | TODO (≥2) | no | — | planned |
| 22 | 4.14 | hybrid-pg/mpm-multimaterial | neural-iterative | E | § 4.2.C | Phase 3 task-1 + task-8 | § 4.2.A (if diff render) | docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-neural.md | TODO (≥2) | no | — | planned |
| 23 | 4.15 | volumetric-grid/eulerian-smoke | frontier-clebsch-pfm | C | — | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | TODO (≥2) | no | — | planned |
| 24 | 4.16 | volumetric-grid/eulerian-smoke | frontier-edge | C | — | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | TODO (≥2) | no | — | planned |
| 25 | 4.17 | volumetric-grid/eulerian-smoke | frontier-vpfm | C | — | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | TODO (≥2) | no | — | planned |
| 26 | 4.18 | continuous-ca/lenia | frontier-particle-lenia | D | — | (none) | — | docs/sim-specs/continuous-ca/lenia/spec-frontier.md | TODO (≥2) | no | — | planned |
| 27 | 4.19 | continuous-ca/lenia | frontier-flow-lenia | D | — | (none) | — | docs/sim-specs/continuous-ca/lenia/spec-frontier.md | TODO (≥2) | no | — | planned |
| 28 | 4.20 | continuous-ca/neural-ca | frontier-difflogic-ca | D | § 4.2.A | (none) | — | docs/sim-specs/continuous-ca/neural-ca/spec-frontier.md | TODO (≥2) | no | — | planned |
| 29 | 4.21 | lattice/lattice-boltzmann-d3q19 | frontier-moment-encoded | C | § 4.2.B | (none) | — | docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-frontier.md | TODO (≥2) | no | — | planned |
| 30 | 4.22 | volumetric-grid/eulerian-smoke | frontier-gaussian-fluids | E | § 4.2.B + § 4.2.C | (none) | — | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | TODO (≥2) | no | — | planned |
| 31 | 4.23 | rigid-body/articulated-locomotion | new | E | § 4.2.D | (none) | § 4.2.F | docs/sim-specs/rigid-body/articulated-locomotion/spec-ref.md | TODO (≥2) | no | — | planned |
| 32 | 4.24 | rigid-body/granular-pile | new | E | § 4.2.D | (none) | § 4.2.F | docs/sim-specs/rigid-body/granular-pile/spec-ref.md | TODO (≥2) | no | — | planned |
| 33 | 4.25 | rigid-body/manipulator-grasp | new | E | § 4.2.D | (none) | § 4.2.F | docs/sim-specs/rigid-body/manipulator-grasp/spec-ref.md | TODO (≥2) | no | — | planned |
| 34 | 4.26 | learned-dynamics/gns-particle | new | E | § 4.2.E | (none) | § 4.2.A | docs/sim-specs/learned-dynamics/gns-particle/spec-ref.md | TODO (≥2) | no | — | planned |
| 35 | 4.27 | learned-dynamics/learned-closure-les | new | E | § 4.2.E | (none) | § 4.2.A (train through sim) | docs/sim-specs/learned-dynamics/learned-closure-les/spec-ref.md | TODO (≥2) | no | — | planned |

---
date: 2026-05-28
author: phase-3 rigid-body-pedagogical plan-drafting (Claude Code)
subject: probe report — task-4 rigid-body-pedagogical (sub-phase 3.3); first Stack-E sim of Phase 3
verdict: PROBE COMPLETE (charter ready; 6 D-classes, 4 open for operator)
head_sha: 7d52ce1
prior_sub_phase_landed_at: 2da281a
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 6096fa35cc2aa35c82be0ff99613e73f2f8ab027e4df446e02d8e9a190c7e1ac
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - common/common-warp/src/common_warp/__init__.py
  - docs/common/warp.md
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/determinism/registry.toml
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
  - docs/phases/phase-3-plan.md
  - docs/phases/sub-phase-phase-3-rigid-body.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-probe-2026-05-28T22-50-13Z.md
---

# Probe report — task-4 rigid-body-pedagogical

First **Stack E (Warp)** sim of Phase 3. Probe per Convention #8 (verbatim live
surfaces). Feeds charter `docs/phases/sub-phase-phase-3-rigid-body.md`.

## 1. common-warp consumable surface (Phase-2, pre-maturation)

Public API re-exported at `common_warp` (`common/common-warp/src/common_warp/__init__.py:31-51`),
Warp pin `warp-lang>=1.13,<2.0` (`common/common-warp/pyproject.toml`):

- **Runtime** — `init(device=None, deterministic=False) -> str`, `get_device()`, `set_device(device)`.
- **Determinism** — `set_seed(seed)`, `get_seed()`, `set_warp_deterministic(seed, device=...) -> int`,
  `deterministic_context() -> Iterator[int]`, `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0) -> str`.
- **Capture I/O** — `Capture(manifest: dict, payload: dict[str, np.ndarray])`,
  `write_capture(capture, path, *, schema_version="1.0.0")`, `read_capture(path) -> Capture`;
  payload-key helpers `state_key(step, field_name)`, `diagnostics_key(step, check_name)`.
- **Particles / Grids / HashGrid** — domain helpers (not used by rigid-body).

**Capability verdict for a Featherstone-ABA rigid-body sim:**

| capability | verdict | note |
|---|---|---|
| capture writer | PRESENT (batch) | `Capture`+`write_capture` — NOT incremental `write_step/finalize`; accumulate then flush. **D-CAPTURE-API.** |
| deterministic-mode / seeding | PRESENT | `set_warp_deterministic` + `deterministic_context` + `assert_deterministic_run`; CPU bit-exact-same-hw. **D-DET.** |
| quaternion / rotation math | ABSENT | sim-local (upstream `wp.quat`/`wp.mat33` available to use directly). |
| spatial / 6D vector types | ABSENT | sim-local (Plücker 6-vectors). |
| time integrators (semi-implicit Euler, RK4) | ABSENT | sim-local — IS the §6.4-E deliverable. |
| CLI scaffold | ABSENT | sim-local. |

**Convention-I / rule-of-three conclusion:** the ABSENT items are the **sim's own
physics deliverable** per plan §6.4-E (ABA + integrators), not missing shared
infrastructure. common-warp's runtime/determinism/capture cover the sim's infra
needs. rigid-body is the FIRST consumer of spatial-algebra/integrator surfaces;
extraction to common-warp is a rule-of-three event (task-9 inventories this
consumer site). **No Hard-Rule-2 missing-surface block.**

## 2. Golden-table + derivation schema

`tools/testkit/golden/tables/*.json`: `algorithm`, `category`, `derivation`
(`doc`/`upstream`/`upstream_sha`), `schema_version`, `test_points[]` (each with
`inputs`, `expected`, and `independent_reference` blocks — **≥3 per spec §2.4**),
`tolerance` (`absolute`/`relative`). Derivations at
`tools/testkit/golden/derivations/*.md` (e.g. `lenia-kernel.md`, `ising-onsager.md`)
— algebraic derivation prose with citations.

## 3. Determinism registry + PBT + Tier-3 layouts

- `tools/testkit/determinism/registry.toml` rows `[<category>.<sim>]` with
  `stack`/`class`/`scope`/`atomic_ops`/`subgroup_ops`/`seed_pinned`/`distributional_bound`.
  Single-stack Stack-E precedent `[neural-rendered.common-3dgs]` = bit-exact /
  same-stack-same-hw. → rigid-body row `[rigid-body.articulated-pedagogical]`.
- `tools/testkit/property/sims/{lenia,ising_classical}/invariants.py` — predicate
  functions. → `tools/testkit/property/sims/rigid_body_pedagogical/invariants.py`.
- `tools/diagnostics/tier3/{lenia,ising_classical}/` — `Report` classes + `check_*`
  fns. → `tools/diagnostics/tier3/rigid_body_pedagogical/`.

## 4. Tolerance budget / schema state (D-TOL)

`tools/testkit/equivalence/tolerance-budget.toml` has `[budgets.<cat>.cross_stack]`
caps for closed_form/reaction-diffusion/sph/mpm/smoke/lbm only — **no `rigid-body`**
(and no lattice-spin: single-stack sims add none, lines 9-10). `tolerance-schema.json`
top-level props: `defaults`, `overrides`, `render_similarity`, **`golden_tolerance`**
(additionalProperties:false). The `golden_tolerance` description **already enumerates**
`articulated-pedagogical: pendulum_period_rel, trajectory_abs, energy_drift_rel_per_second`.
§S.3 (`docs/conventions/sub-phase-conventions.md:1530-1540`) names articulated-pedagogical as a
single-stack golden-table sim. → **land `[golden_tolerance.rigid-body.articulated-pedagogical]`;
no cross_stack budget cap; no schema extension.** (Conflicts with the dispatch's
"propose a budget cap" — surfaced as D-TOL.)

## 5. CI pattern (D-CI)

`.github/workflows/build-py.yml` **does not exist**. Per-sim jobs are in
`python-strict.yml` (`test-lenia`, `test-ising-classical`): checkout `lfs:false` →
setup-uv → `uv sync --extra dev` → ruff → `mypy --strict` → selective LFS pull
(R2-opt-in guarded, §Q.4) → `pytest tests/`. → `test-rigid-body-pedagogical`.

## 6. Capture descriptor + fixture sidecar

Spec §2.7 / Appendix D §D.2.3 grammar `<test-name>-<config>-seed<N>-step<N>`;
`pendulum-trajectory-seed42-step1000` is a **listed canonical example** — FITS.
Fixture sidecar (`tests/fixtures/legacy-captures/*.json`):
`schema_version`/`sim`/`stack`/`config`/`run`/`payload`/`determinism`; `.h5` LFS-routed.

## 7. sim-spec path

`docs/sim-specs/<category>/<sim>/spec-ref.md` (e.g.
`docs/sim-specs/continuous-ca/lenia/`, `docs/sim-specs/lattice-spin/ising-classical/`)
— sim-spec docs stayed **category-based** even though code is flat `packages/`. →
`docs/sim-specs/rigid-body/articulated-pedagogical/`.

## 8. Citation verification (web; citation-only, NO vendoring)

| Anchor | Plan §6.4 says | Verified | Disposition |
|---|---|---|---|
| ABA algorithm | Featherstone (2008) Ch. 7 | **CONFIRMED.** Ch. 7 §7.3 "The Articulated-Body Algorithm", pp. 123–131; AB-inertia recurrence §7.2. **Reduced/generalized-coordinate** (maximal-coord/closed-loop = Ch. 8). | Anchors §7.2–§7.3 pp.123–131. Corroborates **D-ALGO** (§5.8 "maximal-coordinate" is inconsistent with Featherstone-ABA). |
| Anchor 1 (small-angle) | Marion & Thornton 5th ed. §3.2 | **CONFIRMED.** Ch. 3 "Oscillations", §3.2 "Simple Harmonic Oscillator"; `T=2π√(L/g)`. | Keep. |
| Anchor 2 (large-angle elliptic) | Goldstein 3rd ed. §4.3 | **WRONG.** Goldstein §4.3 = "Formal Properties of the Transformation Matrix" (rotation-matrix algebra). No dedicated exact-pendulum section in Goldstein. | **D-ANCHOR** — replace with NIST DLMF §19.2 (K(k)) + §22.19(i), and/or Landau & Lifshitz *Mechanics* §11. |
| Anchor 3 (Jacobi elliptic) | NIST DLMF §22 | **CONFIRMED.** §22.19(i) "Classical Dynamics: The Pendulum", eq. 22.19.2 (θ(t) via sn); period 4·K(sin½α); §22.2 definitions; K(k) defined Ch. 19 §19.2. | Keep; cite §22.19(i)+§19.2. |
| RK4-ref | "NOT independent (numerical reference)" | **CONFIRMED.** Higher-precision numerical baseline of the same ODE; not an analytic anchor. | spec-ref §6 + derivation G state this explicitly. |

## 9. progress.md state

Latest entry: ising-classical sub-phase landed `2da281a` (closed-with-shifted-2,
first Stack-B SIM, no tag). Phase-3 remaining after task-4: task-5 mass-spring-cloth
(Stack C) → task-6 neural-ca (D+B) → task-7 PINN-Poisson (Stack E + PyTorch) →
task-8 3DGS-MPM (Stack E) → task-9 common-warp maturation → task-10 landing/close
(operator-pushed `v0.3.0-phase-3`). Banked cleanup candidates open: SIBLING-FIXTURE-LFS;
integrity-meta-test-ci-wiring (`docs/architecture.md:768`).

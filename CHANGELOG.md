# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Phase 0 Block 1 (FOUNDATION): repo skeleton, vendored design spec at
  `docs/architecture.md`, vendored Phase 0 plan, glossary, capture format
  module + JSON schemas, CI scaffolding, pre-commit config, branch-protection
  doc, preflight script, sim-spec template, probe template, perf-ledger
  scaffold, failing-tests-evidence scaffold, tolerance-budget stub,
  schema-corpus directory.

### sub-phase-closed-form

First per-sim implementation sub-phase under spec-Phase-1 per Phase 1
audit § 15. Lands gates 4–13 for the closed-form pair
(`strange-attractors`, `mandelbulb-explorer`); the remaining seven
Phase 1 sims still ship Phase-1 RED with `ModuleNotFoundError` pending
their own per-sim implementation sub-phases. No `-phase-N` tag pushed
(spec § 7.12 reserves that form for spec-phase boundaries); optional
non-phase point-release `v0.1.1` is a banked operator decision per
`docs/phases/sub-phase-closed-form.md` § 11.4.

#### Added

- `packages/strange-attractors/strange_attractors/` — public API
  exposing `reference` (Lorenz / Rössler / Aizawa / Sprott-A / Pickover
  ODE families + RK4 integrator), `sim` (`sim_runner_seeded` matching
  `tools/testkit/determinism/`'s `SimRunner` Protocol), `invariants`
  (Hypothesis-decorated `volume_contraction_rate_constant` and
  `rk4_time_reversibility_modulo_dissipation`). Spec-pinned PBT
  invariants from `docs/sim-specs/closed-form/strange-attractors/`
  § 6.6.
- `packages/mandelbulb-explorer/mandelbulb_explorer/` — public API
  exposing `reference` (Quilez 2009 distance-estimator + iterated map),
  `sim` (`sim_runner_seeded`), `invariants` (`de_lower_bound_property`
  and `map_p8_z_inversion_symmetry`).
- `captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.{h5,json}`
  (spec Appendix D § D.2.3 descriptor; sha256 of payload
  `9d34df5f64ab980b2482d1b2023888e3fe7bd3756d3a82f450fdadb68d231450`).
- `captures/mandelbulb-explorer-ref/de-probe-points-seed42.{h5,json}`
  (spec Appendix D § D.2.3 descriptor; sha256 of payload
  `0e1a3fa1f199155ef9b5e0f1f1dbe85cc057694ab0bcb44ef5bdb018b0431084`).
- `docs/perf-ledger.md` — two first-landing baseline rows:
  - `strange-attractors / numpy-reference / lorenz-trajectory-seed42-step10000 / 0.061s / i7-12700KF-linux-6.17`
  - `mandelbulb-explorer / numpy-reference / de-probe-points-seed42 / 0.006s / i7-12700KF-linux-6.17`
- `tools/testkit/failing-tests-evidence/strange-attractors-implemented-2026-05-20T16-34-40Z.txt`
  (sha256 `a19c38e9c7d7151607b07b1b773397dd4096f4f97bd3bc7d3a1d34a0f9db8a7c`).
- `tools/testkit/failing-tests-evidence/mandelbulb-explorer-implemented-2026-05-20T16-41-25Z.txt`
  (sha256 `2e73c3e347cc35356cfe05285416e9086f01efaf88abb7229a7e3a12afb18205`).
- `tools/testkit/mutation/sub-phase-closed-form-2026-05-20T16-48-00Z.json` —
  framework-validated mutation baseline carry-forward; B17 re-banked to
  the next per-sim implementation sub-phase (PATH-B per Stage 2 step 2.7).
- Sub-phase audit chain under `docs/_audits/phase-1/sub-phase-closed-form/`:
  Stage 0 / Stage 1 / Stage 2 checkpoints + landing audit + Stage 2
  evidence directory.

#### Changed (additive per Convention A)

- `tools/integrity/integrity/cat3_numerical/golden_values.py` —
  `_gather_tables` now picks up `closed-form/*.json` in addition to root
  (commit `closed-form-stage2-cat3-recurse`). Closes Phase 1 shift #16
  for the closed-form subdir; other category subdirs (agent-based,
  hybrid-pg, lattice, particle-fluids) remain non-recursed until their
  per-sim implementation sub-phases extend `_SUBDIRS_PICKED_UP`.
- `tools/integrity/integrity/scripts/verify_evidence.py` — now strips a
  `sha256:` prefix from `claimed` before comparing against the
  computed digest (commit `closed-form-stage2-verify-evidence-prefix`).
  Restores the load-bearing assertion against audits using the
  `sha256:HEX` convention (Phase 1 landing audit + both sub-phase
  checkpoints). Existing bare-hex behavior unchanged.
- `tools/testkit/equivalence/tolerance-budget.toml` — Stage 0
  carryover: `[phase] phase = "sub-phase-closed-form"`. No
  `[budgets.*]` widening (spec § 2.6 requires separate operator
  amendment).
- Phase 1 stub test bodies (`raise NotImplementedError`) at
  `packages/{strange-attractors,mandelbulb-explorer}/tests/test_{determinism,diagnostics,pbt_invariants}.py`
  replaced with their gate-fulfilling implementations (Stage 1 shift
  S1). Function signatures + imports preserved; the
  failing-tests-evidence files committed at `9766498` are UNTOUCHED
  and remain the gate-13 anchor.

#### Gates flipped GREEN at HEAD (both sims)

| # | Gate | strange-attractors | mandelbulb-explorer |
|---|---|---|---|
| 4 | code verification (golden-value) | GREEN | GREEN |
| 5 | Tier 1 NaN/Inf | GREEN | GREEN |
| 6 | Tier 2 closed_form (IC-7) | GREEN | GREEN |
| 7 | Cat 1 citations | GREEN | GREEN |
| 8 | Cat 2 public API | GREEN | GREEN |
| 9 | canonical capture | GREEN | GREEN |
| 10 | determinism (capture-twice-and-diff) | GREEN | GREEN |
| 11 | PBT invariants (Hypothesis) | GREEN | GREEN |
| 12 | perf-ledger first row | GREEN | GREEN |
| 13 | failing-tests replay verifiable | GREEN | GREEN |

### sub-phase-agent-based

Second per-sim implementation sub-phase under spec-Phase-1 per Phase
1 audit § 15 / closed-form sub-phase audit § 10. Lands gates 4–13
for the agent-based pair (`boids-3d`, `physarum`); the remaining
five Phase 1 sims (eulerian-smoke, lattice-boltzmann-d3q19,
mpm-multimaterial, reaction-diffusion-3d, sph-water) still ship
Phase-1 RED with `ModuleNotFoundError` pending their own per-sim
implementation sub-phases. No `-phase-N` tag pushed (spec § 7.12);
optional non-phase point-release `v0.1.2` is a banked operator
decision per `docs/phases/sub-phase-agent-based.md` § 5 + § 11.4.

#### Added

- `packages/boids-3d/boids_3d/` — public API exposing `reference`
  (Reynolds 1987 / 1999 three-rule flocking step on the named-agent
  fixture and on `(N, 3)` flock arrays; canonical Reynolds-1999
  parameter set), `sim` (`sim_runner_seeded` producing the
  1000-agent canonical capture; sibling `sim_runner_seeded_3agent`
  producing the canonical-3-agent capture; both match the testkit
  `SimRunner` Protocol — Stage 1 shift S3), `invariants`
  (Hypothesis-decorated `v_max_clamp_respected` and
  `particle_count_invariant`). The `sim` module's docstring is the
  load-bearing determinism-strategy declaration per charter § 1.4
  (sorted-by-index update order, BLAS-friendly mask-matmul reductions,
  no per-step RNG, single-conditional clamp).
- `packages/physarum/physarum/` — public API exposing `reference`
  (Jones 2010 five-component step + named-agent `step_to_deposit`
  for the gate-4 zero-trail golden + array-state `evolve`),
  `sim` (`sim_runner_seeded` producing the canonical
  `network-canonical-seed42-step5000` capture per spec Appendix D
  § D.2.3 — Stage 1 shift S4 documents the probe-vs-spec descriptor
  drift, Appendix D wins), `invariants` (Hypothesis-decorated
  `trail_mass_conserves_modulo_decay` and `agent_count_invariant`).
  The `sim` module's docstring is the load-bearing determinism-strategy
  declaration per charter § 1.4 (sorted-by-input-index agent order,
  deterministic sense reads, canonical tie-break, ordered
  `numpy.add.at` deposit scatter, mass-preserving periodic 3×3 blur).
- `captures/boids-3d-ref/flock-3agents-canonical-seed42-step1000.{h5,json}`
  (spec Appendix D § D.2.3; H5 sha256
  `a0f8757a4dd913149b01c043f4f705e6ec3001cbaf7f54db42a2fd76440903c3`).
- `captures/boids-3d-ref/flock-1000agents-seed42-step1000.{h5,json}`
  (spec Appendix D § D.2.3; H5 sha256
  `7e9064aff95e3672b0ffa9385d21cdbefbb0dc2c250b99c25b33cceec5f13ec0`).
- `captures/physarum-ref/network-canonical-seed42-step5000.{h5,json}`
  (spec Appendix D § D.2.3; H5 sha256
  `6c0c239e85522b0f9b073f55d810b9cc6d11e4ec7b62e2bbb2610ffaaa448f40`).
- `docs/perf-ledger.md` — three first-landing baseline rows:
  - `boids-3d / numpy-reference / flock-3agents-canonical-seed42-step1000 / 0.033s / i7-12700KF-linux-6.17`
  - `boids-3d / numpy-reference / flock-1000agents-seed42-step1000 / 17.592s / i7-12700KF-linux-6.17`
  - `physarum / numpy-reference / network-canonical-seed42-step5000 / 3.128s / i7-12700KF-linux-6.17`
- `tools/testkit/failing-tests-evidence/boids-3d-implemented-2026-05-20T18-02-02Z.txt`
  (sha256 `26032163d891ed4f648e9d0f4778d3ce4e10db2a336c9d4432fb950ade98b3a9`).
- `tools/testkit/failing-tests-evidence/physarum-implemented-2026-05-20T18-12-01Z.txt`
  (sha256 `991495b4ba1dcdb66faf2b23aff29121e87d0daf1fe6d2a0f55758fde6601427`).
- `tools/testkit/mutation/sub-phase-agent-based-2026-05-20T18-20-39Z.json` —
  framework-validated mutation baseline carry-forward; B17 re-banked
  to the continuous-CA implementation sub-phase (PATH-B per Stage 2
  step 2.7; default lean from closed-form audit § 7.6 continued).
- Sub-phase audit chain under `docs/_audits/phase-1/sub-phase-agent-based/`:
  Stage 0 / Stage 1 / Stage 2 checkpoints + landing audit + Stage 2
  evidence directory.

#### Changed (additive per Convention A)

- `tools/integrity/integrity/cat3_numerical/golden_values.py` —
  `_SUBDIRS_PICKED_UP` extended additively to include
  `Path("agent-based")` alongside `Path("closed-form")` (commit
  `agent-based-stage2-cat3-subdirs`). Picks up the agent-based
  goldens for Cat 3 verification; the remaining sibling subdirs
  (hybrid-pg, lattice, particle-fluids) remain non-recursed until
  their per-sim implementation sub-phases extend the tuple. Same
  additive shape as closed-form sub-phase Stage 2 N4.
- `tools/testkit/golden/tables/agent-based/boids-3agent-step1.json`
  and `physarum-deposit-step1.json` — each lifted from one
  `test_point` (1 anchor under the Cat 3 counting semantics) to
  three `test_points`, each carrying its own `independent_reference`
  block (3 anchors per spec § 2.4). No numerical information loss
  — the three pre-existing references that were packed into a
  single `source` block each become their own discrete anchor
  (commit `agent-based-stage2-cat3-anchors`).
- `tools/testkit/equivalence/tolerance-budget.toml` — Stage 0
  carryover: `[phase] phase = "sub-phase-agent-based"`. No
  `[budgets.*]` widening (spec § 2.6 requires separate operator
  amendment).
- Phase 1 stub test bodies (`raise NotImplementedError`) at
  `packages/{boids-3d,physarum}/tests/test_{determinism,diagnostics,pbt_invariants}.py`
  + the physarum `test_deposit_golden.py::test_total_mass_after_decay`
  stub replaced with their gate-fulfilling implementations (Stage
  1 shift S1; parallels closed-form Stage 1 S1). Function signatures
  + imports preserved; the failing-tests-evidence files committed
  at `5dd919c` are UNTOUCHED and remain the gate-13 anchor.

#### Gates flipped GREEN at HEAD (both sims)

| # | Gate | boids-3d | physarum |
|---|---|---|---|
| 4 | code verification (golden-value) | GREEN | GREEN |
| 5 | Tier 1 NaN/Inf | GREEN | GREEN |
| 6 | Tier 2 particle (IC-5) + Phase-0 scalar_field | GREEN | GREEN |
| 7 | Cat 1 citations | GREEN | GREEN |
| 8 | Cat 2 public API | GREEN | GREEN |
| 9 | canonical capture (TWO for boids, ONE for physarum) | GREEN | GREEN |
| 10 | determinism (capture-twice-and-diff; advisory ε for physarum chaotic) | GREEN | GREEN |
| 11 | PBT invariants (Hypothesis) | GREEN | GREEN |
| 12 | perf-ledger first row(s) | GREEN | GREEN |
| 13 | failing-tests replay verifiable | GREEN | GREEN |

## [0.1.0-phase-1] — Reference Sim TDD Bootstrap (2026-05-20; tag pushed by operator)

Phase 1 lands the reference-sim TDD bootstraps for nine simulation
references across categories closed-form, agent-based, continuous-CA,
particle-fluids, volumetric-grid, lattice, and hybrid-particle-grid.

### Added

#### Stage 1 — Common modules + Tier 2 substacks + Cat 4 grammars

- `common/common-cpp/` — Stack-C common module: capture I/O (`Reader` /
  `Writer`, IC-1, `raw-binary-v1` payload format shift documented in
  Stage 1 final checkpoint § 6), determinism `Config` (IC-3), Vulkan
  device-init declarations + ImGui / VDB / Alembic / USD export-hook
  stubs. `nlohmann/json` v3.11.3 and `doctest` v2.4.11 via FetchContent.
- `common/common-py/` — Stack-D common module: capture I/O wrapping
  Phase 0's `capture.CaptureManifest` (IC-2), determinism `Config`
  (IC-4), Taichi GGUI F-key workaround (`common_py.ggui`),
  watchfiles-based hot-reload (`common_py.hotreload`). Optional extras
  `[taichi]`, `[plotting]`, `[dev]`. B12 fix at `bcd9cb2`:
  `__init__.py` `__all__` reconciled with module surface
  (cat2.python-exports → 0 HARD_FAIL).
- `tools/diagnostics/diagnostics/tier2/particle/` (IC-5) — substack
  shipping `check_no_overlap`, `check_neighbor_list_integrity`,
  `check_momentum_conservation`, `check_count_invariance`.
- `tools/diagnostics/diagnostics/tier2/vector_field/` (IC-6) — substack
  shipping `check_divergence_free`, `check_circulation`,
  `check_helicity`, `check_energy_spectrum`.
- `tools/diagnostics/diagnostics/tier2/closed_form/` (IC-7) — substack
  shipping `check_output_stability`, `check_precision_sensitivity`,
  `check_bound_preservation`.
- Cat 4 grammars per charter § 1.7 R8 amendment (B1; commit `71d4a9e`):
  - Grammar (b) `<phrase "X" in Y>` at
    `tools/integrity/integrity/cat4_draft_time/grammars/phrase_in_file.py`.
  - Grammar (c) `<API X has shape Y>` at
    `tools/integrity/integrity/cat4_draft_time/grammars/api_shape.py`
    (Python AST + C++ regex resolvers; libclang follow-up banked as B11).

#### Stage 2 — Per-sim TDD bootstraps (9 sims; spec § 6.6 declares ≥ 2 PBT invariants per sim)

- `closed-form/strange-attractors` (commit `9766498`) — Lorenz /
  Rössler / Aizawa / Sprott-A / Pickover ODE family. Lorenz
  structural-invariants golden table at
  `tools/testkit/golden/tables/closed-form/lorenz-structural.json`
  with SymPy generator.
- `closed-form/mandelbulb-explorer` (commit `9766498`) — Hart 1996 /
  Quilez 2009 distance estimator (p = 8). Mandelbulb DE samples
  golden at
  `tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json`
  (3 anchor points; SymPy 30-digit precision for far-field per Stage
  2 shift #13).
- `agent-based/boids-3d` (commit `5dd919c`) — Reynolds 1987 three-rule
  flocking. 3-agent step-1 golden at
  `tools/testkit/golden/tables/agent-based/boids-3agent-step1.json`.
- `agent-based/physarum` (commit `5dd919c`) — Jones 2010 mold
  transport. 4-agent zero-trail deposit golden at
  `tools/testkit/golden/tables/agent-based/physarum-deposit-step1.json`.
- `continuous-ca/reaction-diffusion-3d` (commit `a159086`) — 3D
  Gray-Scott. MMS at
  `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`
  plus the RD-2D MMS co-bundle at
  `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/`
  per R8 amendment (Phase 0 RD-2D gains an MMS gate for the per-sim
  implementation phase).
- `particle-fluids/sph-water` (commit `cd20faa`) — DFSPH
  (Bender-Koschier 2015), references Phase-0-vendored SPlisHSPlasH
  (manifest SHA `6bff55a6...`; license MIT). DFSPH density-evolution
  two-particle golden at
  `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json`.
- `volumetric-grid/eulerian-smoke` (commit `216021a`) — Stam-Fedkiw
  stable-fluids. Taylor-Green-style MMS at
  `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`.
- `lattice/lattice-boltzmann-d3q19` (commit `b6abd7e`) — Qian 1992 BGK
  D3Q19. Algebraic reference only per R8 amendment (no Krüger 2017
  vendoring). D3Q19 equilibrium golden at
  `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` plus
  the first-principles derivation at
  `tools/testkit/golden/derivations/d3q19.md`. Shares the NS-2D MMS
  with eulerian-smoke per Stage 2 shift #18.
- `hybrid-pg/mpm-multimaterial` (commit `9de8048`) — MLS-MPM (Hu
  2018; 88-line reference). Quadratic B-spline shape-function golden
  at
  `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`.

#### Stage 2 — Testkit artifacts summary

- **3 MMS solutions:** RD-2D (R8 co-bundle), RD-3D, NS-2D Taylor-Green.
  NumPy ≡ SymPy within 1e-12 to 1e-14 at canonical test points.
- **7 new golden tables** (Phase 0's cubic-spline-kernel unchanged):
  Lorenz structural, mandelbulb DE, boids 3-agent, physarum deposit,
  DFSPH density-evolution, D3Q19 equilibrium, MLS-MPM quadratic-B-spline.
- Each Phase 1 golden carries an independent_reference block citing
  ≥ 3 sources per spec § 2.4 R9.
- All 9 sim packages ship Phase-1-light pyprojects with `pytest >= 8.0`
  as the sole `[dev]` extra; pytest is the uniform TDD-bootstrap
  framework across stacks (per Stage 2 shifts #11 / #15).
- 9 legacy-capture placeholder fixtures at
  `tests/fixtures/legacy-captures/<sim>-ref.{h5,json}` declaring the
  canonical capture descriptors per R8 amendment (`gray-scott-lambda-
  64cube-seed42-step2000`, `dam-break-1M-particles-seed42-step1000`,
  `drop-impact-128cube-seed42-step500`, plus structured names for the
  others).

#### Stage 3 — Convergence

- All 9 sim packages registered in `[tool.uv.workspace].members` in
  the root `pyproject.toml` (resolves banked items B7, B13, B15).
- `references/SPlisHSPlasH/MANIFEST.toml` `[scope].used_by_sims`
  updated from `[]` to `["sph-water"]`.
- `tools/integrity/integrity/phase1_registry.toml` enumerates every
  Phase 1 testkit artifact (3 Tier 2 substacks, 3 MMS solutions, 8
  golden tables, 3 Cat 4 grammars, vendored SPlisHSPlasH).
- `justfile` recipes: `test-tier2`, `test-sim <sim>`, `test-sims-all`,
  `verify-goldens`.
- `docs/dependencies.md` consolidated common-cpp + common-py deps from
  the Stage 1 `_staging/` files (which are now removed).
- `docs/diagnostics/overview.md` Tier 2 rows updated from "(Phase 1+)"
  placeholder to concrete `tier2-*.md` links.
- `docs/sim-specs/README.md` created (Phase 0 shipped only the
  per-sim dirs); indexes all 1 Phase 0 + 9 Phase 1 sims by category.
- `CHANGELOG.md` Phase 1 entry (this entry).

### Notes

- **Tag pushing.** The Phase 1 landing tag `v0.1.0-phase-1` is pushed
  by the operator after independent review of the landing audit at
  `docs/_audits/phase-1/landing-<UTC>.md` per spec § 7.12 R9 amendment.
- **Phase 0 regression.** RD-2D Phase 0 test suite remains 14/14
  green; no Phase 0 deliverable was edited.

## [0.0.0] — Initial placeholder

- Pre-tag placeholder. Phase 0 landing tag (`v0.0.0-phase-0`) is pushed by
  the operator after the landing-audit review per `docs/architecture.md`
  § 7.12.

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

### sub-phase-continuous-ca-rd3d

Third per-sim implementation sub-phase under spec-Phase-1 per Phase 1
audit § 15 / closed-form sub-phase audit § 10 / agent-based sub-phase
audit § 10. Lands gates 4–13 for **reaction-diffusion-3d** (the third
per-sim surface and the **first** to exercise MMS-based gate-5 with
formal-order verification per spec § 2.4). Operator scope-decomposed
the original "continuous-CA + sph-water" bundle into two sub-sub-phases;
this sub-phase ships RD-3D only (sibling `sub-phase-particle-fluids-sph-water`
drafts later in a separate session per the parent charter § 1.2). The
remaining four Phase 1 sims (eulerian-smoke, lattice-boltzmann-d3q19,
mpm-multimaterial, sph-water) still ship Phase-1 RED with
`ModuleNotFoundError` pending their own per-sim implementation
sub-phases. No `-phase-N` tag pushed (spec § 7.12); optional non-phase
point-release `v0.1.3` is a banked operator decision per
`docs/phases/sub-phase-continuous-ca-rd3d.md` § 5 + § 11.4.

#### Added

- `packages/reaction-diffusion-3d/reaction_diffusion_3d/` — public API
  exposing `reference` (Gray-Scott Pearson-1993 λ-region step on a
  7-point np.roll-based periodic Laplacian; `gray_scott_step_with_source`
  accepts an optional manufactured source tuple for MMS consumption;
  `canonical_params` / `evolve` / `initial_condition`), `sim`
  (`sim_runner_seeded` matching the testkit `SimRunner` Protocol;
  `compute_canonical_trajectory` produces the canonical 64³ ×
  2000-step capture per Appendix D § D.2.3), `invariants`
  (Hypothesis-decorated `monotone_bounds` and `periodic_bc_satisfied`
  per RD-3D spec § 6.6). The `sim` module's docstring is the
  load-bearing determinism-strategy declaration per charter § 1.5
  (np.roll-based 7-point stencil writes from read-only neighbors, no
  global reductions per step, no stochastic ops inside the step,
  pointwise update, deterministic capture ordering; Stack-C C++/Vulkan
  path deferred to Phase 2+).
- `captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.{h5,json}`
  (spec Appendix D § D.2.3; H5 sha256
  `a970ea2919dedb40591d228f41b83bf7f27791c99e6f6de2698d2fb9d09ba1cc`).
- `docs/perf-ledger.md` — one first-landing baseline row:
  `reaction-diffusion-3d / numpy-reference / gray-scott-lambda-64cube-seed42-step2000 / 10.144s / i7-12700KF-linux-6.17`.
- `tools/testkit/failing-tests-evidence/reaction-diffusion-3d-implemented-2026-05-20T19-36-54Z.txt`
  (sha256 `29d0b8bb5ebec53284dbf3d9607ef42c5c87efdb628faf38c175740011a05820`).
- `tools/testkit/mutation/sub-phase-continuous-ca-rd3d-2026-05-20T19-49-51Z.json`
  (sha256 `1bab3b6d588379a2ee58859501c45be68ea26f0c8a4098341df8de3a4820a1ac`) —
  **first REAL per-target kill-rate baseline** (B17 PATH-A; the
  workspace's first non-framework-validated mutation artifact). Per-target
  results: `reaction_diffusion_3d` source — `163 killed / 112 survived /
  275 total → 0.5927` (below `0.80` advisory; surfaces real coverage
  gaps in `sim.py` capture-orchestration + `invariants.py` PBT-decorator
  + `reference.py` stencil edges); `reaction_diffusion_3d_mms` MMS
  solution — `108 killed / 22 survived / 130 total → 0.8308` (above
  `0.80` threshold). Optional third target (RD-3D MMS scaffolding
  `runner.py`/`analyze.py`) was skipped with documented rationale per
  Stage 1 SHIFT S2: the heat-1D-specific scaffolding is not exercised
  by RD-3D's inline convergence study + is already covered by the
  Phase-0 `code_verification_mms` target.
- Sub-phase audit chain under `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/`:
  Stage 0 BLOCKED-replay (false start; resolved by sibling
  `sub-phase-replay-tool-hotfix` at `1f5fa0c`) + Stage 0 / Stage 1 /
  Stage 2 checkpoints + landing audit + Stage 2 evidence directory.
- `docs/phases/sub-phase-continuous-ca-rd3d.md` — this sub-phase's
  charter (committed at `90449f4`; introduces playbook entry P23 —
  MMS observed-OOA convergence-failure debugging — first-of-kind).
- `docs/_audits/phase-1/sub-phase-replay-tool-hotfix/` — sibling
  hotfix sub-phase that unblocked Stage 0's cross-phase replay
  (committed at `1f5fa0c`; landed B-hotfix-1 worktree-.venv-interpreter
  + B-hotfix-2 `uv run python ...` invocation form).

#### Changed (additive per Convention A)

- `tools/testkit/mutation/mutmut-config.toml` — additive per-target
  `[targets.reaction_diffusion_3d]` and `[targets.reaction_diffusion_3d_mms]`
  blocks; existing Phase-0 testkit/integrity targets UNTOUCHED. The
  per-target runner uses `uv run --no-sync pytest` so each mutmut
  subprocess resolves workspace members through the already-built
  uv-workspace virtualenv (the specific runner-rework that
  closed-form + agent-based sub-phases deferred — landed at PATH-A
  per charter § 4.3 Step 2.7).
- `tools/testkit/equivalence/tolerance-budget.toml` — Stage 0
  carryover: `[phase] phase = "sub-phase-continuous-ca-rd3d"`. No
  `[budgets.*]` widening.
- Phase 1 stub test bodies (`raise NotImplementedError`) at
  `packages/reaction-diffusion-3d/tests/test_{determinism,diagnostics,mms_convergence,pbt_invariants}.py`
  replaced with their gate-fulfilling implementations (Stage 1 SHIFT
  N/A — parallels closed-form S1 + agent-based S1). Function
  signatures + imports preserved; the failing-tests-evidence file
  committed at Phase 1 (`a159086`) is UNTOUCHED and remains the
  gate-13 anchor.
- `.pre-commit-config.yaml` — `check-added-large-files` `maxkb`
  raised from `10240` to `65536`. The prior 10-MB ceiling fails the
  first 3D capture (RD-3D's `.h5` is ~46 MB); the new 64-MB ceiling
  absorbs the RD-3D capture and the upcoming particle-fluids / MPM /
  eulerian-smoke / LBM 3D captures of similar order. Tooling-config
  edit (not substance); landed mid-Stage-1 per the in-line rationale
  in the hook's comment block.

#### Cat 3 disposition — NO-OP for `continuous-ca` subdir

RD-3D ships **no golden table** — its gate 5 is MMS-based per RD-3D
spec-ref § 7. `tools/testkit/golden/tables/continuous-ca/` is NOT
created; `_SUBDIRS_PICKED_UP` at
`tools/integrity/integrity/cat3_numerical/golden_values.py` is **NOT
extended** (remains `(Path("closed-form"), Path("agent-based"))`).
The operator-routable alternative (pre-create empty subdir as
placeholder for future sims) was banked default-skip; the
eulerian-smoke / LBM sub-phase will create the subdir when its first
golden lands. Recorded as Stage 2 SHIFT N2.

#### Gates flipped GREEN at HEAD (reaction-diffusion-3d)

| # | Gate | reaction-diffusion-3d |
|---|---|---|
| 4 | code verification — golden N/A; reads through to MMS gate 5 | N/A |
| 5 | **MMS-based code verification** — combined OOA = 2.0056 vs formal `p=2`, within ±0.5 (first-of-kind for the workspace) | **GREEN** |
| 6 | Tier 1 NaN/Inf | GREEN |
| 7 | Tier 2 scalar_field (Phase-0 substack) + advisory mass-balance recurrence | GREEN |
| 8 | Cat 1 citations (Gray & Scott 1983, Pearson 1993, Roy 2005) | GREEN |
| 9 | Cat 2 public API per probe § 5 | GREEN |
| 10 | canonical capture | GREEN |
| 11 | determinism (capture-twice-and-diff; bit-exact same-hw) | GREEN |
| 12 | PBT invariants (Hypothesis-decorated `monotone_bounds`, `periodic_bc_satisfied`) | GREEN |
| 13 | perf-ledger first row | GREEN |
| 13 (anchor) | failing-tests replay verifiable (worktree at `a159086` → 4 ModuleNotFoundError) | GREEN |

### sub-phase-numba-integration

Focused infrastructure hotfix sub-phase landed between
`sub-phase-particle-fluids-sph-water` Stage 1's R18 STOP-AND-SURFACE
and Stage 1's continuation. Adds `numba >= 0.61, < 0.66` (0.65.1
known-good) as a project-wide runtime dependency at
`tools/testkit/pyproject.toml` (the universal workspace dep at HEAD;
every sim + integrity + diagnostics consumer transitively gets numba).
Documents the project-wide JIT-acceleration convention at
`docs/common/numba.md`: `@njit(fastmath=False, cache=True)` is the
mandatory decorator form; `fastmath=True`, unguarded `parallel=True`,
and `error_model="numpy"` are banned. Determinism contract verified
by the regression test at `tools/testkit/numba_harness/tests/test_numba_determinism.py`
(5/5 PASS): FP-equivalence with pure-NumPy reference (< 1e-9
tolerance) + bit-deterministic-with-itself + cold-vs-warm cache
identity. Cross-version bit-equality not formally guaranteed by
numba upstream; project pins + verifies via regression test. No
`-phase-N` tag pushed.

### sub-phase-particle-fluids-sph-water

Fourth per-sim implementation sub-phase under spec-Phase-1 (the
sibling half of the originally-bundled "continuous-CA + sph-water"
pair per `sub-phase-continuous-ca-rd3d.md` § 1.2). Lands gates 4–13
for **sph-water** through SIX R-class remediation surfaces
(R12 → R20) — the most extensively-routed sub-phase to date.
Algorithmic stack arrived at:
**scipy.spatial.cKDTree** for neighbor query (R17) +
**numba @njit(fastmath=False, cache=True)** for the per-pair inner
math (R18; consumes the project infrastructure landed at the
interleaved `sub-phase-numba-integration` hotfix).
Canonical capture lands at the **100K-instance** of the Phase 1 R8
`dam-break-1M-particles-seed42-step1000` descriptor per R20 routing;
full N=1M is contracted forward to Stack-C Phase-2+ per spec-ref
§ 5. The three remaining Phase 1 sims (eulerian-smoke,
lattice-boltzmann-d3q19, mpm-multimaterial) still ship Phase-1 RED
pending their own per-sim implementation sub-phases. No `-phase-N`
tag pushed; optional non-phase point-release `v0.1.4` is a banked
operator decision per `docs/phases/sub-phase-particle-fluids-sph-water.md`
§ 5 + § 11.4.

#### Added

- `packages/sph-water/sph_water/` — public API exposing `reference.dfsph`
  (3D Monaghan cubic-spline kernel + neighbor query + density + density-
  evolution + DFSPH solver scaffolding; cited by name to Bender &
  Koschier 2015, Monaghan 1992/2005), `sim` (canonical 100K-particle
  capture + diagnostic-tier helpers + 7-clause determinism declaration
  docstring), `invariants` (Hypothesis-decorated `density_nonneg` +
  `kernel_normalization_unit_volume`).
- Algorithmic-evolution arc through six R-class surfaces:
  - **R12** (storage > 64 MB ceiling) — operator routed (a): raised
    pre-commit `check-added-large-files` ceiling from 64 MB → 1 GB
    at `.pre-commit-config.yaml`. Headroom for future MPM / LBM /
    eulerian-smoke 3D captures.
  - **R16** (O(N²) tensor OOM at N=1M) — operator routed (i):
    pure-Python cell-list spatial-hash (intermediate hop; superseded
    by R17). Function name `cell_list_neighbor_query` retained for
    public-API stability; body replaced.
  - **R17** (Python-loop overhead at canonical scale) — operator
    routed (I): scipy.spatial.cKDTree.query_pairs + symmetrize +
    lexsort. Adds `scipy >= 1.10` to `tools/testkit/pyproject.toml`.
    Determinism preserved via sort-by-(pair_i, pair_j) wrap.
  - **R18** (aggregate runtime > 10⁴ s) — operator routed (α):
    numba @njit(fastmath=False, cache=True) inner math via the
    interleaved `sub-phase-numba-integration` hotfix.
    `_density_evolution_jit_inner` + `_density_jit_inner` at
    `sph_water.reference.dfsph`; thin wrappers `density_evolution_jit`
    + `density_jit`. FP-equivalent (1e-9) with pure-NumPy variants;
    bit-deterministic with themselves.
  - **R19** (1-hour wall-clock threshold) — operator REVOKED. The
    threshold was set without per-step decomposition rationale;
    R20 routing accepted observed reality as honest baseline.
  - **R20** (canonical N=1M wall-clock impractical for pure-Python
    reference) — operator routed (B): per-sub-phase descriptor
    override to **100K-instance**. Phase 1 R8 Appendix D 1M
    descriptor stays as canonical contract for Stack-C Phase-2+
    per spec-ref § 5. Capture descriptor reflects honest contents:
    `dam-break-100K-particles-seed42-step1000`. Algorithmic + API
    contract that Stack-C reproduces at full N is established.
- 22 sph-water tests landed (11 prior gate tests + 6 spatial-hash-
  equivalence tests at R16/R17 + 4 numba-JIT-equivalence tests at
  R18 + 1 pair-array-equivalence test).
- Canonical capture at
  `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.{h5,json}`;
  H5 size 58.80 MB (sha256 `7590149221180f82170b41a20d14c0e197a6b3f570cfcf9307543947c5683d2f`).
- Perf-ledger first row appended for
  `(sph-water, numpy-reference + scipy.cKDTree + numba-@njit(fastmath=False, cache=True), dam-break-100K-particles-seed42-step1000)`:
  wall_clock 1291.854 s (~21.5 min; per-step ~1.29 s) on
  `i7-12700KF-linux-6.17`. Documented as the Python NumPy reference
  performance ceiling that Stack-C Phase-2+ compiled implementations
  will be measured against per spec § 11.3.
- Cat 3 _SUBDIRS_PICKED_UP extended additively with
  `Path("particle-fluids")` after lifting the DFSPH density-evolution
  golden from 1 anchor to 3 discrete `independent_reference` entries
  (mirror of agent-based Decision A precedent at commits `3ce7809`
  + `d156792`).
- B17 PATH-A continued — second proof-point of the per-target
  mutmut + uv-workspace runner infrastructure established at
  `sub-phase-continuous-ca-rd3d`. Additive
  `[targets.sph_water]` + `[targets.sph_water_dfsph_generator]`
  blocks at `tools/testkit/mutation/mutmut-config.toml`; existing
  RD-3D + testkit/integrity targets UNTOUCHED. Real per-target
  kill-rate baseline:
  - `sph_water`: 817 mutants, 0.5581 kill rate
    (below 0.80 advisory threshold; banked as test-augmentation
    candidate per RD-3D precedent).
  - `sph_water_dfsph_generator`: 108 mutants, 0.0000 kill rate
    (real test-coverage gap — runner verifies SIM vs TABLE but
    never invokes the GENERATOR; banked as SHIFT N4 for sph-water
    test-augmentation or testkit infrastructure work).
  Numba mutation behavior verified: mutations propagate through
  the JIT cache (the 600-mutant dfsph.py count + 0.6150 kill rate
  confirms mutations ARE taking effect through numba JIT).

#### Gates flipped GREEN at HEAD (sph-water)

| # | Gate | sph-water |
|---|---|---|
| 4 | code verification — reads through to gate-5 (golden) | N/A |
| 5a | cubic-spline-kernel golden (Phase 0; 9 fixture points; abs=1e-12) | **GREEN** |
| 5b | DFSPH density-evolution golden (Phase 1; 3-anchor post-lift; abs=1e-15) | **GREEN** |
| 6 | Tier 1 NaN/Inf | GREEN |
| 7 | Tier 2 particle (IC-5) | GREEN |
| 8 | Cat 1 citations (Bender-Koschier 2015 + Monaghan 1992/2005) | GREEN |
| 9 | Cat 2 public API per probe § 5 | GREEN |
| 10 | canonical capture (100K-instance per R20 routing) | GREEN |
| 11 | determinism (`test_run_twice_epsilon_diff` via diagnostic-tier) | GREEN |
| 12 | PBT invariants (`density_nonneg`, `kernel_normalization_unit_volume`) | GREEN |
| 13 | perf-ledger first row (~21.5 min canonical at 100K) | GREEN |
| 13 (anchor) | failing-tests replay verifiable (worktree at `cd20faa` → 5 ModuleNotFoundError) | GREEN |

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

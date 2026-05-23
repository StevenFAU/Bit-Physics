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

### sub-phase-conventions-consolidation

Operator-routed cross-sub-phase conventions doc consolidation per
`sub-phase-particle-fluids-sph-water` landing § 9.3 row 7. New
canonical reference at `docs/conventions/sub-phase-conventions.md`
(696 lines, sha256 `004d7011…600a3e6`) consolidates the patterns
shared across the four landed per-sim implementation sub-phases
(closed-form, agent-based, continuous-CA-rd3d, particle-fluids-sph-water)
plus three focused infrastructure-hotfix sub-phases (replay-tool-hotfix,
numba-integration, mutation-script-hotfix). Future sub-phase plan-drafting
reads this doc FIRST, then inherits sim-specific deltas from the
most-recent prior sub-phase landing. Section N "PROPOSED: Stage 0
canonical-descriptor scope-analysis" anticipates the load-bearing
discipline that sub-phase-eulerian-smoke first practiced.

#### Added

- `docs/conventions/sub-phase-conventions.md` — 14-section reference
  (A architecture, B audit chain, C commit conventions, D replay/tag,
  E gate-13 worktree, F determinism, G numba, H vendored-upstream,
  I Cat 3 subdir pattern, J B17 routing, K R-class STOP-AND-SURFACE,
  L banked observations carry-forward, M 65-shift inventory,
  N PROPOSED Stage 0 Task 0.4, O coherence note).
- Audit chain at `docs/_audits/phase-1/sub-phase-conventions-consolidation/`.

### sub-phase-eulerian-smoke

Fifth per-sim implementation sub-phase under spec-Phase-1; **first
volumetric-grid sim** in the project (spec § 5.6), **second MMS-using
sub-phase** (after RD-3D); **first sub-phase plan drafted AGAINST the
new conventions doc** rather than inheriting from the most-recent
template; **first practical exercise of conventions doc § N PROPOSED
Stage 0 Task 0.4 canonical-descriptor scope-analysis** (validated and
recommended for graduation PROPOSED → established). Lands gates 4–13
for **eulerian-smoke** at the Python NumPy reference stack;
Stack-C C++/Vulkan port deferred to Phase-2+ per spec-ref § 5.
Stam-Fedkiw stable-fluids pipeline: MacCormack-corrected semi-Lagrangian
advection + Jacobi pressure-projection + vorticity-confinement
skeleton + scalar smoke density advection. Two canonical captures
per Appendix D § D.2.3:
`taylor-green-128cube-seed42-step500` (3D, cadence-50, ~704 MB,
~11.5 min wall) + `lid-driven-cavity-128sq-re100-seed42-step1000`
(2D, full cadence, ~4 MB, ~5 s wall). MMS observed OOA = 1.99
(advection) + 2.00 (projection), both within ±0.5 of formal p=2 per
spec-ref § 6.1. B17 PATH-A third proof-point landed with per-target
real baselines. The two remaining Phase 1 sims
(`lattice-boltzmann-d3q19`, `mpm-multimaterial`) still ship Phase-1
RED pending their own per-sim implementation sub-phases. No
`-phase-N` tag pushed; optional non-phase point-release `v0.1.5`
is a banked operator decision per
`docs/phases/sub-phase-eulerian-smoke.md` § 5 + § 11.4 (default
lean: no tag).

#### Added

- `packages/eulerian-smoke/eulerian_smoke/` — public API exposing
  `reference.stable_fluids` (Stam/Fedkiw 2D + 3D pipeline:
  semi-Lagrangian + MacCormack + Jacobi projection + vorticity
  confinement + scalar smoke density advection; cited by name to
  Stam 1999, Fedkiw 2001, Taylor-Green 1937), `sim`
  (canonical 3D Taylor-Green capture + 2D lid-driven-cavity capture +
  diagnostic-tier helpers + 8-clause determinism declaration
  docstring), `invariants` (Hypothesis-decorated
  `divergence_free_post_projection` + `smoke_density_nonneg`).
- Two canonical captures landed at `captures/eulerian-smoke-ref/`
  per Appendix D § D.2.3 (re-anchored against probe-vs-Appendix-D
  drift inherited from Phase 1 Stage 2 shift #17). The 3D capture
  uses cadence-50 routing per Stage 0 Task 0.4 finding to fit the
  1 GB pre-commit ceiling.
- Perf-ledger first-landing rows: 691.587 s @ 128³ × 500
  (Taylor-Green); 5.099 s @ 128² × 1000 (lid-driven-cavity).
- MMS inline convergence study at
  `packages/eulerian-smoke/tests/test_mms_convergence.py` per
  Path-Y operator routing (RD-3D Stage 1 S2 precedent); the
  heat-1D-specialized `tools/testkit/code_verification/mms/runner.py`
  remains UNTOUCHED.
- B17 PATH-A third proof-point — additive
  `[tool.mutmut.targets.eulerian_smoke]` +
  `[tool.mutmut.targets.incompressible_ns_2d_mms]` blocks; existing
  testkit/integrity/RD-3D/sph-water targets UNTOUCHED. Per-target
  real baselines: 0.4879 (sim source) + 0.6962 (MMS solution),
  both below the 0.80 advisory threshold; surviving mutant IDs
  banked for future test-augmentation work.
- Five Stage 1 SHIFTS surfaced + resolved: S1 axis-convention rewrite
  (2D/3D mismatch surfaced via MMS OOA); S2 MacCormack-corrected SL
  (spec-prescribed 2nd-order accuracy); S3 collocated-grid centered-
  diff inconsistent-stencil residual divergence (Phase-2+ Stack-C
  MAC-staggered port deferred per sim spec-ref § 5); S4 `np.mod`
  FP-edge integer-modulus guard (`i0 % Nx`); S5 lid-driven-cavity
  dt routing 0.005 → 0.001 for 1000-step stability.

#### Sub-phase coherence

- **First practical exercise of conventions doc § N PROPOSED.**
  Stage 0 Task 0.4 canonical-descriptor scope-analysis estimated
  3D Taylor-Green per-step floor at 0.93 s (n_jacobi=20); Stage 1
  measured 1.348 s. The Stage 0 estimate was approximately correct
  (within ~50%) — the production-correction factor (~1.5×) is now
  measured-empirical for future MMS-style 3D smoke runs. The Stage 2
  landing audit recommends conventions doc § N graduation from
  PROPOSED → established.
- **First sub-phase to land Stage 1 in a single session** (no R-class
  STOP-AND-SURFACE arcs), contrast with sph-water's six-R-class arc
  (R12-R20). Demonstrates the value of Stage 0 scope-analysis as a
  pre-flight discipline.

#### Gate-status (all GREEN at HEAD)

| Gate | Status | Notes |
|---|---|---|
| 4 | GREEN | reads through to gate 5 |
| 5 | GREEN | MMS inline (advection OOA 1.99, projection OOA 2.00; both within ±0.5 of formal p=2) |
| 6 | GREEN | Tier 1 NaN/Inf at diagnostic-tier 32³ |
| 7 | GREEN | Tier 2 vector_field (IC-6) — first IC-6 sim-test consumption |
| 8 | GREEN | Cat 1 citations (Stam, Fedkiw, Taylor-Green) |
| 9 | GREEN | Cat 2 public API per probe § 5 |
| 10 | GREEN | TWO canonical captures per Appendix D § D.2.3 |
| 11 | GREEN | determinism over-achieved bit-exact via `sim_runner_diagnostic` |
| 12 | GREEN | 2 PBT invariants |
| 13 | GREEN | perf-ledger rows (691.587 s + 5.099 s) |
| 13 (anchor) | GREEN | worktree replay at `216021a` → 4 ModuleNotFoundError |

### sub-phase-git-lfs-migration

Focused infrastructure-hotfix sub-phase landed CONFIRMED at
`0672554`. Adopts Git LFS for `captures/**/*.h5` to absorb the
704 MB eulerian-smoke Taylor-Green capture that exceeded GitHub's
100 MB per-file hard limit. 11-commit history rewrite from
`34c7d34` to `cf13d1c` via fast-forward; bit-identity replay
invariant `9399fc33…909f34` held byte-identically at pre-push +
post-push runs (12th + 13th invocations). All 10 LFS-tracked
captures verified bit-identical to canonical sha256s.

### sub-phase-lattice-boltzmann-d3q19

Sixth per-sim implementation sub-phase under spec-Phase-1 per Phase
1 audit § 15. Lands gates 4–13 for `lattice-boltzmann-d3q19`
(D3Q19 BGK lattice-Boltzmann; Qian-d'Humières-Lallemand 1992); MPM
is the LAST remaining bootstrapped sim. **First lattice-category
sim in the project + first cross-discretization NS-2D MMS exercise
+ second sub-phase exercising conventions doc § N Task 0.4 as
established discipline + first sub-phase under Git LFS
infrastructure.** No `-phase-N` tag pushed; optional non-phase
point-release `v0.1.6` is a banked operator decision per
`docs/phases/sub-phase-lattice-boltzmann-d3q19.md` § 11.4.

#### Added

- **Two LFS-tracked canonical captures** at `captures/lbm-ref/` per
  Appendix D § D.2.3 (full cadence; N_z=3 z-periodic depth-3 slab):
  `poiseuille-64x32-seed42-step1000.h5` (202.35 MB; bounce-back
  walls + body-force in x) and `couette-32x16-seed42-step500.h5`
  (27.41 MB; bounce-back + moving top-plate at u_wall=0.05).
- LBM source modules at `packages/lattice-boltzmann-d3q19/
  lattice_boltzmann_d3q19/`: `reference.{equilibrium, bgk, constants}`
  (feq, density/momentum moments, bgk_step+Guo forcing, stream,
  bounce-back, 19-direction lattice constants), `sim` (sim_runner_seeded
  + sim_runner_seeded_couette + sim_runner_diagnostic), `invariants`
  (equilibrium_density + equilibrium_momentum Hypothesis-decorated
  callables).
- Two perf-ledger first-landing rows
  (`hardware_id = i7-12700KF-linux-6.17`; 3.784 s Poiseuille +
  0.604 s Couette).
- Phase 1 GREEN evidence at
  `tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-implemented-2026-05-22T22-20-01Z.txt`
  (sha256 `95be800a…45b89002`).
- D3Q19 equilibrium golden table at `tools/testkit/golden/tables/
  lattice/d3q19-equilibrium.json` lifted from 1 packed anchor to
  **4 discrete `independent_reference` entries** (hand-derivation +
  Qian 1992 + Krüger 2017 + Python regenerator); preserves every
  citation verbatim per conventions doc § I.3.
- `_SUBDIRS_PICKED_UP` at `tools/integrity/integrity/cat3_numerical/
  golden_values.py` extended additively with `Path("lattice")`.
  Sibling subdirs `hybrid-pg` + `continuous-ca` + `volumetric-grid`
  remain non-recursed pending future per-sim sub-phases
  (`continuous-ca` + `volumetric-grid` are NO-OP MMS-only precedent;
  `hybrid-pg` awaits MPM Decision A or NO-OP routing).
- B17 PATH-A continue — fourth proof-point: additive
  `[tool.mutmut.targets.lattice_boltzmann_d3q19]` block in
  `tools/testkit/mutation/mutmut-config.toml`; existing testkit/
  integrity/RD-3D/sph-water/eulerian-smoke targets UNCHANGED.
- W1 pre-commit ceiling raise: `args: ["--maxkb=2097152"]` (2 GB)
  at `.pre-commit-config.yaml` — convergence-file inventory entry.
- This audit chain (8 closing commits): Stage 0 tolerance-budget +
  checkpoint + back-fill (`c463df0`, `f46eb78`, `040f5cf`); Stage 1
  ceiling-raise (`2edc163`), implementation feat (`5095185`),
  checkpoint (`f0f37a2`), back-fill (`8fe564f`); Stage 2 Cat 3
  lift + pickup (`0f8ddde`, `d080463`) + landing audit + back-fill
  (final SHAs).

#### Verified

| Gate | Status | Notes |
|---|---|---|
| 4 | GREEN | reads-through to gate 5 |
| 5 (a) | GREEN | D3Q19 equilibrium golden at absolute 1e-15 |
| 5 (b) | GREEN | NS-2D MMS observed OOA = **2.39** (formal p=2, ±0.5); first cross-discretization comparison vs eulerian-smoke 1.99/2.00 on shared MMS surface |
| 6 | GREEN | Tier 1 NaN/Inf scan |
| 7 | GREEN | Tier 2 vector_field (IC-6) on macroscopic moments — `check_divergence_free` advisory + `check_circulation` |
| 8 | GREEN | Cat 1 citations (Qian 1992 DOI; Krüger 2017 ISBN citation-only) |
| 9 | GREEN | Cat 2 public API per probe § 5 |
| 10 | GREEN | TWO canonical captures via LFS at full cadence; N_z=3 z-periodic depth-3 slab |
| 11 | GREEN | determinism over-achieved bit-exact via `sim_runner_diagnostic` (16x8x3 × 50 steps) — spec declared `bit-exact-effort`; Stack-D NumPy reference achieves bit-exact cleanly per conventions doc § F.4 |
| 12 | GREEN | 2 PBT invariants (equilibrium_density + equilibrium_momentum) in Ma < 0.1 band |
| 13 | GREEN | perf-ledger rows (3.784 s + 0.604 s) |
| 13 (anchor) | GREEN | worktree replay at `b6abd7e` → 5 ModuleNotFoundError |

### sub-phase-mpm-multimaterial

**LAST per-sim implementation sub-phase under spec-Phase-1**; closes
the 9-sim gates-4-13 implementation arc through Stack-D Python NumPy
reference. Lands gates 4-13 for `mpm-multimaterial` (MLS-MPM Hu-2018
quadratic-B-spline kernel; multimaterial constitutive surface declared,
single neo-Hookean material populated at this sub-phase per
algebraic.md § 3 "Phase 2+ populates the constitutive-model table").
**First hybrid-pg category sim in the project + first sub-phase
consuming BOTH IC-5 (particle) AND IC-6 (vector_field) Tier 2
diagnostics + second numba-using sub-phase (after sph-water; LBM did
not use @njit) + third consecutive single-session Stage 1 anchoring
the conventions doc § N graduation recommendation.** Operator-pushed
`v0.1.9` non-phase point-release tag marks the structural milestone
(no `-phase-N` suffix per spec § 7.12; tag is operator action). After
MPM lands CONFIRMED, spec-Phase-2 (cross-stack replication) becomes
dispatchable at `v0.2.0-phase-2`.

#### Added

- **ONE LFS-tracked canonical capture** at `captures/mpm-ref/` per
  Appendix D § D.2.3:
  `drop-impact-128cube-seed42-step500.{h5,json}` (1.13 GB; 1M
  particles × 128³ grid × 500 steps; cadence-50 — 11 frames
  committed; wall-clock 158.052 s; soft neo-Hookean elastic E=4kPa,
  ν=0.3; sticky floor at z-index 4; payload sha256
  `73e00d09…b5ebae`).
- MPM source modules at
  `packages/mpm-multimaterial/mpm_multimaterial/`:
  `reference.shape_functions` (pure Python N(x) + partition-of-unity,
  no numba — small kernel),
  `reference.mls_mpm` (numba @njit P2G + p2g_with_stress + G2P +
  grid_update + deformation_update + compute_particle_stresses +
  advect_particles),
  `sim` (sim_runner_seeded + sim_runner_diagnostic; 10-clause
  determinism docstring per conventions doc § F.1),
  `invariants` (mass_conservation_p2g_g2p + partition_of_unity_b_spline
  Hypothesis-decorated callables).
- One perf-ledger first-landing row
  (`hardware_id = i7-12700KF-linux-6.17`; 158.052 s; algorithmic stack
  `numpy-numba-reference`).
- Phase 1 GREEN evidence at
  `tools/testkit/failing-tests-evidence/mpm-multimaterial-implemented-2026-05-23T02-13-16Z.txt`
  (sha256 `d0bd6f9c…d2ce34e7`).
- MLS-MPM quadratic-B-spline golden table at
  `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`
  lifted from 1 packed anchor to **4 discrete
  `independent_reference` entries** (hand-derivation + Hu 2018 +
  Steffen-Kirby-Berzins 2008 + Python re-derivation); preserves
  every citation verbatim per conventions doc § I.3. Post-lift
  sha256 `9ccab888…378997`.
- `_SUBDIRS_PICKED_UP` at
  `tools/integrity/integrity/cat3_numerical/golden_values.py`
  extended additively with `Path("hybrid-pg")`. Final state at
  Stage 2 close: `(closed-form, agent-based, particle-fluids,
  lattice, hybrid-pg)` — **five entries closing the per-sim Phase 1
  Cat 3 additive-pickup arc across all sim categories with goldens**.
- B17 PATH-A continue — **fifth-and-final proof-point**: additive
  `[tool.mutmut.targets.mpm_multimaterial]` block in
  `tools/testkit/mutation/mutmut-config.toml`; existing testkit/
  integrity/RD-3D/sph-water/eulerian-smoke/LBM +
  incompressible-ns-2d-mms targets UNCHANGED. Second numba-using
  PATH-A target after sph-water `dfsph.py`.
- This audit chain (10 closing commits): plan draft (`4f64d78`);
  Stage 0 tolerance-budget + checkpoint + back-fill (`399d32e`,
  `8a4ba56`, `0c71bab`); Stage 1 implementation feat (`9bd770e`),
  checkpoint (`53349c1`), back-fill (`e38223d`); Stage 2 Cat 3 lift
  + pickup (`4724284`, `9b19c26`) + mutation-PathA (TBD) + landing
  audit + back-fill (final SHAs).

#### Verified

| Gate | Status | Notes |
|---|---|---|
| 4 | GREEN | reads-through to gate 5 |
| 5 | GREEN | MLS-MPM quadratic-B-spline golden at absolute 1e-15 (2 tests × 13 sample/PoU values); no MMS arm at this sub-phase (linear-elasticity MMS deferred per sim-spec-ref § 6.1) |
| 6 | GREEN | Tier 1 NaN/Inf scan over canonical-trajectory diagnostics |
| 7 | GREEN | Tier 2 **hybrid surface — FIRST sub-phase consuming BOTH IC-5 AND IC-6**: particle count_invariance + momentum_conservation_drift advisory + vector_field grid-momentum L1 |
| 8 | GREEN | Cat 1 citations (Hu 2018 DOI; 88-line reference citation-only per R8; Steffen-Kirby-Berzins 2008 DOI) |
| 9 | GREEN | Cat 2 public API per probe § 5 |
| 10 | GREEN | ONE LFS-tracked canonical capture at cadence-50 (1.13 GB committed; within 2 GB W1 ceiling at ~55%) |
| 11 | GREEN | determinism over-achieved bit-exact via `sim_runner_diagnostic` (16³ × 5K particles × 50 steps) — spec declared `epsilon-same-stack-same-hw`; Stack-D Python NumPy + numba reference achieves bit-exact cleanly per conventions doc § F.4 |
| 12 | GREEN | 2 PBT invariants (mass_conservation_p2g_g2p + partition_of_unity_b_spline); Hypothesis 50 examples each |
| 13 | GREEN | perf-ledger row (158.052 s) |
| 13 (anchor) | GREEN | worktree replay at `9de8048` → 4 ModuleNotFoundError |

### sub-phase-taichi-integration

**FIRST spec-Phase-2 sub-phase**; focused-infrastructure shape mirroring
`sub-phase-numba-integration` per `docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md`
§ 10.5 item 4. Establishes Stack-D (Python / Taichi) workspace surface
before subsequent spec-Phase-2 per-sim Stack-D port sub-phases consume
it. Resolves the **common-py adoption decision** banked since the
numba-integration § 2 re-anchor finding. Operator-routed D1=SUPERSEDE
(existing `docs/phases/phase-2-cross-stack-replication.md` 10-stage
monolithic plan is NOT the dispatch vehicle; per-sub-phase decomposition
matching Phase-1 pattern carries forward); D2 row 2 transitions
SCOPED IN → RESOLVED at this sub-phase close; D3=v0.1.0-phase-1 replay
anchor for all spec-Phase-2 sub-phases until `v0.2.0-phase-2` lands.

#### Added

- **`common/common-py/` workspace registration** in root
  `pyproject.toml` `[tool.uv.workspace].members` (14th member;
  resolves "infrastructure shipped, not yet wired" state surfaced at
  numba-integration § 2).
- **Taichi as workspace-accessible dependency** —
  `taichi>=1.7,<2.0` promoted from `common/common-py/pyproject.toml`
  `[project.optional-dependencies].taichi` to `[project].dependencies`
  per Task 0.3 routing (a): Stack-D-only scoping (Stack-B/C developers
  omit common-py from their workspace install). Upper bound tightened
  per re-pin policy convention (`docs/conventions/sub-phase-conventions.md`
  § H.4).
- **`docs/common/taichi.md` convention doc** (361 lines including
  Stage-2 § 4.6 addendum) — sister to `docs/common/numba.md`; documents
  required `ti.init` form (`arch=ti.cpu, random_seed=<seed>,
  cpu_max_num_threads=1, offline_cache=True`), banned flags
  (`fast_math=True`, `default_fp=ti.f32` mismatch, unguarded parallel
  reductions), the 4 spec § 4.4 known limitations + workarounds + the
  Taichi-locale-DeprecationWarning workaround (§ 4.5) + the
  `@ti.kernel` `-> None` annotation TypeError surface (§ 4.6).
- **`common_py.determinism.set_taichi_deterministic` extended** with
  `arch: str = "cpu"` parameter (`SUPPORTED_TAICHI_ARCHS = cpu / cuda
  / vulkan / metal`); raises `ValueError` on unrecognised arch;
  backward-compatible default preserves existing callers; uses the
  correct Taichi 1.7.4 determinism mechanism. **Latent-bug fix
  (SHIFTED N2):** charter § 1.4.1 prescribed `deterministic_mode=True`
  is NOT a valid Taichi 1.7.4 `ti.init` kwarg (verified by signature
  inspection); the pre-Stage-1 implementation would have always raised
  at runtime if any caller had invoked it with taichi installed.
- **12 unit tests** at `common/common-py/tests/test_determinism.py`
  covering all 4 backends + ValueError path + backward-compat path +
  monkeypatched missing-taichi path (rewritten from the pre-Stage-1
  Stage-1-pre-assumption test); +7 net new tests.
- **Hello-physics Taichi smoke sim** at
  `common/common-py/smoke/hello_taichi.py` (1D explicit diffusion;
  Taichi backend; sibling to `advection_1d.py`). Exercises
  `set_taichi_deterministic` + `Capture.write_capture` + `FKeyDispatcher`
  (CI-skipped) + `watch_and_reexec` (CI-skipped). Smoke-tier capture at
  `common/common-py/smoke/captures/hello-taichi-cpu-seed42-step100.{h5,json}`
  (47 KB; NOT LFS-tracked at this path; smoke-tier only — not a
  canonical-corpus capture per Appendix D § D.2.3). Kernel module
  deliberately omits `from __future__ import annotations` per spec
  § 4.4 limitation #2 and `-> None` return annotations per the
  Taichi-1.7.4 AST-transformer limitation discovered at Stage 1
  (SHIFTED N3).
- **`tools/testkit/taichi_harness/`** regression-test subpackage —
  non-shadowing name per numba § 8 N2 lesson. 5 tests at
  `tests/test_taichi_determinism.py`: FP-equivalence vs pure-NumPy at
  N ∈ {64, 256, 1024}; run-to-run bit-determinism; cold-vs-warm
  offline-cache identity. All 5 use `pytest.importorskip("taichi")`
  for R-T1 CI-without-Taichi mitigation per charter § 9.
- **filterwarnings amendment** at `common/common-py/pyproject.toml`
  `[tool.pytest.ini_options]`: filters
  `DeprecationWarning:taichi.*` + `locale\\.getdefaultlocale` to
  preserve strict-warnings posture against Taichi 1.7.4's internal
  Python-3.12 locale-deprecation call (SHIFTED N4; documented at
  `docs/common/taichi.md` § 4.5).
- **`docs/dependencies.md` additive entry** for Taichi pin +
  `bit-physics-common-py` as workspace member.
- This audit chain (9 commits): plan-drafting probe (`7b21ee2`);
  charter (`9f5c80f`); plan-drafting landing audit (`185401b`); plan-
  drafting SHA back-fill (`75fb99a`); Stage 0 tolerance-budget
  carryover (`81b1475`); Stage 0 checkpoint (`0eed3d7`); Stage 0 SHA
  back-fill (`ae3b834`); Stage 1 sub-bundle feat (`c2900c3`); Stage 1
  checkpoint (`fece9a8`); Stage 1 SHA back-fill (`9502824`); Stage 2
  landing audit + back-fill (final SHAs).

#### Verified

| Deliverable | Status | Notes |
|---|---|---|
| Workspace registration | GREEN | `common/common-py` in `[tool.uv.workspace].members` at commit `c2900c3` |
| Taichi declared as workspace dep | GREEN | `taichi>=1.7,<2.0` at `common/common-py/pyproject.toml` |
| `docs/common/taichi.md` | GREEN | 361 lines; sister to `docs/common/numba.md`; ≥3 anchors at § 2.1 |
| `set_taichi_deterministic` arch param + API fix | GREEN | 12 unit tests; 4 backends + ValueError + backward-compat + monkeypatch |
| Hello-physics smoke + capture | GREEN | 47 KB `.h5`; sha256 `347d6568…05cfd` |
| `taichi_harness` regression | GREEN | 5 tests; locally validated; CI-skip on missing-Taichi |
| Integrity gates GREEN | GREEN | bit-identical to MPM § 7.2 baseline `810cd6e3…23411f98` (third byte-identical sweep in a row) |
| Cross-package regression sweep | GREEN | 325 GREEN (+30 vs 295 baseline); zero Phase-1 sim regressions |
| Equivalence-harness compatibility | GREEN | hello-taichi vs advection_1d diff emitted cleanly (within_tolerance=False expected; different sims) — W-Gate 5 analogue |
| `docs/dependencies.md` entry | GREEN | Taichi pin + common-py workspace member |
| CHANGELOG entry | GREEN | this entry |

### sub-phase-capture-determinism-contract

**SECOND spec-Phase-2 sub-phase**; portfolio-wide contract-redesign mirroring
`sub-phase-conventions-refactor-post-phase-1` consolidation shape per
`docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-2026-05-23T15-37-24Z.md`.
SUPERSEDES Taichi-integration § 10 next-sub-phase recommendation (RD-2D →
Stack-D port) because the determinism contract is structurally upstream of
any further Stack-D port. Surfaced via CI fan-out from Taichi-integration's
push to main: `common/common-ts/examples/hello-physics/hello-physics.test.ts`
asserted raw HDF5 byte-equality across two runs, which is unstable across
Unix-second boundaries because h5wasm 0.10.1's bundled HDF5 library embeds
wall-clock-influenced `H5O_MTIME_NEW` timestamps in every object header (the
`H5Pset_obj_track_times` symbol is absent from h5wasm 0.10.1's WASM blob
entirely — Stage 0 Task 0.3(c) empirical refutation of the probe's lean
Module-direct fix path).

D2 operator-routed wording at STEP 8 HALT-AND-SURFACE incorporates D2-c
(project-onto-Capture) + explicit R-D3 cross-reference to spec § 2.6 + tool-
agnostic exclusion language; landed verbatim at `docs/architecture.md` § 2.5.
D2-sub: `payload.checksum` retained as raw-file sha256 + description note
that it is informational and the contract lives at the harness.

#### Added

- **Spec § 2.5 amendment** (`docs/architecture.md`; primary contract wording
  site). Replaces the pre-amendment "bit-identical output" framing with the
  content-equivalent contract over the parsed Capture data model:
  *"A simulation is deterministic if every state array and diagnostic entry
  in its canonical Capture is exactly element-wise equal across two runs at
  the same seed on the same hardware. This is the zero-tolerance special
  case of the cross-stack content-equivalence posture in §2.6, computed over
  the same Capture projection. Storage-format metadata (wall-clock timestamps
  embedded by the underlying file format, library version banners, and other
  environment-influenced packaging artifacts) is excluded from the
  comparison."* Cross-references to the new harness API (Python + TS) added
  alongside.
- **Spec § 2.7 + `tools/testkit/schemas/capture-v1.json` description-only
  amendment** clarifying `payload.checksum` is informational; the contract
  lives at the harness; field-shape unchanged (no schema_version bump; no
  WU-A coordination cost).
- **Canonical Python determinism harness** at
  `tools/testkit/determinism/harness.py` — `DeterminismVerdict.bit_exact`
  renamed to `content_equivalent` with backward-compatibility property shim
  emitting `DeprecationWarning` (preserve callers' surface for one
  deprecation window). Module docstring + `policy.md` updated to reflect
  the content-equivalent contract. 12 portfolio call sites migrated inline
  to `verdict.content_equivalent` (8 Phase-1 sims + RD-2D Phase-0 +
  diagnostics tier1 + harness's own tests).
- **TypeScript determinism harness (NEW)** at
  `common/common-ts/src/determinism/`:
  - `captureReader.ts` — parses h5wasm `/steps/{N}/state/{field}` +
    `/steps/{N}/diagnostics/{check}` into a typed `Capture` record;
    reuses existing `H5FileLike` shim types.
  - `diffCaptures.ts` — element-wise Float64Array equality + max-abs/rel
    error reporting + sorted-step + sorted-field traversal for stable
    first-mismatch reporting.
  - `runTwiceAndDiff.ts` — orchestrator matching the Python harness
    semantically; returns `DeterminismVerdict { contentEquivalent, detail }`.
  - `index.ts` — re-exports (non-empty per § B.6 N6 banked precedent).
  - `__tests__/harness.test.ts` — 5 tests verifying contract semantics on
    synthetic deterministic + nondeterministic stub runners.
- **Python `CaptureWriter` source-level fix** at
  `tools/testkit/capture/writer.py`: `libver="earliest"` +
  `track_order=False` on every `create_group` + `track_times=False` on
  every `create_dataset`. Defense-in-depth — non-load-bearing per the
  harness-based contract but eliminates the latent flake at the source for
  any downstream consumer that does compare bytes. New
  `test_writer_determinism.py::test_write_capture_byte_identical_across_seconds`
  verifies byte-identical `.h5` output across 1.5 s wall-clock separation.
- **TypeScript `CaptureWriter` source-level fix per N1 path (a)** at
  `common/common-ts/src/capture.ts`: freezes `globalThis.Date.now` for the
  duration of the h5wasm write window in a `try/finally` (saves real
  `Date.now`, replaces with `() => 0`, restores in `finally`). Stage 0 Task
  0.3(c) empirically refuted the probe's lean Module-direct path; this is
  the only viable userland shim per the h5wasm-node 0.10.1 surface. New
  `capture-writer-determinism.test.ts` (3 tests: byte-identical across 1.5 s
  + no-leaked-monkey-patch + restore-on-throw).
- **Per-test refactor V1 (hello-physics)** at
  `common/common-ts/examples/hello-physics/hello-physics.test.ts`:
  `payloadA.equals(payloadB)` replaced by `runTwiceAndDiff` against a
  `SimRunner` wrapping `runHelloPhysics`; assertion is
  `verdict.contentEquivalent === true`. Adds R-D2 spot-check (broken-
  determinism runner with varying step count → `contentEquivalent === false`).
- **Per-test refactor V2 (LBM)** at
  `packages/lattice-boltzmann-d3q19/tests/test_determinism.py`: removed
  `_sha256_of_file` helper; uses `run_twice_and_diff(sim_runner_diagnostic,
  ...)` + asserts `verdict.content_equivalent`. Module-level + per-test
  docstrings updated ("byte-identical HDF5 payloads" → "content-equivalent
  Capture projections" per Stage 0 SHIFTED N2). Adds R-D2 spot-check via
  synthetic-capture `drifting_runner` (per Stage 1 SHIFTED N1).
- **Per-test refactor V3 (MPM)** at
  `packages/mpm-multimaterial/tests/test_determinism.py`: same pattern as V2.
  Per-test docstring updated. R-D2 spot-check matches V2.
- **Conventions doc additive amendment** at
  `docs/conventions/sub-phase-conventions.md`:
  - § F.3 row "Bit-identical run-to-run" reworded to "Content-equivalent
    run-to-run"; new "Content-equivalent NOT raw-file-byte-equality" prose
    paragraph cross-referencing spec § 2.5 + the new harness API.
  - § A.2 gate-11 mechanism cross-reference (new paragraph after the three-
    stage cadence table).
  - New § B.7 "Cross-package regression sweep — Python + TypeScript
    fan-out" sub-section codifying the dual-language sweep template
    established at this sub-phase.
  - sha256 SHIFTED additively: pre-Stage-1 `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734`
    (829 lines) → post-Stage-1 `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e`
    (854 lines; +25 additive). This is the first conventions-doc sha256 SHIFT
    since the conventions-refactor-post-phase-1 sub-phase locked the baseline;
    the new sha256 is the canonical reference for subsequent sub-phases.
- **CI gate redesign per D4 strict-fanout**:
  - `.github/workflows/ts-strict.yml`: new explicit "Determinism gate
    (content-equivalent contract)" step running `pnpm vitest run` on the
    new `src/determinism/` + the refactored `examples/hello-physics/`.
  - `.github/workflows/python-strict.yml`: extends ruff + mypy + pytest to
    cover `determinism/` alongside `capture/`; new explicit "Determinism
    gate" step.
  - `.github/workflows/determinism.yml`: new "Determinism gate per-sim
    fan-out" step iterating over all 10 sims (per-package per § M.4 N1
    `tests.conftest` import-path-collision avoidance).
- **IC-13 (content-equivalence contract semantics)** + **IC-14 (determinism-
  harness API, Python + TypeScript)** — first post-Taichi-integration ICs;
  numbered IC-11/12 → IC-13/14 per established convention.
- This audit chain (12 commits):
  - Plan-drafting: probe (`44941c2`); charter (`8fe770c`); plan-drafting
    landing (`5cf1903`); SHA back-fill (`97ff87b`).
  - Stage 0: tolerance-budget carryover (`4fa9a07`); checkpoint (`ffc7c24`);
    SHA back-fill (`9bc409e`).
  - Stage 1: monolithic feat (`26e1343`); checkpoint (`0a99f4e`); SHA
    back-fill (`1963e5d`).
  - Stage 2: landing audit + back-fill (final SHAs).

#### Verified

| Deliverable | Status | Notes |
|---|---|---|
| Spec § 2.5 amendment | GREEN | docs/architecture.md sha256 `42f5d599…0a347b` |
| Spec § 2.7 + capture-v1.json description edits | GREEN | capture-v1.json sha256 `7715a50a…943735` |
| Python harness rename + deprecation shim | GREEN | 12 portfolio call sites migrated; 3 harness tests pass under `-W error` |
| TypeScript harness (NEW; 4 source + 1 test file) | GREEN | 5 harness tests pass |
| Python CaptureWriter source-level fix | GREEN | new test verifies byte-identical across 1.5 s |
| TypeScript CaptureWriter source-level fix per N1 path (a) | GREEN | 3 new tests pass (incl. no-leaked-monkey-patch + restore-on-throw) |
| V1/V2/V3 refactors + R-D2 spot-checks | GREEN | 3 sites; all R-D2 spot-checks PASS (each refactored test FAILS as expected on broken-determinism mock) |
| Conventions doc § F.3 + § A.2 + § B.7 amendment | GREEN | sha256 `3698d19b…2bd734` → `167fe349…58c2e` (+25 lines additive) |
| CI gate redesign per D4 strict-fanout | GREEN | 3 workflows extended |
| Integrity gates GREEN | GREEN | bit-identical to MPM § 7.2 baseline `810cd6e3…23411f98` (**FOURTH byte-identical integrity sweep in a row**) |
| Cross-package regression sweep | GREEN | Python 342 PASSED (+17 net vs Taichi-integration's 325; +1 sim RD-2D counted + 2 R-D2 spot-checks + 1 writer-determinism test); TS 20 passed + 2 skipped (interactive surfaces); ZERO REGRESSIONS |
| docs/dependencies.md entry | GREEN | new Python + TS determinism-harness module surfaces |
| CHANGELOG entry | GREEN | this entry |

### sub-phase-reaction-diffusion-2d-stack-d

**FIRST per-sim cross-stack port sub-phase under spec-Phase-2.** Ports
`reaction-diffusion-2d` from the Phase-0-Block-8-frozen Stack-B
(TypeScript / WGSL / WebGPU) reference to a content-equivalent Stack-D
(Python / Taichi-DSL / CPU) implementation through gates 4–14. No
`-phase-N` tag pushed (spec § 7.12); optional non-phase point-release
`v0.1.11` is a banked operator decision per
`docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md` § 11.4.

#### Added

- Stack-D Taichi-DSL Gray-Scott implementation at
  `packages/reaction-diffusion-2d-stack-d/` (sibling workspace member; D6).
  Determinism posture `bit-exact-same-hw` at `arch="cpu"` (IC-13
  content-equivalent); `ti.ndrange(n, n)` row-major + `cpu_max_num_threads=1`;
  NumPy-seeded IC matching Stack-B.
- Stack-D spec sheet `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md`
  + pre-implementation probe report.
- Canonical Stack-D capture at the HEAD-frozen descriptor
  `gray-scott-lambda-128sq-seed42-step2000` (`.h5` content OID
  `2e93a751…1041b13d`; `.json` `e1752ceb…27e104`).
- **Cross-stack equivalence (gate 14, Phase-2-specific):**
  `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` — the
  first cross-stack-pair methodology template (IC-15 candidate).
  `compare_captures(Stack-B, Stack-D)` returns `within_tolerance=True` at
  `relative=1e-4`; peak `max_abs_err=1.9e-14` (step 1600 U), margin ~10
  orders of magnitude; R-P2 chaotic-regime divergence empirically falsified
  for this pair at the full step-2000 horizon.
- At-budget per-sim `[overrides.reaction-diffusion-2d] category =
  "reaction-diffusion"` in `tools/testkit/equivalence/tolerance.toml`
  (resolution wiring mapping physics-family `sim.category` to
  numerical-method tolerance-category; NOT a tolerance widening).
- Schema-corpus entry
  `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}`
  (Phase 4 WU-A consumer).
- `docs/perf-ledger.md` row: `taichi-cpu` 0.568 s (0.61× Stack-B
  numpy-reference 0.931 s baseline; well below the 2× regression band).

#### Verification

| Gate | Status | Note |
|---|---|---|
| 4–13 (stack-agnostic) | GREEN | gates landed at Stage 1b (MMS OOA 1.9972; IC-13 content-equivalent; 3 PBT invariants; gate-13 structural replay) |
| 14 (cross-stack equivalence) | GREEN | `within_tolerance=True` at `relative=1e-4`; per-field witness in `equivalence.md` |
| Portfolio sweep | GREEN | Python 360 passed (+18 net vs 342; Stack-D +16 + testkit +2); TS 20 passed + 2 skipped; ZERO REGRESSIONS |
| Integrity sweep | GREEN | bit-identical to `810cd6e3…23411f98` (**FIFTH byte-identical integrity sweep in a row**, despite a new sim package + spec sheet + probe + capture + perf row + Cat-X additive override) |
| Mutation (B17) | PATH-B re-bank | framework-validated artifact; per-sim Taichi-DSL mutmut target deferred (cross-stack port) |

### sub-phase-audit-chain-correctness

Focused-infrastructure sub-phase resolving the two banked-for-operator
audit-chain hash-correctness items surfaced at the RD-2D Stack-D landing
(§ 8 N5a / N5b). Mirrors the `sub-phase-taichi-integration` (focused-infra)
+ `sub-phase-capture-determinism-contract` (portfolio-wide amendment) shapes.
No `-phase-N` tag (spec § 7.12); optional non-phase point-release `v0.1.12`
is a banked operator decision.

#### Added / Changed

- **`verify_evidence` LFS-content-OID fix (Stage 1a).** New
  `lfs_pointer_oid()` helper in `tools/integrity/integrity/common/repo.py`
  (pointer-stub sniff + `oid sha256:` parse) and an OID-aware comparison
  branch in `tools/integrity/integrity/scripts/verify_evidence.py`:
  LFS-tracked artifacts (`captures/**/*.h5`) now verify against the content
  OID embedded in the git-lfs pointer stub — offline, no `git lfs smudge` /
  network / auth. Non-LFS artifacts hash the git blob unchanged;
  mismatch→error preserved (R-A4). `--strict` untouched.
- **IC-16 formalized (Stage 1a).** `verify_evidence` LFS-content-OID
  verification semantics; cited at spec § 7.5 + Appendix G.7 (Stage 1b,
  D3-positive) and recorded in `docs/dependencies.md`.
- **§ B.6 amended in two steps.** Mode 2 (LFS pointer-vs-content) **RESOLVED**
  at Stage 1a — subsequent landings need no Option-3 annotation. Mode 3
  (phantom-sha / pre-commit-hook trailing-newline) **ADDED** at Stage 1b,
  covering 2 retroactively-classified portfolio-wide drifts.
- **Portfolio-wide phantom-sha audit (Stage 1b).** New report at
  `docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-2026-05-23T22-39-45Z.md`
  (HEAD sha256 `9a1167dc…a40d085b` post-back-fill). 14-capture survey: 5 MATCH /
  7 NO-RECORD / 2 PHANTOM-DRIFT (rd-2d-stack-d, rd-3d-ref) — both trailing-newline
  phantoms, both pre-caught at landings, both in sealed checkpoints only.
  rd-3d-ref re-classified § B.6 Mode 1 → Mode 3. Non-corrective of prior audits
  (Convention A + § 12 + D5).
- **Spec amendments (Stage 1b, D3-positive, additive).** `docs/architecture.md`
  § 7.5 + Appendix G.7 gain an LFS-content-OID clarification (IC-16). Existing
  wording unchanged.
- **Test surface.** `tools/integrity/tests/test_verify_evidence.py` +5 tests
  (LFS pointer OID resolution; wrong-OID negative path; non-LFS regression);
  10/10 GREEN; portfolio Python sweep 365 PASS (= 360 + 5; zero regressions).

#### Banked methodology-precedents

- **Commit-first-then-sha256.** Record the sha256 of the committed blob, never
  in-memory pre-hook content (the pre-commit `end-of-file-fixer` appends a
  trailing newline → phantom shas). Exemplified across this sub-phase's audit
  chain. The hook is not modified (out of scope); the discipline is the
  working mitigation.
- **SHA back-fill must enumerate EVERY placeholder-bearing audit committed in a
  stage**, not just the checkpoint (Stage 1b N1; the now-fixed `verify_evidence`
  is the mechanical self-check that catches placeholder leakage).

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

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### sub-phase-phase-3-rigid-body (Phase 3, task-4 — FIRST Stack-E SIM in Phase 3)

Reference articulated rigid-body pendulum on Stack E (Python / NVIDIA Warp).
Featherstone Articulated-Body Algorithm (ABA, reduced/generalized-coordinate
forward dynamics; Ch. 7 §7.2–§7.3) for a planar revolute serial chain, in a
single-thread f64 `@wp.kernel`; semi-implicit (symplectic) Euler default + RK4
option; CLI tiers `single-joint` / `double-pendulum` / `6-dof` / `N-link`.

- `packages/articulated-pedagogical/` — 26th workspace member. `articulated_pedagogical/`
  (`model`, `aba` Warp kernel, `integrators`, `analytic` scipy elliptic anchors,
  `dynamics`, `sim`, CLI). 18-test acceptance suite (single-pendulum A1/A2/A3
  anchors + ABA EOM; double-pendulum vs closed-form RK4 reference; 6-DOF energy
  conservation; D-DET bit-exact; energy_drift_bounded + angular_momentum-about-
  pivot PBT; capture round-trip; golden-table + Tier-1 health).
- `docs/sim-specs/rigid-body/articulated-pedagogical/{spec-ref,algebraic}.md`.
- `tools/testkit/golden/tables/rigid-body-{pendulum,double-pendulum,6dof}-trajectory.json`
  + `tools/testkit/golden/derivations/rigid-body-{pendulum,rk4-reference}.md`.
- `tools/diagnostics/tier3/rigid_body_pedagogical/` (energy-conservation + period-recovery);
  `tools/testkit/property/sims/rigid_body_pedagogical/` (PBT invariant module).
- `tools/testkit/determinism/registry.toml` — `[rigid-body.articulated-pedagogical]`
  (Stack E, bit-exact, same-stack-same-hw; MEASURED).
- `tools/testkit/equivalence/tolerance.toml` — `[golden_tolerance.rigid-body.articulated-pedagogical]`
  (`pendulum_period_rel`, `trajectory_abs`, `energy_drift_rel_per_second`); no cross-stack cap.
- `.github/workflows/python-strict.yml` — `test-rigid-body-pedagogical` job.
- `.pre-commit-config.yaml` — failing-tests-evidence excluded from trailing-whitespace.
- `docs/spec-amendments-proposed.md` — A-1: §5.8 maximal→ABA corrigendum (operator-applied).

### sub-phase-phase-3-ising-classical (Phase 3, task-3a — FIRST Stack-B SIM in Phase 3)

Phase-3 task-3a (2D Ising-classical) reference implementation. Fourth
Phase-3 sub-phase; FIRST Stack-B SIM (after common-3dgs `v0.2.2`,
render-similarity `v0.2.3`, lenia `v0.2.4`). Metropolis-Hastings Monte
Carlo with checkerboard (red/black) sublattice update; §6.3a
deliverables per `docs/phases/phase-3-plan.md:1388-1543`. NO tag at
landing (D-TAG NO; per-sub-phase tagging discontinued, phase-close-only
cadence going forward — charter-v2).

#### Added

- `packages/ising-classical/` — 25th workspace member. `ising_classical/`
  Python package: `reference/ising_numpy.py` (Metropolis checkerboard
  sweep + Onsager `T_c = 2/ln(1+√2)` + Yang `m(T)` closed forms),
  `sim.py` (`sim_runner_seeded` + `sim_runner_pbt` testkit adapters),
  `__main__.py` (CLI). `src/metropolis.wgsl` + `src/index.ts` — Stack-B
  WGSL parallel-Metropolis (PCG per-cell PRNG, checkerboard, no atomics /
  subgroup ops; local-only per spec §7.8). pytest-against-captures test
  suite (6 modules) mirroring RD-2D.
- `captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.{h5,json}`
  — committed canonical capture (NumPy reference oracle; LFS + R2).
- `docs/sim-specs/lattice-spin/ising-classical/spec-ref.md` — 13-section
  spec sheet (first `lattice-spin` spec).
- `tools/testkit/golden/tables/ising-classical-{critical-temperature,magnetization}.json`
  + `tools/testkit/golden/derivations/ising-onsager.md` — 3 independent
  anchors per table (Onsager / Kramers-Wannier / Landau-Binder;
  Yang / Baxter / Newman-Barkema).
- `tools/diagnostics/tier3/ising_classical/` — Tier-3 magnetization +
  energy-bound + autocorrelation diagnostics (2nd `tier3/` subtree).
- `tools/testkit/property/sims/ising_classical/` — PBT invariants
  (`magnetization_bounded` + `energy_per_spin_bounded`).
- `tools/testkit/determinism/registry.toml` — `[lattice-spin.ising-classical]`
  (first `lattice-spin.*` row; bit-exact same-stack-same-hw, MEASURED).
- `tools/testkit/equivalence/tolerance.toml` —
  `[golden_tolerance.lattice-spin.ising-classical]` (`critical_temp_rel`
  + `magnetization_rel`; D-TOL-SCHEMA resolved-on-evidence to the
  `golden_tolerance` branch — `[overrides.<sim>]` rejects the named keys).
- `.github/workflows/python-strict.yml` — `test-ising-classical` job
  (mirror `test-lenia`; selective LFS pull of the canonical capture).
- `docs/perf-ledger.md` row; `docs/glossary.md` entries (Ising model,
  Metropolis-Hastings, detailed balance, critical temperature, Onsager
  solution, Kramers-Wannier duality, parallel-Metropolis checkerboard);
  `justfile` recipes (`run-ising-classical`, `test-ising-classical`).

### sub-phase-phase-3-lenia (Phase 3, task-3 — FIRST SIM in Phase 3)

Phase-3 task-3 (Lenia) reference implementation. FIRST SIM-task
sub-phase in Phase 3 after the two infrastructure roots common-3dgs
(`v0.2.2`) + render-similarity (`v0.2.3`). Stack D (Taichi); §6.3
deliverables A–O per `docs/phases/phase-3-plan.md:1282-1373`. Closes
with operator-pushed annotated tag `v0.2.4-sub-phase-phase-3-lenia`
(D-TAG ratified YES — Chakazul external vendoring + durable sim
architecture both §D.2 conditions strongly met).

#### Added

- `packages/lenia/` — Stack-D Taichi reference Lenia (24th workspace
  member). `lenia/` Python package: `kernel.py` (Quad4 shape function
  `K(r) = (4·r·(1-r))^4`), `growth.py` (Quad4 polynomial growth gn=1),
  `sim.py` (`LeniaConfig` + `LeniaSim` with `step` + `field` +
  `capture`), `_taichi_kernels.py` (module-level `@ti.kernel`s per
  IC-12), `__main__.py` (argparse CLI per § 3.2.6). Orbium unicaudatus
  preset (R=13, T=10, mu=0.15, sigma=0.015) grep-cited from
  `references/Chakazul-Lenia/Python/animals.json:5`.
- `references/Chakazul-Lenia/` — Chakazul/Lenia upstream at SHA
  `adfc542939266de7f4bb7ebb552e8499701ee107` (MIT). Vendored:
  `LICENSE.md`, `UPSTREAM_README.md`, `Python/LeniaF.py`,
  `Python/LeniaND.py`, `Python/animals.json`. `MANIFEST.toml` with
  per-file citations (Convention #8 grep-cite anchors).
- `docs/sim-specs/continuous-ca/lenia/spec-ref.md` — 13-section spec
  per `docs/architecture.md` § 8.2. Stage-1b SHIFTED-on-evidence: the
  Stage-1a charter-suggested `mass_approximately_conserved` PBT
  invariant is mathematically falsified for arbitrary IC under Quad4
  polynomial growth gn=1; re-declared (NOT widened, per HARD RULE 2 +
  charter §6 anti-pattern reminder) to `monotone_bounds` +
  `per_step_change_bounded_by_dt`.
- `tools/testkit/golden/tables/lenia-kernel.json` — Quad4 anchors at
  r=0 (K=0), r=0.5 (K=1, PEAK), r=1 (K=0), plus 6 mid-curve
  cross-check anchors. Tolerances `golden_kernel_abs=1e-6` /
  `golden_kernel_rel=1e-5`. **§0.3 SHIFT-on-evidence**: §6.3 plan-prose
  at `docs/phases/phase-3-plan.md:1351` says "r=0 (peak K(0))" — Quad4
  evaluates K(0)=0, NOT a peak; the peak is at r=0.5. NO plan edit
  (Convention M).
- `tools/testkit/golden/tables/lenia-orbium-trajectory.json` — field
  aggregate anchors at step 0 / step 1 / step 5 (sum, max).
- `tools/testkit/golden/derivations/lenia-kernel.md` — hand-derivation
  of Quad4 + grep-cite map to vendored Chakazul source.
- `tools/diagnostics/tier3/` — **FIRST ever `tools/diagnostics/tier3/`
  subtree** (per probe § 3.2 + charter §1.1 first-SIM friction). Lenia
  Tier-3 module at `tools/diagnostics/tier3/lenia/` with
  `KernelShapeReport`/`check_kernel_shape` +
  `GrowthBoundReport`/`check_growth_bound`.
- `tools/testkit/property/sims/lenia/` — shared PBT-invariant module
  (`monotone_bounds_invariant` + `per_step_change_bounded_by_dt_invariant`)
  per §6.0 item 7. **FIRST per-sim PBT module in Phase 3** under the
  `sims/` subtree.
- `tools/testkit/equivalence/tolerance.toml` — `[continuous-ca.lenia]`
  golden tolerances (golden_kernel_abs/rel + golden_trajectory_abs).
- `tools/testkit/determinism/registry.toml` — `[continuous-ca.lenia]`
  Stack-D bit-exact-same-stack-same-hw row, MEASURED at Stage 1b.
- `tests/fixtures/legacy-captures/phase-3-lenia.h5` + sidecar `.json`
  — schema-corpus seed per §6.0 item 10 (Phase-4 WU-A schema-bump
  round-trip target). LFS-tracked.
- `docs/perf-ledger.md` — `lenia | python (Taichi) |
  orbium-unicaudatus-64sq-seed42-step100 | 0.797s` baseline row.
- `tools/testkit/probes/reports/lenia.md` — cat1-resident probe per
  `tools/testkit/probes/template.md`.
- `tools/testkit/failing-tests-evidence/lenia-2026-05-28T15-24-41Z.txt`
  — Stage-1a RED witness (`sha256:5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0`,
  byte-reproducible).
- `docs/glossary.md` entries: Lenia, kernel-convolution CA, Quad4,
  growth function (Lenia).
- `justfile` recipes: `run-lenia`, `test-lenia`.

#### First-SIM friction notes (R-11 portfolio-scale signals)

- **FRICTION #1.** `tools/testkit/equivalence/tolerance-budget.toml`
  carries only `cross_stack` budgets at HEAD; no `[budgets.<category>.golden]`
  cap shape exists. Lenia's `[continuous-ca.lenia] golden_*` rows
  land un-capped-by-design. STOP-CAT-X NOT fired (no cap to exceed).
  Every later Phase-3 SIM will encounter the same surface at its
  first golden-table land.
- **FRICTION #2.** Plan §6.3 prescribes `continuous-ca/lenia/python/`
  at repo root; on-disk convention at HEAD is `packages/<name>/` (per
  9 prior sim packages). Stage 1a ratified `packages/lenia/` per §0.3
  existing-convention precedence (SHIFTED-surface-only, NO plan edit).
- **FRICTION #3.** Stage-1a's `test_sim_shells.py` `pytest.raises(
  NotImplementedError)` assertions needed a Stage-1b rewrite to assert
  production behavior; an inverse-mirror of render-similarity's
  `test_ms_ssim_raises_not_implemented` Phase-4-WU-C shell-stays-raise
  posture.

#### Notes

- **Tag pushing.** `v0.2.4-sub-phase-phase-3-lenia` is pushed by the
  operator after independent landing-audit review per spec § 7.12 R9
  amendment + Convention D.2. I7 allowlist extension added at Stage 2.
- **D-DET.** Bit-exact same-stack-same-hw MEASURED + HELD at Stage 1b
  (two runs at the same seed produce `np.array_equal` field outputs).
- **D-FFT.** Real-space Quad4 convolution lands. Stage 1b probe did
  NOT exercise the Taichi FFT path (D-FFT real-space-default per
  charter §7.2; the Taichi 1.7+ FFT module is not enumerated in
  `docs/architecture.md:962` Stack-D determinism notes). Future
  optimization opportunity at Phase 4+.

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

### sub-phase-sph-water-stack-d

**SECOND per-sim cross-stack port sub-phase under spec-Phase-2** (after
`reaction-diffusion-2d-stack-d`); the SECOND empirical validation of the IC-15
cross-stack-equivalence methodology and the FIRST production consumer of IC-16
(`verify_evidence` LFS-content-OID resolution). All 14 gates GREEN. No `-phase-N`
tag (spec § 7.12); optional non-phase point-release banked per
`docs/phases/sub-phase-sph-water-stack-d.md` § 11.4.

#### Added

- **Stack-D Taichi-DSL DFSPH port** at `packages/sph-water-stack-d/` (Stage 1b;
  workspace member 16): `reference/dfsph_taichi.py` (pure-Python golden surface +
  inlined 27-cell spatial-hash Taichi kernels; cell = 2h cutoff), `sim.py`
  (determinism-strategy docstring + `sim_runner_seeded` / `sim_runner_diagnostic`
  / `compute_diagnostic_trajectory` / `neighbor_lists_at`), `invariants.py`
  (`density_nonneg`, `kernel_normalization_unit_volume`). Gates 4–13 GREEN
  (gate-4 golden-table, NOT MMS; err 0.0 at abs<1e-12 / abs<1e-15).
- **Canonical Stack-D capture** `captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.{h5,json}`
  (252.346 s = 0.195× the numpy-reference baseline; perf-ledger row at Stage 1b).
- **Cross-stack equivalence (gate 14) GREEN** at Stage 1c: `within_tolerance=True`
  at `relative=1e-4` over the full canonical step-1000 horizon — position+velocity
  bit-identical across all 11 frames; density `max_rel_err=1.585292e-15`
  (~11 orders of margin).
- **`[overrides.sph-water] category="sph"`** in `tools/testkit/equivalence/tolerance.toml`
  (Stage 1c; at-budget per `[defaults.sph]`; the SECOND per-sim override).
- **`equivalence.md` extended additively** (Stage 1c; +7 IC-15 methodology
  sections + S6 banked methodology-precedent).
- **Schema-corpus entry** `tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.{h5,json}`
  (Stage 1c; payload.path rewritten; corpus round-trip GREEN).
- **IC-15 PARTIAL FORMALIZATION** (Stage 2; D5 routing = option (c)):
  `docs/conventions/cross-stack-equivalence-methodology.md` codifies the
  components validated across both cross-stack pairs — per-cell/per-particle
  position-exact comparison; category-default tolerance; per-sim `tolerance.toml`
  override pattern (two-taxonomy mapping); per-frame diff witness format; per-sim
  `equivalence.md` authoring pattern. **Explicitly defers** (NOT codified):
  R-P2 chaotic-regime escape-hatch details; D8 comparison-projection axis;
  atomic-scatter handling; lattice-velocity quantization; iterative-solver
  amplification — none stress-tested across the two algebraically-identical-
  trajectory pairs. Third cross-stack pair lands the full stress test.

#### Notes

- **S6 banked methodology-precedent:** plan-drafting probes for cross-stack ports
  MUST read the Phase-1 `sim.py` implementation at HEAD (not just the spec sheet).
  The Phase-1 sph-water reference trajectory is explicit-Euler rigid free-fall +
  a discarded per-step SPH-density side-effect — NOT an iterative DFSPH pressure
  solve; this dissolved R-S1/R-S2/R-S3/R-P2 for the cross-stack pair.
- **Forward-routable observation:** an LFS rule for `tests/fixtures/legacy-captures/`
  as legacy-fixture sizes grow — the sph-water schema-corpus `.h5` is the first
  >3 MB non-LFS legacy entry (61 MB; under the 2 GB hook ceiling). Banked for a
  downstream focused-infrastructure sub-phase.
- IC-16 first production consumer ran clean across this sub-phase's gate-5
  evidence verification (LFS `.h5` OIDs resolved automatically; no §B.6 annotation).
- `sim_runner_diagnostic` seed-propagating pattern established as the canonical
  reference for the banked LBM/MPM `sim_runner_diagnostic` remediation (D7).

### sub-phase-lattice-boltzmann-d3q19-stack-d

THIRD per-sim cross-stack port under spec-Phase-2 (after `reaction-diffusion-2d`
+ `sph-water`). Stack-D Taichi-DSL CPU port of the Phase-1 D3Q19 BGK reference;
all 14 gates GREEN (gate-14 ×2 for the dual-canonical-capture). FIRST cross-stack
port with dual-arm gate-4, two seeded runners, two canonical captures, two
perf-ledger rows, two independent gate-14 verdicts, and the tighter `1e-5`
cross-stack tolerance. No `-phase-N` tag (spec § 7.12).

#### Added

- `packages/lattice-boltzmann-d3q19-stack-d/` — Stack-D Taichi-DSL D3Q19 BGK port
  (Qian-1992 equilibrium + Guo-2002 forcing). `reference` (Taichi `feq`/`feq_field`/
  `bgk_step`/`stream`/f64-seeded moment reductions + NumPy bounce-back), `sim`
  (`sim_runner_seeded` Poiseuille + `sim_runner_seeded_couette` Couette +
  `sim_runner_diagnostic`), `invariants` (2 PBT). Gates 4–13 GREEN at Stage 1b.
- DUAL cross-stack equivalence at gate 14 (Stage 1c): both `within_tolerance=True`
  at `relative=1e-5` with ~10 orders of margin — Poiseuille (1001 frames) rho/u
  max_abs `5.77e-15`/`6.16e-15`; Couette (501 frames) rho/u max_abs `3.33e-15`/
  `1.27e-15`. Step-horizon flat at FP-round-off scale (no amplification).
- `[overrides.lattice-boltzmann-d3q19] category="lbm"` in `tolerance.toml` (Stage 1c;
  THIRD per-sim override; at-budget per `[defaults.lbm]=1e-5`; 10× tighter than the
  prior two ports; NOT a widening).
- `docs/sim-specs/lattice/lattice-boltzmann-d3q19/{spec-ref-stack-d,equivalence}.md`
  (spec sheet Stage 1b; equivalence.md additive amendment Stage 1c).
- Two canonical captures at `captures/lattice-boltzmann-d3q19-stack-d/` + two
  perf-ledger rows (Stage 1b; taichi-cpu 4.954s / 0.973s).
- `f64` accumulator-seed pattern empirically validated (Stage 0 banked, Stage 1b
  applied to in-kernel 19-term collision-moment reductions: bare `0.0`→f32 leaked
  `3.4e-6`; `ti.f64(0.0)` seed → `7e-15`). First port with genuine in-kernel f64
  reductions (D9 cross-stack-non-trivial surface).

#### Notes

- **D5 = option (b) PARTIAL HOLDS + REFINEMENT:** `docs/conventions/cross-stack-
  equivalence-methodology.md` AMENDED ADDITIVELY (Stage 2) with five subsections —
  collision-step FP-accumulation handling; dual-arm gate-4 verification surface;
  `1e-5` vs `1e-4` tolerance routing; dual-canonical-capture + two-seeded-runner
  pattern; near-zero-field-value relative-error harness-artifact. **NOT promoted
  partial → full**; full IC-15 formalization remains DEFERRED to a pair that
  exercises the un-stress-tested aspects (#1 R-P2 chaotic / #3 atomic-scatter /
  #5 iterative-solver amplification). Methodology now validates across three
  physics families, all at the algebraically-identical-trajectory FP-round-off-scale
  regime.
- **N1 schema-corpus deferral RESOLVED (Stage 2):** added a `.gitattributes` LFS
  rule for `tests/fixtures/legacy-captures/**/*.h5`; both LBM schema-corpus entries
  added through LFS (Poiseuille ~202 MB exceeds GitHub's 100 MB hard push limit —
  the prior non-LFS convention could not carry it). This RESOLVES the
  forward-routable LFS-rule-for-legacy-captures observation banked at
  `sub-phase-sph-water-stack-d`. The existing non-LFS sph-water (61 MB) + smaller
  phase-0/2 entries remain as historical committed blobs (not retroactively re-tagged;
  the rule applies going forward).
- **`u` `max_rel_err≈2.0` harness-artifact (informational):** near-zero transverse
  velocity in unidirectional flow; `compare_captures` verdicts on `abs_err > atol +
  rtol·field_scale`, so `within_tolerance=True` is correct (banked in methodology § 4.5).
- **First cross-stack port with Taichi-cpu running SLOWER than the NumPy reference**
  (Poiseuille 1.31×, Couette 1.61× — small-grid per-step kernel-launch overhead;
  both within the 2× regression band). Banked as a workload-dependent perf ratio.

### sub-phase-mpm-multimaterial-stack-d

FOURTH per-sim cross-stack port under spec-Phase-2 (`mpm-multimaterial` →
Stack-D Taichi-DSL CPU). All 14 gates GREEN.

- **Stack-D Taichi-DSL MLS-MPM/APIC port** at `packages/mpm-multimaterial-stack-d/`
  (Stage 1b; gates 4–13 GREEN; new workspace member, 18th). MLS-MPM (Hu 2018) + APIC
  (4/dx² reconstruction) + neo-Hookean single-material (`material_id` all-0;
  "multimaterial" is Phase-1 naming-only). P2G `ti.atomic_add` scatter serialised at
  `cpu_max_num_threads=1` (posture (i)); `ti.f64(0.0)` accumulator seeds throughout.
- **Perf: 360.773 s = 2.28× the NumPy+numba baseline (158.052 s) — FLAGGED per
  spec § 2.15** for landing-audit review. First Stack-D port over the 2× band;
  attributable to posture-(i) serialisation (required for deterministic atomic-scatter
  — Stage-0 Task 0.3 showed threads=8 is NOT run-to-run bit-exact) + ~3000 kernel
  launches over 1M particles. Correctness-over-speed; informational at landing review.
- **Gate-14 cross-stack equivalence GREEN** at `relative=1e-4` (Stage 1c): `within_tolerance=True`;
  `particle_pos` BIT-EXACT every frame; `particle_vel` monotonic APIC residual
  `1.18e-30 → 6.25e-28`; `grid_mom` `1.50e-32`. **~24-order margin — the largest of any
  cross-stack port to date.**
- **N2 finding:** the canonical drop-impact trajectory is rigid free-fall (`j_det=1.0`;
  `F=I` → zero neo-Hookean stress → uniform velocity). The atomic-scatter surface
  (deferred IC-15 aspect #3) is PRESENT in the P2G kernel BUT NOT EXERCISED at the
  canonical scale (order-independent sums); aspect #3 stays substantively un-stress-tested.
- **First cross-stack port with hybrid-particle-grid taxonomy** (`sim.category="hybrid-pg"`
  → tolerance-category `mpm` via `[overrides.mpm-multimaterial]`; FOURTH per-sim override;
  at-budget per `[defaults.mpm]`=1e-4).
- **`docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md`** extended additively at
  Stage 1c (MPM-specific aspects + N2 + S6-pattern context).
- **IC-15 partial-formalization document AMENDED ADDITIVELY at Stage 2** (D5 routing =
  option (b) PARTIAL HOLDS + REFINEMENT; § 5, four subsections): atomic-scatter-present-but-
  not-exercised; hybrid-particle-grid taxonomy; S6 two-instance pattern (methodology
  consideration); legacy-captures schema-corpus entry size bound (~256 MiB) +
  representative-subset artifact class. **NOT promoted partial → full** — the methodology
  now validates across four physics families at the same regime; full formalization stays
  DEFERRED to a pair that exercises #1 (R-P2 chaotic) / #3 (atomic-scatter substantively) /
  #5 (iterative-solver amplification).
- **D10 schema-corpus representative-subset deliverable:** first cross-stack port to
  introduce the representative-subset artifact class. The canonical capture is ~1.05 GiB
  (too large for the corpus); landed a **first-2-frames representative subset** (195 MiB,
  ≤ the ~256 MiB bound) at `tests/fixtures/legacy-captures/phase-2-mpm-multimaterial-stack-d-representative.{h5,json}`
  via the new `tools/testkit/scripts/extract_capture_subset.py` (deterministic data-only
  extraction; no sim re-run). LFS-routed; corpus round-trip verified locally + in CI (S-CI1).
- **S6 pattern is now a TWO-INSTANCE banked observation** (sph-water + MPM): Phase-1
  canonical trajectories may exercise far less than spec-described dynamics; downstream
  cross-stack-pair probes HEAD-verify the canonical trajectory's algebraic surface at
  plan-drafting (S6 banked precedent).
- **LBM/MPM `sim_runner_diagnostic` banked item DECOMPOSED:** MPM-side CLOSED-AS-NOT-A-DEFECT
  (plan-drafting S-M4 — MPM threads its seed correctly; only the descriptor filename was
  cosmetically hardcoded, now interpolated on the clean Stack-D contract); LBM-side stays
  banked (cosmetic per analytic ICs). No Phase-1-sealed edit.

### sub-phase-eulerian-smoke-stack-e

SEVENTH per-sim cross-stack port under spec-Phase-2 (`eulerian-smoke` →
Stack-E NVIDIA-Warp 1.13.0 CPU); the SECOND Stack-E port (after
`mpm-multimaterial-stack-e`) and the SECOND `eulerian-smoke` port (after the
Stack-D Taichi port). Spec § 11.3 item 2.4 (the Stack-E half). All 14 gates
landed; gate-14 is **cross-stack BIT-EXACT**.

- **Stack-E Warp Stam-Fedkiw stable-fluids port** at
  `packages/eulerian-smoke-stack-e/` (Stage 1b; gates 4–13 GREEN; 22nd workspace
  member). Socket-only common-warp consumption (Runtime + Capture + Determinism)
  over its own f64 `wp.array`s — the dense-grid f32 `ScalarField3D` /
  `VectorField3D` surfaces structurally fit but are f64-blocked (D15;
  `docs/common/warp.md` § 6.2). § L.7 O-2 four-checkpoint Warp-CPU determinism
  chain complete.
- **Gate-14 cross-stack BIT-EXACT** (Stage 1c-revisited): `within_tolerance=True`,
  `max_abs_err = 0.0` on BOTH canonicals — the Warp port is **byte-identical** to
  the sealed Phase-1 NumPy reference across the full horizon, INCLUDING through the
  3D Taylor-Green blow-up (reference AND port both reach `|u| ≈ 5.1e19` at step 500,
  bit-for-bit). The FIRST portfolio instance of bit-exactness through a chaotic
  (positive-Lyapunov) horizon; logically a consequence of the step-1 cross-stack
  BIT-EXACT baseline. Tolerance REUSES `[overrides.eulerian-smoke]` (smoke/1e-4; D6,
  no new row).
- **R-P2 is NOT stack-portable — counter-evidence to smoke-Stack-D.** The same
  chaotic canonicals produced Stack-D's `within_tolerance=False` R-P2 chaotic-regime
  verdict but Stack-E's `within_tolerance=True` bit-exact verdict. The plan-drafting
  prediction (R-P2 stack-portable Taichi → Warp) was empirically FALSIFIED at
  Stage 1c (Hard Rule 2 STOP) and the charter §§ 1/3/5 amended mid-sub-phase to the
  cross-stack BIT-EXACT verdict shape (Stage 1c-revisited). Stack-D's divergence was
  a Taichi-FP-specific step-1 round-off; Warp's same-operation-order arithmetic
  yields a `0.0` step-1 difference, so chaos has nothing to amplify.
- **Methodology + conventions refinements (Stage 2):**
  `cross-stack-equivalence-methodology.md` § 6.1 + new § 6.7 (R-P2 requires a
  non-zero cross-stack seed-difference AND a chaotic regime — chaos amplifies, it
  does not manufacture, a seed-difference); `sub-phase-conventions.md` § L.7 O-1
  shape-(a) refinement (the bit-exact condition is a zero seed-difference, not an
  "algebraically-tame trajectory"; D-S2-1) + new § L.8 (O-W7 narrowing, R-SME9
  resolution-dependent false-laminar trap, the charter-amendment-landing precedent,
  the `uv sync` `.venv`-prune hazard).
- **`docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md`** extended
  additively with a Stack-E § E **bit-exactness witness** (Stage 1c-revisited; the
  Stack-D chaotic-regime witness §§ 1–7 unchanged).
- **Schema-corpus representative-subset:** the 2D 4.4 MB capture at
  `tests/fixtures/legacy-captures/phase-2-eulerian-smoke-stack-e.{h5,json}`
  (LFS-routed; corpus round-trip verified). The 3D 738 MB capture is held local
  (D14). No `-phase-N` tag (D12); local-only (D13).
- **D17 banked (operator routing):** the committed 2D lid-driven-cavity reference is
  laminar-bounded (`max|u| ≈ 2.08`), NOT the plan-drafting `~1.64e3` Kelvin-Helmholtz
  blow-up — a candidate Phase-1-canonical re-characterization trigger (empirical
  second instance, after smoke-Stack-D's finding). The 3D blow-up is confirmed. This
  sub-phase surfaces, but does NOT adjudicate, the Phase-1 provenance question.

### sub-phase-lattice-boltzmann-d3q19-stack-e

EIGHTH per-sim cross-stack port under spec-Phase-2 (`lattice-boltzmann-d3q19` →
Stack-E NVIDIA-Warp 1.13.0 CPU); the THIRD Stack-E port (after
`mpm-multimaterial-stack-e` + `eulerian-smoke-stack-e`) and the SECOND
`lattice-boltzmann-d3q19` port (after the Stack-D Taichi port). Spec § 11.3 item 2.5
(the Stack-E half; the Stack-D half landed at `lattice-boltzmann-d3q19-stack-d`).
All 14 gates landed; gate-14 is **cross-stack BIT-EXACT** — the expected,
plan-drafting-MEASURED verdict (no surprise in either direction).

- **Stack-E Warp D3Q19 BGK port** at `packages/lattice-boltzmann-d3q19-stack-e/`
  (Stage 1b; gates 4–13 GREEN incl. the **dual-arm gate-4** — 4a D3Q19 equilibrium
  golden `abs=1e-15` + 4b NS-2D MMS; 23rd workspace member). Socket-only common-warp
  consumption (Runtime + Capture + Determinism) over its own
  `wp.array(dtype=wp.float64, ndim=4)` 19-component distribution — the single-component
  f32 `ScalarField3D` does not structurally fit a 19-component lattice AND f64 blocks
  the f32 surface (D15/D7; `docs/common/warp.md` § 6.3). The THIRD f64 socket-only
  consumer and the FIRST with genuine **in-kernel reductions** (the per-cell 19-term
  BGK moment sums). § L.7 O-2 four-checkpoint Warp-CPU determinism chain complete
  (4/4; every checkpoint a zero-seed-difference / bit-exact result).
- **Gate-14 cross-stack BIT-EXACT** (Stage 1c): `within_tolerance=True`,
  `max_abs_err = 0.0` on BOTH canonicals (Poiseuille 1001 frames + Couette 501 frames)
  at the resolved `lbm`/`1e-5` (the portfolio-tightest category, ~10 orders of margin).
  The **THIRD shape-(a) instance and the FIRST on a LAMINAR trajectory** — together
  with `eulerian-smoke-stack-e` (the second instance, on a CHAOTIC horizon) it
  empirically **completes the D-S2-1 decoupling**: shape (a) is a zero cross-stack
  seed-difference property, orthogonal to the Lyapunov regime. Tolerance REUSES
  `[overrides.lattice-boltzmann-d3q19]` (`lbm`/`1e-5`; D6, no new row — the THIRD port
  to skip the Stage-1c override add).
- **§ 6.7 within-sim cross-backend corroboration.** Same sim, same laminar canonicals,
  same sealed NumPy reference: Stack-D **Taichi** is shape **(b)** (`~6e-15`,
  division-form feq + summation order) while Stack-E **Warp** is shape **(a)** (`0.0`,
  reciprocal-operand-form feq + `wp.float64(0.0)` seeds). Varying ONLY the backend
  flips the seed-difference from `~6e-15` to `0.0` — the sharpest demonstration that
  the cross-stack seed-difference is a **backend-pair arithmetic property**, not the
  sim's or the trajectory's.
- **Methodology + conventions refinements (Stage 2):**
  `cross-stack-equivalence-methodology.md` § 4.1 second-instance amendment
  (collision-step FP-accumulation is determinism-safe AND bit-faithful on Warp CPU
  f64; deferred aspect #4's FIRST Warp measurement) + § 6.7 within-sim corroboration +
  **new § 6.8** (the Warp-CPU-f64 ↔ NumPy zero-seed-difference backend-pair
  observation, **`n=2`** — suggestive, NOT established; surfaced not asserted, with a
  portfolio-track-future-ports qualifier; routed to the methodology doc over
  `sub-phase-conventions.md` § L.7 "O-3" per D-S2-1); `sub-phase-conventions.md`
  § L.7 O-1 shape-(a) **third-instance / first-laminar** note; `docs/common/warp.md`
  § 6 LBM-row dtype `f32 → f64` (D15) + new § 6.3 (the f64-principle's third instance,
  first with in-kernel reductions).
- **Schema-corpus representative-subset:** the Couette 27 MB capture (the smaller
  canonical) at
  `tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-e-couette.{h5,json}`
  (LFS-routed; corpus round-trip verified). BOTH canonicals are LFS-committable
  (≤ 256 MiB) — NO held-local (D14). No `-phase-N` tag (D12); local-only (D13).
- **Phase-2 cross-stack status:** completes the Stack-E ports of spec § 11.3
  items 2.3–2.5 (MPM + smoke + LBM → Stack-E all landed). The remaining enumerated
  spec § 11.3 cross-stack port is `reaction-diffusion-2d` → Stack-C (charter § 8;
  a different `common-cpp` infrastructure arc). Banked LFS-architecture +
  comprehensive-cleanup sub-phases remain queued for after Phase-2 completion.

### sub-phase-lfs-architecture

Phase-2-tail infrastructure sub-phase. Migrates the portfolio's large
capture/audit-evidence LFS content (4.852 GiB across 26 unique objects) off
GitHub LFS — whose **bandwidth** free tier (10 GB/month) was fully consumed and
throttled — onto **Cloudflare R2** (zero-egress, 10 GiB free storage) via the
`lfs-s3` custom-transfer agent, **without rewriting any git history**. Every LFS
pointer stub stays byte-identical; only the resolver/backend config changes. All
seven named invariants (I1–I7) and the bit-identity replay (`9399fc33…`) and
integrity baseline (`c19492ad…`) held throughout. No `-phase-N` tag; an optional
non-phase point-release `v0.2.1-sub-phase-lfs-architecture` is a banked operator
decision (`docs/conventions/sub-phase-conventions.md` § D.2).

**What changed for contributors:**

- **CI handles R2 automatically, per-job.** The two capture-heavy workflows
  (`python-strict`, `cpp-strict`) no longer fetch all LFS content on every run.
  `python-strict` pulls only `tests/fixtures/legacy-captures/**`; `cpp-strict`
  pulls only `captures/reaction-diffusion-2d-ref/**` (its gate-14 reference
  capture) — the dominant per-run LFS term drops ~20×. The R2-routed workflows
  install `lfs-s3` and opt in via per-job `git config` (`tools/lfs/setup-lfs-s3.sh`),
  using the repo's `R2_*` Actions secrets.
- **Local dev is unaffected by default.** A fresh clone with no R2 credentials
  resolves LFS via GitHub LFS exactly as before (the steady-state fallback). To
  route local LFS through R2 (faster, zero-egress), follow the one-command
  bootstrap in `tools/lfs/README.md` to register `lfs-s3` in your **trusted**
  `.git/config` (git-lfs ignores these keys from a committed `.lfsconfig` by
  design, so R2 activation is always explicit opt-in).
- **Steady-state architecture:** R2 is primary for opted-in consumers (CI + any
  developer who bootstraps it); GitHub LFS remains the fallback for default
  consumers. Both backends hold every object; decommissioning GitHub LFS
  (R2-only) is deferred indefinitely to a future operator decision.

#### Added

- `tools/lfs/setup-lfs-s3.sh` — per-job `lfs-s3` installer + trusted-config
  registrar (credentials from env, never committed).
- `tools/lfs/r2-bulk-upload.sh` — deterministic bulk upload of the HEAD +
  phase-tag OID union (26 objects) to R2, with per-object sha256 round-trip
  verification.
- `tools/lfs/README.md` — R2 opt-in bootstrap + local-dev runbook.
- `.github/workflows/r2-roundtrip-proof.yml` — M2 single-object R2 round-trip
  proof (content-OID preserved).
- `.github/workflows/r2-sweep-proof.yml` — M4 sweep: verifies every LFS pointer
  at HEAD + each phase tag resolves from R2 by sha256 (62/62 PASS).
- `tools/testkit/lfs_migration/` — invariant-verification lock surface for
  I1–I7 + cost-axis registry + per-job R2-config (16 tests).
- `docs/planning/bit-physics-master-catalog.md` (+ `docs/planning/README.md`) —
  vendored CI-tier / capacity planning catalog.
- Sub-phase audit chain under `docs/_audits/phase-2/sub-phase-lfs-architecture/`
  (plan-drafting → Stage 0 → 1a → 1b → 1c → 2 landing).

#### Changed

- `.github/workflows/python-strict.yml`, `.github/workflows/cpp-strict.yml` —
  `lfs: true` → `lfs: false` + targeted `git lfs pull --include=` (selective
  fetch).
- `.github/workflows/mutation-testing.yml` — re-tiered to weekly T4 (cron +
  dispatch + path-filtered push) per catalog § 41.4 (sibling chain); de-listed
  from required-must-run in `docs/ops/branch-protection.md`; `docs/architecture.md`
  § 2.13 CI-policy amended accordingly.

### sub-phase-phase-2-cleanup

Phase-2-tail basket-hygiene sub-phase, landing after `sub-phase-lfs-architecture`.
Pays down the hygiene debt consolidated at Phase-2 close — citation/path drift,
convention amendments, doc-truth divergences, deferred small follow-ups — across
seven thematic clusters (A–G) before Phase 3 dispatches. Of **53 enumerated items**
(41 from the Phase-2 landing § 13 inventory + 8 operator-known-pre-queued + 4
probe-discovered), the cleanup-shaped ones were resolved in place and **11 items
were routed forward as candidate sibling sub-phases / operator-decision dispatches /
Phase-3 consumptions** (the full forward-routing catalog is in the sub-phase landing
audit). No simulation source changed; all seven invariants (I1–I7), the bit-identity
replay (`9399fc33…`), and the integrity baseline (`c19492ad…`) held byte-for-byte
throughout. No `-phase-N` tag and — per the § D.2 default this sub-phase itself
authored — **no point-release tag** (cleanup is steady-state hygiene, meeting none
of the three intermediate-tag conditions).

**What changed for contributors:**

- **Intermediate-tag policy is now explicit** (`docs/conventions/sub-phase-conventions.md`
  § D.2): the default is **NO tag** for a sub-phase, except when it (a) adds an external
  dependency, (b) marks durable architecture worth git-archaeology, or (c) the operator
  judges historical significance — precedent `v0.2.1-sub-phase-lfs-architecture`.
- **Per-package code ownership scaffolding** (`.github/CODEOWNERS`, new): 19 sim packages
  + 4 common + tooling, with an operator owner and agent-id sentinel comments. **Latent**
  (not enforced — the repo has no live branch protection); it benefits the project at
  multi-agent maturity.
- **README test invocations standardized** to `uv run pytest …` across all 11 packages.
- **GitHub Actions pinned to immutable commit SHAs** (`checkout`, `setup-node`,
  `pnpm/action-setup`) with the mutable-tag-vs-immutable-SHA distinction documented in
  `docs/dependencies.md`.
- **CHANGELOG structure fix:** seven misfiled Phase-2 sub-phase sections that had been
  recorded under the `[0.1.0-phase-1]` header were relocated (byte-exact) to
  `[Unreleased]`, where they belong.
- **Conventions / methodology reconciled:** the § M cumulative-shift inventory and
  several stale § L / methodology § 6 section titles were brought current; the
  integrity baseline-digest derivation and coordinator-drift patterns were formalized
  in a new § L.10; verdict-states were mapped to Nygard ADR states as a § L.11
  intention-note (no ADR directory yet); and the matched-pair cross-stack gate ↔
  differential-testing relationship was cross-referenced (§ L.11 + catalog § 50.1)
  without renaming anything.
- **The I7 no-agent-pushed-tags guard test was rewritten** to encode the actual
  invariant — it now forbids *agent-pushed* tags via a declarative
  operator-sanctioned-tags allowlist, rather than forbidding *all* tags pointing into
  a sub-phase range (which had wrongly flagged the operator's legitimate
  `v0.2.1-sub-phase-lfs-architecture`).
- **Branch-protection doc amended to live state** (`docs/ops/branch-protection.md`):
  the documented rules are DESIGNED-but-unenforced (the live API returns 404 "not
  protected"); implementing them is forward-routed for if/when the contributor model
  grows beyond solo+agent.

### sub-phase-ci-action-migration-and-banked-cleanup

Focused-infrastructure sub-phase whose PRIMARY, time-pressured driver is
**S-CI2** — the GitHub Actions Node-20 runtime deprecation (Node-24 default
2026-06-16; Node-20 removal "later in fall 2026"). Bumps every workflow action
pinned to a Node-20 major to its latest Node-24 major, preserving four
load-bearing `with:` blocks byte-for-byte, and bundles the banked
testing-improvements subset (pytest-timeout + a representative manifest-equality
test) per the focused-infra `sub-phase-audit-chain-correctness` shape. NOT a
per-sim port; NOT cross-stack. No `-phase-N` tag (spec § 7.12); PUSH IS OPERATOR
ACTION (remote-CI validation of the bumped majors happens at the operator push).

#### Added / Changed

- **S-CI2 workflow Node-runtime migration (Stage 1a).** Across all 9
  `.github/workflows/*.yml` (17 `uses:` version-string changes only):
  `actions/checkout@v4`→`@v6` (×9), `astral-sh/setup-uv@v6`→`@v8` (×6),
  `actions/setup-node@v4`→`@v6` (×1, `ts-strict.yml`),
  `pnpm/action-setup@v4`→`@v6` (×1, `ts-strict.yml`). Target majors web-fetched
  fresh at edit time (D3). The four D4 `with:` blocks preserved byte-for-byte
  (R-CI CLEARED): `lfs: true` (`python-strict.yml`, the S-CI1 legacy-captures
  smudge), `fetch-depth: 0` (`audit-append-only.yml`, prior-tag read),
  `setup-node` inputs + pnpm `version: 10` (`ts-strict.yml`).
- **pytest-timeout (Stage 1b, § J.3, D12 shape (b)).** `pytest-timeout>=2.0`
  added to `tools/testkit/pyproject.toml` dev extras + a default per-test ceiling
  in `[tool.pytest.ini_options]`. Lands the § J.3 requirement (numba PATH-A
  mutation targets); per-target mutmut runners may tighten it. MPM `mls_mpm.py`
  mutation completion remains banked.
- **LBM manifest-equality test (Stage 1b, § J.7, D11, strategy (i)).** New
  `packages/lattice-boltzmann-d3q19/tests/test_manifest_equality.py` — invokes
  the existing `sim_runner_diagnostic` and asserts the full emitted `.json`
  manifest against expected literals (volatile `run.wall_clock_seconds` +
  `payload.checksum` excluded per spec § 2.5 / § F.3) + run-to-run stability.
  ZERO sealed-source edits; no public `build_manifest()` (strategy (ii) banked).
  Representative-single-sim (the representative-subset artifact class).
- **Conventions § J amended additively** (`docs/conventions/sub-phase-conventions.md`):
  § J.3 records pytest-timeout LANDED; § J.7 records the manifest-equality test
  REALIZED via strategy (i) (banked methodology-precedent #14). Existing prose
  unchanged.

#### Verification

- **Python 18-root sweep:** ZERO code regressions (418 passed + 3 skipped,
  full-collection mode; LBM 10→12 is the only intended delta). The 4 Stack-D
  ports errored on a COLD taichi `.pyc` (latent pre-existing
  taichi-`SyntaxWarning` filterwarnings gap, exposed by the Stage-1b `uv sync`;
  proven not a code regression — warming the `.pyc` → all pass; banked as a
  recommended Stack-D-filterwarnings follow-up).
- **TypeScript sweep:** 20 passed + 2 skipped (baseline-match).
- **Integrity sweep:** `0 HARD_FAIL, 14 SOFT_WARN`; sweep-output sha256
  `c19492ad…cb52` byte-identical to the MPM Stack-D close baseline (streak HELD
  across the migration + § J amendment + new test).
- **Bit-identity replay invariant:** `9399fc33…18909f34` HELD (27th+ invocation).
- **Append-only:** PASS (no Phase-0/Phase-1 or prior-sub-phase audit edited).
- **verify_evidence:** full 9-audit chain GREEN.

#### Banked methodology-precedent

- **#14 — strategy-(i) manifest-equality pattern.** The literal
  `<sim>.sim.build_manifest()` call site does not exist at HEAD; invoke the
  existing `sim_runner_*` (or its diagnostic-tier variant), load the emitted
  `.json` manifest sidecar, shape-check-then-exclude the volatile wall-clock +
  checksum fields, and assert the remainder equals expected literals (numeric
  params from module constants). Realizes § J.7's intent without a sealed-source
  refactor. Reusable for any future per-sim manifest-equality fan-out.

### sub-phase-ci-action-hotfix-setup-uv-v8-pin

Single-stage focused-infrastructure **hotfix** for the post-push CI failure of
`sub-phase-ci-action-migration-and-banked-cleanup`: 6 of 9 workflows went red,
all using `astral-sh/setup-uv@v8`. Per the setup-uv v8.0.0 release notes, the
maintainer **discontinued publishing moving major/minor tags** at v8 as
supply-chain hardening (*"we will stop publishing minor tags. You won't be able
to use `@v8` or `@v8.0` any longer"*) — so `@v8` does not resolve. No `-phase-N`
tag; PUSH IS OPERATOR ACTION.

#### Changed

- **Pinned `astral-sh/setup-uv@v8` → `@v8.1.0`** (immutable specific-version tag;
  current latest v8.x, re-fetched at edit time) across the 6 setup-uv workflows
  (`python-strict.yml`, `determinism.yml`, `equivalence.yml`, `integrity.yml`,
  `mutation-testing.yml`, `tolerance-budget-check.yml`). 6 single-line `uses:`
  changes; every other line byte-for-byte preserved. The other 3 bumped actions
  (`actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6`) still
  publish moving tags and are left as-is (out of scope).

#### Verification

- pyyaml 9/9 valid; integrity sweep `c19492ad…cb52` byte-identical (streak HELD);
  bit-identity replay `9399fc33…18909f34` HELD (28th+ invocation). No
  cross-package regression sweep warranted (workflow-YAML-only; zero Python/TS
  surface touched).

#### Banked observation

- **Action-version web-fetch must distinguish (a) latest released version from
  (b) usable pinning forms.** Release notes may document deviation from the
  default "pin to major" assumption (setup-uv v8.0.0: moving tags discontinued).
  Future workflow-action probes / D3 re-fetch must read the release notes for the
  specific major targeted, not merely confirm the version exists.

### sub-phase-eulerian-smoke-stack-d

FIFTH per-sim cross-stack port under spec-Phase-2: `eulerian-smoke` →
Stack-D (Taichi-DSL / CPU); spec § 11.3 item 2.4 first half (the Stack-E
Warp half deferred). **The FIRST of the five cross-stack pairs to exercise
IC-15 aspect #1 (R-P2 chaotic regime) substantively** — both Phase-1 canonical
trajectories are numerically unstable (positive Lyapunov; 2D Kelvin-Helmholtz
shear, 3D Taylor-Green blow-up to ~5e19). Gates 4-13 GREEN; gate-14
`within_tolerance=False` on both canonicals with the **chaotic-regime
escape-hatch invoked correctly** (Option-2 operator routing): cross-stack
content-equivalence is physically impossible for chaotic trajectories, so the
failing verdict is the CORRECT verdict, and the methodology gains its first
formalized chaotic-regime component. A methodology-strengthening sub-phase. The
port is faithful (matches the sealed NumPy reference to ~1e-16 while stable; the
instability is in the Phase-1 reference, verified independently). Cross-stack
testing surfaced a latent Phase-1 instability that within-stack determinism +
finite-NaN/Inf gates could not see. No `-phase-N` tag (spec § 7.12); local
landing only — remote-CI re-validation banked behind the LFS-architecture
sub-phase (D13).

#### Added

- `packages/eulerian-smoke-stack-d/` — 19th workspace member. Taichi-DSL CPU
  Stam-Fedkiw stable-fluids port: `reference/stable_fluids_taichi.py`
  (`@ti.kernel` per-cell SL-advect / Laplacian / divergence / Jacobi-sweep /
  gradient / curl primitives + NumPy wrappers mirroring the Phase-1 reference;
  CANONICAL_* re-derived verbatim), `sim.py` (`sim_runner_seeded` 3D,
  `sim_runner_seeded_2d` 2D, `sim_runner_diagnostic`,
  `compute_canonical_trajectory_3d`), `invariants.py` (2 PBT @ 50 examples).
  Collocated cell-centered periodic; plain trilinear SL (3D) + MacCormack (2D);
  fixed-`n_jacobi=20` Jacobi; vorticity confinement `eps=0` PRESENT-but-NOT-
  EXERCISED. Gate-4 MMS-only (advection OOA 1.9892 / projection 1.9976).
- `tools/testkit/equivalence/tolerance.toml` `[overrides.eulerian-smoke]
  category="smoke"` — 5th per-sim override (additive; resolves
  `volumetric-grid`→`smoke`@1e-4).
- `docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` — extended to
  the **chaotic-regime witness** (the template future chaotic-regime pairs
  inherit): divergence-rate witness, Lyapunov estimates, step-1 port-faithfulness
  baseline, gates-4-13-GREEN evidence.
- `docs/conventions/cross-stack-equivalence-methodology.md` § 6 — **IC-15 § 2
  item 1 (R-P2 chaotic-regime escape-hatch) promoted deferred → FORMALIZED**
  (smoke the data-backed first instance); References renumbered → § 7. Methodology
  remains PARTIAL (#2/#3/#5 deferred).
- `docs/conventions/sub-phase-conventions.md` § L.4 — three banked
  methodology-precedents: S6-trajectory-simulation discipline; cross-stack-as-
  defect-amplifier; banked precedent #7 (f64-seed) extends to pure-literal kernel
  constants (3D Jacobi `1.0/6.0` → `ti.f64(1.0)/ti.f64(6.0)`).
- `docs/perf-ledger.md` — two rows (2D 8.470s / 3D 698.986s; both within 2× band).
- Sub-phase audit chain under
  `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/` (plan-drafting 4 +
  Stage 0 3 + Stage 1 5 + Stage 2 6 = 18 commits).

#### Verification

Gates 4-13 GREEN (MMS OOA 1.9892/1.9976; Tier-1/Tier-2; citations; API; captures;
`run_twice_and_diff` content-equivalent; 2 PBT @ 50; perf; failing-tests replay).
Gate-14 `within_tolerance=False` (chaotic-regime escape-hatch — correct verdict).
Cross-package regression sweep: 19 members + testkit (58) + diagnostics (22), ZERO
regressions. Integrity sweep `c19492ad…d22cb52` baseline-MATCH (streak HELD, 8th
sub-phase). Bit-identity replay `9399fc33…718909f34` HELD (32nd+). Append-only PASS;
`verify_evidence` full chain PASS. Cumulative shifts 159 → 165 (Stage 1: 4; Stage 2: 2).

#### Banked

- STAYED-BANKED: LBM `sim_runner_diagnostic` cosmetic; actionlint/check-yaml/
  supply-chain-pin for the other 3 actions; LFS-architecture sub-phase (D13);
  manifest-equality smoke-specific test (D7).
- NEW banked observation: **Phase-1-canonical re-characterization question** —
  whether future Phase-1 canonicals should "exhibit stable physics" vs "exercise
  numerics including unstable cases" (raised by smoke's chaotic finding; banked
  for operator routing, Option-2).
- NEW banked methodology-precedents: S6-trajectory-simulation; cross-stack-as-
  defect-amplifier; banked-#7-pure-literal-constants (conventions § L.4).

### sub-phase-common-warp-bootstrap

Focused-infrastructure sub-phase (not a per-sim cross-stack port): establishes
`common/common-warp/` as the **20th workspace member** and the **Stack-E
(Python / NVIDIA Warp 1.13.0)** workspace surface — the phase-2 plan §1.9.1
seven-subsystem minimal API. Enables the 3 forthcoming Stack-E port sub-phases
(MPM, Smoke, LBM). All six W-Gates GREEN. The module is "shipped, then wired"
(consumed at landing only by its own tests + `examples/hello/`; the Stack-E
ports import it). No `-phase-N` tag (spec § 7.12); local landing only —
remote-CI re-validation banked behind the LFS-architecture sub-phase (D13).

#### Added

- `common/common-warp/` — 20th workspace member (`bit-physics-common-warp`;
  import package `common_warp`; `warp-lang>=1.13,<2.0`). The §1.9.1 seven
  subsystems: **Runtime** (`runtime.py` — `init(device, deterministic)` /
  `get_device` / `set_device`; CPU-default per D4/R-W3), **Determinism**
  (`warp_harness/` — `set_seed` / `get_seed` / `assert_deterministic_run` /
  `deterministic_context` / `set_warp_deterministic`; W-2), **Capture I/O**
  (`capture/` — `Capture` / `write_capture` / `read_capture` delegating to the
  testkit capture format; W-1), **Particles** (`particles/`), **Grids**
  (`grids/` — `ScalarField3D` / `VectorField3D` + allocators), **HashGrid**
  (`hashgrid/` — native `wp.HashGrid` + kernel `query_radius`).
- `common/common-warp/examples/hello/` — **Subsystem 7** smoke sim (W-3): 2D
  advection-diffusion 64×64, explicit FTCS diffusion + first-order upwind
  advection, double-buffered per-cell gather (no atomics, no RNG). Bounded +
  monotonically-decaying trajectory reproduces the Stage-0 design-time
  prediction (max-field 1.0 → 0.218683 over 400 steps, zero increases, mass
  conserved). Exercises Runtime/Determinism/Capture/Grids directly; Particles +
  HashGrid via smoke-field tracer-particle unit tests.
- `docs/common/warp.md` — W-4 project-wide Stack-E Warp convention + the
  common-warp public API reference (8-section, mirrors `docs/common/taichi.md`).
- `docs/dependencies.md` — `warp-lang` entry; root `pyproject.toml` — 20th
  workspace member.
- `warp_harness/` §1.9.1 socket — the Runtime + Determinism signatures
  reconciled to §1.9.1 verbatim (S1b-3 Option-B refactor): `init(device,
  deterministic)`, no-arg `deterministic_context()`,
  `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0)`. The W-2 baseline
  `24d44c7e…0746f314` reproduces under the refactored signature (load-bearing).
- `docs/conventions/sub-phase-conventions.md` § L.5 — three new
  methodology-precedents: **S1a-2** GPU device-string discipline; **S1b-3**
  socket-reconciliation Option B; **S1c-1** plan-prose-gloss vs spec-verbatim.
- Sub-phase audit chain under
  `docs/_audits/phase-2/sub-phase-common-warp-bootstrap/` (plan-drafting 4 +
  Stage 0 2 + Stage 1a 4 + Stage 1b 4 + Stage 1c 6 + Stage 2 3 = 23 commits).

#### Verification

All six W-Gates GREEN: W-1 Capture (1b mechanism / 1c full, real capture); W-2
Determinism (1a mechanism / 1c full, `assert_deterministic_run` +
`run_twice_and_diff` on the smoke sim; baseline `24d44c7e…0746f314`); W-3 smoke
sim; W-4 docs; W-5 equivalence-compat (`compare_captures` run-twice-and-diff,
`within_tolerance=True`, no HARD_FAIL); W-6 integrity. Cross-package regression
sweep (20 workspace roots, cold `.pyc`): ZERO REGRESSIONS (common-warp 38;
common-py 25; 5 Stack-D ports + 10 Phase-1 sims + 3 tools unchanged). TS sweep:
20 passed + 2 skipped. Integrity sweep `c19492ad…d22cb52` baseline-MATCH (streak
HELD, 9th sub-phase). Bit-identity replay `9399fc33…718909f34` HELD (40th).
Append-only PASS; `verify_evidence --strict` full chain (12 audits) PASS.
Cumulative shifts 165 → 176 (plan-drafting 3; Stage 0 1; Stage 1a 2; Stage 1b 3;
Stage 1c 1; Stage 2 1).

#### Banked

- STAYED-BANKED: LBM `sim_runner_diagnostic` cosmetic; actionlint installation /
  check-yaml hook `.github/workflows/` coverage / supply-chain-pin for the other
  3 actions; LFS-architecture sub-phase (D13); manifest-equality smoke test (D7);
  Phase-1-canonical re-characterization; **mypy --strict warp partial-stub
  errors** (banked at Stage 1c; future tooling-improvement).
- CLOSED: common-warp bootstrap (all 6 W-Gates GREEN); S1b-3 socket
  reconciliation (Option B refactor landed; §1.9.1 verbatim signatures shipped);
  Subsystem-7 design-time prediction verified empirically.
- NEW banked observation: the next 3 Stack-E ports (MPM, Smoke, LBM) inherit the
  common-warp surface + the S6-trajectory-simulation discipline at plan-drafting.
- NEW banked methodology-precedents: S1a-2 GPU device-string discipline; S1b-3
  socket-reconciliation Option B; S1c-1 plan-prose-gloss vs spec-verbatim
  (conventions § L.5).

### sub-phase-mpm-multimaterial-stack-e

SIXTH per-sim cross-stack port; FIRST Stack-E (NVIDIA Warp 1.13.0) port to
*consume* the `common-warp` § 1.9.1 socket (the bootstrap landed the socket
itself). Spec § 11.3 item 2.3 mandate. All 14 gates GREEN; **gate-14 BIT-EXACT**
(`within_tolerance=True`; `max_abs_err = max_rel_err = 0.0` across 4 fields × 11
frames) — the FIRST bit-exact cross-stack verdict across the six-port portfolio
(contrast the Stack-D Taichi ports' `~1e-28` FP-round-off and `eulerian-smoke`
Stack-D's chaotic-regime `within_tolerance=False`). No `-phase-N` tag (D12);
local-only (D13; remote-CI deferred).

#### Added

- `packages/mpm-multimaterial-stack-e/` — 21st workspace member; the Warp
  MLS-MPM/APIC neo-Hookean single-material port. Socket-only `common-warp`
  consumption (Runtime + Capture + Determinism) with its own
  `wp.array(dtype=wp.float64)` sim-state (D15; the convenience surfaces are
  f32-pinned); fixed 27-cell B-spline stencil (no `HashGrid`).
- `captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.{h5,json}`
  — canonical capture (~1.05 GiB; LFS; `.h5` oid `dfc4d699…4554d0a9`); 2/2
  canonical-scale determinism; mass-conservation partition-of-unity exact
  (`4.44e-16`) at 1M particles / 128³.
- `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-e.md` — Stack-E
  spec sheet (gate-7 Cat-1 surface).
- `docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md` — ADDITIVE Stack-E
  section (bit-exact per-field witness; Stack-D Taichi section preserved).
- `docs/perf-ledger.md` — canonical Warp-CPU row (`304.492 s`; 1.93×-numba,
  within the 2× band).
- conventions § L.6 — O-W7 extension (`wp.float64()` taint workaround) [Stage 1b].
- `docs/common/warp.md` § 6.1 — D16 correction: MPM socket-only consumption
  pattern (general principle for f64 vs f32 Stack-E ports).
- `cross-stack-equivalence-methodology.md` § 5.1 — third-instance (D8): the
  atomic-scatter PRESENT-but-NOT-EXERCISED pattern is stack-portable
  (Taichi → Warp); graduated to an established portfolio pattern.
- conventions § L.7 — two banked observations: O-1 cross-stack verdict taxonomy
  (bit-exact / FP-round-off / chaotic-regime escape-hatch); O-2 Warp CPU
  determinism four-checkpoint chain.

#### Audit chain

- 23 commits across plan-drafting (4) + Stage 0 (2) + Stage 1a (4) + Stage 1b (5)
  + Stage 1c (3) + Stage 2 (5), under
  `docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/`.

#### Verification

- 14 gates GREEN (gate-14 BIT-EXACT). 21-root regression sweep ZERO REGRESSIONS
  (490 passed + 1 skipped; after a Stage-2 `.venv` dev-dep restoration — the
  workspace lost `scipy`/`mutmut`/`pytest-timeout` since the prior landing,
  restored via `uv sync --all-packages --all-extras`). TS sweep 20 passed + 2
  skipped. Integrity `c19492ad…d22cb52` baseline-MATCH (10th contiguous
  sub-phase). Bit-identity replay `9399fc33…718909f34` HELD (47th). Append-only
  PASS. verify_evidence full chain (12 .md audits) PASS.

#### Banked

- STAYED: LFS-architecture (D13); multi-material MPM extension (single-material
  scope per S1a-ME2); the standing tooling/CI items.
- CLOSED: MPM → Stack-E port; D7 RATIFIED REUSE (tolerance override edit no-op —
  first per-sim port to skip it); O-W7 § L.6; warp.md § 6 D16; methodology § 5.1
  third-instance.
- NEW observations: cross-stack verdict taxonomy (§ L.7 O-1); Warp CPU
  four-checkpoint chain (§ L.7 O-2); environment-provisioning drift (dev extras
  must be synced for the sweep/mutation gates).

### sub-phase-common-cpp-bootstrap

Focused-infrastructure sub-phase maturing `common/common-cpp/` from a
Phase-1-Stage-1 declarations-only scaffold into a consumable Stack-C (C++ /
Vulkan) surface — the **precondition** that unblocks the Stack-C per-sim ports
(RD-2D-Stack-C plan-drafting REFRESH next, D11). Determinism is pinned to Mesa
**lavapipe** (CPU software Vulkan; `VK_DRIVER_FILES` + `LP_NUM_THREADS=0`).
Gates C-0..C-7 all GREEN. `common-cpp` is **CMake-registered, NOT a uv workspace
member** (D6; member count stays 23). No `-phase-N` tag (D12 — reserved for
spec-phase boundaries). Initiates the **Vulkan/C++ quirks catalog**
(`docs/conventions/sub-phase-conventions.md` § L.9; D5).

#### Added

- **Vulkan headless compute substrate** (`bit_physics::common_cpp_vulkan`;
  `include/bit_physics/common/vulkan_compute.hpp` + `src/vulkan_compute.cpp`) —
  `vkcompute::{ComputeContext, StorageBuffer, ComputePipeline, dispatch}` (RAII,
  move-only, VkResult→exception); instance / device / compute-queue /
  command-pool / descriptor-set / pipeline / SPIR-V module / host-visible
  buffer-IO / fence sync; `query_float_controls` +
  `assert_deterministic_float_controls`. Reproduces the Stage-0 determinism
  baseline `a7f85bd4…` (C-3).
- **SPIR-V build-time wiring** — `bitphysics_embed_compute_shader()` CMake helper
  (glslang `--vn` embedded `uint32_t[]` headers; reproducible) + `shaders/`.
- **Determinism socket** (`include/bit_physics/common/determinism.hpp`) —
  `DeterministicContext` RAII + `assert_deterministic_run` + `set_seed`/`get_seed`
  + library `hash::sha256_hex`; FloatControls + NoContraction (`precise`)
  discipline (NoContraction baseline `48c92e95…`, distinct from the contracted
  `a7f85bd4…` — the two-baseline rule, § L.9 Q-CPP1) (C-1/C-2).
- **HDF5 capture-v1** (`bit_physics::common_cpp_hdf5`; `src/capture_hdf5.cpp`) —
  `Hdf5Writer`/`Hdf5Reader` replicating the testkit capture-v1 layout (system
  `libhdf5-dev` + header-only HighFive v2.10.1, FetchContent; D3/D8).
- **§1.9.1-cpp socket** (`include/bit_physics/common/common_cpp.hpp` umbrella) +
  **2D advection-diffusion smoke** (Vulkan compute; bounded/stable § L.4,
  max-field 0.99→0.19) + **cross-language interop** (Python testkit parses the
  C++-emitted `.h5`; C-4/C-5/C-6).
- **Top-level `CMakeLists.txt`** registering `bit_physics::common_cpp` (D6) +
  **`.github/workflows/cpp-strict.yml`** (lavapipe + cmake + ctest CI; S-CPPB5).
- De-scaffolded `docs/common/cpp.md` (C-5; resolves the dangling
  `_staging/deps.md` reference, B-RD2C1) + § L.9 Vulkan/C++ quirks catalog
  (Q-CPP1..5; D5).

Verification: integrity baseline-MATCH `c19492ad…d22cb52` (0 HF / 14 SW) HELD;
bit-identity replay `9399fc33…` HELD; portfolio sweep 23/23 members ZERO
regressions; `ctest` 5/5. Methodology § 6.8 (Warp-CPU-f64↔NumPy) explicitly does
NOT inherit to the Vulkan/C++↔NumPy backend pair (documented at plan-drafting;
established empirically at the per-sim ports). No `-phase-N` tag pushed (D12).

### sub-phase-reaction-diffusion-2d-stack-c

The **8th and final** spec § 11.3 cross-stack port and the **FIRST Stack-C
(Vulkan / C++)** per-sim port: the Phase-1 NumPy Gray-Scott reaction-diffusion 2D
reference ported to GLSL `double` compute on Mesa **lavapipe**, consuming the
`common-cpp` § 1.9.1-cpp substrate. With this landing Phase-2 is **substantively
complete** (8/8 ports landed; the comprehensive cleanup sub-phase + the deferred
LFS-architecture sub-phase become routable). The **formal Phase-2 close** (a
phase-level closing audit + a proposed `v0.2.0-phase-2` tag) is a dedicated
**Stage 9 — Landing** pass per Phase-2 plan § 2.12, routed separately — NOT part of
this sub-phase. `common-cpp` + RD-2D-Stack-C are **CMake-registered, NOT uv
workspace members** (D6/D11; member count stays **23**). No `-phase-N` tag (D12).

#### Added

- **`packages/reaction-diffusion-2d-stack-c/`** — Vulkan/C++ Gray-Scott f64 port:
  `src/gray_scott.cpp` (run-loop consuming `vkcompute` + `capture` + `determinism`
  + `hash`); **two** embedded SPIR-V kernels — the plain Gray-Scott step **and** a
  manufactured-source variant for the gate-4 MMS order-ladder (S0-RD2C1) —
  `precise`/`NoContraction` f64; `gray_scott_capture_main` capture binary;
  doctest suite + the `rd2d_stack_c_gate14` cross-language ctest.
- **`captures/reaction-diffusion-2d-stack-c/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`**
  (LFS; h5 sha256 `00081dc42b…`, 2.94 MB) — capture-v1-conformant
  (`payload.format="hdf5"`, non-empty `run.start_utc`).
- **`tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-c.{h5,json}`**
  (LFS) — schema-corpus entry (corpus round-trip 17 → **19**).
- **`docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` § C** —
  additive Stack-C bit-exactness witness (Stack-B ↔ Stack-D §§ untouched).
- **`docs/perf-ledger.md`** — `reaction-diffusion-2d | vulkan-cpp | gray-scott-lambda-128sq-seed42-step2000 | 1.13 | i7-12700KF-linux-6.17`
  gate-12 row (added at Stage 2; the row was omitted at Stage 1b — S2-RD2C1).
- Top-level `CMakeLists.txt` `add_subdirectory(packages/reaction-diffusion-2d-stack-c)`.

#### Changed (additive per Convention A)

- **`docs/conventions/cross-stack-equivalence-methodology.md`** — § 6.7 within-sim
  cross-backend corroboration #2 (RD-2D Stack-D Taichi `~1.9e-14` vs Stack-C
  Vulkan/C++ `0.0`); § 6.8 the **SECOND** zero-seed-difference backend pair
  (Vulkan/C++-f64-lavapipe-NoContraction ↔ NumPy, n=1; Option α per charter § 6 —
  n=3 bit-exact instances across two backend pairs, SUGGESTIVE not established).
- **`docs/conventions/sub-phase-conventions.md`** — § L.7 O-1 shape-(a)
  **fourth-instance / first-non-Warp** note; § L.9 Q-CPP2 **D16** FloatControls
  f32-scoped cleanup-candidate note.
- **`docs/common/cpp.md`** § 4 — D16 f64-scoping note.

**gate-14: cross-stack BIT-EXACT** (`within_tolerance=True`, `max_abs_err=0.0`,
all 11 frames × {U,V}, full `step-2000` horizon) — the THIRD shape-(a) instance
overall and the FIRST on a non-Warp backend. Verification: all 14 gates GREEN;
`ctest` **7/7** (incl. `rd2d_stack_c_gate14`); integrity baseline-MATCH
`c19492ad…d22cb52` (0 HF / 14 SW) HELD; bit-identity replay `9399fc33…` HELD;
portfolio sweep ZERO regressions. No `-phase-N` tag pushed (D12).

### sub-phase-phase-3-common-3dgs

First Phase-3 sub-phase (task-1, scope item 3.8). Introduces
`common/common-3dgs/` — the Stack-E (Python / NVIDIA Warp) 3D-Gaussian-Splatting
common module — under the matured per-sub-phase cadence. Produces the
`GaussianSplatModel` / `Camera` / `render` API that task-8 (3dgs-mpm) and Phase-4
WU-C consume unchanged.

#### Added

- `common/common-3dgs/` workspace member (23rd; second Stack-E common module):
  `GaussianSplatModel` (Warp-array fields; Inria `.ply` load/save), `Camera`
  (view/projection + `look_at`), the deterministic forward EWA-splatting
  `render`, and `save_png` (the D-D RGB-image writer). Smoke sim at
  `examples/smoke_3dgs/` (`just run-3dgs-smoke`).
- `references/3DGS-reference/` — vendored Inria gaussian-splatting at the §2.18
  SHA `54c035f7…` (**NON-COMMERCIAL** research license; read-only; the first
  non-permissive upstream; the clause binds task-8 + Phase-4 WU-C).
- `docs/common/3dgs.md`; `tools/testkit/determinism/registry.toml` (NEW Phase-3
  surface) with `[neural-rendered.common-3dgs]` = bit-exact / same-stack-same-hw
  (D-C; MEASURED `max_abs_diff = 0.0`); `test-common-3dgs` job in
  `.github/workflows/python-strict.yml`; `just run-3dgs-smoke` / `just test-3dgs`;
  schema-corpus fixture `tests/fixtures/legacy-captures/phase-3-common-3dgs.h5`.

#### Tag reservation

Intermediate tag `v0.2.2-sub-phase-phase-3-common-3dgs` is the **lean-YES** Stage-2
landing tag (D-E: external dependency + durable architecture; operator-pushed, I7).
Not pushed during Stage 1.

### sub-phase-phase-3-render-similarity

Second Phase-3 sub-phase (task-2, scope item 3.x; HARD-blocks task-6 + task-8).
Introduces `tools/testkit/render_similarity/` — the render-similarity metric
module (PSNR / SSIM / LPIPS + `ms_ssim` Phase-4-WU-C shell) — and the
`equivalence` CLI `--mode render-similarity` dispatch under the matured
per-sub-phase cadence.

#### Added

- `tools/testkit/render_similarity/` package (`metrics.py` + `harness_mode.py`)
  exposing the §3.2.2 public surface:
  `psnr(a, b) -> float` (sentinel `+inf` for identical), `ssim(a, b) -> float`
  (Wang 2004 via `skimage.metrics.structural_similarity`),
  `lpips(a, b, net='alex'|'vgg') -> float` (Zhang 2018 via `lpips==0.1.4`),
  `ms_ssim(a, b) -> float` (SHELL — `NotImplementedError` until Phase 4 WU-C
  per `docs/phases/phase-3-plan.md:380`). Input contract: `(H, W, 3)` uint8
  `[0, 255]` OR float32 `[0, 1]` (auto-detect by dtype); shape/dtype/channel
  mismatch → `ValueError`.
- `tools/testkit/equivalence/__main__.py` — argparse CLI dispatcher
  (D-HARNESS-CLI lean (a)) with `--mode render-similarity`. The existing
  `compare_captures` programmatic surface is unchanged.
- `tools/testkit/equivalence/tolerance-schema.json` — additive top-level
  `render_similarity` key (category → sim → `{psnr_min, ssim_min, lpips_max}`;
  D-SCHEMA lean). Schema only — tasks 6 and 8 add rows.
- PyPI deps in `tools/testkit/pyproject.toml`: `lpips==0.1.4`,
  `scikit-image>=0.26`, `torch>=2.0` (declared; transitive of lpips).
- Adversarial fixtures + meta-test at
  `tools/testkit/render_similarity/tests/fixtures/adversarial/` (testkit-local
  per charter-v2 evidence: identical CI breadth/freq + Cat 1-5+Cat-X semantic
  mis-fit + `docs/architecture.md:673` Layer-0 placement). Two families:
  `ssim_false_positive` (inverted-checkerboard pair) + `lpips_false_negative`
  (1/255 single-pixel perturbation).
- `test-render-similarity` job in `.github/workflows/python-strict.yml`
  (pytest directly per §2.14, mirroring the `test-common-3dgs` job; bundled
  lpips linear-head weights pin via R-3 sha256 assertion; CI backbone
  download cached via `actions/cache`).
- `docs/testkit/equivalence.md` — render-similarity mode section (Cat-2 doc↔impl
  contract).
- `docs/glossary.md` entries: PSNR, SSIM, LPIPS, perceptual loss, MS-SSIM.

#### D-class

- **D-LOC**: `tools/testkit/render_similarity/` package per §3.2.2 (RESOLVED-IN-CHARTER).
- **D-HARNESS-CLI**: lean (a) — `equivalence/__main__.py` + `--mode` flag
  (RATIFIED Stage 1a; no destructive refactor → STOP-CLI not fired).
- **D-SCHEMA**: additive `render_similarity` top-level key in
  `tolerance-schema.json` (RATIFIED Stage 1a; existing validators unchanged →
  STOP-SCHEMA not fired).
- **D-WEIGHTS**: lazy runtime-fetch + CI `actions/cache` + R-3 sha256 assertion
  on bundled linear-head weights; backbone download per torchvision pin.
- **D-DET**: **bit-exact / same-stack-same-hw** — MEASURED at Stage 1b across
  PSNR (pure numpy), SSIM (skimage), LPIPS-alex (CPU + eval + no_grad +
  pinned weights), LPIPS-vgg. All four bit-exact across two runs → STOP-DET
  not fired. R-4 (GPU LPIPS diverges from CI CPU) documented in metrics.py
  docstring + `docs/testkit/equivalence.md`.
- **D-ANCHOR**: 3 anchors landed at Stage 1b — PSNR hand-derivation
  (closed-form `10 * log10(MAX_I**2 / MSE)`); SSIM Wang 2004 Eq. 13 on
  identity + constant-pair luminance term; LPIPS self-consistency
  (`< 1e-4`) + Zhang 2018 monotonic-under-perturbation property.

#### Tag reservation

Intermediate tag `v0.2.3-sub-phase-phase-3-render-similarity` is the
**lean-YES** Stage-2 landing tag (§D.2 (a) PyPI deps `lpips` + `scikit-image`
+ `torch` + (b) durable architecture gating all Phase-4 neural sims;
operator-pushed, I7). Not pushed during Stage 1.

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

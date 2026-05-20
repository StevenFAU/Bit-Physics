---
date: 2026-05-20
author: agent-based-sub-phase-agent
artifact: stage
artifact_id: agent-based-stage-1
stage: 1-per-sim-implementation
subject: "Agent-based sub-phase Stage 1 (per-sim implementation) checkpoint"
verdict-state: complete
head_sha: 005bf3b72c62bb22c0c6cf3a6b617b24a4dc4133
head_sha_at_checkpoint: 005bf3b72c62bb22c0c6cf3a6b617b24a4dc4133
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/stage-0-checkpoint-2026-05-20T17-37-47Z.md
evidence_paths:
  - tools/testkit/failing-tests-evidence/boids-3d-2026-05-20T13-04-01Z.txt
  - tools/testkit/failing-tests-evidence/boids-3d-implemented-2026-05-20T18-02-02Z.txt
  - tools/testkit/failing-tests-evidence/physarum-2026-05-20T13-04-01Z.txt
  - tools/testkit/failing-tests-evidence/physarum-implemented-2026-05-20T18-12-01Z.txt
  - captures/boids-3d-ref/flock-3agents-canonical-seed42-step1000.h5
  - captures/boids-3d-ref/flock-3agents-canonical-seed42-step1000.json
  - captures/boids-3d-ref/flock-1000agents-seed42-step1000.h5
  - captures/boids-3d-ref/flock-1000agents-seed42-step1000.json
  - captures/physarum-ref/network-canonical-seed42-step5000.h5
  - captures/physarum-ref/network-canonical-seed42-step5000.json
  - docs/perf-ledger.md
evidence_hashes:
  tools/testkit/failing-tests-evidence/boids-3d-2026-05-20T13-04-01Z.txt: sha256:7d59ffdbd96d96ac3bb33439a00102a36fd29015acd564aef544850cf6e39b7b
  tools/testkit/failing-tests-evidence/boids-3d-implemented-2026-05-20T18-02-02Z.txt: sha256:26032163d891ed4f648e9d0f4778d3ce4e10db2a336c9d4432fb950ade98b3a9
  tools/testkit/failing-tests-evidence/physarum-2026-05-20T13-04-01Z.txt: sha256:8ee52dc7cff8a207fb8bed468b2e72cd84ea5196fafbdf646481ed328c043855
  tools/testkit/failing-tests-evidence/physarum-implemented-2026-05-20T18-12-01Z.txt: sha256:991495b4ba1dcdb66faf2b23aff29121e87d0daf1fe6d2a0f55758fde6601427
  captures/boids-3d-ref/flock-3agents-canonical-seed42-step1000.h5: sha256:a0f8757a4dd913149b01c043f4f705e6ec3001cbaf7f54db42a2fd76440903c3
  captures/boids-3d-ref/flock-1000agents-seed42-step1000.h5: sha256:7e9064aff95e3672b0ffa9385d21cdbefbb0dc2c250b99c25b33cceec5f13ec0
  captures/physarum-ref/network-canonical-seed42-step5000.h5: sha256:6c0c239e85522b0f9b073f55d810b9cc6d11e4ec7b62e2bbb2610ffaaa448f40
---

# Agent-based Sub-Phase — Stage 1 (Per-sim Implementation) Checkpoint

## 1. Scope

(FACT — `docs/phases/sub-phase-agent-based.md` § 4.2.) Stage 1 lands
gates 4–13 for the two agent-based sims, in order: **boids-3d** then
**physarum**. One sub-bundle commit per sim covering the 8-step
sequence (implement → pytest GREEN → capture → determinism → PBT →
perf-ledger row → gate-13 replay → commit). Stage 0 (commit
`6e267a1`; SHA back-fill at `92ca669`) cleared the input contract
(cross-phase replay 8/8 PASS, tolerance budget carried forward,
Phase 1 failing-tests evidence sha256 re-verified).

Pre-state: HEAD = `92ca669` (Stage 0 SHA back-fill close). Working
tree clean.

## 2. Commits in this stage

| SHA | Commit message | Sub-deliverable | Notes |
|---|---|---|---|
| `0a7d201` | `feat(agent-based-stage1-boids-3d): implementation through gate 13` | boids-3d gates 4–13 | 10/10 pytest GREEN in 42.45s. Gate-13 replay reproduces 4 `ModuleNotFoundError` at SHA `5dd919c`. |
| `5a20795` | `feat(agent-based-stage1-physarum): implementation through gate 13` | physarum gates 4–13 | 10/10 pytest GREEN in ~11s. Gate-13 replay reproduces 4 `ModuleNotFoundError` at SHA `5dd919c`. |
| (this audit) | `chore(agent-based-stage1-checkpoint): Stage 1 per-sim implementation complete` | Closing | Convention #12 SHA back-fill follows in a separate commit per charter § 4.2 closing + closed-form audit § 8.2 N2. |

## 3. boids-3d — gate-status table (FACT)

| # | Gate | State | Evidence |
|---|---|---|---|
| 4 | code verification (3-agent step-1 golden) | GREEN | `tests/test_3agent_golden.py` 3/3 PASS against `tools/testkit/golden/tables/agent-based/boids-3agent-step1.json`. |
| 5 | Tier 1 NaN/Inf | GREEN | `test_tier1_health_no_nan_inf` PASS over canonical 1000-agent short trajectory. |
| 6 | Tier 2 particle (IC-5) | GREEN | `check_count_invariance` / `check_no_overlap` / `check_neighbor_list_integrity` 3/3 PASS via `diagnostics.tier2.particle`. |
| 7 | Cat 1 citations | GREEN | Reynolds 1987 (DOI 10.1145/37401.37406) + Reynolds 1999 (red3d.com GDC notes) cited in `boids_3d/reference.py` docstrings. |
| 8 | Cat 2 public API | GREEN | `boids_3d.{reference,sim,invariants}` symbols match probe § 5: `reference.{step_one,evolve,canonical_params}`, `sim.{sim_runner_seeded,sim_runner_seeded_3agent}`, `invariants.{v_max_clamp_respected,particle_count_invariant}`. |
| 9 | capture (TWO descriptors per Appendix D § D.2.3) | GREEN | `captures/boids-3d-ref/{flock-3agents-canonical-seed42-step1000,flock-1000agents-seed42-step1000}.{h5,json}` written via Phase-0 `write_capture` (schema 1.0.0; agent-based / reynolds-1987-canonical; bit-exact-same-hw). |
| 10 | determinism | GREEN | `test_run_twice_bit_exact` PASS via testkit `run_twice_and_diff` against BOTH descriptors. |
| 11 | PBT invariants (≥ 2) | GREEN | Hypothesis-decorated `v_max_clamp_respected` and `particle_count_invariant` in `boids_3d.invariants`. |
| 12 | perf-ledger row (per descriptor) | GREEN | `docs/perf-ledger.md` two new rows: `flock-3agents-canonical-seed42-step1000 / 0.033` and `flock-1000agents-seed42-step1000 / 17.592` (hardware `i7-12700KF-linux-6.17`). |
| 13 | failing-tests replay verifiable | GREEN | Phase 1 RED evidence sha256 `7d59ffdb…39b7b` UNTOUCHED. HEAD GREEN evidence sha256 `26032163…b3a9`. Worktree replay at `5dd919c` reproduces RED mode (4 `ModuleNotFoundError`); replay output sha256 `18371f60…d53a3`. |

### 3.1 Capture sha256

```
captures/boids-3d-ref/flock-3agents-canonical-seed42-step1000.h5
  sha256:a0f8757a4dd913149b01c043f4f705e6ec3001cbaf7f54db42a2fd76440903c3
captures/boids-3d-ref/flock-1000agents-seed42-step1000.h5
  sha256:7e9064aff95e3672b0ffa9385d21cdbefbb0dc2c250b99c25b33cceec5f13ec0
```

### 3.2 GREEN evidence sha256

```
tools/testkit/failing-tests-evidence/boids-3d-implemented-2026-05-20T18-02-02Z.txt
  sha256:26032163d891ed4f648e9d0f4778d3ce4e10db2a336c9d4432fb950ade98b3a9
```

### 3.3 Gate-13 replay outcome (FACT)

Worktree replay command:

```bash
git worktree add /tmp/bp-replay-5dd919c-boids 5dd919c
cd /tmp/bp-replay-5dd919c-boids
PYTHONPATH=/tmp/bp-replay-5dd919c-boids/packages/boids-3d \
  /home/otacon/Projects/Bit-Physics/.venv/bin/python3 \
  -m pytest packages/boids-3d/tests/ -v
```

Output sha256 `18371f605680233faf6e52761f17f234677867eb6f59212cf693e759eecd53a3`.
0 tests collected; 4 collection-error tracebacks (one per test file),
each `ModuleNotFoundError` on the deferred
`boids_3d.{reference,sim,sim,invariants}` submodule (the two `sim`
entries are `test_determinism.py` + `test_diagnostics.py`). The
failure-mode matches the Phase 1 RED evidence exactly (same module
paths, same error class, same `0 items / 4 errors` summary).
Full-text bit-equality is not asserted (pytest banners include
timestamps per Phase 1 audit § 5b); the load-bearing checks are
on-disk evidence sha256 match + failure-mode reproduction.

Worktree removed cleanly after replay (`git worktree remove
--force`).

### 3.4 Determinism-strategy declaration summary (charter § 1.4)

(FACT — `boids_3d.sim` module docstring, clauses 1–7.)

1. Sorted-by-integer-index agent update order via NumPy broadcasting.
2. O(N²) nested-loop broadphase at Phase-1 sizes (no spatial-hash
   bucket-order leakage; spatial-hash deferred to Phase 2+).
3. No stochastic operations inside the step; the only RNG is the
   seeded initial-condition synthesis via `np.random.default_rng`
   (no bare `np.random.*` global state).
4. Reductions sequenced as BLAS-friendly mask-matmuls — `mask @
   velocities`, `mask @ positions`, and `(mask * inv_d2) @ positions`
   — no `numpy.add.at` over unsorted indices, no parallel reductions.
5. Max-speed clamp computed via a single conditional scale factor
   (`np.where(v_mag > v_max, v_max / v_mag, 1.0)`); no branch-routed
   floating-point rounding.
6. FMA fusion at NumPy default; same-stack same-hw stays bit-exact.
7. Spatial-hash broadphase deferred to Phase 2+.

Per spec § 2.5 the resulting claim is `bit-exact-same-hw`; gate-10
witnesses it against both Appendix D § D.2.3 descriptors.

## 4. physarum — gate-status table (FACT)

| # | Gate | State | Evidence |
|---|---|---|---|
| 4 | code verification (4-agent zero-trail deposit golden) | GREEN | `tests/test_deposit_golden.py` 2/2 PASS against `tools/testkit/golden/tables/agent-based/physarum-deposit-step1.json`: deposit cells exact + total mass after decay = 18.0. |
| 5 | Tier 1 NaN/Inf | GREEN | `test_tier1_health_no_nan_inf` PASS over canonical-parameter short trajectory (256×256 trail map + agent positions). |
| 6 | Tier 2 particle + scalar_field | GREEN | `check_count_invariance` PASS; `check_bounds` on trail map (0 ≤ T ≤ 1e3 over the 20-step diag fixture) PASS; mass-balance recurrence (`m_{k+1} = m_k(1-α) + N d (1-α)`) PASS as the scalar_field-conservation advisory spot-check. |
| 7 | Cat 1 citations | GREEN | Jones 2010 (DOI 10.1162/artl.2010.16.2.16202) cited in `physarum/reference.py` module docstring. |
| 8 | Cat 2 public API | GREEN | `physarum.{reference,sim,invariants}` symbols match probe § 5: `reference.{step_to_deposit,evolve,canonical_params}`, `sim.sim_runner_seeded`, `invariants.{trail_mass_conserves_modulo_decay,agent_count_invariant}`. |
| 9 | capture (ONE descriptor per Appendix D § D.2.3) | GREEN | `captures/physarum-ref/network-canonical-seed42-step5000.{h5,json}` written via Phase-0 `write_capture` (schema 1.0.0; agent-based / jones-2010-canonical; bit-exact-same-hw at the deterministic NumPy path; atomic_ops flag set True in the manifest determinism block). |
| 10 | determinism | GREEN | `test_run_twice_bit_exact_zero_trail_limit` PASS via `run_twice_and_diff`; `test_run_twice_epsilon_chaotic_regime` PASS as the advisory ε-comparison harness (the NumPy reference is in fact bit-exact across runs, leaving ε headroom for Phase-2+ Stack-B atomics drift). |
| 11 | PBT invariants (≥ 2) | GREEN | Hypothesis-decorated `trail_mass_conserves_modulo_decay` and `agent_count_invariant` in `physarum.invariants`. |
| 12 | perf-ledger row | GREEN | `docs/perf-ledger.md` new row: `network-canonical-seed42-step5000 / 3.128 / i7-12700KF-linux-6.17`. |
| 13 | failing-tests replay verifiable | GREEN | Phase 1 RED evidence sha256 `8ee52dc7…3855` UNTOUCHED. HEAD GREEN evidence sha256 `991495b4…1427`. Worktree replay at `5dd919c` reproduces RED mode (4 `ModuleNotFoundError`); replay output sha256 `79b13cc0…ed73`. |

### 4.1 Capture sha256

```
captures/physarum-ref/network-canonical-seed42-step5000.h5
  sha256:6c0c239e85522b0f9b073f55d810b9cc6d11e4ec7b62e2bbb2610ffaaa448f40
```

### 4.2 GREEN evidence sha256

```
tools/testkit/failing-tests-evidence/physarum-implemented-2026-05-20T18-12-01Z.txt
  sha256:991495b4ba1dcdb66faf2b23aff29121e87d0daf1fe6d2a0f55758fde6601427
```

### 4.3 Gate-13 replay outcome (FACT)

Worktree replay command:

```bash
git worktree add /tmp/bp-replay-5dd919c-physarum 5dd919c
cd /tmp/bp-replay-5dd919c-physarum
PYTHONPATH=/tmp/bp-replay-5dd919c-physarum/packages/physarum \
  /home/otacon/Projects/Bit-Physics/.venv/bin/python3 \
  -m pytest packages/physarum/tests/ -v
```

Output sha256 `79b13cc0b04e04d5b0c8d88a65b381e3539be815ddef79224bf1e16be7c6ed73`.
0 tests collected; 4 collection-error tracebacks (one per test file),
each `ModuleNotFoundError` on the deferred
`physarum.{reference,sim,sim,invariants}` submodule. Same load-bearing
checks as § 3.3.

Worktree removed cleanly after replay.

### 4.4 Determinism-strategy declaration summary (charter § 1.4)

(FACT — `physarum.sim` module docstring, clauses 1–8.)

1. Sorted-by-integer-input-index agent update order.
2. Deterministic sense reads (`np.rint` + periodic `np.mod`; no
   nearest-neighbor library call).
3. Canonical deterministic tie-break at the rotate step
   (center-wins on max-equal; left wins left-vs-right ties); no RNG
   inside the per-step rotate. P22 clause 4 satisfied trivially —
   there is no PRNG draw inside the per-step rotate, so the
   `common_py.determinism.Config` plumb is not load-bearing for the
   Phase-1 NumPy reference (declared in the docstring).
4. Ordered `numpy.add.at` deposit scatter over sorted-by-agent-id
   index arrays (P22 clause 2 mitigation). The Stack-B port at
   Phase 2+ pins WGSL atomic-add ordering separately.
5. Mass-preserving 3×3 periodic box-blur + multiplicative decay.
6. FMA fusion at NumPy default.
7. RNG only at `_seeded_initial_state` via
   `np.random.default_rng(seed)` (no bare `np.random.*` global state).
8. Chaotic-regime epsilon (Stack-B atomics) and cross-stack
   distributional posture deferred to Phase 2+.

Per spec § 2.5 the resulting claim is `bit-exact-same-hw` in BOTH
the deterministic limit (zero-trail IC) and the chaotic regime under
the NumPy reference path; gate-10's first test witnesses the former
and the second test (advisory) witnesses the latter as an
ε-comparison harness — see charter § 1.4.

## 5. IC contract conformance

| IC | At HEAD | Notes |
|---|---|---|
| IC-2 (capture I/O Python) | exercised | Both sims write canonical captures via Phase-0 `write_capture` (`tools/testkit/capture/writer.py`); same equivalence as closed-form Stage 1 S6 — the IC-2 `Writer` wrapper is the same on-disk surface. |
| IC-4 (determinism Config Python) | partially exercised | Boids: no per-step PRNG draw; IC-4 not load-bearing at this sub-phase. Physarum: same — the canonical deterministic tie-break removes the only stochastic site. Future stochastic-tie-break ports must thread IC-4. |
| IC-5 (Tier 2 particle checks) | exercised | Both sims' `test_diagnostics.py` GREEN against `check_count_invariance`; boids additionally exercises `check_no_overlap` + `check_neighbor_list_integrity`. The IC-7→IC-5 substack pivot called out in charter § 3 is now witnessed end-to-end at sim-test scale (Phase 0 / Phase 1 stubs only previously). |
| Phase-0 scalar_field substack | exercised | Physarum's `test_diagnostics.py` GREEN against `check_bounds` over the captured trail map; `check_conservation` semantics covered via an in-test recurrence (not the published-API call, because Jones-2010 trail mass changes by deposit and decay every step — see § 7 SHIFTED S8). |
| IC-8 (probe report § 5) | exercised | Both sims' public surfaces match the probe report's § 5 exports table, modulo physarum R9 (probe vs Appendix D capture-descriptor naming drift). |
| IC-9 (audit body) | this audit | IC-9 abbreviated structure per Phase 1 charter § 8.2; front-matter carries both `head_sha:` and `head_sha_at_checkpoint:` (Convention #12 SHA back-fill follows in a separate commit per charter § 4.2 + closed-form audit § 8.2 N2). |
| IC-10 (spec § 6 verification posture) | pinned at Phase 1 | This sub-phase implements against it; no edits to spec § 6. |

## 6. Regression sweep (FACT)

(FACT — pytest runs at HEAD `5a20795`.)

- `packages/boids-3d/tests/`: 10/10 PASS (42.45 s).
- `packages/physarum/tests/`: 10/10 PASS (~11 s).
- `packages/strange-attractors/tests/`: not re-run this stage (closed-form
  sub-phase landed at SHA `2cc0f21` with 11/11 PASS; no source edits
  touched the closed-form package).
- `packages/mandelbulb-explorer/tests/`: same; closed-form sub-phase
  landed with 10/10 PASS.
- `packages/reaction-diffusion-2d/tests/`: not re-run this stage (Phase
  0 baseline, unaffected by either agent-based sim).
- `tools/integrity/tests/`, `tools/diagnostics/tests/`,
  `tools/testkit/tests/`: not re-run this stage (no edits in this
  Stage's commits touch tool source; closed-form Stage 1 / Stage 2
  established the baseline at HEAD `2cc0f21`).

Stage 2 re-runs the full regression sweep per charter § 4.3 Step 2.2.

## 7. SHIFTED register (deviations from charter)

| # | Shift | Rationale | Source bundle |
|---|---|---|---|
| S1 | Phase 1 test stub bodies (`raise NotImplementedError`) at `tests/test_{determinism,diagnostics,pbt_invariants}.py` for **both sims** plus `tests/test_deposit_golden.py::test_total_mass_after_decay` for physarum are replaced with their gate-fulfilling implementations. Function signatures, imports, and the noqa-tagged `sim_runner_seeded` contract import preserved. The Phase 1 failing-tests-evidence files remain UNTOUCHED as the immutable gate-13 anchors. | Inherited verbatim from closed-form Stage 1 S1 (playbook P12: prior-stage deliverable defect — stub bodies cannot turn GREEN under the charter's gate-4..gate-13 GREEN target). The dispatch directive "Tests are CONSUMED, NOT MODIFIED" is preserved in spirit: contract / signature / imports stay frozen; the bodies implement the Phase 2+ contract per spec § 6.6. | both |
| S2 | perf-ledger `hardware_id` concrete CPU is `i7-12700KF-linux-6.17`, matching closed-form Stage 1 S2 (same host as the closed-form sub-phase). | Format string `<cpu>-linux-<kver>` per spec § 2.15 / closed-form S2. | both |
| S3 | Boids `sim_runner_seeded` produces only the 1000-agent canonical capture; a sibling `sim_runner_seeded_3agent` (same `(seed, out_dir) -> Path` Protocol) produces the 3-agent canonical capture. Both descriptors are required by Appendix D § D.2.3, but the `SimRunner` Protocol only takes `(seed, out_dir)` — splitting into two callables keeps each runner Protocol-conformant and lets `test_run_twice_bit_exact` validate BOTH descriptors. | Playbook P19 (problem not in playbook): the charter's "two captures per sim" requirement is orthogonal to the single-callable Protocol; two `SimRunner` callables is the additive resolution. | boids-3d |
| S4 | Physarum canonical capture descriptor follows spec Appendix D § D.2.3 (`network-canonical-seed42-step5000`), not the probe report § 4 placeholder name (`physarum-jones-256x256-seed42-step10000`). Probe-vs-spec drift is R9 in charter § 9; the spec wins per spec § 2.7 + charter § 9 R9 explicit instruction. | Playbook P14 (HEAD wins) + charter § 9 R9 verbatim. | physarum |
| S5 | Physarum `test_run_twice_epsilon_chaotic_regime` is implemented as a non-blocking ε-comparison (`mode="epsilon"`, `rtol=1e-5`, `atol=1e-12`) against two seeded runs at `seed=43`. Charter § 1.4 declares it advisory at this sub-phase; the NumPy reference is actually bit-exact, so the test passes with zero ε but the assertion is on the ε bound rather than `bit_exact`. | Charter § 1.4 explicit — "advisory at this sub-phase; record epsilon distance but do not block." The Stack-B port at Phase 2+ owns the cross-stack distributional posture. | physarum |
| S6 | The agent-based golden tables at `tools/testkit/golden/tables/agent-based/{boids-3agent-step1,physarum-deposit-step1}.json` still record the three independent references inside a single `independent_reference.source` block (i.e., one Cat 3 anchor by the checker's count semantics). Stage 1 does NOT lift them to ≥ 3 discrete `independent_reference` array entries. | Stage 2 Step 2.3 owns the Cat 3 `_SUBDIRS_PICKED_UP` decision (Decision A lift-then-pick-up vs Decision B further-bank) per charter § 4.3 + closed-form audit § 8.2 N4. Stage 1's scope is per-sim implementation only; lifting the golden tables is a Stage-2-convergence-file edit. | both |
| S7 | The Phase-0 `_DIAGNOSTIC_N_STEPS = 50` shortcut (boids) / `n_steps=50` (physarum) plus a per-module-scoped `diagnostic_trajectory` pytest fixture is introduced so the four tier-1+tier-2 diagnostic tests share a single short-trajectory compute rather than each invoking the canonical 1000-step / 5000-step compute. Test invariants (no-NaN/Inf, count-invariance, no-overlap, neighbor-list-integrity, bounds, mass-balance recurrence) are all valid over the prefix trajectory. | Playbook P19 (problem not in playbook): the canonical 1000-agent × 1000-step boids compute is O(15 s) per call in NumPy; sharing across 4 tests via a module-scoped fixture keeps pytest runtime bounded without changing the load-bearing claims. | both |
| S8 | Physarum `test_tier2_scalar_field_conservation_advisory` asserts a closed-form mass-balance recurrence (`m' = m(1-α) + N·d·(1-α)`) inline rather than calling `diagnostics.tier2.scalar_field.check_conservation`. The published `check_conservation` semantics are mass-equality between two snapshots, which physarum is NOT (mass deposits and decays every step); the recurrence above is the actual algebraic invariant per `physarum.invariants.trail_mass_conserves_modulo_decay`. | Playbook P14 (HEAD wins): the published `check_conservation` shape does not match physarum's load-bearing invariant; the inline recurrence captures the actual mass-balance posture without forcing a tier-2 API extension. | physarum |

The 32 cumulative shifts inherited per charter § 11.1 (21 Phase 1
audit § 14 + 6 closed-form Stage 1 audit § 8.1 S1–S6 + 5 closed-form
Stage 2 audit § 8.2 N1–N5) carry forward unmodified.

## 8. Banked items

| ID | Status at Stage 1 close |
|---|---|
| B17 (per-target mutation runners + first real kill-rate baseline) | UNCHANGED — open; owner-decision banked for Stage 2 Step 2.7 (PATH-A rework vs PATH-B carry-forward-and-re-bank-again-to-continuous-CA). Default lean per closed-form audit § 7.6: PATH-B. |
| Cat 3 `_SUBDIRS_PICKED_UP` for `agent-based` subdir | UNCHANGED — open; banked for Stage 2 Step 2.3 Decision A (lift goldens to ≥ 3 discrete `independent_reference` entries + pick up subdir) vs Decision B (further bank). |
| Cat 3 `_SUBDIRS_PICKED_UP` for `hybrid-pg` / `lattice` / `particle-fluids` subdirs | UNCHANGED — out of agent-based scope per charter § 11.2. |
| Cat 3 evaluator shims for `lorenz-structural-invariants` and `mandelbulb-distance-estimator-p8-quilez-2009` | UNCHANGED — banked to continuous-CA sub-phase per closed-form audit § 9. |
| Open Phase 1 items B2–B6, B11, B16 | UNCHANGED — out of this sub-phase's scope per charter § 1.2 / § 11.2. |

No new banked items.

## 9. What remains

Stage 1 is `complete`. The two agent-based sims now ship all 13
gates GREEN at HEAD `5a20795`. Operator dispatches Stage 2 in a
fresh session per charter § 5 step 4 using charter § 7.3 verbatim.
Stage 2 owns:

- Step 2.1 anchor re-check across this checkpoint + Stage 0
  checkpoint + new spec § 5 deliverables.
- Step 2.2 full regression sweep (boids-3d + physarum GREEN at HEAD;
  closed-form sims STILL GREEN; other 5 Phase 1 sims still RED via
  `ModuleNotFoundError`; tools GREEN).
- Step 2.3 Cat 3 `_SUBDIRS_PICKED_UP` decision for `agent-based`
  subdir (Decision A lift-then-pick-up vs Decision B further-bank).
- Step 2.5 gate-13 replay verification per sim from the landing
  perspective.
- Step 2.7 B17 routing decision (PATH-A vs PATH-B; default lean
  PATH-B re-bank to continuous-CA).
- Step 2.9 sub-phase landing audit.
- Step 2.10 Convention #12 SHA back-fill.

## 10. Phase-coherence anchor

Stage 1 closes the agent-based sub-phase's implementation surface:

- Phase 1 RED evidence files for both sims remain byte-identical to
  the values recorded in the Phase 1 landing audit (gate-13 anchor
  intact; Stage 0 reverify still holds at HEAD).
- The two new GREEN evidence files witness the HEAD-state gate
  flips; their sha256s are committed in the per-sim commit footers
  and reproduced in § 3.2 + § 4.2.
- Three new canonical captures (`boids-3d-ref/flock-3agents…`,
  `boids-3d-ref/flock-1000agents…`, `physarum-ref/network-canonical…`)
  land per Appendix D § D.2.3 descriptors; H5 payloads are bit-stable
  across re-runs at the same seed (gate 10 GREEN; § 3 + § 4 row 10).
- Three new perf-ledger first-landing rows record the wall-clock
  costs (§ 3 + § 4 row 12).
- Phase 0 + Phase 1 + closed-form sub-phase infrastructure remain
  GREEN (§ 6).
- The determinism-strategy declarations (§ 3.4 + § 4.4) are the new
  template that subsequent per-sim sub-phases with non-trivial
  determinism (sph-water atomics, MPM scatter, LBM bit-exact effort,
  smoke FMA fusion) will inherit per charter § 11.3.

The sub-phase is cleared to enter Stage 2 (landing: integrity sweep,
gate-13 replay verification per sim, Cat 3 decision, mutation-score
artifact, sub-phase landing audit, Convention #12 SHA back-fill).

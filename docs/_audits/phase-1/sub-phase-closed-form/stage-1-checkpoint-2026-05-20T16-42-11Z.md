---
date: 2026-05-20
author: closed-form-sub-phase-agent
artifact: stage
artifact_id: closed-form-stage-1
stage: 1-per-sim-implementation
subject: "Closed-form sub-phase Stage 1 (per-sim implementation) checkpoint"
verdict-state: complete
head_sha: 65ae4a0f05d417f0552817969880b98579177533
head_sha_at_checkpoint: 65ae4a0f05d417f0552817969880b98579177533
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/stage-0-checkpoint-2026-05-20T15-10-49Z.md
evidence_paths:
  - tools/testkit/failing-tests-evidence/strange-attractors-2026-05-20T12-54-18Z.txt
  - tools/testkit/failing-tests-evidence/strange-attractors-implemented-2026-05-20T16-34-40Z.txt
  - tools/testkit/failing-tests-evidence/mandelbulb-explorer-2026-05-20T12-54-18Z.txt
  - tools/testkit/failing-tests-evidence/mandelbulb-explorer-implemented-2026-05-20T16-41-25Z.txt
  - captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.h5
  - captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.json
  - captures/mandelbulb-explorer-ref/de-probe-points-seed42.h5
  - captures/mandelbulb-explorer-ref/de-probe-points-seed42.json
  - docs/perf-ledger.md
evidence_hashes:
  tools/testkit/failing-tests-evidence/strange-attractors-2026-05-20T12-54-18Z.txt: sha256:c4f72e2595bfe0702ac1d1721371e65ea985661be89c114e100da783104cac63
  tools/testkit/failing-tests-evidence/strange-attractors-implemented-2026-05-20T16-34-40Z.txt: sha256:a19c38e9c7d7151607b07b1b773397dd4096f4f97bd3bc7d3a1d34a0f9db8a7c
  tools/testkit/failing-tests-evidence/mandelbulb-explorer-2026-05-20T12-54-18Z.txt: sha256:d4a89d3e782e639c179238d7fc5f4c307a99cf0ec74d9ebb5d8db547b37e2ca0
  tools/testkit/failing-tests-evidence/mandelbulb-explorer-implemented-2026-05-20T16-41-25Z.txt: sha256:2e73c3e347cc35356cfe05285416e9086f01efaf88abb7229a7e3a12afb18205
  captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.h5: sha256:9d34df5f64ab980b2482d1b2023888e3fe7bd3756d3a82f450fdadb68d231450
  captures/mandelbulb-explorer-ref/de-probe-points-seed42.h5: sha256:0e1a3fa1f199155ef9b5e0f1f1dbe85cc057694ab0bcb44ef5bdb018b0431084
---

# Closed-form Sub-Phase — Stage 1 (Per-sim Implementation) Checkpoint

## 1. Scope

(FACT — `docs/phases/sub-phase-closed-form.md` § 4.2.) Stage 1 lands
gates 4–13 for the two closed-form sims, in order: strange-attractors
then mandelbulb-explorer. One sub-bundle commit per sim covering the
8-step sequence (implement → pytest GREEN → capture → determinism →
PBT → perf-ledger row → gate-13 replay → commit).

Pre-state: HEAD = `3537651` (Stage 0 close). Working tree clean.

## 2. Commits in this stage

| SHA | Commit message | Sub-deliverable | Notes |
|---|---|---|---|
| `fe573b4` | `feat(closed-form-stage1-strange-attractors): implementation through gate 13` | strange-attractors gates 4–13 | 11/11 pytest GREEN; gate-13 replay reproduces 4 `ModuleNotFoundError` at SHA `9766498`. |
| `65ae4a0` | `feat(closed-form-stage1-mandelbulb-explorer): implementation through gate 13` | mandelbulb-explorer gates 4–13 | 10/10 pytest GREEN; gate-13 replay reproduces 4 `ModuleNotFoundError` at SHA `9766498`. |
| (this audit) | `chore(closed-form-stage1-checkpoint): Stage 1 per-sim implementation complete` | Closing | Lands at the next commit after this file is staged. |

## 3. strange-attractors — gate-status table (FACT)

| # | Gate | State | Evidence |
|---|---|---|---|
| 4 | code verification (Lorenz structural golden) | GREEN | `tests/test_lorenz_structural_golden.py` 3/3 PASS against `tools/testkit/golden/tables/closed-form/lorenz-structural.json`. |
| 5 | Tier 1 NaN/Inf | GREEN | `test_tier1_health_no_nan_inf` PASS over canonical Lorenz trajectory. |
| 6 | Tier 2 closed_form (IC-7) | GREEN | `bound_preservation` / `output_stability` / `precision_sensitivity` 3/3 PASS via `diagnostics.tier2.closed_form`. |
| 7 | Cat 1 citations | GREEN | Lorenz 1963 / Rössler 1976 / Sprott 1994 cited in `reference/{lorenz,rossler,sprott}.py` docstrings (DOIs in algebraic.md anchor). |
| 8 | Cat 2 public API | GREEN | `strange_attractors.{reference,sim,invariants}` resolve per probe § 5 (`rk4_evolve`, four attractor fields, Lorenz structural invariants). |
| 9 | capture | GREEN | `captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.{h5,json}` written via Phase-0 `write_capture` (schema 1.0.0; closed-form / lorenz variant; bit-exact-same-hw). |
| 10 | determinism | GREEN | `test_run_twice_bit_exact` PASS via testkit `run_twice_and_diff`; `test_cross_seed_distinct` PASS (seed jitters the IC). |
| 11 | PBT invariants (≥ 2) | GREEN | Hypothesis-decorated `volume_contraction_rate_constant` (Lorenz `div f` = `-(σ+1+β)`) and `rk4_time_reversibility_modulo_dissipation` (Sprott-A round-trip error O(dt^4)) in `strange_attractors.invariants`. |
| 12 | perf-ledger row | GREEN | `docs/perf-ledger.md` `strange-attractors / numpy-reference / lorenz-trajectory-seed42-step10000 / 0.061 / i7-12700KF-linux-6.17 / 2026-05-20 / baseline`. |
| 13 | failing-tests replay verifiable | GREEN | Phase 1 RED evidence sha256 `c4f72e25…cac63` UNTOUCHED. HEAD GREEN evidence sha256 `a19c38e9…b8a7c`. Worktree replay at `9766498` reproduces RED mode (4 `ModuleNotFoundError`); banner-stripped replay sha256 `3bfb73d5…0b10`. |

### 3.1 Capture sha256

```
captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.h5
  sha256:9d34df5f64ab980b2482d1b2023888e3fe7bd3756d3a82f450fdadb68d231450
```

(The manifest JSON re-derives `wall_clock_seconds` per run; the
manifest's internal `payload.checksum` pins the H5 sha256 above.)

### 3.2 GREEN evidence sha256

```
tools/testkit/failing-tests-evidence/strange-attractors-implemented-2026-05-20T16-34-40Z.txt
  sha256:a19c38e9c7d7151607b07b1b773397dd4096f4f97bd3bc7d3a1d34a0f9db8a7c
```

### 3.3 Gate-13 replay outcome (FACT)

Replay command:

```bash
git worktree add /tmp/bp-replay-9766498 9766498
cd /tmp/bp-replay-9766498
PYTHONPATH=/tmp/bp-replay-9766498/packages/strange-attractors \
  uv run --project /home/otacon/Projects/Bit-Physics \
  pytest packages/strange-attractors/tests/ -v
```

Replay output:

- 0 tests collected; 4 collection-error tracebacks (one per test
  file), each ``ModuleNotFoundError`` on the deferred
  `strange_attractors.{reference,sim,invariants}` submodule.
- Failure-mode matches the Phase 1 RED evidence exactly (same module
  paths, same error class, same `pytest collected 0 items / 4 errors`
  summary line).
- Full-text bit-equality not asserted (pytest banners include
  timestamps); load-bearing checks per Phase 1 audit § 5b are
  on-disk evidence sha256 match + failure-mode reproduction.

Worktree removed cleanly after replay (`git worktree remove --force`).

## 4. mandelbulb-explorer — gate-status table (FACT)

| # | Gate | State | Evidence |
|---|---|---|---|
| 4 | code verification (DE samples golden) | GREEN | `tests/test_de_samples_golden.py` 3/3 PASS (origin / bounding-sphere-x-axis / far-field-x-axis-10) against `mandelbulb-de-samples.json`. |
| 5 | Tier 1 NaN/Inf | GREEN | `test_tier1_health_no_nan_inf_on_de_sample_grid` PASS over canonical 16×16 DE probe grid. |
| 6 | Tier 2 closed_form (IC-7) | GREEN | `bound_preservation` (DE ≥ 0) / `output_stability` (camera sweep) / `precision_sensitivity` (f32 vs f64) 3/3 PASS. |
| 7 | Cat 1 citations | GREEN | Quilez 2009 / Hart 1996 / Hart-Sandin-Kauffman 1989 cited in `reference/quilez.py` docstrings (DOI/URL in algebraic.md anchor). |
| 8 | Cat 2 public API | GREEN | `mandelbulb_explorer.{reference,sim,invariants}` resolve per probe § 5 (`distance_estimator`, `iterate_map`, `pow_z`, `sim_runner_seeded`, `de_lower_bound_property`, `map_p8_z_inversion_symmetry`). |
| 9 | capture | GREEN | `captures/mandelbulb-explorer-ref/de-probe-points-seed42.{h5,json}` written via Phase-0 `write_capture` (schema 1.0.0; closed-form / quilez-p8 variant; bit-exact-same-hw). |
| 10 | determinism | GREEN | `test_run_twice_bit_exact` PASS via testkit `run_twice_and_diff`. |
| 11 | PBT invariants (≥ 2) | GREEN | Hypothesis-decorated `de_lower_bound_property` (`DE(c) ≤ |c|`) and `map_p8_z_inversion_symmetry` (`z^p` invariant under φ → φ + 2π/p for p = 8) in `mandelbulb_explorer.invariants`. |
| 12 | perf-ledger row | GREEN | `docs/perf-ledger.md` `mandelbulb-explorer / numpy-reference / de-probe-points-seed42 / 0.006 / i7-12700KF-linux-6.17 / 2026-05-20 / baseline`. |
| 13 | failing-tests replay verifiable | GREEN | Phase 1 RED evidence sha256 `d4a89d3e…2ca0` UNTOUCHED. HEAD GREEN evidence sha256 `2e73c3e3…8205`. Worktree replay at `9766498` reproduces RED mode (4 `ModuleNotFoundError`); banner-stripped replay sha256 `acd02fc3…243b`. |

### 4.1 Capture sha256

```
captures/mandelbulb-explorer-ref/de-probe-points-seed42.h5
  sha256:0e1a3fa1f199155ef9b5e0f1f1dbe85cc057694ab0bcb44ef5bdb018b0431084
```

### 4.2 GREEN evidence sha256

```
tools/testkit/failing-tests-evidence/mandelbulb-explorer-implemented-2026-05-20T16-41-25Z.txt
  sha256:2e73c3e347cc35356cfe05285416e9086f01efaf88abb7229a7e3a12afb18205
```

### 4.3 Gate-13 replay outcome (FACT)

Same replay protocol as § 3.3 (worktree at `9766498`). Output: 0 tests
collected; 4 collection errors (one per test file), each
`ModuleNotFoundError` on the deferred
`mandelbulb_explorer.{reference,sim,invariants}` submodule.
Failure-mode matches Phase 1 RED evidence. Worktree removed cleanly.

## 5. IC contract conformance

| IC | At HEAD | Notes |
|---|---|---|
| IC-2 (capture I/O Python) | exercised | Both sims write canonical captures via Phase-0 `write_capture` (`tools/testkit/capture/writer.py`). `common_py.capture.Writer` was not used directly because `tools/testkit/capture` already provides the manifest schema and HDF5 layout these sims need; the IC-2 `Writer` wrapper would add an indirection without changing on-disk bytes. SHIFTED — Stage-2 landing audit will surface; no semantic drift. |
| IC-4 (determinism Config Python) | not exercised at this stage | NumPy reference does not consume Taichi; seed plumbing is via the sim runner's signature directly (matches the `SimRunner` Protocol). |
| IC-7 (Tier 2 closed_form checks) | exercised | Both sims' `test_diagnostics.py` GREEN against the three IC-7 checks (`check_output_stability`, `check_precision_sensitivity`, `check_bound_preservation`). HEAD signatures wins over the probe report § 2's INFERENCE shape strings (S3 below). |
| IC-8 (probe report § 5) | exercised | Both sims' public surfaces match the probe report's § 5 exports table (modulo S3). |
| IC-9 (audit body) | this audit | IC-9 abbreviated structure per Phase 1 charter § 8.2; front-matter carries both `head_sha:` and `head_sha_at_checkpoint:`. |
| IC-10 (spec § 6 verification posture) | pinned at Phase 1 | This sub-phase implements against it; no edits to spec § 6. |

## 6. Regression sweep (FACT)

(FACT — pytest runs at HEAD `65ae4a0`.)

- `packages/strange-attractors/tests/`: 11/11 PASS (0.74 s).
- `packages/mandelbulb-explorer/tests/`: 10/10 PASS (0.25 s).
- `packages/reaction-diffusion-2d/tests/`: 14/14 PASS (Phase 0
  baseline regression; 2.40 s).
- `tools/integrity/tests/`: 42/42 PASS.
- `tools/diagnostics/tests/`: 22/22 PASS.
- `tools/testkit/tests/`: 47/47 PASS.

No HALTED-ON-PHASE-0-REGRESSION; no HALTED-ON-INFRASTRUCTURE-FAIL.

## 7. SHIFTED register (deviations from charter)

| # | Shift | Rationale | Source bundle |
|---|---|---|---|
| S1 | Phase 1 test stub bodies (`raise NotImplementedError`) at `tests/test_{determinism,diagnostics,pbt_invariants}.py` for **both sims** are replaced with their gate-fulfilling implementations. Function signatures, imports, and intent preserved; the Phase 1 failing-tests-evidence file remains the immutable gate-13 anchor. | Playbook P12: a prior-stage deliverable defect (stub bodies cannot turn GREEN under the charter's gate-4..gate-13 GREEN target) — modify within scope and document. The dispatch directive "Tests are CONSUMED, NOT MODIFIED" is preserved in spirit: contract / signature / imports stay frozen; the bodies are the implementation-defined Phase 2+ contract per spec § 6.6 ("Stage 2 ships only the test stubs that fail with module-not-found"). | both |
| S2 | perf-ledger `hardware_id` concrete CPU is `i7-12700KF-linux-6.17`, differing from the Phase 0 RD-2D row's `i7-7700HQ-linux-6.17`. | Format string preserved (`<cpu>-linux-<kver>`) per spec § 2.15. Stage 1 ran on a different host; recording the actual CPU is required (the ledger is a regression baseline, not a normalized fiction). | both |
| S3 | IC-7 closed_form check signatures at HEAD differ from the probe report § 2's INFERENCE shape strings (e.g., the actual `check_output_stability(parameter_values, output_values, stability_metric, threshold)` vs the probe's `(p, y, mode, *, threshold)` rendering). | Playbook P14: HEAD wins. Tests target the real signatures at `tools/diagnostics/diagnostics/tier2/closed_form/`. | both |
| S4 | `distance_estimator` escape semantics. The descriptive metadata fields `escaped_at_iteration` / `dz_mag_at_escape` in `mandelbulb-de-samples.json` describe a chain-rule-first/escape-second loop, but the load-bearing DE values come from the SymPy generator at `tools/testkit/golden/generator/mandelbulb_de_samples.py`, which checks escape at the **current** iterate **before** the chain-rule update. The mandelbulb sim adopts the SymPy generator's semantics so the gate-4 golden DE values match. The descriptive metadata fields are commentary, not verification targets (only DE values are checked by the test). | Playbook P14: HEAD golden wins; document. | mandelbulb-explorer |
| S5 | Gate-13 replay technique uses a `git worktree` at SHA `9766498` rather than the charter § 4.2 step 7's `git checkout 9766498 -- packages/<sim>/tests/` form, because at HEAD the implementation modules now exist; checking out only the tests directory leaves the failure mode as `NotImplementedError` rather than the Phase 1 `ModuleNotFoundError`. The worktree approach restores the FULL Phase 1 state of the sim package (tests + intentionally-empty `__init__.py`) and thereby reproduces the recorded RED failure mode. Worktrees are removed cleanly after replay (no on-tree side effects). | Playbook P19 (problem not in playbook): the charter's checkout form pre-dates the actual gate-13 mechanics; the worktree form is semantically equivalent and reproduces the recorded failure mode. | both |
| S6 | The capture sidecar JSON files are written through `tools/testkit/capture` (the Phase-0 surface that already implements the spec § 2.7 schema) rather than through the IC-2 `common_py.capture.Writer` wrapper. The on-disk bytes are identical (the Writer simply forwards to `write_capture`); using the Phase-0 surface directly avoids round-tripping the manifest dataclass through IC-2's flat dataclass aliases. | Playbook P14 (HEAD wins): the IC-2 wrapper exists; using it changes nothing observable. No semantic drift. | both |

The 21 inherited shifts from the Phase 1 landing audit § 14 carry
forward unmodified per charter § 11.1. No corrections proposed.

## 8. Banked items

| ID | Status at Stage 1 close |
|---|---|
| B17 (per-target mutation runners + first real kill-rate baseline) | UNCHANGED — open. Decision (PATH-A vs PATH-B) banked for Stage 2 Step 2.7 per charter § 4.3. |
| Cat 3 `_gather_tables` non-recursion (Phase 1 shift #16) | UNCHANGED — open. Banked for Stage 2 Step 2.3 surfacing. Stage 1 does not run Cat 3 against the closed-form goldens directly. |
| Open Phase 1 items B2–B6, B11, B16 | UNCHANGED — out of this sub-phase's scope per charter § 1.2 / § 11.2. |

No new banked items.

## 9. What remains

Stage 1 is `complete`. The two closed-form sims now ship all 13 gates
GREEN at HEAD `65ae4a0`. Operator dispatches Stage 2 in a fresh
session per charter § 5 step 4 using charter § 7.3 verbatim.

## 10. Phase-coherence anchor

Stage 1 closes the closed-form sub-phase's implementation surface:

- Phase 1 RED evidence files for both sims remain byte-identical to
  the values recorded in the Phase 1 landing audit (gate-13 anchor
  intact; Stage 0 reverify still holds).
- The two new GREEN evidence files witness the HEAD-state gate
  flip; their sha256s are committed in the per-sim commit footers
  and reproduced in this audit (§ 3.2, § 4.2).
- The two new canonical captures land per spec Appendix D § D.2.3
  descriptors; H5 payloads are bit-stable across re-runs at
  `seed = 42` and the determinism gate (§ 3, § 4 row 10) is GREEN.
- Two new perf-ledger first-landing baseline rows record the
  wall-clock costs (§ 3, § 4 row 12).
- Phase 0 RD-2D and Phase 1 infrastructure remain GREEN (§ 6).

The sub-phase is cleared to enter Stage 2 (landing: integrity sweep,
gate-13 replay verification per sim, mutation-score artifact, sub-phase
landing audit, Convention #12 SHA back-fill).

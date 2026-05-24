---
date: 2026-05-24T03-55-30Z
author: lattice-boltzmann-d3q19-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: lattice-boltzmann-d3q19-stack-d-stage-1c
subject: "Stage 1c (cross-stack equivalence + dual gate-14) CLOSE for the lattice-boltzmann-d3q19 -> Stack-D port (THIRD spec-Phase-2 cross-stack port). VERDICT SHIFTED-with-N1 (schema-corpus deferral; see below). DUAL gate-14 BOTH GREEN at relative=1e-5 (resolved category=lbm): Poiseuille (1001 frames) rho max_abs 5.773160e-15 / u 6.163473e-15; Couette (501 frames) rho 3.330669e-15 / u 1.273287e-15. Step-horizon: 0 frames reach even 1e-6; flat FP-round-off ~1e-15 across full horizons (~10-order margin; NO amplification). FIRST cross-stack port with TWO independent gate-14 verdicts (D4), dual-arm gate-4 (golden 4a + MMS 4b), 10x-tighter 1e-5 budget. THIRD per-sim override [overrides.lattice-boltzmann-d3q19] category=lbm added (tolerance.toml ebf383a1->e9987a69; at-budget, NOT widening; tolerance-budget UNCHANGED). equivalence.md extended additively (IC-15 candidate methodology, LBM aspects, fc0dae5d). test_cross_stack_equivalence.py SKIP removed -> both verdicts GREEN; full Stack-D suite 16 passed 0 skipped. N1 SHIFT: schema-corpus (charter step 5) DEFERRED + surfaced -- poiseuille canonical .h5 is 202,350,128 bytes (> GitHub 100MB hard push limit), tests/fixtures/legacy-captures/ has no LFS rule + that LFS edit is banked/out-of-scope; dispatch's '~1.5MB no LFS concern' premise FALSE at HEAD (Convention M). Both corpus entries deferred atomically for operator routing. R-S6 calibration: IC-15 partial-formalization validates across three physics families at algebraically-identical-trajectory FP-round-off-scale regime; deferred aspects #1/#3/#5 stay un-stress-tested; D5 Stage 2 routing (b) PARTIAL HOLDS + REFINEMENT well-supported. Main commit bf0961e. Cumulative 136 + 1 (N1) = 137."
verdict-state: SHIFTED-with-N1
head_sha: 5557186dcf8db2ae65cc046f420530945067fecf
head_sha_at_checkpoint: 5557186dcf8db2ae65cc046f420530945067fecf
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-1b-checkpoint-2026-05-24T03-40-08Z.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-checkpoint-2026-05-24T02-51-32Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/landing-2026-05-24T02-00-04Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-1c-evidence/gate14-dual-diff-2026-05-24T03-52-01Z.txt
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-1c-evidence/cross-stack-test-green-2026-05-24T03-53-41Z.txt
  - tools/testkit/equivalence/tolerance.toml
  - docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md
  - packages/lattice-boltzmann-d3q19-stack-d/tests/test_cross_stack_equivalence.py
evidence_hashes:
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-1c-evidence/gate14-dual-diff-2026-05-24T03-52-01Z.txt: sha256:1230f151a5ec5226e555450f45d96545823fdcfb13c5dfb5080ee4568c1e2841
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-1c-evidence/cross-stack-test-green-2026-05-24T03-53-41Z.txt: sha256:99622a149611980314f910a13574eb79d89be3b0008d06f819978f70f8267554
  tools/testkit/equivalence/tolerance.toml: sha256:e9987a69d1c42ed941c27efae9244d30f0a521a4f586a31d3ead3e26678bddba
  docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md: sha256:fc0dae5d0a9c5d99a7b411bba9633798b56966e069c5fefbe3b8c882e5c141ac
  packages/lattice-boltzmann-d3q19-stack-d/tests/test_cross_stack_equivalence.py: sha256:76185324d84aeb076da33b6a9e6aa87ca0f982d7d0c20af1c149698715d555e7
---

# Stage 1c Checkpoint — Sub-Phase lattice-boltzmann-d3q19 → Stack-D

> IC-9 abbreviated structure. All anchors HEAD-verified (Convention M / #8); no
> value inherited from the dispatch without verification. FACT / INFERENCE /
> SHIFTED tagging throughout. D1-D9 operator-ratified; not re-litigated.

## § 1. Scope summary

Stage 1c is the **dual gate-14 cross-stack equivalence** + **methodology-pattern** +
**R-S6-calibration-banking** stage of the THIRD per-sim cross-stack port. It adds the
MANDATORY per-sim tolerance override (D6), extends `equivalence.md` (IC-15 candidate
methodology), runs TWO independent gate-14 verdicts (D4), and un-skips the cross-stack
test. **Both gate-14 verdicts GREEN at 1e-5.** One N1 SHIFT: the schema-corpus step
(charter step 5) is deferred + surfaced (§ 7). Main commit **bf0961e**.

## § 2. Gate-status table (14 gates; sub-phase close)

| Gate | Scope | Status |
|---|---|---|
| 1 | Spec sheet | GREEN (1b) |
| 2 | Probe report | GREEN (1b) |
| 3 | Failing-tests RED anchor | GREEN (1a `2fe22f1`) |
| 4a | Equilibrium golden | GREEN (1b; max_abs=0.0) |
| 4b | MMS observed OOA | GREEN (1b; slope 2.39) |
| 5 | Reference-sanity | GREEN (1b) |
| 6 | Tier-1 diagnostics | GREEN (1b) |
| 7 | Tier-2 vector_field | GREEN (1b) |
| 8 | Citations / API | GREEN (1b) |
| 9 | Canonical captures (TWO) | GREEN (1b) |
| 10 | Determinism (IC-14) | GREEN (1b) |
| 11 | PBT invariants (x2) | GREEN (1b) |
| 12 | Perf-ledger rows (TWO) | GREEN (1b) |
| 13 | Worktree replay @ 1a | GREEN (1b) |
| 14 | **Cross-stack equivalence (x2 independent verdicts)** | **GREEN x2** (this stage) |

Full Stack-D suite: **16 passed, 0 skipped** (cross_stack SKIP removed).

## § 3. Per-step results (charter § 4.2.3; 7 steps)

| Step | Scope | Result |
|---|---|---|
| 1 | `[overrides.lattice-boltzmann-d3q19]` (D6) | **PASS** — § 6; at-budget; budget unchanged |
| 2 | Extend `equivalence.md` additively | **PASS** — § 5; `fc0dae5d…` |
| 3 | Dual gate-14 `compare_captures` (Poiseuille + Couette) | **PASS** — § 4; verbatim evidence |
| 4 | Gate-14 disposition | **GREEN x2** — both within_tolerance at 1e-5 |
| 5 | Schema-corpus entries | **DEFERRED + SURFACED (N1)** — § 7 (202MB > GitHub 100MB hard limit; legacy-captures no-LFS banked/out-of-scope) |
| 6 | Un-skip `test_cross_stack_equivalence.py` | **PASS** — § 8; both verdicts GREEN |
| 7 | Commit `feat(...stage1c)` | **PASS** — `bf0961e` |

## § 4. DUAL cross-stack equivalence witness (gate-14)

(FACT — `stage-1c-evidence/gate14-dual-diff-2026-05-24T03-52-01Z.txt`.)
Both `within_tolerance = True`; resolved `tolerance_table_used = {category: lbm,
relative: 1e-5, absolute: 0.0}` for both pairs.

**Poiseuille (primary; 1001 frames):**

| Field | max_abs_err | max_rel_err | worst-abs step |
|---|---|---|---|
| `rho` | `5.773160e-15` | `5.773160e-15` | 877 |
| `u` | `6.163473e-15` | `2.000000e+00`† | 988 |

**Couette (secondary; 501 frames):**

| Field | max_abs_err | max_rel_err | worst-abs step |
|---|---|---|---|
| `rho` | `3.330669e-15` | `3.330669e-15` | 107 |
| `u` | `1.273287e-15` | `2.000000e+00`† | 149 |

† `u` `max_rel_err≈2.0` is the near-zero transverse-velocity per-element artifact
(unidirectional flows; `u_y,u_z~1e-15`); `compare_captures` verdicts on
`abs_err > atol + rtol·field_scale` (`field_scale=max|u|~0.01-0.05` → threshold
`~1e-7`), which the `~6e-15` abs error clears by ~8 orders → `within_tolerance=True`.

**Step-horizon (both):** 0 frames reach even `1e-6` (0.1×budget); the diff is flat
FP-round-off `~1e-15` across the full horizons — collision-step FP-accumulation-order
noise, **NOT amplification**. **~10-order margin** vs `1e-5` (better than the Stage-1b
informal ~8-order preview). D8 comparison-projection NOT needed.

## § 5. equivalence.md extension

(FACT — committed `fc0dae5d…`.) Preserved the Phase-1 stub's tolerance-row +
cross-stack-scope tables (Convention A); added the per-sim override note; superseded
the stale "Stack C self-replicates / Not yet exercised" framing with the actual
NumPy-reference ↔ Taichi-CPU pair. Added the IC-15 candidate-methodology section
(7 subsections): dual-capture pair table, twice-invoked harness pattern, two-taxonomy
tolerance resolution (`lattice`→`lbm`), step-horizon discipline, dual per-field diff
witness (the § 4 data), D9 disposition (collision-step FP-accumulation; bit-exact
streaming; dual-arm gate-4; dual-capture) + S6 calibration, and methodology precedent.

## § 6. tolerance.toml override (THIRD per-sim; FIRST tolerance.toml SHIFT post-sph-water)

(FACT — committed `e9987a69…`; was `ebf383a1…` at HEAD entering Stage 1c.)
`[overrides.lattice-boltzmann-d3q19] category = "lbm"` resolves `sim.category="lattice"`
→ `[defaults.lbm]` (`relative=1e-5, absolute=0.0`). **At-budget** per
`[budgets.lbm.cross_stack]=1e-5` (verified unchanged); NOT a widening (spec § 2.6).
Third per-sim override after `[overrides.reaction-diffusion-2d]` + `[overrides.sph-water]`;
**10x tighter** than both (1e-4 → 1e-5). Without it, `compare_captures` raises `KeyError`
on `lattice` (Stage-0 Task 0.5 confirmed). `tolerance-budget.toml` UNCHANGED.

## § 7. Schema-corpus entries — DEFERRED + SURFACED (N1 SHIFT)

(FACT — `ls -la captures/lattice-boltzmann-d3q19-stack-d/`; `.gitattributes`;
`tools/testkit/capture/tests/test_legacy_captures_corpus.py`.)

**The dispatch's Step-6 size premise is FALSE at HEAD** (Convention M catch): the
dispatch cited "Poiseuille ≈ 1.5 MB ... well under sph-water's 61 MB; no new
LFS-routing concern." Actual sizes:
- `poiseuille-64x32-seed42-step1000.h5` = **202,350,128 bytes (~193 MiB)**
- `couette-32x16-seed42-step500.h5` = **27,405,152 bytes (~26 MiB)**

These are correct full-cadence canonical captures (capture_interval=1, full horizon —
D4; byte-identical in size to the Phase-1 `lbm-ref` captures). The schema-corpus copy
into `tests/fixtures/legacy-captures/` is the problem:
- That directory has **NO LFS rule** (`.gitattributes` — banked from sph-water; the
  61 MB sph-water entry is committed RAW and triggered a GitHub push *warning*).
- The poiseuille `.h5` at **202 MB EXCEEDS GitHub's 100 MB hard push limit** — the
  sph-water "commit raw, accept the warning" precedent does NOT extend (hard reject,
  not a warning).
- The corpus test (`test_legacy_capture_round_trips`) calls `load_capture()` which
  **reads the `.h5` payload** (`arr.size > 0`), so a `.json`-only entry won't satisfy it.
- Adding an LFS rule for `legacy-captures/` is **banked + out-of-scope** (forward-
  routable per operator; the Stage-0 out-of-scope list names it explicitly).

**Disposition:** both LBM corpus entries DEFERRED atomically (so the operator routes
one coherent LFS decision covering both). Did NOT commit a push-breaking 202 MB
non-LFS file; did NOT make the banked out-of-scope `.gitattributes` edit. This is the
**N1 shift** (cumulative 136 → 137). Operator routing options: (a) add LFS rule for
`tests/fixtures/legacy-captures/**/*.h5` (covers this + retroactively the sph-water
61 MB entry); (b) adopt a smaller representative-capture corpus convention; (c)
json-only-with-synthetic-payload corpus amendment. Recommended owner: Stage 2
landing-prep or a dedicated legacy-captures-LFS routing sub-phase.

## § 8. test_cross_stack_equivalence.py SKIP-removal + GREEN

(FACT — committed `76185324…`; `stage-1c-evidence/cross-stack-test-green-2026-05-24T03-53-41Z.txt`.)
The Stage-1b `pytestmark = pytest.mark.skip(...)` + the now-unused `import pytest`
removed; both `test_poiseuille_..._within_tolerance` + `test_couette_..._within_tolerance`
PASS. Full Stack-D suite **16 passed, 0 skipped**. ruff clean.

## § 9. Sub-phase coherence outputs (LOAD-BEARING for Stage 2 D5 routing)

- **Dual gate-14 GREEN** at full canonical horizons for both Poiseuille + Couette;
  `within_tolerance=True` at 1e-5 with **~10-order margin** (§ 4). The tighter 1e-5
  budget is NOT stressed by this laminar single-pass dissipative regime.
- **R-S6 methodology-precedent calibration:** the IC-15 partial-formalization
  methodology now validates across **three physics families** (continuous-ca +
  particle-fluids + lattice) at the **algebraically-identical-trajectory regime**
  (cross-stack diff at FP-round-off scale). This third pair exercises previously-
  deferred aspect **#4 (lattice-velocity quantization, reframed as collision-step
  FP-accumulation per D9)** — but the validated regime stays at FP-round-off scale.
  Remaining deferred aspects (**#1 R-P2 chaotic / #3 atomic-scatter / #5
  iterative-solver amplification**) STAY un-stress-tested.
- **D5 Stage 2 routing — option (b) PARTIAL HOLDS + REFINEMENT well-supported.**
  Stage 2 amends `docs/conventions/cross-stack-equivalence-methodology.md` ADDITIVELY
  with the LBM-specific refinements surfaced here: (1) collision-step FP-accumulation
  handling (f64 accumulator-seed pattern); (2) dual-arm gate-4 verification surface;
  (3) `1e-5` vs `1e-4` tolerance-category routing; (4) dual-canonical-capture /
  two-seeded-runner pattern. **DOES NOT promote partial → full** (third pair at the
  same regime; #1/#3/#5 un-stress-tested). (a) FULL not supported; (c) UNCHANGED
  less precise than (b).
- **Firsts banked:** dual-arm gate-4 (both passing); two canonical captures; two
  seeded runners; two perf-ledger rows; two independent gate-14 verdicts; tighter
  1e-5 cross-stack tolerance; first port with genuine in-kernel f64 reductions.
- **Banked precedents propagating:** f64 accumulator-seed pattern (Stage-0 banked,
  Stage-1b validated, Stage-1c FP-round-off-confirmed at gate-14); **first cross-stack
  port with Taichi-cpu running SLOWER than the NumPy reference** (1.31x poiseuille +
  1.61x couette — bank as a workload-dependent perf ratio: small-grid per-step
  kernel-launch overhead vs the prior ports' large-workload Taichi speedups).

## § 10. New Stage 1c SHIFTs

**1 new shift (N1):** schema-corpus deferral (§ 7) — the dispatch's small-file size
premise was false at HEAD; the 202 MB poiseuille canonical cannot enter the non-LFS
`legacy-captures/` without an LFS rule (banked/out-of-scope). Cumulative **136 → 137**.

No other shifts. Gate-14 GREEN x2; no tolerance widening; no D8 projection needed; no
D1-D9 re-litigation.

## § 11. Stage 2 dispatch readiness

Stage 2 (landing) is dispatchable. It owns: CHANGELOG + `dependencies.md` convergence;
integrity + portfolio sweep; IC-16 evidence verify (the four `.h5` LFS OIDs resolve);
mutation artifact (PATH-B re-bank lean); **D5 IC-15 methodology amendment per option
(b)** (§ 9); landing audit + SHA back-fill. **Stage 2 must also route the N1
schema-corpus deferral** (§ 7) — either resolve the `legacy-captures/` LFS rule and
add both LBM corpus entries, or formally re-bank with a chosen convention. No
intermediate tag (lean: no `-phase-N` tag).

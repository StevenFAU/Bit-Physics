# Phase 3 — progress bridge (append-only)

> State-bridging surface per `docs/phases/phase-3-plan.md:628-659` (§3.5) + §9.4, adapted from
> the v8 single-agent per-task schema to the matured **per-sub-phase cadence** (plan-drafting →
> Stage 0 → 1a/1b/1c → Stage 2). One entry per stage/sub-phase, in order. Append-only; never edit
> a prior entry. The v8 schema's "Branch merged at SHA / PR" rows are trunk-based-superseded
> (`docs/phases/phase-3-plan.md:46`) → "Landed at SHA" (no PR). Initialized at the first sub-phase
> plan-drafting.

## sub-phase-phase-3-common-3dgs — plan-drafting — 2026-05-28

- **Stage:** plan-drafting (first Phase-3 sub-phase; re-frames v8 execution into the sub-phase cadence).
- **Landed at SHA:** commit chain `191df72` (K-2) → `598de5a` (probe) → `b6230663` (charter + audit + this file) → SHA-back-fill (COMMIT 4). Trunk-based to `main`; no PR; no tag (I7).
- **Verdict:** SHIFTED (plan ready for Stage 0 *with* two operator-pending Stage-0 gates + execution-model re-frame).
- **Artifacts:** charter `docs/phases/sub-phase-phase-3-common-3dgs.md`; probe `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md`; audit `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md`.
- **First sub-phase = task-1 common-3dgs** (§4.1 default; dependency-graph re-anchor confirms, no different-choice STOP).
- **Next stage should know:**
  - **Stage 0 is GATED by two operator-pending preconditions:** (a) Inria gaussian-splatting SHA must be pinned in §2 of `phase-3-plan.md` (all 5 external SHAs PENDING); (b) pre-dispatch-review `docs/_audits/phase-3/pre-dispatch-review-<UTC>.md` must be filed. Do NOT vendor without the pinned SHA (Convention #8); do NOT dispatch without the review.
  - D-A (task-1-vs-task-2 sequencing), D-B (catalog stack-drift, per-sim), D-C (render determinism class), D-D (capture-writer), D-E (intermediate tag v0.2.2-sub-phase-phase-3-common-3dgs, lean YES) await operator routing — charter § 5.
  - §6.1 task prompt uses stale API names (`GaussianSet`/`forward_splat`) + branch ceremony — §3.2.1 `GaussianSplatModel`/`render` + trunk-based govern (charter §1.3).
  - K-2 fixed in `phase-3-plan.md` (7→0 stale golden-paths). S9-PHASE2-1/2/3 encoded into the Stage-2 landing-audit template (charter § 4).
- **Banked / forward:** Phase-4 pre-dispatch review is a separate operator track. Catalog Lenia B/E-vs-D drift routes at task-3/lenia plan-drafting.

## sub-phase-phase-3-common-3dgs — Stage 0 — 2026-05-28 — BLOCKED (STOP-B)

- **Stage:** Stage 0 (pre-flight + anchor re-check + external-SHA pin) — **halted at FIRST ACTION**.
- **Landed at SHA:** blocker audit committed to `main` (no PR; no tag, I7). HEAD at session start `da176e3` (== `origin/main`; plan-drafting chain tip, no successor — Convention M).
- **Verdict:** BLOCKED. **STOP-B** — Phase-3 pre-dispatch-review ABSENT (`docs/_audits/phase-3/pre-dispatch-review-*.md` does not exist; v9 amendment `docs/phases/phase-3-plan.md:34`).
- **Artifacts:** `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md`.
- **What did NOT run:** anchor probe (integrity Cat 1–5 / I1–I7 / verify_evidence sweeps), cross-phase replay `--prior-phase phase-2`, external-SHA pinning. No `phase-3-plan.md` §2 edit; no vendoring.
- **Operator action to unblock:** run the Phase-3 phase-plan-review session; land `docs/_audits/phase-3/pre-dispatch-review-<UTC>.md` (spec § 7.4 Convention E-addendum). STOP-A (Inria + 4 other SHAs) is resolved by the agent at Stage-0 resumption per the coordinator-ratified delegation (2026-05-28) — NOT a separate operator commit.
- **On resumption:** fresh Stage-0 session re-runs FIRST ACTION (STOP-B → PASS), then full anchor probe + replay + 5-upstream SHA pinning per the original dispatch.

## sub-phase-phase-3-common-3dgs — Stage 0 — 2026-05-28 — CONFIRMED (supersedes BLOCKED)

- **Stage:** Stage 0 (pre-flight + anchor re-check + external-SHA pin) — **COMPLETE**. Resumed dispatch with **STOP-B removed** (operator-ratified 2026-05-28: pre-dispatch-review overhead retired; charter ratification substitutes).
- **Landed at SHA:** chain `c7c562e` (§2.18 SHA pins) → Stage-0 audit commit → SHA back-fill. Trunk-based to `main`; no PR; no tag (I7). HEAD at session start `e8c8d16` (== `origin/main`; BLOCKED chain tip, no successor — Convention M).
- **Verdict:** CONFIRMED. Anchor probe clean (integrity `c19492ad…d22cb52` byte-identical 0 HARD_FAIL / 14 SOFT_WARN; I1–I7 hold; verify_evidence 7/7 audits 0-fail; I7 test 16/16). Replay `--prior-phase phase-2` → `ok=True` 8/8. No STOP fired.
- **Artifacts:** Stage-0 audit `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md` (supersedes the BLOCKED audit, which stays append-only); §2.18 added to `docs/phases/phase-3-plan.md`.
- **5 external SHAs pinned (§2.18; all web-fetched + verified, Convention #8):** Inria gaussian-splatting `54c035f7` (main HEAD, no tags; **NON-COMMERCIAL license — first non-permissive upstream, binds task-8 + Phase-4 WU-C**); PhysGaussian `8339ed6a` (main HEAD; **NO LICENSE — cite-only here, task-8 must resolve**); Bender PBD `d0894bdb` (master HEAD; MIT); PhysicsNeMo `766e485a` (release v2.1.0; Apache-2.0); Chakazul/Lenia `adfc5429` (master HEAD; MIT). All security-advisory clean. No STOP-A.
- **Banked for operator (LFS):** R2 credentials absent in agent sessions + GitHub-LFS budget exhausted → the phase-2 replay worktree smudge failed; recovered by repopulating the local git-lfs object cache from verified working-tree content (OID==sha256, byte-identical). Future replays/worktree checkouts depend on this local-cache path until a backend is restored.
- **Next stage = Stage 1a (scaffold + RED).** Inherits: Inria SHA `54c035f7` (vendor `references/3DGS-reference/` at 1b, non-commercial clause binds); §3.2.1 API names (`GaussianSplatModel`/`render`/`Camera`/`load_ply`/`save_ply`); D-C (default bit-exact/same-stack-same-hw registry row at 1a, measure 1b); D-D (probe-discovered smoke-sim pattern; common-py PNG writer default).

## sub-phase-phase-3-common-3dgs — Stage 1a — 2026-05-28 — CONFIRMED

- **Stage:** Stage 1a (scaffold + RED-failing-tests). Trunk-based to `main`; no PR; no tag (I7).
- **Landed at SHA:** `5070965` (ci: pre-commit references/ exclusion) → `4407dcb` (docs: probe report) → `c5273ef` (feat: scaffold + vendored Inria + registry) → `ed4e501` (test: RED tests + evidence) → audit + this entry → SHA-back-fill (Convention #12).
- **Verdict:** CONFIRMED. Anchor probe clean (integrity `c19492ad…d22cb52` byte-identical 0 HARD_FAIL / 14 SOFT_WARN, WITH all new files staged; I1–I7 hold; verify_evidence 8/8 audits 0-fail; I7 test 16/16). No STOP fired.
- **Artifacts:** package `common/common-3dgs/` (23rd workspace member); probe `tools/testkit/probes/reports/common-3dgs.md`; vendored `references/3DGS-reference/` @ Inria SHA `54c035f7` (NON-COMMERCIAL, read-only); determinism `tools/testkit/determinism/registry.toml` (NEW surface, D-C default row); RED evidence `tools/testkit/failing-tests-evidence/common-3dgs-2026-05-28T01-28-53Z.txt` (`sha256:f1f80a02…626c84c6`); audit `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md`.
- **RED state:** `9 failed (NotImplementedError), 1 passed`. Failing-tests-output-hash byte-reproducible (--tb=line + prefix/duration-normalized; gate-13 re-runs to the same hash; PBT derandomize=True, database=None).
- **D-C:** DEFAULT `bit-exact / same-stack-same-hw` declared (atomic_ops=none, subgroup_ops=none); MEASURED at Stage 1b. **D-D:** RESOLVED to common-3dgs `save_png` (no common-py RGB-image writer exists; `plot_field_2d` is a colormapped field plot).
- **§0.3 SHIFTs (follow-discovered, surfaced):** `MANIFEST.toml` not `manifest.yaml`; `python-strict.yml` not `build-py.yml` (test-common-3dgs job at 1b); CHANGELOG `### sub-phase-…` not `## Phase 3`; determinism `registry.toml` is a new surface.
- **Next stage = Stage 1b (implementation + thirteen-gate + D-C measurement).** Replace every NotImplementedError; vendor already done; run 13 gates (Gate 14 N/A — single-stack); MEASURE D-C; shared-file updates (docs/common/3dgs.md, README, CHANGELOG, glossary, justfile, python-strict.yml test-common-3dgs job, tolerance-budget Phase-3 carryover, perf-ledger, schema-corpus fixture); RED→GREEN witnessing `sha256:f1f80a02…626c84c6`.

## sub-phase-phase-3-common-3dgs — Stage 1b — 2026-05-28 — CONFIRMED

- **Stage:** Stage 1b (implementation + thirteen-gate + D-C measurement). Trunk-based to `main`; pushed; no tag (I7).
- **Landed at SHA:** `87fe557` (feat: §3.2.1 impl, RED→GREEN, witnesses `sha256:f1f80a02…`) → `d9aa0e7` (docs) → `dd1c3ec` (chore: CI job + recipes + tolerance-budget + registry) → audit + this entry → SHA-back-fill.
- **Verdict:** CONFIRMED. 10/10 tests GREEN; ruff + mypy --strict clean; integrity `c19492ad…d22cb52` byte-identical 0 HARD_FAIL; testkit regression 34/34; I1–I7 hold.
- **D-C MEASURED bit-exact (max_abs_diff=0.0, identical sha256 over two renders):** the bit-exact / same-stack-same-hw declaration HOLDS; registry row unchanged; **no STOP-J** (no distributional/EFECT re-characterization).
- **D-D:** common-3dgs `save_png` (matplotlib imsave). **STOP-E cleared:** §3.2.1 supports task-8's per-frame working-copy mutation pattern.
- **Thirteen gates:** PASS (sim-specific — golden tables / tier-3 / gate-14 — N/A with §2.11 infra surrogates; gate-14 N/A single-stack). Gate-13 failing-tests replay reproduces the hash byte-identically.
- **SHIFTED (DEFERRED, operator):** schema-corpus fixture `tests/fixtures/legacy-captures/phase-3-common-3dgs.{h5,json}` GENERATED + corpus-test-GREEN 21/21, but its `.h5` is LFS-routed and BOTH LFS backends are unavailable in agent sessions (push EOF; R2 creds absent + GitHub-LFS budget exhausted). Commit DEFERRED; fixture reproducible via `just run-3dgs-smoke`; `.h5` sha256 `651dbe45…4653f1`. HARD RULE 2 — surfaced, not improvised around.
- **Artifacts:** impl `common/common-3dgs/src/common_3dgs/{model,camera,render,_kernels,image_io}.py` + `examples/smoke_3dgs/sim.py`; `docs/common/3dgs.md`; CI `test-common-3dgs` in `.github/workflows/python-strict.yml`; audit `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md`.
- **Next stage = Stage 1c (mutation baseline ≥80% + PBT confirmation + verify_evidence + append-only + integrity sweep + landing).** Determinism row locked bit-exact.

## sub-phase-phase-3-common-3dgs — Stage 1c — 2026-05-28 — SHIFTED

- **Stage:** Stage 1c (mutation baseline + verdict landing). Trunk-based to `main`; pushed; no tag (I7).
- **Landed at SHA:** `e66e069` (test: second-pass tightening — `test_render_sh.py` + `test_validation.py` + `test_render_values.py` first-pass + `mutmut-config.toml` `common_3dgs` target registration) → `e258950` (test: regenerate Stage-1b carry-in legacy-capture fixture under R2-creds-unblocked posture; LFS-tracked .h5 + sidecar) → `549c383` (test: Stage-1c mutmut baseline JSON — 958/691/50/217, score 0.7610) → audit + this entry → SHA-back-fill.
- **Verdict:** SHIFTED (graded variant per phase-3-plan §2.15). Mutation score = **0.7610** (691 / (691 + 217)); 0.80 floor unmet by 3.9 pp; +14.5 pp vs the prior session's 0.6160 first-pass baseline. The 0.80 threshold in `tools/testkit/mutation/mutmut-config.toml` is **NOT widened** (phase-3-plan §6.0 anti-pattern; STOP-I not exercised).
- **Anchor probe:** integrity `c19492ad…d22cb52` byte-identical 0 HARD_FAIL / 14 SOFT_WARN; I1–I7 hold; verify_evidence sweep 0-fail across plan-drafting + probe + stage-0 + stage-0-BLOCKED + stage-1a + stage-1b (no regression).
- **STEP A — survivor bucketing (pre-tightening, 850 mutants prior session):** render.py 215 (199 surv + 16 susp; SH higher-order + `_quaternions_to_matrices` off-diagonals + EWA Jacobian + constants); model.py 55 (validators + activation pair + PLY internals); camera.py 46 (validation + look_at proj-matrix internals + defaults); _kernels.py 51 (Warp kernel constants + accumulators + clamp); image_io.py 4.
- **STEP B — tightening:** 26 NEW test functions across `test_render_sh.py` (9 SH-coefficient + quaternion-rotation tests) + `test_validation.py` (17 Camera + GaussianSplatModel + image_io tests). All-tests pytest 51/51 GREEN; ruff clean.
- **STEP C — re-run:** 958/691/50/217 — kill rate 0.7610. Per-file: `camera.py` 0.808, `image_io.py` 0.977, `_kernels.py` 0.743, `model.py` 0.746, `render.py` 0.747.
- **STEP D — verdict:** SHIFTED (70-79% bracket). The Warp-kernel + NumPy-preprocessor inner-arithmetic surface is structurally hard to cover beyond ~76% within a non-overlapping test budget (§ 6.1 of the audit).
- **Carry-in CONSUMED:** Stage-1b § 5 DEFERRED legacy-capture fixture regenerated under the R2-creds-unblocked posture (`e258950`). New .h5 file sha256 = `2087402de9…649f4a9` (differs from Stage-1b reported `651dbe45…4653f1` because manifest embeds `wall_clock_seconds`; the **payload** rgb_image is bit-exact across regenerations — D-C governs payload, not file).
- **Banked (Phase-3 lesson L-3DGS-1):** "Neural-rendered category mutation threshold may need calibration; revisit at task-8 dispatch with the 3DGS-MPM consumer providing additional pixel-exact rotation / SH coverage." Forward-routes to task-8 (3dgs-mpm sub-phase plan-drafting).
- **Artifacts:** baseline `tools/testkit/mutation/baseline-2026-05-28T03-23-44Z.json`; tests `common/common-3dgs/tests/test_render_{sh,values}.py` + `test_validation.py`; fixture `tests/fixtures/legacy-captures/phase-3-common-3dgs.{h5,json}`; audit `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md`.
- **Next stage = Stage 2 (sub-phase landing audit).** Closes as `closed-with-shifted-1` (the SHIFTED item = the mutation-score gap; L-3DGS-1 routes the calibration to task-8). Intermediate tag lean = YES `v0.2.2-sub-phase-phase-3-common-3dgs` (D-E, charter § 3); operator-pushed only (I7).

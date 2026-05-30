---
title: Exhaustive Back-Test Re-Audit — Execution Report + Remediation Plan
head_sha: 4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9
this_run_utc: 20260530T010943Z
audit_branch: audit/back-test-20260530T010943Z
prior_run: 869bf68 (2 BLOCKER / 16 MAJOR / 19 MINOR)
---

# Execution Report — Exhaustive Back-Test Re-Audit @ HEAD 4ee0ea9

## 1. What ran (two-pass shape, mirrored from the prior run)

**Pass 1 (static ground-truth + spec-of-record mapping):** consumed the prior deliverables
(`back-test-20260529T124759Z/`) as a re-test CHECKLIST (not trusted); re-confirmed the
spec-of-record mappings at HEAD (architecture.md == v2.4, frozen per §9.6; 13-gate list at §D.6;
catalog §41.4). Established the worktree at HEAD on the audit branch.

**Pass 2 (exhaustive execution):** all 10 dimensions executed (not sampled), each with a committed
denominator and `checked == denominator` accounting (see coverage-report.md). Heavy items:
- **D4 mutation** — re-measured 11 testkit/integrity targets DIRECTLY via mutmut (driver:
  `evidence/run-mutation-driver.sh`, PER_TARGET_TIMEOUT raised 1500→2400s).
- **D3/D5** — independently recomputed every golden/MMS/anchor and re-ran every determinism +
  replay test through the venv.
- **C++ ctest gate** — the prior-UNKNOWN: full repo-root CMake build under lavapipe → 9/9 ctest PASS.

## 2. Methodological note — concurrent mutation × live test runs (and why the verdicts hold)

The mutation driver mutates testkit/integrity source IN PLACE (restoring `*.bak` after each target).
While it ran, the D3/D5/D10/D4-PBT execution agents also ran pytest against overlapping trees. This is
SAFE for the verdicts because **a live mutant can only cause a test to FAIL, never to falsely PASS** —
so every PASS reported under concurrency is trustworthy. One transient FAIL was observed and correctly
attributed: D3's rd-3d MMS pytest returned `nan` from a live mutant in
`reaction_diffusion_3d/solution.py`; the agent confirmed `solution.py.bak == git HEAD` byte-for-byte,
re-ran against the pristine source via importlib injection → combined OOA 2.0056 PASS. No source was
modified or reverted by any agent. The driver's EXIT/INT/TERM trap restores all `.bak` files at close.

## 3. Headline results (prior → now)

- **Severity counts:** BLOCKER 2→2, MAJOR 16→17, MINOR 19→~30. (Detail + exact deltas in §4.)
- **Both BLOCKERS persist** (B-1 hollow append-only glob; B-2 mutation moat) — structural CI/testkit
  gaps, NOT data defects. **Tasks 5-8 introduced ZERO new blockers.**
- **Harness fidelity CONFIRMED** — 4 unchanged-source mutation targets reproduce the prior run
  byte-for-byte (sph 0/127, incompressible 53/29, determinism 71/62, render_similarity 66/18);
  rd_3d_mms within 1 mutant. The 0.067 cat4 / ~0.27 framework scores are real signal, not noise.
- **C++ ctest gate: GREEN** (9/9), no longer UNKNOWN.
- **Landed-inventory: NO overcount** — the prior "over-count by two" hypothesis is FALSIFIED; 7/7
  Phase-3 sims genuinely landed. The stub-banner is a header-hygiene defect (N-1), not a miscount.
- **One MAJOR RESOLVED-AT-HEAD:** M-14 (mass-spring premature bit-exact) — now backed by a real
  measurement (cloth doctest gate-7). One pattern resolved (cloth PBT-absent → genuine `@given`).
- **Two patterns WIDENED by tasks 5-8:** M-7 landing-filename convention (1→5 sims); N-1 Stage-1a
  stub-banner freeze (2→5 sims, the M-11/M-12 class recurring on neural-ca/pinn/3dgs-mpm).

### RESOLVED-AT-HEAD set (with resolving evidence)
| prior ID | resolved by |
|---|---|
| M-14 premature bit-exact | task-5 cloth landing chain (HEAD `86b0aa5`); registry row now backed by doctest gate-7 |
| "mass-spring-cloth PBT absent" (prior D4 co-defect) | genuine `@given`→subprocess C++ PBT now exists |
| 3 RAW-HDF5 67MB legacy blobs (part of M-8) | gone at HEAD (P2: 0 raw); M-1/M-8 reduced to 12 placeholders |
| C++ ctest gate UNKNOWN | exercised → 9/9 GREEN |
| "landed-inventory overcount-by-two" hypothesis | falsified — 7/7 genuinely landed |

### Still-LIVE set
B-1, B-2(+B-2a), M-1(changed), M-2, M-3, M-4, M-5, M-6, M-7(changed), M-8(changed→folds into M-1),
M-9, M-10, M-11, M-12, M-13, M-15, M-16, and minors m-1..m-19.

### NEW-in-tasks-5-8 set
N-1 (stub-freeze widened), N-2 (task-7/8 gate-3 hashes), n-1 (§0.3 residual), n-2 (neural-ca-python
key), n-3 (particle-fluids plural), n-4 (pinn capture -ref), n-5 (3dgs anchor-2 same-theory),
n-6 (physicsnemo-sym wrong-repo / A-6), n-7 (integrity meta-test not in CI), n-8 (sim mutation
targets advisory gap), n-9 (tasks 5-8 lack test_determinism.py), n-10 (replay --audit cwd-relative).

## 4. Real mutation scores at HEAD (with harness-fidelity control)

Full table in `evidence/D4-mutation-scores.md` + per-target JSON checkpoints. 11/11 measured, none
timed out. **10/11 below §2.13 threshold; only reaction_diffusion_3d_mms (0.8295) passes.** Core
modules: cat4_draft_time **0.0669** (live citation hook), sph_water_dfsph_generator **0.0000** (B-2a),
property 0.2034, code_verification_mms 0.2650, golden 0.2696, equivalence 0.4811, determinism 0.5338,
capture 0.6777. **Fidelity control: 7 of 11 reproduce the prior run byte-for-byte** (killed AND total
identical); rd_3d_mms within 1 mutant; 2 diverge only by genuine source growth pin→HEAD.

## 5. The C++ ctest gate — real state (no longer UNKNOWN)

`cmake -S . -B build` + `cmake --build` + `ctest` under `VK_ICD_FILENAMES=lvp_icd.json`:
configure/build/ctest all rc=0; **9/9 tests PASSED in 7.39s** — common_cpp (×5), rd2d_stack_c_tests,
rd2d_stack_c_gate14, mass_spring_cloth_tests, mass_spring_cloth_pbt. The Stack-C gates are real-GREEN.

---

# REMEDIATION PLAN (ordered for a follow-up dispatch)

Sequenced per the audit's own logic. **[CHEAP]** = mechanical fold-in (minutes, low risk).
**[ENG]** = real engineering (design + coverage work). Run top-to-bottom; each stage's output
unblocks the next.

### Stage R0 — Clear the commit path (LFS-migrate FIRST)
*Rationale: the dirty-fixture re-encode (M-1/M-8) is what forces `--no-verify`, which silently
bypasses cat4 + all local hooks; fix it first so every subsequent remediation commits cleanly with
hooks ON.*
- **R0.1 [ENG]** M-1/M-8 — migrate the 12 PLACEHOLDER `tests/fixtures/legacy-captures/*.h5` to real
  LFS pointers (`git lfs migrate import` or re-add as pointers). Verify `git status` clean on a fresh
  checkout. Routes to banked `legacy-capture-fixture-lfs-reconciliation`.

### Stage R1 — The mutation moat (the substantive self-integrity work)
*Rationale: B-2 is the charter's central finding — the tools that gate every sim/MMS/citation/property
test catch a minority of injected faults and CI never measures it.*
- **R1.1 [CHEAP]** B-2a — fix or retire the `sph_water_dfsph_generator` mutation runner (currently
  0.000; runner tests the committed table, not the generator). Either point it at a
  regenerate-and-compare test, or drop it from the §2.13 set and rely on `--verify`.
- **R1.2 [ENG]** B-2 — produce + commit real per-target baselines for the 7 core modules; raise test
  coverage where feasible (priority: cat4_draft_time 0.067 → the live citation hook; then
  property/code_verification_mms). DECIDE §2.13's status: a gate (raise coverage / lower thresholds
  with written rationale) or an advisory (state so in the spec). Wire the real measurement into CI
  (or document the weekly-baseline-only posture explicitly).
- **R1.3 [CHEAP]** n-8 — add one §2.13 sentence acknowledging the 10 advisory sim/satellite mutation
  targets the config carries.

### Stage R2 — Gate SEMANTICS before the data they gate
*Rationale: fixing the anchor data (M-4/M-5) before the gate (M-3) leaves the gate unable to verify the
fix; do the gate first so the relabel/addition is machine-checked.*
- **R2.1 [ENG]** M-3 — make `_anchor_count` require ≥3 DISTINCT normalized `independent_reference.source`
  values; flag source ⊆ the derivation's `upstream`; also de-hard-code `_SUBDIRS_PICKED_UP`.
- **R2.2 [CHEAP]** M-4 + M-5 — relabel the two rigid-body tables as numerical baselines exempt from
  §2.4 (honest for a chaotic/energy-only system), OR add 3 genuinely distinct published anchors.

### Stage R3 — Close the hollow / unwired enforcement paths
- **R3.1 [CHEAP]** B-1 — replace the `audit-append-only.yml` feed filter so it guards ALL
  `docs/_audits/` files (drop the `\.ledger\.md$` grep, or broaden it).
- **R3.2 [CHEAP/ENG]** n-7 — wire the integrity meta-test (`pytest tools/integrity/tests/`) into a
  workflow, OR correct the false architecture.md:770 claim. (Candidate sibling sub-phase
  `integrity-meta-test-ci-wiring`.)
- **R3.3 [CHEAP]** N-2 + m-1 + m-18 — add a gate-3-convention check that a `Failing-tests-output-hash:`
  footer exists AND matches the evidence body at the landing commit; back-fill the missing/superseded
  footers on 3dgs-mpm, pinn-poisson, eulerian-smoke-stack-d; normalize the cloth free-form key.
- **R3.4 [OPERATOR]** M-2 — configure `main` branch protection to match the claimed spec moat, or
  amend the spec to state the single-operator-trunk reality.

### Stage R4 — Landing-hygiene patterns (stop the recurrence)
- **R4.1 [CHEAP]** N-1 + M-11 + M-12 — strip the Stage-1a STUB/SKELETON banners and resolve/cut the
  stale TODOs on lenia, ising, neural-ca, pinn-poisson, 3dgs-mpm; add a landing-checklist item
  "no STUB banner survives a landing".
- **R4.2 [CHEAP]** M-7 — rename the 5 `task-N-<slug>.md` Phase-3 landing audits to the
  `sub-phase-phase-3-<slug>-landing-<UTC>.md` convention (use each file's front-matter `date:`).
- **R4.3 [CHEAP]** M-13 — add `@given` strategies to the lenia PBT (the sole degenerate of 25).
- **R4.4 [CHEAP]** n-9 — add per-sim `test_determinism.py` for cloth/nca/pinn/3dgs so the claimed
  bit-exactness is exercised in CI.

### Stage R5 — Spec/doc consistency minors (batch fold-in)
- **R5.1 [CHEAP]** M-6 — reconcile `articulated-pedagogical` vs `rigid-body-pedagogical` across all 8
  surfaces; amend §5.8 + rewrite A-1 to carry the rename.
- **R5.2 [CHEAP]** M-9 — fix the phantom `preflight-phase-<N>.py` call-sites to `preflight-phase.py <N>`.
- **R5.3 [CHEAP]** M-10 + m-11 — rewrite the architecture.md:854 / :40 "ten-gate" notes to the
  13-gate reality with a version annotation.
- **R5.4 [CHEAP]** M-16 — `eleven-gate` → `fourteen-gate` at the 5 phase-2 call-sites (+ 2 contrast).
- **R5.5 [CHEAP]** apply corrigenda A-2 (cloth-xpbd / m-9), A-3 (Bender SHA / m-10), A-6
  (physicsnemo-sym repo+SHA / n-6); plus m-2/m-3/m-4/m-8 path-and-section fixes; n-2/n-3/n-4 naming;
  m-12 golden-tolerance cap shape; m-13/m-14/m-15 evidence_hashes/head_sha hygiene; m-16 perf-ledger
  invocation text; m-19 ToC/xref. These are independent one-liners — batch in a single cleanup commit.

### Cheap-fold-in vs real-engineering tally
- **[ENG] (4):** R0.1 (LFS migrate), R1.2 (mutation coverage), R2.1 (anchor gate), and the
  ENG half of R3.2 (meta-test CI wiring).
- **[CHEAP] (everything else):** ~24 mechanical fixes, most batchable into 2-3 commits.
- **[OPERATOR] (2):** R3.4 (branch protection), R1.2's §2.13 posture decision (gate vs advisory).

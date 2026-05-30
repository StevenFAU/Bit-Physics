---
title: Exhaustive Back-Test Re-Audit — Coverage / Completeness Accounting
head_sha: 4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9
this_run_utc: 20260530T010943Z
bar: every element executed-and-verdicted OR explicitly BLOCKED/DEFERRED/UNKNOWN with a named reason. NO sampling.
---

# Coverage Report — proves the sweep was total at HEAD 4ee0ea9

For each dimension: the **enumerated universe (denominator)**, **checked == denominator**, and the partition.
Banned words ("representative/spot-checked/e.g./a sample of") are not used; large sets are partitioned + fully resolved.

## Spec-of-record mapping (re-confirmed at HEAD)
| mapping | status at 4ee0ea9 |
|---|---|
| gpu-sims-design-spec-v2.md v2.4 == `docs/architecture.md` | HELD — frozen in Phase 3 per §9.6; D9 confirms live docs byte-identical to the pin |
| 13-gate list location | `docs/architecture.md` Appendix D §D.6 (~lines 2585-2608); exactly 13, gate-14 correctly absent from the spec set |
| convention catalog | `docs/bit-physics-master-catalog.md` (CI tiering §41.4) + `docs/conventions/sub-phase-conventions.md` (§Q LFS) |

## Gating preconditions
| # | Universe | Checked | Result |
|---|---|---|---|
| P1 | 27 workspace members (`uv sync --all-packages --all-extras`) | 27 | venv built, exit 0 |
| P2 | 56 LFS-filtered `.h5` (committed-blob classification) | 56 | **44 POINTER / 0 RAW-HDF5 / 12 PLACEHOLDER**; 12 non-pointer (M-1/M-8 CHANGED — 3 raw 67MB blobs gone); content correct (sha==blob) |
| M-2 | server moat (branch protection) | 1 | 404 "Branch not protected" — LIVE |

## Dimensions
| Dim | Universe (denominator) | Checked | Verdict | Notes |
|---|---|---|---|---|
| **D1** citations | 15 derivations + 19 tables + 5 §2.18 upstreams + 9 NEW task-5-8 external cites + 10 vendored-line cites | all == denom | ✅ | M-3/M-4/M-5 LIVE (anchor distinctness); tasks 5-8 goldens do NOT exploit the hole (each ≥3 distinct); 9/9 upstreams web-resolve; n-6 physicsnemo-sym wrong-repo |
| **D2** ref graph | **16,787 edges** (1014+35 path:line, 10,512 numeric-§, 2763 appendix-§, 530 appendix-letter, 1933 IC-N) | 16,720 resolved; 67 accounted | ✅ | all MINOR (m-2/3/4/8) or non-defect; n-1 §0.3 residual; SEED-2/BT-1 RESOLVE |
| **D3** numerical (BLOCKER) | 8 golden generators + 11 MMS targets + GCI-claims + 5 NEW task-5-8 numerical claim-sets + tolerances | all (GCI recompute DEFERRED) | ✅ ZERO BLOCKER | golden 8/8; MMS 11/11 + falsifiable; pinn/3dgs/cloth/NCA all independently recomputed & reproduce; M-15 GCI-absent; m-12 uncapped (7 rows) |
| **D4** testkit self-integrity (BLOCKER) | 11 mutation targets + 25 PBT files + 25 gate-3 RED artifacts | mutation 11/11 + PBT 25/25 + gate-3 25/25 == all | ✅ | B-2 (10/11 below thr; 7 byte-exact fidelity; only rd_3d_mms 0.8295 passes); B-2a sph-gen 0.000; M-13 lenia degenerate; N-2 task-7/8 hash; 25/25 genuine RED |
| **D5** determinism (BLOCKER) | 21 per-sim + 3 harness + 1 equivalence + 1 cross-phase replay (5 gates) + 4 NEW task-5-8 determinism claims | all | ✅ ZERO BLOCKER | 21/21 + 3/3 bit-exact; replay ok=True 5/5; M-14 RESOLVED-AT-HEAD; n-9 tasks 5-8 lack test_determinism.py |
| **D6** naming/conv | 19 built sims (naming ×5 surfaces) + 38 conventions (21 App-G + 17 §D.8) + 6 docs grammar + 9 Phase-3 landings | all (5 unbuilt = UNCHECKABLE, named) | ✅ | M-6 name split LIVE; M-7 CHANGED 1→5; n-2/n-3/n-4 new; 0 VIOLATED conventions; 0 typos |
| **D7** gate-count | 152 LIVE-doc tokens (per-token) + 150 `_audits` tokens (class) | 152 + class | ✅ | M-16 (5 stale) + M-10 + m-11 LIVE; 13-gate list intact; gate-14 per-sim correct; M-3 hole intact; n-8 sim mutation targets advisory |
| **D8** schema/SHA | 58 capture sidecars (schema) + 7 vendored repos (SHA) + 7 amendments (A-1..A-7) | 58 + 7 + 7 | ✅ | schema uniform 1.0.0; m-10 Bender + n-6 physicsnemo = 2 SHA mismatch; A-1..A-7 all REAL; PhysGaussian cite-only truthful |
| **D9** doc-internal | 14 locked-decisions + 16 ToC + 343 markers→23 actionable + 28 docs (dup-§) + 36 amendment-seams | all | ✅ | M-9/M-10/M-11/M-12 LIVE + N-1 (stub-freeze widened 2→5); landed-inventory NO overcount; 0 duplicate §; m-19 minors |
| **D10** evidence-trail (BLOCKER) | 215 evidence-bearing audits + 576 append-only files | 215 + 576 == all | ✅ | verify 191/215 (24 categorized-intermediate); append-only 0 violations; B-1 glob 0/576 LIVE; pointer-masquerade PASS; n-7 meta-test-CI false claim |
| **C++** ctest gate (prior UNKNOWN) | 1 repo-root CMake build → 9 ctest tests | 9/9 | ✅ GREEN | configure/build/ctest rc=0; rd2d-stack-c + cloth + common-cpp all PASS under lavapipe — no longer a blind spot |

## BLOCKED / DEFERRED / UNKNOWN register (the honest residue)
| item | state | reason | resume pointer |
|---|---|---|---|
| D4 mutation | **COMPLETE 11/11 — none BLOCKED** | 2400s/target cap cleared the prior golden timeout (547/2029 done) | n/a — full table in evidence/D4-mutation-scores.md |
| D3.3 GCI / Richardson recompute | **DEFERRED(tooling-absent)** | `tools/testkit/solution_verification/` empty scaffold | verified instead: no sim falsely claims solution-verified (M-15) |
| gate-3 replay byte-exact normalized hash | **context-sensitive** | normalized match depends on repo-root + pytest version | structural RED reproduces 25/25; resume from same-root checkout |
| 5 unbuilt sims (articulated-locomotion, granular-pile, manipulator-grasp, gns-particle, learned-closure-les) | **OUT-OF-UNIVERSE** | absent-by-schedule (Phase 4+) | n/a |

## Why low-yield dimensions are believable (charter §5)
D2 returned only MINORs across 16,787 edges; D3/D5 PASS with full per-element execution (8 golden + 11 MMS + 21 determinism + 5 new-sim recomputations all run, not asserted). The high-yield dimensions (D4 mutation, D1 anchor-distinctness, D10 workflow-glob) concentrate exactly where the static-only first pass could not look — vindicating the charter's "low yield = coarse net" thesis. The two BLOCKERS both survive from the prior pin (structural CI/testkit gaps, not data); tasks 5-8 added zero new blockers and resolved one MAJOR (M-14) while widening two patterns (M-7 1→5, N-1 stub-freeze 2→5).

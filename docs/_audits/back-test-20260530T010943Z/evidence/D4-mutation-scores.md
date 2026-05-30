---
title: D4 — Real mutation scores @ HEAD 4ee0ea9 (with harness-fidelity control)
head_sha: 4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9
this_run_utc: 20260530T010943Z
driver: evidence/run-mutation-driver.sh (PER_TARGET_TIMEOUT=2400s; mutmut DIRECT per target)
score: killed / (killed + survived)
---

# D4 Mutation — measured 11/11, NONE timed out (golden completed this run)

The prior run left `golden` BLOCKED(resource)-timeout-partial (0.3754 lower-bound at 1457 mutants).
Raising PER_TARGET_TIMEOUT 1500→2400s let golden COMPLETE this run (2029 mutants) → its true score is
**0.2696**, BELOW the prior lower-bound (the full mutant set surfaces many more survivors).

## Full table — prior (pin 869bf68) → now (HEAD 4ee0ea9)

| target | thr | PRIOR killed/total = score | NOW killed/total = score | meets? | delta / cause |
|---|---|---|---|---|---|
| reaction_diffusion_3d_mms | 0.80 | 108/130 = 0.8308 | 107/129 = **0.8295** | **TRUE** | within 1 mutant (pytest/boundary) — **the only pass** |
| render_similarity | 0.85 | 66/84 = 0.7857 | 66/84 = **0.7857** | False | **byte-exact** |
| capture | 0.90 | 408/602 = 0.6777 | 408/602 = **0.6777** | False | **byte-exact** |
| incompressible_ns_2d_mms | 0.80 | 53/82 = 0.6463 | 53/82 = **0.6463** | False | **byte-exact** |
| determinism | 0.90 | 71/133 = 0.5338 | 71/133 = **0.5338** | False | **byte-exact** |
| equivalence | 0.85 | 157/294 = 0.5340 | 127/264 = **0.4811** | False | CHANGED — source edited pin→HEAD (tolerance rows); 30 fewer mutants |
| golden | 0.80 | 547/1457 = 0.3754 (PARTIAL) | 547/2029 = **0.2696** | False | now COMPLETE; true score below the partial lower-bound |
| code_verification_mms | 0.80 | 194/732 = 0.2650 | 194/732 = **0.2650** | False | **byte-exact** |
| property | 0.80 | 108/286 = 0.2741 | 108/531 = **0.2034** | False | CHANGED — harness grew (531 vs 286 mutants), same 108 kills |
| cat4_draft_time | 0.90 | 33/493 = 0.0669 | 33/493 = **0.0669** | False | **byte-exact — the live citation-enforcement hook** |
| sph_water_dfsph_generator | 0.80 | 0/127 = 0.0000 | 0/127 = **0.0000** | False | **byte-exact — runner tests the committed table, not the generator (B-2a)** |

## Harness-fidelity control (the dispatch's requirement)
**7 of 11 targets reproduce the prior run BYTE-FOR-BYTE** (identical killed AND total):
render_similarity, capture, incompressible_ns_2d_mms, determinism, code_verification_mms,
cat4_draft_time, sph_water_dfsph_generator. reaction_diffusion_3d_mms reproduces within 1 mutant.
The 2 divergences (equivalence, property) are explained by genuine source growth between the pin and
HEAD (more mutants generated; kills unchanged → score drops). **This is strong fidelity** — the
measured scores are trustworthy signal, not harness noise. (A single known-good baseline reproducing
was the asked-for control; 7 byte-exact reproductions exceed it.)

## B-2 verdict
**10 of 11 below the §2.13 threshold; only reaction_diffusion_3d_mms (0.8295 ≥ 0.80) passes.**
The 7 core self-integrity modules:
cat4_draft_time **0.0669** (citation hook) · sph_water_dfsph_generator **0.0000** (B-2a) ·
property **0.2034** (PBT harness) · code_verification_mms **0.2650** (MMS framework) ·
golden **0.2696** · equivalence **0.4811** · determinism **0.5338** · capture **0.6777**.
CI (`mutation-testing.yml`) runs only `--baseline` — it never measures any of this.

The tools that gate every sim, MMS, citation, and property test catch a minority of injected faults,
and CI never measures it. Remediation in execution-report.md §R1.

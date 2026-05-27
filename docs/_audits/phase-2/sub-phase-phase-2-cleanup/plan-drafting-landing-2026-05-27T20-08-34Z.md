---
date: 2026-05-27T20-08-34Z
author: phase-2-cleanup-plan-drafting-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-plan-drafting
stage: plan-drafting-landing
verdict: SHIFTED-with-notes
head_sha: 4dac480db90b2c7b07fe72b12f9739b83b63ee25
head_sha_at_checkpoint: 4dac480db90b2c7b07fe72b12f9739b83b63ee25
evidence_paths:
  - tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md
  - docs/phases/sub-phase-phase-2-cleanup.md
evidence_hashes:
  tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md: sha256:f090fde24c3a091a59ace74dc249b5f3ddfb9b4332f1b458c7fa1e89a9e1da8c
  docs/phases/sub-phase-phase-2-cleanup.md: sha256:59f50090194772e1b1a69c04450ca0d3cbdded11ab65538347c13fcde4e7bf23
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# Plan-drafting landing audit — sub-phase-phase-2-cleanup

**Verdict: SHIFTED-with-notes.** The probe + charter are sound and the basket is fully
enumerated; the plan is ready for Stage 0 dispatch **with two notes** (the precondition-5
deviation and UNKNOWN-2; § 2 / § 5). SHIFTED rather than CONFIRMED because precondition-5
surfaced a finding (`test_i7_no_agent_tags.py` over-strict) that needs charter handling
(folded into Cluster D / PD-1) and an operator confirmation at Stage 0. This does **not**
mean any cleanup item is resolved.

## § 1 — Commit chain (this plan-drafting session)

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | probe report | `tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md` | `71483f17e8bff824143d7bcdda97c66a09f329d6` |
| 2 | charter | `docs/phases/sub-phase-phase-2-cleanup.md` | `4dac480db90b2c7b07fe72b12f9739b83b63ee25` |
| 3 | this landing audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md` | `95a24d99d07de1758e5034b0d39669e6172e0f0a` (back-filled in COMMIT 4 per Convention #12) |
| 4 | SHA back-fill ledger | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (terminal artifact) |

Probe sha256 `f090fde2…1da8c`; charter sha256 `59f50090…7bf23` — both recorded in front-matter
`evidence_hashes` (a YAML mapping, per the verify_evidence contract — [[cat1-scans-probes-evidence-hashes-mapping]])
and verifiable by `verify_evidence` at this audit's `head_sha`.

## § 2 — Preconditions (5 PASS / 1 DEVIATION)

| # | Precondition | Result | Evidence |
|---|---|---|---|
| 1 | HEAD = `v0.2.1-sub-phase-lfs-architecture` or successor | **PASS** | `git describe --tags` → `v0.2.1-sub-phase-lfs-architecture-2-ge1fc154` (HEAD was `e1fc154` at session start) |
| 2 | `v0.2.1-sub-phase-lfs-architecture` on origin | **PASS** | `git ls-remote --tags origin` → `8f4dea3…^{}` |
| 3 | integrity 0 HARD_FAIL; baseline held | **PASS** | `0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 (stderr) = `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (exact) |
| 4 | verify_evidence on lfs Stage-2 sub-phase-landing | **PASS** | `24 pass / 0 fail` |
| 5 | `pytest tools/testkit/lfs_migration/`: 16 passed | **DEVIATION (15/1)** | `test_i7_no_agent_tags.py::test_no_tag_points_into_subphase_range` red — see § 5 / probe § 0.1 |
| 6 | post-reset CI green-check observed | **UNKNOWN-1** | before May 31/Jun 1 reset; `cpp-strict`+`python-strict` red (expected), 7 others green |

CLI note: integrity flag is `--all` not `--check-all` (dispatch-brief drift, same as lfs probe
self-recorded); interpreter is `.venv/bin/python` (`python` absent — [[bit-physics-uv-sync-prunes-venv]]).

## § 3 — Enumeration summary

| Bucket | Count |
|---|---|
| Phase-2 § 13 inventory (`docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:316-363`) | 41 (operator "~41" = **exact**) |
| — RESOLVED upstream (verify-and-close) | 4 (§ 13 #4, #7, #15, #34) |
| — routed OUT (sibling-sized) | ~6 (§ 13 #8, #36, #37, #40, #9-residual, #29-borderline) |
| Operator known-pre-queued (net-new) | 8 (K-2…K-6, K-7a/b/c) |
| Probe-discovered (net-new) | 4 (PD-1…PD-4) |
| **Total distinct cleanup items** | **53** |
| Clusters | 7 (A–G; F = verify-and-close) |
| D-class decisions | 6 (D1–D6) |
| UNKNOWNs for Stage 0 | 2 |
| Hard Rule 2 STOPs at plan-drafting | 0 |

Full tables: probe report § P1 / § P2 / § P3 / § P3.X. Cluster catalog + execution order +
D-class detail: charter § 3 / § 4 / § 5.

## § 4 — D-class decisions surfaced (charter § 5 has detail + leans)

- **D1** — § 2.13 golden-path scope (fix executed plans; leave `phase-3-plan.md` for Phase-3).
- **D2** — branch-protection live-vs-spec (live = 404 nothing configured; doc's own rule leans
  amend-doc; security argues apply-rules; operator routes).
- **D3** — § D.2 intermediate-tag amendment wording (agent draft for operator ratification).
- **D4** — CODEOWNERS agent-id sentinel granularity (lean per-package).
- **D5** — ADR alignment (lean defer-dir, cross-reference only).
- **D6** — differential-testing terminology (lean cross-reference only, no rename).

## § 5 — Verdict, precondition-5 disposition, banked note

**VERDICT: SHIFTED-with-notes.** Hard Rule 2 STOP conditions checked; **none triggered**:
no item required editing a published audit at plan-drafting; no item proved sub-phase-sized
that was absorbed (~6 routed OUT to charter § 9); no fifth substantive architecture fault in a
prior sub-phase (PD-1 is a hygiene over-strictness in a test, not a design fault); invariants
I1–I7 substantively hold (incl. I7 — § below); integrity baseline `c19492ad…d22cb52` held
byte-for-byte; § 13 is exactly 41 (no count discrepancy).

**(FACT) Precondition-5 disposition.** `pytest tools/testkit/lfs_migration/` = 15 passed / 1
failed. The failure is `tools/testkit/lfs_migration/test_i7_no_agent_tags.py:29-34`, which
asserts **no tag of any kind** points into the sub-phase range — written at lfs Stage-1a under
the premise "this sub-phase pushes no tag" (`tools/testkit/lfs_migration/test_i7_no_agent_tags.py:5`).
The operator legitimately pushed `v0.2.1-sub-phase-lfs-architecture` → `8f4dea3` (which
preconditions 1+2 require to exist); the tag carries **no `-phase-N` segment**, so the
substantive invariant **I7 HOLDS** (no *agent*-pushed tag; phase tags are operator-only — spec
§ 7.12; `docs/conventions/sub-phase-conventions.md:249`; reasoned at
`docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md:451-454`).
The test's "no tag in range" proxy is **over-strict** relative to the invariant it guards. This
is a **dispatch-internal contradiction** (preconditions 1+2 vs 5), not a regression. Because
plan-drafting is zero-execution-risk documentation and the failing test is **itself a cleanup
item** (probe PD-1, charter Cluster D) coupled to known item 5 (§ D.2 amendment, D3), the agent
**PROCEEDS** and folds the fix into the basket, carrying **UNKNOWN-2** (operator confirms PROCEED
vs hard-STOP) to Stage 0. Verdict lowered to SHIFTED-with-notes accordingly. Full analysis:
probe § 0.1.

**(Banked note BL-CLN1)** A test that encodes an invariant via a proxy stricter than the
invariant itself can go red on a *legitimate* action the invariant permits. PD-1 is the instance;
the structural lesson is "assert the invariant, not a convenient over-approximation of it."
Candidate for conventions § L formalization at Stage 2 if the operator routes it.

## § 6 — Acceptance (verified at this landing, regression-checked post-back-fill)

- `integrity --all --mode strict` → 0 HARD_FAIL / 14 SOFT_WARN; baseline `c19492ad…d22cb52` held.
- `verify_evidence --audit <this landing>` → PASS (probe + charter sha256 match at `head_sha`).
- `verify_evidence` on lfs Stage-2 landing (regression) → 24 pass / 0 fail.
- `pytest tools/testkit/lfs_migration/` → 15 passed / 1 failed (the documented PD-1 deviation;
  not a new regression — pre-existing the moment the operator pushed the tag).
- Charter enumerates every § P1+§P2+§P3 item; no fabrications (Convention #8).

## Conventions honored

Convention #8 (every claim grep-/command-/file-verified; the 41-count, the 19-occurrence
golden-path count, the live-404 branch-protection state, and the §L.10 absence are all verified,
not asserted); Convention M (re-anchored against live HEAD `e1fc154`/`4dac480` before writing);
Convention A (this landing audit is a net-new file; the back-fill lands after it); Convention #12
(SHA back-fill is the separate COMMIT 4, never `--amend`); cat-1 intra-repo full-path citations
in the probe report; `evidence_paths` a list / `evidence_hashes` a YAML mapping (the
verify_evidence contract — [[cat1-scans-probes-evidence-hashes-mapping]]); four-state verdicts
(SHIFTED-with-notes compound); FACT/INFERENCE tagging; no tag pushed by the agent (I7).

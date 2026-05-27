---
date: 2026-05-27T22-28-49Z
author: phase-2-cleanup-stage-1-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-stage-1-d
stage: stage-1-d-checkpoint
verdict: CONFIRMED-Stage-1-D
head_sha: 3c9d926e7682f182523e6762322e0c84cbe493ef
head_sha_at_checkpoint: 3c9d926e7682f182523e6762322e0c84cbe493ef
evidence_paths:
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/lfs_migration/test_i7_no_agent_tags.py
  - docs/ops/branch-protection.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:7ff93a5b6f7566a467ee45e2b65dea9bd7d81e82d27197a96c68f229bc8b31f6
  tools/testkit/lfs_migration/test_i7_no_agent_tags.py: sha256:b07a6f0c65f97087f5e2d4b2d6aedf97bb4628bf582d8a98fd3ab2a5a8b6d1b9
  docs/ops/branch-protection.md: sha256:7d58ff6379cc20d92532a4f3b1910ad5fa40d3b1005e761d16b7ab386e823e6b
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# Stage-1.D checkpoint audit — sub-phase-phase-2-cleanup (Cluster D: branch-protection & tag governance)

**Verdict: CONFIRMED-Stage-1-D.** All four items resolved cleanly. D3 (§ D.2 intermediate-tag
conditions) drafted + landed; PD-1 (I7 guard re-encoding) resolved → pytest **16/0**; D2
(branch-protection live-state amendment) landed; K-4/M0 confirmed no-op; § 13 #41 resolved via D3.
No STOP fired (the PD-1 encoding is declarative, not brittle). Integrity baseline held byte-for-byte;
I1–I7 hold. **§ D.2 wording is now drafted (the soft-dep feed to Cluster 1.B / K-5).**

## § 1 — Cluster-open re-anchor (Convention M)

Re-anchored at HEAD `c4b75a8` → cluster start. `git tag --contains v0.2.0-phase-2` →
`{v0.2.0-phase-2, v0.2.1-sub-phase-lfs-architecture}` (confirmed the over-strict test's single
failing case). § D.2 read at HEAD (lines 245-249 pre-edit). branch-protection.md re-confirmed against
live state: `gh api .../branches/main/protection` → **404 "Branch not protected"**.

## § 2 — Item-by-item disposition

| Item | Disposition | Commit | Evidence |
|---|---|---|---|
| **D3** § D.2 intermediate-tag conditions | **RESOLVED** | `6674bc6` | conventions § D.2 amended with the operator-ratified principle: default NO, except sub-phase (a) adds external dependency / (b) durable architecture / (c) operator-judged significance; default NO for hygiene. Two permitted forms (`v0.1.1`, `v0.x.y-sub-phase-<name>`); precedent `v0.2.1-sub-phase-lfs-architecture`. Operator-pushed only (I7). **No nuance beyond the ratified principle surfaced → no STOP** |
| **PD-1** I7 guard re-encoding | **RESOLVED** | `d861274` | `test_no_tag_points_into_subphase_range` (over-strict "no tag in range") → `test_no_agent_pushed_tag_in_subphase_range`: declarative operator-sanctioned-tags allowlist (`OPERATOR_PHASE_TAGS ∪ OPERATOR_NONPHASE_TAGS`); in-range tag absent from allowlist presumed agent-pushed → HARD_FAIL. **pytest 16/0** (was 15/1); ruff + mypy --strict clean; set-logic sim confirms pass-for-operator-tag + catch-agent-tag. References § D.2. **NOT brittle** (no git-history-of-pusher) → no STOP |
| **D2 / K-6** branch-protection live-vs-spec drift | **RESOLVED** | `3c9d926` | live-state amendment to `docs/ops/branch-protection.md`: rules are DESIGNED-but-unenforced (404); per the doc's own drift rule the doc is amended to match; solo+agent equivalents named (Convention M + Hard Rule 2 + append-only chain + CI + I7); forward-routing note ("implement-live-branch-protection" if contributor model grows) |
| **K-4 / M0** mutation re-tier required-check removal | **RESOLVED (no-op)** | `3c9d926` | confirmed no-op — with protection at 404 there is no required-status-check set to remove. Inline M0 note updated |
| **§ 13 #41** point-release tag decisions (lean NO) | **RESOLVED** | `6674bc6` | encoded in the D3 § D.2 amendment (default NO + the three when-appropriate conditions + hygiene-default-NO) |

## § 3 — Soft-dependency to Cluster 1.B (§ D.2 wording)

The plan's soft-dep **1.D → 1.B** is satisfied: the § D.2 wording (K-5) is **drafted here at 1.D**
(commit `6674bc6`), so Cluster 1.B **confirms/cross-references it without a second touch of § D.2**
(avoids the double-edit the plan warned against). PD-1's guard references § D.2 as the authoritative
source on operator-sanctioned non-phase tags.

## § 4 — Commit boundaries (R-4)

| Commit | Theme | File | Net |
|---|---|---|---|
| `6674bc6` | D3 § D.2 intermediate-tag conditions | `docs/conventions/sub-phase-conventions.md` | +9 |
| `d861274` | PD-1 I7 guard re-encoding | `tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | rewrite |
| `3c9d926` | D2 branch-protection live-state + M0 no-op | `docs/ops/branch-protection.md` | +26 / −5 |

## § 5 — Invariant verification (I1–I7) at HEAD `3c9d926`

| I | Invariant | State | Evidence |
|---|---|---|---|
| I1 | LFS pointer/content unchanged | **HOLD** | only `docs/` + the test edited; no `captures/`/LFS pointer touched |
| I2 | Cross-phase replay bit-identity | **HOLD** | the test guards tag-governance, not sim numerics; no sim/integrity-logic change |
| I3 | integrity 0 HARD_FAIL; baseline byte-for-byte | **HOLD** | `0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 `c19492ad…d22cb52` |
| I4 | verify_evidence GREEN (no regression) | **HOLD** | 1.A 8/0, 1.C 8/0, 1.E 10/0, 1.F 10/0; this checkpoint resolves at `3c9d926` |
| I5 | append-only (no published audit edited) | **HOLD** | net-new audit; conventions/branch-protection are docs, test is code |
| I6 | Convention #12 SHA back-fill separate commit | **HOLD** | back-fill is the separate next commit |
| I7 | no agent-pushed tags | **HOLD (now correctly guarded)** | the guard itself is the I7 mechanism; pytest 16/0 confirms it passes for the operator tag + catches agent tags. No tag pushed by the agent this cluster |

## § 6 — Verification sweep (FACT)

- `.venv/bin/python -m integrity --all --mode strict` → `0 HARD_FAIL, 14 SOFT_WARN`; full-report
  sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (baseline held).
- `pytest tools/testkit/lfs_migration/` → **16 passed / 0 failed** (PD-1 acceptance met — the
  precondition-6 deviation is now resolved; subsequent clusters maintain 16/0).
- `ruff check` + `mypy --strict` on the rewritten test → clean.
- `gh api .../branches/main/protection` → 404 (D2 / M0 basis).

## § 7 — Exit state

Cluster D **CONFIRMED-Stage-1-D**: D3, PD-1, D2, K-4/M0, § 13 #41 RESOLVED. pytest now **16/0**.
§ D.2 wording drafted (soft-dep feed to 1.B). No scope absorbed; no STOP. Next cluster per dispatch
order: **1.B** (conventions / methodology reconciliation; consumes the § D.2 wording).

## Conventions honored

Convention #8 (PD-1 encoding + 16/0 + 404 grep-/command-verified; the operator's D3 principle encoded
verbatim, no fabrication); Convention M (re-anchored at HEAD; tag-range confirmed); Convention A
(net-new checkpoint; back-fill follows); Convention #12 (SHA back-fill separate next commit); R-4 (one
commit per theme); Hard Rule 2 (PD-1 encoding assessed for brittleness — declarative allowlist, no
STOP needed; D3 wording assessed for nuance — none beyond the ratified principle, no STOP);
`evidence_paths` a list / `evidence_hashes` a YAML mapping; four-state verdict (CONFIRMED-Stage-1-D);
FACT/INFERENCE tagging; no agent-pushed tag (I7).
</content>

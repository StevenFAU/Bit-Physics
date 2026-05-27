---
date: 2026-05-27T22-20-04Z
author: phase-2-cleanup-stage-1-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-stage-1-e
stage: stage-1-e-checkpoint
verdict: CONFIRMED-Stage-1-E
head_sha: eddd86e55a3d89ec05c9dcb1284abc17126f426f
head_sha_at_checkpoint: eddd86e55a3d89ec05c9dcb1284abc17126f426f
evidence_paths:
  - CHANGELOG.md
  - .gitignore
  - docs/phases/sub-phase-common-cpp-bootstrap.md
  - common/common-cpp/tests/sha256_util.hpp
  - common/common-py/smoke/hello_taichi.py
evidence_hashes:
  CHANGELOG.md: sha256:27165231e2139caabf134494bc77ade99210236a6a653636061b5ce48a3e1e72
  .gitignore: sha256:8e82ddf832c4a6ff6209b8fed96a52a9189b03f93875df495221c0b62e340c10
  docs/phases/sub-phase-common-cpp-bootstrap.md: sha256:ea93c2bdff6a1c582fc1880c2af775a8ca097769b73bf47519da159d9b8e3692
  common/common-cpp/tests/sha256_util.hpp: sha256:a3b953c5fc7a90adf86cdafc0c203f6b0a94f681d877b4c5505938e62931ed2a
  common/common-py/smoke/hello_taichi.py: sha256:1bd7df2d5d1caf63a7aae0602adf9c2e55d823a9a7d486c061bece7342e3e412
deferred_items:
  - "§13 #27 sha256_util.hpp shim — DEFER (removal gate not met: still cited in current common-cpp-bootstrap Stage-1a evidence_paths; removable only once those audits are historical)"
  - "§13 #20 residual — CHANGELOG release-section workflow (when/how [Unreleased] promotes to a named release section, e.g. [0.2.0-phase-2]) → charter §9, own small release-management dispatch"
ci_activation: []
top_level_deps_to_merge: []
---

# Stage-1.E checkpoint audit — sub-phase-phase-2-cleanup (Cluster E: working-tree & doc-truth hygiene)

**Verdict: CONFIRMED-Stage-1-E.** All five cluster items disposed cleanly. #20 (CHANGELOG
split-location), #24 (working-tree clutter), #26 (project-state.md doc-truth) RESOLVED; #38
VERIFY-CLOSE (exemplar exists); #27 DEFER (removal gate unmet). One operator-ratified STOP-and-surface
(#20 release-structure routing). Integrity baseline held byte-for-byte; I1–I7 hold.

## § 1 — Cluster-open re-anchor (Convention M)

Re-anchored each item at HEAD (`f4c1271` → cluster start). Two items revealed nuance contradicting
their §13 framing (surfaced per Convention #8, not silently absorbed):

- **#24** — the §13 framed the taylor-green captures as "stray untracked … gitignore-or-remove";
  inspection shows they are the **intentional held-local gate-14 captures** (eulerian-smoke 3D
  Taylor-Green, 128³ step-500, ~738 MB each), held local per D13/D14 (LFS-bandwidth conservation),
  with sha256 digests recorded in the eulerian-smoke-stack-{d,e} audits. `verify_evidence` on those
  audits PASSES without them (evidence_paths cite the canonical `captures/eulerian-smoke-ref/` copy).
  → **gitignore, NOT remove** (preserve for the pending D13/D14 routing).
- **#20** — the entries are not "missing"; they are **misfiled** (a real split-location bug; § 2).

## § 2 — Item-by-item disposition

| Item | Disposition | Commit | Evidence |
|---|---|---|---|
| **#20** CHANGELOG split-location | **RESOLVED** | `3216b2e` | 7 Phase-2 sub-phase sections were misfiled under the released `## [0.1.0-phase-1]` header; relocated as a contiguous block to the end of `## [Unreleased]` (joining the 16 already there). **Byte-exact** (X+M+P+Z reorder; sorted line multiset identical, 1995 lines; `collections.Counter` equal). [0.1.0-phase-1] now holds only its Phase-1 Added/Notes; all 3 seams clean. Release-section workflow deferred (§ 6) |
| **#24** working-tree clutter | **RESOLVED** | `eddd86e` | `.gitignore` ignores `.claude/`, `imgui.ini`, + the two held-local taylor-green captures (with documenting comment). `git status --porcelain` post-edit shows only tracked changes — clutter gone. Captures preserved (not removed) for D13/D14 |
| **#26** project-state.md doc-truth (B-CPPB2) | **RESOLVED** | `eddd86e` | doc-truth note added to `docs/phases/sub-phase-common-cpp-bootstrap.md` § 4: `docs/project-state.md` never adopted (early convergence-file model artifact); status tracked in landing audits + per-phase ledgers (`docs/_audits/phase-0/ledger.md`). Sibling-charter recurrence noted; phase-5 mention correctly "if present"-guarded (R-2, unexecuted — not touched) |
| **#38** taichi smoke-kernel exemplars | **VERIFY-CLOSE** | — | the planned `_make_taichi_diffuse` name does not exist, but the realized exemplar `common/common-py/smoke/hello_taichi.py` (with `step_diffuse()` kernel) **does**, and was **consumed by RD-2D-stack-d** as the structural template (TAICHI landing item 8 + RD2D-stack-d plan-drafting "CONSUMED at this sub-phase: hello_taichi.py"). No gap |
| **#27** sha256_util.hpp shim | **DEFER (gate unmet)** | — | the shim is "removable once 1a audits historical" — it is **still cited in current evidence_paths** (`docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1a-checkpoint-2026-05-25T21-00-00Z.md` + the stage-1a-evidence-vulkan audit). Removing it now breaks `verify_evidence` on those published audits (R-1 adjacent). Gate not met → stays |

## § 3 — Commit boundaries (R-4)

| Commit | Theme | Files | Net |
|---|---|---|---|
| `3216b2e` | #20 CHANGELOG reorg (byte-exact relocation) | `CHANGELOG.md` | +416 / −416 (pure move) |
| `eddd86e` | #24 gitignore + #26 doc-truth note | `.gitignore`, `docs/phases/sub-phase-common-cpp-bootstrap.md` | +28 / 0 |

## § 4 — STOP-and-surface event (#20; operator-ratified)

The CHANGELOG fix's *target structure* is a release-management judgment (move-to-[Unreleased] vs
create-a-[0.2.0-phase-2]-release-section), distinct from the mechanical misfiling bug. Surfaced;
operator **ratified Option 1** (move misfiled → [Unreleased]; defer the release-section workflow to
its own dispatch). No scope absorbed.

## § 5 — Invariant verification (I1–I7) at HEAD `eddd86e`

| I | Invariant | State | Evidence |
|---|---|---|---|
| I1 | LFS pointer/content unchanged | **HOLD** | `.gitignore` adds ignore-patterns but changes no **tracked** LFS content; no `captures/` tracked file or pointer edited (the held-local captures are untracked) |
| I2 | Cross-phase replay bit-identity | **HOLD** | no code / integrity-logic change |
| I3 | integrity 0 HARD_FAIL; baseline byte-for-byte | **HOLD** | `0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 `c19492ad…d22cb52` |
| I4 | verify_evidence GREEN (no regression) | **HOLD** | 1.A 8/0, 1.C 8/0; this checkpoint resolves at `eddd86e` |
| I5 | append-only (no published audit edited) | **HOLD** | net-new audit; CHANGELOG/charter are docs (CHANGELOG reorder preserves the multiset; #27 NOT removed precisely to keep published-audit evidence intact) |
| I6 | Convention #12 SHA back-fill separate commit | **HOLD** | back-fill is the separate next commit |
| I7 | no agent-pushed tags | **HOLD** | no tag pushed |

## § 6 — Charter § 9 deferred-OUT / banked additions

- **#27** → DEFER (gate-conditioned; revisit when the common-cpp-bootstrap Stage-1a audits are historical).
- **#20 residual** → charter § 9: *CHANGELOG release-section workflow* — when/how `[Unreleased]`
  content is promoted to a named release section (e.g. `[0.2.0-phase-2]`, `[0.2.1-sub-phase-lfs-architecture]`).
  All Phase-2 work has implicitly deferred this; not hygiene (requires a workflow decision) → own small dispatch.

## § 7 — Verification sweep (FACT)

- `.venv/bin/python -m integrity --all --mode strict` → `0 HARD_FAIL, 14 SOFT_WARN`; full-report
  sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (baseline held).
- CHANGELOG reorder byte-exact: `collections.Counter(pre) == collections.Counter(post)`, 1995 lines.
- `git status --porcelain` post-#24 → only tracked changes (clutter ignored).
- `pytest tools/testkit/lfs_migration/` → `15 passed, 1 failed` (PD-1; unchanged; Cluster D fixes it).

## § 8 — Exit state

Cluster E **CONFIRMED-Stage-1-E**: #20/#24/#26 RESOLVED; #38 VERIFY-CLOSE; #27 DEFER (gate). No scope
absorbed. Next cluster per dispatch order: **1.F** (verify-and-close already-resolved § 13 items).

## Conventions honored

Convention #8 (byte-exact multiset verified; #24/#20 framing-contradictions surfaced not absorbed;
#38/#27 grep-verified); Convention M (re-anchored at HEAD); Convention A (net-new checkpoint; back-fill
follows); Convention #12 (SHA back-fill separate next commit); R-1 (#27 not removed — published-audit
evidence preserved); R-2 (phase-5 unexecuted mention not touched); R-4 (one commit per theme); Hard
Rule 2 (#20 release-structure surfaced + ratified); `evidence_paths` a list / `evidence_hashes` a YAML
mapping; four-state verdict (CONFIRMED-Stage-1-E); FACT/INFERENCE tagging; no agent-pushed tag (I7).
</content>

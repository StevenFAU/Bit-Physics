---
artifact: sha-back-fill-ledger
artifact_id: sub-phase-common-cpp-bootstrap-stage-0
stage: stage-0
phase: 2
date: 2026-05-25T19-30-00Z
head_sha_at_checkpoint: 134d7bee67c3deae3dfb3cae5b0ab88953fe0748
verdict: ledger — back-fills Stage-0 evidence + checkpoint head_sha per Convention #12 (N1)
---

# SHA back-fill ledger — common-cpp-bootstrap Stage 0 (Convention #12 / N1)

Stage-0 evidence + checkpoint were committed together (COMMIT 1); their `head_sha`
placeholders both resolve to that single committing commit. Back-fill is a SEPARATE
commit (COMMIT 2; never `--amend`); this ledger is the recursion-stopper.

**N1-tightened enumeration:**

| Audit | Placeholder token(s) | Committing commit (head_sha) | Back-fill |
|---|---|---|---|
| `stage-0-evidence-vulkan-lavapipe-determinism-2026-05-25T19-30-00Z.md` | front-matter `head_sha` ×1 | `d43d09847a5d6a7e68d7d026d6aed81b7447fcb4` | → `d43d0984…` |
| `stage-0-checkpoint-2026-05-25T19-30-00Z.md` | front-matter `head_sha` ×1 | `d43d09847a5d6a7e68d7d026d6aed81b7447fcb4` | → `d43d0984…` |
| `stage-0-integrity-sweep-…txt` / `stage-0-replay-…txt` / `stage-0-evidence/*` | NONE (evidence files; no front-matter `head_sha`) | (COMMIT 1) | — |
| `stage-0-sha-back-fill-2026-05-25T19-30-00Z.md` (this ledger) | NONE (recursion-stopper) | (COMMIT 2) | — |

**Commit chain (2-commit Stage-0 pattern per smoke-E/LBM-E precedent):**
1. COMMIT 1 — `docs(common-cpp-bootstrap-stage-0): pre-flight checkpoint + lavapipe/Vulkan determinism baseline (a7f85bd4...) + shaderFloat64 probe` → `d43d0984…`
2. COMMIT 2 — `chore(common-cpp-bootstrap-stage-0-sha-backfill): back-fill head_sha per Convention #12 + N1 enumeration` (this commit; back-fills COMMIT 1's two audits + adds this ledger).

**Terminal discipline:** NO push, NO tag (operator action per spec § 7.12 + D12).

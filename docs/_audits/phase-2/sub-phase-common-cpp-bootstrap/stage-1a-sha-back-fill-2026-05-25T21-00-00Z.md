---
artifact: sha-back-fill-ledger
artifact_id: sub-phase-common-cpp-bootstrap-stage-1a
stage: stage-1a
phase: 2
date: 2026-05-25T21-00-00Z
head_sha_at_checkpoint: ff0866769cd0da2cb345698c7ece3cda7316bdb4
verdict: ledger — back-fills Stage-1a checkpoint + evidence head_sha per Convention #12 (N1)
---

# SHA back-fill ledger — common-cpp-bootstrap Stage 1a (Convention #12 / N1)

Stage 1a used a 4-commit chain (heavier than Stage-0's 2-commit, per dispatch).
The checkpoint + evidence (COMMIT 3) carried `head_sha` placeholders that resolve
to COMMIT 3's own committing sha. Back-fill is a SEPARATE commit (COMMIT 4; never
`--amend`); this ledger is the recursion-stopper.

**N1-tightened enumeration:**

| Audit | Placeholder token(s) | Committing commit (head_sha) | Back-fill |
|---|---|---|---|
| `stage-1a-checkpoint-2026-05-25T21-00-00Z.md` | front-matter `head_sha` ×1 (`<pending-stage-1a-checkpoint-commit-sha-backfill>`) | `d116be4a03da673015cbc95d209167b4e838c786` | → `d116be4a…` |
| `stage-1a-evidence-vulkan-compute-substrate-2026-05-25T21-00-00Z.md` | front-matter `head_sha` ×1 (same token) | `d116be4a03da673015cbc95d209167b4e838c786` | → `d116be4a…` |
| `stage-1a-integrity-sweep-…txt` / `stage-1a-replay-…txt` | NONE (evidence captures; no front-matter `head_sha`) | (COMMIT 3) | — |
| substrate source / shaders / tests / CMakeLists / top-level CMakeLists | NONE (code; COMMIT 1 + COMMIT 2) | (COMMIT 1 `736b264…` / COMMIT 2 `aa6553c…`) | — |
| `stage-1a-sha-back-fill-2026-05-25T21-00-00Z.md` (this ledger) | NONE (recursion-stopper) | (COMMIT 4) | — |

**Commit chain (4-commit Stage-1a pattern):**
1. COMMIT 1 — `feat(common-cpp-bootstrap-stage-1a): Vulkan compute substrate + SPIR-V build-time wiring (gate C-3)` → `736b264bfd00193ab2fede17563ace417629b594`
2. COMMIT 2 — `build(common-cpp-bootstrap-stage-1a): top-level CMake registration (D6)` → `aa6553c160e8edac9aefe993502e1847bda8cfa4`
3. COMMIT 3 — `docs(common-cpp-bootstrap-stage-1a): C-3 checkpoint + Vulkan-compute-substrate evidence` → `d116be4a03da673015cbc95d209167b4e838c786`
4. COMMIT 4 — `chore(common-cpp-bootstrap-stage-1a-sha-backfill): back-fill head_sha per Convention #12 + N1 enumeration` (this commit; back-fills COMMIT 3's two audits + adds this ledger).

**Terminal discipline:** NO push, NO tag (operator action per spec § 7.12 + D12).

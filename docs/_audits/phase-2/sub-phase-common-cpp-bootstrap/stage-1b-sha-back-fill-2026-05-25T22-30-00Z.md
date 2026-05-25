---
artifact: sha-back-fill-ledger
artifact_id: sub-phase-common-cpp-bootstrap-stage-1b
stage: stage-1b
phase: 2
date: 2026-05-25T22-30-00Z
head_sha_at_checkpoint: cb11ede62b9f1859b912173c6cfe2010f8f74ed3
verdict: ledger — back-fills Stage-1b checkpoint + evidence head_sha per Convention #12 (N1)
---

# SHA back-fill ledger — common-cpp-bootstrap Stage 1b (Convention #12 / N1)

Stage 1b used a 4-commit chain (two implementation commits — C-2 then C-1 —
because `CMakeLists.txt` couples all sources and interactive `git add -p` is
unavailable; the HDF5 CMake blocks were edited out for COMMIT 1 and back in for
COMMIT 2 so each implementation commit builds). The checkpoint + evidence
(COMMIT 3) carried `head_sha` placeholders resolving to COMMIT 3's own committing
sha. Back-fill is a SEPARATE commit (COMMIT 4; never `--amend`); this ledger is
the recursion-stopper.

**N1-tightened enumeration:**

| Audit | Placeholder token(s) | Committing commit (head_sha) | Back-fill |
|---|---|---|---|
| `stage-1b-checkpoint-2026-05-25T22-30-00Z.md` | front-matter `head_sha` ×1 (`<pending-stage-1b-checkpoint-commit-sha-backfill>`) | `d962069962e2bedced629667b97efdaff8651751` | → `d9620699…` |
| `stage-1b-evidence-determinism-capture-2026-05-25T22-30-00Z.md` | front-matter `head_sha` ×1 (same token) | `d962069962e2bedced629667b97efdaff8651751` | → `d9620699…` |
| `stage-1b-integrity-sweep-…txt` / `stage-1b-replay-…txt` | NONE (evidence captures; no front-matter `head_sha`) | (COMMIT 3) | — |
| socket/hash/FloatControls/NoContraction source + tests | NONE (code; COMMIT 1 `fd84ab98…`) | (COMMIT 1) | — |
| HDF5 capture-v1 source + test | NONE (code; COMMIT 2 `826b4ff0…`) | (COMMIT 2) | — |
| `stage-1b-sha-back-fill-2026-05-25T22-30-00Z.md` (this ledger) | NONE (recursion-stopper) | (COMMIT 4) | — |

**Commit chain (4-commit Stage-1b pattern):**
1. COMMIT 1 — `feat(common-cpp-bootstrap-stage-1b): determinism socket + FloatControls/NoContraction discipline (gate C-2)` → `fd84ab9883dcbe856544a2e85103b8d3c21d6015`
2. COMMIT 2 — `feat(common-cpp-bootstrap-stage-1b): HighFive HDF5 capture-v1 writer/reader (gate C-1)` → `826b4ff05d0cd3593babf9eb13283fb1d03a478a`
3. COMMIT 3 — `docs(common-cpp-bootstrap-stage-1b): C-1 + C-2 checkpoint + determinism/capture evidence` → `d962069962e2bedced629667b97efdaff8651751`
4. COMMIT 4 — `chore(common-cpp-bootstrap-stage-1b-sha-backfill): back-fill head_sha per Convention #12 + N1 enumeration` (this commit; back-fills COMMIT 3's two audits + adds this ledger).

**Terminal discipline:** NO push, NO tag (operator action per spec § 7.12 + D12).

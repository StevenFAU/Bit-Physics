---
date: 2026-05-23T22-29-56Z
author: audit-chain-correctness-sub-phase-agent
phase: 2
artifact: stage
artifact_id: audit-chain-correctness-stage-1a
subject: "Stage 1a CLOSE — verify_evidence LFS-content-OID fix landed. Mechanism A (pointer-stub-sniff) in tools/integrity/integrity/common/repo.py lfs_pointer_oid(); verify_evidence.py:113 hash site compares parsed content OID for LFS pointers, git-blob sha256 otherwise. Pure/offline OID-parse — no git-lfs-smudge/network/auth (R-A1 dissolution path). mismatch→error preserved (R-A4); --strict untouched. +5 tests (10 passed; 5 existing GREEN); full integrity package 56 passed; ruff clean. Pre-fix verify_evidence on RD-2D Stack-D landing 29/2 → post-fix 31/0 (§B.6 Mode 2 RESOLVED on real data). §B.6 amendment additive; NEW conventions doc baseline sha256 2638dd2854c2841b4c1a56449183afe7091f48d90a9e28694841f8a72d9cf7c1 (was 167fe349…f2c58c2e). IC-16 formalized. Verdict CONFIRMED; 0 new shifts; cumulative 122."
verdict-state: CONFIRMED
head_sha: 5c90bc92abdfd533ec9121503bdaa3dd49f1995a
head_sha_at_checkpoint: 5c90bc92abdfd533ec9121503bdaa3dd49f1995a
parent_audits:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-landing-2026-05-23T22-04-39Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-checkpoint-2026-05-23T22-17-45Z.md
evidence_paths:
  - tools/integrity/integrity/common/repo.py
  - tools/integrity/integrity/scripts/verify_evidence.py
  - tools/integrity/tests/test_verify_evidence.py
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-evidence/verify-evidence-prefix-2026-05-23T22-29-56Z.txt
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-evidence/verify-evidence-postfix-2026-05-23T22-29-56Z.txt
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-evidence/pytest-2026-05-23T22-29-56Z.txt
evidence_hashes:
  tools/integrity/integrity/common/repo.py: sha256:c99810d92a0e6089cd29eeef2fbd6800b83d98f1775272b1990341893108f5bd
  tools/integrity/integrity/scripts/verify_evidence.py: sha256:1c46bc72d1c020a56075bdc811d96917a44396c920458d95f49f9e18c25c1b4a
  tools/integrity/tests/test_verify_evidence.py: sha256:54942d593723a5d374acec1bf934f9b813295e692cc0b5618006afbcbc25cfaf
  docs/conventions/sub-phase-conventions.md: sha256:2638dd2854c2841b4c1a56449183afe7091f48d90a9e28694841f8a72d9cf7c1
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-evidence/verify-evidence-prefix-2026-05-23T22-29-56Z.txt: sha256:bf85afd204ab6aa80038fdbd9decfba94e66355a5b5f01c814634bbb37235505
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-evidence/verify-evidence-postfix-2026-05-23T22-29-56Z.txt: sha256:67d367116df0942432f18837d64fee88bcd09aa5ba5de823b9c36a5f17a0fcb0
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-evidence/pytest-2026-05-23T22-29-56Z.txt: sha256:dd835cd77b47f68459df3fdee95178a870601506ea8e6746a75f040b7dfdc09f
---

# Stage 1a Checkpoint — verify_evidence LFS-content-OID fix

## 1. Scope summary

(FACT — charter § 4.2; D2 = 1a/1b ratified.)

Stage 1a of the audit-chain-correctness sub-phase: the §B.6 Option-1
`verify_evidence` LFS-content-OID fix (RD-2D Stack-D N5a). Teaches `verify_evidence`
to resolve the LFS content OID from the pointer stub before comparing, so
`captures/**/*.h5` `evidence_hashes` entries verify GREEN against the recorded
content OID per § B.1. Phantom-sha audit (N5b) + §B.6 Mode-3 are Stage 1b (out
of scope here). Conventions doc re-anchored at `167fe349…f2c58c2e` before the
additive §B.6 amendment.

## 2. Five-step results table

(FACT — feat commit `3ef008b`; evidence commit `11e4f78`.)

| Step | Artifact | sha256 (committed blob) | Status |
|---|---|---|---|
| 1 | `tools/integrity/integrity/common/repo.py` (`lfs_pointer_oid()` + `file_at_sha` docstring) | `c99810d9…3108f5bd` | implemented |
| 1 | `tools/integrity/integrity/scripts/verify_evidence.py` (OID-aware compare at `:113`) | `1c46bc72…25c1b4a` | implemented |
| 2 | `tools/integrity/tests/test_verify_evidence.py` (+5 tests) | `54942d59…bc25cfaf` | **10 passed** (5 new + 5 existing) |
| 3 | `docs/conventions/sub-phase-conventions.md` (§B.6 Mode-2 RESOLVED) | `2638dd28…2d9cf7c1` | amended (NEW baseline) |
| 4 | `verify-evidence-prefix-…txt` (pre-fix 29/2) | `bf85afd2…37235505` | reproduced |
| 4 | `verify-evidence-postfix-…txt` (post-fix 31/0) | `67d36711…17a0fcb0` | **VERIFIED** |
| 4 | `pytest-…txt` (10 passed) | `dd835cd7…b7dfdc09f` | GREEN |
| 5 | feat commit `3ef008b` | — | landed |

## 3. Implementation design choice

(FACT — `tools/integrity/integrity/common/repo.py` + `tools/integrity/integrity/scripts/verify_evidence.py` at HEAD.)

- **Logic placement:** a pure helper `lfs_pointer_oid(blob: bytes) -> str | None`
  in `tools/integrity/integrity/common/repo.py` (alongside `file_at_sha`), plus
  a 2-line OID-aware branch at `tools/integrity/integrity/scripts/verify_evidence.py:113`.
  `file_at_sha` is **unchanged behaviorally** (still returns raw `git show` bytes,
  i.e. the pointer stub for LFS) — only its docstring gained an LFS note. This
  keeps the existence-check path and other `file_at_sha` consumers untouched; the
  LFS resolution lives only in the hash-comparison path.
- **Detection mechanism: A (pointer-stub-sniff).** Detect by the
  `version https://git-lfs.github.com/spec/v1` blob prefix, then parse
  `oid sha256:<64-hex>`. Chosen over B (`git check-attr filter`) because the
  sniff is **content-driven** (correct even if `.gitattributes` and the actual
  blob disagree), **pure/offline** (no subprocess, no path needed), and
  **`.h5`-agnostic** (works for any future LFS pattern). R-A1 OID-parse path; no
  `git lfs smudge`, no network, no LFS auth.
- **R-A4 preserved:** for a non-LFS blob `lfs_pointer_oid` returns `None` and the
  code hashes the git blob exactly as before; for a pointer with a wrong/absent
  OID the comparison still mismatches → error. `--strict` handling untouched (its
  latent-no-op status is banked, not re-wired).

## 4. LFS-fixture test additions

(FACT — `pytest-2026-05-23T22-29-56Z.txt`; 10 passed in 0.28s.)

5 new tests:
- `test_lfs_pointer_oid_parses_pointer_stub` — helper returns the embedded OID.
- `test_lfs_pointer_oid_returns_none_for_non_pointer` — HDF5-magic / text / empty → None.
- `test_verify_evidence_lfs_pointer_resolves_content_oid` — **positive path**: a committed pointer-stub blob verifies GREEN against the recorded content OID.
- `test_verify_evidence_lfs_pointer_wrong_oid_fails` — **R-A4 negative path**: pointer whose OID ≠ recorded value still FAILS with `sha256 mismatch`.
- `test_verify_evidence_non_lfs_blob_hashes_normally` — **regression**: non-pointer blob hashes via git-blob sha256 (LFS path does not leak).

**5 existing tests GREEN** (valid-paths-pass / missing-path-fails / hash-mismatch-fails / accepts-sha256-prefix / no-frontmatter-raises). **Full `tools/integrity` package: 56 passed** (no regression from the broadly-imported `repo.py` change). `ruff check` + `ruff format` clean.

## 5. §B.6 Mode-2 RESOLVED amendment outcome

(FACT — `docs/conventions/sub-phase-conventions.md` post-amendment; committed-blob sha256 verified == working-tree sha256, no phantom.)

- **NEW conventions doc baseline sha256:** `2638dd2854c2841b4c1a56449183afe7091f48d90a9e28694841f8a72d9cf7c1`
  (SHIFTED from `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e`).
  This is the new anchor subsequent sub-phases verify against.
- **Amendment (additive; appended after § B.6 "Lean for spec-Phase-2 entry"):**
  records Mode 2 RESOLVED via Option 1's OID-parse refinement; dissolves Option
  1's install/network risk (no smudge/network/auth); cites the 29/2 → 31/0
  empirical proof; declares **Option-3 annotation NO LONGER REQUIRED** for
  subsequent landings; declares **IC-16**; forward-references the Stage-1b Mode-3
  addition. No existing § B.6 prose modified or deleted (Convention A).
- **Commit-first-then-sha256 discipline exemplified:** the amendment is a mid-file
  insertion (hook-safe); committed-blob sha256 `2638dd28…` exactly equals the
  working-tree sha256 cited in the feat footer — **no trailing-newline phantom**.

## 6. Step 4 end-to-end re-verify witness (structural-correctness proof)

(FACT — `verify-evidence-prefix-…txt` / `verify-evidence-postfix-…txt`; both run against `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md` at its head_sha `7747d68`.)

| | Result | The 2 `.h5` LFS entries |
|---|---|---|
| **Pre-fix** (expected 29/2) | **29 pass / 2 fail** | `…stack-d/…h5` claimed `2e93a751…` vs actual `38b9ce05…`; `…2d-ref/…h5` claimed `bcae544a…` vs actual `8910f111…` (pointer-stub shas) |
| **Post-fix** (expected 31/0) | **31 pass / 0 fail** | both now `PASS (sha256 OK)` — content OID resolved from pointer stub |

The fix resolves §B.6 Mode 2 on **real committed data**, not just synthetic
fixtures. (The `tests/fixtures/legacy-captures/*.h5` entry — not under
`captures/`, hence not LFS — PASSED in both runs, confirming the pointer-sniff
correctly leaves non-LFS `.h5` blobs on the git-blob hash path.)

## 7. IC-16 formalization status

**FORMALIZED at Stage 1a.** IC-16 = verify_evidence LFS-content-OID semantics:
LFS-tracked artifacts compare via the embedded `oid sha256:` from the pointer
stub; non-LFS artifacts compare via git-blob sha256; mismatch→error preserved
(R-A4). Declared in the feat commit footer + the § B.6 amendment. Stage 2 records
it in `docs/dependencies.md` (IC registry) per charter § 3.2. IC-15 stays
reserved for the cross-stack methodology template.

## 8. New Stage 1a shifts

**None.** The fix landed exactly on the OID-parse design path the probe + Stage 0
de-risked; pre/post-fix results matched expectations (29/2 → 31/0); no regression;
no `--strict` side-effect; no LFS-smudge complexity (R-A1 fallback not needed).
The conventions-doc sha256 change is the **planned deliverable**, not an
unexpected drift. **Cumulative shift count: 122 + 0 = 122** entering Stage 1b.

## 9. Stage 1b dispatch readiness

(FACT — charter §§ 4.3, 7.3.)

READY. Stage 1b authors the portfolio-wide phantom-sha audit report (14-capture
enumeration; 2 confirmed drifts classified; rd-3d-ref Mode-1→Mode-3
re-classification), adds the §B.6 **Mode 3** classification (the Stage-1a
amendment already forward-references it), and lands the D3 spec § 7.5 / Appendix
G.7 clarification (operator routed D3 POSITIVE). Stage 1b reads the post-Stage-1a
conventions doc at sha256 `2638dd28…2d9cf7c1` (the new baseline). Non-corrective
of prior audits (R-A2; D5 = NO annotations).

---

This checkpoint lands at HEAD `5c90bc92abdfd533ec9121503bdaa3dd49f1995a` (back-filled per Convention #12 +
§ B.2 in a separate `chore(audit-chain-correctness-stage1a-sha-backfill)` commit;
full 40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED** (fix landed; 31/0 post-fix; 10 tests + 56-package GREEN;
§B.6 Mode 2 RESOLVED; IC-16 formalized; 0 new shifts).

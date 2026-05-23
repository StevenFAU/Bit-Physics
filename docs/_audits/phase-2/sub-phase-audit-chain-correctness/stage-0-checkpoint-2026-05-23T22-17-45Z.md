---
date: 2026-05-23T22-17-45Z
author: audit-chain-correctness-sub-phase-agent
phase: 2
artifact: stage
artifact_id: audit-chain-correctness-stage-0
subject: "Stage 0 pre-flight CLOSE for the audit-chain-correctness sub-phase. All 4 tasks PASS. Task 0.0 cross-phase replay against v0.1.0-phase-1 GREEN (8/8 gates); replay-output sha256 9399fc33…909f34 byte-identical to the bit-identity invariant (20th invocation). Task 0.1 tolerance-budget carryover committed (no budget widening; [overrides.reaction-diffusion-2d] untouched). Task 0.2 R-A1 dissolution EMPIRICALLY CONFIRMED at HEAD: RD-2D Stack-D .h5 pointer stub embeds oid sha256:2e93a751… == landing-recorded content OID; OID-parse design path holds. verify_evidence surface unchanged (verify_evidence.py:113 hash site; repo.py:62-72 file_at_sha); exactly 1 LFS pattern (captures/**/*.h5); both phantom trailing-newline signatures hold. Task 0.3 14-capture survey: 5 MATCH / 7 NO-RECORD / 2 PHANTOM-DRIFT — incidence exactly 2 (≤2 → CONTINUE; no D2 trigger). Conventions doc sha256 167fe349…f2c58c2e verified at HEAD. Verdict CONFIRMED. 0 new Stage-0 shifts; cumulative 122."
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER — back-filled per Convention #12>
head_sha_at_checkpoint: <PLACEHOLDER>
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-probe-2026-05-23T21-54-02Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-landing-2026-05-23T22-04-39Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/replay-2026-05-23T22-17-45Z.txt
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/anchor-reverify-2026-05-23T22-17-45Z.txt
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/phantom-survey-2026-05-23T22-17-45Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - docs/conventions/sub-phase-conventions.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/replay-2026-05-23T22-17-45Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/anchor-reverify-2026-05-23T22-17-45Z.txt: sha256:750cb58bd38828efb2a6cde4e82065668accf60438bc323b6ccc4609fe335943
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/phantom-survey-2026-05-23T22-17-45Z.txt: sha256:436599c26573cadef4bcadef6ea4208d883f22b1a206c541ebd152cf52091161
  tools/testkit/equivalence/tolerance-budget.toml: sha256:c4946463a5b6a4605c8d4299707aefc49a4c68a6590742f42c24b91fd01e1f0b
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
---

# Stage 0 Checkpoint — Sub-Phase Audit-Chain-Correctness

## 1. Scope summary

(FACT — charter § 4.1; this is pre-flight only.)

Stage 0 pre-flight for the audit-chain-correctness sub-phase (focused
infrastructure; bundles the §B.6 Option-1 `verify_evidence` LFS-content-OID fix
+ the portfolio-wide capture-`.json` phantom-sha audit — RD-2D Stack-D N5a/N5b).
No implementation work this stage (Stage 1a / 1b own the fix + audit report).
Conventions doc verified byte-stable at sha256 `167fe349…f2c58c2e` at HEAD before
relying on it (not BLOCKED). All operator routings D1–D6 ratified at dispatch.

## 2. Four-task results table

(FACT — Task outputs committed at `docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/` commit `2ae8d6a`; tolerance-budget carryover commit `178534c`.)

| Task | Description | Outcome |
|---|---|---|
| 0.0 | Cross-phase replay (8 gates vs `v0.1.0-phase-1`) | **PASS** — 8/8 gates GREEN, `ok=True`; replay-output sha256 `9399fc33…909f34` **byte-identical to the bit-identity invariant** (20th invocation) |
| 0.1 | Tolerance-budget carryover | **PASS** — `[phase].phase = "sub-phase-audit-chain-correctness"`, `opened_at = 2026-05-23T22:17:07Z`; NO `[budgets.*]` widening; `[overrides.reaction-diffusion-2d]` (in `tolerance.toml`) untouched |
| 0.2 | Re-anchor probe findings at HEAD (R-A1 verification) | **PASS** — see § 3 |
| 0.3 | 14-capture phantom-sha survey | **PASS** — incidence exactly 2 (≤2 → CONTINUE); see § 4 |

## 3. R-A1 dissolution — empirical confirmation at HEAD

(FACT — `git show` / `grep` / `awk` / `sha256sum` at HEAD; `anchor-reverify-<UTC>.txt`.)

- **(a) `verify_evidence` surface unchanged.** `tools/integrity/integrity/scripts/verify_evidence.py:113` is the hash-comparison site (`actual = hashlib.sha256(blob).hexdigest()`); `tools/integrity/integrity/common/repo.py:62-72` `file_at_sha()` reads via `git show {sha}:{path}` (returns the LFS pointer stub for LFS-tracked paths). Signatures match the probe.
- **(b) Exactly ONE LFS-filtered pattern** at HEAD: `captures/**/*.h5 filter=lfs diff=lfs merge=lfs -text` (`grep -cE 'filter=lfs' .gitattributes` = 1). No scope expansion.
- **(c) R-A1 DISSOLUTION HOLDS (load-bearing).** The RD-2D Stack-D `.h5` pointer stub at HEAD is:
  ```
  version https://git-lfs.github.com/spec/v1
  oid sha256:2e93a75164bafdf104b0b247fffdeb5e3d8be0806b5fa42f17b6d5741041b13d
  size 2940664
  ```
  The `oid sha256:` value `2e93a751…1041b13d` **exactly matches** the RD-2D Stack-D landing audit's recorded content OID. The OID-parse-from-pointer-stub design path for Stage 1a is empirically valid — no git-lfs-smudge, no network, no auth required.
- **(d) Trailing-newline signatures hold** for both confirmed phantoms at HEAD:
  - rd-2d-stack-d `.json`: committed `e1752ceb…` ; `sha256(content − \n)` = `a7780645d2159208e281a49c95b9d43c66ffd8b7e6ca3524345be19c468abd68` (= phantom). ✓
  - rd-3d-ref `.json`: committed `5c64375f…` ; `sha256(content − \n)` = `ccd0e4eabf36fba694a5c9bf3817cc470846c6aa2d59e52f7a2c987201475dcb` (= phantom). ✓

## 4. Phantom-sha incidence at Stage 0

(FACT — `phantom-survey-<UTC>.txt`; methodology per probe § 5.)

**14 tracked capture `.json` → 5 MATCH · 7 NO-RECORD · 2 PHANTOM-DRIFT.**

- **MATCH (5):** eulerian-smoke (×2), mpm, rd-2d-ref, sph-water.
- **NO-RECORD (7):** boids-3d (×2), lbm (×2), mandelbulb, physarum, strange-attractors — no `.json` sidecar sha recorded in any audit.
- **PHANTOM-DRIFT (2):** rd-2d-stack-d (`a7780645…` phantom alongside the correct `e1752ceb…` landing value), rd-3d-ref (`ccd0e4ea…` phantom alongside the correct `5c64375f…` landing value). Both already caught at their respective landings; phantoms survive only in sealed checkpoints.

**Incidence = exactly 2 confirmed drifts (≤ 2 → CONTINUE).** No D2 sub-decomposition trigger (R-A3 not approached; the >20 / >30 thresholds are far off). Stage 1b audit-report deliverable scope holds at ~+200–300 lines. No new drifts surfaced vs the probe.

## 5. New Stage 0 shifts

**None.** All four tasks confirmed the probe's findings without drift; the R-A1
dissolution claim held empirically; phantom incidence unchanged at 2. Convention
#8 exercised at every task (re-verified against HEAD artifacts, not probe-transcript
memory).

## 6. Stage 1a + 1b dispatch readiness

(FACT — charter §§ 4.2, 4.3, 7.2, 7.3.)

- **Stage 1a** (`verify_evidence` LFS-content-OID fix + tests + §B.6 Mode-2 resolution): READY. The OID-parse design path is empirically de-risked (§ 3c). Fix surface bounded: `tools/integrity/integrity/scripts/verify_evidence.py:113` hash site + LFS-pointer detection (structural sniff and/or `git check-attr filter`, not `.h5`-hardcoded). R-A4 preserved (mismatch→error; `--strict` re-wiring banked).
- **Stage 1b** (phantom-sha audit report + §B.6 Mode-3 + D3 §7.5 amendment): READY. The 14-capture survey is the report's empirical core; 2 confirmed drifts to classify + the rd-3d-ref Mode-1→phantom re-classification. Non-corrective of prior audits (R-A2; D5 = NO annotations).

**Cumulative shift count at Stage 0 close: 122 + 0 = 122** entering Stage 1a.

---

This checkpoint lands at HEAD `<PLACEHOLDER>` (back-filled per Convention #12 +
§ B.2 in a separate `chore(audit-chain-correctness-stage0-sha-backfill)` commit;
full 40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED** (all 4 tasks PASS; R-A1 dissolution confirmed; phantom
incidence 2; not BLOCKED).

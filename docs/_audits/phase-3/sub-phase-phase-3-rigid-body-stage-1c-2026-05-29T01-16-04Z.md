---
date: 2026-05-29T01-16-04Z
author: phase-3 rigid-body-pedagogical stage-1c (Claude Code)
subject: Phase 3 task-4 rigid-body-pedagogical — STAGE 1c closing sweep (capture + fixture + perf-ledger + §Q.5 R2 push + §S.5 CI green)
verdict: CONFIRMED
head_sha: 941b1b845403609f82123fbc6b43a6aa0c964f82
prior_stage_audit: sub-phase-phase-3-rigid-body-stage-1b-2026-05-29T01-07-52Z.md
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3
canonical_capture_oid: sha256:ac346f22565afe92ac7fab9440352300e6041c24483f6401035d43395ed45fb1
evidence_paths:
  - captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.h5
  - captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.json
  - tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.h5
  - tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.json
  - docs/perf-ledger.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-1b-2026-05-29T01-07-52Z.md
evidence_hashes:
  captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.h5: sha256:ac346f22565afe92ac7fab9440352300e6041c24483f6401035d43395ed45fb1
  captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.json: sha256:c3833f04755db23e384443d04fd30071611e4ed213b14d1c507ff542b3a501c8
  tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.h5: sha256:ac346f22565afe92ac7fab9440352300e6041c24483f6401035d43395ed45fb1
  tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.json: sha256:873c2cfe25a059fe2d9ed6209d0c116b5fc29125afa5c343737e9246ac143b85
  docs/perf-ledger.md: sha256:89ea034397ce16b1869ce23a52ec5cc4547ec788daf99f4eeb3f7f2f501cbd26
  docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-1b-2026-05-29T01-07-52Z.md: sha256:fa16641c177ec9b5757b1028fd4a817d6851488b9595b1eeeb4868e9a4b5b585
---

# Phase 3 — sub-phase rigid-body-pedagogical (task-4) — Stage 1c audit

> Closing sweep: canonical capture (gate-9) + schema-corpus fixture + perf-ledger
> (gate-12) + §Q.5 R2 push + §S.5 full-workflow CI green. Verdict **CONFIRMED** —
> the sub-phase is implementation-complete; Stage 2 is the landing audit.

## Commit chain (this stage)

| SHA | Commit |
|-----|--------|
| `78412af` | canonical capture + schema-corpus fixture + perf-ledger gate-12 row |

(Pushed at `78412af` via `git -c lfs.standalonetransferagent= push` for GitHub-LFS
+ `source setup-lfs-s3-local.sh && git lfs push --object-id origin ac346f22…` for
the R2 mirror — **same-shell**, the ising-classical root-cause discipline.)

## gate-9 — replayable capture

`captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.{h5,json}`
(101 captured frames, cadence-10; `theta` + `theta_dot` state + `total_energy`
diagnostic). `.h5` LFS-tracked, content OID `ac346f22…`; `.json` sha256 `c3833f04…`;
manifest `determinism.claimed=bit-exact-same-hw` (↔ registry, gate-10). [FACT]

## Schema-corpus fixture

`tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.{h5,json}` (same
`.h5` payload OID `ac346f22…`; `.json` sha256 `873c2cfe…`). The
`test_legacy_captures_corpus` suite passes **27/27** including this entry
(manifest validates against the capture-manifest schema; round-trips). [FACT]

## gate-12 — perf-ledger

`docs/perf-ledger.md` row `articulated-pedagogical | warp-cpu |
pendulum-trajectory-seed42-step1000 | 0.194s` (warm-cache; FIRST `rigid-body` +
FIRST Stack-E SIM row in Phase 3). Explicitly NOT omitted (S2-RD2C1 lesson). [FACT]

## §Q.5 — R2 push (same-shell discipline)

- GitHub LFS: `git -c lfs.standalonetransferagent= push origin main` → uploaded
  the 415 KB object (`ac346f22…`), `78412af` landed. [FACT]
- R2 mirror: `source tools/lfs/setup-lfs-s3-local.sh && git lfs push --object-id
  origin ac346f22…` → `Uploading LFS objects: 100% (1/1), done` exit 0 (the
  "14 KB" progress display is the lfs-s3 custom-agent reporting artifact; the
  authoritative validation is the §S.5 `python-strict` capture pull below, which
  GREEN-confirms the object is fetchable). [FACT]

## §S.5 — full-workflow CI sweep at HEAD `78412af`

`gh run list --commit 78412af` → **all 9 workflows success**: `structure`,
`ts-strict`, `integrity`, `equivalence`, `audit-append-only`,
`tolerance-budget-check`, `cpp-strict`, **`python-strict`** (incl. the new
`test-rigid-body-pedagogical` job: ruff + `mypy --strict` + selective LFS pull
for `captures/rigid-body-pedagogical-ref/**` + pytest), **`determinism`**. No red.
STOP-CI-RED not fired. [FACT]

## §R two-field integrity

- `integrity_invariant` = 0 HARD_FAIL / 14 SOFT_WARN (held). [FACT]
- `integrity_digest_at_head` = `f5b7eea1…` (measured live; unchanged from Stage
  1b — captures/perf-ledger/audits add no cat3/cat5 report lines). [FACT]

## Verdict

**CONFIRMED.** All 13 applicable gates discharged (gate-9 capture committed +
fetchable; gate-12 perf-ledger landed; gate-13 replay `match True`); §Q.5 R2 push
+ §S.5 all-green. **Stage 2 (landing audit + `closed-with-shifted-N` close)
unblocked.**

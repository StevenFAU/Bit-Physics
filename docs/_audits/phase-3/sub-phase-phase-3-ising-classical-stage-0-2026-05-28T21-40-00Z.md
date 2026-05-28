---
date: 2026-05-28T21-40-00Z
author: phase-3 ising-classical stage-0 (Claude Code)
subject: Phase 3 fourth sub-phase (task-3a Ising-classical) — STAGE 0 pre-flight + §Q R2 bootstrap + integrity baseline + §S.5 main-green + verify_evidence sweep + cross-phase replay (LFS-cache recovered)
verdict: CONFIRMED
head_sha: 207f5b8094f4fee6d04ebcccaef7749c17041c67
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-WEBGPU-DET decision-by-Stage-1b-MEASURE / D-WIDE-TOL decision-by-Stage-1b / D-PBT RESOLVED-IN-CHARTER / D-ANCHOR decision-by-Stage-1b-grep-cite / D-DET-REGISTRY decision-by-Stage-1b / D-HARNESS-LAYOUT RESOLVED-IN-CHARTER-v2 (pytest-against-captures) / D-CI RESOLVED-IN-CHARTER-v2 (python-strict.yml/test-ising-classical) / D-LAYOUT lean packages/ising-classical/ / D-TOL-SCHEMA decision-by-Stage-1b / D-MUT-SCOPE NO RESOLVED-IN-CHARTER / D-TAG NO RESOLVED-IN-CHARTER-v2
evidence_paths:
  - docs/phases/sub-phase-phase-3-ising-classical.md
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-probe-2026-05-28T19-08-34Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-plan-drafting-2026-05-28T19-08-34Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-harness-investigation-2026-05-28T21-00-21Z.md
  - docs/phases/phase-3-plan.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/lfs/setup-lfs-s3-local.sh
evidence_hashes:
  docs/phases/sub-phase-phase-3-ising-classical.md: sha256:1180cb003dc7fc9c3f25b5bd430f51ffec28cdf0e19bccfad64a902bd054405b
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-probe-2026-05-28T19-08-34Z.md: sha256:34227ad68d761246c5675d5b9c138bd09ef85b127b966df579e55e2187e40a9f
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-plan-drafting-2026-05-28T19-08-34Z.md: sha256:49cdc3d3cffbc462d911550637aa22eff0a13f84ffd5c360727121d3bb71dc82
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-harness-investigation-2026-05-28T21-00-21Z.md: sha256:15552fa54b7140919808fc3ed801ca3423caf636a97d174642f947783bb83f3c
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
  tools/testkit/equivalence/tolerance-budget.toml: sha256:0ecb3f2b25493e0bce552cce6b13f07ee27934971c6c27d31da7d5d7f2b43224
  tools/lfs/setup-lfs-s3-local.sh: sha256:c4ff80e361134a1b48e3e30fc2f57ada0945d416ffb20fd04d6f2a6552d92f65
---

# Phase 3 — sub-phase Ising-classical — Stage 0 audit

> Pre-flight for the FOURTH Phase-3 sub-phase + **first Stack-B SIM in
> Phase 3**: anchor probe, §Q R2 bootstrap, integrity baseline (§R live
> re-measure), §S.5 all-workflow main-green, verify_evidence sweep,
> cross-phase replay (`--prior-phase phase-2`). Follows the matured
> per-sub-phase cadence (common-3dgs + render-similarity + lenia
> precedent). Verdict **CONFIRMED** — Stage 1a (scaffold + RED) is now
> safe to dispatch.

## § 1 — §Q R2 bootstrap (FACT — first post-anchor action)

Per charter § 9 §Q + [[phase-3-r2-credentials-durability-fix-landed]],
the **first** post-anchor action for an LFS-touching sub-phase is to
source the local R2 bootstrap (STOP-LFS-PUSH at anchor time, not
Stage-1b push time):

| Check | Result |
|---|---|
| `~/.config/bit-physics/r2-credentials.env` (mode 600, off-tree) | **present** |
| `source tools/lfs/setup-lfs-s3-local.sh` | **`lfs-s3 ready`** — endpoint `…r2.cloudflarestorage.com`, bucket `bit-physics-lfs`, region `auto` |
| `git config --get lfs.standalonetransferagent` | **`lfs-s3`** (standalone transfer agent active in session git config) |

**Conclusion (FACT).** R2 reachable; the Stage-1b `.h5` push surface
is pre-armed. STOP-LFS-PUSH **NOT** fired at anchor time.

## § 2 — Anchor probe (FACT)

| Check | Expectation | Result |
|---|---|---|
| `git rev-parse HEAD` == `git rev-parse origin/main` | match | **MATCH** `207f5b8094f4fee6d04ebcccaef7749c17041c67` (charter-v2 chain tip per dispatch) |
| All SEVEN phase / sub-phase tags resolve | resolve | **all resolve**: `v0.0.0-phase-0`, `v0.1.0-phase-1`, `v0.2.0-phase-2`, `v0.2.1-sub-phase-lfs-architecture`, `v0.2.2-sub-phase-phase-3-common-3dgs`, `v0.2.3-sub-phase-phase-3-render-similarity`, `v0.2.4-sub-phase-phase-3-lenia` |
| `uv run python -m integrity --all --mode strict` | `0 HARD_FAIL / 14 SOFT_WARN`; live-measured full-report sha256 (§R — re-measure, do not copy) | **PASS** — `summary: 0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 = `688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff` (matches the charter probe-time live anchor; §R measure-don't-copy honored — re-measured, not copied) |
| working tree clean | yes | yes |
| invariants I1–I7 | hold | hold (integrity sweep 0 HARD_FAIL covers I1–I6; I7 no-agent-tags guard unchanged at HEAD) |

**Conclusion (FACT).** State checks GREEN; integrity baseline holds at
the live `688bc195…de127ff` digest (0 HARD_FAIL / 14 SOFT_WARN);
HEAD == origin/main; seven tags resolve. **STOP-D NOT fired.**

## § 3 — §S.5 all-workflow main-green (FACT)

`gh run list --commit 207f5b8094f4fee6d04ebcccaef7749c17041c67 --limit 30`
→ **9/9 required workflows `completed success`**: `structure`,
`audit-append-only`, `tolerance-budget-check`, `equivalence`,
`integrity`, `ts-strict`, `python-strict`, `determinism`, `cpp-strict`.
**STOP-MAIN-RED NOT fired.**

## § 4 — verify_evidence sweep (FACT — pre-existing-at-session-start)

Sweep of all front-mattered audits in `docs/_audits/phase-3/` with
`--strict` at HEAD `207f5b8` (zero edits this session): **27 PASS / 5
FAIL**. Every fail is **pre-existing at session start** — HEAD is
unchanged from the charter-v2 chain tip and this session has made no
commits — so **STOP-H (regression-only) does NOT fire**. Characterized:

| Failing audit | Nature | Disposition |
|---|---|---|
| `lenia-mypy-strict-fix-2026-05-28T18-39-42Z.md` | 1 fail: `.github/workflows/python-strict.yml` sha256 drift (workflow edited after the audit was sealed; documented in charter probe § 6.3) | Pre-existing; routes to audit-citation-hygiene cluster (L-R2CD-1 sibling). NOT a regression. |
| `sub-phase-phase-3-ising-classical-probe-2026-05-28T19-08-34Z.md` | session-1 ising audit; literal `at-head` placeholders in `evidence_hashes` (Mode-1 divergence) | **L-ISING-AUDIT-HYGIENE** (charter § 8). Sealed; do NOT edit. NOT a regression. |
| `sub-phase-phase-3-ising-classical-plan-drafting-2026-05-28T19-08-34Z.md` | session-1 ising audit; literal `at-head` placeholders | **L-ISING-AUDIT-HYGIENE**. Sealed. NOT a regression. |
| `sub-phase-phase-3-ising-classical-harness-investigation-2026-05-28T21-00-21Z.md` | session-1 ising audit; literal `at-head` placeholder + 2 copy-pasted RD-2D test-file shas | **L-ISING-AUDIT-HYGIENE**. Sealed. NOT a regression. |
| `progress.md` | no YAML front-matter (intentional running-log shape; not an evidence-bearing audit) | Structural; verify_evidence is not applied to it by design. NOT a regression. |

**§S6 discipline note.** This session writes REAL measured sha256 into
every `evidence_hashes` mapping it authors (per charter § 8
L-ISING-AUDIT-HYGIENE remediation rule); the three sealed session-1
ising audits are NOT touched (append-only R-1).

## § 5 — Cross-phase replay `--prior-phase phase-2` (FACT — LFS-cache recovered)

```
uv run python -m integrity.scripts.replay_prior_phase --prior-phase phase-2 \
  --audit docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

**First attempt:** `git worktree add --detach … v0.2.0-phase-2` returned
exit 128 — LFS smudge could not resolve (R2 objects absent from the
local `.git/lfs/objects` cache + GitHub-LFS budget). This is the
documented [[replay-needs-lfs-cache-recovery]] condition.

**Recovery (BEFORE declaring blocked, per charter STOP-REPLAY clause).**
Populated `.git/lfs/objects/<2>/<2>/<oid>` (git-lfs 3.4.1 2/2 layout)
from byte-identical working-tree content for all 28 LFS-tracked files
(OID == sha256 of content). The phase-2 worktree then smudged cleanly
(real HDF5 magic bytes, not pointers).

**Second attempt:** `ok=True` — **8/8 gates PASS**:

```
PASS integrity   PASS pytest        PASS equivalence  PASS determinism
PASS perf-ledger PASS property      PASS mutation     PASS tolerance-budget
summary: prior_phase=v0.2.0-phase-2 ok=True
```

**STOP-REPLAY NOT fired.** (The replay worktree is removed + pruned;
no residual worktree at session start of Stage 1a.)

**First-Stack-B FRICTION #0 (surfaced).** The 12-fixture
SIBLING-FIXTURE-LFS condition (legacy-captures committed as real files,
not pointers, since `v0.1.0-phase-1`) is what makes the smudge warn
`12 files that should have been pointers`. This is **carried-forward,
not closed here** (charter § 8); ising's own `.h5` push at Stage 1b
increments the corpus by +1 but does not change this disposition.

## § 6 — Tolerance-budget Phase-3 carryover (FACT)

`tools/testkit/equivalence/tolerance-budget.toml` `[phase] phase =
"phase-3"` carryover is **open** (opened at common-3dgs Stage 0; re-
verified by render-similarity + lenia). Only `cross_stack` budget
blocks exist; **no `[budgets.lattice-spin.*]` cap exists at HEAD**.
Verified-only — NOT re-opened. The first `lattice-spin` per-sim
tolerance row lands AT STAGE 1b (D-WIDE-TOL + D-TOL-SCHEMA routing);
per the lenia precedent the per-sim MC named tolerances land off-budget
(no `[budgets.<category>.golden]` cap shape exists), so STOP-CAT-X is
not anticipated.

## § 7 — D-class status carry (FACT)

Charter-v2 resolutions held into Stage 0: D-HARNESS-LAYOUT (pytest-
against-captures), D-CI (`python-strict.yml/test-ising-classical`),
D-PBT (two invariants), D-MUT-SCOPE (NO), D-TAG (NO). Open for Stage 1b
MEASURE/decide: D-WEBGPU-DET, D-WIDE-TOL, D-ANCHOR, D-DET-REGISTRY,
D-TOL-SCHEMA, D-LAYOUT (lean `packages/ising-classical/`).

## § 8 — Verdict

**CONFIRMED.** §Q bootstrap armed; anchor GREEN (0 HARD_FAIL / 14
SOFT_WARN; live digest `688bc195…de127ff`); §S.5 9/9 green; replay
`ok=True` 8/8 after documented LFS-cache recovery; verify_evidence
5 fails all pre-existing-at-session-start (STOP-H not fired). No HARD
RULE 2 STOP fired. **Stage 1a (scaffold + RED + failing-tests-hash) is
safe to dispatch.**

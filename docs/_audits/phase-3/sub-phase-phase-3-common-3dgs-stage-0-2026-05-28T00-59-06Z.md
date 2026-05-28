---
date: 2026-05-28T00-59-06Z
author: phase-3 common-3dgs stage-0 (Claude Code)
subject: Phase 3 common-3dgs Stage 0 — pre-flight + SHA pinning
verdict: CONFIRMED
head_sha: a376ee2e900e6b2786e9dd9412f368889a19cebb
prior_phase_tag: v0.2.1-sub-phase-lfs-architecture
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
supersedes: docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md
replay_prior_phase: phase-2 → v0.2.0-phase-2 ok=True 8/8
evidence_hashes:    # mapping (path → sha256); NO ": self" sentinel
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md: sha256:571cf15e5749699dff8099ffb82bb8c99f76ceb67fd24722b094189111d830f3
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md: sha256:ef63beb095fab1bdc11217f12079ae5bf961ac8459d36da49b6605bf28907d16
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md: sha256:68a77392604957d0cc7a8d2dd2c64621f4d5e08c2ef30272c8a75b43b92fe108
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
evidence_paths:     # LIST per verify_evidence schema
  - docs/phases/phase-3-plan.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md
  - docs/_audits/phase-3/progress.md
d_class_routed:
  - D-A: task-1 first (coordinator-ratified 2026-05-28)
  - D-C: bit-exact / same-stack-same-hw default; measure 1b
  - D-D: probe-discovered pattern; common-py PNG writer default
  - D-E: YES tag at landing; allowlist Stage 2
---

# Phase 3 common-3dgs Stage 0 — pre-flight + external-SHA pinning — CONFIRMED

> **Verdict: CONFIRMED.** Anchor probe clean; cross-phase replay `--prior-phase
> phase-2` ok=True 8/8; all five external upstream SHAs web-fetched, verified, and
> pinned in `docs/phases/phase-3-plan.md` §2.18. No STOP fired. Stage 1 (scaffold +
> RED) is unblocked. Posture: Convention #8 (every SHA web-fetched, none fabricated),
> Convention M (re-anchored against HEAD before edit), HARD RULE 2 (no improvising
> through a STOP). This audit **supersedes** the prior BLOCKED audit (newer +
> CONFIRMED); the BLOCKED file remains on `main` as a sealed append-only artifact.

## § 0 — Resumption note (FACT)

A prior Stage-0 session halted at the FIRST-ACTION **STOP-B** gate (Phase-3
pre-dispatch-review absent) and filed
`docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md`
(chain tip `e8c8d16`). Post-block, the operator **ratified** (coordinator chat
2026-05-28) that the v9 PHASE-PLAN-REVIEW amendment (`docs/phases/phase-3-plan.md:34`)
is overhead the project no longer requires — the charter ratification in coordinator
chat substitutes for the formal review audit. **STOP-B is removed** from this dispatch;
no pre-dispatch-review file is required or searched for. The BLOCKED audit is **not
edited** (append-only); this CONFIRMED audit supersedes it by recency + verdict, and
the supersession is declared in front-matter `supersedes:`.

## § 1 — Anchor-probe findings (FACT)

Re-run at HEAD `e8c8d16` (Convention M; HEAD == `origin/main`, the BLOCKED chain tip; no successor — the expected anchor):

| Check | Result |
|---|---|
| `git rev-parse HEAD` == `git rev-parse origin/main` | `e8c8d16e23010482989d903019afd9ca5ea5303c` (no drift) |
| Chain to `e8c8d16` | `6dd5494`(BLOCKED) → `499afcb`(back-fill) → `e8c8d16`(self-sha fix) — `e8c8d16` is an ancestor of HEAD == HEAD |
| Tag `v0.0.0-phase-0` | annotated; → commit `727ffb9b513f` ✓ |
| Tag `v0.1.0-phase-1` | annotated; → commit `990856502ac4` ✓ |
| Tag `v0.2.0-phase-2` | annotated; → commit `fd21445614d2` ✓ |
| Tag `v0.2.1-sub-phase-lfs-architecture` | annotated; → commit `8f4dea3069fb` ✓ |
| Integrity Cat 1–5 strict sweep (pre-edit) | **0 HARD_FAIL / 14 SOFT_WARN**; stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to the baseline |
| Integrity Cat 1–5 strict sweep (post §2.18 edit) | **0 HARD_FAIL / 14 SOFT_WARN**; sha256 **still** `c19492ad…d22cb52` (the §2.18 manifest adds no HARD_FAIL/SOFT_WARN line, so the report is byte-identical) — no STOP-D |
| I7 invariant test `pytest tools/testkit/lfs_migration/` | **16 passed** |

**(FACT) Tag-SHA note.** All four phase tags are **annotated** tag objects; `git
rev-parse <tag>` returns the tag-object SHA (e.g. phase-0 `75b674cb9d44`), while
`git rev-parse <tag>^{commit}` returns the dereferenced commit SHA. The dereferenced
commits (`727ffb9b…` / `990856502ac4` / `fd21445614d2` / `8f4dea3069fb`) match the
plan-drafting probe's recorded values exactly — no tag movement; the apparent
divergence was the annotated-object-vs-commit distinction, not a regression.

### § 1.1 — verify_evidence sweep (FACT) — no regression (I1)

`uv run --no-sync python -m integrity.scripts.verify_evidence --audit <A>`:

| Audit | Result |
|---|---|
| `docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md` | 20 pass / 0 fail @ `85da2fc89112` |
| `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` | 36 pass / 0 fail @ `afdf44a509e7` |
| `docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md` | 7 pass / 0 fail @ `832e95abd1e3` |
| `docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md` | 24 pass / 0 fail @ `6139b5958354` |
| `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sub-phase-landing-2026-05-27T23-16-50Z.md` | 24 pass / 0 fail @ `abf077c31a64` |
| `docs/_audits/phase-3/…common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md` | 4 pass / 0 fail @ `b6230663b1d6` |
| `docs/_audits/phase-3/…common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md` | 7 pass / 0 fail @ `6dd5494f2b7a` |

No regression on any prior audit → no STOP-H. **(FACT) Sweep edge case:**
`docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.addendum-2026-05-20T02-45-40Z.md`
lacks a `head_sha:` field (it is a retroactive addendum, not itself a verify_evidence
target); `verify_evidence` errors with "front-matter missing valid head_sha". This is
a **pre-existing benign shape**, not a regression introduced by Stage 0, and the
addendum is not in the required sweep set.

### § 1.2 — I1–I7 disposition at HEAD (FACT)

- **I1 (verify_evidence no-regression):** all 7 prior audits pass 0-fail (§1.1).
- **I2 (cross-phase replay ok):** `--prior-phase phase-2` → ok=True 8/8 (§2).
- **I3 (integrity baseline held):** `c19492ad…d22cb52` byte-identical, 0 HARD_FAIL (§1).
- **I4 (append-only):** no published `docs/_audits/**` file edited; the prior BLOCKED
  audit is superseded by a new file, not modified. (This session's §2.18 edit is to
  `docs/phases/phase-3-plan.md`, a plan, not an audit.)
- **I5 (no fabrication / Convention #8):** every external SHA web-fetched from the
  GitHub API + verified (§3); no SHA transcribed from memory.
- **I6 (Convention #12 SHA back-fill):** the Stage-0 audit `head_sha` is back-filled in
  a separate commit (never `--amend`).
- **I7 (no agent-pushed tags):** test 16/16; this session pushes no tag (the D-E
  intermediate tag is a Stage-2 deliverable, operator-pushed).

## § 2 — Cross-phase audit replay (v9 first-action, `docs/phases/phase-3-plan.md:18`) — FACT

```
uv run --no-sync python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-2 \
  --audit docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Output digest: **all 8 gates PASS**, `summary: prior_phase=v0.2.0-phase-2 ok=True`.
(Per-gate `audit_verdict=None` — the phase-2 landing front-matter carries no
tool-readable per-gate `gates:` map or whole-audit `verdict:`; the tool computes a
discrepancy only when an asserted CONFIRMED/PASS/OK verdict contradicts a failing
gate, so with all gates passing there is no discrepancy regardless. Acceptance
criterion is `ok=True`, met.) **No STOP-C.**

**(FACT) Environmental note — LFS object recovery preceded the replay.** The replay
materializes a worktree at `v0.2.0-phase-2`, which smudges 31 LFS-tracked capture
objects. Both LFS backends were unavailable this session: the `lfs-s3` standalone
transfer agent (`.git/config` → R2) had no credentials in the environment (EOF), and
the GitHub-LFS fallback returned "This repository exceeded its LFS budget." The 31
tagged objects are content-addressed (OID = sha256-of-content) and **all 31 were
present, byte-identical, in the current working tree** (the repo is fully smudged at
HEAD; tag-vs-HEAD capture OIDs are identical for unchanged files). The local
git-lfs object cache (`.git/lfs/objects/<oid[0:2]>/<oid[2:4]>/<oid>`) was repopulated
from the verified working-tree content — each copy's `sha256sum` was checked to equal
its OID before placement (Convention #8: authoritative content, no fabrication;
identical in effect to `git lfs fetch`, sourced locally). With the cache populated the
worktree smudge succeeded and the replay ran. This is an environment limitation, **not**
a content/correctness discrepancy; the replay verdict (`ok=True 8/8`) stands on the
tagged content. Banked for the operator: R2 credentials are absent in agent sessions
and the GitHub-LFS budget is exhausted — future replays/worktree checkouts depend on
the local-cache-recovery path until one backend is restored.

## § 3 — External-SHA pinning manifest (FACT — `phase-3-plan.md` §2.18)

All five upstreams web-fetched from the GitHub API on **2026-05-28** and pinned in
`docs/phases/phase-3-plan.md` §2.18. Pinning rule: latest stable release tag within 12
months, else default-branch HEAD as of fetch. Per-row (a)-(d) verification:

| # | Upstream (repo) | Pinned SHA | (a) Released | (b) License | (c) Security | (d) Gate / consumer |
|---|---|---|---|---|---|---|
| 1 | graphdeco-inria/gaussian-splatting | `54c035f7834b564019656c3e3fcc3646292f727d` | default-branch HEAD (main; **no tags**), main HEAD dated 2024-10-30 | **NOASSERTION / "Other"** — Gaussian-Splatting **NON-COMMERCIAL** research license | advisories array empty (clean) | task-1 common-3dgs (THIS sub-phase; vendors `references/3DGS-reference/`) |
| 2 | XPandora/PhysGaussian | `8339ed6aa2cd5d50e1001a254a3d95aea678a956` | default-branch HEAD (main; **no tags**), HEAD dated 2025-04-07 | **NONE** (no LICENSE file; `license=null`) | advisories array empty (clean) | task-8 (cite-only here; vendors later) |
| 3 | InteractiveComputerGraphics/PositionBasedDynamics | `d0894bdb0190c5f273c0500ecad0e8c2bf21fc5f` | default-branch HEAD (master); latest tag `2.2.0` is 2022-12-13 (>12 mo) → HEAD | **MIT** | advisories array empty (clean) | task-5 cloth-xpbd |
| 4 | NVIDIA/physicsnemo | `766e485a4eddf4e5e50d371c87b39e6d4d65ea59` | release **`v2.1.0`** (published 2026-05-27, <12 mo) → tag pinned | **Apache-2.0** | advisories array empty (clean) | task-7 pinn-poisson |
| 5 | Chakazul/Lenia | `adfc542939266de7f4bb7ebb552e8499701ee107` | default-branch HEAD (master); latest tag `v3.5` is 2020-10-13 (>12 mo) → HEAD | **MIT** | advisories array empty (clean) | task-3 lenia (`references/Chakazul-Lenia/`) |

Verification artifacts (web-fetched, GitHub API; FACT):
- **Inria:** `/repos/.../gaussian-splatting` → license `NOASSERTION`/"Other"; `/branches/main` HEAD `54c035f7…` (2024-10-30); `/tags` empty; `/security-advisories` empty. `pushed_at` 2025-10-17 reflects a non-main ref; **main** HEAD authoritatively `54c035f7…` (confirmed via `/commits?per_page=1` and `/branches/main`).
- **PhysGaussian:** `/repos/.../PhysGaussian` → `license: null`; `/commits?per_page=1` HEAD `8339ed6a…` (2025-04-07); `/tags` empty; `/security-advisories` empty.
- **Bender PBD:** `/repos/...` → MIT, default `master`; `/tags` latest `2.2.0`→`aa62c44f…` dated **2022-12-13** (>12 mo, so HEAD used); `/commits?per_page=1` master HEAD `d0894bdb…` (2025-09-04); `/security-advisories` empty.
- **PhysicsNeMo:** `/repos/.../physicsnemo` → Apache-2.0; `/releases/latest` `v2.1.0` published **2026-05-27** (<12 mo); `/tags` resolves `v2.1.0`→commit `766e485a…`; `/security-advisories` empty.
- **Lenia:** `/repos/.../Lenia` → MIT, default `master`; `/branches/master` HEAD `adfc5429…` (2022-03-15); `/tags` latest `v3.5`→`584eab49…` dated **2020-10-13** (>12 mo, so HEAD used); `/security-advisories` empty.

**No STOP-A:** all five reachable, all SHAs verified-existing, no license materially
blocks the relevant action, no critical unpatched advisory.

## § 4 — License posture summary (FACT + INFERENCE)

**(FACT) Inria gaussian-splatting is the FIRST non-permissive upstream in the repo.**
Its license is the Gaussian-Splatting research license — **non-commercial** (GitHub
classifies it `NOASSERTION`/"Other"). Per the dispatch: vendoring into
`references/3DGS-reference/` is acceptable because `references/` holds research material
cited for independent derivation (§2.2 / spec §2.4 by-name citation discipline), NOT a
redistributed binary or a relicensed Bit-Physics component. **(INFERENCE)** The
non-commercial clause is load-bearing and **inherited by every subsequent 3DGS
sub-phase** (task-8 3dgs-mpm, Phase-4 WU-C): no commercial use, no relicensing of the
vendored material. This is surfaced (not a STOP) and recorded in §2.18 commentary so
downstream sub-phases consume the constraint by reference.

**(FACT) PhysGaussian has NO license file.** Cite-only at this sub-phase (task-1 does
not vendor it), so it does not block common-3dgs Stage 0. task-8's vendoring sub-phase
**must** resolve license posture before creating `references/PhysGaussian/` (request a
license grant, or stay cite-only / by-name per §2.2). Flagged in §2.18.

**(FACT) Bender PBD (MIT), PhysicsNeMo (Apache-2.0), Lenia (MIT)** are all permissive
and compatible with Bit-Physics's MIT distribution posture.

## § 5 — Verdict + closure-readiness for Stage 1a

**CONFIRMED.** Acceptance met: replay ok=True 8/8; integrity baseline byte-identical
(0 HARD_FAIL); I1–I7 hold; all five external SHAs pinned + verified; D-A…D-E routed
(front-matter `d_class_routed`). STOP-B removed by operator ratification; STOP-A/C/D/H
did not fire.

**Stage 1a (scaffold + RED tests) is unblocked.** It inherits: the Inria SHA
`54c035f7…` (vendoring target for `references/3DGS-reference/` at Stage 1b); the §3.2.1
public API (`GaussianSplatModel` / `render` / `Camera` / `load_ply` classmethod /
`save_ply` instance — NOT the §6.1 stale `GaussianSet`/`forward_splat`); D-C
(default-declare `bit-exact / same-stack-same-hw` in the determinism registry at 1a,
measure at 1b); D-D (follow the probe-discovered common-module smoke-sim pattern;
default common-py PNG writer if one exists). The Inria non-commercial license constraint
(§4) binds the vendoring at Stage 1b.
</content>

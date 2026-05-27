---
date: 2026-05-27T22-22-25Z
author: phase-2-cleanup-stage-1-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-stage-1-f
stage: stage-1-f-checkpoint
verdict: CONFIRMED-Stage-1-F
head_sha: ede4887273ae1af89bf4c4e8d725389787ba372e
head_sha_at_checkpoint: ede4887273ae1af89bf4c4e8d725389787ba372e
evidence_paths:
  - .gitattributes
  - tools/testkit/pyproject.toml
  - tools/testkit/capture/manifest.py
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-2026-05-23T22-39-45Z.md
  - docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md
evidence_hashes:
  .gitattributes: sha256:b991cffcd868c9f10684905de2df3e299b45fa573800b513447ebf9db4d7bf53
  tools/testkit/pyproject.toml: sha256:4d2c6d71059399e20fe4a9f10a896d04edea024e5a84cde55c141f13819ee811
  tools/testkit/capture/manifest.py: sha256:2f5694c74b4c6d774c34b2ff77898d0c7f5e4f3db388ecb976da806780e762d0
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-2026-05-23T22-39-45Z.md: sha256:9a1167dc07c4d7c3c606f48d7c2986dfc4075193f2122f94fabb3053a40d085b
  docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md: sha256:b47d4a0f5a785c0bc5b569870ecc89fa7cd3aa8c8ead1cafeedc49447f4d2134
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# Stage-1.F checkpoint audit — sub-phase-phase-2-cleanup (Cluster F: verify-and-close)

**Verdict: CONFIRMED-Stage-1-F.** All five already-resolved § 13 items + M0 verified to hold at HEAD
and formally closed with evidence-of-resolution citations. **Verification-only cluster — no source
edits, no substantive commits** (this checkpoint + its SHA back-fill are the only artifacts). Integrity
baseline held byte-for-byte; I1–I7 hold.

## § 1 — Cluster-open re-anchor (Convention M)

Re-confirmed each item's upstream resolution still holds at HEAD `ede4887` (the resolutions predate
this sub-phase; none regressed). No item required re-opening.

## § 2 — Item-by-item closure (verify-and-close)

| Item | Closure | Evidence-of-resolution (at HEAD) |
|---|---|---|
| **#4** § B.6 verify_evidence LFS-content-OID remediation | **CLOSED (resolved upstream)** | landed at sub-phase-audit-chain-correctness / IC-16: `docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md` + `stage-1b-checkpoint-2026-05-23T22-42-43Z.md`. `verify_evidence` resolves LFS-content OIDs (offline) — re-confirmed green across this session's audits |
| **#7** Portfolio-wide capture `.json` phantom-sha audit | **CLOSED (resolved upstream)** | `docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-2026-05-23T22-39-45Z.md` is the completed portfolio-wide audit artifact |
| **#15** LFS-architecture sub-phase (D13; remote-CI red on LFS-bandwidth) | **CLOSED (LANDED)** | `v0.2.1-sub-phase-lfs-architecture` tag present (operator-pushed; I7 OK); `docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md` (whole sub-phase landed). Note: the remote-CI-red-on-LFS-bandwidth condition is the SAME UNKNOWN-1 carried at Cluster C (K-3); the sub-phase itself landed |
| **#34** LFS rule for `tests/fixtures/legacy-captures/` | **CLOSED (resolved upstream)** | `.gitattributes:45` — `tests/fixtures/legacy-captures/**/*.h5 filter=lfs diff=lfs merge=lfs -text` (landed at LbmD per `.gitattributes:42-45` comment) |
| **#9 (landed portion)** Testing-improvements: pytest-timeout + manifest-builder | **CLOSED (landed parts)** | `tools/testkit/pyproject.toml:46` `pytest-timeout>=2.0`; `tools/testkit/capture/manifest.py` (manifest-builder) present. **Residual** (Cat-3 evaluator shims + mutmut characterization) remains **deferred-OUT** per charter § 9 — a testing-improvements sibling sub-phase, NOT closed here |
| **M0** mutation re-tier — drop `mutation-testing` from required checks | **CLOSED (confirmed no-op)** | `gh api repos/StevenFAU/Bit-Physics/branches/main/protection` → **404 "Branch not protected"**. No required checks exist to remove → the operator action is a no-op. (Consistent with D2 / Cluster D; the mutation-testing re-tier itself landed at the sibling chain, probe § P3 "probed-and-cleared") |

## § 3 — Commit boundaries

Verify-and-close has **no source edits**. The cluster's only artifacts are this checkpoint audit and
the SHA back-fill (the separate next commit). No substantive commit.

## § 4 — Invariant verification (I1–I7) at HEAD `ede4887`

| I | Invariant | State | Evidence |
|---|---|---|---|
| I1 | LFS pointer/content unchanged | **HOLD** | no file edited this cluster |
| I2 | Cross-phase replay bit-identity | **HOLD** | no change |
| I3 | integrity 0 HARD_FAIL; baseline byte-for-byte | **HOLD** | `0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 `c19492ad…d22cb52` |
| I4 | verify_evidence GREEN (no regression) | **HOLD** | 1.A 8/0, 1.C 8/0, 1.E 10/0; this checkpoint resolves at `ede4887` |
| I5 | append-only (no published audit edited) | **HOLD** | only net-new checkpoint added |
| I6 | Convention #12 SHA back-fill separate commit | **HOLD** | back-fill is the separate next commit |
| I7 | no agent-pushed tags | **HOLD** | no tag pushed (the `v0.2.1-…` tag cited for #15 is operator-pushed) |

## § 5 — Verification sweep (FACT)

- `.venv/bin/python -m integrity --all --mode strict` → `0 HARD_FAIL, 14 SOFT_WARN`; full-report
  sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (baseline held).
- `gh api .../branches/main/protection` → 404 (M0 no-op confirmed).
- `pytest tools/testkit/lfs_migration/` → `15 passed, 1 failed` (PD-1; unchanged; Cluster D next fixes it).

## § 6 — Exit state

Cluster F **CONFIRMED-Stage-1-F**: #4, #7, #15, #34, #9-landed CLOSED; M0 confirmed no-op. #9 residual
stays deferred-OUT (charter § 9). No scope absorbed. Next cluster per dispatch order: **1.D**
(branch-protection + tag governance + PD-1 — the soft-dep predecessor to 1.B).

## Conventions honored

Convention #8 (every closure grep-/command-verified against HEAD; no fabrication); Convention M
(re-anchored; no regression); Convention A (net-new checkpoint; back-fill follows); Convention #12
(SHA back-fill separate next commit); R-1 (no published audit edited; resolution audits cited read-only);
`evidence_paths` a list / `evidence_hashes` a YAML mapping; four-state verdict (CONFIRMED-Stage-1-F);
FACT/INFERENCE tagging; no agent-pushed tag (I7).
</content>

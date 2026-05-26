---
date: 2026-05-26T22-55-17Z
author: lfs-architecture-plan-drafting-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lfs-architecture-plan-drafting
stage: plan-drafting-landing
verdict: plan-drafting-CONFIRMED
head_sha: 01b651e22dbd45aa31c9c31a99295095d04aa2ef
head_sha_at_checkpoint: 1a96fbdc436614daa059a021800cc067928e009b
evidence_paths:
  - tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md
  - docs/phases/sub-phase-lfs-architecture.md
evidence_hashes:
  - tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md: sha256:1bfbae5102585a7b9b9bef00a2612566b8a22440afc2b46010dc271121a5e194
  - docs/phases/sub-phase-lfs-architecture.md: sha256:5f97f03d23e2325247a854fb0ba2adf81fc6086999df7a68167c0fe55740fdf0
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# Plan-drafting landing audit — sub-phase-lfs-architecture

**Verdict: plan-drafting-CONFIRMED.** The plan is ready for Stage 0 dispatch. This does **NOT**
mean the migration is complete — it means the probe + charter are sound, the invariants are
named with verification commands, and the D-class decisions are surfaced for operator routing.

## 1 — Commit chain (this plan-drafting session)

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | probe report | `tools/testkit/probes/reports/sub-phase-lfs-architecture-probe.md` | `d17a479dfd078c26965d86f7d176380a75727dae` |
| 2 | charter | `docs/phases/sub-phase-lfs-architecture.md` | `1a96fbdc436614daa059a021800cc067928e009b` |
| 3 | this landing audit | `docs/_audits/phase-2/sub-phase-lfs-architecture/plan-drafting-landing-2026-05-26T22-55-17Z.md` | `01b651e22dbd45aa31c9c31a99295095d04aa2ef` (back-filled in COMMIT 4 per Convention #12) |
| 4 | SHA back-fill ledger | `docs/_audits/phase-2/sub-phase-lfs-architecture/sha-back-fill-2026-05-26T22-55-17Z.md` | reported in coordinator summary (terminal artifact; not back-filled) |

Probe sha256 `1bfbae51…a5e194`; charter sha256 `5f97f03d…40fdf0` (both recorded in front-matter
`evidence_hashes` and verifiable by `verify_evidence` at this audit's `head_sha`).

## 2 — Preconditions verified at session start (all PASS — no Hard Rule 2 STOP)

1. HEAD `fd21445614d2f87549a4c660da91c988c4c6b1eb`; matches dispatch anchor.
2. `v0.2.0-phase-2` tag present.
3. Integrity `python -m integrity --all --mode strict` → 0 HARD_FAIL / 14 SOFT_WARN; full-report
   sha256 == `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (exact baseline).
4. `git lfs ls-files --long | wc -l` → 31.
5. `verify_evidence` PASS on 3 Phase-2 audits with LFS evidence (9/0, 48/0, 13/0), incl. LFS
   `.h5` content-OID resolution. I1 holds at HEAD.
6. (P7) Cross-phase replay phase-1→`v0.1.0-phase-1` `ok=True`, 8/8 gates PASS (I2);
   integrity baseline PASS (I3).

## 3 — What the plan covers (coverage map)

| Dispatch requirement | Where in charter | State |
|---|---|---|
| Probe P1–P7 | probe report § P1–§ P7 | CONFIRMED |
| External survey S1–S7 | probe § S1–§ S7; charter § 3 | CONFIRMED |
| Tier mapping A1 (catalog § 41/§ 45 onto 10 workflows) | charter § 4 | CONFIRMED |
| Selective LFS fetch (catalog § 45.1) | charter § 4.2 | CONFIRMED |
| External backend integration A2 | charter § 5 | CONFIRMED (lean R2 + lfs-s3) |
| Migration plan A3 (named commands, rollback) | charter § 6 | CONFIRMED (cutover D3-gated) |
| Invariants I1–I7 + A5 (verification cmds, boundaries) | charter § 7 | CONFIRMED |
| Determinism through migration A5 | charter § 7 (A5) | CONFIRMED |
| D-class D1–D9 (leans, decision-by) | charter § 8 | CONFIRMED (surfaced) |
| Risk register / STOP triggers | charter § 9 | CONFIRMED |
| Stage decomposition (0/1a/1b/1c/2) | charter § 10 | CONFIRMED |
| Scale projection (Phase 4 + Phase 6 + horizon) | charter § 11; probe § P6 | CONFIRMED (INFERENCE-ranged) |

## 4 — Material finding that reframes the sub-phase (operator attention)

**The dispatch brief's quota premise is stale (probe § P2, web-fetched 2026-05-26).** GitHub LFS
free quota is **10 GiB storage + 10 GiB bandwidth/month** (not 1+1), and **data packs are
removed** (metered now; $0 budget blocks overage). Current physical storage is **4.852 GiB —
under the free storage quota**. Consequence: the live pressure is **CI bandwidth** (concentrated
in 2 of 10 workflows that mostly don't need the bytes), and the external backend is a
**forward-looking** capacity move for the Phase-4 storage crossing of 10 GiB — not an emergency
unblock. Selective fetch (catalog § 45.1) is the highest-leverage immediate lever (~20×) and is a
**component** of the architecture, delivered alongside (not instead of) the backend integration.
This is a SHIFT in *framing* from the brief; the *deliverables* are unchanged and stronger for it.

## 5 — UNKNOWNs the plan flags for Stage 0 to resolve

- **UNKNOWN-1 — catalog provenance (Finding D0).** `bit-physics-master-catalog.md` is **not in
  the repo**; it is a local planning artifact (`/home/otacon/Downloads/…`, operator-confirmed).
  All catalog citations are tagged `[CATALOG — not in repo]`. Stage 0 confirms the intended
  catalog path and whether it should be vendored before its tier model is normative.
- **UNKNOWN-2 — live billing dashboard.** Not pasted (probe § P2 NOTE). Stage 0 attaches the live
  storage/bandwidth-used figures to anchor § 11.
- **UNKNOWN-3 — D1 backend routing.** Operator must choose the backend (lean R2) before Stage 1b.
- **UNKNOWN-4 — R2 account/secret.** Bucket + scoped token are operator actions (charter § 6 M0);
  secret injection cannot be agent-performed.

## 6 — D-class decisions surfaced (leans for operator routing)

- **D1 Backend:** lean **R2 via `lfs-s3`** (zero egress; 10 GB free; low lock-in/burden; DVC
  contraindicated by I1 MD5). By Stage 0.
- **D2 Tier count (catalog D-9):** lean **5-tier vocabulary, T1/T2 active, T3–T5 staged**. By 1a.
- **D3 Migration strategy:** lean **phased** — selective-fetch + proven R2 integration now;
  canonical cutover operator-routed at the 10-GiB trigger. By 1b.
- **D4 Redundancy:** lean **R2 primary + GitHub LFS fallback through transition**. By 1b.
- **D5 Outage behavior:** lean **T1/T2 SOFT_WARN, T3+ HARD_FAIL**. By 1a.
- **D6 Path-filter granularity:** lean **per-workflow selective-fetch now; shared dependency-graph
  filter deferred**. By 1a.
- **D7 Archive complement:** lean **defer to Phase 5 preprint-extraction**. Deferred.
- **D8 Pre-commit ceiling:** lean **stay at 2 GiB** (git-hygiene knob; raise per-need at Phase 4).
  No change this sub-phase.
- **D9 Phase-4 readiness:** lean **just works** (content-addressing schema-agnostic; verify at 1c).

Plus a CI-policy rider (not LFS, not a blocker): `.github/workflows/mutation-testing.yml` runs
per-push but belongs weekly (catalog § 41.4) — optional Stage-1a re-tier.

## 7 — Invariants confirmed intact at HEAD (must survive transition)

| Inv | Held at HEAD `fd21445`? | How re-verified per stage |
|---|---|---|
| I1 LFS content-OID | YES (3 audits PASS; offline OID) | verify_evidence on 3 pinned audits + pointer-byte-identity; every stage |
| I2 bit-identity replay | YES (`ok=True`, 8/8) | `replay_prior_phase --prior-phase phase-1`; Stage 0 + Stage 2 |
| I3 integrity baseline | YES (0 HARD_FAIL, `c19492ad…`) | `integrity --all --mode strict`; every stage (gate = 0 HARD_FAIL) |
| I4 append-only | YES | `audit-append-only.yml` CI GREEN; every commit |
| I5 prior-tag resolve | (to verify at 1c) | worktree checkout of prior tags + `git lfs pull`; Stage 1c + before any GitHub-LFS-off |
| I6 Convention #12 | YES (this chain) | separate back-fill commit; every stage |
| I7 no agent-pushed tags | YES (none) | no tag pushed; every stage |

## 8 — Conventions / disciplines honored this session

- Convention C/D (probe before drafting); Convention M (re-anchored commit-message + back-fill
  mechanics against live `git log`, not the brief's illustrative `probe:`/`plan:` titles —
  repo uses `docs(...)` / `chore(...)`); Convention A (probe + charter are new files; landing is
  the audit); Convention #8 (every claim grep-/web-fetch-verified; catalog tagged not-in-repo);
  Convention #12 (back-fill is COMMIT 4, separate, never `--amend`); Hard Rule 2 (no HEAD-vs-plan
  drift found → no STOP).
- Four-state verdicts; FACT/INFERENCE tagging throughout probe + charter; append-only (this is a
  net-new audit; the prior chain is untouched); trunk-based (direct to `main`); no tag pushed.

## 9 — Hard Rule 2 STOPs encountered

**None.** All preconditions PASS; no HEAD-vs-plan drift; backend facts verified (not ambiguous);
no invariant failure. One *framing* SHIFT (§ 4, quota premise) — surfaced, not a STOP, because
the deliverables stand and are strengthened.

## 10 — Forward routing

Operator routes D1 (backend) + acknowledges D2/D5/D6 + provides UNKNOWN-2 dashboard → coordinator
dispatches Stage 0. D7 → Phase 5. Any spec amendment → operator-approved separate commit only.
This plan-drafting chain closes with COMMIT 4 (SHA back-fill); COMMIT 4's own SHA is the
recursion-stopper, reported in the coordinator summary, not further committed.

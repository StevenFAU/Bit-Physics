---
date: 2026-06-11
author: phase-6-charter-amendment-agent
phase: 6
artifact: charter-amendment
artifact_id: charter-amendment-operating-model
verdict: RATIFIED
verdict-state: RATIFIED
head_sha: dba76966ea517a73c807bb0afec13e22bcb6b7c7
prior_phase_tag: v0.5.0-phase-5
ratified_by: operator
ratified_on: 2026-06-10
parent_audits:
  - "[[phase-5-close-2026-06-10T12-38-41Z]]"
  - "[[post-close-housekeeping-and-pages-launch-2026-06-10]]"
---

# Phase-6 charter amendment — D-9 SHIFT + two-lane serial-cluster operating model (operator-ratified 2026-06-10)

> First entry in the `docs/_audits/phase-6/` ledger (append-only). This note
> records the operator-ratified revision of the Phase-6 operating model landed
> as charter v1.3 (`docs/phases/phase-6-charter.md`). The decisions below are
> final (ratified governance content); this note is the SHIFT record required
> so the change is never read as a silent edit. FACT = read/grep-verified this
> session at HEAD `dba7696`.

## § 1 — D-9 SHIFT record

**Decision identifier.** D-9 — "Multi-agent coordination tooling and
tier-count convention", `docs/planning/bit-physics-master-catalog.md` § 60.1
(options (a)–(d)).

**Prior state (grep-verified at HEAD, Convention #8).** D-9 was recorded as
**open**. The catalog's § 60.1 default position was **(d) defer — single-agent
execution through Phase 6.5**; the catalog's Part VI prose (§§ 59–60) leaned
toward option (a)/(b) — **Claude Code Agent Teams + git worktrees +
CLAUDE.md/AGENTS.md** — as the eventual multi-agent coordination stack for
Phase 6+ ("the pattern is no longer hypothetical", § 59). No ratified
resolution toward the multi-agent stack exists anywhere in the repo (audit
chain, spec, charter all grep-clean for it); the only prior D-9-adjacent
ruling is the LFS sub-phase's local tier-count lean (D2, 5-tier vocabulary).
The dispatch's shorthand "D-9 resolved toward Agent Teams" is therefore
recorded here against the live-source state: *leaned-toward in catalog prose,
never ratified* — surfaced to the operator in the landing report per
section-0.3 / Convention #8 discipline.

**Revised resolution (RATIFIED 2026-06-10).** D-9 closes toward **serial
single-agent self-driving cluster dispatches**, with parallelism ONLY as the
two-lane file-surface partition of § 2 below. The Agent-Teams/worktree
multi-agent direction is rejected for Phase 6.

**Evidence for the SHIFT.**

- (a) **Measured Phase-5 single-session throughput.** The 5-run CI campaign,
  the full-project health sweep, and the dual launches (Pages +
  binary-release) were each executed by single self-driving sessions with
  continuation handoffs (`docs/_audits/phase-5/` ledger). The throughput
  premise behind multi-agent coordination is refuted by measurement.
- (b) **The project's load-bearing disciplines are single-writer
  disciplines.** Append-only audit ledgers, trunk-based `main`,
  Convention-#12 SHA back-fills, and HARD-STOP ratification gates all assume
  one agent's coherent view of HEAD. Concurrent worktree agents would import
  state-divergence risk — the exact failure class the verification
  architecture exists to prevent.

## § 2 — Two-lane operating model (ratified)

- **Lane A — Phase-6 forward:** new sim packages, category dirs,
  `tools/testkit`, `docs/sim-specs`, phase-6 audits, and the
  standing-backlog items routed in charter § 2.6.
- **Lane B — Portfolio polish:** presentation layer ONLY of the shipped web
  portfolio — per-sim web frontend UI (controls, layout, styling, panels),
  the Pages landing page, common-web presentation code.
- **Lane boundary HARD RULE:** lanes commit only to their own file surfaces.
  Lane B MUST NOT change compute kernels: WGSL shaders, step loops, seeded
  initial-state generation, capture/gate paths, tolerance or verify code. If
  a polish task requires touching any of those, the agent HARD-STOPs to the
  operator; if ratified, the change runs the FULL validate gate and is called
  out explicitly in the report and audit — never slipped into a styling
  commit. (The deploy pipeline publishing only validated bundles is the
  backstop, not the boundary.)
- **Shared-main discipline:** both lanes push to `origin/main`. Every session
  MUST `git pull --rebase` before its first commit and before every push; on
  any rebase conflict touching the other lane's surface, HARD-STOP (HARD
  RULE 2). Convention M: re-anchor against HEAD before editing.

## § 3 — Cluster execution model (ratified)

Phase 6 executes as a sequence of CLUSTERS, each a charter-first self-driving
dispatch: agent proposes scope + anchors verified against live sources
(PHASE-0-charter HARD-STOP pattern), operator ratifies, agent self-drives
with continuation handoffs.

- **Ordering:** C-1 = Phase-4-Greenfield-CPU pool (the deferred-with-cause
  frontier sims not requiring CUDA — already-scoped unblocking work first).
  C-2+ = catalog family clusters from the master-catalog phenomenon families,
  scoped per-cluster at charter time (the catalog is a superseded baseline;
  cluster charters anchor against live papers and the audit chain, never
  against catalog prose). Standing backlog items (Windows/macOS binaries,
  boids-3d-wgsl-precision-review, append-only CI full-chain coverage,
  integrity cat2 TODOs) are woven between clusters as small dispatches at
  operator discretion. Phase-4-CUDA x10 stays parked pending hardware.
- **CLUSTER-CLOSE definition:** per-cluster mini-audit under
  `docs/_audits/phase-6/` (append-only), `verify_evidence` green over the
  cluster's audits, full CI sweep green at the cluster's final head
  (sub-phase conventions § S.5), all 13 gates or declared-deferred-with-cause
  per sim. **NO tag per cluster** — `v0.6.0-phase-6` is proposed once at
  phase close, operator-pushed (I7 / spec § 7.12).

## § 4 — Charter supersessions recorded by this amendment (v1.2 → v1.3)

All of these are explicit supersessions contained in the ratified content —
none was an unresolved section-0.3 conflict:

1. Header **Execution model** line: multi-track / tagged-at-track-close →
   two-lane serial cluster dispatches, no per-cluster tags.
2. **v2-amendment stack item 4** (per-track tag `v0.6.0-phase-6-<track>`) →
   single `v0.6.0-phase-6` proposed at phase close, operator-pushed (I7).
   The rest of the v2 verification-hardening stack stays normative with
   "track" read as "cluster".
3. **§ 3 operating model** (track → sub-charter → landing → tag) → cluster
   model per § 3 above; the charter-first ratification gate serves the
   Convention E-addendum pre-dispatch-review function.
4. **§ 6 audit paths** (`docs/_audits/phase-6-<track>/...`) → cluster
   mini-audits land in `docs/_audits/phase-6/` (this directory; this note is
   its bootstrap entry).
5. **§ 4 ordering** — not a conflict (v1.2 § 4 self-declares "a suggestion;
   owner re-orders"); the ratified C-1/C-2+ ordering IS the owner re-order,
   cross-referenced from § 4.
6. **§ 1 scope** — Lane B noted in scope so polish commits are not read as
   scope creep; charter § 2.6 backlog routing stands unchanged.

## § 5 — Commit SHAs (Convention #12 back-fill)

- Audit-note bootstrap commit (this file, Convention A new-files-first):
  *(back-filled in a follow-up commit per Convention #12 — never `--amend`)*
- Charter v1.3 amendment commit: *(back-filled in the same follow-up commit)*

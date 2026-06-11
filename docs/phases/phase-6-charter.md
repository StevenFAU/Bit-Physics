# Phase 6+ — Ongoing Maintenance, Expansion, and Open Backlog Charter

> **Project:** Bit-Physics (`git@github.com:StevenFAU/Bit-Physics.git`; owner: Steven Cohen)
> **Version:** 1.3 (operating-model revision — two-lane serial cluster execution; landed June 11 2026, operator-ratified June 10 2026)
> **Spec anchor:** `docs/architecture.md` (v2.4; originally drafted as `gpu-sims-design-spec-v2.md`) § 11.7 (Ongoing) + § 11.0 (Pacing under single-agent AI dispatch) + spec Appendix D + spec Appendix G + spec Appendix E.
> **Plan location:** `docs/phases/phase-6-charter.md` (this file).
> **Status:** Draft charter. Lives as a long-running planning artifact, not a single executable phase.
> **Execution model (v1.3):** Two-lane serial cluster execution (§ 3). Each cluster is a charter-first self-driving single-agent dispatch (spec § 7.13) with continuation handoffs, committing direct to `main`. **No per-cluster tags** — `v0.6.0-phase-6` is proposed once at phase close, operator-pushed (I7 / spec § 7.12). *(v1.2's multi-track / tagged-at-track-close model is superseded — see the v1.3 amendment block below.)*

> **v2 verification-hardening amendments (May 18 2026, post-design-spec v2.4):** Normative for every Phase 6 sub-charter.
>
> Every Phase 6.<track> sub-charter inherits the full v9-amendment stack from Phase 4 / Phase 5. The mechanical conventions banked across spec § 1.3 (TDD output hash), § 2.4 (independent-reference anchors), § 2.6 (tolerance budget), § 2.13 (mutation testing), § 2.14 (PBT), § 2.15 (perf-ledger), § 3.5 (13 gates per sim), § 7.4 (phase-plan review), § 7.5 (verify_evidence, append-only CI, cross-phase replay), § 7.12 (operator-only tag pushing + server-side hooks) apply to every track without re-derivation.
>
> Concretely, every Phase 6.<track> sub-charter MUST include:
>
> 1. **Pre-dispatch review (Convention E-addendum, spec § 7.4):** Owner runs phase-plan-review session before dispatch; audit at `docs/_audits/phase-6-<track>/pre-dispatch-review-<UTC>.md`.
> 2. **Cross-phase audit replay (first action):** Track's first stage runs `python -m integrity.scripts.replay_prior_phase --prior-phase <most-recent-phase-or-track-tag> --audit <its-landing-audit> --gates …`. Discrepancy → BLOCKED.
> 3. **TDD discipline:** Sim tracks honor spec § 1.3 step 4 (failing-tests output hash in commit footer). Capability/maintenance tracks where no sim is added skip this for non-sim deliverables but inherit it for any sim-adjacent test surfaces.
> 4. **Operator-only tag pushing (spec § 7.12):** Track closes by proposing the tag `v0.6.0-phase-6-<track>` (or whichever versioning the owner picks); agent never runs `git tag` or `git push origin <tag>`. **[Superseded by v1.3:** no per-track/per-cluster tags; a single `v0.6.0-phase-6` is proposed once at phase close, operator-pushed. The operator-only-push rule itself stands.**]**
> 5. **Evidence-path verification + append-only check:** Track's closing audit runs `verify_evidence.py` on every track-stage report and runs the append-only check against the immediately-prior tag.
> 6. **Schema-corpus growth (if track touches captures):** Append entries to `tests/fixtures/legacy-captures/phase-6-<track>-<sim>.h5` for any future schema bump (no current bumps planned beyond Phase 4 WU-A's 1.1.0).
> 7. **Perf-ledger row (if track produces a sim):** Append to `docs/perf-ledger.md` per spec § 2.15.
> 8. **Mutation-testing threshold compliance:** Tracks that touch testkit/integrity modules must not regress mutation scores below spec § 2.13 thresholds.

> **v1.3 operating-model amendment (landed June 11 2026; operator-ratified June 10 2026).** SHIFT record at `docs/_audits/phase-6/charter-amendment-operating-model-2026-06-11T12-51-28Z.md` (first entry of the phase-6 audit ledger).
>
> **D-9 SHIFT.** Catalog D-9 (`docs/planning/bit-physics-master-catalog.md` § 60.1, multi-agent coordination tooling) stood open, with catalog Part VI prose leaning toward Claude Code Agent Teams + git worktrees + CLAUDE.md/AGENTS.md for multi-agent coordinated execution (default position: (d) defer). **D-9 now closes toward serial single-agent self-driving cluster dispatches**, with parallelism ONLY as the two-lane file-surface partition of § 3. Evidence: (a) measured Phase-5 single-session throughput — the 5-run CI campaign, health sweep, and dual launches were executed by single self-driving sessions with continuation handoffs; the throughput premise behind multi-agent is refuted. (b) The project's load-bearing disciplines are single-writer disciplines: append-only audits, trunk-based `main`, Convention-#12 back-fills, and HARD-STOP ratification gates all assume one agent's coherent view of HEAD; concurrent worktree agents would import state-divergence risk — the exact failure class the verification architecture exists to prevent.
>
> **Supersessions (v1.2 → v1.3):** header execution-model line (multi-track → two-lane serial clusters); v2-amendment item 4 (per-track tags → single phase-close tag); § 3 (track model → cluster model); § 6 (per-track audit dirs → `docs/_audits/phase-6/`). The rest of the v2 verification-hardening stack stays normative for every cluster, with "track" read as "cluster". § 2.6 backlog routing stands unchanged.

This document is the **charter** for everything after Phase 5's productization completes. Unlike Phases 0–5, Phase 6+ is not a single execution unit — it's a rolling commitment to maintenance, capability expansion, and frontier tracking. The charter exists so that whenever a Phase 6 sub-charter is written, it has a parent reference for scope, conventions, and decision authority.

---

## § 1 — What Phase 6 covers (and does not)

Phase 6+ covers:

1. **Maintenance of Phases 0–5 deliverables** — dependency-update sweeps, vulnerability response, upstream-API drift, CI breakage, doc rot.
2. **Stack expansion** — Stack F (Rust / wgpu) full adoption past Phase 3's task-10 banked decision; Stack G (Mojo) adoption when Mojo open-sources stably.
3. **Capability expansion within existing categories** — additional sims in already-shipped categories (e.g., a new SPH variant past pic-flip; an additional LBM frontier).
4. **New categories** — soft-body elastodynamics SIGGRAPH-2025 frontier (JGS2, MGPBD, Elastic Locomotion), quantum (ising-dwave hardware-pending), JAX ecosystem (JAX-MD, Brax, PhiFlow), NeuralVDB, OpenLB.
5. **Annual SIGGRAPH frontier additions** — at every SIGGRAPH cycle, evaluate new papers for adoption.
6. **Cross-cutting capability work** — e.g., a unified determinism harness across multiple new sims; a unified rendering pipeline beyond Phase 5's render-passes.
7. **Audit-tooling maturation** — Cat 4 grammar additions beyond Phase 1 Stage 1's three; Cat 5 link-graph visualization; integrity dashboard.
8. **Lane B — portfolio presentation polish (v1.3).** Presentation-layer work on the shipped web portfolio — per-sim web frontend UI (controls, layout, styling, panels), the Pages landing page, common-web presentation code — runs as its own lane under § 3.1 and is **in scope**. Lane-B polish commits on `main` are charter-sanctioned, not scope creep. Lane B never touches compute kernels (HARD RULE, § 3.1).

Phase 6+ does NOT cover:

- Reworking Phases 0–5 architecture. Architectural decisions made in v2.3/v2.4 (and the v2.1/v2.2 amendments folded into v2.3, plus the v2.4 verification-hardening pass) stand. New conventions banked here, not retconned.
- Building infrastructure that should have been Phase 4.0 work (if discovered, route through a Phase 4.0+ addendum, not Phase 6).
- Bespoke per-sim productization needs (spec § 4.13 of Phase 5 plan; addressed per-sim post-Phase-5).

---

## § 2 — Open-backlog inventory (initial state, May 2026)

This is the starting backlog. It evolves as items are picked up.

### 2.1 Maintenance items (rolling)

- Dependency updates per spec § 9.2; semver-major bumps trigger a dedicated mini-phase.
- Newton 2.0 migration (when 2.0 ships) — affects `common-warp.newton`, all Phase 4.5 sims, all 4.6 sims that use Newton through training-through-sim.
- PyTorch / Lightning major version bumps.
- WebGPU spec changes affecting Stack B sims.
- Vendored-upstream SHA refreshes per spec § 2.8.

### 2.2 Stack expansion

- **Stack F (Rust / wgpu) full adoption.** Phase 3 task-10 banked the revisit. Decide whether to port one reference sim or one variant per category. The decision rests on whether Rust/wgpu still represents a meaningful diversification by Phase 6 dispatch.
- **Stack G (Mojo).** Trigger condition: Mojo open-sources with a stable enough surface to use in production. Until then, Stack G is horizon-only per spec § 4.7.

### 2.3 New sims under existing categories

- `particle-fluid/pic-flip` — spec § 5.4 marks as stretch; backlog per spec § 11.7.
- Additional MPM variants beyond Phase 4's three.
- Additional LBM frontier sims beyond Phase 4.4's two.
- Boids variants (long-range; flocking with predators; etc.).

### 2.4 New categories

- **Soft-body elastodynamics frontier** — SIGGRAPH 2025 trio: JGS2, MGPBD, Elastic Locomotion. Per spec § 5.9 + § 11.7. Needs a soft-body Phase 6 sub-charter.
- **Quantum (ising-dwave).** Per spec § 5.10 + § 12.5. Hardware-access decision pending (D-Wave Leap or AWS Braket); if cloud-accessible, can land Phase 6.
- **JAX ecosystem** (JAX-MD, Brax, PhiFlow). Per spec § 6.1 mention + § 11.7. Needs a JAX Phase 6 sub-charter with new stack adoption discipline.
- **NeuralVDB.** Per spec § 6.2 mention + § 11.7. Sibling of WU-B sparse; Phase 6 sub-charter when usefulness is clear.
- **OpenLB.** Per spec § 5.7 mention + § 11.7. Larger-scale LBM frontier; Phase 6 sub-charter.

### 2.5 Cross-cutting

- Integrity dashboard for Cat 1–5 metrics over time.
- DOI / Zenodo integration for captures (per v3 review tightening recommendations).
- Pre-registration discipline for benchmark hypotheses (per v3 review).
- Top-level Docker image for fully reproducible builds (per v3 review).

### 2.6 Routed deferrals from the Phase-4/5 closes (added 2026-06-10, post-phase-5 housekeeping)

The Phase-4 landing and Phase-5 close named these deferrals; this section is
their accountable Phase-6 home (architecture § 11.7 ownership table mirrors it):

- **Windows/macOS binary-release matrix** — 5.2 landing S-5/C-4 +
  `docs/productization/binary-release.md`; the bootstrap gate is
  lavapipe-pinned Linux today.
- **Phase-4-CUDA deferral track** — the 10 CUDA-bound frontier-variant rows
  (15/16/17/18/22/31/32/33/34/35 per `docs/phase4/ledger.md`). Precondition:
  an A100-class CUDA 12 host (CUDA measured absent on the dev box).
- **Phase-4-Greenfield-CPU deferral track** — the 8 greenfield-needs-base-sim
  frontier rows (base sims first, then ports), operator-decidable batches.
- **`boids-3d-wgsl-precision-review`** — Phase-5 close § 5.1: sim-owner
  inspection of the boids WGSL update kernel (fma/contraction,
  precision-pragma) explaining the lavapipe-only 0.0354 pointwise divergence.
  The observable gate ships delivery; it does not close this.
- **render-passes + preprint-extraction cloud-job dispatch** — both remain
  operator-dispatch-only; automating dispatch (and widening the per-pipeline
  content pool beyond the R4 canonicals) is Phase-6 work.
- **audit-append-only CI gate full-chain coverage** — today the CI gate checks
  `docs/_audits/` only and only the most-recent-tag→HEAD hop; the housekeeping
  sweep verified the full chain + all `_audits` trees manually and found two
  historical (pre-gate-fix) violations. Extending the gate is Phase-6 work.
- **integrity Cat-2 cpp-headers / ts-exports checks** — `TODO(phase-1)`
  placeholders in `tools/integrity/integrity/cat2_contracts/__init__.py`,
  never implemented; retargeted here from the aged-out phase-1 tag
  (operator ruling at the housekeeping sweep: implement-or-drop is a Phase-6
  decision).

---

## § 3 — Operating model (v1.3): two lanes, serial cluster execution

> v1.2's track-based model (owner picks track → sub-charter → spec § 7.13 execution → landing audit → per-track tag) is superseded by this section; the SHIFT record with evidence is the v1.3 amendment block above and `docs/_audits/phase-6/charter-amendment-operating-model-2026-06-11T12-51-28Z.md`. Phase 6 still has no single landing event; what changed is how dispatches are shaped, paralleled, and tagged.

### 3.1 Two-lane model

- **Lane A — Phase-6 forward:** new sim packages, category dirs, `tools/testkit`, `docs/sim-specs`, phase-6 audits, and the standing-backlog items routed in § 2.6.
- **Lane B — Portfolio polish:** presentation layer ONLY of the shipped web portfolio — per-sim web frontend UI (controls, layout, styling, panels), the Pages landing page, common-web presentation code.
- **LANE BOUNDARY HARD RULE:** lanes commit only to their own file surfaces. Lane B MUST NOT change compute kernels: WGSL shaders, step loops, seeded initial-state generation, capture/gate paths, tolerance or verify code. If a polish task requires touching any of those, the agent HARD-STOPs to the operator; if ratified, the change runs the FULL validate gate and is called out explicitly in the report and audit — never slipped into a styling commit. (The deploy pipeline publishing only validated bundles is the backstop, not the boundary.)
- **SHARED-MAIN DISCIPLINE:** both lanes push to `origin/main`. Every session MUST `git pull --rebase` before its first commit and before every push; on any rebase conflict touching the other lane's surface, HARD-STOP (HARD RULE 2). Convention M: re-anchor against HEAD before editing.

### 3.2 Cluster execution model (Lane A)

Phase 6 executes as a sequence of CLUSTERS, each a charter-first self-driving dispatch: agent proposes scope + anchors verified against live sources (PHASE-0-charter HARD-STOP pattern), operator ratifies, agent self-drives with continuation handoffs. The charter-first ratification gate serves the Convention E-addendum (spec § 7.4) pre-dispatch-review function.

**Cluster ordering:**

- **C-1 = Phase-4-Greenfield-CPU pool** (§ 2.6) — the deferred-with-cause frontier sims not requiring CUDA; already-scoped unblocking work first.
- **C-2+ = catalog family clusters** from the master-catalog phenomenon families, scoped per-cluster at charter time. The catalog is a **superseded baseline**: cluster charters anchor against live papers and the audit chain, never against catalog prose.
- **Standing backlog items** (Windows/macOS binaries, boids-3d-wgsl-precision-review, append-only CI full-chain coverage, integrity cat2 TODOs — § 2.6 routing stands) are woven between clusters as small dispatches at operator discretion.
- **Phase-4-CUDA x10 stays parked** pending hardware (§ 2.6).

### 3.3 Cluster-close definition

- Per-cluster mini-audit under `docs/_audits/phase-6/` (append-only).
- `verify_evidence` green over the cluster's audits.
- Full CI sweep green at the cluster's final head (sub-phase conventions § S.5).
- All 13 gates (spec § 3.5) or declared-deferred-with-cause per sim.
- **NO tag per cluster** — `v0.6.0-phase-6` is proposed once at phase close, operator-pushed (I7 / spec § 7.12).

### 3.4 What carries over from v1.2

- The v2 verification-hardening amendment stack above stays normative for every cluster, with "track" read as "cluster" (item 4 superseded as noted).
- The § 5 per-track charter template remains the skeleton for cluster charters.
- § 7 convention banking is unchanged: clusters that introduce conventions co-author the spec amendment with the cluster's landing commit.
- The portfolio's audit trail grows continuously: every cluster leaves behind a ratified cluster charter + mini-audit in `docs/_audits/phase-6/`, and the spec's § 11.7 ownership table is the running index.

---

## § 4 — Tracks already named (priority order, owner-decided)

> **v1.3 note:** the operator exercised the re-order this section invites — the ratified cluster ordering is § 3.2 (C-1 = Phase-4-Greenfield-CPU pool, then catalog family clusters, backlog woven between). The list below is retained as the candidate-family inventory, not the dispatch order.

The initial priority is owner's call. A reasonable Phase-5-close ordering:

1. **Maintenance sweep** — verify Phases 0–5 still build green; refresh vendored SHAs; bump dependencies with semver-compatible updates. ~1 week. First Phase 6 dispatch.
2. **Soft-body elastodynamics frontier** (JGS2 / MGPBD / Elastic Locomotion) — completes spec § 5.9 frontier coverage. ~3 weeks per sim; 9 weeks total.
3. **Stack F full adoption** — port one reference sim per category to Rust/wgpu. ~6–8 weeks.
4. **JAX ecosystem integration** — Brax, JAX-MD, PhiFlow as additional stacks or as adapters. ~4–6 weeks.
5. **ising-dwave** — pending hardware-access decision. Quantum category completion.
6. **NeuralVDB and OpenLB** — sparse + lattice frontier extensions.
7. **Cross-cutting tooling** — integrity dashboard, Zenodo DOI, pre-registration.

This ordering is a suggestion; owner re-orders based on portfolio direction at Phase-5-close.

---

## § 5 — Per-track charter template

> **v1.3 note:** this skeleton now serves cluster charters (read "track" as "cluster"). Drop the tag-prepare / `Tag pushed: NO` closing step — cluster closes propose no tag (§ 3.3); audit paths resolve per § 6 (single `docs/_audits/phase-6/` ledger).

When authoring a new Phase 6.<track> sub-charter, use this skeleton:

```markdown
# Phase 6.<track-name> — <Track Description>

> **Spec anchor:** docs/architecture.md v2.4+ § <relevant section>
> **Phase 6 charter anchor:** docs/phases/phase-6-charter.md § 2.<N>
> **Plan location:** docs/phases/phase-6-<track-name>.md
> **Execution model:** Sequential single-agent (spec § 7.13).

> **Verification-hardening amendments (inherits from Phase 6 charter v2):**
>
> - **Cross-phase audit replay (first action):** Track's first stage runs `replay_prior_phase.py` against the prior-tag landing audit.
> - **TDD output-hash in commit footer (sim tracks):** per spec § 1.3 step 4.
> - **Independent-reference anchors (new golden tables):** ≥ 3 per table per spec § 2.4.
> - **Tolerance-budget compliance:** per spec § 2.6.
> - **PBT-covered invariants in spec § 6:** per spec § 2.14.
> - **Perf-ledger row per sim:** per spec § 2.15.
> - **Mutation-testing thresholds:** per spec § 2.13.
> - **Phase-plan review (Convention E-addendum):** owner runs pre-dispatch review.
> - **Evidence-path verification + append-only check:** at closing audit.
> - **Operator-only tag pushing:** closing audit ends with `Tag pushed: NO (operator action required)`.

## § 0 — Preconditions

(Including: prior-phase tag exists; cross-phase replay against prior tag passes.)

## § 1 — Scope

(What sims / capabilities ship in this track; what doesn't.)

## § 2 — Per-unit charter

(Each sim or capability gets a charter section. For sim units: declares PBT invariants in spec § 6; declares golden-table independent-reference anchors; ports through 13-gate acceptance per spec § 3.5.)

## § 3 — Stage decomposition

(Stage 1 first action: cross-phase audit replay. Per-sim stages: failing-tests with output-hash; implementation with witnessed hash. Closing stage: verify_evidence, append-only check, failing-tests replay spot-check, mutation-threshold gate, perf-ledger review, tag-prepare-do-not-push.)

## § 4 — Acceptance criteria

(13 gates per sim per spec § 3.5; the v9-amendment-required mechanical gates from Phase 4 inherited.)

## § 5 — Per-unit agent prompt template

## § 6 — Decisions left for the owner

## § 7 — Audit-file paths

(docs/_audits/phase-6-<track-name>/...)

```

Existing exemplars to adapt from:

- Phase 4.1 sub-landing plan (six variant sims; clean per-sim template) — best for tracks adding sim variants.
- Phase 4.5 sub-landing plan (three new reference sims; owner picks names) — best for tracks adding new reference sims.
- Phase 4.4 sub-landing plan (eight heterogeneous frontier sims) — best for tracks where sim-to-sim variance is high.

---

## § 6 — Audit-file paths (v1.3)

Per spec § 8.1, as revised by the v1.3 amendment:

- All Phase-6 cluster audits land in the single append-only ledger directory `docs/_audits/phase-6/`.
- Cluster mini-audits at `docs/_audits/phase-6/<cluster>-close-<UTC>.md`; per-unit reports at `docs/_audits/phase-6/<cluster>-<unit>-<UTC>.md`.
- The directory was bootstrapped by the v1.3 charter-amendment note (its first entry).
- *(v1.2's per-track directories `docs/_audits/phase-6-<track-name>/` are superseded; none was ever created.)*

---

## § 7 — Convention evolution

When a Phase 6 track introduces a convention worth banking program-wide, extend spec Part VII §§ 7.11+ and/or Appendix G in a versioned spec-amendment commit (e.g., a v2.4 amendment block at the spec top listing what was added). Phase 6 tracks that introduce conventions co-author the spec amendment with the track's landing commit.

---

*End of Phase 6+ charter.*

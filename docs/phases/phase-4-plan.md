# Phase 4 — Frontier Variants: Full-Phase Plan

> **Project:** Bit-Physics (`git@github.com:StevenFAU/Bit-Physics.git`; owner: Steven Cohen)
> **Version:** 8.0 (dispatch-hardening pass, May 18 2026)
> **Spec anchor:** `docs/architecture.md` (v2.4; originally drafted as `gpu-sims-design-spec-v2.md`) Part XI § 11.5 items 4.0 + 4.1–4.27 + spec § 12.8 (hardware floor) + § 12.9 (paper vendoring) + spec § 2.13/2.14/2.15 (mutation testing, PBT, perf-ledger; v2.4 additions) + spec § 1.3 step 4 (failing-tests output hash) + spec § 2.7/§ 2.12 (schema-version + backward-compat corpus); also Part II (verification), Part III §§ 3.1–3.7 (layered architecture), Part VI (cross-cutting axes), Part VII (conventions), Part IX (build/CI). Plus spec Appendix D + spec Appendix G + spec Appendix E.
> **Status:** dispatch-ready (contingent on Phase 3 landing + owner pre-flights per § 2).
> **Audience:** Phase 4 coordinator (one claude.ai chat for the whole phase) and one Claude Code agent role (auto-accept; may span multiple sessions if context fills).
> **Execution model:** **One coordinator chat. One Claude Code agent role. 35 stages dispatched sequentially within that role**. The agent reads this entire document, then works through Stage 1 → Stage 35 in order, committing directly to `main` (trunk-based, spec § 7.12), reporting back to the coordinator at each stage's close and at phase landing. Auto-accept means the human doesn't approve per-edit; agent self-validates per the stage's acceptance criteria.

> **v9 verification-hardening amendments (May 18 2026, post-design-spec v2.4):** Normative; supersedes conflicting text below.
>
> **CROSS-PHASE AUDIT REPLAY (Stage 1 first action):** Before any Stage 1 work, the agent runs `python -m integrity.scripts.replay_prior_phase --prior-phase phase-3 --audit docs/_audits/phase-3/close-R3-R5-task9-20260530T145125Z.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`. Discrepancy → BLOCKED; surface to operator; do not begin Stage 1. Per spec § 7.5. (Phase-3 close shipped no single `landing-<UTC>.md`; the tag `v0.3.0-phase-3` is resolved from `--prior-phase`, and the `--audit` file is read only for front-matter. The repoint corrects a hard-coded path that would otherwise raise `FileNotFoundError` before any gate runs.)
>
> **SCHEMA-VERSION BUMP REGRESSION CORPUS (CRITICAL — WU-A + WU-B):** Per spec § 2.7 + § 2.12, when WU-A (Stage 2) bumps `schema_version` 1.0.0 → 1.1.0 to add `gradient_fields`, AND when WU-B (Stage 3) adds `active_mask` under the same 1.1.0 bump, the post-bump capture reader MUST round-trip every entry in `tests/fixtures/legacy-captures/` without loss. The corpus by Phase 4 open contains: Phase 0's RD-2D, Phase 1's 9 sim TDD-bootstrap captures (where realized via implementation phases, otherwise placeholders), Phase 2's 8 port captures, Phase 3's 7 sim captures — ~25 entries total. WU-A's acceptance test includes the corpus round-trip explicitly; failure → REFUTED, schema bump withdrawn until reader fixed. This is the load-bearing test that makes the "additive schema bumps are non-breaking" claim in spec § 2.7 testable.
>
> **GATE COUNT EXPANDED to 13 (sim stages) per spec § 3.5 v2.4:** Stages 9–35 (frontier sims) each pass the 13-gate set: Gates 1–10 (legacy Layer 4), Gate 11 (PBT invariants), Gate 12 (perf-ledger row), Gate 13 (failing-tests replay verifiable). Cross-stack equivalence Gate 14 applies to frontier variants that have cross-stack siblings (most do).
>
> **FAILING-TESTS OUTPUT HASH:** Every frontier sim stage's failing-tests commit MUST carry the output-hash footer per spec § 1.3 step 4. The implementation commit witnesses the hash. Stage 36 (the closing audit) replays 3 random sim stages.
>
> **TOLERANCE-BUDGET COMPLIANCE (WU-F):** Stage 7 (WU-F variant-equivalence) ratifies per-variant tolerances. Every variant tolerance is within `tolerance-budget.toml` cap per spec § 2.6. Variants that need wider tolerance for legitimate numerical reasons (PINN-based sims, gaussian-fluid frontier variants) propose tolerance-budget amendments via separate operator-approved commits; the agent never amends unilaterally.
>
> **PERF-LEDGER ROW PER STAGE:** Each of Stages 9–35 appends a row to `docs/perf-ledger.md`. The closing audit reads the ledger and flags any frontier variant > 2× slower than its non-frontier baseline. Informational, not blocking.
>
> **MUTATION-TESTING:** Stages 1–8 introduce significant new testable surfaces (autodiff, sparse-volumes, 3dgs, Newton, learning harness, equivalence). Per spec § 2.13, each WU's deliverable includes mutation-score baselines for its new module; closing audit confirms no regression below thresholds.
>
> **PROPERTY-BASED TESTING (frontier expansion):** Frontier variants inherit their non-frontier sibling's PBT invariants (e.g., the differentiable RD-2D inherits RD-2D's PBT invariants). Additionally, each frontier-variant axis adds PBT invariants for the variant's claim: differentiable variants assert gradient correctness via PBT; sparse variants assert active-mask invariance under random sparsity patterns; neural variants assert render-similarity invariance under random ICs.
>
> **INDEPENDENT-REFERENCE ANCHORS:** New golden tables in Phase 4 (frontier-paper-cited closed-form results, autodiff gradient values from finite-difference cross-check) carry ≥ 3 independent-reference anchors per spec § 2.4. Especially critical for frontier sims where the vendored paper may have errata.
>
> **PHASE-PLAN REVIEW:** Phase 4 is the highest-stakes plan (27 frontier sims, schema bump, frontier paper consumption). Per spec § 7.4 Convention E-addendum, owner runs phase-plan-review session BEFORE dispatch. Review audit at `docs/_audits/phase-4/pre-dispatch-review-<UTC>.md`.
>
> **OPERATOR-ONLY TAG PUSHING:** Closing-audit agent (Stage 36, after the last frontier sim at Stage 35) does not push `v0.4.0-phase-4`. Operator pushes after independent landing-audit review.
>
> **EVIDENCE-PATH VERIFICATION:** Closing audit runs `verify_evidence.py` on every stage report. Failure → REFUTED.
>
> **APPEND-ONLY CHECK:** Closing audit runs append-only check against `v0.3.0-phase-3` tag (no Phase 0/1/2/3 audit may be edited).
>
> **ADVERSARIAL FIXTURE GROWTH:** Phase 4 likely surfaces new fabrication patterns (large frontier-paper consumption surface; complex autodiff signature surfaces). Any fabrication caught at landing review is added as a new adversarial fixture at `tools/integrity/tests/fixtures/adversarial/`. This is how the integrity toolkit gets stronger phase by phase.
>
> **SCHEMA-CORPUS APPENDS:** Each of Stages 9–35 that produces a capture appends to `tests/fixtures/legacy-captures/phase-4-<stage-name>.h5` + sidecar. Stages 2 + 3 (WU-A + WU-B, schema bump) explicitly round-trip every prior corpus entry as part of their acceptance.

> **v8.0 dispatch-hardening amendments (May 18 2026):** This block is normative.
>
> **TIMELINE LANGUAGE PURGED:** Earlier references to "3–5 days of agent execution" (§ 1), "12–18 months by spec § 11.8" / "30–95 weeks" (§ 12.6), and any other calendar-pacing language are SUPERSEDED by spec § 11.0. Phase 4 dispatches as 35 sequential stages under single-agent execution; wall-clock is bounded by stage count × agent latency + external-dependency resolution (paper fetches, vendor installs) + continuation-session overhead. The "time-box rather than scope-lock" recommendation in § 12.6 is also superseded — scope IS locked at 35 stages; agents complete each stage or surface BLOCKED for owner decision.
>
> **STAGES 31–33 LOCKED:** § 8.5's "owner picks three sim names + solver choices BEFORE Phase 4 dispatches" requirement is RESOLVED:
> - **Stage 31:** `rigid-body/articulated-locomotion` (Featherstone solver)
> - **Stage 32:** `rigid-body/granular-pile` (MuJoCo-Warp solver; 250k spheres benchmark)
> - **Stage 33:** `rigid-body/manipulator-grasp` (Kamino solver; robotic gripper, SDF + contact-rich)
> All three Stack E with `common_warp.newton` (WU-D). § 8.5's table is updated below; the "TBD" rows are filled.
>
> **STAGE 10 LOCKED:** SPH-diff stack pick: **Stack D (DiffTaichi)**. The "founder picks at stage start" language in § 8.1 stage 10 is RESOLVED.
>
> **STAGE 35 LES-CLOSURE PAPER LOCKED:** Owner pre-vendors specific paper at `references/papers/learned-les-closure/` per spec § 12.9. The "web-fetch the most-cited 2024–2025 learned-LES paper at stage start" language in § 8.6 is RESOLVED.
>
> **TRUNK-BASED DEVELOPMENT (LOCKED):** All references in § 7 (foundation stage briefings) to feature branches (`phase4.0/wu-<letter>-<short>`), fast-forward merges, and branch deletion are SUPERSEDED per spec § 7.12. The single Phase 4 agent commits directly to `main` for every stage. § 7's common preamble is updated below to be trunk-based; the per-stage prompts' "Branch:" / "(merged, deleted)" lines are stale and should be ignored. § 8 stage briefings are already trunk-based.
>
> **HARDWARE FLOOR + FALLBACK LOCKED:** CUDA 12 / driver 545+ required for Stages 31–33; if unavailable, CPU-only Newton fallback per spec § 12.8. Acceptance criteria adjust to "CPU determinism + USD export validates"; benchmark numbers tag `CPU-only` rather than compared to GPU baselines. The agent does NOT silently fall back without owner ratification at Phase 4 dispatch (per § 2 pre-dispatch checklist).
>
> **EXTERNAL SHAS PRE-PINNED:** Owner web-fetches and pins the following BEFORE Phase 4 dispatches (§ 2 pre-dispatch checklist enforces):
> - OpenVDB latest release tag (for WU-B; expect v12.x+; MPL-2.0)
> - Newton 1.0 GA specific 1.0.x release (NOT 2.0; for WU-D; Apache-2.0)
> - PhysicsNeMo specific 1.x version (for WU-E; Apache-2.0)
> - PyTorch Lightning 2.x latest (for WU-E; `lightning.pytorch.LightningModule` import path)
> - Inria gaussian-splatting SHA (inherited from Phase 3 task-1's pin)
> - PhysGaussian SHA (inherited from Phase 3 task-8's pin)
>
> **FRONTIER PAPERS PRE-VENDORED:** Per spec § 12.9, all 13 load-bearing frontier papers vendored to `references/papers/<paper-slug>/` BEFORE dispatch. § 2 pre-dispatch checklist enforces. § 8.4's "agent's stage start: web-fetch the paper" reads as "consume from `references/papers/`" post-amendment.
>
> **SINGLE-AGENT DISPATCH:** Reaffirmed. One coordinator chat + one agent role for all 35 stages. Per spec Appendix D § D.9, context-fill at 70–80% triggers a checkpoint; at >80% a hard stop. The agent's continuation session reads `docs/_audits/phase-4/progress.md` for the `CONTINUE_FROM` cue.
>
> **ACTION #1:** Every Claude Code session starts with `python tools/dispatch/preflight-phase.py 4`. Exit 0 → proceed. Exit 1 → BLOCKED. The script verifies prior-phase tag, common-3dgs presence, frontier paper vendoring, CUDA detection (informational; CPU-fallback is documented).
>
> **CONVENTION NAMES** per spec Appendix G. Earlier references to "Convention #8" etc. in this document resolve to "Convention-8" in the catalog.
>
> The v7.0 amendment block below is retained for changelog tracking; v8 overrides any conflict.

> **v7.0 amendments (May 18 2026):** Consolidated from previous v6.0 split (`phase4-plan.md` + six sub-landing files `phase-4.1-diff.md` through `phase-4.6-learned-dynamics.md`). Per owner directive, each phase is one document for one coordinator + one agent. The 27 frontier sims (spec § 11.5 items 4.1–4.27) are now Stages 9–35 of this phase, dispatched by the same agent role that runs foundation Stages 1–8. The split sub-landing files are superseded by §§ 8.1–8.6 of this document.

---

## § 0 — How to read this file

Two distinct things, front-loaded:

1. **The architecture of Phase 4** (§§ 4–5) — the eight foundation work tracks and their public API surfaces (the "sockets"), and the 27 frontier sims that wire into them. Capture-format extensions, folder conventions, sim-by-sim consumption maps. This is the technical content the spec doesn't reach into.
2. **The coordination and logistics of executing Phase 4** (§§ 2, 3, 6–9) — pre-dispatch checklist, single-agent sequential execution model, coordinator prompt, 35 stage briefings (eight foundation + 27 frontier sims), closing-audit protocol, watchlist.

**Role-specific reading order:**

- **Human (you), before dispatch:** §§ 1, 2, 3. Walk § 2's checklist.
- **Coordinator chat:** §§ 1, 6. Skim § 9 to confirm closing protocol shape.
- **The Claude Code agent (single role for whole phase):** The full file. The agent dispatches itself through 35 stages in order; each stage's briefing in § 7 or § 8 names which API contract in § 4.2 it ships or consumes.
- **Closing-audit Claude Code session:** § 9 plus all 35 prior stage completion reports.

**Three operating principles:**

1. **Sockets-and-wires.** Foundation stages (1–8) ship public API surfaces. Frontier-sim stages (9–35) consume those surfaces. Every public API contract in § 4.2 has a named producer stage and named consumer stages.
2. **Sequential single-agent.** Spec § 7.13. One Claude Code agent role for the whole phase, auto-accept on, running through 35 stages in order. If context fills, the agent commits a progress checkpoint and a continuation session resumes from committed state + the progress file. The coordinator does not dispatch per-stage agents — it dispatches one phase agent and may dispatch continuation sessions if context fills mid-phase.
3. **Trunk-based.** Spec § 7.12. Every commit goes directly to `main`. No protected branches, no feature branches, no PR ceremony. Owner review happens at phase landing via the closing-audit report.

---

Two distinct things, front-loaded:

1. **The architecture of Phase 4.0** (§ 4) — the eight infrastructure tracks, their public API surfaces (the "sockets"), how downstream Phase 4 frontier-sim stages (9–35) wire into them, capture-format extensions, folder conventions. This is the technical content the spec doesn't reach into.
2. **The coordination and logistics of executing Phase 4.0** (§§ 2, 3, 5–8) — pre-dispatch checklist, sequential execution model, coordinator prompt, eight per-WU prompts, closing-audit protocol, watchlist.

**Role-specific reading order:**

- **Human (you), before dispatch:** §§ 1, 2, 3. Walk § 2's checklist.
- **Coordinator chat:** §§ 1, 5. Skim § 7 to confirm closing protocol shape.
- **Per-WU Claude Code session:** The full file. The agent's prompt in § 6 tells them which API contract in § 4.2 they ship, but they read § 4 to understand consumers.
- **Closing-audit Claude Code session:** § 7 plus the eight prior WU completion reports.
- **Future planner of Phase 6 tracks:** §§ 1, 4.2, 4.5, 12 (confidence audit), then author Phase 6 sub-charters referencing this file's API contracts as canonical sockets.

**Three operating principles:**

1. **The coordinator does not verify, validate, probe, decide, or sequence work content.** It receives, dispatches the next WU, receives the completion report, dispatches the next.
2. **The architecture decisions in § 4 are pre-resolved.** Per-WU agents implement to the API contracts in § 4.2 verbatim; they do not redesign the public surface.
3. **Where industry/academic standards exist, the plan adopts them. Deviations are explicitly defended in § 10.4.**

---

## § 1 — Framing on scope

> **FACT (spec § 11.5):** Phase 4 enumerates 27 frontier-variant sims across six logical groups. Spec estimates 12–18 months; explicitly "the largest phase."
>
> **FACT (spec § 11.8):** Throughput is ~1 substantial sim per 1–3 weeks; "frontier-variant work running longer."
>
> **INFERENCE:** 27 sims cannot land in one dispatch cycle. Phase 4 is therefore consolidated into one plan with 36 sequential stages dispatched to one agent.

```
Spec § 11.5 Phase 4 (meta-phase)
├── 4.0  Foundation                ← this file plans this landing in full
├── 4.1  Differentiable variants   (6 sims)
├── 4.2  Sparse variants           (4 sims)
├── 4.3  Neural-rendered variants  (4 sims)
├── 4.4  Frontier-algorithm        (8 sims)
├── 4.5  Newton-integration        (3 sims)
└── 4.6  Learned-dynamics          (2 sims)
```

**Why Foundation lands first.** Each variant-group consumes infrastructure absent at Phase 3 close. Stages 1–8 of this phase build that infrastructure across **eight foundation work units (WUs P/A/B/C/D/E/F/G)**. Stages 9–35 then deploy the 27 frontier variant sims that consume those sockets. The architecture in § 4 specifies what each foundation stage ships; § 5 specifies how each frontier sim consumes; § 7 (foundation stage briefings) and § 8 (frontier-sim stage briefings) give the per-stage agent prompts.

**Phase scope in numbers:** 35 stages, ≥80 commits to `main`, ≥30 audit reports under `docs/_audits/phase-4/`, one closing audit. Pacing per spec § 11.0 and § 12.6 below: hours-to-days bounded by stage count × per-stage agent latency + external-dependency resolution + continuation-session overhead, with continuation sessions on context-fill per spec Appendix D § D.9.

**Current state.** At authoring time, `Bit-Physics` is empty. This plan presumes Phases 0–3 will have landed per spec when dispatch happens. The pre-dispatch checklist (§ 2) gates on it.

---

## § 2 — Pre-dispatch checklist

The human walks this before opening the coordinator chat. Any unchecked item means Phase 4.0 doesn't dispatch — the gap is a prior-phase issue.

```
[ ]  1. Phase 0 closed. Spec § 11.1 acceptance items 0.1–0.13:
        - tools/testkit/ with capture-v1.json frozen at v1.0.0,
          MMS harness, golden values, determinism, equivalence,
          references, probes.
        - tools/integrity/integrity/ with cat1_citations/,
          cat2_contracts/, cat3_numerical/, cat4_draft_time/,
          cat5_provenance/ all present.
        - tools/diagnostics/tier1/ + at least one tier2/<substack>/.
        - At least one common-* module shipped.
        - First stub sim through all gates.

[ ]  2. Phase 1 closed (spec § 11.2 items 1.1–1.8): reference sims
        for closed-form, continuous-CA, agent-based, particle-fluid,
        hybrid-PG, volumetric, lattice categories. common-cpp,
        common-ts, common-py matured.

[ ]  3. Phase 2 closed (spec § 11.3 items 2.1–2.5): cross-stack
        replications with equivalence gates green.

[ ]  4. Phase 3 closed (spec § 11.4 items 3.1–3.8):
        - Lenia (Stack D), Neural CA (Stack D + Stack B deploy).
        - Rigid-body pedagogical (Stack E, no Newton).
        - Soft-body cloth (XPBD).
        - First 3DGS sim (PhysGaussian-style MPM-3DGS, Stack E).
        - First learned-dynamics (PINN on 2D Poisson, Stack E + PyTorch).
        - common-warp matured.
        - common/common-3dgs/ introduced (spec § 5.11 line 970 anchor).

[ ]  5. `python -m integrity --all` (from tools/integrity/) runs on
        clean checkout and produces green on all five Cat checks.
        Confirms the toolkit is wired into CI, not just present in
        the directory.

[ ]  6. This plan committed at docs/phase4/plan.md on main.

[ ]  7. Fresh claude.ai chat opened for the coordinator role.

[ ]  8. Stand-by capacity to run 8 sequential Claude Code sessions
        (estimated 1–3 sessions per day; 3–10 days total).
```

---

## § 3 — Operating model

### 3.1 Execution model

**One coordinator chat. One Claude Code agent role. 35 stages dispatched sequentially.** The agent runs auto-accept; reads this whole plan; works through Stage 1 → Stage 35 in order; reports back to the coordinator at each stage's close and at phase landing.

```
Coordinator chat (claude.ai)                      Claude Code agent role
────────────────────────────                      ──────────────────────
1. Dispatch phase opener (§ 6)             ────▶  Read full plan. Start Stage 1
                                                  (WU-P): probe, build, commit
                                                  directly to main, report.
2. Receive Stage 1 close + WU-P SHAs       ◀────  (Same session, if context
3. Acknowledge; agent proceeds to Stage 2          permits; otherwise the agent
   without re-dispatch                              writes a continuation cue
                                                    and the coordinator sends
                                                    a "continue from progress.md"
                                                    prompt to a new session.)
... agent runs through 35 stages ...
36. Receive phase-landing close            ◀────  Closing audit (Stage 36)
    + audit path
37. Surface to owner with verdict
```

**Auto-accept implications.** The agent does not pause for human approval per edit. The agent self-validates per the stage's acceptance criteria — `pytest -W error`, `python -m integrity --all`, the stage's specific gate (e.g., gradient verification for diff sims, USD validation for Newton sims). If any gate fails, the agent stops, writes a BLOCKED report, and the coordinator surfaces to the owner.

**Context-spanning sessions.** Phase 4's 35 stages will not fit in one Claude Code session's context. The agent commits a progress checkpoint at every stage close (a one-line entry in `docs/phase4/progress.md` plus the stage's completion report). When the session's context fills, the agent writes a continuation cue ("next stage: <N>; last commit SHA: <SHA>"); the coordinator sends a continuation prompt referencing `docs/phase4/progress.md`; a new Claude Code session reads the progress file plus this plan and resumes.

**The coordinator's role is light.** It dispatches the phase opener (once). It receives reports at each stage close. It surfaces only BLOCKED or HALTED reports to the owner. It dispatches continuation sessions when context fills. It does not relitigate, re-architect, or re-verify; the agent self-validates per the per-stage acceptance criteria.

### 3.2 Branching and commits

**Trunk-based commits per spec § 7.12.** Each stage commits directly to `main`. No feature branches, no protected branches, no PR ceremony. Phase tag `v0.4.0-phase-4` lands at phase close.

**Per-stage commit pattern:** Convention A (spec § 7.2 — new-files-first decomposition) applies: if a stage touches more than one previously-existing file, the new-files-only commit ships first, then the existing-file edits commit.

For each stage, expected commit count is 1–3:
- **One commit:** stage adds only new files; no existing-file edits.
- **Two commits:** new files (C1), then existing-file edits (C2). This applies when the stage registers itself in an entry point or extends an existing doc.
- **Three commits:** new files (C1), existing-file edits (C2), then SHA back-fill (C3) for the completion report's `head_sha` field.

**Phase close.** After Stage 35 (the last frontier sim), Stage 36 is the closing audit. The coordinator dispatches the closing-audit prompt (§ 9); a final session writes `docs/_audits/phase-4/landing-<UTC>.md` covering all 35 prior stages. Tag `v0.4.0-phase-4` on the final closing-audit commit.

### 3.3 Dependency decisions (pre-resolved, with verified versions)

Per spec § 9.2 dependency policy and current upstream state verified May 2026.

| Dependency | Treatment | Source | License | Pin / Notes | WU |
|---|---|---|---|---|---|
| **OpenVDB (and NanoVDB)** | Vendored | `github.com/AcademySoftwareFoundation/openvdb` | **MPL-2.0** (not Apache-2.0) | Vendor at `references/openvdb/`; use the `nanovdb/` subtree from the same vendored repo. Pin to a specific release tag (probe at vendoring time for current stable). | B |
| **NVIDIA Newton 1.0 GA** | Vendored | `github.com/newton-physics/newton` | Apache-2.0 | Vendor at `references/newton/`. Pin to 1.0.x specifically (v2.0 may follow). | D |
| **OpenUSD** | Pinned pip | `usd-core` on PyPI | Apache-2.0 | Framework; not citation-load-bearing. | D |
| **NVIDIA PhysicsNeMo** | Pinned pip | `nvidia-physicsnemo` on PyPI | Apache-2.0 | **Pin to specific 1.x version**; v2.0 update in progress (Mar 2026 release notes). May need `nvidia-physicsnemo[cu13]` or `[cu12]` extra. | E |
| **NVIDIA Warp** | Already pinned (Phase 3) | — | — | — | A, D, E |
| **Taichi** | Already pinned (Phase 1) | — | — | — | A |
| **PyTorch** | Already pinned (Phase 3 PINN) | — | — | — | A, E |
| **PyTorch Lightning** | Pinned pip | `lightning` on PyPI | Apache-2.0 | New dependency added in v6: WU-E uses Lightning instead of reimplementing TrainingLoop. | E |

Agents B and D create `references/<name>/manifest.toml` per the spec § 2.8 template.

### 3.4 Schema versioning (pre-resolved)

`tools/testkit/schemas/capture-v1.json` is at internal `schema_version: 1.0.0` at Phase 0 close. WU-A adds `gradient_fields`; WU-B adds `active_mask`. Both additions are additive non-breaking.

**Phase 4.0 result: `schema_version: 1.0.0 → 1.1.0`.** WU-A performs the bump when it adds `gradient_fields` (the bump represents Phase 4.0's batched additive changes, not just WU-A's contribution). WU-B adds `active_mask` without bumping again. The filename stays `capture-v1.json` (major version unchanged).

### 3.5 Probe discipline

Each WU's first action is a probe per spec § 2.9. Template at `tools/testkit/probes/template.md`. Probe report committed at `tools/testkit/probes/reports/phase4.0-wu-<letter>.md` as the agent's first commit, before implementation. Cat 4 (draft-time spec verification) audits the probe content.

Probe scope: confirm spec-conformant state of paths the WU will touch and consume. Architectural decisions are pre-resolved in § 4; probes confirm, not decide.

### 3.6 Why single-agent sequential (rationale)

v5 of this plan used parallel multi-agent execution. v6 switches to sequential single-agent. The rationale, since the choice has direct risk implications:

**Failure compounding.** With seven parallel agents each having failure rate p, P(all succeed) = (1-p)⁷. At p=10%, that's 48%; at p=5%, 70%. Sequential execution has the same joint success probability — but the recovery surface is completely different. A failure in parallel-agent 5 (say, blocked on a probe disagreement) means agents 1–4 have done work on branches that may or may not integrate cleanly with the (eventually) recovered agent 5's work. In sequential, a failure in WU-D stops the chain immediately; WU-E onward simply hasn't started; no work is stranded; no integration race accumulates.

**Variance compounding.** Parallel agents may make slightly different anchor assumptions about the same shared file. Even with my v5 plan's convergence-touch report-not-resolve pattern, the assumptions about file structure, entry-point shape, line-numbering style had to be reconciled by the closing agent. Sequential execution sees one truth at a time: WU-A edits the entry point during its session, observable to WU-B's session.

**Integration risk surface eliminated.** v5 had a multi-step closing landing that fetched seven branches, applied convergence-touch edits in deterministic order, did Convention A decomposition, and re-tested at integration. Each step had its own failure modes (merge conflicts on convergence-touch files despite plan's prohibition, ordering bugs, post-integration test failures hard to attribute to any one agent). v6 has none of this; each WU is self-closing on main.

**Cost: total wall-clock time.** Parallel would be ~1 day max(WU_times). Sequential is sum(WU_times), estimated 3–10 days. Steven is one human; running 7 Claude Code sessions in parallel was always going to require attentive management. Sequential is operationally lighter.

**The deviation from "industry standard parallel build" is defensible** because the parallel agents in question are AI agents with non-deterministic execution, not deterministic compilers. The compounding-variance failure mode is specific to AI multi-agent orchestration and doesn't apply to traditional parallel-build systems (CMake, Bazel). For AI agents, sequential execution is more conservative and currently better characterized.

---

## § 4 — Architecture: what gets built

This is the technical core of the plan. § 4.2 specifies the public API surfaces ("sockets") that Phase 4 frontier-sim stages (9–35) will consume verbatim ("wires").

### 4.1 The eight work tracks

| WU | Name | Builds | Consumed by | Estimated session length |
|---|---|---|---|---|
| **P** | Portfolio Conventions | `docs/portfolio-conventions.md` — units, coordinates, time, field-name registry, seed derivation | All other WUs (4.0); all sims (4.1–4.6) | Short (1 session, ~30–60 min) |
| **A** | Autodiff Infrastructure | InverseProblem family + gradient-verification harness, dual-stack (common-py + common-warp) | 4.1 (six diff sims); 4.6 (learned-dyn through-the-sim) | Long (1 session, several hours) |
| **B** | Sparse Volumes | OpenVDB / NanoVDB vendored + C++/Warp integration + sparse-aware tier2 diagnostics | 4.2 (four sparse sims); some 4.4 | Long |
| **C** | Gaussian Splatting | common-3dgs maturation (training/splatting/viewer/coupling) + render-similarity testkit | 4.3 (four neural sims); some 4.4 | Long |
| **D** | Newton Physics | Newton vendored + common-warp/newton backend + USD scene template + Newton determinism declaration | 4.5 (three Newton sims) | Long |
| **E** | Learning Harness | CaptureDataset + Lightning-based training conventions + PhysicsNeMo adapter | 4.6 (two learned-dyn sims) | Medium |
| **F** | Variant Equivalence | Same-stack variant-vs-reference comparison harness | 4.1–4.6 (every variant gates on this) | Medium |
| **G** | Phase Ledger | 27-row dispatch ledger + dependency graph + variant-folder pre-stage + new-category folder skeletons | 4.1–4.6 (each reads its row, finds pre-staged folder slot) | Medium |

### 4.2 Public API surfaces (the "sockets")

The contracts each WU ships. **Agents implement exactly these surfaces; downstream Phase 4 frontier-sim stages reference these names verbatim.** Class names, method signatures, public symbols are load-bearing.

#### 4.2.P — Portfolio Conventions (WU-P)

**Deliverable:** `docs/portfolio-conventions.md` — a single canonical reference for cross-sim conventions. Read once at the start of Phase 4; referenced across all subsequent stages.

Content (each section is one heading in the markdown):

**Units.** SI base units. Length in meters, mass in kilograms, time in seconds, temperature in kelvin, electric current in amperes. Per-sim deviation requires explicit declaration in the sim's `spec-ref.md` "Units" section with rationale (typical deviation: non-dimensionalized sims for CFD scaling studies, cellular-automata sims for non-physical state).

**Coordinates.** Right-handed Cartesian, **Y-up**. Matches OpenUSD default (spec § 6.4 uses USD as first-class export). Per-sim deviation: scientific visualization may prefer Z-up; declared in spec-ref.md "Coordinates" section.

**Time semantics.** `sim_time: float` in seconds, monotonically increasing from `0.0`. Capture frames include `sim_time` as a required field. Time step `dt` in seconds for physical sims; dimensionless `dt = 1.0` for non-physical sims (cellular automata, Lenia variants).

**Capture-field naming registry.** Required canonical names for fields appearing in 3+ sims (the Rule-of-Three per spec § 7.10). Initial registry covers:

| Canonical name | Meaning | Dtype | Shape pattern |
|---|---|---|---|
| `density` | Scalar density (kg/m³ for physical) | float32 | grid or particle |
| `velocity` | Vector velocity (m/s for physical) | float32 | grid or particle, 3-component |
| `pressure` | Scalar pressure (Pa for physical) | float32 | grid |
| `position` | Particle position | float32 | (N, 3) |
| `mass` | Particle mass (kg for physical) | float32 | (N,) |
| `force` | Force vector | float32 | (N, 3) |
| `temperature` | Scalar temperature | float32 | grid or particle |
| `deformation_gradient` | Deformation gradient F | float32 | (N, 3, 3) |

Vector components are accessed by dot-suffix: `velocity.x`, `velocity.y`, `velocity.z`. Sim-specific fields use sim-specific names and document them in `spec-ref.md` "Captured fields" section.

**Seed derivation.** From a single sim-level seed via `numpy.random.SeedSequence`. Each stochastic operation derives its seed from `seed_seq.spawn(1)[0]`. Per-step seeds are deterministically derived from `(sim_seed, step_index, stack_id)` via `SeedSequence((sim_seed, step_index, hash(stack_id)))`. Documented for reproducibility.

**Default tolerances per category** (mirroring spec § 6.2): physical sims default to absolute tolerance 1e-4, relative 1e-3, norm L2. Continuous CA sims default to 1e-6 / 1e-5 / Linf. Per-sim overrides land in `docs/sim-specs/<sim>/equivalence.md`.

**Consumption pattern.** Every Phase 4.1+ sim's `spec-ref.md` (or variant spec) references portfolio conventions by URL: "Conventions: docs/portfolio-conventions.md applied except where noted." Deviations are explicit with rationale.

#### 4.2.A — Autodiff (WU-A)

**Modules:** `common_py.autodiff` (Taichi `ti.ad.Tape` backend) and `common_warp.autodiff` (Warp `wp.Tape` backend). Identical public surface across both backends.

```python
class InverseProblem(abc.ABC):
    """Abstract base for differentiable-sim inverse problems.

    Wraps the backend's autodiff machinery (Taichi ti.ad.Tape or Warp
    wp.Tape) in an OO surface that's consistent across the portfolio.

    Escape hatch: subclasses can access the underlying tape via
    self.tape and use it imperatively if the OO pattern is awkward
    for their specific problem.
    """

    def __init__(
        self,
        *,
        optimizer: str = "adam",       # "adam" | "sgd" | "lbfgs"
        lr: float = 1e-2,
        max_iter: int = 1000,
        tol: float = 1e-6,
    ): ...

    @property
    def tape(self):
        """Direct access to underlying ti.ad.Tape or wp.Tape.
        Escape hatch for sims that prefer imperative autodiff style."""
        ...

    @abc.abstractmethod
    def forward(self, params, state):
        """Run simulation with `params` and `state`; return final state.

        Backend-specific: `params` and `state` are Taichi or Warp arrays.
        Output type matches input.
        """
        ...

    @abc.abstractmethod
    def params_spec(self) -> "ParamSpec":
        """Return the ParamSpec describing this problem's parameter structure.

        Required override. Defines how structured per-sim params (which may
        be scalars, vectors, dicts, dense fields) map to and from the flat
        tensor the optimizer sees. See ParamSpec docstring for the contract.
        """
        ...

    def loss(self, predicted, target):
        """Default L2 loss. Subclasses may override."""
        ...

    def fit(
        self,
        *,
        params_init,
        target,
        callbacks: list = None,
    ) -> "History":
        """Optimization loop. Returns History.

        `params_init` is structured per the subclass's ParamSpec. Internally
        fit() packs it via ParamSpec.pack() into the flat tensor the optimizer
        operates on, and unpacks via ParamSpec.unpack() before each forward()
        call and when recording trajectory entries in History.
        """
        ...

    def check_gradient(
        self,
        *,
        params,
        n_samples: int = 10,
        eps: float = 1e-4,
        rel_tol: float = 1e-5,
    ) -> "GradientCheckReport":
        """Cross-check autodiff gradient against finite differences."""
        ...


@dataclass
class ParamSpec:
    """Bridge between structured per-sim parameters and a flat optimization tensor.

    The optimizer operates on the flat tensor; callbacks and History entries
    use the structured form. This is the JAX-Pytree / PyTorch-Parameter pattern
    adapted for Taichi / Warp backends.

    Fields:
        flat: backend-native flat tensor (wp.array | ti.field).
        pack: callable(structured) -> flat tensor.
        unpack: callable(flat tensor) -> structured.
        structure: human-readable schema dict describing what's in `flat`
                   (field names, shapes, indices). Used by callbacks for
                   per-parameter logging and by History for trajectory rendering.

    Example for RD diff sim with 2 scalar parameters (F, k):
        structure = {"F": {"index": 0, "shape": ()}, "k": {"index": 1, "shape": ()}}
        pack = lambda d: backend.array([d["F"], d["k"]])
        unpack = lambda a: {"F": float(a[0]), "k": float(a[1])}

    Example for SPH diff sim with 5 scalars + 1 dense field (initial-velocity):
        structure = {
            "viscosity":      {"index": 0, "shape": ()},
            "kernel_size":    {"index": 1, "shape": ()},
            "density_base":   {"index": 2, "shape": ()},
            "surface_tens":   {"index": 3, "shape": ()},
            "damping":        {"index": 4, "shape": ()},
            "initial_vel":    {"index": slice(5, 5 + 3 * N_particles),
                               "shape": (N_particles, 3)},
        }
    """
    flat: "wp.array | ti.field"
    pack: callable
    unpack: callable
    structure: dict


class ParameterIDProblem(InverseProblem):
    """Recover unknown sim parameters from observations of final state."""


class InitialStateRecoveryProblem(InverseProblem):
    """Recover unknown initial conditions from final state."""


class ControlProblem(InverseProblem):
    """Find control inputs that drive sim to target trajectory."""


@dataclass
class History:
    """Inverse-problem optimization history.

    For 3DGS scene-fit training history see § 4.2.C `TrainingHistory` —
    distinct scope, different fields. The two are intentionally separate
    classes because their consumers don't overlap (autodiff inverse problems
    vs 3DGS-coupled training loops).
    """
    losses: list[float]
    params_trajectory: list  # entries are ParamSpec.unpack(flat) at each iter
    iter_count: int
    converged: bool
    final_loss: float


@dataclass
class GradientCheckReport:
    per_param_relative_error: dict[str, float]
    per_param_absolute_error: dict[str, float]
    max_relative_error: float
    passed: bool
    tolerance: float
```

**Defense of the ABC pattern** (deviation from DiffTaichi / Warp idiom). DiffTaichi's canonical pattern uses `with ti.ad.Tape(loss=L): forward()` then `backward()` directly. Warp's wp.Tape is similar. Our InverseProblem wraps this in an OO surface for portfolio consistency: six Phase 4.1 sims, each with potentially different inverse-problem types (parameter ID, initial-state recovery, control), benefit from a shared optimization loop with consistent History and GradientCheckReport. The `.tape` property is an explicit escape hatch — sims that prefer the imperative pattern can override `fit()` and use `self.tape` directly. Industry standards in PyTorch (Module subclassing) and JAX (Pytree + jit transformations) similarly wrap autodiff in higher-level abstractions; our pattern is consistent with that direction.

**Testkit-side companion** (`tools/testkit/code_verification/gradient/`):

```python
def verify_sim_gradients(
    sim_module: str,           # importable module path
    inverse_problem_class: str,  # class name within module
    test_points_file: str,     # JSON file with canonical test inputs
    *,
    rel_tol: float = 1e-5,
) -> "GradientVerificationReport":
    """Loads sim, instantiates its inverse-problem subclass, runs
    .check_gradient() at every test point, aggregates pass/fail."""
    ...


@dataclass
class GradientVerificationReport:
    sim: str
    test_points_passed: int
    test_points_total: int
    per_test_point: list[GradientCheckReport]
    all_passed: bool
```

#### 4.2.B — Sparse Volumes (WU-B)

**Two modules:** `common/common-cpp/nanovdb/` (C++ for Stack C) and `common/common-warp/sparse/` (Python for Stack E).

**Vendoring:** `references/openvdb/` (the parent repo per `github.com/AcademySoftwareFoundation/openvdb`); use the `nanovdb/` subtree. License is **MPL-2.0** (weak copyleft; commercial use OK; modifications to vendored files require source disclosure of those files — but we don't modify vendored source, only consume it). Pin to a specific OpenVDB release tag; WU-B's probe resolves the current stable.

**C++ surface (`common-cpp/nanovdb/`):**

```cpp
// Public header: <gpusims/nanovdb/io.hpp>

namespace bit_physics::nanovdb {

    class SparseVolumeWriter {
    public:
        explicit SparseVolumeWriter(const std::filesystem::path& path);
        void write_scalar(const ::nanovdb::FloatGrid& grid);
        void write_vector(const ::nanovdb::Vec3fGrid& grid);
    };

    class SparseVolumeReader {
    public:
        explicit SparseVolumeReader(const std::filesystem::path& path);
        ::nanovdb::GridHandle<::nanovdb::HostBuffer> read();
    };

    struct ActiveMask {
        std::vector<uint8_t> dense_view;   // 1 byte per cell for diagnostics
        std::array<int64_t, 3> shape;
        std::string topology_hash;          // sha256 of sorted active coords
        std::string encoding;               // "nanovdb"
    };

    ActiveMask extract_active_mask(const ::nanovdb::FloatGrid& grid);
    ActiveMask extract_active_mask(const ::nanovdb::Vec3fGrid& grid);

}  // namespace bit_physics::nanovdb
```

**Python surface (`common_warp.sparse`):**

```python
class SparseVolume:
    """Portfolio wrapper around wp.Volume.

    Escape hatch: self.wp_volume returns the underlying wp.Volume
    for sims that need direct Warp Volume API access.
    """

    def __init__(
        self,
        *,
        voxel_size: float,
        background_value: float = 0.0,
        dtype: str = "float32",
    ): ...

    @property
    def wp_volume(self) -> "wp.Volume":
        """Underlying Warp volume. Escape hatch for advanced use."""
        ...

    @classmethod
    def from_dense(
        cls,
        dense_array: "wp.array",
        *,
        voxel_size: float,
        mask: "wp.array | None" = None,
        threshold: float = 0.0,
    ) -> "SparseVolume": ...

    def to_dense(self, *, shape: tuple[int, int, int]) -> "wp.array": ...

    def active_mask(self) -> "ActiveMask": ...

    @classmethod
    def from_nanovdb_file(cls, path: str) -> "SparseVolume": ...

    def to_nanovdb_file(self, path: str) -> None: ...


@dataclass
class ActiveMask:
    dense_view: "wp.array"     # uint8
    shape: tuple[int, int, int]
    topology_hash: str
    encoding: str              # "nanovdb" | "dense"
```

**Tier 2 diagnostic extensions** (live inside spec's existing four tier2 substacks):

```python
# tools/diagnostics/tier2/scalar_field/sparse_topology.py
# tools/diagnostics/tier2/vector_field/sparse_topology.py
# Shared implementation: tools/diagnostics/tier2/_sparse_common.py

def active_cell_count(capture_path: str, frame: int) -> int: ...
def sparsity_ratio(capture_path: str, frame: int) -> float: ...
def topology_change_detected(
    capture_path: str, frame_a: int, frame_b: int,
) -> bool: ...
def mask_diff(
    capture_a: str, capture_b: str, frame: int,
) -> "MaskDiffReport": ...


@dataclass
class MaskDiffReport:
    cells_only_in_a: int
    cells_only_in_b: int
    cells_in_both: int
    jaccard_similarity: float
```

#### 4.2.C — Gaussian Splatting (WU-C)

**Module:** `common/common-3dgs/` (Python). Four submodules: training, splatting, viewer, coupling.

**Reframing per v4 review § 7.7 (extends Phase 3 baseline, does not rebuild).** Phase 3 task-1 ships the foundational `common-3dgs` surface — `GaussianSplatModel`, `render(model, camera)`, `Camera`, `GaussianSplatModel.load_ply` classmethod, `model.save_ply` instance method. WU-C extends this baseline by adding `TrainingLoop`, `TrainingHistory`, `PhysicsCoupling`, and the viewer module (`render_to_image`, `launch_interactive_viewer`). WU-C does NOT redefine the Phase 3 symbols; it imports them unchanged. The API contract below shows the complete post-WU-C surface; symbols already shipped by Phase 3 are noted; new symbols are introduced by WU-C.

**Defense of building portfolio types rather than vendoring an existing 3DGS library.** As of May 2026 there is no PyPI-installable de-facto-standard 3D Gaussian Splatting library. Major implementations are research repos (Inria's gaussian-splatting, gsplat, Brush in Rust/Wgpu) without an obvious "import this and you're done" path. The portfolio needs cross-sim consistency for `GaussianSplatModel` so PhysGaussian / Gaussian Splashing / 3DGS-smoke sims can share the coupling primitives. We adopt the `.ply` format as the industry interchange (standard since the original 3DGS paper), so portfolio models load/save in a format compatible with viewers and tools outside the portfolio.

**`common_3dgs.training`:**

```python
class GaussianSplatModel:
    """3DGS scene state: positions, scales, rotations, opacities, SH coefficients."""

    def __init__(self, *, n_gaussians: int, sh_degree: int = 3): ...

    @classmethod
    def from_pointcloud(cls, points, colors=None) -> "GaussianSplatModel": ...

    def save_ply(self, path: str) -> None:
        """Save in Gaussian Splatting .ply format (industry standard)."""
        ...

    @classmethod
    def load_ply(cls, path: str) -> "GaussianSplatModel": ...

    # Public attribute access (positions, scales, rotations, opacities,
    # sh_coefficients) as properties returning Warp arrays.


class TrainingLoop:
    """Reusable 3DGS optimization loop."""

    def __init__(
        self,
        *,
        model: GaussianSplatModel,
        optimizer: str = "adam",
        lr_position: float = 1.6e-4,
        lr_color: float = 2.5e-3,
        lr_opacity: float = 5e-2,
        lr_scale: float = 5e-3,
        lr_rotation: float = 1e-3,
        max_iter: int = 30_000,
        densify_interval: int = 100,
        prune_interval: int = 100,
    ): ...

    def fit(
        self,
        *,
        train_views: list,     # list of (Camera, target_image) tuples
        callbacks: list = None,
    ) -> "TrainingHistory": ...

    def step(self, batch) -> dict: ...


@dataclass
class TrainingHistory:
    """3DGS scene-fit training history.

    For inverse-problem optimization history see § 4.2.A `History` — distinct
    scope, different fields. The two are intentionally separate classes
    because their consumers don't overlap (autodiff inverse problems vs
    3DGS-coupled training loops). TrainingHistory tracks render-quality
    metrics (psnr) and model size (n_gaussians) that have no analog in
    autodiff parameter recovery.
    """
    losses: list[float]
    psnr: list[float]
    n_gaussians: list[int]
    iter_count: int
```

**`common_3dgs.splatting`:**

```python
@dataclass
class Camera:
    fovx: float
    fovy: float
    width: int
    height: int
    world_view_transform: "array"   # 4x4
    full_proj_transform: "array"    # 4x4
    camera_center: "array"          # 3


def render(
    model: GaussianSplatModel,
    camera: Camera,
    *,
    background: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> "array":
    """Forward-rasterize. Returns (3, H, W) RGB image."""
    ...
```

**`common_3dgs.viewer`:**

```python
def render_to_image(
    model: GaussianSplatModel,
    camera: Camera,
    output_path: str,
) -> None:
    """Headless render to image file. CI-gated."""
    ...

# Interactive viewer is runtime-only per spec § 7.8;
# does not gate CI:
def launch_interactive_viewer(
    model: GaussianSplatModel,
    *,
    initial_camera: Camera = None,
) -> None: ...
```

**`common_3dgs.coupling`:**

```python
class PhysicsCoupling:
    """Bind physics state to a GaussianSplatModel.

    Assumes one Gaussian per physics primitive (per PhysGaussian
    and Gaussian Splashing convention); N == model.n_gaussians.
    """

    def __init__(self, model: GaussianSplatModel): ...

    def update_positions_from_particles(
        self, particle_positions,
    ) -> None: ...

    def update_covariance_from_deformation(
        self, deformation_gradient,  # (N, 3, 3)
    ) -> None:
        """Apply F to Gaussian covariances: Σ_new = F Σ_old F^T.
        Per PhysGaussian formulation."""
        ...

    def update_opacity_from_density(
        self,
        density,
        *,
        density_to_opacity_fn: callable = None,
    ) -> None: ...
```

**Testkit-side render-similarity primitives** (`tools/testkit/render_similarity/`):

```python
def psnr(predicted, target) -> float: ...
def ssim(predicted, target) -> float: ...
def lpips(predicted, target) -> float: ...
def ms_ssim(predicted, target) -> float: ...


@dataclass
class RenderSimilarityReport:
    psnr: float
    ssim: float
    lpips: float
    ms_ssim: float
    passed: bool
    thresholds: dict[str, float]
```

#### 4.2.D — Newton Physics (WU-D)

**Modules:** `common/common-warp/newton/` and `common/common-warp/usd/`.

**Newton 1.0 GA shipped at GTC 2026 (March 17, 2026), Apache-2.0, hosted at `github.com/newton-physics/newton` as a Linux Foundation project.** Built on NVIDIA Warp and OpenUSD; co-developed with Google DeepMind and Disney Research. CUDA 12 (driver 545+) required; macOS runs on CPU.

**`common_warp.newton`:**

```python
class NewtonBackend:
    """Wrapper around NVIDIA Newton 1.0 GA solver.

    Escape hatch: self.newton_instance returns the underlying
    newton.Sim object for direct Newton API access.
    """

    # Solver selection (all six per Newton 1.0 GA + Isaac Sim 6.0 docs):
    SOLVERS = (
        "mujoco_warp",    # MuJoCo Warp; default; rigid-body GPU
        "kamino",         # Custom physics for Disney robots
        "xpbd",           # eXtended Position-Based Dynamics
        "featherstone",   # Featherstone articulated-body algorithm
        "semi_implicit",  # Semi-implicit Euler
        "vbd",            # Vertex Block Descent (deformables)
    )

    def __init__(
        self,
        *,
        usd_path: str,
        solver: str = "mujoco_warp",
        dt: float = 1.0 / 60.0,
        substeps: int = 1,
    ):
        """Load USD scene, configure solver backend."""
        if solver not in self.SOLVERS:
            raise ValueError(f"Unknown solver: {solver!r}. "
                             f"Choose from {self.SOLVERS}.")
        ...

    @property
    def newton_instance(self):
        """Underlying newton.Sim. Escape hatch."""
        ...

    def step(self, n_steps: int = 1) -> None: ...

    def state(self) -> "NewtonState": ...

    def reset_to_initial(self) -> None: ...

    @property
    def determinism_declaration(self) -> "DeterminismDeclaration": ...


@dataclass
class NewtonState:
    """Snapshot of Newton sim state for capture and equivalence."""
    body_positions: "array"      # (N_bodies, 3)
    body_orientations: "array"   # (N_bodies, 4) quaternions
    body_linear_velocities: "array"
    body_angular_velocities: "array"
    joint_positions: "array"     # (N_joints,) if articulated
    joint_velocities: "array"
    sim_time: float


@dataclass
class DeterminismDeclaration:
    """Per-solver, per-hardware variation per spec § 6.5.

    Per Newton 1.0 docs: MuJoCo Warp is bit-exact on identical hardware;
    Kamino and VBD have stochastic contact resolution; Featherstone and
    semi_implicit are deterministic.
    """
    posture: str       # "bit-exact-same-hw" | "epsilon-bounded" | "non-deterministic-by-design"
    solver: str
    hardware_class: str
    epsilon: float = 0.0
    notes: str = ""
```

**Defense of the wrapper class.** Newton 1.0 GA is brand new (March 2026). The release notes mention v2.0 follow-on. A thin wrapper insulates Phase 4.5's three sims (and any future Newton consumers) from Newton API churn during the 1.0→2.0 transition. The `.newton_instance` escape hatch lets advanced sims access Newton directly for features the wrapper doesn't expose. Industry standard for wrapping recently-released libraries is the Adapter pattern, which this is.

**`common_warp.usd`:**

```python
def create_scene_template(
    *,
    output_path: str,
    ground_plane: bool = True,
    gravity: tuple[float, float, float] = (0.0, -9.81, 0.0),
    units: str = "meters",
    up_axis: str = "Y",
) -> None:
    """Generate a USD scene template with sensible rigid-body defaults.

    Defaults match portfolio conventions (§ 4.2.P): meters, Y-up.
    """
    ...


def export_capture_to_usd(
    capture_path: str,
    output_path: str,
    *,
    fps: float = 60.0,
) -> None:
    """Write captured trajectory to USD animation for Omniverse /
    Houdini consumption."""
    ...
```

#### 4.2.E — Learning Harness (WU-E)

**Modules:** `common/common-py/learned/` (PyTorch + Lightning) and `common/common-warp/learned/` (PyTorch + Warp interop). PhysicsNeMo adapter included.

**Adoption of PyTorch Lightning** (replacing v5's bespoke TrainingLoop). PyTorch Lightning is the de facto standard for PyTorch training loops as of 2026, with extensive checkpoint, logging, early-stopping, mixed-precision, and distributed-training support. Reinventing this for the portfolio added maintenance burden without value. v6 uses Lightning directly; the portfolio provides only conventions and the data-loading layer.

**`common_py.learned`:**

```python
class CaptureDataset(torch.utils.data.Dataset):
    """torch.utils.data.Dataset wrapping portfolio capture files.

    Standard PyTorch Dataset; consumable by torch.utils.data.DataLoader
    or lightning.pytorch.LightningDataModule directly.

    Field-name registry (§ 4.2.P) applies: yielded samples use
    canonical field names ("density", "velocity", etc.).
    """

    def __init__(
        self,
        *,
        capture_paths: list[str],
        split: str = "train",         # "train" | "val" | "test"
        split_seed: int = 42,
        split_ratios: tuple[float, float, float] = (0.7, 0.15, 0.15),
        frame_stride: int = 1,
        fields: list[str] = None,     # None → all available
    ): ...

    def __len__(self) -> int: ...

    def __getitem__(self, idx) -> dict: ...


class CaptureLightningDataModule(lightning.pytorch.LightningDataModule):
    """LightningDataModule wrapping CaptureDataset.

    Use this in LightningModule-based training; or use CaptureDataset
    directly with torch.utils.data.DataLoader for non-Lightning training.
    """

    def __init__(
        self,
        *,
        capture_paths: list[str],
        batch_size: int = 32,
        num_workers: int = 4,
        split_seed: int = 42,
        split_ratios: tuple[float, float, float] = (0.7, 0.15, 0.15),
    ): ...

    def setup(self, stage: str): ...
    def train_dataloader(self): ...
    def val_dataloader(self): ...
    def test_dataloader(self): ...


# Convention helper for portfolio-standard Trainer config.
# Not a wrapper around Lightning's Trainer; just preset config.
def default_trainer(
    *,
    max_epochs: int = 100,
    checkpoint_dir: str,
    early_stopping_patience: int = 10,
    accelerator: str = "auto",
    precision: str = "32",
) -> lightning.pytorch.Trainer:
    """Construct a Lightning Trainer with portfolio-standard defaults
    (deterministic seeds per § 4.2.P, ModelCheckpoint with topk=3,
    EarlyStopping callback)."""
    ...
```

**Models are user-supplied `lightning.pytorch.LightningModule` subclasses.** The portfolio does not provide a `TrainingLoop` class; sim implementers define their LightningModule and call `default_trainer(...).fit(module, datamodule)`. Checkpoints, logging, metrics, early stopping, gradient accumulation, mixed precision: all handled by Lightning natively.

**`common_warp.learned`:**

```python
def warp_to_torch(wp_array) -> "torch.Tensor":
    """Zero-copy bridge: Warp array → PyTorch tensor.

    Implementation: uses Warp's existing pytorch interop
    (warp.torch.to_torch or equivalent). Wrap with this canonical
    name for cross-sim consistency.
    """
    ...

def torch_to_warp(torch_tensor) -> "wp.array":
    """Zero-copy bridge: PyTorch tensor → Warp array."""
    ...


class PhysicsNeMoAdapter:
    """Adapter so a portfolio learned-dyn sim plugs into PhysicsNeMo.

    Used by Phase 4.6 sim 4.27 (learned-closure-les) which integrates
    with PhysicsNeMo's foundation-model infrastructure for CFD.
    """

    def __init__(
        self,
        *,
        lightning_module: lightning.pytorch.LightningModule,
        capture_dataset: CaptureDataset,
    ): ...

    def to_physicsnemo_model(self) -> "physicsnemo.models.Module": ...
    def to_physicsnemo_datapipe(self) -> "physicsnemo.datapipes.Datapipe": ...
```

#### 4.2.F — Variant Equivalence (WU-F)

**Module:** `tools/testkit/equivalence/variant/`.

```python
@dataclass
class VariantToleranceSpec:
    """Per-output-of-interest tolerance for variant-vs-reference comparison.

    Field names follow § 4.2.P canonical registry.
    """
    output_name: str            # e.g., "density", "velocity"
    absolute_tol: float
    relative_tol: float
    norm: str                   # "L2" | "Linf" | "wasserstein"


def compare_captures(
    *,
    reference_capture: str,
    variant_capture: str,
    tolerances: list[VariantToleranceSpec],
    at_sim_time: float,
) -> "EquivalenceReport":
    """Compare two captures at matched sim time.

    Accepts mixed-version capture inputs per spec § 2.7 schema-version
    compatibility policy: reference and variant may be at different schema
    versions (e.g., Phase 1 reference at 1.0.0, Phase 4 variant at 1.1.0).
    The harness reads each via the common-* reader appropriate to that
    version and compares on the intersection of declared fields. Fields
    present in only one version (e.g., gradient_fields, active_mask in
    1.1.0) are skipped silently unless a VariantToleranceSpec names them,
    in which case the missing-in-reference case raises ValueError.
    """
    ...


@dataclass
class EquivalenceReport:
    passed: bool
    per_output_errors: dict[str, float]
    per_output_passed: dict[str, bool]
    reference_capture: str
    variant_capture: str
    at_sim_time: float
    reference_schema_version: str       # e.g., "1.0.0"
    variant_schema_version: str         # e.g., "1.1.0"
    skipped_fields: list[str]           # fields present in only one version
```

**Defense of building rather than adopting.** No industry standard exists for "compare two captures of the same simulation under different implementations / variants at matched sim time with per-output tolerance." This is a portfolio-specific testing pattern: the spec § 3.7 establishes the variant axis (diff / sparse / neural / frontier) and gates variants on equivalence with their reference. The implementation is straightforward (load both captures, interpolate to matched sim_time, compute per-output norm, compare to tolerance), and the value of standardizing is high (every variant uses the same harness).

**Per-sim tolerance schema** lives at `docs/sim-specs/<sim>/equivalence.md` (spec § 6.6):

```toml
# Inside docs/sim-specs/<category>/<sim>/equivalence.md (TOML fenced in markdown)

[[variant_tolerance]]
variant = "diff-warp"
output_name = "density"           # § 4.2.P canonical name
absolute_tol = 1e-4
relative_tol = 1e-3
norm = "L2"
```

#### 4.2.G — Phase Ledger (WU-G)

**Three structured artifacts plus stubs.**

**Ledger** (`docs/phase4/ledger.md`): markdown table, **exactly 27 data rows**, one per spec § 11.5 items 4.1–4.27. Per v4 review § 7.11, the ledger has seven structured columns to surface hidden dependencies that the primary-infra column alone misses.

```markdown
| Stage | Spec item | Sim ID                              | Variant   | Stack | Primary infra | Phase-3 carry-in | Hidden deps | Spec path | Audit | Status |
|-------------|-------------------------------------|-----------|-------|---------------|------------------|-------------|-----------|-------|--------|
| 4.1 | continuous-ca/reaction-diffusion-2d | diff      | D | § 4.2.A      | (none)           | —           | docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-diff.md | — | planned |
| 4.11 | hybrid-pg/mpm-multimaterial         | neural    | E | § 4.2.C      | Phase 3 task-8 (PhysGaussian MVP) | § 4.2.A (if differentiable rendering used) | docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-neural.md | — | planned |
| 4.22 | volumetric-grid/eulerian-smoke      | frontier  | E | § 4.2.B + § 4.2.C | (none)        | § 4.2.A (Gaussian Fluids gradient export) | docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier.md | — | planned |
| 4.27 | learned-dynamics/learned-closure-les | new      | E | § 4.2.E      | (none)           | § 4.2.A (training through sim) | docs/sim-specs/learned-dynamics/learned-closure-les/spec-ref.md | — | planned |
...
```

Column semantics:

- **Primary infra** — the WU under § 4.2 whose surface this sim's variant is fundamentally built on. Single WU per row.
- **Phase-3 carry-in** — for sims that build on Phase 3 work (notably 4.3 neural-rendered sims extending task-1/task-8 PhysGaussian MVP), names the Phase 3 task that pre-staged the work. WU-G fills this from Phase 3's landing audit at probe time. Empty for sims with no Phase 3 carry-in.
- **Hidden deps** — additional § 4.2 surfaces the sim consumes beyond its primary. Catches the case where a 4.6 sim needs both WU-E (Lightning) AND WU-A (training-through-sim autodiff), or where a 4.4 frontier sim needs WU-B (sparse) AND WU-C (3DGS) simultaneously (Gaussian Fluids). Empty (`—`) if none.

Status values: "planned" at Phase 4.0 close; stages flip to "dispatched" / "in-progress" / "landed".

**Dependency graph** (`docs/phase4/dependency-graph.md`):

```markdown
Phase 4.0 (Foundation)
├── WU-P (Portfolio Conventions)
│     consumed by all WUs and all Phase 4 sims
├── WU-A (Autodiff)         → 4.1 (six sims); 4.6 (when training-through-sim)
├── WU-B (Sparse Volumes)   → 4.2 (four sims); some 4.4 sims
├── WU-C (Gaussian Splatting) → 4.3 (four sims); some 4.4 sims
├── WU-D (Newton Physics)   → 4.5 (three sims)
├── WU-E (Learning Harness) → 4.6 (two sims)
├── WU-F (Variant Equivalence) → 4.1–4.6 (all variants)
└── WU-G (Phase Ledger)     → 4.1–4.6 (each reads its row)
```

**Audit bootstrap directory:** `docs/phase4/_audits/.gitkeep`.

**Variant stub spec headers** for existing-sim variants in 4.1–4.4 scope. Each stub is exactly:

```markdown
# spec-<variant>.md — STUB (pre-stage, Phase 4.0)

> **Status:** Pre-staged for Phase 4 stage (per §8.X). This stub claims
> the folder slot per spec § 3.7 folder convention. The full spec
> sheet is drafted in the relevant Phase 4 stage briefing (§8.X).
>
> **Parent reference sim:** <relative path to spec-ref.md>
> **Variant type:** <diff | sparse | neural | frontier>
> **Planned primary stack:** <D | E | C>
> **Planned upstream / frontier paper:** <title + arXiv id>
> **Phase 4 stage dispatch date:** TBD
> **Phase 4.0 infrastructure consumed:** <see WU-G prompt for the
> per-variant mapping; e.g., diff → § 4.2.A, sparse → § 4.2.B>
> **Portfolio conventions:** docs/portfolio-conventions.md applied
> except where the parent reference sim declares deviations.
```

**Skip-if-exists rule.** Before creating each stub, WU-G checks whether the target path exists. If yes, skip and log in completion. Expected to skip at least `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-neural.md` (Phase 3 item 3.5 shipped it).

**New-category folder skeletons:**
- `docs/sim-specs/rigid-body/README.md` (for 4.5's three sims)
- `docs/sim-specs/learned-dynamics/README.md` (for 4.6's two sims)

Each README content:

```markdown
# <Category Name>

> **Status:** Category folder pre-staged in Phase 4.0. Individual sims
> for Phase 4 stages 9–35 land in their respective stages.
>
> **Spec anchor:** docs/architecture.md Part V § 5.<N>.
> **Phase 4 plan:** docs/phase4/plan.md § 1.
> **Phase 4 ledger rows:** see docs/phase4/ledger.md.
> **Portfolio conventions:** docs/portfolio-conventions.md.
```

### 4.3 Capture format extensions

WU-A adds `gradient_fields` and bumps `schema_version` 1.0.0 → 1.1.0. WU-B adds `active_mask` without further version bump. Schema fragments:

```json
{
  "gradient_fields": {
    "description": "Per-parameter gradient arrays captured during differentiable simulation.",
    "type": "array",
    "items": {
      "type": "object",
      "required": ["name", "shape", "dtype", "wrt"],
      "properties": {
        "name": { "type": "string" },
        "shape": { "type": "array", "items": { "type": "integer" } },
        "dtype": { "type": "string", "enum": ["float32", "float64"] },
        "wrt": { "type": "string" }
      }
    }
  },
  "active_mask": {
    "description": "Active-cell mask for sparse-encoded volumetric state.",
    "type": "object",
    "required": ["encoding", "dtype", "shape", "topology_hash"],
    "properties": {
      "encoding": { "type": "string", "enum": ["dense", "nanovdb"] },
      "dtype": { "type": "string", "enum": ["uint8"] },
      "shape": { "type": "array", "items": { "type": "integer" } },
      "topology_hash": { "type": "string" }
    }
  }
}
```

Both optional; consumers that don't need them ignore. Additive → minor bump.

### 4.4 Folder and naming conventions

Reconciling spec § 8.1 (docs) with § 3.7 (code).

**Docs:** `docs/sim-specs/<category>/<sim>/spec-<variant>.md` (no implementation suffix). Per-variant spec sheet covers all implementations of that variant axis.

**Code:** `<category>/<sim>/<variant>-<impl>/` (with implementation suffix when multiple implementations exist; e.g., `diff-warp` vs `diff-taichi`). If only one implementation, the folder can be `<variant>/` without suffix; the suffixed form is preferred for clarity.

### 4.5 Frontier-sim consumption map (the "wires")

**4.1 Differentiable variants** consume from WU-A (InverseProblem family, gradient-verification harness), WU-F (compare_captures), WU-G (six spec-diff.md stubs), WU-P (canonical field names), and capture-format gradient_fields (§ 4.3).

**4.2 Sparse variants** consume from WU-B (SparseVolume Python, bit_physics::nanovdb C++, tier2 sparse diagnostics), WU-F, WU-G (four spec-sparse.md stubs), WU-P, and capture-format active_mask.

**4.3 Neural-rendered variants** consume from WU-C (GaussianSplatModel, TrainingLoop, render, PhysicsCoupling, render-similarity primitives), WU-F (for underlying physics), WU-G (four spec-neural.md stubs), WU-P.

**4.4 Frontier-algorithm variants** consume heterogeneously: DiffLogic CA uses WU-A; AMR LBM uses WU-B; Gaussian Fluids uses WU-B + WU-C; Particle Lenia / Flow Lenia / Clebsch-PFM / EDGE / VPFM / Moment-encoded LBM use only WU-F + WU-G + WU-P. WU-G's spec-frontier.md stub's "Phase 4.0 infrastructure consumed" field documents this per sim.

**4.5 Newton-integration sims** consume from WU-D (NewtonBackend, NewtonState, USD scene template, capture-to-USD export), WU-F (trajectory equivalence), WU-G (rigid-body category skeleton), WU-P.

**4.6 Learned-dynamics variants** consume from WU-E (CaptureDataset, default_trainer, warp_to_torch/torch_to_warp, PhysicsNeMoAdapter), WU-A (for sims that train through the sim via autodiff), WU-F (against classical reference), WU-G (learned-dynamics category skeleton), WU-P.

Every Phase 4.0 deliverable has a named consumer; every Phase 4.1–4.6 sim has a named socket to plug into.

---

## § 5 — Coordinator briefing

> **Copy the block below as the opening message of the Phase 4 coordinator chat.** Fresh chat; no prior context other than this prompt and access to `docs/phases/phase-4-plan.md`.

```
You are the coordinator for Phase 4 (Frontier Variants) of the
Bit-Physics portfolio (repo: git@github.com:StevenFAU/Bit-Physics.git,
owner Steven Cohen).

Your job is purely mechanical. You do not validate, probe, decide,
sequence work content, or write code. The plan in
docs/phases/phase-4-plan.md has already made every decision.

Phase 4 has 35 SEQUENTIAL stages dispatched to ONE Claude Code agent
role with auto-accept on:

  Stages  1–8:   Foundation (WU-P, WU-A, WU-B, WU-C, WU-D, WU-E,
                  WU-F, WU-G).  Per § 7.
  Stages  9–14:  Diff variants (6 sims; spec § 11.5 items 4.1–4.6).
                  Per § 8.1.
  Stages 15–18:  Sparse variants (4 sims; items 4.7–4.10).
                  Per § 8.2.
  Stages 19–22:  Neural-rendered variants (4 sims; items 4.11–4.14).
                  Per § 8.3.
  Stages 23–30:  Frontier-algorithm variants (8 sims; items 4.15–4.22).
                  Per § 8.4.
  Stages 31–33:  Newton-backed sims (3 sims; items 4.23–4.25).
                  Per § 8.5.
  Stages 34–35:  Learned-dynamics sims (2 sims; items 4.26–4.27).
                  Per § 8.6.
  Stage 36:      Phase closing audit. Per § 9.

Your four actions, in order:

1. Confirm the human reports all items in plan § 2 (pre-dispatch
   checklist) green. If any is unchecked, Phase 4 doesn't dispatch.

2. Dispatch ONE Claude Code session (auto-accept on) with the
   phase-opener prompt below. The session reads the whole plan,
   does Stage 1 (WU-P) first, commits, reports back at the end of
   the stage with a one-line summary plus the completion-report
   path. The same session continues to Stage 2 without waiting
   for a re-dispatch — unless its context fills, in which case
   the agent writes a continuation cue and you (the coordinator)
   send a fresh continuation session with the prompt at § 6.2.

3. Maintain a status ledger inline (extract from
   docs/phase4/progress.md after each session reports):

       Stage  Unit                              Landed   Audit path
       1      WU-P Portfolio Conventions        [ ]      ...
       2      WU-A Autodiff Infrastructure      [ ]      ...
       3      WU-B Sparse Volumes               [ ]      ...
       ...
       35     Sim 4.27 learned-closure-les      [ ]      ...
       36     Phase closing audit               [ ]      ...

4. When Stage 36 (closing audit) is landed, surface the phase
   verdict to the human with the audit path + the phase-tag SHA
   (v0.4.0-phase-4).

PHASE-OPENER PROMPT (paste into the first Claude Code session):

  You are the single Phase 4 agent for Bit-Physics. Auto-accept
  on. Read docs/phases/phase-4-plan.md in full. You will work
  through 35 stages sequentially. For each stage, follow that
  stage's briefing in § 7 (foundation) or § 8 (frontier sims).

  At each stage's close:
    - commit per Convention A
    - write the completion report at the path named in the
      stage briefing (canonical front-matter per spec § 7.5)
    - append one line to docs/phase4/progress.md:
        "stage <N> <name> <verdict> <head-sha> <audit-path>"
    - report back to the coordinator with the same one line
    - immediately proceed to the next stage UNLESS context is
      near full

  Context-near-full protocol: write a continuation cue to
  docs/phase4/progress.md as the LAST line:
    "CONTINUE_FROM: stage <N+1>; last_sha <SHA>"
  Then end your session cleanly. The coordinator will dispatch
  a continuation prompt to a new session.

  Begin with Stage 1 (WU-P, per § 7.P of the plan).

CONTINUATION PROMPT (use when a session writes a continuation
cue; paste into the new Claude Code session):

  You are the Phase 4 agent for Bit-Physics, continuing from a
  prior session's context-fill checkpoint. Auto-accept on.
  Read docs/phases/phase-4-plan.md in full. Read
  docs/phase4/progress.md to see where the prior session
  stopped. Resume at the stage named in CONTINUE_FROM and
  proceed sequentially per the same protocol as the opener.

Things you (coordinator) do NOT do:

- You do not dispatch per-stage agents. You dispatch ONE phase
  agent (and continuation sessions if context fills).
- You do not skip stages.
- You do not read or validate the content of completion reports
  beyond confirming they arrived.
- You do not re-order stages.
- You do not edit any repo files.
- You do not amend the plan. If something looks wrong, surface
  to the human and stop.

If the agent reports a hard blocker (verdict BLOCKED or HALTED),
surface to the human. Do not dispatch the next continuation
session until resolved. The plan front-loads decisions, so
genuine blockers indicate either a Phase 0–3 gap that slipped
the pre-dispatch checklist, or a real architectural ambiguity
needing human decision.

Begin with action 1.
```

---

## § 6 — Per-stage briefings (Stages 1–35)

Each stage's briefing is below. Stages 1–8 cover foundation (§ 7); Stages 9–35 cover the 27 frontier sims (§ 8); Stage 36 is the closing audit (§ 9).

The agent reads the stage's briefing at the moment it dispatches to that stage. Stage briefings are designed to be self-contained — the agent does not need to cross-reference other stage briefings to complete its current one.

---

## § 7 — Foundation stage briefings (Stages 1–8)

Eight stages, executed sequentially by the single Phase 4 agent role. Common preamble (applies to all; **updated per v8 trunk-based amendment**):

- **Repo:** `git@github.com:StevenFAU/Bit-Physics.git`. Already at `main`; commit directly to `main` per spec § 7.12. Do NOT create a feature branch. The "Branch: phase4.0/wu-<letter>-<short>" lines in the stage prompts below are SUPERSEDED by this preamble — ignore them.
- **Probe first.** Your first commit is your probe report at `tools/testkit/probes/reports/phase4.0-wu-<letter>.md` following `tools/testkit/probes/template.md`.
- **API contract authoritative.** Public API in § 4.2.<letter> is load-bearing; implement those names verbatim. Phase 4 frontier-sim stages (§ 8) reference them.
- **Strict mode** per spec § 7.7: `pytest -W error`; `ruff --strict`; `mypy --strict`; markdown lint with no soft-warns. Use repo's `justfile` wrappers if present.
- **Integrity gate.** `python -m integrity --all` from `tools/integrity/`. All five Cat checks green before reporting.
- **Convention discipline** per spec Appendix G: Convention-M (re-anchor), Convention-8 (no memory specifics), Convention-A (new-files-first decomposition where applicable), Convention-12 (SHA back-fill, never `git --amend`).
- **Commit to main.** When acceptance criteria pass, commit (possibly multiple commits per Convention-A) directly to `main`. No branch creation, no PR. Report completion to coordinator with one-line summary.
- **Blockers** in "open questions" section of report. Trivial probe surprises go in "probe findings."

### 7.1 — Stage 1: WU-P Portfolio Conventions

```
You are the WU-P (Portfolio Conventions) agent on Phase 4.0
(Foundation) for Bit-Physics. Read docs/phase4/plan.md fully,
especially §4.2.P (your deliverable).

Branch: phase4.0/wu-p-conventions

Role: Produce docs/portfolio-conventions.md — the canonical reference
that all subsequent WUs and all Phase 4 sims reference. Closes a
gap not covered by the spec: which conventions bind across the
portfolio's 27 sims so cross-sim comparison and equivalence work
without per-sim conversion.

This is the first WU because every subsequent WU references your
output. Land quickly and cleanly.

Probe (Step 1 — first commit):

1. View docs/ for existing convention-style docs (likely none for
   the portfolio scope, but verify; if one exists at e.g.
   `docs/architecture.md` Appendix G, your work extends rather than supersedes it).
2. View docs/sim-specs/ pick one sim (e.g., volumetric-grid/
   eulerian-smoke/) and read spec-ref.md to see what units /
   coordinates / time semantics the Phase 1 sims declared.
3. View tools/testkit/equivalence/ to see existing cross-stack
   tolerance values — your "Default tolerances per category" section
   references these.
4. View tools/testkit/probes/template.md.
5. Resolve strict-mode lint invocations.

Commit probe report at tools/testkit/probes/reports/phase4.0-wu-p.md.

Deliverable: docs/portfolio-conventions.md with the six sections
specified in plan §4.2.P:
  - Units
  - Coordinates
  - Time semantics
  - Capture-field naming registry (table)
  - Seed derivation
  - Default tolerances per category

Use exactly the canonical names from the field registry in §4.2.P:
density, velocity, pressure, position, mass, force, temperature,
deformation_gradient. The registry can grow over time; this WU
seeds it.

Acceptance criteria:
- docs/portfolio-conventions.md created.
- Markdown lint green.
- python -m integrity --all green (Cat 4 will check that any
  <file>:<line> assertions in the doc resolve; you have none, so
  passes trivially).

**v9 addendum (per spec § 7.5 + v9 amendment block at top of file):**

- **Cross-phase audit replay (WU-P is Stage 1; spec § 7.5).** Before any other action, run:

      python -m integrity.scripts.replay_prior_phase \
        --prior-phase phase-3 \
        --audit docs/_audits/phase-3/close-R3-R5-task9-20260530T145125Z.md \
        --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget

  Discrepancy → BLOCKED. Surface to operator. Do NOT begin WU-P work.
  (Phase-3 close shipped no single `landing-<UTC>.md`; the phase-level close is
  the three `close-R*.md` audits + the tag annotation. The replay tool derives
  the prior-phase tag from `--prior-phase phase-3` → `v0.3.0-phase-3`; the
  `--audit` file is read only for YAML front-matter. `close-R3-R5-task9-…` has
  valid front-matter whose verdict is not in the {CONFIRMED,PASS,OK} assertion
  set, so the replay re-runs the eight gates at the tag without a
  claimed-vs-actual cross-check. See `docs/_audits/phase-4/pre-dispatch-review-*`
  for the measured replay result.)

- **Tolerance-budget Phase 4 carryover.** Update `tools/testkit/equivalence/tolerance-budget.toml`: `[phase] phase = "phase-4"`, `opened_at = "<UTC>"`. Do NOT widen budgets.

- **Append-only check against v0.3.0-phase-3.** WU-P's commit must not edit any docs/_audits/ file already present at v0.3.0-phase-3.

- **Operator-only tag pushing.** WU-P does not reach phase tag (that's the closing audit after Stage 35). The agent does not run `git tag` or `git push origin v*`.

- **TDD does not apply to docs-only WU.** The acceptance is `markdown lint green + Cat 4 green`. No failing-tests output-hash needed.

This WU has NO convergence-touch edits (no shared file modifications)
since it only adds one new doc. One commit (or two: probe + doc)
on `main` per v8 trunk-based amendment.

Completion report template:

---
WU-P — Portfolio Conventions: completion report
Branch: phase4.0/wu-p-conventions (merged to main, deleted)
Tip SHA: <SHA of merge commit on main>

Probe report: tools/testkit/probes/reports/phase4.0-wu-p.md

Probe findings:
  Existing convention docs at Phase 3 close: <list or "none">
  Phase 1 sim units/coords/time observed in spec-ref.md: <summary>
  Existing testkit tolerance values for default registry: <summary>
  Strict-mode invocations: <commands>
  Deviations from plan §4.2.P: <list or "none">

Files added:
  docs/portfolio-conventions.md
  tools/testkit/probes/reports/phase4.0-wu-p.md

Test results:
  Markdown lint: green
  python -m integrity --all: green

Open questions: <list or "none">
---
```

### 7.2 — Stage 2: WU-A Autodiff Infrastructure

```
You are the WU-A (Autodiff Infrastructure) agent on Phase 4.0 for
Bit-Physics. Read docs/phase4/plan.md fully, especially §4.2.A
(API contract) and §4.3 (capture format extensions).

Branch: phase4.0/wu-a-autodiff

Role: Build differentiable-sim infrastructure for Phase 4.1's six
diff sims. Dual-stack (common-py for Taichi ti.ad.Tape, common-warp
for Warp wp.Tape) with identical public surface. Plus testkit
gradient-verification harness.

First-of-pattern for both ti.ad.Tape and wp.Tape in this repo
(Phase 3 PINN used PyTorch autograd, not these).

Public API in §4.2.A — implement these names verbatim:
  common_py.autodiff and common_warp.autodiff:
    InverseProblem (ABC), ParameterIDProblem,
    InitialStateRecoveryProblem, ControlProblem, History,
    GradientCheckReport, ParamSpec.
  tools/testkit/code_verification/gradient/:
    verify_sim_gradients, GradientVerificationReport.

Note the .tape property escape hatch in InverseProblem — exposed
for sims that prefer the imperative ti.ad.Tape / wp.Tape style.

NEW (v4 review § 7.9): Subclasses of InverseProblem must implement
params_spec() returning a ParamSpec. ParamSpec bridges between
structured per-sim parameters and a flat optimization tensor (JAX-Pytree
/ PyTorch-Parameter pattern adapted for Taichi/Warp). Without ParamSpec,
the ABC adds no leverage across six Phase 4.1 diff sims; with it, callbacks
and History entries get structure. See §4.2.A for the ParamSpec contract.

NEW (v4 review § 7.3): WU-A's scope expands to bump common-* capture
writers to accept schema version 1.1.0, not just 1.0.0. Without this
extension, Phase 4 sims that write gradient_fields can't, because
common-* won't know how to serialize them. Specifically: extend
`common_warp.capture.write_capture`, `common_py.capture.write_capture`,
and `bit_physics::common::capture::Writer` (C++) to accept either
schema_version. Default to highest supported. Comment in code:
"Future schema versions: bump max_supported in module-level constant."

Probe (Step 1):

1. View common/common-py/ for entry-point path.
2. View common/common-warp/ for entry-point path.
3. View tools/testkit/code_verification/ for existing structure
   (mms/, golden/ likely present; you add gradient/).
4. View docs/portfolio-conventions.md (from WU-P) — your gradient_
   fields capture format references the field naming.
5. View tools/testkit/probes/template.md.
6. View tools/testkit/schemas/capture-v1.json — confirm
   schema_version 1.0.0.
7. View common-* capture writers: common/common-py/capture/,
   common/common-warp/capture/, common/common-cpp/include/
   bit_physics/common/capture/. Note their current signatures
   for the schema-version extension.
8. Grep `ti.ad.Tape\|wp.Tape` across repo — expected: no matches
   outside vendored references.
9. Resolve strict-mode lint invocations.

Commit probe report at docs/_audits/phase-4/wu-a-probe-<UTC>.md.

Build (typically 3 commits per Convention A):

Commit C1 (new files only):
- common/common-py/autodiff/__init__.py, tape.py,
  inverse_problem.py, param_spec.py, finite_diff.py, tests/
- common/common-warp/autodiff/ (same shape, Warp backend)
- tools/testkit/code_verification/gradient/__init__.py,
  harness.py, report.py, tests/
- docs/testkit/gradient-verification.md
- docs/common/autodiff.md with ```python public-api``` blocks
  enumerating every § 4.2.A symbol (consumed by Cat 2
  api_imports per spec § 3.2)

Commit C2 (existing-file edits — schema bump + capture-writer extension):
- tools/testkit/schemas/capture-v1.json: add top-level
  "gradient_fields" key per plan §4.3 schema fragment; bump
  schema_version 1.0.0 → 1.1.0. (Note: WU-B will add
  active_mask WITHOUT further bumping; the 1.1.0 bump represents
  both Phase 4.0 additive changes.)
- common/common-py/capture/writer.py: extend write_capture
  signature to accept schema_version (default highest supported);
  add module-level MAX_SUPPORTED_VERSION = "1.1.0"; update
  docstring per spec § 2.7 compatibility policy.
- common/common-warp/capture/writer.py: same.
- common/common-cpp/include/bit_physics/common/capture.hpp: same.
- tools/testkit/schemas/__init__.py: export MAX_SUPPORTED_VERSION.

Commit C3 (existing-file edits — entry points):
- common-py entry point: register autodiff submodule.
- common-warp entry point: register autodiff submodule.

**Commit C4 (v9 amendment — schema-version backward-compat regression corpus, per spec § 2.7 + § 2.12):**

Add new test file `tools/testkit/schemas/tests/test_legacy_captures_roundtrip.py` that:
1. Discovers every `*.h5` + `.json` sidecar pair under `tests/fixtures/legacy-captures/`.
2. For each pair, reads through the post-bump 1.1.0 readers in common-py, common-warp, and common-cpp (via Python bindings or skip if cpp test infrastructure not Python-callable; document the skip).
3. Asserts round-trip success: every state array preserved bit-for-bit; every manifest field preserved; new `gradient_fields` key absent in legacy captures handled as `Optional[None]` rather than KeyError.
4. Marks the test as a HARD blocker for WU-A (and again for WU-B after `active_mask` is added).

This is **the load-bearing test that makes the "additive schema bumps are non-breaking" claim testable, not aspirational** (per spec § 2.7).

The corpus by Phase 4 open should contain ~25 legacy captures (Phase 0 RD-2D, Phase 1's 9 sim placeholder/real captures, Phase 2's 8 port captures, Phase 3's 7 sim captures). Any failure → WU-A REFUTED; schema bump withdrawn until reader fixed. Do NOT silently exclude problematic fixtures.

Acceptance criteria:
- pytest -W error against your new modules: green.
- ruff --strict, mypy --strict, markdown lint: green.
- python -m integrity --all: green (all five Cats + Cat-X).
- pytest -W error common/common-py/ AND
  common/common-warp/ (full modules, now with autodiff registered):
  green. This is the real integration test that the entry-point
  edits are correct.
- **`pytest -W error tools/testkit/schemas/tests/test_legacy_captures_roundtrip.py` GREEN** — every entry in `tests/fixtures/legacy-captures/` round-trips through the 1.1.0 readers without loss. This gate is HARD and non-negotiable per spec § 2.12 (v9 amendment).
- **Mutation-testing baseline** for the new autodiff modules: `bash tools/testkit/mutation/run-mutation.sh --target common/common-py/autodiff/ --target tools/testkit/code_verification/gradient/`. Score per target ≥ 80% per spec § 2.13.
- **PBT for finite-diff cross-check:** ≥ 2 declared invariants under `tools/testkit/property/`: gradient computed via Taichi/Warp autodiff matches finite-difference within 1e-3 relative tolerance under random initial conditions; gradient is zero for parameters not influencing the loss.

Commit directly to `main` (per v8 trunk-based amendment; the earlier "Fast-forward merge to main when green. Delete branch." line is stale). Report to coordinator.

Completion report template:

---
WU-A — Autodiff Infrastructure: completion report
Branch: phase4.0/wu-a-autodiff (merged, deleted)
Tip SHA: <SHA>

Probe report: tools/testkit/probes/reports/phase4.0-wu-a.md

Probe findings:
  common-py entry point: <path>
  common-warp entry point: <path>
  capture-v1.json baseline: schema_version 1.0.0 (confirmed)
  First-of-pattern for ti.ad.Tape / wp.Tape: confirmed
  Strict-mode invocations: <commands>
  Deviations from plan §4.2.A: <list or "none">

Files added (C1):
  <list>

Files modified (C2):
  tools/testkit/schemas/capture-v1.json (schema_version 1.0.0 →
    1.1.0; gradient_fields added)
  common-py entry point (autodiff registration)
  common-warp entry point (autodiff registration)

Test results:
  pytest -W error (per-module): green
  pytest -W error common/common-py/ (post-registration): green
  pytest -W error common/common-warp/ (post-registration): green
  ruff/mypy/md lint: green
  python -m integrity --all: green

Open questions: <list or "none">
---
```

### 7.3 — Stage 3: WU-B Sparse Volumes

```
You are the WU-B (Sparse Volumes) agent on Phase 4.0 for
Bit-Physics. Read docs/phase4/plan.md fully, especially §3.3
(vendoring decisions), §4.2.B (API contract), §4.3 (capture
format).

Branch: phase4.0/wu-b-sparse

Role: Vendor OpenVDB (containing NanoVDB) at references/openvdb/,
build NanoVDB integration into common-cpp, expose wp.Volume through
common-warp, add sparse-aware tier2 diagnostics inside scalar_field/
and vector_field/ substacks (NOT a new tier2-sparse substack — spec
§ 3.3 fixes tier2 at exactly 4 substacks).

License note: OpenVDB is MPL-2.0 (Mozilla Public License v2.0).
Weakly copyleft: commercial use OK, modifications to MPL-2.0 files
require source disclosure of those files. We don't modify vendored
source; we consume it. Manifest.toml records the license.

Public API in §4.2.B:
  C++ namespace bit_physics::nanovdb:
    SparseVolumeWriter, SparseVolumeReader, ActiveMask,
    extract_active_mask
  Python common_warp.sparse:
    SparseVolume (with .wp_volume escape hatch), ActiveMask
  Tier 2 diagnostics:
    active_cell_count, sparsity_ratio, topology_change_detected,
    mask_diff, MaskDiffReport

Probe (Step 1):

1. View common/common-cpp/ for layout + canonical cmake/ctest
   invocation. Note the include convention (likely <gpusims/...>).
2. View common/common-warp/ for entry-point. Confirm wp.Volume is
   NOT yet exposed.
3. View tools/diagnostics/tier2/ — confirm exactly four substacks
   (particle, scalar_field, vector_field, closed_form).
4. View docs/portfolio-conventions.md (WU-P) — active_mask references
   the shape convention there.
5. View tools/testkit/probes/template.md.
6. View tools/testkit/schemas/capture-v1.json — confirm
   schema_version is now 1.1.0 (after WU-A's bump).
7. Web-fetch https://github.com/AcademySoftwareFoundation/openvdb
   for current stable release tag. Resolve the SHA to vendor.
8. Probe whether `references/` is gitignored in this repo. If yes,
   commit a fetch script + manifest.toml; if no, commit source.
9. Grep `NanoVDB\|nanovdb` across repo — expected: no matches.
10. Resolve strict-mode lint invocations.

Commit probe report at tools/testkit/probes/reports/phase4.0-wu-b.md.

Build (typically 2 commits per Convention A):

Commit C1 (new files):
- references/openvdb/ (vendored source or fetch script)
- references/openvdb/manifest.toml (license=MPL-2.0, name,
  version, sha, url, scope, vendoring metadata per spec §2.8)
- common/common-cpp/nanovdb/ (CMakeLists, header
  include/bit_physics/nanovdb/io.hpp, src/io.cpp, tests)
- common/common-warp/sparse/ (__init__, volume.py, io.py, tests)
- tools/diagnostics/tier2/_sparse_common.py
- tools/diagnostics/tier2/scalar_field/sparse_topology.py + test
- tools/diagnostics/tier2/vector_field/sparse_topology.py + test
- docs/diagnostics/sparse-topology.md

Commit C2 (existing-file edits):
- tools/testkit/schemas/capture-v1.json: add top-level "active_mask"
  per plan §4.3. (DO NOT bump schema_version again; WU-A already
  bumped to 1.1.0 covering both Phase 4.0 additions.)
- common/common-cpp/CMakeLists.txt: add_subdirectory(nanovdb).
- common-warp entry point: register sparse submodule.

Acceptance criteria:
- C++ build green via your probed invocation.
- pytest -W error common-warp/sparse/, tier2 substacks: green.
- Strict lint green.
- python -m integrity --all green (Cat 1 will verify
  references/openvdb/manifest.toml citation).
- pytest -W error common/common-warp/ (post-registration): green.
- **`pytest -W error tools/testkit/schemas/tests/test_legacy_captures_roundtrip.py` GREEN (v9 amendment per spec § 2.12)** — every entry in `tests/fixtures/legacy-captures/` STILL round-trips after the `active_mask` addition. The same backward-compat regression test from WU-A runs here, post-`active_mask`. Failure → REFUTED; the additive-bumps-non-breaking claim is broken.
- **Mutation-testing baseline** for the new sparse modules: `bash tools/testkit/mutation/run-mutation.sh --target common/common-warp/sparse/`. Score ≥ 80% per spec § 2.13.
- **PBT for sparse-volume invariants:** ≥ 2 declared invariants: active-mask membership is preserved through write→read round-trip; reads of inactive cells return the documented sparse-default value under randomized sparsity patterns.

Commit directly to `main` (per v8 trunk-based amendment). Report.

Completion report template:

---
WU-B — Sparse Volumes: completion report
Branch: phase4.0/wu-b-sparse (merged, deleted)
Tip SHA: <SHA>

Probe report: tools/testkit/probes/reports/phase4.0-wu-b.md

Probe findings:
  common-cpp top CMakeLists: <path>
  C++ build invocation: <exact command>
  common-warp entry point: <path>
  Tier 2 substacks confirmed: particle, scalar_field, vector_field,
    closed_form (4)
  OpenVDB vendoring tag: <e.g., v12.0.0>
  OpenVDB SHA: <SHA>
  License confirmed: MPL-2.0
  references/ gitignore: <gitignored / committed>
  capture-v1.json schema_version after WU-A: 1.1.0 (confirmed)
  Strict-mode invocations: <commands>

Files added (C1): <list>
Files modified (C2):
  tools/testkit/schemas/capture-v1.json (active_mask added; NO
    further version bump)
  common/common-cpp/CMakeLists.txt (nanovdb subdirectory)
  common-warp entry point (sparse registration)

Test results:
  C++ build: green
  pytest (per-module + module-wide): green
  Strict lint: green
  python -m integrity --all: green

Open questions: <list or "none">
---
```

### 7.4 — Stage 4: WU-C Gaussian Splatting

```
You are the WU-C (Gaussian Splatting) agent on Phase 4.0 for
Bit-Physics. Read docs/phase4/plan.md fully, especially §4.2.C
(API contract).

Branch: phase4.0/wu-c-3dgs

Role: Mature common-3dgs at common/common-3dgs/ from Phase 3's
introductory state into production infrastructure consumed by
Phase 4.3 (four neural-rendered sims). Four submodules: training,
splatting, viewer, coupling. Plus testkit render-similarity
primitives (PSNR, SSIM, LPIPS, MS-SSIM).

Per spec §5.11 line 970: common-3dgs is at common/common-3dgs/.

Public API in §4.2.C:
  common_3dgs.training: GaussianSplatModel, TrainingLoop,
    TrainingHistory
  common_3dgs.splatting: Camera, render
  common_3dgs.viewer: render_to_image, launch_interactive_viewer
  common_3dgs.coupling: PhysicsCoupling
  tools/testkit/render_similarity/: psnr, ssim, lpips, ms_ssim,
    RenderSimilarityReport

Probe (Step 1 — this WU's probe is most load-bearing of the eight):

1. Confirm common/common-3dgs/ exists. If absent, Phase 3 is
   incomplete — surface as blocker (pre-dispatch §2 item 4 missed
   it).
2. Read Phase 3's closing commit for common-3dgs; inventory existing
   files.
3. Read the Phase 3 first 3DGS sim spec (per §11.4 item 3.5;
   probe to find it, likely at docs/sim-specs/hybrid-pg/
   mpm-multimaterial/spec-neural.md). Identify inlined infrastructure
   to promote per spec § 7.10 Rule-of-Three (three coming Phase 4.3
   consumers justify promotion).
4. View tools/testkit/ for existing render-similarity primitives.
   May be inlined in Phase 3 sim; promote if so.
5. View docs/portfolio-conventions.md (WU-P) — Camera conventions
   reference coordinate system there.
6. View tools/testkit/probes/template.md.
7. Web-fetch the PhysGaussian paper (arXiv:2311.12198) to confirm
   PhysicsCoupling primitives match published formulation.
8. Resolve strict-mode lint invocations.

Commit probe report.

Build:

Commit C1 (new files):
- common/common-3dgs/training/ (with model.py, loop.py, tests/)
- common/common-3dgs/splatting/ (rasterizer.py, tests/)
- common/common-3dgs/viewer/ (headless.py, interactive.py,
  tests/test_headless.py)
- common/common-3dgs/coupling/ (coupling.py, tests/)
- tools/testkit/render_similarity/ (metrics.py, report.py, tests/)
- docs/testkit/render-similarity.md

Commit C2 (existing-file edits):
- docs/common/3dgs.md: extended with training/splatting/viewer/
  coupling sections. (If this file didn't exist at Phase 3 close,
  goes in C1.)
- Phase-3-sim consumer file(s) whose inlined infrastructure you
  promoted: imports updated to consume from common-3dgs.

This WU has NO convergence touch on entry-point files (common-3dgs
is its own top-level peer module; no parent entry point registers
its submodules).

Acceptance criteria:
- pytest -W error common/common-3dgs/, tools/testkit/render-
  similarity/: green.
- Strict lint green.
- python -m integrity --all green (Cat 1 verifies citation chain
  to PhysGaussian and other 3DGS papers in spec Appendix A.2).

**v9 addendum (per spec § 7.5 + v9 amendment block):**

- **Mutation-testing baseline for common-3dgs Phase 4 maturation (spec § 2.13).** Phase 3 task-1 introduced common-3dgs and produced a mutation baseline. WU-C extends the surface (Gaussian Splatting → MPM coupling) and must not regress mutation score below 80% on common-3dgs code (or below Phase 3's baseline, whichever is stricter). Run `bash tools/testkit/mutation/run-mutation.sh --target common/common-3dgs/ --baseline tools/testkit/mutation/phase-3-task-1-<UTC>.json`. New baseline committed at `tools/testkit/mutation/phase-4-wu-c-<UTC>.json`.
- **PBT for render-similarity quality bounds (spec § 2.14):** ≥ 2 invariants at `tools/testkit/property/common-3dgs/` — suggested `render_similarity_self_identity` (PSNR=sentinel, SSIM=1.0 for a rendered image vs itself, regardless of content) and `gaussian_serialization_round_trip` (gaussian_set → save_ply → load_ply preserves all parameters bitwise within fp16 precision under random valid gaussian sets).
- **Independent-reference anchors for 3DGS reference values.** Anchor 1: Kerbl et al. 2023 "3D Gaussian Splatting for Real-Time Radiance Field Rendering" SIGGRAPH (cite Eq. 6 alpha-compositing formula). Anchor 2: PhysGaussian Eq. (8) for MPM coupling. Anchor 3: hand-derivation of the trivial case (single Gaussian, identity transform, axis-aligned camera).
- **Perf-ledger row.** Append `| common-3dgs | warp + cuda | smoke-render-256-gaussians | <wall_clock> | <hw> | <sha> | <date> | baseline |`.
- **Append-only check against v0.3.0-phase-3.** No Phase 3 audit may be edited.
- **No tag pushing.** Operator-only.

Commit directly to `main` (per v8 trunk-based amendment).

Completion report template:

---
WU-C — Gaussian Splatting: completion report
Branch: phase4.0/wu-c-3dgs (merged, deleted)
Tip SHA: <SHA>

Probe report: tools/testkit/probes/reports/phase4.0-wu-c.md

Probe findings:
  common-3dgs path confirmed at: common/common-3dgs/
  Phase 3 inlined infrastructure inventory: <list>
  docs/common/3dgs.md status at Phase 3 close: <exists/absent>
  Render-similarity primitives in Phase 3: <list or "none">
  Strict-mode invocations: <commands>

Files added (C1): <list>

Files modified (C2):
  docs/common/3dgs.md (extended with training/splatting/viewer/
    coupling sections)
  <Phase-3-sim consumer file(s) updated to import from common-3dgs>

Promoted-from-Phase-3 inventory:
  <Source path → Destination path>

Test results:
  pytest (per-module): green
  Strict lint: green
  python -m integrity --all: green

Open questions: <list or "none">
---
```

### 7.5 — Stage 5: WU-D Newton Physics

```
You are the WU-D (Newton Physics) agent on Phase 4.0 for
Bit-Physics. Read docs/phase4/plan.md fully, especially §3.3
(vendoring), §4.2.D (API contract).

Branch: phase4.0/wu-d-newton

Role: Wire NVIDIA Newton 1.0 GA into common-warp as a backend.
Expose USD scene template + capture-to-USD export. Define Newton-
specific determinism declaration spec.

Newton 1.0 GA shipped at GTC 2026 (March 17, 2026), Apache-2.0,
at github.com/newton-physics/newton. Linux Foundation project.
CUDA 12 (driver 545+) required; macOS runs on CPU only.

Per §3.3: Newton vendored at references/newton/; OpenUSD via
pip install usd-core.

Public API in §4.2.D:
  common_warp.newton:
    NewtonBackend (with .newton_instance escape hatch and
      SOLVERS class attribute listing all six supported solvers),
    NewtonState, DeterminismDeclaration
  common_warp.usd:
    create_scene_template, export_capture_to_usd

Newton 1.0 GA supports six solvers (per the official docs and
Isaac Sim 6.0 integration): mujoco_warp, kamino, xpbd, featherstone,
semi_implicit, vbd. All six listed in NewtonBackend.SOLVERS.

Probe (Step 1):

1. View common/common-warp/ for entry-point path.
2. Web-fetch https://github.com/newton-physics/newton for current
   1.0.x release tag + license + SHA. Confirm Apache-2.0.
3. Confirm CUDA 12 / driver 545+ available on Phase 4.0 build env;
   if not, surface as blocker.
4. Run `pip show usd-core` to confirm OpenUSD available; if not,
   `pip install usd-core` and pin to a specific version.
5. View tools/testkit/determinism/ for existing template format.
6. View docs/portfolio-conventions.md (WU-P) — USD scene template
   defaults (gravity, up-axis, units) match the conventions there.
7. View tools/testkit/probes/template.md.
8. Probe references/ gitignore status (mirror WU-B).
9. Resolve strict-mode lint invocations.

Commit probe report.

Build:

Commit C1 (new files):
- references/newton/ (source or fetch script)
- references/newton/manifest.toml (license=Apache-2.0, name,
  version=1.0.x, sha, url, scope)
- common/common-warp/newton/ (__init__, backend.py, state.py,
  determinism.py, tests/)
- common/common-warp/usd/ (__init__, scene_template.py, export.py,
  tests/)
- tools/testkit/determinism/newton-decl.md

Commit C2 (existing-file edits):
- docs/common/warp.md: "Newton integration" and "USD export"
  sections.
- common-warp entry point: register newton and usd submodules.

Acceptance criteria:
- pytest -W error common-warp/newton/, common-warp/usd/: green.
- pytest -W error common/common-warp/ (post-registration): green.
- Strict lint green.
- python -m integrity --all green (Cat 1 verifies Newton citation;
  Cat 5 verifies Newton + OpenUSD version pins in
  docs/dependencies.md per spec § 9.2).

**v9 addendum (per spec § 7.5 + v9 amendment block):**

- **Mutation-testing baseline for new newton/ + usd/ modules (spec § 2.13):** ≥ 80% per target. `bash tools/testkit/mutation/run-mutation.sh --target common/common-warp/newton/ --target common/common-warp/usd/`. New baseline at `tools/testkit/mutation/phase-4-wu-d-<UTC>.json`.
- **PBT for Newton-physics invariants (spec § 2.14):** ≥ 2 invariants at `tools/testkit/property/common-warp/newton/` — suggested `usd_round_trip_preserves_pose` (any valid rigid-body state → USD export → USD import preserves position + orientation within fp32 tolerance under random valid configurations) and `solver_no_overpenetration` (contact-enabled solver produces no overlapping rigid bodies more than `contact_offset` distance, under random valid initial configurations).
- **Independent-reference anchors for Newton-physics correctness.** Anchor 1: Featherstone (2008) *Rigid Body Dynamics Algorithms* Ch. 7 ABA single-pendulum analytic period. Anchor 2: MuJoCo XML test-suite analytic test cases (cite MuJoCo source repo SHA + path). Anchor 3: hand-derived solver-degenerate cases (zero gravity → no motion; zero stiffness → no constraints).
- **CPU-only fallback acceptance (per spec § 12.8 + v9 amendment).** If CUDA-capable runner is not available at WU-D dispatch, the acceptance posture shifts to "CPU determinism + USD export validates". The agent does NOT silently fall back; the operator ratified the fallback at Phase 4 pre-dispatch checklist § 2.
- **Perf-ledger rows.** Append rows for newton smoke + usd round-trip:
  - `| common-warp-newton | warp-cuda | smoke-pendulum-1s-1000steps | <wall_clock> | <hw> | <sha> | <date> | baseline |`
  - `| common-warp-usd | python | usd-round-trip-canonical-pose | <wall_clock> | <hw> | <sha> | <date> | baseline |`
- **Append-only check against v0.3.0-phase-3.** No Phase 3 audit may be edited.
- **No tag pushing.** Operator-only.

Commit directly to `main` (per v8 trunk-based amendment).

Completion report template:

---
WU-D — Newton Physics: completion report
Branch: phase4.0/wu-d-newton (merged, deleted)
Tip SHA: <SHA>

Probe report: tools/testkit/probes/reports/phase4.0-wu-d.md

Probe findings:
  common-warp entry point: <path>
  Newton 1.0 GA SHA vendored: <SHA>
  Newton version pin: <e.g., 1.0.2>
  Newton license: Apache-2.0 (confirmed)
  OpenUSD via usd-core version: <e.g., 24.05>
  CUDA / driver version: <check result>
  Phase 3 Newton state: confirmed not wired
  Strict-mode invocations: <commands>

Files added (C1): <list>
Files modified (C2):
  docs/common/warp.md (Newton + USD sections)
  common-warp entry point (newton + usd registrations)

Test results:
  pytest (per-module + module-wide): green
  Strict lint: green
  python -m integrity --all: green

Open questions: <list or "none">
---
```

### 7.6 — Stage 6: WU-E Learning Harness

```
You are the WU-E (Learning Harness) agent on Phase 4.0 for
Bit-Physics. Read docs/phase4/plan.md fully, especially §4.2.E
(API contract — note: v6 of this plan adopted PyTorch Lightning
instead of reimplementing TrainingLoop).

Branch: phase4.0/wu-e-learning

Role: Build dataset / Lightning-based training conventions /
PhysicsNeMo adapter for Phase 4.6's two learned-dyn sims.

Per §3.3: PyTorch Lightning pinned pip; PhysicsNeMo pinned pip
(`nvidia-physicsnemo`); pin to a specific 1.x version to avoid the
v2.0 update churn.

Public API in §4.2.E:
  common_py.learned:
    CaptureDataset (torch.utils.data.Dataset subclass),
    CaptureLightningDataModule (lightning.pytorch.LightningDataModule),
    default_trainer(...) function returning configured
      lightning.pytorch.Trainer
  common_warp.learned:
    warp_to_torch, torch_to_warp,
    PhysicsNeMoAdapter

NOTE: This WU does NOT define a TrainingLoop class. v5 of this
plan did, then v6 removed it in favor of using PyTorch Lightning
directly. Sim implementers in Phase 4.6 write their own
lightning.pytorch.LightningModule subclasses and use
default_trainer().fit(module, datamodule).

Probe (Step 1):

1. View common/common-py/ for entry-point.
2. View common/common-warp/ for entry-point.
3. Confirm lightning and nvidia-physicsnemo installable
   in build env. Pin versions.
4. View docs/portfolio-conventions.md (WU-P) — CaptureDataset's
   yielded sample fields use the canonical names from §4.2.P.
5. Read Phase 3 PINN sim spec (per §11.4 item 3.6) to inherit
   any learning-from-physics conventions.
6. Review capture-file format (manifest + HDF5 per spec §0.3) so
   CaptureDataset reads it correctly.
7. View tools/testkit/probes/template.md.
8. Resolve strict-mode lint invocations.

Commit probe report.

Build:

Commit C1 (new files):
- common/common-py/learned/ (__init__, dataset.py, datamodule.py,
  trainer_defaults.py, tests/)
- common/common-warp/learned/ (__init__, bridges.py,
  physicsnemo_adapter.py, tests/)
- docs/testkit/dataset-harness.md (spec sheet covering CaptureDataset
  conventions, seed management referencing §4.2.P, train/val/test
  split conventions)

Commit C2 (existing-file edits):
- common-py entry point: register learned submodule.
- common-warp entry point: register learned submodule.

Acceptance criteria:
- pytest -W error common-py/learned/, common-warp/learned/: green.
- pytest -W error common/common-py/, common/common-warp/ (post-
  registration): green.
- Strict lint green.
- python -m integrity --all green (Cat 5 verifies PyTorch Lightning
  + PhysicsNeMo version pins in docs/dependencies.md).

**v9 addendum (per spec § 7.5 + v9 amendment block):**

- **Mutation-testing baseline for learned/ modules (spec § 2.13):** ≥ 80% per target. `bash tools/testkit/mutation/run-mutation.sh --target common/common-py/learned/ --target common/common-warp/learned/`. New baseline at `tools/testkit/mutation/phase-4-wu-e-<UTC>.json`.
- **PBT for learning-harness invariants (spec § 2.14):** ≥ 2 invariants at `tools/testkit/property/common-py/learned/` — suggested `dataset_split_no_overlap` (train/val/test partitions of a CaptureDataset have empty pairwise intersection under random valid seeds and ratios) and `seed_determinism_within_lightning` (Lightning's `seed_everything(s)` followed by a forward pass on a fixed input is bit-exact across two runs in the same process — guards against silent CUDA-determinism regressions).
- **Independent-reference anchors for training-loop correctness.** Anchor 1: PyTorch Lightning tutorials cite `LightningModule.training_step` contract (cite version pin + URL). Anchor 2: PhysicsNeMo tutorial reference (cite version pin + URL). Anchor 3: hand-derived sanity-test (untrained model with frozen seed produces deterministic loss curve).
- **Perf-ledger row.** Append `| common-py-learned | python (PyTorch + Lightning) | smoke-train-1-epoch-fake-data | <wall_clock> | <hw> | <sha> | <date> | baseline |`.
- **Append-only check against v0.3.0-phase-3.** No Phase 3 audit may be edited.
- **No tag pushing.** Operator-only.

Commit directly to `main` (per v8 trunk-based amendment).

Completion report template:

---
WU-E — Learning Harness: completion report
Branch: phase4.0/wu-e-learning (merged, deleted)
Tip SHA: <SHA>

Probe report: tools/testkit/probes/reports/phase4.0-wu-e.md

Probe findings:
  common-py entry point: <path>
  common-warp entry point: <path>
  PyTorch Lightning version pin: <e.g., 2.4.0>
  PhysicsNeMo version pin: <specific 1.x, e.g., 1.0.5>
  PhysicsNeMo extras used: <e.g., [cu12]>
  Phase 3 PINN conventions inherited: <notes>
  Strict-mode invocations: <commands>

Files added (C1): <list>
Files modified (C2):
  common-py entry point (learned registration)
  common-warp entry point (learned registration)

Test results:
  pytest (per-module + module-wide): green
  Strict lint: green
  python -m integrity --all: green

Open questions: <list or "none">
---
```

### 7.7 — Stage 7: WU-F Variant Equivalence

```
You are the WU-F (Variant Equivalence) agent on Phase 4.0 for
Bit-Physics. Read docs/phase4/plan.md fully, especially §4.2.F.

Branch: phase4.0/wu-f-equiv

Role: Build the testkit harness for variant-vs-reference
equivalence. Phase 0's existing cross-stack harness compares
stacks; you add same-stack-different-variant comparison.

Public API in §4.2.F:
  tools/testkit/equivalence/variant/:
    VariantToleranceSpec, compare_captures, EquivalenceReport

Probe:

1. View tools/testkit/equivalence/ — read existing cross-stack
   harness. Your variant/ subdirectory is a sibling. Confirm
   whether the equivalence module has a registration pattern.
2. View docs/testkit/equivalence.md for existing spec format.
3. View docs/portfolio-conventions.md (WU-P) — output_name in
   VariantToleranceSpec references canonical field names there.
4. Probe one existing per-sim equivalence.md (per spec §6.6).
5. View tools/testkit/probes/template.md.
6. Resolve strict-mode lint invocations.

Commit probe report.

Build:

Commit C1 (new files):
- tools/testkit/equivalence/variant/__init__.py, harness.py,
  tolerance.py, report.py, tests/
- docs/testkit/variant-equivalence.md

Commit C2 (existing-file edits, probe-conditional):
- tools/testkit/equivalence/<entry-point> if registration pattern
  exists.

Acceptance criteria:
- pytest -W error tools/testkit/equivalence/variant/: green.
- Strict lint green.
- python -m integrity --all green.

**v9 addendum (per spec § 7.5 + v9 amendment block):**

WU-F is the foundation that **ratifies variant tolerances** for the 27 frontier sims in Stages 9–35. The tolerance discipline is therefore load-bearing here.

- **Mutation-testing baseline for variant/ module (spec § 2.13):** ≥ 85% (higher than standard 80% because this gates correctness for all Phase 4 frontier variants). `bash tools/testkit/mutation/run-mutation.sh --target tools/testkit/equivalence/variant/ --threshold 0.85`. Baseline at `tools/testkit/mutation/phase-4-wu-f-<UTC>.json`.
- **PBT for variant-equivalence harness (spec § 2.14):** ≥ 2 invariants at `tools/testkit/property/variant_equivalence/` — suggested `identity_variant_passes` (a variant whose output equals the parent's output passes the harness with PASS verdict for any tolerance) and `tolerance_monotone` (widening tolerance never converts a PASS into FAIL).
- **Tolerance-budget enforcement (spec § 2.6 + v9 amendment).** Variant tolerances in `tools/testkit/equivalence/tolerance.toml` (under the `[variant.*]` keys WU-F introduces) are subject to `tolerance-budget.toml` caps per per-axis category:
  - Differentiable variants: tolerance budget for gradient verification (default 1e-3 relative; budget cap 1e-2).
  - Sparse variants: tolerance budget for sparse-vs-dense diff (default 1e-6 absolute; budget cap 1e-4).
  - Neural variants: tolerance budget for render-similarity (default PSNR ≥ 35 dB, SSIM ≥ 0.9; budget floor PSNR ≥ 25 dB, SSIM ≥ 0.7).
  - Frontier-algorithm variants: per-paper-specific; budget caps set per frontier paper at variant-stage dispatch.
  - Newton-backed variants: tolerance budget for USD-round-trip-fidelity (default fp32-precision; budget cap fp16-precision).
  - Learned-dynamics variants: tolerance budget for rollout-stability (default norm-bound ≤ 1.5× initial; budget cap norm-bound ≤ 3× initial).

  WU-F's `tolerance.py` module exports `assert_within_budget(variant_axis, proposed_tolerance)` which raises `ToleranceBudgetExceeded` if the proposed value exceeds the cap. Cat-X HARD_FAILs over-budget overrides. Variant stages that need wider tolerance for legitimate numerical reasons must file a tolerance-budget-amendment proposal (separate operator-approved commit + audit at `docs/_audits/tolerance-budget-amendments/<UTC>.md`).

- **Independent-reference anchors for tolerance defaults.** Anchor 1: per-axis tolerance default rationale documented with citations (e.g., gradient verification 1e-3 ≈ float32 epsilon × 1000, justifiable per Higham *Accuracy and Stability of Numerical Algorithms* (2nd ed.) §1.13). Anchor 2: variant-axis-specific frontier paper's reported tolerance (where applicable). Anchor 3: hand-derived sanity-check (identity variant: any tolerance passes).
- **Append-only check against v0.3.0-phase-3.** No Phase 3 audit may be edited.
- **No tag pushing.** Operator-only.

Commit directly to `main` (per v8 trunk-based amendment).

Completion report template:

---
WU-F — Variant Equivalence: completion report
Branch: phase4.0/wu-f-equiv (merged, deleted)
Tip SHA: <SHA>

Probe report: tools/testkit/probes/reports/phase4.0-wu-f.md

Probe findings:
  tools/testkit/equivalence/ structure: <summary>
  Entry-point registration pattern: <yes/no>
  Strict-mode invocations: <commands>

Files added (C1): <list>
Files modified (C2): <list or "none">

Test results:
  pytest -W error: green
  Strict lint: green
  python -m integrity --all: green

Open questions: <list or "none">
---
```

### 7.8 — Stage 8: WU-G Phase Ledger

```
You are the WU-G (Phase Ledger) agent on Phase 4.0 for Bit-Physics.
Read docs/phase4/plan.md fully, especially §4.2.G (ledger schema),
§4.4 (folder conventions), §4.5 (frontier-sim consumption map).

Branch: phase4.0/wu-g-ledger

Role: Stand up the Phase 4 dispatch ledger, dependency graph, audit
bootstrap directory, variant-folder stub spec headers, and new-
category folder skeletons. Pre-stages Phase 4 stages 9–35
arrival.

You are the last WU. Prior WUs P, A, B, C, D, E, F have all landed
to main. Your work consumes their existence (e.g., the dependency
graph in docs/phase4/dependency-graph.md references their landed
infrastructure).

Probe (Step 1):

1. View main's current state — confirm WU-P through WU-F have
   landed (each should show as a merged commit pair on main).
   If any is missing, that prior WU didn't complete; surface.
2. View docs/sim-specs/ to enumerate every existing reference sim
   that Phase 4.1–4.4 will add variants to. Cross-reference against
   spec §11.5 items 4.1–4.22.

   The (stage, sim, variant) mapping per spec §11.5:
     4.1 (diff variants of existing sims):
       4.1 → continuous-ca/reaction-diffusion-2d
       4.2 → particle-fluid/sph-water
       4.3 → hybrid-pg/mpm-multimaterial
       4.4 → continuous-ca/lenia
       4.5 → volumetric-grid/eulerian-smoke
       4.6 → rigid-body/<Phase-3-pedagogical-sim>
     4.2 (sparse variants):
       4.7  → volumetric-grid/eulerian-smoke
       4.8  → hybrid-pg/mpm-multimaterial
       4.9  → volumetric-grid/eulerian-smoke (quadtree)
       4.10 → lattice/lattice-boltzmann-d3q19 (probe for
              exact Phase 1 LBM path)
     4.3 (neural-rendered):
       4.11 → hybrid-pg/mpm-multimaterial
       4.12 → particle-fluid/sph-water
       4.13 → volumetric-grid/eulerian-smoke
       4.14 → hybrid-pg/mpm-multimaterial (variant of 4.11)
     4.4 (frontier-algorithm):
       4.15 → volumetric-grid/eulerian-smoke (Clebsch-PFM)
       4.16 → volumetric-grid/eulerian-smoke (EDGE)
       4.17 → volumetric-grid/eulerian-smoke (VPFM)
       4.18 → continuous-ca/lenia (Particle Lenia)
       4.19 → continuous-ca/lenia (Flow Lenia)
       4.20 → continuous-ca/neural-ca (DiffLogic CA)
       4.21 → lattice/lattice-boltzmann-d3q19 (Moment-encoded)
       4.22 → volumetric-grid/eulerian-smoke (Gaussian Fluids)
     4.5 (new sims under rigid-body/):
       4.23: articulated-locomotion (Featherstone) — locked v8
       4.24: granular-pile (MuJoCo-Warp) — locked v8
       4.25: manipulator-grasp (Kamino) — locked v8
     4.6 (new sims under learned-dynamics/):
       4.26: gns-particle
       4.27: learned-closure-les

3. View one existing per-sim folder to confirm structure per spec §8.1.
4. Find existing Phase 0–3 landing-ledger files (likely under docs/)
   to mirror conventions.
5. View docs/portfolio-conventions.md (WU-P) — the ledger and stubs
   reference these conventions.
6. View tools/testkit/probes/template.md.
7. Resolve strict-mode lint invocations.

Commit probe report.

Build (typically 1 commit, all new files; no convergence touches):

- docs/phase4/ledger.md (27 rows per §4.2.G schema)
- docs/phase4/dependency-graph.md (per §4.2.G format)
- docs/phase4/_audits/.gitkeep
- Variant stub spec headers for existing-sim variants 4.1–4.22:
    For each 4.1 sim: docs/sim-specs/<category>/<sim>/spec-diff.md
    For each 4.2 sim: docs/sim-specs/<category>/<sim>/spec-sparse.md
    For each 4.3 sim: docs/sim-specs/<category>/<sim>/spec-neural.md
    For each 4.4 sim: docs/sim-specs/<category>/<sim>/spec-frontier.md

  IMPORTANT — skip-if-exists rule:
    Before creating each stub, check whether the target path
    already exists. If yes, SKIP (do not overwrite); record in
    completion report. Phase 3 item 3.5 shipped at least one
    spec-neural.md (hybrid-pg/mpm-multimaterial/spec-neural.md).

  Frontier stub "Phase 4.0 infrastructure consumed" field per sim:
    4.15 Clebsch-PFM        → "—" (classical CFD, no §4.2 socket)
    4.16 EDGE               → "—"
    4.17 VPFM               → "—"
    4.18 Particle Lenia     → "—"
    4.19 Flow Lenia         → "—"
    4.20 DiffLogic CA       → "§ 4.2.A"
    4.21 Moment-encoded LBM → "§ 4.2.B"
    4.22 Gaussian Fluids    → "§ 4.2.B + § 4.2.C"

- New-category folder skeletons (README only, per §4.2.G format):
    docs/sim-specs/rigid-body/README.md
    docs/sim-specs/learned-dynamics/README.md

  DO NOT create sim folders for sims 4.23–4.27. Those land in 4.5
  and 4.6.

Stub format — copy from §4.2.G verbatim.

No convergence-touch edits.

Acceptance criteria:
- docs/phase4/ledger.md has exactly 27 rows mapping 1-to-1 to spec
  §11.5 items 4.1–4.27.
- Every variant stub file conforms to the format in §4.2.G.
- Markdown lint green.
- python -m integrity --all green.

**v9 addendum (per spec § 7.5 + v9 amendment block):**

- **WU-G is documentation-only; TDD does not apply.** The acceptance is markdown lint + Cat 4 grammar check. No failing-tests output-hash needed.
- **Ledger entry format includes new v9 fields:** each of the 27 ledger rows includes columns for `pbt_invariants_declared` (count; expected ≥ 2 per spec § 2.14) and `perf_ledger_row_appended` (yes/no, tracked as stages land). The Stage-36 closing audit reads these columns.
- **Variant stub front-matter includes v9 declarations** (per §4.2.G + v9 amendment): each `spec-<variant>.md` stub has the standard 12-section structure plus an explicit `§ 6 PBT invariant declarations:` line marked "TODO — populated by variant-stage agent". The agent at the variant stage MUST replace TODO with ≥ 2 declared invariants per spec § 2.14.
- **Independent-reference anchor placeholder.** Each variant stub has a `§ 8 Independent-reference anchors:` section marked "TODO — ≥ 3 per spec § 2.4". Variant-stage agent populates per their frontier paper.
- **Append-only check against v0.3.0-phase-3.** No Phase 3 audit may be edited.
- **No tag pushing.** Operator-only.

Commit directly to `main` (per v8 trunk-based amendment).

Completion report template:

---
WU-G — Phase Ledger: completion report
Branch: phase4.0/wu-g-ledger (merged, deleted)
Tip SHA: <SHA>

Probe report: tools/testkit/probes/reports/phase4.0-wu-g.md

Probe findings:
  Prior WUs (P, A, B, C, D, E, F) all landed: confirmed
  In-scope reference sims for 4.1–4.22: <total count>
  Phase 1 LBM sim path: <resolved>
  Phase 3 rigid-body pedagogical sim path: <resolved>
  Existing landing-ledger format from Phase 0–3: <reference>
  Strict-mode invocations: <commands>

Files added:
  docs/phase4/ledger.md (27 rows)
  docs/phase4/dependency-graph.md
  docs/phase4/_audits/.gitkeep
  Variant stubs:
    spec-diff.md: <count> files
    spec-sparse.md: <count>
    spec-neural.md: <count>
    spec-frontier.md: <count>
  Category READMEs:
    docs/sim-specs/rigid-body/README.md
    docs/sim-specs/learned-dynamics/README.md
  tools/testkit/probes/reports/phase4.0-wu-g.md

Ledger row count: 27 (verified 1-to-1 with spec §11.5 4.1–4.27)

Pre-existing variant specs (skipped per skip-if-exists):
  <list paths and variant type; expected to include
   docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-neural.md>

Test results:
  Markdown lint: green
  Ledger row count check: 27 ✓
  Stub format conformance: all match §4.2.G template ✓
  python -m integrity --all: green

Open questions: <list or "none">
---
```

---

## § 8 — Frontier-sim stage briefings (Stages 9–35)

Each frontier sim is one stage. The agent reads the §8.X section for its sim at the moment that stage dispatches. Naming convention: each sim's variant directory is `<category>/<sim>/<variant-suffix>/` and the variant spec sheet is `docs/sim-specs/<category>/<sim>/spec-<variant>.md` (the WU-G stub at Stage 8 created these spec-X.md stubs; the stage agent fills them).

All Stages 9–35 share a uniform pattern:

1. **Probe.** View the relevant § 4.2 socket(s) from § 7's stage briefings. Confirm imports resolve. View the parent sim's `spec-ref.md`. Confirm the parent's capture descriptors at `captures/<parent>-ref/`. Web-fetch the variant's frontier paper (where applicable). Write a probe report at `docs/_audits/phase-4/stage-<N>-<sim>-probe-<UTC>.md`.
2. **Failing-tests commit (per spec § 1.3 step 4 + v9 amendment).** Author the variant test suite under `<category>/<sim>/<variant-suffix>/tests/`. Run pytest and capture verbatim output:
   ```
   pytest <category>/<sim>/<variant-suffix>/tests/ -v 2>&1 | tee tools/testkit/failing-tests-evidence/<sim>-<variant-suffix>-<UTC>.txt
   sha256sum tools/testkit/failing-tests-evidence/<sim>-<variant-suffix>-<UTC>.txt
   ```
   Confirm failure mode is `ModuleNotFoundError` / `NotImplementedError`, not framework misconfiguration. Commit the test files AND the failing-output evidence file together; commit message footer:
   ```
   Failing-tests-output: tools/testkit/failing-tests-evidence/<sim>-<variant-suffix>-<UTC>.txt
   Failing-tests-output-hash: sha256:<full-hex>
   ```
3. **Build.** Implement the variant under `<category>/<sim>/<variant-suffix>/`. Fill in the variant spec sheet per spec § 8.2 template. **Spec sheet § 6 declares ≥ 2 PBT-covered invariants per spec § 2.14 + v9 amendment**, with the variant-axis-specific invariant always one of them:
   - **Differentiable variants:** `gradient_correctness_vs_finite_diff` (autodiff gradient matches finite-difference within 1e-3 rel under random valid parameters) + `gradient_zero_for_unused_params`.
   - **Sparse variants:** `active_mask_membership_preserved_through_round_trip` + `dense_equivalent_at_full_density` (sparse variant degenerates to dense when activity is 100%).
   - **Neural-rendered variants:** `render_similarity_bounded_under_random_seeds` (PSNR/SSIM lower bounds hold across random inference seeds) + `inference_determinism_given_weights_and_seed`.
   - **Frontier-algorithm variants:** depend on the algorithm; document in spec § 6 per frontier paper. Always include `equivalence_to_parent_under_canonical_descriptor`.
   - **Newton-backed rigid sims:** `momentum_conservation_no_external_forces` + `usd_export_round_trip` (state → USD → state preserves observable physics).
   - **Learned-dynamics sims:** `rollout_stability_bounded_norm` (state norm doesn't diverge over N steps under random valid ICs) + `training_loss_decreases_monotonically_on_validation` (training convergence as a PBT-checked statistical claim with bootstrap CI).
   The implementation commit footer references the failing-tests commit:
   ```
   Implements-failing-tests-from: <failing-tests-commit-sha>
   Failing-tests-output-hash-witnessed: sha256:<same-hex>
   ```
4. **Independent-reference anchors in any new golden tables (per spec § 2.4 + v9 amendment):** ≥ 3 anchors per table. For frontier-paper-anchored sims, the paper provides Anchor 1 (cite equation + page); Anchor 2 should be a textbook or earlier paper that the frontier paper itself cites; Anchor 3 should be a hand-derivation or a degenerate-case cross-check (e.g., variant reduces to parent at a specific parameter setting).
5. **Run gates** including variant-specific gate (gradient verification for diff; sparse-vs-dense for sparse; render-similarity for neural; equivalence for frontier; USD validation for Newton; rollout stability for learned). Plus thirteen-gate Layer 4 acceptance per spec § 3.5 v2.4; the variant-specific gate counts as Gate 4 (code verification) with the variant's stricter posture.
6. **Capture.** Produce `captures/<sim>-<variant-suffix>/<descriptor>.h5` per spec § 2.7. Variant-specific schema fields populated (gradient_fields at 1.1.0 for diff; active_mask at 1.1.0 for sparse). **Schema-corpus seed (per spec § 2.7/2.12 + v9 amendment):** copy the canonical capture to `tests/fixtures/legacy-captures/phase-4-<sim>-<variant-suffix>.h5` + sidecar.
7. **Perf-ledger row (per spec § 2.15 + v9 amendment):** append `| <sim> | <stack> | <descriptor>-<variant> | <wall_clock> | <hw> | <sha> | <date> | baseline |` to `docs/perf-ledger.md`. The closing audit (Stage 36) flags > 2× regression from the parent-sim baseline; informational, surfaces to operator.
8. **Tolerance-budget compliance (per spec § 2.6 + v9 amendment):** any new tolerance.toml entries (variant-specific tolerances often need new entries because variants have different numerical behavior from parents) must be within tolerance-budget.toml caps. For frontier variants that need genuinely wider tolerance, propose a separate operator-approved `chore(tolerance-budget): amend …` commit; do NOT widen unilaterally.
9. **Commit.** 1–3 commits per Convention A. The failing-tests commit is the FIRST commit; the implementation commit is SECOND; the capture + spec sheet + perf-ledger row is THIRD.
10. **Report.** Completion report at `docs/_audits/phase-4/stage-<N>-<sim>-<UTC>.md` per spec § 7.5 canonical front-matter. **The front-matter `evidence_hashes:` includes the sha256 of the failing-tests-evidence file** (per v9 amendment item 5). WU-G ledger row update from "planned" to "landed". Append one line to `docs/phase4/progress.md`.

The per-stage briefings below give the sim-specific details (sockets, parameters, paper anchors). The agent does NOT need a different prompt template per sim — this uniform pattern handles all 27 frontier stages. The §8.X subsection's "stage table" gives the stage-specific PBT-invariant pick, golden-anchor recommendations, and tolerance-bracket from the variant axis.

### 8.1 — Stages 9–14: Differentiable variants (spec § 11.5 items 4.1–4.6)

Six sims, each a `<parent>/diff/` variant exposing inverse-problem capability via the `InverseProblem` ABC from Stage 2 (WU-A). Each sim must declare a `ParamSpec`. WU-G's `spec-diff.md` stubs exist for all six at Stage 9's start.

| Stage | Spec item | Parent sim | Stack | Primary infra | Notes |
|---|---|---|---|---|---|
| 9 | 4.1 | `continuous-ca/reaction-diffusion-2d` | D (Taichi `ti.ad.Tape`) | § 4.2.A | ParamSpec covers (F, k); parameter-ID inverse problem; lightest |
| 10 | 4.2 | `particle-fluid/sph-water` | **D (DiffTaichi — locked v8 amendment)** | § 4.2.A | ParamSpec covers (viscosity, kernel-size, density-base, surface-tension, damping); control problem |
| 11 | 4.3 | `hybrid-pg/mpm-multimaterial` | D (Taichi; DiffTaichi parentage) | § 4.2.A | ParamSpec covers per-material constitutive coefficients (flatten ≤50) |
| 12 | 4.4 | `continuous-ca/lenia` | D | § 4.2.A | ParamSpec covers kernel params (μ, σ, growth-coefficients; 4–8 scalars); pattern-matching inverse problem |
| 13 | 4.5 | `volumetric-grid/eulerian-smoke` | E (Warp `wp.Tape`) | § 4.2.A | ParamSpec covers initial-velocity dense field (3 × N grid cells); SIGGRAPH Asia 2025 adjoint flow-map anchor |
| 14 | 4.6 | `rigid-body/articulated-pedagogical` | E (Warp `wp.Tape`) | § 4.2.A | ParamSpec covers (masses, inertias, gravity-vector; ≤20 scalars); IC-recovery inverse problem |

**Per-sim deliverables (same shape for all six):**

- Variant spec sheet at `<parent>/spec-diff.md` with §§ 1, 4, 6, 9, 13 populated.
- `InverseProblem` subclass implementing `forward`, `params_spec`, `fit`, `check_gradient`.
- `ParamSpec` declaration with worked `pack` / `unpack` / `structure`.
- Three example scripts (`parameter_id.py`, `initial_state_recovery.py`, `control.py`) at `<variant-dir>/examples/`.
- Gradient-verification test using `verify_sim_gradients` (from WU-A): assert pass at `rel_tol=1e-5`.
- Capture at `captures/<sim>-diff/<descriptor>.h5` with `gradient_fields` populated; schema 1.1.0.
- Parent sim's `equivalence.md` extended with the diff-variant tolerance row.

**Acceptance:** gradient-verification passes; forward-pass equivalence vs parent passes; capture round-trips.

### 8.2 — Stages 15–18: Sparse-adaptive variants (spec § 11.5 items 4.7–4.10)

Four sims. Three use `common-warp.sparse` (WU-B) + `bit_physics::nanovdb` C++ (WU-B). One (Stage 17, quadtree) is sim-local and does NOT use § 4.2.B.

| Stage | Spec item | Parent sim | Variant suffix | Stack | Primary infra | Notes |
|---|---|---|---|---|---|---|
| 15 | 4.7 | `volumetric-grid/eulerian-smoke` | `sparse-nanovdb/` | C + E | § 4.2.B | Straightforward port; active cells flag non-zero density/velocity |
| 16 | 4.8 | `hybrid-pg/mpm-multimaterial` | `sparse-nanovdb/` | E | § 4.2.B | Grid sparse, particles dense; P2G writes to active cells |
| 17 | 4.9 | `volumetric-grid/eulerian-smoke` | `sparse-quadtree/` | C | — (sim-local quadtree) | SIGGRAPH 2025 quadtree-tall-cell; no §4.2 socket; quadtree at `<variant>/quadtree.{cpp,hpp}` |
| 18 | 4.10 | `lattice/lattice-boltzmann-d3q19` | `sparse-amr/` | C + E | § 4.2.B | AMR via NanoVDB tiles; per-tile active mask; Computer Physics Communications 2025 anchor |

**Per-sim deliverables:**

- Variant spec sheet at `<parent>/spec-sparse.md` with §§ 4, 6, 10, 13 populated.
- Sparse implementation using `SparseVolume` (Python) and `SparseVolumeWriter/Reader` (C++).
- Sparse-aware capture writer producing `captures/<sim>-sparse-<variant>/<descriptor>.h5` with `active_mask` populated; schema 1.1.0.
- Tier 2 sparse_topology diagnostics integrated (from WU-B).

**Acceptance:** sparse-vs-dense equivalence passes per parent's `equivalence.md` tolerance row; sparse_topology diagnostics run green.

### 8.3 — Stages 19–22: Neural-rendered variants (spec § 11.5 items 4.11–4.14)

Four 3DGS-coupled variants. All consume `common-3dgs` (Phase 3 task-1 baseline + WU-C extensions: `TrainingLoop`, `PhysicsCoupling`, viewer).

| Stage | Spec item | Parent sim | Variant | Stack | Primary infra | Phase-3 carry-in | Hidden deps |
|---|---|---|---|---|---|---|---|
| 19 | 4.11 | `hybrid-pg/mpm-multimaterial` | neural (PhysGaussian extension) | E | § 4.2.C | Phase 3 task-1 + task-8 | — |
| 20 | 4.12 | `particle-fluid/sph-water` | neural (3DGS-SPH; Gaussian Splashing 2024) | E | § 4.2.C | Phase 3 task-1 | — |
| 21 | 4.13 | `volumetric-grid/eulerian-smoke` | neural (3DGS-smoke; Gaussian Smoke 2025) | E | § 4.2.C | Phase 3 task-1 | — |
| 22 | 4.14 | `hybrid-pg/mpm-multimaterial` | neural-iterative (i-PhysGaussian) | E | § 4.2.C | Phase 3 task-1 + task-8 | § 4.2.A (if differentiable rendering used) |

**Per-sim deliverables:**

- Variant spec sheet at `<parent>/spec-neural.md` (for 4.11/4.14: extend Phase 3 task-8's existing file). §§ 3, 4, 6, 9, 13 populated.
- `PhysicsCoupling` instantiation from WU-C; sim-specific per-gaussian transform from physics state.
- For 4.14 only: differentiable rasterizer wired in; gradient flow through render-loss verified.
- Render output at `docs/renders/<sim>-neural/<frame-N>.png` (one canonical hero shot per sim).
- Render-similarity report (PSNR > sim-declared threshold) against golden hero shot.
- Capture at `captures/<sim>-neural/<descriptor>.h5` with physics state and gaussian-transform history.

**Acceptance:** render-similarity passes (or SHIFTED with documented reason if golden unavailable); physics-equivalence vs parent passes.

**Notes:** Cite PhysGaussian (Xie et al. 2024 CVPR) for 4.11 / 4.14. Cite Gaussian Splashing 2024 for 4.12. Cite Gaussian Smoke / Gaussian Fluents 2025 for 4.13. 4.14's differentiable rasterizer: try `gsplat`-style first; SHIFTED to FD if blocked.

### 8.4 — Stages 23–30: Frontier-algorithm variants (spec § 11.5 items 4.15–4.22)

Eight sims. Heterogeneous socket consumption — most use no § 4.2 socket; two use § 4.2.A or § 4.2.B; one (Gaussian Fluids) uses both § 4.2.B and § 4.2.C.

| Stage | Spec item | Parent sim | Variant | Stack | Sockets | Paper anchor |
|---|---|---|---|---|---|---|
| 23 | 4.15 | `volumetric-grid/eulerian-smoke` | `frontier-clebsch-pfm/` | C | — | Clebsch-PFM 2024 (SIGGRAPH Asia) |
| 24 | 4.16 | `volumetric-grid/eulerian-smoke` | `frontier-edge/` | C | — | EDGE 2024 (SIGGRAPH; compressible flow-map) |
| 25 | 4.17 | `volumetric-grid/eulerian-smoke` | `frontier-vpfm/` | C | — | VPFM 2025 |
| 26 | 4.18 | `continuous-ca/lenia` | `frontier-particle-lenia/` | D | — | Mordvintsev 2022 (Distill) |
| 27 | 4.19 | `continuous-ca/lenia` | `frontier-flow-lenia/` | D | — | Plantec 2022 (ALife) |
| 28 | 4.20 | `continuous-ca/neural-ca` | `frontier-difflogic-ca/` | D | § 4.2.A | DiffLogic CA 2024 |
| 29 | 4.21 | `lattice/lattice-boltzmann-d3q19` | `frontier-moment-encoded/` | C | § 4.2.B | Moment-encoded LBM 2025 |
| 30 | 4.22 | `volumetric-grid/eulerian-smoke` | `frontier-gaussian-fluids/` | E | § 4.2.B + § 4.2.C | Gaussian Fluids 2025 |

**Per-sim deliverables:**

- Frontier-paper probe at agent's stage start: web-fetch the paper; confirm DOI/authors/title; decide vendor-or-cite per spec § 2.8.
- Variant spec sheet at `<parent>/spec-frontier.md` with §§ 2, 3, 4, 6, 13 populated; § 2 cites the frontier paper.
- Paper-faithful implementation under `<parent>/<variant-suffix>/`.
- Capture at `captures/<sim>-frontier-<variant>/<descriptor>.h5`. Schema 1.1.0 if gradient or active_mask fields used.
- Optional tier-3 diagnostic for algorithm-specific invariants (e.g., Clebsch-map invariants for 4.15; entropy of logic gates for 4.20).

**Acceptance:** parent-vs-frontier equivalence passes per declared posture. Many frontier algorithms produce qualitatively different output, so equivalence may be REFRAMED to "qualitative agreement on N reference fixtures + render-similarity > threshold." Document the posture in the variant spec sheet § 6 and the completion report.

### 8.5 — Stages 31–33: Newton-backed rigid sims (spec § 11.5 items 4.23–4.25)

Three NEW reference sims under `rigid-body/`, each using Newton 1.0 GA via `common_warp.newton` (WU-D). These are not variants — they are new Layer 4 reference sims.

**Sim names + solver choices LOCKED per v8 amendment (May 18 2026).** The "owner picks at dispatch time" requirement is resolved.

| Stage | Spec item | Sim ID | Solver | Stack | Primary infra |
|---|---|---|---|---|---|
| 31 | 4.23 | `rigid-body/articulated-locomotion` | `featherstone` | E | § 4.2.D |
| 32 | 4.24 | `rigid-body/granular-pile` | `mujoco_warp` | E | § 4.2.D |
| 33 | 4.25 | `rigid-body/manipulator-grasp` | `kamino` | E | § 4.2.D |

**Rationale for the picks:**
- `articulated-locomotion` (Featherstone): articulated character walking; exercises the canonical articulated-body solver; broadly familiar from robotics + games.
- `granular-pile` (MuJoCo-Warp): 250k spheres benchmark; exercises the high-volume contact solver; clearly distinct from articulated work.
- `manipulator-grasp` (Kamino): robotic gripper grasping a cylinder; SDF + contact-rich; the most recent Newton 1.0 solver, validates the WU-D abstraction across all major solver categories.

Three solvers, three distinct physical regimes. The remaining Newton solvers (`xpbd`, `semi_implicit`, `vbd`) are exercised in Phase 3 task-4 (`articulated-pedagogical`), Phase 3 task-5 (`cloth-xpbd`), and Phase 6+ extensions respectively.

**Hardware floor (locked):** CUDA 12 / driver 545+ required for GPU execution. If unavailable, CPU-only Newton fallback per spec § 12.8:
- Determinism: same-hardware bit-exact still required (CPU determinism).
- USD export: still required (Newton USD export is backend-agnostic).
- Capture round-trip: still required.
- Benchmark numbers: tagged `CPU-only`; not compared to GPU baselines.

**Per-sim deliverables:**

- Full 13-section spec sheet at `docs/sim-specs/rigid-body/<sim>/spec-ref.md` (these are new reference sims, NOT variants — full template per spec § 8.2 v2.1 amendment including § 13 Productization status).
- Sim implementation at `<sim-dir>/main.py` using `NewtonBackend` with chosen solver.
- USD scene generation at `<sim-dir>/build_scene.py` calling `common_warp.usd.create_scene_template`.
- Capture at `captures/<sim>-ref/<descriptor>.h5` per spec Appendix D § D.2.3:
  - Stage 31: `walk-cycle-seed42-step1000`
  - Stage 32: `250k-spheres-settle-seed42-step1000`
  - Stage 33: `gripper-cylinder-seed42-step500`
  USD export via `common_warp.usd.export_capture_to_usd` as sibling file at `captures/<sim>-ref/<descriptor>.usda`.
- Determinism declaration at `tools/testkit/determinism/newton-<sim>-decl.md`.

**Acceptance:** USD scene validates; capture round-trip via common-* passes; determinism golden trajectory matches across two seeded runs; CUDA 12 / driver 545+ verified at session start OR CPU-only fallback acknowledged in stage report.

### 8.6 — Stages 34–35: Learned-dynamics sims (spec § 11.5 items 4.26–4.27)

Two NEW reference sims under `learned-dynamics/`, both using `common_py.learned` + `common_warp.learned` (WU-E). 4.27 also uses WU-A (training-through-sim autodiff).

| Stage | Spec item | Sim ID | Stack | Primary infra | Hidden deps |
|---|---|---|---|---|---|
| 34 | 4.26 | `learned-dynamics/gns-particle` | E | § 4.2.E | — |
| 35 | 4.27 | `learned-dynamics/learned-closure-les` | E | § 4.2.E | § 4.2.A (training through sim) |

**Per-sim deliverables:**

- Full 13-section spec sheet at `docs/sim-specs/learned-dynamics/<sim>/spec-ref.md`.
- `LightningModule` subclass at `<sim-dir>/model.py` using `lightning.pytorch.LightningModule` (NOT deprecated `pytorch_lightning.X`).
- Training data pipeline via `CaptureDataset` + `CaptureLightningDataModule` (WU-E).
- Training, evaluation, rollout scripts at `<sim-dir>/{train,evaluate,rollout}.py`.
- Trained weights committed at `<sim-dir>/checkpoints/best.ckpt`.
- Capture at `captures/<sim>-ref/<descriptor>.h5` with physics-state + model-prediction fields.
- For 4.27 only: training-through-sim gradient flow verified using WU-A's `check_gradient`.

**Acceptance:** training-loss convergence demonstrated; rollout-stability passes; trained weights reproducibly loadable; for 4.27, gradient-flow verification passes.

**Notes:** Cite Sanchez-Gonzalez 2020 (GNS) for 4.26 — pre-vendored at `references/papers/gns-particle-2020/`. For 4.27 LES-closure paper anchor: **owner pre-vendors specific paper at `references/papers/learned-les-closure/` BEFORE Phase 4 dispatches per spec § 12.9**. Recommended candidate: a well-known 2024–2025 learned-LES paper (e.g., List et al. 2024 "Learned turbulence modelling with differentiable fluid solvers" or equivalent at owner's choice). The "web-fetch at stage start" language in earlier drafts is SUPERSEDED. Training data: 4.26 uses Phase 1 SPH captures; 4.27 uses Phase 1 smoke captures (filtered to LES resolution).

---



After WU-G lands, dispatch one final Claude Code session for the closing audit.

### 9.1 Closing-audit prompt

```
You are the Closing Audit agent for Phase 4 of Bit-Physics. All 35
prior stages have landed to main:
  - Stages 1–8: foundation (WU-P/A/B/C/D/E/F/G)
  - Stages 9–35: 27 frontier sims (items 4.1–4.27 per spec § 11.5)

Your job: write a single summary audit at
docs/_audits/phase-4/landing-<UTC>.md covering all 35 stages and
prepare (but do NOT push) the tag `v0.4.0-phase-4`. **Per v9 amendment
and spec § 7.12, agent never runs `git tag` or `git push origin <tag>`.
The operator pushes the tag after independent landing-audit review.**

Convention discipline:
- Convention #8 (no specifics from memory).
- Convention M (re-anchor against current main before writing).
- Spec §7.5 audit-trail discipline: FACT/INFERENCE tagging,
  four-state verdicts (CONFIRMED expected), append-only, required
  front-matter.
- Spec §7.9 closing-commit anchor re-check.
- **Operator-only tag pushing (spec § 7.12 + v9).** Agent does not tag.
- **Evidence-path verification (spec § 7.5 + v9).** Run `verify_evidence.py` on every stage report.
- **Append-only check (v9).** No Phase 0/1/2/3 audit may be edited.
- **Failing-tests replay (v9).** Spot-check 3 random sim stages.
- **Mutation thresholds (spec § 2.13 + v9).** Verify no regression.

Step 1 — Re-anchor:

1. View current main HEAD.
2. View docs/phase4/progress.md — should have 35 stage lines plus
   the CONTINUE_FROM cues from any context-spanning sessions.
3. View the 35 stage completion reports at docs/_audits/phase-4/
   (foundation stages 1–8 prefixed by WU letter; frontier stages
   9–35 prefixed by stage-<N>-<sim>).
4. Spot-check each foundation stage's claimed deliverables:
   - Stage 1 (WU-P): docs/portfolio-conventions.md exists
   - Stage 2 (WU-A): common-py/autodiff/ + common-warp/autodiff/ +
     tools/testkit/code_verification/gradient/ exist; capture-v1.json
     has schema_version "1.1.0" with gradient_fields key; ParamSpec
     dataclass present
   - Stage 3 (WU-B): references/openvdb/ + common-cpp/nanovdb/ +
     common-warp/sparse/ + tier2 sparse extensions; capture-v1.json
     has active_mask key
   - Stage 4 (WU-C): common-3dgs/{training,splatting,viewer,coupling}/
     + tools/testkit/render_similarity/
   - Stage 5 (WU-D): references/newton/ + common-warp/{newton,usd}/ +
     newton-decl.md
   - Stage 6 (WU-E): common-py/learned/ + common-warp/learned/ +
     dataset-harness.md
   - Stage 7 (WU-F): tools/testkit/equivalence/variant/
   - Stage 8 (WU-G): docs/phase4/ledger.md (27 rows) +
     dependency-graph.md + stubs

5. Spot-check each frontier stage's claimed deliverables (Stages 9–35):
   - For each stage <N>, confirm:
     a. variant directory exists at <category>/<sim>/<variant-suffix>/
     b. variant spec sheet exists at docs/sim-specs/<category>/<sim>/
        spec-<variant>.md and is no longer a stub (Cat 4 grammar
        checks resolve)
     c. capture exists at captures/<sim>-<variant-suffix>/<descriptor>.h5
        per spec § 2.7 capture-location convention
     d. variant-specific gate passed per its stage's acceptance criteria
        (gradient verification for diff; sparse-vs-dense for sparse;
        render-similarity for neural; equivalence for frontier;
        USD validation for Newton; rollout stability for learned)
     e. WU-G ledger row for the corresponding spec § 11.5 item flipped
        from "planned" to "landed"

6. Spot-check the WU-G ledger (docs/phase4/ledger.md): all 27 data
   rows have status "landed"; all 27 audit cells point to existing
   files.

4. Step 1.10 — Public API surface conformance check.
   **Per v4 review § 7.10, the import-list-as-test pattern is promoted
   to integrity Cat 2 (`cat2.api_imports`) per spec § 3.2.** The closing
   audit verifies that Cat 2 covers every § 4.2 surface; the per-commit
   Cat 2 run is the load-bearing enforcement.

   Step 1.10a (Cat 2 coverage check). For each WU's API contract in §4.2,
   verify that the corresponding `docs/common/*.md` file contains a code
   block tagged ```python public-api ``` listing every public symbol that
   Cat 2's `api_imports` sub-check will extract and import-test on every
   commit. Specifically:

   - `docs/common/py.md` covers `common_py.autodiff` and `common_py.learned`
   - `docs/common/warp.md` covers `common_warp.autodiff`, `common_warp.sparse`,
     `common_warp.newton`, `common_warp.usd`, `common_warp.learned`
   - `docs/common/3dgs.md` covers `common_3dgs.training`, `common_3dgs.splatting`,
     `common_3dgs.viewer`, `common_3dgs.coupling`
   - `docs/testkit/gradient-verification.md` covers
     `code_verification.gradient.harness`
   - `docs/testkit/render-similarity.md` covers `render_similarity`
   - `docs/testkit/variant-equivalence.md` covers
     `equivalence.variant.harness`
   - `docs/diagnostics/sparse-topology.md` covers
     `diagnostics.tier2.scalar_field.sparse_topology` and
     `diagnostics.tier2.vector_field.sparse_topology`

   Step 1.10b (one-shot import smoke). As a closing-audit safety net,
   the auditor runs once:

   from common_py.autodiff import (InverseProblem, ParameterIDProblem,
     InitialStateRecoveryProblem, ControlProblem, History,
     GradientCheckReport, ParamSpec)
   from common_warp.autodiff import (... same names)
   from common_warp.sparse import SparseVolume, ActiveMask
   from common_3dgs.training import (GaussianSplatModel, TrainingLoop,
     TrainingHistory)
   from common_3dgs.splatting import Camera, render
   from common_3dgs.viewer import (render_to_image,
     launch_interactive_viewer)
   from common_3dgs.coupling import PhysicsCoupling
   from common_warp.newton import (NewtonBackend, NewtonState,
     DeterminismDeclaration)
   from common_warp.usd import (create_scene_template,
     export_capture_to_usd)
   from common_py.learned import (CaptureDataset,
     CaptureLightningDataModule, default_trainer)
   from common_warp.learned import (warp_to_torch, torch_to_warp,
     PhysicsNeMoAdapter)
   from code_verification.gradient.harness import (
     verify_sim_gradients, GradientVerificationReport)
   from render_similarity import (psnr, ssim, lpips,
     ms_ssim, RenderSimilarityReport)
   from equivalence.variant.harness import (
     VariantToleranceSpec, compare_captures, EquivalenceReport)
   from diagnostics.tier2.scalar_field.sparse_topology import (
     active_cell_count, sparsity_ratio, topology_change_detected,
     mask_diff, MaskDiffReport)
   from diagnostics.tier2.vector_field.sparse_topology import (
     active_cell_count, sparsity_ratio, topology_change_detected,
     mask_diff, MaskDiffReport)
   from lightning.pytorch import LightningModule, LightningDataModule, Trainer

   Plus C++ grep (C++ namespace updated per v4 review § 7.1 amendment 1):

   grep -q 'class SparseVolumeWriter' \
     common/common-cpp/nanovdb/include/bit_physics/nanovdb/io.hpp
   grep -q 'class SparseVolumeReader' \
     common/common-cpp/nanovdb/include/bit_physics/nanovdb/io.hpp
   grep -q 'struct ActiveMask' \
     common/common-cpp/nanovdb/include/bit_physics/nanovdb/io.hpp
   grep -q 'extract_active_mask' \
     common/common-cpp/nanovdb/include/bit_physics/nanovdb/io.hpp

   Plus schema-version compatibility smoke (per amendment 5 above):

   # WU-A's extension of common-* write_capture should accept 1.1.0:
   import schemas as schemas
   from common_warp.capture import write_capture as warp_write
   from common_py.capture import write_capture as py_write
   # Each write_capture's docstring/signature documents accepting any
   # version ≤ build's max-supported; verify the max-supported is 1.1.0.
   assert schemas.MAX_SUPPORTED_VERSION == "1.1.0"

   Any ImportError, missing symbol, or assertion failure → STOP;
   surface to human. The relevant WU's agent missed the API contract.

5. Run full Phase 4.0 acceptance:
   - pytest -W error tools/testkit/, common/common-py/,
     common/common-warp/, common/common-3dgs/, tools/diagnostics/
   - C++ build using WU-B's reported invocation
   - ruff --strict, mypy --strict, markdown lint
   - python -m integrity --all from tools/integrity/
   - Ledger row count check

   Any red → STOP; surface.

Step 2 — Write the audit:

docs/_audits/phase-4/foundation-landing-<UTC>.md

  Front-matter (spec §7.5):
    date: <YYYY-MM-DD>
    author: claude-code (closing-audit session)
    subject: Phase 4.0 Foundation landing
    verdict-state: CONFIRMED
    evidence-paths:
      - <commit SHAs of WU-P through WU-G's merge commits>
      - <test output paths>

  Body — one section per WU (P, A, B, C, D, E, F, G):
    - Sub-claim verdict (CONFIRMED expected).
    - FACT-tagged statements about what landed at what path.
    - INFERENCE-tagged statements citing FACTs.
    - Reference to the WU's probe report at
      tools/testkit/probes/reports/phase4.0-wu-<letter>.md.

  Cross-WU integration section:
    - Capture format extensions: schema_version 1.0.0 → 1.1.0
      via WU-A; active_mask via WU-B; both consumers (downstream
      Phase 4.1+ sims) tested against schema by import-time
      verification in this audit.
    - Public API surface conformance: confirmed via Step 1.10.
    - All five Cat integrity checks green per Step 1.5.

  Append-only declaration.

Step 3 — Commit:

git add docs/_audits/phase-4/foundation-landing-<UTC>.md
git commit -m "Phase 4.0 Foundation: closing audit

Audit verdict: CONFIRMED across WU-P, A, B, C, D, E, F, G.

Eight sequential work units landed in order:
  WU-P (Portfolio Conventions): <SHA>
  WU-A (Autodiff Infrastructure): <SHA>
  WU-B (Sparse Volumes): <SHA>
  WU-C (Gaussian Splatting): <SHA>
  WU-D (Newton Physics): <SHA>
  WU-E (Learning Harness): <SHA>
  WU-F (Variant Equivalence): <SHA>
  WU-G (Phase Ledger): <SHA>

Per Convention #12: this audit references prior commits' SHAs,
not its own; no follow-up back-fill needed.

Phase 4 foundation (Stages 1–8) completes here. Stages 9–35 (frontier sims) then
dispatch."

git push origin main

Step 4 — Summary to coordinator:

  Phase 4.0 Foundation closing audit complete.
  Audit: docs/_audits/phase-4/foundation-landing-<UTC>.md
  Audit commit SHA: <SHA>
  Per-WU merge SHAs: <list>
  Capture format: capture-v1.json at schema_version 1.1.0.
  Public API conformance: PASS (Step 1.10).
  All acceptance criteria: PASS.
  Deviations from plan: <list or "none">
```

---

## § 10 — Watchlist

Failure modes the WU agents and closing-audit agent surface (Hard Rule 2: pause and surface; do not auto-recover).

| # | Watch item | Trigger | Action |
|---|---|---|---|
| 1 | Phase 3 didn't land common-3dgs at expected path | WU-C probe step 1 fails | Stop. Pre-dispatch §2 item 4 missed it; Phase 3 incomplete. |
| 2 | Cat 4 or Cat 5 not actually green at dispatch | WU-P probe step 5 fails | Stop. Pre-dispatch §2 item 5 was a false-green; Phase 0 incomplete. |
| 3 | Schema bump conflict | WU-B probe step 6 finds schema_version ≠ 1.1.0 | Stop. Either WU-A didn't run or didn't bump; review WU-A completion report. |
| 4 | Vendoring license incompatibility | WU-B probe step 7 or WU-D probe step 2 finds license incompatible with portfolio use | Stop. Human chooses alternative or accepts the constraint explicitly. |
| 5 | CUDA / driver insufficient for Newton | WU-D probe step 3 fails | Stop. Build env upgrade needed or different solver-only configuration. |
| 6 | OpenUSD or PhysicsNeMo or PyTorch Lightning install fails | WU-D step 4 or WU-E step 3 | Stop. Surface specific error. |
| 7 | Ledger row count ≠ 27 | WU-G acceptance criterion fails | Stop. Diff vs spec §11.5. |
| 8 | Public API surface drift | Closing audit Step 1.10 fails | Stop. The relevant WU's agent renamed a load-bearing symbol; Phase 4.1+ sims will break. |
| 9 | Concurrent main edits during a WU session | Fast-forward merge to main fails | Stop. Surface. Phase 4.0 dispatch presumed quiescent main. |
| 10 | A prior WU didn't fully merge to main | WU's probe step 1 shows missing infrastructure | Stop. Surface to coordinator; previous WU's "landed" status is wrong. |
| 11 | Pytest red after entry-point registration | WU-A, B, D, or E's acceptance criterion fails | Stop. Import error or registration syntax issue. |
| 12 | An agent shipped a public API surface that doesn't match plan §4.2 | Closing audit Step 1.10 import fails | Stop. The agent missed the contract verbatim. |

---

## § 11 — Provenance and version

Version history:

- **6.0** — Single-agent sequential execution model replaces v5's parallel model. Eight work units (added WU-P for Portfolio Conventions). PyTorch Lightning adopted for WU-E (replaces v5's bespoke TrainingLoop). OpenVDB license corrected (MPL-2.0, not Apache-2.0); vendoring path is `references/openvdb/` not `references/NanoVDB/`. Newton solver enum expanded (six solvers per Newton 1.0 GA docs: mujoco_warp, kamino, xpbd, featherstone, semi_implicit, vbd). Newton 1.0 GA shipped March 17, 2026 verified. PhysicsNeMo install verified (`pip install nvidia-physicsnemo`, pin to 1.x). Closing-integration step removed in favor of per-WU mini-landings on main. Watchlist simplified (no more parallel-coordination failure modes). Deviation-from-norms section added to confidence audit (§ 10.4).
- **5.0** — Architecture section added (§ 4) with API contracts. Agents named consistently. Concrete API conformance check in closing-landing prompt. JSON Schema fragments for capture extensions. Folder/naming reconciliation.
- **4.0** — Path corrections (schema at `tools/testkit/schemas/capture-v1.json`; tier2 work in scalar_field/ and vector_field/; common-3dgs at `common/common-3dgs/`). Pre-dispatch checklist. Operating model. Dependency decisions pre-resolved.
- **3.0** — Repo identity Bit-Physics. Confidence audit. Convention A. Strict-mode CI.
- **2.0** — Coordinator role refactored to mechanical.
- **1.0** — Initial draft (superseded).

---

## § 12 — Confidence audit

### 12.1 Confident

- **Eight-WU sequential decomposition** with per-WU mini-landings on main. No integration risk surface.
- **API contracts in § 4.2** as canonical sockets for Phase 4.1+ consumption. Phase 4.1+ planning files reference these names verbatim.
- **Coordinator as pure sequential router.** No verification, no validation, no decisions.
- **Pre-resolved dependency decisions (§ 3.3)** verified against current upstream state (May 2026): Newton 1.0 GA Apache-2.0, OpenVDB MPL-2.0, PhysicsNeMo `nvidia-physicsnemo` PyPI, PyTorch Lightning, usd-core.
- **Pre-resolved paths.** Schema at `tools/testkit/schemas/capture-v1.json`, tier2 substack structure, common-3dgs at `common/common-3dgs/`, audit at `docs/_audits/phase-4/`, phase docs at `docs/phase4/`, probe reports at `tools/testkit/probes/reports/`. All traceable to spec citations.
- **Schema bump pre-resolved.** Additive non-breaking → minor: 1.0.0 → 1.1.0. WU-A bumps; WU-B does not re-bump.
- **Convention adoption.** Spec §§ 7.1 (Conventions M, K, #8), 7.2 (Convention A), 7.4 (Convention #12), 7.5 (FACT/INFERENCE, four-state verdicts), 7.7 (strict-mode), 7.9 (anchor re-check), 7.10 (rule-of-three) all cited correctly per direct spec review.

### 12.2 Genuinely probe-driven

- Module entry-point layout (`__init__.py` vs `src/<pkg>/__init__.py`) for common-py and common-warp.
- Exact C++ build invocation (CMake target names, Ninja flags, ctest filters).
- `justfile` wrapper target names if present.
- Exact location of Phase 0–3 landing-ledger files to mirror for WU-G.
- Whether `tools/testkit/equivalence/` has an entry-point registration pattern.
- Phase 1 LBM sim path; Phase 3 rigid-body pedagogical sim path; Phase 3 inlined 3DGS infrastructure inventory.
- Whether `references/` is gitignored in this repo.
- Current OpenVDB release tag at vendoring time (probe at WU-B dispatch; expect v12.x or newer).

### 12.3 Residual risks

- **Phase 0–3 may not match the spec exactly.** Pre-dispatch checklist § 2 gates on it; § 2 item 5 specifically runs `python -m integrity --all` to confirm toolkit wiring. Watchlist items 1, 2, 10 catch downstream failures.
- **Concurrent main edits during dispatch.** Watchlist item 9. Mitigation: human pauses other dispatches during Phase 4.0 active window (3–10 days).
- **Newton 1.0 → 2.0 transition.** Newton's release notes mention v2.0 follow-on; pinning to 1.0.x is the right move but the API may change. Mitigation: NewtonBackend wrapper insulates portfolio sims.
- **PhysicsNeMo v2.0 update.** Same shape: pin to 1.x for Phase 4.0; adapt PhysicsNeMoAdapter when v2.0 stabilizes.
- **Public API drift.** An agent could rename a load-bearing symbol despite plan warnings. Watchlist item 12 + closing audit Step 1.10 catch this.
- **OpenVDB MPL-2.0 license implications.** Portfolio license is MIT (spec § 12.7 locked v2.2). MPL-2.0 (OpenVDB) is compatible with MIT consumers as long as we don't modify vendored source — and per spec Appendix D § D.8 item 12, modifying vendored source is forbidden. Surface at WU-B only if the vendored source needs modification for an unforeseen reason.

### 12.4 Deviations from industry / academic / community standards (and defenses)

This plan adopts standards where they exist. Deviations are listed below with defenses; readers can audit whether each defense is sufficient.

**Deviation 1: Sequential AI-agent execution instead of parallel.** Industry standard for parallel builds (CMake, Bazel) is parallelism. This plan uses sequential for AI agents.
*Defense:* AI agents have non-deterministic execution and compounding variance across agents; the failure modes are different from deterministic compilers. Sequential execution is more conservative for AI multi-agent orchestration and currently better characterized. The plan should reconsider parallel when (a) Phase 4.0 baseline is stable, (b) parallel agent coordination patterns are better understood. Rationale extended in § 3.6.

**Deviation 2: InverseProblem ABC instead of native DiffTaichi / Warp idioms.** DiffTaichi and Warp's canonical pattern is context-manager + free function. We use OO subclassing.
*Defense:* Portfolio consistency across 27 sims and 2 stacks (Stack D Taichi, Stack E Warp). Without a shared base class, every Phase 4.1 sim's inverse-problem code looks different, the gradient-verification harness can't generically dispatch, and Phase 4.6 learning-through-the-sim sims can't compose with autodiff easily. The `.tape` property is an explicit escape hatch to the native idiom. Industry-direction precedent: PyTorch Module, JAX Pytree, both wrap autodiff in higher abstractions.

**Deviation 3: NewtonBackend wrapper class instead of direct Newton API use.** Newton 1.0 GA is brand new (March 2026); using its API directly is the natural choice.
*Defense:* Newton's release notes mention v2.0; a thin wrapper insulates Phase 4.5's three sims from API churn during 1.0→2.0. `.newton_instance` escape hatch allows direct access. Adapter pattern is industry-standard for wrapping recently-released libraries. Low maintenance burden (the wrapper is thin).

**Deviation 4: Portfolio variant-equivalence harness instead of adopting an existing testing framework.** Industry standard for testing is pytest / unittest / etc.; we build a custom harness.
*Defense:* No industry standard for "compare two captures of the same simulation under different variants at matched sim time with per-output tolerance." This is a domain-specific testing pattern derived from spec § 3.7 variant axis and § 6.6 per-sim equivalence. The harness is built on pytest underneath (compare_captures returns EquivalenceReport that pytest assertions use). Building rather than reinventing.

**Deviation 5: GaussianSplatModel and TrainingLoop instead of adopting a Python 3DGS library.** Multiple research-repo 3DGS implementations exist; we build our own types.
*Defense:* As of May 2026, no PyPI-installable de-facto-standard 3DGS library. Major implementations (Inria's gaussian-splatting, gsplat, Brush in Rust) are research repos without an obvious "pip install and consume" path. The portfolio needs cross-sim consistency for PhysGaussian / Gaussian Splashing / 3DGS-smoke sims. We adopt `.ply` as the industry interchange format so portfolio models load/save in a format compatible with outside viewers and tools. If a stable PyPI 3DGS library emerges, future phases may adopt it.

**Standards adopted (not deviations):**
- PyTorch Lightning for training loops (WU-E) — adopted; replaces v5's bespoke TrainingLoop.
- `torch.utils.data.Dataset` base class for CaptureDataset — adopted.
- PyTorch Lightning's Trainer / LightningDataModule / ModelCheckpoint / EarlyStopping callbacks — adopted via `default_trainer()`.
- Industry-standard feature-branch + merge-to-main with single agent — adopted.
- Semantic versioning for capture-v1.json schema — adopted.
- OpenUSD via `usd-core` PyPI — adopted (standard).
- pip install for non-citation-load-bearing deps — adopted (matches spec § 9.2 policy).
- Apache-2.0 / MPL-2.0 license attribution in manifest.toml — adopted (standard for vendored sources).
- Spec § 7.5 audit-trail discipline (FACT/INFERENCE, four-state verdicts, append-only) — adopted.

### 12.5 Phase 4's place in the spec

Phase 4 is the spec's intellectual core. Phases 0–3 are infrastructure and pedagogical scaffolding; Phases 5–6 are packaging (PyPI / npm distribution) and research-mode output. The 27 sims in Phase 4 are what the portfolio is *for* — they're the artifacts that justify the upstream layered architecture.

Phase 4.0 specifically is structurally privileged because it's where the contract between "infrastructure" and "per-sim wiring" gets fixed. Get the API contracts wrong and 27 downstream sims compensate; get them right and the wiring is mechanical. That privileged position is what makes the architecture-first framing in § 4 correct for this phase, and what made the portfolio-conventions gap (WU-P) worth closing — another contract that gets fixed once and consumed 27 times.

### 12.6 Pacing under v8 (supersedes prior estimates)

Per spec § 11.0 and the v8 amendment block at the top of this document:

Phase 4 wall-clock under single-agent AI dispatch is bounded by:
1. 35 stages × per-stage agent latency (each stage is "probe + build + capture + commit + report"; tens of minutes of agent execution under nominal conditions).
2. External-dependency resolution: paper fetches replaced by pre-vendoring per § 12.9; vendor installs (OpenVDB, Newton, PhysicsNeMo) per § 3.3 pins.
3. Continuation-session overhead at context fills per spec Appendix D § D.9.
4. Owner review: at phase landing (CONFIRMED/SHIFTED) or on BLOCKED/HALTED surfaces.

Earlier estimates ("3–5 days of agent execution" in § 1; "12–18 months by spec § 11.8" / "30–95 weeks" in this section's prior content) are SUPERSEDED. Scope is locked at 35 stages; agents complete each stage or surface BLOCKED for owner decision. No "time-box and skip remaining sims" recommendation.

If a particular stage's external dependency proves unrecoverable (paper unavailable, upstream license change, vendor library broken at expected SHA), the agent surfaces BLOCKED per spec Appendix E § E.2 Pattern B/C/M; owner decides whether to substitute, defer to Phase 6+, or abandon that variant.

---

*End of Phase 4 plan, v6.0.*

# Closed-Form Pair Implementation — Sub-Phase of Spec-Phase-1

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — gates 4–13 implementation for the closed-form pair, scoped under spec-Phase-1's full inventory.
> **Sub-phase identity:** First per-sim implementation sub-phase per Phase 1 charter § 2.5 / Phase 1 landing audit § 15. This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` tags for phase boundaries with N a single integer (the next phase tag is `v0.2.0-phase-2`). No `-phase-N` tag is proposed for this sub-phase. See § 5 + § 11.4 for tag posture.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.5, 2.7, 2.13, 2.14, 2.15, 3.5, 7.12, 7.13, 11.2, 11.7 + Appendix D § D.2.3.
> **Parent charter:** `docs/phases/phase-1-plan.md`. This sub-phase inherits role model (§ 1.5), IC contracts (§ 3), audit / append-only discipline (§ 7.5 / § 10), checkpoint discipline (§ 8), problem-solving playbook (§ 9), and conventions (§ 10). It does NOT re-derive them.
> **Pre-conditions:** Spec-Phase-1 landed at `v0.1.0-phase-1` (SHA `afdf44a5`); landing audit at `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` (verdict-state CONFIRMED).
> **Date drafted:** 2026-05-20.
> **Status:** dispatch-ready.

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase is

This sub-phase takes **strange-attractors** and **mandelbulb-explorer** from spec-Phase-1's gates 1–3 (spec sheet + probe + failing tests) through gates 4–13 of spec § 3.5 (v2.4 expanded set). Per Phase 1 audit § 15, this pair is the smallest implementation surface and the right place to first exercise gates 4–13 + the per-sim implementation pipeline that subsequent per-sim sub-phases (agent-based, continuous-CA + sph-water, eulerian-smoke + lattice-boltzmann, mpm-multimaterial) will copy.

At close, both sims ship all 13 gates GREEN:

| # | Gate | Closed-form posture |
|---|---|---|
| 1–3 | Spec + probe + failing tests | already GREEN at Phase 1 close (this sub-phase's input contract) |
| 4 | Code verification | golden-value (no MMS for closed-form per spec § 6.1) |
| 5 | Tier 1 diagnostics | NaN/Inf scan |
| 6 | Tier 2 diagnostics | IC-7 (closed_form substack) |
| 7 | Cat 1 citations | spec-ref / algebraic citations resolve |
| 8 | Cat 2 public API | `<sim>.{reference,sim,invariants}` symbols resolve |
| 9 | Capture file | written under spec-Appendix-D § D.2.3 descriptor |
| 10 | Determinism declaration | bit-exact same-hw same-stack (no atomics / subgroup ops) |
| 11 | PBT invariants (≥ 2 per sim) | Hypothesis tests; invariants already declared in Phase 1 spec § 6.6 |
| 12 | Perf-ledger first row | appended to `docs/perf-ledger.md` per spec § 2.15 |
| 13 | Failing-tests replay | Phase 1 RED evidence still hashes; HEAD turns it GREEN |

### § 1.2 What this sub-phase is NOT

- A new spec-phase. The next spec-phase tag per spec § 7.12 is `v0.2.0-phase-2` (cross-stack replication); intermediate per-sim implementation work is sub-phase work that accumulates to `main` without a `-phase-N` tag (see § 5 + § 11.4).
- Implementation of any other Phase 1 sim. Agent-based pair, continuous-CA + sph-water, eulerian-smoke + lattice-boltzmann, mpm-multimaterial are subsequent per-sim implementation sub-phases per Phase 1 audit § 15.
- Cross-stack replication (Phase 2; spec § 11.3). Stack A → B is a Phase 2 target; this sub-phase ships Stack B only.
- Frontier variants (Phase 4; spec § 11.5) — Lyapunov-spectrum, neural surrogate flows, 2D variants.
- Editing any Phase 0 or Phase 1 artifact. Audit chain is append-only.
- Mutation-testing infrastructure rewrite (Phase 1 banked item B17): SCHEDULED at Stage 2 Step 2.7 with two acceptable paths (do it here, or re-bank to the next per-sim implementation sub-phase). The plan does not pre-decide which.

### § 1.3 Honesty caveats — assumptions Stage 0 will re-anchor

Drafted against HEAD = `9908565` (post-Phase-1 SHA back-fill). Working assumptions:

- Sim packages at `packages/strange-attractors/` and `packages/mandelbulb-explorer/` ship Phase-1-committed intentionally-empty `__init__.py` (`__all__: list[str] = []`).
- Failing tests at `packages/<sim>/tests/test_{determinism,diagnostics,*_golden,pbt_invariants}.py` import `<sim>.{reference,sim,invariants}` — those imports are this sub-phase's API target.
- Goldens at `tools/testkit/golden/tables/closed-form/{lorenz-structural,mandelbulb-de-samples}.json` carry Phase 1 derivations forward unchanged (independently anchored; the sim must produce values matching these — NOT regenerate them).
- IC-7 import path is doubled-directory: `tools.diagnostics.diagnostics.tier2.closed_form.checks` (Phase 1 shift #2).
- Canonical capture descriptors (spec Appendix D § D.2.3): `lorenz-trajectory-seed42-step10000` (strange-attractors/ref) and `de-probe-points-seed42` (mandelbulb-explorer/ref).
- PBT invariants declared in Phase 1 spec § 6.6:
  - strange-attractors: `lorenz_origin_volume_contraction`, `rk4_time_reversibility_modulo_dissipation`, `volume_contraction_rate_constant`.
  - mandelbulb-explorer: `de_lower_bound_property`, `map_p8_z_inversion_symmetry`.

Re-anchor drift → SHIFTED per Phase 1 playbook P1 / P14; HEAD wins.

### § 1.4 Role model

Inherits Phase 1 § 1.5 verbatim: one Claude Code agent at a time, one Claude.ai coordinator chat, one operator. Coordinator validates nothing substantively.

### § 1.5 Architecture — three stages

- **Stage 0 — Pre-flight.** Cross-phase audit replay against `v0.1.0-phase-1`; tolerance-budget carryover; re-verify Phase 1 failing-tests evidence sha256 (gate-13 precondition).
- **Stage 1 — Per-sim implementation.** Two sub-bundles, one commit each: strange-attractors first (simpler RK4 surface), mandelbulb-explorer second. Each sub-bundle covers gates 4–13 for that sim.
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive, integrity registries if any), integrity sweep (Cat 1/2/3/4/5/X), gate-13 replay verification per sim, mutation-score artifact (PATH-A or PATH-B), sub-phase landing audit, Convention #12 SHA back-fill. **No tag is prepared** — see § 5 + § 11.4 for the tag posture.

### § 1.6 State model

- **State 0** (= `v0.1.0-phase-1`): empty `<sim>.__init__`; failing tests RED; goldens committed; mutation baseline framework-validated-deferred (B17 banked).
- **State 1** (after Stage 0): tolerance-budget bumped to `sub-phase-closed-form`; Stage 0 checkpoint log.
- **State 2** (after Stage 1): both sims through gates 4–13 GREEN; two captures at `captures/<sim>-ref/`; two perf-ledger rows; Stage 1 checkpoint log.
- **State 3** (after Stage 2): CHANGELOG `[Unreleased]` additive entry under a new `### sub-phase-closed-form` heading (no semver section — no tag); mutation artifact at `tools/testkit/mutation/sub-phase-closed-form-<UTC>.json`; landing audit at `docs/_audits/phase-1/sub-phase-closed-form/landing-<UTC>.md`. No `-phase-N` tag pushed (see § 5 + § 11.4 for tag posture and the operator-decision bank).

---

## § 2. Deliverables (per sim, by gate)

| # | strange-attractors | mandelbulb-explorer |
|---|---|---|
| 4 | `test_lorenz_structural_golden.py` GREEN against `lorenz-structural.json` | `test_de_samples_golden.py` GREEN against `mandelbulb-de-samples.json` |
| 5 | Tier 1 NaN/Inf scan on canonical trajectory | Tier 1 NaN/Inf scan on DE-probe grid |
| 6 | `test_diagnostics.py` GREEN — IC-7 closed_form checks (`output_stability`, `precision_sensitivity`, `bound_preservation`) | same |
| 7 | spec-ref + algebraic citations resolve at HEAD | same |
| 8 | `strange_attractors.{reference,sim,invariants}` symbols expose Phase-2+ probe § 5 contract | `mandelbulb_explorer.{reference,sim,invariants}` symbols expose probe § 5 contract |
| 9 | `captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.{h5,json}` | `captures/mandelbulb-explorer-ref/de-probe-points-seed42.{h5,json}` |
| 10 | `test_determinism.py` GREEN — capture-twice-and-diff bit-exact | same |
| 11 | Hypothesis tests at `strange_attractors.invariants` for the 3 declared invariants | Hypothesis tests at `mandelbulb_explorer.invariants` for the 2 declared invariants |
| 12 | Row appended to `docs/perf-ledger.md` from `manifest.run.wall_clock_seconds` | same |
| 13 | Phase 1 evidence `strange-attractors-2026-05-20T12-54-18Z.txt` (sha256 `c4f72e25…cac63`) still matches; replay at SHA `9766498` reproduces the RED mode; HEAD GREEN | Phase 1 evidence `mandelbulb-explorer-2026-05-20T12-54-18Z.txt` (sha256 `d4a89d3e…2ca0`) — same |

Acceptance for "sub-phase complete": all 13 gates GREEN for both sims; Cat 1/2/3/4/5/X GREEN; mutation artifact committed; landing audit committed; SHA back-fill committed. **No `-phase-N` tag is pushed**; intermediate point-release tag (`v0.1.1`, no suffix) is a banked operator decision at Stage 2 close (§ 5 / § 11.4).

---

## § 3. IC contracts inherited (not redefined)

- **IC-2** (capture I/O Python) — `common_py.capture.Writer` writes the canonical capture.
- **IC-4** (determinism config Python) — `common_py.determinism.Config` plumbs seed.
- **IC-7** (Tier 2 closed_form checks) — `tools.diagnostics.diagnostics.tier2.closed_form.checks` consumed by `test_diagnostics.py`.
- **IC-8** (probe report) — `tools/testkit/probes/reports/<sim>.md` § 5 is the public-API contract this sub-phase implements against.
- **IC-9** (phase audit body) — this sub-phase's landing audit follows Phase 1 charter § 3.9 structure.
- **IC-10** (spec § 6 verification posture) — pinned at Phase 1; this sub-phase implements against it.

No new ICs. Stage 0 replay against the 8-gate set catches any consumed-surface drift.

---

## § 4. Stage decomposition

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay.**
  ```
  python3 -m integrity.scripts.replay_prior_phase \
    --prior-phase phase-1 \
    --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
    --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
  ```
  `phase-1` resolves to `v0.1.0-phase-1` via the Phase 1 hotfix to `_resolve_phase_handle` in `tools/integrity/integrity/scripts/replay_prior_phase.py`. The handle regex `^phase-(\d+)$` accepts only single-integer phase names; this sub-phase therefore does NOT mint a new phase handle (see § 11.4). Exit 0 → proceed. Exit 1 → BLOCKED (Phase 1 playbook P20); write `docs/_audits/phase-1/sub-phase-closed-form/stage-0-blocked-replay-<UTC>.md`.

- **Task 0.1 — Tolerance-budget carryover.** Edit `tools/testkit/equivalence/tolerance-budget.toml`: `[phase] phase = "sub-phase-closed-form"`, bump `opened_at`. NO widening (per spec § 2.6 a widening needs separate operator amendment). Commit: `chore(closed-form-stage0-tolerance-budget): sub-phase carryover from phase-1`.

- **Task 0.2 — Re-verify Phase 1 failing-tests evidence sha256.** Hash both `tools/testkit/failing-tests-evidence/strange-attractors-2026-05-20T12-54-18Z.txt` and `…/mandelbulb-explorer-2026-05-20T12-54-18Z.txt`; compare to the Phase 1 landing audit's recorded sha256s (`c4f72e25…cac63` and `d4a89d3e…2ca0`). Mismatch → BLOCKED (gate-13 precondition).

- **Closing.** `docs/_audits/phase-1/sub-phase-closed-form/stage-0-checkpoint-<UTC>.md` per IC-9 abbreviated structure. Front-matter MUST include both `head_sha:` and `head_sha_at_checkpoint:` (Phase 1 shift #19). Commit: `chore(closed-form-stage0-checkpoint): Stage 0 pre-flight complete`.

### § 4.2 Stage 1 — Per-sim implementation (one session per sim)

Order: **strange-attractors → mandelbulb-explorer**. Per sim, one commit covers all gates 4–13:

1. **Implement.** `<sim>.reference` (numerical reference per probe § 5), `<sim>.sim` (`sim_runner_seeded` matching `tools/testkit/determinism/`'s `SimRunner` Protocol), `<sim>.invariants` (Hypothesis tests). Symbol names from the probe's § 5 — NOT memory.
2. **Run `pytest packages/<sim>/tests/ -v`** → all 4 test files GREEN. Capture verbatim to `tools/testkit/failing-tests-evidence/<sim>-implemented-<UTC>.txt`; sha256 it. (The Phase 1 RED evidence file is untouched — it is the gate-13 anchor.)
3. **Produce canonical capture (gate 9).** Invoke `sim_runner_seeded` at spec-pinned seed/step count; write to `captures/<sim>-ref/<descriptor>.{h5,json}` via `common_py.capture.Writer` (IC-2; wraps Phase-0 `CaptureManifest` per Phase 1 shift #4). Descriptors per Appendix D § D.2.3.
4. **Determinism (gate 10).** Capture-twice-and-diff via `tools/testkit/determinism/`; bit-exact same-hw same-stack.
5. **PBT (gate 11).** Hypothesis tests for the invariants declared in spec § 6.6; commit `.hypothesis/` example database per spec § 2.14.
6. **Perf-ledger row (gate 12).** Append `(sim, numpy-reference, <descriptor>, <wall_clock_s>, <hw-id>, <sha>, <date>, baseline)` to `docs/perf-ledger.md`. Mirror Phase 0 RD-2D row's hardware-id format exactly.
7. **Gate-13 verification.** `git checkout 9766498 -- packages/<sim>/tests/`; `pytest`; sha256 the output; compare failure-mode (not full-text — pytest banners include timestamps per Phase 1 audit § 5b; load-bearing checks are sha256-of-on-disk-evidence + failure-mode reproduction). Restore HEAD; confirm GREEN.
8. **Commit.** `feat(closed-form-stage1-<sim>): implementation through gate 13`. Footer cites: Phase 1 RED evidence + sha256, new GREEN evidence + sha256, capture sidecar paths, perf-ledger wall_clock_seconds.

**Closing.** `docs/_audits/phase-1/sub-phase-closed-form/stage-1-checkpoint-<UTC>.md`. Body: per sim, the 13-row gate-status table + capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + any SHIFTED / banked items (B17 status). Commit: `chore(closed-form-stage1-checkpoint): Stage 1 per-sim implementation complete`.

### § 4.3 Stage 2 — Landing (single session if Stage 1 was clean)

- **Step 2.1 — Closing-commit anchor re-check** (Convention 7.9). Re-grep every concrete path / SHA / sha256 across this plan + both checkpoint logs + new spec § 5 deliverables + probe reports. Drift → SHIFTED addendum.

- **Step 2.2 — Test sweep.** Both closed-form sims GREEN at HEAD; Phase 0 RD-2D GREEN (regression); other 7 Phase 1 sims still RED with `ModuleNotFoundError` (unaffected); `tools/diagnostics`, `tools/testkit`, `tools/integrity` GREEN (per Phase 1 audit § 6 baseline).

- **Step 2.3 — Integrity sweep (Cat 1, 2, 3, 4, 5, X).** Cat 3 (golden-values) becomes live this phase: both closed-form goldens must be picked up. Phase 1 audit § 7 noted `_gather_tables` doesn't recurse into subdirectories — if the issue persists, extend it minimally and additively: `chore(closed-form-stage2-cat3-recurse): extend golden _gather_tables for closed-form subdir`. ≥ 0 HARD_FAIL across all cats for CONFIRMED.

- **Step 2.4 — Evidence-path verification.**
  ```
  for r in docs/_audits/phase-1/sub-phase-closed-form/*.md; do
      python3 -m integrity.scripts.verify_evidence --audit "$r" --strict || exit 1
  done
  ```
  Failure → HALTED-ON-EVIDENCE-FAIL.

- **Step 2.5 — Gate-13 replay verification per sim** (the v2.4 expansion's load-bearing post-implementation anchor). Re-run Stage 1 step 7 from the landing perspective; record both the Phase 1 RED replay outcome and the HEAD GREEN outcome as FACT in the landing audit.

- **Step 2.6 — Append-only check.** CI semantics: `grep -E '\.ledger\.md$'`; no edits to any file present at `v0.1.0-phase-1`. Phase 1 Stage 3 audits now in the append-only set.

- **Step 2.7 — Mutation-score artifact (B17 decision).**
  - **PATH-A** — rework `tools/testkit/mutation/` per-target runners; produce real per-target kill-rate baseline against spec § 2.13 thresholds (capture/determinism: ≥ 0.90; mms/golden/property: ≥ 0.80; equivalence: ≥ 0.85; cat4_draft_time: ≥ 0.90). Commit: `chore(closed-form-stage2-mutation-runners): per-target rewrite + first real baseline`.
  - **PATH-B** — produce framework-validated `tools/testkit/mutation/sub-phase-closed-form-<UTC>.json` with `sub-phase-closed-form` provenance; explicitly re-bank B17 to the next per-sim implementation sub-phase (agent-based). Commit: `chore(closed-form-stage2-mutation-baseline): framework-validated carry-forward + B17 re-bank`.
  Either path: record artifact sha256 in landing audit `evidence_hashes:`. Record decision rationale.

- **Step 2.8 — CHANGELOG additive entry.** Append `### sub-phase-closed-form` heading under the existing `[Unreleased]` section (no semver section is created; no tag is being proposed by this sub-phase). Itemize per-sim gate-13 GREEN-flip + capture descriptors landed + perf-ledger first-landing rows. Commit: `docs(closed-form-stage2-changelog): sub-phase-closed-form entry`.

- **Step 2.9 — Sub-phase landing audit.** `docs/_audits/phase-1/sub-phase-closed-form/landing-<UTC>.md` per IC-9 body (Phase 1 charter § 3.9), with the artifact slug `sub-phase-landing` (spec § 7.13 / Appendix-D front-matter schema `artifact: sub-phase`). Front-matter must include both `head_sha:` and `head_sha_at_checkpoint:`; `evidence_paths:` + `evidence_hashes:` enumerate both checkpoint logs + mutation JSON + both Phase 1 RED evidence files (FACT-tagged as still-matching) + both sub-phase GREEN evidence files + both capture sidecars. Verdict-state CONFIRMED. Commit: `chore(closed-form-stage2-landing-audit): sub-phase landing audit`.

- **Step 2.10 — Convention #12 SHA back-fill.** `git rev-parse HEAD` → replace placeholder; new commit. Never `--amend`. Commit: `chore(closed-form-stage2-sha-backfill): back-fill landing audit SHA per Convention #12`.

- **Step 2.11 — Final summary.** No `-phase-N` tag is proposed (spec § 7.12 reserves that form for spec-phase boundaries). Surface the optional `v0.1.1` point-release-tag decision to the operator as banked (§ 11.4); the agent does NOT push any tag. Surface to operator with the landing-audit path, gate-status table, and B17 / Cat-3 disposition.

---

## § 5. Dispatch — operator workflow

1. Commit this charter at `docs/phases/sub-phase-closed-form.md`.
2. Open coordinator Claude.ai chat with this charter attached; use Phase 1 § 6 coordinator prompt with the identity adjusted to "closed-form sub-phase coordinator chat" (running-log table per § 6 below).
3. Open Claude Code session; paste § 7.1 (Stage 0).
4. Fresh session per stage: § 7.2 (Stage 1) then § 7.3 (Stage 2). Continuation per Phase 1 § 8.3 if context tightens.
5. Operator reads landing audit; independently runs `verify_evidence.py`.

**Tag posture.** No `-phase-N` tag is proposed by this sub-phase. Spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries (N a single integer); the regex `_SEMVER_PHASE_TAG_RE` in `tools/integrity/integrity/scripts/replay_prior_phase.py` enforces this mechanically. The lean recommendation is **no intermediate tag at all** (cleaner phase-tag semantics; sub-phase commits + the landing audit provide the audit trail). An optional non-phase point-release tag `v0.1.1` (no `-phase-N` suffix) is a banked operator decision at landing; the agent never pushes any tag.

---

## § 6. Coordinator prompt

Inherits Phase 1 § 6 verbatim; identity reads "closed-form sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + evidence reverify | pending | — | — | — |
| 1 | strange-attractors implementation | pending | — | — | — |
| 1 | mandelbulb-explorer implementation | pending | — | — | — |
| 2 | integrity + replay sweep | pending | — | — | — |
| 2 | mutation artifact (PATH-A or PATH-B) | pending | — | — | — |
| 2 | CHANGELOG + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these **sub-phase conventions** (read before every stage; inherited from Phase 1 unless noted):

- Commit slug `chore`/`feat` + `closed-form-stage<N>-<scope>` (NOT a dotted-phase form; pre-commit rejected the dotted form in Phase 1 per shift #1; this sub-phase uses a non-phase slug since no `-phase-N` tag exists).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/` (shift #2).
- Stack B is pytest (shift #11). Goldens at `tools/testkit/golden/tables/<category>/` (shift #16).
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` (shift #19; `verify_evidence` requires `head_sha:`).
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256. FACT/INFERENCE tagging on every concrete claim.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit / golden / spec / probe committed at `v0.1.0-phase-1`.
- Convention #12 — never `--amend`. SHA back-fill is a follow-up commit.
- Operator-only tag-pushing per spec § 7.12; the agent NEVER runs `git tag` or `git push origin <tag>`.
- When stuck → Phase 1 charter § 9 playbook.

### § 7.1 Stage 0 — Pre-flight

```
You are the closed-form sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-closed-form.md (this sub-phase's charter — your source of truth). § 7 lists the standing orders and inherited conventions you must apply.
  2. docs/phases/phase-1-plan.md §§ 1.5, 3, 7.5/10, 8, 9 (the inherited spec-Phase-1 discipline).
  3. docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md (Phase 1 landing audit — your input contract; § 14 lists the 21 inherited shifts you must NOT propose corrections to).

Spec-Phase-1 landed at v0.1.0-phase-1 (SHA afdf44a5). Stage 0 is pre-flight only; you do NOT implement either sim.

Execute Tasks 0.0 → 0.1 → 0.2 → closing per sub-phase charter § 4.1 exactly. Specifically:

  Task 0.0 — Run replay_prior_phase against phase-1 with the 8-gate set (charter § 4.1 has the verbatim command). Exit 0 → proceed. Exit 1 → write docs/_audits/phase-1/sub-phase-closed-form/stage-0-blocked-replay-<UTC>.md per playbook P20; surface; stop.

  Task 0.1 — Bump tolerance-budget.toml's [phase] to "sub-phase-closed-form"; bump opened_at. Commit per charter § 4.1.

  Task 0.2 — sha256sum both Phase 1 failing-tests evidence files; compare to the values in the Phase 1 landing audit's evidence_hashes:. Mismatch → BLOCKED (gate-13 precondition).

  Closing — Commit docs/_audits/phase-1/sub-phase-closed-form/stage-0-checkpoint-<UTC>.md per IC-9 abbreviated structure (Phase 1 charter § 8.2). Front-matter: both head_sha: and head_sha_at_checkpoint:. Commit message per charter § 4.1. Surface to operator and stop.

Out of scope: any sim work; any edit outside tolerance-budget.toml + new audit files.
```

### § 7.2 Stage 1 — Per-sim implementation

```
You are the closed-form sub-phase Claude Code agent, Stage 1 (per-sim implementation) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-closed-form.md §§ 2, 3, 4.2, 7 (standing orders).
  2. docs/_audits/phase-1/sub-phase-closed-form/stage-0-checkpoint-<UTC>.md (Stage 0 pre-flight; replay PASS confirmed).
  3. PER SIM, before drafting that sim's bundle: docs/sim-specs/closed-form/<sim>/{spec-ref,algebraic,determinism,equivalence}.md, tools/testkit/probes/reports/<sim>.md (§ 5 is your API contract), packages/<sim>/tests/*.py (the GREEN target), tools/testkit/golden/tables/closed-form/<golden>.json (DO NOT modify; match its values).

Scope — two sims, in order:
  1. strange-attractors (simpler RK4 surface; first).
  2. mandelbulb-explorer (distance-estimator; second).

Per sim, deliver gates 4–13 in one sub-bundle commit per the 8-step sequence in sub-phase charter § 4.2:
  1. Implement <sim>.reference, <sim>.sim, <sim>.invariants per probe § 5.
  2. pytest packages/<sim>/tests/ -v → all GREEN; capture verbatim to tools/testkit/failing-tests-evidence/<sim>-implemented-<UTC>.txt + sha256. Phase 1 RED evidence at <sim>-2026-05-20T12-54-18Z.txt is UNTOUCHED (gate-13 anchor).
  3. Produce canonical capture via sim_runner_seeded at the spec-pinned seed/steps; write captures/<sim>-ref/<descriptor>.{h5,json} via common_py.capture.Writer (IC-2). Descriptors per spec Appendix D § D.2.3:
       strange-attractors: lorenz-trajectory-seed42-step10000
       mandelbulb-explorer: de-probe-points-seed42
  4. Determinism: capture-twice-and-diff via tools/testkit/determinism/ → bit-exact.
  5. PBT invariants per spec § 6.6 (3 for strange-attractors, 2 for mandelbulb-explorer); commit .hypothesis/ example DB per spec § 2.14.
  6. Perf-ledger row appended to docs/perf-ledger.md (mirror Phase 0 RD-2D row format exactly).
  7. Gate-13 verification: git checkout 9766498 -- packages/<sim>/tests/; pytest; sha256 the output; compare failure-mode (NOT full text — banners include timestamps per Phase 1 audit § 5b; load-bearing checks are sha256-of-on-disk-evidence + failure-mode reproduction). Restore HEAD; confirm GREEN.
  8. Commit: feat(closed-form-stage1-<sim>): implementation through gate 13. Footer cites Phase 1 RED evidence + sha256, new GREEN evidence + sha256, capture sidecar paths, perf-ledger wall_clock_seconds.

REPEAT for mandelbulb-explorer.

Closing — Commit docs/_audits/phase-1/sub-phase-closed-form/stage-1-checkpoint-<UTC>.md per IC-9. Body: per sim, 13-row gate-status table + capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + SHIFTED/banked items (especially B17 status). Front-matter: both head_sha: and head_sha_at_checkpoint:. Commit: chore(closed-form-stage1-checkpoint): Stage 1 per-sim implementation complete. Then stop.

Out of scope: modifying any Phase 1 artifact; implementing any other Phase 1 sim; touching convergence files (Stage 2 owns); reworking tools/testkit/mutation/ runners (that's Stage 2's B17 decision).

Stuck → Phase 1 charter § 9 playbook (P9, P10, P12, P14, P21 especially).
```

### § 7.3 Stage 2 — Landing

```
You are the closed-form sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-closed-form.md §§ 4.3, 7.
  2. docs/_audits/phase-1/sub-phase-closed-form/stage-0-checkpoint-<UTC>.md, docs/_audits/phase-1/sub-phase-closed-form/stage-1-checkpoint-<UTC>.md.
  3. docs/phases/phase-1-plan.md § 7.3 (your model for landing discipline), § 3.9 (IC-9 audit body).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A). Read the file first; append.

Execute Steps 2.1–2.11 per sub-phase charter § 4.3 exactly. The load-bearing items:

  Step 2.3 (integrity sweep, Cat 3 goes live) — if tools/testkit/golden/'s _gather_tables still doesn't recurse into closed-form/ subdirectory (Phase 1 audit § 7 / shift #16 noted this for deferral), extend it minimally and additively per the SHIFTED note. Commit: chore(closed-form-stage2-cat3-recurse): extend golden _gather_tables for closed-form subdir. If it already recurses correctly, no change.

  Step 2.5 (gate-13 replay per sim) — repeat Stage 1 step 7 from the landing perspective for both sims; record both Phase 1 RED replay outcomes and HEAD GREEN outcomes as FACT in the landing audit.

  Step 2.7 (mutation-score artifact, B17 decision) — choose PATH-A (rework runners + real baseline) or PATH-B (framework-validated carry-forward + re-bank to the next per-sim implementation sub-phase). Record decision and rationale in the landing audit. Either path: commit the artifact at tools/testkit/mutation/sub-phase-closed-form-<UTC>.json with sha256 in evidence_hashes:.

  Step 2.9 (sub-phase landing audit) — landing audit at docs/_audits/phase-1/sub-phase-closed-form/landing-<UTC>.md per IC-9, with front-matter artifact slug `sub-phase` per spec § 7.13 + Appendix-D schema. Front-matter MUST carry both head_sha: and head_sha_at_checkpoint: (Phase 1 shift #19). evidence_paths: + evidence_hashes: enumerate every artifact: both checkpoint logs; mutation JSON; both Phase 1 RED evidence files (FACT — still match Phase 1's recorded sha256); both sub-phase GREEN evidence files; both capture sidecars. Verdict-state CONFIRMED.

  Step 2.10 (SHA back-fill, Convention #12) — git rev-parse HEAD → replace placeholders; new commit. NEVER --amend.

  Step 2.11 (final summary) — NO -phase-N tag is proposed (spec § 7.12 reserves that form for spec-phase boundaries). Surface to operator: "Closed-form sub-phase landed at SHA <final>. Both closed-form sims now ship all 13 gates GREEN. Phase 0 RD-2D + Phase 1 infrastructure unaffected; other 7 Phase 1 sims still RED with ModuleNotFoundError pending their own per-sim implementation sub-phases. No -phase-N tag pushed; optional non-phase point-release tag (e.g., v0.1.1, no suffix) is a banked operator decision. Next sub-phase: agent-based pair (boids-3d + physarum) per Phase 1 audit § 15."

Stuck → Phase 1 charter § 9 playbook.
```

---

## § 8. Checkpoint and continuation discipline

Inherits Phase 1 § 8 verbatim. Paths:
- Stage 0 / Stage 1 checkpoints: `docs/_audits/phase-1/sub-phase-closed-form/stage-<N>-checkpoint-<UTC>.md`.
- Stage 2: the sub-phase landing audit itself (no separate checkpoint).
- Continuation prompt per Phase 1 § 8.3 with `closed-form-stage<N>-...` slug.

---

## § 9. Risk surface — sub-phase-specific

Beyond Phase 1 § 9 playbook (inherited):

- **R1 (gate 11 PBT framework).** Hypothesis is the spec § 2.14 canonical. `tools/testkit/property/strategies.py` is committed at Phase 1 close — re-anchor at Stage 1. Extend the per-sim `<sim>.invariants` module additively; do NOT modify testkit's strategies file.
- **R2 (gate 12 perf-ledger format).** Mirror Phase 0 RD-2D row exactly (hardware_id format especially).
- **R3 (gate 13 replay reproducibility).** Per Phase 1 audit § 5b, full pytest-output bit-equality is NOT achievable across replay (banners include timestamps). Load-bearing checks are sha256-of-on-disk-evidence + failure-mode reproduction.
- **R4 (B17 PATH-A vs PATH-B).** Phase 1 audit § 13 recommended continuous-CA implementation phase as owner; closed-form is simpler so either path is defensible. Stage 2 Step 2.7 decides at dispatch time.
- **R5 (Cat 3 `_gather_tables` non-recursion).** Phase 1 shift #16 explicitly defers the subdirectory pickup to the per-sim implementation phase. Surface at Stage 2 Step 2.3; fix additively if needed.
- **R6 (sim_runner Protocol drift).** Re-anchor `tools/testkit/determinism/`'s `SimRunner` Protocol at Stage 1 step 1; HEAD wins on drift (playbook P14).

---

## § 10. Audit-trail discipline

Inherits Phase 1 § 10 verbatim. Sub-phase audits live under `docs/_audits/phase-1/sub-phase-closed-form/` (nested under the parent phase's audit dir per spec line 1655's `phase-N/` convention; spec line 1654 records the same nesting precedent for Phase 5's sub-phases). Convention #12 SHA back-fill applies to the Stage 2 landing audit (never `--amend`). Append-only check at Stage 2 Step 2.6 forbids edits to any file present at `v0.1.0-phase-1` (Phase 1 Stage 3 audits now in the protected set).

Audit front-matter `artifact:` field uses the value `sub-phase` (spec § 7.13 / Appendix-D canonical schema's `block | stage | task | wu | sub-phase | phase-landing` enum). Stage 0 and Stage 1 checkpoint audits use `artifact: stage` (`artifact_id: closed-form-stage-0` / `closed-form-stage-1`); the Stage 2 landing audit uses `artifact: sub-phase` (`artifact_id: sub-phase-closed-form`).

---

## § 11. Sub-phase coherence

### § 11.1 Phase 1 → this sub-phase (inputs)

Verified by Stage 0 Task 0.0 replay against the 8-gate set:

- Both closed-form TDD bundles (5 spec docs + 1 probe + 4 failing tests per sim).
- Goldens at `tools/testkit/golden/tables/closed-form/{lorenz-structural,mandelbulb-de-samples}.json` with ≥ 3 independent-reference anchors per spec § 2.4.
- IC-2 / IC-4 / IC-7 infrastructure (common_py + tier2/closed_form).
- The 21 Phase 1 shifts (Phase 1 audit § 14) — baseline reality; do NOT propose corrections.

### § 11.2 Banked items inherited

- **B17** (per-target mutation runners + first real kill-rate baseline). Stage 2 Step 2.7 makes PATH-A vs PATH-B decision.
- **Cat 3 `_gather_tables` non-recursion** (shift #16). Stage 2 Step 2.3 surfaces and resolves.

### § 11.3 This sub-phase → subsequent per-sim sub-phases (outputs)

- Both closed-form sims through 13 gates GREEN — equivalence baseline for Phase 2 cross-stack (Stack A port) and Phase 4 frontier variants.
- Two new canonical captures land in `captures/` per Appendix D § D.2.3 — first-class entries in the legacy-capture corpus for Phase 4 schema-bump round-trip.
- The implementation pipeline (Stage 0 replay → Stage 1 per-sim → Stage 2 landing) is exercised at smallest surface; the next per-sim implementation sub-phase (agent-based pair: boids-3d + physarum per Phase 1 audit § 15) inherits the pattern.
- B17 either resolved (PATH-A) or re-banked to the next sub-phase (PATH-B); Cat 3 recursion likewise.

### § 11.4 Replay-chain non-participation + tag posture

This sub-phase does NOT participate in the cross-phase replay chain. The next spec-phase pre-flight (spec-Phase-2 Stage 0 Task X.0; see `docs/phases/phase-2-cross-stack-replication.md`) replays against `v0.1.0-phase-1`, NOT against any intermediate sub-phase tag. The replay resolver's regex `^phase-(\d+)$` (single integer) and `^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$` (single integer N in the tag) at `tools/integrity/integrity/scripts/replay_prior_phase.py` mechanically prevent multi-segment or suffixed phase tags from resolving — so even an erroneously-pushed `v0.1.1-phase-1-1-closed-form` tag would not be a valid prior-phase handle.

What protects this sub-phase's work across the gap to spec-Phase-2 is spec § 3.5 gate 13 (failing-tests replay verifiable): the Phase 1 failing-tests-evidence sha256s must continue to match at the `v0.1.0-phase-1` commit even after the implementations land here. Implementations consume the bootstrap tests as the GREEN target; they do not modify the failing-tests-evidence files (untouched per Stage 1 step 2). Stage 2 Steps 2.5–2.6 verify this discipline before declaring CONFIRMED.

**Tag-posture decision banked for operator at Stage 2 close:**

- **Lean recommendation: no intermediate tag.** Sub-phase commits accumulate to `main`; the landing audit + per-sim commits provide the audit trail. Cleanest phase-tag semantics; spec § 7.12 stays unambiguous.
- **Alternative: non-phase point-release tag `v0.1.1`** (no `-phase-N` suffix). Distinguishes this sub-phase landing in `git log` without overloading the spec's phase-tag form. Acceptable per spec § 7.12 (the prohibition is on agent-pushed `v*-phase-*`, not on operator-pushed non-phase tags). If chosen, operator pushes after landing-audit review.
- **Forbidden either way:** any tag carrying `-phase-N` (single or multi-segment). Reserved for spec-phase boundaries.

---

*End of closed-form sub-phase charter. Inherits Phase 1's role model, audit discipline, conventions, IC contracts, and problem-solving playbook wholesale; adds gates 4–13 implementation for the closed-form pair as the first per-sim implementation sub-phase under spec-Phase-1, establishing the pipeline subsequent per-sim sub-phases follow.*

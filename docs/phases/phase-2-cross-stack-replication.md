# Phase 2 — Cross-Stack Replication

> **Repo:** `Bit-Physics` (`git@github.com:StevenFAU/Bit-Physics.git`).
> **Owner:** Steven Cohen (GitHub: `StevenFAU`).
> **Spec anchor:** `docs/architecture.md` (v2.4; originally drafted as `gpu-sims-design-spec-v2.md`) (2026-05-18) + spec Appendix D + spec Appendix G + spec Appendix E.
> **Document type:** Phase plan with three concerns held equal — *architecture* (§1.9 — the socket-level interface specs each stage implements to), *coordination* (§1.4, §2.1 — sequential stage queue and coordinator queue-management), *logistics* (§§1.5–1.8, §2.2–2.12 — acceptance criteria, conventions, decision rules, per-stage prompt template + stage data blocks, landing prompt).
> **Drafted:** 2026-05-17 (v1); 2026-05-18 (v4 amendments); 2026-05-18 (v5 dispatch-hardening pass).
> **Authoring posture:** FACT statements are grep-verifiable against the spec (`/docs/architecture.md` once landed). INFERENCE statements are reasoning over FACTs and are tagged. Path-specific repo claims are *anchor sketches* per Convention-K — they must be re-verified against repo HEAD at each stage's start (Task X.1).
> **Sockets-and-wires principle.** Sequential stages still need well-defined interfaces between producer and consumer — Stage 0's common-warp surface is consumed by Stages 5, 7, 8; per-stage capture files are consumed by Stage 9 (landing)'s equivalence sweep. §1.9 specifies these interfaces (common-warp public API, per-port directory shape, capture file naming, equivalence harness invocation). Stages implement the interfaces; Stage 9 verifies them cross-cuttingly. Socket deviations are not stage-overrideable (see §1.9.7).
> **Stance:** This document is front-loaded so that the single-agent dispatch can execute against well-defined boundaries without re-deriving architecture, ordering, or acceptance criteria. The coordinator's job is queue management — dispatch the phase opener, receive stage-close reports, surface BLOCKED to founder, dispatch continuation sessions on context-fill — not validation or re-architecture.

> **v6 verification-hardening amendments (May 18 2026, post-design-spec v2.4):** This block supersedes any earlier text in this document that conflicts with it.
>
> **CROSS-PHASE AUDIT REPLAY (Stage 0 Task X.0):** Stage 0's first action — before any other task — is `python -m integrity.scripts.replay_prior_phase --prior-phase phase-1 --audit docs/_audits/phase-1/landing-<UTC>.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`. Discrepancy → BLOCKED; surface to operator; do not begin Stage 0 work. Per spec § 7.5 and Appendix G.7.
>
> **GATE COUNT EXPANDED FROM 11 TO 14:** Per spec § 3.5 (v2.4 amendment expanding 10 → 13 gates) plus this phase's cross-stack equivalence gate (gate 14 = original gate 11). The eleven-gate acceptance criteria in §1.5.1 below is REPLACED by fourteen gates; see §1.5.1 amendment block.
>
> **FAILING-TESTS OUTPUT HASH:** Phase 1's TDD-bootstrap commits already include the output hash in their footers (per Phase 1 R9 amendments). Phase 2's per-port stages re-verify Gate 3 by replaying one randomly-sampled sim's failing-tests commit (when applicable) and confirming the hash matches the in-repo evidence file. If a per-port stage authors NEW failing tests (Stages 0, 1–8 do not — they consume Phase 1's tests; cross-stack ports re-use the same test surface where possible), the same discipline applies: capture verbatim output, sha256 in commit footer.
>
> **TOLERANCE-BUDGET DISCIPLINE (LOCKED):** Per spec § 2.6 + Phase 0 v0.11 amendment, `tolerance-budget.toml` caps per-category cross-stack tolerance. Phase 2 inherits Phase 1's tolerance budget. Per-sim overrides in `tolerance.toml` that exceed budget triggers Cat-X HARD_FAIL. Any genuine widening requires a SEPARATE operator-approved commit named `chore(tolerance-budget): amend <category>.<axis> from <old> to <new>` with a justification audit at `docs/_audits/tolerance-budget-amendments/<UTC>.md`. The amendment commit is gated on owner-approval; the agent NEVER amends the budget unilaterally. This is the load-bearing mitigation against "tolerance shopping under deadline pressure" (Risk P2-β was already named in §3.1.10; v6 elevates it from convention to mechanism).
>
> **PERFORMANCE-LEDGER ROW PER PORT:** Each per-port stage's deliverable adds a row to `docs/perf-ledger.md` with `(sim, target-stack, descriptor, wall_clock_seconds, hardware_id, commit_sha, date)`. Per spec § 2.15. The closing audit (Stage 9) reads the ledger and flags any port that's >2× slower than the source stack's first-landing baseline; flagged ports surface to owner. **(S2-RD2C1 / cleanup § 13 #30):** the perf-ledger row is a **Stage-1b acceptance check** — a Stage-1b close MUST verify the row exists, not defer it to Stage 2. (At RD-2D-Stack-C the row was silently omitted at Stage 1b and only restored at Stage 2; "gates 4–13 GREEN" did not catch the missing gate-12 row.)
>
> **MUTATION-TESTING THRESHOLD:** Phase 2 lands new common-warp code at Stage 0; the module is subject to spec § 2.13 thresholds (≥ 80% for new code). Stage 0's acceptance includes producing the mutation-score JSON; Stage 9 verifies no regression below thresholds.
>
> **PHASE-PLAN REVIEW (Convention E-addendum):** Phase 2 is the highest-stakes plan in the portfolio (its outputs are preconditions for Phase 4's frontier work). Per spec § 7.4, a phase-plan review pass by a different Claude session is mandatory before dispatch. The review audit lands at `docs/_audits/phase-2/pre-dispatch-review-<UTC>.md` with verdict CONFIRMED / SHIFTED / REFUTED / BLOCKED. Dispatch is gated on CONFIRMED or SHIFTED-with-acceptable-deltas. The owner runs the review session.
>
> **OPERATOR-ONLY TAG PUSHING:** Stage 9's closing report ends with `Tag pushed: NO (operator action required)`. The agent does not run `git tag` or `git push origin <tag>`. The operator pushes `v0.2.0-phase-2` after independent review.
>
> **EVIDENCE-PATH VERIFICATION:** Every per-stage report carries `evidence_paths:` plus `evidence_hashes:` for non-trivial evidence files (capture sidecars, mutation-score JSON, perf-ledger row commits). Stage 9 runs `verify_evidence.py` against every stage report; failure → REFUTED.
>
> **APPEND-ONLY CHECK:** Stage 9 includes the append-only check against `v0.1.0-phase-1` (no Phase 1 audit file may be edited or shortened in Phase 2).
>
> **SCHEMA-CORPUS GROWTH:** Each per-port stage that produces a capture appends a placeholder/real entry to `tests/fixtures/legacy-captures/` so Phase 4 WU-A's schema bump round-trips it. Pattern: `tests/fixtures/legacy-captures/phase-2-<sim>-<stack>.h5` + `.json` sidecar.

> **v5 dispatch-hardening amendments (May 18 2026):** This block supersedes any earlier text in this document that conflicts with it.
>
> **TRUNK-BASED DEVELOPMENT (LOCKED):** All references to `phase-2/working` branch, `origin/phase-2/working`, "merge to main", "fast-forward merge", and any PR/branch ceremony are SUPERSEDED. Every commit goes directly to `main` per spec § 7.12. Stage 9 is a closing audit ONLY (no merge step). The phase-landing commit is tagged `v0.2.0-phase-2`. Throughout §§ 1.4, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3–2.11, 2.12, wherever the document says `phase-2/working`, read `main`. Wherever it says `origin/phase-2/working`, read `origin/main`. Wherever it says "merge to `main`", read "commit directly to `main`". An agent encountering a branch-ceremony instruction in this document SHOULD follow the trunk-based version per this amendment.
>
> **COMMON-WARP TIMING (LOCKED):** common-warp module is bootstrapped in **Phase 2 Stage 0** (per this plan's existing default). The alternative reading of "back-date to Phase 1.8" is REJECTED. Phase 3 task-9 matures common-warp; Phase 4 WU-* extends specific submodules. Founder-decision item 1 in § 3.4.2 is RESOLVED.
>
> **SINGLE-AGENT DISPATCH:** One coordinator chat + one Claude Code agent role for the whole phase. The agent runs auto-accept; reads this whole plan; works through Stages 0 → 9 sequentially; reports at each stage close to the coordinator. Context-spanning sessions supported via `docs/_audits/phase-2/progress.md` continuation cues per spec Appendix D § D.10. The coordinator's role: dispatch the phase opener once; dispatch continuation sessions on context-fill; surface BLOCKED reports to the owner.
>
> **ACTION #1:** Every Claude Code session in this phase starts with `python tools/dispatch/preflight-phase.py 2`. Exit 0 → proceed. Exit 1 → BLOCKED, end session.
>
> **CAPTURE DESCRIPTORS:** Locked per spec Appendix D § D.2.3. §1.9.3's existing descriptor table matches and is now a normative pointer; no per-stage descriptor invention.
>
> **OTHER LOCKED ITEMS** (carried forward from v4):
> 1. C++ namespace per spec § 7.11: `bit_physics::common_cpp::` (and `bit_physics::*` for other top-level namespaces).
> 2. Capture-location convention per spec § 2.7: `captures/<sim>-<variant-or-ref>/<descriptor>.h5` at repo root.
> 3. Schema-version write extension per spec § 2.7: `common_warp.capture.write_capture` accepts any version ≤ build's max-supported; default is highest.
> 4. Audit-file paths per spec § 8.1: `docs/_audits/phase-2/<artifact>-<UTC>.md`.
> 5. Report front-matter per canonical YAML schema (spec § 7.5 + spec Appendix G § G.7).
>
> The v4 review amendment block below is retained for changelog tracking; conflicts with v5 above are resolved in favor of v5.

> **v4 review amendments (apply before dispatch):**
>
> 1. **Branch model superseded by spec § 7.12 trunk-based development.** This plan's `phase-2/working` long-lived feature branch model (§1.4.4) is superseded; each stage commits directly to `main` with phase tag `v0.2.0-phase-2` at landing. Stage 9 is a closing audit only — no merge step. References to `phase-2/working` in §1.4, §1.6, §1.7, §2 templates, and §3.5 should be read as "directly to `main`".
> 2. **C++ namespace updated per spec § 7.11.** Throughout this plan, `gpusims::*` references have been find-replaced to `bit_physics::*`.
> 3. **Capture-location convention adopted per spec § 2.7.**
> 4. **Schema-version write extension per spec § 2.7.**
> 5. **Audit-file paths standardized per spec § 8.1.**
> 6. **Report front-matter per canonical YAML schema (spec § 7.5).**
> 7. **Single-agent dispatch (May 18 2026 amendment).**

---

## Reading guide

Three audiences read this document:

- **The coordinator (Claude.ai chat).** Reads Part 1 in full; uses Part 2 §2.1 (coordinator prompt) as the kickoff context for the coordinator chat itself; uses Part 2 §2.2 (per-stage template) plus the corresponding §2.3–§2.11 stage data block to dispatch each work stage in sequence; uses Part 2 §2.12 to dispatch Stage 9 (landing) once Stages 0–8 have completed.
- **Each Claude Code stage session (Stages 0–8).** Reads Part 1 in full; reads its assembled prompt (from §2.2 template + §2.3–§2.11 stage data); executes the 8-task workflow; reports back per §1.7.
- **The Stage 9 (Landing) session (Claude Code).** Reads Part 1 in full; reads Part 2 §2.12 (landing prompt); reads each prior stage's report on `phase-2/working`; executes the closing audit + merge to `main`.

Part 3 is reference material — risk taxonomy, audit-trail discipline, FACT/INFERENCE inventory — that any of the above can dip into.

---

## Table of contents

- **Part 1 — Shared context and phase architecture** (every chat reads in full)
  - §1.1 What Phase 2 is
  - §1.2 Preconditions: what must be true before Phase 2 can execute
  - §1.3 Scope and deliverables (incl. §1.3.4 Phase-fit verification — downstream consumers)
  - §1.4 Sequential stage decomposition: stages, touch sets, branch model
  - §1.5 Per-replication acceptance criteria (Layer 4 thirteen gates + cross-stack equivalence = fourteen, v6 amendment; was eleven pre-v6)
  - §1.6 Convention discipline reminders
  - §1.7 Report-back format (structured for verbatim coordinator copy)
  - §1.8 Front-loaded autonomy and decision rules (Rules P1–R3 — what a stage does when stuck)
  - §1.9 Phase architecture — sockets and wires (interface specifications each stage implements to)
- **Part 2 — The prompts** (copy-paste targets)
  - §2.1 Coordinator initial prompt — *(Claude.ai session, runs the queue)*
  - §2.2 Per-stage prompt template *(parameterized; coordinator substitutes per-stage data)*
  - §2.3 Stage 0 — `common-warp` bootstrap
  - §2.4 Stage 1 — RD-2D → Stack C / Vulkan
  - §2.5 Stage 2 — RD-2D → Stack D / Taichi
  - §2.6 Stage 3 — SPH-water → Stack D / Taichi
  - §2.7 Stage 4 — Eulerian-smoke → Stack D / Taichi
  - §2.8 Stage 5 — Eulerian-smoke → Stack E / Warp
  - §2.9 Stage 6 — LBM-D3Q19 → Stack D / Taichi
  - §2.10 Stage 7 — LBM-D3Q19 → Stack E / Warp
  - §2.11 Stage 8 — MPM-multimaterial → Stack E / Warp *(heaviest port; Phase 4 critical-path)*
  - §2.12 Stage 9 — Landing — *(Claude Code session, post-stage-8)*
- **Part 3 — Reference**
  - §3.1 Risk taxonomy and mitigations (updated for serial execution model)
  - §3.2 Audit-trail discipline for Phase 2
  - §3.3 FACT vs INFERENCE inventory for this document
  - §3.4 Confidence inventory — spec v2.0 audit
  - §3.5 Open questions and known unknowns *(separates INFERENCE from UNKNOWN; rule-of-three pattern detection at §3.5.4)*
  - §3.6 Industry / academic standards anchored *(verified citations for verification regimes)*
- **Part 3 — Reference**
  - §3.1 Risk taxonomy and mitigations
  - §3.2 Audit-trail discipline for Phase 2
  - §3.3 FACT vs INFERENCE inventory for this document
  - §3.4 Confidence inventory — spec v2.0 audit (read this section if nothing else)

---

# Part 1 — Shared context

## §1.1 What Phase 2 is

**FACT (spec §11.3):** Phase 2 is "Cross-stack replication. Parallel per sim. For sims that warrant cross-stack presence, replicate." Work items:

- 2.1 RD-2d to Stack C, Stack D.
- 2.2 SPH to Stack D (Taichi reference port).
- 2.3 MPM to Stack E (Warp port).
- 2.4 Smoke to Stack D and Stack E.
- 2.5 LBM to Stack D and Stack E.

Equivalence gates land per replication. Estimated duration: 2–4 months parallel.

**FACT (spec §3.6, Layer 5):** "For each Layer 4 reference, replicate to additional stacks where category logic warrants. Equivalence is a test, not an aspiration: the cross-stack equivalence harness runs in CI and gates the second-stack merge."

**FACT (spec §3.7):** Variants live as siblings of the reference. Directory pattern: `<category>/<sim-name>/ref-stack-<X>/` for a replication to Stack X.

**INFERENCE:** Phase 2's value is twofold. First, it forces the cross-stack equivalence harness from a hypothesis (Phase 0/1 stub) into a real CI gate exercised by eight concrete sim pairs. Second, it introduces Stack E (Warp) to the portfolio for the first time, opening the path to every Layer 6 differentiable-Warp variant in Phase 4. The first move is the bulk of Phase 2; the second is the prerequisite that makes Phase 2 possible at all.

**Founder-decision item flagged in §3.4.2 Item 1 — common-warp timing.** Spec §11.4 item 3.7 says "common-warp matures" in Phase 3, but Phase 2's items 2.3/2.4/2.5 require Stack E ports. This document's default resolution is to add a Stage 0 to Phase 2 that bootstraps a minimal common-warp; Phase 3.7 then matures it. The alternative — back-dating common-warp to Phase 1.8 — is feasible if the founder prefers and removes the need for Stage 0 entirely (Phase 2 shrinks to 9 stages, with Stages 5/7/8 consuming common-warp from Phase 1). See §3.4.2 for the override mechanics.

## §1.2 Preconditions — what must be true before Phase 2 can execute

This section is shared-reference scope-setting. It documents what must be true for Phase 2 to make sense. The coordinator does not verify these; each stage verifies the subset relevant to its scope at its start (Task X.1 re-anchor probe). If a stage's start-probe surfaces a precondition failure, the stage reports BLOCKED; the coordinator surfaces the report to the founder per §1.2.6. The founder is expected to have confirmed Phase 0 and Phase 1 are done before Phase 2 dispatches; this section catches the residual cases where Phase 1 work shifted subtly between sign-off and Phase 2 kickoff.

The probe commands below are shown as the canonical checks each stage's Task X.1 runs. They are written here once for shared reference; each stage's prompt indicates which subset its Task X.1 executes.

### §1.2.1 Phase 0 preconditions (testkit + integrity + diagnostics)

**FACT (spec §3.1, Layer 0 acceptance criteria):** Layer 0 is operational when:

- Capture format spec landed, frozen at v1.0.0.
- One manufactured solution implemented end-to-end (heat equation 1D recommended).
- One golden-value table generated and verified (cubic spline kernel recommended).
- Determinism harness runs against a stub simulator with a green report.
- Equivalence harness runs across two stub stacks with a diff report.
- One upstream vendored end-to-end (SPlisHSPlasH recommended).
- Pre-implementation probe template exists with one example report committed.

**FACT (spec §3.2, Layer 1):** Cat 1, Cat 2, Cat 3, Cat 4, Cat 5 integrity checks operational. HARD_FAIL mapping in place for Cat 1, Cat 2, Cat 4.

**FACT (spec §3.3, Layer 2):** Tier 1 diagnostics (NaN/Inf, energy/mass/momentum conservation, wall-clock, GPU dispatch counts, memory high-water marks, determinism extension) operational. At least one Tier 2 substack operational.

**Probe (anchor sketch — each stage's Task X.1 runs the subset relevant to its scope):**

```bash
# Probe 1: Testkit operational
ls tools/testkit/schemas/capture-v1.json                # FACT-or-fail
ls tools/testkit/code_verification/mms/runner.py        # FACT-or-fail
ls tools/testkit/golden/tables/       # FACT-or-fail (non-empty)
ls tools/testkit/determinism/harness.py                 # FACT-or-fail
ls tools/testkit/equivalence/harness.py                 # FACT-or-fail
ls tools/testkit/equivalence/tolerance.toml             # FACT-or-fail
ls tools/testkit/probes/template.md                     # FACT-or-fail

# Probe 2: Integrity toolkit operational
ls tools/integrity/integrity/cat1_citations/            # FACT-or-fail
ls tools/integrity/integrity/cat2_contracts/            # FACT-or-fail
ls tools/integrity/integrity/cat3_numerical/            # FACT-or-fail
ls tools/integrity/integrity/cat4_draft_time/           # FACT-or-fail
ls tools/integrity/integrity/cat5_provenance/           # FACT-or-fail
python -m integrity --check-all --against HEAD          # exit 0

# Probe 3: Diagnostics toolchain operational
ls tools/diagnostics/tier1/                             # FACT-or-fail
ls tools/diagnostics/tier2/                             # FACT-or-fail (≥1 substack)
```

### §1.2.2 Phase 1 preconditions (reference sims)

**FACT (spec §11.2, Phase 1):** Reference sims that Phase 2 replicates from must be Phase 1-complete:

- 2.1 source: `reaction-diffusion-2d` on Stack A→B (per §5.2.1).
- 2.2 source: `sph-water` on Stack C (per §11.2 item 1.4).
- 2.3 source: `mpm-multimaterial` on Stack D (per §11.2 item 1.5).
- 2.4 source: `eulerian-smoke` on Stack C (per §11.2 item 1.6).
- 2.5 source: `lattice-boltzmann-d3q19` on Stack C (per §11.2 item 1.7).

**FACT (spec §3.5 v2.4 thirteen-gate, expanded from ten in v2.4):** Each source sim must, at the time Phase 2 begins, have its in-scope Layer 4 gates passing. Per spec § 3.5 v2.4 expansion + R9 amendment, Phase-1-sourced sims back-fill the new gates 11–13 (PBT, perf-ledger, failing-tests replay) at Phase 2 open as part of the equivalence-readiness pass. The full list:

1. Spec sheet committed with §6 verification posture filled in (including PBT invariant declarations per § 2.14).
2. Pre-implementation probe report committed.
3. Acceptance test suite committed, passing, with failing-tests output hash recorded per § 1.3 step 4.
4. MMS / golden-value tests pass (Cat 3), with ≥ 3 independent-reference anchors per golden table per § 2.4.
5. Tier 1 diagnostics pass.
6. Category-specific Tier 2 diagnostics pass.
7. Citation chain resolves (Cat 1).
8. Public API resolves (Cat 2).
9. Capture file produced by the sim, testkit-replayable.
10. Determinism declaration consistent with capture file.
11. PBT invariants pass (≥ 2 per sim per § 2.14).
12. First-landing wall-clock recorded in `docs/perf-ledger.md` per § 2.15.
13. Phase-closing audit can replay the pre-implementation commit's failing tests and confirm the recorded output hash matches.

Sims sourced from Phase 1's TDD bootstrap that haven't yet had a subsequent implementation phase produce gates 4–13 are out of scope for Phase 2 ports (they would have no source capture to diff against). Phase 2's Stage 0 cross-phase replay (v6 Task 0.0) confirms the prior phase landed these gates per its landing audit.

**Probe (anchor sketch — each stage's Task X.1 runs the subset relevant to its scope):**

For each source sim path `<sim-path>` (e.g., `continuous-ca/reaction-diffusion-2d/ref/`, `particle-fluid/sph-water/ref/`, etc.):

```bash
# Per source sim
ls <sim-path>/                                          # FACT-or-fail (sim exists)
ls docs/sim-specs/<category>/<sim>/spec-ref.md          # FACT-or-fail (spec sheet)
ls tools/testkit/probes/reports/<sim>-probe.md          # FACT-or-fail (probe report)
ls captures/<sim>-ref/*.h5                              # FACT-or-fail (capture exists)
python -m integrity --check sim:<sim>                   # exit 0 (all five Cats pass)
```

**Anchor sketch note:** The exact paths for capture files, spec sheets, and probe reports follow the spec's directory conventions (§3.1, §8.1) but the live-repo paths must be re-verified — Phase 0 / Phase 1 may have made small naming refinements the coordinator's probe will catch.

### §1.2.3 Common module preconditions

**FACT (spec §11.2 item 1.8):** Phase 1 matures `common-ts`, `common-cpp`, `common-py` "at minimum." Phase 2 needs:

- `common/common-cpp/` — consumed by Stage 1 (RD-2d→C; Phase 1 already requires it for sims 1.4, 1.6, 1.7, so it must be mature).
- `common/common-py/` — consumed by every Stack D port (Stages 2, 3, 4, 6 — spec items 2.1.D, 2.2.D, 2.4.D, 2.5.D). Phase 1 requires it for sim 1.5 mpm-multimaterial.
- `common/common-warp/` — **NOT yet mature.** Spec §11.4 item 3.7 says common-warp "matures" in Phase 3. This document's resolution (INFERENCE; see §3.4.2 Item 1 for the contradiction): Stage 0 in Phase 2 produces a minimal common-warp sufficient for the three Stack E sim ports; Phase 3.7 then extends and polishes. If the founder back-dates common-warp to Phase 1.8, Stage 0 is removed and the stage queue shrinks to 9 stages.

**Probe (anchor sketch — each stage's Task X.1 runs the subset relevant to its scope):**

```bash
ls common/common-cpp/                                   # FACT-or-fail
ls common/common-py/                                    # FACT-or-fail
ls docs/common/cpp.md                                   # FACT-or-fail (API spec)
ls docs/common/py.md                                    # FACT-or-fail (API spec)

# common-warp NOT expected to exist yet — its absence is the
# precondition for Stage 0's existence in the stage queue.
test ! -d common/common-warp/                           # FACT-or-Agent-W-redundant
```

### §1.2.4 Vendored-reference preconditions

**FACT (spec §2.8):** Every upstream cited by any Phase 2 replication must be vendored under `references/<UpstreamName>/` with a TOML manifest containing version, SHA, license, scope.

Expected vendored upstreams for Phase 2 (anchor sketch — names from spec §11.1 and §11.2):

- `references/SPlisHSPlasH/` — used by Stage 3 (spec item 2.2.D) for SPH kernel implementations.
- `references/MLS-MPM/` or equivalent — used by Stage 8 (spec item 2.3.E) for MPM reference.
- `references/Stam-stable-fluids/` or equivalent — used by Stages 4 and 5 (spec items 2.4.D, 2.4.E) for advection-projection split.
- `references/Krüger-LBM/` or equivalent — used by Stages 6 and 7 (spec items 2.5.D, 2.5.E) for D3Q19 collision-streaming.

If any expected vendored upstream is missing, the corresponding stage's probe surfaces it; the coordinator escalates rather than instructing the stage to vendor inline.

### §1.2.5 Equivalence-harness tolerance table preconditions

**FACT (spec §2.6):** A default tolerance table is committed at `tools/testkit/equivalence/tolerance.toml`. Phase 2 adds per-sim override entries when a replication's tolerance differs from category default.

**Probe (anchor sketch — each stage's Task X.1 runs the subset relevant to its scope):**

```bash
ls tools/testkit/equivalence/tolerance.toml             # FACT-or-fail
# Confirm at minimum these categories have default entries:
grep -E 'reaction-diffusion|sph|mpm|stam|lbm' tools/testkit/equivalence/tolerance.toml
```

If category-default entries are missing for any Phase 2 replication's category, Stage 9 (landing) adds them as part of the convergence-file final polish (see §2.12 Task L.3).

### §1.2.6 Precondition failure protocol

Preconditions are not centrally verified before dispatch. If a stage's Task X.1 re-anchor probe surfaces a precondition failure (a path that should exist does not; a module the stage consumes is missing; a vendored upstream is absent), the stage:

1. Files an audit report at `docs/_audits/phase-2/stage-<N>-precondition-block-<UTC>.md` documenting the failed probe (path checked, expected state, observed state).
2. Reports verdict BLOCKED with a pointer to the audit.
3. Does *not* attempt to remediate the precondition inline. "Build the missing piece while I'm here" is a scope violation (Convention I — cross-batch scope discipline).

The coordinator surfaces the BLOCKED report to the founder. The founder decides whether to re-open Phase 0/1 work, defer Phase 2, or invoke Hard Rule 2.

This is Hard Rule 2 (Convention §7.2): when the spec disagrees with synced state, the synced state is authoritative. Stop and surface; do not silently adapt.

## §1.3 Scope and deliverables

### §1.3.1 Enumerated work items

Nine work-stage units of work (Stages 0-8), plus one landing stage (Stage 9).

| ID | Source sim | Source stack | Target stack | Stage | Target common module | Notes |
|---|---|---|---|---|---|---|
| 0 | — | — | — | — | produces `common-warp` v0.1.0 | Stages 5, 7, 8 prerequisite |
| 2.1.C | reaction-diffusion-2d | B (per §5.2.1) | C (Vulkan/C++) | 1 | consumes `common-cpp` | First Stack C continuous-CA sim |
| 2.1.D | reaction-diffusion-2d | B (per §5.2.1) | D (Taichi) | 2 | consumes `common-py` | First Stack D continuous-CA sim |
| 2.2.D | sph-water | C (per §11.2 item 1.4) | D (Taichi) | 3 | consumes `common-py` | "Taichi reference port" per §11.3 item 2.2 |
| 2.3.E | mpm-multimaterial | D (per §11.2 item 1.5) | E (Warp) | 8 | consumes `common-warp` | "Warp port" per §11.3 item 2.3; heaviest port, Phase 4 critical-path |
| 2.4.D | eulerian-smoke | C (per §11.2 item 1.6) | D (Taichi) | 4 | consumes `common-py` | First Stack D Eulerian sim |
| 2.4.E | eulerian-smoke | C (per §11.2 item 1.6) | E (Warp) | 5 | consumes `common-warp` | First Stack E Eulerian sim |
| 2.5.D | lattice-boltzmann-d3q19 | C (per §11.2 item 1.7) | D (Taichi) | 6 | consumes `common-py` | First Stack D LBM sim |
| 2.5.E | lattice-boltzmann-d3q19 | C (per §11.2 item 1.7) | E (Warp) | 7 | consumes `common-warp` | First Stack E LBM sim |
| Landing | — | — | — | 2 | — | Integrates all 9 feature branches |

### §1.3.2 Per-replication deliverable shape

Each sim-port stage (Stages 1–8 except Stage 0) ships, on `phase-2/working`:

- **Spec sheet** at `docs/sim-specs/<category>/<sim>/spec-ref-stack-<X>.md` (anchor sketch — re-verify directory naming at execution; spec §8.2 names `spec-ref.md` for the primary and references siblings, the replication-specific naming is INFERENCE).
- **Pre-implementation probe report** at `tools/testkit/probes/reports/<sim>-stack-<X>-probe.md` (anchor sketch).
- **Acceptance test suite** under the sim's `tests/` subdirectory; tests must fail without implementation.
- **Implementation** at `<category>/<sim>/ref-stack-<X>/` per spec §3.7 directory convention.
- **Capture file** produced by running the sim under deterministic seed; lands at `captures/<sim>-stack-<X>/<canonical-name>.h5` plus its `.json` manifest (anchor sketch).
- **Equivalence configuration** added to `tools/testkit/equivalence/tolerance.toml` (per-sim override) and `docs/sim-specs/<category>/<sim>/equivalence.md` (per-sim equivalence narrative).
- **Determinism declaration** in the sim's spec sheet §8 and consistent capture-manifest field.

Stage 0 ships:

- **API specification** at `docs/common/warp.md` per spec §3.4 item 4.
- **Module source** at `common/common-warp/` covering the six per-module requirements listed in spec §3.4: (1) capture I/O, (2) determinism harness binding, (3) smoke simulator, (4) public API doc, (5) Cat 2 contract compliance, (6) cross-stack equivalence-harness compatibility.
- **Acceptance tests** for the module's public API, TDD-first.
- **Smoke simulator** — minimal "hello-physics" using Warp; exercises the module end-to-end.

The Stage 9 (landing) ships:

- **Convergence-file updates** — single commit per Convention A (new-files-first) discipline:
  - `CHANGELOG.md` updated with Phase 2 entry.
  - `docs/project-state.md` (landing ledger) updated.
  - `tools/testkit/equivalence/tolerance.toml` consolidated entries.
  - Root `README.md` updated with new sim ports if a portfolio gallery exists.
  - Phase 2 closing audit report at `docs/_audits/phase-2/landing-<UTC>.md`.

### §1.3.3 Explicit non-goals for Phase 2

- **Frontier variants of any sort.** No differentiable, sparse, neural-rendered, or frontier-algorithm variants. Those are Phase 4 (§11.5). A Phase 2 stage that finds itself wanting to add a `wp.Tape` autodiff pass STOPS, surfaces the scope creep to the coordinator, and confines its work to the reference replication.
- **New sims, not new ports.** Every Phase 2 deliverable is a port of an existing Phase 1 sim. No sim categories not already in Phase 1 enter the portfolio in Phase 2.
- **Reworking Phase 0 or Phase 1 artifacts.** If a Phase 2 stage finds a Phase 1 bug, the response is to file a defect-audit report (under `docs/_audits/phase-1/defect-<sim>-<UTC>.md`), notify the coordinator, and proceed against the buggy reference state. The reference fix is a separate, scoped commit chain — not Phase 2 work.
- **Stack F or Stack G ports.** Out of scope for Phase 2. Stack F adoption decision is deferred to Phase 3 boundary (spec §12.1); Stack G is horizon (§4.7).

### §1.3.4 Phase-fit verification — what Phase 2 enables downstream

This subsection exists so the founder can verify that Phase 2's deliverables slot correctly into Phase 3 and Phase 4. If Phase 2's outputs don't fit downstream, the right time to discover that is at plan-review, not at Phase 3 kickoff.

**Phase 3 consumers of Phase 2 deliverables (spec §11.4):**

| Phase 3 item | Phase 2 deliverable it consumes | Risk if Phase 2 underdelivers |
|---|---|---|
| 3.3 Rigid-body pedagogical (Stack E) | `common/common-warp/` from Stage 0 | Phase 3.3 cannot start; common-warp must be solid enough for a fresh Stack E sim with rigid-body integration |
| 3.4 Soft-body cloth (Stack C or E) | If E: `common/common-warp/` from Stage 0 | Same as above |
| 3.5 First 3DGS-MPM coupling (Stack E) | Stack E reference MPM from Stage 8 + `common/common-warp/` | Phase 3.5 is "PhysGaussian-style coupling" — needs a working Stack E MPM as the substrate |
| 3.6 First learned-dynamics PINN (Stack E) | `common/common-warp/` | Same as above |
| 3.7 common-warp matures | The minimal Stage 0 baseline | Phase 3.7 is purely additive on Stage 0's bootstrap |

**Phase 4 consumers of Phase 2 deliverables (spec §11.5):**

| Phase 4 item | Phase 2 deliverable it consumes | Notes |
|---|---|---|
| 4.1 Diff RD (Stack D) | Stack D reference RD from Stage 2 | Needs the `@ti.kernel`-based RD as the autodiff substrate |
| 4.2 Diff SPH (Stack D or E) | Stack D SPH from Stage 3 | DiffTaichi route |
| 4.5 Diff smoke / flow-map (Stack E) | Stack E reference smoke from Stage 5 | Warp-autodiff substrate |
| 4.7 NanoVDB smoke (Stack C and Stack E) | Stack E smoke from Stage 5 + Stack C smoke from Phase 1 | NanoVDB swap-in needs both stacks' smoke references |
| 4.8 NanoVDB MPM (Stack E) | Stack E MPM from Stage 8 | Sparse-grid swap-in |
| 4.11 3DGS-MPM (Stack E) | Stack E MPM from Stage 8 | PhysGaussian foundation |
| 4.13 3DGS-smoke (Stack E) | Stack E smoke from Stage 5 | Neural-rendered foundation |

**Critical-path observation.** Five Phase 4 frontier variants (4.5, 4.7, 4.8, 4.11, 4.13) depend on Phase 2's three Stack E ports (Stages 5, 7, 8 — spec items 2.4.E, 2.5.E, 2.3.E). Phase 4's MPM-coupled 3DGS work (4.11, 4.14, 4.12 variants of 3DGS-coupled physics) specifically depends on Stage 8 producing a clean Warp MPM reference. This is the highest-stakes deliverable in Phase 2.

**What this means for stage prompts.** The three Stack E port stages (5, 7, 8) get extra discipline: their references will be the substrate for half a dozen frontier variants. They are not allowed to take shortcuts that would force Phase 4 stages to rework the reference. The per-sim risk callouts in §§2.8, 2.10, 2.11 reinforce this.

**Phase fit for the Stack D ports** (Stages 2, 3, 4, 6 — spec items 2.1.D, 2.2.D, 2.4.D, 2.5.D) is lighter — they primarily serve as the cross-stack equivalence partners for the Stack C originals, plus the substrate for Phase 4's diff-Taichi variants. The Stack D ports' main downstream consumer is 4.1 (Diff RD) and 4.2 (Diff SPH).
- **Stack F or Stack G ports.** Out of scope for Phase 2. Stack F adoption decision is deferred to Phase 3 boundary (spec §12.1); Stack G is horizon (§4.7).

## §1.4 Sequential stage decomposition

### §1.4.0 Why sequential single-agent (and the standards that recommend it)

Phase 2's earlier draft used a Wave 0 / Wave 1 parallel decomposition. The founder revised that to sequential execution after weighing compounding integration risk. Per the v5 amendment at the top of this document, the model is now further tightened to single-agent dispatch:

- A single Claude.ai coordinator session manages light queue management across the whole phase.
- **One Claude Code agent role executes all 10 stages sequentially under auto-accept** (v5 amendment supersedes the earlier "fresh Claude Code session per stage" framing). The agent reads the plan in full at session start; consults §§ 2.3–2.11 at each stage boundary; commits to `main` at each stage close.
- Direct commits to `main` per spec § 7.12 (v5 amendment supersedes the earlier `phase-2/working` feature-branch model). Phase tag `v0.2.0-phase-2` at landing.

The decision is defensible on three standards:

1. **Trunk-based development with short-lived feature branch** (Humble & Farley, *Continuous Delivery*, 2010; the DORA research program's repeated finding that short-lived branches with frequent integration outperform long-lived parallel branches on lead-time and stability metrics). One `phase-2/working` branch is short-lived by construction — it lives only for Phase 2's duration and merges to `main` at landing.
2. **One change at a time** (Beck, *Test-Driven Development*, 2002; the "do one thing, do it well" inheritance from Unix philosophy). Sequential stages prevent compound debugging where multiple stages' defects entangle. A failing stage's defect is attributable to that stage's commits alone.
3. **Solo-developer-with-AI-assistant pattern** (no formal citation; community norm for small-team AI-augmented workflows in 2025–2026). One human reviewer cannot productively triage nine parallel agent outputs; one at a time matches review bandwidth.

### §1.4.1 Stage queue

Phase 2 consists of 10 stages, dispatched sequentially. Each stage is one Claude Code session.

```
Stage 0 — common-warp bootstrap         (gates Stages 4, 5, 7)
Stage 1 — reaction-diffusion-2d → C     (depends on: common-cpp from Phase 1)
Stage 2 — reaction-diffusion-2d → D     (depends on: common-py from Phase 1)
Stage 3 — sph-water → D                 (depends on: common-py, SPlisHSPlasH ref)
Stage 4 — eulerian-smoke → D            (depends on: common-py)
Stage 5 — eulerian-smoke → E            (depends on: common-warp from Stage 0)
Stage 6 — lattice-boltzmann-d3q19 → D   (depends on: common-py, Krüger ref)
Stage 7 — lattice-boltzmann-d3q19 → E   (depends on: common-warp from Stage 0)
Stage 8 — mpm-multimaterial → E         (depends on: common-warp; load-bearing for Phase 4)
Stage 9 — Landing                       (final convergence + merge to main)
```

**Stage ordering rationale:**

- Stage 0 first because it's the prerequisite for three downstream stages. If common-warp is defective, all three Stack E ports inherit the defect; better to find the defect when only Stage 0 has landed.
- Stages 1–4 are independent of common-warp; they could be done in any order. The current order keeps similar categories together (1+2 are RD on different stacks; 3 is SPH; 4 is the first smoke port).
- Stage 5 (smoke E) comes after Stage 4 (smoke D) so the founder can review smoke twice with two stacks before reviewing two MPM/LBM ports — natural pattern-recognition opportunity for rule-of-three (§3.5).
- Stages 6+7 are LBM (D then E). Stage 7 is a Stack E port that depends on Stage 0's common-warp.
- Stage 8 (MPM Stack E) is last among the work stages because it is structurally the heaviest port (88-line MLS-MPM reference per Hu et al. 2018 § §5.5; multi-material constitutive models; load-bearing for Phase 4 frontier variants per §1.3.4). Putting it last means it has the most prior-stage Stack E precedent to draw from.
- Stage 9 is landing.

### §1.4.2 Branch model

A single feature branch, `phase-2/working`, hosts the entire phase:

```
main ──────────────────────────────────────────────────────  (protected, untouched until Stage 9)
  │
  └── phase-2/working  ─→ S0 ─→ S1 ─→ S2 ─→ S3 ─→ S4 ─→ S5 ─→ S6 ─→ S7 ─→ S8 ─→ S9 ──→ merge to main
                          ↑
              Each stage adds 1+ commits to phase-2/working.
              No parallel branches. Each stage sees every prior stage's
              landed code at HEAD before its work begins.
```

This eliminates the parallel-wave dependency graph, the per-agent feature branches, and the landing-time multi-branch merge. The cost is wall-clock — stages execute serially — but for a solo developer with AI-assistant review bandwidth, serial throughput matches review throughput.

**Per-stage branch operations** (every stage does exactly these):

1. `git fetch origin && git checkout phase-2/working && git pull --ff-only` — sync to latest HEAD.
2. Stage work (probe → spec sheet → tests → impl → capture → equivalence → gates).
3. `git push origin phase-2/working` after each logical commit (typically 4–6 commits per stage).
4. Final commit on the stage is the stage-completion report file at the repo root (`phase-2-stage-<N>-report.md`).

If `phase-2/working` doesn't exist at Stage 0's start, Stage 0 creates it as `git checkout -b phase-2/working main`.

### §1.4.3 Work units per stage (touch sets)

Each stage's touch set is the path scope it writes. Because stages are serial, there's no parallel-touch / convergence-touch split — *every* path is touched in sequence. The list below is for orientation, not exclusion: a stage CAN touch convergence files (CHANGELOG, project-state.md, tolerance.toml) directly because no parallel agent is also editing them.

**Anchor sketch — every path below must be re-verified against repo HEAD at coordinator kickoff and at each stage's start.** The spec's directory conventions (§§3.1, 3.4, 3.7, 8.1) are FACT; per-stage assignments are INFERENCE applied to those conventions.

| Stage | Primary touch set (writes) | Convergence-file updates (added by stage) |
|---|---|---|
| 0 | `common/common-warp/**`, `docs/common/warp.md`, `tools/testkit/probes/reports/common-warp-probe.md`, `references/Warp/` (if vendoring needed), `phase-2-stage-0-report.md` | CHANGELOG entry for common-warp v0.1.0; project-state.md row |
| 1 | `continuous-ca/reaction-diffusion-2d/ref-stack-c/**`, `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-c.md`, `tools/testkit/probes/reports/reaction-diffusion-2d-stack-c-probe.md`, `captures/reaction-diffusion-2d-stack-c/**`, `phase-2-stage-1-report.md` | CHANGELOG entry; project-state.md row; tolerance.toml override (if any); equivalence.md (new file) |
| 2 | `continuous-ca/reaction-diffusion-2d/ref-stack-d/**`, `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md`, `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md`, `captures/reaction-diffusion-2d-stack-d/**`, `phase-2-stage-2-report.md` | CHANGELOG entry; project-state.md row; tolerance.toml override (if any); equivalence.md (append Stack D section) |
| 3 | `particle-fluid/sph-water/ref-stack-d/**`, `docs/sim-specs/particle-fluid/sph-water/spec-ref-stack-d.md`, `tools/testkit/probes/reports/sph-water-stack-d-probe.md`, `captures/sph-water-stack-d/**`, `phase-2-stage-3-report.md` | CHANGELOG; project-state.md; tolerance.toml; equivalence.md (new file) |
| 4 | `volumetric-grid/eulerian-smoke/ref-stack-d/**`, `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-d.md`, `tools/testkit/probes/reports/eulerian-smoke-stack-d-probe.md`, `captures/eulerian-smoke-stack-d/**`, `phase-2-stage-4-report.md` | CHANGELOG; project-state.md; tolerance.toml; equivalence.md (new file) |
| 5 | `volumetric-grid/eulerian-smoke/ref-stack-e/**`, `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-e.md`, `tools/testkit/probes/reports/eulerian-smoke-stack-e-probe.md`, `captures/eulerian-smoke-stack-e/**`, `phase-2-stage-5-report.md` | CHANGELOG; project-state.md; tolerance.toml; equivalence.md (append Stack E section) |
| 6 | `lattice/lattice-boltzmann-d3q19/ref-stack-d/**`, `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-d.md`, `tools/testkit/probes/reports/lattice-boltzmann-d3q19-stack-d-probe.md`, `captures/lattice-boltzmann-d3q19-stack-d/**`, `phase-2-stage-6-report.md` | CHANGELOG; project-state.md; tolerance.toml; equivalence.md (new file) |
| 7 | `lattice/lattice-boltzmann-d3q19/ref-stack-e/**`, `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-e.md`, `tools/testkit/probes/reports/lattice-boltzmann-d3q19-stack-e-probe.md`, `captures/lattice-boltzmann-d3q19-stack-e/**`, `phase-2-stage-7-report.md` | CHANGELOG; project-state.md; tolerance.toml; equivalence.md (append Stack E section) |
| 8 | `hybrid-pg/mpm-multimaterial/ref-stack-e/**`, `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-e.md`, `tools/testkit/probes/reports/mpm-multimaterial-stack-e-probe.md`, `captures/mpm-multimaterial-stack-e/**`, `phase-2-stage-8-report.md` | CHANGELOG; project-state.md; tolerance.toml; equivalence.md (new file) |
| 9 | Phase-closing audit at `docs/_audits/phase-2/landing-<UTC>.md`; final CHANGELOG header; final project-state.md cleanup; merge `phase-2/working` to `main` | — (landing IS the final convergence) |

### §1.4.4 Why serial execution simplifies the failure model

Most of the parallel model's failure modes disappear:

- **No parallel-wave handoff risk.** Stage N+1 starts only after Stage N has been merged to `phase-2/working` and the founder has reviewed the report. Defects surface immediately, not at landing.
- **No convergence-file conflict risk.** Each stage updates CHANGELOG, project-state.md, tolerance.toml directly. No parallel agent is also editing them.
- **No socket-drift risk between common-warp producer and Stack E consumers.** Stages 5, 7, 8 read Stage 0's actual landed common-warp source — not a parallel branch that might drift.
- **No branch reconciliation at landing.** Stage 9's landing is just a merge of `phase-2/working` into `main` (fast-forward if the repo policy permits, otherwise a single squash or merge commit per repo convention).

New failure modes that didn't apply to the parallel model:

- **Stage-N defect blocks Stages N+1..9.** If Stage 0 (common-warp) is defective, Stages 5, 7, 8 can't proceed. Mitigation: per-stage gate verification (the §1.5 eleven-gate criteria) catches defects before the next stage starts. The coordinator's job at compile-step is to read the gate-status table and confirm all gates PASS before dispatching the next stage.
- **Stage-N report is fabricated (Convention #8 risk).** A Claude Code session might claim gates pass without verification. Mitigation: the report's §2 (Gate status) cites evidence paths; the coordinator does not validate, but the founder review at each stage-boundary check spots gross fabrication.
- **Wall-clock cost.** Serial is slower than parallel by the per-stage ratio. Phase 2's estimated 2–3 months (spec §11.8) becomes the realistic floor under serial execution; with founder review between stages, 3–4 months is more realistic.

### §1.4.5 Branch naming convention

Single branch: `phase-2/working`, branched from `main` at Stage 0. All stages commit to it. Stage 9 merges to `main` per repo policy.

If a stage discovers it needs to spike-and-abandon (e.g., to test a major refactor without committing), that's an interactive `git stash` / local-experimentation pattern within the Claude Code session. No additional branches are created at coordinator level.

## §1.5 Per-replication acceptance criteria

Spec §3.6 mandates four per-replication requirements for Layer 5: (1) new spec sheet, (2) new test fixtures, (3) equivalence harness configured for the pair, (4) CI gate on the equivalence harness. The Layer 4 thirteen-gate list (per spec § 3.5 v2.4 expansion, was ten pre-v2.4) is *not* re-stated for Layer 5 by the spec.

**This document's extension (INFERENCE — see §3.4.3 Inference A):** Layer 5 ports also pass Layer 4's thirteen gates, since those gates (MMS/golden, Tier 1/2 diagnostics, citations, API, capture, determinism, PBT invariants, perf-ledger row, failing-tests replay) are stack-agnostic correctness gates a port should pass. The cross-stack equivalence gate becomes the fourteenth. The pre-v6 framing as "eleven gates" is superseded by this v6 amendment (per top-of-file v6 verification-hardening block).

### §1.5.1 The Phase 2 fourteen-gate acceptance criteria (v6 amendment; was eleven gates pre-v6)

Every Phase 2 sim-port stage's deliverable passes:

**Gate 1 — Spec sheet committed.** `docs/sim-specs/<category>/<sim>/spec-ref-stack-<X>.md` exists, follows spec §8.2 template, §6 verification posture filled in (including PBT invariant declarations per spec § 2.14), §9 equivalence section declares the cross-stack tolerance posture. *Anchor sketch — path subject to founder-decision item §3.4.2 #3.*

**Gate 2 — Pre-implementation probe report committed.** `tools/testkit/probes/reports/<sim>-stack-<X>-probe.md` exists, enumerates: API surfaces from `common-<X>` that the port consumes; upstream citations with verified vendored SHAs; test-fixture paths the port will produce; public types/functions the port will export. *Anchor sketch — probe-report path is Inference E in §3.4.3.*

**Gate 3 — Tests committed and failing, with verbatim output captured and hashed in commit footer.** Acceptance test suite exists at `<category>/<sim>/ref-stack-<X>/tests/`, runs to a failure with a meaningful error pointing to a missing implementation rather than to a missing fixture or import bug. Per spec § 1.3 step 4 (v6 amendment): the failing-tests commit footer contains `Failing-tests-output: tools/testkit/failing-tests-evidence/<sim>-stack-<X>-<UTC>.txt` and `Failing-tests-output-hash: sha256:<hex>`. The implementation commit footer contains `Implements-failing-tests-from: <failing-tests-commit-sha>` and `Failing-tests-output-hash-witnessed: sha256:<same-hex>`.

**Gate 4 — Implementation passes code verification (Cat 3).** MMS tests pass for PDE-based ports (smoke, LBM, RD-2d); golden-value tests pass for closed-form / kernel-based ports (SPH kernel evaluation). MMS reports for the port match the formal order of accuracy within ±0.5. Golden tables (v6 amendment): each table has ≥ 3 independent-reference anchors per spec § 2.4. For ports re-using Phase 1's golden tables (most ports do): inherit Phase 1's anchors; no new anchor work needed. For new tables: anchor discipline applies.

**Gate 5 — Tier 1 diagnostics pass.** No NaN/Inf in any captured state; energy/mass/momentum conservation within per-sim tolerance; wall-clock and dispatch counts logged; memory high-water mark logged.

**Gate 6 — Category-specific Tier 2 diagnostics pass.** Per spec §3.3:
- RD-2d: scalar-field substack (monotone bounds, conservation laws, spectral content sanity).
- SPH: particle substack (no overlap within ε, neighbor-list integrity, particle-count invariance, momentum conservation).
- MPM: particle + scalar-field substacks (particle integrity + grid invariants).
- Smoke: scalar-field + vector-field substacks (divergence-free where prescribed, spectrum sanity).
- LBM: scalar-field substack (density positivity, conservation, equilibrium-deviation bounds).

**Gate 7 — Citation chain resolves (Cat 1).** Every `file:line` and upstream citation in the spec sheet resolves at HEAD. Upstream SHAs match vendored references. *Adapted for Phase 2:* the port's spec sheet cites the original sim's spec sheet under §2 (Upstream and reference anchor); that cross-spec citation resolves.

**Gate 8 — Public API resolves (Cat 2).** Every public function / class / type the port exports has a contract entry in the spec sheet §5 (Implementation) and the implementation matches. *Adapted for Phase 2:* the port's consumption of `common-<X>` matches the contract documented in `docs/common/<X>.md`.

**Gate 9 — Capture file produced; testkit-replayable.** The port emits a capture under `captures/<sim>-stack-<X>/` (*anchor sketch — capture-directory layout is Inference F in §3.4.3*). The testkit's capture reader opens it; the testkit's equivalence harness accepts it as one side of a cross-stack diff. **Schema-corpus entry (v6 amendment):** the capture is also copied to `tests/fixtures/legacy-captures/phase-2-<sim>-<stack>.h5` + `.json` sidecar for Phase 4 WU-A's schema-bump round-trip test.

**Gate 10 — Determinism declaration consistent.** Per spec §2.5, the port declares its determinism posture in spec sheet §8 (one of: bit-exact-same-hw, epsilon-bounded-same-hw, non-deterministic-by-design). The declaration matches what the determinism harness observes when running the port twice with the same seed.

**Gate 11 — Property-based tests pass (v6 amendment; per spec § 2.14).** The port runs its source sim's PBT invariant suite (or, if the source sim was a Phase 1 TDD bootstrap that deferred PBT implementation, the port implements the invariants here per the spec § 6 declarations). At least two invariants per category. Hypothesis examples committed for reproducibility.

**Gate 12 — Performance ledger row appended (v6 amendment; per spec § 2.15).** The port's wall-clock for the canonical capture is recorded in `docs/perf-ledger.md` with the canonical row format. Stage 9 reads the ledger and flags ports > 2× slower than the source-stack baseline.

**Gate 13 — Failing-tests replay matches (v6 amendment; per spec § 1.3 step 4).** The phase-closing audit can check out the failing-tests-commit SHA, re-run pytest, compute sha256, and confirm it matches the hash recorded in the commit footer. Stage 9 spot-checks 2–3 randomly-sampled stages.

**Gate 14 (Phase 2 specific) — Cross-stack equivalence to original sim passes.** This gate is the only one literally mandated by spec §3.6 for Layer 5 ("the cross-stack equivalence harness runs in CI and gates the second-stack merge"):
- The equivalence harness consumes the source sim's capture and the port's capture.
- Applies the tolerance for the sim's category (spec §2.6 default table; per-sim override in `tools/testkit/equivalence/tolerance.toml`).
- **Tolerance-budget compliance (v6 amendment):** if the per-sim override exceeds `tolerance-budget.toml` cap, the override is invalid — Cat-X HARD_FAILs the stage. The stage either tightens the tolerance (correctness work) or surfaces a tolerance-budget-amendment proposal to the owner (separate commit, owner-approved).
- Produces a diff report.
- Report verdict is PASS within tolerance, or the per-sim override is justified in `docs/sim-specs/<category>/<sim>/equivalence.md` AND within tolerance-budget cap.

**Failure of any gate blocks the stage's "complete" report.** The stage reports back with INCOMPLETE + reason rather than fabricating gate passage (Convention #8).

### §1.5.2 Stage 0 (common-warp) acceptance criteria

Stage 0's deliverable passes a six-gate adaptation of Layer 3 per-module requirements (spec §3.4):

**W-Gate 1 — Capture I/O.** Implements `read_capture()` and `write_capture()` against the canonical schema at `tools/testkit/schemas/capture-v1.json`.

**W-Gate 2 — Determinism harness binding.** Exposes a `--deterministic` flag and seed mechanism. The testkit's determinism harness produces a green report on the module's smoke simulator.

**W-Gate 3 — Smoke simulator.** A minimal "hello-physics" sim under `common/common-warp/examples/hello/` that exercises every public subsystem of the module. Runs end-to-end; produces a capture.

**W-Gate 4 — Public API documented.** `docs/common/warp.md` exists; Cat 2 contract verification passes against the spec sheet.

**W-Gate 5 — Cross-stack equivalence-harness compatibility.** The harness can compare the common-warp smoke sim's capture against an existing common-cpp or common-py smoke sim's capture, producing a diff report.

**W-Gate 6 — Integrity gates green.** Cat 1 (any citations in the module's docs resolve), Cat 2 (contracts), Cat 4 (draft-time spec verification on `docs/common/warp.md`) all pass against HEAD.

## §1.6 Convention discipline reminders

These conventions govern every stage's work in Phase 2. Each is cited by full name; the spec's Part VII and Appendix B are authoritative.

### §1.6.1 Spec-time discipline (during probe + spec sheet authoring)

- **Convention M — Re-anchor before edit.** Before modifying any file or asserting any current state, re-view or grep the live source. Every path in this document is an anchor sketch; the stage re-anchors at start.
- **Convention #8 — Never assert specifics from memory.** Paths, line numbers, function signatures, version strings, performance figures: all grep-verified or web-fetched at the moment of assertion.
- **Convention C — Probe API surfaces before drafting.** The stage's probe enumerates the `common-<X>` API surfaces the port will consume. Verbatim. No paraphrase.
- **Convention D — Probe call sites before drafting.** For each consumed API surface, the stage lists the original sim's call sites that the port translates from.
- **Convention K — Anchor-sketch labeling.** Any section of the stage's deliverable constructed from probe data plus inference is labeled "anchor sketch — verify at execution time" with a named likely failure mode.

### §1.6.2 Execution-time discipline (during implementation)

- **Convention A — New-files-first decomposition.** The stage's commits to `phase-2/working` lead with new-files-only commits before modifying any existing file. (For Phase 2 ports, "existing file" mostly refers to `tools/testkit/equivalence/tolerance.toml` if the stage adds a per-sim override — that override goes into a follow-up commit, not the first.)
- **Convention F — Audit-prose freshness.** If the stage files an audit report (e.g., for a deferred item), it re-verifies the audit's gate-state claims against current disk immediately before commit.
- **Hard Rule 2 — Pause and surface.** When this document's anchor sketches disagree with synced state, the synced state is authoritative. The stage stops, reports the disagreement, does not silently adapt.

### §1.6.3 Batch coordination

- **Convention G — Sweep-side protection before check-side scope expansion.** If the stage introduces a new check (e.g., a Tier 2 substack diagnostic), the sweep-side protection rule lands before or alongside the check registration.
- **Convention I — Cross-batch scope discipline.** If the stage's verification sweep surfaces a finding outside Phase 2 scope (e.g., a Phase 1 bug), the stage files it as a deferred-defect audit but does not fix it inline.
- **Convention M-addendum — Stable repo path before probe.** This document's path conventions land at the stable `docs/phases/phase-2-cross-stack-replication.md` location before stages are dispatched against it.

### §1.6.4 Audit-trail discipline

- **FACT vs INFERENCE tagging.** Every concrete claim in the stage's spec sheet, probe report, and final report-back is tagged. FACTs are grep-verifiable; INFERENCEs cite FACTs they depend on.
- **Four-state verdicts.** Audit verdicts in any audit report the stage files: CONFIRMED / SHIFTED / REFUTED / DEFERRED (compounds: DISCONFIRMED-AT-HEAD, REFRAMED).
- **Append-only audits.** Audit reports under `docs/_audits/` are never edited. Corrections are new reports referencing the prior.
- **Required front-matter.** Every audit report opens with: date, author, subject, verdict-state, evidence-paths.

### §1.6.5 SHA back-fill

- **Convention #12 — SHA back-fill as separate commit, never `--amend`.** If a stage's report references a commit's SHA before the commit lands (e.g., in the stage's final report-back), the SHA is back-filled in a follow-up commit. The stage never `git --amend`s a commit whose SHA has been published or quoted elsewhere.

### §1.6.6 Runtime-only display surfaces

- **Per §7.8:** CI does not exercise GGUI windows, interactive input, ImGui sub-window layouts, headless render pipelines needing real GPUs. These surfaces require explicit user-driven visual-verification gates *after* CI-green and *before* "phase complete." For Phase 2, the Stack D ports may use Taichi GGUI; their interactive layers are not CI-gated. The stage's report-back declares which surfaces fall in this category and the gate state of CI-tested vs visual-verification-pending.

## §1.7 Report-back format

Every stage (0–8) reports back to the coordinator in the structured format below. Stage 9 (landing) uses a similar template adapted for cross-cutting verdicts (see §2.12).

The report is a Markdown document at the root of `phase-2/working`: `phase-2-stage-<N>-report.md`. The stage commits this file as its last act before signaling completion.

### §1.7.1 Report template

```markdown
# Phase 2 Agent Report — <Agent ID>

> **Stage:** <stage number 0-8; e.g. Stage 4 (eulerian-smoke → Stack D, spec item 2.4.D)>
> **Source sim:** <sim-name>
> **Source stack:** <stack letter and name>
> **Target stack:** <stack letter and name>
> **Branch:** `phase-2/working` (with HEAD SHA at report time)
> **Branch:** phase-2/working
> **Branch HEAD SHA:** <40-char SHA from `git rev-parse origin/phase-2/working` after final push — required for verdict COMPLETE per Rule R1>
> **Completion timestamp (UTC):** <ISO 8601>
> **Verdict:** COMPLETE / INCOMPLETE / BLOCKED

## 1. Probe report summary

- API surfaces consumed from common-<X>: <count> (full list in tools/testkit/probes/reports/<sim>-stack-<X>-probe.md)
- Upstream citations verified: <count> (each SHA matched to vendored reference)
- Test fixtures produced: <count>
- Public exports declared: <count>

(FACT — every count above grep-verifies against the committed probe report.)

## 2. Gate status

| Gate | Status | Evidence path | Notes |
|------|--------|---------------|-------|
| 1 — Spec sheet | PASS / FAIL | docs/sim-specs/.../spec-ref-stack-<X>.md | |
| 2 — Probe report | PASS / FAIL | tools/testkit/probes/reports/...probe.md | |
| 3 — Tests committed + failing pre-impl | PASS / FAIL | tests/ subdirectory + commit SHA | |
| 4 — Code verification (Cat 3) | PASS / FAIL | MMS/golden report path | |
| 5 — Tier 1 diagnostics | PASS / FAIL | diagnostics report path | |
| 6 — Tier 2 diagnostics | PASS / FAIL | diagnostics report path | |
| 7 — Citation chain (Cat 1) | PASS / FAIL | integrity-cat1 report | |
| 8 — Public API (Cat 2) | PASS / FAIL | integrity-cat2 report | |
| 9 — Capture file + replayable | PASS / FAIL | captures/.../*.h5 + manifest | |
| 10 — Determinism declaration consistent | PASS / FAIL | spec sheet §8 + determinism harness output | |
| 11 — Cross-stack equivalence | PASS / FAIL | equivalence harness report | |

## 3. File manifest

(Full list of files added or modified on the branch, grouped by Convention A's new-files-first vs modifies-existing split.)

### 3.1 New files
- <path>
- ...

### 3.2 Modified files
- <path>: <one-sentence summary of edit>
- ...

## 4. Deferred / open items

(Items flagged for follow-up. Each cites a Convention or §9.4 failure-mode category if applicable.)

- <id>: <description> — verdict DEFERRED, escalation: <to-coordinator | to-Phase-3 | to-defect-audit>

## 5. Convention compliance

(Self-assessment. Honest. Convention #8 prohibits asserting compliance without verification.)

- Convention M (re-anchor before edit): <YES / NO / N/A> — <evidence>
- Convention C (probe API surfaces): <YES / NO> — <probe report path>
- Convention D (probe call sites): <YES / NO> — <probe report section>
- Convention A (new-files-first): <YES / NO / partial> — <commit chain summary>
- Convention K (anchor-sketch labeling): <YES / NO / N/A> — <evidence>
- Convention #8 (no memory-asserted specifics): <YES / NO> — <self-audit summary>

## 6. Convergence-file delta proposals (for Stage 9 (landing) — verbatim copy)

This section is the contract between the work stage and Stage 9 (landing). Stage 9 reads each prior stage's report directly from `phase-2/working`. Each sub-block is required; if a sub-block is N/A, the stage writes `(none)`.

### 6.1 tolerance.toml proposed entry

```toml
# Paste-ready TOML entry for `tools/testkit/equivalence/tolerance.toml`.
# Use the per-sim override format. If category default suffices, write `(none)` instead of a TOML block.
[per_sim."<sim-name>"."<stack-pair>"]
relative = <number>
absolute = <number>
rationale = "<one-sentence reason — atomics, FP order, etc.>"
evidence = "<docs/sim-specs/<category>/<sim>/equivalence-stack-<X>-fragment.md>"
```

### 6.2 CHANGELOG entry

```markdown
<!-- Paste-ready Markdown for the Phase 2 CHANGELOG section. -->
<!-- Stage 9 (landing) reviews all prior stages' entries; each stage writes its own. -->
- **<Agent-ID> — <sim-name> → Stack <X>:** <one-sentence description>. Branch: `phase-2/working` at `<branch-HEAD-SHA>`. Audit: `<path-to-equivalence-fragment-if-any>`.
```

### 6.3 project-state.md row

```markdown
<!-- Paste-ready Markdown row for the sim-coverage matrix in docs/project-state.md. -->
<!-- If no matrix exists in project-state.md yet, write `(Stage 9 (landing) creates)` instead. -->
| <category> | <sim-name> | Stack <X> | <ref-or-ref-stack-X> | <port-status: green/epsilon/N> | `<commit-SHA>` |
```

### 6.4 README gallery row (if applicable)

```markdown
<!-- Paste-ready Markdown for the root README's stack-coverage gallery. -->
<!-- If Phase 1 did not establish a gallery, write `(no gallery yet)`. -->
| <sim-name> | <stack-X> | <one-line description> | <link-to-spec-sheet> |
```

### 6.5 equivalence.md fragment path

```
<!-- Path to the stage's equivalence narrative fragment, for Stage 9 final stitching. -->
docs/sim-specs/<category>/<sim>/equivalence-stack-<X>-fragment.md
```

### 6.6 Deferred items requiring follow-up

```markdown
<!-- Items the stage identified but did NOT commit; each one goes to a follow-up audit. -->
<!-- Format: ID — description — escalation target. Write `(none)` if no deferred items. -->
- DEF-<N>: <description> — escalation: <Phase-3 | Phase-4 | defect-audit | testkit-expansion>
```

### 6.7 Anchor-sketch resolution log

```markdown
<!-- For each anchor sketch in this phase plan that the stage's Task X.1 probe touched, -->
<!-- record whether it matched repo HEAD verbatim or shifted. Concise. -->
- <plan-path-sketch> → <actual-path-at-HEAD or "matched verbatim">
- ...
```

### 6.8 Other notes (free-form)

```markdown
<!-- Anything that didn't fit above and the coordinator/Stage 9 (landing) needs to know. -->
<!-- Keep to bullets, one observation per line. Write `(none)` if nothing. -->
- ...
```

## 7. Self-test on report quality

(Per Convention E — Spec-author-self-test review. Honest pass.)

- Does every gate claim cite a verifiable evidence path? <YES / NO>
- Are there any claims in this report not grep-verifiable from the branch? <list, or NONE>
- Did I fabricate any specifics from memory? <self-audit, NONE expected>
- Did I push my branch to origin before composing this report? <YES — required for COMPLETE verdict>
- Is the branch HEAD SHA in the report front-matter the actual SHA at `origin/<my-branch>`? <YES / NO>
```

### §1.7.2 INCOMPLETE / BLOCKED handling

If a stage's verdict is INCOMPLETE or BLOCKED, the report still uses the template. Gate-status rows show FAIL with the actual blocker named. §4 lists the blocking items. §6 names the escalation path (typically: surface to coordinator → coordinator triages → either dispatch a fix-up stage, defer to Phase 3, or invoke Hard Rule 2 to surface to the founder).

Agents do not "complete" by fabricating green gates. Convention #8 is non-negotiable.

## §1.8 Front-loaded autonomy and decision rules

This section is the answer to "what does a stage do when something unexpected comes up." The principle: each stage has full autonomy within its touch set; surfaces BLOCKED only for things outside its scope to fix; never silently adapts the plan. The decision rules below cover the dozen most common stuck situations.

The intent of front-loading is that a stage should rarely need to escalate during Phase 2 execution. The plan answers most questions in advance.

### §1.8.1 Probe-and-spec-time decision rules

**Rule P1 — Vendored upstream is missing.** Probe expects `references/<X>/` (or `common/references/<X>/` per §3.4.2 Item 2) but the directory doesn't exist.
*Action:* File `phase-2-stage-<N>-precondition-block-<UTC-date>.md`, report BLOCKED. Do not attempt to vendor inline (Convention I — scope discipline). The founder re-opens the relevant Phase 1 work.

**Rule P2 — Vendored upstream exists but at unexpected SHA.** Probe finds the directory but the SHA doesn't match what the source-sim's spec-ref.md cites.
*Action:* Trust the live SHA at HEAD (Hard Rule 2 — synced state is authoritative). Update your own spec sheet's citation to match HEAD. File a §6.8 note flagging the SHA drift; the Stage 9 (landing) or a separate audit reconciles whether the source-sim spec sheet needs updating.

**Rule P3 — MMS manufactured solution for your sim's equation isn't in the testkit library.**
*Action:* Use the closest available manufactured solution (heat equation 1D is the canonical placeholder). Document the gap in your spec sheet §6 (Verification posture). File a §6.6 DEFERRED item with escalation `testkit-expansion`. The Cat 3 gate (Gate 4) is allowed to pass on the placeholder MMS plus your sim's own consistency-test suite; you note in §6.8 that full MMS verification awaits the testkit's MMS-library expansion.

**Rule P4 — Sibling-module pattern is ambiguous.** Probing `common/common-cpp/` and `common/common-py/` reveals two different patterns for the same concern (e.g., capture-write differs in HDF5 chunking strategy between siblings).
*Action:* Pick the pattern that matches your target stack's natural idiom. Document the choice in your spec sheet's §11 (Decision log). Label the choice INFERENCE per Convention K. Do not surface; this is exactly the kind of judgment each stage is empowered to make.

**Rule P5 — Source sim's spec-ref.md is missing or has gaps.** The Phase 1 source you're porting from doesn't have a complete `spec-ref.md` at the expected path.
*Action:* If the gap is fatal (e.g., no algorithm description), file BLOCKED and surface as a Phase 1 defect. If the gap is partial (e.g., §8 determinism section missing), proceed with what's available, infer the missing section from the source's actual implementation (Convention M — re-anchor before edit applies to reads as well as writes), and file a §6.6 DEFERRED item for the Phase 1 spec to be back-filled.

### §1.8.2 Implementation-time decision rules

**Rule I1 — Tests pass before implementation due to import errors.** Per Convention §1.6 Gate 3, tests must fail with a meaningful "implementation missing" error, not a "module not found" error.
*Action:* Fix imports first. Adjust test fixtures to import from the stub-module paths your implementation will create. Re-run; confirm tests fail for the right reason (missing function body, not missing module). Then proceed to implementation.

**Rule I2 — Performance is unacceptable on your target hardware.** The port runs but at 0.1× the source sim's frame rate.
*Action:* Phase 2 is a *correctness* phase, not a performance phase. Document the performance gap in §11 (Decision log) of your spec sheet and §6.8 (Other notes) of your report. File a §6.6 DEFERRED item with escalation `Phase-5` (productization). Performance optimization is not Phase 2 scope.

**Rule I3 — Implementation requires a utility that "naturally belongs in common-<X>".** You find yourself wanting to add a hash-grid helper, a Poisson-solver wrapper, or similar to your stack's common module.
*Action:* For Stack D / Stack C port stages (whose common-<X> is mature from Phase 1): do NOT extend the common module. Inline the utility in your `ref-stack-<X>/` directory. File a §6.6 DEFERRED item with escalation `Phase-3` (the rule-of-three promotion per Convention 7.10). Common-module surface area changes are explicitly outside Phase 2 scope.
For Stage 0 (whose common module is being built fresh): see Rule W1 below.

**Rule I4 — Numerical instability under deterministic-mode reduction order.** Your port shows NaN or divergence when run with `--deterministic`, but passes in default mode.
*Action:* The bug is in your reduction strategy, not in determinism mode. Switch to a deterministic reduction algorithm (Kahan summation, pairwise reduction, or your stack's documented deterministic path). Determinism is not optional; spec §4.9 makes the `--deterministic` flag mandatory for every sim.

**Rule W1 — (Stage 0 only) Subsystem appears underspecified in §2.2 prompt.** You read the minimal common-warp surface in §2.2 task list and find a real subsystem the Phase 2 ports will need that isn't listed.
*Action:* Add it. Document the addition in `docs/common/warp.md` decision log. File a §6.8 note. The prompt's enumerated list is a floor, not a ceiling — your judgment about what the three Stack E ports demonstrably need is authoritative. The discipline boundary is the Phase 3 scope: do NOT add subsystems that only benefit Phase 3+ work (autodiff utilities beyond a minimal `wp.Tape` test, NanoVDB integration beyond Warp's built-in availability, USD export, Newton bindings, 3DGS coupling).

### §1.8.3 Verification-time decision rules

**Rule V1 — Cross-stack equivalence fails by a narrow margin.** The diff report shows ε that exceeds the default tolerance by less than 10× (e.g., expected 1e-4, got 5e-4).
*Action:* Propose a per-sim tolerance override in §6.1 of your report (TOML block, with rationale and evidence path). Author the rationale in `equivalence-stack-<X>-fragment.md`. Do NOT relax the default tolerance globally — the override is per-sim, scoped to your port. The Stage 9 (landing) applies it.

**Rule V2 — Cross-stack equivalence fails by a wide margin.** The diff report shows ε that exceeds the default by 100× or more, or shows divergent trajectories rather than amplified noise.
*Action:* This is a real correctness defect. File `phase-2-equivalence-defect-<sim>-stack-<X>-<UTC-date>.md` audit with reproduction, then iterate on implementation. Tolerance-shopping is forbidden at this magnitude (Risk P2-β in §3.1.10).

**Rule V3 — Tier 2 diagnostic flags an issue but Cat 3 (MMS/golden) passes.**
*Action:* Investigate. The Tier 2 diagnostic and Cat 3 verification cover different surfaces; a passing Cat 3 with a flagging Tier 2 means the math is right but a runtime invariant is being violated (e.g., conservation drift). Fix before reporting COMPLETE.

**Rule V4 — Determinism harness reports drift between two runs of your port.**
*Action:* This must resolve to either (a) you find and fix the source of non-determinism, or (b) you adjust your spec sheet's §8 (Determinism) declaration from "bit-exact" to "epsilon-bounded" with documented atomics/subgroup-ops. Drifting from a stricter claim is not acceptable; the determinism declaration and harness output must match.

### §1.8.4 Reporting-time decision rules

**Rule R1 — Branch push before report.** You MUST push to `origin/phase-2/working` before composing your final report. The report's front-matter `branch HEAD SHA` field must match `origin/phase-2/working` HEAD. The next stage (and Stage 9 landing) fetches from origin; an unpushed commit is invisible to them. The §7 self-test in the report template includes a confirmation question for this.

**Rule R2 — Verdict honesty.** Verdicts are CONFIRMED reports of the stage's own gate-passing state. They are not negotiations with the coordinator. If your Gate 4 (Cat 3) fails, your verdict is INCOMPLETE, not "COMPLETE with caveats." The coordinator trusts your verdict; Stage 9 (landing) re-runs cross-cutting checks at landing. Lying to the coordinator about gate state results in Stage 9 BLOCKED with defect audit — your report's truth comes out either way.

**Rule R3 — Empty §6 sub-blocks.** Every sub-block in §6 of the report is required. If a sub-block doesn't apply (e.g., no tolerance override needed, no README gallery row needed), write `(none)` in that sub-block. Empty or missing sub-blocks force the coordinator to ask follow-up questions, which violates the "nothing should need to be verified by the coordinator" principle.

### §1.8.5 What the coordinator does not handle

Implicit corollary of these rules: situations not covered by Rules P1–R3 above are real escalations. The stage files BLOCKED, the coordinator surfaces to the founder, the founder decides. The coordinator does not adjudicate technical questions; the stage does not silently adapt. This split is the load-bearing discipline that keeps the serial workflow honest.

The coordinator's read of this section is: "if a stage's verdict is COMPLETE, Rules P1–R3 were sufficient; if BLOCKED, Rules P1–R3 were insufficient and the founder is in the loop."

## §1.9 Phase architecture — sockets and wires

The reason this section exists: even under serial execution, each stage builds against an interface that downstream stages will consume. Specifying the *interfaces* (the "sockets") up-front means a stage doesn't need to read prior stages' source to understand the contract — the §1.9 spec is the contract. The spec covers high-level architecture (Layers, stacks, conventions) but leaves implementation-level interfaces to each phase. §1.9 is that level.

Three load-bearing claims this section makes concrete:

1. **The `common/common-warp/` public API** the Stack E port stages (5, 7, 8) will call. Specified as Python function/class signatures, not "infer from siblings."
2. **The per-port directory structure** every sim-port stage ships. Specified as a file tree, not "follow the spec's `ref-stack-<X>/` convention."
3. **The capture-file naming, path, and pairing convention** the equivalence harness consumes. Specified as a filename pattern, not "stages agree."

If any stage deviates from these interfaces, Stage 9's pre-landing verification (Task L.1) catches the deviation. Stages are not free to redesign the interfaces; they are free to implement them.

### §1.9.1 `common-warp` public API specification

This is Stage 0's contract with downstream Stack E port stages. The module's surface is exactly these seven subsystems, exposed at the top-level import. Stage 0 implements; Stages 5, 7, 8 import and use.

**Module layout** (Stage 0 creates):

```
common/common-warp/
├── pyproject.toml                  # uv-managed package: bit-physics-common-warp
├── README.md
├── common_warp/
│   ├── __init__.py                 # Top-level re-exports (see signatures below)
│   ├── runtime.py                  # Subsystem 1
│   ├── capture.py                  # Subsystem 2
│   ├── determinism.py              # Subsystem 3
│   ├── particles.py                # Subsystem 4
│   ├── grids.py                    # Subsystem 5
│   ├── hashgrid.py                 # Subsystem 6
│   └── _internal/                  # Private, not exported
├── examples/
│   └── hello/                      # Subsystem 7: smoke sim
│       ├── main.py
│       ├── kernels.py
│       └── captures/               # Where the smoke sim writes its capture
└── tests/
    ├── test_runtime.py
    ├── test_capture.py
    ├── test_determinism.py
    ├── test_particles.py
    ├── test_grids.py
    ├── test_hashgrid.py
    └── test_smoke_e2e.py
```

**Top-level import contract** (`common_warp/__init__.py`):

```python
"""Bit-Physics Stack E common module — minimal Phase 2 bootstrap."""

from .runtime import init, deterministic_context
from .capture import Capture, read_capture, write_capture
from .determinism import set_seed, get_seed, assert_deterministic_run
from .particles import Particles, allocate_particles
from .grids import (
    ScalarField3D,
    VectorField3D,
    allocate_scalar_field,
    allocate_vector_field,
)
from .hashgrid import HashGrid

__version__ = "0.1.0"  # Phase 2 minimal; bumps to 0.2.0+ at Phase 3.7 maturation

__all__ = [
    "init", "deterministic_context",
    "Capture", "read_capture", "write_capture",
    "set_seed", "get_seed", "assert_deterministic_run",
    "Particles", "allocate_particles",
    "ScalarField3D", "VectorField3D",
    "allocate_scalar_field", "allocate_vector_field",
    "HashGrid",
]
```

**Subsystem 1 — Runtime** (`common_warp/runtime.py`):

```python
from contextlib import contextmanager

def init(device: str | None = None, deterministic: bool = False) -> None:
    """Initialize Warp runtime.

    Args:
        device: Warp device string ('cuda:0', 'cpu', or None for default).
        deterministic: If True, set env vars disabling non-deterministic kernels
                       and configure Warp for reproducible execution.

    Raises:
        RuntimeError: If Warp init fails or the requested device is unavailable.
    """

@contextmanager
def deterministic_context():
    """Context manager that ensures deterministic execution inside the block."""
```

**Subsystem 2 — Capture I/O** (`common_warp/capture.py`):

```python
from dataclasses import dataclass
from pathlib import Path
import numpy as np

@dataclass
class Capture:
    """In-memory representation of a capture file matching capture-v1.json schema."""
    manifest: dict       # See spec §2.7 — schema_version, sim, stack, config, run, payload, determinism
    payload: dict[str, np.ndarray]  # /steps/{N}/state/{field_name} → array, flattened

def write_capture(
    capture: Capture,
    path: str | Path,
    *,
    schema_version: str = "1.0.0",
) -> None:
    """Write capture to disk as <path>.h5 + <path>.json manifest sidecar.

    Args:
        capture: In-memory capture.
        path: Base path; .h5 and .json suffixes added automatically.
        schema_version: Accepts any version ≤ build's max-supported; defaults
                        to highest supported (1.0.0 at Phase 2 close; Phase 4
                        WU-A bumps to 1.1.0 and extends this function to accept
                        either version per spec § 2.7 schema-version
                        compatibility policy). Future schema versions: bump
                        max_supported in module-level constant.

    Raises:
        ValueError: If capture.manifest fails schema validation.
        OSError: On filesystem error.
    """

def read_capture(path: str | Path) -> Capture:
    """Read capture from disk. Path is base; .h5 and .json suffixes auto-resolved.

    Raises:
        FileNotFoundError: If .h5 or .json sidecar is missing.
        ValueError: If manifest fails schema validation or payload checksums mismatch.
    """
```

**Subsystem 3 — Determinism** (`common_warp/determinism.py`):

```python
def set_seed(seed: int) -> None:
    """Set global deterministic seed. Threads through to wp.set_seed plus
    Python's `random.seed` and NumPy's RNG."""

def get_seed() -> int:
    """Return the seed set by the most recent set_seed call.

    Raises:
        RuntimeError: If set_seed was never called.
    """

def assert_deterministic_run(
    sim_fn: callable,
    *,
    runs: int = 2,
    tolerance: float = 0.0,
) -> None:
    """Run sim_fn `runs` times, compare captures, assert match within tolerance.

    Args:
        sim_fn: Zero-arg callable that runs a sim and returns a Capture.
        runs: How many times to invoke (must be >= 2).
        tolerance: 0.0 means bit-exact. >0.0 admits epsilon-bounded matches.

    Raises:
        AssertionError: If captures diverge beyond tolerance. Error message
                        includes the max-abs-diff and first-diverging step.
    """
```

**Subsystem 4 — Particles** (`common_warp/particles.py`):

```python
import warp as wp
from dataclasses import dataclass

@dataclass
class Particles:
    """Particle storage compatible with capture-v1 schema.

    MPM-specific extensions (deformation gradient, material id, etc.) are
    NOT in this class — they live in the MPM sim's own particle wrapper.
    This base type ships position / velocity / mass only.
    """
    positions: wp.array            # wp.array(dtype=wp.vec3), shape (N,)
    velocities: wp.array           # wp.array(dtype=wp.vec3), shape (N,)
    masses: wp.array               # wp.array(dtype=wp.float32), shape (N,)

    @property
    def count(self) -> int: ...

    def to_capture_payload(self) -> dict[str, "np.ndarray"]:
        """Returns {'positions': (N, 3), 'velocities': (N, 3), 'masses': (N,)}.
        Keys match the standard particle-field naming used by Tier 2 particle
        diagnostics."""

    @classmethod
    def from_capture_payload(cls, payload: dict, device: str = "cuda:0") -> "Particles": ...

def allocate_particles(n: int, device: str = "cuda:0") -> Particles:
    """Allocate Particles with N elements, zeroed."""
```

**Subsystem 5 — Grids** (`common_warp/grids.py`):

```python
import warp as wp
from dataclasses import dataclass

@dataclass
class ScalarField3D:
    """3D scalar field, dense storage, compatible with capture-v1."""
    data: wp.array                 # wp.array(dtype=wp.float32, ndim=3), shape (Nx, Ny, Nz)
    spacing: tuple[float, float, float]
    origin: tuple[float, float, float]

    @property
    def shape(self) -> tuple[int, int, int]: ...

    def to_capture_payload(self) -> dict[str, "np.ndarray"]:
        """Returns {'data': (Nx, Ny, Nz), 'spacing': (3,), 'origin': (3,)}."""

    @classmethod
    def from_capture_payload(cls, payload: dict, device: str = "cuda:0") -> "ScalarField3D": ...

@dataclass
class VectorField3D:
    """3D vector field; matches ScalarField3D shape with extra component axis."""
    data: wp.array                 # wp.array(dtype=wp.vec3, ndim=3), shape (Nx, Ny, Nz)
    spacing: tuple[float, float, float]
    origin: tuple[float, float, float]

    @property
    def shape(self) -> tuple[int, int, int]: ...

    def to_capture_payload(self) -> dict[str, "np.ndarray"]:
        """Returns {'data': (Nx, Ny, Nz, 3), 'spacing': (3,), 'origin': (3,)}."""

    @classmethod
    def from_capture_payload(cls, payload: dict, device: str = "cuda:0") -> "VectorField3D": ...

def allocate_scalar_field(
    shape: tuple[int, int, int],
    *,
    spacing: tuple[float, float, float] = (1.0, 1.0, 1.0),
    origin: tuple[float, float, float] = (0.0, 0.0, 0.0),
    device: str = "cuda:0",
) -> ScalarField3D: ...

def allocate_vector_field(
    shape: tuple[int, int, int],
    *,
    spacing: tuple[float, float, float] = (1.0, 1.0, 1.0),
    origin: tuple[float, float, float] = (0.0, 0.0, 0.0),
    device: str = "cuda:0",
) -> VectorField3D: ...
```

**Subsystem 6 — Hash grid** (`common_warp/hashgrid.py`):

```python
import warp as wp

class HashGrid:
    """Thin wrapper over wp.HashGrid for SPH/MPM neighbor queries.

    Phase 2 minimal: construction, build, query. Phase 3.7 may add incremental
    rebuild and spatial-hash tuning helpers.
    """

    def __init__(self, cell_size: float, max_particles: int, device: str = "cuda:0"):
        """Construct an empty hash grid sized for up to max_particles."""

    def build(self, positions: wp.array) -> None:
        """Insert particles into the grid. Replaces previous contents."""

    def query_radius(self, point: wp.vec3, radius: float) -> wp.array:
        """Return indices of particles within `radius` of `point`.

        Returns wp.array(dtype=wp.int32), variable-length per call.
        """
```

**Subsystem 7 — Smoke simulator** (`common/common-warp/examples/hello/main.py`):

A 2D advection-diffusion of a scalar field on a small grid (recommended 64×64). Exercises subsystems 1–5 end-to-end (init, capture write, determinism, scalar field allocation). Produces a capture at `common/common-warp/examples/hello/captures/smoke-stack-e-ref.h5`. The smoke sim's tests live at `common/common-warp/tests/test_smoke_e2e.py` and gate W-3, W-5.

**What the Stack E port stages (5, 7, 8) import** (concrete examples):

Stage 8 (MPM Stack E):
```python
import common_warp as cw

cw.init(device="cuda:0", deterministic=True)
cw.set_seed(42)

# MPM-specific particle wrapper extends cw.Particles for its own state
particles = cw.allocate_particles(n=100_000)
grid = cw.allocate_scalar_field(shape=(64, 64, 64))
hashgrid = cw.HashGrid(cell_size=0.01, max_particles=100_000)

# ... MPM-specific kernels ...

capture = cw.Capture(manifest={...}, payload={...})
cw.write_capture(capture, "captures/mpm-multimaterial-stack-e/drop-impact-seed42-step1000")
```

Stage 5 (smoke Stack E):
```python
import common_warp as cw

cw.init(device="cuda:0", deterministic=True)
cw.set_seed(42)

density = cw.allocate_scalar_field(shape=(128, 128, 128))
velocity = cw.allocate_vector_field(shape=(128, 128, 128))

# ... Stam-Fedkiw split kernels ...

capture = cw.Capture(manifest={...}, payload={...})
cw.write_capture(capture, "captures/eulerian-smoke-stack-e/taylor-green-128cube-seed42-step500")
```

Stage 7 (LBM Stack E):
```python
import common_warp as cw

cw.init(device="cuda:0", deterministic=True)
cw.set_seed(42)

# LBM uses 19-component scalar fields per node — implemented as a wp.array
# of dtype wp.float32 with shape (Nx, Ny, Nz, 19). Not in cw.ScalarField3D
# directly; LBM sim wraps it.

# ... D3Q19 collision + streaming kernels ...

capture = cw.Capture(manifest={...}, payload={...})
cw.write_capture(capture, "captures/lattice-boltzmann-d3q19-stack-e/poiseuille-64x32-seed42-step1000")
```

### §1.9.2 Per-port directory architecture

Every sim-port stage (Stages 1–8) ships a directory at `<category>/<sim>/ref-stack-<X>/` with one of three shapes depending on stack. The shape is fixed; stages fill in file contents.

**Stack C port shape** (Stage 1, the only Stack C port in Phase 2):

```
<category>/<sim>/ref-stack-c/
├── CMakeLists.txt              # add_executable + target_link_libraries(... bit_physics::common_cpp)
├── README.md                   # 1-page overview: what differs from source, how to build/run
├── include/
│   └── <sim_module>/
│       └── kernels.hpp         # public types and kernel declarations
├── src/
│   ├── main.cpp                # CLI entrypoint, capture-write at termination
│   └── kernels.cpp             # kernel impl
├── shaders/
│   └── *.comp.glsl             # compute shaders (translated from WGSL/source)
├── tests/
│   ├── CMakeLists.txt          # add_executable per test, link to GTest + common-cpp
│   ├── test_mms.cpp            # Gate 4 (sim's MMS regime)
│   ├── test_tier1.cpp          # Gate 5
│   ├── test_tier2_<substack>.cpp  # Gate 6 (per sim's category)
│   ├── test_determinism.cpp    # Gate 10
│   └── test_equivalence.cpp    # Gate 11 (calls testkit equivalence harness)
├── config/
│   └── default.toml            # sim params (grid resolution, dt, etc.)
└── docs/
    └── port-notes.md           # delta from source: which decisions were made, what was inherited
```

**Stack D port shape** (Stages 2, 3, 4, 6 — spec items 2.1.D, 2.2.D, 2.4.D, 2.5.D):

```
<category>/<sim>/ref-stack-d/
├── pyproject.toml              # uv-managed, depends on common-py
├── README.md
├── <sim_module>_stack_d/       # Python package name; underscores not hyphens
│   ├── __init__.py
│   ├── main.py                 # CLI entrypoint, `python -m <sim_module>_stack_d`
│   ├── kernels.py              # @ti.kernel definitions
│   ├── config.py               # parameter dataclasses
│   └── _internal/              # private helpers
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # pytest fixtures (init Taichi, set seed, etc.)
│   ├── test_mms.py
│   ├── test_tier1.py
│   ├── test_tier2_<substack>.py
│   ├── test_determinism.py
│   └── test_equivalence.py
├── config/
│   └── default.toml
└── docs/
    └── port-notes.md
```

**Stack E port shape** (Stages 5, 7, 8 — spec items 2.4.E, 2.5.E, 2.3.E):

```
<category>/<sim>/ref-stack-e/
├── pyproject.toml              # uv-managed, depends on common-warp
├── README.md
├── <sim_module>_stack_e/
│   ├── __init__.py
│   ├── main.py
│   ├── kernels.py              # @wp.kernel definitions
│   ├── config.py
│   └── _internal/
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_<canonical_1>.py   # e.g., test_patch_test.py (MPM), test_taylor_green.py (smoke), test_poiseuille.py (LBM)
│   ├── test_<canonical_2>.py   # second canonical test from §1.5 verification regime
│   ├── test_tier1.py
│   ├── test_tier2_<substack>.py
│   ├── test_determinism.py
│   └── test_equivalence.py
├── config/
│   └── default.toml
└── docs/
    └── port-notes.md
```

**Module-name examples** (resolves underscore-vs-hyphen ambiguity):

- `continuous-ca/reaction-diffusion-2d/ref-stack-d/reaction_diffusion_2d_stack_d/`
- `hybrid-pg/mpm-multimaterial/ref-stack-e/mpm_multimaterial_stack_e/`
- `volumetric-grid/eulerian-smoke/ref-stack-d/eulerian_smoke_stack_d/`
- `lattice/lattice-boltzmann-d3q19/ref-stack-e/lattice_boltzmann_d3q19_stack_e/`

Hyphens in directory names (Python doesn't care); underscores in Python module names (Python requires).

### §1.9.3 Capture file naming and pairing convention

Captures live at `captures/<sim>-stack-<X>/<descriptor>.h5` + `<descriptor>.json` sidecar.

**`<descriptor>` is a structured filename**: `<test-name>-<config>-seed<N>-step<N>`. The descriptor is **stack-agnostic**, which is what lets the equivalence harness pair source and port captures by descriptor alone.

**Examples** (the actual filenames each stage produces):

| Sim | Test | Stack C source descriptor | Stack D port descriptor | Stack E port descriptor |
|---|---|---|---|---|
| reaction-diffusion-2d | Gray-Scott λ-spots | n/a (source is Stack B) | `gray-scott-lambda-512sq-seed42-step1000` | n/a |
| sph-water | Dam break 1M | `dam-break-1M-particles-seed42-step1000` | `dam-break-1M-particles-seed42-step1000` | n/a |
| mpm-multimaterial | Drop impact | n/a (source is Stack D) | n/a | `drop-impact-128cube-seed42-step500` |
| eulerian-smoke | Taylor-Green | `taylor-green-128cube-seed42-step500` | `taylor-green-128cube-seed42-step500` | `taylor-green-128cube-seed42-step500` |
| eulerian-smoke | Lid-driven cavity | `lid-driven-cavity-128sq-re100-seed42-step1000` | same | same |
| lattice-boltzmann-d3q19 | Poiseuille | `poiseuille-64x32-seed42-step1000` | same | same |
| lattice-boltzmann-d3q19 | Couette | `couette-32x16-seed42-step500` | same | same |

**Pairing rule** (consumed by equivalence harness): given source-stack `<S>` and port-stack `<P>` and sim `<sim>`, pair file `captures/<sim>-stack-<S>/<descriptor>.h5` with `captures/<sim>-stack-<P>/<descriptor>.h5`. If a port produces a descriptor that the source didn't produce, it has no equivalence partner — file as DEFERRED in §6.6 of the report.

**Required captures per port** (these are the minimum each stage must produce for Gates 4 + 11 to pass):

| Agent | Required descriptors |
|---|---|
| 2.1.C, 2.1.D | At minimum one Gray-Scott pattern descriptor that matches the source Stack B sim's primary capture |
| 2.2.D | Source-sim's primary dam-break-or-similar capture descriptor |
| 2.3.E | `drop-impact-<config>-seed42-step500` matching the source Stack D capture |
| 2.4.D, 2.4.E | Both `taylor-green-<config>-seed42-step500` and `lid-driven-cavity-<config>-re100-seed42-step1000` |
| 2.5.D, 2.5.E | Both `poiseuille-<config>-seed42-step1000` and `couette-<config>-seed42-step500` |

Agents are free to produce additional captures for their own diagnostic confidence; only the required ones gate Gate 11.

### §1.9.4 Equivalence harness invocation contract

Every sim-port stage's Gate 11 test invokes the equivalence harness with the same shape:

```bash
python -m testkit.equivalence \
  --source captures/<sim>-stack-<X-source>/<descriptor>.h5 \
  --port captures/<sim>-stack-<X-port>/<descriptor>.h5 \
  --tolerance-table tools/testkit/equivalence/tolerance.toml \
  --report-out docs/sim-specs/<category>/<sim>/equivalence-stack-<X-port>-fragment.md \
  --strict
```

`--strict` mode causes a non-zero exit code on any tolerance violation; the stage's Gate 11 test wraps this invocation and checks exit code.

**The fragment.md format** the harness produces:

```markdown
# Equivalence — <sim-name> Stack-<X-source> ↔ Stack-<X-port>

**Source capture:** captures/<sim>-stack-<X-source>/<descriptor>.h5 @ commit <SHA>
**Port capture:** captures/<sim>-stack-<X-port>/<descriptor>.h5 @ commit <SHA>
**Tolerance table:** tools/testkit/equivalence/tolerance.toml @ commit <SHA>
**Run date (UTC):** <ISO 8601>

## Verdict

PASS | PASS-WITH-OVERRIDE | FAIL

## Diff summary

- Max absolute diff: <value> at field `<name>`, step <N>, index <i, j, k>
- Max relative diff: <value> at field `<name>`, step <N>, index <i, j, k>
- L2 norm of diff at final step: <value>
- Tolerance applied: <abs=X, rel=Y> from <default-table-row | per-sim-override>

## Per-field breakdown

| Field | Max abs | Max rel | Verdict |
|---|---|---|---|
| ... | ... | ... | PASS / FAIL |

## Verbal rationale (PASS-WITH-OVERRIDE only)

<One paragraph from the stage justifying the per-sim override.>
```

The Stage 9 (landing) later stitches per-stack fragments into the canonical `docs/sim-specs/<category>/<sim>/equivalence.md` by concatenation under stack-specific headers.

### §1.9.5 Phase boundary contracts

**Phase 2 start state** (what each stage's Task X.1 probe should find true):

- `main` HEAD has Phase 1 reference sims committed.
- `common/common-ts/`, `common/common-cpp/`, `common/common-py/` exist; their `docs/common/{ts,cpp,py}.md` are present.
- `common/common-warp/` does NOT yet exist (Stage 0 creates it).
- `tools/testkit/schemas/capture-v1.json` exists, frozen at v1.0.0.
- `tools/testkit/equivalence/harness.py` exists; invokable as `python -m testkit.equivalence`.
- `tools/testkit/equivalence/tolerance.toml` exists with per-category default rows.
- `tools/testkit/code_verification/mms/solutions/` has at minimum heat-equation-1d; per Rule P3 a stage falls back to this if its sim's exact manufactured solution isn't yet vendored.
- `tools/testkit/golden/tables/` has at minimum the cubic-spline kernel table.
- `references/<vendored-upstreams>/` populated for SPlisHSPlasH and any LBM upstream Phase 1 vendored.
- `captures/<sim>-ref/` exists for each Phase 1 source sim with at least the descriptors named in §1.9.3 above.
- `docs/sim-specs/<category>/<sim>/spec-ref.md` exists for each Phase 1 source sim.

If any of the above is absent at stage kickoff, the stage reports BLOCKED per Rule P1.

**Phase 2 end state** (what `main` looks like after landing):

- All 8 `ref-stack-<X>/` directories present under their respective sim category dirs.
- `common/common-warp/` exists with the seven subsystems from §1.9.1.
- `docs/common/warp.md` exists.
- `captures/<sim>-stack-<X>/` exists for each of the 8 ports with at least the required descriptors from §1.9.3.
- `docs/sim-specs/<category>/<sim>/equivalence.md` exists for each sim with cross-stack ports, stitched from each stage's fragment.
- `tools/testkit/equivalence/tolerance.toml` has per-sim override rows (if any stage proposed them).
- `CHANGELOG.md`, `docs/project-state.md`, root `README.md` updated.
- `docs/_audits/phase-2/landing-<UTC>.md` is the closing audit.

### §1.9.6 Inter-stage wire diagram

Producer → consumer map across the 9 work stages + landing. This is the "wires" view: who plugs into what.

| Producer | Wire (what it makes available) | Consumer | Where it plugs in |
|---|---|---|---|
| Phase 1 | `captures/reaction-diffusion-2d-ref/gray-scott-*.h5` | 2.1.C, 2.1.D | Gate 11 source side |
| Phase 1 | `captures/sph-water-ref/dam-break-*.h5` | 2.2.D | Gate 11 source side |
| Phase 1 | `captures/mpm-multimaterial-ref/drop-impact-*.h5` | 2.3.E | Gate 11 source side |
| Phase 1 | `captures/eulerian-smoke-ref/{taylor-green,lid-driven-cavity}-*.h5` | 2.4.D, 2.4.E | Gate 11 source side |
| Phase 1 | `captures/lattice-boltzmann-d3q19-ref/{poiseuille,couette}-*.h5` | 2.5.D, 2.5.E | Gate 11 source side |
| Phase 1 | `common/common-cpp/` mature module | 2.1.C | `target_link_libraries(... bit_physics::common_cpp)` |
| Phase 1 | `common/common-py/` mature module | 2.1.D, 2.2.D, 2.4.D, 2.5.D | `pyproject.toml` dependency |
| Stage 0 | `common/common-warp/` package + `docs/common/warp.md` | 2.3.E, 2.4.E, 2.5.E | `import common_warp as cw` |
| Each port stage | `captures/<sim>-stack-<X>/<descriptors>.h5` | Self | Gate 11 port side |
| Each stage | `phase-2-stage-<N>-report.md` on `phase-2/working` | Coordinator | Queue-management steps 5-9 (§2.1) |
| Each stage | Commits to `origin/phase-2/working` at incremental HEAD SHAs | Stage 9 (landing) | Cross-cutting verification Tasks L.1-L.6 |
| Coordinator | `docs/_audits/phase-2/all-reports-<UTC>.md` | Stage 9 (landing) | Input to Task L.1 verification |
| Coordinator | Filled-in landing prompt (paste-ready) | Stage 9 (landing) (new session) | Session kickoff |

**Critical wires that must be plugged in exactly:**

1. **Stack E ports → Stage 0's API surface.** If Stage 5 imports `from common_warp import allocate_particles` but Stage 0 ships `allocate_particle_array`, every Stack E port stage fails. §1.9.1 fixes the names.
2. **Each port → source sim's capture path.** If the port reads `captures/eulerian-smoke-ref/<descriptor>.h5` and the source actually wrote to `captures/eulerian-smoke/ref/<descriptor>.h5`, Gate 11 can't find it. §1.9.3 fixes the path.
3. **Each port's capture → equivalence harness.** If the port writes `taylor_green_128cube_seed42_step500.h5` (underscores) but the harness expects `taylor-green-128cube-seed42-step500.h5` (hyphens), pairing fails. §1.9.3 fixes the form: **hyphens**, lowercase, components separated by single hyphen.
4. **Each stage's branch SHA → Stage 9 (landing).** If a stage's report says SHA `abc1234` but `origin/phase-2/working` is at `def5678`, Stage 9 Task L.5 catches the mismatch. Rule R1 enforces alignment.

### §1.9.7 What §1.9 does NOT specify (stage autonomy preserved)

The interfaces above are the sockets. The implementations behind them are each stage's autonomy:

- **Internal kernel structure** of each port (how many compute passes, how to fuse loops, what data layout for intermediate buffers).
- **Build flag specifics** beyond linking the right common-* module.
- **Test-implementation details** (which fixtures to share, how to parameterize pytest cases) — each stage follows language convention.
- **Python module internal organization** (whether to split kernels.py into submodules) — each stage picks what's readable.
- **C++ namespace conventions** within a port — Stage 1 (the only C++ stage) follows the sibling sim's pattern.

If a stage finds itself wanting to deviate from a socket spec (§1.9.1, §1.9.2, §1.9.3, §1.9.4), it surfaces BLOCKED with the proposed deviation as a `phase-2-stage-<N>-socket-deviation-<UTC-date>.md` audit. The founder decides whether to update §1.9 or constrain the stage back to the spec. Sockets are NOT stage-overrideable — that's the whole point of front-loading.

---

# Part 2 — The prompts

These are copy-paste-ready prompt blocks. Each prompt is bracketed by `--- PROMPT BEGIN ---` (or `--- PROMPT TEMPLATE BEGIN ---` for the parameterized §2.2 template) and `--- PROMPT END ---` markers; everything between the markers (inclusive) is the literal text to paste into the destination chat (Claude.ai for the coordinator, Claude Code for each stage and the landing).

The prompts refer to the live phase file at `docs/phases/phase-2-cross-stack-replication.md` — that path is the post-commit anchor and assumes this document has landed in the repo at the conventional location (Convention M-addendum). If the file is at a different path at execution time, the coordinator does a global find-and-replace before dispatching any stage.

## §2.1 Coordinator initial prompt — Claude.ai session

> **v5 amendment note (May 18 2026):** This section was originally written for a per-stage dispatch model in which the coordinator dispatched each stage separately and received per-stage reports. The v5 amendment at the top of this document supersedes that model with single-agent dispatch: ONE Claude Code agent runs the whole phase under auto-accept, working through Stages 0 → 9 sequentially within that role. The coordinator dispatches the phase opener once; the agent self-dispatches stage-to-stage; the coordinator only dispatches a continuation session if context fills. The §2.2 per-stage prompt template is no longer pasted into fresh Claude Code sessions stage-by-stage — it is a section the agent consults at each stage boundary. The coordinator brief below has been rewritten to match.

The coordinator chat is a fresh Claude.ai session in this project folder, opened once at Phase 2 start. Under the single-agent execution model, its role is light queue management: dispatch the phase opener once, receive one-line stage-close summaries from the agent, surface non-CONFIRMED verdicts to the founder, dispatch a continuation session only if context fills. It does not validate, probe, or run integrity gates — that's the agent's job.

--- PROMPT BEGIN (Coordinator — Claude.ai session) ---

You are the Phase 2 coordinator for the Bit-Physics portfolio. Phase 2 runs as 10 sequential stages on `main` (trunk-based per spec § 7.12). Per the v5 amendment, one Claude Code agent role runs the whole phase under auto-accept; you dispatch the phase opener once, receive each stage's one-line summary, and surface to the founder.

**The plan governs.** Read `docs/phases/phase-2-cross-stack-replication.md` end-to-end. Pay especially close attention to:

- The v5 amendment block at the top (trunk-based + single-agent dispatch + locked decisions).
- §1.4 (sequential stage decomposition — the order the agent follows).
- §1.7 (stage-completion report format).
- §1.8 (Rules P1–R3 — what the agent does autonomously vs. surfaces).
- §3.4.2 (founder-decision items — resolved in v5; verify with Steven that the v5 picks still hold).
- §3.5 (open-questions and known-unknowns).

You do not redesign the plan. Every dispatch and every founder-surface comes from the plan.

**What you do NOT do:**

- You do not dispatch each stage. The agent runs Stages 0 → 9 sequentially within one Claude Code session (or across continuation sessions on context-fill).
- You do not probe repo HEAD. The agent does that.
- You do not run integrity checks. The agent does.
- You do not edit stage reports.
- You do not write any sim, common-module, or test code.

**What you DO do:**

1. **Read the plan end-to-end.** `docs/phases/phase-2-cross-stack-replication.md`.

2. **Confirm with Steven** that the v5-locked decisions still hold (common-warp at Stage 0, no founder-decision overrides). If Steven overrides anything, apply the find-replaces from §3.4.2, commit to `main`, then proceed.

3. **Initialize the stage ledger.** Create `docs/_audits/phase-2/progress.md` (append-only). The agent will write one row per stage close.

4. **Dispatch the phase opener.** Spawn a fresh Claude Code session with auto-accept ON. Paste this prompt:

   ```
   You are the Phase 2 agent for Bit-Physics. Auto-accept is on. Read docs/phases/phase-2-cross-stack-replication.md in full (including the v5 amendment block at top). Work through Stages 0 → 9 sequentially per §1.4. The §2.2 per-stage prompt template is your reference for each stage's workflow shape. Commit directly to main per spec § 7.12. At each stage close, append a one-line summary to docs/_audits/phase-2/progress.md and report it back to me. Proceed to the next stage unless context is near full; in that case, write a CONTINUE_FROM cue and end cleanly.
   ```

5. **Receive each stage's one-line summary.** Format: `stage <N> <name> <verdict> <head-sha> <audit-path>`. Append to `docs/_audits/phase-2/progress.md` if the agent didn't already (it should).

6. **Run the rule-of-three pattern check (§3.5.4)** across the agent's stage reports as they accumulate. If a pattern repeats in three stages, file `docs/_audits/phase-2/pattern-<UTC>.md` and surface to the founder.

7. **For CONFIRMED verdicts:** acknowledge; the agent is already proceeding to the next stage.

8. **For SHIFTED, REFUTED, DEFERRED, BLOCKED, HALTED verdicts:** surface to Steven. Do not direct the agent to re-attempt without Steven's say-so.

9. **If the agent ends a session with a CONTINUE_FROM cue,** dispatch a continuation session:

   ```
   You are the Phase 2 agent for Bit-Physics, continuing from a prior session's context-fill checkpoint. Auto-accept on. Read docs/phases/phase-2-cross-stack-replication.md in full. Read docs/_audits/phase-2/progress.md for the CONTINUE_FROM cue. Resume at the named stage and proceed per §1.4.
   ```

10. **When Stage 9 (landing) reports CONFIRMED**, append the final ledger row with the closing-audit commit SHA. Tag the commit `v0.2.0-phase-2`. Surface phase-close to Steven.

**Conventions you operate under:**

- **The plan is authoritative.** If anything seems to disagree, surface to Steven (Hard-Rule-2).
- **Append-only audits.** The progress ledger and any pattern-audit files you create are append-only.
- **Convention-8** (no fabrications) applies to orchestration. Cite the ledger row, not memory.
- **Founder gates non-CONFIRMED verdicts.** The agent moves through CONFIRMED/SHIFTED-acceptable verdicts on its own; non-CONFIRMED surfaces wait for Steven.

When in doubt, ask Steven.

Begin with step 1.

--- PROMPT END ---

## §2.2 Per-stage prompt template

> **v5 amendment note:** Under single-agent dispatch (one agent runs the whole phase), this template is NOT pasted into fresh Claude Code sessions stage-by-stage. The agent reads the whole plan at session start; this template tells the agent what every stage's workflow shape is, and the §§2.3–2.11 stage data blocks fill in the per-stage specifics. Each stage is a section the agent consults, not a separate dispatch target.

Under the single-agent execution model, every work stage (Stages 0–8) shares an identical workflow shape: re-anchor probe → spec sheet → failing tests → implementation → capture + equivalence → gate verification → report. The differences between stages are the sim, the stack, the verification regime, and the required captures.


This section gives the agent a per-stage workflow shape that it consults at each stage boundary. Under v5 single-agent dispatch, the agent reads this template once at session start, then references it (with the relevant §2.3–§2.11 stage data block) at each stage boundary. The bracketed placeholders are substituted by the agent from the stage data block, not by the coordinator.

Stage 9 (landing) uses a different prompt — see §2.12.

--- PROMPT TEMPLATE BEGIN (Work Stage — what the agent does at each stage boundary) ---

You are the Phase 2 agent for the Bit-Physics portfolio. You are working on **Stage {STAGE_NUM} of Phase 2**. Your assignment: {STAGE_HEADLINE}.

Phase 2 runs as 10 sequential stages on `main` (trunk-based per spec § 7.12 + v5 amendment). You are stage {STAGE_NUM}. Every prior stage has already landed its work on `main`; you build on top of that.

**Read first** (in order):

1. `docs/phases/phase-2-cross-stack-replication.md` end-to-end. Pay especially close attention to §1.4 (sequential stage model — your place in the queue), §1.5 (eleven-gate acceptance criteria — your pass/fail bar), §1.6 (convention discipline), §1.7 (report-back template — your final deliverable), §1.8 (Rules P1–R3 — your decision-rule playbook for stuck situations), §1.9 (socket specifications — the interfaces you implement to), §3.6 (industry/academic standards anchored — verified citations for verification regimes).
2. `docs/architecture.md` {ARCHITECTURE_SECTIONS}.
3. {SOURCE_SPEC_SHEET}
4. `docs/common/{COMMON_MODULE}.md` — the API surface you consume.

**Source sim FACT:** {SOURCE_SIM_FACT}

**Branch:** `phase-2/working`. At the start of your session, sync to latest HEAD:

```bash
git fetch origin
git checkout phase-2/working || git checkout -b phase-2/working main  # only Stage 0 takes the second branch
git pull --ff-only
```

**Touch set** (paths you write):

{TOUCH_SET}

**Convergence-file updates you make** (no parallel agent is editing these; direct edit is fine):

- `CHANGELOG.md` — append your stage's entry under the Phase 2 section (create the section if Stage 0).
- `docs/project-state.md` — append your stage's row to the sim-coverage matrix.
- `tools/testkit/equivalence/tolerance.toml` — if your equivalence harness needs a per-sim override, add it directly.

**Verification regime** (your code-verification approach for Gate 4):

{VERIFICATION_REGIME}

**Tier 2 diagnostic substacks** (Gate 6): {TIER_2_SUBSTACKS}

**Cross-stack equivalence posture** (Gate 11): {EQUIVALENCE_POSTURE}

**Required captures** (you must produce these descriptors at minimum):

{CAPTURES_REQUIRED}

**Key risks for this stage:**

{KEY_RISKS}

**Ordered tasks:**

### Task {STAGE_NUM}.1 — Re-anchor probe

Verify every path mentioned in the phase file §1.4.3 row for Stage {STAGE_NUM} against repo HEAD. Verify your source-sim spec sheet exists at the path above. Verify the testkit harnesses at `tools/testkit/{equivalence,determinism,code-verification}/`.

If any precondition fails, file `phase-2-stage-{STAGE_NUM}-precondition-block-<UTC-date>.md` per Rule P1 in §1.8.1, report BLOCKED in your final report, and STOP. Do not silently adapt.

### Task {STAGE_NUM}.2 — Pre-implementation probe report

Author `tools/testkit/probes/reports/{PROBE_REPORT_NAME}.md` per the template at `tools/testkit/probes/template.md`. Enumerate (a) every common-{COMMON_MODULE} API surface your port will consume; (b) every upstream citation your port makes (vendored references, papers); (c) every test fixture your port produces; (d) every public symbol your port exports with file:line anchors (initially forward references).

Commit the probe report as your first new-file commit on `phase-2/working`.

### Task {STAGE_NUM}.3 — Spec sheet

Author `{SPEC_SHEET_OUTPUT}` per Layer 4 spec-sheet template structure. Sections: scope, source-sim reference, verification posture (cite §3.6 for the canonical references), determinism declaration, equivalence declaration, decision log.

FACT-tag every spec-anchored claim; INFERENCE-tag every choice motivated by source-sim conventions rather than the spec (v2.4 at execution time; v2.0/v2.1/v2.2/v2.3 commitments preserved through the v2.4 verification-hardening additions). Anchor-sketch labels per Convention-K for anything you'll re-verify later.

Commit as new-file.

### Task {STAGE_NUM}.0 — Cross-phase audit replay (Stage 0 ONLY; v6 amendment)

**This task runs only at Stage 0** — the first stage of Phase 2. Subsequent stages skip Task X.0 and begin at Task X.1.

Before any other action, run:

```bash
python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-<UTC>.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Expected: exit 0 with all gates matching the Phase 1 landing audit's claims.

- **Exit 0 → proceed to Task 0.1.** Record the replay-pass as a FACT in the Stage 0 report.
- **Exit 1 → BLOCKED.** Write `docs/_audits/phase-2/stage-0-blocked-replay-<UTC>.md`. Surface to operator. Do NOT begin Stage 0 work.

### Task {STAGE_NUM}.1 — Re-anchor probe

Verify every path mentioned in the phase file §1.4.3 row for Stage {STAGE_NUM} against repo HEAD. Verify your source-sim spec sheet exists at the path above. Verify the testkit harnesses at `tools/testkit/{equivalence,determinism,code-verification}/`.

If any precondition fails, file `phase-2-stage-{STAGE_NUM}-precondition-block-<UTC-date>.md` per Rule P1 in §1.8.1, report BLOCKED in your final report, and STOP. Do not silently adapt.

### Task {STAGE_NUM}.2 — Pre-implementation probe report

Author `tools/testkit/probes/reports/{PROBE_REPORT_NAME}.md` per the template at `tools/testkit/probes/template.md`. Enumerate (a) every common-{COMMON_MODULE} API surface your port will consume; (b) every upstream citation your port makes (vendored references, papers); (c) every test fixture your port produces; (d) every public symbol your port exports with file:line anchors (initially forward references).

Commit the probe report as your first new-file commit on `main`.

### Task {STAGE_NUM}.3 — Spec sheet

Author `{SPEC_SHEET_OUTPUT}` per Layer 4 spec-sheet template structure. Sections: scope, source-sim reference, verification posture (cite §3.6 for the canonical references), determinism declaration, equivalence declaration, decision log. § 6 declares ≥ 2 PBT-covered invariants per spec § 2.14.

FACT-tag every spec-anchored claim; INFERENCE-tag every choice motivated by source-sim conventions rather than the spec (v2.4 at execution time). Anchor-sketch labels per Convention-K for anything you'll re-verify later.

Commit as new-file.

### Task {STAGE_NUM}.4 — Test suite (failing pre-implementation) — with output-hash capture (v6 amendment)

Author the acceptance test suite under `{TEST_DIR}`. Tests must fail with implementation-missing errors, not import errors (per Rule I1, §1.8.2). Coverage:

- Public-API contract tests against the source-sim's expected behavior.
- Each canonical test from the verification regime above.
- Determinism: two runs of the same seed produce bit-identical (or epsilon-bounded per posture) captures.
- Property-based invariants (≥ 2 per spec § 6 declarations).
- Cross-stack equivalence: diff against the source-sim's capture(s) at matching descriptors.

Before committing, capture the failing test output per spec § 1.3 step 4:

```bash
pytest {TEST_DIR} -v 2>&1 | tee tools/testkit/failing-tests-evidence/{SIM}-stack-{X}-<UTC>.txt
sha256sum tools/testkit/failing-tests-evidence/{SIM}-stack-{X}-<UTC>.txt
```

Confirm the output shows `ModuleNotFoundError` / `NotImplementedError`, not a fixture or collection error. If wrong failure mode → fix test setup first, re-run, re-capture.

Commit the test files AND the failing-output evidence file together. Commit message:

```
phase2(stage{STAGE_NUM}/{SIM}): failing tests for stack-{X}

Failing-tests-output: tools/testkit/failing-tests-evidence/{SIM}-stack-{X}-<UTC>.txt
Failing-tests-output-hash: sha256:<full-hex>
```

### Task {STAGE_NUM}.5 — Implementation

Build {IMPL_DIR}. Match the source-sim's numerics exactly (parameter values, BC types, numerical scheme). Use the §1.9.1 / sibling-module API surfaces; do not invent new patterns.

Iterate to green. Commit as a sequence of new-files-first commits per Convention A. The first implementation commit footer includes:

```
Implements-failing-tests-from: <Task X.4 commit SHA>
Failing-tests-output-hash-witnessed: sha256:<same-hex-from-X.4>
```

### Task {STAGE_NUM}.6 — Capture, equivalence, schema-corpus seed, perf-ledger row

Run the port under deterministic seed for each required capture descriptor. Capture files land at `captures/{SIM}-stack-{X}/<descriptor>.h5` + `.json` per §1.9.3.

**Schema-corpus seed (v6 amendment).** For one canonical descriptor, copy the produced capture to `tests/fixtures/legacy-captures/phase-2-{SIM}-stack-{X}.h5` + `.json` sidecar. This is the entry Phase 4 WU-A will round-trip through the post-schema-bump reader.

**Performance-ledger row (v6 amendment).** Read `run.wall_clock_seconds` from your capture's manifest. Append a row to `docs/perf-ledger.md`:

```
| {SIM} | stack-{X} | <descriptor> | <wall_clock> | <hardware-id> | <commit-sha> | <date> | baseline |
```

Invoke the equivalence harness per §1.9.4 (now with tolerance-budget gating):

```bash
python -m testkit.equivalence \
  --source captures/{SIM}-{SOURCE_REF_DIR}/<descriptor>.h5 \
  --port captures/{SIM}-stack-{X}/<descriptor>.h5 \
  --tolerance-table tools/testkit/equivalence/tolerance.toml \
  --tolerance-budget tools/testkit/equivalence/tolerance-budget.toml \
  --report-out docs/sim-specs/{CATEGORY}/{SIM}/equivalence-stack-{X}-fragment.md \
  --strict
```

If the harness FAILs:
- **Narrow miss (within 10× of tolerance):** Rule V1 applies. Propose a per-sim tolerance override directly in `tools/testkit/equivalence/tolerance.toml`. **Cat-X check (v6 amendment):** if the proposed override exceeds `tolerance-budget.toml` cap, the override is invalid. Either (a) tighten the tolerance proposal (more numerical work) or (b) surface a tolerance-budget-amendment proposal to the owner per spec § 2.6 (separate operator-approved commit). The agent does NOT amend the budget unilaterally.
- **Wide miss (>10× tolerance):** Rule V2 applies. This is a real correctness defect. File `phase-2-stage-{STAGE_NUM}-equivalence-defect-<UTC-date>.md`, surface as INCOMPLETE.

### Task {STAGE_NUM}.7 — Gate verification

Run all integrity Cats and Tier-1 diagnostics against your stage's commits:

```bash
python -m integrity --check-all --against HEAD
python -m testkit.diagnostics --tier 1 --sim {SIM} --stack {X}
python -m testkit.diagnostics --tier 2 --sim {SIM} --stack {X}
python -m testkit.determinism --sim {SIM} --stack {X}
```

All must report green. If any are red, fix; do not add `# integrity-allow` annotations without founder approval.

For sim equivalence specifically, stitch your stage's fragment into the canonical `docs/sim-specs/{CATEGORY}/{SIM}/equivalence.md`. If the file doesn't exist (your stage is the first to port this sim), create it. If it exists (a sibling Stack already landed), append your stack's section.

### Task {STAGE_NUM}.8 — Final report

Author `phase-2-stage-{STAGE_NUM}-report.md` at the repo root, per the §1.7.1 template. Fill in the eleven-gate table with PASS/FAIL + evidence path per gate. Fill in §6 sub-blocks (tolerance.toml entry, CHANGELOG entry, project-state.md row, deferred items, anchor-sketch log) with `(none)` for sub-blocks that don't apply.

Required field: **Branch HEAD SHA** in front-matter. Per Rule R1 (§1.8.4), you MUST push your final commit (the report) to `origin/phase-2/working` BEFORE asserting the SHA. The SHA is `git rev-parse origin/phase-2/working` after push.

Commit the report as your final commit on `phase-2/working`. Notify the coordinator that Stage {STAGE_NUM} is COMPLETE.

**Conventions you operate under** (priority order):

- **Convention #8 (no memory-asserted specifics):** Every API signature, vendored citation, schema field, or test-tolerance value comes from a probe — grep, web-fetch, or view — not from training memory.
- **Convention M (re-anchor before edit):** Before editing any file, `view` it. View, edit, view again to confirm.
- **Convention C, D (probe surfaces and call sites):** Before writing impl, your probe report has enumerated every common-{COMMON_MODULE} surface you call.
- **Convention K (anchor-sketch labeling):** Every inference from sibling-module patterns rather than spec is labeled in your spec sheet.
- **Convention A (new-files-first):** Commit sequence is probe report → spec sheet → tests → impl → captures → convergence-file edits → report.
- **Convention 7.10 (rule-of-three promotion):** If your stage needs a utility that "would naturally live in common-{COMMON_MODULE}", do NOT extend the common module. Inline the utility in your port. File the pattern in §6.6 (deferred). Rule I3 applies.
- **Rules P1–R3 (§1.8):** Decision rules for stuck situations. Read once before starting; reference as needed.

**Anti-patterns to avoid:**

- Asserting any API signature, capture-format field, or upstream SHA from memory. Probe.
- Skipping the probe report and going straight to the spec sheet. The probe is load-bearing.
- Inventing capture descriptors that don't match the source-sim's descriptors. Equivalence pairing breaks.
- Mass-rewriting Stage N-1's code "for clarity." You modify only your touch set.

**What you escalate (do NOT silently adapt):**

- Vendored upstream missing or at unexpected SHA → Rules P1, P2.
- Manufactured solution missing from testkit → Rule P3.
- Performance regression vs source → Rule I2 (defer; Phase 5 territory).
- Numerical instability under `--deterministic` → Rule I4 (fix; determinism is mandatory).
- Wide equivalence miss → Rule V2.
- Anything else that feels out of scope → Rule §1.8.5 — file BLOCKED, surface to founder via coordinator.

You are autonomous within your touch set. Begin with Task {STAGE_NUM}.1.

--- PROMPT TEMPLATE END ---

The coordinator substitutes the bracketed placeholders using the per-stage data block in §2.3–§2.11.

---

## §2.3 Stage 0 — common-warp bootstrap

**STAGE_HEADLINE:** bootstrap the `common/common-warp/` module per §1.9.1 (seven-subsystem minimal API) so subsequent stages can use it.

**ARCHITECTURE_SECTIONS:** Part IV §4.5 (Stack E description), Part III §3.4 (Layer 3 per-module requirements), Part II §§2.5–2.7 (capture format, determinism, equivalence).

**SOURCE_SPEC_SHEET:** Not applicable — Stage 0 has no source sim. Read `docs/common/cpp.md` and `docs/common/py.md` for sibling-module conventions; structure `docs/common/warp.md` to match.

**COMMON_MODULE:** N/A — Stage 0 *creates* common-warp. Substitute "py" for the API-surfaces-probed instruction (sibling reference).

**SOURCE_SIM_FACT:** This stage has no source sim. It produces the `common/common-warp/` module that Stages 5, 7, 8 will consume. The seven-subsystem minimal API at §1.9.1 is the authoritative contract. Stage 0 implements exactly that surface — no more, no less. The seven subsystems are: Runtime, Capture I/O, Determinism, Particles, Grids, Hash grid, Smoke simulator (at `examples/hello/`).

**TOUCH_SET:**

- `common/common-warp/**`
- `docs/common/warp.md`
- `tools/testkit/probes/reports/common-warp-probe.md`
- `references/Warp/` (if vendoring decision per §1.8.1 Rule P1 calls for it; default is pinned-version, not vendored)
- `CHANGELOG.md` (create Phase 2 section if not present; add Stage 0 entry)
- `docs/project-state.md` (add common-warp v0.1.0 row to module-coverage section)
- `phase-2-stage-0-report.md` (last commit on `phase-2/working`)

**VERIFICATION_REGIME:** Stage 0 is module-build, not sim-port. The Stage 0 "verification" is the smoke simulator at `common/common-warp/examples/hello/` running deterministically and producing a capture diffable against a sibling-module's smoke capture (probe `common-py` for a comparable hello sim). Acceptance is the six-gate criteria at §1.5.2, not the eleven-gate sim-port criteria.

**TIER_2_SUBSTACKS:** scalar-field substack (the smoke sim's grid output).

**EQUIVALENCE_POSTURE:** Smoke-sim cross-module diff (Stack E ↔ Stack D smoke). Per spec §2.6 default table for the simplest categories: bit-exact same-stack, epsilon 1e-5 cross-stack. The smoke sim is small enough to admit bit-exact same-stack-same-hw; document the actual achieved posture in `docs/common/warp.md` §8.

**CAPTURES_REQUIRED:** One capture from the smoke sim at `common/common-warp/examples/hello/captures/smoke-stack-e-ref.h5` with descriptor matching the sibling-module's smoke capture (probe to determine).

**KEY_RISKS:**

- **Warp API changes** — Convention #8 forbids asserting Warp API from memory; every signature is web-fetched at probe time.
- **Vendoring decision** — Warp itself is pinned-version vs. vendored. Default: pinned. If pinned, declare the version in `common/common-warp/pyproject.toml`. If vendored, populate `references/Warp/`. Document in `docs/common/warp.md` decision log.
- **Scope creep into Phase 3.7 territory** — §1.9.1 enumerates what's IN scope; the "Explicitly NOT in scope" list under §2.3 (autodiff beyond a minimal `wp.Tape` exercise, NanoVDB beyond `wp.Volume`, USD, Newton, 3DGS, mesh primitives) is the boundary. If you find yourself building one of these, STOP and surface per Rule W1 (§1.8.2).

**PROBE_REPORT_NAME:** `common-warp-probe`

**SPEC_SHEET_OUTPUT:** `docs/common/warp.md`

**TEST_DIR:** `common/common-warp/tests/`

**IMPL_DIR:** `common/common-warp/common_warp/` (Python package per §1.9.1)

**SIM:** `common-warp-smoke` (descriptor used in capture path; in `captures/common-warp-smoke-stack-e/`)

**X:** `e`

**CATEGORY:** N/A — common modules don't live in a sim category. The fragment goes to `docs/common/warp-equivalence-fragment.md` and is stitched into `docs/common/warp.md` §6.

**SOURCE_REF_DIR:** Probe `common-py` for its smoke capture path; that's your source.

Acceptance: §1.5.2 six-gate Stage 0 criteria (not the eleven-gate sim-port set).

---

## §2.4 Stage 1 — RD-2D → Stack C / Vulkan

**STAGE_HEADLINE:** port `reaction-diffusion-2d` from Stack B (TypeScript / WebGPU) to Stack C (C++ / Vulkan).

**ARCHITECTURE_SECTIONS:** Part IV §4.3 (Stack C), Part V §5.2 (continuous-CA / reaction-diffusion as a category), Part II §§2.2–2.7.

**SOURCE_SPEC_SHEET:** `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md` — the Stack B source-of-truth.

**COMMON_MODULE:** `cpp`

**SOURCE_SIM_FACT:** Reaction-diffusion-2d is 2D Gray-Scott (Pearson, "Complex Patterns in a Simple System," *Science* 261(5118):189-192, 1993). The Phase 1 reference is on Stack B. Your port lands at `continuous-ca/reaction-diffusion-2d/ref-stack-c/`.

**TOUCH_SET:**

- `continuous-ca/reaction-diffusion-2d/ref-stack-c/**`
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-c.md`
- `tools/testkit/probes/reports/reaction-diffusion-2d-stack-c-probe.md`
- `captures/reaction-diffusion-2d-stack-c/**`
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (create — Stage 1 is the first to need it)
- `CHANGELOG.md` (append Stage 1 entry under Phase 2)
- `docs/project-state.md` (append row)
- `tools/testkit/equivalence/tolerance.toml` (only if per-sim override needed)
- `phase-2-stage-1-report.md`

**VERIFICATION_REGIME:** RD-2D admits MMS verification of the diffusion operator (a manufactured 2D Gaussian decay solution gives second-order spatial convergence; cite Salari & Knupp 2000, SAND2000-1444, per §3.6 reference 1). The reaction kinetics (Gray-Scott F-k feed-kill) verify by Pearson pattern reproduction (cite Pearson 1993). Specifically: at canonical parameter values (F=0.0367, k=0.0649; the "λ-spots" regime in Pearson's diagram), the port at 512² grid evolves to the same pattern class as the Stack B source within visual + spectral tolerance.

**TIER_2_SUBSTACKS:** scalar-field substack — mass conservation per-species, monotonicity for the diffusion operator alone, bounded-range invariant for u and v.

**EQUIVALENCE_POSTURE:** Per spec §2.6 RD row — bit-exact same-stack, epsilon 1e-5 cross-stack. RD has no atomics and is highly equivalence-friendly.

**CAPTURES_REQUIRED:**

- `gray-scott-lambda-512sq-seed42-step1000` — primary λ-spots descriptor (matches Phase 1 Stack B source).
- Probe Phase 1's Stack B source for any additional descriptors it produces; match them.

**KEY_RISKS:**

- **WGSL → GLSL translation.** Stack B uses WGSL compute shaders; Stack C uses GLSL/SPIR-V. Direct translation is mechanical for arithmetic but watch for vector-component access order (`.xyzw` ordering is identical; texelFetch vs imageLoad differs).
- **FP32 vs FP64.** Match source's precision posture exactly. If source is FP32, port is FP32.
- **Boundary conditions.** Toroidal wrap, Neumann, Dirichlet — match source's choice exactly. Document in spec sheet §4.

**PROBE_REPORT_NAME:** `reaction-diffusion-2d-stack-c-probe`

**SPEC_SHEET_OUTPUT:** `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-c.md`

**TEST_DIR:** `continuous-ca/reaction-diffusion-2d/ref-stack-c/tests/`

**IMPL_DIR:** `continuous-ca/reaction-diffusion-2d/ref-stack-c/` (C++ + shaders + CMakeLists.txt per §1.9.2 Stack C shape)

**SIM:** `reaction-diffusion-2d`

**X:** `c`

**CATEGORY:** `continuous-ca`

**SOURCE_REF_DIR:** `reaction-diffusion-2d-ref` (or whatever Phase 1's Stack B captures directory is named — probe at start)

---

## §2.5 Stage 2 — RD-2D → Stack D / Taichi

**STAGE_HEADLINE:** port `reaction-diffusion-2d` from Stack B (TypeScript / WebGPU) to Stack D (Python / Taichi).

**ARCHITECTURE_SECTIONS:** Part IV §4.4 (Stack D), Part V §5.2 (continuous-CA), Part II §§2.2–2.7.

**SOURCE_SPEC_SHEET:** `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md`. After Stage 1, also probe `spec-ref-stack-c.md` for the C++ port's decision log; useful sibling reference.

**COMMON_MODULE:** `py`

**SOURCE_SIM_FACT:** Same as Stage 1 — Gray-Scott (Pearson 1993). Port lands at `continuous-ca/reaction-diffusion-2d/ref-stack-d/`.

**TOUCH_SET:**

- `continuous-ca/reaction-diffusion-2d/ref-stack-d/**`
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md`
- `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md`
- `captures/reaction-diffusion-2d-stack-d/**`
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (append Stack D section)
- `CHANGELOG.md`, `docs/project-state.md`, `tools/testkit/equivalence/tolerance.toml` (as needed)
- `phase-2-stage-2-report.md`

**VERIFICATION_REGIME:** Same as Stage 1 — MMS for diffusion (Salari & Knupp 2000) + Gray-Scott pattern reproduction (Pearson 1993). Cross-stack equivalence is the load-bearing gate here since both Stack C and Stack D exist after Stage 2.

**TIER_2_SUBSTACKS:** scalar-field substack (same as Stage 1).

**EQUIVALENCE_POSTURE:** Bit-exact same-stack, epsilon 1e-5 cross-stack (per spec §2.6).

**CAPTURES_REQUIRED:**

- `gray-scott-lambda-512sq-seed42-step1000` — matching descriptor for cross-stack diff against both Stack B source and Stack C port from Stage 1.

**KEY_RISKS:**

- **Taichi field initialization order.** Taichi requires `ti.init()` before any kernel; init-after-kernel-decoration is a silent bug.
- **Kernel-launch grid sizing.** Match the source's grid; do not optimize for Taichi's natural block size unless the source did equivalent optimization.
- **Pattern reproduction across stacks.** Gray-Scott is chaotic at long time horizons; same-seed bit-exact is achievable for ~1000 steps but compounds. Document the step horizon at which cross-stack diff exceeds tolerance.

**PROBE_REPORT_NAME:** `reaction-diffusion-2d-stack-d-probe`

**SPEC_SHEET_OUTPUT:** `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md`

**TEST_DIR:** `continuous-ca/reaction-diffusion-2d/ref-stack-d/tests/`

**IMPL_DIR:** `continuous-ca/reaction-diffusion-2d/ref-stack-d/reaction_diffusion_2d_stack_d/` (per §1.9.2 Stack D shape)

**SIM:** `reaction-diffusion-2d`

**X:** `d`

**CATEGORY:** `continuous-ca`

**SOURCE_REF_DIR:** `reaction-diffusion-2d-ref` (Phase 1 Stack B) — primary source. Also diff against `reaction-diffusion-2d-stack-c` (Stage 1) as secondary.

---

## §2.6 Stage 3 — SPH-water → Stack D / Taichi

**STAGE_HEADLINE:** port `sph-water` from Stack C (C++ / Vulkan, the Phase 1 primary) to Stack D (Python / Taichi).

**ARCHITECTURE_SECTIONS:** Part IV §4.4 (Stack D), Part V §5.4 (particle-fluid / SPH), Part II §§2.2–2.7.

**SOURCE_SPEC_SHEET:** `docs/sim-specs/particle-fluid/sph-water/spec-ref.md` — the Stack C source-of-truth. Also: `references/SPlisHSPlasH/` — vendored upstream.

**COMMON_MODULE:** `py`

**SOURCE_SIM_FACT:** SPH water sim is DFSPH (Bender & Koschier, "Divergence-Free Smoothed Particle Hydrodynamics," 2015; the algorithm vendored upstream in SPlisHSPlasH). Phase 1 reference is Stack C. Port lands at `particle-fluid/sph-water/ref-stack-d/`.

**TOUCH_SET:**

- `particle-fluid/sph-water/ref-stack-d/**`
- `docs/sim-specs/particle-fluid/sph-water/spec-ref-stack-d.md`
- `tools/testkit/probes/reports/sph-water-stack-d-probe.md`
- `captures/sph-water-stack-d/**`
- `docs/sim-specs/particle-fluid/sph-water/equivalence.md` (create)
- `CHANGELOG.md`, `docs/project-state.md`, `tools/testkit/equivalence/tolerance.toml`
- `phase-2-stage-3-report.md`

**VERIFICATION_REGIME:**

1. **Cubic-spline kernel golden table** (per spec §11.1 item 0.5 / §2.4 — canonical Phase 0 deliverable). Your port's kernel evaluation reproduces the golden table to machine epsilon.
2. **Dam-break setup** (industry-standard SPH benchmark, cite Monaghan, "Smoothed Particle Hydrodynamics," *Reports on Progress in Physics* 68:1703-1759, 2005; reproducible against SPlisHSPlasH's published dam-break example). Your port at matched parameters produces a frame-1000 capture that diffs against the source within particle-equivalence tolerance.
3. **Momentum and mass conservation.** Closed-system invariants — total momentum and total mass constant within machine epsilon over 1000 steps.

**TIER_2_SUBSTACKS:** particle substack — no overlapping positions, neighbor-list integrity, momentum conservation, particle-count invariance.

**EQUIVALENCE_POSTURE:** Per spec §2.6 SPH row — epsilon same-stack (atomics induce non-bit-exact), epsilon cross-stack 1e-4 relative. Document atomic-scatter operations and ordering in spec sheet §8.

**CAPTURES_REQUIRED:**

- `dam-break-1M-particles-seed42-step1000` (or whichever descriptor Phase 1's Stack C source uses — probe).

**KEY_RISKS:**

- **Atomic scatter ordering.** SPH neighbor accumulation uses atomics. Bit-exact cross-stack is NOT expected.
- **Kernel parameterization.** SPlisHSPlasH's DFSPH has many tunable parameters. Match the source's parameter values exactly; do not adopt SPlisHSPlasH defaults if the source overrides them.
- **Particle-count drift.** SPH conserves particle count by construction; drift is a bug.
- **Hash-grid utility temptation.** SPH wants a hash-grid for neighbor queries. Do NOT add it to common-py per Rule I3 (§1.8.2) — inline in your port. File the pattern in §6.6.

**PROBE_REPORT_NAME:** `sph-water-stack-d-probe`

**SPEC_SHEET_OUTPUT:** `docs/sim-specs/particle-fluid/sph-water/spec-ref-stack-d.md`

**TEST_DIR:** `particle-fluid/sph-water/ref-stack-d/tests/`

**IMPL_DIR:** `particle-fluid/sph-water/ref-stack-d/sph_water_stack_d/`

**SIM:** `sph-water`

**X:** `d`

**CATEGORY:** `particle-fluid`

**SOURCE_REF_DIR:** `sph-water-ref` (Phase 1 Stack C captures)

---

## §2.7 Stage 4 — Eulerian-smoke → Stack D / Taichi

**STAGE_HEADLINE:** port `eulerian-smoke` from Stack C (C++ / Vulkan, the Phase 1 primary) to Stack D (Python / Taichi).

**ARCHITECTURE_SECTIONS:** Part IV §4.4 (Stack D), Part V §5.6 (volumetric-grid fluid solvers), Part II §§2.2–2.7.

**SOURCE_SPEC_SHEET:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`.

**COMMON_MODULE:** `py`

**SOURCE_SIM_FACT:** Eulerian smoke is the Stam/Fedkiw stack: semi-Lagrangian advection with MacCormack correction, vorticity confinement, Jacobi pressure projection (Stam, "Stable Fluids," SIGGRAPH 1999; Fedkiw, Stam & Jensen, "Visual Simulation of Smoke," SIGGRAPH 2001; Selle, Fedkiw, Kim, Liu & Rossignac, "An Unconditionally Stable MacCormack Method," *Journal of Scientific Computing* 35:350-371, 2008). Phase 1 reference is Stack C. Port lands at `volumetric-grid/eulerian-smoke/ref-stack-d/`.

**TOUCH_SET:**

- `volumetric-grid/eulerian-smoke/ref-stack-d/**`
- `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-d.md`
- `tools/testkit/probes/reports/eulerian-smoke-stack-d-probe.md`
- `captures/eulerian-smoke-stack-d/**`
- `docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` (create)
- `CHANGELOG.md`, `docs/project-state.md`, `tools/testkit/equivalence/tolerance.toml`
- `phase-2-stage-4-report.md`

**VERIFICATION_REGIME:** Per spec §5.6 explicit posture: "MMS for code verification (manufactured solutions for incompressible Navier-Stokes); GCI for solution verification." Two canonical tests:

1. **Taylor 1923 2D decaying vortex** (commonly mis-named "Taylor-Green vortex" in CFD literature; the closed-form 2D solution is actually from Taylor, "On the decay of vortices in a viscous fluid," *Philosophical Magazine* Series 6, 46(274):671-674, 1923, DOI:10.1080/14786442308634295). The 2D analytical decay envelope is `u(x,y,t) = U₀·cos(kx)·sin(ky)·exp(-2νk²t)`. Your port at 32², 64², 128² shows second-order spatial convergence of the L2 error against the analytical solution. Tolerance: order-of-accuracy within ±0.5 of formal order.
2. **Lid-driven cavity** (Ghia, Ghia & Shin, "High-Re solutions for incompressible flow using the Navier-Stokes equations and a multigrid method," *J. Comput. Phys.* 48(3):387-411, 1982; DOI:10.1016/0021-9991(82)90058-4). At Re=100, your port's centerline velocity profile matches Ghia's tabulated values within 1e-3 relative.

Solution-verification GCI per Roache 1994 (DOI:10.1115/1.2910291) — see §3.6 reference 3.

**TIER_2_SUBSTACKS:** scalar-field + vector-field substacks. Vector-field is critical: divergence-free where prescribed (max |∇·u| over the domain stays below 1e-5 at every captured step after projection).

**EQUIVALENCE_POSTURE:** Per spec §2.6 Stam/Fedkiw row — epsilon same-stack, epsilon cross-stack 1e-4 relative.

**CAPTURES_REQUIRED:**

- `taylor-green-128cube-seed42-step500`
- `lid-driven-cavity-128sq-re100-seed42-step1000`

**KEY_RISKS:**

- **Poisson solver.** The projection step is a Poisson solve. Probe `common/common-py/` for a canonical solver; if absent, inline one. Match the source's iteration count and tolerance, not the natural Taichi defaults.
- **MacCormack correction.** Subtle to get right; tracks 2 extra fields. Match source's implementation.
- **Capture file size.** 128³ field captures are non-trivial; verify HDF5 chunking is set per `tools/testkit/schemas/capture-v1.json`.

**PROBE_REPORT_NAME:** `eulerian-smoke-stack-d-probe`

**SPEC_SHEET_OUTPUT:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-d.md`

**TEST_DIR:** `volumetric-grid/eulerian-smoke/ref-stack-d/tests/`

**IMPL_DIR:** `volumetric-grid/eulerian-smoke/ref-stack-d/eulerian_smoke_stack_d/`

**SIM:** `eulerian-smoke`

**X:** `d`

**CATEGORY:** `volumetric-grid`

**SOURCE_REF_DIR:** `eulerian-smoke-ref` (Phase 1 Stack C captures)

---

## §2.8 Stage 5 — Eulerian-smoke → Stack E / Warp

**STAGE_HEADLINE:** port `eulerian-smoke` from Stack C (the Phase 1 primary) to Stack E (Python / NVIDIA Warp), consuming the common-warp module produced by Stage 0.

**ARCHITECTURE_SECTIONS:** Part IV §4.5 (Stack E), Part V §5.6 (volumetric-grid), Part II §§2.5–2.7. Read §1.9.1 again — common-warp's API is the contract.

**SOURCE_SPEC_SHEET:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`. Also `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-d.md` (Stage 4 sibling — useful for tracking decisions).

**COMMON_MODULE:** `warp` (specifically: `common_warp.ScalarField3D`, `common_warp.VectorField3D`, `common_warp.write_capture`)

**SOURCE_SIM_FACT:** Same Stam/Fedkiw stack as Stage 4. Port lands at `volumetric-grid/eulerian-smoke/ref-stack-e/`.

**TOUCH_SET:**

- `volumetric-grid/eulerian-smoke/ref-stack-e/**`
- `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-e.md`
- `tools/testkit/probes/reports/eulerian-smoke-stack-e-probe.md`
- `captures/eulerian-smoke-stack-e/**`
- `docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` (append Stack E section)
- `CHANGELOG.md`, `docs/project-state.md`, `tools/testkit/equivalence/tolerance.toml`
- `phase-2-stage-5-report.md`

**VERIFICATION_REGIME:** Same as Stage 4 — 2D decaying vortex (Taylor 1923) + lid-driven cavity (Ghia 1982). Cross-stack equivalence is now tri-stack (source C, Stack D port, Stack E port); equivalence.md should reflect all three.

**TIER_2_SUBSTACKS:** scalar-field + vector-field substacks.

**EQUIVALENCE_POSTURE:** Per spec §2.6 — epsilon same-stack, epsilon cross-stack 1e-4 relative.

**CAPTURES_REQUIRED:**

- `taylor-green-128cube-seed42-step500`
- `lid-driven-cavity-128sq-re100-seed42-step1000`

**KEY_RISKS:**

- **Warp kernel structure.** Different idiom from Taichi (`@wp.kernel` vs `@ti.kernel`; explicit type annotations; different launch syntax). Probe `common/common-warp/examples/hello/` for the canonical structure from Stage 0.
- **Common-warp socket fit.** If Stage 0's `ScalarField3D` API doesn't fit your needs, you do NOT extend common-warp unilaterally — Rule W1 (§1.8.2) requires founder-confirmed §1.9.1 amendment.
- **Cross-stack numerical drift.** Warp's CUDA backend uses fused-multiply-add (FMA) by default; same algorithm produces slightly different bit-patterns from Taichi or C++. Bit-exact cross-stack is not expected; the 1e-4 epsilon posture admits this.

**PROBE_REPORT_NAME:** `eulerian-smoke-stack-e-probe`

**SPEC_SHEET_OUTPUT:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-e.md`

**TEST_DIR:** `volumetric-grid/eulerian-smoke/ref-stack-e/tests/`

**IMPL_DIR:** `volumetric-grid/eulerian-smoke/ref-stack-e/eulerian_smoke_stack_e/`

**SIM:** `eulerian-smoke`

**X:** `e`

**CATEGORY:** `volumetric-grid`

**SOURCE_REF_DIR:** `eulerian-smoke-ref` (Phase 1 Stack C captures); also diff against `eulerian-smoke-stack-d` (Stage 4) as secondary.

---

## §2.9 Stage 6 — LBM-D3Q19 → Stack D / Taichi

**STAGE_HEADLINE:** port `lattice-boltzmann-d3q19` from Stack C (the Phase 1 primary) to Stack D (Python / Taichi).

**ARCHITECTURE_SECTIONS:** Part IV §4.4 (Stack D), Part V §5.7 (lattice methods / LBM), Part II §§2.2–2.7.

**SOURCE_SPEC_SHEET:** `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref.md`. Also: `references/Kruger-LBM/` — vendored Krüger et al. 2017 textbook companion (probe for actual path; spec §11.1 item 0.8 mentions an LBM vendored ref).

**COMMON_MODULE:** `py`

**SOURCE_SIM_FACT:** D3Q19 BGK around NACA airfoil per Krüger, Kusumaatmaja, Kuzmin, Shardt, Silva & Viggen, *The Lattice Boltzmann Method: Principles and Practice*, Springer, 2017 (companion code is D2Q9 only; D3Q19 lattice constants derived in `tools/testkit/golden/derivations/d3q19.md`). Phase 1 reference is Stack C. Port lands at `lattice/lattice-boltzmann-d3q19/ref-stack-d/`.

**TOUCH_SET:**

- `lattice/lattice-boltzmann-d3q19/ref-stack-d/**`
- `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-d.md`
- `tools/testkit/probes/reports/lattice-boltzmann-d3q19-stack-d-probe.md`
- `captures/lattice-boltzmann-d3q19-stack-d/**`
- `docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md` (create)
- `CHANGELOG.md`, `docs/project-state.md`, `tools/testkit/equivalence/tolerance.toml`
- `phase-2-stage-6-report.md`

**VERIFICATION_REGIME:** Per spec §5.7 explicit posture: "MMS for code verification; GCI for solution verification." Three canonical tests:

1. **D3Q19 equilibrium-distribution golden table** (closed-form per spec §11.1 item 0.5 / derivations at `tools/testkit/golden/derivations/d3q19.md`). For given (ρ, u), each of 19 directions has an exact equilibrium value. Your port reproduces to machine epsilon.
2. **Poiseuille flow** (textbook exact solution: parabolic profile `u(y) = u_max·(1 - (2y/H)²)` for pressure-driven channel flow; cite any standard fluid mechanics text, e.g., Krüger et al. 2017 §5.2). At resolutions 32×16, 64×32, 128×64, your port shows L2-error convergence against the analytical profile. Tolerance: 1e-3 relative.
3. **Couette flow** (linear profile `u(y) = U·y/H` for top-plate-driven channel; same Krüger reference). Tolerance: 1e-4 relative (no pressure gradient — purely streaming + collision).

Solution-verification GCI per Roache 1994 + Celik et al. 2008 (DOI:10.1115/1.2960953) for the Poiseuille refinement study.

**TIER_2_SUBSTACKS:** scalar-field substack — density positivity (ρ > 0 at every node), mass + momentum conservation (closed periodic domain), equilibrium-deviation bounds.

**EQUIVALENCE_POSTURE:** Per spec §2.6 LBM row — bit-exact same-stack with effort, epsilon cross-stack 1e-5. LBM is among the most bit-exact-friendly categories due to local collision + streaming (no atomics in the standard scheme).

**CAPTURES_REQUIRED:**

- `poiseuille-64x32-seed42-step1000`
- `couette-32x16-seed42-step500`

**KEY_RISKS:**

- **Lattice indexing convention.** D3Q19 has 19 velocity directions; indexing is convention-dependent (Qian-D'Humières vs. Lallemand-Luo). Match source's convention. Document in spec sheet §5.
- **Boundary conditions.** Bounce-back, equilibrium, Zou-He — many BC variants. Match source.
- **Precision posture.** LBM is sensitive to FP precision; match source's dtype.

**PROBE_REPORT_NAME:** `lattice-boltzmann-d3q19-stack-d-probe`

**SPEC_SHEET_OUTPUT:** `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-d.md`

**TEST_DIR:** `lattice/lattice-boltzmann-d3q19/ref-stack-d/tests/`

**IMPL_DIR:** `lattice/lattice-boltzmann-d3q19/ref-stack-d/lattice_boltzmann_d3q19_stack_d/`

**SIM:** `lattice-boltzmann-d3q19`

**X:** `d`

**CATEGORY:** `lattice`

**SOURCE_REF_DIR:** `lattice-boltzmann-d3q19-ref` (Phase 1 Stack C)

---

## §2.10 Stage 7 — LBM-D3Q19 → Stack E / Warp

**STAGE_HEADLINE:** port `lattice-boltzmann-d3q19` from Stack C (the Phase 1 primary) to Stack E (Python / NVIDIA Warp), consuming the common-warp module produced by Stage 0.

**ARCHITECTURE_SECTIONS:** Part IV §4.5 (Stack E), Part V §5.7 (lattice / LBM), Part II §§2.5–2.7. Read §1.9.1 again.

**SOURCE_SPEC_SHEET:** `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref.md`. Also `spec-ref-stack-d.md` from Stage 6.

**COMMON_MODULE:** `warp` (note: D3Q19 distribution functions are 19-component scalar fields; common-warp's `ScalarField3D` is single-component. Wrap a `wp.array(dtype=wp.float32, ndim=4)` directly per §1.9.1 import-example block; this is documented as "LBM-specific, not in common-warp" — see Risk D in the prior pass's confidence inventory.)

**SOURCE_SIM_FACT:** Same as Stage 6 — Krüger et al. 2017 D3Q19. Port lands at `lattice/lattice-boltzmann-d3q19/ref-stack-e/`.

**TOUCH_SET:**

- `lattice/lattice-boltzmann-d3q19/ref-stack-e/**`
- `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-e.md`
- `tools/testkit/probes/reports/lattice-boltzmann-d3q19-stack-e-probe.md`
- `captures/lattice-boltzmann-d3q19-stack-e/**`
- `docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md` (append Stack E section)
- `CHANGELOG.md`, `docs/project-state.md`, `tools/testkit/equivalence/tolerance.toml`
- `phase-2-stage-7-report.md`

**VERIFICATION_REGIME:** Same as Stage 6 — D3Q19 equilibrium golden table + Poiseuille + Couette. Equivalence.md should reflect all three stacks (C source, D port, E port).

**TIER_2_SUBSTACKS:** scalar-field substack.

**EQUIVALENCE_POSTURE:** Per spec §2.6 — bit-exact same-stack with effort, epsilon cross-stack 1e-5.

**CAPTURES_REQUIRED:**

- `poiseuille-64x32-seed42-step1000`
- `couette-32x16-seed42-step500`

**KEY_RISKS:**

- **19-component scalar field shape.** Stage 7 introduces a data shape (Nx, Ny, Nz, 19) that common-warp doesn't directly support. Stage 7's port wraps a `wp.array` directly. If a pattern emerges across Stages 6 + 7 ("both LBM ports needed the same wrapper"), the rule-of-three coordinator check might surface in §3.5.4 — but that's a Phase 3.7 maturation decision, not a Stage 7 decision.
- **Warp atomic semantics.** LBM streaming is local; no atomics needed for the standard scheme. If your implementation introduces atomics for any reason, document why (and expect to relax the bit-exact same-stack posture).
- **CUDA FMA.** Same risk as Stage 5 — FMA produces slightly different bit patterns vs Stack D / C; cross-stack is epsilon, not bit-exact.

**PROBE_REPORT_NAME:** `lattice-boltzmann-d3q19-stack-e-probe`

**SPEC_SHEET_OUTPUT:** `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-e.md`

**TEST_DIR:** `lattice/lattice-boltzmann-d3q19/ref-stack-e/tests/`

**IMPL_DIR:** `lattice/lattice-boltzmann-d3q19/ref-stack-e/lattice_boltzmann_d3q19_stack_e/`

**SIM:** `lattice-boltzmann-d3q19`

**X:** `e`

**CATEGORY:** `lattice`

**SOURCE_REF_DIR:** `lattice-boltzmann-d3q19-ref` (Phase 1 Stack C); also `lattice-boltzmann-d3q19-stack-d` (Stage 6).

---

## §2.11 Stage 8 — MPM-multimaterial → Stack E / Warp

**STAGE_HEADLINE:** port `mpm-multimaterial` from Stack D (Python / Taichi, the Phase 1 primary per spec §11.2) to Stack E (Python / NVIDIA Warp). This is the heaviest port in Phase 2 and the foundation for five Phase 4 frontier variants (§1.3.4 critical-path).

**ARCHITECTURE_SECTIONS:** Part IV §4.5 (Stack E), Part V §5.5 (hybrid-PG / MPM), Part II §§2.5–2.7. Read §1.9.1 (common-warp API) carefully — MPM consumes the most of common-warp's surface.

**SOURCE_SPEC_SHEET:** `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref.md` — the Stack D / Taichi source-of-truth, based on Hu et al. 2018's 88-line MLS-MPM reference (DOI:10.1145/3197517.3201293). Also: `docs/common/py.md`.

**COMMON_MODULE:** `warp` (consuming `common_warp.Particles`, `common_warp.HashGrid`, `common_warp.ScalarField3D` per §1.9.1)

**SOURCE_SIM_FACT:** MLS-MPM (Hu, Fang, Ge, Qu, Zhu, Pradhana & Jiang, "A moving least squares material point method with displacement discontinuity and two-way rigid body coupling," *ACM TOG* 37(4) Article 150, 2018; DOI:10.1145/3197517.3201293; MIT-licensed reference implementation at github.com/yuanming-hu/taichi_mpm). Multi-material support per spec §5.5: viscoelastic, plastic, granular constitutive models. Phase 1 reference is the 88-line Taichi version. Port lands at `hybrid-pg/mpm-multimaterial/ref-stack-e/`.

**TOUCH_SET:**

- `hybrid-pg/mpm-multimaterial/ref-stack-e/**`
- `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-e.md`
- `tools/testkit/probes/reports/mpm-multimaterial-stack-e-probe.md`
- `captures/mpm-multimaterial-stack-e/**`
- `docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md` (create)
- `CHANGELOG.md`, `docs/project-state.md`, `tools/testkit/equivalence/tolerance.toml`
- `phase-2-stage-8-report.md`

**VERIFICATION_REGIME:** MPM is hybrid particle-grid; pure MMS doesn't cleanly apply to the full system. Use the canonical-test-case battery (industry-standard for MPM verification):

1. **Patch test — uniaxial compression of an elastic bar.** Single material (linear elastic), single-direction loading. Exact analytical stress-strain. Tolerance: 1e-3 relative on final stress at steady state. Cite: standard solid-mechanics textbook (e.g., Bower, *Applied Mechanics of Solids*, CRC, 2010); the patch test is universal across MPM/FEM literature.
2. **Two-particle elastic collision conservation.** Two equal-mass elastic particles collide head-on. Momentum and energy conserve to 1e-4 relative over 1000 steps. Cite: any MPM textbook or Sulsky, Chen & Schreyer, "A particle method for history-dependent materials," *Comput. Methods Appl. Mech. Eng.* 118:179-196, 1994 (the canonical MPM paper).
3. **Drop-impact qualitative match against source.** A jelly cube drops onto a fixed floor; the source Stack D sim's frame-N capture and your port's frame-N capture diff within MPM-category tolerance.

**TIER_2_SUBSTACKS:** particle + scalar-field substacks. Particle: no overlap, neighbor integrity, momentum conservation, particle-count invariance. Scalar-field: grid-side conservation (Σm at each grid node consistent across substeps), monotonicity where prescribed.

**EQUIVALENCE_POSTURE:** Per spec §2.6 MPM row — epsilon same-stack, epsilon cross-stack 1e-4 relative. MPM is sensitive to P2G (particle-to-grid) atomic scatter order; document P2G ordering posture in spec sheet §8.

**CAPTURES_REQUIRED:**

- `drop-impact-128cube-seed42-step500` (matching the source Stack D descriptor)
- `patch-test-uniaxial-bar-seed42-step1000`
- `two-particle-collision-seed42-step1000`

**KEY_RISKS:**

- **P2G atomic ordering.** Same family of risk as SPH but with grid scatter. Document.
- **Numerical drift from Taichi → Warp.** Different execution backends round differently in FMA + reduction order. Bit-exact same-source-stack is not expected; epsilon-bounded is.
- **Scope creep into Warp autodiff.** Resist. Diff-MPM is Phase 4 (item 4.3 per spec §11.5). File a Phase 4 anchor note instead — Rule I3 (§1.8.2).
- **Heavy port.** Stage 8 is structurally larger than any other Phase 2 port (multi-material constitutive models; deformation gradient tracking; non-trivial particle update). Plan ~2× the implementation time of the LBM ports.
- **Phase 4 critical path.** Five Phase 4 frontier variants depend on this port (§1.3.4). Quality bar is correspondingly higher; do NOT take shortcuts that Phase 4 would have to rework.

**PROBE_REPORT_NAME:** `mpm-multimaterial-stack-e-probe`

**SPEC_SHEET_OUTPUT:** `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-e.md`

**TEST_DIR:** `hybrid-pg/mpm-multimaterial/ref-stack-e/tests/`

**IMPL_DIR:** `hybrid-pg/mpm-multimaterial/ref-stack-e/mpm_multimaterial_stack_e/`

**SIM:** `mpm-multimaterial`

**X:** `e`

**CATEGORY:** `hybrid-pg`

**SOURCE_REF_DIR:** `mpm-multimaterial-ref` (Phase 1 Stack D captures)

---

## §2.12 Stage 9 — Landing prompt (Claude Code session)

Stage 9 is structurally different from the work stages: the work is already on `phase-2/working` (eight sim-port stages + one common-warp stage have committed); Stage 9 does final cross-cutting verification, convergence-file polish, the closing audit, and the merge to `main`.

--- PROMPT BEGIN (Stage 9 — Landing — Claude Code session) ---

You are the Stage 9 (Landing) session for Phase 2 of the Bit-Physics portfolio. Stages 0–8 have completed; their work is on `phase-2/working`. Your single job: cross-cutting verification across the full phase, final convergence-file polish, the closing audit, and a clean merge to `main`.

**Read first:**

1. `docs/phases/phase-2-cross-stack-replication.md` end-to-end. Pay especially close attention to §1.4 (the stage queue you're closing), §1.5 (the eleven-gate criteria each prior stage gated against), §1.6 (conventions — Convention A new-files-first applies to your convergence commits too), §1.9 (socket specifications — your verification confirms these landed correctly).
2. Every prior stage's report at `phase-2-stage-<N>-report.md` for N = 0..8 (on `phase-2/working`). Read all nine; aggregate verdicts.
3. The full git log of `phase-2/working`: `git log --oneline main..phase-2/working`.

**Your authority and limits:**

- You merge `phase-2/working` to `main` per repo policy.
- You author the phase-closing audit.
- You do NOT alter any prior stage's deliverables. If a prior stage has a defect that surfaces during your verification, file `docs/_audits/phase-2/landing-defect-stage-<N>-<UTC>.md` with verdict DEFERRED, surface to coordinator, pause. The coordinator decides whether to dispatch a fix-up Stage 8.5 or accept the defect.
- You enforce strict-mode CI per spec §7.7. CI must be green on every commit.

**Ordered tasks:**

### Task L.1 — Cross-cutting integrity sweep

Run the integrity tooling against `main` end-to-end (per v5 amendment, all work is on `main`):

```bash
python -m integrity --check-all
python -m testkit.diagnostics --tier 1 --all-sims
python -m testkit.diagnostics --tier 2 --all-sims
python -m testkit.determinism --all-sims
```

All must report green. Cat-X (tolerance budget) MUST pass — any over-budget tolerance.toml override is a HARD_FAIL. If any fail, file a defect audit per the above and STOP.

### Task L.1a — Evidence-path verification sweep (v6 amendment)

```bash
for r in docs/_audits/phase-2/stage-*-report.md docs/_audits/phase-2/stage-*-checkpoint-*.md; do
    python -m integrity.scripts.verify_evidence --audit "$r" --strict || exit 1
done
```

Any failure → REFUTED; the stage's claims are unsupported by its evidence paths or hashes. STOP and surface.

### Task L.1b — Append-only audit check against v0.1.0-phase-1 (v6 amendment)

```bash
git diff v0.1.0-phase-1 HEAD -- docs/_audits/ | \
    python -m integrity.scripts.check_append_only --base-tag v0.1.0-phase-1
```

Any prior-phase audit file edited or shortened → REFUTED. STOP.

### Task L.1c — Failing-tests replay spot-check (v6 amendment)

Randomly pick 2 of the 8 per-port stages. For each, run:

```bash
git checkout <stage-failing-tests-commit-sha> -- <test-path>
pytest <test-path> 2>&1 > /tmp/replay-<stage>.txt
expected_hash=$(grep '^Failing-tests-output-hash:' <commit-message-of-stage-failing-tests>)
actual_hash=$(sha256sum /tmp/replay-<stage>.txt | cut -d' ' -f1)
[ "sha256:$actual_hash" = "$expected_hash" ] || exit 1
```

Mismatch → REFUTED. The stage's TDD claim is unsubstantiated. STOP.

### Task L.1d — Mutation-testing threshold gate (v6 amendment)

```bash
bash tools/testkit/mutation/run-mutation.sh --gate --baseline tools/testkit/mutation/phase-1-<UTC>.json
```

Any module whose mutation score has regressed below spec § 2.13 thresholds → HARD_FAIL. Surface; do not push tag.

Commit the new score JSON at `tools/testkit/mutation/phase-2-<UTC>.json` regardless of pass/fail.

### Task L.2 — Equivalence-harness sweep

For every (source, port) pair across the eight new ports, re-run the equivalence harness:

```bash
for descriptor in <each-required-descriptor-from-§1.9.3>; do
  python -m testkit.equivalence \
    --source <source-capture> \
    --port <port-capture> \
    --tolerance-table tools/testkit/equivalence/tolerance.toml \
    --tolerance-budget tools/testkit/equivalence/tolerance-budget.toml \
    --report-out /tmp/landing-equivalence-check-<descriptor>.md \
    --strict
done
```

Every diff must PASS or PASS-WITH-OVERRIDE (with the override already in `tolerance.toml` from the originating stage AND within `tolerance-budget.toml` cap). If any diff FAILs that previously PASSed, the offending stage's commits or a later stage's commits broke equivalence; investigate, file audit, STOP.

### Task L.2a — Performance-ledger review (v6 amendment)

Read `docs/perf-ledger.md`. For each Phase 2 port row, compare wall-clock against the source-stack's first-landing row. Flag any port > 2× slower with `regression: WATCH`. Append flagged rows to the closing audit's "Performance observations" section. This is informational, not blocking; surfaces to owner at landing review.

### Task L.3 — Convergence-file final polish

Each stage updated `CHANGELOG.md`, `docs/project-state.md`, `tools/testkit/equivalence/tolerance.toml` directly as they landed. Confirm:

- `CHANGELOG.md` has nine entries under "Phase 2 — Cross-stack replication" (Stages 0–8). If duplicates or missing rows, fix.
- `docs/project-state.md` has the eight new (sim, stack) coverage rows + the common-warp v0.1.0 module row. Phase 2 status row is updated to COMPLETE.
- `tools/testkit/equivalence/tolerance.toml` has per-sim override entries from any stage that proposed one. Each entry has a rationale field citing the equivalence.md fragment. **Each entry is within `tolerance-budget.toml` cap** (Task L.1 Cat-X confirms; this is a re-check).
- Per-sim `docs/sim-specs/<category>/<sim>/equivalence.md` files are stitched correctly across all stacks (source + Phase 2 ports). For sims with one Phase 2 port (RD-2D-C only has the C port; SPH only has D; MPM only has E), equivalence.md is the port's section. For multi-port sims (RD-2D has C+D, smoke has D+E, LBM has D+E), equivalence.md has source + each port section.
- `docs/perf-ledger.md` has eight new rows (one per port) from Task L.2a.
- `tests/fixtures/legacy-captures/` has eight new entries (one per port; per v6 schema-corpus growth).

Commit any polish as a single "Phase 2 — convergence-file final polish" commit.

### Task L.4 — Phase 2 closing audit

Author `docs/_audits/phase-2/landing-<UTC>.md` per the spec's audit-report convention (§3.2 of this phase plan):

- Front-matter per spec § 7.5 + Appendix G.7: date, author (Stage 9 Landing session), subject (Phase 2 closing), verdict (CONFIRMED expected), `evidence_paths`, `evidence_hashes` (for mutation JSON, perf-ledger snapshot, equivalence sweep outputs).
- Body: aggregate verdicts from all nine prior stages; equivalence-harness sweep results; integrity-check results (including Cat-X); evidence-path verification outcome (Task L.1a); append-only check outcome (Task L.1b); failing-tests replay outcomes (Task L.1c); mutation-threshold outcome (Task L.1d); perf-ledger observations (Task L.2a); deferred items list (from each stage's §6.6); link forward to Phase 3.
- §3.5 open-questions update: which §3.5 items were resolved during Phase 2; which carry forward to Phase 3.

Commit. This is the closing audit.

### Task L.5 — Closing-commit anchor re-check (Convention 7.9)

Re-view on `main`:

- `CHANGELOG.md` — every Phase 2 entry's commit SHA matches actual `main` SHA.
- `docs/project-state.md` — every audit link resolves.
- `tools/testkit/equivalence/tolerance.toml` — every Phase 2 override has a rationale AND is within `tolerance-budget.toml` cap.
- Sim-coverage matrix in `project-state.md` reflects 8 new (sim, stack) pairs + common-warp.
- `docs/perf-ledger.md` rows resolve to canonical descriptors per spec Appendix D § D.2.3.

### Task L.6 — (REMOVED — superseded by v5 trunk-based amendment.)

Per v5 amendment, all commits go directly to `main`. No merge step. This task is intentionally empty.

### Task L.7 — Post-landing verification

```bash
python -m integrity --check-all
python -m testkit.diagnostics --tier 1 --all-sims
```

Confirm green. Confirm CI on the latest `main` commit is green.

### Task L.8 — Convention #12 SHA back-fill

If your closing audit (Task L.4) references the landing SHA on `main`, back-fill as a *separate* follow-up commit. Do NOT amend any commit.

### Task L.9 — Prepare tag — DO NOT push (v6 amendment per spec § 7.12)

Append to the closing summary the proposed tag info:

```
Proposed tag: v0.2.0-phase-2
Tag commit SHA: <Task L.8 SHA, or Task L.4 SHA if no back-fill>
Tag pushed: NO (operator action required)
```

The agent does NOT run `git tag` or `git push origin <tag>`. The operator reviews the landing audit, runs `verify_evidence.py` independently, runs `replay_prior_phase.py --prior-phase phase-2` from a Phase 3 perspective as a pre-check, and pushes:

```
git tag -s v0.2.0-phase-2 <sha>
git push origin v0.2.0-phase-2
```

### Task L.10 — Report

Author `phase-2-stage-9-report.md` at the repo root on `main`. Per §1.7.1 template. Verdict, file manifest of the landing convergence commits, evidence paths, evidence hashes, post-landing observations, proposed-tag block. Notify coordinator.

**Conventions you operate under** (priority order):

- **Convention #8.** Verify every SHA, every test result, every gate-status before asserting in your audit.
- **Convention A.** Convergence-file polish is one commit; closing audit is the next; back-fill is the next; report is the last. New-files-first means the audit lands BEFORE the back-fill commit references it.
- **Convention #12.** No `--amend` after publication. SHA back-fill is a separate commit.
- **Hard Rule 2.** If anything looks wrong, STOP and surface. The phase has been clean for 9 stages; if Stage 9 finds a defect, that defect is real.
- **Operator-only tag pushing (spec § 7.12 + v6).** Agent never runs `git tag` or `git push origin <tag>`. The tag is the operator's act.

You are autonomous within your touch set. Begin with Task L.1.

--- PROMPT END ---

# Part 3 — Reference

## §3.1 Risk taxonomy and mitigations

Spec §9.4 enumerates a nine-category failure-mode taxonomy. Each category below restates the spec's definition, identifies the Phase 2-specific scenarios in which it could surface, and locates the mitigation in this phase plan or in convention discipline.

### §3.1.1 Category 1 — Anchor drift

**Definition (spec §9.4 Cat 1):** A path, line number, or symbol cited in spec text no longer points where the citation claims, due to repo evolution between citation and read.

**Phase 2 scenarios:**

- Every path in §1.3, §1.4.3 (per-stage touch sets) is an anchor sketch drafted before Phase 0/1 land. By the time Phase 2 executes, refinements during Phase 1 may have moved files.
- Agent prompts reference Phase 1 directory structures (e.g., `volumetric-grid/eulerian-smoke/ref/`) that Phase 1 may have organized differently.
- Cross-stage references (e.g., Stage 8 reading `common/common-warp/`) depend on Stage 0 having landed its directory at the expected path.

**Mitigations:**

- **Per-stage Task X.1** — re-anchor probe is the first task for every stage, before any other action. Each stage verifies the paths in its own touch set and consumed-dependencies set against repo HEAD; mismatches surface as BLOCKED reports immediately, before any wasted work.
- **Convention M-addendum** — this document lands at `docs/phases/phase-2-cross-stack-replication.md` before any stage is dispatched against it. Stable repo path before probe.
- **Stage 9 Task L.1** — cross-cutting integrity sweep re-checks every prior stage's commit chain against the stage-report manifests, catching anchor drift introduced during the phase.
- **Landing Task L.4** — closing-commit anchor re-check before merge to main.

**Escalation if surfaces:** Agent files a blocked-status audit and reports BLOCKED; coordinator surfaces to founder per §1.2.6.

### §3.1.2 Category 2 — API drift

**Definition (spec §9.4 Cat 2):** A public function or type signature cited in spec or sibling code no longer matches the implementation.

**Phase 2 scenarios:**

- the Stack E port stages (5, 7, 8) (2.3.E, 2.4.E, 2.5.E) consume `common-warp` whose API surface was just authored by Stage 0. If Stage 0's `docs/common/warp.md` and `common/common-warp/` source disagree, the Stack E port stages (5, 7, 8) will build against the wrong contract.
- Each port consumes its target stack's `common-<X>` module. If Phase 1 made undocumented changes to `common-cpp` or `common-py`, Phase 2 ports may target stale API.
- The testkit's `equivalence.harness.py` is consumed by every port's Gate 11 test. Schema or signature drift there breaks Phase 2 broadly.

**Mitigations:**

- **Stage 5/7/8 Task X.1 re-anchor** — each Stack E port stage re-anchor probes `common-warp` for self-consistency between `docs/common/warp.md` and `common/common-warp/` source before consuming. If Stage 0 shipped a defective contract, the next-consuming stage's probe surfaces it via BLOCKED report — caught at most one stage downstream of the defect.
- **Each per-stage Task X.2** (probe report) — enumerates consumed API surfaces verbatim with file:line anchors. Drift between probe and implementation is caught by Cat 2 check at gate 8.
- **Stage 9 Task L.1** — cross-cutting integrity check confirms Cat 2 green across all stages' work; defective contracts that slip past per-stage self-verification are caught at landing.
- **Convention C** — probe API surfaces before drafting. Verbatim. No paraphrase.

**Escalation if surfaces:** Cat 2 integrity check fails; the affected stage reports BLOCKED with the surface name. Coordinator surfaces to founder. Founder decides whether to send the originating stage back to fix, or escalate as a Phase 1 defect audit if the drift originates in sibling code.

### §3.1.3 Category 3 — Schema drift

**Definition (spec §9.4 Cat 3):** A data schema (HDF5 capture, tolerance.toml, audit-report front-matter) accepts data the consumer cannot read, or rejects data the producer claims to emit.

**Phase 2 scenarios:**

- Eight new capture files land under `captures/<sim>-stack-<X>/`. Each must conform to `tools/testkit/schemas/capture-v1.json`. Any deviation breaks the equivalence harness consumer.
- The `tools/testkit/equivalence/tolerance.toml` schema is touched by every port (per-sim overrides). Schema drift between stage expectation and table format breaks landing.
- Audit-report front-matter has structured fields per §1.6.4; mis-shaped fields fail the integrity Cat 4 draft-time check.

**Mitigations:**

- **Per-stage Gate 9** — capture file is testkit-replayable; equivalence harness accepts it. Mechanical check.
- **Per-stage Task X.6** — equivalence demonstration in the stage's own session, not deferred to landing. Schema mismatches surface early.
- **Landing Task L.6** — post-landing equivalence-harness run on all eight pairs.

**Escalation if surfaces:** Stage fails Gate 9 and reports INCOMPLETE; coordinator triages — typically the stage fixes its capture-write code; rare cases surface a testkit schema issue (file a Phase 0 defect audit).

### §3.1.4 Category 4 — Shader / kernel correctness

**Definition (spec §9.4 Cat 4):** GPU kernel code (shader, kernel, fused op) produces output inconsistent with its mathematical specification.

**Phase 2 scenarios:**

- Every sim port translates kernels across stacks. WGSL → GLSL/SPIR-V (Stack B → C). WGSL → `@ti.kernel` (Stack B → D). GLSL → `@ti.kernel` (Stack C → D). GLSL → `wp.kernel` (Stack C → E). Each translation is a correctness risk.
- Subtle correctness bugs (off-by-one in indexing, wrong atomic op, mis-translated barrier) may pass Gate 5 (Tier 1 diagnostics) and Gate 4 (MMS/golden) but fail Gate 11 (cross-stack equivalence) — or worse, pass all gates but produce subtly different physics that a future Layer 6 variant will surface.

**Mitigations:**

- **Gate 4** — MMS / golden-value tests. Mathematical correctness check, not stack-agnostic but per-stack.
- **Gate 11** — cross-stack equivalence. The hardest correctness gate; catches stack-translation bugs that pass Gate 4.
- **Convention C, D** — probe API surfaces and call sites before drafting. Forces explicit enumeration of what's being translated.
- **Per-sim risk callouts** in stage data blocks §2.3–§2.11 — each data block names the specific shader-translation risks for its sim/stack pair.

**Escalation if surfaces:** Stage's Gate 11 fails; the stage debugs; if root cause is genuinely subtle (e.g., a floating-point ordering issue inherent to the stack), the stage proposes a per-sim tolerance override documented in `equivalence.md` and surfaces to the founder via the coordinator.

### §3.1.5 Category 5 — Convention-#8 fabrication

**Definition (spec §9.4 Cat 5):** A stage's Claude Code session asserts a specific path, signature, line number, or external API detail from memory rather than from a probe, and the assertion is wrong.

**Phase 2 scenarios:**

- Stage 0 asserting `wp.X()` signatures from training-data memory rather than web-fetching current Warp docs.
- Any stage asserting "the source sim is at `<path>`" without re-anchoring.
- A stage reporting verdict COMPLETE while internally aware a gate did not actually pass.

This is the highest-frequency failure mode in chat-based Claude Code work at repo scale. It is named in repo memory as "Convention #8 — Architect-1 fabrication pattern."

**Mitigations:**

- **Convention #8** itself, cited in the §2.2 stage prompt template and the coordinator prompt (§2.1).
- **Per-stage Task X.1** (re-anchor probe) and **Task X.2** (probe report) enforce probe-before-assert discipline.
- **the Stack E port stages (5, 7, 8) probing common-warp** — if Stage 0 fabricated, the three the Stack E port stages (5, 7, 8) each re-probe `common-warp` and surface inconsistencies as BLOCKED.
- **Stage 9 Task L.1** — cross-cutting integrity sweep catches fabrications that passed per-stage self-verification.
- **Convention K** — anchor-sketch labeling on any inference-from-pattern claim.

**Escalation if surfaces:** Honest retraction is preferred over doubling down. Agent files a corrective audit, retracts the fabricated claim, and proceeds against the verified state.

### §3.1.6 Category 6 — Test-design fabrication

**Definition (spec §9.4 Cat 6):** A test that passes but does not actually verify what its name or location claims to verify (e.g., a "conservation test" that doesn't check conservation; an MMS test that uses a manufactured solution that's actually a trivial solution).

**Phase 2 scenarios:**

- A stage's Tier 2 diagnostic test, written quickly, may not actually exercise the diagnostic it names.
- An MMS test reusing the heat-equation manufactured solution for a reaction-diffusion port may pass for the wrong reason.
- Cross-stack equivalence tests using identical seeds and identical capture-write timing may pass even if the underlying simulations diverge — equivalence is on captured-state values, but if both captures are written at the same nominal step from independent runs that happened to align, false positives are possible.

**Mitigations:**

- **Gate 3** — tests committed and failing pre-implementation. A test that always passes (including when no implementation exists) is caught here.
- **Convention E** — spec-author-self-test review. The stage re-reads its own tests before commit, asking: does this actually verify what the name claims?
- **§1.7 report self-test** — every stage report includes a §7 self-test: "Did I fabricate any specifics? Are any claims not grep-verifiable?"

**Escalation if surfaces:** Stage 9 Task L.1 catches the false-positive test (during cross-cutting integrity sweep); Stage 9 files a defect audit, coordinator surfaces to founder. Founder dispatches a fix-up stage (or sends the originating stage back); phase delays by the re-work cycle but landing is correct.

### §3.1.7 Category 7 — Spec self-consistency

**Definition (spec §9.4 Cat 7):** Two sections of a spec document make contradictory claims; a stage following section A makes choices that section B prohibits.

**Phase 2 scenarios:**

- This phase plan (the document you are reading) may contain internal contradictions. Example: §1.4.3 specifies a touch set; §2.4 (Stage 1 data block) specifies a touch set; if they disagree, the stage has no oracle.
- The phase plan and spec v2.0 may disagree (e.g., the phase plan says `common-warp` is Phase 2 work; if a later spec revision back-dates this to Phase 1, the documents disagree).

**Mitigations:**

- **§3.3 FACT vs INFERENCE inventory** (below) — every claim in this document is tagged. FACTs cite spec section anchors; INFERENCEs are visibly reasoning over FACTs.
- **Convention F** — audit-prose freshness. Any audit referencing this phase plan re-verifies the plan section at audit time.
- **Hard Rule 2** — when spec disagrees with synced state (or with itself), pause and surface.

**Escalation if surfaces:** Agent files an audit naming the contradiction with both citations and reports BLOCKED. Coordinator surfaces to founder. Founder decides which side governs and updates this phase plan or the audit log accordingly. The coordinator does not adjudicate spec contradictions.

### §3.1.8 Category 8 — CI surface drift

**Definition (spec §9.4 Cat 8):** CI configuration drifts from spec — a check the spec requires is not exercised in CI, or a CI step that gates merge is no longer in the spec.

**Phase 2 scenarios:**

- The cross-stack equivalence harness must run in CI per spec §3.6 ("the cross-stack equivalence harness runs in CI and gates the second-stack merge"). If Phase 0's CI config doesn't include the harness, Phase 2 ports will pass locally but the spec-required gate isn't enforced.
- Per-sim Tier 2 diagnostics (Gate 6) must run in CI. If the CI matrix doesn't fan out per-sim, the diagnostic gate is hollow.
- Strict-mode CI per §7.7 must reject `# integrity-allow` annotations without coordinator approval.

**Mitigations:**

- **Per-stage Task X.1** — every stage probes its relevant CI integration points at start; missing CI surfaces as BLOCKED.
- **Landing Task L.6** — post-landing CI green confirmation on main.
- **Spec §7.7** — strict-mode CI, enforced by Cat 2 contract check on CI config itself.

**Escalation if surfaces:** Agent reports BLOCKED with CI-config evidence; coordinator surfaces to founder per Hard Rule 2 — CI configuration is upstream of Phase 2 scope, so the response is to re-open Phase 0 / Phase 1 work, not to patch CI inline.

### §3.1.9 Category 9 — Root-surface drift

**Definition (spec §9.4 Cat 9):** A root-level "marketing surface" (README gallery, project-state ledger, CHANGELOG) drifts from the actual sim coverage / phase state.

**Phase 2 scenarios:**

- After landing, the root README's stack-coverage gallery (if it exists per Phase 1 convention) must reflect 8 new (sim, stack) pairs.
- `docs/project-state.md` must reflect Phase 2 closed; Phase 3 next.
- `CHANGELOG.md` must include the Phase 2 entry with branch SHAs.

**Mitigations:**

- **§1.4.3** explicitly enumerates the convergence files; the Stage 9's prompt (§2.11) lists each.
- **Landing Task L.3** — the convergence-file commit chain explicitly sequences each root-surface update.
- **Landing Task L.4** — closing-commit anchor re-check confirms convergence-file updates landed; views each file before merge to main.

**Escalation if surfaces:** Stage 9 catches the missed surface at Task L.3 (convergence-file final polish) and applies the fix as part of its own commit chain. If the missed surface is caught only after merge to main, Stage 9 applies a follow-up commit (not `--amend`, per Convention #12) and files a corrective audit.

### §3.1.10 Phase-2-specific risks not in the §9.4 taxonomy

Two risks specific to Phase 2's structure are not classical §9.4 categories.

**Risk P2-α — Premature stage dispatch.** If the coordinator dispatches Stage N+1 before Stage N reports COMPLETE (or before the founder reviews), Stage N+1 sees an incomplete `phase-2/working` and may either fail to start or attempt to build against a defective baseline. Mitigation: §2.1 coordinator steps 5–9 require receiving each stage's report AND founder approval before dispatching the next. The coordinator's role is to gate dispatch on these two events per stage — not to validate the report content.

**Risk P2-β — Cross-stack tolerance over-permission.** The equivalence harness gate (Gate 11) admits tolerances; a stage under deadline pressure could propose a generous per-sim tolerance override that papers over a genuine correctness bug. Mitigation: every tolerance override has a per-sim `equivalence.md` justification, and Stage 9 (landing) Task L.2 re-runs the equivalence sweep — an override that was generous gets stress-tested when other stages' captures exercise it. Tolerance shopping is auditable post-hoc; the founder reviews at phase-close via `docs/_audits/phase-2/landing-<UTC>.md`.

**Risk P2-γ — Serial-execution wall-clock cost.** Sequential stages take longer in wall-clock than parallel ones by roughly the per-stage ratio. Phase 2's spec-§11.8 estimate of 2–3 months becomes a floor under serial execution; 3–4 months with founder review between stages is realistic. Mitigation: this is a deliberate trade-off accepted in §1.4.0 — serial throughput matches solo-developer review throughput, and the compound integration risk savings are large.

**Risk P2-δ — Single point of failure per stage.** If Stage 0 (common-warp) is defective, Stages 5, 7, 8 inherit the defect. If Stage 4 (smoke Stack D) is defective, Stage 5's equivalence diff is against a defective baseline. Mitigation: per-stage gate verification (the §1.5 eleven-gate criteria) catches defects before the next stage starts; the founder review at each stage boundary is the load-bearing quality gate. Under serial execution, defects surface immediately (when only one stage has landed them) rather than at landing time across nine branches.

**Risk P2-ε — Stage report fabrication (Convention #8 risk).** A Claude Code stage session might claim gates pass without verification. Mitigation: each report's §2 Gate Status table cites evidence paths (capture files, MMS reports, integrity-Cat outputs); the coordinator doesn't validate, but the founder review at each stage boundary checks for evidence-path presence and (sampled) content. If a report cites paths that don't exist, that's a Convention #8 violation surfaced at founder review.

## §3.2 Audit-trail discipline for Phase 2

### §3.2.1 Audit-report locations

Phase 2 audit reports land under `docs/_audits/`. The directory is bootstrapped with a `.gitkeep` if it does not exist; Stage 0 may create it.

Audit-file naming conventions for the serial-execution model:

- Precondition failure (per-stage): `phase-2-stage-<N>-precondition-block-<UTC-date>.md`
- Stage ledger (coordinator-maintained, append-only): `phase-2-stage-ledger.md`
- Per-stage blocked report: `phase-2-stage-<N>-blocked-<UTC-date>.md`
- Pattern audit (coordinator-authored, rule-of-three trigger per §3.5.4): `phase-2-pattern-<UTC-date>.md`
- Equivalence defect (per-stage): `phase-2-stage-<N>-equivalence-defect-<UTC-date>.md`
- Socket-deviation request (per §1.9.7, if a stage proposes a §1.9.1 amendment): `phase-2-stage-<N>-socket-deviation-<UTC-date>.md`
- Landing defect (Stage 9-authored): `phase-2-landing-defect-stage-<N>-<UTC-date>.md`
- Final phase audit (Stage 9-authored): `phase-2-landing-<UTC-date>.md`
- Deferred-defect cross-references to Phase 1: `phase-1-defect-<sim>-<UTC-date>.md` (lives at the Phase 1 audit directory if one exists, OR at `docs/_audits/` with phase-1 prefix for back-reference)

### §3.2.2 Required front-matter

Every audit report opens with a YAML or YAML-like front-matter block:

```yaml
---
date: <ISO 8601 with timezone>
author: <stage number (e.g. "Stage 4"), coordinator, or human name>
subject: <one-line subject>
phase: 2
verdict: <CONFIRMED | SHIFTED | REFUTED | DEFERRED | DISCONFIRMED-AT-HEAD | REFRAMED>
evidence-paths:
  - <relative path or URL>
  - <relative path or URL>
related-audits:
  - <relative path to prior or sibling audit>
---
```

### §3.2.3 Verdict states

Four primary plus two compound states (per repo memory's banked convention):

- **CONFIRMED** — the audit's claim grep-verifies against current disk; no action required.
- **SHIFTED** — the audit's claim was true at an earlier HEAD; current HEAD shows different but coherent state; the audit updates the claim.
- **REFUTED** — the audit's claim does not grep-verify; the claim is wrong.
- **DEFERRED** — the audit identifies an item that is real but out of scope; a forward reference is created (typically to Phase 3 or to a `frontier-followups.md` ledger).
- **DISCONFIRMED-AT-HEAD** — compound. The claim was specifically true at a prior SHA but is no longer; differs from SHIFTED in that DISCONFIRMED-AT-HEAD requires no narrative update because the claim was specific to a SHA.
- **REFRAMED** — compound. The original audit's question is the wrong question; a new audit replaces it with a better-formed question and verdict.

### §3.2.4 Append-only discipline

Audit reports are never edited after commit. Corrections take the form of new audit reports that reference the prior. The append-only invariant is the foundation of the audit trail's trustworthiness; an editable audit is no audit.

The ledger files (`phase-2-wave-0-ledger.md`, `phase-2-wave-1-ledger.md`) are append-only by row, not by file — the coordinator appends new rows but does not modify existing rows.

### §3.2.5 FACT / INFERENCE tagging

Every concrete claim in every audit report is tagged. The exception: header-and-summary prose may go untagged where the underlying claims are tagged in the body. The default is to tag.

- **FACT** — grep-verifiable at audit-commit time. Cite the path or command that verifies.
- **INFERENCE** — reasoning over FACTs. Cite the FACTs depended on.

A FACT that ages out is a SHIFTED claim; a new audit records the shift.

### §3.2.6 Convention F — audit-prose freshness

Before committing any audit report, the author re-verifies the gate-state and FACT claims against current disk. This is mechanical and quick — view the cited files, confirm they match the claims — and it prevents drift between draft time and commit time. Especially important for landing-time audits where the disk has been changing during landing.

## §3.3 FACT vs INFERENCE inventory for this document

This document is drafted before the repo it governs exists. Every concrete claim is necessarily either:

- **FACT (spec-anchored):** the claim cites spec v2.0 (`/mnt/user-data/uploads/gpu-sims-design-spec-v2.md` at draft time; `/docs/architecture.md` post-Phase-0 landing) by section number, and the cited text supports the claim.
- **INFERENCE (reasoning over FACT):** the claim is the document author's reasoning over one or more FACTs. The reasoning may be correct or wrong; it should be re-evaluated by the coordinator at execution time.
- **Anchor sketch (path or specific):** a path, name, or specific that follows the spec's conventions but has not been verified against repo HEAD (because HEAD does not exist yet). At execution time, every anchor sketch is verified by the relevant stage's Task X.1 re-anchor probe — each stage re-views the paths it depends on before consuming them. The coordinator does not maintain a central anchor-resolution log.

The inventory below is partial — exhaustive tagging is in the document body. This is the load-bearing top-level summary.

### §3.3.1 FACT claims (spec-anchored)

The following claims grep-verify against spec v2.0:

- §1.1 — Phase 2 scope of 8 sim ports and the per-item enumeration: spec §11.3.
- §1.1 — Layer 5 cross-stack replication and equivalence-as-test framing: spec §3.6.
- §1.1 — Directory pattern `ref-stack-<X>/`: spec §3.7.
- §1.2.1 — Layer 0 acceptance criteria: spec §3.1.
- §1.2.2 — Layer 4 gate-list (ten gates at spec v2.0/v2.1/v2.2/v2.3; thirteen gates at spec v2.4): spec §3.5.
- §1.2.2 — Phase 1 source-sim assignments: spec §11.2.
- §1.2.3 — "common-ts, common-cpp, common-py at minimum" in Phase 1: spec §11.2 item 1.8.
- §1.2.4 — Vendoring requirement: spec §2.8.
- §1.2.5 — Default tolerance table location and per-sim overrides: spec §2.6.
- §1.2.6 — Hard Rule 2 (synced state authoritative): spec §7.2.
- §1.5.1 Gate 1–10 — Layer 4 pre-v2.4 ten-gate, now legacy gates 1–10: spec §3.5.
- §1.5.1 Gate 11–13 — Layer 4 v2.4-additions (PBT, perf-ledger, failing-tests replay): spec §3.5 + § 2.14 + § 2.15 + § 1.3 step 4.
- §1.5.2 Gates W-1 through W-6 — Layer 3 per-module requirements: spec §3.4.
- §1.6 every named convention (M, #8, C, D, K, A, F, G, I, E, M-addendum, #12, Hard Rule 2) — Convention catalog: spec Part VII and Appendix B.
- §3.1 Categories 1–9 failure modes: spec §9.4.

### §3.3.2 INFERENCE claims (reasoning over FACT)

The following claims are inferences. Each cites the FACT(s) it reasons from. At execution time, the relevant stage (whose work touches the inference) validates that the inference holds; Stage 9 (landing) validates cross-cutting inferences at landing. The coordinator does not validate.

- §1.2.3 — "`common-warp` is NOT yet mature" / "Phase 2 introduces this." Reasoning over spec §11.2 item 1.8 ("at minimum") and the absence of `common-warp` from any Phase 1 sim's stack requirement. Possible alternative reading: Phase 1's "at minimum" silently includes `common-warp` if any Phase 1 sim's stack assignment overlaps. Verified at execution time by coordinator probe §1.2.3.
- §1.3.1 — Stage 0 as a Phase 2 work item rather than a Phase 1 work item. Inference from the above.
- §1.4.1 — Sequential stage decomposition. Inference from spec §11.3 work items + Stack E common-warp dependency + per-sim independence.
- §1.4.1 — Sequential stage ordering. The 10-stage queue is INFERENCE from spec §11.3 work items + sim-port complexity assessment + Stack E common-warp dependency. Alternative orderings exist (e.g., MPM first as the highest-stakes port; or all Stack D before any Stack E) — the current ordering puts common-warp first (genuine dependency), MPM last (heaviest), and keeps related sims adjacent (smoke D before smoke E). The founder may reorder Stages 1–7 freely; Stage 0 must remain first and Stage 8 should remain last.
- §1.4.5 — Branch naming `phase-2/working`. Inference from trunk-based-development practice (Humble & Farley 2010) plus spec's section §9 convention culture. Phase 1's branch-naming pattern (which would settle the question) does not exist yet; the founder is expected to confirm the pattern matches Phase 1's settled convention before dispatching the coordinator, and update §1.4.5 if Phase 1 chose a different shape.
- §1.5.1 Gates 11–14 — gates 11/12/13 are spec § 3.5 v2.4 additions (PBT, perf-ledger, failing-tests replay); gate 14 (cross-stack equivalence) is the only Phase-2-specific gate, from spec § 3.6. The "Gate 14" numbering is this document's convention (pre-v6 it was "Gate 11" when spec § 3.5 was at ten gates). Inference holds: equivalence is mandatory per spec § 3.6; PBT / perf-ledger / failing-tests replay are mandatory per spec § 2.14 / § 2.15 / § 1.3 step 4.
- §1.6.7 — "Stack D ports may use Taichi GGUI; their interactive layers are not CI-gated." Inference from spec §7.8 (runtime-only display surfaces require user-driven gate). The specific claim about Taichi GGUI is FACT (spec §4.4 known-limitations); the inference is that this maps to spec §7.8's runtime-display category.
- §1.7.1 — Report template structure. Inference of a useful structure; the spec does not mandate this specific format. The coordinator may refine.
- §2.11 task ordering — Convention A new-files-first decomposition applied to landing. Inference. Spec's Convention A is the general principle; the specific commit sequence for Phase 2 landing is this document's translation.
- §3.2.1 audit-file naming. Inference of a useful naming pattern; the spec does not enumerate audit-file names. Coordinator may align with Phase 0/1's settled naming.

### §3.3.3 Anchor sketches (paths to verify)

Every path in §1.3, §1.4.3, §2.3–§2.11, and §3.2.1 is an anchor sketch unless explicitly tagged FACT. Each stage's Task X.1 re-anchor probe verifies the subset it consumes; Stage 9's Task L.1 verifies cross-cutting paths at landing time.

The non-exhaustive list of high-stakes anchor sketches:

- `tools/testkit/schemas/capture-v1.json` — the canonical capture schema.
- `tools/testkit/equivalence/tolerance.toml` — the per-category tolerance table.
- `tools/testkit/equivalence/harness.py` — the equivalence harness.
- `tools/testkit/code_verification/mms/solutions/` — manufactured-solution library.
- `tools/testkit/golden/tables/` — golden-value tables.
- `tools/testkit/probes/template.md` — probe-report template.
- `common/common-cpp/`, `common/common-py/` — Stack C and Stack D common modules.
- `docs/common/cpp.md`, `docs/common/py.md` — Stack C and Stack D API specs.
- `references/SPlisHSPlasH/` — vendored SPH upstream.
- All `docs/sim-specs/<category>/<sim>/` paths for Phase 1 sims.
- All `captures/<sim>-ref/` paths for Phase 1 captures.

If at a stage's Task X.1 any of the above probes fail, the stage files a precondition-block audit per §1.2.6, reports BLOCKED, and stops. The coordinator surfaces the BLOCKED report to the founder per §2.1 step 8.

### §3.3.4 Stance on this inventory

This inventory is partial. The spirit is honesty about what is grep-verifiable and what is reasoning. Where this document feels confident, the source of confidence is either spec text (cited) or routine extension of spec conventions (labeled inference). Where this document feels uncertain, the uncertainty is labeled. The coordinator and every stage inherit this stance: confidence is earned by grep, not by tone.

## §3.4 Confidence inventory — spec v2.0 audit (2026-05-17)

> **Historical note (v5 amendment, May 18 2026; v6 amendment, post-spec v2.4):** This audit was conducted on May 17 2026 against spec v2.0. The spec has since been bumped to v2.4 (via amendments v2.1, v2.2, v2.3, v2.4). Spec v2.4 is a STRICT SUPERSET of v2.0 — it adds Appendices D/E/F/G (v2.3) plus the verification-hardening pass (v2.4: §§ 1.3 step 4, 2.4 anchors, 2.6 tolerance budget, 2.13/2.14/2.15, 3.2 adversarial fixtures, 3.5 thirteen-gate, 3.8 bootstrap-style, 7.4 Convention E-addendum, 7.5 mechanical anchors, 7.12 operator-only tags) without reversing any earlier commitment. References below to "spec v2.0" remain accurate as the source of the cited claims at audit time. The post-v2.4 supplementary verifications are documented in the v6 verification-hardening amendment block at the top of this file. When re-verifying at execution time, anchor against `docs/architecture.md` (which holds the v2.4 content); the v2.0 section numbers cited here still resolve correctly.

This section is the result of a section-by-section audit of `gpu-sims-design-spec-v2.md` end-to-end against the contents of this phase plan. It supersedes §3.3 where they overlap and is the authoritative honesty surface for what this document gets right and what it picks defaults for.

### §3.4.1 Verified against spec (high confidence)

The following claims grep-verify against spec v2.0:

- **Phase 2 scope: eight cross-stack ports.** Verbatim match to spec §11.3 items 2.1–2.5.
- **Phase 1 source-sim primary-stack assignments.** RD-2d / Stack B (§11.2 1.1 + Part V §5.2 implied), SPH-water / Stack C (§11.2 1.4), MPM / Stack D (§11.2 1.5), eulerian-smoke / Stack C (§11.2 1.6), LBM-D3Q19 / Stack C (§11.2 1.7).
- **Layer 4 acceptance criteria.** §3.5 originally listed ten gates (verbatim at spec v2.0/v2.1/v2.2/v2.3). Spec v2.4 expanded the list to thirteen gates (legacy 1–10 + new 11 PBT, 12 perf-ledger, 13 failing-tests replay). This document's §1.5.1 v6 amendment block reflects the v2.4 expansion as fourteen gates (13 + cross-stack equivalence = 14).
- **Layer 5 four per-replication requirements.** §3.6 lists exactly four: new spec sheet, new test fixtures, equivalence harness configured for the pair, CI gate on equivalence harness. The Layer 4 thirteen gates are *not* re-stated for Layer 5 by the spec — see §3.4.3 below for how this plan extends Layer 5 by inference.
- **Common-warp module location and per-module requirements.** §3.4 lists `common/common-warp/` (Stack E) and the six per-module requirements (capture I/O, determinism binding, smoke sim, public API doc, Cat 2 contract verification, cross-stack equivalence-harness compatibility). Verbatim.
- **9-category failure-mode taxonomy.** §9.4 lists categories 1–9 with the exact descriptions this document references.
- **Convention names.** Conventions M, #8, C, D, K, A, F, E, H, #12, M-addendum, G, I, and Hard Rule 2 all verbatim-named in §§7.1–7.10. Plus §7.5 audit-trail discipline (FACT/INFERENCE tagging, four-state verdicts, append-only, required front-matter), §7.7 strict-mode CI, §7.8 runtime-only display surfaces, §7.9 closing-commit anchor re-check.
- **Default cross-stack tolerance table.** §2.6 lists rows for closed-form, reaction-diffusion, boids/physarum, SPH, MPM, Stam/Fedkiw smoke, LBM, flow-map fluids, learned dynamics. This plan's tolerance references are all sourced from these rows.
- **Capture format manifest+payload structure.** §2.7 verifies the two-part structure (manifest JSON + payload HDF5) and the schema fields this plan references.
- **Roles enumerated in §9.4.** The spec defines coordinator, repo-architect, category-architect, per-sim implementer, reviewer-architect, auditor. This plan's coordinator role inherits §9.4's coordinator definition but with the user's deliberate simplification: validation moves to each stage's self-check + Stage 9's cross-cutting verification + founder review between stages, leaving the coordinator as pure queue manager (§2.1). The reviewer-architect role is not exercised in this phase (per §12.4, per-spec stakes; the founder has chosen single-coordinator for Phase 2).

### §3.4.2 Founder-decision items (spec contradictions surfaced by audit)

The audit found four places where the spec is internally inconsistent or silent. This document picks defaults; the founder confirms or overrides before Phase 2 dispatches.

**Item 1 — When does `common-warp` come into existence?**

- Spec §3.4 enumerates `common/common-warp/` as the Stack E common module.
- Spec §11.1 Phase 0 (item 0.12) introduces the first common-* module (`common-ts` recommended) — only one.
- Spec §11.2 Phase 1 (item 1.8) matures "common-ts, common-cpp, common-py at minimum" — common-warp not enumerated.
- Spec §11.3 Phase 2 (items 2.3, 2.4, 2.5) ports three sims to Stack E.
- Spec §11.4 Phase 3 (item 3.7) says "common-warp matures."

The contradiction: Phase 2's Stack E ports require common-warp; Phase 3 is where it "matures." Either common-warp pre-exists Phase 2 (implied but not enumerated), or "matures" assumes a Phase 2 bootstrap.

**This document's default (INFERENCE):** Stage 0 of Phase 2 produces a minimal common-warp sufficient for the three Stack E sim ports (Stages 5, 7, 8). Phase 3.7's "matures" then extends API surface, adds polish, and brings the module into structural parity with common-cpp/py. This is the most parsimonious reading.

**If founder overrides:** the alternative is to back-date common-warp to Phase 1 item 1.8 (extending "at minimum" to include Stack E). If so, Stage 0 is removed from Phase 2 entirely; the stage queue shrinks to 9 stages; Stages 5, 7, 8 still depend on common-warp but it pre-exists. This is a cleaner architectural fit but expands Phase 1's scope. Under the serial-execution model, the restructure is mechanical: remove §2.3 (Stage 0); renumber Stages 1–9 to 0–8; update §1.4.1 stage queue and §1.4.3 touch sets.

**Item 2 — Where do vendored upstreams live?**

- Spec §2.8: "Every upstream that any simulation cites lives at `references/<UpstreamName>/`, vendored at a specific SHA." (Root-level `references/`.)
- Spec §3.4 cross-stack-shared list: "`common/references/` — vendored upstreams." (Under `common/`.)

**This document's default (FACT, picked from §2.8 since §2.8 is the more direct statement):** `references/SPlisHSPlasH/`, `references/Warp/`, etc. at root.

**If founder overrides:** all stage-data-block references to `references/<X>/` become `common/references/<X>/`. Mechanical find-replace.

**Item 3 — Where do per-sim docs live?**

- Spec §3.7 example: `<category>/<sim>/docs/spec-ref.md`, `<category>/<sim>/docs/equivalence.md`, etc. (per-sim docs directory, inside the sim folder).
- Spec §8.1 hierarchy: `docs/sim-specs/<category>/<sim-name>/spec-ref.md`, etc. (root-level `docs/sim-specs/` tree).
- Spec §6.6: "Per-sim overrides land in `docs/sim-specs/<sim>/equivalence.md`." (Shortened — likely a notational shortcut for §8.1.)

**This document's default (INFERENCE — §8.1 is the more authoritative documentation-hierarchy spec):** `docs/sim-specs/<category>/<sim>/...` (root-level tree).

**If founder overrides:** all `docs/sim-specs/<category>/<sim>/...` paths become `<category>/<sim>/docs/...`. Mechanical find-replace across all 10 stage data blocks (§2.3–§2.11) plus the Stage 9 landing prompt (§2.12).

**Item 4 — Where does the phase-plan file itself live?**

- Spec §8.1 documentation hierarchy enumerates: `architecture.md`, `conventions.md`, `glossary.md`, `common/`, `sim-specs/`, `diagnostics/`, `integrity/`, `testkit/`, `retro/`, `renders/`, `stack-decisions/`. No `phases/` directory.

**This document's default (INFERENCE):** `docs/phases/phase-2-cross-stack-replication.md`. New directory under `docs/`, not in §8.1 but consistent with the spec's documentation-hierarchy spirit (a phase plan is documentation, lives under `docs/`).

**Alternative readings:**
- Under `docs/retro/` — defensible if phase plans are considered "cycle planning" alongside retros. But retros are *post-hoc* and phase plans are *prospective*; mixing them is mildly awkward.
- At repo root as `PHASE-2-PLAN.md` — defensible since it's a load-bearing planning artifact but breaks the "everything documentary under `docs/`" pattern.

**If founder overrides:** all references to `docs/phases/phase-2-cross-stack-replication.md` and `docs/_audits/...` are find-replaced to the chosen location.

### §3.4.3 Inferences this document makes that the spec does not mandate

These are not contradictions — the spec is silent — but this document picks defaults that go beyond strict spec text. Founder may relax or replace any.

**Inference A — Layer 5 ports pass Layer 4's thirteen gates plus equivalence (v6 amendment).**

Spec §3.6 Layer 5 lists only four per-replication requirements. This document's §1.5.1 extends Layer 5 to "fourteen gates" (v6 amendment; was "eleven gates" pre-v6 when spec § 3.5 listed ten) by inferring that Layer 4's thirteen gates (spec-sheet, probe, tests with output-hash, MMS/golden with anchors, Tier 1 diagnostics, Tier 2 diagnostics, Cat 1 citations, Cat 2 API, capture, determinism, PBT invariants, perf-ledger row, failing-tests replay) are stack-agnostic correctness gates that every port should also pass. The fourteenth gate (cross-stack equivalence) is the only one that's literally a Layer 5 requirement per spec §3.6.

**Why this inference is reasonable:** A Layer 5 port that doesn't pass Tier 1 diagnostics (no NaN/Inf, conservation) or Tier 2 diagnostics (category-specific health checks) is silently broken; equivalence-harness pass wouldn't catch every defect because tolerances are non-zero. Treating Layer 5 ports as "Layer 4 gates apply too, plus equivalence" is the safer reading.

**If founder overrides:** the relevant stage prompts get a slimmer gate list (only spec §3.6's four items). This makes Phase 2 land faster but admits less-thoroughly-verified ports. Recommended only if Phase 0/1's testkit harness is fragile or the verification cost per port is genuinely prohibitive.

**Inference B — Sequential 10-stage decomposition with Stage 0 first.**

Spec §11.3 enumerates 8 cross-stack ports but doesn't prescribe execution ordering. The 10-stage sequence (Stage 0 common-warp + Stages 1–8 ports + Stage 9 landing) is INFERENCE from Stage 0's gating role for the three Stack E consumers, plus the per-sim independence of the Stack C and Stack D ports, plus the founder's choice of serial-over-parallel execution (defended in §1.4.0). If the founder back-dates common-warp to Phase 1 (Item 1 above), Stage 0 disappears and the queue shrinks to 9 stages. If the founder reorders Stages 1–7 (e.g., MPM first for highest-stakes-first), the dependency graph still holds — only Stage 0 first and Stage 8 last are structural.

**Inference C — Single `phase-2/working` branch model with no per-stage feature branches.**

Standard trunk-based development practice (Humble & Farley 2010); not spec-mandated. If Phase 1 settled a different branch-naming convention (which doesn't exist yet at draft time), the founder updates §1.4.2 / §1.4.5 to match.

**Inference D — Landing-time integration via Stage 9 (no coordinator merges).**

Spec §9.4 says the coordinator "integrates outputs." This document splits that: the coordinator orchestrates dispatch and surfaces to the founder; each stage commits directly to `phase-2/working` (no parallel branches to reconcile); Stage 9 (landing) does final cross-cutting verification, convergence-file polish, and the merge to `main`. Under serial execution, the coordinator has no integration work — every stage's commit is already on the working branch by the time the coordinator receives the report.

**Inference E — `tools/testkit/probes/reports/<sim>-stack-<X>-probe.md` path.**

Spec §3.1 puts the testkit at `tools/testkit/` and §2.9 names probe reports as artifacts, but doesn't enumerate the `/probes/reports/` subdirectory. The path follows the spec's spirit of one-canonical-location-per-artifact-class. If Phase 0 settles a different probes-home, the founder updates.

**Inference F — `captures/<sim>-stack-<X>/` capture-file directory layout.**

Spec §2.7 defines the capture *format* but not the *directory layout* for captures. This document infers a flat-ish `captures/<sim>-stack-<X>/` layout. Alternatives: `captures/<sim>/stack-<X>/`, `<category>/<sim>/captures/stack-<X>/` (next to the sim), etc. Cheap to relocate later if the founder picks differently.

**Inference G — Audit-report naming conventions.**

Names like `phase-2-stage-<N>-precondition-block-<UTC-date>.md`, `phase-2-stage-ledger.md`, `phase-2-landing-<UTC-date>.md` are this document's invention. The spec §7.5 mandates required front-matter and append-only discipline but doesn't fix naming.

### §3.4.4 Things I am explicitly NOT confident about

- **Exact common-warp surface area for the minimal Phase 2 bootstrap.** Stage 0's data block lists subsystems (Runtime, Capture I/O, Determinism, Particles, Grids, Hash grid, Smoke simulator — per §1.9.1) inferred from spec §4.5 Stack E description plus sibling-module parallel. The actual minimal surface depends on what Stages 5, 7, 8 end up consuming, which won't be known until those stages probe. Stage 0's prompt instructs the Claude Code session to probe-then-spec; if Stage 0 under-builds, Stages 5/7/8 will surface gaps as BLOCKED under the serial execution model — but since these stages run after Stage 0 has already landed, the gap is caught at Stage 5 latest, not at landing.
- **The exact verification regime for MPM.** Spec is light on MPM-specific verification. This document settles on patch test (uniaxial elastic bar), two-particle elastic collision (conservation invariants per Sulsky 1994), and drop-impact qualitative match against the source Stack D sim (see §2.11 Stage 8 data block). If Phase 1's MPM reference settles a different regime, the Stage 8 port should match Phase 1's, not this document's defaults.
- **Whether the equivalence harness compares (Stack-D, Stack-E) pairs in addition to (source, port) pairs.** For sims with both Stack-D and Stack-E ports (smoke, LBM), there are three pairs available: source↔D, source↔E, D↔E. Spec §3.6 mandates "second-stack merge" gating, not all-pairs-pairwise. This document defers to Stage 9 (landing) on whether to add the D↔E pair. Cheap to add.
- **The CHANGELOG entry shape.** Phase 1's settled CHANGELOG conventions don't exist yet. Under the serial-execution model, each stage writes its own CHANGELOG entry directly (no batched landing-time compilation), so the convention emerges in Stage 0's first entry. If Stage 0's entry shape needs revision after the founder reviews, mechanical edits on `phase-2/working` are cheap.

### §3.4.5 What the coordinator does with this audit

This audit is not a runtime artifact. The coordinator does not re-audit. The coordinator absorbs the audit at plan-read time (step 1 of §2.1 coordinator prompt), notes that §3.4.2 has four founder-decision items, and confirms with the founder before dispatching Stage 0 that the founder's choices on those items match the document's defaults. If the founder overrides any, the coordinator's first task before Stage 0 dispatch is to apply the mechanical find-replaces to the phase file and re-commit it (Convention M-addendum — stable repo path before probe applies even to corrections of the plan itself).

If the founder approves the defaults, dispatch proceeds as written.

## §3.5 Open questions and known unknowns

This section separates two epistemic categories that §3.4 conflated:

- **INFERENCE** — claims this document makes that go beyond spec text but are defensible by reasoning. Logged in §3.3.2 and §3.4.3. These are NOT uncertain; they are decisions.
- **UNKNOWN** — things this document genuinely doesn't know and that will resolve only at execution time, on contact with real repo state and real Phase 1 outputs.

§3.5 is the inventory of UNKNOWNs.

### §3.5.1 UNKNOWNs that resolve at Stage 0 (common-warp bootstrap)

These resolve when Stage 0's Task 0.1 (re-anchor probe) and Task 0.2 (probe report) run against the actual repo HEAD:

- **U-0.1 — Vendoring decision for Warp itself.** Pinned-version (declare in `pyproject.toml`) vs. vendored (under `references/Warp/`). Default per §3.4.2 Item 2 is `references/Warp/` if vendoring is chosen, but the vendoring choice itself is left to Stage 0's probe of whether any Phase 1 sim cites Warp by SHA. If no Phase 1 sim does, pinned-version is the natural choice.
- **U-0.2 — Whether `tools/testkit/schemas/capture-v1.json` and `common_warp.Capture.to_capture_payload()` agree on HDF5 layout.** This is a socket-fit question; the §1.9.1 Python types name fields like `positions`, `velocities`, `masses`, but the actual HDF5 path structure (e.g., `/steps/{N}/state/positions` vs. `/steps/{N}/positions`) is fixed by the capture-v1 schema at Phase 0. Stage 0's Task 0.2 probes the schema and aligns common-warp's I/O to it.
- **U-0.3 — Whether common-py has a smoke-sim hello example to diff against.** Stage 0's smoke-sim acceptance gate (Gate W-3 in §1.5.2) requires a cross-module diff against a sibling-module smoke. If common-py doesn't have one, Stage 0 either (a) creates one as part of its scope (DEFERRED) or (b) reports BLOCKED. Probe at start.

### §3.5.2 UNKNOWNs that resolve at sim-port stages (Stages 1–8)

These resolve when each port stage probes its source sim:

- **U-1.1 — Exact Phase 1 capture descriptors per sim.** This document infers (from spec + general convention) that captures land at `captures/<sim>-ref/<descriptor>.h5` with descriptors like `gray-scott-lambda-512sq-seed42-step1000`. Phase 1's actual choices might differ. Each port stage's Task X.1 probes the source-sim's `captures/` directory and adopts the actual descriptor names.
- **U-1.2 — Whether the testkit's MMS solution library covers the sim's PDE.** Spec §11.1 item 0.6 enumerates heat-equation-1D as the canonical Phase 0 MMS deliverable. Reaction-diffusion, incompressible Navier-Stokes (for smoke), and LBM-recovered Navier-Stokes are all distinct from heat-equation; they may not have MMS solutions in the testkit at Phase 2 dispatch. Per Rule P3 (§1.8.1), the stage falls back to heat-equation as placeholder and files DEFERRED for testkit-expansion.
- **U-1.3 — Whether the Phase 1 source sim's spec sheet enumerates the verification regime.** Stages reference §3.6 for canonical citations, but the source sim's own spec sheet should enumerate which tests it claims to pass. If a stage's port wants to reproduce the source's gates exactly, the spec sheet is the source. If absent or sparse, Rule P5 applies.
- **U-1.4 — The exact equivalence-harness CLI interface.** This document writes invocations like `python -m testkit.equivalence --source ... --port ... --strict`. The actual Phase 0 CLI might use different flag names. Each stage's Task X.1 probes `tools/testkit/equivalence/` for the actual interface and adjusts.

### §3.5.3 UNKNOWNs that resolve only post-Phase 2

These cannot resolve during Phase 2 execution:

- **U-2.1 — Whether the per-sim tolerance overrides Phase 2 stages propose hold up under Phase 4 frontier-variant pressure.** Phase 4's differentiable, sparse, and 3DGS-coupled variants might exercise edge cases that the Phase 2 canonical tests don't. A tolerance set wide-but-defensible at Phase 2 might prove too narrow for Phase 4. The mitigation is Phase 4 re-runs equivalence with its own captures and can propose new overrides.
- **U-2.2 — Whether Stage 0's minimal common-warp surface is genuinely sufficient.** Stages 5, 7, 8 (the Stack E consumers) will surface gaps if they exist. Phase 3.7's "common-warp matures" closes any gaps that emerge late.
- **U-2.3 — Whether the serial execution wall-clock estimate (3–4 months) holds.** Phase 2's spec §11.8 estimate is 2–3 months under the original parallel model. Serial adds latency. The post-hoc retrospective in `docs/retro/` at phase close is where this resolves.

### §3.5.4 The rule-of-three coordinator check

The coordinator runs a mechanical pattern-detection scan between stages, starting at Stage 2's completion. The rule (Convention 7.10 in spec parlance, "rule-of-three promotion"): if three or more stage reports surface the same pattern in their §6.6 (deferred items) or §6.8 (other notes), the pattern is a candidate for Phase 3 promotion.

**Examples of patterns the coordinator scans for:**

- "Stage needed a hash-grid neighbor-query utility, inlined it under Rule I3." If Stages 3 (SPH), 6 (LBM), and 8 (MPM) all log this, hash-grid promotion to common-py / common-warp is a Phase 3 candidate.
- "Stage needed a Poisson solver, inlined it under Rule I3." If Stages 4 and 5 (both smoke ports) log this, Poisson-solver promotion is a candidate (though only 2 stages — under the rule of three, the pattern is *noted* but not actioned).
- "Stage needed a 19-component scalar-field wrapper, inlined under §1.9.7." If Stages 6 and 7 (both LBM ports) log this, the wrapper is a 2-stage pattern — same as above, noted not actioned.
- "Stage encountered a vendored upstream missing or stale (Rules P1, P2)." If 3+ stages surface this, the issue is upstream of Phase 2; surface for Phase 1 amendment.

**The coordinator's protocol after each stage's report (Stages 2 onward):**

1. Read the stage's report §6.6 (deferred items) and §6.8 (other notes).
2. For each item, check whether the same concept (matched loosely, by topic) appears in 2 or more prior stage reports.
3. If yes (3 total occurrences), file `docs/_audits/phase-2/pattern-<UTC>.md` with:
   - The pattern (one-sentence description).
   - The three stage reports that surface it (cite §6.X path in each).
   - A recommendation: defer to Phase 3 promotion (default), interrupt Phase 2 to promote now (only if the founder requests), or note for later (if the pattern is informational rather than actionable).
4. Surface the pattern audit to the founder when surfacing the stage's stage-close.

**Why this is the coordinator's job, not a stage's job:**

A stage sees its own work, not other stages' reports. The coordinator is the only role with cross-stage visibility. The rule-of-three check is mechanical (count occurrences across reports), not judgment-laden (the coordinator does not decide what to do with the pattern; the founder does). This fits the coordinator's "queue manager, not validator" role.

**Convention 7.10 anchor:** The "rule of three" is a long-standing software-engineering pattern (originally Beck, *Smalltalk Best Practice Patterns*, 1997, restated in Fowler's *Refactoring*, 1999: "Three Strikes and You Refactor"). The spec's Convention 7.10 (promotion to common module after rule-of-three) is its application to this portfolio's module-promotion problem.

## §3.6 Industry / academic standards anchored

The verification regimes specified throughout Part 1 and Part 2 of this document rely on canonical references. This section pins them down with verified citations so that each stage can copy the references into spec sheets and audit reports without re-deriving. **All 19 citations were web-verified during plan authoring (2026-05-17).**

### §3.6.1 Code-verification and solution-verification methodology

These are the meta-methodologies for proving sim correctness. They apply to every sim port in Phase 2.

1. **Roy 2005 — Code and solution verification framework.**
   - Roy, C. J., "Review of Code and Solution Verification Procedures for Computational Simulation," *Journal of Computational Physics*, 205(1):131–156, 2005.
   - DOI: 10.1016/j.jcp.2004.10.036
   - **Role in Phase 2:** Conceptual taxonomy — every port's "verification posture" section in its spec sheet cites Roy 2005 as the framework. Already in spec.

2. **Salari & Knupp 2000 — Method of Manufactured Solutions (MMS).**
   - Salari, K. and Knupp, P., "Code Verification by the Method of Manufactured Solutions," SAND2000-1444, Sandia National Laboratories, Albuquerque, NM, June 2000.
   - DOI: 10.2172/759450
   - OSTI: https://www.osti.gov/biblio/759450
   - **Role in Phase 2:** Canonical MMS reference. Stages whose verification regime uses MMS (RD-2D, smoke, LBM) cite Salari & Knupp 2000 in their spec sheet's verification-posture section.

3. **Roache 1994 — Grid Convergence Index (GCI).**
   - Roache, P. J., "Perspective: A Method for Uniform Reporting of Grid Refinement Studies," *Journal of Fluids Engineering*, 116(3):405–413, September 1994.
   - DOI: 10.1115/1.2910291
   - **Role in Phase 2:** Solution-verification methodology for grid-refinement studies. Stages with GCI claims (smoke at multiple resolutions; LBM at multiple lattice resolutions) cite Roache 1994.

4. **Celik et al. 2008 — ASME formalization of GCI.**
   - Celik, I. B., Ghia, U., Roache, P. J., Freitas, C. J., Coleman, H., and Raad, P. E., "Procedure for Estimation and Reporting of Uncertainty Due to Discretization in CFD Applications," *ASME Journal of Fluids Engineering*, 130(7):078001, 2008.
   - DOI: 10.1115/1.2960953
   - **Role in Phase 2:** Modern formalization of GCI; the procedure stages follow when running grid-refinement studies. Cites Roache 1994 as origin.

### §3.6.2 Sim-category canonical references

These are the per-category foundational papers that define the algorithms each Phase 2 port replicates.

5. **Pearson 1993 — Gray-Scott reaction-diffusion patterns.**
   - Pearson, J. E., "Complex Patterns in a Simple System," *Science*, 261(5118):189–192, July 1993.
   - DOI: 10.1126/science.261.5118.189
   - **Role in Phase 2:** RD-2D source-of-truth for the algorithm and the canonical parameter regimes (λ-spots, α-stripes, etc.). Stages 1 and 2 cite Pearson 1993 in spec sheets.

6. **Stam 1999 — Stable Fluids.**
   - Stam, J., "Stable Fluids," *Proceedings of SIGGRAPH 1999*, pp. 121–128.
   - DOI: 10.1145/311535.311548
   - **Role in Phase 2:** Eulerian smoke source-of-truth (semi-Lagrangian advection + Jacobi pressure projection). Stages 4 and 5 cite.

7. **Fedkiw, Stam & Jensen 2001 — Visual simulation of smoke.**
   - Fedkiw, R., Stam, J., and Jensen, H. W., "Visual Simulation of Smoke," *Proceedings of SIGGRAPH 2001*, pp. 15–22.
   - DOI: 10.1145/383259.383260
   - **Role in Phase 2:** Vorticity-confinement extension to Stam 1999; the practical Phase 1 smoke sim follows this.

8. **Selle, Fedkiw et al. 2008 — Stable MacCormack.**
   - Selle, A., Fedkiw, R., Kim, B., Liu, Y., and Rossignac, J., "An Unconditionally Stable MacCormack Method," *Journal of Scientific Computing*, 35(2-3):350–371, 2008.
   - DOI: 10.1007/s10915-007-9166-4
   - **Role in Phase 2:** MacCormack correction for advection accuracy; smoke ports' advection step matches this.

9. **Hu, Fang, Ge, Qu, Zhu, Pradhana, Jiang 2018 — MLS-MPM.**
   - Hu, Y., Fang, Y., Ge, Z., Qu, Z., Zhu, Y., Pradhana, A., and Jiang, C., "A moving least squares material point method with displacement discontinuity and two-way rigid body coupling," *ACM Transactions on Graphics (TOG)*, 37(4):150, August 2018.
   - DOI: 10.1145/3197517.3201293
   - **MIT-licensed reference:** https://github.com/yuanming-hu/taichi_mpm
   - **Role in Phase 2:** MPM source-of-truth — the 88-line reference Hu et al. published is the Phase 1 Stack D / Taichi baseline. Stage 8's Warp port is a direct translation. Cite in Stage 8's spec sheet.

10. **Sulsky, Chen & Schreyer 1994 — Foundational MPM.**
    - Sulsky, D., Chen, Z., and Schreyer, H. L., "A particle method for history-dependent materials," *Computer Methods in Applied Mechanics and Engineering*, 118(1-2):179–196, 1994.
    - DOI: 10.1016/0045-7825(94)90112-0
    - **Role in Phase 2:** Original MPM formulation; Stage 8 cites for two-particle collision conservation test (Sulsky's paper introduces the conservation invariants the test exercises).

11. **Ghia, Ghia & Shin 1982 — Lid-driven cavity benchmark.**
    - Ghia, U., Ghia, K. N., and Shin, C. T., "High-Re solutions for incompressible flow using the Navier-Stokes equations and a multigrid method," *Journal of Computational Physics*, 48(3):387–411, 1982.
    - DOI: 10.1016/0021-9991(82)90058-4
    - **Role in Phase 2:** Lid-driven cavity tabulated values are the gold-standard benchmark for incompressible CFD codes. Stages 4 and 5 (smoke ports) cite for the Re=100 cavity test. Public benchmark data widely available (e.g., gists at github.com/ivan-pi/3e9326d18a366ffe6a8e5bfda6353219 for u-velocity; corresponding for v-velocity).

12. **Krüger et al. 2017 — LBM textbook.**
    - Krüger, T., Kusumaatmaja, H., Kuzmin, A., Shardt, O., Silva, G., and Viggen, E. M., *The Lattice Boltzmann Method: Principles and Practice*, Springer Graduate Texts in Physics, 2017.
    - Print ISBN: 978-3-319-44647-9; eBook ISBN: 978-3-319-44649-3
    - DOI (book): 10.1007/978-3-319-44649-3
    - **Role in Phase 2:** LBM source-of-truth. Phase 1 vendored the textbook's companion code (D2Q9 only); Phase 2 D3Q19 lattice constants are derived in `tools/testkit/golden/derivations/d3q19.md`. Stages 6 and 7 cite Krüger et al. 2017 for Poiseuille + Couette closed-form profiles.

13. **Taylor 1923 — 2D decaying vortex (the test commonly mis-named "Taylor-Green").**
    - Taylor, G. I., "On the decay of vortices in a viscous fluid," *Philosophical Magazine*, Series 6, 46(274):671–674, 1923.
    - DOI: 10.1080/14786442308634295
    - **Role in Phase 2:** The 2D decay envelope `u(x,y,t) = U₀·cos(kx)·sin(ky)·exp(-2νk²t)` originates in Taylor 1923, NOT in the better-known Taylor-Green 1937 paper. CFD literature widely mis-cites this; for robust accuracy Stages 4 and 5 cite Taylor 1923 when using the 2D form for code verification of advection-diffusion. (If a stage instead uses the 3D Taylor-Green vortex for turbulence-decay studies, cite Taylor & Green 1937 below.)

14. **Taylor & Green 1937 — 3D vortex turbulence cascade.**
    - Taylor, G. I. and Green, A. E., "Mechanism of the production of small eddies from large ones," *Proceedings of the Royal Society of London, Series A*, 158(895):499–521, 1937.
    - DOI: 10.1098/rspa.1937.0036
    - **Role in Phase 2:** 3D Taylor-Green vortex, used for solution-verification studies of energy decay and small-scale eddy production. Cite only if a stage's verification regime exercises the 3D form (not the 2D analytical decay).

15. **Bender & Koschier 2015 — DFSPH.**
    - Bender, J. and Koschier, D., "Divergence-Free Smoothed Particle Hydrodynamics," *Proceedings of the ACM SIGGRAPH/Eurographics Symposium on Computer Animation (SCA)*, 2015.
    - DOI: 10.1145/2786784.2786796
    - **Role in Phase 2:** DFSPH is the algorithm vendored in SPlisHSPlasH; Stage 3 (SPH Stack D port) reproduces the algorithm exactly. Spec §11.1 item 0.8 cites SPlisHSPlasH as the vendored reference.

16. **Monaghan 2005 — SPH review.**
    - Monaghan, J. J., "Smoothed Particle Hydrodynamics," *Reports on Progress in Physics*, 68(8):1703–1759, 2005.
    - DOI: 10.1088/0034-4885/68/8/R01
    - **Role in Phase 2:** Comprehensive SPH reference; Stage 3 cites for dam-break benchmark posture and general SPH conventions.

### §3.6.3 Software-engineering methodology references (used for the execution model itself)

These ground the choices made in §1.4 (sequential stages over parallel waves) and §1.6 (convention discipline).

17. **Beck 2002 — TDD.**
    - Beck, K., *Test-Driven Development: By Example*, Addison-Wesley, 2002.
    - ISBN: 978-0-321-14653-3
    - **Role in Phase 2:** Each stage's Task X.4 (failing tests pre-implementation) follows TDD discipline.

18. **Humble & Farley 2010 — Continuous Delivery.**
    - Humble, J. and Farley, D., *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*, Addison-Wesley, 2010.
    - ISBN: 978-0-321-60191-9
    - **Role in Phase 2:** Trunk-based development with short-lived feature branches is one of CD's core practices; `phase-2/working` is short-lived by construction.

19. **Fowler 1999 — Refactoring.**
    - Fowler, M., *Refactoring: Improving the Design of Existing Code*, Addison-Wesley, 1999 (2nd ed. 2018).
    - ISBN: 978-0-201-48567-7
    - **Role in Phase 2:** The "Rule of Three" for refactoring extraction; cited in §3.5.4 as the basis for the coordinator's pattern-detection check.

### §3.6.4 Citation discipline for stages

Every stage cites references from §3.6 in its spec sheet's verification-posture section and (where applicable) its decision log. Citations are inline in the spec sheet (not just listed). Format:

```
"The port's MMS verification follows Salari & Knupp 2000 (SAND2000-1444). The
manufactured solution is a 2D Gaussian decay against which the diffusion operator
shows second-order spatial convergence. GCI per Roache 1994 (DOI:10.1115/1.2910291)
is computed at resolutions 32², 64², 128²."
```

No stage adds new top-level canonical references without founder approval. If a stage needs a citation not in §3.6, file `phase-2-stage-<N>-citation-add-<UTC-date>.md` and surface to coordinator.

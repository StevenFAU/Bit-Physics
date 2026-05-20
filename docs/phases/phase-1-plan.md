# Phase 1 — Reference Sim TDD Bootstrap

> **Document type:** Phase charter — architecture, interface contracts, sequential dispatch plan
> **Phase identity:** Phase 1 of the spec, scoped to the **TDD bootstrap** of the reference-sim program
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen)
> **Spec anchor:** `docs/architecture.md` (v2.4; originally drafted as `gpu-sims-design-spec-v2.md`) (2026-05-18) + spec Appendix D + spec Appendix G + spec Appendix E
> **Pre-conditions:** Phase 0 (Foundation) has landed per spec § 11.1; this charter has been committed at `docs/phases/phase-1-plan.md`
> **Date drafted:** 2026-05-17 (R6); 2026-05-18 (R7 single-agent amendments); 2026-05-18 (R8 dispatch-hardening amendments)
> **Status:** dispatch-ready

> **R9 verification-hardening amendments (May 18 2026, post-design-spec v2.4):**
>
> - **Cross-phase audit replay as first action.** Stage 1 Task 1.0 (new) runs `python -m integrity.scripts.replay_prior_phase --prior-phase phase-0 --audit docs/_audits/phase-0/landing-<UTC>.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`. Any discrepancy → BLOCKED. Per spec § 7.5 and Appendix G.7. This is the only mechanism that detects a falsely-CONFIRMED Phase 0 landing before Phase 1 builds on it. (At Phase 0 close, tolerance-budget.toml is committed but has no per-sim overrides — the tolerance-budget gate passes trivially; included here for consistency with later phases.)
> - **Failing-tests output capture per spec § 1.3 step 4.** Every Stage 2 sim's failing-tests commit MUST include verbatim pytest output at `tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt` AND record sha256 in commit footer. The implementation phase (subsequent per-sim) will witness the hash. Stage 3's verification step replays one randomly-sampled sim's failing-tests commit and confirms the hash matches.
> - **Independent-reference anchors in every golden table.** Spec § 2.4 mandates ≥ 3 independent-reference anchors per golden table. Stage 2's per-sim golden-table work (SPH-water cubic-spline kernel, MPM constitutive kernels, LBM equilibrium tables) follows this discipline. Cat 3 HARD_FAILs tables that don't conform.
> - **PBT invariant declarations in spec § 6.** Every Phase 1 sim's spec sheet declares at least two PBT-covered invariants in § 6 (verification posture). PBT implementations are deferred to the per-sim implementation phase; declaration is Phase 1 scope.
> - **Tolerance-budget activation.** `tolerance-budget.toml` (committed in Phase 0) becomes active in Phase 1. Stage 1 updates it: `[phase] phase = "phase-1"` plus per-category budgets carrying over from Phase 0 (no widening). Cat-X HARD_FAILs any override exceeding budget.
> - **Mutation-testing thresholds active.** Phase 0 produced the mutation-score baseline (no gating); Phase 1's CI activates the SOFT_WARN-in-push / HARD_FAIL-at-landing posture per spec § 2.13. Stage 3's landing fails if mutation score has regressed below the per-target thresholds.
> - **Operator-only tag pushing.** Stage 3's landing prompt removes any `git tag` / `git push origin <tag>` agent action. The closing report ends with `Tag pushed: NO (operator action required)`. Operator pushes `v0.1.0-phase-1` after independent audit review.
> - **Schema-corpus growth.** Each Stage 2 sim's failing-tests commit also stages a placeholder entry in `tests/fixtures/legacy-captures/`. The implementation phase (where the capture is actually produced) populates the file. Phase 4 WU-A's schema bump round-trips every entry; Phase 1 lays the placeholders.
> - **Evidence-hash on every per-sim Stage 2 report.** Each per-sim report's front-matter `evidence_hashes:` field includes the sha256 of the failing-tests output file. Stage 3's verification spot-checks 2–3 randomly-sampled sims.
> - **Verify-evidence in Stage 3.** Stage 3's landing run includes `for r in docs/_audits/phase-1/*-report.md; do python -m integrity.scripts.verify_evidence --audit "$r" --strict; done`. Any failure → REFUTED.

> **R8 dispatch-hardening amendments (May 18 2026):**
>
> - **Phase 1 scope locked to gates 1–3** (TDD bootstrap only): spec sheet, probe report, failing-tests commit per sim. Gates 4–10 (implementation, all numerical-pass + diagnostics-pass + capture + determinism) are explicitly deferred to subsequent per-sim implementation phases. § 1.2 reading "gates 1–10 per sim, full reference implementation" is REJECTED.
> - **Placeholder resolution.** Per spec Appendix D § D.1 (post-2026-05-20 reconciliation sweep — see `docs/_audits/phase-0/reconciliation-sweep-2026-05-20T02-18-17Z.md`): `bit_physics` resolves to `bit_physics` only as the PyPI distribution prefix (never as a Python import); the common-py Python import module is `common_py` (forward-looking; common-py ships in this phase). All `bit_physics::common_cpp::` C++ namespaces resolve to `bit_physics::common_cpp::`. The agent does NOT re-pick names at dispatch time.
> - **Action #1 in this phase's session:** `python tools/dispatch/preflight-phase.py 1`. Exit 0 → proceed. Exit 1 → BLOCKED.
> - **RD-2D MMS as named deliverable.** Stage 2 § 7.6 (RD-3D sim card) ALSO produces the RD-2D MMS solution at `tools/testkit/code_verification/mms/solutions/reaction-diffusion-2d/` (extending Phase 0's heat-1d MMS pattern). This was implicit in earlier drafts; now explicit.
> - **Cat 4 grammars (b) and (c)** ship as part of Stage 1's common-module work. The Cat 4 verifier extends from Phase 0's grammar (a) `<path>:<line>` to also handle (b) `<phrase "X" in Y>` and (c) `<API X has shape Y>` patterns. Phase 4's `cat2.api_imports` check depends on grammar (c) being functional.
> - **Canonical capture descriptors** per spec Appendix D § D.2.3 — Phase 1 Stage 2's failing tests reference these by exact name. RD-3D writes to `gray-scott-lambda-64cube-seed42-step2000`; SPH-water to `dam-break-1M-particles-seed42-step1000`; MPM to `drop-impact-128cube-seed42-step500`; etc.
> - **LBM Krüger 2017 decision finalized**: algebraic reference only, no vendored code. Sim 8 (lattice-boltzmann-d3q19, § 7.9) does NOT vendor Krüger; derives D3Q19 constants from first principles per spec § 5.7. The "vendor decision deferred to runtime" language in earlier drafts is REJECTED.
> - **Convention names** per spec Appendix G: Convention-8, Convention-M, Convention-A, Convention-K, Convention-12, Hard-Rule-2, etc. Use these names; references like "Convention #8" or "Convention M" or "Hard Rule 2" are aliases for the same conventions.
> - **Pacing language**: any "X weeks for Phase 1" / "parallel parallel" residue is superseded by spec § 11.0.

> **R7 single-agent dispatch amendment (May 18 2026):** Per owner directive, each phase is one document for one coordinator chat + one Claude Code agent role. The agent runs auto-accept; reads this whole plan; works through Stages 1 → 2 → 3 in order; commits directly to `main` (trunk-based per spec § 7.12); reports at each stage close. Context-spanning sessions are supported via `docs/_audits/phase-1/progress.md` continuation cues. The coordinator dispatches the phase opener once and continuation sessions only on context-fill; per-stage dispatch in earlier drafts (R6 § 4) is superseded.

---

## Why this revision

R5 modeled Phase 1 as 10 work agents running in parallel under a coordinator router. That model was a deviation from standard practice: sequential dispatch with checkpoint-restart is the industry pattern for long-running computational work and for AI-agent code generation (the model behind Aider, Cursor's agent mode, Devin, and most CI/CD orchestration outside of explicitly parallelizable build steps). Parallel dispatch compounds variables — concurrent sessions each carry their own re-anchor risk, interface assumptions, and partial-failure modes; failures across N agents multiply faster than they add. The variance cost outweighed the calendar-time benefit for a single-operator project.

**R6 reverts to standard practice.** One Claude Code agent dispatched sequentially through three stages, possibly across multiple Claude Code sessions if context demands (it almost certainly will). One Claude.ai chat coordinator that holds the running log and helps the operator compose continuation prompts between sessions. The agent commits incrementally so any session boundary is a clean checkpoint.

What survives from R5: the interface contracts in § 3 (now framed as self-consistency contracts across sessions and as documentation for future implementer phases, not as cross-agent coordination contracts), the per-sim documentation set per spec § 8.1, the audit-trail discipline, the problem-solving playbook, the architecture overview and state model.

What changes: no waves, no parallel touch sets, no per-agent audit ceremony for 10 separate agents, no LANDER as a distinct role. One agent does all the work; the stage progression replaces the wave structure as the sequencing mechanism.

---

## Naming note

The portfolio uses the five-dimensional naming convention in spec § 7.11 (added via v4 review):

- Repo: `Bit-Physics`
- PyPI distribution: `bit-physics-<scope>` (kebab-case, e.g., `bit-physics-testkit`, `bit-physics-mpm-multimaterial`)
- Python import: bare flat-module names shipped by each workspace member's `[tool.hatch.build.targets.wheel] packages = […]` declaration (e.g., the `bit-physics-testkit` PyPI dist ships `capture`, `code_verification`, `determinism`, `equivalence`, `golden`, `property`; the `bit-physics-integrity` PyPI dist ships `integrity`; the `bit-physics-diagnostics` PyPI dist ships `diagnostics`; common-py ships `common_py`). Per the 2026-05-20 reconciliation sweep, there is no `bit_physics_<scope>` import namespace — the snake_case identifier convention applies to module names internally (e.g., `code_verification`), not to a `bit_physics_` prefix.
- C++ namespace: `bit_physics::<scope>` (mirrors Python)
- Common-module directory: `common/common-<stack>/` (kebab-case at filesystem level)

Web demos deploy at `bit-physics.<domain>` per spec § 10.1 (as amended).

Throughout this charter the placeholder `bit_physics` resolves to `bit_physics` for Python imports and `bit_physics::` for C++ namespaces. The agent's first action in Stage 1 is to re-anchor against Phase 0's committed state and verify the convention has been applied consistently before extending it.

---

## Table of contents

- § 1. Scoping, posture, architecture
  - § 1.1 What this phase is, and what it deliberately is not
  - § 1.2 Why this scoping is defensible (and that it is a choice)
  - § 1.3 What this phase does NOT include
  - § 1.4 Honesty caveats on this charter
  - § 1.5 Role model: one agent, one coordinator, one operator
  - § 1.6 First principles and industry standards
  - § 1.7 Phase 1 architecture: three stages
  - § 1.8 State model — what the repo looks like at each boundary
- § 2. Deliverables of this phase
- § 3. Interface contracts (IC-1 through IC-10) — agent self-consistency
- § 4. Stage decomposition and the dispatch order
- § 5. How to dispatch — operator workflow
- § 6. Coordinator prompt
- § 7. Agent prompts per stage
  - § 7.1 Stage 1 prompt (Infrastructure)
  - § 7.2 Stage 2 prompt (Per-sim TDD bootstrap)
  - § 7.3 Stage 3 prompt (Landing)
  - § 7.4 Sim 1–2: strange-attractors + mandelbulb-explorer (closed-form, Stack B)
  - § 7.5 Sim 3–4: boids-3d + physarum (agent-based, Stack B)
  - § 7.6 Sim 5: reaction-diffusion-3d (continuous-CA, Stack C)
  - § 7.7 Sim 6: sph-water (particle-fluids, Stack C)
  - § 7.8 Sim 7: eulerian-smoke (volumetric-grid, Stack C)
  - § 7.9 Sim 8: lattice-boltzmann-d3q19 (lattice, Stack C)
  - § 7.10 Sim 9: mpm-multimaterial (hybrid-PG, Stack D)
- § 8. Checkpoint and continuation discipline
- § 9. Risk surface and problem-solving playbook
- § 10. Appendix — audit-trail discipline
- § 11. Phase coherence — Phase 0 inputs, Phase 2+ outputs

---

## § 1. Scoping, posture, architecture

### § 1.1 What this phase is, and what it deliberately is not

The spec's Phase 1 as written (§ 11.2) names a set of reference sims plus common-module maturation and estimates 3–6 months of parallel work. This charter scopes Phase 1 to the **TDD bootstrap** of that program: for every sim in spec § 11.2 not already complete via Phase 0, this phase lands the first three of the thirteen gates in § 3.5 (spec sheet, pre-implementation probe report, acceptance test suite committed and failing with output-hash footer per spec § 1.3 step 4), plus the supporting per-sim documentation set per § 8.1 (README, algebraic derivation, determinism declaration, equivalence stub), plus PBT invariant declarations in spec § 6 (per spec § 2.14), plus the common-module scaffolds (`common-cpp`, `common-py`) and the Tier 2 diagnostic substacks Phase 0 did not land.

Each sim's full implementation — gates 4 through 10 of § 3.5 — is **not** in this phase. Those become subsequent per-sim phases.

### § 1.2 Why this scoping is defensible (and that it is a choice — now locked)

**Locked decision (R8 amendment, May 18 2026):** Phase 1 scope is gates 1–3 only (TDD bootstrap). The alternative reading discussed below is REJECTED.

Spec § 11.2 does not distinguish between "spec the sims" and "implement the sims." It lists category targets and gives a calendar estimate. This charter's interpretation — that Phase 1 lands gates 1–3 of § 3.5 across the inventory, with per-sim implementations as subsequent phases — was one of two defensible readings and is now the locked reading. The interpretation rests on:

1. **First principles, § 1.4.** Tests come first. Landing all bootstrap artifacts in one phase and each implementation in its own is the cleanest expression of that ordering at the program level.
2. **§ 2.10 gate sequence.** Spec → tests → impl → CI passes. A phase that closes "specs + probes + tests" is one stratum.
3. **§ 3.5 thirteen gates** (v2.4 expansion, was ten pre-v2.4) split naturally at gates 1–3 vs 4–13 — "failure is the spec" vs "implementation makes the failures pass."

**Alternative reading rejected.** Phase 1 as a single phase landing gates 1–10 for all 9 sims together would expand scope substantially and complicate failure-isolation. The TDD-bootstrap reading produces verifiable intermediate state (all specs and failing tests committed, integrity checks GREEN, sims demonstrably RED with module-not-found) before any sim implementation work begins, which limits the blast radius of any one implementation defect to that sim alone. This is the locked reading.

### § 1.3 What this phase does NOT include

- Sim implementations.
- Cross-stack replication (spec Phase 2).
- Frontier variants (spec Phase 4).
- Productization (spec Phase 5).
- Phase 0 rework. If Phase 0 gaps surface during dispatch, the agent documents in its running log and surfaces to the operator — repair Phase 0 or expand Phase 1 scope is the owner's call.
- **reaction-diffusion-2d.** Phase 0 lands a Stack B RD-2D that satisfies all 10 of spec § 3.5's acceptance criteria as a complete Layer 4 reference implementation (per spec § 11.1 amendment: "complete reference, not a stub"). Phase 1 does NOT re-bootstrap RD-2D. Phase 1 Stage 2 adds the **RD-2D MMS** pipeline as the only RD-2D work in this charter (co-bundled with the RD-3D MMS work in § 7.6, per spec § 11.7 deferred-item ownership table). Spec § 11.2 item 1.2 lists RD-2D alongside RD-3D under Continuous CA as a category inventory; the RD-2D Layer 4 reference is satisfied by Phase 0, and the RD-2D MMS deferral is satisfied by Phase 1 Stage 2.

### § 1.4 Honesty caveats on this charter

This charter is drafted from the spec without re-anchoring against a live repo, because Phase 0 has not landed yet at draft time. Some assumptions reflect spec intent rather than verified disk state:

- Directory layouts (`packages/<sim>` for Stack B, `<category>/<sim>` for Stack C/D, `docs/sim-specs/<category>/<sim>` for specs per spec § 8.1).
- Path for golden tables: `tools/testkit/code_verification/golden/tables/` per § 3.1.
- Path for MMS solutions: `tools/testkit/code_verification/mms/solutions/<sim-name>/` per § 3.1.
- Path for schemas: `tools/testkit/schemas/` per § 3.1; § 3.4 also names `common/schemas/` as cross-stack canonical; relationship unclear — agent probes.
- Path for vendored upstreams: top-level `references/<UpstreamName>/` per § 2.8; § 3.4 mentions `common/references/`; same ambiguity.
- Phase 0's CHANGELOG format, `docs/sim-specs/README.md` index file format, choice of Stack C test framework, choice of Stack D dependency manager (`uv` per § 9.1; verify).

Per the spec § 7.11 naming convention (as amended by the 2026-05-20 reconciliation sweep — see `docs/_audits/phase-0/reconciliation-sweep-2026-05-20T02-18-17Z.md`), the `bit_physics` placeholder used throughout this charter resolves to `bit_physics` only as the PyPI distribution prefix and the C++ namespace root (`bit_physics::`, mirroring the `Bit-Physics` repo name). Python imports use bare flat-module names declared in each workspace member's `[tool.hatch.build.targets.wheel] packages` — Phase 0 shipped `capture` / `code_verification` / `determinism` / `equivalence` / `golden` / `property` (testkit), `integrity`, and `diagnostics` per phase-0-plan Decision #24 (as amended). Phase 1 inherits this convention; common-py ships `common_py` in this phase.

The agent's first action in Stage 1 is a comprehensive re-anchor against synced HEAD. Discrepancies between charter and HEAD are resolved in HEAD's favor (Hard Rule 2); the agent documents the shift in the running log and continues.

### § 1.5 Role model: one agent, one coordinator, one operator

Three roles:

- **Agent** (one Claude Code session at a time; possibly several sessions in succession). Re-anchors against HEAD. Drafts, writes, commits, self-verifies as it goes. Writes the phase audit at the end of Stage 3. May run out of context mid-stage; in that case writes a checkpoint log entry and the operator dispatches a continuation session.

- **Coordinator** (one Claude.ai chat instance, kept open across the phase). Holds the running log of stages completed, sub-deliverables committed, and any deviations or banked items. Helps the operator compose continuation prompts when a Claude Code session ends without finishing its stage. Acts as a thinking partner for the operator if questions arise during the phase. **Validates nothing substantively; verifies nothing against the repo.** The agent self-validates as it works; the coordinator is project-tracking, not quality control.

- **Operator** (the human owner — Steven). Dispatches each Claude Code session by pasting the relevant stage prompt (or continuation prompt). Reads the agent's stage outputs and the coordinator's running log. Resolves any contested decisions the agent surfaces. Pushes when the phase is complete.

This is a deliberate simplification of R5's role model. The coordinator's role is smaller in single-agent dispatch than it was in parallel dispatch; its primary value is holding session-continuity context that Claude Code sessions do not persist between dispatches.

### § 1.6 First principles and industry standards

**Spec § 1.4 first principles (load-bearing):**

1. **Verify against synced state, not against memory** (Convention #8). All paths, line numbers, function signatures, version strings are grep-verified or web-fetched at the moment of assertion.
2. **Pause and surface on disagreement** (Hard Rule 2). Synced HEAD wins when in conflict with charter or spec.
3. **Append-only audits** (spec § 7.5). Audit reports under `_audits/` are never edited; corrections are new reports.
4. **Tests come first.** Phase 1 lands gates 1–3; implementations come in subsequent phases.
5. **Decompose, don't bundle** (Convention A). New files commit first; existing files are modified in follow-up commits.

**Industry standards aligned with:**

- **Roy 2005 V&V vocabulary** (Roy, JCP 205, 2005; Oberkampf & Roy, Cambridge 2010). Each sim's spec sheet § 6 declares which of the four levels (code verification, solution verification, model validation, calculation validation) it exercises.
- **TDD red-green-refactor.** Tests committed in RED state; implementation phases turn them GREEN. This phase exclusively lands RED.
- **Conventional Commits.** Commit messages: `phase1(<scope>): <one-line summary>`.
- **Append-only audit log discipline.** Practice from security-critical domains (PCI DSS, SOX); adopted as integrity foundation.
- **Method of Manufactured Solutions (MMS).** CFD code-verification standard; spec § 2.2 cites Sandia (Premo), MOOSE / Cardinal (Idaho National Laboratory), MFiX, OnScale as adopters.
- **Vendored upstream discipline.** Reproducibility via pinned SHAs + manifest; practice in Spack, Nix, Bazel-with-vendoring, Conan with lockfiles.
- **Checkpoint-restart pattern.** Standard for long-running batch jobs (HPC convention) and for long-form AI code generation across session boundaries (Aider, Cursor agent mode, Devin). Commits are checkpoints; the next session re-anchors against committed state and continues.
- **Sequential staging with explicit gates.** CI/CD default. Database migrations, scientific software builds, and most regulated workflows follow this pattern; concurrent staging is an optimization layered on top, never the default.

**Defensibility of deviations from standard.**

- *Convention #12 SHA back-fill* (no `git --amend`) is project-specific. Standard Git practice would `--amend` to include a commit's own SHA in its message. The convention exists because the audit trail records what was claimed at what SHA; rewriting history breaks the link. Defensible on append-only-audit grounds; aligns with the same discipline as not editing audit reports.
- *FACT/INFERENCE tagging* is project-specific. Not universal in scientific software but defensible on integrity-audit grounds (every claim must be traceable to a verifiable fact or to other claims). Cat 5 (provenance) integrity check gates on this; standard in audit-heavy environments.
- *Per-sim 12-section spec sheets* are project-specific. Not universal but aligned with academic-paper structure (introduction, method, math, evaluation, references) — defensible on the pedagogical-archive target (spec front matter: "preprint-extractable").

No deviations made in this charter that aren't grounded in the spec or in a clear correctness rationale.

### § 1.7 Phase 1 architecture: three stages

The phase decomposes into three sequential stages. The agent works one stage at a time; each stage ends with commits + a checkpoint log entry. Stages cannot overlap. Within a stage, the agent commits sub-deliverables incrementally so the operator can dispatch a continuation session if context runs out mid-stage.

**Stage 1 — Infrastructure** (must complete before Stage 2 begins):
- `common/common-cpp/` — Stack C common module per § 3.4. Implements IC-1 (capture I/O C++) + IC-3 (determinism C++).
- `common/common-py/` — Stack D common module per § 3.4. Implements IC-2 + IC-4. Built with `uv` per spec § 9.1.
- `tools/diagnostics/tier2/particle/` — implements IC-5.
- `tools/diagnostics/tier2/vector_field/` — implements IC-6.
- `tools/diagnostics/tier2/closed_form/` — implements IC-7.
- Per-stack docs at `docs/common/cpp.md`, `docs/common/py.md`, `docs/diagnostics/tier2-{particle,vector-field,closed-form}.md`.
- Staged dependency entries for `docs/dependencies.md` (consolidated in Stage 3).
- **Cat 4 grammar extension** — Phase 0 ships Cat 4 with `path:line[-range]` grammar only (Decision #22). Stage 1 adds grammars `<phrase "X" in Y>` (phrase-present-in-file) and `<API X has shape Y>` (public API surface) per spec § 3.2. Implementation lands at `tools/integrity/integrity/cat4_draft_time/grammars/`; tests cover positive and negative cases for each grammar. This deferred-item handoff is documented in spec § 11.7.

**Stage 2 — Per-sim TDD bootstrap** (must complete before Stage 3 begins):
For each of the 9 sims (recommended order: lightest first, complex last):
- closed-form pair: strange-attractors, mandelbulb-explorer (Stack B)
- agent-based pair: boids-3d, physarum (Stack B)
- reaction-diffusion-3d (Stack C) — co-bundles **RD-2D MMS** work (Gray-Scott manufactured solution); deferred from Phase 0 Decision #21 per spec § 11.7
- sph-water (Stack C)
- eulerian-smoke (Stack C)
- lattice-boltzmann-d3q19 (Stack C)
- mpm-multimaterial (Stack D)

Each sim lands:
- `docs/sim-specs/<category>/<sim>/{README.md, spec-ref.md, algebraic.md, determinism.md, equivalence.md}` per § 8.1.
- `tools/testkit/probes/reports/<sim>.md` per IC-8.
- Failing test suite at the per-stack location.
- Golden tables and/or MMS solutions per the sim's spec.
- Sim's gate-9 (capture file produced) writes to `captures/<sim>-ref/<descriptor>.h5` + `<descriptor>.json` at repo root per spec § 2.7 capture-location convention. Descriptor naming follows the per-sim cards (§ 7.4–§ 7.10).

**Stage 3 — Landing and phase audit**:
- Convergence-file edits (additive only): top-level CMake, pnpm-workspace.yaml, optionally a Stack D workspace, `justfile`, `docs/dependencies.md` consolidation, `docs/diagnostics/overview.md` (if applicable), `docs/sim-specs/README.md`, integrity-toolkit registry entries, CI workflow updates, `CHANGELOG.md`.
- Integrity Cat 1, 2, 4, 5 verification (Cat 4 now exercises all three grammars from Stage 1).
- Failing-tests gate verification (sims RED with module-not-found; common modules + Tier 2 substacks GREEN; Phase 0 GREEN).
- Phase audit at `docs/_audits/phase-1/landing-<UTC>.md` per spec § 8.1 audit-path convention.
- Convention #12 SHA back-fill as a follow-up commit.

**Why three stages and not more granular.** Stage 1 produces the surfaces (IC-1 through IC-7) that Stage 2 consumes. Stage 2 produces the artifacts that Stage 3 integrates. Each stage boundary is a natural re-anchor point and a natural session boundary if context demands. Finer-grained stages (e.g., per-sim phases inside Stage 2) would re-add coordination ceremony without adding safety; coarser-grained stages (one big stage) would not give the operator a checkpoint to break on.

**Dependency graph (linear):**

```
Phase 0 deliverables
        ↓
Stage 1 — Infrastructure
        ├── common-cpp + common-py + Tier 2 (particle, vector_field, closed_form)
        └── checkpoint commit + log entry
        ↓
Stage 2 — Per-sim TDD bootstrap
        ├── closed-form pair → checkpoint
        ├── agent-based pair → checkpoint
        ├── reaction-diffusion-3d → checkpoint
        ├── sph-water → checkpoint
        ├── eulerian-smoke → checkpoint
        ├── lattice-boltzmann-d3q19 → checkpoint
        └── mpm-multimaterial → checkpoint
        ↓
Stage 3 — Landing
        ├── convergence commits (additive)
        ├── integrity Cat 1, 2, 4, 5 verification
        ├── failing-tests gate verification
        ├── phase audit
        └── SHA back-fill
        ↓
Phase 2+
```

### § 1.8 State model — what the repo looks like at each boundary

**State 0 — After Phase 0 lands** (assumed pre-condition):

```
bit-physics/
├── docs/
│   ├── architecture.md, conventions.md, dependencies.md (Phase 0 deps documented)
│   ├── common/ts.md
│   ├── diagnostics/{overview, tier1-universal, tier2-scalar-field}.md
│   ├── integrity/{overview, cat1..cat5}.md
│   ├── testkit/{overview, capture-format, mms, golden-values, ...}.md
│   ├── sim-specs/
│   │   ├── README.md (has RD-2d link)
│   │   └── continuous-ca/reaction-diffusion-2d/{README, spec-ref, algebraic, determinism, equivalence}.md
│   └── _audits/ (Phase 0 audits)
├── packages/reaction-diffusion-2d/ (complete per § 0.13)
├── common/common-ts/
├── tools/
│   ├── testkit/
│   ├── integrity/
│   └── diagnostics/{tier1, tier2/scalar_field}/
├── references/SPlisHSPlasH/ (vendored per § 0.8)
├── CHANGELOG.md, pnpm-workspace.yaml (has RD-2d), CMakeLists.txt, justfile, README.md
```

**State 1 — After Stage 1 (Infrastructure)**:

Adds:
```
common/{common-cpp, common-py}/  (scaffolds; internal tests GREEN)
tools/diagnostics/tier2/{particle, vector_field, closed_form}/  (with tests GREEN)
docs/common/{cpp, py}.md
docs/diagnostics/tier2-{particle, vector-field, closed-form}.md
common/{common-cpp, common-py}/_staging/deps.md  (staged for Stage 3 consolidation)
```

State of tests after Stage 1: Phase 0 GREEN; Stage 1 own tests GREEN; no sim tests yet.

**State 2 — After Stage 2 (per-sim TDD bootstrap)**:

Adds:
```
packages/{strange-attractors, mandelbulb-explorer, boids-3d, physarum}/  (Stack B, failing tests)
continuous-ca/reaction-diffusion-3d/  (Stack C, failing tests)
particle-fluids/sph-water/  (Stack C, failing tests)
volumetric-grid/eulerian-smoke/  (Stack C, failing tests)
lattice/lattice-boltzmann-d3q19/  (Stack C, failing tests)
hybrid-pg/mpm-multimaterial/  (Stack D, failing tests)

docs/sim-specs/
├── closed-form/{strange-attractors, mandelbulb-explorer}/  (5 doc files each)
├── agent-based/{boids-3d, physarum}/  (5 doc files each)
├── continuous-ca/reaction-diffusion-3d/  (5 doc files)
├── particle-fluids/sph-water/  (5 doc files)
├── volumetric-grid/eulerian-smoke/  (5 doc files)
├── lattice/lattice-boltzmann-d3q19/  (5 doc files)
└── hybrid-pg/mpm-multimaterial/  (5 doc files)

tools/testkit/probes/reports/  (9 new probe reports)
tools/testkit/code_verification/
├── mms/solutions/{reaction-diffusion-3d, incompressible-ns-2d}/
└── golden/{tables, derivations}/{closed-form/, agent-based/, particle-fluids/dfsph-density-evolution.*, lattice/d3q19-equilibrium.*, hybrid-pg/mls-mpm-shape-functions.*}
```

State of tests: Phase 0 + Stage 1 GREEN; sim tests RED with module-not-found; convergence files (pnpm-workspace.yaml, top-level CMake) not yet updated — some runners may report "package not registered" which Stage 3 fixes.

**State 3 — After Stage 3 (Landing)**:

Additive updates:
```
pnpm-workspace.yaml             (+4 packages)
CMakeLists.txt                  (+4 Stack C subdirs)
[Stack D workspace listing]     (+mpm-multimaterial, if listing exists)
justfile                        (+recipes for new sims + Tier 2 substacks)
docs/dependencies.md            (+common-cpp + common-py sections)
docs/diagnostics/overview.md    (+3 Tier 2 substack entries, if format requires)
docs/sim-specs/README.md        (+9 sim links, grouped by category)
CHANGELOG.md                    (+Phase 1 entry)
[integrity registries]          (+tier2, +mms, +goldens; possibly +Krüger 2017 if vendored)
```

Adds:
```
docs/_audits/phase-1/landing-<UTC>.md
[possibly: references/Krüger-LBM/ if Stage 2 LATTICE work decided to vendor]
common/{common-cpp, common-py}/_staging/  (deleted after consolidation)
```

State of tests after Stage 3:
- Phase 0 GREEN (verified by agent's Stage 3 verification step)
- Stage 1 own tests GREEN (verified)
- Sim tests RED with module-not-found (verified)
- All test runners now recognize all sim packages

---

## § 2. Deliverables of this phase

### § 2.1 Stage 1 deliverables

- `common/common-cpp/` per spec § 3.4 (six per-module requirements). Build: CMake + Ninja + FetchContent per § 9.1. Implements IC-1 (capture I/O) and IC-3 (determinism Config).
- `common/common-py/` per spec § 3.4. Build: `uv` + `pyproject.toml` per § 9.1. Implements IC-2 and IC-4.
- `tools/diagnostics/tier2/particle/`, `vector_field/`, `closed_form/` per spec § 3.3. Implements IC-5, IC-6, IC-7.
- `docs/common/{cpp,py}.md` and `docs/diagnostics/tier2-{particle,vector-field,closed-form}.md` per § 8.1.
- Staged dependency entries (per § 9.2) for `docs/dependencies.md`, to be consolidated in Stage 3.

### § 2.2 Stage 2 deliverables (per sim)

Per spec § 8.1, each sim's directory at `docs/sim-specs/<category>/<sim-name>/` contains the following minimum file set:

1. **README.md** — One-page pedagogical overview. Sim name, summary paragraph, category, primary stack, placeholder links to renders / web demo / academic preprint, link to spec-ref.md.
2. **spec-ref.md** — Reference spec, 12 sections per § 8.2. § 6 follows IC-10 format.
3. **algebraic.md** — Algebraic derivation of governing equations per § 8.3 pedagogy posture. Includes upstream line-number citations.
4. **determinism.md** — Per § 2.5 declaration; references § 2.6 tolerance row.
5. **equivalence.md** — Cross-stack tolerance stub. Concrete harness work deferred to subsequent phases.

Plus testkit artifacts per sim:

6. **Pre-implementation probe report** at `tools/testkit/probes/reports/<sim>.md` per IC-8, with every enumeration grep-verified verbatim at probe-authoring time.

7. **Acceptance test suite** at the per-stack test location, committed and **failing** with module-not-found / undefined-symbol / missing-fixture (NOT framework misconfiguration).

The 9 sims this phase bootstraps:

| # | Sim | Category | Primary stack |
|---|---|---|---|
| 1 | strange-attractors | closed-form | Stack A→B (B-only this phase) |
| 2 | mandelbulb-explorer | closed-form | Stack A→B (B-only this phase) |
| 3 | boids-3d | agent-based | Stack B |
| 4 | physarum | agent-based | Stack B |
| 5 | reaction-diffusion-3d | continuous-CA | Stack C |
| 6 | sph-water | particle-fluids | Stack C (Phase-0-vendored SPlisHSPlasH) |
| 7 | eulerian-smoke | volumetric-grid | Stack C |
| 8 | lattice-boltzmann-d3q19 | lattice | Stack C |
| 9 | mpm-multimaterial | hybrid-PG | Stack D (Taichi) |

### § 2.3 Stage 3 deliverables

Convergence-file edits (all additive — agent reads existing content first, appends new entries):

- Top-level CMakeLists.txt registration for new Stack C sims (4 new add_subdirectory entries).
- `pnpm-workspace.yaml` for new Stack B packages (4 entries).
- Stack D workspace listing for mpm-multimaterial (if Phase 0 created such a listing).
- Top-level `justfile` recipes per stack and for Tier 2 substack invocation.
- `CHANGELOG.md` Phase 1 entry.
- `docs/sim-specs/README.md` links to 9 new sim directories.
- `docs/dependencies.md` consolidation from staged entries.
- `docs/diagnostics/overview.md` Tier 2 additions if format requires.
- Integrity-toolkit registry entries: 3 Tier 2 substacks, 2 MMS solutions, 6 golden tables, possibly Krüger 2017 vendoring if Stage 2 surfaced the need.
- CI workflow updates if Phase 0's workflows are explicit-per-sim.

Plus:
- Phase audit at `docs/_audits/phase-1/landing-<UTC>.md`.
- SHA back-fill follow-up commit per Convention #12.

SPlisHSPlasH vendoring is Phase 0's responsibility per spec § 0.8 — not re-touched in Stage 3.

### § 2.4 Acceptance for "phase complete"

- All Stage 1, Stage 2, Stage 3 deliverables landed.
- Integrity Cat 1, Cat 2, Cat 4, Cat 5 GREEN against the final phase commit (Cat 3 not exercised — no implementations).
- Sim tests committed and **failing with module-not-found**; common-module + Tier 2 substack tests **passing**.
- Phase 0's RD-2d sim continues to pass all gates (regression check).
- Phase audit committed.
- SHA back-fill follow-up commit lands per Convention #12.

### § 2.5 What this unblocks

After this phase lands, Phase 2+ can dispatch implementation work on any of the 9 sims independently. Recommended starting order for per-sim implementation phases:

1. **closed-form pair first** (smallest surface, fastest validation of the implementation pipeline).
2. **agent-based pair next** (Stack B, slightly larger surface, exercises distributional tests for physarum).
3. **continuous-ca, sph-water** (Stack C, exercises common-cpp at full surface).
4. **eulerian-smoke, lattice-boltzmann** (Stack C, largest C++ work).
5. **mpm-multimaterial last** (Stack D, exercises common-py at full surface; Taichi-specific concerns).

Cross-stack replication (spec Phase 2) and frontier variants (Phase 4) gate on per-sim implementations being green.

---

## § 3. Interface contracts — agent self-consistency

These are candidate API surfaces and data shapes the agent commits to maintain across stages and across sessions. They serve two purposes:

1. **Self-consistency.** When Stage 2 writes a sim test that imports `bit_physics::common_cpp::capture::Reader`, the symbol it references must exist at exactly that path with exactly that shape because Stage 1 committed it that way. The contract pins the surface so Stage 1 and Stage 2 cannot drift.

2. **Forward-looking documentation.** Phase 2+ implementer agents will read these contracts plus the Stage 2 probe reports to know what they need to implement against. Pinning the surface upfront means future agents work from a fixed target.

**Ratification.** These contracts are the charter's proposal. The agent's first action in Stage 1 is to re-anchor against Phase 0 (specifically `common-ts`'s actual capture API, namespace, and conventions). If Phase 0 has already defined a surface that conflicts with a contract here, **Phase 0 wins** (Hard Rule 2). The agent documents the shift in the running log and proceeds. The contract is ratified-as-shifted, not overridden silently.

### § 3.1 IC-1 — Capture format I/O (C++)

**Implemented in Stage 1; consumed by Stage 2 C++ test code** (CONTINUOUS-CA, SPH-WATER, EULERIAN-SMOKE, LATTICE-BOLTZMANN).

**Location:** `common/common-cpp/include/bit_physics/common/capture.hpp`

```cpp
namespace bit_physics::common_cpp::capture {

// Mirrors JSON manifest schema from spec § 2.7.
struct SimMeta     { std::string name, category, variant; };
struct StackMeta   { std::string name, version, build_id; };
struct ConfigMeta  { std::string tier; std::vector<int64_t> dims; std::string dtype; uint64_t seed; nlohmann::json params; };
struct RunMeta     { uint64_t step_count, capture_interval; double wall_clock_seconds; std::string start_utc; };
struct PayloadMeta { std::string format; std::filesystem::path path; std::string checksum; };
struct DeterminismMeta { std::string claimed; bool atomic_ops, subgroup_ops; };

struct Manifest {
    std::string schema_version;  // "1.0.0"
    SimMeta sim;
    StackMeta stack;
    ConfigMeta config;
    RunMeta run;
    PayloadMeta payload;
    DeterminismMeta determinism;
};

struct FieldData {
    std::vector<uint8_t> bytes;
    std::string dtype;             // "f32" | "f64" | "i32" | ...
    std::vector<int64_t> shape;
};
struct StepData {
    std::unordered_map<std::string, FieldData> fields;
    std::unordered_map<std::string, double> diagnostics;
};

class Reader {
public:
    explicit Reader(const std::filesystem::path& manifest_path);
    const Manifest& manifest() const;
    size_t step_count() const;
    StepData read_step(size_t step_idx);
};

class Writer {
public:
    Writer(const std::filesystem::path& manifest_path, Manifest m);
    void write_step(size_t step_idx, const StepData& data);
    void finalize();
};

} // namespace
```

### § 3.2 IC-2 — Capture format I/O (Python)

**Implemented in Stage 1; consumed by Stage 2 Python test code (MPM-MULTIMATERIAL) and by Tier 2 checks (IC-5, IC-6, IC-7 consume capture data).**

**Location:** `common/common-py/src/common_py/capture.py`

```python
from dataclasses import dataclass
from pathlib import Path
from typing import Any
import numpy as np

@dataclass
class SimMeta: name: str; category: str; variant: str
@dataclass
class StackMeta: name: str; version: str; build_id: str
@dataclass
class ConfigMeta: tier: str; dims: list[int]; dtype: str; seed: int; params: dict[str, Any]
@dataclass
class RunMeta: step_count: int; capture_interval: int; wall_clock_seconds: float; start_utc: str
@dataclass
class PayloadMeta: format: str; path: Path; checksum: str
@dataclass
class DeterminismMeta: claimed: str; atomic_ops: bool; subgroup_ops: bool

@dataclass
class Manifest:
    schema_version: str
    sim: SimMeta; stack: StackMeta; config: ConfigMeta
    run: RunMeta; payload: PayloadMeta; determinism: DeterminismMeta

@dataclass
class StepData:
    fields: dict[str, np.ndarray]
    diagnostics: dict[str, float]

class Reader:
    def __init__(self, manifest_path: Path): ...
    @property
    def manifest(self) -> Manifest: ...
    @property
    def step_count(self) -> int: ...
    def read_step(self, idx: int) -> StepData: ...

class Writer:
    def __init__(self, manifest_path: Path, manifest: Manifest): ...
    def write_step(self, idx: int, data: StepData) -> None: ...
    def finalize(self) -> None: ...
```

IC-1 and IC-2 expose semantically identical surfaces. The cross-stack equivalence harness consumes capture files written by either; the file format (JSON manifest + HDF5 payload) is identical across stacks.

### § 3.3 IC-3 — Determinism Config (C++)

**Location:** `common/common-cpp/include/bit_physics/common/determinism.hpp`

```cpp
namespace bit_physics::common_cpp::determinism {
struct Config {
    bool deterministic = false;
    uint64_t seed = 0;
};
Config from_args(int& argc, char** argv);
}
```

### § 3.4 IC-4 — Determinism Config (Python)

**Location:** `common/common-py/src/common_py/determinism.py`

```python
import argparse
from dataclasses import dataclass

@dataclass
class Config:
    deterministic: bool = False
    seed: int = 0

def add_args(parser: argparse.ArgumentParser) -> None: ...
def from_args(args: argparse.Namespace) -> Config: ...
def set_taichi_deterministic(config: Config) -> None: ...
```

### § 3.5 IC-5 — Tier 2 particle checks

**Implemented in Stage 1; consumed by AGENT-BASED, SPH-WATER, MPM-MULTIMATERIAL test code.**

**Location:** `tools/diagnostics/tier2/particle/checks/`

```python
# tools/diagnostics/tier2/_types.py (shared with IC-6, IC-7; mirror scalar_field if it exists there)
from dataclasses import dataclass, field
from typing import Any

@dataclass
class CheckResult:
    passed: bool
    value: float | None = None
    tolerance: float | None = None
    details: dict[str, Any] = field(default_factory=dict)
```

```python
import numpy as np
from common_py._types import CheckResult

# checks/no_overlap.py
def check_no_overlap(positions: np.ndarray, epsilon: float) -> CheckResult: ...

# checks/neighbor_list_integrity.py
def check_neighbor_list_integrity(
    positions: np.ndarray,
    neighbor_lists: list[list[int]],
    cutoff_radius: float,
) -> CheckResult: ...

# checks/momentum_conservation.py
def check_momentum_conservation(
    velocities_t0: np.ndarray,
    velocities_t1: np.ndarray,
    masses: np.ndarray,
    tolerance_rel: float = 1e-5,
) -> CheckResult: ...

# checks/count_invariance.py
def check_count_invariance(count_t0: int, count_t1: int) -> CheckResult: ...
```

### § 3.6 IC-6 — Tier 2 vector_field checks

**Consumed by CONTINUOUS-CA (gradients), EULERIAN-SMOKE, LATTICE-BOLTZMANN, MPM-MULTIMATERIAL.**

**Location:** `tools/diagnostics/tier2/vector_field/checks/`

```python
import numpy as np
from common_py._types import CheckResult

def check_divergence_free(velocity_field, grid_spacing, tolerance_abs=1e-6) -> CheckResult: ...
def check_circulation(velocity_field, grid_spacing, loop_specification, expected_value=None, tolerance_rel=1e-3) -> CheckResult: ...
def check_helicity(velocity_field, grid_spacing, expected_value=None, tolerance_rel=1e-3) -> CheckResult: ...
def check_energy_spectrum(velocity_field, grid_spacing, expected_slope=None, fit_range=None, tolerance_slope=0.2) -> CheckResult: ...
```

### § 3.7 IC-7 — Tier 2 closed_form checks

**Consumed by CLOSED-FORM.**

**Location:** `tools/diagnostics/tier2/closed_form/checks/`

```python
def check_output_stability(parameter_values, output_values, stability_metric="bounded_variation", threshold=1.0) -> CheckResult: ...
def check_precision_sensitivity(output_f32, output_f64, tolerance_rel=1e-6) -> CheckResult: ...
def check_bound_preservation(output_values, lower_bound=None, upper_bound=None) -> CheckResult: ...
```

### § 3.8 IC-8 — Pre-implementation probe report structure

**Location:** `tools/testkit/probes/reports/<sim>.md`

Every probe report has YAML front-matter followed by 6 numbered sections:

```markdown
---
date: 2026-MM-DD
author: phase1-agent
sim: <sim-name>
status: phase1-bootstrap-failing
head_sha: <SHA at probe-authoring time>
---

# Pre-implementation probe — <sim-name>

## 1. Common-module API surface consumed
| API path | Signature | Verified |
|---|---|---|
| `bit_physics::common_cpp::capture::Reader` (IC-1) | ... | ✓ at <SHA> |
| ... | ... | ... |

## 2. Tier 2 diagnostic check functions referenced
| Check function | Signature | Verified |
|---|---|---|
| `tier2.particle.checks.no_overlap.check_no_overlap` (IC-5) | (positions, epsilon) -> CheckResult | ✓ at <SHA> |
| ... | ... | ... |

## 3. Upstream citations
| Citation | Verified source | Vendored at |
|---|---|---|
| Pearson 1993 (Gray-Scott) | DOI:10.1126/science.261.5118.189 | (algebraic ground truth) |
| ... | ... | ... |

## 4. Test fixture paths
| Path | Type | Derivation |
|---|---|---|
| tools/testkit/code_verification/golden/tables/.../dfsph-density-evolution.json | golden | from derivations/dfsph-density-evolution.md |
| ... | ... | ... |

## 5. Public exports the sim will provide (Phase 2+ implementation contract)
| Export | Signature | Consumed by |
|---|---|---|
| `<sim>::Simulation::step(dt)` | void step(double dt) | sim test suite |
| ... | ... | ... |

## 6. Verification flowchart
Test name → check function → fixture → expected state.
| Test | Verification | Fixture | Expected state (Phase 1) |
|---|---|---|---|
| ... | ... | ... | RED (module not found) |
```

### § 3.9 IC-9 — Phase audit body structure

The Stage 3 phase audit at `docs/_audits/phase-1/landing-<UTC>.md` follows this body structure after YAML front-matter:

```markdown
## 1. Phase scope summary
(One paragraph; reference charter § 1.)

## 2. Stage 1 deliverables
(Files committed, commits, any deviations from IC-1..IC-7 contracts and rationale.)

## 3. Stage 2 deliverables per sim
(One row per sim: doc files committed, probe committed, failing tests committed, golden/MMS fixtures committed.)

## 4. Stage 3 convergence commits
(SHAs and descriptions for each convergence commit; note ADDITIVE for existing files.)

## 5. Closing-commit anchor re-check (Convention 7.9)
(Anchors verified at HEAD before Stage 3 final commit; any drift addenda.)

## 6. Failing-tests gate verification
(Test run output excerpts: Stack B/C/D pass/fail tallies; Tier 2 substack tally; Phase 0 regression status. Distinguish module-not-found RED from infrastructure RED.)

## 7. Integrity check results
(Cat 1, 2, 4, 5 outcomes. Note IC-1..IC-10 conformance specifically.)

## 8. Banked items for follow-up
(Anything DEFERRED across stages; anything Stage 3 surfaced for owner attention.)

## 9. Next-phase recommendations
(Per-sim implementation order per charter § 2.5.)

## 10. Phase coherence note
(Reference charter § 11.)
```

### § 3.10 IC-10 — Spec-sheet § 6 verification posture format

In each per-sim `spec-ref.md`, the § 6 section follows this sub-structure verbatim:

```markdown
## 6. Verification posture

This sim exercises the following Roy 2005 V&V levels:

### 6.1 Code verification
**Method:** <MMS | golden-value | both | none>
**Fixture(s):** ...
**Pass criterion:** ...
**Phase 1 state:** test committed and failing with module-not-found.

### 6.2 Solution verification
**Method:** <GCI | none>
**Status:** <exercised | declared, deferred | not applicable>
**Reference benchmark:** ...

### 6.3 Model validation
**Status:** ...

### 6.4 Calculation validation
**Status:** ...

### 6.5 Gate status
- Gates 1, 2, 3 of spec § 3.5 exercised in this phase.
- Gates 4–10 deferred to subsequent per-sim implementation phase.
```

This uniformity lets Cat 4 draft-time scanning verify each sim spec is structurally complete; Cat 5 verifies fixture paths resolve.

---

## § 4. Stage decomposition and the dispatch order

### § 4.1 Stages are gates, not optimization passes

Stages must complete in order. Stage 1 produces the surfaces (IC-1 through IC-7) that Stage 2 consumes. Stage 2 produces the artifacts that Stage 3 integrates. The agent cannot advance to a later stage until the prior stage's deliverables are committed.

Sub-deliverables WITHIN a stage are sequenced but loosely — within Stage 2, the agent works through the 9 sims in the recommended order (lightest first), but order is not load-bearing within Stage 2 because each sim's deliverables are independent.

### § 4.2 Touch set is unified

A single agent across the phase touches all phase scopes — no disjoint per-agent touch sets are needed. The agent should still respect the **convergence-file discipline** from R5: do not edit `pnpm-workspace.yaml`, top-level `CMakeLists.txt`, `docs/dependencies.md`, `docs/sim-specs/README.md`, `CHANGELOG.md`, or integrity registries during Stage 1 or Stage 2. These edits are concentrated in Stage 3 to keep the diff per stage clean and to allow a clean closing-commit anchor re-check.

### § 4.3 Sequencing within Stage 2

The recommended sim order within Stage 2:

1. **strange-attractors + mandelbulb-explorer** (closed-form pair, Stack B). Smallest surface; exercises common-ts only; produces 2 sims of bootstrap before the agent has touched Stack C.
2. **boids-3d + physarum** (agent-based pair, Stack B). Slightly larger surface; exercises EFECT distributional tests for physarum; still Stack B.
3. **reaction-diffusion-3d** (Stack C). First Stack C sim; exercises common-cpp's IC-1 + IC-3 at sim-test scale; first MMS contribution beyond Phase 0's heat-1D.
4. **sph-water** (Stack C). Exercises Phase 0's SPlisHSPlasH vendoring and the cubic-spline-kernel golden; adds DFSPH density-evolution golden.
5. **eulerian-smoke** (Stack C). Adds the incompressible-NS-2d MMS solution; exercises IC-6 vector-field diagnostics.
6. **lattice-boltzmann-d3q19** (Stack C). Largest C++ work in Stage 2; D3Q19 lattice algebra derivation; possible Krüger vendoring decision.
7. **mpm-multimaterial** (Stack D). Last; exercises common-py + IC-5 + IC-6; Taichi limitations from § 4.4 are documented.

Each sim is its own checkpoint within Stage 2. The agent commits a sim's full bundle (5 doc files + probe + tests + goldens/MMS) before moving to the next.

### § 4.4 Checkpoint commits

The agent commits frequently within a stage:

- **In Stage 1:** commit after each module (common-cpp, common-py, each Tier 2 substack). ~5 checkpoint commits in Stage 1.
- **In Stage 2:** commit after each sim's bundle. 9 checkpoint commits within Stage 2 (or 7 if pair-sim agents commit each pair together).
- **In Stage 3:** commit after each Step 4.x sub-step per § 7.3. ~7–10 checkpoint commits in Stage 3.

Total: roughly 20–25 commits across the phase. Each commit is a re-entry point if the session ends.

### § 4.5 Cross-review by construction

R5 had a notion of "cross-review via probe-writing": Wave 2 agents probed Wave 1 deliverables, and any defect surfaced as a SHIFTED audit. In sequential single-agent dispatch, cross-review is by construction:

- Stage 2's probe-writing reads Stage 1's actual committed surfaces.
- If Stage 1 deviated from IC-1..IC-7 (because Phase 0 forced a shift), Stage 2's probes record the actual surface, and Stage 3's integrity Cat 2 verifies coherence between the probes, the spec sheets, and the committed code.
- Stage 3's Cat 1 / Cat 4 / Cat 5 verification provides the final-state cross-check.

No separate reviewer agent is needed; the agent reviews its own prior work at each re-anchor.

---

## § 5. How to dispatch — operator workflow

### § 5.1 Pre-flight (one-time setup)

1. Commit this charter at `docs/phases/phase-1-plan.md` in the Bit-Physics local clone. `git commit -m "phase1: charter (R6)"`.
2. Open a Claude.ai chat session. Paste the coordinator prompt from § 6. Attach this charter file. Leave the chat open for the duration of the phase.

### § 5.2 Stage 1 dispatch

1. Open a Claude Code session on the Bit-Physics local clone.
2. Paste the Stage 1 prompt from § 7.1.
3. The agent will work, committing as it goes. It will produce a Stage 1 checkpoint log entry when complete.
4. If the agent's context runs out before Stage 1 completes, the agent writes a partial checkpoint log entry and stops. Forward it to the coordinator chat. The coordinator helps you compose a continuation prompt; open a new Claude Code session, paste the continuation, the agent resumes from the latest commit.
5. When Stage 1 is fully complete, forward the final Stage 1 checkpoint log entry to the coordinator chat for the running log.

### § 5.3 Stage 2 dispatch

1. Open a new Claude Code session.
2. Paste the Stage 2 prompt from § 7.2.
3. Same pattern: agent works, commits, checkpoints. Continuation if context runs out. Stage 2 likely needs 3–7 sessions in total given the volume (9 sims × 5 docs + probes + tests + goldens/MMS).
4. The coordinator chat tracks which sims have completed.

### § 5.4 Stage 3 dispatch

1. After Stage 2 final commit, open a new Claude Code session.
2. Paste the Stage 3 prompt from § 7.3.
3. Stage 3 is the most coordination-sensitive: the agent reads many existing files (convergence files) and appends to them, runs integrity gates, runs the failing-tests gate, writes the phase audit, and does the SHA back-fill.
4. Stage 3 should fit in one session if Stage 1 and Stage 2 are clean. If not, continuation works the same way.

### § 5.5 Verification (operator-side)

After Stage 3 final commit:
- `git log --oneline -50` shows 20–25 commits across the phase in clean linear order.
- Local test runs:
  - `pnpm -r test` → Phase 0 RD-2d GREEN; new sim packages RED with module-not-found.
  - `cmake -S . -B build && cmake --build build && ctest --test-dir build` → common-cpp tests GREEN; new C++ sim tests RED with module-not-found.
  - `uv run pytest` → common-py + Tier 2 substack tests GREEN; mpm-multimaterial RED with module-not-found.
- `docs/_audits/phase-1/landing-<UTC>.md` exists with verdict-state CONFIRMED or SHIFTED.

If any verification fails, do not push. Read the phase audit's banked items and surface; resolve before pushing.

### § 5.6 Push

`git push origin main` when verification is GREEN.

---

## § 6. Coordinator prompt

The coordinator is a Claude.ai chat session (web or desktop) — **not** Claude Code. It holds running-log context across multi-session dispatch and helps the operator compose continuation prompts. It validates nothing substantively.

Paste this as the first message of the coordinator chat, with this charter attached.

```
You are the Phase 1 coordinator chat for the Bit-Physics repository (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Your role this phase is narrow:

  1. You hold the running log of stages completed and checkpoint events.
  2. When the Claude Code agent in a session runs out of context before finishing a stage, the operator forwards the partial checkpoint log entry to you. You help compose a continuation prompt for the next Claude Code session.
  3. You are a thinking partner for the operator if questions arise during the phase.

That is the entire job.

You do NOT:
  - Validate the substance of any agent's output. The agent self-validates as it works; Stage 3 integrity gates validate the phase.
  - Run integrity checks, re-anchor against synced HEAD, grep, or read repo files. You don't have those capabilities in this chat.
  - Decide anything contested. Surface to the operator.
  - Edit any file or write any commit.
  - Re-derive any plan from memory. The charter is the source of truth.

Authoritative documents:
  - Phase 1 charter (attached to this chat).
  - The spec (for reference if questions arise).

Running log format. Maintain internally:

  | Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
  |---|---|---|---|---|---|
  | 1 | common-cpp scaffold | pending | — | — | — |
  | 1 | common-py scaffold | pending | — | — | — |
  | 1 | tier2/particle | pending | — | — | — |
  | 1 | tier2/vector_field | pending | — | — | — |
  | 1 | tier2/closed_form | pending | — | — | — |
  | 2 | strange-attractors | pending | — | — | — |
  | 2 | mandelbulb-explorer | pending | — | — | — |
  | 2 | boids-3d | pending | — | — | — |
  | 2 | physarum | pending | — | — | — |
  | 2 | reaction-diffusion-3d | pending | — | — | — |
  | 2 | sph-water | pending | — | — | — |
  | 2 | eulerian-smoke | pending | — | — | — |
  | 2 | lattice-boltzmann-d3q19 | pending | — | — | — |
  | 2 | mpm-multimaterial | pending | — | — | — |
  | 3 | Stack B workspace registration | pending | — | — | — |
  | 3 | Stack C CMake registration | pending | — | — | — |
  | 3 | Stack D workspace | pending | — | — | — |
  | 3 | justfile | pending | — | — | — |
  | 3 | dependencies.md consolidation | pending | — | — | — |
  | 3 | integrity registries | pending | — | — | — |
  | 3 | diagnostics overview | pending | — | — | — |
  | 3 | sim-specs index | pending | — | — | — |
  | 3 | CI workflows | pending | — | — | — |
  | 3 | CHANGELOG | pending | — | — | — |
  | 3 | phase audit | pending | — | — | — |
  | 3 | SHA back-fill | pending | — | — | — |

When the operator forwards a checkpoint log entry, parse it and update rows. The agent's checkpoint log entry format is (per charter § 8):
  - Stage / sub-deliverable name
  - Status: complete | partial-needs-continuation | blocked
  - Commit SHA (or placeholder if blocked)
  - Notes: any deviation from charter, any banked items, any context-budget signal

If the agent surfaces a blocked state, surface it to the operator: "Agent reports blocked on <X>. Their summary: <one-line>. Resolution will need owner input."

When the operator asks for a continuation prompt, fill the template from charter § 8.3 with:
  - Stage and sub-deliverable in progress
  - Commit SHA of the most recent checkpoint
  - Notes from the last session about what's done vs what remains

Output the filled continuation prompt as one fenced block. The operator pastes it into a fresh Claude Code session.

When the operator forwards the Stage 3 phase audit, append it to the running log; phase is complete.

If the operator says "stop" or "surface this," do that and wait. Otherwise, you are passive context.
```

---

## § 7. Agent prompts per stage

### § 7.1 Stage 1 prompt

Copy-paste block:

```
You are the Phase 1 Claude Code agent for the Bit-Physics repository (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read charter at docs/phases/phase-1-plan.md. Pay particular attention to:
  - § 1 (scoping, posture, architecture)
  - § 2 (deliverables)
  - § 3 (interface contracts IC-1..IC-7 you will implement this stage)
  - § 4 (sequencing within the phase)
  - § 8 (checkpoint discipline)
  - § 9 (problem-solving playbook)
  - § 10 (audit-trail discipline)

You are dispatching Stage 1 — Infrastructure. Your scope is:
  - common/common-cpp/ (implements IC-1, IC-3)
  - common/common-py/ (implements IC-2, IC-4)
  - tools/diagnostics/tier2/particle/ (implements IC-5)
  - tools/diagnostics/tier2/vector_field/ (implements IC-6)
  - tools/diagnostics/tier2/closed_form/ (implements IC-7)
  - Per-stack and per-substack docs per § 8.1.
  - Staged dependency entries for docs/dependencies.md (Stage 3 will consolidate).
  - Tolerance-budget update for Phase 1 (carry-forward from Phase 0).

**Task 1.0 — Cross-phase audit replay (FIRST ACTION; per spec § 7.5 + R9 amendments).**

Before ANY other action, run:

    python -m integrity.scripts.replay_prior_phase \
      --prior-phase phase-0 \
      --audit docs/_audits/phase-0/landing-<UTC>.md \
      --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget

(Resolve `<UTC>` by listing `docs/_audits/phase-0/` for the landing file.)

Expected: exit 0 with all gates matching the Phase 0 landing audit's claims.

- **Exit 0 → proceed to Task 1.1.** Record the replay-pass as a FACT in your Stage 1 checkpoint log.
- **Exit 1 → BLOCKED.** Write `docs/_audits/phase-1/stage-1-blocked-replay-<UTC>.md` with verdict BLOCKED, evidence_paths citing the replay script's output, and the specific discrepancies. End the session and surface to operator. Do NOT begin Stage 1 work; Phase 0's foundation is suspect.

This task is the load-bearing detector for a falsely-CONFIRMED Phase 0 landing. Skipping it (or running it as a formality after work has begun) defeats its purpose.

**Task 1.1 — Tolerance-budget Phase 1 update.**

After Task 1.0 passes, update `tools/testkit/equivalence/tolerance-budget.toml`:
- Change `[phase] phase = "phase-0"` to `[phase] phase = "phase-1"`.
- Change `opened_at` to the current UTC.
- Do NOT widen any per-category budget (carry-forward only). Per spec § 2.6, any widening requires a separate operator-approved amendment commit.
- Commit as: `phase1(stage1): tolerance-budget Phase 1 carryover`.

Standing orders (apply to every action):

1. **Re-anchor first** (Convention M). View the actual state of every path the charter expects to interact with. The charter is drafted without re-anchoring; HEAD wins (Hard Rule 2). Pay particular attention to:
   - Probing common/common-ts/ for Phase 0's namespace choice (substitute consistently as bit_physics).
   - Verifying Phase 0's tools/testkit/schemas/ vs common/schemas/.
   - Verifying Phase 0's tools/diagnostics/tier2/scalar_field/ for naming conventions to mirror.
   - Probing Phase 0's Stack D dep manager (charter assumes uv per spec § 9.1; verify).

2. **Never assert from memory** (Convention #8). Every path, signature, version, citation grep-verified or web-fetched at the moment of assertion.

3. **Commit incrementally.** Commit after each module:
   - Task 1.0 + Task 1.1 above (replay + budget carryover).
   - After common-cpp: `phase1(stage1/common-cpp): scaffold + tests`
   - After common-py: `phase1(stage1/common-py): scaffold + tests`
   - After tier2/particle: `phase1(stage1/tier2-particle): substack + tests`
   - After tier2/vector_field: `phase1(stage1/tier2-vector-field): substack + tests`
   - After tier2/closed_form: `phase1(stage1/tier2-closed-form): substack + tests`
   - Final Stage 1 checkpoint: `phase1(stage1): checkpoint complete`
   (Commit messages follow Conventional Commits.)

4. **Convention A — new files first.** Each module's commit ships new files. You will not edit any pre-existing file in Stage 1; everything you commit is new.

5. **Tests come first; do not implement sims.** Your own tests for common-cpp / common-py / Tier 2 substacks MUST PASS (these are infrastructure, not TDD-staged). No sim implementations land in Stage 1.

6. **FACT vs INFERENCE tagging.** Every concrete claim in docs/common/cpp.md, docs/common/py.md, docs/diagnostics/tier2-*.md is tagged. FACTs grep- or web-verifiable; INFERENCEs cite FACTs they depend on.

7. **IC contracts (charter § 3).** Implement IC-1 through IC-7 EXACTLY as specified, with one exception: if Phase 0's common-ts has shipped a surface that conflicts (e.g., different namespace, different method names), follow Phase 0 and document the shift in the checkpoint log. Never silently adapt.

8. **Context budgeting.** If context is getting tight before Stage 1 completes, commit work-in-progress per Convention A, then write a checkpoint log entry to docs/_audits/phase-1/stage-1-checkpoint-<UTC>.md with verdict "partial-needs-continuation" listing what's done vs what remains. The operator will dispatch a continuation session.

Per-module deliverables — common-cpp:

A. CMakeLists.txt. C++20, Vulkan 1.3 (subgroups + timeline semaphores + dynamic rendering), FetchContent + Ninja per spec § 9.1. Pin every dep; document each in docs/common/cpp.md AND common/common-cpp/_staging/deps.md.
B. Implement IC-1 exactly (charter § 3.1). Header at common/common-cpp/include/bit_physics/common/capture.hpp.
C. Implement IC-3 exactly (charter § 3.3). Header at common/common-cpp/include/bit_physics/common/determinism.hpp.
D. Additional public APIs per spec § 4.3: Vulkan device init, descriptor management, swap chain. Caller-configurable choosePresentMode(config). ImGui hooks (header-only). OpenVDB/Alembic/USD export hooks (header surface only).
E. Smoke sim at common/common-cpp/smoke/ — 1D advection, coarse grid, deterministic, 100 steps, capture interval 10.
F. Tests using doctest (or whatever Phase 0 chose; probe first): capture round-trip; determinism with seed; cross-stack equivalence with common-ts smoke output within § 2.6 closed-form tolerance.
G. docs/common/cpp.md per § 8.1 — document every public API; tag INFERENCE vs FACT; include dep table with rationale per § 9.2.
H. common/common-cpp/_staging/deps.md — formatted for Stage 3 consolidation:
   ```
   ## common-cpp dependencies (Phase 1)
   | Name | Version | Rationale (§ 9.2) | Provenance |
   |---|---|---|---|
   ```
I. Local Cat 2 / Cat 4 check if Phase 0 landed the runners; include in commit-time check.

Per-module deliverables — common-py:

A. pyproject.toml managed by uv per spec § 9.1. Pin Taichi (verified-current), h5py, numpy, watchfiles. Document in docs/common/py.md + _staging/deps.md.
B. Implement IC-2 exactly (charter § 3.2).
C. Implement IC-4 exactly (charter § 3.4).
D. Additional module surface per spec § 4.4: .alembic / .vdb (stubs); .plotting (matplotlib); .ggui (F-key workaround); .hotreload (watchfiles + child-process re-exec).
E. Smoke sim mirroring common-cpp's.
F. Tests using pytest + pytest-cov per spec § 7.7: capture round-trip via h5py; determinism with Taichi flag set; cross-stack equivalence vs common-ts + common-cpp smoke captures.
G. docs/common/py.md — document IC-2 + IC-4 + D; document the three Taichi limitations from § 4.4 verbatim; include dep table.
H. common/common-py/_staging/deps.md format mirrors common-cpp.

Per-substack deliverables — tier2/particle (then tier2/vector_field, then tier2/closed_form):

A. Public API exactly per IC-5 / IC-6 / IC-7 (charter § 3.5 / § 3.6 / § 3.7). Function signatures, parameter names, return types verbatim.
B. CheckResult type at tools/diagnostics/tier2/_types.py if scalar_field doesn't already define it; mirror scalar_field's location otherwise.
C. Internal tests using synthetic fixture data — see § 3.5 / § 3.6 / § 3.7 for fixture suggestions per substack.
D. Docs at docs/diagnostics/tier2-{particle,vector-field,closed-form}.md per § 8.1.

Stage 1 closing — checkpoint log:

When all 5 modules have committed cleanly, write a Stage 1 checkpoint log entry at docs/_audits/phase-1/stage-1-checkpoint-<UTC>.md per IC-9 abbreviated structure:
  - Front-matter: date, author "phase1-agent", stage "1-infrastructure", verdict-state "complete"
  - Body: list of commits with SHAs; IC-1 through IC-7 conformance summary; any shifts from charter; banked items if any.

Commit the checkpoint with: `phase1(stage1): infrastructure checkpoint complete`.

Then stop. The operator will dispatch Stage 2 in a fresh session.

Out of scope for Stage 1:
- Sim implementations.
- Stage 2 work (per-sim TDD bootstraps).
- Stage 3 work (convergence files, phase audit).
- Editing common/common-ts/ or any Phase 0 deliverable.
- Editing top-level CMake, pnpm-workspace.yaml, docs/dependencies.md (additive in Stage 3).

When stuck, consult charter § 9 problem-solving playbook.
```

### § 7.2 Stage 2 prompt

```
You are the Phase 1 Claude Code agent (Stage 2 dispatch) for the Bit-Physics repository.

Read charter at docs/phases/phase-1-plan.md. Pay particular attention to:
  - § 2.2 (per-sim deliverables)
  - § 3 (IC contracts you CONSUME this stage; especially IC-8 probe structure and IC-10 spec § 6 format)
  - § 4.3 (sequencing within Stage 2)
  - § 8 (checkpoint discipline)
  - § 9 (playbook)

Read the Stage 1 checkpoint at docs/_audits/phase-1/stage-1-checkpoint-<UTC>.md. Note any shifts from IC-1..IC-7. Your probes and tests in Stage 2 must reference the surfaces ACTUALLY committed in Stage 1, not the charter's IC text — Stage 1's audit is the source of truth for what was built.

You are dispatching Stage 2 — Per-sim TDD bootstrap. Your scope is to bootstrap 9 sims in the order listed in charter § 4.3:

1. strange-attractors (Stack B, closed-form)
2. mandelbulb-explorer (Stack B, closed-form)
3. boids-3d (Stack B, agent-based)
4. physarum (Stack B, agent-based)
5. reaction-diffusion-3d (Stack C, continuous-CA)
6. sph-water (Stack C, particle-fluids; Phase-0-vendored SPlisHSPlasH)
7. eulerian-smoke (Stack C, volumetric-grid)
8. lattice-boltzmann-d3q19 (Stack C, lattice)
9. mpm-multimaterial (Stack D, hybrid-PG)

For each sim, deliver per charter § 2.2:
  - docs/sim-specs/<category>/<sim>/{README.md, spec-ref.md (12 sections per spec § 8.2; § 6 per IC-10), algebraic.md, determinism.md, equivalence.md}
  - tools/testkit/probes/reports/<sim>.md per IC-8
  - Failing test suite at the per-stack location, WITH failing-output capture + sha256 in commit footer (see Standing Order 4 below)
  - Golden tables and/or MMS solutions specific to that sim, with ≥ 3 independent-reference anchors per spec § 2.4
  - PBT invariant declarations in spec § 6 (≥ 2 per sim; PBT implementation deferred to per-sim implementation phase)
  - Placeholder entry in tests/fixtures/legacy-captures/ (file stub + sidecar JSON declaring the canonical descriptor; populated when implementation phase produces the capture)

Standing orders (apply per sim):

1. **Re-anchor first.** Before drafting each sim, view:
   - Stage 1's committed surface (the actual API names, namespaces, signatures — Stage 1's audit is the index).
   - The category-relevant spec sections (e.g., § 5.4 for sph-water).
   - Any prior sim's spec sheet for category-internal conventions to mirror.

2. **Never assert from memory** (Convention #8). Web-fetch every citation with verified DOI (playbook P3 fallback if web-fetch is flaky).

3. **Commit incrementally — one commit per sim's full bundle PLUS the failing-tests-output evidence file.** Per spec § 1.3 step 4 (R9 amendment): before committing each sim's TDD bundle:
   - Run the per-sim test suite once: `pytest <test-path> -v 2>&1 | tee tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt`.
   - The tests MUST fail with `ModuleNotFoundError` (or equivalent missing-implementation error). NOT framework misconfiguration, NOT collection error, NOT fixture-missing error.
   - Compute `sha256sum tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt`. Record the hex.
   - Commit format: `phase1(stage2/<sim>): TDD bootstrap` with footer:
     ```
     Failing-tests-output: tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt
     Failing-tests-output-hash: sha256:<full-64-char-hex>
     ```
   - The per-sim report's front-matter `evidence_hashes:` MUST include the file path → sha256 mapping.

4. **Tests fail with module-not-found / undefined-symbol / missing-fixture, NOT framework misconfiguration.** Verify the failure mode before commit. If a test would pass (because Phase 0 has an unexpected stub) or would fail-for-wrong-reason, fix the test design before commit (playbook P9, P10).

5. **FACT vs INFERENCE tagging.** Every concrete claim is tagged.

6. **IC contracts (charter § 3).** Probes follow IC-8 exactly. Spec § 6 sections follow IC-10 exactly. IC-1..IC-7 references in probes cite the AS-COMMITTED surfaces from Stage 1, not the charter's IC text. Spec § 6 also declares ≥ 2 PBT-covered invariants per spec § 2.14 (R9 amendment).

7. **Golden-table independent-reference anchors.** For every per-sim golden table you produce (cubic-spline kernel goldens for SPH-water already exist from Phase 0 — do NOT re-derive; for new tables in this phase: lattice-boltzmann equilibrium constants, MPM constitutive kernel evaluations), include ≥ 3 independent-reference anchors per spec § 2.4. The anchor source MUST be independent of the in-repo derivation: a paper appendix, a textbook table, or a hand-derivation from first principles. The generator must verify SymPy values agree with anchor values at anchor points.

8. **Context budgeting.** If context tightens, write a Stage 2 checkpoint log entry listing which sims are committed vs which remain. The operator dispatches a continuation session.

9. **Out-of-scope guardrails:**
   - Do not implement sims (TDD bootstrap only — tests must remain failing).
   - Do not edit Stage 1 deliverables; if you find a defect there, document and surface (playbook P12).
   - Do not touch convergence files (Stage 3 owns).
   - Do not re-vendor SPlisHSPlasH for sph-water (Phase 0 owns; playbook P4 for verification).
   - Do not widen tolerance budgets (R9 amendment: spec § 2.6).
   - Do not edit any file under docs/_audits/ that already exists at the v0.0.0-phase-0 tag (append-only).

Per-sim specifics — see charter § 7 detailed instructions section below for each sim. Each sim has a re-anchor checklist, deliverable list, and out-of-scope notes. The charter's text on each sim is the source of truth.

[Detailed per-sim instructions — included verbatim from R5's § 7.4 through § 7.10 with W2- prefix removed; the agent reads charter § 7.4-§ 7.10 directly rather than having them duplicated in this dispatch prompt. The dispatch prompt simply points the agent to those sections.]

For each sim's specifics, read charter § 7.4 (closed-form), § 7.5 (agent-based), § 7.6 (continuous-ca / RD-3d), § 7.7 (sph-water), § 7.8 (eulerian-smoke), § 7.9 (lattice-boltzmann), § 7.10 (mpm-multimaterial). Each section gives the specific deliverables, re-anchor checklist, and out-of-scope notes for that sim.

[NOTE: § 7.4-§ 7.10 are the per-sim agent prompts from R5, retained verbatim in this charter for the agent to reference. They contain the specific work for each sim — there is no need to reproduce them in this Stage 2 dispatch prompt. The dispatch prompt simply directs the agent to them.]

Stage 2 closing — checkpoint log:

When all 9 sims have committed cleanly, write a Stage 2 checkpoint log entry at docs/_audits/phase-1/stage-2-checkpoint-<UTC>.md per IC-9 abbreviated structure. Include for each sim: SHA of its commit, brief deliverable summary, any deviations from charter, any banked items, sha256 of the failing-tests output file.

Commit: `phase1(stage2): per-sim TDD bootstrap complete`.

Then stop. The operator will dispatch Stage 3 in a fresh session.

When stuck, consult charter § 9 problem-solving playbook.
```

### § 7.3 Stage 3 prompt

```
You are the Phase 1 Claude Code agent (Stage 3 dispatch) for the Bit-Physics repository.

Read charter at docs/phases/phase-1-plan.md. Pay particular attention to:
  - § 2.3 (Stage 3 deliverables)
  - § 2.4 (acceptance criteria)
  - § 2.5 (what this unblocks)
  - § 3.9 (IC-9 phase audit body structure)
  - § 9 (playbook; P15 convergence work)

Read the Stage 1 and Stage 2 checkpoint logs:
  - docs/_audits/phase-1/stage-1-checkpoint-<UTC>.md
  - docs/_audits/phase-1/stage-2-checkpoint-<UTC>.md

Standing orders:

L1. You are the only stage that touches convergence files. Stage 1 and Stage 2 produced no edits to pre-existing files (Convention A).
L2. You commit and write the phase audit. Convention #12 SHA back-fill is a separate follow-up commit. Never --amend.
L3. **All edits to previously-existing files are ADDITIVE.** Read the file first; append new entries; do not rewrite Phase 0 content.
L4. **Commit incrementally.** Each Step 4.x is its own commit.

YOUR PROCEDURE:

STEP 1 — Read both checkpoint logs. Tally:
  - Stage 1 commits and IC-1..IC-7 conformance summary.
  - Stage 2 commits per sim; banked items; any deviations.
  - Any "blocked" status in either checkpoint → halt, write a partial phase audit with verdict HALTED, surface to operator.

STEP 2 — Closing-commit anchor re-check (Convention 7.9). Re-grep every concrete anchor in:
  - The charter at docs/phases/phase-1-plan.md.
  - Both checkpoint logs.
  - Every new spec sheet, README, algebraic, determinism, equivalence, probe, derivation, MMS solution (paths from checkpoint logs).

For each anchor that doesn't resolve at HEAD: append-only addendum to the relevant checkpoint log. Structural drift: halt as HALTED-ON-ANCHOR-DRIFT.

STEP 3 — Verify the failing-tests gate. Run:
  - Stack B: `pnpm -r test`
  - Stack C: `cmake -S . -B build && cmake --build build && ctest --test-dir build`
  - Stack D: `uv run pytest` against new sim packages + common-py + 3 new Tier 2 substacks.

Expected:
  - Sim test suites (9 sims) RED with module-not-found / undefined-symbol / missing-fixture. Other RED reasons → HALTED-ON-INFRASTRUCTURE-FAIL.
  - Unexpectedly GREEN → HALTED-ON-UNEXPECTED-GREEN.
  - Common-module tests GREEN. Else: HALTED-ON-COMMON-MODULE-RED.
  - Tier 2 substack tests GREEN. Else: HALTED-ON-TIER2-RED.
  - Phase 0 tests GREEN (RD-2d, common-ts, tier2/scalar_field). Else: HALTED-ON-PHASE-0-REGRESSION.

Document each test run with output excerpts.

STEP 4 — Convergence-side edits. Each is one commit; read existing file first; append additively.

  4.1 Stack B workspace registration. Read pnpm-workspace.yaml. Append: strange-attractors, mandelbulb-explorer, boids-3d, physarum. `phase1(stage3): register Stack B packages`.

  4.2 Stack C build registration. Read top-level CMakeLists.txt. Append 4 add_subdirectory() lines. `phase1(stage3): register Stack C sims in top-level CMake`.

  4.3 Stack D workspace. If Phase 0 created a workspace listing, append hybrid-pg/mpm-multimaterial. Else skip + document. `phase1(stage3): register Stack D mpm sim` (or skip).

  4.4 justfile. Append recipes for new sim test invocation; wire Tier 2 substack recipes. `phase1(stage3): justfile recipes for new sims and Tier 2`.

  4.5 dependencies.md consolidation. Read common/common-cpp/_staging/deps.md and common/common-py/_staging/deps.md. Append both sections to docs/dependencies.md (additive). Delete staging files. `phase1(stage3): consolidate Phase 1 dependency entries`.

  4.6 Integrity-toolkit registries: 3 Tier 2 substacks; 2 MMS solutions (RD-3d, incompressible-ns-2d); 6 golden tables (closed-form ×2, agent-based, DFSPH, D3Q19, MLS-MPM); SPlisHSPlasH manifest scope.used_by_sims (append `particle-fluid/sph-water` if Phase 0 left blank); if Stage 2 surfaced Krüger 2017 vendoring as SHIFTED, add vendored-upstream registry entry. `phase1(stage3): integrity toolkit registry updates`.

  4.7 docs/diagnostics/overview.md. Read. If enumerates substacks, append 3 entries. Else skip. `phase1(stage3): diagnostics overview tier2 additions` (or skip).

  4.8 docs/sim-specs/README.md. Read. Append 9 sim links, grouped by category. `phase1(stage3): sim-spec index updated for Phase 1 sims`.

  4.9 CI workflow updates. If Phase 0's workflows are path-glob, skip. If per-sim explicit, append. `phase1(stage3): CI workflows for Phase 1 sims` (or skip).

  4.10 CHANGELOG.md Phase 1 entry. Read existing format. Append: 2 common-module scaffolds; 3 Tier 2 substacks; 9 sim TDD bundles; new MMS for RD-3d and incompressible-ns-2d; new goldens. Phase 0's RD-2d unchanged. `phase1(stage3): CHANGELOG entry`.

After 4.1–4.10, re-run integrity gates (Step 5).

STEP 5 — Integrity checks. Run integrity Cat 1, 2, 4, 5, X against final state.
  - Cat 1 (citations): every file:line resolves; vendored citations match manifest.
  - Cat 2 (contracts): every public API has matching declaration. Verify IC-1..IC-10 conformance against committed code.
  - Cat 4 (draft-time): every spec/audit passes draft-time scanning. **All three grammars** (a) `<path>:<line>`, (b) `<phrase "X" in Y>`, (c) `<API X has shape Y>` exercised per R8 amendments.
  - Cat 5 (provenance): every INFERENCE links to FACTs.
  - **Cat-X (tolerance budget):** per spec § 2.6 + R9 amendments. Any tolerance.toml override exceeding tolerance-budget.toml triggers HARD_FAIL.

HARD_FAIL → HALTED-ON-INTEGRITY-FAIL. SOFT_WARN → document. AUDIT_LOG → log to phase audit appendix.

STEP 5a — Evidence-path verification (per spec § 7.5 + R9 amendments). Run:

    for r in docs/_audits/phase-1/*-report.md docs/_audits/phase-1/*-checkpoint-*.md; do
        python -m integrity.scripts.verify_evidence --audit "$r" --strict || exit 1
    done

Any failure → HALTED-ON-EVIDENCE-FAIL. The audit cited an evidence path that doesn't exist or whose sha256 doesn't match what the audit recorded; the audit's claims are unsupported.

STEP 5b — Failing-tests replay spot-check (per spec § 1.3 + R9 amendments). Pick 2 random sims from Stage 2. For each:
1. Check out the failing-tests-commit SHA: `git checkout <sha> -- <test-path>`.
2. Run pytest: `pytest <test-path> 2>&1 > /tmp/replay-output.txt`.
3. Compute `sha256sum /tmp/replay-output.txt`.
4. Compare to the hash in the commit footer.

Mismatch → REFUTED. Either the failing-tests commit was fabricated or the test setup has drifted. Surface to operator; do NOT proceed to STEP 6.

STEP 5c — Append-only audit check (per spec § 7.5 + R9 amendments). For every file under `docs/_audits/` already present at `v0.0.0-phase-0`, confirm that the v0.0.0-phase-0 content is a prefix of the HEAD content:

    git show v0.0.0-phase-0 --name-only docs/_audits/ | while read f; do
        if [ -f "$f" ]; then
            prior=$(git show v0.0.0-phase-0:"$f" 2>/dev/null)
            current=$(cat "$f")
            case "$current" in "$prior"*) ;; *) echo "VIOLATION: $f edited or shortened" && exit 1 ;; esac
        fi
    done

Violation → REFUTED. A Phase 0 audit was edited; reject the landing.

STEP 5d — Mutation-testing threshold check (per spec § 2.13 + R9 amendments). Run:

    bash tools/testkit/mutation/run-mutation.sh --gate

Compare against the Phase 0 baseline at `tools/testkit/mutation/baseline-<UTC>.json`. Any module whose mutation score has REGRESSED below the spec § 2.13 thresholds → HARD_FAIL. Phase 1 thresholds:
  - tools/testkit/code_verification/mms/: ≥ 80%.
  - tools/testkit/golden/: ≥ 80%.
  - tools/testkit/determinism/: ≥ 90%.
  - tools/testkit/equivalence/: ≥ 85%.
  - tools/testkit/property/: ≥ 80%.
  - tools/testkit/capture/: ≥ 90%.
  - tools/integrity/integrity/cat4_draft_time/: ≥ 90%.

A new mutation-score JSON is committed at `tools/testkit/mutation/phase-1-<UTC>.json` regardless of pass/fail.

STEP 5e — Next-phase preflight dry-run (per spec § 7.5 / Appendix G.7 — closes the LANDING coverage gap that caused the preflight-phase-1 post-landing hotfix; see `docs/_audits/phase-0/hotfix-preflight-phase-1-2026-05-20T01-34-58Z.md` and the addendum to the Phase 0 landing audit). Run:

    python tools/dispatch/preflight-phase.py 2

Expected outcome: every check PASSES except `prior-phase-tag:v0.1.0-phase-1`, which is expected to FAIL because the Phase 1 tag is operator-pushed in STEP 9 and is not present in the repo at audit-write time.

- Only `[FAIL]` is `prior-phase-tag:v0.1.0-phase-1` and every other check is `[PASS]` → record verdict GREEN-PENDING-OPERATOR-TAG-PUSH; proceed to STEP 6.
- Any other `[FAIL]` (missing path, integrity sub-check, capture descriptor, per-member pytest, etc.) → HALTED-ON-NEXT-PHASE-PRECONDITION. A real Phase 2 precondition is unmet at HEAD; the landing's CONFIRMED verdict cannot ship. Surface to operator with the verbatim preflight output and the specific failing check(s).

Record the full preflight stdout verbatim in the landing audit (STEP 6) under a dedicated `## Next-phase preflight (preflight-phase 2)` subsection. The Phase 0 landing missed this gate and shipped four preflight-phase-1 bugs that the operator surfaced on Phase 1's first dispatch; this step prevents the same class of failure from re-occurring at Phase 2 dispatch time.

STEP 6 — Phase audit. Write docs/_audits/phase-1/landing-<UTC>.md per IC-9 (charter § 3.9):

Front-matter:
  date: <date>
  author: phase1-agent
  subject: Phase 1 (Reference Sim TDD Bootstrap) landing for Bit-Physics
  verdict-state: CONFIRMED (or SHIFTED if convergence-time adaptation required)
  evidence_paths:
    - Stage 1 checkpoint log
    - Stage 2 checkpoint log
    - docs/phases/phase-1-plan.md
    - tools/testkit/mutation/phase-1-<UTC>.json
    - tools/testkit/failing-tests-evidence/* (one entry per sim)
    - <PHASE_1_LANDING_SHA> (placeholder for SHA back-fill)
  evidence_hashes:
    - tools/testkit/mutation/phase-1-<UTC>.json: <sha256>
    - tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt: <sha256>  (one per sim)

Body per IC-9 § 10 sections (charter § 3.9). Include:
- Mutation-test score per module (FACT-tagged with sha256 of the JSON).
- Failing-tests-output sha256 per sim (FACT-tagged).
- Replay-spot-check outcomes (FACT).
- Cat-X tolerance-budget pass (FACT).
- Append-only check pass (FACT).
- Cross-phase replay outcome from Stage 1 Task 1.0 (FACT, referencing Stage 1 checkpoint).
- **Next-phase preflight (preflight-phase 2) dry-run outcome** (FACT; verbatim stdout per STEP 5e). Required for CONFIRMED verdict. If only the `prior-phase-tag` check failed, record GREEN-PENDING-OPERATOR-TAG-PUSH; any other failure precludes CONFIRMED.

Commit: `phase1(stage3): phase audit`.

STEP 7 — Convention #12 SHA back-fill. After Step 6 commit lands, `git rev-parse HEAD` to get the SHA. Follow-up commit replacing `<PHASE_1_LANDING_SHA>` placeholder. Never --amend. `phase1(stage3): SHA back-fill for phase audit`.

STEP 8 — Final verification. `git log --oneline -50` shows clean linear order. Re-run integrity Cats — all pass. Re-run sim tests — still RED with module-not-found. Common-module + Tier 2 tests — still GREEN. Phase 0 RD-2d — still GREEN.

STEP 9 — **Prepare tag, do NOT push** (per spec § 7.12 + R9 amendments).

Append to the closing summary:

    Proposed tag: v0.1.0-phase-1
    Tag commit SHA: <Step 7 SHA, or Step 6 SHA if no back-fill needed>
    Tag pushed: NO (operator action required)

The operator reads the landing audit, runs `verify_evidence.py` independently against it, runs `replay_prior_phase.py --prior-phase phase-1` from a Phase 2 perspective as a pre-check, and pushes the tag:

    git tag -s v0.1.0-phase-1 <sha>
    git push origin v0.1.0-phase-1

The agent does NOT run `git tag` or `git push`.

Final summary: "Phase 1 landed for Bit-Physics at SHA <final>. <count> commits in landing sequence. Phase audit at <path>. Failing-tests gate verified RED-with-module-not-found for sims, GREEN for common modules and Tier 2 substacks. Phase 0's RD-2d unaffected. Tag pushed: NO (operator action required). Next phase: per-sim implementation (subsequent), recommended order: closed-form pair, agent-based pair, then complex Stack C / D."

Done. Surface to operator.

When stuck, consult charter § 9 problem-solving playbook.
```

---

---

The remaining § 7 subsections (§ 7.4 through § 7.10) are reference cards the Stage 2 agent reads before each sim. They are not separate dispatch prompts in single-agent mode; the Stage 2 prompt at § 7.2 directs the agent to consult them in the order from § 4.3.

### § 7.4 Sim 1–2: strange-attractors + mandelbulb-explorer (closed-form, Stack B)

**Re-anchor checklist (do all before drafting either sim):**

1. View spec § 5.1. Confirm Lorenz / Rössler / Aizawa / Pickover / Sprott set for strange-attractors; Hart / Quilez for mandelbulb. Web-fetch with playbook P3 fallback.
2. View per-sim spec template per spec § 8.2 (the 12 sections).
3. View `tools/testkit/probes/template.md` for Phase 0's probe shape.
4. View `common/common-ts/` API for what's available in Stack B.
5. View `tools/testkit/code_verification/golden/tables/` for golden-table JSON schema.
6. View `tools/diagnostics/tier2/closed_form/` (Stage 1 commit) to confirm IC-7 conformance — your tests will call those exact functions.
7. View Phase 0's `docs/sim-specs/continuous-ca/reaction-diffusion-2d/` for an exemplar 5-file doc set; mirror format.
8. Probe Stack B test framework: vitest by default (Vite stack per spec § 9.1); confirm against Phase 0.

**Per-sim deliverables (apply to both):**

- README.md per spec § 8.1.
- spec-ref.md per spec § 8.2; § 6 follows IC-10 (charter § 3.10):
  - 6.1 code verification: golden-value.
  - 6.2 solution verification: not applicable.
  - 6.3, 6.4: not applicable for canonical closed-form.
  - 6.5 gates 1–3 this phase; 4–10 deferred.
- algebraic.md.
  - Strange-attractors: each attractor's ODE in LaTeX, canonical parameters, closed-form integrator arithmetic per step.
  - Mandelbulb: distance estimator derivation, citing Hart / Quilez verbatim.
- determinism.md. Bit-exact same-hw same-stack (closed-form has no nondeterministic ops). Reference spec § 2.5.
- equivalence.md. Stub. Tolerance row from spec § 2.6 closed-form. Stack A→B variant deferred to Phase 2.
- Golden tables — **derived analytically (or via a vetted reference script), NOT from a future sim implementation**.
  - Strange-attractors: canonical trajectory per attractor, fixed ICs and params, sampled at fixed time points (RK4 with fixed dt or similar).
  - Mandelbulb: probe (ray-origin, ray-direction) points with DE outputs at fixed iteration cap.
- Probe per IC-8 (charter § 3.8). Six sections, every enumeration grep-verified verbatim.
- Failing test suite using vitest:
  - Code verification: load golden, instantiate sim (does not exist → module-not-found).
  - Determinism: capture-twice-and-diff (fails on import).
  - Tier 1: NaN/Inf scan.
  - Tier 2 closed-form: IC-7 checks.
  - Tests MUST FAIL with module-not-found.

**Commit pattern:** one commit covering both sims (closed-form is a pair). `phase1(stage2/closed-form): TDD bootstrap for strange-attractors + mandelbulb-explorer`.

**Out of scope:** sim implementations; Stack A shaders; 3DGS; other sims.

### § 7.5 Sim 3–4: boids-3d + physarum (agent-based, Stack B)

**Re-anchor checklist:**

1. View spec § 5.3. Confirm Reynolds 1987 (boids); Jones 2010 (physarum). Web-fetch with playbook P3 fallback.
2. View `common/common-ts/` API.
3. View `tools/diagnostics/tier2/particle/` (Stage 1 commit) for IC-5 conformance.
4. View `tools/diagnostics/tier2/scalar_field/` (Phase 0) — physarum's trail map uses scalar-field diagnostics alongside particle.

**Per-sim deliverables:**

- README.md.
- spec-ref.md per § 8.2; § 6 per IC-10:
  - 6.1 code verification: golden agent trajectories on small fixtures (per spec § 5.3, "3-agent test cases for boids"). No PDE → no MMS.
  - 6.4 calculation validation: flocking metrics against published values where available.
  - § 8: per spec § 2.6 "Boids / Physarum" — bit-exact same-hw for boids; cross-stack distributional for physarum (chaotic). Use EFECT (spec § 2.5).
  - § 10: Tier 1 + IC-5 particle for both; physarum also uses Phase 0's tier2/scalar_field.
- algebraic.md per sim.
  - Boids: separation / alignment / cohesion in vector form, weights, neighborhood radius, max-speed clamp.
  - Physarum: 5-component update (sense, rotate, move, deposit, diffuse) with each step's algebra.
- determinism.md per sim.
  - Boids: bit-exact same-hw if no spatial-hash atomics.
  - Physarum: non-deterministic-by-design (stochastic motion); EFECT equality.
- equivalence.md per sim. Stack-B-only at present.
- Golden tables:
  - Boids: 3-agent fixture (3 agents at specified positions / velocities, evolved N steps under Reynolds rules; closed-form arithmetic per step).
  - Physarum: deterministic-seeded canonical capture + distributional test target (EFECT-style or χ² on trail-density histograms). NB: physarum "golden" is SEED + baseline; comparison is distributional.
- Probes per IC-8.
- Failing test suites:
  - Boids: 3-agent golden trajectory; flocking metrics on larger seeded run; determinism; Tier 1 + IC-5.
  - Physarum: deterministic-seeded canonical within distributional tolerance; trail-map mass conservation modulo decay; Tier 1 + IC-5 + tier2/scalar_field.

**Commit pattern:** one commit covering both sims. `phase1(stage2/agent-based): TDD bootstrap for boids-3d + physarum`.

**Out of scope:** scalability frontier; Stack C / D variants.

### § 7.6 Sim 5: reaction-diffusion-3d (continuous-CA, Stack C)

**RD-2d is excluded — see charter § 1.3.**

**Re-anchor checklist (CRITICAL — verify Phase 0's RD-2d):**

1. View spec § 5.2.1 and § 11.2 item 1.2. Confirm Gray-Scott (Pearson 1993). Web-fetch with playbook P3 fallback.
2. **Verify Phase 0's RD-2d.** Spec § 0.13 says Phase 0's stub goes "spec → tests → implementation → all gates green." View `docs/sim-specs/continuous-ca/reaction-diffusion-2d/` AND `packages/reaction-diffusion-2d/` at HEAD.
   - If complete (5 doc files + probe + tests + impl + all gates green): proceed with RD-3d only.
   - If partial: write a blocked checkpoint, surface to operator. Halt.
3. View `tools/testkit/code_verification/mms/solutions/heat-1d/` (Phase 0). View Phase 0's RD-2d MMS (implied by § 0.13). Your RD-3d MMS extends to 3D.
4. View Stage 1 common-cpp commit; mirror namespace + test framework choices.
5. View Phase 0's `tier2/scalar_field/` AND Stage 1's `tier2/vector_field/`.

**Substantive deliverables:**

- README.md.
- spec-ref.md per § 8.2; § 6 per IC-10:
  - 6.1 code verification: MMS.
  - 6.2 solution verification: GCI declared, deferred.
  - 6.3, 6.4: not applicable.
- algebraic.md. 3D Gray-Scott full derivation. Pearson parameter conventions (F feed, k kill); regime table; CFL condition.
- determinism.md. Bit-exact same-stack same-hw (Stack C explicit, no atomic scatter).
- equivalence.md. Stack-C only at present; Stack-B / D replication Phase 2.
- MMS solution for 3D reaction-diffusion at `tools/testkit/code_verification/mms/solutions/reaction-diffusion-3d/`. Recommend `u(x,y,z,t) = (sin(πx) cos(πy) sin(πz) + 2) / 4` and `v` with different harmonics. SymPy-derive source. Commit `derive.py` + `derivation.md`.
- Probe per IC-8.
- Failing test suite using Stage 1's chosen C++ test framework:
  - MMS-based OOA (3 grid resolutions; observed OOA matches formal within ±0.5).
  - Determinism.
  - Tier 1 (NaN / Inf).
  - Tier 2: scalar_field bound preservation + mass conservation; optionally IC-6 vector_field on gradients.
  - Tests MUST FAIL with module-not-found.

**Commit pattern:** `phase1(stage2/reaction-diffusion-3d): TDD bootstrap`.

**Out of scope:** reaction-diffusion-2d (Phase 0); Stack A → B; differentiable / sparse; Lenia, Neural CA; duplicating Phase 0 MMS infrastructure.

### § 7.7 Sim 6: sph-water (particle-fluids, Stack C)

**Phase 0 § 0.8 already vendored SPlisHSPlasH — reference it, do not re-vendor.**

**Re-anchor checklist (CRITICAL — verify Phase 0's vendoring):**

1. View spec § 5.4. Confirm Stack C, DFSPH, 2–4M particles, Morton-sorted, screen-space rendering.
2. **View `references/SPlisHSPlasH/` at HEAD.** Verify per spec § 2.8: SHA in manifest matches actual git tree; license file present; TOML fields populated (`upstream.{name,version,sha,url,license,license_file}`; `scope.{purpose,used_by_sims,used_by_checks}`; `vendoring.{fetched_utc,fetched_by,fetch_command}`).
   - Fields missing / wrong: SHIFTED in checkpoint log; proceed with what's there.
   - Directory doesn't exist: blocked checkpoint. Halt.
3. View Phase 0's existing golden cubic-spline-kernel table. Your DFSPH density-evolution golden extends the pattern.
4. View Stage 1 common-cpp commit for namespace + test framework.
5. View Stage 1 `tier2/particle/` for IC-5 conformance.

**Substantive deliverables:**

- README.md.
- spec-ref.md per § 8.2; § 6 per IC-10:
  - § 2: cite SPlisHSPlasH by manifest path and SHA — **read FROM the vendored manifest, NOT memory**. Cite Bender & Koschier 2015 (DFSPH) with verified DOI.
  - 6.1 code verification: Phase-0's cubic-spline-kernel golden + your new DFSPH density-evolution golden.
  - 6.2 solution verification: GCI declared, deferred.
  - 6.3 model validation: against SPlisHSPlasH reference renders.
  - 6.4 calculation validation: dam-break / rotating-bucket (declared, deferred).
  - § 8: per spec § 2.6 SPH — epsilon (atomics) same-stack same-hw.
  - § 10: Tier 1 + IC-5 particle.
- algebraic.md. DFSPH derivation + cubic-spline kernel evaluation. Sets up the density-evolution arithmetic the new golden encodes.
- determinism.md. Epsilon (atomic scatter-add in neighbor accumulation breaks bit-exact even same-hw).
- equivalence.md. Stack-C only; Stack-D replication Phase 2.
- DFSPH density-evolution golden at `tools/testkit/code_verification/golden/tables/particle-fluids/dfsph-density-evolution.json`. 64 particles in regular grid at known density; density-prediction step closed-form. JSON schema matches Phase 0's cubic-spline-kernel.
- Derivation at `tools/testkit/code_verification/golden/derivations/dfsph-density-evolution.md`.
- Probe per IC-8. Enumerate SPlisHSPlasH paths from vendored tree; common-cpp APIs (IC-1, IC-3); license file location; IC-5 check signatures.
- Failing test suite:
  - Phase 0's cubic-spline-kernel golden (exists; test asserts sim output matches).
  - DFSPH density evolution against the new golden.
  - Determinism within epsilon.
  - Tier 1 + IC-5.
  - Dam-break canonical-capture comparison (stubbed / deferred).

**Commit pattern:** `phase1(stage2/sph-water): TDD bootstrap`.

**Out of scope:** re-vendoring SPlisHSPlasH; modifying `references/SPlisHSPlasH/` or its manifest; differentiable / 3DGS / flow-map SPH (Phase 4); Stack D / E ports; screen-space rendering implementation.

### § 7.8 Sim 7: eulerian-smoke (volumetric-grid, Stack C)

**Re-anchor checklist:**

1. View spec § 5.6. Confirm Stack C, semi-Lagrangian + MacCormack, vorticity confinement, Jacobi pressure projection.
2. View spec § 2.2 + Phase 0's heat-1D MMS. Yours is incompressible NS — manufactured solution divergence-free analytically.
3. View Stage 1 common-cpp commit.
4. View Stage 1 `tier2/vector_field/` for IC-6 conformance.
5. Web-fetch Stam 1999 ("Stable Fluids") and Fedkiw et al. (vorticity confinement); playbook P3 fallback.

**Substantive deliverables:**

- README.md.
- MMS solution for incompressible NS at `tools/testkit/code_verification/mms/solutions/incompressible-ns-2d/`. Taylor-Green vortex variant — velocity divergence-free, pressure derivable. SymPy-derive. Commit `derive.py` + `derivation.md`.
- spec-ref.md per § 8.2; § 6 per IC-10:
  - 6.1 code verification: new MMS.
  - 6.2 solution verification: GCI declared, deferred.
  - 6.3 model validation: Stam / Fedkiw demos.
  - 6.4 calculation validation: decay-of-decaying-turbulence (declared, deferred).
  - § 8: per spec § 2.6 Stam / Fedkiw — epsilon same-stack same-hw.
  - § 10: Tier 1 + IC-6 vector_field.
- algebraic.md. Stam stable-fluids pipeline (advect → diffuse → project → advect-density) + Fedkiw vorticity confinement + Jacobi pressure projection.
- determinism.md. Epsilon (pressure-projection reductions).
- equivalence.md. Stack-C only at present.
- Probe per IC-8.
- Failing test suite:
  - MMS-based OOA for advection (semi-Lagrangian first-order, MacCormack second).
  - MMS-based OOA for projection (second-order pressure gradient).
  - IC-6 vector_field: divergence-free post-projection within FP tolerance; energy spectrum (declared, deferred).
  - Determinism within epsilon.
  - Tier 1.

**Commit pattern:** `phase1(stage2/eulerian-smoke): TDD bootstrap`.

**Out of scope:** flow-map family, NanoVDB / quadtree, Gaussian fluids, neural particle level set, 3DGS — all Phase 4.

### § 7.9 Sim 8: lattice-boltzmann-d3q19 (lattice, Stack C)

**Re-anchor checklist:**

1. View spec § 5.7. Confirm Stack C, D3Q19 BGK, NACA airfoil. Note spec text: "Vendored against Krüger et al. 2017 book companion code (D2Q9 only); D3Q19 lattice constants derived in `tools/testkit/code_verification/golden/derivations/d3q19.md`."
2. View `references/` for a Krüger 2017 directory.
   - If absent, decide: (a) vendor as a separate sub-step per spec § 2.8 (your scope expands within Stage 2 — SHIFTED in checkpoint with justification) OR (b) cite as algebraic-ground-truth without vendored code path (INFERENCE). Document choice in checkpoint log.
3. View Stage 1 common-cpp commit.
4. View Stage 1 `tier2/vector_field/` for IC-6 conformance.
5. Web-fetch Krüger 2017 + original D3Q19 publication (likely Qian-d'Humières-Lallemand 1992); playbook P3 fallback.

**Substantive deliverables:**

- README.md.
- `d3q19.md` at `tools/testkit/code_verification/golden/derivations/d3q19.md` (called out by name in spec). Derive from first principles: 19 velocity vectors, 19 weights, sound speed c_s, equilibrium distribution f_i^eq. Cite Krüger 2017 + Qian-d'Humières-Lallemand 1992.
- Equilibrium golden table at `tools/testkit/code_verification/golden/tables/lattice/d3q19-equilibrium.json`. For fixed (ρ, u), compute f_i^eq for each of 19 directions analytically. JSON + a Python script `d3q19-equilibrium-script.py` that independently reproduces.
- spec-ref.md per § 8.2; § 6 per IC-10:
  - § 2: Krüger 2017, Qian-d'Humières-Lallemand 1992.
  - 6.1 code verification: MMS for incompressible NS via LBM moments + D3Q19 equilibrium golden.
  - 6.2 solution verification: GCI on Taylor-Green (declared, deferred).
  - 6.3 model validation: NACA-airfoil drag / lift.
  - 6.4 calculation validation: Schäfer-Turek 2D cylinder (deferred).
  - § 8: per spec § 2.6 LBM — bit-exact (effort) same-stack same-hw; epsilon different-hw.
  - § 10: Tier 1 + IC-6.
- algebraic.md. Complete D3Q19 BGK: lattice geometry, weights, equilibrium expansion, Chapman-Enskog → Navier-Stokes, bounce-back boundary derivation.
- determinism.md. Bit-exact (effort) — streaming + collision structurally deterministic; effort caveat is subgroup ops.
- equivalence.md. Stack-C only at present.
- Probe per IC-8.
- Failing test suite:
  - D3Q19 equilibrium golden comparison.
  - MMS-based OOA on streaming-collision (second-order space, first-order time for BGK).
  - IC-6 vector_field on macroscopic moments.
  - Determinism with documented LBM caveats.

**Commit pattern:** `phase1(stage2/lattice-boltzmann): TDD bootstrap`. (Document the Krüger vendoring decision in the checkpoint log.)

**Out of scope:** frontier variants (moment-encoded, AMR, NanoVDB, differentiable, OpenLB-scale) — Phase 4; Zou-He BCs.

### § 7.10 Sim 9: mpm-multimaterial (hybrid-PG, Stack D)

**Re-anchor checklist:**

1. View spec § 5.5. Confirm Stack D Taichi, MLS-MPM (Hu et al. 2018, 88-line reference), multi-material (viscoelastic / plastic / granular).
2. View Stage 1 common-py commit for module name + pytest config.
3. View Stage 1 `tier2/particle/` and `tier2/vector_field/` for IC-5 + IC-6.
4. Web-fetch Hu et al. 2018 ACM TOG paper — verified DOI + the canonical 88-line reference URL; playbook P3 fallback.

**Substantive deliverables:**

- README.md.
- MLS-MPM quadratic B-spline shape function derivation at `tools/testkit/code_verification/golden/derivations/mls-mpm-quadratic-bspline.md` + golden table at `tools/testkit/code_verification/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`. For fixed (particle position, grid node position), weight is closed-form. Golden table for representative offsets.
- spec-ref.md per § 8.2; § 6 per IC-10:
  - § 2: Hu et al. 2018.
  - 6.1 code verification: quadratic-B-spline golden + MMS for linear elasticity component.
  - 6.2 solution verification: grid convergence on cantilever-bending (declared, deferred).
  - 6.4 calculation validation: Hu 2018 multi-material demos.
  - § 8: per spec § 2.6 MPM — epsilon same-stack same-hw (P2G atomic scatter).
  - § 10: Tier 1 + IC-5 + IC-6 (on momentum grid).
- algebraic.md. Full MLS-MPM: APIC affine velocity, quadratic B-spline weights, P2G transfer, G2P transfer, deformation gradient update; three constitutive model equations.
- determinism.md. Epsilon same-stack same-hw.
- equivalence.md. Stack-D only at present; Stack-E (Warp) port Phase 2.
- Probe per IC-8.
- Failing test suite using pytest:
  - Quadratic B-spline shape function golden.
  - Mass conservation (P2G → G2P round-trip).
  - Momentum conservation (P2G → grid forces → G2P with no external force).
  - Cantilever-bending convergence (declared, deferred).
  - Determinism within epsilon.
  - Tier 1.

**Commit pattern:** `phase1(stage2/mpm-multimaterial): TDD bootstrap`. Document the three Taichi limitations from spec § 4.4 in spec-ref § 11.

**Out of scope:** DiffMPM, sparse MPM, 3DGS-MPM, Warp port — all Phase 4.

---

## § 8. Checkpoint and continuation discipline

### § 8.1 Checkpoint cadence

The agent commits frequently within a stage (every logical sub-deliverable) and writes a checkpoint log entry at the end of each stage. The fine-grained commits are the actual checkpoints; the log entry is the human-readable summary for the coordinator and for a continuation session.

### § 8.2 Checkpoint log entry format

At the end of each stage (or partway through if context is exhausted), the agent commits a checkpoint log entry at:
- Stage 1: `docs/_audits/phase-1/stage-1-checkpoint-<UTC>.md`
- Stage 2: `docs/_audits/phase-1/stage-2-checkpoint-<UTC>.md`
- Stage 3: the phase audit itself, no separate checkpoint.

Format (abbreviated IC-9):

```markdown
---
date: 2026-MM-DD
author: phase1-agent
stage: 1-infrastructure | 2-per-sim-tdd | 3-landing
verdict-state: complete | partial-needs-continuation | blocked
head_sha_at_checkpoint: <SHA>
---

## 1. Commits in this stage
| SHA | Commit message | Sub-deliverable | Notes |
|---|---|---|---|
| <SHA> | phase1(stage1/common-cpp): scaffold + tests | common-cpp | Adopted bit_physics=bitphysics; doctest framework |
| ... | ... | ... | ... |

## 2. IC contract conformance (Stage 1 only)
- IC-1 (capture I/O C++): committed at <path> with <deviation note or "matches charter">.
- IC-2..IC-7: same format.

## 3. Deviations from charter
(Any SHIFTED items: charter said X, Phase 0 had Y, agent followed Y.)

## 4. Banked items
(Anything DEFERRED to a later stage or for owner attention.)

## 5. What remains (if partial-needs-continuation)
(Specific list of sub-deliverables not yet committed; pick-up instructions for the continuation session.)
```

### § 8.3 Continuation prompt template

When the agent's session ends with `verdict-state: partial-needs-continuation`, the coordinator chat fills this template for the operator to paste into a fresh Claude Code session:

```
You are the Phase 1 Claude Code agent (continuation dispatch) for the Bit-Physics repository.

Read charter at docs/phases/phase-1-plan.md. Read also:
  - The prior checkpoint log at <CHECKPOINT_PATH>.
  - <PRIOR_STAGE_CHECKPOINT_PATH if applicable, e.g., Stage 1 checkpoint if you are continuing in Stage 2>.

You are continuing Stage <N>. The prior session committed up to SHA <LAST_SHA>. Remaining sub-deliverables per the checkpoint log § 5:

  <ENUMERATED_LIST_OF_REMAINING_WORK>

Standing orders are unchanged from the original Stage <N> prompt at charter § 7.<N>. Re-read that section for the discipline. Then continue from the listed remaining work.

When you finish (or context tightens again): commit, write/update the checkpoint log, surface to operator.
```

### § 8.4 What context resets and what survives

Across Claude Code sessions, the agent's working memory resets. What survives:

- Every commit on main (the actual artifacts).
- Every checkpoint log entry (the human-readable summary).
- The charter at `docs/phases/phase-1-plan.md`.
- The spec at `docs/architecture.md`.
- Phase 0's audits and deliverables.

What does not survive:

- The agent's working assumptions about what's "in progress."
- Any context the agent had loaded from re-anchor probes in the prior session.

The continuation session re-anchors from scratch. This is why fine-grained commits + checkpoint logs matter: they're the only state that bridges session boundaries.

### § 8.5 Acceptance for "continuation worked correctly"

After a continuation session finishes:
- The new commits chain cleanly off the prior session's last commit.
- The remaining-work list from the prior checkpoint is fully addressed.
- The new checkpoint log entry references the prior checkpoint by path.

If a continuation session diverges (e.g., re-derives Stage 1 work the prior session already committed), that's a re-anchor failure — surface to operator; do not commit duplicates.

---

## § 9. Risk surface and problem-solving playbook

### § 9.1 Failure modes specific to single-agent sequential dispatch

| Failure mode | Manifestation | Detection | Mitigation |
|---|---|---|---|
| Context exhaustion mid-stage | Agent stops without completing all sub-deliverables of a stage | Agent self-reports "context tight"; operator notices session ending without checkpoint | Checkpoint log entry with verdict "partial-needs-continuation"; continuation prompt (§ 8.3) |
| Continuation session diverges | New session re-derives work the prior session committed | Operator notices duplicate commits or re-creation of existing files | Continuation prompt forces re-read of prior checkpoint log; agent re-anchors before any draft |
| Convention #8 fabrication | Agent asserts a path, signature, or version from memory rather than grep-verifying | Cat 4 / Cat 5 integrity gates at Stage 3 Step 5 | Standing order in every stage prompt; FACT/INFERENCE tagging; playbook P3 |
| IC contract drift across stages | Stage 2 references a surface that Stage 1 actually shipped differently | Stage 2 probe re-anchor must read Stage 1's actual commit, not the charter's IC text | Stage 1 checkpoint log explicitly summarizes IC conformance; Stage 2 prompt directs agent to that log |
| Convergence file race / replacement | Stage 3 rewrites Phase 0 content instead of appending | Cat 1 (citations) fails at Step 5 because Phase 0 anchor disappeared | Standing order L3 in Stage 3 prompt; "read existing file first" prefix on every Step 4.x |
| Phase 0 missing deliverable | Agent re-anchors and finds Phase 0 artifact absent (e.g., SPlisHSPlasH manifest fields blank) | Re-anchor view returns empty / unexpected | Playbook P1 (substitute path → SHIFTED; nothing equivalent → REFUTED, halt, surface to operator) |
| Tests pass that should fail | Stage 2 sim test imports a symbol that exists via Phase 0 stub | Stage 3 Step 3 detects unexpectedly-GREEN sim tests; HALTED-ON-UNEXPECTED-GREEN | Playbook P9 |
| Tests fail for infrastructure reasons | CMake broken, dep missing, framework misconfigured | Stage 3 Step 3 distinguishes module-not-found from infrastructure-error | Playbook P10 |

### § 9.2 Risks that decreased relative to R5

- Parallel coordination failures (multiple agents committing in conflict): eliminated; only one agent.
- Cross-agent API drift (Wave 2 assuming Wave 1 surface that doesn't match): reduced to intra-agent across-session drift, mitigated by checkpoint logs.
- LANDER halting because a Wave 2 audit was REFUTED: eliminated; the agent surfaces directly to operator mid-stage.
- Audit format inconsistency across 10 separate agents: eliminated; one agent, one writing style.

### § 9.3 Problem-solving playbook

Concrete problem→resolution patterns. The agent consults this before halting.

**P1 — Phase 0 didn't deliver something the charter assumed.**
- View HEAD for what IS there.
- Substitute exists: SHIFTED, adapt, document in checkpoint log. Proceed.
- Nothing equivalent: write a blocked checkpoint log, surface to operator.

**P2 — Namespace `bit_physics` conventions differ from charter.**
- Probe common-ts source for actual namespace.
- Mirror it exactly across Stage 1 and Stage 2.
- Document in Stage 1 checkpoint log so continuation sessions inherit the choice.

**P3 — Web-fetch for paper citation fails or returns inconsistent metadata.**
- Fallback chain: DOI > arXiv ID > publisher URL > author preprint URL.
- If unverifiable: mark INFERENCE, not FACT; note "could not web-verify at dispatch time."
- Cite the source you DID find; don't invent.

**P4 — Vendored upstream paths moved between SHA pins.**
- Read paths from live vendored tree, not from memory.
- Cite actual paths.
- Verify manifest's pinned SHA matches actual git tree.

**P5 — Stack C / Stack D test framework choice unknown.**
- Stack C: probe Phase 0 first; if undecided, use doctest. Document in Stage 1.
- Stack D: pytest + pytest-cov, strict mode per § 7.7.

**P6 — Local Cat 1 (citations) check fails on draft.**
- Re-verify every path:line with `view` before commit.
- Path no longer resolves → update or remove. Don't ship broken citations.

**P7 — Local Cat 4 (draft-time spec verification) fails.**
- Cat 4 scans for unverified `<file>:<line>` / `<phrase X in Y>` patterns.
- Grep-verify or remove. Cat 4 is HARD_FAIL.

**P8 — Context budget tightening.**
- Commit work-in-progress per Convention A.
- Write checkpoint log with verdict `partial-needs-continuation` and explicit "what remains" list.
- Surface to operator for continuation dispatch.
- Do NOT fabricate the remainder.

**P9 — Tests pass when they should fail.**
- Investigate: importing a Phase 0 stub? Fixture collision? Agent committed sim source by mistake?
- Tests must fail with module-not-found / undefined-symbol / missing-fixture, NOT pass.
- Unexpected pass = defect in test design. Fix the test before commit.

**P10 — Tests fail with non-implementation error.**
- Failing-tests gate requires SPECIFIC failure mode.
- Fix infrastructure first.
- Document the distinction in the stage checkpoint log.

**P11 — Commit fails (pre-commit hook rejects).**
- Read hook's error; address underlying issue.
- Cat 4 hook flags draft-time assertion → verify before re-commit.
- Never bypass pre-commit hooks.

**P12 — A prior stage deliverable has a defect you depend on.**
- You can re-anchor against actual committed state and adapt within scope (SHIFTED).
- If the defect blocks correctness, write a blocked checkpoint log and surface.
- Do not silently patch prior-stage commits; treat them as immutable absent operator direction.

**P13 — A sim implementation exists that shouldn't.**
- TDD bootstrap requires NO sim implementation in Stage 2 / Stage 3.
- If you find one in your in-scope path, surface as blocked.
- Phase 0's RD-2d is intentional (§ 0.13); should never be in your in-scope path anyway.

**P14 — Charter's golden-table or MMS-solution path doesn't match Phase 0's actual layout.**
- Convention M: synced HEAD wins.
- Use actual Phase 0 path; document the shift in checkpoint log.

**P15 — You need to edit a convergence file outside the current stage.**
- Stage 1 / Stage 2: halt. Convergence is Stage 3 only.
- Stage 3: that IS your scope.

**P16 — Spec sheet § 9 (Equivalence) is non-trivial.**
- Create equivalence.md stub per § 8.1.
- Reference from spec-ref.md § 9. Concrete harness work deferred to cross-stack phase.

**P17 — Sim has determinism caveats (atomics, subgroups, FP reduction).**
- Create determinism.md declaring the caveat with citation to § 2.5.
- Reference from spec-ref.md § 8.

**P18 — Stage 1 IC contract conflicts with Phase 0 reality.**
- Follow Phase 0 reality. Write SHIFTED in Stage 1 checkpoint documenting the deviation in detail.
- Stage 2 (your future self in a later session) will read that log and consume the actual surface.

**P19 — A problem not in this playbook.**
- Default: SHIFTED if you can adapt within scope; blocked + surface if you cannot.
- Document the problem clearly so the operator can update the playbook for future phases.

**P20 — Cross-phase audit replay (Stage 1 Task 1.0) fails.**
- Per R9 amendment: BLOCKED. Write `docs/_audits/phase-1/stage-1-blocked-replay-<UTC>.md` with verdict BLOCKED.
- Capture the replay script's full output in `evidence_paths`.
- Identify which gate failed (integrity, pytest, equivalence, determinism, perf-ledger, property, mutation).
- Do NOT proceed to Task 1.1. The Phase 0 foundation is suspect; operator decides whether to repair Phase 0 or revise the plan.

**P21 — Failing-tests output capture (Stage 2) has wrong failure mode.**
- The captured output shows `pytest collection error`, `ImportError on fixture`, or `ConfigError`, NOT `ModuleNotFoundError` / `NotImplementedError`.
- Fix the test setup first. Common causes: missing `conftest.py`, wrong pyproject.toml, missing __init__.py.
- Re-run pytest, re-capture the output, re-compute sha256, commit. The captured output must show the test failing for the right reason (implementation missing), not the wrong reason (framework misconfigured).

**P22 — Mutation-testing threshold regression at Stage 3 Step 5d.**
- A module's mutation score has dropped below the Phase 0 baseline (and below spec § 2.13 threshold).
- HARD_FAIL the landing. Diagnose: did Stage 1 or Stage 2 touch the testkit/integrity modules in a way that weakened the tests?
- If a legitimate test was removed because it became obsolete with the new infra, the threshold needs an explicit downward amendment (separate operator-approved commit).
- If a real regression: surface; do not push the tag.

**P23 — Evidence-path verification (Stage 3 Step 5a) fails on a per-sim Stage 2 report.**
- The audit's `evidence_paths:` cites a file that doesn't exist at the audit's `head_sha`, OR an `evidence_hashes:` entry doesn't match.
- HALTED. Diagnose: was the file deleted in a subsequent commit? Was the hash recorded wrong? Was the audit's `head_sha` wrong?
- If the agent (you) computed the hash correctly but committed the audit before the evidence file: Convention-A violation (new-files-first); fix by committing a SHIFTED addendum that re-anchors the hash.
- If the evidence is missing entirely: the audit's claims are unsupported. REFUTED.

**P24 — Append-only check (Stage 3 Step 5c) fails.**
- A file under `docs/_audits/` that exists at `v0.0.0-phase-0` has been edited or shortened during Phase 1.
- REFUTED. Per spec § 7.5, audits are append-only by mechanism. Even if the edit was well-intentioned (e.g., a typo fix), it violates the discipline.
- Recovery: revert the offending edit; the correction must be a NEW audit file referencing the prior. Do not paper over.

---

## § 10. Appendix — audit-trail discipline

### § 10.1 Re-anchoring (Convention M)

Every stage's first action is to view the live state of every path the charter expects to interact with. Disagreement → SHIFTED with documentation in the checkpoint log, or blocked if structural.

### § 10.2 FACT vs INFERENCE tagging (spec § 7.5)

- FACT: "SPlisHSPlasH at SHA `<from manifest>` is vendored at `references/SPlisHSPlasH/`." (Grep-verifiable.)
- FACT: "Hu et al. 2018 introduces MLS-MPM at ACM TOG 37(4):150 (SIGGRAPH 2018)." (Web-fetch verifiable.)
- INFERENCE: "MLS-MPM quadratic B-spline is canonical for second-order accuracy." (Cites Hu 2018 § 3.2.)

Cat 5 (provenance) at Stage 3 Step 5 gates on well-formed link graph.

### § 10.3 YAML front-matter for checkpoint logs and phase audit

```yaml
date: 2026-MM-DD
author: phase1-agent
stage: 1-infrastructure | 2-per-sim-tdd | 3-landing
verdict-state: complete | partial-needs-continuation | blocked | CONFIRMED | SHIFTED
evidence-paths:
  - <path 1>
  - <path 2>
head_sha_at_checkpoint: <SHA>
```

Append-only — corrections are new entries (or a new checkpoint log file in a continuation session) referencing the prior.

### § 10.4 Convention #12 — SHA back-fill

1. Stage 3 Step 6 commits the phase audit with `<PHASE_1_LANDING_SHA>` placeholder.
2. Stage 3 Step 7 reads the actual SHA via `git rev-parse HEAD`.
3. Stage 3 Step 7 commits a follow-up that replaces the placeholder.

Never `git --amend`. The two-commit pattern preserves the append-only audit trail (the original audit text + the SHA back-fill are both recoverable from `git log`).

### § 10.5 Scope discipline

If the agent wants to:
- Edit outside the current stage's scope → halt, SHIFTED or blocked.
- Resolve an ambiguity requiring category-level taste → halt, surface to operator.
- Add a sim variant or frontier feature → halt; out of scope.
- Skip the failing-tests requirement → halt; the failure is the spec.

The checkpoint log is the only escalation channel during a stage. The operator is the only contested-decision authority.

---

## § 11. Phase coherence — Phase 0 inputs, Phase 2+ outputs

### § 11.1 What Phase 0 hands off to Phase 1 (inputs)

Phase 1 assumes Phase 0 has landed per spec § 11.1:

- `tools/testkit/` operational: capture format v1.0.0, MMS heat-1D, cubic-spline-kernel golden, determinism harness, equivalence harness, vendored-upstream discipline with SPlisHSPlasH at `references/SPlisHSPlasH/`, probe template.
- `tools/integrity/` operational: Cat 1, 2, 3 scaffolds; Cat 4, Cat 5, Cat-X added.
- `tools/diagnostics/{tier1, tier2/scalar_field}/` operational.
- `common/common-ts/` (Stack B) operational.
- Reaction-diffusion-2d (Stack B) through all 13 gates per spec § 3.5 (v2.4; legacy 1–10 + new 11 PBT, 12 perf-ledger, 13 failing-tests replay).
- Convention catalog at spec Appendix G.
- Top-level documentation index, CHANGELOG, dependency listings in Phase 0's chosen formats.

Phase 1 extends infrastructure (Stage 1) and consumes it (Stage 2). If Phase 0 is partial at re-anchor, the agent writes a blocked checkpoint and surfaces to operator.

### § 11.2 What Phase 1 hands off to Phase 2+ (outputs)

Phase 1 lands a TDD-bootstrapped reference-sim program. Downstream:

**Per-sim implementation phases:** each sim progresses gates 1–3 → gates 4–13 of § 3.5 (v2.4 expanded set). The failing test suite is the GREEN target. The probe report (IC-8) is the implementation prompt's input — its quality determines implementer-agent productivity. Implementations land sim source, Tier 3 (per-sim) diagnostic module, capture file the testkit can replay, determinism declaration consistent with capture, PBT invariants implemented (gate 11), perf-ledger first row appended (gate 12), failing-tests replay verifiable (gate 13). All 13 gates GREEN.

**Phase 2 — Cross-stack replication** (spec § 11.3): each sim's `equivalence.md` stub becomes the substantive equivalence harness. New variant spec files land as siblings of spec-ref.md.

**Phase 4 — Frontier variants** (spec § 11.5): per-sim variant spec files land as siblings. Phase 1 reference is the baseline against which variants gate equivalence.

### § 11.3 Probe quality is load-bearing

Spec § 9.4 parallel-work contract item 3 names: "Each agent receives the pre-implementation probe report relevant to its scope." Phase 1 PRODUCES these probes for every reference sim. Their quality is the foundation for every downstream phase.

Per IC-8 (charter § 3.8), each probe enumerates: common-module API consumed; Tier 2 check functions referenced; upstream citations with verified SHAs; test fixture paths; public exports the sim will provide. Each enumeration grep-verified verbatim at probe-authoring time.

### § 11.4 Cross-review disposition (spec § 9.5)

Spec § 9.5 calls for architect-2 review on high-stakes specs. In single-agent dispatch, cross-review is by construction:

- Stage 2's probe-writing reads Stage 1's actual committed surfaces — any defect surfaces as the agent cannot grep-verify.
- Stage 3's anchor re-check (Step 2) re-greps every cited anchor across both checkpoint logs.
- Stage 3's integrity Cat 1, 2, 4, 5 verification provides the final-state cross-check.
- The operator is the only contested-decision authority.

If the owner wants explicit architect-2 review (separate human or AI pass reading common-cpp source independently after Stage 1 commits, before Stage 2 dispatches), that becomes an inter-stage review by the operator (or by a separate Claude.ai chat session reading the Stage 1 checkpoint log and the actual common-cpp source). This charter does not include it by default; the implicit construction-time cross-review plus IC contracts in § 3 was judged sufficient.

---

---

*End of Phase 1 charter. Revision 6 — sequential single-agent dispatch with three stages and checkpoint-restart across sessions.*

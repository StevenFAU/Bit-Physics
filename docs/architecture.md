# GPU Simulation Portfolio — Ground-Up Design Specification

> **Version:** 2.4 (verification-hardening pass, May 18 2026)
> **Date:** 2026-05-17 (original), 2026-05-18 (v2.1, v2.2, v2.3, v2.4 amendments)
> **Scope:** Authoritative design specification for a GPU-accelerated physics and emergence simulation portfolio, intended simultaneously as a research-grade artifact, a pedagogical archive, an industry-aligned product surface, and a frontier-coverage program.
> **Stance:** This is a from-scratch specification. It assumes nothing pre-exists. It is meant to stand on its own as the founding contract for the work it describes — a future implementer should be able to read this document and execute against it without external references except those it explicitly vendors.
> **Methodology:** Test-driven development is the load-bearing organizing principle. Every simulation has its acceptance tests authored, reviewed, and committed *before* its implementation. The testkit is the foundation; everything else extends it.
> **Honesty posture:** Concrete technical claims about external tools, frameworks, and published research are sourced from material retrieved at document time. Where a claim is not directly cited, it is reasoning over cited material rather than verified primary fact. Version pins, specific API shapes, and performance numbers must be re-verified against current sources before any implementation work that depends on them.
> **Execution model:** Single-agent AI dispatch. Each phase is one claude.ai coordinator chat plus one Claude Code agent role running auto-accept. The whole portfolio executes in the wall-clock time it takes the agent to work through stages plus external-dependency resolution; weeks/months/years language elsewhere in this document is from prior drafts and is superseded by § 7.13 + § 11.0.
> **Companion documents:** Each phase has one plan document (`phase-0-plan.md` through `phase-6-charter.md`). The phase plan + this spec are the agent's complete reference set; nothing else is required.

> **v2.4 changelog (May 18 2026):** Verification-hardening pass. Adds the mechanical floor under TDD discipline, audit-trail discipline, and trunk-based development. The pre-v2.4 spec relied heavily on convention; v2.4 converts the highest-stakes conventions into git-mechanical or CI-enforced rules that survive agent failure modes (auto-accept + self-reported gate status).
>
> - **§ 1.3 (REVISED)** — TDD cycle expanded from 5 steps to 6: new step 4 ("Failing-output capture") commits verbatim pytest output to `tools/testkit/failing-tests-evidence/` and records sha256 in commit footer. Original steps 4 (Implementation) and 5 (Cross-stack variants) are now steps 5 and 6.
> - **§ 2.4 (REVISED)** — Independent-reference anchors mandatory: ≥ 3 anchors per golden table from sources independent of the vendored upstream. Cat 3 HARD_FAILs tables without anchors.
> - **§ 2.6 (REVISED)** — Tolerance budget mechanism: `tolerance-budget.toml` caps per-category cross-stack tolerance; `tolerance.toml` overrides exceeding budget trigger Cat-X HARD_FAIL. Amendments require separate operator-approved commits.
> - **§ 2.7 + § 2.12 (REVISED)** — Schema-version backward-compat regression corpus at `tests/fixtures/legacy-captures/`. Phase 4 WU-A round-trips every prior-phase capture through the post-bump reader.
> - **§ 2.13 (NEW)** — Mutation testing for testkit and integrity tooling. Per-target thresholds (80–95%); SOFT_WARN in CI, HARD_FAIL at phase landings.
> - **§ 2.14 (NEW)** — Property-based testing for invariants via Hypothesis at `tools/testkit/property/`. Each sim declares ≥ 2 PBT-covered invariants in spec § 6.
> - **§ 2.15 (NEW)** — Performance regression ledger at `docs/perf-ledger.md`. First-landing wall-clock recorded per sim; > 2× regressions flagged at landing-audit review.
> - **§ 3.2 (REVISED)** — Adversarial-fixture corpus at `tools/integrity/tests/fixtures/adversarial/` plus a meta-test asserting every adversarial fixture is detected by the corresponding Cat check.
> - **§ 3.5 (REVISED)** — Layer 4 acceptance gates expanded from 10 to 13: new gates 11 (PBT), 12 (perf-ledger row), 13 (failing-tests replay verifiable). Phase-2 onward; Phase-1 sims back-fill gates 11–13 at Phase-2 open.
> - **§ 3.8 (REVISED)** — Bootstrap-style verification for productization: artifacts re-emit canonical captures through the testkit equivalence harness in fresh isolated environments.
> - **§ 7.4 (REVISED)** — Convention E-addendum: phase-plan review by a separate Claude session before dispatch for high-stakes plans (Phase 2 / Phase 4 / Phase 5 / any track whose outputs feed ≥ 3 downstream phases).
> - **§ 7.5 (REVISED)** — Three mechanical audit-trail anchors: `audit-append-only.yml` CI workflow; `verify_evidence.py` (mechanical pre-filter for evidence_paths + evidence_hashes); `replay_prior_phase.py` (cross-phase audit replay as Phase N+1's first action).
> - **§ 7.12 (REVISED)** — Operator-only phase-tag pushing. Agents prepare tags but never push; operator pushes after independent landing-audit review. Server-side git hooks (force-push, branch-creation, history-rewrite, tag-signer-identity, audit-append-only) convert convention into git mechanics.
> - **§ 7.13 (REVISED)** — Auto-accept and the agent-grades-own-homework risk: the mitigation is the mechanical floor above, not self-report.
> - **Appendix B (REVISED)** — Convention catalog quick-lookup extended with new mechanical conventions.
> - **Appendix D § D.6 (REVISED)** — Layer 4 acceptance gates list expanded to 13.
> - **Appendix D § D.8 (REVISED)** — Forbidden agent actions extended: items 13–17 cover tag-pushing, force-push, non-main branches, audit-file edits, over-budget tolerances.
> - **Appendix G § G.7 (REVISED)** — Mechanical audit-trail conventions (append-only CI, evidence verification, cross-phase replay).
> - **Appendix G § G.7.5 (NEW)** — TDD discipline mechanical anchors (failing-tests output hash, operator-only tag pushing).
> - **Appendix G § G.10 (REVISED)** — Trunk-based development with server-side hooks table.
> - **§ 11.1 acceptance language** — Phase 0 acceptance updated from "ten Layer 4 gates" to "thirteen Layer 4 gates" (§ 3.5).
>
> v2.4 does not reverse any v2.3 commitment; it adds the mechanical floor. Phase plans inherit v2.4 by reference (each phase plan has its own per-phase amendment block consuming v2.4 — see phase-0 deliverables 21–23, phase-1 R9, phase-2 v6, phase-3 v9, phase-4 v9, phase-5 v8, phase-6 v2).

> **v2.3 changelog (May 18 2026):** Consolidation pass. Per owner directive, all planning content lives either in this spec or in one of the phase plans. Previously-standalone documents (`shared-invariants.md`, `conventions.md`, `agent-playbook.md`, `dispatch-readiness-checklist.md`) are folded into this spec as Appendices D, E, F, and G respectively. The `preflight-phase.py` script content moves to Phase 0 plan as an embedded code block (Phase 0 Block 1 commits it from the embedded source).
>
> - **Appendix D (NEW)** — Shared invariants: cross-phase contracts, naming map, capture descriptors, vendored dependency pins, hardware floors, ten-gate criteria, Tier 2 substack assignments, forbidden actions, context-fill triage.
> - **Appendix E (NEW)** — Agent playbook: friction-pattern response catalog (Patterns A–O).
> - **Appendix F (NEW)** — Operating model + dispatch operations: universal operating model, per-phase preflight sections, press-go criteria.
> - **Appendix G (NEW)** — Convention catalog (full text, replacing the brief Appendix B table). The Appendix B brief table remains as a quick-lookup index.
> - **Part VII** — Cross-references updated to point at Appendix G for full convention text.
> - **§ 7.14 / § 7.15 / § 7.16** — Pointers updated to point at Appendices D / E (and Appendix G for conventions).

> **v2.2 changelog (May 18 2026):** Dispatch-hardening amendments. Applied alongside v2.1.
>
> - **§ 2.7** — Capture descriptor table reference: descriptors are normative in Appendix D § D.2 (was in Appendix D § D.2.3 in v2.2; consolidated v2.3).
> - **§ 2.12 (NEW)** — Schema-version bump policy (only Phase 4 WU-A bumps in the current plan set).
> - **§ 7.5** — Audit-file UTC suffix format clarified: colons replaced with hyphens for filesystem safety (was already convention; now explicit).
> - **§ 7.14 (NEW)** — Convention naming canon: full text in Appendix G; this spec's Part VII references it.
> - **§ 7.15 (NEW)** — Shared-invariants reference: cross-phase contracts in Appendix D.
> - **§ 7.16 (NEW)** — Agent playbook: friction-handling decisions in Appendix E.
> - **§ 8.1** — Confirmed: 13 sections in sim-spec template (was 12 in v2.0; v2.1 added §13; v2.2 makes this explicit at all touch points).
> - **§ 9.6 (NEW)** — Pre-flight script convention: every phase has `tools/dispatch/preflight-phase-<N>.py`. The script content is committed by Phase 0 from the code block in `phase-0-plan.md`.
> - **§ 11.0 (NEW)** — Pacing recast for AI-agent execution: wall-clock is hours-to-days bounded by external-dependency resolution, not weeks/months.
> - **§ 11.x estimated-duration lines** — removed in favor of § 11.0's universal AI-execution framing.
> - **§ 12.7** — License posture locked to MIT.
> - **§ 12.8 (NEW)** — Phase 4 hardware floor: CUDA 12 + driver 545+ for Stages 31–33 Newton sims; CPU-only fallback in Appendix D § D.5.
> - **§ 12.9 (NEW)** — Frontier paper vendoring: every load-bearing frontier paper is pre-vendored to `references/papers/` before Phase 4 dispatch.

> **v2.1 changelog (May 18 2026):** Applied from `phase-plans-review-v4.md`:
>
> - **§ 2.7** — Added schema-version compatibility policy + capture file location convention.
> - **§ 2.11 (NEW)** — Infrastructure verification surrogate framework.
> - **§ 3.1** — Underscored Python-imported testkit subdirs (`code_verification/`, `solution_verification/`, `render_similarity/`); added naming-convention paragraph.
> - **§ 3.2** — Cat 2 `api_imports` sub-check; Cat 4 three-grammar enumeration.
> - **§ 3.8** — PyPI namespace `gpu-sims-` → `bit-physics-`.
> - **§ 6.4** — Newton 1.0 GA solver list (six solvers verified).
> - **§ 7.5** — Canonical front-matter YAML schema for all phase artifacts.
> - **§ 7.11 (NEW)** — Naming convention across five dimensions (PEP 503/508/625 + PEP 8).
> - **§ 7.12 (NEW)** — Trunk-based development convention.
> - **§ 7.13 (NEW)** — Sequential single-agent execution principle.
> - **§ 8.1** — Standardized audit-file path `docs/_audits/phase-<N>/<artifact>-<UTC>.md`.
> - **§ 8.2** — Added section 13 "Productization status" to sim-spec template.
> - **§ 10.1** — Web URL `gpu-sims.<domain>` → `bit-physics.<domain>`.
> - **§ 10.3** — PyPI namespace `bit-physics-<category>-<sim>`.
> - **§ 11.1 item 0.13** — Clarified RD-2D as complete Layer 4 reference.
> - **§ 11.4** — Added task 3.7 ising-classical (Stack B, quantum-adjacent).
> - **§ 11.7** — Deferred-item ownership table (10 items).
>
> All amendments are non-breaking additions; no v2.0 commitment is reversed. Phase plans were updated in the same commit chain; see individual phase plans' v4-amendment blocks.

---

## Reading guide

This document is long because the project is large. Sections can be read independently after the front matter. A suggested reading order by role:

- **Founder / coordinator:** Front matter → Part I → Part XI (roadmap) → Part XII (open decisions) → return as needed.
- **Verification architect:** Front matter → Part II → Part III §3.1–§3.3 → Part VII.
- **Per-sim implementer:** Front matter → Part I → relevant Part IV (stack) and Part V (category) sections → Part VII (conventions) → Part II (verification methodology your sim must satisfy).
- **Pedagogy / docs maintainer:** Front matter → Part VIII → Appendix A.
- **Skeptic:** Part XII (open decisions) → Front matter → Part I.

---

## Table of contents

- **Front matter** — purpose, audience, posture, deliverables, non-goals
- **Part I.** Mission and first principles
- **Part II.** Verification methodology
- **Part III.** Layered architecture (Layers 0–7)
- **Part IV.** The stack axis
- **Part V.** The category axis
- **Part VI.** Cross-cutting axes
- **Part VII.** Operating conventions
- **Part VIII.** Documentation, pedagogy, audit trail
- **Part IX.** Build, dev environment, multi-agent orchestration
- **Part X.** Shipping and distribution
- **Part XI.** Phased roadmap
- **Part XII.** Open decisions
- **Appendix A.** Reference catalog
- **Appendix B.** Convention catalog
- **Appendix C.** Glossary

---

# Front matter

## Purpose

This specification defines a GPU-accelerated simulation portfolio whose purpose is to span the full taxonomy of GPU simulation methods — from closed-form artifacts through canonical reference implementations of established algorithms through frontier 2025–2026 published methods — under a single coherent verification, build, documentation, and shipping discipline.

The portfolio is simultaneously:

1. **A research artifact.** Citable, reproducible, with vendored upstream references and pinned SHAs. Suitable for academic publication.
2. **A pedagogical archive.** Every simulation explains the mathematics it implements; the path from equation to code is legible.
3. **An industry-aligned product surface.** Speaks the production dialect: OpenUSD, NanoVDB, NVIDIA Warp, NVIDIA Newton, PyTorch, JAX, Omniverse, Houdini, Blender.
4. **A portfolio piece.** Each simulation ships — as a browser demo, a standalone binary, a Python package, an offline render, or some combination.

Those four targets are not in tension. A simulation that cites its upstream, ships in a browser, exports to OpenUSD, and has hero renders is simultaneously a research artifact, a teaching tool, a product, and a portfolio piece. The architecture in this spec is the cheapest way to satisfy all four at once.

## Audience

The primary audience is the founder/coordinator of the project and the parallel agents (human or AI) executing work under their direction. The secondary audience is anyone who wants to understand the work without having executed it — academic reviewers, prospective collaborators, employers, future maintainers.

## Posture

Two postures are load-bearing:

1. **Test-driven.** Tests are authored before implementations. A simulation's verification posture is its identity. An unverified simulation is not in this portfolio.
2. **Honest about uncertainty.** Every concrete claim is tagged FACT (grep-verifiable against committed artifacts) or INFERENCE (reasoning over FACTs). The discipline propagates from specs through audit reports through retros. There is no "trust me" layer.

## Deliverables

When this spec is fully executed, the portfolio contains:

- A testkit infrastructure (Layer 0) usable for any GPU simulation across any of the supported stacks.
- An integrity toolkit (Layer 1) with five check categories enforced in CI.
- A diagnostic toolchain (Layer 2) with three tiers of inspection.
- Common-stack infrastructure (Layer 3) for at least four primary stacks.
- Reference implementations (Layer 4) of every simulation in the category taxonomy, each with full TDD verification.
- Cross-stack replications (Layer 5) of any simulation whose category benefits from cross-stack equivalence.
- Frontier variants (Layer 6) implementing the 2025–2026 algorithmic, differentiability, sparsity, and neural-rendering frontiers.
- Productized output (Layer 7): web demos, standalone binaries, Python packages, hero renders, optional academic preprints.

The portfolio is a multi-year program. The acceptance gate for "complete" is when every category-defining canonical reference is verified and every named frontier variant has at least an open scope sheet.

## Non-goals

The spec deliberately does not attempt:

- Replacing production tools (Houdini, Newton, commercial CFD solvers) at production scale. The portfolio's value is the implementation path and its pedagogical artifacts.
- Comprehensive coverage of every GPU technique ever published. The spec's category taxonomy is broad but bounded; new categories require explicit roadmap addition.
- Cross-vendor bit-exactness. Determinism is per-stack, per-hardware where the spec demands it; cross-vendor equivalence is epsilon-bounded with documented tolerances.
- Real-time interactivity for sims whose algorithms preclude it (offline-only sims are explicit; they ship as renders, not as interactive demos).

---

# Part I — Mission and first principles

## 1.1 The orthogonal axes that define a simulation

A simulation is a point in a six-dimensional space:

| Axis | Values | Notes |
|---|---|---|
| **Category** | closed-form, continuous-CA, agent-based, particle-fluid, hybrid-PG, volumetric-grid, lattice, rigid-body, soft-body, quantum, neural-rendered, learned-dynamics | What kind of simulation is this? |
| **Stack** | GLSL, WebGPU/TS, Vulkan/C++, Taichi/Py, Warp/Py, wgpu/Rust, Mojo (horizon) | What language/runtime? |
| **Differentiability** | none, forward-mode, reverse-mode, end-to-end ML-coupled | Can gradients propagate through it? |
| **Sparsity** | dense, hash-grid, Morton-sorted, NanoVDB, NeuralVDB, AMR | How is space discretized? |
| **Rendering** | rasterized, screen-space, raymarched, mesh, 3DGS, NeRF | How is the result shown? |
| **Verification** | code-verified, solution-verified, model-validated, calculation-validated | Which Roy 2005 levels are exercised? |

A simulation's identity is its coordinates. Folder structure, naming conventions, and CI configuration all encode that a simulation can exist at multiple points along multiple axes simultaneously (a reference and a differentiable variant of the same algorithm are siblings, not the same simulation).

## 1.2 The four optimization targets, in tension only superficially

The portfolio optimizes for research credibility, pedagogical legibility, industry-tooling alignment, and product shipping — simultaneously. Common assumption is these conflict; in practice they reinforce:

- Research credibility *demands* reference vendoring and verification. Reference vendoring *enables* pedagogical legibility (the reader can browse the upstream). Verification *enables* shipping (a verified sim ships with provenance; an unverified sim ships with risk).
- Industry tooling (Warp, Newton, OpenUSD, NanoVDB) *is* the production stack for current GPU simulation work. Speaking it is the same as being technically current.
- Shipping forces honesty: a sim that runs in a browser cannot fake its outputs.

The four-target framing is a constraint that excludes some choices that would optimize one target at the cost of others — for instance, a closed-source proprietary algorithm cannot satisfy research credibility, and a research-only sim that never ships cannot satisfy the product target.

## 1.3 Test-driven development as the load-bearing organizing principle

**Tests come first.** Every simulation in this portfolio has its acceptance test suite designed, written, and committed before its implementation begins. The discipline is not aspirational; it's structural. A sim that lacks pre-committed tests cannot be in this portfolio.

The TDD cycle per simulation:

1. **Specification.** Write the per-sim spec sheet (template in Part VIII). Section 6 (verification posture) is mandatory and declares which Roy 2005 V&V levels the sim must satisfy.
2. **Test design.** Write the test suite. Three classes:
   - **Code verification:** Method of Manufactured Solutions for PDE-based sims; golden values for closed-form algorithms; OOA tests where applicable.
   - **Determinism:** capture-twice-and-diff.
   - **Diagnostics:** Tier 1 (NaN/Inf, conservation laws) and Tier 2 (data-structure-specific health).
3. **Test commit.** Tests land before the sim. They fail loudly (no fixture, no implementation). The failure is the spec.
4. **Failing-output capture.** At the failing-tests commit, the agent captures the verbatim pytest (or equivalent test runner) output to `tools/testkit/failing-tests-evidence/<sim>-<variant>-<UTC>.txt` and records the SHA-256 hash of that file in the commit message footer (`Failing-tests-output-hash: sha256:...`). This is the audit-trail anchor that distinguishes a genuine TDD failing-tests commit from a fabricated one. Phase-closing audits replay the pre-implementation commit and confirm the recorded hash matches.
5. **Implementation.** Build the sim against the tests. The sim's correctness is defined by the tests, not by external verification.
6. **Cross-stack and frontier variants.** Each subsequent variant inherits the test suite and adds variant-specific tests (gradient correctness for differentiable, sparsity-threshold for sparse, render-similarity for neural-rendered).

The testkit (Part III, Layer 0) is the precondition. No simulation is implemented before the testkit can express its acceptance criteria.

**Why the failing-output capture matters.** The git ordering (failing-tests commit before implementation commit, per Convention-A) proves *ordering*. It does not prove *what failure mode* the tests exhibited at commit time. A test that fails for the right reason (`NotImplementedError`, `ModuleNotFoundError` against a stub module, undefined symbol) is a meaningful TDD failure. A test that "fails" because of a pytest collection error or import-path bug is not. The captured output, hashed and committed, makes this distinction grep-verifiable after the fact and removes the "agent grades own homework" failure mode that an `auto-accept`-running Claude Code session would otherwise create. See Convention-A in Appendix G for the full mechanical discipline.

## 1.4 First principles in operation

Five rules govern how work is done across the portfolio. They emerge directly from the failure modes that occur when they are not followed:

- **Verify against synced state, not against memory.** Path strings, line numbers, function signatures, version pins, dependency versions, performance figures — none of these are asserted from memory in specs, audits, or implementations. They are grep-verified, web-fetched, or sandbox-probed at the moment of assertion. When in doubt, look it up.
- **Pause and surface on disagreement.** When a spec disagrees with synced repo state, the synced state is authoritative. The right response is to stop work and surface the disagreement, not to silently adapt the spec or the implementation. (This is "Hard Rule 2" — codified at first-principles level rather than as toolkit guidance.)
- **Append-only audits.** Audit reports under `_audits/` are never edited. Corrections are issued as new reports referencing the prior. The audit trail of what was claimed at what time is itself load-bearing data.
- **Tests come first, sims come second, frontier variants come third.** Inverting this order produces retroactive verification debt that grows monotonically. Honored, the order produces a portfolio where every sim's correctness is a fact, not an aspiration.
- **Decompose, don't bundle.** A commit that touches more than one previously-existing file ships new files first as a standalone sub-commit, then modifies existing files in a follow-up. This minimizes diff complexity for review and isolates the failure surface if something goes wrong.

## 1.5 The verification frame: Roy 2005 V&V

The portfolio adopts the verification-and-validation vocabulary established by Roy 2005 (*Review of code and solution verification procedures for computational simulation*, JCP 205) and developed further in Oberkampf & Roy's *Verification and Validation in Scientific Computing* (Cambridge, 2010).

Four levels apply to every simulation:

- **Code verification.** Does the code correctly solve the equations it claims to solve? The rigorous test is *order-of-accuracy testing using the Method of Manufactured Solutions* (Part II §2.2). Less rigorous but acceptable for closed-form algorithms: golden-value tables derived analytically from the equations.
- **Solution verification.** Is the numerical solution converged with respect to discretization? The rigorous test is *grid convergence study using Richardson extrapolation* (Part II §2.3).
- **Model validation.** Do the equations model the phenomenon the simulation claims to model? Typically external (literature comparison, experimental data).
- **Calculation validation.** Does the simulation reproduce a reference benchmark or experiment? Typically per-sim and per-application.

Each sim's spec sheet declares which of the four levels it exercises. A pedagogical reference sim might exercise only code verification. A research-grade sim adds solution verification. A product-grade sim adds calculation validation.

The portfolio does *not* claim that every sim achieves every level. It claims that every sim *declares* which levels it exercises and *demonstrates* the ones it claims.

---

# Part II — Verification methodology

This part is the core technical content of the spec. Everything else is in service of these methods.

## 2.1 Why this part comes second

The verification methodology is described before the layered architecture because the architecture exists to support the methodology. Knowing how verification works is a precondition for understanding why the layers are shaped the way they are.

## 2.2 Code verification: Method of Manufactured Solutions (MMS)

MMS is the gold standard for code verification of PDE solvers. The idea is straightforward:

1. Choose an analytical function (the "manufactured solution") that is not a solution of the original PDE.
2. Substitute the function into the PDE to derive the residual source term that *would* make the function a solution.
3. Add that source term to the numerical solver and run with appropriate boundary conditions.
4. Compare the numerical output to the chosen function at each grid point.
5. Repeat at successively finer grids. The error should decrease at the formal order of accuracy of the scheme.

If the observed order of accuracy matches the formal order, the code is verified. If it doesn't, the code has a bug.

MMS works for any PDE solver — it is general, principled, and produces verification with theorem-like quality. It is widely used in CFD verification, including Sandia's Premo, MOOSE / Cardinal (Idaho National Laboratory), MFiX, OnScale, and many academic codes.

### What this looks like in the portfolio

For every PDE-based simulation in the portfolio (volumetric grid, lattice, hybrid particle-grid where the grid step is a PDE solve), the testkit provides:

- A library of common manufactured solutions for canonical PDEs (heat equation, Poisson, advection-diffusion, Navier-Stokes incompressible, Euler).
- A harness that augments the simulator's source term with the manufactured residual, runs at multiple grid resolutions, computes L2 and L-inf errors against the manufactured solution, and reports observed order of accuracy.
- A pass criterion: observed order matches formal order within a tolerance (typically ±0.5 in the order; tighter for higher-order schemes).

A sim's code verification gate passes when its MMS report shows the expected order of accuracy across the resolutions tested.

### Tooling

The testkit's MMS harness lives at `tools/testkit/code_verification/mms/`. It exposes:

- `mms.solutions` — library of manufactured solutions parameterized by spatial dimensions, smoothness, and symmetry properties.
- `mms.derive(pde, solution)` — symbolic differentiation using SymPy (or compatible) to compute the source term for a given (PDE, manufactured solution) pair.
- `mms.runner(sim_binary)` — invokes the simulator at multiple resolutions with the augmented source, collects results.
- `mms.analyze(results)` — fits the convergence curve, reports observed order, generates the verification report.

Symbolic derivation is committed alongside the test; the runner does not re-derive at test time (it would be too expensive and fragile). The committed derivation links back to the algebraic-derivations document for the corresponding PDE.

### What MMS does not cover

MMS is code verification only. It does not validate that the equations match physical reality (that's model validation). It does not establish that a specific simulation run is grid-converged (that's solution verification). MMS catches *implementation bugs* — sign errors, missing terms, wrong-order discretizations, off-by-one boundary conditions. It is necessary but not sufficient for a research-grade simulation.

## 2.3 Solution verification: Richardson extrapolation and grid convergence

After MMS confirms the solver is correct, solution verification confirms that a specific simulation is converged with respect to discretization. The method is Richardson extrapolation on a grid convergence study.

For a numerical scheme of formal order *p*, refining the grid by factor *r* should reduce the discretization error by factor *r^p*. Running the simulation at three or more resolutions and fitting the observed error against this curve produces:

- The observed order of accuracy (should match formal order if MMS-verified).
- An extrapolated estimate of the exact solution.
- A Grid Convergence Index (GCI) bounding the numerical uncertainty.

A sim's solution verification gate produces a GCI bound on every output of interest. Simulations claiming solution-verified status must satisfy a per-sim-declared GCI threshold (typically 1% for product-grade, 5% for research-grade).

### Tooling

`tools/testkit/solution_verification/` provides:

- `gci.harness(sim_binary, resolutions)` — runs the sim at multiple resolutions.
- `gci.compute(results)` — Richardson extrapolation, GCI computation per output.
- `gci.report(gci_data)` — generates the convergence report.

Solution verification is more expensive than MMS (multiple full runs at full resolution vs. small manufactured-solution runs), so it is gated to be runnable on demand rather than every CI pass. The committed solution-verification report is the artifact CI checks.

## 2.4 Closed-form algorithm verification: golden values

For simulations whose "algorithm" is a closed-form mathematical function (SPH kernel evaluation, lattice Boltzmann equilibrium computation, distance estimators for fractals), MMS and grid convergence don't apply because there's no PDE. The verification method is golden-value tables:

1. Derive the algorithm's output at canonical test points analytically.
2. Commit the derivation and the resulting expected-value table.
3. The simulator's implementation of the algorithm is tested against the table.
4. Tolerance is per-algorithm (1e-6 absolute, 1e-5 relative are typical for fp32).

### Tooling and conventions

`tools/testkit/golden/` provides:

- `golden.tables/` — committed expected-value tables (JSON).
- `golden.derivations/` — committed algebraic derivations (Markdown).
- `golden.generator/` — generator scripts that re-derive tables from the derivation when the upstream SHA changes.
- `golden.verifier/` — test runners that load tables and compare against simulator output.

**Table format** (canonical JSON):

```json
{
  "schema_version": "1.0.0",
  "algorithm": "cubic-spline-kernel",
  "category": "particle-fluid",
  "derivation": {
    "doc": "tools/testkit/golden/derivations/cubic-spline-kernel.md",
    "upstream": "SPlisHSPlasH",
    "upstream_sha": "<full-SHA>",
    "upstream_path": "<path-in-vendored-source>"
  },
  "test_points": [
    { "inputs": {"q": 0.0, "h": 1.0}, "expected": {"W": 2.546479..., "gradW_mag": 0.0}}
  ],
  "tolerance": { "absolute": 1e-6, "relative": 1e-5 }
}
```

**Convention:** JSON over TOML for golden tables. Machine-generated tables dominate, JSON is universal in Python, the toolkit's other outputs are already JSON.

### Independent-reference anchors (mandatory)

A golden table derived only from a vendored upstream inherits any bugs in that upstream symmetrically: the C++ port and the Python re-derivation can both inherit a typo in SPlisHSPlasH's kernel and the cross-stack equivalence harness will pass them as equivalent. To break this symmetric-bug class, every golden table MUST include at least one **independent-reference anchor**: three to five test points whose `expected` values come from a source independent of the vendored upstream (e.g., a textbook table, a paper appendix, an official test suite of an unrelated implementation, an analytical hand-derivation).

Independent-reference anchors are stored in the same golden-table JSON with an additional `independent_reference` field per test point:

```json
{
  "inputs": {"q": 0.5, "h": 1.0},
  "expected": {"W": 0.5093958..., "gradW_mag": -1.0387916...},
  "independent_reference": {
    "source": "Monaghan 2005, Reports on Progress in Physics 68(8):1703–1759, Eq. 3.5",
    "doi": "10.1088/0034-4885/68/8/R01",
    "derived_by": "hand-derivation; see derivations/cubic-spline-kernel.md §3"
  }
}
```

Cat 3 (numerical correctness) HARD_FAILs on any golden table without at least three independent-reference anchors. The Phase 0 cubic-spline-kernel table is the canonical example; it ships with Monaghan 2005 anchors plus a hand-derived check at q=0.

## 2.5 Determinism harness

A simulation is deterministic if every state array and diagnostic entry in its canonical Capture is exactly element-wise equal across two runs at the same seed on the same hardware. This is the zero-tolerance special case of the cross-stack content-equivalence posture in §2.6, computed over the same Capture projection. Storage-format metadata (wall-clock timestamps embedded by the underlying file format, library version banners, and other environment-influenced packaging artifacts) is excluded from the comparison.

`tools/testkit/determinism/` (Python) and `common/common-ts/src/determinism/` (TypeScript) provide the paired canonical mechanism:

- `run_twice_and_diff` (Python) and `runTwiceAndDiff` (TypeScript) — invoke any sim twice at the same seed and compare the resulting captures over the parsed Capture projection (every state array + every diagnostic entry, element-wise; storage-format metadata excluded). Both surfaces return a `DeterminismVerdict` whose `content_equivalent` field is the canonical pass/fail signal.
- A per-sim determinism declaration: `bit-exact-same-hw`, `epsilon`, `non-deterministic`. The `bit-exact-same-hw` value denotes the content-equivalent contract defined above (the enum value name is preserved for backward compatibility with pre-amendment manifests; its semantics are the content-equivalent contract).
- CI gates: every sim claiming `bit-exact-same-hw` determinism runs the harness on every push (Python-strict + ts-strict CI fan-out).

**Determinism risks** the harness surfaces:

- Atomic operations with non-deterministic ordering (e.g., GPU scatter-add).
- Subgroup operations whose semantics vary across drivers (Vulkan, WGSL).
- Reduction patterns (sums, dot products) where FP non-associativity matters.
- Driver-level optimization passes that reorder math.

Sims using any of these declare it in their determinism posture. Non-determinism by design (stochastic CA, Monte Carlo) is acceptable but must be declared and tested with distributional equality (e.g., EFECT — Empirical Characteristic Function Equality Convergence Test) rather than bit-exact comparison.

## 2.6 Cross-stack equivalence

When a simulation exists in multiple stacks, its outputs should agree across stacks within a documented tolerance. The cross-stack equivalence harness:

- Consumes capture files from any two stacks (it does not run the sims itself).
- Applies per-category tolerance from a committed table.
- Generates a diff report; CI gates on the report's verdict.

**Default tolerance table** (revisable per sim):

| Category | Same-stack same-hw | Same-stack different-hw | Cross-stack |
|---|---|---|---|
| Closed-form | bit-exact | epsilon (1e-7 rel) | epsilon (1e-5 rel) |
| Reaction-diffusion | bit-exact | epsilon | epsilon |
| Boids / Physarum | bit-exact | epsilon (atomics) | distributional (chaotic) |
| SPH | epsilon (atomics) | epsilon | epsilon (1e-4 rel) |
| MPM | epsilon | epsilon | epsilon (1e-4 rel) |
| Stam/Fedkiw smoke | epsilon | epsilon | epsilon (1e-4 rel) |
| LBM | bit-exact (effort) | epsilon | epsilon (1e-5 rel) |
| Flow-map fluids | epsilon | epsilon | epsilon (1e-4 rel) |
| Learned dynamics | trajectory-divergent | trajectory-divergent | distributional |

The harness reads the per-sim tolerance declaration and applies it. Sims that don't claim cross-stack equivalence (e.g., a Stack-C-only sim) don't run that gate.

### Tolerance budget (Phase 2+ mandatory)

Per-sim tolerance overrides in `tools/testkit/equivalence/tolerance.toml` are the soft underbelly of cross-stack equivalence: a stage under deadline pressure can widen a tolerance and ship a "passing" port that papers over a real correctness bug. The mitigation is a **tolerance budget** committed at phase open.

`tools/testkit/equivalence/tolerance-budget.toml` records the maximum permissible tolerance per sim category for the phase. Format:

```toml
[phase]
phase = "phase-2"
opened_at = "2026-06-01T00:00:00Z"

[budgets.SPH.cross_stack]
relative = 1e-4      # Max permissible; defaults table § 2.6 sets this.
absolute = 1e-6

[budgets.MPM.cross_stack]
relative = 1e-4
absolute = 1e-6
```

`tolerance.toml` overrides that exceed the corresponding budget trigger Cat-X HARD_FAIL until a separate **tolerance-budget-amendment commit** lands. The amendment commit:

1. Has commit message prefix `chore(tolerance-budget): amend <category>.<axis> from <old> to <new>`.
2. Updates `tolerance-budget.toml` in isolation (Convention-A — no other file edits).
3. Adds a justification entry in `docs/_audits/tolerance-budget-amendments/<UTC>.md` citing the underlying numerical issue, the diagnosis, and the cited references that support the wider bound.
4. Receives owner-approval before merge (single human, not the agent).

The mechanism does not prevent tolerance widening — it makes the political cost visible. Tolerance shopping becomes auditable in real time, not retrospectively at landing.

## 2.7 Capture format

A capture file is the canonical representation of simulation state at a single step. It is the medium of exchange between simulators, between determinism runs, between cross-stack equivalences, between sim and renderer, and between sim and external analysis tools.

**Two-part structure:**

1. **Manifest** (`<name>.json`) — UTF-8 JSON, schema-validated.
2. **Payload** (`<name>.h5`) — HDF5 file containing state arrays.

**Manifest schema** (canonical fields):

```json
{
  "schema_version": "1.0.0",
  "sim": { "name": "...", "category": "...", "variant": "ref|diff|sparse|neural|frontier" },
  "stack": { "name": "...", "version": "...", "build_id": "<commit-sha>" },
  "config": { "tier": "...", "dims": [...], "dtype": "f32|f64", "seed": 42, "params": {...} },
  "run": { "step_count": 1000, "capture_interval": 10, "wall_clock_seconds": 23.4, "start_utc": "..." },
  "payload": { "format": "hdf5", "path": "...", "checksum": "sha256:..." },
  "determinism": { "claimed": "bit-exact-same-hw|epsilon|non-deterministic", "atomic_ops": false, "subgroup_ops": false }
}
```

**Payload structure** (HDF5):

- `/steps/{N}/state/{field_name}` — array per simulated field per captured step.
- `/steps/{N}/diagnostics/{check_name}` — Tier 1 diagnostic values per step.
- `/metadata/` — replicated manifest fields for offline tooling.

**Format versioning:** semver. Breaking changes bump major; forward-compatible additions bump minor; bug fixes bump patch. Schema files in `tools/testkit/schemas/` are source of truth; all stacks consume the same schema.

**Schema-version compatibility policy.** Each common-* module accepts reads of any capture schema version ≤ its build's max-supported version; writes default to the highest supported. A 1.1.0 reader accepts 1.0.0 inputs; a 1.0.0 producer cannot satisfy a 1.1.0-required consumer. When a phase ships a schema bump (e.g., Phase 4 WU-A adds `gradient_fields` and bumps 1.0.0 → 1.1.0), every common-* module's `write_capture` is extended in the same phase to accept the new version. The equivalence harness accepts mixed-version inputs and applies version-appropriate field comparisons. This policy is what makes additive schema bumps non-breaking in practice, not just in semver theory.

**`payload.checksum` semantics.** The manifest's `payload.checksum` field is the sha256 of the raw HDF5 payload file as written by the producer. It is **informational** — the canonical determinism contract lives at the harness per §2.5, not at this field. Two captures of the same simulation state written at different Unix instants may have different `payload.checksum` values if the underlying file format embeds wall-clock-influenced metadata (e.g., HDF5 H5O_MTIME_NEW object-header messages); the writer suppresses such metadata defensively (h5py `track_times=False`; h5wasm `Date.now()` shim), but downstream consumers MUST NOT use `payload.checksum` byte-equality as the determinism gate. Consumers that need to assert "two captures of the same sim are determinism-equivalent" use the §2.5 harness instead.

**Capture file location convention.** Sims write captures to `captures/<sim>-<variant-or-ref>/<descriptor>.h5` plus `<descriptor>.json` sidecar at repo root. The `<descriptor>` is a stack-agnostic structured filename `<test-name>-<config>-seed<N>-step<N>` (e.g., `dam-break-1M-particles-seed42-step1000`, `taylor-green-128cube-seed42-step500`). Stack-agnostic descriptors allow the equivalence harness to pair source and port captures by descriptor alone across `captures/<sim>-ref/` and `captures/<sim>-stack-<X>/` directories. Per-sim, per-test descriptors are declared in the sim's `spec-ref.md` § 9 (Equivalence).

**Canonical descriptor table.** The authoritative list of every sim's canonical capture descriptors across every phase lives in Appendix D § D.2.3. Phase plans consume this table; they MUST NOT redefine descriptors. Format rules:

- **Hyphens, not underscores**, in all descriptor segments. A descriptor written with underscores fails equivalence pairing.
- **Lowercase only.**
- **Single-hyphen separation** between segments; no double-hyphens.
- **Numeric suffixes inline** (`128cube`, `1M-particles`, `seed42`, `step1000`) — no underscores between number and unit.

Cat 4 grammar (c) `<API X has shape Y>` enforces descriptor consumption (an agent reading a descriptor name from Appendix D § D.2.3 will hit a HARD_FAIL if its code writes the descriptor differently).

**HDF5 vs alternatives:** HDF5 is chosen for: scientific-data-interchange ubiquity (h5py, MATLAB, R, Julia all read it), large-file scaling (>1 GB graceful), partial-read support (load a single step without reading the whole file), tooling maturity (HDFView, h5diff). Rejected alternatives: raw binary (no metadata), MessagePack (no random access), Parquet (column-oriented, awkward for nested state), npz (Python-only).

## 2.8 Reference vendoring

Every upstream that any simulation cites lives at `references/<UpstreamName>/`, vendored at a specific SHA. Each vendored upstream has a manifest:

```toml
[upstream]
name = "SPlisHSPlasH"
version = "2.16.1"
sha = "<full-SHA-as-vendored>"
url = "<canonical-upstream-URL>"
license = "MIT|Apache-2.0|BSD-3|..."
license_file = "LICENSE"

[scope]
purpose = "Reference for SPH kernel implementations and DFSPH algorithm"
used_by_sims = ["particle-fluid/sph-water"]
used_by_checks = ["cat1.upstream-citation", "cat3.cubic-kernel"]

[vendoring]
fetched_utc = "2026-05-17T..."
fetched_by = "<author>"
fetch_command = "git clone ... && git checkout <SHA>"
```

The integrity toolkit's `cat1.upstream-anchor` check parses these manifests. Vendoring is a precondition for citing — a sim cannot cite an upstream that is not vendored.

This discipline prevents the failure mode where a confident-but-wrong upstream version string ends up baked into 28 citation sites and only surfaces when someone tries to verify it.

## 2.9 Pre-implementation probes

Before any sim's implementation begins (after tests are written, before any sim source code lands), a pre-implementation probe is run and committed at `tools/testkit/probes/reports/`. The probe enumerates:

- Every API surface the sim will consume (from any common module).
- Every upstream citation the sim will make (with verified SHAs).
- Every test-fixture path the sim will produce.
- Every public type, function, or struct the sim will export.

Each enumeration is grep-verified verbatim from the synced repo. The probe report is the input to the implementation prompt; the implementer reads the probe rather than re-deriving these facts from memory.

This is the "Convention C + D" discipline of the integrity-toolkit retros, generalized: the same pre-implementation probe pattern catches the same class of fabrications across any spec author, any executor, any commit chain.

## 2.10 The Layer 0 → Layer N gate

A simulation's progression through the layered architecture is gated:

| Gate | Precondition |
|---|---|
| Sim spec lands | Testkit Layer 0 supports the verification regime declared in §6 of the spec sheet |
| Tests land | Pre-implementation probe committed |
| Implementation lands | Tests committed and failing (no implementation present) |
| Implementation passes CI | Tests pass; integrity Cat 1–5 pass; diagnostics Tier 1 pass; determinism gate passes |
| Cross-stack variant lands | Equivalence harness configured with per-sim tolerance |
| Frontier variant lands | Reference variant passes all gates; variant-specific tests committed |

Skipping any gate produces retroactive verification debt. The gates are not aspirational; they are enforced by the integrity toolkit's Cat 4 (draft-time spec verification) and Cat 5 (provenance traceability) checks.

## 2.11 Infrastructure verification surrogates

For phases that ship infrastructure (testkits, harnesses, packagers, CI pipelines, common modules) rather than sims, MMS / GCI / Roy 2005 don't apply — there is no PDE to verify, no discretization to converge. The verification posture for these phases substitutes three surrogates:

1. **Smoke contracts** — minimal end-to-end exercise of every public API surface against a stub or canonical consumer. Each public function / class / type has at least one smoke test that imports it, instantiates or calls it, and asserts the documented return shape.
2. **Capture round-trip** — every component that touches captures must round-trip a canonical capture through the testkit's schema validator. Writer → reader → manifest validation → payload equality.
3. **Determinism harness** — every component with stochastic behavior (kernels, training loops, render passes, sampling) runs the determinism harness with a documented per-component determinism declaration (bit-exact / epsilon-bounded / non-deterministic-by-design).

The framework applies to: Phase 0 (testkit + integrity + diagnostics), Phase 2 Stage 0 (common-warp bootstrap), Phase 3 tasks 1 / 2 / 9 (common-3dgs, render-similarity, common-warp maturation), Phase 4.0 (all 8 WUs), Phase 5 (all 5 sub-phases).

Sims, by contrast, exercise MMS / GCI / golden-values per their declared § 6 verification posture. The surrogates do not replace § 6; they are what § 6 collapses to when the artifact under verification is infrastructure rather than a numerical solver.

## 2.12 Schema-version bump policy

The capture-format JSON Schema at `tools/testkit/schemas/capture-v1.json` is at `schema_version: 1.0.0` after Phase 0 close. Bumps follow a locked schedule:

| Schema version | Phase / WU | Additions |
|---|---|---|
| 1.0.0 | Phase 0 Block 1 | Base schema per § 2.7. |
| 1.1.0 | Phase 4 WU-A (Stage 2) | `gradient_fields` optional manifest key for differentiable sims. |
| 1.1.0 | Phase 4 WU-B (Stage 3) | `active_mask` optional manifest key for sparse sims. Does NOT re-bump; both additions ship under 1.1.0. |

**Forbidden:** any other phase or stage bumping `schema_version`. An agent encountering an apparent need to bump outside this schedule surfaces BLOCKED per Hard-Rule-2.

**Forward-compat:** common-* writers default to writing the highest `schema_version` their build supports. Readers accept any version ≤ build-supported. Unknown future versions are explicitly rejected to prevent phantom-success.

**Major bumps** (1.x.x → 2.0.0) require: (a) a documented breaking change, (b) a migration tool that upgrades existing captures, (c) explicit owner approval. None is planned in the current plan set.

**Backward-compatibility regression corpus.** Every phase that touches the schema (Phase 4 WU-A, Phase 4 WU-B) MUST commit a regression test that loads every prior-phase canonical capture from `tests/fixtures/legacy-captures/` against the post-bump reader and asserts round-trip success. The corpus is append-only: Phase 0 lands the initial RD-2D capture, Phase 1 appends one capture per sim, Phase 2 appends one capture per port, and so on. By Phase 4, the corpus has 30+ captures spanning two years of phase work. A schema bump that breaks any prior-phase capture is a HARD_FAIL regardless of how "additive" the change appears. This corpus is what makes the additive-bumps-are-non-breaking claim in § 2.7 testable rather than aspirational.

## 2.13 Mutation testing for testkit and integrity tooling

The testkit (Layer 0) and integrity toolkit (Layer 1) are load-bearing for every downstream verification claim in the portfolio. A bug in the MMS pipeline silently invalidates every PDE sim's Cat 3 verification; a bug in Cat 4 lets fabricated assertions ship. TDD alone does not guarantee these tools are correct — the tests can be too weak to detect a bug the implementation has.

**Mutation testing** addresses this directly: a mutation tool (`mutmut` for Python, `Stryker` for TypeScript) introduces small artificial defects (mutants) into the implementation under test, runs the test suite, and asserts that the test suite *fails* (kills the mutant). Tests that don't kill mutants are too weak.

**Required coverage:**

- `tools/testkit/code_verification/mms/` — the MMS pipeline. Mutation score ≥ 80% required.
- `tools/testkit/code_verification/golden/` — golden-value verifier. ≥ 80%.
- `tools/testkit/determinism/` — determinism harness. ≥ 90% (higher because failures here are silent in downstream verification).
- `tools/testkit/equivalence/` — equivalence harness. ≥ 85%.
- `tools/testkit/capture/` — capture reader/writer/diff. ≥ 90%.
- `tools/integrity/integrity/cat4_draft_time/` — Cat 4 grammar checker. ≥ 90% (false-negatives here let fabrication through).

Mutation-test runs are SOFT_WARN in CI on every push (informational; do not block) and HARD_FAIL on phase landings (the phase cannot tag if mutation score has regressed below threshold for any in-scope module). Phase 0 lands the initial mutation-testing harness and baselines; subsequent phases inherit the thresholds. Phase 4 elevates `cat4_draft_time` to 95% after schema-bump traffic has stress-tested its grammars.

**Configuration:** `tools/testkit/mutation/mutmut-config.toml` for Python; `tools/testkit/mutation/stryker.conf.json` for TS. Both committed alongside `tools/testkit/` so the configuration is co-versioned with the modules it tests.

## 2.14 Property-based testing for invariants

MMS is one form of analytical property test — it verifies the solver satisfies a manufactured property (the manufactured solution). It does not cover the full surface of invariants a sim must satisfy: boundary conditions, symmetries, conservation laws, particle-system integrity under random initial conditions, monotone bounds under random parameters, etc. These edge cases are missed by both MMS and golden values.

**Hypothesis-style property-based testing (PBT)** complements MMS by generating random inputs and asserting invariants. Required PBT surfaces:

- **Conservation laws.** For every sim claiming a conservation property (mass, momentum, energy), PBT generates random valid initial conditions and asserts the conservation property holds across N steps to within Tier 1 tolerance.
- **Tier-2 invariants.** For each Tier 2 substack (particle, scalar field, vector field, closed form), PBT generates random valid states and asserts the substack's invariants (no overlap within ε; monotone bounds; divergence-free where prescribed; bound preservation).
- **Cross-stack equivalence under randomized seeds.** For sims claiming bit-exact-same-hw determinism, PBT samples 10+ seeds and asserts the determinism harness verdict matches the per-sim declaration.

PBT lives at `tools/testkit/property/` alongside MMS and golden values. Each sim's spec sheet § 6 declares which invariants are PBT-covered. Hypothesis's example database (`.hypothesis/`) is committed for reproducibility of shrunken counter-examples.

PBT runs are HARD_FAIL in CI for any sim declaring an invariant. Sims that don't claim invariants under PBT (closed-form chaotic sims, neural surrogate trajectories) declare so in spec sheet § 6 and run no PBT gate.

## 2.15 Performance regression ledger

Performance is explicitly not a Layer 4 acceptance gate — Rule I2 in phase plans defers performance to Phase 5 productization. But unmeasured performance lets correctness bugs hide: a sim that's 10× slower than expected may be doing 10× more work to "pass" tests (much finer time steps, redundant kernel launches, fallback paths in code intended for the fast path). The portfolio needs visibility into wall-clock without making it a blocking gate.

**Performance regression ledger** at `docs/perf-ledger.md` is the lightweight mechanism. The capture manifest already includes `run.wall_clock_seconds`; the ledger consumes that.

On every sim's first canonical landing:
- Record `(sim, stack, descriptor, wall_clock_seconds, hardware_id, commit_sha, date)` as a row.

On every subsequent CI run for that sim:
- Re-run the canonical capture in CI (or a perf-runner job).
- Append a new row if wall_clock has changed by >10% from the prior recorded value.
- Flag rows that are >2× slower than the first-landing baseline with `regression: WATCH`.

The ledger does not block CI. It does surface regressions at landing-audit review time — the closing-audit agent reads the ledger and reports any `regression: WATCH` rows under "Performance observations." If a regression is correlated with a correctness change that landed in the same phase, the founder investigates.

This is the minimum viable performance discipline: cheap, no perf-bench infrastructure, surfaces the worst class of correctness-masking-as-perf-regression.

---

# Part III — Layered architecture

Eight layers, built in order. Each layer is the precondition for the next.

## 3.1 Layer 0 — Testkit

The testkit defines what correct looks like across every stack, every category, every variant. It is the foundation; everything else builds on it.

**Directory:**

```
tools/testkit/
├── README.md
├── pyproject.toml
├── schemas/                      # JSON Schemas for capture, golden, manifests
│   ├── capture-v1.json
│   ├── golden-v1.json
│   └── reference-manifest-v1.json
├── capture/                      # Capture format reference impl
│   ├── reader.py
│   ├── writer.py
│   ├── diff.py
│   └── docs/format.md
├── code_verification/            # Python-imported subdir → underscore
│   ├── mms/                      # Method of Manufactured Solutions
│   │   ├── solutions/            # Library of manufactured solutions
│   │   ├── derive.py             # SymPy-based source derivation
│   │   ├── runner.py
│   │   └── analyze.py            # OOA fit, convergence report
│   └── golden/                   # Golden-value verification
│       ├── tables/               # Committed expected-value tables
│       ├── derivations/          # Committed algebraic derivations
│       ├── generator/            # Regenerate tables from upstream
│       └── verifier.py
├── solution_verification/        # Python-imported subdir → underscore
│   ├── gci/                      # Grid Convergence Index
│   │   ├── harness.py
│   │   ├── richardson.py
│   │   └── report.py
├── render_similarity/            # Python-imported subdir → underscore (added Phase 4 WU-C)
│   ├── metrics.py                # psnr, ssim, lpips, ms_ssim
│   ├── report.py
│   └── tests/
├── determinism/
│   ├── harness.py
│   ├── policy.md                 # Per-stack determinism guidance
│   └── tests/
├── equivalence/
│   ├── harness.py
│   ├── tolerance.toml            # Per-category cross-stack tolerances
│   └── tests/
├── references/                   # Symlink to top-level references/
├── probes/
│   ├── template.md               # Pre-implementation probe template
│   ├── verifier.py               # Cat 4 (spec-time spec verification)
│   └── reports/                  # Committed probe reports
└── tests/                        # Testkit's own tests
```

**Naming convention for testkit subdirs.** Directories below `tools/testkit/` are Python import-path components — the testkit wheel ships them as bare top-level modules (`capture`, `code_verification`, `determinism`, `equivalence`, `golden`, `property`), not nested under a `tools.testkit` namespace. They use underscores (e.g., `code_verification/`, `solution_verification/`) because hyphens are not legal in Python identifiers. Module-root directories whose Python package is independently installed (e.g., `common/common-warp/` provides the `common_warp` import name via its `pyproject.toml`) can stay hyphenated because they are not import-path components — pip / uv translates the package name. The two cases are distinct and the convention is: hyphens for `common/common-<stack>/` module roots; underscores for `tools/testkit/<subdir>/` Python-imported subdirectories.

**Components (detailed):**

- **Capture format** — Part II §2.7.
- **MMS harness** — Part II §2.2.
- **Golden-value system** — Part II §2.4.
- **GCI harness** — Part II §2.3.
- **Determinism harness** — Part II §2.5.
- **Cross-stack equivalence** — Part II §2.6.
- **Reference vendoring** — Part II §2.8.
- **Probe template** — Part II §2.9.

**Acceptance criteria for Layer 0 to be considered complete:**

- Capture format spec landed, frozen at v1.0.0.
- One manufactured solution implemented end-to-end for a canonical PDE (heat equation, 1D, recommended for simplicity).
- One golden-value table generated and verified against an analytical algorithm (cubic spline kernel for SPH, recommended).
- Determinism harness runs against a stub simulator and produces a green report.
- Equivalence harness runs across two stub stacks and produces a diff report.
- One upstream vendored end-to-end with the discipline documented.
- Pre-implementation probe template exists and one example report is committed.

Layer 0 is not "done" — it grows as new manufactured solutions, new categories, and new stacks come online. But the acceptance criteria above mark Layer 0 as *operational*, after which Layer 1 work can begin.

## 3.2 Layer 1 — Integrity toolkit

The integrity toolkit catches drift and fabrication at write-time, before tests even run. Five categories, all in scope for the first release:

- **Cat 1 — Citation integrity.** Every `file:line` citation resolves. Every upstream citation matches a vendored SHA. Algebraic derivations are cross-linked to their consumers.
- **Cat 2 — Contract verification.** Every public API field, function, struct member declared in headers/specs has a matching implementation. Every re-export resolves. Includes the sub-check `cat2.api_imports`: code blocks tagged ` ```python public-api ` inside `docs/common/*.md` are extracted and converted to a generated test at `tests/api/import_<surface>.py` that imports every documented symbol; the test runs on every commit. Cat 2 thus enforces the sockets-and-wires architecture mechanically, not just at phase closing audits.
- **Cat 3 — Numerical correctness.** Implementations of upstream algorithms and PDE solvers match the testkit's golden values and MMS-derived expected orders of accuracy.
- **Cat 4 — Draft-time spec verification.** Specs and audits are scanned at draft time for assertions of any of three grammars: (a) `<path>:<line>` or `<path>:<start>-<end>` — file-line citations; (b) `<phrase "X" in Y>` — phrase-present-in-file citations; (c) `<API X has shape Y>` — public API surface citations. Every such assertion is grep-verified or import-verified against repo HEAD before commit. Mismatches block the commit. Grammars (b) and (c) are activated in Phase 1 Stage 1 (extending Phase 0's (a)-only Cat 4).
- **Cat 5 — Provenance traceability.** Every published claim (in audits, retros, spec sheets) links to a FACT it rests on. The link graph is checked for well-formedness.

**Failure modes:** Three; every check declares one.

- `HARD_FAIL` — CI red; commit blocked.
- `SOFT_WARN` — CI yellow; warning logged.
- `AUDIT_LOG` — logged to audit, no CI signal.

Default mapping: Cat 1 and Cat 2 are HARD_FAIL; Cat 3 starts SOFT_WARN and upgrades per check; Cat 4 is HARD_FAIL at the pre-commit hook level; Cat 5 is SOFT_WARN.

**Suppression mechanism:** Inline annotations of form `# integrity-allow: <check>; <reason>; <tracking-id>`. Every annotation is itself audited (provenance trace, grandfather catalog).

**Why Cat 4 and Cat 5 are first-release, not deferred:** Both directly address the dominant failure mode of multi-agent specification work — confident assertion of facts from memory that turn out to be wrong. Deferring them means accumulating retroactive debt; including them from day one means the first spec ever written under this architecture has draft-time verification.

**Directory:**

```
tools/integrity/
├── pyproject.toml
├── integrity/
│   ├── __main__.py
│   ├── runner.py
│   ├── cat1_citations/
│   ├── cat2_contracts/
│   ├── cat3_numerical/
│   ├── cat4_draft_time/
│   ├── cat5_provenance/
│   └── common/
├── scripts/
│   └── audit_prose_freshness.py
└── tests/
    ├── fixtures/
    │   ├── known_good/                  # Real-world artifacts that should pass each Cat
    │   └── adversarial/                 # Known-bad fixtures; each Cat must flag its targets
    │       ├── cat1_broken_citations/   # file:line refs to non-existent paths/lines
    │       ├── cat2_phantom_contracts/  # docs/common/*.md declaring symbols not in impl
    │       ├── cat3_wrong_goldens/      # golden tables with off-by-one expected values
    │       ├── cat4_unverified_assertions/  # specs with each grammar (a)(b)(c) referring to non-existent targets
    │       └── cat5_orphan_claims/      # audit claims with no traceable FACT
    └── test_adversarial_coverage.py     # Meta-test: each adversarial fixture MUST be flagged
```

**Adversarial-fixture meta-test (mandatory).** `tests/test_adversarial_coverage.py` runs every adversarial fixture through the corresponding Cat-N check and asserts the check returns HARD_FAIL or SOFT_WARN (per the fixture's declared expected outcome). The meta-test is itself part of CI: any fixture that should be flagged but isn't fails the build. This is what makes the integrity toolkit's correctness *testable* rather than asserted. New adversarial fixtures are added whenever a real-world fabrication slips past the integrity gates — the lesson is encoded as a fixture so the gap closes for future phases.

Mutation testing (§ 2.13) layers on top: the integrity toolkit's implementation is mutated, and the adversarial-fixture meta-test must continue to catch the mutants. A mutant that survives is a sign the meta-test corpus is incomplete; new fixtures are added.

## 3.3 Layer 2 — Diagnostic toolchain

The diagnostic toolchain extends the testkit with inspection facilities for runtime introspection. Three tiers:

- **Tier 1 — Universal.** Stack-agnostic, sim-agnostic. Capture I/O (consumes Layer 0 format), NaN/Inf scanning, energy/mass/momentum conservation checks (where applicable), wall-clock timing, GPU dispatch counts, memory high-water marks, determinism (extends Layer 0 harness).
- **Tier 2 — Data-structure-specific.** Four substacks:
  - **Particle** — no overlapping positions within ε; neighbor list integrity; momentum conservation; particle-count invariance for closed systems.
  - **Scalar field** — monotone bounds where the PDE prescribes; spectral content matches expected; conservation laws.
  - **Vector field** — divergence-free where prescribed; circulation properties; helicity tracking; energy spectrum.
  - **Closed-form** — output stability over parameter sweeps; sensitivity to numerical precision; bound preservation.
- **Tier 3 — Per-sim.** Thin shims composing Tier 1 + Tier 2 primitives for sim-specific needs. Each sim has its own Tier 3 module.

**Position relative to testkit:** The testkit owns capture format and determinism harness. The diagnostic toolchain consumes those and adds health/performance/data-structure-specific inspection. No duplication.

**Directory:**

```
tools/diagnostics/
├── tier1/
│   ├── capture_io.py             # Consumes Layer 0 format
│   ├── health.py                 # NaN/Inf, conservation
│   ├── performance.py
│   └── determinism.py            # Extends Layer 0 harness
├── tier2/
│   ├── particle/
│   ├── scalar_field/
│   ├── vector_field/
│   └── closed_form/
└── tier3/                        # Per-sim modules
    └── <sim-name>/
```

## 3.4 Layer 3 — Common infrastructure

Per-stack common modules. Each common-* module is itself TDD: tests for its public API are committed before the API is implemented.

**Modules** (per Stack assignment in Part IV):

- `common/common-glsl/` — Stack A
- `common/common-ts/` — Stack B
- `common/common-cpp/` — Stack C
- `common/common-py/` — Stack D
- `common/common-warp/` — Stack E
- `common/common-rs/` — Stack F (when adopted)
- `common/common-mojo/` — Stack G (horizon)

**Cross-stack shared:**

- `common/schemas/` — capture, golden, manifest schemas (canonical, all stacks consume).
- `common/references/` — vendored upstreams.

**Per-module requirements** (every common-* module satisfies):

1. Capture I/O implementation — reads and writes the Layer 0 format.
2. Determinism harness binding — exposes a `--deterministic` flag and seed mechanism.
3. Smoke simulator — a minimal "hello-physics" sim exercising the common module; used by testkit's own tests as a stack-agnostic check.
4. Public API documented in spec sheet at `docs/common/<stack>.md`.
5. Cat 2 contract verification passes against the spec sheet.
6. Cross-stack equivalence harness can compare smoke sims across any two stacks.

## 3.5 Layer 4 — Reference implementations

One canonical reference sim per category, on one primary stack. Choice of primary stack is per-category (Part V).

**Each Layer 4 sim must, before merge:**

1. Have its spec sheet committed with full §6 verification posture.
2. Have its pre-implementation probe report committed.
3. Have its acceptance test suite committed and *failing*, with the verbatim failing pytest output captured to `tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt` and hashed in the failing-tests commit message footer (per § 1.3 step 4).
4. Pass MMS / golden-value tests after implementation (Cat 3), including at least three independent-reference anchors per golden table (per § 2.4).
5. Pass Tier 1 diagnostics.
6. Pass category-specific Tier 2 diagnostics.
7. Have its citation chain resolve (Cat 1).
8. Have its public API resolve (Cat 2).
9. Ship with a capture file produced by the sim that the testkit can replay.
10. Have a determinism declaration consistent with its capture file.
11. Pass property-based testing of declared invariants (per § 2.14).
12. Record its first-landing wall-clock in the performance regression ledger (per § 2.15).
13. The phase-landing audit re-runs the pre-implementation commit's failing tests and confirms the recorded output hash matches.

These are gates, not aspirations. A reference sim that doesn't meet all thirteen does not merge.

**Backward compatibility note.** The earlier ten-gate formulation in Appendix D § D.6 is preserved as the historical contract for Phase 0 / Phase 1 sims. Gates 11–13 are introduced with Phase 2 cross-stack replication and apply going forward. Phase 1 sims back-fill gates 11–13 at Phase 2 open as part of the equivalence-readiness pass.

## 3.6 Layer 5 — Cross-stack replication

For each Layer 4 reference, replicate to additional stacks where category logic warrants. Equivalence is a test, not an aspiration: the cross-stack equivalence harness runs in CI and gates the second-stack merge.

**Per-replication requirements:**

1. New spec sheet for the replicated variant (or a section of the original spec, if minor).
2. New test fixtures referencing the replicated variant.
3. Equivalence harness configured for the replicated pair.
4. CI gate on the equivalence harness passes.

## 3.7 Layer 6 — Frontier variants

For each Layer 4 reference, the four frontier-variant axes (Part VI):

1. **Differentiable variant** — Taichi `ti.ad.Tape`, Warp autodiff, or JAX. Exercises a non-trivial inverse problem (parameter ID, initial-state recovery, control). A gradient-equipped forward pass without an inverse problem is not a differentiable variant.
2. **Sparse variant** — NanoVDB for volumetric/MPM; hash-grid or AMR where applicable.
3. **Neural-rendered variant** — 3DGS coupling for sims with strong visual outputs.
4. **Frontier-algorithm variant** — flow-map for fluids, particle Lenia for Lenia, DiffLogic CA for NCA, moment-encoded LBM, etc.

Variants live as siblings of the reference, not as replacements. Folder convention per category-defining example:

```
volumetric-grid/eulerian-smoke/
├── ref/                          # The Layer 4 reference sim
├── ref-stack-b/                  # Layer 5 replication
├── diff-warp/                    # Layer 6 differentiable (Warp)
├── sparse-nanovdb/               # Layer 6 sparse
├── neural-3dgs/                  # Layer 6 neural-rendered
├── flow-map-clebsch/             # Layer 6 frontier algorithm
└── docs/
    ├── spec-ref.md
    ├── spec-diff-warp.md
    ├── spec-sparse-nanovdb.md
    ├── spec-neural-3dgs.md
    ├── spec-flow-map-clebsch.md
    ├── equivalence.md            # Cross-variant tolerances
    └── algebraic.md              # Shared derivations
```

Each variant gates on its own golden values, but also on equivalence to the reference where physically meaningful.

## 3.8 Layer 7 — Productization

The layer the world sees:

- **Web demos** — every Stack B sim deployed at `bit-physics.<domain>` with per-sim URLs; embeddable as iframes.
- **Standalone binaries** — every Stack C sim built for Linux/Windows/macOS via GitHub Actions matrix builds.
- **Python packages** — Stack D and E sims published to PyPI as `bit-physics-<category>-<sim>`.
- **Offline renders** — per-sim hero shots and short videos rendered via Blender Cycles (default) or Houdini Karma (when licensed and cinematic quality justifies). Live at `docs/renders/`.
- **Academic preprints** — per-sim spec sheets structured for arXiv-extractable preprints; the verification posture is itself the evaluation section.

The productization layer is where the portfolio meets its audience. Everything below is in service of this layer's quality.

**Bootstrap-style verification posture (Phase 5 sub-phase 5.3 onward).** Productization workflows do not produce sims; they package sims that already exist. The verification of "did productization preserve correctness" is therefore a re-entry into Layer 0's verification machinery *from* the productized artifact, not a fresh verification surface. Concretely, for each productized artifact:

1. Install the artifact in a fresh, isolated environment (clean venv for PyPI; clean Docker image for binaries; clean browser context for web demos).
2. Run the artifact to re-emit its canonical capture (the same descriptor that landed at Phase 1 / Phase 2).
3. Pass the re-emitted capture through the testkit's equivalence harness against the in-repo canonical capture for that sim.
4. The equivalence verdict at the per-sim tolerance (§ 2.6) is the productization gate.

This means Phase 5's "did the PyPI package work" question collapses to "does the testkit accept the package's output as equivalent to the in-repo canonical." No new verification primitives; just re-application of existing ones. The same posture applies to Phase 5 sub-phase 5.1 (web demos: headless browser re-emits canonical capture) and 5.2 (binary release: containerized binary re-emits canonical capture).

---

# Part IV — The stack axis

Seven stacks. A through F are primary; G is horizon. Each stack has a defined niche; assignments are per-category in Part V.

## 4.1 Stack A — GLSL (Shadertoy lineage)

**Languages:** GLSL 4.6 (compute) or GLSL ES 3.0 (Shadertoy-style fragment).
**Runtime:** WebGL2 or native OpenGL 4.6.
**Build:** None (shader-only) or minimal Vite host page.
**Common module:** `common/common-glsl/` — hash functions, noise primitives, raymarch utilities, palette tables.
**Best for:** Closed-form sims (strange attractors, mandelbulb), 2D reaction-diffusion, Shadertoy-derived ports as starting points.
**Verification posture:** Capture format via readback (gl.readPixels or equivalent). Determinism depends on driver-level reproducibility flags; epsilon tolerances apply across drivers.
**Limitations:** Single fragment shader on the Shadertoy variant; no real compute; CPU-side logic is host-page only.

## 4.2 Stack B — TypeScript / WebGPU

**Languages:** TypeScript 5.x, WGSL.
**Runtime:** WebGPU (modern Chrome/Edge/Brave on desktop; Safari and Firefox per current support; native via Dawn or wgpu-native).
**Build:** Vite + esbuild; pnpm workspaces for monorepo organization. Per-sim package under `packages/<sim>`.
**Common module:** `common/common-ts/` — Device init, BindGroup management, shader compilation pipeline, capture I/O via ArrayBuffer/SharedArrayBuffer, IndexedDB for in-browser captures, IndexedDB schema versioning.
**Best for:** Anything browser-shippable. Agent-based sims at scale (boids, physarum). Browser-friendly continuous CA. Deployment target for trained neural CA models. The "ship" stack — sims that also exist here get the productization benefit.
**Verification posture:** Capture format via `readBuffer.mapAsync`. WebGPU spec does not mandate bit-exact reproducibility across vendors; cross-vendor equivalence is epsilon-bounded.
**Notable:** Sims in any other stack that also land in Stack B reach the widest audience.

## 4.3 Stack C — C++ / Vulkan

**Languages:** C++20, GLSL (compiled to SPIR-V via glslang).
**Runtime:** Vulkan 1.3 with subgroups, timeline semaphores, dynamic rendering.
**Build:** CMake with Ninja; FetchContent for first-party deps; system packages for OpenVDB, Alembic, Imath; optional Conan or vcpkg for portability.
**Common module:** `common/common-cpp/` — Vulkan device abstractions, descriptor management, swap chain, present-mode control (caller-configurable for VSync/framerate), capture I/O, OpenVDB export, Alembic export, USD export, ImGui integration.
**Best for:** Performance ceiling. Volumetric grid sims. LBM. Production SPH. Any sim whose algorithm is performance-bound and the kernel matters.
**Verification posture:** Determinism per-driver; Vulkan does not guarantee bit-exact across drivers. Within a single driver/GPU at fixed atomic ordering, bit-exact is achievable. Subgroup operations are flagged as determinism risk in per-sim equivalence docs.
**Notable:** Vendored C++ upstreams (SPlisHSPlasH, OpenVDB) integrate natively. This is the academic-citation-fidelity stack.

## 4.4 Stack D — Python / Taichi

**Languages:** Python 3.11+, Taichi DSL.
**Runtime:** Taichi 1.7+ with CUDA / Vulkan / Metal backends.
**Build:** None (interpreted Python); Taichi JIT for kernels. `uv` for dependency management; `pyproject.toml` per sim package.
**Common module:** `common/common-py/` — Shared Taichi kernels, capture I/O, Alembic/VDB Python bindings, plotting utilities, Jupyter integration, GGUI utilities, hot-reload via watchfiles + child-process re-exec.
**Best for:** MPM family (the 88-line MLS-MPM reference is canonical Taichi). Lenia variants. Research-iteration sims where the DSL matters more than raw performance.
**Verification posture:** Taichi has explicit determinism flags. Reproducibility within Taichi is well-supported. Cross-stack equivalence against Stack C is the harder direction (FP order is not guaranteed equal).
**Notable:** DiffTaichi (`ti.ad.Tape`) is the differentiability path. Taichi 1.7.4 has no built-in FFT; sims requiring spectral methods use a backend-selection pattern (CuPy → PyTorch → numpy fallback).
**Known limitations:**
- `@ti.kernel` cannot hot-reload (decorator captures AST at decoration time); workaround is process-restart.
- `@ti.kernel` argument annotations break with `from __future__ import annotations`; module-level import order matters.
- Taichi GGUI does not enumerate F-key constants; key bindings for save/load use explicit values.

## 4.5 Stack E — Python / Warp

**Languages:** Python 3.10+, Warp kernel DSL (JIT-compiled to CUDA / x86).
**Runtime:** NVIDIA Warp 1.x with CUDA 12 backend; Apple Silicon CPU support; ARMv8 Linux support.
**Build:** Warp JIT; `uv` for package management.
**Common module:** `common/common-warp/` — NanoVDB integration (built into Warp), USD export, autodiff utilities, capture I/O, PyTorch and JAX zero-copy interop, NVIDIA Newton integration, hash grids, mesh primitives.
**Best for:** Industry-aligned work. Rigid-body sims via Newton. Differentiable variants of everything. Sparse-volume sims via NanoVDB. 3DGS-coupled physics. CFD with autodiff. Any sim plugging into PhysicsNeMo / Omniverse / Isaac Lab.

**Differentiation from Stack D:**

| Axis | Stack D (Taichi) | Stack E (Warp) |
|---|---|---|
| Differentiability | `ti.ad.Tape`, kernel-level, mature | Built-in autodiff, PyTorch/JAX zero-copy interop |
| Sparsity | Taichi sparse data structures (research-grade) | NanoVDB built in, production-grade |
| Industry adoption | Academic; smaller commercial footprint | NVIDIA's go-to-market; Newton/Isaac/Omniverse path |
| Cross-platform | CUDA, Vulkan, Metal | CUDA primary; CPU on x86/ARM |
| USD support | Manual export | Native USD export |
| Maturity | Stable, ~5+ years | Stable, scope expanded substantially through 2025–2026 |

**Newton integration:** NVIDIA Newton 1.0 GA (Linux Foundation, Apache-2.0, built on Warp + OpenUSD, includes MuJoCo-Warp and Kamino solvers as primary backends). For rigid-body and contact-rich sims, Newton is the production reference; the portfolio's rigid-body sims use Newton as a backend, not as a competitor.

The two stacks coexist; they target different audiences. Stack D is research-DSL with Vulkan/Metal portability; Stack E is industry-aligned with NVIDIA-ecosystem integration.

## 4.6 Stack F — Rust / wgpu

**Languages:** Rust 2024 edition, WGSL.
**Runtime:** wgpu (cross-platform; targets Vulkan/Metal/DX12/WebGPU).
**Build:** Cargo workspaces.
**Common module:** `common/common-rs/`.
**Best for:** Cross-platform native shipping with browser parity. A sim written here can run on every desktop OS and as a browser WebAssembly artifact from one source.
**Status:** Primary-stack-eligible but not initially populated. Adopt when a specific sim warrants Rust's cross-platform-native+browser story over the existing Stack B (browser) + Stack C (native) split.

## 4.7 Stack G — Mojo (horizon)

**Languages:** Mojo (Python superset, MLIR-based).
**Runtime:** Modular MAX runtime with NVIDIA and AMD GPU support; CPU portable; TPU/ASIC capable via MLIR.
**Build:** Modular toolchain.
**Common module:** `common/common-mojo/` (when adopted).
**Best for:** Performance-portable GPU kernels for science and AI. Mojo's value proposition is single-source code that compiles efficiently across NVIDIA, AMD, and CPU; Stack G addresses the same axis Rust/wgpu does but with the differentiability-aware MLIR toolchain.
**Status:** Horizon. Mojo committed to open-source in Fall 2026. The portfolio adopts Stack G after Mojo open-sources and after a candidate sim emerges whose performance-portability needs are not well-served by Stack D or Stack E. Likely first candidate: a multi-vendor LBM or FFT-heavy Lenia variant where the AMD/NVIDIA portability matters.

## 4.8 Adjacent: kernel languages and CUDA-adjacent tooling

The portfolio touches but does not host:

- **Triton (OpenAI)** — Python-like GPU kernel language for ML. Single-vendor (NVIDIA, with community AMD support). Used as a kernel language *within* a Stack E sim when a specific kernel benefits from Triton's tiling abstractions (e.g., a custom attention-style reduction in a learned-dynamics sim). Not a primary stack because Triton lacks the broader simulation framework.
- **CUDA C++** — direct CUDA kernels. Used in Stack C only when no abstraction (Warp, Taichi, Vulkan-compute) suffices. Avoided as a primary path because of vendor lock-in.
- **OptiX** — NVIDIA's ray-tracing framework. Used for offline rendering, not primary sim work.
- **Metal Shading Language** — Apple's GPU language. Reached transitively via Taichi's Metal backend and wgpu's Metal backend; not a primary stack.
- **HIP / ROCm** — AMD's CUDA-like ecosystem. Reached transitively via Mojo (Stack G) and via Vulkan (Stack C).

## 4.9 Cross-stack invariants

Regardless of stack, every simulation must:

1. Implement the capture format defined at Layer 0.
2. Honor a `--deterministic` flag fixing seeds and disabling non-reproducible optimizations.
3. Emit Tier 1 health checks (NaN/Inf, energy/mass/momentum conservation where applicable).
4. Document its determinism posture in `docs/sim-specs/<sim>/determinism.md`.
5. Provide a CLI or programmatic entry point taking: seed, step count, tier (resolution), capture interval, output path.
6. Pass its category-specific code-verification gate (MMS for PDEs, golden values for closed-form).

---

# Part V — The category axis

Twelve categories. Some are research-active, some pedagogical-only, some span both. Each category has at least one canonical reference sim; many have multiple frontier variants.

## 5.1 Closed-form

Render-only artifacts with no time-evolution PDE. Strange attractors, Mandelbulb, fractal sets, parameterized geometric figures.

**Reference sims:**
- **Strange attractors** — classical dynamical systems (Lorenz, Rössler, Aizawa, Pickover, Sprott). Stack A → B.
- **Mandelbulb explorer** — Hart / Quilez distance estimators. Stack A → B.

**Verification posture:** Code verification via golden values (deterministic output for fixed parameters). No solution verification (no discretization). No model validation (no physical phenomenon).

**Frontier:** Not a research-active category. 3DGS reconstruction of fractal volumes is a curiosity; not pursued as primary work.

## 5.2 Continuous cellular automata

The continuous CA category spans 30+ years of work and has the most active research frontier in cellular-automata-adjacent work.

### 5.2.1 Reaction-diffusion (Pearson 1993)

**Reference sims:**
- **reaction-diffusion-2d** — 2D Gray-Scott. Stack A (Shadertoy) → B (WebGPU).
- **reaction-diffusion-3d** — 3D Gray-Scott with ray-marched iso-surface. Stack C.

**Frontier variants:** Differentiable parameter ID via Taichi `ti.ad.Tape`.

### 5.2.2 Lenia (Chan 2019)

Continuous-state CA generalizing Gray-Scott to arbitrary kernel shapes.

**Reference sim:** **lenia-fft** — Stack D (Taichi or PyTorch), with WebGPU deploy variant.

**Frontier variants:**
- **Particle Lenia** (Mordvintsev et al. 2022) — continuous space-and-time, escapes grid discretization.
- **Flow Lenia** (Plantec et al. 2023; published in *Artificial Life* 31(2), May 2025) — mass-conserving variant; enables open-ended evolutionary dynamics. Update-rule parameters can themselves be made dynamic and localized within the CA, enabling multi-species simulation with locally coherent rules.
- **Differentiable Lenia** — parameter ID and goal-directed exploration via Taichi `ti.ad.Tape` or JAX.

### 5.2.3 Neural CA (Mordvintsev 2020)

Cellular automata with learned update rules. The category most affected by ongoing research.

**Reference sim:** **neural-ca** — Stack D (PyTorch training) + Stack B (browser deployment).

**Frontier variants:**
- **DiffLogic CA** (Miotti, Niklasson, Randazzo, Mordvintsev, Google; March 2025) — Differentiable Logic Gate Networks integrated with NCA. End-to-end differentiable, discrete-state, runnable on standard digital hardware. Replicates Conway's Game of Life and generates patterns with learned recurrent circuits.
- **Universal NCA** (Béna et al., GECCO '25 Companion, May 2025) — NCA as Turing-complete substrate.
- **NCA for ARC-AGI** (Xu, Miikkulainen; ALIFE '25) — NCA augmented with hidden memory states for algorithmic reasoning.
- **Petri Dish NCA** (Sakana AI, October 2025).
- **HyperNCA** (Najarro et al., 2022) — NCA growing artificial neural networks.

This category is itself a research line; the portfolio treats it as a long-horizon program with multiple sibling sims rather than a single sim.

## 5.3 Agent-based

Local-rule agent simulations.

**Reference sims:**
- **boids-3d** — Reynolds 1987. Stack B (WebGPU).
- **physarum** — Jones 2010. Stack B (WebGPU).

**Verification posture:** Code verification via golden agent trajectories on small fixtures (3-agent test cases for boids). No PDE; no MMS.

**Frontier:** The algorithmic frontier here is largely engineering (agent count, neighbor queries, broadphase data structures), not research. A scalability frontier rather than a research frontier.

## 5.4 Particle fluids — SPH family

Smoothed-particle hydrodynamics. Müller 2003 → DFSPH 2017 lineage.

**Reference sim:** **sph-water** — Stack C (Vulkan), vendored against SPlisHSPlasH 2.16.1. 2-4M particles at interactive rates, Morton-sorted neighbor queries, screen-space rendering.

**Frontier variants:**
- **Differentiable SPH** — DFSPH with Warp autodiff or Taichi `ti.ad.Tape`.
- **3DGS-coupled SPH** — Gaussian Splashing (Liu et al. 2024, PBD-based; SPH-extensible). Replaces screen-space rendering with 3DGS-native rendering.
- **Flow-map SPH** — Particle-Laden Fluid on Flow Maps (Li et al. 2024 arXiv).

## 5.5 Hybrid particle-grid — MPM family

Material point method.

**Reference sim:** **mpm-multimaterial** — Stack D (Taichi), based on the 88-line MLS-MPM reference (Hu et al. 2018). Multi-material with viscoelastic, plastic, granular constitutive models.

**Frontier variants:**
- **Differentiable MPM** — `ti.ad.Tape` over MPM kernels (DiffTaichi's original demo). Parameter ID, inverse design.
- **Sparse MPM** — hash-grid or NanoVDB-backed grid.
- **3DGS-coupled MPM** — PhysGaussian (Xie et al. 2024); PhysSplat (2025); i-PhysGaussian (Feb 2026, implicit MPM with Newton-GMRES); GaussianFluent (Jan 2026, mixed materials in dynamic scenes); PIDG (Xiao et al. June 2025, physics-informed deformable splatting).
- **Warp port** — MPM in Stack E for the industry-aligned pipeline.

## 5.6 Volumetric grid — fluid solvers

The single largest algorithmic frontier in the portfolio. Stam/Fedkiw (1999–2008) is the classical reference; the 2025 frontier is the flow-map family.

**Reference sim:** **eulerian-smoke** — Stack C (Vulkan). Semi-Lagrangian advection with MacCormack correction, vorticity confinement, Jacobi pressure projection. The Stam/Fedkiw stack.

**Verification posture:** MMS for code verification (manufactured solutions for incompressible Navier-Stokes); GCI for solution verification.

**Frontier variants — flow-map family (SIGGRAPH 2025 was dominated by this):**
- **Clebsch Gauge Fluid on Particle Flow Maps (Clebsch-PFM)** (Li et al., SIGGRAPH 2025 Best Paper Honorable Mention; Bo Zhu group). Evolves Clebsch wave functions on particle flow maps via gauge transformation. Strong vorticity preservation even at coarse resolutions (32–64 grid).
- **Fluid Simulation on Compressible Flow Maps (EDGE method)** (Chen, Li et al., SIGGRAPH 2025). Epsilon-Difference Gradient Evolution for buffer-free flow maps; O(1) memory independent of flow-map length.
- **Vortex Particle Flow Maps (VPFM)** (Bo Zhu group, SIGGRAPH 2025) — incompressible flow with complex vortical evolution under dynamic solid boundaries.
- **Cirrus: Adaptive Hybrid Particle-Grid Flow Maps on GPU** (SIGGRAPH 2025).
- **Leapfrog Flow Maps for Real-Time Fluid Simulation** (SIGGRAPH 2025).
- **An Adjoint Method for Differentiable Fluid Simulation on Flow Maps** (Li, He et al., SIGGRAPH Asia 2025).
- **Solid-Fluid Interaction on Particle Flow Maps** (Chen, Li et al., ACM TOG 2024).
- **Lagrangian Covector Fluid with Free Surface** (Li et al., SIGGRAPH 2024).

**Frontier variants — Gaussian fluids:**
- **Gaussian Fluids: A Grid-Free Fluid Solver based on Gaussian Spatial Representation** (Xing et al., SIGGRAPH 2025, Peking University).

**Frontier variants — sparse adaptive structures:**
- **Quadtree Tall Cells for Eulerian Liquid Simulation** (Narita et al., SIGGRAPH 2025).
- **A Stack-Free Parallel h-Adaptation Algorithm for Dynamically Balanced Trees on GPUs** (Ren et al., SIGGRAPH Asia 2025 / TOG, Institute of Software CAS).
- **NanoVDB-backed Stam/Fedkiw** — drop-in replacement of dense buffers with NanoVDB.

**Frontier variants — interface tracking:**
- **A Neural Particle Level Set Method for Dynamic Interface Tracking** (Chen, Zhou, Zhu, SIGGRAPH 2025).
- **A Level Set Method on Particle Flow Maps** (He, Zhang, Li, Zhou, Chen, Zhu — in submission to JCP).

**Frontier variants — neural rendering:**
- **3DGS-coupled smoke** — exports volumetric output as Gaussian splats with physics-informed deformation gradients.

## 5.7 Lattice methods — LBM family

Lattice Boltzmann.

**Reference sim:** **lattice-boltzmann-d3q19** — Stack C (Vulkan), D3Q19 BGK around NACA airfoil. Vendored against Krüger et al. 2017 book companion code (D2Q9 only); D3Q19 lattice constants derived in `tools/testkit/golden/derivations/d3q19.md`.

**Verification posture:** MMS for code verification (manufactured solutions for incompressible Navier-Stokes via LBM); GCI for solution verification.

**Frontier variants:**
- **Moment-encoded 16-bit LBM** (Chen, Li, Levin, Wu, 2025) — 1000×400×400 with 16-bit quantization, 25% memory reduction, 4.3× speedup, single-GPU.
- **OpenLB-scale LBM** (Kummerländer et al., June 2025) — turbulent flows scaled to 18 billion cells on 128 GPU nodes; OpenLB is fully differentiable.
- **D3Q27 MRT** — multiple relaxation time variants for non-Newtonian fluids.
- **GPU-native AMR LBM** (Jaber, Essel, Sullivan, February 2025, *Computer Physics Communications*).
- **NanoVDB-backed LBM** — sparse representation for large empty regions.
- **Differentiable LBM** — via OpenLB integration or Warp port.

## 5.8 Rigid-body dynamics

Articulated bodies, contact mechanics, locomotion, manipulation.

**Reference sim:** **rigid-body-pedagogical** — Stack E (Warp), implementing maximal-coordinate articulated-body dynamics from scratch. Featherstone 2008 reference. Demonstrates what physics engines do under the hood.

**Frontier variants:**
- **Newton-backed sim** — drives NVIDIA Newton 1.0 from Python for a sim-to-real demonstration. Newton solvers: MuJoCo-Warp (locomotion), Kamino (contact-rich manipulation), Vertex Block Descent (deformables), SDF collision, hydroelastic contact.
- **Differentiable rigid-body** — Warp autodiff for system identification, control optimization. References: DiffSim (Werling et al. 2021), DiSECt (Heiden et al. 2021), Accelerated Policy Learning (Xu et al. 2022).
- **Isaac Lab integration** — Stack E sim driving Isaac Lab for robot learning, with explicit reproducibility/determinism per Isaac Lab's documented practices (seed via `isaaclab.envs.ManagerBasedEnvCfg.seed`).

## 5.9 Soft-body, cloth, elastodynamics

Adjacent to rigid-body; deformable mechanics.

**Reference sim:** **mass-spring-cloth** — Stack C or E, XPBD-based cloth solver.

**Frontier variants:**
- **JGS2: Near Second-order Converging Jacobi/Gauss-Seidel for GPU Elastodynamics** (SIGGRAPH 2025).
- **MGPBD: Multigrid Accelerated Global XPBD Solver** (SIGGRAPH 2025).
- **Elastic Locomotion with Mixed Second-order Differentiation** (SIGGRAPH 2025).
- **Newton VBD (Vertex Block Descent)** — Newton 1.0's deformable solver, available via Stack E.
- **Differentiable cloth** — for inverse design, garment fitting.

## 5.10 Lattice spin systems and quantum-adjacent

**Reference sim:** **ising-classical** — Stack B (WebGPU). Metropolis or Swendsen-Wang sweep on a 2D Ising lattice. Verifies via critical-temperature reproduction.

**Frontier:**
- **ising-dwave** — same Ising model but with D-Wave annealer as the solver, Stack B visualization layer. Different machine class; the GPU portion is small-state.

## 5.11 Neural-rendered physics

3D Gaussian Splatting coupled with physics simulation. Defining 2024–2026 research thread for neural rendering + physics.

**Reference sims:**
- **3dgs-viewer** — Stack E, viewer-only 3DGS pipeline as a foundation.
- **3dgs-mpm** — PhysGaussian-style coupling (Xie et al. 2024).
- **3dgs-sph** — Gaussian Splashing–style coupling (Liu et al. 2024).
- **3dgs-smoke** — 3DGS-coupled rendering of volumetric Stam/Fedkiw output.

**Frontier variants:**
- **PhysGaussian** (Xie, Zong, Qiu et al., CVPR 2024) — first major MPM-3DGS integration.
- **Gaussian Splashing** (Liu et al. 2024) — PBD + 3DGS for dynamic fluid synthesis.
- **GASP** (Waczyńska et al. 2024; *CVIU* 2026) — converts flat Gaussians to triangles for simulation; mesh-free.
- **PhysSplat** (2025) — MLLM-guided physics simulation for 3D scenes.
- **PIDG (Physics-Informed Deformable Gaussian Splatting)** (Xiao et al., June 2025) — physics-guided dynamic scene reconstruction; eliminates region drifting, penetration, needle/hole artifacts.
- **i-PhysGaussian** (Feb 2026) — implicit MPM with Newton-GMRES; robust to large time steps; open-sourced Python implementation.
- **GaussianFluent** (Jan 2026) — dynamic scenes with mixed materials.
- **MILo: Mesh-In-the-Loop Gaussian Splatting** (Anttwo et al., SIGGRAPH Asia 2025 / TOG) — differentiable mesh extraction during 3DGS optimization.
- **PhysTalk** (December 2025) — LLM-driven 3DGS scene physics.
- **PhysDreamer** (Zhang et al., ECCV 2024) — physics-based interaction with 3D objects via video generation.
- **Embodied Gaussian Splatting** (Abou-Chakra et al.) — couples Gaussians to physics-simulated particles for robotics.

**Shared infrastructure:** `common/common-3dgs/` — training pipeline, splatting kernels, viewer, coupling primitives (particle ↔ Gaussian, deformation gradient propagation onto Gaussians, opacity/SH update from physics state).

**Verification posture:** Render-similarity gates rather than numerical golden values. PSNR, SSIM, LPIPS, MS-SSIM against published reference renders. Where the underlying physics has its own verification (MPM, SPH), that verification still runs; the 3DGS coupling is verified additionally.

## 5.12 Learned dynamics

Sims whose dynamics are themselves learned from data. Distinct from "differentiable variant of a classical sim."

**Reference sims:**
- **neural-ca** (cross-referenced from §5.2.3 — Mordvintsev 2020 NCA is the seed).
- **gns-particle** — Graph Network Simulator (Sanchez-Gonzalez et al. 2020). PyTorch + Stack E.
- **pinn-poisson** — Physics-Informed Neural Network solving 2D Poisson, evaluated against classical FD reference. PyTorch.
- **learned-closure-les** — neural sub-grid closure for turbulent LES, evaluated against classical DNS.

**Frontier:**
- **Differentiable Physics-Neural Models for non-Markovian Closures** (Xue et al., November 2025).
- **PhysicsNeMo integration** — NVIDIA's AI-physics framework for neural surrogates and PINNs.
- **Foundation models for physics** — generalizing across geometries and operating conditions (mentioned as a focus in Warp/CAE direction).

**Verification posture:** Classical-reference comparison. Learned dynamics is validated against the classical sim it was trained from, on held-out test cases. Convergence-with-training-data is its own evaluation axis.

## 5.13 Coverage matrix

| Category | Reference stack | Frontier variant axes |
|---|---|---|
| Closed-form | A→B | Limited |
| Reaction-diffusion | A→B, C | Diff |
| Lenia | D | Particle, Flow, Diff |
| Neural CA | D + B | DiffLogic, Universal, ARC-AGI, Petri Dish |
| Agent-based | B | Scalability |
| SPH | C | Diff, sparse, 3DGS, flow-map |
| MPM | D | Diff, sparse, 3DGS, Warp port |
| Volumetric grid | C | Flow-map family (~6 variants), Gaussian fluids, quadtree, neural level set, NanoVDB, 3DGS |
| LBM | C | Moment-encoded, OpenLB, AMR, NanoVDB, differentiable |
| Rigid-body | E | Newton-backed, Diff, Isaac Lab |
| Soft-body | C or E | JGS2, MGPBD, Newton VBD, Diff |
| Quantum-Ising | B | D-Wave variant |
| Neural-rendered | E | PhysGaussian → i-PhysGaussian, GASP, PhysSplat, PIDG, MILo, PhysTalk |
| Learned dynamics | D + E | GNS, PINN, learned closures, foundation models |

Twelve categories, ~15 reference sims, ~50 frontier variants.

---

# Part VI — Cross-cutting axes

## 6.1 Differentiability

**State of practice (May 2026):** Differentiable simulation is a baseline expectation for new research-grade work. Production tooling supports it natively:

- **NVIDIA Warp** — built-in autodiff; reverse-mode (adjoint) kernel generation; PyTorch/JAX zero-copy interop; used in Autodesk's differentiable CFD solver, Google DeepMind multibody dynamics, C-Infinity spatial reasoning.
- **Taichi (DiffTaichi)** — `ti.ad.Tape` for reverse-mode autodiff over kernels.
- **JAX-MD / Brax** — JAX-native differentiable physics, MD-focused (JAX-MD) and rigid-body-focused (Brax). Both established as the JAX ecosystem's contribution.
- **Newton** — differentiable physics through simulation steps; gradient propagation for control parameters.
- **PhiFlow** — differentiable fluid simulation, TensorFlow/PyTorch backend.
- **OpenLB differentiable mode** — LBM with differentiability built in.

**Portfolio posture:**

- Every Layer 4 reference sim has, at minimum, a forward-mode inference pass.
- Every category with a published differentiable variant gets a Layer 6 differentiable sibling.
- Differentiable variants exercise a *concrete inverse problem* — parameter ID, initial-state recovery, or control. A "gradients exist" demo without an inverse problem is not a differentiable sim; it's a forward sim with overhead.

**Per-stack infrastructure:**

- Stack D — Taichi `ti.ad.Tape`. Kernel-level, well-tested.
- Stack E — Warp's `wp.Tape`, with PyTorch/JAX zero-copy interop.
- Stack C — hand-rolled adjoint or migration to Stack E for the differentiable variant. The portfolio does not implement custom autodiff in Vulkan.
- Stack B — not a primary differentiability stack; differentiable sims trained elsewhere are deployed here for inference.

**Verification:** Differentiable sims add gradient-correctness checks — finite-difference vs. autodiff for known test points. The testkit capture format extends to record gradients alongside primal state.

## 6.2 Sparsity / adaptive structures

**State of practice (May 2026):**

- **NanoVDB** — Museth's GPU-friendly portable VDB. Adopted by Arnold, Blender, Houdini, Omniverse. Portable to CUDA, OpenCL, OpenGL, WebGL, DX12, OptiX, HLSL, GLSL.
- **NeuralVDB** — NVIDIA's hierarchical neural representation reducing OpenVDB footprint by 1–2 orders of magnitude.
- **Taichi sparse fields** — DSL-level sparsity.
- **SIGGRAPH 2025 frontier:**
  - Quadtree Tall Cells for Eulerian Liquid.
  - Stack-Free Parallel h-Adaptation Algorithm for Dynamically Balanced Trees on GPUs.
- **Hash grids** — standard for particle neighbor queries (Morton-sorted is the common implementation).

**Portfolio posture:**

- Layer 4 reference sims may use dense grids where pedagogy demands.
- Layer 6 sparse variants are required for any volumetric sim targeting >256³ effective resolution.
- NanoVDB is the canonical sparse backend (via Warp `wp.Volume`, OpenVDB on Stack C, NanoVDB Python on Stack D).

**Verification:** Sparse variants are compared against dense at low resolutions where both fit; divergence at sparsity-threshold (when active-voxel count exceeds dense capacity) is documented in the per-variant equivalence spec.

## 6.3 Neural rendering coupling

**State of practice (May 2026):**

- 3DGS + physics is the dominant 2024–2026 research thread.
- PhysGaussian → PhysSplat → PIDG → i-PhysGaussian shows three iterations of method improvement in ~18 months.
- Production ecosystem is forming: viewers, training pipelines, coupling primitives.

**Portfolio posture:**

- Layer 6 neural-rendered variants for sims with strong visual outputs (fluids, MPM, smoke).
- Dedicated `neural-rendered-physics/` category for sims natively built on 3DGS.
- Shared `common/common-3dgs/` infrastructure.

**Stack:** Stack E (Warp + Python) is the natural home. PhysGaussian and successors are Python-native; Warp provides NanoVDB and autodiff.

**Verification:** Render-similarity (PSNR, SSIM, LPIPS) against published reference renders. The underlying physics' verification still runs separately.

## 6.4 Industry tooling alignment

**State of practice (May 2026):**

- **NVIDIA Warp** — Apache 2.0, May 2025. Python GPU framework with autodiff; PyTorch/JAX/PhysicsNeMo/Omniverse integration; built-in NanoVDB, hash grids, mesh primitives.
- **NVIDIA Newton 1.0 GA** — Apache 2.0, March 17 2026 (GTC 2026). Linux Foundation. Co-developed by NVIDIA, Google DeepMind, Disney Research. Built on Warp + OpenUSD. CUDA 12 / driver 545+ required; macOS CPU-only. Six supported solvers as of 1.0 GA: `mujoco_warp`, `kamino`, `xpbd`, `featherstone`, `semi_implicit`, `vbd`. SDF collision; hydroelastic contact. Newton 2.0 follow-on flagged in release notes; portfolio's `NewtonBackend` Adapter wrapper insulates against 2.0 breaking changes.
- **OpenUSD** — Pixar / Academy Software Foundation. Production interchange for scenes, robots, environments.
- **PhysicsNeMo** — NVIDIA AI-physics framework for neural surrogates and PINNs.
- **Isaac Lab / Isaac Sim** — robot learning simulation, GPU-accelerated; documented reproducibility/determinism practices.
- **MuJoCo-Warp** — GPU-optimized MuJoCo on Warp; 252× MJX on locomotion, 475× MJX on manipulation per Newton 1.0 benchmarks.

**Portfolio posture:**

- Stack E exists to align with this tooling stack.
- Every Stack E sim ships with USD export alongside Alembic / VDB.
- Rigid-body sims demonstrate Newton integration directly.
- Learned-dynamics sims integrate with PhysicsNeMo where applicable.

**Decisions:**

- USD becomes a first-class export format alongside Alembic and OpenVDB.
- Newton is integrated as a Stack E backend, not a pseudo-stack of its own.
- The portfolio's rigid-body sims drive Newton; they do not compete with it.

## 6.5 Determinism

Determinism is harder than it looks on GPUs and is a recurring trap. Documentation from Isaac Lab acknowledges this: runtime domain randomization can introduce non-determinism through CPU-to-GPU parameter passing in lower-level APIs.

**Portfolio posture:**

- Every sim declares its determinism posture (bit-exact same-stack-same-hw / epsilon-bounded / non-deterministic-by-design).
- Atomic operation order is the most common boundary; sims using atomics disclose it.
- Subgroup operations (Vulkan, WGSL) are flagged.
- Reductions use deterministic patterns where bit-exact is claimed.

**Infrastructure:**

- Testkit determinism harness runs every sim twice.
- CI reports determinism status every commit.
- Non-determinism-by-design is acceptable, declared, and tested with EFECT-style distributional equality rather than bit-exact.

## 6.6 Cross-stack equivalence

When a sim spans stacks, outputs agree within documented tolerance. The harness consumes capture files; it does not run sims itself.

The default tolerance table is in Part II §2.6. Per-sim overrides land in `docs/sim-specs/<sim>/equivalence.md`.

Equivalence is gated in CI for sims claiming it. Sims that don't claim cross-stack equivalence don't run that gate.

---

# Part VII — Operating conventions

The discipline conventions that govern multi-agent work, spec authoring, audit-trail maintenance, and commit discipline. Each convention has a name and a source-of-banking; deviations are tracked.

## 7.1 Spec-time discipline

**Convention C — Probe API surfaces before drafting.** Pre-implementation probes that ground path-resolution rules must include verbatim probe items enumerating 3–5 representative path pairs. Worked examples in `tools/testkit/probes/template.md`.

**Convention D — Probe call sites before drafting.** Pre-implementation probes that ground behavioral changes must enumerate every module depending on the affected behavior.

**Convention K — Anchor-sketch labeling.** When a spec section constructs content from probe data plus inference (rather than from verbatim verified content on disk), the section is labeled "anchor sketch — verify at execution time" with a named likely failure mode and a verification check.

**Convention M — Re-anchor before edit.** Before modifying any file or asserting any current state, re-view or grep the live source. Prior assertions in context are stale.

**Convention #8 — Never assert specifics from memory.** Paths, line numbers, function signatures, version strings, performance figures: all grep-verified or web-fetched at moment of assertion. Applies at design-spec level, retro level, audit level.

## 7.2 Execution-time discipline

**Convention A — New-files-first decomposition.** Execution specs default to commit decomposition for any commit touching more than one previously-existing file. The new-files-only sub-commit ships first.

**Convention F — Audit-prose freshness.** Audit reports drafted at direction time and landed later by an executor verify gate-state claims against current disk immediately before commit. Discrepancies become addenda (not paraphrases) to preserve audit trail.

**Hard Rule 2 — Pause and surface.** When spec disagrees with synced state, synced state is authoritative. Stop and surface; do not silently adapt.

## 7.3 Batch coordination

**Convention G — Sweep-side protection before check-side scope expansion.** When a batch adds a check that produces broad-bucket findings, the sweep-side protection rule lands before or alongside the check registration.

**Convention I — Cross-batch scope discipline.** Sweep runs during one batch's verification that pick up findings outside scope are deferred to the responsible batch's own sweep companion.

**Convention M-addendum — Stable repo path before probe.** Design-rev artifacts land at stable repo path before any probe is dispatched against them.

## 7.4 Design taste

**Convention E — Spec-author-self-test review.** Specs that include test files have those test files reviewed by a different agent (or by the spec author after a structured pause) for own-source discipline gaps before commit.

**Convention E-addendum (Phase-plan review).** The same load-bearing risk that motivates Convention E for test files applies to phase-plan documents themselves. A phase plan is authored, locked, then dispatched against — and the operator who reviews it is the same person who wrote it. For the highest-stakes plans (Phase 2 cross-stack replication, Phase 4 frontier variants, and any future phase whose deliverables become preconditions for ≥3 downstream phases), a **phase-plan review pass** by a different Claude session is mandatory before the plan is locked.

The review session:
1. Reads the phase plan end-to-end.
2. Probes every anchor sketch in the plan against synced repo HEAD; flags those that don't resolve.
3. Reads every INFERENCE tag in the plan and assesses whether it follows from the FACTs it cites; flags weak inferences.
4. Spot-checks plan section-numbering and cross-references for consistency.
5. Reads the corresponding sections in this spec (`docs/architecture.md`) and confirms the phase plan does not contradict the spec.
6. Lands a `docs/_audits/phase-<N>/pre-dispatch-review-<UTC>.md` audit with verdict CONFIRMED / SHIFTED / REFUTED / BLOCKED.

The phase plan is not dispatched until the pre-dispatch review verdict is CONFIRMED or SHIFTED-with-acceptable-deltas. This adds roughly 1–2 hours per phase open in human-attention cost; it is cheap relative to the cost of a phase that lands on a defective plan.

**Convention H — Filter rules query properties, not literals.** Filter rules in the integrity toolkit (or elsewhere) query named properties on data structures rather than matching string literals; this generalizes across new categories without literal-match retrofitting.

**Convention #12 — SHA back-fill as separate commit, never `--amend`.** When an audit references a commit's SHA, that reference back-fills as a follow-up commit, never via `git --amend` on the original.

## 7.5 Audit-trail discipline

**FACT vs. INFERENCE tagging.** Every concrete claim in any spec, retro, or audit is tagged. FACTs are grep-verifiable; INFERENCEs cite FACTs they depend on.

**Four-state verdicts.** Audit verdicts are CONFIRMED / SHIFTED / REFUTED / DEFERRED, with compounds DISCONFIRMED-AT-HEAD and REFRAMED.

**Append-only audits.** Reports under `_audits/` are never edited. Corrections are new reports referencing the prior.

**Append-only CI enforcement.** The append-only invariant is enforced not just by convention but by a CI check at `.github/workflows/audit-append-only.yml`. On every PR (or every push, given trunk-based development), the check computes the content hash of every file under `docs/_audits/` at the prior phase tag and confirms that for each file present at the prior tag, the prior-tag content is a prefix of the HEAD content. Files may grow (append-only); they may not be edited or shortened. Net-new audit files are allowed. The check is HARD_FAIL. This converts the append-only rule from "honor system" to "mechanical."

**Ledger files vs cue files.** Audit-trail files under `docs/_audits/` partition into two semantic classes. **Ledger files** (`*.ledger.md`) are append-only: each line records a fact (block close, stage verdict, phase close) that does not change once committed. **Cue files** (no extension, or `*.cue.md`) are mutable transient state — resumption hints, `CONTINUE_FROM` markers, in-flight progress notes — that legitimately get overwritten as the work advances. The append-only CI gate enforces immutability on ledger files only; cue files are explicitly out of scope. Phase progress tracking lives in `docs/_audits/phase-<N>/ledger.md` (the append-only record) and `docs/_audits/phase-<N>/cue` (the mutable single-line continuation marker). This convention applies starting Phase 1; Phase 0's `progress.md` is a historical artifact retained verbatim, and its residual append-only-gate failure against `v0.0.0-phase-0` is documented in `docs/_audits/phase-0/spec-amendments-proposed.md`.

**Evidence-path verification.** Every audit report's front-matter `evidence_paths` field cites repo-relative paths to artifacts that substantiate the report's claims (test outputs, capture files, integrity check outputs, golden tables, CI run URLs). `tools/integrity/scripts/verify_evidence.py` reads an audit report and confirms:
1. Every cited path exists at the audit's `head_sha`.
2. Every cited path is non-empty.
3. For paths that the report attests to a hash for (e.g., failing-tests output files), the hash matches.

The script is run by the founder at each stage boundary before approving dispatch of the next stage, and by the phase-closing-audit agent before writing its CONFIRMED verdict. This converts "founder review samples evidence" from a single-point-of-failure (samples can miss things) to a mechanical pre-filter (every evidence path is checked, every hash is verified, before sampling). The founder still does a content-quality spot check on top, but the floor is mechanical.

**Cross-phase audit replay.** Phase N+1's first stage runs a `tools/integrity/scripts/replay_prior_phase.py` pass that does not trust the prior phase's landing audit text. Instead, it:
1. Checks out the phase-N tag (`v0.<N>.0-phase-<N>`).
2. Re-runs the entire prior phase's CI gates (integrity Cat 1–5; pytest -W error; cross-stack equivalence; determinism harness; performance ledger).
3. Compares the result to the verdicts asserted in the phase-N landing audit.
4. Any discrepancy is BLOCKED on Phase N+1's first stage — the operator decides whether to repair Phase N's foundation before continuing.

This is the only mechanism that detects a phase landing under a falsely CONFIRMED verdict. It costs one full CI re-run per phase open (~10–30 minutes of CI time, depending on phase) and is cheap relative to the cost of building Phase N+1 on a defective Phase N.

**Canonical front-matter schema.** Every audit / checkpoint / completion / landing report opens with the following YAML front-matter. Phase-specific body sections (gate-status tables, per-block manifests, file inventories) sit below the front-matter and may vary per phase; the front-matter is uniform so integrity Cat 1 / Cat 5 can parse audits generically across phases.

```yaml
---
date: <UTC ISO 8601, e.g., 2026-06-01T14:30:00Z>
author: <agent-or-role-name, e.g., phase4-wu-a-agent, phase1-coordinator>
phase: <integer phase number, e.g., 4 or 4.1>
artifact: <one of: block | stage | task | wu | sub-phase | phase-landing>
artifact_id: <unique within phase, e.g., block-4-vendoring, stage-2, task-7-pinn-poisson, wu-a-autodiff, web-deploy, foundation-landing>
verdict: <one of: CONFIRMED | SHIFTED | REFUTED | DEFERRED | BLOCKED | HALTED>
evidence_paths:
  - <repo-relative path>
evidence_hashes:                # NEW: sha256 of each evidence path; verified by verify_evidence.py
  - <repo-relative path>: <sha256>
head_sha: <40-char Git SHA at the time of report write>
deferred_items: []         # list of items moved to a later phase
ci_activation: []          # list of CI checks newly activated by this artifact
top_level_deps_to_merge: []  # list of staging-area deps for convergence
---
```

Compound or specialized verdicts (e.g., `SHIFTED-with-notes`, `HALTED-ON-ANCHOR-DRIFT`) are permitted in the `verdict` field; the parser splits on `-` if needed.

## 7.6 Sandbox-probe-before-assert (cross-role)

This is role-agnostic. Drafters, verifiers, executors all face the same failure mode: recall-without-verify. The discipline is: sandbox-probe before asserting/flagging/skipping, not after. Multi-architect cross-review catches misses; the underlying convention is the same.

## 7.7 Strict-mode CI configuration

Every per-stack CI workflow runs in strict mode by default: `ruff` strict, `mypy --strict`, `pytest -W error`, markdown lint with no soft-warns. Soft-warns are deliberate exceptions, documented in the strict-mode policy doc.

## 7.8 Runtime-only display surfaces

CI does not exercise GGUI windows, interactive input handling, ImGui sub-window layouts, headless render pipelines needing real GPUs. These surfaces require explicit user-driven visual-verification gates after CI-green and before "phase complete."

## 7.9 Closing-commit anchor re-check

Multi-commit phases re-check anchor validity before the closing commit ships, regardless of plausible assumption of isolation. ~5 min probe time; closes the loop on probe-before-execute discipline at the highest-stakes moment.

## 7.10 Rule-of-three for promotion

A pattern that appears in one sim is local. A pattern that appears in two is a sibling. A pattern that appears in three is a candidate for promotion to a common module. Promotion happens at consumer #3, not earlier (avoids premature abstraction) and not later (avoids deferred-extraction debt).

## 7.11 Naming across five dimensions

The portfolio uses five orthogonal naming dimensions, each picked deliberately to satisfy PEP 503 / 508 / 625 (Python distribution / identifier rules), PEP 8 (Python identifiers), and project consistency. The picks are uniform across every phase plan and every common module.

| Dimension | Convention | Example |
|---|---|---|
| Repository / GitHub | Pascal-Kebab | `Bit-Physics` |
| PyPI distribution | Kebab, lowercase | `bit-physics-<category>-<sim>`, `bit-physics-common-warp` |
| Python import | snake_case (lowercased + underscores; PEP 625 maps from PyPI hyphens) | `integrity`, `diagnostics`, the six testkit modules (`capture`, `code_verification`, `determinism`, `equivalence`, `golden`, `property`), `common_py`, `common_warp`, `common_3dgs` |
| C++ namespace | snake_case (mirrors Python) | `bit_physics::nanovdb`, `bit_physics::common_cpp` |
| Common-module directory | Kebab (filesystem-level; not import-path components) | `common/common-cpp/`, `common/common-warp/`, `common/common-3dgs/` |

Three principles drive these choices:

1. **PyPI names follow PEP 503 normalization** (lowercase + hyphens). PEP 625 maps PyPI hyphens to underscores in the source distribution filename, which aligns with Python's identifier rules (PEP 8) so imports use underscores.
2. **C++ namespaces mirror Python imports** for symmetry. A reader who sees `common_warp` Python knows the C++ side is `bit_physics::common_cpp`.
3. **Common-module directories use kebab-case** because they sit at the filesystem level and are not Python import-path components. The Python package they install provides the underscored import name via its `pyproject.toml`.

Testkit subdirectories below `tools/testkit/` use underscores (e.g., `code_verification/`, `solution_verification/`, `render_similarity/`) because they ARE Python import-path components — the testkit wheel ships them as bare top-level modules, so the actual import path is `code_verification.gradient.harness` (not `tools.testkit.code_verification.gradient.harness`; the `tools/testkit/` filesystem prefix is not part of the Python import path).

## 7.12 Trunk-based development

The portfolio uses trunk-based development for all phases. Each work unit (block, stage, task, WU, sub-phase) commits directly to `main`. Phase boundaries are tags (`v0.0.0-phase-0`, `v0.1.0-phase-1`, etc.). No long-lived feature branches, no protected branches, no PR-based merge ceremony.

Three reasons:

1. **Solo-developer + AI-agent execution** has no concurrent work to isolate; no merge conflicts to resolve.
2. **DORA State of DevOps research** consistently associates trunk-based development with high-performing teams, even at much larger scale.
3. **Owner review** happens between work-units (coordinator pauses; owner reviews report; says "go"); this is mechanically equivalent to PR review for a single contributor but removes the GitHub UI step.

For human review of AI agent work, the convention is **defensive review for the first deployment of a pattern; acceptance review after rule-of-three**. Defensive review spot-checks 1–2 commits' diffs against report FACT claims and re-runs one gate locally (~15–20 min per work-unit). Acceptance review reads the report front-matter and verifies CI green (~2 min per work-unit). Phases switch from defensive to acceptance after a pattern has been validated three times.

### Operator-only phase-tag pushing

Phase tags (`v0.<N>.0-phase-<N>`) are **never** pushed by an agent. The closing-audit agent prepares everything necessary to tag — runs full verification, writes the landing audit, confirms all gates green — but the tag itself is the operator's act after independent review of the landing audit. Concretely:

1. The closing-audit agent commits the landing audit to `docs/_audits/phase-<N>/landing-<UTC>.md`.
2. The agent's final report to the coordinator includes the proposed tag name and the commit SHA to tag.
3. The agent ends the session WITHOUT pushing the tag.
4. The operator reads the landing audit, runs `verify_evidence.py` against it, optionally runs the next phase's `replay_prior_phase.py` as a pre-check, and pushes the tag manually: `git tag <name> <sha> && git push origin <name>`.

A tag pushed by an agent (verifiable from the committer identity on the tag object) is rejected by branch-protection rules as a HARD_FAIL. The agent's identity is `claude-code-<role>@bit-physics.local`; tag-pushing requires the operator's GPG-signed identity. The mechanical separation is what prevents a fabricated phase from ever earning a tag.

### Server-side git hooks (mechanical enforcement)

The forbidden actions in Appendix D § D.8 are convention, not git mechanics, by default. A determined or misbehaving agent could violate them; only post-hoc detection would catch it. To mechanically prevent the highest-stakes violations, the repo configures server-side hooks (via GitHub branch protection rules or equivalent):

1. **No force-push to `main`.** `git push --force` and `git push --force-with-lease` to `main` are rejected.
2. **No history rewrite.** Pushes that change the SHA of any commit already present on `main` are rejected. This blocks `git --amend` followed by `git push` for any post-publication commit.
3. **No feature branches pushed to remote.** Any push to a branch other than `main` is rejected. Long-lived working branches are local only.
4. **Tag pushing gated by signer identity.** Phase tags (`v*-phase-*`) accept pushes only from the operator's GPG-signed identity, per the operator-only tag-pushing rule above.
5. **Audit-file modification blocked.** A pre-receive hook (or `audit-append-only.yml` CI check, whichever the platform supports) verifies that every file under `docs/_audits/` already present on `main` has only grown, not shrunk or been edited (per § 7.5 append-only CI enforcement).

These are not new requirements — every prohibition above is already in Appendix D § D.8 — but they convert convention into mechanism. Phase 0 Block 1 lands the configuration; subsequent phases inherit it.

## 7.13 Sequential single-agent execution

All phase plans use sequential single-agent execution. Each phase dispatches one claude.ai coordinator chat plus one Claude Code agent role running auto-accept; the agent reads the whole phase plan, works through stages 1 → N in order, commits directly to `main`, reports at each stage close, and the coordinator dispatches continuation sessions only on context-fill.

This convention emerged independently across all six phase plans (Phase 0 nine blocks, Phase 1 three stages, Phase 2 ten stages, Phase 3 eleven tasks, Phase 4 thirty-five stages, Phase 5 five sub-phases). It is banked here as a program-level principle so future phases (6+) inherit it without re-deriving.

**Auto-accept and the agent-grades-own-homework risk.** Auto-accept means the agent runs shell commands without interactive confirmation. The mitigation is *not* "trust the agent's self-report"; it is the mechanical floor laid out across § 1.3 (failing-tests output hash), § 7.5 (evidence-path verification + cross-phase audit replay), and § 7.12 (operator-only tag pushing + server-side hooks). The agent's self-report is one input; the verification scripts are the floor. The operator's review reads both and reconciles.

Wall-clock under this model is bounded by:
1. Stage count × per-stage agent latency.
2. External-dependency resolution time (pip installs, vendor fetches, paper retrievals).
3. Continuation-session overhead (one re-anchor per context fill).

It is NOT bounded by calendar weeks or months. See § 11.0 for the universal pacing framing.

## 7.14 Convention naming canon

The full convention catalog lives in **Appendix G** of this document. Part VII (this part) summarizes convention discipline at a high level; the canonical definitions, including alternative-naming forms (e.g., Convention-A vs. Convention #1, Convention M vs. re-anchor-before-edit), live in Appendix G. When a phase plan references a convention, it resolves to the entry in Appendix G.

Appendix B remains as a brief alphabetical convention quick-lookup table; Appendix G is the full text.

## 7.15 Shared invariants

The single source of truth for cross-phase contracts (naming, schema versions, vendored SHAs, capture descriptors, hardware floors, thirteen-gate Layer-4 acceptance criteria, Tier 2 substack assignments) lives in **Appendix D** of this document. Phase plans reference Appendix D by section number; they do not redefine its content.

Extensions to Appendix D are append-only: each phase's landing audit may add rows to existing tables for artifacts that phase shipped, but MUST NOT modify rows for prior-phase artifacts.

When a phase plan and Appendix D disagree, Appendix D is authoritative (analogue of Hard-Rule-2 applied to plan-vs-invariants disagreements).

## 7.16 Agent playbook

The agent's decision tree for handling friction (Pattern A through Pattern O) lives in **Appendix E** of this document. Every Claude Code agent dispatched on a phase reads Appendix E once at session start. The playbook reduces the agent's decision space: covered patterns get the playbook's response; uncovered patterns get BLOCKED.

---

# Part VIII — Documentation, pedagogy, audit trail

## 8.1 Documentation hierarchy

```
docs/
├── architecture.md                # This spec, current revision. Includes Appendices D (shared invariants), E (agent playbook), F (dispatch operations), G (convention catalog full text).
├── glossary.md                    # Definitions (mirrors Appendix C of this spec)
├── dependencies.md                # External dependency pins; consolidated at phase landings
├── common/                        # Per-stack common-module API docs
│   ├── glsl.md
│   ├── ts.md
│   ├── cpp.md
│   ├── py.md
│   ├── warp.md
│   └── rs.md
├── sim-specs/                     # Per-sim specs
│   └── <category>/
│       └── <sim-name>/
│           ├── README.md          # One-page overview
│           ├── spec-ref.md
│           ├── spec-diff.md
│           ├── spec-sparse.md
│           ├── spec-neural.md
│           ├── spec-frontier.md
│           ├── equivalence.md
│           ├── determinism.md
│           ├── algebraic.md
│           └── notes.md
├── diagnostics/                   # Diagnostic toolchain specs
│   ├── overview.md
│   ├── tier1-universal.md
│   ├── tier2-particle.md
│   ├── tier2-scalar-field.md
│   ├── tier2-vector-field.md
│   └── tier2-closed-form.md
├── integrity/
│   ├── overview.md
│   ├── cat1-citations.md
│   ├── cat2-contracts.md
│   ├── cat3-numerical.md
│   ├── cat4-draft-time.md
│   └── cat5-provenance.md
├── testkit/
│   ├── overview.md
│   ├── capture-format.md
│   ├── mms.md
│   ├── golden-values.md
│   ├── solution-verification.md
│   ├── determinism.md
│   ├── equivalence.md
│   └── references.md
├── _audits/                       # Phase-audit landing (all phases)
│   ├── phase-0/                   # block retros + phase-0 landing
│   ├── phase-1/                   # stage checkpoints + landing
│   ├── phase-2/                   # per-stage reports + landing
│   ├── phase-3/                   # per-task reports + landing
│   ├── phase-4/                   # per-WU completion + foundation-landing
│   ├── phase-5/                   # per-sub-phase completion
│   └── phase-N/                   # convention extends to all phases
├── renders/                       # Hero shots and short videos
└── stack-decisions/               # Per-stack rationale
```

**Audit-file path convention.** All phase-bound audit, checkpoint, completion, and landing artifacts land at `docs/_audits/phase-<N>/<artifact-name>-<UTC>.md`. Subcategory names use simple kebab-case (`landing`, `checkpoint`, `block-4-vendoring`, `wu-a-autodiff`, `web-deploy`, `task-7-pinn-poisson`). The `<UTC>` suffix is ISO 8601 like `2026-06-01T14-30-00Z` (colons replaced with hyphens for filesystem safety).

This convention supersedes the per-phase ad-hoc paths used in earlier plan drafts (e.g., `docs/retro/phase-0/`, `docs/diagnostics/_audits/phase-5-*`). Integrity Cat 1 / Cat 5 can scan all phase audits by walking `docs/_audits/`.

## 8.2 Per-sim spec template

Every sim's `spec-ref.md` follows the same structure:

```markdown
# <Sim Name> — Reference Spec

## 1. Scope
What this sim simulates, its category, its non-goals.

## 2. Upstream and reference anchor
Vendored upstream(s), SHA(s), algebraic derivation pointer.

## 3. Algorithm
High-level description of the numerical method.

## 4. Algebraic form
Equations in LaTeX, with citations to upstream line numbers.

## 5. Implementation
File layout, dispatch order, data structures.

## 6. Verification posture
Code verification (MMS / golden), solution verification (GCI),
model validation, calculation validation — declared per Roy 2005.

## 7. Golden values / Manufactured solutions
Pointer to testkit fixtures.

## 8. Determinism
Declared posture; reference to `determinism.md`.

## 9. Equivalence
Cross-variant and cross-stack tolerance.

## 10. Diagnostics
Which Tier 1 / Tier 2 / Tier 3 modules apply.

## 11. Build and run
Build commands, run flags, capture output.

## 12. References
Full bibliography.

## 13. Productization status
Per-stream opt-out flags consumed by Phase 5. Each subkey is a boolean defaulting to `true`. Set `false` to opt a sim out of a given productization stream. Phase 5 sub-phases skip any sim with the corresponding flag set to `false`.

```yaml
productization:
  web: true      # 5.1 — sim qualifies for web-deploy if Stack B and renders cleanly headless
  binary: true   # 5.2 — sim qualifies for binary-release if Stack C with installable CMake target
  pypi: true     # 5.3 — sim qualifies for pypi-release if Stack D or E with installable pyproject.toml
  render: true   # 5.4 — sim qualifies for render-passes canonical selection (one chosen per Phase 5; § 4.8 criteria)
  preprint: true # 5.5 — sim qualifies for preprint-extraction canonical selection (one chosen per Phase 5; § 4.9 criteria)
```

The flag set is closed; Phase 5 reads only these five keys. Bespoke per-sim productization needs (3DGS viewer apps, neural-weights distribution, gradient export) are documented as INFERENCE notes inside this section and addressed post-Phase-5 per spec § 11.6.
```

The template is itself versioned. Breaking changes require a migration tool.

## 8.3 Pedagogy posture

Every sim is readable by someone who knows the domain but not the codebase. Concretely:

- Algorithm description before code in every spec.
- Algebraic derivation document for every category-defining equation.
- Vendored upstream is browsable in the repo; readers can grep the source without leaving the project.
- Visual hero shots for every sim, linked from the README.
- Inline citations to upstream line numbers where the algorithm is implemented.

The pedagogical surface is audited under Cat 5 (provenance) — every claim traces back to source.

## 8.4 Audit-trail discipline at scale

The conventions in Part VII §7.5 are not local to retros — they apply to every artifact the portfolio produces:

- Spec sheets carry FACT/INFERENCE tags on their concrete claims.
- Audit reports are append-only with required front-matter.
- Cross-references between audits use stable paths and SHAs, not paraphrases.
- A retro that asserts a claim without traceable provenance fails Cat 5.

---

# Part IX — Build, dev environment, multi-agent orchestration

## 9.1 Build systems per stack

- **Stack A (GLSL):** none, or Vite for the host page.
- **Stack B (WebGPU/TS):** Vite + esbuild + TypeScript; pnpm workspaces; per-sim package under `packages/<sim>`.
- **Stack C (C++/Vulkan):** CMake with Ninja; FetchContent for first-party deps; system packages for OpenVDB / Alembic / Imath; optional Conan or vcpkg.
- **Stack D (Python/Taichi):** `uv` for deps; `pyproject.toml` per sim; PyPI publish for product layer.
- **Stack E (Python/Warp):** as Stack D; different runtime deps (CUDA Toolkit not required locally; Warp installs JIT).
- **Stack F (Rust/wgpu):** Cargo workspaces.
- **Stack G (Mojo):** Modular toolchain (when adopted).

Top-level `justfile` orchestrates cross-stack commands (`just test`, `just build-all`, `just lint`).

## 9.2 Dependency management policy

- **Vendored** when reproducibility is load-bearing for citation (upstreams cited by sims).
- **Pinned-version** when stability matters but citation doesn't (Warp, Taichi, OpenVDB, primary frameworks).
- **Floating-version** for tools and dev infrastructure.
- **System dependency** for hardware-coupled items (CUDA driver, Vulkan loader, glslang).

Every dependency is documented in `docs/dependencies.md` with rationale. New dependencies require a Cat 5 (provenance) entry explaining the choice over alternatives.

## 9.3 CI / CD

Per-stack workflows plus cross-stack:

- **Per-stack tests.** Each stack runs its own sim builds and tests.
- **Integrity gate.** Cat 1–5 against entire repo, every push.
- **Determinism gate.** Testkit determinism harness against every sim claiming determinism.
- **Equivalence gate.** Cross-stack equivalence for sims claiming it.
- **Code verification gate.** MMS reports for PDE sims; golden-value verification for closed-form algorithms.
- **Solution verification gate.** GCI reports (on demand, not every commit).
- **Documentation gate.** Cat 1 (citations) + Cat 5 (provenance) across all docs.

Workflows are independent — a Stack B-only change cannot break Stack C gates. Path filtering applies for stack workflows; integrity gate runs always.

**Strict-mode default** (Convention 7.7). Soft-warns are exceptions.

## 9.4 Multi-agent orchestration

**Roles:**

- **Coordinator.** Directs agents, integrates outputs, maintains the landing ledger.
- **Repo-architect.** Cross-cutting infrastructure: testkit, integrity, diagnostics, common modules.
- **Category-architect.** Per-category polish: reviewing per-sim specs within one category, defining category-shared infrastructure.
- **Per-sim implementer.** Builds one sim end-to-end against its committed test suite.
- **Reviewer-architect.** Cross-reviews phase specs before execution; catches drift between draft and synced state.
- **Auditor.** Maintains the audit trail; verifies provenance.

**Parallel-work contract:**

- Each agent receives the current spec section it owns.
- Each agent receives its parallel-touch set (files it may edit) and convergence-touch set (files it must coordinate on).
- Each agent receives the pre-implementation probe report relevant to its scope.
- Spec changes serialize: only one agent at a time edits a spec section.
- Audit reports are append-only; every agent emits one on completion.

**Convergence gates** fire wherever multiple agents' work overlaps. The coordinator merges in dependency order.

**Failure-mode taxonomy** (banked):

- Category 1 — Anchor drift: wrong paths, wrong line numbers, stale anchors.
- Category 2 — API drift: spec calls methods that don't exist or have wrong signatures.
- Category 3 — Schema drift: state.json field names inconsistent across phases.
- Category 4 — Shader correctness: sign/orientation bugs, dimensional inconsistencies.
- Category 5 — Convention-#8 fabrication: confident assertion from memory.
- Category 6 — Test-design fabrication: tests don't exercise what they claim.
- Category 7 — Spec self-consistency: downstream sections drift from upstream within one spec.
- Category 8 — CI surface drift: workflow file anchors stale.
- Category 9 — Root-surface drift: README / CHANGELOG / project-state not in modified-files list.

Each category has a named mitigation in the convention catalog.

## 9.5 Multi-architect cross-review

For high-stakes specs (new sims, common-module changes, first-of-pattern work), an architect-2 review pass happens before the spec routes to a per-sim implementer. The review is structured:

- Architect-2 independently reads the actual common-* source the spec touches (no paraphrase trust).
- Architect-2 reports blocking issues, minor flagged items, and approved items.
- Architect-1 revises; architect-2 does a second pass on rewritten sections.

This is operational discipline; some specs go through it, some don't. The decision is per-spec stakes, not always-on.

## 9.6 Pre-flight scripts

Every phase has a pre-flight script at `tools/dispatch/preflight-phase-<N>.py`. The agent's Action #1 in any phase session is to run the relevant preflight:

```bash
python tools/dispatch/preflight-phase-<N>.py
```

Exit 0 → all preconditions met; agent proceeds with phase work. Exit 1 → at least one precondition failed; agent writes BLOCKED report containing the script's output and ends the session.

**Universal checks** in every preflight:

1. Prior-phase tag exists (`v0.<N-1>.0-phase-<N-1>`); skipped for Phase 0.
2. Every path required by this phase's preconditions exists.
3. `python -m integrity --all` exits 0 (skipped for Phase 0).
4. Per-workspace-member `uv run --directory <member> pytest -W error` exits 0 for each of `tools/testkit`, `tools/integrity`, `tools/diagnostics`, `packages/reaction-diffusion-2d` (skipped for Phase 0). Mirrors the Phase 0 landing audit's evidence pattern.
5. Required capture descriptors per Appendix D § D.2.3 are present.
6. External dependencies probed (no actual install).
7. Phase-specific gates (e.g., Phase 4: CUDA detection, frontier-paper vendoring).

**Script source.** The preflight script content is embedded in `phase-0-plan.md` § 7.1 as a code block (Block 1 deliverable). Phase 0 Block 1 commits the script verbatim from the embedded source; subsequent phases consume it as a committed tool.

The preflight script converts the prose preconditions in each phase plan into mechanical verification. An agent that runs preflight and gets exit 0 has verified preconditions without subjective interpretation; an agent that gets exit 1 has a precise BLOCKED reason rather than a guessing-game.

---

# Part X — Shipping and distribution

## 10.1 Web demos

Stack B sims deploy to `https://bit-physics.<domain>/` with per-sim subpaths. Each demo:

- Loads in <2s on modern desktop browser.
- Works on Chrome, Safari, Firefox (within WebGPU availability per current state).
- Settings panel for tier, seed, capture-to-disk.
- "View source" link to GitHub.
- "Spec sheet" link to `docs/sim-specs/<category>/<sim>/README.md`.
- Capture export round-trip: a captured file can be loaded into the testkit's local determinism harness.

## 10.2 Standalone binaries

Stack C sims build via GitHub Actions matrix:

- Linux: AppImage or static binary.
- Windows: zipped binary with required DLLs.
- macOS: signed `.app` bundle (if certs available) or unsigned.

Released under GitHub Releases with versioned tags matching repo semver.

## 10.3 Python packages

Stack D and E sims publish to PyPI as `bit-physics-<category>-<sim>` (per the repo name `Bit-Physics`). Versioning matches the repo.

Installation:

```bash
pip install bit-physics-mpm-multimaterial
bit-physics-mpm --tier desktop --seed 42 --steps 1000 --capture out.h5
```

## 10.4 Offline renders

Per-sim hero shots and short videos via:

- **Blender Cycles** — free, default. Python-scripted, Alembic + VDB import.
- **Houdini Karma** — optional ($269/year Indie license), for cinematic quality where it matters per-sim. Karma + Houdini's procedural pipeline outperforms Blender for VFX-style fluid renders.

Renders live in `docs/renders/<sim>/` and are linked from the sim's README.

## 10.5 Academic preprints

Each sim's spec sheet is drop-in extractable as an arXiv preprint:

- Sections 1 (Scope), 3 (Algorithm), 4 (Algebraic form), 6 (Verification posture), 12 (References) map directly to a paper's introduction, method, math, evaluation, references.
- Reference vendoring discipline makes citation verification trivial.
- Cross-stack equivalence data is a built-in evaluation result.
- MMS reports are a credible code-verification claim.

For frontier variants in particular, the spec → preprint path is real. A 3DGS-MPM coupling sim with full equivalence data, MMS verification, and pedagogical clarity could be a workshop paper or arXiv preprint without rewriting the spec.

---

# Part XI — Phased roadmap

## 11.0 Pacing under single-agent AI dispatch

This is the universal pacing framing for all phases. Earlier "estimated duration" lines in the per-phase sections below (weeks, months, years) are residue from a prior parallel-multi-agent dispatch model and are superseded by this section.

**Wall-clock under the current dispatch model:** Each phase is one claude.ai coordinator chat plus one Claude Code agent role on auto-accept, working through stages sequentially. The phase completes when the closing-audit verdict lands; this is bounded by:

1. **Stage count × per-stage agent latency.** A stage that involves drafting + 5–20 file edits + test runs + commit completes in tens of minutes of agent execution. A stage that includes extensive web-fetches or non-trivial debugging runs longer.
2. **External-dependency resolution time.** Pip installs, GitHub clones (for vendored deps), Blender renders, large CI runs add wall-clock independent of agent work. Most are minutes; some (CUDA driver install, large vendored repos) can be tens of minutes.
3. **Context-fill continuation overhead.** Each context-fill triggers one re-anchor at session start of the next dispatch (one `git log`, one `view` of progress.md, one re-read of the relevant plan section). Each continuation adds a few minutes.
4. **Owner attention.** Owner reviews only at phase landing (CONFIRMED/SHIFTED) or on BLOCKED/HALTED surfaces. Minutes per phase under normal flow.

**Practical implication:** Phases dispatch in hours, not weeks. The whole portfolio's execution time is hours-to-days, not months-to-years. Calendar pacing depends on owner dispatch frequency, not on agent capacity.

**Phase ordering:**

| Phase | Prerequisite | Dispatched after |
|---|---|---|
| 0 | None | (initial dispatch) |
| 1 | Phase 0 CONFIRMED | Phase 0 landing |
| 2 | Phase 1 CONFIRMED | Phase 1 landing |
| 3 | Phase 2 CONFIRMED | Phase 2 landing |
| 4 | Phase 3 CONFIRMED | Phase 3 landing |
| 5 | Phase 4 partially-or-fully landed | Phase 4 landing (acceptable partial per Phase 5 § 0) |
| 6+ | Phase 5 closed | Phase 5 landing |

No phase runs in parallel with another. Sequential dispatch per spec § 7.13 applies at the inter-phase level as well as the intra-phase level.

## 11.1 Phase 0 — Foundation

Sequential. Foundation must land before later phases dispatch.

- **0.1** Repo skeleton, directory layout, top-level documentation index.
- **0.2** Convention catalog (full text in Appendix G; this file is `docs/architecture.md` post-Block-1 — no separate `conventions.md`).
- **0.3** Capture format spec, schemas, Python reference reader/writer.
- **0.4** First manufactured solution (heat equation 1D, recommended) — full pipeline: solution committed, source derivation committed, runner committed, analyzer committed.
- **0.5** First golden-value table (cubic spline kernel, recommended).
- **0.6** Determinism harness, stub-sim test passes.
- **0.7** Equivalence harness, two-stack stub diff passes.
- **0.8** Reference vendoring discipline; first upstream vendored (SPlisHSPlasH recommended).
- **0.9** Integrity toolkit Cat 1, Cat 2, Cat 3 scaffolds + first checks.
- **0.10** Cat 4 (draft-time) and Cat 5 (provenance) added.
- **0.11** Diagnostic toolchain Tier 1 + one Tier 2 substack (scalar-field recommended; first sim is RD).
- **0.12** First common-* module (`common-ts` recommended — simplest, browser-shippable).
- **0.13** First end-to-end TDD cycle: a complete reference sim (Stack B reaction-diffusion 2D, recommended) goes spec → tests → implementation → all Layer 4 gates green. This is not a stub — RD-2D is a fully verified Layer 4 reference implementation that subsequent phases consume. The "stub" language used in earlier drafts referred to RD-2D being a single sim rather than a wider sweep, not to its completeness. Phase 1 Stage 2 inherits RD-2D as a complete reference (per Phase 1 § 1.3 explicitly excludes re-bootstrapping) and adds 3D Gray-Scott + RD-2D MMS as the only RD work in that phase.

Also delivered by Phase 0 Block 1 (in addition to the above 0.1–0.13 from v2.0): `tools/dispatch/preflight-phase.py` (committed verbatim from the embedded source in `phase-0-plan.md` § 7.1.A). The spec at `docs/architecture.md` (deliverable #6 of Block 1) includes Appendices D (shared invariants), E (agent playbook), F (dispatch operations), G (convention catalog) as part of that single file — no separate top-level docs.

**Acceptance:** All 0.1–0.13 deliverables landed; RD-2D ships through all thirteen Layer 4 gates (per § 3.5 v2.4 expansion: legacy gates 1–10 + new gates 11 PBT, 12 perf-ledger row, 13 failing-tests replay); Appendix D § D.2.3 RD-2D row matches actual capture descriptor.

**Pacing:** per § 11.0.

## 11.2 Phase 1 — Reference sims, primary stacks

Parallel per category. Each category gets its Layer 4 reference sim on its primary stack.

- **1.1** Closed-form: strange-attractors, mandelbulb-explorer.
- **1.2** Continuous CA: reaction-diffusion-2d, reaction-diffusion-3d.
- **1.3** Agent-based: boids-3d, physarum.
- **1.4** Particle fluids: sph-water (Stack C, vendored SPlisHSPlasH).
- **1.5** Hybrid PG: mpm-multimaterial (Stack D, Taichi).
- **1.6** Volumetric: eulerian-smoke (Stack C).
- **1.7** Lattice: lattice-boltzmann-d3q19 (Stack C).
- **1.8** Common modules mature alongside (common-ts, common-cpp, common-py at minimum).

Each sim passes its Layer 4 thirteen-gate acceptance criteria (Part III §3.5; expanded from ten to thirteen in v2.4). Note: Phase 1 (TDD bootstrap scope) ships gates 1–3 only per § 11.7 deferral; the implementation phases that follow Phase 1 land gates 4–13.

**Pacing:** per § 11.0.

## 11.3 Phase 2 — Cross-stack replication

Parallel per sim. For sims that warrant cross-stack presence, replicate.

- **2.1** RD-2d to Stack C, Stack D.
- **2.2** SPH to Stack D (Taichi reference port).
- **2.3** MPM to Stack E (Warp port).
- **2.4** Smoke to Stack D and Stack E.
- **2.5** LBM to Stack D and Stack E.

Equivalence gates land per replication.

**Pacing:** per § 11.0.

## 11.4 Phase 3 — Reference sims, secondary categories

Continuous CA frontier reference sims; rigid-body; soft-body; first neural-rendered; first learned-dynamics; first quantum-adjacent.

- **3.1** Lenia (Stack D).
- **3.2** Neural CA (Stack D + Stack B deploy).
- **3.3** Rigid-body pedagogical implementation (Stack E, no Newton dependency).
- **3.4** Soft-body cloth (Stack C or E, XPBD).
- **3.5** First 3DGS sim: PhysGaussian-style MPM-3DGS coupling (Stack E).
- **3.6** First learned-dynamics sim: PINN solving 2D Poisson (Stack E, PyTorch).
- **3.7** Quantum-adjacent reference: ising-classical (Stack B, Metropolis-Hastings 2D Ising at the lattice spin systems entry point). Per § 5.10. The D-Wave variant (ising-dwave) is deferred to Phase 6+ pending hardware-access decision; see § 12.5.
- **3.8** common-warp matures.
- **3.9** common-3dgs introduced.

**Pacing:** per § 11.0.

## 11.5 Phase 4 — Frontier variants

The largest phase. Parallel per (category, variant) pair.

**Differentiable variants:**
- **4.1** Diff RD (Stack D).
- **4.2** Diff SPH (Stack D or E).
- **4.3** Diff MPM (Stack D, building on DiffTaichi).
- **4.4** Diff Lenia (Stack D).
- **4.5** Diff smoke / flow-map (Stack E with Warp autodiff, building on SIGGRAPH Asia 2025 adjoint flow map work).
- **4.6** Diff rigid-body (Stack E, Warp autodiff).

**Sparse variants:**
- **4.7** NanoVDB smoke (Stack C and Stack E).
- **4.8** NanoVDB MPM (Stack E).
- **4.9** Quadtree-tall-cell smoke (Stack C, SIGGRAPH 2025).
- **4.10** AMR LBM (Stack C, *Computer Physics Communications* 2025).

**Neural-rendered variants:**
- **4.11** 3DGS-MPM (Stack E, PhysGaussian).
- **4.12** 3DGS-SPH (Stack E, Gaussian Splashing).
- **4.13** 3DGS-smoke (Stack E).
- **4.14** i-PhysGaussian variant — implicit MPM + 3DGS (Stack E).

**Frontier-algorithm variants:**
- **4.15** Clebsch-PFM smoke (Stack C or E).
- **4.16** EDGE compressible flow map (Stack C or E).
- **4.17** VPFM (Stack C or E).
- **4.18** Particle Lenia (Stack D).
- **4.19** Flow Lenia (Stack D).
- **4.20** DiffLogic CA (Stack D, PyTorch).
- **4.21** Moment-encoded 16-bit LBM (Stack C).
- **4.22** Gaussian Fluids — grid-free Gaussian spatial representation (Stack C or E).

**Rigid-body Newton integration:**
- **4.23** Newton-backed manipulation sim (Stack E).
- **4.24** Newton-backed locomotion sim (Stack E, MuJoCo-Warp).
- **4.25** Isaac Lab integration demo (Stack E).

**Learned-dynamics variants:**
- **4.26** GNS particle simulator (Stack D + E).
- **4.27** Learned LES closure (Stack E + PhysicsNeMo).

**Pacing:** per § 11.0. The 27 frontier sims are dispatched as Phase 4 Stages 9–35; each stage completes when its acceptance criteria pass.

## 11.6 Phase 5 — Productization

Parallel.

- **5.1** Web deploy pipeline for every Stack B sim.
- **5.2** Binary release pipeline for every Stack C sim.
- **5.3** PyPI release pipeline for Stack D and E sims.
- **5.4** Render passes for every sim's hero shot.
- **5.5** First academic-preprint extraction.

Overlaps with Phase 4; not a serial successor.

## 11.7 Ongoing

- New SIGGRAPH frontier work as it lands (annual).
- New stacks as they mature (Stack G Mojo when Mojo open-sources).
- New categories as the research line evolves.

The architecture supports indefinite extension: new category is a new folder; new stack is a new common module; new variant is a sibling sim.

**Deferred-item ownership table.** Items deferred from one phase are accountable to a named later phase. If no phase owns an item, it lives here as "permanent backlog" with an explicit owner assignment before it can be re-activated.

| Item | First deferred by | Owner phase | Status |
|---|---|---|---|
| MMS for Gray-Scott (RD-2D) | Phase 0 Block 8 | Phase 1 Stage 2 (co-bundled with RD-3D MMS) | Owned |
| Cat 4 grammars beyond `path:line[-range]` (grammars `<phrase X in Y>`, `<API X has shape Y>`) | Phase 0 (`§ 9` Decision #22) | Phase 1 Stage 1 (extends Phase 0 Cat 4) | Owned |
| Tier 3 diagnostics for Phase 1 sims | spec § 3.3 (implied per-sim) | Per-sim implementation phases (not yet planned); backlog for Phase 1.5 charter | Backlog |
| pic-flip particle fluids | spec § 5.4 | Not yet scheduled | Backlog |
| JGS2, MGPBD, Elastic Locomotion (SIGGRAPH 2025 elastodynamics) | spec § 5.9 | Phase 4 frontier-algorithm stages (§ 8.4) | Backlog |
| ising-dwave | spec § 5.10 + § 12.5 | Phase 6+ pending hardware-access decision | Backlog |
| JAX-MD, Brax, PhiFlow integrations | spec § 6.1 | Phase 6+ charter | Backlog |
| NeuralVDB | spec § 6.2 | Phase 4 sparse stages (§ 8.2) | Backlog |
| OpenLB | spec § 5.7 | Phase 4 frontier-algorithm stages (§ 8.4) | Backlog |
| Stack G (Mojo) adoption | spec § 4.7 | Phase 6+ trigger: Mojo open-sources stably | Backlog |

## 11.8 Pacing under single-agent AI dispatch (supersedes prior pacing estimates)

Per § 11.0, wall-clock under single-agent AI dispatch is hours-to-days bounded by:

1. Stage count × agent latency per stage.
2. External-dependency resolution (vendor fetches, library installs, paper retrievals).
3. Continuation-session overhead (one re-anchor per context fill).
4. Owner attention at phase landings (CONFIRMED/SHIFTED dispatch the next phase; BLOCKED/HALTED pauses for owner decision).

The architecture front-loads verification investment so per-sim cost decreases over time. Phase 0's testkit overhead is the largest upfront cost; every Phase 1+ sim amortizes it.

**Earlier "X months / Y weeks" estimates** for individual phases (in earlier drafts of this document and the per-phase plans) presumed parallel multi-agent dispatch by a human team. Under single-agent AI dispatch they're not meaningful and are explicitly superseded by § 11.0.

---

# Part XII — Open decisions

Choices the spec does not make on the owner's behalf. Each is a load-bearing decision that affects later phases.

## 12.1 Primary stacks beyond launch

- **Stack F (Rust/wgpu) adoption.** Real benefit (cross-platform native + browser parity) at real cost (whole new common module and toolchain). Defer until a sim naturally needs it; revisit at Phase 3 boundary.
- **Stack G (Mojo) adoption.** Open-sourcing in Fall 2026. Decision: adopt when the language is open-source and stable AND a candidate sim emerges with performance-portability needs not served by D or E. Revisit annually.

## 12.2 Render pipeline

- **Houdini for hero shots.** $269/year Indie license unlocks Karma. Per-sim decision based on cinematic-quality value.
- **OpenUSD as primary or supplementary.** Add as third export path alongside Alembic and OpenVDB. Decision is whether USD is *preferred* (i.e., new sims default to USD) or *supplementary* (Alembic/VDB primary, USD additional). Recommend: USD is preferred for new Stack E sims; supplementary for retrofits.

## 12.3 Verification stringency by sim

- **Which sims claim solution verification (GCI).** Code verification (MMS or golden) is mandatory for every PDE sim. Solution verification is per-sim per-stakes. Default: research-grade sims claim solution-verified status; pedagogical-only sims may decline.
- **Calculation validation per sim.** Whether a sim is calibrated against a reference experiment is per-sim. Most won't; product-grade sims might.

## 12.4 Multi-architect cross-review scope

- **Which specs route through architect-2.** All Phase 0 specs and Phase 1 first-of-pattern specs are recommended. Beyond that, per-spec stakes.
- **Architect-2 review for retros.** Retros that bank new conventions or assert load-bearing root-cause framings benefit from architect-2; surgical retros may not.

## 12.5 Quantum and D-Wave

- **Timeline on D-Wave access.** Affects whether ising-dwave is near-term or far-future. Default assumption: far-future.

## 12.6 Audience priority

Two valid pulls:
- **Industry-tooling-frontier** — Warp + Newton + OpenUSD + Isaac Lab. Affects which Phase 4 variants ship first.
- **Research-algorithmic-frontier** — SIGGRAPH 2025 flow maps, DiffLogic CA, etc.

The spec accommodates both; emphasis is per-coordinator-quarter.

## 12.7 License posture (locked v2.2)

**Repo license:** **MIT** (locked). Per Phase 0 Decision #5 and the spirit of the field. Per-vendored-upstream license is preserved; the meta-repo license is independent. Apache 2.0 was the alternative if patent-grant mattered, but no patent-grant case has emerged; MIT is final.

## 12.8 Phase 4 hardware floor (locked v2.2)

**CUDA 12 + driver 545+** is the hardware floor for Phase 4 Stages 31–33 (Newton-backed rigid sims) and recommended for Stack E across the phase. The hardware floor is verified by `tools/dispatch/preflight-phase-4.py` at phase open.

**Fallback (locked):** If CUDA is unavailable at Phase 4 dispatch, Stages 31–33 fall back to CPU-only Newton execution (macOS path) per Appendix D § D.5. Acceptance criteria adjust:
- Determinism: verifiable on CPU; same-hardware bit-exact still required.
- USD export: still required (Newton USD export is backend-agnostic).
- Capture round-trip: still required.
- Benchmark numbers: tagged `CPU-only` rather than compared to GPU baselines; CPU benchmarks alone are acceptance-passing.

Owner ratifies the fallback at Phase 4 dispatch if CUDA is unavailable; the agent does NOT silently fall back without owner ratification.

## 12.9 Frontier paper vendoring (locked v2.2)

Every load-bearing frontier paper (Phase 4 §§ 8.1–8.6 cited papers) is pre-vendored to `references/papers/` BEFORE Phase 4 dispatches. Pre-vendoring is an owner action; the agent's preflight script verifies the papers' presence.

**Pre-vendoring contents per paper:**
- PDF of the paper (or HTML if PDF unavailable) at `references/papers/<paper-slug>/paper.pdf`.
- Citation metadata at `references/papers/<paper-slug>/cite.bib` (BibTeX).
- The reference implementation's repo SHA (if applicable) at `references/papers/<paper-slug>/repo-sha.txt`.

**Required pre-vendored papers** (Phase 4 load-bearing citations):

| Paper | Slug | Used by stage |
|---|---|---|
| Xie et al. 2024 PhysGaussian (arXiv:2311.12198) | `physgaussian-2024` | Stages 19, 22 |
| Liu et al. 2024 Gaussian Splashing | `gaussian-splashing-2024` | Stage 20 |
| Gaussian Smoke / Fluents 2025 | `gaussian-smoke-2025` | Stage 21 |
| Mordvintsev 2022 Particle Lenia | `particle-lenia-2022` | Stage 26 |
| Plantec 2022 Flow Lenia | `flow-lenia-2022` | Stage 27 |
| DiffLogic CA 2024 | `difflogic-ca-2024` | Stage 28 |
| Moment-encoded LBM 2025 | `moment-encoded-lbm-2025` | Stage 29 |
| Gaussian Fluids 2025 | `gaussian-fluids-2025` | Stage 30 |
| Clebsch-PFM 2024 | `clebsch-pfm-2024` | Stage 23 |
| EDGE 2024 | `edge-compressible-2024` | Stage 24 |
| VPFM 2025 | `vpfm-2025` | Stage 25 |
| Sanchez-Gonzalez 2020 GNS | `gns-particle-2020` | Stage 34 |
| LES-closure 2024–2025 reference paper (owner picks specific paper at pre-dispatch) | `learned-les-closure` | Stage 35 |

If any paper is unavailable (paywall, removed from arXiv), the owner picks one of: (a) substitute with a close-equivalent paper before Phase 4 dispatch, (b) defer that stage to Phase 6+ with documented rationale, (c) abandon that variant.

---

# Appendix A — Reference catalog

## A.1 Canonical anchors

- Reynolds, C. (1987). "Flocks, herds and schools: A distributed behavioral model." *SIGGRAPH '87*.
- Pearson, J. E. (1993). "Complex patterns in a simple system." *Science* 261(5118).
- Stam, J. (1999). "Stable fluids." *SIGGRAPH '99*.
- Fedkiw, R., Stam, J., Jensen, H. W. (2001). "Visual simulation of smoke." *SIGGRAPH '01*.
- Müller, M., Charypar, D., Gross, M. (2003). "Particle-based fluid simulation for interactive applications." *SCA '03*.
- Roy, C. J. (2005). "Review of code and solution verification procedures for computational simulation." *Journal of Computational Physics* 205(1), 131–156.
- Selle, A., Fedkiw, R., Kim, B., Liu, Y., Rossignac, J. (2008). "An unconditionally stable MacCormack method." *J. Sci. Comput.*
- Bridson, R. (2008). *Fluid Simulation for Computer Graphics*. AK Peters.
- Featherstone, R. (2008). *Rigid Body Dynamics Algorithms*. Springer.
- Oberkampf, W. L., Roy, C. J. (2010). *Verification and Validation in Scientific Computing*. Cambridge University Press.
- Jones, J. (2010). "Characteristics of pattern formation and evolution in approximations of Physarum transport networks." *Artificial Life* 16(2).
- Stomakhin, A., et al. (2013). "A material point method for snow simulation." *SIGGRAPH '13*.
- Bender, J., Koschier, D. (2015). "Divergence-free smoothed particle hydrodynamics." *SCA '15*.
- Klar, G., et al. (2016). "Drucker-Prager elastoplasticity for sand animation." *SIGGRAPH '16*.
- Krüger, T., et al. (2017). *The Lattice Boltzmann Method: Principles and Practice*. Springer.
- Hu, Y., et al. (2018). "A moving least squares material point method." *SIGGRAPH '18*.
- Chan, B. W.-C. (2019). "Lenia — biology of artificial life." *Complex Systems* 28(3).
- Hu, Y., et al. (2020). "DiffTaichi: Differentiable Programming for Physical Simulation." *ICLR '20*.
- Mordvintsev, A., Randazzo, E., Niklasson, E., Levin, M. (2020). "Growing neural cellular automata." *Distill*.
- Sanchez-Gonzalez, A., et al. (2020). "Learning to Simulate Complex Physics with Graph Networks."

## A.2 Frontier (2023–2026)

**Verification methodology:**
- Oberkampf, W. L., Roy, C. J. (2010). *Verification and Validation in Scientific Computing*. Cambridge.
- MOOSE Framework MMS documentation, Idaho National Laboratory.
- Navah, F., Nadarajah, S. (2017). "A comprehensive high-order solver verification methodology for free fluid flows." arXiv:1712.09478.

**3DGS + physics:**
- Kerbl, B., Kopanas, G., Leimkühler, T., Drettakis, G. (2023). "3D Gaussian splatting for real-time radiance field rendering." *SIGGRAPH '23*.
- Xie, T., et al. (2024). "PhysGaussian: Physics-Integrated 3D Gaussians for Generative Dynamics." *CVPR '24*. arXiv:2311.12198.
- Liu, Y., et al. (2024). "Gaussian Splashing: Dynamic Fluid Synthesis with Gaussian Splatting."
- Waczyńska, J., et al. (2024). "GASP: Gaussian Splatting for Physics-Based Simulations." *CVIU* 2026.
- Xiao, J., et al. (June 2025). "Physics-Informed Deformable Gaussian Splatting (PIDG)."
- PhysSplat (2025). "Efficient Physics Simulation for 3D Scenes via MLLM-Guided Gaussian Splatting."
- i-PhysGaussian (February 2026). "Implicit Physical Simulation for 3D Gaussian Splatting." arXiv:2602.17117.
- GaussianFluent (January 2026). "Gaussian Simulation for Dynamic Scenes with Mixed Materials." arXiv:2601.09265.
- MILo (SIGGRAPH Asia 2025). "Mesh-In-the-Loop Gaussian Splatting." Anttwo et al.
- PhysTalk (December 2025). "Language-Driven Real-time Physics in 3D Gaussian Scenes." arXiv:2512.24986.
- PhysDreamer (ECCV 2024). "Physics-based interaction with 3D objects via video generation."
- Abou-Chakra, J., et al. "Physically Embodied Gaussian Splatting." arXiv:2406.10788.
- FreeGave (CVPR 2025). "3D Physics Learning from Dynamic Videos by Gaussian Velocity."

**SIGGRAPH 2025 fluid simulation (Bo Zhu group and others):**
- Li, Z., et al. (2025). "Clebsch Gauge Fluid on Particle Flow Maps." *SIGGRAPH '25* Best Paper Honorable Mention. ACM TOG 44(4).
- Chen, D., Li, Z., et al. (2025). "Fluid Simulation on Compressible Flow Maps (EDGE)." *SIGGRAPH '25*. ACM TOG 44(4).
- "Vortex Particle Flow Maps (VPFM)." *SIGGRAPH 2025*.
- "Cirrus: Adaptive Hybrid Particle-Grid Flow Maps on GPU." *SIGGRAPH 2025*.
- "Leapfrog Flow Maps for Real-Time Fluid Simulation." *SIGGRAPH 2025*.
- Xing, J., et al. "Gaussian Fluids: A Grid-Free Fluid Solver based on Gaussian Spatial Representation." *SIGGRAPH 2025*.
- Narita, F., et al. "Quadtree Tall Cells for Eulerian Liquid Simulation." *SIGGRAPH 2025*.
- Chen, D., Zhou, J., Zhu, B. "A Neural Particle Level Set Method for Dynamic Interface Tracking." *SIGGRAPH 2025*.
- Chen, S., et al. "Fast Subspace Fluid Simulation with a Temporally-Aware Basis." *SIGGRAPH '25 / TOG*.
- Li, Z., He, J., et al. "An Adjoint Method for Differentiable Fluid Simulation on Flow Maps." *SIGGRAPH Asia '25*.
- Ren, L., et al. "A Stack-Free Parallel h-Adaptation Algorithm for Dynamically Balanced Trees on GPUs." *SIGGRAPH Asia '25 / TOG*.
- Chen, D., et al. (2024). "Solid-Fluid Interaction on Particle Flow Maps." ACM TOG 43(6).
- Li, Z., et al. (2024). "Lagrangian Covector Fluid with Free Surface." *SIGGRAPH 2024 Conference Track*.
- Li, Z., et al. (2024). "Particle-Laden Fluid on Flow Maps." arXiv:2409.06246.
- He, J., et al. "A Level Set Method on Particle Flow Maps." In submission to JCP.

**SIGGRAPH 2025 elastodynamics and contact:**
- "JGS2: Near Second-order Converging Jacobi/Gauss-Seidel for GPU Elastodynamics."
- "MGPBD: A Multigrid Accelerated Global XPBD Solver."
- "Elastic Locomotion with Mixed Second-order Differentiation."
- "C5D: Sequential Continuous Convex Collision Detection Using Cone Casting."
- "High-performance CPU Cloth Simulation Using Domain-decomposed Projective Dynamics."
- "Stochastic Barnes-Hut Approximation for Fast Summation on the GPU."

**LBM recent:**
- Chen, Y., Li, W., Levin, D., Wu, K. (2025). "High-Performance Moment-Encoded Lattice Boltzmann Method." 1000×400×400, 16-bit quantization, 4.3× speedup.
- Kummerländer, A., et al. (June 2025). "Large-Scale Simulations of Turbulent Flows using Lattice Boltzmann Methods on Heterogeneous High Performance Computers." arXiv:2506.21804. OpenLB, 18 billion cells, fully differentiable.
- Jaber, K. M., et al. (February 2025). "GPU-Native Adaptive Mesh Refinement with Application to Lattice Boltzmann Simulations." *Computer Physics Communications*.

**Neural cellular automata:**
- Miotti, P., Niklasson, E., Randazzo, E., Mordvintsev, A. (March 2025). "Differentiable Logic Cellular Automata: From Game of Life to pattern generation with learned recurrent circuits." Google Paradigms of Intelligence. arXiv:2506.04912.
- Béna, G., et al. (May 2025). "A Path to Universal Neural Cellular Automata." *GECCO '25 Companion*. arXiv:2505.13058.
- Xu, K., Miikkulainen, R. (2025). "Neural Cellular Automata for ARC-AGI." *ALIFE '25*. arXiv:2506.15746.
- "Petri Dish Neural Cellular Automata." Sakana AI (October 2025).
- Mordvintsev, A., Niklasson, E., Randazzo, E. (2022). "Particle Lenia and the Energy-Based Framework."
- Najarro, E., et al. (2022). "HyperNCA: Growing Neural Networks with Neural Cellular Automata."
- Plantec, E., Hamon, G., Etcheverry, M., Chan, B. W.-C., Oudeyer, P.-Y., Moulin-Frier, C. (May 2025). "Flow-Lenia: Emergent Evolutionary Dynamics in Mass Conservative Continuous Cellular Automata." *Artificial Life* 31(2), 228–248.
- Hartl et al. (September 2025). NCA survey covering biologically grounded interpretability and hierarchical architectures.

**Sparse volumes:**
- Museth, K. (2013). "VDB: High-resolution sparse volumes with dynamic topology." *ACM TOG*.
- Museth, K. (2021). "NanoVDB: A GPU-Friendly and Portable VDB Data Structure." *SIGGRAPH '21 Talks*.
- NVIDIA. "NeuralVDB" (2022 announcement).
- Hu, Y., et al. (2019). "Taichi: A Language for High-Performance Computation on Spatially Sparse Data Structures." *ACM TOG*.

**Industry tooling:**
- NVIDIA Warp. Apache 2.0, May 2025. <https://developer.nvidia.com/warp-python>
- NVIDIA Newton 1.0 GA. Apache 2.0, March 2026 (GTC 2026). Linux Foundation. <https://github.com/newton-physics/newton>
- NVIDIA Omniverse and OpenUSD.
- NVIDIA PhysicsNeMo.
- NVIDIA Isaac Lab / Isaac Sim. Reproducibility documentation: <https://isaac-sim.github.io/IsaacLab/main/source/features/reproducibility.html>
- MuJoCo-Warp; Kamino (Newton solver backends).
- Pixar / Academy Software Foundation. OpenUSD.
- Modular Mojo. Path to 1.0 announced December 2025. Open-sourcing Fall 2026.

**Differentiable physics:**
- Hu, Y., et al. (2020). "DiffTaichi." *ICLR '20*.
- Freeman, C. D., et al. (2021). "Brax — A Differentiable Physics Engine for Large Scale Rigid Body Simulation." arXiv:2106.13281.
- Schoenholz, S. S., Cubuk, E. D. (2020). "JAX, M.D.: A Framework for Differentiable Physics."
- Holl, P., et al. "PhiFlow."
- Werling, K., et al. (2021). "Fast and Feature-Complete Differentiable Physics for Articulated Rigid Bodies with Contact (DiffSim)."
- Heiden, E., Macklin, M., et al. (2021). "DiSECt: Differentiable Simulator for Robotic Cutting."
- Xu, J., et al. (2022). "Accelerated Policy Learning with Parallel Differentiable Simulation."
- Xue, T., et al. (November 2025). "Differentiable Physics-Neural Models enable Learning of Non-Markovian Closures for Accelerated Coarse-Grained Physics Simulations." arXiv:2511.21369.

**Robotics simulation:**
- NVIDIA Isaac Lab (October 2025). "A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning." arXiv:2511.04831.
- Makoviychuk, V., et al. (2021). "Isaac Gym: High Performance GPU-Based Physics Simulation For Robot Learning."

**Testing and reproducibility:**
- pytest-regressions v3.0+ (2025) — golden file testing for Python.
- HDF5 / h5py — scientific data interchange.
- EFECT — Empirical Characteristic Function Equality Convergence Test for stochastic simulation reproducibility. arXiv:2406.16820.
- OpenPRC (2026) — unified open-source framework for physics-to-task evaluation.

---

# Appendix B — Convention catalog

Quick reference. Full text in Part VII; sources of banking documented per convention.

| Code | Name | Domain |
|---|---|---|
| A | New-files-first decomposition | Execution-time |
| C | Probe API surfaces before drafting | Spec-time |
| D | Probe call sites before drafting | Spec-time |
| E | Spec-author-self-test review | Design taste |
| E-addendum | Phase-plan review by separate session | Design taste |
| F | Audit-prose freshness | Execution-time |
| G | Sweep-side protection before check-side expansion | Batch coordination |
| H | Filter rules query properties, not literals | Design taste |
| I | Cross-batch scope discipline | Batch coordination |
| K | Anchor-sketch labeling | Spec-time |
| M | Re-anchor before edit | Spec-time |
| #8 | Never assert specifics from memory | Spec-time |
| #12 | SHA back-fill as separate commit | Execution-time |
| — | FACT vs INFERENCE tagging | Audit-trail |
| — | Four-state verdicts | Audit-trail |
| — | Append-only audits | Audit-trail |
| — | Append-only CI enforcement (mechanical) | Audit-trail |
| — | Evidence-path verification (mechanical) | Audit-trail |
| — | Cross-phase audit replay (mechanical) | Audit-trail |
| — | Hard Rule 2 — Pause and surface | Execution-time |
| — | Rule of three for promotion | Design taste |
| — | Closing-commit anchor re-check | Execution-time |
| — | Sandbox-probe-before-assert (role-agnostic) | Cross-role |
| — | Strict-mode CI default | Build/CI |
| — | Runtime-only display surfaces require user-driven gate | Execution-time |
| — | Failing-tests output hash in commit footer | Execution-time |
| — | Operator-only phase-tag pushing | Execution-time |
| — | Server-side git hooks (mechanical enforcement) | Build/CI |
| — | Tolerance budget per phase (caps tolerance.toml) | Execution-time |
| — | Independent-reference anchors in golden tables | Spec-time |
| — | Mutation testing thresholds for testkit/integrity | Build/CI |
| — | Property-based testing of declared invariants | Spec-time |
| — | Performance regression ledger | Audit-trail |
| — | Adversarial-fixture meta-test for integrity toolkit | Build/CI |
| — | Schema-version backward-compat corpus | Build/CI |
| — | Bootstrap-style verification for productized artifacts | Build/CI |

---

# Appendix C — Glossary

- **Anchor.** A specific file path + line number citation used in a spec or audit. Anchors drift; specs require re-anchoring before edit (Convention M).
- **Audit report.** Append-only record under `_audits/` documenting verification of a claim or completion of a phase.
- **Capture.** A frame of simulation state serialized in the testkit's canonical format (manifest + HDF5 payload).
- **Cat N.** A category of integrity check; Cat 1 (citations), Cat 2 (contracts), Cat 3 (numerical), Cat 4 (draft-time spec verification), Cat 5 (provenance).
- **Code verification.** Roy 2005 level 1: does the code correctly solve the equations it claims?
- **Solution verification.** Roy 2005 level 2: is the numerical solution converged with respect to discretization?
- **Model validation.** Roy 2005 level 3: do the equations match the phenomenon?
- **Calculation validation.** Roy 2005 level 4: does the sim match a reference experiment?
- **DiffLogic CA.** Differentiable Logic Cellular Automata (Miotti et al. 2025) — discrete-state NCA via DLGNs.
- **FACT / INFERENCE.** Tags on concrete claims in spec/retro/audit prose. FACT is grep-verifiable; INFERENCE cites FACTs.
- **GCI.** Grid Convergence Index — Richardson extrapolation-based bound on numerical uncertainty.
- **Golden value.** Pre-computed expected output of an algorithm at canonical test points; lives in `tools/testkit/golden/tables/`.
- **Hard Rule 2.** "Pause and surface" — when spec disagrees with synced state, the synced state is authoritative.
- **HARD_FAIL / SOFT_WARN / AUDIT_LOG.** Failure modes for integrity checks; HARD_FAIL blocks CI, SOFT_WARN logs warning, AUDIT_LOG writes to audit only.
- **Layer 0 through 7.** The portfolio's architecture layers (testkit, integrity, diagnostics, common, references, replication, frontier, productization).
- **MMS.** Method of Manufactured Solutions — code verification by deriving a source term that makes a chosen analytical function the exact solution of an augmented PDE.
- **NanoVDB.** GPU-friendly portable VDB sparse-volume data structure (Museth 2021).
- **Newton.** NVIDIA's open-source physics engine, GA March 2026, built on Warp + OpenUSD.
- **Order-of-accuracy (OOA) test.** Comparison of formal vs. observed order of accuracy as the discretization is refined.
- **PFM.** Particle Flow Map — the dominant 2025 frontier in fluid simulation.
- **Probe.** A pre-implementation verification of facts (paths, line numbers, signatures) that a spec will assert; committed before spec drafting locks.
- **Roy 2005.** Christopher J. Roy's *Review of code and solution verification procedures for computational simulation*; the canonical V&V framework.
- **Tier 1 / 2 / 3.** Diagnostic toolchain layers (universal / data-structure-specific / per-sim).
- **Verdict.** CONFIRMED / SHIFTED / REFUTED / DEFERRED — the four-state audit outcome.
- **Warp.** NVIDIA's Python framework for GPU-accelerated differentiable simulation.

---

# Appendix D — Shared invariants

> **Authority:** This appendix is authoritative for all naming, schema versions, vendored SHAs, capture descriptors, convention names (links to Appendix G), and the thirteen-gate Layer-4 acceptance criteria (§ D.6, v2.4 expansion). Phase plans MAY add to this appendix via phase-landing audits; they MUST NOT silently disagree with it.
> **Status at v2.3:** This appendix consolidates content from the previously-standalone `shared-invariants.md`.

## D.1 — Five-dimension naming map (per spec § 7.11)

This is the resolved naming map. Every `<ns>`, `<module>`, `<sim>`, etc. placeholder in any phase plan resolves to a literal value in this table. Agents do not pick names at dispatch time.

| Surface | Pattern | Literal value |
|---|---|---|
| Repo | (kebab-case, GitHub) | `Bit-Physics` |
| Web demo domain | (kebab-case subdomain) | `bit-physics.<domain>` (production domain TBD; staging `stevenfau.github.io/Bit-Physics/`) |
| PyPI distribution prefix | (kebab-case, PEP 503/508/625) | `bit-physics-` |
| Python testkit package | (snake_case, PEP 8) | PyPI dist `bit-physics-testkit`; ships six flat import modules: `capture`, `code_verification`, `determinism`, `equivalence`, `golden`, `property` |
| Python integrity package | (snake_case) | PyPI dist `bit-physics-integrity`; ships one flat import module: `integrity` |
| Python diagnostics package | (snake_case) | PyPI dist `bit-physics-diagnostics`; ships one flat import module: `diagnostics` |
| Python common-py module | (snake_case) | `common_py` (PyPI: `bit-physics-common-py`) — forward-looking; common-py ships in Phase 2 |
| Python common-warp module | (snake_case) | `common_warp` (PyPI: `bit-physics-common-warp`) |
| Python common-3dgs module | (snake_case) | `common_3dgs` (PyPI: `bit-physics-common-3dgs`) |
| C++ namespace root | (snake_case) | `bit_physics::` (e.g., `bit_physics::common_cpp`, `bit_physics::nanovdb`) |
| npm scope | (kebab-case) | `@bit-physics/` (e.g., `@bit-physics/common-ts`) |
| Common-module directory | (kebab-case at FS) | `common/common-<stack>/` (e.g., `common/common-ts/`, `common/common-cpp/`, `common/common-warp/`, `common/common-3dgs/`) |
| Per-sim package directory | (kebab-case) | `<category>/<sim-name>/` for Stack C/D/E; `packages/<sim-name>/` for Stack B |
| Per-sim spec directory | (kebab-case) | `docs/sim-specs/<category>/<sim-name>/` |
| Audit directory | (kebab-case) | `docs/_audits/phase-<N>/<artifact>-<UTC>.md` |
| Capture directory | (kebab-case) | `captures/<sim>-<variant-or-ref>/` at repo root |

**Placeholder resolution.** When any phase plan uses `<ns>`, resolve to `bit_physics` (PyPI dist prefix; never used as a Python import). When any plan uses `<module>`, resolve to `common_py` (for common-py, Phase 2) or `common_warp` / `common_3dgs` (for those modules respectively).

**Sim-name canonical list** (used as `<sim>` in paths):

| Category | Canonical sim name |
|---|---|
| closed-form | `strange-attractors`, `mandelbulb-explorer` |
| continuous-ca | `reaction-diffusion-2d`, `reaction-diffusion-3d`, `lenia`, `neural-ca` |
| agent-based | `boids-3d`, `physarum` |
| particle-fluid | `sph-water` |
| volumetric-grid | `eulerian-smoke` |
| lattice | `lattice-boltzmann-d3q19` |
| lattice-spin | `ising-classical` (Phase 3 task-3a per § 5.10; ising-dwave deferred to Phase 6+ per § 12.5) |
| hybrid-pg | `mpm-multimaterial` |
| rigid-body | `articulated-pedagogical` (Phase 3 task-4); `articulated-locomotion`, `granular-pile`, `manipulator-grasp` (Phase 4 stages 31, 32, 33) |
| soft-body | `mass-spring-cloth` (Phase 3 task-5; XPBD on Stack C) |
| neural-rendered | (variants of MPM, SPH, smoke — Phase 4); `3dgs-mpm` (Phase 3 task-8) |
| learned-dynamics | `gns-particle`, `learned-closure-les`, `pinn-poisson` (Phase 3 task-7) |

## D.2 — Capture format invariants (per spec § 2.7)

### D.2.1 File layout

Captures live at: `captures/<sim>-<variant-or-ref>/<descriptor>.h5` plus `<descriptor>.json` sidecar, at the **repo root**.

| Variant suffix | Meaning |
|---|---|
| `<sim>-ref` | Layer 4 reference sim |
| `<sim>-stack-<X>` | Layer 5 cross-stack replication |
| `<sim>-diff` | Layer 6 differentiable variant |
| `<sim>-sparse-<encoding>` | Layer 6 sparse variant |
| `<sim>-neural` | Layer 6 neural-rendered variant |
| `<sim>-frontier-<algorithm>` | Layer 6 frontier-algorithm variant |

### D.2.2 Descriptor naming format

**Canonical format:** `<test-name>-<config>-seed<N>-step<N>` — kebab-case, lowercase, single hyphens, no underscores.

A descriptor written with underscores fails equivalence pairing — Cat 4 grammar (c) enforces this as HARD_FAIL.

### D.2.3 Locked descriptor table

Authoritative descriptor for every sim capture across every phase.

| Sim | Variant | Descriptor | Producing phase / stage |
|---|---|---|---|
| `reaction-diffusion-2d` | `ref` | `gray-scott-lambda-128sq-seed42-step2000` | Phase 0 Block 8 |
| `reaction-diffusion-2d` | `stack-c` | `gray-scott-lambda-128sq-seed42-step2000` | Phase 2 Stage 1 |
| `reaction-diffusion-2d` | `stack-d` | `gray-scott-lambda-128sq-seed42-step2000` | Phase 2 Stage 2 |
| `reaction-diffusion-2d` | `diff` | `gray-scott-lambda-128sq-seed42-step2000` | Phase 4 Stage 9 |
| `reaction-diffusion-3d` | `ref` | `gray-scott-lambda-64cube-seed42-step2000` | Phase 1 Stage 2 |
| `sph-water` | `ref` | `dam-break-1M-particles-seed42-step1000` | Phase 1 Stage 2 |
| `sph-water` | `stack-d` | `dam-break-1M-particles-seed42-step1000` | Phase 2 Stage 3 |
| `sph-water` | `diff` | `dam-break-1M-particles-seed42-step1000` | Phase 4 Stage 10 |
| `sph-water` | `neural` | `dam-break-1M-particles-seed42-step1000` | Phase 4 Stage 20 |
| `mpm-multimaterial` | `ref` | `drop-impact-128cube-seed42-step500` | Phase 1 Stage 2 |
| `mpm-multimaterial` | `stack-e` | `drop-impact-128cube-seed42-step500` | Phase 2 Stage 8 |
| `mpm-multimaterial` | `diff` | `drop-impact-128cube-seed42-step500` | Phase 4 Stage 11 |
| `mpm-multimaterial` | `sparse-nanovdb` | `drop-impact-128cube-seed42-step500` | Phase 4 Stage 16 |
| `mpm-multimaterial` | `neural` | `drop-impact-128cube-seed42-step500` | Phase 4 Stage 19 |
| `mpm-multimaterial` | `neural-iterative` | `drop-impact-128cube-seed42-step500` | Phase 4 Stage 22 |
| `eulerian-smoke` | `ref` | `taylor-green-128cube-seed42-step500` + `lid-driven-cavity-128sq-re100-seed42-step1000` | Phase 1 Stage 2 |
| `eulerian-smoke` | `stack-d` | (same two descriptors) | Phase 2 Stage 4 |
| `eulerian-smoke` | `stack-e` | (same two descriptors) | Phase 2 Stage 5 |
| `eulerian-smoke` | `diff` | `taylor-green-128cube-seed42-step500` | Phase 4 Stage 13 |
| `eulerian-smoke` | `sparse-nanovdb` | `taylor-green-128cube-seed42-step500` | Phase 4 Stage 15 |
| `eulerian-smoke` | `sparse-quadtree` | `taylor-green-128cube-seed42-step500` | Phase 4 Stage 17 |
| `eulerian-smoke` | `neural` | `taylor-green-128cube-seed42-step500` | Phase 4 Stage 21 |
| `eulerian-smoke` | `frontier-clebsch-pfm` | `taylor-green-128cube-seed42-step500` | Phase 4 Stage 23 |
| `eulerian-smoke` | `frontier-edge` | `taylor-green-128cube-seed42-step500` | Phase 4 Stage 24 |
| `eulerian-smoke` | `frontier-vpfm` | `taylor-green-128cube-seed42-step500` | Phase 4 Stage 25 |
| `eulerian-smoke` | `frontier-gaussian-fluids` | `taylor-green-128cube-seed42-step500` | Phase 4 Stage 30 |
| `lattice-boltzmann-d3q19` | `ref` | `poiseuille-64x32-seed42-step1000` + `couette-32x16-seed42-step500` | Phase 1 Stage 2 |
| `lattice-boltzmann-d3q19` | `stack-d` | (same two descriptors) | Phase 2 Stage 6 |
| `lattice-boltzmann-d3q19` | `stack-e` | (same two descriptors) | Phase 2 Stage 7 |
| `lattice-boltzmann-d3q19` | `sparse-amr` | `poiseuille-64x32-seed42-step1000` | Phase 4 Stage 18 |
| `lattice-boltzmann-d3q19` | `frontier-moment-encoded` | `poiseuille-64x32-seed42-step1000` | Phase 4 Stage 29 |
| `lenia` | `ref` | `orbium-256sq-seed42-step1000` | Phase 3 task-3 |
| `lenia` | `diff` | `orbium-256sq-seed42-step1000` | Phase 4 Stage 12 |
| `lenia` | `frontier-particle-lenia` | `orbium-256sq-seed42-step1000` | Phase 4 Stage 26 |
| `lenia` | `frontier-flow-lenia` | `orbium-256sq-seed42-step1000` | Phase 4 Stage 27 |
| `neural-ca` | `ref` | `growing-emoji-64sq-seed42-step1000` | Phase 3 task-6 |
| `neural-ca` | `frontier-difflogic` | `growing-emoji-64sq-seed42-step1000` | Phase 4 Stage 28 |
| `articulated-pedagogical` | `ref` | `pendulum-trajectory-seed42-step1000` | Phase 3 task-4 |
| `articulated-pedagogical` | `diff` | `pendulum-trajectory-seed42-step1000` | Phase 4 Stage 14 |
| `cloth-xpbd` | `ref` | `flag-wind-128x128-seed42-step1000` | Phase 3 task-5 |
| `strange-attractors` | `ref` | `lorenz-trajectory-seed42-step10000` | Phase 1 Stage 2 |
| `mandelbulb-explorer` | `ref` | `de-probe-points-seed42` | Phase 1 Stage 2 |
| `boids-3d` | `ref` | `flock-3agents-canonical-seed42-step1000` + `flock-1000agents-seed42-step1000` | Phase 1 Stage 2 |
| `physarum` | `ref` | `network-canonical-seed42-step5000` | Phase 1 Stage 2 |
| `ising-classical` | `ref` | `metropolis-128sq-T2.27-seed42-step10000` | Phase 3 task-3a |
| `articulated-locomotion` | `ref` | `walk-cycle-seed42-step1000` | Phase 4 Stage 31 |
| `granular-pile` | `ref` | `250k-spheres-settle-seed42-step1000` | Phase 4 Stage 32 |
| `manipulator-grasp` | `ref` | `gripper-cylinder-seed42-step500` | Phase 4 Stage 33 |
| `gns-particle` | `ref` | `water-ramps-seed42-step1000` | Phase 4 Stage 34 |
| `learned-closure-les` | `ref` | `forced-turbulence-128cube-seed42-step500` | Phase 4 Stage 35 |

**Adding a new descriptor:** any phase landing audit may extend this table for sims it shipped; it must NOT modify rows for sims shipped in prior phases.

### D.2.4 Schema versions

| Schema version | Source phase | Additive content |
|---|---|---|
| `1.0.0` | Phase 0 Block 1 (frozen) | Base schema per spec § 2.7. |
| `1.1.0` | Phase 4 WU-A (Stage 2) | Adds `gradient_fields` optional key to manifest. |
| `1.1.0` | Phase 4 WU-B (Stage 3) | Adds `active_mask` optional key. WU-B does NOT re-bump; both additions ship under 1.1.0. |

**Bump policy (locked):** Only Phase 4 WU-A bumps schema in the current plan set. All other phases MUST NOT bump. An agent in any other phase wanting to bump surfaces BLOCKED per Hard-Rule-2.

### D.2.5 HDF5 layout (locked)

```
/steps/{N}/state/{field_name}        # np.ndarray per field per step
/steps/{N}/diagnostics/{check_name}  # scalar per Tier 1 diagnostic per step
/metadata/                            # replicated manifest fields
```

## D.3 — Vendored dependency pins

These SHAs are pinned at planning time and reverified at each consuming stage's probe. An agent encountering a different current SHA at probe time pins the new SHA, documents the version bump in its report, and proceeds; an agent encountering a license change surfaces BLOCKED.

| Dependency | Used by | Pin | License | Verification command at probe time |
|---|---|---|---|---|
| **SPlisHSPlasH** | Phase 0 Block 4; Phase 1 Stage 2 sph-water | Latest release at Phase 0 Block 4 time | MIT | `gh release view -R InteractiveComputerGraphics/SPlisHSPlasH` |
| **OpenVDB (incl. NanoVDB)** | Phase 4 WU-B; Phase 4 Stages 15, 16, 18 | Latest stable at WU-B time (expect v12.x+ as of May 2026) | **MPL-2.0** | `gh release view -R AcademySoftwareFoundation/openvdb` |
| **NVIDIA Newton 1.0 GA** | Phase 4 WU-D; Phase 4 Stages 31, 32, 33 | Pin to specific 1.0.x release (NOT 2.0) | Apache-2.0 | `gh release view -R newton-physics/newton --pattern 'v1.0.*'` |
| **Inria gaussian-splatting** | Phase 3 task-1; Phase 4 WU-C; Phase 4 Stages 19–22 | Latest stable at Phase 3 task-1 time | Inria research license | Web-fetch latest commit on main |
| **PhysGaussian (Xie 2024)** | Phase 4 Stage 19, Stage 22 | Latest stable; paper arXiv:2311.12198 | MIT | Web-fetch latest commit on main |
| **Bender PositionBasedDynamics** | Phase 3 task-5 (cloth-xpbd) | Latest stable | MIT | `gh release view -R InteractiveComputerGraphics/PositionBasedDynamics` |
| **NVIDIA PhysicsNeMo** | Phase 3 task-7 (PINN); Phase 4 WU-E; Phase 4 Stage 35 | `pip install nvidia-physicsnemo==<latest 1.x>` | Apache-2.0 | `pip index versions nvidia-physicsnemo` |

## D.4 — External dependency pins (non-vendored)

| Dependency | Used by | Pin (May 2026 known-good) | Verification |
|---|---|---|---|
| **h5wasm** (npm) | Phase 0 Block 7 (common-ts) | `0.10.1` (latest as of May 18 2026) | `npm view h5wasm version` |
| **h5py** (pip) | All Python phases | Latest 3.x | `pip index versions h5py` |
| **pre-commit-hooks** | Phase 0 Block 1 `.pre-commit-config.yaml` | Latest tag at Block 1 time | `gh release view -R pre-commit/pre-commit-hooks` |
| **ruff-pre-commit** | Phase 0 Block 1 | Latest tag at Block 1 time | `gh release view -R astral-sh/ruff-pre-commit` |
| **conventional-pre-commit** | Phase 0 Block 1 | Latest tag at Block 1 time | `gh release view -R compilerla/conventional-pre-commit` |
| **uv** | All Python phases | Latest stable | `uv --version` after install |
| **Node** | Phase 0 Block 7, Phase 5 web-deploy | 22 LTS or later | `node --version` |
| **pnpm** | Phase 0 Block 7, Stack B sims | 10.x or later | `pnpm --version` |
| **TypeScript** | Stack B sims | 5.x | check `package.json` after Block 7 |
| **PyTorch Lightning** | Phase 4 WU-E | Latest 2.x; import path `lightning.pytorch.LightningModule` | `pip index versions lightning` |
| **usd-core** | Phase 4 WU-D, Phase 4 Stages 31–33 | Latest stable | `pip index versions usd-core` |
| **NVIDIA Warp** | Phase 2 Stage 0 (common-warp), Phase 4 Stack E stages | Latest stable; CUDA 12 backend | `pip index versions warp-lang` |
| **Taichi** | Stack D sims | Latest 1.7+; CUDA / Vulkan / Metal backends | `pip index versions taichi` |
| **WebGPU browser support** | Stack B sims | Chrome/Edge 113+, Firefox 141+ Win / 145+ macOS, Safari 26+ | Re-verify at Phase 0 Block 7 |

## D.5 — Hardware floors

| Phase | Required hardware | Fallback if unavailable |
|---|---|---|
| Phase 0 | Any modern GPU with WebGPU support | macOS Metal or Linux Vulkan is fine; Block 7's CI tests skip-in-CI |
| Phase 1 | Per-sim; failing-tests phase, GPU not required | None — TDD bootstrap only |
| Phase 2 | Stack C: Vulkan 1.3. Stack D: Taichi backend. Stack E: CUDA 12 + driver 545+ recommended | CPU-only Warp works on macOS for Stage 8 MPM with degraded perf |
| Phase 3 | Stack E sims: CUDA 12 + driver 545+ recommended | macOS CPU-only for Stack E |
| Phase 4 | **CUDA 12 + driver 545+ required** for Stages 31–33 | CPU-only Newton on macOS with documented determinism caveats; acceptance criteria adjust to "CPU determinism + USD export validates" |
| Phase 5 | None (CI-only) | n/a |

## D.6 — Layer 4 acceptance gates (per spec § 3.5)

Applies to every Layer 4 reference sim. The list expanded from 10 to 13 gates with the v2.4 amendment (Phase 2 dispatch).

**Gates 1–10 (legacy; Phase 0 / Phase 1):**

1. Spec sheet committed with full §6 verification posture.
2. Pre-implementation probe report committed.
3. Acceptance test suite committed and *failing*, with verbatim failing pytest output captured to `tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt` and hashed in commit message footer (v2.4 expansion of gate 3; § 1.3).
4. MMS / golden-value tests pass after implementation (Cat 3), with at least three independent-reference anchors per golden table (v2.4 expansion of gate 4; § 2.4).
5. Tier 1 diagnostics pass.
6. Category-specific Tier 2 diagnostics pass.
7. Citation chain resolves (Cat 1).
8. Public API resolves (Cat 2).
9. Ships with a capture file the testkit can replay.
10. Determinism declaration consistent with capture file.

**Gates 11–13 (Phase 2 onward; back-fillable for Phase 1 sims at Phase 2 open):**

11. Property-based tests of declared invariants pass (§ 2.14).
12. First-landing wall-clock recorded in `docs/perf-ledger.md` (§ 2.15).
13. Phase-landing audit replays the pre-implementation commit's failing tests and confirms the recorded output hash matches.

For Phase 1 (TDD bootstrap scope; gates 1–3 only), gates 4–13 are explicitly deferred. Phase 2 open back-fills gates 11–13 for Phase 1 sims as part of the equivalence-readiness pass.

## D.7 — Tier 2 diagnostic substack assignments

| Category | Primary Tier 2 substack | Secondary |
|---|---|---|
| closed-form | `closed_form` | — |
| continuous-ca | `scalar_field` | (physarum: `particle` + `scalar_field`) |
| agent-based | `particle` | (physarum: + `scalar_field`) |
| particle-fluid | `particle` | (SPH: + `scalar_field` for density grid) |
| volumetric-grid | `vector_field` | `scalar_field` |
| lattice | `vector_field` | (LBM macroscopic moments) |
| hybrid-pg | `particle` + `vector_field` | (MPM particle + grid) |
| rigid-body | `particle` | (bodies as point-mass particles) |
| soft-body | `particle` | `vector_field` |
| neural-rendered | `scalar_field` | (render-similarity is separate gate) |
| learned-dynamics | (depends on parent sim's category) | — |

## D.8 — Forbidden agent actions (universal)

These prohibitions apply to every phase agent. Items 1–12 are convention-enforced (audit-trail catches violations); items 13–17 are mechanically enforced by server-side hooks per § 7.12.

1. **Do NOT bump `schema_version` outside of Phase 4 WU-A.** Schema bumps scheduled in § D.2.4.
2. **Do NOT use `git --amend`.** Per Convention-12.
3. **Do NOT create feature branches or use PR ceremony.** Trunk-based per spec § 7.12.
4. **Do NOT silently adapt on plan/repo disagreement.** Per Hard-Rule-2.
5. **Do NOT extend `common/common-<stack>/` modules outside their scheduled maturation phase.** Phase 3 task-9 matures common-warp; Phase 4 WU-* extends specific common modules.
6. **Do NOT skip the failing-tests-first commit OR the failing-output capture step.** TDD per spec § 1.3 (including step 4: capture verbatim test output and hash in commit footer). Convention-A.
7. **Do NOT pick research papers, sim names, solver names, or vendored SHAs at stage time.** All pre-resolved in this appendix or the phase plan's locked decisions section.
8. **Do NOT modify this appendix, Appendix E, Appendix G, or `docs/glossary.md` mid-phase.** Amended only at phase-landing audits.
9. **Do NOT add `# integrity-allow:` suppressions without owner-approval line in annotation.**
10. **Do NOT introduce a new top-level directory without an entry in this appendix's directory layout.**
11. **Do NOT write code from memory for an API surface.** Probe or check `docs/common/<stack>.md`.
12. **Do NOT modify vendored source under `references/`.** Read-only.
13. **Do NOT push phase tags.** Tags `v0.<N>.0-phase-<N>` are pushed only by the operator after landing-audit review, per spec § 7.12.
14. **Do NOT push to any branch other than `main`.** Server-side hook rejects.
15. **Do NOT `git push --force` or `git push --force-with-lease`.** Server-side hook rejects.
16. **Do NOT edit or shorten any file under `docs/_audits/`** that is already present on `main` at any prior tag. Append-only. Server-side hook rejects.
17. **Do NOT widen a tolerance in `tolerance.toml` beyond the `tolerance-budget.toml` cap** without first landing an operator-approved tolerance-budget-amendment commit. Cat-X HARD_FAIL otherwise. Per § 2.6.

## D.9 — Context-fill triage discipline

When an agent's Claude Code session approaches context capacity:

| Utilization | Action |
|---|---|
| < 60% | Continue normally. |
| 60–70% | Finish the current stage, then checkpoint and end. |
| 70–80% | Active checkpoint: commit any in-progress work, append `CONTINUE_FROM` to `docs/_audits/phase-<N>/progress.md`, end the session. |
| > 80% | Hard checkpoint: stop current work, commit only what's complete and tested, write `CONTINUE_FROM` with explicit "next action: <description>", end. |

The continuation session reads `progress.md` as authoritative for "where are we" and re-anchors against `main` HEAD for "what's the actual state."

**Progress file format** (one line per stage close, append-only):

```
[YYYY-MM-DDTHH-MM-SSZ] stage-N-<name>: <verdict> | sha=<short-sha> | report=<path>
```

When a `CONTINUE_FROM` is written:

```
CONTINUE_FROM: next-stage=N+1; last-commit-sha=<sha>; partial-work=<description-or-"none">; remaining-context-budget=<percent>
```

---

# Appendix E — Agent playbook

> **Authority:** This appendix is normative for friction-handling. Every Claude Code agent dispatched on a phase reads this appendix at session start; covered patterns get the playbook's response, uncovered patterns get BLOCKED.
> **Status at v2.3:** Consolidated from previously-standalone `agent-playbook.md`.

## E.1 — How to use this playbook

When the agent encounters friction (something not going as the phase plan expects):

1. Identify the friction pattern by scanning § E.2 below.
2. If the pattern matches an entry, follow the playbook entry.
3. If no pattern matches, surface BLOCKED with a precise description.

The playbook NEVER instructs "use judgment" or "decide what's best." Either covered (follow) or uncovered (surface).

## E.2 — Friction patterns

### Pattern A — Plan asserts a path/symbol that doesn't exist at HEAD

**Response:**
- File exists but with different content: Apply Hard-Rule-2. Synced state wins. Document SHIFTED in report. Adapt.
- File doesn't exist at all: BLOCKED. End session.

### Pattern B — External dependency at unexpected version or SHA

**Response:**
- Minor version bump (h5wasm 0.10.1 → 0.11.0): Adopt new version. Document. Update `docs/dependencies.md`. Proceed.
- Major version bump (Newton 1.0 → 2.0; PhysicsNeMo 1.x → 2.0): BLOCKED.
- License change: BLOCKED, always.
- SHA available but tag missing: Use SHA. Pin in manifest. Proceed.
- Package removed from registry: BLOCKED.

### Pattern C — Frontier paper unavailable

**Response:**
- Check `references/papers/` for pre-vendored copy. If found, use it.
- If not found and implementation-load-bearing: BLOCKED.
- If citation-only: cite URL with `<verify at landing>` annotation, proceed, flag in audit.

### Pattern D — Test runner not configured / framework missing

**Response:**
- Phase 0: this may be intentional bootstrapping. If current block is responsible for setup, do it. Otherwise BLOCKED.
- Other phase: BLOCKED. Test framework setup is Phase 0 work.

### Pattern E — Tests fail at runtime

**Response:**
- Assertion errors: defect. Debug and fix within current stage's scope.
- Import errors (pre-implementation TDD): expected. Commit and proceed.
- Import errors (post-implementation): defect. Fix export surface.
- Framework errors: debug setup; if environment-level, BLOCKED.
- Tests pass but agent suspects test is wrong: document in report under "open items"; do NOT modify test.

### Pattern F — Numerical correctness disagrees with reference

**Response:**
- Narrow miss (within 2× tolerance): investigate per spec § 9.4. Document deviation; propose per-sim tolerance override in `tools/testkit/equivalence/tolerance.toml`. SHIFTED.
- Wide miss (>2× tolerance): defect. Diagnose. REFUTED.
- Reference might be wrong: do NOT silently change reference. Commit investigation log; owner decides.

### Pattern G — Common-* API differs from probe expectation

**Response:**
- Signature changed but function exists: Adapt. SHIFTED.
- Function doesn't exist:
  - If this stage's scope includes adding it: add it.
  - Else: BLOCKED. Extending common-* outside scheduled maturation forbidden (Appendix D § D.8 item 5).

### Pattern H — Context window approaching capacity

**Response:** Per Appendix D § D.9 context-fill triage.

### Pattern I — Plan ambiguity (two readings, both defensible)

**Response:**
- Check Appendix D for resolution.
- Still ambiguous: pick more conservative reading. Document INFERENCE with alternative noted.
- Major-deliverable differences: BLOCKED.

### Pattern J — Spec contradicts itself

**Response:**
- Defer to most specific section (Phase 3 §5.3 drift-handling precedent).
- Document under "spec amendments proposed."
- Phase-landing audit aggregates proposals; owner decides at phase close.
- Agent does NOT modify spec mid-phase.

### Pattern K — Hardware unavailable

**Response:**
- Phase 4 Stage 31–33 + no CUDA 12 / driver 545+: switch to CPU-only Newton per Appendix D § D.5. Adjust acceptance criteria.
- Document the fallback in report.

### Pattern L — Owner-decision item unresolved

**Response:** BLOCKED. The plan is not dispatch-ready. End session.

This pattern should not fire if dispatch-readiness preflights are honored, but it's the correct response if it does.

### Pattern M — Vendoring license incompatible

**Response:** BLOCKED, always.

### Pattern N — Strict-mode CI false positive

**Response:**
- First verify the tool is wrong; the agent's belief is suspect.
- If after re-reading the tool is genuinely wrong: narrow suppression to smallest scope (`# type: ignore[specific-rule]` or `# noqa: SPECIFIC-RULE`).
- NEVER blanket `# type: ignore` or disable strict-mode.

### Pattern O — Pre-commit hook fails on commit

**Response:**
- Cat 4 `path:line` mismatch: `view` file, fix line number, re-commit.
- Cat 4 `phrase "X" in Y` mismatch: read Y, update X, re-commit.
- Cat 4 `<API X has shape Y>` mismatch: probe actual shape, update Y, re-commit.
- Conventional-commits format: fix message, re-commit.
- Trailing whitespace / EOF: accept auto-fix, re-stage, re-commit.

NEVER add `# integrity-allow:` to silence Cat 4. Cat 4 surfaces real drift.

## E.3 — What to do after each stage

1. Self-validate per stage acceptance criteria.
2. Commit final files for stage.
3. Append one line to `docs/_audits/phase-<N>/progress.md` per spec § 7.5 format.
4. Write completion report at `docs/_audits/phase-<N>/<artifact>-<UTC>.md` per spec § 7.5 canonical front-matter.
5. Check context budget per Appendix D § D.9.
6. No human pause unless verdict is BLOCKED or HALTED. CONFIRMED/SHIFTED → move to next stage in same session.

## E.4 — When to surface verbatim

Agent surfaces (writes BLOCKED report and ends session) in exactly these cases:

1. Precondition not met and not auto-recoverable.
2. Major-version dep bump (Pattern B).
3. Vendoring license change (Pattern M).
4. Frontier paper unavailable and not pre-vendored (Pattern C).
5. Plan ambiguity with major-deliverable consequences (Pattern I deep case).
6. Owner-decision item unresolved (Pattern L).
7. Load-bearing spec contradiction (Pattern J substantive case).
8. Correctness defect outside current stage's scope.
9. Context budget exhausted with work in flight (Pattern H, > 80%).
10. Self-validation gate failed; cause outside stage scope.

In all other cases, adapt per playbook, document SHIFTED, proceed.

## E.5 — Anti-patterns to avoid

- Asserting concrete value from training memory. Probe.
- Inventing capture descriptors not in Appendix D § D.2.3.
- Modifying Stage N-1's code "for clarity" while working on Stage N.
- Writing tests that match the implementation rather than the spec.
- Skipping the probe report.
- Silently extending common-* modules.
- Continuing past a context budget threshold.
- Using `git --amend`, `git push --force`, `git rebase`.
- Adding `# integrity-allow:` suppressions.
- Picking a paper, sim name, solver, or SHA at stage time.

---

# Appendix F — Operating model and dispatch operations

> **Authority:** This appendix is the owner's operational reference for dispatching the portfolio. It is owner-facing rather than agent-facing (the agent reads Appendices D, E, G).
> **Status at v2.3:** Consolidated from previously-standalone `dispatch-readiness-checklist.md`.

## F.1 — Universal operating model

- **One coordinator chat per phase**, opened in the claude.ai project folder so the agent has access to all plan documents.
- **One Claude Code agent role per phase**, dispatched once at phase open with auto-accept on, working through all stages sequentially.
- **Action #1 in every session is `python tools/dispatch/preflight-phase-<N>.py`.** Exit 0 → proceed. Exit 1 → BLOCKED, end session, surface to owner.
- **Continuation sessions only on context-fill** per Appendix D § D.9.
- **Reports at each stage close** per spec § 7.5 canonical front-matter; one line per stage in `docs/_audits/phase-<N>/progress.md`.
- **Trunk-based commits** direct to `main` per spec § 7.12.
- **Phase tag** `v0.<N>.0-phase-<N>` on the closing-audit commit.
- **Agent reads Appendices D, E, G** at session start; these are the cross-cutting reference set.

## F.2 — Owner architectural decisions (locked in v2.2/v2.3)

All previously-outstanding decisions are now resolved:

| Decision | Resolution | Where locked |
|---|---|---|
| Phase 1 scope | Gates 1–3 (TDD bootstrap only) | Phase 1 plan R8 amendment + § 1.2 body |
| common-warp timing | Phase 2 Stage 0 bootstrap; Phase 3 task-9 matures | Phase 2 plan v5 amendment |
| Phase 4 Stages 31–33 sims+solvers | articulated-locomotion (Featherstone), granular-pile (MuJoCo-Warp), manipulator-grasp (Kamino) | Phase 4 plan v8 + § 8.5 body table |
| Phase 4 SPH-diff stack | Stack D (DiffTaichi) | Phase 4 plan v8 + § 8.1 Stage 10 |
| Phase 4 LES paper | Owner pre-vendors specific paper to `references/papers/learned-les-closure/` | Phase 4 plan v8 + § 8.6 |
| Phase 0 LBM Krüger | Algebraic reference only; no vendored code | Phase 0 plan v0.9 |
| License | MIT | Spec § 12.7 |

Items still owner-actionable before specific phase dispatches:

- **Phase 4 hardware floor.** Verify CUDA 12 / driver 545+ available OR ratify CPU-only fallback for Stages 31–33.
- **PyPI namespace reservation.** Reserve `bit-physics-*` prefix as trusted publisher (before Phase 5).

## F.3 — Per-phase preflight summaries

Each phase plan opens with its own preflight section. This appendix gives the owner-facing summary; the agent's preflight is the runnable script in `tools/dispatch/preflight-phase-<N>.py` (committed by Phase 0 from `phase-0-plan.md` § 7.1 Block 1 embedded source).

### F.3.1 — Phase 0

- Repo exists; permissions allow direct push to `main`.
- External-dependency pre-flight (h5wasm 0.10.1 known-good; SPlisHSPlasH SHA; pre-commit hook tags; coordinator chat opened).
- Phase 0 v0.9 single-agent dispatch model accepted.

### F.3.2 — Phase 1

- Phase 0 landed CONFIRMED.
- Scope locked to gates 1–3.
- `<ns>` / `<module>` placeholders resolved.
- RD-2D capture descriptor present at `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5`.

### F.3.3 — Phase 2

- Phase 1 landed CONFIRMED.
- C++ namespace `bit_physics::` per spec § 7.11.
- Phase 1 capture descriptors verified per Appendix D § D.2.3.
- Phase 2 v5 amendment block (trunk-based + single-agent) accepted.

### F.3.4 — Phase 3

- Phase 2 landed CONFIRMED.
- common-warp matured per Phase 2 Stage 0.
- External SHAs pinned (Inria 3DGS, PhysGaussian, Bender PBD, PhysicsNeMo PINN).
- Phase 3 v8 amendment block (trunk-based + single-agent + ising-classical) accepted.

### F.3.5 — Phase 4

- Phase 3 landed CONFIRMED.
- Hardware floor: CUDA 12 / driver 545+ OR CPU-only Newton fallback ratified.
- Pinned: Lightning 2.x, PhysicsNeMo 1.x, OpenVDB tag, Newton 1.0.x.
- **All 13 frontier papers pre-vendored** to `references/papers/` per spec § 12.9.
- Stages 31–33 sim+solver picks baked into Phase 4 plan § 8.5.
- Phase 4 v8 amendment block accepted.

### F.3.6 — Phase 5

- Phase 4 landed (partial completion acceptable per Phase 5 § 0).
- Sim `productization` opt-outs declared in each `spec-ref.md` § 13.
- PyPI namespace `bit-physics-*` reserved as trusted publisher.
- Phase 5 v7 amendment block accepted.

## F.4 — Press Go criteria

Owner can dispatch Phase 0 once § F.1 and § F.2 are confirmed. Each subsequent phase's preflight is the per-phase § F.3.x walkthrough.

The press-Go sequence for Phase N:

1. Run `python tools/dispatch/preflight-phase-<N>.py` locally. Confirm exit 0.
2. Open a fresh claude.ai chat in this project folder.
3. Paste the phase plan's coordinator-brief section as the kickoff message.
4. The coordinator dispatches one Claude Code session with the phase opener prompt; the agent reads the phase plan on disk.
5. Receive stage-close reports; surface BLOCKED/HALTED to owner.
6. On phase landing: confirm verdict, dispatch the next phase.

## F.5 — Operational discipline reminders

- **One Claude Code session at a time per phase.** Continuation sessions only on context-fill.
- **Trunk-based commits**, direct push to `main`, tag at phase landing.
- **Audit-file paths**: `docs/_audits/phase-<N>/<artifact>-<UTC>.md` (colons in UTC replaced with hyphens).
- **Canonical front-matter** per spec § 7.5 on every audit / report.
- **No `git --amend`** (Convention-12). SHA back-fills are separate follow-up commits.
- **Cat 4 grammars** check `<path>:<line>`, `<phrase "X" in Y>`, `<API X has shape Y>` at draft time.
- **FACT / INFERENCE tagging** on concrete claims per spec § 7.5.
- **Schema-version bumps** only by Phase 4 WU-A (spec § 2.12).
- **Convention names** per Appendix G.

---

# Appendix G — Convention catalog (full text)

> **Authority:** Full text of the operating conventions referenced throughout. Appendix B is a quick-lookup alphabetical index; Appendix G has the full definitions.
> **Status at v2.3:** Consolidated from previously-standalone `conventions.md`. Part VII (in the body) summarizes; Appendix G is canonical.

## G.1 — How conventions work

Every concrete claim, decision, or action is governed by a named convention. Conventions are discovered (not invented) when a failure mode repeats; they become load-bearing when the pattern triggers in three independent contexts (the Rule-of-Three).

Each convention has:
- A **name** (kebab-case identifier; canonical form `Convention-<letter-or-number>`).
- A **type** (Spec-time / Execution-time / Batch / Design-taste / Cross-cutting).
- A **one-line summary**.
- The **failure mode** addressed.
- A **discipline** that applies it.

Conventions compose. A commit can simultaneously honor Convention-A (new-files-first), Convention-12 (no `--amend`), Convention-M (re-anchored), Convention-8 (no fabrications).

## G.2 — Spec-time conventions

### Convention-8 — Never assert specifics from memory

**One-liner:** Every concrete fact is grep-verified or web-fetched at the moment of assertion.

**Failure mode:** "Fabrication" — confident assertions from training memory rather than probed reality.

**Discipline:** Before writing any concrete value, run the relevant probe (`view`, `grep`, `web_fetch`, `pip index versions`). FACT-tag in surrounding prose.

### Convention-M — Re-anchor before edit

**One-liner:** Before modifying any file, re-`view` or re-grep. Prior context-stale.

**Failure mode:** "Anchor drift" — context-stale assertions where the file changed between last view and current edit.

**Discipline:** `view` immediately before edit. After any successful `str_replace`/`create_file`, re-`view` before further edits.

### Convention-C — Probe API surfaces before drafting

**One-liner:** Pre-implementation probes enumerate the surfaces being consumed; quote signatures verbatim.

**Failure mode:** "API drift" — specs that call methods that don't exist.

**Discipline:** Before drafting a spec section, probe the actual module. Quote signatures verbatim; cite file:line.

### Convention-D — Probe call sites before drafting

**One-liner:** Pre-implementation probes enumerate every module depending on a changing behavior.

**Failure mode:** "Hidden-consumer drift."

**Discipline:** Before behavioral changes, `grep` for every consumer.

### Convention-K — Anchor-sketch labeling

**One-liner:** Sections built from inference (not direct probe) are explicitly labeled.

**Failure mode:** "False confidence."

**Discipline:** Label inferred content; state what would invalidate it and how the executor verifies.

## G.3 — Execution-time conventions

### Convention-A — New-files-first decomposition

**One-liner:** Commits touching >1 existing file split into new-files commit then existing-file edits commit.

**Failure mode:** "Bundled commits" — diffs too large to review.

**Discipline:** If >1 existing file touched, split. New files = C1; existing-file edits = C2. SHA back-fill (Convention-12) = C3 if needed.

### Convention-12 — SHA back-fill as separate commit; never `--amend`

**One-liner:** SHA references back-fill as follow-up commit, never `git --amend`.

**Failure mode:** "Audit trail breakage."

**Discipline:** Use `<COMMIT_N_SHA_PENDING>` placeholder; land referenced commit; follow-up replaces placeholder. Never `git --amend`.

### Convention-F — Audit-prose freshness

**One-liner:** Audit reports drafted then landed re-verify FACT claims before commit.

**Failure mode:** "Stale audit."

**Discipline:** Before committing, re-verify FACTs against live repo. Discrepancies become addenda, not paraphrases.

### Hard-Rule-2 — Pause and surface on disagreement

**One-liner:** Synced repo state wins over plan/spec text. Stop and surface; do not silently adapt.

**Failure mode:** "Silent adaptation."

**Discipline:** On plan/repo disagreement, stop, write BLOCKED-or-SHIFTED report, end session (or escalate within session if trivially resolvable).

## G.4 — Batch coordination conventions

### Convention-G — Sweep-side protection before check-side expansion

**One-liner:** Land the protection (prevents new violations) before flipping the check on.

**Failure mode:** "Findings flood."

### Convention-I — Cross-batch scope discipline

**One-liner:** Out-of-scope findings during one batch's verification defer to the responsible batch.

**Failure mode:** "Scope creep."

## G.5 — Design-taste conventions

### Convention-E — Spec-author-self-test review

**One-liner:** Spec→test load-bearing work routes through architect-2 review or structured pause.

**Failure mode:** "Self-validating spec."

### Convention-H — Filter rules query named properties, not string literals

**One-liner:** `if obj.category == "particle"`, not `if obj.name in ["sph", "boids"]`.

**Failure mode:** "Brittle filters."

## G.6 — Cross-cutting conventions

### Convention-M-addendum — Stable repo path before probe

**One-liner:** Design-rev artifacts land at stable repo path before any probe.

**Failure mode:** "Probe-against-staging."

### Rule-of-Three (spec § 7.10) — Promotion threshold

**One-liner:** A pattern lifts to shared infrastructure on its third independent consumer.

**Failure mode:** Premature abstraction OR over-tolerated duplication.

**Discipline:** First consumer: inline. Second: inline again, note duplication. Third: lift.

## G.7 — Audit-trail discipline (anchors spec § 7.5)

### FACT vs. INFERENCE tagging

Every concrete claim is tagged. FACTs are grep-verifiable; INFERENCEs cite the FACTs they depend on. Use `**FACT:**` / `**INFERENCE:**` prefixes in prose, or structured table where convention is implicit.

### Four-state verdicts

- **CONFIRMED:** Landed as planned. All gates green.
- **SHIFTED:** Landed with documented deviation. Owner usually accepts.
- **REFUTED:** Claimed state ≠ disk. Audit blocks.
- **DEFERRED:** Work that transferred ownership to a named later phase.
- **BLOCKED:** Precondition missing; cannot proceed without owner.
- **HALTED:** Non-recoverable error mid-work.

### Append-only audits

Reports under `docs/_audits/` are never edited. Corrections = new reports referencing the prior.

### Append-only CI enforcement (mechanical)

The append-only invariant is mechanically enforced by `.github/workflows/audit-append-only.yml`. On every push, the check:

1. Loads every file under `docs/_audits/` at the most recent phase tag.
2. For each such file present at HEAD, asserts that the prior-tag content is a *prefix* of the HEAD content.
3. Net-new files at HEAD are allowed.
4. HARD_FAIL on any file whose prior-tag content has been edited or shortened.

This converts the append-only rule from honor system to git mechanics. The check ships in Phase 0 Block 5 (INTEGRITY) and is activated at Phase 0 Block 9 (LANDING).

### Ledger files vs cue files

Files under `docs/_audits/` partition into two classes:

- **Ledger files (`*.ledger.md`)** — append-only, immutable once committed. Each line records an outcome (block close, stage verdict, phase close) that the project refers back to indefinitely. The `audit-append-only.yml` workflow enforces the prefix-equality invariant on these files only.
- **Cue files (no extension, or `*.cue.md`)** — mutable transient state. Resumption hints, `CONTINUE_FROM` markers, in-flight progress notes. The workflow explicitly skips these files via a `grep -E '\.ledger\.md$'` filter on the `git ls-tree` output.

Phase progress tracking uses both:

- `docs/_audits/phase-<N>/ledger.md` — block / stage / phase close one-liners (append-only).
- `docs/_audits/phase-<N>/cue` — single-line continuation marker, overwritten as the agent advances through the phase.

Phase 0 used a single `progress.md` that mixed both kinds; the resulting `EDITED` HARD_FAIL against `v0.0.0-phase-0` is documented in `docs/_audits/phase-0/spec-amendments-proposed.md`. The convention applies from Phase 1 forward; `progress.md` is preserved as a historical record.

### Evidence-path verification (mechanical)

`tools/integrity/scripts/verify_evidence.py` reads any audit report and confirms:

1. Every path in front-matter `evidence_paths:` exists at the report's `head_sha`.
2. Every cited path is non-empty.
3. For paths the report attests to a hash for (front-matter `evidence_hashes:` map), the sha256 matches.

The script is run by the founder at every stage boundary before approving dispatch of the next stage, and by every phase-closing-audit agent before writing a CONFIRMED verdict. Sample invocation:

```
python -m integrity.scripts.verify_evidence \
    --audit docs/_audits/phase-2/stage-4-report.md \
    --strict
```

This converts "founder samples evidence" from a discretionary safety net into a mechanical pre-filter. Sampling for content quality happens on top of the mechanical floor.

### Cross-phase audit replay (mechanical)

`tools/integrity/scripts/replay_prior_phase.py` is Phase N+1's first stage's first action. It checks out the phase-N tag, re-runs the entire prior phase's CI gates, and compares the result to the verdicts asserted in the phase-N landing audit. Discrepancies trigger BLOCKED on Phase N+1; operator decides whether to repair Phase N's foundation.

Sample invocation:

```
python -m integrity.scripts.replay_prior_phase \
    --prior-phase phase-1 \
    --audit docs/_audits/phase-1/landing-<UTC>.md \
    --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

The gate list above is the canonical v2.4 set: the five legacy gates (integrity, pytest, equivalence, determinism, perf-ledger) plus the three v2.4 additions (property per § 2.14, mutation per § 2.13, tolerance-budget per § 2.6). Phase plans cite this same gate list from their cross-phase-replay invocations; do not vary the gate list across phase plans without amending this spec.

Cost: one full CI re-run per phase open (~10–30 minutes wall-clock, depending on phase scope). Benefit: it is the only mechanism that catches a falsely-CONFIRMED prior phase before its defects propagate.

### Canonical front-matter schema

```yaml
---
date: <UTC ISO 8601, e.g., 2026-06-01T14-30-00Z>
author: <agent-or-role-name>
phase: <integer phase number>
artifact: <one of: block | stage | task | wu | sub-phase | phase-landing>
artifact_id: <unique within phase>
verdict: <one of: CONFIRMED | SHIFTED | REFUTED | DEFERRED | BLOCKED | HALTED>
evidence_paths:
  - <repo-relative path>
evidence_hashes:
  - <repo-relative path>: <sha256>
head_sha: <40-char Git SHA at the time of report write>
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---
```

## G.7.5 — TDD discipline mechanical anchors (anchors spec § 1.3)

### Failing-tests output hash (Convention-A extension)

At the failing-tests commit (per Convention-A, before the implementation commit), the agent:

1. Runs the test suite and pipes verbatim stdout+stderr to `tools/testkit/failing-tests-evidence/<sim>-<variant>-<UTC>.txt`.
2. Computes the SHA-256 of the file: `sha256sum tools/testkit/failing-tests-evidence/<sim>-<variant>-<UTC>.txt`.
3. Includes both the file commit *and* a footer in the commit message:
   ```
   Failing-tests-output: tools/testkit/failing-tests-evidence/<sim>-<variant>-<UTC>.txt
   Failing-tests-output-hash: sha256:<full-64-char-hex>
   ```
4. The corresponding implementation commit (per Convention-A) MUST reference both fields in its footer:
   ```
   Implements-failing-tests-from: <failing-tests-commit-sha>
   Failing-tests-output-hash-witnessed: sha256:<same-hex>
   ```

Phase-closing audits use `tools/integrity/scripts/replay_failing_tests.py` to:
1. Check out the failing-tests-commit SHA.
2. Run the test suite.
3. Compare the verbatim output to the file at the recorded path.
4. Confirm the sha256 matches.

A mismatch means either: (a) the failing-tests commit was fabricated (no tests actually failed) or (b) the test suite has drifted since the commit (acceptable, but flagged as SHIFTED with explanation).

### Operator-only phase-tag pushing (anchors spec § 7.12)

Phase tags are pushed by the operator only. Agent identity (`claude-code-<role>@bit-physics.local`) is rejected by server-side hook. The agent's closing-audit report ends with:

```
Proposed tag: v0.<N>.0-phase-<N>
Tag commit SHA: <40-char>
Tag pushed: NO (operator action required)
```

The operator reviews, runs verify_evidence.py and (optionally) replay_prior_phase.py from the next phase's perspective, and then signs and pushes the tag:

```
git tag -s v0.<N>.0-phase-<N> <sha>
git push origin v0.<N>.0-phase-<N>
```

The signature on the tag is itself the operator's attestation that they reviewed the landing audit. The audit-trail records the tag's signer; any tag pushed without an operator signature is treated as malformed by `replay_prior_phase.py`.

## G.8 — Sandbox-probe-before-assert

**One-liner:** Role-agnostic. Before any assert/flag/skip decision, run the probe that would settle the question.

## G.9 — Strict-mode CI configuration (spec § 7.7)

**Python:** `ruff check --strict`, `mypy --strict`, `pytest -W error`.
**TypeScript:** `tsc --noEmit` strict; ESLint; Vitest `--reporter=verbose --bail=1`.
**C++:** `-Wall -Wextra -Wpedantic -Werror` for new code.
**Workflow YAML:** `actionlint`.

Soft-warn exceptions: noisy checks may run in soft-warn for one rule-of-three cycle; after three actionable findings, elevate to strict. Document exceptions in `docs/integrity/strict-mode.md`.

## G.10 — Trunk-based development (spec § 7.12)

All commits go directly to `main`. No protected branches, no feature branches, no long-lived development branches. Tag each phase-landing commit `v0.<N>.0-phase-<N>`. No `git rebase main` (nothing to rebase against). No `git push --force`.

### Server-side hooks (mechanical enforcement)

The convention items in D.8 are reinforced by server-side hooks (GitHub branch protection or platform equivalent). All HARD_FAIL:

| # | Rule | Implementation |
|---|---|---|
| 1 | No force-push to `main` | Branch protection: disallow force-push |
| 2 | No post-publication history rewrite | Branch protection: disallow non-fast-forward updates |
| 3 | No remote branches except `main` | Pre-receive hook rejects refs/heads/* other than main |
| 4 | Phase tags signed by operator only | Pre-receive hook checks `git verify-tag`; agent identity rejected |
| 5 | Audit append-only | `.github/workflows/audit-append-only.yml` per G.7 |
| 6 | Tolerance overrides within budget | `.github/workflows/tolerance-budget-check.yml` runs on every PR to `tolerance.toml` |

The mechanical floor reduces "trust the agent's report" to "trust the agent for things the floor doesn't catch." The list of things the floor catches grows phase by phase.

## G.11 — Sequential single-agent execution (spec § 7.13)

Each phase: one Claude Code agent role; auto-accept on; reads whole phase plan at session start; works through stages 1 → N in order; commits directly to `main`; reports at each stage close. Continuation sessions only on context-fill.

Forbidden: parallel agent dispatch across phases; multiple Claude Code sessions concurrently on the same repo.

## G.12 — Adding a new convention

1. Draft in phase-landing retro with discipline shape, failure mode, three independent contexts where it would have helped.
2. Next phase's pre-dispatch checklist confirms acceptance.
3. Promoted conventions extend Appendix G via append-only commit.

---

*End of document.*

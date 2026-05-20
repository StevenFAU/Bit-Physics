# Reaction-Diffusion 3D Implementation — Sub-Phase of Spec-Phase-1

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — gates 4–13 implementation for `reaction-diffusion-3d`, scoped under spec-Phase-1's full inventory.
> **Sub-phase identity:** Third per-sim implementation sub-phase under spec-Phase-1, per Phase 1 audit § 15 + closed-form sub-phase audit § 10 + agent-based sub-phase audit § 10. The original ordering bundled RD-3D with `sph-water` as a single "continuous-CA + sph-water" sub-phase; the operator has SCOPE-DECOMPOSED that bundle (see § 1.2). This document plans the **first** sub-sub-phase (RD-3D only); a sibling sub-phase plan (`docs/phases/sub-phase-particle-fluids-sph-water.md`) is drafted later in a separate session for sph-water. This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries (next phase tag: `v0.2.0-phase-2`). No `-phase-N` tag is proposed; see § 5 + § 11.4 for tag posture.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.4 (manufactured solutions / OOA), 2.5, 2.6, 2.7, 2.13 (mutation), 2.14, 2.15, 3.5, 4.3 (Stack C), 5.2.1, 5.5, 7.12, 7.13, 11.2, 11.7 + Appendix D § D.2.3.
> **Parent charters:** `docs/phases/phase-1-plan.md`. **Parent sub-phase templates:** `docs/phases/sub-phase-closed-form.md` + `docs/phases/sub-phase-agent-based.md` (the most recently refined template — adapt). This sub-phase inherits role model, IC contracts (with substack pivots in § 3), audit / append-only discipline, checkpoint discipline, problem-solving playbook (Phase 1 § 9 + closed-form P21 + agent-based P22), conventions, the three-stage cadence, the determinism-strategy-declaration discipline (agent-based § 1.4), and the gate-13 worktree replay pattern (closed-form Stage 1 S5) wholesale; this plan records only the deltas plus one new playbook entry (P23, mandatory) and the scope-decomposition reasoning.
> **Parent audits / pre-conditions (FACT):**
> - Spec-Phase-1 landed at `v0.1.0-phase-1` (SHA `9998bc1`); landing audit `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` verdict-state CONFIRMED.
> - Closed-form sub-phase landed at SHA `2cc0f21`; landing audit `docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md` verdict-state CONFIRMED.
> - Agent-based sub-phase landed at SHA `739c93f` (post-Convention-#12 SHA back-fill on `714e60d`); landing audit `docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md` verdict-state CONFIRMED.
> **Inherited shifts:** 42 documented to date (21 Phase 1 audit § 14 + 6 closed-form Stage 1 + 5 closed-form Stage 2 + 8 agent-based Stage 1 S1–S8 + 2 agent-based Stage 2 N1–N2). Carried forward by reference; not re-stated, not re-litigated.
> **Date drafted:** 2026-05-20.
> **Status:** dispatch-ready.

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase is

This sub-phase takes **reaction-diffusion-3d** from spec-Phase-1's gates 1–3 (5 spec docs + MMS-solution co-bundle + probe + 4 failing tests, committed at SHA `a159086`) through gates 4–13 of spec § 3.5. Per Phase 1 audit § 15 + agent-based audit § 10, RD-3D is the third per-sim implementation surface and the **first** to exercise:

1. **MMS-based gate 5** (code verification of solutions). Closed-form and agent-based shipped gate 5 against golden tables. RD-3D ships a 3-grid convergence study against the manufactured solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`, asserting observed OOA matches the formal order $p_{\mathrm{formal}}=2$ within $\pm 0.5$ (spec § 2.4 / RD-3D spec-ref § 6.1).
2. **The continuous-CA / `reaction-diffusion` category** at sim-test scale (spec § 5.2.1, § 5.5). Phase 0 RD-2D shipped before the MMS-gate discipline was added (R8 amendment); RD-3D is the first sim to enter implementation with a Phase-1-co-bundled MMS in hand.
3. **B17 PATH-A** as load-bearing work (per agent-based audit § 7.6 routing). See § 1.5 and § 4.3 Step 2.7.

At close, RD-3D ships all 13 gates GREEN. The four remaining Phase 1 sims (`eulerian-smoke`, `lattice-boltzmann-d3q19`, `mpm-multimaterial`, `sph-water`) remain at their `v0.1.0-phase-1` RED bootstrap state pending their own per-sim implementation sub-phases. The 13-gate posture, per-sim acceptance contract, three-stage cadence, audit / append-only discipline, checkpoint discipline, conventions, and problem-solving playbook are all inherited from `sub-phase-agent-based.md` (the most-recent template). This document records only the deltas.

### § 1.2 What this sub-phase is NOT — operator scope-decomposition decision

The original ordering bundled RD-3D with `sph-water` as a single "continuous-CA + sph-water" sub-phase (Phase 1 audit § 15 row 3; agent-based audit § 10 row 1; agent-based audit § 11.2). The operator has **scope-decomposed** that bundle into two distinct sub-sub-phases:

- **THIS plan (sub-sub-phase A):** reaction-diffusion-3d only.
- **Sibling plan (sub-sub-phase B), drafted later in a separate session:** sph-water only (file: `docs/phases/sub-phase-particle-fluids-sph-water.md`).

**Rationale for the split (recorded as operator decision, not re-litigated downstream):**

1. **Distinct sim-spec categories.** RD-3D is `continuous-CA` (spec § 5.2.1); sph-water is `particle-fluids` (spec § 5.5). The Cat 3 sibling-subdir tuple `_SUBDIRS_PICKED_UP` enumerates them as independent rows; bundling them adds no Cat-3-anchor amortization (RD-3D has no golden, sph-water does).
2. **Distinct IC contracts.** RD-3D consumes Phase-0 `scalar_field` tier-2 (advisory `check_conservation`) per probe § 2 + spec-ref § 10; sph-water consumes IC-5 (particle tier-2) plus the Phase-0-vendored SPlisHSPlasH DFSPH manifest. Cognitive surface is disjoint.
3. **Distinct verification structure.** RD-3D ships gate 5 against MMS with formal OOA discipline; sph-water ships gate 5 against DFSPH density-evolution goldens vs. the vendored kernel reference. Conflating them in a single Stage 1 commit-message footer would obscure both contracts.
4. **B17 PATH-A scope.** Per agent-based audit § 7.6, B17 PATH-A ownership is now explicitly assigned to continuous-CA (RD-3D). Doing the per-target mutation-runner infrastructure work against RD-3D's MMS pipeline ALONE — without sph-water's vendored-kernel mutation surface — keeps PATH-A's scope tight at this sub-phase and amortizes the rework forward to sph-water and the subsequent four sims.

The bundled scope flag from agent-based audit § 11.2 is therefore resolved by **decomposition**, not by single-bundle execution.

Additional out-of-scope items inherited:

- A new spec-phase. The next spec-phase tag per spec § 7.12 is `v0.2.0-phase-2`; intermediate per-sim implementation work accumulates to `main` without a `-phase-N` tag (see § 5 + § 11.4).
- Implementation of any other Phase 1 sim.
- Cross-stack replication (Phase 2). The Stack C C++/CMake build path + Vulkan local invocation are explicitly Phase-2+ per RD-3D spec-ref § 11 ("Phase 2+ adds the C++ build (CMake) + Vulkan local invocation"); this sub-phase ships the **Python NumPy reference + sim runner + invariants + Hypothesis PBT + canonical capture + perf-ledger row** — see § 1.4 for the language-pivot re-anchor.
- Editing any Phase 0, Phase 1, closed-form, or agent-based sub-phase artifact. Audit chain is append-only.

### § 1.3 Honesty caveats — assumptions Stage 0 will re-anchor

Drafted against HEAD = `739c93f` (post-agent-based SHA back-fill). Working assumptions to be re-anchored at Stage 0 / Stage 1 start:

- Sim package at `packages/reaction-diffusion-3d/` ships a Phase-1-committed intentionally-empty `reaction_diffusion_3d/__init__.py` plus failing tests at `tests/test_{determinism,diagnostics,mms_convergence,pbt_invariants}.py` importing `reaction_diffusion_3d.{reference,sim,invariants}` (FACT at HEAD — verified before drafting).
- MMS solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/solution.py` exposes `GrayScott3DSolution` with `evaluate(x,y,z,t)`, `source_term(x,y,z,t)`, `boundary_conditions()`, `formal_spatial_order == 2`; SymPy-verified at the canonical test point within `1e-14` per Phase 1 Stage 2 commit `a159086` (FACT at HEAD).
- Co-bundled RD-2D MMS solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/` (charter R8 amendment); same SymPy precision (FACT at HEAD). See § 1.6 for the scope question this surfaces.
- Phase 1 failing-tests-evidence sha256 (FACT — Phase 1 landing audit § 5 / `evidence_hashes:`):
  `tools/testkit/failing-tests-evidence/reaction-diffusion-3d-2026-05-20T13-26-32Z.txt` → `sha256:b3165ab1cd0b69d816fce8ffcdb4436d619f01c5ecfa7942eb77c4aeb2514b96`.
- Phase 1 TDD bootstrap SHA for RD-3D is `a159086` (FACT — Phase 1 audit § 4). This is the gate-13 worktree replay anchor.
- Canonical capture descriptor per spec Appendix D § D.2.3 / Phase 1 probe report § 4: `gray-scott-lambda-64cube-seed42-step2000`. (Re-anchor at Stage 1 step 3 against the Appendix D row to handle any probe-vs-spec drift in the same spirit as agent-based Stage 1 S4 / charter § 9 R9.)
- PBT invariants declared in RD-3D spec § 6.6: `monotone_bounds` ($u, v \in [0, 1]$); `periodic_bc_satisfied` (opposite-boundary equality to machine precision).
- IC contracts at HEAD per probe § 1–2 + § 3 below: Phase-2+ Stack-C `common-cpp` consumption is **deferred to Phase 2+**; this sub-phase ships Python and consumes IC-2 (Python capture) + IC-4 (Python determinism) + `diagnostics.tier2.scalar_field.*` (Phase 0 surface). See § 1.4 for the Stack-C language-pivot re-anchor.

Re-anchor drift → SHIFTED per parent playbook P1 / P14; HEAD wins.

### § 1.4 Stack-C language-pivot re-anchor — this sub-phase ships Python, not C++

**Re-anchor finding (load-bearing for the agent — surface to operator at closing summary):** Phase 1 landing audit § 11.2 row 3 + § 15 row 3 framed continuous-CA as "first Stack C work; exercises common-cpp's IC-1 + IC-3 at sim-test scale." Reading at HEAD reveals this framing is **aspirational** with respect to what this sub-phase actually delivers:

1. The Phase 1 failing tests for RD-3D at `packages/reaction-diffusion-3d/tests/test_*.py` import Python modules (`reaction_diffusion_3d.{reference,sim,invariants}`) and run under pytest, **NOT** doctest / ctest / CMake (FACT at HEAD).
2. The RD-3D pre-implementation probe report § 1 states verbatim: "Phase 2+ Stack C consumes `common-cpp` for capture I/O + determinism" — i.e., consumption is Phase-2+, NOT this sub-phase.
3. RD-3D spec-ref § 11 states verbatim: "Phase 1 — failing-tests only … Phase 2+ adds the C++ build (CMake) + Vulkan local invocation."
4. Phase 1 audit shift #15 (Stage 2): "Stack C sims use Python pytest at TDD-bootstrap level" and B14 resolved with "per-sim implementation phase adds CMake/ctest" — this leaves open WHEN the CMake/ctest landing happens, but the actual test surface still imports Python modules at HEAD, and the spec-ref § 11 partition is the load-bearing contract.

**Decision:** this sub-phase ships the **Python NumPy reference** (`reaction_diffusion_3d.reference`, `.sim`, `.invariants`) — fully parallel to the agent-based sub-phase's Python-reference + Phase-2+-Stack-deferral split. The Stack C C++ / Vulkan / CMake path remains Phase-2+ scope per spec-ref § 11. The "first common-cpp exercise" framing from Phase 1 audit § 11.2 row 3 is re-anchored here as a **forward-looking aspiration** — it is not load-bearing for sub-phase acceptance.

This decision MUST be surfaced to the operator at the closing summary as a re-anchor finding for explicit confirmation (an operator-routable item; § 11.5 banks the alternative "land a C++ port now" path if the operator overrides).

### § 1.5 Determinism posture — Python NumPy on a 7-point stencil

RD-3D's determinism declaration at `docs/sim-specs/continuous-ca/reaction-diffusion-3d/determinism.md` is `bit-exact-same-stack-same-hw` for the Stack-C C++/Vulkan implementation. For the **Python NumPy reference shipped at this sub-phase**, the determinism strategy is materially simpler than agent-based — RD-3D has no atomic scatter-add (the 7-point stencil writes are per-cell from read-only neighbors), no global reductions per step, and no neighbor-enumeration ordering. The only credible sources of nondeterminism are:

1. **NumPy default RNG global state** if IC sampling at `evolve` start uses `np.random.*` instead of `np.random.default_rng(seed)`. Mitigation: ban bare `np.random.*` in `reference` / `sim`; thread the seed through `common_py.determinism.Config`.
2. **BLAS thread-count drift** in any matmul-like helper (unlikely in a 7-point stencil; mitigated by sticking to elementwise NumPy operations + `np.roll` / slicing for periodic BCs).
3. **FMA fusion** across rebuilds — extremely rare in pure NumPy; mitigation deferred to Phase-2+ Stack-C concerns per spec-ref § 8.

**Stage 1 discipline (inherited from agent-based § 1.4 — load-bearing):** before drafting RD-3D's implementation, the agent writes the determinism-strategy declaration as a docstring at the top of `reaction_diffusion_3d.sim` and cites which determinism.md clauses are implemented + which are deferred to Phase-2+. The Stage 1 commit-message footer cites the docstring as a load-bearing artifact. See § 7.2 for the verbatim instruction.

### § 1.6 RD-2D MMS-co-bundle scope question — banked to Stage 0 surfacing

Phase 1 Stage 2 R8 amendment landed the **RD-2D MMS solution** at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/` as a co-bundle with the RD-3D bootstrap (Phase 1 audit shift #18-ish, commit `a159086`). RD-2D itself shipped complete in Phase 0 with all 13 gates GREEN — but gate 5 (verification of solutions) at Phase 0 used the pre-R8 posture, NOT the post-R8 MMS-OOA-discipline that this sub-phase pioneers.

**Open question for Stage 0 surfacing:** does the regression sweep at Stage 2 step 2.2 include running RD-2D's existing test suite against the RD-2D MMS solution (i.e., adding a `test_mms_convergence.py` to the RD-2D package and asserting RD-2D's reference satisfies the 2D MMS with formal OOA within $\pm 0.5$)?

Two readings:

- **(a) In-scope for this sub-phase.** RD-2D and RD-3D share the same `reaction-diffusion` category; the 2D MMS was specifically co-bundled with RD-3D's bootstrap as a forward-looking deliverable. Including a 2D MMS-OOA regression check here amortizes the MMS-pipeline development at one sub-phase.
- **(b) Phase-0-deliverable verification, already complete.** Phase 0 RD-2D's gate 5 was accepted via golden-table verification; the MMS at HEAD is **co-bundled for future use** but not a Phase-0 gate. Re-verifying RD-2D's reference against the 2D MMS is a Phase-0-retroactive enhancement, properly scoped to a follow-up Phase-0-amendment sub-phase OR to the future spec-Phase-2 cross-stack effort.

**Plan-side decision:** Stage 0 Task 0.3 (new — see § 4.1) explicitly inspects the RD-2D package + 2D MMS at HEAD and surfaces the reading to the operator. **Default lean: (b) Phase-0-deliverable, out-of-scope for this sub-phase's Stage 2 sweep**, because (i) it constitutes net-new test infrastructure for a sim that already shipped GREEN; (ii) Convention A (additive edits to pre-existing files only) would be strained by adding a `test_mms_convergence.py` to a Phase-0-protected package; (iii) operator scope discipline historically favors keeping per-sim implementation sub-phases tight. The Stage 0 surfacing lets the operator route at dispatch time.

### § 1.7 Role model, conventions, audit discipline

Inherited from `sub-phase-agent-based.md` § 1.5 + § 7 standing orders + § 8 + § 10. Single Claude Code agent at a time; single Claude.ai coordinator chat; one operator. Doubled-directory paths, additive-edits-only on pre-existing files, Convention #12 SHA back-fill at EVERY stage close (closed-form audit § 8.2 N2 / inherited).

### § 1.8 Architecture — three stages

- **Stage 0 — Pre-flight.** Cross-phase audit replay against `v0.1.0-phase-1` (per charter § 11.4 — agent-based + closed-form sub-phases are siblings, not parents); tolerance-budget carryover to `sub-phase-continuous-ca-rd3d`; re-verify Phase 1 RD-3D failing-tests evidence sha256; **surface the RD-2D MMS regression-scope question** per § 1.6 (new Task 0.3).
- **Stage 1 — Per-sim implementation (one session).** **ONE sim** (RD-3D); single sub-bundle commit covering gates 4–13. Expect this Stage 1 to be heavier than agent-based's Stage 1 due to (a) MMS pipeline integration for gate 5, (b) 3D grid sim (larger compute), (c) first-of-kind formal-OOA verification harness. **Scope warning:** if Stage 1 does not fit one session, the agent stops at a clean checkpoint and the operator dispatches a continuation session under the `agent-based-stage1-...` precedent (closed-form audit § 8.1 partial-checkpoint pattern).
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive, Cat 3 NO-OP for continuous-ca since RD-3D ships no golden — see § 4.3 Step 2.3), integrity sweep, gate-13 replay verification, **B17 PATH-A load-bearing work** (per-target mutation-runner infrastructure + first real kill-rate baseline), mutation artifact, sub-phase landing audit, Convention #12 SHA back-fill. **No tag is prepared**; optional `v0.1.3` non-phase point-release tag banked for operator (default lean: no tag).

---

## § 2. Deliverables (by gate, single sim)

The 13-gate per-sim acceptance contract is inherited verbatim from `sub-phase-closed-form.md` § 2 / `sub-phase-agent-based.md` § 2. Deltas for RD-3D:

| # | Deliverable |
|---|---|
| 4 | (Gate-4 closed-form-golden NOT applicable for RD-3D — no golden table; see RD-3D spec-ref § 7. The "code verification of methods" reads through to the gate-5 MMS for this sim.) |
| 5 | **MMS-based code verification** — `tests/test_mms_convergence.py::test_mms_observed_ooa_matches_formal_within_half_an_order` GREEN. 3-grid convergence study against `GrayScott3DSolution`; observed OOA within $\pm 0.5$ of formal $p=2$ per spec § 2.4. Stage 1 records the convergence-rate ladder ($h_1, h_2, h_3$ → observed-OOA) in the landing audit. |
| 6 | Tier 1 NaN/Inf scan over the canonical-trajectory output (`test_diagnostics.py::test_tier1_health_no_nan_inf` GREEN). |
| 7 | Tier 2 scalar_field — `test_tier2_scalar_field_bounds_u_in_unit_interval` + `..._v_..._unit_interval` GREEN (`diagnostics.tier2.scalar_field.check_bounds`); `test_tier2_scalar_field_conservation_advisory` GREEN as **advisory** (Gray-Scott is non-conservative per RD-3D spec-ref § 10 — record drift, don't block; mirror the agent-based S8 inline-recurrence pattern if `check_conservation`'s mass-equality semantics don't fit). |
| 8 | Cat 1 citations — Gray & Scott 1983 (DOI 10.1016/0009-2509(84)87017-7), Pearson 1993 (DOI 10.1126/science.261.5118.189), Roy 2005 (DOI 10.1016/j.jcp.2004.10.017) docstring citations resolve. |
| 9 | Cat 2 public API — `reaction_diffusion_3d.{reference,sim,invariants}` symbols expose probe § 5 contract: `reference.{gray_scott_step_with_source, canonical_params, evolve}`; `sim.sim_runner_seeded` (matching testkit `SimRunner` Protocol); `invariants.{monotone_bounds, periodic_bc_satisfied}`. |
| 10 | Canonical capture — `captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.{h5,json}` per Appendix D § D.2.3 (Stage 1 step 3 re-anchors the descriptor name against Appendix D in case of probe-vs-spec drift per § 1.3). Capture-writer surface: `tools/testkit/capture` (same as agent-based per closed-form S6). |
| 11 | Determinism (`test_run_twice_bit_exact`) GREEN via `run_twice_and_diff` against the canonical capture descriptor — Python-NumPy bit-exact on same hardware per § 1.5. |
| 12 | Hypothesis tests for the 2 invariants declared in RD-3D spec § 6.6 (`monotone_bounds`, `periodic_bc_satisfied`). Commit the `.hypothesis/` example database per spec § 2.14. |
| 13 | Perf-ledger first-landing row appended for `(reaction-diffusion-3d, stack-b-py-ref, gray-scott-lambda-64cube-seed42-step2000)`. Mirror `hardware_id` format established by closed-form S2 / agent-based row (e.g., `i7-12700KF-linux-6.17`); re-anchor at Stage 1. Expect significantly slower wall-clock than agent-based 1000-agent boids (≈17 s) — 3D-grid stencil over 64³ × 2000 steps will likely sit in the 60–300 s range on the i7-12700KF; the perf-ledger captures whatever is observed (non-blocking; surfaces at landing-audit review per `docs/perf-ledger.md` preamble). |
| 13 (gate-13 anchor) | Phase 1 evidence `reaction-diffusion-3d-2026-05-20T13-26-32Z.txt` (sha256 `b3165ab1…2514b96`) still matches; worktree replay at SHA `a159086` reproduces 4 `ModuleNotFoundError` collection-errors; HEAD GREEN. |

(Note: this sim ships ONE canonical capture, NOT two like boids-3d. The Appendix D § D.2.3 row for RD-3D carries a single descriptor.)

**B17 PATH-A deliverables (Stage 2 step 2.7 — LOAD-BEARING, not banked):**

- Per-target mutation-runner infrastructure: additive `mutmut-config.toml` entries for the new per-sim targets (RD-3D source `reaction_diffusion_3d.{reference,sim,invariants}`; the RD-3D MMS pipeline `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`).
- uv-workspace runner integration so each per-target mutmut invocation resolves member imports correctly (this is the specific runner-rework that closed-form audit § 7.6 + agent-based audit § 7.6 deferred).
- First real per-target kill-rate baselines (NOT framework-validated carry-forward). Threshold floor per spec § 2.13; capture observed kill-rate in mutation artifact JSON.
- Mutation artifact at `tools/testkit/mutation/sub-phase-continuous-ca-rd3d-<UTC>.json` with **real** kill rates + per-target rows.

Acceptance for "sub-phase complete": all 13 gates GREEN for RD-3D; Cat 1/2/3/4/5/X GREEN at HEAD (or DEGRADED-PASS with explicit per-deferral rationale); B17 PATH-A real mutation artifact committed (NOT a re-bank); landing audit committed; SHA back-fill committed. **No `-phase-N` tag is pushed**; optional non-phase point-release tag (`v0.1.3`, no suffix) is a banked operator decision (§ 5 / § 11.4).

---

## § 3. IC contracts inherited (not redefined)

- **IC-2** (capture I/O Python) — `common_py.capture.Writer` / `tools/testkit/capture` writes the canonical capture. Inherits closed-form S6 equivalence at HEAD.
- **IC-4** (determinism config Python) — `common_py.determinism.Config` plumbs seed. Load-bearing for gate 11 (Python NumPy bit-exact).
- **`diagnostics.tier2.scalar_field`** (Phase-0 substack) — consumed by `test_diagnostics.py`: `check_bounds` load-bearing; `check_conservation` advisory (Gray-Scott non-conservative). NOT a new IC — established at Phase 0 for RD-2D.
- **`tools/testkit/code_verification/mms/`** infrastructure (Phase 0 / Phase 1 surface): `solutions/reaction_diffusion_3d/{solution.py, derivation.md}` is the contract for gate-5 MMS verification; the runner / analyzer / derive helpers at `tools/testkit/code_verification/mms/{runner.py, analyze.py, derive.py}` provide the convergence-study scaffolding (verify the actual call-site shape at Stage 1 start before consuming).
- **IC-8** (probe report) — `tools/testkit/probes/reports/reaction-diffusion-3d.md` § 5 is the public-API contract.
- **IC-9** (phase audit body) — sub-phase checkpoint + landing audits follow Phase 1 charter § 3.9 structure.
- **IC-10** (spec § 6 verification posture) — pinned at Phase 1; this sub-phase implements against it (specifically § 6.1 MMS).

**IC substack pivots vs the prior sub-phases:**

- Closed-form sub-phase: IC-7 (`closed-form` tier-2).
- Agent-based sub-phase: IC-5 (`particle` tier-2).
- This sub-phase: **`scalar_field` tier-2 (Phase-0 surface)** — neither IC-7 nor IC-5. Gate 5 also pivots from golden-table to MMS for the first time.

**Out of scope for this sub-phase (Phase-2+ scope per § 1.4 + RD-3D spec-ref § 11):** IC-1 (capture C++), IC-3 (determinism C++), IC-6 vector_field (the probe report § 2 lists `check_divergence_free` as optionally consumable, but RD-3D's u/v are scalar fields — the optional consumption is for visualization checks on gradient fields, deferred to Phase-2+ when the Stack-C visualization pipeline lands).

No new ICs at this sub-phase. Stage 0 replay against the 8-gate set catches any consumed-surface drift.

---

## § 4. Stage decomposition

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay (8-gate canonical set).**
  ```
  uv run python -m integrity.scripts.replay_prior_phase \
    --prior-phase phase-1 \
    --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
    --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
  ```
  Replay target is `phase-1` → `v0.1.0-phase-1` per the `_resolve_phase_handle` single-integer regex; **NOT** against closed-form or agent-based sub-phases (charter § 11.4 — siblings, not parents). Exit 0 → proceed. Exit 1 → BLOCKED (parent playbook P20); write `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-blocked-replay-<UTC>.md`.

- **Task 0.1 — Tolerance-budget carryover.** Edit `tools/testkit/equivalence/tolerance-budget.toml`: set `[phase].phase = "sub-phase-continuous-ca-rd3d"`, bump `opened_at`. NO `[budgets.*]` widening. Commit: `chore(continuous-ca-rd3d-stage0-tolerance-budget): sub-phase carryover from phase-1`.

- **Task 0.2 — Re-verify Phase 1 failing-tests evidence sha256.** Hash `tools/testkit/failing-tests-evidence/reaction-diffusion-3d-2026-05-20T13-26-32Z.txt`; compare to the Phase 1 landing audit's `evidence_hashes:` value (`b3165ab1…2514b96`). Mismatch → BLOCKED (gate-13 precondition).

- **Task 0.3 (NEW THIS SUB-PHASE) — RD-2D MMS regression-scope surfacing.** Per § 1.6: inspect `packages/reaction-diffusion-2d/tests/` and `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/` at HEAD; record whether RD-2D's existing test suite currently exercises the 2D MMS, and surface to the operator with the default-lean recommendation (Reading (b): Phase-0-deliverable verification, out-of-scope for this sub-phase's Stage 2 sweep). If the operator routes Reading (a) at dispatch time, the Stage 1 plan absorbs a 2D regression task; if Reading (b), the question is recorded as a banked Phase-0-amendment candidate and Stage 1 / Stage 2 proceed unchanged. Decision recorded in Stage 0 checkpoint.

- **Closing.** `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-checkpoint-<UTC>.md` per IC-9 abbreviated structure. Front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` (Phase 1 shift #19 + closed-form audit § 8.2 N2 lesson). Commit: `chore(continuous-ca-rd3d-stage0-checkpoint): Stage 0 pre-flight complete`. Apply Convention #12 SHA back-fill at close if the closing-commit SHA differs from the audit's `head_sha:`: NEW commit `chore(continuous-ca-rd3d-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`.

### § 4.2 Stage 1 — Per-sim implementation (one session; scope-warning per § 1.8)

ONE sim (RD-3D). Single sub-bundle commit covering gates 4–13. Per-sim 8-step sequence inherited from `sub-phase-agent-based.md` § 4.2, with the deltas below.

1. **Determinism-strategy declaration first** (per § 1.5 — agent-based § 1.4 inheritance). Before any implementation: write the determinism strategy as a docstring at the top of `reaction_diffusion_3d.sim`. Cite which determinism.md clauses are Python-implemented vs Phase-2+-deferred (Stack-C atomics / driver FMA fusion / Vulkan subgroup-collectives — explicitly deferred). Cite the docstring in the Stage 1 commit-message footer.

2. **Implement.** `reaction_diffusion_3d.reference` (`gray_scott_step_with_source(u, v, params, source) -> (u_next, v_next)`; `canonical_params() -> dict`; `evolve(seed, n_steps) -> (u_final, v_final)`); `reaction_diffusion_3d.sim` (`sim_runner_seeded(seed: int, out_dir: Path) -> Path`); `reaction_diffusion_3d.invariants` (`monotone_bounds`, `periodic_bc_satisfied`). Use elementwise NumPy + `np.roll` / slice-based periodic BCs to avoid BLAS-thread-count drift per § 1.5.

3. **Gate-5 MMS verification (FIRST-OF-KIND — see playbook P23 § 9.1 if it fails to converge).** Wire `test_mms_convergence.py` to a 3-grid convergence study against `GrayScott3DSolution`: pick a grid ladder (e.g., $N \in \{16, 32, 64\}$ on the unit cube); compute observed OOA from the per-grid error reductions; assert observed OOA matches formal $p=2$ within $\pm 0.5$ per spec § 2.4 + RD-3D spec-ref § 6.1. Record the convergence-rate ladder ($N_i$, $h_i$, $\|e_i\|_2$, observed-OOA pair-wise) in the Stage 1 commit-message footer + Stage 1 checkpoint § 3.

4. **Run `pytest packages/reaction-diffusion-3d/tests/ -v`** → all 4 test files GREEN. Capture verbatim to `tools/testkit/failing-tests-evidence/reaction-diffusion-3d-implemented-<UTC>.txt`; sha256 it. Phase 1 RED evidence UNTOUCHED (gate-13 anchor).

5. **Produce canonical capture (gate 10).** ONE capture: `gray-scott-lambda-64cube-seed42-step2000` per Appendix D § D.2.3 (re-anchor at step start per § 1.3). Use `sim_runner_seeded`; write `captures/reaction-diffusion-3d-ref/<descriptor>.{h5,json}`. Same capture-writer surface as agent-based (closed-form S6 / `tools/testkit/capture`).

6. **Determinism (gate 11).** Capture-twice-and-diff via `tools/testkit/determinism/`. `test_run_twice_bit_exact` GREEN — bit-exact on same hardware per § 1.5. (No advisory chaotic-regime variant analogous to physarum; RD-3D's Python NumPy reference is straightforwardly bit-reproducible.)

7. **PBT (gate 12).** Hypothesis tests for `monotone_bounds` (random IC in $[0,1]^2$ for $(u,v)$, small step count, assert bounds remain) and `periodic_bc_satisfied` (assert opposite-boundary cells agree to machine precision after a step). Commit the `.hypothesis/` example database per spec § 2.14.

8. **Perf-ledger row (gate 13).** Append one row per descriptor for RD-3D. Mirror `hardware_id` format from closed-form S2 / agent-based; re-anchor at Stage 1 against the actual hardware. Expected wall-clock range per § 2.

9. **Gate-13 worktree replay verification.** `git worktree add /tmp/bp-replay-a159086-rd3d a159086` (closed-form Stage 1 S5 / agent-based S5 inherited — NOT partial checkout; worktree is the validated form). Run `PYTHONPATH=. uv run pytest packages/reaction-diffusion-3d/tests/ -v` in the worktree; sha256 the output; assert the failure-mode matches the Phase 1 RED evidence file's failure-mode (4 `ModuleNotFoundError` collection-errors; pytest summary `4 errors in <t>s`). Remove the worktree (`git worktree remove --force`).

10. **Commit.** `feat(continuous-ca-rd3d-stage1): implementation through gate 13`. Footer cites: Phase 1 RED evidence + sha256, new GREEN evidence + sha256, capture sidecar paths (with sha256 of the `.h5`), perf-ledger wall_clock_seconds, **determinism-strategy declaration summary**, **gate-5 MMS convergence-rate ladder summary** (the load-bearing first-of-kind artifact for this sub-phase).

**Closing.** `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-1-checkpoint-<UTC>.md` per IC-9. Body: 13-row gate-status table + capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + determinism-strategy declaration summary + **MMS convergence-rate ladder** + SHIFTED / banked items (especially B17 PATH-A status pre-Stage-2 + Cat 3 NO-OP confirmation per § 4.3 Step 2.3 + RD-2D MMS regression-scope Stage 0 disposition). Front-matter: both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(continuous-ca-rd3d-stage1-checkpoint): Stage 1 per-sim implementation complete`. Apply Convention #12 SHA back-fill if needed (closed-form § 8.2 N2 lesson).

**Continuation discipline.** If Stage 1 runs long, stop at a clean checkpoint after step 4 OR after step 6 (the two natural cut-points: "tests GREEN, capture not yet produced" vs "capture produced, PBT not yet GREEN"). Continuation prompt with `continuous-ca-rd3d-stage1-...` slug per inherited closed-form / agent-based pattern.

### § 4.3 Stage 2 — Landing (single session if Stage 1 was clean)

Inherits `sub-phase-agent-based.md` § 4.3 Steps 2.1 → 2.11 structure. Deltas:

- **Step 2.1 — Closing-commit anchor re-check** (Convention 7.9). Re-grep every concrete path / SHA / sha256 across this plan + Stage 0 / Stage 1 checkpoints + agent-based + closed-form landings (input contracts). Drift → SHIFTED addendum.

- **Step 2.2 — Test sweep.**
  - **Positive:** RD-3D GREEN at HEAD; closed-form pair STILL GREEN; agent-based pair STILL GREEN; Phase 0 RD-2D GREEN; `tools/{integrity,diagnostics,testkit}` GREEN. Apply Stage-1 closed-form N1 (one package at a time per shared `conftest`).
  - **Negative:** the four remaining Phase 1 sims (eulerian-smoke, lattice-boltzmann-d3q19, mpm-multimaterial, sph-water) still RED with `ModuleNotFoundError` on their respective `{reference,sim,invariants}` triples (unaffected). Five-sim negative list becomes four-sim.
  - If Stage 0 routed RD-2D MMS regression Reading (a), Stage 2 additionally runs the RD-2D MMS-convergence test; if Reading (b), unchanged.

- **Step 2.3 — Integrity sweep (Cat 1, 2, 3, 4, 5, X) + Cat 3 continuous-ca disposition.**
  - **Cat 3 for the `continuous-ca` golden subdir is a NO-OP this sub-phase.** Reason (FACT at HEAD): RD-3D ships no golden table — its gate 5 is MMS-based per RD-3D spec-ref § 7. The `tools/testkit/golden/tables/continuous-ca/` subdir does not exist at HEAD and is not created by this sub-phase. `_SUBDIRS_PICKED_UP` at `tools/integrity/integrity/cat3_numerical/golden_values.py` is **NOT extended** for `continuous-ca` (no rows to recurse into). The Cat 3 sweep recurses into `closed-form/` (closed-form-sub-phase pickup) + `agent-based/` (agent-based-sub-phase pickup) as already wired; RD-3D contributes no AUDIT_LOG rows.
  - **Operator-routable alternative (banked, default skip):** if the operator wants this sub-phase to PRE-CREATE an empty `continuous-ca/` subdir + add `Path("continuous-ca")` to `_SUBDIRS_PICKED_UP` as a placeholder-for-future-sims, that's an additive-but-useless-at-HEAD change; default lean is to skip and let the eulerian-smoke / LBM sub-phase create the subdir when its first golden lands. Recorded in landing audit § 9 as a banked operator option.
  - **Cat 3 evaluator-shim banking:** continues to inherit closed-form audit § 9 + agent-based audit § 9.2 (four AUDIT_LOG rows pending shims). Out of this sub-phase's scope (still no Stack-B WGSL evaluator at HEAD per agent-based § 9.2 rationale; RD-3D's MMS is the de-facto evaluator out-of-band via gate 5).

- **Step 2.4 — Evidence-path verification.** `verify_evidence --strict` over all new sub-phase audits. `sha256:HEX` prefix tolerance (closed-form Stage 2 N3 / commit `3b79cfa`) inherited.

- **Step 2.5 — Gate-13 replay verification.** Re-run Stage 1 step 9 from the landing perspective (worktree at `a159086`); record both RED-replay outcome and HEAD-GREEN outcome as FACT in the landing audit. Worktree removed post-replay.

- **Step 2.6 — Append-only check.** CI semantics + strict-mode. The append-only protected set now includes Phase 0 + Phase 1 Stage 3 audits + the closed-form sub-phase's audit chain (`2cc0f21`) + the agent-based sub-phase's audit chain (`739c93f`). No edits to any file present at any of those SHAs within those protected paths.

- **Step 2.7 — Mutation-score artifact (B17 PATH-A — LOAD-BEARING this sub-phase).** Per agent-based audit § 7.6 + Phase 1 audit § 13, B17 ownership is now explicitly assigned to this sub-phase. **PATH-A is the assignment**; the decisions at Stage 2 are HOW to structure the per-target runners + which targets to mutate first (NOT whether to do PATH-A).
  - **Target list (lean):** start with three first-pass targets, additive to existing `mutmut-config.toml`:
    1. `reaction_diffusion_3d.{reference,sim,invariants}` (Python source, ~50–200 LOC after Stage 1).
    2. `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/{solution.py,__init__.py}` (Python MMS surface — mutating this validates that gate-5 catches MMS-regression).
    3. (Optional first-target) `tools/testkit/code_verification/mms/{runner.py, analyze.py}` (the convergence-study scaffolding) — include if its surface is mutation-fruitful at Stage 1; skip if it's mostly orchestration.
  - **Per-target mutmut config schema (additive):** new `[tool.mutmut.targets.<target_id>]` blocks pointing at `paths_to_mutate` + `tests_dir`. Schema-additive only; the existing testkit/integrity targets (capture, code_verification_mms, golden, determinism, equivalence, property, cat4_draft_time per agent-based audit § 7.6) are NOT modified.
  - **uv-workspace runner integration:** the runner harness invoked by the per-target script must resolve `reaction_diffusion_3d` as a uv-workspace member (the rework that closed-form / agent-based deferred). Validate at Stage 2 by running each per-target invocation end-to-end + capturing the mutmut output to evidence.
  - **Thresholds:** per spec § 2.13 (verify the actual threshold value at HEAD — the published number may have evolved; the spec § 2.13 row is the contract). Record actual kill-rate vs threshold per target. The mutation gate is non-blocking at this sub-phase (advisory) per inherited closed-form / agent-based rationale; PATH-A's contribution is the FIRST REAL BASELINE, not a gate-flip.
  - **Commit:** `chore(continuous-ca-rd3d-stage2-mutation-pathA): per-target rewrite + first real kill-rate baseline`.
  - **Artifact:** `tools/testkit/mutation/sub-phase-continuous-ca-rd3d-<UTC>.json` with per-target rows (target_id, kill_rate, mutants_tested, mutants_killed, surviving_mutant_ids); sha256 recorded in landing audit `evidence_hashes:`.

- **Step 2.8 — CHANGELOG additive entry.** Append `### sub-phase-continuous-ca-rd3d` heading under `[Unreleased]` (no semver section — no tag). Itemize: gate-13 GREEN-flip for RD-3D, MMS-OOA verification (first-of-kind), canonical-capture descriptor landed, perf-ledger first-landing row, B17 PATH-A real-baseline landing, Cat 3 NO-OP decision. Commit: `docs(continuous-ca-rd3d-stage2-changelog): sub-phase-continuous-ca-rd3d entry`.

- **Step 2.9 — Sub-phase landing audit.** `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-<UTC>.md` per IC-9 body. Front-matter `artifact: sub-phase`, `artifact_id: sub-phase-continuous-ca-rd3d`, both `head_sha:` AND `head_sha_at_checkpoint:`. `evidence_paths:` + `evidence_hashes:` enumerate: both stage-checkpoint logs + mutation JSON + Phase 1 RED evidence (FACT-tagged as still-matching) + sub-phase GREEN evidence + canonical capture sidecar + perf-ledger + CHANGELOG + all Stage 2 evidence (`stage-2-evidence/{test-sweep-positive,test-sweep-negative,integrity-cats,verify-evidence,gate13-replay-rd3d,append-only,mutation-pathA-output}-<UTC>.txt`). Verdict-state CONFIRMED. Commit: `chore(continuous-ca-rd3d-stage2-landing-audit): sub-phase landing audit`.

- **Step 2.10 — Convention #12 SHA back-fill.** `git rev-parse HEAD` → replace placeholders; new commit. NEVER `--amend`. Commit: `chore(continuous-ca-rd3d-stage2-sha-backfill): back-fill landing audit SHA per Convention #12`.

- **Step 2.11 — Final summary.** No `-phase-N` tag is proposed. Optional `v0.1.3` non-phase point-release tag banked for operator. Surface to operator with landing-audit path, gate-status table, **B17 PATH-A real-baseline kill-rates per target**, MMS convergence-rate ladder, Cat 3 NO-OP decision, RD-2D MMS regression-scope disposition, and next-sub-phase recommendation (sibling: `sub-phase-particle-fluids-sph-water` — operator drafts that plan in a separate session).

---

## § 5. Dispatch — operator workflow

Inherited from `sub-phase-agent-based.md` § 5 verbatim. Identity reads "continuous-CA RD-3D sub-phase coordinator chat". § 7 prompts are the dispatchable units.

**Tag posture.** Same as prior sub-phases. No `-phase-N` tag. Lean: no intermediate tag. Optional non-phase point-release `v0.1.3` (no `-phase-N` suffix) is a banked operator decision. The agent NEVER pushes any tag.

---

## § 6. Coordinator prompt

Inherits Phase 1 § 6 / agent-based sub-phase § 6 verbatim; identity "continuous-CA RD-3D sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + RD-3D evidence reverify + RD-2D MMS regression-scope surfacing | pending | — | — | — |
| 1 | RD-3D implementation (including MMS gate 5) | pending | — | — | — |
| 2 | integrity + replay sweep + Cat 3 NO-OP decision | pending | — | — | — |
| 2 | B17 PATH-A mutation artifact (real per-target kill-rates) | pending | — | — | — |
| 2 | CHANGELOG + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these **sub-phase conventions** (inherited from `sub-phase-agent-based.md` § 7 standing orders, with substitutions):

- Commit slug `chore` / `feat` + `continuous-ca-rd3d-stage<N>-<scope>` (non-phase form).
- Doubled-directory paths preserved.
- Stack is pytest (Python NumPy reference per § 1.4 re-anchor). NO CMake/ctest at this sub-phase.
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:`.
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256. FACT/INFERENCE tagging.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit / golden / spec / probe committed at `v0.1.0-phase-1`, within the closed-form sub-phase audit chain (`2cc0f21`), OR within the agent-based sub-phase audit chain (`739c93f`).
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close.
- Operator-only tag-pushing.
- `verify_evidence` `sha256:HEX` prefix tolerance inherited (closed-form N3 / `3b79cfa`).
- When stuck → Phase 1 charter § 9 playbook + closed-form sub-phase § 9 (P21) + agent-based sub-phase § 9 (P22) + this sub-phase § 9 (P23).

### § 7.1 Stage 0 — Pre-flight

```
You are the continuous-CA RD-3D sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-continuous-ca-rd3d.md (this sub-phase's charter — source of truth; § 7 standing orders inherited).
  2. docs/phases/sub-phase-agent-based.md (parent template; this charter inherits its three-stage structure).
  3. docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md (parent landing audit; § 8 lists 42 cumulative inherited shifts — do NOT re-litigate; § 9 lists banked items, including B17 routed here).
  4. docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md (sibling reference for Cat 3 _SUBDIRS_PICKED_UP semantics + verify_evidence sha256: tolerance).
  5. docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md (Phase 1 landing — § 14 baseline shifts, § 5 RD-3D evidence sha256).

Spec-Phase-1 landed at v0.1.0-phase-1 (SHA 9998bc1); closed-form landed at 2cc0f21; agent-based landed at 739c93f. Stage 0 is pre-flight only; you do NOT implement RD-3D.

Execute Tasks 0.0 → 0.1 → 0.2 → 0.3 → closing per sub-phase charter § 4.1 exactly:

  Task 0.0 — Run replay_prior_phase against phase-1 with the 8-gate canonical set (uv run python -m … form, validated by closed-form + agent-based). Exit 0 → proceed. Exit 1 → write docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-blocked-replay-<UTC>.md per playbook P20; surface; stop.

  Task 0.1 — Bump tolerance-budget.toml's [phase] to "sub-phase-continuous-ca-rd3d"; bump opened_at. NO [budgets.*] widening. Commit per charter § 4.1.

  Task 0.2 — sha256sum tools/testkit/failing-tests-evidence/reaction-diffusion-3d-2026-05-20T13-26-32Z.txt; compare to the Phase 1 landing audit's evidence_hashes: value (b3165ab1…2514b96; charter § 1.3 has the verbatim string). Mismatch → BLOCKED (gate-13 precondition).

  Task 0.3 (NEW THIS SUB-PHASE) — RD-2D MMS regression-scope surfacing (charter § 1.6 / § 4.1). Inspect packages/reaction-diffusion-2d/tests/ + tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/ at HEAD. Determine whether RD-2D currently exercises the 2D MMS solution as a test. Surface to the operator with the default-lean recommendation: Reading (b) — Phase-0-deliverable verification, out-of-scope for this sub-phase's Stage 2 sweep. Stop and await operator dispatch decision if Reading (a) is plausible (i.e., if RD-2D already imports the 2D MMS but lacks a convergence test, the operator may route a small additive task into Stage 1 / Stage 2). Record the surfacing in the Stage 0 checkpoint.

  Closing — Commit docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-checkpoint-<UTC>.md per IC-9 abbreviated structure. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Body includes the Task 0.3 RD-2D MMS regression-scope decision. Commit per charter § 4.1, then apply Convention #12 SHA back-fill: if HEAD differs from the audit's head_sha:, new commit `chore(continuous-ca-rd3d-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`. Surface and stop.

Out of scope: any sim work; any edit outside tolerance-budget.toml + new audit files.
```

### § 7.2 Stage 1 — Per-sim implementation

```
You are the continuous-CA RD-3D sub-phase Claude Code agent, Stage 1 (per-sim implementation) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-continuous-ca-rd3d.md §§ 1.4 (Stack-C language re-anchor — Python ships now), 1.5 (determinism posture), 1.6 (RD-2D MMS regression-scope decision from Stage 0), 2 (per-gate deliverables), 3 (IC contracts), 4.2 (Stage 1 10-step sequence), 7 (standing orders), 9 (P23 MMS playbook entry).
  2. docs/phases/sub-phase-agent-based.md § 4.2 (parent 8-step sequence — applies wholesale with the deltas in § 4.2 of this charter, including the new step 3 for MMS verification and the new step 10 for the MMS-ladder commit-footer).
  3. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-checkpoint-<UTC>.md (Stage 0 close — replay PASS, RD-2D MMS regression-scope disposition).
  4. Per sim, before drafting the bundle: docs/sim-specs/continuous-ca/reaction-diffusion-3d/{README,spec-ref,algebraic,determinism,equivalence}.md, tools/testkit/probes/reports/reaction-diffusion-3d.md (§ 5 is the API contract), packages/reaction-diffusion-3d/tests/*.py (the GREEN target), tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/{solution.py, derivation.md} (DO NOT modify; gate-5 contract — MMS is the verification anchor), and tools/testkit/code_verification/mms/{runner.py, analyze.py, derive.py} (verify the actual convergence-study scaffolding shape before consuming).

Scope — ONE sim:
  reaction-diffusion-3d (single canonical capture: gray-scott-lambda-64cube-seed42-step2000 per Appendix D § D.2.3; MMS-based gate 5 — first-of-kind; Python NumPy reference per charter § 1.4).

**Determinism-strategy declaration first** (charter § 1.5 — inherited from agent-based § 1.4). Before drafting any implementation, write the determinism strategy as a docstring at the top of reaction_diffusion_3d.sim:
  - Python NumPy reductions are inherently ordered (no parallel reductions over time-dependent state).
  - Elementwise + np.roll-based 7-point stencil; no atomic scatter, no global reductions per step.
  - RNG (for IC sampling and any stochastic helper) threaded through common_py.determinism.Config; ban bare np.random.* in reference/sim.
  - Phase-2+-deferred: Stack-C atomic scatter (n/a for 7-point), driver FMA fusion, Vulkan subgroup-collective ops — all per determinism.md.
Cite this docstring in the Stage 1 commit-message footer.

Deliver gates 4–13 in one sub-bundle commit per the 10-step sequence in charter § 4.2:
  1. Determinism docstring.
  2. Implement reaction_diffusion_3d.reference (gray_scott_step_with_source, canonical_params, evolve), .sim (sim_runner_seeded), .invariants (monotone_bounds, periodic_bc_satisfied).
  3. **Gate-5 MMS verification (first-of-kind).** Wire test_mms_convergence.py to a 3-grid convergence study against GrayScott3DSolution. Pick grid ladder (default lean: N ∈ {16, 32, 64} on the unit cube). Compute observed OOA from per-grid error reductions; assert observed OOA matches formal p=2 within ±0.5 per spec § 2.4. If observed OOA does NOT converge → apply playbook P23 (charter § 9.1) before mutating the test thresholds. Record the convergence-rate ladder (N_i, h_i, ‖e_i‖_2, observed-OOA pairwise) in the Stage 1 commit footer + checkpoint § 3.
  4. pytest packages/reaction-diffusion-3d/tests/ -v → all 4 test files GREEN; capture verbatim to tools/testkit/failing-tests-evidence/reaction-diffusion-3d-implemented-<UTC>.txt + sha256. Phase 1 RED evidence UNTOUCHED.
  5. Produce ONE canonical capture (gray-scott-lambda-64cube-seed42-step2000); write captures/reaction-diffusion-3d-ref/<descriptor>.{h5,json}.
  6. Determinism: capture-twice-and-diff (test_run_twice_bit_exact GREEN; same-hw bit-exact per charter § 1.5).
  7. PBT: 2 invariants (monotone_bounds, periodic_bc_satisfied); commit .hypothesis/ DB.
  8. Perf-ledger row appended for (reaction-diffusion-3d, stack-b-py-ref, gray-scott-lambda-64cube-seed42-step2000); mirror hardware_id format; re-anchor against actual hardware.
  9. Gate-13 worktree replay: git worktree add /tmp/bp-replay-a159086-rd3d a159086 (NOT partial checkout per closed-form S5); run PYTHONPATH=. uv run pytest packages/reaction-diffusion-3d/tests/ -v in the worktree; sha256 the output; assert failure-mode matches Phase 1 RED evidence (4 ModuleNotFoundError collection-errors). Remove the worktree.
  10. Commit: feat(continuous-ca-rd3d-stage1): implementation through gate 13. Footer cites Phase 1 RED evidence sha256, new GREEN evidence sha256, capture sidecar paths + .h5 sha256, perf-ledger wall_clock_seconds, determinism-strategy declaration summary, MMS convergence-rate ladder summary.

If Stage 1 runs long (charter § 4.2 closing): stop at a clean cut-point (after step 4 OR after step 6) and commit a partial checkpoint; the operator dispatches a continuation session.

Closing — Commit docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-1-checkpoint-<UTC>.md per IC-9. Body: 13-row gate-status table + capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + determinism-strategy declaration summary + **MMS convergence-rate ladder** + SHIFTED/banked items. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit: chore(continuous-ca-rd3d-stage1-checkpoint): Stage 1 per-sim implementation complete. Apply Convention #12 SHA back-fill if needed. Then stop.

Out of scope: modifying any Phase 1 / closed-form / agent-based artifact; implementing any other Phase 1 sim; touching convergence files (Stage 2 owns); reworking tools/testkit/mutation/ runners (Stage 2 B17 PATH-A); Stack-C C++ / CMake / Vulkan implementation (Phase-2+ per charter § 1.4).

Stuck → charter § 9 (P23) + agent-based § 9 (P22) + closed-form § 9 (P21) + Phase 1 charter § 9 (P9, P10, P12, P14 especially).
```

### § 7.3 Stage 2 — Landing

```
You are the continuous-CA RD-3D sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-continuous-ca-rd3d.md §§ 4.3, 7.
  2. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-checkpoint-<UTC>.md, .../stage-1-checkpoint-<UTC>.md.
  3. docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md (parent landing — § 7.6 B17 routing context (PATH-A is now the assignment here); § 9 banked items inherited).
  4. docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md (Cat 3 _SUBDIRS_PICKED_UP precedent for the NO-OP decision at § 4.3 Step 2.3).
  5. docs/phases/sub-phase-agent-based.md § 4.3 (parent Stage 2 step structure).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A). Read the file first; append.

Execute Steps 2.1–2.11 per charter § 4.3 exactly. Load-bearing items:

  Step 2.3 — Cat 3 _SUBDIRS_PICKED_UP decision. **NO-OP this sub-phase.** RD-3D ships no golden table — gate 5 is MMS-based per RD-3D spec-ref § 7. tools/testkit/golden/tables/continuous-ca/ does not exist at HEAD; do NOT create it. _SUBDIRS_PICKED_UP at tools/integrity/integrity/cat3_numerical/golden_values.py is NOT extended. Operator-routable alternative (banked, default skip): pre-create the empty subdir + pickup-entry as a placeholder; skip unless explicitly routed. Record the NO-OP as a one-line new shift in the landing audit § 8.

  Step 2.5 — Gate-13 replay. Worktree at a159086 (NOT partial checkout). Record both RED-replay outcome and HEAD-GREEN outcome as FACT.

  Step 2.7 — B17 PATH-A (LOAD-BEARING — the assignment, not a decision A/B). Per charter § 2 / § 4.3 Step 2.7:
    - Target list (lean): reaction_diffusion_3d.{reference,sim,invariants}; tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/{solution.py,__init__.py}; optionally tools/testkit/code_verification/mms/{runner.py, analyze.py} if mutation-fruitful (skip if mostly orchestration).
    - Per-target mutmut config: additive [tool.mutmut.targets.<id>] blocks in mutmut-config.toml; existing testkit/integrity targets unchanged.
    - uv-workspace runner integration: validate per-target invocation resolves reaction_diffusion_3d as workspace member; capture mutmut output to evidence.
    - Thresholds per spec § 2.13 (verify HEAD value before asserting); mutation gate non-blocking (advisory) — PATH-A's contribution is the FIRST REAL BASELINE.
    - Artifact: tools/testkit/mutation/sub-phase-continuous-ca-rd3d-<UTC>.json with per-target rows (target_id, kill_rate, mutants_tested, mutants_killed, surviving_mutant_ids); sha256 in landing audit evidence_hashes:.
    - Commit: chore(continuous-ca-rd3d-stage2-mutation-pathA): per-target rewrite + first real kill-rate baseline.
  PATH-A is the assignment. If PATH-A is genuinely infeasible at HEAD (e.g., the uv-workspace runner rework blows up), STOP and surface to operator before defaulting to PATH-B — do NOT silently re-bank B17 a third time.

  Step 2.9 — Sub-phase landing audit. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-<UTC>.md per IC-9. Front-matter: artifact: sub-phase, artifact_id: sub-phase-continuous-ca-rd3d, both head_sha: AND head_sha_at_checkpoint:. evidence_paths: + evidence_hashes: enumerate every artifact per charter § 4.3 Step 2.9. Verdict-state CONFIRMED.

  Step 2.10 — SHA back-fill (Convention #12) — git rev-parse HEAD → replace placeholders; new commit. NEVER --amend.

  Step 2.11 — Final summary. NO -phase-N tag. Surface to operator: "RD-3D sub-phase landed at SHA <final>. RD-3D now ships all 13 gates GREEN — first MMS-based gate-5 in the workspace; observed OOA <obs> vs formal 2 within ±0.5. Phase 0 + Phase 1 + closed-form + agent-based unaffected; the four other Phase 1 sims still RED with ModuleNotFoundError pending their own per-sim implementation sub-phases. B17 PATH-A: REAL per-target baselines landed (kill-rates: <per-target>). Cat 3: NO-OP (RD-3D has no golden). No -phase-N tag pushed; optional non-phase point-release tag (e.g., v0.1.3) is a banked operator decision. Next sub-phase: sibling 'sub-phase-particle-fluids-sph-water' — operator drafts that plan in a separate session."

Stuck → charter § 9 (P23) + agent-based § 9 (P22) + closed-form § 9 (P21) + Phase 1 charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits `sub-phase-agent-based.md` § 8 verbatim. Paths:
- Stage 0 / Stage 1 checkpoints: `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-<N>-checkpoint-<UTC>.md`.
- Stage 2: the sub-phase landing audit itself (no separate checkpoint).
- Continuation prompt with `continuous-ca-rd3d-stage<N>-...` slug.

**Convention #12 SHA back-fill at EVERY stage close** (closed-form audit § 8.2 N2 lesson; agent-based audit § 4.1 applied).

---

## § 9. Risk surface — sub-phase-specific

Beyond `sub-phase-agent-based.md` § 9 (inherited verbatim — R1 PBT framework, R2 perf-ledger format, R3 gate-13 replay reproducibility, R5 Cat 3 `_gather_tables`, R6 sim_runner Protocol drift, R7 determinism strategy declaration enforcement, R8 Cat 3 anchor-count format vs intent (NO-OP this sub-phase), R9 probe-vs-spec descriptor drift):

- **R10 (gate-5 MMS convergence failure).** Gate 5 is first-of-kind in this sub-phase. Failure modes: BC contamination of the source term at periodic edges; insufficient grid refinement (N=8 may not be in the asymptotic regime); precision loss in the SymPy-to-NumPy translation (e.g., a missing factor of $\pi/L$ in `_u` / `_v`); convergence-rate ladder picked too coarse to resolve $p=2$ vs $p=1.5$. Mitigation: P23 playbook entry below; record the per-grid error reductions in the commit footer so the operator can inspect them at landing review.

- **R11 (B17 PATH-A uv-workspace runner rework cost).** The runner integration is the specific work that closed-form and agent-based both deferred. Risk: at Stage 2, the rework blows up beyond a single session's budget. Mitigation: § 7.3 Stage 2 prompt mandates STOP-AND-SURFACE before defaulting to PATH-B re-bank a third time. Operator-routable continuation under the closed-form / agent-based partial-checkpoint precedent.

- **R12 (RD-2D MMS regression-scope leak into Stage 2 sweep).** Stage 0 Task 0.3 surfaces the question; if the operator routes Reading (a) at dispatch and the test wiring touches Phase-0 RD-2D files, Convention A is strained. Mitigation: the wiring lives in a NEW test file (`packages/reaction-diffusion-2d/tests/test_mms_convergence.py`), not edits to existing Phase-0 tests; Stage 0 explicitly checks this discipline before routing.

### § 9.1 New playbook entry (P23 — MANDATORY)

> **P23 — MMS observed-OOA fails to converge within $\pm 0.5$ of formal order.**
> *When to apply:* `test_mms_convergence.py::test_mms_observed_ooa_matches_formal_within_half_an_order` fails at Stage 1 step 3, OR the per-grid error norms do not monotonically decrease across the refinement ladder.
> *Common causes, in priority order:*
> 1. **BC contamination of the source term.** The manufactured source $S_u, S_v$ is computed assuming the analytic solution holds everywhere including the periodic boundary; if the discrete stencil's periodic-BC implementation deviates (e.g., `np.roll` with the wrong axis convention, or a one-cell off-by-one on the periodic copy), the residual at the boundary contaminates the global error norm. Fix: validate `evolve(seed=0, n_steps=0)` returns the IC exactly; validate `_u`/`_v` agree on opposite faces to machine precision before any step.
> 2. **SymPy-to-NumPy translation drift.** `solution.py::source_term` is hand-translated from `derivation.md` symbolic; any factor (e.g., $\pi/L$ vs $\pi$; sign of $u_t$ from $\cos(t)$ derivative) flips the source by a constant, which appears as a uniform error floor that does NOT converge with grid refinement. Fix: at Stage 1 step 3 start, re-evaluate SymPy at the canonical test point $(0.3, 0.5, 0.7, 0.2)$ per Phase 1 Stage 2 commit `a159086`; assert NumPy `source_term` ≡ SymPy within `1e-14`. If they disagree, fix `solution.py` BEFORE running the convergence study.
> 3. **Insufficient grid refinement / pre-asymptotic regime.** The 3-grid ladder $N \in \{16, 32, 64\}$ is the default lean, but if $N=16$ is too coarse (Pearson-1993-canonical parameter set has narrow patterns at $F=0.0367, k=0.0649$), the observed OOA at the coarse step may dominate; fix: lift to $N \in \{32, 64, 128\}$ — uncritical at the 64³ canonical cube. Document the ladder choice in the Stage 1 commit footer either way.
> 4. **Time-step coupling to grid spacing.** Explicit forward Euler has the CFL constraint $\Delta t \le h^2 / (6 D_{\max})$ for the 7-point Laplacian; refining $h$ requires refining $\Delta t$ proportionally to $h^2$, otherwise the temporal-discretization error swamps the spatial. Fix: pin $\Delta t = h^2 / (6 D_{\max}) \cdot 0.5$ for each grid level; document in the test.
> 5. **Error-norm choice.** $L^2$ vs $L^\infty$ vs RMS produce different observed-OOA values; spec § 2.4 prescribes $L^2$ (verify against HEAD spec text). Fix: standardize the norm + document.
> *Debug-step ordering:* before mutating the test thresholds, (a) re-run the SymPy ≡ NumPy spot-check at the canonical test point; (b) zero-step IC round-trip; (c) refine the ladder; (d) inspect $\Delta t$ vs CFL; (e) only then consider the threshold $\pm 0.5$ as the suspect — and if it's the threshold, surface to the operator before widening.

(P24 — C++ determinism debugging — not added at this sub-phase. The Python NumPy reference per § 1.4 doesn't expose the C++ determinism risk surface; P24 is queued for the future Phase-2+ Stack-C cross-stack sub-phase that lands the C++ compute kernel for RD-3D. The existing Phase 1 § 9 + closed-form P21 + agent-based P22 coverage is sufficient for Python NumPy determinism at this sub-phase.)

---

## § 10. Audit-trail discipline

Inherits `sub-phase-agent-based.md` § 10 verbatim. Sub-phase audits live under `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/`. Convention #12 SHA back-fill at every stage close. Append-only check at Stage 2 Step 2.6 forbids edits to any file present at `v0.1.0-phase-1` OR within the closed-form sub-phase audit chain (`2cc0f21`) OR within the agent-based sub-phase audit chain (`739c93f`).

Audit front-matter `artifact:` enum: Stage 0 + Stage 1 checkpoints use `artifact: stage` (`artifact_id: continuous-ca-rd3d-stage-0` / `continuous-ca-rd3d-stage-1`); Stage 2 landing audit uses `artifact: sub-phase` (`artifact_id: sub-phase-continuous-ca-rd3d`).

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

Verified by Stage 0 Task 0.0 replay against the 8-gate set:

- RD-3D TDD bundle (5 spec docs + MMS solution + RD-2D MMS co-bundle + 1 probe + 4 failing tests) at SHA `a159086`.
- IC-2 / IC-4 / scalar_field-tier-2 infrastructure (`common_py` + `tier2/scalar_field`).
- MMS scaffolding at `tools/testkit/code_verification/mms/`.
- The 42 cumulative shifts (21 Phase 1 + 11 closed-form + 10 agent-based) — baseline reality; do NOT propose corrections.
- Closed-form sub-phase's resolved items (Cat 3 `closed-form` subdir pickup; `verify_evidence` `sha256:` prefix tolerance) + agent-based sub-phase's resolved items (Cat 3 `agent-based` subdir pickup at commit `d156792`; determinism-strategy-declaration discipline) — established tool behavior at HEAD.

### § 11.2 Banked items inherited

- **B17** (per-target mutation runners + first real kill-rate baseline). **Now LOAD-BEARING this sub-phase**, not banked further. Stage 2 Step 2.7 PATH-A is the assignment.
- **Cat 3 `_SUBDIRS_PICKED_UP` for sibling subdirs** (hybrid-pg, lattice, particle-fluids — agent-based audit § 9.2). Each subdir is the work of its own per-sim implementation sub-phase. `continuous-ca` itself is a NO-OP this sub-phase per § 4.3 Step 2.3.
- **Cat 3 evaluator shims** for the four AUDIT_LOG algorithms (lorenz-structural-invariants, mandelbulb-distance-estimator-p8-quilez-2009, boids-reynolds-1987-3agent-step1, physarum-jones-2010-4agent-deposit-step1). RD-3D adds NO new AUDIT_LOG rows (no golden); banked unchanged.
- **B2 / B3 / B4 / B5 / B6 / B11 / B16** (Phase 1 open). Out of this sub-phase's scope.

### § 11.3 Outputs to subsequent sub-phases

- RD-3D 13 gates GREEN — equivalence baseline for Phase-2+ Stack-C cross-stack work (`Stack-B-Python-ref → Stack-C-C++/Vulkan`).
- One new canonical capture lands in `captures/reaction-diffusion-3d-ref/` per Appendix D § D.2.3 — first-class entry in the legacy-capture corpus.
- **MMS-based gate-5 discipline** is the new template that subsequent per-sim sub-phases with MMS-eligible sims (eulerian-smoke, sph-water density-evolution, LBM Chapman-Enskog) inherit. The convergence-rate ladder + commit-footer disclosure pattern + P23 playbook entry are first-class.
- **P23 playbook entry** added; subsequent per-sim sub-phases with MMS gate-5 inherit.
- **B17 PATH-A real per-target baseline** lands — the per-target mutmut + uv-workspace runner infrastructure is now first-class; subsequent per-sim sub-phases ADD their per-sim targets additively against this infrastructure (no further rework).
- Determinism-strategy-declaration discipline (agent-based § 1.4 / inherited) exercised at the simplest case (Python NumPy 7-point stencil, no atomics, no reductions); subsequent sub-phases with non-trivial determinism (sph-water atomics, MPM scatter, LBM bit-exact effort, smoke FMA fusion) inherit at higher complexity.
- The Phase 1 RED evidence file for RD-3D remains byte-identical to the Phase 1 landing audit's value (gate-13 anchor intact across the gap to spec-Phase-2's pre-flight replay; charter § 11.4).

### § 11.4 Replay-chain non-participation + tag posture

Inherits `sub-phase-agent-based.md` § 11.4 verbatim with identifier substitutions. This sub-phase does NOT participate in the cross-phase replay chain. The next spec-phase pre-flight (spec-Phase-2 Stage 0) replays against `v0.1.0-phase-1` — NOT against any sibling sub-phase tag. The replay resolver's regex (`tools/integrity/integrity/scripts/replay_prior_phase.py`) mechanically rejects multi-segment or suffixed phase tags.

What protects this sub-phase's work across the gap to spec-Phase-2 is spec § 3.5 gate 13: the Phase 1 failing-tests-evidence sha256 for RD-3D (`b3165ab1…2514b96`) must continue to match at `v0.1.0-phase-1` even after implementation lands here. Implementations consume the bootstrap tests as the GREEN target; they do NOT modify the failing-tests-evidence file. Stage 2 Steps 2.5–2.6 verify this discipline before declaring CONFIRMED.

**Tag-posture decision banked for operator at Stage 2 close:**

- **Lean recommendation: no intermediate tag.** Sub-phase commits accumulate to `main`; the landing audit + per-sim commit provide the audit trail.
- **Alternative: non-phase point-release tag `v0.1.3`** (no `-phase-N` suffix). Distinguishes this sub-phase landing in `git log`. Acceptable per spec § 7.12; operator-pushed.
- **Forbidden either way:** any tag carrying `-phase-N`. Reserved for spec-phase boundaries.

### § 11.5 Operator-routable items surfaced by this plan (banked alternatives)

For explicit operator confirmation at dispatch time:

1. **§ 1.4 language-pivot re-anchor** — confirm this sub-phase ships Python NumPy reference (default lean), NOT C++ / CMake. If the operator routes "land a Stack-C C++ port now," the plan is materially different: a separate continuous-CA-Stack-C-rd3d sub-phase plan, gated on C++ build infrastructure + Vulkan device-init + per-sim CMakeLists landing (B16 + B6 Phase-1-open items resolved as preconditions).
2. **§ 1.6 / Task 0.3 RD-2D MMS regression scope** — confirm Reading (b) (default lean: Phase-0-deliverable, out-of-scope). Reading (a) absorbs a small additive task into Stage 1 / Stage 2.
3. **§ 4.3 Step 2.7 B17 PATH-A target list** — confirm the lean three-target list (RD-3D source + RD-3D MMS solution + optional MMS runner/analyze). Operator may add common_py / common_ts targets if amortization is desired now vs later.
4. **§ 11.4 v0.1.3 tag** — confirm no-tag default (lean) vs push-v0.1.3 (alternative).

---

*End of continuous-CA RD-3D sub-phase charter. Inherits Phase 1's + closed-form's + agent-based's role model, audit discipline, conventions, IC contracts (with scalar_field-tier-2 + MMS-pipeline substack pivots per § 3), determinism-strategy declaration discipline (§ 1.5 / inherited from agent-based § 1.4), and problem-solving playbook wholesale; adds the **gate-5 MMS-based code-verification discipline** with convergence-rate-ladder disclosure (§ 2 gate 5 + § 4.2 step 3), the **Stack-C language-pivot re-anchor** (§ 1.4 — this sub-phase ships Python NumPy reference, NOT C++), the **B17 PATH-A load-bearing assignment** with per-target mutmut + uv-workspace runner integration (§ 4.3 Step 2.7), and the **P23 playbook entry** (§ 9.1 — MMS observed-OOA convergence-failure debugging) as deltas. Establishes that subsequent per-sim implementation sub-phases (sibling `sub-phase-particle-fluids-sph-water` next, then eulerian-smoke + LBM, then MPM-multimaterial) inherit all four deltas plus a working per-target mutation infrastructure.*

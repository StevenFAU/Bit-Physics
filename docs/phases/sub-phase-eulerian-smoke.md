# Eulerian-Smoke Implementation — Sub-Phase of Spec-Phase-1

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — gates 4–13 implementation for `eulerian-smoke`, scoped under spec-Phase-1.
> **Sub-phase identity:** Fifth per-sim implementation sub-phase under spec-Phase-1, **first in the volumetric-grid category** (spec § 5.6), **second MMS-using sub-phase** (after `continuous-ca-rd3d`). NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.4 (MMS / OOA), 2.5 (determinism), 2.7 (capture), 2.13 (mutation), 2.14 (PBT), 3.5 (the 13 gates), 5.6 (volumetric-grid reference category), 7.12, 7.13 + Appendix D § D.2.3.
> **Reads-first:** `docs/conventions/sub-phase-conventions.md` (sections A–F, I–N — universally load-bearing for this sub-phase; § H vendored-upstream NOT applicable; § N PROPOSED Stage-0 canonical-descriptor scope-analysis is **first practical exercise**). THEN this plan. Per-sub-phase plans inherit cross-cutting discipline by reference from the conventions doc rather than restating it.
> **Parent audits (pre-conditions):**
> - Phase 1 landing — `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md`, CONFIRMED at `v0.1.0-phase-1` (SHA `9998bc1`).
> - sub-phase-closed-form landed at `2cc0f21`.
> - sub-phase-agent-based landed at `739c93f`.
> - sub-phase-replay-tool-hotfix landed at `1f5fa0c`.
> - sub-phase-continuous-ca-rd3d landed at `0df358d` (**first MMS gate-5 + P23 + B17 PATH-A**).
> - sub-phase-numba-integration landed at `569c883`.
> - sub-phase-particle-fluids-sph-water landed at `281c74f`.
> - sub-phase-mutation-script-hotfix repair audit complete.
> - **sub-phase-conventions-consolidation CONFIRMED at `34c7d34`** — the cross-sub-phase conventions doc is the new reads-first anchor; this is the **first sub-phase plan drafted AGAINST the conventions doc** rather than the most-recent-template.
> **Inherited shifts:** 65 cumulative going into this sub-phase (per conventions doc § M inventory). Inherited by reference; not re-stated, not re-litigated.
> **Date drafted:** 2026-05-22.
> **Status:** dispatch-ready.

---

## § 1. Scoping

### § 1.1 What this sub-phase is

This sub-phase takes **eulerian-smoke** from spec-Phase-1's gates 1–3 (5 spec docs + NS-2D MMS solution co-bundle + probe + 4 failing test files, committed at SHA `216021a` per Phase 1 landing audit § 5) through gates 4–13 of spec § 3.5. eulerian-smoke is the **fifth per-sim implementation surface**.

Implementation stack: **Python NumPy reference at Stack-D** (`packages/eulerian-smoke/eulerian_smoke/{reference,sim,invariants}`). Stack-C C++/Vulkan port — the spec's nominal target per § 5.6 + sim spec-ref § 5 — is Phase-2+ scope per the established language-pivot re-anchor pattern (closed-form / agent-based / RD-3D / sph-water all shipped Python at sub-phase scope; see conventions doc § A for role model).

### § 1.2 What's different from prior sub-phases

1. **First volumetric-grid sim in the project.** closed-form / agent-based are scalar+agent; continuous-ca-rd3d is a 7-point-stencil 3D scalar field; sph-water is particle-fluid. eulerian-smoke is the first **incompressible NS solver on a regular Eulerian grid** (semi-Lagrangian advection + Jacobi pressure projection + vorticity confinement — the Stam/Fedkiw stack per `algebraic.md` § 2).
2. **Second MMS sub-phase** (after RD-3D). Shares the NS-2D Taylor-Green MMS solution at `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` with `lattice-boltzmann-d3q19` per Phase 1 Stage 2 shift #18 (conventions doc § M.1 row 18). This sub-phase **exercises the NS-2D MMS first**; LBM will reuse it.
3. **Inline-MMS pattern (operator-routed Path Y from sph-water landing § 9.3 row 6).** Per RD-3D Stage 1 SHIFT S2 precedent (conventions doc § M.4 S2): the MMS test inlines its convergence study rather than reusing `tools/testkit/code_verification/mms/runner.py` (which remains heat-1D-specialized). The MMS-runner generalization is **deferred to LBM plan-drafting** (or beyond) when there are two concrete inline examples (RD-3D + eulerian-smoke) anchoring the abstraction. **This plan does NOT propose generalizing the runner.**
4. **First sub-phase to ship TWO canonical captures.** Appendix D § D.2.3 lists eulerian-smoke `ref` as `taylor-green-128cube-seed42-step500` **+** `lid-driven-cavity-128sq-re100-seed42-step1000`. Note **probe-vs-Appendix-D drift**: the eulerian-smoke probe report § 4 references the legacy-capture placeholder `stam-puff-128cube-seed42-step500` (a Phase 1 Stage 2 shift #17 fall-back name); Appendix D is the load-bearing source per conventions doc convention re-anchoring discipline. Re-anchor at Stage 1 step 5.
5. **First sub-phase to apply Task 0.4 canonical-descriptor scope-analysis** (conventions doc § N PROPOSED). The Stage 0 prompt at § 7.1 concretizes the analysis steps.
6. **No vendored upstream consumed.** Conventions doc § H not applicable; Stage 0 Task 0.3 is a sim-specific re-anchor of the shared NS-2D MMS solution, not a manifest verification.

### § 1.3 Stage 0 canonical-descriptor scope-analysis — load-bearing for this plan

Per conventions doc § N + sph-water landing § 9.3 row 1, Task 0.4 estimates feasibility of each canonical descriptor against the Python NumPy reference stack at this sub-phase's storage / memory / wall-clock ceilings BEFORE Stage 1 dispatch. Pre-flight feasibility estimates (re-verified at Stage 0 with measured per-step floors):

| Descriptor | Storage (raw, float32, all fields, full cadence) | Memory | Wall-clock estimate |
|---|---|---|---|
| `taylor-green-128cube-seed42-step500` | 128³ × 5 fields × 4 B × 500 ≈ **21 GB** (raw); requires capture-cadence ≥ 50 to fit 1 GB ceiling | 128³ × ~10 intermediate float64 fields ≈ 170 MB | Per-step ≈ 1–10 s (Jacobi-iter-dominated at 128³); 500 steps ≈ 10²–10⁴ s — **tight; verify with measured floor at Stage 0** |
| `lid-driven-cavity-128sq-re100-seed42-step1000` | 128² × 4 fields × 4 B × 1000 ≈ 0.26 GB | <50 MB | Per-step ≈ 0.01–0.1 s; 1000 steps ≈ 10²–10³ s |

The 3D Taylor-Green is the tight constraint. The Stage 0 finding will be one of:

- **Fits at cadence-N ≥ K** (default lean): proceed to Stage 1 with a documented capture-cadence override per spec § 2.7 (similar to how sph-water R20 contracted full N=1M forward to Stack-C Phase-2+ with a 100K override per conventions doc § K.4 / § M.5).
- **Exceeds wall-clock or memory ceiling**: STOP and surface to operator at Stage 0 close with at least three routing options (e.g., smaller grid override 64³; reduced step count; per-sub-phase Appendix D descriptor override; precompiled @njit inner kernel — consume `sub-phase-numba-integration` infrastructure per conventions doc § G + § M.5 R18 precedent).

The Stage 1 commit footer cites the Stage 0 Task 0.4 finding as a load-bearing artifact. **The scope-analysis surfacing the issue at Stage 0 (per conventions doc § N motivation) is what this sub-phase amortizes for the project**; surfacing in-flight at Stage 1 (sph-water's R12 → R20 arc) is the precedent we're trying to avoid.

---

## § 2. Deliverables (gates 4–13)

The 13-gate per-sim acceptance contract and cross-cutting discipline are inherited from conventions doc §§ A–F + I–J. Sim-specific deltas:

| Gate | Deliverable |
|---|---|
| 4 | Reads through to gate 5. |
| 5 | **MMS code verification (NS-2D Taylor-Green, inlined).** Wire `tests/test_mms_convergence.py::test_mms_observed_ooa_{advection,projection}_matches_formal` to a 3-grid convergence study against `IncompressibleNS2DSolution`. Pick a grid ladder (default lean: $N \in \{32, 64, 128\}$ on the unit square; defensible per RD-3D precedent). Assert observed OOA matches formal $p=2$ within $\pm 0.5$ per spec § 2.4 + sim spec-ref § 6.1. Two OOA tests (advection + projection); both go through one shared convergence-rate ladder per test. **Inline convergence study per RD-3D S2 precedent**; no use of `tools/testkit/code_verification/mms/runner.py`. Record the convergence ladder in the Stage 1 commit footer + Stage 1 checkpoint § 3. Apply P23 (conventions doc § M.4) if observed OOA doesn't converge. |
| 6 | Tier 1 NaN/Inf scan over the canonical-trajectory output — `test_tier1_health_no_nan_inf` GREEN. |
| 7 | Tier 2 **`vector_field`** substack (IC-6, inherited from Phase 1 / consumed at HEAD by the eulerian-smoke probe per probe § 2). Four checks GREEN: `check_divergence_free`, `check_circulation`, `check_helicity`, `check_energy_spectrum` (per probe report § 2). |
| 8 | Cat 1 citations resolve — Stam 1999, Fedkiw-Stam-Jensen 2001, Taylor-Green 1937 (DOIs in probe report § 3) cited in docstrings. |
| 9 | Cat 2 public API — `eulerian_smoke.reference.stable_fluids.{stable_fluids_step, project_pressure}`, `eulerian_smoke.sim.sim_runner_seeded`, `eulerian_smoke.invariants.{divergence_free_post_projection, smoke_density_nonneg}` (per probe report § 5). |
| 10 | **Two canonical captures** per Appendix D § D.2.3: `captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.{h5,json}` and `captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.{h5,json}`. Capture cadence per Stage 0 Task 0.4 finding (§ 1.3); store cadence in sidecar metadata so a reader can interpret. Capture-writer surface: `tools/testkit/capture` (inherited from closed-form S6 / conventions doc § M.2). Stage 1 step 5 STOPs-and-surfaces if measured per-step floor breaks the Stage 0 estimate. |
| 11 | Determinism (`test_run_twice_epsilon_diff`) GREEN. Spec declares `epsilon-same-stack-same-hw` (sim `determinism.md`); the Python NumPy reference is expected to achieve bit-exact (epsilon trivially satisfied) — over-achievement is informational only per conventions doc § F.4. See § 4.2 step 1 for the determinism-strategy declaration discipline. |
| 12 | Hypothesis tests for the 2 invariants declared in spec § 6.6 (`divergence_free_post_projection`, `smoke_density_nonneg`). Commit `.hypothesis/` example DB per spec § 2.14. Energy-bound is intentionally NOT a first-class invariant (semi-Lagrangian advection is dissipative; would PBT-fail false-positive). |
| 13 | Perf-ledger first-landing row appended per descriptor: `(eulerian-smoke, stack-b-py-ref, taylor-green-128cube-seed42-step500)` and `(…, lid-driven-cavity-128sq-re100-seed42-step1000)`. Mirror `hardware_id` format from prior sub-phases (e.g., `i7-12700KF-linux-6.17`); re-anchor at Stage 1. |
| 13 (anchor) | Phase 1 RED evidence `tools/testkit/failing-tests-evidence/eulerian-smoke-2026-05-20T13-37-41Z.txt` (sha256 `c961dd22…879f23a1`, verified pre-flight) still matches; worktree replay at SHA `216021a` reproduces `ModuleNotFoundError` collection-errors (4 test files; `eulerian_smoke.{reference,sim,invariants}` missing). |

Acceptance for "sub-phase complete": all 13 gates GREEN for eulerian-smoke; Cat 1/2/3/4/5/X GREEN at HEAD; B17 routing decision documented; Cat 3 disposition documented; landing audit CONFIRMED. No `-phase-N` tag (conventions doc § D.2).

---

## § 3. IC contracts inherited

Conventions doc § F-class discipline. Sim-specific consumption at HEAD:

- **IC-1** (capture I/O Python) — gates 9, 10.
- **IC-3** (determinism config Python) — gate 11.
- **IC-6** (Tier 2 `vector_field`) — gate 7. Inherited from Phase 1 (consumed at HEAD by the probe). **Same diagnostic surface as RD-3D's `scalar_field`, different field type — first `vector_field` exercise at sim scale.**
- **IC-8** (probe report) — `tools/testkit/probes/reports/eulerian-smoke.md` § 5.
- **IC-9** (phase audit body) — applied per conventions doc § B.

No new ICs at this sub-phase. Stack-C `common-cpp` ICs are Phase-2+ per § 1.1.

---

## § 4. Stages — three-stage cadence (conventions doc § A.2)

### § 4.1 Stage 0 — Pre-flight

Standard 4-task pattern per conventions doc § A.2 + sub-phase precedents, plus the new Task 0.4:

- **Task 0.0** — Cross-phase replay against `v0.1.0-phase-1` with the 8-gate canonical set. Bit-identity invariant `9399fc33…909f34` per conventions doc § D.3. Divergence → BLOCKED-with-surface.
- **Task 0.1** — Tolerance-budget carryover (`[phase].phase = "sub-phase-eulerian-smoke"`). NO `[budgets.*]` widening.
- **Task 0.2** — Re-verify Phase 1 failing-tests evidence sha256 (`c961dd22…879f23a1`).
- **Task 0.3 (sim-specific)** — Re-anchor the shared NS-2D MMS solution: verify `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py` + `derivation.md` are present and unmodified since Phase 1 Stage 2 (sha256 anchored at pre-flight: `solution.py = 30e490a7…320d8e`; `derivation.md = 30dfc294…ac86e76`). This is the artifact LBM will also consume per Phase 1 Stage 2 shift #18 — any drift here is BLOCKED-with-surface (affects two sims).
- **Task 0.4 (NEW — first practical exercise of conventions doc § N)** — Canonical-descriptor scope-analysis. See § 7.1 prompt for the concrete checklist. Output recorded in Stage 0 checkpoint.

Closing: `stage-0-checkpoint-<UTC>.md` per conventions doc § B.3. Apply Convention #12 SHA back-fill (conventions doc § B.2).

### § 4.2 Stage 1 — Per-sim implementation (one session)

One sim (eulerian-smoke). Single sub-bundle commit covering gates 4–13. 10-step sequence inherited from RD-3D / sph-water templates (conventions doc § A.2):

1. **Determinism-strategy declaration first** (conventions doc § F.1). Docstring at top of `eulerian_smoke/sim.py` enumerating: stable read-only Jacobi sweeps (no atomic scatter); fixed Jacobi iteration cap + tolerance check semantics; semi-Lagrangian bilinear interpolation with deterministic vertex-ordering; deterministic MacCormack corrector; no global RNG state; banned `np.random.*` outside seeded `common_py.determinism.Config`; no BLAS/FMA path. Phase-2+-deferred: Stack-C parallel-reductions / driver FMA / subgroup-collectives per sim `determinism.md`. Cite the docstring in the Stage 1 commit footer.
2. **Implement.** `eulerian_smoke.reference.stable_fluids.{stable_fluids_step, project_pressure}` (semi-Lagrangian advect → diffuse → vorticity-confine → Jacobi-project → scalar-advect per `algebraic.md` § 2); `eulerian_smoke.sim.sim_runner_seeded`; `eulerian_smoke.invariants.{divergence_free_post_projection, smoke_density_nonneg}`. If Stage 0 Task 0.4 surfaced a numba-required path, consume `@njit(fastmath=False, cache=True)` per conventions doc § G.
3. **Gate-5 MMS verification (inline convergence study).** Wire `test_mms_convergence.py` against `IncompressibleNS2DSolution`. 3-grid ladder, $L^2$ norm, two OOA tests (advection + projection). Re-verify SymPy ≡ NumPy at the canonical test point per Phase 1 Stage 2 commit precedent (P23 cause-#2). If OOA fails → apply P23 (conventions doc § M.4) before mutating the threshold.
4. **pytest** packages/eulerian-smoke/tests/ -v → all 4 test files GREEN; capture verbatim to `tools/testkit/failing-tests-evidence/eulerian-smoke-implemented-<UTC>.txt`; sha256. Phase 1 RED evidence UNTOUCHED.
5. **Produce TWO canonical captures** per § 2 gate 10 + Stage 0 Task 0.4 cadence finding. STOP-and-surface if measured per-step floor exceeds the Stage 0 estimate by > 3×.
6. **Determinism (gate 11).** `test_run_twice_epsilon_diff` GREEN. Record observed bit-exact / epsilon-bounded posture in commit footer per conventions doc § F.4.
7. **PBT (gate 12).** Hypothesis tests for the 2 invariants. Commit `.hypothesis/` DB.
8. **Perf-ledger.** One row per descriptor.
9. **Gate-13 worktree replay.** Worktree at SHA `216021a` (conventions doc § E) — NOT partial checkout. Assert 4 `ModuleNotFoundError` collection errors match Phase 1 RED.
10. **Commit.** `feat(eulerian-smoke-stage1): implementation through gate 13`. Footer per conventions doc § C.3: Phase 1 RED + new GREEN evidence sha256, capture sidecars + .h5 sha256, perf-ledger wall_clock_seconds (per descriptor), determinism docstring summary, **MMS convergence-rate ladder summary** (per descriptor: $N_i$, $h_i$, $\|e_i\|_2$, observed OOA), Stage 0 Task 0.4 finding citation.

Closing: `stage-1-checkpoint-<UTC>.md` per conventions doc § B.3. Continuation discipline per conventions doc § A.2 / § B.4 — natural cut-points after step 4 (tests GREEN, captures pending) or after step 6 (captures + determinism pending PBT).

### § 4.3 Stage 2 — Landing

Inherits Steps 2.1 → 2.11 structure from prior sub-phases via conventions doc § A.2 + § B-class discipline. Sim-specific items:

- **Step 2.3 — Cat 3 `volumetric-grid` subdir disposition (conventions doc § I).** eulerian-smoke gate 5 is MMS-based, NOT golden-table-based. **No golden table ships in this sub-phase**, so the disposition is **NO-OP** (mirror RD-3D's `continuous-ca` NO-OP precedent per conventions doc § I.2 / § M.4 N2). `_SUBDIRS_PICKED_UP` is NOT extended. No `volumetric-grid/` subdir is created under `tools/testkit/golden/tables/`. (Verify pre-flight at Stage 2 that no golden was incidentally added during Stage 1.)
- **Step 2.5 — Gate-13 worktree replay** at SHA `216021a` (conventions doc § E).
- **Step 2.6 — Append-only check.** Protected set includes Phase 0 + Phase 1 Stage 3 + closed-form (`2cc0f21`) + agent-based (`739c93f`) + replay-tool-hotfix (`1f5fa0c`) + RD-3D (`0df358d`) + numba-integration (`569c883`) + sph-water (`281c74f`) + mutation-script-hotfix + conventions-consolidation (`34c7d34`) SHAs.
- **Step 2.7 — B17 mutation-score artifact (OPERATOR-ROUTABLE).** Conventions doc § J. **No pre-committed lean for this sub-phase.** Coordinator's prior leans across the four prior per-sim sub-phases: closed-form / agent-based PATH-B (deferred); RD-3D PATH-A (first proof-point); sph-water PATH-A (second proof-point). The operator decides at Stage 2 dispatch whether to continue PATH-A against a third sim's source (additive `[targets.eulerian_smoke]` block) OR re-bank into a focused test-augmentation sub-phase (the sph-water 0.5581 + RD-3D 0.5927 surviving-mutant accumulation may be the more load-bearing follow-up per sph-water landing § 9.2). STOP-and-surface precondition (conventions doc § J.5 / sph-water R15 inheritance): if PATH-A is dispatched but mutmut runtime explodes at canonical-capture scale, surface before defaulting.
- **Step 2.9 — Sub-phase landing audit** per conventions doc § B.3.
- **Step 2.10 — Convention #12 SHA back-fill.**
- **Step 2.11 — Tag posture per conventions doc § D.2.** No `-phase-N`. Default lean: no intermediate tag. Banked alternative: optional non-phase point-release tag `v0.1.5` (no `-phase-N` suffix), operator-pushed only.

---

## § 5. Dispatch workflow

Per conventions doc § A.3 (role model — one Claude Code agent per stage, one coordinator chat, one operator). Identity reads "eulerian-smoke sub-phase coordinator chat". § 7 prompts are the dispatchable units.

---

## § 6. Coordinator prompt

Inherits per conventions doc § A.3 + prior-sub-phase template; identity "eulerian-smoke sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + NS-2D MMS reverify + **Task 0.4 scope-analysis** | pending | — | — | — |
| 1 | eulerian-smoke implementation (gates 4–13; inline MMS; two canonical captures) | pending | — | — | — |
| 2 | integrity + replay sweep + Cat 3 NO-OP + B17 routing | pending | — | — | — |
| 2 | CHANGELOG + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these standing orders (inherited from conventions doc § C + sub-phase precedents):

- Commit slug `chore` / `feat` / `docs` with `eulerian-smoke-stage<N>-<scope>` form per conventions doc § C.1.
- Doubled-directory paths preserved.
- Stack is pytest (Python NumPy reference). NO CMake/ctest at this sub-phase.
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` per conventions doc § B.3.
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256. FACT/INFERENCE tagging.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit / golden / spec / probe committed at `v0.1.0-phase-1` or within prior sub-phase audit chains (closed-form / agent-based / replay-tool-hotfix / RD-3D / numba-integration / sph-water / mutation-script-hotfix / conventions-consolidation).
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close per conventions doc § B.2.
- Operator-only tag-pushing.
- When stuck → conventions doc § K (R-class STOP-AND-SURFACE) + § 9 below (P23 inherited applies directly; P25 if added).

### § 7.1 Stage 0 — Pre-flight

```
You are the eulerian-smoke sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/conventions/sub-phase-conventions.md — read FIRST. Sections A, B, C, D, E, F, I, J, K, L, M, N. § N is load-bearing for Task 0.4.
  2. docs/phases/sub-phase-eulerian-smoke.md (this charter; § 7 standing orders).
  3. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md (most-recent sub-phase landing; § 9.3 banked observations carried forward; § 10 next-sub-phase recommendations).
  4. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md (prior MMS sub-phase; § 3.2 convergence-rate ladder format; § 7.1 Cat 3 NO-OP precedent; Stage 1 S2 inline-MMS precedent).
  5. docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md (Phase 1 landing — § 5 eulerian-smoke evidence sha256 c961dd22…879f23a1; Stage 2 shifts #17 and #18 — descriptor naming + shared NS-2D MMS).
  6. docs/sim-specs/volumetric-grid/eulerian-smoke/{README,spec-ref,algebraic,determinism,equivalence}.md (spec source of truth).
  7. tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/{solution.py, derivation.md} (the shared NS-2D MMS — re-anchor target).

Stage 0 is pre-flight only; you do NOT implement eulerian-smoke. Execute Tasks 0.0 → 0.4 → closing per charter § 4.1:

  Task 0.0 — Cross-phase replay against phase-1 with the 8-gate canonical set per conventions doc § D.5 invocation. BIT-IDENTITY INVARIANT 9399fc33…909f34 (conventions doc § D.3). Divergence → BLOCKED-with-surface (write stage-0-blocked-replay-<UTC>.md).

  Task 0.1 — Tolerance-budget carryover. [phase].phase = "sub-phase-eulerian-smoke"; bump opened_at. NO [budgets.*] widening. Commit: chore(eulerian-smoke-stage0-tolerance-budget): sub-phase carryover from phase-1.

  Task 0.2 — sha256 tools/testkit/failing-tests-evidence/eulerian-smoke-2026-05-20T13-37-41Z.txt; compare to Phase 1 landing audit's evidence_hashes: value c961dd22c1ca6117af6d9f187d2c0d3aa4d546972496b0f38d11aa14879f23a1. Mismatch → BLOCKED.

  Task 0.3 — Re-anchor the shared NS-2D MMS solution. sha256 tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py (expected 30e490a736cbfac26a549180f97219388549465d9d9557de9061106561320d8e at pre-flight) and derivation.md (expected 30dfc29483435361881214581f53e026ffd0d856a3ac0657ece9587f4ac86e76 at pre-flight). DO NOT modify these files (LBM consumes them too). Re-verify the SymPy ≡ NumPy spot-check at the canonical test point per solution.py docstring; record the result. Drift in either sha256 → BLOCKED-with-surface (affects two sims).

  Task 0.4 — Canonical-descriptor scope-analysis (NEW; conventions doc § N PROPOSED; FIRST PRACTICAL EXERCISE).
    Read:
      - Appendix D § D.2.3 entries for eulerian-smoke `ref`: TWO descriptors
        `taylor-green-128cube-seed42-step500` + `lid-driven-cavity-128sq-re100-seed42-step1000`.
      - spec-ref § 5 (this sub-phase ships Python NumPy reference at Stack-D scope).
      - sim spec-ref § 6.6 (PBT invariants — 2 declared).
      - charter § 1.3 (pre-flight feasibility estimates).
    For EACH descriptor, estimate against this sub-phase's Python NumPy stack:
      (a) STORAGE: per-frame payload bytes × frame count vs the 1 GB pre-commit ceiling (conventions doc § M.5 R12 baseline). Report at FULL cadence + at cadence-N step decimation (try N ∈ {1, 10, 50, 100}).
      (b) MEMORY: peak working-set at canonical resolution: u, v, w (and p, φ where applicable) + ~6 scratch fields for advection / projection. vs host RAM headroom (a Linux-typical ~24 GB available with browser+editor open).
      (c) WALL-CLOCK: per-step floor — MEASURED, not projected. Execute a one-shot micro-bench at HEAD if needed:
            uv run python -c "import numpy as np; import time; N=128; …"
        Measure: one semi-Lagrangian advect + one Jacobi-projection step at the canonical grid. Multiply by step count. Compare against an operator-routable threshold of 1 hour per descriptor (re-anchor per conventions doc § K.3 measured-floor discipline; revisit if first measurement suggests > 30 min — the threshold may need explicit per-step decomposition rationale).
    Decision tree:
      - If estimates fit all ceilings: proceed to Stage 1; record a "fits within ceilings" finding in the Stage 0 checkpoint (capture-cadence value recommended for the 3D descriptor explicitly cited).
      - If a ceiling is breached: surface to operator with at least three routing options, e.g.:
            (i) capture-cadence override (write every Nth step; cadence recorded in sidecar metadata).
            (ii) per-sub-phase descriptor override (smaller grid e.g. 64³; contract full 128³ forward to Stack-C Phase-2+ per sph-water R20 precedent — conventions doc § K.4).
            (iii) numba @njit acceleration of inner kernels (consume sub-phase-numba-integration infrastructure per conventions doc § G).
            (iv) capture only endpoint + a small cadence-of-final frames (preserves capture identity at small storage).
        HALT and wait for operator routing per conventions doc § K.
    Record both descriptors' findings in the Stage 0 checkpoint § 4 + cite in closing surface.

  Closing — Commit docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-checkpoint-<UTC>.md per conventions doc § B.3. Body includes bit-identity replay sha256 + Task 0.3 NS-2D MMS reverify result + Task 0.4 scope-analysis findings per descriptor. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit + Convention #12 SHA back-fill (NEW commit, NEVER --amend). Then stop. Surface to operator.

Out of scope: any sim implementation; any edit outside tolerance-budget.toml + new audit files; any edit to the shared NS-2D MMS solution (LBM consumes too); any tag.
```

### § 7.2 Stage 1 — Per-sim implementation

```
You are the eulerian-smoke sub-phase Claude Code agent, Stage 1 (per-sim implementation) for Bit-Physics.

Read:
  1. docs/conventions/sub-phase-conventions.md — reads-first. § F (determinism), § C.3 (commit footer), § E (gate-13 worktree).
  2. docs/phases/sub-phase-eulerian-smoke.md §§ 1.2, 1.3 (Stage 0 Task 0.4 finding will drive cadence + numba choices), 2 (per-gate deliverables), 3 (IC contracts), 4.2 (Stage 1 10-step sequence), 7 (standing orders), 9 (playbook).
  3. docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-checkpoint-<UTC>.md (Stage 0 close — replay PASS bit-identity, NS-2D MMS reverify result, Task 0.4 cadence + numba findings — LOAD-BEARING for steps 2 and 5).
  4. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md § 3.2 (the convergence-rate ladder format you mirror at gate 5).
  5. docs/sim-specs/volumetric-grid/eulerian-smoke/{README,spec-ref,algebraic,determinism,equivalence}.md (algorithm + invariants + tolerance source of truth).
  6. tools/testkit/probes/reports/eulerian-smoke.md (§ 5 public-API contract; § 2 diagnostics surface — IC-6 vector_field).
  7. tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/{solution.py, derivation.md} (DO NOT MODIFY — LBM consumes too).
  8. packages/eulerian-smoke/tests/test_{mms_convergence,diagnostics,determinism,pbt_invariants}.py (the GREEN target; DO NOT modify Phase 1 test contracts).

Scope — ONE sim. TWO canonical captures per Appendix D § D.2.3:
  taylor-green-128cube-seed42-step500
  lid-driven-cavity-128sq-re100-seed42-step1000
Cadence per Stage 0 Task 0.4. INLINE MMS convergence study per RD-3D Stage 1 S2 precedent; do NOT generalize the MMS runner.

**Determinism-strategy declaration FIRST** (conventions doc § F.1). Before drafting any implementation, write the docstring at the top of eulerian_smoke/sim.py covering:
  - Semi-Lagrangian backtrace reads only (no atomic scatter; conventions doc § F.3-class FP-equivalence applies if you ship a numba inner kernel).
  - Jacobi pressure-projection: fixed max-iter cap + deterministic tolerance check (≤, not <); accept floor-cap state if cap fires.
  - Bilinear-interpolation vertex-ordering is canonical (lexicographic in (i,j,k)); deterministic MacCormack corrector.
  - RNG threaded through common_py.determinism.Config; bare np.random.* banned in reference/sim/invariants.
  - No BLAS/FMA path (pure NumPy elementwise + np.roll; or @njit(fastmath=False, cache=True) per conventions doc § G if Task 0.4 surfaced the need).
  - Phase-2+ deferred: Stack-C parallel-reductions / driver FMA fusion / Vulkan subgroup-collectives per sim determinism.md.
Cite the docstring in the Stage 1 commit footer per conventions doc § C.3.

Deliver gates 4–13 in one sub-bundle commit per the 10-step sequence in charter § 4.2:
  1. Determinism docstring.
  2. Implement eulerian_smoke.reference.stable_fluids (step + project_pressure), .sim (sim_runner_seeded), .invariants (divergence_free_post_projection, smoke_density_nonneg) per algebraic.md § 2 pipeline.
  3. **Gate-5 MMS verification — INLINE convergence study.** Wire test_mms_convergence.py::test_mms_observed_ooa_{advection,projection}_matches_formal. Grid ladder default lean N ∈ {32, 64, 128} on [0,1]² (re-anchor at start: refresh against IncompressibleNS2DSolution at the canonical test point per docstring; SymPy ≡ NumPy spot-check; assert agreement within 1e-12). $L^2$ norm. Two OOA tests share one ladder per test (advection isolated by setting projection-iter-cap = 0; projection isolated by zeroing source terms). If observed OOA fails → apply P23 (conventions doc § M.4 N1: BC contamination via np.roll axis; M.4 N2: SymPy-to-NumPy translation drift; cause-#3: ladder pre-asymptotic; cause-#4: time-step CFL coupling; cause-#5: norm choice) BEFORE mutating thresholds. Record ladder + observed OOA in commit footer per conventions doc § C.3.
  4. pytest packages/eulerian-smoke/tests/ -v → all 4 test files GREEN; capture verbatim to tools/testkit/failing-tests-evidence/eulerian-smoke-implemented-<UTC>.txt + sha256. Phase 1 RED evidence UNTOUCHED.
  5. Produce TWO canonical captures per § 2 gate 10 + Stage 0 Task 0.4 cadence. Write captures/eulerian-smoke-ref/<descriptor>.{h5,json}. STOP-and-surface if measured per-step floor at runtime exceeds Stage 0 estimate by > 3× (gate the Stage 0 scope-analysis with measured-on-implementation reality per conventions doc § K.3 + § N).
  6. Determinism: capture-twice-and-diff per descriptor (test_run_twice_epsilon_diff GREEN). Record bit-exact vs epsilon-bounded in commit footer per conventions doc § F.4.
  7. PBT: 2 invariants (divergence_free_post_projection: random divergent IC → one projection → ∇·u < tolerance; smoke_density_nonneg: random non-negative IC → random step count → φ ≥ 0). Commit .hypothesis/ DB.
  8. Perf-ledger: ONE row PER descriptor for eulerian-smoke. Mirror hardware_id from prior sub-phases; re-anchor against actual hardware.
  9. Gate-13 worktree replay (conventions doc § E): git worktree add /tmp/bp-replay-216021a-eulerian-smoke 216021a; PYTHONPATH=. uv run pytest packages/eulerian-smoke/tests/ -v in the worktree; sha256 the output; assert failure-mode matches Phase 1 RED (4 ModuleNotFoundError collection errors); remove the worktree.
  10. Commit: feat(eulerian-smoke-stage1): implementation through gate 13. Footer cites: Phase 1 RED evidence sha256, new GREEN evidence sha256, capture sidecar paths + per-descriptor .h5 sha256, per-descriptor perf-ledger wall_clock_seconds, determinism-strategy declaration summary, **MMS convergence-rate ladder summary** (advection + projection: per-grid error norms + observed OOA + formal p=2 within ±0.5 PASS/FAIL), Stage 0 Task 0.4 finding (cadence + any numba consumption).

If Stage 1 runs long: stop at a clean cut-point per conventions doc § A.2 (after step 4 OR after step 6) and commit a partial checkpoint per conventions doc § B.3 (supersedes:-chain at the final checkpoint).

Closing — Commit docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-1-checkpoint-<UTC>.md per conventions doc § B.3. Body: 13-row gate-status table + per-descriptor capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + determinism summary + convergence-rate ladders (one per OOA test) + SHIFTED / banked items. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit + Convention #12 SHA back-fill. Then stop.

Out of scope: modifying any Phase 1 / closed-form / agent-based / RD-3D / sph-water / replay-tool-hotfix / numba-integration / mutation-script-hotfix / conventions-consolidation artifact; the shared NS-2D MMS solution (LBM consumes too); generalizing tools/testkit/code_verification/mms/runner.py (deferred to LBM plan-drafting); implementing any other Phase 1 sim; touching convergence files (Stage 2 owns); Stack-C C++ / CMake / Vulkan implementation (Phase-2+ per charter § 1.1).

Stuck → conventions doc § K (R-class STOP-AND-SURFACE) + charter § 9 (P23 inherited applies directly; P25 if added) + RD-3D § 9 (P23) + Phase 1 charter § 9.
```

### § 7.3 Stage 2 — Landing

```
You are the eulerian-smoke sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/conventions/sub-phase-conventions.md (§§ A.2, B, C, D, I, J load-bearing at Stage 2).
  2. docs/phases/sub-phase-eulerian-smoke.md §§ 4.3, 7.
  3. docs/_audits/phase-1/sub-phase-eulerian-smoke/{stage-0-checkpoint-<UTC>.md, stage-1-checkpoint-<UTC>.md}.
  4. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md (most-recent landing; § 7 Stage 2 step structure precedent; § 9.2 banked items inheritance).
  5. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md (§ 7.1 Cat 3 NO-OP for MMS-only sim — the precedent this sub-phase mirrors).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A). Read the file first; append.

Execute Steps 2.1–2.11 per charter § 4.3 + conventions doc § A.2. Load-bearing items:

  Step 2.3 — Cat 3 `volumetric-grid` subdir disposition (NO-OP).
    Pre-flight state: _SUBDIRS_PICKED_UP at HEAD = (Path("closed-form"), Path("agent-based"), Path("particle-fluids")). eulerian-smoke ships NO golden table (gate-5 is MMS-based per charter § 2). Mirror RD-3D's `continuous-ca` NO-OP precedent (conventions doc § I.2 / § M.4 N2). _SUBDIRS_PICKED_UP NOT extended. Verify pre-flight that no `tools/testkit/golden/tables/volumetric-grid/` subdir was incidentally created during Stage 1; if it was, that is a SHIFTED finding to surface, NOT a Cat 3 lift.

  Step 2.5 — Gate-13 replay (conventions doc § E). Worktree at 216021a. Record both RED-replay outcome and HEAD-GREEN outcome.

  Step 2.7 — B17 mutation-score artifact (OPERATOR-ROUTABLE — no pre-committed lean this sub-phase).
    Coordinator's prior leans: closed-form / agent-based PATH-B; RD-3D / sph-water PATH-A continue.
    OPTION PATH-A-continue (third proof-point): additively extend tools/testkit/mutation/mutmut-config.toml with [tool.mutmut.targets.eulerian_smoke] block (paths-to-mutate: packages/eulerian-smoke/eulerian_smoke/; tests-dir: packages/eulerian-smoke/tests/). Existing testkit/integrity/closed-form/agent-based/RD-3D/sph-water targets UNCHANGED. Use --disable-mutation-types string,fstring per conventions doc § J.3. Threshold per spec § 2.13 (advisory). Artifact: tools/testkit/mutation/sub-phase-eulerian-smoke-<UTC>.json. Commit slug: chore(eulerian-smoke-stage2-mutation-pathA): per-target extension + eulerian-smoke baseline.
    OPTION PATH-A-rebank: skip eulerian-smoke mutation at this sub-phase; record as banked into a focused test-augmentation sub-phase (sph-water 0.5581 + RD-3D 0.5927 surviving-mutant accumulation may be the more load-bearing follow-up per sph-water landing § 9.2). Commit slug: chore(eulerian-smoke-stage2-mutation-rebank): eulerian-smoke mutation banked.
    STOP-and-surface precondition (conventions doc § J.5 / sph-water R15 inheritance): if PATH-A is dispatched but mutmut runtime explodes against the canonical-capture re-execution at gate 11 (similar shape to sph-water's 1M-particle blow-up risk), STOP and surface before defaulting. The per-target runner can also exclude the gate-10 capture-generation tests per conventions doc § J.4 — additive runner-config decision.
    Do NOT pre-decide; operator routes at Stage 2 dispatch.

  Step 2.8 — CHANGELOG additive entry. Append `### sub-phase-eulerian-smoke` under [Unreleased]. Itemize: gate-13 GREEN-flip; first volumetric-grid sim; first NS-2D MMS exercise; inline-MMS convention; two canonical captures per Appendix D; Stage 0 Task 0.4 first practical exercise (per conventions doc § N); perf-ledger first-landing rows; Cat 3 NO-OP for volumetric-grid subdir; B17 routing outcome.

  Step 2.9 — Sub-phase landing audit per conventions doc § B.3. Front-matter: artifact: sub-phase, artifact_id: sub-phase-eulerian-smoke, both head_sha: AND head_sha_at_checkpoint:. Include § 12 "Stage 0 Task 0.4 retrospective" — was the analysis correct vs. measured Stage 1 reality? This is the first sub-phase exercising § N; the retrospective is load-bearing for whether Task 0.4 lands as established convention in the next conventions-doc refactor. Verdict-state CONFIRMED.

  Step 2.10 — Convention #12 SHA back-fill. NEVER --amend.

  Step 2.11 — Final summary. No -phase-N tag. Optional v0.1.5 non-phase point-release banked for operator (default lean: no tag per conventions doc § D.2). Surface to operator: "eulerian-smoke sub-phase landed at SHA <final>. eulerian-smoke ships all 13 gates GREEN — FIRST volumetric-grid sim in the project; FIRST exercise of the shared NS-2D MMS (load-bearing for LBM next per Phase 1 Stage 2 shift #18); FIRST practical exercise of Stage 0 Task 0.4 canonical-descriptor scope-analysis (conventions doc § N). Phase 0 + Phase 1 + four prior sub-phases unaffected; LBM and MPM still RED with ModuleNotFoundError pending their own sub-phases. B17 routing: <PATH-A-continue with kill-rates / PATH-A-rebank with rationale>. Cat 3 volumetric-grid subdir: NO-OP (MMS-only sim, no golden — RD-3D `continuous-ca` precedent). MMS-runner generalization: STILL banked (deferred to LBM plan-drafting per Path Y operator routing; now anchored by TWO inline examples). No -phase-N tag pushed; optional v0.1.5 banked. Next sub-phase: lattice-boltzmann-d3q19 (also uses NS-2D MMS; MMS-runner generalization becomes load-bearing for LBM plan-drafting); or mpm-multimaterial."

Stuck → conventions doc § K + charter § 9 + Phase 1 charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits conventions doc § A.2 + § B.3 + § B.4. Paths:

- Stage 0 / Stage 1 checkpoints: `docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-<N>-checkpoint-<UTC>.md`.
- Stage 2: the sub-phase landing audit itself.
- Continuation prompt with `eulerian-smoke-stage<N>-...` slug.

Convention #12 SHA back-fill at EVERY stage close (conventions doc § B.2).

---

## § 9. Risk surface and playbook

Risks inherited via conventions doc § K. Sim-specific:

- **R-NS-1 (canonical-capture-size vs 1 GB ceiling).** The 3D Taylor-Green at 128³ × 500 steps raw is ~21 GB. Stage 0 Task 0.4 + Stage 1 step 5 STOPs-and-surface gate the cadence decision. Mitigation: cadence-N override in sidecar metadata.
- **R-NS-2 (Jacobi pressure-projection convergence drift across runs).** The iteration-count must be deterministic; any tolerance-bound state at the boundary can produce 5 vs 6 iters across runs. Mitigation: fixed iter-cap + `≤` tolerance check (per P23 cause-#3 pattern from conventions doc § M.4 — reused here for projection).
- **R-NS-3 (MMS OOA failure for projection step).** Pressure-projection is a coupled Poisson solve; the formal OOA depends on the projection-solver convergence threshold being asymptotic in $h$. Mitigation: P23 inherited applies; ladder-choice and tolerance pinning are first-class. See P23 inheritance below.

### § 9.1 Inherited playbook

P21 (closed-form) + P22 (agent-based) + **P23 (RD-3D MMS-OOA debugging — applies directly to gate-5 work; conventions doc § M.4)** + P24 (SPH determinism) all apply via conventions doc.

### § 9.2 New playbook entry — DECISION

**P25 eulerian-grid determinism debugging — NOT added at this sub-phase.** Reasoning: the determinism risk surface for eulerian-smoke (semi-Lagrangian interpolation order; Jacobi iteration-count determinism; vertex-ordering in bilinear backtrace) is fully covered by:
- P22 (agent-based) — RNG-threading + iteration-order pinning.
- P23 (RD-3D) — periodic-BC stencil-order discipline (np.roll axis convention); SymPy/NumPy spot-check.
- P24 (sph-water) — fixed-iter-cap + `≤` tolerance check (re-usable for Jacobi projection).

A P25 entry would restate these in eulerian-grid clothing without surfacing a new failure mode. If Stage 1 surfaces an eulerian-grid-specific failure NOT covered by P22/P23/P24, P25 lands then with the actual failure mode as worked-example. The Stage 1 retrospective in the landing audit § 12 confirms or refutes this decision; if the operator at landing review judges P25 retroactively warranted, it lands in the next sub-phase's plan.

---

## § 10. Audit-trail discipline

Inherits conventions doc § B. Sub-phase audits live under `docs/_audits/phase-1/sub-phase-eulerian-smoke/`. Append-only check at Stage 2 Step 2.6 forbids edits to any file present at `v0.1.0-phase-1` OR within any prior sub-phase audit chain (conventions doc § B.1 protected-set growth). The shared NS-2D MMS solution at `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` is treated as append-only-protected (LBM consumes too).

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

- eulerian-smoke TDD bundle (5 spec docs + NS-2D MMS solution + probe + 4 failing test files) at SHA `216021a`.
- Shared NS-2D MMS solution at `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`.
- IC-1 / IC-3 / IC-6 (`vector_field` tier-2) infrastructure (Phase-1-shipped).
- 65 cumulative shifts (conventions doc § M) — baseline reality; not re-litigated.
- Prior sub-phases' resolved items by reference (conventions doc § L) — established tool behavior at HEAD.

### § 11.2 Outputs to subsequent sub-phases

- eulerian-smoke 13 gates GREEN; first volumetric-grid sim; first `vector_field` IC-6 exercise at sim scale.
- **Two new canonical captures** in `captures/eulerian-smoke-ref/` per Appendix D § D.2.3 (cadence per Stage 0 Task 0.4).
- **First practical exercise of conventions doc § N Task 0.4** — landing-audit retrospective confirms or refutes Task 0.4 as established convention. Next conventions-doc refactor lifts § N from PROPOSED to established if exercised cleanly here.
- **NS-2D MMS exercised first**; LBM (next sub-phase per Phase 1 Stage 2 shift #18) reuses it directly. **MMS-runner generalization (conventions doc § L.2 row 6) becomes load-bearing for LBM plan-drafting** — two concrete inline examples (RD-3D + eulerian-smoke) now anchor the generalization. The operator decides at LBM plan-drafting time: interpolate a focused MMS-pipeline-generalization sub-phase before LBM, OR generalize at LBM plan-time, OR inline once more.
- **Inline-MMS pattern established as a two-precedent convention** (Path Y operator routing landed).
- B17 routing outcome (third proof-point of PATH-A OR rebank precedent).
- Cat 3 `volumetric-grid` NO-OP precedent (continuous-ca-rd3d-style; subsequent MMS-only sims inherit).

### § 11.3 Inherited banked items still open going out

By reference to conventions doc § L.2 + § L.3 (Cat 3 sibling subdirs `hybrid-pg`, `lattice`; Cat 3 evaluator shims; mutation test-augmentation candidates; common-py adoption; B2/B3/B4/B5/B6/B11/B16; B-hotfix-1 / B-hotfix-2).

### § 11.4 Replay-chain non-participation + tag posture

Per conventions doc § D.2 + § D.4. This sub-phase does NOT participate in the cross-phase replay chain; next spec-phase pre-flight replays against `v0.1.0-phase-1`. Tag posture: **default lean no tag**; banked alternative `v0.1.5` (no `-phase-N`), operator-pushed only. Forbidden either way: any tag carrying `-phase-N`.

### § 11.5 Operator-routable items surfaced by this plan

For explicit operator confirmation at dispatch time:

1. **§ 1.1 language-pivot re-anchor** — confirm Python NumPy reference at Stack-D (default lean). Alternative would be a Stack-C C++/Vulkan port, which is materially different scope (Phase-2+ per spec § 5.6).
2. **§ 1.3 / Task 0.4 canonical-descriptor scope-analysis** — confirm Stage 0 dispatch agent executes Task 0.4 as specified at § 7.1 (first practical exercise of conventions doc § N). Alternative would be skipping Task 0.4 and routing the canonical-capture-size question at Stage 1 STOP-and-surface time (sph-water's R12 → R20 pattern); default lean is execute at Stage 0.
3. **§ 4.3 Step 2.7 B17 routing** — no pre-committed lean. Decide PATH-A-continue (third proof-point) vs PATH-A-rebank (the sph-water 0.5581 + RD-3D 0.5927 mutant accumulation suggests test-augmentation as the load-bearing follow-up).
4. **§ 9.2 P25 decision** — confirm "no P25 at this sub-phase" default lean. Alternative: add P25 pre-emptively with eulerian-grid-specific scaffolding.
5. **§ 11.4 v0.1.5 tag** — confirm no-tag default vs push-v0.1.5.

---

*End of eulerian-smoke sub-phase charter. First sub-phase plan drafted AGAINST the cross-sub-phase conventions doc rather than the most-recent-template; cross-cutting discipline inherited by reference, sim-specific deltas documented here. Inherits 65 shifts via conventions doc § M. First practical exercise of Task 0.4 canonical-descriptor scope-analysis (conventions doc § N PROPOSED). Inline-MMS pattern continued from RD-3D's S2 precedent per Path Y operator routing. MMS-runner generalization remains banked, now anchored by two concrete inline examples for LBM plan-drafting load-bearing.*

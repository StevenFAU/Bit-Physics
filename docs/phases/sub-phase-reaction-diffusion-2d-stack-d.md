# Reaction-Diffusion-2D → Stack-D Port — Sub-Phase Charter (THIRD spec-Phase-2 Sub-Phase)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — **FIRST per-sim cross-stack port sub-phase under spec-Phase-2**. Ports `reaction-diffusion-2d` from Stack-B (TypeScript / WebGPU; Phase-0 Block 8 frozen) to Stack-D (Python / Taichi; consumes Taichi-integration deliverables + IC-13/IC-14 capture-determinism-contract deliverables).
> **Sub-phase identity:** THIRD spec-Phase-2 sub-phase. First per-sim Stack-D port. Structural template for the seven subsequent Phase-2 cross-stack port sub-phases. This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries. No `-phase-N` tag is proposed.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.5 (post-IC-13 amendment; content-equivalent contract), 2.6 (cross-stack tolerance table — RD category default `relative = 1e-4`), 2.7 (capture format + canonical descriptor), 2.13–2.15 (mutation / PBT / perf-ledger gates), 3.5 (13-gate per-sim acceptance + per phase-2-plan § 1.5.1 v6 amendment 14th gate = cross-stack equivalence), 3.6 (Layer 5 per-replication requirements), 3.7 (variant directory shape), 5.2.1 (RD-2D Stack-B primary), 7.12 (phase-tag form), 7.13 (sub-phase artifact type), 11.3 item 2.1.D (this sub-phase's spec target), Appendix D § D.2.3 (canonical descriptor).
> **Parent conventions doc** (authoritative for every spec-Phase-2 sub-phase): `docs/conventions/sub-phase-conventions.md` (sha256 `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e` — verified at HEAD per plan-drafting-probe § 1). Inherits role model (§ A.3), three-stage cadence (§ A.2), audit / append-only discipline (§ B), Convention #12 SHA back-fill (§ B.2 tightened), commit-message convention (§ C), replay-chain non-participation (§ D.4), gate-13 worktree pattern (§ E), determinism convention (§ F), MMS gate-5 (§ I — does not apply; RD-2D uses MMS gate-4 + golden-via-canonical-capture gate-5 hybrid per spec-ref.md § 7), Cat 3 `_SUBDIRS_PICKED_UP` (§ I — `continuous-ca/` subdir is NO-OP since RD-2D's gate-5 is canonical-capture-vs-fresh-NumPy at rtol 1e-4, not a discrete golden table per spec-ref.md § 7), B17 PATH-A/PATH-B (§ J — relevant only if this sub-phase adds per-sim mutmut targets; lean: PATH-B re-bank per Taichi-integration § 9 row 4 cross-stack-verification-methodology rationale), R-class STOP-AND-SURFACE (§ K), capture cadence routing (§ P).
> **Parent sub-phase templates** (structure inheritance):
> - `docs/phases/sub-phase-agent-based.md` (PRIMARY — per-sim implementation template, most-evolved). This charter inherits § 1.5 + § 2 + § 3 + § 4 + § 5 + § 6 + § 7 standing orders + § 8 + § 9 + § 10 + § 11 structure verbatim with cross-stack-port deltas explicit.
> - `docs/phases/sub-phase-capture-determinism-contract.md` (SECONDARY — most-recent prior sub-phase; spec-Phase-2 audit-dir conventions + IC-13/IC-14 surface authoritative).
> - `docs/phases/sub-phase-taichi-integration.md` (TERTIARY — spec-Phase-2 entry pattern + Stack-D infrastructure source).
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Spec-Phase-1 landed at `v0.1.0-phase-1` (SHA `9998bc1`); landing audit verdict CONFIRMED.
> - All 10 sim packages (9 Phase-1 sims + Phase-0 RD-2D) GREEN through their phase-appropriate gate sets (capture-determinism-contract landing § 5.1 confirms RD-2D 14 tests GREEN; 342 total Python tests GREEN; 22 TS tests GREEN).
> - Taichi-integration landed at `cf7d553`; Stack-D infrastructure (workspace-registered common-py + Taichi-accessible dep + `set_taichi_deterministic` + `docs/common/taichi.md` + `tools/testkit/taichi_harness/` + hello-physics smoke exemplar) shipped as IC-11 + IC-12.
> - Capture-determinism-contract landed at `9bf5b68` + SHA back-fill `c4be56b`; IC-13 (content-equivalence contract semantics at spec § 2.5) + IC-14 (determinism-harness API; Python + TypeScript) shipped as first-class workspace surfaces.
> - Conventions doc stabilised at sha256 `167fe349…f2c58c2e` (post-capture-determinism-contract § A.2 + § F.3 + § B.7 amendments).
> - Bit-identity replay invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` held byte-identically across **18 invocations** through capture-determinism-contract Stage 0 (Stage 0 Task 0.0 = 19th invocation).
> - Canonical Stack-B capture frozen at Phase-0 Block 8: `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5` sha256 `bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0` + `.json` sha256 `585d7d8ab2db7db7b64b498b5436f414835e1e67ffb6a7ad962f3d4803d3a7bc`.
> - RD-2D MMS solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` (Phase-1 RD-3D Stage 2 R8 deliverable; co-bundled 2D + 3D; Python-callable for Stack-D gate-4).
> **Inherited shifts:** **107 documented entering this sub-phase** (FACT — capture-determinism-contract landing § 8.3 cumulative count). Carried forward by reference; not re-stated, not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md`. Read FIRST. Authoritative for the Phase-0 Stack-B baseline inventory (§ 2), Taichi-integration infrastructure inventory (§ 3), IC-13/IC-14 surface inventory (§ 4), cross-stack equivalence harness posture (§ 5), drift between phase-2-plan § 2.5 and HEAD (§ 6 — three load-bearing drifts), anchor-sketch verification per Convention M (§ 7), D1-D6 surface preview (§ 8), and 3 new plan-drafting shifts (§ 9).
> **Date drafted:** 2026-05-23.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1-D6 routing.

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase IS

The **FIRST per-sim cross-stack port sub-phase under spec-Phase-2**. Takes the Phase-0-Block-8-frozen `reaction-diffusion-2d` Stack-B (TypeScript / WebGPU) reference and produces a content-equivalent Stack-D (Python / Taichi) port through gates 4–14 of spec § 3.5 (per phase-2-plan § 1.5.1 v6 amendment — 13 stack-agnostic correctness gates + the Phase-2-specific 14th gate of cross-stack equivalence).

At close the Stack-D port ships:
1. **Stack-D Taichi implementation** at `packages/reaction-diffusion-2d-stack-d/` (per D6 lean; operator routes alternative directory shapes at charter close — see § 11.5).
2. **Stack-D spec sheet** at `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md` (sibling to existing `spec-ref.md` + `algebraic.md` + `determinism.md` + `README.md`).
3. **Pre-implementation probe report** at `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md`.
4. **Failing-tests evidence + sha256** at `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-<UTC>.txt` (gate-3 anchor; IC-8 TDD discipline; phase-2-plan § 1.5.1 Gate 3 explicit footer-hash requirement).
5. **Canonical Stack-D capture** at `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` (matches the HEAD-frozen canonical descriptor per § 6.1 of the probe; NOT the phase-2-plan § 2.5's stale `512sq-step1000`).
6. **Cross-stack equivalence harness extension** — `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (new file; Phase-2-plan § 2.5 anticipated it; first cross-stack pair landing here creates it de novo).
7. **All 13 stack-agnostic gates GREEN** for the Stack-D port (gates 4–13 per spec § 3.5 v2.4 expanded set + IC-13 contract semantics from capture-determinism-contract).
8. **Gate-14 cross-stack equivalence GREEN** — Stack-D capture diff'd against Stack-B reference via `tools/testkit/equivalence/harness.py::compare_captures` at `relative = 1e-4` (per HEAD `tolerance.toml` defaults; NOT the phase-2-plan § 2.5's stale `1e-5`). This is the **load-bearing 14th gate** of this sub-phase per phase-2-plan § 1.5.1 v6 amendment.
9. **Convergence-file edits** — CHANGELOG additive, `docs/dependencies.md` additive (NEW workspace member entry + Taichi-DSL consumption), `docs/perf-ledger.md` (NEW row per spec § 2.15 + phase-2-plan § 1.5.1 Gate 12).
10. **Schema-corpus entry** — placeholder/real capture at `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}` per phase-2-plan v6 amendment "Schema-corpus growth" (consumed by Phase 4 WU-A).
11. **Workspace member registration** in root `pyproject.toml` `[tool.uv.workspace].members` (only if D6 selects Option A; if Option B (subpackage) or Option C (continuous-ca path), this changes — see § 11.5).

### § 1.2 What this sub-phase is NOT

- A new spec-phase. Next spec-phase tag per spec § 7.12 is `v0.2.0-phase-2`; this sub-phase's commits accumulate to `main` without a `-phase-N` tag (§ 11.4).
- A modification of the Stack-B reference at `packages/reaction-diffusion-2d/`. Phase-0-Block-8-sealed code is append-only-protected per conventions doc § B.1 (15 protected sets at this sub-phase's Stage 2 close).
- A frontier variant (Phase 4+).
- A new sim. The 10 sim packages at HEAD are unchanged at sim count; this sub-phase adds a cross-stack port of an existing sim.
- A determinism-contract amendment. IC-13 + IC-14 are consumed verbatim from capture-determinism-contract close.
- A Taichi-infrastructure amendment. IC-11 + IC-12 are consumed verbatim from Taichi-integration close. No edits to `common/common-py/src/common_py/determinism.py` or `docs/common/taichi.md` are in scope.
- A tolerance-budget widening. `tools/testkit/equivalence/tolerance-budget.toml` `[budgets.*]` rows untouched; category default `relative = 1e-4` for `reaction-diffusion` applies without per-sim override (per probe § 5.3).
- A re-litigation of the phase-2-plan § 2.5 stage data. D1=SUPERSEDE ratification at Taichi-integration close stands; § 2.5 is consumed as REFERENCE not dispatch.
- Editing any Phase 0 / Phase 1 / post-Phase-1 / Taichi-integration / capture-determinism-contract audit file. Audit chain is append-only.
- Pre-committing D1 / D2 / D3 / D4 / D5 / D6. Those are operator decisions surfaced at § 11.5 for routing at charter close.

### § 1.3 Phase-1 + Taichi-integration + capture-determinism-contract inputs + 107 cumulative shifts inherited

(FACT — capture-determinism-contract landing § 8.3; Taichi-integration landing § 9; conventions doc § M for the cumulative shift inventory through sph-water + post-Phase-1 + post-spec-Phase-2-entries.)

**Closing posture this sub-phase inherits:**
- All 10 sim packages GREEN (342 Python tests + 22 TS tests at capture-determinism-contract Stage 2 sweep).
- 107 cumulative shifts (89 entering spec-Phase-2 + 9 Taichi-integration + 7 capture-determinism-contract + 2 cross-counting reconciliations).
- Bit-identity replay invariant `9399fc33…909f34` (18 invocations; 19th at Stage 0 Task 0.0).
- Conventions doc stabilised at `167fe349…f2c58c2e` (post-amendment).
- common-py first-class workspace member; Taichi `>=1.7,<2.0` workspace-accessible.
- Hello-taichi smoke + `tools/testkit/taichi_harness/` regression-test surface available.
- IC-13 + IC-14 first-class surfaces (spec § 2.5 + Python `run_twice_and_diff` + TS `runTwiceAndDiff`).
- Phase-0-Block-8-frozen RD-2D Stack-B reference + canonical capture (3 sha256s sealed).
- RD-2D MMS solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` (Phase-1 RD-3D Stage 2 R8 deliverable; Python-callable).

**Banked items disposition** (D5 disposition; see § 11.2 for full table):
- **Partial scope-in:** cross-stack verification methodology (this sub-phase IS the first cross-stack pair landing; consolidate the harness invocation pattern + tolerance routing + step-horizon documentation discipline in `equivalence.md`; full methodology consolidation defers to second cross-stack pair).
- **DEFER:** testing-improvements; evidence_paths LFS remediation; conventions doc § B.6 addendum (empty-file rejection); mid-Phase-1 capture regeneration; LBM/MPM `sim_runner_diagnostic` seed-propagation defect (NOT in scope; informs test-surface posture but does not gate).

### § 1.4 Sub-phase-specific posture

#### § 1.4.1 Stack-D determinism strategy under IC-13

(FACT — capture-determinism-contract § 1.4 + IC-13 at spec § 2.5 + Taichi-integration § 1.4.2 arch="cpu" mandate.)

The Stack-D Taichi port declares its determinism posture as `bit-exact-same-hw` at `arch="cpu"`, content-equivalent (NOT raw-file-byte-equal) under IC-13. The declaration is recorded as a docstring at the top of the Stack-D sim module (per conventions doc § F.1) and cited in the Stage 1b commit-message footer (per § F.1 + § C.3).

Mechanism:
- `set_taichi_deterministic(Config(seed=42, deterministic=True), arch="cpu")` invoked BEFORE any `@ti.kernel` decoration (R-P3; Taichi-integration R-T1 inherited).
- Reduction order: Taichi-DSL kernels write per-cell results to `u_next`/`v_next` fields from `u_curr`/`v_curr` reads only; no in-kernel reductions; no atomic scatter-add (Gray-Scott discretization is purely local 5-point stencil + pointwise reaction).
- Index ordering: `ti.ndrange(n, n)` enforces row-major iteration; `cpu_max_num_threads=1` prevents cross-thread non-determinism.
- RNG threading: IC perturbation seeded via `Config(seed=42)` → `numpy.random.default_rng(seed)` for the IC (matches Stack-B reference's IC pattern at `packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py::initial_condition`).
- Phase 2+ deferred (not in scope here): GPU arch determinism (cuda / vulkan / metal); FMA fusion posture; subgroup-collectives.

The content-equivalent contract (IC-13) is verified by `run_twice_and_diff` over the parsed Capture projection (every state array + every diagnostic entry compared via `np.array_equal`; storage-format metadata excluded per spec § 2.5).

#### § 1.4.2 Cross-stack equivalence posture against Stack-B reference (gate 14)

(FACT — phase-2-plan § 1.5.1 Gate 14 v6 amendment; spec § 2.6 + § 3.6.)

Gate 14 is the load-bearing cross-stack equivalence test for this sub-phase: the Stack-D Taichi-produced capture is diff'd against the Stack-B Phase-0-frozen reference capture via `tools/testkit/equivalence/harness.py::compare_captures` at `relative = 1e-4, absolute = 0.0` (the RD category default at HEAD; per probe § 5.2; NOT 1e-5 as phase-2-plan § 2.5 stated stalely).

The harness reads both `.h5` captures via h5py, parses to the Capture data model, diffs field-by-field (U, V state arrays at each of the 11 captured frames; mass_U, mass_V diagnostics), and returns an `EquivalenceVerdict { within_tolerance, per_field_diff, tolerance_table_used }`. Stage 1c's gate-14 acceptance is `within_tolerance == True` at the canonical descriptor.

**Stack-D content-equivalent same-stack (IC-13) is the bit-exact same-hw zero-tolerance special case of the cross-stack content-equivalent posture computed over the same Capture projection** (per spec § 2.5 operator-routed wording at capture-determinism-contract Stage 1 commit `26e1343`). The cross-stack diff at 1e-4 is the relevant equivalence relation against Stack-B WGSL (different arithmetic backend; different reduction-ordering primitives; different FP-accumulation primitives at the WebGPU compute shader vs. NumPy + Taichi).

#### § 1.4.3 MMS posture for the diffusion-operator code-verification (gate 4)

(FACT — `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` + `derivation.md` + spec-ref.md § 6.)

Gate 4 (code verification, Cat 3) for the Stack-D port consumes the MMS solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` (Phase-1 RD-3D Stage 2 R8 deliverable). The Stack-D port's gate-4 test surface:
- Instantiates `GrayScott2DSolution(D_u=0.16, D_v=0.08, F=0.0367, k=0.0649, L=1.0)`.
- Evaluates the manufactured solution + source terms at multiple grid resolutions (e.g., n=16, 32, 64, 128).
- Runs the Stack-D Taichi sim with the manufactured source terms injected; measures L2 error vs the manufactured solution.
- Verifies the observed order of accuracy matches `formal_spatial_order = 2` (5-point Laplacian) within ±0.5 per phase-2-plan § 1.5.1 Gate 4.

The MMS evaluator's pure-NumPy + `numpy.typing` surface is callable from the Stack-D Taichi sim wrapper (the wrapper accepts NumPy source-term arrays and writes them into Taichi fields before the per-step kernel call).

**Risk:** if the Stack-D Taichi sim does not expose an "inject source term" injection point at the per-step level (i.e., if the kernel is hard-coded to the canonical Gray-Scott reaction without source-term hook), gate-4 cannot be exercised without a modified-kernel test variant. Stage 1b's Taichi-kernel design MUST expose the source-term injection at the kernel level (e.g., `step_with_source(u, v, S_u, S_v, ...)` kernel signature, alongside the canonical-mode `step(u, v, ...)`).

#### § 1.4.4 Gray-Scott pattern-reproduction posture against Pearson 1993 (gate 5)

(FACT — spec-ref.md § 7 + algebraic.md § 2 Pearson 1993 λ-region.)

Gate 5 (Tier 1 NaN/Inf scan) + the implicit pattern-reproduction sanity at the canonical descriptor: the Stack-D Taichi sim at `F=0.0367, k=0.0649, D_u=0.16, D_v=0.08, n=128, dt=1, dx=1, seed=42, 2000 steps` produces a self-replicating-spots pattern in the λ region per Pearson 1993. The Stage 1b test surface includes:
- `tests/test_diagnostics.py::test_canonical_capture_is_healthy` — NaN/Inf scan across all 11 captured frames.
- `tests/test_diagnostics.py::test_canonical_capture_U_in_unit_interval` + `..._V_in_unit_interval` — both species remain in [0, 1] (Tier 2 scalar_field bounds).
- Pattern reproduction is verified indirectly via cross-stack equivalence at gate 14 (the Stack-B reference capture IS the Pearson λ-pattern; cross-stack match within 1e-4 implies the Stack-D port reproduces the same pattern).

#### § 1.4.5 Taichi-specific risk acknowledgments inherited from Taichi-integration § 9

(FACT — Taichi-integration § 9 R-T1 through R-T5 verbatim inherited.)

- **R-T1 (Taichi field-init order):** `ti.init()` (via `set_taichi_deterministic`) MUST precede every `@ti.kernel` decoration. Stack-D port's module-import order: (1) `import taichi as ti`; (2) `set_taichi_deterministic(...)` (or via sim-runner-entry-time call); (3) `ti.field(...)` allocations; (4) `@ti.kernel` decorations. See R-P3 below.
- **R-T2 (kernel `-> None` annotations forbidden):** Taichi 1.7.4 AST transformer raises on `-> None` return-annotated kernels. Stack-D port's kernels omit the annotation. See R-P4 below.
- **R-T3 (Python-3.12 locale-deprecation interaction):** filterwarnings already at `common/common-py/pyproject.toml`; Stack-D port inherits.
- **R-T4 (workspace import via uv):** Stack-D port at `packages/reaction-diffusion-2d-stack-d/` (D6 lean) registers as workspace member; imports common-py via `from common_py.{determinism, capture} import ...`.
- **R-T5 (canonical-tier vs diagnostic-tier):** Stack-D port may ship a single canonical-tier implementation (no FP-equivalent dual-implementation per conventions doc § F.2 unless Stage 1b surfaces a need); the Stack-B reference is the cross-stack content-equivalent partner (gate 14), not the FP-equivalent partner (which would require 1e-9 FP equivalence — distinct contract per § F.3).

### § 1.5 Role model, conventions, audit discipline

Inherited from conventions doc § A.3 + § B + § C verbatim. Single Claude Code agent at a time; single Claude.ai coordinator chat; one operator. Convention #12 SHA back-fill at every stage close per § B.2 tightened-discipline (full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed from earlier conversation context).

### § 1.6 Architecture — three stages

Adopts the three-stage cadence per conventions doc § A.2. Stage 1 sub-decomposes into 1a/1b/1c per D2 lean (every Phase-1 per-sim sub-phase decomposed Stage 1 into failing-tests-commit + implementation-commit; this sub-phase adds Stage 1c for cross-stack equivalence harness extension):

- **Stage 0 — Pre-flight.** Cross-phase replay against `v0.1.0-phase-1` (19th invocation); tolerance-budget carryover; canonical-descriptor scope-analysis per § N (RD-2D at 128² × 2000 steps × 11 frames is small — well under W1/memory/wall-clock ceilings); empirical validation that the Taichi-DSL 2D 5-point Laplacian + reaction kernel pattern scales cleanly from hello-taichi's 1D 64-cell × 100-step exemplar; verify the MMS solution's Stack-D-callable surface at the gate-4 injection point; Stage 0 checkpoint audit + Convention #12 SHA back-fill.
- **Stage 1 — Implementation** (3 sub-stages):
  - **Stage 1a — Failing-tests commit.** Test files at `packages/reaction-diffusion-2d-stack-d/tests/` (or per D6 routing) import the yet-to-exist Stack-D modules; tests fail with `ModuleNotFoundError` cleanly; failing-tests evidence captured + sha256 at `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-<UTC>.txt`. Gate-3 anchor per IC-8 + phase-2-plan § 1.5.1 Gate 3 footer-hash discipline.
  - **Stage 1b — Implementation commit.** Stack-D Taichi-DSL Gray-Scott implementation; canonical Stack-D capture produced via `sim_runner_seeded`; gates 4–13 GREEN; spec sheet `spec-ref-stack-d.md`; probe report; perf-ledger row; determinism-strategy declaration docstring. Spec § 6 + § 8 + § 9 fields filled in per phase-2-plan § 1.5.1 Gate 1.
  - **Stage 1c — Cross-stack equivalence + landing-prep.** `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` creation (new file); cross-stack diff witness via `compare_captures` Stack-D vs Stack-B at `relative = 1e-4`; gate-14 GREEN; tolerance.toml per-sim override if needed (probe lean: NOT needed; category default applies). Schema-corpus entry seeded at `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}`.
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive, `docs/dependencies.md` additive, `docs/perf-ledger.md` row append); integrity sweep (Cat 1–5 + Cat X); cross-package regression sweep at portfolio scale per conventions doc § B.7 (Python fan-out + TypeScript fan-out — note: TS fan-out for THIS sub-phase is NO-OP since Stack-D is Python-only); gate-13 worktree replay per § E; evidence-path verification; append-only check; sub-phase landing audit + Convention #12 SHA back-fill.

Each sub-stage gets its own checkpoint commit per conventions doc § A.4 + § B.2. NO `-phase-N` tag is prepared — see § 11.4 for tag posture.

---

## § 2. Deliverables (per gate, expanded set)

The 14-gate per-port acceptance contract per phase-2-plan § 1.5.1 v6 amendment + spec § 3.5 v2.4 expansion. Inherits the per-sim 13-gate posture from conventions doc + agent-based.md § 2 and adds gate 14 (cross-stack equivalence) as the load-bearing Phase-2-specific addition.

| # | Gate | Stack-D RD-2D deliverable | Acceptance |
|---|---|---|---|
| 1 | Spec sheet | `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md` (sibling to existing `spec-ref.md`) | 13-section template per spec § 8.2; § 5 cites Stack-D Taichi impl path; § 6 declares Stack-D verification posture; § 8 declares `bit-exact-same-hw` at `arch="cpu"`; § 9 declares cross-stack equivalence posture at `relative = 1e-4`. |
| 2 | Pre-implementation probe report | `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md` (sibling to existing `reaction-diffusion-2d.md`) | Enumerates API surfaces consumed from common-py (Writer, Config, set_taichi_deterministic); upstream citations (Pearson 1993 + Gray-Scott 1983 + Salari & Knupp 2000 for MMS); test fixtures produced; public exports declared. |
| 3 | Failing tests committed + output hash recorded | `packages/reaction-diffusion-2d-stack-d/tests/` (or per D6 routing) + `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-<UTC>.txt` + sha256 in commit footer per phase-2-plan § 1.5.1 Gate 3 | Failing-tests commit footer: `Failing-tests-output: <path>` + `Failing-tests-output-hash: sha256:<hex>`. Impl commit footer: `Implements-failing-tests-from: <failing-tests-sha>` + `Failing-tests-output-hash-witnessed: sha256:<same-hex>`. |
| 4 | Code verification (Cat 3 / MMS) | `packages/reaction-diffusion-2d-stack-d/tests/test_code_verification.py` invokes the MMS solution; observed order of accuracy ≥ 1.5 (within ±0.5 of formal 2.0) | At grid resolutions n=16/32/64/128; L2 error scaling. |
| 5 | Tier 1 diagnostics | `tests/test_diagnostics.py::test_canonical_capture_is_healthy` | NaN/Inf scan clean across 11 captured frames at canonical descriptor. |
| 6 | Tier 2 scalar_field diagnostics | `tests/test_diagnostics.py::test_canonical_capture_U_in_unit_interval` + `_V_in_unit_interval` | Both species in [0, 1] across every captured step. |
| 7 | Cat 1 citations | spec-ref-stack-d.md § 2 cites Pearson 1993 + Gray-Scott 1983 (same as Stack-B) + the Stack-B spec-ref.md cross-reference | `python -m integrity --cat 1` clean. |
| 8 | Cat 2 public API | `reaction_diffusion_2d_stack_d.{reference, sim, invariants}` exports match the probe § 5 contract | `python -m integrity --cat 2` clean. |
| 9 | Canonical capture + testkit-replayable | `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` (matches HEAD-frozen Stack-B descriptor) + schema-corpus copy at `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}` | `load_capture` round-trips; manifest payload sha256 recorded. |
| 10 | Determinism declaration (IC-13 content-equivalent) | `tests/test_determinism.py::test_stack_d_is_content_equivalent` invokes IC-14 `run_twice_and_diff(sim_runner_seeded, seed=42)` | `verdict.content_equivalent == True`. Determinism-strategy declaration docstring at top of `sim.py` per conventions doc § F.1; cited in commit footer. |
| 11 | PBT (≥ 2 invariants per spec § 2.14) | `tests/test_pbt_invariants.py` ships the 3 invariants from spec-ref.md § 6 (`monotone_bounds`, `mass_approximately_conserved`, `periodic_bc_satisfied`) at `n_examples = 20` | Hypothesis `.hypothesis/` example database committed. |
| 12 | First-landing wall-clock in perf-ledger | Row in `docs/perf-ledger.md`: `reaction-diffusion-2d \| taichi-cpu \| gray-scott-lambda-128sq-seed42-step2000 \| <s> \| <hardware_id> \| <commit-sha> \| 2026-05-XX \| baseline` | Wall-clock recorded; not > 2× Stack-B baseline (Stack-B baseline 0.931 s per Block 8 § 4). |
| 13 | Failing-tests replay verifiable | `git worktree add /tmp/bp-replay-<failing-sha>-rd2d-stack-d <failing-sha>`; pytest reproduces `ModuleNotFoundError` failure mode; HEAD GREEN | Worktree-pattern per conventions doc § E; structural reproduction (not full-text sha256). |
| 14 (Phase-2 specific) | Cross-stack equivalence to Stack-B | `compare_captures(stack_b_capture, stack_d_capture)` at `relative = 1e-4` | `within_tolerance == True`. Per-field diff documented in `equivalence.md`. Step-horizon at which cross-stack diff approaches/exceeds 1e-4 documented (D4 lean: full step-2000). |

**Acceptance for "sub-phase complete":** all 14 gates GREEN; integrity sweep clean (aspirational byte-identical to `810cd6e3…23411f98` baseline — note: this sub-phase introduces a new sim package + new captures + new spec sheet, which MAY introduce new Cat-1 / Cat-2 / Cat-3 / Cat-5 rows; the byte-identical-streak is NOT load-bearing); cross-package sweep GREEN at portfolio scale; mutation artifact (B17 routing per § 11.5 D5 — lean PATH-B re-bank); landing audit committed; SHA back-fill committed. **No `-phase-N` tag pushed**; optional non-phase point-release tag (`v0.1.11`, no suffix) banked operator decision at Stage 2 close.

---

## § 3. Interface contracts

### § 3.1 ICs consumed (existing, not redefined)

(FACT — Phase 1 charter § 3.9 + Taichi-integration § 3.2 + capture-determinism-contract § 3.2 IC catalog.)

- **IC-2 (capture I/O Python)** — `common_py.capture.Writer` writes the canonical Stack-D capture.
- **IC-4 (determinism config Python)** — `common_py.determinism.Config` plumbs seed + deterministic flag.
- **IC-5 (Tier 2 substack)** — `diagnostics.tier2.scalar_field.{check_bounds, check_conservation}` consumed by `test_diagnostics.py` (per spec-ref.md § 10).
- **IC-8 (probe report)** — `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md` § 5 is the public-API contract this sub-phase implements against; gate-3 failing-tests commit ordering per spec § 1.3 step 4.
- **IC-9 (phase audit body)** — checkpoint + landing audits follow conventions doc § B.3 structure.
- **IC-11 (Stack-D Taichi init wrapper)** — `common_py.determinism.set_taichi_deterministic(config, arch="cpu")` invoked at sim-runner entry.
- **IC-12 (Taichi convention doc)** — `docs/common/taichi.md` § 2 + § 4.5 + § 4.6 rules applied verbatim.
- **IC-13 (content-equivalence contract semantics)** — spec § 2.5 wording governs the determinism contract; `bit-exact-same-hw` declaration is the zero-tolerance same-stack special case.
- **IC-14 (determinism-harness API)** — `tools/testkit/determinism::run_twice_and_diff` (Python) consumed by gate-10 test.

### § 3.2 New ICs produced

| IC | Surface | Load-bearing for |
|---|---|---|
| **IC-15 (NEW — per-sim cross-stack-port spec-sheet template)** | The pattern of a Stack-X port shipping a sibling `spec-ref-stack-<x>.md` next to the primary `spec-ref.md` within `docs/sim-specs/<category>/<sim>/`, plus an `equivalence.md` covering Stack-B↔Stack-X (and subsequent stacks). | Every subsequent Phase-2 cross-stack port sub-phase consumes IC-15 by reference (the 7 remaining cross-stack pairs). |

Numbering convention per capture-determinism-contract § 3.2: IC-13 / IC-14 → IC-15. Subsequent sub-phases continue IC-16+.

---

## § 4. Stage decomposition

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay** (8-gate canonical set against `v0.1.0-phase-1`).
  ```
  uv run python -m integrity.scripts.replay_prior_phase \
    --prior-phase phase-1 \
    --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
    --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
  ```
  **19th invocation** of bit-identity invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`. Exit 0 + sha256 match → proceed. Mismatch → BLOCKED per playbook P20; write `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-blocked-replay-<UTC>.md`; surface; stop.

- **Task 0.1 — Tolerance-budget carryover.** Edit `tools/testkit/equivalence/tolerance-budget.toml`: set `[phase].phase = "sub-phase-reaction-diffusion-2d-stack-d"`, bump `opened_at`. NO `[budgets.*]` widening. Commit: `chore(reaction-diffusion-2d-stack-d-stage0-tolerance-budget): sub-phase carryover from sub-phase-capture-determinism-contract`.

- **Task 0.2 — Phase-0 RD-2D canonical capture sha256 reverify.** sha256sum `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`; compare to Block-8 baseline (`bcae544a…f92148f0` + `585d7d8a…03d3a7bc`). Mismatch → BLOCKED (Stack-B reference is the cross-stack equivalence partner).

- **Task 0.3 — Canonical-descriptor scope-analysis per conventions doc § N.** RD-2D at 128² × 2000 steps × 11 frames; per-frame payload = 128 × 128 × 8 bytes × 2 species = 262,144 bytes per frame × 11 frames ≈ 2.9 MB (matches Stack-B canonical capture size at HEAD). Wall-clock floor: Stack-B NumPy reference at 0.931 s (Block 8 § 4); Stack-D Taichi-cpu single-threaded estimated 1× to 3× per § N.5 production-correction band (no broadphase scaling; Stack-0 estimate = Stack-1 implementation shape; NumPy-vectorized-to-Taichi-DSL ratio uncertain — surface at Stage 0 if estimate exceeds bound). Memory: well under host RAM (single 2D field allocation). **Result: well under all ceilings; no scope mismatch.**

- **Task 0.4 — Empirical Taichi-DSL 2D kernel pattern validation.** Before Stage 1a dispatch: write a small smoke-tier 2D explicit-diffusion Taichi sim (mirror of `hello_taichi.py` at 2D + 5-point Laplacian; no reaction term yet; 32² grid × 10 steps); verify scaling pattern matches Phase-0 RD-2D Stack-B NumPy output within rtol 1e-4 on a single test point; verify the determinism contract (run twice + diff at gate-10 mechanism). NOT a production deliverable — a Stage 0 confidence-builder. If the Taichi-DSL 2D kernel pattern surfaces unexpected issues (e.g., field-init order at 2D, kernel-launch grid sizing for 2D ndrange), STOP and surface per Hard Rule 2.

- **Task 0.5 — Verify MMS solution's Stack-D-callable surface at the gate-4 injection point.** Verify `GrayScott2DSolution.evaluate(x, y, t)` + `source_term(x, y, t)` are invokable from a Python wrapper that feeds the resulting NumPy arrays into Taichi fields per-step. NOT a production gate-4 deliverable — a Stage 0 dependency check. If the MMS solution's surface is incompatible with the Taichi sim's source-term injection pattern, STOP and surface (likely requires a Stack-D sim-runner-with-source-term-injection variant at Stage 1b).

- **Closing.** `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-checkpoint-<UTC>.md` per IC-9 abbreviated structure. Front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(reaction-diffusion-2d-stack-d-stage0-checkpoint): Stage 0 pre-flight complete`. Apply Convention #12 SHA back-fill per § B.2 tightened-discipline if closing-commit SHA differs from the audit's `head_sha:`: NEW commit `chore(reaction-diffusion-2d-stack-d-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`.

### § 4.2 Stage 1 — Implementation (3 sub-stages per D2 lean)

#### § 4.2.1 Stage 1a — Failing-tests commit (single session, single commit)

(Per IC-8 + spec § 1.3 step 4 + phase-2-plan § 1.5.1 Gate 3.)

1. Create the Stack-D test surface (per D6 routing):
   - `packages/reaction-diffusion-2d-stack-d/tests/__init__.py`
   - `packages/reaction-diffusion-2d-stack-d/tests/conftest.py`
   - `packages/reaction-diffusion-2d-stack-d/tests/test_code_verification.py` (MMS-based gate 4)
   - `packages/reaction-diffusion-2d-stack-d/tests/test_diagnostics.py` (Tier 1 + Tier 2)
   - `packages/reaction-diffusion-2d-stack-d/tests/test_pbt_invariants.py` (3 invariants)
   - `packages/reaction-diffusion-2d-stack-d/tests/test_determinism.py` (IC-14 invocation)
   - `packages/reaction-diffusion-2d-stack-d/tests/test_reference_sanity.py`
   - `packages/reaction-diffusion-2d-stack-d/tests/test_cross_stack_equivalence.py` (gate 14 — `compare_captures` Stack-D vs Stack-B canonical)
2. Each test file imports `reaction_diffusion_2d_stack_d.{reference, sim, invariants}` (which do not yet exist).
3. Run `pytest packages/reaction-diffusion-2d-stack-d/tests/ -v`; verify all tests fail with `ModuleNotFoundError` cleanly.
4. Capture verbatim output to `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-<UTC>.txt`; sha256.
5. Commit: `test(reaction-diffusion-2d-stack-d-stage1a): failing tests for Stack-D port`. Footer: `Failing-tests-output: tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-<UTC>.txt`, `Failing-tests-output-hash: sha256:<hex>`.

**Closing.** `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1a-checkpoint-<UTC>.md` per IC-9. Body: failing-tests output sha256 + verbatim test-collection summary. Commit: `chore(reaction-diffusion-2d-stack-d-stage1a-checkpoint): Stage 1a failing-tests commit complete`. Convention #12 SHA back-fill if needed.

#### § 4.2.2 Stage 1b — Implementation commit (single session, single commit)

**Determinism-strategy declaration first** per conventions doc § F.1: before any implementation, write the determinism strategy as a docstring at the top of `<sim>.sim`:
  - Reduction-ordering posture: no in-kernel reductions; per-cell local stencil only.
  - Index-sorting / iteration-order pinning: `ti.ndrange(n, n)` row-major; `cpu_max_num_threads=1`.
  - RNG threading: `Config(seed=...)` → NumPy default_rng for IC perturbation (matches Stack-B).
  - Phase-2+ deferred: GPU arch determinism; FMA fusion; subgroup-collectives.

Per-task sequence (new-files-first per Convention A):

1. **Stack-D package skeleton.** Create `packages/reaction-diffusion-2d-stack-d/pyproject.toml` (workspace member declaring deps: bit-physics-common-py, bit-physics-testkit, bit-physics-diagnostics, taichi, h5py, hypothesis, numpy; dev: mypy, pytest, ruff). Create `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/__init__.py` + `reference/__init__.py`.

2. **Stack-D reference module.** `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/gray_scott_taichi.py`:
   - `canonical_params()` returns the locked F=0.0367, k=0.0649, D_u=0.16, D_v=0.08, dx=1, dt=1, n=128 set (same as Stack-B).
   - `initial_condition(p, seed)` deterministic seeded IC matching Stack-B's NumPy IC (U≈1, V≈0 with centred V-seed + uniform-RNG perturbation; NumPy-backed for IC determinism; values then copied into Taichi fields).
   - `@ti.kernel step_diffuse_react(u: ti.template(), v: ti.template(), u_next: ti.template(), v_next: ti.template(), D_u: ti.f64, D_v: ti.f64, F: ti.f64, k: ti.f64, dt: ti.f64, dx: ti.f64, n: ti.i32)`: 5-point Laplacian + reaction (canonical Gray-Scott update). NO `-> None` annotation per IC-12 § 4.6.
   - `@ti.kernel step_diffuse_react_with_source(u, v, u_next, v_next, S_u, S_v, ...)`: gate-4 MMS injection variant per § 1.4.3.
   - `evolve(p, seed, n_steps, capture_interval)` yields `(step_idx, U_np, V_np)` at the configured cadence; copies Taichi fields out to NumPy arrays for capture write.

3. **Stack-D sim wrapper.** `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/sim.py`:
   - Determinism-strategy declaration docstring at top per conventions doc § F.1.
   - `sim_runner_seeded(seed, out_dir) -> Path` runs canonical params (2000 steps, 128×128) + writes capture via `common_py.capture.Writer`. Calls `set_taichi_deterministic(Config(seed=seed, deterministic=True), arch="cpu")` BEFORE field allocation + kernel decoration.
   - `sim_runner_pbt(initial_condition_sample, out_dir) -> Path` short 32×32 / 10-step sim from Hypothesis-generated smooth IC (mirrors Stack-B PBT runner).

4. **Stack-D invariants module.** `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/invariants.py` ships the 3 PBT invariants from spec-ref.md § 6 (`monotone_bounds`, `mass_approximately_conserved`, `periodic_bc_satisfied`) implemented against the Stack-D sim_runner_pbt.

5. **Stack-D spec sheet.** `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md` (sibling to existing spec-ref.md). Same 13-section template; § 5 cites Stack-D Taichi impl path; § 6 declares Stack-D verification posture (MMS-driven gate-4 against the Phase-1+ MMS pipeline + canonical-capture-replay against Stack-D's own canonical capture); § 8 declares `bit-exact-same-hw` at `arch="cpu"`; § 9 declares cross-stack equivalence posture at `relative = 1e-4`.

6. **Pre-implementation probe report.** `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md` (sibling to `reaction-diffusion-2d.md`). Enumerates API surfaces consumed (from common-py, taichi); upstream citations; test fixtures; public exports.

7. **Implement test bodies + run to GREEN.** Fill in the failing-tests bodies from Stage 1a with real assertions:
   - `test_code_verification.py`: MMS-based gate 4 at n=16/32/64/128; observed-order check ≥ 1.5.
   - `test_diagnostics.py`: Tier 1 + Tier 2 against canonical capture.
   - `test_pbt_invariants.py`: 3 Hypothesis invariants at n_examples=20.
   - `test_determinism.py`: `run_twice_and_diff(sim_runner_seeded, seed=42)` → `verdict.content_equivalent == True`.
   - `test_reference_sanity.py`: Stack-D reference module unit sanity.
   - `test_cross_stack_equivalence.py`: SKIP at Stage 1b (lands at Stage 1c).
   - Run `pytest packages/reaction-diffusion-2d-stack-d/tests/ -v` → all GREEN except the cross-stack equivalence test (deferred to 1c).
   - Capture verbatim output to `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-implemented-<UTC>.txt`; sha256.

8. **Produce canonical Stack-D capture (gate 9).** Run `sim_runner_seeded(seed=42, out_dir=captures/reaction-diffusion-2d-stack-d/)`. Result: `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` matching the HEAD-frozen canonical descriptor. Record both sha256s.

9. **Perf-ledger row.** Append to `docs/perf-ledger.md` per spec § 2.15: `reaction-diffusion-2d | taichi-cpu | gray-scott-lambda-128sq-seed42-step2000 | <s> | <hardware_id> | (this commit) | <date> | baseline`.

10. **Workspace member registration.** Edit root `pyproject.toml` `[tool.uv.workspace].members` adding `"packages/reaction-diffusion-2d-stack-d"` (only if D6 = Option A; if D6 = Option B, this changes).

11. **Gate-13 verification.** `git worktree add /tmp/bp-replay-<stage-1a-sha>-rd2d-stack-d <stage-1a-sha>`; run `PYTHONPATH=. uv run pytest packages/reaction-diffusion-2d-stack-d/tests/ -v` in the worktree; verify `ModuleNotFoundError` failure mode matches the Stage 1a evidence. Remove the worktree.

12. **Commit.** `feat(reaction-diffusion-2d-stack-d-stage1b): Stack-D Taichi implementation through gate 13`. Footer cites:
    - Stage 1a failing-tests evidence sha256.
    - New GREEN evidence sha256.
    - Canonical capture sidecar paths + .h5 + .json sha256s.
    - Perf-ledger wall_clock_seconds.
    - Determinism-strategy declaration docstring path + summary.
    - MMS gate-4 observed-order summary (per-grid L2 error table).
    - Implements-failing-tests-from: <stage-1a-sha>; Failing-tests-output-hash-witnessed: sha256:<same-hex>.

**Closing.** `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1b-checkpoint-<UTC>.md` per IC-9. Body: 13-row gate-status table (gates 4-13 GREEN; gate-14 PENDING-1c) + capture sha256(s) + GREEN evidence sha256 + gate-13 replay outcome + determinism-strategy declaration summary + SHIFTED/banked items. Commit: `chore(reaction-diffusion-2d-stack-d-stage1b-checkpoint): Stage 1b implementation complete`. Convention #12 SHA back-fill if needed.

#### § 4.2.3 Stage 1c — Cross-stack equivalence + landing-prep (single session, single commit)

1. **Create `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md`** (NEW file). Documents Stack-B↔Stack-D cross-stack equivalence harness invocation, tolerance routing, step-horizon documentation, per-field diff witness.

2. **Run cross-stack equivalence harness.** `python -c "from equivalence.harness import compare_captures; v = compare_captures(Path('captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json'), Path('captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json')); print(v)"`. Capture output. Document `within_tolerance`, per-field diff (max_abs_err / max_rel_err for U + V at each captured frame), step-horizon analysis.

3. **Gate-14 acceptance.** If `within_tolerance == True` at `relative = 1e-4`: GREEN. If `within_tolerance == False`: per § 9 R-P2, document the step at which cross-stack diff exceeds tolerance; surface to operator per Hard Rule 2 BEFORE Stage 2 dispatch (do NOT silently widen tolerance; tolerance widening requires separate operator-approved commit per spec § 2.6).

4. **Tolerance.toml per-sim override (probe lean: NOT needed).** If gate-14 fails at category-default 1e-4 and operator routes per-sim widening, add `[overrides.reaction-diffusion-2d]` to `tools/testkit/equivalence/tolerance.toml`. Probe lean: not needed; do NOT pre-commit.

5. **Schema-corpus entry.** Copy the Stack-D canonical capture to `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}` per phase-2-plan v6 amendment "Schema-corpus growth". Manifest's `payload.path` rewritten for the legacy-naming convention; record sha256.

6. **Update test_cross_stack_equivalence.py.** Enable the test (remove SKIP); verify GREEN.

7. **Commit.** `feat(reaction-diffusion-2d-stack-d-stage1c): cross-stack equivalence harness extension + gate 14 GREEN`. Footer cites:
    - Stack-B capture sha256 + Stack-D capture sha256.
    - Equivalence-harness verdict + per-field diff witness.
    - Step-horizon at which cross-stack diff approaches/exceeds 1e-4 (documented).
    - `equivalence.md` sha256.
    - Schema-corpus entry sha256.
    - Tolerance.toml override (if any; lean: none).

**Closing.** `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1c-checkpoint-<UTC>.md` per IC-9. Body: 14-row gate-status table + cross-stack equivalence witness + step-horizon documentation + schema-corpus entry. Commit: `chore(reaction-diffusion-2d-stack-d-stage1c-checkpoint): Stage 1c cross-stack equivalence complete`. Convention #12 SHA back-fill if needed.

### § 4.3 Stage 2 — Landing (single session if Stage 1 was clean)

Inherits `sub-phase-agent-based.md` § 4.3 Steps 2.1 → 2.11 structure + capture-determinism-contract § 4.3 portfolio-scale-sweep extension. Deltas for this sub-phase:

- **Step 2.1 — Closing-commit anchor re-check.** Re-grep every concrete path / SHA / sha256 across charter + 3 stage-1 checkpoints + Stage 0 checkpoint + new spec sheet + new probe report + new equivalence.md + capture sidecars.

- **Step 2.2 — Test sweep at portfolio scale (Python + TypeScript fan-out per conventions doc § B.7).** Full per-package + tools sweep at HEAD. Python: 10 sims (including new `packages/reaction-diffusion-2d-stack-d`) + tools/integrity + tools/diagnostics + tools/testkit + common/common-py. TypeScript: `common/common-ts` (NO behavioural change expected; Stack-D port is Python-only). Document any counting-variance per § B.7 + capture-determinism-contract § 8.4.

- **Step 2.3 — Cat 3 disposition.** `continuous-ca` subdir at `_SUBDIRS_PICKED_UP` is currently NOT picked up (per conventions doc § I.4 — the four siblings `hybrid-pg`, `lattice`, `continuous-ca`, plus already-picked closed-form/agent-based/particle-fluids). RD-2D Stack-D ships NO new golden table (gate-5 is canonical-capture-vs-fresh-NumPy / cross-stack-equivalence, not a discrete golden — per spec-ref.md § 7 + RD-3D `continuous-ca` NO-OP precedent at conventions doc § M.4 N2). **Decision: NO-OP — no `_SUBDIRS_PICKED_UP` extension; no `continuous-ca/` golden subdir created.** This matches the RD-3D Stage 2 N2 precedent.

- **Step 2.4 — Integrity sweep** (Cat 1, 2, 3, 4, 5, X). Aspirational byte-identical check against the FOURTH-byte-identical baseline `810cd6e3…23411f98` (capture-determinism-contract Stage 2 § 6). **NOTE: this sub-phase introduces a new sim package (Cat 2 new public API), new spec sheet (Cat 1 + Cat 4), new probe report (Cat 1), new capture (Cat 2 sim_metadata), new perf-ledger row (Cat 5 audit-link surface). Byte-identical streak likely BREAKS at this sub-phase.** Surface the per-Cat deltas in the landing audit; the byte-identical streak is informational, NOT load-bearing for verdict CONFIRMED.

- **Step 2.5 — Evidence-path verification.** `verify_evidence --strict` over all new sub-phase audits.

- **Step 2.6 — Gate-13 replay verification per conventions doc § E.** Re-run Stage 1b step 11 from the landing perspective (worktree at the Stage 1a failing-tests-commit SHA); record both the failing-tests replay outcome and the HEAD GREEN outcome as FACT in the landing audit.

- **Step 2.7 — Append-only check.** CI semantics + strict-mode. **16 protected sets at Stage 2 close** (Phase 0 + Phase 1 + 15 prior sub-phase landings including capture-determinism-contract).

- **Step 2.8 — Mutation-score artifact (B17 routing).** Per conventions doc § J + capture-determinism-contract § 9 D5 row 11 banked precedent. Default lean: **PATH-B re-bank** (this sub-phase is a single-sim cross-stack-port; per-sim mutmut targets for a Taichi-DSL impl add cost without proportionate baseline value at first cross-stack pair). Operator may route PATH-A at dispatch. If PATH-B: produce `tools/testkit/mutation/sub-phase-reaction-diffusion-2d-stack-d-<UTC>.json` framework-validated artifact per § J.

- **Step 2.9 — Convergence-file edits.** CHANGELOG additive entry; `docs/dependencies.md` additive entry (NEW workspace member); `docs/perf-ledger.md` row (already landed at Stage 1b deliverable 9; cross-check at landing).

- **Step 2.10 — Sub-phase landing audit.** `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-<UTC>.md` per IC-9 body. Front-matter `artifact: sub-phase`, `artifact_id: sub-phase-reaction-diffusion-2d-stack-d`, both `head_sha:` AND `head_sha_at_checkpoint:`. `evidence_paths:` + `evidence_hashes:` enumerate: Stage 0 + Stage 1a + Stage 1b + Stage 1c checkpoints; new spec sheet; new probe report; new equivalence.md; canonical capture sidecars; perf-ledger; CHANGELOG; dependencies.md; mutation artifact (per PATH routing); cross-stack equivalence harness witness. Verdict-state CONFIRMED. Commit: `chore(reaction-diffusion-2d-stack-d-stage2-landing-audit): sub-phase landing audit`.

- **Step 2.11 — Convention #12 SHA back-fill** (tightened § B.2 discipline). `git rev-parse HEAD` at summary-composition time → replace placeholder; new commit. NEVER `--amend`. Commit: `chore(reaction-diffusion-2d-stack-d-stage2-sha-backfill): back-fill landing audit SHA per Convention #12`.

- **Step 2.12 — Final summary.** No `-phase-N` tag proposed. Optional `v0.1.11` non-phase point-release tag banked for operator (lean: NO tag, per conventions-refactor / Taichi-integration / capture-determinism-contract precedent). Surface to operator with landing-audit path, 14-gate status table, D1-D6 verdicts as routed, and next-sub-phase recommendation.

---

## § 5. Dispatch — operator workflow

Inherited from `sub-phase-agent-based.md` § 5 + capture-determinism-contract § 5 verbatim. Identity reads "reaction-diffusion-2d-stack-d sub-phase coordinator chat"; § 7 prompts are the dispatchable units.

**Tag posture.** Same as predecessors. No `-phase-N` tag. Lean: no intermediate tag.

---

## § 6. Coordinator prompt

Inherits Phase 1 § 6 / capture-determinism-contract § 6 verbatim; identity reads "reaction-diffusion-2d-stack-d sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + Stack-B reference reverify + scope-analysis + Taichi-DSL 2D pattern validation + MMS injection-point verify | pending | — | — | — |
| 1a | failing-tests commit (gate 3 anchor) | pending | — | — | — |
| 1b | Stack-D Taichi implementation (gates 4-13) | pending | — | — | — |
| 1c | cross-stack equivalence harness extension (gate 14) | pending | — | — | — |
| 2 | integrity sweep + portfolio-scale regression sweep + mutation artifact + convergence + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All prompts share these **sub-phase conventions** (inherited from conventions doc + capture-determinism-contract § 7 standing orders, with substitutions):

- Commit slug `chore` / `feat` / `test` / `docs` + `reaction-diffusion-2d-stack-d-stage<N><a|b|c>-<scope>` (non-phase form; no `-phase-N` tag exists).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/`, `tools/testkit/{determinism, capture, equivalence, code_verification}/`.
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` per conventions doc § B.3.
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit committed at `v0.1.0-phase-1` OR within any of the 15 prior sub-phase audit chains. The Phase-0-Block-8-sealed Stack-B code at `packages/reaction-diffusion-2d/` is APPEND-ONLY-PROTECTED.
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close per conventions doc § B.2 tightened-discipline.
- Operator-only tag-pushing per spec § 7.12; the agent NEVER runs `git tag` or `git push origin <tag>`.
- `verify_evidence` accepts `sha256:HEX` prefix at HEAD; use prefix form throughout.
- Empty-file rejection (Taichi-integration § 8.3 N6): when listing pytest-subpackage init files as evidence_paths, EITHER omit them OR add a single-line docstring.
- Hard Rule 2 — if anything looks structurally wrong (e.g., MMS solution surface incompatible with Taichi sim source-term injection; Taichi 1.7.4 + arch="cpu" produces non-deterministic output at 128² scale; Stack-B canonical capture sha256 drifted from Block-8 baseline; cross-stack equivalence harness produces unexpected verdict structure at the first true matching-sim invocation), STOP and surface; do NOT paper over.

### § 7.1 Stage 0 — Pre-flight

```
You are the reaction-diffusion-2d-stack-d sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md (this sub-phase's charter — source of truth). § 7 standing orders inherited.
  2. docs/conventions/sub-phase-conventions.md (POST-amendment canonical; sha256 167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e). Verify the sha256 matches at HEAD.
  3. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md (probe report — Phase-0 Stack-B baseline + Taichi-integration infrastructure + IC-13/14 surfaces + MMS pipeline + cross-stack equivalence harness state + D1-D6 surface).
  4. docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md (immediately-prior landing audit; § 8 + § 9 banked items; § 10 next-sub-phase recommendation).
  5. docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md (Stack-D infrastructure source; § 11.3 outputs available for consumption).
  6. docs/_audits/phase-0/block-8-rd-2d-2026-05-19T16-00-36Z.md (Stack-B reference baseline; canonical capture sha256s frozen).
  7. docs/sim-specs/continuous-ca/reaction-diffusion-2d/{spec-ref,algebraic,determinism,README}.md (Stack-B spec sheets; the Stack-D spec sheet siblings these at Stage 1b deliverable 5).
  8. tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/{solution.py,derivation.md} (MMS solution; gate-4 anchor for Stack-D).
  9. common/common-py/smoke/hello_taichi.py (Stack-D structural exemplar; mirror the kernel structure at 2D for the Stack-D port).

Spec-Phase-1 landed at v0.1.0-phase-1 (SHA 9998bc1); all 10 sim packages GREEN; capture-determinism-contract landed at 9bf5b68 + SHA back-fill c4be56b. Stage 0 is pre-flight only; you do NOT implement the Stack-D port (that's Stage 1).

Execute Tasks 0.0 → 0.5 → closing per charter § 4.1 exactly:

  Task 0.0 — Run replay_prior_phase against phase-1 with the 8-gate canonical set. 19th invocation of bit-identity invariant 9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34. Exit 0 + sha256 match → proceed. Mismatch → BLOCKED per P20; write stage-0-blocked-replay-<UTC>.md; surface; stop.

  Task 0.1 — Bump tolerance-budget.toml's [phase] to "sub-phase-reaction-diffusion-2d-stack-d"; bump opened_at. NO [budgets.*] widening. Commit per charter § 4.1.

  Task 0.2 — sha256sum both Phase-0 RD-2D canonical capture files; compare to Block-8 evidence_hashes (h5: bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0; json: 585d7d8ab2db7db7b64b498b5436f414835e1e67ffb6a7ad962f3d4803d3a7bc). Mismatch → BLOCKED (Stack-B reference is the cross-stack equivalence partner).

  Task 0.3 — Canonical-descriptor scope-analysis per conventions doc § N. Verify RD-2D at 128² × 2000 steps × 11 frames is under W1/memory/wall-clock ceilings. Probe estimate: ~3 MB capture; wall-clock floor 1× to 3× Stack-B's 0.931 s. Document.

  Task 0.4 — Empirical Taichi-DSL 2D kernel pattern validation. Write a small smoke-tier 2D explicit-diffusion Taichi sim (32² × 10 steps; no reaction); verify scaling matches Stack-B NumPy output within rtol 1e-4 on a single test point; verify run_twice_and_diff returns content_equivalent=True. NOT a production deliverable. If unexpected issues surface, STOP and surface per Hard Rule 2.

  Task 0.5 — Verify MMS solution Stack-D-callable at gate-4 injection point. Instantiate GrayScott2DSolution(D_u=0.16, D_v=0.08, F=0.0367, k=0.0649, L=1.0); call evaluate(x, y, t) + source_term(x, y, t) on a sample 32² grid; verify the returned NumPy arrays are feedable into Taichi fields (sanity copy + read-back). If the surface is incompatible, STOP and surface.

  Closing — Commit docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-checkpoint-<UTC>.md per IC-9. Apply Convention #12 SHA back-fill. Surface and stop.

Out of scope: any Stage 1 implementation work; any edit outside tolerance-budget.toml + new audit files + Stage-0 throwaway smoke-tier validation scratch.

Stuck → conventions doc § 9 + charter § 9.
```

### § 7.2 Stage 1a — Failing-tests commit

```
You are the reaction-diffusion-2d-stack-d sub-phase Claude Code agent, Stage 1a (failing-tests commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md §§ 2 (deliverables), 4.2.1 (Stage 1a 5-step sequence), 7 (standing orders).
  2. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-checkpoint-<UTC>.md (Stage 0 pre-flight; replay PASS + Stack-B reverify + Taichi 2D pattern validation + MMS surface verified).
  3. packages/reaction-diffusion-2d/tests/*.py (Stack-B test surface; mirror its shape for Stack-D — same gate structure, different import target).
  4. docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md § 6 (PBT invariants enumerated; same 3 invariants port to Stack-D).
  5. tools/testkit/probes/reports/reaction-diffusion-2d.md (Stack-B probe report; Stack-D probe report siblings at Stage 1b deliverable 6).

Scope — Stage 1a 5-step sequence per charter § 4.2.1:

  1. Create Stack-D test surface at packages/reaction-diffusion-2d-stack-d/tests/ (per D6 lean — operator may route differently; verify routing at dispatch). 8 test files: __init__.py, conftest.py, test_code_verification.py, test_diagnostics.py, test_pbt_invariants.py, test_determinism.py, test_reference_sanity.py, test_cross_stack_equivalence.py.
  2. Each test file imports reaction_diffusion_2d_stack_d.{reference,sim,invariants} (which do NOT yet exist).
  3. Run pytest packages/reaction-diffusion-2d-stack-d/tests/ -v → all tests fail with ModuleNotFoundError cleanly.
  4. Capture verbatim output to tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-<UTC>.txt; sha256.
  5. Commit per charter § 4.2.1.

Closing — Commit docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1a-checkpoint-<UTC>.md per IC-9. Convention #12 SHA back-fill. Stop.

Out of scope: any implementation; any spec sheet authoring (Stage 1b); any cross-stack equivalence work (Stage 1c); any edit outside the new packages/reaction-diffusion-2d-stack-d/tests/ + failing-tests-evidence file + audit files.

Stuck → conventions doc § 9 + charter § 9. On any structurally-wrong finding, STOP and surface per Hard Rule 2.
```

### § 7.3 Stage 1b — Implementation commit

```
You are the reaction-diffusion-2d-stack-d sub-phase Claude Code agent, Stage 1b (implementation commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md §§ 1.4 (Stack-D posture), 2 (deliverables), 3 (IC contracts), 4.2.2 (Stage 1b 12-step sequence), 7 (standing orders), 9 (R-P playbook entries).
  2. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/{stage-0,stage-1a}-checkpoint-<UTC>.md.
  3. packages/reaction-diffusion-2d/reaction_diffusion_2d/{reference/gray_scott_numpy.py, sim.py} (Stack-B reference impl; port to Taichi-DSL preserving algorithm identity).
  4. common/common-py/smoke/hello_taichi.py (Taichi structural exemplar; 1D → 2D extension).
  5. docs/common/taichi.md (IC-12; § 2 init form + § 2.1 arch=cpu + § 4.5 filterwarnings + § 4.6 no -> None annotation).
  6. common/common-py/src/common_py/{determinism.py, capture.py} (IC-11 + IC-2; consumed by sim_runner_seeded).
  7. tools/testkit/determinism/harness.py (IC-14; consumed by gate-10 test).
  8. tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py (gate-4 MMS solution).

Determinism-strategy declaration first per charter § 1.4.1 + conventions doc § F.1.

Scope — Stage 1b 12-step sequence per charter § 4.2.2 (single sub-bundle commit; ~+800 to +1200 lines net).

Closing — Commit docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1b-checkpoint-<UTC>.md per IC-9. Body: 13-row gate-status table (gates 4-13 GREEN; gate-14 PENDING-1c) + capture sha256(s) + GREEN evidence + gate-13 replay + determinism-strategy declaration summary. Convention #12 SHA back-fill. Stop.

Out of scope: cross-stack equivalence work (Stage 1c); landing convergence (Stage 2); modification of Stack-B Phase-0 code at packages/reaction-diffusion-2d/ (append-only-protected per Convention A); Stack-C / Stack-E anything.

Stuck → conventions doc § 9 + charter § 9. Hard Rule 2 applies — STOP and surface on any structural drift (Taichi 1.7.4 + arch="cpu" non-deterministic at 128² scale; MMS source-term injection blocked; canonical capture descriptor unreachable from Taichi-DSL impl).
```

### § 7.4 Stage 1c — Cross-stack equivalence + landing-prep

```
You are the reaction-diffusion-2d-stack-d sub-phase Claude Code agent, Stage 1c (cross-stack equivalence harness extension) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md §§ 1.4.2 (cross-stack equivalence posture), 2 (gate 14), 4.2.3 (Stage 1c 7-step sequence), 7 (standing orders), 9 (R-P2 step-horizon risk).
  2. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1b-checkpoint-<UTC>.md (Stage 1b close; Stack-D canonical capture sha256 recorded).
  3. tools/testkit/equivalence/harness.py (compare_captures signature + EquivalenceVerdict shape).
  4. tools/testkit/equivalence/tolerance.toml ([defaults.reaction-diffusion] relative = 1e-4).
  5. tools/testkit/equivalence/tolerance-budget.toml ([budgets.reaction-diffusion.cross_stack] relative = 1e-4).
  6. docs/architecture.md § 2.6 (cross-stack tolerance table) + § 3.6 (Layer 5 per-replication requirements).

Scope — Stage 1c 7-step sequence per charter § 4.2.3.

Gate-14 acceptance: within_tolerance=True at relative = 1e-4 across all 11 captured frames (U + V state arrays).

R-P2 (Gray-Scott chaotic-regime drift). If gate-14 fails: document the step at which cross-stack diff exceeds 1e-4; STOP and surface per Hard Rule 2 BEFORE Stage 2 dispatch. Do NOT silently widen tolerance — tolerance widening requires separate operator-approved commit per spec § 2.6 + conventions doc § L.

Closing — Commit docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-1c-checkpoint-<UTC>.md per IC-9. Body: 14-row gate-status table (all gates GREEN) + cross-stack equivalence witness + step-horizon documentation + schema-corpus entry sha256. Convention #12 SHA back-fill. Stop.

Out of scope: Stage 2 landing convergence; any Stage 1b implementation amendment.

Stuck → conventions doc § 9 + charter § 9. Hard Rule 2 applies.
```

### § 7.5 Stage 2 — Landing

```
You are the reaction-diffusion-2d-stack-d sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md §§ 4.3 (Stage 2 12-step sequence), 7 (standing orders), 11 (sub-phase coherence + D1-D6 routings as decided by operator).
  2. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/{stage-0, stage-1a, stage-1b, stage-1c}-checkpoint-<UTC>.md.
  3. docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md (parent landing audit; § 6 byte-identical integrity sweep baseline 810cd6e3…23411f98).
  4. docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md (per-sim implementation Stage 2 template).

Execute Steps 2.1 → 2.12 per charter § 4.3 exactly.

Acceptance: all 14 gates GREEN; portfolio-scale regression sweep clean (Python + TS fan-out); integrity sweep clean (byte-identical streak likely BREAKS due to new sim package; document per-Cat deltas); evidence-path verification clean; append-only check clean; mutation artifact (PATH-B re-bank default per § 4.3 Step 2.8); landing audit committed; Convention #12 SHA back-fill committed.

If Stage 2 surfaces a CONFIRMED-blocking issue (e.g., portfolio-scale sweep shows new regressions in a Phase-1 sim due to workspace-member registration), STOP and SURFACE per Hard Rule 2; do NOT silently relax acceptance criteria.

Stuck → conventions doc § 9 + charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits conventions doc § A.3 + § A.4 + § B.2 verbatim. Stage 0 / Stage 1a / Stage 1b / Stage 1c each ship a checkpoint audit; Stage 2 ships the landing audit. All five closes are followed by Convention #12 SHA back-fill commits per § B.2 tightened-discipline.

---

## § 9. Risk surface + problem-solving playbook

Inherits conventions doc § 9 playbook entries P1-P26 verbatim + agent-based.md § 9 (P22 determinism debug) + RD-3D § 9 (P23 MMS gate-4) + Taichi-integration § 9 R-T1 through R-T5. **NEW R-class entries SPECIFIC to this sub-phase:**

- **R-P1 — Cross-stack equivalence at gate-14 against Stack-B WGSL is the FIRST true matching-sim invocation in the portfolio.** Taichi-integration Stage 2 Step 2.9 invoked `compare_captures` against hello-taichi-cpu vs advection_1d (different-sim case; expected `within_tolerance=False`). This sub-phase exercises the harness against a TRUE matching-sim pair for the first time. The harness API has been smoke-tested at hello-physics; RD-2D's Capture structure (state field U + V × 11 frames at 128²) is larger than hello-taichi's. **Mitigation:** Stage 1c surfaces the per-field diff witness verbatim; Stage 1c R-P1 specific check verifies the harness output structure is consistent with smoke-tier output. If unexpected harness behavior surfaces at scale, STOP and surface per Hard Rule 2.

- **R-P2 — Gray-Scott chaotic-regime drift at long horizons.** Same-seed bit-exact same-stack is achievable; pattern reproduction at 2000 steps may approach cross-stack tolerance limit. IC-13 contract is exact element-wise equal within same-stack; cross-stack tolerance is `relative = 1e-4` per HEAD tolerance.toml. **Mitigation:** Stage 1c documents step-horizon at which cross-stack diff approaches/exceeds 1e-4. If gate-14 fails at step-2000: STOP and surface; do NOT silently widen tolerance (separate operator-approved amendment required per spec § 2.6). Operator routes either (a) tolerance amendment or (b) step-horizon override (compare at shorter horizon; document beyond).

- **R-P3 — Taichi field-initialization order (R-T1 inherited).** `ti.init` MUST precede every `@ti.kernel` decoration. Stack-D port module-import order: `import taichi as ti`; `set_taichi_deterministic(...)` (or via sim-runner-entry-time call); `ti.field(...)` allocations; `@ti.kernel` decorations. The hello-taichi smoke is the structural exemplar; RD-2D port must follow.

- **R-P4 — Kernel-launch grid sizing.** Stack-B WGSL uses 8×8 workgroups at 128² grid (per `gray_scott.wgsl`); Stack-D Taichi-cpu uses `ti.ndrange(n, n)` with `cpu_max_num_threads=1` (no workgroup analog). **The Stack-D grid sizing is structurally different** from Stack-B; do NOT attempt to mirror WGSL workgroup sizing. The cross-stack equivalence is content-equivalent at 1e-4 (NOT bit-exact); the per-cell update is algebraically identical even if the kernel-launch primitive differs.

- **R-P5 — MMS pipeline for diffusion-operator code verification.** Phase-1 RD-3D Stage 2 § 7.6 landed the 2D MMS solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py`. Stack-D port's gate-4 consumes this; verify Stack-D-callable at Stage 0 Task 0.5; verify the source-term injection kernel `step_diffuse_react_with_source` is implementable at Stage 1b deliverable 2. If injection blocks at the Taichi-DSL kernel level (e.g., Taichi field passing for runtime-sized source arrays), STOP and surface.

- **R-P6 — LBM/MPM `sim_runner_diagnostic` seed-propagation defect (banked from capture-determinism-contract Stage 1 N1).** Does NOT affect RD-2D directly. The R-D2-pattern (synthetic-capture `drifting_runner` for spot-checks) is available if gate-10 testing surfaces a need; lean: NOT needed (RD-2D's `sim_runner_seeded` is a fresh build matching the Stack-B `sim_runner_seeded` pattern, which IS seed-honoring per Block-8).

### § 9.1 New playbook entry (P27)

> **P27 — Cross-stack content-equivalent diff debugging (FIRST true matching-sim cross-stack invocation).**
> *When to apply:* gate-14 cross-stack equivalence fails at relative = 1e-4 cross-stack between Stack-D Taichi-cpu output and Stack-B WGSL reference output.
> *Common causes, in priority order:*
> 1. **Different IC perturbation across stacks.** Stack-B's `initial_condition(p, seed)` uses NumPy `default_rng`; Stack-D must use the SAME NumPy IC then copy into Taichi fields, NOT a Taichi-side random. Fix: assert IC bit-identical at step=0 across stacks BEFORE running cross-stack diff.
> 2. **Different boundary-condition primitive.** Stack-B uses `numpy.roll` (Python); WGSL uses `i32 % n`; Taichi-cpu uses `ti.ndrange` + manual wrap (`(i + 1) % n`). All three are algebraically identical, but FP accumulation order on a single cell may differ. The 1e-4 cross-stack tolerance should absorb this.
> 3. **Different FP accumulation order in the 5-point Laplacian.** WGSL sums in shader-defined order; NumPy sums via vectorized ops; Taichi-cpu sums in kernel-defined order. The five-term sum is associative in real arithmetic but not in IEEE-754 doubles; the 1e-4 tolerance should absorb this.
> 4. **Chaotic-regime amplification at long horizons.** Gray-Scott λ-region is chaotic; small initial FP differences compound across 2000 steps. If diff approaches 1e-4 only at the final step(s), document the step-horizon at which 1e-4 is approached and surface R-P2.
> 5. **Capture descriptor mismatch.** Verify Stack-D capture's manifest descriptor exactly matches Stack-B's (sim name, variant, capture_interval, step_count, capture frames). The harness compares `payload.config` + `payload.steps`; manifest mismatch → KeyError.
> *Debug-step ordering:* binary-search the step at which divergence first exceeds 1e-4 (step 0 / step 200 / step 1000 / step 2000); then per-field (U or V); then per-region (corner vs centre of the grid).

---

## § 10. Audit-trail discipline

Inherits conventions doc § B verbatim. Sub-phase audit dir: `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/`. All audits in this dir are append-only per § B.1; **16 protected sets at Stage 2 close** (Phase 0 + Phase 1 + 15 prior sub-phase landings).

Audit front-matter `artifact:` enum: Stage 0 / Stage 1a / Stage 1b / Stage 1c checkpoints use `artifact: stage`; Stage 2 landing audit uses `artifact: sub-phase` (`artifact_id: sub-phase-reaction-diffusion-2d-stack-d`).

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

16 parent audits (Phase 0 landing + 9 Phase-0 blocks + Phase 1 landing + 9 per-sim landings + 5 hotfix landings + 1 conventions-refactor + 2 spec-Phase-2 sub-phase landings; full list at front-matter when this charter ships its plan-drafting landing audit). The 14-gate deliverable list derives from the plan-drafting-probe + the closest analogue (`sub-phase-agent-based.md` 13-gate per-sim template) + the Phase-2-specific 14th gate per phase-2-plan § 1.5.1 v6 amendment.

**Cumulative shifts entering this sub-phase: 107** (capture-determinism-contract landing § 8.3). Plan-drafting closing-shift count: expected 110 per probe § 9 (N1 + N2 + N3 plan-drafting shifts).

### § 11.2 Banked items inherited + their disposition

(FACT — capture-determinism-contract landing § 9 D2 disposition + § 10 next-sub-phase recommendation.)

| # | Item | Disposition at this charter close |
|---|---|---|
| 1 | Testing-improvements sub-phase | **DEFER** — separate routing |
| 2 | D2 contract redesign (capture-determinism-contract) | **RESOLVED at capture-determinism-contract close** — IC-13/IC-14 consumed |
| 3 | D3 inline docstring updates | **RESOLVED at capture-determinism-contract close** |
| 4 | D4 CI strict-fanout | **RESOLVED at capture-determinism-contract close** |
| 5 | D5 conventions doc amendment | **RESOLVED at capture-determinism-contract close** — sha256 167fe349…f2c58c2e baseline |
| 6 | Cross-stack verification methodology | **PARTIAL SCOPE-IN at this sub-phase** — first cross-stack pair landing here; equivalence.md ships the harness invocation pattern + tolerance routing + step-horizon documentation discipline; full methodology consolidation defers to second cross-stack pair (next Stack-D port: sph-water, eulerian-smoke, or LBM; OR the Stack-C RD-2D port if dispatched parallel) |
| 7 | evidence_paths LFS remediation (per § B.6) | **DEFER** — focused infrastructure hotfix bundle candidate with row 8 |
| 8 | conventions doc § B.6 addendum — empty-file rejection drift mode (Taichi N6) | **DEFER** — bundle candidate with row 7 |
| 9 | Mid-Phase-1 capture regeneration | **DEFER** — per-sim work; not RD-2D |
| 10 | Taichi smoke kernel patterns as exemplars for first Stack-D port | **CONSUMED at THIS sub-phase** — hello_taichi.py is the structural template for the Stack-D RD-2D Taichi-DSL kernel |
| 11 | LBM/MPM `sim_runner_diagnostic` seed-propagation defect (capture-determinism-contract Stage 1 N1) | **DEFER** — outside RD-2D Stack-D scope; informs test-surface posture but does not gate |
| 12 (Stage 2 N1) | Fourth-in-a-row byte-identical integrity sweep precedent | **CONSUMED informationally** — this sub-phase introduces a new sim package, expected to BREAK the byte-identical streak; the precedent is for future infra-only sub-phases |
| 13 (Stage 2 N2) | Sweep-output sha256 wall-clock-influenced variance | **CONSUMED at Stage 2** — sweep counts (not sha256) are the canonical invariant per conventions § B.7 |

### § 11.3 Outputs

After this sub-phase lands:

- **The FIRST per-sim Stack-D port** lands in the portfolio. Structural exemplar for the 3 remaining Stack-D port sub-phases (sph-water, eulerian-smoke, LBM-D3Q19) and the 3 Stack-E port sub-phases (eulerian-smoke, LBM, MPM) which inherit a similar pattern.
- **The FIRST true matching-sim cross-stack equivalence witness** in the portfolio (gate 14 at relative = 1e-4 Stack-B WGSL ↔ Stack-D Taichi-cpu). Subsequent cross-stack ports inherit the harness-invocation pattern + tolerance routing + step-horizon documentation discipline established at this sub-phase's `equivalence.md`.
- **IC-15 (per-sim cross-stack-port spec-sheet template)** established as the canonical template for spec sheets at the cross-stack-port level (`spec-ref-stack-<x>.md` sibling to `spec-ref.md` + shared `equivalence.md`).
- **Phase 4 WU-A schema-corpus** gains a new entry at `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.{h5,json}`.
- **Phase 4 Diff RD (item 4.1)** gains its Stack-D substrate (per phase-2-plan § 1.3.4 phase-fit-verification table).

### § 11.4 Replay-chain non-participation + tag posture

Inherits conventions doc § D.2 + § D.4 verbatim. This sub-phase does NOT participate in the cross-phase replay chain. The next spec-phase pre-flight (spec-Phase-3 or spec-Phase-2-landing if any) replays against `v0.1.0-phase-1`. The replay resolver's single-integer regex mechanically enforces this.

**Tag posture:** No `-phase-N` tag (forbidden per § D.2). Optional non-phase point-release `v0.1.11` (no `-phase-N` suffix) is a banked operator decision at Stage 2 close. Lean: NO intermediate tag, per conventions-refactor / Taichi-integration / capture-determinism-contract precedent.

### § 11.5 D1-D6 surface — operator-routable; NOT pre-committed by plan-drafting

(See probe § 8 for full surface preview. Reproduced here for charter-time routing.)

**D1 — Sub-phase naming convention for cross-stack port sub-phases.**
- **Probe lean:** `sub-phase-reaction-diffusion-2d-stack-d` (full sim slug + `-stack-d` suffix). Adopted in this charter's filename + audit-dir name + commit slug prefix.
- **Alternative A:** `sub-phase-rd2d-stack-d-port` (acronym + suffix).
- **Alternative B:** `sub-phase-reaction-diffusion-2d-port-stack-d`.
- **Downstream:** the precedent established here propagates to 7 subsequent Phase-2 cross-stack port sub-phases.
- **Status:** charter and audit artifacts already use the lean form; if operator routes alternative, the rename is mechanical (charter file + audit dir + commit slug + workspace member name).

**D2 — Stage 1 decomposition (monolithic vs 1a/1b/1c).**
- **Probe lean + charter default:** Stage 1a (failing-tests) / 1b (impl) / 1c (cross-stack equivalence harness extension).
- **Alternative:** monolithic Stage 1 (single sub-bundle commit). Acceptable only if dispatch-time scope estimate stays under +500/-50 lines net. Probe estimate ~+800 to +1200 lines; decomposition justified.
- **Downstream:** if monolithic ships, sub-phase converges in ~10 total commits; if decomposed, ~14 total commits.

**D3 — Cross-stack equivalence tolerance value.**
- **Probe lean + charter default:** `relative = 1e-4, absolute = 0.0` per HEAD `tolerance.toml` + `tolerance-budget.toml` (NOT phase-2-plan § 2.5's stale `1e-5`).
- **No per-sim override needed** at category default.
- **Alternative:** if Stage 1c surfaces 1e-4 untenable (R-P2 chaotic-regime), operator routes either (a) tolerance amendment (separate operator-approved commit) or (b) step-horizon override.
- **Downstream:** if 1e-4 holds (lean), no tolerance.toml edit; if widening needed, separate amendment chain.

**D4 — Step-horizon for cross-stack equivalence run.**
- **Probe lean + charter default:** full canonical step-2000 (HEAD-frozen descriptor).
- **Alternative:** shorter horizon (e.g., step ≤ 1000) if Stage 1c R-P2 surfaces a principled reason. Probe finds no such reason at this time.
- **Downstream:** Stage 1c documents the step at which cross-stack diff approaches/exceeds 1e-4 tolerance regardless of routing.

**D5 — Banked-items disposition.**
- **Probe lean + charter default:** Partial scope-in for cross-stack verification methodology (equivalence.md consolidates the harness pattern + tolerance routing + step-horizon documentation discipline). Full methodology consolidation defers to second cross-stack pair. Other banked items DEFER.
- **Alternative:** full DEFER on cross-stack methodology (wait for second cross-stack pair before any consolidation). Probe lean: PARTIAL is correct (the first cross-stack pair NEEDS some methodology documentation; full consolidation can wait).

**D6 — Port directory shape (NEW; surfaced by DRIFT-3 in probe § 6.3).**
- **Probe lean + charter default:** Option A — `packages/reaction-diffusion-2d-stack-d/` (sibling workspace member).
- **Alternative A:** `packages/reaction-diffusion-2d/stack_d/` (subpackage inside existing — violates Convention A; requires modification of Phase-1 sealed pyproject.toml).
- **Alternative B:** `continuous-ca/reaction-diffusion-2d/ref-stack-d/` (phase-2-plan § 2.5 original; inconsistent with Phase-1 portfolio structure).
- **Downstream:** the precedent established here propagates to 7 subsequent Phase-2 cross-stack port sub-phases. **Operator routes at charter close.**

**Operator decisions on D1-D6 are recorded in the plan-drafting landing audit + cited back at each Stage's dispatch prompt as the routing context.**

---

## § 12. Sub-phase scope vocabulary

Per conventions doc § C.1: `<reaction-diffusion-2d-stack-d-stage<N><a|b|c>-<scope>>` for Stage 0/1a/1b/1c/2 commits; `<reaction-diffusion-2d-stack-d-plan-drafting-<scope>>` for plan-drafting commits; SHA back-fill commits use `-sha-backfill` suffix per § B.2.

---

*End of charter. Stage 0 is dispatchable in a fresh Claude Code session against this plan after operator routing of § 11.5 (D1-D6).*

# sph-water → Stack-D Port — Sub-Phase Charter (SECOND spec-Phase-2 cross-stack port)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — **SECOND per-sim cross-stack port sub-phase under spec-Phase-2** (following `reaction-diffusion-2d` Stack-D, which landed at SHA `7747d68`). Ports `sph-water` from its Phase-1 reference (Python NumPy + scipy.cKDTree + numba; `stack.name="numpy-reference"`) to Stack-D (Python / Taichi-DSL / CPU), consuming Taichi-integration (IC-11/12) + capture-determinism-contract (IC-13/14) + audit-chain-correctness (IC-16) deliverables, against the RD-2D Stack-D structural template.
> **Sub-phase identity:** SECOND spec-Phase-2 cross-stack port. The **empirical-validation pair for the IC-15 candidate methodology** established at RD-2D Stack-D, and the **first production consumer of IC-16** at gate-5. NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries. No `-phase-N` tag proposed.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (sha256 `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` — verified at HEAD per probe § 0) §§ 2.5 (IC-13 content-equivalent contract), 2.6 (cross-stack tolerance table — `sph` category default `relative = 1e-4`), 2.7 (capture format + canonical descriptor), 3.5 (per-sim acceptance gates + phase-2-plan § 1.5.1 14th gate = cross-stack equivalence), 3.6 (Layer 5 per-replication), 5.4 (particle-fluid / SPH; sph-water Stack-C primary), 7.5 + Appendix G.7 (IC-16 citations), **11.3 item 2.2** ("SPH to Stack D (Taichi reference port)"; phase-2-plan work item **2.2.D**), Appendix D § D.2.3 (canonical descriptor).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` — verified at HEAD per probe § 0). § B.6 has **3 modes** at HEAD (Mode 1 / Mode 2 RESOLVED / Mode 3 ADDED). § C.1 cross-stack port naming operative (RD-2D D1). § B.7 sweep-template addendum operative. § A.2 / § F.3 amended at capture-determinism-contract. Inherits role model (§ A.3), three-stage cadence (§ A.2), append-only discipline (§ B), Convention #12 SHA back-fill (§ B.2 tightened + audit-chain-correctness Stage-1b N1 enumerate-all-placeholders), commit-message convention (§ C), replay-chain non-participation (§ D.4), gate-13 worktree pattern (§ E), determinism convention (§ F), R-class STOP-AND-SURFACE (§ K), capture cadence routing (§ P).
> **Structural inheritance template:** `docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md` (the per-sim cross-stack-port template; the only existing instance of this shape). This charter inherits its § 1–§ 12 structure with **sph-water deltas explicit** (golden-table gate-4 not MMS; NumPy-reference source not WGSL; pre-existing `equivalence.md`; 100K descriptor; DFSPH iterative-solver + atomic-scatter sensitivity).
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Phase-1 sph-water landed at `281c74f` (verdict CONFIRMED); DFSPH NumPy reference + 100K canonical capture + golden-table gate-5 + 2 PBT invariants.
> - Taichi-integration landed at `cf7d553`; Stack-D infra (common-py workspace member + Taichi `>=1.7,<2.0` + `set_taichi_deterministic` + `docs/common/taichi.md` + `tools/testkit/taichi_harness/`) shipped as IC-11 + IC-12.
> - Capture-determinism-contract landed (`9bf5b68` + back-fill `c4be56b`); IC-13 (spec § 2.5) + IC-14 (`run_twice_and_diff`) first-class.
> - RD-2D Stack-D landed at `7747d68` (verdict SHIFTED; all 14 gates GREEN; R-P2 empirically falsified ~10 orders of margin, **NOT auto-inherited**); IC-15 candidate established; first per-sim Stack-D port.
> - Audit-chain-correctness landed (landing `head_sha` `6b4b90a`; SHA back-fill `ce49cd4` = HEAD; verdict SHIFTED). **IC-16** (`verify_evidence` LFS-content-OID resolution) RESOLVED; §B.6 Mode-2 Option-3 annotations RETIRED; sixth-in-a-row byte-identical integrity sweep `810cd6e3…`.
> - Conventions doc `69aa39fc…`; architecture `e82b7b8e…`; both HEAD.
> - `[defaults.sph]` = `relative = 1e-4, absolute = 0.0`; `[budgets.sph.cross_stack]` = same; **no `[overrides.sph-water]`** at HEAD.
> - Phase-1 NumPy-reference canonical capture frozen: `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5` (LFS content OID `7590149221180f82170b41a20d14c0e197a6b3f570cfcf9307543947c5683d2f`) + `.json` (`84dbc44892e6ab941ac9469f25ed18827b7a6db6e2611df0a63f95a392ff5865`).
> **Inherited shifts:** **125 documented entering this sub-phase** (FACT — audit-chain-correctness landing § 9). Carried by reference; not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-probe-2026-05-23T23-20-09Z.md`. Read FIRST. Authoritative for the Phase-1 baseline (§ 1), infrastructure (§ 2), IC-15 candidate (§ 3), tolerance.toml (§ 4), capture sha256s (§ 5), cross-stack framing (§ 6), Convention-M anchor-sketch drift (§ 7), D1–D8 surface (§ 8), **three dispatch-anchor falsifications** (§ 9), and 4 plan-drafting shifts (§ 10).
> **Date drafted:** 2026-05-23.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D8 routing (§ 11.5).

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase IS

The **SECOND per-sim cross-stack port sub-phase under spec-Phase-2**. Takes the Phase-1-frozen `sph-water` reference (Python NumPy + scipy.cKDTree + numba; the implemented `stack.name="numpy-reference"`) and produces a content-equivalent Stack-D (Python / Taichi-DSL / CPU) port through gates 4–14 of spec § 3.5 (13 stack-agnostic correctness gates + the Phase-2 14th gate of cross-stack equivalence per phase-2-plan § 1.5.1).

It is the **empirical-validation pair for the IC-15 candidate methodology** established at RD-2D Stack-D and the **first production consumer of IC-16** at gate-5. Because sph-water is structurally different from RD-2D — DFSPH iterative pressure solves + SPH neighbor accumulation, vs RD-2D's single-pass explicit stencil — gate-14 cross-stack equivalence is **genuinely empirical**: it may pass at the `sph` category default tolerance, may approach it and need step-horizon analysis, or may exceed it and need operator routing. RD-2D's favorable R-P2 outcome is **NOT a safe prior** (§ 1.4.2).

At close the Stack-D port ships (see § 2 for the per-gate table):
1. **Stack-D Taichi implementation** at `packages/sph-water-stack-d/` (D6/D1 portfolio shape per RD-2D D6 precedent).
2. **Stack-D spec sheet** `docs/sim-specs/particle-fluids/sph-water/spec-ref-stack-d.md` (sibling to `spec-ref.md` etc.).
3. **Pre-implementation probe report** `tools/testkit/probes/reports/sph-water-stack-d-probe.md`.
4. **Failing-tests evidence + sha256** (gate-3 anchor; IC-8 TDD; phase-2-plan § 1.5.1 Gate 3 footer-hash).
5. **Canonical Stack-D capture** matching the Phase-1 reference descriptor (D4: `dam-break-100K-particles-seed42-step1000`).
6. **`equivalence.md` extension** — the existing Phase-1 stub at `docs/sim-specs/particle-fluids/sph-water/equivalence.md` is **extended additively** with the IC-15 methodology sections (NOT created de novo — probe § 3 S3).
7. **All 13 stack-agnostic gates GREEN** for the Stack-D port (gates 4–13; **gate-4 is golden-table, not MMS** — § 1.4.3).
8. **Gate-14 cross-stack equivalence verdict** — Stack-D capture diff'd against the Phase-1 NumPy-reference capture via `compare_captures` at `relative = 1e-4` (HEAD `[defaults.sph]`), **with explicit step-horizon analysis regardless of pass/fail.**
9. **`[overrides.sph-water]` tolerance.toml entry** (MANDATORY — `category = "sph"`; at-budget; the SECOND per-sim override; without it `compare_captures` raises `KeyError` — probe § 4).
10. **Convergence-file edits** — CHANGELOG additive, `docs/dependencies.md` additive (NEW workspace member + Taichi-DSL consumption), `docs/perf-ledger.md` (NEW row).

### § 1.2 What this sub-phase is NOT

- A new spec-phase. No `-phase-N` tag (§ 11.4).
- A modification of the Phase-1 sph-water reference at `packages/sph-water/`. Phase-1-sealed code is append-only-protected per § B.1.
- A frontier variant (Phase 4+ Diff-SPH / neural).
- An establishment of Stack-D infrastructure. IC-11 + IC-12 (Taichi-integration), IC-13 + IC-14 (capture-determinism-contract), IC-16 (audit-chain-correctness) are consumed verbatim. No edits to `common/common-py/` or `docs/common/taichi.md` or `tools/integrity/.../verify_evidence.py`.
- A tolerance-budget widening. `[budgets.*]` rows untouched; the `[overrides.sph-water]` is at-budget resolution wiring (§ 1.4.2), not a widening.
- An implementation of Stack-C (Vulkan). The spec-designated primary stack remains a Phase-2+ forward contract (spec-ref § 5); this sub-phase ports the Phase-1 NumPy reference to Stack-D.
- A re-litigation of phase-2-plan § 2.6 (the monolithic stage-data block is SUPERSEDED as a dispatch vehicle per D1 ratification; consumed as REFERENCE).
- An edit to any prior audit (append-only) or to `docs/phases/phase-2-cross-stack-replication.md` (SUPERSEDED).
- A fold-in of the LBM/MPM `sim_runner_diagnostic` defect (BANKED per D7).
- Pre-committing D1–D8 (§ 11.5 surfaces for operator routing).

### § 1.3 Inputs + 125 cumulative shifts inherited

(FACT — audit-chain-correctness landing § 9 [125 cumulative]; RD-2D Stack-D landing; Phase-1 sph-water landing.)

**Closing posture this sub-phase inherits:**
- All sim packages GREEN at portfolio scale (audit-chain-correctness § 5: Python 365 PASS incl. sph-water 22; TS 20+2).
- **125 cumulative shifts** (120 entering audit-chain-correctness + 5 there).
- Conventions doc `69aa39fc…`; architecture `e82b7b8e…`.
- common-py first-class workspace member; Taichi `>=1.7,<2.0`; `set_taichi_deterministic` + `tools/testkit/taichi_harness/`.
- IC-13 + IC-14 first-class; IC-16 portfolio-wide gate-5 LFS-content-OID resolution.
- RD-2D Stack-D port as the implementation + methodology template; IC-15 candidate `equivalence.md`.
- Phase-1 sph-water: DFSPH NumPy reference + 100K canonical capture + 2 golden tables (cubic-spline-kernel + dfsph-density-evolution) + 2 PBT invariants + Tier-2 particle diagnostics; 1 GB pre-commit ceiling (W1); scipy + numba workspace deps.

**Banked items disposition** (§ 11.2 full table): the **IC-15 spec-template formalization** deferred at RD-2D § 10 + audit-chain-correctness § 11 to "the second cross-stack pair" is **OPERATIVE at this sub-phase's close** (D5). Other banked items (LBM/MPM diagnostic; testing-improvements; mid-Phase-1 capture regeneration; sph-water test-augmentation; DFSPH-generator coverage gap) DEFER.

### § 1.4 Sub-phase-specific posture

#### § 1.4.1 Stack-D determinism strategy under IC-13

(FACT — IC-13 spec § 2.5; Taichi-integration arch="cpu" mandate; Phase-1 sph-water determinism.md + sim.py docstring.)

The Stack-D Taichi port declares its determinism posture (recorded as a docstring at the top of the Stack-D sim module per § F.1; cited in the Stage 1b commit footer per § C.3). **The posture is a Stage 1b design decision tied to the neighbor-accumulation strategy (R-S2):**
- **If the port mirrors the NumPy reference's sorted-sequential per-particle accumulation** (no `ti.atomic_add` scatter; `cpu_max_num_threads=1`; fixed `ti.ndrange` iteration order): the port can declare `bit-exact-same-hw` at `arch="cpu"` (the zero-tolerance same-stack special case of IC-13), matching the reference's over-achievement.
- **If the port uses `ti.atomic_add` for neighbor accumulation** (idiomatic Taichi SPH): same-stack determinism degrades to `epsilon-same-stack-same-hw` (the spec § 2.5 declaration for the SPH category) unless single-thread + fixed order pin it.

Mechanism (regardless of choice):
- `set_taichi_deterministic(Config(seed=42, deterministic=True), arch="cpu")` invoked BEFORE any `@ti.kernel` decoration (R-P3 / R-T1).
- DFSPH inner-iteration determinism: fixed `max_iter` cap + `<=` tolerance check (matches the reference; iteration count cannot vary at fixed input — R-S1 mitigation lever).
- RNG only at IC via `numpy.random.default_rng(seed)`, copied into Taichi fields (matches the reference's IC).
- Neighbor search inlined in the port (spatial-hash / grid) — NOT added to common-py (phase-2-plan KEY_RISK Rule I3; R-S3).
- Phase 2+ deferred: GPU arch determinism; FMA fusion; subgroup-collectives.

The same-stack contract (gate-10) is verified by IC-14 `run_twice_and_diff` over the parsed Capture projection.

#### § 1.4.2 Cross-stack equivalence posture (gate 14) — IC-15 candidate's SECOND validation pair

(FACT — phase-2-plan § 1.5.1 Gate 14; spec § 2.6 + § 3.6; RD-2D `equivalence.md` § 7; probe § 6.)

Gate 14 is the load-bearing cross-stack equivalence test: the Stack-D Taichi capture (RIGHT) is diff'd against the **Phase-1 NumPy-reference capture (LEFT)** — `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.{h5,json}` — via `compare_captures` at `relative = 1e-4, absolute = 0.0` (HEAD `[defaults.sph]`). Acceptance: `within_tolerance == True` across every captured frame and every state field.

> **The cross-stack partner is the NumPy reference, not a GPU stack.** Unlike RD-2D (whose gate-14 partner was a real Stack-B WGSL capture), sph-water's spec-designated primary (Stack-C Vulkan) is unimplemented; the frozen diff partner is the Phase-1 CPU reference. The relevant equivalence relation is reference-CPU (NumPy + cKDTree + numba) ↔ Taichi-CPU — a different arithmetic backend + different neighbor-accumulation primitives (probe § 9 F1).

**This sub-phase is the IC-15 candidate methodology's SECOND validation pair, and explicitly does NOT auto-inherit RD-2D Stack-D's empirical R-P2 disposition.** RD-2D's ~10-orders-of-margin outcome rested on (a) a NumPy-bit-identical IC across stacks and (b) an algebraically-identical single-pass explicit update where only FP-accumulation order differed. For sph-water:
- The IC can be made bit-identical (same NumPy `default_rng` seed), but
- DFSPH's **iterative pressure solve** (max_iter-capped correctors) can amplify small per-step FP differences across 1000 steps far more readily than an explicit stencil, and
- the neighbor-accumulation primitive may differ (R-S2).

So gate-14 at `1e-4` is genuinely empirical. The Stage 1c regime: run the diff at the full canonical step-horizon (D4); emit the per-field per-frame `max_abs_err`/`max_rel_err` witness verbatim **regardless of pass/fail**; perform explicit step-horizon analysis; **do NOT silently widen tolerance** (widening requires separate operator-approved commit per spec § 2.6 + § L). If gate-14 exceeds `1e-4`, surface to operator per Hard Rule 2 BEFORE Stage 2 (R-S1/R-S2 routing: tolerance amendment, step-horizon override, comparison-projection per D8, or implementation debug per P27-analog).

**Tolerance resolution (D6 — MANDATORY):** `sim.category = "particle-fluids"` (physics-family) has no `[defaults.particle-fluids]` row; `compare_captures` raises `KeyError` until Stage 1c adds `[overrides.sph-water] category = "sph"` (mapping to `[defaults.sph]` = `1e-4`). This is **at-budget resolution wiring** (equals `[budgets.sph.cross_stack]`), not a widening — the RD-2D `[overrides.reaction-diffusion-2d]` precedent (probe § 4).

#### § 1.4.3 Code-verification posture (gate 4) — golden-table, NOT MMS

(FACT — spec-ref § 7: "No MMS — SPH is a particle method without a manufactured-solution gate"; Phase-1 landing § 3.3; probe § 1 + § 10 S2.)

**This is the single largest gate-level delta from the RD-2D Stack-D template.** RD-2D used an MMS solution at gate-4 (observed-order-of-accuracy). sph-water has **no MMS pipeline**; code verification is **golden-table-based**, and the Stack-D port re-verifies the same two Phase-0/Phase-1 golden tables its reference passed:
- **Gate-4a — cubic-spline-kernel golden** (`tools/testkit/golden/tables/cubic-spline-kernel.json`; Phase 0; 9 fixture points; `abs = 1e-12`): the port's kernel evaluation `W(r, h)` reproduces the golden table to machine epsilon.
- **Gate-4b — DFSPH density-evolution golden** (`tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json`; 3 discrete anchors; `abs = 1e-15`): the port's reference reproduces ρ₀ = 0.5470951168783902 and dρ/dt₀ = -0.2984155182973038 at the two-particle fixture.

The Stack-D port consumes these tables read-only (no new golden table is created; no `_SUBDIRS_PICKED_UP` change — the `particle-fluids` subdir is already picked up per Phase-1 Stage 2 N2). The MMS-runner-generalization banked item (Phase-1 § 9.2) is **NOT in scope** (it is load-bearing for eulerian-smoke / LBM, not sph-water).

#### § 1.4.4 Phase-1 R-class inheritance

(FACT — Phase-1 landing § 3.1; probe § 1 + § 9 F3.)

Phase-1 R12–R20 were **scaling/scope remediations** (storage ceiling → 1 GB; O(N²) OOM → cell-list; Python-loop → cKDTree; runtime → numba; thresholds; 100K-vs-1M). They are NOT an atomic-scatter cross-stack-divergence finding (probe § 9 F3 falsifies the dispatch framing). Their operative inheritance for this sub-phase:
- The **1 GB pre-commit ceiling (W1)** applies to the Stack-D 100K capture (~59 MB — well under).
- The **100K-instance descriptor** is the cross-stack diff target (D4); the spec's 1M descriptor stays a Stack-C forward contract (NOT amended).
- The **canonical-descriptor scope-analysis** Stage-0 task (Phase-1 banked § 9.3(1)) is load-bearing here (R-S3): the reference's 1291.854 s baseline is ~1390× RD-2D.

#### § 1.4.5 Taichi-specific risk acknowledgments inherited from Taichi-integration § 9

(FACT — Taichi-integration § 9 R-T1 through R-T5 verbatim.)
- **R-T1 (field-init order):** `set_taichi_deterministic`/`ti.init` precedes every `@ti.kernel` decoration. See R-P3.
- **R-T2 (`-> None` annotations forbidden):** Taichi 1.7.4 AST transformer raises on `-> None` kernels. Omit. See R-P4.
- **R-T3 (Python-3.12 locale-deprecation):** filterwarnings inherited from common-py pyproject.
- **R-T4 (workspace import via uv):** `packages/sph-water-stack-d/` registers as workspace member; imports `from common_py.{determinism, capture} import ...`.
- **R-T5 (canonical-tier vs diagnostic-tier):** the port ships a canonical-tier implementation; gate-10 same-stack determinism witnessed at diagnostic-tier (mirror the reference's `sim_runner_diagnostic` 64-particle × 8-step pattern) to avoid paying the canonical capture cost on every pytest invocation (R-S3 mitigation).

### § 1.5 Role model, conventions, audit discipline

Inherited from § A.3 + § B + § C verbatim. Single Claude Code agent at a time; single coordinator chat; one operator. Convention #12 SHA back-fill at every stage close per § B.2 tightened-discipline + audit-chain-correctness Stage-1b N1 (enumerate EVERY placeholder-bearing audit committed in a stage, not just the checkpoint). Commit-first-then-sha256 for text artifacts (audit-chain-correctness § 10 precedent — avoids the trailing-newline phantom-sha of RD-2D N1).

### § 1.6 Architecture — three stages

Three-stage cadence per § A.2. Stage 1 sub-decomposes into 1a/1b/1c per D2 lean (RD-2D precedent):
- **Stage 0 — Pre-flight.** Replay; tolerance-budget carryover; Phase-1 reference capture sha256 reverify; **canonical-descriptor scope-analysis (R-S3, load-bearing)**; empirical Taichi-DSL SPH neighbor-iteration validation (R-S3); golden-table Stack-D-consumability check; **R-S5 empirical `compare_captures` taxonomy-resolution check** against a synthetic `particle-fluids` manifest; checkpoint + SHA back-fill.
- **Stage 1a — Failing-tests commit.** Test surface importing the yet-to-exist Stack-D modules; clean `ModuleNotFoundError`; failing-tests evidence + sha256.
- **Stage 1b — Implementation commit.** Stack-D Taichi DFSPH port; canonical capture; gates 4–13 GREEN (gate-4 golden-table); spec sheet; probe report; perf-ledger row; determinism-strategy docstring.
- **Stage 1c — Cross-stack equivalence + landing-prep.** `[overrides.sph-water]`; `equivalence.md` extension; gate-14 diff witness + step-horizon analysis; schema-corpus entry.
- **Stage 2 — Landing.** Convergence edits; integrity sweep; portfolio-scale regression sweep (§ B.7); gate-13 worktree replay; **IC-16-consuming** evidence-path verification; append-only check; landing audit + SHA back-fill.

Each sub-stage ships a checkpoint audit; Stage 2 the landing audit. No `-phase-N` tag (§ 11.4).

---

## § 2. Deliverables (per gate, expanded set)

The 14-gate per-port acceptance contract (phase-2-plan § 1.5.1 + spec § 3.5). **Gate 4 is golden-table (NOT MMS)** — the key delta from the RD-2D template.

| # | Gate | sph-water Stack-D deliverable | Acceptance |
|---|---|---|---|
| 1 | Spec sheet | `docs/sim-specs/particle-fluids/sph-water/spec-ref-stack-d.md` | 13-section template; § 5 cites Stack-D Taichi path; § 6 declares golden-table verification posture; § 8 declares determinism posture (per § 1.4.1 design choice); § 9 declares cross-stack posture at `relative = 1e-4`. |
| 2 | Probe report | `tools/testkit/probes/reports/sph-water-stack-d-probe.md` | Enumerates common-py + Taichi API surfaces consumed; upstream citations (Bender-Koschier 2015 + Monaghan 1992/2005 + SPlisHSPlasH); public exports. |
| 3 | Failing tests + output hash | `packages/sph-water-stack-d/tests/` + `tools/testkit/failing-tests-evidence/sph-water-stack-d-<UTC>.txt` + sha256 footer | Failing-tests footer `Failing-tests-output(-hash)`; impl footer `Implements-failing-tests-from` + `…-witnessed`. |
| 4 | **Code verification (golden-table, NOT MMS)** | `tests/test_cubic_spline_kernel_golden.py` (kernel `W` vs Phase-0 table, `abs=1e-12`) + `tests/test_dfsph_density_golden.py` (ρ₀, dρ/dt₀ vs 3-anchor table, `abs=1e-15`) | Both golden reproductions PASS. No new golden table; no `_SUBDIRS_PICKED_UP` change. |
| 5 | Tier 1 diagnostics | `tests/test_diagnostics.py` Tier-1 NaN/Inf scan | clean across 11 captured frames at canonical descriptor. |
| 6 | Tier 2 particle (IC-5) | `tests/test_diagnostics.py` Tier-2: count_invariance, no_overlap (half-spacing eps), neighbor_list_integrity, momentum_conservation (**advisory**) | particle substack clean (advisory checks recorded, non-gating per spec-ref § 10). |
| 7 | Cat 1 citations | spec-ref-stack-d.md § 2 cites Bender-Koschier 2015 + Monaghan 1992/2005 (DOIs) + Stack-B spec-ref cross-ref | `python -m integrity --cat 1` clean. |
| 8 | Cat 2 public API | `sph_water_stack_d.{reference, sim, invariants}` exports match probe § 5 | `python -m integrity --cat 2` clean. |
| 9 | Canonical capture + corpus | `captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.{h5,json}` (matches Phase-1 reference descriptor; D4) + schema-corpus copy at `tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.{h5,json}` | `load_capture` round-trips; manifest payload sha256 recorded (commit-first-then-sha256). |
| 10 | Determinism (IC-13) | `tests/test_determinism.py` invokes IC-14 `run_twice_and_diff(sim_runner_diagnostic, seed=42)` | `verdict.content_equivalent == True`. Determinism-strategy docstring per § F.1; cited in footer. |
| 11 | PBT (≥ 2 invariants) | `tests/test_pbt_invariants.py` ships `density_nonneg` + `kernel_normalization_unit_volume` (spec-ref § 6.6) at `n_examples ≥ 20` | Hypothesis example DB committed. |
| 12 | Perf-ledger row | Row in `docs/perf-ledger.md`: `sph-water \| taichi-cpu \| dam-break-100K-particles-seed42-step1000 \| <s> \| <hw_id> \| <commit> \| <date> \| baseline` | Wall-clock recorded; >2× the NumPy-reference baseline (1291.854 s) flags to operator (R-S3). |
| 13 | Failing-tests replay | `git worktree add … <stage-1a-sha>`; pytest reproduces `ModuleNotFoundError`; HEAD GREEN | structural reproduction per § E. |
| 14 (Phase-2) | Cross-stack equivalence | `compare_captures(numpy_ref, stack_d)` at `relative = 1e-4` (LEFT = NumPy reference) | **Empirical** — verdict + per-field per-frame witness + step-horizon analysis documented in `equivalence.md` **regardless of pass/fail**. If exceeds 1e-4: STOP + surface per R-S1/R-S2 (no silent widening). |

**Acceptance for "sub-phase complete":** gates 1–13 GREEN; gate-14 verdict landed with full step-horizon witness (a `within_tolerance == False` outcome that has been operator-routed per R-S1/R-S2 is a legitimate landing state, not a failure to land — the methodology validation is the deliverable, not a forced PASS); integrity sweep clean (byte-identical-streak `810cd6e3…` is informational — a new sim package may break it; NOT load-bearing); portfolio sweep GREEN; mutation artifact (B17 routing per § 11.5 D-adjacent); landing audit + SHA back-fill. No `-phase-N` tag.

---

## § 3. Interface contracts

### § 3.1 ICs consumed (existing, not redefined)

(FACT — probe § 2.)
- **IC-2** — `common_py.capture.{Writer, load_capture}` (canonical capture write + gate-14 load).
- **IC-4** — `common_py.determinism.Config` (seed + deterministic flag).
- **IC-5** — Tier-2 particle substack (gate-6).
- **IC-8** — probe report § 5 is the public-API contract; gate-3 failing-tests ordering.
- **IC-9** — checkpoint + landing audits per § B.3.
- **IC-11** — `set_taichi_deterministic(config, arch="cpu")` at sim-runner entry.
- **IC-12** — `docs/common/taichi.md` rules (R-T1..R-T5).
- **IC-13** — content-equivalence contract (spec § 2.5); same-stack posture per § 1.4.1.
- **IC-14** — `run_twice_and_diff` (Python) consumed by gate-10.
- **IC-16** — `verify_evidence` LFS-content-OID resolution; gate-5 (Stage 2 evidence verification) resolves the `.h5` LFS content OIDs automatically — **§B.6 Mode-2 Option-3 annotations RETIRED**; this sub-phase is the **first production consumer** of IC-16 on a fresh capture.

### § 3.2 ICs produced — IC-15 formalization (D5)

This sub-phase is the second cross-stack pair; the **IC-15 spec-template formalization** opportunity (deferred at RD-2D § 10 + audit-chain-correctness § 11) is operative. Whether to formalize IC-15-proper at Stage 2 is **D5** (§ 11.5) — surfaced, not pre-committed. If formalized, subsequent cross-stack ports (eulerian-smoke / LBM / Stack-C variants) consume IC-15-proper by reference; if partially formalized or deferred, the IC-15-candidate `equivalence.md` pattern continues.

---

## § 4. Stage decomposition

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay** (canonical gate set against `v0.1.0-phase-1`). Bit-identity invariant match → proceed; mismatch → BLOCKED per P20; write `stage-0-blocked-replay-<UTC>.md`; surface; stop. Re-verify the pre-condition anchors (conventions `69aa39fc…`, architecture `e82b7b8e…`, HEAD `ce49cd4`, 125 shifts).
- **Task 0.1 — Tolerance-budget carryover.** Edit `tolerance-budget.toml`: `[phase].phase = "sub-phase-sph-water-stack-d"`, bump `opened_at`. NO `[budgets.*]` widening. Commit `chore(sph-water-stack-d-stage0-tolerance-budget): sub-phase carryover from sub-phase-audit-chain-correctness`.
- **Task 0.2 — Phase-1 reference capture sha256 reverify.** `git lfs ls-files` + `sha256sum` the `.h5` (LFS content OID `7590149221…`); `git cat-file -p HEAD:<json> | sha256sum` the `.json` (`84dbc448…`). Mismatch → BLOCKED (the reference is the gate-14 partner).
- **Task 0.3 — Canonical-descriptor scope-analysis per § N (R-S3; LOAD-BEARING).** 100K particles × 3 dims × f64 × 11 frames + diagnostics ≈ 59 MB (well under the 1 GB W1 ceiling). Wall-clock floor: the NumPy reference baseline is 1291.854 s; estimate the Taichi-cpu DFSPH 100K×1000-step cost (iterative correctors + neighbor search). If the estimate approaches the 3-hour structural alarm OR the perf-ledger 2× band (>2584 s), surface BEFORE Stage 1 (operator routes: shorter step-horizon for the canonical capture, OR diagnostic-tier-only certification, OR accept the wall-clock). Document MEASURED component floors per Phase-1 threshold-discipline lesson (§ 9.3(2)).
- **Task 0.4 — Empirical Taichi-DSL SPH neighbor-iteration validation (R-S3).** Write a small smoke-tier SPH neighbor-accumulation Taichi kernel (e.g., density summation over a spatial-hash on ~1K particles × few steps); verify it (a) runs under `set_taichi_deterministic(arch="cpu")`, (b) is `run_twice_and_diff`-content-equivalent, (c) reproduces the cubic-spline-kernel golden on a sample. If Taichi-DSL does not handle SPH-style neighbor iteration cleanly (e.g., dynamic neighbor lists, atomic-scatter determinism at single-thread), STOP and surface per Hard Rule 2 — this is a scope-expansion signal (does the existing Taichi-integration infra suffice, or is a neighbor-search-utility scope-expansion needed? — surface BEFORE Stage 1).
- **Task 0.5 — Golden-table Stack-D-consumability check.** Verify `cubic-spline-kernel.json` + `particle-fluids/dfsph-density-evolution.json` are loadable + their fixture inputs feedable into a Taichi-side kernel evaluation. NOT a production gate-4 deliverable — a dependency check.
- **Task 0.6 — R-S5 empirical taxonomy-resolution check (RD-2D N1-banked Stage-0 R-A1 precedent).** Empirically invoke `compare_captures` against a synthetic Stack-D manifest carrying real `sim.category="particle-fluids"`, `sim.name="sph-water"` (NOT merely a parser-perf check), to confirm the `KeyError`-without-override behavior and that the planned `[overrides.sph-water] category="sph"` resolves to `1e-4`. Catches the tolerance-resolution gap at Stage 0 rather than mid-Stage-1c.
- **Closing.** `stage-0-checkpoint-<UTC>.md` per IC-9. Front-matter both `head_sha:` AND `head_sha_at_checkpoint:`. Commit `chore(sph-water-stack-d-stage0-checkpoint): Stage 0 pre-flight complete`. Convention #12 SHA back-fill.

### § 4.2 Stage 1 — Implementation (3 sub-stages per D2 lean)

#### § 4.2.1 Stage 1a — Failing-tests commit (single session, single commit)

1. Create the Stack-D test surface at `packages/sph-water-stack-d/tests/` (per D1/D6 routing): `__init__.py`, `conftest.py`, `test_cubic_spline_kernel_golden.py` (gate-4a), `test_dfsph_density_golden.py` (gate-4b), `test_diagnostics.py` (Tier 1 + Tier 2), `test_pbt_invariants.py` (2 invariants), `test_determinism.py` (IC-14), `test_reference_sanity.py`, `test_cross_stack_equivalence.py` (gate-14; SKIP until 1c).
2. Each test imports `sph_water_stack_d.{reference, sim, invariants}` (not yet existing).
3. `pytest packages/sph-water-stack-d/tests/ -v` → all fail with clean `ModuleNotFoundError`.
4. Capture verbatim output to `tools/testkit/failing-tests-evidence/sph-water-stack-d-<UTC>.txt`; sha256 **of the committed blob** (commit-first-then-sha256).
5. Commit `test(sph-water-stack-d-stage1a): failing tests for Stack-D port`. Footer `Failing-tests-output(-hash)`.

**Closing.** `stage-1a-checkpoint-<UTC>.md`; commit `chore(sph-water-stack-d-stage1a-checkpoint): …`; SHA back-fill if needed.

#### § 4.2.2 Stage 1b — Implementation commit (single session, single commit)

**Determinism-strategy declaration first** (§ F.1 + § 1.4.1): docstring at the top of `sim.py` recording the neighbor-accumulation choice + same-stack posture + iteration-order pinning + RNG threading + Phase-2+ deferrals.

Per-task sequence (new-files-first per Convention A):
1. **Package skeleton.** `packages/sph-water-stack-d/pyproject.toml` (workspace member: common-py, testkit, diagnostics, taichi, h5py, hypothesis, numpy; dev: mypy, pytest, ruff) + `sph_water_stack_d/__init__.py` + `reference/__init__.py` + `README.md`.
2. **Reference module** `sph_water_stack_d/reference/dfsph_taichi.py`: `canonical_params()` (locked dt/h/rho_0/g_z/n_particles + DFSPH max_iter/tolerance, matching the NumPy reference); `initial_condition(p, seed)` (NumPy `default_rng` IC matching the reference, copied into Taichi fields); the cubic-spline kernel `W`; Taichi DFSPH kernels (neighbor build via inlined spatial-hash; density solve; divergence-free + constant-density correctors with fixed max_iter; integrate). NO `-> None` annotations (R-T2). `evolve(...)` yields `(step, positions, velocities, densities)` at the capture cadence, copied out to NumPy.
3. **Sim wrapper** `sph_water_stack_d/sim.py`: determinism docstring; `sim_runner_seeded(seed, out_dir) -> Path` (canonical 100K × 1000 steps, capture_interval 100 → 11 frames; `set_taichi_deterministic` before fields/kernels; `common_py.capture.Writer`); `sim_runner_diagnostic(seed, out_dir) -> Path` (64-particle × 8-step diagnostic-tier for gate-10/PBT, mirroring the reference).
4. **Invariants module** `sph_water_stack_d/invariants.py`: `density_nonneg` + `kernel_normalization_unit_volume` (spec-ref § 6.6).
5. **Spec sheet** `docs/sim-specs/particle-fluids/sph-water/spec-ref-stack-d.md` (13-section; § 6 golden-table posture; § 7 "No MMS" note; § 8 determinism posture; § 9 cross-stack `1e-4`).
6. **Probe report** `tools/testkit/probes/reports/sph-water-stack-d-probe.md`.
7. **Implement test bodies → GREEN** (gates 4–13); `test_cross_stack_equivalence.py` SKIP at 1b. Capture GREEN evidence + sha256.
8. **Canonical capture (gate 9).** `sim_runner_seeded(seed=42, out_dir=captures/sph-water-stack-d/)` → `dam-break-100K-particles-seed42-step1000.{h5,json}`. Record both sha256 (commit-first-then-sha256; the `.h5` is LFS — record the content OID).
9. **Perf-ledger row** (gate 12).
10. **Workspace member registration** in root `pyproject.toml` `[tool.uv.workspace].members`.
11. **Gate-13 worktree replay** at the Stage 1a SHA.
12. **Commit** `feat(sph-water-stack-d-stage1b): Stack-D Taichi DFSPH implementation through gate 13`. Footer cites Stage 1a evidence sha, GREEN evidence sha, capture sidecar sha256s, perf wall-clock, determinism docstring path, golden-table gate-4 results, `Implements-failing-tests-from` + `…-witnessed`.

**Closing.** `stage-1b-checkpoint-<UTC>.md` (gates 4–13 GREEN; gate-14 PENDING-1c); commit `chore(sph-water-stack-d-stage1b-checkpoint): …`; SHA back-fill.

#### § 4.2.3 Stage 1c — Cross-stack equivalence + landing-prep (single session, single commit)

1. **Add `[overrides.sph-water]` to `tolerance.toml`** (`category = "sph"`; at-budget; preserve existing comments — Convention A). MANDATORY (D6).
2. **Extend `docs/sim-specs/particle-fluids/sph-water/equivalence.md` additively** (the Phase-1 stub exists — preserve its tolerance-row + cross-stack-scope tables; populate the 5 IC-15 methodology sections; update the stale "Stack D ↔ Stack C / Not planned" framing to the actual NumPy-reference ↔ Taichi pair).
3. **Run gate-14 diff.** `compare_captures(captures/sph-water-ref/…json, captures/sph-water-stack-d/…json)`. Capture output verbatim to Stage-1c evidence. Document `within_tolerance`, per-field per-frame `max_abs_err`/`max_rel_err` (positions, velocities, densities), step-horizon analysis.
4. **Gate-14 disposition.** If `within_tolerance == True`: GREEN. If `False`: document the field + step at which `1e-4` is exceeded; **STOP and surface to operator per Hard Rule 2 BEFORE Stage 2** (R-S1/R-S2 routing). Do NOT silently widen. Do NOT pre-commit a shorter horizon (D4).
5. **Schema-corpus entry.** Copy the Stack-D canonical capture to `tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.{h5,json}`; record sha256.
6. **Un-skip `test_cross_stack_equivalence.py`** (verify GREEN if gate-14 passed; if routed-fail, the test reflects the operator-routed acceptance state).
7. **Commit** `feat(sph-water-stack-d-stage1c): cross-stack equivalence harness extension + gate 14 verdict`. Footer cites both capture sha256s, the equivalence verdict + per-field witness, step-horizon, `equivalence.md` sha, schema-corpus sha, `[overrides.sph-water]`.

**Closing.** `stage-1c-checkpoint-<UTC>.md` (14-row gate table); commit `chore(sph-water-stack-d-stage1c-checkpoint): …`; SHA back-fill.

### § 4.3 Stage 2 — Landing (single session if Stage 1 clean)

Inherits RD-2D § 4.3 Steps 2.1 → 2.12. Deltas:
- **2.1 — Anchor re-check.** Re-grep every path/SHA/sha256 across charter + 3 Stage-1 checkpoints + Stage 0 + spec sheet + probe report + extended `equivalence.md` + capture sidecars. Cite post-back-fill HEAD shas (audit-chain-correctness N2).
- **2.2 — Portfolio-scale regression sweep (§ B.7).** Python fan-out incl. new `packages/sph-water-stack-d` + tools + common-py; TypeScript fan-out (NO-OP — Python-only port). Counts canonical; sweep-output sha256 informational.
- **2.3 — Cat 3 disposition.** `particle-fluids` subdir already picked up (Phase-1 Stage 2 N2); the port ships NO new golden table (re-verifies existing tables). **NO-OP — no `_SUBDIRS_PICKED_UP` change.**
- **2.4 — Integrity sweep** (Cat 1–5 + X). Byte-identical streak `810cd6e3…` (sixth-in-a-row at audit-chain-correctness) may break (new sim package); document per-Cat deltas; **informational, NOT load-bearing**.
- **2.5 — Evidence-path verification (IC-16 first production consumer).** `verify_evidence` over all new sub-phase audits; the `.h5` LFS content OIDs resolve automatically (no §B.6 annotation). Confirm + document.
- **2.6 — Gate-13 replay** per § E.
- **2.7 — Append-only check** vs `v0.1.0-phase-1`. Document legitimate additive amendments (`tolerance.toml` `[overrides.sph-water]`; `equivalence.md` extension; `test_cross_stack_equivalence.py` SKIP-removal — all THIS sub-phase's artifacts). Conventions doc + architecture UNCHANGED this sub-phase (no amendment in scope).
- **2.8 — Mutation artifact (B17).** Default lean PATH-B re-bank (single-sim Taichi-DSL port; per RD-2D § 4.3 Step 2.8 + Phase-1 sph-water § 9.2 test-augmentation banked). Operator may route PATH-A.
- **2.9 — Convergence edits.** CHANGELOG additive; `dependencies.md` additive (NEW workspace member + Taichi-DSL); perf-ledger row (cross-check from 1b).
- **2.10 — Landing audit.** `landing-<UTC>.md` per IC-9; `artifact: sub-phase`, `artifact_id: sub-phase-sph-water-stack-d`; both `head_sha:` AND `head_sha_at_checkpoint:`; enumerate all evidence_paths + evidence_hashes; verdict-state per outcome.
- **2.11 — Convention #12 SHA back-fill** (enumerate EVERY placeholder-bearing audit in the stage — audit-chain-correctness N1). NEVER `--amend`.
- **2.12 — Final summary.** No `-phase-N` tag. Optional `v0.1.13` non-phase point-release banked (lean: NO tag). Surface landing path, 14-gate table, D1–D8 verdicts, IC-15 formalization disposition (D5), next-sub-phase recommendation.

---

## § 5. Dispatch — operator workflow

Inherited from RD-2D § 5 verbatim. Identity reads "sph-water-stack-d sub-phase coordinator chat"; § 7 prompts are the dispatchable units. **Tag posture:** no `-phase-N` tag; lean no intermediate tag.

---

## § 6. Coordinator prompt

Inherits RD-2D § 6; identity "sph-water-stack-d sub-phase coordinator chat"; running-log:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| plan-drafting | probe + charter + landing + SHA back-fill | pending | — | — | D1–D8 routing |
| 0 | replay + tolerance carryover + reference reverify + **scope-analysis (R-S3)** + Taichi-SPH-pattern validation + golden-table check + **R-S5 taxonomy check** | pending | — | — | — |
| 1a | failing-tests commit (gate 3 anchor) | pending | — | — | — |
| 1b | Stack-D Taichi DFSPH impl (gates 4–13; golden-table gate-4) | pending | — | — | — |
| 1c | cross-stack equivalence (gate 14) + `[overrides.sph-water]` + equivalence.md extension | pending | — | — | empirical |
| 2 | integrity + portfolio sweep + IC-16 evidence verify + mutation + convergence + landing + SHA back-fill + **D5 IC-15 disposition** | pending | — | — | — |

---

## § 7. Per-stage agent prompts

All prompts share the **sub-phase standing orders** (inherited from RD-2D § 7 with substitutions):
- Commit slug `chore`/`feat`/`test`/`docs` + `sph-water-stack-d-stage<N><a|b|c>-<scope>` (non-phase form; § C.1).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/`, `tools/testkit/{determinism, capture, equivalence, code_verification}/`.
- Audit front-matter both `head_sha:` AND `head_sha_at_checkpoint:` (§ B.3).
- Convention #8 — never assert from memory; grep/verify every path / signature / sha256 / spec section.
- Convention A — additive edits to pre-existing files only; new files first. Never edit Phase-1-sealed `packages/sph-water/` or any prior audit chain.
- Convention #12 — never `--amend`; SHA back-fill at EVERY stage close; enumerate EVERY placeholder-bearing audit (audit-chain-correctness N1).
- Commit-first-then-sha256 for text artifacts (avoids the trailing-newline phantom — RD-2D N1).
- `verify_evidence` resolves LFS content OIDs (IC-16); use `sha256:HEX` prefix form.
- Empty-file rejection (Taichi-integration N6): pytest-subpackage `__init__.py` files start with `"""` docstring.
- Hard Rule 2 — STOP and surface on structural wrongness (Taichi-DSL cannot handle SPH neighbor iteration deterministically at single-thread; gate-14 exceeds 1e-4 even with bit-identical IC; reference capture sha256 drift; scope estimate breaches the 3-hour alarm).

### § 7.1 Stage 0 — Pre-flight

```
You are the sph-water-stack-d sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-sph-water-stack-d.md (this charter — source of truth). § 7 standing orders.
  2. docs/conventions/sub-phase-conventions.md (sha256 69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45 — verify at HEAD).
  3. docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-probe-2026-05-23T23-20-09Z.md (probe — Phase-1 baseline + infra + IC-15/IC-16 surfaces + tolerance.toml + capture sha256s + dispatch-anchor falsifications + D1-D8).
  4. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md (the structural exemplar; § 9 R-P playbook, § 10 IC-15 candidate).
  5. docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md (IC-16; § 8-9 banked methodology-precedents; § 11 banked items).
  6. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md (the Phase-1 reference baseline; R12-R20 = scaling/scope; golden-table gate-5; 100K descriptor).
  7. docs/sim-specs/particle-fluids/sph-water/{spec-ref,algebraic,determinism,equivalence}.md.
  8. packages/sph-water/sph_water/{sim.py, reference/dfsph.py, invariants.py} (the NumPy reference to port — algorithm + determinism docstring).
  9. common/common-py/src/common_py/determinism.py (IC-11 set_taichi_deterministic) + tools/testkit/taichi_harness/ + a Taichi smoke exemplar.
  10. tools/testkit/equivalence/{harness.py, tolerance.toml, tolerance-budget.toml}.

Stage 0 is pre-flight only; you do NOT implement the port (Stage 1).

Execute Tasks 0.0 → 0.6 → closing per charter § 4.1 exactly. Load-bearing: Task 0.3 (canonical-descriptor scope-analysis — the NumPy reference baseline is 1291.854 s; estimate the Taichi-cpu 100K×1000-step cost with MEASURED component floors; if it approaches the 3-hour alarm or the 2× perf band, STOP and surface BEFORE Stage 1) and Task 0.4 (empirical Taichi-DSL SPH neighbor-iteration validation — if Taichi cannot do deterministic single-thread SPH neighbor accumulation, STOP and surface; scope-expansion signal) and Task 0.6 (R-S5 empirical compare_captures taxonomy-resolution check against a synthetic particle-fluids manifest).

Out of scope: any Stage 1 implementation; any edit outside tolerance-budget.toml + new audit files + Stage-0 throwaway smoke-tier scratch.

Stuck → conventions doc § 9 + charter § 9. Hard Rule 2 applies.
```

### § 7.2 Stage 1a — Failing-tests commit

```
You are the sph-water-stack-d sub-phase Claude Code agent, Stage 1a (failing-tests commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-sph-water-stack-d.md §§ 2 (deliverables), 4.2.1 (Stage 1a sequence), 7 (standing orders).
  2. docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-checkpoint-<UTC>.md.
  3. packages/sph-water/tests/*.py (the Phase-1 reference test surface — mirror its shape; note gate-4 is golden-table: test_cubic_spline_kernel_golden.py + test_dfsph_density_golden.py; NO test_code_verification.py / MMS).
  4. docs/sim-specs/particle-fluids/sph-water/spec-ref.md §§ 6.6 (PBT), 7 (golden, no MMS), 10 (diagnostics).
  5. packages/reaction-diffusion-2d-stack-d/tests/ (the cross-stack-port test-surface template).

Scope — charter § 4.2.1: create the 8-file test surface at packages/sph-water-stack-d/tests/ importing sph_water_stack_d.{reference,sim,invariants}; verify clean ModuleNotFoundError; capture + sha256 the committed evidence blob (commit-first-then-sha256); commit per § 4.2.1.

Closing — stage-1a-checkpoint-<UTC>.md; SHA back-fill. Stop.

Out of scope: implementation (1b); equivalence (1c); any edit outside the new tests/ + failing-tests-evidence + audit files.
Hard Rule 2 applies.
```

### § 7.3 Stage 1b — Implementation commit

```
You are the sph-water-stack-d sub-phase Claude Code agent, Stage 1b (implementation commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-sph-water-stack-d.md §§ 1.4 (posture), 2 (deliverables), 3 (ICs), 4.2.2 (Stage 1b 12-step), 7, 9 (R-S playbook).
  2. docs/_audits/phase-2/sub-phase-sph-water-stack-d/{stage-0,stage-1a}-checkpoint-<UTC>.md.
  3. packages/sph-water/sph_water/{reference/dfsph.py, sim.py, invariants.py} (the NumPy DFSPH reference; port to Taichi-DSL preserving algorithm + determinism identity; mirror sorted-sequential accumulation UNLESS you choose ti.atomic_add — declare the choice + its same-stack posture per § 1.4.1).
  4. common/common-py/smoke/ Taichi exemplar + docs/common/taichi.md (IC-12; init form, arch=cpu, no -> None).
  5. common/common-py/src/common_py/{determinism.py, capture.py} (IC-11 + IC-2).
  6. tools/testkit/determinism/harness.py (IC-14; gate-10).
  7. tools/testkit/golden/tables/{cubic-spline-kernel.json, particle-fluids/dfsph-density-evolution.json} (gate-4 golden tables).

Determinism-strategy declaration FIRST (charter § 1.4.1 + § F.1).

Scope — charter § 4.2.2 12-step (single sub-bundle commit). Gate-4 is golden-table (NOT MMS). The canonical capture is the 100K descriptor (D4); honor the Stage-0 scope-analysis routing for its step-horizon.

Closing — stage-1b-checkpoint-<UTC>.md (gates 4-13 GREEN; gate-14 PENDING-1c); SHA back-fill. Stop.

Out of scope: cross-stack (1c); landing (2); modification of packages/sph-water/ (append-only).
Hard Rule 2 — STOP on Taichi 1.7.4 single-thread SPH non-determinism; golden-table reproduction failure; canonical descriptor unreachable; wall-clock breach.
```

### § 7.4 Stage 1c — Cross-stack equivalence + landing-prep

```
You are the sph-water-stack-d sub-phase Claude Code agent, Stage 1c (cross-stack equivalence) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-sph-water-stack-d.md §§ 1.4.2 (cross-stack posture), 2 (gate 14), 4.2.3 (Stage 1c 7-step), 7, 9 (R-S1/R-S2/D8).
  2. docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1b-checkpoint-<UTC>.md (Stack-D capture sha256).
  3. tools/testkit/equivalence/{harness.py, tolerance.toml, tolerance-budget.toml}.
  4. docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md (the IC-15 candidate template — the 5 methodology sections to author into sph-water's equivalence.md).
  5. docs/sim-specs/particle-fluids/sph-water/equivalence.md (the PRE-EXISTING Phase-1 stub — EXTEND additively, preserve existing tables, Convention A).
  6. docs/architecture.md § 2.6 (tolerance table) + § 3.6.

Scope — charter § 4.2.3. MANDATORY first step: add [overrides.sph-water] category="sph" (KeyError without it). Run gate-14 NumPy-ref ↔ Stack-D; emit per-field per-frame witness + step-horizon analysis REGARDLESS of pass/fail.

Gate-14 is EMPIRICAL (NOT a forced PASS). RD-2D's ~10-orders margin does NOT auto-inherit (DFSPH iterative solver + neighbor accumulation are more FP-sensitive). If within_tolerance==False at 1e-4: document the field+step of exceedance; STOP and surface per Hard Rule 2 BEFORE Stage 2. Do NOT silently widen (spec § 2.6 + § L). Do NOT pre-commit a shorter horizon. If a comparison-projection question surfaces (per-particle position vs density vs aggregate), surface D8.

Closing — stage-1c-checkpoint-<UTC>.md (14-row gate table + witness + step-horizon); SHA back-fill. Stop.
Hard Rule 2 applies.
```

### § 7.5 Stage 2 — Landing

```
You are the sph-water-stack-d sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-sph-water-stack-d.md §§ 4.3 (Stage 2 12-step), 7, 11 (coherence + D1-D8 routings as decided by operator — especially D5 IC-15 formalization disposition).
  2. docs/_audits/phase-2/sub-phase-sph-water-stack-d/{stage-0,stage-1a,stage-1b,stage-1c}-checkpoint-<UTC>.md.
  3. docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md (IC-16 first-consumer pattern; § 6 byte-identical baseline 810cd6e3…; § 7 LFS-content-OID gate-5 resolution).
  4. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md (Stage 2 template; § 10 banked-items table).

Execute Steps 2.1 → 2.12 per charter § 4.3. IC-16: evidence-path verification resolves the .h5 LFS content OIDs automatically (no §B.6 annotation) — this is the first production consumer; confirm + document.

Acceptance: gates 1-13 GREEN; gate-14 verdict landed with full witness (a routed within_tolerance==False is a legitimate landing state — the methodology validation is the deliverable); portfolio sweep GREEN; integrity sweep clean (byte-identical streak may break — informational); evidence verify clean; append-only clean; mutation artifact (PATH-B lean); landing audit + SHA back-fill. At close, surface the D5 IC-15 formalization disposition based on what Stage 1c surfaced empirically.

If Stage 2 surfaces a CONFIRMED-blocking regression, STOP and SURFACE per Hard Rule 2.
Stuck → conventions doc § 9 + charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits § A.3 + § A.4 + § B.2. Stage 0 / 1a / 1b / 1c each ship a checkpoint; Stage 2 the landing audit. All five closes followed by Convention #12 SHA back-fill (enumerate EVERY placeholder-bearing audit per audit-chain-correctness N1). Commit-first-then-sha256 for every text artifact.

---

## § 9. Risk surface + problem-solving playbook

Inherits conventions doc § 9 playbook (P1–P27) + RD-2D § 9 R-P1/R-P3/R-P4/R-P5/R-P6 (where applicable) + Taichi-integration R-T1–R-T5. **NEW R-class entries SPECIFIC to this sub-phase:**

- **R-S1 — Cross-stack equivalence at gate-14 is the FIRST pair where algebraic-identity-across-stacks does NOT cleanly transfer.** DFSPH's iterative pressure solve (max_iter-capped divergence-free + density correctors) can amplify small per-step FP differences across 1000 steps far more than RD-2D's single-pass explicit stencil. RD-2D's R-P2 empirical falsification (~10 orders of margin) **does NOT auto-inherit.** *Mitigation:* Stage 1c runs gate-14 at the full canonical step-horizon (D4) with explicit step-horizon analysis at the 11-frame discretization; surface verdict + per-frame max_abs_err/max_rel_err verbatim regardless of pass/fail; do NOT silently widen tolerance. Lever: pin DFSPH `max_iter` + `<=` tolerance identically to the reference (iteration count cannot vary at fixed input).

- **R-S2 — Neighbor-accumulation primitive is an implementation choice with cross-stack consequences.** The NumPy reference uses sorted-sequential per-particle accumulation (bit-exact same-stack). A Taichi port using `ti.atomic_add` for neighbor scatter changes accumulation order → larger per-step cross-stack FP delta + epsilon same-stack determinism unless `cpu_max_num_threads=1` + fixed `ti.ndrange` order pin it. *Mitigation:* Stage 1b declares the choice in the determinism docstring + spec-ref-stack-d.md § 8; if `ti.atomic_add` is used, expect a larger gate-14 diff and a degraded same-stack posture; if sorted-sequential is mirrored, cross-stack delta is FP-accumulation-only. The atomic-scatter epsilon class is the spec § 2.5 declaration for SPH (determinism.md); it is NOT a Phase-1 R12-R20 finding (probe § 9 F3). Operator routing required if gate-14 exceeds 1e-4.

- **R-S3 — SPH neighbor-search + DFSPH wall-clock at Taichi-cpu scale.** Two coupled risks: (a) Taichi-DSL SPH neighbor iteration (spatial-hash / grid; dynamic neighbor lists) may differ from RD-2D's static stencil and may not be cleanly expressible/deterministic — Stage 0 Task 0.4 validates empirically; if scope-expansion is needed (e.g., a neighbor-search utility), surface BEFORE Stage 1. Neighbor search is inlined in the port, NOT added to common-py (phase-2-plan Rule I3). (b) The NumPy reference's 100K×1000-step baseline is 1291.854 s; a Taichi-cpu DFSPH port with iterative correctors may approach the 3-hour structural alarm or the perf-ledger 2× band — Stage 0 Task 0.3 estimates with MEASURED floors and routes BEFORE Stage 1.

- **R-S4 — IC-15 candidate methodology second-pair validation (the empirical deliverable).** This sub-phase validates (or refines) the IC-15 candidate against a structurally different physics family. If the per-sim `tolerance.toml` override + `equivalence.md` authoring + per-frame diff witness format hold cleanly, IC-15 is well-supported for formalization (D5a). If they need refinement (e.g., a comparison-projection axis — D8 — for atomic-scatter DFSPH where per-particle position-exact comparison is the wrong relation), surface as the D5 partial-formalization disposition (D5c). Both outcomes are useful; the validation is the deliverable, not a forced clean pass.

- **R-S5 — Stage-0 taxonomy-resolution + harness-invocation pre-check (RD-2D N1-banked Stage-0 R-A1 precedent).** Empirically invoke `compare_captures` against a synthetic Stack-D manifest carrying real `sim.category="particle-fluids"` (NOT a parser-perf check) to catch the `KeyError`-without-`[overrides.sph-water]` gap at Stage 0 rather than mid-Stage-1c. Confirms the planned `category="sph"` override resolves to `1e-4`.

### § 9.1 Playbook note (P27-analog inheritance)

RD-2D's P27 (cross-stack content-equivalent diff debugging) is inherited with SPH-specific cause ordering for gate-14 failure: (1) different IC across stacks — assert step-0 bit-identical first; (2) DFSPH solver convergence-path divergence (max_iter / tolerance mismatch); (3) neighbor-accumulation order (R-S2 atomic-scatter vs sorted-sequential); (4) spatial-hash bucket-ordering differences; (5) iterative-solver chaotic amplification at long horizon (R-S1); (6) capture-descriptor mismatch (sim name/variant/frames). Debug-step: binary-search the step at which divergence first exceeds 1e-4, then per-field (position vs velocity vs density), then per-region.

---

## § 10. Audit-trail discipline

Inherits § B verbatim. Sub-phase audit dir: `docs/_audits/phase-2/sub-phase-sph-water-stack-d/`. All append-only per § B.1. Stage 0/1a/1b/1c checkpoints use `artifact: stage`; Stage 2 landing uses `artifact: sub-phase` (`artifact_id: sub-phase-sph-water-stack-d`). IC-16 means gate-5 evidence verification resolves LFS content OIDs without §B.6 annotation.

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

Parent audits: Phase-1 sph-water landing + Taichi-integration + capture-determinism-contract + RD-2D Stack-D + audit-chain-correctness landings (full list at the plan-drafting landing audit front-matter). The 14-gate deliverable list derives from the probe + the RD-2D Stack-D template + the Phase-2 14th gate, with gate-4 substituted to golden-table per spec-ref § 7.

**Cumulative shifts entering this sub-phase: 125** (audit-chain-correctness § 9). Plan-drafting closing-shift count: **129** (probe § 10: S1 NumPy-reference-source-stack; S2 golden-table-gate-4; S3 pre-existing-equivalence.md; S4 scope-analysis-load-bearing) — confirmed at the plan-drafting landing audit.

### § 11.2 Banked items inherited + disposition

| # | Item | Disposition at this charter close |
|---|---|---|
| 1 | **IC-15 spec-template formalization** | **OPERATIVE (D5)** — this IS the second cross-stack pair the formalization was deferred to (RD-2D § 10 + audit-chain-correctness § 11). Disposition surfaced at § 11.5 D5. |
| 2 | Cross-stack methodology full-consolidation | **OPERATIVE (D5)** — same trigger; consolidate into `equivalence.md` + (if D5a/c) the IC-15 spec-template. |
| 3 | LBM/MPM `sim_runner_diagnostic` defect | **DEFER (D7)** — not sph-water; folds into next LBM/MPM sub-phase. |
| 4 | MMS-runner-generalization (Phase-1 § 9.2) | **NOT APPLICABLE** — sph-water has no MMS (§ 1.4.3); load-bearing for eulerian-smoke / LBM only. |
| 5 | sph-water test-augmentation + DFSPH-generator coverage gap (Phase-1 § 9.2 + N4) | **DEFER** — Phase-1-reference test surface; not the Stack-D port. |
| 6 | §B.6 Option-1 verify_evidence LFS fix | **RESOLVED** at audit-chain-correctness (IC-16) — consumed here. |
| 7 | Portfolio-wide phantom-sha audit | **RESOLVED** at audit-chain-correctness — sph-water captures clean (probe § 5). |
| 8 | Testing-improvements; mid-Phase-1 capture regeneration | **DEFER** (unchanged). |
| 9 | Stage-0 R-A1 cross-stack-port task-scope expansion (end-to-end harness invocation) | **CONSUMED** as R-S5 (Stage 0 Task 0.6). |

### § 11.3 Outputs

After this sub-phase lands:
- **The SECOND per-sim Stack-D port** + the **first particle-method cross-stack port** in the portfolio.
- **The IC-15 candidate methodology's second validation pair** — either validating it across two physics families (D5a) or surfacing refinements (D5c). Structural exemplar for the golden-table-gate-4 + NumPy-reference-source + pre-existing-equivalence.md cross-stack-port variant (inherited by future particle-method ports).
- **The first production consumer of IC-16** (gate-5 LFS-content-OID resolution on a fresh capture, no §B.6 annotation).
- **`[overrides.sph-water]`** — the second per-sim tolerance override; precedent for subsequent ports' physics-family→numerical-method mappings.
- **A second Taichi-cpu perf-ledger datapoint** at a far larger scale than RD-2D (informs LBM/MPM scope-analysis).
- Phase 4 Diff-SPH (item 4.2) gains its Stack-D substrate (DiffTaichi route per phase-2-plan § 1.3.4).

### § 11.4 Replay-chain non-participation + tag posture

Inherits § D.2 + § D.4. Does NOT participate in the cross-phase replay chain. **Tag posture:** no `-phase-N` tag (forbidden per § D.2). Optional non-phase `v0.1.13` (no suffix) is a banked operator decision (lean: NO intermediate tag, per all spec-Phase-2 sub-phase precedents).

### § 11.5 D1–D8 surface — operator-routable; NOT pre-committed

(See probe § 8 for full preview. Reproduced for charter-time routing.)

**D1 — Sub-phase naming.** Lean `sub-phase-sph-water-stack-d` (§ C.1 + RD-2D D1). Charter + audit-dir + commit-slug use the lean. Alternative: `sub-phase-sph-water-port-stack-d`. Rename is mechanical. Downstream: precedent for the 6 remaining cross-stack ports.

**D2 — Stage 1 decomposition.** Lean 1a/1b/1c (RD-2D precedent). Stage 1b is larger than RD-2D (DFSPH iterative solver + SPH neighbor search) but a single-sim port; decomposition holds. Alternative: split 1b further if Stage 0 surfaces neighbor-search scope-expansion (R-S3). Downstream: ~14 commits decomposed.

**D3 — Cross-stack tolerance value.** HEAD-verified `relative = 1e-4, absolute = 0.0` (`[defaults.sph]`); NOT pre-committed beyond the HEAD value. Empirics at Stage 1c decide whether at-budget holds (R-S1). Alternative (if gate-14 exceeds 1e-4): operator routes (a) tolerance amendment per spec § 2.6 (separate operator-approved commit + budget amendment if it exceeds the cap) or (b) step-horizon override.

**D4 — Step-horizon.** Lean full canonical step-1000 (11 frames, `dam-break-100K-particles-seed42-step1000`), matching the reference descriptor. NOT pre-committed shorter. If Stage 0 scope-analysis (R-S3) shows the full horizon breaches wall-clock, OR Stage 1c surfaces R-S1 amplification, operator routes a shorter horizon at that point.

**D5 — IC-15 spec-template formalization disposition (MOST CONSEQUENTIAL).** This sub-phase is the second cross-stack pair; the deferred formalization is operative. Dispositions:
- **(a) Formalize IC-15-proper at Stage 2** — the spec-template lands as a substantive deliverable; subsequent ports consume IC-15-proper by reference.
- **(b) Continue deferring to a third pair** — two pairs may be insufficient to validate across diverse physics-family / numerical-method behaviors.
- **(c) Partial formalization** — codify the uncontested aspects (equivalence.md authoring; per-sim override mechanism; per-frame diff witness format) that held across both pairs; defer the aspects that differed (the R-P2/R-S1 per-pair disposition; a possible comparison-projection axis per D8).
- **Lean: empirics-driven.** If gate-14 passes cleanly at `1e-4` across this structurally-different second family → (a) is well-supported. If sph-water needs widening / step-horizon override / a comparison-projection axis → (c) is right. Surfaced at Stage 2 close based on what Stage 1c reveals.

**D6 — Per-sim tolerance.toml override.** **MANDATORY** (`compare_captures` raises `KeyError` without it). Lean `[overrides.sph-water] category = "sph"` (at-budget; the SECOND per-sim override). Probe-verified: `[defaults.sph]` exists at `1e-4`; no `[overrides.sph-water]` pre-exists; `[budgets.sph.cross_stack]` = `1e-4` (at-budget, no amendment).

**D7 — LBM/MPM `sim_runner_diagnostic` defect.** STAYS BANKED (audit-chain-correctness § 11; not sph-water). No adjacency surfaced at probe. Confirm at charter close; do NOT fold in. If Stage 0/1 surfaces unanticipated adjacency, surface as a D-class amendment.

**D8 (NEW) — DFSPH cross-stack comparison-projection.** If Stage 1c surfaces that per-particle position-exact comparison is the wrong relation for an atomic-scatter / iterative-solver DFSPH port (e.g., per-particle density or an aggregate field is more meaningful than per-particle position), the IC-15 methodology may need a "comparison-projection" axis beyond the current "tolerance-value" axis. `compare_captures` currently diffs ALL state fields field-by-field at `1e-4`; the question is whether all fields must pass or some are advisory. **Probe cannot pre-decide** (no Stack-D capture exists). Surfaced as a potential D-class amendment driven by Stage-1c empirics; ties to D5c.

**Operator decisions on D1–D8 are recorded in the plan-drafting landing audit + cited back at each Stage's dispatch prompt as the routing context.**

---

## § 12. Sub-phase scope vocabulary

Per § C.1: `<sph-water-stack-d-stage<N><a|b|c>-<scope>>` for Stage 0/1a/1b/1c/2 commits; `<sph-water-stack-d-plan-drafting-<scope>>` for plan-drafting commits; SHA back-fill commits use `-sha-backfill` suffix per § B.2.

---

*End of charter. Stage 0 is dispatchable in a fresh Claude Code session against this plan after operator routing of § 11.5 (D1–D8).*

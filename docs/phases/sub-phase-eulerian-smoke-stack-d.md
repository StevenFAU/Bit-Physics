# eulerian-smoke → Stack-D Port — Sub-Phase Charter (FIFTH spec-Phase-2 cross-stack port)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — **FIFTH per-sim cross-stack port sub-phase under spec-Phase-2** (following `reaction-diffusion-2d` Stack-D, `sph-water` Stack-D, `lattice-boltzmann-d3q19` Stack-D, `mpm-multimaterial` Stack-D). Ports `eulerian-smoke` from its Phase-1 implemented reference (Python NumPy; `stack.name="numpy-reference"`) to Stack-D (Python / Taichi-DSL / CPU), consuming Taichi-integration (IC-11/12) + capture-determinism-contract (IC-13/14) + audit-chain-correctness (IC-16) + the IC-15 PARTIAL methodology, against the LBM Stack-D structural template (the closest analog — same MMS-bearing gate-4 + TWO canonical captures).
> **Sub-phase identity:** FIFTH spec-Phase-2 cross-stack port and the **FIFTH validation pair for the IC-15 PARTIAL-formalization methodology** (`docs/conventions/cross-stack-equivalence-methodology.md`, `8c760383…`). The **canonical candidate to stress-test the deferred iterative-solver aspect (#5)**: the Stam-Fedkiw Jacobi pressure-projection is the first multi-sweep iterative solver to appear in a cross-stack-validated trajectory — though it runs a FIXED `n_jacobi = 20` sweeps (no convergence-check early-stop; the P24 determinism pattern), so the cross-stack delta is FP-accumulation over fixed sweeps, NOT iteration-count divergence (the determinism-threatening sub-aspect of #5 is structurally absent — probe § 6). NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries. No `-phase-N` tag proposed.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (sha256 `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` — verified at HEAD per probe § 0) §§ 2.5 (IC-13 content-equivalent contract), 2.6 (cross-stack tolerance table — **`smoke` category default `relative = 1e-4`**, same as `reaction-diffusion`/`sph`/`mpm`, looser than `lbm` 1e-5), 2.7 (capture format + canonical descriptor), 3.5 + Appendix **D.6** (per-sim 13 acceptance gates + phase-2 14th gate = cross-stack equivalence), D.7 (volumetric-grid Tier-2 substack = `vector_field` IC-6), 3.6 (Layer 5 per-replication), 5.6 (smoke = `volumetric-grid` category; MMS for code verification / GCI for solution verification), 7.5 + Appendix G.7 (IC-16 citations), **11.3 item 2.4** ("Smoke to Stack D and Stack E" — the Stack-D arm IS enumerated, this sub-phase does the Stack-D half; the Stack-E Warp half is deferred), Appendix D § D.2.3 (canonical descriptors `taylor-green-128cube-seed42-step500` + `lid-driven-cavity-128sq-re100-seed42-step1000`).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `4ac8341a6cda45016c4e157823a3b5d2b2bd92d185ad367e1a7143c8ec037e0b` — verified at HEAD per probe § 0; post-§J.3 + §J.7 amendment). Inherits role model (§ A.3), three-stage cadence (§ A.2), append-only discipline (§ B), Convention #12 SHA back-fill (§ B.2 tightened + audit-chain-correctness Stage-1b N1 enumerate-all-placeholders), commit-message convention (§ C), replay-chain non-participation (§ D.4), gate-13 worktree pattern (§ E), determinism convention (§ F, esp. § F.1 declaration + § F.4 over-achievement), R-class STOP-AND-SURFACE (§ K), banked-observation carry-forward (§ L), capture cadence routing (§ P), Cat-3 additive pattern (§ I — NO-OP for smoke), B17 mutation routing (§ J), §J.7 manifest-builder low-kill-rate + methodology-precedent #14.
> **IC-15 reference document (consumed AS-IS):** `docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `8c760383bf5626c84ead49ee3b7e2ad9bbac17e09eeed055b4913fc5783c0d8f` — verified at HEAD). PARTIAL formalization: 5 codified components (§ 1) + § 4 LBM subsections (third pair, aspect #4) + § 5 MPM subsections (fourth pair, aspect #3; incl. § 5.1 PRESENT-but-NOT-EXERCISED pattern + § 5.3 S6 two-instance pattern + § 5.4 legacy-captures size bound) + 5 deferred aspects (§ 2). This sub-phase is the FIFTH pair; it puts deferred aspect **#5 (iterative-solver)** in play (in determinism-safe fixed-cap form), while aspects #1 (chaotic) and #3 (atomic-scatter) remain unexercised here (probe § 5 / § 6).
> **Structural inheritance template:** `docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md` (the closest analog — same MMS-bearing gate-4 surface AND the TWO-canonical-capture / two-seeded-runner / two-gate-14-verdict pattern). This charter inherits its § 1–§ 12 structure with **smoke deltas explicit**: gate-4 **MMS-only** (no golden arm — the OPPOSITE of LBM's dual-arm and MPM's golden-only; matches RD-3D); the cross-stack-sensitive surface is the **Jacobi iterative-solver FP-accumulation (deferred aspect #5)** + the MacCormack/centered-difference velocity-gradient operators, NOT a per-cell reduction (LBM aspect #4) or particle-scatter (MPM aspect #3); NO atomic-scatter; collocated cell-centered grid (no MAC-staggered/face-centered velocities — deferred to Stack-C).
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Phase-1 `eulerian-smoke` landed at `landing-2026-05-22T13-30-00Z.md` (verdict CONFIRMED; NO R-class arcs — single-session Stage 1); NumPy reference (`sim.py` + `reference/stable_fluids.py`) + TWO canonical captures + gate-4 NS-2D MMS (observed OOA advection 1.99 / projection 2.00, within ±0.5 of formal p=2) + 2 PBT invariants (`divergence_free_post_projection`, `smoke_density_nonneg`) + Tier-2 `vector_field` (IC-6) diagnostics.
> - Taichi-integration landed; Stack-D infra (common-py workspace member + Taichi `>=1.7,<2.0` + `set_taichi_deterministic` + `docs/common/taichi.md` + `tools/testkit/taichi_harness/`) shipped as IC-11 + IC-12.
> - Capture-determinism-contract landed; IC-13 (spec § 2.5) + IC-14 (`run_twice_and_diff`) first-class.
> - RD-2D + sph-water + LBM + MPM Stack-D ports landed as implementation + methodology templates (four landed validation pairs; IC-15 PARTIAL = 5 codified + § 4 LBM + § 5 MPM + 5 deferred); audit-chain-correctness landed (IC-16 RESOLVED); ci-action-migration + setup-uv-v8-pin hotfix landed (HEAD `6d47d91`).
> - Conventions doc `4ac8341a…`; architecture `e82b7b8e…`; methodology `8c760383…`; all HEAD.
> - `[defaults.smoke]` = `relative = 1e-4, absolute = 0.0`; `[budgets.smoke.cross_stack]` = same; **no `[overrides.eulerian-smoke]`** at HEAD.
> - Phase-1 reference canonical captures frozen (LFS): `captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.h5` (LFS OID `4604ebdc40`; ~704 MB) + `lid-driven-cavity-128sq-re100-seed42-step1000.h5` (LFS OID `e13b0d0524`; 4.2 MB) + `.json` sidecars.
> **Inherited shifts:** **152 documented entering this sub-phase** (FACT — `ci-action-migration` landing + `setup-uv-v8-pin` hotfix commit bodies). Carried by reference; not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/plan-drafting-probe-2026-05-24T16-30-00Z.md`. Read FIRST. Authoritative for the Phase-1 baseline (§ 1 + § 5 + § 7, S6 read), Convention C/D API surface (§ 2), believed-state reconciliation (§ 3), banked-item sweep (§ 4), the R-S* risk surface (§ 5), the IC-15 aspect-#5 assessment (§ 6), the naming proposal (§ 8), the D1–D13 surface (§ 9), and the 6 plan-drafting shifts (§ 10, S-S1..S-S6).
> **Date drafted:** 2026-05-24.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D13 routing (§ 11.5).

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase IS

The **FIFTH per-sim cross-stack port sub-phase under spec-Phase-2.** Takes the Phase-1-frozen `eulerian-smoke` reference (Python NumPy; the implemented `stack.name="numpy-reference"`, `sim.category="volumetric-grid"`, `variant="stam-fedkiw-stable-fluids"`) and produces a content-equivalent Stack-D (Python / Taichi-DSL / CPU) port through gates 4–14 of spec § 3.5 / Appendix D.6 (13 stack-agnostic correctness gates + the Phase-2 14th gate of cross-stack equivalence).

It is the **FIFTH validation pair for the IC-15 PARTIAL-formalization methodology** and the **first cross-stack pair to put the deferred iterative-solver aspect (#5) in play.** The Phase-1 smoke trajectory (probe § 5 / § 7 S6 read) is the classic Stam-Fedkiw stable-fluids pipeline: semi-Lagrangian advection (MacCormack-corrected in 2D; plain trilinear in 3D) → vorticity confinement (Fedkiw 2001; OFF at canonical, `vorticity_eps=0.0`) → explicit-Laplacian diffusion → **fixed-`n_jacobi=20`-sweep Jacobi pressure-projection** → scalar smoke-density advection. The Jacobi projection runs every step of both canonical captures (3D 500-step + 2D 1000-step) and the gate-4 MMS convergence study — **the cross-stack-sensitive surface is the iterative-solver FP-accumulation** (deferred IC-15 aspect #5) + the MacCormack/centered-difference velocity-gradient operators, structurally distinct from LBM's per-cell collision reduction (#4) and MPM's particle-scatter (#3).

**Note on § 11.3 enumeration (probe § 0 / S-S1):** spec § 11.3 item 2.4 reads "Smoke to Stack **D and Stack E**" — the Stack-D arm **IS enumerated** (unlike MPM's item 2.3, which named only the Stack-E Warp port). This sub-phase does the **Stack-D half** of item 2.4 — a clean spec-mandated port (no enumeration drift) — **deferring the literal Stack-E (Warp) half** to a later sub-phase (common-warp matures at § 11.4). This favourably contrasts MPM-probe's S-M1 (and documents-by-contrast the believed-state "MPM Stack-D non-spec port" observation, already recorded at MPM-probe § 0 + MPM charter § 1.1).

At close the Stack-D port ships (see § 2 for the per-gate table):
1. **Stack-D Taichi implementation** at `packages/eulerian-smoke-stack-d/` (D1 full-name precedent per § C.1 + RD-2D + sph-water + LBM + MPM).
2. **Stack-D spec sheet** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-d.md` (sibling to `spec-ref.md`).
3. **Pre-implementation probe report** `tools/testkit/probes/reports/eulerian-smoke-stack-d-probe.md`.
4. **Failing-tests evidence + sha256** (gate-3 anchor; IC-8 TDD).
5. **TWO canonical Stack-D captures** matching the Phase-1 reference descriptors (D4: `taylor-green-128cube-seed42-step500` 3D + `lid-driven-cavity-128sq-re100-seed42-step1000` 2D) via two runners (`sim_runner_seeded` + `sim_runner_seeded_2d`).
6. **`equivalence.md` extension** — the Phase-1 stub at `docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` is **extended additively** with the IC-15 methodology sections (NOT created de novo — Convention A; the sph-water/LBM/MPM pattern; the stale "Stack C self-replicates / Not yet exercised" framing updated to the actual NumPy-reference ↔ Taichi pair).
7. **All 13 stack-agnostic gates GREEN** for the Stack-D port (gates 4–13; **gate-4 carries the MMS arm ONLY** — NS-2D MMS via the shared `incompressible_ns_2d` solution; NO golden table — § 1.4.3).
8. **TWO gate-14 cross-stack equivalence verdicts** — each Stack-D capture diff'd against its Phase-1 reference capture via `compare_captures` at `relative = 1e-4` (HEAD `[defaults.smoke]`), **with explicit per-field per-frame witness + step-horizon analysis regardless of pass/fail** (the LBM poiseuille+couette two-verdict precedent).
9. **`[overrides.eulerian-smoke]` tolerance.toml entry** (MANDATORY — `category = "smoke"`; at-budget; the FIFTH per-sim override; without it `compare_captures` raises `KeyError` on `sim.category="volumetric-grid"` — probe § 2 / § 9 D6).
10. **Convergence-file edits** — CHANGELOG additive, `docs/dependencies.md` additive (NEW workspace member + Taichi-DSL consumption), `docs/perf-ledger.md` (TWO new rows — 3D + 2D).
11. **IC-15 disposition update at Stage 2 (D5)** — partial-formalization doc additively amended (lean (b)) with a fifth-pair "iterative-solver FP-accumulation" subsection.

### § 1.2 What this sub-phase is NOT

- A new spec-phase. No `-phase-N` tag (§ 11.4 / § D.2).
- A modification of the Phase-1 `eulerian-smoke` reference at `packages/eulerian-smoke/`. Phase-1-sealed code is append-only-protected per § B.1.
- A frontier flow-map variant (Clebsch-PFM / EDGE / VPFM / Cirrus / Leapfrog; NanoVDB/quadtree; Gaussian fluids / neural particle level set / 3DGS-coupled smoke — all spec-ref § 1 out-of-scope; Phase 4).
- A MAC-staggered / face-centered-velocity implementation. The Phase-1 reference is COLLOCATED cell-centered with periodic BCs (probe § 5 R-S2/R-S4); the Stack-D port mirrors it. The MAC-staggered fix is the Phase-2+ Stack-C deliverable (spec-ref § 5).
- A vorticity-confinement-ON capture. Canonical `vorticity_eps = 0.0` (PRESENT-but-NOT-EXERCISED; the Stack-D port implements the code path for fidelity + the gate-6 `check_circulation` advisory, but gate-14 does not exercise it — methodology § 5.1 pattern).
- An establishment of Stack-D infrastructure. IC-11/12/13/14/16 are consumed verbatim. No edits to `common/common-py/`, `docs/common/taichi.md`, `tools/testkit/`, or `tools/integrity/.../verify_evidence.py`.
- A tolerance-budget widening. `[budgets.*]` rows untouched; `[overrides.eulerian-smoke]` is at-budget resolution wiring (§ 1.4.2), not a widening.
- An implementation of Stack-E (the literal item-2.4 Warp half). Deferred (§ 1.1).
- An edit to any prior audit (append-only), to `docs/phases/phase-2-cross-stack-replication.md` (SUPERSEDED by per-sub-phase decomposition), or to the CI workflow. The current remote CI-red (LFS download-bandwidth-quota exceeded) is a known-banked condition (§ 8 / D13); NOT fixed here.
- A fix of the LBM/MPM `sim_runner_diagnostic` bank (smoke is a different package; smoke's own diagnostic uses an analytic Taylor-Green IC — seed-independent by construction, like LBM, correct behaviour, NOT a defect — probe § 3 ITEM 2 / § 10).
- A retrofit of the 4 prior ports' filterwarnings UNLESS D3 routes FOLD (§ 11.5 D3); the NEW smoke port includes `ignore::SyntaxWarning:taichi.*` natively regardless.
- Pre-committing D1–D13 (§ 11.5 surfaces for operator routing).

### § 1.3 Inputs + 152 cumulative shifts inherited

(FACT — `ci-action-migration-and-banked-cleanup` landing [146→152] + `setup-uv-v8-pin` hotfix [H1, not cumulated]; the four prior Stack-D landings; Phase-1 smoke landing.)

**Closing posture this sub-phase inherits:**
- All sim packages GREEN at portfolio scale; common-py first-class workspace member; Taichi `>=1.7,<2.0`; `set_taichi_deterministic` + `tools/testkit/taichi_harness/`; pytest-timeout in testkit (§ J.3).
- **152 cumulative shifts** (146 entering ci-action Stage 2 + 6 across that sub-phase to 152; hotfix H1 documented, not cumulated per § M.6).
- Conventions doc `4ac8341a…`; architecture `e82b7b8e…`; methodology `8c760383…`.
- IC-13 + IC-14 first-class; IC-16 LFS-content-OID evidence resolution; `.gitattributes` `captures/**/*.h5 filter=lfs` + `legacy-captures/**/*.h5 filter=lfs`; CI checkout `lfs:true`.
- RD-2D + sph-water + LBM + MPM Stack-D ports as implementation + methodology templates; IC-15 PARTIAL formalization doc (5 codified + § 4 LBM + § 5 MPM + 5 deferred).
- Phase-1 smoke: Stam-Fedkiw stable-fluids NumPy reference + TWO canonical captures + gate-4 NS-2D MMS (no golden) + 2 PBT invariants + Tier-2 `vector_field` (IC-6) diagnostics; NO R-class arcs.

**Banked items disposition** (§ 11.2 full table): the **IC-15 refinement opportunity** is OPERATIVE at this sub-phase's close (D5) — this IS the fifth pair, first to put deferred aspect #5 (iterative-solver) in play; lean **(b) refinement** (probe § 6). The **S-2.1 Stack-D filterwarnings gap** is live (D3 lean FOLD; probe § 3 ITEM 1 / § 4 B-1). The **manifest-equality fan-out** (§ J.7 #14) is DEFER (D7; probe § 9). The **LBM/MPM `sim_runner_diagnostic` bank** has no smoke fold path (different package; smoke's diagnostic is analytic-IC). All other prior banks UNCHANGED.

### § 1.4 Sub-phase-specific posture

#### § 1.4.1 Stack-D determinism strategy under IC-13 + IC-11 + the iterative-solver posture

(FACT — IC-13 spec § 2.5; Taichi-integration arch="cpu" mandate; Phase-1 smoke `determinism.md` + `sim.py` docstring clauses 1–8.)

The Stack-D Taichi port declares its determinism posture (docstring at the top of the Stack-D `sim.py` per § F.1; cited in the Stage 1b commit footer per § C.3). **The Phase-1 reference declares `epsilon-same-stack-same-hw` (spec § 2.5 / `determinism.md` — pressure-projection parallel reductions on the Phase-2+ Stack-C target) and the NumPy reference OVER-ACHIEVES to `bit-exact-same-stack-same-hw`** (fixed `np.roll`/`np.mod` periodic stencils + lex vertex ordering + fixed Jacobi iteration cap; no atomics, no RNG in the canonical ICs). The Stack-D Taichi port targets the same over-achievement (§ F.4 informational; does NOT promote the spec declaration):
- `set_taichi_deterministic(Config(seed=42, deterministic=True), arch="cpu")` invoked BEFORE any `@ti.kernel` decoration (R-T1); pins `cpu_max_num_threads=1`, `offline_cache=True`. (Seed value is immaterial — the canonical ICs are analytic, RNG-free; pinned for parity.)
- **f64 throughout** (the reference is f64; Stack-D uses f64-typed `ti.types.ndarray` / fields per the sph-water/LBM f64-pin requirement; no `default_fp` IC-11 edit). **`set_taichi_deterministic` does NOT set `default_fp=ti.f64`** — per the LBM § 4.1 lesson (banked precedent #7), any in-kernel accumulator (the diagnostic mass/energy sum-reductions; any per-cell reduction in the Jacobi sweep / centered-difference operators if expressed as in-kernel sums) needs an explicit `ti.f64(0.0)` seed; bare `0.0` kernel locals infer f32. **Stage-0 Task 0.3 characterizes which kernels carry in-kernel reductions and confirms the f64-seed need empirically.**
- **NO atomic-scatter.** The pipeline is per-cell stencil / semi-Lagrangian gather — expressible as `ti.ndrange` per-cell kernels reading from immutable prior-step fields (the RD-2D/LBM gather pattern; NOT the MPM scatter pattern). `determinism.atomic_ops = False`.
- **Jacobi pressure-projection is the iterative surface.** Fixed `n_jacobi = 20` sweeps, NO convergence-check early-stop (the P24 pattern). The sweep COUNT is identical across stacks → the cross-stack delta is FP-accumulation over fixed sweeps, NOT iteration-count divergence. Pin the sweep order + the centered-difference div/grad discretization to the reference (probe § 5 R-S1).
- **MacCormack predictor-corrector (2D) + plain trilinear SL (3D).** Port the lex (i,j)/(i,j,k) vertex ordering + periodic-`mod` wrap exactly; NO monotonicity limiter (the Phase-1 reference omits it for the smooth fields). Centered-difference curl + vorticity-confinement code path (eps=0 dead path at canonical).
- **No global RNG.** The canonical Taylor-Green + lid-driven ICs are analytic; the Stack-D port mirrors them (no `numpy.random.*` global state; RNG-free at canonical scale).
- Phase 2+ deferred: GPU arch determinism; driver/vendor FMA fusion; Vulkan subgroup-collectives; the MAC-staggered grid; the literal Stack-E Warp port (informational per § F.4).

The same-stack contract (gate-10) is verified by IC-14 `run_twice_and_diff` over the parsed Capture projection at the diagnostic tier (`taylor-green-32cube-seed42-step10-diagnostic`).

#### § 1.4.2 Cross-stack equivalence posture (gate 14) — IC-15 PARTIAL methodology's FIFTH validation pair

(FACT — Appendix D.6 gate 14; spec § 2.6 + § 3.6; LBM `equivalence.md`; probe § 6 / § 7.)

Gate 14 is the load-bearing cross-stack equivalence test. **TWO independent verdicts** (the LBM poiseuille+couette precedent), each diffing a Stack-D Taichi capture (RIGHT) against the **Phase-1 NumPy-reference capture (LEFT)** via `compare_captures` at `relative = 1e-4, absolute = 0.0` (HEAD `[defaults.smoke]`):
- **Verdict A — 3D Taylor-Green** (`taylor-green-128cube-seed42-step500`): state fields `u`, `v`, `w`, `density`; 11 frames (cadence-50).
- **Verdict B — 2D lid-driven-cavity** (`lid-driven-cavity-128sq-re100-seed42-step1000`): state fields `u`, `v`, `density`; 11 frames (cadence-100).
Acceptance: `within_tolerance == True` across every captured frame + every state field, for BOTH verdicts.

> **The cross-stack partner is the NumPy reference, not a GPU stack** (probe § 7) — the sph-water/LBM/MPM pattern (frozen CPU reference as the gate-14 diff-partner). The relevant relation is reference-CPU (NumPy elementwise) ↔ Taichi-CPU (serialised `ti.ndrange`, f64).

**This is the IC-15 PARTIAL methodology's FIFTH validation pair, and the first to put deferred aspect #5 (iterative-solver) in play** (probe § 6). Aspects **#1 (chaotic)** — unexercised (Taylor-Green decaying vortex + lid-driven Re=100 are laminar) — and **#3 (atomic-scatter)** — N/A (no scatter) — remain unexercised. So:
- The diff is genuinely empirical at 1e-4 (more headroom than LBM's 1e-5). Most-likely shape (probe § 6): **`within_tolerance=True` at FP-round-off scale** — the fixed Jacobi sweep count is identical across stacks (no iteration-count divergence), the stencils are deterministic, and f64 + serialised single-thread keep the delta at `~1e-14/1e-15`.
- The Stage 1c regime: run BOTH diffs at the full canonical step-horizons (D4; 500-step 3D + 1000-step 2D); emit per-field per-frame `max_abs_err`/`max_rel_err` witness verbatim **regardless of pass/fail**; perform explicit step-horizon analysis (does the diff grow over the horizon? — expected flat FP-round-off, like the four prior pairs); **do NOT silently widen tolerance** (a widening requires a separate operator-approved commit + budget amendment per spec § 2.6 + § L). If either gate-14 exceeds 1e-4, surface to operator per Hard Rule 2 BEFORE Stage 2 (R-S1 routing).

**Tolerance resolution (D6 — MANDATORY):** `sim.category = "volumetric-grid"` (physics-family) has no `[defaults.volumetric-grid]` row; `compare_captures` raises `KeyError` until Stage 1c adds `[overrides.eulerian-smoke] category = "smoke"` (mapping to `[defaults.smoke]` = `1e-4`). **At-budget resolution wiring** (equals `[budgets.smoke.cross_stack]`), not a widening — the RD-2D/sph-water/LBM/MPM override precedent (probe § 2). The FIFTH per-sim override.

#### § 1.4.3 Code-verification posture (gate 4) — MMS ONLY (no golden)

(FACT — spec-ref § 6.1 + § 7; Phase-1 landing; probe § 5 R-S7 / § 10 S-S4.)

**A gate-level delta from BOTH prior templates.** LBM carried a golden arm (4a) AND an MMS arm (4b); MPM carried the golden arm ONLY; **smoke carries the MMS arm ONLY** — matching RD-3D (MMS-only). spec-ref § 7: "No closed-form golden table." The Stack-D port re-verifies:
- **Gate-4 — NS-2D MMS convergence study** (`tests/test_mms_convergence.py`): the SHARED byte-identical Taylor-Green-style forced-NS manufactured solution at `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` (shift #18: LBM + eulerian-smoke share this MMS solution). The Stack-D MMS test drives the **Taichi-DSL 2D `stable_fluids_step`** (MacCormack-advect + Jacobi-project) with the manufactured source forcing and asserts the observed OOA on the L2 error matches formal p=2 within ±0.5 (Phase-1: advection 1.99 / projection 2.00). **Inline convergence study** (probe § 5 R-S7 / B-6) — the LBM Stack-D `test_mms_convergence.py` + Phase-1 smoke Path-Y precedent; the MMS-runner-scaffolding generalization (§ L.2 item 6) STAYS BANKED (testkit-infra scope, NOT this port's deliverable — D-class confirm at Stage 0).

**Cat-3 disposition: NO-OP.** Smoke ships NO golden table (MMS-only); no `volumetric-grid` golden subdir is created; **no `_SUBDIRS_PICKED_UP` change** (the RD-3D NO-OP precedent — § I.2).

> **Gate-numbering note (FACT):** use the **canonical Appendix D.6 numbering** in all Stack-D artifacts: gate **4** = code-verification (MMS), gate 5 = Tier 1, gate 6 = Tier 2 (`vector_field` IC-6 per D.7), gate 7 = Cat-1 citations, gate 8 = Cat-2 API, gate 9 = captures+corpus, gate 10 = determinism, gate 11 = PBT, gate 12 = perf, gate 13 = replay, gate 14 = cross-stack. (Phase-1 smoke test docstrings may use a different internal numbering — match the canonical numbering.)

#### § 1.4.4 Iterative-solver risk acknowledgment (deferred IC-15 aspect #5)

(FACT — IC-15 methodology doc § 2 item 5; probe § 5 R-S1 / § 6.)

The IC-15 partial-formalization doc defers aspect #5 ("iterative-solver chaotic amplification") as unexercised across all four prior pairs. **This sub-phase puts it in play** via the Stam-Fedkiw Jacobi pressure-projection (a multi-sweep iterative solver in the trajectory). **BUT the iteration is a FIXED `n_jacobi=20` cap with NO convergence-check early-stop** (the P24 determinism pattern) — so the determinism-threatening sub-aspect of #5 (variable iteration count tipping the convergence threshold → run-to-run / cross-stack divergence) is **structurally absent by design**. Gate-14 yields the FIRST empirical data on aspect #5, in its determinism-SAFE fixed-cap FP-accumulation form, at the 1e-4 category. This is the empirical contribution this pair makes to IC-15 (D5 lean (b)); promoting to FULL (a) stays premature (#1 chaotic unexercised; #5's chaotic-amplification sub-aspect structurally absent).

#### § 1.4.5 Phase-1 S6 inheritance + R-S6 fifth-pair calibration

(FACT — Phase-1 landing; probe § 5 / § 7.)
- **S6 (canonical trajectory vs spec dynamics)** — the spec/algebraic.md describe the full Stam-Fedkiw pipeline; the canonical captures exercise a SUBSET: plain SL (3D), MacCormack 2D-only, vorticity confinement OFF, collocated grid, laminar regimes, fixed-cap Jacobi (probe § 5 R-S4). The "spec describes more than implementation does" two-instance pattern (banked #13 / methodology § 5.3) — smoke extends the RD-3D / sph-water (rigid free-fall) / MPM (single-material) precedent.
- **R-S6 (methodology calibration, fifth pair):** the Phase-1 smoke `sim.py` + `stable_fluids.py` characterization (probe § 5 / § 7) IS the empirical anchor for R-S1..R-S5 + D5. Stage 0/1 agents re-read both modules at HEAD; do NOT extrapolate from the LBM/MPM/sph shapes (smoke has TWO captures + MMS-only gate-4 + a dead vorticity path + a collocated grid).

#### § 1.4.6 Taichi-specific risk acknowledgments inherited

(FACT — Taichi-integration § 9 R-T1..R-T5 verbatim.)
- **R-T1 (field-init order):** `set_taichi_deterministic`/`ti.init` precedes every `@ti.kernel` decoration.
- **R-T2 (`-> None` annotations forbidden):** Taichi 1.7.4 AST transformer raises on `-> None` kernels. Omit.
- **R-T3 (Python-3.12 locale-deprecation + the SyntaxWarning gap):** the new port's `pyproject.toml` filterwarnings includes the taichi `DeprecationWarning` filter AND `ignore::SyntaxWarning:taichi.*` (the S-2.1 fix; probe § 3 ITEM 1 — the 4 prior ports lack the SyntaxWarning filter, exposed by a cold `.pyc`).
- **R-T4 (workspace import via uv):** `packages/eulerian-smoke-stack-d/` registers as workspace member; imports `from common_py.determinism import ...` + `from capture import ...`.
- **R-T5 (canonical-tier vs diagnostic-tier):** the port ships canonical-tier runners (TWO captures) + a diagnostic-tier runner (`taylor-green-32cube-seed42-step10-diagnostic`) for the gate-10 determinism test to avoid paying canonical cost per pytest invocation.

### § 1.5 Role model, conventions, audit discipline

Inherited from § A.3 + § B + § C verbatim. Single Claude Code agent at a time; single coordinator chat; one operator. Convention #12 SHA back-fill at every stage close per § B.2 tightened-discipline + audit-chain-correctness Stage-1b N1 (enumerate EVERY placeholder-bearing audit committed in a stage). Commit-first-then-sha256 for text artifacts. **Cat-4 draft-citation grammar:** `path:line` citations in audits MUST resolve at HEAD with a FULL repo-relative path (a bare `file.py:NNN` HARD_FAILs the `cat4-path-line-assertions` pre-commit hook — plan-drafting probe lesson); prefer function-name references or full paths.

### § 1.6 Architecture — six stages

Three-stage cadence per § A.2, with Stage 1 sub-decomposed into 1a/1b/1c per D2 lean (RD-2D + sph-water + LBM + MPM precedent):
- **Stage 0 — Pre-flight.** Replay; tolerance-budget carryover; Phase-1 reference capture sha256 reverify (BOTH captures); empirical Taichi-DSL Stam-Fedkiw kernel validation (R-S1 — the **f64-seed + Jacobi-sweep + MacCormack derisk**); MMS-solution Stack-D-consumability check; R-S5-equivalent empirical `compare_captures` taxonomy-resolution check against a synthetic `volumetric-grid` manifest; two-capture wall-clock note (R-S8); D10 corpus-sizing input; checkpoint + SHA back-fill.
- **Stage 1a — Failing-tests commit.** Test surface importing the yet-to-exist Stack-D modules; clean `ModuleNotFoundError`; failing-tests evidence + sha256.
- **Stage 1b — Implementation commit.** Stack-D Taichi Stam-Fedkiw port (2D + 3D pipeline kernels); TWO canonical captures; gates 4–13 GREEN (gate-4 MMS-only); spec sheet; probe report; TWO perf-ledger rows; determinism docstring; the native SyntaxWarning filter; (if D3 FOLD: the 4-port filterwarnings retrofit).
- **Stage 1c — Cross-stack equivalence + landing-prep.** `[overrides.eulerian-smoke]`; `equivalence.md` extension; TWO gate-14 diff witnesses + step-horizon analysis; schema-corpus entry (D10 sizing decision).
- **Stage 2 — Landing.** Convergence edits; integrity sweep; portfolio-scale regression sweep (§ B.7 — exercises the S-2.1 cold-`.pyc` gap); gate-13 worktree replay; IC-16-consuming evidence-path verification; CI corpus round-trip verification (S-CI1; subject to the CI-red LFS-bandwidth condition — D13); append-only check; **D5 IC-15 disposition**; **D3 S-2.1 FOLD landing** (if routed); landing audit + SHA back-fill.

Each sub-stage ships a checkpoint audit; Stage 2 the landing audit. No `-phase-N` tag (§ 11.4).

---

## § 2. Deliverables (per gate, expanded set)

The 14-gate per-port acceptance contract (Appendix D.6 + spec § 3.5). **Gate 4 carries the MMS arm ONLY** (no golden — the key delta from LBM/MPM). **TWO canonical captures** (gates 9 + 14 doubled, the LBM precedent).

| # | Gate | eulerian-smoke Stack-D deliverable | Acceptance |
|---|---|---|---|
| 1 | Spec sheet | `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-d.md` | 13-section template; § 5 cites Stack-D Taichi path; § 6 declares MMS verification posture (no golden); § 8 declares the determinism posture per § 1.4.1; § 9 declares cross-stack posture at `relative = 1e-4`. |
| 2 | Probe report | `tools/testkit/probes/reports/eulerian-smoke-stack-d-probe.md` | Enumerates common-py + testkit-capture + Taichi API surfaces consumed; upstream citations (Stam 1999; Fedkiw 2001; Taylor 1937; Selle et al. 2008); public exports. |
| 3 | Failing tests + output hash | `packages/eulerian-smoke-stack-d/tests/` + `tools/testkit/failing-tests-evidence/eulerian-smoke-stack-d-<UTC>.txt` + sha256 footer | Failing-tests footer `Failing-tests-output(-hash)`; impl footer `Implements-failing-tests-from` + `…-witnessed`. |
| 4 | **Code verification — MMS** | `tests/test_mms_convergence.py` (NS-2D MMS via shared `incompressible_ns_2d`; drives Taichi 2D `stable_fluids_step`; advection + projection OOA arms) | Observed OOA within ±0.5 of formal p=2 (both arms). **No golden arm.** NO-OP for `_SUBDIRS_PICKED_UP`. |
| 5 | Tier 1 diagnostics | `tests/test_diagnostics.py` Tier-1 `check_health` NaN/Inf scan | clean across captured frames (both captures). |
| 6 | Tier 2 (`vector_field` IC-6) | `tests/test_diagnostics.py` Tier-2: `check_divergence_free` (post-projection \|∇·u\| below tolerance), `check_circulation` (Kelvin advisory; vorticity-confinement OFF), `check_helicity`, `check_energy_spectrum` (advisory) | substack clean (divergence-free below the sub-phase-empirical collocated-grid floor — spec-ref § 6.6 / `stable_fluids.py` `project_pressure` docstring; advisories finite/bounded). |
| 7 | Cat 1 citations | spec-ref-stack-d.md § 2 cites Stam 1999 (DOI 10.1145/311535.311548) + Fedkiw 2001 (DOI 10.1145/383259.383260) + Taylor 1937 (DOI 10.1098/rspa.1937.0036) + reference cross-ref | `python -m integrity --cat 1` clean. |
| 8 | Cat 2 public API | `eulerian_smoke_stack_d.{reference, sim, invariants}` exports match probe § 5 | `python -m integrity --cat 2` clean. |
| 9 | Canonical captures + corpus | `captures/eulerian-smoke-stack-d/{taylor-green-128cube-seed42-step500, lid-driven-cavity-128sq-re100-seed42-step1000}.{h5,json}` (D4; TWO) + schema-corpus entry at `tests/fixtures/legacy-captures/phase-2-eulerian-smoke-stack-d.{h5,json}` (D10 — sizing decision) | `load_capture` round-trips both; manifest payload sha256 recorded (commit-first-then-sha256; `.h5` LFS — record content OID). |
| 10 | Determinism (IC-13) | `tests/test_determinism.py` invokes IC-14 `run_twice_and_diff(sim_runner_diagnostic, seed=42)` | `verdict.content_equivalent == True`. Determinism docstring per § F.1; cited in footer. |
| 11 | PBT (≥ 2 invariants) | `tests/test_pbt_invariants.py` ships `divergence_free_post_projection` + `smoke_density_nonneg` (spec-ref § 6.6) at `n_examples ≥ 50` | Hypothesis example DB committed. |
| 12 | Perf-ledger rows | TWO rows in `docs/perf-ledger.md`: `eulerian-smoke \| taichi-cpu \| taylor-green-128cube-seed42-step500 \| <s> \| …` + `… \| lid-driven-cavity-128sq-re100-seed42-step1000 \| <s> \| …` | Wall-clock recorded; >2× the NumPy baselines (691.587 s / 5.099 s) flags to operator (R-S8). |
| 13 | Failing-tests replay | `git worktree add … <stage-1a-sha>`; pytest reproduces `ModuleNotFoundError`; HEAD GREEN | structural reproduction per § E. |
| 14 (Phase-2) | Cross-stack equivalence (TWO verdicts) | `compare_captures(numpy_ref, stack_d)` per capture at `relative = 1e-4` (LEFT = reference) | **Empirical** — BOTH verdicts + per-field per-frame witness + step-horizon analysis documented in `equivalence.md` **regardless of pass/fail**. If either exceeds 1e-4: STOP + surface per R-S1 (no silent widening). |

**Acceptance for "sub-phase complete":** gates 1–13 GREEN; BOTH gate-14 verdicts landed with full step-horizon witness (a `within_tolerance == False` outcome that has been operator-routed per R-S1 is a legitimate landing state — the methodology validation is the deliverable, not a forced PASS); integrity sweep clean (byte-identical streak is informational — a new sim package may break it; NOT load-bearing); portfolio sweep GREEN; CI corpus round-trip GREEN where the CI-red LFS-bandwidth condition permits (else local-verification-only documented — D13); D3 S-2.1 disposition landed (if routed FOLD); mutation artifact (B17 routing per § 11.5); D5 IC-15 disposition landed; landing audit + SHA back-fill. No `-phase-N` tag.

---

## § 3. Interface contracts

### § 3.1 ICs consumed (existing, not redefined)

(FACT — probe § 2.)
- **IC-2** — `capture.{CaptureManifest, StepState, write_capture, load_capture}` (testkit; canonical capture write + gate-14 load).
- **IC-4** — `common_py.determinism.Config` (seed + deterministic flag).
- **IC-6** — Tier-2 `vector_field` substack (gate-6; divergence-free / circulation / helicity / energy-spectrum).
- **IC-8** — probe report § 5 is the public-API contract; gate-3 failing-tests ordering.
- **IC-9** — checkpoint + landing audits per § B.3.
- **IC-11** — `set_taichi_deterministic(config, arch="cpu")` at sim-runner entry.
- **IC-12** — `docs/common/taichi.md` rules (R-T1..R-T5).
- **IC-13** — content-equivalence contract (spec § 2.5); same-stack posture per § 1.4.1.
- **IC-14** — `run_twice_and_diff` (Python) consumed by gate-10.
- **IC-15 (PARTIAL)** — `docs/conventions/cross-stack-equivalence-methodology.md` (`8c760383…`): the 5 codified components consumed AS-IS + the § 4 LBM subsections (esp. § 4.1 f64-accumulator-seed) + the § 5 MPM subsections (esp. § 5.1 PRESENT-but-NOT-EXERCISED, § 5.3 S6 two-instance). Deferred aspect #5 (iterative-solver) is exercised (fixed-cap form); #1/#3 not.
- **IC-16** — `verify_evidence` LFS-content-OID resolution; gate-5/Stage-2 evidence verification resolves the `.h5` LFS content OIDs automatically (no §B.6 annotation).

### § 3.2 ICs produced — IC-15 formalization disposition (D5)

This sub-phase is the FIFTH cross-stack pair. Whether to additively amend / substantively expand / promote-to-full / hold-unchanged the IC-15 doc at Stage 2 is **D5** (§ 11.5) — surfaced, not pre-committed; lean **(b) additive REFINEMENT** given the probe characterization (deferred aspect #5 in play in fixed-cap form; #1/#3 unexercised). If amended ((a)/(b)/(d)), subsequent cross-stack ports consume the updated doc by reference; if held unchanged (c), the partial doc + per-sim `equivalence.md` pattern continue. The additive amendment lands as a §6 "fifth-pair refinements" subsection (before §6 References, which shifts to §7 — additive, never rewrite history).

---

## § 4. Stage decomposition

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay** (canonical gate set against `v0.1.0-phase-1`). Bit-identity invariant match (`9399fc33…18909f34`) → proceed; mismatch → BLOCKED per P20; write `stage-0-blocked-replay-<UTC>.md`; surface; stop. Re-verify the pre-condition anchors (conventions `4ac8341a…`, architecture `e82b7b8e…`, methodology `8c760383…`, HEAD, 152 shifts). **Note:** the integrity sweep (`c19492ad…`) is informational here; remote CI-red (LFS-bandwidth) does NOT affect local replay (21/21 LFS objects present).
- **Task 0.1 — Tolerance-budget carryover.** Edit `tolerance-budget.toml`: `[phase].phase = "sub-phase-eulerian-smoke-stack-d"`, bump `opened_at`. NO `[budgets.*]` widening (`[budgets.smoke.cross_stack]` stays 1e-4). Commit `chore(eulerian-smoke-stack-d-stage0-tolerance-budget): sub-phase carryover from sub-phase-mpm-multimaterial-stack-d`.
- **Task 0.2 — Phase-1 reference capture sha256 reverify (BOTH captures).** `git lfs ls-files` + content-OID the two `.h5` (`4604ebdc40…` Taylor-Green, `e13b0d0524…` lid-driven); `git cat-file -p HEAD:<json> | sha256sum` the two `.json`. Mismatch → BLOCKED (the references are the gate-14 partners).
- **Task 0.3 — Empirical Taichi-DSL Stam-Fedkiw kernel validation (R-S1; LOAD-BEARING — the f64-seed + Jacobi + MacCormack derisk).** Write a small smoke-tier kernel set (e.g. a 16²/16³ grid, a few steps): verify it (a) runs under `set_taichi_deterministic(arch="cpu")`, (b) is `run_twice_and_diff`-content-equivalent, (c) reproduces the MMS OOA at a coarse ladder, and (d) **characterize the f64-accumulator surface empirically** — which kernels carry in-kernel reductions (diagnostic mass/energy sums; any Jacobi/centered-difference in-kernel accumulation), and confirm bare-`0.0` f32 inference vs `ti.f64(0.0)` seeded f64 (the LBM § 4.1 derisk). Confirm the MacCormack predictor-corrector + the fixed-`n_jacobi=20` sweep + the trilinear/bilinear gather are expressible deterministically. **If Taichi-DSL cannot express the pipeline deterministically at single-thread, OR the f64-seeded result still diverges from the reference at a scale threatening 1e-4, STOP and surface per Hard Rule 2** (the D5/R-S1 calibration datum).
- **Task 0.4 — MMS-solution Stack-D-consumability check.** Verify the shared `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` solution is loadable + its manufactured source feeds a Taichi-side `stable_fluids_step` MMS convergence study. NOT a production gate-4 deliverable — a dependency check. (No golden surface to check — smoke is MMS-only; cite the LBM Stack-D `test_mms_convergence.py` as the inline template.)
- **Task 0.5 — R-S5-equivalent empirical taxonomy-resolution check.** Empirically invoke `compare_captures` against a synthetic Stack-D manifest carrying real `sim.category="volumetric-grid"`, `sim.name="eulerian-smoke"`, to confirm the `KeyError`-without-override behaviour and that the planned `[overrides.eulerian-smoke] category="smoke"` resolves to `1e-4`. Catches the tolerance-resolution gap at Stage 0 rather than mid-Stage-1c.
- **Task 0.6 — Two-capture wall-clock note (R-S8).** Record the Phase-1 baselines (691.587 s 3D 128³×500; 5.099 s 2D 128²×1000). The 3D capture is the heaviest non-SPH reference. Note whether Taichi-cpu serialised single-thread is expected faster/slower than the NumPy floor (§ N.5 over-shoot for NumPy-vectorized sims, ~1.45×); instrument per the sph-water R-S3 precedent. NOT a structural alarm; the diagnostic tier keeps gate-10 fast.
- **Task 0.7 — D10 schema-corpus sizing pre-decision input.** Record the canonical `.h5` sizes (3D ~704 MB; 2D 4.2 MB) and confirm `.gitattributes` `legacy-captures/**/*.h5 filter=lfs` covers the corpus path + CI `lfs:true`. Surface the corpus-entry sizing question (small 2D vs diagnostic-tier vs canonical 3D — methodology § 5.4 representative-subset) for operator routing at the plan-drafting landing / Stage 1c. Note the CI-red LFS-bandwidth condition's effect on S-CI1 (D13).
- **Closing.** `stage-0-checkpoint-<UTC>.md` per IC-9. Front-matter both `head_sha:` AND `head_sha_at_checkpoint:`. Commit `chore(eulerian-smoke-stack-d-stage0-checkpoint): Stage 0 pre-flight complete`. Convention #12 SHA back-fill.

### § 4.2 Stage 1 — Implementation (3 sub-stages per D2 lean)

#### § 4.2.1 Stage 1a — Failing-tests commit (single session, single commit)

1. Create the Stack-D test surface at `packages/eulerian-smoke-stack-d/tests/`: `__init__.py`, `conftest.py`, `test_mms_convergence.py` (gate-4 MMS), `test_diagnostics.py` (Tier 1 + Tier 2 vector_field), `test_pbt_invariants.py` (2 invariants), `test_determinism.py` (IC-14), `test_reference_sanity.py`, `test_cross_stack_equivalence.py` (gate-14; TWO verdicts; SKIP until 1c).
2. Each test imports `eulerian_smoke_stack_d.{reference, sim, invariants}` (not yet existing).
3. `pytest packages/eulerian-smoke-stack-d/tests/ -v` → all fail with clean `ModuleNotFoundError`.
4. Capture verbatim output to `tools/testkit/failing-tests-evidence/eulerian-smoke-stack-d-<UTC>.txt`; sha256 **of the committed blob** (commit-first-then-sha256).
5. Commit `test(eulerian-smoke-stack-d-stage1a): failing tests for Stack-D port`. Footer `Failing-tests-output(-hash)`.

**Closing.** `stage-1a-checkpoint-<UTC>.md`; commit `chore(eulerian-smoke-stack-d-stage1a-checkpoint): …`; SHA back-fill if needed.

#### § 4.2.2 Stage 1b — Implementation commit (single session, single commit)

**Determinism-strategy declaration first** (§ F.1 + § 1.4.1): docstring at the top of `sim.py` recording the f64-pin (with explicit `ti.f64(0.0)` accumulator seeds per LBM § 4.1), the fixed-`n_jacobi=20` Jacobi sweep + its cross-stack consequence (FP-accumulation, not iteration-count divergence), the MacCormack/plain-SL split (2D MacCormack, 3D plain), the vorticity-confinement dead path (eps=0), the no-atomics/no-RNG posture, and Phase-2+ deferrals.

Per-task sequence (new-files-first per Convention A):
1. **Package skeleton.** `packages/eulerian-smoke-stack-d/pyproject.toml` (workspace member: `bit-physics-{testkit,diagnostics,common-py}` + h5py + hypothesis + numpy + `taichi>=1.7,<2.0`; `[tool.uv.sources]` workspace=true; **filterwarnings = `["error", "ignore::DeprecationWarning:taichi.*", "ignore:.*locale\\.getdefaultlocale.*:DeprecationWarning", "ignore::SyntaxWarning:taichi.*"]`** — the native S-2.1 fix) + `eulerian_smoke_stack_d/__init__.py` + `reference/__init__.py` + `README.md`.
2. **Reference module(s)** `eulerian_smoke_stack_d/reference/`: Taichi kernels mirroring the NumPy reference — `semi_lagrangian_advect_2d`/`_3d` (bilinear/trilinear gather; lex vertex order; periodic mod-wrap), `maccormack_advect_2d` (predictor-corrector; no limiter), `_laplacian_5point`/`_7point_periodic` (diffuse), `project_pressure`/`_3d` (fixed-20-sweep Jacobi; collocated centered-difference div/grad), `_curl_3d_periodic` + `_vorticity_confinement_3d` (eps=0 dead path), `stable_fluids_step`/`_3d`; canonical constants (`CANONICAL_DESCRIPTOR_2D/3D`, `CANONICAL_SEED=42`, `CANONICAL_STEP_COUNT_2D/3D`, `_DEFAULT_N_JACOBI=20`, `canonical_params_2d/3d`) mirrored verbatim. NO `-> None` annotations (R-T2).
3. **Sim wrapper** `eulerian_smoke_stack_d/sim.py`: determinism docstring; `sim_runner_seeded(seed, out_dir) -> Path` (canonical 3D Taylor-Green; 128³×500, cadence-50; `set_taichi_deterministic` before fields/kernels; `capture.write_capture`); `sim_runner_seeded_2d(seed, out_dir) -> Path` (canonical 2D lid-driven; 128²×1000, cadence-100); `sim_runner_diagnostic(seed, out_dir) -> Path` (`taylor-green-32cube-seed42-step10-diagnostic`; analytic IC).
4. **Invariants module** `eulerian_smoke_stack_d/invariants.py`: `divergence_free_post_projection` + `smoke_density_nonneg` (spec-ref § 6.6).
5. **Spec sheet** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref-stack-d.md` (13-section; § 6 MMS posture, no golden; § 8 determinism posture; § 9 cross-stack `1e-4`).
6. **Probe report** `tools/testkit/probes/reports/eulerian-smoke-stack-d-probe.md`.
7. **Implement test bodies → GREEN** (gates 4–13; gate-4 MMS); `test_cross_stack_equivalence.py` SKIP at 1b. Capture GREEN evidence + sha256.
8. **TWO canonical captures (gate 9).** `sim_runner_seeded(seed=42, …)` + `sim_runner_seeded_2d(seed=42, …)` → the two descriptors into `captures/eulerian-smoke-stack-d/`. Record sidecar sha256 (commit-first-then-sha256; `.h5` LFS → content OID).
9. **Perf-ledger rows** (gate 12; TWO).
10. **Workspace member registration** in root `pyproject.toml` `[tool.uv.workspace].members`.
11. **(If D3 FOLD) S-2.1 retrofit** — add `ignore::SyntaxWarning:taichi.*` to the 4 prior ports' `pyproject.toml` filterwarnings (4 single-line additive edits). May be deferred to Stage 2 if the operator prefers (probe § 9 D3).
12. **Gate-13 worktree replay** at the Stage 1a SHA.
13. **Commit** `feat(eulerian-smoke-stack-d-stage1b): Stack-D Taichi Stam-Fedkiw implementation through gate 13`. Footer cites Stage 1a evidence sha, GREEN evidence sha, both capture sidecar shas, perf wall-clocks, determinism docstring path, gate-4 MMS OOA, `Implements-failing-tests-from` + `…-witnessed`.

**Closing.** `stage-1b-checkpoint-<UTC>.md` (gates 4–13 GREEN; gate-14 PENDING-1c; record the same-stack determinism outcome + the f64-seed finding); commit `chore(eulerian-smoke-stack-d-stage1b-checkpoint): …`; SHA back-fill.

#### § 4.2.3 Stage 1c — Cross-stack equivalence + landing-prep (single session, single commit)

1. **Add `[overrides.eulerian-smoke]` to `tolerance.toml`** (`category = "smoke"`; at-budget; preserve existing comments — Convention A). MANDATORY (D6).
2. **Extend `docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` additively** (the Phase-1 stub exists — preserve its tolerance-row + cross-stack-scope tables; populate the IC-15 methodology sections; update the stale "Stack C self-replicates / Not yet exercised" framing to the actual NumPy-reference ↔ Taichi pair; document the iterative-solver FP-accumulation posture + the vorticity-confinement PRESENT-but-NOT-EXERCISED note).
3. **Run BOTH gate-14 diffs.** `compare_captures(captures/eulerian-smoke-ref/<desc>.json, captures/eulerian-smoke-stack-d/<desc>.json)` per descriptor. Capture output verbatim to Stage-1c evidence. Document `within_tolerance`, per-field per-frame `max_abs_err`/`max_rel_err` (`u`,`v`,`w`,`density` 3D; `u`,`v`,`density` 2D), **step-horizon analysis** (does the diff grow over 500/1000 steps? — expected flat FP-round-off).
4. **Gate-14 disposition.** If both `within_tolerance == True`: GREEN. If either `False`: document the field + step at which `1e-4` is exceeded; **STOP and surface to operator per Hard Rule 2 BEFORE Stage 2** (R-S1 routing). Do NOT silently widen. Do NOT pre-commit a shorter horizon (D4).
5. **Schema-corpus entry (D10).** Copy the chosen capture to `tests/fixtures/legacy-captures/phase-2-eulerian-smoke-stack-d.{h5,json}` per the operator's D10 routing (small 2D ~4.2 MB / diagnostic-tier / canonical 3D ~704 MB); record sha256. The `.gitattributes` LFS rule applies automatically.
6. **Un-skip `test_cross_stack_equivalence.py`** (verify GREEN if both gate-14 passed; if routed-fail, the test reflects the operator-routed acceptance state).
7. **Commit** `feat(eulerian-smoke-stack-d-stage1c): cross-stack equivalence harness extension + gate 14 verdicts`. Footer cites the capture shas, both equivalence verdicts + per-field witness, step-horizon, `equivalence.md` sha, schema-corpus sha, `[overrides.eulerian-smoke]`.

**Closing.** `stage-1c-checkpoint-<UTC>.md` (14-row gate table + both gate-14 witnesses + step-horizon); commit `chore(eulerian-smoke-stack-d-stage1c-checkpoint): …`; SHA back-fill.

### § 4.3 Stage 2 — Landing (single session if Stage 1 clean)

Inherits LBM/MPM § 4.3 Steps 2.1 → 2.13. Deltas:
- **2.1 — Anchor re-check.** Re-grep every path/SHA/sha256 across charter + 3 Stage-1 checkpoints + Stage 0 + spec sheet + probe report + extended `equivalence.md` + both capture sidecars. Cite post-back-fill HEAD shas.
- **2.2 — Portfolio-scale regression sweep (§ B.7).** Python fan-out incl. new `packages/eulerian-smoke-stack-d` + tools + common-py; TypeScript fan-out (NO-OP — Python-only port). **This sweep exercises the S-2.1 cold-`.pyc` taichi-SyntaxWarning gap** (the 4 prior ports + the new port under `filterwarnings=["error"]`); verify the native filter holds + (if D3 FOLD) the retrofit holds. Verify the existing `[overrides.{reaction-diffusion-2d,sph-water,lattice-boltzmann-d3q19,mpm-multimaterial}]` non-interference; sweep-output sha256 informational.
- **2.3 — Cat 3 disposition.** Smoke ships NO golden table (MMS-only). **NO-OP — no `_SUBDIRS_PICKED_UP` change** (RD-3D precedent).
- **2.4 — Integrity sweep** (Cat 1–5 + X). Byte-identical streak may break (new sim package); document per-Cat deltas; **informational, NOT load-bearing**.
- **2.5 — Evidence-path verification (IC-16).** `verify_evidence` over all new sub-phase audits; the `.h5` LFS content OIDs resolve automatically. Confirm + document.
- **2.6 — Gate-13 replay** per § E.
- **2.7 — Append-only check** vs `v0.1.0-phase-1`. Document legitimate additive amendments (`tolerance.toml` `[overrides.eulerian-smoke]`; `equivalence.md` extension; `test_cross_stack_equivalence.py` SKIP-removal; IC-15 methodology-doc amendment if D5 (a)/(b)/(d); the 4-port filterwarnings retrofit if D3 FOLD; `packages/eulerian-smoke/` UNCHANGED). Conventions doc + architecture UNCHANGED.
- **2.8 — Mutation artifact (B17).** Default lean PATH-B re-bank (single-sim Taichi-DSL port; per RD-2D/sph/LBM/MPM § 4.3). Operator may route PATH-A.
- **2.9 — Convergence edits + CI corpus round-trip (S-CI1 / D13).** CHANGELOG additive; `dependencies.md` additive (NEW workspace member + Taichi-DSL); TWO perf-ledger rows (cross-check from 1b). **Verify the schema-corpus round-trip in CI (via `gh`) where the CI-red LFS-bandwidth condition permits; if CI cannot smudge LFS due to the bandwidth quota, document local-verification-only posture explicitly** (D13 — the LFS-architecture bank, not this sub-phase's to fix).
- **2.10 — D5 IC-15 disposition.** Lean **(b)** additively amend `docs/conventions/cross-stack-equivalence-methodology.md` (validated fifth physics family [volumetric-grid]; deferred aspect #5 [iterative-solver FP-accumulation, fixed-cap form] now has data; reuse the § 5.1 PRESENT-but-NOT-EXERCISED pattern for vorticity confinement; extend the § 5.3 S6 two-instance pattern; the MMS-only single-physics-family-with-two-captures variant) while keeping #1/#3 deferred; **(d)** SUBSTANTIVE EXPANSION only if gate-14 surprised; **(a)** FULL premature (#1 unexercised; #5's chaotic sub-aspect structurally absent); **(c)** hold unchanged (too weak). **Additive amendment only (Convention A); never rewrite the partial doc's history.**
- **2.11 — Landing audit.** `landing-<UTC>.md` per IC-9; `artifact: sub-phase`, `artifact_id: sub-phase-eulerian-smoke-stack-d`; both `head_sha:` AND `head_sha_at_checkpoint:`; enumerate all evidence_paths + evidence_hashes; verdict-state per outcome.
- **2.12 — Convention #12 SHA back-fill** (enumerate EVERY placeholder-bearing audit in the stage). NEVER `--amend`.
- **2.13 — Final summary.** No `-phase-N` tag (lean: NO intermediate tag). Surface landing path, 14-gate table, D1–D13 verdicts, D5 IC-15 disposition, next-sub-phase recommendation (the remaining Stack-D/E ports + the literal item-2.4/2.5 Stack-E Warp ports).

---

## § 5. Dispatch — operator workflow

Inherited from MPM § 5 verbatim. Identity reads "eulerian-smoke-stack-d sub-phase coordinator chat"; § 7 prompts are the dispatchable units. **Tag posture:** no `-phase-N` tag; lean no intermediate tag.

---

## § 6. Coordinator prompt

Inherits MPM § 6; identity "eulerian-smoke-stack-d sub-phase coordinator chat"; running-log:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| plan-drafting | probe + charter + landing + SHA back-fill | pending | — | — | D1–D13 routing |
| 0 | replay + tolerance carryover + BOTH-capture reverify + **Taichi-Stam-Fedkiw kernel validation incl. f64-seed + Jacobi + MacCormack (R-S1)** + MMS-consumability check + **taxonomy check (R-S5)** + two-capture wall-clock + D10 sizing input | pending | — | — | — |
| 1a | failing-tests commit (gate 3 anchor) | pending | — | — | — |
| 1b | Stack-D Taichi Stam-Fedkiw impl (gates 4–13; gate-4 MMS; TWO captures; native SyntaxWarning filter) | pending | — | — | — |
| 1c | cross-stack equivalence (TWO gate-14 verdicts) + `[overrides.eulerian-smoke]` + equivalence.md extension | pending | — | — | empirical @ 1e-4 |
| 2 | integrity + portfolio sweep (S-2.1 gate exercised) + IC-16 evidence verify + **CI corpus round-trip (S-CI1/D13)** + mutation + convergence + **D5 IC-15 disposition** + **D3 S-2.1 FOLD** + landing + SHA back-fill | pending | — | — | — |

---

## § 7. Per-stage agent prompts

All prompts share the **sub-phase standing orders** (inherited from MPM § 7 with substitutions):
- Commit slug `chore`/`feat`/`test`/`docs` + `eulerian-smoke-stack-d-stage<N><a|b|c>-<scope>` (non-phase form; § C.1).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/`, `tools/testkit/{determinism, capture, equivalence, code_verification}/`.
- Audit front-matter both `head_sha:` AND `head_sha_at_checkpoint:` (§ B.3).
- Convention #8 — never assert from memory; grep/verify every path / signature / sha256 / spec section. Use the canonical Appendix D.6 gate numbering (§ 1.4.3).
- Convention A — additive edits to pre-existing files only; new files first. Never edit Phase-1-sealed `packages/eulerian-smoke/` or any prior audit chain.
- Convention #12 — never `--amend`; SHA back-fill at EVERY stage close; enumerate EVERY placeholder-bearing audit.
- Commit-first-then-sha256 for text artifacts.
- **Cat-4 grammar:** `path:line` citations in audits MUST use a FULL repo-relative path that resolves at HEAD (a bare `file.py:NNN` HARD_FAILs the `cat4-path-line-assertions` hook — plan-drafting lesson; § 1.5). Prefer function-name references.
- `verify_evidence` resolves LFS content OIDs (IC-16); use `sha256:HEX` prefix form.
- Empty-file rejection (Taichi-integration N6): pytest-subpackage `__init__.py` files start with `"""` docstring.
- Hard Rule 2 — STOP and surface on structural wrongness (Taichi-DSL cannot express the Stam-Fedkiw pipeline deterministically at single-thread; f64-seeded result diverges from the reference at a scale threatening 1e-4; either gate-14 exceeds 1e-4; a reference capture sha256 drifts; the Phase-1 smoke characterization surfaces something other than the collocated Stam-Fedkiw pipeline per probe § 5).

### § 7.1 Stage 0 — Pre-flight

```
You are the eulerian-smoke-stack-d sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-eulerian-smoke-stack-d.md (this charter — source of truth). § 7 standing orders.
  2. docs/conventions/sub-phase-conventions.md (sha256 4ac8341a6cda45016c4e157823a3b5d2b2bd92d185ad367e1a7143c8ec037e0b — verify at HEAD).
  3. docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/plan-drafting-probe-2026-05-24T16-30-00Z.md (probe — Phase-1 S6 baseline + Convention C/D API + believed-state + banked sweep + R-S* + IC-15 #5 assessment + D1-D13).
  4. docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/landing-2026-05-24T04-15-37Z.md (the closest structural exemplar — MMS-bearing gate-4 + TWO captures + f64-seed playbook + D-routing).
  5. docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/landing-2026-05-24T13-45-00Z.md (the most-recent cross-stack landing; § 5.1 PRESENT-but-NOT-EXERCISED + § 5.3 S6 patterns).
  6. docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md (the Phase-1 reference baseline; gate-4 MMS; TWO captures; mutation kill rates).
  7. docs/sim-specs/volumetric-grid/eulerian-smoke/{spec-ref,algebraic,determinism,equivalence}.md.
  8. packages/eulerian-smoke/eulerian_smoke/{sim.py, reference/stable_fluids.py, invariants.py} (the NumPy reference to port — algorithm + determinism docstring + the collocated Stam-Fedkiw pipeline + MacCormack-2D/plain-SL-3D split + eps=0 vorticity dead path + fixed-20-sweep Jacobi).
  9. common/common-py/src/common_py/determinism.py (IC-11 set_taichi_deterministic) + tools/testkit/taichi_harness/ + a Taichi smoke exemplar.
  10. tools/testkit/equivalence/{harness.py, tolerance.toml, tolerance-budget.toml}.
  11. tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/ (gate-4 MMS — read-only; shared with LBM).

Stage 0 is pre-flight only; you do NOT implement the port (Stage 1).

Execute Tasks 0.0 → 0.7 → closing per charter § 4.1 exactly. LOAD-BEARING: Task 0.3 (empirical Taichi-DSL Stam-Fedkiw kernel validation — the f64-accumulator-seed derisk: which kernels carry in-kernel reductions; bare-0.0-f32 vs ti.f64(0.0); does the f64-seeded MacCormack + fixed-20-sweep Jacobi reproduce the reference deterministically? if not, STOP and surface) and Task 0.5 (R-S5 empirical compare_captures taxonomy-resolution against a synthetic volumetric-grid manifest).

Out of scope: any Stage 1 implementation; any edit outside tolerance-budget.toml + new audit files + Stage-0 throwaway smoke-tier scratch; any edit to packages/eulerian-smoke/ (Phase-1-sealed).

Stuck → conventions doc § 9 + charter § 9. Hard Rule 2 applies.
```

### § 7.2 Stage 1a — Failing-tests commit

```
You are the eulerian-smoke-stack-d sub-phase Claude Code agent, Stage 1a (failing-tests commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-eulerian-smoke-stack-d.md §§ 2 (deliverables), 4.2.1 (Stage 1a sequence), 7 (standing orders).
  2. docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-checkpoint-<UTC>.md.
  3. packages/eulerian-smoke/tests/*.py (the Phase-1 reference test surface — mirror its shape; gate-4 is MMS-only [test_mms_convergence.py]; NO golden; USE the canonical Appendix D.6 gate numbering).
  4. docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md §§ 6 (MMS + PBT invariants), 8 (determinism), 10 (diagnostics).
  5. packages/lattice-boltzmann-d3q19-stack-d/tests/ (the cross-stack-port test-surface template — MMS arm + TWO-verdict cross-stack-equivalence shape).

Scope — charter § 4.2.1: create the test surface at packages/eulerian-smoke-stack-d/tests/ importing eulerian_smoke_stack_d.{reference,sim,invariants}; verify clean ModuleNotFoundError; capture + sha256 the committed evidence blob (commit-first-then-sha256); commit per § 4.2.1.

Closing — stage-1a-checkpoint-<UTC>.md; SHA back-fill. Stop.

Out of scope: implementation (1b); equivalence (1c); any edit outside the new tests/ + failing-tests-evidence + audit files.
Hard Rule 2 applies.
```

### § 7.3 Stage 1b — Implementation commit

```
You are the eulerian-smoke-stack-d sub-phase Claude Code agent, Stage 1b (implementation commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-eulerian-smoke-stack-d.md §§ 1.4 (posture; esp. 1.4.1 determinism + 1.4.4 iterative-solver), 2 (deliverables), 3 (ICs), 4.2.2 (Stage 1b 13-step), 7, 9 (R-S playbook).
  2. docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/{stage-0,stage-1a}-checkpoint-<UTC>.md (the Stage-0 f64-seed finding is load-bearing).
  3. packages/eulerian-smoke/eulerian_smoke/{reference/stable_fluids.py, sim.py, invariants.py} (the NumPy reference; port to Taichi-DSL preserving algorithm + lex vertex order + periodic mod-wrap + fixed-20-sweep Jacobi + MacCormack-2D/plain-SL-3D + eps=0 vorticity path; collocated cell-centered).
  4. docs/common/taichi.md (IC-12; init form, arch=cpu, no -> None) + a common-py Taichi exemplar.
  5. common/common-py/src/common_py/determinism.py (IC-11) + tools/testkit/capture/ (IC-2 CaptureManifest/StepState/write_capture).
  6. tools/testkit/determinism/harness.py (IC-14; gate-10).
  7. tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/ (gate-4 MMS; read-only).
  8. packages/lattice-boltzmann-d3q19-stack-d/ + packages/mpm-multimaterial-stack-d/ (Stack-D structural exemplars: pyproject filterwarnings [+ the native ignore::SyntaxWarning:taichi.*], sim.py runner shape, capture.write_capture usage, f64-pin + ti.f64(0.0) accumulator seeds per LBM § 4.1).

Determinism-strategy declaration FIRST (charter § 1.4.1 + § F.1): f64-pin with explicit ti.f64(0.0) accumulator seeds (Stage-0 finding); fixed-20-sweep Jacobi + its cross-stack consequence; MacCormack-2D/plain-SL-3D split; eps=0 vorticity dead path; no-atomics/no-RNG.

Scope — charter § 4.2.2 13-step (single sub-bundle commit). Gate-4 is MMS-only (no golden). TWO canonical captures (taylor-green-128cube 3D + lid-driven-cavity-128sq 2D). The new pyproject filterwarnings includes ignore::SyntaxWarning:taichi.* natively (S-2.1). (If operator routed D3=FOLD: also retrofit the 4 prior ports' filterwarnings — 4 single-line edits.)

Closing — stage-1b-checkpoint-<UTC>.md (gates 4-13 GREEN; gate-14 PENDING-1c; record same-stack determinism + f64-seed finding); SHA back-fill. Stop.

Out of scope: cross-stack (1c); landing (2); modification of packages/eulerian-smoke/ (append-only).
Hard Rule 2 — STOP on Taichi 1.7.4 non-determinism at single-thread; f64-seeded divergence threatening 1e-4; MMS OOA failure; canonical descriptor unreachable; non-Stam-Fedkiw surprise.
```

### § 7.4 Stage 1c — Cross-stack equivalence + landing-prep

```
You are the eulerian-smoke-stack-d sub-phase Claude Code agent, Stage 1c (cross-stack equivalence) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-eulerian-smoke-stack-d.md §§ 1.4.2 (cross-stack posture), 1.4.4 (iterative-solver aspect #5), 2 (gate 14), 4.2.3 (Stage 1c 7-step), 7, 9 (R-S1).
  2. docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1b-checkpoint-<UTC>.md (both Stack-D capture shas + f64-seed posture).
  3. tools/testkit/equivalence/{harness.py, tolerance.toml, tolerance-budget.toml}.
  4. docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md + docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md (the IC-15 section authoring templates).
  5. docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md (the PRE-EXISTING Phase-1 stub — EXTEND additively, preserve existing tables, Convention A).
  6. docs/conventions/cross-stack-equivalence-methodology.md (IC-15 partial — 5 codified + § 4 LBM + § 5 MPM to instantiate).
  7. docs/architecture.md § 2.6 (tolerance table) + § 3.6.

Scope — charter § 4.2.3. MANDATORY first step: add [overrides.eulerian-smoke] category="smoke" (KeyError on sim.category="volumetric-grid" without it). Run BOTH gate-14 diffs (3D Taylor-Green + 2D lid-driven) NumPy-ref ↔ Stack-D; emit per-field per-frame witness + step-horizon analysis REGARDLESS of pass/fail.

Gate-14 is EMPIRICAL at 1e-4 (more headroom than LBM's 1e-5). Expected flat FP-round-off (fixed Jacobi sweep count → no iteration-count divergence). If either within_tolerance==False at 1e-4: document the field+step of exceedance; STOP and surface per Hard Rule 2 BEFORE Stage 2. Do NOT silently widen (spec § 2.6 + § L). Do NOT pre-commit a shorter horizon.

Closing — stage-1c-checkpoint-<UTC>.md (14-row gate table + both gate-14 witnesses + step-horizon); SHA back-fill. Stop.
Hard Rule 2 applies.
```

### § 7.5 Stage 2 — Landing

```
You are the eulerian-smoke-stack-d sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-eulerian-smoke-stack-d.md §§ 4.3 (Stage 2 13-step), 7, 11 (coherence + D1-D13 routings as decided by operator — especially D5 IC-15 disposition + D3 S-2.1 FOLD + D10 corpus sizing + D13 CI-red).
  2. docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/{stage-0,stage-1a,stage-1b,stage-1c}-checkpoint-<UTC>.md.
  3. docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/landing-2026-05-24T13-45-00Z.md (Stage 2 template; § 9 shifts; § 11 banked-items + D5 additive-amendment landing precedent).
  4. docs/conventions/cross-stack-equivalence-methodology.md (the IC-15 partial doc to additively amend per D5 routing).

Execute Steps 2.1 → 2.13 per charter § 4.3. IC-16: evidence-path verification resolves the .h5 LFS content OID automatically. S-CI1/D13: verify the schema-corpus round-trip in CI (via gh) where the CI-red LFS-bandwidth condition permits; else document local-verification-only posture explicitly.

D5 (most consequential): per the Stage-1c gate-14 empirical margin, additively amend the IC-15 methodology doc — lean (b) REFINEMENT (validated fifth physics family [volumetric-grid] + deferred aspect #5 [iterative-solver FP-accumulation, fixed-cap form] data; reuse § 5.1 PRESENT-but-NOT-EXERCISED for vorticity; extend § 5.3 S6; keep #1/#3 deferred), OR (d) substantive expansion if gate-14 surprised, OR (a) full (premature), OR (c) hold unchanged. Additive only (Convention A). D3: if routed FOLD, land the 4-port filterwarnings retrofit (+ the native filter already in the new port); the portfolio sweep (§ B.7) is the cold-.pyc gate. D7: manifest-equality fan-out DEFER (testing-improvements scope).

Acceptance: gates 1-13 GREEN; BOTH gate-14 verdicts landed with full witness (a routed within_tolerance==False is a legitimate landing state); portfolio sweep GREEN; CI corpus round-trip GREEN where LFS-bandwidth permits (else local-only documented — D13); integrity sweep clean (streak may break — informational); evidence verify clean; append-only clean; mutation artifact (PATH-B lean); D3/D5 dispositions landed; landing audit + SHA back-fill.

If Stage 2 surfaces a CONFIRMED-blocking regression, STOP and SURFACE per Hard Rule 2.
Stuck → conventions doc § 9 + charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits § A.3 + § A.4 + § B.2. Stage 0 / 1a / 1b / 1c each ship a checkpoint; Stage 2 the landing audit. All five closes followed by Convention #12 SHA back-fill (enumerate EVERY placeholder-bearing audit per audit-chain-correctness N1). Commit-first-then-sha256 for every text artifact. The current remote CI-red (LFS download-bandwidth-quota exceeded) is a known-banked condition (D13) — it does NOT affect local verification / replay (all 21 LFS objects present locally); Stage 2's CI round-trip (S-CI1) documents local-verification-only posture if the quota blocks the CI smudge.

---

## § 9. Risk surface + problem-solving playbook

Inherits conventions doc § 9 playbook (P1–P27) + RD-2D/sph/LBM/MPM R-class framing + Taichi-integration R-T1–R-T5. **NEW R-class entries SPECIFIC to this sub-phase** (probe § 5):

- **R-S1 — Iterative-solver FP-accumulation at the Jacobi pressure-projection (the first pair exercising deferred IC-15 aspect #5).** The Stam-Fedkiw Jacobi runs a fixed `n_jacobi=20` sweeps per step over both canonical captures + the gate-4 MMS. The cross-stack delta is FP-accumulation over fixed sweeps (the sweep COUNT is identical across stacks — no convergence-check early-stop, the P24 pattern — so NOT iteration-count divergence). *Mitigation:* f64 throughout with explicit `ti.f64(0.0)` accumulator seeds (LBM § 4.1; banked #7); Stage-0 Task 0.3 characterizes the in-kernel-reduction surface empirically; Stage-1c explicit per-field + per-step diff witness regardless of pass/fail; operator routing if either gate-14 approaches/exceeds 1e-4 (tolerance amendment per spec § 2.6 + budget; OR step-horizon override). Do NOT silently widen.
- **R-S2 — MacCormack advection at COLLOCATED cell-centered velocities (premise corrected).** MacCormack is 2D-only (lid-driven velocity + gate-4 MMS); the canonical 3D uses plain trilinear SL; there are NO face-centered/MAC-staggered velocities (deferred to Stack-C). *Mitigation:* port the predictor-corrector (`φ̂=SL(+dt)`; `φ̌=SL(φ̂,−dt)`; `φ^{n+1}=φ̂+(φⁿ−φ̌)/2`) + lex vertex ordering exactly; NO monotonicity limiter (the reference omits it); periodic mod-wrap (NOT clip).
- **R-S3 — Vorticity confinement PRESENT-but-NOT-EXERCISED (methodology § 5.1).** `canonical_params_3d()` sets `vorticity_eps=0.0`; `_vorticity_confinement_3d` early-returns zeros when `eps==0`. *Mitigation:* the Stack-D port implements the code path (fidelity + gate-6 `check_circulation` advisory) but gate-14 does not exercise it; document via the § 5.1 pattern.
- **R-S4 — S6 (canonical trajectory vs spec dynamics).** Spec/algebraic describe the full Stam-Fedkiw pipeline; the canonicals exercise a subset (plain-SL-3D; MacCormack-2D; vorticity OFF; collocated grid; laminar regimes; fixed-cap Jacobi). The "spec describes more than implementation does" two-instance pattern (banked #13 / § 5.3). *Mitigation:* Stage 0/1 re-read both modules at HEAD; do NOT extrapolate from siblings.
- **R-S5 — Atomic-scatter NOT APPLICABLE.** Pure per-cell stencil/SL gather → `ti.ndrange` kernels; `determinism.atomic_ops=False`; no `np.add.at`/`ti.atomic_add`. *Mitigation:* none needed; `cpu_max_num_threads=1` pinned anyway.
- **R-S6 — S6 load-bearing (fifth-pair calibration).** The Phase-1 smoke characterization (probe § 5/§ 7) IS the empirical anchor; re-read at HEAD; smoke has TWO captures + MMS-only gate-4 + a dead vorticity path + a collocated grid.
- **R-S7 — gate-4 MMS arm (inline vs generalize; B-6).** MMS-only (no golden); inline the convergence study (LBM Stack-D + Phase-1 smoke precedent); the MMS-runner generalization STAYS BANKED.
- **R-S8 — two-capture wall-clock (Stage-0 Task 0.4/0.6).** 3D 691.587 s + 2D 5.099 s (Phase-1 NumPy). Taichi-CPU serialised single-thread may be slower/faster; § N.5 over-shoot (NumPy-vectorized); diagnostic tier keeps gate-10 fast.

### § 9.1 Playbook note (P27-analog inheritance)

RD-2D/sph/LBM/MPM P27 (cross-stack content-equivalent diff debugging) is inherited with smoke-specific cause ordering for gate-14 exceedance: (1) different IC across stacks — assert step-0 bit-identical first (the analytic Taylor-Green / lid-driven ICs must produce identical fields; if not, the Taichi `meshgrid`/`sin`/`cos`/`tanh` evaluation order or f32-vs-f64 IC build differs — a bug, not round-off); (2) **Jacobi-sweep FP-accumulation (R-S1; the primary suspect)** — bare-`0.0` f32 inference in the sweep / centered-difference reductions vs `ti.f64(0.0)`; sweep order; (3) MacCormack predictor-corrector term order (2D); (4) trilinear/bilinear gather vertex order; (5) Laplacian-diffuse stencil order; (6) periodic mod-wrap edge handling; (7) capture-descriptor mismatch (sim name/variant/frames/dims). Debug-step: binary-search the step at which divergence first exceeds 1e-4, then per-field (`u`/`v`/`w` velocity first — the projection target; then `density`), then region (interior vs the lid-shear-layer / vortex-core cells).

---

## § 10. Audit-trail discipline

Inherits § B verbatim. Sub-phase audit dir: `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/`. All append-only per § B.1. Stage 0/1a/1b/1c checkpoints use `artifact: stage`; Stage 2 landing uses `artifact: sub-phase` (`artifact_id: sub-phase-eulerian-smoke-stack-d`). IC-16 means evidence verification resolves LFS content OIDs without §B.6 annotation. Cat-4 grammar: full-path `path:line` citations only (§ 1.5).

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

Parent audits: Phase-1 smoke landing + Taichi-integration + capture-determinism-contract + RD-2D Stack-D + sph-water Stack-D + LBM Stack-D + MPM Stack-D + audit-chain-correctness + ci-action-migration + setup-uv-v8-pin-hotfix landings (full list at the plan-drafting landing audit front-matter). The 14-gate deliverable list derives from the probe + the LBM Stack-D template + the Phase-2 14th gate, with gate-4 carrying the MMS arm ONLY (no golden) per spec-ref § 6/§ 7 and TWO canonical captures.

**Cumulative shifts entering this sub-phase: 152.** Plan-drafting closing-shift count: **158** (probe § 10: S-S1 spec-item-2.4-Stack-D-enumerated; S-S2 tolerance-1e-4; S-S3 S6-trajectory-corrections; S-S4 MMS-only-gate-4; S-S5 two-captures + IC-15-#5-first-pair; S-S6 banked dispositions D3-FOLD/D7-DEFER) — confirmed at the plan-drafting landing audit.

### § 11.2 Banked items inherited + disposition

| # | Item | Disposition at this charter close |
|---|---|---|
| 1 | **IC-15 refinement opportunity** | **OPERATIVE (D5)** — this IS the fifth cross-stack pair; first to put deferred aspect #5 (iterative-solver) in play (fixed-cap form). Lean (b) additive REFINEMENT (not (a) full) per probe § 6 (#5 fixed-cap; #1/#3 unexercised). Surfaced at § 11.5 D5. |
| 2 | **S-2.1 Stack-D taichi-`SyntaxWarning` filterwarnings gap** | **LIVE (D3)** — HEAD-confirmed across all 4 prior ports (no SyntaxWarning filter); the new smoke port includes it natively; the 4-port retrofit is the FOLD candidate (4 single-line edits; the § B.7 sweep exercises the cold-`.pyc` gap). Surfaced at § 11.5 D3. |
| 3 | **Manifest-equality fan-out** (§ J.7 methodology-precedent #14) | **DEFER (D7)** — smoke `sim.py` is the lowest-kill-rate manifest-builder (0.1707); but the #14 test landed as a representative-single-sim (LBM Phase-1), NOT a per-port fan-out (testing-improvements scope; none of the 4 ports added one). Surfaced at § 11.5 D7. |
| 4 | **LBM/MPM `sim_runner_diagnostic` bank** | **NO SMOKE FOLD PATH** — different package; smoke's own diagnostic uses an analytic Taylor-Green IC (seed-independent by construction; correct, not a defect). Out of scope. |
| 5 | **LFS-architecture / CI-red LFS-bandwidth** | **KNOWN-BANKED (D13)** — operator-routed deferral; local verification + replay unaffected (21/21 LFS objects present). Stage-2 S-CI1 documents local-only posture if the quota blocks the CI smudge. NOT fixed here. |
| 6 | MMS-runner-scaffolding generalization (§ L.2 item 6; "load-bearing for eulerian-smoke + LBM") | **STAYS BANKED** — smoke Stack-D inlines the MMS convergence study (LBM Stack-D + Phase-1 Path-Y precedent); the generalization is testkit-infra scope. (D-class confirm at Stage 0; R-S7.) |
| 7 | actionlint / check-yaml hook / supply-chain-pin (other 3 actions) | **UNCHANGED** (orthogonal tooling; forward-routable). |
| 8 | Cat 3 sibling subdirs; evaluator shims; B17 mutation completion; mid-Phase-1 capture regen | **UNCHANGED / NO-OP for smoke** (MMS-only → no golden subdir; PATH-B lean). |

### § 11.3 Outputs

After this sub-phase lands:
- **The FIFTH per-sim Stack-D port** + the **first volumetric-grid (Eulerian-fluid) cross-stack port** in the portfolio.
- **The IC-15 PARTIAL methodology's fifth validation pair** — validating the 5 codified components at a fifth physics family (volumetric-grid) AND contributing the first empirical data on deferred aspect #5 (iterative-solver FP-accumulation, in its determinism-safe fixed-cap form), at the 1e-4 category. Structural exemplar for the MMS-only + two-canonical-capture + iterative-solver cross-stack-port variant.
- **`[overrides.eulerian-smoke]`** — the fifth per-sim tolerance override; `volumetric-grid`→`smoke` mapping precedent.
- **TWO Taichi-cpu perf-ledger datapoints** at smoke scale (3D 128³ + 2D 128²).
- Whatever IC-15 disposition Stage 2 lands (D5): additive amendment ((a)/(b)/(d)) or unchanged (c).
- (If D3 FOLD) the 4 prior ports' filterwarnings retrofit + the native filter — the S-2.1 bank closed.

### § 11.4 Replay-chain non-participation + tag posture

Inherits § D.2 + § D.4. Does NOT participate in the cross-phase replay chain. **Tag posture:** no `-phase-N` tag (forbidden per § D.2). Optional non-phase point-release banked (lean: NO intermediate tag, per all spec-Phase-2 sub-phase precedents — D12).

### § 11.5 D1–D13 surface — operator-routable; NOT pre-committed

(See probe § 9 for full preview. Reproduced for charter-time routing.)

**D1 — Naming.** **Lean `sub-phase-eulerian-smoke-stack-d`** (package `packages/eulerian-smoke-stack-d/`; audit dir + commit scope to match; capture dir `captures/eulerian-smoke-stack-d/` — NB the Phase-1 reference dir is the abbreviated `captures/eulerian-smoke-ref/`). Full-name § C.1 + four-port precedent. Alternative: abbreviated `smoke-stack-d` — rejected (breaks the full-name precedent).

**D2 — Stage 1 decomposition.** Lean **1a/1b/1c** (four-port precedent). Stage 1b ships the full 2D+3D Stam-Fedkiw pipeline + TWO captures + MMS gate-4 (~1100–1500 LOC est; NumPy-vectorized → Taichi `ti.ndrange` kernels) → no further sub-split (confirm at Stage 0).

**D3 — S-2.1 Stack-D filterwarnings FOLD.** **Lean FOLD** — the new smoke port includes `ignore::SyntaxWarning:taichi.*` natively at Stage 1b; the 4 existing ports' retrofit (4 single-line `pyproject.toml` additions) folds into Stage 1b/2 since the § B.7 portfolio regression sweep exercises the cold-`.pyc` gap anyway. Alternative: STANDALONE testing-improvements sub-phase (more ceremony for 4 trivial edits) — rejected. (Plan-drafting touches nothing; this is Stage 1+ work.)

**D4 — Step-horizon.** Lean **full canonical horizons** (3D 500 steps cadence-50; 2D 1000 steps cadence-100; 11 frames each). NOT pre-committed shorter.

**D5 — IC-15 partial-vs-full formalization disposition (MOST CONSEQUENTIAL).** **Lean (b) PARTIAL HOLDS + REFINEMENT**, contingent on gate-14 GREEN at 1e-4. Rationale (probe § 6): the fifth pair validates the 5 codified components at a fifth physics family (volumetric-grid) AND adds the first empirical data on deferred aspect **#5 (iterative-solver FP-accumulation)** in its determinism-safe fixed-cap form → an additive §6 "iterative-solver FP-accumulation" subsection (analogous to LBM §4.1 + MPM §5.1), reusing the §5.1 PRESENT-but-NOT-EXERCISED pattern (vorticity confinement) + extending the §5.3 S6 two-instance pattern. BUT #1 (chaotic) stays unexercised (laminar regimes) and #5's chaotic-amplification sub-aspect is structurally absent (fixed cap) → promoting to FULL (a) is premature. Alternatives: **(d) SUBSTANTIVE EXPANSION** only if gate-14 surprised; **(c) UNCHANGED** too weak. Routed at Stage 2 on the empirical margin.

**D6 — Per-sim tolerance.toml override.** **MANDATORY** (`compare_captures` raises `KeyError` on `sim.category="volumetric-grid"` without it). Lean `[overrides.eulerian-smoke] category = "smoke"` (at-budget; the FIFTH per-sim override; `volumetric-grid`→`smoke`=1e-4). Probe-verified: `[defaults.smoke]` exists at 1e-4; no override pre-exists; `[budgets.smoke.cross_stack]`=1e-4.

**D7 — Manifest-equality (methodology-precedent #14) applicability.** **Lean DEFER** — smoke builds manifests via private `_build_manifest_3d`/`_build_manifest_2d` helpers (no public/inline builder), the same low-kill-rate pattern (§ J.7 smoke `sim.py`=0.1707, the portfolio floor); the strategy-(i) #14 test landed as a representative-single-sim (LBM Phase-1); NONE of the 4 Stack-D ports added one; the per-port fan-out is a testing-improvements sub-phase deliverable. Alternative: ADD a smoke manifest-equality test (strategy-(i)) — defensible but diverges from the 4-port precedent.

**D8 — Comparison-projection axis (inherited).** Almost certainly **unneeded** — smoke is position-exact-comparable per-cell; serialised single-thread → FP-round-off; no aggregate-scatter surface. Resolves with D5.

**D9 — Variant / scheme posture.** **Stam-Fedkiw stable-fluids, COLLOCATED cell-centered, periodic-BC** (HEAD-verified): plain-SL-3D + MacCormack-2D + 5pt/7pt Laplacian diffuse + fixed-20-sweep Jacobi project + Fedkiw vorticity confinement (eps=0, OFF) + centered-difference curl. NO MAC-staggered / face-centered velocities (Stack-C deferred); NO flow-map family (Phase 4). Cross-stack surface = Jacobi FP-accumulation (R-S1) + MacCormack/centered-difference (R-S2). The smoke analog of LBM's/MPM's D9.

**D10 — Schema-corpus entry sizing + LFS routing.** `.gitattributes` auto-routes through LFS; CI `lfs:true` configured. The 3D capture is ~704 MB; the 2D is 4.2 MB. **Lean: surface to operator** — (i) the small 2D capture (~4.2 MB) to the corpus (methodology § 5.4 representative-subset; lightest), OR (ii) the diagnostic-tier 3D capture, OR (iii) the canonical 3D (~704 MB; LBM/MPM precedent). Verify corpus round-trip in CI (via `gh`) before Stage-2 GREEN where the CI-red LFS-bandwidth condition permits (S-CI1 / D13). Resolves at the plan-drafting landing / Stage 1c.

**D11 (NEW) — IC-15 stress-test posture.** **Lean continue with current canonicals + note the limitation** (probe § 6): #1 chaotic unexercised (Taylor-Green decaying vortex + lid-driven Re=100 are laminar); #5 exercised in determinism-safe fixed-cap form. Alternative: augment with a high-Re/turbulent capture variant (stresses #1; out-of-scope cost; rejected per § P.2 "existing committed captures stay as committed").

**D12 (NEW) — Optional non-phase point-release tag.** **Lean NO** (consistent with all spec-Phase-2 sub-phase precedent; § D.2 forbids `-phase-N`).

**D13 (NEW) — Current CI-red LFS-bandwidth acknowledgment.** **Lean record as known-banked; no action** — local verification + replay unaffected (21/21 LFS objects present); Stage-2 landing audits document local-verification-only posture for any CI round-trip blocked by the bandwidth quota. The LFS-architecture fix is an operator-routed deferral (§ 11.2 item 5), NOT this sub-phase's.

**Operator decisions on D1–D13 are recorded in the plan-drafting landing audit + cited back at each Stage's dispatch prompt as the routing context.**

---

## § 12. Sub-phase scope vocabulary

Per § C.1: `<eulerian-smoke-stack-d-stage<N><a|b|c>-<scope>>` for Stage 0/1a/1b/1c/2 commits; `<eulerian-smoke-stack-d-plan-drafting-<scope>>` for plan-drafting commits; SHA back-fill commits use `-sha-backfill` suffix per § B.2.

---

*End of charter. Stage 0 is dispatchable in a fresh Claude Code session against this plan after operator routing of § 11.5 (D1–D13).*

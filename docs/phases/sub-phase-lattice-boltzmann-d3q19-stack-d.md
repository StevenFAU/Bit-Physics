# lattice-boltzmann-d3q19 → Stack-D Port — Sub-Phase Charter (THIRD spec-Phase-2 cross-stack port)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — **THIRD per-sim cross-stack port sub-phase under spec-Phase-2** (following `reaction-diffusion-2d` Stack-D at SHA `7747d68`, then `sph-water` Stack-D at landing `f82d1c7` / back-fill `b8b9bca`). Ports `lattice-boltzmann-d3q19` from its Phase-1 implemented reference (Python NumPy; `stack.name="numpy-reference"`; spec-designated Stack-C Vulkan primary is unimplemented) to Stack-D (Python / Taichi-DSL / CPU), consuming Taichi-integration (IC-11/12) + capture-determinism-contract (IC-13/14) + audit-chain-correctness (IC-16) deliverables, against the sph-water Stack-D structural template.
> **Sub-phase identity:** THIRD spec-Phase-2 cross-stack port. The **THIRD validation pair for the IC-15 PARTIAL-formalization methodology** (`docs/conventions/cross-stack-equivalence-methodology.md`) and the **first cross-stack pair to exercise the collision-step FP-accumulation surface** that the two prior algebraically-trivial pairs did not. NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries. No `-phase-N` tag proposed.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (sha256 `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` — verified at HEAD per probe § 0) §§ 2.5 (IC-13 content-equivalent contract), 2.6 (cross-stack tolerance table — **`lbm` category default `relative = 1e-5`**, "epsilon (1e-5 rel)"; 10× tighter than the `reaction-diffusion`/`sph` 1e-4 the prior pairs ran at), 2.7 (capture format + canonical descriptor), 3.5 + Appendix **D.6** (per-sim 13 acceptance gates + phase-2 14th gate = cross-stack equivalence), D.7 (lattice Tier-2 substack = `vector_field` on macroscopic moments), 3.6 (Layer 5 per-replication), 5.7 (lattice / LBM; Stack-C primary), 7.5 + Appendix G.7 (IC-16 citations), **11.3 item 2.5** ("LBM to Stack D and Stack E"; work item **2.5.D**), Appendix D § D.2.3 (canonical descriptors).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` — verified at HEAD per probe § 0). § B.6 3-mode determinism contract; § C.1 cross-stack-port commit-scope naming; § B.7 sweep-template addendum; § A.2 / § F.3 amended at capture-determinism-contract. Inherits role model (§ A.3), three-stage cadence (§ A.2), append-only discipline (§ B), Convention #12 SHA back-fill (§ B.2 tightened + audit-chain-correctness Stage-1b N1 enumerate-all-placeholders), commit-message convention (§ C), replay-chain non-participation (§ D.4), gate-13 worktree pattern (§ E), determinism convention (§ F), R-class STOP-AND-SURFACE (§ K), capture cadence routing (§ P).
> **IC-15 reference document (consumed AS-IS):** `docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `326fd94f6ddcbc084d9a9e3005b3cb88ca01948cd3543d68e65f684a630c6bc6` — verified at HEAD). PARTIAL formalization: 5 codified components + 5 deferred aspects. This sub-phase is the THIRD pair the doc names as "the methodology's full stress test and the full-formalization opportunity" — but the probe (§ 1.4.2) shows the LBM regime exercises only deferred aspect #4 (collision-step FP-accumulation, partial), not #1/#3/#5.
> **Structural inheritance template:** `docs/phases/sub-phase-sph-water-stack-d.md` (the most recent per-sim cross-stack port; closest analog — same NumPy-reference source-stack, same extend-pre-existing-equivalence.md stub, same gate-14-against-CPU-reference shape). This charter inherits its § 1–§ 12 structure with **LBM deltas explicit** (gate-4 carries BOTH golden + MMS arms; TWO canonical captures; tighter 1e-5 category; lattice/collision-step FP-accumulation in place of DFSPH iterative-solver/neighbour-accumulation).
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Phase-1 `lattice-boltzmann-d3q19` landed at `215983fd` (back-fill `4f79e19`; verdict CONFIRMED); NumPy reference + TWO canonical captures (poiseuille + couette) + gate-4a equilibrium golden + gate-4b NS-2D MMS (OOA 2.39) + 2 PBT invariants + Tier-2 vector_field diagnostics.
> - Taichi-integration landed at `cf7d553`; Stack-D infra (common-py workspace member + Taichi `>=1.7,<2.0` + `set_taichi_deterministic` + `docs/common/taichi.md` + `tools/testkit/taichi_harness/`) shipped as IC-11 + IC-12.
> - Capture-determinism-contract landed (`9bf5b68` + back-fill `c4be56b`); IC-13 (spec § 2.5) + IC-14 (`run_twice_and_diff`) first-class.
> - RD-2D Stack-D landed at `7747d68` (SHIFTED; 14 gates GREEN; gate-14 `max_abs_err ~1.9e-14` ~10 orders margin; R-P2 falsified, NOT auto-inherited); IC-15 candidate established; first per-sim Stack-D port.
> - sph-water Stack-D landed (landing `f82d1c7` / back-fill `b8b9bca` = HEAD; SHIFTED-with-N1; 14 gates GREEN; gate-14 density `max_rel_err 1.585292e-15` ~11 orders margin; D5 = option (c) PARTIAL FORMALIZATION landed; S6 banked).
> - Audit-chain-correctness landed (`6b4b90a`; SHIFTED). **IC-16** (`verify_evidence` LFS-content-OID resolution) RESOLVED; §B.6 Mode-2 Option-3 annotations RETIRED.
> - Conventions doc `69aa39fc…`; architecture `e82b7b8e…`; methodology `326fd94f…`; all HEAD.
> - `[defaults.lbm]` = `relative = 1e-5, absolute = 0.0`; `[budgets.lbm.cross_stack]` = same; **no `[overrides.lattice-boltzmann-d3q19]`** at HEAD.
> - Phase-1 NumPy-reference canonical captures frozen (LFS): `captures/lbm-ref/poiseuille-64x32-seed42-step1000.{h5,json}` (h5 LFS OID `0e0843aa…e16f68`; json blob `8347922d…611b8f`) + `captures/lbm-ref/couette-32x16-seed42-step500.{h5,json}` (h5 LFS OID `7a948434…15b65b`; json blob `d9fbcafb…54c480f`).
> **Inherited shifts:** **131 documented entering this sub-phase** (FACT — sph-water Stack-D landing § 9). Carried by reference; not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/plan-drafting-probe-2026-05-24T02-30-12Z.md`. Read FIRST. Authoritative for the Phase-1 baseline (§ 1, S6 read), infrastructure (§ 2), IC-15-partial state (§ 3), tolerance.toml (§ 4), capture sha256s (§ 5), cross-stack framing + expected gate-14 shape (§ 6), Convention-M anchor-sketch (§ 7), D1–D9 surface (§ 8), D7 fold-in adjacency (§ 9), and 5 plan-drafting shifts (§ 10, S-P1..S-P5).
> **Date drafted:** 2026-05-24.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D9 routing (§ 11.5).

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase IS

The **THIRD per-sim cross-stack port sub-phase under spec-Phase-2**. Takes the Phase-1-frozen `lattice-boltzmann-d3q19` reference (Python NumPy; the implemented `stack.name="numpy-reference"`) and produces a content-equivalent Stack-D (Python / Taichi-DSL / CPU) port through gates 4–14 of spec § 3.5 / Appendix D.6 (13 stack-agnostic correctness gates + the Phase-2 14th gate of cross-stack equivalence).

It is the **THIRD validation pair for the IC-15 PARTIAL-formalization methodology** and the **first cross-stack pair to exercise the collision-step FP-accumulation surface**. The Phase-1 LBM trajectory (probe § 1.2 S6 read) invokes genuine per-step FP arithmetic — per-cell 19-term moment reductions (`density_field`/`momentum_field`), the equilibrium polynomial (`feq_field`), and Guo body-forcing — unlike RD-2D's single-pass explicit stencil or sph-water's discarded-side-effect rigid-free-fall. **But the dynamical regime is algebraically-identical-trajectory, single-pass explicit, dissipative, laminar** (Poiseuille/Couette relax toward stable parabolic/linear steady states; BGK damps perturbations) — NOT chaotic, NOT iterative-solver, NOT atomic-scatter. So gate-14 is genuinely empirical at the **tighter `lbm` category default `relative = 1e-5`** (10× tighter than the prior pairs' 1e-4): it most likely passes with a SMALLER margin than the prior pairs' ~10–11 orders (probe § 6), and the actual margin is the load-bearing datum for D5.

At close the Stack-D port ships (see § 2 for the per-gate table):
1. **Stack-D Taichi implementation** at `packages/lattice-boltzmann-d3q19-stack-d/` (D1 full-name precedent per § C.1 + RD-2D + sph-water).
2. **Stack-D spec sheet** `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-d.md` (sibling to `spec-ref.md` etc.).
3. **Pre-implementation probe report** `tools/testkit/probes/reports/lattice-boltzmann-d3q19-stack-d-probe.md`.
4. **Failing-tests evidence + sha256** (gate-3 anchor; IC-8 TDD).
5. **TWO canonical Stack-D captures** matching the Phase-1 reference descriptors (D4: `poiseuille-64x32-seed42-step1000` + `couette-32x16-seed42-step500`).
6. **`equivalence.md` extension** — the Phase-1 stub at `docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md` is **extended additively** with the IC-15 methodology sections (NOT created de novo — probe § 1.3 / § 3; Convention A; the sph-water pattern).
7. **All 13 stack-agnostic gates GREEN** for the Stack-D port (gates 4–13; **gate-4 carries BOTH a golden-table arm (4a equilibrium) AND an MMS arm (4b NS-2D OOA)** — § 1.4.3).
8. **Gate-14 cross-stack equivalence verdict** — each Stack-D capture diff'd against its Phase-1 NumPy-reference capture via `compare_captures` at `relative = 1e-5` (HEAD `[defaults.lbm]`), **with explicit per-field per-frame witness + step-horizon analysis regardless of pass/fail, for BOTH captures.**
9. **`[overrides.lattice-boltzmann-d3q19]` tolerance.toml entry** (MANDATORY — `category = "lbm"`; at-budget; the THIRD per-sim override; without it `compare_captures` raises `KeyError` on `sim.category="lattice"` — probe § 4).
10. **Convergence-file edits** — CHANGELOG additive, `docs/dependencies.md` additive (NEW workspace member + Taichi-DSL consumption), `docs/perf-ledger.md` (NEW row(s)).
11. **IC-15 disposition update at Stage 2 (D5)** — partial-formalization doc additively amended (lean (b)) OR promoted to full (a) OR held unchanged (c), driven by gate-14 empirics.

### § 1.2 What this sub-phase is NOT

- A new spec-phase. No `-phase-N` tag (§ 11.4).
- A modification of the Phase-1 `lattice-boltzmann-d3q19` reference at `packages/lattice-boltzmann-d3q19/`. Phase-1-sealed code is append-only-protected per § B.1 (load-bearing for D7 — § 9 / § 11.5).
- A frontier variant (Phase 4+ MRT / differentiable-LBM / NanoVDB-sparse — spec-ref § 1 out-of-scope).
- An establishment of Stack-D infrastructure. IC-11/12/13/14/16 are consumed verbatim. No edits to `common/common-py/` or `docs/common/taichi.md` or `tools/integrity/.../verify_evidence.py`.
- A tolerance-budget widening. `[budgets.*]` rows untouched; `[overrides.lattice-boltzmann-d3q19]` is at-budget resolution wiring (§ 1.4.2), not a widening.
- An implementation of Stack-C (Vulkan). The spec-designated primary stays a Phase-2+ forward contract (spec-ref § 1 / § 5.7); this sub-phase ports the Phase-1 NumPy reference to Stack-D.
- An edit to any prior audit (append-only) or to `docs/phases/phase-2-cross-stack-replication.md` (SUPERSEDED).
- A fold-in of the LBM/MPM `sim_runner_diagnostic` defect (lean STAY BANKED per D7; § 9).
- A modification of the conventions doc, architecture, or the IC-15 methodology doc beyond verification (the IC-15 doc IS additively amended at Stage 2 if D5 routes (a)/(b)).
- Pre-committing D1–D9 (§ 11.5 surfaces for operator routing).

### § 1.3 Inputs + 131 cumulative shifts inherited

(FACT — sph-water Stack-D landing § 9 [131 cumulative]; RD-2D Stack-D landing; Phase-1 LBM landing `215983fd`.)

**Closing posture this sub-phase inherits:**
- All sim packages GREEN at portfolio scale; common-py first-class workspace member; Taichi `>=1.7,<2.0`; `set_taichi_deterministic` + `tools/testkit/taichi_harness/`.
- **131 cumulative shifts** (130 entering sph-water Stage 2 + N1 there).
- Conventions doc `69aa39fc…`; architecture `e82b7b8e…`; methodology `326fd94f…`.
- IC-13 + IC-14 first-class; IC-16 portfolio-wide gate-5 LFS-content-OID resolution.
- RD-2D + sph-water Stack-D ports as implementation + methodology templates; IC-15 PARTIAL formalization doc.
- Phase-1 LBM: D3Q19 BGK NumPy reference + TWO canonical captures + gate-4a equilibrium golden + gate-4b NS-2D MMS + 2 PBT invariants + Tier-2 vector_field diagnostics; R-LBM-1..4 risk register.

**Banked items disposition** (§ 11.2 full table): the **IC-15 full-formalization opportunity** (deferred to "the third cross-stack pair" by the partial-formalization doc) is **OPERATIVE at this sub-phase's close** (D5) — but the probe characterization tempers the lean to (b) refinement, not (a) full. The **LBM/MPM `sim_runner_diagnostic` defect** becomes live (this is the next LBM-touching sub-phase) but leans STAY BANKED (D7; § 9). The **LFS-rule observation** for `tests/fixtures/legacy-captures/` STILL BANKED (sph-water § 11). Other prior banks UNCHANGED.

### § 1.4 Sub-phase-specific posture

#### § 1.4.1 Stack-D determinism strategy under IC-13 + IC-11 + LBM-specific considerations

(FACT — IC-13 spec § 2.5; Taichi-integration arch="cpu" mandate; Phase-1 LBM determinism.md + sim.py docstring clauses 1–9.)

The Stack-D Taichi port declares its determinism posture (docstring at the top of the Stack-D `sim.py` per § F.1; cited in the Stage 1b commit footer per § C.3). **The Phase-1 reference declares `bit-exact-effort-same-stack-same-hw` (spec § 2.5; the "effort" caveat is GPU subgroup ops only) and over-achieves to clean `bit-exact-same-stack-same-hw`.** The Stack-D port targets the same clean `bit-exact-same-hw` at `arch="cpu"`:
- `set_taichi_deterministic(Config(seed=42, deterministic=True), arch="cpu")` invoked BEFORE any `@ti.kernel` decoration (R-P3 / R-T1); pins `cpu_max_num_threads=1`, `offline_cache`.
- **f64 throughout** (the reference is f64; Stack-D uses f64-typed `ti.types.ndarray` / fields per the sph-water Stage-0 banked f64-pin requirement; no `default_fp` IC-11 edit).
- **Collision-step moments are per-cell LOCAL 19-term reductions, NOT global reductions and NOT atomic scatter.** Implement as a per-cell kernel with a fixed-order `for i in ti.static(range(19))` accumulation over the lex-ordered velocity set. Same-stack this is bit-exact (fixed order, single thread); the cross-stack delta vs NumPy arises from NumPy's `.sum(axis=0)`/`einsum` accumulation order differing from the Taichi sequential 19-term loop (R-L1).
- **Streaming is an integer-offset per-direction memory shuffle** (the np.roll analog). Integer velocity components `{-1,0,1}` → streaming is bit-exact across backends (R-L3); implement as explicit per-direction shifted indexing with periodic wraparound; no in-kernel reductions.
- **No `ti.atomic_add`** anywhere (streaming gathers from neighbours; `determinism.atomic_ops = False`) — the LBM kernel has no scatter surface, so it does NOT hit the spec § 2.5 epsilon-class atomic-scatter concern.
- **No global RNG.** LBM ICs are analytic rest-state (`ρ=1, u=0`); the `seed` is recorded-only (probe § 9). The diagnostic runner accepts `seed` for SimRunner-Protocol contract conformance but determinism is seed-independent — documented in the determinism docstring + spec-ref-stack-d § 8.
- Phase 2+ deferred: GPU arch determinism; FMA fusion; subgroup-collectives (the "effort" caveat surface, informational per § F.4).

The same-stack contract (gate-10) is verified by IC-14 `run_twice_and_diff` over the parsed Capture projection at the diagnostic tier.

#### § 1.4.2 Cross-stack equivalence posture (gate 14) — IC-15 PARTIAL methodology's THIRD validation pair

(FACT — Appendix D.6 gate 14; spec § 2.6 + § 3.6; sph-water `equivalence.md` § 7; probe § 6.)

Gate 14 is the load-bearing cross-stack equivalence test: each Stack-D Taichi capture (RIGHT) is diff'd against the **Phase-1 NumPy-reference capture (LEFT)** via `compare_captures` at `relative = 1e-5, absolute = 0.0` (HEAD `[defaults.lbm]`). Acceptance: `within_tolerance == True` across every captured frame and every state field (`rho`, `u`), **for BOTH the poiseuille (primary) and couette (secondary) descriptors.**

> **The cross-stack partner is the NumPy reference, not a GPU stack** (probe § 1.1) — the sph-water pattern, NOT RD-2D's. The relevant relation is reference-CPU (NumPy) ↔ Taichi-CPU: a different arithmetic backend with a different per-cell 19-term reduction-accumulation order.

**This is the IC-15 PARTIAL methodology's THIRD validation pair.** Per probe § 3, the LBM regime exercises only deferred aspect **#4 (collision-step FP-accumulation, partial — integer streaming is trivially bit-exact; the moment+equilibrium+Guo arithmetic is the live surface)**; aspects **#1 (chaotic), #3 (atomic-scatter), #5 (iterative-solver) remain unexercised** (the laminar/dissipative/single-pass regime forbids them). So:
- The diff is genuinely empirical at 1e-5, with LESS headroom than the prior pairs (probe § 6 expected band ~1e-13 … 1e-9; could approach 1e-6 if the 19-term reorder + 1000-step accumulation is larger).
- The Stage 1c regime: run the diff at the full canonical step-horizon for BOTH captures (D4); emit the per-field per-frame `max_abs_err`/`max_rel_err` witness verbatim **regardless of pass/fail**; perform explicit step-horizon analysis; **do NOT silently widen tolerance** (a widening requires a separate operator-approved commit + budget amendment per spec § 2.6 + § L; the 1e-5 cap makes any widening conspicuous). If gate-14 exceeds 1e-5, surface to operator per Hard Rule 2 BEFORE Stage 2 (R-L1 routing: step at which divergence first exceeds; per-field binary search; then tolerance-amendment / step-horizon-override / comparison-projection per D8 / implementation-debug per P27-analog).

**Tolerance resolution (D6 — MANDATORY):** `sim.category = "lattice"` (physics-family) has no `[defaults.lattice]` row; `compare_captures` raises `KeyError` until Stage 1c adds `[overrides.lattice-boltzmann-d3q19] category = "lbm"` (mapping to `[defaults.lbm]` = `1e-5`). **At-budget resolution wiring** (equals `[budgets.lbm.cross_stack]`), not a widening — the RD-2D `[overrides.reaction-diffusion-2d]` + sph-water `[overrides.sph-water]` precedent (probe § 4).

#### § 1.4.3 Code-verification posture (gate 4) — BOTH golden-table AND MMS

(FACT — spec-ref § 6.1; Phase-1 landing; probe § 1.3.)

**This is the single largest gate-level delta from the sph-water Stack-D template, in the OPPOSITE direction.** sph-water had golden-table-only (no MMS); RD-2D had MMS-only. **LBM carries BOTH arms at gate-4** — the first cross-stack-port sim to do so. The Stack-D port re-verifies both:
- **Gate-4a — D3Q19 equilibrium golden** (`tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`; `abs = 1e-15`): the port's `feq` reproduces all 19 `f_i^eq` values + the density/momentum moments at the fixture point. The trajectory uses the field form (`feq_field`) of this same equilibrium.
- **Gate-4b — NS-2D MMS** (`tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`; shared byte-identical with eulerian-smoke): forced Taylor-Green incompressible-NS, ladder N∈{32,64,128}, observed OOA within ±0.5 of formal p=2 (Phase-1 reference: 2.39). Exercises the Taichi `bgk_step` + Guo forcing in fully-periodic mode — the same collision+streaming kernel the Poiseuille trajectory uses. R-LBM-1/R-LBM-2 (init-transient + Guo O(dt²) sub-leading → non-monotonic ladder ratios) are inherited; the log-log slope across the full ladder is what gates.

The Stack-D port consumes both fixtures read-only (no new golden table; the shared MMS solution is consumed, not modified — Convention A; the MMS-runner-generalization banked item stays inline per Phase-1 landing). **No `_SUBDIRS_PICKED_UP` change** (the `lattice` golden subdir is already picked up per Phase-1 Stage 2).

> **Gate-numbering note (FACT — avoid Stage-1 confusion):** the Phase-1 LBM test docstrings use a +1-offset internal numbering ("gate 5" = code-verification, "gate 12" = PBT). This charter uses the **canonical Appendix D.6 numbering**: gate **4** = code-verification (4a golden + 4b MMS), gate 5 = Tier 1, gate 6 = Tier 2 (`vector_field` on macroscopic moments per D.7), gate 11 = PBT, gate 12 = perf, gate 13 = replay, gate 14 = cross-stack. Match the canonical numbering in all Stack-D artifacts.

#### § 1.4.4 Lattice-velocity quantization risk (deferred IC-15 aspect #4)

(FACT — IC-15 methodology doc § 2 item 4; probe § 3 / § 6 / D9.)

The IC-15 partial-formalization doc explicitly defers "lattice-velocity quantization handling — LBM-specific; surfaces if an LBM Stack-D port is the third pair." This sub-phase IS that pair. The probe (§ 6, D9) narrows the concern: the D3Q19 **integer velocity set `{-1,0,1}` makes streaming quantization bit-exact across backends** (the velocity discretization itself is NOT the cross-stack surface); the live surface is the **collision-step per-cell 19-term FP-accumulation** (moments + equilibrium polynomial + Guo forcing) whose round-off is reduction-order-sensitive (NumPy vs Taichi). Gate-14 yields the FIRST empirical data on this aspect, at the tighter 1e-5 category. This is the empirical contribution this pair makes to IC-15 (D5).

#### § 1.4.5 Phase-1 R-class inheritance

(FACT — Phase-1 landing R-LBM-1..4; probe § 1.5.)

- **R-LBM-3 (Ma-bound)** + **R-LBM-4 (velocity-direction order)** inherited verbatim: the Stack-D port reuses the lex-ordered 19-direction `C` set (R-LBM-4 mitigation) and asserts `Ma_lat < 0.1` at sim-init + in the MMS runner (R-LBM-3).
- **R-LBM-1 (init-transient)** + **R-LBM-2 (Guo O(dt²))** matter only for the gate-4b MMS re-run: the port must reproduce OOA within ±0.5 of p=2; the Phase-1 ladder is non-monotonic (1.39×, 19.7× ratios) but the full-ladder slope passes at 2.39.
- The **1 GB pre-commit ceiling (W1)** applies to the Stack-D poiseuille capture (~202 MB — well under; LFS-tracked).

#### § 1.4.6 Taichi-specific risk acknowledgments inherited

(FACT — Taichi-integration § 9 R-T1..R-T5 verbatim.)
- **R-T1 (field-init order):** `set_taichi_deterministic`/`ti.init` precedes every `@ti.kernel` decoration. See R-P3.
- **R-T2 (`-> None` annotations forbidden):** Taichi 1.7.4 AST transformer raises on `-> None` kernels. Omit.
- **R-T3 (Python-3.12 locale-deprecation):** filterwarnings inherited from common-py pyproject.
- **R-T4 (workspace import via uv):** `packages/lattice-boltzmann-d3q19-stack-d/` registers as workspace member; imports `from common_py.{determinism, capture} import ...`.
- **R-T5 (canonical-tier vs diagnostic-tier):** the port ships canonical-tier implementations (TWO captures); gate-10 same-stack determinism witnessed at the diagnostic tier (mirror the reference's `poiseuille-16x8-seed42-step50` 16×8×3 × 50-step diagnostic runner) to avoid paying canonical capture cost on every pytest invocation. (R-L4: LBM is RD-2D-scale, so even canonical-tier cost is seconds — but diagnostic-tier still keeps the determinism test fast.)

### § 1.5 Role model, conventions, audit discipline

Inherited from § A.3 + § B + § C verbatim. Single Claude Code agent at a time; single coordinator chat; one operator. Convention #12 SHA back-fill at every stage close per § B.2 tightened-discipline + audit-chain-correctness Stage-1b N1 (enumerate EVERY placeholder-bearing audit committed in a stage). Commit-first-then-sha256 for text artifacts.

### § 1.6 Architecture — three stages

Three-stage cadence per § A.2. Stage 1 sub-decomposes into 1a/1b/1c per D2 lean (RD-2D + sph-water precedent):
- **Stage 0 — Pre-flight.** Replay; tolerance-budget carryover; Phase-1 reference capture sha256 reverify (BOTH captures); empirical Taichi-DSL LBM kernel validation (R-L1/R-L3); golden + MMS Stack-D-consumability check; **R-S5 empirical `compare_captures` taxonomy-resolution check** against a synthetic `lattice` manifest; checkpoint + SHA back-fill.
- **Stage 1a — Failing-tests commit.** Test surface importing the yet-to-exist Stack-D modules; clean `ModuleNotFoundError`; failing-tests evidence + sha256.
- **Stage 1b — Implementation commit.** Stack-D Taichi D3Q19 BGK port (collision + streaming + Guo + bounce-back kernels); TWO canonical captures; gates 4–13 GREEN (gate-4a golden + gate-4b MMS); spec sheet; probe report; perf-ledger row(s); determinism docstring.
- **Stage 1c — Cross-stack equivalence + landing-prep.** `[overrides.lattice-boltzmann-d3q19]`; `equivalence.md` extension; gate-14 diff witness + step-horizon analysis for BOTH captures; schema-corpus entry.
- **Stage 2 — Landing.** Convergence edits; integrity sweep; portfolio-scale regression sweep (§ B.7); gate-13 worktree replay; IC-16-consuming evidence-path verification; append-only check; **D5 IC-15 disposition** (additive amendment to the methodology doc if (a)/(b)); landing audit + SHA back-fill.

Each sub-stage ships a checkpoint audit; Stage 2 the landing audit. No `-phase-N` tag (§ 11.4).

---

## § 2. Deliverables (per gate, expanded set)

The 14-gate per-port acceptance contract (Appendix D.6 + spec § 3.5). **Gate 4 carries BOTH a golden-table arm (4a) AND an MMS arm (4b)** — the key delta from the sph-water template. **Gates 9 + 14 are DOUBLED** (two canonical captures).

| # | Gate | LBM Stack-D deliverable | Acceptance |
|---|---|---|---|
| 1 | Spec sheet | `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-d.md` | 13-section template; § 5 cites Stack-D Taichi path; § 6 declares BOTH golden + MMS verification posture; § 8 declares `bit-exact-same-hw` arch=cpu (per § 1.4.1); § 9 declares cross-stack posture at `relative = 1e-5`. |
| 2 | Probe report | `tools/testkit/probes/reports/lattice-boltzmann-d3q19-stack-d-probe.md` | Enumerates common-py + Taichi API surfaces consumed; upstream citations (Qian 1992 + Krüger 2017 citation-only); public exports. |
| 3 | Failing tests + output hash | `packages/lattice-boltzmann-d3q19-stack-d/tests/` + `tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-<UTC>.txt` + sha256 footer | Failing-tests footer `Failing-tests-output(-hash)`; impl footer `Implements-failing-tests-from` + `…-witnessed`. |
| 4a | **Code verification — golden** | `tests/test_d3q19_equilibrium_golden.py` (feq + moments vs `lattice/d3q19-equilibrium.json`, `abs=1e-15`) | All 19 `f_i^eq` + density/momentum moments reproduce. |
| 4b | **Code verification — MMS** | `tests/test_mms_convergence.py` (forced-TG NS-2D on shared `incompressible_ns_2d`; ladder N∈{32,64,128}) | Observed OOA within ±0.5 of formal p=2 (Phase-1: 2.39). No new MMS solution; shared surface consumed read-only. |
| 5 | Tier 1 diagnostics | `tests/test_diagnostics.py` Tier-1 NaN/Inf + `check_health` scan | clean across captured frames at both canonical descriptors. |
| 6 | Tier 2 (`vector_field`, IC-6) | `tests/test_diagnostics.py` Tier-2 on macroscopic velocity (div + circulation; D.7 lattice→vector_field) | substack clean (advisory checks recorded per spec-ref § 10). |
| 7 | Cat 1 citations | spec-ref-stack-d.md § 2 cites Qian 1992 (DOI) + Krüger 2017 (citation-only, R8) + Stack-B/reference cross-ref | `python -m integrity --cat 1` clean. |
| 8 | Cat 2 public API | `lattice_boltzmann_d3q19_stack_d.{reference, sim, invariants}` exports match probe § 5 | `python -m integrity --cat 2` clean. |
| 9 | Canonical captures + corpus | `captures/lattice-boltzmann-d3q19-stack-d/poiseuille-64x32-seed42-step1000.{h5,json}` + `couette-32x16-seed42-step500.{h5,json}` (D4) + schema-corpus copies at `tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-d-{poiseuille,couette}.{h5,json}` | `load_capture` round-trips both; manifest payload sha256 recorded (commit-first-then-sha256; `.h5` LFS — record content OIDs). |
| 10 | Determinism (IC-13) | `tests/test_determinism.py` invokes IC-14 `run_twice_and_diff(sim_runner_diagnostic, seed=42)` | `verdict.content_equivalent == True`. Determinism docstring per § F.1; cited in footer. |
| 11 | PBT (≥ 2 invariants) | `tests/test_pbt_invariants.py` ships `equilibrium_density_moment` + `equilibrium_momentum_moment` (spec-ref § 6.6) at `n_examples ≥ 20` | Hypothesis example DB committed. |
| 12 | Perf-ledger row | Row(s) in `docs/perf-ledger.md`: `lattice-boltzmann-d3q19 \| taichi-cpu \| <descriptor> \| <s> \| <hw_id> \| <commit> \| <date> \| baseline` | Wall-clock recorded; >2× the NumPy-reference baseline (poiseuille 3.784 s; couette 0.604 s) flags to operator (R-L4 — but Taichi JIT overhead on small grids is expected; absolute cost stays seconds). |
| 13 | Failing-tests replay | `git worktree add … <stage-1a-sha>`; pytest reproduces `ModuleNotFoundError`; HEAD GREEN | structural reproduction per § E. |
| 14 (Phase-2) | Cross-stack equivalence | `compare_captures(numpy_ref, stack_d)` at `relative = 1e-5` (LEFT = NumPy reference) for BOTH captures | **Empirical** — verdict + per-field per-frame witness + step-horizon analysis documented in `equivalence.md` **regardless of pass/fail**, for poiseuille (primary) + couette (secondary). If exceeds 1e-5: STOP + surface per R-L1 (no silent widening). |

**Acceptance for "sub-phase complete":** gates 1–13 GREEN; gate-14 verdict landed with full step-horizon witness for both captures (a `within_tolerance == False` outcome that has been operator-routed per R-L1 is a legitimate landing state — the methodology validation is the deliverable, not a forced PASS); integrity sweep clean (byte-identical streak is informational — a new sim package may break it; NOT load-bearing); portfolio sweep GREEN; mutation artifact (B17 routing per § 11.5 D-adjacent); D5 IC-15 disposition landed; landing audit + SHA back-fill. No `-phase-N` tag.

---

## § 3. Interface contracts

### § 3.1 ICs consumed (existing, not redefined)

(FACT — probe § 2.)
- **IC-2** — `common_py.capture.{Writer, load_capture}` (canonical capture write + gate-14 load).
- **IC-4** — `common_py.determinism.Config` (seed + deterministic flag).
- **IC-6** — Tier-2 `vector_field` substack (gate-6; lattice macroscopic moments per D.7).
- **IC-8** — probe report § 5 is the public-API contract; gate-3 failing-tests ordering.
- **IC-9** — checkpoint + landing audits per § B.3.
- **IC-11** — `set_taichi_deterministic(config, arch="cpu")` at sim-runner entry.
- **IC-12** — `docs/common/taichi.md` rules (R-T1..R-T5).
- **IC-13** — content-equivalence contract (spec § 2.5); same-stack posture per § 1.4.1.
- **IC-14** — `run_twice_and_diff` (Python) consumed by gate-10.
- **IC-15 (PARTIAL)** — `docs/conventions/cross-stack-equivalence-methodology.md`: the 5 codified components consumed AS-IS (per-cell position-exact compare; category-default tolerance; MANDATORY per-sim override; per-frame diff witness; equivalence.md authoring). The 5 deferred aspects: only #4 exercised (partial).
- **IC-16** — `verify_evidence` LFS-content-OID resolution; gate-5 evidence verification resolves the `.h5` LFS content OIDs automatically (no §B.6 annotation).

### § 3.2 ICs produced — IC-15 formalization disposition (D5)

This sub-phase is the THIRD cross-stack pair. The IC-15 full-formalization opportunity (the partial doc names "the third pair") is operative. Whether to promote partial→full at Stage 2 is **D5** (§ 11.5) — surfaced, not pre-committed; lean (b) additive REFINEMENT given the probe characterization (only deferred aspect #4 exercised; #1/#3/#5 still open). If amended (a)/(b), subsequent cross-stack ports consume the updated `docs/conventions/cross-stack-equivalence-methodology.md` by reference; if held unchanged (c), the partial doc + per-sim `equivalence.md` pattern continue.

---

## § 4. Stage decomposition

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay** (canonical gate set against `v0.1.0-phase-1`). Bit-identity invariant match → proceed; mismatch → BLOCKED per P20; write `stage-0-blocked-replay-<UTC>.md`; surface; stop. Re-verify the pre-condition anchors (conventions `69aa39fc…`, architecture `e82b7b8e…`, methodology `326fd94f…`, HEAD, 131 shifts).
- **Task 0.1 — Tolerance-budget carryover.** Edit `tolerance-budget.toml`: `[phase].phase = "sub-phase-lattice-boltzmann-d3q19-stack-d"`, bump `opened_at`. NO `[budgets.*]` widening (`[budgets.lbm.cross_stack]` stays 1e-5). Commit `chore(lattice-boltzmann-d3q19-stack-d-stage0-tolerance-budget): sub-phase carryover from sub-phase-sph-water-stack-d`.
- **Task 0.2 — Phase-1 reference capture sha256 reverify (BOTH captures).** `git lfs ls-files` + `sha256sum` the two `.h5` (LFS OIDs `0e0843aa…`, `7a948434…`); `git cat-file -p HEAD:<json> | sha256sum` the two `.json` (`8347922d…`, `d9fbcafb…`). Mismatch → BLOCKED (the references are the gate-14 partners).
- **Task 0.3 — Empirical Taichi-DSL LBM kernel validation (R-L1/R-L3; LOAD-BEARING).** Write a small smoke-tier D3Q19 kernel (e.g., a few-cell × few-step collision+streaming on a periodic box): verify it (a) runs under `set_taichi_deterministic(arch="cpu")`, (b) is `run_twice_and_diff`-content-equivalent, (c) reproduces the equilibrium golden at a sample point, and (d) the **per-cell 19-term moment accumulation** is expressible deterministically (fixed `ti.static(range(19))` order, single-thread). Confirm integer-offset streaming is bit-exact vs an `np.roll` oracle. If Taichi-DSL cannot express the per-cell 19-term reduction or integer streaming cleanly/deterministically, STOP and surface per Hard Rule 2 (scope-expansion signal — does the existing Taichi-integration infra suffice?).
- **Task 0.4 — Golden + MMS Stack-D-consumability check.** Verify `lattice/d3q19-equilibrium.json` is loadable + its fixture feeds a Taichi-side `feq` evaluation; verify the shared `incompressible_ns_2d` MMS solution + derivation are unmodified (cite their sha256) + feedable into a Taichi `bgk_step` MMS runner. NOT production gate-4 deliverables — dependency checks.
- **Task 0.5 — R-S5 empirical taxonomy-resolution check.** Empirically invoke `compare_captures` against a synthetic Stack-D manifest carrying real `sim.category="lattice"`, `sim.name="lattice-boltzmann-d3q19"` (NOT a parser-perf check), to confirm the `KeyError`-without-override behaviour and that the planned `[overrides.lattice-boltzmann-d3q19] category="lbm"` resolves to `1e-5`. Catches the tolerance-resolution gap at Stage 0 rather than mid-Stage-1c.
- **Task 0.6 — Wall-clock note (R-L4 — trivial).** Record the Phase-1 baselines (poiseuille 3.784 s, couette 0.604 s); note LBM is RD-2D-scale, so no R-S3-style escape-hatch pre-routing is needed. (If Stage-1b Taichi-cpu wall-clock somehow approaches a structural alarm — implausible — surface.)
- **Closing.** `stage-0-checkpoint-<UTC>.md` per IC-9. Front-matter both `head_sha:` AND `head_sha_at_checkpoint:`. Commit `chore(lattice-boltzmann-d3q19-stack-d-stage0-checkpoint): Stage 0 pre-flight complete`. Convention #12 SHA back-fill.

### § 4.2 Stage 1 — Implementation (3 sub-stages per D2 lean)

#### § 4.2.1 Stage 1a — Failing-tests commit (single session, single commit)

1. Create the Stack-D test surface at `packages/lattice-boltzmann-d3q19-stack-d/tests/`: `__init__.py`, `conftest.py`, `test_d3q19_equilibrium_golden.py` (gate-4a), `test_mms_convergence.py` (gate-4b), `test_diagnostics.py` (Tier 1 + Tier 2 vector_field), `test_pbt_invariants.py` (2 invariants), `test_determinism.py` (IC-14), `test_reference_sanity.py`, `test_cross_stack_equivalence.py` (gate-14; SKIP until 1c — both descriptors).
2. Each test imports `lattice_boltzmann_d3q19_stack_d.{reference, sim, invariants}` (not yet existing).
3. `pytest packages/lattice-boltzmann-d3q19-stack-d/tests/ -v` → all fail with clean `ModuleNotFoundError`.
4. Capture verbatim output to `tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-<UTC>.txt`; sha256 **of the committed blob** (commit-first-then-sha256).
5. Commit `test(lattice-boltzmann-d3q19-stack-d-stage1a): failing tests for Stack-D port`. Footer `Failing-tests-output(-hash)`.

**Closing.** `stage-1a-checkpoint-<UTC>.md`; commit `chore(lattice-boltzmann-d3q19-stack-d-stage1a-checkpoint): …`; SHA back-fill if needed.

#### § 4.2.2 Stage 1b — Implementation commit (single session, single commit)

**Determinism-strategy declaration first** (§ F.1 + § 1.4.1): docstring at the top of `sim.py` recording the per-cell-19-term-reduction fixed-order choice + integer-streaming bit-exactness + same-stack `bit-exact-same-hw` posture + f64-pin + analytic-IC/seed-recorded-only + Phase-2+ deferrals.

Per-task sequence (new-files-first per Convention A):
1. **Package skeleton.** `packages/lattice-boltzmann-d3q19-stack-d/pyproject.toml` (workspace member: `bit-physics-{testkit,diagnostics,common-py}` + h5py + hypothesis + numpy + `taichi>=1.7,<2.0`; `[tool.uv.sources]` workspace=true) + `lattice_boltzmann_d3q19_stack_d/__init__.py` + `reference/__init__.py` + `README.md`.
2. **Reference module(s)** `lattice_boltzmann_d3q19_stack_d/reference/`: D3Q19 `constants` (lex-ordered 19-velocity `C`, weights `W`, `CS2=1/3` — mirror the Phase-1 ordering verbatim per R-LBM-4); Taichi `feq_field` (per-direction equilibrium polynomial); Taichi `bgk_step` (per-cell 19-term moment reduction → equilibrium → BGK relaxation → optional Guo forcing → integer-offset streaming); `apply_bounce_back_y_walls` (OPP-map swap + moving-wall momentum injection); `macroscopic_velocity`; point-eval `feq`/`density_moment`/`momentum_moment` for gate-4a/gate-11. NO `-> None` annotations (R-T2).
3. **Sim wrapper** `lattice_boltzmann_d3q19_stack_d/sim.py`: determinism docstring; `sim_runner_seeded(seed, out_dir) -> Path` (Poiseuille 64×32×3 × 1000, full cadence; `set_taichi_deterministic` before fields/kernels; `common_py.capture.Writer`); `sim_runner_seeded_couette(seed, out_dir) -> Path` (Couette 32×16×3 × 500, moving top-plate); `sim_runner_diagnostic(seed, out_dir) -> Path` (Poiseuille 16×8×3 × 50 diagnostic-tier; accepts `seed` for Protocol conformance — determinism is seed-independent per § 1.4.1).
4. **Invariants module** `lattice_boltzmann_d3q19_stack_d/invariants.py`: `equilibrium_density_moment` + `equilibrium_momentum_moment` (spec-ref § 6.6).
5. **Spec sheet** `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-d.md` (13-section; § 6 BOTH golden + MMS posture; § 8 `bit-exact-same-hw` arch=cpu; § 9 cross-stack `1e-5`).
6. **Probe report** `tools/testkit/probes/reports/lattice-boltzmann-d3q19-stack-d-probe.md`.
7. **Implement test bodies → GREEN** (gates 4–13; gate-4a golden + gate-4b MMS); `test_cross_stack_equivalence.py` SKIP at 1b. Capture GREEN evidence + sha256.
8. **Canonical captures (gate 9).** `sim_runner_seeded(seed=42, …)` → `poiseuille-64x32-seed42-step1000.{h5,json}`; `sim_runner_seeded_couette(seed=42, …)` → `couette-32x16-seed42-step500.{h5,json}` (both into `captures/lattice-boltzmann-d3q19-stack-d/`). Record all four sidecar sha256 (commit-first-then-sha256; `.h5` LFS → content OIDs).
9. **Perf-ledger row(s)** (gate 12).
10. **Workspace member registration** in root `pyproject.toml` `[tool.uv.workspace].members`.
11. **Gate-13 worktree replay** at the Stage 1a SHA.
12. **Commit** `feat(lattice-boltzmann-d3q19-stack-d-stage1b): Stack-D Taichi D3Q19 BGK implementation through gate 13`. Footer cites Stage 1a evidence sha, GREEN evidence sha, four capture sidecar sha256s, perf wall-clock(s), determinism docstring path, gate-4a golden + gate-4b MMS-OOA results, `Implements-failing-tests-from` + `…-witnessed`.

**Closing.** `stage-1b-checkpoint-<UTC>.md` (gates 4–13 GREEN; gate-14 PENDING-1c); commit `chore(lattice-boltzmann-d3q19-stack-d-stage1b-checkpoint): …`; SHA back-fill.

#### § 4.2.3 Stage 1c — Cross-stack equivalence + landing-prep (single session, single commit)

1. **Add `[overrides.lattice-boltzmann-d3q19]` to `tolerance.toml`** (`category = "lbm"`; at-budget; preserve existing comments — Convention A). MANDATORY (D6).
2. **Extend `docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md` additively** (the Phase-1 stub exists — preserve its tolerance-row + cross-stack-scope tables; populate the 5 IC-15 methodology sections; update the stale "Stack C self-replicates / Not yet exercised" framing to the actual NumPy-reference ↔ Taichi pair).
3. **Run gate-14 diff for BOTH captures.** `compare_captures(captures/lbm-ref/<desc>.json, captures/lattice-boltzmann-d3q19-stack-d/<desc>.json)` for poiseuille (primary) + couette (secondary). Capture output verbatim to Stage-1c evidence. Document `within_tolerance`, per-field per-frame `max_abs_err`/`max_rel_err` (`rho`, `u`), step-horizon analysis, for each.
4. **Gate-14 disposition.** If both `within_tolerance == True`: GREEN. If either `False`: document the field + step at which `1e-5` is exceeded; **STOP and surface to operator per Hard Rule 2 BEFORE Stage 2** (R-L1 routing). Do NOT silently widen. Do NOT pre-commit a shorter horizon (D4). If a comparison-projection question surfaces (per-cell `u`/`rho` position-exact vs mass/momentum conservation invariants), surface D8.
5. **Schema-corpus entries.** Copy both Stack-D captures to `tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-d-{poiseuille,couette}.{h5,json}`; record sha256. (Note the sph-water-banked LFS-rule observation for `tests/fixtures/legacy-captures/` — STILL BANKED; record the non-LFS fixture sizes.)
6. **Un-skip `test_cross_stack_equivalence.py`** (verify GREEN if gate-14 passed; if routed-fail, the test reflects the operator-routed acceptance state).
7. **Commit** `feat(lattice-boltzmann-d3q19-stack-d-stage1c): cross-stack equivalence harness extension + gate 14 verdict`. Footer cites both captures' sha256s, the equivalence verdicts + per-field witnesses, step-horizons, `equivalence.md` sha, schema-corpus shas, `[overrides.lattice-boltzmann-d3q19]`.

**Closing.** `stage-1c-checkpoint-<UTC>.md` (14-row gate table + both-capture witnesses); commit `chore(lattice-boltzmann-d3q19-stack-d-stage1c-checkpoint): …`; SHA back-fill.

### § 4.3 Stage 2 — Landing (single session if Stage 1 clean)

Inherits sph-water § 4.3 Steps 2.1 → 2.12. Deltas:
- **2.1 — Anchor re-check.** Re-grep every path/SHA/sha256 across charter + 3 Stage-1 checkpoints + Stage 0 + spec sheet + probe report + extended `equivalence.md` + four capture sidecars. Cite post-back-fill HEAD shas.
- **2.2 — Portfolio-scale regression sweep (§ B.7).** Python fan-out incl. new `packages/lattice-boltzmann-d3q19-stack-d` + tools + common-py; TypeScript fan-out (NO-OP — Python-only port). Counts canonical; sweep-output sha256 informational.
- **2.3 — Cat 3 disposition.** `lattice` golden subdir already picked up (Phase-1); the port ships NO new golden table + consumes the shared MMS read-only. **NO-OP — no `_SUBDIRS_PICKED_UP` change.**
- **2.4 — Integrity sweep** (Cat 1–5 + X). Byte-identical streak may break (new sim package); document per-Cat deltas; **informational, NOT load-bearing**.
- **2.5 — Evidence-path verification (IC-16).** `verify_evidence` over all new sub-phase audits; the four `.h5` LFS content OIDs resolve automatically (no §B.6 annotation). Confirm + document.
- **2.6 — Gate-13 replay** per § E.
- **2.7 — Append-only check** vs `v0.1.0-phase-1`. Document legitimate additive amendments (`tolerance.toml` `[overrides.lattice-boltzmann-d3q19]`; `equivalence.md` extension; `test_cross_stack_equivalence.py` SKIP-removal; IC-15 methodology-doc amendment if D5 (a)/(b); `packages/lattice-boltzmann-d3q19/` UNCHANGED — D7 STAY BANKED). Conventions doc + architecture UNCHANGED.
- **2.8 — Mutation artifact (B17).** Default lean PATH-B re-bank (single-sim Taichi-DSL port; per sph-water § 4.3 + Phase-1 LBM test-augmentation banked sim.py low-kill-rate observation). Operator may route PATH-A.
- **2.9 — Convergence edits.** CHANGELOG additive; `dependencies.md` additive (NEW workspace member + Taichi-DSL); perf-ledger row(s) (cross-check from 1b).
- **2.10 — D5 IC-15 disposition.** Per the gate-14 empirical margin (Stage 1c): if GREEN at 1e-5 with comfortable margin → lean (b) additively amend `docs/conventions/cross-stack-equivalence-methodology.md` (validated third physics family; deferred aspect #4 collision-step FP-accumulation now has data; tighter 1e-5 category; two-canonical-capture + extend-stub patterns) while keeping #1/#3/#5 deferred; if operator routes (a) FULL, promote the 5 codified components to IC-15-proper with deferred aspects as explicit future scope; if (c), hold unchanged. **Additive amendment only (Convention A); never rewrite the partial doc's history.**
- **2.11 — Landing audit.** `landing-<UTC>.md` per IC-9; `artifact: sub-phase`, `artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-d`; both `head_sha:` AND `head_sha_at_checkpoint:`; enumerate all evidence_paths + evidence_hashes; verdict-state per outcome.
- **2.12 — Convention #12 SHA back-fill** (enumerate EVERY placeholder-bearing audit in the stage). NEVER `--amend`.
- **2.13 — Final summary.** No `-phase-N` tag (lean: NO intermediate tag). Surface landing path, 14-gate table (both-capture gate-14), D1–D9 verdicts, D5 IC-15 disposition, next-sub-phase recommendation.

---

## § 5. Dispatch — operator workflow

Inherited from sph-water § 5 verbatim. Identity reads "lattice-boltzmann-d3q19-stack-d sub-phase coordinator chat"; § 7 prompts are the dispatchable units. **Tag posture:** no `-phase-N` tag; lean no intermediate tag.

---

## § 6. Coordinator prompt

Inherits sph-water § 6; identity "lattice-boltzmann-d3q19-stack-d sub-phase coordinator chat"; running-log:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| plan-drafting | probe + charter + landing + SHA back-fill | pending | — | — | D1–D9 routing |
| 0 | replay + tolerance carryover + reference reverify (×2) + **Taichi-LBM-kernel validation (R-L1/R-L3)** + golden+MMS check + **R-S5 taxonomy check** | pending | — | — | — |
| 1a | failing-tests commit (gate 3 anchor) | pending | — | — | — |
| 1b | Stack-D Taichi D3Q19 BGK impl (gates 4–13; gate-4a golden + gate-4b MMS; TWO captures) | pending | — | — | — |
| 1c | cross-stack equivalence (gate 14 ×2) + `[overrides.lattice-boltzmann-d3q19]` + equivalence.md extension | pending | — | — | empirical @ 1e-5 |
| 2 | integrity + portfolio sweep + IC-16 evidence verify + mutation + convergence + **D5 IC-15 disposition** + landing + SHA back-fill | pending | — | — | — |

---

## § 7. Per-stage agent prompts

All prompts share the **sub-phase standing orders** (inherited from sph-water § 7 with substitutions):
- Commit slug `chore`/`feat`/`test`/`docs` + `lattice-boltzmann-d3q19-stack-d-stage<N><a|b|c>-<scope>` (non-phase form; § C.1).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/`, `tools/testkit/{determinism, capture, equivalence, code_verification}/`.
- Audit front-matter both `head_sha:` AND `head_sha_at_checkpoint:` (§ B.3).
- Convention #8 — never assert from memory; grep/verify every path / signature / sha256 / spec section. **Use the canonical Appendix D.6 gate numbering, NOT the Phase-1 LBM +1-offset docstring numbering (§ 1.4.3).**
- Convention A — additive edits to pre-existing files only; new files first. Never edit Phase-1-sealed `packages/lattice-boltzmann-d3q19/` (D7 STAY BANKED) or any prior audit chain.
- Convention #12 — never `--amend`; SHA back-fill at EVERY stage close; enumerate EVERY placeholder-bearing audit.
- Commit-first-then-sha256 for text artifacts.
- `verify_evidence` resolves LFS content OIDs (IC-16); use `sha256:HEX` prefix form.
- Empty-file rejection (Taichi-integration N6): pytest-subpackage `__init__.py` files start with `"""` docstring.
- Hard Rule 2 — STOP and surface on structural wrongness (Taichi-DSL cannot express the per-cell 19-term reduction or integer streaming deterministically at single-thread; gate-14 exceeds 1e-5; either reference capture sha256 drifts; gate-4b MMS OOA falls outside ±0.5 of p=2).

### § 7.1 Stage 0 — Pre-flight

```
You are the lattice-boltzmann-d3q19-stack-d sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md (this charter — source of truth). § 7 standing orders.
  2. docs/conventions/sub-phase-conventions.md (sha256 69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45 — verify at HEAD).
  3. docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/plan-drafting-probe-2026-05-24T02-30-12Z.md (probe — Phase-1 S6 baseline + infra + IC-15-partial + tolerance.toml + capture sha256s + dispatch-anchor shifts + D1-D9).
  4. docs/_audits/phase-2/sub-phase-sph-water-stack-d/landing-*.md (the structural exemplar; § 9 R-S playbook, § 11 D-routing + S6 + IC-15 partial).
  5. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md (the MMS-arm cross-stack-port exemplar; § 9 R-P playbook).
  6. docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md (the Phase-1 reference baseline; gate-4a golden + gate-4b MMS; R-LBM-1..4; two canonical captures).
  7. docs/sim-specs/lattice/lattice-boltzmann-d3q19/{spec-ref,algebraic,determinism,equivalence}.md.
  8. packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/{sim.py, reference/{constants,equilibrium,bgk}.py, invariants.py} (the NumPy reference to port — algorithm + determinism docstring).
  9. common/common-py/src/common_py/determinism.py (IC-11 set_taichi_deterministic) + tools/testkit/taichi_harness/ + a Taichi smoke exemplar.
  10. tools/testkit/equivalence/{harness.py, tolerance.toml, tolerance-budget.toml}.
  11. tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/ (the shared MMS surface — read-only; cite sha256).

Stage 0 is pre-flight only; you do NOT implement the port (Stage 1).

Execute Tasks 0.0 → 0.6 → closing per charter § 4.1 exactly. Load-bearing: Task 0.3 (empirical Taichi-DSL LBM kernel validation — per-cell 19-term moment reduction deterministic at fixed ti.static order + single-thread; integer-offset streaming bit-exact vs np.roll; equilibrium-golden reproduction; if Taichi cannot express these cleanly/deterministically, STOP and surface) and Task 0.5 (R-S5 empirical compare_captures taxonomy-resolution check against a synthetic lattice manifest).

Out of scope: any Stage 1 implementation; any edit outside tolerance-budget.toml + new audit files + Stage-0 throwaway smoke-tier scratch; any edit to packages/lattice-boltzmann-d3q19/ (Phase-1-sealed; D7 STAY BANKED).

Stuck → conventions doc § 9 + charter § 9. Hard Rule 2 applies.
```

### § 7.2 Stage 1a — Failing-tests commit

```
You are the lattice-boltzmann-d3q19-stack-d sub-phase Claude Code agent, Stage 1a (failing-tests commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md §§ 2 (deliverables), 4.2.1 (Stage 1a sequence), 7 (standing orders).
  2. docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-checkpoint-<UTC>.md.
  3. packages/lattice-boltzmann-d3q19/tests/*.py (the Phase-1 reference test surface — mirror its shape; note gate-4 has TWO arms: test_d3q19_equilibrium_golden.py + test_mms_convergence.py; USE the canonical Appendix D.6 gate numbering, NOT the Phase-1 docstrings' +1-offset).
  4. docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref.md §§ 6.1 (golden + MMS), 6.6 (PBT), 10 (diagnostics).
  5. packages/sph-water-stack-d/tests/ + packages/reaction-diffusion-2d-stack-d/tests/ (the cross-stack-port test-surface templates; sph-water for golden-arm shape, RD-2D for MMS-arm shape).

Scope — charter § 4.2.1: create the test surface at packages/lattice-boltzmann-d3q19-stack-d/tests/ importing lattice_boltzmann_d3q19_stack_d.{reference,sim,invariants}; verify clean ModuleNotFoundError; capture + sha256 the committed evidence blob (commit-first-then-sha256); commit per § 4.2.1.

Closing — stage-1a-checkpoint-<UTC>.md; SHA back-fill. Stop.

Out of scope: implementation (1b); equivalence (1c); any edit outside the new tests/ + failing-tests-evidence + audit files.
Hard Rule 2 applies.
```

### § 7.3 Stage 1b — Implementation commit

```
You are the lattice-boltzmann-d3q19-stack-d sub-phase Claude Code agent, Stage 1b (implementation commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md §§ 1.4 (posture), 2 (deliverables), 3 (ICs), 4.2.2 (Stage 1b 12-step), 7, 9 (R-L playbook).
  2. docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/{stage-0,stage-1a}-checkpoint-<UTC>.md.
  3. packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/{reference/{constants,equilibrium,bgk}.py, sim.py, invariants.py} (the NumPy reference; port to Taichi-DSL preserving algorithm + the lex-ordered 19-direction set; per-cell 19-term moment reduction at fixed ti.static order; integer-offset streaming; Guo forcing; bounce-back).
  4. common/common-py/smoke/ Taichi exemplar + docs/common/taichi.md (IC-12; init form, arch=cpu, no -> None).
  5. common/common-py/src/common_py/{determinism.py, capture.py} (IC-11 + IC-2).
  6. tools/testkit/determinism/harness.py (IC-14; gate-10).
  7. tools/testkit/golden/tables/lattice/d3q19-equilibrium.json (gate-4a) + tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/ (gate-4b; shared, read-only).
  8. packages/sph-water-stack-d/ (Stack-D structural exemplar: pyproject, sim.py runner shape, common_py.capture.Writer usage).

Determinism-strategy declaration FIRST (charter § 1.4.1 + § F.1): per-cell 19-term reduction fixed-order; integer-streaming bit-exact; bit-exact-same-hw arch=cpu; f64-pin; analytic-IC/seed-recorded-only.

Scope — charter § 4.2.2 12-step (single sub-bundle commit). Gate-4 has BOTH arms (4a golden abs=1e-15; 4b MMS OOA ±0.5 of p=2). TWO canonical captures (poiseuille primary + couette secondary). LBM is RD-2D-scale (seconds) — no wall-clock concern.

Closing — stage-1b-checkpoint-<UTC>.md (gates 4-13 GREEN; gate-14 PENDING-1c); SHA back-fill. Stop.

Out of scope: cross-stack (1c); landing (2); modification of packages/lattice-boltzmann-d3q19/ (append-only; D7 STAY BANKED).
Hard Rule 2 — STOP on Taichi 1.7.4 per-cell-reduction or integer-streaming non-determinism; golden reproduction failure; MMS OOA outside ±0.5 of p=2; canonical descriptor unreachable.
```

### § 7.4 Stage 1c — Cross-stack equivalence + landing-prep

```
You are the lattice-boltzmann-d3q19-stack-d sub-phase Claude Code agent, Stage 1c (cross-stack equivalence) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md §§ 1.4.2 (cross-stack posture), 2 (gate 14), 4.2.3 (Stage 1c 7-step), 7, 9 (R-L1/D8).
  2. docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-1b-checkpoint-<UTC>.md (Stack-D capture sha256s).
  3. tools/testkit/equivalence/{harness.py, tolerance.toml, tolerance-budget.toml}.
  4. docs/sim-specs/particle-fluids/sph-water/equivalence.md (the IC-15 5-section authoring template — what to author into LBM's equivalence.md).
  5. docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md (the PRE-EXISTING Phase-1 stub — EXTEND additively, preserve existing tables, Convention A).
  6. docs/conventions/cross-stack-equivalence-methodology.md (IC-15 partial — the 5 codified components to instantiate).
  7. docs/architecture.md § 2.6 (tolerance table) + § 3.6.

Scope — charter § 4.2.3. MANDATORY first step: add [overrides.lattice-boltzmann-d3q19] category="lbm" (KeyError on sim.category="lattice" without it). Run gate-14 NumPy-ref ↔ Stack-D for BOTH captures (poiseuille primary + couette secondary); emit per-field per-frame witness + step-horizon analysis REGARDLESS of pass/fail.

Gate-14 is EMPIRICAL at the TIGHTER 1e-5 (NOT a forced PASS; LESS headroom than the prior pairs' 1e-4). The prior pairs' ~10-11-orders margin does NOT auto-inherit (LBM exercises genuine collision-step 19-term FP-accumulation). Expected: GREEN with a smaller margin (~1e-13..1e-9). If within_tolerance==False at 1e-5: document the field+step+capture of exceedance; STOP and surface per Hard Rule 2 BEFORE Stage 2. Do NOT silently widen (spec § 2.6 + § L). Do NOT pre-commit a shorter horizon. If position-exact-vs-conservation-invariant projection surfaces, surface D8.

Closing — stage-1c-checkpoint-<UTC>.md (14-row gate table + both-capture witnesses + step-horizons); SHA back-fill. Stop.
Hard Rule 2 applies.
```

### § 7.5 Stage 2 — Landing

```
You are the lattice-boltzmann-d3q19-stack-d sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md §§ 4.3 (Stage 2 13-step), 7, 11 (coherence + D1-D9 routings as decided by operator — especially D5 IC-15 disposition + D7 STAY BANKED).
  2. docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/{stage-0,stage-1a,stage-1b,stage-1c}-checkpoint-<UTC>.md.
  3. docs/_audits/phase-2/sub-phase-sph-water-stack-d/landing-*.md (Stage 2 template; § 11 banked-items + D5 partial-formalization landing precedent).
  4. docs/conventions/cross-stack-equivalence-methodology.md (the IC-15 partial doc to additively amend per D5 routing).

Execute Steps 2.1 → 2.13 per charter § 4.3. IC-16: evidence-path verification resolves the four .h5 LFS content OIDs automatically.

D5 (most consequential): per the Stage-1c gate-14 empirical margin, additively amend the IC-15 methodology doc — lean (b) REFINEMENT (validated third physics family + deferred aspect #4 collision-step FP-accumulation data + tighter 1e-5 + two-canonical + extend-stub patterns; keep #1/#3/#5 deferred), OR (a) FULL if operator routes it, OR (c) hold unchanged. Additive only (Convention A). D7: packages/lattice-boltzmann-d3q19/ stays UNCHANGED (STAY BANKED).

Acceptance: gates 1-13 GREEN; gate-14 verdicts landed with full witnesses for both captures (a routed within_tolerance==False is a legitimate landing state); portfolio sweep GREEN; integrity sweep clean (streak may break — informational); evidence verify clean; append-only clean; mutation artifact (PATH-B lean); D5 disposition landed; landing audit + SHA back-fill.

If Stage 2 surfaces a CONFIRMED-blocking regression, STOP and SURFACE per Hard Rule 2.
Stuck → conventions doc § 9 + charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits § A.3 + § A.4 + § B.2. Stage 0 / 1a / 1b / 1c each ship a checkpoint; Stage 2 the landing audit. All five closes followed by Convention #12 SHA back-fill (enumerate EVERY placeholder-bearing audit per audit-chain-correctness N1). Commit-first-then-sha256 for every text artifact.

---

## § 9. Risk surface + problem-solving playbook

Inherits conventions doc § 9 playbook (P1–P27) + RD-2D § 9 R-P1/R-P3/R-P4/R-P5/R-P6 (where applicable) + sph-water R-S3 (wall-clock instrumentation) / R-S5 (Stage-0 taxonomy check) / R-S6 (methodology-calibration) + Taichi-integration R-T1–R-T5. **NEW R-class entries SPECIFIC to this sub-phase:**

- **R-L1 — Collision-step FP-accumulation at gate-14 (the first pair exercising deferred IC-15 aspect #4).** The per-cell 19-term moment reduction (`density_field`/`momentum_field`) + equilibrium polynomial + Guo forcing are genuine FP arithmetic whose round-off is reduction-order-sensitive (NumPy `.sum`/einsum vs Taichi sequential 19-term loop). At the tighter 1e-5 category, gate-14 has LESS headroom than the prior pairs' 1e-4 / ~10-11 orders. *Mitigation:* Stage 1c explicit per-field + per-step diff witness for BOTH captures regardless of pass/fail; binary-search the first step exceeding 1e-5, then per-field (`rho` vs `u`); operator routing if approaches/exceeds 1e-5 (tolerance amendment per spec § 2.6 + budget amendment; OR step-horizon override; OR comparison-projection per D8). Do NOT silently widen.
- **R-L2 — Collision-step BGK relaxation FP-arithmetic + equilibrium polynomial order.** Single-τ BGK (`f - (f - f_eq)/τ`) + the equilibrium `1 + cu·inv_cs2 + cu²·inv_two_cs4 - u_sq·inv_two_cs2`. *Mitigation:* f64 precision pin (sph-water Stage-0 banked finding); `cpu_max_num_threads=1` serialisation; fixed expression order matching the reference; same determinism posture as sph-water Stack-D. The dissipative laminar regime bounds amplification (NOT chaotic).
- **R-L3 — Streaming-step memory-shuffle determinism (bit-exact expected).** Integer velocity set `{-1,0,1}` → per-direction integer-offset shift with periodic wraparound is bit-exact across backends. *Mitigation:* explicit per-direction streaming in Taichi-DSL (the np.roll analog); no in-kernel reductions in the streaming step; Stage-0 Task 0.3 validates bit-exactness vs an np.roll oracle.
- **R-L4 — Wall-clock (trivial).** Phase-1 baselines: poiseuille 3.784 s, couette 0.604 s — RD-2D-scale, NOT sph-water-scale. No R-S3 escape-hatch pre-routing needed. Taichi JIT overhead on small grids may make the Stack-D wall-clock larger than the NumPy floor but it stays seconds (orders below any structural alarm). Record both rows in the perf-ledger; >2× the NumPy floor flags to operator but is expected for Taichi-cpu on small grids (cf. RD-2D 0.61× / sph-water 0.195× — both below 2×; LBM small-grid JIT may differ).
- **R-L5 — S6 banked precedent application (load-bearing for this entire sub-phase's risk profile).** The Phase-1 LBM sim.py characterization (probe § 1) — genuine collision-step FP-accumulation, laminar/dissipative single-pass, analytic ICs, integer-streaming bit-exact, BOTH gate-4 arms, two captures — IS the empirical anchor for R-L1..R-L4 + D5 + D7. Stage 0/1 agents re-read sim.py at HEAD; do NOT extrapolate from the prior pairs' DFSPH/Gray-Scott shapes.
- **R-L6 — Dual-arm gate-4 + dual-capture scope.** Stage 1b carries BOTH a golden arm (4a) AND an MMS arm (4b) AND TWO canonical captures — more surface than the single-arm / single-capture template. R-LBM-1/R-LBM-2 (MMS ladder non-monotonicity) must reproduce OOA within ±0.5 of p=2. *Mitigation:* port the gate-4b MMS runner faithfully (midpoint-rule source, τ-per-N, Ma-bound assert); the full-ladder log-log slope gates, not per-step ratios.

### § 9.1 Playbook note (P27-analog inheritance)

RD-2D/sph-water P27 (cross-stack content-equivalent diff debugging) is inherited with LBM-specific cause ordering for gate-14 exceedance: (1) different IC across stacks — assert step-0 bit-identical first (analytic rest-state → should be exactly equal); (2) per-cell 19-term moment reduction-order delta (R-L1; the primary suspect); (3) equilibrium polynomial / Guo forcing term-order (R-L2); (4) streaming integer-offset mismatch (R-L3; should be bit-exact — a mismatch here is a bug, not round-off); (5) bounce-back wall-cell handling delta; (6) capture-descriptor mismatch (sim name/variant/frames/dims/N_z). Debug-step: binary-search the step at which divergence first exceeds 1e-5, then per-field (`rho` vs `u`), then interior-vs-wall-cell region.

---

## § 10. Audit-trail discipline

Inherits § B verbatim. Sub-phase audit dir: `docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/`. All append-only per § B.1. Stage 0/1a/1b/1c checkpoints use `artifact: stage`; Stage 2 landing uses `artifact: sub-phase` (`artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-d`). IC-16 means evidence verification resolves LFS content OIDs without §B.6 annotation.

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

Parent audits: Phase-1 LBM landing (`215983fd`) + Taichi-integration + capture-determinism-contract + RD-2D Stack-D + sph-water Stack-D + audit-chain-correctness landings (full list at the plan-drafting landing audit front-matter). The 14-gate deliverable list derives from the probe + the sph-water Stack-D template + the Phase-2 14th gate, with gate-4 carrying BOTH arms (golden + MMS) per spec-ref § 6.1 and gates 9 + 14 doubled (two canonical captures).

**Cumulative shifts entering this sub-phase: 131** (sph-water Stack-D landing § 9). Plan-drafting closing-shift count: **136** (probe § 10: S-P1 spec-item-2.5.D; S-P2 tolerance-1e-5-tighter; S-P3 full-name-D1-naming; S-P4 D7-stay-banked-shift; S-P5 dual-gate-4-arm + two-canonical-captures) — confirmed at the plan-drafting landing audit.

### § 11.2 Banked items inherited + disposition

| # | Item | Disposition at this charter close |
|---|---|---|
| 1 | **IC-15 full-formalization opportunity** | **OPERATIVE (D5)** — this IS the third cross-stack pair the partial doc named. Lean (b) additive REFINEMENT (not (a) full) per probe § 3/§ 6 (only deferred aspect #4 exercised). Surfaced at § 11.5 D5. |
| 2 | **LBM/MPM `sim_runner_diagnostic` defect** | **LIVE but lean STAY BANKED (D7)** — this is the next LBM-touching sub-phase, but the LBM defect is cosmetic (analytic ICs; no RNG) AND fixing it edits Phase-1-sealed code (§ B.1 tension). The NEW Stack-D diagnostic runner follows a clean contract regardless. MPM stays banked. Surfaced at § 11.5 D7 + probe § 9. |
| 3 | LFS-rule observation for `tests/fixtures/legacy-captures/` | **STILL BANKED** (sph-water § 11; forward-routable) — record the non-LFS Stack-D fixture sizes at Stage 1c. |
| 4 | MMS-runner-generalization (Phase-1 § 9.2; 3 inline examples incl. LBM) | **STAYS INLINE** — the Stack-D port re-runs the inline gate-4b MMS pattern; generalization remains an operator decision at a future MMS-using sub-phase, not in scope here. |
| 5 | Cat 3 evaluator shim for `lattice-boltzmann-d3q19-equilibrium-qian-1992` | **DEFER** (Phase-1 banked; not a Stack-D-port deliverable). |
| 6 | LBM sim.py low-kill-rate test-augmentation (Phase-1) | **DEFER** — Phase-1-reference test surface; not the Stack-D port. Informs B17 mutation lean (PATH-B). |
| 7 | §B.6 verify_evidence LFS fix / portfolio phantom-sha audit | **RESOLVED** at audit-chain-correctness (IC-16) — consumed here. |

### § 11.3 Outputs

After this sub-phase lands:
- **The THIRD per-sim Stack-D port** + the **first lattice-method cross-stack port** in the portfolio.
- **The IC-15 PARTIAL methodology's third validation pair** — validating the 5 codified components at a third physics family AND contributing the first empirical data on deferred aspect #4 (collision-step FP-accumulation), at the tighter 1e-5 category. Structural exemplar for the dual-gate-4-arm (golden + MMS) + two-canonical-capture cross-stack-port variant.
- **`[overrides.lattice-boltzmann-d3q19]`** — the third per-sim tolerance override; `lattice`→`lbm` mapping precedent.
- **A third Taichi-cpu perf-ledger datapoint** at RD-2D-scale (small-grid Taichi JIT-overhead datapoint).
- Whatever IC-15 disposition Stage 2 lands (D5): additive amendment to the methodology doc ((a)/(b)) or unchanged (c).

### § 11.4 Replay-chain non-participation + tag posture

Inherits § D.2 + § D.4. Does NOT participate in the cross-phase replay chain. **Tag posture:** no `-phase-N` tag (forbidden per § D.2). Optional non-phase point-release banked (lean: NO intermediate tag, per all spec-Phase-2 sub-phase precedents).

### § 11.5 D1–D9 surface — operator-routable; NOT pre-committed

(See probe § 8 for full preview. Reproduced for charter-time routing.)

**D1 — Sub-phase / package / commit-scope naming.** **Lean `sub-phase-lattice-boltzmann-d3q19-stack-d`** (package `packages/lattice-boltzmann-d3q19-stack-d/`; audit dir + commit scope to match) — the full-name precedent (§ C.1 + RD-2D `reaction-diffusion-2d-stack-d` + sph-water `sph-water-stack-d`). **SHIFT from the dispatch's abbreviated `sub-phase-lbm-stack-d`** (probe § 8 / S-P3). The probe + charter + audit-dir already use the full-name lean. Alternative: the `lbm` abbreviation (mechanical rename of charter + audit-dir + all commit slugs). Downstream: precedent for the remaining Stack-D/E ports (MPM, smoke, Stack-C/E variants).

**D2 — Stage 1 decomposition.** Lean 1a/1b/1c (RD-2D + sph-water precedent). Stage 1b scope ≈ sph-water (~1100–1500 lines): structurally simpler than DFSPH (no iterative solver, no neighbour search) but carries TWO canonical runners + Guo forcing + bounce-back + BOTH gate-4 arms (golden + MMS). 1b does NOT need further splitting. Confirm scope at Stage 0.

**D3 — Cross-stack tolerance value.** HEAD-verified `relative = 1e-5, absolute = 0.0` (`[defaults.lbm]`); NOT pre-committed beyond the HEAD value. **10× tighter than the prior pairs' 1e-4** — less headroom (S-P2). Empirics at Stage 1c decide whether at-budget holds (R-L1). Alternative (if gate-14 exceeds 1e-5): operator routes tolerance amendment (separate operator-approved commit + budget amendment, since 1e-5 IS the cap) OR step-horizon override OR comparison-projection (D8).

**D4 — Step-horizon.** Lean full canonical horizon for BOTH captures (`poiseuille-…-step1000` 1000 frames + `couette-…-step500` 500 frames, full cadence interval=1). NOT pre-committed shorter.

**D5 — IC-15 partial-vs-full formalization disposition (MOST CONSEQUENTIAL).** Lean **(b) PARTIAL HOLDS + REFINEMENT**, contingent on gate-14 GREEN at 1e-5. Rationale (probe § 3 / § 6): the third pair validates the 5 codified components at a third physics family (lattice) AND adds genuine NEW empirical data on deferred aspect #4 (collision-step FP-accumulation + integer-velocity-streaming bit-exactness) at the tighter 1e-5 category + the two-canonical-capture + extend-stub patterns — warranting an **additive amendment** to the partial-formalization doc. BUT deferred aspects #1 (chaotic), #3 (atomic-scatter), #5 (iterative-solver) **remain unexercised across all three pairs** (the laminar/dissipative/single-pass regime forbids them) — promoting to FULL is premature. Alternatives: **(a) FULL** if the operator reads "full formalization" as "promote the 5 CODIFIED components" (held across 3 physics families incl. a richer-FP pair) while carrying #1/#3/#5 as explicit future scope — defensible; **(c) PARTIAL UNCHANGED** — too weak (there IS new data). Routed at Stage 2 on the empirical margin. **This tempers the dispatch's framing (which leaned (a) full into play); the HEAD-verified regime strengthens the codified core but does not close the deferred surface.**

**D6 — Per-sim tolerance.toml override.** **MANDATORY** (`compare_captures` raises `KeyError` on `sim.category="lattice"` without it). Lean `[overrides.lattice-boltzmann-d3q19] category = "lbm"` (at-budget; the THIRD per-sim override; `lattice`→`lbm`=1e-5). Probe-verified: `[defaults.lbm]` exists at 1e-5; no override pre-exists; `[budgets.lbm.cross_stack]`=1e-5 (at-budget, no amendment).

**D7 — LBM/MPM `sim_runner_diagnostic` defect.** **Lean (b) STAY BANKED** — a SHIFT from the dispatch's (a) FOLD-IN lean (probe § 9 / S-P4), on two HEAD-verified grounds: (1) the LBM defect is **cosmetic** — LBM ICs are analytic (no RNG), so the sim is deterministic by construction and there is nothing physical to thread a seed into; the sph-water fix-precedent (random dam-break IC) does NOT transfer; (2) fixing the Phase-1 `sim_runner_diagnostic` edits **append-only-sealed code** (`packages/lattice-boltzmann-d3q19/`; § B.1), in tension with this sub-phase's Convention-A discipline + the Stage-2 append-only check vs `v0.1.0-phase-1`. The NEW Stack-D diagnostic runner follows a clean contract at Stage 1b regardless (accepts `seed`; determinism seed-independent — documented). Alternatives: (a) FOLD-IN (requires a sealed-code-edit exception + delivers only cosmetic value for LBM — surface to operator for explicit ratification); (c) STANDALONE LBM+MPM hotfix sub-phase (adds overhead but handles both + the seal question properly). **Operator routes; do NOT fold in without explicit operator ratification of the append-only-seal exception.**

**D8 (potential, inherited) — comparison-projection axis.** Probe cannot pre-decide (no Stack-D capture). If Stage 1c gate-14 passes with comfortable margin → unneeded. If it approaches/exceeds 1e-5 → surface position-binned histogram / per-field-conservation (mass Σρ; momentum Σρu) / energy-momentum-invariant projections as alternatives to per-cell position-exact comparison. Resolves with D5 at Stage 2.

**D9 (NEW for LBM) — lattice-velocity-set posture.** **D3Q19** (HEAD-verified). Charter codifies: integer velocity set `{-1,0,1}` → streaming quantization bit-exact across backends (NOT the cross-stack surface); the cross-stack-sensitive surface is the collision-step FP-accumulation (moments + equilibrium + Guo). Single-τ BGK (no MRT dual-population storage). This narrows deferred IC-15 aspect #4 to "collision-step FP-accumulation," not "velocity quantization" per se. No alternative posture (the reference is D3Q19 BGK; MRT/other lattices are Phase 4+ out-of-scope).

**Operator decisions on D1–D9 are recorded in the plan-drafting landing audit + cited back at each Stage's dispatch prompt as the routing context.**

---

## § 12. Sub-phase scope vocabulary

Per § C.1: `<lattice-boltzmann-d3q19-stack-d-stage<N><a|b|c>-<scope>>` for Stage 0/1a/1b/1c/2 commits; `<lattice-boltzmann-d3q19-stack-d-plan-drafting-<scope>>` for plan-drafting commits; SHA back-fill commits use `-sha-backfill` suffix per § B.2.

---

*End of charter. Stage 0 is dispatchable in a fresh Claude Code session against this plan after operator routing of § 11.5 (D1–D9).*

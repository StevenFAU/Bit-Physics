# mpm-multimaterial → Stack-D Port — Sub-Phase Charter (FOURTH spec-Phase-2 cross-stack port)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — **FOURTH per-sim cross-stack port sub-phase under spec-Phase-2** (following `reaction-diffusion-2d` Stack-D, `sph-water` Stack-D, `lattice-boltzmann-d3q19` Stack-D landing `74c7d86`). Ports `mpm-multimaterial` from its Phase-1 implemented reference (Python NumPy + numba; `stack.name="numpy-numba-reference"`) to Stack-D (Python / Taichi-DSL / CPU), consuming Taichi-integration (IC-11/12) + capture-determinism-contract (IC-13/14) + audit-chain-correctness (IC-16) + the IC-15 PARTIAL methodology, against the LBM Stack-D structural template.
> **Sub-phase identity:** FOURTH spec-Phase-2 cross-stack port and the **FOURTH validation pair for the IC-15 PARTIAL-formalization methodology** (`docs/conventions/cross-stack-equivalence-methodology.md`). The **canonical candidate to stress-test the deferred atomic-scatter aspect (#3)**: a faithful Stack-D Taichi MLS-MPM port scatters particle contributions into shared grid nodes (the `ti.atomic_add` idiom), a surface none of the three prior pairs exercised. NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries. No `-phase-N` tag proposed.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (sha256 `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` — verified at HEAD per probe § 0) §§ 2.5 (IC-13 content-equivalent contract), 2.6 (cross-stack tolerance table — **`mpm` category default `relative = 1e-4`**, "epsilon (1e-4 rel)"; same as `reaction-diffusion`/`sph`, looser than `lbm` 1e-5), 2.7 (capture format + canonical descriptor), 3.5 + Appendix **D.6** (per-sim 13 acceptance gates + phase-2 14th gate = cross-stack equivalence), D.7 (hybrid-pg Tier-2 substacks = `particle` IC-5 + `vector_field` IC-6), 3.6 (Layer 5 per-replication), 7.5 + Appendix G.7 (IC-16 citations), **11.3 item 2.3** ("MPM to Stack E (Warp port)" — see § 1.1 / probe § 0: the Stack-D arm is NOT enumerated; this sub-phase ports MPM→Stack-D as the systematic Taichi-reference replication, deferring the literal Stack-E Warp port), Appendix D § D.2.3 (canonical descriptors).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` — verified at HEAD per probe § 0). § B.6 3-mode determinism contract; § C.1 cross-stack-port commit-scope naming; § B.7 sweep-template addendum. Inherits role model (§ A.3), three-stage cadence (§ A.2), append-only discipline (§ B), Convention #12 SHA back-fill (§ B.2 tightened + audit-chain-correctness Stage-1b N1 enumerate-all-placeholders), commit-message convention (§ C), replay-chain non-participation (§ D.4), gate-13 worktree pattern (§ E), determinism convention (§ F), R-class STOP-AND-SURFACE (§ K), capture cadence routing (§ P).
> **IC-15 reference document (consumed AS-IS):** `docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `3c2149f625c1f666613d2eda95c6c22a1bb7910d72ec076a58af560ec16189cc` — verified at HEAD). PARTIAL formalization: 5 codified components + § 4 LBM subsections + 5 deferred aspects. This sub-phase is the FOURTH pair; it puts deferred aspect **#3 (atomic-scatter)** in play on the Stack-D side, while aspects #1 (chaotic) and #5 (iterative-solver) remain unexercised (probe § 3 / § 6).
> **Structural inheritance template:** `docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md` (the most recent per-sim cross-stack port; closest analog — same NumPy/numba-reference source-stack, full IC-15-partial-formalization-consumer experience). This charter inherits its § 1–§ 12 structure with **MPM deltas explicit**: gate-4 GOLDEN-only (no MMS arm — opposite of LBM); ONE canonical capture (not LBM's two); MLS-MPM single-material neo-Hookean (probe § 1.1 S6); **the P2G atomic-SCATTER surface in place of LBM's per-cell collision REDUCTION** (deferred IC-15 aspect #3, not #4).
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Phase-1 `mpm-multimaterial` landed at `bd89e78` (back-fill `1ea43b9`; verdict CONFIRMED; LAST per-sim Phase-1 sub-phase); NumPy+numba reference (`sim.py` created `9bd770e`, unchanged since) + ONE canonical capture + gate-4 quadratic-B-spline golden (4 anchors) + 2 PBT invariants + Tier-2 BOTH particle (IC-5) AND vector_field (IC-6) diagnostics; R-MPM-1..3 + R15 risk register.
> - Taichi-integration landed (`cf7d553`); Stack-D infra (common-py workspace member + Taichi `>=1.7,<2.0` + `set_taichi_deterministic` + `docs/common/taichi.md` + `tools/testkit/taichi_harness/`) shipped as IC-11 + IC-12.
> - Capture-determinism-contract landed (`9bf5b68` + back-fill `c4be56b`); IC-13 (spec § 2.5) + IC-14 (`run_twice_and_diff`) first-class.
> - RD-2D Stack-D landed at `7747d68` (SHIFTED; gate-14 `max_abs_err ~1.9e-14`); sph-water Stack-D landed (SHIFTED-with-N1; gate-14 density `max_rel_err 1.585292e-15`; S6 banked); LBM Stack-D landed `74c7d86` (SHIFTED-with-N1; gate-14 ×2 at 1e-5; D5 = (b) additive amendment; methodology → `3c2149f6…`); audit-chain-correctness landed (IC-16 RESOLVED).
> - Conventions doc `69aa39fc…`; architecture `e82b7b8e…`; methodology `3c2149f6…`; all HEAD.
> - `[defaults.mpm]` = `relative = 1e-4, absolute = 0.0`; `[budgets.mpm.cross_stack]` = same; **no `[overrides.mpm-multimaterial]`** at HEAD.
> - Phase-1 reference canonical capture frozen (LFS): `captures/mpm-ref/drop-impact-128cube-seed42-step500.h5` (content `73e00d09…b5ebae`; ~1.05 GiB) + `…step500.json` (blob `ea3531e0…28d1a2f`).
> **Inherited shifts:** **137 documented entering this sub-phase** (FACT — LBM Stack-D landing § 9). Carried by reference; not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/plan-drafting-probe-2026-05-24T11-45-06Z.md`. Read FIRST. Authoritative for the Phase-1 baseline (§ 1, S6 read), infrastructure (§ 2), IC-15-partial state (§ 3), tolerance.toml (§ 4), capture sha256s (§ 5), atomic-scatter framing + expected gate-14 shape (§ 6), Convention-M anchor-sketch (§ 7), D1–D10 surface (§ 8), D7 falsification (§ 9), and 6 plan-drafting shifts (§ 10, S-M1..S-M6).
> **Date drafted:** 2026-05-24.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D10 routing (§ 11.5).

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase IS

The **FOURTH per-sim cross-stack port sub-phase under spec-Phase-2**. Takes the Phase-1-frozen `mpm-multimaterial` reference (Python NumPy + numba; the implemented `stack.name="numpy-numba-reference"`) and produces a content-equivalent Stack-D (Python / Taichi-DSL / CPU) port through gates 4–14 of spec § 3.5 / Appendix D.6 (13 stack-agnostic correctness gates + the Phase-2 14th gate of cross-stack equivalence).

It is the **FOURTH validation pair for the IC-15 PARTIAL-formalization methodology** and the **first cross-stack pair to put the deferred atomic-scatter aspect (#3) in play.** The Phase-1 MPM trajectory (probe § 1.2 S6 read) is a single-pass explicit MLS-MPM drop-impact: `compute_particle_stresses` → `p2g_with_stress` → `grid_update` → `g2p` → `deformation_update` → `advect_particles`. The Phase-1 *reference* scatters into the grid with single-thread sequential `+=` (bit-exact, no atomics); but a faithful **Stack-D Taichi** MLS-MPM port scatters via `ti.atomic_add` at P2G — the canonical Taichi-MPM idiom the spec `determinism.md` anticipates when it declares `epsilon-same-stack-same-hw`. **The cross-stack-sensitive surface is therefore the particle-to-grid SCATTER (Stack-D side), not a gather/reduction** — structurally NEW relative to RD-2D's explicit stencil, sph-water's rigid free-fall, and LBM's per-cell collision reduction.

**Note on § 11.3 enumeration (probe § 0 / S-M1):** spec § 11.3 item 2.3 reads "MPM to Stack **E** (Warp port)"; the Stack-D arm is NOT enumerated (unlike LBM's item 2.5 "Stack D and Stack E"). This sub-phase ports MPM → Stack-D as the systematic Phase-2 Taichi-reference replication (LBM landing § 14 names "MPM-multimaterial" as the remaining Phase-2 cross-stack port), **deferring the literal item-2.3 Stack-E Warp port** to a later sub-phase (cf. § 11.5 item 3.5 PhysGaussian MPM-3DGS at Stack E; common-warp matures at § 11.4 item 3.8).

At close the Stack-D port ships (see § 2 for the per-gate table):
1. **Stack-D Taichi implementation** at `packages/mpm-multimaterial-stack-d/` (D1 full-name precedent per § C.1 + RD-2D + sph-water + LBM).
2. **Stack-D spec sheet** `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-d.md` (sibling to `spec-ref.md`).
3. **Pre-implementation probe report** `tools/testkit/probes/reports/mpm-multimaterial-stack-d-probe.md`.
4. **Failing-tests evidence + sha256** (gate-3 anchor; IC-8 TDD).
5. **ONE canonical Stack-D capture** matching the Phase-1 reference descriptor (D4: `drop-impact-128cube-seed42-step500`).
6. **`equivalence.md` extension** — the Phase-1 stub at `docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md` is **extended additively** with the IC-15 methodology sections (NOT created de novo — Convention A; the sph-water/LBM pattern).
7. **All 13 stack-agnostic gates GREEN** for the Stack-D port (gates 4–13; **gate-4 carries the GOLDEN arm ONLY** — quadratic-B-spline shape functions; NO MMS — § 1.4.3).
8. **Gate-14 cross-stack equivalence verdict** — the Stack-D capture diff'd against its Phase-1 reference capture via `compare_captures` at `relative = 1e-4` (HEAD `[defaults.mpm]`), **with explicit per-field per-frame witness + step-horizon analysis regardless of pass/fail.**
9. **`[overrides.mpm-multimaterial]` tolerance.toml entry** (MANDATORY — `category = "mpm"`; at-budget; the FOURTH per-sim override; without it `compare_captures` raises `KeyError` on `sim.category="hybrid-pg"` — probe § 4).
10. **Convergence-file edits** — CHANGELOG additive, `docs/dependencies.md` additive (NEW workspace member + Taichi-DSL consumption), `docs/perf-ledger.md` (NEW row).
11. **IC-15 disposition update at Stage 2 (D5)** — partial-formalization doc additively amended (lean (b)) OR substantively expanded (d) OR promoted to full (a) OR held unchanged (c), driven by gate-14 empirics + the Stage-1b scatter posture.

### § 1.2 What this sub-phase is NOT

- A new spec-phase. No `-phase-N` tag (§ 11.4).
- A modification of the Phase-1 `mpm-multimaterial` reference at `packages/mpm-multimaterial/`. Phase-1-sealed code is append-only-protected per § B.1 (load-bearing for D7 — § 9 / § 11.5). **In particular: NOT a fix of the (non-existent) "MPM seed-propagation defect"** — probe § 9 falsifies the premise; D7 closes the MPM-side bank as not-a-defect.
- A frontier variant (MRT/implicit-MPM/multi-material constitutive table/plastic/granular/MPM-3DGS — spec-ref/algebraic.md out-of-scope; Phase 2+/Phase 3).
- A multi-material implementation. The Phase-1 reference is single-material neo-Hookean (probe § 1.1 S6); the Stack-D port mirrors it (single `material_id=0`; multi-material table stays declared-only).
- An establishment of Stack-D infrastructure. IC-11/12/13/14/16 are consumed verbatim. No edits to `common/common-py/`, `docs/common/taichi.md`, or `tools/integrity/.../verify_evidence.py`.
- A tolerance-budget widening. `[budgets.*]` rows untouched; `[overrides.mpm-multimaterial]` is at-budget resolution wiring (§ 1.4.2), not a widening.
- An implementation of Stack-E (the literal item-2.3 Warp port). Deferred (§ 1.1).
- An edit to any prior audit (append-only), to `docs/phases/phase-2-cross-stack-replication.md` (SUPERSEDED), to the LFS coverage of `tests/fixtures/legacy-captures/` (RESOLVED at LBM), or to the CI workflow (resolved at `b027f60`; S-CI1 banked).
- A modification of the conventions doc, architecture, or the IC-15 methodology doc beyond verification (the IC-15 doc IS additively amended at Stage 2 if D5 routes (a)/(b)/(d)).
- Pre-committing D1–D10 (§ 11.5 surfaces for operator routing).

### § 1.3 Inputs + 137 cumulative shifts inherited

(FACT — LBM Stack-D landing § 9 [137 cumulative]; sph-water + RD-2D Stack-D landings; Phase-1 MPM landing `bd89e78`.)

**Closing posture this sub-phase inherits:**
- All sim packages GREEN at portfolio scale; common-py first-class workspace member; Taichi `>=1.7,<2.0`; `set_taichi_deterministic` + `tools/testkit/taichi_harness/`.
- **137 cumulative shifts** (131 entering LBM Stage 2 + 5 plan-drafting + 1 Stage-1c N1 [resolved Stage 2]).
- Conventions doc `69aa39fc…`; architecture `e82b7b8e…`; methodology `3c2149f6…`.
- IC-13 + IC-14 first-class; IC-16 portfolio-wide gate-5 LFS-content-OID resolution; `.gitattributes` `legacy-captures/**/*.h5 filter=lfs` rule (LBM); CI checkout `lfs:true` (`b027f60`).
- RD-2D + sph-water + LBM Stack-D ports as implementation + methodology templates; IC-15 PARTIAL formalization doc (5 codified + § 4 LBM subsections + 5 deferred).
- Phase-1 MPM: MLS-MPM single-material neo-Hookean NumPy+numba reference + ONE canonical capture + gate-4 quadratic-B-spline golden + 2 PBT invariants + Tier-2 particle (IC-5) + vector_field (IC-6) diagnostics; R-MPM-1..3 + R15 risk register.

**Banked items disposition** (§ 11.2 full table): the **IC-15 full-formalization opportunity** is OPERATIVE at this sub-phase's close (D5) — but the probe tempers the lean to **(b) refinement** (only deferred aspect #3 in play, partial; #1/#5 still open). The **LBM/MPM `sim_runner_diagnostic` defect** becomes live (this is the next MPM-touching sub-phase) but the **MPM-side claim is FALSIFIED at HEAD** (probe § 9) → D7 leans STAY BANKED / close-as-non-defect (SHIFT from the dispatch's (a) FOLD-IN). The **LFS-rule for legacy-captures** is RESOLVED (LBM § 11). Other prior banks UNCHANGED.

### § 1.4 Sub-phase-specific posture

#### § 1.4.1 Stack-D determinism strategy under IC-13 + IC-11 + MPM atomic-scatter posture

(FACT — IC-13 spec § 2.5; Taichi-integration arch="cpu" mandate; Phase-1 MPM `determinism.md` + `sim.py` docstring clauses 1–10.)

The Stack-D Taichi port declares its determinism posture (docstring at the top of the Stack-D `sim.py` per § F.1; cited in the Stage 1b commit footer per § C.3). **The Phase-1 reference declares `epsilon-same-stack-same-hw` (spec § 2.5 / `determinism.md`) — explicitly because the canonical Stack-D Taichi P2G atomic scatter-add breaks bit-exactness — and the NumPy+numba reference OVER-ACHIEVES to clean `bit-exact-same-stack-same-hw`** (single-thread `@njit(parallel=False)` + sorted-particle lex iteration + fixed 27-cell stencil; no atomics). The Stack-D Taichi port's posture is a **Stage-1b decision (NOT pre-committed; the central D5/R-M1 surface)**:
- `set_taichi_deterministic(Config(seed=42, deterministic=True), arch="cpu")` invoked BEFORE any `@ti.kernel` decoration (R-T1); pins `cpu_max_num_threads=1`, `offline_cache`.
- **f64 throughout** (the reference is f64; Stack-D uses f64-typed `ti.types.ndarray` / fields per the sph-water/LBM f64-pin requirement; no `default_fp` IC-11 edit). Note the LBM § 4.1 lesson: bare `0.0` kernel locals infer f32 — any in-kernel accumulator (the per-particle G2P velocity/affine sums, the P2G grid writes) needs explicit `ti.f64(0.0)` seeds.
- **P2G is a SCATTER.** A faithful Taichi MLS-MPM P2G uses `ti.atomic_add` into the shared `grid_mass`/`grid_mom` fields. Two postures (probe § 6): **(i) serialised** (`cpu_max_num_threads=1` already pinned; if the particle struct-for + 27-cell stencil iterate in the reference's order, the scatter accumulation can match → bit-exact or FP-round-off scale — the LBM "atomic_add serialised to 1 thread" precedent); **(ii) parallel atomic-scatter** (accept the spec `epsilon` floor; cross-stack scatter-order divergence). **Lean (i) for the faithful, gate-14-passing port; surface the choice + its gate-14 consequence explicitly in the determinism docstring + Stage-1b checkpoint.** `determinism.atomic_ops` is reported accordingly (True if `ti.atomic_add` is used, even serialised).
- **G2P is a GATHER** (reads grid velocity, accumulates per-particle); no scatter; APIC affine reconstruction with the analytic `4/dx²` coefficient.
- **No global RNG.** Particle ICs use a deterministically-seeded `numpy.random.Generator` (blob rejection sampler; seed=42); the seed IS threaded (probe § 9 — NOT the banked "ignored-seed" defect). The Stack-D runner threads `seed` the same way and interpolates the actual seed into the descriptor where the Phase-1 reference hardcoded it (a clean-contract improvement on the NEW Stack-D code — NOT an edit to the sealed Phase-1 code).
- Phase 2+ deferred: GPU arch determinism; driver/vendor FMA fusion; subgroup-collectives; multi-material constitutive table; the literal Stack-E Warp port (the "epsilon"/atomic-scatter surface at GPU scale — informational per § F.4).

The same-stack contract (gate-10) is verified by IC-14 `run_twice_and_diff` over the parsed Capture projection at the diagnostic tier (`drop-impact-16cube-seed42-step50`).

#### § 1.4.2 Cross-stack equivalence posture (gate 14) — IC-15 PARTIAL methodology's FOURTH validation pair

(FACT — Appendix D.6 gate 14; spec § 2.6 + § 3.6; LBM `equivalence.md`; probe § 6.)

Gate 14 is the load-bearing cross-stack equivalence test: the Stack-D Taichi capture (RIGHT) is diff'd against the **Phase-1 NumPy+numba-reference capture (LEFT)** via `compare_captures` at `relative = 1e-4, absolute = 0.0` (HEAD `[defaults.mpm]`). Acceptance: `within_tolerance == True` across every captured frame (11 frames) and every state field (`particle_pos`, `particle_vel`, `grid_mom`; `particle_material_id` is constant-int and trivially equal).

> **The cross-stack partner is the NumPy+numba reference, not a GPU stack** (probe § 1.1) — the sph-water/LBM pattern. The relevant relation is reference-CPU (numba sequential `+=` scatter) ↔ Taichi-CPU (atomic-scatter, serialised or parallel per § 1.4.1).

**This is the IC-15 PARTIAL methodology's FOURTH validation pair, and the first to put deferred aspect #3 (atomic-scatter) in play** (probe § 3 / § 6). Aspects **#1 (chaotic)** — at most weakly via drop-impact contact (R-M2) — and **#5 (iterative-solver)** remain unexercised (single-pass explicit; no plastic flow; no Newton). So:
- The diff is genuinely empirical at 1e-4 (more headroom than LBM's 1e-5). Most-likely shape (probe § 6): **`within_tolerance=True` at FP-round-off-to-small scale** if the Stack-D scatter is serialised in the reference's order (posture (i)); a **non-trivial scale possibly approaching 1e-4** if parallel atomic-scatter (posture (ii)).
- The Stage 1c regime: run the diff at the full canonical step-horizon (D4; 500 steps, cadence-50, 11 frames); emit the per-field per-frame `max_abs_err`/`max_rel_err` witness verbatim **regardless of pass/fail**; perform explicit step-horizon analysis (R-M2: does the drop-impact diff grow toward 1e-4 by step 500?); **do NOT silently widen tolerance** (a widening requires a separate operator-approved commit + budget amendment per spec § 2.6 + § L). If gate-14 exceeds 1e-4, surface to operator per Hard Rule 2 BEFORE Stage 2 (R-M1 routing).

**Tolerance resolution (D6 — MANDATORY):** `sim.category = "hybrid-pg"` (physics-family) has no `[defaults.hybrid-pg]` row; `compare_captures` raises `KeyError` until Stage 1c adds `[overrides.mpm-multimaterial] category = "mpm"` (mapping to `[defaults.mpm]` = `1e-4`). **At-budget resolution wiring** (equals `[budgets.mpm.cross_stack]`), not a widening — the RD-2D/sph-water/LBM override precedent (probe § 4). The FOURTH per-sim override.

#### § 1.4.3 Code-verification posture (gate 4) — GOLDEN ONLY (no MMS)

(FACT — spec-ref § 6; Phase-1 landing; probe § 1.3.)

**A gate-level delta from the LBM Stack-D template, in the OPPOSITE direction.** LBM carried BOTH a golden arm (4a) AND an MMS arm (4b); **MPM carries the GOLDEN arm ONLY** — matching the sph-water template. The Stack-D port re-verifies:
- **Gate-4 — MLS-MPM quadratic-B-spline shape-function golden** (`tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`; `abs = 1e-15`; **4 discrete independent-reference anchors** per spec § 2.4, lifted at Phase-1 `4724284`): the port's `shape_functions.N(x)` reproduces the sample values + `partition_of_unity_sum(p)` at the canonical points. The trajectory uses the duplicated-in-kernel quadratic-B-spline weight formula (`base = floor(p/dx+0.5)−1`; `w0/w1/w2`) — the same closed form the golden pins.

The Stack-D port consumes the golden fixture read-only (no new golden table; Convention A). **No `_SUBDIRS_PICKED_UP` change** (the `hybrid-pg` golden subdir is already picked up per Phase-1 Stage 2 commit `9b19c26`).

> **Gate-numbering note (FACT — avoid Stage-1 confusion):** the Phase-1 MPM test docstrings use a +1-offset internal numbering ("gate 5" = code-verification, "gates 6+7" = diagnostics, "gate 11" = determinism, "gate 12" = PBT). This charter uses the **canonical Appendix D.6 numbering**: gate **4** = code-verification (golden), gate 5 = Tier 1, gate 6 = Tier 2 (BOTH `particle` IC-5 AND `vector_field` IC-6 per D.7), gate 10 = determinism, gate 11 = PBT, gate 12 = perf, gate 13 = replay, gate 14 = cross-stack. Match the canonical numbering in all Stack-D artifacts.

#### § 1.4.4 Atomic-scatter risk acknowledgment (deferred IC-15 aspect #3)

(FACT — IC-15 methodology doc § 2 item 3; probe § 3 / § 6 / D9.)

The IC-15 partial-formalization doc defers atomic-scatter handling as "a Stack-C (Vulkan) forward concern … Out of scope for Stack-D-only CPU ports." **This sub-phase puts it in play on the Stack-D Taichi CPU side**: a faithful Taichi MLS-MPM P2G uses `ti.atomic_add` into shared grid nodes, and even serialised (`cpu_max_num_threads=1`) the grid-node accumulation order (which particles hit a node, in what order) may differ from the numba reference's sequential `+=`. This is a *scatter*-accumulation FP surface, distinct from LBM's per-cell *reduction* surface (deferred aspect #4). Gate-14 yields the FIRST empirical data on aspect #3, at the 1e-4 category. This is the empirical contribution this pair makes to IC-15 (D5).

#### § 1.4.5 Phase-1 R-class inheritance + R-S6 fourth-pair calibration

(FACT — Phase-1 landing R-MPM-1..3 + R15; probe § 1.5.)
- **R-MPM-1 (P2G/G2P stencil-ordering mismatch)** inherited verbatim: the Stack-D port reuses the identical lex 27-cell `(di,dj,dk)` stencil order at both P2G and G2P call sites + the matched 1D weight formula.
- **R-MPM-3 (base-node off-by-one)** inherited: the Stack-D port pins `base = floor(p/dx+0.5)−1` from the golden table; no NaN/Inf signal masks a wrong base, so gate-4 golden + the diagnostic-tier step-state trace are the guards.
- **R15 (Phase-1 mutation STOP-AND-SURFACE on `mls_mpm.py`)**: informs the B17 mutation-artifact lean (PATH-B re-bank; the while-loop rejection-sampler + the large transfer kernels are mutation-pathological). The Stack-D port is single-sim Taichi-DSL.
- **R-S6 (methodology calibration, fourth pair):** the Phase-1 `sim.py` characterization (probe § 1) — MLS-MPM single-material neo-Hookean, single-pass explicit, atomic-scatter on the Stack-D side, NO MMS, ONE capture, correctly-seeded blob IC — IS the empirical anchor for R-M1..R-M6 + D5 + D7. Stage 0/1 agents re-read `sim.py` at HEAD; do NOT extrapolate from the LBM/sph-water shapes.

#### § 1.4.6 Taichi-specific risk acknowledgments inherited

(FACT — Taichi-integration § 9 R-T1..R-T5 verbatim.)
- **R-T1 (field-init order):** `set_taichi_deterministic`/`ti.init` precedes every `@ti.kernel` decoration.
- **R-T2 (`-> None` annotations forbidden):** Taichi 1.7.4 AST transformer raises on `-> None` kernels. Omit.
- **R-T3 (Python-3.12 locale-deprecation):** filterwarnings inherited from common-py pyproject.
- **R-T4 (workspace import via uv):** `packages/mpm-multimaterial-stack-d/` registers as workspace member; imports `from common_py.{determinism, capture} import ...`.
- **R-T5 (canonical-tier vs diagnostic-tier):** the port ships a canonical-tier runner (ONE capture, ~1 GiB / ~minutes) + a diagnostic-tier runner (`drop-impact-16cube-seed42-step50`) for the gate-10 determinism test to avoid paying canonical cost per pytest invocation.

### § 1.5 Role model, conventions, audit discipline

Inherited from § A.3 + § B + § C verbatim. Single Claude Code agent at a time; single coordinator chat; one operator. Convention #12 SHA back-fill at every stage close per § B.2 tightened-discipline + audit-chain-correctness Stage-1b N1 (enumerate EVERY placeholder-bearing audit committed in a stage). Commit-first-then-sha256 for text artifacts.

### § 1.6 Architecture — three stages

Three-stage cadence per § A.2. Stage 1 sub-decomposes into 1a/1b/1c per D2 lean (RD-2D + sph-water + LBM precedent):
- **Stage 0 — Pre-flight.** Replay; tolerance-budget carryover; Phase-1 reference capture sha256 reverify; empirical Taichi-DSL MLS-MPM kernel validation (R-M1/R-M3 — **the atomic-scatter posture probe**); golden Stack-D-consumability check; **R-S5 empirical `compare_captures` taxonomy-resolution check** against a synthetic `hybrid-pg` manifest; wall-clock note (R-M, 158 s reference); checkpoint + SHA back-fill.
- **Stage 1a — Failing-tests commit.** Test surface importing the yet-to-exist Stack-D modules; clean `ModuleNotFoundError`; failing-tests evidence + sha256.
- **Stage 1b — Implementation commit.** Stack-D Taichi MLS-MPM port (stress + P2G-scatter + grid-update + G2P/APIC + deformation-update + advect kernels); ONE canonical capture; gates 4–13 GREEN (gate-4 golden); spec sheet; probe report; perf-ledger row; determinism docstring declaring the chosen scatter posture.
- **Stage 1c — Cross-stack equivalence + landing-prep.** `[overrides.mpm-multimaterial]`; `equivalence.md` extension; gate-14 diff witness + step-horizon analysis; schema-corpus entry (D10 sizing decision).
- **Stage 2 — Landing.** Convergence edits; integrity sweep; portfolio-scale regression sweep (§ B.7); gate-13 worktree replay; IC-16-consuming evidence-path verification; **CI corpus round-trip verification (S-CI1)**; append-only check; **D5 IC-15 disposition**; landing audit + SHA back-fill.

Each sub-stage ships a checkpoint audit; Stage 2 the landing audit. No `-phase-N` tag (§ 11.4).

---

## § 2. Deliverables (per gate, expanded set)

The 14-gate per-port acceptance contract (Appendix D.6 + spec § 3.5). **Gate 4 carries the GOLDEN arm ONLY** (no MMS — the key delta from the LBM template). **ONE canonical capture** (gates 9 + 14 single, not doubled).

| # | Gate | MPM Stack-D deliverable | Acceptance |
|---|---|---|---|
| 1 | Spec sheet | `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-d.md` | 13-section template; § 5 cites Stack-D Taichi path; § 6 declares golden verification posture (no MMS); § 8 declares the determinism posture per § 1.4.1 (incl. the chosen atomic-scatter posture); § 9 declares cross-stack posture at `relative = 1e-4`. |
| 2 | Probe report | `tools/testkit/probes/reports/mpm-multimaterial-stack-d-probe.md` | Enumerates common-py + Taichi API surfaces consumed; upstream citations (Hu 2018; 88-line reference citation-only; Steffen-Kirby-Berzins 2008); public exports. |
| 3 | Failing tests + output hash | `packages/mpm-multimaterial-stack-d/tests/` + `tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-<UTC>.txt` + sha256 footer | Failing-tests footer `Failing-tests-output(-hash)`; impl footer `Implements-failing-tests-from` + `…-witnessed`. |
| 4 | **Code verification — golden** | `tests/test_quadratic_bspline_golden.py` (N(x) samples + partition-of-unity vs `hybrid-pg/mls-mpm-shape-functions.json`, `abs=1e-15`) | All sample values + PoU sums reproduce at the 4-anchor golden. **No MMS arm.** |
| 5 | Tier 1 diagnostics | `tests/test_diagnostics.py` Tier-1 `check_health` NaN/Inf scan | clean across captured frames. |
| 6 | Tier 2 (`particle` IC-5 + `vector_field` IC-6) | `tests/test_diagnostics.py` Tier-2: `check_count_invariance` + `check_momentum_conservation_drift` (IC-5 particle) + `check_circulation_grid_mom_l1` (IC-6 vector_field surrogate on `grid_mom`) | substack clean (count fixed; drift + L1 finite/bounded — advisory per spec-ref). FIRST sub-phase consuming BOTH IC-5 AND IC-6. |
| 7 | Cat 1 citations | spec-ref-stack-d.md § 2 cites Hu 2018 (DOI 10.1145/3197517.3201293) + 88-line reference (citation-only, R8) + Steffen-Kirby-Berzins 2008 (DOI) + reference cross-ref | `python -m integrity --cat 1` clean. |
| 8 | Cat 2 public API | `mpm_multimaterial_stack_d.{reference, sim, invariants}` exports match probe § 5 | `python -m integrity --cat 2` clean. |
| 9 | Canonical capture + corpus | `captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.{h5,json}` (D4) + schema-corpus entry at `tests/fixtures/legacy-captures/phase-2-mpm-multimaterial-stack-d.{h5,json}` (D10 — sizing decision: canonical ~1 GiB vs diagnostic-tier) | `load_capture` round-trips; manifest payload sha256 recorded (commit-first-then-sha256; `.h5` LFS — record content OID). |
| 10 | Determinism (IC-13) | `tests/test_determinism.py` invokes IC-14 `run_twice_and_diff(sim_runner_diagnostic, seed=42)` + R-D2 synthetic drift witness | `verdict.content_equivalent == True`. Determinism docstring per § F.1; cited in footer. |
| 11 | PBT (≥ 2 invariants) | `tests/test_pbt_invariants.py` ships `mass_conservation_p2g_g2p` + `partition_of_unity_b_spline` (spec-ref § 6.6) at `n_examples ≥ 50` | Hypothesis example DB committed. |
| 12 | Perf-ledger row | Row in `docs/perf-ledger.md`: `mpm-multimaterial \| taichi-cpu \| drop-impact-128cube-seed42-step500 \| <s> \| <hw_id> \| <commit> \| <date> \| baseline` | Wall-clock recorded; >2× the NumPy+numba baseline (158.052 s) flags to operator (R-M; Taichi parallel may be faster, JIT/serialised-scatter may be slower). |
| 13 | Failing-tests replay | `git worktree add … <stage-1a-sha>`; pytest reproduces `ModuleNotFoundError`; HEAD GREEN | structural reproduction per § E. |
| 14 (Phase-2) | Cross-stack equivalence | `compare_captures(numpy_numba_ref, stack_d)` at `relative = 1e-4` (LEFT = reference) | **Empirical** — verdict + per-field per-frame witness + step-horizon analysis documented in `equivalence.md` **regardless of pass/fail**. If exceeds 1e-4: STOP + surface per R-M1 (no silent widening). |

**Acceptance for "sub-phase complete":** gates 1–13 GREEN; gate-14 verdict landed with full step-horizon witness (a `within_tolerance == False` outcome that has been operator-routed per R-M1 is a legitimate landing state — the methodology validation is the deliverable, not a forced PASS); integrity sweep clean (byte-identical streak is informational — a new sim package may break it; NOT load-bearing); portfolio sweep GREEN; CI corpus round-trip GREEN (S-CI1); mutation artifact (B17 routing per § 11.5); D5 IC-15 disposition landed; landing audit + SHA back-fill. No `-phase-N` tag.

---

## § 3. Interface contracts

### § 3.1 ICs consumed (existing, not redefined)

(FACT — probe § 2.)
- **IC-2** — `common_py.capture.{Writer, load_capture}` (canonical capture write + gate-14 load).
- **IC-4** — `common_py.determinism.Config` (seed + deterministic flag).
- **IC-5** — Tier-2 `particle` substack (gate-6; count + momentum diagnostics).
- **IC-6** — Tier-2 `vector_field` substack (gate-6; grid-momentum field per D.7).
- **IC-8** — probe report § 5 is the public-API contract; gate-3 failing-tests ordering.
- **IC-9** — checkpoint + landing audits per § B.3.
- **IC-11** — `set_taichi_deterministic(config, arch="cpu")` at sim-runner entry.
- **IC-12** — `docs/common/taichi.md` rules (R-T1..R-T5).
- **IC-13** — content-equivalence contract (spec § 2.5); same-stack posture per § 1.4.1.
- **IC-14** — `run_twice_and_diff` (Python) consumed by gate-10.
- **IC-15 (PARTIAL)** — `docs/conventions/cross-stack-equivalence-methodology.md` (`3c2149f6…`): the 5 codified components consumed AS-IS + the § 4 LBM subsections (esp. § 4.1 f64-accumulator-seed). Deferred aspect #3 (atomic-scatter) is exercised (partial); #1/#5 not.
- **IC-16** — `verify_evidence` LFS-content-OID resolution; gate-5/Stage-2 evidence verification resolves the `.h5` LFS content OIDs automatically (no §B.6 annotation).

### § 3.2 ICs produced — IC-15 formalization disposition (D5)

This sub-phase is the FOURTH cross-stack pair. Whether to additively amend / substantively expand / promote-to-full / hold-unchanged the IC-15 doc at Stage 2 is **D5** (§ 11.5) — surfaced, not pre-committed; lean **(b) additive REFINEMENT** given the probe characterization (deferred aspect #3 in play partial; #1/#5 still open). If amended ((a)/(b)/(d)), subsequent cross-stack ports consume the updated `docs/conventions/cross-stack-equivalence-methodology.md` by reference; if held unchanged (c), the partial doc + per-sim `equivalence.md` pattern continue.

---

## § 4. Stage decomposition

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay** (canonical gate set against `v0.1.0-phase-1`). Bit-identity invariant match → proceed; mismatch → BLOCKED per P20; write `stage-0-blocked-replay-<UTC>.md`; surface; stop. Re-verify the pre-condition anchors (conventions `69aa39fc…`, architecture `e82b7b8e…`, methodology `3c2149f6…`, HEAD, 137 shifts).
- **Task 0.1 — Tolerance-budget carryover.** Edit `tolerance-budget.toml`: `[phase].phase = "sub-phase-mpm-multimaterial-stack-d"`, bump `opened_at`. NO `[budgets.*]` widening (`[budgets.mpm.cross_stack]` stays 1e-4). Commit `chore(mpm-multimaterial-stack-d-stage0-tolerance-budget): sub-phase carryover from sub-phase-lattice-boltzmann-d3q19-stack-d`.
- **Task 0.2 — Phase-1 reference capture sha256 reverify.** `git lfs ls-files` + content-OID the `.h5` (`73e00d09…b5ebae`); `git cat-file -p HEAD:<json> | sha256sum` the `.json` (`ea3531e0…28d1a2f`). Mismatch → BLOCKED (the reference is the gate-14 partner).
- **Task 0.3 — Empirical Taichi-DSL MLS-MPM kernel validation (R-M1/R-M3; LOAD-BEARING — the atomic-scatter posture probe).** Write a small smoke-tier MLS-MPM kernel (e.g. a few-hundred-particle blob on a 16³ grid, a few steps): verify it (a) runs under `set_taichi_deterministic(arch="cpu")`, (b) is `run_twice_and_diff`-content-equivalent, (c) reproduces the quadratic-B-spline golden at a sample point, and (d) **characterize the P2G scatter posture empirically** — does a serialised `ti.atomic_add` P2G accumulate in the reference's order (→ bit-exact / FP-round-off scale), or does Taichi's struct-for ordering diverge? Confirm the G2P gather + APIC reconstruction + neo-Hookean stress det/log branch are expressible deterministically. **If Taichi-DSL cannot express the P2G scatter deterministically at single-thread, OR the serialised scatter diverges from the reference at a scale that threatens 1e-4, STOP and surface per Hard Rule 2** (this is the D5/R-M1 calibration datum — it informs whether gate-14 is validation-at-fourth-regime or a stress-test, and whether D5 leans (b) or (d)).
- **Task 0.4 — Golden Stack-D-consumability check.** Verify `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` is loadable + its 4-anchor fixture feeds a Taichi-side shape-function evaluation. NOT a production gate-4 deliverable — a dependency check. (No MMS surface to check — MPM is golden-only.)
- **Task 0.5 — R-S5 empirical taxonomy-resolution check.** Empirically invoke `compare_captures` against a synthetic Stack-D manifest carrying real `sim.category="hybrid-pg"`, `sim.name="mpm-multimaterial"`, to confirm the `KeyError`-without-override behaviour and that the planned `[overrides.mpm-multimaterial] category="mpm"` resolves to `1e-4`. Catches the tolerance-resolution gap at Stage 0 rather than mid-Stage-1c.
- **Task 0.6 — Wall-clock note (R-M).** Record the Phase-1 baseline (158.052 s at 1M particles × 128³ × 500 steps). MPM is heavier than RD-2D/LBM (seconds) but lighter than sph-water Phase-1; the canonical capture costs ~minutes at Stage 1b. Note whether Taichi-cpu parallelism (if scatter posture (ii)) or serialised-scatter JIT (posture (i)) is expected faster/slower than the numba floor; instrument per the sph-water R-S3 precedent. NOT a structural alarm; the diagnostic tier keeps gate-10 fast.
- **Task 0.7 — D10 schema-corpus sizing pre-decision input.** Record the canonical `.h5` size (~1.05 GiB) and confirm `.gitattributes` `legacy-captures/**/*.h5 filter=lfs` covers the corpus path + CI `lfs:true`. Surface the corpus-entry sizing question (canonical ~1 GiB vs diagnostic-tier small) for operator routing at the plan-drafting landing / Stage 1c.
- **Closing.** `stage-0-checkpoint-<UTC>.md` per IC-9. Front-matter both `head_sha:` AND `head_sha_at_checkpoint:`. Commit `chore(mpm-multimaterial-stack-d-stage0-checkpoint): Stage 0 pre-flight complete`. Convention #12 SHA back-fill.

### § 4.2 Stage 1 — Implementation (3 sub-stages per D2 lean)

#### § 4.2.1 Stage 1a — Failing-tests commit (single session, single commit)

1. Create the Stack-D test surface at `packages/mpm-multimaterial-stack-d/tests/`: `__init__.py`, `conftest.py`, `test_quadratic_bspline_golden.py` (gate-4), `test_diagnostics.py` (Tier 1 + Tier 2 particle + vector_field), `test_pbt_invariants.py` (2 invariants), `test_determinism.py` (IC-14), `test_reference_sanity.py`, `test_cross_stack_equivalence.py` (gate-14; SKIP until 1c).
2. Each test imports `mpm_multimaterial_stack_d.{reference, sim, invariants}` (not yet existing).
3. `pytest packages/mpm-multimaterial-stack-d/tests/ -v` → all fail with clean `ModuleNotFoundError`.
4. Capture verbatim output to `tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-<UTC>.txt`; sha256 **of the committed blob** (commit-first-then-sha256).
5. Commit `test(mpm-multimaterial-stack-d-stage1a): failing tests for Stack-D port`. Footer `Failing-tests-output(-hash)`.

**Closing.** `stage-1a-checkpoint-<UTC>.md`; commit `chore(mpm-multimaterial-stack-d-stage1a-checkpoint): …`; SHA back-fill if needed.

#### § 4.2.2 Stage 1b — Implementation commit (single session, single commit)

**Determinism-strategy declaration first** (§ F.1 + § 1.4.1): docstring at the top of `sim.py` recording the chosen P2G atomic-scatter posture (serialised (i) lean / parallel (ii) if routed) + its gate-14 consequence + the lex particle×27-cell stencil order + f64-pin (with explicit `ti.f64(0.0)` accumulator seeds per LBM § 4.1) + correctly-threaded seed (NOT the Phase-1 hardcoded-descriptor residue) + Phase-2+ deferrals.

Per-task sequence (new-files-first per Convention A):
1. **Package skeleton.** `packages/mpm-multimaterial-stack-d/pyproject.toml` (workspace member: `bit-physics-{testkit,diagnostics,common-py}` + h5py + hypothesis + numpy + `taichi>=1.7,<2.0`; `[tool.uv.sources]` workspace=true) + `mpm_multimaterial_stack_d/__init__.py` + `reference/__init__.py` + `README.md`.
2. **Reference module(s)** `mpm_multimaterial_stack_d/reference/`: `shape_functions` (quadratic-B-spline N(x) + partition-of-unity for gate-4); MLS-MPM Taichi kernels mirroring the numba reference algorithm — `compute_particle_stresses` (neo-Hookean σ; det/log branch), `p2g_with_stress` (**the atomic-scatter kernel**; APIC affine + stress-fold; `ti.atomic_add` into grid_mass/grid_mom; chosen posture), `grid_update` (gravity + sticky-floor + axis-clamp walls), `g2p` (gather + APIC `4/dx²` reconstruction), `deformation_update` (F ← (I+dt·C)F), `advect_particles` (symplectic-Euler + interior clamp); canonical constants (E=4000, ν=0.3, dt=1e-4, blob geometry, floor z-index 4) mirrored verbatim. NO `-> None` annotations (R-T2).
3. **Sim wrapper** `mpm_multimaterial_stack_d/sim.py`: determinism docstring; `sim_runner_seeded(seed, out_dir) -> Path` (canonical `drop-impact-128cube-seed42-step500`; 1M particles × 128³ × 500, cadence-50; `set_taichi_deterministic` before fields/kernels; `common_py.capture.Writer`); `sim_runner_diagnostic(seed, out_dir) -> Path` (`drop-impact-16cube-seed42-step50` diagnostic-tier; threads `seed` correctly + interpolates it into the descriptor — clean contract).
4. **Invariants module** `mpm_multimaterial_stack_d/invariants.py`: `mass_conservation_p2g_g2p` + `partition_of_unity_b_spline` (spec-ref § 6.6).
5. **Spec sheet** `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-d.md` (13-section; § 6 golden posture, no MMS; § 8 determinism posture incl. scatter; § 9 cross-stack `1e-4`).
6. **Probe report** `tools/testkit/probes/reports/mpm-multimaterial-stack-d-probe.md`.
7. **Implement test bodies → GREEN** (gates 4–13; gate-4 golden); `test_cross_stack_equivalence.py` SKIP at 1b. Capture GREEN evidence + sha256.
8. **Canonical capture (gate 9).** `sim_runner_seeded(seed=42, …)` → `drop-impact-128cube-seed42-step500.{h5,json}` into `captures/mpm-multimaterial-stack-d/`. Record sidecar sha256 (commit-first-then-sha256; `.h5` LFS → content OID).
9. **Perf-ledger row** (gate 12).
10. **Workspace member registration** in root `pyproject.toml` `[tool.uv.workspace].members`.
11. **Gate-13 worktree replay** at the Stage 1a SHA.
12. **Commit** `feat(mpm-multimaterial-stack-d-stage1b): Stack-D Taichi MLS-MPM implementation through gate 13`. Footer cites Stage 1a evidence sha, GREEN evidence sha, capture sidecar sha256s, perf wall-clock, determinism docstring path (incl. scatter posture), gate-4 golden result, `Implements-failing-tests-from` + `…-witnessed`.

**Closing.** `stage-1b-checkpoint-<UTC>.md` (gates 4–13 GREEN; gate-14 PENDING-1c; record the empirical same-stack determinism outcome of the chosen scatter posture); commit `chore(mpm-multimaterial-stack-d-stage1b-checkpoint): …`; SHA back-fill.

#### § 4.2.3 Stage 1c — Cross-stack equivalence + landing-prep (single session, single commit)

1. **Add `[overrides.mpm-multimaterial]` to `tolerance.toml`** (`category = "mpm"`; at-budget; preserve existing comments — Convention A). MANDATORY (D6).
2. **Extend `docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md` additively** (the Phase-1 stub exists — preserve its tolerance-row + cross-stack-scope tables; populate the 5 IC-15 methodology sections; update the stale "Stack-D self-replicates / not yet exercised" framing to the actual NumPy+numba-reference ↔ Taichi pair; document the atomic-scatter posture + its gate-14 consequence).
3. **Run gate-14 diff.** `compare_captures(captures/mpm-ref/drop-impact-128cube-seed42-step500.json, captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.json)`. Capture output verbatim to Stage-1c evidence. Document `within_tolerance`, per-field per-frame `max_abs_err`/`max_rel_err` (`particle_pos`, `particle_vel`, `grid_mom`), **step-horizon analysis (R-M2 — does the drop-impact diff grow toward 1e-4 by step 500?)**.
4. **Gate-14 disposition.** If `within_tolerance == True`: GREEN. If `False`: document the field + step at which `1e-4` is exceeded; **STOP and surface to operator per Hard Rule 2 BEFORE Stage 2** (R-M1 routing). Do NOT silently widen. Do NOT pre-commit a shorter horizon (D4). If the atomic-scatter aggregate-grid-state divergence is not captured by per-particle position-exact comparison, surface **D8** (per-grid-node mass histogram / Σ-mass / Σ-momentum conservation / energy projection).
5. **Schema-corpus entry (D10).** Copy the chosen capture to `tests/fixtures/legacy-captures/phase-2-mpm-multimaterial-stack-d.{h5,json}` per the operator's D10 routing (canonical ~1 GiB via LFS, OR the small diagnostic-tier capture); record sha256. The `.gitattributes` LFS rule applies automatically.
6. **Un-skip `test_cross_stack_equivalence.py`** (verify GREEN if gate-14 passed; if routed-fail, the test reflects the operator-routed acceptance state).
7. **Commit** `feat(mpm-multimaterial-stack-d-stage1c): cross-stack equivalence harness extension + gate 14 verdict`. Footer cites the capture sha256, the equivalence verdict + per-field witness, step-horizon, `equivalence.md` sha, schema-corpus sha, `[overrides.mpm-multimaterial]`.

**Closing.** `stage-1c-checkpoint-<UTC>.md` (14-row gate table + gate-14 witness + step-horizon); commit `chore(mpm-multimaterial-stack-d-stage1c-checkpoint): …`; SHA back-fill.

### § 4.3 Stage 2 — Landing (single session if Stage 1 clean)

Inherits LBM § 4.3 Steps 2.1 → 2.13. Deltas:
- **2.1 — Anchor re-check.** Re-grep every path/SHA/sha256 across charter + 3 Stage-1 checkpoints + Stage 0 + spec sheet + probe report + extended `equivalence.md` + capture sidecar. Cite post-back-fill HEAD shas.
- **2.2 — Portfolio-scale regression sweep (§ B.7).** Python fan-out incl. new `packages/mpm-multimaterial-stack-d` + tools + common-py; TypeScript fan-out (NO-OP — Python-only port). Counts canonical; verify the existing `[overrides.{reaction-diffusion-2d,sph-water,lattice-boltzmann-d3q19}]` non-interference; sweep-output sha256 informational.
- **2.3 — Cat 3 disposition.** `hybrid-pg` golden subdir already picked up (Phase-1 `9b19c26`); the port ships NO new golden table. **NO-OP — no `_SUBDIRS_PICKED_UP` change.**
- **2.4 — Integrity sweep** (Cat 1–5 + X). Byte-identical streak may break (new sim package); document per-Cat deltas; **informational, NOT load-bearing**.
- **2.5 — Evidence-path verification (IC-16).** `verify_evidence` over all new sub-phase audits; the `.h5` LFS content OIDs resolve automatically (no §B.6 annotation). Confirm + document.
- **2.6 — Gate-13 replay** per § E.
- **2.7 — Append-only check** vs `v0.1.0-phase-1`. Document legitimate additive amendments (`tolerance.toml` `[overrides.mpm-multimaterial]`; `equivalence.md` extension; `test_cross_stack_equivalence.py` SKIP-removal; IC-15 methodology-doc amendment if D5 (a)/(b)/(d); `packages/mpm-multimaterial/` UNCHANGED — D7 close-non-defect). Conventions doc + architecture UNCHANGED.
- **2.8 — Mutation artifact (B17).** Default lean PATH-B re-bank (single-sim Taichi-DSL port; per Phase-1 MPM R15 mutation-pathology — the rejection-sampler while-loop + large transfer kernels; per sph-water/LBM § 4.3). Operator may route PATH-A.
- **2.9 — Convergence edits + CI corpus round-trip (S-CI1).** CHANGELOG additive; `dependencies.md` additive (NEW workspace member + Taichi-DSL); perf-ledger row (cross-check from 1b). **Verify the schema-corpus round-trip in CI (via `gh`) — NOT just local — before declaring Stage 2 GREEN** (S-CI1 banked: local LFS smudge can mask CI behaviour).
- **2.10 — D5 IC-15 disposition.** Per the gate-14 empirical margin + the Stage-1b scatter posture: lean **(b)** additively amend `docs/conventions/cross-stack-equivalence-methodology.md` (validated fourth physics family [hybrid-pg]; deferred aspect #3 [particle-scatter FP-accumulation] now has data; the atomic-scatter-posture pattern; golden-only single-capture variant) while keeping #1/#5 deferred; **(d)** SUBSTANTIVE EXPANSION if parallel scatter + non-trivial divergence required D8; **(a)** FULL if operator routes it (premature — #1/#5 unexercised); **(c)** hold unchanged (too weak). **Additive amendment only (Convention A); never rewrite the partial doc's history.**
- **2.11 — Landing audit.** `landing-<UTC>.md` per IC-9; `artifact: sub-phase`, `artifact_id: sub-phase-mpm-multimaterial-stack-d`; both `head_sha:` AND `head_sha_at_checkpoint:`; enumerate all evidence_paths + evidence_hashes; verdict-state per outcome.
- **2.12 — Convention #12 SHA back-fill** (enumerate EVERY placeholder-bearing audit in the stage). NEVER `--amend`.
- **2.13 — Final summary.** No `-phase-N` tag (lean: NO intermediate tag). Surface landing path, 14-gate table, D1–D10 verdicts, D5 IC-15 disposition, next-sub-phase recommendation.

---

## § 5. Dispatch — operator workflow

Inherited from LBM § 5 verbatim. Identity reads "mpm-multimaterial-stack-d sub-phase coordinator chat"; § 7 prompts are the dispatchable units. **Tag posture:** no `-phase-N` tag; lean no intermediate tag.

---

## § 6. Coordinator prompt

Inherits LBM § 6; identity "mpm-multimaterial-stack-d sub-phase coordinator chat"; running-log:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| plan-drafting | probe + charter + landing + SHA back-fill | pending | — | — | D1–D10 routing |
| 0 | replay + tolerance carryover + reference reverify + **Taichi-MLS-MPM-kernel validation incl. atomic-scatter posture (R-M1/R-M3)** + golden check + **R-S5 taxonomy check** + D10 sizing input | pending | — | — | — |
| 1a | failing-tests commit (gate 3 anchor) | pending | — | — | — |
| 1b | Stack-D Taichi MLS-MPM impl (gates 4–13; gate-4 golden; ONE capture; scatter posture declared) | pending | — | — | — |
| 1c | cross-stack equivalence (gate 14) + `[overrides.mpm-multimaterial]` + equivalence.md extension | pending | — | — | empirical @ 1e-4 |
| 2 | integrity + portfolio sweep + IC-16 evidence verify + **CI corpus round-trip (S-CI1)** + mutation + convergence + **D5 IC-15 disposition** + landing + SHA back-fill | pending | — | — | — |

---

## § 7. Per-stage agent prompts

All prompts share the **sub-phase standing orders** (inherited from LBM § 7 with substitutions):
- Commit slug `chore`/`feat`/`test`/`docs` + `mpm-multimaterial-stack-d-stage<N><a|b|c>-<scope>` (non-phase form; § C.1).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/`, `tools/testkit/{determinism, capture, equivalence, code_verification}/`.
- Audit front-matter both `head_sha:` AND `head_sha_at_checkpoint:` (§ B.3).
- Convention #8 — never assert from memory; grep/verify every path / signature / sha256 / spec section. **Use the canonical Appendix D.6 gate numbering, NOT the Phase-1 MPM +1-offset docstring numbering (§ 1.4.3).**
- Convention A — additive edits to pre-existing files only; new files first. Never edit Phase-1-sealed `packages/mpm-multimaterial/` (D7 close-non-defect; the seed is NOT a defect per probe § 9) or any prior audit chain.
- Convention #12 — never `--amend`; SHA back-fill at EVERY stage close; enumerate EVERY placeholder-bearing audit.
- Commit-first-then-sha256 for text artifacts.
- `verify_evidence` resolves LFS content OIDs (IC-16); use `sha256:HEX` prefix form.
- Empty-file rejection (Taichi-integration N6): pytest-subpackage `__init__.py` files start with `"""` docstring.
- Hard Rule 2 — STOP and surface on structural wrongness (Taichi-DSL cannot express the P2G atomic-scatter deterministically at single-thread; serialised scatter diverges from the reference at a scale threatening 1e-4; gate-14 exceeds 1e-4; reference capture sha256 drifts; the Phase-1 MPM characterization surfaces something other than single-material MLS-MPM neo-Hookean).

### § 7.1 Stage 0 — Pre-flight

```
You are the mpm-multimaterial-stack-d sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-mpm-multimaterial-stack-d.md (this charter — source of truth). § 7 standing orders.
  2. docs/conventions/sub-phase-conventions.md (sha256 69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45 — verify at HEAD).
  3. docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/plan-drafting-probe-2026-05-24T11-45-06Z.md (probe — Phase-1 S6 baseline + infra + IC-15-partial + tolerance.toml + capture sha256s + atomic-scatter framing + dispatch-anchor shifts + D1-D10 + D7 falsification).
  4. docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/landing-2026-05-24T04-15-37Z.md (the structural exemplar; § 9 R-L/f64-seed playbook, § 11 D-routing + S6, § 12 banked items).
  5. docs/_audits/phase-2/sub-phase-sph-water-stack-d/landing-2026-05-24T02-00-04Z.md (the golden-only + S6 simplified-variant exemplar).
  6. docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md (the Phase-1 reference baseline; gate-4 golden; R-MPM-1..3 + R15; ONE canonical capture).
  7. docs/sim-specs/hybrid-pg/mpm-multimaterial/{spec-ref,algebraic,determinism,equivalence}.md.
  8. packages/mpm-multimaterial/mpm_multimaterial/{sim.py, reference/{__init__,mls_mpm,shape_functions}.py, invariants.py} (the NumPy+numba reference to port — algorithm + determinism docstring + the single-material neo-Hookean + atomic-scatter-on-Stack-D framing).
  9. common/common-py/src/common_py/determinism.py (IC-11 set_taichi_deterministic) + tools/testkit/taichi_harness/ + a Taichi smoke exemplar.
  10. tools/testkit/equivalence/{harness.py, tolerance.toml, tolerance-budget.toml}.
  11. tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json (gate-4 golden — read-only; cite sha256).

Stage 0 is pre-flight only; you do NOT implement the port (Stage 1).

Execute Tasks 0.0 → 0.7 → closing per charter § 4.1 exactly. LOAD-BEARING: Task 0.3 (empirical Taichi-DSL MLS-MPM kernel validation — the P2G atomic-scatter posture probe: does serialised ti.atomic_add accumulate in the reference's order at FP-round-off scale, or diverge? this is the D5/R-M1 calibration datum; if Taichi cannot express the scatter deterministically or it diverges threateningly, STOP and surface) and Task 0.5 (R-S5 empirical compare_captures taxonomy-resolution against a synthetic hybrid-pg manifest).

Out of scope: any Stage 1 implementation; any edit outside tolerance-budget.toml + new audit files + Stage-0 throwaway smoke-tier scratch; any edit to packages/mpm-multimaterial/ (Phase-1-sealed; D7 — the seed is NOT a defect, do not "fix" it).

Stuck → conventions doc § 9 + charter § 9. Hard Rule 2 applies.
```

### § 7.2 Stage 1a — Failing-tests commit

```
You are the mpm-multimaterial-stack-d sub-phase Claude Code agent, Stage 1a (failing-tests commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-mpm-multimaterial-stack-d.md §§ 2 (deliverables), 4.2.1 (Stage 1a sequence), 7 (standing orders).
  2. docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-checkpoint-<UTC>.md.
  3. packages/mpm-multimaterial/tests/*.py (the Phase-1 reference test surface — mirror its shape; gate-4 is GOLDEN-only [test_quadratic_bspline_golden.py]; NO MMS; USE the canonical Appendix D.6 gate numbering, NOT the Phase-1 docstrings' +1-offset).
  4. docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref.md §§ 6 (golden + PBT invariants), 8 (determinism), 10 (diagnostics).
  5. packages/sph-water-stack-d/tests/ + packages/lattice-boltzmann-d3q19-stack-d/tests/ (the cross-stack-port test-surface templates; sph-water for golden-only shape, LBM for the cross-stack-equivalence test shape).

Scope — charter § 4.2.1: create the test surface at packages/mpm-multimaterial-stack-d/tests/ importing mpm_multimaterial_stack_d.{reference,sim,invariants}; verify clean ModuleNotFoundError; capture + sha256 the committed evidence blob (commit-first-then-sha256); commit per § 4.2.1.

Closing — stage-1a-checkpoint-<UTC>.md; SHA back-fill. Stop.

Out of scope: implementation (1b); equivalence (1c); any edit outside the new tests/ + failing-tests-evidence + audit files.
Hard Rule 2 applies.
```

### § 7.3 Stage 1b — Implementation commit

```
You are the mpm-multimaterial-stack-d sub-phase Claude Code agent, Stage 1b (implementation commit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-mpm-multimaterial-stack-d.md §§ 1.4 (posture; esp. 1.4.1 atomic-scatter posture), 2 (deliverables), 3 (ICs), 4.2.2 (Stage 1b 12-step), 7, 9 (R-M playbook).
  2. docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/{stage-0,stage-1a}-checkpoint-<UTC>.md (the Stage-0 atomic-scatter posture finding is load-bearing).
  3. packages/mpm-multimaterial/mpm_multimaterial/{reference/{mls_mpm,shape_functions,__init__}.py, sim.py, invariants.py} (the NumPy+numba reference; port to Taichi-DSL preserving algorithm + the lex particle×27-cell stencil order; single-material neo-Hookean; APIC 4/dx² reconstruction; symplectic-Euler advect; sticky-floor BC).
  4. common/common-py/smoke/ Taichi exemplar + docs/common/taichi.md (IC-12; init form, arch=cpu, no -> None).
  5. common/common-py/src/common_py/{determinism.py, capture.py} (IC-11 + IC-2).
  6. tools/testkit/determinism/harness.py (IC-14; gate-10).
  7. tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json (gate-4; read-only).
  8. packages/lattice-boltzmann-d3q19-stack-d/ + packages/sph-water-stack-d/ (Stack-D structural exemplars: pyproject, sim.py runner shape, common_py.capture.Writer usage, f64-pin + ti.f64(0.0) accumulator seeds per LBM methodology § 4.1).

Determinism-strategy declaration FIRST (charter § 1.4.1 + § F.1): chosen P2G atomic-scatter posture (serialised lean per Stage-0 finding) + gate-14 consequence; lex particle×27-cell order; f64-pin with explicit ti.f64(0.0) accumulator seeds; correctly-threaded seed.

Scope — charter § 4.2.2 12-step (single sub-bundle commit). Gate-4 is GOLDEN-only (no MMS). ONE canonical capture (drop-impact-128cube-seed42-step500; ~1 GiB, ~minutes). The P2G atomic-scatter kernel + APIC reconstruction is the single most complex unit.

Closing — stage-1b-checkpoint-<UTC>.md (gates 4-13 GREEN; gate-14 PENDING-1c; record the same-stack determinism outcome of the chosen scatter posture); SHA back-fill. Stop.

Out of scope: cross-stack (1c); landing (2); modification of packages/mpm-multimaterial/ (append-only; D7).
Hard Rule 2 — STOP on Taichi 1.7.4 atomic-scatter non-determinism at single-thread; serialised-scatter divergence threatening 1e-4; golden reproduction failure; canonical descriptor unreachable; non-single-material-MLS-MPM surprise.
```

### § 7.4 Stage 1c — Cross-stack equivalence + landing-prep

```
You are the mpm-multimaterial-stack-d sub-phase Claude Code agent, Stage 1c (cross-stack equivalence) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-mpm-multimaterial-stack-d.md §§ 1.4.2 (cross-stack posture), 1.4.4 (atomic-scatter aspect #3), 2 (gate 14), 4.2.3 (Stage 1c 7-step), 7, 9 (R-M1/R-M2/D8).
  2. docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-1b-checkpoint-<UTC>.md (Stack-D capture sha256 + scatter posture).
  3. tools/testkit/equivalence/{harness.py, tolerance.toml, tolerance-budget.toml}.
  4. docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md + docs/sim-specs/particle-fluids/sph-water/equivalence.md (the IC-15 5-section authoring templates — what to author into MPM's equivalence.md).
  5. docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md (the PRE-EXISTING Phase-1 stub — EXTEND additively, preserve existing tables, Convention A).
  6. docs/conventions/cross-stack-equivalence-methodology.md (IC-15 partial — the 5 codified components + § 4 LBM subsections to instantiate).
  7. docs/architecture.md § 2.6 (tolerance table) + § 3.6.

Scope — charter § 4.2.3. MANDATORY first step: add [overrides.mpm-multimaterial] category="mpm" (KeyError on sim.category="hybrid-pg" without it). Run gate-14 NumPy+numba-ref ↔ Stack-D for the canonical capture; emit per-field per-frame witness (particle_pos, particle_vel, grid_mom) + step-horizon analysis REGARDLESS of pass/fail.

Gate-14 is EMPIRICAL at 1e-4 (more headroom than LBM's 1e-5, but the atomic-scatter surface is genuinely new). If within_tolerance==False at 1e-4: document the field+step of exceedance; STOP and surface per Hard Rule 2 BEFORE Stage 2. Do NOT silently widen (spec § 2.6 + § L). Do NOT pre-commit a shorter horizon. R-M2: check whether the drop-impact diff GROWS over the 500-step horizon. If aggregate-grid-state divergence is not captured by per-particle position-exact comparison, surface D8 (per-grid-node mass histogram / Σ-mass / Σ-momentum / energy projection).

Closing — stage-1c-checkpoint-<UTC>.md (14-row gate table + gate-14 witness + step-horizon); SHA back-fill. Stop.
Hard Rule 2 applies.
```

### § 7.5 Stage 2 — Landing

```
You are the mpm-multimaterial-stack-d sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-mpm-multimaterial-stack-d.md §§ 4.3 (Stage 2 13-step), 7, 11 (coherence + D1-D10 routings as decided by operator — especially D5 IC-15 disposition + D7 close-non-defect + D10 corpus sizing).
  2. docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/{stage-0,stage-1a,stage-1b,stage-1c}-checkpoint-<UTC>.md.
  3. docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/landing-2026-05-24T04-15-37Z.md (Stage 2 template; § 9 shifts; § 11 banked-items + D5 additive-amendment landing precedent; S-CI1 + LFS-rule resolution).
  4. docs/conventions/cross-stack-equivalence-methodology.md (the IC-15 partial doc to additively amend per D5 routing).

Execute Steps 2.1 → 2.13 per charter § 4.3. IC-16: evidence-path verification resolves the .h5 LFS content OID automatically. S-CI1: verify the schema-corpus round-trip in CI (via gh) — NOT just local — before declaring Stage 2 GREEN.

D5 (most consequential): per the Stage-1c gate-14 empirical margin + the Stage-1b scatter posture, additively amend the IC-15 methodology doc — lean (b) REFINEMENT (validated fourth physics family [hybrid-pg] + deferred aspect #3 [particle-scatter FP-accumulation] data + atomic-scatter-posture pattern + golden-only single-capture variant; keep #1/#5 deferred), OR (d) SUBSTANTIVE EXPANSION if parallel scatter + D8 activated, OR (a) FULL if operator routes it, OR (c) hold unchanged. Additive only (Convention A). D7: packages/mpm-multimaterial/ stays UNCHANGED (close-non-defect — the seed is correctly threaded per probe § 9).

Acceptance: gates 1-13 GREEN; gate-14 verdict landed with full witness (a routed within_tolerance==False is a legitimate landing state); portfolio sweep GREEN; CI corpus round-trip GREEN (S-CI1); integrity sweep clean (streak may break — informational); evidence verify clean; append-only clean; mutation artifact (PATH-B lean); D5 disposition landed; landing audit + SHA back-fill.

If Stage 2 surfaces a CONFIRMED-blocking regression, STOP and SURFACE per Hard Rule 2.
Stuck → conventions doc § 9 + charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits § A.3 + § A.4 + § B.2. Stage 0 / 1a / 1b / 1c each ship a checkpoint; Stage 2 the landing audit. All five closes followed by Convention #12 SHA back-fill (enumerate EVERY placeholder-bearing audit per audit-chain-correctness N1). Commit-first-then-sha256 for every text artifact.

---

## § 9. Risk surface + problem-solving playbook

Inherits conventions doc § 9 playbook (P1–P27) + RD-2D § 9 R-P1/R-P3/R-P4/R-P5/R-P6 (where applicable) + sph-water R-S3 (wall-clock instrumentation) / R-S5 (Stage-0 taxonomy check) / R-S6 (methodology-calibration) + LBM R-L1 (FP-accumulation at gate-14) / R-L5 (S6 load-bearing) framing + Taichi-integration R-T1–R-T5. **NEW R-class entries SPECIFIC to this sub-phase:**

- **R-M1 — Atomic-scatter at P2G (the first pair exercising deferred IC-15 aspect #3).** A faithful Stack-D Taichi MLS-MPM P2G uses `ti.atomic_add` into shared grid nodes. The cross-stack grid-node accumulation order may differ from the numba reference's single-thread sequential `+=`, even serialised. At the 1e-4 category there is more headroom than LBM's 1e-5, but the scatter surface is genuinely new. *Mitigation:* Stage-0 Task 0.3 characterizes the serialised-scatter order empirically (validation-vs-stress-test calibration); `cpu_max_num_threads=1` serialisation (LBM precedent); Stage-1c explicit per-field + per-step diff witness regardless of pass/fail; binary-search the first step exceeding 1e-4, then per-field (`particle_pos`/`particle_vel`/`grid_mom`); operator routing if approaches/exceeds 1e-4 (tolerance amendment per spec § 2.6 + budget amendment; OR step-horizon override; OR comparison-projection per D8). Do NOT silently widen.
- **R-M2 — Drop-impact trajectory amplification over horizon (mild R-P2 candidate).** Unlike the prior pairs' smooth/laminar/free-fall regimes, the MPM trajectory is a contact-rich elastic drop-impact (rebound off a sticky floor) over 500 steps; the `j_det ≤ 0 → log_j = −30.0` non-smooth stress branch could amplify a small cross-stack divergence. NOT formally chaotic, but a stronger amplification candidate than RD-2D/sph-water/LBM. *Mitigation:* Stage-1c step-horizon roll-up identifies whether the diff grows toward 1e-4 by step 500 (vs the prior pairs' flat FP-round-off); if it grows, that is the R-P2-escape-hatch data point IC-15 deferred aspect #1 wants (partial).
- **R-M3 — Iterative components (absent at HEAD; guard against scope-creep).** The Phase-1 reference is single-pass explicit (no Newton/implicit/substep — probe § 1.2); deferred IC-15 aspect #5 is NOT exercised. *Mitigation:* the Stack-D port mirrors the single-pass cycle; do NOT introduce an implicit/iterative MPM variant (out of scope). If the Phase-1 reference is mischaracterized at Stage-0 re-read (it is not, per probe), STOP and surface.
- **R-M4 — D7 fold-in premise FALSIFIED (no scope expansion).** The dispatch's D7 (a) FOLD-IN leans on a "MPM seed-propagation defect" that does NOT exist at HEAD (probe § 9 — MPM threads its seed correctly; only the descriptor filename is hardcoded, cosmetic, never problematic). *Mitigation:* D7 = close-non-defect; NO edit to Phase-1-sealed `packages/mpm-multimaterial/`; the NEW Stack-D runner threads + interpolates the seed cleanly. There is NO seal-exception to request. Do NOT "fix" the sealed code.
- **R-M5 — S6 banked precedent application (load-bearing for this entire sub-phase's risk profile).** The Phase-1 MPM `sim.py` characterization (probe § 1) — MLS-MPM single-material neo-Hookean, single-pass explicit, atomic-scatter on the Stack-D side, NO MMS, ONE capture, correctly-seeded blob IC — IS the empirical anchor for R-M1..R-M4 + D5 + D7. Stage 0/1 agents re-read `sim.py` at HEAD; do NOT extrapolate from the LBM/sph-water/RD-2D shapes.
- **R-M6 — D5 (a) FULL-FORMALIZATION ambiguity.** Even though MPM puts deferred aspect #3 (atomic-scatter) in play, full-formalization scope encompasses ALL deferred aspects (#1 chaotic + #3 atomic-scatter + #5 iterative). MPM exercises #3 partially (serialised lean) + #1 at most weakly (drop-impact) + #5 not at all. So a partial-amendment (b) — or substantive expansion (d) if parallel scatter — is the more honest disposition; (a) FULL is premature unless the operator reads "full" as "promote the 5 CODIFIED components" while carrying #1/#5 as explicit future scope. Surface this calibration at Stage 2 D5 routing.
- **R-M7 — Schema-corpus + wall-clock sizing (D10 + S-CI1).** The canonical `.h5` is ~1.05 GiB; a corpus COPY doubles LFS storage to ~2 GiB. *Mitigation:* surface the canonical-vs-diagnostic-tier corpus-entry choice at D10; the `.gitattributes` LFS rule + CI `lfs:true` are configured (probe § 2); verify the corpus round-trip in CI (via `gh`) before declaring Stage-2 GREEN (S-CI1 — local LFS smudge can mask CI behaviour). Wall-clock: 158 s reference; instrument the Stack-D canonical-capture generation at Stage 1b (R-S3 precedent).

### § 9.1 Playbook note (P27-analog inheritance)

RD-2D/sph-water/LBM P27 (cross-stack content-equivalent diff debugging) is inherited with MPM-specific cause ordering for gate-14 exceedance: (1) different IC across stacks — assert step-0 bit-identical first (the seeded blob sampler must produce identical particles; if not, the Taichi-side RNG/sampling order differs from numpy — a bug, not round-off); (2) **P2G atomic-scatter accumulation-order delta (R-M1; the primary suspect)** — which particles hit a grid node, in what order; (3) G2P/APIC reconstruction term-order; (4) neo-Hookean stress det/log branch + the `j_det ≤ 0` clamp threshold; (5) deformation-gradient 3×3 multiply order; (6) advect/clamp boundary handling; (7) capture-descriptor mismatch (sim name/variant/frames/dims/N_particles). Debug-step: binary-search the step at which divergence first exceeds 1e-4, then per-field (`grid_mom` — the scatter target — first), then particle-region (interior vs floor-contact cells).

---

## § 10. Audit-trail discipline

Inherits § B verbatim. Sub-phase audit dir: `docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/`. All append-only per § B.1. Stage 0/1a/1b/1c checkpoints use `artifact: stage`; Stage 2 landing uses `artifact: sub-phase` (`artifact_id: sub-phase-mpm-multimaterial-stack-d`). IC-16 means evidence verification resolves LFS content OIDs without §B.6 annotation.

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

Parent audits: Phase-1 MPM landing (`bd89e78`) + Taichi-integration + capture-determinism-contract + RD-2D Stack-D + sph-water Stack-D + LBM Stack-D + audit-chain-correctness landings (full list at the plan-drafting landing audit front-matter). The 14-gate deliverable list derives from the probe + the LBM Stack-D template + the Phase-2 14th gate, with gate-4 carrying the GOLDEN arm ONLY (no MMS) per spec-ref § 6 and ONE canonical capture.

**Cumulative shifts entering this sub-phase: 137** (LBM Stack-D landing § 9). Plan-drafting closing-shift count: **143** (probe § 10: S-M1 spec-item-2.3-Stack-E-only; S-M2 tolerance-1e-4; S-M3 full-name-D1-naming; S-M4 D7-falsified-no-seed-defect; S-M5 S6-single-material-neo-Hookean; S-M6 scope-shape golden-only + one-capture + IC-5+IC-6 + atomic-scatter-surface) — confirmed at the plan-drafting landing audit.

### § 11.2 Banked items inherited + disposition

| # | Item | Disposition at this charter close |
|---|---|---|
| 1 | **IC-15 full-formalization opportunity** | **OPERATIVE (D5)** — this IS the fourth cross-stack pair; first to put deferred aspect #3 (atomic-scatter) in play. Lean (b) additive REFINEMENT (not (a) full) per probe § 3/§ 6 (#3 partial; #1 weak; #5 unexercised). (d) substantive expansion if parallel scatter + D8. Surfaced at § 11.5 D5. |
| 2 | **LBM/MPM `sim_runner_diagnostic` defect** | **MPM-side FALSIFIED at HEAD (D7)** — MPM threads its seed correctly (probe § 9); there is NO substantive defect to fold in (SHIFT from the dispatch's (a) FOLD-IN). Lean **close the MPM-side bank as not-a-defect** (cosmetic descriptor-hardcode only). The LBM-side stays banked per LBM § 12 (analytic-IC cosmetic). Surfaced at § 11.5 D7. |
| 3 | LFS-rule for `tests/fixtures/legacy-captures/` | **RESOLVED** at LBM Stage 2 (`.gitattributes` `legacy-captures/**/*.h5 filter=lfs`); applies automatically to this sub-phase's corpus entry. D10 surfaces the ~1 GiB sizing question. |
| 4 | S-CI1 (CI corpus round-trip verification) | **LIVE** — Stage-2 Step 2.9 verifies the corpus round-trip in CI (via `gh`) before declaring GREEN (local LFS smudge can mask CI behaviour). |
| 5 | IC-15 D8 comparison-projection axis | **DEFERRED** unless Stage-1c parallel-scatter divergence requires it (probe § 8 D8). |
| 6 | MPM `mls_mpm.py` mutation completion (Phase-1 R15 bank) | **DEFER** — Phase-1-reference surface; informs the B17 mutation lean (PATH-B). Not the Stack-D port. |
| 7 | §B.6 verify_evidence LFS fix | **RESOLVED** at audit-chain-correctness (IC-16) — consumed here. |
| 8 | Taichi-integration testing-improvements + mid-Phase-1 capture regeneration | **UNCHANGED** (forward-routable; not in scope). |

### § 11.3 Outputs

After this sub-phase lands:
- **The FOURTH per-sim Stack-D port** + the **first hybrid particle-grid (MPM) cross-stack port** in the portfolio.
- **The IC-15 PARTIAL methodology's fourth validation pair** — validating the 5 codified components at a fourth physics family (hybrid-pg) AND contributing the first empirical data on deferred aspect #3 (atomic-scatter / particle-scatter FP-accumulation), at the 1e-4 category. Structural exemplar for the golden-only single-capture + atomic-scatter-posture cross-stack-port variant.
- **`[overrides.mpm-multimaterial]`** — the fourth per-sim tolerance override; `hybrid-pg`→`mpm` mapping precedent.
- **A fourth Taichi-cpu perf-ledger datapoint** at MPM scale (1M particles; the atomic-scatter-posture wall-clock datapoint).
- Whatever IC-15 disposition Stage 2 lands (D5): additive amendment ((a)/(b)/(d)) or unchanged (c).
- The MPM-side `sim_runner_diagnostic` bank CLOSED as not-a-defect (D7).

### § 11.4 Replay-chain non-participation + tag posture

Inherits § D.2 + § D.4. Does NOT participate in the cross-phase replay chain. **Tag posture:** no `-phase-N` tag (forbidden per § D.2). Optional non-phase point-release banked (lean: NO intermediate tag, per all spec-Phase-2 sub-phase precedents).

### § 11.5 D1–D10 surface — operator-routable; NOT pre-committed

(See probe § 8 for full preview. Reproduced for charter-time routing.)

**D1 — Sub-phase / package / commit-scope naming.** **Lean `sub-phase-mpm-multimaterial-stack-d`** (package `packages/mpm-multimaterial-stack-d/`; audit dir + commit scope to match; capture dir `captures/mpm-multimaterial-stack-d/` per LBM precedent — NB the Phase-1 reference capture dir is the abbreviated `captures/mpm-ref/`). Full-name § C.1 + RD-2D/sph-water/LBM precedent. CONFIRMS the dispatch lean (S-M3). Alternative: an abbreviated `mpm-stack-d` (mechanical rename) — rejected (breaks the full-name precedent). Downstream: precedent for the remaining Stack-D/E ports.

**D2 — Stage 1 decomposition.** Lean 1a/1b/1c (RD-2D + sph-water + LBM precedent). Stage 1b scope ≈ richer than LBM (7 transfer/update kernels + 3×3 F and C per particle) but single-material, single-pass, golden-only, ONE capture → est. ~1300–1700 lines; **no further sub-split** (confirm at Stage 0). The P2G atomic-scatter + APIC kernel is the single most complex unit.

**D3 — Cross-stack tolerance value.** HEAD-verified `relative = 1e-4, absolute = 0.0` (`[defaults.mpm]`); NOT pre-committed beyond the HEAD value. Same as RD-2D/sph; looser than LBM's 1e-5 (S-M2 — more headroom). Empirics at Stage 1c decide whether at-budget holds (R-M1). Alternative (if gate-14 exceeds 1e-4): operator routes tolerance amendment (separate operator-approved commit + budget amendment) OR step-horizon override OR comparison-projection (D8).

**D4 — Step-horizon.** Lean full canonical horizon (`drop-impact-128cube-seed42-step500`, 500 steps, cadence-50, 11 frames). NOT pre-committed shorter; R-M2 (drop-impact amplification) makes the step-horizon roll-up the load-bearing analysis.

**D5 — IC-15 partial-vs-full formalization disposition (MOST CONSEQUENTIAL).** Lean **(b) PARTIAL HOLDS + REFINEMENT**, contingent on gate-14 GREEN at 1e-4 + the Stage-1b scatter posture. Rationale (probe § 3 / § 6): the fourth pair validates the 5 codified components at a fourth physics family (hybrid-pg) AND adds genuine NEW empirical data on deferred aspect **#3 (atomic-scatter / particle-scatter FP-accumulation)** at the 1e-4 category — warranting an **additive amendment** (a "particle-scatter FP-accumulation" subsection analogous to LBM § 4.1, plus the atomic-scatter-posture + golden-only-single-capture patterns). BUT deferred aspects **#1 (chaotic)** stays at most weakly exercised (drop-impact, R-M2) and **#5 (iterative-solver)** stays wholly unexercised → promoting to FULL is premature (R-M6). Alternatives: **(d) PARTIAL HOLDS + SUBSTANTIVE EXPANSION** — the lean iff Stage-1b runs parallel atomic-scatter AND gate-14 surfaces non-trivial divergence requiring D8 comparison-projection (a new R-class framework that can't be expressed as additive subsections); **(a) FULL** — defensible only if the operator reads "full" as "promote the 5 codified components" while carrying #1/#5 as explicit future scope; **(c) PARTIAL UNCHANGED** — too weak (there IS new scatter-surface data). Routed at Stage 2 on the empirical margin + scatter posture. **This tempers the dispatch's framing (which leaned (a) full / D8-activation into play); the HEAD-verified single-material single-pass regime + the serialised-scatter lean strengthen the codified core and exercise #3 partially, but do not close the #1/#5 deferred surface.**

**D6 — Per-sim tolerance.toml override.** **MANDATORY** (`compare_captures` raises `KeyError` on `sim.category="hybrid-pg"` without it). Lean `[overrides.mpm-multimaterial] category = "mpm"` (at-budget; the FOURTH per-sim override; `hybrid-pg`→`mpm`=1e-4). Probe-verified: `[defaults.mpm]` exists at 1e-4; no override pre-exists; `[budgets.mpm.cross_stack]`=1e-4 (at-budget, no amendment).

**D7 — LBM/MPM `sim_runner_diagnostic` defect (MPM-side).** **Lean (b) STAY BANKED / close-as-NOT-A-DEFECT** — a SHIFT from the dispatch's (a) FOLD-IN lean (probe § 9 / S-M4), on HEAD-verified + empirical grounds: **the MPM `sim_runner_diagnostic` does NOT ignore its seed** — it threads `seed` into the blob rejection-sampler (`np.random.default_rng(int(seed))`); `seed=42` vs `seed=99` produce different particles (`max_abs_diff=0.283`). The banked defect's MPM-side claim is inaccurate (a coordinator-side Convention #8 lapse that conflated LBM's genuinely-seed-independent analytic ICs with MPM's correctly-seeded stochastic blob). The only residue is the hardcoded `"…seed42…"` descriptor string (cosmetic; never problematic since all tests use seed=42). **There is NO substantive defect to fold in and NO seal-exception to request.** The dispatch's "MPM substantive unlike LBM cosmetic" premise is inverted. The NEW Stack-D runner threads + interpolates the seed cleanly at Stage 1b. Alternatives: (a) FOLD-IN — rejected (nothing functional to fix; would edit sealed code for zero gain); (c) STANDALONE — unwarranted. **Operator ratifies the close-as-non-defect; do NOT edit `packages/mpm-multimaterial/`.**

**D8 (potential, inherited) — comparison-projection axis.** Probe cannot pre-decide (no Stack-D capture). If Stage-1c gate-14 passes with comfortable margin (serialised scatter) → unneeded. If parallel atomic-scatter surfaces aggregate-grid-state divergence not captured by per-particle position-exact comparison → surface per-grid-node mass histogram / Σ-mass / Σ-momentum conservation / energy-momentum-invariant projections. Resolves with D5 at Stage 2.

**D9 (NEW for MPM) — variant + material-model posture.** **MLS-MPM (Hu 2018) + APIC + neo-Hookean SINGLE material** (HEAD-verified; probe § 1.1). Quadratic-B-spline 3-node, `base=floor(p/dx+0.5)−1`. Charter codifies: the cross-stack-sensitive surface is the P2G scatter (Stack-D atomic-scatter) + G2P/APIC reconstruction + neo-Hookean stress det/log branch; single-material → no material-discontinuity amplification (deferred aspect #1 at most weak via drop-impact). No MRT/multi-material/plastic/implicit (Phase-2+ out of scope; the multi-material constitutive table stays declared-only). The MPM analog of LBM's D9.

**D10 (NEW) — schema-corpus entry sizing + LFS routing.** `.gitattributes` `legacy-captures/**/*.h5 filter=lfs` + CI `lfs:true` are configured (probe § 2; LBM Stage 2 + `b027f60`). The MPM canonical capture is **~1.05 GiB** → a corpus COPY doubles LFS storage to ~2 GiB. **Lean: surface to operator** — either (i) keep the LBM precedent (canonical capture in the corpus, ~1 GiB LFS), OR (ii) route the small diagnostic-tier capture (`drop-impact-16cube-seed42-step50`) to the corpus instead (lighter; but diverges from the canonical-capture-in-corpus precedent). Verify the corpus round-trip in CI (via `gh`) before Stage-2 GREEN (S-CI1). Resolves at the plan-drafting landing / Stage 1c.

**Operator decisions on D1–D10 are recorded in the plan-drafting landing audit + cited back at each Stage's dispatch prompt as the routing context.**

---

## § 12. Sub-phase scope vocabulary

Per § C.1: `<mpm-multimaterial-stack-d-stage<N><a|b|c>-<scope>>` for Stage 0/1a/1b/1c/2 commits; `<mpm-multimaterial-stack-d-plan-drafting-<scope>>` for plan-drafting commits; SHA back-fill commits use `-sha-backfill` suffix per § B.2.

---

*End of charter. Stage 0 is dispatchable in a fresh Claude Code session against this plan after operator routing of § 11.5 (D1–D10).*

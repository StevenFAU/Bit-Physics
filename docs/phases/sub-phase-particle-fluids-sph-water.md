# SPH-Water Implementation — Sub-Phase of Spec-Phase-1

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — gates 4–13 implementation for `sph-water`, scoped under spec-Phase-1's full inventory.
> **Sub-phase identity:** Fourth per-sim implementation sub-phase under spec-Phase-1. The sibling half of the originally-bundled "continuous-CA + sph-water" sub-phase (operator scope-decomposed per `sub-phase-continuous-ca-rd3d.md` § 1.2). This document plans the **second** sub-sub-phase (sph-water only); the **first** sub-sub-phase (RD-3D only) landed at SHA `0df358d`. This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries (next phase tag: `v0.2.0-phase-2`). No `-phase-N` tag is proposed; see § 5 + § 11.4 for tag posture.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.5 (determinism), 2.6 (golden tables), 2.7, 2.13 (mutation), 2.14 (PBT), 2.15, 3.5 (the 13 gates), 4.3 (Stack C), 5.4 (particle-fluids reference category), 7.12, 7.13, 9.2 (vendored upstream discipline), 11.2, 11.7 + Appendix D § D.2.3.
> **Parent charters:** `docs/phases/phase-1-plan.md`. **Parent sub-phase templates:** `docs/phases/sub-phase-continuous-ca-rd3d.md` (most recent — adapt) + `sub-phase-agent-based.md` + `sub-phase-closed-form.md`. This sub-phase inherits role model, IC contracts (with substack pivots in § 3), audit / append-only discipline, checkpoint discipline, conventions, the three-stage cadence, the determinism-strategy-declaration discipline, the gate-13 worktree replay pattern, and the problem-solving playbook (Phase 1 § 9 + P21 closed-form + P22 agent-based + P23 RD-3D MMS) wholesale; this plan records only the deltas plus one new mandatory playbook entry (P24 — SPH determinism debugging).
> **Parent audits / pre-conditions (FACT):**
> - Spec-Phase-1 landed at `v0.1.0-phase-1` (SHA `9998bc1`); landing audit `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` verdict-state CONFIRMED.
> - Closed-form sub-phase landed at SHA `2cc0f21`; landing audit `docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md` verdict-state CONFIRMED.
> - Agent-based sub-phase landed at SHA `739c93f` (post Convention-#12 SHA back-fill); landing audit `docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md` verdict-state CONFIRMED.
> - Replay-tool-hotfix sub-phase landed at SHA `1f5fa0c`; B-hotfix-1 + B-hotfix-2 resolved.
> - Continuous-CA-RD3D sub-phase landed at SHA `0df358d` (post Convention-#12 SHA back-fill on `ca3b311`); landing audit `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md` verdict-state CONFIRMED.
> **Inherited shifts:** 48 documented to date (21 Phase 1 audit § 14 + 11 closed-form + 10 agent-based + 2 RD-3D Stage 1 S1–S2 + 4 RD-3D Stage 2 N1–N4). Carried forward by reference; not re-stated, not re-litigated.
> **Date drafted:** 2026-05-20.
> **Status:** dispatch-ready.

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase is

This sub-phase takes **sph-water** from spec-Phase-1's gates 1–3 (5 spec docs + DFSPH density-evolution golden co-bundle + probe + 5 failing tests, committed at SHA `cd20faa`) through gates 4–13 of spec § 3.5. sph-water is the fourth per-sim implementation surface and the **first** to exercise:

1. **Phase-0-vendored upstream consumption discipline** at sim-test scale (spec § 9.2). SPlisHSPlasH 2.16.1 is the only Phase-0-vendored particle-fluids upstream in the workspace (manifest at `references/SPlisHSPlasH/MANIFEST.toml`, vendored SHA `6bff55a6eaf14083d34650f22a268ce156b62b54`, license MIT). Per spec § 9.2 this sub-phase **consumes by reference** — cites Bender & Koschier 2015 (DFSPH) and Monaghan 1992/2005 (cubic spline) by name in docstrings, MUST NOT import vendored sources, MUST NOT modify them, MUST NOT re-vendor.
2. **The `particle-fluids` sim category** at sim-test scale (spec § 5.4). Phase-0 shipped the cubic-spline-kernel golden (`tools/testkit/golden/tables/cubic-spline-kernel.json`, 3 anchors at HEAD) before any particle-fluids sim shipped; sph-water is the first sim to consume both the Phase-0 cubic-spline-kernel golden AND the Phase-1-co-bundled DFSPH density-evolution golden (`tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json`, 1 anchor at HEAD — see § 4.3 Step 2.3 Cat-3 routing).
3. **DFSPH algorithm at small-N** — divergence-free SPH (Bender & Koschier 2015). Two coupled iterative solvers (constant-density + divergence-free velocity), implemented at Python NumPy reference scale (small-N: the DFSPH golden is a two-particle fixture). The **canonical capture** per Appendix D § D.2.3 is `dam-break-1M-particles-seed42-step1000` (1 million particles × 1000 steps — see § 1.3 Honesty caveat re. wall-clock + capture-size at Stage 1 re-anchor).

At close, sph-water ships all 13 gates GREEN. The three remaining Phase 1 sims (`eulerian-smoke`, `lattice-boltzmann-d3q19`, `mpm-multimaterial`) remain at their `v0.1.0-phase-1` RED bootstrap state pending their own per-sim implementation sub-phases. The 13-gate posture, per-sim acceptance contract, three-stage cadence, audit / append-only discipline, checkpoint discipline, conventions, and problem-solving playbook are all inherited from `sub-phase-continuous-ca-rd3d.md` (the most-recent template).

### § 1.2 What this sub-phase is NOT — sibling of continuous-CA-rd3d

The original ordering bundled RD-3D with sph-water as a single "continuous-CA + sph-water" sub-phase (Phase 1 audit § 15 row 3; agent-based audit § 10 row 1; RD-3D plan § 1.2). The operator scope-decomposed that bundle into two sub-sub-phases (rationale at `sub-phase-continuous-ca-rd3d.md` § 1.2, not re-litigated here). **This plan is the second half** — sph-water only.

Additional out-of-scope items inherited:

- A new spec-phase. The next spec-phase tag per spec § 7.12 is `v0.2.0-phase-2`; intermediate per-sim implementation work accumulates to `main` without a `-phase-N` tag (see § 5 + § 11.4).
- Implementation of any other Phase 1 sim.
- Cross-stack replication (Phase 2). The Stack C C++/CMake build path + Vulkan local invocation are explicitly Phase-2+ per sph-water spec-ref § 5 + spec-ref § 8; this sub-phase ships the **Python NumPy reference + sim runner + invariants + Hypothesis PBT + canonical capture + perf-ledger row** — see § 1.4 for the language-pivot re-anchor.
- **Re-vendoring or modifying SPlisHSPlasH sources.** Forbidden by spec § 9.2; the vendored manifest is the contract.
- **MMS-runner-scaffolding generalization** (RD-3D Stage 1 S2 / RD-3D landing § 9.3 banked). sph-water uses golden-table-based gate 5, NOT MMS. The generalization is therefore NOT blocking this sub-phase and is deferred to the next MMS-using per-sim sub-phase plan-drafting (eulerian-smoke or lattice-boltzmann-d3q19, which share the NS-2D MMS per Phase 1 Stage 2 shift N5).
- **RD-3D test-augmentation** (RD-3D Stage 2 N3 follow-up / landing § 9.3). Banked at spec-Phase-2+ when sim-source mutation thresholds become gating.
- Editing any Phase 0 / Phase 1 / closed-form / agent-based / RD-3D / replay-tool-hotfix sub-phase artifact. Audit chain is append-only.

### § 1.3 Honesty caveats — assumptions Stage 0 will re-anchor

Drafted against HEAD = `0df358d` (post-RD-3D SHA back-fill). Working assumptions to be re-anchored at Stage 0 / Stage 1 start:

- Sim package at `packages/sph-water/` ships a Phase-1-committed `sph_water/__init__.py` with intentionally-missing submodules (`reference`, `sim`, `invariants`) plus failing tests at `tests/test_{cubic_spline_kernel_golden,dfsph_density_golden,determinism,diagnostics,pbt_invariants}.py` importing `sph_water.{reference,sim,invariants}` (FACT at HEAD — verified before drafting; **5 failing test files**, not 4 like RD-3D).
- Phase 0 cubic-spline-kernel golden at `tools/testkit/golden/tables/cubic-spline-kernel.json` (root of `tables/`, NOT in `particle-fluids/` subdir) — 5 test points, 3 with `independent_reference` blocks (verified at HEAD; meets ≥ 3 anchors per Cat 3 § 2.4).
- Phase 1 DFSPH density-evolution golden at `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json` — **1 test_point with 1 `independent_reference` block (the block enumerates 3 sources internally), counted as 1 anchor by `_anchor_count` in `tools/integrity/integrity/cat3_numerical/golden_values.py`**. Below the ≥ 3 threshold. Same situation as agent-based Stage 1 SHIFT S6 (resolved at Stage 2 via Decision A additive lift, commits `3ce7809` + `d156792`). See § 4.3 Step 2.3.
- Phase 1 failing-tests-evidence sha256 (FACT — Phase 1 landing audit § 5 `evidence_hashes:`): `tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt` → `sha256:82fb91bcf19581cd9adc0eca4ba194de033d4a58aa9c5319d52dabc40cf12b1f`.
- Phase 1 TDD bootstrap SHA for sph-water is `cd20faa` (FACT — Phase 1 audit § 4 + landing § 5). This is the gate-13 worktree replay anchor.
- Canonical capture descriptor per spec Appendix D § D.2.3 / Phase 1 probe report § 4: **`dam-break-1M-particles-seed42-step1000`** — 1M particles × 1000 steps. Re-anchor at Stage 1 step 5 against the Appendix D row (mirror RD-3D Stage 1 S4 / charter § 9 R9 discipline). **Scope warning:** 1M particles × 1000 steps is materially heavier than RD-3D's 64³ × 2000 steps (RD-3D landed at 10.144 s wall-clock; sph-water's Python NumPy DFSPH reference may land in the 10² – 10³ s range, with capture size likely exceeding the 64-MB pre-commit ceiling raised by RD-3D Stage 1 N4 — see § 9 R12).
- Vendored manifest at `references/SPlisHSPlasH/MANIFEST.toml` carries `[scope].used_by_sims = ["sph-water"]` at HEAD (FACT — added at Phase 1 Stage 3 commit `83b3f5f`). **Format-drift note:** the bare slug form (`"sph-water"`) differs from the category-prefixed form (`"particle-fluid/sph-water"`) given in the spec § 9.2 worked example. This drift is in-scope to surface as a Stage 0 Task 0.3 finding (see § 4.1); the plan does NOT pre-decide whether the manifest should be amended.
- PBT invariants declared in sph-water spec § 6.6: `density_nonneg`, `kernel_normalization_unit_volume` — only 2 invariants (the spec floor per spec § 2.14 R9). NOT mass conservation / momentum conservation / incompressibility (those are not first-class spec invariants for sph-water at HEAD; verify before broadening).
- IC contracts at HEAD per probe § 1–2 + § 3 below: Phase-2+ Stack-C `common-cpp` consumption is **deferred to Phase 2+**; this sub-phase ships Python and consumes IC-1 (Python capture) + IC-3 (Python determinism — note `epsilon` test variant per § 1.5) + `diagnostics.tier2.particle.*` (IC-5 substack, inherited from agent-based).

Re-anchor drift → SHIFTED per parent playbook P1 / P14; HEAD wins.

### § 1.4 Stack-C language-pivot re-anchor — this sub-phase ships Python, not C++

**Re-anchor finding (inherited verbatim from RD-3D plan § 1.4 — same load-bearing decision):** sph-water spec-ref § 5 states "Phase 1 deliverable: package scaffold + failing tests only. Phase 2+ implementation contract: C++ reference at `packages/sph-water/src/` (Vulkan compute + driver, consuming the vendored SPlisHSPlasH kernels) + Python NumPy reference at `packages/sph-water/sph_water/reference/`." Phase 1 failing tests at `packages/sph-water/tests/test_*.py` import Python modules and run under pytest, NOT doctest / ctest / CMake (FACT at HEAD).

**Decision (inherits RD-3D § 1.4 lean):** this sub-phase ships the **Python NumPy reference** (`sph_water.reference.dfsph`, `sph_water.sim`, `sph_water.invariants`). The Stack-C C++ / Vulkan / CMake / vendored-kernel-consumption path remains Phase-2+ scope per spec-ref § 5 + § 8. This decision MUST be surfaced to the operator at the closing summary as a re-anchor finding for explicit confirmation (an operator-routable item per § 11.5).

### § 1.5 Determinism posture — Python NumPy DFSPH

sph-water's determinism declaration at `docs/sim-specs/particle-fluids/sph-water/determinism.md` is **`epsilon-same-stack-same-hw`** for the Stack-C C++/Vulkan implementation — atomic scatter-add in the neighbor accumulator (used by both the density and the velocity correctors of DFSPH) makes bit-equality impossible even on the same hardware/driver pair. The probe report § 6 reflects this via `test_run_twice_epsilon_diff` (epsilon — NOT `test_run_twice_bit_exact` like RD-3D).

For the **Python NumPy reference shipped at this sub-phase**, the determinism profile is materially different. Python NumPy has no atomic scatter, no GPU subgroup-collective ops, no driver FMA fusion. The credible sources of nondeterminism are narrower than the Stack-C target but DENSER than RD-3D's 7-point stencil:

1. **Neighbor-list construction order.** Spatial-hash bucket iteration must be deterministic across runs. Sort by particle id (or by Morton key, stable secondary sort) before per-pair force accumulation.
2. **Per-pair force-accumulation order.** Each particle's density / pressure / divergence-free correction is a sum over neighbors; the order matters under FP-non-associativity. Mitigation: iterate neighbors in sorted (by id) order; use a single accumulator per particle (no `numpy.add.at` over unsorted pair indices).
3. **DFSPH inner-iteration convergence.** Both DFSPH solvers iterate until a divergence/density tolerance is met. Across runs, the iteration count must match. Mitigation: fixed maximum-iteration cap with deterministic convergence-tolerance check (no early-stop based on wall-clock or RNG).
4. **NumPy default RNG global state** if any IC sampling uses bare `np.random.*` instead of `np.random.default_rng(seed)`. Banned in `reference`/`sim` per agent-based § 1.4 inheritance.
5. **BLAS thread-count drift** in any matmul-like helper (unlikely in a particle method; stick to elementwise + boolean-indexed reductions).
6. **FMA fusion** across rebuilds — extremely rare in pure NumPy; deferred to Phase-2+ Stack-C concerns.

The expectation is that the Python NumPy reference can achieve **bit-exact-same-stack-same-hw** despite the spec's `epsilon` Stack-C declaration, because the sources of `epsilon`-class nondeterminism (atomics, FMA, subgroups) all live downstack from the Python reference. The probe-declared test name `test_run_twice_epsilon_diff` is honored as-is at Stage 1 (consume the probe contract); the test asserts an epsilon-bounded diff that ALSO holds at zero (bit-exact). If Stage 1 observes bit-exact, the commit footer records the over-achievement; this does NOT promote the spec declaration (the Phase-2+ Stack-C target remains `epsilon`).

**Stage 1 discipline (inherited from agent-based § 1.4 / RD-3D § 1.5 — load-bearing):** before drafting sph-water's implementation, the agent writes the determinism-strategy declaration as a docstring at the top of `sph_water.sim` and cites which determinism.md clauses are implemented in the Python reference + which are deferred to Phase-2+ Stack-C (atomic scatter, FMA, subgroup-collectives). The Stage 1 commit-message footer cites the docstring as a load-bearing artifact. See § 7.2 for the verbatim instruction.

### § 1.6 Vendored-upstream consumption discipline — first practical exercise of spec § 9.2

This is the **first sub-phase to consume a Phase-0-vendored upstream at sim-test scale** (RD-3D had no vendored upstream — its MMS solution was workspace-original). The discipline is documented in spec § 9.2 (read it; not restated here). Plan-side commitments:

- **Stage 0 Task 0.3 (new shape vs RD-3D's RD-2D-MMS task):** verify the manifest at `references/SPlisHSPlasH/MANIFEST.toml` is well-formed at HEAD: `[upstream].sha` matches the on-disk vendored tree's git state per playbook P4 (or its filesystem-only equivalent — no `.git` is preserved in the vendored copy, so the check is `[upstream].sha` is exactly the documented SHA + the tree contents pass an out-of-band integrity check by way of consumed-file existence at the documented paths); `[scope].used_by_sims` contains an entry for sph-water; `[scope].used_by_checks` references `cat3.cubic-kernel`. Surface any drift. The bare-slug-vs-prefixed-form question (§ 1.3) is a finding, not a blocker; default lean is to proceed without amending the manifest (any amendment is itself a Phase-1-amendment candidate, scope-routed to the operator).
- **Stage 1 implementation discipline:** the Python NumPy reference at `sph_water.reference.dfsph` cites SPlisHSPlasH algorithms BY NAME in docstrings (e.g., "DFSPH — Bender & Koschier 2015, eq. (5); cubic-spline kernel — Monaghan 1992/2005, § 2.2") and DOES NOT import or call vendored sources. The kernel implementation is derived independently from the cited papers (the manifest scope statement explicitly notes "the Python reference implementation is derived independently from Monaghan 1992/2005 to guard against symmetric upstream bugs (spec § 2.4)").
- **Stage 2 audit posture:** the landing audit § 12 summarizes the vendored-discipline exercise — which manifest fields were verified, which were drifted, which were amended, and how the implementation cites without importing.

(P25 — vendored-upstream-consumption playbook entry — judged unnecessary at this sub-phase; the discipline is documented adequately in spec § 9.2 and the Stage 0 Task 0.3 + Stage 1 docstring-citation discipline is mechanical. If the next vendored-consumption sub-phase (e.g., MPM Taichi vendoring) finds spec § 9.2 insufficient, P25 lands then. See § 9.)

### § 1.7 Role model, conventions, audit discipline

Inherited from `sub-phase-continuous-ca-rd3d.md` § 1.7. Single Claude Code agent at a time; single Claude.ai coordinator chat; one operator. Doubled-directory paths, additive-edits-only on pre-existing files, Convention #12 SHA back-fill at EVERY stage close.

### § 1.8 Architecture — three stages

- **Stage 0 — Pre-flight.** Cross-phase audit replay against `v0.1.0-phase-1` (per charter § 11.4 — RD-3D + agent-based + closed-form sub-phases are siblings, not parents); tolerance-budget carryover to `sub-phase-particle-fluids-sph-water`; re-verify Phase 1 sph-water failing-tests evidence sha256; **verify SPlisHSPlasH vendored-manifest state** per § 1.6 (Task 0.3 reshaped from RD-3D's RD-2D-MMS task).
- **Stage 1 — Per-sim implementation (one session).** **ONE sim** (sph-water); single sub-bundle commit covering gates 4–13. Expect this Stage 1 to be **heavier than RD-3D's** due to (a) two iterative DFSPH solvers vs RD-3D's explicit forward Euler, (b) denser neighborhood interactions (each particle reads from every neighbor within smoothing radius vs RD-3D's 7-point stencil), (c) the canonical capture is 1M particles × 1000 steps. **Scope warning:** if Stage 1 does not fit one session, the agent stops at a clean checkpoint and the operator dispatches a continuation session under the inherited closed-form / agent-based / RD-3D partial-checkpoint precedent.
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive, Cat 3 OPERATOR-ROUTABLE — see § 4.3 Step 2.3), integrity sweep, gate-13 replay verification, **B17 PATH-A routing decision** (continue the per-target mutation runner against sph-water source + DFSPH golden generator, OR re-bank), mutation artifact, sub-phase landing audit, Convention #12 SHA back-fill. **No tag is prepared**; optional `v0.1.4` non-phase point-release tag banked for operator (default lean: no tag).

---

## § 2. Deliverables (by gate, single sim)

The 13-gate per-sim acceptance contract is inherited verbatim from `sub-phase-continuous-ca-rd3d.md` § 2 / parent templates. Deltas for sph-water:

| # | Deliverable |
|---|---|
| 4 | (Gate-4 reads through to gate-5 golden verification — same as closed-form / agent-based per the golden-based gate-5 path.) |
| 5 | **Golden-table-based code verification** — two goldens consumed: (a) Phase 0 `cubic-spline-kernel.json` via `tests/test_cubic_spline_kernel_golden.py::test_W_matches_phase0_pin` (verifies the sim's kernel reproduces W(q,h) at the 5 fixture points within `absolute = 1e-15`); (b) Phase 1 `dfsph-density-evolution.json` via `tests/test_dfsph_density_golden.py::test_{density,density_evolution}_at_two_particle_fixture` (verifies ρ₀ and dρ/dt at the two-particle fixture within `absolute = 1e-15`). NOT MMS — sph-water has no MMS per spec-ref § 7. |
| 6 | Tier 1 NaN/Inf scan over the canonical-trajectory output (`test_diagnostics.py::test_tier1_health_no_nan_inf` GREEN). |
| 7 | Tier 2 particle (IC-5 substack — inherited from agent-based) — `test_tier2_particle_count_invariance`, `test_tier2_particle_no_overlap_at_half_spacing`, `test_tier2_particle_neighbor_list_integrity`, `test_tier2_particle_momentum_conservation_advisory` GREEN (`diagnostics.tier2.particle.{check_count_invariance, check_no_overlap, check_neighbor_list_integrity, check_momentum_conservation}`; momentum advisory absent boundary forces; mirror agent-based S8 inline-recurrence pattern if check semantics drift). |
| 8 | Cat 1 citations — Bender & Koschier 2015 (DOI 10.1145/2786784.2786796); Monaghan 1992 (DOI 10.1146/annurev.aa.30.090192.002551); Monaghan 2005 (DOI 10.1088/0034-4885/68/8/R01) docstring citations resolve. SPlisHSPlasH manifest's `[upstream].sha` cited in `cat1.upstream-citation`. |
| 9 | Cat 2 public API — `sph_water.{reference.dfsph, sim, invariants}` symbols expose probe § 5 contract: `reference.dfsph.{density, density_evolution, divergence_free_solve}`; `sim.sim_runner_seeded` (matching testkit `SimRunner` Protocol); `invariants.{density_nonneg, kernel_normalization_unit_volume}`. |
| 10 | Canonical capture — `captures/sph-water-ref/dam-break-1M-particles-seed42-step1000.{h5,json}` per Appendix D § D.2.3 (Stage 1 step 5 re-anchors the descriptor name against Appendix D in case of probe-vs-spec drift per § 1.3). Capture-writer surface: `tools/testkit/capture` (inherited from closed-form S6). **Capture-size watch (§ 9 R12):** the 64-MB pre-commit `check-added-large-files` ceiling raised at RD-3D Stage 1 N4 may not absorb 1M particles × 1000 steps if the capture writes per-step state — confirm at Stage 1 step 5 whether the H5 fits below 64 MB; if not, surface (operator-routable: raise to 128 MB OR downsample capture cadence). |
| 11 | Determinism (`test_run_twice_epsilon_diff`) GREEN via `run_twice_and_diff` against the canonical capture descriptor. Spec declares `epsilon` for Stack-C; the Python NumPy reference is expected to achieve bit-exact (epsilon-bound trivially satisfied) — see § 1.5. |
| 12 | Hypothesis tests for the 2 invariants declared in sph-water spec § 6.6 (`density_nonneg`, `kernel_normalization_unit_volume`). Commit the `.hypothesis/` example database per spec § 2.14. |
| 13 | Perf-ledger first-landing row appended for `(sph-water, stack-b-py-ref, dam-break-1M-particles-seed42-step1000)`. Mirror `hardware_id` format from closed-form / agent-based / RD-3D (e.g., `i7-12700KF-linux-6.17`); re-anchor at Stage 1. **Expected wall-clock:** materially slower than RD-3D's 10.144 s — DFSPH neighborhood queries dominate; pure Python NumPy at 1M particles × 1000 steps may sit in the 10² – 10³ s range. Non-blocking; the perf-ledger captures whatever is observed. |
| 13 (gate-13 anchor) | Phase 1 evidence `sph-water-2026-05-20T13-32-02Z.txt` (sha256 `82fb91bc…cf12b1f`) still matches; worktree replay at SHA `cd20faa` reproduces 5 `ModuleNotFoundError` collection-errors; HEAD GREEN. |

**B17 PATH-A deliverables (Stage 2 step 2.7 — OPERATOR-ROUTABLE this sub-phase):** per RD-3D Stage 2 N3 / RD-3D landing § 7.6, the per-target mutmut + uv-workspace runner infrastructure is now first-class; subsequent per-sim sub-phases extend additively. The decision shape at sph-water Stage 2 is whether to extend with sph-water targets (continue PATH-A, the second proof point that the runner generalizes) OR re-bank to a later sub-phase. **Lean target list IF the operator routes continue-PATH-A:**

1. `sph_water.{reference.dfsph, sim, invariants}` (Python source, expect ~150–400 LOC post-Stage-1 — heavier than RD-3D given the two DFSPH solvers).
2. `tools/testkit/golden/generator/dfsph_density_evolution.py` (the Phase-1-shipped DFSPH golden generator — mutating this validates that gate-5 catches DFSPH-regression at the generator surface).
3. **NOT in scope:** `tools/testkit/golden/reference_implementations/cubic_spline.py` (Phase 0 deliverable, append-only-protected); `tools/testkit/golden/generator/cubic_spline.py` (Phase 0; same protection).

Acceptance for "sub-phase complete": all 13 gates GREEN for sph-water; Cat 1/2/3/4/5/X GREEN at HEAD (or DEGRADED-PASS with explicit per-deferral rationale); B17 routing decision documented (PATH-A real artifact OR explicit re-bank with rationale); landing audit committed; SHA back-fill committed. **No `-phase-N` tag is pushed**; optional non-phase point-release tag (`v0.1.4`, no suffix) is a banked operator decision (§ 5 / § 11.4).

---

## § 3. IC contracts inherited (not redefined)

- **IC-1** (capture I/O Python — agent-based / RD-3D substitute for the Stack-C IC-1 deferred to Phase-2+) — `common_py.capture.Writer` / `tools/testkit/capture` writes the canonical capture.
- **IC-3** (determinism config Python — equivalent of Stack-C IC-3 deferred) — `common_py.determinism.Config` plumbs seed. Load-bearing for gate 11.
- **IC-5** (Tier 2 particle diagnostics) — inherited from agent-based sub-phase; load-bearing for gate 7. Consumed identically to boids-3d / physarum at HEAD.
- **IC-8** (probe report) — `tools/testkit/probes/reports/sph-water.md` § 5 is the public-API contract.
- **IC-9** (phase audit body) — sub-phase checkpoint + landing audits follow Phase 1 charter § 3.9 structure.
- **IC-10** (spec § 6 verification posture) — pinned at Phase 1; this sub-phase implements against § 6.1 (golden-table verification, NOT MMS).

**IC substack pivots vs the prior sub-phases:**

- Closed-form sub-phase: IC-7 (`closed-form` tier-2).
- Agent-based sub-phase: IC-5 (`particle` tier-2).
- RD-3D sub-phase: `scalar_field` tier-2 + MMS-pipeline substack.
- **This sub-phase: IC-5 again** (particle tier-2; same as agent-based, inherited wholesale) **+ Phase-0-vendored-upstream consumption** (the new contract surface — see § 1.6 + § 4.1 Task 0.3).

**Out of scope for this sub-phase (Phase-2+ per § 1.4 + sph-water spec-ref § 5):** Stack-C `common-cpp` IC-1 + IC-3 (Vulkan compute consumption of vendored kernels via PIMPL / direct include); the screen-space renderer (Phase-2+ visualization path).

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
  Replay target is `phase-1` → `v0.1.0-phase-1`; **NOT** against any sibling sub-phase. Exit 0 → proceed. Exit 1 → BLOCKED (parent playbook P20); write `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-blocked-replay-<UTC>.md`.
  **Bit-identity invariant (load-bearing per RD-3D standing order 10 inheritance):** the replay-output sha256 has been **byte-identical at `9399fc33…909f34`** across closed-form Stage 0 + agent-based Stage 0 + RD-3D Stage 0 (post-hotfix) + the hotfix V1 validation. Stage 0 Task 0.0 MUST record this sha256 and verify it matches the established value. **Divergence from `9399fc33…909f34`** is a structural-correctness alarm (the replay tool, the cached integrity logic at `v0.1.0-phase-1`, or the integrity output is no longer deterministic) and is BLOCKED-with-surface, NOT proceed-with-shift.

- **Task 0.1 — Tolerance-budget carryover.** Edit `tools/testkit/equivalence/tolerance-budget.toml`: set `[phase].phase = "sub-phase-particle-fluids-sph-water"`, bump `opened_at`. NO `[budgets.*]` widening. Commit: `chore(particle-fluids-sph-water-stage0-tolerance-budget): sub-phase carryover from phase-1`.

- **Task 0.2 — Re-verify Phase 1 failing-tests evidence sha256.** Hash `tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt`; compare to the Phase 1 landing audit's `evidence_hashes:` value (`82fb91bc…cf12b1f`; verbatim in § 1.3). Mismatch → BLOCKED (gate-13 precondition).

- **Task 0.3 (RESHAPED THIS SUB-PHASE) — SPlisHSPlasH vendored-manifest-state verification.** Per § 1.6: inspect `references/SPlisHSPlasH/MANIFEST.toml` at HEAD; verify (a) `[upstream].sha` == `6bff55a6eaf14083d34650f22a268ce156b62b54` (the documented Phase-0 vendored SHA); (b) `[scope].used_by_sims` contains an entry referencing sph-water (current value `["sph-water"]` per HEAD; bare slug); (c) `[scope].used_by_checks` references `cat3.cubic-kernel`; (d) the on-disk vendored tree at `references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.{h,cpp}` exists. Surface to the operator with the default-lean disposition for the bare-slug-vs-prefixed-form question (Reading: **no amendment** — the manifest at HEAD predates the spec § 9.2 worked-example's `particle-fluid/sph-water` prefixed form, and amending the manifest is a Phase-1-retroactive enhancement properly scoped to a Phase-1-amendment sub-phase). If any field is drifted from the documented values, BLOCK with surface; if only the bare-slug-vs-prefixed-form discrepancy is present, proceed and record as a banked Phase-1-amendment candidate. Decision recorded in Stage 0 checkpoint.

- **Closing.** `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-checkpoint-<UTC>.md` per IC-9 abbreviated structure. Front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:`. Body cites the bit-identity replay sha256 + manifest-verification result + tolerance-carryover commit + evidence-reverify sha256. Commit: `chore(particle-fluids-sph-water-stage0-checkpoint): Stage 0 pre-flight complete`. Apply Convention #12 SHA back-fill at close if the closing-commit SHA differs from the audit's `head_sha:`: NEW commit `chore(particle-fluids-sph-water-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`.

### § 4.2 Stage 1 — Per-sim implementation (one session; scope-warning per § 1.8)

ONE sim (sph-water). Single sub-bundle commit covering gates 4–13. Per-sim 10-step sequence inherited from `sub-phase-continuous-ca-rd3d.md` § 4.2, with the deltas below.

1. **Determinism-strategy declaration first** (per § 1.5 — agent-based § 1.4 / RD-3D § 1.5 inheritance). Before any implementation: write the determinism strategy as a docstring at the top of `sph_water.sim`. Cite the SPH-specific causes (neighbor-list ordering, per-pair force-accumulation order, DFSPH iteration determinism, RNG, BLAS thread-count drift). Cite which determinism.md clauses are Python-implemented vs Phase-2+-deferred (Stack-C atomic scatter / driver FMA / Vulkan subgroup-collectives — all explicitly deferred). Cite the docstring in the Stage 1 commit-message footer.

2. **Implement.**
   - `sph_water.reference.dfsph`: cubic-spline kernel `W(q, h)`, gradient `∇W(q, h)`, neighbor-list construction (sorted by particle id), per-particle density `density(particles, h) -> list[float]`, density-evolution `density_evolution(particles, h) -> list[float]`, divergence-free solver `divergence_free_solve(particles, h, max_iter, tol) -> particles_next` (Bender & Koschier 2015 eq. (5) for the continuity equation; iterative pressure projection + divergence correction). Implementation independent of vendored SPlisHSPlasH per § 1.6.
   - `sph_water.sim`: `sim_runner_seeded(seed: int, out_dir: Path) -> Path` (matching testkit `SimRunner` Protocol).
   - `sph_water.invariants`: `density_nonneg(...)`, `kernel_normalization_unit_volume(...)`.

3. **Gate-5 golden verification.** Wire `test_cubic_spline_kernel_golden.py` against the Phase-0 cubic-spline-kernel golden (5 fixture points, `absolute = 1e-15`); wire `test_dfsph_density_golden.py::test_{density,density_evolution}_at_two_particle_fixture` against the DFSPH density-evolution golden (two-particle fixture, `absolute = 1e-15`). If either fails: apply playbook P24 (charter § 9.1) for SPH-determinism root causes before mutating the test thresholds. NOT MMS — no convergence-rate ladder applies.

4. **Run `pytest packages/sph-water/tests/ -v`** → all 5 test files GREEN. Capture verbatim to `tools/testkit/failing-tests-evidence/sph-water-implemented-<UTC>.txt`; sha256 it. Phase 1 RED evidence UNTOUCHED (gate-13 anchor).

5. **Produce canonical capture (gate 10).** ONE capture: `dam-break-1M-particles-seed42-step1000` per Appendix D § D.2.3 (re-anchor at step start per § 1.3). Use `sim_runner_seeded`; write `captures/sph-water-ref/<descriptor>.{h5,json}`. Same capture-writer surface as agent-based / RD-3D. **If the resulting `.h5` exceeds the 64-MB pre-commit ceiling (RD-3D Stage 1 N4):** STOP and surface; operator decides whether to raise the ceiling to 128 MB OR to introduce a capture-downsampling cadence (write every Nth step rather than every step). Do NOT silently raise the ceiling — surface as a routing decision.

6. **Determinism (gate 11).** Capture-twice-and-diff via `tools/testkit/determinism/`. `test_run_twice_epsilon_diff` GREEN. Record in Stage 1 commit-footer whether the observed diff is bit-exact (0 max-abs-diff) or merely epsilon-bounded; bit-exact over-achievement is informational (does NOT promote the spec declaration per § 1.5).

7. **PBT (gate 12).** Hypothesis tests for `density_nonneg` (random valid particle configurations, verify ρ_i ≥ 0 at every particle) and `kernel_normalization_unit_volume` (sample random positions in a uniform reference configuration, verify ∑_j m_j W ≈ ρ_0 within tolerance set by the `particle-fluids` row of `tolerance.toml`). Commit the `.hypothesis/` example database per spec § 2.14.

8. **Perf-ledger row (gate 13).** Append one row per descriptor for sph-water. Mirror `hardware_id` format from closed-form / agent-based / RD-3D; re-anchor at Stage 1 against the actual hardware. Expected wall-clock range per § 2.

9. **Gate-13 worktree replay verification.** `git worktree add /tmp/bp-replay-cd20faa-sph-water cd20faa` (closed-form / agent-based / RD-3D inheritance — NOT partial checkout). Run `PYTHONPATH=. uv run pytest packages/sph-water/tests/ -v` in the worktree; sha256 the output; assert the failure-mode matches the Phase 1 RED evidence file's failure-mode (5 `ModuleNotFoundError` collection-errors; pytest summary `5 errors in <t>s`). Remove the worktree (`git worktree remove --force`).

10. **Commit.** `feat(particle-fluids-sph-water-stage1): implementation through gate 13`. Footer cites: Phase 1 RED evidence + sha256, new GREEN evidence + sha256, capture sidecar paths (with sha256 of the `.h5`), perf-ledger wall_clock_seconds, **determinism-strategy declaration summary** (SPH-specific causes per § 1.5), **vendored-discipline summary** (SPlisHSPlasH cited by name in docstrings, no imports of vendored sources), **gate-5 golden-pass summary** (cubic-spline + DFSPH-density-evolution).

**Closing.** `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-checkpoint-<UTC>.md` per IC-9. Body: 13-row gate-status table + capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + determinism-strategy declaration summary + vendored-discipline summary + SHIFTED / banked items (especially B17 routing-decision posture going into Stage 2 + Cat 3 anchor-lift posture per § 4.3 Step 2.3 + Stage 0 Task 0.3 vendored-manifest disposition). Front-matter: both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(particle-fluids-sph-water-stage1-checkpoint): Stage 1 per-sim implementation complete`. Apply Convention #12 SHA back-fill if needed.

**Continuation discipline.** If Stage 1 runs long, stop at a clean checkpoint after step 4 OR after step 6 (the two natural cut-points: "tests GREEN, capture not yet produced" vs "capture produced, PBT not yet GREEN"). Continuation prompt with `particle-fluids-sph-water-stage1-...` slug per inherited closed-form / agent-based / RD-3D pattern.

### § 4.3 Stage 2 — Landing (single session if Stage 1 was clean)

Inherits `sub-phase-continuous-ca-rd3d.md` § 4.3 Steps 2.1 → 2.11 structure. Deltas:

- **Step 2.1 — Closing-commit anchor re-check** (Convention 7.9). Re-grep every concrete path / SHA / sha256 across this plan + Stage 0 / Stage 1 checkpoints + RD-3D + agent-based + closed-form landings (input contracts). Drift → SHIFTED addendum.

- **Step 2.2 — Test sweep.**
  - **Positive:** sph-water GREEN at HEAD; closed-form pair STILL GREEN; agent-based pair STILL GREEN; RD-3D STILL GREEN; Phase 0 RD-2D STILL GREEN; `tools/{integrity,diagnostics,testkit}` GREEN. Apply Stage-1 closed-form N1 (one package at a time per shared `conftest`).
  - **Negative:** the three remaining Phase 1 sims (eulerian-smoke, lattice-boltzmann-d3q19, mpm-multimaterial) still RED with `ModuleNotFoundError` on their respective `{reference,sim,invariants}` triples (unaffected). Four-sim negative list becomes three-sim.

- **Step 2.3 — Integrity sweep (Cat 1, 2, 3, 4, 5, X) + Cat 3 `particle-fluids` subdir disposition (OPERATOR-ROUTABLE).**
  - **Current state at HEAD:** `_SUBDIRS_PICKED_UP = (Path("closed-form"), Path("agent-based"))`. `Path("particle-fluids")` is NOT picked up. The DFSPH density-evolution golden at `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json` has **1 anchor** under `_anchor_count` semantics (1 test_point × 1 `independent_reference` block — the block enumerates 3 sources internally but per-test-point counting is the load-bearing rule per `tools/integrity/integrity/cat3_numerical/golden_values.py:55-59`). The Phase-0 `cubic-spline-kernel.json` is at the ROOT of `tables/` (not in the `particle-fluids/` subdir) and has 3 anchors at HEAD (verified pre-flight); it is picked up by the root-tables glob regardless of subdir tuple.
  - **Decision shape (operator-routable at Stage 2 dispatch — lean: Decision A, mirroring agent-based commits `3ce7809` + `d156792` precedent):**
    - **Decision A (lean):** additively lift the DFSPH density-evolution golden from 1-anchor to 3-anchor structure (split the existing single `independent_reference` block into three per-source blocks — Bender-Koschier 2015 / Monaghan 2005 / hand-derivation cross-check via Phase-0 cubic-spline-kernel pin — OR split into 3 test_points each with its own `independent_reference`; the agent-based precedent at commit `3ce7809` chose the latter shape); then additively append `Path("particle-fluids")` to `_SUBDIRS_PICKED_UP` in `tools/integrity/integrity/cat3_numerical/golden_values.py`. Closes the anchor-lift question for the particle-fluids subdir at this sub-phase.
    - **Decision B (bank):** skip the lift + pickup; particle-fluids subdir remains non-recursed pending a future amendment sub-phase (or the next particle-fluids sim, of which there are none in Phase 1). Records the deferral in the landing audit § 9 banked items.
  - The plan does NOT pre-decide. Surface to operator at Stage 2 dispatch with the Decision-A lean.
  - **Cat 3 evaluator-shim banking:** continues to inherit closed-form audit § 9 + agent-based audit § 9.2 + RD-3D § 9.2 (four AUDIT_LOG rows pending shims). Out of this sub-phase's scope. **New AUDIT_LOG row(s) potentially introduced by sph-water:** the DFSPH golden's `algorithm` field is `dfsph-density-evolution-2particle` and the cubic-spline-kernel golden's is `cubic-spline-kernel-3d-monaghan`; if neither has a registered Python evaluator shim at HEAD (verify at Stage 2), both add to the AUDIT_LOG count (advisory-only per the agent-based / RD-3D inherited rationale).

- **Step 2.4 — Evidence-path verification.** `verify_evidence --strict` over all new sub-phase audits. `sha256:HEX` prefix tolerance (closed-form Stage 2 N3) inherited.

- **Step 2.5 — Gate-13 replay verification.** Re-run Stage 1 step 9 from the landing perspective (worktree at `cd20faa`); record both RED-replay outcome and HEAD-GREEN outcome as FACT in the landing audit. Worktree removed post-replay.

- **Step 2.6 — Append-only check.** CI semantics + strict-mode. The append-only protected set now includes Phase 0 + Phase 1 Stage 3 audits + closed-form sub-phase audit chain (`2cc0f21`) + agent-based sub-phase audit chain (`739c93f`) + replay-tool-hotfix audit chain (`1f5fa0c`) + RD-3D sub-phase audit chain (`0df358d`). No edits to any file present at any of those SHAs within those protected paths.

- **Step 2.7 — Mutation-score artifact (B17 routing — OPERATOR-ROUTABLE this sub-phase).** Per RD-3D landing § 7.6, the per-target mutmut + uv-workspace runner infrastructure is now first-class. The decision at Stage 2 dispatch:
  - **Decision PATH-A-continue (lean if operator wants the second proof point of runner generalization):** additively extend `tools/testkit/mutation/mutmut-config.toml` with `[targets.sph_water]` block (paths-to-mutate: `packages/sph-water/sph_water/`; tests-dir: `packages/sph-water/tests/`) and `[targets.sph_water_dfsph_generator]` block (paths-to-mutate: `tools/testkit/golden/generator/dfsph_density_evolution.py`; tests-dir: `packages/sph-water/tests/test_dfsph_density_golden.py`). Use the same mutmut invocation form from RD-3D Stage 2 (`uv run --no-sync mutmut run --disable-mutation-types string,fstring`). Capture per-target kill-rates; threshold per spec § 2.13 (advisory). Artifact at `tools/testkit/mutation/sub-phase-particle-fluids-sph-water-<UTC>.json`. Commit slug: `chore(particle-fluids-sph-water-stage2-mutation-pathA): per-target extension + sph-water baseline`.
  - **Decision PATH-A-rebank (alternative — operator may route if RD-3D's 0.5927 sim-source kill-rate suggests the test-augmentation work is the load-bearing follow-up, not more sim-source baselines):** record sph-water mutation as banked into a future test-augmentation sub-phase; sub-phase still ships gates 4–13 GREEN. Commit slug: `chore(particle-fluids-sph-water-stage2-mutation-rebank): sph-water mutation banked pending test-augmentation`.
  - The plan does NOT pre-decide. **STOP-AND-SURFACE precondition (RD-3D landing § 7.6 inheritance):** if PATH-A-continue is dispatched but the runner integration blows up on sph-water (e.g., test-runtime explodes due to 1M-particle capture), the agent STOPs and surfaces to operator before defaulting to PATH-A-rebank.

- **Step 2.8 — CHANGELOG additive entry.** Append `### sub-phase-particle-fluids-sph-water` heading under `[Unreleased]` (no semver section — no tag). Itemize: gate-13 GREEN-flip for sph-water, golden-table-based gate-5 (cubic-spline + DFSPH density-evolution), vendored-upstream-consumption-discipline first practical exercise, canonical-capture descriptor landed, perf-ledger first-landing row, Cat 3 decision outcome, B17 routing outcome. Commit: `docs(particle-fluids-sph-water-stage2-changelog): sub-phase-particle-fluids-sph-water entry`.

- **Step 2.9 — Sub-phase landing audit.** `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-<UTC>.md` per IC-9 body. Front-matter `artifact: sub-phase`, `artifact_id: sub-phase-particle-fluids-sph-water`, both `head_sha:` AND `head_sha_at_checkpoint:`. `evidence_paths:` + `evidence_hashes:` enumerate all artifacts. Verdict-state CONFIRMED. Commit: `chore(particle-fluids-sph-water-stage2-landing-audit): sub-phase landing audit`.

- **Step 2.10 — Convention #12 SHA back-fill.** `git rev-parse HEAD` → replace placeholders; new commit. NEVER `--amend`. Commit: `chore(particle-fluids-sph-water-stage2-sha-backfill): back-fill landing audit SHA per Convention #12`.

- **Step 2.11 — Final summary.** No `-phase-N` tag is proposed. Optional `v0.1.4` non-phase point-release tag banked for operator. Surface to operator with landing-audit path, gate-status table, B17 routing outcome, Cat 3 decision outcome, vendored-discipline summary, and next-sub-phase recommendation (eulerian-smoke OR lattice-boltzmann-d3q19 — both share the Phase-1-Stage-2 NS-2D MMS per Phase 1 Stage 2 shift N5; operator selects at next-sub-phase dispatch).

---

## § 5. Dispatch — operator workflow

Inherited from `sub-phase-continuous-ca-rd3d.md` § 5 verbatim. Identity reads "particle-fluids sph-water sub-phase coordinator chat". § 7 prompts are the dispatchable units.

**Tag posture.** Same as prior sub-phases. No `-phase-N` tag. Lean: no intermediate tag. Optional non-phase point-release `v0.1.4` (no `-phase-N` suffix) is a banked operator decision. The agent NEVER pushes any tag.

---

## § 6. Coordinator prompt

Inherits Phase 1 § 6 / RD-3D sub-phase § 6 verbatim; identity "particle-fluids sph-water sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + sph-water evidence reverify + SPlisHSPlasH manifest-state verify | pending | — | — | — |
| 1 | sph-water implementation (including golden-based gate 5 + DFSPH solvers) | pending | — | — | — |
| 2 | integrity + replay sweep + Cat 3 routing decision | pending | — | — | — |
| 2 | B17 routing decision (PATH-A-continue OR PATH-A-rebank) + artifact | pending | — | — | — |
| 2 | CHANGELOG + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these **sub-phase conventions** (inherited from `sub-phase-continuous-ca-rd3d.md` § 7 standing orders, with substitutions):

- Commit slug `chore` / `feat` + `particle-fluids-sph-water-stage<N>-<scope>` (non-phase form).
- Doubled-directory paths preserved.
- Stack is pytest (Python NumPy reference per § 1.4 re-anchor). NO CMake/ctest at this sub-phase.
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:`.
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256. FACT/INFERENCE tagging.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit / golden / spec / probe committed at `v0.1.0-phase-1`, within closed-form / agent-based / replay-tool-hotfix / RD-3D sub-phase audit chains, or within the SPlisHSPlasH vendored tree at `references/SPlisHSPlasH/SPlisHSPlasH/` (spec § 9.2).
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close.
- Operator-only tag-pushing.
- `verify_evidence` `sha256:HEX` prefix tolerance inherited.
- When stuck → Phase 1 charter § 9 playbook + P21 (closed-form) + P22 (agent-based) + P23 (RD-3D MMS — inherited but NOT applicable at this sub-phase) + this sub-phase § 9 (P24 — SPH determinism debugging).

### § 7.1 Stage 0 — Pre-flight

```
You are the particle-fluids sph-water sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-particle-fluids-sph-water.md (this sub-phase's charter — source of truth; § 7 standing orders inherited).
  2. docs/phases/sub-phase-continuous-ca-rd3d.md (parent template; this charter inherits its three-stage structure and most discipline).
  3. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md (parent landing audit; § 8 lists 48 cumulative inherited shifts — do NOT re-litigate; § 9 lists banked items including MMS-runner generalization which is NOT blocking here).
  4. docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md (parent landing audit for IC-5 + Cat 3 Decision A precedent at commits 3ce7809 + d156792).
  5. docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md (verify_evidence sha256: tolerance + gate-13 worktree pattern).
  6. docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md (Phase 1 landing — § 14 baseline shifts, § 5 sph-water evidence sha256, Phase 1 Stage 3 manifest scope amendment at commit 83b3f5f).

Spec-Phase-1 landed at v0.1.0-phase-1 (SHA 9998bc1); closed-form at 2cc0f21; agent-based at 739c93f; replay-tool-hotfix at 1f5fa0c; RD-3D at 0df358d. Stage 0 is pre-flight only; you do NOT implement sph-water.

Execute Tasks 0.0 → 0.1 → 0.2 → 0.3 → closing per sub-phase charter § 4.1 exactly:

  Task 0.0 — Run replay_prior_phase against phase-1 with the 8-gate canonical set (uv run python -m … form, validated post-hotfix). Exit 0 → proceed; Exit 1 → write docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-blocked-replay-<UTC>.md per playbook P20. BIT-IDENTITY INVARIANT: sha256 the replay-output and verify it matches the established value 9399fc33…909f34 (byte-identical across closed-form + agent-based + RD-3D Stage 0). DIVERGENCE from this sha256 is a structural-correctness alarm, BLOCKED-with-surface.

  Task 0.1 — Bump tolerance-budget.toml's [phase] to "sub-phase-particle-fluids-sph-water"; bump opened_at. NO [budgets.*] widening. Commit per charter § 4.1.

  Task 0.2 — sha256sum tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt; compare to the Phase 1 landing audit's evidence_hashes: value (82fb91bc…cf12b1f; charter § 1.3 has the verbatim string). Mismatch → BLOCKED.

  Task 0.3 (RESHAPED THIS SUB-PHASE) — SPlisHSPlasH vendored-manifest-state verification (charter § 1.6 / § 4.1). Inspect references/SPlisHSPlasH/MANIFEST.toml at HEAD. Verify: (a) [upstream].sha == 6bff55a6eaf14083d34650f22a268ce156b62b54; (b) [scope].used_by_sims contains an entry referencing sph-water (current value at HEAD: ["sph-water"] — bare slug; the spec § 9.2 worked example uses the prefixed form "particle-fluid/sph-water"); (c) [scope].used_by_checks references cat3.cubic-kernel; (d) the on-disk vendored tree at references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.{h,cpp} exists. If any of (a),(c),(d) is drifted: BLOCKED-with-surface. If only the bare-slug-vs-prefixed-form discrepancy is present: proceed; record as a banked Phase-1-amendment candidate; default lean is NO amendment (the manifest at HEAD predates the spec § 9.2 worked-example form). Decision recorded in Stage 0 checkpoint.

  Closing — Commit docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-checkpoint-<UTC>.md per IC-9 abbreviated structure. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Body includes the bit-identity replay sha256 + Task 0.3 vendored-manifest verification result. Commit per charter § 4.1; apply Convention #12 SHA back-fill if needed. Surface and stop.

Out of scope: any sim work; any edit outside tolerance-budget.toml + new audit files; any edit to references/SPlisHSPlasH/ (forbidden by spec § 9.2).
```

### § 7.2 Stage 1 — Per-sim implementation

```
You are the particle-fluids sph-water sub-phase Claude Code agent, Stage 1 (per-sim implementation) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-particle-fluids-sph-water.md §§ 1.4 (Stack-C language re-anchor — Python ships now), 1.5 (determinism posture — SPH-specific), 1.6 (vendored-upstream consumption discipline — first practical exercise), 2 (per-gate deliverables), 3 (IC contracts), 4.2 (Stage 1 10-step sequence), 7 (standing orders), 9 (P24 SPH-determinism playbook entry).
  2. docs/phases/sub-phase-continuous-ca-rd3d.md § 4.2 (parent 10-step sequence — applies wholesale with the deltas in § 4.2 of this charter, particularly step 3 golden-vs-MMS pivot).
  3. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-checkpoint-<UTC>.md (Stage 0 close — replay PASS bit-identity, vendored-manifest disposition).
  4. Per sim, before drafting the bundle: docs/sim-specs/particle-fluids/sph-water/{README,spec-ref,algebraic,determinism,equivalence}.md, tools/testkit/probes/reports/sph-water.md (§ 5 is the API contract), packages/sph-water/tests/*.py (the GREEN target), tools/testkit/golden/tables/cubic-spline-kernel.json + tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json (gate-5 contract — DO NOT modify), tools/testkit/golden/derivations/{cubic-spline-kernel,dfsph-density-evolution}.md (DO NOT modify — algorithmic anchor for the Python reference), references/SPlisHSPlasH/MANIFEST.toml (the upstream-citation contract — DO NOT modify), references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.{h,cpp} (DO NOT IMPORT, DO NOT MODIFY — cite Bender-Koschier 2015 + Monaghan 1992/2005 by name in docstrings only per spec § 9.2).

Scope — ONE sim:
  sph-water (single canonical capture: dam-break-1M-particles-seed42-step1000 per Appendix D § D.2.3; golden-table-based gate 5; Python NumPy reference per charter § 1.4).

**Determinism-strategy declaration first** (charter § 1.5 — inherited from agent-based / RD-3D). Before drafting any implementation, write the determinism strategy as a docstring at the top of sph_water.sim:
  - Sorted neighbor-list construction (by particle id; stable secondary sort if Morton-keyed); no hashmap iteration-order leakage.
  - Sorted per-pair force-accumulation (no unsorted numpy.add.at over neighbor pairs); single accumulator per particle.
  - DFSPH inner iterations: fixed maximum-iteration cap + deterministic convergence-tolerance check (no early-stop based on wall-clock or RNG).
  - RNG (for IC sampling) threaded through common_py.determinism.Config; ban bare np.random.* in reference/sim.
  - Elementwise NumPy + boolean-indexed reductions; no BLAS / FMA path.
  - Phase-2+-deferred: Stack-C atomic scatter-add (n/a for the Python reference), driver FMA fusion, Vulkan subgroup-collective ops — all per determinism.md.
Cite this docstring in the Stage 1 commit-message footer.

**Vendored-upstream consumption discipline reminder** (charter § 1.6 — first practical exercise of spec § 9.2):
  - Cite Bender & Koschier 2015 (DOI 10.1145/2786784.2786796) and Monaghan 1992/2005 by name in sph_water.reference.dfsph docstrings.
  - DO NOT import or call any vendored source at references/SPlisHSPlasH/. The Python reference is derived independently from the cited papers (the manifest scope statement is explicit on this point).
  - DO NOT modify any file under references/SPlisHSPlasH/ (forbidden by spec § 9.2; append-only-protected by Stage 2 step 2.6).

Deliver gates 4–13 in one sub-bundle commit per the 10-step sequence in charter § 4.2:
  1. Determinism docstring.
  2. Implement sph_water.reference.dfsph (cubic-spline kernel W and ∇W, neighbor-list sorted construction, density, density_evolution, divergence_free_solve), .sim (sim_runner_seeded), .invariants (density_nonneg, kernel_normalization_unit_volume).
  3. **Gate-5 golden verification.** Wire test_cubic_spline_kernel_golden.py against the Phase-0 cubic-spline-kernel golden (5 fixture points, absolute=1e-15); wire test_dfsph_density_golden.py::test_{density,density_evolution}_at_two_particle_fixture against the DFSPH density-evolution golden (two-particle fixture, absolute=1e-15). If either fails → apply playbook P24 (charter § 9.1) BEFORE mutating the test thresholds.
  4. pytest packages/sph-water/tests/ -v → all 5 test files GREEN; capture verbatim to tools/testkit/failing-tests-evidence/sph-water-implemented-<UTC>.txt + sha256. Phase 1 RED evidence UNTOUCHED.
  5. Produce ONE canonical capture (dam-break-1M-particles-seed42-step1000); write captures/sph-water-ref/<descriptor>.{h5,json}. IF the .h5 exceeds the 64-MB pre-commit ceiling: STOP and surface (do NOT silently raise the ceiling); operator decides (raise to 128 MB OR introduce capture-downsampling cadence).
  6. Determinism: capture-twice-and-diff (test_run_twice_epsilon_diff GREEN). Record in commit-footer whether observed diff is bit-exact (0 max-abs-diff) or epsilon-bounded; bit-exact over-achievement is informational only (does NOT promote the spec declaration).
  7. PBT: 2 invariants (density_nonneg, kernel_normalization_unit_volume); commit .hypothesis/ DB.
  8. Perf-ledger row appended for (sph-water, stack-b-py-ref, dam-break-1M-particles-seed42-step1000); mirror hardware_id format; re-anchor against actual hardware.
  9. Gate-13 worktree replay: git worktree add /tmp/bp-replay-cd20faa-sph-water cd20faa (NOT partial checkout per closed-form S5); run PYTHONPATH=. uv run pytest packages/sph-water/tests/ -v in the worktree; sha256 the output; assert failure-mode matches Phase 1 RED evidence (5 ModuleNotFoundError collection-errors). Remove the worktree.
  10. Commit: feat(particle-fluids-sph-water-stage1): implementation through gate 13. Footer cites Phase 1 RED evidence sha256, new GREEN evidence sha256, capture sidecar paths + .h5 sha256, perf-ledger wall_clock_seconds, determinism-strategy declaration summary, vendored-discipline summary (SPlisHSPlasH cited by name, no imports of vendored sources), gate-5 golden-pass summary.

If Stage 1 runs long: stop at a clean cut-point (after step 4 OR after step 6) and commit a partial checkpoint; the operator dispatches a continuation session.

Closing — Commit docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-checkpoint-<UTC>.md per IC-9. Body: 13-row gate-status table + capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + determinism-strategy declaration summary + vendored-discipline summary + SHIFTED/banked items. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit + SHA back-fill if needed. Then stop.

Out of scope: modifying any Phase 1 / closed-form / agent-based / RD-3D / replay-tool-hotfix / vendored-SPlisHSPlasH artifact; implementing any other Phase 1 sim; touching convergence files (Stage 2 owns); reworking tools/testkit/mutation/ runners beyond additive [targets.<id>] blocks (Stage 2 B17 routing decides whether to extend at all); Stack-C C++ / CMake / Vulkan implementation (Phase-2+ per charter § 1.4); MMS verification (sph-water has no MMS per spec-ref § 7).

Stuck → charter § 9 (P24) + RD-3D § 9 (P23 — inherited but NOT applicable here, sph-water uses goldens not MMS) + agent-based § 9 (P22) + closed-form § 9 (P21) + Phase 1 charter § 9.
```

### § 7.3 Stage 2 — Landing

```
You are the particle-fluids sph-water sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-particle-fluids-sph-water.md §§ 4.3, 7.
  2. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-checkpoint-<UTC>.md, .../stage-1-checkpoint-<UTC>.md.
  3. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md (parent landing — § 7.6 B17 PATH-A first proof-point; § 9 banked items; the per-target mutmut + uv-workspace runner infrastructure is now first-class).
  4. docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md (Cat 3 Decision A precedent at commits 3ce7809 + d156792 for the additive-anchor-lift + subdir-pickup pattern).
  5. docs/phases/sub-phase-continuous-ca-rd3d.md § 4.3 (parent Stage 2 step structure).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A). Read the file first; append.

Execute Steps 2.1–2.11 per charter § 4.3 exactly. Load-bearing items:

  Step 2.3 — Cat 3 routing decision (OPERATOR-ROUTABLE at Stage 2 dispatch).
    Pre-flight state: _SUBDIRS_PICKED_UP = (Path("closed-form"), Path("agent-based")); Path("particle-fluids") NOT picked up. DFSPH density-evolution golden at tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json has 1 anchor under _anchor_count semantics (1 test_point × 1 independent_reference block; below ≥3 threshold). Phase-0 cubic-spline-kernel.json is at tables/ root and has 3 anchors (picked up regardless of subdir tuple).
    LEAN DECISION A (mirror agent-based precedent): additively lift the DFSPH golden from 1-anchor to 3-anchor (split the existing independent_reference block into three per-source blocks — Bender-Koschier 2015 / Monaghan 2005 / hand-derivation cross-check via the Phase-0 cubic-spline-kernel pin — OR add two additional test_points each with its own independent_reference). Then additively append Path("particle-fluids") to _SUBDIRS_PICKED_UP. Two commits (mirror agent-based commits 3ce7809 + d156792):
      chore(particle-fluids-sph-water-stage2-cat3-anchors): lift DFSPH density-evolution golden to ≥ 3 discrete anchors
      chore(particle-fluids-sph-water-stage2-cat3-subdirs): extend _SUBDIRS_PICKED_UP for particle-fluids subdir
    DECISION B (bank): skip the lift + pickup; particle-fluids subdir remains non-recursed; record as banked item. Operator may route Decision B if the DFSPH golden's 1-anchor enumerates 3 sources internally and the operator wants to preserve the original block structure verbatim.
    Surface the decision at Stage 2 dispatch; do NOT pre-decide.

  Step 2.5 — Gate-13 replay. Worktree at cd20faa (NOT partial checkout). Record both RED-replay outcome and HEAD-GREEN outcome as FACT.

  Step 2.7 — B17 routing decision (OPERATOR-ROUTABLE at Stage 2 dispatch).
    LEAN DECISION PATH-A-continue (second proof point of runner generalization): additively extend tools/testkit/mutation/mutmut-config.toml with [targets.sph_water] and [targets.sph_water_dfsph_generator] blocks; existing testkit/integrity/reaction_diffusion_3d targets UNCHANGED. Same mutmut invocation form as RD-3D Stage 2 (--disable-mutation-types string,fstring). Threshold per spec § 2.13 (verify HEAD value before asserting); mutation gate non-blocking (advisory) per inherited rationale. Artifact: tools/testkit/mutation/sub-phase-particle-fluids-sph-water-<UTC>.json with per-target rows; sha256 in landing audit evidence_hashes:. Commit slug: chore(particle-fluids-sph-water-stage2-mutation-pathA): per-target extension + sph-water baseline.
    DECISION PATH-A-rebank: skip the mutation work at this sub-phase; record as banked into a future test-augmentation sub-phase. Commit slug: chore(particle-fluids-sph-water-stage2-mutation-rebank): sph-water mutation banked pending test-augmentation.
    STOP-AND-SURFACE precondition (inherited from RD-3D § 7.6): if PATH-A-continue is dispatched but the runner integration blows up on sph-water (e.g., test-runtime explodes due to 1M-particle capture re-execution per mutant), STOP and surface to operator before defaulting to PATH-A-rebank.
    Do NOT pre-decide; operator routes at Stage 2 dispatch.

  Step 2.9 — Sub-phase landing audit. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-<UTC>.md per IC-9. Front-matter: artifact: sub-phase, artifact_id: sub-phase-particle-fluids-sph-water, both head_sha: AND head_sha_at_checkpoint:. evidence_paths: + evidence_hashes: enumerate every artifact. Include a § 12 "Vendored-discipline posture summary" subsection covering Stage 0 Task 0.3 result + Stage 1 docstring-citation discipline + any banked Phase-1-amendment-candidate items (e.g., bare-slug-vs-prefixed-form). Verdict-state CONFIRMED.

  Step 2.10 — SHA back-fill (Convention #12) — git rev-parse HEAD → replace placeholders; new commit. NEVER --amend.

  Step 2.11 — Final summary. NO -phase-N tag. Surface to operator: "sph-water sub-phase landed at SHA <final>. sph-water now ships all 13 gates GREEN — first vendored-upstream consumption at sim-test scale (SPlisHSPlasH 2.16.1 cited by name without import per spec § 9.2). Phase 0 + Phase 1 + closed-form + agent-based + RD-3D unaffected; the three other Phase 1 sims still RED with ModuleNotFoundError pending their own per-sim implementation sub-phases. B17 routing: <PATH-A-continue with kill-rates / PATH-A-rebank with rationale>. Cat 3 particle-fluids subdir: <Decision A landed with lift+pickup / Decision B banked>. No -phase-N tag pushed; optional non-phase point-release tag (e.g., v0.1.4) is a banked operator decision. Next sub-phase: eulerian-smoke OR lattice-boltzmann-d3q19 (both share the NS-2D MMS per Phase 1 Stage 2 N5 — operator selects + plan-drafts in a separate session; the MMS-runner-scaffolding generalization (RD-3D landing § 9.3) becomes load-bearing for the operator's plan-time decision at that point)."

Stuck → charter § 9 (P24) + RD-3D § 9 (P23) + agent-based § 9 (P22) + closed-form § 9 (P21) + Phase 1 charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits `sub-phase-continuous-ca-rd3d.md` § 8 verbatim. Paths:
- Stage 0 / Stage 1 checkpoints: `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-<N>-checkpoint-<UTC>.md`.
- Stage 2: the sub-phase landing audit itself (no separate checkpoint).
- Continuation prompt with `particle-fluids-sph-water-stage<N>-...` slug.

**Convention #12 SHA back-fill at EVERY stage close** (inherited).

---

## § 9. Risk surface — sub-phase-specific

Beyond `sub-phase-continuous-ca-rd3d.md` § 9 (inherited verbatim — R1 through R11 / R12 RD-2D-MMS-regression-scope-leak [not applicable here]):

- **R12 (canonical-capture size vs pre-commit ceiling).** The canonical capture `dam-break-1M-particles-seed42-step1000` is materially heavier than RD-3D's 64³ × 2000 steps. RD-3D Stage 1 N4 raised the `check-added-large-files` ceiling from 10 MB → 64 MB to absorb RD-3D's ~46 MB H5. 1M particles × 1000 steps (even with single-precision position-only snapshots at the canonical cadence) could trivially exceed 64 MB. Mitigation: Stage 1 step 5 explicitly STOPs-and-surfaces if the H5 exceeds the ceiling; operator routes between raising to 128 MB and introducing a capture-downsampling cadence. The plan does NOT silently raise the ceiling.

- **R13 (DFSPH inner-iteration divergence / non-convergence).** The two DFSPH solvers (constant-density + divergence-free velocity) iterate until a tolerance is met. Risk: pathological IC + tight tolerance produces non-convergence; max-iteration cap fires; the resulting state has residual density-error or non-divergence-free velocity, contaminating downstream tests. Mitigation: P24 playbook entry below; record max-iteration-firings in the canonical-capture sidecar metadata so the operator can inspect.

- **R14 (vendored-discipline drift through implementation).** First practical exercise of spec § 9.2 at sim-test scale. Risk: subtle import-by-name vs cite-by-name confusion in `sph_water.reference.dfsph` (e.g., a "for reference, see SPHKernels.h" comment that morphs into a real `from references.SPlisHSPlasH...` import during refactor). Mitigation: Stage 2 step 2.6 append-only check explicitly enumerates `references/SPlisHSPlasH/` as a protected subtree; any HEAD edit beneath it fails the check. The Stage 1 commit-message footer's vendored-discipline summary makes the discipline explicit per commit.

- **R15 (B17 PATH-A test-runtime explosion on sph-water).** RD-3D's mutmut run mutated 275 + 130 mutants × pytest-suite-per-mutant; sph-water's pytest suite includes a 1M-particle capture re-execution at gate 11. If `test_run_twice_epsilon_diff` re-runs the canonical capture, each mutant's pytest invocation could be 10²–10³ s long; 400+ mutants × 10²–10³ s puts the per-target mutation run at 10⁴–10⁵ s (hours–days), far beyond a single session's budget. Mitigation: § 4.3 Step 2.7 STOP-AND-SURFACE precondition; the operator may route PATH-A-rebank pre-emptively if Stage 1 perf-ledger shows the canonical capture > 60 s. Alternatively, the per-target runner can be invoked against a smaller-N test subset (e.g., only the golden tests, skipping gate-11) — an additive runner-config decision.

### § 9.1 New playbook entry (P24 — MANDATORY)

> **P24 — SPH determinism debugging when neighborhood density / pressure / force computations exhibit run-to-run drift.**
> *When to apply:* `test_run_twice_epsilon_diff` fails at Stage 1 step 6 (epsilon-bound exceeded, OR bit-exact target violated under § 1.5 expectation), OR `test_dfsph_density_golden.py` fails non-deterministically across runs (one run passes, the next fails with `absolute > 1e-15`).
> *Common causes, in priority order:*
> 1. **Neighbor list constructed via unsorted spatial hash.** Hashmap iteration order is implementation-defined across Python interpreter sessions in some configurations (PYTHONHASHSEED-dependent for dict ordering of string keys, though CPython 3.7+ dicts preserve insertion order — verify the hash strategy actually preserves insertion-order or sorts by stable key). Fix: sort particles by id (or by Morton key with stable secondary id-sort) before per-pair iteration; banish any `for neighbor in self._hash[bucket]:` that relies on bucket insertion order.
> 2. **Per-pair force-accumulation order varies between runs.** Each particle's density / pressure is a sum over neighbors; FP non-associativity means `(a+b)+c ≠ a+(b+c)` at machine precision. If the neighbor iteration order varies, the per-particle sum varies. Fix: iterate neighbors in sorted (by id) order; use a single accumulator per particle (no `numpy.add.at` over unsorted pair indices, which uses unspecified-order accumulation under the hood).
> 3. **DFSPH inner-iteration tolerance threshold sensitive to accumulated rounding.** The pressure-projection / divergence-free iterations check a tolerance; if accumulated rounding from steps 1–2 nudges the residual ε just above-vs-below the threshold across runs, the iteration count differs (e.g., 5 vs 6 iters), and the final state differs at O(tol). Fix: pin a fixed maximum-iteration cap and check tolerance as `<=` (not `<`); accept the floor-cap state if the cap fires. Document the cap in the determinism-strategy declaration docstring per § 1.5.
> 4. **Particle ordering not stable across timestep.** If the integrator reorders particles (Morton re-sort each step, for example), the sort key must persist or be re-derived deterministically. Fix: re-derive Morton key from positions deterministically (using the same grid + same bit-interleave); never sort by position-tie-breaks (use id as the stable secondary key).
> 5. **FMA fusion in dense-product kernels.** Pure NumPy on Linux/x86 typically does NOT fuse multiply-add; this is more likely to be an issue if the implementation drops to a `@numba.jit` or `numexpr` fast-path. Fix: stay on pure NumPy at the sub-phase scope; defer any compiled fast-path to Phase-2+.
> 6. **Stochastic IC sampling via bare `np.random.*`.** Inherited cause from agent-based P22 / RD-3D § 1.5; mitigation identical (thread RNG through `common_py.determinism.Config`; ban bare `np.random.*` in `reference`/`sim`).
> *Debug-step ordering:* before mutating the test thresholds, (a) verify particle-id sort is the iteration key (read the neighbor-iteration loop); (b) verify `numpy.add.at` is NOT used for pair-force accumulation; (c) pin DFSPH iteration cap + tolerance check semantics; (d) verify no bare `np.random.*`; (e) only then consider the epsilon threshold as the suspect — and if it's the threshold, surface to the operator before widening.

(P25 — vendored-upstream-consumption-discipline playbook entry — NOT added at this sub-phase. The discipline is documented adequately in spec § 9.2 and the Stage 0 Task 0.3 + Stage 1 docstring-citation discipline + Stage 2 step 2.6 append-only check together cover the failure modes (manifest scope drift, vendored SHA pin drift, reference-by-name-vs-by-import confusion). If a future vendored-consumption sub-phase finds these covers insufficient — e.g., MPM Taichi vendoring with materially different surface area — P25 lands then with the actual failure mode as worked-example.)

---

## § 10. Audit-trail discipline

Inherits `sub-phase-continuous-ca-rd3d.md` § 10 verbatim. Sub-phase audits live under `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/`. Convention #12 SHA back-fill at every stage close. Append-only check at Stage 2 Step 2.6 forbids edits to any file present at `v0.1.0-phase-1` OR within closed-form (`2cc0f21`) / agent-based (`739c93f`) / replay-tool-hotfix (`1f5fa0c`) / RD-3D (`0df358d`) sub-phase audit chains, OR within the SPlisHSPlasH vendored tree at `references/SPlisHSPlasH/` (spec § 9.2 protection).

Audit front-matter `artifact:` enum: Stage 0 + Stage 1 checkpoints use `artifact: stage` (`artifact_id: particle-fluids-sph-water-stage-0` / `particle-fluids-sph-water-stage-1`); Stage 2 landing audit uses `artifact: sub-phase` (`artifact_id: sub-phase-particle-fluids-sph-water`).

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

Verified by Stage 0 Task 0.0 replay against the 8-gate set:

- sph-water TDD bundle (5 spec docs + DFSPH density-evolution golden + 1 probe + 5 failing tests + DFSPH derivation) at SHA `cd20faa`.
- Phase-0 cubic-spline-kernel golden at `tools/testkit/golden/tables/cubic-spline-kernel.json` (UNCHANGED at this sub-phase).
- SPlisHSPlasH vendored manifest + tree at `references/SPlisHSPlasH/` (Phase-0 deliverable, scope-amended at Phase 1 Stage 3 commit `83b3f5f`; UNCHANGED at this sub-phase per spec § 9.2).
- IC-1 / IC-3 / IC-5 / Phase-0 testkit/capture / Phase-0 testkit/determinism / Phase-0 testkit/property infrastructure.
- The 48 cumulative shifts — baseline reality; do NOT propose corrections.
- Closed-form / agent-based / RD-3D resolved items (Cat 3 closed-form + agent-based subdir pickups; verify_evidence sha256 tolerance; determinism-strategy declaration discipline; per-target mutmut + uv-workspace runner infrastructure first-class at RD-3D Stage 2; bit-identity replay-output sha256 `9399fc33…909f34`) — established tool behavior at HEAD.

### § 11.2 Banked items inherited

- **MMS-runner-scaffolding generalization** (RD-3D Stage 1 SHIFT S2 → RD-3D landing § 9.3). NOT blocking this sub-phase (sph-water uses goldens, not MMS); plan-side recommendation is to interpolate the generalization as a focused MMS-pipeline-generalization sub-phase between sph-water and the first MMS-using sibling (eulerian-smoke or LBM), OR to inline-then-generalize at the first MMS-using sibling's plan-time. Carried forward to § 11.3 as a load-bearing question for the NEXT sub-phase's plan-drafting (not for this one).
- **RD-3D test-augmentation candidate** (RD-3D Stage 2 N3 → RD-3D landing § 9.3). Operator-routable; default-skip for siblings; banked to spec-Phase-2+ when sim-source mutation thresholds become gating.
- **B17 PATH-A continued / re-banked.** Stage 2 Step 2.7 routes per § 4.3.
- **Cat 3 `_SUBDIRS_PICKED_UP` for sibling subdirs** (hybrid-pg, lattice). Each is the work of its own per-sim implementation sub-phase. `particle-fluids` itself is operator-routable at this sub-phase per § 4.3 Step 2.3 (lean Decision A).
- **Cat 3 evaluator shims** for the four pre-existing AUDIT_LOG algorithms + (potentially new this sub-phase) `dfsph-density-evolution-2particle` + `cubic-spline-kernel-3d-monaghan`. Banked unchanged.
- **B2 / B3 / B4 / B5 / B6 / B11 / B16** (Phase 1 open). Out of this sub-phase's scope.
- **B-hotfix-1 / B-hotfix-2** (replay-tool-hotfix). Phase-2+ Stack-C ergonomics audit revisits. Banked.
- **RD-3D landing § 8.2 N1** (Stage 1 checkpoint JSON-sidecar sha256 mis-recording). Sealed; no retroactive edits. Mentioned only for inventory inheritance.

### § 11.3 Outputs to subsequent sub-phases

- sph-water 13 gates GREEN — equivalence baseline for Phase-2+ Stack-C cross-stack work (`Stack-B-Python-ref → Stack-C-C++/Vulkan with vendored SPlisHSPlasH consumption`).
- One new canonical capture lands in `captures/sph-water-ref/` per Appendix D § D.2.3 — first-class entry in the legacy-capture corpus. The capture-size + pre-commit-ceiling decision (R12) sets the precedent for the upcoming MPM / LBM / eulerian-smoke 3D captures (each potentially heavy).
- **First practical exercise of spec § 9.2 vendored-upstream consumption discipline** — the docstring-citation pattern + Stage 0 manifest-state-verification task + Stage 2 append-only check on `references/<upstream>/` are first-class. Subsequent vendored-consumption sub-phases (MPM Taichi vendoring per spec § 5.5; potential future grBP / Warp consumptions) inherit.
- **P24 playbook entry** added; subsequent per-sim sub-phases with denser-than-7-point-stencil neighborhood interactions (MPM particle-grid scatter, LBM streaming) inherit the determinism-debugging template; MPM particularly will need a P26 grid-scatter addendum.
- **B17 routing-decision precedent** — whatever sph-water Stage 2 routes (PATH-A-continue with second proof-point OR PATH-A-rebank with test-runtime rationale) sets the template for subsequent sub-phases.
- **Cat 3 anchor-lift + subdir-pickup precedent for the particle-fluids subdir** (IF Decision A is routed at Stage 2 dispatch).
- **Question elevated to the NEXT sub-phase's plan-drafting:** MMS-runner-scaffolding generalization (RD-3D § 9.3 banked) becomes LOAD-BEARING for eulerian-smoke / LBM plan-drafting. The operator should explicitly decide at the next-sub-phase plan-drafting whether to interpolate a focused MMS-pipeline-generalization sub-phase between this one and the first MMS-using sibling, OR to inline-then-generalize at the first MMS-using sibling's plan-time. This sub-phase's plan does NOT propose the generalization.

### § 11.4 Replay-chain non-participation + tag posture

Inherits `sub-phase-continuous-ca-rd3d.md` § 11.4 verbatim with identifier substitutions. This sub-phase does NOT participate in the cross-phase replay chain. The next spec-phase pre-flight (spec-Phase-2 Stage 0) replays against `v0.1.0-phase-1` — NOT against any sibling sub-phase tag.

What protects this sub-phase's work across the gap to spec-Phase-2 is spec § 3.5 gate 13: the Phase 1 failing-tests-evidence sha256 for sph-water (`82fb91bc…cf12b1f`) must continue to match at `v0.1.0-phase-1` even after implementation lands here.

**Tag-posture decision banked for operator at Stage 2 close:**

- **Lean recommendation: no intermediate tag.** Sub-phase commits accumulate to `main`; the landing audit + per-sim commit provide the audit trail.
- **Alternative: non-phase point-release tag `v0.1.4`** (no `-phase-N` suffix). Distinguishes this sub-phase landing in `git log`. Acceptable per spec § 7.12; operator-pushed.
- **Forbidden either way:** any tag carrying `-phase-N`. Reserved for spec-phase boundaries.

### § 11.5 Operator-routable items surfaced by this plan (banked alternatives)

For explicit operator confirmation at dispatch time:

1. **§ 1.4 language-pivot re-anchor** — confirm this sub-phase ships Python NumPy reference (default lean), NOT C++ / CMake / Vulkan / vendored-kernel-consumption. If the operator routes "land a Stack-C C++ port now," the plan is materially different: a separate particle-fluids-sph-water-Stack-C sub-phase plan, gated on C++ build infrastructure + Vulkan device-init + per-sim CMakeLists landing (B16 + B6 Phase-1-open) AND the first practical vendored-kernel-import discipline.
2. **§ 1.3 / Task 0.3 SPlisHSPlasH manifest bare-slug-vs-prefixed-form** — confirm default lean (NO amendment; record as banked Phase-1-amendment candidate). Alternative: route a small additive amendment commit at Stage 0 close to align `used_by_sims` to the spec § 9.2 worked-example prefixed form.
3. **§ 4.3 Step 2.3 Cat 3 routing for `particle-fluids` subdir** — confirm Decision A (lift DFSPH golden to ≥ 3 anchors + extend `_SUBDIRS_PICKED_UP`, mirroring agent-based commits `3ce7809` + `d156792`). Alternative: Decision B (bank the lift + pickup).
4. **§ 4.3 Step 2.7 B17 routing** — confirm Decision PATH-A-continue (extend per-target mutmut config with sph-water targets, second proof-point of runner generalization). Alternative: Decision PATH-A-rebank (skip the mutation work at this sub-phase; bank into a future test-augmentation sub-phase). The PATH-A-rebank alternative is operator-routable specifically if the operator judges the RD-3D 0.5927 sim-source kill-rate signals that the test-augmentation work (RD-3D § 9.3) is the load-bearing follow-up, not more sim-source baselines.
5. **§ 2 gate 10 / § 9 R12 canonical-capture-size vs 64-MB pre-commit ceiling** — Stage 1 step 5 will STOP-and-surface if the H5 exceeds the ceiling. Confirm default disposition: operator routes between (a) raising ceiling to 128 MB, (b) introducing a downsampling cadence, (c) routing to a smaller-N canonical capture (would require Appendix D § D.2.3 amendment — Phase-1-retroactive).
6. **§ 11.4 v0.1.4 tag** — confirm no-tag default (lean) vs push-v0.1.4 (alternative).

---

*End of sph-water particle-fluids sub-phase charter. Inherits Phase 1's + closed-form's + agent-based's + RD-3D's role model, audit discipline, conventions, IC contracts (with IC-5 particle-tier-2 substack inherited from agent-based + Phase-0-vendored-upstream consumption discipline as the new substack per § 3 + § 1.6), determinism-strategy declaration discipline (§ 1.5 / inherited from agent-based § 1.4 / RD-3D § 1.5 with SPH-specific causes), and problem-solving playbook wholesale; adds the **golden-table-based gate-5 with two-golden composition** (Phase-0 cubic-spline-kernel + Phase-1 DFSPH density-evolution per § 2 gate 5 + § 4.2 step 3), the **vendored-upstream consumption discipline first practical exercise** (§ 1.6 + § 4.1 Task 0.3 + § 4.2 step 2 + § 4.3 step 2.6), the **SPH-specific determinism strategy** (§ 1.5 — sorted neighbor list + sorted per-pair accumulation + DFSPH iteration determinism), and the **P24 playbook entry** (§ 9.1 — SPH determinism debugging) as deltas. Surfaces six operator-routable items at dispatch time (§ 11.5). Establishes that subsequent per-sim implementation sub-phases (eulerian-smoke / LBM / MPM-multimaterial) inherit all four deltas + the first-class vendored-discipline pattern + the per-target mutmut runner infrastructure (extended additively at this sub-phase IF Decision PATH-A-continue is routed).*

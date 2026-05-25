# lattice-boltzmann-d3q19 → Stack-E Port — Sub-Phase Charter (EIGHTH spec-Phase-2 cross-stack port; THIRD Stack-E port; SECOND LBM port)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) —
> **EIGHTH per-sim cross-stack port under spec-Phase-2**, the **THIRD Stack-E
> port consuming `common/common-warp`** (after `mpm-multimaterial-stack-e` +
> `eulerian-smoke-stack-e`), and the **SECOND `lattice-boltzmann-d3q19` port**
> (after the Stack-D Taichi port). Ports `lattice-boltzmann-d3q19` from its
> Phase-1 implemented reference (Python NumPy; `stack.name="numpy-reference"`,
> `sim.category="lattice"`, `variant="bgk-d3q19-qian-1992"`) to **Stack-E
> (Python / NVIDIA Warp 1.13.0 / CPU)**, consuming the common-warp § 1.9.1 socket
> (Runtime + Capture + Determinism) + an own `wp.array(dtype=wp.float64, ndim=4)`
> for the 19-component D3Q19 distribution, against the MPM-Stack-E / smoke-Stack-E
> structural template + the LBM-Stack-D laminar-regime content.
> **Spec mandate:** § 11.3 item **2.5** ("LBM to Stack D **and Stack E**") — the
> **Stack-E half** of a fully-enumerated mandate (the Stack-D half landed at
> `lattice-boltzmann-d3q19-stack-d`). A clean spec-mandated port.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (sha256 `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` — verified at HEAD per probe § 2) §§ 2.5 (IC-13 / determinism harness), 2.6 (cross-stack tolerance — **`lbm` category `relative = 1e-5`**, the portfolio-tightest), 2.7 (capture format + canonical descriptor), 3.5 + Appendix **D.6** (14 acceptance gates), D.7 (lattice Tier-2 = `vector_field` IC-6 on the macroscopic velocity), 3.6 ("the harness is a test, not an aspiration"), 4.4/4.5 (CPU `bit-exact-same-hw`; Stack-E = Python/Warp), 7.5 + Appendix G.7 (IC-16 citations), **11.3 item 2.5** (LBM → Stack-D+E mandate), Appendix D § D.2.3 (canonical descriptors — Poiseuille 64×32 / Couette 32×16).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `7713828f3246e29f4154a64e34b4850056342a3ba16ef45215bf5b952b7d3164` — verified at HEAD). **§ L.4** (chaotic-regime + S6-trajectory-simulation; the R-SME9 canonical-resolution refinement), **§ L.5** (common-warp-bootstrap S1a-2/S1b-3/S1c-1), **§ L.6** (Warp `@wp.kernel` quirks O-W6/O-W7), **§ L.7** (MPM-Stack-E O-1 verdict taxonomy + O-2 four-checkpoint Warp CPU determinism chain), **§ L.8** (eulerian-smoke-Stack-E — the cross-stack BIT-EXACT counter-instance; the O-1 shape-(a) D-S2-1 refinement; the "measure step-1, don't predict from regime" discipline; the O-W7 fresh-var narrowing) all load-bearing. Inherits role model (§ A.3), three-stage cadence (§ A.2), append-only discipline (§ B), Convention #12 SHA back-fill (§ B.2 + N1 enumerate-all-placeholders), commit-message convention (§ C), replay-chain non-participation (§ D.4), gate-13 worktree pattern (§ E), determinism convention (§ F), Stage-0 scope-analysis (§ N), capture cadence routing (§ P).
> **IC-15 reference document (consumed AS-IS):** `docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `f9c6a3cf3235e7ec48cd8d162f90fe0164065446fe86a8be66c328b6ee8b808f` — verified at HEAD). 5 codified components + § 4 LBM + § 5 MPM + § 6 smoke R-P2 escape-hatch (+ § 6.1 R-P2 re-characterized: R-P2 needs **both** chaos AND a non-zero seed-difference; + § 6.7 the eulerian-smoke-Stack-E counter-instance) + 5 deferred aspects. This is the EIGHTH pair; it **engages deferred aspect #4 (collision-step FP-accumulation)** substantively (the SECOND data point, FIRST on Warp) while #1 (R-P2 chaotic) is NOT engaged (laminar), #3 (atomic-scatter) is N/A (gather, no scatter), and #5 (iterative-solver) is N/A (single-pass explicit).
> **common-warp inheritance contract (§ 1.9.1 socket; verified verbatim at HEAD per probe § 2):** `init(device: str | None = None, deterministic: bool = False) -> str`; no-arg `deterministic_context() -> Iterator[int]`; `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0) -> str`; `set_warp_deterministic(seed, device="cpu") -> int`; `set_seed` / `get_seed`; `write_capture` / `read_capture` / `Capture`. Subsystems consumed: **1 Runtime + 2 Capture + 3 Determinism** (the socket); Subsystems 4 Particles (no particles) / 5 Grids (f32-pinned + single-component `ScalarField3D` does not fit the 19-component distribution) / 6 HashGrid (no neighbor-search; streaming is a fixed-offset gather) are NOT structurally consumed (probe § 3 (c)). The port rolls its OWN `wp.array(dtype=wp.float64, ndim=4)`.
> **Structural inheritance template:** `docs/phases/sub-phase-mpm-multimaterial-stack-e.md` + `docs/phases/sub-phase-eulerian-smoke-stack-e.md` (the SIXTH + SEVENTH per-sim ports; the first two common-warp consumers; closest STRUCTURAL template — socket consumption, own-f64-`wp.array`s, the O-2 four-checkpoint determinism chain, the Convention-#12 chain; smoke-E is also the cross-stack BIT-EXACT shape-(a) + "measure step-1" precedent) + `docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md` (the THIRD per-sim port; SAME sim source; the laminar-regime / two-capture / dual-arm-gate-4 / IC-6 CONTENT template). This charter inherits the MPM/smoke Stack-E structure with the laminar LBM content explicit (§ 5): common-warp instead of common-py; Warp CPU serial launch instead of Taichi `cpu_max_num_threads=1`; `wp.float64(…)` seeds instead of `ti.f64(…)`; `@wp.kernel` instead of `@ti.kernel`; gate-14 a **cross-stack BIT-EXACT** witness (`max_abs_err=0.0`; probe § 6 step-1 seed-difference MEASURED `0.0`).
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Phase-1 `lattice-boltzmann-d3q19` reference sealed: `packages/lattice-boltzmann-d3q19/` (D3Q19 BGK; Qian-1992 second-order equilibrium; collision `f − (f−f_eq)/τ` + Guo body force + per-direction `np.roll` streaming + half-way bounce-back; lex 19-direction ordering; f64; NO atomic-scatter; NO iterative solver). TWO canonical captures (LFS): `captures/lbm-ref/{poiseuille-64x32-seed42-step1000, couette-32x16-seed42-step500}.{h5,json}` (`202,350,128 B` + `27,405,152 B`; gate-14 LEFT-partners).
> - `eulerian-smoke-stack-e` landed `c5806f3` (the cross-stack BIT-EXACT shape-(a) counter-instance; § L.8 + methodology § 6.7); `mpm-multimaterial-stack-e` landed earlier (the § 1.9.1 socket + the O-2 four-checkpoint chain). Both data-backed the socket-only-for-f64 consumption pattern (warp.md § 6.1 / § 6.2).
> - `lattice-boltzmann-d3q19-stack-d` landed (gate-14 `within_tolerance=True`, `max_abs_err ~6e-15`, shape (b) FP-round-off; laminar; dual-arm gate-4; `[overrides.lattice-boltzmann-d3q19] category="lbm"` established at Stage 1c).
> - Conventions `7713828f…`; architecture `e82b7b8e…`; methodology `f9c6a3cf…`; warp.md `eff17d30…`; all HEAD.
> - `[defaults.lbm]` = `relative = 1e-5, absolute = 0.0`; `[overrides.lattice-boltzmann-d3q19]` **already exists** → no new override for Stack-E (probe § 7 / D6).
> **Inherited shifts:** **209 documented entering** (FACT — dispatch ENTERING-STATE; carried by reference from the `eulerian-smoke-stack-e` sub-phase close). Carried by reference; not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/plan-drafting-probe-2026-05-25T15-30-00Z.md`. Read FIRST. Authoritative for the Phase-1 baseline + Task 1.6 (§ 6 — Part A LAMINAR; Part B step-1 seed-difference MEASURED `0.0`), common-warp consumption (§ 3 (c) — socket-only + own f64 `ndim=4`), tolerance/capture mechanics (§ 7 — reuse; both captures LFS-committable), the R-LBME* surface (§ 5), and the D1–D17 surface (§ 9).
> **Date drafted:** 2026-05-25.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D17 routing (§ 9).

---

## § 1. Scope

The **EIGHTH per-sim cross-stack port** under spec-Phase-2, the **THIRD Stack-E
port**, and the **THIRD `common/common-warp` consumer**. Takes the Phase-1-frozen
`lattice-boltzmann-d3q19` reference (Python NumPy; `stack.name="numpy-reference"`)
and produces a content-equivalent Stack-E port (Python / NVIDIA Warp 1.13.0 / CPU
mode default) at `packages/lattice-boltzmann-d3q19-stack-e/`, through gates 4–14 of
spec § 3.5 / Appendix D.6 (13 stack-agnostic correctness gates + the Phase-2 14th
gate of cross-stack equivalence against the Phase-1 reference captures at
`relative=1e-5` — the portfolio-tightest category).

This sub-phase validates the Stack-E inheritance contract for a **dense Eulerian
lattice f64 sim**: Runtime + Capture + Determinism are consumed substantively; the
f32-pinned `ScalarField3D`/`VectorField3D` + the HashGrid neighbor-search subsystems
are NOT structurally consumed by an f64 19-component lattice port (probe § 3 (c);
warp.md § 6.1 / § 6.2 f64-principle CONFIRMED, third instance — LBM patterns like MPM:
the convenience surface does not structurally fit [the distribution is 19-component,
not single-component] AND is f64-blocked).

**Algorithmic surface (HEAD-verified; probe § 6 / § 10):** D3Q19 BGK lattice-Boltzmann,
Qian-d'Humières-Lallemand (1992) second-order equilibrium: BGK collision
`f_i^post = f_i − (f_i − f_i^eq(ρ,u))/τ` + Guo (2002) body force + per-direction
streaming gather (`np.roll(f[i], shift=c_i)` → periodic integer-mod gather) + half-way
bounce-back (the `OPP` opposite-direction swap + moving-wall momentum injection
`−2 w_i ρ_wall (c_i·u_wall)/c_s²`). The cross-stack-sensitive surface is the
collision-step FP-accumulation (the 19-term moment reductions `density_field`
`f.sum(axis=0)` + `momentum_field` `einsum` + the feq polynomial) — deferred IC-15
aspect #4.

**The defining regime + verdict (empirically grounded; probe § 6):** Task 1.6 Part A
EXECUTED both canonical trajectories at **canonical resolution** and confirms
**LAMINAR / bounded / dissipative** (Poiseuille `max|u_lat| 5e-6 → 8.65e-3 @ step 1000`,
`Ma=0.015`; Couette → exactly `0.05 @ step 50`, bit-stable through step 500, `Ma=0.087`)
— BGK `τ=0.7` damps; the inverse of smoke's positive-Lyapunov blow-up; the analog of
MPM-Stack-E's BOUNDED free-fall. Task 1.6 Part B MEASURED the **step-1 cross-stack
seed-difference = EXACTLY `0.0`** (a faithful Warp f64 CPU full step — collision + Guo +
streaming + bounce-back incl. moving-wall injection — reproduces the sealed NumPy
reference byte-for-byte, on both canonical ICs + a developed-flow state + every isolated
component). Per methodology § 6.1, R-P2 needs **both** chaos (i) AND a non-zero
seed-difference (ii); LBM has NEITHER → **gate-14 is planned as a cross-stack BIT-EXACT
witness** (`within_tolerance=True`, `max_abs_err=0.0`; O-1 verdict shape **(a)**) — the
THIRD shape-(a) instance (after MPM-E + smoke-E) and the **FIRST shape-(a) on a LAMINAR
trajectory** (completing the D-S2-1 decoupling: shape (a) is a zero-seed-difference
property, orthogonal to the Lyapunov regime). The contrast to LBM-Stack-D (Taichi, shape
(b) `~6e-15`) is the within-sim cross-backend confirmation of § 6.7 (the seed-difference
is a backend-pair property, not the sim's). **This prediction is empirically MEASURED at
plan-drafting (not predicted-from-regime) per § L.8 — the smoke-Stack-E anti-pattern is
explicitly avoided.**

---

## § 2. Stage decomposition (proposed; D2 for operator routing)

Lean: **same 6-stage shape as smoke-Stack-E / MPM-Stack-E** — plan-drafting + Stage 0
+ Stage 1a + Stage 1b + Stage 1c + Stage 2. Task 1.6 surfaced NO reason to compress.
**Stage-decomposition authority:** Stage 1a is **scaffold ONLY** (skeleton + failing
tests); the implementation, gates 4–13, gate-10 determinism, workspace registration,
captures, and O-2 checkpoints 2+3 land at **Stage 1b** (the smoke-Stack-E split,
ratified there; NOT the MPM-Stack-E impl-folded-into-1a pattern). Two structural points:
**Stage 1c's tolerance-override-add step collapses to a verify-only no-op** (D6 — the
override already exists); and **gate-14 is planned as a cross-stack BIT-EXACT witness
from the start** (no surprise STOP in either direction — the step-1 seed-difference is
MEASURED `0.0` and the regime is MEASURED laminar).

| Stage | Purpose | Single-session? |
|---|---|---|
| **plan-drafting** (this) | probe + charter + plan-drafting landing + SHA back-fill (4 commits) | yes |
| **Stage 0 — Pre-flight** | Tasks 0.0–0.6 + checkpoint + SHA back-fill. **0.0** Convention-M anchor re-check at then-HEAD (conventions/methodology/architecture/warp.md sha256; replay `9399fc33…`; integrity `c19492ad…`; capture path `captures/lbm-ref/`); **0.1** common-warp § 1.9.1 socket consumption probe (Runtime/Capture/Determinism call sites; the MPM-E/smoke-E own-f64-`wp.array` pattern as reference consumer); **0.2** Warp CPU determinism R-A1 anchor (O-2 chain checkpoint 1 — a collision-or-streaming `@wp.kernel` determinism kernel; sha256 anchor); **0.3** f64-storage + `wp.float64()` seed audit (R-LBME2; `wp.float64(0.0)` reduction accumulators; `wp.float64(1.0)` feq literal; precompute f64 `inv_cs2`/`inv_cs4`/`inv_two_cs2`/`inv_two_cs4` from `c_s²=1/3`; confirm `write_capture` preserves f64 — verified at probe HEAD: `np.asarray`, no downcast); **0.4** canonical-descriptor scope-analysis (§ N — re-estimate Warp-CPU wall-clock vs LBM-Stack-D Taichi Poiseuille 4.954 s / Couette 0.973 s; both captures ≤256 MiB → both LFS-committable, no held-local; Couette 27 MB = schema-corpus subset per § 5.4); **0.5** tolerance-override REUSE verification (no new row; `compare_captures` keys on LEFT `sim.name`); **0.6** gate-4 dual-arm consumability (the equilibrium golden `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` + the shared `incompressible_ns_2d` MMS source). | yes |
| **Stage 1a — Failing-tests commit** | `packages/lattice-boltzmann-d3q19-stack-e/` skeleton + test surface (`tests/`) at clean `ModuleNotFoundError`; failing-tests evidence + sha256 (commit-first-then-sha256). Build against the § 1.9.1 socket VERBATIM from the start (§ L.5 S1b-3). **Scaffold only — no implementation, no registration, no gate-10** (those are Stage 1b). | yes, single commit |
| **Stage 1b — Implementation commit** | Determinism-strategy docstring first (§ 6); Warp D3Q19 reference (`bgk_step` collision + Guo, `stream` periodic-mod gather, `apply_bounce_back_y_walls` with `OPP` swap + moving-wall injection, `density_field`/`momentum_field`/`feq_field` as `@wp.kernel`s over an own `wp.array(dtype=wp.float64, ndim=4)` distribution) → `sim.py` wrapper (`sim_runner_seeded` + `sim_runner_seeded_couette` + `sim_runner_diagnostic`; common-warp `init`/`set_warp_deterministic`/`write_capture`) → `invariants.py` → spec sheet (`spec-ref-stack-e.md`) → test bodies GREEN (gates 4–13; gate-4 DUAL-ARM — 4a equilibrium golden + 4b NS-2D MMS) → TWO canonical captures (both LFS-committable) → perf-ledger rows (Poiseuille + Couette, warp-cpu) → root `pyproject.toml` workspace registration (22 → 23) → gate-13 replay. O-2 chain checkpoints 2 (gate-10 production reproduction) + 3 (canonical-scale 2-run). | yes, single commit |
| **Stage 1c — Cross-stack equivalence + landing-prep** | gate-14 `compare_captures(lbm-ref, lattice-boltzmann-d3q19-stack-e)` at `relative=1e-5` for BOTH descriptors (full horizon; per-field per-frame witness + bit-exactness analysis) → **predicted `within_tolerance=True` / `max_abs_err=0.0` on both (shape (a) bit-exact)** → `equivalence.md` additive **Stack-E section** (a bit-exactness witness; extends the LBM-Stack-D pair-3 entry) → tolerance-override REUSE **verify-only** (no new row; D6) → schema-corpus representative-subset entry (the Couette 27 MB capture; ≤256 MiB; § 5.4) → un-skip gate-14 test (asserts `within_tolerance=True` AND `max_abs_err==0.0` AND tolerance resolves to `lbm`/`1e-5`). O-2 chain checkpoint 4 (formal gate-14). | yes, single commit |
| **Stage 2 — Landing** | anchor re-check → portfolio regression sweep (23 members; verify `[overrides]` non-interference + per-package pytest-config certification incl. nested `*/tests/`, NOT blanket `-W error`) → integrity sweep (informational; `c19492ad…` baseline) → evidence-path verify (IC-16) → gate-13 replay → append-only check → **IC-15 disposition (D5)** — `SHIFTED` (Stage 2; landed homes): methodology § 6.7 within-sim cross-backend corroboration (LBM-D Taichi shape (b) → LBM-E Warp shape (a)) + the aspect-#4 second-data-point note (landed at methodology § 4.1) + the "Warp CPU f64 is bit-faithful to NumPy" `n=2` observation (landed at **new methodology § 6.8**, NOT folded into § 6.7; D-S2-1) + conventions § L.7 O-1 shape-(a) third-instance / first-laminar note + warp.md § 6 LBM-row dtype f32→f64 (D15) + new § 6.3 [equivalence.md § Stack-E witness already landed Stage 1c] → CHANGELOG → landing audit → SHA back-fill. | yes if Stage 1 clean |

---

## § 3. Acceptance criteria (14 gates per spec § 11.3 + § 3.5 / Appendix D.6)

Canonical Appendix D.6 numbering. Gates 4–13 are stack-agnostic correctness; gate-14
is the Phase-2 cross-stack equivalence gate (a **cross-stack BIT-EXACT witness**;
probe § 6 step-1 seed-difference MEASURED `0.0`).

| Gate | Surface | LBM Stack-E specifics |
|---|---|---|
| **4** Code verification | **DUAL ARM** — 4a: D3Q19 equilibrium golden (`tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`, `abs=1e-15`); 4b: NS-2D MMS convergence study (forced Taylor-Green; observed OOA within ±0.5 of formal `p=2`) | **NEW vs smoke (MMS-only).** 4a reproduces all 19 `f_i^eq` + moments exactly (the feq polynomial is bit-exact per probe § 6); 4b reuses the collision+streaming surface in fully-periodic mode (LBM-Stack-D reproduced OOA `2.39`). |
| **5** Tier-1 diagnostics | `check_health` (NaN/Inf scan) clean across the diagnostic trajectory frames | Laminar regime; `Ma < 0.1` asserted at sim-init (R-LBM-3 inheritance). |
| **6** Tier-2 (IC-6) | `check_circulation` / divergence-free advisory on the macroscopic velocity (IC-6 `vector_field`; weakly-compressible advisory) | lattice Tier-2 = IC-6 `vector_field`. |
| **7** Cat-1 citations | `spec-ref-stack-e.md` cites Qian-d'Humières-Lallemand 1992 (D3Q19 equilibrium) + Guo 2002 (forcing) + Krüger 2017 (bounce-back); `python -m integrity --cat 1` clean | § L.5 S1a-2: name GPU devices in prose form. |
| **8** Cat-2 public API | `lattice_boltzmann_d3q19_stack_e.{reference, sim, invariants}` exports; `--cat 2` clean | — |
| **9** Canonical capture + corpus | `captures/lattice-boltzmann-d3q19-stack-e/{poiseuille-64x32-…, couette-32x16-…}.{h5,json}` via common-warp `write_capture` (f64 payload); schema-corpus representative-subset = the Couette capture (D14/§ 5.4); `read_capture` round-trips; manifest sha256 recorded (commit-first-then-sha256; `.h5` LFS; both committable) | `sim.{name,category}` match the partner. TWO descriptors. |
| **10** Determinism (IC-13/IC-14) | `assert_deterministic_run(sim_fn, runs=2, tolerance=0.0)` (W-2-equivalent, CPU bit-exact; D9) + testkit `run_twice_and_diff(sim_runner_diagnostic, seed=42)`; `content_equivalent == True` | `tolerance=0.0` (no atomic-scatter → run-to-run bit-exact). **Lands at Stage 1b** (O-2 ckpt 2). |
| **11** PBT (≥ 2 invariants) | `equilibrium_density_moment` + `equilibrium_momentum_moment` at `n_examples ≥ 50`; Hypothesis DB committed | (mirrors LBM-Stack-D). |
| **12** Perf-ledger row | `docs/perf-ledger.md` → lattice-boltzmann-d3q19 / **warp-cpu** / BOTH descriptors / wall-clock / hw_id / commit / date / baseline | TWO rows (Poiseuille + Couette). |
| **13** Failing-tests replay | `git worktree add … <stage-1a-sha>`; pytest reproduces `ModuleNotFoundError`; HEAD GREEN (§ E worktree pattern) | — |
| **14** Cross-stack equivalence (Phase-2) | `compare_captures(LEFT=lbm-ref, RIGHT=stack-e)` at `relative=1e-5`, BOTH descriptors; empirical verdict + per-field per-frame witness + bit-exactness analysis in `equivalence.md` | **Planned cross-stack BIT-EXACT witness** (probe § 6). The gate-14 test asserts **`within_tolerance=True` AND `max_abs_err == 0.0`** (bit-exact) AND that the tolerance resolves to `lbm`/`1e-5` (D6). `INFERENCE` consistent with the MEASURED step-1 seed-difference `0.0` + the laminar regime → shape (a). Fallback shape (b) (if the port restructures reductions / triggers FMA divergence) still PASSES at `1e-5`. **STOP-and-surface only if step-1 port faithfulness FAILS** (a step-1 diff ≫ FP-round-off on a laminar trajectory — a real defect; § 5 R-LBME1; structurally inert per the MEASURED `0.0`). NO silent tolerance widening / horizon shortening. |

---

## § 4. Touch set per stage

| Stage | New (Convention A) | Additive edits | NOT touched |
|---|---|---|---|
| Stage 0 | checkpoint audit + SHA back-fill | — | NO source |
| Stage 1a | `packages/lattice-boltzmann-d3q19-stack-e/` (pkg skeleton + `tests/` failing surface + `pyproject.toml`) | — | NO impl / NO registration / NO gate-10 (Stage 1b) |
| Stage 1b | reference modules + `sim.py` + `invariants.py` + `spec-ref-stack-e.md` + TWO canonical captures (`captures/lattice-boltzmann-d3q19-stack-e/`) | root `pyproject.toml` (workspace member 23); `docs/perf-ledger.md` (2 rows) | Phase-1 source; common-warp |
| Stage 1c | schema-corpus subset fixture (Couette) | `docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md` (additive Stack-E section); un-skip gate-14 test | **`tolerance.toml` (NO edit — reuse; D6)**; conventions/methodology |
| Stage 2 | landing audit + SHA back-fill | `SHIFTED` (Stage 2; landed): CHANGELOG entry; methodology § 4.1 (aspect-#4 SECOND-INSTANCE amendment) + § 6.7 (within-sim cross-backend corroboration) + **new § 6.8** (the `n=2` Warp-CPU-f64↔NumPy backend-pair observation; D-S2-1 home = methodology, not conventions § L.7 O-3); conventions § L.7 (O-1 shape-(a) third-instance / first-laminar note — no new § L.x and no O-3); warp.md § 6 (LBM-row dtype f32→f64 + **new § 6.3**; D15); charter §§ 2/4/7 reconcile + D5/D7/D15 substance | `tolerance.toml` (D6 no-op); `equivalence.md` (Stage-1c-locked); Phase-1 source; common-warp |

---

## § 5. Risk surface (R-LBME*; probe § 5)

- **R-LBME1** gate-14 verdict shape — **LOW (NO STOP-surprise risk; the inverse of smoke-Stack-D AND smoke-Stack-E).** Planned **shape (a) cross-stack BIT-EXACT** (`within_tolerance=True`, `max_abs_err=0.0`), EMPIRICALLY grounded (Task 1.6 step-1 `= 0.0`). Fallback **shape (b) FP-round-off within tolerance** IF the Stage-1b port restructures reductions / triggers FMA divergence — still a comfortable gate-14 PASS at `1e-5` (laminar → no amplification). Shape **(c) R-P2 RULED OUT** (laminar → § 6.1 (i) fails; zero achievable seed-difference → (ii) fails). **STOP-discipline:** bit-exact / `within_tolerance=True` is the EXPECTED verdict, NOT a STOP; STOP only on a **step-1 port-faithfulness failure** (a step-1 diff ≫ FP-round-off on a laminar trajectory — a real defect; inert per the MEASURED `0.0`).
- **R-LBME2** f64 precision posture — **MEDIUM (load-bearing for bit-exact)**: own `wp.array(dtype=wp.float64, ndim=4)` for the 19-component distribution; `wp.float64(0.0)` reduction seeds; `wp.float64(1.0)` feq literal; precompute f64 `inv_cs2`/`inv_cs4`/`inv_two_cs2`/`inv_two_cs4`. The `1e-5` tolerance (portfolio-tightest) would be destroyed by an f32 downcast (the line-208 prediction) (D8).
- **R-LBME3** common-warp consumption — **MEDIUM** design surface; socket-only + own f64 `ndim=4` (§ 3 (c)); CONFIRMS warp.md § 6.1/§ 6.2 f64-principle (3rd instance) + REFINES line-208 dtype f32→f64 (D7/D15).
- **R-LBME4** collision-step FP-accumulation (deferred aspect #4) — **LOW (measured bit-exact)**: the 19-term moment reductions + feq polynomial; Warp CPU f64 reproduces NumPy bit-for-bit (NumPy's 19-element `.sum(axis=0)`/`einsum` are lex-sequential; no FMA divergence). Discipline: lex 19-direction order; `wp.float64(0.0)` seeds; preserve the feq expression grouping.
- **R-LBME5** atomic-scatter (deferred aspect #3) — **N/A** (streaming is a gather; `atomic_ops=False`; reductions per-cell LOCAL).
- **R-LBME6** streaming + bounce-back operators — **LOW (measured bit-exact)** (port the periodic-mod streaming gather + the `OPP` swap + moving-wall injection + lex 19-direction order exactly; R-LBM-4 velocity-order inheritance).
- **R-LBME7** `@wp.kernel` quirks (O-W6/O-W7; § L.6 / § L.8) — **LOW** (pure-float arithmetic + pure-int 19-direction loop index + integer-offset gather → no float→int index derivation; the § L.8 S1b-SME1 fresh-var narrowing covers any incidental cast; `int(0)` idiom; explicit `dtype=`).
- **R-LBME8** Warp CPU determinism (O-2 chain) — **LOW** (no atomic-scatter; `wp.float64(0.0)` seeds + serial launch; Hard Rule 2 condition 4 assessed LOW — MPM-E + smoke-E established the chain).
- **R-LBME9** gate-4 DUAL-ARM (golden + MMS) — **LOW–MEDIUM (NEW vs smoke)** (4a equilibrium golden `abs=1e-15` bit-exact-achievable; 4b NS-2D MMS OOA ±0.5 of `p=2`; both reuse the canonical kernels).
- **R-LBME10** two-capture wall-clock + capture routing — **LOW** (Stage-0 Task 0.4 estimate; both ≤256 MiB → both LFS-committable, NO held-local; Couette 27 MB = schema-corpus subset).

R-class STOP-AND-SURFACE (conventions § K) applies to any **step-1 port-faithfulness
failure** at Stage 1 and any Stage-0 finding that Warp CPU determinism cannot be
achieved (Hard Rule 2 condition 4 — assessed LOW). A gate-14 `within_tolerance=True`
(cross-stack BIT-EXACT, the predicted Stack-E verdict) is the EXPECTED verdict, NOT a
STOP. **Unlike BOTH prior smoke ports, LBM-Stack-E has no surprise risk in either
direction** — the step-1 seed-difference is MEASURED `0.0` and the regime is MEASURED
laminar at plan-drafting (§ L.4 + § L.8 disciplines applied).

---

## § 6. Convention discipline reminders specific to this port

- **§ L.4 S6-trajectory-simulation** — APPLIED at plan-drafting (Task 1.6 Part A;
  LAMINAR). Ran at canonical resolution (R-SME9 discipline; 64×32×3 / 32×16×3). gate-14
  is a **bit-exactness witness**, NOT a divergence-rate witness (no chaos to amplify).
- **§ L.8 "measure step-1, don't predict from regime"** — APPLIED at plan-drafting
  (Task 1.6 Part B; step-1 seed-difference MEASURED `0.0` against a faithful Warp f64
  port). The smoke-Stack-E anti-pattern (predict shape from regime) is explicitly
  avoided; the verdict (shape (a)) is empirically grounded.
- **§ L.5 S1a-2 GPU device-string discipline** — name GPU devices in prose form
  ("CUDA device zero"); never a bare `cuda`-digit token in un-backticked prose (parses
  as `path:line`; HARD_FAILs Cat-1 / cat4). Prefer full repo-relative paths +
  function-name references without line numbers.
- **§ L.5 S1b-3 socket-reconciliation (preventive)** — Stage 1a builds against the
  § 1.9.1 socket **verbatim** from the start; no post-hoc refactor.
- **§ L.5 S1c-1 plan-prose-gloss vs spec-verbatim** — dispatches cite § 1.9.1 + spec
  sections by number; Convention C/M is the execution-time backstop.
- **§ L.6 O-W6/O-W7 + § L.8 narrowing (Warp)** — `wp.float64(…)` seeds for f64
  reduction accumulators (`wp.float64(0.0)`) AND pure-literal constants
  (`wp.float64(1.0)` in feq; precomputed f64 `c_s²`-derived constants); `int(0)` idiom
  for kernel-local mutable ints; explicit `dtype=` to `wp.from_numpy` for the
  `(19,Nx,Ny,Nz)` f64 distribution; the O-W7 `wp.float64(v)` taint workaround is LESS
  load-bearing here (pure-int 19-direction indexing; no SL-backtrace float→int) — the
  § L.8 S1b-SME1 fresh-var narrowing covers any incidental cast. O-W6: omit
  `from __future__ import annotations` defensively.
- **§ L.7 O-1 verdict taxonomy (refined D-S2-1)** — predicted shape **(a) bit-exact**
  (`within_tolerance=True`, `max_abs_err=0.0`); `SHIFTED` (Stage 2; **CONFIRMED, not
  overturned** — contrast smoke-E): the formal gate-14 landed shape (a) on both
  canonicals; LBM Stack-E is the THIRD shape-(a) instance and the FIRST on a LAMINAR
  trajectory (the bit-exact condition is a zero cross-stack seed-difference, orthogonal
  to the Lyapunov regime — landed as the Stage-2 § L.7 O-1 third-instance / first-laminar
  note, completing the D-S2-1 decoupling empirically).
- **§ L.7 O-2 four-checkpoint Warp CPU determinism chain** — the stage→checkpoint
  mapping per §§ 2/4 authoritative: Stage-0 R-A1 anchor (ckpt 1) → Stage-**1b** gate-10
  production reproduction (ckpt 2) + canonical-scale 2-run (ckpt 3) → Stage-1c formal
  gate-14 (ckpt 4). (gate-10 + 2-run land at Stage 1b, NOT Stage 1a — the smoke-E
  S1a-SME1 reconcile; this charter gets it right from the start.)
- **Bare-form `filterwarnings` (S0-1)** — the Stack-E `pyproject.toml` mirrors
  common-warp's; nested `*/tests/` packages swept recursively.
- **N1 per-package pytest-config** — Stage-2 portfolio sweep certifies each package
  under ITS OWN pytest config; no blanket `-W error` CLI flag.
- **Convention #12 / commit-first-then-sha256 / N1 enumeration** — every SHA back-fill
  is a separate commit (never `--amend`); enumerate EVERY placeholder-bearing audit.

---

## § 7. Banked methodology-precedents this sub-phase consumes (full enumeration)

1. Commit-first-then-sha256 (#1).
2. Convention #12 N1 enumerate-all-placeholders (#2).
3. Stage 0 R-A1 scope-expansion (#3) — applies to the gate-10 / collision-or-streaming determinism kernel re-verify in Stage 0 (O-2 chain checkpoint 1).
4. **S6-trajectory-simulation discipline (§ L.4)** — APPLIED this dispatch (Task 1.6 Part A; LAMINAR) + the R-SME9 canonical-resolution discipline HONORED.
5. **Step-1 cross-stack seed-difference discipline (§ L.8 / § 6.1 (ii))** — APPLIED this dispatch (Task 1.6 Part B; MEASURED `0.0`). The "measure step-1, don't predict from regime" precedent.
6. Per-sim tolerance.toml override pattern (#6) — here **REUSED** (not added; D6).
7. f64 accumulator-seed pattern (#7) — Warp form `wp.float64(0.0)` reduction seeds + `wp.float64(1.0)` feq literal (the 19-term moment sums; § 4.1 / § 6.6).
8. `cpu_max_num_threads=1` serialisation (#8) — **Warp analog = structural serial launch** (no knob; LBM has no atomic-scatter — #3 N/A).
9. Pre-emptive `ruff check --fix` + `ruff format` (#9) — downstream Stage 1.
10. methodology § 5.2 physics-family → numerical-method taxonomy (`lattice` → `lbm`).
11. methodology § 5.3 S6 two-instance pattern (spec-vs-implementation; re-confirmed for Stack-E — laminar at canonical resolution).
12. methodology § 5.4 legacy-captures schema-corpus ≤ ~256 MiB representative-subset (the Couette 27 MB capture; BOTH LBM captures fit — no held-local).
13. **methodology § 6.1 R-P2 escape-hatch (re-characterized)** — NOT invoked; LBM has neither chaos (i) NOR a non-zero seed-difference (ii). gate-14 is a bit-exactness witness.
14. **methodology § 6.7 R-P2-is-a-backend-pair-property** — corroborated WITHIN a single laminar sim (LBM-D Taichi shape (b) → LBM-E Warp shape (a); Stage-2 additive note; S-LBME6).
15. § L.5 S1a-2 / S1b-3 / S1c-1 (GPU device-string / socket-reconciliation / plan-prose-gloss).
16. § L.6 O-W6 / O-W7 + § L.8 fresh-var narrowing (Warp `@wp.kernel` quirks).
17. § L.7 O-1 verdict taxonomy (shape **(a) bit-exact**, third instance / first on a laminar trajectory) + O-2 four-checkpoint determinism chain.
18. Bare-form `filterwarnings` (S0-1) + nested-`*/tests/` recursive sweep.
19. D4 determinism contract (`tolerance=0.0` CPU bit-exact-same-hw).
20. The LBM-Stack-D dual-arm gate-4 (equilibrium golden + NS-2D MMS) + the two-capture pattern (Poiseuille + Couette) + the IC-6 `vector_field` Tier-2.

(20 precedents.) **Produced (D5) — `SHIFTED` (Stage 2; LANDED scope, all confirmed):**
(1) the methodology § 6.7 within-sim cross-backend corroboration (LBM-D Taichi shape
(b) `~6e-15` → LBM-E Warp shape (a) `0.0`; the seed-difference is a backend-pair
property, confirmed within a single laminar sim); (2) the aspect-#4 second-data-point
note — landed as the methodology **§ 4.1 SECOND-INSTANCE amendment** (collision-step
FP-accumulation is determinism-safe AND bit-faithful on Warp CPU f64; the FIRST Warp
measurement of deferred aspect #4); (3) the candidate "Warp CPU f64 is bit-faithful to
NumPy" portfolio observation (`n=2`, surfaced not asserted) — landed as the **new
methodology § 6.8** (the Warp-CPU-f64 ↔ NumPy zero-seed-difference backend-pair
observation; routed to the methodology doc over a conventions § L.7 "O-3" per **D-S2-1**,
this sub-phase's sole Stage-2 decision — rationale: methodology-substance + § 6.x
per-pair growth + § L.7 is MPM-E's attributed locus); (4) the conventions **§ L.7 O-1
shape-(a) third-instance / first-laminar note** (completes the D-S2-1 decoupling
empirically); (5) the **warp.md § 6 LBM-row dtype f32 → f64 refinement (D15) + new
§ 6.3**. IC-15 stays PARTIAL (neither a deferred-aspect promotion nor a new codified
component). `equivalence.md` § E (the Stack-E bit-exactness witness) landed at Stage 1c.

---

## § 8. Out-of-scope

- **LBM Stack-E GPU mode** (`epsilon-bounded-cross-stack`; spec § 4.4 + § 7.8) — CPU
  `bit-exact-same-hw` only at this sub-phase; GPU certification is deferred per-port scope.
- **The other Stack-E ports** — all spec § 11.3 items 2.3/2.4 landed; LBM-Stack-E is the
  last enumerated Stack-E port of items 2.3–2.5.
- **MRT / multi-relaxation-time collision** — the BGK single-relaxation collision is
  ported; MRT is a Phase-4+ variant (spec-ref § 5).
- **§ 1.9.1 socket amendment** — adding an f64 / 19-component lattice surface is a
  founder-confirmed amendment (Rule W1); NOT in scope (the port uses its own f64
  `wp.array(dtype=wp.float64, ndim=4)`).
- **`docs/common/warp.md` § 6 line-208 doc-correction** (the LBM-consumption dtype
  prediction f32→f64) — operator-routable; this charter documents the refined
  consumption (D15). § 6.1 / § 6.2 already generalized the f64-principle.
- **LFS-architecture banked** (D13) — remote-CI red per LFS-bandwidth; local
  verification unaffected; both LBM captures LFS-committable (no held-local); no action.
- **CI-red state** — recorded known-banked; the sub-phase lands LOCAL-ONLY.
- **D17 (smoke) Phase-1-canonical re-characterization** — a smoke-specific Phase-1
  provenance question; LBM's canonicals are well-behaved laminar (the counter-case);
  not LBM-Stack-E scope.

---

## § 9. Operator decisions surfaced (D1–D17)

(Full leans + rationale in probe § 9. Summary:)

- **D1** name `sub-phase-lattice-boltzmann-d3q19-stack-e` (CONFIRM).
- **D2** stage decomposition 6-stage (§ 2); Stage 1a = scaffold only; impl/gate-10/registration at Stage 1b; Stage 1c override-add → no-op; gate-14 bit-exactness witness from start.
- **D3** S6-simulation verdict **LAMINAR / bounded / dissipative** (Task 1.6 Part A; canonical resolution).
- **D4** gate-14 LEFT-partners (TWO `captures/lbm-ref/…`) PRESENT + LFS (CONFIRM); both ≤256 MiB → both RIGHT captures LFS-committable (no held-local).
- **D5** *(most consequential)* IC-15 disposition: PARTIAL HOLDS + methodology § 6.7 within-sim cross-backend corroboration (LBM-D shape (b) → LBM-E shape (a)) + aspect-#4 second data point + equivalence.md § Stack-E bit-exactness witness + candidate "Warp CPU f64 is bit-faithful to NumPy" portfolio observation (n=2). Routed at Stage 2.
- **D6** **REUSE `[overrides.lattice-boltzmann-d3q19]`; NO new tolerance row** (THIRD port to skip; `compare_captures` keys on LEFT `sim.name`; `[defaults.lbm] relative=1e-5`).
- **D7** common-warp consumption: Runtime + Capture + Determinism; NOT Particles/Grids/HashGrid (socket-only + own f64 `ndim=4`; warp.md § 6.1/§ 6.2 f64-principle confirmed, 3rd instance).
- **D8** f64 storage: **own `wp.array(dtype=wp.float64, ndim=4)`** + `wp.float64(0.0)` reduction seeds + `wp.float64(1.0)` feq literal + precomputed f64 `c_s²`-constants — RECOMMENDED.
- **D9** determinism `tolerance=0.0` (CPU bit-exact); O-2 four-checkpoint chain (ckpt 2/3 at Stage 1b).
- **D10** gate-14 — bit-exactness witness; test asserts `within_tolerance=True` + `max_abs_err==0.0` + `lbm`/`1e-5`. STOP only on step-1 faithfulness failure (inert — step-1 MEASURED `0.0`).
- **D11** IC-15 aspects: #4 (collision-step FP-accumulation) EXERCISED (2nd data point / 1st on Warp; bit-exact); #1 NOT ENGAGED (laminar); #3 N/A (gather); #5 N/A (single-pass explicit).
- **D12** **NO `-phase-N` tag.**
- **D13** CI-red LFS-bandwidth **known-banked; no action.**
- **D14** **Both captures LFS-committable (≤256 MiB); NO held-local**; schema-corpus subset = the Couette 27 MB capture.
- **D15** warp.md § 6 line-208 LBM-row dtype **refined (f32→f64; structural claim correct); note, no edit at plan-drafting.**
- **D16** R-SME9 canonical-resolution discipline — **HONORED; no new finding** (LBM is laminar at canonical resolution).
- **D17** gate-4 DUAL-ARM (golden 4a + MMS 4b) — **inherit both arms** (NEW vs smoke's MMS-only).

---

## § 10. Plan-drafting landing audit checklist

The plan-drafting landing audit (COMMIT 3) verifies:
1. Probe + charter committed; closing-anchor re-check on EVERY `file` / sha256 /
   signature cited (Convention M closing anchor).
2. Verdict on each dispatch ENTERING-STATE + PROBE-MUST-HONOR item (repo anchors;
   (a) S6; (b) step-1 seed-difference + verdict; (c) consumption; (d) tolerance reuse).
3. Task 1.6 result recorded (LOAD-BEARING; Part A LAMINAR; Part B step-1 `0.0`).
4. D1–D17 surfaced for operator routing; none pre-committed.
5. Plan-drafting shifts enumerated (S-LBME*); cumulative `209 → 209 + N`.
6. SHA placeholders for the commit chain (back-filled in COMMIT 4 per Convention #12;
   never `--amend`; N1 enumeration).
7. Hard Rule 2 conditions assessed (HEAD-drift: none; socket drift: none; trajectory:
   LAMINAR; step-1 seed-difference: `0.0`; Warp CPU determinism: achievable per O-2) —
   NOT triggered.
8. Boundary honored: no sim/common-warp/workflow/conventions/methodology/tolerance/
   equivalence/dependencies edits; Task 1.6 read-only (Phase-1 execution + scratch Warp,
   no committed artifact).

---

*End of sub-phase charter. Inherits the MPM/smoke Stack-E structure + the LBM-Stack-D
laminar-regime content, with Warp deltas explicit. The gate-14 verdict (shape (a)
cross-stack BIT-EXACT) is empirically MEASURED at plan-drafting (§ L.8 — not
predicted-from-regime). Operator routes D1–D17, then dispatches Stage 0 separately.*

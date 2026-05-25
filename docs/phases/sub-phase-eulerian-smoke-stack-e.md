# eulerian-smoke → Stack-E Port — Sub-Phase Charter (SEVENTH spec-Phase-2 cross-stack port; SECOND Stack-E port; `SHIFTED` Stage 1c-revisited: cross-stack BIT-EXACT — the predicted "SECOND R-P2 chaotic-regime instance" was empirically falsified; see the AMENDED banner + §§ 1/3/5)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) —
> **SEVENTH per-sim cross-stack port under spec-Phase-2**, the **SECOND Stack-E
> port consuming `common/common-warp`** (after `mpm-multimaterial-stack-e`), and
> the **SECOND `eulerian-smoke` port** (after the Stack-D Taichi port). Ports
> `eulerian-smoke` from its Phase-1 implemented reference (Python NumPy;
> `stack.name="numpy-reference"`, `sim.category="volumetric-grid"`,
> `variant="stam-fedkiw-stable-fluids"`) to **Stack-E (Python / NVIDIA Warp
> 1.13.0 / CPU)**, consuming the common-warp § 1.9.1 socket (Runtime + Capture +
> Determinism) against the MPM-Stack-E structural template + the smoke-Stack-D
> chaotic-regime methodology.
> **Spec mandate:** § 11.3 item 2.4 ("Smoke to Stack D **and Stack E**") — the
> **Stack-E half** of a fully-enumerated mandate (the Stack-D half landed at
> `eulerian-smoke-stack-d`). A clean spec-mandated port.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (sha256 `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` — verified at HEAD per probe § 2) §§ 2.5 (IC-13), 2.6 (cross-stack tolerance — **`smoke` category `relative = 1e-4`**), 2.7 (capture format + canonical descriptor), 3.5 + Appendix **D.6** (14 acceptance gates), D.7 (volumetric-grid Tier-2 = `vector_field` IC-6), 3.6 (Layer-5 per-replication; "the harness is a test, not an aspiration"), 4.4 (CPU `bit-exact-same-hw` / GPU `epsilon-bounded-cross-stack`), 7.5 + Appendix G.7 (IC-16 citations), **11.3 item 2.4** (Smoke → Stack-D+E mandate), Appendix D § D.2.3 (canonical descriptors).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `1937a7cfa53a6daf790def43f5cc13ba932d54d2c185275a506eb9fab269d031` — verified at HEAD). **§ L.4** (chaotic-regime + S6-trajectory-simulation), **§ L.5** (common-warp-bootstrap S1a-2/S1b-3/S1c-1), **§ L.6** (Warp `@wp.kernel` quirks O-W6/O-W7 — names "Smoke Stack-E" explicitly), **§ L.7** (MPM-Stack-E O-1 verdict taxonomy + O-2 four-checkpoint Warp CPU determinism chain) all load-bearing. Inherits role model (§ A.3), three-stage cadence (§ A.2), append-only discipline (§ B), Convention #12 SHA back-fill (§ B.2 + audit-chain-correctness N1 enumerate-all-placeholders), commit-message convention (§ C), replay-chain non-participation (§ D.4), gate-13 worktree pattern (§ E), determinism convention (§ F), Stage-0 scope-analysis (§ N), capture cadence routing (§ P).
> **IC-15 reference document (consumed AS-IS):** `docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `a154d10c48be5ee9b5fda7e4d4e3819eed758e792215f7602f49ebf8b1d76421` — verified at HEAD). 5 codified components + § 4 LBM + § 5 MPM (+ § 5.1 third-instance) + **§ 6 smoke R-P2 escape-hatch FORMALIZED** + 5 deferred aspects. This is the SEVENTH pair; it **re-engages deferred aspect #1 (R-P2 chaotic-regime) substantively** — `SHIFTED` (Stage 1c-revisited): the plan-drafting "SECOND R-P2 instance; R-P2 is stack-portable (Taichi → Warp)" claim was empirically **OVERTURNED** — the verdict is cross-stack BIT-EXACT and R-P2 is NOT stack-portable (S1c-SME2; methodology § 6 re-characterization, Stage 2) — while #3 (atomic-scatter) is N/A and #5 (iterative-solver) is exercised in determinism-safe fixed-cap form (probe § 6).
> **common-warp inheritance contract (§ 1.9.1 socket; verified verbatim at HEAD per probe § 2):** `init(device: str | None = None, deterministic: bool = False) -> str`; no-arg `deterministic_context() -> Iterator[int]`; `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0) -> str`; `set_warp_deterministic(seed, device="cpu") -> int`; `set_seed` / `get_seed`; `write_capture` / `read_capture` / `Capture`. W-2 baseline `24d44c7e…0746f314`. Subsystems consumed: **1 Runtime + 2 Capture + 3 Determinism** (the socket); Subsystems 4 Particles (no particles) / 5 Grids (f32-pinned; smoke is f64) / 6 HashGrid (no neighbor-search) are NOT structurally consumed (probe § 3 (c)).
> **Structural inheritance template:** `docs/phases/sub-phase-mpm-multimaterial-stack-e.md` (the SIXTH per-sim port; FIRST common-warp consumer; closest STRUCTURAL template — socket consumption, f64-own-arrays, four-checkpoint determinism chain, Convention-#12 chain) + `docs/phases/sub-phase-eulerian-smoke-stack-d.md` (the FIFTH; SAME sim source; the chaotic-regime / two-capture / MMS-gate-4 / IC-6 CONTENT template). This charter inherits MPM-Stack-E's structure with the chaotic-regime content explicit (§ 5): common-warp instead of common-py; Warp CPU serial launch instead of Taichi `cpu_max_num_threads=1`; `wp.float64(…)` seeds instead of `ti.f64(…)`; `@wp.kernel` instead of `@ti.kernel`; gate-14 — `SHIFTED` (Stage 1c-revisited): a cross-stack BIT-EXACT witness (`max_abs_err=0.0`), NOT the planned R-P2 divergence-rate witness.
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Phase-1 `eulerian-smoke` reference sealed: `packages/eulerian-smoke/` (Stam-Fedkiw stable-fluids; collocated cell-centered; periodic-BC; plain trilinear SL 3D + MacCormack 2D; 5pt/7pt Laplacian diffuse; Jacobi-20 collocated centered-difference project; vorticity confinement OFF; f64; NO atomic-scatter). TWO canonical captures (LFS): `captures/eulerian-smoke-ref/{taylor-green-128cube-seed42-step500, lid-driven-cavity-128sq-re100-seed42-step1000}.{h5,json}` (gate-14 LEFT-partners).
> - `mpm-multimaterial-stack-e` landed `d4e52f9`; all gates GREEN; § 1.9.1 socket established + bit-exact CPU determinism four-checkpoint chain (O-2); the socket-only-for-f64 consumption pattern data-backed (warp.md § 6.1).
> - `eulerian-smoke-stack-d` landed (gate-14 `within_tolerance=False` on BOTH; R-P2 escape-hatch FORMALIZED in methodology § 6; chaotic-regime `equivalence.md` witness template authored); `[overrides.eulerian-smoke] category="smoke"` established (smoke-Stack-D Stage 1).
> - Conventions `1937a7cf…`; architecture `e82b7b8e…`; methodology `a154d10c…`; all HEAD.
> - `[defaults.smoke]` = `relative = 1e-4, absolute = 0.0`; `[overrides.eulerian-smoke]` **already exists** → no new override for Stack-E (probe § 7 / D6).
> **Inherited shifts:** **193 documented entering** (FACT — `mpm-multimaterial-stack-e` landing § 12 closing total). Carried by reference; not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/plan-drafting-probe-2026-05-25T03-30-00Z.md`. Read FIRST. Authoritative for the Phase-1 baseline + Task 1.6 (§ 6 — CHAOTIC), common-warp consumption (§ 3 (c) — socket-only), tolerance/capture mechanics (§ 7 — reuse), the R-SME* surface (§ 5), and the D1–D17 surface (§ 9).
> **Date drafted:** 2026-05-25.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D17 routing (§ 9).
>
> **AMENDED 2026-05-25 (Stage 1c-revisited; S1c-r-SME1 charter-amendment-landing precedent):**
> Stage 1c formal gate-14 empirically **falsified** the plan-drafting chaotic-regime /
> R-P2 verdict-shape prediction. `FACT` the Warp port is **byte-identical** to the
> sealed NumPy reference across BOTH full horizons (`within_tolerance=True`,
> `max_abs_err=0.0`), INCLUDING through the confirmed 3D Taylor-Green blow-up
> (`max|u| ≈ 5.1e19 @ step 500`). §§ 1, 3, 5 are amended below to the **cross-stack
> BIT-EXACT** verdict shape (`SHIFTED` markers inline). The R-P2 chaotic-regime
> references remaining in §§ 6–7 are SUPERSEDED and reconcile at Stage 2 (methodology
> § 6 R-P2 re-characterization + D5 substance update — out of Stage-1c-revisited
> scope). `FACT` the committed 2D reference is laminar-bounded (NOT the predicted
> Kelvin-Helmholtz blow-up); the Phase-1 provenance investigation is banked as the
> **D17** candidate Phase-1-canonical re-characterization trigger — NOT adjudicated
> here. Empirical record:
> `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-gate-14-evidence-2026-05-25T13-21-16Z.md`
> (S1c-SME1 candidate-verdict-shape; S1c-SME2 R-P2-not-stack-portable).

---

## § 1. Scope

The **SEVENTH per-sim cross-stack port** under spec-Phase-2, the **SECOND Stack-E
port**, and the **SECOND `common/common-warp` consumer**. Takes the Phase-1-frozen
`eulerian-smoke` reference (Python NumPy; `stack.name="numpy-reference"`) and
produces a content-equivalent Stack-E port (Python / NVIDIA Warp 1.13.0 / CPU mode
default) at `packages/eulerian-smoke-stack-e/`, through gates 4–14 of spec § 3.5 /
Appendix D.6 (13 stack-agnostic correctness gates + the Phase-2 14th gate of
cross-stack equivalence against the Phase-1 reference captures at `relative=1e-4`).

This sub-phase validates the Stack-E inheritance contract for a **dense Eulerian
grid f64 sim**: Runtime + Capture + Determinism are consumed substantively; the
f32-pinned `ScalarField3D`/`VectorField3D` (smoke's *natural structural fit*) +
the HashGrid neighbor-search subsystems are NOT structurally consumed by an f64
collocated-grid port (probe § 3 (c); warp.md § 6.1 f64-principle CONFIRMED, second
instance).

**Algorithmic surface (HEAD-verified; probe § 6 / § 10):** Stam-Fedkiw stable-fluids,
collocated cell-centered, periodic-BC: plain trilinear semi-Lagrangian advect (3D)
+ MacCormack predictor-corrector (2D only) + 5pt/7pt Laplacian diffuse + Jacobi-20
collocated centered-difference projection + Fedkiw vorticity confinement
(`vorticity_eps=0`, PRESENT-but-NOT-EXERCISED). The cross-stack-sensitive surface is
the Jacobi-projection FP-accumulation + the MacCormack/centered-difference operators.

**The defining regime — `SHIFTED` (Stage 1c-revisited; empirical gate-14 supersedes
the plan-drafting prediction):** Plan-drafting (Task 1.6; probe § 6) predicted BOTH
canonical trajectories **CHAOTIC (positive-Lyapunov)** with cross-stack
content-equivalence physically impossible, so gate-14 was planned as an R-P2
**divergence-rate witness** (`within_tolerance=False`). Stage 1c gate-14 **falsified
the verdict shape**: `FACT` the Warp port is **byte-identical** to the sealed NumPy
reference across BOTH full horizons (`within_tolerance=True`, `max_abs_err=0.0`),
INCLUDING through the **3D Taylor-Green blow-up** (`max|u| ≈ 5.1e19 @ step 500` —
empirically confirmed; reference AND port reach it bit-for-bit). `INFERENCE` with a
step-1 cross-stack difference of exactly zero (S1b-SME2), a positive-Lyapunov
trajectory has nothing to amplify, so the trajectories stay bit-identical regardless
of Lyapunov regime — gate-14 is a **cross-stack BIT-EXACT witness**, NOT an R-P2
divergence-rate witness. `FACT` Secondary discrepancy: the committed **2D**
lid-driven-cavity reference is **laminar-bounded** (`max|u| ≈ 2.08` across the
0→1000 horizon), NOT the plan-drafting `1.64e3 @ step 5` Kelvin-Helmholtz blow-up;
this sub-phase does **NOT** adjudicate the Phase-1 reference provenance — the full
investigation is banked as the **D17** candidate Phase-1-canonical re-characterization
sub-phase trigger. The **3D** blow-up claim is empirically confirmed and stands.

---

## § 2. Stage decomposition (proposed; D2 for operator routing)

Lean: **same 6-stage shape as MPM Stack-E / smoke Stack-D** — plan-drafting +
Stage 0 + Stage 1a + Stage 1b + Stage 1c + Stage 2. Task 1.6 surfaced NO reason to
compress. Two structural points: **Stage 1c's tolerance-override-add step collapses
to a verify-only no-op** (D6 — the override already exists); and **gate-14 is
planned as a chaotic-regime divergence-rate witness from the start** (no surprise
Stage-1 STOP — unlike smoke-Stack-D).

| Stage | Purpose | Single-session? |
|---|---|---|
| **plan-drafting** (this) | probe + charter + plan-drafting landing + SHA back-fill (4 commits) | yes |
| **Stage 0 — Pre-flight** | Tasks 0.0–0.6 + checkpoint + SHA back-fill. **0.0** Convention-M anchor re-check at then-HEAD (conventions/methodology/architecture sha256; replay `9399fc33…`; integrity `c19492ad…`); **0.1** common-warp § 1.9.1 socket consumption probe (Runtime/Capture/Determinism call sites; the `examples/hello/` dense-grid Warp sim as reference consumer); **0.2** Warp CPU determinism R-A1 anchor (O-2 chain checkpoint 1 — a Jacobi-projection or SL-backtrace `@wp.kernel` determinism kernel; sha256 anchor); **0.3** f64-storage + `wp.float64()` seed + pure-literal-constant audit (R-SME2; the 3D Jacobi `1.0/6.0` normaliser → `wp.float64(1.0)/wp.float64(6.0)`; confirm `write_capture` preserves f64 — verified at probe HEAD: `np.asarray`, no downcast); **0.4** canonical-descriptor scope-analysis (§ N — re-estimate Warp-CPU wall-clock vs smoke-Stack-D Taichi 2D 8.470 s / 3D 698.986 s; cadence-50 3D / cadence-100 2D; the 738 MB 3D capture held local D14; ≤256 MiB schema-corpus subset = the 2D 4.4 MB capture per § 5.4); **0.5** tolerance-override REUSE verification (no new row; `compare_captures` keys on LEFT `sim.name`); **0.6** gate-4 MMS-runner consumability (the shared `incompressible_ns_2d` manufactured source). | yes |
| **Stage 1a — Failing-tests commit** | `packages/eulerian-smoke-stack-e/` skeleton + test surface (`tests/`) at clean `ModuleNotFoundError`; failing-tests evidence + sha256 (commit-first-then-sha256). Build against the § 1.9.1 socket VERBATIM from the start (§ L.5 S1b-3). | yes, single commit |
| **Stage 1b — Implementation commit** | Determinism-strategy docstring first (§ 6); Warp Stam-Fedkiw reference (`semi_lagrangian_advect` 2D/3D, `maccormack_advect_2d`, `diffuse`, `project_pressure`/`project_pressure_3d` Jacobi-20, `vorticity_confinement` OFF, `curl`/`divergence` as `@wp.kernel`s over own f64 `wp.array`s) → `sim.py` wrapper (`sim_runner_seeded` + `sim_runner_seeded_2d` + `sim_runner_diagnostic`; common-warp `init`/`set_warp_deterministic`/`write_capture`) → `invariants.py` → spec sheet (`spec-ref-stack-e.md`) → test bodies GREEN (gates 4–13; gate-4 MMS-only) → TWO canonical captures (3D held local) → perf-ledger rows (2D + 3D, warp-cpu) → root `pyproject.toml` workspace registration (21 → 22) → gate-13 replay. O-2 chain checkpoints 2 (gate-10 production reproduction) + 3 (canonical-scale 2-run). | yes, single commit |
| **Stage 1c — Cross-stack equivalence + landing-prep** | gate-14 `compare_captures(eulerian-smoke-ref, eulerian-smoke-stack-e)` at `relative=1e-4` for BOTH descriptors (full horizon; per-field per-frame witness + step-horizon divergence-rate analysis REGARDLESS of pass/fail) → **predicted `within_tolerance=False` on both (R-P2 escape-hatch)** → `equivalence.md` additive **Stack-E section** (extends the chaotic-regime witness template) → tolerance-override REUSE **verify-only** (no new row; D6) → schema-corpus representative-subset entry (the 2D 4.4 MB capture; ≤256 MiB; § 5.4) → un-skip gate-14 test (asserts `within_tolerance=False` AND the § 6.2 escape-hatch criteria hold). O-2 chain checkpoint 4 (formal gate-14). | yes, single commit |
| **Stage 2 — Landing** | anchor re-check → portfolio regression sweep (22 members; verify `[overrides]` non-interference + per-package pytest-config certification incl. nested `*/tests/`, NOT blanket `-W error`) → integrity sweep (informational; `c19492ad…` baseline) → evidence-path verify (IC-16) → gate-13 replay → append-only check → **IC-15 disposition (D5)**: `SHIFTED` (Stage 2) — methodology § 6 R-P2 **re-characterization** (R-P2 NOT stack-portable; cross-stack BIT-EXACT counter-instance; S1c-SME2) + conventions § L.7 O-1 refinement (shape (a), D-S2-1; S1c-SME1) + § L.6 O-W7 narrowing (S1b-SME1) + § L.4 R-SME9 (D16) + § L.5 uv-sync hazard (S1b-SME3) + warp.md § 6 (D15) + charter §§ 6-7 reconcile + CHANGELOG → landing audit → SHA back-fill. | yes if Stage 1 clean |

---

## § 3. Acceptance criteria (14 gates per spec § 11.3 + § 3.5 / Appendix D.6)

Canonical Appendix D.6 numbering. Gates 4–13 are stack-agnostic correctness;
gate-14 is the Phase-2 cross-stack equivalence gate (`SHIFTED` Stage 1c-revisited:
here a **cross-stack BIT-EXACT witness** — the plan-drafting chaotic-regime / R-P2
divergence-rate framing was empirically falsified; see § 1 + the gate-14 row).

| Gate | Surface | Smoke Stack-E specifics |
|---|---|---|
| **4** Code verification | NS-2D MMS convergence study (advection + projection arms) vs the shared `incompressible_ns_2d` manufactured source; observed OOA within ±0.5 of formal p=2 | **MMS-ONLY — NO golden table** (mirrors smoke-Stack-D; cf. smoke-Stack-D advection 1.9892 / projection 1.9976). Inline the convergence study (`test_mms_convergence.py`). |
| **5** Tier-1 diagnostics | `check_health` (NaN/Inf scan) clean across the **diagnostic** trajectory frames | Diagnostic tier (small N, short window) is tame; NaN/Inf passes even at `5e19` on the canonical (the instability does not surface here — § 6.4). |
| **6** Tier-2 (IC-6) | `check_circulation` / divergence-free advisory + circulation / helicity / spectrum finite (IC-6 `vector_field` on the velocity field) | volumetric-grid Tier-2 = IC-6 `vector_field` (NOT IC-5 particle). |
| **7** Cat-1 citations | `spec-ref-stack-e.md` cites Stam 1999 (stable fluids) + Fedkiw 2001 (vorticity confinement) + Taylor 1937 (Taylor-Green vortex; DOI 10.1098/rspa.1937.0036); `python -m integrity --cat 1` clean | — |
| **8** Cat-2 public API | `eulerian_smoke_stack_e.{reference, sim, invariants}` exports; `--cat 2` clean | — |
| **9** Canonical capture + corpus | `captures/eulerian-smoke-stack-e/{taylor-green-128cube-…, lid-driven-cavity-128sq-…}.{h5,json}` via common-warp `write_capture` (f64 payload); schema-corpus representative-subset = the 2D capture (D14/§ 5.4); `read_capture` round-trips; manifest sha256 recorded (commit-first-then-sha256; `.h5` LFS; 3D held local) | `sim.{name,category}` match the partner. TWO descriptors. |
| **10** Determinism (IC-13/IC-14) | `assert_deterministic_run(sim_fn, runs=2, tolerance=0.0)` (W-2-equivalent, CPU bit-exact; D9) + testkit `run_twice_and_diff(sim_runner_diagnostic, seed=42)`; `content_equivalent == True` | `tolerance=0.0` — **bit-exact even though the trajectory is chaotic** (within-stack determinism is order-deterministic). |
| **11** PBT (≥ 2 invariants) | `divergence_free_post_projection` + `smoke_density_nonneg` at `n_examples ≥ 50`; Hypothesis DB committed | — |
| **12** Perf-ledger row | `docs/perf-ledger.md` → eulerian-smoke / **warp-cpu** / BOTH descriptors / wall-clock / hw_id / commit / date / baseline | TWO rows (2D + 3D). |
| **13** Failing-tests replay | `git worktree add … <stage-1a-sha>`; pytest reproduces `ModuleNotFoundError`; HEAD GREEN (§ E worktree pattern) | — |
| **14** Cross-stack equivalence (Phase-2) | `compare_captures(LEFT=eulerian-smoke-ref, RIGHT=stack-e)` at `relative=1e-4`, BOTH descriptors; empirical verdict + per-field per-frame witness + **bit-exactness analysis** in `equivalence.md` | `SHIFTED` (Stage 1c-revisited): plan-drafting predicted `within_tolerance=False` (R-P2 chaotic-regime escape-hatch); **empirically FALSIFIED**. `FACT` gate-14 returned **`within_tolerance=True`, `max_abs_err=0.0`** on BOTH descriptors (Warp byte-identical to the NumPy reference through the full horizon, incl. the 3D ~5e19 blow-up; distinct-provenance ruled out a copy/wiring defect). The gate-14 test asserts **`within_tolerance=True` AND bit-exactness** (`max_abs_err == 0.0`) AND that the tolerance resolves to `smoke`/`1e-4` (D6). `INFERENCE` consistent with S1b-SME2 (step-1 BIT-EXACT 0.0 → no seed-difference → bit-exact regardless of Lyapunov regime). **STOP-and-surface only if step-1 port faithfulness FAILS** (a real defect — § 5 R-SME1). NO silent tolerance widening / horizon shortening. Empirical record: the Stage-1c STOP-evidence audit. |

---

## § 4. Touch set per stage

| Stage | New (Convention A) | Additive edits | NOT touched |
|---|---|---|---|
| Stage 0 | checkpoint audit + SHA back-fill | — | NO source |
| Stage 1a | `packages/eulerian-smoke-stack-e/` (pkg skeleton + `tests/` failing surface + `pyproject.toml`) | — | — |
| Stage 1b | reference modules + `sim.py` + `invariants.py` + `spec-ref-stack-e.md` + TWO canonical captures (`captures/eulerian-smoke-stack-e/`) | root `pyproject.toml` (workspace member 22); `docs/perf-ledger.md` (2 rows) | Phase-1 source; common-warp |
| Stage 1c | schema-corpus subset fixture (2D) | `docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` (additive Stack-E section); un-skip gate-14 test | **`tolerance.toml` (NO edit — reuse; D6)**; conventions/methodology |
| Stage 2 | landing audit + SHA back-fill | `SHIFTED` (landed scope): CHANGELOG entry; methodology § 6 (R-P2 **re-characterization** — NOT stack-portable; S1c-SME2); conventions § L.7 (O-1 shape-(a) refinement, D-S2-1) + § L.6 (O-W7 narrowing) + § L.4 (R-SME9, D16) + § L.5 (uv-sync hazard); warp.md § 6 (D15); charter §§ 1(title)/2/4/6/7 + D5/D10/D11 reconcile | `tolerance.toml` (D6 no-op) |

---

## § 5. Risk surface (R-SME*; probe § 5)

- **R-SME1** S6 canonical-trajectory verdict — `SHIFTED` (Stage 1c-revisited): plan-drafting predicted **CHAOTIC / positive-Lyapunov** (Task 1.6) with gate-14 `within_tolerance=False` (R-P2). **Empirically FALSIFIED** — `FACT` gate-14 is **cross-stack BIT-EXACT** (`within_tolerance=True`, `max_abs_err=0.0` on BOTH descriptors, through the confirmed 3D ~5e19 blow-up). The 3D reference DOES blow up (confirmed); the committed 2D reference is laminar-bounded (`max|u| ≈ 2.08`; D17 banked). **STOP-discipline:** `within_tolerance=True` / bit-exact is the EXPECTED verdict, NOT a STOP; STOP only on a **step-1 port-faithfulness failure** (a real defect — but step-1 is bit-exact per S1b-SME2, so this STOP is structurally inert). Empirical record: the Stage-1c STOP-evidence audit (S1c-SME1, S1c-SME2).
- **R-SME2** f64 precision posture — **MEDIUM**: own `wp.array(dtype=wp.float64)` dense fields; pure-literal `wp.float64(1.0)/wp.float64(6.0)` 3D Jacobi normaliser (§ 6.6; the constant that leaked `~1e-9` in Taichi; Warp also infers f32 — O-W7). f32 would change the chaotic trajectory itself (D8).
- **R-SME3** common-warp consumption — **MEDIUM** design surface; socket-only (§ 3 (c)); CONFIRMS warp.md § 6.1 f64-principle (2nd instance; D7/D15).
- **R-SME4** iterative-solver Jacobi-20 determinism (deferred aspect #5) — **LOW** (fixed cap; identical sweep count; `wp.float64(0.0)` seeds; Warp CPU serial launch).
- **R-SME5** atomic-scatter (deferred aspect #3) — **N/A** (no scatter; `atomic_ops=False`).
- **R-SME6** advection/projection cross-stack operators — **LOW–MEDIUM** (port the predictor-corrector + lex vertex ordering + integer-mod periodic wrap exactly; collocated grid, no MAC; vorticity OFF).
- **R-SME7** `@wp.kernel` quirks (O-W6/O-W7; § L.6, names Smoke Stack-E) — **LOW–MEDIUM** (`wp.float64(v)` taint workaround for SL-backtrace index derivation; `int(0)` idiom; explicit `dtype=`).
- **R-SME8** two-capture wall-clock + the 738 MB held-local 3D artifact — **LOW–MEDIUM** (Stage-0 Task 0.4 estimate; 3D held local; 2D = schema-corpus subset).
- **R-SME9** S6 resolution-dependence (NEW) — **MEDIUM** (methodology refinement candidate): 64³ derisk DECAYS, 128³ canonical BLOWS UP → § L.4 probe must run at canonical resolution (a second false-laminar trap; D16).

R-class STOP-AND-SURFACE (conventions § K) applies to any **step-1 port-faithfulness
failure** at Stage 1 and any Stage-0 finding that Warp CPU determinism cannot be
achieved (Hard Rule 2 condition 4 — assessed LOW; MPM-Stack-E established the O-2
chain). `SHIFTED` (Stage 1c-revisited): a gate-14 `within_tolerance=True` (cross-stack
BIT-EXACT) is the EXPECTED Stack-E verdict, NOT a STOP; STOP only on a step-1
port-faithfulness failure (the plan-drafting `within_tolerance=False` R-P2 expectation
was empirically falsified — § 1, § 3 gate-14, R-SME1).

---

## § 6. Convention discipline reminders specific to this port

- **§ L.4 S6-trajectory-simulation** — APPLIED at plan-drafting (Task 1.6; CHAOTIC).
  The chaotic-regime escape-hatch (methodology § 6) is INVOKED; gate-14 is a
  **divergence-rate witness** (NOT an FP-round-off margin). R-SME9: simulate at
  canonical resolution (coarse-grid is a second false-laminar trap).
- **§ L.5 S1a-2 GPU device-string discipline** — name GPU devices in prose form
  ("CUDA device zero", "the zero-indexed CUDA device"); never a bare `cuda`-digit
  token in un-backticked prose (parses as `path:line`; HARD_FAILs Cat-1 / cat4
  draft-time). Applies to all Stack-E source/docstrings/audits. (The cat4 hook ALSO
  validates backticked `file:line` citations — prefer full repo-relative paths +
  function-name references without line numbers.)
- **§ L.5 S1b-3 socket-reconciliation (preventive)** — Stage 1a builds against the
  § 1.9.1 socket **verbatim** from the start; no post-hoc refactor.
- **§ L.5 S1c-1 plan-prose-gloss vs spec-verbatim** — dispatches cite § 1.9.1 + spec
  sections by number; Convention C/M is the execution-time backstop.
- **§ L.6 O-W6/O-W7 (Warp; names Smoke Stack-E)** — `wp.float64(…)` seeds for f64
  accumulators AND pure-literal non-power-of-2 constants (the 3D Jacobi `1.0/6.0`);
  `int(0)` idiom for kernel-local mutable ints (suppress ruff UP018/RUF046); explicit
  `dtype=` to `wp.from_numpy` for the multi-dim f64 fields; the `wp.float64(v)` taint
  workaround (derive int index via `wp.int32(…)`; never `wp.float64(loop_var)` on an
  int-indexing loop variable). O-W6: omit `from __future__ import annotations`
  defensively.
- **§ L.7 O-1 verdict taxonomy** — `SHIFTED` (Stage 1c-revisited): plan-drafting
  predicted shape **(c) chaotic-regime escape-hatch** (`within_tolerance=False`);
  empirically the verdict is shape **(a) bit-exact** (`within_tolerance=True`,
  `max_abs_err=0.0`) — smoke Stack-E is the SECOND instance of shape (a) and the one
  that decouples bit-exactness from trajectory-tameness (Stage-2 § L.7 O-1
  refinement, D-S2-1: the "algebraically-tame trajectory" qualifier is
  sufficient-but-not-necessary; the actual condition is a zero cross-stack
  seed-difference).
- **§ L.7 O-2 four-checkpoint Warp CPU determinism chain** — `SHIFTED` (S1a-SME1
  reconcile): the stage→checkpoint mapping per §§ 2/4 authoritative is Stage-0 R-A1
  anchor (ckpt 1) → Stage-**1b** gate-10 production reproduction (ckpt 2) +
  canonical-scale 2-run (ckpt 3) → Stage-1c formal gate-14 (ckpt 4; landed under the
  BIT-EXACT shape at Stage 1c-revisited). (gate-10 + 2-run both landed at Stage 1b,
  NOT Stage 1a — the earlier "Stage-1a gate-10" mapping was MPM-inherited drift.)
- **Bare-form `filterwarnings` (S0-1)** — the Stack-E `pyproject.toml` mirrors
  common-warp's; nested `*/tests/` packages swept recursively (smoke-Stack-D S2-2).
- **N1 per-package pytest-config** — Stage-2 portfolio sweep certifies each package
  under ITS OWN pytest config; no blanket `-W error` CLI flag.
- **Convention #12 / commit-first-then-sha256 / N1 enumeration** — every SHA back-fill
  is a separate commit (never `--amend`); enumerate EVERY placeholder-bearing audit.

---

## § 7. Banked methodology-precedents this sub-phase consumes (full enumeration)

1. Commit-first-then-sha256 (#1).
2. Convention #12 N1 enumerate-all-placeholders (#2).
3. Stage 0 R-A1 scope-expansion (#3) — applies to the gate-10 / Jacobi-or-SL-kernel re-verify in Stage 0 (O-2 chain checkpoint 1).
4. **S6-trajectory-simulation discipline (§ L.4)** — APPLIED this dispatch (Task 1.6; CHAOTIC) + the R-SME9 resolution-dependence refinement candidate.
5. **Cross-stack-as-defect-amplifier (§ L.4)** — re-confirmed on Warp (the chaos surfaces only across two backends).
6. Per-sim tolerance.toml override pattern (#6) — here **REUSED** (not added; D6).
7. f64 accumulator-seed pattern (#7) **extended to pure-literal kernel constants** (§ L.4 / § 6.6) — Warp form `wp.float64(…)` (the 3D Jacobi `1.0/6.0`).
8. `cpu_max_num_threads=1` serialisation (#8) — **Warp analog = structural serial launch** (no knob; though smoke has no atomic-scatter — #3 N/A).
9. Pre-emptive `ruff check --fix` + `ruff format` (#9) — downstream Stage 1.
10. methodology § 5.1 PRESENT-but-NOT-EXERCISED — applies to vorticity confinement (`vorticity_eps=0`).
11. methodology § 5.2 physics-family → numerical-method taxonomy (`volumetric-grid` → `smoke`).
12. methodology § 5.3 S6 two-instance pattern (spec-vs-implementation; re-confirmed for Stack-E).
13. methodology § 5.4 legacy-captures schema-corpus ≤ ~256 MiB representative-subset (the 2D 4.4 MB capture).
14. **methodology § 6 R-P2 chaotic-regime escape-hatch** — `SHIFTED` (Stage 1c-revisited): NOT invoked; the cross-stack diff is `0.0` (bit-exact), so R-P2 (which witnesses divergence) does not apply. Smoke Stack-E is the COUNTER-instance: R-P2 is NOT stack-portable Taichi → Warp (Stage-2 methodology § 6 re-characterization; S1c-SME2).
15. § L.5 S1a-2 / S1b-3 / S1c-1 (GPU device-string / socket-reconciliation / plan-prose-gloss).
16. § L.6 O-W6 / O-W7 (Warp `@wp.kernel` quirks; names Smoke Stack-E).
17. § L.7 O-1 verdict taxonomy (`SHIFTED`: shape **(a) bit-exact**, NOT (c) — Stage-2 D-S2-1 refinement) + O-2 four-checkpoint determinism chain (complete; ckpt 4 under the BIT-EXACT shape).
18. Bare-form `filterwarnings` (S0-1) + nested-`*/tests/` recursive sweep (smoke-Stack-D S2-2).
19. D4 determinism contract (`tolerance=0.0` CPU bit-exact-same-hw — bit-exact even for chaos).
20. The chaotic-regime `equivalence.md` **witness template** (smoke-Stack-D) — `SHIFTED` (Stage 1c-revisited): the additive Stack-E section (§ E) is a **bit-exactness** witness, NOT a divergence-rate witness (the divergence is `0.0`); the Stack-D chaotic-regime template is referenced for layout only.

(20 precedents.) **Produced (D5, LANDED at Stage 2 — `SHIFTED`/OVERTURNED):** the
plan-drafting candidate was a methodology § 6 note that R-P2 is **stack-portable**
(Taichi → Warp). Empirically **OVERTURNED**: R-P2 is NOT stack-portable — the
Stack-D Taichi divergence was Taichi-FP-specific (~1e-16 step-1 round-off); the Warp
port, same algorithm + same operation order, yields a `0.0` cross-stack
step-1 difference, so nothing amplifies and the verdict is cross-stack BIT-EXACT
(within-stack determinism bit-exact on both; cross-stack divergence positive-Lyapunov
on Taichi only). IC-15 stays PARTIAL. The methodology § 6 re-characterization
(Stage 2) records this counter-instance; plus a
candidate § L.4 R-SME9 resolution-dependence refinement.

---

## § 8. Out-of-scope

- **Smoke Stack-E GPU mode** (`epsilon-bounded-cross-stack`; spec § 4.4 + § 7.8) —
  CPU `bit-exact-same-hw` only at this sub-phase; GPU certification is deferred
  per-port scope.
- **The other Stack-E port** — LBM (spec § 11.3 item 2.5).
- **MAC-staggered / face-centered velocities** — the collocated cell-centered grid
  is ported; the MAC-staggered variant is the Phase-2+ Stack-C scope (spec-ref § 5).
- **Flow-map family variants** (Clebsch-PFM etc.) — Phase 4+.
- **§ 1.9.1 socket amendment** — adding f64 `ScalarField3D`/`VectorField3D` variants
  is a founder-confirmed amendment (Rule W1); NOT in scope (the port uses its own f64
  `wp.array`s).
- **`docs/common/warp.md` § 6 line-207 doc-correction** (the smoke-consumption
  prediction) — operator-routable; this charter documents the refined consumption
  (D15). § 6.1 already generalized the f64-principle.
- **Phase-1-canonical re-characterization question** (D17) — whether future Phase-1
  canonicals should "exhibit stable physics"; a Phase-1 design point; separate-sub-phase
  candidate; banked.
- **LFS-architecture banked** (D13) — remote-CI red per LFS-bandwidth; local
  verification unaffected; the 738 MB 3D capture held local (D14); no action.
- **CI-red state** — recorded known-banked; the sub-phase lands LOCAL-ONLY (per the
  prior sub-phases' posture).

---

## § 9. Operator decisions surfaced (D1–D17)

(Full leans + rationale in probe § 9. Summary:)

- **D1** name `sub-phase-eulerian-smoke-stack-e` (CONFIRM).
- **D2** stage decomposition 6-stage (§ 2); Stage 1c override-add → no-op; gate-14 divergence-rate witness from start.
- **D3** S6-simulation verdict **CHAOTIC / positive-Lyapunov** (Task 1.6).
- **D4** gate-14 LEFT-partners (TWO `captures/eulerian-smoke-ref/…`) PRESENT + LFS (CONFIRM); 3D 738 MB RIGHT held local.
- **D5** *(most consequential)* IC-15 disposition: `SHIFTED`/LANDED (Stage 2) — IC-15 stays PARTIAL; the methodology § 6 candidate was R-P2 SECOND-INSTANCE "stack-portable Taichi → Warp" but is **OVERTURNED** — R-P2 is NOT stack-portable (cross-stack BIT-EXACT counter-instance; S1c-SME2). LANDED: methodology § 6 re-characterization + equivalence.md § E bit-exactness witness + R-SME9 § L.4 (D16).
- **D6** **REUSE `[overrides.eulerian-smoke]`; NO new tolerance row** (SECOND port to skip).
- **D7** common-warp consumption: Runtime + Capture + Determinism; NOT Particles/Grids/HashGrid (socket-only; warp.md § 6.1 f64-principle confirmed).
- **D8** f64 storage: **own `wp.array(dtype=wp.float64)`** + `wp.float64(1.0)/wp.float64(6.0)` 3D Jacobi normaliser — RECOMMENDED.
- **D9** determinism `tolerance=0.0` (CPU bit-exact, even for chaos); O-2 four-checkpoint chain.
- **D10** gate-14 — `SHIFTED` (Stage 1c-revisited): planned as a divergence-rate witness (test asserts `within_tolerance=False`); empirically a **bit-exactness witness** (test asserts `within_tolerance=True` + `max_abs_err==0.0` + smoke/1e-4). STOP only on step-1 faithfulness failure (inert — step-1 bit-exact).
- **D11** IC-15 aspects: `SHIFTED` (Stage 1c-revisited) — #1 (R-P2) was ENGAGED but the chaotic-regime escape-hatch did NOT apply (cross-stack BIT-EXACT; R-P2 NOT stack-portable; S1c-SME2); #5 fixed-cap determinism-safe (confirmed); #3 N/A.
- **D12** **NO `-phase-N` tag.**
- **D13** CI-red LFS-bandwidth **known-banked; no action.**
- **D14** 3D 738 MB capture **held LOCAL**; schema-corpus subset = the 2D 4.4 MB capture.
- **D15** warp.md § 6 line-207 smoke-prediction **refined (socket-only); note, no edit at plan-drafting.**
- **D16** R-SME9 resolution-dependence § L.4 refinement — surface; defer to Stage 2.
- **D17** Phase-1-canonical re-characterization question — **STAY-BANKED; no action.**

---

## § 10. Plan-drafting landing audit checklist

The plan-drafting landing audit (COMMIT 3) verifies:
1. Probe + charter committed; closing-anchor re-check on EVERY `file` / sha256 /
   signature cited (Convention M closing anchor).
2. Verdict on each dispatch ENTERING-STATE + PROBE-MUST-HONOR item (repo anchors;
   (a) S6; (b) verdict; (c) consumption; (d) tolerance reuse).
3. Task 1.6 S6-simulation result recorded (LOAD-BEARING; CHAOTIC).
4. D1–D17 surfaced for operator routing; none pre-committed.
5. Plan-drafting shifts enumerated (S-SME*); cumulative `193 → 193 + N`.
6. SHA placeholders for the commit chain (back-filled in COMMIT 4 per Convention #12;
   never `--amend`; N1 enumeration).
7. Hard Rule 2 conditions assessed (HEAD-drift: none; socket drift: none; trajectory:
   CHAOTIC but EXPECTED — not a blocker; Warp CPU determinism: achievable per O-2) —
   NOT triggered.
8. Boundary honored: no sim/common-warp/workflow/conventions/methodology/tolerance/
   equivalence/dependencies edits; Task 1.6 read-only.

---

*End of sub-phase charter. Inherits the MPM Stack-E structure + the smoke Stack-D
chaotic-regime content, with Warp deltas explicit. Operator routes D1–D17, then
dispatches Stage 0 separately.*

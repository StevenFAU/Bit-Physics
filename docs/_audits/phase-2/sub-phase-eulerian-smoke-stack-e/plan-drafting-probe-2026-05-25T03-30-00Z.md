---
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-plan-drafting
stage: plan-drafting-probe
phase: phase-2
head_sha: <COMMIT_1_SHA_PENDING>
head_sha_at_checkpoint: d4e52f9fd477ece66170905e605930b011708f4f
date: 2026-05-25T03-30-00Z
verdict: probe-complete
---

# Plan-drafting probe — sub-phase-eulerian-smoke-stack-e

> **SEVENTH** per-sim cross-stack port under spec-Phase-2; the **SECOND Stack-E
> port consuming `common/common-warp`** (after `mpm-multimaterial-stack-e`); the
> **SECOND `eulerian-smoke` port** (after the Stack-D Taichi port). Spec § 11.3
> item 2.4 ("Smoke to Stack D **and Stack E**") — this is the **Stack-E half** of
> a clean, fully-enumerated spec mandate (the Stack-D half landed at
> `eulerian-smoke-stack-d`). Ports `eulerian-smoke` from its Phase-1 implemented
> reference (Python NumPy; `stack.name="numpy-reference"`,
> `sim.category="volumetric-grid"`, `variant="stam-fedkiw-stable-fluids"`) to
> **Stack-E (Python / NVIDIA Warp 1.13.0 / CPU)**, producing
> `packages/eulerian-smoke-stack-e/`. gate-14 LEFT-partners are the Phase-1
> reference captures at `captures/eulerian-smoke-ref/` (TWO descriptors);
> RIGHT-partners are the new Stack-E captures.
>
> Probe authored per the **S6-trajectory-simulation discipline** (conventions
> `§ L.4`; methodology `§ 6.5`) — **Task 1.6 EXECUTES the Phase-1 canonical
> trajectory at HEAD** (not just reads `sim.py`). Every path / SHA / sha256 /
> signature / classification below is HEAD-verified at `d4e52f9`. **The defining
> finding:** Task 1.6 **empirically CONFIRMS BOTH canonical trajectories are
> chaotic (positive-Lyapunov)** on the Stack-E premise — 3D Taylor-Green
> `max|u| 0.999 → 1.34e8 @ step 50`; 2D lid-driven-cavity Kelvin-Helmholtz
> `0.99 → 1.64e3 @ step 5` — reproducing the `eulerian-smoke-stack-d` landing's
> regime. Predicted gate-14: **IC-15 R-P2 chaotic-regime escape-hatch invoked;
> `within_tolerance=False` on BOTH descriptors** (O-1 verdict shape **(c)**) — the
> **FIRST portfolio instance of R-P2 on Stack-E** and the **SECOND R-P2 instance
> overall** (the data point that R-P2 is **stack-portable Taichi → Warp**). **Two
> dispatch/doc premises are refined at HEAD** (see § 3 / § 7 / § 10): (1)
> `docs/common/warp.md` § 6 line-207 predicts Smoke Stack-E consumes the f32
> `ScalarField3D`/`VectorField3D` dense-field surface — refined to **socket-only**
> per the § 6.1 f64-principle (smoke is f64; smoke is the SECOND f64 socket-only
> consumer); (2) the per-sim `[overrides.eulerian-smoke]` row **already exists**
> (smoke-Stack-D Stage 1) — Stack-E needs **no new override**.

---

## § 1. Scope

This sub-phase ports `eulerian-smoke` (Phase-1 NumPy reference at
`packages/eulerian-smoke/`) to Stack-E (Python / NVIDIA Warp 1.13.0 / CPU mode
default), producing `packages/eulerian-smoke-stack-e/` through gates 4–14 of
spec § 3.5 / Appendix D.6 (13 stack-agnostic correctness gates + the Phase-2 14th
gate of cross-stack equivalence). It is the SEVENTH per-sim cross-stack port, the
SECOND Stack-E port, and the SECOND substantive consumer of `common/common-warp`'s
§ 1.9.1 socket (after `mpm-multimaterial-stack-e`).

Three existing packages at HEAD bracket this port:
- `packages/eulerian-smoke/` — Phase-1 NumPy reference (gate-14 LEFT-partner
  *source*; the gate-14 capture artifacts are at `captures/eulerian-smoke-ref/`;
  sealed).
- `packages/eulerian-smoke-stack-d/` — Phase-2 Stack-D Taichi-DSL port (FIFTH
  per-sim port; SAME sim source; the chaotic-regime / two-capture / MMS-gate-4
  content template; NOT the gate-14 partner).
- `packages/mpm-multimaterial-stack-e/` — Phase-2 Stack-E Warp port (SIXTH; FIRST
  common-warp consumer; the closest *structural* template — socket consumption,
  f64-own-arrays, Convention-#12 chain).

The new `packages/eulerian-smoke-stack-e/` is the gate-14 RIGHT-partner. The port
inherits its **structure** from `mpm-multimaterial-stack-e` (common-warp socket +
own f64 `wp.array`s + the four-checkpoint Warp CPU determinism chain) and its
**content / regime** from `eulerian-smoke-stack-d` (chaotic-regime R-P2 gate-14
witness; two canonical descriptors; MMS-only gate-4; IC-6 `vector_field`).

Plan-drafting scope ONLY: probe + charter + plan-drafting landing + SHA back-fill
(4 commits). NO sim source, common-warp, workflow, conventions, methodology,
`tolerance.toml`, `equivalence.md`, or `dependencies.md` edits (dispatch boundary).
Task 1.6 is READ-ONLY execution of the existing Phase-1 surface (no committed
artifact).

---

## § 2. Convention C / D / M / A discipline at HEAD

**Convention M re-anchor.** HEAD at probe =
`d4e52f9fd477ece66170905e605930b011708f4f` (branch `main`; working tree clean
except untracked `.claude/` + two untracked
`captures/eulerian-smoke-stack-d/taylor-green-128cube-seed42-step500.{h5,json}`
files — the smoke-Stack-D 3D chaotic-regime artifact held local per the
LFS-bandwidth condition D13; not load-bearing for plan-drafting). `d4e52f9` is the
`mpm-multimaterial-stack-e` Stage-2 landing SHA-backfill (post-landing). No drift
since the coordinator handoff anchor → **Hard Rule 2 HEAD-drift condition NOT
triggered.**

| Anchor | Coordinator-believed | HEAD-verified (`sha256sum` / `git`) | Match? |
|---|---|---|---|
| HEAD | `d4e52f9` | `d4e52f9fd477ece66170905e605930b011708f4f` | **FACT — identical** |
| `docs/conventions/sub-phase-conventions.md` | post-§L.7 | `1937a7cfa53a6daf790def43f5cc13ba932d54d2c185275a506eb9fab269d031` | **FACT — verified at HEAD** |
| `docs/conventions/cross-stack-equivalence-methodology.md` | post-§5.1-third-instance | `a154d10c48be5ee9b5fda7e4d4e3819eed758e792215f7602f49ebf8b1d76421` | **FACT — verified at HEAD** |
| `docs/architecture.md` (spec anchor) | (carried) | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **FACT — unchanged since MPM-E** |
| Workspace members | 21 | 21 (`pyproject.toml`: 3 tools + 10 Phase-1 sims + common-py + 5 Stack-D + common-warp + mpm-multimaterial-stack-e) | **FACT — identical** |
| Replay invariant | `9399fc33…718909f34` (47th) | carried by reference (Stage-0 re-verifies; plan-drafting does not run replay) | **FACT — HELD** |
| Integrity baseline | `c19492ad…d22cb52` (10 sub-phases) | carried by reference (Stage-0 re-verifies; plan-drafting does not run the sweep) | **FACT — baseline-MATCH** |
| Cumulative shifts entering | 193 | `mpm-multimaterial-stack-e` landing § 12 closing total **193** (`191 → 193`) | **FACT — identical** |
| `common-warp` § 1.9.1 socket | verbatim | `common/common-warp/src/common_warp/__init__.py` re-exports `init` / `read_capture` / `write_capture` / `Capture` / `assert_deterministic_run` / `deterministic_context` / `set_warp_deterministic` / `set_seed` / `get_seed` (+ f32 `Particles`/`ScalarField3D`/`VectorField3D`/`HashGrid`) | **FACT — no drift** |
| `[overrides.eulerian-smoke]` | exists (smoke-D) | `tools/testkit/equivalence/tolerance.toml` `[overrides.eulerian-smoke] category = "smoke"` (count 1) | **FACT — present; reuse-able** |

**NOTE on the conventions / methodology sha256.** These differ from the
`mpm-multimaterial-stack-e` *probe*'s anchor values (`49c90fc2…` / `61350ee4…`)
because the MPM-Stack-E *landing* AMENDED both docs additively (methodology § 5.1
third-instance D8 + conventions § L.7 O-1/O-2; commit `47da4e0`). This is the
expected Phase-2 carry-forward — the docs advance at each landing; this probe
consumes the **current HEAD** baseline AS-IS (Convention M; HEAD wins). No
plan-drafting edit to conventions / methodology / architecture.

**Convention C** (probe API surfaces; verbatim citations): the common-warp § 1.9.1
socket signatures, the Phase-1 smoke reference surface (`sim.py` /
`reference/stable_fluids.py`), the `compare_captures` tolerance-resolution
mechanics, and the Warp 1.13.0 CPU-determinism behaviour are cited from HEAD source
/ the methodology § 6 + conventions § L.4–L.7 / the Warp 1.13.0 docs (§ 3 / § 6 /
§ 7). Web-fetch at probe time (`github.com/NVIDIA/warp` CHANGELOG): warp-lang 1.13.0
(2026-05-04) remains upstream-latest (no 1.14 / 2.0); the `>=1.13,<2.0` pin holds.

**Convention D** (probe call sites): how `mpm-multimaterial-stack-e` consumes the
common-warp socket (`init("cpu", True)` + `write_capture` f64 payload +
`deterministic_context` / `assert_deterministic_run`) is the call-site template;
the `common/common-warp/examples/hello/` smoke example is the reference consumer
pattern (a dense-grid Warp sim — structurally the closest to eulerian-smoke).

**Convention A** (additive-only): the implementation stages add a NEW package
(`packages/eulerian-smoke-stack-e/`) + a NEW capture dir
(`captures/eulerian-smoke-stack-e/`) + a NEW workspace member (21 → 22); existing
files are touched only where additive (root `pyproject.toml` member list,
`docs/perf-ledger.md` rows, `equivalence.md` additive Stack-E section). **No
`tolerance.toml` edit** (§ 7 D6 — the override already exists).

---

## § 3. Believed-state reconciliation (dispatch ENTERING STATE + PROBE-MUST-HONOR)

### Repo anchors — CONFIRMED
All anchors match (§ 2 table). Cumulative shifts entering = **193** (FACT —
`mpm-multimaterial-stack-e` landing § 12 closing total). Workspace = **21**;
replay `9399fc33…718909f34` HELD (47th); integrity `c19492ad…d22cb52` baseline
(byte-identical streak, 10 contiguous sub-phases). All carried by reference;
Stage-0 Task 0.0 re-verifies at then-HEAD.

### PROBE-MUST-HONOR (a) — S6-trajectory-simulation discipline — APPLIED (load-bearing; see § 6)
Task 1.6 EXECUTED the Phase-1 canonical trajectory at HEAD (3D Taylor-Green at
n=128 canonical resolution + n=64 derisk; 2D lid-driven-cavity at n=128;
read-only; no source edit; no committed artifact). Verdict: **CHAOTIC /
positive-Lyapunov / numerically unstable** at canonical resolution (max field
value grows exponentially, NOT bounded). Full result in § 6. This re-confirms,
on the Stack-E premise, the `eulerian-smoke-stack-d` landing characterization —
the sharp contrast to MPM Stack-E's BOUNDED rigid free-fall.

### PROBE-MUST-HONOR (b) — predicted gate-14 verdict — R-P2 escape-hatch; within_tolerance=False
Per methodology § 6 + conventions § L.7 O-1: predicted gate-14 verdict shape is
**(c) chaotic-regime escape-hatch** — `within_tolerance=False` on BOTH descriptors,
the CORRECT verdict (R-P2 invoked). **Empirically grounded** (Task 1.6 confirms
the *field* is positive-Lyapunov: the SEALED Phase-1 reference itself blows up,
so cross-stack content-equivalence at `relative=1e-4` over the 500/1000-step
horizons is physically impossible). The two § 6.2 escape-hatch conditions:
(1) **port faithfulness at step 1** — *predicted* `~1e-16` (the Warp f64-CPU port
computes the same algorithm in f64; cf. Stack-D's measured 3D `5.6e-16` / 2D `0.0`)
— a Stage-1 *measurement*, NOT yet measured (honest: the port does not yet exist);
(2) **positive divergence rate** — the field instability is **CONFIRMED at HEAD**
(Task 1.6). This is the **FIRST portfolio instance of R-P2 on Stack-E** and the
**SECOND R-P2 instance overall** (smoke-Stack-D Taichi was the first) → the
data-backed "R-P2 is stack-portable (Taichi → Warp CPU)" point. **Does NOT
assume** — confirmed empirically (the field) + predicted with rationale (the
step-1 port faithfulness).

### PROBE-MUST-HONOR (c) — common-warp consumption — RESOLVED (warp.md § 6 line-207 refined to socket-only)
HEAD-verification of (a) the Phase-1 smoke data-structure usage (dense
cell-centered f64 `u`/`v`/`w`/`density`/`p` arrays) and (b) the common-warp
§ 1.9.1 surface yields **socket-only** consumption — the same conclusion
`mpm-multimaterial-stack-e` reached (D7/D8 here), now for a dense-grid sim:

| Subsystem | § 1.9.1 surface | Smoke Stack-E consumption | Reason (HEAD-verified) |
|---|---|---|---|
| 1 Runtime | `init(device, deterministic)`; `get_device`/`set_device` | **YES — substantive** | `init("cpu", True)` device pin (CPU `bit-exact-same-hw`). |
| 2 Capture I/O | `Capture`, `write_capture`, `read_capture` | **YES — substantive (f64)** | gate-9 TWO canonical captures. `write_capture` treats payload as `np.asarray(arr)` (no f32 downcast — HEAD-verified in `common/common-warp/src/common_warp/capture/writer.py`); the port supplies its OWN **f64** state dict. |
| 3 Determinism | `set_warp_deterministic`, `deterministic_context`, `assert_deterministic_run`, `set_seed`, `get_seed` | **YES — substantive** | gate-10 W-2-equivalent at `tolerance=0.0` (D9). |
| 4 Particles | `Particles`, `allocate_particles` | **NO — not applicable** | Smoke is a pure Eulerian grid sim — no particles. |
| 5 Grids | `ScalarField3D`, `VectorField3D`, `allocate_scalar_field`, `allocate_vector_field` | **NO — structurally fits but BLOCKED by f64** | The f32-pinned `ScalarField3D`(`data: wp.float32`)/`VectorField3D`(`data: wp.vec3`) are the **natural structural fit** for smoke's dense `density` scalar + `(u,v,w)` vector fields — but smoke requires **f64** (chaotic regime + the § 6.6 pure-literal `1.0/6.0` Jacobi-3D normaliser f64-seed; Phase-1 `config.dtype="f64"`). Consuming them would downcast → the port rolls its OWN `wp.array(dtype=wp.float64)` dense fields. |
| 6 HashGrid | `HashGrid` (+ `query_radius`) | **NO — not used** | No neighbor-search; the Stam-Fedkiw pipeline is `np.roll`/`np.mod` periodic stencils + semi-Lagrangian gather. |

Net: 3 of 6 subsystems consumed substantively (the § 1.9.1 **socket**: Runtime,
Capture, Determinism). This **CONFIRMS** the `warp.md` § 6.1 general principle
("a sim whose reference requires f64 consumes the sockets only … and rolls its
own `wp.array(dtype=wp.float64)`") — smoke is the **SECOND f64 socket-only
consumer** (MPM Stack-E was the data-backed first). **Notably**, smoke is the
**first case where the f32 convenience surface (Grids) is the natural structural
fit and is still blocked by the f64 requirement** — MPM did not structurally fit
Particles/Grids anyway (fixed stencil + MPM-specific fields), so smoke is the
*stronger* validation of the f64-principle. The § 6 line-207 prediction (Smoke →
"`ScalarField3D`/`VectorField3D` dense fields, Capture") is REFINED, exactly as
§ 6.1 anticipated ("the Smoke / LBM Stack-E rows are predictions pending their own
plan-drafting HEAD-verification … verify the actual consumption, do not assume the
convenience surfaces fit"). This probe IS that HEAD-verification (D7).

### PROBE-MUST-HONOR (d) — tolerance reuse — CONFIRMED (no new override)
`[overrides.eulerian-smoke] category = "smoke"` exists at
`tools/testkit/equivalence/tolerance.toml` (HEAD-verified; established by
`eulerian-smoke-stack-d` Stage 1; AT-BUDGET per `[defaults.smoke]` `relative=1e-4,
absolute=0.0`; FIFTH per-sim override). `compare_captures` resolves the tolerance
category from the **LEFT/reference manifest's `sim.name`** (`eulerian-smoke`) — so
the Stack-E port (RIGHT) inherits the override with **no new row**. Stage 1c's
override-add step **collapses to a verify-only no-op** (D6) — the SECOND
cross-stack port to skip the Stage-1c override edit (MPM Stack-E was the first).

### INHERITED METHODOLOGY (all four amendment sets apply)
- **§ L.4** (chaotic-regime S6-trajectory discipline) — APPLIED this dispatch
  (Task 1.6). The smoke-Stack-D locus; Stack-E re-engages R-P2 on a second backend.
- **§ L.5** (common-warp-bootstrap) — S1a-2 GPU device-string discipline (no bare
  `cuda`-digit token in prose); S1b-3 socket-reconciliation (build verbatim);
  S1c-1 plan-prose-gloss vs spec-verbatim. All apply to Stack-E source/audits.
- **§ L.6** (Warp `@wp.kernel` quirks) — O-W7 `int(0)` idiom; explicit `dtype=` to
  `wp.from_numpy`; the `wp.float64(v)` taint workaround (derive int index via
  `wp.int32(...)`; pack per-axis weights in `wp.vec3d`). **§ L.6 names "Smoke
  Stack-E" explicitly** as inheriting these. Apply to the semi-Lagrangian backtrace
  + Jacobi stencil kernels.
- **§ L.7** (MPM-Stack-E observations) — O-1 verdict taxonomy (smoke Stack-E is the
  Stack-E first instance of shape **(c)**); O-2 four-checkpoint Warp CPU determinism
  chain (Stage 0 R-A1 anchor → Stage 1a production reproduction → Stage 1b
  canonical-scale 2-run → Stage 1c gate-14). Both inherited (§ 5 / charter).

---

## § 4. Banked-item enumeration sweep (full table)

(FACT — `mpm-multimaterial-stack-e` landing § 8 roll-up [most recent] +
`eulerian-smoke-stack-d` landing § 8. No surprise items.)

| Banked item | Origin | Disposition for this sub-phase |
|---|---|---|
| LFS-architecture sub-phase / remote-CI red (D13) | ongoing | **STAY-BANKED.** Remote-CI red per LFS-bandwidth; local verification unaffected. The smoke 3D 738 MB capture is the canonical case (held local; § 7). |
| LBM `sim_runner_diagnostic` cosmetic | LBM | **STAY-BANKED.** Not smoke-related. |
| actionlint / check-yaml hook coverage / supply-chain-pin migration (other 3 actions) | CI-action | **STAY-BANKED.** Tooling scope. |
| **Phase-1-canonical re-characterization question** | smoke-Stack-D landing § 8 | **STAY-BANKED / re-surfaced.** Smoke's chaotic canonicals raise whether future Phase-1 canonicals should "exhibit stable physics" vs "exercise the numerics incl. unstable cases." Stack-E is the SECOND port to inherit the chaotic canonical; the question is NOT resolved here (a Phase-1 design point; separate-sub-phase candidate). Recorded; no action (D-class). |
| manifest-equality smoke test (deferred) | LBM/smoke | **STAY-BANKED / DEFER** (LBM representative test covers the surface; neither smoke-Stack-D nor MPM-Stack-E added a per-port one). |
| mypy --strict warp partial-stub errors | common-warp 1c | **STAY-BANKED.** The Stack-E package inherits the `[[tool.mypy.overrides]] ignore_missing_imports` pattern (`warp`/`warp.*`). |
| blanket `-W error` vs per-package pytest-config (N1) | common-warp 1b/2 | **STAY-BANKED / honor.** Stage-2 portfolio sweep certifies each package under ITS OWN pytest config; no blanket CLI `-W error`. Nested `*/tests/` packages (testkit/diagnostics) swept recursively (smoke-Stack-D S2-2). |
| S0-1 bare-form `filterwarnings` | smoke-Stack-D / common-warp | **STAY-BANKED / honor.** The Stack-E `pyproject.toml` mirrors common-warp's bare `filterwarnings` form (Warp emits no Taichi-`SyntaxWarning` analog; the PCH `TemporaryDirectory` `ResourceWarning` fires only in the shutdown finalizer, not at pytest's gate — common-warp Stage-0 / MPM-Stack-E S0-1). |

**No surprise banked items surfaced.**

---

## § 5. Smoke Stack-E port-specific risk surface (R-SME*)

| Risk | Description + HEAD disposition |
|---|---|
| **R-SME1** S6 canonical-trajectory verdict (chaotic) | **CHAOTIC / positive-Lyapunov** (Task 1.6, § 6). gate-14 predicted `within_tolerance=False` on BOTH descriptors — the **CORRECT verdict** (R-P2 escape-hatch; methodology § 6). **This is the inverse of MPM Stack-E's R-MPME4** (BOUNDED, `within_tolerance=True`). **STOP-and-surface discipline is INVERTED:** `within_tolerance=False` is EXPECTED and is NOT a Hard-Rule-2 STOP; the Stage-1 STOP condition is instead a **step-1 port-faithfulness FAILURE** (a step-1 cross-stack diff ≫ FP-round-off would indicate a real port defect, NOT chaos — that is the surface to STOP on). The charter plans gate-14 as a **divergence-rate witness from the start** (no surprise STOP, unlike smoke-Stack-D Stage 1). |
| **R-SME2** f64 precision posture (R-MPME-F64 analog) | **MEDIUM.** common-warp `ScalarField3D`/`VectorField3D` are f32-pinned; smoke's reference + the chaotic regime require **f64**. The port uses its OWN `wp.array(dtype=wp.float64)` for `u`/`v`/`w`/`density`/`p`. Pure-literal f64 seeds per § 6.6 — Warp form `wp.float64(1.0)/wp.float64(6.0)` for the 3D Jacobi normaliser (`1.0/6.0`; the EXACT constant smoke-Stack-D found leaked `~1e-9` in Taichi — Warp also infers bare literals as f32 → SAME trap; O-W7). The 2D `0.25` is exact in f32 (no seed). f32 storage would not merely shrink a margin (cf. MPM) — it would change the *blow-up trajectory itself* (different chaotic divergence), so f64 is doubly load-bearing here. Drives D8. |
| **R-SME3** common-warp consumption (SECOND Stack-E port; inheritance-contract validation) | **MEDIUM — design surface.** Socket-only (Runtime + Capture + Determinism); Grids/Particles/HashGrid NOT consumed (§ 3 (c)). CONFIRMS the warp.md § 6.1 f64-principle (second instance; first where the f32 convenience surface structurally fits yet is blocked by f64). Drives D7. |
| **R-SME4** iterative-solver determinism (Jacobi-20; deferred IC-15 aspect #5) | **LOW.** `project_pressure`/`project_pressure_3d` run a FIXED `n_jacobi=20` sweeps, NO tolerance-comparison early-stop (the P24 pattern). Fixed sweep COUNT identical across stacks → the cross-stack delta is FP-accumulation over fixed sweeps, NOT iteration-count divergence (the determinism-threatening sub-aspect of #5 is structurally absent). Warp CPU serial `wp.launch` + `wp.float64(0.0)` reduction seeds ⇒ run-to-run bit-exact. Same as smoke-Stack-D's #5 finding, now on Warp. |
| **R-SME5** atomic-scatter (deferred IC-15 aspect #3) | **N/A.** No scatter anywhere — `determinism.atomic_ops=False`; semi-Lagrangian gather + elementwise `np.roll`/`np.mod` stencils → `@wp.kernel` per-cell stencils (no `wp.atomic_add`). The smoke contrast to MPM's present-but-not-exercised #3. |
| **R-SME6** advection / projection cross-stack operators | **LOW–MEDIUM.** Plain trilinear semi-Lagrangian (3D) + MacCormack predictor-corrector (2D only) + 5pt/7pt Laplacian diffuse + collocated centered-difference Jacobi project. Port the predictor-corrector + lex (i,j[,k]) vertex ordering exactly; periodic wrap via `wp` integer-mod (NOT clip). The collocated grid carries NO face-centered / MAC velocities (Stack-C deferred). Vorticity confinement is PRESENT-but-NOT-EXERCISED (`vorticity_eps=0.0`; methodology § 5.1 pattern). These are FP-faithful at step 1 (the port-faithfulness baseline); the chaos amplifies thereafter. |
| **R-SME7** `@wp.kernel` authoring quirks (O-W6 / O-W7; § L.6) | **LOW–MEDIUM.** The semi-Lagrangian backtrace derives integer base cells from float positions (`floor(x/dx)`) → the `wp.float64(v)` taint workaround (derive index via `wp.int32(...)`; § L.6, named for Smoke Stack-E). `int(0)` idiom for kernel-local mutable ints; explicit `dtype=` to `wp.from_numpy` for the multi-dim f64 fields; omit `from __future__ import annotations` defensively (O-W6 tolerant). |
| **R-SME8** two-capture wall-clock + the 738 MB held-local 3D artifact | **LOW–MEDIUM** (carried). Two canonicals: 3D `taylor-green-128cube-seed42-step500` (738,260,192 B; cadence-50; 11 frames) + 2D `lid-driven-cavity-128sq-re100-seed42-step1000` (4,385,176 B; cadence-100; 11 frames). The 3D capture is held LOCAL (LFS-bandwidth; chaotic-regime artifact; smoke-Stack-D landing § 11 precedent). Stage-0 Task 0.4 (§ N) re-estimates Warp-CPU wall-clock (smoke-Stack-D Taichi: 2D 8.470 s / 3D 698.986 s; NumPy-ref: 2D 5.099 s / 3D 691.587 s). Schema-corpus representative-subset = the small 2D capture (4.4 MB; ≤256 MiB § 5.4). |
| **R-SME9** S6 load-bearing + resolution-dependence (NEW) | **MEDIUM (methodology refinement candidate).** Task 1.6 surfaced that the FIELD instability is **resolution-dependent**: at the canonical 128³ the 3D Taylor-Green BLOWS UP (`0.999 → 1.34e8 @ step 50`), but a coarse **64³ derisk DECAYS** monotonically (`0.996 → 0.597 @ step 60` — laminar). The under-resolved fixed-20-sweep Jacobi (a smoother, not a converged solver) leaves a far larger divergence residual at 128³. **Implication for § L.4:** the trajectory-simulation probe must run at (or near) **canonical resolution** — a coarse-grid sim is a *second* false-laminar trap (beyond the code-read trap smoke-Stack-D found). Surfaced as D-class + a candidate § L.4 refinement. |

R-class STOP-AND-SURFACE (conventions § K) applies to any **step-1 port-faithfulness
failure** at Stage 1 (≫ FP-round-off — a real defect) and any Stage-0 finding that
Warp CPU determinism cannot be achieved (Hard Rule 2 condition 4 — assessed LOW;
MPM-Stack-E established the four-checkpoint chain). A gate-14 `within_tolerance=False`
is **NOT** a STOP here — it is the expected R-P2 verdict.

---

## § 6. Task 1.6 — S6-trajectory-simulation result (LOAD-BEARING per § L.4) + IC-15 assessment

### Task 1.6 — S6-trajectory-simulation (READ-ONLY execution of Phase-1 HEAD surface)

Executed the Phase-1 `eulerian_smoke` canonical trajectory at HEAD via
`eulerian_smoke.sim.compute_canonical_trajectory_3d` (3D) + a direct
`stable_fluids_step` + `semi_lagrangian_advect_2d` loop (2D), tracking
`max|u| = max(|u|,|v|[,|w|])` per step (read-only; no source edit; no committed
artifact). Canonical params (HEAD): 3D `n=128, ν=0.01, dt=0.005, n_jacobi=20,
vorticity_eps=0.0`; 2D `n=128, ν=0.01, dt=0.001, n_jacobi=20`.

**3D Taylor-Green — canonical resolution (n=128):**

| step | 0 | 1 | 10 | 20 | 30 | 40 | 50 | 60 |
|---|---|---|---|---|---|---|---|---|
| `max|u|` | `0.999` | `0.993` | `0.937` | `1.64e2` | `1.43e4` | `6.49e5` | `1.34e8` | `1.08e10` |

Field-amplification rate `ln(1.34e8/0.999)/50 ≈ 0.374/step` — matches the
smoke-Stack-D landing's `ln(8.1e7)/50 ≈ 0.36/step`; my step-50 `1.34e8` is the same
order as the landing's `8.1e7 @ step 50` (re-confirmed → `5.1e19 @ step 250` in the
landing). The blow-up onset is ~step 15–20; growth is exponential and accelerating.

**3D Taylor-Green — coarse derisk (n=64):** `max|u|` `0.996 → 0.926 (step 10)
→ 0.653 (step 50) → 0.597 (step 60)` — **monotone DECAY (laminar)**. The instability
is **resolution-dependent** (R-SME9): 20 Jacobi sweeps under-resolve the pressure
Poisson solve far more at 128³ than at 64³, leaving a divergence residual the
Taylor-Green vortex amplifies as it cascades to small scales.

**2D lid-driven-cavity — canonical resolution (n=128):**

| step | 0 | 1 | 2 | 3 | 5 | 10 |
|---|---|---|---|---|---|---|
| `max|u|` | `0.990` | `0.977` | `7.21` | `1.23e4` | `1.64e3` | `9.56e1` |

Faithful through step 1 (`0.977`), Kelvin-Helmholtz ignition at step 2 (`7.21`),
violent blow-up by step 3 (`1.23e4`); `max|u| ~1.64e3 @ step 5` — **EXACTLY matches**
the smoke-Stack-D landing's "the reference `u` reaches `~1.6e3` by step 5." Mechanism:
KH roll-up of the thin lid-shear-layer (`0.5(1+tanh((y−0.95)/0.02))`) on a periodic
grid; even more violent than the 3D.

**Chaotic-regime characterization: CHAOTIC (positive-Lyapunov) at canonical
resolution, BOTH descriptors.** Empirically re-confirmed on the Stack-E premise
(running the SEALED Phase-1 NumPy reference — the instability lives in the
reference, not in any port). The inverse of MPM Stack-E (BOUNDED rigid free-fall,
Lyapunov ≈ 0). gate-14 predicted `within_tolerance=False` (R-P2 escape-hatch; § 3 (b)).

### IC-15 aspect engagement verdict

The methodology (PARTIAL) lists 5 deferred aspects. Smoke Stack-E's engagement:

| Aspect | Verdict | Basis |
|---|---|---|
| **#1 R-P2 chaotic-regime escape-hatch** | **EXERCISED — SECOND instance (FIRST on Stack-E)** | Task 1.6 positive-Lyapunov, both canonicals. The escape-hatch (methodology § 6, FORMALIZED by smoke-Stack-D) is INVOKED. Smoke Stack-E is the data point that **R-P2 is stack-portable (Taichi → Warp CPU)** — the within-stack determinism (gate-10) is bit-exact even for chaos; the divergence surfaces only across two arithmetic backends (cross-stack defect-amplifier; § L.4). |
| **#3 atomic-scatter** | **NOT-APPLICABLE** | No scatter anywhere (R-SME5). |
| **#5 iterative-solver chaotic amplification** | **APPLICABLE — determinism-SAFE fixed-cap form** | Jacobi-20 fixed-cap; sweep count identical across stacks → FP-accumulation over fixed sweeps, NOT iteration-count divergence. The determinism-threatening sub-aspect stays structurally absent (same as smoke-Stack-D). #5's *chaotic-amplification* sub-aspect interacts with #1: the fixed-cap Jacobi residual is precisely what the chaotic Taylor-Green amplifies (equivalence.md § 4 mechanism). |

**IC-15 disposition lean (D5):** **PARTIAL HOLDS + § 6 R-P2 SECOND-INSTANCE
ADDITIVE refinement** (analogous to how § 5.1 received a third-instance amendment
via MPM Stack-E). The escape-hatch was FORMALIZED with smoke-Stack-D (Taichi); smoke
Stack-E reproduces it on Warp → a SECOND-INSTANCE note in methodology § 6 that the
R-P2 chaotic-regime escape-hatch is **stack-portable** (Taichi `ti.kernel` CPU →
Warp `@wp.kernel` serial-launch CPU; within-stack determinism bit-exact on both;
cross-stack divergence positive-Lyapunov on both). Does NOT promote IC-15 partial →
full (#2 / #3 / #5-chaotic-amplification still un-stress-tested). The equivalence.md
chaotic-regime witness template gets an additive Stack-E section (second gate-14
verdict pair). Exact disposition + the R-SME9 resolution-dependence § L.4 refinement
routed at Stage 2 (operator).

---

## § 7. Phase-1 smoke surface mapping (canonical captures; gate-14 consumption)

(FACT — `git ls-files` + `.gitattributes` LFS filter + `tools/testkit/equivalence/
harness.py` (`compare_captures`) at HEAD.)

- **gate-14 LEFT-partners (reference; sealed) — TWO descriptors:**
  `captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.{h5,json}`
  (738,260,192 B; 3D) + `captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.{h5,json}`
  (4,385,176 B; 2D). `.h5` LFS-tracked (`.gitattributes` `captures/**/*.h5
  filter=lfs`). `sim.name="eulerian-smoke"`, `sim.category="volumetric-grid"`,
  `variant="stam-fedkiw-stable-fluids"` (3D) / `"…-2d-lid-driven"` (2D).
- **gate-14 RIGHT-partners (this port; produced at Stage 1b):**
  `captures/eulerian-smoke-stack-e/{taylor-green-128cube-seed42-step500,
  lid-driven-cavity-128sq-re100-seed42-step1000}.{h5,json}`. Per warp.md § 6 step
  5, the port captures set `sim.name="eulerian-smoke"` + `sim.category=
  "volumetric-grid"` (matching the cross-stack partner) so `compare_captures`
  produces a field-by-field verdict (not a `sim:category-mismatch` HARD_FAIL).
  The 3D 738 MB RIGHT capture is held LOCAL (LFS-bandwidth; smoke-Stack-D § 11).
- **Descriptor fields (stack-agnostic):** 3D `u`/`v`/`w`/`density` (f64); 2D
  `u`/`v`/`density` (f64).
- **gate-14 mechanics (HEAD-verified `tools/testkit/equivalence/harness.py`,
  function `compare_captures` + `_resolve_tolerance`):** the tolerance category
  resolves from the **LEFT manifest's `sim.name`** (`eulerian-smoke`) → hits
  `[overrides.eulerian-smoke] category="smoke"` → `[defaults.smoke]` `relative=1e-4,
  absolute=0.0`. The RIGHT manifest must AGREE on `sim.category`. **The override
  already exists** (smoke-Stack-D Stage 1) → Stack-E reuses it; **no new
  `tolerance.toml` row** (D6). `sim.category="volumetric-grid"` has NO
  `[defaults.volumetric-grid]` row → without the override `compare_captures` would
  `KeyError`; the inherited override is what makes the RIGHT-partner resolvable.
- **TWO gate-14 verdicts** (the smoke-Stack-D / LBM two-capture precedent): both
  predicted `within_tolerance=False` (R-P2). `equivalence.md` (the
  `docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` chaotic-regime
  **witness template** authored by smoke-Stack-D) gets an additive **Stack-E
  section**: gate-14 verdict + step-1 port-faithfulness baseline + step-by-step
  `max_abs_err` divergence-rate table + Lyapunov estimate + the within-stack
  gates-4-13 GREEN evidence + why `within_tolerance=False` is correct.
- **Determinism:** Phase-1 reference over-achieves to `bit-exact-same-hw` (spec
  declares `epsilon-same-stack-same-hw`; `determinism.atomic_ops=False`); the Stack-E
  port targets the same over-achieve via f64 + Warp CPU serial launch (§ F.4
  informational; do NOT promote the spec declaration). gate-10 is bit-exact even
  though the trajectory is chaotic (within-stack determinism is order-deterministic).

---

## § 8. Naming proposal (D1)

Lean: **`sub-phase-eulerian-smoke-stack-e`** (package
`packages/eulerian-smoke-stack-e/`; captures `captures/eulerian-smoke-stack-e/`;
module `eulerian_smoke_stack_e`; audit dir + commit scope to match — NB the Phase-1
reference capture dir is the abbreviated `captures/eulerian-smoke-ref/`). Mirrors
the prior 6 ports' full-name pattern (conventions § C.1; CONFIRMS the dispatch).
D1 for operator routing.

---

## § 9. D-class question enumeration (surfaced; NOT pre-committed)

| D | Question | Lean |
|---|---|---|
| **D1** | Canonical sub-phase name | `sub-phase-eulerian-smoke-stack-e` (§ 8). CONFIRM. |
| **D2** | Stage decomposition | Same 6-stage shape as MPM Stack-E / smoke Stack-D: plan-drafting + Stage 0 + 1a + 1b + 1c + Stage 2 (charter § 2). Stage 1c override-add **collapses to verify-only no-op** (D6). gate-14 planned as a divergence-rate witness from the START (no surprise STOP). |
| **D3** | S6-simulation verdict (REQUIRED) | **CHAOTIC / positive-Lyapunov** (§ 6; empirical, both canonicals). |
| **D4** | gate-14 LEFT-partner captures inheritance | CONFIRMED — TWO `captures/eulerian-smoke-ref/…` descriptors PRESENT + LFS-tracked; same descriptors / stack-agnostic fields. 3D 738 MB RIGHT capture held local (D14). |
| **D5** *(most consequential)* | IC-15 disposition | **PARTIAL HOLDS + § 6 R-P2 SECOND-INSTANCE refinement** (stack-portable Taichi → Warp; § 6) + equivalence.md additive Stack-E section. Plus the R-SME9 resolution-dependence § L.4 refinement candidate. Routed at Stage 2 on the gate-14 result. |
| **D6** | Tolerance category | **REUSE `[overrides.eulerian-smoke]` category="smoke"; NO new override row.** SECOND cross-stack port needing no `tolerance.toml` edit (compare_captures keys on LEFT/reference `sim.name`). |
| **D7** | common-warp consumption pattern (SECOND Stack-E port) | Subsystems **1 Runtime + 2 Capture + 3 Determinism** substantive; **NOT** 4 Particles / 5 Grids / 6 HashGrid (§ 3 (c)). CONFIRMS warp.md § 6.1 f64-principle (2nd instance; first where the f32 Grids surface structurally fits yet is f64-blocked). |
| **D8** | f64 storage strategy (R-SME2) | **Own `wp.array(dtype=wp.float64)` dense fields** (warp.md § 6.1; preserves the chaotic-regime f64 contract + step-1 cross-stack faithfulness). Pure-literal `wp.float64(1.0)/wp.float64(6.0)` for the 3D Jacobi normaliser (§ 6.6; O-W7). RECOMMENDED. |
| **D9** | Determinism posture + O-2 chain | **`tolerance=0.0`** (CPU `bit-exact-same-hw`; bit-exact even for chaos). O-2 four-checkpoint chain: Stage-0 R-A1 anchor (a Jacobi-projection or SL-backtrace determinism kernel) → Stage-1a production reproduction → Stage-1b canonical-scale 2-run → Stage-1c gate-14. GPU mode out-of-scope. |
| **D10** | gate-14 framing (chaotic) | **Divergence-rate witness from the start;** gate-14 test asserts `within_tolerance=False` AND the § 6.2 escape-hatch criteria (step-1 faithfulness + positive divergence rate) — an escape-hatch-invocation-correctness assertion (smoke-Stack-D `test_cross_stack_equivalence.py` template). STOP only on a step-1 port-faithfulness FAILURE (R-SME1). |
| **D11** | IC-15 aspects engaged | **#1 EXERCISED (R-P2, 2nd instance / 1st on Stack-E); #5 fixed-cap determinism-safe; #3 N/A** (§ 6). |
| **D12** | Optional non-phase point-release tag | **NO TAG** (all spec-Phase-2 precedent; § D.2 forbids `-phase-N`). |
| **D13** | CI-red LFS-bandwidth state | **Record known-banked; no action.** Local-only landing. |
| **D14** | 3D 738 MB capture routing | **Held LOCAL** (LFS-bandwidth; chaotic artifact; smoke-Stack-D § 11). Schema-corpus representative-subset = the small 2D 4.4 MB capture (≤256 MiB; § 5.4). |
| **D15** | warp.md § 6 line-207 smoke-prediction refinement | **Note the refinement (socket-only, not f32 Grids); NO edit at plan-drafting** (boundary). § 6.1 already anticipated this; smoke CONFIRMS the f64-principle. Operator-routable doc note (mirrors MPM-Stack-E D16). |
| **D16** | R-SME9 resolution-dependence § L.4 refinement | **Surface; defer to Stage 2.** Task 1.6 must run at canonical resolution (a coarse 64³ derisk is a second false-laminar trap). Candidate additive § L.4 note. |
| **D17** | Phase-1-canonical re-characterization question (banked) | **STAY-BANKED; no action.** Smoke Stack-E is the 2nd port to inherit the chaotic canonical; the "should canonicals exhibit stable physics" question is a Phase-1 design point (separate-sub-phase candidate). |

---

## § 10. Discrepancies and observations not fitting elsewhere

1. **warp.md § 6 line-207 smoke-consumption prediction refined (load-bearing).**
   The bootstrap-era § 6 table predicted Smoke Stack-E consumes the f32
   `ScalarField3D`/`VectorField3D` dense-field surface. HEAD-verification (smoke is
   f64 — chaotic regime + the § 6.6 pure-literal seed + `config.dtype="f64"`) →
   socket-only consumption + own f64 `wp.array`s. The § 6.1 post-MPM-Stack-E note
   ALREADY generalized this (f64 → socket-only) and EXPLICITLY flagged the smoke row
   as "pending plan-drafting HEAD-verification." This probe IS that verification:
   smoke CONFIRMS the f64-principle (SECOND instance) — and is the FIRST case where
   the f32 convenience surface is the *natural structural fit* yet is f64-blocked.
   Surfaced, not silently absorbed (D7 / D15).

2. **gate-14 STOP-discipline is INVERTED vs MPM Stack-E.** For MPM (BOUNDED),
   `within_tolerance=False` would be a Hard-Rule-2 STOP. For smoke (CHAOTIC),
   `within_tolerance=False` is the EXPECTED R-P2 verdict and is NOT a STOP; the STOP
   surface is a step-1 port-faithfulness failure (a real defect). The charter plans
   gate-14 as a divergence-rate witness from the start — the key improvement over
   smoke-Stack-D, whose probe MISSED the chaos (false-laminar code-read) and hit a
   surprise Stage-1 STOP. Smoke Stack-E plans for chaos from plan-drafting (the
   § L.4 discipline working as intended).

3. **R-SME9 resolution-dependence (NEW; a second false-laminar trap).** Task 1.6
   found the 3D field blows up at the canonical 128³ but DECAYS at a coarse 64³
   derisk. Beyond smoke-Stack-D's "code-read is insufficient" lesson, this shows a
   **coarse-grid trajectory sim can also mislead** — the § L.4 probe must simulate
   at (or near) canonical resolution. Candidate additive § L.4 refinement (D16).

4. **Capture path convention.** gate-14 LEFT-partners are at
   `captures/eulerian-smoke-ref/` (the `-ref` suffix for Phase-1 reference captures),
   not `captures/eulerian-smoke/` (which does not exist). The source *package* is
   `packages/eulerian-smoke/`; the *capture artifacts* are `captures/eulerian-smoke-ref/`.

5. **Determinism-strategy port mapping (Convention D).** The Stack-E `sim.py`
   determinism docstring mirrors smoke-Stack-D's 8-clause structure with Warp
   substitutions: (1) semi-Lagrangian backtrace reads only prior-step arrays (no
   scatter) — same; (2) lex vertex ordering in the gather kernel — same, via
   `@wp.kernel` per-cell loops; (3) Jacobi FIXED 20-sweep cap (P24) — same; (4) no
   global RNG (analytic ICs; the 2D optional perturbation via NumPy `default_rng` is
   host-side stack-agnostic; Warp's own `wp.rand_init` NOT used); (5) periodic BCs via
   integer-mod (NOT clip); (6) Warp CPU serial launch replaces NumPy's elementwise
   no-BLAS posture; (7) deterministic capture ordering; (8) GPU-arch + parallel
   reductions deferred. Plus the Warp-specific `wp.float64(…)` seeds + O-W7 quirks.

6. **Plan-drafting shifts surfaced (S-SME*):**

| Shift | Description | Disposition |
|---|---|---|
| **S-SME1** | **S6 — CHAOTIC CONFIRMED on the Stack-E premise.** Task 1.6 re-characterized both canonicals as positive-Lyapunov at canonical resolution (3D `0.999 → 1.34e8 @ step 50`; 2D KH `0.99 → 1.64e3 @ step 5`), reproducing the smoke-Stack-D landing regime. gate-14 = R-P2 escape-hatch (`within_tolerance=False`); FIRST R-P2 on Stack-E / SECOND overall (stack-portable). | recorded |
| **S-SME2** | **common-warp consumption socket-only (warp.md § 6 line-207 refined).** Smoke is f64 → socket-only + own f64 `wp.array`s; the f32 Grids surface (its natural structural fit) is f64-blocked. CONFIRMS § 6.1 (2nd f64 instance). (D7/D15) | recorded |
| **S-SME3** | **Tolerance-override REUSE.** `[overrides.eulerian-smoke]` already exists (smoke-Stack-D); compare_captures keys on LEFT/reference `sim.name` → no new row. SECOND port to skip the Stage-1c override edit (MPM Stack-E first). (D6) | recorded |
| **S-SME4** | **R-SME2 f64 posture + O-W7.** Own `wp.array(dtype=wp.float64)`; pure-literal `wp.float64(1.0)/wp.float64(6.0)` for the 3D Jacobi normaliser (the EXACT constant that leaked `~1e-9` in Taichi; Warp also infers f32). f32 would change the chaotic trajectory itself. (D8) | recorded |
| **S-SME5** | **gate-14 STOP-discipline INVERTED** (`within_tolerance=False` EXPECTED, not a STOP; STOP on step-1 faithfulness failure). gate-14 planned as a divergence-rate witness from the start — improvement over smoke-Stack-D's surprise Stage-1 STOP. (D10) | recorded |
| **S-SME6** | **R-SME9 resolution-dependent false-laminar trap (NEW).** 64³ derisk DECAYS; 128³ canonical BLOWS UP → § L.4 probe must run at canonical resolution. Candidate § L.4 refinement. (D16) | recorded |

**Cumulative shifts:** entering **193** → this probe surfaces **6** (S-SME1..S-SME6)
→ **199** at plan-drafting close (after charter + landing).

---

*End of plan-drafting probe. Authoritative for the Phase-1 baseline (§ 6 Task 1.6
S6-simulation — CHAOTIC), common-warp § 1.9.1 consumption (§ 3 (c) — socket-only),
the tolerance/capture mechanics (§ 7 — reuse), the R-SME* risk surface (§ 5), and
the D1–D17 surface (§ 9). Read FIRST before the charter.*

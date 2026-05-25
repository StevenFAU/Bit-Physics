# mpm-multimaterial → Stack-E Port — Sub-Phase Charter (SIXTH spec-Phase-2 cross-stack port; FIRST Stack-E port)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) —
> **SIXTH per-sim cross-stack port under spec-Phase-2** and the **FIRST Stack-E
> port consuming `common/common-warp`** (following the 5 Stack-D ports +
> `common-warp-bootstrap` landing `0fa284d`). Ports `mpm-multimaterial` from its
> Phase-1 implemented reference (Python NumPy + numba; `stack.name=
> "numpy-numba-reference"`) to **Stack-E (Python / NVIDIA Warp 1.13.0 / CPU)**,
> consuming the common-warp § 1.9.1 socket (Runtime + Capture + Determinism)
> against the LBM/MPM Stack-D structural template + the IC-15 PARTIAL methodology.
> **Spec mandate:** § 11.3 item 2.3 ("MPM to Stack E (Warp port)") — this is the
> literal Stack-E port the Stack-D arm deferred.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (sha256 `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` — verified at HEAD per probe § 2) §§ 2.5 (IC-13), 2.6 (cross-stack tolerance — **`mpm` category `relative = 1e-4`**), 2.7 (capture format + canonical descriptor), 3.5 + Appendix **D.6** (14 acceptance gates), D.7 (hybrid-pg Tier-2 = `particle` IC-5 + `vector_field` IC-6), 3.6 (Layer-5 per-replication), 4.4 (CPU `bit-exact-same-hw` / GPU `epsilon-bounded-cross-stack`), 7.5 + Appendix G.7 (IC-16 citations), **11.3 item 2.3** (MPM → Stack-E mandate), Appendix D § D.2.3 (canonical descriptors).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `49c90fc28117732e47bd64ff1c5ee9b25e5d6a499ba71bbf9d56d25e0dbe0d74` — verified at HEAD). **§ L.4** (chaotic-regime + S6-trajectory-simulation precedents) + **§ L.5** (common-warp-bootstrap precedents: S1a-2 / S1b-3 / S1c-1) are both load-bearing. Inherits role model (§ A.3), three-stage cadence (§ A.2), append-only discipline (§ B), Convention #12 SHA back-fill (§ B.2 + audit-chain-correctness N1 enumerate-all-placeholders), commit-message convention (§ C), replay-chain non-participation (§ D.4), gate-13 worktree pattern (§ E), determinism convention (§ F), Stage-0 scope-analysis (§ N), capture cadence routing (§ P).
> **IC-15 reference document (consumed AS-IS):** `docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `61350ee47600f9d26f53f4e3fb0525b1099702ad91eecf27d0103c1c76d1da87` — verified at HEAD). 5 codified components + § 4 LBM + § 5 MPM (fourth-pair) + § 6 smoke (R-P2 escape-hatch FORMALIZED) + 5 deferred aspects. This is the SIXTH pair; it re-engages deferred aspect **#3 (atomic-scatter)** in PRESENT-but-NOT-EXERCISED form on the Stack-E side, while #1 (chaotic) + #5 (iterative-solver) remain unexercised (probe § 6).
> **common-warp inheritance contract (§ 1.9.1 socket; verified verbatim at HEAD per probe § 3):** `init(device: str | None = None, deterministic: bool = False) -> str`; no-arg `deterministic_context() -> Iterator[int]`; `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0) -> str`; `set_warp_deterministic(seed, device="cpu") -> int`; `set_seed` / `get_seed`. W-2 baseline `24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314`. Subsystems consumed: **1 Runtime + 2 Capture + 3 Determinism** (the socket); Subsystems 4 Particles / 5 Grids (f32-pinned) + 6 HashGrid (no neighbor-search) are NOT structurally consumed (probe § 3 ITEM-3).
> **Structural inheritance template:** `docs/phases/sub-phase-mpm-multimaterial-stack-d.md` (the FOURTH per-sim port; SAME sim source; closest structural template) + `docs/phases/sub-phase-eulerian-smoke-stack-d.md` (the FIFTH; S6-trajectory-simulation + chaotic-regime methodology). This charter inherits their structure with **Warp deltas** explicit (§ 6): common-warp instead of common-py; Warp CPU serial launch instead of Taichi `cpu_max_num_threads=1`; `wp.float64(…)` seeds instead of `ti.f64(…)`; @wp.kernel instead of @ti.kernel.
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Phase-1 `mpm-multimaterial` reference sealed: `packages/mpm-multimaterial/` (MLS-MPM Hu 2018 + APIC; single-material neo-Hookean; fixed 27-cell stencil; f64; NO atomic-scatter). ONE canonical capture (LFS): `captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` (gate-14 LEFT-partner).
> - `common-warp-bootstrap` landed `0fa284d`; all 6 W-Gates GREEN; § 1.9.1 socket established; CPU `bit-exact-same-hw` (incl. `wp.atomic_add`) empirically verified at Stage-0.
> - MPM Stack-D landed (gate-14 `within_tolerance=True` @ 1e-4, ~24-order margin; `particle_pos` BIT-EXACT); `[overrides.mpm-multimaterial] category="mpm"` established (Stack-D Stage 1c).
> - Conventions `49c90fc2…`; architecture `e82b7b8e…`; methodology `61350ee4…`; all HEAD.
> - `[defaults.mpm]` = `relative = 1e-4, absolute = 0.0`; `[overrides.mpm-multimaterial]` **already exists** → no new override for Stack-E (probe § 7 / D7).
> **Inherited shifts:** **176 documented entering** (FACT — `common-warp-bootstrap` landing § 12: `165 → 176`). Carried by reference; not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/plan-drafting-probe-2026-05-25T00-27-55Z.md`. Read FIRST. Authoritative for the Phase-1 baseline + Task 1.6 (§ 6), common-warp consumption (§ 3 ITEM-3), tolerance/capture mechanics (§ 7), the R-MPME* surface (§ 5), and the D1–D16 surface (§ 9).
> **Date drafted:** 2026-05-25.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D16 routing (§ 9).

---

## § 1. Scope

The **SIXTH per-sim cross-stack port** under spec-Phase-2 and the **FIRST
Stack-E port**. Takes the Phase-1-frozen `mpm-multimaterial` reference (Python
NumPy + numba; `stack.name="numpy-numba-reference"`) and produces a
content-equivalent Stack-E port (Python / NVIDIA Warp 1.13.0 / CPU mode default)
at `packages/mpm-multimaterial-stack-e/`, through gates 4–14 of spec § 3.5 /
Appendix D.6 (13 stack-agnostic correctness gates + the Phase-2 14th gate of
cross-stack equivalence against the Phase-1 reference capture at `relative=1e-4`).

This sub-phase is the FIRST substantive consumer of `common/common-warp`'s
§ 1.9.1 socket (spec § 11.3 mandate "Stages 5, 7, 8 import and use"). It
validates the Stack-E inheritance contract: Runtime + Capture + Determinism are
consumed substantively; the f32-pinned Particles/Grids + the HashGrid
neighbor-search subsystems are NOT structurally consumed by an f64
fixed-stencil MPM port (probe § 3 ITEM-3; warp.md § 6 prediction corrected).

**Algorithmic surface (HEAD-verified; probe § 6 / § 10):** MLS-MPM (Hu 2018) +
APIC (`4/dx²` affine reconstruction) + neo-Hookean **single-material**
(`material_id` all-0); single-pass explicit (no iterative solver); fixed 27-cell
quadratic-B-spline stencil (`base = floor(p/dx + 0.5) − 1`). The canonical
`drop-impact` trajectory is **rigid free-fall** (Task 1.6; the blob never
contacts the floor → `F=I` → zero stress) — so the cross-stack surface is the
P2G atomic-scatter (present-but-not-exercised) + G2P/APIC FP-accumulation, NOT a
deforming-contact stress path.

---

## § 2. Stage decomposition (proposed; D2 for operator routing)

Lean: **same shape as MPM Stack-D** — plan-drafting + Stage 0 + Stage 1a +
Stage 1b + Stage 1c + Stage 2. Task 1.6 surfaced NO reason to compress (the
canonical is tame + well-understood). The one structural simplification vs
Stack-D: **Stage 1c's MANDATORY tolerance-override-add step collapses to a
verify-only no-op** (D7 — the override already exists).

| Stage | Purpose | Single-session? |
|---|---|---|
| **plan-drafting** (this) | probe + charter + plan-drafting landing + SHA back-fill (4 commits) | yes |
| **Stage 0 — Pre-flight** | Tasks 0.0–0.6 + checkpoint + SHA back-fill. **0.0** Convention-M anchor re-check; **0.1** common-warp § 1.9.1 socket consumption probe (Runtime/Capture/Determinism call sites; the hello example as reference consumer); **0.2** Warp CPU determinism re-verify with the **MPM P2G atomic-scatter kernel** (R-A1 scope-expansion: confirm `wp.atomic_add` serial-launch bit-exact at the MPM-specific scatter; D5); **0.3** f64-storage + `wp.float64()` seed + pure-literal-constant audit (R-MPME-F64; D15); confirm common-warp `write_capture` preserves f64 payloads (verified at probe HEAD: `np.asarray`, no downcast); **0.4** canonical-descriptor scope-analysis (§ N — re-estimate Warp-CPU wall-clock vs Stack-D Taichi 360.773 s / numba ref 158.052 s; cadence-50 / ≤256 MiB schema-corpus per § 5.4); **0.5** tolerance-override REUSE verification (no new row; `compare_captures` keys on LEFT `sim.name`); **0.6** golden-table consumability (gate-4 quadratic-B-spline). | yes |
| **Stage 1a — Failing-tests commit** | `packages/mpm-multimaterial-stack-e/` skeleton + test surface (`tests/`) at clean `ModuleNotFoundError`; failing-tests evidence + sha256 (commit-first-then-sha256). | yes, single commit |
| **Stage 1b — Implementation commit** | Determinism-strategy docstring first (§ 6); Warp MLS-MPM reference (`shape_functions`, neo-Hookean `stress`, P2G-scatter, `grid_update`, G2P/APIC, `deformation_update`, `advect` as `@wp.kernel`s over own f64 `wp.array`s) → `sim.py` wrapper (`sim_runner_seeded` + `sim_runner_diagnostic`; common-warp `init`/`set_warp_deterministic`/`write_capture`) → `invariants.py` → spec sheet (`spec-ref-stack-e.md`) → test bodies GREEN (gates 4–13; gate-4 GOLDEN-only) → ONE canonical capture → perf-ledger row → root `pyproject.toml` workspace registration → gate-13 replay. | yes, single commit |
| **Stage 1c — Cross-stack equivalence + landing-prep** | gate-14 `compare_captures(mpm-ref, stack-e)` at `relative=1e-4` (full canonical horizon; per-field per-frame witness + step-horizon analysis REGARDLESS of pass/fail) → `equivalence.md` additive extension → tolerance-override REUSE **verify-only** (no new row; D7) → schema-corpus representative-subset entry (≤256 MiB; § 5.4) → un-skip gate-14 test. | yes, single commit |
| **Stage 2 — Landing** | anchor re-check → portfolio regression sweep (21 members; verify `[overrides]` non-interference + per-package pytest-config certification, NOT blanket `-W error`) → integrity sweep (informational; `c19492ad…` baseline) → evidence-path verify (IC-16) → gate-13 replay → append-only check → IC-15 disposition (D8; D5-analog) → landing audit → SHA back-fill. | yes if Stage 1 clean |

---

## § 3. Acceptance criteria (14 gates per spec § 11.3 + § 3.5 / Appendix D.6)

Canonical Appendix D.6 numbering (NOT the Phase-1 docstring +1-offset). Gates
4–13 are stack-agnostic correctness; gate-14 is the Phase-2 cross-stack
equivalence gate.

| Gate | Surface | MPM Stack-E specifics |
|---|---|---|
| **4** Code verification (golden) | quadratic-B-spline shape functions vs `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` (`abs=1e-15`; 4 anchors + partition-of-unity) | **GOLDEN-only — NO MMS arm** (mirrors Stack-D; opposite of LBM). |
| **5** Tier-1 diagnostics | `check_health` (NaN/Inf scan) clean across captured frames | — |
| **6** Tier-2 (IC-5 + IC-6) | `check_count_invariance` + `check_momentum_conservation_drift` (IC-5 particle) + `check_circulation_grid_mom_l1` (IC-6 vector_field on `grid_mom`) | BOTH IC-5 + IC-6 at Tier-2 (hybrid-pg). |
| **7** Cat-1 citations | `spec-ref-stack-e.md` cites Hu 2018 (DOI 10.1145/3197517.3201293) + 88-line MLS-MPM reference + Steffen-Kirby-Berzins 2008 (DOI 10.1002/nme.2360); `python -m integrity --cat 1` clean | — |
| **8** Cat-2 public API | `mpm_multimaterial_stack_e.{reference, sim, invariants}` exports; `--cat 2` clean | — |
| **9** Canonical capture + corpus | `captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.{h5,json}` via common-warp `write_capture` (f64 payload); schema-corpus representative-subset (D10/§ 5.4); `read_capture` round-trips; manifest sha256 recorded (commit-first-then-sha256; `.h5` LFS) | `sim.{name,category}` match the partner. |
| **10** Determinism (IC-13/IC-14) | `assert_deterministic_run(sim_fn, runs=2, tolerance=0.0)` (W-2-equivalent, CPU bit-exact; D14) + testkit `run_twice_and_diff(sim_runner_diagnostic, seed=42)`; `content_equivalent == True` | `tolerance=0.0` (CPU bit-exact-same-hw). |
| **11** PBT (≥ 2 invariants) | `mass_conservation_p2g_g2p` + `partition_of_unity_b_spline` at `n_examples ≥ 50`; Hypothesis DB committed | — |
| **12** Perf-ledger row | `docs/perf-ledger.md` → mpm-multimaterial / **warp-cpu** / drop-impact-128cube-seed42-step500 / wall-clock / hw_id / commit / date / baseline | — |
| **13** Failing-tests replay | `git worktree add … <stage-1a-sha>`; pytest reproduces `ModuleNotFoundError`; HEAD GREEN (§ E worktree pattern) | — |
| **14** Cross-stack equivalence (Phase-2) | `compare_captures(LEFT=mpm-ref, RIGHT=stack-e)` at `relative=1e-4`; empirical verdict + per-field per-frame witness + step-horizon analysis in `equivalence.md` REGARDLESS of pass/fail | **predicted `within_tolerance=True`** (BOUNDED; cf. Stack-D ~24-order margin). If > 1e-4: STOP + surface per R-MPME4 (no silent widening). |

---

## § 4. Touch set per stage

| Stage | New (Convention A) | Additive edits | NOT touched |
|---|---|---|---|
| Stage 0 | checkpoint audit + SHA back-fill | — | NO source |
| Stage 1a | `packages/mpm-multimaterial-stack-e/` (pkg skeleton + `tests/` failing surface + `pyproject.toml`) | — | — |
| Stage 1b | reference modules + `sim.py` + `invariants.py` + `spec-ref-stack-e.md` + canonical capture (`captures/mpm-multimaterial-stack-e/`) | root `pyproject.toml` (workspace member); `docs/perf-ledger.md` (1 row) | Phase-1 source; common-warp |
| Stage 1c | schema-corpus subset fixture | `docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md` (additive section); un-skip gate-14 test | **`tolerance.toml` (NO edit — reuse; D7)**; conventions/methodology |
| Stage 2 | landing audit + SHA back-fill | CHANGELOG entry; conventions § L (only if D8 routes a methodology note) | — |

---

## § 5. Risk surface (R-MPME*; probe § 5)

- **R-MPME1** atomic-scatter under Warp CPU mode — **LOW** (Warp CPU serial launch ⇒ `wp.atomic_add` deterministic; verified common-warp Stage-0 `24d44c7e…`; no `cpu_max_num_threads=1` knob). Stage-0 R-A1 re-verifies the MPM P2G kernel.
- **R-MPME2** P2G/G2P transfer determinism — **LOW** (`wp.float64(0.0)` accumulator seeds + pure-literal `wp.float64(…)` constants per banked #7 / O-W7 / § L.4; serial CPU launch).
- **R-MPME3** multi-material constitutive dispatch — **N/A-effectively** (single-material `material_id` all-0; one neo-Hookean stress path).
- **R-MPME4** S6 canonical-trajectory verdict — **BOUNDED** (Task 1.6); gate-14 predicted `within_tolerance=True`. STOP-and-surface if > 1e-4 (§ K; no silent widening).
- **R-MPME5** IC-15 aspect engagement — #3 present-but-not-exercised; #1/#5 N/A; same as Stack-D (D8).
- **R-MPME6** common-warp consumption (inheritance-contract validation) — **MEDIUM** design surface (§ 3 ITEM-3; D10/D15/D16).
- **R-MPME-F64** precision posture — **MEDIUM**: own f64 `wp.array`s required (common-warp Particles/Grids are f32); warp.md § 6 LBM-precedent of stack-specific arrays (D15).
- **R-MPME-CAP** capture cadence/scope — **LOW** (cadence-50; 11 frames; ≤256 MiB schema-corpus subset; Stage-0 Task 0.4 Warp-CPU wall-clock estimate).

R-class STOP-AND-SURFACE discipline per conventions § K applies to any gate-14
divergence > 1e-4 and any Stage-0 finding that Warp CPU determinism cannot be
achieved for the MPM P2G kernel (Hard Rule 2 condition 4 — assessed LOW).

---

## § 6. Convention discipline reminders specific to this port

- **§ L.5 S1a-2 GPU device-string discipline** — name GPU devices in prose form
  ("CUDA device zero", "the zero-indexed CUDA device"); never a bare
  `cuda:`-digit token in un-backticked prose (parses as `path:line`; HARD_FAILs
  Cat-1 / cat4 draft-time). Applies to all Stack-E source/docstrings/audits.
  (The cat4 draft-time pre-commit hook ALSO validates backticked `file:line`
  citations — use full repo-relative paths.)
- **§ L.5 S1b-3 socket-reconciliation (preventive)** — Stage 1a builds against
  the § 1.9.1 socket **verbatim** from the start (`init(device, deterministic)`;
  no-arg `deterministic_context()`; `assert_deterministic_run(sim_fn, *, runs,
  tolerance)`); no post-hoc refactor needed if built correct.
- **§ L.5 S1c-1 plan-prose-gloss vs spec-verbatim** — dispatches cite § 1.9.1 +
  spec sections by number for verbatim consumption; Convention C/M is the
  execution-time backstop.
- **§ L.4 S6-trajectory-simulation** — APPLIED at plan-drafting (Task 1.6;
  BOUNDED). The chaotic-regime escape-hatch (§ 6) is assessed N/A; gate-14 is a
  standard FP-round-off-margin witness (NOT a divergence-rate witness).
- **Banked #7 / O-W7 (Warp)** — `wp.float64(…)` seeds for in-kernel f64
  accumulators AND pure-literal non-power-of-2 constants (APIC `4/dx²`, B-spline
  weights, Lamé terms); `int(0)` idiom for kernel-local mutable ints (suppress
  ruff UP018/RUF046 on those lines); explicit `dtype=` to `wp.from_numpy` for
  multi-dimensional f64 scalar arrays. **O-W6:** `@wp.kernel` tolerates
  `from __future__ import annotations` (the convention is to omit it
  defensively).
- **Banked #8 Warp analog** — Warp CPU serial launch is the determinism
  mechanism (no explicit threads knob); `device="cpu"` for gates 10/11.
- **Bare-form filterwarnings (S0-1)** — the Stack-E `pyproject.toml` mirrors
  common-warp's: Warp emits no SyntaxWarning analog of Taichi's cold-`.pyc`; a
  `ResourceWarning` from Warp's PCH `TemporaryDirectory` fires only in the
  interpreter-shutdown finalizer (does not reach pytest's `filterwarnings` gate
  per common-warp Stage-0 § 5).
- **N1 per-package pytest-config** — Stage-2 portfolio sweep certifies each
  package under ITS OWN pytest config; no blanket `-W error` CLI flag.
- **Convention #12 / commit-first-then-sha256 / N1 enumeration** — every SHA
  back-fill is a separate commit (never `--amend`); enumerate EVERY
  placeholder-bearing audit.

---

## § 7. Banked methodology-precedents this sub-phase consumes (full enumeration)

1. Commit-first-then-sha256 (#1).
2. Convention #12 N1 enumerate-all-placeholders (#2).
3. Stage 0 R-A1 scope-expansion (#3) — applies to the gate-14 / P2G-kernel re-verify in Stage 0.
4. **S6-trajectory-simulation discipline (§ L.4)** — APPLIED this dispatch (Task 1.6; BOUNDED).
5. Cross-stack-as-defect-amplifier (§ L.4).
6. Per-sim tolerance.toml override pattern (#6) — here **REUSED** (not added; D7).
7. f64 accumulator-seed pattern (#7) **extended to pure-literal kernel constants** (§ L.4) — Warp form `wp.float64(…)`.
8. `cpu_max_num_threads=1` serialisation for atomic-scatter (#8) — **Warp analog = structural serial launch** (no knob; D5).
9. Pre-emptive `ruff check --fix` + `ruff format` (#9) — downstream Stage 1.
10. methodology § 5.1 PRESENT-but-NOT-EXERCISED (atomic-scatter) — REUSED.
11. methodology § 5.2 hybrid-pg → mpm taxonomy.
12. methodology § 5.3 S6 two-instance pattern (spec-vs-implementation; re-confirmed for Stack-E).
13. methodology § 5.4 legacy-captures schema-corpus ≤ ~256 MiB representative-subset.
14. methodology § 6 R-P2 chaotic-regime escape-hatch — assessed **N/A** (BOUNDED).
15. § L.5 S1a-2 GPU device-string discipline.
16. § L.5 S1b-3 socket-reconciliation Option B (preventive — build verbatim).
17. § L.5 S1c-1 plan-prose-gloss vs spec-verbatim discipline.
18. O-W6 (Warp future-annotations tolerance) + O-W7 (Warp quirks).
19. Bare-form filterwarnings (S0-1).
20. D4 determinism contract (`tolerance=0.0` CPU bit-exact-same-hw).

(20 precedents; ≥ 17 per the dispatch catalog.) **Produced (candidate, D8 at
Stage 2):** an optional additive note that methodology § 5.1
(atomic-scatter-present-but-not-exercised) is **stack-portable** — re-confirmed
on a SECOND backend (Warp CPU serial launch) at the same canonical regime.

---

## § 8. Out-of-scope

- **MPM Stack-E GPU mode** (`epsilon-bounded-cross-stack`; spec § 4.4 + § 7.8) —
  CPU `bit-exact-same-hw` only at this sub-phase; GPU certification is deferred
  per-port scope.
- **The other 2 Stack-E ports** — Smoke (spec § 11.3 item 2.4) + LBM (item 2.5).
- **Multi-material constitutive table** — single-material neo-Hookean only.
- **§ 1.9.1 socket amendment** — adding f64 Particles/Grids variants is a
  founder-confirmed amendment (Rule W1); NOT in scope (the port uses its own f64
  `wp.array`s).
- **`docs/common/warp.md` § 6 doc-correction** (the MPM-consumption prediction) —
  operator-routable; this charter documents the corrected consumption (D16).
- **LFS-architecture banked** (D13) — remote-CI red per LFS-bandwidth; local
  verification unaffected; no action.
- **CI-red state** — recorded known-banked; the sub-phase lands LOCAL-ONLY (per
  the prior 6 sub-phases' posture).

---

## § 9. Operator decisions surfaced (D1–D16)

(Full leans + rationale in probe § 9. Summary:)

- **D1** name `sub-phase-mpm-multimaterial-stack-e` (CONFIRM).
- **D2** stage decomposition same as Stack-D (§ 2); Stage 1c override-add → no-op.
- **D3** S6-simulation verdict **BOUNDED** (Task 1.6).
- **D4** atomic-scatter present-but-not-exercised (same as Stack-D; Warp-disarmed).
- **D5** `cpu_max_num_threads=1` Warp analog **N/A** (structural serial launch).
- **D6** gate-14 LEFT-partner `captures/mpm-ref/…` PRESENT + LFS (CONFIRM).
- **D7** **REUSE `[overrides.mpm-multimaterial]`; NO new tolerance row.**
- **D8** IC-15 #3 present-but-not-exercised; #1/#5 N/A; PARTIAL HOLDS (optional § 5.1 stack-portability note at Stage 2).
- **D9** manifest-equality (#14) **DEFER**.
- **D10** common-warp consumption: Runtime + Capture + Determinism; NOT Particles/Grids/HashGrid.
- **D11** surprise banked items **NONE**.
- **D12** **NO `-phase-N` tag.**
- **D13** CI-red LFS-bandwidth **known-banked; no action.**
- **D14** determinism `tolerance=0.0` (CPU bit-exact).
- **D15** f64 storage: **own `wp.array(dtype=wp.float64)` sim-state arrays** (warp.md § 6 LBM-precedent) — RECOMMENDED.
- **D16** warp.md § 6 prediction corrected (HashGrid + f32 Particles/Grids not consumed) — note; no edit at plan-drafting.

---

## § 10. Plan-drafting landing audit checklist

The plan-drafting landing audit (COMMIT 3) verifies:
1. Probe + charter committed; closing-anchor re-check on EVERY `file:line` /
   sha256 / signature cited (Convention M closing anchor).
2. Verdict on each dispatch SECTION 1 item (repo anchors; ITEM 1–6).
3. Task 1.6 S6-simulation result recorded (LOAD-BEARING; BOUNDED).
4. D1–D16 surfaced for operator routing; none pre-committed.
5. Plan-drafting shifts enumerated (S-ME*); cumulative `176 → 176 + N`.
6. SHA placeholders for the commit chain (back-filled in COMMIT 4 per
   Convention #12; never `--amend`; N1 enumeration).
7. Hard Rule 2 conditions assessed (HEAD-drift: none; socket drift: none;
   trajectory: BOUNDED; Warp CPU determinism: achievable) — NOT triggered.
8. Boundary honored (SECTION 7): no sim/common-warp/workflow/conventions/
   methodology/dependencies edits; Task 1.6 read-only.

---

*End of sub-phase charter. Inherits the MPM Stack-D + smoke Stack-D § structure
with Warp deltas explicit. Operator routes D1–D16, then dispatches Stage 0
separately.*

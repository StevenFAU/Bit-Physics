---
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-plan-drafting
stage: plan-drafting-probe
phase: phase-2
head_sha: <COMMIT_1_SHA_PENDING>
head_sha_at_checkpoint: 0fa284d64e770d7ca3f18899b2221f9abc98281d
date: 2026-05-25T00-27-55Z
verdict: probe-complete
---

# Plan-drafting probe — sub-phase-mpm-multimaterial-stack-e

> **SIXTH** per-sim cross-stack port under spec-Phase-2; the **FIRST Stack-E
> port consuming `common/common-warp`** (spec § 11.3 item 2.3 mandate — "MPM to
> Stack E (Warp port)"). Ports `mpm-multimaterial` from its Phase-1 implemented
> reference (Python NumPy + numba; `stack.name="numpy-numba-reference"`) to
> Stack-E (Python / NVIDIA Warp 1.13.0 / CPU). Gate-14 LEFT-partner is the
> Phase-1 reference capture (`captures/mpm-ref/`); RIGHT-partner is the new
> Stack-E port capture.
>
> Probe authored per the **S6-trajectory-simulation discipline** (conventions
> `§ L.4`; methodology `§ 6.5`) — Task 1.6 EXECUTES the Phase-1
> `sim_runner_diagnostic` at HEAD (not just reads `sim.py`). Every path / SHA /
> sha256 / signature / classification below is HEAD-verified at `0fa284d`.
> **Three dispatch / doc premises are corrected at HEAD** (see § 3 / § 5 / § 10):
> (1) `docs/common/warp.md` § 6 predicts MPM consumes "the most of the surface —
> `Particles`, `HashGrid`, `ScalarField3D`"; HEAD-verification of the Phase-1
> reference + the common-warp f32 surface shows MPM Stack-E consumes **Runtime +
> Capture + Determinism** substantively and does **NOT** structurally consume
> Particles / Grids / HashGrid; (2) the per-sim `[overrides.mpm-multimaterial]`
> tolerance row **already exists** (Stack-D Stage 1c) — Stack-E needs **no new
> override**; (3) the canonical "drop-impact" is **rigid free-fall** (Task 1.6
> empirical), not a deforming impact.

---

## § 1. Scope

This sub-phase ports `mpm-multimaterial` (Phase-1 NumPy+numba reference at
`packages/mpm-multimaterial/`) to Stack-E (Python / NVIDIA Warp 1.13.0 / CPU
mode default), producing `packages/mpm-multimaterial-stack-e/` through gates
4–14 of spec § 3.5 / Appendix D.6 (13 stack-agnostic correctness gates + the
Phase-2 14th gate of cross-stack equivalence). It is the SIXTH per-sim
cross-stack port and the FIRST Stack-E port — `common/common-warp`'s § 1.9.1
socket is consumed substantively for the first time.

Two existing MPM packages at HEAD bracket this port:
- `packages/mpm-multimaterial/` — Phase-1 NumPy+numba reference (gate-14
  LEFT-partner; sealed).
- `packages/mpm-multimaterial-stack-d/` — Phase-2 Stack-D Taichi-DSL port
  (FOURTH per-sim port; closest structural template; NOT the gate-14 partner).

The new `packages/mpm-multimaterial-stack-e/` is the gate-14 RIGHT-partner.

Plan-drafting scope ONLY: probe + charter + plan-drafting landing + SHA
back-fill. NO sim source, common-warp, workflow, conventions, methodology, or
`dependencies.md` edits (dispatch SECTION 7 boundary). Task 1.6 is READ-ONLY
execution of the existing Phase-1 surface.

---

## § 2. Convention C / D / M / A discipline at HEAD

**Convention M re-anchor.** HEAD at probe =
`0fa284d64e770d7ca3f18899b2221f9abc98281d` (branch `main`; working tree clean
except untracked `.claude/` + two untracked `captures/eulerian-smoke-stack-d/`
`taylor-green-128cube-seed42-step500.{h5,json}` files — not load-bearing for
plan-drafting). `0fa284d` is the `common-warp-bootstrap` Stage-2 SHA-backfill
(post-landing). No drift since the coordinator handoff anchor → **Hard Rule 2
HEAD-drift condition NOT triggered.**

| Anchor | Coordinator-believed | HEAD-verified (`sha256sum` / `git`) | Match? |
|---|---|---|---|
| HEAD | `0fa284d` | `0fa284d64e770d7ca3f18899b2221f9abc98281d` | **FACT — identical** |
| `docs/conventions/sub-phase-conventions.md` | post-§L.5 | `49c90fc28117732e47bd64ff1c5ee9b25e5d6a499ba71bbf9d56d25e0dbe0d74` | **FACT — verified at HEAD** |
| `docs/conventions/cross-stack-equivalence-methodology.md` | post-§6 R-P2 | `61350ee47600f9d26f53f4e3fb0525b1099702ad91eecf27d0103c1c76d1da87` | **FACT — verified at HEAD** |
| `docs/architecture.md` (spec anchor) | (carried) | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **FACT — unchanged since MPM-D probe** |
| Workspace members | 20 | 20 (`pyproject.toml`: 3 tools + 10 Phase-1 sims + common-py + 5 Stack-D + common-warp) | **FACT — identical** |
| Replay invariant | `9399fc33…718909f34` (40th) | `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (common-warp landing evidence) | **FACT — HELD** |
| Integrity baseline | `c19492ad…d22cb52` (9 sub-phases) | `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` | **FACT — baseline-MATCH** |
| `common-warp` § 1.9.1 socket | verbatim | see § 3 ITEM-3 (verified verbatim) | **FACT — no drift** |

**Convention C** (probe API surfaces; verbatim citations): common-warp § 1.9.1
socket signatures, the Phase-1 MPM reference surface, and Warp atomic-op
behaviour are cited verbatim from HEAD source / the common-warp Stage-0
evidence / the Warp 1.13.0 docs (§ 3 + § 5 + § 6).

**Convention D** (probe call sites): how MPM Stack-D consumes common-py's
`taichi_harness` (`set_taichi_deterministic` + `run_twice_and_diff`) informs how
MPM Stack-E consumes common-warp's `warp_harness` (`set_warp_deterministic` +
`deterministic_context` + `assert_deterministic_run`). The hello smoke example
(`common/common-warp/examples/hello/`) is the reference consumer pattern.

**Convention A** (additive-only): the implementation stages add a NEW package
(`packages/mpm-multimaterial-stack-e/`) + a NEW capture dir
(`captures/mpm-multimaterial-stack-e/`) + a NEW workspace member; existing files
are touched only where additive (root `pyproject.toml` member list,
`docs/perf-ledger.md` row, `equivalence.md` additive section). **No
tolerance.toml edit** (§ 4 D7 — the override already exists).

---

## § 3. Believed-state reconciliation (dispatch SECTION 1 items)

### Repo anchors — CONFIRMED
All anchors match (§ 2 table). Cumulative shifts entering = **176** (FACT —
`common-warp-bootstrap` landing § 12: `165 → 176`; matches the dispatch
believed-state). NOTE: conventions `§ M` ("The 65 cumulative shifts inventory")
is a frozen Phase-1-era consolidation snapshot; the live count is carried
forward in the Phase-2 landing chain (152 → 158 → 165 [smoke] → 176
[common-warp]). This is by design, not drift.

### ITEM 1 — S6-trajectory-simulation discipline — APPLIED (load-bearing; see § 6)
Task 1.6 EXECUTED the Phase-1 `sim_runner_diagnostic(42, …)` at HEAD + a
fine-cadence 100-step extension. Verdict: **BOUNDED / rigid free-fall /
non-chaotic** (max field-value growth is linear free-fall, NOT exponential;
Lyapunov ≈ 0). Full result in § 6.

### ITEM 2 — Atomic-scatter substantive exercise — RE-CONFIRMED (present-but-not-exercised)
The canonical is the SAME `drop-impact-128cube-seed42-step500` Stack-D
consumed; Task 1.6 re-confirms the methodology `§ 5.1` finding (rigid free-fall
→ `F=I` → zero neo-Hookean stress → near-uniform velocity → order-independent
P2G sums). Warp's CPU-mode atomic-scatter is **doubly-disarmed** vs Taichi: (a)
the canonical regime carries no non-trivial reorderable sums, AND (b) Warp's CPU
`wp.launch` is single-threaded serial (§ 5 D5; no `cpu_max_num_threads=1`
equivalent needed). Methodology `§ 5.1` PRESENT-but-NOT-EXERCISED framing is
reusable verbatim.

### ITEM 3 — common-warp consumption pattern — RESOLVED (warp.md § 6 prediction corrected)
HEAD-verification of (a) the Phase-1 reference data-structure usage and (b) the
common-warp § 1.9.1 surface yields the consumption table below. `docs/common/
warp.md` § 6 predicts MPM "consumes the most of the surface — `Particles`,
`HashGrid`, `ScalarField3D`." **This is corrected at HEAD:** MPM Stack-E consumes
the **socket** (Runtime + Capture + Determinism) substantively and does **NOT**
structurally consume the data-structure subsystems (Particles / Grids /
HashGrid).

| Subsystem | § 1.9.1 surface | MPM Stack-E consumption | Reason (HEAD-verified) |
|---|---|---|---|
| 1 Runtime | `init(device, deterministic)` | **YES — substantive** | `init("cpu", True)` device pin (D4 bit-exact CPU). |
| 2 Capture I/O | `Capture`, `write_capture`, `read_capture` | **YES — substantive (f64)** | gate-9 canonical capture. `writer.py` treats payload as `np.asarray(arr)` — **no f32 downcast**; the port supplies its own **f64** state dict (NOT the f32 `Particles`/`Grids` `to_capture_payload` helpers). |
| 3 Determinism | `set_warp_deterministic`, `deterministic_context`, `assert_deterministic_run`, `set_seed`, `get_seed` | **YES — substantive** | gate-10 / W-2-equivalent at `tolerance=0.0` (D14). |
| 4 Particles | `Particles`, `allocate_particles` | **NO — not structural** | `Particles` is f32-pinned (`positions/velocities: wp.array(dtype=wp.vec3)`, `masses: wp.float32`; `allocate_particles(n)` takes no dtype). MPM is **f64** (R-MPME-F64). Also the §1.9.1 docstring routes MPM-specific fields (`affine_C`, `F`, `material_id`, `stress`, `volume`) to "the MPM sim's own wrapper, NOT here." |
| 5 Grids | `ScalarField3D`, `VectorField3D`, `allocate_scalar_field`, `allocate_vector_field` | **NO — not structural** | f32-pinned (`ScalarField3D.data: wp.float32, ndim=3`; `VectorField3D.data: wp.vec3, ndim=3`). MPM's `grid_mass` (f64 scalar) + `grid_mom` (f64 vec) require f64 (R-MPME-F64). |
| 6 HashGrid | `HashGrid` (+ `query_radius`) | **NO — not used** | Phase-1 MPM uses a **fixed 27-cell stencil** (`base = floor(p/dx + 0.5) − 1`; 3×3×3 lex loop), NOT neighbor-search. No `wp.HashGrid` query. |

Net: 3 of 6 subsystems consumed substantively (the § 1.9.1 *socket*: Runtime,
Capture, Determinism). This is the **inheritance-contract validation** ITEM 3
requested; the precedent is warp.md § 6's own LBM note ("a `wp.array(dtype=
wp.float32, ndim=4)` directly … LBM-specific, not in common-warp … the rest of
the surface (Runtime, Determinism, Capture) applies"). MPM Stack-E is the
analogous case for an **f64** sim: stack-specific f64 arrays in the sim wrapper,
common-warp's socket for runtime/capture/determinism.

### ITEM 4 — IC-15 aspect assessment — RESOLVED (see § 6)
- **#1 R-P2 chaotic:** NOT-APPLICABLE (Task 1.6 BOUNDED; Lyapunov ≈ 0 — sharp
  contrast to smoke's positive-Lyapunov first instance).
- **#3 atomic-scatter:** PRESENT-but-NOT-EXERCISED (methodology § 5.1 reusable;
  doubly-disarmed under Warp CPU serial launch).
- **#5 iterative-solver:** NOT-APPLICABLE (explicit single-pass MLS-MPM; no
  Jacobi/Newton solve — unlike smoke's fixed-cap Jacobi).

### ITEM 5 — Banked-item sweep — see § 4 (no surprises)

### ITEM 6 — MPM Stack-D template — CONFIRMED (closest structural precedent)
Same sim source (`packages/mpm-multimaterial/`), same canonical descriptors,
same gate-14 LEFT-partner (`captures/mpm-ref/`); DIFFERENT target stack
(Stack-E Warp vs Stack-D Taichi) + consumption (common-warp `warp_harness` vs
common-py `taichi_harness`). The Stack-D charter (`docs/phases/
sub-phase-mpm-multimaterial-stack-d.md`) + probe are the § 1–§ 12 structural
template, with **Warp deltas** explicit (§ 5).

---

## § 4. Banked-item enumeration sweep (ITEM 5; full table)

(FACT — `common-warp-bootstrap` landing § 8 roll-up [most recent] + the per-port
landings. No surprise items.)

| Banked item | Origin | Disposition for this sub-phase |
|---|---|---|
| LFS-architecture sub-phase (D13) | ongoing | **STAY-BANKED.** Remote-CI red per LFS-bandwidth; local verification unaffected. |
| LBM `sim_runner_diagnostic` cosmetic | LBM | **STAY-BANKED.** Not MPM-related. |
| actionlint installation; check-yaml hook coverage; supply-chain-pin migration (other 3 actions) | CI-action | **STAY-BANKED.** Tooling-improvement scope. |
| Phase-1-canonical re-characterization question | smoke landing | **STAY-BANKED.** Not addressed; Task 1.6 (re)characterized MPM's canonical regime as a side effect (BOUNDED). |
| manifest-equality smoke test (D7 deferred) | LBM/smoke | **STAY-BANKED / DEFER** (D9; LBM-side representative test covers the convention surface; Stack-D deferred too). |
| mypy --strict warp partial-stub errors | common-warp 1c | **STAY-BANKED.** Pre-existing on the warp partial-stub surface; not a landing gate. The MPM Stack-E package inherits the same `[[tool.mypy.overrides]] ignore_missing_imports` pattern (warp + testkit modules). |
| blanket `-W error` vs per-package-config tension (N1) | common-warp 1b/2 | **STAY-BANKED / honor.** Stage-2 portfolio sweep certifies each package under ITS OWN pytest config (Convention M); do NOT apply a blanket `-W error` CLI flag across packages. |

**No surprise banked items surfaced** (D11).

---

## § 5. MPM Stack-E port-specific risk surface (R-MPME*)

| Risk | Description + HEAD disposition |
|---|---|
| **R-MPME1** atomic-scatter under Warp CPU mode | **LOW.** Warp CPU `wp.launch` executes serially over the launch dimension in a single thread (the structural analog of Taichi `cpu_max_num_threads=1` / numba `parallel=False`); `wp.atomic_add` is order-deterministic → bit-exact run-to-run. Empirically verified at `common-warp-bootstrap` Stage-0 (6/6 bit-identical `24d44c7e…0746f314`; the verification kernel exercised `wp.atomic_add` specifically) and corroborated by Warp 1.13.0 docs (CPU kernels "executed in serial"). No `cpu_max_num_threads=1` equivalent needed (D5). Stage-0 R-A1 re-verifies with the MPM-specific P2G scatter kernel. |
| **R-MPME2** P2G/G2P transfer determinism | **LOW.** f64 accumulators seeded `wp.float64(0.0)` (banked #7 / O-W7); pure-literal kernel constants (e.g. APIC `4/dx²`, B-spline weights) seeded `wp.float64(…)` per the `§ L.4` pure-literal extension (Warp infers bare literals as f32). Serial CPU launch + f64 seeds ⇒ bit-exact. |
| **R-MPME3** multi-material constitutive dispatch under `@wp.kernel` | **N/A-effectively.** The canonical is **single-material** (`material_id` all-0; neo-Hookean only — methodology § 5.3). No multi-material branch is exercised; the constitutive "dispatch" is a single neo-Hookean stress path. (`@wp.kernel` supports `wp.where`/conditionals if a future multi-material variant is added — out of scope.) |
| **R-MPME4** S6 canonical-trajectory verdict | **BOUNDED** (Task 1.6, § 6). gate-14 predicted `within_tolerance=True` with a large margin (cf. Stack-D's ~24-order margin; `particle_pos` BIT-EXACT). Cross-stack pair is f64-NumPy+numba ↔ f64-Warp-CPU (a second backend, distinct from Taichi). |
| **R-MPME5** IC-15 aspect engagement | **#3 present-but-not-exercised; #1/#5 N/A** (§ 6 / D8). Same aspects as Stack-D; likely no methodology amendment beyond an optional additive note that § 5.1 is **stack-portable** (re-confirmed on a second backend). |
| **R-MPME6** common-warp consumption (FIRST Stack-E port; inheritance-contract validation) | **MEDIUM — load-bearing design surface.** See § 3 ITEM-3: Runtime + Capture + Determinism consumed substantively; Particles/Grids/HashGrid NOT structurally consumed. warp.md § 6 prediction corrected. Drives D10 + D15. |
| **R-MPME-F64** (surfaced) precision posture | **MEDIUM.** common-warp Particles/Grids are **f32-pinned**; the MPM cross-stack reference + determinism contract are **f64**. The port must use its OWN `wp.array(dtype=wp.float64)` for particle state (pos/vel/mass/affine_C/F/stress/volume) + grid (`grid_mass`, `grid_mom`), per warp.md § 6's LBM-precedent of stack-specific arrays. Using the f32 helpers would shrink the gate-14 margin from ~1e-28 to ~f32-round-off (~1e-7) and downgrade the spec-declared f64 contract. **Stage-0 confirms f64 wp.arrays + capture preserves f64** (writer treats payload as `np.asarray`, no downcast — verified at HEAD). Drives D15. |
| **R-MPME-CAP** capture cadence + scope | **LOW** (carried). Canonical `drop-impact-128cube-seed42-step500`: 128³ grid, 1M particles, 500 steps, cadence-50 (11 frames). Stage-0 Task 0.4 scope-analysis (conventions § N) re-estimates wall-clock for the Warp-CPU stack (Stack-D Taichi was 360.773 s; numba ref 158.052 s; Warp-CPU TBD). Schema-corpus entry ≤ ~256 MiB bound (methodology § 5.4 representative-subset) — same as Stack-D's 195 MiB first-2-frames. |

---

## § 6. IC-15 stress-test assessment + Task 1.6 S6-simulation result (LOAD-BEARING per § L.4)

### Task 1.6 — S6-trajectory-simulation (READ-ONLY execution of Phase-1 HEAD surface)

Executed `mpm_multimaterial.sim.sim_runner_diagnostic(42, …)` (the literal §L.4
mandate: 16³ grid, 5K particles, 50 steps, cadence-10) + a fine-cadence
extension via `_evolve_to_step_states(grid_n=16, n_particles=5000, n_steps=100,
capture_interval=1, dt=1e-4, seed=42)` (read-only consumption; no source edit;
no committed artifact). The diagnostic ran in **0.222 s** wall (post-numba-JIT);
manifest `determinism.claimed="bit-exact-same-hw"`, `atomic_ops=False`,
`sim={name: mpm-multimaterial, category: hybrid-pg, variant:
mls-mpm-hu-2018-multimaterial}`.

**Max-field-value growth (fine-cadence 100-step run; floor plane z = 4/16 = 0.25;
blob center z0 = 0.65):**

| step | max\|pos\| | min pos_z | max\|vel\| | max\|grid_mom\| | health | mom_drift |
|---|---|---|---|---|---|---|
| 0 | 7.984105e-01 | 5.016419e-01 | 2.000000e+00 | 0.0 | 0.0 | 0.0 |
| 1 | 7.982104e-01 | 5.014418e-01 | 2.000981e+00 | 3.731215e-02 | 0.0 | 9.810000e-04 |
| 10 | 7.964051e-01 | 4.996365e-01 | 2.009810e+00 | 3.760956e-02 | 0.0 | 9.810000e-03 |
| 50 | 7.882854e-01 | 4.915169e-01 | 2.049050e+00 | 3.885647e-02 | 0.0 | 4.905000e-02 |
| 100 | 7.779151e-01 | 4.811465e-01 | 2.098100e+00 | 4.011679e-02 | 0.0 | 9.810000e-02 |

**Growth-rate / boundedness analysis (`max|vel|`):**
- step-1 = `2.000981`; step-100 = `2.098100`; ratio = `1.048536`; per-step
  exponent `ln(v100/v1)/99 = 4.79e-04 /step`.
- step-100 `max|vel| = 2.098100` **EXACTLY matches** analytic free-fall
  `|−2.0 + (−9.81)·t|` at `t = 100·1e-4 = 0.0100 s` = `2.098100`.
- lowest particle z evolves `0.5016 → 0.4811`; the **floor plane (0.25) is never
  reached** (and at the full canonical 500-step horizon, t = 0.05 s, the blob
  falls only ~0.11 from z0 = 0.65 → ~0.54, still far above the 128³ floor at
  `4/128 = 0.03125`).
- `max|grid_mom|` grows linearly `0.0373 → 0.0401` (~7.5% over 100 steps, just
  gravity adding downward momentum); health all-zero (no NaN/Inf); momentum
  drift = exactly `|g|·t·m_total` (`9.81·0.01·1 = 0.0981`) — gravity-only.

**Chaotic-regime characterization: BOUNDED (rigid free-fall; non-chaotic).** The
growth is **linear** (free-fall under constant gravity), NOT exponential.
Lyapunov estimate ≈ 0 (no sensitive-dependence amplification). This is the
inverse of smoke (positive-Lyapunov, exponential blow-up `0.999 → 8.1e7 →
5.1e19`). It re-confirms — empirically, on a second occasion — the methodology
`§ 5.1`/`§ 5.3` characterization: `F=I` → zero neo-Hookean stress → near-uniform
velocity field; single-material (`material_id` all-0).

### IC-15 aspect engagement verdict

| Aspect | Verdict | Basis |
|---|---|---|
| **#1 R-P2 chaotic-regime escape-hatch** | **NOT-APPLICABLE** | Task 1.6 BOUNDED; Lyapunov ≈ 0. gate-14 expected `within_tolerance=True`; the escape-hatch (methodology § 6) does NOT apply. The "prior pairs' margins don't auto-inherit; assess empirically" note (§ 6 preamble) is honored — assessed, BOUNDED. |
| **#3 atomic-scatter** | **PRESENT-but-NOT-EXERCISED** | P2G uses `wp.atomic_add` (present), but the rigid-free-fall canonical produces order-independent sums (methodology § 5.1). Doubly-disarmed under Warp CPU serial launch. |
| **#5 iterative-solver chaotic amplification** | **NOT-APPLICABLE** | Single-pass explicit MLS-MPM; no Jacobi/Newton solve (cf. smoke's fixed-cap Jacobi #5). |

**IC-15 disposition lean (D8):** PARTIAL HOLDS. MPM Stack-E engages exactly the
same aspects as MPM Stack-D (#3 present-but-not-exercised; #1/#5 N/A), now on a
SECOND backend (Warp). No methodology promotion partial→full (premature; #1/#3/#5
still un-stress-tested). Optional additive Stage-2 note: methodology § 5.1's
atomic-scatter-present-but-not-exercised pattern is **stack-portable** —
re-confirmed at the same canonical regime on Warp's CPU serial launch. Exact
disposition deferred to Stage 2 (D5-analog).

---

## § 7. Phase-1 MPM surface mapping (canonical captures; gate-14 consumption)

(FACT — `git ls-files` + `.gitattributes` LFS filter at HEAD.)

- **gate-14 LEFT-partner (reference; sealed):**
  `captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` — PRESENT at
  HEAD, LFS-tracked (`captures/**/*.h5 filter=lfs`). `sim.name="mpm-multimaterial"`,
  `sim.category="hybrid-pg"`, `variant="mls-mpm-hu-2018-multimaterial"`. (The
  dispatch names `packages/mpm-multimaterial/` as the LEFT-partner *package*; the
  actual gate-14 capture artifact is `captures/mpm-ref/` — the `-ref` suffix
  convention. D6 confirmed.)
- **gate-14 RIGHT-partner (this port, to be produced at Stage 1b):**
  `captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.{h5,json}`.
  Per warp.md § 6 step 5, the port capture sets `sim.name="mpm-multimaterial"` +
  `sim.category="hybrid-pg"` (matching the cross-stack partner) so
  `compare_captures` produces a field-by-field verdict (not a
  `sim:category-mismatch` HARD_FAIL).
- **Descriptor fields (stack-agnostic):** `particle_pos` (f64), `particle_vel`
  (f64), `particle_material_id` (i32), `grid_mom` (f64).
- **gate-14 mechanics (HEAD-verified `tools/testkit/equivalence/harness.py`):**
  `compare_captures(LEFT=reference, RIGHT=port)` resolves the tolerance category
  from the **LEFT manifest's `sim.name` + `sim.category`**
  (`tools/testkit/equivalence/harness.py:93`); the RIGHT manifest must AGREE on
  `sim.category` (`tools/testkit/equivalence/harness.py:104`); the resolve call
  passes the LEFT manifest's name (`tools/testkit/equivalence/harness.py:118`).
  With
  LEFT `sim.name="mpm-multimaterial"`, `_resolve_tolerance` hits
  `[overrides.mpm-multimaterial] category="mpm"` → `relative=1e-4, absolute=0.0`.
  **The override already exists** (Stack-D Stage 1c) → Stack-E reuses it; **no new
  tolerance.toml row needed** (D7).

---

## § 8. Naming proposal (D1)

Lean: **`sub-phase-mpm-multimaterial-stack-e`** (package
`packages/mpm-multimaterial-stack-e/`; captures
`captures/mpm-multimaterial-stack-e/`; module `mpm_multimaterial_stack_e`).
Mirrors the prior 5 ports' full-name pattern (conventions § C.1; CONFIRMS the
dispatch). D1 for operator routing.

---

## § 9. D-class question enumeration (surfaced; NOT pre-committed)

| D | Question | Lean |
|---|---|---|
| **D1** | Canonical sub-phase name | `sub-phase-mpm-multimaterial-stack-e` (§ 8). CONFIRM. |
| **D2** | Stage decomposition | Same as MPM Stack-D: plan-drafting + Stage 0 + 1a + 1b + 1c + Stage 2 (charter § 2). Task 1.6 surfaced NO compression reason. Note: Stage 1c's MANDATORY tolerance-override-add step **collapses to a verification-only no-op** (D7). |
| **D3** | S6-simulation verdict (NEW REQUIRED) | **BOUNDED / rigid free-fall / non-chaotic** (§ 6; empirical). |
| **D4** | Atomic-scatter substantive exercise | SAME finding as Stack-D — present-but-not-exercised (methodology § 5.1 reusable). Warp CPU serial launch + rigid-free-fall canonical doubly-disarm. |
| **D5** | `cpu_max_num_threads=1` Warp analog | **N/A — no knob needed.** Warp CPU `wp.launch` is structurally single-threaded serial → `wp.atomic_add` deterministic (verified common-warp Stage-0; Warp docs corroborate). Stage-0 re-verifies the MPM P2G kernel. |
| **D6** | Canonical captures inheritance (gate-14 LEFT) | CONFIRMED — `captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` PRESENT + LFS-tracked; same descriptors; stack-agnostic per § 1.9.3. |
| **D7** | Tolerance category | **REUSE `[overrides.mpm-multimaterial]` category="mpm"; NO new override row.** FIRST cross-stack port needing no tolerance.toml edit (2nd port for an already-overridden sim; `compare_captures` keys on the LEFT/reference `sim.name`). |
| **D8** | IC-15 aspect engagement verdict | #3 present-but-not-exercised; #1/#5 N/A (§ 6). Same aspects as Stack-D → likely NO methodology amendment (optional additive stack-portability note at Stage 2). |
| **D9** | Methodology-precedent #14 (manifest-equality) | **DEFER** (LBM-side representative test covers the surface; Stack-D deferred too). |
| **D10** | common-warp consumption pattern (FIRST Stack-E port) | Subsystems **1 Runtime + 2 Capture + 3 Determinism** substantive; **NOT** 4 Particles / 5 Grids / 6 HashGrid (§ 3 ITEM-3). warp.md § 6 prediction corrected. |
| **D11** | Surprise banked items | NONE (§ 4 sweep clean). |
| **D12** | Optional non-phase point-release tag | **NO TAG** (consistent with all spec-Phase-2 precedent; § D.2 forbids `-phase-N`). |
| **D13** | CI-red LFS-bandwidth state | **Record known-banked; no action.** |
| **D14** | Determinism posture | **`tolerance=0.0`** (CPU `bit-exact-same-hw`; D4 contract). GPU mode out-of-scope. |
| **D15** *(new)* | f64 storage strategy (R-MPME-F64) | **(a) Own `wp.array(dtype=wp.float64)` sim-state arrays** (warp.md § 6 LBM-precedent of stack-specific arrays; preserves f64 cross-stack parity + the spec f64 determinism contract) — RECOMMENDED. Alternatives: (b) common-warp f32 Particles/Grids (accept ~1e-7 cross-stack margin; precision downgrade; risk); (c) §1.9.1 f64 amendment (OUT-OF-SCOPE; founder-confirmed per Rule W1). |
| **D16** *(new)* | warp.md § 6 prediction correction (HashGrid + Particles + ScalarField3D) | **Note the discrepancy; NO edit at plan-drafting** (boundary: do not touch common-warp docs). MPM Stack-E does NOT use HashGrid (fixed 27-cell stencil) nor the f32 Particles/Grids. A future common-warp doc-correction is operator-routable; this probe documents the corrected consumption for the charter. |

---

## § 10. Discrepancies and observations not fitting elsewhere

1. **warp.md § 6 MPM-consumption prediction corrected (load-bearing).** The
   bootstrap-era guide predicted MPM "consumes the most of the surface —
   `Particles`, `HashGrid`, `ScalarField3D`." HEAD-verification of the Phase-1
   reference (fixed 27-cell stencil; f64; MPM-specific per-particle fields) and
   the common-warp f32-pinned data structures shows MPM Stack-E consumes the
   **socket** (Runtime + Capture + Determinism), not the data-structure
   subsystems. This is the expected outcome of the FIRST substantive consumption
   validating the inheritance contract (analogous to MPM Stack-D's D7
   falsification of a dispatch premise) — surfaced, not silently absorbed.

2. **f32/f64 precision mismatch (R-MPME-F64).** common-warp's Particles + Grids
   pin f32 (`wp.vec3`/`wp.float32`); MPM's cross-stack reference + determinism
   contract are f64. Resolution: the port uses its own f64 `wp.array`s
   (warp.md § 6 LBM-precedent). Verified at HEAD that common-warp's `write_capture`
   is dtype-preserving (`np.asarray`, no downcast) so Subsystem-2 Capture I/O is
   f64-consumable.

3. **Tolerance-override reuse (D7).** Unlike all 5 prior Stack-D ports (each the
   FIRST port for its sim → each ADDED a new `[overrides.<sim>]` at Stage 1c), MPM
   Stack-E is the SECOND port for `mpm-multimaterial` → the override already
   exists. Stage 1c's MANDATORY override-add step collapses to a verify-only no-op
   — a structural simplification of the Stack-D template.

4. **Capture path convention.** gate-14 LEFT-partner is `captures/mpm-ref/`
   (the `-ref` suffix for Phase-1 reference captures), not `captures/mpm-multimaterial/`
   (which does not exist). The dispatch's "packages/mpm-multimaterial/ … LEFT-partner"
   refers to the source *package*; the *capture artifact* is `captures/mpm-ref/`.

5. **Determinism-strategy port mapping (Convention D).** The Stack-E `sim.py`
   determinism docstring mirrors Stack-D's 6-clause structure with Warp
   substitutions: (1) Warp CPU serial launch (no `cpu_max_num_threads=1` knob)
   replaces Taichi's explicit pin; (2) `wp.float64(0.0)` accumulator seeds +
   pure-literal `wp.float64(…)` constants (banked #7 / O-W7 / §L.4) replace
   `ti.f64(…)`; (3) fixed 27-cell lex stencil via per-thread loops in `@wp.kernel`
   (with `wp.tid()` linear index) replaces `ti.ndrange`; (4) the host-side numpy
   `default_rng(seed)` blob sampler is stack-agnostic (ported verbatim — Warp's
   own `wp.rand_init` is NOT used for the IC); (5) same-stack posture
   `bit-exact-same-hw` at `device="cpu"`; (6) GPU-arch + parallel-scatter + FMA +
   multi-material deferred.

6. **Plan-drafting shifts surfaced at this probe:** see plan-drafting landing
   (S-ME* enumeration).

---

*End of plan-drafting probe. Authoritative for the Phase-1 baseline (§ 6 S6
read + Task 1.6 simulation), common-warp § 1.9.1 consumption (§ 3 ITEM-3), the
tolerance/capture mechanics (§ 7), the R-MPME* risk surface (§ 5), and the
D1–D16 surface (§ 9). Read FIRST before the charter.*

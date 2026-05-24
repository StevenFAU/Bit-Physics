---
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-d-plan-drafting
stage: plan-drafting-probe
phase: phase-2
head_sha: <COMMIT_1_SHA_PENDING>
head_sha_at_checkpoint: 6d47d9177d0ec216bc3f2f1ae629349abcbcf2a4
date: 2026-05-24T16-30-00Z
verdict: probe-complete
---

# Plan-drafting probe — sub-phase-eulerian-smoke-stack-d

> FIFTH per-sim cross-stack port under spec-Phase-2. Ports `eulerian-smoke`
> from its Phase-1 implemented reference (`stack.name="numpy-reference"`) to
> Stack-D (Python / Taichi-DSL / CPU). FIFTH cross-stack pair for the IC-15
> PARTIAL-formalization methodology (`8c760383…`); the **canonical candidate
> to stress-test the deferred iterative-solver aspect (#5)** — Jacobi
> pressure-projection is the first multi-sweep iterative solver to appear in a
> cross-stack-validated trajectory.
>
> Probe authored per the **S6 banked methodology-precedent** (read Phase-1
> `sim.py` + `reference/stable_fluids.py` at HEAD — not just the spec sheets —
> to characterize what behaviour the cross-stack port actually validates).
> Every path / SHA / sha256 / spec-section / classification below is
> HEAD-verified at `6d47d91`. **Three dispatch framings are corrected at HEAD**
> (see § 0 + § 5 + § 6): the canonical 3D trajectory uses PLAIN semi-Lagrangian
> (not MacCormack); the grid is collocated cell-centered (there are NO
> face-centered velocities — MAC-staggered is deferred to Stack-C); vorticity
> confinement is PRESENT-but-NOT-EXERCISED (`vorticity_eps = 0.0`).

---

## § 0. Anchor verification (Convention M re-anchor)

HEAD at probe = `6d47d9177d0ec216bc3f2f1ae629349abcbcf2a4` (branch `main`,
working tree clean except untracked `.claude/`). `6d47d91` is the post-hotfix
landing of `sub-phase-ci-action-hotfix-setup-uv-v8-pin` (back-fill of the
closing-audit SHA); NOT part of any per-sim sub-phase.

| Anchor | Dispatch-referenced | HEAD-verified (sha256sum) | Match? |
|---|---|---|---|
| `docs/conventions/sub-phase-conventions.md` | `4ac8341a…037e0b` | `4ac8341a6cda45016c4e157823a3b5d2b2bd92d185ad367e1a7143c8ec037e0b` | **FACT — identical** |
| `docs/architecture.md` | (carried; MPM-verified `e82b7b8e…`) | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **FACT — identical** |
| `docs/conventions/cross-stack-equivalence-methodology.md` | (post-MPM §5) | `8c760383bf5626c84ead49ee3b7e2ad9bbac17e09eeed055b4913fc5783c0d8f` | **FACT — verified at HEAD** |

The conventions anchor matches the dispatch verbatim. The architecture anchor
is unchanged from MPM-probe (`e82b7b8e…`). The methodology doc has advanced
since MPM-probe (`3c2149f6…` → `8c760383…`) because MPM Stage 2 landed the D5
(b) additive §5 (fourth-pair refinements) — this is the **current** baseline
this sub-phase consumes AS-IS (5 codified + §4 LBM + §5 MPM + 5 deferred + §6
References). This sub-phase's plan-drafting does NOT amend conventions /
architecture / methodology.

**Cumulative shift count entering:** **152** (FACT — `ci-action-hotfix` and
`ci-action-migration-and-banked-cleanup` landing/commit bodies: 146 → 152;
hotfix shift H1 documented, not cumulated per § M.6). Carried by reference.

**Workspace member count:** **18** (HEAD-verified `pyproject.toml`
`[tool.uv.workspace].members`): `tools/{testkit,integrity,diagnostics}` +
`common/common-py` + 10 Phase-1 sim packages + 4 Stack-D ports = 18. Matches
dispatch "18 (14 Phase-1 + 4 Stack-D ports)".

**Replay / integrity invariants (carried by reference; Stage-0 Task 0.0
re-verifies):** bit-identity replay invariant `9399fc33…18909f34` (HELD 28th+
per hotfix commit body); integrity sweep baseline `c19492ad…cb52` (byte-
identical streak). Plan-drafting does NOT run replay or the integrity sweep;
these are re-verified at Stage-0 replay per § D.3.

**Spec § 11.3 cross-stack port enumeration (HEAD-verified —
`docs/architecture.md`):**
```
1995:- **2.4** Smoke to Stack D and Stack E.
```
**Smoke = item 2.4 = "Smoke to Stack D and Stack E" — the Stack-D arm IS
enumerated** (unlike MPM's item 2.3 "MPM to Stack E (Warp port)", whose
Stack-D arm was wholly absent — MPM-probe S-M1). This sub-phase does the
**Stack-D half** of item 2.4; the Stack-E (Warp) half is deferred to a later
sub-phase (common-warp matures at § 11.4). **Smoke Stack-D is therefore a
clean spec-mandated port — no §11.3-enumeration drift** (a CONFIRM, recorded
as S-S1; the favourable contrast to MPM's S-M1 also addresses the dispatch's
"is the MPM Stack-D non-spec port documented?" question — see § 3).

---

## § 1. Scope

The **FIFTH per-sim cross-stack port sub-phase under spec-Phase-2.** Takes the
Phase-1-frozen `eulerian-smoke` reference (Python NumPy; `stack.name=
"numpy-reference"`, `sim.category="volumetric-grid"`, `variant=
"stam-fedkiw-stable-fluids"`) and produces a content-equivalent Stack-D
(Python / Taichi-DSL / CPU) port through gates 4–14 of spec § 3.5 / Appendix
D.6 (13 stack-agnostic correctness gates + the Phase-2 14th gate of
cross-stack equivalence).

It is the **FIFTH validation pair for the IC-15 PARTIAL-formalization
methodology** and the **first cross-stack pair to put the deferred
iterative-solver aspect (#5) in play**: the Stam-Fedkiw Jacobi
pressure-projection runs a fixed `n_jacobi = 20` sweeps per step over both
canonical captures (3D 500-step + 2D 1000-step) and the gate-4 MMS
convergence study. (See § 6 for the nuance: the iteration *count* is fixed —
the determinism-threatening sub-aspect of #5 stays unexercised.)

In scope: the Stack-D Taichi implementation, the Stack-D spec sheet, the
probe report, failing-tests evidence, TWO canonical Stack-D captures
(taylor-green-128cube 3D + lid-driven-cavity-128sq 2D), the additive
`equivalence.md` extension, all 13 stack-agnostic gates GREEN (gate-4 carries
the **MMS arm ONLY** — no golden), TWO gate-14 cross-stack-equivalence
verdicts, the `[overrides.eulerian-smoke]` tolerance.toml entry, and the
convergence-file edits.

Out of scope: the Stack-E (Warp) half of item 2.4; any frontier flow-map
variant; any edit to the Phase-1-sealed `packages/eulerian-smoke/`; the
LFS-architecture sub-phase; the CI-red LFS-bandwidth-quota condition (§ 3
ITEM 4). Plan-drafting itself touches NO source / workflow / pyproject /
tolerance file (SECTION 7 boundary) — it ships probe + charter + landing +
SHA back-fill only.

---

## § 2. Convention C/D/M/A discipline at HEAD

**Convention M (re-anchor; HEAD wins on drift).** All anchors § 0 HEAD-verified.

**Convention C (API surfaces probed before drafting; verbatim citations).**
The Stack-D port consumes (HEAD-verified signatures):

- `common_py.determinism.set_taichi_deterministic(config: Config, *, arch: str = "cpu") -> None`
  (`common/common-py/src/common_py/determinism.py`). `Config` is a dataclass
  `{deterministic: bool = False, seed: int = 0}`. Pins `ti.init(arch=ti.cpu,
  random_seed=<seed>, cpu_max_num_threads=1, offline_cache=True)`. **It does
  NOT set `default_fp=ti.f64`** — the LBM § 4.1 / banked-precedent-#7 lesson:
  bare `0.0` kernel locals infer f32; in-kernel accumulators need explicit
  `ti.f64(0.0)` seeds (R-S1 below).
- Capture surface at **`tools/testkit/capture/`** (NOT `common_py.capture`):
  `CaptureManifest{schema_version, sim, stack, config, run, payload,
  determinism}`; `StepState{step, state: dict[str,np.ndarray], diagnostics:
  dict[str,float]}`; `write_capture(state_iter, manifest_meta, out_dir) ->
  Path`; `load_capture(manifest_path) -> Capture`. The Phase-1 smoke `sim.py`
  imports `from capture import CaptureManifest, StepState, write_capture` —
  the 4 prior Stack-D ports follow the same testkit import.
- `tools/testkit/equivalence/harness.py::compare_captures(left: Path, right:
  Path, tolerance_table_path: Path | None = None) -> EquivalenceVerdict`.
  Resolves tolerance via `_resolve_tolerance(table, sim_name, sim_category)`:
  checks `[overrides.<sim_name>]` first (uses its `category` field), else the
  manifest `sim.category`; **raises `KeyError` if `sim_category` is not a
  `[defaults.*]` key and no override exists**. `EquivalenceVerdict{
  within_tolerance, per_field_diff, tolerance_table_used}`. → smoke's
  `sim.category="volumetric-grid"` has NO `[defaults.volumetric-grid]` row →
  `[overrides.eulerian-smoke] category = "smoke"` is MANDATORY (D6 / § 9).
- `tools/testkit/determinism/harness.py::run_twice_and_diff(runner: SimRunner,
  seed: int = 42, tmp_dir: Path | None = None) -> DeterminismVerdict`
  (`{content_equivalent, detail}`). Consumed by gate-10.

**Convention D (call sites probed).** `grep` for `eulerian_smoke` /
`eulerian-smoke` across the workspace (excluding the Phase-1 package + audits):
referenced only in `pyproject.toml` (workspace member), CHANGELOG,
`docs/perf-ledger.md`, `docs/dependencies.md`, `docs/architecture.md`,
`common/common-py/src/common_py/vdb.py` (a docstring/scope mention — NOT a
runtime import), and prior phase/sub-phase plans. **No sim or runtime module
imports `eulerian_smoke`** — it is consumed only by its own tests + canonical-
capture generation. The Stack-D port is a sibling consumer of the same
`tools/testkit/capture` + `common_py` surfaces; it does NOT import the Phase-1
package (the gate-14 partner is the Phase-1 *capture*, loaded via
`load_capture`, not the Phase-1 code).

**Convention A (additive-only; new files first).** New package
`packages/eulerian-smoke-stack-d/`; new spec sheet `spec-ref-stack-d.md`; new
captures dir `captures/eulerian-smoke-stack-d/`. The PRE-EXISTING
`equivalence.md` stub + `tolerance.toml` are EXTENDED additively at Stage 1c
(preserve existing tables/comments). No Phase-1-sealed code touched.

---

## § 3. Believed-state reconciliation (per dispatch SECTION 1)

| Item | Verdict | HEAD evidence |
|---|---|---|
| **Repo anchors** (HEAD `6d47d91`; conventions `4ac8341a…`; 18 members; 152 shifts; bit-identity `9399fc33…`; integrity `c19492ad…`) | **CONFIRMED** | § 0 — conventions sha256 identical; 18 workspace members enumerated; 152 from hotfix commit bodies; invariants carried by reference (Stage-0 re-verifies). |
| **Next port** (eulerian-smoke → Stack-D; spec § 11.3 item 2.4 first half) | **CONFIRMED** | Phase-1 source at `packages/eulerian-smoke/`; spec line 1995 enumerates "Smoke to Stack D and Stack E"; this sub-phase does the Stack-D half. |
| **MPM Stack-D non-spec-§11.3 observation** | **DOCUMENTED — banked; no action** | MPM-probe § 0 (S-M1) + MPM charter § 1.1 / § 1.4 / § 11.2 already document that MPM→Stack-D is a systematic-program extension (item 2.3 is Stack-E-only; LBM landing § 14 names MPM as the remaining Phase-2 port). It is NOT undocumented. Smoke contrasts favourably: smoke Stack-D **is** spec-§11.3-item-2.4-enumerated (S-S1). No surfacing required beyond this note. |
| **ITEM 1 — S-2.1 Stack-D taichi-SyntaxWarning filterwarnings gap** | **CONFIRMED at HEAD → lean FOLD (D3)** | All 4 prior ports' `pyproject.toml` `[tool.pytest.ini_options].filterwarnings` carry only `["error", "ignore::DeprecationWarning:taichi.*", "ignore:.*locale\\.getdefaultlocale.*:DeprecationWarning"]` — **no `SyntaxWarning` filter** (verified verbatim in all 4). The new smoke port MUST include `ignore::SyntaxWarning:taichi.*` natively; the 4 existing ports' retrofit is the FOLD candidate (4 single-line additive edits). The sub-phase's portfolio regression sweep (§ B.7) exercises the gap (cold-`.pyc` recompile). |
| **ITEM 2 — LBM `sim_runner_diagnostic` cosmetic** | **STAYS BANKED** | n/a — smoke is a different package; no fold path. (Observation: smoke's own `sim_runner_diagnostic` uses the analytic Taylor-Green IC, so its `seed` is unused-by-construction — like LBM's analytic ICs, UNLIKE MPM's stochastic blob. Smoke is NOT in the LBM/MPM banked-defect scope, and analytic-IC seed-independence is correct behaviour, not a defect.) |
| **ITEM 3 — actionlint / check-yaml / supply-chain-pin (other 3 actions)** | **STAYS BANKED** | n/a — orthogonal tooling; per `ci-action-hotfix` closing § STAYED-BANKED. |
| **ITEM 4 — LFS-architecture sub-phase** | **STAYS BANKED** | Operator-routed deferral. The current remote CI-red is **LFS download-bandwidth-quota exceeded** (not a code/methodology fault); all 21 LFS objects are present locally (`git lfs ls-files` → 21/21 smudged), so local verification + replay are unaffected. Documented as a known-banked condition (D10-adjacent); no fix attempted. |
| **ITEM 5 — full banked-item sweep** | **CONFIRMED — no surprise blockers** | § 4 full table. |

---

## § 4. Banked-item enumeration sweep (ITEM 5)

`grep -rln "BANKED" docs/_audits/phase-2/ docs/_audits/phase-1/` over all
landing/closing audits. Consolidated dispositions (the recurring entries plus
the most-recent ci-action roll-up):

| # | Banked item | Origin | Disposition for THIS sub-phase |
|---|---|---|---|
| B-1 | **S-2.1 Stack-D taichi-`SyntaxWarning` filterwarnings gap** | ci-action landing § 8 / § 12 | **FOLD candidate (D3)** — HEAD-confirmed across all 4 ports; new smoke port includes the filter natively. |
| B-2 | **LBM/MPM `sim_runner_diagnostic`** seed/descriptor | capture-determinism-contract Stage-1 N1 | LBM-side STAYS BANKED (cosmetic, analytic ICs); MPM-side CLOSED-AS-NOT-A-DEFECT (MPM threads seed). **Smoke: out of scope** (different package; analytic-IC, not a defect). |
| B-3 | `actionlint` not installed; `check-yaml` hook `.github/workflows/` coverage; supply-chain immutable-pin migration for the other 3 actions (`checkout`/`setup-node`/`pnpm`) | ci-action Stage 1a + hotfix closing | STAY BANKED (orthogonal tooling). |
| B-4 | LFS-architecture sub-phase / current CI-red LFS-bandwidth-quota | operator-routed | STAYS BANKED (D10-adjacent; § 3 ITEM 4). |
| B-5 | Cat 3 sibling subdirs (`hybrid-pg`, `lattice`, `continuous-ca`); Cat 3 evaluator shims | § I.4 / § L.3 | **NO-OP for smoke** — smoke ships NO golden table (MMS-only; § 5 R-S4 / S-S4). No `_SUBDIRS_PICKED_UP` change (RD-3D precedent). |
| B-6 | MMS-runner-scaffolding generalization (RD-3D S2; "load-bearing for eulerian-smoke + LBM") | § L.2 item 6 | **LIVE but lean INLINE** (D-class) — LBM Stack-D inlined its MMS convergence study (`test_mms_convergence.py`); Phase-1 smoke inlined its own (Path-Y). The smoke Stack-D MMS test inlines similarly; the generalization stays banked (testkit-infra scope). |
| B-7 | RD-3D / sph-water / smoke / LBM / MPM per-file test-augmentation candidates (surviving mutants); manifest-equality fan-out (§ J.7 #14) | each landing § 9 + § J.7 | **DEFER** — testing-improvements scope. Smoke `sim.py` is the lowest-kill-rate manifest-builder in the portfolio (0.1707; § J.7); the strategy-(i) manifest-equality test (#14) landed as a representative-single-sim (LBM Phase-1), NOT a per-port fan-out. None of the 4 Stack-D ports added one. (D7 / § 9.) |
| B-8 | B17 mutation PATH-A vs PATH-B; `mls_mpm.py` mutation completion; DFSPH generator coverage | § J / Phase-1 banks | PATH-B re-bank lean (single-sim Taichi-DSL port); not the smoke port's deliverable. |
| B-9 | §B.6 `verify_evidence` LFS fix; mid-Phase-1 capture regeneration | audit-chain-correctness / taichi-integration | RESOLVED (IC-16, consumed) / UNCHANGED (no regeneration forced). |

**No surprise blockers.** Every banked item is either resolved/consumed,
orthogonal, NO-OP for smoke, or a forward-routable testing-improvements
candidate. The only live decisions touching this sub-phase are B-1 (D3 FOLD)
and B-6/B-7 (inline-MMS + defer-manifest-equality, both leans).

---

## § 5. Smoke port-specific risk surface (R-S*)

Read at HEAD: `packages/eulerian-smoke/eulerian_smoke/{sim.py (593 L),
reference/stable_fluids.py (565 L), invariants.py}`, `pyproject.toml`,
`tests/*.py`; `docs/sim-specs/volumetric-grid/eulerian-smoke/{spec-ref,
algebraic,determinism,equivalence}.md`; Phase-1 landing
`landing-2026-05-22T13-30-00Z.md`.

- **R-S1 — Iterative-solver amplification (Jacobi pressure-projection; the
  deferred IC-15 aspect #5 surface).** `project_pressure` /
  `project_pressure_3d` run a **FIXED `n_jacobi = 20` sweeps, NO
  tolerance-comparison early-stop** (the P24 pattern; `_DEFAULT_N_JACOBI = 20`
  per Stage-0 Task-0.4 scope-analysis at Phase-1). Exercised at BOTH canonical
  captures (3D 500-step, 2D 1000-step) AND the gate-4 MMS projection-arm
  convergence study. **First cross-stack pair to put a multi-sweep iterative
  solver in the trajectory.** *Mitigation:* f64 throughout with explicit
  `ti.f64(0.0)` accumulator seeds for any in-kernel reduction (the LBM § 4.1
  pattern; banked-precedent #7) — verify at Stage 0; the FIXED iteration count
  makes the sweep count identical across stacks, so the cross-stack delta is
  FP-accumulation over fixed sweeps, NOT iteration-count divergence (the
  determinism-threatening sub-aspect of #5 is structurally absent — § 6).
- **R-S2 — Advection scheme cross-stack (MacCormack at COLLOCATED
  cell-centered velocities; premise corrected).** `maccormack_advect_2d` is a
  predictor-corrector (`φ̂ = SL(+dt)`; `φ̌ = SL(φ̂,−dt)`; `φ^{n+1} = φ̂ +
  (φⁿ−φ̌)/2`; NO monotonicity limiter — intentionally omitted for the smooth
  MMS/Taylor-Green fields). **It is exercised ONLY in the 2D path** (the
  lid-driven-cavity velocity advection + the gate-4 MMS). The canonical 3D
  Taylor-Green capture uses **plain trilinear `semi_lagrangian_advect_3d`**
  (inside `stable_fluids_step_3d`), NOT MacCormack. The dispatch's "MacCormack at
  face-centered velocities" framing is corrected on both counts: MacCormack is
  2D-only, and **there are NO face-centered velocities** — the grid is
  collocated cell-centered; the MAC-staggered fix is explicitly deferred to
  the Phase-2+ Stack-C port (`_divergence_2d_periodic` docstring;
  `_lid_driven_cavity_initial_condition` is a periodic-BC approximation).
  *Mitigation:* port the predictor-corrector + lex (i,j) vertex ordering
  exactly; periodic wrap via `np.mod`-equivalent (NOT clip).
- **R-S3 — Vorticity confinement: PRESENT-but-NOT-EXERCISED (S6-tame; the
  methodology § 5.1 pattern).** `_vorticity_confinement_3d` implements the
  Fedkiw-2001 force `ε·(N×ω)·dx`, but `canonical_params_3d()` sets
  `vorticity_eps = 0.0`, and the function early-returns zeros when `eps==0.0`.
  → the confinement force is a **dead code path at the canonical capture**
  (directly analogous to MPM's atomic-scatter present-but-serialised, but even
  weaker — it is OFF, not merely serialised). *Mitigation:* the Stack-D port
  implements the code path (fidelity + the gate-6 `check_circulation`
  advisory) but gate-14 does not exercise it; document via the methodology
  § 5.1 "PRESENT-but-NOT-EXERCISED" pattern.
- **R-S4 — S6 banked-precedent (canonical trajectory algebraic surface vs spec
  dynamics; HEAD-verified per banked precedent #4).** The spec/algebraic.md
  describe the full Stam-Fedkiw pipeline (MacCormack advect → diffuse →
  vorticity-confine → Jacobi project → advect scalar); the canonical captures
  exercise a **subset**: (a) 3D = plain SL (no MacCormack); (b) MacCormack
  2D-only; (c) vorticity confinement OFF; (d) collocated grid (no MAC); (e)
  laminar regimes (Taylor-Green decaying vortex `∝ exp(−2νk²t)` at ν=0.01;
  lid-driven Re=100 steady-laminar) — NOT chaotic/turbulent; (f) Jacobi
  fixed-cap (P24-safe). This is the **"spec describes more than implementation
  does" two-instance pattern** (banked #13 / methodology § 5.3) — smoke
  extends the RD-3D / sph-water (rigid free-fall) / MPM (single-material)
  precedent. *Mitigation:* Stage 0/1 agents re-read both modules at HEAD; do
  NOT extrapolate from the LBM/MPM/sph shapes.
- **R-S5 — Atomic-scatter: NOT APPLICABLE.** `determinism.md` "Atomic
  scatter-add | No"; `sim.py` docstring clause 1 "No atomic scatter, no
  read-after-write hazard". The entire pipeline is elementwise NumPy
  (`np.roll`/`np.mod`/integer-index gather) → Taichi `ti.ndrange` per-cell
  stencil kernels. `determinism.atomic_ops = False`. Banked-precedent #8
  (`cpu_max_num_threads=1` for atomic-scatter) is not needed for correctness
  (though `set_taichi_deterministic` pins it anyway).
- **R-S6 (NEW) — S6 load-bearing (analogous to R-M5 / R-L5).** The Phase-1
  smoke characterization (this § 5) IS the empirical anchor for R-S1..R-S5 +
  D5 + the IC-15 disposition. Stage 0/1 agents re-read `sim.py` +
  `stable_fluids.py` at HEAD; smoke has TWO captures + MMS-only gate-4 + a dead
  vorticity path + a collocated grid — do NOT extrapolate from siblings.
- **R-S7 (NEW) — gate-4 MMS arm (inline vs generalize; B-6).** Smoke's gate-4
  is **MMS-ONLY** (spec-ref § 7 "No closed-form golden table"). The Stack-D
  MMS convergence study drives the Taichi 2D `stable_fluids_step` (MacCormack
  advect + Jacobi project) with the SHARED `incompressible_ns_2d` manufactured
  source (shift #18: LBM + eulerian-smoke share this MMS solution). *Mitigation:*
  inline the convergence study (LBM Stack-D `test_mms_convergence.py` + Phase-1
  smoke Path-Y precedent); the MMS-runner generalization stays banked.
- **R-S8 (NEW) — two-capture wall-clock (Stage-0 Task 0.4).** Phase-1
  reference: **691.587 s** (3D 128³×500, cadence-50, 704 MB) + **5.099 s**
  (2D 128²×1000, full cadence, 4.2 MB). The 3D capture is the heaviest non-SPH
  reference; Taichi-CPU at `cpu_max_num_threads=1` may be slower (serialised)
  or faster (JIT). *Mitigation:* Stage-0 Task 0.4 scope-analysis (smoke is
  NumPy-vectorized → the §N.5 over-shoot direction, ~1.45×); the diagnostic
  tier (32³×10) keeps gate-10 fast; instrument per the sph-water R-S3 precedent.

---

## § 6. IC-15 stress-test assessment (per dispatch SECTION 2)

The IC-15 PARTIAL doc (`8c760383…`) lists 5 DEFERRED aspects: #1 R-P2
chaotic-regime escape-hatch; #2 D8 comparison-projection axis; #3
atomic-scatter (MPM put it in play, §5); #4 lattice-velocity quantization (LBM
data-backed, §4); **#5 iterative-solver chaotic amplification** (unexercised
across all four prior pairs). Smoke's contribution:

| Aspect | Verdict | Rationale (HEAD-verified) |
|---|---|---|
| **#1 R-P2 chaotic** | **NOT-APPLICABLE at canonical** | Taylor-Green decaying vortex (smooth analytic decay envelope `∝ exp(−2νk²t)`, ν=0.01) + lid-driven Re=100 (steady-laminar) — neither is chaotic/turbulent. Tame, like all four prior pairs. Per SECTION 2 (a): the canonicals do NOT substantively stress chaos (the smoke analogue of MPM's "drop-impact ≈ rigid free-fall" S6 finding). |
| **#3 atomic-scatter** | **NOT-APPLICABLE** | No scatter anywhere (R-S5). |
| **#5 iterative-solver** | **APPLICABLE (FIRST pair) — but in determinism-SAFE fixed-cap form** | Jacobi pressure-projection runs at every step of both canonical captures + gate-4 MMS. Smoke is the **first cross-stack pair to put aspect #5 in play**. **Canonical-trajectory verdict:** the FIXED `n_jacobi=20` cap (no convergence-check early-stop; the P24 determinism pattern) means the sweep COUNT is identical across stacks → the cross-stack delta is FP-accumulation over 20 fixed sweeps × N steps, **NOT** iteration-count divergence. The "chaotic amplification" sub-aspect of #5 (variable iteration count tipping the convergence threshold) is **structurally absent** by design. Expected gate-14: `within_tolerance=True` at FP-round-off scale (the four-prior-pairs regime), at the 1e-4 `smoke` category (more headroom than LBM's 1e-5). |

**Per SECTION 2 (b)** the probe READ Phase-1 `sim.py` at HEAD (banked
precedent #4) — done (§ 5). **Per SECTION 2 (c)** the canonicals are tame
w.r.t. chaos (#1) and the iterative surface is exercised only in its
determinism-safe fixed-cap form: **lean continue with the current canonicals +
note the limitation** (D11 below). An augmented high-Re / turbulent capture
variant would stress #1 but is a D-class option, not the lean (consistent with
all prior precedent + § P.2 "existing committed captures stay as committed").

**Most-likely IC-15 disposition (D5): (b) PARTIAL HOLDS + REFINEMENT** — the
fifth pair validates the 5 codified components at a fifth physics family
(`volumetric-grid`/eulerian-grid) AND contributes the first empirical data on
deferred aspect #5 (iterative-solver FP-accumulation, fixed-cap form) →
warrants an additive §6 "iterative-solver FP-accumulation" subsection
(analogous to LBM §4.1 collision-step + MPM §5.1 scatter), reusing the §5.1
PRESENT-but-NOT-EXERCISED pattern for vorticity confinement and extending the
§5.3 S6 two-instance pattern. Promoting to FULL (a) stays premature: #1
(chaotic) is unexercised and #5's chaotic-amplification sub-aspect is
structurally absent (fixed cap). (d) substantive expansion is unwarranted (no
new R-class framework needed). (c) unchanged is too weak (there is new #5
data).

---

## § 7. Phase-1 smoke surface mapping (canonical captures → gate-14)

Phase-1 gates 4–13 GREEN (landing `landing-2026-05-22T13-30-00Z.md`; NO R-class
arcs — single-session Stage 1). Gate-4 = NS-2D MMS, observed OOA **1.99
(advection) + 2.00 (projection)**, both within ±0.5 of formal p=2. Mutation
kill: `sim.py` 0.1707, `reference/stable_fluids.py` 0.5990, `invariants.py`
0.5630, overall 0.4879 (the portfolio mean baseline per § I.3).

**TWO canonical captures** (the LBM-shaped two-capture/two-runner pattern; NOT
MPM's single capture), both present + LFS-tracked at HEAD:

| Capture | Runner | Pipeline exercised | Cadence | Size | LFS OID |
|---|---|---|---|---|---|
| `taylor-green-128cube-seed42-step500` (3D) | `sim_runner_seeded` | plain trilinear SL → vorticity-confine (OFF) → 7pt Laplacian diffuse → Jacobi-20 project → density advect | every-50 (11 frames) | ~704 MB | `4604ebdc40` |
| `lid-driven-cavity-128sq-re100-seed42-step1000` (2D) | `sim_runner_seeded_2d` | MacCormack velocity advect → 5pt Laplacian diffuse → Jacobi-20 project → density via plain SL | every-100 (11 frames) | 4.2 MB | `e13b0d0524` |

Both at `captures/eulerian-smoke-ref/` with `.json` sidecars; `.gitattributes`
`captures/**/*.h5 filter=lfs` (line 38) covers them. These are the gate-14
LEFT partners. The Stack-D port produces matching RIGHT captures at
`captures/eulerian-smoke-stack-d/` and runs **TWO independent gate-14 verdicts**
(the LBM poiseuille+couette precedent): `compare_captures(eulerian-smoke-ref,
eulerian-smoke-stack-d)` per descriptor at `relative=1e-4`.

`sim.category="volumetric-grid"`; tolerance category `smoke` (spec-ref § 9;
`[defaults.smoke]=1e-4/0.0`). Determinism: Phase-1 reference over-achieves to
`bit-exact-same-hw` (spec declares `epsilon-same-stack-same-hw`;
`determinism.atomic_ops=False`); the Stack-D port targets the same over-achieve
via f64 + serialised single-thread (§ F.4 informational; do NOT promote the
spec declaration).

---

## § 8. Naming proposal (D1)

**Lean `sub-phase-eulerian-smoke-stack-d`** (package
`packages/eulerian-smoke-stack-d/`; audit dir + commit scope to match; capture
dir `captures/eulerian-smoke-stack-d/` — NB the Phase-1 reference dir is the
abbreviated `captures/eulerian-smoke-ref/`). Full-name § C.1 precedent +
RD-2D/sph-water/LBM/MPM. CONFIRMS the dispatch lean (S-S1 family). Alternative:
abbreviated `eulerian-stack-d` / `smoke-stack-d` — rejected (breaks the
full-name precedent).

---

## § 9. D-class question enumeration (surfaced; NOT pre-committed)

- **D1 — Naming.** Lean `sub-phase-eulerian-smoke-stack-d` (§ 8). CONFIRMS dispatch.
- **D2 — Stage decomposition.** Lean **plan-drafting + Stage 0 + 1a + 1b + 1c +
  Stage 2** (6-stage; RD-2D/sph/LBM/MPM precedent). Stage 1b ships TWO captures
  + MMS gate-4 + the full Stam-Fedkiw 2D+3D pipeline (~1100–1500 LOC est;
  NumPy-vectorized → Taichi `ti.ndrange` kernels); no further sub-split (confirm
  at Stage 0). Stage 1c runs the override + `equivalence.md` extension + TWO
  gate-14 verdicts.
- **D3 — S-2.1 Stack-D filterwarnings FOLD.** Lean **FOLD** — the new smoke
  port includes `ignore::SyntaxWarning:taichi.*` natively at Stage 1b; the 4
  existing ports' retrofit (4 single-line `pyproject.toml` additions) folds into
  Stage 1b/2 since the portfolio regression sweep exercises the cold-`.pyc`
  gap anyway. (Plan-drafting touches nothing — SECTION 7 boundary.) Alternative:
  STANDALONE testing-improvements sub-phase (more ceremony for 4 trivial edits).
- **D4 — Canonical captures inheritance.** **CONFIRMED present + LFS-tracked**
  (§ 7): both 3D + 2D `.h5` + `.json` at `captures/eulerian-smoke-ref/`;
  `.gitattributes` covers them; all 21 LFS objects smudged locally. TWO gate-14
  LEFT partners.
- **D5 — IC-15 disposition (MOST CONSEQUENTIAL).** Lean **(b) PARTIAL HOLDS +
  REFINEMENT** (§ 6) — fifth physics family + first data on deferred aspect #5
  (iterative-solver, fixed-cap form) → additive §6 subsection; reuse §5.1
  PRESENT-but-NOT-EXERCISED (vorticity) + §5.3 S6 two-instance. (a) full
  premature; (d) substantive unwarranted; (c) unchanged too weak. Routed at
  Stage 2 on the gate-14 margin.
- **D6 — Per-sim tolerance.toml override.** **MANDATORY** (`compare_captures`
  raises `KeyError` on `sim.category="volumetric-grid"` without it). Lean
  `[overrides.eulerian-smoke] category = "smoke"` (the **FIFTH** per-sim
  override; `volumetric-grid`→`smoke`=1e-4; at-budget — `[budgets.smoke.
  cross_stack]` present, no widening). HEAD-verified: `[defaults.smoke]`=1e-4
  exists; no `[overrides.eulerian-smoke]` pre-exists; existing overrides =
  reaction-diffusion-2d / sph-water / lattice-boltzmann-d3q19 / mpm-multimaterial.
- **D7 — Methodology-precedent #14 (manifest-equality) applicability.** Lean
  **DEFER** — smoke builds manifests via private `_build_manifest_3d` /
  `_build_manifest_2d` helpers (no public `build_manifest()`, not inline), the
  same low-kill-rate pattern (§ J.7 smoke `sim.py` = 0.1707, the portfolio
  floor). The strategy-(i) manifest-equality test (#14) landed as a
  representative-single-sim (LBM Phase-1); NONE of the 4 Stack-D ports added one;
  the per-port fan-out is explicitly a **testing-improvements sub-phase**
  deliverable (§ J.7), not a per-sim port's. Alternative: ADD a smoke
  manifest-equality test (strategy-(i): run `sim_runner_diagnostic`, load the
  `.json` sidecar, exclude `wall_clock_seconds`+`checksum`, assert literals) —
  defensible but diverges from the 4-port precedent.
- **D8 — Comparison-projection axis (inherited).** Probe cannot pre-decide (no
  Stack-D capture). Almost certainly **unneeded** (smoke is position-exact-
  comparable per-cell; serialised single-thread → FP-round-off; no aggregate-
  scatter surface). Resolves with D5 at Stage 2.
- **D9 — Variant / scheme posture.** **Stam-Fedkiw stable-fluids, COLLOCATED
  cell-centered, periodic-BC** (HEAD-verified): plain SL (3D) + MacCormack (2D)
  + 5pt/7pt Laplacian diffuse + Jacobi-20 collocated centered-difference
  project + Fedkiw vorticity confinement (eps=0, OFF) + centered-difference
  curl. NO MAC-staggered / face-centered velocities (deferred to Stack-C); NO
  flow-map family (Phase 4). The cross-stack-sensitive surface = Jacobi
  projection FP-accumulation (R-S1) + MacCormack/centered-difference operators
  (R-S2). The smoke analog of LBM's/MPM's D9.
- **D10 — Schema-corpus entry sizing + LFS routing.** `.gitattributes`
  `legacy-captures/**/*.h5 filter=lfs` (line 45) + CI `lfs:true` configured. The
  3D Stack-D capture is ~704 MB (a corpus COPY adds ~704 MB LFS); the 2D capture
  is 4.2 MB. **Lean: surface to operator** — (i) the small 2D capture (4.2 MB)
  to the corpus (the methodology § 5.4 "representative-subset" precedent;
  lightest), OR (ii) the diagnostic-tier 3D capture (32³), OR (iii) the
  canonical 3D (~704 MB; the LBM/MPM precedent). Verify corpus round-trip in CI
  (via `gh`) before Stage-2 GREEN (S-CI1) — BUT note the current CI-red
  LFS-bandwidth condition (ITEM 4) may force documenting local-verification-only
  posture for the round-trip.
- **D11 (NEW) — IC-15 stress-test posture.** Lean **continue with current
  canonicals + note the limitation** (§ 6 / SECTION 2 (c)): #1 chaotic
  unexercised (laminar regimes), #5 exercised in determinism-safe fixed-cap
  form. Alternative: augment with a high-Re / turbulent capture variant
  (stresses #1; out-of-scope cost; rejected per § P.2).
- **D12 (NEW) — Optional non-phase point-release tag.** Lean **NO** (consistent
  with all spec-Phase-2 sub-phase precedent; § D.2 forbids `-phase-N`).
- **D13 (NEW) — Current CI-red LFS-bandwidth acknowledgment.** Lean **record as
  known-banked; no action** (ITEM 4) — local verification + replay unaffected
  (21/21 LFS objects present); landing audits document local-verification-only
  posture for any CI round-trip.

---

## § 10. Discrepancies and observations not fitting elsewhere

1. **Methodology doc header is stale-but-harmless.**
   `cross-stack-equivalence-methodology.md` line 4 still reads "validated
   across the first **two** cross-stack pairs", yet §4 (LBM/third) + §5
   (MPM/fourth) are present. The body is authoritative; the header was not
   updated at the §4/§5 additive amendments. NOT a blocker; smoke's D5 (b) §6
   amendment may refresh the header (Stage 2 discretion; additive).
2. **Smoke `sim_runner_diagnostic` is seed-independent by construction** (uses
   the analytic Taylor-Green IC at 32³; `seed` unused). This is the LBM
   analytic-IC pattern, not the MPM stochastic-blob pattern — correct
   behaviour, NOT a defect, and OUT of the LBM/MPM banked-diagnostic-defect
   scope (which names only those two packages). The Stack-D diagnostic runner
   mirrors the analytic IC.
3. **MMS solution shared with LBM** (shift #18): both consume
   `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`. The
   smoke Stack-D gate-4 MMS arm reuses this read-only (no new MMS solution).
4. **`common_py.vdb.py` references eulerian-smoke** in a docstring/scope
   comment (not a runtime import) — noted for Convention-D completeness; no
   coupling to the port.
5. **Plan-drafting shift count.** Entering **152**; this probe surfaces **6**
   (S-S1..S-S6, § enumerated below); cumulative at plan-drafting close
   (after charter + landing) = **158**.

| Shift | Description | Disposition |
|---|---|---|
| **S-S1** | Spec § 11.3 item 2.4 = "Smoke to Stack D and Stack E" — Stack-D arm **ENUMERATED** (clean spec-mandated port; favourable contrast to MPM's S-M1 Stack-E-only; documents the believed-state "MPM Stack-D non-spec" observation by contrast). | recorded (CONFIRM) |
| **S-S2** | Tolerance category `smoke` = `1e-4` (`[defaults.smoke]`); same as RD-2D/sph/mpm, **looser than LBM's 1e-5** → more gate-14 headroom. D1 full-name confirmed. | recorded |
| **S-S3** | **S6** — canonical TRAJECTORY surface: 3D Taylor-Green uses PLAIN trilinear SL (not MacCormack); MacCormack 2D-only; vorticity confinement `eps=0` (PRESENT-but-NOT-EXERCISED, § 5.1); collocated grid (NO face-centered/MAC — Stack-C deferred); laminar regimes (not chaotic); Jacobi fixed-20-sweep (P24-safe). Corrects the dispatch R-S2/R-S3/SECTION-2 framings. | recorded |
| **S-S4** | Gate-4 is **MMS-ONLY** (spec-ref § 7 "No closed-form golden table"); NO-OP for `_SUBDIRS_PICKED_UP` (RD-3D precedent); MMS shared `incompressible_ns_2d` with LBM; the MMS arm drives the 2D MacCormack-advect + Jacobi-project convergence study (LBM Stack-D `test_mms_convergence.py` template). Opposite of MPM (golden-only); unlike LBM (dual-arm). | recorded |
| **S-S5** | Scope shape — TWO canonical captures (LBM-shaped; two runners `sim_runner_seeded` + `sim_runner_seeded_2d`; TWO gate-14 verdicts); gate-6 Tier-2 `vector_field` (IC-6); **IC-15: FIRST pair to put deferred aspect #5 (iterative-solver/Jacobi) in play, in determinism-safe fixed-cap FP-accumulation form**; D5 lean (b) additive refinement. | recorded |
| **S-S6** | Banked-item dispositions — D3 S-2.1 filterwarnings = FOLD (HEAD-confirmed gap across 4 ports); D7 manifest-equality (#14) = DEFER (private `_build_manifest*`; per-port fan-out is testing-improvements scope; none of 4 ports added one). | recorded |

**Cumulative at plan-drafting close: 158** (152 + 6).

---

*End of probe. Charter drafted next; D1–D13 surfaced for operator routing at
the plan-drafting landing. No Hard-Rule-2 blocker — three dispatch framings
corrected at HEAD (S-S3) are believed-state corrections, not structural
wrongness; drafting proceeds with the corrected leans.*

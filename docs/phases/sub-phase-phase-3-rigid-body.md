---
sub_phase: phase-3-rigid-body-pedagogical
task: task-4 (plan §6.4)
sim_identity: rigid-body-pedagogical          # task/sim id — CI job, probe, fixture, audit-report leaf
package_leaf: articulated-pedagogical          # package + import + sim-spec-leaf + tolerance/determinism key (§S.3)
stack: E (Warp)
category: rigid-body                            # NEW category (first rigid-body sim); flat packages/ per §0.3
stage: plan-drafting
verdict: SHIFTED (charter ready for Stage 0 WITH operator routing of D-ALGO / D-ANCHOR / D-TOL / D-USD)
author: phase-3 rigid-body-pedagogical plan-drafting (Claude Code)
date: 2026-05-28
prior_sub_phase: sub-phase-phase-3-ising-classical (task-3a)
prior_sub_phase_landed_at: 2da281a
prior_phase_tag: v0.2.0-phase-2
d_tag: NO (per-sub-phase tagging discontinued mid-Phase-3; one operator-pushed annotated tag at Phase-3 close)
revisions:
  - v1 2026-05-28 — initial charter; first Stack-E sim of Phase 3; six substantive D-classes surfaced.
---

# Sub-phase: Phase-3 rigid-body-pedagogical (task-4) — CHARTER

> **Plan-drafting artifact.** This charter is the design target for a later
> single combined execution session (Stage 0 → 1a/1b/1c → 2). It does NOT
> implement the sim. Authorities, in precedence order: `docs/architecture.md`
> (spec v2.4) → `docs/phases/phase-3-plan.md` §6.4 (authoritative deliverable
> list A–L + v9 addendum) → `docs/conventions/sub-phase-conventions.md`
> (cross-cutting §A–§S) → the two most-recent sibling charters
> (`sub-phase-phase-3-lenia.md`, `sub-phase-phase-3-ising-classical.md`). Where
> the plan prose and an existing Phase-0/1/2/3 convention disagree, **§0.3**
> (`docs/phases/phase-3-plan.md:138`,`:968`) gives the existing convention
> precedence and the charter documents the SHIFT — no plan edit.
>
> **The execution session does NOT begin until the operator ratifies this
> charter** (in particular the four open D-classes in §6: D-ALGO, D-ANCHOR,
> D-TOL, D-USD).

---

## § 1 — Scope and posture

### 1.1 First-Stack-E-SIM-in-Phase-3 — friction surfacing (CONTEXT-BRIDGE, load-bearing)

task-4 is the **first Stack E (Warp) sim of Phase 3**. Per plan §6.4
CONTEXT-BRIDGE ("You're the first Stack E sim of Phase 3. Your flow validates
the Stack E sim pattern. Surface any friction."), the execution session is the
end-to-end validation of the Warp-sim → golden → tier-3 → CI → LFS-R2 pipeline,
exactly as lenia was for Stack D (Taichi) and ising-classical for Stack B
(WebGPU). The friction this sub-phase predicts is inherited by every later
Stack-E Phase-3 sim (task-7 PINN-Poisson Stack E + PyTorch; task-8 3DGS-MPM
Stack E) and by task-9 common-warp maturation.

| # | Predicted friction (first Stack-E Phase-3 sim) | Resolution / where it lands |
|---|---|---|
| 1 | common-warp is at **Phase-2 (pre-maturation) state** — no spatial-algebra, quaternion, integrator, or CLI helpers | Build sim-LOCAL per plan §6.4-E (the sim's deliverable, NOT a common-warp surface); task-9 inventories as extraction candidates. NOT a Convention-I violation — see §6 D-ALGO note. |
| 2 | common-warp capture API is **batch** (`Capture` + `write_capture`), not lenia's incremental `common_py.capture.Writer.write_step/finalize` | D-CAPTURE-API §6; Stage 1 uses `Capture(manifest, payload)` with `state_key(step, field)` keys + single `write_capture(...)`. |
| 3 | Warp determinism mode + f64 accumulator discipline (cf. lenia Taichi f32-downcast lesson) | D-DET §6; measure bit-exactness via `assert_deterministic_run` at Stage 1b. |
| 4 | New `.h5` fixture under `tests/fixtures/legacy-captures/` → LFS-touching | §Q bootstrap is Stage-0 first action after anchor probe (§8). |
| 5 | New top-level CI job in `python-strict.yml` (NOT plan's `build-py.yml`, which does not exist) + selective LFS pull for the committed capture | D-CI §6; mirror `test-ising-classical` job shape (§8 S.5). |
| 6 | Spec §5.8 ("maximal-coordinate") vs plan §6.4 ("ABA", reduced-coordinate) algorithmic disagreement | **D-ALGO §6 — operator-routed.** |
| 7 | Plan §6.4 golden Anchor 2 (Goldstein §4.3) is a **factually wrong citation** | **D-ANCHOR §6 — corrected, operator-routed.** |
| 8 | §2.5 "every Stack E sim ships USD export" vs plan §6.4 silence + zero Stack-E precedent + unbuilt common-warp USD surface | **D-USD §6 — operator-routed (lean DEFER).** |

### 1.2 Inheritance and re-frames

**Layer-authority re-frame (per §0.3).** The plan §6.4 prompt carries three
stale anchors superseded by the live repo + matured cadence; all three were
caught at probe and are pre-resolved here:

| Plan §6.4 prose | Live / convention reality | Disposition |
|---|---|---|
| "BASE BRANCH: phase-3-integration / YOUR BRANCH / MERGE PROTOCOL §4.3" | trunk-based to `main`, no PR (plan v8 amendment `docs/phases/phase-3-plan.md:46`) | Superseded; ignore. |
| "NEW top-level `rigid-body/` folder"; "mirror hybrid-pg/ volumetric-grid/ particle-fluid/" | those category dirs do not exist; convention is flat `packages/<sim>/` | **D-LAYOUT** — `packages/articulated-pedagogical/` per §0.3 (operator-LOCKED). |
| ".github/workflows/build-py.yml (test job)" | `build-py.yml` does not exist; per-sim jobs live in `python-strict.yml` | **D-CI** — `python-strict.yml` per §0.3. |

**Naming map (documented to prevent execution-session confusion).** Plan §6.4
uses TWO names; both are kept, each in its lane:

| Name | Where used |
|---|---|
| `rigid-body-pedagogical` (sim/task id) | CI job `test-rigid-body-pedagogical`; probe `tools/testkit/probes/reports/rigid-body-pedagogical.md`; PBT dir `tools/testkit/property/sims/rigid_body_pedagogical/`; fixture `phase-3-rigid-body-pedagogical.{h5,json}`; audit `docs/_audits/phase-3/task-4-rigid-body-pedagogical.md` |
| `articulated-pedagogical` (package/spec leaf) | package `packages/articulated-pedagogical/`; import `articulated_pedagogical`; sim-spec `docs/sim-specs/rigid-body/articulated-pedagogical/`; tolerance key `[golden_tolerance.rigid-body.articulated-pedagogical]`; determinism key `[rigid-body.articulated-pedagogical]` |

This dual-naming is the plan's own (it is consistent with how lenia split
`packages/lenia/` code vs `docs/sim-specs/continuous-ca/lenia/` spec). The
**code package is flat `packages/`** (§0.3); the **sim-spec doc path keeps the
category** `docs/sim-specs/rigid-body/articulated-pedagogical/` (matching the
lenia/ising precedent — sim-spec docs stayed category-based).

---

## § 2 — Stage cadence (single combined execution session)

Mirrors lenia/ising: Stage 0 → 1a → 1b → 1c → 2, trunk-based to `main`,
Convention-A new-files-first, ≤500-line commits, TDD with failing-output-hash
footer (§S6 — real sha256, no placeholders). Estimated ~20–50 commits.

- **Stage 0 — Pre-flight + anchor probe + §Q LFS bootstrap.**
  - `uv run python tools/dispatch/preflight-phase.py 3` is a known stale false-
    positive (drift audit `7d52ce1`); the genuine preconditions are discharged
    in §5. Re-confirm the count invariant only (§R: 0 HF / 14 SW via
    `uv run python -m integrity --all --mode strict`; measure digest, do not copy).
  - **§Q.3 first action after anchor probe:** `source tools/lfs/setup-lfs-s3-local.sh`
    (this sub-phase commits a new `.h5` fixture → LFS-touching). Non-zero return →
    STOP-LFS-PUSH surfaced.
  - Cross-phase replay `--prior-phase phase-2` → expect `ok=True`; if LFS smudge
    fails, repopulate the local object cache from byte-identical working-tree
    content (OID == sha256) per the recorded replay-recovery precedent.
  - verify_evidence sweep across prior phase-3 audits → 0-fail (no regression).
  - **Resolve the operator-ratified D-class outcomes** (D-ALGO/D-ANCHOR/D-TOL/
    D-USD) into the spec-ref and tolerance landing before 1a.
- **Stage 1a — Scaffold + RED.** `packages/articulated-pedagogical/` (new
  workspace member); spec-ref + algebraic.md skeletons; failing TDD tests
  (single revolute / double pendulum / 6-DOF) committed with failing pytest
  output captured to `tools/testkit/failing-tests-evidence/rigid-body-pedagogical-<UTC>.txt`,
  sha256 in the failing-tests commit footer (gate-3). Determinism registry row
  (DEFAULT, measured 1b). NotImplementedError stubs.
- **Stage 1b — Implementation + thirteen-gate + D-DET measure.** Warp ABA
  (pending D-ALGO); semi-implicit Euler default + RK4 option; CLI `--tier ∈
  {single-joint, double-pendulum, 6-dof, N-link}`; golden tables F + derivations
  G; Tier-3 diagnostic H; PBT invariants; shared-file updates J (README,
  CHANGELOG, glossary, justfile, `python-strict.yml` test job, tolerance.toml,
  determinism registry); RED→GREEN witness footer `sha256:<same-hex>`. **§S.2:
  read `tolerance-schema.json` + one existing `golden_tolerance` entry BEFORE
  writing the tolerance row.** MEASURE D-DET (`assert_deterministic_run`, two
  renders byte-equal). USD export per D-USD outcome.
- **Stage 1c — Closing sweep + landing prep.** PBT confirmation; verify_evidence;
  append-only; integrity sweep (§R two-field); schema-corpus fixture
  `tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.{h5,json}` +
  §Q.3/§Q.5 R2 push + back-fill. **No mutation baseline** (this is a sim, not a
  testkit surface — §6.0 item 12 testkit-adjacent-only; mutation is task-1/2/9
  territory). Perf-ledger row (gate-12).
- **Stage 2 — Landing audit.** §R two-field integrity, replay, append-only,
  verify_evidence; closes per §2.15 (`closed-with-shifted-N` if any SHIFTED
  item, e.g. a deferred D-USD). NO tag (D-TAG NO). progress.md final entry.

---

## § 3 — Deliverables (maps to plan §6.4 A–L)

| ID | Deliverable | Path / note |
|----|-------------|-------------|
| A | sim-spec | `docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md` (§3.2.8) |
| B | algebraic derivation | `docs/sim-specs/rigid-body/articulated-pedagogical/algebraic.md` — ABA (pending D-ALGO); explicit conventions (spatial vs body-fixed frames, Plücker, joint-axis orientations); cite Featherstone **§7.2–§7.3, pp. 123–131** page+equation per Convention #8 |
| C | probe report | `tools/testkit/probes/reports/rigid-body-pedagogical.md` |
| D | failing TDD tests | `packages/articulated-pedagogical/tests/` — single revolute (period vs analytic small + large amplitude); double pendulum (vs RK4-ref 100× finer Δt); 6-DOF chain (vs RK4-ref; energy conservation) |
| E | Warp impl | `packages/articulated-pedagogical/articulated_pedagogical/` — ABA; semi-implicit Euler default + RK4 option; CLI `--tier` per §3.2.6 |
| F | golden tables | `tools/testkit/golden/tables/rigid-body-pendulum-trajectory.json` (analytical); `rigid-body-double-pendulum-trajectory.json` (RK4-ref); `rigid-body-6dof-trajectory.json` (RK4-ref) |
| G | golden derivations | `tools/testkit/golden/derivations/rigid-body-pendulum.md`; `rigid-body-rk4-reference.md` (RK4 protocol — explicitly a numerical baseline, NOT an analytic anchor) |
| H | Tier-3 diagnostic | `tools/diagnostics/tier3/rigid_body_pedagogical/` (mirror lenia: `Report` classes + `check_*` fns) (§3.2.9) |
| I | Cat-1/Cat-2 | Cat 1 trivially passes (no upstream code; textbook citation only); Cat 2 green |
| J | shared-file updates | README, CHANGELOG, `docs/glossary.md` (Featherstone, ABA, Plücker coords, spatial vs body-fixed frame, revolute/prismatic/spherical joints, semi-implicit Euler, RK4), justfile, `.github/workflows/python-strict.yml` (`test-rigid-body-pedagogical`), `tools/testkit/equivalence/tolerance.toml` (per D-TOL), `tools/testkit/determinism/registry.toml` (`[rigid-body.articulated-pedagogical]`) |
| K | progress.md entry | `docs/_audits/phase-3/progress.md` |
| L | report | `docs/_audits/phase-3/task-4-rigid-body-pedagogical.md` (+ per-stage audits) |
| M | capture | `captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.{h5,json}` — descriptor **fits** spec §2.7 / Appendix D §D.2.3 grammar `<test-name>-<config>-seed<N>-step<N>` (D.2.3 lists it as a canonical example) |
| N | perf-ledger row | `docs/perf-ledger.md` (gate-12) |
| O | schema-corpus seed | `tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.{h5,json}` (§6.0 item 10) |

**PBT invariants (≥2, plan §6.4 line 1604):** `energy_drift_bounded`
(frictionless: total energy drift per second < threshold, random valid ICs,
integer-step times) + `momentum_conservation` (no external forces: linear +
angular momentum preserved, random valid ICs). Impl at
`tools/testkit/property/sims/rigid_body_pedagogical/invariants.py` (mirror
lenia `invariants.py` predicate-function shape).

---

## § 4 — Out of scope (Phase 4+)

Per plan §6.4 OUT OF SCOPE + spec §5.8 frontier variants: Newton 1.0 (spec
§5.8 Newton-backed; plan tasks 4.23–4.25); contact mechanics (joint-only here —
Featherstone Ch.8 closed-loop / Ch.11 contact are OUT); differentiable
rigid-body (Warp autodiff); Isaac Lab integration; runtime linking against any
rigid-body OSS; maximal-coordinate closed-loop systems (unless D-ALGO routes
that way). USD export is **conditionally** out (D-USD — lean DEFER).

---

## § 5 — Pre-flight checks (preconditions discharged)

Per the drift audit (`docs/_audits/phase-3/sub-phase-phase-3-rigid-body-preflight-drift-2026-05-28T22-50-13Z.md`,
committed `7d52ce1`) the genuine Phase-3 preconditions are MET; the
`preflight-phase.py 3` exit-1 is an accepted stale-tooling false-positive (F1
env-resolution of `python3 -m integrity` to a stale GPU-Sims install; F2 phantom
`continuous-ca/.../ref-stack-c` paths — real sims live under `packages/`).
Operator-ratified MET. Verified state at audit head `2da281a`: prior tag
`v0.2.0-phase-2` present; `common/common-warp` + `docs/common/warp.md` present;
all four Phase-2 port sims present under `packages/`; integrity **0 HF / 14 SW**
via `uv run`; clean tree.

**common-warp consumability (Convention I / rule-of-three).** The Phase-2
package exposes runtime (`init`/`get_device`/`set_device`), determinism
(`set_seed`, `set_warp_deterministic`, `deterministic_context`,
`assert_deterministic_run`), and capture I/O (`Capture`, `write_capture`,
`read_capture`, `state_key`/`diagnostics_key`). These cover the sim's
infrastructure needs. Spatial-vector / quaternion / integrator / CLI helpers are
**ABSENT** — but they are the **sim's own physics deliverable** per §6.4-E (the
sim implements "Warp ABA … Integrator: semi-implicit Euler + RK4"), NOT missing
shared infrastructure. The rigid-body sim is the FIRST consumer of such surfaces;
extraction to common-warp happens only on the rule-of-three (task-9 inventories
this consumer site). **No Hard-Rule-2 missing-surface block.**

---

## § 6 — D-class decision routing

> **Operator action required on D-ALGO, D-ANCHOR, D-TOL, D-USD before Stage 0.**
> The rest are RESOLVED-IN-CHARTER (lean stated) per §0.3 + precedent.

### D-ALGO — maximal-coordinate (§5.8) vs ABA / reduced-coordinate (§6.4)  ⚠ OPEN
- **Spec §5.8** (`docs/architecture.md:1175`): *"implementing **maximal-coordinate**
  articulated-body dynamics from scratch. Featherstone 2008 reference."*
- **Plan §6.4** (`docs/phases/phase-3-plan.md:1567`,`:1613`,`:1625`): *"Algorithm:
  **ABA** Ch. 7"*; deliverable B = "**ABA** derivation"; E = "Warp **ABA**".
- **Verified fact:** Featherstone Ch. 7 (§7.3 "The Articulated-Body Algorithm",
  pp. 123–131) is the O(n) **reduced/generalized-coordinate** tree algorithm.
  Maximal-coordinate / closed-loop is a *different* chapter (Ch. 8). So §5.8's
  "maximal-coordinate … Featherstone 2008" is **internally inconsistent**; plan
  §6.4 (ABA + Ch. 7) is internally coherent.
- **LEAN:** follow plan §6.4 — **ABA, reduced/generalized-coordinate**, Featherstone
  Ch. 7 (the dispatch designates §6.4 the authoritative deliverable list; it is the
  coherent, fully-specified choice and matches "demonstrates what physics engines
  do under the hood" for an articulated tree). Surface §5.8 prose for a possible
  spec corrigendum (`docs/architecture.md:1175` "maximal-coordinate" → "articulated-body
  (ABA, reduced-coordinate)"). **Operator confirms ABA, OR explicitly elects
  maximal-coordinate** (which would override §6.4 B/E and re-shape algebraic.md +
  goldens + the `momentum_conservation` PBT formulation — a larger change).

### D-ANCHOR — plan §6.4 golden Anchor 2 (Goldstein §4.3) is a wrong citation  ⚠ OPEN
- **Plan §6.4** (`docs/phases/phase-3-plan.md:1605`): "Anchor 2: Goldstein
  *Classical Mechanics* (3rd ed.) **§4.3** elliptic-integral large-angle solution."
- **Verified fact:** Goldstein 3rd ed. §4.3 = *"Formal Properties of the
  Transformation Matrix"* (rotation-matrix algebra) — unrelated to the pendulum.
  Goldstein has **no dedicated exact-pendulum-period section**; the closest
  elliptic-integral reduction is the heavy symmetric top §5.7.
- **LEAN (corrected 3 independent anchors):**
  - **Anchor 1** — Marion & Thornton *Classical Dynamics* (5th ed.) §3.2 (Simple
    Harmonic Oscillator): small-angle `T = 2π√(L/g)`. ✓ (plan is correct here)
  - **Anchor 2** — large-amplitude exact period via complete elliptic integral
    `T = 4√(L/g)·K(sin(θ₀/2))`: cite **NIST DLMF §19.2** (definition of K(k)) +
    **§22.19(i)** (pendulum), and/or **Landau & Lifshitz *Mechanics* §11**.
    (Replaces the broken Goldstein §4.3 cite.)
  - **Anchor 3** — full trajectory θ(t) via Jacobi elliptic: **NIST DLMF §22.19(i)**
    (eq. 22.19.2, sin(½θ) = sin(½α)·sn(t+K, sin½α)) + §22.2 definitions. ✓
  - The 100×-finer-Δt RK4 reference for the double-pendulum / 6-DOF goldens is a
    **higher-precision numerical baseline, NOT an analytic anchor** — state this
    explicitly in spec-ref §6 and derivation G (plan §6.4 already requires this).
- **Operator confirms the corrected anchor set** (and whether to file a plan
  corrigendum at `docs/phases/phase-3-plan.md:1605`).

### D-TOL — single-stack `golden_tolerance` (§S.3) vs the dispatch's "propose a budget cap"  ⚠ OPEN
- The dispatch PROBE item 4 + plan §6.4 "Cat-X tolerance-budget compliance"
  (`docs/phases/phase-3-plan.md:1608`) say: if `rigid-body` has no
  `tolerance-budget.toml` cap, Stage 0 adds one (≥ the §6.4 tolerances), operator-
  ratified.
- **Convention §S supersedes this for single-stack sims.** §S.3 shape 3
  (`docs/conventions/sub-phase-conventions.md:1530-1540`) **explicitly names**
  `articulated-pedagogical: pendulum_period_rel, trajectory_abs,
  energy_drift_rel_per_second` as a single-stack golden-table sim landing under
  `[golden_tolerance.<category>.<sim>]`. The schema
  (`tools/testkit/equivalence/tolerance-schema.json`) **already has** the
  `golden_tolerance` top-level branch (lenia-tolerance-schema-fix), and its
  description enumerates these exact keys — **no schema extension needed**.
  `tolerance-budget.toml` caps are `[budgets.<cat>.cross_stack]` (relative/
  absolute) — they apply to **cross-stack equivalence** sims (§S.3 shape 1).
  A single-stack Stack-E terminal sim has no cross-stack pair, so — exactly like
  common-3dgs and ising-classical — it adds **NO** `cross_stack` budget cap.
- **LEAN:** land `[golden_tolerance.rigid-body.articulated-pedagogical]` in
  `tolerance.toml` with `pendulum_period_rel = 1e-3`, `trajectory_abs = 1e-2`,
  `energy_drift_rel_per_second = 1e-3`. **No `[budgets.rigid-body.cross_stack]`
  amendment.** §2.6 no-widening governs the values; the §2.6 amendment ceremony is
  not triggered (no budget edit). **This contradicts the dispatch's literal ask;**
  per the dispatch's own Hard-Rule-2 guidance ("file the conflict with both
  citations and surface; do not silently adapt"), the operator either ratifies the
  §S.3 landing (recommended) OR explicitly overrides §S to require a cross_stack
  budget cap.

### D-USD — §2.5 "every Stack E sim ships USD export" vs defer  ⚠ OPEN
- **Spec §2.5** (`docs/architecture.md:1349`): *"Every Stack E sim ships with USD
  export alongside Alembic / VDB."* common-warp is *spec'd* to provide USD export
  (`docs/architecture.md:974`).
- **Verified fact:** common-warp's Phase-2 state has **no** USD/Alembic/VDB export
  surface; **no** existing Stack-E sim (mpm-multimaterial-stack-e,
  eulerian-smoke-stack-e, lattice-boltzmann-d3q19-stack-e) ships USD export; plan
  §6.4 deliverables A–L **do not list** USD export.
- **LEAN: DEFER.** Building a USD-export surface inline would be the FIRST such
  surface with zero precedent and an unbuilt common-warp dependency — a new
  load-bearing infrastructure surface (Convention I / rule-of-three → NOT inline).
  Document the §2.5 gap in spec-ref §-export; route "USD export for Stack-E sims"
  to **task-9 common-warp maturation** or a dedicated infra sub-phase. If the
  operator requires USD now, that is a scope expansion needing a common-warp USD
  surface first (a STOP-worthy dependency). Stage 2 then closes
  `closed-with-shifted-N` carrying the deferred §2.5 item.

### D-LAYOUT — `packages/articulated-pedagogical/`  ✅ LOCKED (operator)
Per §0.3; mirrors `packages/lenia/`, `packages/ising-classical/`. No new
top-level `rigid-body/` code folder. Sim-spec doc path keeps category:
`docs/sim-specs/rigid-body/articulated-pedagogical/`.

### D-DET — bit-exact / same-stack-same-hw via Warp deterministic mode  ✅ RESOLVED-IN-CHARTER (measure 1b)
Plan §6.4 verification posture (`:1656`) + spec §4.4 + the common-3dgs Stack-E
precedent (`[neural-rendered.common-3dgs]` bit-exact same-stack-same-hw, MEASURED
max_abs_diff=0.0). Registry row `[rigid-body.articulated-pedagogical]`: stack="E",
class="bit-exact", scope="same-stack-same-hw", atomic_ops="none",
subgroup_ops="none", seed_pinned=true, distributional_bound="n/a". DEFAULT at 1a;
**MEASURE at 1b** via `assert_deterministic_run` (two runs byte-equal). f64
accumulator discipline (lenia Taichi-f32-downcast lesson carries to Warp kernels).

### D-CI — `python-strict.yml` `test-rigid-body-pedagogical` job  ✅ RESOLVED-IN-CHARTER (§0.3)
`build-py.yml` does not exist. Mirror `test-ising-classical` (per-sim job:
checkout lfs:false → setup-uv → `uv sync --extra dev` → ruff → `mypy --strict` →
selective LFS pull for `captures/rigid-body-pedagogical-ref/**` guarded by §Q.4
R2 opt-in → `pytest tests/`).

### D-CAPTURE-API — common-warp batch `Capture` + `write_capture`  ✅ RESOLVED-IN-CHARTER
NOT lenia's `common_py.capture.Writer.write_step/finalize`. Stage 1: accumulate
per-step pose arrays, build `Capture(manifest=..., payload={state_key(step,
field): arr})`, single `write_capture(cap, path)`. Manifest schema_version
"1.0.0"; dtype "f64"; claimed "bit-exact-same-hw".

### D-TAG — NO  ✅ LOCKED (operator)
Per-sub-phase tagging discontinued mid-Phase-3. One operator-pushed annotated tag
`v0.3.0-phase-3` at Phase-3 close (task-10). Agent stages/pushes no tag.

---

## § 7 — Thirteen-gate acceptance map (spec §3.5 v2.4)

This is a **sim** (not a testkit surface) → it introduces **no new
mutation-testing target** (mutation = task-1/2/9 territory; §6.0 item 12). There
is **no gate-14** in spec §3.5 v2.4's set; "gate-14 cross-stack" referenced in
sibling charters is **N/A** here (single-stack Stack-E terminal sim, no
cross-stack equivalence table).

| Gate | Spec §3.5 | Specialization for rigid-body-pedagogical |
|------|-----------|--------------------------------------------|
| 1 | spec sheet + §6 verification posture | spec-ref §6: golden trajectories / per-integrator OOA / analytical mechanics / bit-exact determinism |
| 2 | pre-impl probe report | `tools/testkit/probes/reports/rigid-body-pedagogical.md` |
| 3 | failing acceptance suite + output sha256 in footer | `failing-tests-evidence/rigid-body-pedagogical-<UTC>.txt`; footer hash; gate-13 replays |
| 4 | golden-value tests pass (Cat 3), ≥3 independent anchors | F goldens; **3 anchors per D-ANCHOR** (Marion&Thornton §3.2; DLMF §19.2+§22.19 / L&L §11; DLMF §22.19 sn). RK4-ref ≠ analytic anchor |
| 5 | Tier-1 diagnostics | inherited testkit Tier-1 |
| 6 | category Tier-2 diagnostics | particle/closed-form Tier-2 as applicable |
| 7 | citation chain (Cat 1) | trivially passes — textbook citation only, no upstream code |
| 8 | public API (Cat 2) | `articulated_pedagogical` public surface resolves |
| 9 | ships replayable capture | `pendulum-trajectory-seed42-step1000.{h5,json}` |
| 10 | determinism decl consistent w/ capture | D-DET registry row ↔ capture sidecar `claimed` |
| 11 | PBT of declared invariants (§2.14) | `energy_drift_bounded` + `momentum_conservation` |
| 12 | first-landing wall-clock in perf-ledger | `docs/perf-ledger.md` row (do NOT silently omit — S2-RD2C1 lesson) |
| 13 | landing replays failing tests; hash matches | gate-3 hash re-witnessed at Stage 2 |

(**Mutation gate: N/A** — sim, not testkit surface.)

---

## § 8 — Convention operationalization (§Q / §R / §S / §S.5 / §S6)

**§Q — R2-LFS Stage-0 bootstrap.** Operative (`:1314-1319`): *"if the sub-phase
will commit a new `.h5` fixture under `tests/fixtures/legacy-captures/` … the
agent runs `source tools/lfs/setup-lfs-s3-local.sh` as the first action after the
anchor probe. A non-zero return = STOP-LFS-PUSH surfaced."* This sub-phase commits
`phase-3-rigid-body-pedagogical.h5` (+ the canonical `captures/…` capture) → it
IS LFS-touching → §Q.3 bootstrap is the Stage-0 first action after the anchor
probe; §Q.4 wires the CI selective-pull opt-in; §Q.5 back-fills R2 by landing
(`git -c lfs.standalonetransferagent= push` for GitHub + `source … &&
git lfs push --object-id --stdin origin` for R2, **in the same shell** — the
ising-classical root-cause fix).

**§R — integrity measure-don't-copy (VERIFIED against the actual text).** The
dispatch asked to confirm §R's actual wording that *counts are the invariant, the
digest is informational/drifts*. Confirmed verbatim:
- §R.2 (`:1413-1420`): *"`integrity_invariant` is the **stable cross-audit
  assertion** … STOP-D fires if this value changes. `integrity_digest_at_head` is
  a **measured fact at this audit's HEAD** … never copied from a prior audit.
  Drift is informational (per R.1 — new golden tables, new captures, new
  audit-log lines all legitimately perturb it)."*
- §R.4 (`:1451-1456`): *"STOP-D … fires ONLY on a change to `integrity_invariant`
  (i.e. a HARD_FAIL appears, or the SOFT_WARN count changes from 14). A change in
  `integrity_digest_at_head` alone is not STOP-D."*
- **Reading CONFIRMED:** the **count (0 HF / 14 SW) is the invariant**; the **digest
  is a per-HEAD measurement, informational, expected to drift** as this sub-phase
  adds golden tables (3 new) + a fixture. Every audit measures the digest live
  (§R.3 `uv run … --all --mode strict 2>err`, sha256 of the full **stderr** report)
  and records BOTH `integrity_invariant` + `integrity_digest_at_head`; never
  copies a prior digest. (The drift audit `7d52ce1` already followed this:
  invariant 0HF/14SW, measured digest `6096fa35…` at `2da281a`.)

**§S — tolerance-schema follows the schema, not plan prose.** Operative §S.2
(`:1501-1509`): *"read `tolerance-schema.json` BEFORE appending any new row, and
read AT LEAST ONE existing entry … schema is the authoritative shape; plan prose
examples are starting designs."* Operationalized in Stage 1b (read schema +
existing `golden_tolerance` entry first) and pre-resolved as **D-TOL** (§6): the
landing slot is the existing `golden_tolerance` branch — no new top-level block,
no STOP-SCHEMA-FIT.

**§S.5 — post-push CI sweep (full workflow set).** Operative (`:1577-1597`):
*"within ~2 minutes of pushing, query the FULL set of workflow runs at the
just-pushed commit SHA, NOT just the workflow the fix touched … Any failure …
fires STOP-CI-RED."* Operationalized at every Stage-1b/landing push:
`gh run list --commit "$(git rev-parse HEAD)" --limit 30` + per-job conclusion
sweep; investigate ANY red (incl. `equivalence.yml` for the tolerance row,
`integrity.yml`, `python-strict.yml/test-rigid-body-pedagogical`,
`tolerance-budget-check.yml`) before declaring the stage landed.

**§S6 — real sha256 in evidence_hashes, no placeholders.** Operationalized via
§R.5 measure-don't-copy + §B.6 evidence-paths strict-verify: every audit's
`evidence_hashes` uses a real measured sha256 or the `at-head` sentinel that
`verify_evidence` resolves at the audit commit; **never** a fabricated/placeholder
hash and **never** the `: self` sentinel (verify_evidence rejects it — common-3dgs
BLOCKED-audit precedent). Failing-tests-output-hash footers carry real sha256.

---

## § 9 — Execution-session agent prompts (operator pastes next)

### Stage 0 prompt
```
RESUME — task-4 rigid-body-pedagogical EXECUTION, Stage 0 (operator-ratified charter).
Charter: docs/phases/sub-phase-phase-3-rigid-body.md. Trunk-based to main; D-TAG NO.
Ratified D-class outcomes (operator fills in): D-ALGO=<ABA|maximal>; D-ANCHOR=<corrected set>;
D-TOL=<golden_tolerance|budget-cap>; D-USD=<DEFER|now>.
ACTION 1: anchor probe — `uv run python -m integrity --all --mode strict` (expect 0 HF / 14 SW;
  measure digest, §R two-field; do NOT copy a prior digest). preflight-phase.py 3 exit-1 is the
  accepted stale false-positive (drift audit 7d52ce1) — confirm counts only.
ACTION 2 (§Q.3, FIRST after probe): `source tools/lfs/setup-lfs-s3-local.sh` — non-zero → STOP-LFS-PUSH.
ACTION 3: cross-phase replay --prior-phase phase-2 (expect ok=True; LFS-smudge recovery if needed).
ACTION 4: verify_evidence sweep across prior phase-3 audits (0-fail).
Then proceed to Stage 1a (scaffold + RED). STOP and surface on any STOP-* fired.
```

### Stage 1 prompt (1a → 1b → 1c)
```
Stage 1 — implement articulated-pedagogical per charter §3 + ratified D-classes.
1a: packages/articulated-pedagogical/ (new member); spec-ref + algebraic.md skeletons; RED TDD
  (single revolute / double pendulum / 6-DOF) → failing-tests-evidence + sha256 footer (gate-3);
  determinism registry DEFAULT row.
1b: Warp ABA (per D-ALGO) + semi-implicit Euler default + RK4 option + CLI --tier; golden tables F
  + derivations G (3 anchors per D-ANCHOR; RK4-ref labeled numerical-baseline); Tier-3 H; PBT
  (energy_drift_bounded, momentum_conservation); shared-file J updates. §S.2: read tolerance-schema.json
  + one golden_tolerance entry BEFORE the row; land [golden_tolerance.rigid-body.articulated-pedagogical]
  (per D-TOL). MEASURE D-DET (assert_deterministic_run two runs byte-equal). RED→GREEN witness footer.
  USD per D-USD. NO mutation baseline (sim, not testkit surface).
1c: PBT confirm; verify_evidence; integrity §R two-field; perf-ledger row (gate-12, do NOT omit);
  capture + fixture .h5 + §Q.3/§Q.5 R2 push & back-fill; §S.5 full-workflow post-push sweep.
STOP and surface on HARD RULE 2 (anchor falsified, surface missing, schema mis-fit, threshold-widen pressure).
```

### Stage 2 prompt
```
Stage 2 — landing audit docs/_audits/phase-3/task-4-rigid-body-pedagogical.md.
§R two-field integrity (0 HF / 14 SW invariant + measured digest); replay; append-only; verify_evidence
(incl. this sub-phase's prior stage audits, 0-fail); §S.5 full-workflow CI sweep green at HEAD.
Close per §2.15 (closed-with-shifted-N if D-USD deferred or any SHIFTED item). NO tag (D-TAG NO).
progress.md final entry. Convention-#12 SHA back-fill.
```

---

## § 10 — Audit / report paths (spec §8.1, mirror lenia/ising)

- Charter: `docs/phases/sub-phase-phase-3-rigid-body.md` (this file).
- Plan-drafting: probe `…rigid-body-probe-<UTC>.md`; landing audit
  `…rigid-body-plan-drafting-<UTC>.md`; both under `docs/_audits/phase-3/`.
- Execution per-stage: `…rigid-body-stage-{0,1a,1b,1c}-<UTC>.md`.
- Final report: `docs/_audits/phase-3/task-4-rigid-body-pedagogical.md`.
- sim-spec: `docs/sim-specs/rigid-body/articulated-pedagogical/{spec-ref,algebraic}.md`.
- Audit front-matter: §R two-field + §7.5 fields, mirroring the ising-classical
  plan-drafting audit shape (`evidence_hashes` as a YAML **mapping**, not a list;
  `at-head` sentinel accepted by verify_evidence).

---

## § 11 — Closing criteria & operator-ratification items

**Charter verdict: SHIFTED** — ready for Stage 0 *with* four operator-pending
D-classes:
1. **D-ALGO** — confirm ABA/reduced-coordinate (lean) or elect maximal-coordinate.
2. **D-ANCHOR** — confirm the corrected 3-anchor set (Goldstein §4.3 is wrong).
3. **D-TOL** — confirm `golden_tolerance` landing (lean, per §S.3) or override §S
   to require a cross_stack budget cap (the dispatch's literal ask).
4. **D-USD** — confirm DEFER (lean) or require USD export now (→ common-warp USD
   dependency first).

RESOLVED-IN-CHARTER (no operator action): D-LAYOUT, D-DET, D-CI, D-CAPTURE-API,
D-PBT, D-TAG. No new mutation target. No new tolerance-schema branch. No
tolerance-budget amendment (per D-TOL lean). One new `.h5` fixture → LFS-touching
(§Q applies). Sub-phase closes `closed-with-shifted-N` per §2.15 (N ≥ 1 if D-USD
defers). No tag.

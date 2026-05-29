# Pre-implementation probe — rigid-body-pedagogical (task-4)

> Per template at `tools/testkit/probes/template.md`. Phase 3 task-4, Stage 1a
> deliverable (charter §3 deliverable C + §7 gate-2). Sibling of the
> plan-drafting probe
> `docs/_audits/phase-3/sub-phase-phase-3-rigid-body-probe-2026-05-28T22-50-13Z.md`
> (audit-level — pre-charter); this report is the testkit-template, cat1-resident
> scan (sim-task-level — at Stage 1a). All `path:line` claims grep-verified at
> probe time (Stage-1a HEAD; trunk-based to `main`); INFERENCEs are tagged.

## 1. Scope

Substantiates the API surfaces, citations, and fixture paths the Stack-E
(NVIDIA Warp) articulated rigid-body pendulum depends on. Read before authoring
the Stage 1b ABA implementation.

## 2. API surfaces consumed

### 2.1 `common_warp` (Stack-E socket — Runtime + Capture + Determinism)

| Symbol | Source `path:line` | Used for (Stage 1b) |
|---|---|---|
| `common_warp.init` | `common/common-warp/src/common_warp/runtime.py:56` | Select the CPU backend with `deterministic=True` (serial `wp.launch`). |
| `common_warp.Capture` | `common/common-warp/src/common_warp/capture/model.py:23` | Batch capture model for the canonical pendulum trajectory. |
| `common_warp.capture.model.state_key` | `common/common-warp/src/common_warp/capture/model.py:36` | Flat payload key `steps/{N}/state/{field}`. |
| `common_warp.write_capture` | `common/common-warp/src/common_warp/capture/writer.py:34` | Single batch write of `pendulum-trajectory-seed42-step1000`. |
| `common_warp.warp_harness.set_warp_deterministic` | `common/common-warp/src/common_warp/warp_harness/determinism.py:54` | Seed + deterministic CPU mode. |
| `common_warp.warp_harness.deterministic_context` | `common/common-warp/src/common_warp/warp_harness/determinism.py:70` | Scope the deterministic run. |
| `common_warp.assert_deterministic_run` | `common/common-warp/src/common_warp/warp_harness/harness.py:71` | D-DET MEASURE (two runs byte-equal) at Stage 1b. |

**INFERENCE (tied to FACT above):** the socket-only consumption (no
`Particles`/`Grids`/`HashGrid`) mirrors mpm-multimaterial-stack-e
(`packages/mpm-multimaterial-stack-e/mpm_multimaterial_stack_e/sim.py:49`): the
ABA owns its `wp.array(dtype=wp.float64)` joint-space arrays (the chain is a
fixed-size recursion, not a particle/grid system).

### 2.2 `articulated_pedagogical` (own surface — Stage 1a shells)

| Symbol | Source `path:line` |
|---|---|
| `aba_forward_dynamics` | `packages/articulated-pedagogical/articulated_pedagogical/aba.py:43` |
| `simulate` / `step_semi_implicit_euler` / `step_rk4` / `rk4_reference` | `packages/articulated-pedagogical/articulated_pedagogical/integrators.py:38` |
| `pendulum_period_small_angle` / `pendulum_period_large_angle` / `pendulum_angle` | `packages/articulated-pedagogical/articulated_pedagogical/analytic.py:43` |
| `total_energy` / `angular_momentum` / `link_positions` | `packages/articulated-pedagogical/articulated_pedagogical/dynamics.py:28` |

## 3. Algorithm + citations (Cat 1 — textbook, no vendored code)

- **ABA forward dynamics** — Featherstone, *Rigid Body Dynamics Algorithms*
  (Springer 2008), Ch. 7 §7.2–§7.3, pp. 123–131 (Table 7.1). D-ALGO ratified;
  spec §5.8 "maximal-coordinate" (`docs/architecture.md:1175`) is the verified
  error → corrigendum A-1 in `docs/spec-amendments-proposed.md`.
- **Analytic anchors** — Marion & Thornton §3.2 (small-angle); NIST DLMF §19.2 +
  §22.19(i) / Landau & Lifshitz §11 (large-angle exact period); DLMF §22.19(i) +
  §22.2 (Jacobi `cn` trajectory). RK4-ref = numerical baseline, NOT an anchor.

No upstream source code is vendored — Cat 1 trivially passes (textbook citation
only). Elliptic integrals/functions use `scipy.special.ellipk` / `ellipj`
(host-side oracle, not in the Warp hot loop).

## 4. Golden tables + capture + fixture paths (Stage 1b)

- `tools/testkit/golden/tables/rigid-body-pendulum-trajectory.json` (analytic).
- `tools/testkit/golden/tables/rigid-body-double-pendulum-trajectory.json` (RK4-ref).
- `tools/testkit/golden/tables/rigid-body-6dof-trajectory.json` (RK4-ref + energy).
- `tools/testkit/golden/derivations/rigid-body-pendulum.md`,
  `tools/testkit/golden/derivations/rigid-body-rk4-reference.md`.
- Capture: `captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.{h5,json}`.
- Schema-corpus fixture: `tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.{h5,json}`.

## 5. Determinism + tolerance landing slots

- Determinism registry row `[rigid-body.articulated-pedagogical]` in
  `tools/testkit/determinism/registry.toml` (stack E, bit-exact,
  same-stack-same-hw; MEASURE at 1b).
- Tolerance row `[golden_tolerance.rigid-body.articulated-pedagogical]` in
  `tools/testkit/equivalence/tolerance.toml` (D-TOL §S.3; read
  `tools/testkit/equivalence/tolerance-schema.json` + one existing
  `golden_tolerance` entry BEFORE writing — §S.2). No cross-stack budget cap.

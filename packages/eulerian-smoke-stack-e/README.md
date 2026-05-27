# eulerian-smoke-stack-e

Spec-Phase-2 **Stack-E (Python / NVIDIA Warp 1.13.0 / CPU)** port of the Phase-1
`eulerian-smoke` reference (Stam-Fedkiw stable-fluids; `stack.name="numpy-reference"`).
SEVENTH per-sim cross-stack port; SECOND Stack-E port consuming `common/common-warp`
(after `mpm-multimaterial-stack-e`); sibling to `packages/eulerian-smoke/` +
`packages/eulerian-smoke-stack-d/`.

Content-equivalent to the Phase-1 NumPy reference at `relative = 1e-4` (`smoke`
tolerance category) per spec § 2.6 (gate 14) — but BOTH canonical trajectories are
**CHAOTIC (positive-Lyapunov)** at canonical resolution, so gate-14 is a
**divergence-rate witness**: `within_tolerance=False` is the CORRECT verdict
(IC-15 R-P2 chaotic-regime escape-hatch; methodology § 6). Collocated cell-centered
periodic grid; plain trilinear semi-Lagrangian advection (3D), MacCormack-corrected
semi-Lagrangian (2D), 5/7-point explicit Laplacian diffusion, fixed-`n_jacobi=20`
Jacobi pressure-projection (IC-15 aspect #5, determinism-safe fixed-cap), Fedkiw
vorticity confinement (skeleton; `eps=0` PRESENT-but-NOT-EXERCISED at canonical).
No atomic scatter; no MAC-staggered / face-centered velocities (deferred to Stack-C).

Consumes the common-warp § 1.9.1 socket **only** (Runtime + Capture + Determinism;
D7) and declares its OWN `wp.array(dtype=wp.float64)` dense fields (D15; the f32
`ScalarField3D`/`VectorField3D` Grids surface is smoke's natural structural fit yet
f64-blocked — warp.md § 6.1).

## Layout

- `eulerian_smoke_stack_e/reference/stable_fluids_warp.py` — NVIDIA Warp
  `@wp.kernel` Stam-Fedkiw primitives (2D + 3D) + canonical constants (re-derived
  verbatim from the Phase-1 reference; no Phase-1 import). **Stage 1b.**
- `eulerian_smoke_stack_e/sim.py` — `sim_runner_seeded` (3D Taylor-Green),
  `sim_runner_seeded_2d` (2D lid-driven-cavity), `sim_runner_diagnostic`,
  `compute_canonical_trajectory_3d`. **Stage 1b.**
- `eulerian_smoke_stack_e/invariants.py` — `divergence_free_post_projection`
  + `smoke_density_nonneg` (gate-11 PBT, ≥ 50 examples each). **Stage 1b.**

At Stage 1a (this scaffold) the package is the **gate-13 failing-tests RED anchor**:
the `reference` / `sim` / `invariants` modules are absent, so the `tests/` collect at
a clean `ModuleNotFoundError`. Stage 1b lands the Warp implementation (GREEN, gates
4–13) + root-workspace registration (21 → 22); Stage 1c lands gate-14.

## Run

```
uv run pytest packages/eulerian-smoke-stack-e/tests/ -v
```

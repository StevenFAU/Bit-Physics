# eulerian-smoke-stack-d

Spec-Phase-2 **Stack-D (Taichi-DSL / CPU)** port of the Phase-1 `eulerian-smoke`
reference (Stam-Fedkiw stable-fluids; `stack.name="numpy-reference"`). FIFTH
per-sim cross-stack port, sibling to `packages/eulerian-smoke/`.

Content-equivalent to the Phase-1 NumPy reference at `relative = 1e-4`
(`smoke` tolerance category) per spec § 2.6 (gate 14). Collocated cell-centered
periodic grid; plain trilinear semi-Lagrangian advection (3D), MacCormack-corrected
semi-Lagrangian (2D), 5/7-point explicit Laplacian diffusion, fixed-`n_jacobi=20`
Jacobi pressure-projection, Fedkiw vorticity confinement (skeleton; `eps=0`
PRESENT-but-NOT-EXERCISED at canonical). No atomic scatter; no MAC-staggered /
face-centered velocities (deferred to Stack-C).

## Layout

- `eulerian_smoke_stack_d/reference/stable_fluids_taichi.py` — Taichi-DSL
  `@ti.kernel` Stam-Fedkiw primitives (2D + 3D) + canonical constants
  (re-derived verbatim from the Phase-1 reference; no Phase-1 import).
- `eulerian_smoke_stack_d/sim.py` — `sim_runner_seeded` (3D Taylor-Green),
  `sim_runner_seeded_2d` (2D lid-driven-cavity), `sim_runner_diagnostic`
  (32³ × 10 diagnostic tier), `compute_canonical_trajectory_3d`.
- `eulerian_smoke_stack_d/invariants.py` — `divergence_free_post_projection`
  + `smoke_density_nonneg` (gate-11 PBT, ≥ 50 examples each).

## Run

```
uv run pytest packages/eulerian-smoke-stack-d/tests/ -v
# Re-derive the Stack-D canonical captures:
uv run python -c "from pathlib import Path; from eulerian_smoke_stack_d.sim import sim_runner_seeded, sim_runner_seeded_2d; d=Path('captures/eulerian-smoke-stack-d'); print(sim_runner_seeded_2d(42,d)); print(sim_runner_seeded(42,d))"
```

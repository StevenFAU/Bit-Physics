# strange-attractors (package)

Phase 1 Stage 2 — TDD bootstrap. Sim implementation is deferred to a
per-sim implementation phase (Phase 2+).

See [`docs/sim-specs/closed-form/strange-attractors/`](../../docs/sim-specs/closed-form/strange-attractors/)
for the full reference spec.

## Run the failing test suite (Phase 1 contract)

```bash
PYTHONPATH=packages/strange-attractors python -m pytest packages/strange-attractors/tests/ -v
```

Tests are RED by construction: they import from `strange_attractors.reference`
and `strange_attractors.sim`, which do not exist in this phase.

## What is committed at Phase 1

| Path | Contents |
|---|---|
| `strange_attractors/__init__.py` | Empty surface placeholder. No exports. |
| `tests/` | pytest test files that exercise the Phase 2+ public API. |

## What Phase 2+ will add

- `strange_attractors/reference/` — NumPy ground-truth integrators
  (Lorenz, Rössler, Aizawa, Sprott-A, Pickover) plus the RK4 driver.
- `strange_attractors/sim.py` — `sim_runner_seeded` matching the
  testkit `SimRunner` Protocol.
- `strange_attractors/invariants/` — PBT invariants per spec § 6.6.
- `src/` — Stack B WebGPU compute path (parallel to Phase 0 RD-2D's
  `packages/reaction-diffusion-2d/src/`).

# `hello-warp` — Subsystem 7 smoke simulator

A 2D advection-diffusion smoke sim on a 64×64 periodic grid, the canonical
consumer of the `common-warp` public API (phase-2 plan §1.9.1, Subsystem 7).
It is the **W-3** acceptance surface: a runnable example that exercises the
public subsystems and emits a capture-v1 capture.

## Physics

A localized Gaussian density blob decays under **explicit FTCS diffusion +
first-order upwind advection** (both dissipative), periodic boundaries.

| Parameter | Value | Notes |
|---|---|---|
| Grid | 64 × 64 | dense scalar field (`ScalarField3D`, `Nz = 1`) |
| IC | Gaussian, σ = N/12, peak = 1.0 | analytic, RNG-free |
| Diffusion `D` | 0.10 | diffusion number `D·dt/dx² = 0.05` (< 0.25, stable) |
| Velocity `U` | (0.5, 0.3) | Courant `(\|ux\|+\|uy\|)·dt/dx = 0.40` (< 1, stable) |
| `dt`, `dx` | 0.5, 1.0 | |
| Horizon | 400 steps | 11 captured frames (cadence 40) |

**Trajectory (Stage-0 Task 0.6 design check, reproduced):** max-field
`1.0 → ~0.219` over 400 steps, **monotonically decreasing** (zero increases),
mass conserved under periodic BC. The laminar opposite of the chaotic
Taylor-Green Stack-D smoke port.

## Subsystems exercised (W-3)

- **Runtime** (`init(device, deterministic)`), **Determinism**
  (`set_seed`, `deterministic_context`), **Capture** (`write_capture`),
  **Grids** (`ScalarField3D` / `allocate_scalar_field`) — used directly here.
- **Particles** + **HashGrid** — exercised via their own unit tests (a pure
  grid sim has no particles or neighbor queries; W-3 "exercises every public
  subsystem" reads collectively across the test suite — Stage-0 S0-W1).

## Determinism (D4 / W-2)

No RNG, no atomics — every cell update is a per-cell stencil *gather* from an
immutable double-buffered prior step. On Warp's CPU backend `wp.launch` runs
serially, so the f32 evolution is bit-identical run-to-run
(`bit-exact-same-hw`). Verified by `tests/test_hello.py` via both the
`warp_harness` `assert_deterministic_run` and the testkit `run_twice_and_diff`.

## Run

```bash
uv run --no-sync python -m hello.sim        # writes captures/ under this dir
```

or programmatically:

```python
from hello.sim import run_hello_sim
result = run_hello_sim("out/")     # max_history, final_field, capture_path
```

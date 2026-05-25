# mpm-multimaterial-stack-e

Spec-Phase-2 **Stack-E** port of `mpm-multimaterial` (MLS-MPM, Hu 2018 + APIC
`4/dx^2` reconstruction; neo-Hookean single-material). NVIDIA Warp 1.13.0
`@wp.kernel` CPU implementation against the Phase-1-frozen NumPy+numba reference
(`stack.name='numpy-numba-reference'`).

**SIXTH** per-sim cross-stack port under spec-Phase-2 (spec § 11.3 item 2.3
mandate); the **FIRST Stack-E port** consuming `common-warp`. Cross-stack
content-equivalent at `relative = 1e-4` (the `mpm` tolerance category) against
`captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` (gate-14;
Stage 1c).

## common-warp consumption (D10 — socket-only)

Consumes the `common-warp` §1.9.1 socket only: **Runtime** (`init`), **Capture**
(`Capture` / `write_capture` / `read_capture`), **Determinism**
(`set_warp_deterministic` / `deterministic_context`). The f32-pinned `Particles`
/ `Grids` and the `HashGrid` neighbor-search subsystems are NOT consumed — MPM
is f64 (D15 / R-MPME-F64: own `wp.array(dtype=wp.float64)`) and uses a fixed
27-cell quadratic-B-spline stencil (no neighbor-search).

## Determinism (D5 / banked #8)

Warp's CPU backend `wp.launch` executes serially over the launch dimension in a
single thread → the P2G `wp.atomic_add` accumulation order is fixed and
bit-exact run-to-run (the Warp analog of Taichi `cpu_max_num_threads=1` / numba
`parallel=False`; no serialisation knob). Stage-0 Task 0.6 verified the P2G
atomic-scatter kernel reproduces 6/6 bit-identical.

> Stage 1a: full Warp MLS-MPM implementation + gates 4–13 (diagnostic-tier
> capture). The full 128cube canonical capture lands at Stage 1b; gate-14
> cross-stack equivalence at Stage 1c.

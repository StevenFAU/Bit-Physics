# common-warp

Python-side common module for Bit-Physics Stack E (NVIDIA Warp-backed)
sims. Sister to `common/common-py/` (Stack D / Taichi) at the
Stack-E layer; establishes the workspace surface the spec § 11.3
Stack-E ports (MPM, Smoke, LBM) consume.

CPU mode is the bit-deterministic backend (`bit-exact-same-hw`); GPU
mode is `epsilon-bounded-cross-stack` (spec § 4.4 posture; per-sim-port
scope). See [`docs/common/warp.md`](../../docs/common/warp.md) for the
full convention (authored at Stage 1c).

> Scaffolded at `sub-phase-common-warp-bootstrap` Stage 1a (Runtime +
> Determinism + warp_harness W-2 mechanism + 20th workspace member).
> Capture / Particles / Grids / HashGrid land at Stage 1b; the hello
> smoke simulator at Stage 1c.

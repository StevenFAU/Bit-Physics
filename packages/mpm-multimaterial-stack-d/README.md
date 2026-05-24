# mpm-multimaterial-stack-d

Spec-Phase-2 Stack-D port of `mpm-multimaterial` (MLS-MPM, Hu 2018 + APIC
`4/dx^2` reconstruction; neo-Hookean single-material). Taichi-DSL CPU
implementation against the Phase-1-frozen NumPy+numba reference
(`stack.name='numpy-numba-reference'`).

FOURTH per-sim cross-stack port under spec-Phase-2; cross-stack content-equivalent
at `relative = 1e-4` (the `mpm` tolerance category) against
`captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}`.

> Stage 1a: failing-tests RED-state anchor. The `reference` / `sim` / `invariants`
> submodules are implemented at Stage 1b.

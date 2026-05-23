# reaction-diffusion-2d-stack-d

Spec-Phase-2 Stack-D port of the Gray-Scott reaction-diffusion 2D sim.

Ports the Phase-0-Block-8-frozen Stack-B (WGSL/WebGPU) reference to
Stack-D (Python / Taichi-DSL) under the IC-13 content-equivalent
determinism contract + IC-14 harness API established at
`sub-phase-capture-determinism-contract`. Stack-B is the cross-stack
equivalence partner; gate-14 acceptance is `within_tolerance == True`
at `relative = 1e-4` over the canonical descriptor
`gray-scott-lambda-128sq-seed42-step2000` per spec § 2.6 RD category
default + the new same-stack content-equivalent contract.

Charter: `docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md`.

Status: Stage 1a failing-tests state (RED). Stage 1b implements the
Taichi-DSL reference + sim + invariants; Stage 1c lands the cross-stack
equivalence harness extension at
`docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md`.

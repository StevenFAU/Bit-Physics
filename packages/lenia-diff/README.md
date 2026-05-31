# lenia-diff

Differentiable variant of [`lenia`](../lenia) (Stack D / Taichi, spec Phase-4 batch-1,
sim 2/4). Tape-differentiable Quad4-Lenia forward (`ti.ad.Tape`) on the WU-A autodiff
substrate (`common_py.autodiff`): real-space Quad4 convolution (`ti.static`-unrolled taps)
+ Quad4 polynomial growth + clip-Euler, with time-indexed `needs_grad` fields.

Two inverse problems:

- **`LeniaGrowthID`** — recover the growth parameters `(μ, σ)` from an observed target
  field (`ParameterIDProblem`).
- **`LeniaInitialFieldID`** — recover the initial field `A₀` (`InitialStateRecoveryProblem`;
  the convolution-Jacobian A3 anchor).

The gradient golden table carries **≥3 independent anchors**: A1 closed-form Quad4
growth-parameter analytic, A2 central finite-difference baseline, A3 convolution-Jacobian
+ growth-derivative initial-field gradient. See
`docs/sim-specs/continuous-ca/lenia/spec-diff.md` and the Stage-0 probe
`tools/testkit/probes/reports/lenia-diff.md`.

The gradient is verified in the **smooth interior** regime (`σ≈0.15`, params away from the
Quad4 clip saturation), not the orbium `σ=0.015` clip-tight preset (charter §3.2 D-SMOOTH).

# eulerian-smoke-diff

Spec-Phase-4 batch-1 **differentiable** variant of `eulerian-smoke` (sim 4/4; FINAL).
Stack **E** / NVIDIA **Warp** `wp.Tape` — the first Stack-E consumer of the WU-A autodiff
substrate (`common_warp.autodiff`).

A tape-differentiable semi-Lagrangian smoke step (SL backtrace + bilinear interpolated gather +
explicit diffusion), re-implemented on-device with `requires_grad` `wp.array`s (the landed
`eulerian-smoke-stack-e` reference's NumPy-marshalling primitives sever the `wp.Tape`, so they are
re-implemented, not wrapped). Exposes:

- **`SmokeInitialFieldID`** — an `InitialStateRecoveryProblem` recovering the initial smoke field
  `u₀` of a constant-velocity advection rollout from its observed final frame (identifiable in the
  well-conditioned constant-velocity regime).
- **Gradient golden table** (`tools/testkit/golden/tables/eulerian-smoke-diff-gradient.json`) — the
  `wp.Tape` autodiff gradient at canonical points, verified against ≥3 independent anchors:
  - **A1** linear-advection-operator analytic `∂Loss/∂u₀ = 2 Mᵀ(M u₀ − target)` (Stam 1999),
  - **A2** central finite-difference baseline,
  - **A3** discrete-diffusion `∂Loss/∂ν = 2(u' − target)·(dt·∇²u)` (distinct physical term).

Single-stack: gate-14 (cross-stack) N/A; the WU-F **differentiable-axis** variant-equivalence
(`diff.forward == eulerian-smoke-stack-e` reference primitives, `relative ≤ 1e-3`) applies instead.
See the Phase-4 batch-1 charter + the Stage-0 probe `tools/testkit/probes/reports/eulerian-smoke-diff.md`.

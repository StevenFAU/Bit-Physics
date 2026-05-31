# reaction-diffusion-2d-diff

Differentiable 2D reaction-diffusion (Gray-Scott), **Stack D / Taichi** — the
Phase-4 batch-1 differentiable variant of `reaction-diffusion-2d-stack-d`.

The forward map is re-implemented with **time-indexed `needs_grad` fields** (the
DiffTaichi single-write-per-element pattern) so `ti.ad.Tape` can backprop
`∂Loss/∂params` through the chained explicit-Euler steps. Built on the WU-A
autodiff substrate (`common_py.autodiff`: `InverseProblem`, `ParamSpec`,
`finite_difference_gradient`, `GradientCheckReport`).

## Verification surfaces

1. **Forward-equivalence** (WU-F differentiable axis): the diff forward matches the
   landed `reaction-diffusion-2d-stack-d` reference within the `differentiable`
   variant tolerance.
2. **Gradient golden table** (`tools/testkit/golden/tables/reaction-diffusion-2d-diff-gradient.json`):
   `∂Loss/∂D_u` / `∂Loss/∂F` verified against **≥3 independent anchors** —
   - **A1** discrete-Fourier-eigenmode analytic (exact for the discrete operator),
   - **A2** central finite-difference baseline,
   - **A3** reaction-ODE-limit analytic (well-mixed `∂Loss/∂F`).
3. **Inverse-problem recovery**: a planted `D_u` is recovered from a synthetic final
   field; the capture populates the schema-1.1.0 `gradient_fields` key.

Closes the 4.1 §1.D `reaction_diffusion_2d_mms` mutation-coverage gap.

See the Stage-0 probe `tools/testkit/probes/reports/reaction-diffusion-2d-diff.md`
and the gradient derivation `tools/testkit/golden/derivations/reaction-diffusion-2d-diff-gradient.md`.

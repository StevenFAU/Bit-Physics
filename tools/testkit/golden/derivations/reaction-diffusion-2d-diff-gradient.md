# Gradient golden derivation — reaction-diffusion-2d-diff

Golden table: `tools/testkit/golden/tables/reaction-diffusion-2d-diff-gradient.json`.
Algorithm: `reaction-diffusion-2d-diff-gradient`. Category: `continuous-ca`.

The table verifies the autodiff (`ti.ad.Tape`) gradient `∂Loss/∂param` of the
differentiable Gray-Scott forward against **three genuinely independent anchors**
(spec §2.4; cat3 enforces ≥3 distinct `independent_reference.source` strings). No
vendored code — every anchor is a closed-form derivation or an independent numerical
method (`derivation.upstream` = the source set, `upstream_sha/path` = `n/a-no-vendored-code`).

`Loss(p) = Σ_ij (u(T)_ij − target_ij)²`, with `u(T)` the final field of the
explicit-Euler forward `u[t+1] = u[t] + dt·(D_u·∇²u[t] + react)`, `∇²` the periodic
5-point Laplacian, `inv_dx2 = 1/dx²`.

## A1 — discrete-Fourier-eigenmode analytic `∂Loss/∂D_u` (pure diffusion)

In the pure-diffusion regime (reaction off) the forward is linear. A single discrete
Fourier mode `φ(i,j) = cos(2π(mₓ i + m_y j)/n)` is an **exact eigenvector** of the
periodic 5-point Laplacian with eigenvalue

    λ = (2/dx²)·[(cos(2π mₓ/n) − 1) + (cos(2π m_y/n) − 1)]   (< 0).

So `∇²φ = λ φ` and one explicit-Euler step scales the mode by `(1 + dt·D_u·λ)`. After
`T` steps `u(T) = (1 + dt·D_u·λ)^T · φ`. With `target ≡ 0`,
`Loss = (1 + dt·D_u·λ)^(2T)·Σφ²`, hence the **closed-form exact** gradient

    ∂Loss/∂D_u = 2T·(1 + dt·D_u·λ)^(2T−1)·(dt·λ)·Σφ².

This is exact for the *discrete* operator (not merely O(h²)); the autodiff gradient
matches it to machine precision (~1e-15). **Source (continuum motivation):**
separation-of-variables eigenmode decay of the diffusion equation — Strauss,
*Partial Differential Equations: An Introduction*, 2e, §4.1 (Separation of Variables)
+ Ch. 5 (Fourier Series); the mode-decay factor `exp(−D k² t)` is the diffusion-
semigroup eigenvalue. Evans, *PDE* 2e, §2.3 (Heat Equation) as secondary reference.
Citation granularity is chapter/section — no sub-equation number is asserted unread.

## A2 — central finite-difference baseline `∂Loss/∂D_u` (full Gray-Scott)

In the full Gray-Scott regime the gradient has no simple closed form, so the
independent reference is the **central finite-difference** gradient

    ∂Loss/∂D_u ≈ [Loss(D_u + ε) − Loss(D_u − ε)] / (2ε),   ε = 1e-5,  O(ε²),

computed by `common_py.autodiff.finite_difference_gradient`. This is the numerical-
baseline anchor (close-R2 exemption): an independent computational path
(parameter perturbation) from the tape adjoint. Autodiff matches FD to ~1e-7 rel.

## A3 — reaction-ODE-limit analytic `∂Loss/∂F` (well-mixed)

In the spatially-uniform (well-mixed) limit the Laplacian vanishes and Gray-Scott
reduces to the ODE `u' = −u v² + F(1−u)`. One explicit-Euler step from uniform
`(u₀, v₀)` gives `u₁ = u₀ + dt·(−u₀v₀² + F(1−u₀))`. With a uniform target and `n²`
cells, `Loss = n²·(u₁ − target)²`, hence the **closed-form** gradient

    ∂Loss/∂F = n²·2·(u₁ − target)·dt·(1 − u₀).

Independent of A1 in physical term (reaction not diffusion), parameter (F not D_u),
and method (ODE limit not Fourier). Autodiff matches it exactly (~1e-15..0).
**Source:** Gray-Scott reaction kinetics — Pearson, *Science* 261:189 (1993);
hand-derivation.

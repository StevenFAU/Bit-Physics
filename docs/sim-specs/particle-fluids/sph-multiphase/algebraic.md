# sph-multiphase — algebraic derivation

Let `W` be the support-2h Monaghan spline and `N(i)` the sorted neighbours.

## Sampling and material identity

\[
\delta_i = W(0)+\sum_{j\in N(i)}W_{ij},\qquad
V_i=1/\delta_i,\qquad \tilde\rho_i=m_i\delta_i.
\]

For equal rest volume, both phases share `delta0`; changing phase mass changes
material density but not the compression constraint.

## Density projection

For predicted velocity `v*`,

\[
\delta_i^*=\delta_i+\Delta t\sum_j(v_i^*-v_j^*)\cdot\nabla W_{ij}.
\]

Only positive compression is corrected. The Jacobi denominator is assembled
from the gradients of this scalar constraint with respect to both particles.
The pair impulse uses one unordered pair and equal-and-opposite force; unequal
mass therefore changes acceleration but not total momentum.

## Viscosity

The interfacial coefficient is the harmonic mean
`mu_ij=2 mu_i mu_j/(mu_i+mu_j)`. The pair force is proportional to
`(v_j-v_i) (r_ij dot grad W_ij)/(r^2+0.01h^2)` and accumulated
antisymmetrically. It is dissipative for positive viscosity.

## Interface and surface force

The normalized color gradient is

\[
g_i=\sum_j V_j(c_j-c_i)\nabla W_{ij},\quad
n_i=g_i/\lVert g_i\rVert.
\]

Cross-phase unordered pairs receive the published compact Akinci cohesion
kernel and the normal-difference curvature term. The shader and f64 reference
use the same branches. `sigma_target` maps to a calibrated coefficient at the
active spacing; the UI reports both values.

## Time step

\[
\Delta t=\min(0.4h/U,\;0.25\sqrt{h/a},\;0.125h^2/\nu_{max},\;
0.4\sqrt{(\rho_A+\rho_B)\Delta x^3/(4\pi\sigma)},\;\Delta t_{max}).
\]

The active limiter is observable. No physical coefficient participates in
frame-rate adaptation.

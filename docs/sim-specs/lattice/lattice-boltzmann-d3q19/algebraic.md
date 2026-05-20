# lattice-boltzmann-d3q19 — Algebraic derivation

> Per charter § 7.9. FACT-tagged. Algebraic reference only per R8
> amendment (no Krüger 2017 vendoring at Phase 1).

## 1. Lattice constants

The full derivation lives at
[`tools/testkit/golden/derivations/d3q19.md`](../../../../tools/testkit/golden/derivations/d3q19.md).
Summary:

- 19 discrete velocities $\{\mathbf{c}_{i}\}_{i=0}^{18}$: 1 rest, 6
  face neighbors at speed 1, 12 edge neighbors at speed $\sqrt 2$.
- Weights $w_{0} = 1/3$, $w_{1..6} = 1/18$, $w_{7..18} = 1/36$.
- Sound speed $c_{s}^{2} = 1/3$.

## 2. Equilibrium distribution

$$f_{i}^{\mathrm{eq}}(\rho, \mathbf{u}) = w_{i}\,\rho\,\Bigl[1 + \frac{\mathbf{c}_{i}\cdot\mathbf{u}}{c_{s}^{2}} + \frac{(\mathbf{c}_{i}\cdot\mathbf{u})^{2}}{2\,c_{s}^{4}} - \frac{\mathbf{u}\cdot\mathbf{u}}{2\,c_{s}^{2}}\Bigr].$$

## 3. BGK collision + streaming

Per Qian, d'Humières & Lallemand (1992) eq. (1):

$$f_{i}(\mathbf{x} + \mathbf{c}_{i}\Delta t, t + \Delta t) = f_{i}(\mathbf{x}, t) - \frac{1}{\tau}\bigl(f_{i}(\mathbf{x}, t) - f_{i}^{\mathrm{eq}}\bigr),$$

where $\tau$ is the BGK relaxation time. The kinematic viscosity is
$\nu = c_{s}^{2}(\tau - 1/2)\Delta t$ (Chapman-Enskog expansion).

## 4. Macroscopic moments

$$\rho(\mathbf{x}, t) = \sum_{i} f_{i}(\mathbf{x}, t),\qquad \rho\,\mathbf{u}(\mathbf{x}, t) = \sum_{i} \mathbf{c}_{i}\,f_{i}(\mathbf{x}, t).$$

These define the macroscopic fluid state recovered from the
distribution functions.

## 5. Boundary conditions

Bounce-back (half-way) for solid walls; equilibrium-extrapolation for
inflow/outflow. Zou-He BCs are out of scope at Phase 1 (charter
§ 7.9 out-of-scope list).

## 6. Reference benchmark

NACA airfoil drag/lift coefficients (per spec § 5.7). Deferred to
Phase 2+ implementation phase for the comparison against published
values.

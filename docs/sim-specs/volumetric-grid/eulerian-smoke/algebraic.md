# eulerian-smoke — Algebraic derivation

> Per charter § 7.8. FACT-tagged.

## 1. Equations

**FACT — citation.** Stam, J. (1999), "Stable Fluids", *SIGGRAPH '99*,
121–128. DOI [10.1145/311535.311548](https://doi.org/10.1145/311535.311548).

Incompressible Navier-Stokes plus a temperature/density scalar:

$$\partial_{t}\mathbf{u} + (\mathbf{u}\cdot\nabla)\mathbf{u} = -\frac{1}{\rho}\nabla p + \nu\,\nabla^{2}\mathbf{u} + \mathbf{f},
\qquad \nabla\cdot\mathbf{u} = 0,$$
$$\partial_{t}\phi + (\mathbf{u}\cdot\nabla)\phi = \kappa\,\nabla^{2}\phi.$$

## 2. Stam stable-fluids pipeline

Per Stam 1999 § 3, each step is:

1. **Advect velocity** (semi-Lagrangian backtrace; MacCormack-corrected
   for second-order accuracy).
2. **Diffuse velocity** (implicit Jacobi or CG; for Reynolds-large
   smoke a single explicit step suffices).
3. **Vorticity confinement** (Fedkiw 2001):
   $\mathbf{f}_{c} = \varepsilon\,(\mathbf{N}\times\boldsymbol{\omega})\Delta x$,
   $\mathbf{N} = \nabla|\boldsymbol{\omega}| / \|\nabla|\boldsymbol{\omega}|\|$.
4. **Pressure projection** via Jacobi: solve
   $\nabla^{2}\,p = \rho/\Delta t\,\nabla\cdot\mathbf{u}^{*}$,
   then $\mathbf{u}^{n+1} = \mathbf{u}^{*} - (\Delta t / \rho)\,\nabla p$.
5. **Advect scalar** $\phi$ (density / temperature) with the
   divergence-free $\mathbf{u}^{n+1}$.

**FACT — citation.** Fedkiw, R., Stam, J., Jensen, H. W. (2001),
"Visual Simulation of Smoke", *SIGGRAPH '01*, 15–22.
DOI [10.1145/383259.383260](https://doi.org/10.1145/383259.383260).

## 3. Manufactured solution

See [`tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/derivation.md`](../../../../tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/derivation.md).
Taylor-Green-style: $u, v$ divergence-free; non-trivial $p$
gradient; SymPy-derived source terms for the momentum equations.
2D; the implementation phase extends to 3D.

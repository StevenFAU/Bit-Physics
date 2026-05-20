# reaction-diffusion-3d — Algebraic derivation

> Per charter § 7.6. FACT-tagged.

## 1. Continuous PDE

**FACT — citations.** Gray, P. & Scott, S. K. (1983), "Autocatalytic
reactions in the isothermal, continuous stirred tank reactor",
*Chem. Eng. Sci.* 39 (6), 1087–1097.
DOI [10.1016/0009-2509(84)87017-7](https://doi.org/10.1016/0009-2509%2884%2987017-7).
Pearson, J. E. (1993), "Complex patterns in a simple system",
*Science* 261 (5118), 189–192.
DOI [10.1126/science.261.5118.189](https://doi.org/10.1126/science.261.5118.189).

3D Gray-Scott (extension of Phase 0's RD-2D):

$$u_t = D_u \,\nabla^{2} u - u v^{2} + F (1 - u),$$
$$v_t = D_v \,\nabla^{2} v + u v^{2} - (F + k)\, v.$$

**Canonical parameters** (Pearson 1993 λ-region):
$D_u = 0.16,\; D_v = 0.08,\; F = 0.0367,\; k = 0.0649,\;
\Delta x = 1,\; \Delta t = 1$.

## 2. Discretization

Explicit forward Euler in time + 7-point centered Laplacian in
space (canonical Stack C choice):

$$u^{n+1}_{i,j,k} = u^{n}_{i,j,k} + \Delta t \,\bigl(D_u\,L_7[u^{n}]_{i,j,k} - u^{n} (v^{n})^{2} + F(1 - u^{n})\bigr),$$

with

$$L_7[u]_{i,j,k} = \tfrac{u_{i\pm 1,j,k} + u_{i,j\pm 1,k} + u_{i,j,k\pm 1} - 6 u_{i,j,k}}{\Delta x^{2}}.$$

The CFL condition for stability is
$\Delta t \le \tfrac{\Delta x^{2}}{2 d\, \max(D_u, D_v)}$ with $d=3$
(spatial dimensions). For $\Delta x = 1$, $D_u = 0.16$: $\Delta t \le 1.04$.
Canonical $\Delta t = 1$ is just inside the stability envelope.

## 3. Regime table (Pearson 1993)

| Regime | $F$ | $k$ | Pattern |
|---|---|---|---|
| λ (canonical) | 0.0367 | 0.0649 | self-replicating spots |
| α | 0.010 | 0.040 | stripes |
| β | 0.020 | 0.046 | self-replicating spots (different style) |

Phase 1 ships the λ regime as canonical; the implementation phase
adds the others as parameter overrides.

## 4. Manufactured solution

See [`tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/derivation.md`](../../../../tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/derivation.md).

Co-bundled MMS for RD-2D at
[`tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/derivation.md`](../../../../tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/derivation.md)
per charter R8 amendment.

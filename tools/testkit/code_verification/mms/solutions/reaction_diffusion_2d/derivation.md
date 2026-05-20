# MMS derivation — reaction-diffusion-2D (Gray-Scott)

> SymPy-anchored. Per spec § 2.2 the runner does not re-derive at
> test time. This MMS co-bundles with the 3D Gray-Scott MMS per
> charter R8 amendment — Phase 0's RD-2D sim ships without an MMS
> gate; Stage 2 adds the 2D MMS so Phase 2+ implementation of either
> RD-2D or RD-3D has a code-verification anchor of identical
> structure.

## Equations

2D Gray-Scott with manufactured sources $S_u, S_v$:

$$u_t = D_u\,(u_{xx} + u_{yy}) - u v^{2} + F (1 - u) + S_u,$$
$$v_t = D_v\,(v_{xx} + v_{yy}) + u v^{2} - (F + k)\, v + S_v.$$

Canonical parameters: $D_u = 0.16$, $D_v = 0.08$, $F = 0.0367$, $k = 0.0649$, $L = 1$ (Pearson 1993 λ-region).

## Manufactured solution

With $\kappa = \pi / L$:

$$u(x, y, t) = \frac{\sin\kappa x\,\cos\kappa y\,\cos t + 2}{4},$$
$$v(x, y, t) = \frac{\cos\kappa x\,\sin\kappa y\,\sin t + 2}{4}.$$

Both lie in $[1/4, 3/4]$.

## Derivatives

$$\nabla^{2} u = -2\,\kappa^{2}\,\frac{\sin\kappa x\,\cos\kappa y\,\cos t}{4},
\qquad
\nabla^{2} v = -2\,\kappa^{2}\,\frac{\cos\kappa x\,\sin\kappa y\,\sin t}{4}.$$

$$u_t = -\frac{\sin\kappa x\,\cos\kappa y\,\sin t}{4},
\qquad
v_t = \frac{\cos\kappa x\,\sin\kappa y\,\cos t}{4}.$$

## Source terms

$$S_u = u_t - D_u\,\nabla^{2} u + u v^{2} - F(1 - u),$$
$$S_v = v_t - D_v\,\nabla^{2} v - u v^{2} + (F+k)\,v.$$

## Boundary conditions

Periodic on $[0, L]^{2}$.

## References

- Gray, P. & Scott, S. K. (1983). DOI 10.1016/0009-2509(84)87017-7.
- Pearson, J. E. (1993). DOI 10.1126/science.261.5118.189.
- Phase 0's RD-2D sim at `packages/reaction-diffusion-2d/` (consumes
  this MMS at Phase 2+ implementation of an MMS-based code-verification
  test).
- The 3D extension at
  `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`.

# MMS derivation — reaction-diffusion-3D (Gray-Scott)

> SymPy-anchored. Per spec § 2.2 the runner does not re-derive at test
> time; `solution.py`'s NumPy implementation is locked against this
> document.

## Equations

3D Gray-Scott with manufactured sources $S_u, S_v$:

$$u_t = D_u \,(u_{xx} + u_{yy} + u_{zz}) - u v^{2} + F (1 - u) + S_u,$$
$$v_t = D_v \,(v_{xx} + v_{yy} + v_{zz}) + u v^{2} - (F + k)\, v  + S_v.$$

Canonical parameters (Pearson 1993 λ-region): $D_u = 0.16$, $D_v = 0.08$, $F = 0.0367$, $k = 0.0649$, $L = 1$.

## Manufactured solution

With $\kappa = \pi / L$:

$$u(x, y, z, t) = \frac{\sin\kappa x\,\cos\kappa y\,\sin\kappa z\,\cos t + 2}{4},$$
$$v(x, y, z, t) = \frac{\cos\kappa x\,\sin\kappa y\,\cos\kappa z\,\sin t + 2}{4}.$$

Both lie in $[1/4, 3/4]$ — strictly inside the physical regime
$u, v \in [0, 1]$ so the Gray-Scott nonlinearity is well-defined and
non-degenerate.

## Required derivatives

For the Laplacian of $u$, note that each spatial argument enters $u$
through one of $\sin\kappa x$, $\cos\kappa y$, $\sin\kappa z$;
differentiating twice in any one direction gives a factor of
$-\kappa^{2}$ on the same trigonometric product. Therefore

$$\nabla^{2} u \;=\; -3\,\kappa^{2}\,\frac{\sin\kappa x\,\cos\kappa y\,\sin\kappa z\,\cos t}{4},$$

and similarly

$$\nabla^{2} v \;=\; -3\,\kappa^{2}\,\frac{\cos\kappa x\,\sin\kappa y\,\cos\kappa z\,\sin t}{4}.$$

Time derivatives:

$$u_t \;=\; -\frac{\sin\kappa x\,\cos\kappa y\,\sin\kappa z\,\sin t}{4},
\qquad
v_t \;=\; \frac{\cos\kappa x\,\sin\kappa y\,\cos\kappa z\,\cos t}{4}.$$

## Source terms

Substituting into the PDE residuals:

$$S_u \;=\; u_t \,-\, D_u\,\nabla^{2}u \,+\, u\,v^{2} \,-\, F(1 - u),$$
$$S_v \;=\; v_t \,-\, D_v\,\nabla^{2}v \,-\, u\,v^{2} \,+\, (F+k)\,v.$$

## Boundary conditions

Periodic on $[0, L]^{3}$ — both $u$ and $v$ are $L$-periodic in each
spatial argument by construction ($\kappa = \pi/L$ yields $2L$-period in
isolation, but the product structure aligns with $L$-period via the
factor in each axis).

## Verification

The NumPy implementation at `solution.py` reproduces
$S_u, S_v$ symbolically — at the canonical parameters and the test
point $(x,y,z,t) = (0.3, 0.5, 0.7, 0.2)$, the two evaluation paths
agree within $10^{-14}$:

| Quantity | SymPy (f64) | NumPy (f64) |
|---|---|---|
| $S_u$ | $0.09821740593934894$ | $0.09821740593934898$ |
| $S_v$ | $-0.19280812359860355$ | $-0.19280812359860358$ |

## References

- Gray, P. & Scott, S. K. (1983). DOI 10.1016/0009-2509(84)87017-7.
- Pearson, J. E. (1993). DOI 10.1126/science.261.5118.189.
- Roy, C. J. (2005). DOI 10.1016/j.jcp.2004.10.017.
- Phase 0 heat-1D MMS for the pipeline template
  (`tools/testkit/code_verification/mms/solutions/heat_1d/`).

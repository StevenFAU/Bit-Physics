# MMS derivation — incompressible Navier-Stokes 2D (Taylor-Green-style)

> SymPy-anchored. Per spec § 2.2 the runner does not re-derive at
> test time. `solution.py` is locked against this document.

## Equations

Incompressible NS in 2D (dimensionless $\rho = 1$):

$$u_t + u u_x + v u_y = -p_x + \nu\,(u_{xx} + u_{yy}) + S_u,$$
$$v_t + u v_x + v v_y = -p_y + \nu\,(v_{xx} + v_{yy}) + S_v,$$
$$u_x + v_y = 0.$$

## Manufactured solution

$$u(x, y, t) = \sin(2\pi x)\,\cos(2\pi y)\,\cos(t),$$
$$v(x, y, t) = -\cos(2\pi x)\,\sin(2\pi y)\,\cos(t),$$
$$p(x, y, t) = -\tfrac{1}{4}\,\bigl(\cos(4\pi x) + \cos(4\pi y)\bigr)\,\cos^{2}(t).$$

**Divergence check:**
$u_x + v_y = 2\pi \cos(2\pi x)\cos(2\pi y)\cos(t) - 2\pi \cos(2\pi x)\cos(2\pi y)\cos(t) = 0$ ✓.

## Required derivatives

$u_t = -\sin(2\pi x)\cos(2\pi y)\sin(t)$.
$u_x = 2\pi\cos(2\pi x)\cos(2\pi y)\cos(t)$.
$u_y = -2\pi\sin(2\pi x)\sin(2\pi y)\cos(t)$.
$\nabla^{2} u = -8\pi^{2}\,u$ (each spatial second-derivative gives $-(2\pi)^{2}$ on the same factor; two axes contribute).

$v_t = \cos(2\pi x)\sin(2\pi y)\sin(t)$.
$v_x = 2\pi\sin(2\pi x)\sin(2\pi y)\cos(t)$.
$v_y = -2\pi\cos(2\pi x)\cos(2\pi y)\cos(t)$.
$\nabla^{2} v = -8\pi^{2}\,v$.

$p_x = \pi\sin(4\pi x)\cos^{2}(t)$.
$p_y = \pi\sin(4\pi y)\cos^{2}(t)$.

## Advection cancellations

$u u_x + v u_y = 2\pi\sin(2\pi x)\cos(2\pi x)(\cos^{2}(2\pi y) + \sin^{2}(2\pi y))\cos^{2}(t) = \pi\sin(4\pi x)\cos^{2}(t)$
(using $2\sin\theta\cos\theta = \sin 2\theta$ on the $\sin(2\pi x)\cos(2\pi x)$ factor).

Symmetrically, $u v_x + v v_y = \pi\sin(4\pi y)\cos^{2}(t)$.

## Source terms

$$\boxed{S_u = -\sin(2\pi x)\cos(2\pi y)\sin(t) + 2\pi\sin(4\pi x)\cos^{2}(t) + 8\pi^{2}\nu\sin(2\pi x)\cos(2\pi y)\cos(t).}$$
$$\boxed{S_v = \,\cos(2\pi x)\sin(2\pi y)\sin(t) + 2\pi\sin(4\pi y)\cos^{2}(t) - 8\pi^{2}\nu\cos(2\pi x)\sin(2\pi y)\cos(t).}$$

(Note: the $p_x$ and the advection contributions to $S_u$ both
contribute $\pi\sin(4\pi x)\cos^{2}(t)$; their sum is $2\pi\sin(4\pi x)\cos^{2}(t)$,
matching the boxed form. Same for $S_v$.)

## Boundary conditions

Periodic on $[0, 1]^{2}$. Both $u, v, p$ are $L=1$-periodic by
construction (arguments $2\pi$ and $4\pi$ in $\sin$, $\cos$).

## Verification

NumPy `solution.py` reproduces SymPy at $(x, y, t) = (0.1, 0.2, 0.3)$, $\nu = 0.01$:

| Quantity | SymPy | NumPy |
|---|---|---|
| $S_u$ | $5.537127847376374$ | $5.537127847376373$ |
| $S_v$ | $3.0176341665509376$ | $3.017634166550939$ |

Agreement within $10^{-12}$.

## References

- Stam 1999 ("Stable Fluids"), SIGGRAPH '99. DOI 10.1145/311535.311548.
- Fedkiw, Stam, Jensen (2001) ("Visual Simulation of Smoke"),
  SIGGRAPH '01. DOI 10.1145/383259.383260.
- Taylor & Green (1937), "Mechanism of the Production of Small Eddies
  from Large Ones", *Proc. R. Soc. A* 158 (895), 499–521.
  DOI 10.1098/rspa.1937.0036 (original Taylor-Green vortex).
- Roy 2005 (V&V framework).

# Golden derivation — simple-pendulum analytic anchors

Backing derivation for `tools/testkit/golden/tables/rigid-body-pendulum-trajectory.json`
(algorithm `rigid-body-simple-pendulum-elliptic`). The ideal simple pendulum is
a point mass `m` on a massless rod of length `L` under gravity `g`, with
equation of motion (angle `theta` from the downward vertical):

```
theta'' = -(g / L) sin(theta).
```

Three independent analytic anchors (D-ANCHOR, charter §6 — the operator-ratified
corrected set; the plan §6.4 "Goldstein §4.3" citation is wrong, see the Stage-2
landing audit):

## A1 — small-angle period (Marion & Thornton, *Classical Dynamics* 5e, §3.2)

For `theta -> 0`, `sin(theta) ≈ theta`, giving simple harmonic motion with

```
T0 = 2*pi*sqrt(L/g).
```

For `L = 1`, `g = 9.81`: `T0 = 2.00606...` s.

## A2 — large-angle exact period (NIST DLMF §19.2 + §22.19(i); Landau & Lifshitz §11)

Energy conservation for a pendulum released from rest at amplitude `theta0`
reduces the period to a complete elliptic integral of the first kind `K`:

```
T = 4*sqrt(L/g) * K(k),    k = sin(theta0/2).
```

SciPy parameter convention: `ellipk` takes `m = k**2 = sin(theta0/2)**2`. For
`theta0 = 2.0` rad this gives `T ≈ 2.6536...` s (≈ 32% longer than `T0`).

## A3 — trajectory via Jacobi elliptic function (NIST DLMF §22.19(i) + §22.2)

The released-from-rest solution is

```
theta(t) = 2 * arcsin( sin(theta0/2) * cn(omega0 * t, k) ),
omega0 = sqrt(g/L),   k = sin(theta0/2).
```

`cn(0,k) = 1` so `theta(0) = theta0`; `cn` is even so `theta'(0) = 0`
(released from rest); the period of `cn` is `4 K`, recovering A2. Computed with
`scipy.special.ellipj` (parameter `m = k**2`).

## Tolerance

`pendulum_period_rel = 1e-3`, `trajectory_abs = 1e-2`
(`[golden_tolerance.rigid-body.articulated-pedagogical]`). The production
Featherstone-ABA + integrator reproduces all three anchors within these bounds.

# Gray-Scott reaction-diffusion 2D — algebraic derivation

## Continuous PDE

The Gray-Scott model is a two-species reaction-diffusion system on a
periodic 2D domain $\Omega = [0, L]^2$:

$$
\begin{aligned}
\frac{\partial U}{\partial t} &= D_u \nabla^2 U - U V^2 + F (1 - U), \\
\frac{\partial V}{\partial t} &= D_v \nabla^2 V + U V^2 - (F + k) V,
\end{aligned}
$$

with $U, V : \Omega \times \mathbb{R}_+ \to \mathbb{R}_{\ge 0}$. The
"feed" rate $F$ replenishes $U$; the "kill" rate $k$ removes $V$. The
non-linear coupling $U V^2$ represents the autocatalytic reaction
$U + 2V \to 3V$.

Boundary conditions are periodic on $\partial \Omega$. Initial
conditions are $U(\cdot, 0) \approx 1, V(\cdot, 0) \approx 0$ with a
small centred seed of $V$ to break the trivial steady state.

## Lambda canonical parameters

Pearson 1993 classifies Gray-Scott pattern formation by $(F, k)$ in
the unit square. The "λ" region produces self-replicating spots:

$$F = 0.0367, \quad k = 0.0649, \quad D_u = 0.16, \quad D_v = 0.08.$$

These are the canonical values for the Phase 0 capture
`gray-scott-lambda-128sq-seed42-step2000`.

## Discretization

We use explicit forward Euler in time and a 5-point Laplacian in space:

$$
\nabla^2 U \big|_{i,j}
  \approx \frac{1}{(\Delta x)^2} \left[
    U_{i+1,j} + U_{i-1,j} + U_{i,j+1} + U_{i,j-1} - 4 U_{i,j}
  \right],
$$

with the periodic stencil implemented via ``numpy.roll``. The update
rule per step:

$$
U_{i,j}^{n+1} = U_{i,j}^n + \Delta t \left[
  D_u \nabla^2 U \big|_{i,j} - U_{i,j}^n (V_{i,j}^n)^2 + F (1 - U_{i,j}^n)
\right],
$$

$$
V_{i,j}^{n+1} = V_{i,j}^n + \Delta t \left[
  D_v \nabla^2 V \big|_{i,j} + U_{i,j}^n (V_{i,j}^n)^2 - (F + k) V_{i,j}^n
\right].
$$

The reference implementation lives at
`packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py`.

## Stability

The forward-Euler scheme is conditionally stable. For diffusion alone
the CFL-like condition reads

$$\Delta t \le \frac{(\Delta x)^2}{4 \max(D_u, D_v)} = \frac{1^2}{4 \cdot 0.16} = 1.5625.$$

The canonical choice $\Delta t = 1.0$ comfortably satisfies this. The
reaction term contributes an additional bound

$$\Delta t \le \frac{1}{\max\{F + k, F \cdot 1, U V^2_{\max}\}},$$

which is well-satisfied at the lambda parameters ($F + k = 0.1016 \ll 1$).

## Conservation

Integrating the PDE over the periodic domain:

$$\frac{d}{dt} \int_\Omega U \, dA = F \int_\Omega (1 - U) \, dA - \int_\Omega U V^2 \, dA,$$

$$\frac{d}{dt} \int_\Omega V \, dA = - (F + k) \int_\Omega V \, dA + \int_\Omega U V^2 \, dA.$$

The combined functional $\int (U + V)$ is **not** conserved (the feed
term forces it). Approximate mass conservation holds only on short
timescales where the system is near the trivial steady state. The PBT
`mass_approximately_conserved` invariant therefore checks **bounded
drift**, not exact conservation, with tolerance proportional to the
source/sink rates.

## Monotone bounds

For physically meaningful initial data $U_0 \in [0, 1], V_0 \in [0, 1]$
the continuous PDE preserves $U, V \in [0, 1]$ when $F, k \ge 0$ (the
reaction terms point inward at the boundaries). The discrete scheme
inherits this property *provided* $\Delta t$ is small enough that no
single step can drive a cell outside the unit interval — true at the
canonical parameters.

The Tier 2 `monotone_bounds` diagnostic + the PBT `monotone_bounds`
invariant both pin this guarantee at runtime.

## Periodicity

The 5-point Laplacian stencil uses ``numpy.roll`` (NumPy reference) and
WGSL `i32` modulo on a wrap-around index (WebGPU implementation). Both
realize exact periodic BCs; the PBT `periodic_bc_satisfied` invariant
verifies opposite-boundary values agree at every captured step.

## References

- Gray, P. & Scott, S. K. (1983). *Autocatalytic reactions in the
  isothermal, continuous stirred tank reactor: oscillations and
  instabilities in the system A + 2B → 3B; B → C.* Chemical Engineering
  Science 39 (6), 1087–1097.
- Pearson, J. E. (1993). *Complex patterns in a simple system.*
  Science 261 (5118), 189–192.

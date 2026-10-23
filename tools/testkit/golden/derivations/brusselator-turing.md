# Brusselator — Turing dispersion relation and the in-browser check

> Golden-anchor derivation for
> `tools/testkit/golden/tables/continuous-ca/brusselator-turing-dispersion.json`, and the
> analytic basis of the Turing Patterns v2 Prove-drawer check
> (`docs/planning/rebuild-v2/01-reaction-diffusion.md`, § The proof). Reference
> implementation: `packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/models.py`;
> TypeScript mirror: `packages/reaction-diffusion-2d/web/src/v2/model/dispersion.ts`.
> No vendored code.

## 1. Model and uniform state

The Brusselator (Prigogine & Lefever 1968) with diffusion:

```
du/dt = Du lap(u) + A - (B + 1) u + u^2 v
dv/dt = Dv lap(v) + B u - u^2 v
```

Setting the reaction terms to zero gives the unique uniform state `u* = A`, `v* = B / A`.
The Jacobian there is

```
J = | f_u  f_v |  =  | B - 1    A^2 |
    | g_u  g_v |     |  -B     -A^2 |
```

with `tr J = B - 1 - A^2` and `det J = A^2 > 0`.

## 2. Dispersion relation (continuum)

A perturbation `exp(sigma t + i q.x)` of the uniform state grows at the eigenvalues of
`J - Q diag(Du, Dv)`, `Q = |q|^2`:

```
sigma(Q) = ( T(Q) + sqrt(T(Q)^2 - 4 D(Q)) ) / 2
T(Q) = tr J - (Du + Dv) Q
D(Q) = (f_u - Du Q)(g_v - Dv Q) - f_v g_u
```

(real part `T/2` when the discriminant is negative). `fastest_growing_continuum` maximises
`sigma` over `Q` by bracketing on a 2000-point grid and golden-section search.

**Hopf line (anchor 3).** At `Q = 0`, `D(0) = det J = A^2 > 0`, so the uniform state is stable to
homogeneous perturbations iff `tr J < 0`, i.e. `B < B_H = 1 + A^2`. At `B = B_H`,
`Re sigma(0) = tr J / 2 = 0`, which is Prigogine & Lefever's limit-cycle threshold.

## 3. Turing onset (anchors 1 and 2)

With `tr J < 0` the only way to get `sigma > 0` is `D(Q) < 0` for some `Q > 0`. `D` is a
quadratic in `Q`, `D(Q) = Du Dv Q^2 - (Dv f_u + Du g_v) Q + det J`. Its minimum is at

```
Q_min = (Dv f_u + Du g_v) / (2 Du Dv)
```

and the minimum value is `det J - (Dv f_u + Du g_v)^2 / (4 Du Dv)`. Onset is when the minimum
value touches zero:

```
(Dv f_u + Du g_v)^2 = 4 Du Dv det J,   Q_c = Q_min = sqrt(det J / (Du Dv))
```

(Murray 2003, § 2.3). For the Brusselator, `Dv (B - 1) - Du A^2 = 2 A sqrt(Du Dv)` gives

```
B_c = 1 + A^2 Du/Dv + 2 A sqrt(Du/Dv) = (1 + A eta)^2,    eta = sqrt(Du / Dv)
q_c^2 = sqrt(A^2 / (Du Dv)) = A / sqrt(Du Dv)
```

(Peña & Pérez-García 2001, § II). At `B = B_c`, the larger eigenvalue at `Q_c` is exactly zero
(`D(Q_c) = 0`, `T(Q_c) < 0`), and it is negative at every other `Q`, so `max sigma = 0` at
`Q* = q_c^2`. Anchor 1 uses the Brusselator closed forms at `A = 4.5`; anchor 2 applies Murray's
general condition, independently, to the Jacobian at `A = 2`. Both use `Du = 1`, `Dv = 10`.

Values: `A = 4.5`: `B_c = 5.871049894151540`, `q_c^2 = 1.423024947075771`, `B_H = 21.25`.
`A = 2`: `B_c = 2.664911064067352`, `q_c^2 = 0.632455532033676`.

## 4. The discrete scheme

The GPU runs a 5-point Laplacian with spacing `dx` and forward Euler with step `dt` on a periodic
`n x n` grid. A Fourier mode `(kx, ky)` (radians per cell) sees the stencil eigenvalue

```
lambda = (4 / dx^2) (sin^2(kx / 2) + sin^2(ky / 2))      (-> |q|^2 as dx -> 0)
```

and is multiplied every step by the eigenvalues of `I + dt (J - lambda diag(Du, Dv))`; its growth
rate per unit time is `ln rho / dt`, `rho` the spectral radius. The check's prediction is the ring
(r waves per n-cell window) whose angle-averaged discrete growth rate is largest:
`fastest_growing_discrete`, 720 angles over a quadrant, maximised in `r` by golden-section search.
At the scene's parameters (`A = 4.5`, `B = 6.75`, `Du = 1`, `Dv = 10`, `dx = 0.5`, `dt = 1/256`,
`n = 256`) the discrete-scheme peak is r* = 26.350. The continuum maximum, mapped to rings, is
26.008: the stencil shifts the fastest-growing ring by 1.3%, which the check resolves. The onset
wavenumber `q_c` maps to 24.30. The test
`packages/reaction-diffusion-2d/tests/test_model_goldens.py` checks that the discrete rate converges
to the continuum rate at second order in `dx`.

## 5. The measurement (Prove drawer)

The live kernel starts the 256 x 256 periodic dish at the uniform state plus 2^-7 dyadic noise
(12 bits, exactly representable in f32). It reads the Learn instrument's spectrum (Hann window,
2D FFT, mean power per `round(|k|)` ring) of the drawn field `u`, less the uniform state `u*`, at
steps `t1 = 160` and `t2 = 800`. The
noise's projection onto each mode cancels in the ratio, so

```
sigma_meas(r) = ln( P(r, t2) / P(r, t1) ) / (2 (t2 - t1) dt)
```

is the measured dispersion relation. Its peak, from a least-squares quadratic over the 7 rings
around the maximum, must lie within the declared band (`turing_wavenumber_rel` in
`tools/testkit/equivalence/tolerance.toml`, `[golden_tolerance.continuous-ca.reaction-diffusion-2d]`)
of r*. Both snapshots fall in the linear regime (deviations about 0.2% of `u*`), before the
nonlinear harmonics at 2 r* appear. Smaller noise is not resolvable by the f32 solver: at 2^-13
each step's change to the perturbation is about one ulp of `u*`, and the measured peak scattered
by up to 9% on the GPU (reproduced by an f32 NumPy proxy). Comparing the raw spectral peak after a single snapshot would
be biased low by 6–11% at these times, because the white-noise start feeds each mode unequally.

## References

- Prigogine, I. & Lefever, R. (1968). Symmetry breaking instabilities in dissipative systems. II.
  *J. Chem. Phys.* 48, 1695. doi:10.1063/1.1668896
- Murray, J. D. (2003). *Mathematical Biology II: Spatial Models and Biomedical Applications*,
  3rd ed., Springer, § 2.3. doi:10.1007/b98869
- Peña, B. & Pérez-García, C. (2001). Stability of Turing patterns in the Brusselator model.
  *Phys. Rev. E* 64, 056213. doi:10.1103/PhysRevE.64.056213

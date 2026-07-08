# Derivation — erfc / product-form bounded block (golden D)

> **Canonical references:** Crank, *The Mathematics of Diffusion*, 2nd ed.
> (1975), p. 25 (product form); Zhou, Oldenburg, Rutqvist & Birkholzer,
> "Revisiting the Fundamental Analytical Solutions of Heat and Mass
> Transfer," *Water Resources Research* 53:9960–9979 (2017),
> DOI 10.1002/2017WR021040; Carslaw & Jaeger § 2.4 (similarity solution).
> Spec: `docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md` § 4.5.

Algorithm: `heat-equation-erfc-product-block`. Category: `volumetric-grid`.

## 1. Semi-infinite erfc (similarity solution)

Suddenly-applied fixed surface temperature on a half-space: with
dimensionless depth `x'` and Fourier number `t_d`, the accomplished ratio is

```
T_d = erfc( x' / (2·√t_d) ).
```

Converges from the wall inward; the early-time workhorse.

## 2. Symmetric slab eigenmode series

For `|x_d| ≤ 1` (half-thickness 1) with both faces stepped to `T_s`, the
**unaccomplished (deficit) ratio** `θ = (T-T_s)/(T_i-T_s)` is

```
θ(x_d, t_d) = Σ_{n≥1} [4(-1)^{n+1}/((2n-1)π)] · exp(-ζ_n² t_d) · cos(ζ_n x_d),
ζ_n = (2n-1)π/2
```

Each mode decays as `exp(-ζ² t_d)`; the committed truncation tail bound
`(4/((2K+1)π))·exp(-ζ_{K+1}² t_d)` is recorded per point and sits far below
the table tolerance at K = 64. Wall identity: `θ(±1, t_d) = 0` exactly
(`cos(ζ_n) = 0`) — asserted in-generator, and it is what makes the sign
convention testable (see § 3).

## 3. Product form — the PINNED sign convention (v0.3)

The product rule applies to the **unaccomplished** ratio: for a rectangular
block with uniform `T_i`, the same step BC on every exposed face pair, no
generation, and constant properties,

```
θ_2D(x_d, y_d, t_dx, t_dy) = θ_x(x_d, t_dx) · θ_y(y_d, t_dy)
⇒ accomplished T_d = 1 - θ_x·θ_y  =  1 - (1-T_d,x)(1-T_d,y).
```

**NOT** `∏ T_d,i`. The executable pin: at a wall (`x_d = 1`) the correct
convention gives `T_d = 1` for all `y_d, t_d`; the wrong one gives
`T_d = T_d,y ≠ 1` (`test_product_form_sign_convention`).

## 4. Independent-reference anchors

1. **Dual-library erfc**: `math.erfc` (CPython libm) vs
   `scipy.special.erfc` asserted in-generator at every erfc point.
2. **Series tail bound** committed per slab point.
3. **Overlap consistency**: at small `t_d` the slab series near a wall must
   reproduce the semi-infinite erfc profile (the second wall's image term
   is ~1e-15 there) — `test_erfc_slab_series_agree_in_overlap`.
4. **Empirical teeth**: the Dirichlet FTCS plate run converges to the
   product form at second order (`test_dirichlet_plate_matches_product_form`,
   measured N=48 → N=96 error ratio > 2.5).

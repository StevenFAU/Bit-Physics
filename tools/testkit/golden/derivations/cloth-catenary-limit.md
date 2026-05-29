# Golden derivation — mass-spring-cloth: the catenary limit

> Phase 3 task-5 (`mass-spring-cloth`) golden derivation. Produces the
> independent-reference anchors for `cloth-hanging.json` (catenary-limit). Three
> independent anchors per spec § 2.4 (D-ANCHOR): (1) analytic catenary form,
> (2) a hand-derived differential-element force balance, (3) a textbook /
> variational cross-check. Bender PositionBasedDynamics is NOT an anchor here
> (it is a cross-check oracle for the XPBD *algebra*, not the catenary *physics*).
>
> **Cite-correction (D-ANCHOR, web-verified at Stage 1b):** the plan's section
> cites are wrong/suspect — Symon §10.2 is tensors (WRONG), Marion & Thornton
> §6.4 is the second-form Euler equation (the hanging-chain constrained problem
> is §6.6), Beer & Johnston's catenary is a Ch. 7 section (NOT a "Table 7.2").

## Setup

A uniform, perfectly flexible, **inextensible** cable of total length `S` and
weight-per-unit-length `w` hangs under uniform gravity `g` (so `w = ρg`, `ρ` =
mass per unit length), pinned at two points **at equal height** separated
horizontally by span `D = 2X` (`X = D/2`). The cable has slack: `S > D`.

The XPBD mass-spring chain (n particles, rest spring length `r`, total rest
`S = (n−1)·r`) approaches this ideal in the stiff (`compliance → 0`,
high-iteration) limit. The golden compares the settled chain to this analytic
shape; the finite-stiffness residual is characterised (and reduced by raising
`iterations`, NOT by widening `catenary_shape_rel` — spec § 2.6).

## Anchor 1 — analytic catenary

The shape of a hanging inextensible cable under self-weight is the catenary

    y(x) = a · cosh(x / a) ,    a = H / w = T₀ / (ρg) ,

where `H = T₀` is the (constant) horizontal tension component and `a` is the
catenary parameter. Reference: **Beer & Johnston, _Vector Mechanics for
Engineers: Statics_, Ch. 7 (Cables — the catenary)** (verify exact §/edition at
use; the catenary is a Ch. 7 section, NOT "Table 7.2").

## Anchor 2 — independent hand-derivation (differential-element force balance)

Take the lowest point of the cable as the origin; `x` horizontal, `y` upward.
Consider the cable segment from the lowest point to a point `(x, y)` with arc
length `s`. Three forces act on it:

- horizontal tension `H` at the lowest point (purely horizontal there),
- tension `T` at `(x, y)`, tangent to the curve,
- weight `W = w·s` downward.

Static equilibrium:

    horizontal:  T cosθ = H              (H constant — no horizontal load)
    vertical:    T sinθ = w·s

Dividing,  `tanθ = dy/dx = (w/H)·s = s/a`,  with `a ≡ H/w`.

Differentiate w.r.t. `x` and use `ds/dx = sqrt(1 + (dy/dx)²)`:

    d²y/dx² = (1/a)·ds/dx = (1/a)·sqrt(1 + (dy/dx)²).

Let `p = dy/dx`. Then `dp / sqrt(1+p²) = dx/a`, so `sinh⁻¹(p) = x/a + C₁`. With
the lowest point at `x = 0` (`p = 0`) ⇒ `C₁ = 0`, hence

    dy/dx = sinh(x / a) ,   and integrating with `y(0)=0`:   y(x) = a(cosh(x/a) − 1).

This matches Anchor 1 (up to the additive constant fixing the origin). The arc
length from `−X` to `X`:

    S = ∫_{−X}^{X} sqrt(1 + sinh²(x/a)) dx = ∫_{−X}^{X} cosh(x/a) dx
      = 2a · sinh(X / a).                                          (★)

## Anchor 3 — variational cross-check + small-sag limit

Minimising the gravitational potential energy `∫ ρg·y ds` subject to **fixed arc
length** `∫ ds = S` (a Lagrange-multiplier / auxiliary-condition problem) yields
the same Euler equation and the same catenary. Reference: **Marion & Thornton,
_Classical Dynamics_, §6.6 ("Euler's Equations When Auxiliary Conditions Are
Imposed")** — NOT §6.4 (the second-form Euler equation / catenoid). Small-sag
consistency (`x ≪ a`): `cosh(x/a) ≈ 1 + x²/(2a²)`, so `y ≈ a + x²/(2a)` — the
parabola of a lightly-loaded cable, the standard limit check.

## Producing the golden values

Given pin span `D` (so `X = D/2`) and total cable length `S = (n−1)·r`:

1. Solve (★) `2a·sinh(X/a) = S` for the catenary parameter `a > 0` (monotone in
   `1/a`; bisection / Newton on `f(a) = 2a·sinh(X/a) − S`).
2. Place the cable with pins at `(0, 0)` and `(D, 0)` (equal height). In
   centred coordinates `x' = x − X`, the shape is

       y(x') = a·(cosh(x'/a) − cosh(X/a))            (≤ 0; sags below the pins).

3. The golden sample positions are the cable points at the chain's arc-length
   stations `s_k = k·r` (`k = 0..n−1`), mapped to `(x_k, y_k)` via
   `s(x') = a·sinh(x'/a) + a·sinh(X/a)` (arc length measured from the left pin).
   Each particle `k` sits at arc length `s_k`; invert `s(x')` for `x'_k`, then
   `y_k = a(cosh(x'_k/a) − cosh(X/a))`, `x_k = x'_k + X`.

The Stage-1b golden generator writes these `(x_k, y_k)` to `cloth-hanging.json`
with `independent_reference` provenance per anchor, and the doctest compares the
settled XPBD chain to them within `catenary_shape_rel` (the measured stiff-limit
residual).

## Stretched (linear-elastic) companion — `cloth-stretched.json`

A chain pinned at both ends a distance `G > S = (n−1)·r` apart, gravity off:
series springs share tension equally, so the equilibrium is a straight,
**uniformly stretched** line — particle `k` at `x_k = k·G/(n−1)`, `y_k = z_k = 0`,
each spring at length `G/(n−1)`. This is the Hooke linear-superposition anchor
(uniform extension under uniform tension). The golden stores these positions;
`position_abs` is the tolerance.

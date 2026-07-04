# Derivation — PIC/FLIP grid→particle→grid transfer error (Zhu thesis eq. 3.8, the 1/9 coefficient)

> **Canonical reference:** Zhu, Y. (2005), *Animating Sand as a
> Fluid*, MSc thesis, University of British Columbia, eq. (3.8)
> (<https://www.cs.ubc.ca/~rbridson/docs/yzhu_msc.pdf>); the published
> companion is Zhu, Y. & Bridson, R. (2005), "Animating Sand as a
> Fluid", *ACM Transactions on Graphics* 24 (3), 965–972.
> DOI [10.1145/1073204.1073298](https://doi.org/10.1145/1073204.1073298).

Statement (thesis eq. 3.8): for the classic PIC transfer pair — grid
values sampled to particles by **linear interpolation** (tent of
radius $\Delta x$) and gathered back to a node by the **same tent
weight**, with particles **uniformly distributed over the half-cell**
$|y - x_0| \le \Delta x/2$ around the node — a smooth field $f$
returns as

$$\tilde f(x_0) = f(x_0) + \tfrac{1}{9}\,f''(x_0)\,\Delta x^2 + O(\Delta x^3).$$

Scope note (spec v0.2 § 7): the coefficient is **specific to exactly
this kernel/support combination**; no other-kernel variant is claimed.

## 1. Setup (unit spacing, node at the origin)

Take $\Delta x = 1$, $x_0 = 0$, nodes at integers, and
$f(x) = a + bx + cx^2$ (so $f'' = 2c$). For $y \in [0, 1]$ linear
interpolation gives

$$f_I(y) = (1-y)\,f(0) + y\,f(1),$$

and for $y \in [-1, 0]$: $f_I(y) = (1+y)\,f(0) - y\,f(-1)$. The
particle-weighted gather at the node, with tent weight $w(y) = 1-|y|$
and particles uniform on $[-\tfrac12, \tfrac12]$, has the continuum
(infinite-particle) limit

$$\tilde f(0) = \frac{\int_{-1/2}^{1/2} w(y)\, f_I(y)\, dy}
                     {\int_{-1/2}^{1/2} w(y)\, dy}.$$

## 2. Exact evaluation

Denominator: $\int_{-1/2}^{1/2} (1-|y|)\,dy = 2(\tfrac12-\tfrac18) = \tfrac34$.

Split the error into the two standard contributions:

**(a) Smoothing of $f$ itself.** $\int w\,f\,dy / \int w
= f(0) + c\,\langle y^2\rangle_w$ with
$\langle y^2\rangle_w = \dfrac{2\int_0^{1/2}(1-y)\,y^2\,dy}{3/4}
= \dfrac{2(\tfrac{1}{24}-\tfrac{1}{64})}{3/4} = \dfrac{5}{72}$,
contributing $c\cdot\tfrac{5}{72} = \tfrac{5}{144}\,f''$.

**(b) Interpolation error.** For $y$ in cell $[0,1]$,
$f_I(y) - f(y) = c\,y(1-y)$ (exact for a quadratic); symmetrically on
$[-1,0]$. Weighted average over the particle band:

$$\langle y(1-y)\rangle_w
= \frac{2\int_0^{1/2}(1-y)\cdot y(1-y)\,dy}{3/4}
= \frac{2\int_0^{1/2} y(1-y)^2\,dy}{3/4}
= \frac{2\cdot\tfrac{11}{192}}{3/4} = \frac{11}{72},$$

(with $\int_0^{1/2} y(1-y)^2\,dy = \tfrac18-\tfrac1{12}+\tfrac1{64}
= \tfrac{11}{192}$), contributing $\tfrac{c\cdot 11}{72}
= \tfrac{11}{144}\,f''$.

**Total:**

$$\tilde f(0) - f(0) = \Big(\tfrac{5}{144} + \tfrac{11}{144}\Big) f''
 = \tfrac{16}{144}\,f'' = \tfrac{1}{9}\,f''(x_0)\,\Delta x^2 .$$

The linear term $b$ contributes nothing (odd moments of the symmetric
tent vanish, and interpolation is exact for linear $f$) — the
generator verifies the $b$-independence with two distinct $b$ values.

The generator `tools/testkit/golden/generator/pic_flip_transfer_error.py`
performs the piecewise polynomial integration **in exact rational
arithmetic** (`fractions.Fraction`) — no floating-point rounding
enters the identity; the committed table pins both the continuum
value and a discrete midpoint-rule particle ladder ($n \in \{4, 16,
64\}$ particles) converging to it at $O(n^{-2})$.

## 3. Independent-reference anchors

1. **Hand derivation** — § 2 above (both contributions shown; exact
   rational sum $16/144 = 1/9$).
2. **Zhu (2005) thesis eq. (3.8)** — the published coefficient for the
   same kernel/support pair (verified verbatim against the thesis
   during the spec v0.2 review).
3. **Discrete midpoint-rule ladder** — the finite-particle sums (exact
   rationals, table-pinned) converge to the continuum value at the
   midpoint rule's $O(n^{-2})$, an independent numerical confirmation
   of the same limit.

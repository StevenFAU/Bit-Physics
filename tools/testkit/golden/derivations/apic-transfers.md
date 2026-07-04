# Derivation — APIC transfers: weights second moment, angular momentum, affine round trip

> **Canonical references:**
> - Jiang, C., Schroeder, C., Selle, A., Teran, J. & Stomakhin, A.
>   (2015), "The Affine Particle-In-Cell Method", *ACM Transactions on
>   Graphics* 34 (4), Article 51 (SIGGRAPH 2015).
>   DOI [10.1145/2766996](https://doi.org/10.1145/2766996).
>   Companion tech report (Propositions 5.1, 5.4, 5.5):
>   <https://cs.ucr.edu/~craigs/papers/2015-apic/tech-doc.pdf>.
> - Jiang, C., Schroeder, C. & Teran, J. (2017), "An angular momentum
>   conserving affine-particle-in-cell method", *Journal of
>   Computational Physics* 338, 137–164.
>   DOI [10.1016/j.jcp.2017.02.050](https://doi.org/10.1016/j.jcp.2017.02.050)
>   (arXiv:1603.06188).
> - Jiang, C., Schroeder, C., Teran, J., Stomakhin, A. & Selle, A.
>   (2016), "The Material Point Method for Simulating Continuum
>   Materials", *SIGGRAPH 2016 Courses*, § 10.1 eq. (174)
>   (`Dp = (1/4) Δx² I` for the quadratic B-spline).
>   DOI [10.1145/2897826.2927348](https://doi.org/10.1145/2897826.2927348).
> - Shape function `N(x)` and base-node convention: identical to the
>   repo golden at
>   `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`
>   and its derivation
>   `tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md`
>   (FP-equivalence asserted by the pic-flip gate-5 test).

All identities below are proven **in exact rational arithmetic** by
the generators (`fractions.Fraction`); the committed tables
additionally carry a *dyadic-rational* configuration for which every
binary64 intermediate is exactly representable, so the f64 test
asserts bit-for-bit equality **by construction** (the FP-honesty rule,
sim spec `docs/sim-specs/particle-fluids/pic-flip/spec-ref.md` § 7).

## 1. Conventions

Quadratic B-spline `N(x)` (unit grid spacing; see the mls-mpm
derivation § 1). Base-node convention `base = floor(p + 0.5) - 1`;
the particle interacts with nodes `base, base+1, base+2`; the
fractional offset is `fp = p - base ∈ [0.5, 1.5)`, and the three
weights are

$$w_0 = \tfrac{1}{2}(\tfrac{3}{2}-f_p)^2,\qquad
  w_1 = \tfrac{3}{4} - (f_p-1)^2,\qquad
  w_2 = \tfrac{1}{2}(f_p-\tfrac{1}{2})^2 .$$

Node offsets from the particle, in grid units: $r_k = k - f_p$ for
$k \in \{0,1,2\}$ (physical offsets $r_k\,\Delta x$).

## 2. Weight moments (the `Dp` closed form)

Zeroth moment (partition of unity): $\sum_k w_k = 1$ — proven in the
mls-mpm derivation § 3.

First moment (linear reproduction):

$$\sum_k w_k\,r_k = 0 \quad\text{for all } f_p .$$

Expand with $u = f_p - 1 \in [-\tfrac12,\tfrac12)$, so
$r_0 = -1-u,\ r_1=-u,\ r_2=1-u$ and
$w_0=\tfrac12(\tfrac12-u)^2,\ w_1=\tfrac34-u^2,\ w_2=\tfrac12(\tfrac12+u)^2$:

$$\sum_k w_k r_k
 = -\tfrac12(\tfrac12-u)^2(1+u) - u(\tfrac34-u^2) + \tfrac12(\tfrac12+u)^2(1-u)$$

The odd part in $u$ collects to $-u(\tfrac14+u^2+\tfrac34-u^2-... )$;
direct expansion gives $0$ identically (the generator re-proves this
as a `Fraction` identity at several rational $u$; a polynomial of
degree 3 vanishing at 4 points vanishes identically).

Second moment (the APIC inertia tensor):

$$\sum_k w_k\,r_k^2 = \tfrac{1}{4} \quad\text{for all } f_p ,$$

so in $d$ dimensions, by the tensor-product structure and the zeroth /
first moments,

$$D_p = \sum_{\mathbf i} w_{\mathbf i p}\,(\mathbf x_{\mathbf i}-\mathbf x_p)(\mathbf x_{\mathbf i}-\mathbf x_p)^{\mathsf T}
     = \tfrac{1}{4}\,\Delta x^{2}\,\mathbf I ,$$

with **zero off-diagonal entries** (each off-diagonal factorises into a
product containing a first moment, which is $0$). This is SIGGRAPH
2016 course notes § 10.1 eq. (174); the generator proves the 1D second
moment as a `Fraction` identity at 5 rational $f_p$ values (degree-4
polynomial identity ⇒ 5 points suffice).

## 3. Total angular momentum of an APIC particle set

Particle state $(m_p, \mathbf x_p, \mathbf v_p, \mathbf B_p)$ with
$\mathbf C_p = \mathbf B_p D_p^{-1}$. Following Jiang et al. 2015
(tech report § 5), the total angular momentum carried by the
particles is

$$\mathbf L^{\text{part}} = \sum_p m_p\,\mathbf x_p \times \mathbf v_p
  \;+\; \sum_p m_p\,\operatorname{axial}(\mathbf B_p),$$

where in 2D $\operatorname{axial}(\mathbf B) = B_{21}-B_{12}$ (scalar)
and in 3D $\operatorname{axial}(\mathbf B) =
(B_{32}-B_{23},\ B_{13}-B_{31},\ B_{21}-B_{12})$.

**P2G conservation (Prop 5.4).** Grid momentum after the affine P2G is
$m_i\mathbf v_i=\sum_p w_{ip} m_p(\mathbf v_p + \mathbf B_p D_p^{-1}(\mathbf x_i-\mathbf x_p))$.
Writing $\mathbf r_i = \mathbf x_i - \mathbf x_p$ and using
$\sum_i w_{ip}\mathbf r_i = 0$ (§ 2 first moment) and
$\sum_i w_{ip}\mathbf x_i = \mathbf x_p$:

$$\mathbf L^{\text{grid}} = \sum_i \mathbf x_i \times m_i\mathbf v_i
 = \sum_p m_p\,\mathbf x_p\times\mathbf v_p
 + \sum_p m_p \sum_i w_{ip}\, \mathbf r_i \times (\mathbf B_p D_p^{-1}\mathbf r_i).$$

With $D_p^{-1} = \tfrac{4}{\Delta x^2}\mathbf I$ and
$\sum_i w_{ip}\,\mathbf r_i\mathbf r_i^{\mathsf T} = \tfrac14\Delta x^2\mathbf I$
(§ 2), the quadratic term reduces per particle to
$\operatorname{axial}(\mathbf B_p)$ — e.g. in 2D, with
$\mathbf A = \mathbf B_p D_p^{-1}$,

$$\sum_i w_{ip}\,\mathbf r_i \times (\mathbf A\mathbf r_i)
 = A_{21}\!\sum_i w r_x^2 - A_{12}\!\sum_i w r_y^2
 = \tfrac{\Delta x^2}{4}(A_{21}-A_{12}) = B_{21}-B_{12},$$

(the cross moment $\sum_i w\,r_x r_y = 0$ by tensor-product
separability). Hence $\mathbf L^{\text{grid}} = \mathbf L^{\text{part}}$
**exactly** (an identity in exact arithmetic).

**G2P conservation (Prop 5.5).** After G2P
($\mathbf v_p' = \sum_i w_{ip}\mathbf v_i$,
$\mathbf B_p' = \sum_i w_{ip}\,\mathbf v_i\,\mathbf r_i^{\mathsf T}$
— note $\operatorname{axial}(\mathbf B_p') = \sum_i w_{ip}\,\mathbf r_i\times\mathbf v_i$
after the sign bookkeeping $\mathbf v r^{\mathsf T}$ vs
$\mathbf r\times\mathbf v$):

$$\mathbf L^{\text{part}\prime}
 = \sum_p m_p \mathbf x_p\times\!\sum_i w_{ip}\mathbf v_i
 + \sum_p m_p \sum_i w_{ip} (\mathbf x_i-\mathbf x_p)\times\mathbf v_i
 = \sum_i \Big(\sum_p m_p w_{ip}\Big)\,\mathbf x_i\times\mathbf v_i
 = \sum_i m_i\,\mathbf x_i \times \mathbf v_i ,$$

using the **lumped** mass $m_i = \sum_p w_{ip} m_p$ — i.e. exact for
*any* grid velocity field, provided the grid masses come from the same
particle set. **PIC negative control:** dropping $\mathbf B_p'$
(keeping only $\mathbf v_p'$) discards the second sum, so PIC loses
exactly $\sum_p m_p\sum_i w_{ip}\mathbf r_i\times\mathbf v_i$ per G2P
— the tables pin the resulting (different) value.

## 4. Affine round trip (Prop 5.1, grid → particle → grid)

Let the grid carry an affine field
$\mathbf v_i = \mathbf v_0 + \mathbf C\,\mathbf x_i$. G2P reconstructs

$$\mathbf v_p = \sum_i w_{ip}(\mathbf v_0 + \mathbf C\mathbf x_i) = \mathbf v_0 + \mathbf C\mathbf x_p,
\qquad
\mathbf B_p = \sum_i w_{ip}(\mathbf v_0+\mathbf C\mathbf x_i)\,\mathbf r_i^{\mathsf T}
            = \mathbf C\,D_p = \tfrac{\Delta x^2}{4}\,\mathbf C,$$

so $\mathbf C_p = \mathbf B_p D_p^{-1} = \mathbf C$ exactly. P2G then
gives, at every node $i$ with $m_i > 0$:

$$m_i \mathbf v_i' = \sum_p w_{ip} m_p\big(\mathbf v_p + \mathbf C_p(\mathbf x_i-\mathbf x_p)\big)
 = \sum_p w_{ip} m_p (\mathbf v_0 + \mathbf C \mathbf x_i)
 = m_i(\mathbf v_0 + \mathbf C\mathbf x_i),$$

i.e. the affine field is reproduced **exactly**, for arbitrary
particle placement (each particle's full stencil in-bounds). The
direction is grid → particle → grid, per the tech report ("transferring
velocity information to particles … and then back to the grid" — the
v0.2 spec correction). **PIC negative control:** with $\mathbf B_p$
discarded, P2G yields the mass-weighted average of the $\mathbf v_p$,
which does not reproduce $\mathbf C\mathbf x_i$ (pinned deviation in
the table).

## 5. Independent-reference anchors

1. **Hand derivation** — §§ 2–4 above; every table value follows from
   these identities (re-proven as `Fraction` identities by the
   generators at verify time).
2. **Jiang et al. 2015** (TOG + tech report Props 5.1/5.4/5.5) and the
   **SIGGRAPH 2016 course notes** § 10.1 eq. (174) — the published
   statements of the same identities.
3. **Repo cross-anchor** — the shape-function values FP-match
   `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`
   (absolute 1e-15), tying the pic-flip transfer stencil to the
   already-verified MLS-MPM golden.

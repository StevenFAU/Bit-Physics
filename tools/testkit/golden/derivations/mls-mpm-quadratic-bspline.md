# Derivation — MLS-MPM quadratic B-spline shape function

> **Canonical references:**
> - Hu, Y., Fang, Y., Ge, Z., Qu, Z., Zhu, Y., Pradhana, A. & Jiang, C.
>   (2018), "A Moving Least Squares Material Point Method with
>   Displacement Discontinuity and Two-Way Rigid Body Coupling",
>   *ACM Transactions on Graphics* 37 (4), Article 150 (SIGGRAPH 2018).
>   DOI [10.1145/3197517.3201293](https://doi.org/10.1145/3197517.3201293).
>   Companion **88-line reference**:
>   <https://github.com/yuanming-hu/taichi_mpm/blob/master/mls-mpm88.cpp>
>   (cited directly in Hu et al. 2018 § 3).
> - Steffen, M., Kirby, R. M. & Berzins, M. (2008), "Analysis and
>   reduction of quadrature errors in the material point method
>   (MPM)", *International Journal for Numerical Methods in
>   Engineering* 76 (6), 922–948.
>   DOI [10.1002/nme.2360](https://doi.org/10.1002/nme.2360).

## 1. Definition

The MLS-MPM quadratic B-spline shape function in 1D is

$$N(x) = \begin{cases}
\tfrac{3}{4} - x^{2} & |x| < \tfrac{1}{2},\\
\tfrac{1}{2}\,(\tfrac{3}{2} - |x|)^{2} & \tfrac{1}{2} \le |x| < \tfrac{3}{2},\\
0 & |x| \ge \tfrac{3}{2}.
\end{cases}$$

In multiple dimensions the shape function is the tensor product
$N(\mathbf{x}) = N(x_{1})\,N(x_{2})\,N(x_{3})$.

The argument $x$ is the offset between the particle position and the
grid node, divided by the grid spacing. Each particle interacts with
$3^{d}$ grid nodes ($d$ = spatial dimension).

## 2. Sample values (closed-form)

| $x$ | $N(x)$ | derivation |
|---|---|---|
| $0$ | $3/4 = 0.75$ | $|x| = 0 < 1/2$; $N = 3/4 - 0 = 3/4$ |
| $\pm 1/2$ | $1/2$ | boundary case; either branch agrees: $3/4 - 1/4 = 1/2$ or $\tfrac{1}{2}(1)^{2} = 1/2$ |
| $\pm 1$ | $1/8 = 0.125$ | $|x| = 1 \in [1/2, 3/2)$; $N = \tfrac{1}{2}(1/2)^{2} = 1/8$ |
| $\pm 3/2$ | $0$ | boundary case; second branch evaluates to $0$ |
| $\pm 1/4$ | $11/16 = 0.6875$ | $|x| = 1/4 < 1/2$; $N = 3/4 - 1/16 = 11/16$ |

## 3. Partition of unity

For any particle position $p$ and any choice of three consecutive
integer grid nodes $\{i-1, i, i+1\}$ centred near $p$,

$$\sum_{k \in \{-1, 0, 1\}}\,N(p - (i + k)) = 1.$$

Verified by hand at $p = 0$ (offsets $\{1, 0, -1\}$ → values $\{1/8, 3/4, 1/8\}$, sum $= 1$) and at $p = 0.3$ (offsets $\{-1.3, -0.3, 0.7\}$ → values $\{1/2(0.2)^{2}, 3/4 - 0.09, 1/2(0.8)^{2}\} = \{0.02, 0.66, 0.32\}$, sum $= 1.0$).

## 4. Independent-reference anchors

Per spec § 2.4 R9:

1. **Hand-derivation** of the closed-form values in § 2 — every entry
   follows from the piecewise formula in § 1.
2. **Hu et al. (2018) § 3 + the 88-line MLS-MPM reference**
   (`mls-mpm88.cpp`, lines defining `w[i]`). The B-spline formula in
   the reference code matches the formula above verbatim.
3. **Steffen, Kirby & Berzins (2008) § 3** — analysis of quadratic
   B-spline MPM; the same formula appears as Eq. (15).
4. (auxiliary) **Python re-derivation** by
   `tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py`.

## 5. Generator contract

`tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py --verify`
re-derives all sample values and the partition-of-unity sum; asserts
equality with the table at `1e-15` absolute tolerance.

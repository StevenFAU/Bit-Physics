# Derivation — Lorenz system structural invariants (canonical parameters)

> **Canonical references:**
> - Lorenz, E. N. (1963), "Deterministic Nonperiodic Flow", *J. Atmos.
>   Sci.* 20 (2), 130–141. DOI 10.1175/1520-0469(1963)020\<0130:DNF\>2.0.CO;2.
> - Strogatz, S. H. (1994), *Nonlinear Dynamics and Chaos*, Westview,
>   ISBN 0-201-54344-3. Chapter 9 covers the Lorenz equations; § 9.2
>   (fixed points and their stability) is the textbook anchor for the
>   eigenvalue derivation.
> - Sparrow, C. (1982), *The Lorenz Equations: Bifurcations, Chaos, and
>   Strange Attractors*, Applied Mathematical Sciences vol. 41,
>   Springer, ISBN 0-387-90775-0. Chapter 1 is the canonical analytic
>   reference for the fixed-point coordinates and the Jacobian eigenvalue
>   characteristic polynomial.

The Lorenz attractor's "golden values" at the canonical parameter set
$(\sigma, \rho, \beta) = (10, 28, 8/3)$ are **structural** invariants
of the vector field $f(\mathbf{x}; \boldsymbol{\theta})$, not numerical
trajectory points. This is appropriate for closed-form code
verification per spec § 5.1 (golden-value tables anchored on
algebraic structure rather than discretized solutions).

Three quantities are exposed:

1. The three fixed points $\{P_0, C_+, C_-\}$.
2. The three eigenvalues of the Jacobian at the origin $J(P_0)$.
3. The trace of $J$ everywhere (i.e., the volume-contraction rate).

Each derivation below is hand-derivable from the ODE definition and
appears in multiple independent textbook / monograph references.

## 1. Fixed points

Setting $\dot{x} = \dot{y} = \dot{z} = 0$ in

$$\dot{x} = \sigma(y - x),\quad \dot{y} = x(\rho - z) - y,\quad \dot{z} = xy - \beta z$$

gives $y = x$ (from $\dot{x} = 0$ with $\sigma > 0$), then $\dot{y} = 0$
implies $x(\rho - z - 1) = 0$. Either $x = 0$ (giving $\dot{z} = 0
\Rightarrow z = 0$, the origin) or $z = \rho - 1$. Substituting into
$\dot{z} = 0$: $x^2 = \beta(\rho - 1)$, so $x = \pm\sqrt{\beta(\rho-1)}$.

For canonical parameters $\beta(\rho - 1) = (8/3)(27) = 72$, hence
$x = \pm\sqrt{72} = \pm 6\sqrt{2}$.

**Independent references:**
- Lorenz 1963 § 3 (eq. analysis preceding eq. 28).
- Sparrow 1982 § 1.2 ("steady states"), p. 7.
- Strogatz 1994 § 9.2.1 ("fixed points").

## 2. Origin Jacobian eigenvalues

The Jacobian of $f$ is

$$J(\mathbf{x}) = \begin{pmatrix}-\sigma & \sigma & 0 \\ \rho - z & -1 & -x \\ y & x & -\beta\end{pmatrix}.$$

At $P_0 = (0,0,0)$ this reduces to

$$J(P_0) = \begin{pmatrix}-\sigma & \sigma & 0 \\ \rho & -1 & 0 \\ 0 & 0 & -\beta\end{pmatrix}.$$

The block-triangular structure ($z$-row and $z$-column decouple) gives
one eigenvalue immediately: $\lambda_3 = -\beta = -8/3$. The remaining
$2\times 2$ block has characteristic polynomial

$$\det\!\begin{pmatrix}-\sigma-\lambda & \sigma\\ \rho & -1-\lambda\end{pmatrix} = (\sigma+\lambda)(1+\lambda) - \sigma\rho = \lambda^2 + (\sigma+1)\lambda + \sigma(1 - \rho) = 0.$$

Quadratic formula:

$$\lambda_{1,2} = \frac{-(\sigma+1) \pm \sqrt{(\sigma+1)^2 + 4\sigma(\rho - 1)}}{2}.$$

For canonical $(\sigma,\rho) = (10, 28)$: $(\sigma+1)^2 = 121$,
$4\sigma(\rho - 1) = 1080$, so the discriminant is $1201$ and

$$\lambda_{1,2} = \frac{-11 \pm \sqrt{1201}}{2}.$$

Numerically: $\sqrt{1201} \approx 34.6554...$, so
$\lambda_1 \approx 11.82772...$ (unstable, the "saddle" direction
characterizing the origin) and $\lambda_2 \approx -22.82772...$.

**Independent references:**
- Sparrow 1982 § 1.2 ("linearization at origin"), p. 8.
- Strogatz 1994 § 9.2.2 ("linear stability of the origin"), the
  worked example gives identical algebra.
- Hand-derivation: this `.md`'s § 2 above is reproducible directly
  from Lorenz 1963's eqs. (25)–(27) without consulting either
  monograph.

## 3. Divergence of the vector field

By inspection of the Jacobian, the trace is

$$\mathrm{tr}\,J(\mathbf{x}) = -\sigma - 1 - \beta,$$

which is **independent of $\mathbf{x}$** (the off-diagonal $-x$, $+x$
in rows 2 and 3 cancel; the $-z$ in row 1 of $J$ does not exist — the
$\dot{x}$ row has no $z$-derivative). Hence the divergence
$\nabla\cdot f = \mathrm{tr}\,J = -\sigma - 1 - \beta$ at every point.

For canonical parameters: $-10 - 1 - 8/3 = -41/3 \approx -13.\overline{6}$.

This is the volume-contraction rate per unit time on any infinitesimal
volume transported by the flow.

**Independent references:**
- Lorenz 1963 § "Some general considerations" (p. 137), the
  $\nabla\cdot f$ argument is stated explicitly.
- Sparrow 1982 § 1.1 ("dissipation rate"), p. 6.
- Hand-derivation: trace of the $3\times 3$ Jacobian above.

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/lorenz_structural.py` uses SymPy to
**symbolically** evaluate the fixed-point coordinates and the
characteristic-polynomial roots at the canonical parameter set, and
asserts agreement against the hand-derived values in this document.
The generator's `verify()` mode re-emits the table and the test suite
in
`packages/strange-attractors/tests/test_lorenz_structural_golden.py`
loads the table and asserts the **sim's NumPy implementation** of the
Lorenz vector field produces the same fixed points and Jacobian
eigenvalues.

At Phase 1, the sim's NumPy implementation does not exist; the test
fails with `ModuleNotFoundError: No module named 'strange_attractors.reference'`.

## 5. FACT / INFERENCE tagging

- **FACT** — all algebra in §§ 1–3 is verbatim from Lorenz 1963 and
  reproducible by hand.
- **FACT** — Sparrow 1982 and Strogatz 1994 citations correspond to
  the textbook chapters/sections cited; both are widely available.
- **INFERENCE** — the volume-contraction rate $-\sigma-1-\beta$ is
  often quoted as $-(\sigma+\beta+1)$; the algebraic equivalence is
  trivial. Both forms appear in the literature.

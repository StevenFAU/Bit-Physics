# Derivation — Chen system structural invariants (canonical parameters)

> **Canonical reference:**
> - Chen, G., Ueta, T. (1999), "Yet another chaotic attractor", *Int.
>   J. Bifurcation Chaos* 9 (7), 1465–1466.
>   DOI 10.1142/S0218127499001024. Defines the field and the canonical
>   parameter set $(a, b, c) = (35, 3, 28)$.

The Chen system at the canonical parameters,

$$\dot{x} = a(y - x),\qquad \dot{y} = (c - a)x - xz + cy,\qquad \dot{z} = xy - bz,$$

is the Lorenz sibling (dual member of the Lorenz family): its
structural invariants mirror the Lorenz precedent already in this
corpus. Three quantities are exposed — appropriate for closed-form
code verification per spec § 5.1:

1. The three fixed points $\{P_0, C_+, C_-\}$.
2. The eigenvalues of the Jacobian at the origin (block-triangular
   quadratic pair plus $-b$).
3. The constant divergence $\nabla\cdot f = c - a - b$.

## 1. Fixed points

Setting $\dot{x} = \dot{y} = \dot{z} = 0$: from $\dot{x} = 0$,
$y = x$; substituting into $\dot{z} = 0$ gives $z = x^2/b$; then
$\dot{y} = 0$ reads

$$(c - a)x + cx - x\cdot\frac{x^2}{b} = x\Big[(2c - a) - \frac{x^2}{b}\Big] = 0,$$

so either $x = 0$ (the origin $P_0$) or

$$x^2 = b\,(2c - a),\qquad z = \frac{x^2}{b} = 2c - a$$

— the Lorenz-sibling algebra (requires $2c > a$, true at canonical:
$2c - a = 21$). At canonical parameters $x = \pm\sqrt{3\cdot 21} =
\pm\sqrt{63} = \pm 3\sqrt{7}$:

$$C_\pm = \big(\pm 7.937253933193772,\; \pm 7.937253933193772,\; 21\big).$$

**Independent routes:**
- Hand algebra above.
- SymPy `solve` of the field with the closed form cross-asserted on
  each solution, in
  `tools/testkit/golden/generator/chen_structural.py`.
- NumPy closed-form solve in the sim reference
  (`packages/strange-attractors/strange_attractors/reference/chen.py`)
  plus the field-residual assertion $\lvert f(C_\pm)\rvert \approx 0$
  in the golden test.

## 2. Origin Jacobian eigenvalues

The Jacobian of $f$ is

$$J(\mathbf{x}) = \begin{pmatrix}-a & a & 0 \\ c - a - z & c & -x \\ y & x & -b\end{pmatrix}.$$

At the origin the third row and third column decouple ($x = y = 0$),
so $J(0)$ is block-triangular with the $2\times 2$ block
$\begin{pmatrix}-a & a \\ c - a & c\end{pmatrix}$ and the scalar $-b$.
The block's characteristic polynomial is

$$\lambda^2 - (\mathrm{tr})\lambda + \det
= \lambda^2 - (c - a)\lambda + \big(-ac - a(c - a)\big)
= \lambda^2 + (a - c)\lambda - a(2c - a) = 0.$$

At canonical parameters: $\lambda^2 + 7\lambda - 735 = 0$, so

$$\lambda_\pm = \frac{-7 \pm \sqrt{49 + 2940}}{2} = \frac{-7 \pm \sqrt{2989}}{2},$$

giving $\lambda_+ = 23.835873865673292\ldots$ and $\lambda_- =
-30.835873865673292\ldots$, plus the decoupled $\lambda_3 = -b = -3$.
The table encodes them as `eigenvalues_ascending`. As with Lorenz, the
origin is a saddle whose one unstable direction feeds the two wings
centered on $C_\pm$.

**Independent routes:**
- Hand characteristic polynomial above (cross-check: $\lambda_+ +
  \lambda_- = c - a = -7$ and $\lambda_+\lambda_- = -a(2c - a) =
  -735$).
- SymPy characteristic-polynomial factorization (generator).
- Closed-form helper plus `numpy.linalg.eigvals` on the reference
  Jacobian (sim test).

## 3. Divergence of the vector field

The diagonal entries of the Jacobian in § 2 are $-a$, $c$, $-b$
(constant), so

$$\nabla\cdot f = \mathrm{tr}\,J = c - a - b = 28 - 35 - 3 = -10$$

— constant over state space: uniform volume contraction, same rate
structure as Lorenz ($-\sigma - 1 - \beta$ there).

**Independent routes:** hand trace above; SymPy trace (generator);
central-difference numerical divergence (sim PBT invariant).

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/chen_structural.py` uses SymPy to
`solve` the field for the fixed points (cross-asserting the hand
closed form $y = x$, $z = 2c - a$, $x^2 = b(2c - a)$ on each
solution), verify the origin characteristic-polynomial factorization,
and verify the trace closed form, comparing against the values
committed in
`tools/testkit/golden/tables/closed-form/chen-structural.json`.
The sim-side cross-check at
`packages/strange-attractors/tests/test_family_structural_golden.py`
asserts the **sim's NumPy reference implementation** reproduces the
fixed points (closed-form solve plus field residual), the ascending
eigenvalues (helper and `numpy.linalg.eigvals`), and the divergence
(helper and Jacobian trace).

## 5. FACT / INFERENCE tagging

- **FACT** — the field form and canonical $(a, b, c) = (35, 3, 28)$
  are from Chen & Ueta 1999 (DOI 10.1142/S0218127499001024, verified
  against Crossref at implementation).
- **FACT** — all algebra in §§ 1–3 is elementary and reproducible by
  hand from the field definition.
- **INFERENCE** — the "Lorenz sibling / dual member" framing follows
  the generalized-Lorenz-family classification literature; the golden
  values themselves are citation-independent algebra.

## 6. Canonical-run calibration

Measured 2026-07-03 with an RK4 step-halving probe over the first 10 %
of the horizon (dt was **measured-then-declared** per spec § 6.2
sanity posture). The Chen system is **stiff/fast** at canonical
parameters (eigenvalue magnitudes up to $\approx 31$ at the origin),
so the calibrated dt = 0.002 was measured per the spec § 3.3.1
fast-system note:

| item | value |
|---|---|
| IC | $(-3, 2, 20)$ |
| dt | $0.002$ |
| N (steps) | $10\,000$ |
| step-halving error (first 10 % of horizon) | $9.18\times 10^{-5}$ |
| $\max\lvert s\rvert$ over horizon | $45.504$ |
| boundedness | finite over the full horizon |

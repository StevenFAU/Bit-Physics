# Derivation — Halvorsen system structural invariants (canonical parameter)

> **Canonical reference:**
> - The Halvorsen system is cataloged in Sprott, J. C. (2003), *Chaos
>   and Time-Series Analysis*, Oxford University Press
>   (ISBN 978-0-19-850839-7). Canonical parameter $a = 1.4$.

The Halvorsen system at the canonical parameter $a = 1.4$,

$$\dot{x} = -ax - 4y - 4z - y^2,\quad
\dot{y} = -ay - 4z - 4x - z^2,\quad
\dot{z} = -az - 4x - 4y - x^2,$$

exposes three **structural** invariants of the vector field —
appropriate for closed-form code verification per spec § 5.1. Three
quantities are exposed:

1. The eigenvalues of the Jacobian at the origin (a symmetric-circulant
   closed form).
2. The constant divergence $\nabla\cdot f = -3a$.
3. The exact cyclic symmetry $(x, y, z) \to (y, z, x)$.

## 1. Origin Jacobian eigenvalues

The Jacobian of $f$ is

$$J(\mathbf{x}) = \begin{pmatrix}-a & -4 - 2y & -4 \\ -4 & -a & -4 - 2z \\ -4 - 2x & -4 & -a\end{pmatrix}.$$

At the origin the quadratic contributions vanish and

$$J(0) = \begin{pmatrix}-a & -4 & -4 \\ -4 & -a & -4 \\ -4 & -4 & -a\end{pmatrix}
= -a\,I - 4\,(\mathbb{1} - I),$$

where $\mathbb{1}$ is the all-ones matrix. $\mathbb{1}$ has eigenvalue
$3$ on the diagonal direction $(1, 1, 1)$ and $0$ (twice) on its
orthogonal complement, so $J(0) = (4 - a)I - 4\cdot\mathbb{1}$ has

$$\lambda_1 = (4 - a) - 12 = -a - 8 = -9.4 \quad \text{on } (1,1,1),$$
$$\lambda_{2,3} = -a + 4 = 2.6 \quad \text{(twice) on the complement.}$$

Equivalently, $\det(\lambda I - J(0)) = (\lambda + a + 8)(\lambda + a -
4)^2$. Because $J(0)$ is symmetric all eigenvalues are real; the table
encodes them as `eigenvalues_ascending` $= (-9.4, 2.6, 2.6)$. This is
the saddle signature at the origin: strong contraction along the
diagonal, a doubly-degenerate expansion transverse to it.

**Independent routes:**
- Hand circulant/all-ones argument above.
- SymPy characteristic-polynomial factorization in
  `tools/testkit/golden/generator/halvorsen_structural.py`.
- Closed-form helper plus `numpy.linalg.eigvals` on the reference
  Jacobian in
  `packages/strange-attractors/strange_attractors/reference/halvorsen.py`,
  exercised by the golden test.

## 2. Divergence of the vector field

Every diagonal entry of the Jacobian in § 1 is $-a$ (the quadratic
term in each component involves a *different* coordinate than the one
differentiated), so

$$\nabla\cdot f = \mathrm{tr}\,J = -3a = -4.2$$

— constant over state space: uniform volume contraction at rate $3a$.

**Independent routes:** hand trace above; SymPy trace (generator);
central-difference numerical divergence (sim PBT invariant).

## 3. Cyclic symmetry

Let $C$ be the rotation $(x, y, z) \mapsto (y, z, x)$. Direct
substitution into the field:

$$f(C\mathbf{s}) = \big(-ay - 4z - 4x - z^2,\; -az - 4x - 4y - x^2,\; -ax - 4y - 4z - y^2\big)
= \big(f_2(\mathbf{s}),\; f_3(\mathbf{s}),\; f_1(\mathbf{s})\big) = C f(\mathbf{s}),$$

component-for-component **exactly** — each component of $f$ maps onto
the next under the rotation, so the residual $f(C\mathbf{s}) -
Cf(\mathbf{s})$ is identically the zero vector and the attractor's
three intertwined lobes are images of one another under the three-fold
rotation about the diagonal.

**Independent routes:** hand substitution above; SymPy symbolic
residual matrix exactly zero (generator); numerical sampling of the
identity at fixed and random points (sim test + PBT invariant).

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/halvorsen_structural.py` uses SymPy to
verify the origin characteristic-polynomial factorization and the
trace closed form, and expands the cyclic residual matrix (asserting
it is exactly zero), comparing against the values committed in
`tools/testkit/golden/tables/closed-form/halvorsen-structural.json`.
The sim-side cross-check at
`packages/strange-attractors/tests/test_family_structural_golden.py`
asserts the **sim's NumPy reference implementation** reproduces the
ascending eigenvalues (helper and `numpy.linalg.eigvals`), the
divergence (helper and Jacobian trace), and a bit-exact zero cyclic
residual at sampled points.

## 5. FACT / INFERENCE tagging

- **FACT** — the field form and canonical $a = 1.4$ are per the
  Sprott 2003 catalog (ISBN 978-0-19-850839-7).
- **FACT** — all algebra in §§ 1–3 is elementary and reproducible by
  hand from the field definition.
- **INFERENCE** — the "three intertwined lobes" reading of the cyclic
  symmetry describes the attractor geometry; the golden table checks
  only the field-level equivariance identity.

## 6. Canonical-run calibration

Measured 2026-07-03 with an RK4 step-halving probe over the first 10 %
of the horizon (dt was **measured-then-declared** per spec § 6.2
sanity posture):

| item | value |
|---|---|
| IC | $(-1.48, -1.51, 2.04)$ |
| dt | $0.005$ |
| N (steps) | $10\,000$ |
| step-halving error (first 10 % of horizon) | $4.55\times 10^{-5}$ |
| $\max\lvert s\rvert$ over horizon | $13.322$ |
| boundedness | finite over the full horizon |

# Derivation — Four-wing system structural invariants (canonical parameters)

> **Canonical reference:**
> - The four-wing class of algebraically simple chaotic flows is
>   cataloged in Sprott, J. C. (2010), *Elegant Chaos: Algebraically
>   Simple Chaotic Flows*, World Scientific (ISBN 978-981-283-881-0).
>   The canonical parameter set $(a, b, c, d, e, f) = (0.2, -0.01, 1,
>   -0.4, -1, -1)$ is per the repo's expansion spec § 3.3.1.

The four-wing system at the canonical parameters,

$$\dot{x} = ax + cyz,\qquad \dot{y} = bx + dy - xz,\qquad \dot{z} = ez + fxy,$$

exposes three **structural** invariants of the vector field —
appropriate for closed-form code verification per spec § 5.1. Three
quantities are exposed:

1. The eigenvalues of the Jacobian at the origin (a lower-triangular
   read-off).
2. The constant divergence $\nabla\cdot f = a + d + e$.
3. The exact parity symmetry $(x, y, z) \to (-x, -y, z)$ — the origin
   of the two symmetric wing pairs.

## 1. Origin Jacobian eigenvalues

The Jacobian of $f$ is

$$J(\mathbf{x}) = \begin{pmatrix}a & cz & cy \\ b - z & d & -x \\ fy & fx & e\end{pmatrix}.$$

At the origin every state-dependent entry vanishes and

$$J(0) = \begin{pmatrix}a & 0 & 0 \\ b & d & 0 \\ 0 & 0 & e\end{pmatrix},$$

which is **lower triangular**: its eigenvalues are its diagonal
entries, exactly

$$\lambda \in \{a,\; d,\; e\} = \{0.2,\; -0.4,\; -1\}$$

(the sub-diagonal $b$ entry shifts eigenvectors, not eigenvalues —
which is why $b$ does not appear in the eigenvalue closed form).
Equivalently, $\det(\lambda I - J(0)) = (\lambda - a)(\lambda -
d)(\lambda - e)$. The table encodes them as `eigenvalues_ascending`
$= (-1, -0.4, 0.2)$: a gentle saddle, with the single weakly unstable
direction along $x$ launching trajectories toward the wings.

**Independent routes:**
- Hand triangularity read-off above.
- SymPy super-diagonal-zero assertion plus characteristic-polynomial
  factorization in
  `tools/testkit/golden/generator/fourwing_structural.py`.
- Closed-form helper plus `numpy.linalg.eigvals` on the reference
  Jacobian in
  `packages/strange-attractors/strange_attractors/reference/fourwing.py`,
  exercised by the golden test.

## 2. Divergence of the vector field

The diagonal entries of the Jacobian in § 1 are $a$, $d$, $e$
(constant — every bilinear term differentiates into an off-diagonal
entry), so

$$\nabla\cdot f = \mathrm{tr}\,J = a + d + e = 0.2 - 0.4 - 1 = -1.2$$

— constant over state space: uniform (mild) volume contraction, the
weakest dissipation rate in this expansion set.

**Independent routes:** hand trace above; SymPy trace (generator);
central-difference numerical divergence (sim PBT invariant).

## 3. Parity symmetry

Let $P = \operatorname{diag}(-1, -1, 1)$, i.e. $(x, y, z) \mapsto
(-x, -y, z)$. Direct substitution into the field:

$$f(P\mathbf{s}) = \big(a(-x) + c(-y)z,\; b(-x) + d(-y) - (-x)z,\; ez + f(-x)(-y)\big)
= \big(-(ax + cyz),\; -(bx + dy - xz),\; ez + fxy\big),$$

while

$$P f(\mathbf{s}) = \big(-(ax + cyz),\; -(bx + dy - xz),\; ez + fxy\big).$$

The two agree **exactly** (component-wise: $\dot{x}$ and $\dot{y}$ are
jointly odd in $(x, y)$ — each of their terms carries exactly one
factor from $\{x, y\}$ — while $\dot{z}$ is even, its $xy$ term
carrying both sign flips). The residual $f(P\mathbf{s}) -
Pf(\mathbf{s})$ is identically the zero vector, so the invariant set
is symmetric under the half-turn about the $z$-axis: the four wings
come in two parity pairs.

**Independent routes:** hand substitution above; SymPy symbolic
residual matrix exactly zero (generator); numerical sampling of the
identity at fixed and random points (sim test + PBT invariant).

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/fourwing_structural.py` uses SymPy to
assert the super-diagonal entries of $J(0)$ vanish, verify the
characteristic-polynomial factorization and the trace closed form, and
expand the parity residual matrix (asserting it is exactly zero),
comparing against the values committed in
`tools/testkit/golden/tables/closed-form/fourwing-structural.json`.
The sim-side cross-check at
`packages/strange-attractors/tests/test_family_structural_golden.py`
asserts the **sim's NumPy reference implementation** reproduces the
ascending eigenvalues (helper and `numpy.linalg.eigvals`), the
divergence (helper and Jacobian trace), and a bit-exact zero parity
residual at sampled points.

## 5. FACT / INFERENCE tagging

- **FACT** — the four-wing class is cataloged in Sprott 2010,
  *Elegant Chaos* (ISBN 978-981-283-881-0); the canonical parameter
  set used here is the repo expansion spec § 3.3.1 declaration.
- **FACT** — all algebra in §§ 1–3 is elementary and reproducible by
  hand from the field definition.
- **INFERENCE** — "the four wings come in two parity pairs" is the
  standard geometric reading of the $P$-equivariance; the golden
  table checks only the field-level identity.

## 6. Canonical-run calibration

Measured 2026-07-03 with an RK4 step-halving probe over the first 10 %
of the horizon (dt was **measured-then-declared** per spec § 6.2
sanity posture). The probe ran a 20 000-step horizon; the canonical
declaration is N = 10 000 (the first half of the probe horizon), so
the measured bounds cover it:

| item | value |
|---|---|
| IC | $(1.3, -0.18, 0.01)$ |
| dt | $0.01$ |
| N (steps, canonical) | $10\,000$ |
| step-halving error (first 10 % of probe horizon, N = 20 000) | $1.17\times 10^{-9}$ |
| $\max\lvert s\rvert$ over probe horizon | $2.470$ |
| boundedness | finite over the full horizon |

# Derivation — Dadras system structural invariants (canonical parameters)

> **Canonical reference:**
> - Dadras, S., Momeni, H. R. (2009), "A novel three-dimensional
>   autonomous chaotic system generating two, three and four-scroll
>   attractors", *Phys. Lett. A* 373 (40), 3637–3642.
>   DOI 10.1016/j.physleta.2009.07.088. Defines the field and the
>   canonical parameter set $(p, o, r, c, e) = (3, 2.7, 1.7, 2, 9)$.

The Dadras–Momeni system at the canonical parameters,

$$\dot{x} = y - px + oyz,\qquad \dot{y} = ry - xz + z,\qquad \dot{z} = cxy - ez,$$

exposes three **structural** invariants of the vector field —
appropriate for closed-form code verification per spec § 5.1. Three
quantities are exposed:

1. The eigenvalues of the Jacobian at the origin (an upper-triangular
   read-off).
2. The constant divergence $\nabla\cdot f = -p + r - e$.
3. The origin field probe $f(0) = 0$ (the origin is a fixed point).

## 1. Origin Jacobian eigenvalues

The Jacobian of $f$ is

$$J(\mathbf{x}) = \begin{pmatrix}-p & 1 + oz & oy \\ -z & r & 1 - x \\ cy & cx & -e\end{pmatrix}.$$

At the origin every state-dependent entry vanishes and

$$J(0) = \begin{pmatrix}-p & 1 & 0 \\ 0 & r & 1 \\ 0 & 0 & -e\end{pmatrix},$$

which is **upper triangular**: its eigenvalues are its diagonal
entries, exactly

$$\lambda \in \{-p,\; r,\; -e\} = \{-3,\; 1.7,\; -9\},$$

(the off-diagonal $1$'s shift eigenvectors, not eigenvalues).
Equivalently, $\det(\lambda I - J(0)) = (\lambda + p)(\lambda -
r)(\lambda + e)$. The table encodes them as `eigenvalues_ascending`
$= (-9, -3, 1.7)$ — a saddle with two stable directions and one
unstable one, the origin-centered stretch-and-fold engine of the
multi-scroll attractor.

**Independent routes:**
- Hand triangularity read-off above.
- SymPy sub-diagonal-zero assertion plus characteristic-polynomial
  factorization in
  `tools/testkit/golden/generator/dadras_structural.py`.
- Closed-form helper plus `numpy.linalg.eigvals` on the reference
  Jacobian in
  `packages/strange-attractors/strange_attractors/reference/dadras.py`,
  exercised by the golden test.

## 2. Divergence of the vector field

The diagonal entries of the Jacobian in § 1 are $-p$, $r$, $-e$
(constant — every off-diagonal state dependence differentiates a
*different* coordinate), so

$$\nabla\cdot f = \mathrm{tr}\,J = -p + r - e = -3 + 1.7 - 9 = -10.3$$

— constant over state space: uniform volume contraction (strongly
dissipative at canonical parameters).

**Independent routes:** hand trace above; SymPy trace (generator);
central-difference numerical divergence (sim PBT invariant).

## 3. Origin field probe

Every term of every component carries at least one state factor:

$$\dot{x} = \underbrace{y}_{\propto y} - \underbrace{px}_{\propto x} + \underbrace{oyz}_{\propto yz},\qquad
\dot{y} = \underbrace{ry}_{\propto y} - \underbrace{xz}_{\propto xz} + \underbrace{z}_{\propto z},\qquad
\dot{z} = \underbrace{cxy}_{\propto xy} - \underbrace{ez}_{\propto z},$$

so $f(0, 0, 0) = (0, 0, 0)$ **exactly** — the origin is a fixed point
(the one whose eigenvalues § 1 characterizes). Unlike Rössler there is
no constant forcing term anywhere in the field.

**Independent routes:** inspection above; SymPy substitution asserting
the exact zero vector (generator); the sim test asserts the numerical
residual of the reference field at the origin.

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/dadras_structural.py` uses SymPy to
assert the sub-diagonal entries of $J(0)$ vanish, verify the
characteristic-polynomial factorization and the trace closed form, and
substitute the origin into the field (asserting the exact zero
vector), comparing against the values committed in
`tools/testkit/golden/tables/closed-form/dadras-structural.json`.
The sim-side cross-check at
`packages/strange-attractors/tests/test_family_structural_golden.py`
asserts the **sim's NumPy reference implementation** reproduces the
ascending eigenvalues (helper and `numpy.linalg.eigvals`), the
divergence (helper and Jacobian trace), and the zero field value at
the origin.

## 5. FACT / INFERENCE tagging

- **FACT** — the field form and canonical $(p, o, r, c, e) = (3, 2.7,
  1.7, 2, 9)$ are from Dadras & Momeni 2009 (DOI
  10.1016/j.physleta.2009.07.088, verified against Crossref at
  implementation).
- **FACT** — all algebra in §§ 1–3 is elementary and reproducible by
  hand from the field definition.
- **INFERENCE** — "the origin-centered stretch-and-fold engine of the
  multi-scroll attractor" is the standard dynamical reading of the
  saddle signature; the golden table checks only the eigenvalues.

## 6. Canonical-run calibration

Measured 2026-07-03 with an RK4 step-halving probe over the first 10 %
of the horizon (dt was **measured-then-declared** per spec § 6.2
sanity posture):

| item | value |
|---|---|
| IC | $(1, 1, 1)$ |
| dt | $0.005$ |
| N (steps) | $10\,000$ |
| step-halving error (first 10 % of horizon) | $3.54\times 10^{-6}$ |
| $\max\lvert s\rvert$ over horizon | $12.214$ |
| boundedness | finite over the full horizon |

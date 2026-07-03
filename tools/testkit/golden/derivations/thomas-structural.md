# Derivation — Thomas system structural invariants (canonical parameter)

> **Canonical reference:**
> - Thomas, R. (1999), "Deterministic chaos seen in terms of feedback
>   circuits: analysis, synthesis, 'labyrinth chaos'", *Int. J.
>   Bifurcation Chaos* 9 (10), 1889–1905. DOI 10.1142/S0218127499001383.
>   Defines the cyclically-symmetric feedback field. The canonical
>   chaotic value $b = 0.208186$ is the one catalogued in Sprott, J. C.
>   (2003), *Chaos and Time-Series Analysis*, Oxford University Press
>   (ISBN 978-0-19-850839-7).

The Thomas system at the canonical parameter $b = 0.208186$,

$$\dot{x} = \sin y - bx,\qquad \dot{y} = \sin z - by,\qquad \dot{z} = \sin x - bz,$$

exposes three **structural** invariants of the vector field —
appropriate for closed-form code verification per spec § 5.1. Three
quantities are exposed:

1. The eigenvalues of the Jacobian at the origin (a cube-roots-of-unity
   closed form).
2. The fixed points on the symmetry diagonal $x = y = z$ (one
   transcendental root, anchored at high precision).
3. The constant divergence $\nabla\cdot f = -3b$ and the exact cyclic
   symmetry $(x, y, z) \to (y, z, x)$.

## 1. Origin Jacobian eigenvalues

The Jacobian of $f$ is

$$J(\mathbf{x}) = \begin{pmatrix}-b & \cos y & 0 \\ 0 & -b & \cos z \\ \cos x & 0 & -b\end{pmatrix}.$$

At the origin every cosine is $1$, so

$$J(0) = -b\,I + P,\qquad P = \begin{pmatrix}0 & 1 & 0 \\ 0 & 0 & 1 \\ 1 & 0 & 0\end{pmatrix},$$

where $P$ is the cyclic permutation matrix with $P^3 = I$. Its
eigenvalues are the cube roots of unity, $1$ and
$-\tfrac{1}{2} \pm \tfrac{\sqrt{3}}{2}\,i$, so the eigenvalues of
$J(0)$ are exactly $-b$ plus the cube roots of unity:

$$\lambda_1 = 1 - b = 0.791814,\qquad
\lambda_{2,3} = -b - \tfrac{1}{2} \pm \tfrac{\sqrt{3}}{2}\,i
= -0.708186 \pm 0.8660254037844386\,i.$$

Equivalently, $\det(\lambda I - J(0)) = (\lambda + b)^3 - 1$, which
factors as $(\lambda - (1 - b))\big((\lambda + b + \tfrac{1}{2})^2 +
\tfrac{3}{4}\big)$. The table encodes the triple as
`real_eigenvalue` / `spiral_pair_re` / `spiral_pair_im_abs` (the
imaginary part is $\sqrt{3}/2$, independent of $b$).

**Independent routes:**
- Hand cube-roots-of-unity argument above.
- SymPy characteristic-polynomial factorization in
  `tools/testkit/golden/generator/thomas_structural.py`.
- Closed-form helper plus `numpy.linalg.eigvals` on the reference
  Jacobian in
  `packages/strange-attractors/strange_attractors/reference/thomas.py`,
  exercised by the golden test.

## 2. Diagonal fixed points

The diagonal $x = y = z = u$ is invariant under the field (all three
components reduce to the same scalar), and on it every component reads
$\sin u - bu$. Fixed points on the diagonal therefore solve the
transcendental equation

$$\sin u = b\,u.$$

$u = 0$ is always a root (the origin). For the canonical
$b = 0.208186 < 2/\pi$ let $g(u) = \sin u - bu$; then
$g(\pi/2) = 1 - b\pi/2 > 0$ and $g(\pi) = -b\pi < 0$, so a root exists
in $(\pi/2, \pi)$, and $g'(u) = \cos u - b < 0$ on that whole interval
(cosine is negative there), so it is **unique**:

$$u^* = 2.575647587674765\ldots$$

(mpmath 30-dps value $2.57564758767476498374519346724$; the table
carries the float64 rounding). By the odd symmetry
$g(-u) = -g(u)$, $-u^*$ is also a root, giving the three diagonal fixed
points $(0,0,0)$, $(u^*, u^*, u^*)$, $(-u^*, -u^*, -u^*)$.

**Independent routes:**
- Hand diagonal reduction and sign/monotonicity argument above.
- mpmath `findroot` at 30 decimal digits with a residual guard
  (generator).
- The sim reference's bisection in
  `packages/strange-attractors/strange_attractors/reference/thomas.py`
  plus the field-residual assertion
  $\lvert f(u^*, u^*, u^*)\rvert \approx 0$ in the golden test.

## 3. Divergence and cyclic symmetry

Every diagonal entry of the Jacobian in § 1 is $-b$, so

$$\nabla\cdot f = \mathrm{tr}\,J = -3b = -0.624558$$

— constant over state space: uniform volume contraction at rate $3b$.

For the cyclic symmetry, let $C$ be the rotation $(x, y, z) \mapsto
(y, z, x)$. Direct substitution:

$$f(C\mathbf{s}) = \big(\sin z - by,\; \sin x - bz,\; \sin y - bx\big)
= \big(f_2(\mathbf{s}),\; f_3(\mathbf{s}),\; f_1(\mathbf{s})\big) = C f(\mathbf{s}),$$

component-for-component **exactly** — each component of $f$ maps onto
the next under the rotation. The residual $f(C\mathbf{s}) -
Cf(\mathbf{s})$ is identically the zero vector, so the invariant set
(Thomas's "labyrinth") is symmetric under the three-fold rotation
about the diagonal.

**Independent routes:** hand trace and substitution above; SymPy
symbolic trace and residual matrix exactly zero (generator); numerical
sampling of both identities at fixed and random points (sim test + PBT
invariant).

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/thomas_structural.py` uses SymPy to
verify the origin characteristic-polynomial factorization and the
trace closed form, mpmath at 30 decimal digits (with a residual guard)
for the transcendental diagonal root, and expands the cyclic residual
matrix (asserting it is exactly zero), comparing against the values
committed in
`tools/testkit/golden/tables/closed-form/thomas-structural.json`.
The sim-side cross-check at
`packages/strange-attractors/tests/test_family_structural_golden.py`
asserts the **sim's NumPy reference implementation** reproduces the
eigenvalue encodings (helper and `numpy.linalg.eigvals`), the diagonal
fixed points (bisection value plus field residual), the divergence
(helper and Jacobian trace), and a bit-exact zero cyclic residual at
sampled points.

## 5. FACT / INFERENCE tagging

- **FACT** — the field form is from Thomas 1999 (DOI
  10.1142/S0218127499001383); $b = 0.208186$ is the canonical chaotic
  value per the Sprott 2003 catalog usage (ISBN 978-0-19-850839-7).
- **FACT** — the algebra in §§ 1 and 3 is elementary and reproducible
  by hand from the field definition; the § 2 root existence/uniqueness
  argument is elementary calculus.
- **INFERENCE** — $u^*$ itself has no closed form; its value is a
  numerical anchor (three independent numerical routes at differing
  precisions), not hand algebra.

## 6. Canonical-run calibration

Measured 2026-07-03 with an RK4 step-halving probe over the first 10 %
of the horizon (dt was **measured-then-declared** per spec § 6.2
sanity posture). The probe ran a 20 000-step horizon; the canonical
declaration is N = 10 000 (the first half of the probe horizon), so
the measured bounds cover it:

| item | value |
|---|---|
| IC | $(1.1, 1.1, -0.01)$ |
| dt | $0.05$ |
| N (steps, canonical) | $10\,000$ |
| step-halving error (first 10 % of probe horizon, N = 20 000) | $6.43\times 10^{-6}$ |
| $\max\lvert s\rvert$ over probe horizon | $3.818$ |
| boundedness | finite over the full horizon |

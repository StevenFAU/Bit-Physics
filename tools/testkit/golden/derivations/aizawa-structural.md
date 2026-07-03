# Derivation — Aizawa system structural invariants (canonical parameters)

> **Canonical references:**
> - Aizawa, Y. (1982), "Global aspects of the dissipative dynamical
>   systems II", *Prog. Theor. Phys.* 68 (1), 64–84 — the source
>   attractor family.
> - Sprott, J. C. (2003), *Chaos and Time-Series Analysis*, Oxford
>   University Press, ISBN 978-0-19-850839-7 — the catalog in which the
>   commonly used form of the field circulates.
> - Repo parameter anchor:
>   `docs/sim-specs/closed-form/strange-attractors/algebraic.md` § 4
>   pins the exact field form and the canonical parameter set
>   $(a, b, c, d, e, f) = (0.95, 0.7, 0.6, 3.5, 0.25, 0.1)$ used by the
>   sim and by this table.

The Aizawa attractor's "golden values" at the canonical parameter set
are **structural** invariants of the vector field, not numerical
trajectory points — appropriate for closed-form code verification per
spec § 5.1. The field (algebraic.md § 4 form) is

$$\dot{x} = (z - b)x - dy,\quad \dot{y} = dx + (z - b)y,\quad \dot{z} = c + az - \frac{z^3}{3} - (x^2 + y^2)(1 + ez) + fzx^3.$$

Three quantities are exposed:

1. The on-axis fixed points (the real roots of a depressed cubic in
   $z$).
2. The Jacobian eigenvalues at each on-axis fixed point
   (block-diagonal closed form).
3. The divergence form, its value at the origin, and the origin field
   probe.

## 1. On-axis fixed points

On the $z$-axis ($x = y = 0$) the $x$- and $y$-equations vanish
identically ($(z-b)\cdot 0 - d\cdot 0 = 0$ regardless of $z$), and the
$z$-equation reduces to

$$c + az - \frac{z^3}{3} = 0 \quad\Longleftrightarrow\quad z^3 - 3az - 3c = 0,$$

a depressed cubic $t^3 + pt + q$ with $p = -3a$, $q = -3c$. Its
discriminant is

$$\Delta = -4p^3 - 27q^2 = -4(-3a)^3 - 27(-3c)^2 = 108a^3 - 243c^2.$$

At canonical $(a, c) = (0.95, 0.6)$:
$\Delta = 108(0.857375) - 243(0.36) = 92.5965 - 87.48 = 5.1165 > 0$,
so there are **three distinct real roots**. Since $p < 0$, the
trigonometric (casus irreducibilis) solution applies:

$$z_k = 2\sqrt{a}\,\cos\!\left(\frac{1}{3}\arccos\!\frac{3c}{2a^{3/2}} - \frac{2\pi k}{3}\right),\qquad k = 0, 1, 2.$$

Numerically (ascending):

$$z_1 = -1.105021367630836\ldots,\quad z_2 = -0.838243008543318\ldots,\quad z_3 = 1.943264376174154\ldots$$

Only $(a, c)$ enter: the on-axis fixed-point set is independent of
$b, d, e, f$.

**Independent routes:** hand reduction to the depressed cubic above;
SymPy `real_roots` (generator); `numpy.roots` in the sim reference
(`packages/strange-attractors/strange_attractors/reference/aizawa.py`),
exercised by the golden test.

## 2. On-axis Jacobian eigenvalues

The Jacobian of the field is

$$J(\mathbf{x}) = \begin{pmatrix}z - b & -d & x \\ d & z - b & y \\ -2x(1 + ez) + 3fzx^2 & -2y(1 + ez) & a - z^2 - e(x^2 + y^2) + fx^3\end{pmatrix}.$$

At an on-axis point $(0, 0, z_*)$ every entry containing $x$ or $y$
vanishes and $J$ becomes **block-diagonal**:

$$J(0, 0, z_*) = \begin{pmatrix}z_* - b & -d & 0 \\ d & z_* - b & 0 \\ 0 & 0 & a - z_*^2\end{pmatrix}.$$

The $(x, y)$ block is the rotation-plus-scale matrix
$\begin{pmatrix}\mu & -d\\ d & \mu\end{pmatrix}$ with $\mu = z_* - b$,
whose characteristic polynomial $(\mu - \lambda)^2 + d^2 = 0$ gives
the spiral pair

$$\lambda_{1,2} = (z_* - b) \pm d\,i,$$

and the decoupled $z$-row gives the real eigenvalue

$$\lambda_3 = a - z_*^2.$$

Equivalently, the full characteristic polynomial factors as
$\big((\lambda - (z - b))^2 + d^2\big)\big(\lambda - (a - z^2)\big)$
for **symbolic** $z$ — the generator verifies this factorization
exactly before evaluating at the roots.

Per root at canonical $(a, b, d) = (0.95, 0.7, 3.5)$:

| $z_*$ | spiral pair $\mathrm{Re}$ ($z_* - b$) | $\lvert\mathrm{Im}\rvert$ ($d$) | real eigenvalue ($a - z_*^2$) |
|---|---|---|---|
| $-1.105021367630836$ | $-1.805021367630836$ | $3.5$ | $-0.271072222920723$ |
| $-0.838243008543318$ | $-1.538243008543318$ | $3.5$ | $0.247348658628247$ |
| $1.943264376174154$ | $1.243264376174154$ | $3.5$ | $-2.826276435707524$ |

**Independent routes:** hand block-diagonal argument above; SymPy
eigenstructure (generator); `numpy.linalg.eigvals` on the full
reference Jacobian (sim test).

## 3. Divergence and origin probe

The trace of the Jacobian in § 2 is

$$\nabla\cdot f = \mathrm{tr}\,J = 2(z - b) + a - z^2 - e(x^2 + y^2) + fx^3.$$

At the origin only the constant terms survive:
$2(0 - 0.7) + 0.95 = -1.4 + 0.95 = -0.45$.

The field value at the origin is read directly off the field
definition: with $x = y = z = 0$ every term vanishes except the
constant $c$ in the $z$-component, so

$$f(0, 0, 0) = (0, 0, c) = (0, 0, 0.6).$$

**Independent routes:** hand trace above; SymPy trace (generator);
central-difference numerical divergence (sim PBT invariant).

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/aizawa_structural.py` uses SymPy to
**symbolically** derive the Jacobian from the field, verify the
on-axis characteristic-polynomial factorization for symbolic $z$,
extract the three real cubic roots via `real_roots`, and evaluate the
per-root eigenvalue data and the origin divergence/field probes,
asserting agreement against the hand-derived values committed in
`tools/testkit/golden/tables/closed-form/aizawa-structural.json`.
The sim-side cross-check at
`packages/strange-attractors/tests/test_family_structural_golden.py`
asserts the **sim's NumPy reference implementation** reproduces the
same roots, eigenvalues (via both the closed-form helper and
`numpy.linalg.eigvals`), divergence, and origin field probe.

## 5. FACT / INFERENCE tagging

- **FACT** — the attractor family is due to Aizawa 1982 (*Prog.
  Theor. Phys.* 68 (1), 64–84); the commonly used field form is
  cataloged in Sprott 2003 (ISBN 978-0-19-850839-7).
- **FACT** — the exact field form and canonical parameters used here
  are pinned by the repo anchor
  `docs/sim-specs/closed-form/strange-attractors/algebraic.md` § 4;
  all algebra in §§ 1–3 follows from that form by hand.
- **INFERENCE** — the association of the cataloged form with specific
  equations inside Aizawa 1982 is not page-pinned here; the golden
  values verify the repo-anchored form, whose provenance chain is
  Aizawa 1982 → Sprott 2003 catalog → algebraic.md § 4.

## 6. Canonical-run calibration

Measured 2026-07-03 with an RK4 step-halving probe over the first 10 %
of the horizon (dt was **measured-then-declared** per spec § 6.2
sanity posture):

| item | value |
|---|---|
| IC | $(0.1, 0, 0)$ |
| dt | $0.01$ |
| N (steps) | $10\,000$ |
| step-halving error (first 10 % of horizon) | $\approx 2.3\times 10^{-7}$ |
| $\max\lvert s\rvert$ over horizon | $1.885$ |
| boundedness | finite over the full horizon |

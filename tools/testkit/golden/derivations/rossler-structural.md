# Derivation — Rössler system structural invariants (canonical parameters)

> **Canonical reference:**
> - Rössler, O. E. (1976), "An equation for continuous chaos", *Phys.
>   Lett. A* 57 (5), 397–398. DOI 10.1016/0375-9601(76)90101-8. Eq. (1)
>   defines the field; the canonical parameter set
>   $(a, b, c) = (0.2, 0.2, 5.7)$ is the one used throughout the paper's
>   continuous-chaos discussion.

The Rössler attractor's "golden values" at the canonical parameter set
$(a, b, c) = (0.2, 0.2, 5.7)$ are **structural** invariants of the
vector field $f(\mathbf{x}; \boldsymbol{\theta})$, not numerical
trajectory points. This is appropriate for closed-form code
verification per spec § 5.1 (golden-value tables anchored on algebraic
structure rather than discretized solutions).

Three quantities are exposed:

1. The two fixed points $\{P_\mathrm{in}, P_\mathrm{out}\}$.
2. The three eigenvalues of the Jacobian at the inner fixed point
   $J(P_\mathrm{in})$.
3. The divergence $\nabla\cdot f$ (state-dependent, linear in $x$), at
   two probe points.

Each derivation below is hand-derivable from the ODE definition.

## 1. Fixed points

Setting $\dot{x} = \dot{y} = \dot{z} = 0$ in

$$\dot{x} = -y - z,\quad \dot{y} = x + ay,\quad \dot{z} = b + z(x - c)$$

gives, from $\dot{x} = 0$: $y = -z$; from $\dot{y} = 0$:
$x = -ay = az$. Substituting both into $\dot{z} = 0$:

$$b + z(az - c) = 0 \quad\Longleftrightarrow\quad az^2 - cz + b = 0,$$

so

$$z_\pm = \frac{c \pm \sqrt{c^2 - 4ab}}{2a},\qquad x = az,\qquad y = -z,$$

with two real fixed points whenever $c^2 > 4ab$.

For canonical parameters: $c^2 - 4ab = 32.49 - 0.16 = 32.33$ and
$\sqrt{32.33} = 5.68594759033\ldots$, hence

- $z_\mathrm{in} = (5.7 - \sqrt{32.33})/0.4 = 0.0351310241705\ldots$
  giving $P_\mathrm{in} = (az_\mathrm{in}, -z_\mathrm{in}, z_\mathrm{in})
  \approx (0.00702620483, -0.03513102417, 0.03513102417)$;
- $z_\mathrm{out} = (5.7 + \sqrt{32.33})/0.4 = 28.4648689758\ldots$
  giving $P_\mathrm{out} \approx (5.69297379517, -28.4648689758,
  28.4648689758)$.

$P_\mathrm{in}$ sits near the origin inside the scroll;
$P_\mathrm{out}$ is far outside the attractor.

**Independent routes:**
- Hand algebra above (quadratic formula on $az^2 - cz + b = 0$).
- SymPy symbolic evaluation in
  `tools/testkit/golden/generator/rossler_structural.py`.
- NumPy closed-form solve in the sim reference
  (`packages/strange-attractors/strange_attractors/reference/rossler.py`),
  exercised by the golden test.

## 2. Inner fixed-point Jacobian eigenvalues

The Jacobian of $f$ is

$$J(\mathbf{x}) = \begin{pmatrix}0 & -1 & -1 \\ 1 & a & 0 \\ z & 0 & x - c\end{pmatrix}.$$

Writing $m = x - c$ for brevity, the characteristic polynomial expands
by cofactors along the first row:

$$\det(J - \lambda I) = -\lambda\big[(a - \lambda)(m - \lambda)\big] + (m - \lambda) + z(a - \lambda),$$

which, after collecting powers of $\lambda$ and normalizing the leading
coefficient, is

$$\lambda^3 - (a + m)\lambda^2 + (am + 1 + z)\lambda - (m + za) = 0.$$

At $P_\mathrm{in}$ (canonical parameters):
$m = x_\mathrm{in} - c = -5.6929737951659$,
$z = z_\mathrm{in} = 0.0351310241705$, so the cubic is

$$\lambda^3 + 5.4929737951659\,\lambda^2 - 0.1034637348627\,\lambda + 5.6859475903318 \approx 0$$

(coefficient signs: $-(a+m) = +5.49297\ldots$, $am + 1 + z =
-0.10346\ldots$, $-(m + za) = +5.68595\ldots$). Its roots are

$$\lambda_1 \approx -5.686975507342862,\qquad \lambda_{2,3} \approx 0.09700085608848 \pm 0.99519349103\,i.$$

This is the saddle-focus signature: one strongly stable real
eigenvalue and one weakly unstable spiral pair — the single-scroll
winding mechanism.

**Independent routes:**
- Hand characteristic-polynomial expansion above (the coefficient sum
  cross-checks: $\lambda_1 + \lambda_2 + \lambda_3 = a + m =
  -5.4929737951659$, which equals $\mathrm{tr}\,J(P_\mathrm{in})$ and
  the divergence value in § 3).
- SymPy symbolic eigenvalues of $J(P_\mathrm{in})$ (generator).
- `numpy.linalg.eigvals` on the reference Jacobian (sim test).

## 3. Divergence of the vector field

By inspection of the Jacobian, only two diagonal entries are nonzero
($\partial \dot{y}/\partial y = a$ and $\partial \dot{z}/\partial z =
x - c$), so

$$\nabla\cdot f = \mathrm{tr}\,J(\mathbf{x}) = a + (x - c)$$

— state-dependent, linear in $x$ with parameter-independent unit
slope. Probe values at canonical parameters:

- At the origin: $0.2 + (0 - 5.7) = -5.5$.
- At $P_\mathrm{in}$: $0.2 + (0.00702620483\ldots - 5.7) =
  -5.49297379517\ldots$ (equal to the eigenvalue sum of § 2, as it
  must be).

**Independent routes:** hand trace above; SymPy trace (generator);
central-difference numerical divergence (sim PBT invariant).

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/rossler_structural.py` uses SymPy to
**symbolically** evaluate the fixed-point coordinates, the
characteristic-polynomial roots at $P_\mathrm{in}$, and the Jacobian
trace at the canonical parameter set, and asserts agreement against
the hand-derived values committed in
`tools/testkit/golden/tables/closed-form/rossler-structural.json`.
The sim-side cross-check at
`packages/strange-attractors/tests/test_family_structural_golden.py`
loads the table and asserts the **sim's NumPy reference
implementation** produces the same fixed points, eigenvalues (via
`numpy.linalg.eigvals`), and divergence probes.

## 5. FACT / INFERENCE tagging

- **FACT** — the field form and canonical $(a, b, c) = (0.2, 0.2,
  5.7)$ are from Rössler 1976 (DOI 10.1016/0375-9601(76)90101-8).
- **FACT** — all algebra in §§ 1–3 is elementary and reproducible by
  hand from the field definition.
- **INFERENCE** — the labels $P_\mathrm{in}$/$P_\mathrm{out}$
  (inner saddle-focus the scroll winds around vs. outer point) are the
  repo's naming convention, not Rössler's; the coordinates themselves
  are citation-independent algebra.

## 6. Canonical-run calibration

Measured 2026-07-03 with an RK4 step-halving probe over the first 10 %
of the horizon (dt was **measured-then-declared** per spec § 6.2
sanity posture):

| item | value |
|---|---|
| IC | $(1, 1, 1)$ |
| dt | $0.02$ |
| N (steps) | $10\,000$ |
| step-halving error (first 10 % of horizon) | $2.95\times 10^{-7}$ |
| $\max\lvert s\rvert$ over horizon | $22.773$ |
| boundedness | finite over the full horizon |

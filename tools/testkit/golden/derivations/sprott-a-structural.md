# Derivation — Sprott-A system structural invariants (parameter-free)

> **Canonical reference:**
> - Sprott, J. C. (1994), "Some simple chaotic flows", *Phys. Rev. E*
>   50 (2), R647–R650. DOI 10.1103/PhysRevE.50.R647. Defines the
>   catalog of minimal chaotic flows labeled A–S; case **A** is the
>   conservative, volume-preserving member used here.

The Sprott-A system

$$\dot{x} = y,\qquad \dot{y} = -x + yz,\qquad \dot{z} = 1 - y^2$$

is parameter-free, so its "golden values" are pure **structural**
invariants of the vector field — appropriate for closed-form code
verification per spec § 5.1. Three quantities are exposed:

1. The equilibrium count (zero — the defining structural fact).
2. The divergence $\nabla\cdot f = z$ and three probe values.
3. The exact parity symmetry $(x, y, z) \to (-x, -y, z)$.

## 1. Empty equilibrium set

Setting $\dot{x} = 0$ forces $y = 0$. But then

$$\dot{z} = 1 - y^2 = 1 \neq 0,$$

so the system $f(\mathbf{x}) = 0$ is **inconsistent**: the fixed-point
set is empty. (Two lines of algebra — the first equation pins $y$, the
third contradicts it.) No trajectory can ever come to rest; combined
with the zero-mean divergence of § 2 this is the conservative
"chaotic sea" picture rather than an attractor with a resting
skeleton.

**Independent routes:** the hand inconsistency argument above; SymPy
`solve` of the field returning the empty set (generator); the sim-side
contract that `equilibria()` returns `[]` in
`packages/strange-attractors/strange_attractors/reference/sprott.py`,
asserted by the golden test.

## 2. Divergence of the vector field

The Jacobian is

$$J(\mathbf{x}) = \begin{pmatrix}0 & 1 & 0 \\ -1 & z & y \\ 0 & -2y & 0\end{pmatrix},$$

whose only nonzero diagonal entry is $\partial \dot{y}/\partial y = z$:

$$\nabla\cdot f = \mathrm{tr}\,J = z.$$

The divergence is state-dependent but signed: over a bounded orbit its
time average vanishes (zero net contraction), which is the
volume-preserving / conservative signature of case A. Probe values
follow immediately:

| point | $\nabla\cdot f$ |
|---|---|
| $(1, 2, 3)$ | $3.0$ |
| $(0, 0, 0)$ | $0.0$ |
| $(-4, 1, -2.5)$ | $-2.5$ |

**Independent routes:** hand trace above; SymPy trace (generator);
central-difference numerical divergence (sim PBT invariant).

## 3. Parity symmetry

Let $P = \operatorname{diag}(-1, -1, 1)$, i.e. $(x, y, z) \mapsto
(-x, -y, z)$. Direct substitution into the field:

$$f(P\mathbf{s}) = \big(-y,\; -(-x) + (-y)z,\; 1 - (-y)^2\big) = (-y,\; x - yz,\; 1 - y^2),$$

while

$$P f(\mathbf{s}) = \big(-y,\; -(-x + yz),\; 1 - y^2\big) = (-y,\; x - yz,\; 1 - y^2).$$

The two agree **exactly** (component-wise: $\dot{x} = y$ is odd in
$y$; $\dot{y} = -x + yz$ is jointly odd in $(x, y)$; $\dot{z} = 1 -
y^2$ is even in $y$), so the residual $f(P\mathbf{s}) -
Pf(\mathbf{s})$ is identically the zero vector and the invariant set
is symmetric under the half-turn about the $z$-axis.

**Independent routes:** hand substitution above; SymPy symbolic
residual matrix exactly zero (generator); numerical sampling of the
identity at fixed and random points (sim test + PBT invariant).

## 4. Generator contract

The Python generator at
`tools/testkit/golden/generator/sprott_a_structural.py` uses SymPy to
`solve` the field (asserting the empty set), symbolically verify
$\mathrm{tr}\,J = z$ and evaluate the probe points, and expand the
parity residual matrix (asserting it is exactly zero), comparing
against the values committed in
`tools/testkit/golden/tables/closed-form/sprott-a-structural.json`.
The sim-side cross-check at
`packages/strange-attractors/tests/test_family_structural_golden.py`
asserts the **sim's NumPy reference implementation** reproduces the
empty equilibrium set, the divergence probes (helper and Jacobian
trace), and a bit-exact zero parity residual at sampled points.

## 5. FACT / INFERENCE tagging

- **FACT** — the case-A field is from Sprott 1994 (DOI
  10.1103/PhysRevE.50.R647); the system has no free parameters.
- **FACT** — all algebra in §§ 1–3 is elementary and reproducible by
  hand from the field definition.
- **INFERENCE** — "zero net contraction over a bounded orbit" is the
  standard reading of the signed, zero-mean divergence for the
  conservative case; the golden table checks the pointwise values,
  the orbit-average statement is exercised by the PBT invariant
  rather than this table.

## 6. Canonical-run calibration

Measured 2026-07-03 with an RK4 step-halving probe over the first 10 %
of the horizon (dt was **measured-then-declared** per spec § 6.2
sanity posture):

| item | value |
|---|---|
| IC | $(0, 5, 0)$ |
| dt | $0.01$ |
| N (steps) | $10\,000$ |
| step-halving error (first 10 % of horizon) | $3.05\times 10^{-7}$ |
| $\max\lvert s\rvert$ over horizon | $5.0$ |
| boundedness | finite over the full horizon |

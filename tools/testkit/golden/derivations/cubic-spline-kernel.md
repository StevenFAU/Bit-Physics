# Derivation — Monaghan cubic-spline SPH kernel (3D)

> **Canonical reference:** Monaghan, J. J. (1992) "Smoothed particle
> hydrodynamics." *Annual Review of Astronomy and Astrophysics*, 30, 543–574.
> Monaghan, J. J. (2005) "Smoothed particle hydrodynamics." *Reports on
> Progress in Physics*, 68(8), 1703–1759, Eq. (2.7).
> **Vendored upstream test target:** `references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.h`
> (`CubicKernel`, lines 16–95) at SHA `6bff55a6eaf14083d34650f22a268ce156b62b54`.

This derivation is independent of the SPlisHSPlasH source per spec § 2.4:
the vendored upstream is the **test target**, not the source of truth. The
golden-table values are computed symbolically from the analytic definition
below; the SymPy generator regenerates the table from this derivation
verbatim, and at least three of the nine test points carry independent
hand-derivations.

## 1. Definition

The cubic-spline (B₃) kernel, normalized in $d$ spatial dimensions, is

$$W(\mathbf{r}, h) \;=\; \frac{\sigma_d}{h^d}\, f(q), \qquad q \,=\, \frac{\|\mathbf{r}\|}{h},$$

with the piecewise polynomial

$$f(q) \;=\;
\begin{cases}
1 - \tfrac{3}{2} q^{2} + \tfrac{3}{4} q^{3} & 0 \le q < 1,\\[4pt]
\tfrac{1}{4}\,(2 - q)^{3}                  & 1 \le q < 2,\\[4pt]
0                                          & q \ge 2,
\end{cases}$$

and the dimension-dependent normalization $\sigma_d$ chosen so that
$\int_{\mathbb{R}^d} W \,\mathrm{d}^d\mathbf{r} = 1$:

| $d$ | $\sigma_d$ |
|---|---|
| 1 | $\tfrac{2}{3}$ |
| 2 | $\tfrac{10}{7\pi}$ |
| 3 | $\tfrac{1}{\pi}$ |

This document fixes **$d = 3$** as canonical for the Phase 0 golden table.
Compact support is $\|\mathbf{r}\| < 2h$; the kernel vanishes identically
for $q \ge 2$.

## 2. 3D normalization — derivation of $\sigma_3 = 1/\pi$

Imposing $\int_{\mathbb{R}^3} W(\mathbf{r}, h)\,\mathrm{d}^3\mathbf{r} = 1$
and substituting $\mathbf{r} \to (q, \theta, \varphi)$ with $q = r/h$:

$$1 \;=\; \int_0^{\infty} 4\pi r^{2}\, \frac{\sigma_3}{h^3}\, f(q)\,\mathrm{d}r
\;=\; 4\pi\,\sigma_3 \int_0^{\infty} q^{2} f(q)\,\mathrm{d}q.$$

Splitting at the piecewise boundary and computing each integral
symbolically (see `generator/cubic_spline.py`):

$$\int_0^{1} q^{2}\!\left(1 - \tfrac{3}{2} q^{2} + \tfrac{3}{4} q^{3}\right) \mathrm{d}q
\;=\; \tfrac{1}{3} - \tfrac{3}{10} + \tfrac{1}{8} \;=\; \tfrac{19}{120}.$$

$$\int_1^{2} q^{2} \cdot \tfrac{1}{4}(2 - q)^{3}\,\mathrm{d}q
\;=\; \tfrac{1}{4}\!\left[\tfrac{2 q^{3}}{3} - \tfrac{3 q^{4}}{2}
       + \tfrac{6 q^{5}}{5} - \tfrac{q^{6}}{3}\right]_{1}^{2}
\;=\; \tfrac{11}{120}.$$

Summing: $\int_0^{\infty} q^{2} f(q)\,\mathrm{d}q = \tfrac{30}{120} = \tfrac{1}{4}$,
so

$$\sigma_3 \;=\; \frac{1}{4\pi \cdot 1/4} \;=\; \frac{1}{\pi}.$$

## 3. Gradient magnitude

For an SPH kernel the gradient at a particle pair separated by $\mathbf{r}$
is $\nabla W = \frac{\mathrm{d}W}{\mathrm{d}r}\,\hat{\mathbf{r}}$, so

$$|\nabla W|(q, h) \;=\; \frac{\sigma_3}{h^{4}}\, |f'(q)|,$$

with

$$f'(q) \;=\;
\begin{cases}
-3 q + \tfrac{9}{4} q^{2} & 0 \le q < 1,\\[4pt]
-\tfrac{3}{4}(2 - q)^{2}  & 1 \le q < 2,\\[4pt]
0                          & q \ge 2.
\end{cases}$$

The golden table records $|\nabla W|$ (always non-negative). Note that
$f'(0) = 0$ — the kernel has zero gradient at the origin, which is the
standard SPH symmetry-preservation property.

## 4. Independent-reference anchors

Per spec § 2.4 and Phase 0 plan § 7.4, at least three test points carry an
independent hand-derivation that does **not** consult either SymPy or the
SPlisHSPlasH source. The independent values must agree with the SymPy
results to within $10^{-10}$ absolute, else the kernel pipeline HALTs (one
of the two is wrong).

### Anchor q = 0 (peak)

$f(0) = 1$, so $W(0, h{=}1) = \sigma_3 \cdot 1 = 1/\pi$.

$f'(0) = 0$, so $|\nabla W|(0, h{=}1) = 0$.

Cite: Monaghan 2005 Eq. (2.7); the $\sigma_3 = 1/\pi$ normalization is the
standard result for the 3D cubic spline (also stated in Price 2012,
*Smoothed Particle Hydrodynamics and Magnetohydrodynamics*, §3.2).

**INFERENCE — divergence from plan § 7.4 text.** The plan paraphrases the
peak as "$W(0, h{=}1) = 8/\pi$." That value belongs to the alternative
support-radius convention used by SPlisHSPlasH (`m_k = 8/(\pi h^3)`,
$q = r/h$, support at $q = 1$), where the parameter $h$ denotes the
**support radius**, not the smoothing length. Per the integration
constraint in § 2 above, the Monaghan classical $q \in [0, 2]$ convention
with support at $q = 2$ — which the plan explicitly requires by listing
test points $q \in \{1.25, 1.5, 1.75, 2.0\}$ and by demanding
$W(q{=}2) \equiv 0$ — admits only $\sigma_3 = 1/\pi$. The two values are
related by a rescaling $h_\text{Monaghan} = h_\text{support}/2$ that
leaves the kernel function unchanged in real space. We adopt the
classical Monaghan value; the plan's $8/\pi$ is a paraphrase artifact
from mixing conventions.

### Anchor q = 1 (piecewise boundary)

Both pieces must agree at $q = 1$ for $C^2$ continuity.

- Piece A at $q = 1$: $1 - 3/2 + 3/4 = 1/4$, so $W = \sigma_3 \cdot 1/4 = 1/(4\pi)$.
- Piece B at $q = 1$: $\tfrac{1}{4}(2 - 1)^{3} = 1/4$, so $W = 1/(4\pi)$. ✓
- $f'(1)$ from piece A: $-3 + 9/4 = -3/4$.
- $f'(1)$ from piece B: $-\tfrac{3}{4}(2-1)^{2} = -3/4$. ✓
- $|\nabla W|(1, h{=}1) = (1/\pi) \cdot 3/4 = 3/(4\pi)$.

Cite: Monaghan 2005 Eq. (2.7) piecewise switch; continuity is enforced by
construction of the B-spline.

### Anchor q = 2 (compact support)

$f(2) = \tfrac{1}{4}(2 - 2)^{3} = 0$, and $f'(2) = -\tfrac{3}{4}(0)^{2} = 0$.

Cite: Monaghan 1992 § 2; the cubic-spline kernel has compact support
$[0, 2h]$ by construction.

## 5. Relationship to the SPlisHSPlasH `CubicKernel`

The vendored implementation at `SPlisHSPlasH/SPHKernels.h:16–95` uses the
**support-radius parameterization**:

$$\tilde W(r, h_s) = \frac{8}{\pi h_s^3}\,\tilde f\!\left(\frac{r}{h_s}\right),
\qquad \tilde f(\tilde q) = \begin{cases}
6\tilde q^{3} - 6\tilde q^{2} + 1 & 0 \le \tilde q \le 1/2,\\
2(1 - \tilde q)^{3}               & 1/2 < \tilde q \le 1,\\
0                                  & \tilde q > 1.
\end{cases}$$

This is the same kernel as ours under $h_s = 2 h$, $\tilde q = q/2$. To
verify on a future SPH simulation, set the SPlisHSPlasH support radius to
$h_s = 2 h$ and the kernel values match $W(q, h)$ pointwise. Phase 0
Block 4 does not exercise the upstream at runtime; that lives in a
future phase per `deferred_items` in this block's audit report.

## 6. Regeneration

Run `python tools/testkit/golden/generator/cubic_spline.py` from the
repo root with the `bit-physics-testkit` extras installed. The generator:

1. Recomputes every entry in `tables/cubic-spline-kernel.json` from the
   SymPy symbolic expression of $W$ and $|\nabla W|$.
2. Re-verifies that each `independent_reference.expected` value agrees
   with the SymPy value at the corresponding anchor point to within
   $10^{-10}$ absolute.
3. Writes the table byte-for-byte deterministically (sorted keys,
   2-space indent, trailing newline) so re-running it on a clean repo
   produces no diff.

If the generator's idempotency test (`tests/test_generator.py`) ever
diffs against the committed table, either the SymPy derivation drifted
or the table was hand-edited; both are bugs.

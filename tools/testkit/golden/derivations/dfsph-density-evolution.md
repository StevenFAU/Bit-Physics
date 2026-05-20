# Derivation — DFSPH density evolution at a two-particle fixture

> **Canonical references:**
> - Bender, J. & Koschier, D. (2015), "Divergence-free smoothed
>   particle hydrodynamics", *ACM SIGGRAPH/Eurographics Symposium
>   on Computer Animation (SCA '15)*, 147–155.
>   DOI [10.1145/2786784.2786796](https://doi.org/10.1145/2786784.2786796).
> - Monaghan, J. J. (2005), "Smoothed particle hydrodynamics",
>   *Rep. Prog. Phys.* 68 (8), 1703–1759.
>   DOI [10.1088/0034-4885/68/8/R01](https://doi.org/10.1088/0034-4885/68/8/R01).
> - SPlisHSPlasH 2.16.1 vendored at `references/SPlisHSPlasH/`
>   (SHA `6bff55a6eaf14083d34650f22a268ce156b62b54`,
>   verified at this commit per playbook P4). `SPHKernels.h` is the
>   in-tree cubic-spline kernel implementation citation; Phase 0's
>   `tools/testkit/golden/tables/cubic-spline-kernel.json` already
>   pins the kernel-evaluation values.

This derivation is **independent** of the vendored SPlisHSPlasH source
per spec § 2.4: the vendored upstream is the test target, not the
source of truth. The DFSPH density evolution is the SPH continuity
equation; the values below are derived directly from the cubic-spline
kernel formula and the discrete continuity rule.

## 1. Definitions (cubic-spline kernel, 3D)

3D Monaghan cubic-spline kernel with normalization $\sigma_3 = 1/\pi$:

$$W(\mathbf{r}, h) = \frac{\sigma_3}{h^{3}}\,f(q),\qquad q = \|\mathbf{r}\|/h,$$

with

$$f(q) = \begin{cases}
1 - \tfrac{3}{2} q^{2} + \tfrac{3}{4} q^{3} & 0 \le q < 1,\\
\tfrac{1}{4}(2 - q)^{3} & 1 \le q < 2,\\
0 & q \ge 2.
\end{cases}$$

Gradient with respect to $\mathbf{r}_{i}$:

$$\nabla_{i} W(\mathbf{r}_{i} - \mathbf{r}_{j}, h) = \frac{\sigma_3}{h^{4}}\,f'(q)\,\frac{\mathbf{r}_{i} - \mathbf{r}_{j}}{\|\mathbf{r}_{i} - \mathbf{r}_{j}\|},$$

with

$$f'(q) = \begin{cases}
-3 q + \tfrac{9}{4} q^{2} & 0 \le q < 1,\\
-\tfrac{3}{4}(2 - q)^{2} & 1 \le q < 2.
\end{cases}$$

## 2. SPH continuity / density evolution

Density at particle $i$:

$$\rho_{i} = \sum_{j} m_{j}\,W(\mathbf{r}_{i} - \mathbf{r}_{j}, h).$$

Continuity-equation density evolution (Bender & Koschier 2015, eq. 5;
Monaghan 2005 § 2.2):

$$\frac{d\rho_{i}}{dt} = \sum_{j} m_{j}\,(\mathbf{v}_{i} - \mathbf{v}_{j})\cdot\nabla_{i} W(\mathbf{r}_{i} - \mathbf{r}_{j}, h).$$

## 3. Two-particle fixture (closed form)

| Particle | Position | Velocity | Mass |
|---|---|---|---|
| 0 | $(0, 0, 0)$ | $(0, 0, 0)$ | $1.0$ |
| 1 | $(0.5, 0, 0)$ | $(1, 0, 0)$ | $1.0$ |

Kernel parameter $h = 1.0$.

### Density at particle 0

- Self contribution: $q = 0$, $f(0) = 1$ ⇒ $W(0, 1) = 1/\pi$.
- From particle 1: $q = 0.5$, $f(0.5) = 1 - 1.5(0.25) + 0.75(0.125) = 0.71875$ ⇒ $W(0.5, 1) = 0.71875/\pi$.

$$\rho_{0} = (1 + 0.71875)/\pi = 1.71875/\pi = 0.5470951168783902.$$

### Density derivative at particle 0

Only particle 1 contributes (self gives zero gradient at $\mathbf{r} = 0$).

- $\mathbf{v}_{0} - \mathbf{v}_{1} = (-1, 0, 0)$.
- $\mathbf{r}_{0} - \mathbf{r}_{1} = (-0.5, 0, 0)$; $(\mathbf{r}_{0} - \mathbf{r}_{1})/0.5 = (-1, 0, 0)$.
- $f'(0.5) = -3(0.5) + (9/4)(0.25) = -1.5 + 0.5625 = -0.9375$.
- $\nabla_{0} W(\mathbf{r}_{0} - \mathbf{r}_{1}, 1) = (1/\pi) \cdot (-0.9375) \cdot (-1, 0, 0) = (0.9375/\pi, 0, 0)$.

$$\frac{d\rho_{0}}{dt} = (1) \cdot (-1, 0, 0) \cdot (0.9375/\pi, 0, 0) = -0.9375/\pi = -0.2984155182973038.$$

## 4. Independent-reference anchors

Per spec § 2.4 R9, the values in § 3 carry:

1. **Hand-derivation** above (§ 3) — every value substituted directly
   from the cubic-spline kernel formula in § 1.
2. **Bender & Koschier 2015 § 3 eq. (5)** for the continuity-equation
   form; **Monaghan 2005 § 2.2** for the symmetric SPH variant of the
   same formula. Both publish the formula verbatim.
3. **Phase 0's `cubic-spline-kernel.json` golden** independently pins
   $W(q, h)$ values (the kernel-evaluation column of any DFSPH
   computation is shared between the cubic-spline-kernel golden and
   this DFSPH golden; Phase 1 reuses Phase 0's pin rather than
   re-deriving).
4. (auxiliary) Python re-derivation by
   `tools/testkit/golden/generator/dfsph_density_evolution.py`.

## 5. Generator contract

`tools/testkit/golden/generator/dfsph_density_evolution.py --verify`
re-computes $\rho_0$ and $d\rho_0/dt$ from the cubic-spline formula
and asserts equality with the table at `1e-15` absolute tolerance.
Phase 1 ships the generator; Phase 2+ adds the sim-side cross-check.

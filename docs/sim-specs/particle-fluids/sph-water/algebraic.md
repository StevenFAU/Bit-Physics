# sph-water — Algebraic derivation

> Per charter § 7.7. FACT-tagged.

## 1. SPH discretization (Monaghan 1992)

**FACT — citation.** Monaghan, J. J. (1992), "Smoothed particle
hydrodynamics", *Annual Review of Astronomy and Astrophysics*, 30,
543–574. DOI [10.1146/annurev.aa.30.090192.002551](https://doi.org/10.1146/annurev.aa.30.090192.002551).

Fluid is represented as Lagrangian particles $\{(\mathbf{r}_{i},
\mathbf{v}_{i}, m_{i})\}$. Density at particle $i$:

$$\rho_{i} = \sum_{j} m_{j} W(\mathbf{r}_{i} - \mathbf{r}_{j}, h),$$

where $W$ is a smoothing kernel of compact support $2h$.

## 2. Cubic-spline kernel (3D)

Per Phase 0's `tools/testkit/golden/tables/cubic-spline-kernel.json`
+ `tools/testkit/golden/derivations/cubic-spline-kernel.md` (do **not**
re-derive at this stage): $W(\mathbf{r}, h) = \sigma_{3}/h^{3} \cdot
f(q)$, $q = \|\mathbf{r}\|/h$, $\sigma_{3} = 1/\pi$, with the
piecewise polynomial $f(q)$ given in Phase 0's derivation.

## 3. DFSPH (Bender & Koschier 2015)

**FACT — citation.** Bender, J. & Koschier, D. (2015),
"Divergence-free smoothed particle hydrodynamics", *SCA '15*.
DOI [10.1145/2786784.2786796](https://doi.org/10.1145/2786784.2786796).

DFSPH enforces incompressibility via two iterative correction
solvers: a **divergence-free** solver (enforces $\nabla \cdot
\mathbf{v} = 0$) and a **constant-density** solver (enforces
$\rho_{i} = \rho_{0}$ for all $i$). Between solver passes the
discrete continuity equation is

$$\frac{d\rho_{i}}{dt} = \sum_{j} m_{j}\,(\mathbf{v}_{i} - \mathbf{v}_{j})\cdot\nabla_{i} W(\mathbf{r}_{i} - \mathbf{r}_{j}, h),$$

(Bender & Koschier 2015 eq. (5)). This is the equation the Stage 2
golden table verifies at the two-particle fixture.

## 4. Canonical sim parameters

| Parameter | Value | Source |
|---|---|---|
| Kernel | cubic-spline (3D) | Monaghan 1992 |
| Rest density $\rho_{0}$ | $1000\,\mathrm{kg}/\mathrm{m}^{3}$ | SPlisHSPlasH default for water |
| Particle count | $\sim 1\text{–}4\times 10^{6}$ | spec § 5.4 |
| Neighbor query | Morton-sorted spatial hash | SPlisHSPlasH |
| Rendering | screen-space (Stam-Akinci) | spec § 5.4 |

## 5. Golden anchor

The DFSPH density-evolution golden at
`tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json`
pins $\rho_{0}$ and $d\rho_{0}/dt$ at a two-particle fixture
($h = 1$, $m = 1$, $\mathbf{r}_{0} = 0$, $\mathbf{r}_{1} = (0.5,0,0)$,
$\mathbf{v}_{1} = (1,0,0)$). Closed-form derivation in
[`tools/testkit/golden/derivations/dfsph-density-evolution.md`](../../../../tools/testkit/golden/derivations/dfsph-density-evolution.md).

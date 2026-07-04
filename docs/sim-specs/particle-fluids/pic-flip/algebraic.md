# pic-flip — Algebraic derivation

> Per spec-ref § 4. FACT-tagged. Companion golden derivations:
> `tools/testkit/golden/derivations/apic-transfers.md` (weight moments,
> angular momentum, affine round trip — all re-proven in exact rational
> arithmetic by the generators) and
> `tools/testkit/golden/derivations/pic-flip-transfer-error.md` (the 1/9
> coefficient).

## 1. APIC transfers (collocated grid, quadratic B-spline)

**FACT — citation.** Jiang, C., Schroeder, C., Selle, A., Teran, J. &
Stomakhin, A. (2015), "The Affine Particle-In-Cell Method", *ACM
Transactions on Graphics* 34 (4), Article 51.
DOI [10.1145/2766996](https://doi.org/10.1145/2766996); tech report
Propositions 5.1 / 5.4 / 5.5.

Particle state $(m_p, \mathbf{x}_p, \mathbf{v}_p, \mathbf{C}_p)$ with
$\mathbf{C}_p = \mathbf{B}_p D_p^{-1}$. One transfer pair:

$$m_i = \sum_p w_{ip}\, m_p, \qquad
m_i \mathbf{v}_i = \sum_p w_{ip}\, m_p\big(\mathbf{v}_p + \mathbf{C}_p(\mathbf{x}_i - \mathbf{x}_p)\big)
\quad\text{(P2G, lumped mass)}$$

$$\mathbf{v}_p' = \sum_i w_{ip}\,\mathbf{v}_i, \qquad
\mathbf{B}_p' = \sum_i w_{ip}\,\mathbf{v}_i (\mathbf{x}_i - \mathbf{x}_p)^{\mathsf T}
\quad\text{(G2P)}.$$

Weights: tensor-product quadratic B-spline with the MLS-MPM base-node
convention `base = floor(x/dx + 0.5) - 1` — identical closed form to
`packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py`
(FP-equivalence asserted against
`tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`).
PIC carries no $\mathbf{B}_p$; FLIP updates
$\mathbf{v}_p \mathrel{+}= \sum_i w_{ip}(\mathbf{v}_i^{new} - \mathbf{v}_i^{old})$.

## 2. The inertia tensor $D_p$

**FACT — citation.** Jiang, C. et al. (2016), "The Material Point
Method for Simulating Continuum Materials", *SIGGRAPH 2016 Courses*,
§ 10.1 eq. (174). DOI
[10.1145/2897826.2927348](https://doi.org/10.1145/2897826.2927348).

The three 1D weight moments are polynomial identities in the
fractional offset (degree ≤ 4; proven at 6 rational probes by
`tools/testkit/golden/generator/apic_transfer_weights.py`):

$$\textstyle\sum_k w_k = 1, \qquad \sum_k w_k r_k = 0, \qquad \sum_k w_k r_k^2 = \tfrac14,$$

hence $D_p = \sum_i w_{ip}\,\mathbf r_i \mathbf r_i^{\mathsf T} =
\tfrac14\,\Delta x^2\,\mathbf I$ (off-diagonals carry a first-moment
factor and vanish), so $D_p^{-1} = 4/\Delta x^2$ is a constant.

## 3. Angular-momentum conservation (Props 5.4 / 5.5)

Total particle angular momentum
$\mathbf L = \sum_p m_p \mathbf x_p \times \mathbf v_p + \sum_p m_p\operatorname{axial}(\mathbf B_p)$
(2D: $\operatorname{axial}(\mathbf B) = B_{21}-B_{12}$). Using § 2's
moments, P2G and G2P each preserve $\mathbf L$ **exactly** (an
identity in exact arithmetic; full derivation in the golden derivation
doc § 3, re-proven as `fractions.Fraction` identities at generator
verify time). PIC's velocity-only G2P discards the spin sum — the
golden table pins the changed value as a paired negative control.

**FACT — integrator caveat.** Jiang, C., Schroeder, C. & Teran, J.
(2017), "An angular momentum conserving affine-particle-in-cell
method", *J. Comput. Phys.* 338, 137–164. DOI
[10.1016/j.jcp.2017.02.050](https://doi.org/10.1016/j.jcp.2017.02.050):
end-to-end conservation additionally requires symplectic Euler
(λ = 0) or midpoint; forward/backward Euler and trapezoid do not
conserve. The reference advances positions with RK2 through the grid
field (Zhu/Bridson), so the full-cycle rotating-disk diagnostic shows
a small drift (measured ~10⁻⁴ of the PIC decay over 50 steps at the
test scene) rather than exact conservation — stated, not hidden.

## 4. Masked free-surface projection — operator pair (load-bearing)

Cell labels {solid, fluid, air} from marker occupancy. Solve
$\nabla^2 p = (\rho/\Delta t)\,\nabla\!\cdot\mathbf u^*$ on fluid
nodes, Dirichlet $p = 0$ on air, zero-weight solid faces.

**Deviation from the smoke operator shapes — measured and forced by
the § 6.3 hydrostatic anchor.** The pic-flip masked solver uses the
**adjoint compact pair**: backward-difference divergence
$\;\mathrm{div}_j = (u_j - u_{j-1})/\Delta x\;$ and forward-difference
gradient $\;g_j = (p_{j+1} - p_j)/\Delta x$, which compose to exactly
the compact 5-point (2D) / 7-point (3D) Laplacian the Jacobi sweep
iterates. Equivalent to reading the collocated component $u_j$ as the
MAC face $(j, j+1)$; the pair is adjoint ($G = -D^{\mathsf T}$) and
has **no checkerboard null mode**.

**Why not the smoke central/central pair.** On a periodic domain the
central pair costs only the documented $O(\Delta x^2)$ wide-operator
interior floor. At a free surface it fails at $O(1)$. 1D column, solid
node $0$, fluid $1..J$, air above, uniform post-gravity velocity
$V = -g\Delta t$: central divergence smears the wall BC,
$\mathrm{div}_1 = (V - 0)/(2\Delta x)$, and the converged compact-
Jacobi solution of that RHS is the **half-slope** profile
$p_j = \tfrac{\rho g \Delta x}{2}(J + 1 - j)$. The central gradient
update then leaves

$$v_j' = V - \tfrac{\Delta t}{\rho}\cdot\big(-\tfrac{\rho g}{2}\big) = -\tfrac{g\Delta t}{2}
\quad (1 < j < J),$$

i.e. the settled column **retains half of gravity every step and
sinks** — an $O(1)$ secular failure the still-pool and hydrostatic
anchors reject. With the adjoint compact pair the discrete solution is
$p_j = \rho g \Delta x\,(J + 1 - j)$ (exact hydrostatic slope; measured
$dP/dy = -9.810$ at convergence) and post-projection fluid velocities
are exactly zero. Witnessed by
`packages/pic-flip/tests/test_mms_poisson_masked.py`.

**FACT — citation (solver depth).** Crane, K., Llamas, I. & Tariq, S.
(2007), "Real-Time Simulation and Rendering of 3D Fluids", *GPU Gems
3*, ch. 30: with too few Jacobi iterations "water slowly sinks through
the bottom of the tank". Measured on the canonical-depth column
(24-grid, 15 fluid nodes deep, 2026-07-04): 20 sweeps retain 100 % of
$g\Delta t$; 2000 retain 0.55 %; 4000 < 0.01 %. The canonical cap is
pinned at 3000 (spec-ref § 6.3 measured-then-pinned protocol).

## 5. Regularizers (declared, non-physical)

**FACT — citation.** Muller, M., Ten Minute Physics #18, "How to write
a FLIP water simulator"
(<https://matthias-research.github.io/pages/tenMinutePhysics/18-flip.pdf>) —
push-apart + particle-density drift compensation ("necessary").

- **Push-apart:** symmetric positional projection on pairs closer than
  $2 r_p$, $s = \tfrac12(2r_p - d)/d$, displacement $\pm s\,(\mathbf
  x_j - \mathbf x_i)$, 2 sweeps via a cell hash. At the reference
  seeding (2 particles per cell axis, spacing $\Delta x/2$) the radius
  factor 0.25 makes the rest lattice exactly inert (pair distance ==
  minDist under a strict-< comparison).
- **Drift compensation:** one-sided RHS source where the scattered
  particle density exceeds the frame-0 rest density, realising
  $\nabla\!\cdot\mathbf u' = k\,\max(\rho/\rho_0 - 1, 0)/\Delta t$.
  Two measured normalization decisions (deviations from a naive
  reading of Muller's $k=1$, both forced by the still-pool null test):
  1. $\rho_0$ is the frame-0 **max** over fluid nodes (not the mean):
     surface nodes always read low, so a mean threshold fires *at
     rest* — violating invariant 6.
  2. default $k = 0.05$ (excess relaxed over ~20 steps): full-per-step
     relaxation against a *converged* masked solve produces corrective
     velocities $\sim \mathrm{excess}\cdot\Delta x/\Delta t$ that feed
     back through the free surface (measured: still pool explodes to
     ~8 m/s at $k=1$, linearly proportional to $k$). Muller's demo
     tolerates $k=1$ because his 20–40-iteration unconverged solve
     low-passes the source.

Both OFF for every golden/invariant, ON-declared in canonical
provenance (`rho_rest_measured_frame0`, `drift_k`,
`push_apart_radius_factor` recorded in the capture manifest).

## 6. Classic-PIC transfer error (the 1/9 coefficient)

**FACT — citation.** Zhu, Y. (2005), *Animating Sand as a Fluid*, MSc
thesis, UBC, eq. (3.8); Zhu, Y. & Bridson, R. (2005), *ACM TOG* 24 (3).
DOI [10.1145/1073204.1073298](https://doi.org/10.1145/1073204.1073298).

For tent-weight sampling + tent-weight gather with particles uniform
over the half-cell, a smooth field returns as
$\tilde f(x_0) = f(x_0) + \tfrac19 f''(x_0)\Delta x^2 + O(\Delta x^3)$
— derived exactly (smoothing $\tfrac{5}{144}f''$ + interpolation
$\tfrac{11}{144}f''$) in the golden derivation doc; scoped to exactly
that kernel pair. The package's own (B-spline) transfer chain has its
measured order witnessed by
`packages/pic-flip/tests/test_advection_ooa.py` (slopes 0.93 / 1.07 on
the N = 32/64/128 ladder, 2026-07-04).

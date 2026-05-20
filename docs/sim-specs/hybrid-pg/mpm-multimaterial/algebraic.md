# mpm-multimaterial — Algebraic derivation

> Per charter § 7.10. FACT-tagged.

## 1. MLS-MPM algorithm (Hu 2018)

**FACT — citation.** Hu, Y. et al. (2018), "A Moving Least Squares
Material Point Method with Displacement Discontinuity and Two-Way
Rigid Body Coupling", *ACM TOG* 37 (4), Article 150.
DOI [10.1145/3197517.3201293](https://doi.org/10.1145/3197517.3201293).
Companion 88-line reference:
<https://github.com/yuanming-hu/taichi_mpm/blob/master/mls-mpm88.cpp>.

MPM step (Hu 2018 § 3):

1. **P2G** (Particle to Grid): for each particle $p$ with
   position $\mathbf{x}_{p}$, velocity $\mathbf{v}_{p}$, mass $m_{p}$,
   affine velocity matrix $\mathbf{C}_{p}$, and deformation gradient
   $\mathbf{F}_{p}$:
   $$\mathbf{m}_{i} \mathrel{+}= N_{i}(\mathbf{x}_{p})\,m_{p},$$
   $$\mathbf{m}_{i}\mathbf{v}_{i} \mathrel{+}= N_{i}(\mathbf{x}_{p})\,m_{p}\bigl(\mathbf{v}_{p} + \mathbf{C}_{p}(\mathbf{x}_{i} - \mathbf{x}_{p})\bigr),$$
   where $N_{i}(\mathbf{x}_{p})$ is the quadratic B-spline weight at
   grid node $i$.

2. **Grid update**: apply forces and integrate the grid.

3. **G2P** (Grid to Particle): scatter back to particles via the same
   weights with affine-velocity reconstruction.

4. **Deformation gradient update**: $\mathbf{F}_{p}^{n+1} =
   (\mathbf{I} + \Delta t\,\mathbf{C}_{p})\,\mathbf{F}_{p}^{n}$.

## 2. Quadratic B-spline shape function

See [`tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md`](../../../../tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md).

In 1D:

$$N(x) = \begin{cases}
3/4 - x^{2} & |x| < 1/2,\\
\tfrac{1}{2}(3/2 - |x|)^{2} & 1/2 \le |x| < 3/2,\\
0 & |x| \ge 3/2.
\end{cases}$$

In 3D, $N(\mathbf{x}) = N(x)\,N(y)\,N(z)$.

## 3. Multi-material constitutive models

Hu 2018 § 5 + the 88-line reference's `J`, `F` per-material handling:

- **Viscoelastic** (neo-Hookean): $\boldsymbol{\sigma} = \mu(\mathbf{F}\mathbf{F}^{T} - \mathbf{I}) + \lambda\,\log(J)\,\mathbf{I}$.
- **Plastic** (von-Mises): yield-surface projection on the deviatoric stress.
- **Granular** (Drucker-Prager): friction-angle-based yield projection.

The Phase 2+ implementation phase populates the constitutive-model
table; Phase 1 declares the surface only.

## 4. Spec § 4.4 Taichi limitations

Per spec § 4.4, Stack D Taichi has three known limitations to
document in the per-sim implementation phase:

1. **F-key GGUI workaround** — handled in `common-py.ggui` (Stage 1
   surface, see Stage 1 final checkpoint § 5).
2. **Atomic-add precision** — Taichi's atomic_add on f32 grids has
   non-deterministic ordering; canonical reference uses f64 grids.
3. **Hot-reload via watchfiles** — `common-py.hotreload` (Stage 1
   surface).

These are referenced by `spec-ref.md` § 11 and the per-sim
implementation phase plans against them.

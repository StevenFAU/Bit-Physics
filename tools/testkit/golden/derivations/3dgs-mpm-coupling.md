# 3dgs-mpm coupling — golden-value derivation

Hand-derived independent reference for the numerical coupling-correctness golden
(`tools/testkit/golden/tables/3dgs-mpm-coupling.json`), Phase-3 task-8. The coupling
transforms a 3D Gaussian's covariance under a material deformation gradient `F`:

> **PhysGaussian Eq. (8)** (Xie et al. 2024, arXiv:2311.12198 — CITE-ONLY; eq number
> re-verified verbatim against arXiv:2311.12198v3 §3.4 at Stage 0, Convention #8):
> `a_p(t) = F_p(t) · A_p · F_p(t)ᵀ`, i.e. `Σ' = F · A · Fᵀ`, with center `x_p(t)=φ(X_p,t)`.

common-3dgs stores per-Gaussian `(scale s, quaternion q)`, not a raw covariance, so the
coupling round-trips `A = R(q)·diag(s²)·R(q)ᵀ → Σ' = F·A·Fᵀ → (s', q') = eig(Σ')`. The
golden asserts on **rotation-convention-independent** quantities: the deformed covariance
`Σ'` (reconstructed from the output `(s', q')`) and the **sorted** principal scales
`sort(s')` (= `sort(√eig(Σ'))`).

`R(q)` for `q = (w,x,y,z)` is the standard quaternion→rotation matrix; for `q = (cos(θ/2),
0, 0, sin(θ/2))` it is `R_z(θ)`.

## Anchor 1 — covariance transform Σ' = F·A·Fᵀ (rotated Gaussian, diagonal F)

- Input: `s = (1, 2, 3)`, `q = (√2/2, 0, 0, √2/2)` (= `R_z(90°)`), `F = diag(2, 0.5, 1.5)`.
- `A = R_z(90°)·diag(1, 4, 9)·R_z(90°)ᵀ = diag(4, 1, 9)` (the 90°-z rotation swaps the
  x- and y-eigenvalues).
- `Σ' = F·A·Fᵀ = diag(2²·4, 0.5²·1, 1.5²·9) = diag(16, 0.25, 20.25)`.
- `sort(s') = sort(√(16, 0.25, 20.25)) = sort(4, 0.5, 4.5) = (0.5, 4, 4.5)`.
- **Independent reference:** PhysGaussian Eq. (8) `Σ'=F A Fᵀ` + closed-form diagonal algebra.

## Anchor 2 — polar decomposition F = R·S (isotropic Gaussian)

- Input: `s = (1, 1, 1)` (isotropic, `A = I`), `q = (1, 0, 0, 0)` (identity),
  `F = R·S` with `R = R_z(90°)` and `S = diag(2, 3, 4)` (SPD stretch).
  Then `F = R·S = [[0,−3,0],[2,0,0],[0,0,4]]`.
- `Σ' = F·A·Fᵀ = F·Fᵀ = R·S²·Rᵀ = R_z(90°)·diag(4,9,16)·R_z(90°)ᵀ = diag(9, 4, 16)`.
- `sort(s') = sort(√(9, 4, 16)) = (2, 3, 4)` — exactly the singular values of `S` (the
  stretch magnitudes), independent of `R`.
- **§2.4 caveat (load-bearing):** this anchor is independent of PhysGaussian's
  *implementation* but cites the same *theory* — PhysGaussian Eq. (9) uses the same polar
  decomposition `F = R·S`. It is NOT a fully-independent reference. (Anchor 3 is.)

## Anchor 3 — trivial case F = I (fully independent)

- Input: `s = (1, 2, 3)`, `q = (1, 0, 0, 0)`, `F = I`.
- `Σ' = I·A·Iᵀ = A = diag(1, 4, 9)`; `(s', q')` represent the same ellipsoid: `s' = s`,
  orientation unchanged. `sort(s') = (1, 2, 3)`.
- **Independent reference:** the identity deformation leaves a Gaussian unchanged — pure
  algebra, no PhysGaussian dependence.

# curl-noise-crossprod — derivation (golden C)

Table: `tools/testkit/golden/tables/closed-form/curl-noise-crossprod.json`
Generator: `tools/testkit/golden/generator/curl_noise_crossprod.py`
Spec: `docs/sim-specs/closed-form/curl-noise/spec-ref.md` § 6.1–6.2.

## 1 · div(∇f₁ × ∇f₂) ≡ 0 (vector identity)

```
∇·(A × B) = B·(∇×A) − A·(∇×B);  with A = ∇f₁, B = ∇f₂ both curls of
gradients vanish (∇×∇ ≡ 0, Schwarz):  ∇·(∇f₁ × ∇f₂) = 0.
```

Component form (what the implementation computes): with the exact Jacobian
`J[i,l] = ε_ijk (H₁[j,l] g₂[k] + g₁[j] H₂[k,l])`, the trace contracts the
antisymmetric ε against the symmetric Hessians — every term cancels pairwise
(H₁[j,i]ε_ijk is a symmetric-antisymmetric contraction). Machine-zero up to
rounding of the surviving-magnitude terms: committed 5.7e-14 absolute at
velocity scale ~20. SymPy re-derives the identity for generic smooth f₁, f₂
(committed string `zero`). Priority: DeWolf 2005; Bærentzen et al. 2025
prove it in any dimension.

## 2 · Iso-value residual: O(Δt⁴) under RK4, machine-zero reprojected

Streamlines satisfy `df_i(x(t))/dt = ∇f_i · v = 0` exactly (golden F), so
the continuous flow keeps `f(x(t)) = f(x₀)`. A p-th-order integrator commits
a local value drift O(Δt^{p+1}), global O(Δt^p): halving Δt at fixed
physical time drops the residual ~2^p. Committed: 8.04e-5 → 6.24e-6 (12.9×,
consistent with RK4's 16× up to field-curvature variation along the changed
path).

Newton reprojection (Bærentzen 2025 Eq. 12), min-norm step for the 2×3
system `J = [∇f₁; ∇f₂]`:

```
x ← x − Jᵀ (J Jᵀ)⁻¹ r,   r = f(x) − f(x₀)
```

`(J Jᵀ)` is the 2×2 Gram matrix `[[g₁·g₁, g₁·g₂], [g₁·g₂, g₂·g₂]]`, solved
in closed form. One iteration leaves the second-order residual
`~½‖H‖‖δx‖²`; iterated to convergence the residual reaches the f64 floor —
committed reprojected canonical-scene residual 2.9e-13 and a 3-iteration
kicked-point median 8.0e-15.

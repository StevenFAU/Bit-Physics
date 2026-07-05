# curl-noise-gradient-mms — derivation (golden B)

Table: `tools/testkit/golden/tables/closed-form/curl-noise-gradient-mms.json`
Generator: `tools/testkit/golden/generator/curl_noise_gradient_mms.py`
Spec: `docs/sim-specs/closed-form/curl-noise/spec-ref.md` § 6.1.

## 1 · Closed-form kernel gradient and Hessian

Per-corner simplex kernel (webgl-noise lineage, McEwan et al. 2012;
constants pinned per spec § 2.5): `k(x) = m⁴ (p·x)` with
`m = max(0.5 − |x|², 0)` and constant corner gradient `p`. On the interior
branch (`m > 0`):

```
∇k = ∇(m⁴)(p·x) + m⁴ p = 4m³(−2x)(p·x) + m⁴ p = −8 m³ (p·x) x + m⁴ p
∇²k = 48 m² (p·x) xxᵀ − 8 m³ (xpᵀ + pxᵀ) − 8 m³ (p·x) I
```

(product rule on each term of ∇k; `∇(m³) = −6m²x`). Both identities are
re-derived symbolically by SymPy in the generator
(`kernel_gradient_sympy_identity` / `kernel_hessian_sympy_identity` — the
committed value is the string `zero`, meaning the symbolic difference between
`∇k` (SymPy) and the implementation formula simplifies to the zero matrix).
At `m = 0` every term through the third derivative vanishes (k = 4 falloff),
so corner-set changes across simplex boundaries do not break C³ — the reason
the 0.5 falloff constant is load-bearing (0.6 leaves `m > 0` at the
boundary ⇒ value AND gradient discontinuities).

## 2 · Central-difference truncation O(h²)

`(f(x+h) − f(x−h))/2h = f'(x) + h²/6 f'''(x) + O(h⁴)` — the classical
odd-term cancellation. Since the analytic gradient is exact, the measured
FD-vs-analytic error must scale as h²: committed errors 4.21e-5 → 4.21e-7
over h = 1e-3 → 1e-4, order 2.0000. The same for the Hessian as the FD of
the analytic gradient. This is the code-verification gate for the
derivatives the velocity is built from (an error in ANY of the branchless
corner-selection / hash / falloff paths would break the clean h² collapse).

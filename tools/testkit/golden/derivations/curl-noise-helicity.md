# curl-noise-helicity — derivation (golden F, execution-corrected)

Table: `tools/testkit/golden/tables/closed-form/curl-noise-helicity.json`
Generator: `tools/testkit/golden/generator/curl_noise_helicity.py`
Spec: `docs/sim-specs/closed-form/curl-noise/spec-ref.md` § 3 (v0.3 status
block records the correction).

## 1 · Gradient orthogonality (the chaos-immunity mechanism)

```
v·∇f₁ = (∇f₁ × ∇f₂)·∇f₁ = 0     (triple product, repeated vector)
v·∇f₂ = (∇f₁ × ∇f₂)·∇f₂ = 0
```

Hence `df_i(x(t))/dt = ∇f_i·v = 0` along streamlines: **f₁ and f₂ are exact
invariants**, streamlines are confined to the codim-2 intersection
`{f₁=c₁}∩{f₂=c₂}`, and a 1D flow on a 1D curve cannot be chaotic. This — not
any helicity statement — is why the iso-value residual is a chaos-immune
gate. Committed normalized maxima ~3.5e-16 (f64 rounding of the cross/dot
contraction). SymPy re-derives both zeros for generic smooth f₁, f₂.

## 2 · Clebsch/Euler-potential helicity integrand

`v = ∇f₁ × ∇f₂ = ∇×(f₁∇f₂)` (since `∇×(f₁∇f₂) = ∇f₁×∇f₂ + f₁∇×∇f₂` and the
second term is zero). For the potential `ψ = f₁∇f₂` in this gauge:

```
ψ·v = f₁ ∇f₂ · (∇f₁ × ∇f₂) = 0     (repeated vector again)
```

— the classical fact that the helicity **integrand** vanishes for a field in
Euler-potential (Clebsch) form. Committed normalized max 2.2e-17.

## 3 · The refuted claim, kept as a permanent control row

Spec v0.2 claimed `v·(∇×v) ≡ 0` for cross-product fields. **False.**
Counterexample (committed as the SymPy string `-4*x*y`):

```
f₁ = xy, f₂ = z + x² ⇒ ∇f₁ = (y, x, 0), ∇f₂ = (2x, 0, 1)
v = ∇f₁×∇f₂ = (x, −y, −2x²);  ∇×v = (0, 4x, 0);  v·(∇×v) = −4xy ≠ 0
```

On the canonical noise field the kinetic helicity measures |v·(∇×v)| up to
~1e4 (committed) — the table asserts this **nonzero** so the false claim
cannot silently return. What zero-helicity DOES characterize is the
existence of the orthogonal-plane foliation (Frobenius for the 1-form
`v♭`), which cross-product fields do not generally possess; confinement of
streamlines (§ 1) is the property they do.

## 4 · ABC Beltrami pole

`∇×v = v` term-by-term (see `curl-noise-analytic-fields.md` § 1), so the
helicity density is `|v|²` **exactly** — committed Beltrami residual and
`h − |v|²` both bit-zero. The two committed poles make the § 3 dichotomy a
measured artifact rather than prose.

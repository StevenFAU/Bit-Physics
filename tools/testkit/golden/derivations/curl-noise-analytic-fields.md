# curl-noise-analytic-fields — derivation (golden E)

Table: `tools/testkit/golden/tables/closed-form/curl-noise-analytic-fields.json`
Generator: `tools/testkit/golden/generator/curl_noise_analytic_fields.py`
Spec: `docs/sim-specs/closed-form/curl-noise/spec-ref.md` § 4.

## 1 · ABC flow: div ≡ 0 term-by-term; FD probe bit-zero

```
v = (A sin z + C cos y,  B sin x + A cos z,  C sin y + B cos x)
```

`∂v_x/∂x = 0` because `v_x` contains no `x`; likewise `∂v_y/∂y` and
`∂v_z/∂z` — the divergence vanishes **term-by-term** (Dombre et al. 1986;
SymPy recheck committed as `zero`). Consequence stronger than O(g²): the
central-difference probe is **bit-zero at any stencil**, because
`v_k(x + g e_k)` and `v_k(x − g e_k)` have identical arguments in the
variables `v_k` actually depends on (committed 0.0). Beltrami:
`∇×v = v` component-by-component (e.g.
`(∇×v)_x = ∂_y v_z − ∂_z v_y = C cos y + A sin z = v_x`), so the committed
Beltrami residual is exactly 0.0. Velocity samples at three fixed points are
committed as the closed-form ground-truth anchor.

## 2 · Taylor–Green stream function

`ψ = sin x sin y ⇒ v = (∂ψ/∂y, −∂ψ/∂x) = (sin x cos y, −cos x sin y)`;
`div = ψ_yx − ψ_xy = 0` (Schwarz). The FD probe at g = 1e-3 leaves only the
O(g²) truncation of the trig field (committed 1.3e-13).

## 3 · FBM linearity on the matched grid

The discrete curl is linear in ψ, so the matched-grid divergence of an
octave-summed potential telescopes to machine zero for exactly the same
per-node ±1 cancellation as a single octave (golden A § 1) — committed
normalized 1.7e-16 for the 3-octave FBM sampled at 48² nodes. The octave sum
changes the spectrum, never the divergence (spec § 4 "FBM linearity").

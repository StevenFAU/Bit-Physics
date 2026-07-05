# curl-noise-boundary — derivation (golden D)

Table: `tools/testkit/golden/tables/closed-form/curl-noise-boundary.json`
Generator: `tools/testkit/golden/generator/curl_noise_boundary.py`
Spec: `docs/sim-specs/closed-form/curl-noise/spec-ref.md` § 3.

## 1 · Analytic-SDF tangency is machine-exact (triple product / rotation)

**Canonical 3D scene (SDF-substitution blend):**
`f₁ = d + A·ramp(d/d₀)·n₁` with the Bridson quintic
`ramp(r) = 15/8 r − 10/8 r³ + 3/8 r⁵` (ramp(0) = 0, ramp′(0) = 15/8). At the
surface (`d = 0`):

```
∇f₁ = ∇d + A[ ramp′(0)/d₀ · n₁ · ∇d + ramp(0) · ∇n₁ ]
    = (1 + A·n₁·15/(8d₀)) ∇d          (the ramp(0)=0 term kills ∇n₁)
```

Both surviving terms ride `∇d = n̂`, so `∇f₁ ∥ n̂` exactly and
`v·n̂ = (∇f₁ × ∇f₂)·n̂ = β (n̂ × ∇f₂)·n̂ = 0` — a triple product with a
repeated direction. **Zero to FP rounding, not O(h)** (committed normalized
8.1e-16). The quintic's `ramp′(1) = ramp″(1) = 0` keeps `f₁` C² across the
ramp's outer edge, so the construction stays gate-compatible (div needs C²).

**2D multiplicative ramp (Bridson Eq. 3):** `ψ′ = ramp(d/d₀)·ψ`. At the
surface `∇ψ′ = ramp′(0)/d₀·ψ·∇d ∥ n̂`; the velocity is the 90° rotation of
`∇ψ′`, and rotating a normal-parallel vector gives a tangent one:
`v·n̂ = (c·n_y, −c·n_x)·(n_x, n_y) = 0` identically (committed 2.1e-15).

## 2 · Discretized SDF ⇒ O(h) tangency error

Replacing the analytic `d, ∇d` with a bilinear grid interpolant and one-sided
FD gradient perturbs the normal by O(h) near the surface (interpolation error
of the gradient of a C² function is first-order at cell boundaries), so
`v·n̂ = v·(n̂_exact + O(h)) = O(h)·|v|`. Committed: 9.3e-2 → 8.8e-3 over
h = 2e-2 → 2e-3, order 1.02. This is the honest label for any engine that
stores its SDF on a grid — the gate never conflates it with the analytic row.

The medial-axis degradation (C⁰ `min{}` distance of a two-obstacle scene —
Ding & Batty 2023's problem statement) is exercised as a NOT-a-gate
documented-limit test in `packages/curl-noise/tests/test_boundary.py`
(velocity jump across the equidistant plane ≫ smooth-field increments).

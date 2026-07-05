# curl-noise-divergence — derivation (golden A)

Table: `tools/testkit/golden/tables/closed-form/curl-noise-divergence.json`
Generator: `tools/testkit/golden/generator/curl_noise_divergence.py`
Spec: `docs/sim-specs/closed-form/curl-noise/spec-ref.md` § 6.2.

## 1 · Matched staggered DIV·CURL ≡ 0 (telescoping hand proof)

2D MAC layout: nodal potential `ψ[i,j]`, face velocities
`u[i,j] = (ψ[i,j+1] − ψ[i,j])/dx` (x-faces), `w[i,j] = −(ψ[i+1,j] − ψ[i,j])/dx`
(y-faces). Cell divergence:

```
div[i,j]·dx² = (ψ[i+1,j+1] − ψ[i+1,j]) − (ψ[i,j+1] − ψ[i,j])
             − (ψ[i+1,j+1] − ψ[i,j+1]) + (ψ[i+1,j] − ψ[i,j])
```

Each of the four corner values enters exactly once with `+1` and once with
`−1` — the sum is **identically zero in exact arithmetic**, independent of ψ.
In f64 the residual is pure rounding of the intermediate differences
(measured normalized max ~2e-16). The same telescoping holds in 3D with the
edge vector potential (each edge value enters the cell balance through two
faces with opposite signs). This is the natural-DIV ∘ natural-CURL null-space
identity of Hyman & Shashkov (1999), Eqs. 1.7–1.10 (natural-with-natural
pairing — a natural/adjoint mix does NOT telescope), and the discrete
exterior calculus `d² = 0`.

## 2 · Independent-stencil probe is O(g²) (Taylor)

For `v ∈ C³` (guaranteed by the `(0.5 − r²)⁴` falloff: noise C³ ⇒ velocity
C²… the probe needs the third derivative bounded, which holds piecewise with
the k = 4 falloff class):

```
(v_k(x + g e_k) − v_k(x − g e_k)) / 2g = ∂v_k/∂x_k + g²/6 · ∂³v_k/∂x_k³ + O(g⁴)
```

Summing over k, the true divergence is 0, so the probe residual **is** the
`g²/6 Σ ∂³v_k/∂x_k³` truncation term: second-order convergent, never
machine-zero. Committed slope 1.95 over g = 1e-2 → 1e-3 (the coarse stencil
is not fully asymptotic against the finest octave wavelength 0.125).

## 3 · Route C — same-stencil nested FD cancels to the f64 floor

With the SAME displacement h for the curl and divergence stencils (2D rot):

```
div·4h² = (A−B) − (C−D) − (A−C) + (B−D),   A = ψ(x+he_x+he_y), B = ψ(x+he_x−he_y),
                                            C = ψ(x−he_x+he_y), D = ψ(x−he_x−he_y)
```

Symbolically zero. In IEEE-754 each pairwise difference of nearby ψ values is
Sterbenz-exact (same binade), so the four differences are exact and the final
sum cancels to the rounding of the two additions — measured exactly 0.0 at
h = 1e-4. The committed row pins this route's honest label: machine-zero only
because the stencils SHARE evaluations, not a property of arbitrary FD curls.

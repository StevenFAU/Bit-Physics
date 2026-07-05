# Derivation — ISF spherical-Clebsch Taylor-Green velocity readout (golden C)

> **Canonical reference:** Chern et al. (2016), ACM TOG 35(4), DOI
> 10.1145/2897824.2925868, Eq. 1/Eq. 4; Chern (2017) thesis App. 1.C; Li et
> al. (2025), *Clebsch Gauge Fluid on Particle Flow Maps*, ACM TOG 44(4),
> DOI 10.1145/3731194 (shared-primitive anchor, Eqs. 12–14).

Algorithm: `isf-spherical-clebsch-taylor-green-velocity`. Category:
`volumetric-grid`.

## 1. Fixture (reused from the landed variant)

The z-invariant 2D Taylor-Green spherical-Clebsch lift, a faithful f64 port
of the validated C++ fixture
`packages/eulerian-smoke-frontier-clebsch-pfm/src/clebsch_pfm_math.cpp`
(`taylor_green_wave_2d`):

```
cos(α) = -cos(2πx),  θ = 4·(-cos(2πy)/(2π))/ħ
Ψ = (cos(α/2)·e^{iθ/2},  sin(α/2)·e^{-iθ/2})
```

Unit-norm is exact-to-FP by construction (`cos² + sin² = 1`); the table's
fixture block records the generation-time max deviation (0.0) with a 1e-15
ceiling.

## 2. Velocity readout under test

Discrete edge circulation `η_e = ħ·arg⟨Ψ_a, Ψ_b⟩_ℂ` with
`⟨a,b⟩_ℂ = ā₁b₁ + ā₂b₂` — the exact circulation of the geodesically
interpolated velocity 1-form (thesis App. 1.C) — and face velocity
`u_e = η_e/dx`. The **sign pin** (spec § 3): `u = +ħ·Im(ψ̄·∇ψ)`; the forms
`Re(ψ̄·i∇ψ)` and `Im(ψ̄·∇ψ)` are negatives of each other, and a plane-wave
unit test asserts the paper-matching sign.

## 3. What the table pins

Spinor components and all three face velocities at four pinned grid indices
(N = 32, ħ = 0.1). These are closed-form trig evaluations plus one `atan2`,
so `--verify` recomputation is deterministic to ≤ 1e-13 across libm builds.
Serves as the WGSL port's independent readout cross-check (golden self-test
in the web PROVE layer).

## 4. Independent-reference anchors

1. **Landed C++ fixture** — validated at the clebsch-pfm A1 surface
   (`docs/sim-specs/volumetric-grid/eulerian-smoke/spec-frontier-clebsch-pfm.md` § 2).
2. **Thesis App. 1.C** — edge-circulation exactness under geodesic CP¹
   interpolation.
3. **Clebsch-PFM shared primitives** (DOI 10.1145/3731194, Eq. 12
   `u = ħ⟨∇Ψ, iΨ⟩_ℝ`) — the same readout in an independently landed stack.

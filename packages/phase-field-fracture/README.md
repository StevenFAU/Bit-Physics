# phase-field-fracture — f64 reference

Phase-6 variational (phase-field) brittle fracture — the portfolio's first
sim in which **material breaks**: cracks nucleate, propagate, curve, and
branch as the emergent solution of an energy minimization, never as
authored geometry. NEW `fracture` category. Spec:
`docs/sim-specs/fracture/phase-field-fracture/spec-ref.md` (research draft
v0.2).

## Model (spec-ref.md § 1, § 3)

- **AT2** damage `d ∈ [0,1]` on cell centers, history field
  `H = max ψ₀⁺`, degradation `g(d) = (1−d)²`.
- **Hybrid formulation** (Ambati 2015): isotropic degraded stress in the
  momentum pass; the **Miehe strain-spectral split** enters only the crack
  driving force.
- **Explicit dynamics**: velocity-Verlet, lumped mass, Q1 elements with
  full 2×2 Gauss quadrature (no hourglass), mass-proportional damping,
  KE/IE-disciplined quasi-static loading (§ 3.6).
- **Damage updates** (§ 3.5): the fused semi-implicit **gradient-flow**
  step (browser baseline, knob `m = χ·dt`) and the **converged-elliptic**
  optimality solve (warm-started matrix-free CG — the reference and the
  G-Γv gate anchor).
- **Non-dimensionalization** (§ 9): `ℓ = 1`, `Gc/ℓ = 1`, `ρ = 1`; the
  Miehe SENT steel groups give `Ẽ = 1166.7`. Force unit per unit thickness
  = Gc (2.7 N/mm physical).
- The SENT notch is a **traction-free slit in the material field** (void
  cells), not a damage seed — measured 701.4 N at 96² vs the 701.2 N
  PhaseFieldX example-1711 reproduction (an H-seeded band notch sits ~10 %
  low from its smeared compliance).

## Canonical scene

`sent-void-96sq-m1` — the canonical capture IS the web-gate scene: SENT to
past the peak (~15.8 k CFL steps), full-state checkpoints every 2000 steps,
run-twice bit-identity witnessed inside `run_canonical`.

## Measured anchors (2026-07-09, f64 NumPy, this repo)

| Quantity | Measured | Declared gate |
|---|---|---|
| SENT peak (96²) | 0.7014 kN (0.02 % off the 0.7012 reproduction) | ±10 % (G-SENT) |
| KE/IE, U ∈ [0.1, U_peak] | 6.3e-3 | ≤ 0.05 (G-QS) |
| Pre-peak energy residual | 4.7e-3 | ≤ 0.03 (G-energy) |
| gf (m=1) vs elliptic peak | 1.4e-3 rel | ≤ 1 % (G-Γv) |
| gf vs elliptic crack IoU | 1.0 | ≥ 0.98 (G-Γv) |
| f32 proxy worst field err | 9.0e-5 rel | tolerance.toml `[defaults.phase-field-fracture]` |

The post-peak snap-back runs at KE/IE ≈ 0.11 — **legitimately dynamic**
(§ 3.6 honesty): G-SENT gates pre-peak shape + peak only. The post-burst
energy residual (~14 %) is the disclosed hybrid/history variational
inconsistency (§ 3.3) plus the measured Γ(v) dissipation `d_gf` — reported,
never hidden.

## Run

```bash
uv run --no-sync python -m phase_field_fracture --out captures/phase-field-fracture
uv run --no-sync pytest packages/phase-field-fracture/tests -q
```

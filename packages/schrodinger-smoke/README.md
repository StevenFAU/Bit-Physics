# schrodinger-smoke

Incompressible Schrödinger Flow (ISF) — Chern, Knöppel, Pinkall, Schröder,
Weißmann, *"Schrödinger's Smoke"*, ACM TOG 35(4) / SIGGRAPH 2016.

Canonical f64 NumPy reference for the `volumetric-grid` family root. The fluid
state is a normalized two-component spinor evolved by a split-step Fourier
integrator with an exact FFT pressure projection; the visible smoke is a
passive tracer cloud downstream of the gated state.

- Spec: `docs/sim-specs/volumetric-grid/schrodinger-smoke/spec-ref.md` (v0.2)
- Web demo spec: `packages/schrodinger-smoke/web/verification-demo-spec.md`
- Reference: `schrodinger_smoke/reference/isf.py`
- Run: `uv run --no-sync python -m schrodinger_smoke.reference.isf --n 64`
- Tests: `uv run --no-sync pytest packages/schrodinger-smoke/tests`

Honesty boundary (spec § 1): ISF is a Schrödinger-equation model of
incompressible flow with exactly quantized vortices — Euler plus a
Landau-Lifshitz term, converging to Euler only as ħ → 0. It is never marketed
as an exact Euler solver.

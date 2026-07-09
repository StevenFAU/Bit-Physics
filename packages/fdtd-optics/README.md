# fdtd-optics

Phase 6 — 2D TMz Yee FDTD optics f64 reference (TF/SF plane-wave scattering
gate scene + analytic golden generators).

Spec: `docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md`.

- `fdtd_optics/reference.py` — the NORMATIVE f64 gate solver (2D TMz Yee
  leapfrog with a 1-D-auxiliary-grid TF/SF box, § 3.5) plus the 1D Fresnel
  Yee helper (Mur-1 ABC, two-run subtraction).
- `fdtd_optics/goldens.py` — analytic golden generators (Mie sphere/cylinder,
  Fresnel, slab-waveguide n_eff, grating orders, numerical dispersion, § 4/§ 7).
- `fdtd_optics/sim.py` — run-twice determinism witness + web gate assets.

Run the tests: `uv run --no-sync pytest packages/fdtd-optics/tests -x -q`.
Regenerate the web gate assets:
`uv run --no-sync python -m fdtd_optics` (from the repo root).

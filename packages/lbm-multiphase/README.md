# lbm-multiphase — D2Q9 pseudopotential multiphase LBM (f64 reference)

Phase-6 lattice-family package (spec:
`docs/sim-specs/lattice/lbm-multiphase/spec-ref.md`). Single-component
liquid–vapor flow via the pseudopotential (Shan–Chen lineage) method, in the
**Krüger lattice-weight convention** (`spec-ref.md` § 3.3):

```
F(x) = -G psi(x) sum_i w_i psi(x + c_i) c_i,   p = rho cs^2 + (G cs^2/2) psi^2
```

Two formulation tiers, one kernel (`lbm_multiphase/reference.py`, NORMATIVE):

- **Tier A (metrology):** `psi = exp(-1/rho)` (committed f64 LUT) + Guo
  forcing + BGK — the only configuration whose coexistence provably reduces
  to the Maxwell equal-area rule, τ-independent. Canonical point G = −9
  (ratio ≈ 5): flat equilibrium is machine-static (max|u| ~ 1e-15), measured
  coexistence within 0.02 % of the f64 equal-area targets, τ-sweep
  {0.8, 1.0, 1.2} identical to 8 decimals.
- **Tier B (showcase):** Carnahan–Starling EOS via Yuan–Schaefer psi +
  Li–Luo–Li σ-tuned forcing (σ = 0.105 → ε = 1.68) + BGK. Canonical point
  T/T_c = 0.8 (ratio ≈ 14); gated against the ε-weighted
  mechanical-stability integral, never raw Maxwell (the measured T/T_c = 0.7
  vapor density rejects Maxwell by −3.1 % while matching the ε-integral to
  +0.4 % — the thermodynamic-inconsistency exhibit). The published weighted
  MRT variant (Li 2013) is a disclosed v1.x follow-up; v1 Tier B is the
  BGK σ-scheme exactly as in PRE 86, 016709.

Layout:

- `lbm_multiphase/thermo.py` — EOS/coexistence solvers (Maxwell equal-area,
  ε-weighted mechanical-stability integral, G_c bisection negative control).
- `lbm_multiphase/reference.py` — the NORMATIVE DDF-shifted pull-streaming
  D2Q9 kernel shared (operation-for-operation) with the WGSL implementation
  in `web/src/lbm_core.wgsl`; dtype-preserving (f64 gates, f32 proxy).
- `lbm_multiphase/goldens.py` — generators for the committed golden tables
  (`tools/testkit/golden/tables/lattice/lbm-multiphase-*.json`,
  `d2q9-equilibrium.json`) and the committed web gate assets
  (`web/public/lbm-*.bin`, `lbm-gate-manifest.json`).
- `lbm_multiphase/sim.py` — canonical gate scenes + `run_canonical`
  (run-twice witnessed) + reference-blob sha pins.
- `web/` — Stack-B WebGPU app (Vite + TypeScript f32).

Regenerate everything: `uv run --no-sync python -m lbm_multiphase all`.

Verification posture: deploy gate `_gate_lbm_multiphase` in
`tools/productization/web-deploy/verify.py` (live f64 reference re-run,
run-twice byte-identity, coexistence/Laplace/spurious/no-separation analytic
gates CI-held); tolerances in `tools/testkit/equivalence/tolerance.toml`
`[defaults.lbm-multiphase]` (measured-then-declared).

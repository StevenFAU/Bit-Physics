# eulerian-smoke — Stack-D Reference Spec

> **Stack-D (Taichi-DSL / CPU) port** of the Phase-1 `eulerian-smoke` reference.
> Sibling to [`spec-ref.md`](spec-ref.md) (the Phase-1 NumPy reference,
> `stack.name="numpy-reference"`). FIFTH per-sim cross-stack port under
> spec-Phase-2; authored at sub-phase-eulerian-smoke-stack-d Stage 1.

## 1. Scope

A content-equivalent Taichi-DSL CPU port of the Stam-Fedkiw stable-fluids
reference (Stam 1999 + Fedkiw 2001). Collocated cell-centered periodic grid;
plain trilinear semi-Lagrangian advection (3D), MacCormack-corrected SL (2D),
5/7-point explicit Laplacian diffusion, fixed-`n_jacobi=20` Jacobi
pressure-projection, Fedkiw vorticity confinement (skeleton; `eps=0`
PRESENT-but-NOT-EXERCISED at canonical). Reproduces BOTH Phase-1 canonical
descriptors (`taylor-green-128cube-seed42-step500` 3D +
`lid-driven-cavity-128sq-re100-seed42-step1000` 2D; D4) and diffs each
cross-stack against the NumPy-reference capture at `relative = 1e-4` (the `smoke`
tolerance category; gate 14). Gate-4 carries the MMS arm ONLY (no golden table —
the OPPOSITE of LBM's dual-arm and MPM's golden-only; matches RD-3D). No
MAC-staggered / face-centered velocities (deferred to Stack-C); no atomic scatter.

## 2. Upstream and reference anchors

- Stam, J. (1999), "Stable Fluids", SIGGRAPH '99, 121–128, DOI 10.1145/311535.311548.
- Fedkiw, R., Stam, J., Jensen, H. W. (2001), "Visual Simulation of Smoke",
  SIGGRAPH '01, 15–22, DOI 10.1145/383259.383260 (vorticity confinement).
- Taylor, G. I., Green, A. E. (1937), Proc. R. Soc. Lond. A 158, DOI 10.1098/rspa.1937.0036
  (3D Taylor-Green vortex IC).
- Stack-B (Phase-1) anchor: [`spec-ref.md`](spec-ref.md); the kernel math is
  re-derived from the upstream sources, the canonical constants
  (`CANONICAL_*`, `_DEFAULT_N_JACOBI=20`, `canonical_params_{2d,3d}`) re-derived
  VERBATIM (no Phase-1 import — Convention A/D isolation).
- Taichi-DSL substrate: `docs/common/taichi.md` (IC-12); `common_py.determinism`
  (IC-11). Shared MMS surface:
  `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`.

## 3. Algorithm

Per step (3D): (1) plain trilinear semi-Lagrangian advect `u,v,w`; (2) vorticity
confinement (`eps=0` dead path at canonical); (3) explicit 7-point Laplacian
diffusion; (4) fixed-20-sweep Jacobi pressure-projection (collocated
centered-difference div/grad); (5) scalar smoke-density advect by the projected
velocity. 2D: MacCormack-corrected SL velocity advect → 5-point diffuse →
Jacobi project → density via plain SL. ICs analytic (Taylor-Green vortex 3D;
thin lid-shear-layer 2D).

## 4. Algebraic form

- SL backtrace: `phi(x) <- interp(phi^n, x - u dt)`, periodic floored-mod wrap,
  lex (i,j[,k]) bilinear/trilinear vertices.
- MacCormack (2D): `phi_hat = SL(+dt)`, `phi_check = SL(phi_hat,-dt)`,
  `phi^{n+1} = phi_hat + (phi^n - phi_check)/2` (no limiter).
- Projection: `lap(p) = (rho/dt) div(u*)`, `n_jacobi=20` sweeps, then
  `u <- u* - (dt/rho) grad(p)`. 2nd-order centered div + grad.

## 5. Implementation

- **Path:** `packages/eulerian-smoke-stack-d/eulerian_smoke_stack_d/`.
- `reference/stable_fluids_taichi.py` — Taichi-DSL `@ti.kernel` primitives
  (`_k_sl_advect_{2d,3d}`, `_k_laplacian_{5,7}point`, `_k_divergence_{2d,3d}`,
  `_k_jacobi_sweep_{2d,3d}`, `_k_subtract_grad_{2d,3d}`, `_k_curl_3d`) + NumPy
  wrappers mirroring the Phase-1 reference signatures + canonical constants.
- `sim.py` — determinism docstring (§ 8); `sim_runner_seeded` (3D 128³×500),
  `sim_runner_seeded_2d` (2D 128²×1000), `sim_runner_diagnostic` (32³×10),
  `compute_canonical_trajectory_3d`.
- `invariants.py` — `divergence_free_post_projection`, `smoke_density_nonneg`
  (50 examples each).
- NumPy arrays flow in/out of the `ti.types.ndarray` f64 kernels.

## 6. Verification posture — MMS ONLY (no golden)

Gate-4 carries the MMS arm ONLY (spec-ref § 7 "No closed-form golden table").
NS-2D MMS over the SHARED, UNMODIFIED `IncompressibleNS2DSolution` (shared with
lattice-boltzmann-d3q19; shift #18); ladder `N in {32,64,128}`; the advection arm
drives the Taichi 2D `stable_fluids_step` (MacCormack + projection-bypass), the
projection arm drives `project_pressure`. Observed OOA within ±0.5 of formal p=2
(both arms; Phase-1 reference 1.99 / 2.00). Cat-3 NO-OP (no golden subdir; no
`_SUBDIRS_PICKED_UP` change — RD-3D precedent).

### 6.6 PBT-covered invariants
1. `divergence_free_post_projection` — post-projection L-inf divergence below the
   collocated-grid residual floor (`_DIV_TOL=1e-1`).
2. `smoke_density_nonneg` — density φ ≥ 0 under SL advection (max-principle).

(Exactly 2; 50 examples each.)

## 7. Golden values / Manufactured solutions

No golden table. MMS: observed OOA within ±0.5 of formal p=2 on both arms.

## 8. Determinism

**Claim: `bit-exact-same-stack-same-hw` at `arch="cpu"`** (over-achieves the
spec's `epsilon-same-stack-same-hw` Stack-C declaration; informational per
conventions doc § F.4). Mechanism: `set_taichi_deterministic(arch="cpu")` pins
`cpu_max_num_threads=1`; per-cell `ti.ndrange` stencils in fixed lex order; fixed
Jacobi sweep cap. **f64-seed (banked precedent #7, NON-vacuous):** the 3D Jacobi
`1.0/6.0` is seeded `ti.f64(1.0)/ti.f64(6.0)` (pure-literal would infer f32). No
`ti.atomic_*` / subgroup surfaces (`atomic_ops=False`); no RNG. Gate-10
`run_twice_and_diff` witnesses `content_equivalent=True`.

## 9. Equivalence

Gate 14 diffs EACH Stack-D canonical capture against the NumPy-reference capture
at `captures/eulerian-smoke-ref/` via `compare_captures` at `relative = 1e-4`
(`smoke` category, resolved from `sim.category="volumetric-grid"` by the MANDATORY
`[overrides.eulerian-smoke] category="smoke"` entry — D6). TWO independent
verdicts. **SUBSTANTIVE Stage-1 finding (Hard-Rule-2):**

- **3D Taylor-Green:** genuinely laminar (decaying vortex `~ exp(-2 nu k^2 t)`);
  cross-stack diff at FP-round-off scale → `within_tolerance=True`. Per-field
  witness in [`equivalence.md`](equivalence.md) (pending Stage-2 authoring per the
  operator's R-S2 routing).
- **2D lid-driven-cavity:** `within_tolerance=False`. The thin shear layer on a
  periodic grid is Kelvin-Helmholtz UNSTABLE — the reference trajectory reaches
  `u ~ 1.6e3` by step 5 — NOT the "steady-laminar Re=100" the plan-drafting probe
  characterized. Cross-stack FP-round-off perturbations (matched to ~1e-16 through
  step 2) amplify ~16 orders by step 5: **IC-15 deferred aspect #1 (chaotic) is
  EXERCISED**, and chaotic trajectories cannot be cross-stack-equivalent at 1e-4
  over the full 1000-step horizon. This is the first cross-stack pair to actually
  stress aspect #1; the gate-14 `within_tolerance=False` is the methodology
  finding, surfaced per Hard Rule 2 (charter § 1.4.2 / § 2; no silent widening or
  horizon-shortening). Operator routing pending.

## 10. Diagnostics

Tier 1 (NaN/Inf) over the diagnostic trajectory; Tier 2 vector_field (IC-6):
`check_divergence_free` (load-bearing post-projection, advisory threshold) +
`check_circulation` / `check_helicity` / `check_energy_spectrum` (advisory).
Diagnostic-tier: Taylor-Green 32³ × 20.

## 11. Build and run

```
uv run pytest packages/eulerian-smoke-stack-d/tests/ -v
uv run python -c "from pathlib import Path; from eulerian_smoke_stack_d.sim import sim_runner_seeded, sim_runner_seeded_2d; d=Path('captures/eulerian-smoke-stack-d'); print(sim_runner_seeded_2d(42,d)); print(sim_runner_seeded(42,d))"
```

## 12. References

Stam 1999 (DOI 10.1145/311535.311548); Fedkiw et al. 2001 (DOI
10.1145/383259.383260); Taylor & Green 1937 (DOI 10.1098/rspa.1937.0036).

## 13. Productization status

Research / reference port. Stack-D (Taichi-DSL CPU) is the spec-Phase-2
cross-stack validation target; the Stack-C (Vulkan) MAC-staggered primary is a
Phase-2+ forward contract. Gate-14 verdict: 3D GREEN; 2D `within_tolerance=False`
(chaotic canonical — Hard-Rule-2 finding, operator routing pending).

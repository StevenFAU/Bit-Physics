# lattice-boltzmann-d3q19 — Stack-D Reference Spec

> **Stack-D (Taichi-DSL / CPU) port** of the Phase-1 `lattice-boltzmann-d3q19`
> reference. Sibling to [`spec-ref.md`](spec-ref.md) (the Phase-1 NumPy reference,
> `stack.name="numpy-reference"`). THIRD per-sim cross-stack port under
> spec-Phase-2; authored at sub-phase-lattice-boltzmann-d3q19-stack-d Stage 1b.

## 1. Scope

A content-equivalent Taichi-DSL CPU port of the D3Q19 BGK lattice-Boltzmann
reference (Qian-d'Humieres-Lallemand 1992 equilibrium + Guo-2002 body forcing).
Reproduces BOTH Phase-1 canonical capture descriptors
`poiseuille-64x32-seed42-step1000` and `couette-32x16-seed42-step500` (D4
dual-capture) and diffs each cross-stack against the NumPy-reference capture at
`relative = 1e-5, absolute = 0.0` (the `lbm` tolerance category; gate 14, Stage 1c).
This is the FIRST cross-stack port carrying TWO canonical captures, BOTH gate-4
arms (golden + MMS), and the tighter `1e-5` budget (10x the prior pairs' `1e-4`).
The spec-designated Stack-C (Vulkan) primary remains a Phase-2+ forward contract;
the frozen diff partner here is the Phase-1 CPU reference.

## 2. Upstream and reference anchors

- D3Q19 equilibrium + weights: Qian, d'Humieres & Lallemand (1992),
  *Europhys. Lett.* 17 (6), 479, DOI 10.1209/0295-5075/17/6/001, eq. (3a) + Table 1.
- BGK collision: Bhatnagar-Gross-Krook (1954); Qian 1992 eq. (1).
- Body forcing: Guo, Zheng & Shi (2002), *Phys. Rev. E* 65, 046308,
  DOI 10.1103/PhysRevE.65.046308 (half-step velocity shift + forcing term).
- Bounce-back / moving wall: Kruger et al. (2017), *The Lattice Boltzmann Method*,
  Springer, ISBN 978-3-319-44649-3, Ch. 5 section 5.3.4.
- Stack-B (Phase-1) anchor: [`spec-ref.md`](spec-ref.md) + the golden table
  `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`; the kernel math is
  **re-derived from the upstream sources**, the lattice ORDERING is mirrored
  verbatim (R-LBM-4) for cross-stack parity.
- Taichi-DSL substrate: `docs/common/taichi.md` (IC-12); `common_py.determinism`
  (IC-11). Shared MMS surface:
  `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`.

## 3. Algorithm

Per step: (1) recover macroscopic moments `rho = sum_i f_i`, `rho*u = sum_i c_i f_i`
(in-kernel 19-term f64-seeded reductions); (2) apply the Guo half-step velocity
shift `u_eq = u + F/(2 rho)`; (3) compute the second-order equilibrium `f_i^eq`;
(4) BGK relaxation `f_i <- f_i - (f_i - f_i^eq)/tau + F_i^guo`; (5) integer-offset
streaming `f_i(x + c_i) <- f_i(x)`; (6) half-way bounce-back at the y-walls. ICs
are analytic rest-state (`rho=1, u=0`); Poiseuille is driven by a constant x body
force, Couette by a moving top plate.

## 4. Algebraic form

- Equilibrium (Qian 1992 eq. 3a): `f_i^eq = w_i rho (1 + c_i.u/c_s^2 +
  (c_i.u)^2/(2 c_s^4) - u^2/(2 c_s^2))`, `c_s^2 = 1/3`, weights `{1/3, 1/18, 1/36}`.
- Moments: `rho = sum_i f_i`; `rho u = sum_i c_i f_i`.
- Guo forcing: `F_i = (1 - 1/(2 tau)) w_i [(c_i - u)/c_s^2 + (c_i.u) c_i/c_s^4].F`.
- Lattice viscosity: `nu_lat = c_s^2 (tau - 1/2)`.

## 5. Implementation

- **Path:** `packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/`.
- `reference/constants.py` — lex-ordered 19-velocity `C`/`VELOCITIES`, weights
  `W`/`WEIGHTS`, `CS2=1/3`, canonical descriptors + dims (ported verbatim; R-LBM-4).
- `reference/d3q19_taichi.py` — Taichi-DSL `@ti.kernel` primitives (point + field
  equilibrium, f64-seeded moment reductions, BGK+Guo collision, integer streaming)
  + NumPy wrappers `feq`, `feq_field`, `density_moment`, `momentum_moment`,
  `density_field`, `momentum_field`, `bgk_step`, `stream`, `macroscopic_velocity`,
  `apply_bounce_back_y_walls` (NumPy boundary; cross-stack parity).
- `sim.py` — determinism docstring (section F.1); `sim_runner_seeded` (Poiseuille
  64x32x3 x 1000), `sim_runner_seeded_couette` (Couette 32x16x3 x 500),
  `sim_runner_diagnostic` (16x8x3 x 50; seed COSMETIC per D7).
- `invariants.py` — `equilibrium_density_moment`, `equilibrium_momentum_moment`.
- NumPy arrays flow in/out of the `ti.types.ndarray` kernels (RD-2D / sph-water
  pattern); no in-package field re-allocation across grid sizes.

## 6. Verification posture — DUAL-ARM gate-4

Code verification carries BOTH arms (first cross-stack port to do so):

- **Gate 4a — D3Q19 equilibrium golden**
  (`tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`; `abs = 1e-15`):
  the Taichi `feq` reproduces all 19 `f_i^eq` values at `(rho=1, u=(0.1,0,0))`
  with observed `max_abs = 0.0` (exact); density/momentum moments to `abs = 1e-14`.
- **Gate 4b — MMS observed order of accuracy** over the SHARED, UNMODIFIED
  `IncompressibleNS2DSolution` (Taylor-Green forced NS;
  `solution.py` sha256 `30e490a7...320d8e`, `derivation.md` `30dfc294...ac86e76`).
  Ladder `N in {32,64,128}`, `t_final=0.05`, diffusive `dt ~ dx^2`; observed OOA on
  the L2 velocity error **= 2.39**, within `+/-0.5` of the formal `p=2` (spec
  section 2.4). The first cross-discretization OOA comparison on this shared NS-2D
  MMS (eulerian-smoke achieved ~2.0 via MacCormack SL; this exercises D3Q19 BGK +
  Guo forcing via Chapman-Enskog).

### 6.6 PBT-covered invariants

1. `equilibrium_density_moment` — `sum(f_i^eq) = rho` identically (FP tol 1e-14).
2. `equilibrium_momentum_moment` — `sum(c_i . f_i^eq) = rho u` per axis (FP tol 1e-14).

(Exactly 2, ported verbatim from the Phase-1 reference.)

## 7. Golden values / Manufactured solutions

Golden: at `(rho=1, u=(0.1,0,0))`, `f_eq[0] = 0.3283333333333333`,
`momentum_x = 0.10000000000000002`. MMS: observed OOA 2.39 (formal p=2). At rest
`feq(1,(0,0,0)) == WEIGHTS` exactly.

## 8. Determinism

**Claim: `bit-exact-same-hw` at `arch="cpu"`** (zero-tolerance same-stack special
case of IC-13); witnessed by gate-10 `run_twice_and_diff`
(`content_equivalent == True`). Mechanism: `set_taichi_deterministic(arch="cpu")`
pins `cpu_max_num_threads=1`, serialising the `ti.ndrange` cell loops; every
per-direction loop iterates in fixed `ti.static(range(19))` lex order. **f64
accumulator seeds** (`ti.f64(0.0)`) on every in-kernel reduction — `set_taichi_
deterministic` does NOT set `default_fp=ti.f64`, and bare-`0.0` locals leaked
3.4e-6 at the Stage-0 derisk (restored to 7e-15). No `ti.atomic_add` /
subgroup-collective surfaces (`determinism.atomic_ops = False`). Integer streaming
is bit-exact (no FP). NO RNG (analytic ICs; `seed` cosmetic — D7). Phase-2+
deferred: GPU arch determinism; FMA fusion; subgroup-collectives.

## 9. Equivalence

Gate 14 diffs EACH Stack-D canonical capture against the NumPy-reference capture
at `captures/lbm-ref/` via `compare_captures` at `relative = 1e-5, absolute = 0.0`
(`lbm` category, resolved from `sim.category="lattice"` by the MANDATORY
`[overrides.lattice-boltzmann-d3q19] category="lbm"` entry — D6; added at Stage 1c,
without which `compare_captures` raises `KeyError`, confirmed at Stage-0 Task 0.5).
TWO independent verdicts (Poiseuille primary + Couette secondary; D4). The
collision-step FP-accumulation (D9) is the cross-stack-non-trivial surface; the
Stage-0 derisk showed the 19-term reduction matches the NumPy reference at ~7e-15,
well inside `1e-5`. Per-field per-frame witness + step-horizon analysis are
authored into [`equivalence.md`](equivalence.md) at Stage 1c (R-L1; no silent
widening — STOP + surface if `1e-5` is exceeded). Empirical disposition is a
Stage-1c deliverable.

## 10. Diagnostics

Tier 1 (NaN/Inf health) over the captured frames; Tier 2 vector_field (IC-6):
`check_divergence_free` (advisory — LBM is weakly compressible, `div(u) ~ O(Ma^2)`)
+ `check_circulation`. Diagnostic-tier trajectory: Poiseuille 16x8x3 x 50.

## 11. Build and run

```
# Run the Stack-D test surface:
uv run pytest packages/lattice-boltzmann-d3q19-stack-d/tests/ -v
# Re-derive the Stack-D canonical captures (~4-5 s combined; RD-2D-scale):
uv run python -c "from pathlib import Path; from lattice_boltzmann_d3q19_stack_d.sim import sim_runner_seeded, sim_runner_seeded_couette; d=Path('captures/lattice-boltzmann-d3q19-stack-d'); print(sim_runner_seeded(42,d)); print(sim_runner_seeded_couette(42,d))"
```

## 12. References

Qian et al. 1992 (DOI 10.1209/0295-5075/17/6/001); Guo et al. 2002 (DOI
10.1103/PhysRevE.65.046308); Kruger et al. 2017 (ISBN 978-3-319-44649-3); BGK 1954.

## 13. Productization status

Research / reference port. Stack-D (Taichi-DSL CPU) is the spec-Phase-2 cross-stack
validation target; the Stack-C (Vulkan) primary is a Phase-2+ forward contract.
Gate 14 cross-stack equivalence verdict (both captures) lands at Stage 1c.

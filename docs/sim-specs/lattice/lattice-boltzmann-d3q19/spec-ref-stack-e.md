# lattice-boltzmann-d3q19 — Stack-E Reference Spec

> **Stack-E (Python / NVIDIA Warp 1.13.0 / CPU) port** of the Phase-1
> `lattice-boltzmann-d3q19` reference. Sibling to [`spec-ref.md`](spec-ref.md)
> (the Phase-1 NumPy reference, `stack.name="numpy-reference"`) and
> [`spec-ref-stack-d.md`](spec-ref-stack-d.md) (the Taichi port). EIGHTH per-sim
> cross-stack port under spec-Phase-2; THIRD Stack-E port consuming `common-warp`;
> authored at sub-phase-lattice-boltzmann-d3q19-stack-e Stage 1b.

## 1. Scope

A content-equivalent NVIDIA Warp CPU port of the D3Q19 BGK lattice-Boltzmann
reference (Qian-d'Humieres-Lallemand 1992 equilibrium + Guo-2002 body forcing).
Reproduces BOTH Phase-1 canonical capture descriptors
`poiseuille-64x32-seed42-step1000` and `couette-32x16-seed42-step500` (D4
dual-capture) and diffs each cross-stack against the NumPy-reference capture at
`relative = 1e-5, absolute = 0.0` (the `lbm` tolerance category; gate 14,
Stage 1c). Runs in NVIDIA Warp CPU mode (`device="cpu"`); the GPU backend is
out of scope (CPU `bit-exact-same-hw` only per spec section 4.4).

## 2. Upstream and reference anchors

- D3Q19 equilibrium + weights: Qian, d'Humieres & Lallemand (1992),
  *Europhys. Lett.* 17 (6), 479, DOI 10.1209/0295-5075/17/6/001, eq. (3a) + Table 1.
- BGK collision: Bhatnagar-Gross-Krook (1954); Qian 1992 eq. (1).
- Body forcing: Guo, Zheng & Shi (2002), *Phys. Rev. E* 65, 046308,
  DOI 10.1103/PhysRevE.65.046308 (half-step velocity shift + forcing term).
- Bounce-back / moving wall: Kruger et al. (2017), *The Lattice Boltzmann Method*,
  Springer, ISBN 978-3-319-44649-3, Ch. 5 section 5.3.4.
- Phase-1 anchor: [`spec-ref.md`](spec-ref.md) + the golden table
  `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`; the kernel math is
  **re-derived from the upstream sources**, the lattice ORDERING is mirrored
  verbatim (R-LBM-4) for cross-stack parity.
- NVIDIA Warp substrate: `docs/common/warp.md` (the section 1.9.1 socket: Runtime
  + Capture + Determinism; D7 socket-only). Shared MMS surface:
  `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`.

## 3. Algorithm

Per step (mirrors the Phase-1 reference step-for-step): (1) recover macroscopic
moments `rho = sum_i f_i`, `rho*u = sum_i c_i f_i` (in-kernel 19-term f64-seeded
lex reductions); (2) apply the Guo half-step velocity shift `u_eq = u + F/(2 rho)`;
(3) compute the second-order equilibrium `f_i^eq`; (4) BGK relaxation
`f_i <- f_i - (f_i - f_i^eq)/tau + F_i^guo`; (5) integer-offset positive-modulus
streaming gather `f_i(x + c_i) <- f_i(x)`; (6) half-way bounce-back at the y-walls.
ICs are analytic rest-state (`rho=1, u=0`); Poiseuille is driven by a constant x
body force, Couette by a moving top plate. `N_z = 3` z-periodic depth-3 slab.

## 4. Algebraic form

- Equilibrium (Qian 1992 eq. 3a): `f_i^eq = w_i rho (1 + c_i.u/c_s^2 +
  (c_i.u)^2/(2 c_s^4) - u^2/(2 c_s^2))`, `c_s^2 = 1/3`.
- Guo forcing (Guo 2002): `u_eq = (sum_i c_i f_i + F/2)/rho`;
  `F_i = (1 - 1/(2 tau)) w_i [(c_i - u)/c_s^2 + (c_i.u) c_i/c_s^4] . F`.
- Moving-wall bounce-back (Kruger 2017): the wall injection is
  `-2 w_i rho_wall (c_i . u_wall)/c_s^2` added to the reflected `f_{opp(i)}`.

## 5. Stack-E implementation (NVIDIA Warp)

`packages/lattice-boltzmann-d3q19-stack-e/lattice_boltzmann_d3q19_stack_e/reference/`:

- `constants.py` — the 19-velocity set / weights / `c_s^2` / canonical descriptors,
  ported VERBATIM from the Phase-1 reference (pure data; R-LBM-4 ordering parity).
- `d3q19_warp.py` — the hot primitives as `@wp.kernel` over an own
  `wp.array(dtype=wp.float64, ndim=4)` distribution (D7 socket-only + D8/D15; the
  f32-pinned single-component common-warp Grids cannot hold a 19-component f64
  lattice — warp.md section 6.1 / 6.2 f64-principle, third instance):
  `_k_feq_field`, `_k_density_field`, `_k_momentum_field`, `_k_collide_guo` (fused
  moments + Guo half-step + equilibrium + relaxation + forcing), `_k_stream`
  (positive-modulus gather). The point-eval `feq` / `density_moment` /
  `momentum_moment` (gate-4a golden + gate-11 PBT verification surface) are pure
  NumPy, ported verbatim from the Phase-1 reference. Bounce-back +
  macroscopic-velocity recovery are pure NumPy glue (value reflection + linear
  injection + `(rho*u + 0.5*F)/rho`), identical math to the reference.

## 6. Determinism + bit-exactness (D9 / D10; shape (a))

- **Determinism (gate 10; D9).** Warp CPU `wp.launch` is single-threaded serial
  over the launch dimension; every per-direction loop iterates fixed
  `for d in range(19)` lex order; no `wp.atomic_add` (`atomic_ops=False`); no RNG.
  Two runs at the same seed on the same hardware are bit-identical
  (`assert_deterministic_run`, `tolerance=0.0`).
- **Cross-stack BIT-EXACT (gate 14; shape (a); D10).** The in-kernel equilibrium
  uses the Phase-1 `feq_field` RECIPROCAL operand order
  (`cu*inv_cs2 + cu*cu*inv_two_cs4 - u_sq*inv_two_cs2` with precomputed f64
  `c_s^2`-constants), every reduction accumulator is seeded `wp.float64(0.0)`, and
  every pure-literal is `wp.float64(...)`. Stage-0 Task 0.2 MEASURED the Warp f64
  collision reproduces the NumPy reference byte-for-byte (`max_abs_err=0.0`);
  combined with the laminar regime (Ma < 0.1; BGK `tau=0.7` dissipative), the
  full-horizon cross-stack verdict is `within_tolerance=True` AND
  `max_abs_err=0.0` — the THIRD shape-(a) instance and the FIRST on a laminar
  trajectory. (The Stack-D Taichi port used the division operand form and landed
  shape (b) `~6e-15`; the seed-difference is a backend-pair property — methodology
  section 6.7.)

## 7. Acceptance gates

Gates 4–13 are stack-agnostic correctness (gate-4 DUAL-ARM: 4a equilibrium golden
at `abs=1e-15` + 4b NS-2D MMS, observed OOA within +/-0.5 of formal `p=2`); gate-14
is the Phase-2 cross-stack equivalence gate at `relative=1e-5` (the `lbm` category;
the portfolio-tightest), a cross-stack BIT-EXACT witness. The `[overrides.lattice-boltzmann-d3q19]`
tolerance entry is REUSED from Stack-D (D6; no new row).

# lattice-boltzmann-d3q19-stack-e

Spec-Phase-2 **Stack-E (Python / NVIDIA Warp 1.13.0 / CPU)** port of the Phase-1
`lattice-boltzmann-d3q19` reference (D3Q19 BGK lattice-Boltzmann; Qian-d'Humières-Lallemand
1992 second-order equilibrium; `stack.name="numpy-reference"`). EIGHTH per-sim cross-stack
port; THIRD Stack-E port consuming `common/common-warp` (after `mpm-multimaterial-stack-e`
+ `eulerian-smoke-stack-e`); SECOND `lattice-boltzmann-d3q19` port (after the Stack-D Taichi
port); sibling to `packages/lattice-boltzmann-d3q19/` + `packages/lattice-boltzmann-d3q19-stack-d/`.

Content-equivalent to the Phase-1 NumPy reference at `relative = 1e-5` (`lbm` tolerance
category, the portfolio-tightest) per spec § 2.6 (gate 14) — and BOTH canonical trajectories
are **LAMINAR / bounded / dissipative** (BGK `τ=0.7` damps; the inverse of smoke's
positive-Lyapunov blow-up), so gate-14 is a **cross-stack BIT-EXACT witness**:
`within_tolerance=True` AND `max_abs_err=0.0` is the EXPECTED verdict (the THIRD shape-(a)
instance after MPM-E + smoke-E, and the FIRST on a laminar trajectory — completing the
D-S2-1 decoupling: shape (a) is a zero cross-stack seed-difference property, orthogonal to
the Lyapunov regime). The Stage-0 Task 0.2 measurement confirmed the Warp f64 collision
reproduces the NumPy reference collision byte-for-byte (`max_abs_err=0.0`; IC-15 deferred
aspect #4, FIRST Warp measurement); the plan-drafting probe measured the full step-1
cross-stack seed-difference `0.0`. Per methodology § 6.1 R-P2 needs BOTH chaos AND a
non-zero seed-difference; LBM has neither → shape (a). The contrast to LBM-Stack-D (Taichi,
shape (b) `~6e-15`) is the within-sim cross-backend confirmation of methodology § 6.7 (the
seed-difference is a backend-pair property, not the sim's).

D3Q19 BGK collision `f_i^post = f_i − (f_i − f_i^eq(ρ,u))/τ` + Guo (2002) body force +
per-direction periodic-mod streaming gather + half-way bounce-back (`OPP` opposite-direction
swap + moving-wall momentum injection `−2 w_i ρ_wall (c_i·u_wall)/c_s²`); lex 19-direction
ordering; `c_s² = 1/3`. No atomic scatter (streaming is a gather; `atomic_ops=False`); no
iterative solver (single-pass explicit). MRT / multi-relaxation-time collision is a Phase-4+
variant (out of scope).

Consumes the common-warp § 1.9.1 socket **only** (Runtime + Capture + Determinism; D7) and
declares its OWN `wp.array(dtype=wp.float64, ndim=4)` for the 19-component distribution (D8/D15;
the f32-pinned single-component `ScalarField3D`/`VectorField3D` Grids surface does not fit a
19-component f64 lattice — warp.md § 6.1 / § 6.2 f64-principle, third instance). No HashGrid
(streaming is a fixed-offset gather, no neighbor search).

## Layout

- `lattice_boltzmann_d3q19_stack_e/reference/` — NVIDIA Warp `@wp.kernel` D3Q19 primitives
  (`bgk_step` collision + Guo, `stream` periodic-mod gather, `apply_bounce_back_y_walls`
  `OPP` swap + moving-wall injection, `density_field`/`momentum_field`/`feq_field` over an
  own `wp.array(dtype=wp.float64, ndim=4)`; point-eval `feq`/`density_moment`/`momentum_moment`;
  canonical constants `VELOCITIES`/`WEIGHTS`/`CS2`/`C`/`W` re-derived verbatim from the Phase-1
  reference; no Phase-1 import). **Stage 1b.**
- `lattice_boltzmann_d3q19_stack_e/sim.py` — `sim_runner_seeded` (Poiseuille),
  `sim_runner_seeded_couette` (Couette moving-plate), `sim_runner_diagnostic`. **Stage 1b.**
- `lattice_boltzmann_d3q19_stack_e/invariants.py` — `equilibrium_density_moment`
  + `equilibrium_momentum_moment` (gate-11 PBT, ≥ 50 examples each). **Stage 1b.**

At Stage 1a (this scaffold) the package is the **gate-13 failing-tests RED anchor**: the
`reference` / `sim` / `invariants` modules are absent, so the `tests/` collect at a clean
`ModuleNotFoundError`. Stage 1b lands the Warp implementation (GREEN, gates 4–13) +
root-workspace registration (22 → 23); Stage 1c lands gate-14 (the cross-stack BIT-EXACT witness).

## Run

```
python -m pytest packages/lattice-boltzmann-d3q19-stack-e/tests/ -v
```

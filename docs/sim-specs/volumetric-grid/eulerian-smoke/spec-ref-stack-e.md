# eulerian-smoke — Stack-E Reference Spec

> **Stack-E (Python / NVIDIA Warp 1.13.0 / CPU) port** of the Phase-1
> `eulerian-smoke` reference. Sibling to [`spec-ref.md`](spec-ref.md) (the Phase-1
> NumPy reference, `stack.name="numpy-reference"`) and
> [`spec-ref-stack-d.md`](spec-ref-stack-d.md) (the Taichi-DSL port). SEVENTH
> per-sim cross-stack port under spec-Phase-2 and the SECOND Stack-E port
> consuming `common-warp` (spec § 11.3 item 2.4 Stack-E half). Authored at
> sub-phase-eulerian-smoke-stack-e Stage 1b (mirroring the Stack-D spec sheet's
> impl-stage timing). Cites `spec-ref-stack-d.md` as the structural template and
> `docs/phases/sub-phase-mpm-multimaterial-stack-e.md` for the Warp/common-warp
> consumption pattern.

## 1. Scope

A content-equivalent Stack-E NVIDIA Warp `@wp.kernel` port of the Stam-Fedkiw
stable-fluids reference (Stam 1999 + Fedkiw 2001). Collocated cell-centered
periodic grid; plain trilinear semi-Lagrangian advection (3D), MacCormack-corrected
SL (2D), 5/7-point explicit Laplacian diffusion, fixed-`n_jacobi=20` Jacobi
pressure-projection (IC-15 deferred aspect #5 in its determinism-safe
fixed-iteration-count form), Fedkiw vorticity confinement (skeleton; `eps=0`
PRESENT-but-NOT-EXERCISED at canonical). Reproduces BOTH Phase-1 canonical
descriptors (`taylor-green-128cube-seed42-step500` 3D +
`lid-driven-cavity-128sq-re100-seed42-step1000` 2D; D4) and diffs each cross-stack
against the NumPy-reference capture at `relative = 1e-4` (the `smoke` tolerance
category; gate 14). Gate-4 carries the MMS arm ONLY (no golden table — the OPPOSITE
of LBM's dual-arm and MPM's golden-only; matches RD-3D). No MAC-staggered /
face-centered velocities (deferred to Stack-C); no atomic scatter. Out of scope:
GPU-arch determinism; the other Stack-E port (LBM § 11.3 item 2.5).

## 2. Upstream and reference anchors

- Stam, J. (1999), "Stable Fluids", SIGGRAPH '99, 121–128, DOI 10.1145/311535.311548.
- Fedkiw, R., Stam, J., Jensen, H. W. (2001), "Visual Simulation of Smoke",
  SIGGRAPH '01, 15–22, DOI 10.1145/383259.383260 (vorticity confinement).
- Taylor, G. I., Green, A. E. (1937), Proc. R. Soc. Lond. A 158, DOI 10.1098/rspa.1937.0036
  (3D Taylor-Green vortex IC).
- Phase-1 anchor: [`spec-ref.md`](spec-ref.md); the kernel math is re-derived from
  the upstream sources, the canonical constants (`CANONICAL_*`,
  `_DEFAULT_N_JACOBI=20`, `canonical_params_{2d,3d}`) re-derived VERBATIM (no
  Phase-1 import — Convention A/D isolation).
- Warp substrate: `docs/common/warp.md` (§ 6.1 f64-principle); `common-warp`
  § 1.9.1 socket (Runtime + Capture + Determinism). Shared MMS surface:
  `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`.

## 3. Algorithm

Per step (3D): (1) plain trilinear semi-Lagrangian advect `u,v,w`; (2) vorticity
confinement (`eps=0` dead path at canonical); (3) explicit 7-point Laplacian
diffusion; (4) fixed-20-sweep Jacobi pressure-projection (collocated
centered-difference div/grad); (5) scalar smoke-density advect by the projected
velocity. 2D: MacCormack-corrected SL velocity advect → 5-point diffuse → Jacobi
project → density via plain SL. ICs analytic (Taylor-Green vortex 3D; thin
lid-shear-layer 2D).

## 4. Algebraic form

- SL backtrace: `phi(x) <- interp(phi^n, x - u dt)`, periodic positive-modulus
  (`np.mod`-faithful `x - n*floor(x/n)`) wrap, lex (i,j[,k]) bilinear/trilinear
  vertices.
- MacCormack (2D): `phi_hat = SL(+dt)`, `phi_check = SL(phi_hat,-dt)`,
  `phi^{n+1} = phi_hat + (phi^n - phi_check)/2` (no limiter).
- Projection: `lap(p) = (rho/dt) div(u*)`, `n_jacobi=20` sweeps, then
  `u <- u* - (dt/rho) grad(p)`. 2nd-order centered div + grad. The per-cell
  `@wp.kernel`s replicate the Phase-1 `np.roll` neighbor-summation ORDER, so the
  cross-stack step-1 delta is bit-exact `0.0` (§ 9).

## 5. Implementation

- **Path:** `packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/`.
- `reference/stable_fluids_warp.py` — NVIDIA Warp `@wp.kernel` per-cell-gather
  primitives (`_sl_advect_{2d,3d}_k`, `_lap5_k`/`_lap7_k`, `_div2d_k`/`_div3d_k`,
  `_jacobi2d_k`/`_jacobi3d_k`, `_grad_sub_{2d,3d}_k`, `_curl3d_k`) over own f64
  `wp.array`s (D15) + NumPy-marshalling wrappers mirroring the Phase-1 reference
  signatures + canonical constants. O-W6 (no `from __future__ import
  annotations`); O-W7 (`wp.float64(1.0)/wp.float64(6.0)` 3D-Jacobi seed; float
  backtrace → `wp.int32(...)` base node on a non-reused float).
- `sim.py` — determinism docstring (§ 8); `sim_runner_seeded` (3D 128³×500),
  `sim_runner_seeded_2d` (2D 128²×1000), `sim_runner_diagnostic` (32³×10),
  `compute_canonical_trajectory_3d`. Consumes the common-warp socket
  (`init`/`set_warp_deterministic`/`deterministic_context`/`Capture`/`write_capture`).
- `invariants.py` — `divergence_free_post_projection`, `smoke_density_nonneg`
  (50 examples each).
- NumPy arrays flow in/out of the f64 `@wp.kernel`s; the common-warp socket-only
  consumption (D7) declares own `wp.array(dtype=wp.float64)` (the f32
  `ScalarField3D`/`VectorField3D` Grids surface is smoke's natural structural fit
  yet f64-blocked — warp.md § 6.1, SECOND f64 instance).

## 6. Verification posture — MMS ONLY (no golden)

Gate-4 carries the MMS arm ONLY (spec-ref § 7 "No closed-form golden table").
NS-2D MMS over the SHARED, UNMODIFIED `IncompressibleNS2DSolution` (shared with
lattice-boltzmann-d3q19; shift #18); ladder `N in {32,64,128}`; the advection arm
drives the Warp 2D `stable_fluids_step` (MacCormack + projection-bypass), the
projection arm drives `project_pressure`. Observed OOA within ±0.5 of formal p=2
(both arms; Phase-1 reference 1.99 / 2.00; Stack-D 1.9892 / 1.9976). Cat-3 NO-OP
(no golden subdir).

### 6.6 PBT-covered invariants
1. `divergence_free_post_projection` — post-projection L-inf divergence below the
   collocated-grid residual floor (`_DIV_TOL=1e-1`).
2. `smoke_density_nonneg` — density φ ≥ 0 under SL advection (max-principle).

(Exactly 2; 50 examples each.)

## 7. Golden values / Manufactured solutions

No golden table. MMS: observed OOA within ±0.5 of formal p=2 on both arms.

## 8. Determinism

**Claim: `bit-exact-same-hw` at `device="cpu"`** (D9; spec § 4.4 CPU). Mechanism:
Warp's CPU `wp.launch` is single-threaded serial over the launch dimension (the
Warp analog of Taichi `cpu_max_num_threads=1` — no knob); per-cell gather kernels
in fixed neighbor order; fixed Jacobi sweep cap. **f64-seed (banked precedent #7,
NON-vacuous):** the 3D Jacobi `1.0/6.0` is seeded `wp.float64(1.0)/wp.float64(6.0)`
(pure-literal would infer f32; the constant leaked ~1e-9 in Taichi Stack-D). No
`wp.atomic_*` / subgroup surfaces (`atomic_ops=False`); no RNG. Gate-10
`run_twice_and_diff` witnesses `content_equivalent=True`; `assert_deterministic_run`
(§ 1.9.1, `tolerance=0.0`) on the 3D-Jacobi surface witnesses bit-exact run-to-run.
This determinism holds EVEN THOUGH the cross-stack trajectory diverges
(positive-Lyapunov) — within-stack order-determinism and cross-stack chaos are
independent axes.

**§ L.7 O-2 four-checkpoint Warp CPU determinism chain:** (1) Stage-0 R-A1 anchor
`79d15705…b342b2eea2` (ephemeral Jacobi-projection kernel, 6/6 bit-identical);
(2) Stage-1b gate-10 `assert_deterministic_run` (production `project_pressure_3d`,
bit-exact run-to-run); (3) Stage-1b canonical-scale 2-run (2D canonical
`taylor-green`/`lid-driven` reproduced bit-identical, worst_abs_diff `0.0`);
(4) Stage-1c formal gate-14.

## 9. Equivalence — chaotic-regime R-P2 escape-hatch (BOTH canonicals)

Gate 14 (Stage 1c) diffs EACH Stack-E canonical capture against the NumPy-reference
capture at `captures/eulerian-smoke-ref/` via `compare_captures` at `relative =
1e-4` (`smoke` category, resolved from the LEFT/reference `sim.name="eulerian-smoke"`
by the existing `[overrides.eulerian-smoke] category="smoke"` entry — D6 REUSE, no
new row). TWO independent verdicts. **Predicted `within_tolerance=False` on BOTH
(R-P2 chaotic-regime escape-hatch — the CORRECT verdict; D10):**

- **Step-1 port-faithfulness: BIT-EXACT (`max_abs_err = 0.0`)** on all fields, both
  2D and 3D (verified Stage 1b against the Phase-1 NumPy reference — the `np.roll`
  operation-order + `np.mod`-positive-modulus replication is exact). The port is
  faithful; the cross-stack divergence is NOT a defect.
- **BOTH canonicals are CHAOTIC (positive-Lyapunov) at canonical resolution**
  (plan-drafting Task 1.6): 3D Taylor-Green `max|u| 0.999 → 1.34e8 @ step 50`; 2D
  lid-driven Kelvin-Helmholtz `0.99 → 1.64e3 @ step 5`. The SEALED Phase-1
  reference itself blows up, so cross-stack content-equivalence at `1e-4` over the
  500/1000-step horizons is physically impossible. The R-P2 escape-hatch
  (methodology § 6) is INVOKED; gate-14 is a divergence-rate witness, NOT an
  FP-round-off margin. R-SME9: the 3D instability is resolution-dependent (64³
  decays, 128³ blows up). This is the SECOND R-P2 instance (FIRST on Stack-E) —
  evidence the escape-hatch is stack-portable (Taichi → Warp).
- **STOP-discipline (D10):** `within_tolerance=False` is EXPECTED; the only STOP is
  a step-1 port-faithfulness failure (≫ FP-round-off) — which did NOT occur
  (step-1 is bit-exact). NO silent tolerance widening / horizon shortening. Full
  per-field per-frame + divergence-rate witness: [`equivalence.md`](equivalence.md)
  Stack-E section (Stage 1c / Stage 2 authoring).

## 10. Diagnostics

Tier 1 (NaN/Inf) over the diagnostic trajectory; Tier 2 vector_field (IC-6):
`check_divergence_free` (load-bearing post-projection, advisory threshold) +
`check_circulation` / `check_helicity` / `check_energy_spectrum` (advisory).
Diagnostic-tier: Taylor-Green 32³ × 20.

## 11. Build and run

```
uv run --package eulerian-smoke-stack-e --extra dev python -m pytest packages/eulerian-smoke-stack-e/tests/ -v
uv run --package eulerian-smoke-stack-e python -c "from pathlib import Path; from eulerian_smoke_stack_e.sim import sim_runner_seeded, sim_runner_seeded_2d; d=Path('captures/eulerian-smoke-stack-e'); print(sim_runner_seeded_2d(42,d)); print(sim_runner_seeded(42,d))"
```

## 12. References

Stam 1999 (DOI 10.1145/311535.311548); Fedkiw et al. 2001 (DOI 10.1145/383259.383260);
Taylor & Green 1937 (DOI 10.1098/rspa.1937.0036).

## 13. Productization status

Research / reference port. Stack-E (NVIDIA Warp CPU) is the spec-Phase-2 cross-stack
validation target; the Stack-C (Vulkan) MAC-staggered primary is a Phase-2+ forward
contract. Gate-14 verdict (predicted): `within_tolerance=False` on BOTH canonicals
(R-P2 chaotic-regime escape-hatch — the CORRECT verdict; step-1 bit-exact-faithful;
D10). Stage 1c formalizes.

# Reaction-diffusion 2D (Gray-Scott) — Stack-D Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. Sibling to
> `spec-ref.md` (Stack-B WGSL/WebGPU reference); reuses Stack-B's
> upstream anchors + algebraic form + invariants and adds the Stack-D
> Taichi-DSL implementation surface + cross-stack equivalence posture.

## 1. Scope

Two-species reaction-diffusion sim on a periodic 2D grid (Gray-Scott),
Stack-D port — Python / Taichi-DSL backend at `arch="cpu"`. Category:
`continuous-ca`. Variant: `gray-scott`. Cross-stack equivalence partner
to the Phase-0-Block-8-frozen Stack-B WGSL/WebGPU reference. Non-goals:
GPU-arch (Stack-D `ti.cuda` / `ti.vulkan` / `ti.metal`) determinism
posture — Phase-2+ frontier scope per `docs/common/taichi.md` § 4.4.

## 2. Upstream and reference anchor

Shared with Stack-B (`spec-ref.md` § 2):

- Gray, P. & Scott, S. K. (1983). *Autocatalytic reactions in the
  isothermal, continuous stirred tank reactor.* Chem. Eng. Sci. 39 (6),
  1087-1097. DOI 10.1016/0009-2509(84)87017-7.
- Pearson, J. E. (1993). *Complex patterns in a simple system.* Science
  261 (5118), 189-192. DOI 10.1126/science.261.5118.189.

Stack-D-specific cross-references:

- `docs/common/taichi.md` — IC-12 Stack-D Taichi convention (init form;
  banned flags; `arch="cpu"` mandate; `@ti.kernel` annotation
  limitations at § 4.2 + § 4.6).
- `docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md`
  — IC-11 (`set_taichi_deterministic`) + IC-12 surface origin.
- `docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md`
  — IC-13 (content-equivalence contract semantics) + IC-14 (Python +
  TypeScript `run_twice_and_diff` API).
- `spec-ref.md` (Stack-B sibling) — primary reference; this Stack-D
  spec sheet inherits § 4 algebraic form + § 6 PBT invariants verbatim.

Algebraic anchor: `algebraic.md` § 1-3 (shared with Stack-B).

## 3. Algorithm

Identical to Stack-B (`spec-ref.md` § 3): explicit forward Euler in
time + 5-point Laplacian in space with periodic boundary conditions. The
locked-canonical parameters (F = 0.0367, k = 0.0649, Du = 0.16,
Dv = 0.08, dx = 1.0, dt = 1.0) sit in Pearson 1993's λ region; pattern
formation is self-replicating spots. The Stack-D port preserves the
algorithm bit-for-bit at the IC stage (NumPy-seeded
`numpy.random.default_rng(seed)` perturbation) and at the update
formula; only the inner update primitive changes from NumPy vectorised
to Taichi-DSL per-cell.

## 4. Algebraic form

Identical to Stack-B (`algebraic.md` § 1-3). The continuous PDE is

$$U_t = D_u \nabla^2 U - U V^2 + F (1 - U),$$
$$V_t = D_v \nabla^2 V + U V^2 - (F + k) V.$$

The forward-Euler 5-point discretization is `algebraic.md` § 4.

## 5. Implementation

- **Python Taichi-DSL reference:**
  `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/gray_scott_taichi.py`.
  Module-level `@ti.kernel step_diffuse_react` + `@ti.kernel
  step_diffuse_react_with_source` (gate-4 MMS variant); both consume
  `ti.types.ndarray(dtype=ti.f64, ndim=2)` U/V/source buffers + scalar
  parameters; `ti.ndrange(n, n)` row-major iteration; periodic BC via
  modulo wrap.
- **Python Stack-D sim wrapper (SimRunner / SimRunnerPBT protocols):**
  `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/sim.py`.
  Exports `sim_runner_seeded`, `sim_runner_pbt`,
  `sim_runner_with_source_term`.
- **PBT invariants:**
  `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/invariants.py`.
  Three invariants identical-in-spirit to Stack-B's
  `test_pbt_invariants.py`: `monotone_bounds_uv`,
  `mass_approximately_conserved`, `periodic_bc_satisfied`.
- **Determinism-strategy declaration:** docstring at the top of
  `sim.py` per `docs/conventions/sub-phase-conventions.md` § F.1; cited
  in the Stage 1b commit footer. Reduction-ordering: no in-kernel
  reductions, per-cell local stencil only. Index-sort: `ti.ndrange(n,
  n)` row-major + `cpu_max_num_threads=1` pin. RNG: NumPy
  `default_rng(seed)` IC only; Taichi `ti.random` surface unused.
- **Stack-B partner (reference for cross-stack equivalence):**
  `packages/reaction-diffusion-2d/` (WGSL / WebGPU + NumPy reference,
  Phase-0-Block-8 frozen).
- **Capture format:** identical to Stack-B's (`tools/testkit/capture/`
  HDF5 + JSON sidecar). Cross-stack equivalence consumes both Stack-B
  and Stack-D captures via the same loader.

## 6. Verification posture

- **Code verification (Cat 3, gate 4).** MMS-based — consumes
  `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py`
  (Phase-1 RD-3D Stage 2 R8 deliverable; co-bundled 2D solution).
  `tests/test_code_verification.py::test_mms_observed_order_at_canonical_params`
  runs a 4-grid ladder (`N ∈ {16, 32, 64, 128}`) at `t_final = 0.05`
  with `cfl_safety = 0.4 · dx²/(4·max(D_u, D_v))` and asserts the
  observed L2 order of accuracy is within ±0.5 of the formal spatial
  order 2.0 (5-point Laplacian). The MMS solution's true period is
  `2 · L` (κ = π/L); the discrete domain is built on `[0, 2L]²` so the
  periodic stencil stays consistent with the source-term contract.
- **Canonical-capture replay (gate 5, IC-13 same-stack content-equivalence).**
  `tests/test_code_verification.py::test_canonical_capture_matches_stack_d_reconstruction_within_rtol_1em4`
  verifies a fresh Stack-D run at the canonical seed reconstructs the
  committed Stack-D canonical capture under `np.array_equal` (the IC-13
  contract is bit-identical at content level same-stack same-hw, NOT
  rtol-loose — name retained from Stack-B's gate-5 wording for surface
  parity).
- **Determinism (gate 10, IC-14 harness).**
  `tests/test_determinism.py::test_stack_d_is_content_equivalent`
  invokes `run_twice_and_diff(sim_runner_seeded, seed=42)`; verdict's
  `content_equivalent == True`.
- **PBT (gate 11).** Three invariants from § 6 of the Stack-B
  `spec-ref.md`, at `n_examples = 20` per spec § 2.14.
- **Cross-stack equivalence (gate 14, Phase-2 specific).** Stage 1c
  scope; gate-14 deferred. The Stack-D canonical capture is the
  cross-stack equivalence partner consumed at gate-14 by Stage 1c
  against the Stack-B Phase-0-frozen capture at `relative = 1e-4`
  (category default per `tools/testkit/equivalence/tolerance.toml`).

## 7. Golden values / Manufactured solutions

The MMS solution at
`tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py`
is consumed at gate 4. No closed-form "golden table" applies (same
posture as Stack-B `spec-ref.md` § 7); the Stack-D canonical capture
is the closest analogue and is itself code-verified via the MMS gate.

## 8. Determinism

`bit-exact-same-hw` at `arch="cpu"` under IC-13 content-equivalent
semantics. Determinism-strategy declaration docstring at the top of
`packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/sim.py`
per `docs/conventions/sub-phase-conventions.md` § F.1. Mechanism:

1. `set_taichi_deterministic(Config(deterministic=True, seed=...),
   arch="cpu")` invoked before any kernel launch (IC-11; pins
   `ti.init(arch=ti.cpu, random_seed=..., cpu_max_num_threads=1,
   offline_cache=True)` per `docs/common/taichi.md` § 2).
2. No in-kernel reductions; no atomic scatter-add. The per-step update
   writes to distinct `(i, j)` cells of `u_next` / `v_next` from reads
   of `u` / `v` only.
3. `ti.ndrange(n, n)` row-major iteration; `cpu_max_num_threads=1`
   serialises the loop.
4. RNG entry exclusively through `numpy.random.default_rng(seed)` in
   the IC; Taichi `ti.random` surface unused.

Phase-2+ deferred posture (out of scope for this sub-phase): GPU-arch
determinism (`ti.cuda` / `ti.vulkan` / `ti.metal`); FMA-fusion across
backends; subgroup-collectives.

## 9. Equivalence

Cross-stack content-equivalent to Stack-B's WGSL/WebGPU reference at
`relative = 1e-4, absolute = 0.0` (the `reaction-diffusion` category
default in `tools/testkit/equivalence/tolerance.toml`; no per-sim
override). Diff'd via
`tools/testkit/equivalence/harness.py::compare_captures` consuming both
the Stack-B (`captures/reaction-diffusion-2d-ref/...`) and Stack-D
(`captures/reaction-diffusion-2d-stack-d/...`) canonical captures at
the locked descriptor `gray-scott-lambda-128sq-seed42-step2000`.

The cross-stack diff is **content-equivalent at 1e-4**, NOT bit-exact:
WGSL/WebGPU and Taichi-DSL/CPU use different FP-accumulation patterns
(WGSL 8×8 workgroups vs Taichi serial ndrange) and different reduction
primitives. Stage 1c authors
`docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` to
document the per-field diff witness + step-horizon at which the diff
approaches the 1e-4 tolerance.

## 10. Diagnostics

Identical surface to Stack-B (`spec-ref.md` § 10):

- Tier 1: `diagnostics.tier1.health.check_health` (NaN/Inf scan).
- Tier 2 scalar_field: `monotone_bounds.check_bounds(U, 0, 1)` +
  `check_bounds(V, 0, 1)` against the Stack-D canonical capture.

`tests/test_diagnostics.py` applies both tiers to the Stack-D canonical
capture; all 11 frames pass.

## 11. Build and run

```bash
# Python Stack-D (Taichi-DSL Gray-Scott + canonical capture replay +
# tests):
uv run --directory packages/reaction-diffusion-2d-stack-d pytest -W error

# Re-derive the Stack-D canonical capture:
uv run python -c "
from pathlib import Path
from reaction_diffusion_2d_stack_d.sim import sim_runner_seeded
sim_runner_seeded(seed=42, out_dir=Path('captures/reaction-diffusion-2d-stack-d'))
"
```

The committed Stack-D capture at
`captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`
is byte-reproducible across re-runs (fixed `start_utc` +
`wall_clock_seconds = 0.0` in the manifest mirror Stack-B's pattern).

## 12. References

- Gray, P. & Scott, S. K. (1983), op. cit.
- Pearson, J. E. (1993), op. cit.
- `spec-ref.md` (Stack-B sibling).
- `docs/common/taichi.md` (Stack-D convention; IC-12).
- `docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md` (this
  sub-phase's charter).
- `docs/architecture.md` § 2.5 (IC-13 content-equivalence contract),
  § 2.6 (cross-stack tolerance), § 3.5 (per-sim 13-gate acceptance +
  phase-2-plan § 1.5.1 v6 amendment 14th gate), § 4.4 (Stack-D
  verification posture), § 5.2.1 (RD-2D Stack-B primary).
- Spec § 2.13 (code verification observed-OOA acceptance).
- Spec § 2.14 (property-based testing).

## 13. Productization status

```yaml
productization:
  web: false      # 5.1 — Stack-D is Python-side; Stack-B carries the web demo
  binary: false   # 5.2 — Stack-D ships as a Python package, no C++ binary
  pypi: false     # 5.3 — Stack-D is a workspace member, not a PyPI release
  render: false   # 5.4 — offline-render path is Stack-B's
  preprint: false # 5.5 — Stack-D documents the cross-stack port; preprint scope is Stack-B's
```

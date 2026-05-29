---
probe: 3dgs-mpm
task: task-8
sub_phase: sub-phase-phase-3-3dgs-mpm
stage: plan-drafting (pre-dispatch probe; re-run live at execution Stage 0)
date: 2026-05-29
head_sha: 3a2a7aeda23b1952cb9232a95b28f1a78d35571f
verdict: PRECONDITIONS DISCHARGED — both hard deps present; common-3dgs renders CPU-only; NO BLOCK
---

# Pre-implementation probe — 3dgs-mpm (task-8, Phase-3 finale)

> Verbatim live-repo probe at HEAD `3a2a7ae`. The executor RE-RUNS this live at Stage 0
> (§5.3 anchor-probe) — APIs may drift; cite at assertion (Convention #8).

## 0. Preconditions (BLOCK gate) — DISCHARGED

| Precondition | Result |
|---|---|
| `common/common-3dgs/` + `docs/common/3dgs.md` | PRESENT |
| `tools/testkit/render_similarity/metrics.py` | PRESENT (package; direct import) |
| `packages/mpm-multimaterial-stack-e/` (Phase-2 MPM) | PRESENT |
| common-3dgs renders **CPU-only** (no CUDA) | YES — `render()` → `wp.launch(..., device="cpu")` unconditionally; `test-common-3dgs` green on `ubuntu-latest` |
| `preflight-phase.py 3` | exit 0 (8/8 PASS) |

**No feasibility BLOCK.** CPU-render viable at CI scale (36 Gaussians @ 32²–128²).

## 1. common-3dgs public API (verbatim) — SHIFTs the plan's names

`common/common-3dgs/src/common_3dgs/__init__.py:13-26` exports exactly: `Camera`,
`GaussianSplatModel`, `render`, `save_png`.

- **`GaussianSplatModel`** (`common/common-3dgs/src/common_3dgs/model.py:57-184`) — NOT `GaussianSet`.
  `__init__(positions, scales, rotations, opacities, sh_coefficients, *, device="cpu")`;
  `@classmethod load_ply(path, *, device="cpu") -> GaussianSplatModel` (`:107`);
  `save_ply(path)` (`:135`); props `num_gaussians`, `sh_degree`, `to_numpy()`.
- **`render(model, camera, *, image_height=None, image_width=None, background=(0,0,0)) ->
  np.ndarray`** (`common/common-3dgs/src/common_3dgs/render.py:116-225`) — NOT `forward_splat`. Returns `(H,W,3) float32` in
  `[0,1]`. Launches `wp.launch(..., device="cpu")` (`:203`).
- **`Camera`** (`common/common-3dgs/src/common_3dgs/camera.py:40-136`) — `__init__(view_matrix, projection_matrix, *, near, far,
  image_height, image_width)`; `@classmethod look_at(position, target, up=(0,1,0), *, fov_y,
  image_height, image_width, near=0.01, far=100.0)`.
- **`save_png(image, path) -> Path`** (`common/common-3dgs/src/common_3dgs/image_io.py:19`).

**Gaussian geometry** (`common/common-3dgs/src/common_3dgs/model.py:9-25`): `positions (N,3) f32`, `scales (N,3) f32`,
`rotations (N,4) f32` unit-quaternion **wxyz**, `opacities (N,) f32`, `sh_coefficients
(N,K,3) f32` (`K=(deg+1)²`). Warp-backed (`positions`→`wp.vec3`, etc.).

**Determinism:** `tools/testkit/determinism/registry.toml:49-60` `[neural-rendered.common-3dgs]`
= **`bit-exact` / `same-stack-same-hw`**, `atomic_ops="none"`, `subgroup_ops="none"`,
`seed_pinned=true`. `docs/common/3dgs.md:69-82`: "render() twice on identical inputs →
byte-identical (max_abs_diff=0.0, identical sha256) … no atomic scatter … serial wp.launch."
⇒ golden-render gate is a **tight deterministic regression** (charter §6 D-RENDER-DET).

## 2. render_similarity public API (verbatim)

`tools/testkit/render_similarity/__init__.py:20`:
`from .metrics import lpips, ms_ssim, psnr, ssim`. SHIFT: package at
`tools/testkit/render_similarity/`, NOT `tools/testkit/equivalence/render_similarity.py`.

- `psnr(image_a, image_b) -> float` (`tools/testkit/render_similarity/metrics.py:182`; `inf` for identical).
- `ssim(image_a, image_b) -> float` (`:208`; `1.0` identical).
- `lpips(image_a, image_b, net: Literal["alex","vgg"]="alex") -> float` (`:231`; `0` identical).
- `ms_ssim(...) -> float` (`:279`) raises `NotImplementedError` (Phase-4 WU-C).

NCA consumed via direct import: `from render_similarity import lpips, psnr, ssim`
(`packages/neural-ca/python/tests/test_cross_stack_equivalence.py:25`, call sites `:63-65`).

## 3. Phase-2 MPM consumption (verbatim) — `packages/mpm-multimaterial-stack-e/`

SHIFT from plan's `hybrid-pg/mpm-multimaterial/python-warp/`.

- **Particle state** (`packages/mpm-multimaterial-stack-e/mpm_multimaterial_stack_e/sim.py:124-246`): `pos/vel (N,3) f64`,
  **`F (N,3,3) f64`** (deformation gradient — the coupling input), `affine_c (N,3,3) f64`
  (APIC), `mass (N,) f64`, `material_id (N,) i32`, `stress (N,3,3) f64`, `volume_p (N,) f64`.
- **Step (no monolithic `step()`)** — sequence of kernels (`reference/mls_mpm_warp.py`):
  `compute_particle_stresses → p2g_with_stress → grid_update → g2p → deformation_update →
  advect_particles` (`packages/mpm-multimaterial-stack-e/mpm_multimaterial_stack_e/sim.py:268-282`). Read per-particle `F` after `deformation_update`.
- **Determinism** (`packages/mpm-multimaterial-stack-e/mpm_multimaterial_stack_e/sim.py:213-217`, `:1-42`): `claimed="bit-exact-same-hw"`,
  `atomic_ops=True` (serialized via CPU serial `wp.launch`), `subgroup_ops=False`.
- **Capture**: `common_warp.write_capture`, `schema_version="1.0.0"`, keys via
  `state_key(step,name)` / `diagnostics_key(step,check)`, `.h5`.

## 4. common-warp (Stack-E substrate, verbatim)

`common/common-warp/src/common_warp/__init__.py`: `from .capture import Capture,
read_capture, write_capture`; runtime `init(device=None, deterministic=False)`
(`common/common-warp/src/common_warp/runtime.py:56`). `Capture(manifest, payload)` dataclass; `write_capture(capture, path, *,
schema_version="1.0.0")`. Rigid-body (`packages/articulated-pedagogical/articulated_pedagogical/sim.py:103-125`)
and pinn-poisson (`packages/pinn-poisson/pinn_poisson/infer.py:126-151`) consumption patterns:
`common_warp.init("cpu", deterministic=True)` → build `payload` via `state_key`/`diagnostics_key`
→ `Capture(manifest, payload)` → `write_capture(...)`.

## 5. PhysGaussian (web-verified) — cite-only, NO source vendoring

`gh api repos/XPandora/PhysGaussian`: `license=null`, **no LICENSE file** in root tree;
default-branch HEAD SHA **`8339ed6aa2cd5d50e1001a254a3d95aea678a956`** (matches plan §2.18
`:274`); security-advisories empty. ⇒ all-rights-reserved → **cite-only; do NOT vendor
source** (charter §6 D-VENDOR-ROLE/SHA; SHIFT of plan §6.8-F).

**Coupling equations (CVPR'24 paper p.4392-4393), correcting plan's "Eq. (8)-(10)":**
- **Eq. (7)** — deformed kernel is Gaussian with covariance `F_p A_p F_pᵀ` (i.e. `Σ'=F A Fᵀ`).
- **Eq. (8)** — `x_p(t)=φ(X_p,t)` (center) and `a_p(t)=F_p A_p F_pᵀ` (covariance). MVP core.
- **Eq. (9)** — polar decomposition `F_p=R_p S_p`; SH rotation `f¹(d)=f⁰(Rᵀd)` (the STRETCH).
- **Eq. (10)** — alternative incremental rate-form `aⁿ⁺¹=aⁿ+Δt(∇v·a+a·∇vᵀ)` (NOT F-direct MVP).

Kerbl 2023 3DGS (base rasterizer / alpha-compositing) is **owned by common-3dgs (task-1)** —
already implemented + cited there; the coupling charter's Cat-1 anchors are PhysGaussian
Eq.(7)-(9) + Stomakhin 2013 (MPM). The Kerbl compositing equation number was not byte-
confirmed here (PDF > fetch limit); not load-bearing for the coupling golden — the executor
verifies it at derivation time if the spec-ref cites it.

## 6. Routing summary

Both hard deps present + CPU-render feasible → **NO BLOCK**. All SHIFTs (API names, paths,
layout, CI workflow, eq numbers, vendoring posture, below-floor semantics) documented in
charter §1.3 + §6. Single-stack → 13 gates, NO gate-14; render-similarity = gate-4 Cat-3
golden (deterministic, MUST clear §2.12 floors).

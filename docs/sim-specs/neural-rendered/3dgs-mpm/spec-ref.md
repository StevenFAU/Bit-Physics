# 3DGS-MPM — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. Phase 3 task-8 deliverable A
> per `docs/phases/phase-3-plan.md` § 6.8 + the charter
> `docs/phases/sub-phase-phase-3-3dgs-mpm.md`. **FIRST neural-rendered-CATEGORY sim** and
> the **Phase-3 FINALE**.
>
> **Stage 0 posture:** SKELETON with `TODO(Stage-1b)` markers where values are MEASURED
> (render-similarity bounds, end-to-end determinism class, perf wall-clock + CPU memory).
> § 6 (verification posture + PBT invariants) is FULLY DECLARED at Stage 0/1a per spec
> § 2.14 — the failing TDD tests need the invariant declarations to exist.
>
> **§0.3 SHIFTs (plan § 6.8; documented here, no plan edit — charter § 1.3):** layout
> `packages/3dgs-mpm/` (flat, not `neural-rendered/3dgs-mpm/python/`); API
> `GaussianSplatModel`/`render` (not `GaussianSet`/`forward_splat`); render-similarity
> package import `from render_similarity import psnr, ssim, lpips` (not
> `tools/testkit/equivalence/render_similarity.py`); MPM at
> `packages/mpm-multimaterial-stack-e/` (not `hybrid-pg/.../python-warp/`); CI
> `python-strict.yml` (`test-3dgs-mpm`, not `build-py.yml`); coupling eq numbers **Eq. (8)**
> (covariance+center) + **Eq. (9)** (SH-rotation stretch), NOT "Eq. (8)-(10)"; PhysGaussian
> **cite-only, NO source vendored** (no LICENSE → all-rights-reserved); below-floor
> render-similarity = **STOP-RENDER-FLOOR-to-investigate**, NOT a quality-flag close.

## 1. Scope

**PhysGaussian-style MPM→3DGS coupling** on **Stack E (NVIDIA Warp + Python)**, single-stack.
The Phase-2 MPM solver (`packages/mpm-multimaterial-stack-e/`) is **CONSUMED** (stepped via
its modular kernel sequence); the **NOVEL** work is the sim-local `coupling.py`: per frame,
step MPM → read per-particle deformation gradient `F (N,3,3) f64` → update each Gaussian's
covariance/scale/rotation via `Σ' = F·A·Fᵀ` (PhysGaussian Eq. (8)) → render via common-3dgs.

**MVP (must-ship):** MPM drives Gaussian centers (translation, from particle positions) +
def-grad `F` → Gaussian scale/rotation; **SH coefficients FROZEN** at scene-load values.
**Stretch (ship if straightforward):** per-frame SH-coefficient rotation under deformation
(Eq. (9) polar decomposition `F = R·S`, `f^t(d)=f^0(Rᵀd)`); deferred to Phase-4
`3dgs-mpm-sh-update` if > ~3 days or test-stability issues (charter § D-SCOPE-MVP/STRETCH).

**CPU-only scope (scope honesty).** This environment has **no CUDA driver**, so the "Stack E"
sim runs **entirely on CPU** (Warp-CPU serial `wp.launch`). The GPU-Warp path is
**unexercised** here. "Stack E: PASS" means the CPU substrate + MPM-step→coupling→render
pipeline + capture are verified — NOT a claim that GPU Warp is verified (same discipline as
pinn-poisson / neural-ca scope notes). The § 6.8 "GPU memory peak" perf note is moot → record
**CPU memory** (charter § 8).

## 2. Upstream and reference anchor

- **PhysGaussian** (Xie, Zong, Qiu et al., CVPR 2024; arXiv:2311.12198) — first major
  MPM-3DGS integration. **CITE-ONLY** (no LICENSE upstream → all-rights-reserved; SHA
  `8339ed6aa2cd5d50e1001a254a3d95aea678a956`). NO source vendored;
  `references/PhysGaussian/MANIFEST.toml` is a cite-only pointer (`source_vendored=false`).
  The coupling is reimplemented from the paper's published equations (facts) + first
  principles (spec § 2.4 independent-derivation). See A-7 (`docs/spec-amendments-proposed.md`):
  spec § 2.18 License "MIT" is WRONG → NONE/cite-only.
- **Inria 3D-Gaussian-Splatting** (Kerbl et al. 2023) — the base rasterizer / alpha
  compositing is **owned by common-3dgs (task-1)**, derived independently from
  `references/3DGS-reference/` (NON-COMMERCIAL research license; clause inherited by this
  sub-phase per its MANIFEST `used_by_sims`). 3dgs-mpm depends on common-3dgs's reimplemented
  renderer, NOT on the Inria reference for redistribution.
- **Stomakhin et al. 2013 / Hu et al. 2018 (MLS-MPM)** — the MPM substrate (owned by the
  Phase-2 `mpm-multimaterial-stack-e` sim; cited there).

## 3. Algorithm

### 3.1 Canonical scene (D-SCENE: small synthetic)

A **small synthetic 3DGS object** of **256 Gaussians** (`gs_mpm.scene.build_canonical_scene`,
`seed=0`), NOT a vendored photorealistic Inria scene (CPU tractability + render determinism +
LFS-lightness). Generator: 256 points sampled **uniformly inside a sphere** (centre
`(0.5, 0.5, 0.65)`, radius `0.15`; direction = normalized `standard_normal`, radius =
`0.15·∛U`) under `np.random.default_rng(0)`; per-Gaussian `scale = 0.025` (isotropic),
`rotation = identity quat`, `opacity = 0.9`, **SH degree 0** (`K=1`, DC term coloured by
normalized position → deterministic spatial structure; FROZEN in MVP). Each Gaussian is bound
**1:1** to an MPM particle at the same position. The blob is dropped (initial `v_z = −2`,
gravity `−9.81`) onto a sticky floor (`floor_z_index = 4`) on a `32³` MPM grid at `dt = 1e-3`
for `300` steps, captured every `100` (frames `0, 100, 200, 300`) — the blob impacts the
floor (~step 200) and visibly deforms (`det(F)` dips to `0.08` then relaxes; always `> 0`).

### 3.2 Per-frame coupling loop

```
for step in 1..N:
    # --- MPM step (consumed kernel sequence; NO monolithic step()) ---
    compute_particle_stresses(F, material_id, MU, LAMBDA, stress)
    grid_mass.fill(0); grid_mom.fill(0)
    p2g_with_stress(pos, vel, mass, affine_c, stress, volume_p, grid_mass, grid_mom, grid_dx, dt)
    grid_update(grid_mass, grid_mom, GRAVITY_Z, dt, FLOOR_Z_INDEX)
    g2p(pos, vel_new, affine_c_new, grid_mom, grid_mass, grid_dx)
    vel = vel_new; affine_c = affine_c_new
    deformation_update(F, affine_c, dt)         # F ← (I + dt·C)·F
    advect_particles(pos, vel, dt, grid_n, grid_dx)
    # --- coupling (NOVEL, sim-local) ---
    centers' = pos                              # Gaussian centers ← particle positions
    for each Gaussian g bound to particle p:
        A = R·diag(s²)·Rᵀ                       # reconstruct covariance from (scale, quat)
        Σ' = F_p · A · F_pᵀ                      # PhysGaussian Eq. (8)
        (scale', quat') = extract(Σ')           # symmetric eigendecomposition → quaternion
        # SH FROZEN in MVP; (stretch) rotate SH by R from polar decomp F=R·S (Eq. (9))
    render(model', camera, ...) → frame
```

**Binding:** 1:1 (Gaussian `i` ↔ MPM particle `i`); centers ← particle positions each frame;
scale/rotation ← `couple_gaussians(rest_scales, rest_quats, F)` applied to the **rest**
covariance. **Camera:** `Camera.look_at(eye=(0.5,0.5,−1.0), target=(0.5,0.5,0.65),
fov_y=0.8, 96×96)` — looks down +Z at the blob, up=+Y (non-degenerate); black background.

### 3.2.6 CLI

`python -m gs_mpm run --out <dir> [--seed N]` runs the canonical schedule and writes
`<dir>/3dgs-mpm.{h5,json}` (capture, MPM + Gaussian state) + `<dir>/3dgs-mpm-canonical-frame-
{0,100,200,300}.png` (rendered frames).

## 4. Algebraic form (coupling-correctness core)

common-3dgs stores per-Gaussian `scales (N,3)` + `rotations (N,4)` quaternion (wxyz), NOT a
raw covariance. The coupling therefore round-trips:

1. **Reconstruct** `A = R(q)·diag(s²)·R(q)ᵀ` (3×3 SPD), `R(q)` the quaternion→rotation matrix
   (the same `Σ = R diag(s²) Rᵀ` common-3dgs's `render()` builds internally).
2. **Transform** `Σ' = F·A·Fᵀ` — **PhysGaussian Eq. (8)**, `a_p(t) = F_p A_p F_pᵀ`
   (re-verified verbatim from arXiv:2311.12198v3 § 3.4 at Stage 0, Convention #8).
3. **Re-extract** `(scale', quat')` from `Σ'` by **symmetric eigendecomposition**
   `Σ' = U diag(λ) Uᵀ` (λ ≥ 0 SPD) → `scale' = √λ`, `quat' ← U` (orthonormal eigenvectors,
   sign/handedness fixed for determinism).

**Anchors (≥3 independent; charter § D-ANCHOR-COUPLING):**
- **Anchor 1 — Eq. (8) covariance transform** `Σ' = F·A·Fᵀ` (+ center `x_p(t)=φ(X_p,t)`).
  Cite paper § 3.4 / Eq. (8); cross-check vs the PhysGaussian repo lines (transient clone, NOT
  committed; cite repo lines per Convention #8 at derivation).
- **Anchor 2 — hand-derived polar decomposition `F = R·S`** on a single Gaussian. **§2.4
  caveat (load-bearing): Anchor 2 is independent of PhysGaussian's *implementation* but cites
  the same *theory*** (Eq. (9) uses the same polar decomposition) — NOT a fully-independent
  reference. Flagged here + in the golden-table provenance.
- **Anchor 3 — trivial case `F = I`**: `Σ' = Σ`, scale/rotation unchanged. Fully independent.

`TODO(Stage-1b): per-anchor numeric values → tools/testkit/golden/tables/3dgs-mpm-coupling.json
+ a poisson-style derivation doc citing the verified PhysGaussian eq numbers.`

## 5. Implementation

`packages/3dgs-mpm/` (flat). `coupling.py` SIM-LOCAL (NOT promoted to common-3dgs; rule-of-three
unmet — Phase-4 WU-C promotes). Consumes: `common_3dgs.{GaussianSplatModel, render, Camera,
save_png}`; `mpm_multimaterial_stack_e.reference.mls_mpm_warp.{compute_particle_stresses,
p2g_with_stress, grid_update, g2p, deformation_update, advect_particles}`;
`common_warp.{Capture, write_capture}`; `render_similarity.{psnr, ssim, lpips}` (tests).
`# mypy: ignore-errors` scoped to Warp-touching files (F-RB-3).

## 6. Verification posture (TWO-PRONGED; ≥2 PBT invariants per spec § 2.14)

**Prong 1 — NUMERICAL coupling-correctness golden (gate-4 Cat-3):** the `F → (scale, quat)`
transform round-trip, ≥3 anchors (§ 4), bit-exact-or-epsilon `golden_tolerance`
(`[golden_tolerance.neural-rendered.3dgs-mpm]`).

**Prong 2 — PERCEPTUAL render-similarity golden (gate-4 Cat-3):** rendered canonical frames
vs the project's **OWN committed golden renders** via task-2's `psnr/ssim/lpips`
(`[render_similarity.neural-rendered.3dgs-mpm]`).

> **THE DETERMINISTIC-GOLDEN-RENDER BOUNDARY (load-bearing).** Prong 2 is a **DETERMINISTIC
> own-pipeline regression** (common-3dgs's rasterizer is bit-exact/same-hw: serial
> atomic-free CPU `wp.launch`). 3dgs-mpm is **single-stack with NO stochastic mask** → it
> **CANNOT** invoke a stochastic-RNG-divergence argument. Prong 2 **MUST clear** the § 2.12
> floors (PSNR ≥ 28 / SSIM ≥ 0.85 / LPIPS ≤ 0.15) — it should hit PSNR → ∞ (byte-identical)
> vs its own goldens. A below-floor result is a **STOP-RENDER-FLOOR-to-investigate**
> (rasterization non-determinism or a coupling bug), **NOT** a quality-flag close.

The underlying MPM's own verification (its Tier-1/2 + golden) **still runs** (spec § 5.11) —
the coupling is verified *additionally*.

**PBT invariants (≥2; `tools/testkit/property/sims/3dgs-mpm/`):**
- `gaussian_count_invariant` — N Gaussians in == N out across the coupling (no
  creation/destruction).
- `def_grad_determinant_positive` — `det(F) > 0` (no inversion) over valid material/ICs.
  **Envelope-scoped** to physically-valid deformations; **re-declare the envelope on
  falsification, do NOT widen** (NCA/cloth precedent).

## 7. Capture schema (`.h5` + `.json`, schema_version 1.0.0)

`common_warp.write_capture(Capture(manifest, payload), path)`; payload keys via
`state_key(step, field)`. The capture records **BOTH** MPM particle state AND Gaussian-set
state:

| Field | Shape / dtype | Source |
|---|---|---|
| `particle_pos` | `(N_p, 3) f64` | MPM `pos` |
| `particle_vel` | `(N_p, 3) f64` | MPM `vel` |
| `particle_F` | `(N_p, 3, 3) f64` | MPM `F` (the coupling input) |
| `gaussian_positions` | `(N_g, 3) f32` | Gaussian centers (post-coupling) |
| `gaussian_scales` | `(N_g, 3) f32` | Gaussian scales (post-coupling) |
| `gaussian_rotations` | `(N_g, 4) f32` wxyz | Gaussian quaternions (post-coupling) |

manifest (capture-v1 schema): `schema_version="1.0.0"`;
`sim={category="neural-rendered", name="3dgs-mpm", variant="physgaussian-coupling"}`;
`stack={build_id="phase-3", name="warp-cpu", version="0.0.0"}`;
`config={dims=[32,32,32], dtype="f64", seed=0, tier="reference", params={n_gaussians,
n_particles, grid_n, dt, gravity_z, floor_z_index}}`; `run={capture_interval=100,
start_utc="2026-05-29T00:00:00Z" (FIXED for byte-reproducibility), step_count, wall_clock_
seconds=0.0}`; `payload={format="hdf5", path, checksum}` (path+checksum filled by the testkit
writer); `determinism={atomic_ops=false, claimed="bit-exact-same-hw", subgroup_ops=false}`.
The capture is byte-reproducible (two runs → identical `.h5` sha256). Appendix-D.2.3 descriptor
proposed at landing (§2 of the report).

## 8. Determinism

End-to-end registry row `[neural-rendered.3dgs-mpm]` (stack=E) **composes**: MPM
(`bit-exact-same-hw`, serial `wp.launch`) → coupling (deterministic numpy; eigendecomp
sign-fixed `w≥0`, det-`+1`) → render (`bit-exact / same-stack-same-hw`). **MEASURED at Stage
1b-2 (HELD):** two runs of `run_canonical_sim(seed=0)` are byte-identical across every frame
image AND `particle_F` / `gaussian_scales` / `gaussian_rotations` / `particle_pos`
(`np.array_equal` all True); the written capture `.h5` is byte-identical run-to-run (sha256
match). Class `bit-exact`, scope `same-stack-same-hw` — declaration HOLDS (no re-declaration).

## 9. Equivalence / render-similarity bounds

Single-stack ⇒ **NO gate-14** (no cross-stack pair). Prong 2 bounds locked to the § 2.12
floors and measured value recorded:

Measured at Stage 1b-3 across the 4 canonical frames (sim render vs the committed PNG
goldens), bounds LOCKED at the §2.12 floors:

| Metric | Bound (locked) | Measured (range over frames 0/100/200/300) | Margin |
|---|---|---|---|
| `psnr_min` | ≥ 28 | **59.94 – 63.80 dB** | ≥ +32 dB |
| `ssim_min` | ≥ 0.85 | **0.99973 – 0.99992** | ≥ +0.15 |
| `lpips_max` | ≤ 0.15 | **0.00001** | −0.15 |

> Bounds are AT-OR-ABOVE the floors (deterministic) — NOT NCA's below-floor (23/0.80/0.05)
> statistical row. The measured values clear the floors by a huge margin; the residual (PSNR
> ~60 dB rather than ∞) is **8-bit PNG quantization only** (the render is float32, the golden
> is a quantized PNG) — the render itself is byte-identical run-to-run (§8). This is the
> deterministic own-pipeline regression: a below-floor result would have been a
> STOP-RENDER-FLOOR (rasterization non-determinism / coupling bug); it is NOT (§ 6).

## 10. Diagnostics

Tier-1: NaN/Inf on positions/covariances; `det(F) > 0`. Tier-3 coupling diagnostic at
`tools/diagnostics/tier3/3dgs-mpm/`. `TODO(Stage-1c).`

## 11. Build and run

`uv run --directory packages/3dgs-mpm …`; CI `test-3dgs-mpm` in
`.github/workflows/python-strict.yml` (selective `git lfs pull` for committed captures +
goldens). Two-tier split decided at Stage 1c on measured cost (charter § D-CI).
`TODO(Stage-1c): final argv + CI shape + cost basis.`

## 12. References

PhysGaussian (Xie 2024, arXiv:2311.12198, cite-only) Eq. (8)/(9); Kerbl 2023 3DGS (via
common-3dgs); Stomakhin 2013 / Hu 2018 MLS-MPM (via mpm-multimaterial-stack-e).

## 13. Productization status

`coupling.py` SIM-LOCAL (promotion candidacy → Phase-4 WU-C). task-8 is TERMINAL on produce.
NO tag (D-TAG NO). `TODO(Stage-2): final reconciliation.`

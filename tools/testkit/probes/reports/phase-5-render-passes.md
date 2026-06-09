# Phase 5 render-passes — Pre-implementation probe

## Front matter

| | |
|---|---|
| Sub-phase | 5.4 — render-passes (Cycles hero shots) |
| Probe date | 2026-06-09 |
| Author | Phase 5 render-passes agent (Claude Code) |
| Method | MEASURED live at HEAD `bfa77dc` (#8); FACT = ran/read/measured, INFERENCE = reasoned |
| Scope | build-and-validate ONLY — deploy gated off (§ 4.5); renders committed, no publish, no tag (I7) |

## § 1 — Canonical-sim selection (§ 4.8 / § 6.4 criteria, R4-relaxed)

**MEASURED `render:true` pool** (`render:true` in spec-ref § 13, 14 sims): boids-3d,
physarum, mandelbulb-explorer, strange-attractors, lenia, neural-ca, reaction-diffusion-2d,
mpm-multimaterial, lattice-boltzmann-d3q19, ising-classical, pinn-poisson, 3dgs-mpm,
sph-water, articulated-pedagogical, **eulerian-smoke**.

**Committed 3D `.h5` capture** (the R4 conversion source; a volumetric render needs a 3D
grid) — **only `eulerian-smoke` qualifies** (MEASURED via `pipeline.py discover`): its
`captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.json` manifest declares
`config.dims = [128,128,128]`. Every other `render:true` sim has no committed 3D capture
(2D fields or none) → reported non-qualifying. This matches v9 R4: **5.4 canonical =
`eulerian-smoke`**.

| Criterion | eulerian-smoke |
|---|---|
| `render: true` § 13 | ✅ (`docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`) |
| committed `.h5` + h5→asset step | ✅ 705 MB 3D Taylor-Green (LFS, materialized); converter authored |
| committed 3D capture | ✅ dims [128,128,128] |
| published spec sheet | ✅ |
| volumetric visual interest | ✅ `sim_category: volumetric-grid` (smoke density) |

**§ 0.3 SHIFT — canonical capture size.** R4 called eulerian-smoke "4.4 MB CI-friendly";
the committed canonical (`sim_runner_seeded` → `taylor-green-128cube-seed42-step500.h5`)
is **705 MB** (the 4.2 MB figure is the *2D* `lid-driven-cavity` capture, not volumetric).
Used as-is (landed reality wins); only one step's density grid (≈16 MB) is read per render.

**§ 0.3 SHIFT — hero frame = step 0.** MEASURED: density std is 0.073 at step 0, then 0.0
(uniform 0.0307) for every step ≥ 50 — the passive scalar homogenises. Step 0 (the smoke
blob, bbox [37..90]³, centroid at cube centre) is the only structured frame; the
max-std step selector picks it deterministically.

## § 2 — Render toolchain (Contract; § 6.4 "Blender Docker pinned to digest")

**MEASURED env:** NO `blender`, NO `docker`, NO `podman` on PATH; no passwordless sudo
(can't apt/snap install). Network IS available. **§ 0.3 SHIFT — de-Docker'd toolchain**
(mirrors 5.2's `binary-cmake-linux`): pinned **portable Blender 4.5.10 LTS** tarball
(`blender-4.5.10-linux-x64.tar.xz`, sha256 `198a4248…b118f7`), downloaded + digest-verified
in `render-passes.yml`, located locally via `$BIT_PHYSICS_BLENDER`. Same pin guarantee, no
container runtime.

**MEASURED Blender capabilities** (bundled Python 3.11.11): `import openvdb` ✅ (FloatGrid +
**DoubleGrid**, `copyFromArray`/`copyToArray`, exact round-trip), `numpy` 1.26.4 ✅,
`bpy.ops.object.volume_import` ✅. The h5→VDB converter uses a **DoubleGrid** for a bit-exact
f64 asset round-trip. (`h5py` is NOT in Blender's Python → the h5 read happens in the uv
env via `convert.py`, then Blender builds the VDB from the `.npy`.)

## § 3 — Existing render workflows / docs/renders state

**MEASURED:** no `render-passes.yml` (non-clashing). `docs/renders/` did not exist (created).
`*.png` is plain-binary in `.gitattributes` (only `tools/testkit/golden/renders/**` is LFS),
so committed hero PNGs are regular git blobs — no R2/LFS routing for the render output.
`tools/testkit/render_similarity/` (Phase 3 task-2) exposes `psnr`/`ssim`/`ms_ssim` on numpy
RGB arrays (no CLI `__main__`; called via the API) — used for the § 5a quality gate.

## § 4 — MEASURED determinism (the real gate)

Two renders of the canonical VDB in the same Blender (CPU Cycles, seed 42, 128 samples,
512², denoise+adaptive OFF):

- **decoded pixel buffers BIT-IDENTICAL** (sha256 `3703e8e2…`), across two *independent*
  pipeline invocations (reproducible, not just same-process). PSNR = ∞ (sentinel), SSIM = 1.0.
- raw PNG file bytes **differ** (ancillary `eXIf`/`tEXt` chunks: timestamp, render-time) →
  the gate is on decoded pixels; `hero.png` re-encoded chunk-free (byte-stable sha256 `00d30f37…`).
- **asset-integrity** `.h5→.vdb` DoubleGrid round-trip: `max_abs = max_rel = 0.0`, bit-exact.

## § 5 — Wall-clock

Full gate (convert → VDB export + integrity → render ×2 → verify): **≈9.3 s** on
`i7-12700KF-linux-7.0` (CPU Cycles). Perf-ledger env label: `render-cycles-blender-4.5.10`.

## § 6 — Verdict

**CONFIRMED-with-SHIFTs.** One canonical sim qualifies (`eulerian-smoke`, per R4); the
de-Docker'd toolchain, the 705 MB canonical-capture size, and the step-0 hero frame are
landed-reality SHIFTs documented above. Determinism + asset-integrity gates both pass
honestly (bit-exact, not a widened tolerance). Bootstrap § 3.8 N/A (Appendix E).

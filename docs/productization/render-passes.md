# Productization — render-passes

> Phase 5 sub-phase 5.4. Build-and-validate a deterministic Cycles render for the
> canonical render sim. NO publish — the `deploy` job in `render-passes.yml` is
> gated off; renders are committed to `docs/renders/<sim>/`, not deployed.

## 1. Purpose

Turn a committed `.h5` canonical capture into a reproducible hero-shot render, and
verify the render the way a render artifact *can* be verified: by **determinism**
and **asset-integrity**, not by an analytic anchor. Phase 5 ships the pipeline plus
ONE canonical sim (`eulerian-smoke`, v9 R4); remaining sims are post-phase coverage
using the same pipeline.

**Bootstrap § 3.8 is N/A here** (Appendix E): a rendered image is a static artifact,
not a capture re-emitter, so there is no equivalence harness of rendered-image
against rendered-image. The render-similarity machinery (Phase 3 task-2) is used as
a *quality* gate (PSNR/SSIM), not a physical-correctness re-emit.

## 2. Pipeline shape

```
.h5 canonical capture
   │  convert.py (uv/h5py)            extract the structured density step → .npy + asset-meta
   ▼
field.npy
   │  blender/vdb_export.py (openvdb) .npy → OpenVDB DoubleGrid render asset (.vdb)
   ▼                                  + asset-integrity round-trip check (bit-exact)
render-asset.vdb
   │  blender/render.py (Cycles CPU)  render the canonical pass TWICE, fixed seed+samples
   ▼
run1.png, run2.png
   │  pipeline.py                     DETERMINISM gate + PSNR/SSIM quality gate
   ▼
hero.png + determinism-report.json + asset-integrity.json
```

The named § 6.4 Blender modules (`scene_setup`, `cycles_config`, `import_asset`,
`camera`, `lighting`, `render`, `presets/<category>`) decompose the render; `render.py`
is the entry Blender executes (`blender -b --factory-startup -noaudio -P render.py`).

## 3. The verification gate (NOT "it produced an image")

- **Determinism gate (the real one).** Render the same asset twice in the same pinned
  Blender; the **decoded pixel buffers must be BIT-IDENTICAL** (sha256 of the RGBA
  array). MEASURED for `eulerian-smoke`: Cycles CPU is pixel-deterministic on the same
  Blender / OS / seed / sample-count → the two runs match exactly (PSNR = ∞, SSIM = 1.0).
  - The PNG *container* is **not** byte-identical run-to-run: it carries ancillary
    chunks (`eXIf` timestamp, `tEXt` render-time) that vary. The gate is therefore on
    the **decoded pixel buffer**, not the file bytes — a MEASURED distinction, never a
    widened tolerance. The committed `hero.png` is re-encoded from the decoded pixels
    with those chunks stripped, so it is byte-stable across invocations.
  - If a renderer were non-deterministic in a way that defeats the byte-identical-pixel
    gate, the posture falls back to the render-similarity floor (PSNR ≥ 40 dB, SSIM ≥
    0.98) **measured-then-declared** — documented honestly, not papered over. This did
    NOT happen for `eulerian-smoke`.
- **Asset-integrity gate.** The `.h5 → .vdb` conversion uses an OpenVDB **DoubleGrid**
  (float64), so it round-trips the capture's density field **bit-exactly** (max_abs =
  max_rel = 0.0). Cycles casts to f32 at render time, but that is downstream of the
  asset and is covered by the determinism gate.

## 4. Qualifying sim criteria (§ 6.4, R4-relaxed)

All must hold (measured at probe time):

- `render: true` in the spec-ref § 13 productization block.
- A committed `.h5` canonical capture + the h5→render-asset conversion step *(R4: no
  Alembic/`.vdb`/`.usd` is committed anywhere; the `.h5` grid is the canonical asset)*.
- A committed **3D** capture (a volumetric render needs a 3D scalar grid).
- A published spec sheet.
- Volumetric / particle / mesh visual interest (not pure-shader closed-form).

`discover_qualifying_sims()` measures the `render:true` pool live and returns the
single R4 canonical (`eulerian-smoke`). Other `render:true` sims currently have no
committed 3D `.h5` capture and are reported non-qualifying (post-phase coverage).

## 5. Smoke test contract

`tools/productization/render-passes/smoke/test_pipeline.py` — fast, Blender-free:
discovery, structured-step selection (`convert`), the preset resolver, Blender
discovery error path, and the results-JSON schema. The heavy convert→render→verify
gate is gated behind `BIT_PHYSICS_RENDER_BOOTSTRAP=1` and run for real by the matrix
job. (The hyphenated tool dir is not scoped by `python-strict`; the smoke suite is
its gate, mirroring `pypi-release`.)

## 6. Failure modes / determinism boundary

- **GPU Cycles non-determinism** — OptiX/CUDA/HIP are not bit-reproducible across
  drivers; the gate pins `device = 'CPU'`. CI has no GPU regardless.
- **Denoising / adaptive sampling** — both are version/thread sensitive and would
  defeat the bit-exact gate; both pinned OFF.
- **PNG container metadata** — `eXIf`/`tEXt` chunks vary run-to-run; the gate compares
  decoded pixels, and `hero.png` is re-encoded chunk-free (§ 3).
- **Cross-runner-instance divergence on the same OS** — expected to remain within the
  PSNR > 40 dB / SSIM ≥ 0.98 floor; the in-job two-run gate is bit-exact because it is
  same-runner-same-Blender. **If two consecutive same-seed runs fall below the floor,
  that is a real Cycles/container non-determinism finding — document and surface; do
  NOT `SHIFTED-with-notes` silently.**

## 7. Go-live runbook (post-phase; operator)

1. Extend `discover_qualifying_sims()` coverage by committing a 3D `.h5` capture for
   each additional `render: true` sim (the pipeline is otherwise sim-agnostic).
2. To refresh committed renders, run the `render-passes.yml` `workflow_dispatch` with
   `confirm_deploy=true` (the otherwise-gated-off deploy job) and commit the output.
3. For cinematic-quality hero shots, evaluate Karma/Houdini per spec § 12.2 (excluded
   from Phase 5 per § 4.10).

## 8. Open issues / DEFERRED items (§ 0.3 SHIFTs)

- **Render toolchain — no Docker.** The plan names a "Blender Docker image pinned to
  digest"; this environment has no Docker (same landed reality as 5.2's de-Docker'd
  binary-cmake SHIFT). The toolchain is a **pinned portable Blender tarball, verified
  by sha256 digest** (`render-passes.yml` `env:`), giving the same pin guarantee with
  no container runtime. Perf-ledger env label: `render-cycles-blender-<version>`.
- **Canonical capture size.** R4 described `eulerian-smoke` as "4.4 MB CI-friendly",
  but the committed canonical capture (what `sim_runner_seeded` produces) is the
  **705 MB 3D Taylor-Green** (`taylor-green-128cube-seed42-step500.h5`); the 4.2 MB
  figure matches the *2D* lid-driven-cavity capture, which is not volumetric. The 3D
  capture is fetched via LFS (R2 when wired). Only one step's density grid (≈16 MB) is
  read for the render.
- **Hero frame = step 0.** The passive density scalar homogenises to a uniform field
  by step 50 (MEASURED: std → 0); step 0 (the smoke blob) is the only structured
  frame, so the structured-step selector picks it. Honest measure-then-declare.
- **Render preset coverage.** Only the `scalar-field` (volumetric density) preset is
  built/validated; `particle` / `vector-field` / `closed-form` raise a clear
  `NotImplementedError` (post-phase extension points; not fake-stubbed).

## 9. Extending coverage (post-phase contributor note)

Add a sim by (a) setting `render: true` in its spec-ref § 13, (b) committing a 3D
`.h5` capture under `captures/<sim>-ref/`, and (c) — if its category is not a scalar
field — adding a `blender/presets/<category>.py` module. No pipeline change otherwise.

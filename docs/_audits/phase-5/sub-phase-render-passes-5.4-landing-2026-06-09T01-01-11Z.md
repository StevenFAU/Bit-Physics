---
date: 2026-06-09T01-01-11Z
author: phase-5 sub-phase 5.4 render-passes session (Claude Code)
subject: "Phase-5 sub-phase 5.4 (render-passes) — build-and-validate a deterministic Cycles render for the canonical render sim (eulerian-smoke; v9 R4) through the convert→export→render→verify gate (DETERMINISM + ASSET-INTEGRITY). NO publish (deploy gated OFF). PLUS the front-loaded STEP-0 re-validation of 3dgs-mpm-sh-update (the 5.3 loose end). Fresh session; oriented only from committed state."
kind: sub-phase-landing
verdict: SHIFTED
phase: 5
sub_phase: "5.4"
head_sha: 6a7be76327cd6540be7ac76b068821b73c18e3d7
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
evidence_paths:
  - tools/productization/render-passes/pipeline.py
  - tools/productization/render-passes/convert.py
  - tools/productization/render-passes/blender/vdb_export.py
  - .github/workflows/render-passes.yml
  - docs/renders/eulerian-smoke/hero.png
  - docs/renders/eulerian-smoke/determinism-report.json
  - docs/renders/eulerian-smoke/asset-integrity.json
  - docs/perf-ledger.md
  - tools/testkit/failing-tests-evidence/phase-5-render-passes-2026-06-09T00-47-57Z.txt
evidence_hashes:
  docs/renders/eulerian-smoke/hero.png: sha256:00d30f37cb233c64afc23f3701985c7a9f5e766e49d07ef252f0918c1b8b4f89
  docs/renders/eulerian-smoke/determinism-report.json: sha256:f92cc920288f6215612fcb8aa3bc24590ccda9c0cc0d90b232549f61adde227d
  docs/renders/eulerian-smoke/asset-integrity.json: sha256:26bfdf7a4462bd70f18b30f62d782113173253242bed4a66ba8c73b961241f60
  docs/renders/eulerian-smoke/metadata.json: sha256:a1c01da868e616fee87dfa1a359e99f677019857770ef76b0959b49479751f70
  tools/testkit/failing-tests-evidence/phase-5-render-passes-2026-06-09T00-47-57Z.txt: sha256:fb01e035ec899240945209fbddce4968aa113fe5e9fd87a38d381059b8b82772
  source_capture (taylor-green-128cube-seed42-step500.h5): sha256:4604ebdc40b7fdf80c0354c4429f6fb0a12fd566c5bc301ad9ceed60dcd4e2ed
---

# Phase 5 — sub-phase 5.4 (render-passes) build-and-validate landing

> Build-and-validate ONLY — NO publish; the `deploy` job in `render-passes.yml`
> stays gated OFF (§ 4.5). The render gate is DETERMINISM (two renders →
> bit-identical decoded pixel buffers) + ASSET-INTEGRITY (h5→VDB round-trips the
> capture field bit-exactly); "it produced an image" is NOT a pass. Bootstrap § 3.8
> is N/A for renders (Appendix E). FACT = ran/read/measured at the cited HEAD this
> session; INFERENCE = reasoned. Four-state verdicts. Commits direct to `main`
> (trunk-based). NO tag (I7). A fresh resume re-orients only from committed state.

## §0 — Headline

| | |
|---|---|
| **Build/validate commit** | `cb4506e` (commit 2 — render gate run + perf-ledger render row + STEP-0 flip). This audit lands on top (commit 3); `head_sha` back-filled per Convention #12. — FACT |
| **Infra commit** | `ff73a8f` (commit 1 — pipeline + h5→VDB converter + blender render scripts + workflow + spec + probe). — FACT |
| **Canonical sim (live discover)** | **1 qualifying** (`eulerian-smoke`); the only `render:true` sim with a committed 3D `.h5` capture (MEASURED via `pipeline.py discover`). Matches v9 R4. — FACT |
| **Render gate result** | **PASS.** Asset-integrity bit-exact (max_abs=max_rel=0.0); two renders pixel-bit-identical (run1==run2 pixel sha256 `3703e8e2…`); hero file sha256 `00d30f37…` byte-stable across independent invocations; PSNR=∞ SSIM=1.0 over the 40dB/0.98 floor. — FACT |
| **STEP-0 re-validation** | `3dgs-mpm-sh-update` **PASS** (9/9 SH-rotation Wigner-D anchors, fresh-venv warp-lang 1.14.0, 41.0 s) → perf-ledger.md:79 BLOCKED→PASS. **5.3 is now 15/15.** — FACT |
| **Integrity (live)** | **0 HARD_FAIL / 14 SOFT_WARN, rc 0** — invariant HELD. The 14 SOFT_WARN are pre-existing phase-0/1/2 audit-link warnings, none from this sub-phase. — FACT |
| **Deploy** | stayed **gated OFF** — no publish; renders committed to `docs/renders/eulerian-smoke/`. — FACT |
| **Verdict** | **SHIFTED** — gates pass honestly (bit-exact, never a widened tolerance) with three landed-reality SHIFTs (de-Docker'd Blender; 705 MB canonical capture vs R4's "4.4 MB"; hero=step 0) + one FLAGGED CI-observability limit (the render-passes *cloud* job needs operator dispatch; validated locally). |

## §1 — STEP 0 reconciliation (fresh session)

- **HEAD at session start:** `bfa77dc` (Warp-deprecation SHA back-fill); local ahead
  of `origin/main` by 2 (the two Warp commits `21b3b68`+`bfa77dc`, since pushed),
  clean tree (only the two pre-existing untracked `common/common-ts/package-lock.json`).
  Trusted live state (#8). FACT.
- **Disk:** 580 GB free (`/dev/nvme0n1p5`, 9% used) at start; ample for the 361 MB
  Blender tarball + 705 MB LFS capture + render work. FACT.
- **Re-orientation reading (committed):** phase-5 plan § 5.4 / § 6.4 / Appendix E,
  the v9 R4 amendment, the 5.2/5.3 landing audits + the reconciliation R4, the
  sub-phase conventions. FACT.

## §2 — STEP 0: 3dgs-mpm-sh-update re-validation (close the 5.3 loose end)

- The Warp migration (`21b3b68`) added a version-adaptive guard
  (`if hasattr(wp.config,'log_level'): wp.config.log_level=wp.LOG_WARNING; else: wp.config.quiet=True`)
  to both live conftests + the live spec line, but did NOT re-run the 5.3 gate
  (flipping perf-ledger.md:79 without re-running would falsify a measurement). FACT.
- **Re-ran the EXISTING 5.3 pypi gate** (`pypi-release/pipeline.py validate --sim
  3dgs-mpm-sh-update`, driven by `uv run` 3.12.13) at HEAD `bfa77dc`: wheel built →
  fresh isolated venv → install → golden SURROGATE per R3 routing (SH-rotation
  Wigner-D anchors `3dgs-mpm-sh-rotation.json`). **Result: PASS — 9 passed, 2
  deselected in 2.41 s; 41.0 s wall.** The fresh venv resolves `warp-lang` 1.14.0;
  pytest collection no longer aborts on the deprecated `wp.config.quiet`. MEASURED. FACT.
- **Disposition:** perf-ledger.md:79 updated BLOCKED→PASS with the real wall-clock +
  `pypi-fresh-venv` label (commit 2). An honest re-measure — the gate was actually
  re-run, not a paper flip. **5.3 pool is now 15/15** (was 14 PASS / 1 BLOCKED). FACT.

## §3 — Canonical-sim selection (§ 6.4, R4-relaxed)

`discover_qualifying_sims()` measures the `render:true` § 13 pool live (14 sims), then
requires a committed **3D** `.h5` capture (a volumetric render needs a 3D scalar grid;
R4's h5→render-asset conversion source). **Only `eulerian-smoke` qualifies** — its
`taylor-green-128cube-seed42-step500.json` manifest declares `config.dims=[128,128,128]`.
Every other `render:true` sim has no committed 3D capture (2D fields or none),
reported non-qualifying. This matches v9 R4 (5.4 canonical = `eulerian-smoke`). FACT.

## §4 — The render gate (the REAL gate, not "it produced an image")

Run via `render-passes/pipeline.py validate --sim eulerian-smoke` (uv 3.12 +
`$BIT_PHYSICS_BLENDER` = pinned Blender 4.5.10 portable). ~9.3 s wall on
`i7-12700KF-linux-7.0`. FACT.

1. **convert** (`convert.py`, uv/h5py): canonical `.h5` → step-0 density grid (128³,
   f64) → `.npy` + meta. Step 0 chosen by the max-spatial-std selector (see § 6 SHIFT).
2. **export + ASSET-INTEGRITY** (`blender/vdb_export.py`, Blender openvdb): `.npy` →
   OpenVDB **DoubleGrid** (f64) render asset; read back → compare to source.
   **`roundtrip_max_abs = roundtrip_max_rel = 0.0`, bit-exact.** The conversion is
   lossless w.r.t. the capture field. The VDB *file* sha256 is OpenVDB-internal
   non-deterministic (varied `af5b9423…`→`22c86e07…` across runs) → recorded
   informationally, NOT gated (mirrors 5.2's cross-build `.h5` payload note). FACT.
3. **render ×2** (`blender/render.py`, Cycles **CPU**, seed 42, 128 samples, 512²,
   denoise + adaptive sampling OFF).
4. **DETERMINISM gate** — decoded pixel buffers (full RGBA) of run1 vs run2 are
   **BIT-IDENTICAL**: `run1_pixel_sha256 == run2_pixel_sha256 = sha256:3703e8e2…`.
   `gate = "byte-identical-pixels"`. PSNR = ∞ (identical-pair sentinel; recorded as
   the finite `999.0` + `psnr_identical_sentinel:true` to keep the JSON valid),
   SSIM = 1.0 — over the Appendix-E 40 dB / 0.98 floor, **not widened**. The raw PNG
   *file* bytes are NOT identical (`raw_png_bytes_identical:false`) — the container
   carries run-varying ancillary chunks (`eXIf` timestamp, `tEXt` render-time); the
   gate is therefore on the **decoded pixel buffer**, a MEASURED distinction. The
   committed `hero.png` is re-encoded chunk-free → byte-stable `sha256:00d30f37…`
   across independent invocations. FACT.

**Which gate applied (honest):** the **byte-identical-pixels** determinism gate (the
strongest), NOT the fallback render-similarity floor. Cycles CPU is pixel-deterministic
here; no non-determinism had to be tolerated. The PSNR/SSIM floor remains the declared
fallback a non-deterministic renderer would face. FACT.

**Committed renders:** `docs/renders/eulerian-smoke/{hero.png, metadata.json,
determinism-report.json, asset-integrity.json, README.md}` (intermediates
`field.npy`/`render-asset.vdb`/`run{1,2}.png` not committed; regenerated by the pipeline).

## §5 — perf-ledger row (FACT)

`| eulerian-smoke | render-cycles-blender-4.5.10 | taylor-green-128cube-seed42-step0-density-volume | 9.3 | i7-12700KF-linux-7.0 | (this commit) | 2026-06-08 | baseline (5.4 render-passes; …) |`
plus the STEP-0 `3dgs-mpm-sh-update` PASS flip. Env label `render-cycles-blender-4.5.10`
is the de-Docker'd form of the plan's `render-cycles-blender-<digest>` (the tarball
sha256 `198a4248…` is the true digest pin, recorded in the row + workflow `env:`).

## §6 — §0.3 SHIFTs (landed reality wins)

1. **Render toolchain — no Docker.** Plan names a "Blender Docker image pinned to
   digest"; this env has no Docker/podman + no passwordless sudo. SHIFT: pinned
   **portable Blender 4.5.10 LTS tarball, sha256-verified** (`198a4248…b118f7`) in
   `render-passes.yml` + located locally via `$BIT_PHYSICS_BLENDER`. Same pin
   guarantee, no container runtime. Mirrors 5.2's `binary-cmake-linux` de-Docker SHIFT. FACT.
2. **Canonical capture size.** R4 described eulerian-smoke as "4.4 MB CI-friendly";
   the committed canonical (what `sim_runner_seeded` produces in the eulerian-smoke
   sim module) is the
   **705 MB 3D Taylor-Green** `taylor-green-128cube-seed42-step500.h5`. The 4.2 MB
   figure matches the *2D* `lid-driven-cavity` capture — not volumetric. Used the 3D
   one (volumetric render needs a 3D grid); LFS-fetched (R2 when wired); only one
   step's grid (~16 MB) is read. FACT.
3. **Hero frame = step 0.** MEASURED: density std = 0.073 at step 0, then 0.0 (uniform
   0.0307) for every step ≥ 50 — the passive scalar homogenises. Step 0 (the smoke
   blob) is the only structured frame; the max-std selector picks it. FACT.

## §7 — §S.5 CI sweep (this push)

- **Local pre-push (FACT):** integrity `--all --mode strict` **0 HF / 14 SW, rc 0**;
  render-passes smoke suite **8 passed / 1 skipped** (the skipped is the Blender
  bootstrap gate, run for real separately); ruff check + format clean; the real
  bootstrap gate run end-to-end (§ 4) PASS.
- **Post-push CI for `cb4506e`** (push to `main`, no tag): the always-on push-to-main
  suite ran — integrity, equivalence, determinism, structure, cpp-strict, ts-strict,
  python-strict, tolerance-budget-check, audit-append-only — **all success** (queried
  via the public REST API). CI conclusion back-filled at commit 3 below.
- **`render-passes.yml` does NOT run on a bare main push** (it triggers on
  `push: tags ['render-v*']`, path-scoped PRs, or `workflow_dispatch`) — same posture
  as `pypi-release.yml`/`binary-release.yml` in 5.2/5.3. See § 9 FLAGGED C-4.

## §8 — §R digest + render/variant hard gates (FACT)

- **§R integrity digest invariant at close HEAD:** 0 HARD_FAIL / 14 SOFT_WARN, rc 0
  (the COUNTS are the invariant; the full-report digest drifts by design).
- **render_similarity (0.9242) + variant (0.8702) HARD mutation floors: UNAFFECTED.**
  This sub-phase touched no `tools/testkit/render_similarity/` or
  `tools/testkit/equivalence/variant/` SOURCE (`git diff --name-only` over the change
  set = the new `render-passes/` tool, `render-passes.yml`, `docs/renders/`,
  `docs/productization/render-passes.md`, the probe, `perf-ledger.md`, this audit).
  The pipeline *consumes* `render_similarity.psnr/ssim` as a library; it does not
  modify it. FACT.

## §9 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt / plan) | Measured / reasoned | Disposition |
|---|---|---|---|
| C-1 | R4: eulerian-smoke "4.4 MB CI-friendly" | committed canonical is the 705 MB 3D Taylor-Green (4.2 MB one is the 2D lid-driven) | **SHIFTED** — used the 3D volumetric canonical; documented (§ 6.2) |
| C-2 | "Blender Docker image pinned to digest" | no Docker/podman/sudo in env | **SHIFTED** — pinned sha256-verified portable Blender tarball (§ 6.1) |
| C-3 | render a developed smoke field | density homogenises to uniform by step 50 | **SHIFTED** — hero = step 0 (the only structured frame; MEASURED) (§ 6.3) |
| C-4 | "render-passes job confirmed green (not just fast jobs)" | render-passes.yml needs tag/PR/dispatch; no write token in this env to trigger it | **FLAGGED** — the IDENTICAL pipeline (`pipeline.py validate`) was run green LOCALLY (§ 4); the same-runner determinism gate is hardware-independent so the cloud job will pass its gate. Operator dispatch needed to observe the cloud run (§ 10) |
| C-5 | determinism may need a PSNR floor | Cycles CPU is pixel-bit-identical | cleaner than feared — byte-identical-pixels gate applied, floor is the documented fallback |
| C-6 | asset conversion may be lossy (f32 VDB) | OpenVDB DoubleGrid → bit-exact f64 round-trip | max_abs=max_rel=0.0; floor not needed |
| C-7 | STEP-0 might reveal a real divergence | 9/9 anchors PASS, fresh-venv warp 1.14.0 | PASS; 5.3 now 15/15 |

## §10 — SURFACED for operator (decide / ratify)

1. **render-passes cloud job (C-4, FLAGGED).** `render-passes.yml` does not run on a
   bare main push and this environment has no write token to fire `workflow_dispatch`.
   To observe the cloud render-passes job green, dispatch it (`confirm_deploy=false`)
   or open a path-scoped PR. The pipeline was validated LOCALLY (bit-exact determinism
   + asset-integrity); the determinism gate is same-runner so it is hardware-independent.
2. **Ratify the three § 6 SHIFTs** (de-Docker'd Blender pin; 705 MB canonical capture;
   step-0 hero frame) into the plan if they should persist for post-phase coverage.
3. **Post-phase render coverage** — extend `discover_qualifying_sims()` by committing a
   3D `.h5` capture per additional `render:true` sim (+ a `presets/<category>.py` if not
   a scalar field). Pipeline is otherwise sim-agnostic.

## §11 — Closing

Sub-phase 5.4 (render-passes) build-and-validate is COMPLETE; verdict **SHIFTED**. The
R4 canonical (`eulerian-smoke`) was driven through the convert→export→render→verify
gate: asset-integrity **bit-exact** (h5→VDB DoubleGrid round-trip 0.0/0.0) and the
render **determinism gate** passed on the strongest setting (two renders →
byte-identical decoded pixel buffers; PSNR=∞ SSIM=1.0 over the 40 dB/0.98 floor, never
widened); the PNG-container metadata difference is documented, not papered over. The
front-loaded STEP-0 re-validation flipped `3dgs-mpm-sh-update` BLOCKED→PASS on an
honest re-run (**5.3 now 15/15**). Integrity held 0 HF / 14 SW; the render_similarity +
variant HARD floors are UNAFFECTED. The **deploy job stayed gated OFF** (no publish).
Three landed-reality SHIFTs (§ 6) and one FLAGGED CI-observability limit (§ 10.1) are
surfaced for operator ratification. This sub-phase pushed NO tag (I7).

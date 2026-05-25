---
artifact: stage-0-checkpoint
artifact_id: sub-phase-common-cpp-bootstrap-stage-0
stage: stage-0
phase: 2
date: 2026-05-25T19-30-00Z
head_sha: d43d09847a5d6a7e68d7d026d6aed81b7447fcb4
head_sha_at_checkpoint: 134d7bee67c3deae3dfb3cae5b0ab88953fe0748
verdict: CONFIRMED — C-0 pre-flight GREEN; toolchain established; determinism baseline a7f85bd4…; Stage 1a dispatchable
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-evidence-vulkan-lavapipe-determinism-2026-05-25T19-30-00Z.md
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-integrity-sweep-2026-05-25T19-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-replay-2026-05-25T19-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-evidence/determinism-probe.comp
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-evidence/determinism-probe-host.cpp
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-evidence/build-run.sh
---

# Stage-0 checkpoint — `common-cpp-bootstrap` pre-flight (C-0)

**Verdict: CONFIRMED.** All charter § 2 Stage-0 tasks executed GREEN; the Vulkan/
lavapipe/SPIR-V toolchain is present on the dev environment (no install failure);
the C-stack determinism baseline digest is established and bit-identical; pre-flight
anchors (replay, integrity baseline, sha256 doc anchors, member count) all HELD. No
Hard-Rule-2 STOP condition triggered. **Stage 1a (Vulkan compute substrate) is
dispatchable.**

## § 0. Charter re-anchor (Convention M)

Charter §2/§4 row "Stage 0" read at HEAD `134d7be` before execution; this checkpoint's
scope matches it (toolchain + probes + determinism digest + §N scope-analysis). No
conflict between the dispatch framing and charter §2/§4 → no Hard-Rule-2 surface.

## § 1. Pre-flight anchor verifications (Task 0.0; Convention M; sha256-of-content per S-CPPB6)

| Anchor | Expected | Verified @ HEAD | Status |
|---|---|---|---|
| HEAD | `134d7be` | `git rev-parse HEAD` = `134d7bee…` | ✓ |
| conventions sha256 | `b0a0c241…` | `b0a0c241b797080dc58469775db346b2adc5561d7270a60d5a10052643e8445f` | ✓ |
| methodology sha256 | `48fca782…` | `48fca78275a312f5c062faba863faa4122b713d06f271a9d6b4adc7e7b79043f` | ✓ |
| architecture sha256 | `e82b7b8e…` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | ✓ (S-CPPB6: sha256, NOT git-blob `2aa8f227…`) |
| warp.md sha256 | `63b440d6…` | `63b440d607892998178037e8c54884c5c7c9f15ab52c30d6bf8f047a61374bf0` | ✓ |
| uv workspace members | 23 | tomllib count = 23 (CMake common-cpp NOT a member — D6) | ✓ |
| **Bit-identity replay** | `9399fc33…718909f34` | replay_prior_phase 8/8 PASS, `ok=True`, stdout sha256 = `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` | ✓ **HELD** |
| **Integrity baseline** | `c19492ad…d22cb52` (0 HF / 14 SW) | `integrity --all --mode strict` stdout sha256 = `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` | ✓ **HELD** (17th sub-phase streak; my plan-drafting commits added 0 HF / 0 new SW) |

## § 2. Toolchain establishment (Task 0.1 / 0.3)

Already present on this dev environment — **no install needed** (Mesa 25.2.8 / LLVM
20.1.2; loader 1.3.275; glslang 15.1.0; cmake 3.28.3; g++ 13.3.0; `vulkan.h`).
- **lavapipe (D4/D14):** `VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json` selects
  `llvmpipe (LLVM 20.1.2, 256 bits)`, `PHYSICAL_DEVICE_TYPE_CPU` — single device under
  the pin. **CI pin recipe (S-CPPB5 forward):** `apt install mesa-vulkan-drivers
  vulkan-tools libvulkan-dev glslang-tools` + `VK_DRIVER_FILES` + `LP_NUM_THREADS=0`.
- **SPIR-V (D9):** `glslangValidator` compiles GLSL→SPIR-V cleanly. `glslc` absent but
  not required (glslang is the toolchain; charter D9 lean confirmed).
- **HDF5:** ABSENT — `libhdf5-dev` + HighFive are a **Stage-1b prerequisite** (capture),
  NOT a Stage-0 blocker (the determinism baseline uses raw readback + sha256). Banked.

## § 3. shaderFloat64 probe (Task 0.2; S0-CPPB1) + FloatControls (Task 0.5; S0-CPPB2)

- **shaderFloat64 = true** on lavapipe (stable ×3) → **R-CPPB1 resolved favorably**;
  f64 available for future Stack-C ports. RD-2D stays f32-vs-f32.
- **FloatControls (f32):** RTE rounding = true, signed-zero/inf/nan preserve = true
  (both assertable, NumPy-match levers); **denorm preserve/FTZ both false** (denorm NOT
  pinnable — residual near-zero cross-stack risk; banked → quirks catalog).

Full detail: `stage-0-evidence-vulkan-lavapipe-determinism-2026-05-25T19-30-00Z.md`.

## § 4. Determinism baseline digest (Task 0.4; D13; C-0)

**`a7f85bd43e5cd9c64a0882584c4c73faa67901c261d937c6394bc3cce2844f05`** — sha256 of the
16384-byte readback from a minimal no-atomics element-wise compute dispatch on lavapipe.
**Bit-identical across 3 runs** (`LP_NUM_THREADS=0`) AND **across threading modes**
(LP=0 / LP=1 / default) — the W-2 `24d44c7e…` analog. The ephemeral probe source is in
`stage-0-evidence/` (NOT common-cpp; production substrate = Stage 1a). The
digest-method (D13) is documented in the evidence file; its conventions-§L codification
is BANKED for Stage 2 (Stage-0 boundary: no conventions/methodology edits).

## § 5. § N graduated canonical-descriptor scope-analysis (Task 0.6)

For a focused-infra bootstrap, § N maps to **what downstream canonicals + capture
surface common-cpp must support**, not a per-sim trajectory:

- **Immediate consumer (RD-2D-Stack-C, D11):** canonical
  `gray-scott-lambda-128sq-seed42-step2000` — 128² grid, **f32**, fields `u`/`v`, 2000
  steps, capture interval 200 → 11 frames. Per-frame payload = 2 × 128² × 4 B ≈ 128 KiB;
  full capture ≈ 11 × 128 KiB ≈ 1.4 MiB — **well under any storage ceiling**. Memory:
  two 128² f32 buffers ≈ 128 KiB device — trivial. The f32 reference means **no
  `shaderFloat64` dependency** for RD-2D (though lavapipe has it — § 3).
- **Capture-v1 layout target (S-CPPB3):** common-cpp's HighFive writer (Stage 1b) must
  replicate `tools/testkit/capture/writer.py`'s layout exactly — groups
  `/steps/{N}/state/{field}` + `/steps/{N}/diagnostics/{check}`, `/metadata` attrs
  (`schema_version`/`sim_name`/`sim_category`/`sim_variant`/`stack_name`/`seed`),
  determinism flags (`libver=earliest` + link-order-off + mtime-off), JSON sidecar
  (`sort_keys=True`, `payload.path`/`payload.checksum`). C-6 bar = **parse-equality**
  (testkit reader parses the C++ `.h5`), not `.h5` byte-equality.
- **Smoke (C-4) sizing:** a 2D advection-diffusion at ~64²–128² for a few hundred steps
  — bounded/decaying (§ L.4 S6-bootstrap analog); negligible storage/wall-clock.
- **Future Stack-C ports (banked, NOT this bootstrap's scope):** sph-water
  (`dam-break-100K-particles-…`, f64 → needs the shaderFloat64 path) + LBM + smoke
  Stack-C, if routed. The substrate is designed extensible (MVP headless compute) for
  these; f64-readiness confirmed (§ 3).

**Scope verdict:** the 6-stage decomposition (charter § 2) is correctly sized; no
canonical-descriptor mismatch surfaced (the RD-2D canonical is tiny). No § N STOP.

## § 6. C-Gates status (D10)

| Gate | Status |
|---|---|
| **C-0 Pre-flight** | **GREEN** — lavapipe selected + compute dispatch runs headless; determinism baseline established + bit-identical; shaderFloat64 probed; SPIR-V toolchain present; replay + integrity HELD. |
| C-1..C-7 | not yet — Stage 1a/1b/1c/2. |

## § 7. New observations banked (S0-CPPB*)

- **S0-CPPB1** — lavapipe `shaderFloat64 = true` (R-CPPB1 resolved favorably; f64 future-port-ready).
- **S0-CPPB2** — lavapipe FloatControls: RTE + signed-zero/inf/nan preserve assertable; **denorm NOT pinnable** (residual near-zero risk → quirks catalog).
- **S0-CPPB3** — determinism is **threading-invariant** for no-atomics element-wise kernels (LP=0/1/default identical) → quirks catalog Q-CPP4; `LP_NUM_THREADS=0` belt-and-suspenders.
- **S0-CPPB4** — `glslc` absent on this environment; `glslangValidator` is the SPIR-V toolchain (D9 confirmed; CI installs `glslang-tools`).
- **S0-CPPB5** — `libhdf5-dev` absent → Stage-1b prerequisite (install `libhdf5-dev` + FetchContent HighFive); not a Stage-0 blocker.

## § 8. Cumulative shifts

Stage 0 surfaced **0 new plan-vs-reality shifts** (the toolchain matched the charter's
assumptions; shaderFloat64 = true is a favorable resolution of an already-banked
risk R-CPPB1, recorded as observation S0-CPPB1 not a shift). **Cumulative shifts: 229
(unchanged) entering Stage 1a.** S0-CPPB1..5 are observations, banked for Stage 2 /
quirks catalog.

## § 9. Cleanup-banked carry-in (§ 13 form — NOT acted)

Carry-in unchanged from common-cpp-bootstrap plan-drafting § 8 + RD-2D-Stack-C § 8 +
LBM-E/smoke-E § 13: stray `taylor-green` captures (still untracked); methodology § 6
header + warp.md § 6.1 staleness; S0-LBME1; B-CPPB1 (S-RD2C2 sha-type false positive);
B-RD2C1 (dangling `_staging/deps.md`); missing CHANGELOG entries; D17. **NEW:** the
S0-CPPB observations above (quirks-catalog seed for Stage 2). STAY-BANKED.

## § 10. verify-self-check + next

- Additive-only (Convention A): new Stage-0 audit + evidence files; 0 source edits, 0 common-cpp extension, 0 conventions/methodology/tolerance edit. ✓
- Convention #8: FACT/INFERENCE tagged; toolchain probed at HEAD (not memory); sha256-of-content anchors (S-CPPB6). ✓
- Convention #12/N1: commit chain = evidence + checkpoint + sweep/replay txt + SHA back-fill (separate; never `--amend`). ✓
- Hard Rule 2: no STOP condition triggered (toolchain present; shaderFloat64 stable; lavapipe selected; replay/integrity HELD; members=23). ✓
- Terminal: NO push, NO tag. ✓

**Next:** operator dispatches **Stage 1a** — Vulkan compute substrate (instance/device/
compute-queue/command-buffers/descriptors/pipeline/SPIR-V/buffer-IO/sync) + SPIR-V
build-time toolchain wiring + top-level CMake registration (D6); gate C-3.

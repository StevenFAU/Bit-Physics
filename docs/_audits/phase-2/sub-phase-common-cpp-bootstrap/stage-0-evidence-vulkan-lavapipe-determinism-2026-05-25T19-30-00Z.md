---
artifact: stage-0-evidence
artifact_id: sub-phase-common-cpp-bootstrap-stage-0
stage: stage-0
phase: 2
date: 2026-05-25T19-30-00Z
head_sha: d43d09847a5d6a7e68d7d026d6aed81b7447fcb4
head_sha_at_checkpoint: 134d7bee67c3deae3dfb3cae5b0ab88953fe0748
verdict: C-stack determinism baseline digest ESTABLISHED — a7f85bd4…2844f05 (bit-identical ×3 + threading-invariant)
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-evidence/determinism-probe.comp
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-evidence/determinism-probe-host.cpp
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-0-evidence/build-run.sh
---

# Stage-0 evidence — Vulkan/lavapipe determinism baseline (the W-2 `24d44c7e…` analog)

The C-stack determinism anchor (charter § 2 Task 0.4; D13). A minimal **ephemeral**
headless Vulkan compute dispatch on Mesa lavapipe, run multiple times; the sha256 of
the readback buffer is bit-identical run-to-run. This is the C-stack analog of
common-warp-bootstrap's W-2 `24d44c7e…0746f314` CPU-determinism baseline. The probe
source is **ephemeral Stage-0 evidence** (`stage-0-evidence/`), NOT common-cpp source
(the production substrate lands at Stage 1a — § L.7 O-2 ephemeral→production chain).

## Toolchain (FACT — probed at HEAD `134d7be`, this dev environment)

| Component | Value |
|---|---|
| Vulkan loader | 1.3.275.0 (`libvulkan1` / `libvulkan-dev` 1.3.275.0-1build1) |
| Mesa / lavapipe | **25.2.8-0ubuntu0.24.04.1**, LLVM **20.1.2** |
| lavapipe device | `llvmpipe (LLVM 20.1.2, 256 bits)`, `PHYSICAL_DEVICE_TYPE_CPU`, apiVersion 1.4.318 |
| ICD select (D14) | `VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json` → single device |
| SPIR-V (D9) | `glslangValidator` (Glslang 15.1.0); `spirv-as` present; `glslc` absent (glslang suffices) |
| Build | `cmake` 3.28.3; `g++` 13.3.0; `vulkan.h` present |
| HDF5 | **ABSENT** (`libhdf5` not in ldconfig; `h5dump` absent) — Stage-1b prerequisite, NOT needed for Stage 0 |

## shaderFloat64 runtime-probe (Task 0.2; S0-CPPB1; resolves R-CPPB1)

`vkGetPhysicalDeviceFeatures().shaderFloat64` on lavapipe = **`true`** (also
`shaderInt64 = true`); **stable across 3 queries**. The plan-drafting research flagged
this as "undocumented on lavapipe → must runtime-probe" — the probe **resolves it
favorably**: f64 IS available on this lavapipe build, un-blocking future f64 Stack-C
ports (sph-water / LBM if Stack-C-targeted). RD-2D is f32 → **f32-vs-f32 remains the
contract for the immediate next port** regardless.

## FloatControls (Task 0.5; VkPhysicalDeviceFloatControlsProperties, f32)

| Property | lavapipe |
|---|---|
| `shaderRoundingModeRTEFloat32` | **true** (RTE assertable — matches NumPy default) |
| `shaderRoundingModeRTZFloat32` | false |
| `shaderSignedZeroInfNanPreserveFloat32` | **true** (assertable) |
| `shaderDenormPreserveFloat32` | **false** |
| `shaderDenormFlushToZeroFloat32` | **false** |
| `denormBehaviorIndependence` / `roundingModeIndependence` | `INDEPENDENCE_ALL` |

**Finding (S0-CPPB2 → quirks catalog):** RTE + signed-zero/inf/nan preserve are
assertable (good NumPy-match levers), but **denorm behavior is NOT pinnable** via
FloatControls on lavapipe (neither preserve nor FTZ advertised). For Gray-Scott's
near-zero quiescent regions this is a residual cross-stack risk — banked for the
Vulkan/C++ quirks catalog (Q-CPP denorm-not-pinnable) and for RD-2D-Stack-C's gate-14.

## GLSL→SPIR-V (Task 0.3)

`glslangValidator -V determinism-probe.comp -o probe.spv` → OK (1316-byte SPIR-V).
The element-wise kernel (`determinism-probe.comp`): for global index `i`,
`x = float(i)*0.01; out[i] = x*x*0.5 + x*0.25 + 0.125` — no atomics, no
cross-invocation reduction. N=4096 floats (16384 bytes). Sanity: `out[0]=0.125`
(`0x3e000000`), `out[1]≈0.12755` (`0x3e029c77`) — correct.

## Determinism baseline digest (Task 0.4; D13)

Run via `build-run.sh` (`VK_DRIVER_FILES=lavapipe`, `LP_NUM_THREADS=0`):

```
run 1: sha256(out) = a7f85bd43e5cd9c64a0882584c4c73faa67901c261d937c6394bc3cce2844f05
run 2: sha256(out) = a7f85bd43e5cd9c64a0882584c4c73faa67901c261d937c6394bc3cce2844f05
run 3: sha256(out) = a7f85bd43e5cd9c64a0882584c4c73faa67901c261d937c6394bc3cce2844f05
→ BIT-IDENTICAL across 3 runs ✓
```

**C-stack determinism baseline digest =
`a7f85bd43e5cd9c64a0882584c4c73faa67901c261d937c6394bc3cce2844f05`** (the W-2 analog).

**Threading-invariance (S0-CPPB3 → quirks catalog Q-CPP4):** the SAME digest holds for
`LP_NUM_THREADS=0`, `LP_NUM_THREADS=1`, AND default (multithreaded) lavapipe —
empirically confirming the plan-drafting reasoning that a **no-atomics element-wise
kernel is bit-identical regardless of thread count** (per-element FP is
order-independent). `LP_NUM_THREADS=0` is therefore belt-and-suspenders for
element-wise kernels; the determinism CONTRACT still prescribes it (D4) for safety and
for any future kernel with in-shader reductions.

## Determinism-baseline-digest METHOD (D13 — documented here; convention codification deferred to Stage 2)

Method: (1) compile a minimal no-atomics element-wise GLSL compute shader to SPIR-V;
(2) dispatch it headless on lavapipe with `VK_DRIVER_FILES` pinned + `LP_NUM_THREADS=0`;
(3) read back the output buffer; (4) sha256 the raw readback bytes; (5) repeat ≥2× and
assert bit-identity. The digest is valid only for a **fixed Mesa/LLVM build on the same
host** (R-CPPB2 — cross-build/cross-CPU FP not byte-guaranteed). Per the Stage-0
boundary (charter § 6 / dispatch), **conventions/methodology edits are Stage-2 scope** —
the §L-slot codification of this method is BANKED for Stage 2 (cross-refs
`[[integrity-baseline-digest-method]]` sha256-derivation hygiene + S-CPPB6 sha-type
discipline).

## Scope note

This is the ephemeral Stage-0 anchor. Stage 1a builds the PRODUCTION compute substrate;
Stage 1b's `assert_deterministic_run` reproduces a digest of this class at canonical
scale (§ L.7 O-2 four-checkpoint chain: ckpt-1 here → ckpt-2 Stage-1a → ckpt-3
Stage-1b; ckpt-4 gate-14 belongs to RD-2D-Stack-C, not this bootstrap).

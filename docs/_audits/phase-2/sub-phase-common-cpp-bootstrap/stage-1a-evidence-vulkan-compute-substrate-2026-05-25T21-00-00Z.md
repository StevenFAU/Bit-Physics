---
artifact: stage-1a-evidence
artifact_id: sub-phase-common-cpp-bootstrap-stage-1a
stage: stage-1a
phase: 2
date: 2026-05-25T21-00-00Z
head_sha: d116be4a03da673015cbc95d209167b4e838c786
head_sha_at_checkpoint: ff0866769cd0da2cb345698c7ece3cda7316bdb4
verdict: C-3 GREEN — Vulkan compute substrate operational headless on lavapipe; reproduces baseline a7f85bd4…2844f05; SPIR-V build-time wiring reproducible; top-level CMake registration (D6) operational
evidence_paths:
  - common/common-cpp/include/bit_physics/common/vulkan_compute.hpp
  - common/common-cpp/src/vulkan_compute.cpp
  - common/common-cpp/shaders/determinism_probe.comp
  - common/common-cpp/tests/test_vulkan_substrate.cpp
  - common/common-cpp/tests/sha256_util.hpp
  - common/common-cpp/CMakeLists.txt
  - CMakeLists.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1a-integrity-sweep-2026-05-25T21-00-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1a-replay-2026-05-25T21-00-00Z.txt
---

# Stage-1a evidence — Vulkan compute substrate (gate C-3)

The PRODUCTION Vulkan headless-compute substrate (`vkcompute::ComputeContext` /
`StorageBuffer` / `ComputePipeline` / `dispatch`), the durable analog of the
Stage-0 ephemeral probe (§ L.7 O-2 ephemeral→production chain, checkpoint-2).
All values FACT — measured at HEAD `ff08667` on this dev environment (Mesa
lavapipe 25.2.8 / LLVM 20.1.2; loader 1.3.275; glslang 15.1.0; cmake 3.28.3;
g++ 13.3.0), the same toolchain Stage-0 established.

## § 1. C-3 — substrate runs end-to-end headless on lavapipe

`ctest --test-dir build/cpp` → **2/2 pass** (`common_cpp_tests`,
`common_cpp_vulkan_tests`). The substrate test (`common_cpp_vulkan_tests`,
3 doctest cases / 6 assertions) exercises the full path:

instance → physical device (devs[0]) → compute queue family → logical device →
command pool → storage buffer (host-visible|host-coherent, mapped) →
descriptor set layout/pool/set → SPIR-V shader module → pipeline layout →
compute pipeline → bind → record command buffer → submit → fence wait →
readback. **Device selected:** `llvmpipe (LLVM 20.1.2, 256 bits)`,
`VK_PHYSICAL_DEVICE_TYPE_CPU` (= 4) — lavapipe under
`VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json` (D14). The CTest target
sets the lavapipe pin + `LP_NUM_THREADS=0` (D4) itself
(`set_tests_properties … ENVIRONMENT`).

## § 2. Hard-Rule-2 — substrate reproduces the Stage-0 determinism baseline

The substrate runs the SAME computation as the Stage-0 probe (N=4096 f32,
`determinism_probe.comp`: `data[i] = x*x*0.5 + x*0.25 + 0.125`, `x = i*0.01`,
zero-init, 64 workgroups of `local_size_x=64`) through the production API and
sha256s the 16384-byte readback:

```
sha256(readback) = a7f85bd43e5cd9c64a0882584c4c73faa67901c261d937c6394bc3cce2844f05
                 == Stage-0 baseline a7f85bd4…2844f05  ✓ (test asserts equality)
sanity: out[0] = 0.125, out[1] ≈ 0.12755  ✓
run-to-run (substrate-level): two dispatches → identical digest  ✓
```

The digest is computed in-test by a self-contained SHA-256 (`tests/sha256_util.hpp`,
test-only, NOT part of the common-cpp API) to honour the Stage-0 digest method
(sha256 of the raw readback) without a crypto-library dependency.

**Hard-Rule-2 substrate-determinism condition: NOT triggered** — the production
substrate is determinism-equivalent to the Stage-0 ephemeral probe.

## § 3. SPIR-V build-time wiring + reproducibility

CMake compiles `shaders/determinism_probe.comp` → SPIR-V at build time via
`glslangValidator -V … --vn kDeterminismProbeSpv -o …/determinism_probe.spv.h`
(embedded `const uint32_t[]` header; embed mechanism, no install-path
dependency). Reusable helper `bitphysics_embed_compute_shader()`.

**Reproducibility (Hard-Rule-2 SPIR-V condition):**
- two compiles of the same shader → **byte-identical** SPIR-V (1316 bytes;
  sha256 `96e726274acc9426082bbc8343fcec10d821ae87775db311731f2f53a1769163`).
- byte-identical to the Stage-0 ephemeral `determinism-probe.comp` SPIR-V
  (the production shader source carries extra comments only; glslang strips
  comments → same 1316-byte blob). **NOT triggered.**

## § 4. Top-level CMake registration (D6)

NEW top-level `CMakeLists.txt` (was absent) `add_subdirectory(common/common-cpp)`.
`common/common-cpp/CMakeLists.txt` matured: registers `bit_physics::common_cpp`
(core, capture+determinism, Vulkan-optional unchanged) + NEW
`bit_physics::common_cpp_vulkan` (compute substrate, gated on `Vulkan_FOUND`,
additive — does not regress the core lib's Vulkan-optionality). `cmake -S . -B
build/cpp && cmake --build build/cpp` → all targets build clean (no warnings
beyond the fetched doctest CMake-min-version deprecation). No non-common-cpp
C++ target exists to regress (Hard-Rule-2 cross-cutting-build condition: NOT
triggered). uv workspace members = **23** (D6 invariant; CMake ≠ uv member).

## § 5. shaderFloat64 enable (S0-CPPB1; Hard-Rule-2 condition)

`ComputeContext::create({.require_float64=true})` on lavapipe →
`float64_enabled=1`, no throw, device creation succeeds. S0-CPPB1 (shaderFloat64
= true) confirmed at the SUBSTRATE level. Default config leaves it **off**
(`require_float64=false`) — the bootstrap contract is f32-vs-f32 (charter § 1 /
R-CPPB1). **Hard-Rule-2 shaderFloat64-enable condition: NOT triggered.**

## § 6. FloatControls — scope reconciliation (charter § 2 vs dispatch framing)

The dispatch framed FloatControls assertion at pipeline creation as a Stage-1a
deliverable + Hard-Rule-2 STOP. **Charter § 2 at HEAD assigns "FloatControls /
NoContraction discipline" explicitly to Stage 1b** (row "Stage 1b"), and gate
C-3 (§ 3) is substrate-operational only — no FloatControls clause. Per
Convention M (HEAD charter wins) this is dispatch stage-scope drift (same class
as the smoke-E `[[smoke-stack-e-stage-decomposition-authority]]` pattern). It is
NOT load-bearing for the core 1a deliverables (substrate / SPIR-V wiring / CMake
registration / C-3), which match the charter exactly — so this is surfaced and
narrowed, not a whole-stage STOP.

Disposition: Stage 1a builds the substrate WITHOUT asserting FloatControls;
`ComputePipeline::Options::pipeline_pnext` is left as a documented additive
extension hook so 1b's FloatControls/NoContraction discipline lands without
restructuring. S0-CPPB2 already probed FloatControls assertable (RTE +
signed-zero/inf/nan preserve) at Stage 0; the *use* is 1b. **Banked → S1a-CPPB3.**

## § 7. Integrity + replay invariants (verified at HEAD ff08667)

- Integrity sweep `python -m integrity --all --mode strict` (report stream =
  stderr) → sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
  — **EXACT baseline-MATCH** (0 HARD_FAIL / 14 SOFT_WARN; streak held; the
  Stage-1a additive C++ + audits add 0 HF / 0 new SW). Capture:
  `stage-1a-integrity-sweep-2026-05-25T21-00-00Z.txt`.
- Bit-identity replay `replay_prior_phase --prior-phase phase-1 … --gates
  integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`
  → 8/8 PASS, `ok=True`, stdout sha256
  `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` —
  **HELD.** Capture: `stage-1a-replay-2026-05-25T21-00-00Z.txt`.

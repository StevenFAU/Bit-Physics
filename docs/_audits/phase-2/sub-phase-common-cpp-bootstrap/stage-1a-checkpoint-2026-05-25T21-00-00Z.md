---
artifact: stage-1a-checkpoint
artifact_id: sub-phase-common-cpp-bootstrap-stage-1a
stage: stage-1a
phase: 2
date: 2026-05-25T21-00-00Z
head_sha: <pending-stage-1a-checkpoint-commit-sha-backfill>
head_sha_at_checkpoint: ff0866769cd0da2cb345698c7ece3cda7316bdb4
verdict: CONFIRMED — C-3 GREEN; Vulkan compute substrate operational headless on lavapipe; reproduces baseline a7f85bd4…; SPIR-V build-time wiring reproducible; top-level CMake registration (D6) operational; integrity baseline-MATCH + replay HELD; Stage 1b dispatchable
evidence_paths:
  - common/common-cpp/include/bit_physics/common/vulkan_compute.hpp
  - common/common-cpp/src/vulkan_compute.cpp
  - common/common-cpp/shaders/determinism_probe.comp
  - common/common-cpp/tests/test_vulkan_substrate.cpp
  - common/common-cpp/tests/sha256_util.hpp
  - common/common-cpp/CMakeLists.txt
  - CMakeLists.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1a-evidence-vulkan-compute-substrate-2026-05-25T21-00-00Z.md
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1a-integrity-sweep-2026-05-25T21-00-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1a-replay-2026-05-25T21-00-00Z.txt
---

# Stage-1a checkpoint — `common-cpp-bootstrap` Vulkan compute substrate (C-3)

**Verdict: CONFIRMED.** The Phase-1-Stage-1 `common-cpp` scaffold
(declarations-only Vulkan) is transformed into a working headless **Vulkan
compute substrate** that runs end-to-end on Mesa lavapipe and reproduces the
Stage-0 determinism baseline digest `a7f85bd4…2844f05`. SPIR-V is compiled at
build time (glslang) reproducibly and embedded; the substrate is registered via
a NEW top-level CMake aggregation (D6). Integrity sweep is byte-identical
baseline-MATCH; the bit-identity replay invariant HELD. **No Hard-Rule-2 STOP
condition triggered. Stage 1b (determinism socket + HighFive HDF5 capture-v1)
is dispatchable.**

## § 0. Charter re-anchor (Convention M)

Charter §2 row "Stage 1a" + §3 C-3 + §4 touch-set read at HEAD `ff08667` before
edit. Core 1a deliverables match the dispatch framing exactly: Vulkan compute
substrate (instance/device/compute-queue/command-buffers/descriptors/pipeline/
SPIR-V module/buffer alloc-upload-readback/fence sync) + SPIR-V build-time
toolchain + top-level CMake registration (D6); gate C-3.

**One reconciled scope drift (surfaced, not a STOP):** the dispatch framed
FloatControls assertion at pipeline creation as a 1a deliverable + STOP
condition; **charter §2 assigns FloatControls/NoContraction discipline to Stage
1b**, and C-3 (§3) is substrate-operational only. Per Convention M the charter
wins → Stage 1a builds the substrate without asserting FloatControls (left as a
documented additive pipeline-creation extension hook for 1b). This is NOT
load-bearing for the core 1a deliverables, so it is narrowed in-stage rather
than escalated to a whole-stage Hard-Rule-2 STOP. Detail: evidence § 6;
banked S1a-CPPB3. (Same class as `[[smoke-stack-e-stage-decomposition-authority]]`
dispatch-vs-charter stage-scope drift.)

## § 1. Deliverables (charter §4 — additive, Convention A)

| Deliverable | File(s) | Status |
|---|---|---|
| Vulkan compute substrate (NEW) | `include/bit_physics/common/vulkan_compute.hpp` + `src/vulkan_compute.cpp` | ✓ `vkcompute::{ComputeContext,StorageBuffer,ComputePipeline,dispatch}` (RAII; move-only; VkResult→exception) |
| SPIR-V build-time wiring (NEW) | `shaders/determinism_probe.comp` + CMake `bitphysics_embed_compute_shader()` | ✓ glslang → embedded `uint32_t[]` header; reproducible |
| Mature CMakeLists | `common/common-cpp/CMakeLists.txt` | ✓ substrate lib `bit_physics::common_cpp_vulkan` + alias `bit_physics::common_cpp` + gated vulkan test |
| Top-level CMake registration (D6) | `CMakeLists.txt` (NEW; was absent) | ✓ `add_subdirectory(common/common-cpp)`; aggregates Stack-C surface |
| C-3 gate test (NEW) | `tests/test_vulkan_substrate.cpp` + `tests/sha256_util.hpp` | ✓ 3 cases / 6 assertions; reproduces a7f85bd4… |

## § 2. C-Gates status (D10)

| Gate | Status |
|---|---|
| **C-0 Pre-flight** | GREEN (Stage 0). |
| **C-3 Vulkan compute substrate** | **GREEN** — instance/device/compute-queue/pipeline/buffer-IO/dispatch/readback runs end-to-end headless on lavapipe (`llvmpipe`, CPU); `ctest` 2/2 pass; reproduces baseline a7f85bd4… (evidence §1/§2). |
| C-1, C-2 | not yet — Stage 1b (capture I/O + determinism socket). |
| C-4, C-5, C-6 | not yet — Stage 1c. |
| C-7 | not yet — Stage 2 landing. |

## § 3. Hard-Rule-2 STOP-condition sweep (all NOT triggered)

| Condition | Result |
|---|---|
| Charter §2/§4 conflicts with dispatch in a load-bearing way | NO — only the non-load-bearing FloatControls stage-scope drift (§0; narrowed per Convention M, core C-3 deliverables match). |
| Substrate fails to operate / reproduce baseline a7f85bd4… on lavapipe | NO — reproduces byte-for-byte (evidence §2). |
| SPIR-V build-time compilation non-reproducible | NO — byte-identical across compiles + to Stage-0 (evidence §3). |
| Top-level CMake registration breaks non-common-cpp targets | NO — no other C++ target exists; build clean (evidence §4). |
| shaderFloat64 enable fails at device creation | NO — enables cleanly (evidence §5; S0-CPPB1 confirmed at substrate). |
| FloatControls unavailable/unassertable at pipeline creation | N/A at 1a (charter scopes to 1b); S0-CPPB2 already probed assertable. |
| New HARD_FAIL / new SOFT_WARN beyond 14-baseline | NO — integrity EXACT baseline-MATCH (§4). |
| uv workspace member count ≠ 23 | NO — members = 23 (D6). |

## § 4. Invariants (verified at HEAD ff08667)

- **Integrity baseline:** `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
  — EXACT MATCH (0 HF / 14 SW). The Stage-1a additive C++ source + audits add
  0 HF / 0 new SW. (Report stream = stderr per
  `[[integrity-baseline-digest-method]]`.)
- **Bit-identity replay:** `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`
  — 8/8 PASS, `ok=True`, HELD.
- **uv workspace members:** 23 (D6 — common-cpp is CMake-registered, not a uv member).

## § 5. New observations banked (S1a-CPPB*)

- **S1a-CPPB1** — lavapipe host-visible|host-coherent memory is the device memory
  (CPU ICD): the bootstrap uses mappable storage buffers directly as SSBOs
  (zero-copy readback). A real-GPU backend would need device-local + staging —
  banked, out of bootstrap scope (R-CPPB5). → quirks-catalog seed (Stage 2).
- **S1a-CPPB2** — `glslangValidator --vn` emits a `#pragma once` C header with a
  `const uint32_t[]` SPIR-V blob; deterministic (byte-identical across compiles)
  → chosen embed mechanism (no install-path dependency). → quirks-catalog seed.
- **S1a-CPPB3** — FloatControls is a Stage-1b deliverable per charter §2 (NOT 1a);
  the dispatch framing put it in 1a (stage-scope drift, reconciled per Convention
  M; §0). The substrate exposes `ComputePipeline::Options::pipeline_pnext` as the
  additive hook for 1b. S0-CPPB2 levers (RTE + signed-zero/inf/nan preserve
  assertable; denorm NOT pinnable) carry forward to 1b unchanged.
- **S1a-CPPB4** — `clang-format`/`clang-tidy` are NOT mandated (charter §6:
  Convention #9 N/A for C++; adoption is a Stage-1a decision). **Decision:**
  not adopted this stage (keep scope lean); new C++ matches the existing
  common-cpp house style. Banked for a future tooling decision (D-class / Stage 2).

## § 6. Cumulative shifts

Stage 1a surfaced **0 new plan-vs-reality shifts** — the substrate, SPIR-V
wiring, and CMake registration matched the charter §2/§4 deliverables; the
FloatControls stage-scope item is a *dispatch-vs-charter* drift reconciled in
favour of the charter (recorded as observation S1a-CPPB3 + §0), not a
plan-vs-reality shift. **Cumulative shifts: 229 (unchanged) entering Stage 1b.**
S1a-CPPB1..4 are observations (quirks-catalog seed for Stage 2).

## § 7. Cleanup-banked carry-in (§ 13 form — NOT acted)

Carry-in unchanged from Stage-0 §9 + plan-drafting §8 + RD-2D-Stack-C §8 +
LBM-E/smoke-E §13: stray `taylor-green` captures (untracked); methodology §6
header + warp.md §6.1 staleness; S0-LBME1; B-CPPB1 (S-RD2C2 sha-type false
positive); B-RD2C1 (dangling `_staging/deps.md`); missing CHANGELOG entries; D17.
**NEW (Stage 1a):** S1a-CPPB1..4 (quirks-catalog seed for Stage 2); the
`clang-format`/`clang-tidy` adoption decision (S1a-CPPB4). STAY-BANKED.

## § 8. verify-self-check + next

- Additive-only (Convention A): NEW substrate source + shader + tests + top-level
  CMake; CMakeLists matured additively (core lib Vulkan-optionality preserved);
  0 edits to conventions/methodology/equivalence/tolerance/warp.md; 0 source
  regressions (existing `common_cpp_tests` still 2/2). ✓
- Convention #8: FACT-tagged; toolchain + digests measured at HEAD, not memory;
  sha256-of-content for the SPIR-V/readback/sweep digests (S-CPPB6). ✓
- Convention #12/N1: commit chain = substrate (COMMIT 1) + top-level CMake
  (COMMIT 2) + checkpoint+evidence (COMMIT 3) + SHA back-fill (COMMIT 4, separate,
  never `--amend`). ✓
- Hard Rule 2: full sweep §3 — no STOP triggered. ✓
- Terminal: NO push, NO tag (operator action per spec §7.12 + D12). ✓

**Next:** operator dispatches **Stage 1b** — determinism socket
(`assert_deterministic_run` + `DeterministicContext` RAII + FloatControls/
NoContraction discipline) + HighFive HDF5 capture-v1 writer/reader (requires
`libhdf5-dev` install — S0-CPPB5 prerequisite); gates C-1, C-2.

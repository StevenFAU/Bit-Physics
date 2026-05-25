# cpp — Stack C convention + `common-cpp` public API (Vulkan compute)

> **Document type:** Project convention (spec § 9.1 — Stack-C / language-level
> conventions; spec § 4.3 — Stack C / Vulkan; spec § 2.5 — determinism harness;
> spec § 2.7 — capture manifest).
> **Landed at:** sub-phase-common-cpp-bootstrap Stage 1c (the §1.9.1-cpp
> public-API socket bootstrap; matures the Phase-1-Stage-1 declarations-only
> scaffold into a consumable Stack-C surface).
> **Registration:** top-level `CMakeLists.txt` (`add_subdirectory(common/common-cpp)`)
> registers `bit_physics::common_cpp` — common-cpp is **CMake-registered, NOT a
> uv workspace member** (D6).
> **Verification surface:** `common/common-cpp/tests/` (doctest: core +
> Vulkan substrate C-3 + determinism socket C-2 + HDF5 capture C-1 + smoke C-4)
> + the cross-language interop check (C-6).
> **Sister conventions:** `docs/common/warp.md` (Stack-E; structural template
> for this doc), `docs/common/ts.md` (Stack-B), `docs/common/numba.md` (JIT).

## 1. Overview

Stack C is **C++20 + Vulkan compute** per spec § 4.3. `common/common-cpp/`
(`bit_physics::common_cpp`) is the minimal bootstrap module exposing the
substrate that Stack-C per-sim ports consume: a headless Vulkan compute
substrate, an execution-enforced determinism socket pinned to Mesa **lavapipe**,
and an HDF5 **capture-v1** writer/reader that round-trips with the Phase-0
testkit. It is **shipped, then wired**: at landing it is consumed only by its own
tests + the `advection_diffusion_2d` smoke; the forthcoming Stack-C sim ports
(RD-2D-Stack-C next, D11) import and use it (§ 7).

**Headless compute only.** The render/display surface (`vulkan_init.hpp`
swapchain / present / ImGui) stays declarations-only (§ 8); the export hooks
(VDB / Alembic / USD) stay `throw std::logic_error` stubs. This is not a
real-GPU certification — lavapipe (CPU software Vulkan) is the determinism
contract; a real-GPU backend is per-sim-port future scope.

## 2. Build + toolchain

```bash
cmake -S . -B build/cpp                 # top-level (registers common-cpp)
cmake --build build/cpp
VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json LP_NUM_THREADS=0 \
  ctest --test-dir build/cpp --output-on-failure
```

Requires (FACT — verified at Stage 0 / Stage 1b; re-verify upstream per
Convention #8):

- CMake `>= 3.28`; a C++20 compiler (tested GCC 13.3.0).
- **Vulkan loader** (`libvulkan-dev`) + **Mesa lavapipe** (`mesa-vulkan-drivers`;
  the CPU software-Vulkan ICD selected via `VK_DRIVER_FILES`) — for the compute
  substrate (`bit_physics::common_cpp_vulkan`).
- **glslang** (`glslang-tools`; `glslangValidator`) — compiles GLSL compute
  shaders to SPIR-V at build time, embedded as `const uint32_t[]` headers via a
  reusable `bitphysics_embed_compute_shader()` CMake helper.
- **libhdf5-dev** (1.10.x serial) — for the capture-v1 surface
  (`bit_physics::common_cpp_hdf5`). Header-only **HighFive** (v2.10.1,
  highfive-devs fork) is pulled via FetchContent.
- `nlohmann/json` v3.11.3 + `doctest` v2.4.11 via FetchContent.

The compute substrate + HDF5 capture targets are **gated** on `Vulkan_FOUND` /
`HDF5_FOUND`: the core lib (`bit_physics::common_cpp` — capture raw-binary +
determinism socket + hashing) builds without either, additively.

## 3. Public API surface (§1.9.1-cpp)

Stack-C ports include the umbrella header
`bit_physics/common/common_cpp.hpp` and code against these signatures — a
**socket**, reconciled to a verbatim contract at Stage 1c BEFORE the first
consumer (conventions § L.5, Option B). A missing surface is a charter §1.9.1
amendment, not a unilateral extension.

| Subsystem | Surface | Header |
|---|---|---|
| **1 Compute substrate** | `vkcompute::ComputeContext` (instance/device/compute-queue/command-pool; `query_float_controls`, `assert_deterministic_float_controls`), `StorageBuffer`, `ComputePipeline` (+ `Options::pipeline_pnext` hook), `dispatch(...)` | `vulkan_compute.hpp` |
| **2 Determinism** | `determinism::DeterministicContext` (RAII), `assert_deterministic_run`, `set_seed`, `get_seed`, `is_deterministic`, `Config`, `from_args` | `determinism.hpp` |
| **3 Capture I/O** | `capture::Hdf5Writer`, `Hdf5Reader` (capture-v1), `Writer`, `Reader` (raw-binary), `Manifest`, `StepData`, `FieldData`, `manifest_to_json`/`manifest_from_json` | `capture.hpp` |
| **4 Hashing** | `hash::sha256_hex` (determinism witness + capture payload checksum) | `hash.hpp` |
| **5 Smoke sim** | `smoke::run_advection_diffusion` — the canonical consumer (§ 6) | `smoke/advection_diffusion_2d.hpp` |

All under namespace `bit_physics::common_cpp::{vkcompute,determinism,capture,hash,smoke}`.

## 4. Determinism contract (D4)

(FACT — empirically verified Stage-0 Task 0.4; reproduced through the production
substrate at Stage 1a and the determinism socket + smoke at Stage 1b/1c.)

| Backend | Posture | Mechanism |
|---|---|---|
| **lavapipe (CPU)** | `bit-exact-same-hw` | No-atomics element-wise kernels + single-submit-per-dispatch + fence wait. `LP_NUM_THREADS=0` is the prescribed lever, though element-wise kernels are **thread-count invariant** (bit-identical for LP=0/1/default — S0-CPPB3). Selected via `VK_DRIVER_FILES=lvp_icd.json` (D14). |
| **real GPU** | `epsilon-bounded` (future) | per-sim-port scope; not a bootstrap deliverable. |

**FloatControls (S0-CPPB2).** `ComputeContext::assert_deterministic_float_controls()`
asserts the f32 levers **RTE rounding** + **signed-zero/inf/nan preserve** are
advertised (both true on lavapipe — the NumPy-match levers). **Denorm
preserve/FTZ are NOT pinnable** on lavapipe (neither advertised) — a residual
near-zero cross-stack risk, documented, not asserted.

> **f64-scoping (D16 cleanup-candidate; first surfaced at RD-2D-Stack-C, the first
> f64 consumer).** `assert_deterministic_float_controls()` queries only the **f32**
> levers; there is no f64-lever (`…Float64`) assertion. f64 ports rely on lavapipe's
> **inherent IEEE-754 f64** + `NoContraction` (§ 4 FMA note) for the NumPy-match
> rounding, NOT an advertised f64 rounding/sign-preserve lever — empirically
> sufficient (RD-2D-Stack-C gate-14 is f64↔NumPy BIT-EXACT). Extending the API to
> assert the f64 levers explicitly is a banked cleanup-sub-phase item (conventions
> § L.9 Q-CPP2 D16).

**FMA contraction / NoContraction (R-CPPB3; S1b-CPPB3).** Vulkan/SPIR-V allows
FMA contraction by default, which rounds differently than NumPy's separate
multiply+add. A shader marked `precise` emits SPIR-V `NoContraction`
decorations. **On lavapipe this is load-bearing and changes the result:** the
same element-wise polynomial yields determinism baseline
`a7f85bd4…2844f05` with contraction allowed (the Stage-0/1a substrate baseline)
and `48c92e95…a174cbec` with NoContraction — both run-to-run **bit-identical**.
The NoContraction digest is the NumPy-match-friendly path. A determinism claim
must therefore name its contraction posture; do NOT assert the NoContraction
contract reproduces the contracted baseline (or vice-versa).

**Cross-build / cross-CPU FP is not byte-guaranteed** (R-CPPB2): the contract is
same-host-same-build (pin Mesa/LLVM; `LP_NUM_THREADS=0`). Raising the Mesa/LLVM
pin is a separate operator-approved commit + re-verify.

## 5. Capture-v1 (HDF5)

`Hdf5Writer` emits the testkit capture-v1 layout so `compare_captures` reads
common-cpp captures unchanged (C-6 format-interop):

- `.h5`: `/steps/{N}/state/{field}` + `/steps/{N}/diagnostics/{check}` datasets;
  `/metadata` attrs (`schema_version`, `sim_name`, `sim_category`, `sim_variant`,
  `stack_name`, `seed`); `libver` low-bound = EARLIEST (use
  `FileVersionBounds(EARLIEST, LATEST)`, not `(EARLIEST, EARLIEST)` — S1b-CPPB5).
- `.json` sidecar: `payload.format = "hdf5"`, `payload.path` = `.h5` name,
  `payload.checksum = "sha256:" + <file hash>`; `run.start_utc` must be
  non-empty (testkit schema). `nlohmann::json`'s default ordered map makes
  `dump(2)` the `sort_keys=True, indent=2` analog.

C-1's bar is the C++-internal write → read-back round-trip; **numeric**
cross-stack equivalence with a sim's Stack-B/D/E partner is per-sim-port scope
(D8), not the bootstrap. C-6 verifies only that the Python testkit **parses** the
C++ `.h5` and `compare_captures` produces a verdict (format-interoperability).

## 6. Usage example

The canonical consumer is the **2D advection-diffusion smoke**
(`smoke/advection_diffusion_2d.cpp`) — diffusion-dominated, periodic BC,
bounded/stable (§ 9). A minimal consumer:

```cpp
#include "bit_physics/common/common_cpp.hpp"
namespace vk  = bit_physics::common_cpp::vkcompute;
namespace det = bit_physics::common_cpp::determinism;

det::DeterministicContext dctx(/*seed=*/42);          // D4 deterministic block
vk::ComputeContext ctx = vk::ComputeContext::create();
ctx.assert_deterministic_float_controls();            // RTE + sign-preserve

vk::StorageBuffer buf(ctx, n * sizeof(float));
buf.upload(host.data(), host.size() * sizeof(float));
vk::ComputePipeline::Options o;
o.spirv = kMyShaderSpv; o.spirv_word_count = …; o.binding_count = 1;
vk::ComputePipeline pipe(ctx, o);
pipe.bind(0, buf);
vk::dispatch(ctx, pipe, (n + 63) / 64);               // synchronous + fenced
buf.download(host.data(), host.size() * sizeof(float));
```

Determinism is asserted by hashing the readback over repeated runs:

```cpp
std::string witness = det::assert_deterministic_run(
    [&] { return run_my_dispatch_and_readback(); }, /*runs=*/2);  // throws on divergence
```

## 7. Stack-C port consumption guide

(FACT — D11 routes RD-2D-Stack-C plan-drafting REFRESH as the next sub-phase
after this bootstrap lands.) Port adoption procedure:

1. Confirm the sim's spec-ref declares Stack-C as a target stack (spec § 5).
2. Include `bit_physics/common/common_cpp.hpp`; do **not** extend the socket
   unilaterally — a missing surface is a charter §1.9.1 amendment.
3. RD-2D is **f32** → the f32-vs-f32 contract; `shaderFloat64` is available on
   lavapipe (S0-CPPB1) but default-off (enable via
   `ComputeContextConfig::require_float64` for a future f64 port).
4. Pin the determinism backend to lavapipe (`VK_DRIVER_FILES` + `LP_NUM_THREADS=0`)
   for the determinism gate; use NoContraction (`precise`) shaders where the
   cross-stack partner needs NumPy-match rounding (§ 4).
5. The sim's capture must set `sim.{name, category}` to match its cross-stack
   partner so `compare_captures` produces a meaningful field-by-field verdict.

## 8. Vulkan / SPIR-V / HDF5 upstream references

(FACT — Convention C upstream names cited verbatim; re-verify at use.)

- Vulkan 1.1+ compute: `vkCreateInstance` / `vkEnumeratePhysicalDevices` /
  `vkCreateDevice` / compute `VkQueue` / `VkCommandPool` /
  `VkDescriptorSetLayout` / `VkComputePipelineCreateInfo` / `vkCmdDispatch` /
  `VkFence`; `vkGetPhysicalDeviceProperties2` + `VkPhysicalDeviceFloatControlsProperties`.
- SPIR-V: glslang `glslangValidator -V … --vn <name>` (embedded header);
  `precise` → `OpDecorate … NoContraction`.
- Mesa lavapipe: `VK_DRIVER_FILES` ICD selection; `LP_NUM_THREADS` thread lever.
- HighFive (header-only C++14, Boost license) over the HDF5 C API; system libhdf5.

The render/display surface (`vulkan_init.hpp` — swapchain / present / ImGui) and
the export hooks (`export_hooks.hpp` — VDB / Alembic / USD) remain
declarations-only / `throw std::logic_error` stubs; implementations are per-sim
future scope.

## 9. Methodology integration

- **S6-trajectory-simulation discipline** (conventions § L.4). The smoke is a
  **diffusion-dominated, periodic-BC** advection-diffusion sim — mass-conserving
  and max-field **monotone non-increasing** by design (the laminar bootstrap
  analog of common-warp's hello sim). Measured: max-field `0.9905 → 0.1923` over
  400 steps, monotone, finite — bounded/stable (Stage-1c C-4 evidence).
- **Determinism floor.** This convention is the project-wide Stack-C determinism
  floor (lavapipe CPU `bit-exact-same-hw`); per-sim ports add sim-side
  amendments additively (the pattern of warp.md § 8 / taichi.md § 7).

## 10. Dependencies

See [`docs/dependencies.md`](../dependencies.md) for the consolidated table.
Banked/deferred Stack-C deps (OpenVDB, Alembic, USD, Dear ImGui) remain
out-of-scope stubs (§ 8).

---

*End of project-wide C++/Vulkan convention + `common-cpp` public API reference.
Inherits the determinism contract from spec § 2.5 + § 4.3; declared once here so
per-port Stack-C adoption stays additive (include + sim-specific equivalence test
+ the sim's determinism.md update). Sister convention to docs/common/warp.md
(Stack-E) and docs/common/ts.md (Stack-B).*

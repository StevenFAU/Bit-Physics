# common-cpp

C++20 common module for Bit-Physics Stack C (Vulkan / native binaries)
sims. Phase 1 Stage 1 scaffold per charter
[`docs/phases/phase-1-plan.md`](../phases/phase-1-plan.md) § 2.1 / IC-1
+ IC-3 + § 7.1 deliverables A-I.

## Build

```bash
cd common/common-cpp
cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

Requires:
- CMake `>= 3.28`
- A C++20-capable compiler (tested with GCC 13.3)
- Ninja
- (optional) Vulkan SDK loader (`libvulkan-dev` on Ubuntu) for the
  `vulkan_init.hpp` surface; the rest of common-cpp builds without it

FetchContent pulls `nlohmann/json` v3.11.3 and `doctest` v2.4.11 at
configure time (small downloads, sub-10 s configure on warm cache).

## Headers (public surface)

| Header | Surface | IC |
|---|---|---|
| `bit_physics/common/capture.hpp` | `Manifest`, `SimMeta`/`StackMeta`/…, `StepData`, `FieldData`, `Reader`, `Writer` | IC-1 (charter § 3.1) |
| `bit_physics/common/determinism.hpp` | `Config`, `from_args(int& argc, char** argv)` | IC-3 (charter § 3.3) |
| `bit_physics/common/vulkan_init.hpp` | `DeviceConfig`, `SwapchainConfig` (+ caller-configurable `PresentModePolicy`), `Device`, `Swapchain`, `DescriptorAllocator` | Header surface only (FACT — declarations compile; impls deferred) |
| `bit_physics/common/imgui_hooks.hpp` | `OverlayState`, `begin_frame`, `end_frame`, `render_overlay` | Header surface only (inline no-ops) |
| `bit_physics/common/export_hooks.hpp` | `export_volume_to_vdb`, `export_particles_to_alembic`, `export_scene_to_usd` (+ matching `*Options` structs) | Header surface only (`throw std::logic_error` until implementation) |

## IC-1 — capture I/O

### Payload-format SHIFT from charter

The charter's IC-1 mirrors common-ts (HDF5 manifest + payload). Phase
1 Stage 1 ships IC-1 with a **JSON manifest + raw-binary payload**
format (`raw-binary-v1`) instead:

- `<manifest_path>` — JSON; contains the schema + a `steps` array that
  declares, per step, each field's `name` / `dtype` / `shape` /
  `offset` / `size` into the payload file.
- `<stem>.bin` — raw payload, one contiguous binary blob concatenating
  every step's every field in declaration order.

**Why** (FACT):
- HDF5 vendoring costs ~25 MB of FetchContent download and a
  ~minute-class build; the IC-1 surface is exercisable end-to-end in
  CI without it.
- Phase 1 Stage 1's load-bearing goal is the *surface* — every public
  API name/signature pinned for Stage 2 probes to grep against.
- The HDF5 swap-in is a localized edit to `src/capture.cpp`; no
  signature changes.

**Consequence** (INFERENCE):
- Cross-stack equivalence with common-ts (which writes HDF5) is
  SHIFTED to the per-sim implementation phase that first lands a
  Stack C sim. Documented in Stage 1 checkpoint as
  `cross-stack-equivalence:cpp-ts:SHIFTED-NEEDS-HDF5-VENDOR`.
- Common-cpp ↔ common-py round-trip is also SHIFTED for the same
  reason — common-py uses Phase 0's testkit HDF5 capture.

### Round-trip

```cpp
#include "bit_physics/common/capture.hpp"
namespace cap = bit_physics::common_cpp::capture;

cap::Manifest m;
m.sim = {"my-sim", "category", "variant"};
m.config.dims = {64};
m.config.dtype = "f64";
m.payload.path = "my-sim.bin";

cap::Writer writer("/path/to/my-sim.json", m);
writer.write_step(0, step_data);
writer.finalize();

cap::Reader reader("/path/to/my-sim.json");
auto step_count = reader.step_count();
cap::StepData rt = reader.read_step(0);
```

`StepData::fields` is a `std::unordered_map<std::string, FieldData>`;
`FieldData` holds the raw bytes + dtype string + shape vector.

## IC-3 — determinism Config

```cpp
#include "bit_physics/common/determinism.hpp"
namespace det = bit_physics::common_cpp::determinism;

int main(int argc, char** argv) {
    det::Config cfg = det::from_args(argc, argv);
    // ... argc and argv have been trimmed; subsequent parsers see the
    // remaining args
}
```

CLI flags consumed: `--deterministic` (zero-argument flag) and
`--seed N`. `from_args` mutates `argc` / `argv` in place to remove
the consumed entries.

## Vulkan / ImGui / VDB / Alembic / USD — header surface only

Per charter § 7.1 deliverable D, all five surfaces ship as
header-only declarations. Implementations land in the per-sim phase
that first needs them:

- **Vulkan device init / descriptor / swap chain**: declarations
  compile; `Device::create` / `Swapchain::create` /
  `DescriptorAllocator::allocate` linked-but-not-defined. The
  caller-configurable `PresentModePolicy` enum is exposed in the
  config so the implementation can honour the spec § 4.3 contract
  (`prefer mailbox, fall back to FIFO` vs `force FIFO`).
- **ImGui hooks**: `begin_frame` / `end_frame` / `render_overlay` are
  inline empty functions. Adding ImGui vendoring + Vulkan back-end is
  a localized edit later.
- **VDB / Alembic / USD export**: `throw std::logic_error("… surface
  stub …")` so a caller that wires it in prematurely surfaces the gap
  at runtime rather than silently no-op'ing.

INFERENCE: This deliberate "throw on call" choice mirrors the
common-py stubs' `*ExportError` pattern. Both prevent silent
no-op fallbacks at integration time.

## Smoke sim

`common/common-cpp/smoke/advection_1d.cpp` — 1D upwind advection on a
periodic 64-cell grid, 100 steps, capture interval 10. Mirrors
`common/common-py/smoke/advection_1d.py`. Same CFL number (0.5), same
IC (Gaussian pulse at x=0.5).

Build & run:

```bash
cmake --build build --target bit_physics_common_cpp_smoke_advection_1d
./build/bit_physics_common_cpp_smoke_advection_1d --deterministic --seed 42
```

Cross-stack equivalence comparison vs the common-py output is SHIFTED
pending the HDF5 vendor work (see IC-1 above).

## Tests

`tests/test_capture.cpp` + `tests/test_determinism.cpp` exercise IC-1
round-trip + IC-3 arg parsing via doctest. Stage 1 commit-time
outcome (FACT):

```
[doctest] test cases:  8 |  8 passed | 0 failed | 0 skipped
[doctest] assertions: 35 | 35 passed | 0 failed |
[doctest] Status: SUCCESS!
```

Run: `ctest --test-dir build --output-on-failure`.

## Dependencies

See [`common/common-cpp/_staging/deps.md`](../../common/common-cpp/_staging/deps.md)
for the full table (Stage 3 consolidates into `docs/dependencies.md`).
Banked / deferred deps (HDF5, OpenVDB, Alembic, USD, Dear ImGui) are
called out explicitly there.

## Out of scope this stage

- Full HDF5 capture vendoring (SHIFTED — see IC-1).
- A working Vulkan device-init body (header surface only).
- Real ImGui / VDB / Alembic / USD output (header stubs only).
- Top-level CMakeLists.txt registration of common-cpp as a
  subdirectory of the project root (Convention A — Stage 3 owns).
- Cross-stack equivalence harness with common-ts / common-py (SHIFTED
  to per-sim phase per IC-1 INFERENCE above).

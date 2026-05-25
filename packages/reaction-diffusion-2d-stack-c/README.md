# reaction-diffusion-2d → Stack C (Vulkan / C++)

8th and final spec § 11.3 cross-stack port; **first Stack-C (Vulkan / C++) port**.
Ports the Phase-1 NumPy Gray-Scott reference (`packages/reaction-diffusion-2d/`)
to a headless Vulkan-compute C++ implementation consuming the §1.9.1-cpp
common-cpp substrate. Charter: `docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md`.

## Status: Stage 1a (scaffold + RED)

This tree is a **scaffold**. `src/gray_scott.cpp` is a STUB (throws
`NotImplemented`); the doctest suite fails RED. Stage 1b lands the
implementation, registers the subdirectory at the top-level `CMakeLists.txt`
(`add_subdirectory(...)`), and turns gates 4-13 GREEN.

- **Posture:** f64 (`require_float64`) + NoContraction (`precise` → SPIR-V
  `NoContraction`; Q-CPP1) — the NumPy-match path. Determinism on lavapipe
  (`VK_DRIVER_FILES=lvp_icd.json`, `LP_NUM_THREADS=0`).
- **Canonical:** `gray-scott-lambda-128sq-seed42-step2000` (f64).
- **gate-14:** cross-stack vs the NumPy f64 reference at `reaction-diffusion`
  (rel=1e-4). Predicted shape **(a) BIT-EXACT** — refresh-probe step-1 measured 0.0.
- **gate-4:** MMS single-arm (S0-RD2C1) — 4-grid ladder N∈{16,32,64,128},
  observed L2 order 2.0±0.5, via the manufactured-source shader variant.

## Layout

```
shaders/gray_scott_2d.comp       plain f64 NoContraction Gray-Scott step
shaders/gray_scott_2d_mms.comp   manufactured-source variant (gate-4)
include/.../gray_scott.hpp        port API (run_gray_scott, mms_observed_l2_order)
src/gray_scott.cpp               Stage-1a STUB (RED anchor); Stage-1b impl
tests/                           doctest RED suite (gates 4-13 + gate-4 + gate-14)
CMakeLists.txt                   target skeleton (top-level-registered at Stage 1b)
```

## Build (Stage 1b onward)

```
cmake -S . -B build/cpp                 # top-level; registers common-cpp + this port
cmake --build build/cpp -j"$(nproc)"
VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json LP_NUM_THREADS=0 \
  ctest --test-dir build/cpp --output-on-failure
```

Registration is **CMake-only** (D11); this port is **not** a uv workspace member.

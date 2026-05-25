# Bit-Physics — top-level C++ / Vulkan (Stack-C) aggregation.
#
# Sub-phase: sub-phase-common-cpp-bootstrap, Stage 1a (D6). Charter
# docs/phases/sub-phase-common-cpp-bootstrap.md § 4 — "top-level CMake
# aggregation registering bit_physics::common_cpp".
#
# Scope: this file registers the Stack-C C++ surface ONLY. The Python workspace
# is built/managed via uv (root pyproject.toml [tool.uv.workspace]); common-cpp
# is intentionally NOT a uv member (D6) — the uv member count stays 23. These
# two build systems are independent: configuring this CMake tree does not touch
# the Python workspace, and `uv sync` does not touch this tree.
#
# Build (lavapipe-pinned, per D14/D4):
#   cmake -S . -B build/cpp
#   cmake --build build/cpp
#   VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json LP_NUM_THREADS=0 \
#     ctest --test-dir build/cpp --output-on-failure
# (The Vulkan substrate test sets the lavapipe env itself via CTest properties.)

cmake_minimum_required(VERSION 3.28)

project(bit_physics
  VERSION 0.0.0
  DESCRIPTION "Bit-Physics top-level Stack-C (C++ / Vulkan) aggregation"
  LANGUAGES CXX
)

enable_testing()

# Stack-C C++ workspace surface. Registers:
#   bit_physics::common_cpp          (core: capture + determinism)
#   bit_physics::common_cpp_vulkan   (Vulkan compute substrate; if Vulkan found)
add_subdirectory(common/common-cpp)

# Stack-C per-sim port (D11 — CMake subdirectory, NOT a uv member; uv stays 23).
# Added AFTER common/common-cpp so its substrate targets +
# bitphysics_embed_compute_shader helper are in scope.
#   sub-phase-reaction-diffusion-2d-stack-c, Stage 1b (registration).
add_subdirectory(packages/reaction-diffusion-2d-stack-c)

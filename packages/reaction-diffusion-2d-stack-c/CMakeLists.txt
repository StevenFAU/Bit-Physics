# Gray-Scott reaction-diffusion 2D — Stack-C (C++ / Vulkan) port.
#
# Sub-phase: sub-phase-reaction-diffusion-2d-stack-c, Stage 1a (scaffold).
# Charter docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md § 2 / § 4.
#
# REGISTRATION (D11): this is a CMake subdirectory, NOT a uv workspace member
# (uv count stays 23). It is registered at the TOP-LEVEL CMakeLists.txt via
# `add_subdirectory(packages/reaction-diffusion-2d-stack-c)` at STAGE 1B — NOT
# at Stage 1a (charter § 2: Stage 1a = scaffold; Stage 1b = registration + impl).
# It consumes the §1.9.1-cpp substrate targets (bit_physics_common_cpp_vulkan /
# _hdf5) + the `bitphysics_embed_compute_shader` helper, both defined by
# common/common-cpp (added before this subdir at top level).
#
# Stage 1a STATE: the library below builds from a STUB (src/gray_scott.cpp throws
# NotImplemented) — the RED anchor. The doctest suite fails RED until Stage 1b.

# --- Port library (stub at Stage 1a; Vulkan/C++ impl at Stage 1b) ------------
add_library(bit_physics_rd2d_stack_c
  src/gray_scott.cpp
)
target_include_directories(bit_physics_rd2d_stack_c PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/include
)
target_compile_features(bit_physics_rd2d_stack_c PUBLIC cxx_std_20)
# Stage 1b links the substrate (the stub has no Vulkan dependency yet):
#   target_link_libraries(bit_physics_rd2d_stack_c PUBLIC
#     bit_physics_common_cpp_vulkan bit_physics_common_cpp_hdf5)
add_library(bit_physics::rd2d_stack_c ALIAS bit_physics_rd2d_stack_c)

# --- SPIR-V shaders (plain step + MMS-source variant; gate-4 / S0-RD2C1) ------
# Embedded at Stage 1b when the impl consumes them:
#   bitphysics_embed_compute_shader(RD2D_SPV       shaders/gray_scott_2d.comp     kGrayScott2dSpv)
#   bitphysics_embed_compute_shader(RD2D_MMS_SPV   shaders/gray_scott_2d_mms.comp kGrayScott2dMmsSpv)

# --- doctest RED suite (gates 4-13 surface + gate-4 MMS + gate-14 fixture) ----
if (TARGET doctest)
  add_executable(bit_physics_rd2d_stack_c_tests
    tests/test_main.cpp
    tests/test_gray_scott.cpp
    tests/test_mms_order.cpp
    tests/test_cross_stack_equivalence.cpp
  )
  target_link_libraries(bit_physics_rd2d_stack_c_tests PRIVATE
    bit_physics_rd2d_stack_c
    doctest
  )
  add_test(NAME rd2d_stack_c_tests COMMAND bit_physics_rd2d_stack_c_tests)
  # Stage 1b: lavapipe pin (D14/D4) once the tests dispatch the Vulkan kernel.
  #   set_tests_properties(rd2d_stack_c_tests PROPERTIES
  #     ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
endif()

# --- Stage 1b targets (placeholders; not built at Stage 1a) -------------------
# - bit_physics_rd2d_stack_c_capture  : canonical capture writer executable
#   (gray-scott-lambda-128sq-seed42-step2000 -> capture-v1 .h5 + .json; Q-CPP4)
# - rd2d_stack_c_cross_language        : Python compare_captures vs NumPy ref (gate-14)

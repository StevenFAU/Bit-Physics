# Gray-Scott reaction-diffusion 2D — Stack-C (C++ / Vulkan) port.
#
# Sub-phase: sub-phase-reaction-diffusion-2d-stack-c, Stage 1b (implementation +
# registration). Charter docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md
# § 2 / § 4. REGISTRATION (D11): CMake subdirectory, NOT a uv member (uv stays
# 23); registered at the top-level CMakeLists.txt via add_subdirectory at Stage 1b.
# Consumes the §1.9.1-cpp substrate (bit_physics_common_cpp_vulkan / _hdf5) +
# the bitphysics_embed_compute_shader helper (defined by common/common-cpp,
# added before this subdir).
#
# Posture: f64 (require_float64) + NoContraction (precise shaders; Q-CPP1).

# Gate on the substrate TARGETS (global) rather than Vulkan_FOUND/HDF5_FOUND
# (those are set in common/common-cpp's subdir scope and do not propagate here).
if (TARGET bit_physics_common_cpp_vulkan AND TARGET bit_physics_common_cpp_hdf5)
  # --- SPIR-V shaders (plain step + manufactured-source variant; gate-4) -------
  bitphysics_embed_compute_shader(RD2D_SPV
    shaders/gray_scott_2d.comp kGrayScott2dSpv)
  bitphysics_embed_compute_shader(RD2D_MMS_SPV
    shaders/gray_scott_2d_mms.comp kGrayScott2dMmsSpv)

  # --- Port library -----------------------------------------------------------
  add_library(bit_physics_rd2d_stack_c
    src/gray_scott.cpp
    ${RD2D_SPV}
    ${RD2D_MMS_SPV}
  )
  target_include_directories(bit_physics_rd2d_stack_c
    PUBLIC  ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_compile_features(bit_physics_rd2d_stack_c PUBLIC cxx_std_20)
  target_link_libraries(bit_physics_rd2d_stack_c PUBLIC
    bit_physics_common_cpp_vulkan
    bit_physics_common_cpp_hdf5
  )
  add_library(bit_physics::rd2d_stack_c ALIAS bit_physics_rd2d_stack_c)

  # --- Canonical capture writer executable ------------------------------------
  add_executable(bit_physics_rd2d_stack_c_capture src/gray_scott_capture_main.cpp)
  target_link_libraries(bit_physics_rd2d_stack_c_capture PRIVATE bit_physics_rd2d_stack_c)

  # --- doctest suite (gates 4-13 surface + gate-4 MMS + gate-14 precursor) -----
  if (TARGET doctest)
    set(RD2D_REF_MANIFEST
      "${CMAKE_CURRENT_SOURCE_DIR}/../../captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json")
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
    target_compile_definitions(bit_physics_rd2d_stack_c_tests PRIVATE
      RD2D_REF_MANIFEST="${RD2D_REF_MANIFEST}")
    add_test(NAME rd2d_stack_c_tests COMMAND bit_physics_rd2d_stack_c_tests)
    # Lavapipe pin (D14) + determinism lever (D4); element-wise no-atomics (Q-CPP3).
    set_tests_properties(rd2d_stack_c_tests PROPERTIES
      ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
  endif()

  # --- gate-14 cross-stack equivalence (Stage 1c; §L.7 O-2 ckpt 4) ------------
  # Formal compare_captures(LEFT=NumPy ref, RIGHT=Stack-C) via the Python testkit
  # harness (cross-language: Python reads the C++-emitted .h5). Driven by uv from
  # the testkit workspace so `capture` + `equivalence` import (common-cpp C-6 pattern).
  find_program(UV_EXECUTABLE NAMES uv)
  if (UV_EXECUTABLE)
    add_test(NAME rd2d_stack_c_gate14
      COMMAND ${UV_EXECUTABLE} run --no-sync python
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/python/test_gate14_cross_stack.py
        $<TARGET_FILE:bit_physics_rd2d_stack_c_capture>)
    set_tests_properties(rd2d_stack_c_gate14 PROPERTIES
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../../tools/testkit)
  else()
    message(WARNING "uv not found: skipping rd2d_stack_c_gate14 cross-stack ctest.")
  endif()
else()
  message(STATUS "reaction-diffusion-2d-stack-c: Vulkan + HDF5 required; skipping (Stage 1b targets).")
endif()

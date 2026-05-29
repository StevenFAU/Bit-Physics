# Mass-spring cloth (XPBD) — Stack-C (C++ / Vulkan) reference sim.
#
# Sub-phase: sub-phase-phase-3-mass-spring-cloth (task-5). FIRST NEW Stack-C sim
# of Phase 3 + FIRST soft-body category. Charter
# docs/phases/sub-phase-phase-3-mass-spring-cloth.md § 3 (deliverable D) + § 8.
# REGISTRATION (D-LAYOUT): CMake subdirectory, NOT a uv member; registered at
# the top-level CMakeLists.txt via add_subdirectory AFTER common/common-cpp so
# its substrate targets + the bitphysics_embed_compute_shader helper are in scope.
#
# Posture: f64 (require_float64) + NoContraction (precise shaders; Q-CPP1) +
# serial Gauss-Seidel single-invocation projection (charter D-DET) -> bit-exact
# on lavapipe. No gate-14 (single-stack terminal sim), no MMS, no cross-stack.

# Gate on the substrate TARGETS (global) rather than Vulkan_FOUND/HDF5_FOUND
# (those are set in common/common-cpp's subdir scope and do not propagate here).
if (TARGET bit_physics_common_cpp_vulkan AND TARGET bit_physics_common_cpp_hdf5)
  # --- SPIR-V shader (serial-GS XPBD; gate-4) ---------------------------------
  bitphysics_embed_compute_shader(CLOTH_SPV
    shaders/cloth_xpbd.comp kClothXpbdSpv)

  # --- Sim library ------------------------------------------------------------
  add_library(bit_physics_mass_spring_cloth
    src/cloth.cpp
    ${CLOTH_SPV}
  )
  target_include_directories(bit_physics_mass_spring_cloth
    PUBLIC  ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_compile_features(bit_physics_mass_spring_cloth PUBLIC cxx_std_20)
  target_link_libraries(bit_physics_mass_spring_cloth PUBLIC
    bit_physics_common_cpp_vulkan
    bit_physics_common_cpp_hdf5
  )
  add_library(bit_physics::mass_spring_cloth ALIAS bit_physics_mass_spring_cloth)

  # --- canonical capture writer + PBT driver executable -----------------------
  add_executable(bit_physics_mass_spring_cloth_capture src/cloth_capture_main.cpp)
  target_link_libraries(bit_physics_mass_spring_cloth_capture PRIVATE bit_physics_mass_spring_cloth)

  # --- doctest suite (gate-3 acceptance RED -> GREEN + gate-4 golden) ---------
  if (TARGET doctest)
    set(CLOTH_GOLDEN_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../tools/testkit/golden/tables")
    add_executable(bit_physics_mass_spring_cloth_tests
      tests/test_main.cpp
      tests/test_cloth.cpp
      tests/test_golden.cpp
    )
    target_link_libraries(bit_physics_mass_spring_cloth_tests PRIVATE
      bit_physics_mass_spring_cloth
      doctest
      nlohmann_json::nlohmann_json
    )
    target_compile_definitions(bit_physics_mass_spring_cloth_tests PRIVATE
      CLOTH_GOLDEN_DIR="${CLOTH_GOLDEN_DIR}")
    add_test(NAME mass_spring_cloth_tests COMMAND bit_physics_mass_spring_cloth_tests)
    # Lavapipe pin (D14) + serial-GS determinism lever (D4); single-invocation,
    # no atomics -> bit-identical regardless of thread count.
    set_tests_properties(mass_spring_cloth_tests PROPERTIES
      ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
  endif()

  # --- PBT (gate-11): Hypothesis -> subprocess capture binary -> read .h5 ------
  # Cross-language (D-PBT): the Python PBT verifies the declared invariants
  # post-hoc on captures the C++ binary emits. Driven by uv from the testkit
  # workspace so `capture` + `property` import (common-cpp C-6 pattern).
  find_program(UV_EXECUTABLE NAMES uv)
  if (UV_EXECUTABLE)
    add_test(NAME mass_spring_cloth_pbt
      COMMAND ${UV_EXECUTABLE} run --no-sync python
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/python/test_pbt_invariants.py
        $<TARGET_FILE:bit_physics_mass_spring_cloth_capture>)
    set_tests_properties(mass_spring_cloth_pbt PROPERTIES
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../../tools/testkit)
  else()
    message(WARNING "uv not found: skipping mass_spring_cloth_pbt ctest.")
  endif()
else()
  message(STATUS "mass-spring-cloth: Vulkan + HDF5 required; skipping (Stage 1b targets).")
endif()

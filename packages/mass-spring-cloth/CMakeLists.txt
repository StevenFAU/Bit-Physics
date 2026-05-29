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

  # --- doctest acceptance suite (gate-3 RED -> GREEN) -------------------------
  if (TARGET doctest)
    add_executable(bit_physics_mass_spring_cloth_tests
      tests/test_main.cpp
      tests/test_cloth.cpp
    )
    target_link_libraries(bit_physics_mass_spring_cloth_tests PRIVATE
      bit_physics_mass_spring_cloth
      doctest
    )
    add_test(NAME mass_spring_cloth_tests COMMAND bit_physics_mass_spring_cloth_tests)
    # Lavapipe pin (D14) + serial-GS determinism lever (D4); single-invocation,
    # no atomics -> bit-identical regardless of thread count.
    set_tests_properties(mass_spring_cloth_tests PROPERTIES
      ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
  endif()
else()
  message(STATUS "mass-spring-cloth: Vulkan + HDF5 required; skipping (Stage 1b targets).")
endif()

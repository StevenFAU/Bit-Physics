# eulerian-smoke frontier-clebsch-pfm — Stack-C (C++ / Vulkan) variant.
#
# Phase 6 cluster C-1 unit U-4 (charter docs/phases/phase-6/c1-charter.md § 3.4,
# RATIFIED § 10). REGISTRATION (the rd2d-stack-c D11 precedent): CMake subdirectory,
# NOT a uv member; registered at the top-level CMakeLists.txt via add_subdirectory.
# Consumes the §1.9.1-cpp substrate (bit_physics_common_cpp_vulkan / _hdf5) + the
# bitphysics_embed_compute_shader helper.
#
# Posture (probe § 5 + spec § 6): f64 (require_float64) + NoContraction (precise
# shaders) for the per-cell Clebsch field arithmetic; f64 transcendentals + particle
# flow-map transport (gather-only, fixed-order) + fixed-count multigrid Poisson run in
# deterministic host C++ (GLSL exposes no f64 trig). No atomics anywhere.

if (TARGET bit_physics_common_cpp_vulkan AND TARGET bit_physics_common_cpp_hdf5)
  # --- SPIR-V shaders -----------------------------------------------------------
  bitphysics_embed_compute_shader(CLEBSCH_INNER_SPV
    shaders/clebsch_inner_product.comp kClebschInnerProductSpv)
  bitphysics_embed_compute_shader(CLEBSCH_ROTATE_SPV
    shaders/clebsch_rotate_normalize.comp kClebschRotateNormalizeSpv)
  bitphysics_embed_compute_shader(CLEBSCH_DIV_SPV
    shaders/clebsch_divergence.comp kClebschDivergenceSpv)

  # --- Variant library ------------------------------------------------------------
  add_library(bit_physics_clebsch_pfm
    src/clebsch_pfm.cpp
    ${CLEBSCH_INNER_SPV}
    ${CLEBSCH_ROTATE_SPV}
    ${CLEBSCH_DIV_SPV}
  )
  target_include_directories(bit_physics_clebsch_pfm
    PUBLIC  ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_compile_features(bit_physics_clebsch_pfm PUBLIC cxx_std_20)
  target_link_libraries(bit_physics_clebsch_pfm PUBLIC
    bit_physics_common_cpp_vulkan
    bit_physics_common_cpp_hdf5
  )
  find_package(Threads REQUIRED)
  target_link_libraries(bit_physics_clebsch_pfm PRIVATE Threads::Threads)
  add_library(bit_physics::clebsch_pfm ALIAS bit_physics_clebsch_pfm)

  # --- Canonical capture writer executable ----------------------------------------
  add_executable(bit_physics_clebsch_pfm_capture src/clebsch_pfm_capture_main.cpp)
  target_link_libraries(bit_physics_clebsch_pfm_capture PRIVATE bit_physics_clebsch_pfm)

  # --- doctest suite ---------------------------------------------------------------
  if (TARGET doctest)
    add_executable(bit_physics_clebsch_pfm_tests
      tests/test_main.cpp
      tests/test_clebsch_pfm.cpp
    )
    target_link_libraries(bit_physics_clebsch_pfm_tests PRIVATE
      bit_physics_clebsch_pfm
      doctest
    )
    add_test(NAME clebsch_pfm_tests COMMAND bit_physics_clebsch_pfm_tests)
    set_tests_properties(clebsch_pfm_tests PROPERTIES
      ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
  endif()
else()
  message(STATUS "eulerian-smoke-frontier-clebsch-pfm: Vulkan + HDF5 required; skipping.")
endif()

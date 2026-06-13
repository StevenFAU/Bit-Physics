# eulerian-smoke frontier-vpfm — Stack-C (C++ / Vulkan) variant.
#
# Phase 6 cluster C-1 unit U-5 (charter docs/phases/phase-6/c1-charter.md § 3.5,
# RATIFIED § 10). REGISTRATION (the rd2d-stack-c D11 precedent): CMake subdirectory,
# NOT a uv member; registered at the top-level CMakeLists.txt via add_subdirectory.
# Consumes the §1.9.1-cpp substrate (bit_physics_common_cpp_vulkan / _hdf5) + the
# bitphysics_embed_compute_shader helper.
#
# Posture (probe § 5 + spec § 6, the U-4 rules carried): f64 (require_float64) +
# NoContraction (precise shaders) for the per-face/per-cell grid vector arithmetic
# (staggered curl, MAC divergence); particle flow-map transport (gather-only,
# fixed-order) + the fixed-count multigrid vector-potential solves run in
# deterministic host C++. No atomics anywhere.

if (TARGET bit_physics_common_cpp_vulkan AND TARGET bit_physics_common_cpp_hdf5)
  # --- SPIR-V shaders -----------------------------------------------------------
  bitphysics_embed_compute_shader(VPFM_CURL_SPV
    shaders/vpfm_curl.comp kVpfmCurlSpv)
  bitphysics_embed_compute_shader(VPFM_DIV_SPV
    shaders/vpfm_divergence.comp kVpfmDivergenceSpv)

  # --- Variant library ------------------------------------------------------------
  add_library(bit_physics_vpfm
    src/vpfm.cpp
    src/vpfm_math.cpp
    ${VPFM_CURL_SPV}
    ${VPFM_DIV_SPV}
  )
  target_include_directories(bit_physics_vpfm
    PUBLIC  ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_compile_features(bit_physics_vpfm PUBLIC cxx_std_20)
  # Per-target optimization with STRICT IEEE FP (the U-4 measured precedent: -O0 is
  # ~10x slower and infeasible at 128³; -ffp-contract=off forbids FMA fusion and GCC
  # performs no FP reassociation without fast-math, so results are bit-identical to
  # the -O0 build — re-verified for THIS package via the determinism witness sha at
  # n=32, recorded in the spec sheet § 6). Scoped to this target only.
  target_compile_options(bit_physics_vpfm PRIVATE -O3 -ffp-contract=off)
  target_link_libraries(bit_physics_vpfm PUBLIC
    bit_physics_common_cpp_vulkan
    bit_physics_common_cpp_hdf5
  )
  find_package(Threads REQUIRED)
  target_link_libraries(bit_physics_vpfm PRIVATE Threads::Threads)
  add_library(bit_physics::vpfm ALIAS bit_physics_vpfm)

  # --- Canonical capture writer executable ----------------------------------------
  add_executable(bit_physics_vpfm_capture src/vpfm_capture_main.cpp)
  target_link_libraries(bit_physics_vpfm_capture PRIVATE bit_physics_vpfm)

  # --- doctest suite ---------------------------------------------------------------
  if (TARGET doctest)
    add_executable(bit_physics_vpfm_tests
      tests/test_main.cpp
      tests/test_vpfm.cpp
    )
    target_link_libraries(bit_physics_vpfm_tests PRIVATE
      bit_physics_vpfm
      doctest
    )
    add_test(NAME vpfm_tests COMMAND bit_physics_vpfm_tests)
    set_tests_properties(vpfm_tests PROPERTIES
      ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
  endif()
else()
  message(STATUS "eulerian-smoke-frontier-vpfm: Vulkan + HDF5 required; skipping.")
endif()

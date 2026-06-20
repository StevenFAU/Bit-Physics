# eulerian-smoke frontier-edge — Stack-C (C++ / Vulkan) variant.
#
# Phase 6 cluster C-1 unit U-6 (charter docs/phases/phase-6/c1-charter.md § 3.6,
# RATIFIED § 10 incl. D-1 = EDGE proper DOI 10.1145/3731193). REGISTRATION (the
# rd2d-stack-c D11 precedent, carried by U-3/U-4/U-5): CMake subdirectory, NOT a uv
# member; registered at the top-level CMakeLists.txt via add_subdirectory. Consumes the
# §1.9.1-cpp substrate (bit_physics_common_cpp_vulkan / _hdf5) + the
# bitphysics_embed_compute_shader helper (the embed lands with the curl/div kernels at
# stage 1b — at stage 1a the impl is a RED stub and the library has no shader sources).
#
# Posture (probe § 5 + spec § 6, the U-4/U-5 rules carried): f64 (require_float64) +
# NoContraction (precise shaders) for the per-face/per-cell grid vector arithmetic
# (staggered curl, MAC divergence); the grid flow-map evolution (gather-only,
# fixed-order) + the fixed-count multigrid Poisson solves run in deterministic host C++.
# No atomics anywhere.

if (TARGET bit_physics_common_cpp_vulkan AND TARGET bit_physics_common_cpp_hdf5)
  # --- Variant library ------------------------------------------------------------
  # STAGE 1a: edge.cpp + edge_math.cpp are RED stubs (every public surface throws). The
  # Vulkan curl/div SPIR-V shaders + the NEW grid-flow-map core (edge_flowmap.cpp +
  # edge_detail.hpp) land at stage 1b.
  add_library(bit_physics_edge
    src/edge.cpp
    src/edge_math.cpp
  )
  target_include_directories(bit_physics_edge
    PUBLIC  ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_compile_features(bit_physics_edge PUBLIC cxx_std_20)
  # Per-target optimization with STRICT IEEE FP (the U-4/U-5 measured precedent: -O0 is
  # ~10x slower and infeasible at 128³; -ffp-contract=off forbids FMA fusion and GCC
  # performs no FP reassociation without fast-math, so results are bit-identical to the
  # -O0 build — re-verified for THIS package via the determinism witness sha at 1b,
  # recorded in the spec sheet § 6). Scoped to this target only.
  target_compile_options(bit_physics_edge PRIVATE -O3 -ffp-contract=off)
  target_link_libraries(bit_physics_edge PUBLIC
    bit_physics_common_cpp_vulkan
    bit_physics_common_cpp_hdf5
  )
  find_package(Threads REQUIRED)
  target_link_libraries(bit_physics_edge PRIVATE Threads::Threads)
  add_library(bit_physics::edge ALIAS bit_physics_edge)

  # --- Canonical capture writer executable ----------------------------------------
  add_executable(bit_physics_edge_capture src/edge_capture_main.cpp)
  target_link_libraries(bit_physics_edge_capture PRIVATE bit_physics_edge)

  # --- doctest suite ---------------------------------------------------------------
  if (TARGET doctest)
    add_executable(bit_physics_edge_tests
      tests/test_main.cpp
      tests/test_edge.cpp
    )
    target_link_libraries(bit_physics_edge_tests PRIVATE
      bit_physics_edge
      doctest
    )
    add_test(NAME edge_tests COMMAND bit_physics_edge_tests)
    set_tests_properties(edge_tests PROPERTIES
      ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
  endif()

  # The REFRAMED frontier-vs-parent equivalence ctest (python, fixture-based) + the
  # O(1)-memory perf-ledger gate land at stage 1c (the U-5 vpfm_reframed_equivalence
  # precedent), once the canonical capture exists.
else()
  message(STATUS "eulerian-smoke-frontier-edge: Vulkan + HDF5 required; skipping.")
endif()

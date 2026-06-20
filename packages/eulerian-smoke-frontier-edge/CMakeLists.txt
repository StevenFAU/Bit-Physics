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
  # --- SPIR-V shaders -------------------------------------------------------------
  # The compatible curl/div stencil pair (copy-adapted VERBATIM from U-5 vpfm — the
  # div∘curl identity that makes gate-11 PBT-1 div(u) FP-noise).
  bitphysics_embed_compute_shader(EDGE_CURL_SPV
    shaders/edge_curl.comp kEdgeCurlSpv)
  bitphysics_embed_compute_shader(EDGE_DIV_SPV
    shaders/edge_divergence.comp kEdgeDivergenceSpv)

  # --- Variant library ------------------------------------------------------------
  # STAGE 1b: edge_math.cpp (analytic + numerics), edge_flowmap.cpp (the NEW grid
  # backward-flow-map core), edge.cpp (Vulkan reconstruct + the trajectory).
  add_library(bit_physics_edge
    src/edge.cpp
    src/edge_math.cpp
    src/edge_flowmap.cpp
    ${EDGE_CURL_SPV}
    ${EDGE_DIV_SPV}
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

  # --- REFRAMED frontier-vs-parent equivalence (stage 1c; python, fixture-based) ---
  # Reads the SMALL committed variant budget-metric fixture (derived once at landing by
  # tests/python/derive_budget_metrics.py from the LFS canonical capture) against the
  # single-source U-4 parent fixture — no LFS pull in CI (probe § 4.4 / § 4.5). The
  # O(1)-memory perf-ledger gate is the docs/perf-ledger.md row (non-ctest; spec § 12).
  find_program(UV_EXECUTABLE NAMES uv)
  if (UV_EXECUTABLE)
    add_test(NAME edge_reframed_equivalence
      COMMAND ${UV_EXECUTABLE} run --no-sync pytest -q
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/python/test_reframed_equivalence.py)
    set_tests_properties(edge_reframed_equivalence PROPERTIES
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../../tools/testkit)
  else()
    message(WARNING "uv not found: skipping edge_reframed_equivalence ctest.")
  endif()
else()
  message(STATUS "eulerian-smoke-frontier-edge: Vulkan + HDF5 required; skipping.")
endif()

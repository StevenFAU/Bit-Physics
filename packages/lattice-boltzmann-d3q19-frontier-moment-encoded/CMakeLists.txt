# lattice-boltzmann-d3q19 frontier-moment-encoded — Stack-C (C++ / Vulkan) variant.
#
# Phase 6 cluster C-1 unit U-3 (charter docs/phases/phase-6/c1-charter.md § 3.3,
# RATIFIED § 10 incl. D-2). REGISTRATION (the rd2d-stack-c D11 precedent): CMake
# subdirectory, NOT a uv member; registered at the top-level CMakeLists.txt via
# add_subdirectory. Consumes the §1.9.1-cpp substrate (bit_physics_common_cpp_vulkan /
# _hdf5) + the bitphysics_embed_compute_shader helper.
#
# Posture: f64 (require_float64) + NoContraction (precise shaders); element-wise kernels;
# the encode kernel's atomicOr composes disjoint half-words (order-independent).

if (TARGET bit_physics_common_cpp_vulkan AND TARGET bit_physics_common_cpp_hdf5)
  # --- SPIR-V shaders -----------------------------------------------------------
  bitphysics_embed_compute_shader(LBM_ME_COLLIDE_SPV
    shaders/lbm_collide.comp kLbmCollideSpv)
  bitphysics_embed_compute_shader(LBM_ME_STREAM_SPV
    shaders/lbm_stream_bounce.comp kLbmStreamBounceSpv)
  bitphysics_embed_compute_shader(LBM_ME_ENCODE_SPV
    shaders/lbm_encode.comp kLbmEncodeSpv)
  bitphysics_embed_compute_shader(LBM_ME_DECODE_SPV
    shaders/lbm_decode.comp kLbmDecodeSpv)

  # --- Variant library ------------------------------------------------------------
  add_library(bit_physics_lbm_me
    src/lbm_me.cpp
    ${LBM_ME_COLLIDE_SPV}
    ${LBM_ME_STREAM_SPV}
    ${LBM_ME_ENCODE_SPV}
    ${LBM_ME_DECODE_SPV}
  )
  target_include_directories(bit_physics_lbm_me
    PUBLIC  ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_compile_features(bit_physics_lbm_me PUBLIC cxx_std_20)
  target_link_libraries(bit_physics_lbm_me PUBLIC
    bit_physics_common_cpp_vulkan
    bit_physics_common_cpp_hdf5
  )
  add_library(bit_physics::lbm_me ALIAS bit_physics_lbm_me)

  # --- Canonical capture writer executable ----------------------------------------
  add_executable(bit_physics_lbm_me_capture src/lbm_me_capture_main.cpp)
  target_link_libraries(bit_physics_lbm_me_capture PRIVATE bit_physics_lbm_me)

  # --- doctest suite ---------------------------------------------------------------
  if (TARGET doctest)
    add_executable(bit_physics_lbm_me_tests
      tests/test_main.cpp
      tests/test_lbm_me.cpp
    )
    target_link_libraries(bit_physics_lbm_me_tests PRIVATE
      bit_physics_lbm_me
      doctest
    )
    add_test(NAME lbm_me_tests COMMAND bit_physics_lbm_me_tests)
    set_tests_properties(lbm_me_tests PROPERTIES
      ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
  endif()

  # --- frontier-vs-parent bounded equivalence (stage 1c; python harness) -----------
  find_program(UV_EXECUTABLE NAMES uv)
  if (UV_EXECUTABLE)
    add_test(NAME lbm_me_frontier_equivalence
      COMMAND ${UV_EXECUTABLE} run --no-sync python
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/python/test_frontier_equivalence.py
        $<TARGET_FILE:bit_physics_lbm_me_capture>)
    set_tests_properties(lbm_me_frontier_equivalence PROPERTIES
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../../tools/testkit)
  else()
    message(WARNING "uv not found: skipping lbm_me_frontier_equivalence ctest.")
  endif()
else()
  message(STATUS "lattice-boltzmann-d3q19-frontier-moment-encoded: Vulkan + HDF5 required; skipping.")
endif()

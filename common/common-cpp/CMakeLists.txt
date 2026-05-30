cmake_minimum_required(VERSION 3.28)

project(bit_physics_common_cpp
  VERSION 0.0.0
  DESCRIPTION "Bit-Physics common-cpp — capture I/O, determinism, Vulkan + render hooks"
  LANGUAGES CXX
)

# Phase 1 Stage 1 scaffold per charter docs/phases/phase-1-plan.md
# § 7.1 deliverables A-I. Vulkan device init / descriptor / swap chain
# and the ImGui / VDB / Alembic / USD export hooks ship as header-only
# surface declarations in this stage; runtime implementations land in
# subsequent per-sim implementation phases.

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

include(FetchContent)

# ---- Dependencies (FetchContent; pinned tags per spec § 9.1) -----

# nlohmann/json — header-only JSON. Pin to a recent release.
FetchContent_Declare(nlohmann_json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG v3.11.3
  GIT_SHALLOW TRUE
)

# doctest — single-header test framework. Pin to v2.4.11.
FetchContent_Declare(doctest
  GIT_REPOSITORY https://github.com/doctest/doctest.git
  GIT_TAG v2.4.11
  GIT_SHALLOW TRUE
)

set(JSON_BuildTests OFF CACHE BOOL "" FORCE)
set(DOCTEST_WITH_TESTS OFF CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(nlohmann_json doctest)

# Vulkan — system loader (libvulkan-dev). The IC-1/IC-3 (capture / determinism)
# surface does NOT depend on Vulkan and stays Vulkan-optional. The Stage-1a
# compute substrate (vulkan_compute) DOES require Vulkan and ships as a separate
# target gated on Vulkan_FOUND (additive — Convention A; does not regress the
# core lib's Vulkan-optionality).
find_package(Vulkan QUIET)

# SPIR-V toolchain (D9): glslangValidator compiles GLSL compute -> SPIR-V at
# build time. Stage-0 confirmed glslang 15.1.0 present; glslc absent (S0-CPPB4).
find_program(GLSLANG_VALIDATOR NAMES glslangValidator)

# ---- Core library (capture + determinism; Vulkan-optional) -------

add_library(bit_physics_common_cpp STATIC
  src/capture.cpp
  src/determinism.cpp
  src/hash.cpp
)
target_include_directories(bit_physics_common_cpp PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/include
)
target_link_libraries(bit_physics_common_cpp PUBLIC
  nlohmann_json::nlohmann_json
)
target_compile_features(bit_physics_common_cpp PUBLIC cxx_std_20)
if (Vulkan_FOUND)
  target_compile_definitions(bit_physics_common_cpp PUBLIC BIT_PHYSICS_HAS_VULKAN=1)
  target_link_libraries(bit_physics_common_cpp PUBLIC Vulkan::Vulkan)
else()
  target_compile_definitions(bit_physics_common_cpp PUBLIC BIT_PHYSICS_HAS_VULKAN=0)
endif()

# Charter § 4 (D6): register the namespaced target the Stack-C ports consume.
add_library(bit_physics::common_cpp ALIAS bit_physics_common_cpp)

# ---- SPIR-V build-time embedding helper (Stage 1a) ----------------
#
# bitphysics_embed_compute_shader(<out-var> <shader.comp> <c-array-name>)
# Compiles a GLSL compute shader to a `#pragma once` C header containing a
# `const uint32_t <c-array-name>[]` SPIR-V blob (glslangValidator --vn), emitted
# into ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders/. The compilation is
# deterministic: same shader + same glslang build => byte-identical SPIR-V
# (verified at the C-3 gate). Sets <out-var> to the generated header path.
function(bitphysics_embed_compute_shader OUT_VAR SHADER VARNAME)
  if (NOT GLSLANG_VALIDATOR)
    message(FATAL_ERROR "glslangValidator not found; cannot embed ${SHADER}")
  endif()
  get_filename_component(_shader_abs "${SHADER}" ABSOLUTE)
  get_filename_component(_shader_we "${SHADER}" NAME_WE)
  set(_gen_dir "${CMAKE_CURRENT_BINARY_DIR}/generated/shaders")
  set(_out "${_gen_dir}/${_shader_we}.spv.h")
  add_custom_command(
    OUTPUT "${_out}"
    COMMAND ${CMAKE_COMMAND} -E make_directory "${_gen_dir}"
    COMMAND ${GLSLANG_VALIDATOR} -V "${_shader_abs}" --vn ${VARNAME} -o "${_out}"
    DEPENDS "${_shader_abs}"
    COMMENT "common-cpp: ${SHADER} -> SPIR-V embedded header (${VARNAME})"
    VERBATIM
  )
  set(${OUT_VAR} "${_out}" PARENT_SCOPE)
endfunction()

# ---- Vulkan compute substrate (Stage 1a; requires Vulkan) --------

if (Vulkan_FOUND)
  add_library(bit_physics_common_cpp_vulkan STATIC
    src/vulkan_compute.cpp
  )
  target_link_libraries(bit_physics_common_cpp_vulkan PUBLIC
    bit_physics_common_cpp
    Vulkan::Vulkan
  )
  target_compile_features(bit_physics_common_cpp_vulkan PUBLIC cxx_std_20)
  add_library(bit_physics::common_cpp_vulkan ALIAS bit_physics_common_cpp_vulkan)
else()
  message(WARNING
    "Vulkan not found: skipping bit_physics_common_cpp_vulkan (compute substrate). "
    "Install libvulkan-dev + mesa-vulkan-drivers to build the Stack-C substrate.")
endif()

# ---- HDF5 capture-v1 (Stage 1b; requires libhdf5 + HighFive) -----
#
# D3/D8: system libhdf5-dev + header-only HighFive (highfive-devs fork). The
# capture-v1 writer/reader is a separate target gated on HDF5 (additive; the
# core lib's raw-binary capture stays HDF5-free). HighFive's CMake runs its own
# find_package(HDF5); on Ubuntu serial that resolves /usr/include/hdf5/serial.
find_package(HDF5 QUIET COMPONENTS C)
if (HDF5_FOUND)
  FetchContent_Declare(HighFive
    GIT_REPOSITORY https://github.com/highfive-devs/highfive.git
    GIT_TAG v2.10.1
    GIT_SHALLOW TRUE
  )
  set(HIGHFIVE_USE_BOOST OFF CACHE BOOL "" FORCE)
  set(HIGHFIVE_UNIT_TESTS OFF CACHE BOOL "" FORCE)
  set(HIGHFIVE_EXAMPLES OFF CACHE BOOL "" FORCE)
  set(HIGHFIVE_BUILD_DOCS OFF CACHE BOOL "" FORCE)
  FetchContent_MakeAvailable(HighFive)

  add_library(bit_physics_common_cpp_hdf5 STATIC
    src/capture_hdf5.cpp
  )
  target_link_libraries(bit_physics_common_cpp_hdf5 PUBLIC
    bit_physics_common_cpp
    HighFive
  )
  target_compile_features(bit_physics_common_cpp_hdf5 PUBLIC cxx_std_20)
  add_library(bit_physics::common_cpp_hdf5 ALIAS bit_physics_common_cpp_hdf5)
else()
  message(WARNING
    "HDF5 not found: skipping bit_physics_common_cpp_hdf5 (capture-v1). "
    "Install libhdf5-dev to build the Stack-C capture I/O surface.")
endif()

# ---- Smoke sim (Phase-1 host-C++ 1D advection; Stack-C 2D smoke = Stage 1c) ---

add_executable(bit_physics_common_cpp_smoke_advection_1d
  smoke/advection_1d.cpp
)
target_link_libraries(bit_physics_common_cpp_smoke_advection_1d PRIVATE
  bit_physics_common_cpp
)

# ---- Tests -------------------------------------------------------

enable_testing()

# ---- Sparse volumes (Phase 4.0 WU-B; bit_physics::nanovdb) -------
# Host-only NanoVDB sparse-volume writer/reader. Defined after the core lib
# (it links bit_physics_common_cpp for sha256_hex), after doctest is
# available, and after enable_testing() so its add_test registers. Registers
# its own ctest (common_cpp_nanovdb_tests).
add_subdirectory(nanovdb)

add_executable(bit_physics_common_cpp_tests
  tests/test_main.cpp
  tests/test_capture.cpp
  tests/test_determinism.cpp
)
target_link_libraries(bit_physics_common_cpp_tests PRIVATE
  bit_physics_common_cpp
  doctest
)
add_test(NAME common_cpp_tests COMMAND bit_physics_common_cpp_tests)

# Vulkan tests: C-3 substrate (reproduces baseline a7f85bd4…) + C-2 determinism
# socket (assert_deterministic_run 2-run bit-identical, incl. the NoContraction
# shader). Gated on Vulkan; run under the lavapipe pin (D14/D4).
if (Vulkan_FOUND)
  bitphysics_embed_compute_shader(DETERMINISM_PROBE_HEADER
    shaders/determinism_probe.comp kDeterminismProbeSpv)
  bitphysics_embed_compute_shader(DETERMINISM_NOCONTRACT_HEADER
    shaders/determinism_nocontract.comp kDeterminismNoContractSpv)
  add_executable(bit_physics_common_cpp_vulkan_tests
    tests/test_main.cpp
    tests/test_vulkan_substrate.cpp
    tests/test_determinism_socket.cpp
    ${DETERMINISM_PROBE_HEADER}
    ${DETERMINISM_NOCONTRACT_HEADER}
  )
  target_include_directories(bit_physics_common_cpp_vulkan_tests PRIVATE
    ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_link_libraries(bit_physics_common_cpp_vulkan_tests PRIVATE
    bit_physics_common_cpp_vulkan
    doctest
  )
  add_test(NAME common_cpp_vulkan_tests COMMAND bit_physics_common_cpp_vulkan_tests)
  # Lavapipe selection (D14) + determinism lever (D4) for the substrate/determinism tests.
  set_tests_properties(common_cpp_vulkan_tests PROPERTIES
    ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")
endif()

# HDF5 capture-v1 test (C-1): C++ write -> read-back round-trip (field + manifest
# equality). Gated on HDF5.
if (HDF5_FOUND)
  add_executable(bit_physics_common_cpp_hdf5_tests
    tests/test_main.cpp
    tests/test_capture_hdf5.cpp
  )
  target_link_libraries(bit_physics_common_cpp_hdf5_tests PRIVATE
    bit_physics_common_cpp_hdf5
    doctest
  )
  add_test(NAME common_cpp_hdf5_tests COMMAND bit_physics_common_cpp_hdf5_tests)
endif()

# ---- Stage 1c: 2D advection-diffusion smoke (C-4) ----------------
#
# The canonical end-to-end consumer: substrate + determinism socket +
# FloatControls/NoContraction + capture-v1. Requires Vulkan AND HDF5.
if (Vulkan_FOUND AND HDF5_FOUND)
  bitphysics_embed_compute_shader(ADV_DIFF_HEADER
    shaders/advection_diffusion_2d.comp kAdvectionDiffusion2dSpv)

  add_executable(bit_physics_common_cpp_smoke_advection_diffusion_2d
    smoke/advection_diffusion_2d_main.cpp
    smoke/advection_diffusion_2d.cpp
    ${ADV_DIFF_HEADER}
  )
  target_include_directories(bit_physics_common_cpp_smoke_advection_diffusion_2d PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/smoke
    ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_link_libraries(bit_physics_common_cpp_smoke_advection_diffusion_2d PRIVATE
    bit_physics_common_cpp_vulkan
    bit_physics_common_cpp_hdf5
  )

  add_executable(bit_physics_common_cpp_smoke_tests
    tests/test_main.cpp
    tests/test_smoke_advection_diffusion.cpp
    smoke/advection_diffusion_2d.cpp
    ${ADV_DIFF_HEADER}
  )
  target_include_directories(bit_physics_common_cpp_smoke_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/smoke
    ${CMAKE_CURRENT_BINARY_DIR}/generated/shaders
  )
  target_link_libraries(bit_physics_common_cpp_smoke_tests PRIVATE
    bit_physics_common_cpp_vulkan
    bit_physics_common_cpp_hdf5
    doctest
  )
  add_test(NAME common_cpp_smoke_tests COMMAND bit_physics_common_cpp_smoke_tests)
  set_tests_properties(common_cpp_smoke_tests PROPERTIES
    ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")

  # C-6 cross-stack format-interop: the Python testkit reader parses the
  # C++-emitted .h5 + compare_captures yields a verdict. Driven via uv from the
  # testkit workspace (so `capture` + `equivalence` import). The script sets the
  # lavapipe env for the smoke subprocess it spawns.
  find_program(UV_EXECUTABLE NAMES uv)
  if (UV_EXECUTABLE)
    add_test(NAME common_cpp_cross_language_interop
      COMMAND ${UV_EXECUTABLE} run --no-sync python
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/python/test_cross_language_interop.py
        $<TARGET_FILE:bit_physics_common_cpp_smoke_advection_diffusion_2d>)
    set_tests_properties(common_cpp_cross_language_interop PROPERTIES
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../../tools/testkit)
  else()
    message(WARNING "uv not found: skipping C-6 cross-language interop ctest.")
  endif()
endif()

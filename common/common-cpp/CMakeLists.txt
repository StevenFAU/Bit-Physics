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

# Vulkan — system loader only (libvulkan-dev). The IC-1/IC-3 surface
# does NOT depend on Vulkan; only the optional vulkan_init.hpp surface
# is gated on it.
find_package(Vulkan QUIET)

# ---- Library target ----------------------------------------------

add_library(bit_physics_common_cpp STATIC
  src/capture.cpp
  src/determinism.cpp
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

# ---- Smoke sim ---------------------------------------------------

add_executable(bit_physics_common_cpp_smoke_advection_1d
  smoke/advection_1d.cpp
)
target_link_libraries(bit_physics_common_cpp_smoke_advection_1d PRIVATE
  bit_physics_common_cpp
)

# ---- Tests -------------------------------------------------------

enable_testing()
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

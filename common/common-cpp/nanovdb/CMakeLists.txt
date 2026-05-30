# bit_physics::nanovdb — sparse-volume C++ surface (Phase 4.0 WU-B).
#
# Consumes the vendored header-only NanoVDB (references/openvdb/nanovdb,
# OpenVDB v13.0.0, Apache-2.0). Host-only (CPU) build — no CUDA, no TBB/Boost
# (the vendored subset is the non-CUDA host headers). Added to the parent build
# via add_subdirectory(nanovdb) in common/common-cpp/CMakeLists.txt.

# Vendored NanoVDB include root: the directory CONTAINING `nanovdb/` so that
# `#include <nanovdb/...>` resolves. references/ is two levels above common-cpp.
set(BP_NANOVDB_VENDOR "${CMAKE_CURRENT_SOURCE_DIR}/../../../references/openvdb")

add_library(bit_physics_nanovdb STATIC
  src/io.cpp
)
target_include_directories(bit_physics_nanovdb
  PUBLIC
    "${CMAKE_CURRENT_SOURCE_DIR}/include"
  PRIVATE
    "${BP_NANOVDB_VENDOR}"
)
# hash.hpp / sha256_hex for the active-mask topology hash.
target_link_libraries(bit_physics_nanovdb PUBLIC bit_physics_common_cpp)
target_compile_features(bit_physics_nanovdb PUBLIC cxx_std_20)

# ---- Tests (doctest + ctest) --------------------------------------------
add_executable(bit_physics_nanovdb_tests tests/test_io.cpp)
target_link_libraries(bit_physics_nanovdb_tests PRIVATE
  bit_physics_nanovdb
  doctest
)
add_test(NAME common_cpp_nanovdb_tests COMMAND bit_physics_nanovdb_tests)

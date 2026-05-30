// SPDX-License-Identifier: Apache-2.0
// bit_physics::nanovdb round-trip tests (Phase 4.0 WU-B).

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <filesystem>

#include "bit_physics/nanovdb/io.hpp"

namespace nv = bit_physics::nanovdb;

namespace {
std::filesystem::path tmp_nvdb(const char* name) {
    return std::filesystem::temp_directory_path() / name;
}
}  // namespace

TEST_CASE("sparse volume write -> read round-trips active voxels and values") {
    const auto path = tmp_nvdb("bp_wu_b_roundtrip.nvdb");
    {
        nv::SparseVolumeWriter w(0.0F, "density");
        w.set_voxel(0, 0, 0, 1.0F);
        w.set_voxel(5, 2, 3, 2.5F);
        w.set_voxel(5, 2, 4, -1.0F);
        CHECK(w.active_count() == 3);
        CHECK(w.write(path) == 3);
    }
    nv::SparseVolumeReader r(path);
    CHECK(r.active_count() == 3);
    CHECK(r.background() == doctest::Approx(0.0F));
    CHECK(r.value_at(5, 2, 3) == doctest::Approx(2.5F));
    CHECK(r.value_at(5, 2, 4) == doctest::Approx(-1.0F));
    CHECK(r.value_at(0, 0, 0) == doctest::Approx(1.0F));
    CHECK(r.is_active(5, 2, 3));
    // An inactive voxel reads the background and reports inactive.
    CHECK_FALSE(r.is_active(7, 7, 7));
    CHECK(r.value_at(7, 7, 7) == doctest::Approx(0.0F));
    std::filesystem::remove(path);
}

TEST_CASE("extract_active_mask returns sorted coords + a stable topology hash") {
    const auto path = tmp_nvdb("bp_wu_b_mask.nvdb");
    nv::SparseVolumeWriter w(0.0F, "density");
    w.set_voxel(5, 2, 4, 1.0F);
    w.set_voxel(0, 0, 0, 1.0F);
    w.set_voxel(5, 2, 3, 1.0F);
    w.write(path);

    nv::SparseVolumeReader r(path);
    const nv::ActiveMask mask = nv::extract_active_mask(r);
    CHECK(mask.active_count() == 3);
    // Sorted ascending.
    CHECK(mask.coords.front() == std::array<int32_t, 3>{0, 0, 0});
    CHECK(mask.coords.back() == std::array<int32_t, 3>{5, 2, 4});
    // Topology hash is a 64-hex sha256 and is deterministic across two reads.
    CHECK(mask.topology_hash.size() == 64);
    nv::SparseVolumeReader r2(path);
    CHECK(nv::extract_active_mask(r2).topology_hash == mask.topology_hash);
    std::filesystem::remove(path);
}

TEST_CASE("overwriting a voxel does not double-count it") {
    nv::SparseVolumeWriter w(0.0F, "density");
    w.set_voxel(1, 1, 1, 1.0F);
    w.set_voxel(1, 1, 1, 9.0F);  // overwrite
    CHECK(w.active_count() == 1);
}

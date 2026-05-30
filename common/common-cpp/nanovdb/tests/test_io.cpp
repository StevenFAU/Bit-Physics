// SPDX-License-Identifier: Apache-2.0
// bit_physics::nanovdb round-trip tests (Phase 4.0 WU-B).

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <array>
#include <cstdint>
#include <filesystem>
#include <map>
#include <random>
#include <set>

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

// Property-based (§ 2.14) — randomized sparsity patterns. The write happens in
// C++ (Warp grid allocation is CUDA-only, so the host writer owns the write
// side on CPU), so the two declared sparse-volume invariants are exercised here
// over many random patterns with a seeded RNG.
TEST_CASE("PBT: random sparsity write->read round-trips membership + values") {
    std::mt19937 rng(20260530U);
    std::uniform_int_distribution<int32_t> coord(-16, 16);
    std::uniform_real_distribution<float> val(-10.0F, 10.0F);
    const auto path = tmp_nvdb("bp_wu_b_pbt.nvdb");

    for (int trial = 0; trial < 40; ++trial) {
        std::map<std::array<int32_t, 3>, float> truth;
        const int n = 1 + static_cast<int>(rng() % 40);
        nv::SparseVolumeWriter w(0.0F, "density");
        for (int i = 0; i < n; ++i) {
            std::array<int32_t, 3> c{coord(rng), coord(rng), coord(rng)};
            float v = val(rng);
            w.set_voxel(c[0], c[1], c[2], v);
            truth[c] = v;  // last write wins (matches grid semantics)
        }
        w.write(path);
        nv::SparseVolumeReader r(path);

        // Invariant 1: active-mask membership preserved through write->read.
        const auto mask = nv::extract_active_mask(r);
        std::set<std::array<int32_t, 3>> read_active(mask.coords.begin(), mask.coords.end());
        CHECK(read_active.size() == truth.size());
        for (const auto& [c, v] : truth) {
            CHECK(r.is_active(c[0], c[1], c[2]));
            CHECK(r.value_at(c[0], c[1], c[2]) == doctest::Approx(v));
        }

        // Invariant 2: reads of inactive cells return the documented sparse
        // default (the grid background). Probe coords NOT in the active set.
        for (int probe = 0; probe < 20; ++probe) {
            std::array<int32_t, 3> c{coord(rng), coord(rng), coord(rng)};
            if (truth.count(c) == 0U) {
                CHECK_FALSE(r.is_active(c[0], c[1], c[2]));
                CHECK(r.value_at(c[0], c[1], c[2]) == doctest::Approx(0.0F));
            }
        }
    }
    std::filesystem::remove(path);
}

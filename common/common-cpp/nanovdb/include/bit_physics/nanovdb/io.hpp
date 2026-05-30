// SPDX-License-Identifier: Apache-2.0
// Bit-Physics sparse-volume C++ surface (Phase 4.0 WU-B).
//
// `bit_physics::nanovdb` wraps the vendored header-only NanoVDB
// (references/openvdb/nanovdb, OpenVDB v13.0.0, Apache-2.0) behind a small
// pimpl surface so consumers do NOT pull the heavy NanoVDB headers. It builds
// sparse float grids from explicit active voxels and serialises them to the
// canonical `.nvdb` format that `common_warp.sparse.SparseVolume` loads via
// `wp.Volume.load_from_nvdb` (CPU-capable — the load path does not require
// CUDA; grid *allocation* in Warp does, hence the C++/host writer here).
//
// Naming discipline: this `bit_physics::nanovdb` namespace is the project's
// wrapper; the upstream library lives in `::nanovdb`. Implementation code
// fully-qualifies `::nanovdb::` to avoid the nested-name ambiguity.
#ifndef BIT_PHYSICS_NANOVDB_IO_HPP
#define BIT_PHYSICS_NANOVDB_IO_HPP

#include <array>
#include <cstdint>
#include <filesystem>
#include <memory>
#include <string>
#include <vector>

namespace bit_physics::nanovdb {

// Active-cell topology of a sparse volume: the sorted list of active voxel
// ijk coordinates plus a content hash of that topology (spec § 4.3
// `active_mask.topology_hash`).
struct ActiveMask {
    std::vector<std::array<int32_t, 3>> coords;  // sorted ascending (i,j,k)
    std::string topology_hash;                   // sha256 hex of the sorted coords

    [[nodiscard]] std::size_t active_count() const { return coords.size(); }
};

// Builds a sparse float grid from explicit active voxels and writes `.nvdb`.
class SparseVolumeWriter {
public:
    explicit SparseVolumeWriter(float background = 0.0F, std::string grid_name = "density");
    ~SparseVolumeWriter();
    SparseVolumeWriter(SparseVolumeWriter&&) noexcept;
    SparseVolumeWriter& operator=(SparseVolumeWriter&&) noexcept;
    SparseVolumeWriter(const SparseVolumeWriter&) = delete;
    SparseVolumeWriter& operator=(const SparseVolumeWriter&) = delete;

    // Activate voxel (i,j,k) with `value`. Re-setting a voxel overwrites it.
    void set_voxel(int32_t i, int32_t j, int32_t k, float value);

    [[nodiscard]] std::size_t active_count() const;

    // Serialise to `<path>` (`.nvdb`, uncompressed). Returns the active count.
    std::size_t write(const std::filesystem::path& path) const;

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// Reads a `.nvdb` sparse float grid and queries it.
class SparseVolumeReader {
public:
    explicit SparseVolumeReader(const std::filesystem::path& path);
    ~SparseVolumeReader();
    SparseVolumeReader(SparseVolumeReader&&) noexcept;
    SparseVolumeReader& operator=(SparseVolumeReader&&) noexcept;
    SparseVolumeReader(const SparseVolumeReader&) = delete;
    SparseVolumeReader& operator=(const SparseVolumeReader&) = delete;

    // Value at (i,j,k); returns the grid background for inactive voxels.
    [[nodiscard]] float value_at(int32_t i, int32_t j, int32_t k) const;
    [[nodiscard]] bool is_active(int32_t i, int32_t j, int32_t k) const;
    [[nodiscard]] std::size_t active_count() const;
    [[nodiscard]] float background() const;

    // The active-cell topology (sorted coords + topology hash).
    [[nodiscard]] ActiveMask active_mask() const;

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// Free-function form of `reader.active_mask()` (spec § 4.2.B surface).
[[nodiscard]] ActiveMask extract_active_mask(const SparseVolumeReader& reader);

}  // namespace bit_physics::nanovdb

#endif  // BIT_PHYSICS_NANOVDB_IO_HPP

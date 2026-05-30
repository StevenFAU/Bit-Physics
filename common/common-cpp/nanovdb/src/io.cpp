// SPDX-License-Identifier: Apache-2.0
// bit_physics::nanovdb implementation (Phase 4.0 WU-B).
//
// The heavy NanoVDB headers are confined to this translation unit (pimpl), so
// consumers of io.hpp do not pay their compile cost. All upstream symbols are
// fully-qualified `::nanovdb::` to keep them distinct from the wrapper's own
// `bit_physics::nanovdb` namespace.

#include "bit_physics/nanovdb/io.hpp"

#include <algorithm>
#include <cstring>
#include <set>
#include <stdexcept>

#include <nanovdb/NanoVDB.h>
#include <nanovdb/io/IO.h>
#include <nanovdb/tools/CreateNanoGrid.h>

#include "bit_physics/common/hash.hpp"

namespace bit_physics::nanovdb {

namespace {

std::string hash_coords(const std::vector<std::array<int32_t, 3>>& coords) {
    // sha256 over the little-endian int32 triples in sorted order — a stable
    // content hash of the active-cell topology.
    std::vector<unsigned char> bytes;
    bytes.reserve(coords.size() * 12);
    for (const auto& c : coords) {
        for (int32_t v : c) {
            const auto* p = reinterpret_cast<const unsigned char*>(&v);
            bytes.insert(bytes.end(), p, p + sizeof(int32_t));
        }
    }
    return bit_physics::common_cpp::hash::sha256_hex(bytes);
}

}  // namespace

// ---- SparseVolumeWriter -------------------------------------------------

struct SparseVolumeWriter::Impl {
    ::nanovdb::tools::build::Grid<float> grid;
    // The host build accessor does not expose an active count; track the set
    // of activated coords ourselves (overwriting a voxel does not double-count).
    std::set<std::array<int32_t, 3>> active;
    explicit Impl(float background, const std::string& name) : grid(background, name) {}
};

SparseVolumeWriter::SparseVolumeWriter(float background, std::string grid_name)
    : impl_(std::make_unique<Impl>(background, grid_name)) {}

SparseVolumeWriter::~SparseVolumeWriter() = default;
SparseVolumeWriter::SparseVolumeWriter(SparseVolumeWriter&&) noexcept = default;
SparseVolumeWriter& SparseVolumeWriter::operator=(SparseVolumeWriter&&) noexcept = default;

void SparseVolumeWriter::set_voxel(int32_t i, int32_t j, int32_t k, float value) {
    impl_->grid.getAccessor().setValue(::nanovdb::Coord(i, j, k), value);
    impl_->active.insert({i, j, k});
}

std::size_t SparseVolumeWriter::active_count() const { return impl_->active.size(); }

std::size_t SparseVolumeWriter::write(const std::filesystem::path& path) const {
    auto handle = ::nanovdb::tools::createNanoGrid(impl_->grid);
    ::nanovdb::io::writeGrid(path.string(), handle, ::nanovdb::io::Codec::NONE);
    return handle.grid<float>()->activeVoxelCount();
}

// ---- SparseVolumeReader -------------------------------------------------

struct SparseVolumeReader::Impl {
    ::nanovdb::GridHandle<::nanovdb::HostBuffer> handle;
    const ::nanovdb::FloatGrid* grid = nullptr;
};

SparseVolumeReader::SparseVolumeReader(const std::filesystem::path& path)
    : impl_(std::make_unique<Impl>()) {
    impl_->handle = ::nanovdb::io::readGrid(path.string());
    impl_->grid = impl_->handle.grid<float>();
    if (impl_->grid == nullptr) {
        throw std::runtime_error("bit_physics::nanovdb: no float grid in " + path.string());
    }
}

SparseVolumeReader::~SparseVolumeReader() = default;
SparseVolumeReader::SparseVolumeReader(SparseVolumeReader&&) noexcept = default;
SparseVolumeReader& SparseVolumeReader::operator=(SparseVolumeReader&&) noexcept = default;

float SparseVolumeReader::value_at(int32_t i, int32_t j, int32_t k) const {
    return impl_->grid->tree().getValue(::nanovdb::Coord(i, j, k));
}

bool SparseVolumeReader::is_active(int32_t i, int32_t j, int32_t k) const {
    return impl_->grid->tree().isActive(::nanovdb::Coord(i, j, k));
}

std::size_t SparseVolumeReader::active_count() const {
    return impl_->grid->activeVoxelCount();
}

float SparseVolumeReader::background() const { return impl_->grid->tree().background(); }

ActiveMask SparseVolumeReader::active_mask() const {
    ActiveMask mask;
    const auto count = impl_->grid->activeVoxelCount();
    mask.coords.reserve(static_cast<std::size_t>(count));
    // Iterate active voxels via the grid's index bounding box.
    const auto bbox = impl_->grid->indexBBox();
    for (auto it = bbox.begin(); it; ++it) {
        const ::nanovdb::Coord c = *it;
        if (impl_->grid->tree().isActive(c)) {
            mask.coords.push_back({c.x(), c.y(), c.z()});
        }
    }
    std::sort(mask.coords.begin(), mask.coords.end());
    mask.topology_hash = hash_coords(mask.coords);
    return mask;
}

ActiveMask extract_active_mask(const SparseVolumeReader& reader) { return reader.active_mask(); }

}  // namespace bit_physics::nanovdb

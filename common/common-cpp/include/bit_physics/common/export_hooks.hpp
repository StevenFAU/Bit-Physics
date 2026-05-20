// Phase 1 Stage 1 — OpenVDB / Alembic / USD export hook surfaces.
//
// Per charter § 7.1 deliverable D: header-only declarations only.
// Bodies in this header throw a `std::logic_error` so callers
// noticing the deferred implementation surface it clearly at runtime
// rather than silently no-op'ing.

#pragma once

#include <cstdint>
#include <filesystem>
#include <stdexcept>
#include <string>
#include <vector>

namespace bit_physics::common_cpp::exports {

struct VdbVolumeOptions {
    float voxel_size = 1.0f;
    std::string grid_name = "density";
};
struct AlembicParticleOptions {
    double fps = 24.0;
    std::string archive_name = "particles.abc";
};
struct UsdSceneOptions {
    double fps = 24.0;
    std::string layer_name = "scene.usd";
};

inline std::filesystem::path export_volume_to_vdb(
    const std::filesystem::path&,
    const std::vector<float>&,
    const VdbVolumeOptions& = {})
{
    throw std::logic_error(
        "common-cpp VDB export is a Phase 1 Stage 1 surface stub; "
        "implementation deferred to a per-sim phase that vendors "
        "OpenVDB (see docs/common/cpp.md).");
}

inline std::filesystem::path export_particles_to_alembic(
    const std::filesystem::path&,
    const std::vector<std::vector<float>>&,
    const AlembicParticleOptions& = {})
{
    throw std::logic_error(
        "common-cpp Alembic export is a Phase 1 Stage 1 surface stub; "
        "implementation deferred to a per-sim phase that vendors "
        "Alembic (see docs/common/cpp.md).");
}

inline std::filesystem::path export_scene_to_usd(
    const std::filesystem::path&,
    const UsdSceneOptions& = {})
{
    throw std::logic_error(
        "common-cpp USD export is a Phase 1 Stage 1 surface stub; "
        "implementation deferred to a per-sim phase that vendors "
        "USD (see docs/common/cpp.md).");
}

}  // namespace bit_physics::common_cpp::exports

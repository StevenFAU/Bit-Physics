// 2D advection-diffusion Vulkan-compute smoke (Stage 1c; gate C-4).
//
// The canonical consumer of the matured common-cpp surface: exercises the
// Vulkan compute substrate + determinism socket + FloatControls/NoContraction
// discipline + HDF5 capture-v1 end-to-end. Bounded/stable by design (§L.4).
// Factored as a reusable function so the smoke executable + the C-4 test both
// drive it.

#pragma once

#include <cstdint>
#include <filesystem>
#include <vector>

namespace bit_physics::common_cpp::smoke {

struct AdvDiffConfig {
    uint32_t nx = 64;
    uint32_t ny = 64;
    uint32_t steps = 400;
    uint32_t capture_interval = 40;
    float dt = 0.02f;
    float dx = 1.0f / 64.0f;
    float diff = 1.0e-3f;   // diffusion-dominated -> decaying (bounded/stable)
    float vx = 0.1f;        // upwind advection requires vx, vy >= 0
    float vy = 0.1f;
    uint64_t seed = 42;
};

struct AdvDiffResult {
    std::vector<uint32_t> captured_steps;       // step numbers captured
    std::vector<float> max_field_trajectory;    // max|u| at each captured step
    std::vector<unsigned char> final_field;     // nx*ny f32 bytes (determinism witness)
    float initial_max = 0.0f;
    float final_max = 0.0f;
    bool bounded = false;       // finite + max never exceeds initial_max (+eps)
    bool monotone_nonincreasing = false;
};

// Run the smoke. If `capture_manifest` is non-null, writes a capture-v1 capture
// (.h5 + .json sidecar) at that path via Hdf5Writer. Determinism is structural
// (no atomics, NoContraction shader, lavapipe LP_NUM_THREADS=0): repeated runs
// with the same config are bit-identical.
AdvDiffResult run_advection_diffusion(const AdvDiffConfig& cfg,
                                      const std::filesystem::path* capture_manifest = nullptr);

}  // namespace bit_physics::common_cpp::smoke

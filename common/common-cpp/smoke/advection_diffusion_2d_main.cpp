// Entry point for the 2D advection-diffusion Vulkan-compute smoke (Stage 1c).
// Writes a capture-v1 capture and prints the max-field trajectory (§L.4).
//
// Run under the lavapipe pin:
//   VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json LP_NUM_THREADS=0 \
//     ./bit_physics_common_cpp_smoke_advection_diffusion_2d [out_dir]

#include <cstdio>
#include <filesystem>

#include "advection_diffusion_2d.hpp"

namespace smoke = bit_physics::common_cpp::smoke;

int main(int argc, char** argv) {
    std::filesystem::path out_dir = "captures/common-cpp-smoke";
    if (argc > 1) out_dir = argv[1];
    std::filesystem::create_directories(out_dir);
    auto manifest = out_dir / "advection-diffusion-2d-64sq-seed42-step400.json";

    smoke::AdvDiffConfig cfg;
    smoke::AdvDiffResult r = smoke::run_advection_diffusion(cfg, &manifest);

    std::printf("advection-diffusion-2d %ux%u, %u steps; initial_max=%.6f final_max=%.6f\n",
                cfg.nx, cfg.ny, cfg.steps, r.initial_max, r.final_max);
    std::printf("max-field trajectory (every %u steps):\n", cfg.capture_interval);
    for (size_t i = 0; i < r.captured_steps.size(); ++i) {
        std::printf("  step %4u  max=%.6f\n", r.captured_steps[i],
                    r.max_field_trajectory[i]);
    }
    std::printf("bounded=%s monotone_nonincreasing=%s\n",
                r.bounded ? "true" : "false",
                r.monotone_nonincreasing ? "true" : "false");
    std::printf("wrote %s\n", manifest.string().c_str());
    return r.bounded ? 0 : 1;
}

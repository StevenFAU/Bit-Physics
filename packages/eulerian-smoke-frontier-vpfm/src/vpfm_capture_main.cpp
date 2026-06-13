// Canonical capture writer — taylor-green-128cube-seed42-step500 (Appendix D.2.3 row).
//
// Usage: vpfm_capture <out_manifest.json> [--n N] [--steps N] [--tg2d]
//   default = the canonical 128³ / 500-step / dt 0.005 / seed-42 3D Taylor-Green
//   configuration; --tg2d switches to the z-invariant steady-anchor IC (test fixture).

#include <cstdlib>
#include <cstring>
#include <iostream>

#include "bit_physics/vpfm/vpfm.hpp"

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "usage: vpfm_capture <out_manifest.json> [--n N] [--steps N]"
                     " [--tg2d]\n";
        return 2;
    }
    bit_physics::vpfm::VpfmConfig cfg;
    std::filesystem::path out = argv[1];
    for (int i = 2; i < argc; ++i) {
        if (std::strcmp(argv[i], "--n") == 0 && i + 1 < argc)
            cfg.n = static_cast<uint32_t>(std::atoi(argv[++i]));
        if (std::strcmp(argv[i], "--steps") == 0 && i + 1 < argc)
            cfg.steps = static_cast<uint32_t>(std::atoi(argv[++i]));
        if (std::strcmp(argv[i], "--tg2d") == 0)
            cfg.ic = bit_physics::vpfm::InitialCondition::kTaylorGreen2DZInvariant;
        // diagnostic mode: override the reinit cadences (flow-map-length tuning)
        if (std::strcmp(argv[i], "--nv") == 0 && i + 1 < argc)
            cfg.n_v = static_cast<uint32_t>(std::atoi(argv[++i]));
        if (std::strcmp(argv[i], "--ng") == 0 && i + 1 < argc)
            cfg.n_g = static_cast<uint32_t>(std::atoi(argv[++i]));
    }
    auto result = bit_physics::vpfm::run_vpfm(cfg, &out);
    std::cout << "frames=" << result.frames.size()
              << " witness=" << result.determinism_witness_sha256
              << " init_residual=" << result.init_velocity_residual
              << " E0=" << result.energy_initial << " ET=" << result.energy_final
              << " div_max=" << result.max_div_postproj
              << " total_vort_max=" << result.max_total_vorticity << "\n";
    return 0;
}

// Canonical capture writer — taylor-green-128cube-seed42-step500 (Appendix D.2.3 row).
//
// Usage: vpfm_capture <out_manifest.json> [--n N] [--steps N] [--tg2d] [--dt DT]
//   default grid = 128³ / 500-step / seed-42 3D Taylor-Green. The CANONICAL capture is
//   taken at --dt 0.00125 (the measured CFL-safe fixed dt at 128³ — see the --dt note
//   below; descriptor dt 0.005 blows up by step 250 at this resolution). --tg2d switches
//   to the z-invariant steady-anchor IC (test fixture, dt 0.005).

#include <cstdlib>
#include <cstring>
#include <iostream>

#include "bit_physics/vpfm/vpfm.hpp"

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "usage: vpfm_capture <out_manifest.json> [--n N] [--steps N]"
                     " [--tg2d] [--dt DT]\n";
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
        // Fixed-dt override (the documented fixed-dt adaptation point — § 1). The 128³
        // canonical is captured at --dt 0.00125: the MEASURED CFL boundary at n=128 is
        // u_max ≈ 1/(n·dt); the descriptor dt 0.005 (CFL ceiling 1.56) is crossed by the
        // inviscid-TG cascade and blows up by step 250, whereas dt 0.00125 (CFL ceiling
        // 6.25 — the measured-safe boundary from the n∈{32,64} sweep) keeps the run a
        // well-conditioned pre-cascade window for all 500 steps (stage-1c SHIFT, charter
        // § 0.3). Fixture/test paths omit the flag → dt stays 0.005.
        if (std::strcmp(argv[i], "--dt") == 0 && i + 1 < argc)
            cfg.dt = std::atof(argv[++i]);
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

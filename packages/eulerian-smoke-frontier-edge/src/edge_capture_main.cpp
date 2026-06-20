// Canonical capture writer — taylor-green-128cube-seed42-step500 (Appendix D.2.3 row).
//
// Usage: edge_capture <out_manifest.json> [--n N] [--steps N] [--tg2d] [--dt DT]
//                     [--reinit L]
//   default grid = 128³ / 500-step / seed-42 3D Taylor-Green. The CANONICAL capture dt
//   is MEASURED-then-declared at stage 1c (the CFL-safe fixed dt at 128³ — the U-5
//   lesson: the descriptor 0.005 is NOT assumed; EDGE re-derives its boundary at build).
//   --reinit sets the flow-map length L (the O(1)-memory lever). --tg2d switches to the
//   z-invariant steady-anchor IC. At stage 1a run_edge is a RED stub — this executable
//   builds and links but exits non-zero (the stub throws) until stage 1b.

#include <cstdlib>
#include <cstring>
#include <iostream>

#include "bit_physics/edge/edge.hpp"

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "usage: edge_capture <out_manifest.json> [--n N] [--steps N]"
                     " [--tg2d] [--dt DT] [--reinit L]\n";
        return 2;
    }
    bit_physics::edge::EdgeConfig cfg;
    std::filesystem::path out = argv[1];
    for (int i = 2; i < argc; ++i) {
        if (std::strcmp(argv[i], "--n") == 0 && i + 1 < argc)
            cfg.n = static_cast<uint32_t>(std::atoi(argv[++i]));
        if (std::strcmp(argv[i], "--steps") == 0 && i + 1 < argc)
            cfg.steps = static_cast<uint32_t>(std::atoi(argv[++i]));
        if (std::strcmp(argv[i], "--tg2d") == 0)
            cfg.ic = bit_physics::edge::InitialCondition::kTaylorGreen2DZInvariant;
        if (std::strcmp(argv[i], "--reinit") == 0 && i + 1 < argc)
            cfg.reinit_interval = static_cast<uint32_t>(std::atoi(argv[++i]));
        // Fixed-dt override (the documented fixed-dt adaptation point). The 128³
        // canonical dt is sized at stage 1c from the measured CFL boundary — do NOT
        // assume the descriptor 0.005 (U-5 lesson). Fixture/test paths omit the flag.
        if (std::strcmp(argv[i], "--dt") == 0 && i + 1 < argc)
            cfg.dt = std::atof(argv[++i]);
    }
    auto result = bit_physics::edge::run_edge(cfg, &out);
    std::cout << "frames=" << result.frames.size()
              << " witness=" << result.determinism_witness_sha256
              << " init_residual=" << result.init_velocity_residual
              << " E0=" << result.energy_initial << " ET=" << result.energy_final
              << " div_max=" << result.max_div_postproj
              << " total_vort_max=" << result.max_total_vorticity
              << " bwd_map_peak_bytes=" << result.backward_map_peak_bytes << "\n";
    return 0;
}

// Canonical capture writer — poiseuille-64x32-seed42-step1000 (Appendix D.2.3 row).
//
// Usage: lbm_me_capture <out_manifest.json> [--f64] [--steps N]
//   default = quantized (frontier) mode at the canonical config; --f64 runs the
//   pure-f64 Stack-C path (the parent-witness mode).

#include <cstdlib>
#include <cstring>
#include <iostream>

#include "bit_physics/lbm_d3q19_me/lbm_me.hpp"

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "usage: lbm_me_capture <out_manifest.json> [--f64] [--steps N]\n";
        return 2;
    }
    bit_physics::lbm_d3q19_me::LbmConfig cfg;
    std::filesystem::path out = argv[1];
    for (int i = 2; i < argc; ++i) {
        if (std::strcmp(argv[i], "--f64") == 0) cfg.quantize = false;
        if (std::strcmp(argv[i], "--steps") == 0 && i + 1 < argc)
            cfg.steps = static_cast<uint32_t>(std::atoi(argv[++i]));
    }
    auto result = bit_physics::lbm_d3q19_me::run_lbm(cfg, &out);
    std::cout << "frames=" << result.frames.size()
              << " witness=" << result.determinism_witness_sha256
              << " mass0=" << result.total_mass_initial
              << " massT=" << result.total_mass_final << "\n";
    return 0;
}

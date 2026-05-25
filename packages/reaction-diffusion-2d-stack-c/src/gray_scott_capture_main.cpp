// Canonical capture writer — reaction-diffusion-2d Stack-C.
//
// Usage: <ref_manifest.json> <out_manifest.json>
// Loads the canonical IC from the Phase-1 reference capture (S1b-RD2C1), runs
// the canonical gray-scott-lambda-128sq-seed42-step2000 trajectory, and writes a
// capture-v1 .h5 (+ .json) at <out_manifest.json>.

#include <cstdio>
#include <filesystem>

#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

namespace rd = bit_physics::reaction_diffusion_2d_stack_c;

int main(int argc, char** argv) {
    if (argc != 3) {
        std::fprintf(stderr, "usage: %s <ref_manifest.json> <out_manifest.json>\n", argv[0]);
        return 2;
    }
    std::filesystem::path ref = argv[1];
    std::filesystem::path out = argv[2];
    rd::Fields ic = rd::load_reference_ic(ref);
    rd::GrayScottConfig cfg;  // canonical defaults
    rd::GrayScottResult r = rd::run_gray_scott(cfg, ic, &out);
    std::printf("captured %zu frames; bounded=%d; determinism_witness=%s\n",
                r.captured_steps.size(), r.bounded, r.determinism_witness.c_str());
    return 0;
}

// gates 4-13 surface (Stage 1b GREEN). One canonical run exercises gate-5
// (fields), gate-7 (2-run determinism witness; O-2 ckpt 3), gate-9 (bounded,
// §L.4). IC sourced from the Phase-1 reference (S1b-RD2C1; RD2D_REF_MANIFEST).

#include <doctest/doctest.h>

#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

namespace rd = bit_physics::reaction_diffusion_2d_stack_c;

#ifndef RD2D_REF_MANIFEST
#error "RD2D_REF_MANIFEST must be defined (path to the Phase-1 reference .json)"
#endif

TEST_CASE("GREEN[gate-5/7/9] canonical run: fields + determinism + bounded") {
    rd::GrayScottConfig cfg;  // canonical 128^2 step2000
    rd::Fields ic = rd::load_reference_ic(RD2D_REF_MANIFEST);
    REQUIRE(ic.u.size() == static_cast<size_t>(cfg.n) * cfg.n);

    rd::GrayScottResult r = rd::run_gray_scott(cfg, ic);

    CHECK(r.final_u.size() == static_cast<size_t>(cfg.n) * cfg.n);   // gate-5
    CHECK(r.final_v.size() == static_cast<size_t>(cfg.n) * cfg.n);
    CHECK(r.captured_steps.size() == 11u);                           // steps 0,200,...,2000
    CHECK_FALSE(r.determinism_witness.empty());                      // gate-7 (O-2 ckpt 3)
    CHECK(r.bounded);                                                // gate-9 (§L.4)
}

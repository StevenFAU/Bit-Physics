// RED failing tests — gates 4-13 surface (Stage 1a). These pin the Stage-1b
// contract; they FAIL RED now because the impl is a stub (throws NotImplemented).
//
// gate-5 reference-sanity / gate-7 determinism / gate-9 diagnostics (bounded,
// §L.4) map onto run_gray_scott; the canonical step-1 faithfulness (the gate-14
// precursor measured 0.0 at the refresh probe) is asserted here against the
// NumPy reference once Stage 1b implements the kernel.

#include <doctest/doctest.h>

#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

namespace rd = bit_physics::reaction_diffusion_2d_stack_c;

TEST_CASE("RED[gate-5] canonical run produces n*n f64 fields") {
    rd::GrayScottConfig cfg;  // canonical 128^2
    // Stage 1b: this returns populated fields. Stage 1a: stub throws -> RED.
    rd::GrayScottResult r = rd::run_gray_scott(cfg);
    CHECK(r.final_u.size() == static_cast<size_t>(cfg.n) * cfg.n);
    CHECK(r.final_v.size() == static_cast<size_t>(cfg.n) * cfg.n);
    CHECK(r.captured_steps.size() == 11u);  // steps 0,200,...,2000
}

TEST_CASE("RED[gate-9] trajectory is bounded/dissipative (§L.4)") {
    rd::GrayScottResult r = rd::run_gray_scott(rd::GrayScottConfig{});
    CHECK(r.bounded);
}

TEST_CASE("RED[gate-7] determinism witness is present (2-run bit-exact, Q-CPP1)") {
    rd::GrayScottResult r = rd::run_gray_scott(rd::GrayScottConfig{});
    CHECK_FALSE(r.determinism_witness.empty());
}

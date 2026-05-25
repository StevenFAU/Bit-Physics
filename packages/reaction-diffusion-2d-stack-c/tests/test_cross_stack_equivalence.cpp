// RED failing test — gate-14 cross-stack equivalence fixture (Stage 1a).
//
// gate-14 compares the Stack-C RIGHT capture (Vulkan/C++ f64) against the
// Phase-1 NumPy f64 LEFT reference
// (captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json})
// at the reaction-diffusion category (rel=1e-4, abs=0.0) via compare_captures.
// Predicted shape (a) BIT-EXACT (within_tolerance=True, max_abs_err=0.0) —
// grounded in the refresh-probe step-1 measurement of EXACTLY 0.0.
//
// Stage 1a: the RIGHT capture does NOT yet exist (Stage 1c emits it). This test
// asserts the writer path exists and FAILS RED (run_gray_scott stub throws),
// marking the gate-14 fixture absent per charter §2 Stage-1a row.

#include <doctest/doctest.h>

#include <filesystem>

#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

namespace rd = bit_physics::reaction_diffusion_2d_stack_c;

TEST_CASE("RED[gate-14] Stack-C capture writer emits the RIGHT-partner .h5") {
    std::filesystem::path manifest =
        std::filesystem::temp_directory_path() / "rd2d-stack-c-gate14.json";
    // Stage 1b/1c: writes a capture-v1-conformant .h5 + .json. Stage 1a: throws -> RED.
    rd::GrayScottResult r = rd::run_gray_scott(rd::GrayScottConfig{}, &manifest);
    CHECK(std::filesystem::exists(manifest));
    CHECK_FALSE(r.final_u.empty());
}

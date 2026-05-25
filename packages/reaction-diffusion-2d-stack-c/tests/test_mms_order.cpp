// gate-4 MMS observed order of accuracy (Stage 1b GREEN; S0-RD2C1).
//
// 4-grid ladder N∈{16,32,64,128} at t_final=0.05 via the manufactured-source
// Vulkan kernel; the observed asymptotic L2 spatial order must be within ±0.5
// of the formal 2.0 (5-point Laplacian). Manufactured solution per
// tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/.

#include <doctest/doctest.h>

#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

namespace rd = bit_physics::reaction_diffusion_2d_stack_c;

TEST_CASE("GREEN[gate-4] MMS observed L2 order ~ 2.0 +/- 0.5") {
    double order = rd::mms_observed_l2_order({16, 32, 64, 128}, 0.05);
    MESSAGE("observed L2 order = ", order);
    CHECK(order > 1.5);
    CHECK(order < 2.5);
}

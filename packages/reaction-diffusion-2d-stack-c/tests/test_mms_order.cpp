// RED failing test — gate-4 MMS observed order of accuracy (Stage 1a).
//
// S0-RD2C1: RD-2D gate-4 is MMS single-arm (no golden table). The 4-grid ladder
// N∈{16,32,64,128} at t_final=0.05 must observe L2 spatial order within ±0.5 of
// the formal 2.0 (5-point Laplacian), consuming the shared manufactured solution
// (tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py).
// FAILS RED now: mms_observed_l2_order is a stub (throws NotImplemented).

#include <doctest/doctest.h>

#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

namespace rd = bit_physics::reaction_diffusion_2d_stack_c;

TEST_CASE("RED[gate-4] MMS observed L2 order ~ 2.0 +/- 0.5") {
    double order = rd::mms_observed_l2_order({16, 32, 64, 128}, 0.05);
    CHECK(order == doctest::Approx(2.0).epsilon(0.25));  // within +/-0.5
}

// Gray-Scott Stack-C — Stage-1a STUB (the RED anchor).
//
// Both entry points throw NotImplemented so the doctest suite fails RED at
// Stage 1a (gates 4-13 surface + gate-4 MMS ladder unsatisfiable; gate-14
// fixture absent). Stage 1b replaces these bodies with the real Vulkan/C++ f64
// NoContraction implementation consuming the §1.9.1-cpp substrate
// (vkcompute::{ComputeContext, StorageBuffer, ComputePipeline, dispatch} +
// capture::Hdf5Writer + determinism::assert_deterministic_run). Intentionally
// has NO Vulkan dependency at Stage 1a — the scaffold links without Vulkan.

#include "bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp"

namespace bit_physics::reaction_diffusion_2d_stack_c {

GrayScottResult run_gray_scott(const GrayScottConfig&, const std::filesystem::path*) {
    throw NotImplemented(
        "run_gray_scott: not yet implemented (Stage 1b lands the Vulkan/C++ f64 "
        "NoContraction kernel + run-loop + capture-v1 writer)");
}

double mms_observed_l2_order(const std::vector<uint32_t>&, double) {
    throw NotImplemented(
        "mms_observed_l2_order: not yet implemented (Stage 1b lands the "
        "manufactured-source variant + 4-grid order ladder, gate-4 / S0-RD2C1)");
}

}  // namespace bit_physics::reaction_diffusion_2d_stack_c

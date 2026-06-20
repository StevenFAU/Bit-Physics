// C-1 U-6 stage-1a — the EDGE grid-flow-map trajectory, RED-stubbed.
//
// At stage 1b this fills in: the grid backward flow map ψ + on-grid gradient evolution
// ∇ψ (anchor § 3 item 1) + the tetrahedron-based ε-difference higher derivatives (item
// 2) + Hermite-interpolated departure-point sampling (item 3), with velocity projected
// each step via the copy-adapted vpfm MG vector-potential / curl path, and the
// O(1)-memory peak-working-set measurement (item 4). At stage 1a every public surface
// throws so the acceptance suite is RED by construction (spec § 1.3 step 4); the GREEN
// substrate (Vulkan f64 curl/div kernels, periodic MG, capture/determinism harness) is
// copy-adapted from eulerian-smoke-frontier-vpfm at stage 1b.

#include "bit_physics/edge/edge.hpp"

#include <stdexcept>

namespace bit_physics::edge {

namespace {
[[noreturn]] void unimplemented(const char* what) {
    throw std::logic_error(std::string("edge: stage-1a stub (RED) — ") + what +
                           " lands at stage 1b");
}
}  // namespace

void reconstruct_velocity_from_vorticity(const std::vector<double>&,
                                         const std::vector<double>&,
                                         const std::vector<double>&, uint32_t, uint32_t,
                                         std::vector<double>&, std::vector<double>&,
                                         std::vector<double>&) {
    unimplemented("reconstruct_velocity_from_vorticity");
}

EdgeResult run_edge(const EdgeConfig&, const std::filesystem::path*) {
    unimplemented("run_edge");
}

}  // namespace bit_physics::edge

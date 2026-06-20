// C-1 U-6 stage-1a — analytic host surfaces, RED-stubbed.
//
// The closed forms (taylor_green_velocity / _vorticity / kinetic_energy) land GREEN at
// stage 1b-i (hand-derived, FD-cross-checked in the A1 suite — the same forms verified
// in the U-5 vpfm package; spec § 2 will record the hand-derivation anchor). At stage 1a
// every entry throws so the acceptance suite is RED by construction (spec § 1.3 step 4).

#include "bit_physics/edge/edge.hpp"

#include <stdexcept>

namespace bit_physics::edge {

namespace {
[[noreturn]] void unimplemented(const char* what) {
    throw std::logic_error(std::string("edge: stage-1a stub (RED) — ") + what +
                           " lands at stage 1b");
}
}  // namespace

std::array<double, 3> taylor_green_velocity(InitialCondition, double, double, double) {
    unimplemented("taylor_green_velocity");
}

std::array<double, 3> taylor_green_vorticity(InitialCondition, double, double, double) {
    unimplemented("taylor_green_vorticity");
}

double kinetic_energy(const std::vector<double>&, const std::vector<double>&,
                      const std::vector<double>&, double) {
    unimplemented("kinetic_energy");
}

}  // namespace bit_physics::edge

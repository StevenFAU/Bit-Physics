// C-1 U-4 stage 1a — API skeleton (RED). The trajectory and the analytic surfaces are
// stubbed; stage 1b un-stubs against the failing acceptance suite (spec § 1.3 step 4).

#include "bit_physics/clebsch_pfm/clebsch_pfm.hpp"

#include <stdexcept>

namespace bit_physics::clebsch_pfm {

namespace {
[[noreturn]] void unimplemented(const char* what) {
    throw std::runtime_error(std::string("clebsch_pfm: unimplemented (stage 1b): ") +
                             what);
}
}  // namespace

std::array<double, 3> taylor_green_velocity(InitialCondition, double, double, double) {
    unimplemented("taylor_green_velocity");
}

Spinor taylor_green_wave_2d(double, double, double) {
    unimplemented("taylor_green_wave_2d");
}

double wave_velocity_face(const Spinor&, const Spinor&, double, double) {
    unimplemented("wave_velocity_face");
}

double kinetic_energy(const std::vector<double>&, const std::vector<double>&,
                      const std::vector<double>&, double) {
    unimplemented("kinetic_energy");
}

ClebschResult run_clebsch(const ClebschConfig&, const std::filesystem::path*) {
    unimplemented("run_clebsch");
}

}  // namespace bit_physics::clebsch_pfm

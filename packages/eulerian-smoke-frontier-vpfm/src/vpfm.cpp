// C-1 U-5 stage 1a — API skeleton (RED). The trajectory and the analytic surfaces are
// stubbed; stage 1b un-stubs against the failing acceptance suite (spec § 1.3 step 4).

#include "bit_physics/vpfm/vpfm.hpp"

#include <stdexcept>

namespace bit_physics::vpfm {

namespace {
[[noreturn]] void unimplemented(const char* what) {
    throw std::runtime_error(std::string("vpfm: unimplemented (stage 1b): ") + what);
}
}  // namespace

void reconstruct_velocity_from_vorticity(const std::vector<double>&,
                                         const std::vector<double>&,
                                         const std::vector<double>&, uint32_t, uint32_t,
                                         std::vector<double>&, std::vector<double>&,
                                         std::vector<double>&) {
    unimplemented("reconstruct_velocity_from_vorticity");
}

VpfmResult run_vpfm(const VpfmConfig&, const std::filesystem::path*) {
    unimplemented("run_vpfm");
}

}  // namespace bit_physics::vpfm

// C-1 U-4 stage 1b — run_clebsch remains stubbed (RED) until stage 1b-iii; the
// analytic surfaces + host numerics live in clebsch_pfm_math.cpp (1b-i), the particle
// transport in clebsch_pfm_particles.cpp (1b-ii).

#include "bit_physics/clebsch_pfm/clebsch_pfm.hpp"

#include <stdexcept>

namespace bit_physics::clebsch_pfm {

ClebschResult run_clebsch(const ClebschConfig&, const std::filesystem::path*) {
    throw std::runtime_error("clebsch_pfm: unimplemented (stage 1b): run_clebsch");
}

}  // namespace bit_physics::clebsch_pfm

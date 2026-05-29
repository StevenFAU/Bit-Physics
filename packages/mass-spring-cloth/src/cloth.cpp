// Mass-spring cloth (XPBD) — Stage 1a RED stub.
//
// Sub-phase: sub-phase-phase-3-mass-spring-cloth (task-5), Stage 1a (scaffold +
// RED). This stub compiles + links the public API so the doctest acceptance
// suite builds, but `run_cloth` is intentionally unimplemented (throws) so the
// suite is RED. Stage 1b replaces this with the real Vulkan-compute serial-GS
// XPBD solver (RED -> GREEN witness, §S6 / gate-3 / gate-13).

#include "bit_physics/mass_spring_cloth/cloth.hpp"

#include <stdexcept>

namespace bit_physics::mass_spring_cloth {

std::vector<double> build_grid_positions(const ClothConfig&) {
    throw std::logic_error("mass-spring-cloth: build_grid_positions not implemented (Stage 1a RED)");
}

std::vector<Constraint> build_constraints(const ClothConfig&) {
    throw std::logic_error("mass-spring-cloth: build_constraints not implemented (Stage 1a RED)");
}

ClothResult run_cloth(const ClothConfig&, const std::filesystem::path*) {
    throw std::logic_error("mass-spring-cloth: run_cloth not implemented (Stage 1a RED)");
}

}  // namespace bit_physics::mass_spring_cloth

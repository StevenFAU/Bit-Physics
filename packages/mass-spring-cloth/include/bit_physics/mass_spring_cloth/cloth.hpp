// Mass-spring cloth (XPBD) — Stack-C Vulkan/C++ reference-sim API.
//
// Sub-phase: sub-phase-phase-3-mass-spring-cloth (task-5). Charter
// docs/phases/sub-phase-phase-3-mass-spring-cloth.md § 3 (deliverable D).
//
// FIRST NEW Stack-C (Vulkan/C++20) sim of Phase 3 + FIRST soft-body category.
// Reimplements XPBD (Macklin, Müller, Chentanez 2016) INDEPENDENTLY in a Vulkan
// compute shader + C++20 (Convention #8); the vendored Bender
// PositionBasedDynamics 2.2.0 (references/PositionBasedDynamics/) is a read-only
// cross-check ORACLE only (charter D-VENDOR-ROLE), NOT a build dependency.
//
// Cloth model (classic Provot 1995 mass-spring, XPBD-compliant): structural
// springs (4-neighbour), shear springs (diagonal), and bending/flexion springs
// (2-apart) are ALL XPBD distance constraints with per-class compliance. Time
// integration: substepped semi-implicit Euler + per-substep Gauss-Seidel
// constraint projection (Macklin 2016 §3).
//
// Determinism (charter D-DET): the projection runs as a SERIAL Gauss-Seidel
// sweep in a SINGLE Vulkan invocation (local_size 1, one workgroup) over a fixed
// constraint order — no atomic scatter, no subgroup ops, f64, NoContraction
// (`precise`). On the lavapipe CPU backend (VK_DRIVER_FILES=lvp_icd.json,
// LP_NUM_THREADS=0) this is bit-identical run-to-run; MEASURED at Stage 1b via
// assert_deterministic_run(tolerance=0.0).

#pragma once

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace bit_physics::mass_spring_cloth {

// Spring class — used to assign per-class compliance. All three are XPBD
// distance constraints; the class only selects which compliance applies.
enum class SpringClass : uint32_t { Structural = 0, Shear = 1, Bending = 2 };

// One XPBD distance constraint between particles `a` and `b`, rest length
// `rest`, with class-selected compliance.
struct Constraint {
    uint32_t a;
    uint32_t b;
    double   rest;
    SpringClass cls;
};

// Cloth configuration. A regular nx-by-ny grid of particles, row-major
// (index = j*nx + i), laid out in the XY plane at z=0 unless `initial_positions`
// overrides. Gravity acts along (gx, gy, gz). Pinned particles (inverse mass 0)
// are listed in `pinned`.
struct ClothConfig {
    uint32_t nx = 32;
    uint32_t ny = 32;
    double   spacing = 1.0;        // rest distance between adjacent particles
    double   particle_mass = 1.0;  // per-particle mass (inv_mass = 1/mass; 0 if pinned)

    double   gx = 0.0;
    double   gy = -9.81;
    double   gz = 0.0;

    double   dt = 1.0 / 60.0;
    uint32_t substeps = 1;
    uint32_t iterations = 20;      // Gauss-Seidel sweeps per substep
    // Linear velocity damping (fraction of velocity removed per substep, [0,1)).
    // 0 = energy-conserving (oscillates); >0 drives settling to static
    // equilibrium for the catenary / stretched golden comparisons.
    double   velocity_damping = 0.0;

    // XPBD compliance (= 1/stiffness; alpha = compliance/dt^2, Macklin 2016 Eq. 8).
    // 0.0 => infinitely stiff (inextensible limit). Structural+shear share
    // `stretch_compliance`; bending uses `bend_compliance`.
    double   stretch_compliance = 0.0;
    double   bend_compliance = 0.0;
    bool     enable_shear = true;
    bool     enable_bending = true;

    uint32_t steps = 600;
    uint32_t capture_interval = 60;
    uint64_t seed = 42;

    std::vector<uint32_t> pinned;            // pinned particle indices (inv_mass = 0)
    std::vector<double>   initial_positions; // optional 3*N override (else grid)
};

struct ClothResult {
    std::vector<double> final_positions;                 // 3*N, row-major (x,y,z)
    std::vector<uint32_t> captured_steps;
    std::vector<std::vector<double>> captured_positions; // parallel to captured_steps
    // §11 invariant evidence: max over stretch (structural+shear) constraints of
    // |d - rest| / rest at the final state (length_bounded_above witness).
    double max_stretch_ratio = 0.0;
    double max_speed = 0.0;        // max particle speed at the final state
    std::string determinism_witness;  // sha256(final positions); 2-run bit-exact
};

// Build the structural + (optional) shear + (optional) bending constraint list
// for an nx-by-ny grid with the given rest `spacing`. Exposed for tests /
// derivations (the constraint topology is part of the reference contract).
std::vector<Constraint> build_constraints(const ClothConfig& cfg);

// Build the default grid initial positions (3*N, XY plane, z=0).
std::vector<double> build_grid_positions(const ClothConfig& cfg);

// Run the canonical cloth trajectory: serial-GS XPBD on the lavapipe CPU
// backend; capture every `capture_interval` steps; assert 2-run bit-identical
// determinism (tolerance 0.0). Optionally write a capture-v1 .h5 (+ .json) at
// `capture_manifest`.
ClothResult run_cloth(const ClothConfig& cfg,
                      const std::filesystem::path* capture_manifest = nullptr);

}  // namespace bit_physics::mass_spring_cloth

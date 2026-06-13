// eulerian-smoke frontier-vpfm — Stack-C (C++ / Vulkan) variant.
//
// Phase 6 cluster C-1 unit U-5 (spec § 11.5 item 4.17; Phase-4 ledger row 25; charter
// docs/phases/phase-6/c1-charter.md § 3.5, RATIFIED § 10). Frontier method per Wang,
// Zhou, Feng, Li, Sun, Chen, Turk, Zhu, "Fluid Simulation on Vortex Particle Flow
// Maps", ACM TOG 44(4), SIGGRAPH 2025, DOI 10.1145/3731198 / arXiv:2505.21946 (anchor
// re-verified live; probe § 1) — CITE-DON'T-IMPORT (no public code release found).
//
// Method core (paper Eqs. 11-21): vorticity evolved on particle flow maps via the
// Cauchy formula ω_c = ℱ_{[a,c]}·ω_a (Eq. 12 — stretching enters through the forward
// Jacobian, no FD stretching term); the vorticity gradient maps through the SHORT
// segment ∇ω_c = ℱ_b·∇ω_b·𝒯_b + ∇ℱ_b·ω_b (Eq. 13); Jacobians evolve per
// Dℱ/Dt = ∇u·ℱ, D𝒯/Dt = −𝒯·∇u (Eq. 11) and the flow-map Hessian ∇ℱ evolves
// DIRECTLY on particles (Eq. 14, with (∇u, ∇∇u) source terms — the paper's central
// innovation; differentiating ℱ across unstructured particles is what it replaces).
// Per step: RK4 advection of (x, ℱ_long, ℱ_short, 𝒯_short, ∇ℱ_short); APIC P2G of the
// mapped (ω, ∇ω) onto edge-centred grid vorticity (Eq. 20); velocity reconstruction —
// componentwise vector-potential Poisson ΔΨ_d = −ω_d + u = ∇×Ψ on a staggered MAC
// grid (edge Ψ/ω, face u; the compatible curl/divergence stencil pair makes
// div(u) = 0 an EXACT discrete identity — probe § 4.3); dual reinit cadences n_v
// (long map, ω) / n_g (short map, ∇ω). Periodic unit cube; the solid-boundary
// surface (cut-cell no-through + Brinkmann no-slip) is DEFERRED with cause
// (probe § 4.2 — charter-pre-authorized; the canonical descriptor has no solids).
//
// Execution split (U-4 posture carried; spec sheet § 6): per-face/per-cell grid
// vector arithmetic (curl reconstruction, MAC divergence) runs as Vulkan f64
// NoContraction compute kernels under the lavapipe pin; particle flow-map transport
// (gather-only, fixed-order — no atomics) and the fixed-count multigrid Poisson
// solves run in deterministic host C++ (f64). Inviscid Euler in vorticity form.

#pragma once

#include <array>
#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace bit_physics::vpfm {

enum class InitialCondition {
    // The parent's canonical 3D Taylor-Green IC (sim.py:181-212): u = sin·cos·cos,
    // v = −cos·sin·cos, w = 0, k = 2π on [0,1]³. The vorticity lift is DIRECT and
    // closed-form (ω = ∇×u evaluated analytically on the edge lattices) — the U-4
    // wave-fit-descent instability class does not arise here (probe § 5).
    kTaylorGreen3D,
    // z-invariant 2D Taylor-Green embedded in 3D: u = (sin2πx·cos2πy, −cos2πx·sin2πy, 0)
    // — an EXACT steady solution of incompressible Euler (the U-4 adapted analytic
    // anchor A3, reused; probe § 4.1). ω = (0, 0, 4π·sin2πx·sin2πy).
    kTaylorGreen2DZInvariant,
};

struct VpfmConfig {
    uint32_t n = 128;              // cubic grid, n³ cells, dx = 1/n (unit periodic box)
    uint32_t steps = 500;
    uint32_t capture_interval = 50;
    double dt = 0.005;             // FIXED dt (parent descriptor parity; the paper's
                                   // CFL-adaptive Δt is a documented adaptation point)
    int seed = 42;
    uint32_t particles_per_cell = 8;  // 2×2×2 sub-lattice + seeded hash jitter at
                                      // (re)distribution (the U-4 substrate shape)
    uint32_t n_v = 20;             // LONG-map reinit cadence (ω carried via ℱ_{[a,c]};
                                   // paper § 8: vorticity tolerates long maps — n^L
                                   // 20-40 in the reference)
    uint32_t n_g = 5;              // SHORT-map reinit cadence (∇ω via Eq. 13; the
                                   // higher-order quantity needs the shorter segment)
    uint32_t poisson_vcycles = 4;  // fixed-count MG V(2,2) per vector-potential
                                   // component (deterministic by count; U-4 solver)
    InitialCondition ic = InitialCondition::kTaylorGreen3D;
    bool track_forward_jacobian = false;  // A2 test mode: record ‖𝒯ℱ − I‖_max over the
                                          // short segment (composition identity)
    bool track_hessian_fd = false;        // A2 test mode: finite-difference validation
                                          // of the evolved ∇ℱ on a fixed probe subset
                                          // (±ε clones re-advected; deterministic)
    bool with_density = true;      // passive smoke density channel (parent capture
                                   // parity; Gaussian blob σ=0.1 at box centre,
                                   // semi-Lagrangian transport per the parent op-order)
};

struct StepFrame {
    uint32_t step = 0;
    // Cell-centred velocity samples (n³ each, x-major lex order) — MAC faces averaged
    // to centres for parent-capture field parity (u, v, w) + passive density.
    std::vector<double> u, v, w, density;
};

struct VpfmResult {
    std::vector<StepFrame> frames;
    std::string determinism_witness_sha256;  // 2-run bit-identity witness over the full
                                             // trajectory readback (tolerance 0.0)
    // Measured diagnostics (measured-then-declared surfaces; spec sheet § 6):
    double init_velocity_residual = 0.0;   // max|u₀ − u_target| after the vorticity
                                           // lift + reconstruction (O(dx²) truncation)
    double energy_initial = 0.0;           // ½Σ|u|²dx³ (inviscid invariant)
    double energy_final = 0.0;
    double max_carried_omega_drift = 0.0;  // bit-drift of the carried ω_a between long
                                           // reinits (carried, never evolved ⇒ expect
                                           // exactly 0.0 — the U-4 0-form analogue)
    double max_div_postproj = 0.0;         // max |∇·u| over the run — the compatible
                                           // stencil pair makes this an FP-scale
                                           // identity, NOT a truncation bound (PBT 1)
    double max_total_vorticity = 0.0;      // max |Σ ω_d dx³| per component over the run
                                           // (Kelvin budget surface; PBT 2)
    double max_circulation_drift = 0.0;    // max drift of fixed grid-loop circulations
                                           // over the physical window (Kelvin)
    double max_flowmap_residual = 0.0;     // test mode: max ‖𝒯ℱ − I‖_max over the run
    double max_hessian_fd_residual = 0.0;  // test mode: max ‖∇ℱ_evolved − ∇ℱ_fd‖_max
                                           // over the probe subset
};

// --- Analytic host surfaces (f64; closed forms; no Vulkan) ------------------------

// Taylor-Green velocity at a point for the given IC family (k = 2π, unit box).
std::array<double, 3> taylor_green_velocity(InitialCondition ic, double x, double y,
                                            double z);

// Closed-form vorticity ω = ∇×u of the IC family at a point (hand-derived; spec § 2):
//   kTaylorGreen3D:           ω = k·(−cos·sin·sin, −sin·cos·sin, 2·sin·sin·cos), k = 2π
//   kTaylorGreen2DZInvariant: ω = (0, 0, 2k·sin(kx)·sin(ky))
std::array<double, 3> taylor_green_vorticity(InitialCondition ic, double x, double y,
                                             double z);

// Velocity reconstruction from edge-centred vorticity (the init path + A1 golden
// surface): mean-subtract each ω component, solve ΔΨ_d = −ω_d per edge family
// (fixed-count periodic MG), u = ∇×Ψ on faces (device curl kernel). Edge fields are
// n³ each in the +owner layout (probe § 4.3); returns face fields n³ each.
void reconstruct_velocity_from_vorticity(const std::vector<double>& wx,
                                         const std::vector<double>& wy,
                                         const std::vector<double>& wz, uint32_t n,
                                         uint32_t vcycles, std::vector<double>& ux,
                                         std::vector<double>& uy,
                                         std::vector<double>& uz);

// ½ Σ (u²+v²+w²) dx³ over cell-centred samples (the inviscid kinetic-energy invariant).
double kinetic_energy(const std::vector<double>& u, const std::vector<double>& v,
                      const std::vector<double>& w, double dx);

// --- Trajectory ---------------------------------------------------------------------

// Run the VPFM trajectory (Vulkan f64 grid kernels + deterministic host transport);
// optionally write the capture-v1 .h5/.json pair at `capture_manifest`. Internally
// asserts the 2-run bit-identity witness BEFORE any capture is written.
VpfmResult run_vpfm(const VpfmConfig& cfg, const std::filesystem::path* capture_manifest);

}  // namespace bit_physics::vpfm

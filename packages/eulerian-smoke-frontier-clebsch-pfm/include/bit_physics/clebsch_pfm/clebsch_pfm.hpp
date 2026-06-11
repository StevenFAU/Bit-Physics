// eulerian-smoke frontier-clebsch-pfm — Stack-C (C++ / Vulkan) variant.
//
// Phase 6 cluster C-1 unit U-4 (spec § 11.5 item 4.15; Phase-4 ledger row 23; charter
// docs/phases/phase-6/c1-charter.md § 3.4, RATIFIED § 10). Frontier method per Li, Lin,
// Chen, Zhou, Xiong, Zhu, "Clebsch Gauge Fluid on Particle Flow Maps", ACM TOG 44(4),
// SIGGRAPH 2025, DOI 10.1145/3731194 (anchor re-verified live; probe § 1) —
// CITE-DON'T-IMPORT (no public code release exists).
//
// Method core (paper Eqs. 12-27, Algs. 1-3): two-component complex wave function
// Ψ=(Ψ₁,Ψ₂), velocity u = ħ⟨∇Ψ, iΨ⟩_ℝ; the gauge transform Φ = Ψ·e^{iΓ/ħ} (Γ the
// trajectory integral of p/ρ − |u|²/2) makes Φ a pure 0-form (DΦ/Dt = 0): particles
// carry Φ_{p,s} UNCHANGED between reinitializations, and only ∇Φ needs the backward
// flow-map Jacobian T̃ (dT̃/dt = −T̃∇u). Pipeline per step: RK4 advection of (x_p, T̃_p);
// APIC P2G of (Φ, ∇Φ); wave→velocity u_f = (ħ/Δx)·arg⟨Φ_a, Φ_b⟩ per MAC face;
// Poisson-project; periodic reinit (cadence n_v for the value map / n_g for the
// gradient map) with normalize + phase standardization Φ ← Φ·e^{−iq/ħ}, Δq = ∇·u*.
//
// Execution split (documented posture; spec sheet § 6): the Clebsch per-cell field
// arithmetic (complex inner products, rotation+normalization, MAC divergence) runs as
// Vulkan f64 NoContraction compute kernels under the lavapipe pin; transcendentals
// (atan2 / sin / cos — GLSL exposes no f64 trig), particle transport (gather-only,
// fixed-order — no atomics), and the fixed-count multigrid Poisson solve run in
// deterministic host C++ (f64). Inviscid Euler (paper Eq. 8); periodic unit cube; the
// canonical regime needs no solid/source/open boundaries and no β-blending.

#pragma once

#include <array>
#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace bit_physics::clebsch_pfm {

// Complex 2-spinor sample stored as (Re Φ₁, Im Φ₁, Re Φ₂, Im Φ₂).
using Spinor = std::array<double, 4>;

enum class InitialCondition {
    // The parent's canonical 3D Taylor-Green IC (sim.py:181-212): u = sin·cos·cos,
    // v = −cos·sin·cos, w = 0, k = 2π on [0,1]³. No closed-form Clebsch lift is used;
    // the wave function is fitted by the deterministic constrained-descent init and the
    // achieved velocity residual is MEASURED into ClebschResult (probe § 4.2).
    kTaylorGreen3D,
    // z-invariant 2D Taylor-Green embedded in 3D: u = (sin2πx·cos2πy, −cos2πx·sin2πy, 0)
    // — an EXACT steady solution of incompressible Euler (probe § 4.1: the adapted
    // analytic anchor A3). Has a closed-form spherical-Clebsch lift (taylor_green_wave_2d).
    kTaylorGreen2DZInvariant,
};

struct ClebschConfig {
    uint32_t n = 128;              // cubic grid, n³ cells, dx = 1/n (unit periodic box)
    uint32_t steps = 500;
    uint32_t capture_interval = 50;
    double dt = 0.005;             // FIXED dt (parent descriptor parity; the paper's
                                   // CFL-adaptive Δt is a documented adaptation point)
    double hbar = 0.5;             // paper Table 2: ħ ∈ [0.15, 1.5] by resolution
    int seed = 42;
    uint32_t particles_per_cell = 8;  // paper |ℙ|/|𝔾| ∈ [8, 16]; 2×2×2 sub-lattice +
                                      // seeded hash jitter at (re)distribution
    uint32_t n_v = 20;             // value-map (Φ) reinit cadence (paper Alg. 3, j-loop)
    uint32_t n_g = 5;              // gradient-map (∇Φ, T̃) reinit cadence (k-loop)
    uint32_t poisson_vcycles = 4;  // fixed-count MG V-cycles (deterministic by count,
                                   // not by residual test); RB-GS smoother, periodic
    uint32_t init_descent_iters = 200;  // kTaylorGreen3D wave-fit iterations (fixed)
    double init_descent_tau = 0.2;      // descent step size (fixed, f64)
    InitialCondition ic = InitialCondition::kTaylorGreen3D;
    bool track_forward_jacobian = false;  // A2 test mode: carry F̃ (dF̃/dt = ∇u·F̃)
                                          // alongside T̃ and record ‖T̃F̃ − I‖_max
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

struct ClebschResult {
    std::vector<StepFrame> frames;
    std::string determinism_witness_sha256;  // 2-run bit-identity witness over the full
                                             // trajectory readback (tolerance 0.0)
    // Measured diagnostics (measured-then-declared surfaces; spec sheet § 6):
    double init_velocity_residual = 0.0;   // max|u₀ − u_target| after init + projection
    double energy_initial = 0.0;           // ½Σ|u|²dx³ (inviscid invariant)
    double energy_final = 0.0;
    double max_norm_deviation = 0.0;       // max ‖Φ_g‖−1 deviation at reinit points
    double max_carried_phi_drift = 0.0;    // bit-drift of carried Φ_{p,s} between
                                           // reinits (0-form transport ⇒ expect 0.0)
    double max_div_postproj = 0.0;         // max |∇·u| after projection over the run
    double max_flowmap_residual = 0.0;     // test mode: max ‖T̃F̃ − I‖_max over the run
};

// --- Analytic host surfaces (f64; closed forms; no Vulkan) ------------------------

// Taylor-Green velocity at a point for the given IC family (k = 2π, unit box).
std::array<double, 3> taylor_green_velocity(InitialCondition ic, double x, double y,
                                            double z);

// Closed-form spherical-Clebsch lift of the z-invariant 2D Taylor-Green field
// (probe § 4 / spec § 2): Clebsch pair λ = −2cos(2πx)·... with z-coordinate λ/2 and
// fibre angle θ = 2μ/ħ lifted through the Hopf section
// Ψ = (cos(α/2)·e^{iθ/2}, sin(α/2)·e^{−iθ/2}), cos α = z. Normalized by construction
// (‖Ψ‖ = 1 exact-to-FP); its induced velocity equals the 2D TG field up to a gradient,
// which the projection removes (verified as a resolution-converging golden).
Spinor taylor_green_wave_2d(double x, double y, double hbar);

// Paper Eq. 19: MAC-face velocity from two adjacent wave samples,
// u_f = (ħ/Δx)·arg⟨Φ_a, Φ_b⟩_ℂ with ⟨a,b⟩_ℂ = ā₁b₁ + ā₂b₂.
double wave_velocity_face(const Spinor& phi_a, const Spinor& phi_b, double hbar,
                          double dx);

// ½ Σ (u²+v²+w²) dx³ over cell-centred samples (the inviscid kinetic-energy invariant).
double kinetic_energy(const std::vector<double>& u, const std::vector<double>& v,
                      const std::vector<double>& w, double dx);

// --- Trajectory ---------------------------------------------------------------------

// Run the Clebsch-PFM trajectory (Vulkan f64 grid kernels + deterministic host
// transport); optionally write the capture-v1 .h5/.json pair at `capture_manifest`.
// Internally asserts the 2-run bit-identity witness BEFORE any capture is written.
ClebschResult run_clebsch(const ClebschConfig& cfg,
                          const std::filesystem::path* capture_manifest);

}  // namespace bit_physics::clebsch_pfm

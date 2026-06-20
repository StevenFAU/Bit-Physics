// eulerian-smoke frontier-edge — Stack-C (C++ / Vulkan) variant.
//
// Phase 6 cluster C-1 unit U-6 (spec § 11.5 item 4.16; Phase-4 ledger row 24; charter
// docs/phases/phase-6/c1-charter.md § 3.6, RATIFIED § 10 [D-1: EDGE proper]). Frontier
// method per Zhiqi Li*, Ruicheng Wang*, Junlin Li*, Duowen Chen, Sinan Wang, Bo Zhu
// (*co-first, all Georgia Institute of Technology), "EDGE: Epsilon-Difference Gradient
// Evolution for Buffer-Free Flow Maps", ACM TOG 44(4), SIGGRAPH 2025, DOI
// 10.1145/3731193 (anchor re-verified LIVE this session, Convention #8: project page
// https://pearseven.github.io/EDGEProject/ — title + 6-author list + venue + the O(1)
// memory + 37.89 GB → 10.79/8.54 GB ≈90% backward-map figures read verbatim; no arXiv,
// ACM DL canonical; CITE-DON'T-IMPORT, no public code release found). This is the
// flow-map family's THIRD and final C-1 member — INCOMPRESSIBLE-Euler GRID flow maps,
// distinct from the compressible-flow-map paper DOI 10.1145/3731192 (D-1 conflation
// closed, probe § 1). INDEPENDENT of the U-4/U-5 particle substrate (probe § 4.2): no
// particles, no APIC P2G/G2P, no counting-sort binning.
//
// Method core (anchor § 3, read at probe — grid-based flow-map advection WITHOUT a
// per-step velocity-buffer history):
//   1. GRADIENT EVOLUTION — the backward flow map ψ (where each grid point came from)
//      and its FIRST-order Jacobian ∇ψ are evolved DIRECTLY on the grid, giving
//      accurate gradients without reconstructing them from a stored velocity buffer.
//   2. TETRAHEDRON-BASED EPSILON-DIFFERENCE — HIGHER-order derivatives (the map
//      curvature needed for accurate transport) come from a finite ε-difference over a
//      tetrahedral stencil of nearby evolved samples — the memory-reduction lever (no
//      buffer retained).
//   3. HERMITE INTERPOLATION — map value + evolved gradients feed a C¹ Hermite
//      interpolant for high-accuracy sampling at departure points.
//   4. O(1) MEMORY, INDEPENDENT OF FLOW-MAP LENGTH — the headline, MECHANICALLY
//      MEASURABLE claim (charter § 3.6: "a rare rigorous frontier claim"): peak working
//      set is constant as the reinit interval (flow-map length) grows. This unit exists
//      to MEASURE that property (PBT backward_map_memory_constant + a perf-ledger row).
//
// Substrate posture (probe § 5): the Stack-C grid layer — periodic multigrid Poisson
// projection, staggered curl + MAC divergence f64 NoContraction Vulkan kernels (the
// exact discrete div∘curl identity), parallel_for, quadratic-B-spline interpolation,
// mac_to_centres, the capture/determinism harness, and the analytic Taylor-Green closed
// forms — is COPY-ADAPTED from eulerian-smoke-frontier-vpfm (itself the U-4 copy-adapt).
// The grid backward flow map ψ + ∇ψ gradient evolution + tetrahedron ε-difference +
// Hermite sampling is built NEW (probe § 2: NOT in any landed package).
//
// Execution split (the U-4/U-5 posture carried; spec sheet § 6): per-face/per-cell grid
// vector arithmetic (curl reconstruction, MAC divergence) runs as Vulkan f64
// NoContraction compute kernels under the lavapipe pin; the grid flow-map evolution
// (gather-only, fixed-order — no atomics) and the fixed-count multigrid Poisson solves
// run in deterministic host C++ (f64). Inviscid Euler; periodic unit cube; the
// solid-boundary surface is DEFERRED with cause (probe § 4.4 — charter-pre-authorized;
// the canonical descriptor has no solids).
//
// STAGE 1a (this file): API surface + RED-stubbed impl + failing acceptance suite +
// CMake/ctest registration (spec § 1.3 step 4 — failing tests first). The GREEN
// trajectory (analytic forms → grid flow map → ε-difference → Hermite → projection),
// the canonical capture, the spec de-stub, and the REFRAMED + O(1)-memory gates land at
// stages 1b/1c.

#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace bit_physics::edge {

enum class InitialCondition {
    // The parent's canonical 3D Taylor-Green IC (sim.py:181-212): u = sin·cos·cos,
    // v = −cos·sin·cos, w = 0, k = 2π on [0,1]³. EDGE is GRID-side and seeds velocity
    // DIRECTLY (no vorticity lift needed — the U-5 lift path does not arise; probe § 5).
    kTaylorGreen3D,
    // z-invariant 2D Taylor-Green embedded in 3D: u = (sin2πx·cos2πy, −cos2πx·sin2πy, 0)
    // — an EXACT steady solution of incompressible Euler (the U-4/U-5 adapted analytic
    // anchor A3, reused; probe § 4.1). ω = (0, 0, 2k·sin(kx)·sin(ky)).
    kTaylorGreen2DZInvariant,
};

struct EdgeConfig {
    uint32_t n = 128;              // cubic grid, n³ cells, dx = 1/n (unit periodic box)
    uint32_t steps = 500;
    uint32_t capture_interval = 50;
    double dt = 0.005;             // DESCRIPTOR NOMINAL ONLY. The CFL-safe fixed dt at
                                   // 128³ is MEASURED-then-declared at stage 1c (probe
                                   // § 4.5 / the U-5 lesson — the vpfm descriptor 0.005
                                   // crossed the 128³ inviscid-TG CFL ceiling and blew
                                   // up by step 250; EDGE re-derives its own boundary at
                                   // build, NEVER inherits 0.005 unverified).
    int seed = 42;
    uint32_t reinit_interval = 20; // FLOW-MAP LENGTH L: grid steps between backward-map
                                   // reinitialisation. The O(1)-memory claim is that the
                                   // peak working set is CONSTANT as L grows
                                   // (backward_map_memory_constant PBT; anchor § 3 item 4
                                   // — buffer methods grow with L, EDGE does not).
    uint32_t poisson_vcycles = 4;  // fixed-count MG V(2,2) per pressure/vector-potential
                                   // solve (deterministic by count; the vpfm solver)
    InitialCondition ic = InitialCondition::kTaylorGreen3D;
    bool track_gradient_fd = false; // A2 test mode: measure the evolved ∇ψ against a
                                    // finite-difference of the evolved map ψ (the
                                    // Hermite-gradient consistency surface; anchor § 3
                                    // item 1 — gradient evolution accuracy).
    bool with_density = true;      // passive smoke density channel (parent capture
                                   // parity; Gaussian blob σ=0.1 at box centre,
                                   // flow-map / semi-Lagrangian transport).
};

struct StepFrame {
    uint32_t step = 0;
    // Cell-centred velocity samples (n³ each, x-major lex order) — MAC faces averaged to
    // centres for parent-capture field parity (u, v, w) + passive density.
    std::vector<double> u, v, w, density;
};

struct EdgeResult {
    std::vector<StepFrame> frames;
    std::string determinism_witness_sha256;  // 2-run bit-identity witness over the full
                                             // trajectory readback (tolerance 0.0)
    // Measured diagnostics (measured-then-declared surfaces; spec sheet § 6 — each
    // declared bound is paired in the landing note with the measurement that backs it):
    double init_velocity_residual = 0.0;   // max|u₀ − u_target| after the grid IC seed
    double energy_initial = 0.0;           // ½Σ|u|²dx³ (inviscid invariant)
    double energy_final = 0.0;
    double max_div_postproj = 0.0;         // max |∇·u| over the run — the compatible
                                           // stencil pair makes this an FP-scale
                                           // identity, NOT a truncation bound (PBT 1)
    double max_total_vorticity = 0.0;      // max |Σ ω_d dx³| per component over the run
                                           // (Kelvin budget surface; PBT 2)
    double max_circulation_drift = 0.0;    // max drift of fixed grid-loop circulations
                                           // over the physical window (Kelvin)
    double max_gradient_fd_residual = 0.0; // test mode: max ‖∇ψ_evolved − ∇ψ_fd‖_max
                                           // over the run (gradient-evolution accuracy;
                                           // anchor § 3 item 1)
    std::size_t backward_map_peak_bytes = 0; // measured peak working-set of the
                                             // backward-map storage over the run — the
                                             // O(1)-memory headline (CONSTANT in
                                             // reinit_interval; anchor § 3 item 4)
};

// --- Analytic host surfaces (f64; closed forms; no Vulkan) --------------------------

// Taylor-Green velocity at a point for the given IC family (k = 2π, unit box).
std::array<double, 3> taylor_green_velocity(InitialCondition ic, double x, double y,
                                            double z);

// Closed-form vorticity ω = ∇×u of the IC family at a point (hand-derived; spec § 2):
//   kTaylorGreen3D:           ω = k·(−cos·sin·sin, −sin·cos·sin, 2·sin·sin·cos), k = 2π
//   kTaylorGreen2DZInvariant: ω = (0, 0, 2k·sin(kx)·sin(ky))
std::array<double, 3> taylor_green_vorticity(InitialCondition ic, double x, double y,
                                             double z);

// Velocity reconstruction from edge-centred vorticity (the A1 exact-identity + golden
// surface, shared with the projection path): mean-subtract each ω component, solve
// ΔΨ_d = −ω_d per edge family (fixed-count periodic MG), u = ∇×Ψ on faces (device curl
// kernel). Edge fields are n³ each in the +owner layout (the vpfm curl-shader
// convention); returns face fields n³ each.
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

// Run the EDGE grid-flow-map trajectory (Vulkan f64 grid kernels + deterministic host
// flow-map evolution); optionally write the capture-v1 .h5/.json pair at
// `capture_manifest`. Internally asserts the 2-run bit-identity witness BEFORE any
// capture is written.
EdgeResult run_edge(const EdgeConfig& cfg, const std::filesystem::path* capture_manifest);

}  // namespace bit_physics::edge

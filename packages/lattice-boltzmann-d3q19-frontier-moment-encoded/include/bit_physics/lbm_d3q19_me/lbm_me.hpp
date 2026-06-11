// D3Q19 LBM frontier-moment-encoded (16-bit) — Stack-C (C++ / Vulkan) variant.
//
// Phase 6 cluster C-1 unit U-3 (spec § 11.5 item 4.21; Phase-4 ledger row 29; charter
// docs/phases/phase-6/c1-charter.md § 3.3, RATIFIED § 10 incl. D-2). Frontier delta per
// Chen, Li, Levin, Wu, "High-Performance Moment-Encoded Lattice Boltzmann Method with
// Stability-Guided Quantization" (arXiv:2602.05295; anchor verified live, charter § 2
// row 7 + § 10) — CITE-DON'T-IMPORT: the persistent per-cell state is the 19 MOMENTS
// m = M f quantized to uint16 with per-moment stability-guided ranges, decoded to f for
// the (f64) BGK collide + stream + bounce-back, re-encoded after.
//
// The moment basis M is built programmatically from the D3Q19 velocity-set monomials
// {1, cx, cy, cz, cx², …, cy²cz²} (rank 19, cond ≈ 19, measured; rows 0..3 are EXACTLY
// the density + momentum moments, so the conserved moments quantize directly). M⁻¹ is
// computed by Gauss-Jordan in f64; the A2 anchor asserts ‖M·M⁻¹ − I‖_max at test time.
//
// Physics (op-order mirrors the landed numpy parent `lattice_boltzmann_d3q19.reference`):
// Qian-1992 equilibrium, BGK relaxation, Guo-2002 body force (half-step velocity shift),
// lex-ordered pull streaming, half-way bounce-back y-walls. `quantize=false` runs the
// pure-f64 path (the A1 exact-conservation surface + the 1e-5-class parent witness);
// `quantize=true` is the frontier mode (conservation bounded by the closed-form
// quantization bound; vs-parent equivalence bounded, measured-then-declared per D-2).

#pragma once

#include <array>
#include <cstdint>
#include <filesystem>
#include <vector>

namespace bit_physics::lbm_d3q19_me {

inline constexpr int kQ = 19;

// Lex-ordered D3Q19 velocity set — verbatim the parent's `reference/constants.py`.
inline constexpr std::array<std::array<int, 3>, kQ> kVelocities = {{
    {0, 0, 0},  {1, 0, 0},  {-1, 0, 0}, {0, 1, 0},  {0, -1, 0}, {0, 0, 1},  {0, 0, -1},
    {1, 1, 0},  {-1, -1, 0}, {1, -1, 0}, {-1, 1, 0}, {1, 0, 1},  {-1, 0, -1}, {1, 0, -1},
    {-1, 0, 1}, {0, 1, 1},  {0, -1, -1}, {0, 1, -1}, {0, -1, 1},
}};

// Opposite-direction map (c_i + c_opp(i) == 0) — verbatim the parent's bgk.py OPP.
inline constexpr std::array<int, kQ> kOpposite = {0, 2,  1,  4,  3,  6,  5,  8,  7, 10,
                                                  9, 12, 11, 14, 13, 16, 15, 18, 17};

struct LbmConfig {
    uint32_t nx = 64, ny = 32, nz = 3;
    uint32_t steps = 1000;
    uint32_t capture_interval = 1;
    double tau = 0.7;
    double force_x = 1e-5;  // lattice-unit body force density along +x
    int seed = 42;          // recorded in the manifest; the IC is the deterministic rest state
    bool quantize = true;   // frontier mode (16-bit moment encoding) vs pure-f64 mode
    // Stability-guided range margin: quantization ranges = f64-warmup min/max padded by
    // this fraction of the span (the "stability-guided" envelope; see calibrate_ranges).
    double range_margin = 0.25;
    uint32_t warmup_steps = 64;  // f64 calibration horizon for the ranges
};

struct MomentBasis {
    // Row-major 19x19 M (moments = M f) and its f64 Gauss-Jordan inverse.
    std::array<double, kQ * kQ> m{};
    std::array<double, kQ * kQ> m_inv{};
    double inverse_residual = 0.0;  // max|M·M⁻¹ − I| (A2 anchor; measured at build)
};

struct QuantRanges {
    std::array<double, kQ> lo{};
    std::array<double, kQ> hi{};
    // Closed-form per-moment round-trip bound: (hi-lo)/2/65535.
    std::array<double, kQ> bound() const;
};

struct StepFrame {
    uint32_t step = 0;
    std::vector<double> rho;  // (nx*ny*nz)
    std::vector<double> u;    // (3*nx*ny*nz), component-major like the parent (3,Nx,Ny,Nz)
};

struct LbmResult {
    std::vector<StepFrame> frames;
    std::string determinism_witness_sha256;  // 2-run bit-identity witness (f64 readback)
    double total_mass_initial = 0.0;
    double total_mass_final = 0.0;
    std::array<double, 3> total_momentum_initial{};
    std::array<double, 3> total_momentum_final{};
    QuantRanges ranges_used{};
};

// Build the monomial moment basis + its inverse (pure host f64; deterministic).
MomentBasis build_moment_basis();

// f64 warmup run (host-side reference arithmetic) -> per-moment stability-guided ranges.
QuantRanges calibrate_ranges(const LbmConfig& cfg, const MomentBasis& basis);

// Pure host-side f64 reference step surface (mirrors the numpy parent op-order; used by
// goldens + range calibration; NOT the capture path). f is (19*nx*ny*nz), dir-major.
void reference_step(std::vector<double>& f, const LbmConfig& cfg);

// Initial rest state f = feq(rho=1, u=0) (= w_i per cell), dir-major (19, nx, ny, nz).
std::vector<double> initial_rest_state(const LbmConfig& cfg);

// Run the Vulkan trajectory (quantized or f64 per cfg.quantize); optionally write the
// capture-v1 .h5/.json pair at `capture_manifest`.
LbmResult run_lbm(const LbmConfig& cfg, const std::filesystem::path* capture_manifest);

}  // namespace bit_physics::lbm_d3q19_me

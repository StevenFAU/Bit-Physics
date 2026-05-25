// Gray-Scott reaction-diffusion 2D — Stack-C Vulkan/C++ port API.
//
// Sub-phase: sub-phase-reaction-diffusion-2d-stack-c, Stage 1a (scaffold).
// Charter docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md § 2 row
// "Stage 1a". This header DECLARES the port surface; the implementation is a
// Stage-1a STUB (src/gray_scott.cpp throws NotImplemented) — the RED anchor.
// Stage 1b lands the full Vulkan/C++ f64 NoContraction implementation consuming
// the §1.9.1-cpp substrate (vkcompute + capture + determinism).
//
// f64 (D12) + NoContraction (D13; Q-CPP1). Canonical descriptor
// gray-scott-lambda-128sq-seed42-step2000 (S-RD2C4). gate-14 cross-stack vs the
// Phase-1 NumPy f64 reference predicted shape (a) BIT-EXACT (step-1 measured 0.0).

#pragma once

#include <cstdint>
#include <filesystem>
#include <stdexcept>
#include <string>
#include <vector>

namespace bit_physics::reaction_diffusion_2d_stack_c {

// Thrown by the Stage-1a stub. Stage 1b replaces the bodies with the real
// Vulkan/C++ implementation; this type then disappears from the impl.
class NotImplemented : public std::logic_error {
public:
    explicit NotImplemented(const std::string& what) : std::logic_error(what) {}
};

// Gray-Scott parameter + run configuration. Defaults are the canonical
// lambda-region descriptor (n=128, step2000, seed42).
struct GrayScottConfig {
    uint32_t n = 128;
    double   Du = 0.16;
    double   Dv = 0.08;
    double   F = 0.0367;
    double   k = 0.0649;
    double   dx = 1.0;
    double   dt = 1.0;
    uint64_t seed = 42;
    uint32_t steps = 2000;
    uint32_t capture_interval = 200;
};

struct GrayScottResult {
    std::vector<double> final_u;   // n*n row-major
    std::vector<double> final_v;
    std::vector<uint32_t> captured_steps;
    std::vector<double> max_field_trajectory;  // max(|u|,|v|) per captured step
    bool   bounded = false;        // §L.4 characterisation
    std::string determinism_witness;  // sha256 of the final (u||v); 2-run bit-exact
};

// Run the canonical seeded Gray-Scott trajectory (plain step kernel) and,
// optionally, write a capture-v1 .h5 (+ .json sidecar) at `capture_manifest`.
// Stage 1b: builds the IC bit-identically to the NumPy reference, dispatches the
// NoContraction f64 kernel `steps` times (ping-pong), captures every
// `capture_interval`. STUB at Stage 1a (throws NotImplemented).
GrayScottResult run_gray_scott(const GrayScottConfig& cfg,
                               const std::filesystem::path* capture_manifest = nullptr);

// gate-4 MMS observed order of accuracy: runs the manufactured-source variant
// over the grid ladder at `t_final`, returns the observed L2 spatial order
// (expected within ±0.5 of 2.0 for the 5-point Laplacian). Consumes the shared
// solution at tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/.
// STUB at Stage 1a (throws NotImplemented).
double mms_observed_l2_order(const std::vector<uint32_t>& grid_ladder = {16, 32, 64, 128},
                             double t_final = 0.05);

}  // namespace bit_physics::reaction_diffusion_2d_stack_c

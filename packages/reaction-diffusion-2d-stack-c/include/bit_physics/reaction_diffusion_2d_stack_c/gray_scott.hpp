// Gray-Scott reaction-diffusion 2D — Stack-C Vulkan/C++ port API.
//
// Sub-phase: sub-phase-reaction-diffusion-2d-stack-c, Stage 1b (implementation).
// Charter docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md § 2 / § 3.
//
// f64 (D12) + NoContraction (D13; Q-CPP1) Vulkan-compute port of the Phase-1
// NumPy reference, consuming the §1.9.1-cpp substrate (vkcompute + capture +
// determinism). Canonical descriptor gray-scott-lambda-128sq-seed42-step2000.
//
// IC SOURCING (S1b-RD2C1): the NumPy reference IC is a seeded PCG64 draw — a
// NumPy artifact, not part of the ported dynamics. Rather than bit-reproduce
// NumPy's RNG in C++, the port consumes the reference's step-0 (U,V) via
// load_reference_ic() and evolves it. This isolates the stepping kernel (the
// unit under test) — frame 0 matches by construction; frames 1.. are the
// cross-stack test. (Stack-D shares NumPy's RNG so regenerates trivially; the
// Vulkan/C++ backend has no such luxury.)

#pragma once

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace bit_physics::reaction_diffusion_2d_stack_c {

// Gray-Scott parameter + run configuration. Defaults are the canonical
// lambda-region descriptor (n=128, step2000, seed42, capture interval 200).
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

struct Fields {
    std::vector<double> u;  // n*n row-major
    std::vector<double> v;
};

struct GrayScottResult {
    std::vector<double> final_u;
    std::vector<double> final_v;
    std::vector<uint32_t> captured_steps;
    std::vector<Fields>   captured_fields;     // parallel to captured_steps (gate-14 precursor)
    std::vector<double>   max_field_trajectory;  // max(|U|,|V|) per captured step
    bool   bounded = false;                    // §L.4 characterisation
    std::string determinism_witness;           // sha256(final U||V); 2-run bit-exact (Q-CPP1)
};

// Read the canonical IC (step-0 U,V) from a capture-v1 manifest (.json sidecar).
// S1b-RD2C1: the Stack-C port's IC source.
Fields load_reference_ic(const std::filesystem::path& manifest_json);

// Run the canonical seeded Gray-Scott trajectory (plain NoContraction f64
// kernel) from `ic`; capture every `capture_interval` steps; assert 2-run
// bit-identical determinism (Q-CPP1/Q-CPP3). Optionally write a capture-v1 .h5
// (+ .json) at `capture_manifest` (Q-CPP4 conformant).
GrayScottResult run_gray_scott(const GrayScottConfig& cfg, const Fields& ic,
                               const std::filesystem::path* capture_manifest = nullptr);

// gate-4 MMS observed order of accuracy: runs the manufactured-source kernel
// variant over the grid ladder to `t_final`, returns the observed asymptotic L2
// spatial order (expected 2.0 ± 0.5 for the 5-point Laplacian). Manufactured
// solution per tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/.
double mms_observed_l2_order(const std::vector<uint32_t>& grid_ladder = {16, 32, 64, 128},
                             double t_final = 0.05);

}  // namespace bit_physics::reaction_diffusion_2d_stack_c

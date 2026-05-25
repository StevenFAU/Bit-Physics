// C-4 gate — Vulkan-compute 2D advection-diffusion smoke (Stage 1c).
//
// Charter docs/phases/sub-phase-common-cpp-bootstrap.md § 3 C-4:
//   "Vulkan-compute 2D advection-diffusion exercises substrate + determinism +
//    HDF5 capture; stable bounded trajectory (§L.4); max-field bounded.
//    | smoke target + a test asserting capture written + bounded."
//
// Exercises the full matured surface end-to-end (substrate + determinism socket
// + FloatControls/NoContraction + capture-v1). Lavapipe pin set by CTest.

#include <doctest/doctest.h>

#include <filesystem>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "advection_diffusion_2d.hpp"

namespace smoke = bit_physics::common_cpp::smoke;
namespace cap = bit_physics::common_cpp::capture;
namespace det = bit_physics::common_cpp::determinism;

TEST_CASE("C-4 advection-diffusion smoke is bounded/stable (§L.4)") {
    smoke::AdvDiffConfig cfg;  // 64x64, 400 steps, diffusion-dominated
    smoke::AdvDiffResult r = smoke::run_advection_diffusion(cfg);

    REQUIRE(r.max_field_trajectory.size() > 1);
    // Gaussian peak ~1.0, sampled at cell centres near (0.5,0.5) -> ~0.99.
    CHECK(r.initial_max > 0.95f);
    CHECK(r.initial_max <= 1.0f);
    // §L.4: bounded (finite, never exceeds initial peak) + diffusion decays it.
    CHECK(r.bounded);
    CHECK(r.monotone_nonincreasing);
    CHECK(r.final_max < r.initial_max);   // genuine diffusion decay
    CHECK(r.final_max > 0.0f);            // not collapsed to zero
    MESSAGE("max-field: " << r.initial_max << " -> " << r.final_max);
}

TEST_CASE("C-4 smoke writes a capture-v1 capture that round-trips") {
    auto dir = std::filesystem::temp_directory_path() / "bitphysics_smoke_c4";
    std::filesystem::create_directories(dir);
    auto manifest = dir / "adv-diff-2d.json";

    smoke::AdvDiffConfig cfg;
    smoke::AdvDiffResult r = smoke::run_advection_diffusion(cfg, &manifest);

    REQUIRE(std::filesystem::exists(dir / "adv-diff-2d.h5"));
    cap::Hdf5Reader reader(manifest);
    CHECK(reader.manifest().sim.name == "advection-diffusion-2d");
    CHECK(reader.manifest().config.dtype == "f32");
    auto steps = reader.step_numbers();
    REQUIRE(steps.size() == r.captured_steps.size());
    // First captured step (0) field reads back with the right shape.
    cap::StepData s0 = reader.read_step(0);
    REQUIRE(s0.fields.count("u") == 1);
    CHECK(s0.fields.at("u").shape ==
          std::vector<int64_t>{static_cast<int64_t>(cfg.ny), static_cast<int64_t>(cfg.nx)});
    CHECK(s0.diagnostics.count("max_field") == 1);
}

TEST_CASE("C-4 smoke is deterministic (2-run bit-identical via the socket)") {
    smoke::AdvDiffConfig cfg;
    std::string digest = det::assert_deterministic_run(
        [&] { return smoke::run_advection_diffusion(cfg).final_field; }, /*runs=*/2);
    CHECK(digest.size() == 64);  // bit-identical across 2 runs (no divergence throw)
}

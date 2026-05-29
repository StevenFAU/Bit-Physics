// Canonical capture writer + PBT driver — mass-spring-cloth (Stack-C).
//
// Usage: cloth_capture <out_manifest.json> [flags]
//   --nx N --ny N --spacing S --steps S --substeps S --iterations I --seed S
//   --stretch-compliance C --bend-compliance C --damping D --capture-interval I
//   --gravity GX GY GZ --init-velocity VX VY VZ --pin MODE --no-shear --no-bending
//   --no-determinism-check
//   pin MODE in {none, top-corners, left-edge, ends}
//
// With NO config flags it writes the canonical descriptor
// flag-wind-128x128-seed42-step1000 (a 128x128 flag pinned at the left edge,
// under gravity + a steady +z wind). The flexible CLI also drives the Python PBT
// (Hypothesis generates IC params -> subprocess this binary -> read the .h5 ->
// assert invariants; charter D-PBT wiring).

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <string>
#include <vector>

#include "bit_physics/mass_spring_cloth/cloth.hpp"

namespace c = bit_physics::mass_spring_cloth;

namespace {
bool arg_is(const char* a, const char* name) { return std::strcmp(a, name) == 0; }
}  // namespace

int main(int argc, char** argv) {
    if (argc < 2) {
        std::fprintf(stderr, "usage: %s <out_manifest.json> [flags]\n", argv[0]);
        return 2;
    }
    std::filesystem::path out = argv[1];

    // canonical flag-wind-128x128-seed42-step1000 defaults
    c::ClothConfig cfg;
    cfg.nx = 128; cfg.ny = 128; cfg.spacing = 1.0; cfg.particle_mass = 1.0;
    cfg.gx = 0.0; cfg.gy = -9.81; cfg.gz = 3.0;   // gravity + steady wind (+z)
    cfg.dt = 1.0 / 60.0; cfg.substeps = 1; cfg.iterations = 20;
    cfg.stretch_compliance = 1e-7; cfg.bend_compliance = 1e-5;
    cfg.enable_shear = true; cfg.enable_bending = true;
    cfg.steps = 1000; cfg.capture_interval = 100; cfg.seed = 42;
    std::string pin_mode = "left-edge";
    double perturb = 0.0;  // deterministic initial-position jitter amplitude

    for (int i = 2; i < argc; ++i) {
        const char* a = argv[i];
        auto next_d = [&]() { return std::atof(argv[++i]); };
        auto next_u = [&]() { return static_cast<uint32_t>(std::atoll(argv[++i])); };
        if (arg_is(a, "--nx")) cfg.nx = next_u();
        else if (arg_is(a, "--ny")) cfg.ny = next_u();
        else if (arg_is(a, "--spacing")) cfg.spacing = next_d();
        else if (arg_is(a, "--steps")) cfg.steps = next_u();
        else if (arg_is(a, "--substeps")) cfg.substeps = next_u();
        else if (arg_is(a, "--iterations")) cfg.iterations = next_u();
        else if (arg_is(a, "--seed")) cfg.seed = std::atoll(argv[++i]);
        else if (arg_is(a, "--stretch-compliance")) cfg.stretch_compliance = next_d();
        else if (arg_is(a, "--bend-compliance")) cfg.bend_compliance = next_d();
        else if (arg_is(a, "--damping")) cfg.velocity_damping = next_d();
        else if (arg_is(a, "--capture-interval")) cfg.capture_interval = next_u();
        else if (arg_is(a, "--gravity")) { cfg.gx = next_d(); cfg.gy = next_d(); cfg.gz = next_d(); }
        else if (arg_is(a, "--init-velocity")) {
            cfg.initial_velocity = {next_d(), next_d(), next_d()};
        }
        else if (arg_is(a, "--pin")) pin_mode = argv[++i];
        else if (arg_is(a, "--perturb")) perturb = next_d();
        else if (arg_is(a, "--no-shear")) cfg.enable_shear = false;
        else if (arg_is(a, "--no-bending")) cfg.enable_bending = false;
        else if (arg_is(a, "--no-determinism-check")) cfg.assert_determinism = false;
        else { std::fprintf(stderr, "unknown flag: %s\n", a); return 2; }
    }

    // resolve pin mode -> pinned indices
    auto idx = [&](uint32_t i, uint32_t j) { return j * cfg.nx + i; };
    if (pin_mode == "none") {
        // free cloth (momentum PBT)
    } else if (pin_mode == "top-corners") {
        cfg.pinned = {idx(0, 0), idx(cfg.nx - 1u, 0)};
    } else if (pin_mode == "left-edge") {
        for (uint32_t j = 0; j < cfg.ny; ++j) cfg.pinned.push_back(idx(0, j));
    } else if (pin_mode == "ends") {
        cfg.pinned = {0u, cfg.nx * cfg.ny - 1u};
    } else {
        std::fprintf(stderr, "unknown pin mode: %s\n", pin_mode.c_str());
        return 2;
    }

    // deterministic initial-position jitter (no RNG -> reproducible): used by the
    // free-cloth momentum PBT to excite internal spring dynamics while leaving
    // total momentum conserved.
    if (perturb > 0.0) {
        const uint32_t N = cfg.nx * cfg.ny;
        std::vector<double> grid = c::build_grid_positions(cfg);
        for (uint32_t i = 0; i < N; ++i) {
            grid[3u * i] += perturb * std::sin(1.3 * i + 0.1);
            grid[3u * i + 1u] += perturb * std::sin(2.7 * i + 0.2);
            grid[3u * i + 2u] += perturb * std::sin(0.7 * i + 0.3);
        }
        cfg.initial_positions = grid;
    }

    c::ClothResult r = c::run_cloth(cfg, &out);
    std::printf("captured %zu frames; max_stretch_ratio=%.6e; max_speed=%.6e; witness=%s\n",
                r.captured_steps.size(), r.max_stretch_ratio, r.max_speed,
                r.determinism_witness.c_str());
    return 0;
}

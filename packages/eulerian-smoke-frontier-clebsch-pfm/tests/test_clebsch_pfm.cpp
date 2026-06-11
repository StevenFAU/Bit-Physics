// C-1 U-4 acceptance suite — gates 4-13 surface (doctest). Committed RED at stage 1a
// (spec § 1.3 step 4): the impl is stubbed; every run_clebsch/helper call throws.
//
// A1 (wave-function normalization + gauge structure):
//   - closed-form: the 2D-TG spherical-Clebsch lift is unit-norm exact-to-FP;
//   - closed-form: global-phase gauge invariance of the Eq.-19 face velocity;
//   - measured: carried Φ_{p,s} bit-drift = 0 between reinits (0-form transport);
//     post-reinit grid normalization deviation ≤ FP-tight bound.
// A2 (flow-map composition identity): ‖T̃F̃ − I‖_max bounded over a short horizon and
//   resolution-converging (test-mode forward Jacobian; charter § 3.4 anchor (b)).
// A3 (adapted inviscid Taylor-Green anchor, probe § 4.1): the z-invariant 2D TG is an
//   exact steady Euler solution — steady drift + kinetic-energy conservation bounded
//   (structural ceilings here; MEASURED-then-declared tightening at stage 1b), and the
//   closed-form lift's induced velocity converges to the analytic TG field with
//   resolution (the Eq.-19 discretization golden).
// Determinism: 2-run bit-identity witness (asserted inside run_clebsch) + a
//   cross-invocation witness-equality check.
// PBT-style property sweeps (gate-11 analogue): post-projection divergence bounded +
//   field finiteness/normalization across (ħ, IC) regimes.
// Capture: capture-v1 round-trip shape at toy resolution (Hdf5Reader).

#include <doctest/doctest.h>

#include <cmath>
#include <cstdio>
#include <filesystem>
#include <vector>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/clebsch_pfm/clebsch_pfm.hpp"

using namespace bit_physics::clebsch_pfm;
namespace cap = bit_physics::common_cpp::capture;

namespace {

ClebschConfig small_cfg(uint32_t n, uint32_t steps, InitialCondition ic) {
    ClebschConfig cfg;
    cfg.n = n;
    cfg.steps = steps;
    cfg.capture_interval = steps;  // first + last frame only
    cfg.dt = 0.005;
    cfg.hbar = 0.5;
    cfg.particles_per_cell = 8;
    cfg.n_v = 20;
    cfg.n_g = 5;
    cfg.ic = ic;
    cfg.with_density = false;  // velocity-only for the anchor fixtures
    return cfg;
}

double max_abs_diff(const std::vector<double>& a, const std::vector<double>& b) {
    double m = 0.0;
    for (size_t i = 0; i < a.size(); ++i) m = std::max(m, std::fabs(a[i] - b[i]));
    return m;
}

}  // namespace

TEST_CASE("A1 closed-form: 2D-TG spherical-Clebsch lift is unit-norm exact-to-FP") {
    const double pts[] = {0.0, 0.13, 0.25, 0.4999, 0.5, 0.75, 0.875, 0.999};
    for (double x : pts)
        for (double y : pts) {
            Spinor s = taylor_green_wave_2d(x, y, 0.5);
            double n2 = s[0] * s[0] + s[1] * s[1] + s[2] * s[2] + s[3] * s[3];
            CHECK(std::fabs(n2 - 1.0) <= 1e-15);
        }
}

TEST_CASE("A1 closed-form: global-phase gauge invariance of the Eq.-19 face velocity") {
    // arg<e^{i a}Phi_a, e^{i a}Phi_b> == arg<Phi_a, Phi_b> (exact identity; FP ~ulps).
    Spinor a = taylor_green_wave_2d(0.21, 0.37, 0.5);
    Spinor b = taylor_green_wave_2d(0.22, 0.37, 0.5);
    const double u0 = wave_velocity_face(a, b, 0.5, 1.0 / 64.0);
    const double thetas[] = {0.3, 1.7, -2.4, 3.1};
    for (double th : thetas) {
        double c = std::cos(th), s = std::sin(th);
        Spinor ar = {a[0] * c - a[1] * s, a[0] * s + a[1] * c,
                     a[2] * c - a[3] * s, a[2] * s + a[3] * c};
        Spinor br = {b[0] * c - b[1] * s, b[0] * s + b[1] * c,
                     b[2] * c - b[3] * s, b[2] * s + b[3] * c};
        double u1 = wave_velocity_face(ar, br, 0.5, 1.0 / 64.0);
        CHECK(std::fabs(u1 - u0) <= 1e-12 * std::max(1.0, std::fabs(u0)));
    }
}

TEST_CASE("A3 golden: lift-induced face velocity converges to analytic 2D TG") {
    // Sample the closed-form lift at adjacent cell centres; Eq.-19 face velocity must
    // approach the analytic TG x-velocity at the face midpoint as dx -> 0 (order >= 1.5
    // observed ratio; the discretization is formally 2nd-order for smooth phases).
    double err[2];
    int idx = 0;
    for (uint32_t n : {32u, 64u}) {
        double dx = 1.0 / n;
        double emax = 0.0;
        for (uint32_t j = 0; j < n; ++j)
            for (uint32_t i = 0; i < n; ++i) {
                double xc = (i + 0.5) * dx, yc = (j + 0.5) * dx;
                Spinor pa = taylor_green_wave_2d(xc, yc, 0.5);
                Spinor pb = taylor_green_wave_2d(xc + dx, yc, 0.5);
                double uf = wave_velocity_face(pa, pb, 0.5, dx);
                auto uref = taylor_green_velocity(InitialCondition::kTaylorGreen2DZInvariant,
                                                  xc + 0.5 * dx, yc, 0.25);
                emax = std::max(emax, std::fabs(uf - uref[0]));
            }
        err[idx++] = emax;
    }
    CHECK(err[1] < err[0]);
    CHECK(err[0] / err[1] >= 1.5);  // resolution-converging (gate: ratio, not abs value)
    CHECK(err[1] <= 0.05);          // structural ceiling at 64 (MEASURE + tighten at 1b)
}

TEST_CASE("A1 measured: 0-form transport — carried wave function has zero bit-drift") {
    ClebschConfig cfg = small_cfg(16, 12, InitialCondition::kTaylorGreen2DZInvariant);
    ClebschResult res = run_clebsch(cfg, nullptr);
    CHECK(res.max_carried_phi_drift == 0.0);     // Φ_{p,s} is carried, never evolved
    CHECK(res.max_norm_deviation <= 1e-14);      // post-reinit ||Φ_g|| = 1 FP-tight
}

TEST_CASE("A2: flow-map composition residual bounded + resolution-converging") {
    double resid[2];
    int idx = 0;
    for (uint32_t n : {16u, 32u}) {
        ClebschConfig cfg = small_cfg(n, 10, InitialCondition::kTaylorGreen2DZInvariant);
        cfg.n_g = 10;  // hold one gradient-map window across the horizon
        cfg.n_v = 10;
        cfg.track_forward_jacobian = true;
        ClebschResult res = run_clebsch(cfg, nullptr);
        resid[idx++] = res.max_flowmap_residual;
        CHECK(res.max_flowmap_residual > 0.0);   // genuinely measured, not a no-op
        CHECK(res.max_flowmap_residual <= 0.1);  // structural ceiling (tighten at 1b)
    }
    CHECK(resid[1] < resid[0]);  // converging with resolution at fixed dt/horizon
}

TEST_CASE("A3 steady anchor: z-invariant TG is preserved (drift + energy bounded)") {
    ClebschConfig cfg = small_cfg(32, 50, InitialCondition::kTaylorGreen2DZInvariant);
    cfg.capture_interval = 50;
    ClebschResult res = run_clebsch(cfg, nullptr);
    REQUIRE(res.frames.size() == 2);
    const StepFrame& f0 = res.frames.front();
    const StepFrame& fT = res.frames.back();
    double drift = std::max({max_abs_diff(f0.u, fT.u), max_abs_diff(f0.v, fT.v),
                             max_abs_diff(f0.w, fT.w)});
    // Structural ceilings (the analytic steady solution has |u|max = 1): MEASURED
    // values declared + tightened at stage 1b — never widened (spec § 2.6).
    CHECK(drift <= 0.10);
    CHECK(std::fabs(res.energy_final - res.energy_initial)
          <= 0.05 * std::fabs(res.energy_initial));
    // The closed-form IC must land near the analytic TG after init + projection.
    CHECK(res.init_velocity_residual <= 0.05);
}

TEST_CASE("PBT sweep: divergence + normalization + finiteness across regimes") {
    // Deterministic property sweep (the Stack-C doctest analogue of gate-11).
    const double hbars[] = {0.25, 0.5, 1.0};
    const InitialCondition ics[] = {InitialCondition::kTaylorGreen2DZInvariant,
                                    InitialCondition::kTaylorGreen3D};
    for (double hb : hbars)
        for (InitialCondition ic : ics) {
            ClebschConfig cfg = small_cfg(16, 8, ic);
            cfg.hbar = hb;
            cfg.init_descent_iters = 50;  // toy-size fit for the 3D IC
            ClebschResult res = run_clebsch(cfg, nullptr);
            CHECK(res.max_div_postproj <= 1e-3);  // fixed-cycle MG residual ceiling
            CHECK(res.max_norm_deviation <= 1e-12);
            for (const StepFrame& fr : res.frames)
                for (const auto* f : {&fr.u, &fr.v, &fr.w})
                    for (double x : *f) CHECK(std::isfinite(x));
        }
}

TEST_CASE("determinism: cross-invocation witness equality") {
    ClebschConfig cfg = small_cfg(16, 6, InitialCondition::kTaylorGreen2DZInvariant);
    ClebschResult r1 = run_clebsch(cfg, nullptr);  // each call also 2-run-asserts
    ClebschResult r2 = run_clebsch(cfg, nullptr);
    CHECK(r1.determinism_witness_sha256 == r2.determinism_witness_sha256);
    CHECK(!r1.determinism_witness_sha256.empty());
}

TEST_CASE("capture: capture-v1 round-trip shape at toy resolution") {
    ClebschConfig cfg = small_cfg(16, 4, InitialCondition::kTaylorGreen2DZInvariant);
    cfg.capture_interval = 2;
    cfg.with_density = true;
    auto dir = std::filesystem::temp_directory_path() / "bp-clebsch-pfm-test";
    std::filesystem::create_directories(dir);
    auto manifest = dir / "toy.json";
    ClebschResult res = run_clebsch(cfg, &manifest);
    REQUIRE(res.frames.size() == 3);  // steps 0, 2, 4
    cap::Hdf5Reader reader(manifest);
    CHECK(reader.manifest().sim.name == "eulerian-smoke");
    CHECK(reader.manifest().sim.variant == "frontier-clebsch-pfm");
    CHECK(reader.manifest().determinism.atomic_ops == false);
    auto steps = reader.step_numbers();
    REQUIRE(steps.size() == 3);
    cap::StepData sd = reader.read_step(steps.back());
    REQUIRE(sd.fields.count("u") == 1);
    REQUIRE(sd.fields.count("density") == 1);
    CHECK(sd.fields.at("u").shape == std::vector<int64_t>({16, 16, 16}));
    std::filesystem::remove_all(dir);
}

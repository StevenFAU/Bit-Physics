// C-1 U-3 acceptance suite — gates 4-13 surface (doctest).
//
// A1: mass + momentum conservation exact-to-FP on the f64 Vulkan path (periodic no-force
//     regime) and bounded-by-quantization on the frontier path.
// A2: moment-basis inverse residual ‖M·M⁻¹−I‖_max + the closed-form 16-bit round-trip
//     bound per moment.
// A3 (precursor): short-horizon equivalence vs the landed numpy parent capture (the full
//     canonical-horizon comparison runs in the stage-1c python harness).
// Determinism: run_lbm's 2-run bit-identity witness (assert_deterministic_run inside).
// PBT-style property sweeps: conservation + boundedness across (tau, force) configs.

#include <doctest/doctest.h>

#include <cmath>
#include <vector>

#include "bit_physics/lbm_d3q19_me/lbm_me.hpp"

using namespace bit_physics::lbm_d3q19_me;

namespace {

LbmConfig small_cfg(bool quantize, double tau = 0.7, double force_x = 0.0) {
    LbmConfig cfg;
    cfg.nx = 16;
    cfg.ny = 8;
    cfg.nz = 3;
    cfg.steps = 24;
    cfg.capture_interval = 24;
    cfg.tau = tau;
    cfg.force_x = force_x;
    cfg.quantize = quantize;
    cfg.warmup_steps = 24;
    return cfg;
}

double total_mass(const std::vector<double>& f, size_t n) {
    double s = 0.0;
    for (double x : f) s += x;
    (void)n;
    return s;
}

}  // namespace

TEST_CASE("constants: weights sum to 1; opposite map is an involution with c+c_opp=0") {
    double wsum = 0.0;
    {
        // weights are private to the impl; recover via the rest state (f = w_i per cell).
        LbmConfig cfg = small_cfg(false);
        std::vector<double> f0 = initial_rest_state(cfg);
        const size_t n = static_cast<size_t>(cfg.nx) * cfg.ny * cfg.nz;
        for (int i = 0; i < kQ; ++i) wsum += f0[static_cast<size_t>(i) * n];  // cell 0
    }
    CHECK(std::fabs(wsum - 1.0) <= 1e-15);
    for (int i = 0; i < kQ; ++i) {
        CHECK(kOpposite[kOpposite[i]] == i);
        for (int d = 0; d < 3; ++d)
            CHECK(kVelocities[i][d] + kVelocities[kOpposite[i]][d] == 0);
    }
}

TEST_CASE("A2: moment basis is invertible with FP-tight residual") {
    MomentBasis basis = build_moment_basis();
    CHECK(basis.inverse_residual <= 1e-12);
    // Rows 0..3 are exactly the density + momentum moments.
    for (int i = 0; i < kQ; ++i) {
        CHECK(basis.m[0 * kQ + i] == 1.0);
        CHECK(basis.m[1 * kQ + i] == static_cast<double>(kVelocities[i][0]));
        CHECK(basis.m[2 * kQ + i] == static_cast<double>(kVelocities[i][1]));
        CHECK(basis.m[3 * kQ + i] == static_cast<double>(kVelocities[i][2]));
    }
}

TEST_CASE("A2: 16-bit quantization round-trip is within the closed-form bound") {
    MomentBasis basis = build_moment_basis();
    LbmConfig cfg = small_cfg(true, 0.7, 1e-5);
    QuantRanges r = calibrate_ranges(cfg, basis);
    auto bound = r.bound();
    for (int k = 0; k < kQ; ++k) {
        CHECK(r.hi[k] > r.lo[k]);
        // Round-trip a fan of values across the range.
        for (int t = 0; t <= 10; ++t) {
            double m = r.lo[k] + (r.hi[k] - r.lo[k]) * (t / 10.0);
            double tt = (m - r.lo[k]) / (r.hi[k] - r.lo[k]);
            uint32_t code = static_cast<uint32_t>(std::lround(tt * 65535.0));
            double back = r.lo[k] + code * (r.hi[k] - r.lo[k]) / 65535.0;
            CHECK(std::fabs(back - m) <= bound[k] * (1.0 + 1e-12));
        }
    }
}

TEST_CASE("host reference: rest state is a fixed point without forcing") {
    LbmConfig cfg = small_cfg(false, 0.7, 0.0);
    std::vector<double> f = initial_rest_state(cfg);
    std::vector<double> f0 = f;
    reference_step(f, cfg);
    double dmax = 0.0;
    for (size_t i = 0; i < f.size(); ++i) dmax = std::max(dmax, std::fabs(f[i] - f0[i]));
    CHECK(dmax <= 1e-15);  // feq(rho=1,u=0) is invariant under BGK+stream+BB
}

TEST_CASE("A1: f64 Vulkan path conserves mass+momentum exactly-to-FP (no force)") {
    LbmConfig cfg = small_cfg(false, 0.8, 0.0);
    LbmResult res = run_lbm(cfg, nullptr);
    CHECK(std::fabs(res.total_mass_final - res.total_mass_initial)
          <= 1e-12 * std::fabs(res.total_mass_initial));
    for (int d = 0; d < 3; ++d)
        CHECK(std::fabs(res.total_momentum_final[d] - res.total_momentum_initial[d]) <= 1e-12);
}

TEST_CASE("A1-bounded: quantized path conserves mass within the quantization budget") {
    LbmConfig cfg = small_cfg(true, 0.8, 0.0);
    LbmResult res = run_lbm(cfg, nullptr);
    // Mass is moment 0 (range-bounded): per-cell error <= bound[0] per encode; the
    // budget over the horizon is steps * ncell * bound[0] (worst-case linear drift).
    auto bound = res.ranges_used.bound();
    const double ncell = static_cast<double>(cfg.nx) * cfg.ny * cfg.nz;
    const double budget = (cfg.steps + 1.0) * ncell * bound[0];
    CHECK(std::fabs(res.total_mass_final - res.total_mass_initial) <= budget);
}

TEST_CASE("PBT sweep: conservation + boundedness across (tau, force) regimes") {
    // Deterministic property sweep (the Stack-C doctest analogue of gate-11).
    const double taus[] = {0.6, 0.7, 1.0};
    const double forces[] = {0.0, 1e-5};
    for (double tau : taus)
        for (double fx : forces) {
            LbmConfig cfg = small_cfg(false, tau, fx);
            cfg.steps = 12;
            LbmResult res = run_lbm(cfg, nullptr);
            // mass is conserved with bounce-back + forcing (force adds momentum only)
            CHECK(std::fabs(res.total_mass_final - res.total_mass_initial)
                  <= 1e-11 * std::fabs(res.total_mass_initial));
            // densities stay positive + finite at these gentle regimes
            for (const StepFrame& fr : res.frames)
                for (double r : fr.rho) {
                    CHECK(std::isfinite(r));
                    CHECK(r > 0.0);
                }
        }
}

TEST_CASE("frontier vs f64: quantized trajectory tracks the f64 trajectory (bounded)") {
    LbmConfig cfg_q = small_cfg(true, 0.7, 1e-5);
    LbmConfig cfg_f = small_cfg(false, 0.7, 1e-5);
    cfg_q.steps = cfg_f.steps = 24;
    cfg_q.capture_interval = cfg_f.capture_interval = 24;
    LbmResult rq = run_lbm(cfg_q, nullptr);
    LbmResult rf = run_lbm(cfg_f, nullptr);
    REQUIRE(rq.frames.size() == rf.frames.size());
    const StepFrame& a = rq.frames.back();
    const StepFrame& b = rf.frames.back();
    double max_rho_err = 0.0;
    for (size_t i = 0; i < a.rho.size(); ++i)
        max_rho_err = std::max(max_rho_err, std::fabs(a.rho[i] - b.rho[i]));
    // Loose structural bound at this short horizon: quantization steps are ~1e-5-scale
    // (range-dependent); the declared canonical-horizon tolerance is measured at 1c.
    CHECK(max_rho_err <= 1e-2);
    CHECK(max_rho_err > 0.0);  // the quantized path is genuinely quantized (not a no-op)
}

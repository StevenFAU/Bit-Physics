// C-1 U-6 acceptance suite — gates 3/4/11 surface (doctest). Committed RED at stage 1a
// (spec § 1.3 step 4): the impl is stubbed; every run_edge/helper call throws. Every
// numeric ceiling below is a DECLARED placeholder to be MEASURED-then-tightened at stage
// 1b (the U-5 discipline — each declared bound is paired in the 1b/1c landing note with
// the measurement that backs it; never widened to pass).
//
// A1 (exact discrete structure + analytic golden):
//   - closed-form: taylor_green_vorticity IS ∇×taylor_green_velocity (FD cross-check of
//     the hand-derived lift at off-lattice points);
//   - exact identity: div(u) of EVERY curl-reconstructed field is FP-noise, not
//     truncation (the compatible stencil pair, vpfm substrate) — PBT 1 closed form;
//   - reconstruction golden: velocity reconstructed from edge-sampled analytic 2D-TG
//     vorticity converges to the analytic TG velocity with resolution.
// A2 (the EDGE flow-map surfaces — anchor § 3):
//   - GRADIENT EVOLUTION (item 1): the evolved on-grid Jacobian ∇ψ matches a
//     finite-difference of the evolved backward map ψ, bounded + resolution-converging;
//   - O(1) MEMORY (item 4): the backward-map peak working set is CONSTANT as the
//     reinit interval (flow-map length L) grows — the headline rigorous claim.
// A3 (adapted inviscid Taylor-Green anchor, probe § 4.1): the z-invariant 2D TG is an
//   exact steady Euler solution — steady drift + kinetic-energy conservation bounded.
// Kelvin (charter § 3.6 anchor): total-vorticity component budgets + fixed grid-loop
//   circulation drift bounded — PBT 2 surface.
// Determinism: 2-run bit-identity witness (asserted inside run_edge) + a
//   cross-invocation witness-equality check (gate 11).
// Capture: capture-v1 round-trip shape at toy resolution (Hdf5Reader).

#include <doctest/doctest.h>

#include <cmath>
#include <cstdio>
#include <filesystem>
#include <vector>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/edge/edge.hpp"

using namespace bit_physics::edge;
namespace cap = bit_physics::common_cpp::capture;

namespace {

EdgeConfig small_cfg(uint32_t n, uint32_t steps, InitialCondition ic) {
    EdgeConfig cfg;
    cfg.n = n;
    cfg.steps = steps;
    cfg.capture_interval = steps;  // first + last frame only
    cfg.dt = 0.005;
    cfg.reinit_interval = 20;
    cfg.ic = ic;
    cfg.with_density = false;  // velocity-only for the anchor fixtures
    return cfg;
}

double max_abs_diff(const std::vector<double>& a, const std::vector<double>& b) {
    double m = 0.0;
    for (size_t i = 0; i < a.size(); ++i) m = std::max(m, std::fabs(a[i] - b[i]));
    return m;
}

// Edge-lattice sample positions for the +owner convention (vpfm curl-shader header):
// ωx[c] at (i+½, j+1, k+1)·dx; ωy[c] at (i+1, j+½, k+1)·dx; ωz[c] at (i+1, j+1, k+½)·dx.
void sample_vorticity_edges(InitialCondition ic, uint32_t n, std::vector<double>& wx,
                            std::vector<double>& wy, std::vector<double>& wz) {
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double dx = 1.0 / n;
    wx.resize(ncell);
    wy.resize(ncell);
    wz.resize(ncell);
    for (std::size_t c = 0; c < ncell; ++c) {
        uint32_t i = static_cast<uint32_t>(c % n);
        uint32_t j = static_cast<uint32_t>((c / n) % n);
        uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
        wx[c] = taylor_green_vorticity(ic, (i + 0.5) * dx, (j + 1.0) * dx,
                                       (k + 1.0) * dx)[0];
        wy[c] = taylor_green_vorticity(ic, (i + 1.0) * dx, (j + 0.5) * dx,
                                       (k + 1.0) * dx)[1];
        wz[c] = taylor_green_vorticity(ic, (i + 1.0) * dx, (j + 1.0) * dx,
                                       (k + 0.5) * dx)[2];
    }
}

}  // namespace

TEST_CASE("A1 closed-form: hand-derived vorticity lift IS the curl of the velocity") {
    // Central-difference cross-check of taylor_green_vorticity vs taylor_green_velocity
    // at off-lattice points (h = 1e-5; FD truncation ~h² ≈ 1e-10).
    const double h = 1e-5;
    const double pts[] = {0.07, 0.21, 0.382, 0.5, 0.66, 0.91};
    for (InitialCondition ic : {InitialCondition::kTaylorGreen3D,
                                InitialCondition::kTaylorGreen2DZInvariant})
        for (double x : pts)
            for (double y : pts) {
                const double z = 0.33;
                auto u = [&](double xx, double yy, double zz, int d) {
                    return taylor_green_velocity(ic, xx, yy, zz)[d];
                };
                double fd[3] = {
                    (u(x, y + h, z, 2) - u(x, y - h, z, 2)) / (2 * h) -
                        (u(x, y, z + h, 1) - u(x, y, z - h, 1)) / (2 * h),
                    (u(x, y, z + h, 0) - u(x, y, z - h, 0)) / (2 * h) -
                        (u(x + h, y, z, 2) - u(x - h, y, z, 2)) / (2 * h),
                    (u(x + h, y, z, 1) - u(x - h, y, z, 1)) / (2 * h) -
                        (u(x, y + h, z, 0) - u(x, y - h, z, 0)) / (2 * h)};
                auto w = taylor_green_vorticity(ic, x, y, z);
                for (int d = 0; d < 3; ++d) CHECK(std::fabs(w[d] - fd[d]) <= 1e-8);
            }
}

TEST_CASE("A1 exact identity: div of the curl-reconstructed field is FP-noise") {
    // The compatible stencil pair (vpfm curl shader): every edge value cancels exactly
    // in the 6-face divergence sum. This is an IDENTITY (~1e-12 scaled), not a truncation
    // bound — asserted on the reconstruction of a genuinely 3D field.
    for (uint32_t n : {16u, 32u}) {
        std::vector<double> wx, wy, wz, ux, uy, uz;
        sample_vorticity_edges(InitialCondition::kTaylorGreen3D, n, wx, wy, wz);
        reconstruct_velocity_from_vorticity(wx, wy, wz, n, 6, ux, uy, uz);
        const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
        const double dx = 1.0 / n;
        double dmax = 0.0, umax = 0.0;
        for (std::size_t c = 0; c < ncell; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            std::size_t cxm = (static_cast<std::size_t>(k) * n + j) * n + (i + n - 1) % n;
            std::size_t cym = (static_cast<std::size_t>(k) * n + (j + n - 1) % n) * n + i;
            std::size_t czm = (static_cast<std::size_t>((k + n - 1) % n) * n + j) * n + i;
            double d = ((ux[c] - ux[cxm]) + (uy[c] - uy[cym]) + (uz[c] - uz[czm])) / dx;
            dmax = std::max(dmax, std::fabs(d));
            umax = std::max({umax, std::fabs(ux[c]), std::fabs(uy[c]), std::fabs(uz[c])});
        }
        CHECK(umax > 0.1);  // genuinely reconstructed, not a zero field
        CHECK(dmax <= 1e-12 * std::max(1.0, umax) * n);  // identity (MEASURE 1b)
    }
}

TEST_CASE("A1 golden: reconstruction from analytic 2D-TG vorticity converges to TG") {
    double err[2];
    int idx = 0;
    for (uint32_t n : {16u, 32u}) {
        std::vector<double> wx, wy, wz, ux, uy, uz;
        sample_vorticity_edges(InitialCondition::kTaylorGreen2DZInvariant, n, wx, wy, wz);
        reconstruct_velocity_from_vorticity(wx, wy, wz, n, 8, ux, uy, uz);
        const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
        const double dx = 1.0 / n;
        double emax = 0.0;
        for (std::size_t c = 0; c < ncell; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            double tu = taylor_green_velocity(InitialCondition::kTaylorGreen2DZInvariant,
                                              (i + 1.0) * dx, (j + 0.5) * dx,
                                              (k + 0.5) * dx)[0];
            double tv = taylor_green_velocity(InitialCondition::kTaylorGreen2DZInvariant,
                                              (i + 0.5) * dx, (j + 1.0) * dx,
                                              (k + 0.5) * dx)[1];
            emax = std::max({emax, std::fabs(ux[c] - tu), std::fabs(uy[c] - tv),
                             std::fabs(uz[c])});
        }
        err[idx++] = emax;
    }
    CHECK(err[1] < err[0]);
    CHECK(err[0] / err[1] >= 3.0);  // O(dx²): 4x expected; gate at 3x (MEASURE 1b)
    CHECK(err[1] <= 5e-3);          // DECLARED placeholder — MEASURE 1b
}

TEST_CASE("A2 gradient evolution: evolved grad-psi matches finite-difference of psi") {
    // Anchor § 3 item 1: the on-grid evolved Jacobian ∇ψ must agree with a central
    // difference of the evolved backward map ψ (the Hermite-gradient consistency
    // surface), bounded and resolution-converging (the index/sign-bug discriminator —
    // a defect would not converge). DECLARED placeholders — MEASURE-then-tighten 1b.
    double resid[2];
    int idx = 0;
    for (uint32_t n : {16u, 32u}) {
        EdgeConfig cfg = small_cfg(n, 8, InitialCondition::kTaylorGreen2DZInvariant);
        cfg.reinit_interval = 8;  // one flow-map window across the horizon
        cfg.track_gradient_fd = true;
        EdgeResult res = run_edge(cfg, nullptr);
        CHECK(res.max_gradient_fd_residual > 0.0);  // genuinely measured, not a no-op
        resid[idx++] = res.max_gradient_fd_residual;
    }
    CHECK(resid[1] < resid[0]);  // resolution-converging (the discriminator)
    CHECK(resid[0] <= 0.25);     // DECLARED placeholder — MEASURE 1b
}

TEST_CASE("A2 O(1) memory: backward-map peak working set is constant in flow-map length") {
    // THE distinctive rigorous gate (anchor § 3 item 4 / charter § 3.6): buffer methods'
    // working set grows with the flow-map length L; EDGE's does NOT. Run the SAME
    // trajectory at two reinit intervals (L = 10 and L = 40) and assert the measured
    // backward-map peak bytes are identical — the falsifiable O(1) surface (PBT
    // backward_map_memory_constant). The perf-ledger memory row records the absolute
    // figure at 1c.
    EdgeConfig a = small_cfg(16, 40, InitialCondition::kTaylorGreen2DZInvariant);
    a.reinit_interval = 10;
    EdgeConfig b = small_cfg(16, 40, InitialCondition::kTaylorGreen2DZInvariant);
    b.reinit_interval = 40;  // 4× the flow-map length
    EdgeResult ra = run_edge(a, nullptr);
    EdgeResult rb = run_edge(b, nullptr);
    CHECK(ra.backward_map_peak_bytes > 0);             // genuinely measured
    CHECK(ra.backward_map_peak_bytes == rb.backward_map_peak_bytes);  // O(1): constant
}

TEST_CASE("A3 steady anchor: z-invariant TG is preserved (drift + energy bounded)") {
    EdgeConfig cfg = small_cfg(32, 50, InitialCondition::kTaylorGreen2DZInvariant);
    cfg.capture_interval = 50;
    EdgeResult res = run_edge(cfg, nullptr);
    REQUIRE(res.frames.size() == 2);
    const StepFrame& f0 = res.frames.front();
    const StepFrame& fT = res.frames.back();
    double drift = std::max({max_abs_diff(f0.u, fT.u), max_abs_diff(f0.v, fT.v),
                             max_abs_diff(f0.w, fT.w)});
    CHECK(drift <= 2e-3);  // DECLARED placeholder — MEASURE 1b
    CHECK(std::fabs(res.energy_final - res.energy_initial) <=
          3e-3 * std::fabs(res.energy_initial));
    CHECK(res.init_velocity_residual <= 5e-3);  // grid IC seed lands near analytic TG
}

TEST_CASE("PBT sweep: exact div identity + Kelvin budgets + finiteness across regimes") {
    // PBT 1: reconstructed_velocity_divergence_free — the discrete identity holds at FP
    //   scale EVERY step (max over the run, measured inside run_edge).
    // PBT 2: total_circulation_bounded — total-vorticity component budgets + fixed
    //   grid-loop circulation drift bounded (Kelvin; structural ceilings, MEASURE 1b).
    const uint32_t reinits[] = {20u, 8u, 4u};
    const InitialCondition ics[] = {InitialCondition::kTaylorGreen2DZInvariant,
                                    InitialCondition::kTaylorGreen3D};
    for (uint32_t L : reinits)
        for (InitialCondition ic : ics) {
            EdgeConfig cfg = small_cfg(16, 8, ic);
            cfg.reinit_interval = L;
            EdgeResult res = run_edge(cfg, nullptr);
            CHECK(res.max_div_postproj <= 1e-12);      // FP identity, not truncation
            CHECK(res.max_total_vorticity <= 2e-4);    // Kelvin budget — MEASURE 1b
            CHECK(res.max_circulation_drift <= 1e-2);  // loop circulation — MEASURE 1b
            for (const StepFrame& fr : res.frames)
                for (const auto* f : {&fr.u, &fr.v, &fr.w})
                    for (double x : *f) CHECK(std::isfinite(x));
        }
}

TEST_CASE("determinism: cross-invocation witness equality") {
    EdgeConfig cfg = small_cfg(16, 6, InitialCondition::kTaylorGreen2DZInvariant);
    EdgeResult r1 = run_edge(cfg, nullptr);  // each call also 2-run-asserts
    EdgeResult r2 = run_edge(cfg, nullptr);
    CHECK(r1.determinism_witness_sha256 == r2.determinism_witness_sha256);
    CHECK(!r1.determinism_witness_sha256.empty());
}

TEST_CASE("capture: capture-v1 round-trip shape at toy resolution") {
    EdgeConfig cfg = small_cfg(16, 4, InitialCondition::kTaylorGreen2DZInvariant);
    cfg.capture_interval = 2;
    cfg.with_density = true;
    auto dir = std::filesystem::temp_directory_path() / "bp-edge-test";
    std::filesystem::create_directories(dir);
    auto manifest = dir / "toy.json";
    EdgeResult res = run_edge(cfg, &manifest);
    REQUIRE(res.frames.size() == 3);  // steps 0, 2, 4
    cap::Hdf5Reader reader(manifest);
    CHECK(reader.manifest().sim.name == "eulerian-smoke");
    CHECK(reader.manifest().sim.variant == "frontier-edge");
    CHECK(reader.manifest().determinism.atomic_ops == false);
    auto steps = reader.step_numbers();
    REQUIRE(steps.size() == 3);
    cap::StepData sd = reader.read_step(steps.back());
    REQUIRE(sd.fields.count("u") == 1);
    REQUIRE(sd.fields.count("density") == 1);
    CHECK(sd.fields.at("u").shape == std::vector<int64_t>({16, 16, 16}));
    std::filesystem::remove_all(dir);
}

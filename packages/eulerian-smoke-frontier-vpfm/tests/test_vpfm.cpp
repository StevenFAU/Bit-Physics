// C-1 U-5 acceptance suite — gates 4-13 surface (doctest). Committed RED at stage 1a
// (spec § 1.3 step 4): the impl is stubbed; every run_vpfm/helper call throws.
//
// A1 (exact discrete structure + analytic golden):
//   - closed-form: taylor_green_vorticity IS ∇×taylor_green_velocity (FD cross-check
//     of the hand-derived lift at off-lattice points);
//   - reconstruction golden: velocity reconstructed from the edge-sampled analytic
//     2D-TG vorticity converges to the analytic TG velocity with resolution;
//   - exact identity: div(u) of EVERY curl-reconstructed field is FP-noise, not
//     truncation (the compatible stencil pair, probe § 4.3) — PBT 1 closed form.
// A2 (flow-map fidelity): ‖𝒯ℱ − I‖_max bounded + dt-converging over the short
//   segment (the U-4 anchor verbatim), and the EVOLVED Hessian ∇ℱ matches the
//   finite-difference of ℱ on a probe subset (Eq.-14 validation; paper § 6 logic).
// A3 (adapted inviscid Taylor-Green anchor, probe § 4.1): the z-invariant 2D TG is an
//   exact steady Euler solution — steady drift + kinetic-energy conservation bounded
//   (structural ceilings here; MEASURED-then-declared tightening at stage 1b), and
//   the vorticity-lift IC lands near the analytic TG after reconstruction.
// Kelvin (charter § 3.5 anchor (b)): total-vorticity component budgets + fixed
//   grid-loop circulation drift bounded — PBT 2 surface.
// Determinism: 2-run bit-identity witness (asserted inside run_vpfm) + a
//   cross-invocation witness-equality check; carried ω_a bit-drift exactly 0 between
//   long-map reinits (the U-4 carried-quantity analogue).
// Capture: capture-v1 round-trip shape at toy resolution (Hdf5Reader).

#include <doctest/doctest.h>

#include <cmath>
#include <cstdio>
#include <filesystem>
#include <vector>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/vpfm/vpfm.hpp"

using namespace bit_physics::vpfm;
namespace cap = bit_physics::common_cpp::capture;

namespace {

VpfmConfig small_cfg(uint32_t n, uint32_t steps, InitialCondition ic) {
    VpfmConfig cfg;
    cfg.n = n;
    cfg.steps = steps;
    cfg.capture_interval = steps;  // first + last frame only
    cfg.dt = 0.005;
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

// Edge-lattice sample positions for the +owner convention (probe § 4.3 / curl shader
// header): Ψx/ωx[c] at (i+½, j+1, k+1)·dx; Ψy/ωy[c] at (i+1, j+½, k+1)·dx;
// Ψz/ωz[c] at (i+1, j+1, k+½)·dx.
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
                for (int d = 0; d < 3; ++d)
                    CHECK(std::fabs(w[d] - fd[d]) <= 1e-8);
            }
}

TEST_CASE("A1 exact identity: div of the curl-reconstructed field is FP-noise") {
    // The compatible stencil pair (curl shader header): every edge value cancels
    // exactly in the 6-face divergence sum. This is an IDENTITY (~1e-12 scaled), not
    // a truncation bound — asserted on the reconstruction of a genuinely 3D field.
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
        CHECK(dmax <= 1e-11 * std::max(1.0, umax) / (1.0 / n));  // FP-scale, dx-scaled
    }
}

TEST_CASE("A1 golden: reconstruction from analytic 2D-TG vorticity converges to TG") {
    // ΔΨ_d = −ω_d (mean-subtracted) + u = ∇×Ψ recovers the velocity up to O(dx²)
    // truncation; TG has zero mean flow so no harmonic part is lost (probe § 4.2).
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
    CHECK(err[0] / err[1] >= 3.0);  // O(dx²): 4x expected; gate at 3x
    CHECK(err[1] <= 0.05);          // structural ceiling at 32 (MEASURE + tighten at 1b)
}

TEST_CASE("A1 measured: carried vorticity has zero bit-drift between long reinits") {
    VpfmConfig cfg = small_cfg(16, 12, InitialCondition::kTaylorGreen2DZInvariant);
    VpfmResult res = run_vpfm(cfg, nullptr);
    CHECK(res.max_carried_omega_drift == 0.0);  // ω_a is carried, never evolved
}

TEST_CASE("A2: flow-map composition residual bounded + dt-converging") {
    // d(𝒯ℱ)/dt ≡ 0 along any trajectory (algebraically exact in continuous time);
    // the measured residual is pure RK4 truncation, hence dt-converging (the U-4
    // anchor verbatim — global O(dt⁴): halving dt contracts ~16×; gate ≥ 8×).
    // Structural ceiling here; MEASURED-then-declared tightening at stage 1b.
    double resid[2];
    int idx = 0;
    for (uint32_t halvings : {0u, 1u}) {
        uint32_t steps = 10u << halvings;
        VpfmConfig cfg = small_cfg(16, steps, InitialCondition::kTaylorGreen2DZInvariant);
        cfg.dt = 0.005 / (1u << halvings);  // same physical horizon
        cfg.n_g = steps;  // hold one short-map window across the horizon
        cfg.n_v = steps;
        cfg.track_forward_jacobian = true;
        VpfmResult res = run_vpfm(cfg, nullptr);
        resid[idx++] = res.max_flowmap_residual;
        CHECK(res.max_flowmap_residual > 0.0);    // genuinely measured, not a no-op
        CHECK(res.max_flowmap_residual <= 1e-6);  // structural (U-4 measured 3.7e-9)
    }
    CHECK(resid[0] / resid[1] >= 8.0);  // O(dt^4) contraction under dt-halving
}

TEST_CASE("A2 Hessian: evolved grad-F matches finite-difference of F on probes") {
    // Eq.-14 validation (the paper's central innovation): ∇ℱ evolved directly on
    // particles vs the central difference of ℱ across ±ε-perturbed re-advected probe
    // clones. Both are RK4-exact in the same field, so the residual is the FD
    // truncation + Hessian-evolution consistency — bounded and small on the smooth
    // TG field. Structural ceiling; MEASURED-then-declared tightening at 1b.
    VpfmConfig cfg = small_cfg(16, 8, InitialCondition::kTaylorGreen2DZInvariant);
    cfg.n_g = 8;  // one short-map window
    cfg.n_v = 8;
    cfg.track_hessian_fd = true;
    VpfmResult res = run_vpfm(cfg, nullptr);
    CHECK(res.max_hessian_fd_residual > 0.0);   // genuinely measured
    CHECK(res.max_hessian_fd_residual <= 0.05);  // structural ceiling (MEASURE at 1b)
}

TEST_CASE("A3 steady anchor: z-invariant TG is preserved (drift + energy bounded)") {
    VpfmConfig cfg = small_cfg(32, 50, InitialCondition::kTaylorGreen2DZInvariant);
    cfg.capture_interval = 50;
    VpfmResult res = run_vpfm(cfg, nullptr);
    REQUIRE(res.frames.size() == 2);
    const StepFrame& f0 = res.frames.front();
    const StepFrame& fT = res.frames.back();
    double drift = std::max({max_abs_diff(f0.u, fT.u), max_abs_diff(f0.v, fT.v),
                             max_abs_diff(f0.w, fT.w)});
    // Structural ceilings (the U-4 stage-1a shape); MEASURED tightening at 1b.
    CHECK(drift <= 0.10);
    CHECK(std::fabs(res.energy_final - res.energy_initial)
          <= 0.05 * std::fabs(res.energy_initial));
    // The vorticity-lift IC must land near the analytic TG after reconstruction.
    CHECK(res.init_velocity_residual <= 0.05);
}

TEST_CASE("PBT sweep: exact div identity + Kelvin budgets + finiteness across regimes") {
    // Deterministic property sweep (the Stack-C doctest analogue of gate-11).
    // PBT 1: reconstructed_velocity_divergence_free — the discrete identity holds at
    //   FP scale EVERY step (max over the run, measured inside run_vpfm).
    // PBT 2: total_circulation_bounded — total-vorticity component budgets + fixed
    //   grid-loop circulation drift bounded (Kelvin; structural ceilings, MEASURE 1b).
    const uint32_t cadences[][2] = {{20u, 5u}, {8u, 4u}, {6u, 2u}};
    const InitialCondition ics[] = {InitialCondition::kTaylorGreen2DZInvariant,
                                    InitialCondition::kTaylorGreen3D};
    for (auto& cad : cadences)
        for (InitialCondition ic : ics) {
            VpfmConfig cfg = small_cfg(16, 8, ic);
            cfg.n_v = cad[0];
            cfg.n_g = cad[1];
            VpfmResult res = run_vpfm(cfg, nullptr);
            CHECK(res.max_div_postproj <= 1e-9);        // FP identity, not truncation
            CHECK(res.max_total_vorticity <= 0.05);     // Kelvin budget (structural)
            CHECK(res.max_circulation_drift <= 0.10);   // loop circulation (structural)
            for (const StepFrame& fr : res.frames)
                for (const auto* f : {&fr.u, &fr.v, &fr.w})
                    for (double x : *f) CHECK(std::isfinite(x));
        }
}

TEST_CASE("determinism: cross-invocation witness equality") {
    VpfmConfig cfg = small_cfg(16, 6, InitialCondition::kTaylorGreen2DZInvariant);
    VpfmResult r1 = run_vpfm(cfg, nullptr);  // each call also 2-run-asserts
    VpfmResult r2 = run_vpfm(cfg, nullptr);
    CHECK(r1.determinism_witness_sha256 == r2.determinism_witness_sha256);
    CHECK(!r1.determinism_witness_sha256.empty());
}

TEST_CASE("capture: capture-v1 round-trip shape at toy resolution") {
    VpfmConfig cfg = small_cfg(16, 4, InitialCondition::kTaylorGreen2DZInvariant);
    cfg.capture_interval = 2;
    cfg.with_density = true;
    auto dir = std::filesystem::temp_directory_path() / "bp-vpfm-test";
    std::filesystem::create_directories(dir);
    auto manifest = dir / "toy.json";
    VpfmResult res = run_vpfm(cfg, &manifest);
    REQUIRE(res.frames.size() == 3);  // steps 0, 2, 4
    cap::Hdf5Reader reader(manifest);
    CHECK(reader.manifest().sim.name == "eulerian-smoke");
    CHECK(reader.manifest().sim.variant == "frontier-vpfm");
    CHECK(reader.manifest().determinism.atomic_ops == false);
    auto steps = reader.step_numbers();
    REQUIRE(steps.size() == 3);
    cap::StepData sd = reader.read_step(steps.back());
    REQUIRE(sd.fields.count("u") == 1);
    REQUIRE(sd.fields.count("density") == 1);
    CHECK(sd.fields.at("u").shape == std::vector<int64_t>({16, 16, 16}));
    std::filesystem::remove_all(dir);
}

// C-1 U-5 stage 1b-iii — the VPFM trajectory (paper Eqs. 11-21 on the Stack-C
// substrate). Vulkan f64 NoContraction kernels carry the per-face/per-cell grid
// vector arithmetic (staggered curl, MAC divergence); host C++ carries particle
// flow-map transport (vpfm_particles.cpp), the fixed-cycle multigrid vector-potential
// solves, and the closed-form vorticity-lift init (vpfm_detail.hpp derivations).
// Witness: 2-run bit-identity; run #2 writes the capture (the asserted identity makes
// run-2 bytes the verified reference).

#include "bit_physics/vpfm/vpfm.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <stdexcept>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/vulkan_compute.hpp"

#include "vpfm_curl.spv.h"        // const uint32_t kVpfmCurlSpv[]
#include "vpfm_divergence.spv.h"  // const uint32_t kVpfmDivergenceSpv[]
#include "vpfm_detail.hpp"

namespace bit_physics::vpfm {

namespace vk = bit_physics::common_cpp::vkcompute;
namespace cap = bit_physics::common_cpp::capture;
namespace det = bit_physics::common_cpp::determinism;
using detail::cell_index;

namespace {

struct PushGrid {
    uint32_t n;
    uint32_t pad0;
    double dx;
};

std::string utc_now() {
    std::time_t now = std::time(nullptr);
    std::tm tm_buf{};
    gmtime_r(&now, &tm_buf);
    char buf[32];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm_buf);
    return buf;
}

// Vulkan kernel set shared by one trajectory run.
struct Kernels {
    vk::ComputeContext ctx;
    vk::ComputePipeline curl, divergence;
    vk::StorageBuffer px, py, pz;      // vector-potential edge fields (ncell each)
    vk::StorageBuffer fx, fy, fz, dv;  // face velocity I/O + divergence (ncell each)
    uint32_t n = 0;

    explicit Kernels(uint32_t n_) : n(n_) {
        vk::ComputeContextConfig cc;
        cc.app_name = "eulerian-smoke-vpfm";
        cc.api_version_minor = 2;
        cc.require_float64 = true;
        ctx = vk::ComputeContext::create(cc);
        ctx.assert_deterministic_float_controls();
        auto make = [&](const uint32_t* spv, size_t words, uint32_t bindings) {
            vk::ComputePipeline::Options o;
            o.spirv = spv;
            o.spirv_word_count = words;
            o.binding_count = bindings;
            o.push_constant_bytes = sizeof(PushGrid);
            return vk::ComputePipeline(ctx, o);
        };
        curl = make(kVpfmCurlSpv, sizeof(kVpfmCurlSpv) / sizeof(uint32_t), 6);
        divergence =
            make(kVpfmDivergenceSpv, sizeof(kVpfmDivergenceSpv) / sizeof(uint32_t), 4);
        const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
        px = vk::StorageBuffer(ctx, ncell * sizeof(double));
        py = vk::StorageBuffer(ctx, ncell * sizeof(double));
        pz = vk::StorageBuffer(ctx, ncell * sizeof(double));
        fx = vk::StorageBuffer(ctx, ncell * sizeof(double));
        fy = vk::StorageBuffer(ctx, ncell * sizeof(double));
        fz = vk::StorageBuffer(ctx, ncell * sizeof(double));
        dv = vk::StorageBuffer(ctx, ncell * sizeof(double));
    }

    // (fx,fy,fz) <- curl of the edge fields already in (px,py,pz).
    void run_curl(double dx) {
        const uint32_t ncell = n * n * n;
        curl.bind(0, px);
        curl.bind(1, py);
        curl.bind(2, pz);
        curl.bind(3, fx);
        curl.bind(4, fy);
        curl.bind(5, fz);
        PushGrid pc{n, 0u, dx};
        vk::dispatch(ctx, curl, (ncell + 63) / 64, 1, 1, &pc);
    }

    // dv <- MAC divergence of the face fields already in (fx,fy,fz).
    void run_divergence(double dx) {
        const uint32_t ncell = n * n * n;
        divergence.bind(0, fx);
        divergence.bind(1, fy);
        divergence.bind(2, fz);
        divergence.bind(3, dv);
        PushGrid pc{n, 0u, dx};
        vk::dispatch(ctx, divergence, (ncell + 63) / 64, 1, 1, &pc);
    }
};

// Solve ΔΨ_d = −ω_d (componentwise, periodic, fixed cycles; warm-started psi) and
// reconstruct u = ∇×Ψ on faces via the device curl kernel. Records max |div u|
// (device divergence kernel — the exact-identity PBT surface) into *div_max_out.
void reconstruct(Kernels& K, const std::vector<double>& wx,
                 const std::vector<double>& wy, const std::vector<double>& wz,
                 uint32_t vcycles, std::vector<double> psi[3], std::vector<double>& ux,
                 std::vector<double>& uy, std::vector<double>& uz,
                 double* div_max_out) {
    const uint32_t n = K.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double dx = 1.0 / static_cast<double>(n);
    const std::vector<double>* w[3] = {&wx, &wy, &wz};
    std::vector<double> rhs(ncell);
    for (int d = 0; d < 3; ++d) {
        if (psi[d].size() != ncell) psi[d].assign(ncell, 0.0);
        detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
            for (std::size_t c = lo; c < hi; ++c) rhs[c] = -(*w[d])[c];
        });
        detail::poisson_periodic_mg(psi[d], rhs, n, dx, vcycles);
    }
    std::memcpy(K.px.mapped(), psi[0].data(), ncell * sizeof(double));
    std::memcpy(K.py.mapped(), psi[1].data(), ncell * sizeof(double));
    std::memcpy(K.pz.mapped(), psi[2].data(), ncell * sizeof(double));
    K.run_curl(dx);
    ux.resize(ncell);
    uy.resize(ncell);
    uz.resize(ncell);
    std::memcpy(ux.data(), K.fx.mapped(), ncell * sizeof(double));
    std::memcpy(uy.data(), K.fy.mapped(), ncell * sizeof(double));
    std::memcpy(uz.data(), K.fz.mapped(), ncell * sizeof(double));
    if (div_max_out) {
        K.run_divergence(dx);
        const double* dvp = static_cast<const double*>(K.dv.mapped());
        double m = 0.0;  // sequential max (deterministic)
        for (std::size_t c = 0; c < ncell; ++c) m = std::max(m, std::fabs(dvp[c]));
        *div_max_out = std::max(*div_max_out, m);
    }
}

}  // namespace

void reconstruct_velocity_from_vorticity(const std::vector<double>& wx,
                                         const std::vector<double>& wy,
                                         const std::vector<double>& wz, uint32_t n,
                                         uint32_t vcycles, std::vector<double>& ux,
                                         std::vector<double>& uy,
                                         std::vector<double>& uz) {
    Kernels K(n);
    std::vector<double> psi[3];
    reconstruct(K, wx, wy, wz, vcycles, psi, ux, uy, uz, nullptr);
}

VpfmResult run_vpfm(const VpfmConfig& cfg, const std::filesystem::path* capture_manifest) {
    const uint32_t n = cfg.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double dx = 1.0 / static_cast<double>(n);
    if (n < 8 || (n & (n - 1)) != 0)
        throw std::invalid_argument("vpfm: n must be a power of two >= 8 (MG)");
    if (cfg.particles_per_cell != 8)
        throw std::invalid_argument("vpfm: particles_per_cell must be 8 (2x2x2 strata)");

    VpfmResult result;
    int call = 0;

    auto trajectory = [&](VpfmResult* out) -> std::vector<unsigned char> {
        Kernels K(n);
        std::vector<double> wx(ncell), wy(ncell), wz(ncell);
        std::vector<double> psi[3];
        std::vector<double> ux, uy, uz, density;

        // --- initial vorticity (closed-form lift; vpfm_detail.hpp derivations) ----
        detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
            for (std::size_t c = lo; c < hi; ++c) {
                uint32_t i = static_cast<uint32_t>(c % n);
                uint32_t j = static_cast<uint32_t>((c / n) % n);
                uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
                wx[c] = taylor_green_vorticity(
                    cfg.ic, (i + detail::edge_offset(0, 0)) * dx,
                    (j + detail::edge_offset(0, 1)) * dx,
                    (k + detail::edge_offset(0, 2)) * dx)[0];
                wy[c] = taylor_green_vorticity(
                    cfg.ic, (i + detail::edge_offset(1, 0)) * dx,
                    (j + detail::edge_offset(1, 1)) * dx,
                    (k + detail::edge_offset(1, 2)) * dx)[1];
                wz[c] = taylor_green_vorticity(
                    cfg.ic, (i + detail::edge_offset(2, 0)) * dx,
                    (j + detail::edge_offset(2, 1)) * dx,
                    (k + detail::edge_offset(2, 2)) * dx)[2];
            }
        });
        double div_max = 0.0;
        // Cold-start init solve: vcycles + 8 fixed extra cycles (deterministic
        // constant; in-run solves warm-start from the previous step's Ψ).
        reconstruct(K, wx, wy, wz, cfg.poisson_vcycles + 8, psi, ux, uy, uz, &div_max);

        // measured init residual vs the analytic target on faces (sequential max)
        double init_resid = 0.0;
        for (std::size_t c = 0; c < ncell; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            double tx = taylor_green_velocity(cfg.ic, (i + 1.0) * dx, (j + 0.5) * dx,
                                              (k + 0.5) * dx)[0];
            double ty = taylor_green_velocity(cfg.ic, (i + 0.5) * dx, (j + 1.0) * dx,
                                              (k + 0.5) * dx)[1];
            double tz = taylor_green_velocity(cfg.ic, (i + 0.5) * dx, (j + 0.5) * dx,
                                              (k + 1.0) * dx)[2];
            init_resid = std::max({init_resid, std::fabs(ux[c] - tx),
                                   std::fabs(uy[c] - ty), std::fabs(uz[c] - tz)});
        }

        // --- passive density (parent parity: Gaussian blob σ=0.1 at the centre) ----
        if (cfg.with_density) {
            density.resize(ncell);
            detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
                for (std::size_t c = lo; c < hi; ++c) {
                    uint32_t i = static_cast<uint32_t>(c % n);
                    uint32_t j = static_cast<uint32_t>((c / n) % n);
                    uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
                    double rx = (i + 0.5) * dx - 0.5, ry = (j + 0.5) * dx - 0.5,
                           rz = (k + 0.5) * dx - 0.5;
                    density[c] = std::exp(-(rx * rx + ry * ry + rz * rz) / (2.0 * 0.01));
                }
            });
        }

        // --- Kelvin budget baselines (sequential reductions) -----------------------
        // total vorticity per component + per-slice Stokes circulations per axis
        auto totals = [&](double t[3]) {
            t[0] = t[1] = t[2] = 0.0;
            for (std::size_t c = 0; c < ncell; ++c) {
                t[0] += wx[c];
                t[1] += wy[c];
                t[2] += wz[c];
            }
            const double dv = dx * dx * dx;
            for (int d = 0; d < 3; ++d) t[d] *= dv;
        };
        auto slice_circ = [&](std::vector<double>& circ) {
            // Γ_d(slice s) = Σ over the d=const... : sum of ω_d over the slice
            // PERPENDICULAR to axis d (Stokes over the full periodic cross-section;
            // exactly the boundary circulation, = 0 in continuum). 3n entries.
            circ.assign(3 * n, 0.0);
            const double da = dx * dx;
            for (std::size_t c = 0; c < ncell; ++c) {
                uint32_t i = static_cast<uint32_t>(c % n);
                uint32_t j = static_cast<uint32_t>((c / n) % n);
                uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
                circ[0 * n + i] += wx[c] * da;
                circ[1 * n + j] += wy[c] * da;
                circ[2 * n + k] += wz[c] * da;
            }
        };
        double tot0[3];
        totals(tot0);
        std::vector<double> circ0, circ_now;
        slice_circ(circ0);
        double max_total_vort = std::max({std::fabs(tot0[0]), std::fabs(tot0[1]),
                                          std::fabs(tot0[2])});
        double max_circ_drift = 0.0;

        // --- particles --------------------------------------------------------------
        detail::ParticleSystem ps;
        uint64_t reinit_v = 0;
        std::vector<double> omega_a_snapshot;
        double carried_drift = 0.0;
        double flowmap_resid = 0.0;
        double hessian_fd_resid = 0.0;

        // A2 Hessian-FD probes (test mode): K fixed-stride probe particles, 6 clones
        // each at ±ε per axis (ε = 0.1·dx), re-advected with the same integrator.
        const std::size_t n_probes = cfg.track_hessian_fd ? 64 : 0;
        const double eps = 0.1 * dx;
        std::vector<std::size_t> probe_idx;
        std::vector<double> clone_pos, clone_F;
        auto reset_probes = [&]() {
            if (!n_probes) return;
            probe_idx.resize(n_probes);
            clone_pos.assign(6 * n_probes * 3, 0.0);
            clone_F.assign(6 * n_probes * 9, 0.0);
            std::size_t stride = std::max<std::size_t>(1, ps.count / n_probes);
            for (std::size_t q = 0; q < n_probes; ++q) {
                std::size_t p = std::min(q * stride, ps.count - 1);
                probe_idx[q] = p;
                for (int l = 0; l < 3; ++l)
                    for (int sgn = 0; sgn < 2; ++sgn) {
                        std::size_t cl = q * 6 + l * 2 + sgn;
                        for (int a = 0; a < 3; ++a) {
                            double v = ps.pos[3 * p + a];
                            if (a == l) v += (sgn ? -eps : eps);
                            v -= std::floor(v);
                            clone_pos[3 * cl + a] = (v >= 1.0) ? 0.0 : v;
                        }
                        for (int r = 0; r < 3; ++r)
                            for (int c2 = 0; c2 < 3; ++c2)
                                clone_F[9 * cl + r * 3 + c2] = (r == c2) ? 1.0 : 0.0;
                    }
            }
        };
        auto measure_probes = [&]() {
            if (!n_probes) return;
            // ∇F_evolved vs FD·T (vpfm_detail.hpp identity note): FD over clones
            // gives ∇_ψF; chain through 𝒯_short to current-position gradient.
            double r = 0.0;  // sequential max
            for (std::size_t q = 0; q < n_probes; ++q) {
                std::size_t p = probe_idx[q];
                const double* T = &ps.jac_t_short[9 * p];
                const double* GF = &ps.grad_jac_f[27 * p];
                for (int i2 = 0; i2 < 3; ++i2)
                    for (int j2 = 0; j2 < 3; ++j2)
                        for (int l2 = 0; l2 < 3; ++l2) {
                            double fd_chain = 0.0;
                            for (int m = 0; m < 3; ++m) {
                                std::size_t cp = q * 6 + m * 2;      // +ε clone
                                std::size_t cm = q * 6 + m * 2 + 1;  // −ε clone
                                double fd = (clone_F[9 * cp + i2 * 3 + j2] -
                                             clone_F[9 * cm + i2 * 3 + j2]) /
                                            (2.0 * eps);
                                fd_chain += fd * T[m * 3 + l2];
                            }
                            r = std::max(r, std::fabs(GF[(i2 * 3 + j2) * 3 + l2] -
                                                      fd_chain));
                        }
            }
            hessian_fd_resid = std::max(hessian_fd_resid, r);
        };

        auto frame_of = [&](uint32_t step) {
            StepFrame fr;
            fr.step = step;
            detail::mac_to_centres(ux, uy, uz, n, fr.u, fr.v, fr.w);
            if (cfg.with_density) fr.density = density;
            return fr;
        };

        std::vector<StepFrame> frames;
        frames.push_back(frame_of(0));
        double e0 = kinetic_energy(frames[0].u, frames[0].v, frames[0].w, dx);

        for (uint32_t step = 0; step < cfg.steps; ++step) {
            if (step % 50 == 0)
                std::fprintf(stderr, "[vpfm] run step %u/%u\n", step, cfg.steps);
            const bool long_reinit = (step % cfg.n_v == 0);
            const bool short_reinit = (step % cfg.n_g == 0);
            if (long_reinit) {
                if (step > 0) {
                    // measure carried-ω_a drift (carried payload: expect exactly 0)
                    double d = 0.0;
                    for (std::size_t q = 0; q < ps.omega_a.size(); ++q)
                        d = std::max(d, std::fabs(ps.omega_a[q] - omega_a_snapshot[q]));
                    carried_drift = std::max(carried_drift, d);
                }
                detail::redistribute_particles(ps, n, cfg.particles_per_cell,
                                               static_cast<uint64_t>(cfg.seed),
                                               reinit_v++);
                detail::g2p_vorticity(ps, wx, wy, wz, n, /*omega_a=*/true,
                                      /*omega_b=*/true, /*gradient=*/true);
                detail::parallel_for(ps.count, [&](std::size_t lo, std::size_t hi) {
                    for (std::size_t p = lo; p < hi; ++p) {
                        for (int q = 0; q < 9; ++q) {
                            ps.jac_f_long[9 * p + q] = 0.0;
                            ps.jac_f_short[9 * p + q] = 0.0;
                            ps.jac_t_short[9 * p + q] = 0.0;
                        }
                        for (int d = 0; d < 3; ++d) {
                            ps.jac_f_long[9 * p + d * 3 + d] = 1.0;
                            ps.jac_f_short[9 * p + d * 3 + d] = 1.0;
                            ps.jac_t_short[9 * p + d * 3 + d] = 1.0;
                        }
                        for (int q = 0; q < 27; ++q) ps.grad_jac_f[27 * p + q] = 0.0;
                    }
                });
                omega_a_snapshot = ps.omega_a;
                reset_probes();
            } else if (short_reinit) {
                measure_probes();
                // ω_b ← current mapped vorticity (ℱ_long·ω_a); ∇ω_b ← grid G2P;
                // reset the short segment.
                detail::parallel_for(ps.count, [&](std::size_t lo, std::size_t hi) {
                    for (std::size_t p = lo; p < hi; ++p) {
                        const double* FL = &ps.jac_f_long[9 * p];
                        const double* wa = &ps.omega_a[3 * p];
                        for (int d = 0; d < 3; ++d)
                            ps.omega_b[3 * p + d] = FL[d * 3 + 0] * wa[0] +
                                                    FL[d * 3 + 1] * wa[1] +
                                                    FL[d * 3 + 2] * wa[2];
                        for (int q = 0; q < 9; ++q) {
                            ps.jac_f_short[9 * p + q] = 0.0;
                            ps.jac_t_short[9 * p + q] = 0.0;
                        }
                        for (int d = 0; d < 3; ++d) {
                            ps.jac_f_short[9 * p + d * 3 + d] = 1.0;
                            ps.jac_t_short[9 * p + d * 3 + d] = 1.0;
                        }
                        for (int q = 0; q < 27; ++q) ps.grad_jac_f[27 * p + q] = 0.0;
                    }
                });
                detail::g2p_vorticity(ps, wx, wy, wz, n, /*omega_a=*/false,
                                      /*omega_b=*/false, /*gradient=*/true);
                reset_probes();
            }

            detail::advect_particles_rk4(ps, ux, uy, uz, n, cfg.dt);
            if (n_probes)
                detail::advect_probes_rk4(clone_pos, clone_F, 6 * n_probes, ux, uy, uz,
                                          n, cfg.dt);
            ps.rebuild_bins(n);
            ps.compute_mapped_vorticity();
            if (cfg.track_forward_jacobian) {
                double r = 0.0;  // sequential max of ||𝒯_s·ℱ_s − I||_max
                for (std::size_t p = 0; p < ps.count; ++p) {
                    const double* T = &ps.jac_t_short[9 * p];
                    const double* F = &ps.jac_f_short[9 * p];
                    for (int r2 = 0; r2 < 3; ++r2)
                        for (int c2 = 0; c2 < 3; ++c2) {
                            double s = 0.0;
                            for (int e = 0; e < 3; ++e) s += T[r2 * 3 + e] * F[e * 3 + c2];
                            r = std::max(r, std::fabs(s - (r2 == c2 ? 1.0 : 0.0)));
                        }
                }
                flowmap_resid = std::max(flowmap_resid, r);
            }

            detail::p2g_vorticity(ps, wx, wy, wz, n);
            reconstruct(K, wx, wy, wz, cfg.poisson_vcycles, psi, ux, uy, uz, &div_max);

            // Kelvin budgets (sequential)
            double tot[3];
            totals(tot);
            max_total_vort = std::max({max_total_vort, std::fabs(tot[0]),
                                       std::fabs(tot[1]), std::fabs(tot[2])});
            slice_circ(circ_now);
            for (std::size_t q = 0; q < circ_now.size(); ++q)
                max_circ_drift =
                    std::max(max_circ_drift, std::fabs(circ_now[q] - circ0[q]));

            if (cfg.with_density) {
                std::vector<double> uc, vc, wc;
                detail::mac_to_centres(ux, uy, uz, n, uc, vc, wc);
                detail::advect_scalar_semi_lagrangian(density, uc, vc, wc, n, cfg.dt);
            }
            if ((step + 1) % cfg.capture_interval == 0 || step + 1 == cfg.steps)
                if (frames.back().step != step + 1) frames.push_back(frame_of(step + 1));
        }
        measure_probes();
        // final carried-drift measurement (covers tails shorter than n_v)
        if (!omega_a_snapshot.empty()) {
            double d = 0.0;
            for (std::size_t q = 0; q < ps.omega_a.size(); ++q)
                d = std::max(d, std::fabs(ps.omega_a[q] - omega_a_snapshot[q]));
            carried_drift = std::max(carried_drift, d);
        }

        if (out) {
            out->frames = std::move(frames);
            out->init_velocity_residual = init_resid;
            out->energy_initial = e0;
            const StepFrame& fT = out->frames.back();
            out->energy_final = kinetic_energy(fT.u, fT.v, fT.w, dx);
            out->max_carried_omega_drift = carried_drift;
            out->max_div_postproj = div_max;
            out->max_total_vorticity = max_total_vort;
            out->max_circulation_drift = max_circ_drift;
            out->max_flowmap_residual = flowmap_resid;
            out->max_hessian_fd_residual = hessian_fd_resid;
        }

        // witness bytes: final faces + edge vorticity + density
        std::vector<unsigned char> wit((3 * ncell + 3 * ncell +
                                        (cfg.with_density ? ncell : 0)) *
                                       sizeof(double));
        unsigned char* w = wit.data();
        auto put = [&](const std::vector<double>& v) {
            std::memcpy(w, v.data(), v.size() * sizeof(double));
            w += v.size() * sizeof(double);
        };
        put(ux);
        put(uy);
        put(uz);
        put(wx);
        put(wy);
        put(wz);
        if (cfg.with_density) put(density);
        return wit;
    };

    // 2-run bit-identity witness; run #2 fills the result (identical bytes asserted).
    result.determinism_witness_sha256 = det::assert_deterministic_run(
        [&] {
            ++call;
            return trajectory(call == 2 ? &result : nullptr);
        },
        2, 0.0);

    if (capture_manifest) {
        cap::Manifest m;
        // Schema 1.0.0: no gradient_fields/active_mask (the corpus invariant reads
        // 1.1.0 as "differentiable-consumer capture"; the U-3/U-4 precedent).
        m.schema_version = "1.0.0";
        m.sim = {"eulerian-smoke", "volumetric-grid", "frontier-vpfm"};
        m.stack = {"cpp", "0.0.0", "phase-6-c1-u5"};
        m.config.tier = "test";
        m.config.dims = {static_cast<int64_t>(n), static_cast<int64_t>(n),
                         static_cast<int64_t>(n)};
        m.config.dtype = "f64";
        m.config.seed = static_cast<uint64_t>(cfg.seed);
        m.config.params = {
            {"dt", cfg.dt},
            {"particles_per_cell", static_cast<double>(cfg.particles_per_cell)},
            {"n_v", static_cast<double>(cfg.n_v)},
            {"n_g", static_cast<double>(cfg.n_g)},
            {"poisson_vcycles", static_cast<double>(cfg.poisson_vcycles)},
            {"ic", cfg.ic == InitialCondition::kTaylorGreen3D ? "taylor-green-3d"
                                                              : "taylor-green-2d-zinv"},
            {"init_velocity_residual", result.init_velocity_residual}};
        m.run.step_count = cfg.steps;
        m.run.capture_interval = cfg.capture_interval;
        m.run.start_utc = utc_now();
        m.payload.format = "hdf5";
        m.payload.path = capture_manifest->stem().string() + ".h5";
        m.determinism = {"bit-exact-same-hw", false, false};

        cap::Hdf5Writer writer(*capture_manifest, m);
        for (const StepFrame& fr : result.frames) {
            cap::StepData sd;
            auto put_field = [&](const char* name, const std::vector<double>& v) {
                cap::FieldData fd;
                fd.dtype = "f64";
                fd.shape = {static_cast<int64_t>(n), static_cast<int64_t>(n),
                            static_cast<int64_t>(n)};
                fd.bytes.resize(v.size() * sizeof(double));
                // Transpose the internal x-fastest lex order to the parent capture's
                // [x][y][z] axis layout (z fastest) — the U-4 1c lesson, priced in
                // from the start (probe § 5).
                double* outp = reinterpret_cast<double*>(fd.bytes.data());
                detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
                    for (std::size_t c = lo; c < hi; ++c) {
                        std::size_t i = c % n;
                        std::size_t j = (c / n) % n;
                        std::size_t k = c / (static_cast<std::size_t>(n) * n);
                        outp[(i * n + j) * n + k] = v[c];
                    }
                });
                sd.fields.emplace(name, std::move(fd));
            };
            put_field("u", fr.u);
            put_field("v", fr.v);
            put_field("w", fr.w);
            if (cfg.with_density) put_field("density", fr.density);
            double umax = 0.0;
            for (std::size_t c = 0; c < fr.u.size(); ++c)
                umax = std::max({umax, std::fabs(fr.u[c]), std::fabs(fr.v[c]),
                                 std::fabs(fr.w[c])});
            sd.diagnostics["u_max"] = umax;
            sd.diagnostics["kinetic_energy"] = kinetic_energy(fr.u, fr.v, fr.w, dx);
            writer.write_step(fr.step, sd);
        }
        writer.finalize();
    }
    return result;
}

}  // namespace bit_physics::vpfm

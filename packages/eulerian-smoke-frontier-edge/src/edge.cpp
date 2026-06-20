// C-1 U-6 stage 1b-iii — the EDGE grid-flow-map trajectory on the Stack-C substrate.
// Vulkan f64 NoContraction kernels carry the per-face/per-cell grid vector arithmetic
// (staggered curl, MAC divergence); deterministic host C++ carries the grid backward
// flow-map evolution (edge_flowmap.cpp), the fixed-cycle multigrid vector-potential
// solves, and the closed-form vorticity-lift init (edge_math.cpp / edge_detail.hpp).
// Witness: 2-run bit-identity; run #2 writes the capture (the asserted identity makes
// run-2 bytes the verified reference). Substrate copy-adapted from U-5 vpfm.cpp (probe
// § 5); the flow-map step replaces the particle transport.

#include "bit_physics/edge/edge.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <stdexcept>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/vulkan_compute.hpp"

#include "edge_curl.spv.h"        // const uint32_t kEdgeCurlSpv[]
#include "edge_detail.hpp"
#include "edge_divergence.spv.h"  // const uint32_t kEdgeDivergenceSpv[]

namespace bit_physics::edge {

namespace vk = bit_physics::common_cpp::vkcompute;
namespace cap = bit_physics::common_cpp::capture;
namespace det = bit_physics::common_cpp::determinism;

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

// Vulkan kernel set shared by one trajectory run (curl + divergence; U-5 verbatim).
struct Kernels {
    vk::ComputeContext ctx;
    vk::ComputePipeline curl, divergence;
    vk::StorageBuffer px, py, pz;      // vector-potential edge fields (ncell each)
    vk::StorageBuffer fx, fy, fz, dv;  // face velocity I/O + divergence (ncell each)
    uint32_t n = 0;

    explicit Kernels(uint32_t n_) : n(n_) {
        vk::ComputeContextConfig cc;
        cc.app_name = "eulerian-smoke-edge";
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
        curl = make(kEdgeCurlSpv, sizeof(kEdgeCurlSpv) / sizeof(uint32_t), 6);
        divergence =
            make(kEdgeDivergenceSpv, sizeof(kEdgeDivergenceSpv) / sizeof(uint32_t), 4);
        const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
        px = vk::StorageBuffer(ctx, ncell * sizeof(double));
        py = vk::StorageBuffer(ctx, ncell * sizeof(double));
        pz = vk::StorageBuffer(ctx, ncell * sizeof(double));
        fx = vk::StorageBuffer(ctx, ncell * sizeof(double));
        fy = vk::StorageBuffer(ctx, ncell * sizeof(double));
        fz = vk::StorageBuffer(ctx, ncell * sizeof(double));
        dv = vk::StorageBuffer(ctx, ncell * sizeof(double));
    }

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
// reconstruct u = ∇×Ψ on faces via the device curl kernel. Records max |div u| (device
// divergence kernel — the exact-identity PBT surface) into *div_max_out.
void reconstruct(Kernels& K, const std::vector<double>& wx, const std::vector<double>& wy,
                 const std::vector<double>& wz, uint32_t vcycles,
                 std::vector<double> psi[3], std::vector<double>& ux,
                 std::vector<double>& uy, std::vector<double>& uz, double* div_max_out) {
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

EdgeResult run_edge(const EdgeConfig& cfg, const std::filesystem::path* capture_manifest) {
    const uint32_t n = cfg.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double dx = 1.0 / static_cast<double>(n);
    if (n < 8 || (n & (n - 1)) != 0)
        throw std::invalid_argument("edge: n must be a power of two >= 8 (MG)");
    if (cfg.reinit_interval == 0)
        throw std::invalid_argument("edge: reinit_interval must be >= 1");

    EdgeResult result;
    int call = 0;

    auto trajectory = [&](EdgeResult* out) -> std::vector<unsigned char> {
        Kernels K(n);
        std::vector<double> wx(ncell), wy(ncell), wz(ncell);
        std::vector<double> psi[3];
        std::vector<double> ux, uy, uz, density;

        // --- initial vorticity (closed-form edge lift; edge_detail.hpp derivations) --
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
        // Cold-start init solve: vcycles + 8 fixed extra cycles (deterministic constant;
        // in-run solves warm-start from the previous step's Ψ).
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

        // --- passive density (parent parity: Gaussian blob σ=0.1 at the centre) ------
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

        // --- Kelvin budget baselines (sequential reductions) -------------------------
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
        double max_total_vort =
            std::max({std::fabs(tot0[0]), std::fabs(tot0[1]), std::fabs(tot0[2])});
        double max_circ_drift = 0.0;

        // --- grid backward flow map --------------------------------------------------
        detail::FlowMap fm;
        fm.allocate(n);
        detail::flowmap_reinit(fm, wx, wy, wz);  // ψ = id, ∇ψ = I, ω_ref = init lift
        std::size_t map_bytes = detail::flowmap_state_bytes(fm);
        double grad_fd_resid = 0.0;

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
                std::fprintf(stderr, "[edge] run step %u/%u\n", step, cfg.steps);
            // reinit the flow map every L steps (bounds the map length; O(1) memory)
            if (step > 0 && step % cfg.reinit_interval == 0)
                detail::flowmap_reinit(fm, wx, wy, wz);
            // evolve the backward map ψ + ∇ψ one step in the frozen velocity
            detail::flowmap_advance(fm, ux, uy, uz, cfg.dt);
            // ω ← J^{-1}·ω_ref(ψ) (Cauchy transport from the reference vorticity)
            detail::flowmap_to_vorticity(fm, wx, wy, wz);
            // project to the divergence-free velocity (vector-potential curl path)
            reconstruct(K, wx, wy, wz, cfg.poisson_vcycles, psi, ux, uy, uz, &div_max);

            if (cfg.track_gradient_fd)
                grad_fd_resid =
                    std::max(grad_fd_resid, detail::flowmap_gradient_fd_residual(fm));

            // Kelvin budgets (sequential)
            double tot[3];
            totals(tot);
            max_total_vort = std::max({max_total_vort, std::fabs(tot[0]),
                                       std::fabs(tot[1]), std::fabs(tot[2])});
            slice_circ(circ_now);
            for (std::size_t q = 0; q < circ_now.size(); ++q)
                max_circ_drift = std::max(max_circ_drift, std::fabs(circ_now[q] - circ0[q]));

            if (cfg.with_density) {
                std::vector<double> uc, vc, wc;
                detail::mac_to_centres(ux, uy, uz, n, uc, vc, wc);
                detail::advect_scalar_semi_lagrangian(density, uc, vc, wc, n, cfg.dt);
            }
            if ((step + 1) % cfg.capture_interval == 0 || step + 1 == cfg.steps)
                if (frames.back().step != step + 1) frames.push_back(frame_of(step + 1));
        }

        if (out) {
            out->frames = std::move(frames);
            out->init_velocity_residual = init_resid;
            out->energy_initial = e0;
            const StepFrame& fT = out->frames.back();
            out->energy_final = kinetic_energy(fT.u, fT.v, fT.w, dx);
            out->max_div_postproj = div_max;
            out->max_total_vorticity = max_total_vort;
            out->max_circulation_drift = max_circ_drift;
            out->max_gradient_fd_residual = grad_fd_resid;
            out->backward_map_peak_bytes = map_bytes;
        }

        // witness bytes: final faces + edge vorticity + density
        std::vector<unsigned char> wit(
            (3 * ncell + 3 * ncell + (cfg.with_density ? ncell : 0)) * sizeof(double));
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
        m.schema_version = "1.0.0";
        m.sim = {"eulerian-smoke", "volumetric-grid", "frontier-edge"};
        m.stack = {"cpp", "0.0.0", "phase-6-c1-u6"};
        m.config.tier = "test";
        m.config.dims = {static_cast<int64_t>(n), static_cast<int64_t>(n),
                         static_cast<int64_t>(n)};
        m.config.dtype = "f64";
        m.config.seed = static_cast<uint64_t>(cfg.seed);
        m.config.params = {
            {"dt", cfg.dt},
            {"reinit_interval", static_cast<double>(cfg.reinit_interval)},
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
                // [x][y][z] axis layout (z fastest) — the U-4/U-5 lesson, priced in.
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

}  // namespace bit_physics::edge

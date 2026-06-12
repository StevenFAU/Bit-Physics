// C-1 U-4 stage 1b-iii — the Clebsch-PFM trajectory (paper Algs. 1-3 on the Stack-C
// substrate). Vulkan f64 NoContraction kernels carry the per-cell wave-function
// arithmetic (pairwise inner products, rotation+normalization, MAC divergence); host
// C++ carries transcendentals, particle flow-map transport (clebsch_pfm_particles.cpp),
// the fixed-cycle multigrid projection, and the wave-fit init (clebsch_pfm_detail.hpp
// derivations). Witness: 2-run bit-identity; run #2 writes the capture (the asserted
// identity makes run-2 bytes the verified reference).

#include "bit_physics/clebsch_pfm/clebsch_pfm.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <stdexcept>

#include "bit_physics/common/capture.hpp"
#include "bit_physics/common/determinism.hpp"
#include "bit_physics/common/vulkan_compute.hpp"

#include "clebsch_inner_product.spv.h"    // const uint32_t kClebschInnerProductSpv[]
#include "clebsch_rotate_normalize.spv.h" // const uint32_t kClebschRotateNormalizeSpv[]
#include "clebsch_divergence.spv.h"       // const uint32_t kClebschDivergenceSpv[]
#include "clebsch_pfm_detail.hpp"

namespace bit_physics::clebsch_pfm {

namespace vk = bit_physics::common_cpp::vkcompute;
namespace cap = bit_physics::common_cpp::capture;
namespace det = bit_physics::common_cpp::determinism;
using detail::cell_index;

namespace {

struct PushCount {
    uint32_t count;
    uint32_t flag;
};
struct PushDiv {
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
    vk::ComputePipeline inner, rotate, divergence;
    vk::StorageBuffer a, b, z;       // pairwise inner-product I/O (3·ncell items)
    vk::StorageBuffer phi, rot;      // rotate/normalize I/O (ncell items)
    vk::StorageBuffer fx, fy, fz, dv;  // divergence I/O (ncell each)
    uint32_t n = 0;

    explicit Kernels(uint32_t n_) : n(n_) {
        vk::ComputeContextConfig cc;
        cc.app_name = "eulerian-smoke-clebsch-pfm";
        cc.api_version_minor = 2;
        cc.require_float64 = true;
        ctx = vk::ComputeContext::create(cc);
        ctx.assert_deterministic_float_controls();
        auto make = [&](const uint32_t* spv, size_t words, uint32_t bindings,
                        uint32_t pc_bytes) {
            vk::ComputePipeline::Options o;
            o.spirv = spv;
            o.spirv_word_count = words;
            o.binding_count = bindings;
            o.push_constant_bytes = pc_bytes;
            return vk::ComputePipeline(ctx, o);
        };
        inner = make(kClebschInnerProductSpv,
                     sizeof(kClebschInnerProductSpv) / sizeof(uint32_t), 3,
                     sizeof(PushCount));
        rotate = make(kClebschRotateNormalizeSpv,
                      sizeof(kClebschRotateNormalizeSpv) / sizeof(uint32_t), 2,
                      sizeof(PushCount));
        divergence = make(kClebschDivergenceSpv,
                          sizeof(kClebschDivergenceSpv) / sizeof(uint32_t), 4,
                          sizeof(PushDiv));
        const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
        a = vk::StorageBuffer(ctx, 4 * 3 * ncell * sizeof(double));
        b = vk::StorageBuffer(ctx, 4 * 3 * ncell * sizeof(double));
        z = vk::StorageBuffer(ctx, 2 * 3 * ncell * sizeof(double));
        phi = vk::StorageBuffer(ctx, 4 * ncell * sizeof(double));
        rot = vk::StorageBuffer(ctx, 2 * ncell * sizeof(double));
        fx = vk::StorageBuffer(ctx, ncell * sizeof(double));
        fy = vk::StorageBuffer(ctx, ncell * sizeof(double));
        fz = vk::StorageBuffer(ctx, ncell * sizeof(double));
        dv = vk::StorageBuffer(ctx, ncell * sizeof(double));
    }

    // z[i] = <A[i],B[i]>_C for `count` spinor pairs already in the mapped a/b buffers.
    void run_inner(uint32_t count) {
        inner.bind(0, a);
        inner.bind(1, b);
        inner.bind(2, z);
        PushCount pc{count, 0u};
        vk::dispatch(ctx, inner, (count + 63) / 64, 1, 1, &pc);
    }

    // Phi <- Phi*rot (flag 0/1) and/or normalize (flag 1/2) for ncell cells in-place.
    void run_rotate(uint32_t flag) {
        const uint32_t ncell = n * n * n;
        rotate.bind(0, phi);
        rotate.bind(1, rot);
        PushCount pc{ncell, flag};
        vk::dispatch(ctx, rotate, (ncell + 63) / 64, 1, 1, &pc);
    }

    // dv <- MAC divergence of (fx,fy,fz).
    void run_divergence(double dx) {
        const uint32_t ncell = n * n * n;
        divergence.bind(0, fx);
        divergence.bind(1, fy);
        divergence.bind(2, fz);
        divergence.bind(3, dv);
        PushDiv pc{n, 0u, dx};
        vk::dispatch(ctx, divergence, (ncell + 63) / 64, 1, 1, &pc);
    }
};

// Basic Eq.-19 conversion from grid wave function: pairs = (cell, +axis neighbour).
void convert_grid(Kernels& K, const std::vector<double>& phi_g, double hbar,
                  std::vector<double>& ux, std::vector<double>& uy,
                  std::vector<double>& uz) {
    const uint32_t n = K.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    double* ap = static_cast<double*>(K.a.mapped());
    double* bp = static_cast<double*>(K.b.mapped());
    detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            std::size_t nb[3] = {cell_index((i + 1) % n, j, k, n),
                                 cell_index(i, (j + 1) % n, k, n),
                                 cell_index(i, j, (k + 1) % n, n)};
            for (int axis = 0; axis < 3; ++axis) {
                std::size_t item = static_cast<std::size_t>(axis) * ncell + c;
                for (int q = 0; q < 4; ++q) {
                    ap[4 * item + q] = phi_g[4 * c + q];
                    bp[4 * item + q] = phi_g[4 * nb[axis] + q];
                }
            }
        }
    });
    K.run_inner(static_cast<uint32_t>(3 * ncell));
    ux.resize(ncell);
    uy.resize(ncell);
    uz.resize(ncell);
    const double dx = 1.0 / static_cast<double>(n);
    const double* zp = static_cast<const double*>(K.z.mapped());
    detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            ux[c] = (hbar / dx) * std::atan2(zp[2 * c + 1], zp[2 * c + 0]);
            uy[c] = (hbar / dx) *
                    std::atan2(zp[2 * (ncell + c) + 1], zp[2 * (ncell + c) + 0]);
            uz[c] = (hbar / dx) *
                    std::atan2(zp[2 * (2 * ncell + c) + 1], zp[2 * (2 * ncell + c) + 0]);
        }
    });
}

// Enhanced Eq.-23 conversion: P2G-evaluate the mapped particle spinor field at the
// face sample pairs f ∓ dx_s/2 (dx_s = dx/2) and inner-product on the device.
void convert_particles(Kernels& K, const detail::ParticleSystem& ps,
                       const std::vector<double>& phi_g, double hbar,
                       std::vector<double>& ux, std::vector<double>& uy,
                       std::vector<double>& uz) {
    const uint32_t n = K.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double dx = 1.0 / static_cast<double>(n);
    const double dxs = 0.5 * dx;
    std::vector<double> spin_a, spin_b;
    detail::p2g_face_samples(ps, phi_g, n, spin_a, spin_b);
    std::memcpy(K.a.mapped(), spin_a.data(), spin_a.size() * sizeof(double));
    std::memcpy(K.b.mapped(), spin_b.data(), spin_b.size() * sizeof(double));
    K.run_inner(static_cast<uint32_t>(3 * ncell));
    ux.resize(ncell);
    uy.resize(ncell);
    uz.resize(ncell);
    const double* zp = static_cast<const double*>(K.z.mapped());
    detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            ux[c] = (hbar / dxs) * std::atan2(zp[2 * c + 1], zp[2 * c + 0]);
            uy[c] = (hbar / dxs) *
                    std::atan2(zp[2 * (ncell + c) + 1], zp[2 * (ncell + c) + 0]);
            uz[c] = (hbar / dxs) *
                    std::atan2(zp[2 * (2 * ncell + c) + 1], zp[2 * (2 * ncell + c) + 0]);
        }
    });
}

// Pressure projection: gamma solves lap(gamma) = div(u); u <- u - grad(gamma).
// Returns {pre, post} max |div u| (device divergence kernel both times).
struct DivPair {
    double pre = 0.0, post = 0.0;
};
DivPair project(Kernels& K, std::vector<double>& ux, std::vector<double>& uy,
                std::vector<double>& uz, uint32_t vcycles, std::vector<double>& gamma) {
    const uint32_t n = K.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double dx = 1.0 / static_cast<double>(n);
    auto device_div = [&](std::vector<double>& out) {
        std::memcpy(K.fx.mapped(), ux.data(), ncell * sizeof(double));
        std::memcpy(K.fy.mapped(), uy.data(), ncell * sizeof(double));
        std::memcpy(K.fz.mapped(), uz.data(), ncell * sizeof(double));
        K.run_divergence(dx);
        out.resize(ncell);
        std::memcpy(out.data(), K.dv.mapped(), ncell * sizeof(double));
    };
    std::vector<double> div;
    device_div(div);
    DivPair dp;
    for (double v : div) dp.pre = std::max(dp.pre, std::fabs(v));
    if (gamma.size() != ncell) gamma.assign(ncell, 0.0);
    detail::poisson_periodic_mg(gamma, div, n, dx, vcycles);
    detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            std::size_t nb[3] = {cell_index((i + 1) % n, j, k, n),
                                 cell_index(i, (j + 1) % n, k, n),
                                 cell_index(i, j, (k + 1) % n, n)};
            ux[c] -= (gamma[nb[0]] - gamma[c]) / (1.0 / static_cast<double>(n));
            uy[c] -= (gamma[nb[1]] - gamma[c]) / (1.0 / static_cast<double>(n));
            uz[c] -= (gamma[nb[2]] - gamma[c]) / (1.0 / static_cast<double>(n));
        }
    });
    device_div(div);
    for (double v : div) dp.post = std::max(dp.post, std::fabs(v));  // sequential
    return dp;
}

// Eq.-26 standardization + normalization of the grid wave function. Records the
// pre-normalization norm deviation into *norm_dev (sequential max).
void standardize_phi(Kernels& K, std::vector<double>& phi_g, double hbar,
                     uint32_t vcycles, std::vector<double>& gamma, double* norm_dev) {
    const uint32_t n = K.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    if (norm_dev) {
        double nd = 0.0;
        for (std::size_t c = 0; c < ncell; ++c) {
            double n2 = phi_g[4 * c + 0] * phi_g[4 * c + 0] +
                        phi_g[4 * c + 1] * phi_g[4 * c + 1] +
                        phi_g[4 * c + 2] * phi_g[4 * c + 2] +
                        phi_g[4 * c + 3] * phi_g[4 * c + 3];
            nd = std::max(nd, std::fabs(std::sqrt(n2) - 1.0));
        }
        *norm_dev = std::max(*norm_dev, nd);
    }
    // u* from the raw grid wave function; q solves lap(q) = div(u*).
    std::vector<double> sx, sy, sz;
    convert_grid(K, phi_g, hbar, sx, sy, sz);
    const double dx = 1.0 / static_cast<double>(n);
    std::memcpy(K.fx.mapped(), sx.data(), ncell * sizeof(double));
    std::memcpy(K.fy.mapped(), sy.data(), ncell * sizeof(double));
    std::memcpy(K.fz.mapped(), sz.data(), ncell * sizeof(double));
    K.run_divergence(dx);
    std::vector<double> div(ncell);
    std::memcpy(div.data(), K.dv.mapped(), ncell * sizeof(double));
    if (gamma.size() != ncell) gamma.assign(ncell, 0.0);
    detail::poisson_periodic_mg(gamma, div, n, dx, vcycles);
    // rot = e^{-i q/hbar} (host f64 trig); rotate + normalize on the device.
    double* rp = static_cast<double*>(K.rot.mapped());
    detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            double t = gamma[c] / hbar;
            rp[2 * c + 0] = std::cos(t);
            rp[2 * c + 1] = -std::sin(t);
        }
    });
    std::memcpy(K.phi.mapped(), phi_g.data(), 4 * ncell * sizeof(double));
    K.run_rotate(1u);
    std::memcpy(phi_g.data(), K.phi.mapped(), 4 * ncell * sizeof(double));
}

}  // namespace

namespace detail {

void prolong_spinor(const std::vector<double>& coarse, uint32_t nc,
                    std::vector<double>& fine, uint32_t nf) {
    const std::size_t nfcell = static_cast<std::size_t>(nf) * nf * nf;
    fine.resize(4 * nfcell);
    parallel_for(nfcell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % nf);
            uint32_t j = static_cast<uint32_t>((c / nf) % nf);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(nf) * nf));
            // fine cell centre in coarse cell-centred index space
            double xc = (i + 0.5) * static_cast<double>(nc) / nf - 0.5;
            double yc = (j + 0.5) * static_cast<double>(nc) / nf - 0.5;
            double zc = (k + 0.5) * static_cast<double>(nc) / nf - 0.5;
            int i0 = static_cast<int>(std::floor(xc));
            int j0 = static_cast<int>(std::floor(yc));
            int k0 = static_cast<int>(std::floor(zc));
            double fx = xc - i0, fy = yc - j0, fz = zc - k0;
            double out[4] = {0, 0, 0, 0};
            for (int dk = 0; dk < 2; ++dk)
                for (int dj = 0; dj < 2; ++dj)
                    for (int di = 0; di < 2; ++di) {
                        double w = (di ? fx : 1.0 - fx) * (dj ? fy : 1.0 - fy) *
                                   (dk ? fz : 1.0 - fz);
                        uint32_t ii = static_cast<uint32_t>(((i0 + di) % static_cast<int>(nc) + nc) % nc);
                        uint32_t jj = static_cast<uint32_t>(((j0 + dj) % static_cast<int>(nc) + nc) % nc);
                        uint32_t kk = static_cast<uint32_t>(((k0 + dk) % static_cast<int>(nc) + nc) % nc);
                        const double* src = &coarse[4 * cell_index(ii, jj, kk, nc)];
                        for (int q = 0; q < 4; ++q) out[q] += w * src[q];
                    }
            double n2 = out[0] * out[0] + out[1] * out[1] + out[2] * out[2] +
                        out[3] * out[3];
            double inv = 1.0 / std::sqrt(std::max(n2, 1e-300));
            for (int q = 0; q < 4; ++q) fine[4 * c + q] = out[q] * inv;
        }
    });
}

double wave_fit_descent(std::vector<double>& phi_g, const std::vector<double>& tx,
                        const std::vector<double>& ty, const std::vector<double>& tz,
                        uint32_t n, double hbar, uint32_t iters, double tau) {
    // Projected gradient descent on E = ½∫|u(Ψ)−u_t|² (derivation in the header).
    // Host-only (init path); central differences; pointwise normalization per iter.
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double dx = 1.0 / static_cast<double>(n);
    // Stability scaling (1c divergence fix, MEASURED + hand-derived): cell-scale
    // phase noise δθ produces e-noise ~ħδθ/dx and ∇·e ~ħδθ/dx², so the update feeds
    // back at rate τ·ħ²/(2dx²) — a diffusion-like CFL. The stable step therefore
    // scales (16/n)²·(0.5/ħ)² from the (n=16, ħ=0.5) reference where τ was tuned
    // (measured boundary ~0.0075 there; ħ=1.0 at τ=0.005 diverged, confirming ħ⁻²).
    const double sn = 16.0 / static_cast<double>(n);
    const double sh = 0.5 / hbar;
    const double tau_eff = tau * sn * sn * sh * sh;
    std::vector<double> ex(ncell), ey(ncell), ez(ncell), dive(ncell);
    std::vector<double> next(4 * ncell);
    double resid = 0.0;
    for (uint32_t it = 0; it <= iters; ++it) {
        // u(Ψ) on faces (host arg of grid pairs — Eq. 19 form).
        detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
            for (std::size_t c = lo; c < hi; ++c) {
                uint32_t i = static_cast<uint32_t>(c % n);
                uint32_t j = static_cast<uint32_t>((c / n) % n);
                uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
                std::size_t nb[3] = {cell_index((i + 1) % n, j, k, n),
                                     cell_index(i, (j + 1) % n, k, n),
                                     cell_index(i, j, (k + 1) % n, n)};
                double* e[3] = {&ex[c], &ey[c], &ez[c]};
                const std::vector<double>* tgt[3] = {&tx, &ty, &tz};
                for (int axis = 0; axis < 3; ++axis) {
                    const double* pa = &phi_g[4 * c];
                    const double* pb = &phi_g[4 * nb[axis]];
                    double re = (pa[0] * pb[0] + pa[1] * pb[1]) +
                                (pa[2] * pb[2] + pa[3] * pb[3]);
                    double im = (pa[0] * pb[1] - pa[1] * pb[0]) +
                                (pa[2] * pb[3] - pa[3] * pb[2]);
                    double uf = (hbar / dx) * std::atan2(im, re);
                    *e[axis] = uf - (*tgt[axis])[c];
                }
            }
        });
        double r = 0.0;  // sequential max (deterministic)
        for (std::size_t c = 0; c < ncell; ++c)
            r = std::max({r, std::fabs(ex[c]), std::fabs(ey[c]), std::fabs(ez[c])});
        resid = r;
        if (it % 100 == 0)
            std::fprintf(stderr, "[clebsch-pfm] wave-fit iter %u/%u resid %.3e\n", it,
                         iters, resid);
        if (it == iters) break;
        // div(e) at centres (faces are +axis-owned).
        detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
            for (std::size_t c = lo; c < hi; ++c) {
                uint32_t i = static_cast<uint32_t>(c % n);
                uint32_t j = static_cast<uint32_t>((c / n) % n);
                uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
                std::size_t mb[3] = {cell_index((i + n - 1) % n, j, k, n),
                                     cell_index(i, (j + n - 1) % n, k, n),
                                     cell_index(i, j, (k + n - 1) % n, n)};
                dive[c] = ((ex[c] - ex[mb[0]]) + (ey[c] - ey[mb[1]]) +
                           (ez[c] - ez[mb[2]])) /
                          dx;
            }
        });
        // Ψ ← normalize(Ψ + τ·(iħ/2)[2 e·∇Ψ + (∇·e)Ψ])
        detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
            for (std::size_t c = lo; c < hi; ++c) {
                uint32_t i = static_cast<uint32_t>(c % n);
                uint32_t j = static_cast<uint32_t>((c / n) % n);
                uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
                std::size_t xp = cell_index((i + 1) % n, j, k, n),
                            xm = cell_index((i + n - 1) % n, j, k, n);
                std::size_t yp = cell_index(i, (j + 1) % n, k, n),
                            ym = cell_index(i, (j + n - 1) % n, k, n);
                std::size_t zp = cell_index(i, j, (k + 1) % n, n),
                            zm = cell_index(i, j, (k + n - 1) % n, n);
                // e at the centre: average of the two owned faces per axis.
                double ec[3] = {0.5 * (ex[c] + ex[xm]), 0.5 * (ey[c] + ey[ym]),
                                0.5 * (ez[c] + ez[zm])};
                double out[4];
                for (int comp = 0; comp < 2; ++comp) {
                    double gr[3], gi[3];
                    gr[0] = (phi_g[4 * xp + 2 * comp] - phi_g[4 * xm + 2 * comp]) / (2 * dx);
                    gi[0] = (phi_g[4 * xp + 2 * comp + 1] - phi_g[4 * xm + 2 * comp + 1]) / (2 * dx);
                    gr[1] = (phi_g[4 * yp + 2 * comp] - phi_g[4 * ym + 2 * comp]) / (2 * dx);
                    gi[1] = (phi_g[4 * yp + 2 * comp + 1] - phi_g[4 * ym + 2 * comp + 1]) / (2 * dx);
                    gr[2] = (phi_g[4 * zp + 2 * comp] - phi_g[4 * zm + 2 * comp]) / (2 * dx);
                    gi[2] = (phi_g[4 * zp + 2 * comp + 1] - phi_g[4 * zm + 2 * comp + 1]) / (2 * dx);
                    double sr = 2.0 * (ec[0] * gr[0] + ec[1] * gr[1] + ec[2] * gr[2]) +
                                dive[c] * phi_g[4 * c + 2 * comp];
                    double si = 2.0 * (ec[0] * gi[0] + ec[1] * gi[1] + ec[2] * gi[2]) +
                                dive[c] * phi_g[4 * c + 2 * comp + 1];
                    // + τ·(iħ/2)(sr + i·si) = + τ·(ħ/2)(−si + i·sr)
                    out[2 * comp] = phi_g[4 * c + 2 * comp] - tau_eff * (hbar / 2.0) * si;
                    out[2 * comp + 1] = phi_g[4 * c + 2 * comp + 1] + tau_eff * (hbar / 2.0) * sr;
                }
                double n2 = out[0] * out[0] + out[1] * out[1] + out[2] * out[2] +
                            out[3] * out[3];
                double inv = 1.0 / std::sqrt(std::max(n2, 1e-300));
                for (int q = 0; q < 4; ++q) next[4 * c + q] = out[q] * inv;
            }
        });
        phi_g.swap(next);
    }
    return resid;
}

}  // namespace detail

ClebschResult run_clebsch(const ClebschConfig& cfg,
                          const std::filesystem::path* capture_manifest) {
    const uint32_t n = cfg.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double dx = 1.0 / static_cast<double>(n);
    if (n < 8 || (n & (n - 1)) != 0)
        throw std::invalid_argument("clebsch_pfm: n must be a power of two >= 8 (MG)");
    if (cfg.particles_per_cell != 8)
        throw std::invalid_argument("clebsch_pfm: particles_per_cell must be 8 (2x2x2 strata)");

    ClebschResult result;
    int call = 0;

    auto trajectory = [&](ClebschResult* out) -> std::vector<unsigned char> {
        Kernels K(n);
        std::vector<double> phi_g(4 * ncell), gamma, ux, uy, uz, density;

        // --- initial wave function ------------------------------------------------
        detail::parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
            for (std::size_t c = lo; c < hi; ++c) {
                uint32_t i = static_cast<uint32_t>(c % n);
                uint32_t j = static_cast<uint32_t>((c / n) % n);
                uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
                double x = (i + 0.5) * dx, y = (j + 0.5) * dx, z = (k + 0.5) * dx;
                Spinor s = (cfg.ic == InitialCondition::kTaylorGreen3D)
                               ? taylor_green_wave_seed_3d(x, y, z, cfg.hbar)
                               : taylor_green_wave_2d(x, y, cfg.hbar);
                for (int q = 0; q < 4; ++q) phi_g[4 * c + q] = s[q];
            }
        });
        if (cfg.ic == InitialCondition::kTaylorGreen3D) {
            // Cascadic wave-fit (1c divergence fix): converge on the coarsest level
            // (16³, closed-form seed) and prolong upward, cleaning the high-frequency
            // residual per level — plain fine-level descent is a stiff 1/dx²-CFL
            // problem (≈7 h at 128³; MEASURED divergence ladder in the landing note).
            auto target_faces = [&](uint32_t nl, std::vector<double>& tx,
                                    std::vector<double>& ty, std::vector<double>& tz) {
                const std::size_t ncl = static_cast<std::size_t>(nl) * nl * nl;
                const double dxl = 1.0 / static_cast<double>(nl);
                tx.resize(ncl);
                ty.resize(ncl);
                tz.resize(ncl);
                detail::parallel_for(ncl, [&](std::size_t lo, std::size_t hi) {
                    for (std::size_t c = lo; c < hi; ++c) {
                        uint32_t i = static_cast<uint32_t>(c % nl);
                        uint32_t j = static_cast<uint32_t>((c / nl) % nl);
                        uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(nl) * nl));
                        tx[c] = taylor_green_velocity(cfg.ic, (i + 1.0) * dxl,
                                                      (j + 0.5) * dxl, (k + 0.5) * dxl)[0];
                        ty[c] = taylor_green_velocity(cfg.ic, (i + 0.5) * dxl,
                                                      (j + 1.0) * dxl, (k + 0.5) * dxl)[1];
                        tz[c] = taylor_green_velocity(cfg.ic, (i + 0.5) * dxl,
                                                      (j + 0.5) * dxl, (k + 1.0) * dxl)[2];
                    }
                });
            };
            const uint32_t n0 = std::min(16u, n);
            std::vector<double> phi_l(4 * static_cast<std::size_t>(n0) * n0 * n0);
            const double dx0 = 1.0 / static_cast<double>(n0);
            detail::parallel_for(phi_l.size() / 4, [&](std::size_t lo, std::size_t hi) {
                for (std::size_t c = lo; c < hi; ++c) {
                    uint32_t i = static_cast<uint32_t>(c % n0);
                    uint32_t j = static_cast<uint32_t>((c / n0) % n0);
                    uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n0) * n0));
                    Spinor sp = taylor_green_wave_seed_3d((i + 0.5) * dx0, (j + 0.5) * dx0,
                                                          (k + 0.5) * dx0, cfg.hbar);
                    for (int q = 0; q < 4; ++q) phi_l[4 * c + q] = sp[q];
                }
            });
            std::vector<double> tx, ty, tz;
            for (uint32_t nl = n0;; nl *= 2) {
                target_faces(nl, tx, ty, tz);
                // per-level budget: full count at the coarsest level (where global
                // convergence happens), halved per refinement (only high-frequency
                // cleanup remains), floored at 200.
                uint32_t iters_l = std::max(200u, cfg.init_descent_iters / (nl / n0));
                double r = detail::wave_fit_descent(phi_l, tx, ty, tz, nl, cfg.hbar,
                                                    iters_l, cfg.init_descent_tau);
                std::fprintf(stderr, "[clebsch-pfm] cascadic level %u resid %.3e\n", nl, r);
                if (nl == n) break;
                std::vector<double> phi_f;
                detail::prolong_spinor(phi_l, nl, phi_f, nl * 2);
                phi_l.swap(phi_f);
            }
            phi_g.swap(phi_l);
        }
        double norm_dev = 0.0;
        standardize_phi(K, phi_g, cfg.hbar, cfg.poisson_vcycles, gamma, nullptr);
        convert_grid(K, phi_g, cfg.hbar, ux, uy, uz);
        DivPair dp0 = project(K, ux, uy, uz, cfg.poisson_vcycles, gamma);
        double div_pre = dp0.pre, div_max = dp0.post;

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

        // --- particles --------------------------------------------------------------
        detail::ParticleSystem ps;
        if (cfg.track_forward_jacobian) ps.jac_f.clear();
        uint64_t reinit_v = 0, reinit_g = 0;
        std::vector<double> phi_s_snapshot;
        double carried_drift = 0.0;
        double flowmap_resid = 0.0;

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
                std::fprintf(stderr, "[clebsch-pfm] run step %u/%u\n", step, cfg.steps);
            if (step % cfg.n_v == 0) {
                if (step > 0) {
                    // measure carried-Φ drift (0-form: expect exactly 0), then reinit
                    double d = 0.0;
                    for (std::size_t q = 0; q < ps.phi_s.size(); ++q)
                        d = std::max(d, std::fabs(ps.phi_s[q] - phi_s_snapshot[q]));
                    carried_drift = std::max(carried_drift, d);
                    standardize_phi(K, phi_g, cfg.hbar, cfg.poisson_vcycles, gamma,
                                    &norm_dev);
                }
                detail::redistribute_particles(ps, n, cfg.particles_per_cell,
                                               static_cast<uint64_t>(cfg.seed), reinit_v++);
                if (cfg.track_forward_jacobian) ps.jac_f.assign(9 * ps.count, 0.0);
                detail::g2p_spinor(ps, phi_g, n, /*value=*/true, /*gradient=*/false);
                phi_s_snapshot = ps.phi_s;
            }
            if (step % cfg.n_g == 0) {
                detail::parallel_for(ps.count, [&](std::size_t lo, std::size_t hi) {
                    for (std::size_t p = lo; p < hi; ++p) {
                        for (int q = 0; q < 9; ++q) ps.jac_t[9 * p + q] = 0.0;
                        ps.jac_t[9 * p + 0] = ps.jac_t[9 * p + 4] = ps.jac_t[9 * p + 8] = 1.0;
                    }
                });
                if (cfg.track_forward_jacobian) {
                    detail::parallel_for(ps.count, [&](std::size_t lo, std::size_t hi) {
                        for (std::size_t p = lo; p < hi; ++p) {
                            for (int q = 0; q < 9; ++q) ps.jac_f[9 * p + q] = 0.0;
                            ps.jac_f[9 * p + 0] = ps.jac_f[9 * p + 4] =
                                ps.jac_f[9 * p + 8] = 1.0;
                        }
                    });
                }
                detail::g2p_spinor(ps, phi_g, n, /*value=*/false, /*gradient=*/true);
                ++reinit_g;
            }

            detail::advect_particles_rk4(ps, ux, uy, uz, n, cfg.dt,
                                         cfg.track_forward_jacobian);
            ps.rebuild_bins(n);
            ps.compute_mapped_gradients();
            if (cfg.track_forward_jacobian) {
                double r = 0.0;  // sequential max of ||T̃F̃ − I||_max
                for (std::size_t p = 0; p < ps.count; ++p) {
                    const double* T = &ps.jac_t[9 * p];
                    const double* F = &ps.jac_f[9 * p];
                    for (int r2 = 0; r2 < 3; ++r2)
                        for (int c2 = 0; c2 < 3; ++c2) {
                            double s = 0.0;
                            for (int e = 0; e < 3; ++e) s += T[r2 * 3 + e] * F[e * 3 + c2];
                            r = std::max(r, std::fabs(s - (r2 == c2 ? 1.0 : 0.0)));
                        }
                }
                flowmap_resid = std::max(flowmap_resid, r);
            }

            detail::p2g_spinor(ps, phi_g, n);
            convert_particles(K, ps, phi_g, cfg.hbar, ux, uy, uz);
            DivPair dps = project(K, ux, uy, uz, cfg.poisson_vcycles, gamma);
            div_pre = std::max(div_pre, dps.pre);
            div_max = std::max(div_max, dps.post);

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
            out->max_norm_deviation = norm_dev;
            out->max_carried_phi_drift = carried_drift;
            out->max_div_preproj = div_pre;
            out->max_div_postproj = div_max;
            out->max_flowmap_residual = flowmap_resid;
        }

        // witness bytes: final faces + wave function + density
        std::vector<unsigned char> wit((3 * ncell + 4 * ncell +
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
        put(phi_g);
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
        // 1.1.0 as "differentiable-consumer capture"; the U-3 precedent).
        m.schema_version = "1.0.0";
        m.sim = {"eulerian-smoke", "volumetric-grid", "frontier-clebsch-pfm"};
        m.stack = {"cpp", "0.0.0", "phase-6-c1-u4"};
        m.config.tier = "test";
        m.config.dims = {static_cast<int64_t>(n), static_cast<int64_t>(n),
                         static_cast<int64_t>(n)};
        m.config.dtype = "f64";
        m.config.seed = static_cast<uint64_t>(cfg.seed);
        m.config.params = {
            {"dt", cfg.dt},
            {"hbar", cfg.hbar},
            {"particles_per_cell", static_cast<double>(cfg.particles_per_cell)},
            {"n_v", static_cast<double>(cfg.n_v)},
            {"n_g", static_cast<double>(cfg.n_g)},
            {"poisson_vcycles", static_cast<double>(cfg.poisson_vcycles)},
            {"init_descent_iters", static_cast<double>(cfg.init_descent_iters)},
            {"init_descent_tau", cfg.init_descent_tau},
            {"ic", cfg.ic == InitialCondition::kTaylorGreen3D ? "taylor-green-3d"
                                                              : "taylor-green-2d-zinv"},
            {"enhanced_conversion_dx_s", 0.5},
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
                // Transpose the internal x-fastest lex order ((k·n + j)·n + i) to the
                // parent capture's [x][y][z] axis layout (z fastest) — field parity
                // with the descriptor family (MEASURED at 1c: the parent's frame-0 TG
                // structure varies as sin along h5 axis 0 = x).
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

}  // namespace bit_physics::clebsch_pfm

// C-1 U-6 stage 1b-i — analytic closed forms + deterministic host numerics
// (parallel-for, quadratic B-spline, periodic multigrid Poisson). U-5 substrate
// copy-adapt (probe § 5); derivations in edge_detail.hpp; the spec sheet § 2 records
// them as the hand-derivation anchor. The same closed forms verified in the U-5 vpfm
// package (A1 FD-cross-check).

#include <algorithm>
#include <cmath>
#include <thread>

#include "bit_physics/edge/edge.hpp"
#include "edge_detail.hpp"

namespace bit_physics::edge {

namespace detail {

void parallel_for(std::size_t count,
                  const std::function<void(std::size_t, std::size_t)>& chunk_fn) {
    unsigned hw = std::thread::hardware_concurrency();
    std::size_t nthreads = std::max(1u, hw);
    if (count < 4096) {  // small problems: sequential (identical results either way)
        chunk_fn(0, count);
        return;
    }
    std::size_t chunk = (count + nthreads - 1) / nthreads;
    std::vector<std::thread> pool;
    pool.reserve(nthreads);
    for (std::size_t t = 0; t < nthreads; ++t) {
        std::size_t lo = t * chunk;
        std::size_t hi = std::min(count, lo + chunk);
        if (lo >= hi) break;
        pool.emplace_back([&, lo, hi] { chunk_fn(lo, hi); });
    }
    for (auto& th : pool) th.join();
}

BSpline bspline_quadratic(double x_over_h) {
    // Quadratic B-spline on the node lattice: nodes at integers, support |r| < 1.5.
    // base = the smallest of the 3 contributing nodes = round(x) - 1.
    BSpline s{};
    double xr = std::floor(x_over_h + 0.5);  // nearest node
    s.base = static_cast<int>(xr) - 1;
    double fx = x_over_h - xr;  // in [-0.5, 0.5]
    double r0 = fx + 1.0, r1 = fx, r2 = fx - 1.0;
    s.w[0] = 0.5 * (1.5 - r0) * (1.5 - r0);
    s.w[1] = 0.75 - r1 * r1;
    s.w[2] = 0.5 * (1.5 + r2) * (1.5 + r2);
    s.dw[0] = -(1.5 - r0);
    s.dw[1] = -2.0 * r1;
    s.dw[2] = (1.5 + r2);
    return s;
}

namespace {

inline std::size_t widx(uint32_t i, uint32_t j, uint32_t k, uint32_t n) {
    return (static_cast<std::size_t>(k) * n + j) * n + i;
}

// One red-black Gauss-Seidel sweep of lap(p) = rhs (7-point, periodic, spacing h).
void rbgs_sweep(std::vector<double>& p, const std::vector<double>& rhs, uint32_t n,
                double h, int colour) {
    const double h2 = h * h;
    parallel_for(static_cast<std::size_t>(n) * n, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t jk = lo; jk < hi; ++jk) {
            uint32_t j = static_cast<uint32_t>(jk % n);
            uint32_t k = static_cast<uint32_t>(jk / n);
            uint32_t jp = (j + 1) % n, jm = (j + n - 1) % n;
            uint32_t kp = (k + 1) % n, km = (k + n - 1) % n;
            for (uint32_t i = 0; i < n; ++i) {
                if (((i + j + k) & 1u) != static_cast<uint32_t>(colour)) continue;
                uint32_t ip = (i + 1) % n, im = (i + n - 1) % n;
                double nb = p[widx(ip, j, k, n)] + p[widx(im, j, k, n)] +
                            p[widx(i, jp, k, n)] + p[widx(i, jm, k, n)] +
                            p[widx(i, j, kp, n)] + p[widx(i, j, km, n)];
                p[widx(i, j, k, n)] = (nb - h2 * rhs[widx(i, j, k, n)]) / 6.0;
            }
        }
    });
}

double residual_max(const std::vector<double>& p, const std::vector<double>& rhs,
                    uint32_t n, double h) {
    const double h2 = h * h;
    double rmax = 0.0;  // sequential reduction (deterministic)
    for (uint32_t k = 0; k < n; ++k)
        for (uint32_t j = 0; j < n; ++j)
            for (uint32_t i = 0; i < n; ++i) {
                uint32_t ip = (i + 1) % n, im = (i + n - 1) % n;
                uint32_t jp = (j + 1) % n, jm = (j + n - 1) % n;
                uint32_t kp = (k + 1) % n, km = (k + n - 1) % n;
                double lap = (p[widx(ip, j, k, n)] + p[widx(im, j, k, n)] +
                              p[widx(i, jp, k, n)] + p[widx(i, jm, k, n)] +
                              p[widx(i, j, kp, n)] + p[widx(i, j, km, n)] -
                              6.0 * p[widx(i, j, k, n)]) /
                             h2;
                rmax = std::max(rmax, std::fabs(lap - rhs[widx(i, j, k, n)]));
            }
    return rmax;
}

void restrict_full_weight(const std::vector<double>& fine, std::vector<double>& coarse,
                          uint32_t nf) {
    uint32_t nc = nf / 2;
    parallel_for(static_cast<std::size_t>(nc) * nc * nc,
                 [&](std::size_t lo, std::size_t hi) {
                     for (std::size_t c = lo; c < hi; ++c) {
                         uint32_t i = static_cast<uint32_t>(c % nc);
                         uint32_t j = static_cast<uint32_t>((c / nc) % nc);
                         uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(nc) * nc));
                         double s = 0.0;
                         for (uint32_t dk = 0; dk < 2; ++dk)
                             for (uint32_t dj = 0; dj < 2; ++dj)
                                 for (uint32_t di = 0; di < 2; ++di)
                                     s += fine[widx(2 * i + di, 2 * j + dj, 2 * k + dk, nf)];
                         coarse[c] = s / 8.0;
                     }
                 });
}

void prolong_add_trilinear(std::vector<double>& fine, const std::vector<double>& coarse,
                           uint32_t nf) {
    uint32_t nc = nf / 2;
    parallel_for(static_cast<std::size_t>(nf) * nf * nf,
                 [&](std::size_t lo, std::size_t hi) {
                     for (std::size_t c = lo; c < hi; ++c) {
                         uint32_t i = static_cast<uint32_t>(c % nf);
                         uint32_t j = static_cast<uint32_t>((c / nf) % nf);
                         uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(nf) * nf));
                         double xc = (i + 0.5) / 2.0 - 0.5;
                         double yc = (j + 0.5) / 2.0 - 0.5;
                         double zc = (k + 0.5) / 2.0 - 0.5;
                         int i0 = static_cast<int>(std::floor(xc));
                         int j0 = static_cast<int>(std::floor(yc));
                         int k0 = static_cast<int>(std::floor(zc));
                         double fx = xc - i0, fy = yc - j0, fz = zc - k0;
                         double acc = 0.0;
                         for (int dk = 0; dk < 2; ++dk)
                             for (int dj = 0; dj < 2; ++dj)
                                 for (int di = 0; di < 2; ++di) {
                                     double wgt = (di ? fx : 1.0 - fx) *
                                                  (dj ? fy : 1.0 - fy) *
                                                  (dk ? fz : 1.0 - fz);
                                     uint32_t ii = static_cast<uint32_t>(((i0 + di) % static_cast<int>(nc) + nc) % nc);
                                     uint32_t jj = static_cast<uint32_t>(((j0 + dj) % static_cast<int>(nc) + nc) % nc);
                                     uint32_t kk = static_cast<uint32_t>(((k0 + dk) % static_cast<int>(nc) + nc) % nc);
                                     acc += wgt * coarse[widx(ii, jj, kk, nc)];
                                 }
                         fine[c] += acc;
                     }
                 });
}

void vcycle(std::vector<double>& p, const std::vector<double>& rhs, uint32_t n, double h) {
    if (n <= 4) {
        for (int s = 0; s < 40; ++s) {
            rbgs_sweep(p, rhs, n, h, 0);
            rbgs_sweep(p, rhs, n, h, 1);
        }
        return;
    }
    for (int s = 0; s < 2; ++s) {
        rbgs_sweep(p, rhs, n, h, 0);
        rbgs_sweep(p, rhs, n, h, 1);
    }
    const double h2 = h * h;
    std::vector<double> res(static_cast<std::size_t>(n) * n * n);
    parallel_for(res.size(), [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            uint32_t ip = (i + 1) % n, im = (i + n - 1) % n;
            uint32_t jp = (j + 1) % n, jm = (j + n - 1) % n;
            uint32_t kp = (k + 1) % n, km = (k + n - 1) % n;
            double lap = (p[widx(ip, j, k, n)] + p[widx(im, j, k, n)] +
                          p[widx(i, jp, k, n)] + p[widx(i, jm, k, n)] +
                          p[widx(i, j, kp, n)] + p[widx(i, j, km, n)] -
                          6.0 * p[c]) /
                         h2;
            res[c] = rhs[c] - lap;
        }
    });
    uint32_t nc = n / 2;
    std::vector<double> rc(static_cast<std::size_t>(nc) * nc * nc);
    restrict_full_weight(res, rc, n);
    std::vector<double> ec(rc.size(), 0.0);
    vcycle(ec, rc, nc, 2.0 * h);
    prolong_add_trilinear(p, ec, n);
    for (int s = 0; s < 2; ++s) {
        rbgs_sweep(p, rhs, n, h, 0);
        rbgs_sweep(p, rhs, n, h, 1);
    }
}

}  // namespace

double poisson_periodic_mg(std::vector<double>& p, const std::vector<double>& rhs,
                           uint32_t n, double h, uint32_t vcycles) {
    // Compatibility: remove the mean of rhs so the periodic problem is solvable (the
    // removed mean IS the total-vorticity budget the diagnostics record); pin the
    // solution mean to zero for witness stability.
    std::vector<double> b = rhs;
    double mean = 0.0;
    for (double v : b) mean += v;
    mean /= static_cast<double>(b.size());
    for (double& v : b) v -= mean;

    for (uint32_t c = 0; c < vcycles; ++c) vcycle(p, b, n, h);

    double pm = 0.0;
    for (double v : p) pm += v;
    pm /= static_cast<double>(p.size());
    for (double& v : p) v -= pm;
    return residual_max(p, b, n, h);
}

}  // namespace detail

// --- public analytic surfaces -------------------------------------------------------

std::array<double, 3> taylor_green_velocity(InitialCondition ic, double x, double y,
                                            double z) {
    const double k = 2.0 * M_PI;
    if (ic == InitialCondition::kTaylorGreen2DZInvariant) {
        return {std::sin(k * x) * std::cos(k * y), -std::cos(k * x) * std::sin(k * y),
                0.0};
    }
    // Parent IC (packages/eulerian-smoke sim.py:181-212): u = sin·cos·cos etc.
    return {std::sin(k * x) * std::cos(k * y) * std::cos(k * z),
            -std::cos(k * x) * std::sin(k * y) * std::cos(k * z), 0.0};
}

std::array<double, 3> taylor_green_vorticity(InitialCondition ic, double x, double y,
                                             double z) {
    const double k = 2.0 * M_PI;
    if (ic == InitialCondition::kTaylorGreen2DZInvariant) {
        return {0.0, 0.0, 2.0 * k * std::sin(k * x) * std::sin(k * y)};
    }
    // ω = ∇×u of the parent 3D TG (derivation in edge_detail.hpp header).
    return {-k * std::cos(k * x) * std::sin(k * y) * std::sin(k * z),
            -k * std::sin(k * x) * std::cos(k * y) * std::sin(k * z),
            2.0 * k * std::sin(k * x) * std::sin(k * y) * std::cos(k * z)};
}

double kinetic_energy(const std::vector<double>& u, const std::vector<double>& v,
                      const std::vector<double>& w, double dx) {
    double e = 0.0;  // sequential (deterministic) reduction
    for (std::size_t i = 0; i < u.size(); ++i)
        e += u[i] * u[i] + v[i] * v[i] + w[i] * w[i];
    return 0.5 * e * dx * dx * dx;
}

}  // namespace bit_physics::edge

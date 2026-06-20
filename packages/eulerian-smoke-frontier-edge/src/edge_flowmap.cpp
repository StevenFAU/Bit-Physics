// C-1 U-6 stage 1b-ii — the GRID backward-flow-map transport (the EDGE core; anchor
// § 3). Gather-only, fixed-order, no atomics (spec § 6 determinism posture; derivations
// in edge_detail.hpp). U-5 substrate copy-adapt for the MAC sampling / mac_to_centres /
// semi-Lagrangian scalar paths; the displacement+Jacobian flow-map state, the
// variational backtrace Jacobian, the chain-rule map composition, and the Cauchy
// vorticity transport are built NEW (grid-side — NO particles).

#include <cmath>

#include "bit_physics/edge/edge.hpp"
#include "edge_detail.hpp"

namespace bit_physics::edge::detail {

namespace {

inline double wrap01(double x) {
    double w = x - std::floor(x);
    return (w >= 1.0) ? 0.0 : w;  // guard the x == -0.0 / FP-edge case
}

inline uint32_t wrap_node(int v, uint32_t n) {
    int m = v % static_cast<int>(n);
    return static_cast<uint32_t>(m < 0 ? m + static_cast<int>(n) : m);
}

// Backward-trajectory RK4: integrate dφ/dτ = u(φ), φ(0) = x, to τ = −dt (the departure
// point x_dep); jointly evolve the variational Jacobian dΨ/dτ = ∇u(φ)·Ψ, Ψ(0) = I, to
// M = Ψ(−dt) = ∂x_dep/∂x. One sample of (u, ∇u) per RK stage (frozen field).
void backtrace_rk4(const std::vector<double>& ux, const std::vector<double>& uy,
                   const std::vector<double>& uz, uint32_t n, double x0, double y0,
                   double z0, double dt, double xdep[3], double M[9]) {
    const double hb = -dt;  // backward step
    double Phi0[9] = {1, 0, 0, 0, 1, 0, 0, 0, 1};
    double kx[4], ky[4], kz[4], kP[4][9];
    double xs = x0, ys = y0, zs = z0, Ps[9];
    for (int q = 0; q < 9; ++q) Ps[q] = Phi0[q];
    const double stage[4] = {0.0, 0.5 * hb, 0.5 * hb, hb};
    for (int st = 0; st < 4; ++st) {
        if (st > 0) {
            xs = x0 + stage[st] * kx[st - 1];
            ys = y0 + stage[st] * ky[st - 1];
            zs = z0 + stage[st] * kz[st - 1];
            for (int q = 0; q < 9; ++q) Ps[q] = Phi0[q] + stage[st] * kP[st - 1][q];
        }
        double u[3], G[9];
        sample_mac_velocity_gradient(ux, uy, uz, n, wrap01(xs), wrap01(ys), wrap01(zs), u,
                                     G);
        kx[st] = u[0];
        ky[st] = u[1];
        kz[st] = u[2];
        for (int r = 0; r < 3; ++r)
            for (int c = 0; c < 3; ++c) {
                double s = 0.0;
                for (int e = 0; e < 3; ++e) s += G[r * 3 + e] * Ps[e * 3 + c];
                kP[st][r * 3 + c] = s;
            }
    }
    xdep[0] = x0 + (hb / 6.0) * (kx[0] + 2.0 * kx[1] + 2.0 * kx[2] + kx[3]);
    xdep[1] = y0 + (hb / 6.0) * (ky[0] + 2.0 * ky[1] + 2.0 * ky[2] + ky[3]);
    xdep[2] = z0 + (hb / 6.0) * (kz[0] + 2.0 * kz[1] + 2.0 * kz[2] + kz[3]);
    for (int q = 0; q < 9; ++q)
        M[q] = Phi0[q] + (hb / 6.0) * (kP[0][q] + 2.0 * kP[1][q] + 2.0 * kP[2][q] + kP[3][q]);
}

// 3×3 inverse (row-major). det ≈ 1 for incompressible short maps; guarded.
void invert3x3(const double A[9], double Inv[9]) {
    double a = A[0], b = A[1], c = A[2], d = A[3], e = A[4], f = A[5], g = A[6], h = A[7],
           i = A[8];
    double det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    double s = (std::fabs(det) > 1e-300) ? 1.0 / det : 0.0;
    Inv[0] = (e * i - f * h) * s;
    Inv[1] = (c * h - b * i) * s;
    Inv[2] = (b * f - c * e) * s;
    Inv[3] = (f * g - d * i) * s;
    Inv[4] = (a * i - c * g) * s;
    Inv[5] = (c * d - a * f) * s;
    Inv[6] = (d * h - e * g) * s;
    Inv[7] = (b * g - a * h) * s;
    Inv[8] = (a * e - b * d) * s;
}

}  // namespace

void sample_mac_velocity_gradient(const std::vector<double>& ux,
                                  const std::vector<double>& uy,
                                  const std::vector<double>& uz, uint32_t n, double x,
                                  double y, double z, double* u_out, double* grad_out) {
    // Face-node lattices (+axis-owner convention, U-5 verbatim): the x-face owned by
    // cell (i,j,k) sits at ((i+1)h, (j+0.5)h, (k+0.5)h). One stencil walk per component.
    const double dn = static_cast<double>(n);
    const std::vector<double>* fields[3] = {&ux, &uy, &uz};
    for (int comp = 0; comp < 3; ++comp) {
        double cx = x * dn, cy = y * dn, cz = z * dn;
        BSpline bx = (comp == 0) ? bspline_quadratic(cx - 1.0) : bspline_quadratic(cx - 0.5);
        BSpline by = (comp == 1) ? bspline_quadratic(cy - 1.0) : bspline_quadratic(cy - 0.5);
        BSpline bz = (comp == 2) ? bspline_quadratic(cz - 1.0) : bspline_quadratic(cz - 0.5);
        double acc = 0.0, gx = 0.0, gy = 0.0, gz = 0.0;
        for (int ck = 0; ck < 3; ++ck) {
            uint32_t gk = wrap_node(bz.base + ck, n);
            for (int cj = 0; cj < 3; ++cj) {
                uint32_t gj = wrap_node(by.base + cj, n);
                for (int ci = 0; ci < 3; ++ci) {
                    uint32_t gi = wrap_node(bx.base + ci, n);
                    double f = (*fields[comp])[cell_index(gi, gj, gk, n)];
                    double wx = bx.w[ci], wy = by.w[cj], wz = bz.w[ck];
                    acc += wx * wy * wz * f;
                    if (grad_out) {
                        gx += bx.dw[ci] * wy * wz * f;
                        gy += wx * by.dw[cj] * wz * f;
                        gz += wx * wy * bz.dw[ck] * f;
                    }
                }
            }
        }
        u_out[comp] = acc;
        if (grad_out) {
            grad_out[comp * 3 + 0] = gx * dn;
            grad_out[comp * 3 + 1] = gy * dn;
            grad_out[comp * 3 + 2] = gz * dn;
        }
    }
}

void sample_centred(const std::vector<double>& field, int ncomp, uint32_t n, double x,
                    double y, double z, double* out) {
    // Cell-centred lattice: node i at (i+0.5)h → integer nodes after the −0.5 shift.
    const double dn = static_cast<double>(n);
    BSpline bx = bspline_quadratic(x * dn - 0.5);
    BSpline by = bspline_quadratic(y * dn - 0.5);
    BSpline bz = bspline_quadratic(z * dn - 0.5);
    for (int q = 0; q < ncomp; ++q) out[q] = 0.0;
    for (int ck = 0; ck < 3; ++ck) {
        uint32_t gk = wrap_node(bz.base + ck, n);
        for (int cj = 0; cj < 3; ++cj) {
            uint32_t gj = wrap_node(by.base + cj, n);
            double wyz = by.w[cj] * bz.w[ck];
            for (int ci = 0; ci < 3; ++ci) {
                uint32_t gi = wrap_node(bx.base + ci, n);
                double w = bx.w[ci] * wyz;
                const double* base = &field[ncomp * cell_index(gi, gj, gk, n)];
                for (int q = 0; q < ncomp; ++q) out[q] += w * base[q];
            }
        }
    }
}

namespace {
// Periodic Catmull-Rom cubic: INTERPOLATING (passes through node values — no
// zero-offset smoothing, unlike the quadratic-B-spline gather), C¹, 3rd-order. This is
// the EDGE "Hermite-class high-accuracy departure-point sampling" (anchor § 3 item 3):
// the smoothing B-spline gather attenuates the oscillatory ω_ref ~0.5%/resample and
// drove the steady-anchor energy down ~2%; Catmull-Rom removes that bias.
inline void catmull_rom_weights(double t, double w[4]) {
    double t2 = t * t, t3 = t2 * t;
    w[0] = -0.5 * t + t2 - 0.5 * t3;
    w[1] = 1.0 - 2.5 * t2 + 1.5 * t3;
    w[2] = 0.5 * t + 2.0 * t2 - 1.5 * t3;
    w[3] = -0.5 * t2 + 0.5 * t3;
}
inline void cr_axis(double coord_nodes, int base[1], double w[4]) {
    int b = static_cast<int>(std::floor(coord_nodes));
    catmull_rom_weights(coord_nodes - b, w);
    base[0] = b - 1;  // p0 .. p3 = nodes b-1, b, b+1, b+2
}
}  // namespace

double sample_edge_value(const std::vector<double>& field, int family, uint32_t n,
                         double x, double y, double z) {
    const double dn = static_cast<double>(n);
    int bx[1], by[1], bz[1];
    double wx[4], wy[4], wz[4];
    cr_axis(x * dn - edge_offset(family, 0), bx, wx);
    cr_axis(y * dn - edge_offset(family, 1), by, wy);
    cr_axis(z * dn - edge_offset(family, 2), bz, wz);
    double acc = 0.0;
    for (int ck = 0; ck < 4; ++ck) {
        uint32_t gk = wrap_node(bz[0] + ck, n);
        for (int cj = 0; cj < 4; ++cj) {
            uint32_t gj = wrap_node(by[0] + cj, n);
            double wyz = wy[cj] * wz[ck];
            for (int ci = 0; ci < 4; ++ci) {
                uint32_t gi = wrap_node(bx[0] + ci, n);
                acc += wx[ci] * wyz * field[cell_index(gi, gj, gk, n)];
            }
        }
    }
    return acc;
}

void mac_to_centres(const std::vector<double>& ux, const std::vector<double>& uy,
                    const std::vector<double>& uz, uint32_t n, std::vector<double>& uc,
                    std::vector<double>& vc, std::vector<double>& wc) {
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    uc.resize(ncell);
    vc.resize(ncell);
    wc.resize(ncell);
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            uint32_t im = (i + n - 1) % n, jm = (j + n - 1) % n, km = (k + n - 1) % n;
            uc[c] = 0.5 * (ux[c] + ux[cell_index(im, j, k, n)]);
            vc[c] = 0.5 * (uy[c] + uy[cell_index(i, jm, k, n)]);
            wc[c] = 0.5 * (uz[c] + uz[cell_index(i, j, km, n)]);
        }
    });
}

void advect_scalar_semi_lagrangian(std::vector<double>& field,
                                   const std::vector<double>& uc,
                                   const std::vector<double>& vc,
                                   const std::vector<double>& wc, uint32_t n, double dt) {
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double h = 1.0 / static_cast<double>(n);
    std::vector<double> out(ncell);
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            double x = (i + 0.5) * h - dt * uc[c];
            double y = (j + 0.5) * h - dt * vc[c];
            double z = (k + 0.5) * h - dt * wc[c];
            double gx = wrap01(x) * n - 0.5, gy = wrap01(y) * n - 0.5,
                   gz = wrap01(z) * n - 0.5;
            int i0 = static_cast<int>(std::floor(gx));
            int j0 = static_cast<int>(std::floor(gy));
            int k0 = static_cast<int>(std::floor(gz));
            double fx = gx - i0, fy = gy - j0, fz = gz - k0;
            double acc = 0.0;
            for (int dk = 0; dk < 2; ++dk)
                for (int dj = 0; dj < 2; ++dj)
                    for (int di = 0; di < 2; ++di) {
                        double w = (di ? fx : 1.0 - fx) * (dj ? fy : 1.0 - fy) *
                                   (dk ? fz : 1.0 - fz);
                        acc += w * field[cell_index(wrap_node(i0 + di, n),
                                                    wrap_node(j0 + dj, n),
                                                    wrap_node(k0 + dk, n), n)];
                    }
            out[c] = acc;
        }
    });
    field.swap(out);
}

// --- the grid backward flow map ----------------------------------------------------

void FlowMap::allocate(uint32_t n_) {
    n = n_;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    disp.assign(3 * ncell, 0.0);
    jac.assign(9 * ncell, 0.0);
    wref_x.assign(ncell, 0.0);
    wref_y.assign(ncell, 0.0);
    wref_z.assign(ncell, 0.0);
}

void flowmap_reinit(FlowMap& fm, const std::vector<double>& wx,
                    const std::vector<double>& wy, const std::vector<double>& wz) {
    const uint32_t n = fm.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            for (int d = 0; d < 3; ++d) fm.disp[3 * c + d] = 0.0;  // ψ = x
            for (int q = 0; q < 9; ++q) fm.jac[9 * c + q] = 0.0;
            for (int d = 0; d < 3; ++d) fm.jac[9 * c + d * 3 + d] = 1.0;  // J = I
            fm.wref_x[c] = wx[c];
            fm.wref_y[c] = wy[c];
            fm.wref_z[c] = wz[c];
        }
    });
}

void flowmap_advance(FlowMap& fm, const std::vector<double>& ux,
                     const std::vector<double>& uy, const std::vector<double>& uz,
                     double dt) {
    const uint32_t n = fm.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double h = 1.0 / static_cast<double>(n);
    std::vector<double> ndisp(3 * ncell), njac(9 * ncell);
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            double xc = (i + 0.5) * h, yc = (j + 0.5) * h, zc = (k + 0.5) * h;
            double xdep[3], M[9];
            backtrace_rk4(ux, uy, uz, n, xc, yc, zc, dt, xdep, M);
            // gather the old map at the departure point (displacement is periodic-smooth)
            double dold[3], Jold[9];
            sample_centred(fm.disp, 3, n, wrap01(xdep[0]), wrap01(xdep[1]),
                           wrap01(xdep[2]), dold);
            sample_centred(fm.jac, 9, n, wrap01(xdep[0]), wrap01(xdep[1]),
                           wrap01(xdep[2]), Jold);
            // ψ^{n+1}(x) = ψ^n(x_dep): d^{n+1} = (x_dep − x) + d^n(x_dep)
            ndisp[3 * c + 0] = (xdep[0] - xc) + dold[0];
            ndisp[3 * c + 1] = (xdep[1] - yc) + dold[1];
            ndisp[3 * c + 2] = (xdep[2] - zc) + dold[2];
            // J^{n+1} = J^n(x_dep) · M
            for (int r = 0; r < 3; ++r)
                for (int cc = 0; cc < 3; ++cc) {
                    double s = 0.0;
                    for (int e = 0; e < 3; ++e) s += Jold[r * 3 + e] * M[e * 3 + cc];
                    njac[9 * c + r * 3 + cc] = s;
                }
        }
    });
    fm.disp.swap(ndisp);
    fm.jac.swap(njac);
}

void flowmap_to_vorticity(const FlowMap& fm, std::vector<double>& wx,
                          std::vector<double>& wy, std::vector<double>& wz) {
    const uint32_t n = fm.n;
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    const double h = 1.0 / static_cast<double>(n);
    std::vector<double>* out[3] = {&wx, &wy, &wz};
    for (int d = 0; d < 3; ++d) out[d]->resize(ncell);
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            for (int d = 0; d < 3; ++d) {
                // family-d edge-node position (in [0,1], periodic)
                double nx = (i + edge_offset(d, 0)) * h;
                double ny = (j + edge_offset(d, 1)) * h;
                double nz = (k + edge_offset(d, 2)) * h;
                double dd[3], J[9];
                sample_centred(fm.disp, 3, n, wrap01(nx), wrap01(ny), wrap01(nz), dd);
                sample_centred(fm.jac, 9, n, wrap01(nx), wrap01(ny), wrap01(nz), J);
                double px = nx + dd[0], py = ny + dd[1], pz = nz + dd[2];  // ψ(node)
                double Finv[9];
                invert3x3(J, Finv);  // forward deformation gradient F = J^{-1}
                // ω_ref(ψ): each component on its own family lattice
                double wr[3] = {sample_edge_value(fm.wref_x, 0, n, px, py, pz),
                                sample_edge_value(fm.wref_y, 1, n, px, py, pz),
                                sample_edge_value(fm.wref_z, 2, n, px, py, pz)};
                // Cauchy: ω = F · ω_ref(ψ); keep the matching component for family d
                double w = Finv[d * 3 + 0] * wr[0] + Finv[d * 3 + 1] * wr[1] +
                           Finv[d * 3 + 2] * wr[2];
                (*out[d])[c] = w;
            }
        }
    });
}

double flowmap_gradient_fd_residual(const FlowMap& fm) {
    const uint32_t n = fm.n;
    const double h = 1.0 / static_cast<double>(n);
    double rmax = 0.0;  // sequential reduction (deterministic)
    for (uint32_t k = 0; k < n; ++k)
        for (uint32_t j = 0; j < n; ++j)
            for (uint32_t i = 0; i < n; ++i) {
                std::size_t c = cell_index(i, j, k, n);
                uint32_t ip = (i + 1) % n, im = (i + n - 1) % n;
                uint32_t jp = (j + 1) % n, jm = (j + n - 1) % n;
                uint32_t kp = (k + 1) % n, km = (k + n - 1) % n;
                std::size_t cxp = cell_index(ip, j, k, n), cxm = cell_index(im, j, k, n);
                std::size_t cyp = cell_index(i, jp, k, n), cym = cell_index(i, jm, k, n);
                std::size_t czp = cell_index(i, j, kp, n), czm = cell_index(i, j, km, n);
                for (int r = 0; r < 3; ++r) {
                    // ∂ψ_r/∂x_j |_fd = δ_rj + central-diff of the periodic displacement
                    double dfd[3] = {
                        (fm.disp[3 * cxp + r] - fm.disp[3 * cxm + r]) / (2.0 * h),
                        (fm.disp[3 * cyp + r] - fm.disp[3 * cym + r]) / (2.0 * h),
                        (fm.disp[3 * czp + r] - fm.disp[3 * czm + r]) / (2.0 * h)};
                    for (int cc = 0; cc < 3; ++cc) {
                        double jfd = (r == cc ? 1.0 : 0.0) + dfd[cc];
                        rmax = std::max(rmax, std::fabs(fm.jac[9 * c + r * 3 + cc] - jfd));
                    }
                }
            }
    return rmax;
}

std::size_t flowmap_state_bytes(const FlowMap& fm) {
    // The PERSISTENT backward-map working set: d (3·ncell) + J (9·ncell) + ω_ref
    // (3·ncell). A function of n ONLY — INDEPENDENT of the flow-map length L (the
    // O(1)-memory headline; buffer methods would add a per-step velocity history here).
    return (fm.disp.size() + fm.jac.size() + fm.wref_x.size() + fm.wref_y.size() +
            fm.wref_z.size()) *
           sizeof(double);
}

}  // namespace bit_physics::edge::detail

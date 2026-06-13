// C-1 U-5 stage 1b-ii — vortex-particle flow-map transport (paper Eqs. 11-14, 20-21).
// Gather-only transfers, fixed-order sequential binning, no atomics (spec § 6
// determinism posture; rules + Eq.-14 derivation in vpfm_detail.hpp). U-4 substrate
// copy-adapt: binning/redistribution/MAC-sampling shapes carried; NEW surfaces are
// the edge-family lattices, the Hessian RK4 stage, and the vorticity P2G/G2P.

#include <cmath>

#include "bit_physics/vpfm/vpfm.hpp"
#include "vpfm_detail.hpp"

namespace bit_physics::vpfm::detail {

namespace {

inline double wrap01(double x) {
    double w = x - std::floor(x);
    return (w >= 1.0) ? 0.0 : w;  // guard the x == -0.0 / FP-edge case
}

// Quadratic B-spline kernel value at signed offset r (grid units); support |r| < 1.5.
inline double qbspline(double r) {
    double a = std::fabs(r);
    if (a < 0.5) return 0.75 - r * r;
    if (a < 1.5) {
        double t = 1.5 - a;
        return 0.5 * t * t;
    }
    return 0.0;
}

inline uint32_t wrap_node(int v, uint32_t n) {
    int m = v % static_cast<int>(n);
    return static_cast<uint32_t>(m < 0 ? m + static_cast<int>(n) : m);
}

}  // namespace

void ParticleSystem::rebuild_bins(uint32_t n) {
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    bin_offsets.assign(ncell + 1, 0u);
    bin_particles.resize(count);
    // Counting sort by owning cell — sequential count + scatter (deterministic order).
    std::vector<uint32_t> cell_of(count);
    for (std::size_t p = 0; p < count; ++p) {
        uint32_t i = static_cast<uint32_t>(wrap01(pos[3 * p + 0]) * n);
        uint32_t j = static_cast<uint32_t>(wrap01(pos[3 * p + 1]) * n);
        uint32_t k = static_cast<uint32_t>(wrap01(pos[3 * p + 2]) * n);
        i = (i >= n) ? n - 1 : i;
        j = (j >= n) ? n - 1 : j;
        k = (k >= n) ? n - 1 : k;
        uint32_t c = static_cast<uint32_t>(cell_index(i, j, k, n));
        cell_of[p] = c;
        ++bin_offsets[c + 1];
    }
    for (std::size_t c = 0; c < ncell; ++c) bin_offsets[c + 1] += bin_offsets[c];
    std::vector<uint32_t> cursor(bin_offsets.begin(), bin_offsets.end() - 1);
    for (std::size_t p = 0; p < count; ++p)
        bin_particles[cursor[cell_of[p]]++] = static_cast<uint32_t>(p);
}

void ParticleSystem::compute_mapped_vorticity() {
    mapped_omega.resize(3 * count);
    mapped_grad_omega.resize(9 * count);
    parallel_for(count, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t p = lo; p < hi; ++p) {
            const double* FL = &jac_f_long[9 * p];
            const double* FS = &jac_f_short[9 * p];
            const double* TS = &jac_t_short[9 * p];
            const double* GF = &grad_jac_f[27 * p];
            const double* wa = &omega_a[3 * p];
            const double* wb = &omega_b[3 * p];
            const double* gb = &grad_omega_b[9 * p];
            // Eq. 12: ω_p = ℱ_long · ω_a (Cauchy stretching through the LONG map).
            double* mo = &mapped_omega[3 * p];
            for (int d = 0; d < 3; ++d)
                mo[d] = FL[d * 3 + 0] * wa[0] + FL[d * 3 + 1] * wa[1] +
                        FL[d * 3 + 2] * wa[2];
            // Eq. 13: ∇ω_p = ℱ_s·(∇ω)_b·𝒯_s + ∇ℱ·ω_b (SHORT segment; comp-major
            // [d*3+e] = ∂ω_d/∂x_e; (∇ℱ·ω)_{de} = Σ_m (∂F_dm/∂x_e)·ω_m).
            double* mg = &mapped_grad_omega[9 * p];
            for (int d = 0; d < 3; ++d)
                for (int e = 0; e < 3; ++e) {
                    double s = 0.0;
                    for (int r = 0; r < 3; ++r) {
                        double fg = FS[d * 3 + 0] * gb[0 * 3 + r] +
                                    FS[d * 3 + 1] * gb[1 * 3 + r] +
                                    FS[d * 3 + 2] * gb[2 * 3 + r];
                        s += fg * TS[r * 3 + e];
                    }
                    for (int m = 0; m < 3; ++m)
                        s += GF[(d * 3 + m) * 3 + e] * wb[m];
                    mg[d * 3 + e] = s;
                }
        }
    });
}

void redistribute_particles(ParticleSystem& ps, uint32_t n, uint32_t particles_per_cell,
                            uint64_t seed, uint64_t reinit_counter) {
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    ps.count = ncell * particles_per_cell;
    ps.pos.resize(3 * ps.count);
    ps.omega_a.resize(3 * ps.count);
    ps.omega_b.resize(3 * ps.count);
    ps.grad_omega_b.resize(9 * ps.count);
    ps.jac_f_long.resize(9 * ps.count);
    ps.jac_f_short.resize(9 * ps.count);
    ps.jac_t_short.resize(9 * ps.count);
    ps.grad_jac_f.resize(27 * ps.count);
    // 2×2×2 stratified sub-lattice (ppc = 8) + seeded hash jitter inside each stratum.
    const double h = 1.0 / static_cast<double>(n);
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            for (uint32_t s = 0; s < particles_per_cell; ++s) {
                std::size_t p = c * particles_per_cell + s;
                uint32_t sx = s & 1u, sy = (s >> 1) & 1u, sz = (s >> 2) & 1u;
                double jx = hash_unit(seed, c, s * 3 + 0, reinit_counter);
                double jy = hash_unit(seed, c, s * 3 + 1, reinit_counter);
                double jz = hash_unit(seed, c, s * 3 + 2, reinit_counter);
                ps.pos[3 * p + 0] = wrap01((i + 0.5 * (sx + jx)) * h);
                ps.pos[3 * p + 1] = wrap01((j + 0.5 * (sy + jy)) * h);
                ps.pos[3 * p + 2] = wrap01((k + 0.5 * (sz + jz)) * h);
            }
        }
    });
    ps.rebuild_bins(n);
}

void g2p_vorticity(const ParticleSystem& ps, const std::vector<double>& wx,
                   const std::vector<double>& wy, const std::vector<double>& wz,
                   uint32_t n, bool fill_omega_a, bool fill_omega_b,
                   bool fill_gradient) {
    ParticleSystem& mref = const_cast<ParticleSystem&>(ps);  // outputs only
    const double dn = static_cast<double>(n);
    const std::vector<double>* fam[3] = {&wx, &wy, &wz};
    parallel_for(ps.count, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t p = lo; p < hi; ++p) {
            double xyz[3] = {ps.pos[3 * p + 0], ps.pos[3 * p + 1], ps.pos[3 * p + 2]};
            double val[3], grad[9];
            for (int d = 0; d < 3; ++d) {
                // family-d node lattice: node coordinate x/h − edge_offset(d, axis)
                BSpline bs[3];
                for (int a = 0; a < 3; ++a)
                    bs[a] = bspline_quadratic(xyz[a] * dn - edge_offset(d, a));
                double acc = 0.0, gx = 0.0, gy = 0.0, gz = 0.0;
                for (int ck = 0; ck < 3; ++ck) {
                    uint32_t gk = wrap_node(bs[2].base + ck, n);
                    for (int cj = 0; cj < 3; ++cj) {
                        uint32_t gj = wrap_node(bs[1].base + cj, n);
                        double wyz = bs[1].w[cj] * bs[2].w[ck];
                        double dyz = bs[1].dw[cj] * bs[2].w[ck];
                        double wdz = bs[1].w[cj] * bs[2].dw[ck];
                        for (int ci = 0; ci < 3; ++ci) {
                            uint32_t gi = wrap_node(bs[0].base + ci, n);
                            double f = (*fam[d])[cell_index(gi, gj, gk, n)];
                            acc += bs[0].w[ci] * wyz * f;
                            gx += bs[0].dw[ci] * wyz * f;
                            gy += bs[0].w[ci] * dyz * f;
                            gz += bs[0].w[ci] * wdz * f;
                        }
                    }
                }
                val[d] = acc;
                grad[d * 3 + 0] = gx * dn;
                grad[d * 3 + 1] = gy * dn;
                grad[d * 3 + 2] = gz * dn;
            }
            if (fill_omega_a)
                for (int d = 0; d < 3; ++d) mref.omega_a[3 * p + d] = val[d];
            if (fill_omega_b)
                for (int d = 0; d < 3; ++d) mref.omega_b[3 * p + d] = val[d];
            if (fill_gradient)
                for (int q = 0; q < 9; ++q) mref.grad_omega_b[9 * p + q] = grad[q];
        }
    });
}

void p2g_vorticity(const ParticleSystem& ps, std::vector<double>& wx,
                   std::vector<double>& wy, std::vector<double>& wz, uint32_t n) {
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    std::vector<double> prev[3] = {wx, wy, wz};  // fallback source (guarded; ppc≥8)
    std::vector<double>* out[3] = {&wx, &wy, &wz};
    const double h = 1.0 / static_cast<double>(n);
    // Per-cell gather over the bin window [−1, 2]³ in fixed order (deterministic):
    // family-d nodes sit at +0.5/+1.0 offsets from the cell corner, so the union
    // window of all three families per axis is [c−1, c+2] (support 1.5 + offset 1.0).
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            // family-d node position in grid units
            double node[3][3];
            for (int d = 0; d < 3; ++d) {
                node[d][0] = i + edge_offset(d, 0);
                node[d][1] = j + edge_offset(d, 1);
                node[d][2] = k + edge_offset(d, 2);
            }
            double acc[3] = {0.0, 0.0, 0.0};
            double wsum[3] = {0.0, 0.0, 0.0};
            for (int dk = -1; dk <= 2; ++dk)
                for (int dj = -1; dj <= 2; ++dj)
                    for (int di = -1; di <= 2; ++di) {
                        std::size_t b = cell_index(wrap_node(static_cast<int>(i) + di, n),
                                                   wrap_node(static_cast<int>(j) + dj, n),
                                                   wrap_node(static_cast<int>(k) + dk, n),
                                                   n);
                        for (uint32_t s = ps.bin_offsets[b]; s < ps.bin_offsets[b + 1];
                             ++s) {
                            uint32_t p = ps.bin_particles[s];
                            // particle coords in grid units, min-imaged about the cell
                            double g[3];
                            for (int a = 0; a < 3; ++a) {
                                double r = ps.pos[3 * p + a] / h - (node[0][a]);
                                // min-image about family-0's node; offsets between
                                // families are ≤ 0.5 so one wrap serves all three
                                r -= std::nearbyint(r / n) * n;
                                g[a] = r + node[0][a];  // absolute, wrap-adjusted
                            }
                            const double* mo = &ps.mapped_omega[3 * p];
                            const double* mg = &ps.mapped_grad_omega[9 * p];
                            for (int d = 0; d < 3; ++d) {
                                double rx = g[0] - node[d][0];
                                double ry = g[1] - node[d][1];
                                double rz = g[2] - node[d][2];
                                if (std::fabs(rx) >= 1.5 || std::fabs(ry) >= 1.5 ||
                                    std::fabs(rz) >= 1.5)
                                    continue;
                                double w = qbspline(rx) * qbspline(ry) * qbspline(rz);
                                if (w == 0.0) continue;
                                // APIC slope: ω_d(p) + ∇ω_d·(x_node − x_p)
                                double slope = mg[d * 3 + 0] * (-rx * h) +
                                               mg[d * 3 + 1] * (-ry * h) +
                                               mg[d * 3 + 2] * (-rz * h);
                                acc[d] += w * (mo[d] + slope);
                                wsum[d] += w;
                            }
                        }
                    }
            for (int d = 0; d < 3; ++d)
                (*out[d])[c] = (wsum[d] > 0.0) ? acc[d] / wsum[d] : prev[d][c];
        }
    });
}

void sample_mac_velocity_gradient_hessian(const std::vector<double>& ux,
                                          const std::vector<double>& uy,
                                          const std::vector<double>& uz, uint32_t n,
                                          double x, double y, double z, double* u_out,
                                          double* grad_out, double* hess_out) {
    // Face-node lattices (+axis-owner convention, U-4 verbatim): the x-face owned by
    // cell (i,j,k) sits at ((i+1)h, (j+0.5)h, (k+0.5)h). Second derivatives use the
    // constant {1,−2,1}/h² stencil (detail header note); mixed partials chain two
    // first-derivative weight rows. One stencil walk per component.
    const double dn = static_cast<double>(n);
    static constexpr double d2w[3] = {1.0, -2.0, 1.0};
    const std::vector<double>* fields[3] = {&ux, &uy, &uz};
    for (int comp = 0; comp < 3; ++comp) {
        double cx = x * dn, cy = y * dn, cz = z * dn;
        BSpline bx = (comp == 0) ? bspline_quadratic(cx - 1.0) : bspline_quadratic(cx - 0.5);
        BSpline by = (comp == 1) ? bspline_quadratic(cy - 1.0) : bspline_quadratic(cy - 0.5);
        BSpline bz = (comp == 2) ? bspline_quadratic(cz - 1.0) : bspline_quadratic(cz - 0.5);
        double acc = 0.0, gx = 0.0, gy = 0.0, gz = 0.0;
        double hxx = 0.0, hyy = 0.0, hzz = 0.0, hxy = 0.0, hxz = 0.0, hyz = 0.0;
        for (int ck = 0; ck < 3; ++ck) {
            uint32_t gk = wrap_node(bz.base + ck, n);
            for (int cj = 0; cj < 3; ++cj) {
                uint32_t gj = wrap_node(by.base + cj, n);
                for (int ci = 0; ci < 3; ++ci) {
                    uint32_t gi = wrap_node(bx.base + ci, n);
                    double f = (*fields[comp])[cell_index(gi, gj, gk, n)];
                    double wx = bx.w[ci], wy = by.w[cj], wz = bz.w[ck];
                    double dx_ = bx.dw[ci], dy_ = by.dw[cj], dz_ = bz.dw[ck];
                    acc += wx * wy * wz * f;
                    gx += dx_ * wy * wz * f;
                    gy += wx * dy_ * wz * f;
                    gz += wx * wy * dz_ * f;
                    if (hess_out) {
                        hxx += d2w[ci] * wy * wz * f;
                        hyy += wx * d2w[cj] * wz * f;
                        hzz += wx * wy * d2w[ck] * f;
                        hxy += dx_ * dy_ * wz * f;
                        hxz += dx_ * wy * dz_ * f;
                        hyz += wx * dy_ * dz_ * f;
                    }
                }
            }
        }
        u_out[comp] = acc;
        grad_out[comp * 3 + 0] = gx * dn;
        grad_out[comp * 3 + 1] = gy * dn;
        grad_out[comp * 3 + 2] = gz * dn;
        if (hess_out) {
            hess_out[comp * 6 + 0] = hxx * dn * dn;  // xx
            hess_out[comp * 6 + 1] = hyy * dn * dn;  // yy
            hess_out[comp * 6 + 2] = hzz * dn * dn;  // zz
            hess_out[comp * 6 + 3] = hxy * dn * dn;  // xy
            hess_out[comp * 6 + 4] = hxz * dn * dn;  // xz
            hess_out[comp * 6 + 5] = hyz * dn * dn;  // yz
        }
    }
}

namespace {

// (∇∇u)_ikl lookup from the packed symmetric layout [i*6 + sym].
inline double hess_at(const double* H, int i, int k, int l) {
    static constexpr int sym[3][3] = {{0, 3, 4}, {3, 1, 5}, {4, 5, 2}};
    return H[i * 6 + sym[k][l]];
}

}  // namespace

void advect_particles_rk4(ParticleSystem& ps, const std::vector<double>& ux,
                          const std::vector<double>& uy, const std::vector<double>& uz,
                          uint32_t n, double dt) {
    parallel_for(ps.count, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t p = lo; p < hi; ++p) {
            double x0 = ps.pos[3 * p + 0], y0 = ps.pos[3 * p + 1], z0 = ps.pos[3 * p + 2];
            double FL0[9], FS0[9], TS0[9], GF0[27];
            for (int q = 0; q < 9; ++q) FL0[q] = ps.jac_f_long[9 * p + q];
            for (int q = 0; q < 9; ++q) FS0[q] = ps.jac_f_short[9 * p + q];
            for (int q = 0; q < 9; ++q) TS0[q] = ps.jac_t_short[9 * p + q];
            for (int q = 0; q < 27; ++q) GF0[q] = ps.grad_jac_f[27 * p + q];

            // RK4 on dx/dt = u, Dℱ/Dt = ∇u·ℱ (long+short), D𝒯/Dt = −𝒯·∇u, and the
            // Eq.-14 Hessian system (frozen field; derivation in vpfm_detail.hpp).
            double kx[4], ky[4], kz[4];
            double kFL[4][9], kFS[4][9], kTS[4][9], kGF[4][27];
            double xs = x0, ys = y0, zs = z0;
            double FLs[9], FSs[9], TSs[9], GFs[27];
            for (int q = 0; q < 9; ++q) FLs[q] = FL0[q];
            for (int q = 0; q < 9; ++q) FSs[q] = FS0[q];
            for (int q = 0; q < 9; ++q) TSs[q] = TS0[q];
            for (int q = 0; q < 27; ++q) GFs[q] = GF0[q];
            const double stage_dt[4] = {0.0, 0.5 * dt, 0.5 * dt, dt};
            for (int st = 0; st < 4; ++st) {
                if (st > 0) {
                    xs = x0 + stage_dt[st] * kx[st - 1];
                    ys = y0 + stage_dt[st] * ky[st - 1];
                    zs = z0 + stage_dt[st] * kz[st - 1];
                    for (int q = 0; q < 9; ++q) FLs[q] = FL0[q] + stage_dt[st] * kFL[st - 1][q];
                    for (int q = 0; q < 9; ++q) FSs[q] = FS0[q] + stage_dt[st] * kFS[st - 1][q];
                    for (int q = 0; q < 9; ++q) TSs[q] = TS0[q] + stage_dt[st] * kTS[st - 1][q];
                    for (int q = 0; q < 27; ++q) GFs[q] = GF0[q] + stage_dt[st] * kGF[st - 1][q];
                }
                double u[3], G[9], H[18];
                sample_mac_velocity_gradient_hessian(ux, uy, uz, n, wrap01(xs),
                                                     wrap01(ys), wrap01(zs), u, G, H);
                kx[st] = u[0];
                ky[st] = u[1];
                kz[st] = u[2];
                for (int r = 0; r < 3; ++r)
                    for (int c2 = 0; c2 < 3; ++c2) {
                        double sl = 0.0, ss = 0.0, st2 = 0.0;
                        for (int e = 0; e < 3; ++e) {
                            sl += G[r * 3 + e] * FLs[e * 3 + c2];   // (∇u·ℱ_long)
                            ss += G[r * 3 + e] * FSs[e * 3 + c2];   // (∇u·ℱ_short)
                            st2 += TSs[r * 3 + e] * G[e * 3 + c2];  // (𝒯·∇u)
                        }
                        kFL[st][r * 3 + c2] = sl;
                        kFS[st][r * 3 + c2] = ss;
                        kTS[st][r * 3 + c2] = -st2;
                    }
                // Eq. 14: d(∇F)_ijl = (∇∇u)_ikl F_kj + (∇u)_ik (∇F)_kjl − (∇F)_ijm (∇u)_ml
                for (int i2 = 0; i2 < 3; ++i2)
                    for (int j2 = 0; j2 < 3; ++j2)
                        for (int l2 = 0; l2 < 3; ++l2) {
                            double s = 0.0;
                            for (int m = 0; m < 3; ++m) {
                                s += hess_at(H, i2, m, l2) * FSs[m * 3 + j2];
                                s += G[i2 * 3 + m] * GFs[(m * 3 + j2) * 3 + l2];
                                s -= GFs[(i2 * 3 + j2) * 3 + m] * G[m * 3 + l2];
                            }
                            kGF[st][(i2 * 3 + j2) * 3 + l2] = s;
                        }
            }
            ps.pos[3 * p + 0] = wrap01(x0 + (dt / 6.0) * (kx[0] + 2.0 * kx[1] + 2.0 * kx[2] + kx[3]));
            ps.pos[3 * p + 1] = wrap01(y0 + (dt / 6.0) * (ky[0] + 2.0 * ky[1] + 2.0 * ky[2] + ky[3]));
            ps.pos[3 * p + 2] = wrap01(z0 + (dt / 6.0) * (kz[0] + 2.0 * kz[1] + 2.0 * kz[2] + kz[3]));
            for (int q = 0; q < 9; ++q) {
                ps.jac_f_long[9 * p + q] =
                    FL0[q] + (dt / 6.0) * (kFL[0][q] + 2.0 * kFL[1][q] + 2.0 * kFL[2][q] + kFL[3][q]);
                ps.jac_f_short[9 * p + q] =
                    FS0[q] + (dt / 6.0) * (kFS[0][q] + 2.0 * kFS[1][q] + 2.0 * kFS[2][q] + kFS[3][q]);
                ps.jac_t_short[9 * p + q] =
                    TS0[q] + (dt / 6.0) * (kTS[0][q] + 2.0 * kTS[1][q] + 2.0 * kTS[2][q] + kTS[3][q]);
            }
            for (int q = 0; q < 27; ++q)
                ps.grad_jac_f[27 * p + q] =
                    GF0[q] + (dt / 6.0) * (kGF[0][q] + 2.0 * kGF[1][q] + 2.0 * kGF[2][q] + kGF[3][q]);
        }
    });
}

void advect_probes_rk4(std::vector<double>& pos, std::vector<double>& jac_f,
                       std::size_t count, const std::vector<double>& ux,
                       const std::vector<double>& uy, const std::vector<double>& uz,
                       uint32_t n, double dt) {
    parallel_for(count, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t p = lo; p < hi; ++p) {
            double x0 = pos[3 * p + 0], y0 = pos[3 * p + 1], z0 = pos[3 * p + 2];
            double F0[9];
            for (int q = 0; q < 9; ++q) F0[q] = jac_f[9 * p + q];
            double kx[4], ky[4], kz[4], kF[4][9];
            double xs = x0, ys = y0, zs = z0;
            double Fs[9];
            for (int q = 0; q < 9; ++q) Fs[q] = F0[q];
            const double stage_dt[4] = {0.0, 0.5 * dt, 0.5 * dt, dt};
            for (int st = 0; st < 4; ++st) {
                if (st > 0) {
                    xs = x0 + stage_dt[st] * kx[st - 1];
                    ys = y0 + stage_dt[st] * ky[st - 1];
                    zs = z0 + stage_dt[st] * kz[st - 1];
                    for (int q = 0; q < 9; ++q) Fs[q] = F0[q] + stage_dt[st] * kF[st - 1][q];
                }
                double u[3], G[9];
                sample_mac_velocity_gradient_hessian(ux, uy, uz, n, wrap01(xs),
                                                     wrap01(ys), wrap01(zs), u, G,
                                                     nullptr);
                kx[st] = u[0];
                ky[st] = u[1];
                kz[st] = u[2];
                for (int r = 0; r < 3; ++r)
                    for (int c2 = 0; c2 < 3; ++c2) {
                        double s = 0.0;
                        for (int e = 0; e < 3; ++e) s += G[r * 3 + e] * Fs[e * 3 + c2];
                        kF[st][r * 3 + c2] = s;
                    }
            }
            pos[3 * p + 0] = wrap01(x0 + (dt / 6.0) * (kx[0] + 2.0 * kx[1] + 2.0 * kx[2] + kx[3]));
            pos[3 * p + 1] = wrap01(y0 + (dt / 6.0) * (ky[0] + 2.0 * ky[1] + 2.0 * ky[2] + ky[3]));
            pos[3 * p + 2] = wrap01(z0 + (dt / 6.0) * (kz[0] + 2.0 * kz[1] + 2.0 * kz[2] + kz[3]));
            for (int q = 0; q < 9; ++q)
                jac_f[9 * p + q] =
                    F0[q] + (dt / 6.0) * (kF[0][q] + 2.0 * kF[1][q] + 2.0 * kF[2][q] + kF[3][q]);
        }
    });
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
    // Parent op-order port (stable_fluids.py semi_lagrangian_advect_3d): backtrace the
    // cell centre in the collocated velocity, periodic trilinear sample.
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
            // periodic trilinear at (x,y,z) on the cell-centred lattice
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

}  // namespace bit_physics::vpfm::detail

// C-1 U-4 stage 1b-ii — particle flow-map transport (the PFM substrate; paper
// Eqs. 3/6/18/24/25, Alg. 3). Gather-only transfers, fixed-order sequential binning,
// no atomics (spec § 6 determinism posture; rules in clebsch_pfm_detail.hpp).

#include <cmath>

#include "bit_physics/clebsch_pfm/clebsch_pfm.hpp"
#include "clebsch_pfm_detail.hpp"

namespace bit_physics::clebsch_pfm::detail {

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

// Cell-centred scalar-lattice coordinates: node i sits at (i + 0.5) * h, so the
// node-lattice coordinate of position x is x/h - 0.5.
inline BSpline axis_spline_centre(double x, uint32_t n) {
    return bspline_quadratic(x * static_cast<double>(n) - 0.5);
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

void ParticleSystem::compute_mapped_gradients() {
    mapped_grad.resize(12 * count);
    parallel_for(count, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t p = lo; p < hi; ++p) {
            const double* T = &jac_t[9 * p];
            const double* g = &grad_phi[12 * p];
            double* m = &mapped_grad[12 * p];
            for (int d = 0; d < 3; ++d)
                for (int q = 0; q < 4; ++q)
                    m[d * 4 + q] = T[0 * 3 + d] * g[0 + q] + T[1 * 3 + d] * g[4 + q] +
                                   T[2 * 3 + d] * g[8 + q];
        }
    });
}

void redistribute_particles(ParticleSystem& ps, uint32_t n, uint32_t particles_per_cell,
                            uint64_t seed, uint64_t reinit_counter) {
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    ps.count = ncell * particles_per_cell;
    ps.pos.resize(3 * ps.count);
    ps.phi_s.resize(4 * ps.count);
    ps.grad_phi.resize(12 * ps.count);
    ps.jac_t.resize(9 * ps.count);
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

void g2p_spinor(const ParticleSystem& ps, const std::vector<double>& phi_g, uint32_t n,
                bool fill_value, bool fill_gradient) {
    ParticleSystem& mref = const_cast<ParticleSystem&>(ps);  // outputs only
    const double dn = static_cast<double>(n);
    parallel_for(ps.count, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t p = lo; p < hi; ++p) {
            double x = ps.pos[3 * p + 0], y = ps.pos[3 * p + 1], z = ps.pos[3 * p + 2];
            BSpline bx = axis_spline_centre(x, n);
            BSpline by = axis_spline_centre(y, n);
            BSpline bz = axis_spline_centre(z, n);
            double val[4] = {0, 0, 0, 0};
            double grad[12] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
            for (int ck = 0; ck < 3; ++ck)
                for (int cj = 0; cj < 3; ++cj)
                    for (int ci = 0; ci < 3; ++ci) {
                        uint32_t gi = wrap_node(bx.base + ci, n);
                        uint32_t gj = wrap_node(by.base + cj, n);
                        uint32_t gk = wrap_node(bz.base + ck, n);
                        std::size_t g = cell_index(gi, gj, gk, n);
                        double w = bx.w[ci] * by.w[cj] * bz.w[ck];
                        double wx = bx.dw[ci] * by.w[cj] * bz.w[ck] * dn;
                        double wy = bx.w[ci] * by.dw[cj] * bz.w[ck] * dn;
                        double wz = bx.w[ci] * by.w[cj] * bz.dw[ck] * dn;
                        for (int q = 0; q < 4; ++q) {
                            double pg = phi_g[4 * g + q];
                            val[q] += w * pg;
                            grad[0 + q] += wx * pg;   // d/dx of component q
                            grad[4 + q] += wy * pg;   // d/dy
                            grad[8 + q] += wz * pg;   // d/dz
                        }
                    }
            if (fill_value)
                for (int q = 0; q < 4; ++q) mref.phi_s[4 * p + q] = val[q];
            if (fill_gradient)
                for (int q = 0; q < 12; ++q) mref.grad_phi[12 * p + q] = grad[q];
        }
    });
}

void p2g_spinor(const ParticleSystem& ps, std::vector<double>& phi_g, uint32_t n) {
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    phi_g.assign(4 * ncell, 0.0);
    const double h = 1.0 / static_cast<double>(n);
    // Per-cell gather over the 3³ neighbouring bins in fixed order (deterministic).
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            double xg = (i + 0.5) * h, yg = (j + 0.5) * h, zg = (k + 0.5) * h;
            double acc[4] = {0, 0, 0, 0};
            double wsum = 0.0;
            for (int dk = -1; dk <= 1; ++dk)
                for (int dj = -1; dj <= 1; ++dj)
                    for (int di = -1; di <= 1; ++di) {
                        uint32_t bi = wrap_node(static_cast<int>(i) + di, n);
                        uint32_t bj = wrap_node(static_cast<int>(j) + dj, n);
                        uint32_t bk = wrap_node(static_cast<int>(k) + dk, n);
                        std::size_t b = cell_index(bi, bj, bk, n);
                        for (uint32_t s = ps.bin_offsets[b]; s < ps.bin_offsets[b + 1];
                             ++s) {
                            uint32_t p = ps.bin_particles[s];
                            // minimum-image periodic offsets (grid units)
                            double rx = (xg - ps.pos[3 * p + 0]) / h;
                            double ry = (yg - ps.pos[3 * p + 1]) / h;
                            double rz = (zg - ps.pos[3 * p + 2]) / h;
                            rx -= std::nearbyint(rx / n) * n;
                            ry -= std::nearbyint(ry / n) * n;
                            rz -= std::nearbyint(rz / n) * n;
                            if (std::fabs(rx) >= 1.5 || std::fabs(ry) >= 1.5 ||
                                std::fabs(rz) >= 1.5)
                                continue;
                            double w = qbspline(rx) * qbspline(ry) * qbspline(rz);
                            if (w == 0.0) continue;
                            // mapped spinor: Φ_p = Φ_{p,s} (0-form, carried);
                            // APIC slope: Φ_p + (∇Φ)_p·(x_g − x_p), (∇Φ)_p precomputed
                            // per step (Eq. 18; compute_mapped_gradients).
                            const double* m = &ps.mapped_grad[12 * p];
                            double dxv[3] = {rx * h, ry * h, rz * h};
                            for (int q = 0; q < 4; ++q) {
                                double gq = m[0 + q] * dxv[0] + m[4 + q] * dxv[1] +
                                            m[8 + q] * dxv[2];
                                acc[q] += w * (ps.phi_s[4 * p + q] + gq);
                            }
                            wsum += w;
                        }
                    }
            double inv = (wsum > 0.0) ? 1.0 / wsum : 0.0;
            for (int q = 0; q < 4; ++q) phi_g[4 * c + q] = acc[q] * inv;
        }
    });
}

void p2g_face_samples(const ParticleSystem& ps, const std::vector<double>& phi_g,
                      uint32_t n, std::vector<double>& out_a,
                      std::vector<double>& out_b) {
    // Eq.-23 enhanced-conversion samples for ALL +axis-owner faces of every cell:
    // sample pair = face ∓ dx_s/2 with dx_s = dx/2, i.e. per-axis grid coordinates
    // {c+0.75, c+1.25} on the face axis and c+0.5 on the others. One gather over the
    // per-cell union window serves all 6 points; per-axis spline values are shared.
    // Window per axis (support |g − coord| < 1.5, bin span [b, b+1)):
    // b > (c+0.5) − 2.5 and b < (c+1.25) + 1.5  ⇒  b ∈ [c−1, c+2]  (4 bins).
    const std::size_t ncell = static_cast<std::size_t>(n) * n * n;
    out_a.assign(4 * 3 * ncell, 0.0);
    out_b.assign(4 * 3 * ncell, 0.0);
    const double h = 1.0 / static_cast<double>(n);
    parallel_for(ncell, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t c = lo; c < hi; ++c) {
            uint32_t i = static_cast<uint32_t>(c % n);
            uint32_t j = static_cast<uint32_t>((c / n) % n);
            uint32_t k = static_cast<uint32_t>(c / (static_cast<std::size_t>(n) * n));
            const double base[3] = {(i + 0.5), (j + 0.5), (k + 0.5)};  // grid units
            double acc[6][4] = {};
            double wsum[6] = {};
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
                            // particle offset from the cell centre (grid units,
                            // min-imaged once per axis)
                            double g[3];
                            for (int d = 0; d < 3; ++d) {
                                double r = ps.pos[3 * p + d] / h - base[d];
                                r -= std::nearbyint(r / n) * n;
                                g[d] = r;  // particle coord relative to centre
                            }
                            // per-axis spline values at the three sample coords
                            // (centre, face−dx/4 = +0.25, face+dx/4 = +0.75)
                            double q0[3], q1[3], q2[3];
                            for (int d = 0; d < 3; ++d) {
                                q0[d] = qbspline(g[d]);          // coord c+0.5
                                q1[d] = qbspline(g[d] - 0.25);   // coord c+0.75
                                q2[d] = qbspline(g[d] - 0.75);   // coord c+1.25
                            }
                            const double w6[6] = {
                                q1[0] * q0[1] * q0[2],  // x-face sample a
                                q2[0] * q0[1] * q0[2],  // x-face sample b
                                q0[0] * q1[1] * q0[2],  // y-face sample a
                                q0[0] * q2[1] * q0[2],  // y-face sample b
                                q0[0] * q0[1] * q1[2],  // z-face sample a
                                q0[0] * q0[1] * q2[2],  // z-face sample b
                            };
                            // sample coords relative to the centre, per point
                            static constexpr double off[6][3] = {
                                {0.25, 0.0, 0.0}, {0.75, 0.0, 0.0}, {0.0, 0.25, 0.0},
                                {0.0, 0.75, 0.0}, {0.0, 0.0, 0.25}, {0.0, 0.0, 0.75}};
                            const double* m = &ps.mapped_grad[12 * p];
                            const double* phs = &ps.phi_s[4 * p];
                            for (int t = 0; t < 6; ++t) {
                                double w = w6[t];
                                if (w == 0.0) continue;
                                double dxv[3] = {(off[t][0] - g[0]) * h,
                                                 (off[t][1] - g[1]) * h,
                                                 (off[t][2] - g[2]) * h};
                                for (int q = 0; q < 4; ++q) {
                                    double gq = m[0 + q] * dxv[0] + m[4 + q] * dxv[1] +
                                                m[8 + q] * dxv[2];
                                    acc[t][q] += w * (phs[q] + gq);
                                }
                                wsum[t] += w;
                            }
                        }
                    }
            for (int axis = 0; axis < 3; ++axis) {
                std::size_t item = static_cast<std::size_t>(axis) * ncell + c;
                for (int half = 0; half < 2; ++half) {
                    int t = 2 * axis + half;
                    double* out = half == 0 ? &out_a[4 * item] : &out_b[4 * item];
                    if (wsum[t] > 0.0) {
                        double inv = 1.0 / wsum[t];
                        for (int q = 0; q < 4; ++q) out[q] = acc[t][q] * inv;
                    } else {
                        // no particle in range (cannot occur at ppc≥8; guarded):
                        // fall back to the owning grid cell's value
                        for (int q = 0; q < 4; ++q) out[q] = phi_g[4 * c + q];
                    }
                }
            }
        }
    });
}

void sample_mac_velocity_and_gradient(const std::vector<double>& ux,
                                      const std::vector<double>& uy,
                                      const std::vector<double>& uz, uint32_t n,
                                      double x, double y, double z, double* u_out,
                                      double* grad_out) {
    // Face-node lattices (+axis-owner convention): the x-face owned by cell (i,j,k)
    // sits at ((i+1)h, (j+0.5)h, (k+0.5)h) — node coordinate x/h − 1 along x and
    // cell-centred (x/h − 0.5) along y/z; analogous for y/z components. One stencil
    // walk per component accumulates the value and all three gradient sums.
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
                double wyz = by.w[cj] * bz.w[ck];
                double dyz = by.dw[cj] * bz.w[ck];
                double wdz = by.w[cj] * bz.dw[ck];
                for (int ci = 0; ci < 3; ++ci) {
                    uint32_t gi = wrap_node(bx.base + ci, n);
                    double f = (*fields[comp])[cell_index(gi, gj, gk, n)];
                    acc += bx.w[ci] * wyz * f;
                    gx += bx.dw[ci] * wyz * f;
                    gy += bx.w[ci] * dyz * f;
                    gz += bx.w[ci] * wdz * f;
                }
            }
        }
        u_out[comp] = acc;
        grad_out[comp * 3 + 0] = gx * dn;
        grad_out[comp * 3 + 1] = gy * dn;
        grad_out[comp * 3 + 2] = gz * dn;
    }
}

void advect_particles_rk4(ParticleSystem& ps, const std::vector<double>& ux,
                          const std::vector<double>& uy, const std::vector<double>& uz,
                          uint32_t n, double dt, bool track_forward) {
    parallel_for(ps.count, [&](std::size_t lo, std::size_t hi) {
        for (std::size_t p = lo; p < hi; ++p) {
            double x0 = ps.pos[3 * p + 0], y0 = ps.pos[3 * p + 1], z0 = ps.pos[3 * p + 2];
            double T0[9], F0[9];
            for (int q = 0; q < 9; ++q) T0[q] = ps.jac_t[9 * p + q];
            if (track_forward)
                for (int q = 0; q < 9; ++q) F0[q] = ps.jac_f[9 * p + q];

            // RK4 on dx/dt = u(x), dT̃/dt = −T̃∇u(x), dF̃/dt = ∇u(x)F̃ (frozen field).
            double kx[4], ky[4], kz[4], kT[4][9], kF[4][9];
            double xs = x0, ys = y0, zs = z0;
            double Ts[9], Fs[9];
            for (int q = 0; q < 9; ++q) Ts[q] = T0[q];
            if (track_forward)
                for (int q = 0; q < 9; ++q) Fs[q] = F0[q];
            const double stage_dt[4] = {0.0, 0.5 * dt, 0.5 * dt, dt};
            for (int st = 0; st < 4; ++st) {
                if (st > 0) {
                    xs = x0 + stage_dt[st] * kx[st - 1];
                    ys = y0 + stage_dt[st] * ky[st - 1];
                    zs = z0 + stage_dt[st] * kz[st - 1];
                    for (int q = 0; q < 9; ++q) Ts[q] = T0[q] + stage_dt[st] * kT[st - 1][q];
                    if (track_forward)
                        for (int q = 0; q < 9; ++q)
                            Fs[q] = F0[q] + stage_dt[st] * kF[st - 1][q];
                }
                double u[3], G[9];
                sample_mac_velocity_and_gradient(ux, uy, uz, n, wrap01(xs), wrap01(ys),
                                                 wrap01(zs), u, G);
                kx[st] = u[0];
                ky[st] = u[1];
                kz[st] = u[2];
                // (−T̃∇u)_{rc} = −Σ_e T̃_{re} G_{ec}
                for (int r = 0; r < 3; ++r)
                    for (int c2 = 0; c2 < 3; ++c2) {
                        double s = 0.0;
                        for (int e = 0; e < 3; ++e) s += Ts[r * 3 + e] * G[e * 3 + c2];
                        kT[st][r * 3 + c2] = -s;
                    }
                if (track_forward)
                    for (int r = 0; r < 3; ++r)
                        for (int c2 = 0; c2 < 3; ++c2) {
                            double s = 0.0;
                            for (int e = 0; e < 3; ++e) s += G[r * 3 + e] * Fs[e * 3 + c2];
                            kF[st][r * 3 + c2] = s;
                        }
            }
            ps.pos[3 * p + 0] = wrap01(x0 + (dt / 6.0) * (kx[0] + 2.0 * kx[1] + 2.0 * kx[2] + kx[3]));
            ps.pos[3 * p + 1] = wrap01(y0 + (dt / 6.0) * (ky[0] + 2.0 * ky[1] + 2.0 * ky[2] + ky[3]));
            ps.pos[3 * p + 2] = wrap01(z0 + (dt / 6.0) * (kz[0] + 2.0 * kz[1] + 2.0 * kz[2] + kz[3]));
            for (int q = 0; q < 9; ++q)
                ps.jac_t[9 * p + q] =
                    T0[q] + (dt / 6.0) * (kT[0][q] + 2.0 * kT[1][q] + 2.0 * kT[2][q] + kT[3][q]);
            if (track_forward)
                for (int q = 0; q < 9; ++q)
                    ps.jac_f[9 * p + q] =
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

}  // namespace bit_physics::clebsch_pfm::detail

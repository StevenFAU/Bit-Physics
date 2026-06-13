// C-1 U-5 internal surfaces (src-private) — host math, particle transport, grids.
// Substrate copy-adapted from the U-4 clebsch-pfm package (probe § 2: copy-adapt
// within the new package; promotion to common/ is a cluster-close candidate).
//
// Derivation notes (hand-derived; spec § 2 records these as the independent
// hand-derivation anchor):
//
// Vorticity closed forms (ω = ∇×u, k = 2π):
//   3D parent TG  u = (sin·cos·cos, −cos·sin·cos, 0)  (sim.py:181-212 argument order
//   kx, ky, kz):
//     ω_x = ∂w/∂y − ∂v/∂z = −k·cos(kx)·sin(ky)·sin(kz)
//     ω_y = ∂u/∂z − ∂w/∂x = −k·sin(kx)·cos(ky)·sin(kz)
//     ω_z = ∂v/∂x − ∂u/∂y =  2k·sin(kx)·sin(ky)·cos(kz)
//   2D-z-invariant TG  u = (sin2πx·cos2πy, −cos2πx·sin2πy, 0):
//     ω = (0, 0, 2k·sin(kx)·sin(ky)).
//   (NOTE: probe § 4.1 wrote the 2D ω_z with cos·cos — a transcription slip; the
//   sin·sin form here is the derivative-checked closed form, FD-verified in the A1
//   suite. The U-4 spec § 2 carries the same sin·sin form.)
//
// Flow-map Hessian evolution (paper Eq. 14, re-derived): with DF_ij/Dt = (∇u)_ik F_kj
// and the commutator D/Dt(∂_l φ) = ∂_l(Dφ/Dt) − (∂_l u_m)(∂_m φ),
//   D(∂_l F_ij)/Dt = (∇∇u)_ikl F_kj + (∇u)_ik (∇F)_kjl − (∇F)_ijm (∇u)_ml
// where (∇F)_ijl = ∂F_ij/∂x_l (CURRENT-position gradient) and
// (∇∇u)_ikl = ∂²u_i/∂x_k∂x_l (symmetric in k,l). Matches the paper's index form
// (their (∇∇u)_ilk ℱ_kj term equals ours by that symmetry).
//
// Hessian-vs-FD probe identity (A2 test mode): ±ε clones perturbed at the short-map
// start b measure ∇_ψF (gradient w.r.t. the position AT b); the evolved quantity is
// ∇_xF (current position). They relate through the backward Jacobian of the same
// segment: ∂F_ij/∂x_l = (∂F_ij/∂ψ_m)·T_ml — the test asserts
// ‖∇F_evolved − FD·T‖ bounded (both sides RK4-exact in the same frozen fields).
//
// Quadratic B-spline second derivative: w'' over the three support nodes is the
// CONSTANT stencil {1, −2, 1} (units 1/h²) — each piece of the quadratic has
// curvature ±2 halved at the outer nodes; used for the ∇∇u sampling in Eq. 14.
//
// Determinism rules used throughout (spec § 6 posture, U-4 verbatim): parallel loops
// only over independent output slots (per-particle / per-cell / per-edge);
// order-sensitive passes (binning scatter, global reductions) run sequentially; no
// atomics.

#pragma once

#include <array>
#include <cstdint>
#include <functional>
#include <vector>

namespace bit_physics::vpfm::detail {

// --- deterministic parallel-for (independent output slots only) -------------------
void parallel_for(std::size_t count, const std::function<void(std::size_t, std::size_t)>& chunk_fn);

// --- splitmix64 (seeded particle jitter; deterministic) ---------------------------
inline uint64_t splitmix64(uint64_t x) {
    x += 0x9e3779b97f4a7c15ull;
    x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ull;
    x = (x ^ (x >> 27)) * 0x94d049bb133111ebull;
    return x ^ (x >> 31);
}
// Uniform double in [0,1) from a hash stream.
inline double hash_unit(uint64_t seed, uint64_t a, uint64_t b, uint64_t c) {
    uint64_t h = splitmix64(splitmix64(splitmix64(seed ^ a) ^ b) ^ c);
    return static_cast<double>(h >> 11) * 0x1.0p-53;
}

// --- quadratic B-spline (support 1.5; nodes per axis: base..base+2) ----------------
// w(r): r = x/h - node; weights for the 3 nodes nearest to x. Returns base node index
// and the 3 per-axis weights + d/dx weights (units 1/h). Second-derivative weights
// are the constant {1, −2, 1} stencil (units 1/h²; derivation above).
struct BSpline {
    int base;                 // first node index (may be negative; wrap at use site)
    std::array<double, 3> w;
    std::array<double, 3> dw; // derivative wrt x (already / h)
};
BSpline bspline_quadratic(double x_over_h);  // x in grid units relative to node lattice

// --- multigrid Poisson (periodic, 7-point, f64, fixed cycles) ---------------------
// Solves lap(p) = rhs on an n³ periodic lattice with spacing h (any uniform lattice
// offset — edge families included; periodicity is offset-blind). Fixed V(2,2) cycles,
// colour-parallel RB-GS, full-weighting restriction, trilinear prolongation,
// fixed-sweep coarsest solve. Deterministic for any thread count. Returns the final
// max-abs residual (MEASURED; recorded by the caller).
double poisson_periodic_mg(std::vector<double>& p, const std::vector<double>& rhs,
                           uint32_t n, double h, uint32_t vcycles);

// --- grid helpers -------------------------------------------------------------------
inline std::size_t cell_index(uint32_t i, uint32_t j, uint32_t k, uint32_t n) {
    return (static_cast<std::size_t>(k) * n + j) * n + i;
}

// Edge-lattice node offsets in grid units (+owner convention; curl shader header):
//   family 0 (ωx/Ψx): node at (i+0.5, j+1, k+1)
//   family 1 (ωy/Ψy): node at (i+1, j+0.5, k+1)
//   family 2 (ωz/Ψz): node at (i+1, j+1, k+0.5)
// edge_offset(d, axis) = the node coordinate of cell (0,0,0)'s family-d edge.
inline double edge_offset(int family, int axis) {
    return (family == axis) ? 0.5 : 1.0;
}

// --- particle system (SoA; gather-only transfers; sequential binning) --------------
struct ParticleSystem {
    std::size_t count = 0;
    std::vector<double> pos;          // 3 per particle
    std::vector<double> omega_a;      // 3: carried vorticity at the LONG-map start a
                                      // (Cauchy formula payload; NEVER evolved)
    std::vector<double> omega_b;      // 3: vorticity frozen at the SHORT-map start b
                                      // (= F_long·ω_a at time b; Eq.-13 payload)
    std::vector<double> grad_omega_b; // 9: (∇ω)_b, comp-major [d*3+e] = ∂ω_d/∂x_e
    std::vector<double> jac_f_long;   // 9: ℱ_{[a,c]} (Cauchy stretching)
    std::vector<double> jac_f_short;  // 9: ℱ_{[b,c]} (Eq.-13 first factor)
    std::vector<double> jac_t_short;  // 9: 𝒯_{[b,c]} (Eq.-13 second factor)
    std::vector<double> grad_jac_f;   // 27: ∇ℱ_{[b,c]}, layout [(i*3+j)*3+l]
                                      // = ∂F_ij/∂x_l (Eq.-14, evolved directly)
    // per-step scratch (computed ONCE per step after advection; reused by P2G):
    std::vector<double> mapped_omega;      // 3: ω_p = ℱ_long·ω_a (Eq. 12)
    std::vector<double> mapped_grad_omega; // 9: ∇ω_p = ℱ_s·∇ω_b·𝒯_s + ∇ℱ·ω_b (Eq. 13)
    // cell binning (counting sort; rebuilt per step; deterministic order)
    std::vector<uint32_t> bin_offsets;  // ncell+1
    std::vector<uint32_t> bin_particles;

    void compute_mapped_vorticity();
    void rebuild_bins(uint32_t n);
};

// Stratified seeded redistribution: ppc-per-cell sub-lattice + hash jitter
// (U-4 substrate verbatim; resizes all per-particle arrays).
void redistribute_particles(ParticleSystem& ps, uint32_t n, uint32_t particles_per_cell,
                            uint64_t seed, uint64_t reinit_counter);

// G2P of the edge-centred vorticity field at particle positions: value into
// omega_a/omega_b and/or gradient into grad_omega_b (per-family B-spline lattices).
void g2p_vorticity(const ParticleSystem& ps, const std::vector<double>& wx,
                   const std::vector<double>& wy, const std::vector<double>& wz,
                   uint32_t n, bool fill_omega_a, bool fill_omega_b,
                   bool fill_gradient);

// P2G (per-edge gather, fixed bin order): weighted APIC mean of the MAPPED particle
// vorticity (ω_p, ∇ω_p) onto the three edge-family lattices (paper Eq. 20; the
// positive weight normalization Σw is per edge node). Grid-value fallback (previous
// field) if no particle is in range (cannot occur at ppc≥8; guarded).
void p2g_vorticity(const ParticleSystem& ps, std::vector<double>& wx,
                   std::vector<double>& wy, std::vector<double>& wz, uint32_t n);

// RK4 advection of (x, ℱ_long, ℱ_short, 𝒯_short, ∇ℱ) in the frozen MAC velocity
// field: dx/dt = u, Dℱ/Dt = ∇u·ℱ (both segments), D𝒯/Dt = −𝒯·∇u, and the Eq.-14
// Hessian evolution (∇∇u sampled via the {1,−2,1}/h² second-derivative stencil).
void advect_particles_rk4(ParticleSystem& ps, const std::vector<double>& ux,
                          const std::vector<double>& uy, const std::vector<double>& uz,
                          uint32_t n, double dt);

// RK4 advection of bare probe clones (positions + a single forward Jacobian each) —
// the A2 Hessian-vs-FD test surface. Same integrator, same field.
void advect_probes_rk4(std::vector<double>& pos, std::vector<double>& jac_f,
                       std::size_t count, const std::vector<double>& ux,
                       const std::vector<double>& uy, const std::vector<double>& uz,
                       uint32_t n, double dt);

// MAC-face velocity + gradient + Hessian sample (quadratic B-spline, staggered
// nodes) at a point: u (3), ∇u (9, row r = ∂u_r/∂x_c), ∇∇u (18: comp-major
// [r*6 + sym] with sym = xx,yy,zz,xy,xz,yz) from ONE shared stencil walk per
// component. hess_out may be null (probe-clone path).
void sample_mac_velocity_gradient_hessian(const std::vector<double>& ux,
                                          const std::vector<double>& uy,
                                          const std::vector<double>& uz, uint32_t n,
                                          double x, double y, double z, double* u_out,
                                          double* grad_out, double* hess_out);

// Cell-centred average of the MAC field (capture parity with the collocated parent).
void mac_to_centres(const std::vector<double>& ux, const std::vector<double>& uy,
                    const std::vector<double>& uz, uint32_t n, std::vector<double>& uc,
                    std::vector<double>& vc, std::vector<double>& wc);

// Parent-op-order semi-Lagrangian trilinear advection of a cell-centred scalar
// (periodic), backtracing in the cell-centred velocity (U-4 substrate verbatim).
void advect_scalar_semi_lagrangian(std::vector<double>& field,
                                   const std::vector<double>& uc,
                                   const std::vector<double>& vc,
                                   const std::vector<double>& wc, uint32_t n, double dt);

}  // namespace bit_physics::vpfm::detail

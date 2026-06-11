// C-1 U-4 internal surfaces (src-private) — host math, particle transport, grids.
//
// Derivation notes (hand-derived; spec § 2 records these as the independent
// hand-derivation anchor):
//
// 2D-TG Clebsch pair + spherical lift (probe § 4.1 / § 5 A3):
//   target  u_TG = (sin2πx·cos2πy, −cos2πx·sin2πy, 0),  ω_z = 4π·sin2πx·sin2πy.
//   Clebsch pair λ = −2cos(2πx), μ = −cos(2πy)/(2π)  ⇒  ∇λ×∇μ = ω exactly, and
//   u_TG = λ∇μ + ∇φ with φ = −cos(2πx)cos(2πy)/(2π)  ⇒  the pressure projection of
//   λ∇μ IS u_TG (continuum-exactly).
//   Hopf section Ψ = (cos(α/2)e^{iθ/2}, sin(α/2)e^{−iθ/2}) gives
//   u = ħ⟨∇Ψ,iΨ⟩_ℝ = (ħ/2)[z∇θ + ∇χ] with z = cosα, θ the fibre angle, χ ≡ 0 here;
//   matching (ħ/2)∇z×∇θ = ∇λ×∇μ fixes  z = λ/2 = −cos(2πx),  θ = 4μ/ħ.
//   The lift is unit-norm by construction and its Eq.-19 face reconstruction
//   converges to λ∇μ (x-faces exactly 0; y-faces → −2cos2πx·sin2πy).
//
// Wave-fit init for the 3D TG IC (probe § 4.2): gradient descent on
//   E(Ψ) = ½∫|u(Ψ) − u_t|²,  u(Ψ) = ħ·Im(Ψ̄₁∇Ψ₁ + Ψ̄₂∇Ψ₂),
//   δE/δΨ̄_k = −(iħ/2)[2e·∇Ψ_k + (∇·e)Ψ_k],  e = u(Ψ) − u_t
//   ⇒ Ψ_k ← Ψ_k + τ·(iħ/2)[2e·∇Ψ_k + (∇·e)Ψ_k], then pointwise normalize.
//   Fixed iteration count + fixed τ + closed-form seed ⇒ deterministic; the achieved
//   residual is MEASURED into ClebschResult.init_velocity_residual.
//
// Determinism rules used throughout (spec § 6 posture): parallel loops only over
// independent output slots (per-particle / per-cell / per-color); order-sensitive
// passes (binning scatter, global reductions) run sequentially; no atomics.

#pragma once

#include <array>
#include <cstdint>
#include <functional>
#include <vector>

namespace bit_physics::clebsch_pfm::detail {

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
// and the 3 per-axis weights + d/dx weights (units 1/h).
struct BSpline {
    int base;                 // first node index (may be negative; wrap at use site)
    std::array<double, 3> w;
    std::array<double, 3> dw; // derivative wrt x (already / h)
};
BSpline bspline_quadratic(double x_over_h);  // x in grid units relative to node lattice

// --- multigrid Poisson (periodic, cell-centred, 7-point, f64, fixed cycles) -------
// Solves lap(p) = rhs on an n³ periodic grid with spacing h. Runs `vcycles` fixed
// V(2,2) cycles with red-black Gauss-Seidel smoothing (colour-parallel,
// order-independent), full-weighting restriction, trilinear prolongation, and a
// fixed-sweep coarsest solve. Deterministic for any thread count. Returns the final
// max-abs residual (MEASURED; recorded by the caller).
double poisson_periodic_mg(std::vector<double>& p, const std::vector<double>& rhs,
                           uint32_t n, double h, uint32_t vcycles);

// --- grid helpers -------------------------------------------------------------------
inline std::size_t cell_index(uint32_t i, uint32_t j, uint32_t k, uint32_t n) {
    return (static_cast<std::size_t>(k) * n + j) * n + i;
}

// --- particle system (SoA; gather-only transfers; sequential binning) --------------
struct ParticleSystem {
    std::size_t count = 0;
    std::vector<double> pos;       // 3 per particle
    std::vector<double> phi_s;     // 4 per particle (carried 0-form value; NEVER evolved)
    std::vector<double> grad_phi;  // 12 per particle: (∇Φ)_{s'} as 3 dirs × (2 complex)
                                   // layout: dir-major [d][comp] -> 4 doubles per dir
    std::vector<double> jac_t;     // 9 per particle: T̃ (backward-map Jacobian, s'→t)
    std::vector<double> jac_f;     // 9 per particle (test mode only): F̃ forward
    // per-step scratch: the mapped gradient (∇Φ)_p = T̃ᵀ(∇Φ)_{s'} (Eq. 18), computed
    // ONCE per step (compute_mapped_gradients) and reused by P2G + both Eq.-23 samples
    std::vector<double> mapped_grad;  // 12 per particle
    // cell binning (counting sort; rebuilt per step; deterministic order)
    std::vector<uint32_t> bin_offsets;  // ncell+1
    std::vector<uint32_t> bin_particles;

    void compute_mapped_gradients();

    void rebuild_bins(uint32_t n);
};

// Stratified seeded redistribution: ppc-per-cell sub-lattice + hash jitter.
void redistribute_particles(ParticleSystem& ps, uint32_t n, uint32_t particles_per_cell,
                            uint64_t seed, uint64_t reinit_counter);

// G2P of cell-centred spinor field: value and/or gradient at particle positions.
void g2p_spinor(const ParticleSystem& ps, const std::vector<double>& phi_g, uint32_t n,
                bool fill_value, bool fill_gradient);

// P2G (per-cell gather, fixed bin order): weighted APIC mean of the MAPPED particle
// spinors Φ_p = Φ_{p,s}, (∇Φ)_p = T̃ᵀ(∇Φ)_{p,s'} (paper Eqs. 6+18). The positive
// scalar weight field cancels in arg⟨·,·⟩ (documented spec § 2 scale-invariance).
void p2g_spinor(const ParticleSystem& ps, std::vector<double>& phi_g, uint32_t n);

// P2G evaluation of the mapped spinor field at the Eq.-23 enhanced-conversion
// sample pairs (f ∓ dx_s/2, dx_s = dx/2) for all three +axis-owner faces of every
// cell: one exact-union-window gather per cell serves all 6 points (off-centre
// points need a wider window than cell-centred P2G; per-axis spline values shared).
// Weighted APIC mean per point; grid-value fallback if no particle is in range.
// Output layout: 4 doubles per item, item = axis·ncell + cell (a = f−dx_s/2 side).
void p2g_face_samples(const ParticleSystem& ps, const std::vector<double>& phi_g,
                      uint32_t n, std::vector<double>& out_a,
                      std::vector<double>& out_b);

// RK4 advection of (x_p, T̃_p[, F̃_p]) in the frozen MAC velocity field
// (faces per the +axis-owner convention), dT̃/dt = −T̃·∇u, dF̃/dt = ∇u·F̃.
void advect_particles_rk4(ParticleSystem& ps, const std::vector<double>& ux,
                          const std::vector<double>& uy, const std::vector<double>& uz,
                          uint32_t n, double dt, bool track_forward);

// MAC-face velocity + gradient sample (quadratic B-spline, staggered nodes) at a
// point: u (3) and ∇u (3×3, row r = ∂u_r/∂x_c) from ONE shared stencil walk.
void sample_mac_velocity_and_gradient(const std::vector<double>& ux,
                                      const std::vector<double>& uy,
                                      const std::vector<double>& uz, uint32_t n,
                                      double x, double y, double z, double* u_out,
                                      double* grad_out);

// Cell-centred average of the MAC field (capture parity with the collocated parent).
void mac_to_centres(const std::vector<double>& ux, const std::vector<double>& uy,
                    const std::vector<double>& uz, uint32_t n, std::vector<double>& uc,
                    std::vector<double>& vc, std::vector<double>& wc);

// Parent-op-order semi-Lagrangian trilinear advection of a cell-centred scalar
// (periodic), backtracing in the cell-centred velocity (parent stable_fluids.py port).
void advect_scalar_semi_lagrangian(std::vector<double>& field,
                                   const std::vector<double>& uc,
                                   const std::vector<double>& vc,
                                   const std::vector<double>& wc, uint32_t n, double dt);

// Wave-fit descent iteration block for the 3D TG IC (see header notes). Mutates phi_g
// in place; returns the final max-abs face-velocity residual vs the target MAC field.
double wave_fit_descent(std::vector<double>& phi_g, const std::vector<double>& tx,
                        const std::vector<double>& ty, const std::vector<double>& tz,
                        uint32_t n, double hbar, uint32_t iters, double tau);

}  // namespace bit_physics::clebsch_pfm::detail

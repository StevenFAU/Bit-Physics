// C-1 U-6 internal surfaces (src-private) — host math + the GRID backward-flow-map
// core. The Stack-C grid layer (deterministic parallel-for, quadratic B-spline,
// periodic multigrid Poisson, MAC sampling, mac_to_centres, the analytic Taylor-Green
// closed forms) is COPY-ADAPTED from eulerian-smoke-frontier-vpfm (probe § 5). The
// backward flow map ψ + on-grid Jacobian ∇ψ evolution + Cauchy vorticity transport is
// built NEW (probe § 2: grid-side, NOT the U-4/U-5 particle substrate — no particles,
// no APIC P2G/G2P, no counting-sort binning).
//
// Derivation notes (hand-derived; spec § 2 records these as the independent
// hand-derivation anchor):
//
// Vorticity closed forms (ω = ∇×u, k = 2π) — identical to U-5 (FD-cross-checked in A1):
//   3D parent TG  u = (sin·cos·cos, −cos·sin·cos, 0):
//     ω = (−k cos(kx) sin(ky) sin(kz), −k sin(kx) cos(ky) sin(kz),
//          2k sin(kx) sin(ky) cos(kz)).
//   2D-z-invariant TG  u = (sin(kx) cos(ky), −cos(kx) sin(ky), 0):
//     ω = (0, 0, 2k sin(kx) sin(ky))  — an EXACT steady incompressible-Euler solution.
//
// Grid backward flow map (the EDGE core; anchor § 3):
//   State: the displacement-to-origin field d(x) = ψ(x) − x (periodic, smooth — stored
//   instead of ψ so periodicity is offset-blind) + the on-grid first Jacobian
//   J(x) = ∇ψ(x) (item 1, evolved DIRECTLY on the grid). Both are cell-centred n³ grids;
//   their byte footprint is INDEPENDENT of the flow-map length L (item 4 — the O(1)-
//   memory headline; buffer methods grow with L, EDGE does not).
//
//   Per step, in the frozen MAC velocity u: backtrace the departure point x_dep(x) by
//   RK4 of dφ/ds = −u(φ), φ(0)=x, x_dep = φ(dt); evolve the backtrace Jacobian
//   M = ∂x_dep/∂x by the variational equation dΨ/ds = −∇u(φ)·Ψ, Ψ(0)=I, M = Ψ(dt)
//   (the gradient-evolution lever — M is built from the evolved ∇u, never an FD of a
//   stored velocity buffer). The map composes by the chain rule (gather-only):
//     d^{n+1}(x) = (x_dep − x) + interp(d^n, x_dep)
//     J^{n+1}(x) = interp(J^n, x_dep) · M(x)          [∂(ψ^n∘x_dep)/∂x]
//   At reinit (every L steps): d ← 0, J ← I, ω_ref ← current edge vorticity.
//
//   Vorticity from the map (Cauchy formula): with a = ψ(x) the origin and the forward
//   deformation gradient F = ∂x/∂a = (∇ψ)^{-1},  ω(x) = F · ω_ref(a) = J(x)^{-1} ·
//   ω_ref(ψ(x)). For the z-invariant 2D field J is block [[*,*,0],[*,*,0],[0,0,1]] with
//   F_zz = 1, so ω_z(x) = ω_ref,z(ψ(x)) — the materially-conserved-scalar limit, no
//   stretching, recovered exactly by the general form.
//
// Gradient-evolution consistency (A2 item 1): the evolved J must agree with a central
// difference of the evolved map ψ. Differencing the periodic displacement d and adding
// the identity, ∂ψ_i/∂x_j |_fd = δ_ij + (d_i(c+ê_j) − d_i(c−ê_j))/(2h); the residual
// ‖J − (I + ∇d_fd)‖_max is the interp-vs-evolved mismatch (O(dx²)-ish, resolution-
// converging — an index/sign defect would NOT converge: the discriminator).
//
// Determinism rules (spec § 6 posture, U-5 verbatim): parallel loops only over
// independent output slots (per-cell / per-edge gather); order-sensitive passes (global
// reductions) run sequentially; no atomics; gather-only transfers (no scatter).

#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <vector>

namespace bit_physics::edge::detail {

// --- deterministic parallel-for (independent output slots only) -------------------
void parallel_for(std::size_t count,
                  const std::function<void(std::size_t, std::size_t)>& chunk_fn);

// --- quadratic B-spline (support 1.5; nodes per axis: base..base+2) ----------------
struct BSpline {
    int base;                  // first node index (may be negative; wrap at use site)
    std::array<double, 3> w;   // interpolation weights
    std::array<double, 3> dw;  // d/dx weights (already / h; multiply by n at use site)
};
BSpline bspline_quadratic(double x_over_h);  // x in grid units relative to node lattice

// --- multigrid Poisson (periodic, 7-point, f64, fixed cycles) ---------------------
// Solves lap(p) = rhs on an n³ periodic lattice with spacing h (offset-blind: edge
// families included). Fixed V(2,2) cycles, colour-parallel RB-GS, full-weighting
// restriction, trilinear prolongation, fixed-sweep coarsest solve. Deterministic for
// any thread count. Returns the final max-abs residual (MEASURED; recorded by caller).
double poisson_periodic_mg(std::vector<double>& p, const std::vector<double>& rhs,
                           uint32_t n, double h, uint32_t vcycles);

// --- grid helpers -------------------------------------------------------------------
inline std::size_t cell_index(uint32_t i, uint32_t j, uint32_t k, uint32_t n) {
    return (static_cast<std::size_t>(k) * n + j) * n + i;
}
// Edge-lattice node offsets in grid units (+owner convention; curl shader header):
//   family 0 (ωx/Ψx): node at (i+0.5, j+1, k+1); family 1 (ωy/Ψy): (i+1, j+0.5, k+1);
//   family 2 (ωz/Ψz): (i+1, j+1, k+0.5). edge_offset(d, axis) = cell (0,0,0)'s node.
inline double edge_offset(int family, int axis) { return (family == axis) ? 0.5 : 1.0; }

// MAC-face velocity + gradient sample (quadratic B-spline, staggered face nodes) at a
// point: u (3), ∇u (9, row r = ∂u_r/∂x_c). grad_out may be null (pure-value path).
void sample_mac_velocity_gradient(const std::vector<double>& ux,
                                  const std::vector<double>& uy,
                                  const std::vector<double>& uz, uint32_t n, double x,
                                  double y, double z, double* u_out, double* grad_out);

// Cell-centred vector field sample (3 components interleaved, node at (i+0.5)h) at a
// periodic point — used to gather the displacement/Jacobian fields at x_dep / edges.
void sample_centred(const std::vector<double>& field, int ncomp, uint32_t n, double x,
                    double y, double z, double* out);

// Edge-family scalar-field sample (family d node lattice) at a periodic point — used to
// resample ω_ref at ψ(edge) in the Cauchy transport.
double sample_edge_value(const std::vector<double>& field, int family, uint32_t n,
                         double x, double y, double z);

// Cell-centred average of the MAC field (capture parity with the collocated parent).
void mac_to_centres(const std::vector<double>& ux, const std::vector<double>& uy,
                    const std::vector<double>& uz, uint32_t n, std::vector<double>& uc,
                    std::vector<double>& vc, std::vector<double>& wc);

// Parent-op-order semi-Lagrangian trilinear advection of a cell-centred scalar
// (periodic), backtracing in the cell-centred velocity (U-5 substrate verbatim).
void advect_scalar_semi_lagrangian(std::vector<double>& field,
                                   const std::vector<double>& uc,
                                   const std::vector<double>& vc,
                                   const std::vector<double>& wc, uint32_t n, double dt);

// --- the grid backward flow map (the NEW EDGE surface) ----------------------------
struct FlowMap {
    uint32_t n = 0;
    std::vector<double> disp;  // 3·ncell: d = ψ − x (interleaved per cell)
    std::vector<double> jac;   // 9·ncell: J = ∇ψ (row-major 3×3 per cell)
    std::vector<double> wref_x, wref_y, wref_z;  // edge ω at the last reinit (ncell each)

    void allocate(uint32_t n);
};

// Reinit: d ← 0, J ← I, ω_ref ← (wx, wy, wz) (the current edge vorticity).
void flowmap_reinit(FlowMap& fm, const std::vector<double>& wx,
                    const std::vector<double>& wy, const std::vector<double>& wz);

// Advance the map one step in the frozen MAC velocity (gather-only; deterministic).
void flowmap_advance(FlowMap& fm, const std::vector<double>& ux,
                     const std::vector<double>& uy, const std::vector<double>& uz,
                     double dt);

// Reconstruct the edge vorticity from the map via the Cauchy formula ω = J^{-1}·ω_ref(ψ).
void flowmap_to_vorticity(const FlowMap& fm, std::vector<double>& wx,
                          std::vector<double>& wy, std::vector<double>& wz);

// max ‖J_evolved − (I + ∇d_fd)‖_max over the grid (A2 gradient-evolution surface).
double flowmap_gradient_fd_residual(const FlowMap& fm);

// Persistent map-state byte footprint (d + J + ω_ref) — CONSTANT in the flow-map length
// L (the O(1)-memory headline; backward_map_memory_constant PBT).
std::size_t flowmap_state_bytes(const FlowMap& fm);

}  // namespace bit_physics::edge::detail

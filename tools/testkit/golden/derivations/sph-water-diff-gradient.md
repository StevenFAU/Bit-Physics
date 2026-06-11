# Gradient golden derivation — sph-water-diff

Golden table: `tools/testkit/golden/tables/sph-water-diff-gradient.json`.
Algorithm: `sph-water-diff-gradient`. Category: `particle-fluids`.

The table verifies the autodiff (`ti.ad.Tape`) gradient of the differentiable SPH forward
against **three genuinely independent anchors** (spec § 2.4; cat3 enforces >= 3 distinct
`independent_reference.source` strings). No vendored code — every anchor is a closed-form
derivation or an independent numerical method (`derivation.upstream` = the source set,
`upstream_sha/path` = `n/a-no-vendored-code`).

The forward is the tape-differentiable re-implementation of the landed `sph-water-stack-d`
canonical physics (R-S3/S6): semi-implicit-Euler gravity free-fall + Monaghan-cubic-spline
SPH density (`W(q,h) = sigma_3/h^3 f(q)`, `sigma_3 = 1/pi`). Two loss surfaces: the
control loss `Loss = sum_p ||x(T)_p - target_p||^2` (parameter `v0z`) and the kernel-width
loss `Loss = sum_p (rho_p(h) - target_p)^2` (parameter `h`). All anchors operate in the
**fixed-topology interior regime** (free-fall preserves relative positions exactly; fixture
pair distances away from the q=1 / q=2 spline knots), where the piecewise kernel is smooth
and the gradient exact.

## A1 — free-fall control analytic (`grad_v0z`)

Semi-implicit Euler free-fall: `v_k = v0 + k*g*dt` and

    z_T = z0 + dt*sum_{k=1..T} v_k = z0 + T*dt*v0 + g*dt^2*T(T+1)/2.

The target is the same map at `v0z*`, so gravity + IC cancel:
`z_T(v0z) - z_T(v0z*) = T*dt*(v0z - v0z*)` for EVERY particle (x,y are v0z-independent),
and the L2 loss gives the **closed-form exact**

    dLoss/dv0z = 2*N*(dt*T)^2 * (v0z - v0z*).

The map is exactly linear in `v0z` — no truncation term at all. The autodiff gradient
matches to machine precision (`test_a1_freefall_exact_closed_form`). **Source:**
hand-derived kinematics (the mpm-diff a1-ballistic sibling). DiffTaichi (Hu et al., ICLR
2020, arXiv:1910.00935) is the differentiable-sim **method** citation (CITE-DON'T-IMPORT;
anchor verified live at the C-1 charter § 2 row 1).

## A2 — central finite-difference baseline (`grad_h`)

The kernel-width loss on the canonical 8-particle cloud has no closed form (27 pair terms
through the piecewise spline). The anchor is the central finite difference of the SAME loss
(`common_py.autodiff.finite_diff.finite_difference_gradient`, `eps=1e-7`) — an
independent **numerical method** (no tape). Measured autodiff-vs-FD agreement at
table-build: ~1.6e-10 / ~1.3e-10 / ~7.7e-12 relative on the three points — far inside the
table tolerance (relative 1e-5).

## A3 — kernel-width pair-density analytic (`drho_dh`)

For an isolated pair at distance `r` (self term + one neighbor):

    rho(h) = (m*sigma_3/h^3)(1 + f(q)),  q = r/h,  dq/dh = -q/h
    => d(rho)/dh = -(m*sigma_3/h^4) * (3*(1 + f(q)) + q*f'(q)).

Evaluated on BOTH spline branches: `r=0.025` (q=0.5, inner `1 - 1.5q^2 + 0.75q^3`),
`r=0.07` (q=1.4, outer `0.25(2-q)^3`), and `r=0.04` (q=0.8). **Source:** hand
differentiation of the Monaghan cubic spline (Monaghan 2005, *Rep. Prog. Phys.* 68(8)
Eq. 2.7) — the same kernel the parent's gate-4 golden surface cross-checks against
SPlisHSPlasH. Distinct physical term (kernel calculus, not kinematics), distinct parameter
(`h`, not `v0z`), distinct method (analytic differentiation, not FD, not ballistic
integration). The autodiff readout is a standalone tape over `rho_0`
(`sim.autodiff_drho_dh_pair`), cross-checked exactly in
`test_a3_pair_drho_dh_exact_closed_form`.

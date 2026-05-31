# Gradient golden derivation — eulerian-smoke-diff

Golden table: `tools/testkit/golden/tables/eulerian-smoke-diff-gradient.json`.
Algorithm: `eulerian-smoke-diff-gradient`. Category: `volumetric-grid`.

The table verifies the autodiff (`wp.Tape`) gradient of the differentiable semi-Lagrangian smoke
step against **three genuinely independent anchors** (spec § 2.4; cat3 enforces ≥ 3 distinct
`independent_reference.source` strings). No vendored code — every anchor is a closed-form
derivation or an independent numerical method (`derivation.upstream` = the source set,
`upstream_sha/path` = `n/a-no-vendored-code`).

The forward is the tape-differentiable re-implementation of the landed `eulerian-smoke-stack-e`
reference's smoke primitives (semi-Lagrangian bilinear backtrace advect + 5-point explicit
diffusion) with **on-device `requires_grad` `wp.array`s** — the reference's NumPy-marshalling
wrappers (`wp.from_numpy(...)` → `wp.launch` → `out.numpy()`) sever the `wp.Tape`, so the diff
variant re-implements rather than wraps (Stage-0 probe § 1). The inverse loss is the L2 final-frame
mismatch `Loss = Σ_ij (u(T)_ij − target_ij)²`. All anchors operate in the **constant-velocity**
regime, where the bilinear backtrace map is a globally-linear operator (the per-step fractional
cell displacement `vx·dt/dx = 0.3`, `vy·dt/dx = −0.2` are bounded away from 0.5 → no cell-boundary
kink).

## A1 — linear-advection-operator analytic (field gradient at named cells)

For a **constant** velocity the semi-Lagrangian bilinear-interpolation backtrace is the exact
sparse **linear** operator `M` (the backtrace positions and the bilinear weights `(1∓fx)(1∓fy)` are
field-independent), so `advect(u₀) = M u₀` and the `K`-step rollout is `predicted = Mᵏ u₀`. With the
L2 loss `Loss = ‖Mᵏ u₀ − target‖²` the gradient is the **closed-form exact**

    ∂Loss/∂u₀ = 2 (Mᵏ)ᵀ (Mᵏ u₀ − target).

`M` is assembled by `eulerian_smoke_diff.forward.advect_operator_matrix` from a **pure-NumPy**
advect mirror (`numpy_sl_advect`) that replicates the reference `_sl_advect_2d_k` op-order
verbatim, so `M` is bit-faithful to the Warp engine on CPU f64
([[stack-e-warp-f64-bit-faithful-to-numpy]]). The autodiff gradient matches this analytic operator
to **~4e-15** (Stage-1b; `test_a1_advection_operator_exact`). **Source:** hand-derived linear
algebra; the semi-Lagrangian backtrace is **Stam, J. (1999), "Stable Fluids," SIGGRAPH '99, 121-128**
(DOI 10.1145/311535.311548) — Stage-0 verified the reference's advect IS the standard
backtrace-and-interpolate form.

## A2 — central finite-difference baseline (field gradient at named cells)

For the same advection forward the independent reference is the **central finite-difference**
gradient at the named cells

    ∂Loss/∂u₀_idx ≈ [Loss(u₀ + ε e_idx) − Loss(u₀ − ε e_idx)] / (2 ε),   ε=1e-6,  O(ε²),

an independent computational path (parameter perturbation) from the `wp.Tape` adjoint. Autodiff
matches FD to ~3e-10 rel (Stage-1b; `test_a2_gradient_matches_finite_difference_report`). This is
the numerical-baseline anchor (close-R2 exemption).

## A3 — discrete-diffusion analytic (`dLoss_dnu`)

Differentiating one **explicit-diffusion** step w.r.t. the diffusion coefficient exercises a
distinct physical term (diffusion, not advection). `u' = u₀ + dt·ν·∇²u₀` (5-point periodic
Laplacian) is **exactly linear in `ν`**, so

    Loss = ‖u' − target‖²,    ∂Loss/∂ν = 2 (u' − target) · (dt · ∇²u₀).

Independent of A1/A2 in **physical term** (diffusion, not advection), **parameter class** (the
coefficient `ν`, not the field `u₀`), and **method** (heat-operator linearization, not the
advection adjoint or parameter-perturbation FD). The autodiff derivative matches this **exactly**
(err 0.0, Stage-1b; `test_a3_diffusion_dloss_dnu_exact`). **Source:** discrete-diffusion analytic,
hand-derived; the heat equation `∂_t u = ν ∇²u` is the physical source.

## D-ANCHOR Stage-0 SHIFT (on evidence)

The charter § 4.4 framed A3 as the **continuous** heat-kernel ("Gaussian IC under pure diffusion
spreads analytically"). The continuous heat kernel is the *motivation*, but the EXACT golden TABLE
value must be the derivative of the **discrete explicit-diffusion operator** the sim actually runs
(the continuous Gaussian-spread is only first-order-accurate to the discrete step → not a
machine-exact golden). So A3 is the discrete-diffusion `∂Loss/∂ν` analytic (above), with the
heat equation retained as the cited physical source. This mirrors sim-1's MMS→ODE-limit, sim-2's
`∂K`→convolution-Jacobian, and sim-3's DiffTaichi→neo-Hookean shifts: keep ≥ 3 genuinely
independent NUMERIC anchors, document the shift, never force an unsound anchor. See
`tools/testkit/probes/reports/eulerian-smoke-diff.md` § 3. HARD-RULE-2 re-declaration on evidence,
NOT a tolerance widening.

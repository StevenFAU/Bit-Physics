# articulated-pedagogical-diff — gradient golden derivation

Golden table: `tools/testkit/golden/tables/articulated-pedagogical-diff-gradient.json`
(`algorithm = "articulated-pedagogical-diff-gradient"`, category `rigid-body`).

The differentiable variant launches the **landed parent** Featherstone ABA kernel
(`articulated_pedagogical._warp_kernels.aba_kernel`) on-device inside a `wp.Tape` with
`requires_grad` arrays (no `.numpy()` host round-trip — that would sever the tape). The autodiff
gradient is verified at canonical single-pendulum points against three **independent** references.

**Scope = single pendulum (n=1).** The Stage-0 WARP-NATIVE-TAPE probe
(`tools/testkit/probes/reports/articulated-pedagogical-diff.md`) MEASURED the autodiff adjoint to be
machine-exact for `n=1` and to diverge from central-FD for `n≥2` (the ABA inward pass's in-place
`ia[i-1]` accumulation is a read-after-write aliasing Warp's reverse pass cannot replay). The closed
forms below exist only for the single pendulum, so the scope is exactly where the adjoint is sound.

## Model

A single revolute joint, point mass `m` at the rod tip (`cdist = L`, `I_com = 0`), gravity `g` in
`-y`. The joint-space inertia about the pivot is `H = I_com + m·cdist² = m L²` (parallel-axis).
With only gravity acting, the equation of motion is the ideal simple pendulum

```
q̈ = −(g/L) sin q .
```

## A1 — analytic STATE-sensitivity `∂q̈/∂q` (closed form)

Differentiating the EOM in `q`:

```
∂q̈/∂q = −(g/L) cos q .
```

Closed-form, machine-exact. The `wp.Tape` adjoint through the ABA recursion matches it to
**relerr ≤ 1.9e-16** (Stage-0 probe; re-confirmed at Stage 1b). Source: rigid-body EOM /
Featherstone (2008), *Rigid Body Dynamics Algorithms*, Ch. 7 §7.3 (simple-pendulum gravity-only
limit, independent of the recursion). The table stores the analytic value as `expected`; the
evaluator returns the autodiff value.

## A2 — central finite-difference baseline (numerical, independent)

```
∂q̈/∂q ≈ (q̈(q+ε) − q̈(q−ε)) / (2ε),   ε = 1e-6,   O(ε²) .
```

An independent numerical method (parameter perturbation of the forward ABA) cross-checking the
`wp.Tape` autodiff engine. Autodiff matches FD to the truncation floor (≤ 1e-5 rel; close-R2
numerical-baseline exemption). The table stores the FD value as `expected`.

## A3 — analytic TORQUE-sensitivity `∂q̈/∂τ` (closed form, SOURCE-DISTINCT)

With an applied joint torque `τ`, `H q̈ = τ − (gravity term)`, so

```
∂q̈/∂τ = H⁻¹ = 1/(I_com + m·cdist²) = 1/(mL²) ,
```

closed-form and **configuration-independent** (constant in `q`). Distinct from A1 in physical term
(torque- vs state-sensitivity), parameter (`τ` vs `q`), and method (joint-space-inertia inversion vs
gravity-torque linearization). Autodiff matches it EXACTLY (relerr 0.0). Source: Featherstone (2008)
ABA single-link inertia / parallel-axis.

## Tolerance

`tolerance = {absolute: 1e-6, relative: 1e-5}` (table-global). A1/A3 are machine-exact (autodiff vs
analytic ≤ 1e-12); A2 sits at the FD truncation floor (~1e-7) — all within `relative 1e-5`. The
per-anchor named tolerances live at
`tools/testkit/equivalence/tolerance.toml [golden_tolerance.rigid-body.articulated-pedagogical-diff]`.

The forward `q̈` itself is bit-exact vs the landed parent `aba_forward_dynamics` at any `n` (the
WU-F differentiable-axis parent-vs-frontier forward-equivalence; `tests/test_forward_equivalence.py`).

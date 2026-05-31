# Gradient golden derivation — mpm-multimaterial-diff

Golden table: `tools/testkit/golden/tables/mpm-multimaterial-diff-gradient.json`.
Algorithm: `mpm-multimaterial-diff-gradient`. Category: `hybrid-pg`.

The table verifies the autodiff (`ti.ad.Tape`) gradient of the differentiable 3D APIC
neo-Hookean MLS-MPM forward against **three genuinely independent anchors** (spec § 2.4; cat3
enforces >= 3 distinct `independent_reference.source` strings). No vendored code — every
anchor is a closed-form derivation or an independent numerical method
(`derivation.upstream` = the source set, `upstream_sha/path` = `n/a-no-vendored-code`).

The forward is the tape-differentiable re-implementation of the landed
`mpm-multimaterial-stack-d` reference (Hu 2018 88-line MLS-MPM/APIC + neo-Hookean Kirchhoff
stress `sigma = mu(B-I) + lam log(J) I`, `F^{n+1}=(I+dt C)F^n`). The inverse loss is
`Loss = sum_p ||x(T)_p - target_p||^2`. All anchors operate in the **interior small-strain
regime** (`F ~= I`, no boundary clamp), where the dynamics are smooth and the gradient exact.
Material constants `E=4e3`, `nu=0.3`; `dt=1e-3` (the largest step keeping the stiff dynamics
in the smooth regime — `dt>=5e-3` ill-conditions the gradient, the DiffTaichi warning).

## A1 — ballistic kinematic analytic (`grad_vx`, `grad_vy`, `grad_vz`)

A single particle (`n_particles=1`) with `F=I`, `C=0` has zero neo-Hookean stress
(`mu(I-I)+lam*log(1)*I = 0`) and, for the quadratic B-spline, zero APIC first moment
(`sum_node w*(node-x_p) == 0`), so the APIC P2G/G2P round-trip degenerates to PIC free-flight

    v_{t+1} = v_t + g*dt*z,    x_{t+1} = x_t + dt*v_{t+1},

hence `x(T) = x0 + dt*sum_{t=1}^{T} v_t` and `dx(T)/dv0 = dt*T*I` (gravity is v0-independent).
With the one-target L2 loss `Loss = sum ||x(T;v0) - x(T;v0_target)||^2` and
`x(T;v0)-x(T;v0_target) = dt*T*(v0-v0_target)` (gravity cancels), the gradient is the
**closed-form exact**

    dLoss/dv0 = 2*(dt*T)^2 * (v0 - v0_target).

The autodiff gradient matches this to machine precision (~1e-18, Stage-1b;
`test_a1_ballistic_exact_closed_form`). **Source:** hand-derived kinematics. DiffTaichi
(Hu et al., ICLR 2020, arXiv:1910.00935) is the differentiable-MPM **method** citation
(the `diff_mpm` throw-to-target example, FD-validated in the paper; CITE-DON'T-IMPORT).

## A2 — central finite-difference baseline (`grad_vx`, `grad_vy`, `grad_vz`)

For the full multi-particle (`n_particles=6`) grid-coupled forward the gradient has no simple
closed form, so the independent reference is the **central finite-difference** gradient

    dLoss/dv0_i ~= [Loss(v0 + eps e_i) - Loss(v0 - eps e_i)] / (2 eps),   eps=1e-6,  O(eps^2),

an independent computational path (parameter perturbation) from the tape adjoint. Autodiff
matches FD to ~1.9e-8 rel (Stage-1b). This is the numerical-baseline anchor (close-R2
exemption). The 6-particle cluster shares grid nodes, so this exercises the multi-particle
APIC coupling that A1 (single particle) does not.

## A3 — neo-Hookean small-strain constitutive analytic (`dstress00_dstrain`)

Differentiating the neo-Hookean Kirchhoff stress w.r.t. a uniaxial strain exercises the
**constitutive** path rather than the kinematic transfer. At `F = diag(1+eps, 1, 1)`,
`B00 = (1+eps)^2`, `J = det F = 1+eps`, so

    sigma00 = mu*((1+eps)^2 - 1) + lam*log(1+eps),
    d(sigma00)/d(eps)|_{eps=0} = 2*mu + lam.

Independent of A1/A2 in **physical term** (constitutive stress, not kinematic transfer),
**parameter class** (a material strain, not `v0`), and **method** (elastic linearization, not
ballistic integration or parameter-perturbation FD). The autodiff derivative matches this
**exactly** (err 0.0, Stage-1b; `test_a3_neohookean_exact_closed_form`). **Source:**
neo-Hookean linearization, hand-derived (Stomakhin 2013 / Jiang 2016 MPM course — the
reference's constitutive cites).

## D-ANCHOR Stage-0/1b SHIFT (on evidence)

The charter § 4.3 proposed A3 = DiffTaichi. DiffTaichi is a published **method** anchor
(FD-validated in the paper) but publishes **no storable numeric gradient value** for a golden
TABLE point, so the third NUMERIC anchor is the neo-Hookean small-strain constitutive analytic
(above); DiffTaichi is retained as the method citation. This mirrors sim-1's MMS->ODE shift
and sim-2's `dK`->convolution-Jacobian shift: keep >= 3 genuinely independent NUMERIC anchors,
document the shift, never force an unsound anchor. See
`tools/testkit/probes/reports/mpm-multimaterial-diff.md` § 3. HARD-RULE-2 re-declaration on
evidence, NOT a tolerance widening.

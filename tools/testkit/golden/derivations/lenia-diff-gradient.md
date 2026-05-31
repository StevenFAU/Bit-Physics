# Gradient golden derivation — lenia-diff

Golden table: `tools/testkit/golden/tables/lenia-diff-gradient.json`.
Algorithm: `lenia-diff-gradient`. Category: `continuous-ca`.

The table verifies the autodiff (`ti.ad.Tape`) gradient of the differentiable Quad4-Lenia
forward against **three genuinely independent anchors** (spec §2.4; cat3 enforces ≥3
distinct `independent_reference.source` strings). No vendored code — every anchor is a
closed-form derivation or an independent numerical method (`derivation.upstream` = the
source set, `upstream_sha/path` = `n/a-no-vendored-code`).

The forward step is `A_{n+1} = clip(A_n + dt·G(K∗A_n), 0, 1)` with the normalized Quad4
kernel `K(r)=(4r(1-r))⁴` and Quad4 polynomial growth
`G(u)=2·max(0, 1-(u-mu)²/(9 sigma²))⁴ - 1` (Chakazul gn=1; Chan 2019, *Complex Systems*
28(3):251-286). `Loss = Σ_ij (A(T)_ij - target_ij)²`. All anchors operate in the
**smooth-interior regime** (`base = 1-(u-mu)²/(9 sigma²) > 0`, clip inactive), where the
growth is `C∞` and the gradient is exact.

## A1 — closed-form Quad4 growth-parameter analytic (`grad_mu`, `grad_sigma`)

In the smooth interior `G = 2·base⁴ - 1` with `base = 1-(u-mu)²/(9 sigma²)`, so

    dG/dmu    = 16·base³·(u-mu)/(9 sigma²),
    dG/dsigma = 16·base³·(u-mu)²/(9 sigma³).

For one step (`steps=1`), `A1 = A0 + dt·G(U; mu, sigma)` with `U = K∗A0`, hence the
**closed-form exact** gradients

    dLoss/dmu    = Σ 2(A1-target)·dt·dG/dmu(U),
    dLoss/dsigma = Σ 2(A1-target)·dt·dG/dsigma(U).

The autodiff gradient matches this to machine precision (~1e-14, Stage-0 probe §1;
`test_a1_growth_exact_closed_form`). **Source:** the Quad4 polynomial growth form — Chan,
B.W.-C. (2019), "Lenia — Biology of Artificial Life," *Complex Systems* 28(3):251-286
(arXiv:1812.05433); the closed form is grep-cited from the vendored Chakazul source
`references/Chakazul-Lenia/Python/LeniaF.py:500` @ SHA `adfc542939266de7f4bb7ebb552e8499701ee107`.
Citation granularity is paper/section — no sub-equation asserted unread; the load-bearing
math is the self-contained Quad4 derivative.

## A2 — central finite-difference baseline (`grad_mu`, `grad_sigma`)

At a multi-step horizon (`steps=2`) the gradient has no simple closed form, so the
independent reference is the **central finite-difference** gradient

    dLoss/dparam ≈ [Loss(param + eps) - Loss(param - eps)] / (2 eps),   eps = 1e-5,  O(eps²),

an independent computational path (parameter perturbation) from the tape adjoint. Autodiff
matches FD to ~1e-9 rel (Stage-0 probe §1). This is the numerical-baseline anchor (close-R2
exemption).

## A3 — convolution-Jacobian + growth-derivative adjoint (`grad_A0_center`, `grad_A0_corner`)

Differentiating `Loss` w.r.t. the **initial field** `A0` exercises the convolution Jacobian
(the kernel) rather than the growth parameters. `U = K∗A0` is linear with Jacobian
`dU_i/dA0_j = K_{i-j}`, and `G'(u) = dG/du = -16·base³·(u-mu)/(9 sigma²)`, so for one step

    dA1_i/dA0_j = delta_ij + dt·G'(U_i)·K_{i-j}
    dLoss/dA0   = resid + adjoint_K(resid·dt·G'(U)),   resid = 2(A1-target).

Independent of A1 in **physical term** (spatial convolution / kernel coupling, not pointwise
growth), **parameter class** (the field, not a growth scalar), and **method** (linear
convolution adjoint, not a growth-parameter derivative). The autodiff field gradient matches
this to machine precision (~1e-14, Stage-0 probe §1; `test_a3_field_conv_exact_closed_form`).
**Source:** convolution linearity + Quad4 growth derivative, hand-derived; the kernel
`K(r)=(4r(1-r))⁴` is grep-cited from `references/Chakazul-Lenia/Python/LeniaF.py:493`.

## D-ANCHOR Stage-0 SHIFT (on evidence)

The charter §4.2 proposed A3 = `dK/d(kernel params)` OR Flow-Lenia. Both are ill-posed: the
landed Quad4 kernel `(4r(1-r))⁴` is parameter-free (only the integer radius `R`), and
Flow-Lenia (arXiv:2212.07906) is a mass-conservation extension, not a differentiable method.
A3 re-declared to the convolution-Jacobian initial-field gradient (which DOES exercise the
kernel via the convolution adjoint, and is well-posed). See
`tools/testkit/probes/reports/lenia-diff.md` §3. HARD-RULE-2 re-declaration on evidence,
NOT a tolerance widening.

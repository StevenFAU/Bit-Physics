# MMS derivation — heat-1d

Derived by `tools/testkit/code_verification/mms/derive.py` (SymPy). The runner
does not re-derive at test time per spec § 2.2; tests assert that this file
is reproducible from the same `derive_*` entry point.

## Manufactured solution

$$u(x, t) = \sin{\left(\frac{2 \pi x}{L} \right)} \cos{\left(t \right)}$$

## Required derivatives

$$\frac{\partial u}{\partial t} = - \sin{\left(t \right)} \sin{\left(\frac{2 \pi x}{L} \right)}$$

$$\frac{\partial^2 u}{\partial x^2} = - \frac{4 \pi^{2} \sin{\left(\frac{2 \pi x}{L} \right)} \cos{\left(t \right)}}{L^{2}}$$

## Source term

Substituting into $u_t = D\,u_{xx} + S$ yields

$$S(x, t) = \frac{\left(4 \pi^{2} D \cos{\left(t \right)} - L^{2} \sin{\left(t \right)}\right) \sin{\left(\frac{2 \pi x}{L} \right)}}{L^{2}}$$

## Boundary conditions

Periodic on $[0, L]$. The manufactured solution is $L$-periodic by
construction (argument $k = 2\pi / L$).

## Verification

`tests/test_derive.py` re-runs `derive_heat_1d()` and asserts that the
returned `source_symbolic` is symbolically equal to the expected residual
form, locking this derivation against unintended drift.

# Golden derivation — RK4 numerical-baseline reference

Backing protocol for the double-pendulum / 6-DOF golden tables
(`tools/testkit/golden/tables/rigid-body-double-pendulum-trajectory.json`,
`rigid-body-6dof-trajectory.json`).

## This is a NUMERICAL baseline, NOT an analytic anchor

The double pendulum and the 6-link chain have no closed-form trajectory (the
double pendulum is chaotic). The golden reference for these tiers is a
**high-precision numerical integration**, explicitly distinguished from the
three analytic single-pendulum anchors (A1/A2/A3). Per plan §6.4 / D-ANCHOR, the
RK4 reference does **not** count toward the "≥3 independent analytic anchors"
requirement (which the single pendulum satisfies on its own).

## Protocol

The reference integrates the **same** Featherstone-ABA forward dynamics
(`aba_forward_dynamics`) as the production sim, but with classic 4th-order
Runge-Kutta at a refined step `h = dt / 100` (`rk4_reference(..., refine=100)`),
sampled back onto the production output grid. RK4's `O(h^4)` local error makes
this baseline ~`100^4`-fold more accurate per production step, so it pins the
trajectory to far below the `trajectory_abs = 1e-2` tolerance over the short
horizons used.

## Stored values

- **Double pendulum** (`theta1_0=0.5, theta2_0=0.7`, point masses, `L=1`,
  `g=9.81`): world Cartesian COM positions `(mass1_xy, mass2_xy)` at steps
  `0,100,200,300,400` (`dt=1e-3`). The comparison is convention-free (Cartesian).
- **6-DOF chain** (`q0=[0.3,-0.2,0.15,-0.1,0.05,-0.05]`, `L=1`, `g=9.81`): total
  mechanical energy at steps `0,100,200,300` — a frictionless chain conserves it;
  the stored series pins the conservation level the production integrator must
  track (`energy_drift_rel_per_second = 1e-3`).

## Independent cross-check

The production dynamics are independently validated against **closed-form**
oracles at `n=1` (`theta''=-(g/L)sin(theta)`) and `n=2` (the standard
double-pendulum equations, `tests/test_double_pendulum.py`); these RK4 tables are
regression anchors that guard the higher-`n` dynamics against future drift.

# strange-attractors — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows
> charter IC-10 (Roy 2005). FACT/INFERENCE-tagged per IC-9 discipline.

## 1. Scope

Family of 3D dynamical-system attractors (Lorenz, Rössler, Aizawa,
Sprott-A, Pickover). Category `closed-form` (spec § 5.1). Variant per
attractor name. Stack A → B (Phase 1: Stack B target only). Non-goals:
2D variants, neural surrogate flows, Lyapunov-spectrum estimation
(Phase 4+).

**Scope amendment (operator-ratified 2026-07-03, Phase-6 X-B/X-C).**
The family is extended by five systems under the same full per-system
discipline (expansion spec § 3.3): **Thomas, Halvorsen** (X-B) and
**Dadras, Chen, Four-wing** (X-C). Algebraic anchors in
[`algebraic.md`](./algebraic.md) §§ 9–13; golden tables per § 7.
(Pickover remains deferred-with-cause; § 7.)

## 2. Upstream and reference anchors

No vendored code at Phase 1; references are textual.

- **Lorenz 1963.** DOI 10.1175/1520-0469(1963)020\<0130:DNF\>2.0.CO;2.
- **Rössler 1976.** DOI 10.1016/0375-9601(76)90101-8.
- **Aizawa 1982.** *Prog. Theor. Phys.* 68 (1), 64–84.
- **Sprott 1994.** DOI 10.1103/PhysRevE.50.R647.
- **Sprott 2003** (textbook). ISBN 978-0-19-850839-7.

Algebraic anchor: [`algebraic.md`](./algebraic.md).

## 3. Algorithm

For each attractor: classical RK4 (Runge–Kutta 4th-order, fixed step)
integration of $\dot{\mathbf{x}} = f(\mathbf{x};\boldsymbol{\theta})$
from a fixed initial condition over a fixed integration horizon at a
fixed seed (seed parametrizes only the initial condition jitter when
the spec calls for a perturbed initial condition; for canonical runs
it is unused and locked to 42).

The sim has no time-stepped PDE structure; "step" semantics are the
RK4 integrator advance.

## 4. Algebraic form

Per [`algebraic.md`](./algebraic.md) §§ 2–6. The canonical golden
table (`tools/testkit/golden/tables/closed-form/lorenz-structural.json`)
encodes **structural invariants of the Lorenz vector field**: the
three fixed points $\{P_0, C_+, C_-\}$ and the three eigenvalues of
$J(P_0)$ at canonical parameters $\sigma=10, \rho=28, \beta=8/3$.
These are anchored independently of any numerical integrator.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests only.
**Phase 2+ implementation contract** (referenced by the IC-8 probe at
[`tools/testkit/probes/reports/strange-attractors.md`](../../../../tools/testkit/probes/reports/strange-attractors.md)):

- Python NumPy reference at
  `packages/strange-attractors/strange_attractors/reference/`
  with one submodule per attractor (`lorenz.py`, `rossler.py`, …).
- Common ODE-system protocol declared in
  `strange_attractors.system.System` (callable returning $f(x,t)$;
  jacobian method optional).
- RK4 integrator at `strange_attractors.integrator.rk4_evolve`.
- Sim wrapper at `strange_attractors.sim.sim_runner_seeded` matching
  the testkit `SimRunner` Protocol from `tools/testkit/determinism/`.
- Stack B WebGPU compute path at `packages/strange-attractors/src/`,
  consuming `@bit-physics/common-ts` (analogous to Phase 0 RD-2D's
  `packages/reaction-diffusion-2d/src/`).

## 6. Verification posture

This sim exercises the following Roy 2005 V&V levels:

### 6.1 Code verification
**Method:** golden-value.
**Fixture(s):**
- `tools/testkit/golden/tables/closed-form/lorenz-structural.json`
  (≥ 3 independent-reference anchors per spec § 2.4; verified by
  `tools/testkit/golden/generator/lorenz_structural.py`).
- Extended 2026-07-03 (X-A): Rössler / Aizawa / Sprott-A structural
  golden tables landed (see § 7 for the full table); Pickover
  deferred-with-cause (§ 7). Phase 1 shipped Lorenz only.

**Pass criterion:** numerical fixed-point coordinates and origin-Jacobian
eigenvalues, evaluated by the sim's Python reference at canonical
parameters, agree element-wise with golden-table values within the
table's declared tolerance (`absolute = 1e-10`, `relative = 1e-12`).

**Phase 1 state:** test committed and failing with module-not-found
(`strange_attractors.reference` and `strange_attractors.sim` do not
yet exist).

### 6.2 Solution verification
**Method:** none.
**Status:** not applicable. The sim has no spatial discretization;
RK4 step-size convergence is a sanity probe, not a Roy 2005 GCI run.

### 6.3 Model validation
**Status:** not applicable. Closed-form attractors are mathematical
artifacts, not physical models. Sprott 1994 § 2 and Lorenz 1963 § 1
discuss the abstract origins; no physical-system calibration is
defined.

### 6.4 Calculation validation
**Status:** not applicable (same rationale as § 6.3).

### 6.5 Gate status
- Gates 1, 2, 3 of spec § 3.5 exercised in this phase.
- Gates 4–10 deferred to the per-sim implementation phase per
  spec § 2.5.
- **X-A family expansion (2026-07-03):** per-system golden-value code
  verification (§ 6.1 tables for rossler / aizawa / sprott_a), PBT
  invariants (§ 6.6 items 3–7), run-twice byte-identical canonical
  captures with real payload checksums, and perf-ledger baseline rows
  are landed and green for the three non-Lorenz systems; Pickover is
  deferred-with-cause (§ 7).

### 6.6 PBT-covered invariants (≥ 2 per R9 amendment / spec § 2.14)
The sim declares the following property-based invariants for Phase 2+
implementation. Stage 2 ships the **declaration**; PBT implementation
is deferred per the standing-order constraint.

1. **`lorenz_origin_volume_contraction`** — the divergence
   $\nabla\cdot f$ of the Lorenz vector field is the trace of $J$,
   which evaluates to $-(\sigma + 1 + \beta) = -41/3$ at every point
   (constant in $\mathbf{x}$). PBT: sample arbitrary IC and arbitrary
   $t$, integrate over a small ball, verify volume contraction rate
   equals $-41/3$ within FP tolerance.
2. **`rk4_time_reversibility_modulo_dissipation`** — for a
   volume-preserving Sprott-A trajectory at sufficiently small dt,
   integrate forward $N$ steps then backward $N$ steps and recover the
   initial state within $O(dt^5)$ error. PBT: sample arbitrary IC and
   $dt \in (0, 0.05]$, verify $\|\mathbf{x}_0 - R(F(\mathbf{x}_0, dt, N), -dt, N)\| < C \cdot dt^4$.

Implementation lives at
`packages/strange-attractors/strange_attractors/invariants.py` (landed
Phase 2; the module-not-found posture above is the historical Stage 2
state).

**X-A family extension (ratified 2026-07-03) — per-system invariants,
all implemented and green:**

3. **`rossler_divergence_affine_in_x`** — Rössler's $\nabla\cdot f =
   a + (x - c)$ (state-dependent, unlike Lorenz) matches a
   central-difference estimate at arbitrary sampled points.
4. **`rossler_fixed_points_null_field`** — the closed-form fixed
   points $y = -z$, $x = az$, $az^2 - cz + b = 0$ annihilate the field
   for arbitrary valid $(a, b, c)$.
5. **`aizawa_divergence_matches_closed_form`** — the trace formula
   $2(z-b) + a - z^2 - e(x^2{+}y^2) + fx^3$ holds anywhere.
6. **`aizawa_axis_fixed_points_null_field`** — every real root of the
   on-axis cubic $z^3 - 3az - 3c = 0$ is a genuine fixed point for
   arbitrary $(a, c)$.
7. **`sprott_a_parity_equivariance`** — $f(Px) = Pf(x)$ exactly for
   $P = \mathrm{diag}(-1,-1,1)$ (the case-A symmetry), complementing
   invariant 2 to give Sprott-A its ≥ 2.

**X-B/X-C scope-amendment extension (ratified 2026-07-03) — all
implemented and green:**

8. **`thomas_divergence_constant`** / **`thomas_cyclic_equivariance`** —
   $\nabla\cdot f = -3b$ anywhere for any $b$; $f(Cx) = Cf(x)$ exactly
   under the cyclic rotation.
9. **`halvorsen_divergence_constant`** / **`halvorsen_cyclic_equivariance`**
   — $-3a$ for any $a$; cyclic equivariance exact.
10. **`dadras_divergence_constant`** / **`dadras_origin_triangular_eigenvalues`**
    — $-p + r - e$ for any $(p,r,e)$; $\mathrm{eig}(J(0)) = (-p, r, -e)$.
11. **`chen_divergence_constant`** / **`chen_fixed_points_null_field`** —
    $c - a - b$ for any $(a,b,c)$; the Lorenz-sibling $C_\pm$ annihilate
    the field wherever $2c > a$.
12. **`fourwing_divergence_constant`** / **`fourwing_parity_equivariance`**
    — $a + d + e$; parity equivariance exact.

## 7. Golden values / Manufactured solutions

Golden tables (one per implemented system; the X-A family expansion,
ratified 2026-07-03, added the three non-Lorenz rows):

| System | Table | Derivation | Generator |
|---|---|---|---|
| lorenz | [`lorenz-structural.json`](../../../../tools/testkit/golden/tables/closed-form/lorenz-structural.json) | [`lorenz-structural.md`](../../../../tools/testkit/golden/derivations/lorenz-structural.md) | [`lorenz_structural.py`](../../../../tools/testkit/golden/generator/lorenz_structural.py) |
| rossler | [`rossler-structural.json`](../../../../tools/testkit/golden/tables/closed-form/rossler-structural.json) | [`rossler-structural.md`](../../../../tools/testkit/golden/derivations/rossler-structural.md) | [`rossler_structural.py`](../../../../tools/testkit/golden/generator/rossler_structural.py) |
| aizawa | [`aizawa-structural.json`](../../../../tools/testkit/golden/tables/closed-form/aizawa-structural.json) | [`aizawa-structural.md`](../../../../tools/testkit/golden/derivations/aizawa-structural.md) | [`aizawa_structural.py`](../../../../tools/testkit/golden/generator/aizawa_structural.py) |
| sprott_a | [`sprott-a-structural.json`](../../../../tools/testkit/golden/tables/closed-form/sprott-a-structural.json) | [`sprott-a-structural.md`](../../../../tools/testkit/golden/derivations/sprott-a-structural.md) | [`sprott_a_structural.py`](../../../../tools/testkit/golden/generator/sprott_a_structural.py) |
| thomas (X-B) | [`thomas-structural.json`](../../../../tools/testkit/golden/tables/closed-form/thomas-structural.json) | [`thomas-structural.md`](../../../../tools/testkit/golden/derivations/thomas-structural.md) | [`thomas_structural.py`](../../../../tools/testkit/golden/generator/thomas_structural.py) |
| halvorsen (X-B) | [`halvorsen-structural.json`](../../../../tools/testkit/golden/tables/closed-form/halvorsen-structural.json) | [`halvorsen-structural.md`](../../../../tools/testkit/golden/derivations/halvorsen-structural.md) | [`halvorsen_structural.py`](../../../../tools/testkit/golden/generator/halvorsen_structural.py) |
| dadras (X-C) | [`dadras-structural.json`](../../../../tools/testkit/golden/tables/closed-form/dadras-structural.json) | [`dadras-structural.md`](../../../../tools/testkit/golden/derivations/dadras-structural.md) | [`dadras_structural.py`](../../../../tools/testkit/golden/generator/dadras_structural.py) |
| chen (X-C) | [`chen-structural.json`](../../../../tools/testkit/golden/tables/closed-form/chen-structural.json) | [`chen-structural.md`](../../../../tools/testkit/golden/derivations/chen-structural.md) | [`chen_structural.py`](../../../../tools/testkit/golden/generator/chen_structural.py) |
| fourwing (X-C) | [`fourwing-structural.json`](../../../../tools/testkit/golden/tables/closed-form/fourwing-structural.json) | [`fourwing-structural.md`](../../../../tools/testkit/golden/derivations/fourwing-structural.md) | [`fourwing_structural.py`](../../../../tools/testkit/golden/generator/fourwing_structural.py) |

**Pickover — deferred-with-cause (operator-voidable), 2026-07-03.** The
commonly cataloged form (algebraic.md § 6) integrates as an ODE but is
**not a strange attractor**: measured under RK4, trajectories from 3 of 4
probe ICs diverge unboundedly in y (max|y| > 2×10⁴) and the fourth
converges to a stable fixed point. It is the classical discrete *map*
mislabeled with dots; a map iterator sits outside § 3 (RK4-only). The
chartered family therefore lands 4 of 5; re-opening requires a source
that documents a genuinely chaotic continuous variant.

No MMS (no PDE).

## 8. Determinism

`bit-exact-same-hw`. See [`determinism.md`](./determinism.md).

## 9. Equivalence

Closed-form category default per
[`tools/testkit/equivalence/tolerance.toml`](../../../../tools/testkit/equivalence/tolerance.toml):
`relative = 1e-5`, `absolute = 0.0`. No per-sim override at Phase 1
(within the tolerance-budget per spec § 2.6; no amendment needed).
See [`equivalence.md`](./equivalence.md).

## 10. Diagnostics

- Tier 1: `diagnostics.tier1.health.check_health` (NaN/Inf scan over
  the trajectory),
  `diagnostics.tier1.performance.check_performance`,
  `diagnostics.tier1.determinism.check_determinism` (re-runs
  `run_twice_and_diff`).
- Tier 2 closed_form (IC-7):
  `diagnostics.tier2.closed_form.check_output_stability`,
  `check_precision_sensitivity`, `check_bound_preservation`.
- Tier 3: not in scope at Phase 1.

## 11. Build and run

Phase 1 — failing-tests only:

```bash
PYTHONPATH=packages/strange-attractors uv run pytest packages/strange-attractors/tests/ -v
```

Phase 2+ (implementation phase) adds the WebGPU local build per Phase
0 RD-2D's pattern (`pnpm` + vitest + a live WebGPU adapter).

## 12. References

- Lorenz, E. N. (1963), op. cit.
- Rössler, O. E. (1976), op. cit.
- Aizawa, Y. (1982), op. cit.
- Sprott, J. C. (1994), op. cit.
- Sprott, J. C. (2003), *Chaos and Time-Series Analysis*, OUP.
- Strogatz, S. H. (1994), *Nonlinear Dynamics and Chaos*, Westview.
- Spec § 5.1, § 2.4 (R9 amendment golden anchors), § 2.5 (determinism),
  § 2.6 (tolerance), § 2.14 (PBT), § 8.2 (spec template).
- Charter § 2.2 (Stage 2 deliverables), § 3.8 (IC-8), § 3.10 (IC-10),
  § 7.4 (closed-form pair).

## 13. Productization status

```yaml
productization:
  web: true      # 5.1 — Stack B WebGPU sim ships as a web demo
  binary: false  # 5.2 — Stack B only; no C++ binary
  pypi: false    # 5.3 — Stack B only; no PyPI package
  render: true   # 5.4 — offline render of attractor point-cloud
  preprint: false # 5.5 — not research-active per spec § 5.1
```

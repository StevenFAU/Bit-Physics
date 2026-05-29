# articulated-pedagogical (Phase 3 task-4)

Reference **articulated rigid-body pendulum** sim on **Stack E** (Python /
NVIDIA Warp). Implements the Featherstone **Articulated-Body Algorithm** (ABA,
reduced/generalized-coordinate forward dynamics; *Rigid Body Dynamics
Algorithms* 2008, Ch. 7 §7.2–§7.3, pp. 123–131) for a planar revolute serial
chain, integrated with **semi-implicit (symplectic) Euler** (default) or **RK4**
(option). "Demonstrates what physics engines do under the hood."

## Tiers

`python -m articulated_pedagogical --tier <tier>`

| tier | system |
|------|--------|
| `single-joint` | simple pendulum (1 revolute joint, point mass) |
| `double-pendulum` | two point masses on massless rods |
| `6-dof` | uniform 6-link chain |
| `N-link` | uniform `--n`-link chain |

## Verification posture

- **Golden anchors (single pendulum, analytic):** small-angle period
  `T0 = 2π√(L/g)` (Marion & Thornton §3.2); large-angle exact period
  `T = 4√(L/g)·K(sin(θ₀/2))` (NIST DLMF §19.2 + §22.19(i) / Landau & Lifshitz
  §11); trajectory `θ(t) = 2·arcsin(sin(θ₀/2)·cn(ω₀t, k))` (DLMF §22.19(i)).
- **Numerical baseline (double-pendulum / 6-DOF):** RK4 at `dt/100` — a
  numerical baseline, **NOT** an analytic anchor.
- **Determinism:** bit-exact same-stack-same-hw (Warp CPU serial launch, f64).
- **PBT invariants:** `energy_drift_bounded`, `momentum_conservation`.

See `docs/sim-specs/rigid-body/articulated-pedagogical/{spec-ref,algebraic}.md`.

## D-ALGO / spec corrigendum

Spec §5.8 names "maximal-coordinate"; the operator-ratified algorithm is **ABA
(reduced-coordinate)** — the coherent reading of the cited Featherstone
reference. See corrigendum A-1 in `docs/spec-amendments-proposed.md`.

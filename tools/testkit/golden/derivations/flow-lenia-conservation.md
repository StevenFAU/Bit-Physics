# flow-lenia — conservation golden derivation

Golden table: `tools/testkit/golden/tables/flow-lenia-conservation.json`
(`algorithm = "flow-lenia-conservation"`, category `continuous-ca`).

Flow Lenia (Plantec et al., ALIFE 2022; arXiv:2212.07906) — mass-conservative Lenia. Matter is
transported by **reintegration tracking**: each cell sends its *full* mass to the flow-displaced
target, distributed over neighbours with weights summing to 1. The Taichi engine runs
convolve (`U = K * A`) → flow (`F = ∇U`) → reintegration scatter (`ti.atomic_add`).

## A1 — exact mass conservation (to summation roundoff)

Total mass after one step:
```
Σ_p A_{t+dt}(p) = Σ_p Σ_{p'} A_t(p')·I(p',p) = Σ_{p'} A_t(p')·(Σ_p I(p',p)) = Σ_{p'} A_t(p')·1 = Σ A_t
```
because the redistribution weights per source cell sum to 1 (`Σ_p I(p',p) = 1`; the bilinear weights
`(1−wi)(1−wj) + (1−wi)wj + wi(1−wj) + wi·wj = ((1−wi)+wi)·((1−wj)+wj) = 1`), and periodic BC keeps all
mass on the torus. **HONEST TOLERANCE (operator instruction):** this holds to floating-point
**summation roundoff (~Nε), NOT bit-exact** — the weights sum to 1 algebraically, but their float sum
carries roundoff. MEASURED rel drift ~1e-16 per step (Stage-1b). The table stores `mass_rel_drift = 0`
(the engine's ~1e-16 is within `absolute 1e-9`). This is the SOUND home of the Phase-3 plain-Lenia
`mass_approximately_conserved` invariant FALSIFIED under Quad4 — re-routed here where it holds by
construction (not widened).

## A2 — non-negativity

The forward bilinear splat redistributes non-negative mass with non-negative weights
(each `∈ [0,1]`) → the output is `≥ 0` everywhere. A distinct invariant (range, not sum) and method
(sign analysis of the splat weights). The table stores the measured `min_mass` as a deterministic
regression lock; the separate test asserts `min ≥ 0`.

## A3 — zero-flow identity (exact)

With `F ≡ 0` the target is `(i + dt·0, j + dt·0) = (i, j)` and the bilinear weights collapse to
`(1, 0, 0, 0)`, so each cell maps to itself with weight 1 → the mass field is unchanged pointwise,
**EXACTLY**. MEASURED residual 0.0 (`np.array_equal`). The advection-by-zero-velocity degenerate
case; distinct from A1/A2 (a pointwise identity, not a sum/range property).

## Determinism vs conservation (distinct)

Run-to-run determinism is **bit-exact** (Taichi CPU single-thread serial fixes the `ti.atomic_add`
scatter order; MEASURED `np.array_equal` step + rollout). The mass INVARIANT is conserved only to
**summation roundoff** — the two are declared separately (registry
`[continuous-ca.flow-lenia]` `atomic_ops = "sum-only"`; golden A1 tolerance is the summation bound).

## Scope notes

The flow is the affinity gradient `F = ∇U`; the conservation / non-negativity / zero-flow invariants
are **flow-agnostic** (properties of the reintegration transport). The full α-weighted Flow Lenia
flow `F = (1−α)∇U − α∇A_Σ` (arXiv:2212.07906) is a documented extension (invariants unchanged); the
reintegration uses the bilinear-splat (point-distribution) limit of the paper's uniform square
distribution `D` — both redistribute the full mass (weights summing to 1).

## Tolerance

`tolerance = {absolute: 1e-9, relative: 1e-7}` (table-global). A1 ~1e-16 and A3 0.0 are within it; A2
is an exact deterministic regression. Per-anchor named tolerances:
`tools/testkit/equivalence/tolerance.toml [golden_tolerance.continuous-ca.lenia-flow]`.

## Parent-vs-frontier (gate-14 N/A, single-stack)

REFRAMED to the invariant posture (plan §8.4): the mass-conservation / non-negativity / zero-flow
invariants hold, not a trajectory match vs grid Lenia (Flow Lenia is *intentionally* not pointwise
equal to base Lenia — different transport dynamics).

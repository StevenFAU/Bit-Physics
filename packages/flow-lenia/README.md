# flow-lenia

Phase-4 batch-3 sim 3/3 (frontier-algorithm batch; FINAL).

Mass-conservative **Flow Lenia** (Plantec et al., ALIFE 2022; arXiv:2212.07906). Matter is
transported by **reintegration tracking**: each cell redistributes its *full* mass to the
flow-displaced neighbours (the redistribution weights sum to 1), so the total mass `Σ A` is conserved
**by construction** — to floating-point **summation roundoff (~Nε), NOT bit-exact** (the honest
tolerance; the weights sum to 1 algebraically, their float sum carries roundoff).

## Anchors (Stack D / Taichi engine; ≥3 independent)

- **A1** — exact mass conservation: `Σ A_{t+dt} == Σ A_t` to summation roundoff (MEASURED; regime:
  periodic BC). This is the SOUND home of the Phase-3 plain-Lenia `mass_approximately_conserved`
  invariant that was FALSIFIED under Quad4 — re-routed here where it holds by construction (not
  widened).
- **A2** — non-negativity: bilinear-splat of non-negative mass with non-negative weights → `A ≥ 0`.
- **A3** — zero-flow identity: `F ≡ 0` ⇒ each cell maps to itself with weight 1 ⇒ `A` unchanged
  pointwise (EXACT).

The flow is the affinity gradient `F = ∇U` (`U = K * A`); the conservation / non-negativity /
zero-flow invariants are **flow-agnostic** (properties of the reintegration transport). The full
α-weighted Flow Lenia flow `F = (1−α)∇U − α∇A_Σ` is a documented extension (invariants unchanged);
the reintegration uses the bilinear-splat (point-distribution) limit of the paper's uniform square
distribution `D` (both redistribute the full mass).

## Determinism vs conservation (distinct)

Run-to-run determinism is **bit-exact** (Taichi CPU single-thread serial fixes the `ti.atomic_add`
scatter order). The mass INVARIANT is conserved only to **summation roundoff** — the two are
declared separately.

## CLI

```
python -m flow_lenia --grid 32 --steps 40    # rollout; prints mass drift + min mass
```

Single-stack (gate-14 N/A; parent-vs-frontier REFRAMED to the invariant posture). NO tag (I7).

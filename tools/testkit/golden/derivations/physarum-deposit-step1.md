# Derivation — physarum 4-agent single-step deposit golden

> **Canonical reference:** Jones, J. (2010), "Characteristics of
> pattern formation and evolution in approximations of *Physarum*
> transport networks", *Artificial Life* 16 (2), 127–153.
> DOI 10.1162/artl.2010.16.2.16202.

## 1. Configuration

A $16 \times 16$ trail map $T$, initially all zero. Four agents at
known integer positions and integer-direction headings (cardinal):

| Agent | $\mathbf{p}$ | heading | new position after $L_m=1$ move |
|---|---|---|---|
| 0 | $(4, 4)$ | $(+1, 0)$ (east) | $(5, 4)$ |
| 1 | $(11, 4)$ | $(-1, 0)$ (west) | $(10, 4)$ |
| 2 | $(4, 11)$ | $(0, +1)$ (north) | $(4, 12)$ |
| 3 | $(11, 11)$ | $(0, -1)$ (south) | $(11, 10)$ |

Per-step parameters: $\Delta\phi = 45°$, $L_s = 9$, $L_m = 1$,
$d = 5.0$, $\alpha = 0.1$.

Since the initial trail is **zero everywhere**, the sense step
produces three identical zero-readings; the rotate step is a tie →
no rotation (canonical tie-breaker: keep current heading). The move
step advances each agent by exactly $L_m = 1$ along its cardinal
heading; the deposit step writes $d = 5.0$ to the cell at the new
position.

## 2. Post-deposit trail map (before diffuse+decay)

The trail map has exactly four non-zero cells:

- $T(5, 4) = 5.0$ (agent 0 moved east)
- $T(10, 4) = 5.0$ (agent 1 moved west)
- $T(4, 12) = 5.0$ (agent 2 moved north)
- $T(11, 10) = 5.0$ (agent 3 moved south)

All other cells remain $0$.

This is closed-form arithmetic: no stochastic decisions occurred
(zero-trail map forces deterministic tie-breaks), so every value is
predictable from § 1 alone.

## 3. Post-decay sum (after step 5 diffuse-and-decay)

Total trail mass before decay: $4 \cdot 5.0 = 20.0$.
After global decay $T \leftarrow T(1 - \alpha)$ with $\alpha = 0.1$:
total mass $= 20.0 \cdot 0.9 = 18.0$.

(Diffusion is mass-preserving for a 3×3 box-blur with periodic
boundary, so the only mass change is from the decay coefficient.)

## 4. Independent-reference anchors

Per spec § 2.4 (R9 amendment), the following independent anchors
substantiate the golden values:

1. **Hand-derivation** in §§ 1–3 above — every value follows from
   the formulae in
   `docs/sim-specs/agent-based/physarum/algebraic.md` § 2 with
   stochastic decisions resolved by the canonical "keep current
   heading on tie" tie-breaker.
2. **Jones 2010 § 3, Table 1** — canonical parameters and the
   five-component update order; the deterministic regime
   (zero-trail) is the limiting case discussed in § 2 (the agents
   walk straight until a trail develops).
3. **Python independent re-derivation** by the generator script at
   `tools/testkit/golden/generator/physarum_deposit_step1.py`.

## 5. Generator contract

`tools/testkit/golden/generator/physarum_deposit_step1.py --verify`
loads the table and re-derives all four deposit cells from the
parameters in § 1. PHASE 1 ships this generator; PHASE 2+ adds the
sim-side cross-check at
`packages/physarum/tests/test_deposit_golden.py`.

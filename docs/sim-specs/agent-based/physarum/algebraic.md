# physarum — Algebraic derivation

> Per charter § 7.5. FACT-tagged.

## 1. Scope

**FACT — citation.** Jones, J. (2010), "Characteristics of pattern
formation and evolution in approximations of *Physarum*
transport networks", *Artificial Life* 16 (2), 127–153.
DOI [10.1162/artl.2010.16.2.16202](https://doi.org/10.1162/artl.2010.16.2.16202).

State: $N$ agents on a $W \times H$ (2D) or $W \times H \times D$
(3D) trail map $T$. Per-agent state: position $\mathbf{p}_i$,
heading $\theta_i$ (2D) or quaternion (3D).

## 2. Five-component update per step

1. **Sense** — agent $i$ samples $T$ at three offsets ahead of its
   heading by sense distance $L_s$ at angles $(-\Delta\phi, 0, +\Delta\phi)$.
2. **Rotate** — agent steers toward the highest-trail neighbor; tie
   → random.
3. **Move** — advance by step size $L_m$ along the new heading.
4. **Deposit** — write a constant $d$ to $T$ at the new position.
5. **Diffuse + decay** — global 3×3 box-blur then $T \leftarrow T(1-\alpha)$.

**Canonical parameters** (Jones 2010 § 3, Table 1):
$\Delta\phi = 45°$, $L_s = 9$, $L_m = 1$, $d = 5$, $\alpha = 0.1$.

## 3. Single-step deposit golden (closed-form anchor)

The golden table at
`tools/testkit/golden/tables/agent-based/physarum-deposit-step1.json`
fixes 4 agents at known positions and headings on a $16 \times 16$
zero-trail map and reports the trail map immediately after **step 4
(deposit)**, before the diffuse+decay. The result is closed-form
arithmetic: each agent moves $L_m = 1$ along its heading then writes
$d = 5$ to the destination cell. The post-deposit grid has exactly
four non-zero cells whose locations are computable in advance.

This deposit-only anchor is the spec § 5.3 "canonical-seeded
baseline" stripped of stochastic steering — the closed-form layer
under the chaotic full sim.

## 4. Chaotic-regime distributional comparison

Beyond the single-step anchor, cross-stack equivalence uses
**distributional** metrics on the trail-density histogram at a long
horizon (per Jones 2010 § 5 — chaotic pattern formation). Stage 2
declares; Phase 2+ implements EFECT (spec § 2.5) or χ² baseline.

# Derivation — Boids 3-agent fixture, step 1 velocity update

> **Canonical references:**
> - Reynolds, C. W. (1987), "Flocks, herds and schools: A distributed
>   behavioral model", *SIGGRAPH '87*, *ACM SIGGRAPH Computer
>   Graphics* 21 (4), 25–34. DOI 10.1145/37401.37406.
> - Reynolds, C. W. (1999), "Steering Behaviors for Autonomous
>   Characters", *Game Developers Conference 1999*,
>   <https://www.red3d.com/cwr/steer/> — canonical-weights reference.

This golden table fixes 3 agents at known positions and velocities
and reports the post-step velocity computed in closed form per the
update rules in
[`docs/sim-specs/agent-based/boids-3d/algebraic.md`](../../../../docs/sim-specs/agent-based/boids-3d/algebraic.md)
§ 3. The closed-form arithmetic for the 3-agent case is small enough
to hand-derive directly from the formulae.

## 1. Configuration

Agents (`A`, `B`, `C`) at:

| Agent | $\mathbf{p}$ | $\mathbf{v}$ |
|---|---|---|
| A | $(0, 0, 0)$ | $(1, 0, 0)$ |
| B | $(1, 0, 0)$ | $(-1, 0, 0)$ |
| C | $(0, 1, 0)$ | $(0, 0, 1)$ |

Pairwise distances: $\|A-B\| = 1$, $\|A-C\| = 1$, $\|B-C\| = \sqrt 2$.

Parameters: $w_s = 1.5$, $w_a = 1.0$, $w_c = 1.0$,
$r_{\mathrm{perc}} = 5.0$, $v_{\max} = 3.0$, $\Delta t = 0.05$.

(All three pairs lie within $r_{\mathrm{perc}}$, so every agent sees
the other two.)

## 2. Per-agent steering — closed form

### Agent A (neighbors B, C)

- $\mathbf{f}^{\mathrm{sep}}_A = (A - B)/1 + (A - C)/1 = (-1, -1, 0)$.
- $\mathbf{f}^{\mathrm{align}}_A = \tfrac{1}{2}\bigl((-1,0,0) + (0,0,1)\bigr) - (1,0,0) = (-1.5, 0, 0.5)$.
- $\mathbf{f}^{\mathrm{coh}}_A = \tfrac{1}{2}\bigl((1,0,0) + (0,1,0)\bigr) - (0,0,0) = (0.5, 0.5, 0)$.
- Total: $1.5(-1,-1,0) + (-1.5, 0, 0.5) + (0.5, 0.5, 0) = (-2.5, -1.0, 0.5)$.
- $\mathbf{v}_A^{n+1} = (1,0,0) + 0.05 \cdot (-2.5, -1.0, 0.5) = (0.875, -0.05, 0.025)$.
- $\|\mathbf{v}_A^{n+1}\| \approx 0.8768 < v_{\max} = 3.0$; no clamp.

### Agent B (neighbors A, C)

- $\mathbf{f}^{\mathrm{sep}}_B = (B-A)/1 + (B-C)/\|B-C\|^2 = (1,0,0) + (1,-1,0)/2 = (1.5, -0.5, 0)$.
- $\mathbf{f}^{\mathrm{align}}_B = \tfrac{1}{2}((1,0,0)+(0,0,1)) - (-1,0,0) = (1.5, 0, 0.5)$.
- $\mathbf{f}^{\mathrm{coh}}_B = \tfrac{1}{2}((0,0,0)+(0,1,0)) - (1,0,0) = (-1, 0.5, 0)$.
- Total: $1.5(1.5, -0.5, 0) + (1.5, 0, 0.5) + (-1, 0.5, 0) = (2.75, -0.25, 0.5)$.
- $\mathbf{v}_B^{n+1} = (-1, 0, 0) + 0.05 \cdot (2.75, -0.25, 0.5) = (-0.8625, -0.0125, 0.025)$.

### Agent C (neighbors A, B)

- $\mathbf{f}^{\mathrm{sep}}_C = (C-A)/1 + (C-B)/2 = (0,1,0) + (-0.5, 0.5, 0) = (-0.5, 1.5, 0)$.
- $\mathbf{f}^{\mathrm{align}}_C = \tfrac{1}{2}((1,0,0)+(-1,0,0)) - (0,0,1) = (0, 0, -1)$.
- $\mathbf{f}^{\mathrm{coh}}_C = \tfrac{1}{2}((0,0,0)+(1,0,0)) - (0,1,0) = (0.5, -1, 0)$.
- Total: $1.5(-0.5, 1.5, 0) + (0, 0, -1) + (0.5, -1, 0) = (-0.25, 1.25, -1.0)$.
- $\mathbf{v}_C^{n+1} = (0, 0, 1) + 0.05 \cdot (-0.25, 1.25, -1.0) = (-0.0125, 0.0625, 0.95)$.

## 3. Position update

$\mathbf{p}_i^{n+1} = \mathbf{p}_i^n + \Delta t \cdot \mathbf{v}_i^{n+1}$.

| Agent | $\mathbf{p}^{n+1}$ |
|---|---|
| A | $(0.04375, -0.0025, 0.00125)$ |
| B | $(0.956875, -0.000625, 0.00125)$ |
| C | $(-0.000625, 1.003125, 0.0475)$ |

## 4. Independent-reference anchors

Each of the values in §§ 2–3 carries the following anchors:

1. **Hand-derivation** in this `.md` — every value can be computed
   directly from the formulae in
   `docs/sim-specs/agent-based/boids-3d/algebraic.md` § 3.
2. **Reynolds 1987 § 2** — defines the three rules (separation,
   alignment, cohesion) verbatim; the arithmetic above is the direct
   substitution.
3. **Reynolds 1999** — canonical-weights reference; the values for
   $w_s = 1.5$, $w_a = 1.0$, $w_c = 1.0$ originate here.
4. (auxiliary) **Python independent re-derivation** — the generator
   script
   `tools/testkit/golden/generator/boids_3agent_step1.py` reproduces
   the table from the same formulae and the test suite re-checks at
   load time.

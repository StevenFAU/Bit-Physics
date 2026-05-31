# particle-lenia

Phase-4 batch-3 sim 2/3 (frontier-algorithm batch).

Energy-based **Particle Lenia** (Mordvintsev, Niklasson, Randazzo 2022 — Google Research
Self-Organising Systems, *"Particle Lenia and the energy-based formulation"*,
<https://google-research.github.io/self-organising-systems/particle-lenia/>). Particles carry a
Lenia field `U(x) = Σ_j K(|x − p_j|)`, a growth map `G(U)`, a repulsion field `R(x)`, and a
per-particle energy field `E(x) = R(x) − G(U(x))`. The **canonical LOCAL rule** integrates
`dp_i/dt = −∇E(p_i)` — each particle greedily minimises its OWN local energy.

## LOCAL rule — energy is NOT monotonic

The canonical model uses **local** energy minimisation; the article explicitly contrasts this with a
global-descent rule and notes the local rule's *total* energy is not monotone. So **no Lyapunov /
energy-monotonicity golden** — it would be unsound here. The rigorous moat is the **force / symmetry
invariant**, not the trajectory.

## Anchors (Stack D / Taichi engine; ≥3 independent)

- **A1** — the Taichi engine's per-particle force `−∇E(p_i)` vs an independent NumPy analytic
  closed-form gradient mirror (hand-derived chain rule through `K`, `G`, `R`).
- **A2** — central finite differences of `E` (independent numerical method).
- **A3** — translation invariance of the TOTAL energy `E_total(P + δ) == E_total(P)` (exact
  symmetry; equivalently `Σ_i ∇_{p_i} E_total = 0`). The LOCAL force sum is NOT zero (the local rule
  does not conserve momentum); the sound anchor is the global-energy invariance.

## CLI

```
python -m particle_lenia --n 200 --steps 100      # rollout; prints E_total trace + force residual
```

Single-stack (gate-14 N/A; parent-vs-frontier REFRAMED to the invariant posture — Particle Lenia is
particle-based, not pointwise-comparable to grid Lenia). NO tag (I7). `bit-exact same-stack-same-hw`
(Taichi CPU single-thread serial, f64).

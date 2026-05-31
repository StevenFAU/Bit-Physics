# particle-lenia — gradient golden derivation

Golden table: `tools/testkit/golden/tables/particle-lenia-gradient.json`
(`algorithm = "particle-lenia-gradient"`, category `continuous-ca`).

Particle Lenia (Mordvintsev, Niklasson, Randazzo 2022 — Google Research Self-Organising Systems,
*"Particle Lenia and the energy-based formulation"*,
<https://google-research.github.io/self-organising-systems/particle-lenia/>). Each particle carries
a Lenia field, a growth map, a repulsion field, and a per-particle energy field; the **canonical
LOCAL rule** moves each particle down its OWN local energy gradient.

## Energy

```
U(x) = Σ_j K(|x − p_j|),     K(r) = w_k·exp(−(r − μ_k)² / σ_k²)
G(u) = exp(−(u − μ_g)² / σ_g²)
R(x) = (c_rep/2)·Σ_{j: p_j≠x} max(1 − |x − p_j|, 0)²
E(x) = R(x) − G(U(x))
```

Canonical LOCAL dynamics: `dp_i/dt = −∇E(p_i)`, forward Euler `dt`. SOS-article 2D defaults
`μ_k=4, σ_k=1, w_k=0.022; μ_g=0.6, σ_g=0.15; c_rep=1; dt=0.1`.

## LOCAL vs GLOBAL — no Lyapunov golden (operator anchor correction)

The canonical model uses **local** energy minimisation — each particle minimises its *own* energy
without considering its influence on others. The article explicitly contrasts this with a
global-descent rule and notes the local rule's **total energy is NOT monotone**. So an
energy-monotonicity / Lyapunov golden would be **UNSOUND** and is NOT used. The rigorous anchors are
the force/symmetry invariants below. (A global-descent variant *would* admit a Lyapunov test, but the
canonical sim is local.)

## A1 — analytic per-particle force `−∇E(p_i)` (closed form)

`∇E = ∇R − G'(U)·∇U` with `∇U = Σ_j K'(r)·(d/r)`, `∇R = −c_rep·Σ_j max(1−r,0)·(d/r)`, summed over
`j ≠ i` (the singular self-distance excluded). The Taichi engine implements this analytic gradient;
A1's reference is an INDEPENDENT NumPy implementation of the same closed form — a bit-faithful
cross-implementation check (the smoke-diff NumPy-mirror pattern). MEASURED engine-vs-mirror
max-abs ~1e-22 (Stage-1b). Source: the SOS article (hand-derived gradient).

## A2 — central finite-difference baseline (numerical, independent)

`−∇E ≈ −(E(x+ε) − E(x−ε))/(2ε)`, `ε=1e-6`, `O(ε²)`. An independent numerical method cross-checking
the engine force. MEASURED engine-vs-FD relerr ~2.4e-10 (Stage-1b). The table stores the FD value as
`expected`.

## A3 — translation invariance of the TOTAL energy (exact symmetry)

`E_total` depends only on pairwise distances, so `E_total(P + δ) == E_total(P)` exactly for any
uniform shift `δ` (equivalently `Σ_i ∇_{p_i} E_total = 0` — a Noether-like momentum identity).
MEASURED residual ~1e-16 (machine-exact, Stage-1b). **NOTE:** the LOCAL force sum `Σ_i ∇E(p_i)` is
NOT zero (the local rule does not conserve momentum); the sound symmetry anchor is the GLOBAL-energy
invariance, not the local-force sum. Distinct in quantity (a scalar-energy symmetry, not a force) and
method (algebraic distance-invariance, not differentiation). The table stores `expected = 0`.

## Tolerance

`tolerance = {absolute: 1e-6, relative: 1e-5}` (table-global). A1 is machine-exact (~1e-22); A2 sits
at the FD floor (~1e-10); A3 is machine-exact (~1e-16) — all within the table tolerance. Per-anchor
named tolerances:
`tools/testkit/equivalence/tolerance.toml [golden_tolerance.continuous-ca.lenia-particle]`.

## Parent-vs-frontier (gate-14 N/A, single-stack)

Particle Lenia is **particle-based**; grid Lenia (`packages/lenia/`) is grid-based → not
pointwise-comparable. The parent-vs-frontier equivalence is REFRAMED to the **invariant posture**
(plan §8.4): the rigorous force/symmetry anchors hold, not a trajectory match.

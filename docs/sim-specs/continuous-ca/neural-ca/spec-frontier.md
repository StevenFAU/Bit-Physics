# spec-frontier.md — neural-ca (frontier-difflogic variant)

> **Status:** IN-BUILD (Phase-6 cluster C-1, unit U-2). De-stubbed from the Phase-4.0
> pre-stage slot at C-1 U-2 stage 1c.
> **Parent reference sim:** `docs/sim-specs/continuous-ca/neural-ca/spec-ref.md`.
> **Variant type:** `frontier-difflogic`. **Primary stack:** D (Taichi).
> **Package:** `packages/neural-ca-frontier-difflogic/` (import `neural_ca_frontier_difflogic`).
> **Foundation consumed:** § 4.2.A (WU-A autodiff substrate `common_py.autodiff`).
> **Frontier paper:** Miotti, Niklasson, Randazzo, Mordvintsev, "Differentiable Logic
> Cellular Automata: From Game of Life to Pattern Generation", arXiv:2506.04912, ALIFE
> 2025 (Google Paradigms of Intelligence) — live-verified at the C-1 charter § 2 row 6
> (SHIFT S-4: in-repo "2024" year corrected). CITE-DON'T-IMPORT.
> **Stage-0 probe:** `docs/_audits/phase-6/c1-u2-difflogic-ca-probe-2026-06-11T14-37-07Z.md`.
> **Charter:** `docs/phases/phase-6/c1-charter.md` § 3.2 (RATIFIED § 10, D-3).

## § 1 Scope (ratified D-3: batch-3 § 3.4 frozen-gate scoping governs)

A CA whose update rule is a **hand-constructed, FROZEN circuit** of the 16 two-input
boolean gates realised as multilinear extensions (the relaxed-gate hard limit of the
frontier paper). The circuit computes Conway's Game of Life exactly in the hard limit; on
soft (real-valued) states it is a smooth polynomial — the tape-differentiable surface
consumed through WU-A (`SoftExcitationID`: recover a soft-excitation amplitude `alpha`
from the observed final state). **No training ⇒ no training-loss distribution ⇒ no
EFECT.** A *trained-gate* variant (the paper's learned circuits) is explicitly OUT of this
scope (a future learned-CA candidate; batch-3 § 3.4).

## § 2 Update rule

Per cell: gather the periodic 3×3 neighborhood; evaluate the 36-wire circuit — 8-neighbor
popcount via a full/half-adder tree (XOR/AND/OR gates) → 4 count bits → equality tests
(n==2, n==3) → `alive' = OR(n3, AND(center, n2))`. Gates are multilinear:
`g(a,b) = t00(1-a)(1-b) + t01(1-a)b + t10·a(1-b) + t11·ab` — exact at corners,
[0,1]-preserving, branch-free (smooth for the tape).

## § 3 Verification surfaces

1. **Exhaustive GoL equality (gate 4 / A2):** circuit == Gardner-1970 rule on ALL 512
   input configurations, exact; blinker period-2 + glider (1,1)/4-step fixtures; kernel
   == pure-Python evaluator on random soft states (≤1e-15). `tests/test_gol_circuit.py`.
2. **Gradient golden table (gate 4, ≥3 anchors):**
   `tools/testkit/golden/tables/neural-ca-frontier-difflogic-gradient.json` — see § 8.
3. **Inverse recovery:** planted `alpha` recovered (<1e-3). `tests/test_inverse_recovery.py`.

**Parent-equivalence posture (REFRAMED, plan § 8.4 acceptance language):** the landed
`neural-ca` parent is a *trained* NCA (different update family); pointwise
parent-vs-frontier equivalence is not meaningful. The frontier equivalence gate is
REFRAMED to the exact circuit goldens above (the batch-3 anchor strategy), documented
here per spec § 6 discipline.

## § 4 Determinism

MEASURED bit-exact, same-stack-same-hw (single-thread CPU f64; forward atomic-free,
loss reduction sum-only). Hard trajectory, soft forward, and gradient all bit-identical
run-to-run (`tests/test_determinism.py`). No EFECT. Registry:
`[continuous-ca.neural-ca-frontier-difflogic.{forward,gradient}]`.

## § 5 Capture

Inverse-solution capture (recovered final soft state + gradient), schema 1.1.0
`gradient_fields` (`dLoss_dalpha`). Descriptor
`neural-ca-difflogic-recover-alpha-16sq-seed42` — **descriptor SHIFT vs Appendix D.2.3**
(its `growing-emoji-…` row names the parent's trained-emoji test; the U-1/batch-1
problem-scoped precedent applies; routed to cluster-close with D-6). Manifest sim.name
`neural-ca`, variant `frontier-difflogic`, category `continuous-ca`.

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`hard_limit_matches_truth_table`** (variant-axis): every gate exact at all binary
   corners. **Regime:** binary inputs; EXACT equality, no tolerance.
2. **`gradient_matches_finite_difference`** (WU-A differentiable): autodiff
   `dLoss/dalpha` ≈ central FD ≤ 1e-3. **Regime:** `alpha ∈ [0,1]` (smooth polynomial).
3. *(supporting)* `soft_gate_output_bounded`: multilinear gates map [0,1]² → [0,1].

`packages/neural-ca-frontier-difflogic/neural_ca_frontier_difflogic/invariants.py`;
`tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Miotti, Niklasson, Randazzo, Mordvintsev (2025), arXiv:2506.04912, ALIFE 2025 — the
  frontier method (relaxed differentiable logic gates + NCA).
- Gardner, M. (1970), *Sci. Am.* 223(4) — Conway's Game of Life (the A2 rule source).
- Mordvintsev et al. (2020), *Distill* — the parent NCA lineage (spec Appendix A.1).

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

1. **A1 — multilinear gate closed forms** (hand-derived bilinear interpolation): exact
   corners (hard limit) + midpoint `g(0.5,0.5) = mean(truth table)`.
2. **A2 — exhaustive-512 GoL equality** vs the published rule (Gardner 1970) + blinker /
   glider trajectory fixtures — a complete exact golden over the whole input space.
3. **A3 — central-FD baseline** on `dLoss/dalpha` through the 2-step soft circuit
   (independent numerical method; ad-vs-FD ~1e-11 rel measured at table-build).

**D-TOL:** goldens are exact (A1/A2) or table-tolerance (A3); tolerance routing stays the
existing `continuous-ca` category (bit-exact 0.0/0.0) — charter § 3.2; no new category.

## § 9 Replayable capture

`captures/neural-ca-frontier-difflogic/neural-ca-difflogic-recover-alpha-16sq-seed42.{h5,json}`
+ corpus seed `tests/fixtures/legacy-captures/phase-6-c1-neural-ca-frontier-difflogic.{h5,json}`
(LFS; stage 1c).

## § 10 Determinism ↔ capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"` ↔ § 4 registry rows.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Canonical-solve wall-clock row in `docs/perf-ledger.md` (gate-12; stage 1c).

## § 13 Gate-13

Failing-tests evidence replayed at landing (B-2 recipe; evidence captured with the replay
tool's exact pytest flags at stage 1a).

## Gate-14 / mutation

**gate-14 N/A** — single-stack frontier (no cross-stack sibling); the REFRAMED exact
circuit goldens are the frontier equivalence (§ 3). **Mutation target** (§ 8.7,
advisory): `neural_ca_frontier_difflogic`. Registered at stage 1c; measurement deferred
(batch-1 close precedent).

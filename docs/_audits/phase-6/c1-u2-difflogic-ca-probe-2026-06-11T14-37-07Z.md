# C-1 / U-2 `neural-ca-frontier-difflogic` — pre-implementation probe (gate 2)

> **Cluster:** Phase 6 / C-1 (charter `docs/phases/phase-6/c1-charter.md`, RATIFIED § 10; D-3
> ratified: batch-3 frozen-gate scoping governs).
> **Unit:** U-2 = Phase-4 ledger row 28 / spec § 11.5 item 4.20 —
> `continuous-ca/neural-ca` frontier-difflogic variant, Stack D + § 4.2.A.
> **Session:** build dispatch 2026-06-11; probe at HEAD `9a0d733` (U-1 landed, CI 10/10 green).

## § 1 — Landed surface (measured at HEAD)

- **Greenfield confirmed:** no soft-logic-gate / difflogic code exists anywhere in
  `packages/` (grep difflogic|logic_gate — doc references only).
- **Parent:** `packages/neural-ca/python/` (PyTorch trained NCA, `growing-emoji` capture,
  category `continuous-ca`). The difflogic variant is a *different update family*
  (frozen logic-gate circuit, not a trained perception net): per plan § 8.4 acceptance
  language, parent-vs-frontier equivalence is **REFRAMED** to the exact gate/GoL goldens —
  there is no meaningful pointwise equivalence against a trained-emoji NCA. Documented in
  spec § 6; this matches the batch-3 scope which anchors on truth tables + a deterministic
  CA, not on the parent.
- **Structural exemplars:** `packages/particle-lenia` / `packages/flow-lenia` (batch-3
  Stack-D frontier shape: forward.py + _kernels + invariants + sim, golden anchors,
  bit-exact registry) + U-1 `sph-water-diff` (WU-A `InverseProblem` consumption, capture
  with `gradient_fields`, gate-13 byte-stable evidence recipe).
- **Anchor:** Miotti, Niklasson, Randazzo, Mordvintsev (Google), "Differentiable Logic
  Cellular Automata", arXiv:2506.04912, ALIFE/ISAL 2025 — live-verified at charter § 2
  row 6 (SHIFT S-4: the in-repo "2024" year corrected to 2025).

## § 2 — Ratified scope (D-3: batch-3 § 3.4 governs, verbatim conditions)

(a) the **16 binary logic gates' exact truth tables in the hard limit** (closed-form
goldens); (b) a **hand-constructed circuit reproducing an exact deterministic CA**
(Game-of-Life transition); (c) **gradient-matches-FD through the soft gates** (WU-A).
Frozen/hand-set gates, **no training ⇒ no training-loss distribution ⇒ no EFECT**.

## § 3 — Plan of record

- **Gate set:** the 16 two-input boolean functions as their **multilinear extensions**
  (the unique bilinear interpolation of each truth table; e.g. AND=ab, OR=a+b−ab,
  XOR=a+b−2ab, NAND=1−ab, …) — smooth on [0,1]², EXACT at binary corners in f64 (small-int
  arithmetic), [0,1]-preserving. Hand-derivation is the A1 anchor source.
- **GoL circuit (hand-constructed, frozen):** 8-neighbor popcount via a full/half-adder
  tree (XOR/AND/OR gates) → 4 count bits → equality tests (n==2, n==3) → 
  `alive' = OR(n3, AND(center, n2))`. ~35 gates encoded as a wire list in `forward.py`;
  verified **exhaustively over all 512 (center × 256 neighborhood) configurations**
  against the direct GoL rule (Gardner 1970 / Conway) — an exact, complete golden, plus
  blinker + glider trajectory fixtures on a 16² torus.
- **WU-A consumption (§ 4.2.A):** `SoftExcitationID(InverseProblem)` — a scalar `alpha`
  blends a soft excitation into one cell of the initial state; forward = K soft-CA steps
  (multilinear gates on real-valued state); loss = L2 vs target final state;
  `check_gradient` vs central FD; planted-`alpha` recovery.
- **Anchors (≥3):** A1 = 16 truth tables in the hard limit + multilinear midpoint values
  (closed form, hand-derived); A2 = exhaustive-512 GoL-circuit equality + blinker/glider
  fixtures (independent source: the GoL rule itself); A3 = central-FD gradient baseline
  (WU-A; distinct numerical method). Golden table
  `tools/testkit/golden/tables/neural-ca-frontier-difflogic-gradient.json`.
- **PBT (≥2, charter § 3.2):** `hard_limit_matches_truth_table` (random gate × corner —
  exact) + `gradient_matches_finite_difference` (rel 1e-3); candidate third
  `soft_gate_output_bounded` ([0,1]-preservation).
- **Posture expectation:** **bit-exact same-stack-same-hw** (per-cell independent writes,
  no atomics in forward; loss reduction sum-only on the gradient surface) — MEASURE then
  declare `[continuous-ca.neural-ca-frontier-difflogic.{forward,gradient}]`. No EFECT.
- **Capture:** `captures/neural-ca-frontier-difflogic/gol-glider-16sq-seed42-step32.{h5,json}`
  — **descriptor SHIFT vs Appendix D.2.3** (its locked `growing-emoji-64sq-seed42-step1000`
  names the parent's trained-emoji test, semantically wrong for a frozen GoL circuit; the
  U-1/batch-1 problem-scoped-descriptor precedent applies; routed to cluster-close with
  D-6). Manifest sim.name `neural-ca`, variant `frontier-difflogic`, category
  `continuous-ca`, schema 1.1.0 with `gradient_fields` (`dLoss_dalpha`). Corpus seed
  `tests/fixtures/legacy-captures/phase-6-c1-neural-ca-frontier-difflogic.{h5,json}`
  (lock 36→37).
- **Tolerance routing:** existing `continuous-ca` category (bit-exact 0.0/0.0) — charter
  § 3.2; goldens are exact; no new category.
- **Commits:** stage-1a scaffold+RED (forwards stubbed; evidence via the B-2 worktree
  `--generate` recipe THIS time, with `TMPDIR=~/.cache/bp-tmp` + `GIT_LFS_SKIP_SMUDGE=1`,
  banked at U-1) → stage-1b GREEN+golden → stage-1c perf/CI/corpus/mutation/gate-13 →
  stage-2 landing fold. LFS push per the banked R2-first sequence.

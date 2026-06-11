# spec-frontier.md — lattice-boltzmann-d3q19 (frontier-moment-encoded variant)

> **Status:** IN-BUILD (Phase-6 cluster C-1, unit U-3). De-stubbed from the Phase-4.0
> pre-stage slot at C-1 U-3 stage 1c.
> **Parent reference sim:** `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref.md`.
> **Variant type:** `frontier-moment-encoded` (16-bit). **Primary stack:** C (C++ /
> Vulkan; lavapipe-pinned) — the FIRST Stack-C LBM surface (probe § 1 SHIFT: no Stack-C
> parent existed; scope unchanged).
> **Package:** `packages/lattice-boltzmann-d3q19-frontier-moment-encoded/` (CMake-only
> registration, D11 precedent; NOT a uv member).
> **Frontier paper:** Chen, Li, Levin, Wu, "High-Performance Moment-Encoded Lattice
> Boltzmann Method with Stability-Guided Quantization", arXiv:2602.05295 (live-verified:
> charter § 2 row 7 + § 10 S-5 amendment — Fig.-1 caption 25%/4.3×/1000×400×400 vs
> HOME-LBM; abstract up-to-6×/50%). CITE-DON'T-IMPORT.
> **Stage-0 probe:** `docs/_audits/phase-6/c1-u3-moment-lbm-probe-2026-06-11T15-00-36Z.md`.
> **Charter:** `docs/phases/phase-6/c1-charter.md` § 3.3 (RATIFIED § 10 incl. D-2).

## § 1 Scope

D3Q19 BGK LBM whose **persistent per-cell state is the 19 moments `m = M f` quantized to
16-bit codes** with per-moment stability-guided ranges (the frontier delta). Per step:
decode (`f = M⁻¹ m`) → f64 BGK collide + Guo-2002 forcing → lex pull-streaming →
half-way bounce-back y-walls → encode. A `--f64` mode runs the identical physics without
quantization (the exact-conservation surface + the parent-faithfulness witness). The
16-bit persistent footprint is 25% of the f64 populations (codes packed two per uint).

## § 2 Update rule / moment basis

Physics arithmetic mirrors the landed numpy parent op-for-op (Qian-1992 equilibrium with
the parent's division forms; Guo half-step velocity shift + force term with the parent's
reciprocal forms; lex streaming; static-wall bounce-back). The moment basis is built
programmatically from the velocity-set monomials {1, cx, cy, cz, cx², …, cy²cz²} —
rank 19, condition ≈ 19, rows 0–3 EXACTLY the density+momentum moments — inverted by f64
Gauss-Jordan; `‖M·M⁻¹ − I‖_max ≤ 1e-12` asserted (measured 0-to-FP). Quantization:
`code = round((m−lo)/(hi−lo)·65535)`; ranges = full-horizon f64-reference envelope
padded 25% (**stability-guided**: a 64-step envelope clamped the accelerating momentum
moments — u error ~60% of peak, measured at stage 1b — full-horizon calibration fixed it).

## § 3 Verification surfaces

1. **Conservation (A1):** f64 path conserves mass+momentum exactly-to-FP (periodic
   no-force; asserted ≤1e-12); quantized mass drift bounded by the closed-form budget
   `steps·ncell·(hi₀−lo₀)/2/65535`. `tests/test_lbm_me.cpp`.
2. **Moment-basis + quantization goldens (A2):** `M·M⁻¹ = I` residual; 16-bit
   round-trip ≤ closed-form half-step bound (+~1 ulp slack, documented).
3. **Bounded-quantization equivalence vs the landed parent (A3):** all frames of
   `captures/lbm-ref/poiseuille-64x32-seed42-step1000` vs the variant, fields rho+u, at
   the DECLARED `lbm-quantized` tolerance + analytic Poiseuille structure (parabolic
   symmetry, no-slip, centre max). `tests/python/test_frontier_equivalence.py` (ctest).
   **MEASURED canonical horizon:** rho max_abs 8.5e-15; u max_abs 3.12e-6 (u_peak
   8.65e-3 → peak-rel 3.6e-4). **f64 mode:** rho 3.7e-15 / u 1.6e-15 over 201 frames —
   inside the parent `lbm` 1e-5 category with ~9 orders of margin.

## § 4 Determinism

MEASURED bit-exact same-stack-same-hw: every `run_lbm` asserts a 2-run bit-identity
witness (tolerance 0.0; both modes; canonical witness sha `2fe02516…`). Element-wise
kernels; the encode `atomicOr` composes disjoint half-words (order-independent). No
EFECT. Registry: `[lattice.lattice-boltzmann-d3q19-frontier-moment-encoded]`.

## § 5 Capture

`captures/lattice-boltzmann-d3q19-frontier-moment-encoded/poiseuille-64x32-seed42-step1000.{h5,json}`
— the Appendix D.2.3 descriptor row VERBATIM (no SHIFT). Fields rho + u + rho/u
diagnostics per frame, 1001 frames, schema 1.0.0. Manifest sim.name
`lattice-boltzmann-d3q19`, category `lattice`, variant `frontier-moment-encoded-16bit`.

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`mass_moment_conserved`** + 2. **`momentum_moment_conserved`** (charter § 3.3
   proposal): exact-to-FP on the f64 path; quantized-budget-bounded on the frontier
   path. Doctest property sweeps across (tau, force) regimes (Stack-C has no Hypothesis;
   the deterministic sweep is the rd2d-stack-c-style gate-11 analogue) + density
   positivity/finiteness across regimes. **Regime:** gentle laminar configs (tau ≥ 0.6).

## § 7 Citations (Cat 1)

- Chen, Li, Levin, Wu (2026), arXiv:2602.05295 — the frontier method (16-bit
  moment-space quantization; stability-guided ranges).
- Qian, d'Humières, Lallemand (1992) — BGK equilibrium (parent-shared).
- Guo et al. (2002) — body-force scheme (parent-shared).
- Krüger et al. (2017), *The Lattice Boltzmann Method* — moments, bounce-back (spec
  Appendix A.1).
- Gardner-cross-check N/A; the landed numpy parent is the equivalence target.

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

A1 conservation closed forms (Krüger 2017; exact-to-FP), A2 linear-algebra +
quantization-bound closed forms (hand-derived), A3 the landed parent capture + the
analytic Poiseuille structure. See § 3.

## § 9 Replayable capture

§ 5 capture + corpus seed `tests/fixtures/legacy-captures/phase-6-c1-lbm-me.{h5,json}`
(8-step short-horizon fixture; lock 37→38).

## § 10 Determinism ↔ capture

Manifest `determinism.claimed = "bit-exact-same-hw"` ↔ § 4 registry row.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Canonical capture invocation row (34.60 s: full-horizon calibration + 2-run witness +
capturing trajectory) in `docs/perf-ledger.md` (gate-12; stage 1c).

## § 13 Gate-13

RED ctest evidence hashed in the stage-1a commit footer (`53c826e`); the pytest replay
tool does not drive ctest — the landing replay re-runs the RED suite shape in a worktree
(documented in the landing report).

## Gate-14 / mutation / tolerance routing

**gate-14:** the f64 mode IS a cross-stack-faithfulness witness vs the numpy parent
(measured ~1e-15, inside `lbm` 1e-5); the quantized mode routes to the NEW
**`lbm-quantized`** category (ratified D-2; amendment
`docs/_audits/tolerance-budget-amendments/2026-06-11T15-22-14Z-lbm-quantized.md`;
declared rel 5e-2 / abs 1e-5 from the measured values with documented margin).
**Mutation:** N/A (C++ surface; mutmut is python-only — the rd2d-stack-c precedent).

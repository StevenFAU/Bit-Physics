---
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-d-plan-drafting
stage: plan-drafting-landing
phase: phase-2
head_sha: e7d3cbd9ee69899273426492f399a77c070a44b9
head_sha_at_checkpoint: 6b197f1a5e6a675d4cbfbeabac3d4f8dd6c09f17
date: 2026-05-24T02-39-20Z
verdict: plan-drafting-CONFIRMED
evidence_paths:
  - docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/plan-drafting-probe-2026-05-24T02-30-12Z.md
---

# Plan-drafting landing — sub-phase-lattice-boltzmann-d3q19-stack-d

> THIRD spec-Phase-2 per-sim cross-stack port. Plan-drafting (probe + charter)
> complete. D1–D9 surfaced for operator routing; Stage 0 dispatchable after routing.
> Coordinator-side Convention #8 discipline exemplified: every dispatch-referenced
> value treated as "believed-true; verify at HEAD"; the probe's empirical Phase-1
> `sim.py` read (S6) is the load-bearing anchor.

## § 1. Deliverables + commit SHAs

| Artifact | Path | Commit |
|---|---|---|
| Plan-drafting probe | `docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/plan-drafting-probe-2026-05-24T02-30-12Z.md` | `19a5d8e1b7295d1688ce60c58d459c991e66286b` |
| Charter | `docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md` | `6b197f1a5e6a675d4cbfbeabac3d4f8dd6c09f17` |
| Plan-drafting landing (this) | `…/plan-drafting-landing-2026-05-24T02-39-20Z.md` | `e7d3cbd9ee69899273426492f399a77c070a44b9` |
| SHA back-fill | — | this back-fill commit (SHA reported to coordinator) |

Verdict: **plan-drafting-CONFIRMED.** Drafting is structurally complete; no blocking dependencies. Hard Rule 2 NOT triggered (Phase-1 LBM is structurally as the spec describes — D3Q19 BGK; tolerance + naming + perf shifts are routine HEAD-verification refinements, not structural wrongness).

## § 2. S6 banked-precedent application outcome (load-bearing)

Phase-1 LBM characterized at HEAD by reading `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/{sim.py, reference/*}` (NOT just spec sheets):
- **Lattice/scheme:** D3Q19, BGK single-relaxation-time (τ=0.7), Qian-1992; Guo-2002 forcing. NO MRT.
- **Source stack:** `stack.name="numpy-reference"` (spec-designated Stack-C Vulkan unimplemented). → NumPy-reference ↔ Taichi-CPU pair (the sph-water pattern).
- **Collision-step FP-arithmetic posture:** genuine — per-cell 19-term moment reductions (`density_field` sum / `momentum_field` einsum) + equilibrium polynomial (`feq_field`) + Guo forcing loop. Reduction-order-sensitive across NumPy↔Taichi. The FIRST cross-stack pair to exercise this surface.
- **Trajectory regime:** algebraically-identical-trajectory, single-pass explicit, **dissipative + laminar** (Poiseuille/Couette → stable steady-state profiles). NOT chaotic, NOT iterative-solver, NOT atomic-scatter. Integer-velocity streaming (np.roll analog) is bit-exact across backends.
- **Trajectory vs golden vs MMS vs spec:** the trajectory uses the SAME `feq_field` the gate-4a golden tests + the SAME `bgk_step` the gate-4b MMS tests (unlike sph-water's untouched gate-4b gold table). Implemented sim IS the spec-described D3Q19 BGK. Analytic rest-state ICs (no RNG).
- **Cross-stack-trivial-vs-non-trivial framing:** **NEITHER** trivially-bit-exact NOR a chaotic stress-test — "algebraically-identical-trajectory with genuine collision-step FP-accumulation," at the tighter 1e-5 category.
- **Expected gate-14 shape:** methodology-validation-at-a-third-regime; likely GREEN at 1e-5 with a SMALLER margin than the prior pairs' ~10–11 orders (band ~1e-13…1e-9; could approach 1e-6). Drives D5 at Stage 2.

## § 3. D1–D9 verdicts (lean + alternative + downstream)

| D | Lean | Alternative | Downstream |
|---|---|---|---|
| **D1** naming | `sub-phase-lattice-boltzmann-d3q19-stack-d` (full-name; **SHIFT from dispatch `lbm`**) | `lbm` abbreviation (mechanical rename) | precedent for remaining Stack-D/E ports |
| **D2** Stage-1 decomp | 1a/1b/1c | split 1b if Stage-0 surfaces scope | ~14 commits |
| **D3** tolerance | `1e-5` (`[defaults.lbm]`; **10× tighter than prior pairs**) | amendment/horizon-override if exceeded | less gate-14 headroom |
| **D4** step-horizon | full canonical, BOTH captures | shorter if R-L1 amplification | gate-14 diffs every frame ×{rho,u} |
| **D5** IC-15 disposition | **(b) PARTIAL HOLDS + REFINEMENT** (additive amend) | (a) FULL / (c) unchanged | empirics-driven at Stage 2 |
| **D6** override | `[overrides.lattice-boltzmann-d3q19] category="lbm"` (MANDATORY; 3rd) | — | KeyError without it |
| **D7** diag-runner | **(b) STAY BANKED** (**SHIFT from dispatch (a) FOLD-IN**) | (a) fold-in (sealed-code exception) / (c) standalone | append-only-seal + cosmetic-only |
| **D8** projection | unneeded if margin comfortable | conservation-invariant projection | ties to D5 |
| **D9** lattice-set | D3Q19 integer-streaming bit-exact; collision-FP is the surface | none (reference is D3Q19 BGK) | narrows IC-15 aspect #4 |

**Three SHIFTs from dispatch leans, each HEAD-grounded:** D1 (full-name not abbreviation, per § C.1 + precedent); D5 (lean (b) refinement not (a) full, per laminar/single-pass regime leaving #1/#3/#5 unexercised); D7 (stay-banked not fold-in, per analytic-IC cosmetic-defect + Phase-1 append-only seal).

## § 4. Probe inventory summary

- **Phase-1 LBM:** landed `215983fd` (CONFIRMED); D3Q19 BGK NumPy ref; gate-4a golden + gate-4b MMS (OOA 2.39); 2 PBT invariants; Tier-2 vector_field; R-LBM-1..4.
- **Infrastructure:** Taichi-integration (IC-11/12 `cf7d553`); capture-determinism-contract (IC-13/14 `9bf5b68`); audit-chain-correctness (IC-16 `6b4b90a`); RD-2D Stack-D (`7747d68`, MMS-arm exemplar); sph-water Stack-D (`f82d1c7`/`b8b9bca`, golden-arm + NumPy-ref + extend-stub exemplar).
- **IC-15 PARTIAL** doc `326fd94f…`: 5 codified + 5 deferred; only deferred aspect #4 exercised by this pair (partial).
- **HEAD-verified `[defaults.lbm]`:** `relative=1e-5, absolute=0.0`; `[budgets.lbm.cross_stack]` same; no `[overrides.lattice-boltzmann-d3q19]` pre-exists.
- **HEAD-verified canonical capture sha256s:** poiseuille `.h5` LFS OID `0e0843aa…e16f68` / `.json` blob `8347922d…611b8f`; couette `.h5` LFS OID `7a948434…15b65b` / `.json` blob `d9fbcafb…54c480f`.
- **HEAD-verified perf baseline:** poiseuille 3.784 s; couette 0.604 s (RD-2D-scale; R-L4 trivial).

## § 5. Anchor-sketch verification (Convention M)

conventions `69aa39fc…4602bf45` ✓ exact; architecture `e82b7b8e…9292d267` ✓ exact; methodology `326fd94f…0c6bc6` ✓ exact; 131 shifts entering ✓; spec § 11.3 LBM = item **2.5.D** (HEAD; NOT 2.3 extrapolation); Phase-1 dir `packages/lattice-boltzmann-d3q19/` (HEAD; not `lbm`/`lbm-d3q19`). No conventions/architecture/methodology drift this dispatch; no amendment to any of them in plan-drafting scope.

## § 6. Estimated Stage 1 diff size + decomposition (D2)

Phase-1 reference ≈ 1030 lines (constants 120 + equilibrium 123 + bgk 225 + sim 560) + invariants 116. Taichi port estimated ~1100–1500 lines (comparable to sph-water): structurally simpler than DFSPH (no iterative solver / neighbour search) but carries TWO canonical runners + Guo forcing + bounce-back + BOTH gate-4 arms. **1a/1b/1c holds; 1b does not need further splitting.** Confirm at Stage 0.

## § 7. Expected gate-14 outcome shape

**Methodology-validation-at-a-third-regime (lattice), algebraically-identical-trajectory class, but the first to exercise collision-step FP-accumulation, at the tighter 1e-5 category.** Most likely GREEN at 1e-5 with margin smaller than the prior pairs' ~10–11 orders (band ~1e-13…1e-9). If the 19-term reorder + 1000-step dissipative accumulation is larger, could approach 1e-6 (still PASS, near-tolerance) — a methodology-stress-test-lite outcome. Both are useful; the coordinator routes D5 differently per the actual margin. NOT a chaotic-amplification stress-test (the regime forbids it), so it does not close deferred aspects #1/#3/#5.

## § 8. Blocking dependencies + drift for operator attention

- **No blocking dependencies.** Stage 0 dispatchable after D1–D9 routing.
- **Operator-attention drift:** (1) **D1 naming SHIFT** — the charter + probe + audit-dir use the full-name `sub-phase-lattice-boltzmann-d3q19-stack-d`, NOT the dispatch's `sub-phase-lbm-stack-d`; if the operator prefers the abbreviation it is a mechanical rename. (2) **D7 SHIFT** — recommend STAY BANKED (not the dispatch's FOLD-IN lean); fold-in would require an explicit append-only-seal exception for cosmetic-only value. (3) **D3 tighter tolerance (1e-5)** — less gate-14 headroom than the prior pairs; flagged for Stage 1c expectations. (4) **D5 tempered** — lean (b) refinement, not (a) full, because the third pair does not stress-test deferred aspects #1/#3/#5.

## § 9. Cumulative shift count at plan-drafting close

Entering: **131**. Plan-drafting shifts (probe § 10): S-P1 (spec-item 2.5.D), S-P2 (tolerance 1e-5 tighter), S-P3 (full-name D1), S-P4 (D7 stay-banked shift), S-P5 (dual-gate-4-arm + two-canonical-captures). **Cumulative at plan-drafting close: 136.** (Charter + this landing add no new shifts beyond the 5 surfaced at probe.)

---

*End of plan-drafting landing. Stage 0 dispatchable per charter § 7.1 after operator routing of § 11.5 (D1–D9). SHA back-fill follows per Convention #12.*

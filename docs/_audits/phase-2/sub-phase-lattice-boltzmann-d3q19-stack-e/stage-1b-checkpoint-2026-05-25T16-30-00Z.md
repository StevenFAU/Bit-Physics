---
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-1b
stage: stage-1b-checkpoint
phase: phase-2
head_sha: PENDING-COMMIT-2-SHA-BACKFILL
head_sha_at_checkpoint: 2b94ec3319da055f64e981f2bb74ad6829eab2bb
date: 2026-05-25T16-30-00Z
verdict: stage-1b-CONFIRMED
evidence_paths:
  - packages/lattice-boltzmann-d3q19-stack-e/lattice_boltzmann_d3q19_stack_e/reference/d3q19_warp.py
  - captures/lattice-boltzmann-d3q19-stack-e/poiseuille-64x32-seed42-step1000.json
  - captures/lattice-boltzmann-d3q19-stack-e/couette-32x16-seed42-step500.json
  - docs/perf-ledger.md
capture_hashes:
  captures/lattice-boltzmann-d3q19-stack-e/poiseuille-64x32-seed42-step1000.h5: sha256:c44cd395fb55d316fdd9fd41f52ffe317f28eeb12c0fcf7c85bc536356791dfa
  captures/lattice-boltzmann-d3q19-stack-e/poiseuille-64x32-seed42-step1000.json: sha256:eae63a3a0ef736bf9e24db22821f6d37dba8d9f966d7ebeb1f9a3c94bffbd6c3
  captures/lattice-boltzmann-d3q19-stack-e/couette-32x16-seed42-step500.h5: sha256:71cd6e14e4f53be19f4d2ec47dd64a24a4b7c96e49e64c3abdd1cb0caeeb6453
  captures/lattice-boltzmann-d3q19-stack-e/couette-32x16-seed42-step500.json: sha256:93b0f5457838f31bf20199287f61bcbff5dcc4b1e609372cc9762f921920257e
---

# Stage 1b checkpoint — sub-phase-lattice-boltzmann-d3q19-stack-e

> EIGHTH per-sim cross-stack port; THIRD Stack-E port; SECOND LBM port. Stage 1b
> (implementation GREEN) CLOSE. VERDICT **stage-1b-CONFIRMED**. Warp D3Q19 BGK
> implementation over an own `wp.array(dtype=wp.float64, ndim=4)`; gates 4-13
> GREEN (15 passed / 2 skipped gate-14); root workspace 22 -> 23; TWO canonical
> captures (LFS, byte-size-identical to lbm-ref). **FULL-HORIZON cross-stack
> BIT-EXACT: max_abs_err=0.0 vs the Phase-1 NumPy reference across ALL 1001+501
> frames of BOTH canonicals** -- shape (a), the THIRD instance and the FIRST on a
> LAMINAR trajectory; the first Stack-E port to PREDICT bit-exact up-front (probe
> + Stage-0) and CONFIRM it at canonical scale. O-2 ckpts 2 (`393ef934...`) + 3
> (Couette 2-run identical). Integrity baseline-MATCH (`c19492ad...`); replay HELD
> (`9399fc33...`). 1 shift (S1b-LBME1); cumulative 217 -> 218.

## § 0. Dispatch/charter scope alignment (NO conflict)

Charter section 2/section 4 "Stage 1b" read first as authoritative (Convention
M). The dispatch + charter agree: implementation + registration (22->23) + O-2
ckpts 2/3 + captures + perf-ledger land at Stage 1b. The dispatch CRITICAL
CLARIFICATION (gate-10 / O-2 ckpt 2 asserts DETERMINISM at canonical scale, NOT
byte-reproduction of the grid-specific Stage-0 R-A1 digest `74e6bc16...`) was
honored (section 5). No scope conflict; no STOP.

## § 1. Scope

Stage 1b of `sub-phase-lattice-boltzmann-d3q19-stack-e`: the Warp implementation
(GREEN). NEW: `reference/{constants,d3q19_warp,__init__}.py` + `sim.py` +
`invariants.py` + `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-e.md`
+ TWO canonical captures. Additive edits: root `pyproject.toml` (23rd member) +
`uv.lock` + `docs/perf-ledger.md` (2 rows). **NOT touched**: `tolerance.toml` (D6
no-op), methodology / conventions / `equivalence.md` / warp.md (Stage 2), the
gate-14 test skip (Stage 1c), Phase-1 source, common-warp.

## § 2. Operator routing consumed (D-class)

D2 (impl/registration/ckpts here), D6 (override reuse -- no tolerance edit), D7
(socket-only: `common_warp.init`/`set_warp_deterministic`/`deterministic_context`/
`write_capture`), D8/D15 (own f64 `ndim=4`; reciprocal feq + `wp.float64(0.0)`
seeds), D9 (`tolerance=0.0` determinism), D10 (shape (a) bit-exact; no STOP --
step-1 faithfulness CONFIRMED), D14 (both captures LFS; no held-local), D17
(gate-4 dual-arm GREEN). No re-litigation.

## § 3. Implementation (Warp D3Q19; the bit-exact design)

(FACT -- `reference/d3q19_warp.py` at `2b94ec33`.)

The hot primitives are `@wp.kernel` over an own `wp.array(dtype=wp.float64,
ndim=4)` (D7 socket-only + D8/D15; the f32-pinned single-component common-warp
Grids cannot hold a 19-component f64 lattice -- warp.md 6.1/6.2 f64-principle,
THIRD instance):

- `_k_feq_field`, `_k_density_field`, `_k_momentum_field` -- the moment + feq
  field kernels (19-term lex reductions; `wp.float64(0.0)` seeds).
- `_k_collide_guo` -- the FUSED collision: moments -> `u_eq = mom/rho_safe +
  0.5*F/rho_safe` -> reciprocal-form feq (on the RAW density) -> relaxation
  `f-(f-feq)/tau` -> Guo forcing. A zero force array gives `mx/rs + (0.5*0)/rs ==
  mx/rs` and a zero Guo term, so the SINGLE kernel handles both the forced
  (Poiseuille) and force-free (Couette) paths bit-identically.
- `_k_stream` -- positive-modulus index gather (`((x - c) % n + n) % n`),
  bit-exact vs `np.roll`.
- Point-eval `feq`/`density_moment`/`momentum_moment` + `apply_bounce_back_y_walls`
  + `macroscopic_velocity` -- pure-NumPy glue, ported verbatim from the Phase-1
  reference (the gate-4a golden + gate-11 PBT verification surface + the wall /
  recovery boundary ops; the Stack-D precedent for cross-stack parity).

**BIT-EXACT KEY (D10; the divergence from Stack-D):** the in-kernel equilibrium
uses the Phase-1 `feq_field` RECIPROCAL operand order (`cu*inv_cs2 +
cu*cu*inv_two_cs4 - u_sq*inv_two_cs2` with the f64 `c_s^2`-constants precomputed
host-side via the EXACT Phase-1 expressions), NOT the division form. Stack-D's
Taichi port used the division form and landed shape (b) `~6e-15`; the reciprocal
form + `wp.float64(0.0)` seeds reproduce the NumPy reference byte-for-byte
(Stage-0 R-A1 measured this on the collision; section 6 confirms it full-horizon).

## § 4. Gates 4-13 (GREEN; FACT -- pytest)

`python -m pytest packages/lattice-boltzmann-d3q19-stack-e/tests/` -> **15 passed,
2 skipped** (the 2 gate-14 tests, un-skipped at Stage 1c). ruff check + format
clean.

| Gate | Test(s) | Result |
|---|---|---|
| 4a code-verif (golden) | `test_d3q19_equilibrium_golden` (3) | PASS (19 f_eq @ abs=1e-15 + moments) |
| 4b code-verif (MMS) | `test_mms_convergence` | PASS (NS-2D OOA within +/-0.5 of p=2) |
| 5 Tier-1 | `test_reference_sanity` (4) + `test_tier1_health_no_nan_inf` | PASS |
| 6 Tier-2 IC-6 | `test_tier2_vector_field_macroscopic_moments` | PASS (weakly-compressible advisory) |
| 10 determinism | `test_run_twice_content_equivalent` + `test_warp_harness_assert_deterministic_run` + `test_content_equivalent_gate_catches_drift` | PASS (W-2 + run_twice + R-D2) |
| 11 PBT | `test_equilibrium_{density,momentum}_moment_pbt` | PASS (>=50 examples each) |
| 13 failing-tests replay | worktree (section 8) | RED->GREEN |
| 14 cross-stack | `test_*_capture_bit_exact_with_numpy_reference` (2) | SKIPPED (Stage 1c) |

DUAL-ARM gate-4 (D17) BOTH GREEN (NEW vs smoke's MMS-only).

## § 5. O-2 four-checkpoint Warp CPU determinism chain -- checkpoints 2 + 3

(FACT -- ephemeral runs; section L.7.)

- **Checkpoint 2 (gate-10 production reproduction; canonical 64x32x3).**
  `assert_deterministic_run(production bgk_step on the Poiseuille canonical IC,
  runs=2, tolerance=0.0)` -> digest
  `393ef9348388b2825031c744ea8608da736ad43c343c466e36fe31264ea42179` (2/2
  bit-identical). This asserts DETERMINISM at canonical scale; per the dispatch
  CRITICAL CLARIFICATION + memory caveat it does NOT reproduce the grid-specific
  Stage-0 R-A1 digest `74e6bc16...` (16x8x3 probe) -- a different grid/IC gives a
  different but run-to-run-stable digest.
- **Checkpoint 3 (canonical-scale 2-run determinism).** The Couette canonical
  capture regenerated twice -> `.h5` byte-identical (`71cd6e14e4f53be1...` both
  runs). Warp CPU `wp.launch` serial + no atomic-scatter (`atomic_ops=False`) =
  bit-exact run-to-run (D9).

(Checkpoint 1 = Stage-0 R-A1 `74e6bc16...`; checkpoint 4 = Stage-1c formal gate-14.)

## § 6. FULL-HORIZON cross-stack BIT-EXACT (the headline; shape (a))

(FACT -- frame-by-frame `compare` of every state field in both Stack-E captures
vs the Phase-1 NumPy-reference captures at `captures/lbm-ref/`.)

```
POISEUILLE: 1001 frames, ALL state fields (rho, u), max_abs_err = 0.000e+00
COUETTE   :  501 frames, ALL state fields (rho, u), max_abs_err = 0.000e+00
```

The Warp f64 port reproduces the Phase-1 NumPy reference **byte-for-byte** across
the ENTIRE canonical horizon of BOTH descriptors -- the distribution `f` AND the
captured `(rho, u)` state, INCLUDING the Guo body forcing (Poiseuille) and the
moving-wall momentum injection (Couette), beyond the Stage-0 R-A1 force-free
collision probe. This is **shape (a)** -- the THIRD instance (after MPM-E + smoke-E)
and the **FIRST on a LAMINAR trajectory** (completing the D-S2-1 decoupling: shape
(a) is a zero cross-stack seed-difference property, orthogonal to the Lyapunov
regime). gate-14 at Stage 1c will be `within_tolerance=True` AND `max_abs_err=0.0`.
**D10 STOP-discipline: no step-1 port-faithfulness failure (the only STOP); the
bit-exact verdict is the EXPECTED, MEASURED outcome -- not a surprise to surface.**

## § 7. Captures + perf-ledger

(FACT -- `captures/lattice-boltzmann-d3q19-stack-e/` + `docs/perf-ledger.md`.)

| Descriptor | dims | steps | size | LFS oid (sha256) | wall-clock |
|---|---|---|---|---|---|
| poiseuille-64x32-seed42-step1000 | 64x32x3 | 1000 | 202,350,128 B | `c44cd395...791dfa` | 5.565 s |
| couette-32x16-seed42-step500 | 32x16x3 | 500 | 27,405,152 B | `71cd6e14...eb6453` | 0.883 s |

Both **byte-size-identical to the lbm-ref captures** + both **LFS-committed**
(<=256 MiB; D14 -- no held-local; Couette = schema-corpus subset, Stage 1c). `.json`
manifest sha256: Poiseuille `eae63a3a...`, Couette `93b0f545...` (Couette `.json`
matches the lbm-ref-partner schema; both manifests carry
`sim.name=lattice-boltzmann-d3q19` / `category=lattice` so the existing
`[overrides.lattice-boltzmann-d3q19]` resolves them at gate-14). perf-ledger 2
warp-cpu rows: Poiseuille 1.47x numpy-ref / 1.12x Taichi-D; Couette 1.46x / 0.91x
-- both within the 2x regression band (per-step kernel-launch overhead on the small
grids, as the Stage-0 section N estimate predicted).

## § 8. Gate-13 RED->GREEN replay (section E worktree)

(FACT.) `git worktree add --detach <tmp> 411bf3ba` (the Stage-1a scaffold / RED
anchor) -> `pytest .../tests/` reproduces **7 collection errors**
(`ModuleNotFoundError` on the absent `reference`/`sim`/`invariants`); HEAD ->
**15 passed**. The conftest `sys.path` insertion shadows the editable install with
the worktree's scaffold (no submodules), so the RED anchor reproduces cleanly.

## § 9. Anchors (FACT -- re-verified this stage)

- Integrity sweep `0 HARD_FAIL, 14 SOFT_WARN`, findings sha256 `c19492ad...d22cb52`
  -- **baseline-MATCH** (the new package + 2 captures + perf rows + spec-ref add
  ZERO findings; cat-1 citations clean -> gate-7; no section L.5 S1a-2 bare
  cuda-digit token; no cat-4 path:line). Hard Rule 2 (new HF / new SW) NOT triggered.
- Bit-identity replay `9399fc33...718909f34` HELD (re-ran; the package is not on
  the replay chain, section D.4).
- Workspace members **23** (`packages/lattice-boltzmann-d3q19-stack-e` registered).
- Doc anchors (conventions `7713828f` / methodology `f9c6a3cf` / architecture
  `e82b7b8e` / warp.md `eff17d30`) unchanged. R-A1 `74e6bc16...` + Phase-1 capture
  LFS-oids (`0e0843aa` / `7a948434`) unchanged. All Hard Rule 2 conditions clear.

## § 10. Banked items / shift + Stage 2 carry-forwards

- **S1b-LBME1 (shift) -- full-horizon canonical-scale cross-stack BIT-EXACT
  confirmation.** `max_abs_err=0.0` across all 1502 frames of both canonicals
  (incl. Guo forcing + moving-wall injection) CONFIRMS the shape-(a) prediction at
  canonical scale -- the FIRST Stack-E port to predict bit-exact up-front (probe
  Task 1.6 + Stage-0 R-A1) and confirm it (contrast smoke-E, which learned its
  verdict at Stage 1b, S1b-SME2). Completes the "Warp CPU f64 is bit-faithful to
  NumPy" portfolio observation at **n=2** (smoke-E step-1 `0.0` + LBM-E
  full-horizon `0.0`). Cumulative 217 -> 218.
- **Stage 2 carry-forwards (D5):** (a) methodology section 6.7 within-sim
  cross-backend corroboration (LBM-D Taichi shape (b) `~6e-15` -> LBM-E Warp shape
  (a) `0.0`); (b) the aspect-#4 second-data-point note (collision FP-accumulation
  determinism-safe + bit-faithful on Warp); (c) the n=2 "Warp CPU f64 bit-faithful
  to NumPy" candidate (section L.7 O-3 / methodology section 6.8 candidate);
  (d) conventions section L.7 O-1 shape-(a) third-instance / first-laminar note;
  (e) warp.md section 6 line-208 LBM-row f32->f64 refinement (D15);
  (f) equivalence.md additive Stack-E bit-exactness witness (Stage 1c writes the
  per-field witness; Stage 2 the disposition).
- **STAY-BANKED (carry-in):** S0-LBME1 (coordinator dispatch anchor-sha framing
  drift, post-Phase-2 cleanup); the `uv sync --all-packages` dev-extras-prune note
  (needs `--all-extras` to retain pytest/ruff; tooling nuance, not load-bearing).

## § 11. Stage 1c readiness

**READY.** gate-14 lands at Stage 1c: un-skip the 2 `test_cross_stack_equivalence`
tests (assert `within_tolerance=True` AND `max_abs_err==0.0` AND tolerance resolves
to `lbm`/`1e-5`); `compare_captures(LEFT=lbm-ref, RIGHT=stack-e)` for both
descriptors (full horizon; per-field per-frame witness in `equivalence.md` additive
Stack-E section); tolerance-override REUSE verify-only (D6 no-op); schema-corpus
subset entry (the Couette capture). O-2 checkpoint 4 (formal gate-14). The
full-horizon `max_abs_err=0.0` (section 6) pre-stages the gate-14 verdict.

## § 12. Verdict

**stage-1b-CONFIRMED.** 1 shift (S1b-LBME1); cumulative **217 -> 218**. Gates 4-13
GREEN (15 passed / 2 skipped); dual-arm gate-4 (D17); O-2 ckpts 2 (`393ef934...`)
+ 3 (Couette 2-run identical); gate-13 RED->GREEN replay; FULL-HORIZON cross-stack
BIT-EXACT (`max_abs_err=0.0`, both canonicals, all frames -- shape (a), first
laminar). Workspace 22 -> 23. Two captures LFS (byte-size-identical to lbm-ref).
Integrity baseline-MATCH (`c19492ad...`); replay HELD (`9399fc33...`). No
`-phase-N` tag (D12). Local-only (D13). Operator routes Stage 1c separately.

---

*End of Stage 1b checkpoint. `head_sha` back-filled in COMMIT 3 (Convention #12;
separate commit; never `--amend`; N1 enumeration).*

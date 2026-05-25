---
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-1c
stage: stage-1c-checkpoint
phase: phase-2
head_sha: PENDING-COMMIT-2-SHA-BACKFILL
head_sha_at_checkpoint: 7384b31c0a1fdc7ec1a74ff07042036c1d1af269
date: 2026-05-25T16-45-00Z
verdict: stage-1c-CONFIRMED
evidence_paths:
  - docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md
  - packages/lattice-boltzmann-d3q19-stack-e/tests/test_cross_stack_equivalence.py
  - tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-e-couette.json
fixture_hashes:
  tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-e-couette.h5: sha256:71cd6e14e4f53be19f4d2ec47dd64a24a4b7c96e49e64c3abdd1cb0caeeb6453
  tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-e-couette.json: sha256:64454f65dda0ab7295589629a4a1597194bb97cbe18fc6cbb257ed512a96a5c9
---

# Stage 1c checkpoint — sub-phase-lattice-boltzmann-d3q19-stack-e

> EIGHTH per-sim cross-stack port; THIRD Stack-E port; SECOND LBM port. Stage 1c
> (cross-stack equivalence landing) CLOSE. VERDICT **stage-1c-CONFIRMED**. FORMAL
> GATE-14 (O-2 four-checkpoint chain CHECKPOINT 4): both canonicals
> **`within_tolerance=True` AND `max_abs_err=0.0`** at the resolved `lbm`/`1e-5`
> (cross-stack BIT-EXACT). equivalence.md additive § E witness; gate-14 tests
> un-skipped (suite 17 passed); Couette schema-corpus fixture (corpus 17 passed);
> D6 verify-only no-op. **O-2 chain now 4/4 complete.** Integrity baseline-MATCH
> (`c19492ad...`); replay HELD (`9399fc33...`). **0 new shifts; cumulative 218
> (HELD).** Verdict was PREDICTED up-front (probe + Stage 0) and confirmed at every
> checkpoint — Stage 1c is verdict-recording, not verdict-discovering.

## § 0. Dispatch/charter scope alignment (NO conflict)

Charter section 2/section 4 "Stage 1c" read first as authoritative (Convention M).
The dispatch + charter agree: Stage 1c lands equivalence.md additive § Stack-E +
gate-14 un-skip + Couette schema-corpus fixture + tolerance-reuse verify-only +
formal gate-14 (O-2 ckpt 4). methodology / conventions / warp.md / CHANGELOG edits
are Stage 2. No scope conflict; no STOP.

## § 1. Scope

Stage 1c of `sub-phase-lattice-boltzmann-d3q19-stack-e`: the cross-stack
equivalence landing. **Additive:** `equivalence.md` § E (Stack-E witness) + the
cross-stack scope row; the Couette schema-corpus fixture. **Modificative:** the 2
gate-14 tests un-skipped. **NOT touched** (charter section 4 boundary):
`tolerance.toml` (D6 no-op), methodology / conventions / warp.md / CHANGELOG
(Stage 2), Phase-1 source, common-warp, the Stage-1b implementation + captures,
the Stack-D equivalence.md sections 1-7.

## § 2. Operator routing consumed (D-class)

D2 (verdict-landing stage), D5 (IC-15 PARTIAL + within-sim cross-backend
corroboration now fully evidenced -- Stage 2 lands the doc edits), D6 (override
reuse verify-only -- section 7), D10 (shape (a) bit-exact; within_tolerance=True is
the EXPECTED + confirmed verdict; STOP condition structurally inert -- step-1
faithfulness disproven at Stage 1b), D14 (Couette schema-corpus subset; no
held-local). No re-litigation.

## § 3. Formal gate-14 (O-2 four-checkpoint chain CHECKPOINT 4)

(FACT -- `compare_captures(LEFT=captures/lbm-ref, RIGHT=captures/lattice-boltzmann-d3q19-stack-e)`.)

| Descriptor | within_tolerance | worst max_abs_err | resolved tolerance | frames |
|---|---|---|---|---|
| `poiseuille-64x32-seed42-step1000` | **True** | `0.0` | `{lbm, relative=1e-5, absolute=0.0}` | 1001 |
| `couette-32x16-seed42-step500` | **True** | `0.0` | `{lbm, relative=1e-5, absolute=0.0}` | 501 |

**Cross-stack BIT-EXACT** -- the strongest form of equivalence, ~10 orders inside
the `1e-5` budget (the Stack-D pair sat at `~6e-15`). The verdict matches the
full-horizon `max_abs_err=0.0` measured at Stage 1b (section 6 of the Stage-1b
checkpoint), and the up-front prediction (probe Task 1.6 step-1 `0.0` + Stage-0
R-A1 collision-surface `0.0`). **Hard Rule 2 (verdict other than
within_tolerance=True + max_abs_err=0.0) NOT triggered** -- the expected result
landed; not a surprise to surface.

## § 4. equivalence.md additive § E (Stack-E bit-exactness witness)

(FACT -- `docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md`.) Additive
§ E (Stack-D sections 1-7 + References untouched) with six subsections (descriptive
prose; NO section-L.7 O-1 taxonomy nomenclature -- "bit-exact"/"byte-for-byte"
only; Stage 2 lands the taxonomy refinement):

- **§ E.1** the cross-stack pair (2 descriptors; tolerance `lbm`/`1e-5` via reused
  `[overrides.lattice-boltzmann-d3q19]`).
- **§ E.2** gate-14 verdict `within_tolerance=True`, `max_abs_err=0.0` (both).
- **§ E.3** bit-exactness through the LAMINAR horizon (developed-flow witness table:
  Poiseuille step-1000 `max|u|=8.65e-3`, Couette step-500 `u=0.05` -- both
  `bytes_equal=True`).
- **§ E.4** not a defect (distinct-provenance: Stack-E oids `c44cd395`/`71cd6e14` +
  `warp-stack-e` vs Phase-1 `numpy-reference` oids `0e0843aa`/`7a948434`; distinct
  wall-clocks + dates; byte-size-identical payloads).
- **§ E.5** why bit-exact (step-1 faithfulness + the reciprocal-operand-form +
  `wp.float64(0.0)` seeds vs Stack-D's division form `~6e-15`; the within-sim
  cross-backend conclusion: the difference is a backend-pair arithmetic property,
  not the trajectory's).
- **§ E.6** within-stack correctness (gates 4-13 GREEN; dual-arm gate-4; O-2 chain
  4/4). The cross-stack scope table gained a Stack-E row.

## § 5. gate-14 un-skip (FACT -- pytest)

Both `test_cross_stack_equivalence` tests un-skipped (the `@pytest.mark.skip`
decorators removed; the now-unused `import pytest` removed; ruff clean). Suite:
**17 passed** (was 15 passed / 2 skipped at Stage 1b). Assertions per the Stage-1a
7-test surface: `within_tolerance=True` AND `max_abs_err==0.0` AND tolerance
resolves to `lbm`/`1e-5`. All hold.

## § 6. Couette schema-corpus representative-subset fixture

(FACT.) The full Couette canonical capture (the 27 MB descriptor; <=256 MiB per
D14 / methodology section 5.4 -- the smaller of the two canonicals is the
representative subset, no frame-subsetting needed, mirroring the Stack-D couette
fixture) parked at `tests/fixtures/legacy-captures/phase-2-lattice-boltzmann-d3q19-stack-e-couette.{h5,json}`
(LFS; `.h5` oid `71cd6e14...` = the canonical Couette byte-copy; `.json`
`payload.path` re-pointed to the fixture filename; content sha256 `64454f65...`
post-`end-of-file-fixer`). The legacy-captures corpus round-trip
(`test_legacy_captures_corpus.py`) **17 passed** with the new fixture in the glob.

## § 7. D6 tolerance-override REUSE (verify-only no-op)

(FACT.) The formal gate-14 (section 3) resolved tolerance to `{category: lbm,
relative: 1e-5, absolute: 0.0}` via the EXISTING `[overrides.lattice-boltzmann-d3q19]`
(added by Stack-D Stage 1c) -- the LEFT/RIGHT manifests agree on
`sim.{name,category,variant}`, so the override resolves the Stack-E pair unchanged.
**No `tolerance.toml` edit** (D6 ratified no-op; LBM-Stack-E is the THIRD per-sim
port to skip the Stage-1c override add, after MPM-E + smoke-E).

## § 8. § L.7 O-2 four-checkpoint Warp CPU determinism chain -- 4/4 COMPLETE

| Ckpt | Stage | Surface | Digest / result |
|---|---|---|---|
| 1 | Stage 0 | R-A1 BGK-collision determinism (16x8x3 probe) | `74e6bc16...282838bc` (6/6) |
| 2 | Stage 1b | gate-10 production reproduction (canonical 64x32x3) | `393ef934...42179` (2/2) |
| 3 | Stage 1b | canonical-scale 2-run (Couette) | `71cd6e14...` byte-identical |
| 4 | **Stage 1c** | **formal gate-14** | **within_tolerance=True, max_abs_err=0.0 (both)** |

The chain is complete; the LBM-Stack-E port is the THIRD to land the full O-2 chain
(after MPM-E + smoke-E) and the FIRST where every checkpoint was bit-exact / a
zero-seed-difference result.

## § 9. Anchors (FACT -- re-verified this stage)

- Integrity sweep `0 HARD_FAIL, 14 SOFT_WARN`, findings sha256 `c19492ad...d22cb52`
  -- **baseline-MATCH** (the § E section + un-skip + fixture add ZERO findings; no
  section L.5 S1a-2 bare cuda-digit token; no cat-4 path:line). Hard Rule 2 NOT
  triggered.
- Bit-identity replay `9399fc33...718909f34` HELD.
- Workspace members **23**; doc anchors (conventions `7713828f` / methodology
  `f9c6a3cf` / architecture `e82b7b8e` / warp.md `eff17d30`) unchanged; capture
  LFS-oids (`c44cd395` / `71cd6e14`) + Phase-1 reference oids (`0e0843aa` /
  `7a948434`) unchanged. All Hard Rule 2 conditions clear.

## § 10. Banked items + consolidated Stage 2 carry-forward stack

- **0 new Stage-1c shifts** (cumulative **218 HELD**). Stage 1c recorded the
  predicted-and-confirmed verdict; no surprise, no drift.
- **Stage 2 carry-forward stack (D5 IC-15 disposition; the operator-routed doc
  edits):**
  1. methodology section 6.7 within-sim cross-backend corroboration row (LBM-D
     Taichi shape (b) `~6e-15` -> LBM-E Warp shape (a) `0.0`; both gate-14 GREEN x2;
     the seed-difference is a backend-pair property).
  2. methodology section 6.8 (or 6.7 extension) / conventions section L.7 O-3
     candidate: the "Warp CPU f64 is bit-faithful to NumPy" portfolio observation,
     now n=2 (smoke-E step-1 `0.0` + LBM-E full-horizon `0.0`; surfaced not asserted).
  3. methodology aspect-#4 (collision-step FP-accumulation) second-data-point note
     (determinism-safe + bit-faithful on Warp; FIRST Warp measurement).
  4. conventions section L.7 O-1 shape-(a) third-instance / FIRST-laminar note
     (the D-S2-1 decoupling: shape (a) is a zero cross-stack seed-difference
     property, orthogonal to the Lyapunov regime).
  5. warp.md section 6 line-208 LBM-row dtype f32 -> f64 refinement (D15).
  6. equivalence.md § E is already landed (this stage); Stage 2 reconciles the
     charter sections + the CHANGELOG entry.
  7. portfolio regression sweep (23 members; per-package pytest-config; no blanket
     `-W error`), integrity sweep, gate-13 replay, evidence-path verify (IC-16),
     append-only check.
- **STAY-BANKED (carry-in for the post-Phase-2 cleanup sub-phase):** S0-LBME1
  (coordinator dispatch anchor-sha framing drift); the `uv sync --all-packages
  --all-extras` dev-extras-prune nuance (Stage 1b memory observation); smoke-E
  section 13 cleanup-deferrables (not LBM-E scope).

## § 11. Stage 2 readiness

**READY.** Stage 2 (landing): anchor re-check -> 23-member portfolio regression
sweep -> integrity sweep -> evidence-path verify -> gate-13 replay -> append-only
check -> IC-15 disposition (the section 10 carry-forward stack: methodology 6.7 +
the n=2 candidate + aspect-#4 note + conventions L.7 O-1 third-instance/first-laminar
+ warp.md 6 line-208 D15) -> CHANGELOG -> landing audit -> SHA back-fill. The
cross-stack BIT-EXACT verdict (this stage) + the O-2 chain 4/4 are the substantive
inputs to the Stage-2 portfolio doc edits.

## § 12. Verdict

**stage-1c-CONFIRMED.** 0 new shifts; cumulative **218 (HELD)**. Formal gate-14
(O-2 ckpt 4): both canonicals `within_tolerance=True` AND `max_abs_err=0.0` at
`lbm`/`1e-5` (cross-stack BIT-EXACT). equivalence.md § E witness; gate-14 un-skipped
(17 passed); Couette schema-corpus fixture (corpus 17 passed); D6 verify-only no-op;
O-2 chain 4/4 complete. Integrity baseline-MATCH (`c19492ad...`); replay HELD
(`9399fc33...`). No `-phase-N` tag (D12). Local-only (D13). Operator routes Stage 2
separately.

---

*End of Stage 1c checkpoint. `head_sha` back-filled in COMMIT 3 (Convention #12;
separate commit; never `--amend`; N1 enumeration).*

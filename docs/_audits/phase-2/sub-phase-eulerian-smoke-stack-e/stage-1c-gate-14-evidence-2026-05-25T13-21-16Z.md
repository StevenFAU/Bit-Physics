---
date: 2026-05-25T13-21-16Z
author: eulerian-smoke-stack-e-stage-1c-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-1c-gate-14-evidence
subject: "Stage-1c formal gate-14 (§ L.7 O-2 checkpoint 4) EVIDENCE + falsification analysis. compare_captures(LEFT=eulerian-smoke-ref NumPy, RIGHT=eulerian-smoke-stack-e Warp) returned within_tolerance=True on BOTH canonicals -- the Warp port is BYTE-IDENTICAL to the sealed NumPy reference across the full horizon, including through the 3D Taylor-Green blow-up (|u| ~5e19 @ step 500). This FALSIFIES the charter § 3/§ 5 R-P2 chaotic-regime prediction (predicted within_tolerance=False) and is the explicit Hard Rule 2 STOP condition. DESCRIPTIVE evidence record only -- no source/test/equivalence.md/charter edits; the re-characterization is coordinator-routed re-spec work, out of Stage-1c-as-scoped bounds."
verdict-state: STOP
head_sha: <COMMIT_1_SHA_PENDING>
head_sha_at_checkpoint: 466c24d3f1317d45e364160ad27f228a543db8db
parent_audits:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1b-checkpoint-2026-05-25T12-50-14Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-evidence/gate-14-dual-verdict-2026-05-25T13-21-16Z.txt
  - captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.json
  - captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.json
  - captures/eulerian-smoke-stack-e/lid-driven-cavity-128sq-re100-seed42-step1000.json
  - captures/eulerian-smoke-stack-e/taylor-green-128cube-seed42-step500.json
---

# Stage-1c Formal Gate-14 — Evidence + Falsification Analysis (O-2 Checkpoint 4)

> **VERDICT: STOP (Hard Rule 2 — empirical falsification of the charter gate-14
> prediction).** Formal gate-14 was executed; the empirical verdict
> (`within_tolerance=True` on BOTH canonicals) contradicts the predicted
> `within_tolerance=False` R-P2 chaotic-regime escape-hatch verdict the charter
> § 3 / § 5 + the gate-14 test bodies + dispatch D5 + § L.7 O-1 shape (c) all
> presuppose. This document is **descriptive** (what gate-14 returned; why it is
> not a defect; what it falsifies) — NOT **prescriptive**: it does NOT
> re-characterize the verdict shape, rewrite the test assertions, or author the
> equivalence.md witness. Those are coordinator-routed re-spec work, out of
> Stage-1c-as-scoped bounds. No source / test / `equivalence.md` / methodology /
> conventions / charter edits this stage.

## § 0. Pre-flight conflict resolution (Stage-1c scope)

Before execution, a load-bearing conflict was surfaced and operator-resolved:
the Stage-1c dispatch BOUNDARIES deferred the `equivalence.md` Stack-E section to
Stage 2, but charter § 2 (Stage-1c row) + § 4 (touch-set, Stage-1c additive-edits
column) + the committed Stage-1a test skip-reasons
(`packages/eulerian-smoke-stack-e/tests/test_cross_stack_equivalence.py`) +
Stage-1b checkpoint § 11 all assign that section, the gate-14 un-skip, and the 2D
schema-corpus subset to **Stage 1c**. Per Convention M (HEAD wins) + the dispatch's
own "charter wins; surface and STOP" clause, this was surfaced (Hard Rule 2
condition 1). Operator routed: **proceed per charter § 2/§ 4**. Execution then hit
a SECOND, deeper Hard Rule 2 condition (this document).

## § 1. What was executed

§ L.7 O-2 four-checkpoint Warp-CPU determinism chain, **checkpoint 4 — formal
gate-14**: `compare_captures` (`tools/testkit/equivalence/harness.py`) with
`LEFT = captures/eulerian-smoke-ref/<descriptor>.json` (sealed Phase-1 NumPy
reference) and `RIGHT = captures/eulerian-smoke-stack-e/<descriptor>.json` (the
Stage-1b Warp port capture), at `relative=1e-4`, for BOTH canonical descriptors,
over the full committed horizon. Raw reproducible output:
`docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-evidence/gate-14-dual-verdict-2026-05-25T13-21-16Z.txt`
(command: `uv run --no-sync --package eulerian-smoke-stack-e python …`; `--no-sync`
per S1b-SME3 to avoid pruning the workspace `.venv`).

## § 2. Gate-14 verdict (FACT)

| Descriptor | within_tolerance | resolved tolerance | worst max_abs_err |
|---|---|---|---|
| `lid-driven-cavity-128sq-re100-seed42-step1000` (2D) | **True** | `smoke` / `relative=1e-4` / `absolute=0.0` | **0.0** |
| `taylor-green-128cube-seed42-step500` (3D) | **True** | `smoke` / `relative=1e-4` / `absolute=0.0` | **0.0** |

Per-committed-frame divergence witness: `max_abs_err = 0.0` at EVERY frame on BOTH
descriptors (2D frames 0,100,…,1000; 3D frames 0,50,…,500). The D6 tolerance
override resolved cleanly to `smoke`/`1e-4` (LEFT/RIGHT manifests agree on
`sim.{name="eulerian-smoke", category="volumetric-grid", variant}`) — NOT a
KeyError / category-mismatch harness error.

## § 3. Byte-identity proof (FACT)

The Warp Stack-E f64 field arrays are **byte-identical** to the sealed NumPy
reference at every committed frame — `a.tobytes() == b.tobytes()` True for every
field (the strongest form of agreement; well beyond `relative=1e-4`):

| Descriptor | frame | field | ref absmax | stack-e absmax | max\|diff\| | bytes_equal |
|---|---|---|---|---|---|---|
| 2D | 0 | u | 9.9014e-01 | 9.9014e-01 | 0.0 | True |
| 2D | 1000 | u | 2.0754e+00 | 2.0754e+00 | 0.0 | True |
| 2D | 1000 | v | 1.2604e+00 | 1.2604e+00 | 0.0 | True |
| 3D | 0 | u | 9.9910e-01 | 9.9910e-01 | 0.0 | True |
| 3D | 500 | u | **5.1347e+19** | **5.1347e+19** | 0.0 | True |
| 3D | 500 | v | **2.5420e+19** | **2.5420e+19** | 0.0 | True |
| 3D | 500 | w | **5.6147e+19** | **5.6147e+19** | 0.0 | True |

The 3D Taylor-Green canonical DOES blow up (|u| → ~5e19 by step 500 — the chaotic
field amplification the charter § 1 / § 5 describes is REAL) — but the NumPy
reference and the Warp port reach that magnitude **bit-for-bit identically**. The
cross-stack DIFFERENCE is exactly 0.0 even at 5e19; `within_tolerance` is a verdict
on the difference, not the magnitude.

## § 4. Distinct-provenance evidence — this is NOT a copy / wiring defect (FACT)

Three independent facts rule out "RIGHT silently read LEFT" or a copied capture:

1. **Distinct `.h5` payloads.** 2D: `e13b0d05…` (ref) vs `aa67929f…` (stack-e).
   3D: `4604ebdc…` (ref) vs `6b5158e8…` (stack-e). The manifest `payload.path`
   entries are relative and resolve under each capture's OWN directory.
2. **Distinct stack provenance.** `stack.build_id`/`name`:
   `sub-phase-eulerian-smoke` / `numpy-reference` (LEFT) vs
   `sub-phase-eulerian-smoke-stack-e` / `warp-stack-e` (RIGHT).
3. **Independent runs.** `run.start_utc` 2026-05-22 (ref) vs 2026-05-25 (stack-e);
   `run.wall_clock_seconds` differs on BOTH (2D 5.087s vs 5.897s; 3D 691.047s vs
   541.977s) — the Warp port is a genuinely separate execution (different
   wall-clock, faster on 3D).

The captures are genuinely independent; their f64 field arrays nonetheless agree
byte-for-byte. This is a real result, not an artifact.

## § 5. What this falsifies (INFERENCE)

The empirical `within_tolerance=True` contradicts the following load-bearing
predictions (each assumed `within_tolerance=False` + positive cross-stack
divergence):

- **Charter § 3 gate-14 + § 5 R-SME1** — "predicted `within_tolerance=False` on
  BOTH (R-P2 chaotic-regime escape-hatch — the CORRECT verdict)."
- **Dispatch D5 substance** — "R-P2 second-instance **stack-portable** Taichi →
  Warp." Refuted: the escape-hatch was NOT portable to Warp — there is no
  cross-stack divergence to witness.
- **§ L.7 O-1 verdict taxonomy shape (c)** — chaotic-regime escape-hatch
  (`within_tolerance=False`). The Stack-E gate-14 falls OUTSIDE shape (c).
- **methodology § 6 R-P2 stack-portability assumption** (the candidate D5 Stage-2
  doc edit) — the data does not support a second R-P2 instance on Stack-E.
- **The two gate-14 test bodies** (`test_lid_driven_cavity_chaotic_regime_escape_hatch`,
  `test_taylor_green_chaotic_regime_escape_hatch`) assert
  `assert not verdict.within_tolerance` — they would FAIL against this result.
  They are LEFT SKIPPED (not un-skipped) this stage by design (see § 8).

This is the explicit Hard Rule 2 STOP condition enumerated in the dispatch:
"gate-14 produces `within_tolerance=True` (would falsify the chaotic-regime
prediction; load-bearing methodology surprise)."

## § 6. Logical-consistency note vs banked S1b-SME2 (INFERENCE)

The result is not anomalous given the banked Stage-1b finding **S1b-SME2: step-1
cross-stack BIT-EXACT (`max_abs_err = 0.0`), exceeding the ~1e-16 prediction.** A
positive-Lyapunov trajectory amplifies a cross-stack SEED difference; it does not
manufacture one. With a step-1 seed difference of exactly **zero** (the Warp port
replicates the NumPy `np.roll` gather order + `np.mod`-via-floor periodic wrap +
fixed-20-sweep Jacobi arithmetic with identical f64 operation order), there is
nothing to amplify, so the trajectories stay byte-identical through the entire
horizon — including through the shared 3D blow-up. The chaos surfaced across
Taichi↔NumPy (Stack-D) because Taichi introduced ~1e-16 round-off; Warp↔NumPy
introduces none. **Stack-E is a cross-stack BIT-EXACT instance, the inverse of the
Stack-D chaotic-regime instance.**

## § 7. Secondary anomaly — 2D reference is bounded, not blown-up (FACT; flag only)

Independent of the verdict: the committed 2D `lid-driven-cavity` reference is
**bounded/laminar** across the full horizon — `max|u| ≈ 2.08`, `max|v| ≈ 1.26` at
step 1000 (and `≤ ~2.3` across committed frames) — NOT the `~1.64e3 @ step 5`
Kelvin-Helmholtz blow-up asserted in charter § 1 / § 5 and the inherited Stack-D
`docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md` § 4. The committed
cadence is 100 (frames 0,100,…), so a sub-cadence transient is not visible here and
cannot be confirmed or excluded from the committed capture alone; a 1.6e3 spike
that settled back to O(1) would be physically unusual. The 3D reference DOES blow
up (~5e19, matching). This is flagged as a candidate for the banked
Phase-1-canonical re-characterization question (D17 / smoke-Stack-D Stage 2);
**out of Stage-1c bounds** — recorded, not acted on.

## § 8. Banked Stage-1c shifts

- **S1c-SME1 — "BIT-EXACT through a chaotic horizon" is a candidate FOURTH gate-14
  verdict shape**, outside the § L.7 O-1 (a)/(b)/(c) taxonomy: the cross-stack diff
  is `0.0` (byte-identical) even though the trajectory is positive-Lyapunov and
  blows up to ~5e19. Either a new shape (d) "cross-stack bit-exact", or a refinement
  of shape (a) removing any "algebraically-tame trajectory" qualifier (the
  bit-exactness does not require a tame trajectory — only a zero seed-difference).
  Coordinator decides at re-spec. (§ L.7 refinement candidate; no doc edit here.)
- **S1c-SME2 — R-P2 is NOT stack-portable Taichi → Warp.** The Stack-D
  cross-stack divergence depended on Taichi-FP-specific ~1e-16 step-1 round-off;
  the Warp port, executing the same algorithm with the same operation order,
  yields 0.0 step-1 round-off → no divergence. Chaos amplifies an existing
  seed-difference; it does not generate one. The methodology § 6 candidate
  ("R-P2 stack-portable; second instance") is refuted for Warp. (methodology § 6
  re-characterization candidate; no doc edit here.)

These bank 2 documented shifts: **cumulative 205 → 207.**

## § 9. Entering-state anchors — verified GREEN before the STOP (FACT)

- HEAD `466c24d3f1317d45e364160ad27f228a543db8db` (Stage-1b SHA back-fill); branch `main`.
- `docs/conventions/sub-phase-conventions.md` `1937a7cf…`; `docs/conventions/cross-stack-equivalence-methodology.md` `a154d10c…`; `docs/architecture.md` `e82b7b8e…` — match.
- 2D capture `.h5` content sha256 `aa67929f…` (= committed LFS oid); 3D capture `.h5` content sha256 `6b5158e8…` — both at-access STOP-anchors HOLD.
- LEFT/RIGHT manifests agree on `sim.{name,category,variant}` → D6 override intact (no schema/manifest divergence).

## § 10. Boundary check (Convention A / dispatch BOUNDARIES — HONORED)

NOT touched this stage: Phase-1 source; common-warp; Stack-E implementation; the
gate-14 test bodies (LEFT SKIPPED — un-skip deferred to re-spec, since the
assertions presuppose the falsified verdict); `equivalence.md` (no Stack-E section
authored — the planned divergence-rate witness documents a divergence that does
not exist); `tolerance.toml` (D6 no-op); methodology; conventions; charter; the 2D
schema-corpus subset fixture (deferred with the re-spec). NO push, NO tag (D12).
Added this stage: this evidence audit + the raw evidence file (§ 1) + the Stage-1c
STOP checkpoint + the SHA back-fill ledger.

## § 11. § L.7 O-2 chain status

- ✓ ckpt 1 (Stage 0): R-A1 `79d15705…` (6/6 bit-identical Warp Jacobi determinism)
- ✓ ckpt 2 (Stage 1b): gate-10 `assert_deterministic_run`
- ✓ ckpt 3 (Stage 1b): 2D canonical 2-run, worst_abs_diff 0.0
- ⚠ ckpt 4 (Stage 1c): formal gate-14 **EXECUTED** — but the verdict
  (`within_tolerance=True`, byte-identical) contradicts the predicted shape (c).
  The determinism CHAIN is intact (within-stack + cross-stack both bit-exact); the
  gate-14 EQUIVALENCE PREDICTION is falsified. Coordinator re-spec required.

## § 12. Verdict

**STOP — Hard Rule 2 (empirical falsification).** Formal gate-14 returned
`within_tolerance=True` on both canonicals (Warp byte-identical to the NumPy
reference through the full horizon, including the 3D ~5e19 blow-up); rigorous and
not a defect (§ 4); logically consistent with S1b-SME2 (§ 6). This falsifies the
charter § 3/§ 5 R-P2 chaotic-regime prediction, D5 substance, § L.7 O-1 shape (c),
and the methodology § 6 R-P2-stack-portability assumption (§ 5). Stage 1c is **NOT
CONFIRMED**. The re-characterization (charter § 3/§ 5 amendment + gate-14 test
re-write to `within_tolerance=True` + an `equivalence.md` bit-exactness witness +
§ L.7 O-1 refinement + methodology § 6 R-P2 re-characterization + D5 substance
update + the § 7 2D-anomaly handling) is coordinator-routed re-spec work, NOT
Stage-1c-as-scoped work, and is held pending a re-spec dispatch. 2 shifts
(S1c-SME1, S1c-SME2); cumulative **205 → 207**. No `-phase-N` tag (D12).
Local-only (D13).

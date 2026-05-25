---
date: 2026-05-25T13-21-16Z
author: eulerian-smoke-stack-e-stage-1c-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-1c
subject: "Stage-1c checkpoint. VERDICT: STOP (Hard Rule 2 -- empirical falsification). Formal gate-14 (O-2 checkpoint 4) returned within_tolerance=True on BOTH canonicals -- the Warp port is byte-identical to the sealed NumPy reference across the full horizon (incl. the 3D ~5e19 blow-up). This falsifies the charter section 3/section 5 R-P2 chaotic-regime prediction, D5 substance, section L.7 O-1 shape (c), and the methodology section 6 R-P2 stack-portability assumption. Stage 1c NOT CONFIRMED; re-characterization is coordinator-routed re-spec work, held pending a re-spec dispatch. Evidence + falsification analysis: stage-1c-gate-14-evidence-2026-05-25T13-21-16Z.md."
verdict-state: STOP
head_sha: <COMMIT_2_SHA_PENDING>
head_sha_at_checkpoint: 1e07f9cd110554f446e1240c1caa65366bed22eb
parent_audits:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-gate-14-evidence-2026-05-25T13-21-16Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1b-checkpoint-2026-05-25T12-50-14Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-gate-14-evidence-2026-05-25T13-21-16Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-evidence/gate-14-dual-verdict-2026-05-25T13-21-16Z.txt
---

# Stage-1c Checkpoint — Sub-Phase Eulerian-Smoke-Stack-E

> **VERDICT: STOP (Hard Rule 2 — empirical falsification of the charter gate-14
> prediction).** NOT CONFIRMED. The full evidence + falsification analysis is the
> companion audit
> `docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1c-gate-14-evidence-2026-05-25T13-21-16Z.md`;
> this checkpoint is the stage roll-up.

## § 1. Stage-1c trajectory (two operator-routed decision points)

1. **Pre-flight scope conflict (resolved → proceed).** The dispatch BOUNDARIES
   deferred the `equivalence.md` Stack-E section to Stage 2, conflicting with
   charter § 2/§ 4 (which assign it + the gate-14 un-skip + the 2D schema-corpus
   subset to Stage 1c) and the committed Stage-1a test skip-reasons + Stage-1b
   checkpoint § 11. Surfaced per Convention M + Hard Rule 2 condition 1; operator
   routed **proceed per charter § 2/§ 4**.
2. **gate-14 empirical STOP (this checkpoint).** Executing the charter Stage-1c
   gate-14 hit a SECOND Hard Rule 2 condition: `within_tolerance=True`.

## § 2. Formal gate-14 result (O-2 checkpoint 4) — FACT

| Descriptor | within_tolerance | resolved tol | worst max_abs_err | bytes_equal (all frames) |
|---|---|---|---|---|
| 2D `lid-driven-cavity-128sq-re100-seed42-step1000` | **True** | `smoke`/`1e-4`/`0.0` | **0.0** | True |
| 3D `taylor-green-128cube-seed42-step500` | **True** | `smoke`/`1e-4`/`0.0` | **0.0** | True |

The Warp Stack-E f64 arrays are byte-identical to the sealed NumPy reference at
every committed frame, including the 3D blow-up (ref & stack-e both |u|≈5.13e19,
|v|≈2.54e19, |w|≈5.61e19 @ step 500; max|diff|=0.0). Not a defect — distinct `.h5`
checksums / build_ids / independent run dates + wall-clocks (evidence audit § 4).
Consistent with banked S1b-SME2 (step-1 cross-stack BIT-EXACT 0.0 → zero
seed-difference → nothing to amplify; evidence audit § 6).

## § 3. What is falsified (INFERENCE)

charter § 3 gate-14 + § 5 R-SME1 (predicted `within_tolerance=False`); dispatch D5
(R-P2 second-instance stack-portable Taichi→Warp); § L.7 O-1 verdict shape (c);
methodology § 6 R-P2 stack-portability assumption; the two gate-14 test bodies
(`assert not verdict.within_tolerance` would FAIL). Detail: evidence audit § 5.

## § 4. Banked Stage-1c shifts (cumulative 205 → 207)

- **S1c-SME1** — "BIT-EXACT through a chaotic horizon" = candidate FOURTH gate-14
  verdict shape outside § L.7 O-1 (a)/(b)/(c) (or a shape-(a) refinement dropping
  the "algebraically-tame trajectory" qualifier). Coordinator decides at re-spec.
- **S1c-SME2** — R-P2 is NOT stack-portable Taichi → Warp: Stack-D divergence was
  Taichi-FP-specific ~1e-16 step-1 round-off; Warp same-algorithm same-op-order
  yields 0.0; chaos amplifies an existing seed-difference, it does not generate one.

(Carry-forward: S1a-SME1 charter § 6 stale; S1a-SME2 R-A1 determinism-equivalent;
S1b-SME1 O-W7 narrowing; S1b-SME2 step-1 bit-exact; S1b-SME3 uv-sync .venv-prune;
D5/D15/D16 queued — all bank to the re-spec / Stage-2 stack.)

## § 5. § L.7 O-2 four-checkpoint chain

- ✓ ckpt 1 (Stage 0): R-A1 `79d15705…`
- ✓ ckpt 2 (Stage 1b): gate-10 `assert_deterministic_run`
- ✓ ckpt 3 (Stage 1b): 2D canonical 2-run, worst_abs_diff 0.0
- ⚠ ckpt 4 (Stage 1c): formal gate-14 **EXECUTED** — determinism chain intact
  (within-stack + cross-stack both bit-exact); the gate-14 EQUIVALENCE PREDICTION
  is falsified (`within_tolerance=True`, not the predicted `=False`).

## § 6. Entering-state anchors (verified GREEN; FACT)

HEAD `466c24d` at entry; conventions `1937a7cf…` / methodology `a154d10c…` /
architecture `e82b7b8e…` match; 2D `.h5` `aa67929f…` (= LFS oid) + 3D `.h5`
`6b5158e8…` STOP-anchors HOLD; LEFT/RIGHT manifests agree on
`sim.{name,category,variant}` (D6 intact). No HEAD/socket/anchor drift entering.

## § 7. Boundaries honored (Convention A / dispatch BOUNDARIES)

NOT touched: Phase-1 source; common-warp; Stack-E implementation; gate-14 test
bodies (LEFT SKIPPED); `equivalence.md`; `tolerance.toml` (D6 no-op); methodology;
conventions; charter; the 2D schema-corpus fixture (deferred to re-spec). Added:
the gate-14 evidence audit + raw evidence file + this checkpoint + the SHA
back-fill ledger. NO push, NO tag (D12). Local-only (D13).

## § 8. What is HELD for the coordinator re-spec dispatch

The re-characterization is OUT of Stage-1c-as-scoped bounds; held items:
charter § 3/§ 5 amendment (chaotic-regime → cross-stack-bit-exact for Stack-E);
gate-14 test re-write (`within_tolerance=True`; bit-exactness assertion);
`equivalence.md` Stack-E **bit-exactness** witness (replacing the planned
divergence-rate witness); § L.7 O-1 verdict-taxonomy refinement (S1c-SME1);
methodology § 6 R-P2 re-characterization (S1c-SME2; R-P2 NOT stack-portable);
D5 substance update; the § 7-of-evidence-audit 2D-reference-bounded anomaly
(candidate Phase-1-canonical re-characterization, D17).

## § 9. Verdict

**STOP — Hard Rule 2 (empirical falsification); Stage 1c NOT CONFIRMED.** Formal
gate-14 returned `within_tolerance=True` on both canonicals; rigorous, not a
defect, and logically consistent with S1b-SME2. The work product of this stage is
the DESCRIPTIVE evidence record (this checkpoint + the gate-14 evidence audit +
raw evidence) — NOT the charter-planned un-skip / `equivalence.md` / R-P2
invocation, all of which presuppose the now-falsified verdict. 2 shifts (S1c-SME1,
S1c-SME2); cumulative **205 → 207**. Coordinator routes the re-spec separately.
head_sha placeholder-deferred (back-filled in the SHA back-fill commit, COMMIT 3).

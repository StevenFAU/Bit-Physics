---
date: 2026-05-28T03-25-29Z
author: phase-3 common-3dgs stage-1c (Claude Code)
subject: Phase 3 common-3dgs Stage 1c — mutation baseline + verdict (SHIFTED, 76.10%)
verdict: SHIFTED
head_sha: 549c383f33b2ba47018dfffd5283fd4cf8c30e71
prior_phase_tag: v0.2.1-sub-phase-lfs-architecture
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:    # mapping (path → sha256); NO ": self" sentinel
  tools/testkit/mutation/baseline-2026-05-28T03-23-44Z.json: sha256:12875fac01723c5dd8efe5226ef5604dbbbf5b62450b3babd79b2f05b34ae710
  common/common-3dgs/tests/test_render_sh.py: sha256:439495f9bad073a4eb68bf5c7802ba53b8902576bbdd641e7ebbb797d276426f
  common/common-3dgs/tests/test_validation.py: sha256:665ee7cec4b571af27dbe86070331bde870546de5c8af652c0a8f48150d33e2d
  common/common-3dgs/tests/test_render_values.py: sha256:789400bc5f354e2e2fba3995c6c82e215cc6e516620d37b3616c3e0355db0a0e
  tools/testkit/mutation/mutmut-config.toml: sha256:d60b28fee41f00b271f3b5326452d1f2f0f161600ba2947a8151d420e87d1a89
  tests/fixtures/legacy-captures/phase-3-common-3dgs.json: sha256:775b80a0ed383f5f7a821f3b010ccace60f380df14137bb114dc4d6c0d39fd76
  tests/fixtures/legacy-captures/phase-3-common-3dgs.h5: sha256:2087402de9ee2989e991468ec40452cfc3a27e4a68d15adc595a45e7c649f4a9
evidence_paths:     # list
  - tools/testkit/mutation/baseline-2026-05-28T03-23-44Z.json
  - common/common-3dgs/tests/test_render_sh.py
  - common/common-3dgs/tests/test_validation.py
  - common/common-3dgs/tests/test_render_values.py
  - tools/testkit/mutation/mutmut-config.toml
  - tests/fixtures/legacy-captures/phase-3-common-3dgs.json
  - tests/fixtures/legacy-captures/phase-3-common-3dgs.h5
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md
  - docs/_audits/phase-3/progress.md
d_class_status:
  - D-C: bit-exact / same-stack-same-hw (Stage-1b MEASURED max_abs_diff=0.0; LOCKED at Stage-1c — no re-characterization)
  - D-D: common-3dgs save_png (matplotlib imsave; Stage-1b resolved)
carry_in_consumed:
  - Stage-1b § 5 DEFERRED legacy-capture fixture (R2-creds unblocked, 2026-05-28 ratification) — landed at `e258950`
banks:
  - L-3DGS-1 — neural-rendered category mutation threshold may need calibration; revisit at task-8 dispatch with the 3DGS-MPM consumer providing additional pixel-exact rotation / SH coverage (see § 7).
---

# Phase 3 common-3dgs Stage 1c — mutation baseline + verdict — SHIFTED

> **Verdict: SHIFTED.** ``common_3dgs`` mutation score = **0.7610** (691 / 908)
> after the second-pass test-tightening landing (`e66e069`). The 70-79% bracket
> per the Stage-1c dispatch is a graded variant (phase-3-plan §2.15) — Stage 1c
> closes SHIFTED, Stage 2 will close ``closed-with-shifted-1`` per §2.15. The
> 0.80 threshold in ``tools/testkit/mutation/mutmut-config.toml`` is
> **UNCHANGED** (phase-3-plan §6.0 anti-pattern: never widen a gate to make it
> pass). Verify_evidence + integrity baseline + I1–I7 hold; Stage-1b carry-in
> (legacy-capture fixture) consumed; Stage 2 dispatch is READY.

## § 0 — Stage-1c commit chain (FACT)

Trunk-based to `main`; pushed; no tag (I7). Parent `e4f8ea5` (Stage-1b SHA back-fill tip).

| Commit | Type | Content |
|---|---|---|
| `e66e069` | test | second-pass mutation-kill tightening (`test_render_sh.py` 9 tests + `test_validation.py` 17 tests) + `test_render_values.py` first-pass (prior session) + `tools/testkit/mutation/mutmut-config.toml` `common_3dgs` target registration (threshold = 0.80) |
| `e258950` | test | Stage-1b § 5 DEFERRED legacy-capture fixture regenerated under R2-creds-unblocked posture: `tests/fixtures/legacy-captures/phase-3-common-3dgs.{h5,json}` (LFS-tracked .h5; sidecar `wall_clock_seconds=0.0` per legacy convention) |
| `549c383` | test | `common_3dgs` mutation baseline JSON `tools/testkit/mutation/baseline-2026-05-28T03-23-44Z.json` (schema-version-1.1.0; 958/691/50/217; score 0.7610) |
| this audit | docs | Stage-1c verdict landing + progress.md entry |
| optional | chore | Convention #12 SHA back-fill if `head_sha` cites the audit commit |

## § 1 — Carry-in resolution (FACT)

Stage-1b § 5 marked the schema-corpus fixture
``tests/fixtures/legacy-captures/phase-3-common-3dgs.{h5,json}`` SHIFTED-DEFERRED
because both LFS backends were unavailable in that agent session
(`docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md:124-143`).

Stage 1c session opens under the **2026-05-28 R2-credentials ratification**
([[lfs-architecture-stage-1a-red-surface]]): agent sessions have R2 read+write
access to the lfs-s3 standalone backend. The carry-in is consumed at commit
`e258950`:

- Generator: ``common/common-3dgs/examples/smoke_3dgs/sim.py::run_3dgs_smoke``
  (deterministic 6x6 colour-graded scene; seed=42; image=128x128; fov_y=50deg).
- D-C governance: bit-exact / same-stack-same-hw applies to the **payload**
  ``steps/0/state/rgb_image`` (which is what render reproducibility means);
  the .h5 FILE-level sha256 differs from the Stage-1b-reported
  ``651dbe45…464653f1`` because the capture manifest embeds
  ``wall_clock_seconds`` (timing-variant, non-payload). New .h5 file pointer
  OID = `2087402de9ee2989e991468ec40452cfc3a27e4a68d15adc595a45e7c649f4a9`,
  size = 211 344 bytes; sidecar manifest at evidence_hash
  `sha256:775b80a0…0d39fd76`.
- LFS push: under the R2-creds-unblocked posture, push is authorized. If push
  fails with creds present → STOP-LFS (creds are wrong). Push outcome
  recorded in the final § 9 push step.

## § 2 — Inherited prior-session baseline (FACT-read)

The prior Stage-1c attempt session ran mutmut to completion against the
post-first-pass test surface but lost context to a JSON-stream Unicode error
before writing a baseline JSON. The final state is preserved in the session's
mutmut progress log (`/tmp/mut2.log` from that session, retained):

```
850/850  🎉 479  ⏰ 0  🤔 72  🙁 299  🔇 0
```

Translation: 850 mutants total, 479 killed, 72 suspicious, 299 survived, 0
timeouts, 0 skipped. Kill rate = 479 / (479 + 299) = **0.6160 (61.6%)**.

This Stage-1c re-run, after the second-pass tightening, produces a different
mutant count (850 → 958). The mutmut wrapper script
(`tools/testkit/mutation/run-mutation.sh`) passes no
``--disable-mutation-types`` flag, so default mutmut 2.5.1 behaviour applies
in both runs; the count delta is not explained by a CLI flag difference. The
**INFERENCE** is that the prior session's mutmut cache was seeded against
a different per-test hash window (the .mutmut-cache cleared between runs;
mutant numbering is re-assigned on cache-rebuild but the SET of mutation
points is source-only and should be stable). The 108-mutant delta surfaces as a
loose end the audit acknowledges but does not gate on; the load-bearing
number is the score from THIS run.

## § 3 — STEP A: survivor bucketing (FACT — pre-second-pass)

Source: ``.mutmut-cache`` from the prior session (preserved end-of-run state
when this session opened; enumerated via the helper at ``/tmp/dump2.py``
which used ``mutmut.cache.init_db`` + ``db_session`` to walk the ``Mutant``
table). Aggregate distribution of survived + suspicious mutants by file:

| File | Survived | Suspicious | Total | Diagnosis |
|---|---|---|---|---|
| ``render.py`` | 199 | 16 | 215 | SH higher-order (``_C1``/``_C2``/``_C3``); ``_quaternions_to_matrices`` off-diagonals; EWA Jacobian internals; ``BACKGROUND_DEFAULT`` / ``_LOW_PASS`` constants |
| ``model.py`` | 28 | 27 | 55 | Field-shape validators (the ``or`` branches); ``_sigmoid`` / ``_logit`` activation pair; PLY parser internals (column ordering, ``f_dc_*`` / ``f_rest_*``); ``_normalize_quaternions`` zero-norm fallback; ``to_numpy`` reshape/astype |
| ``camera.py`` | 46 | 0 | 46 | ``__init__`` validation (image_height/width<=0, p11<=0); ``look_at`` projection matrix internals (``proj[0,0]``/``[1,1]``/``[2,2]``/``[2,3]``/``[3,2]``); keyword defaults (up, near, far); ``camera_center`` / ``fov_y`` derivations |
| ``_kernels.py`` | 22 | 29 | 51 | Warp kernel internals: ``ALPHA_MIN`` / ``T_MIN`` / ``ALPHA_MAX`` constants; ``power`` exponent compose; ``transmit`` / ``acc_*`` accumulators; ``wp.clamp`` outputs |
| ``image_io.py`` | 4 | 0 | 4 | Input ``ndim`` / ``shape[2]`` check; ``[0, 1]`` clip; ``parent.mkdir`` parents/exist_ok |

The diagnosis is FACT-traceable per mutant: each surviving mutant ID's
source line was read from the cache (``Mutant.line.line`` field). The
``/tmp/mut1c-survivors/<file>.csv`` dump captures all 371 survivors
(299 BAD_SURVIVED + 72 OK_SUSPICIOUS) one-per-row with their source-line
context, available at the Stage-1c head as the diagnostic artifact under
``/tmp/``; preserved for review during the session but not committed
(per the dispatch's context-fill policy — the JSON committed at
``tools/testkit/mutation/baseline-…json`` is the durable artifact).

## § 4 — STEP B: targeted second-pass tightening (FACT)

Two new test files added (no rewrite of the first-pass ``test_render_values.py``):

### § 4.1 — ``common/common-3dgs/tests/test_render_sh.py`` (9 test functions)

| Test function | Targets | Mechanism |
|---|---|---|
| ``test_sh_degree0_dc_plus_half_bias`` | ``_C0`` + the trailing ``+ 0.5`` bias (``common/common-3dgs/src/common_3dgs/render.py:113``) | Zero-SH scene; predicted centre = `alpha * 0.5` |
| ``test_sh_degree1_z_axis_negative_sign`` | ``+ _C1 * z * sh[:, 2, :]`` (``common/common-3dgs/src/common_3dgs/render.py:90``) | Cam at +Z (dir z=-1); ``sh[:,2,R]=+1`` → dark red |
| ``test_sh_degree1_x_axis_negative_sign`` | ``- _C1 * x * sh[:, 3, :]`` (``common/common-3dgs/src/common_3dgs/render.py:90``) | Cam at +X (dir x=-1); ``sh[:,3,G]=+1`` → bright green |
| ``test_sh_degree1_y_axis_negative_sign`` | ``- _C1 * y * sh[:, 1, :]`` (``common/common-3dgs/src/common_3dgs/render.py:90``) | Cam at +Y; ``sh[:,1,B]=+1`` → bright blue |
| ``test_sh_degree2_c2_index2_z_lobe`` | ``_C2[2] * (2zz - xx - yy) * sh[:, 6, :]`` (``common/common-3dgs/src/common_3dgs/render.py:98``) | Cam at +Z → poly=2; ``sh[:,6,R]=0.4`` → predicted red |
| ``test_sh_degree2_c2_index0_xy_lobe`` | ``_C2[0] * xy * sh[:, 4, :]`` (``common/common-3dgs/src/common_3dgs/render.py:95``) | Cam at (2,2,2) → dir=(-1,-1,-1)/√3; ``sh[:,4,R]=0.6`` |
| ``test_sh_degree3_c3_index3_z_cubic_lobe`` | ``_C3[3] * z * (2zz - 3xx - 3yy) * sh[:, 12, :]`` (``common/common-3dgs/src/common_3dgs/render.py:108``) — **11 of 215 render.py survivors map here alone** | Cam at +Z → poly=-2; ``sh[:,12,R]=0.5`` → dark red |
| ``test_sh_degree3_c3_index4_x_cubic_lobe`` | ``_C3[4] * x * (4zz - xx - yy) * sh[:, 13, :]`` (``common/common-3dgs/src/common_3dgs/render.py:109``) | Cam at +X → poly=1; ``sh[:,13,G]=0.6`` |
| ``test_anisotropic_splat_rotates_long_axis_under_quaternion`` | ``_quaternions_to_matrices`` off-diagonals (``common/common-3dgs/src/common_3dgs/render.py:64-79``, 30+ survivors) | Anisotropic scale (0.4, 0.04, 0.04) under identity vs 90deg z-rotation → splat footprint flips aspect |

### § 4.2 — ``common/common-3dgs/tests/test_validation.py`` (17 test functions)

| Test function | Targets |
|---|---|
| ``test_camera_rejects_wrong_view_matrix_shape`` | ``common/common-3dgs/src/common_3dgs/camera.py:71`` |
| ``test_camera_rejects_wrong_projection_matrix_shape`` | ``common/common-3dgs/src/common_3dgs/camera.py:73`` |
| ``test_camera_rejects_non_positive_image_dimensions`` (5-param) | ``common/common-3dgs/src/common_3dgs/camera.py:74`` (5 mutation indices) |
| ``test_camera_rejects_non_positive_p11`` | ``common/common-3dgs/src/common_3dgs/camera.py:88`` |
| ``test_camera_derives_camera_center_from_view_translation`` | ``common/common-3dgs/src/common_3dgs/camera.py:85-86`` |
| ``test_camera_derives_fov_y_from_p11`` | ``common/common-3dgs/src/common_3dgs/camera.py:90`` |
| ``test_camera_stores_near_and_far_attributes`` | ``common/common-3dgs/src/common_3dgs/camera.py:79-80`` |
| ``test_camera_look_at_projection_matrix_entries`` | ``common/common-3dgs/src/common_3dgs/camera.py:122-127`` (~24 proj-matrix entry survivors) |
| ``test_camera_look_at_default_near_far`` | ``common/common-3dgs/src/common_3dgs/camera.py:102-103`` |
| ``test_camera_look_at_default_up_orients_view_y_axis`` | ``common/common-3dgs/src/common_3dgs/camera.py:97-118`` (view-matrix orthogonal-row pin) |
| ``test_model_rejects_wrong_field_shape`` (4-param) | ``common/common-3dgs/src/common_3dgs/model.py:88-95`` (positions / scales / rotations / opacities) |
| ``test_model_rejects_wrong_sh_shape`` (3-param) | ``common/common-3dgs/src/common_3dgs/model.py:96`` (ndim / N mismatch / colour-channel-count) |
| ``test_model_to_numpy_returns_float32_with_expected_shapes`` | ``common/common-3dgs/src/common_3dgs/model.py:174-179`` |
| ``test_model_ply_roundtrip_preserves_activation_fields`` | ``common/common-3dgs/src/common_3dgs/model.py:40-47`` (``_sigmoid``/``_logit``) + ``117-153`` (PLY layout) |
| ``test_save_png_rejects_non_rgb_array`` | ``common/common-3dgs/src/common_3dgs/image_io.py:24`` |
| ``test_save_png_creates_missing_parent_directory`` | ``common/common-3dgs/src/common_3dgs/image_io.py:34`` |
| ``test_save_png_clips_out_of_range_values`` | ``common/common-3dgs/src/common_3dgs/image_io.py:26`` (round-trips through PIL to verify 8-bit byte values) |

26 test functions across two new files (35 pytest items including
parametrizations). The ``~20``-test cap in the Stage-1c dispatch is the
soft-budget guideline; the count overruns the bare cap because every
parametrized branch targets a DISTINCT mutmut survivor index — collapsing
them under one function name would not have killed the same number of
mutants. All new tests pass strict-mode pytest + ruff (mypy is configured on
``src/common_3dgs`` only per ``common/common-3dgs/pyproject.toml``;
test-suite typing not gated).

## § 5 — STEP C: mutmut re-run (FACT)

Invocation:
``bash tools/testkit/mutation/run-mutation.sh --target common_3dgs``
(the wrapper invokes ``uv run --no-sync mutmut run --paths-to-mutate
common/common-3dgs/src/common_3dgs --runner "uv run --no-sync pytest
common/common-3dgs/tests/ -x -q --tb=no"``; no
``--disable-mutation-types`` flag — defaults). Log redirected to
``/tmp/mut-1c-retry.log``; the JSON-stream Unicode error mode that broke
the prior session was avoided by redirecting before progress tail-polling
with ``tr '\r' '\n' | grep -E '[0-9]+/[0-9]+' | tail -1``.

Final progress line:

```
958/958  🎉 691  ⏰ 0  🤔 50  🙁 217  🔇 0
```

Translation:
- ``total_mutants``: **958**
- ``killed``: **691**
- ``survived``: **217**
- ``suspicious``: **50**
- ``timeouts``: 0
- ``skipped``: 0

**Kill rate = 691 / (691 + 217) = 691 / 908 = 0.7610 (76.10%)**.

Per-file kill-rate breakdown (FACT — from
``tools/testkit/mutation/baseline-2026-05-28T03-23-44Z.json``):

| File | Killed | Survived | Suspicious | Total | Kill rate |
|---|---|---|---|---|---|
| ``camera.py`` | 42 | 10 | 0 | 52 | 0.808 |
| ``image_io.py`` | 43 | 1 | 0 | 44 | 0.977 |
| ``_kernels.py`` | 55 | 19 | 0 | 74 | 0.743 |
| ``model.py`` | 132 | 45 | 29 | 206 | 0.746 |
| ``render.py`` | 419 | 142 | 21 | 582 | 0.747 |

Files at or above the 0.80 threshold: ``camera.py`` (0.808),
``image_io.py`` (0.977). Files below: ``_kernels.py`` (0.743),
``model.py`` (0.746), ``render.py`` (0.747).

Improvement vs prior session:
- Prior: 479 killed / 299 survived / 72 suspicious / 850 total → 0.6160.
- This:  691 killed / 217 survived / 50 suspicious / 958 total → **0.7610**.
- Δ score = **+14.50 percentage points**. 82 absolute survivors retired.

## § 6 — STEP D: verdict bracket + survivor-class rationale

Per the Stage-1c dispatch verdict brackets:

- ``≥ 0.80`` → CONFIRMED
- ``0.70`` to ``< 0.80`` → SHIFTED (graded variant per phase-3-plan §2.15)
- ``< 0.70`` → BLOCKED (STOP-F-strict)

``0.7610`` falls in the SHIFTED bracket. **Stage 1c verdict = SHIFTED**.
The 0.80 threshold in the registry STAYS at 0.80 (phase-3-plan §6.0
anti-pattern: never widen a gate to make it pass; **STOP-I would fire**
on any such temptation; not exercised).

### § 6.1 — Why the remaining survivors did not kill (FACT + INFERENCE)

The 217 surviving mutants concentrate in two regions where additional
test-tightening would either duplicate existing render-correctness coverage
or require white-box probes of Warp-kernel-internal compositing arithmetic
that mutmut's launched-test runner cannot directly observe:

1. **``render.py`` NumPy preprocessor inner-arithmetic (142 survivors,
   65% of total).** Survivors here are in the EWA-Jacobian construction
   (lines 169-178), the depth-sort prep (lines 188-199), and the
   tail-half of ``_eval_sh`` (degree-2/3 polynomial-multiplier
   sub-expressions). Each surviving mutant produces an alternative
   numeric value at a specific intermediate variable, but the per-pixel
   compositing tail re-quantizes to 8 bits before the assertion fires
   (most rendered values are 8-bit-precision after the Warp kernel's
   ``wp.clamp`` output stage). A given mutant survives when its
   intermediate-value perturbation is < ~1/255 in the final pixel —
   the kind of mutation that's mathematically wrong but numerically
   indistinguishable at the test's precision. The added SH tests kill
   the high-amplitude sub-expressions (the ones that flip the
   centre-pixel by tens of percent); the residue is the low-amplitude
   tail. Killing the residue would require synthetic scenes engineered
   to amplify each surviving sub-expression's contribution — a
   per-mutant test design that scales as O(survivors), explicitly
   surfaced (not pursued) by the dispatch's `≤~20 test` budget.

2. **``_kernels.py`` Warp kernel internals (19 survivors, 9% of total).**
   The kernel body (``composite_splats``) is mutated by mutmut as Python
   source; Warp recompiles the kernel on the next launch from the mutated
   source (content-addressed kernel cache). But the kernel is a
   per-pixel inner loop with accumulator state (``transmit``, ``acc_r/g/b``,
   the ``break`` on T_MIN), and surviving mutants are concentrated in:
   - The constant constants (``ALPHA_MIN``, ``T_MIN``, ``ALPHA_MAX``) —
     would require a scene that hits the cull/saturate boundary
     pixel-exactly to discriminate.
   - The accumulator update ordering — ``acc_r += weight * color_r[i]``
     style mutations that change a `+=` to `=`, where the surviving
     mutant happens to produce the same final pixel because subsequent
     compositing iterations overwrite the changed state.
   - The output-clamp range — ``wp.clamp(r, 0.0, 1.0)`` survivors that
     swap the clamp limits (e.g. ``clamp(r, 0.0, 0.5)``), only catchable
     by a scene that drives a pixel value above 0.5 in a region the
     mutation would clip; the current scenes saturate but do so via the
     alpha path, not the clamp path.
   Effective mutation coverage of a Warp kernel requires either (a) a
   companion Python reference of the kernel that mutmut also mutates
   and tests can A/B compare; or (b) per-mutation hand-crafted scenes —
   both substantially scope-expansion beyond Stage-1c's tightening lane.

3. **``model.py`` (45 survivors) + ``camera.py`` (10 survivors) tails.**
   ``model.py`` survivors after the second-pass tightening cluster in
   PLY-parser branches that the round-trip test exercises but where the
   activation tolerance (``rtol=1e-4`` / ``atol=1e-6``) absorbs the
   mutant's perturbation; in ``camera.py`` they cluster in the
   look_at body's vector-cross / view-row ordering where the projection-
   matrix pin asserts the proj entries but not every internal vector
   step. Killing these would tighten the round-trip tolerance to
   ``atol=0.0`` (which falsifies on float32 binary-PLY storage) or add
   per-row view-matrix assertions; both are diminishing-returns at the
   current threshold gap.

### § 6.2 — Phase-3 lesson (banked)

**L-3DGS-1** — *neural-rendered category mutation threshold may need
calibration; revisit at task-8 dispatch with the 3DGS-MPM consumer
providing additional pixel-exact rotation / SH coverage.* The first
Phase-3 + first common-module + first Warp-kernel mutation target shows
that a 0.80 floor against a Warp-kernel-with-NumPy-preprocessor surface
is **achievable for the validation surface** (image_io 0.98, camera 0.81)
but **structurally hard for the rasterizer-kernel surface** (render.py
0.75, _kernels.py 0.74) without test-scope expansion that overlaps
task-8's coupling tests. Forward-routing note: at task-8 dispatch the
3DGS-MPM consumer will add per-frame mutation of position/scale/rotation
fields with deformation-gradient-tracked rotations — that consumer suite
should sweep through scenes that drive the residual ``render.py`` /
``_kernels.py`` survivors and re-measure. If the threshold remains
unattained after task-8's contribution, the calibration discussion is
the tolerance-budget-amendment forum, not a unilateral widening.

## § 7 — Verify_evidence + integrity + append-only sweeps (FACT)

### § 7.1 — verify_evidence

Sweep run with ``uv run --no-sync python -m integrity.scripts.verify_evidence
--audit <each phase-3 audit>`` (Stage-1c session anchor probe step + final
landing-time re-run):

| Audit | Pass/Fail |
|---|---|
| ``sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md`` | 4 / 0 |
| ``sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md`` | 0 / 0 |
| ``sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md`` | 12 / 0 |
| ``sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md`` | 7 / 0 |
| ``sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md`` | 12 / 0 |
| ``sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md`` | 14 / 0 |
| this audit | (verify at landing; 0 fail expected) |

No regression on prior audits. The plan-drafting / probe / stages-0/1a/1b
all remain 0-fail.

### § 7.2 — integrity baseline

``uv run --no-sync python -m integrity --all --mode strict`` (stderr digest
because integrity emits to stderr per [[integrity-baseline-digest-method]]):

```
summary: 0 HARD_FAIL, 14 SOFT_WARN
sha256 (STDERR) = c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
```

**BYTE-IDENTICAL** to the documented baseline ``c19492ad…d22cb52``. The 14
SOFT_WARN entries are the documented carry-overs from Phase-0/Phase-1
under-tracked references; none HARD_FAIL.

### § 7.3 — append-only

``git diff --name-status v0.2.1-sub-phase-lfs-architecture HEAD --
docs/_audits/`` shows only ADDS under ``docs/_audits/phase-3/`` (the
plan-drafting, probe, stage-0/0-BLOCKED/1a/1b audits + the progress.md
entries + this Stage-1c audit). No prior audit was edited or shortened
(R-1 / I4 hold).

### § 7.4 — I1–I7 disposition at HEAD

| Invariant | At HEAD ``549c383`` | Method |
|---|---|---|
| I1 verify_evidence | HOLDS | § 7.1 sweep |
| I2 replay (additive) | HOLDS | Stage-1c artifacts are additive — no Stage-0 / 1a / 1b audit or capture or tolerance row was altered, so the cross-phase replay outcome (Stage-0 ``ok=True`` 8/8) is unaffected |
| I3 integrity baseline | HOLDS BYTE-IDENTICAL | § 7.2 |
| I4 published-audit append-only | HOLDS | § 7.3 |
| I5 external-SHA web-verified | HOLDS | no new external SHA introduced at Stage 1c |
| I6 SHA back-fill = separate commit | HOLDS / on-deck | the audit's ``head_sha`` cites commit ``549c383`` (the JSON-baseline commit); if the audit itself becomes head, the back-fill is a separate ``chore(phase-3): SHA back-fill`` commit per Convention #12 |
| I7 no agent-pushed tags | HOLDS | no tag created; `test_i7_no_agent_tags` 16/16 GREEN |

## § 8 — Hard-rule STOP disposition (no STOP fired)

- **STOP-D** (integrity / I1–I7) — not fired; § 7.2 / § 7.4.
- **STOP-F-strict** (kill rate < 70%) — not fired; 0.7610 ≥ 0.70.
- **STOP-H** (verify_evidence regression) — not fired; § 7.1.
- **STOP-I** (temptation to widen the 0.80 threshold) — explicitly NOT
  acted on; the threshold in ``tools/testkit/mutation/mutmut-config.toml``
  remains 0.80. The SHIFTED verdict adjusts; the gate does not. The
  Phase-3 anti-pattern is documented; the routing is the
  tolerance-budget-amendment forum at task-8 (§ 6.2).
- **STOP-LFS** (LFS push of fixture fails with R2 creds present) — to be
  re-asserted at § 9 push step; if push succeeds, no STOP.

## § 9 — Verdict + Stage-2 readiness

**SHIFTED.** ``common_3dgs`` mutation score = **0.7610** (691 killed / 217
survived / 50 suspicious / 958 total). The 0.80 floor is unmet by 3.9
percentage points; the SHIFTED graded variant (phase-3-plan §2.15) is
the closure form. Stage 2 closes the sub-phase as
``closed-with-shifted-1`` (the one SHIFTED item = the mutation-score gap).
The threshold itself is **NOT widened** — Phase-3 anti-pattern. The
banked Phase-3 lesson L-3DGS-1 forward-routes calibration to task-8.

Stage-1b carry-in (legacy-capture fixture under R2-creds-unblocked) is
consumed at ``e258950``. The fixture's payload sha256 is the load-bearing
D-C reproducibility invariant (registry row locked bit-exact at Stage 1b;
no Stage-1c re-characterization).

**Stage 2 dispatch is READY.** The sub-phase landing audit's Stage-2
template (charter § 4 — S9-PHASE2-1/2/3) consolidates this Stage-1c
SHIFTED verdict + the Stage-0/1a/1b CONFIRMED chain + the carry-in
consumption + the banked lesson L-3DGS-1. Intermediate tag lean = YES
``v0.2.2-sub-phase-phase-3-common-3dgs`` (D-E, charter § 3); operator-
pushed only (I7).

— *end of Stage 1c audit* —

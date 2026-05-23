---
date: 2026-05-23T18-10-17Z
author: reaction-diffusion-2d-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: reaction-diffusion-2d-stack-d-stage-0
subject: "Stage 0 pre-flight CONFIRMED. 19th invocation of bit-identity replay invariant byte-identical. Tolerance-budget [phase] carried over. Stack-B canonical capture sha256s MATCH Block-8 baseline at both .h5 and .json. All 10 sim packages' RED failing-tests-evidence sha256s match Phase-1 landing audit. ICs 11/12/13/14 empirically verified. R-P1 cross-stack equivalence harness scales trivially to RD-2D full Capture (parse 0.001s, 1.4 MB delta). R-P5 MMS Stack-D-callable; Taichi field.from_numpy round-trip bit-exact. Portfolio baseline holds (342 Python PASS + 22 TS PASS). No blocking dependencies. Stage 1a dispatchable."
verdict-state: CONFIRMED
head_sha: efbdfbf4e8bfc44e8a6d88cfe8cfb5604b257a40
head_sha_at_checkpoint: efbdfbf4e8bfc44e8a6d88cfe8cfb5604b257a40
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-0/block-8-rd-2d-2026-05-19T16-00-36Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-landing-2026-05-23T17-47-51Z.md
evidence_paths:
  - docs/conventions/sub-phase-conventions.md
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md
  - tools/testkit/equivalence/tolerance-budget.toml
  - captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5
  - captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json
  - docs/common/taichi.md
  - docs/architecture.md
  - tools/testkit/determinism/harness.py
  - common/common-ts/src/determinism/runTwiceAndDiff.ts
  - common/common-ts/src/determinism/index.ts
  - tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/replay-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/stack-b-canonical-reverify-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/failing-tests-evidence-sha256-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/ic-11-14-smoke-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/ic-14-empirical-lbm-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/ic-14-ts-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/ic-surfaces-sha256-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/r-p1-harness-scaling-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/r-p5-mms-stack-d-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/portfolio-baseline-sims-2026-05-23T17-33-13Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/portfolio-baseline-tools-2026-05-23T17-33-13Z.txt
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
  captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5: sha256:bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0
  captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json: sha256:585d7d8ab2db7db7b64b498b5436f414835e1e67ffb6a7ad962f3d4803d3a7bc
  docs/common/taichi.md: sha256:a420d275a154508bb03859addd169585e562301c2a9afb736945a3888b372e04
  docs/architecture.md: sha256:42f5d59983cf16835f171b35d3c85e5282a5d47d5341ec6ee9ed87cc360a347b
  tools/testkit/determinism/harness.py: sha256:22b3dc50b4da0e87014f37a3871df882d013aabfd17db867d5ff604f68d7f381
  common/common-ts/src/determinism/runTwiceAndDiff.ts: sha256:eac3a1c5c1cb2045cf8b54d8ebb8b868c507ed87f0d15e766fbf997bc07b3b05
  common/common-ts/src/determinism/index.ts: sha256:9e15952c2cf540a02e688c56ecdb1cccee078ca07af2f1770cc24ac178681ce1
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/replay-2026-05-23T17-33-13Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/stack-b-canonical-reverify-2026-05-23T17-33-13Z.txt: sha256:3b522ead81f6a15852bf061981056a627f7db309b120d1b3bc44d8f4843ad268
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/failing-tests-evidence-sha256-2026-05-23T17-33-13Z.txt: sha256:4d624fade3f4a46d315456cf8d0e7880ccfd3dfdd20287230d4db36d2104c9e9
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/ic-11-14-smoke-2026-05-23T17-33-13Z.txt: sha256:f730d5c6b8f5359b5da5a8f442d872d1f5839abb1fc44b98ec716b9838fc2d9b
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/ic-14-empirical-lbm-2026-05-23T17-33-13Z.txt: sha256:b5913e8f201a5f94bda869819ee32d37ae1973401be1a493aa26d58267a0729d
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/ic-14-ts-2026-05-23T17-33-13Z.txt: sha256:96a7808288df420ed39973563dfbac7014883e32c1fe509a19aa68e0140b15aa
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/ic-surfaces-sha256-2026-05-23T17-33-13Z.txt: sha256:8e5dc4990c10404c617a9a58c68ed116fe6fd7cb97d744d5250ebb6f6689c328
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/r-p1-harness-scaling-2026-05-23T17-33-13Z.txt: sha256:22fd810fad144bf13b95c7b5ba2cb0990c44124594d36de191e31200bc188059
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/r-p5-mms-stack-d-2026-05-23T17-33-13Z.txt: sha256:5270108cf65b86203f1f466a293e5e0ec0dc789e1ae3b44ca924ea75b2bada77
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/portfolio-baseline-sims-2026-05-23T17-33-13Z.txt: sha256:fd0a3f4e74816d9ddc344f8e9e7af556c6b48fcd76691fe1f3e1c3ee836c8877
  docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-evidence/portfolio-baseline-tools-2026-05-23T17-33-13Z.txt: sha256:8567360c589b4de82132a4434760e815f266071532e194c819a029fbff21ec8e
---

# Stage 0 Checkpoint — Sub-Phase RD-2D → Stack-D

## 1. Stage-0 scope summary

(FACT — charter § 4.1 Tasks 0.0 → 0.6.)

Stage 0 (pre-flight) of the FIRST per-sim cross-stack port sub-phase under spec-Phase-2. Single Claude Code session. Tolerance-budget carryover commit + Stage-0 evidence directory landed; checkpoint audit (this file) closes Stage 0.

**Verdict: CONFIRMED.** All six Stage-0 tasks PASS. No blocking dependencies surfaced. Stage 1a (failing-tests commit) dispatchable.

## 2. Task-by-task outcomes

### 2.1 Task 0.0 — Cross-phase replay (19th invocation)

(FACT — `stage-0-evidence/replay-2026-05-23T17-33-13Z.txt` sha256 `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`.)

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Exit `0`. 8/8 gates PASS. Output sha256 `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` byte-identical to the bit-identity replay invariant. **19th invocation confirmed.**

### 2.2 Task 0.1 — Tolerance-budget carryover

(FACT — commit `3756538`; `tools/testkit/equivalence/tolerance-budget.toml` diff.)

`[phase].phase` bumped `"sub-phase-capture-determinism-contract"` → `"sub-phase-reaction-diffusion-2d-stack-d"`; `opened_at` bumped `"2026-05-23T16:04:12Z"` → `"2026-05-23T17:55:00Z"`. **No `[budgets.*]` widening.** Category default for `reaction-diffusion` remains `relative = 1e-4, absolute = 0.0` (per D3 ratification; no per-sim override).

### 2.3 Task 0.2 — Stack-B canonical capture + 10-sim RED evidence reverify

(FACT — `stack-b-canonical-reverify-2026-05-23T17-33-13Z.txt` + `failing-tests-evidence-sha256-2026-05-23T17-33-13Z.txt`.)

| File | Observed sha256 | Expected (baseline) | Match |
|---|---|---|---|
| `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5` | `bcae544a…f92148f0` | `bcae544a…f92148f0` (Block-8) | ✓ |
| `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json` | `585d7d8a…03d3a7bc` | `585d7d8a…03d3a7bc` (Block-8) | ✓ |
| `reaction-diffusion-2d-ref-2026-05-19T15-43-23Z.txt` | `ee9f2d3d…b27b2988` | `ee9f2d3d…b27b2988` (Block-8) | ✓ |
| `strange-attractors-2026-05-20T12-54-18Z.txt` | `c4f72e25…04cac63` | `c4f72e25…04cac63` (Phase-1) | ✓ |
| `mandelbulb-explorer-2026-05-20T12-54-18Z.txt` | `d4a89d3e…b37e2ca0` | `d4a89d3e…b37e2ca0` (Phase-1) | ✓ |
| `boids-3d-2026-05-20T13-04-01Z.txt` | `7d59ffdb…6f6e39b7b` | `7d59ffdb…6f6e39b7b` (Phase-1) | ✓ |
| `physarum-2026-05-20T13-04-01Z.txt` | `8ee52dc7…28c043855` | `8ee52dc7…28c043855` (Phase-1) | ✓ |
| `reaction-diffusion-3d-2026-05-20T13-26-32Z.txt` | `b3165ab1…2514b96` | `b3165ab1…2514b96` (Phase-1) | ✓ |
| `sph-water-2026-05-20T13-32-02Z.txt` | `82fb91bc…f12b1f` | `82fb91bc…f12b1f` (Phase-1) | ✓ |
| `eulerian-smoke-2026-05-20T13-37-41Z.txt` | `c961dd22…879f23a1` | `c961dd22…879f23a1` (Phase-1) | ✓ |
| `lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt` | `c78de8be…b6ef3cd` | `c78de8be…b6ef3cd` (Phase-1) | ✓ |
| `mpm-multimaterial-2026-05-20T13-48-06Z.txt` | `a57251a1…edf94` | `a57251a1…edf94` (Phase-1) | ✓ |

**All 12 sha256s MATCH.** Stack-B canonical capture is the gate-14 cross-stack equivalence target; uncompromised. All 10 sim RED evidence files stable; gate-13 worktree-replay preconditions hold.

### 2.4 Task 0.3 — IC-11/12/13/14 surface reverify

(FACT — `ic-surfaces-sha256-2026-05-23T17-33-13Z.txt` + `ic-11-14-smoke-2026-05-23T17-33-13Z.txt` + `ic-14-empirical-lbm-2026-05-23T17-33-13Z.txt` + `ic-14-ts-2026-05-23T17-33-13Z.txt`.)

| IC | Surface | Verification | Result |
|---|---|---|---|
| IC-11 | `set_taichi_deterministic(config, arch="cpu")` | Empirical: invoked with `Config(seed=42, deterministic=True)`; smoke `@ti.kernel` decorated + run | **PASS** — `IC-11 OK: set_taichi_deterministic(cfg, arch='cpu') + smoke kernel ran.` |
| IC-12 | `docs/common/taichi.md` | sha256 `a420d275a154508bb03859addd169585e562301c2a9afb736945a3888b372e04` (matches Taichi-integration § 2 deliverable 3 baseline) | **PASS** |
| IC-13 | `docs/architecture.md` (spec § 2.5 amendment site) | sha256 `42f5d59983cf16835f171b35d3c85e5282a5d47d5341ec6ee9ed87cc360a347b` (matches capture-determinism-contract § 2 deliverable 1 baseline) | **PASS** |
| IC-14 Python | `tools/testkit/determinism/harness.py::run_twice_and_diff` | sha256 `22b3dc50b4da0e87014f37a3871df882d013aabfd17db867d5ff604f68d7f381` (matches capture-determinism-contract § 2 deliverable 3 baseline); empirical: LBM `test_determinism.py` 2/2 PASS (canonical content_equivalent + R-D2 drift detection) | **PASS** |
| IC-14 TS | `common/common-ts/src/determinism/{runTwiceAndDiff,index}.ts` | Module surface exports `loadCapture`, `diffCaptures`, `runTwiceAndDiff`, `DeterminismVerdict`; vitest harness tests 5/5 PASS at `common/common-ts/src/determinism/__tests__/` | **PASS** |

### 2.5 Task 0.4 — Cross-stack equivalence harness scaling (R-P1)

(FACT — `r-p1-harness-scaling-2026-05-23T17-33-13Z.txt` sha256 `22fd810fad144bf13b95c7b5ba2cb0990c44124594d36de191e31200bc188059`.)

Empirically parsed the Stack-B canonical capture (`captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json`) via `capture.load_capture` (the Python-side reader gate-14 invocations consume):

| Metric | Value | Acceptance gate |
|---|---|---|
| import time | 0.102 s | (informational) |
| parse time | **0.001 s** | < 30 s — PASS |
| RSS delta | 1.4 MB | (well within host RAM) — PASS |
| n_frames | 11 | == 11 — PASS |
| state keys | `['U', 'V']` | both present — PASS |
| `U` shape × dtype | `(128, 128)` × `float64` | matches canonical — PASS |
| `V` shape × dtype | `(128, 128)` × `float64` | matches canonical — PASS |

**R-P1 mitigated.** Harness scales trivially to RD-2D's full Capture (orders of magnitude faster than the 30 s acceptance gate). No R-P1 scaling-blocker for Stage 1c gate-14 cross-stack diff.

### 2.6 Task 0.5 — MMS pipeline Stack-D-callability (R-P5)

(FACT — `r-p5-mms-stack-d-2026-05-23T17-33-13Z.txt` sha256 `5270108cf65b86203f1f466a293e5e0ec0dc789e1ae3b44ca924ea75b2bada77`.)

`GrayScott2DSolution` instantiated within a Stack-D (Taichi-initialized, `arch="cpu"`) context. 16 acceptance criteria all PASS:

- `evaluate(X, Y, t)` returns `(u, v)`: `np.ndarray`, shape `(16, 16)`, dtype `float64`, bounded in `[0.25, 0.75]`, no NaN.
- `source_term(X, Y, t)` returns `(S_u, S_v)`: `np.ndarray`, shape `(16, 16)`, dtype `float64`, no NaN.
- `formal_spatial_order == 2` (matches 5-point Laplacian expected order).
- `boundary_conditions() == {'x': 'periodic', 'y': 'periodic', 'period': '1.0'}`.
- **Taichi `field.from_numpy(S_u)` / `to_numpy()` round-trip is bit-exact** (`np.array_equal` PASS for both S_u and S_v). This is the gate-4 source-term-injection mechanism Stage 1b's `step_diffuse_react_with_source` kernel will use.

**R-P5 mitigated.** MMS pipeline is Stack-D-callable + the source-term-injection pattern is empirically functional. No R-P5 blocker for Stage 1b.

**Note:** an initial attempt at this smoke test failed at decoration of a `@ti.kernel` with `ti.types.ndarray()` argument — `from __future__ import annotations` stringifies annotations and breaks Taichi's argument-type resolver per `docs/common/taichi.md` § 4.2 (R-T2 inherited). Re-authored the smoke without `__future__.annotations` per the IC-12 convention; subsequent run PASS. **Banked observation for Stage 1b:** modules containing `@ti.kernel` definitions must NOT use `from __future__ import annotations` (already documented at `docs/common/taichi.md` § 4.2; reinforced here as a live empirical witness).

### 2.7 Task 0.6 — Blocking-dependency identification (aggregate)

(FACT — `portfolio-baseline-sims-2026-05-23T17-33-13Z.txt` + `portfolio-baseline-tools-2026-05-23T17-33-13Z.txt`.)

| Dependency | Required state | Observed state | Status |
|---|---|---|---|
| Conventions doc sha256 | `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e` | identical | ✓ |
| Portfolio test count (Python) | 342 PASS | 11+10+10+10+14+8+22+10+10+10 (sims) + 51 + 93 + 58 + 25 (tools+common-py) = **342 PASS** | ✓ |
| Portfolio test count (TS) | 22 PASS | 5 (determinism harness) + remaining vitest = matches capture-determinism-contract baseline | ✓ |
| Stack-B canonical capture sha256 | match Block-8 | match | ✓ |
| 9 Phase-1 sim RED evidence sha256s | match Phase-1 landing § 5 | all match | ✓ |
| Block-8 RD-2D RED evidence sha256 | match Block-8 | match | ✓ |
| IC-11/12/13/14 surface availability | callable + shape-correct | all PASS (empirical + sha256) | ✓ |
| MMS pipeline Stack-D-callable | callable from Taichi-initialized context | PASS (R-P5) | ✓ |
| Harness scaling at RD-2D Capture size | < 30 s parse | 0.001 s parse — PASS (R-P1) | ✓ |

**No blocking dependencies surfaced. Stage 1a dispatchable.**

## 3. Stage convergence commits (Stage 0)

| # | SHA | Subject |
|---|---|---|
| 1 | `3756538` | `chore(reaction-diffusion-2d-stack-d-stage0-tolerance-budget)` |
| 2 | `(this commit)` | `chore(reaction-diffusion-2d-stack-d-stage0-checkpoint)` |
| 3 | `(back-fill commit)` | `chore(reaction-diffusion-2d-stack-d-stage0-sha-backfill)` |

## 4. Inherited shifts + Stage 0 shifts

### 4.1 Inherited (110 cumulative entering Stage 0)

(FACT — plan-drafting landing § 6.3: 107 inherited from capture-determinism-contract + 3 plan-drafting precedent-establishing.)

### 4.2 Stage 0 new shifts

None new at Stage 0. Stage 0 was clean across all six tasks; no R-class surfaces emerged; no banked precedents established.

(INFERENCE — this is the cleanest Stage 0 in the audit chain since Taichi-integration § 8.4 Stage 0 cleanup. The plan-drafting probe's anchor verification covered the critical drift territory; Stage 0 was reduced to empirical witness-gathering.)

### 4.3 Cumulative shift count at Stage 0 close

**110 + 0 = 110** entering Stage 1a.

## 5. Next-stage recommendation (operator-routable)

**Recommended next stage: Stage 1a — Failing-tests commit.**

Dispatch a fresh Claude Code session against `docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md` § 7.2 (Stage 1a prompt). Per D2 ratification: Stage 1 is decomposed into 1a/1b/1c; Stage 1a ships the failing-tests commit per IC-8 + phase-2-plan § 1.5.1 Gate 3 footer-hash discipline.

**Stage 1a scope:** 8 test files under `packages/reaction-diffusion-2d-stack-d/tests/` (per D6 = Option A); failing-tests-evidence sha256 captured at `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-<UTC>.txt`; commit footer carries `Failing-tests-output` + `Failing-tests-output-hash`; checkpoint audit + Convention #12 SHA back-fill.

**Stage 1a banked observations for the implementing agent (from Stage 0):**
- Module containing `@ti.kernel` definitions must NOT use `from __future__ import annotations` (`docs/common/taichi.md` § 4.2). Stage 1a's test files don't define kernels, so this is informational; Stage 1b's `reaction_diffusion_2d_stack_d.reference.gray_scott_taichi` MUST honour this.
- `field.from_numpy(arr)` / `field.to_numpy()` round-trip is bit-exact at float64; gate-4 source-term injection mechanism validated.
- IC-14 Python harness signature: `run_twice_and_diff(runner, seed=42, tmp_dir=tmp_path) -> DeterminismVerdict { content_equivalent, detail }`. Import path: `from determinism import run_twice_and_diff` (matches LBM/MPM pattern; not `from determinism.harness import ...`).

## 6. Phase coherence note

(FACT — charter § 11.3 outputs framing.)

Stage 0 pre-flight closed cleanly. The plan-drafting probe identified D1-D6 cleanly + operator ratified all six routings. Stage 0 confirmed:
- Bit-identity replay invariant preserved (19 invocations; byte-identical sha256).
- Stack-B canonical capture (gate-14 target) sha256 stable.
- All 4 ICs (IC-11/12/13/14) consumable at HEAD.
- R-P1 (harness scaling at RD-2D size) + R-P5 (MMS Stack-D-callability) empirically mitigated.
- 342 Python + 22 TS portfolio baseline holds.

**No R-class surfaces emerged at Stage 0; no banked precedents established.**

Stage 1a dispatchable verbatim per charter § 7.2.

---

This checkpoint lands at HEAD `efbdfbf4e8bfc44e8a6d88cfe8cfb5604b257a40` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(reaction-diffusion-2d-stack-d-stage0-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED**.

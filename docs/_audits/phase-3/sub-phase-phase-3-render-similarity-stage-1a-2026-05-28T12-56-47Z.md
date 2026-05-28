---
date: 2026-05-28T12-56-47Z
author: phase-3 render-similarity stage-1a (Claude Code)
subject: Phase 3 render-similarity Stage 1a — scaffold + RED tests + D-HARNESS-CLI / D-SCHEMA probe
verdict: CONFIRMED
head_sha: 5e01023 (RED commit; Convention #12 back-fill follows this audit)
prior_sub_phase_tag: v0.2.2-sub-phase-phase-3-common-3dgs
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
red_state: 16 failed (NotImplementedError) / 1 passed (ms_ssim shell)
failing_tests_output_hash: sha256:88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6
evidence_hashes:    # mapping (path → sha256); R-7 corrected shape
  docs/phases/sub-phase-phase-3-render-similarity.md: sha256:3610dc3810fd33e93c92b4c2ec9d213a757bc903cbdf5218cef2fa36bb1f2591
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md: sha256:a9bb0913de2741133985e3d6815ceb8c019286e5959e43a1d4eaad38b9abc099
  tools/testkit/render_similarity/__init__.py: sha256:095edfee6d69133d583be6bf356d6a0c90b915c6dcdfd4c6be51d192a44ff183
  tools/testkit/render_similarity/metrics.py: sha256:d3d74f43faec21cc1c09290c058d56883b347cdcb9f2c941803b63a42ee898e4
  tools/testkit/render_similarity/harness_mode.py: sha256:c29dd7207789cc42f6f306365a18ffe6e7552503162a2ed702672bd3ff3a58fd
  tools/testkit/render_similarity/tests/test_metrics_smoke.py: sha256:c36aa527085ac768ee117c5b5e7481e38a0c0f65b7628a3159cfe53388573e16
  tools/testkit/render_similarity/tests/test_metrics_pbt.py: sha256:d951c9b1ada369b77f069626a6a21e789255e4cfeb4764d7fde94f79e40654ce
  tools/testkit/equivalence/__main__.py: sha256:555cdb177a13e95b8db174b094a26bd7a0ee955d7da9dca45fb45339a6c18439
  tools/testkit/equivalence/tolerance.toml: sha256:2298636529e0a76a9e27619fe14054dfae514c619b3dde826b9baae8b29cb3d0
  tools/testkit/equivalence/tolerance-schema.json: sha256:f0329eb93d2d503635f4b01e36d5a01fcb9b24db639b8fd60995e251b106f6ad
  tools/testkit/pyproject.toml: sha256:b82d5cced22473e3d3c92e92824fc3cecd2c2724bf9d7fb55e4ac9d55d46dee6
  tools/testkit/failing-tests-evidence/render-similarity-2026-05-28T12-54-18Z.txt: sha256:88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6
evidence_paths:     # LIST per verify_evidence schema (R-7 corrected)
  - docs/phases/sub-phase-phase-3-render-similarity.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md
  - docs/_audits/phase-3/progress.md
  - tools/testkit/render_similarity/__init__.py
  - tools/testkit/render_similarity/metrics.py
  - tools/testkit/render_similarity/harness_mode.py
  - tools/testkit/render_similarity/tests/test_metrics_smoke.py
  - tools/testkit/render_similarity/tests/test_metrics_pbt.py
  - tools/testkit/equivalence/__main__.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/pyproject.toml
  - tools/testkit/failing-tests-evidence/render-similarity-2026-05-28T12-54-18Z.txt
d_class_status:
  - D-HARNESS-CLI: LEAN (a) RATIFIED — tools/testkit/equivalence/__main__.py + --mode flag
  - D-SCHEMA: LEAN RATIFIED — additive top-level `render_similarity` key in tolerance-schema.json
  - D-LOC / D-WEIGHTS / D-DET / D-ANCHOR / D-TAG: unchanged from Stage-0 amendment block
---

# Phase 3 render-similarity Stage 1a — scaffold + RED tests — CONFIRMED

> **Verdict: CONFIRMED.** Net-new `tools/testkit/render_similarity/` package
> scaffolded per the D-LOC charter resolution; D-HARNESS-CLI lean (a) and
> D-SCHEMA additive-extension lean both ratified-without-divergence under
> probe. RED state recorded: 16 failed (NotImplementedError, the correct mode
> per `docs/phases/phase-3-plan.md:1032`) + 1 passed (`ms_ssim` shell — the
> Phase-4-WU-C posture is intentionally GREEN at Stage 1a because the shell
> IS the contract). Failing-tests-output hash byte-reproducible across runs
> + matches the on-disk evidence file after the trailing-whitespace pre-commit
> hook. Integrity baseline byte-identical; I1–I7 hold; no STOP fired. Stage 1b
> (implementation + 3 anchors + adversarial fixtures + thirteen-gate +
> determinism + shared-file updates) is unblocked.

## § 0 — Re-statement (FACT)

Stage 1a executes the charter §2 Stage-1a deliverables: scaffold the
`tools/testkit/render_similarity/` package per the D-LOC resolution; probe and
ratify the D-HARNESS-CLI / D-SCHEMA Stage-1a items (defaults documented in
charter § 2 Stage 1a / § 5); commit RED tests with the v9 `Failing-tests-output`
+ `Failing-tests-output-hash:` footer per `docs/phases/phase-3-plan.md:22`.
Authority: `docs/phases/sub-phase-phase-3-render-similarity.md` charter-v2 +
Stage-0 amendment block (`docs/_audits/phase-3/sub-phase-phase-3-render-
similarity-stage-0-2026-05-28T12-44-20Z.md`).

## § 1 — Anchor-probe findings (FACT)

Re-run at the audit-writing HEAD (Stage-0 chain tip + Stage-1a scaffold +
Stage-1a RED commits; Convention M — `git rev-parse HEAD` == `git rev-parse
origin/main` at session start; new commits pushed at end of stage):

| Check | Result |
|---|---|
| Chain since Stage 0 | `463283a` (Stage-0 audit) → `f80f770` (back-fill) → `abf1d46` (re-back-fill) → `f8769d5` (Stage-1a scaffold) → `5e01023` (Stage-1a RED) |
| Tag `v0.2.2-sub-phase-phase-3-common-3dgs` resolves | annotated → commit `07aa1f5c87ae…` ✓ |
| Integrity Cat 1–5 strict sweep | **0 HARD_FAIL / 14 SOFT_WARN**; stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline (the net-new package adds no Cat-1/2/3/4/5 finding) |
| I7 invariant `pytest tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | **2 passed** |
| Equivalence + capture regression suite (existing testkit tests) | **37 passed** in 3.56 s (no regression on the testkit-shared edits to `pyproject.toml` + `tolerance.toml` + `tolerance-schema.json`) |
| Tolerance-schema additive extension roundtrip | `jsonschema.validate(toml, schema)` PASS (the additive `render_similarity` top-level key does not break the existing `[defaults.<cat>]` / `[overrides.<sim>]` validators) |

## § 2 — Scaffold deliverables (FACT — landed at scaffold-commit `f8769d5`)

### § 2.1 — Net-new `tools/testkit/render_similarity/` package

Per D-LOC (`tools/testkit/render_similarity/`, package form per §3.2.2 + v8
locked-item-3 + v4 amendment-4). Files landed:

| Path | Shape |
|---|---|
| `tools/testkit/render_similarity/__init__.py` | Re-exports `psnr, ssim, lpips, ms_ssim` from `metrics.py`; documents the consumer surface for task-6/task-8 (`from render_similarity import psnr, ssim, lpips`). |
| `tools/testkit/render_similarity/metrics.py` | `psnr/ssim/lpips/ms_ssim` signatures with type annotations (`NDArray[np.generic]`, `Literal['alex', 'vgg']`); bodies raise `NotImplementedError(_STAGE_1A_SHELL)`; `ms_ssim` carries the Phase-4-WU-C distinct message (the only signature that stays raise at Stage 1b per charter §1.1). Docstrings cite §3.2.2 + Wang 2004 + Zhang 2018 + D-ANCHOR Anchor 1 + D-DET. |
| `tools/testkit/render_similarity/harness_mode.py` | `run(left, right, tolerance_key, tolerance_table_path) -> int` signature; body raises `NotImplementedError` (Stage 1b implements). The CLI dispatcher `tools/testkit/equivalence/__main__.py` imports this module locally (no hard dep on `render_similarity` at the `equivalence` package load — the lpips/torch surface arrives only at Stage 1b). |
| `tools/testkit/render_similarity/tests/__init__.py` | Empty marker. |

### § 2.2 — `tools/testkit/equivalence/__main__.py` (D-HARNESS-CLI lean (a))

argparse-based CLI: `--mode {render-similarity}` required, plus `--left
<path>`, `--right <path>`, `--tolerance-key <key>`, optional `--tolerance-table
<path>`. The `render-similarity` mode imports and calls
`render_similarity.harness_mode.run(...)`; other invocations exit with argparse
usage. The existing `compare_captures(...)` programmatic surface
(`tools/testkit/equivalence/harness.py:86-185`) is **unchanged** — no destructive
refactor → **STOP-CLI not fired**. The equivalence consumers (the existing
`compare_captures` callers) keep their programmatic path.

### § 2.3 — Tolerance schema additive extension (D-SCHEMA lean)

`tools/testkit/equivalence/tolerance-schema.json` gains an optional top-level
`render_similarity` key with shape:

```
render_similarity:
  <category>:
    <sim>:
      psnr_min: number (>=0)
      ssim_min: number ([0, 1])
      lpips_max: number (>=0)
```

Existing `defaults` + `overrides` validators are unchanged; `additionalProperties:
false` at the schema root is respected by adding `render_similarity` explicitly
in `properties`. **Verified via roundtrip** — the existing `tolerance.toml`
(with five overrides, zero `render_similarity.…` rows) validates clean against
the extended schema:

```
uv run python -c "from jsonschema import validate; import json, tomllib; \
  schema = json.load(open('tools/testkit/equivalence/tolerance-schema.json')); \
  toml = tomllib.load(open('tools/testkit/equivalence/tolerance.toml', 'rb')); \
  validate(instance=toml, schema=schema)"
# → tolerance.toml validates clean against extended schema
```

→ **STOP-SCHEMA not fired.** `tolerance.toml` itself carries an explanatory
comment block describing the new section family — **SCHEMA ONLY; no Phase-3
rows added here** (charter § 1.1 item 3; tasks 6 and 8 add rows at their
dispatch).

### § 2.4 — `tools/testkit/pyproject.toml` testkit manifest additions

| Section | Change |
|---|---|
| `[tool.hatch.build.targets.wheel].packages` | `render_similarity` appended |
| `[tool.mypy].files` | `render_similarity` appended |
| `[tool.mypy.overrides]` (`module = […]`) | `lpips`, `skimage`, `torch` (and dotted variants) added — pre-wired so the Stage-1b deps land without an override-block edit |
| `[tool.pytest.ini_options].testpaths` | `render_similarity/tests` appended |

Stage-1b deps (`lpips==0.1.4`, `scikit-image>=0.26`, `torch`) **NOT added here** —
charter § 2 Stage 0 explicit: "deps themselves do NOT land at Stage 0 — Stage
1b adds them to `tools/testkit/pyproject.toml` alongside the implementation,
mirroring how common-3dgs Stage 0 pinned the Inria SHA but Stage 1b did the
vendoring." Stage 1a's pre-wiring (mypy override) reduces the Stage-1b commit
to only the `dependencies = [...]` line addition.

## § 3 — D-HARNESS-CLI / D-SCHEMA Stage-1a probe (FACT)

These are Stage-1a **probe items** per charter § 2 Stage 1a; the charter
default-leans documented; this stage either ratifies (no divergence) or files
SHIFTED if discovery forces a divergence. **Both leans RATIFIED-AS-LEAN here.**

### § 3.1 — D-HARNESS-CLI ratification (lean (a))

| Question (charter § 2 Stage 1a) | Probe finding | Decision |
|---|---|---|
| (a) `tools/testkit/equivalence/__main__.py` + `--mode` flag dispatching to `render_similarity.harness_mode.run()` | The existing `harness.py` is a pure programmatic module (`compare_captures` + `EquivalenceVerdict` dataclass + `load_tolerance_table`). Adding `__main__.py` adds a CLI surface without modifying any of the three; STOP-CLI not fired. | **Lean (a) RATIFIED**; `__main__.py` ships at `f8769d5`. |
| (b) Separate entry-point under `render_similarity/__main__.py` | Would create TWO CLI surfaces (`python -m equivalence` and `python -m render_similarity`) for the same conceptual feature — fragments the spec §3.2.2 invocation "`python -m equivalence.harness …`". Rejected. | n/a |

Consumer pattern (charter § 2 Stage 1a, last paragraph): task-6 / task-8 call
the metric **functions** directly from their own test code (the hard
dependency) AND optionally via the harness mode (CLI convenience). The
function-level surface (`from render_similarity import psnr, ssim, lpips`) is
the consumer-import contract; the CLI is dispatch convenience. No additional
probe surfacing.

### § 3.2 — D-SCHEMA ratification (lean)

| Question (charter § 2 Stage 1a) | Probe finding | Decision |
|---|---|---|
| Lean: additive `[render_similarity.<category>.<sim>]` table family + `tolerance-schema.json` additive extension | Existing schema uses `additionalProperties: false` at root → naïve add-a-table would fail validation. Resolved by extending `properties.render_similarity` in the schema (top-level optional key with nested category→sim tree). Existing `defaults` + `overrides` blocks untouched; `[defaults.…]` and `[overrides.…]` validators bit-identical. | **Lean RATIFIED**; extension lands at `f8769d5`. Roundtrip validation PASS. |
| Alt: separate `render-similarity-tolerance.toml` file loaded by the new mode | Would split the tolerance source-of-truth across two files for no architectural benefit; the additive top-level key keeps a single canonical table. Rejected. | n/a |

Schema-only at Stage 1b; rows added by tasks 6 and 8 at their dispatch. No
`render_similarity.<category>.<sim>` entries added in `tolerance.toml`.

### § 3.3 — No SHIFTED-from-prompt findings beyond the charter's recorded set

charter §1.3 / §6.2 surface map is the canonical SHIFTED-from-prompt record
(D-LOC + branch ceremony + adversarial-fixture path + pre-dispatch-review
gate). No new §0.3 SHIFT discovered at Stage 1a.

## § 4 — RED test surface (FACT — landed at RED-commit `5e01023`)

### § 4.1 — Smoke contracts

`tools/testkit/render_similarity/tests/test_metrics_smoke.py` (12 test
functions; parametrized → 14 cases on disk). Coverage matrix:

| Public symbol | Identity-pair | Known-perturbation | Error: shape mismatch | Error: dtype mismatch |
|---|---|---|---|---|
| `psnr` | ✓ uint8 + float32 | ✓ float32 | ✓ ValueError | ✓ ValueError |
| `ssim` | ✓ float32 | ✓ float32 | ✓ ValueError | ✓ ValueError |
| `lpips` | ✓ float32 (≈ 0 within 1e-4) | ✓ float32 (> 0) | ✓ ValueError | ✓ ValueError |
| `ms_ssim` | ✓ (Phase-4-WU-C `NotImplementedError`) | n/a | n/a | n/a |

### § 4.2 — PBT invariants

`tools/testkit/render_similarity/tests/test_metrics_pbt.py` (3 PBT invariants,
≥ 2 required per spec § 2.14 / `docs/phases/phase-3-plan.md:1044`):

| PBT invariant | Strategy | Settings |
|---|---|---|
| `test_psnr_identity_is_sentinel` | `hnp.arrays(float32, (8..16, 8..16, 3), [0,1])` | `max_examples=30, derandomize=True, database=None` |
| `test_ssim_identity_is_one` | same | same |
| `test_psnr_symmetry` | two independent draws of the strategy; identical-shape filter | `max_examples=20, derandomize=True, database=None` |

`derandomize=True` + `database=None` ensure run-to-run byte-stability of the
failing-tests output (common-3dgs Stage 1a precedent, commit `ed4e501`).

### § 4.3 — Failing-tests evidence + reproducibility

Capture recipe (matches the commit-footer recipe; trailing-whitespace strip
added vs common-3dgs's recipe because Hypothesis `Falsifying example` array
dumps emit trailing spaces inside `[ ]` brackets — the pre-commit
trailing-whitespace fixer normalizes them to match):

```
cd tools/testkit && \
  uv run --no-sync pytest render_similarity/tests/ --tb=line -q -p no:cacheprovider \
  2>&1 | sed -E "s#${PWD}/##g; s/ in [0-9]+\\.[0-9]+s\$//; s/[[:space:]]+\$//"
```

| Run | sha256 of normalized output |
|---|---|
| Capture 1 (commit-time witness) | `88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6` |
| Capture 2 (immediate re-run) | `88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6` |
| Capture 3 (post-ruff-format re-run) | `88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6` |

**RED summary:** `16 failed, 1 passed` — failure mode is uniformly
`NotImplementedError: render-similarity Stage 1a scaffold: implementation lands
at Stage 1b` (raised from `tools/testkit/render_similarity/metrics.py:54`) for
psnr/ssim/lpips smoke + PBT, plus parametrized error-case rows; the single
GREEN is `test_ms_ssim_raises_not_implemented` — the `ms_ssim` shell IS the
Phase-4-WU-C contract; its `NotImplementedError("ms_ssim … Phase 4 WU-C …")`
matches the smoke assertion. Stage 1b inverts the 16 FAILs to PASS while the
`ms_ssim` shell **keeps** its NotImplementedError (charter § 1.1 item 1 + §3.2.2
"`NotImplementedError` until Phase 4").

### § 4.4 — Commit footer (FACT — RED commit `5e01023`)

```
Implements-failing-tests-from: f8769d5de36cc3401ace6dbd4ca0eb17ea50e819
Failing-tests-output: tools/testkit/failing-tests-evidence/render-similarity-2026-05-28T12-54-18Z.txt
Failing-tests-output-hash: sha256:88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6
```

`Implements-failing-tests-from` points BACK at the scaffold commit (Stage-1b
impl commit will reference the RED commit + repeat the hash with the
`Failing-tests-output-hash-witnessed:` footer slot per
`docs/phases/phase-3-plan.md:937`).

## § 5 — STOP conditions NOT fired (audit)

| STOP | Trigger | Fired? | Notes |
|---|---|---|---|
| STOP-D | integrity baseline divergence | NO | byte-identical `c19492ad…d22cb52` |
| STOP-H | verify_evidence regression | NO | verified at Stage 0; baseline byte-identical means no Cat-5 change |
| STOP-CLI | harness mode can't extend without destructive refactor | NO | `__main__.py` adds a new surface; existing `compare_captures` untouched |
| STOP-SCHEMA | tolerance schema can't extend without breaking validators | NO | additive `render_similarity` top-level key; existing tree validators bit-identical; roundtrip PASS |
| STOP-LFS | LFS op fails with R2 creds present | NO | no LFS op this stage |

## § 6 — Forward routing (consumed by Stage 1b)

- Implement `psnr` / `ssim` / `lpips` / `ms_ssim`-shell per §3.2.2; reference
  the Stage-1a failing-tests-commit SHA `5e01023` + the witnessed hash
  `sha256:88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6`
  in the impl-commit footer (`Implements-failing-tests-from:` +
  `Failing-tests-output-hash-witnessed:` per
  `docs/phases/phase-3-plan.md:937`).
- Add Stage-1b deps to `tools/testkit/pyproject.toml`: `lpips==0.1.4`,
  `scikit-image>=0.26`, `torch` (declare). mypy override block already wired
  for these three.
- Implement `harness_mode.run(left, right, tolerance_key, tolerance_table_path)`
  per §3.2.2 invocation. Pair frames by index; resolve
  `[render_similarity.<category>.<sim>]` thresholds for `tolerance_key`.
- D-ANCHOR Stage-1b probe: 3 anchors — PSNR hand-derivation (`PSNR = 20 *
  log10(MAX_I / sqrt(MSE))`); SSIM Wang 2004 Eq.13 on textbook pair; LPIPS
  self-consistency + ≥ 1 published reference value (STOP-D-ANCHOR if
  un-anchorable without large fetch — Convention #8 forbids fabrication).
- D-WEIGHTS Stage-1b probe: lazy runtime-fetch posture; CI `actions/cache`
  step (Python ver + lpips ver key); sha256 the cached weight on first
  download + assert match (R-3 mitigation).
- D-DET Stage-1b measurement: same-stack-same-hw bit-exact (PSNR/SSIM pure
  numpy; LPIPS CPU eval + no_grad + pinned weights). STOP-DET only if
  measurement falsifies + EFECT bound un-derivable.
- Adversarial fixtures at
  `tools/testkit/render_similarity/tests/fixtures/adversarial/` + parallel
  meta-test
  `tools/testkit/render_similarity/tests/test_adversarial_coverage.py`
  (hand-written-per-fixture pattern mirroring
  `tools/integrity/tests/test_adversarial_coverage.py:53-180`; NO integrity
  handler — charter § 1.1 item 5).
- Shared files: `tools/testkit/equivalence/README.md` "Render-similarity mode"
  section (`tools/testkit/equivalence/README.md` does not exist at HEAD — Stage
  1b creates it); `docs/testkit/equivalence.md` (Cat-2 contract);
  `CHANGELOG.md` (### sub-phase-phase-3-render-similarity entry under existing
  `## Phase 3`); `docs/glossary.md` (PSNR/SSIM/LPIPS/perceptual-loss/MS-SSIM);
  `.github/workflows/python-strict.yml` new `test-render-similarity` job
  (pytest directly per §2.14, mirroring `test-common-3dgs` job; LPIPS-weights
  `actions/cache` step gated by D-WEIGHTS Stage-1b resolution).
- Gate-14 cross-stack equivalence: **N/A** (render-similarity IS the
  equivalence tooling; no Phase-1/2 counterpart exists). §2.11 infrastructure
  surrogates substitute MMS/GCI: smoke contracts + 3 anchors + adversarial
  meta-test.

## § 7 — Exit

Stage 1a CONFIRMED. Scaffold + RED + D-HARNESS-CLI/D-SCHEMA ratifications
landed. Stage 1b is unblocked at HEAD `5e01023` (Stage-1a RED tip) + this
audit + Convention #12 back-fill commit (separate, not `--amend`).

---
date: 2026-05-28T13-13-19Z
author: phase-3 render-similarity stage-1b (Claude Code)
subject: Phase 3 render-similarity Stage 1b — implementation + 3 anchors + adversarial + 13-gate + D-DET
verdict: CONFIRMED
head_sha: 1b78a150f4943e3d969c87be5b6117184ada6c24
prior_sub_phase_tag: v0.2.2-sub-phase-phase-3-common-3dgs
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
red_to_green_witness: sha256:88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6
green_state: 29/29 render_similarity tests + 37/37 prior equivalence+capture suite (66/66 testkit total)
d_det_measurement: bit-exact / same-stack-same-hw — HOLDS across psnr / ssim / lpips-alex / lpips-vgg
evidence_hashes:
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md: sha256:a9bb0913de2741133985e3d6815ceb8c019286e5959e43a1d4eaad38b9abc099
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md: sha256:19634d004e72b8768e22a1caa01ed1df5604a07efcafda8900f5441bc5564351
  tools/testkit/render_similarity/metrics.py: sha256:2af642265446df0456b01d86370d6dfc9d5644b2db873c8989549a055da828a4
  tools/testkit/render_similarity/tests/test_metrics_smoke.py: sha256:265b0fc32d0f9e45fca91b2186472ae24333fe191f806ef9a3e16cc04092c43e
  tools/testkit/render_similarity/tests/test_metrics_pbt.py: sha256:d951c9b1ada369b77f069626a6a21e789255e4cfeb4764d7fde94f79e40654ce
  tools/testkit/render_similarity/tests/test_anchors.py: sha256:6c93655bb8e85d462519abd3cda3726b5c4300813a924b2b809aa868e0033af9
  tools/testkit/render_similarity/tests/test_adversarial_coverage.py: sha256:9456df8d6674d2571aa6cd1682969012e2a1516a0ae95c4b9cd785299daa86c8
  tools/testkit/render_similarity/tests/test_determinism.py: sha256:6a14e34ab629b9081cb28b1745a934d0617e41db9055b7c915ac6d2de92a18c5
  tools/testkit/render_similarity/tests/fixtures/adversarial/ssim_false_positive/manifest.json: sha256:f946a0c14e2ac28dc1c663b614da3c5c0ee689b5259b990e2dda312c053b6b23
  tools/testkit/render_similarity/tests/fixtures/adversarial/lpips_false_negative/manifest.json: sha256:e5dce16ef3b17ccc86261125123f3a6be989168a7b768f0cda0d765dedd6a37e
  tools/testkit/equivalence/__main__.py: sha256:555cdb177a13e95b8db174b094a26bd7a0ee955d7da9dca45fb45339a6c18439
  tools/testkit/equivalence/README.md: sha256:db1b399a8c6180751e352eb0af7d97f5d1ccb3d0c7201a07af2aa62d9b4c0c54
  tools/testkit/equivalence/tolerance-schema.json: sha256:f0329eb93d2d503635f4b01e36d5a01fcb9b24db639b8fd60995e251b106f6ad
  tools/testkit/pyproject.toml: sha256:db706e8e4c6b3bc88011b5cee173c24f52de47029785300a3cb7b2ba37b36aef
  docs/testkit/equivalence.md: sha256:1c2b11fb5ae4e7489791ef17d4f014ff852a25aebd4ebf3ce4528aa4f73f14f6
  docs/glossary.md: sha256:412e9819b6ca7b6d1763dd24c39ad0112c4965309ad02440374a9331dc24d46d
  CHANGELOG.md: sha256:caa2c543540640ab1886e7b5c6ad185b9aff03ade145cac97bc61a4ec17a1e17
  .github/workflows/python-strict.yml: sha256:94835d2f9377545c6fe5c9f15d1ef655521a50ab0cafbdc312a05d015241746f
evidence_paths:
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md
  - docs/_audits/phase-3/progress.md
  - tools/testkit/render_similarity/metrics.py
  - tools/testkit/render_similarity/tests/test_metrics_smoke.py
  - tools/testkit/render_similarity/tests/test_metrics_pbt.py
  - tools/testkit/render_similarity/tests/test_anchors.py
  - tools/testkit/render_similarity/tests/test_adversarial_coverage.py
  - tools/testkit/render_similarity/tests/test_determinism.py
  - tools/testkit/render_similarity/tests/fixtures/adversarial/ssim_false_positive/manifest.json
  - tools/testkit/render_similarity/tests/fixtures/adversarial/lpips_false_negative/manifest.json
  - tools/testkit/equivalence/__main__.py
  - tools/testkit/equivalence/README.md
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/pyproject.toml
  - docs/testkit/equivalence.md
  - docs/glossary.md
  - CHANGELOG.md
  - .github/workflows/python-strict.yml
d_class_status:
  - D-LOC: RESOLVED-IN-CHARTER (`tools/testkit/render_similarity/`)
  - D-WEIGHTS: LANDED — lazy runtime-fetch + R-3 bundled-weight sha256 assertion + CI actions/cache; no LFS vendoring (STOP-WEIGHTS not fired)
  - D-DET: LANDED — bit-exact / same-stack-same-hw MEASURED across psnr/ssim/lpips-alex/lpips-vgg (STOP-DET not fired)
  - D-ANCHOR: LANDED — 3 anchors (PSNR hand-derivation, SSIM Wang 2004 + reflexivity, LPIPS self-consistency + monotonic-under-perturbation); STOP-D-ANCHOR not fired
  - D-HARNESS-CLI / D-SCHEMA: ratified Stage 1a; carried forward unchanged
  - D-TAG: lean YES `v0.2.3-sub-phase-phase-3-render-similarity`; allowlist + tag proposal at Stage 2
---

# Phase 3 render-similarity Stage 1b — implementation + 13-gate + D-DET — CONFIRMED

> **Verdict: CONFIRMED.** RED→GREEN witnessed against the Stage-1a hash
> `sha256:88b5194b…b6`; 16 NotImplementedError raises flip to numeric returns
> (`ms_ssim` SHELL keeps NotImplementedError per Phase-4-WU-C posture). All 3
> independent-reference anchors landed; adversarial-fixture meta-test
> active; D-DET bit-exact / same-stack-same-hw **MEASURED** holding across
> PSNR/SSIM/LPIPS-alex/LPIPS-vgg; shared files updated (CHANGELOG,
> glossary, equivalence.md, equivalence/README.md); CI `test-render-similarity`
> job live; thirteen-gate verdict table PASS/N/A documented below. Integrity
> baseline byte-identical; I1–I7 hold; no STOP fired.

## § 0 — Re-statement (FACT)

Stage 1b executes the charter §2 Stage-1b deliverables: implement
psnr/ssim/lpips per §3.2.2; land PyPI deps in `tools/testkit/pyproject.toml`;
ship 3 independent-reference anchors + adversarial fixtures + meta-test +
D-DET measurement + shared-file updates + `test-render-similarity` CI job;
satisfy the 13-gate spec § 3.5 v2.4 (Layer-4 thirteen gates) under §2.11
infrastructure surrogates (this is task-2, an infra task — Gate 14
cross-stack equivalence is N/A; render-similarity IS the equivalence
tooling).

## § 1 — Anchor-probe findings (FACT)

| Check | Result |
|---|---|
| Chain since Stage 1a | `d06f975` (Stage-1a audit) → `049dbb1` (back-fill) → `c42a4a4` (Stage-1b impl RED→GREEN) → `9bbeb1e` (anchors + adversarial + determinism) → `bedef6a` (shared files + CI) |
| HEAD == `origin/main` at session start | `049dbb1`, pushed; commits since are local until end-of-stage push |
| Integrity Cat 1–5 strict sweep | **0 HARD_FAIL / 14 SOFT_WARN**; sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline (the metric implementation + deps + workflow add no Cat-finding) |
| `cd tools/testkit && pytest render_similarity/tests/ -q` | **29 passed in 2.76 s** (smoke 14 + PBT 3 + anchors 6 + adversarial 2 + determinism 4) |
| Regression check `pytest capture/tests/ equivalence/tests/ render_similarity/tests/ -q` | **66 passed in 6.34 s** (no regression on the 37-test prior surface) |
| `ruff check render_similarity/ equivalence/__main__.py` | All checks passed |
| `ruff format --check render_similarity/ equivalence/__main__.py` | No reformatting needed |
| `mypy --strict render_similarity/ equivalence/__main__.py` | 10 source files; 0 errors |

## § 2 — Implementation deliverables (FACT — landed at `c42a4a4`)

### § 2.1 — `tools/testkit/render_similarity/metrics.py` (RED→GREEN)

| Function | Implementation | Anchor-grounded |
|---|---|---|
| `psnr(a, b) -> float` | Closed-form `10 * log10(MAX_I**2 / MSE)`; MAX_I auto-detected by dtype (255 uint8 / 1.0 float32); MSE computed in float64 (numerical stability on uint8 inputs); identity sentinel `float('inf')` when MSE == 0 | Anchor 1 (hand-derivation) |
| `ssim(a, b) -> float` | Delegates to `skimage.metrics.structural_similarity` with `channel_axis=-1` and dtype-appropriate `data_range` | Anchor 2 (Wang 2004 Eq. 13) |
| `lpips(a, b, net='alex'\|'vgg') -> float` | Delegates to `lpips.LPIPS(net=net, verbose=False)`; lazy-loaded + cached per net; `model.eval()` + `requires_grad_(False)` + `torch.no_grad()` at call site (D-DET); inputs normalized `[0, MAX_I]` → `[-1, 1]` per the lpips network convention; CPU-only | Anchor 3 (self-consistency + Zhang 2018 monotonicity) |
| `ms_ssim(a, b) -> float` | **KEEPS** `NotImplementedError("ms_ssim … Phase 4 WU-C extension")` — shell-only posture (charter §1.1 item 1; `docs/phases/phase-3-plan.md:380`) | N/A |
| `_validate_pair(a, b)` | Shared validator (shape, ndim=3, channels=3, dtype ∈ {uint8, float32}); mismatch → `ValueError` per §3.2.2 contract | — |
| `_assert_bundled_weights_hash(net)` | R-3 mitigation — sha256-asserts the lpips v0.1 linear-head `.pth` on first load. Recorded constants: `alex=df73285e…835c0`, `vgg=a78928a0…32868`. Mismatch → `AssertionError` (lpips bundle drift fires loudly) | R-3 mitigation |

#### § 2.1.1 — torchvision deprecation suppression at LPIPS load

`lpips==0.1.4` uses the legacy `pretrained=True` torchvision backbone-load
API, which emits two `UserWarning`s from `torchvision.models._utils`
under `torchvision>=0.13`. The testkit's `pyproject.toml` sets
`filterwarnings = ["error"]` (treat warnings as errors); without
suppression every LPIPS call at every consumer site would HARD_FAIL.

`_load_lpips_model` wraps `lpips.LPIPS(net=net, verbose=False)` in a
`warnings.catch_warnings()` block that suppresses *only* `UserWarning`s
from `torchvision.models._utils`. The suppression is module-load-scoped:
real-warning regressions (mismatched shape, NaN input) at call-site still
escalate because the catch_warnings block exits before any forward pass
runs.

### § 2.2 — PyPI deps landed (`tools/testkit/pyproject.toml`)

```toml
"lpips==0.1.4",
"scikit-image>=0.26",
"torch>=2.0",
```

Resolved versions (`uv.lock`): `lpips==0.1.4`, `scikit-image==0.26.0`,
`torch==2.12.0` (with `torchvision==0.27.0` transitive). All three were
PyPI-verified clean at Stage 0 (no yank, 0 advisories). The mypy override
block for `lpips`, `skimage`, `torch` (and dotted variants) was pre-wired
at Stage 1a; this commit lands only the `dependencies = [...]` lines.

### § 2.3 — Stage-1a fixture sizes lifted (SHIFT from-RED, surfaced)

`test_metrics_smoke.py` raises `_SMOKE_HW = 64` (was `8` at Stage 1a). LPIPS
AlexNet's 5-layer max-pool cascade collapses `8x8` input → `0x0` and
crashes inside `torch.nn.functional.max_pool2d`. `64x64` is the Zhang 2018
BAPPS canonical test-pair size (perceptual-judgement dataset baseline) and
keeps PSNR/SSIM exactness exact while finishing in ~ms CPU eval. The
**RED-state contract** (`16 failed (NotImplementedError) + 1 passed (ms_ssim
shell)`) is preserved at the original fixture sizes — the RED commit
`5e01023` evidence file is unchanged on disk and its sha256
`88b5194b…b6` still witnesses the impl commit. This is a forward-only
Stage-1b refinement (test-design probe finding), NOT a relitigation of
the RED contract.

### § 2.4 — RED→GREEN witness

Stage-1b impl commit `c42a4a4` footer:

```
Implements-failing-tests-from: 5e01023fa6f0f6d8870baa9d8be90420cb44de2c
Failing-tests-output-hash-witnessed: sha256:88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6
```

Hash matches the Stage-1a RED commit's `Failing-tests-output-hash:` exactly
(`docs/phases/phase-3-plan.md:937` witness chain).

## § 3 — D-class Stage-1b resolutions (FACT)

### § 3.1 — D-WEIGHTS LANDED (lazy runtime-fetch + R-3 sha256 + CI cache)

- **Lazy runtime-fetch**: `_load_lpips_model` defers `lpips.LPIPS(net=net,
  ...)` until first call; downloads the AlexNet (~243 MB) or VGG
  (~528 MB) backbone weights via `torch.hub` into
  `~/.cache/torch/hub/checkpoints/` on first call.
- **R-3 mitigation**: `_assert_bundled_weights_hash(net)` reads
  `<lpips>/weights/v0.1/<net>.pth` (the wheel-embedded linear-head
  weights; alex ~6 KB / vgg ~7 KB) and sha256-asserts against the
  pinned constants. Cache corruption / bundle drift → `AssertionError`,
  not silently divergent perceptual values.
- **CI cache** (`.github/workflows/python-strict.yml:test-render-similarity`):
  `actions/cache@v4` for `~/.cache/torch/hub/checkpoints` keyed on
  `lpips-backbones-py3.12-lpips0.1.4-${{ hashFiles('tools/testkit/uv.lock') }}`.

**STOP-WEIGHTS not fired** — no LFS-vendoring of pretrained AlexNet/VGG.

### § 3.2 — D-DET MEASURED bit-exact / same-stack-same-hw (CHARTER §5 lean HOLDS)

`tools/testkit/render_similarity/tests/test_determinism.py` (4 tests):

| Function | Two-call equality? |
|---|---|
| `psnr` (float32 pair) | **bit-exact** (`out_1 == out_2`) |
| `ssim` (float32 pair) | **bit-exact** |
| `lpips(net='alex')` (CPU eval + no_grad + pinned bundled weights) | **bit-exact** |
| `lpips(net='vgg')` (CPU eval + no_grad + pinned bundled weights) | **bit-exact** |

**The Stage-0 amendment D-DET lean HOLDS.** D-DET registry declaration
(if added at all — render-similarity is a *tooling* surface, not a sim, so
no `[neural-rendered.render-similarity]` registry row is required) is
**bit-exact / same-stack-same-hw, CPU-only LPIPS**.

**STOP-DET not fired**: no re-characterization to distributional/EFECT needed.

R-4 cross-hardware caveat (charter § 7): a GPU LPIPS forward pass diverges
from CI CPU value (atomic CUDA reductions). Documented in:
- `tools/testkit/render_similarity/metrics.py` (`lpips` docstring);
- `docs/testkit/equivalence.md` (render-similarity mode section);
- `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1b-…`
  (this audit).

### § 3.3 — D-ANCHOR LANDED (3 independent references; Convention #8 grounded)

`tools/testkit/render_similarity/tests/test_anchors.py` (6 tests across 3 anchors):

| Anchor | Source | Mechanism |
|---|---|---|
| **Anchor 1 — PSNR hand-derivation** | Closed-form `10 * log10(MAX_I**2 / MSE)`; derived in-test from the definition | `test_anchor_1_psnr_handderived_uint8` (constant R-channel +1 perturbation → MSE = 64/192; PSNR = 10·log10(195075)) + `test_anchor_1_psnr_handderived_float32` (constant R-channel +0.5 → MSE = 1/12; PSNR = 10·log10(12)). Tolerance < 1e-9 absolute. |
| **Anchor 2 — SSIM Wang 2004 Eq. 13** | Wang et al. 2004 "Image Quality Assessment: From Error Visibility to Structural Similarity", §3.B / Eq. 6 | `test_anchor_2_ssim_identity_is_exactly_one` (Wang 2004 reflexivity: SSIM(x, x) == 1.0 exactly) + `test_anchor_2_ssim_constant_pair_handderived` (constant-pair luminance term `l(x, y) = (2·mu_x·mu_y + c1) / (mu_x² + mu_y² + c1)` evaluated for mu_x=0.4, mu_y=0.5, c1=(0.01·1)² → ≈0.97561; tolerance < 1e-5 absolute) |
| **Anchor 3 — LPIPS Zhang 2018** | Zhang et al. 2018 "The Unreasonable Effectiveness of Deep Features as a Perceptual Metric"; combines self-consistency + published monotonicity property (no large BAPPS fetch required, in line with charter § 5 D-ANCHOR option (2)) | `test_anchor_3_lpips_self_consistency_alex` (LPIPS(x, x) < 1e-4 — bundled alex network float32 floor) + `test_anchor_3_lpips_monotonic_under_increasing_perturbation` (eps=0.05 < 0.10 < 0.20 → strictly-increasing scores; the perceptual-monotonicity claim motivating LPIPS) |

**STOP-D-ANCHOR not fired** — none of the three anchors require a large
fetch or fabrication (Convention #8 absolute). Anchors 1 and 2 are
hand-derived in-test from analytical formulas; Anchor 3 grounds in
Zhang 2018's published monotonicity property + the bundled network's
self-consistency floor.

## § 4 — Adversarial fixtures + meta-test (FACT — landed at `9bbeb1e`)

Charter-v2 testkit-local placement per the three-evidence stack (identical
CI breadth/freq + Cat 1-5 semantic mis-fit + `docs/architecture.md:673`
Layer-0 placement). Hand-written-per-fixture pattern mirroring
`tools/integrity/tests/test_adversarial_coverage.py:53-180` form; NO
auto-discovery loop; NO integrity handler.

| Fixture family | Targeted bug class | Manifest threshold | Score (impl) |
|---|---|---|---|
| `ssim_false_positive/` (inverted 8x8-block checkerboard pair; same global mean / variance) | Buggy SSIM that drops the structure term (Wang 2004 Eq. 13's third factor) scores ~1.0 | `expected_ssim_max = 0.5` | impl scores ~0.04 (well under threshold) |
| `lpips_false_negative/` (near-identical uint8 pair; 1/255 single-pixel perturbation) | Buggy LPIPS lacking `[0,255]` → `[-1,1]` normalization scores driven by 100x scale mismatch | `expected_lpips_max = 0.05` | impl scores < 1e-3 (well under threshold) |

Fixtures shipped as `.npy` + `manifest.json` directly to git (≤ 50 KB
total); NO LFS. Meta-test runs under the `test-render-similarity` CI job
(per the python-strict.yml addition), inheriting identical CI
breadth/frequency to what an integrity-homed meta-test would provide.

## § 5 — Shared-file updates (FACT — landed at `bedef6a`)

| File | Change |
|---|---|
| `CHANGELOG.md` | New `### sub-phase-phase-3-render-similarity` under existing `## Phase 3` — Added (package + CLI + schema + deps + adversarial + CI), D-class, Tag reservation |
| `docs/glossary.md` | New entries: LPIPS, MS-SSIM, perceptual loss, PSNR, SSIM (alphabetical-by-letter position) |
| `docs/testkit/equivalence.md` | Appended "Render-similarity mode" section: public surface, CLI invocation, tolerance-table additive schema, D-DET bit-exact + R-4 cross-hardware caveat, D-WEIGHTS handling, adversarial coverage (Cat-2 doc↔impl contract) |
| `tools/testkit/equivalence/README.md` | NEW — explains both legacy `compare_captures` programmatic surface AND new `--mode render-similarity` CLI dispatch |
| `.github/workflows/python-strict.yml` | New `test-render-similarity` job per §2.14: checkout `lfs: false` + uv + python 3.12 + `uv sync --extra dev` + ruff check + ruff format check + mypy --strict + `actions/cache` for `~/.cache/torch/hub/checkpoints` (D-WEIGHTS lazy-fetch posture) + `pytest -W error` |

## § 6 — Thirteen-gate verdict table (spec § 3.5 v2.4)

charter § 2 Stage 1b acceptance: 13 gates per `docs/phases/phase-3-plan.md:988-1007`.
render-similarity is **infrastructure task** per `docs/phases/phase-3-plan.md:20`,
subject to §2.11 infra-surrogates (smoke + anchors + adversarial substitute for
MMS/GCI). Gate 14 cross-stack equivalence is **N/A** — render-similarity IS the
equivalence tooling; no Phase-1/2 counterpart exists.

| # | Gate | Verdict | Notes |
|---|---|---|---|
| 1 | Spec sheet at `docs/sim-specs/<category>/<short>/spec-ref.md` | **N/A (infra-surrogate)** | Per §2.11, infra tasks have no sim-spec sheet; the spec is `docs/phases/phase-3-plan.md` §3.2.2 + this sub-phase charter `docs/phases/sub-phase-phase-3-render-similarity.md`. The §3.2.2 socket contract is the spec equivalent. |
| 2 | Probe report at `tools/testkit/probes/reports/<short>.md` | **PASS (substitute)** | `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md` substitutes; matured per-sub-phase cadence routes probes through the audits directory. |
| 3 | Failing-tests committed (RED separate from impl) + sha256 in footer | **PASS** | Stage 1a commit `5e01023` carries `Failing-tests-output: tools/testkit/failing-tests-evidence/render-similarity-2026-05-28T12-54-18Z.txt` + `Failing-tests-output-hash: sha256:88b5194b…b6`. |
| 4 | Implementation lands, footer references RED hash | **PASS** | Stage 1b commit `c42a4a4` carries `Implements-failing-tests-from: 5e01023…` + `Failing-tests-output-hash-witnessed: sha256:88b5194b…b6`. Hash matches RED commit exactly. |
| 5 | Tests pass under strict mode; goldens ≥3 anchors | **PASS** | 29/29 render_similarity tests under `pytest -W error` (filterwarnings=error in pyproject + workflow); 3 D-ANCHOR independent references landed (PSNR hand-derivation + SSIM Wang 2004 + LPIPS Zhang 2018). |
| 6 | Tier 1 + Tier 2 diagnostics pass; Tier 3 module | **N/A (infra-surrogate)** | Per §2.11, no tier-3 module is required for infra tasks. Smoke + anchors + adversarial substitute. |
| 7 | Capture I/O working; `just run-<short>` produces replayable capture | **N/A (infra-surrogate)** | render-similarity writes no capture (it's a comparator, not a sim) — `docs/phases/phase-3-plan.md:42`'s schema-corpus rule applies to "each sim task" (probe §2.3 confirms). |
| 8 | Performance benchmark documented | **PASS (informational)** | The full 29-test render_similarity suite runs in 2.76 s on the audit-writing CPU; D-DET test alone is ~10.7 s due to LPIPS forward passes (first call downloads ~770 MB of backbones; cached calls are ms). |
| 9 | Cat 1–5 + Cat-X integrity green | **PASS** | Integrity baseline `c19492ad…d22cb52` byte-identical 0 HARD_FAIL / 14 SOFT_WARN (the impl + deps + workflow + shared files + adversarial fixtures + CHANGELOG add no Cat-finding). Cat-X tolerance-budget — render-similarity adds no `[budgets.<cat>.cross_stack]` row (it is not a cross-stack-equivalence consumer); the Phase-3 carryover opened at common-3dgs Stage 0 is verified-only at this stage. |
| 10 | Audit report filed | **PASS** | This audit (`sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md`) + `progress.md` entry land alongside. |
| 11 | PBT pass for ≥2 declared invariants; Hypothesis DB committed | **PASS** | 3 PBT invariants at `test_metrics_pbt.py` (psnr identity sentinel; ssim identity exactly 1.0; psnr symmetry). `derandomize=True` + `database=None` settings — no `.hypothesis/` DB to commit (deterministic seed regime per common-3dgs Stage-1a precedent). |
| 12 | First-landing wall-clock recorded in `docs/perf-ledger.md` | **N/A (infra-surrogate)** | render-similarity does not run a sim; the perf-ledger row is per-sim (probe §2.3 + `docs/phases/phase-3-plan.md:1046`). |
| 13 | Failing-tests replay verifiable — check out RED commit + recompute hash | **PASS** | The Stage-1a RED commit (`5e01023`) + the evidence file (`tools/testkit/failing-tests-evidence/render-similarity-2026-05-28T12-54-18Z.txt`) are on `main`. `sha256sum` against the on-disk file yields `88b5194b…b6` = the committed-footer hash. Capture recipe documented in the Stage-1a audit § 4.3 + the Stage-1a commit body. |
| 14 | Cross-stack equivalence (sim tasks with Phase-1/2 counterpart) | **N/A** | render-similarity IS the cross-stack equivalence tooling — no counterpart exists in Phase 1/2; mirrors common-3dgs Stage-1b gate-14 N/A. |

**Outcome:** 7 PASS + 5 N/A (infra-surrogate or single-stack) + 1 PASS-informational
+ 1 PASS-substitute. All gates accounted for; **no widening, no STOP**.

## § 7 — STOP conditions NOT fired (audit)

| STOP | Trigger | Fired? | Notes |
|---|---|---|---|
| STOP-D | integrity baseline divergence | NO | byte-identical `c19492ad…d22cb52` |
| STOP-H | verify_evidence regression | NO | Stage 0 + Stage 1a sweeps PASS; baseline byte-identical → no Cat-5 change |
| STOP-WEIGHTS | LFS-vendoring of full pretrained weights | NO | lazy fetch + actions/cache + R-3 sha256 of bundled linear-head |
| STOP-DET | LPIPS not bit-exact same-hw | NO | 4/4 metrics bit-exact across two runs |
| STOP-D-ANCHOR | LPIPS un-anchorable without large fetch | NO | self-consistency + Zhang 2018 monotonicity option (charter § 5 D-ANCHOR option 2) |
| STOP-CLI / STOP-SCHEMA | destructive refactor of equivalence harness or tolerance schema | NO | additive; ratified Stage 1a; carries forward |
| STOP-MUT | mutation < 0.78 (Stage 1c) | n/a | Stage 1c gate |
| STOP-LFS | LFS op fails with R2 creds | NO | no LFS op this stage |

## § 8 — Forward routing (consumed by Stage 1c)

- Register the `render_similarity` mutmut target in
  `tools/testkit/mutation/mutmut-config.toml` (mirrors common-3dgs's
  `[targets.common_3dgs]` block at `:241-244`). Path:
  `tools/testkit/render_similarity`. Runner: `uv run --no-sync pytest
  tools/testkit/render_similarity/tests/ -x -q --tb=no` from repo root
  (mirrors common-3dgs's `uv run --no-sync pytest common/common-3dgs/
  tests/ -x -q --tb=no`). Threshold = **0.85** (NOT 0.80; charter § 2 + Stage
  1c brackets; do NOT widen — STOP-I).
- Run `bash tools/testkit/mutation/run-mutation.sh --target
  render_similarity --threshold 0.85`. String/fstring mutations
  DISABLED (portfolio convention; mutmut-config's `[mutmut]`
  global). Redirect stdout to a file early (Unicode-in-output broke
  JSON serialization in common-3dgs Stage 1c; poll with
  `tr '\r' '\n' | grep progress` instead of streaming).
- Baseline JSON at
  `tools/testkit/mutation/sub-phase-phase-3-render-similarity-<UTC>.json`.
- Verdict bracket (charter § 2 Stage 1c):
  - ≥ 0.85 → CONFIRMED;
  - 0.78-0.849 with equivalent-mutant rationale → SHIFTED-bank-not-widen
    (feeds L-3DGS-1 evidence base; threshold UNCHANGED);
  - < 0.78 → BLOCKED (STOP-MUT).

## § 9 — Exit

Stage 1b CONFIRMED. Impl + 3 anchors + adversarial + D-DET measurement +
shared files + CI job all landed. Integrity baseline byte-identical; 13
gates accounted for; no STOP fired. Stage 1c (mutation ≥ 0.85) is
unblocked at HEAD `bedef6a` (Stage-1b shared-files+CI commit) + this
audit + Convention #12 back-fill commit.

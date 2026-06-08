---
date: 2026-06-08T16-12-24Z
author: phase-5 warp-deprecation-migration session (Claude Code)
subject: "Phase-5 WARP-DEPRECATION MIGRATION — numerics-free hygiene pass: migrate the deprecated `wp.config.quiet = True` Warp log-suppression knob to a version-adaptive `wp.config.log_level = wp.LOG_WARNING` across every live occurrence, so strict-warnings test paths stop aborting as Warp drifts past the 1.13.0 pin. Un-blocks the 5.3 BLOCKED cell (3dgs-mpm-sh-update). Self-driven; commit direct to main; NO tag (I7)."
kind: focused-fix
verdict: SHIFTED
phase: 5
sub_phase: warp-deprecation-migration
head_sha: 21b3b68d02d2210335e0813362f2845026ed9bca
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 9894964135e582fc3d94448f87bdf8d859a1ff29e3675a45fa04a7f04b40b15f
evidence_paths:
  - packages/3dgs-mpm-sh-update/tests/conftest.py
  - packages/eulerian-smoke-neural/tests/conftest.py
  - docs/sim-specs/volumetric-grid/eulerian-smoke/spec-neural.md
evidence_hashes:
  packages/3dgs-mpm-sh-update/tests/conftest.py: sha256:793e49df752d20eda3e490894919425cbba6c990ed43d8ca930231c86d233e7e
  packages/eulerian-smoke-neural/tests/conftest.py: sha256:b4cd7c3305db421d41ad4a31686467b98f31df391776231364de164e0d4aa87b
  docs/sim-specs/volumetric-grid/eulerian-smoke/spec-neural.md: sha256:1cfe8601043984646527a70930c14037f1022b937dec14413d28ada05095356b
---

# Phase 5 — Warp-deprecation migration (focused fix)

> Numerics-free hygiene pass. FACT = ran/read/measured at the cited HEAD this session;
> INFERENCE = reasoned. Four-state verdicts (CONFIRMED / SHIFTED / BLOCKED / FLAGGED).
> Commits direct to `main` (trunk-based). NO tag (I7). Oriented only from committed
> repo state (the ORIENT list); a fresh resume re-orients the same way.

## §0 — Headline

| | |
|---|---|
| **Motivation** | The 5.3 pypi-release landing left `3dgs-mpm-sh-update` **BLOCKED**: its fresh-venv `pytest` aborts at COLLECTION because the conftest sets the now-deprecated `wp.config.quiet = True`, and the package's `filterwarnings=["error"]` promotes the resulting `DeprecationWarning` to a collection-abort error under a newer Warp than the 1.13.0 authoring pin. Operator §10.1 chose option (a): migrate the knob. — FACT |
| **Live occurrence set** | **2 executable occurrences** (both test conftests) + **1 live forward-prescribing spec line**. All other matches are append-only audit / probe-report narrative (FROZEN per Convention B.1). — FACT |
| **Replacement idiom** | **SHIFT from the prompt's literal `wp.config.log_level = wp.LOG_WARNING`** to a **version-adaptive guard** — see §2. The bare swap would `AttributeError` on the 1.13.0 pin (which lacks `wp.config.log_level` / `wp.LOG_WARNING`), breaking the local + push-to-main CI path. The guard sets whichever knob the installed Warp exposes. — FACT |
| **Centralization** | **In-place swap ×2; common-warp helper BANKED** (only 2 instances, both landed gate-13 sims). — see §3. |
| **Numerics-free proof** | Both touched sims **bit-identical before→after** on warp 1.13.0 (full-suite outcomes identical: 11/11 and 9/9). — see §4. |
| **3dgs un-block** | Under warp **1.14.0** + `filterwarnings=["error"]`: old conftest aborts collection (reproduced); new conftest **collects cleanly**; SH-rotation Wigner-D anchors **6/6** + pbt rotation **1/1** PASS. — see §5. |
| **Integrity (live, pre-commit)** | **0 HARD_FAIL / 14 SOFT_WARN, rc 0** — invariant HELD. Digest measured at close HEAD (§8). — FACT |

## §1 — Live occurrence inventory (FACT — `git grep` at HEAD `001fb93`, not the prompt's examples)

`git grep -n 'wp\.config\.quiet' / 'config\.quiet' / 'quiet\s*=\s*True'` — full repo:

| # | path:line | classification | disposition |
|---|---|---|---|
| 1 | `packages/3dgs-mpm-sh-update/tests/conftest.py:23` | **TEST log-suppression knob** (gate-13; zero numeric effect) | **MIGRATED** (guarded swap) |
| 2 | `packages/eulerian-smoke-neural/tests/conftest.py:24` | **TEST log-suppression knob** (gate-13; zero numeric effect) | **MIGRATED** (guarded swap) |
| 3 | `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-neural.md:85` | **Live spec § 13 prescription** (describes the conftest going-forward) | **MIGRATED** (doc-truth update) |
| 4 | `docs/perf-ledger.md:79` | The 5.3 BLOCKED row (a point-in-time measurement record) | **LEFT** — the 5.3 PyPI re-validation is a separate operator task (§9); not re-run here. |
| 5 | `docs/_audits/phase-4/batch-2-close-*.md:156` | Historical audit narrative | **FROZEN** (append-only, Convention B.1) |
| 6 | `docs/_audits/phase-4/batch-3-charter-*.md:284` | Historical audit narrative | **FROZEN** |
| 7 | `docs/_audits/phase-5/sub-phase-pypi-release-5.3-landing-*.md` (×5 lines) | Historical audit narrative (the motivating block) | **FROZEN** |
| 8 | `tools/testkit/probes/reports/eulerian-smoke-neural.md:54,97` | Historical probe-report artifact | **LEFT** (dated report, not a live convention) |

**Classification result:** every executable occurrence (1, 2) is a TEST/log-suppression knob — none is load-bearing on simulation numerics. (3) is the only live prescriptive doc. (4–8) are records, not knobs.

## §2 — Replacement idiom + the warp.md / prompt SHIFT (FACT)

**warp.md does NOT document a log-control idiom.** `docs/common/warp.md` covers filterwarnings (D13, § 2) and the determinism contract (§ 4 — "Warp 1.13.0 exposes no global deterministic toggle in `wp.config`") but mentions neither `wp.config.quiet` nor `wp.config.log_level`. So there is no warp.md idiom to follow; the authoritative sanctioned replacement is the one the deprecation message itself names: `warp.config.log_level = warp.LOG_WARNING`.

**The bare swap breaks the pinned floor (the SHIFT).** Measured this session:

- **warp 1.13.0** (the lock floor; `common/common-warp/pyproject.toml` `warp-lang>=1.13,<2.0` resolves 1.13.0 locally and in push-to-main CI): `hasattr(wp.config,"quiet")=True`; `wp.config.log_level` → **AttributeError** (does not exist); `wp.LOG_WARNING` → **MISSING**.
- **warp 1.14.0** (fresh-venv resolves the newer release): `wp.config.log_level` present (default `20`=INFO); `wp.LOG_WARNING`=`30`; `wp.config.quiet=True` emits `DeprecationWarning: warp.config.quiet is deprecated; use warp.config.log_level = warp.LOG_WARNING ...` via `warnings.warn(..., DeprecationWarning)`.

A bare `wp.config.log_level = wp.LOG_WARNING` evaluates `wp.LOG_WARNING` on the RHS → AttributeError at conftest import under 1.13.0 → collection abort everywhere on the pinned floor. So the prompt's literal idiom is **not** both-version-safe. The migrated form is **version-adaptive** (numerics-free; log-verbosity only):

```python
if hasattr(wp.config, "log_level"):
    wp.config.log_level = wp.LOG_WARNING  # newer Warp: the sanctioned replacement
else:
    wp.config.quiet = True  # warp 1.13.0 (authoring pin): predates the log_level API
```

This is a guarded SHIFT, not a forced break (HARD RULE 2 honored): on 1.13.0 it executes the identical `wp.config.quiet = True` (the else branch) — a literal no-op vs the prior code; on newer Warp it takes the `log_level` branch and never touches the deprecated knob, so no `DeprecationWarning` is raised.

## §3 — Centralization decision: in-place swap, common-warp helper BANKED (INFERENCE)

The rule-of-three is **not** met: exactly **2** live instances. Both are LANDED gate-13 sims whose conftests are on the determinism/failing-tests-hash path. A `common_warp.suppress_module_load_chatter()` helper would be a new PUBLIC surface on a signature-frozen common module (warp.md § 3 / § 6.4 — the socket is mature, documented-not-refactored), adding an import-order dependency to two gated conftests for a 5-line guard. Per the prompt's rule ("if centralizing risks a landed sim's gated capture, do the in-place swap and BANK the centralization"), the conservative choice is **in-place ×2**. **BANKED:** a `common_warp` log-control helper, to be promoted only if/when a third Stack-E sim conftest needs the same guard (rule-of-three), as an additive-helper-then-migrate refactor outside a hygiene pass's risk budget. Mirrors the warp.md § 6.4 banked capture-write helper and the 5.2 Packaging.cmake candidate.

## §4 — Numerics-free proof: bit-identical before→after (FACT; warp 1.13.0, the lock floor)

The swap is evaluated at conftest import, before any `@wp.kernel` module loads; it sets a logging-verbosity flag and touches no kernel/array/RNG state. On warp 1.13.0 the post-swap code path executes the *identical* statement (`wp.config.quiet = True`, else branch), so all numeric outputs are unchanged by construction. Verified empirically by full-suite run, per-test outcomes diffed (timing-normalized):

| sim | before (HEAD) | after (guarded) | diff |
|---|---|---|---|
| `3dgs-mpm-sh-update` | 11 passed | 11 passed | **IDENTICAL** (all 11 per-test PASSED, incl. `test_golden_table_anchors`, `test_render_similarity_clears_floors`, `test_mpm_trajectory_matches_parent`) |
| `eulerian-smoke-neural` | 9 passed | 9 passed | **IDENTICAL** (all 9 per-test PASSED, incl. `test_golden_table_anchors`, `test_density_matches_parent_rollout`, `test_render_similarity_clears_floors`) |

The golden-table anchors and render-similarity floor tests are numeric assertions against committed goldens/renders; their unchanged PASS is the per-sim bit-identical capture/round-trip proof. (Apples-to-apples note: a transient 3-fail re-run was an environment artifact — a sibling `uv sync` had uninstalled `mpm-multimaterial-stack-e`, a 3dgs dependency, from the shared venv [§B.7 one-package-at-a-time]; re-syncing restored 11/11 IDENTICAL.) **No sim's capture changed by a single bit** — HARD RULE 2 / numerics-free condition satisfied.

## §5 — 3dgs-mpm-sh-update un-block: collection no-longer-aborts + anchors pass (FACT; warp 1.14.0)

A throwaway venv resolving warp **1.14.0** + the package's `filterwarnings=["error"]` (`configfile: pyproject.toml`):

1. **Mechanism reproduced (old conftest, bare `quiet=True`):** `ImportError while loading conftest` → `warp/config.py __setattr__` → `_warn_deprecated_config_access` → `warnings.warn(message, DeprecationWarning)` → `E DeprecationWarning: warp.config.quiet is deprecated ...`. **Collection aborts.** This is the exact 5.3-measured failure.
2. **Resolved (new guarded conftest):** the minimal repro `pytest` collects + passes; the package's `test_sh_rotation_golden.py` collects cleanly and the **SH-rotation Wigner-D golden anchors PASS 6/6** (`test_a1_degree1_hand_derived_value`, `test_a2_rotation_equivariance_vs_renderer`, `test_a3_pure_stretch_frozen_and_pure_rotation`, `test_golden_table_anchors`, `test_degree_ge_2_raises[9]`, `test_degree_ge_2_raises[16]`); the pbt `test_sh_rotation_equivariant` PASSES 1/1; the full 11-test suite **collects without abort** (pre-swap it `ImportError`s at conftest).

The 5.3 gate's `-k "golden or anchor or kernel or conserv or force or coupling or rotation or analytic"` selection = 9 (those 7 numeric anchors + the 2 `..._golden.py` render-similarity tests), deselecting 2 (`test_covariance_spd_preserved`, `test_mpm_trajectory_matches_parent`) — matching the 5.3 audit's "9 passed / 2 deselected". The 7 numeric anchors are confirmed under 1.14.0 here; the 2 render-similarity tests (torch/lpips/LFS renders) passed in the 1.13.0 full-suite (§4). **The 3dgs-mpm-sh-update collection block is resolved.**

## §6 — §S.5 full CI sweep (this push)

- **Local pre-push (FACT):** integrity `--all --mode strict` rc 0, **0 HARD_FAIL / 14 SOFT_WARN**; `tools/testkit/equivalence/` **34/34**; `3dgs-mpm-sh-update` 11/11 + `eulerian-smoke-neural` 9/9 (warp 1.13.0); warp-1.14.0 collection + anchors (§5); ruff clean on both conftests.
- **Post-push CI** at the pushed SHA: full-set `gh run list --commit <SHA>` queried per § S.5 (results recorded at the sha-backfill commit below). **EXPECTED:** the per-sim `test-*` jobs for the two Warp-backed sims now PASS where they were latently fragile; `pypi-release.yml` does NOT run on a bare main push (it triggers on `pypi-v*` tags / path-scoped PRs / dispatch), so the previously-BLOCKED 5.3 validate cell is not on this push's gate.

## §7 — render_similarity / variant HARD gates (FACT/INFERENCE)

This change touched **no** `tools/testkit/render_similarity/` or `tools/testkit/equivalence/variant/` source (`git diff --name-only` = the 3 evidence_paths files only). The `render_similarity` (0.9242) + `variant` (0.8702) HARD mutation floors are promoted on unrelated source — **UNAFFECTED**. The `eulerian-smoke-neural` `test_render_similarity_clears_floors` test (which exercises the perceptual floors) PASSED identically before→after (§4).

## §8 — §R integrity digest at close HEAD (FACT)

- `integrity_invariant`: **0 HARD_FAIL / 14 SOFT_WARN** (the conserved cross-audit assertion; STOP-D not fired).
- `integrity_digest_at_head`: measured live this session (R.3) and recorded in front-matter at the sha-backfill commit. Pre-commit working-tree measurement: `9894964135e582fc3d94448f87bdf8d859a1ff29e3675a45fa04a7f04b40b15f` (identical to the 5.3 close — expected: conftest/spec edits add no golden tables, captures, or audit-log lines that perturb the report). Re-measured at the audit-bearing close HEAD per R.5.

## §9 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt) | Measured / reasoned | Disposition |
|---|---|---|---|
| W-1 | Replace `quiet=True` → `wp.config.log_level = wp.LOG_WARNING` (bare) | The 1.13.0 pin lacks `log_level`/`LOG_WARNING`; bare swap AttributeErrors on the floor → breaks local + push-to-main CI | **SHIFTED** — version-adaptive guard (§2); documented SHIFT, not a forced break |
| W-2 | warp.md may prescribe a different sanctioned idiom | warp.md documents neither `quiet` nor `log_level`; the deprecation message itself is the authority | No warp.md SHIFT; followed the upstream-sanctioned `log_level` (guarded) |
| W-3 | Prefer a shared common-warp helper (rule-of-three) | Only 2 live instances; both landed gate-13 conftests | **In-place ×2; BANKED** the helper (§3) |
| W-4 | Migration may perturb numerics | Log-verbosity only; 11/11 + 9/9 bit-identical before→after on 1.13.0 | CONFIRMED numerics-free |
| W-5 | "every occurrence repo-wide" | 8 grep hits; only 2 executable + 1 live-spec are live; 5 are append-only/historical records (Convention B.1 forbids rewriting) | Migrated the 3 live; recorded the 5 (§1) |

## §10 — SURFACED for operator

1. **3dgs-mpm-sh-update 5.3 PyPI re-validation (separate task).** This migration removes the root cause of the 5.3 C-5 BLOCK, but per the prompt the full 5.3 fan-out is NOT re-run here. The operator should re-run the `pypi-release` § 3.8 gate for `3dgs-mpm-sh-update` (and update `docs/perf-ledger.md:79` from BLOCKED to its measured verdict) when re-validating 5.3 — now expected to PASS (collection no longer aborts; anchors confirmed). The `docs/perf-ledger.md` BLOCKED row is intentionally LEFT untouched here (it records the 5.3 measurement; changing it without re-running the gate would falsify a measurement).
2. **Latent pypi-release CI PR-trigger (5.3 §9 C-7).** A future path-scoped PR touching `pipeline.py` / a package `pyproject` would run the matrix; the `3dgs-mpm-sh-update` cell is now expected green (was the only red).
3. **BANKED common-warp log-control helper** (§3) — promote on the third Stack-E conftest instance.

## §11 — Closing

Verdict **SHIFTED** (version-adaptive guard vs the prompt's bare idiom; documented). 3 live occurrences migrated; 5 historical/record occurrences enumerated and left per Convention B.1. Numerics-free proven bit-identical per touched sim on the 1.13.0 floor; the 3dgs-mpm-sh-update collection block resolved and anchors confirmed on warp 1.14.0. Integrity invariant held (0 HF / 14 SW). render_similarity + variant HARD gates unaffected. NO tag (I7). `head_sha`, `integrity_digest_at_head`, and `evidence_hashes` back-filled per Convention #12 at the follow-up commit.

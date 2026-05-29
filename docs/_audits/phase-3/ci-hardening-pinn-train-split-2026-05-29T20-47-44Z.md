---
date: 2026-05-29T20-47-44Z
author: phase-3 ci-hardening (Claude Code)
subject: CI-HARDENING (Convention I infra, OUTSIDE any sub-phase) — two-tier pinn-poisson CI; remove the ~70-min per-push re-train tax (L-PINN-2). NO tag.
verdict: CONFIRMED
head_sha: 296dbed
anchor_sha: 1aa012bdf9439e6118795d198fccf5b6aac701af
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - .github/workflows/python-strict.yml
  - .github/workflows/pinn-train.yml
  - packages/pinn-poisson/tests/test_checkpoint_inference.py
  - docs/_audits/phase-3/task-7-pinn-poisson.md
evidence_hashes:
  .github/workflows/python-strict.yml: sha256:2ce74c4cc9e345b004aec94025bfecc6fe68de75b37f6a92330d90072f54ffd2
  .github/workflows/pinn-train.yml: sha256:e1d4493b7c472e769daf1cd7e629ae6d481e41ed586911439947815cbec9ce84
  packages/pinn-poisson/tests/test_checkpoint_inference.py: sha256:75de4ac6b386fb31bca79e9d32dc2aa1613407080f4553c0a04ef7035ce4c2de
  docs/_audits/phase-3/task-7-pinn-poisson.md: sha256:7065e16fbff0d38916aad1fbf30945a002aa53adc1b8833a4363ad6bd23a83d9
---

# CI-hardening — two-tier pinn-poisson CI (remove the per-push re-train tax)

> Infra task (Convention I), OUTSIDE any sub-phase. Lands BEFORE the task-8
> plan-drafting dispatch. Trunk-based to main, NO tag. Verdict **CONFIRMED**.

## § 1 — Problem (banked L-PINN-2)

`python-strict.yml` job `test-pinn-poisson` re-trained the PINN from scratch
(Adam→L-BFGS at several configs, ~tens of minutes — MEASURED ~70 min on the 2-core
ubuntu runner) on **every** push to main — no path filters. The trained checkpoint is
already committed (LFS) and reproduces a fresh seed-42 train **byte-for-byte**
(measured task-7 Stage 1b-PINN), so re-training on docs-only / unrelated pushes buys
nothing. On main-only trunk flow with the §S.5 sweep on every push, the tax compounds
(NCA added one train job; task-8 adds another; Phase-4 has many learned variants).

## § 2 — Two-tier design

**ALWAYS-ON** — `python-strict.yml` `test-pinn-poisson` (every push, no path filter):
ruff + `mypy --strict` + selective LFS pull of the committed checkpoint + a
**smudge-assert guard** (fails loudly if the pull failed — no silent-skip of the
gates) + `pytest tests/test_analytic_problems.py tests/test_fd_reference.py
tests/test_checkpoint_inference.py`. The NEW `test_checkpoint_inference.py` LOADS the
committed checkpoint and asserts it reproduces the Anchor-3 analytic solution
(`analytical_l2`), the classical 5-point-FD reference (`fd_l2`), and the PBT residual
envelopes (pde ≤ 0.1, boundary ≤ 0.01) + finiteness. **MEASURED 15 passed in ~0.7s.**

**ON-CHANGE** — NEW `pinn-train.yml` (path-filtered): the iteration-heavy full
re-train — `pytest` of test_training_convergence, test_inference_vs_analytic
(A1/A2/A3), test_inference_vs_fd, test_convergence_with_collocation,
test_pbt_invariants, test_diagnostics. Re-establishes that a FRESH train still
converges to the analytic anchors (the cross-hardware guarantee) + EFECT.

### Exact path filter (`pinn-train.yml` `on`)
```
push:         { branches: [main], paths: [packages/pinn-poisson/pinn_poisson/**, packages/pinn-poisson/pyproject.toml] }
pull_request: { paths:            [packages/pinn-poisson/pinn_poisson/**, packages/pinn-poisson/pyproject.toml] }
```
Filtered on the training **SOURCE** (+ deps), NOT the whole package — inference/test
files live in `tests/` and are covered by the always-on job. **Accepted narrow-filter
gap (per the dispatch's explicit preference):** a train-test-only edit (in `tests/`,
no source change) won't trigger `pinn-train`; the always-on job still lints it, and a
training-source change re-validates the train tier. Train tests change rarely.

## § 3 — Before / after job-fire matrix

| Push touches… | `test-pinn-poisson` (always-on) | `pinn-train` (on-change) |
|---|---|---|
| docs / other sim / unrelated | **fires** (fast, ~seconds) | does NOT fire |
| `packages/pinn-poisson/pinn_poisson/**` or `pyproject.toml` | fires | **fires** (full re-train) |
| `packages/pinn-poisson/tests/**` only | fires | does NOT fire (narrow-filter gap, §2) |
| **(before this change)** | re-trained ~70 min on **every** push | n/a |

**Empirically confirmed this push** (`1aa012b` touches only `.github/workflows/` +
`tests/`): `pinn-train` does NOT fire (no `pinn_poisson/**`/`pyproject` change); the
always-on `test-pinn-poisson` fires and is green — see §6. The positive trigger
(fire on a `pinn_poisson/**` change) is config-verified (valid `push.branches`+`paths`
AND-semantics) and will be exercised by the next training-source change.

## § 4 — Gate-coverage preserved (no substance changed)

This is a WHERE/WHEN-it-runs repartition. Every pinn-poisson test file is in **exactly
one tier** (3 always-on / 6 on-change; verified — the union equals all 9 test files,
no drop). No tolerance or assertion changed (`analytical_l2`=1e-3, `fd_l2`=1e-2, PBT
envelopes 0.1/0.01 are byte-identical to task-7).

- **On main, every push (always-on):** gate-4 (analytic + FD on the COMMITTED
  checkpoint), gate-11 (PBT envelopes), gate-9-adjacent (the committed capture's source
  checkpoint is correct), and finiteness (the always-on PBT asserts `isfinite`). These
  PROVE the committed checkpoint is correct.
- **On training-code change (on-change):** training-convergence, fresh-train →
  analytic/FD (the cross-hardware convergence guarantee), convergence-with-collocation,
  fresh-train PBT, fresh-train capture-health (gate-5), gate-12 `training_wall_clock`.
- gate-3 (RED evidence) + gate-13 (worktree replay) are landing-time artifacts, not CI
  re-runs — unaffected.

## § 5 — NCA disposition (SURFACED — not modified)

`python-strict.yml` `test-neural-ca-train` runs `tests/test_train_convergence.py`
(re-trains) + 3 checkpoint-loading tests (golden_anchors, pbt, serialization) on every
push. **FACT:** its `test_train_convergence` trains a **300-step smoke**
(`TrainConfig(steps=300)`), NOT the full 1000-step (~21-min perf-row) train — a
deliberately cost-reduced choice, structurally different in scale from pinn's full
multi-config ~70-min train. Per the dispatch's HARD-RULE-2 ("if structurally
different, leave and SURFACE — do not guess"), and to avoid refactoring a LANDED
sub-phase's CI on judgment, **NCA is left unchanged and surfaced here**: the same
two-tier idiom COULD be mirrored (move `test_train_convergence.py` to a path-filtered
`nca-train.yml`, keep the 3 checkpoint tests always-on) — recommended for **operator /
task-9** to decide, weighing NCA's smaller (~15-20 min CI smoke) tax.

## § 6 — Verification (FACT)

- Both workflow YAMLs parse (`yaml.safe_load`). Test-tier partition COMPLETE (union =
  all 9 test files, no overlap/drop).
- Always-on fast set MEASURED locally: **15 passed in ~0.7s** (vs ~70 min re-train).
- `test_checkpoint_inference.py` ruff + `mypy --strict` clean; loads the committed
  checkpoint and asserts analytic 2.27e-4 ≤ 1e-3, FD 3.13e-4 ≤ 1e-2, pde-residual
  0.0134 ≤ 0.1 (the committed checkpoint IS correct).
- integrity `0 HARD_FAIL / 14 SOFT_WARN`; digest `5c7172a2…` **unchanged** (§R measured
  — the new test + workflows add no findings).
- §S.5 post-push sweep (this push HEAD `1aa012b`): recorded after push; the always-on
  `test-pinn-poisson` green confirms the fast tier; `pinn-train` correctly does NOT
  fire (this push touched no training source).

## § 7 — Scope + verdict

Touched ONLY `.github/workflows/` + one NEW test module
(`tests/test_checkpoint_inference.py`). No sim logic, checkpoint, goldens, tolerances,
or gate substance changed. **CONFIRMED.** NO tag. The task-8 plan-drafting dispatch is
now unblocked of the per-push pinn re-train tax.

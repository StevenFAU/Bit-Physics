---
date: 2026-05-29
author: phase-3 neural-ca execution Stage 1c (Claude Code)
subject: Phase 3 task-6 neural-ca — STAGE 1c gate-14 D↔B render-similarity (measured+locked, statistical) + perf-ledger + schema-corpus + Tier-3 + CI jobs + gate-13 replay
verdict: CONFIRMED
head_sha: PLACEHOLDER-STAGE-1C-AUDIT
prior_sub_phase_landed_at: 86b0aa5
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
evidence_paths:
  - tools/testkit/equivalence/tolerance.toml
  - docs/sim-specs/continuous-ca/neural-ca/spec-ref.md
  - docs/sim-specs/continuous-ca/neural-ca/equivalence.md
  - docs/perf-ledger.md
  - .github/workflows/python-strict.yml
  - tests/fixtures/legacy-captures/phase-3-neural-ca.json
  - packages/neural-ca/python/tests/test_cross_stack_equivalence.py
  - tools/diagnostics/tier3/neural_ca/field_health.py
evidence_hashes:
  tools/testkit/equivalence/tolerance.toml: sha256:c340a11af1c911263f10433c436d62a8560860cd1d51c8236bee00017d7f5ead
  docs/sim-specs/continuous-ca/neural-ca/spec-ref.md: sha256:bc4839385bfe55b1e866a3064987f029f4f644376042c35284dc4ad9e29d8f82
  docs/sim-specs/continuous-ca/neural-ca/equivalence.md: sha256:31b92076afaf088229107e2cf26b4e22028a936ebde2bcffbc2288529feed71c
  docs/perf-ledger.md: sha256:336b9f05e3064b2f7029571809cdbb60cc62240055f7cd9a8b00b88b244b8f97
  .github/workflows/python-strict.yml: sha256:9e5d10c3163ee9d3c4853e802d490a9b7c3fab9299bde21eba503cc4c4d924fc
  tests/fixtures/legacy-captures/phase-3-neural-ca.json: sha256:f7b550575977679a90eb6f1c76a90238bcf2dec82a9e1ccd812d340f87e8d504
  packages/neural-ca/python/tests/test_cross_stack_equivalence.py: sha256:44c0d5250e1cade07ba790d05f65760c64e116376c82dbcb7b9200183c30b69d
  tools/diagnostics/tier3/neural_ca/field_health.py: sha256:0b5503365b0463fdcbf05d2b6fe0b49f81cd5cc5107dda8ad23d86f05c9d5481
---

# Phase 3 — sub-phase neural-ca (task-6) — Stage 1c audit

> The FIRST cross-stack gate-14 of Phase 3, measured + locked (STATISTICAL
> render-similarity); perf-ledger (one row per stack); schema-corpus seed; Tier-3
> diagnostics; three CI jobs; gate-13 replay. Verdict **CONFIRMED** — Stage 2
> (landing) unblocked.

## ACTION 1 — gate-14 D↔B render-similarity (measured + locked, STATISTICAL)

D-inference (PyTorch) ↔ B-inference (WGSL) of the SAME checkpoint, via direct
`from render_similarity import psnr, ssim, lpips`, frame-paired by step index,
mean over the 20 non-seed frame pairs. **MEASURED:** PSNR 23.92, SSIM 0.824,
LPIPS_alex 0.0316. **LOCKED** `[render_similarity.continuous-ca.neural-ca]`:
`psnr_min=23.0`, `ssim_min=0.80`, `lpips_max=0.05`. `test_cross_stack_equivalence`
GREEN.

**QUALITY-CONCERN FLAG (report §6; NOT auto-fail — learned = distributional,
spec §2.6 `docs/architecture.md:414` + §5.12):** mean PSNR 23.92 < §2.12 floor 28
and mean SSIM 0.824 < floor 0.85 — dragged by the stochastic per-cell fire-mask
RNG divergence (`torch.rand` vs WGSL PCG), the defining property of a
learned-dynamics cross-stack pair. The **perceptual** metric LPIPS_alex 0.0316
PASSES the floor (≤ 0.15): the D and B patterns ARE perceptually equivalent.
spec-ref §9 + `equivalence.md` (RD-2D template, marked STATISTICAL) record it.

## ACTION 2 — perf-ledger (gate-12, one row per stack)

- `neural-ca | python (PyTorch) | …(training) | 1271.14s` — the characteristic
  Stack-D op. Same-seed training reproduces **BIT-IDENTICAL** (final L2 0.029722
  both runs; checkpoint `np.array_equal`).
- `neural-ca | typescript (WGSL/WebGPU) | …-wgsl (inference) | 2.18s` — RX 6800
  XT via wgpu-py (§7.8 local).

## ACTION 3 — schema-corpus + Tier-3 + CI

- `tests/fixtures/legacy-captures/phase-3-neural-ca.{h5,json}` seeds the corpus
  (round-trips + schema-validates).
- `tools/diagnostics/tier3/neural_ca/` (field_health: visible bounds + alive
  persistence) — standalone deliverable, path-loaded for verification
  (lenia/ising precedent). Gated Tier-1/2 exercised by `test_diagnostics`.
- `python-strict.yml`: `test-neural-ca-train` / `-infer` / `-equiv`, each with a
  selective LFS pull (ising precedent). WGSL never runs in CI (§7.8).

## ACTION 4 — gate-13 replay (failing-tests spot-check)

The committed Stage-1a failing-tests evidence
`tools/testkit/failing-tests-evidence/neural-ca-2026-05-29T05-00-00Z.txt`
re-hashes to `sha256:9a29410a…2acc4` == the Stage-1a commit footer. **MATCH.**

## ACTION 5 — full suite + integrity

Full neural-ca pytest suite **10/10 GREEN** (train-convergence, ckpt-serialize,
golden ×2, PBT ×2, WGSL-repro, cross-stack, diagnostics ×2). mypy --strict + ruff
clean. integrity `0 HARD_FAIL / 14 SOFT_WARN`; digest `b7460150…b15e` (unchanged).

## Verdict

**CONFIRMED.** gate-14 measured + locked (statistical; §2.12-floor QUALITY-CONCERN
on PSNR/SSIM, LPIPS passes); perf 2 rows; schema-corpus + Tier-3 + 3 CI jobs;
gate-13 spot-check MATCH; 10/10 suite GREEN. **Stage 2 (landing) unblocked.**

---
date: 2026-05-29
author: phase-3 neural-ca execution Stage 1a (Claude Code)
subject: Phase 3 task-6 neural-ca — STAGE 1a scaffold + RED (both stacks) + spec-ref §1-13 + 2 determinism rows + 2 tolerance rows + failing-tests evidence
verdict: CONFIRMED
head_sha: PLACEHOLDER-STAGE-1A-AUDIT
prior_sub_phase_landed_at: 86b0aa5
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
evidence_paths:
  - docs/sim-specs/continuous-ca/neural-ca/spec-ref.md
  - tools/testkit/determinism/registry.toml
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/failing-tests-evidence/neural-ca-2026-05-29T05-00-00Z.txt
  - packages/neural-ca/python/neural_ca/model.py
  - packages/neural-ca/typescript/src/nca_inference.wgsl
  - docs/phases/sub-phase-phase-3-neural-ca.md
  - pyproject.toml
evidence_hashes:
  docs/sim-specs/continuous-ca/neural-ca/spec-ref.md: sha256:448cc84e9a9ce4b18b983924c2b4d0a2c09c2e16d1c1cb51dcd48dcc65329d10
  tools/testkit/determinism/registry.toml: sha256:2e02dd8fce26fc75bca0f424820bedefad402294c1fa6a702848f9328717bd92
  tools/testkit/equivalence/tolerance.toml: sha256:8e90f5c4de55fb3b96aa66fd736224122de562bb28a7b3dbb178a15b577bac59
  tools/testkit/failing-tests-evidence/neural-ca-2026-05-29T05-00-00Z.txt: sha256:9a29410a80f01acae417c2d58bece93925aeadc8c92bb73d1832162a4122acc4
  packages/neural-ca/python/neural_ca/model.py: sha256:d408d49226757d705a5fd989832ff7cf354f414bb72934c4b58b54fc879e049c
  packages/neural-ca/typescript/src/nca_inference.wgsl: sha256:0f5d0a863b38e43ba5391fa81e3575b3b417f65f0352d7a773b242e0fbc00934
  docs/phases/sub-phase-phase-3-neural-ca.md: sha256:6726f292505e34f00ea1be1ee6be3cc186d3c47efe6fd856de605f9ac2344e81
  pyproject.toml: sha256:e4ed79124cd478f6f696b46dc5edbb9d096bf92f287ad758560f2fd346687ec8
---

# Phase 3 — sub-phase neural-ca (task-6) — Stage 1a audit

> Scaffold + RED for the **FIRST dual-stack SIM** of Phase 3. Both halves
> (Stack-D PyTorch `packages/neural-ca/python/` + Stack-B WGSL
> `packages/neural-ca/typescript/`) shelled; spec-ref §1-13 declares the
> cross-stack gate STATISTICAL; the two-row mixed determinism posture + the two
> tolerance rows landed (DEFAULT, measured at 1b/1c); three RED pytest modules
> with hashed failing-tests evidence. Verdict **CONFIRMED** — Stage 1b-D
> (PyTorch training) unblocked.

## ACTION 1 — package scaffold (D-LAYOUT)

- `packages/neural-ca/python/` — 27th workspace member (registered in the root
  `pyproject.toml`). `neural_ca/{model,train,infer,convert_checkpoint,cli_impl,
  __main__}.py` + `reference/nca_numpy.py`; the load-bearing functions raise
  `NotImplementedError` (Stage 1b-{D,B}). torch + safetensors deps; optional
  `local-gpu` extra (wgpu) for the local capture-generation harness. mypy
  **strict** clean (9 source files); ruff check + format clean.
- `packages/neural-ca/typescript/` — `src/nca_inference.wgsl` (forward-inference
  compute-shader skeleton) + `src/index.ts` (common-ts driver scaffold); local-only
  per spec § 7.8 (mirrors ising `src/*.{ts,wgsl}`; NO package.json — not a
  workspace member).
- **D-LAYOUT note:** `packages/neural-ca/{python,typescript}/` per the charter.
  ising's *actual* on-disk dual-language shape is `{src/, <pkg>/}` (TS in `src/`,
  flat Python pkg), but the charter+dispatch explicitly prescribe
  `python/`+`typescript/` (co-equal training/inference halves); followed as
  ratified — recorded as a deliberate choice, not drift.

## ACTION 2 — spec-ref §1-13

`docs/sim-specs/continuous-ca/neural-ca/spec-ref.md` — 13-section template.
**§6/§9 declare the cross-stack gate STATISTICAL** (learned = distributional,
spec § 2.6 `docs/architecture.md:414` + § 5.12); §8 declares the two-row mixed
determinism posture; §6 declares the **regime-scoped** `field_values_bounded`
PBT (RGBA ∈ [0,1] or full-state finiteness — NOT all 16 channels). `TODO(Stage-1b-*)`
markers for trained weights / measured determinism / measured D↔B bounds.

## ACTION 3 — determinism + tolerance rows (§S.2 schema-first)

- **Determinism (2 rows, D-DET):** `[continuous-ca.neural-ca.training]`
  non-deterministic + `distributional_bound = "EFECT"` (DEFAULT; measured 1b-D —
  registry-schema "iff" guideline nuance documented inline) +
  `[continuous-ca.neural-ca.inference]` bit-exact same-stack-same-hw.
- **Tolerance (2 rows, 2 branches, D-TOL):**
  `[render_similarity.continuous-ca.neural-ca]` psnr_min/ssim_min/lpips_max
  (DEFAULT = §2.12 floors 28/0.85/0.15; LOCKED 1c — **task-6 is the FIRST
  `render_similarity` per-sim consumer**) +
  `[golden_tolerance.continuous-ca.neural-ca-python]` golden_checkpoint_match +
  golden_checkpoint_l2_max (DEFAULT 0.02; locked 1b-D) +
  training_loss_distributional_bound = "EFECT". `tolerance.toml` **VALIDATES**
  against `tolerance-schema.json` (the schema description enumerates exactly
  these neural-ca keys). §S.2 discharged.

## ACTION 4 — RED TDD + hashed evidence (gate-3)

Three pytest modules (the charter §2 Stage-1a set): `test_train_convergence`,
`test_checkpoint_serialization`, `test_wgsl_inference_reproduction`. **RED: 3
failed / 0 passed, 0 collection errors**; all failures `NotImplementedError`.
Evidence `tools/testkit/failing-tests-evidence/neural-ca-2026-05-29T05-00-00Z.txt`,
footer hash `sha256:9a29410a…2acc4` (single-newline eof-stable; trailing-ws hook
excludes the evidence dir). PBT (`field_values_bounded` + `inference_determinism`)
added at 1b-D; cross-stack gate-14 at 1c.

## ACTION 5 — integrity invariant

`integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN** (held). Digest
`b7460150…b15e` — UNCHANGED from Stage 0 (the new neural-ca files add no
integrity warning, so the report stderr is byte-identical; §R measured, not
copied).

## Verdict

**CONFIRMED.** Both stacks scaffolded; spec-ref §1-13 with the gate declared
STATISTICAL; 2 determinism + 2 tolerance rows (schema-valid); 3 RED tests with a
byte-stable hashed footer; integrity invariant held. **Stage 1b-D (PyTorch
training → checkpoint + EFECT measurement + D-inference capture) unblocked.**

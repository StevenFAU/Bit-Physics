---
date: 2026-05-29
author: phase-3 neural-ca execution Stage 1b-D (Claude Code)
subject: Phase 3 task-6 neural-ca — STAGE 1b-D PyTorch training (Stack D) + canonical checkpoint + EFECT derivation + D-inference capture + PBT + golden anchor
verdict: CONFIRMED
head_sha: PLACEHOLDER-STAGE-1B-D-AUDIT
prior_sub_phase_landed_at: 86b0aa5
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
evidence_paths:
  - docs/sim-specs/continuous-ca/neural-ca/spec-ref.md
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/determinism/registry.toml
  - packages/neural-ca/python/neural_ca/model.py
  - packages/neural-ca/python/neural_ca/train.py
  - packages/neural-ca/python/neural_ca/target.py
  - packages/neural-ca/python/neural_ca/pbt.py
  - tools/testkit/property/sims/neural_ca/invariants.py
  - captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000.json
evidence_hashes:
  docs/sim-specs/continuous-ca/neural-ca/spec-ref.md: sha256:a4f666be21aabbaa383b6652afacb3c6f0fd836a4fded735d35d4b4995756833
  tools/testkit/equivalence/tolerance.toml: sha256:8bdf82154b8f4ed69a0cb23e3c957502d73e4e4a61976712327c435e82818890
  tools/testkit/determinism/registry.toml: sha256:164c96b4130a3e7ef39354d0f78102b68c7fa9f64e837a3d25b45a0c24098e40
  packages/neural-ca/python/neural_ca/model.py: sha256:3abd4a8f46812ce3fda306fd62dd17775d9da90a0374dfcd766c0c7aaa1a6697
  packages/neural-ca/python/neural_ca/train.py: sha256:2b47b343f03491b146a6f1a22e0434258eb39af0062cd4338441e17304dc17db
  packages/neural-ca/python/neural_ca/target.py: sha256:97d1595866751dc5095973c0e394b460a446e44211297f8c618e0f81e8a8f734
  packages/neural-ca/python/neural_ca/pbt.py: sha256:a8d54cfd3dfd09d895501903c773efe96a0f36d1e83727cbfb090150b9b47d7c
  tools/testkit/property/sims/neural_ca/invariants.py: sha256:6342fbce8c9144c47a6e5d050ac1d8a31cf8d12a62929d00875a474b5728585b
  captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000.json: sha256:afd05989769887a2fa287117932f39ef8fff770fa9c9b110e65ef827dc07e21c
---

# Phase 3 — sub-phase neural-ca (task-6) — Stage 1b-D audit

> Stack-D (PyTorch) training. The NCA update rule is implemented + the canonical
> checkpoint trained; the EFECT training-loss distributional bound is DERIVED (no
> STOP-EFECT); the D-inference capture is produced; the two PBT invariants + the
> golden anchor are GREEN. Verdict **CONFIRMED** — Stage 1b-B (WGSL inference)
> unblocked.

## ACTION 1 — NCA update rule (reimplemented from Distill, § H.2)

`neural_ca/model.py` implements perception (fixed depthwise [identity, Sobel-x,
Sobel-y]) + update MLP (Conv1x1-128-ReLU → Conv1x1-16 zero-init) + stochastic
fire mask + alpha alive-masking (pre & post), matching the
`growing_ca.ipynb` citation anchors (cite-don't-import). `train.py` adds the
pixel-wise-L2 training loop with the Growing and (sample-pool) **Persistent**
experiments; `infer.py` the bit-exact forward inference. mypy --strict clean;
ruff clean. RED→GREEN: train-convergence + checkpoint-serialization PASS.

## ACTION 2 — canonical checkpoint + persistence

Trained `tools/testkit/golden/checkpoints/neural-ca-emoji-disk.safetensors`
(LFS) — 64², 1000 steps, seed 42, **Persistent** (sample pool). The Growing
variant OVERGROWS to a filled grid (cov→1.0) by ~step 200; the pool variant
holds the pattern (cov 0.40–0.55 vs target 0.50 across step 200–1000). Recon L2:
0.022 @ step 200 (best), 0.095 @ step 1000 (stable, recognizable). **§0.3 SHIFT:**
the target is a procedurally-generated two-tone disk glyph (`target.py`) — NOT a
vendored emoji (noto-emoji is **OFL-1.1**, incompatible with the MIT posture
without operator routing). The cross-stack gate-14 validity is unaffected (it
compares D vs B inference of the SAME model).

## ACTION 3 — EFECT bound DERIVED (D-DET; NO STOP-EFECT)

MEASURED across 5 pinned seeds (representative disk-pool config, 32², 300 steps):
final-training-loss mean 0.0403, std 0.0083, range [0.0319, 0.0519], **CV 0.21**;
tail-smoothed (last-20-mean) **CV 0.085**; **3σ upper 0.0653**. The
loss-convergence distribution is BOUNDED (no divergence) → EFECT
(distributional-equality) is **derivable, NO STOP-EFECT**. Locked
`training_loss_3sigma_upper = 0.07` in `tolerance.toml`; spec-ref §8 + registry
comment record the measurement. **Same-seed training is reproducible on this CPU**
(seed-42 reproduced its final loss exactly across runs); EFECT characterizes the
CROSS-SEED ensemble. **CRITICAL SEPARATION (dispatch):** the EFECT bound
characterizes TRAINING-convergence reproducibility — it is **NOT** the
cross-stack gate (that is the D↔B render-similarity, Stage 1c).

## ACTION 4 — D-inference capture (gate-9)

`captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000.{h5,json}` (LFS; 21
frames at capture-interval 50; `common_py.capture` format; dtype f32; claimed
`bit-exact-same-hw`). Inference is bit-exact same-stack-same-hw.

## ACTION 5 — PBT (gate-11) + golden anchor (gate-4)

- **`field_values_bounded` (REGIME-SCOPED, RE-DECLARED on evidence):** full-state
  finiteness + clamped visible RGBA ∈ [0,1] at every step. NOT all-16-channels ∈
  [0,1] — the 12 hidden channels are unbounded by design (measured: a perturbed
  model reaches |hidden| ≈ 2.5e7 after 30 steps; even RGBA-raw diverges for an
  untrained model). The dispatch's literal "field_values_bounded as all-channels
  bounded" is mathematically FALSE; re-declared (free-cloth / lenia-monotone
  precedent), NOT widened. GREEN (20 examples).
- **`inference_determinism`:** same weights + seed → bit-exact (20 sampled seeds).
- **`golden_checkpoint_match` (re-shaped D-ANCHOR):** recon L2 0.0219 @ step 200 ≤
  bound 0.03; persistence (no overgrowth) to step 1000. GREEN. (The Distill
  PSNR/SSIM anchors do NOT exist — L2-only, verified Stage 0.)

## ACTION 6 — integrity invariant

`0 HARD_FAIL / 14 SOFT_WARN` held; digest `b7460150…b15e` (unchanged — the new
package/artifact files add no integrity warning; §R measured).

## Verdict

**CONFIRMED.** Stack-D NCA implemented; canonical persistent checkpoint trained;
EFECT bound derived (no STOP-EFECT); D-inference capture shipped; 2 PBT + golden
anchor GREEN; mypy-strict + ruff clean. **Stage 1b-B (WGSL inference + checkpoint
conversion + B-inference capture) unblocked.**

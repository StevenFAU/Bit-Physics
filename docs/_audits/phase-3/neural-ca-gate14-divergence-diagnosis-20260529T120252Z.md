---
date: 2026-05-29
author: phase-3 neural-ca diagnostic probe (Claude Code)
subject: Phase 3 task-6 neural-ca — gate-14 D↔B below-floor divergence root-cause (H1 RNG vs H2 f32-chaos); read-only diagnosis, no source changed
verdict: DIAGNOSIS — H1-DOMINANT (RNG-divergence accounts for ~100% of the §2.12-floor shortfall; H2 negligible)
head_sha: 96d52056281f3f653dabd42939cf920d2c82188b
sub_phase_status: closed-with-shifted-6 (unchanged; this probe re-opens nothing)
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
evidence_paths:
  - packages/neural-ca/python/neural_ca/model.py
  - packages/neural-ca/python/neural_ca/infer.py
  - packages/neural-ca/python/neural_ca/reference/nca_numpy.py
  - packages/neural-ca/python/neural_ca/convert_checkpoint.py
  - packages/neural-ca/typescript/src/nca_inference.wgsl
  - packages/neural-ca/python/tests/test_cross_stack_equivalence.py
  - docs/sim-specs/continuous-ca/neural-ca/equivalence.md
  - tools/testkit/equivalence/tolerance.toml
evidence_hashes:
  packages/neural-ca/python/neural_ca/model.py: sha256:3abd4a8f46812ce3fda306fd62dd17775d9da90a0374dfcd766c0c7aaa1a6697
  packages/neural-ca/python/neural_ca/infer.py: sha256:2bac402c1c7c1a1269ff819fd73a173755ec7e741d6678f0e330ec7e046dd576
  packages/neural-ca/python/neural_ca/reference/nca_numpy.py: sha256:9923de00a0fe9e407b591de14df39de5041b0118fe7030f413d366ec682f2e12
  packages/neural-ca/python/neural_ca/convert_checkpoint.py: sha256:fa01aa8aab42bccd697a23b8ed4f58ee06b64465cdda0f93f5d4a648d2e65e2c
  packages/neural-ca/typescript/src/nca_inference.wgsl: sha256:9021fd3d6c16efc9eb9b8dad0a86a2469159e2b66d3b976297d61a10f59a530d
  packages/neural-ca/python/tests/test_cross_stack_equivalence.py: sha256:44c0d5250e1cade07ba790d05f65760c64e116376c82dbcb7b9200183c30b69d
  docs/sim-specs/continuous-ca/neural-ca/equivalence.md: sha256:31b92076afaf088229107e2cf26b4e22028a936ebde2bcffbc2288529feed71c
  tools/testkit/equivalence/tolerance.toml: sha256:c340a11af1c911263f10433c436d62a8560860cd1d51c8236bee00017d7f5ead
---

# Neural-CA gate-14 D↔B divergence — root-cause diagnosis (read-only probe)

> **Scope.** Diagnostic only. No source under `packages/neural-ca/`, no locked
> tolerance row, no checkpoint, and no committed capture was modified. The
> sub-phase remains **closed-with-shifted-6 at `96d5205`** regardless of these
> findings. All numbers below are MEASURED on the frozen checkpoint via the
> in-repo model/oracle APIs (read-only scratch script under `/tmp`, not committed).

## 0. Question

gate-14 (D↔B render-similarity) landed below two §2.12 floors:

| Metric | Measured (landing) | Locked | §2.12 floor | Status |
|---|---|---|---|---|
| PSNR (dB) | 23.92 | `psnr_min=23.0` | ≥ 28 | below — flagged |
| SSIM | 0.824 | `ssim_min=0.80` | ≥ 0.85 | below — flagged |
| LPIPS_alex | 0.0316 | `lpips_max=0.05` | ≤ 0.15 | PASS |

The landing (`equivalence.md` §1) attributed this to two causes — (a) f32
conv-reduction order (GPU vs CPU) and (b) a different stochastic fire-mask RNG —
asserting "(b) dominates." That attribution was **stated, not isolated**. This
probe quantifies the contribution of each:

- **H1 — RNG-divergence:** D and B draw the per-cell fire mask from different
  PRNG streams; same checkpoint, different realization. TIGHTENABLE by matching.
- **H2 — f32-chaos-amplification:** tiny arithmetic differences compound through
  1000 stochastic steps so D↔B diverges even with an identical mask. NOT
  tightenable by matching the RNG.

## 1. Static RNG-stream comparison (FACT — both implementations read live)

The two stacks use **structurally different, incompatible PRNG streams**:

| | Stack-D (PyTorch) | Stack-B (WGSL) + NumPy oracle |
|---|---|---|
| Call site | `packages/neural-ca/python/neural_ca/model.py:105` | `packages/neural-ca/typescript/src/nca_inference.wgsl:116` / `packages/neural-ca/python/neural_ca/reference/nca_numpy.py:41` |
| Generator | `torch.rand(x[:,:1].shape)` — ambient Mersenne-Twister, **stateful**, seeded by `torch.manual_seed(seed)` at `packages/neural-ca/python/neural_ca/infer.py:43` | `pcg_fire(x,y,step,seed)` — **stateless** counter-based PCG hash |
| Draw indexing | sequential stream; the t-th step's mask consumes `grid²` draws *after* every prior step's draws (global state advances) | pure function of `(x, y, step, seed)`; each cell/step is independent of every other |
| Seed derivation | MT seeded once from `42` | `42` folded into the per-cell hash via `seed * 2654435761u` |

These are not two seedings of one algorithm — they are different algorithms with
different state models. **A priori H1 is plausible**: for any given `(x,y,step)`
the two streams produce uncorrelated Bernoulli(0.5) draws, so D and B fire on
**different cells every step**. Because the NCA update is asynchronous
(`state += dx * fire`), different fire sets ⇒ different per-pixel realizations of
the *same* stochastic process — both converge to the same attractor (the disk)
but are pixel-misaligned.

The checkpoint is ruled OUT as a divergence source (FACT): the converted WGSL
flat-f32 buffer is **bit-identical** to the `.safetensors` weights for all three
tensors (`w1.bias`, `w1.weight`, `w2.weight` — `np.array_equal=True`,
max|Δ|=0.0). Both stacks consume identical weights.

## 2. Matched-RNG experiment (the H1 contribution)

Method: feed BOTH paths an **identical** fire-mask sequence — the oracle's
`pcg_fire` field at each step — and re-measure. D-path = the PyTorch model's own
`perceive`/`w1`/`w2`/`_alive_mask` layers with the pcg mask injected in place of
`torch.rand` (op-order identical to `model.forward`); B-path = the NumPy oracle
(reproduces the committed WGSL capture to **3.2e-6**, confirming it is a faithful
B stand-in). Mean over the same 20 non-seed gate frames (steps 50…1000):

| Configuration | PSNR | SSIM | LPIPS_alex |
|---|---|---|---|
| **As-shipped** (D `torch.rand` ↔ B pcg) | 23.923 | 0.8241 | 0.0316 |
| **Matched-RNG** (D pcg-inject ↔ B pcg) | **144.330** | **1.0000** | **0.0000** |
| **H1 contribution** (matched − shipped) | **+120.41 dB** | **+0.1759** | **−0.0316** |

(The as-shipped row reproduces the committed-capture metrics **exactly**:
direct-from-h5 D↔B = 23.923 / 0.8241 / 0.0316, and the freshly regenerated D
trajectory is **bit-identical** (max|Δrgb|=0.0) to the committed D capture — the
pipeline is validated.)

Matching the RNG alone lifts PSNR from 23.9 → **144 dB** (far over the 28 floor),
SSIM 0.824 → **1.0000** (over the 0.85 floor), LPIPS 0.0316 → **0.0000**.
**The entire floor shortfall is the RNG.**

## 3. Horizon sweep (independent vs matched RNG)

Per-step D↔B similarity at {10,50,100,250,500,1000}:

| step | indep PSNR | indep SSIM | matched PSNR | matched SSIM |
|---:|---:|---:|---:|---:|
| 10 | 58.045 | 0.9994 | 185.389 | 1.0000 |
| 50 | 21.451 | 0.7987 | 153.685 | 1.0000 |
| 100 | 20.551 | 0.6525 | 144.568 | 1.0000 |
| 250 | 24.365 | 0.8383 | 144.342 | 1.0000 |
| 500 | 27.367 | 0.9019 | 144.650 | 1.0000 |
| 1000 | 19.452 | 0.7377 | 142.574 | 1.0000 |

**Matched-RNG divergence does NOT grow with horizon** — it stays > 142 dB / SSIM
1.0000 across all 1000 steps (the gentle 185→142 dB drift is the torch-CPU vs
numpy-CPU conv-reduction residual at the ~1e-7 level, immaterial vs the 28-dB
floor). **H2 chaos-amplification is negligible.** The independent-RNG curve, by
contrast, dips to ~19–21 dB in the transient (steps 50–100) and at step 1000 —
exactly where the divergent fire-sets are most visible — and peaks (27.4 dB) in
the stable regime where both have largely converged.

## 4. fire_rate=1.0 ablation (pure-f32 floor, no RNG at all)

With `fire_rate=1.0` every cell fires every step → the stochastic mask vanishes
on both paths, leaving only f32 arithmetic:

| step | PSNR | SSIM | max\|Δrgb\| |
|---:|---:|---:|---:|
| 10 | 171.965 | 1.0000 | 1.19e-07 |
| 50 | 142.858 | 1.0000 | 5.96e-07 |
| 100 | 139.856 | 1.0000 | 1.25e-06 |
| 250 | ∞ | 1.0000 | 0.0 |
| 500 | ∞ | 1.0000 | 0.0 |
| 1000 | ∞ | 1.0000 | 0.0 |

Mean over the 20 gate frames: PSNR=∞, SSIM=1.0000, LPIPS=0.0000. With no RNG, D
(torch-CPU) and B (numpy-CPU) become **bit-identical** in the stable regime
(max|Δ|=0.0 from step 250 on); the early ~1e-7…1e-6 transients are washed out by
the [0,1] clamp + alive-mask thresholding. **Clean H2≈0 evidence.**

## 5. VERDICT — H1-DOMINANT

| Cause | Contribution to the floor shortfall | Tightenable? |
|---|---|---|
| **H1 (RNG-divergence)** | **~100%** (+120 dB PSNR, +0.176 SSIM on matching) | YES — match the RNG |
| **H2 (f32-chaos)** | negligible (residual > 142 dB matched; bit-exact at fr=1.0) | n/a — already immaterial |

The split is not "both-material." Matching the fire-RNG would **plausibly lift
PSNR/SSIM well over the §2.12 floors** (measured: 144 dB / SSIM 1.0 with matched
RNG, vs floors 28 / 0.85). The dynamics are *not* chaotic in the
sense that would defeat RNG-matching — under an identical mask the two stacks
track each other to f32 precision over the full 1000-step horizon, and with no
mask at all they are bit-identical. The below-floor PSNR/SSIM is a **sampling
artifact of two different realizations of the same stochastic process**, not
genuine dynamical divergence; LPIPS_alex (perceptual) correctly reports the two
as equivalent (0.0316, PASS) because both converge to and hold the same pattern.

**Caveat (does not change the verdict):** the matched/ablation rows compare
torch-CPU vs numpy-CPU. The committed B is WGSL-GPU, which differs from the numpy
oracle by only ~3.2e-6 (GPU-vs-CPU conv order, cause "(a)"). Adding that residual
to the matched-RNG result still leaves D↔B(WGSL) > ~110 dB — vastly over floor.
So cause (a) is also immaterial; the landing's "(b) dominates" is correct, but
"(a)" is not a co-material cause — it is negligible, like H2.

## 6. RECOMMENDATION (advisory — for the operator + task-9 / Phase-5)

1. **H1-dominant ⇒ a matched stateless counter-based fire-RNG is the tightening
   lever.** Porting the PyTorch path to draw its fire mask from the **same**
   `pcg_fire(x,y,step,seed)` hash as WGSL (replacing `torch.rand`) would make D
   and B consume identical masks and bring PSNR/SSIM over the §2.12 floors while
   preserving each stack's internal same-stack-same-hw determinism. Flag this as
   a **task-9 / Phase-5 candidate**, NOT a task-6 re-open. The current
   below-floor close with the QUALITY-CONCERN flag is an **honest** end state for
   the as-shipped (mismatched-RNG) implementation; it is not a defect to be
   widened around — the threshold rows stay as locked.

2. **For the record:** this below-floor divergence profile is **SPECIFIC to
   stochastic learned dynamics** (the per-cell asynchronous fire mask). It does
   NOT generalize to deterministic gates. **task-8's deterministic golden-render
   gate (3DGS-MPM) has no stochastic mask and therefore cannot invoke this
   RNG-divergence argument — it MUST clear the §2.12 floors on its own.**

## 7. Reproduction

Read-only scratch script `/tmp/nca_diag/diag.py` (not committed); run from
`packages/neural-ca/python` under the workspace venv with `CUDA_VISIBLE_DEVICES=""`
(CPU). Inputs: frozen `neural-ca-emoji-disk.safetensors` + the two committed
`captures/neural-ca-ref/` captures. Determinism: `torch.manual_seed(42)`; the
oracle is seedless-by-construction (pcg). Integrity at HEAD: 0 HARD_FAIL /
14 SOFT_WARN (unchanged).

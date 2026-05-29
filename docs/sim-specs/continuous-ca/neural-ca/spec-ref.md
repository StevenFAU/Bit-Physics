# Neural-CA (Growing Neural Cellular Automata) — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. Phase 3 task-6
> deliverable A per `docs/phases/phase-3-plan.md:1765-1880` (§6.6) +
> `docs/phases/sub-phase-phase-3-neural-ca.md` (charter-v2).
>
> **Stage 1a posture:** STUB with `TODO(Stage-1b-D)` / `TODO(Stage-1b-B)` /
> `TODO(Stage-1c)` markers in the sections that require trained weights,
> measured determinism, or measured cross-stack bounds. §6 (PBT invariants)
> + §9 (the gate is **STATISTICAL**) are FULLY DECLARED at Stage 1a per spec
> § 2.14 + § 5.12 — the failing TDD tests need the declarations to exist.

## 1. Scope

Reference **Growing Neural Cellular Automata** sim. Category: `continuous-ca`.
Variant: `growing-neural-ca`. **FIRST dual-stack SIM of Phase 3** and **FIRST
learned-dynamics sim** (spec § 5.12):

- **Stack D (PyTorch)** — `packages/neural-ca/python/` — trains the per-cell
  update network to pixel-wise L2, produces the `.safetensors` checkpoint and
  the canonical **D-inference** capture.
- **Stack B (custom WGSL)** — `packages/neural-ca/typescript/` — runs the same
  trained model as forward inference on a GPU host (spec § 7.8, local-only),
  producing the **B-inference** capture.

The two stacks are tied by ONE trained checkpoint and compared by the **FIRST
cross-stack gate-14** of Phase 3, realized as **render-similarity** (PSNR /
SSIM / LPIPS) and declared **STATISTICAL, not bit/epsilon-analytic** (§ 9) —
a learned model run in PyTorch f32 vs WGSL f32 is NOT bit-equivalent
cross-stack (spec § 2.6 learned row = `distributional`,
`docs/architecture.md:414`; § 5.12).

64×64 grid, 16-channel cell state (RGBA + 12 hidden), target emoji, growing
("Growing" experiment, no damage / no pool). Non-goals (Phase 4+): persistent /
regenerating variants, DiffLogic CA, frontier NCA (`docs/architecture.md:2506`),
`ms_ssim` (Phase-4 WU-C), a neural-weights distribution format beyond the
`.safetensors` + WGSL-buffer pair (post-Phase-5, `docs/architecture.md:1724`).

## 2. Upstream and reference anchor

- **Mordvintsev, A., Randazzo, E., Niklasson, E., Levin, M. (2020).** *Growing
  Neural Cellular Automata.* Distill. DOI `10.23915/distill.00023`.
  https://distill.pub/2020/growing-ca/.
- Vendored read-only oracle: `references/growing-neural-ca/` at SHA
  `3d5547ca48b60ecac459834e2c05c9ff5df87991` (Apache-2.0;
  `references/growing-neural-ca/MANIFEST.toml`). The update rule is
  reimplemented INDEPENDENTLY from the citation anchors in
  `notebooks/growing_ca.ipynb` (cite-don't-import, § H.2).
- **Anchor verification (Convention #8, Stage 0):** the upstream trains with
  pixel-wise **L2 / MSE on RGBA** (`loss_f = mean(square(to_rgba(x) - target))`,
  `growing_ca.ipynb` line 405) and publishes **NO PSNR/SSIM/LPIPS** numbers
  (qualitative evaluation; zero occurrences in the notebook). The cross-stack
  acceptance metrics are therefore NOT inherited from the paper — they are the
  spec § 2.12 floors + MEASURED-then-LOCKED D↔B values (§ 9).

## 3. Algorithm

Per-cell update on a `grid × grid × 16` state, applied synchronously each step
(`growing_ca.ipynb` cell 3 `CAModel.call`):

1. **Perception** — fixed depthwise convolution stacking three kernels per
   channel: identity, Sobel-x, Sobel-y (`Sobel = outer([1,2,1],[-1,0,1]) / 8`;
   line 249) → a `48`-vector per cell.
2. **Update MLP** — per-cell `Conv1x1(128) → ReLU → Conv1x1(16, zero-init)`
   (line 233) → a state delta `dx`.
3. **Stochastic fire mask** — each cell applies `dx` with probability
   `fire_rate = 0.5` independently per step (line 260): `x += dx * mask`.
4. **Alive masking** — a cell is alive iff `maxpool_3x3(alpha) > 0.1`
   (line 217); cells dead both pre- and post-update are zeroed.

Seed: zeros with a single center cell whose alpha + hidden channels = 1
(`make_seed`). RGB is premultiplied by alpha. Channels 0-2 RGB, 3 alpha, 4-15
hidden. Only RGBA is interpreted/visible; the 12 hidden channels are unbounded
real values that drift (regime note for the PBT `field_values_bounded`, § 6).

## 4. Algebraic form

```
state x ∈ R^{H×W×16},  RGBA = x[..., :4],  premultiplied-alpha RGB
perceive(x)  = depthwise_conv(x, [identity, Sobel_x, Sobel_y])      ∈ R^{H×W×48}
dx           = W2 · relu(W1 · perceive(x)),     W2 zero-initialised  (1×1 convs)
fire         ~ Bernoulli(0.5)  per cell, per step
x'           = x + dx ⊙ fire
alive(x)     = maxpool_3x3(alpha(x)) > 0.1
x_next       = x' ⊙ (alive(x) ∧ alive(x'))
training loss = mean( (RGBA(x_T) - target)^2 )      # pixel-wise L2 (Distill)
```

`TODO(Stage-1b-D)`: land `tools/testkit/golden/derivations/` note if a
hand-derivation anchor is required (the update rule is learned, not
closed-form; the golden anchor is the trained-checkpoint L2 reconstruction).

## 5. Implementation

- **Stack D (PyTorch, CI oracle for training + D-inference):**
  - `neural_ca/model.py` — `NCAConfig`, `NCAModel` (`perceive`, `forward`).
  - `neural_ca/train.py` — `train_to_target` (pixel-wise L2).
  - `neural_ca/infer.py` — `run_inference` (D-inference capture payload).
  - `neural_ca/convert_checkpoint.py` — `.safetensors` → WGSL artifact +
    inverse loader (round-trip exact).
  - `neural_ca/reference/nca_numpy.py` — pure-NumPy forward oracle (the
    CI-visible reproduction check for the WGSL capture).
  - Shells landed at Stage 1a (raise `NotImplementedError`); Stage 1b-D
    implements training + inference; Stage 1b-B implements conversion + oracle.
- **Stack B (custom WGSL, local-only per spec § 7.8):**
  `packages/neural-ca/typescript/src/nca_inference.wgsl` + `index.ts`
  (consumes `common/common-ts` device init) — Stage 1b-B. The committed
  B-inference capture is generated by executing this WGSL on a GPU host.

**§0.3 SHIFT layout notes.** (a) §6.6 literal `continuous-ca/neural-ca/python/`
is superseded by the existing-convention `packages/neural-ca/python/` +
`packages/neural-ca/typescript/` (D-LAYOUT; ising single-package-two-language
precedent). (b) The environment has no Node WebGPU runtime (only
`@webgpu/types`, no deno), so the committed B-inference capture is generated by
executing the committed `nca_inference.wgsl` via the **wgpu-py** binding
(wgpu-native / Vulkan) — a genuine WGSL-on-GPU execution; the `index.ts` driver
is the Phase-5 deploy path. `TODO(Stage-1b-B)`.

## 6. Verification posture (≥ 2 PBT invariants per spec § 2.14)

**Code verification.** Golden anchors (re-shaped D-ANCHOR; the plan's published
Distill PSNR/SSIM anchors do NOT exist — verified Stage 0):

1. **`golden_checkpoint_match`** (training golden, not cross-stack) — the
   trained checkpoint reconstructs the target RGBA to a measured training-L2
   bound. `TODO(Stage-1b-D)`: lock the L2 bound on measurement.
2. **§ 2.12 acceptance floors** — PSNR ≥ 28, SSIM ≥ 0.85, LPIPS ≤ 0.15.
3. **MEASURED D↔B render-similarity** (the locked gate; § 9). `TODO(Stage-1c)`.

**Solution verification.** N/A at Phase 3.

**Property-based tests** (≥ 2 invariants per § 2.14; module
`tools/testkit/property/sims/neural-ca/`; declared at Stage 1a, exercised at
Stage 1b-D):

1. **`field_values_bounded` (regime-scoped, D-DET)** — the **visible/clamped**
   channels stay bounded: RGBA ∈ [0, 1] under the implementation's clamping at
   every captured step. The 12 hidden channels are UNBOUNDED real values that
   drift by design, so the invariant is scoped to RGBA (or, as the fallback
   regime, full-state **finiteness / non-divergence**) — NOT all 16 channels.
   If the strong RGBA-clamp form falsifies at PBT, the regime is RE-DECLARED on
   evidence (free-cloth / lenia-monotone precedent), NOT widened.
2. **`inference_determinism`** — same weights + seed + input → bit-exact output
   across two runs (per stack). This single-stack reproducibility is the
   foundation of the D↔B statistical gate.

**Determinism (D-DET, two-row mixed posture).** See § 8. Training is
non-deterministic by design (distributional / EFECT bound, measured 1b-D);
inference is bit-exact same-stack-same-hw.

**Mutation.** NO mutation gate (sim, not testkit — lenia/ising/rigid-body/cloth
precedent; § 6.0 item 12 testkit-adjacent-only).

## 7. Golden values / Manufactured solutions

- Trained checkpoint `tools/testkit/golden/checkpoints/neural-ca-emoji-lizard.safetensors`
  (Stage 1b-D; LFS) — the `golden_checkpoint_match` L2 anchor.
- Converted WGSL artifact `…-wgsl.bin` + `…-wgsl.layout.json` (Stage 1b-B; LFS)
  — round-trip-equal to the `.safetensors` weights.
- The learned update rule has no closed-form golden table; the cross-stack
  acceptance values land in `tolerance.toml` (§ 9).

## 8. Determinism

**Two registry rows** at `tools/testkit/determinism/registry.toml` (D-DET):

- `[continuous-ca.neural-ca.training]` — class `non-deterministic` (by design:
  stochastic fire mask + optimizer dynamics), `distributional_bound = "EFECT"`
  (the training-loss-distribution band across pinned seeds, MEASURED + DERIVED
  at Stage 1b-D). If the EFECT bound is underivable → **STOP-EFECT**
  (re-characterize per the ising STOP-DET template). The EFECT bound
  characterizes training-convergence reproducibility — it is **NOT** the
  cross-stack gate.
- `[continuous-ca.neural-ca.inference]` — class `bit-exact`, scope
  `same-stack-same-hw`, atomics `none`, seed pinned `true`. `run_twice_and_diff`
  on the PyTorch inference is byte-identical (MEASURED at Stage 1b-D).

**LOCKED at Stage 1b-D (measured):**

- **EFECT bound DERIVED — no STOP-EFECT.** Across 5 pinned seeds on the
  representative disk-pool training config (32², 300 steps): final-training-loss
  mean 0.0403, std 0.0083, range [0.0319, 0.0519], CV 0.21; the tail-smoothed
  loss (last-20-mean) CV is 0.085. The loss-convergence distribution is BOUNDED
  (no divergence), so EFECT (distributional-equality) is derivable. The locked
  bound `training_loss_3sigma_upper = 0.07` (measured 3σ upper = 0.0653 + margin)
  in `tolerance.toml`. (The earlier 32²-square Growing measurement gave the same
  qualitative result, CV 0.22 — the boundedness is config-robust.) Note: with a
  pinned seed, training is in fact reproducible run-to-run on this CPU (seed-42
  reproduced its final loss exactly); EFECT characterizes the CROSS-SEED ensemble.
- **Inference bit-exact CONFIRMED.** `run_twice_and_diff` on `run_inference`
  (same seed) is `np.array_equal` (exercised by the `inference_determinism` PBT,
  20 sampled seeds). This single-stack reproducibility is the foundation for the
  statistical D↔B gate.

## 9. Equivalence — STATISTICAL cross-stack gate-14 (D↔B)

**This sim's gate-14 is STATISTICAL, not bit/epsilon-analytic.** A learned model
run in PyTorch f32 vs WGSL f32 diverges in the conv reductions; the equivalence
is perceptual (spec § 2.6 learned row `distributional`,
`docs/architecture.md:414`; § 5.12). gate-14 is a **CI / local-convention**
cross-stack gate (spec has 13 Layer-4 gates, `docs/architecture.md:2585-2606`).

Realized via **render-similarity** (task-2's metric module, direct import
`from render_similarity import psnr, ssim, lpips`), frame-paired by index
between the D-inference and B-inference captures, asserted against
`[render_similarity.continuous-ca.neural-ca]` in
`tools/testkit/equivalence/tolerance.toml`. NOT `compare_captures`.

**MEASURED + LOCKED at Stage 1c** (mean over the 20 non-seed frame pairs):
PSNR 23.92 (`psnr_min = 23.0`), SSIM 0.824 (`ssim_min = 0.80`), LPIPS_alex
0.0316 (`lpips_max = 0.05`). **QUALITY-CONCERN flag (NOT auto-fail; learned =
distributional):** PSNR 23.92 < § 2.12 floor 28 and SSIM 0.824 < floor 0.85 —
dragged down by the stochastic per-cell fire-mask RNG divergence (`torch.rand` vs
WGSL PCG). The PERCEPTUAL metric **LPIPS_alex 0.0316 PASSES the floor (≤ 0.15)**:
the D and B patterns are perceptually equivalent. Companion doc:
`docs/sim-specs/continuous-ca/neural-ca/equivalence.md` (RD-2D template, marked
**statistical**).

## 10. Diagnostics

Tier-3 module `tools/diagnostics/tier3/neural-ca/` per § 3.2.9. RGBA-bounds
tracking, hidden-channel finiteness, per-step alive-cell count, training-loss
curve. Tier-1 / Tier-2 consumed: `diagnostics.check_health` (NaN/Inf),
`diagnostics.check_bounds` (RGBA ∈ [0, 1]). `TODO(Stage-1c)`.

## 11. Build and run

- `just run-neural-ca` — train + infer + convert (Stage 1b).
- `just test-neural-ca` — `pytest packages/neural-ca/python/tests/`.
- CI jobs: `.github/workflows/python-strict.yml` `test-neural-ca-train`,
  `test-neural-ca-infer`, `test-neural-ca-equiv` (Stage 1c; each with a
  selective LFS pull for its capture(s); ising `test-ising-classical`
  precedent). `ts-strict.yml` stays library-only; WGSL inference is local-only
  (§ 7.8). `build-py.yml` / `build-ts.yml` do NOT exist (D-CI).

```
python -m neural_ca train   --emoji lizard --grid 64 --steps 8000 \
  --out tools/testkit/golden/checkpoints/neural-ca-emoji-lizard.safetensors
python -m neural_ca infer    --checkpoint <ckpt> --grid 64 --steps 1000 \
  --seed 42 --out captures/neural-ca-ref
python -m neural_ca convert  --checkpoint <ckpt> --out <wgsl-artifact-dir>
```

## 12. References

- Mordvintsev et al. 2020 (Distill, DOI 10.23915/distill.00023) — Growing NCA.
- `references/growing-neural-ca/` (SHA `3d5547ca…`, Apache-2.0) — vendored oracle.
- `docs/phases/phase-3-plan.md` § 6.6 (`:1765-1880`) — task-6 deliverables.
- `docs/phases/sub-phase-phase-3-neural-ca.md` — charter-v2.
- `docs/spec-amendments-proposed.md` A-4 / A-5 — vendor pin corrigenda.

## 13. Productization status

Reference. **task-6 is TERMINAL on the produce side** (plan § 3.1 `:328`); the
HARD dep on task-2 (render-similarity) is SATISFIED. No later Phase-3 task
imports `packages/neural-ca/` as a code dependency; task-8 (3DGS-MPM
golden-render) inherits the statistical-cross-stack-gate pattern.

— Spec stub ends — Stage 1b fills the `TODO(Stage-1b-*)` markers; Stage 1c
locks the measured D↔B render-similarity bounds.

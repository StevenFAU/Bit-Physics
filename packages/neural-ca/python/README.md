# neural-ca (Python / Stack D)

Growing Neural Cellular Automata reference sim — **Stack D** (PyTorch training +
inference). Phase 3 task-6 (sub-phase 3.2). The **first dual-stack SIM** of Phase
3: this Python half trains the model and produces the D-inference capture; the
sibling `../typescript/` half runs custom-WGSL inference (Stack B) on a GPU host;
the two are tied by one trained checkpoint and compared by the **statistical**
cross-stack gate-14 (render-similarity).

The per-cell update rule is reimplemented INDEPENDENTLY from Mordvintsev et al.
2020, ["Growing Neural Cellular Automata", Distill](https://distill.pub/2020/growing-ca/)
(citation anchors in `references/growing-neural-ca/`; cite-don't-import, § H.2).

## Layout

- `neural_ca/model.py` — the per-cell update network (perception + update MLP +
  stochastic fire mask + alpha alive-masking).
- `neural_ca/train.py` — pixel-wise-L2 training loop (the Distill objective).
- `neural_ca/infer.py` — frozen-model forward inference (D-inference capture).
- `neural_ca/convert_checkpoint.py` — `.safetensors` → WGSL-loadable artifact
  (exact, round-trip tested).
- `neural_ca/reference/nca_numpy.py` — pure-NumPy oracle (the CI-visible
  reproduction check for the WGSL B-inference capture).

## CLI

```
python -m neural_ca train   --emoji lizard --grid 64 --steps 8000 --out tools/testkit/golden/checkpoints/neural-ca-emoji-lizard.safetensors
python -m neural_ca infer    --checkpoint <ckpt> --grid 64 --steps 1000 --seed 42 --out captures/neural-ca-ref
python -m neural_ca convert  --checkpoint <ckpt> --out <wgsl-artifact-dir>
```

## Determinism

- **Training** — non-deterministic by design (stochastic fire mask + optimizer);
  the determinism registry records a distributional ("EFECT") training-loss bound.
- **Inference** — bit-exact same-stack-same-hw (pinned RNG seed). This is the
  foundation for the D↔B cross-stack gate, which is statistical (different f32
  conv reductions PyTorch↔WGSL), NOT bit-exact.

## Local GPU (Stack-B capture generation)

The WGSL inference is local-only (spec § 7.8). Install the `local-gpu` extra
(`wgpu`) to run the committed `../typescript/src/*.wgsl` via the wgpu-py harness
and regenerate the committed B-inference capture. CI never runs WGSL.

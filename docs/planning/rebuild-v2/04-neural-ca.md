# 04 — Grow (neural cellular automata)

> Part of [Rebuild v2](README.md). Replaces `packages/neural-ca/web`. Wave A.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

## Verdict on the prototype

- **Keep:** the committed checkpoint (weights == disk sha), the persistent regime, and the
  flagship proof — backend-conditional bit-exactness measured live over a full 21-frame
  sweep, adapter id recorded. Damage/regrow interaction and the hidden-channel view.
- **Drop:** a 40-pixel organism shown as a grey dot on a **white** field at load (the splash
  reel cut it for strobing); one organism only; presets named after internals (`fire sweep`,
  `backend Δ`); the organism rendered as raw texels.
- **Lesson:** the magic of growing NCA is *a learned rule that regrows a shape after you
  tear it*. The second magic — that a few thousand parameters learn this in minutes — has
  never been shown live in a browser as far as this research found.

## The experience

**Pitch:** *Draw a creature and teach a living texture to grow it — in your browser.*

**First ten seconds:** a dark, softly lit dish. A single seed cell glows; over a few seconds
a creature (lizard, butterfly, starfish — rotating daily) unfurls from it, large, with smooth
edges and a faint inner iridescence from its hidden channels. A hint: "Cut it."

**Signature moment 1 — Regrow:** drag across the organism to tear it; it bleeds, then heals
back to its shape. Tear it in half and (for the regeneration-trained models) each half
tries to regrow — sometimes two creatures.

**Signature moment 2 — Teach:** draw a 40×40 target (or pick an emoji, or drop an image).
Press *Teach*. The dish switches to a training view: a grid of 8 sample dishes growing with
the current rule, a loss curve falling, and the creature sharpening from noise into the
drawing over ~1–3 minutes on a desktop GPU (target; see risks). Then it lives in the main
dish and can be cut, saved and shared.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **The Dish** (default) | pretrained regenerating organism | "Cut it. It heals." |
| **Menagerie** | 6–8 pretrained organisms side by side | "Each one is the same code with different weights." |
| **Chimera** | graft cells from one organism into another | "What grows when two rules meet?" |
| **Teach** | in-browser training from your drawing | "Draw something simple. Watch it learn to grow." |
| **Textures** | texture NCA (Niklasson et al.) tiling a large plane, regrows after erasing | "No edges, no centre — only pattern." |
| **Inside the Cell** | cell grid view: one cell's 16 channels, perception filters, update | "This is the whole rule." |

### Tools

*Cut* (erase a stroke), *Seed* (plant a seed cell), *Graft* (pick cells, drop elsewhere),
*Freeze* (stop updates in a region — shows that growth is local), *Probe* (one cell's state).

## The model

- Growing NCA (Mordvintsev et al. 2020): 16 channels (RGBA + 12 hidden); perception =
  identity + Sobel x/y per channel (48 values); dense 48→128 (ReLU) → 128→16 (zero-init);
  stochastic update (rate 0.5) with a **seeded hash mask**; alive masking by 3×3 max-pool of
  alpha > 0.1. ~8.3k parameters.
- Grid 72×72 for a 40×40 target (canonical), live display upscales; Textures uses 256²
  (T3) with periodic boundaries.
- **In-browser training (Teach):**
  - Forward and backward passes as WGSL compute; backprop through time over 64–96 steps
    with **state checkpointing** (store the 16-channel state per step, recompute the hidden
    layer in backward) to fit memory.
  - Sample pool of 256–1024 states, batch 4–8, damage on the worst samples, per-variable
    gradient normalisation, Adam.
  - Back-of-envelope (to be measured): batch 8 × 72² cells × 80 steps × ~25k FLOPs/cell
    (fwd + bwd) ≈ 8×10¹⁰ FLOPs per iteration — tens of milliseconds on a desktop GPU, so
    ~1,000–2,000 iterations in 1–3 minutes. State checkpoints ≈ 210 MB at batch 8, 80 steps
    (halve batch or steps on T2; T1 does not train, it runs shared models).
  - Determinism: seeded update masks and pool sampling; same device ⇒ same weights.
- **Textures:** Niklasson et al. 2021 texture NCA (VGG-style style loss is too heavy to
  train in-browser; ship pretrained textures, train only the shape mode).
- **Export:** weights as a small binary (~33 kB f32) — download, local library
  (IndexedDB), and re-import. Share links carry a model id for gallery models only.

## The look

- Art direction: **specimen under glass**. Dark teal-black dish with a soft vignette and
  a rim highlight; organisms rendered from RGBA with premultiplied alpha, bicubic
  reconstruction and a subtle contact shadow so they sit *on* the dish, plus an optional
  thin "membrane" edge from the alpha gradient.
- Hidden channels as a gentle iridescent tint (PCA of the 12 hidden channels → 3 colours,
  at 15% strength) — togglable to full strength in Inside the Cell.
- Teach view: 2×4 grid of small dishes (pool samples), loss curve in a `PlotPanel`, the
  target as a ghost outline behind the main dish.

## The proof

- Keep the existing gate: the committed checkpoint's live re-run, bit-exact per backend
  over the 21-frame sweep, run-twice; port the kernel exactly (it is the gated surface).
- **Gradient check (new):** on a fixed tiny batch, WebGPU gradients vs the Python package's
  reference gradients (`packages/neural-ca`), relative error within a declared budget —
  shown in Prove as "your GPU's backprop matches the reference".
- **Trained-model card:** final loss, iterations, wall time, adapter, and a regeneration
  score (IoU with the target 200 steps after a standard cut), all measured on the run.
- Claims: "trained on your GPU" only when it was; the novelty claim (*first in-browser GPU
  NCA training*) is **verify before claiming** — this research found inference-only
  browser demos and server-side training UIs, not GPU training in the browser.

## Performance targets

| Tier | Live view | Teach |
|---|---|---|
| T3 | 60 fps, 72² + Textures 256² | ≤ 3 min to a recognisable shape (target) |
| T2 | 60 fps | batch 4 / 64 steps, ≤ 8 min (target) |
| T1 | 60 fps | not offered; shared models only |

## Risks and open questions

- **Training speed is the make-or-break.** Spike in M0: implement forward + backward for
  a single step, measure ms per iteration at batch 8 on the RX 6800 XT and an iGPU before
  committing to the Teach design.
- Exploding gradients through long rollouts: per-variable normalisation and gradient
  clipping as in the paper; shorten rollouts if needed.
- User drawings can be unlearnable (thin lines, disconnected parts) — the draw tool
  thickens strokes and the target is low-pass filtered; Teach warns on low alpha coverage.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Live NCA in the shell, organism large on the dish look; gate ported; **training spike measured** |
| M1 | Menagerie (pretrained gallery), Cut/Seed/Graft/Freeze tools, Inside the Cell |
| M2 | Teach end-to-end with gradient check in Prove; local model library |
| M3 | Textures; Chimera; posters/loops |

## References

- Mordvintsev et al. 2020, *Growing Neural Cellular Automata*, Distill — [distill.pub/2020/growing-ca](https://distill.pub/2020/growing-ca/)
- Niklasson et al. 2021, *Self-Organising Textures*, Distill — [distill.pub/selforg/2021/textures](https://distill.pub/selforg/2021/textures/)
- Pajouheshgar et al. 2023, *Mesh Neural Cellular Automata* — [arXiv:2311.02820](https://arxiv.org/abs/2311.02820)
- *Neural Cellular Automata: From Cells to Pixels* (2025) — high-resolution decoding of coarse NCA grids — [arXiv:2506.22899](https://arxiv.org/abs/2506.22899)
- Prior art for training UIs: [Growing-NCA-WebUI](https://github.com/semvdn/Growing-NCA-WebUI) (server-side TensorFlow training, browser front end)

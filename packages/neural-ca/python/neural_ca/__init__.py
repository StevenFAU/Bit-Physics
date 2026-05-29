"""neural_ca — Growing Neural Cellular Automata reference sim (Stack D, PyTorch).

Phase 3 task-6 (sub-phase 3.2). FIRST dual-stack SIM of Phase 3: Stack D
(PyTorch training + PyTorch inference) AND Stack B (custom-WGSL inference,
``../typescript/``), tied by ONE trained checkpoint. FIRST learned-dynamics sim
and FIRST cross-stack gate-14 (render-similarity, statistical) of Phase 3.

Update rule reimplemented INDEPENDENTLY from Mordvintsev et al. 2020, "Growing
Neural Cellular Automata", Distill (https://distill.pub/2020/growing-ca/);
citation anchors in ``references/growing-neural-ca/`` (cite-don't-import, § H.2).

Public surface (§ 3.2.6):

- :class:`NCAConfig` — grid / channel / fire-rate / target hyperparameters.
- :class:`NCAModel` — the per-cell update network (perception + update MLP +
  stochastic fire mask + alpha alive-masking).
- :func:`train_to_target` — train the model to reconstruct a target RGBA image
  to an L2 bound; returns the trained model + the loss log.
- :func:`run_inference` — roll the frozen model forward from the seed for N
  steps; returns the RGBA frame stack (the D-inference capture payload).
- :func:`seed_state` — the canonical single-live-cell seed.
"""

from __future__ import annotations

from .infer import run_inference
from .model import NCAConfig, NCAModel, seed_state
from .train import train_to_target

__all__ = [
    "NCAConfig",
    "NCAModel",
    "run_inference",
    "seed_state",
    "train_to_target",
]

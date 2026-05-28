"""LeniaSim — Stack-D Taichi-backed reference Lenia.

Stage 1a — shells only. ``LeniaConfig`` is a dataclass (lands at
Stage 1a so the test suite can import it); ``LeniaSim`` shell raises
:class:`NotImplementedError` from each method until Stage 1b
implementation.

Stage-1b implementation contract (per charter §2 Stage 1b + spec-ref
§ 5 + § 8):

- Real-space Taichi-kernel convolution (D-FFT real-space default;
  FFT opt-in only if a stable AND bit-exact same-stack-same-hw
  Taichi FFT path is found at Stage 1b probe).
- Orbium unicaudatus preset minimum (kernel R, growth mu/sigma, dt
  cited from Chakazul ``animals.json`` at SHA
  ``adfc542939266de7f4bb7ebb552e8499701ee107``).
- Capture I/O via :class:`common_py.capture.Writer`.
- Determinism via
  :func:`common_py.determinism.set_taichi_deterministic(config, arch='cpu')`
  with ``arch="cpu"`` (per § 7.3 D-DET: bit-exact same-stack-same-hw;
  no atomics in forward conv).
- CLI per `docs/phases/phase-3-plan.md` § 3.2.6 — `lenia/__main__.py`
  with ``--seed``, ``--steps``, ``--grid``, ``--preset``, ``--out``,
  ``--tolerance-key continuous-ca.lenia``, ``--determinism-arch cpu``.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

_STAGE_1A_SHELL = (
    "LeniaSim Stage 1a scaffold: implementation lands at Stage 1b. "
    "Stage 1b consumes common_py.capture.Writer + "
    "common_py.determinism.set_taichi_deterministic(arch='cpu') per "
    "docs/sim-specs/continuous-ca/lenia/spec-ref.md § 5 + § 8."
)


@dataclass(frozen=True)
class LeniaConfig:
    """Lenia preset + grid + seed configuration.

    Default values are placeholders for the test suite's import sanity.
    Stage 1b lands the concrete Orbium unicaudatus preset values
    grep-cited from Chakazul ``animals.json``.
    """

    preset: str = "orbium-unicaudatus"
    grid: int = 64
    R: int = 13
    mu: float = 0.15
    sigma: float = 0.015
    dt: float = 0.1
    seed: int = 42
    steps: int = 100


class LeniaSim:
    """Stack-D Taichi-backed Lenia sim.

    Stage 1a — shell only. ``__init__`` records the config; every
    other method raises :class:`NotImplementedError`.
    """

    def __init__(self, config: LeniaConfig) -> None:
        self.config = config

    def step(self) -> None:
        """Advance one Euler step.

        Stage 1a — raises :class:`NotImplementedError`. Stage 1b lands
        the real-space Taichi-kernel convolution + growth + Euler
        update.
        """
        raise NotImplementedError(_STAGE_1A_SHELL)

    def field(self) -> Any:
        """Return the current field (NumPy 2-D float array).

        Stage 1a — raises :class:`NotImplementedError`. Stage 1b
        returns ``ti.field.to_numpy()`` or equivalent.
        """
        raise NotImplementedError(_STAGE_1A_SHELL)

    def capture(self, out_dir: Path) -> Path:
        """Write the canonical Orbium capture and return the manifest path.

        Stage 1a — raises :class:`NotImplementedError`. Stage 1b
        consumes :class:`common_py.capture.Writer`.
        """
        raise NotImplementedError(_STAGE_1A_SHELL)

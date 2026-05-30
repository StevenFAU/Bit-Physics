"""``PhysicsNeMoAdapter`` — plug a portfolio learned-dyn sim into PhysicsNeMo (§4.2.E).

Used by Phase-4.6 sim 4.27 (learned-closure-les) to integrate with NVIDIA
PhysicsNeMo's foundation-model CFD infrastructure. The runtime pin is
**nvidia-physicsnemo 2.1.0** (Apache-2.0; re-resolved live at the WU-E probe —
the plan's "specific 1.x" guidance is stale per corrigendum A-6: core 1.x ended
at v1.3.0, the framework is 2.x). ``physicsnemo`` is lazy-imported with a clear
error if absent. The concrete model/datapipe semantics are refined per-sim at
Stage 4.27; the foundation ships the integration point.
"""

from __future__ import annotations

from typing import Any

_PHYSICSNEMO_MISSING_MSG = (
    "nvidia-physicsnemo is required for the PhysicsNeMo adapter. Install with "
    "`uv pip install nvidia-physicsnemo==2.1.0` (base build is CPU-installable; "
    "the cu12/cu13 extras add GPU acceleration). Pin re-resolved live at WU-E."
)


class PhysicsNeMoAdapter:
    """Adapter so a portfolio learned-dyn sim plugs into PhysicsNeMo (§4.2.E)."""

    def __init__(self, *, lightning_module: Any, capture_dataset: Any) -> None:
        self.lightning_module = lightning_module
        self.capture_dataset = capture_dataset

    def to_physicsnemo_model(self) -> Any:
        """Wrap the LightningModule in a ``physicsnemo.Module`` (forward delegates)."""
        try:
            import physicsnemo
        except ImportError as exc:  # pragma: no cover - environment-dependent
            raise RuntimeError(_PHYSICSNEMO_MISSING_MSG) from exc

        lightning_module = self.lightning_module

        class _LightningWrappedModule(physicsnemo.Module):  # type: ignore[misc]
            def __init__(self) -> None:
                super().__init__()
                self._lightning_module = lightning_module

            def forward(self, *args: Any, **kwargs: Any) -> Any:
                return self._lightning_module(*args, **kwargs)

        return _LightningWrappedModule()

    def to_physicsnemo_datapipe(self) -> Any:
        """Expose the CaptureDataset as a PhysicsNeMo datapipe (a torch Dataset)."""
        try:
            import physicsnemo  # noqa: F401
        except ImportError as exc:  # pragma: no cover - environment-dependent
            raise RuntimeError(_PHYSICSNEMO_MISSING_MSG) from exc
        # PhysicsNeMo datapipes are torch Datasets/IterableDatasets; the
        # CaptureDataset satisfies that protocol directly (refined per-sim at 4.27).
        return self.capture_dataset

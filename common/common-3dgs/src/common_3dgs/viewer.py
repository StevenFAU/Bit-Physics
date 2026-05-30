"""``common_3dgs.viewer`` — headless + interactive 3DGS viewing (§4.2.C).

``render_to_image`` is headless and CI-gated (it drives the landed CPU
``render`` + ``save_png``). ``launch_interactive_viewer`` is runtime-only per
spec § 7.8 and does NOT gate CI — it requires an interactive display backend and
raises ``RuntimeError`` cleanly when none is available (e.g. headless CI), rather
than importing a GUI toolkit at module-import time.
"""

from __future__ import annotations

import os
from pathlib import Path

from .camera import Camera
from .image_io import save_png
from .model import GaussianSplatModel
from .render import render


def render_to_image(model: GaussianSplatModel, camera: Camera, output_path: str | Path) -> None:
    """Headless render of ``model`` through ``camera`` to an image file.

    Drives the landed CPU forward rasteriser and writes a PNG. CI-gated.
    """
    image = render(model, camera)
    save_png(image, str(output_path))


def launch_interactive_viewer(
    model: GaussianSplatModel,
    *,
    initial_camera: Camera | None = None,
) -> None:
    """Launch a live interactive 3DGS viewer (runtime-only; does not gate CI).

    Requires an interactive display (``$DISPLAY`` on X11 / ``$WAYLAND_DISPLAY``).
    Raises ``RuntimeError`` when run headless so the failure is loud rather than a
    silent no-op. The concrete GUI backend is wired by runtime consumers per spec
    § 7.8; the foundation surface guarantees the entry point + the headless guard.
    """
    if model.num_gaussians == 0:
        raise ValueError("launch_interactive_viewer: model has no Gaussians to display")
    if not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        raise RuntimeError(
            "launch_interactive_viewer requires an interactive display "
            "($DISPLAY / $WAYLAND_DISPLAY); none found (headless environment). "
            "Interactive viewing is runtime-only per spec § 7.8 and does not gate CI."
        )
    raise NotImplementedError(
        "launch_interactive_viewer: the interactive GUI backend is a runtime-only "
        "consumer concern (spec § 7.8); the foundation ships the entry point + "
        "headless guard. Wire a backend at the consuming sim's runtime."
    )

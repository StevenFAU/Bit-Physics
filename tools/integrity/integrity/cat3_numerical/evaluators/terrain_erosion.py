"""Register the package reference; no duplicate numerical implementation."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

ALGORITHM_NAME = "terrain-erosion-hll-consistency"


def evaluate(inputs: dict[str, Any]) -> dict[str, Any]:
    package = Path(__file__).resolve().parents[5] / "packages/terrain-erosion"
    if str(package) not in sys.path:
        sys.path.insert(0, str(package))
    from terrain_erosion.reference import flux

    values = flux(inputs["state"], inputs["state"])
    return dict(zip(("water", "normal", "tangent", "sediment"), values, strict=True))

"""Make the hyphenated render-passes tool dir importable for the smoke suite.

The ``render-passes/`` dir is not a Python package path (hyphen), so the pipeline
is invoked by PATH in CI. For the smoke tests we add the tool dir (for ``pipeline``
and ``convert``) and the ``blender/`` dir (for ``presets``, which has no ``bpy``
import at module load) to ``sys.path``.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
for p in (_ROOT, _ROOT / "blender"):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

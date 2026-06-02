"""Make the hyphenated ``pypi-release/`` tool dir importable for the smoke suite.

The Phase-5 tool tree is ``tools/productization/<sub-phase-name>/`` with
hyphenated names (§ 5.1 / § 4.14 of the phase plan; ``git grep pypi-release``
returns every related file). A hyphenated directory is not a valid Python
module path, so ``pipeline.py`` / ``lint.py`` are invoked by PATH (the
established ``tools/dispatch/preflight-phase.py`` precedent), and the smoke
suite inserts the dir on ``sys.path`` to ``import pipeline`` / ``import lint``.
"""

from __future__ import annotations

import sys
from pathlib import Path

_TOOL_DIR = Path(__file__).resolve().parent.parent
if str(_TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOL_DIR))

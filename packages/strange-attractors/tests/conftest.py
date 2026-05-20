"""pytest config for the strange-attractors TDD-bootstrap suite.

The Phase 1 Stage 2 package ships failing tests only; the implementation
lives at ``strange_attractors.reference`` (and siblings) and is added
in a Phase 2+ implementation phase. ``conftest.py`` here only ensures
the package directory is on ``sys.path`` for pytest collection so the
``ModuleNotFoundError`` raised at import time is the deferred-module
miss, not a path miss.
"""

from __future__ import annotations

import sys
from pathlib import Path

_PKG_ROOT = Path(__file__).resolve().parent.parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))

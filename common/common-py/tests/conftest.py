"""Path setup so tests find common_py without registering the package
in the root workspace (Stage 3 will register it; Convention A forbids
editing root pyproject.toml in Stage 1).
"""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

_SMOKE = Path(__file__).resolve().parents[1]
if str(_SMOKE) not in sys.path:
    sys.path.insert(0, str(_SMOKE))

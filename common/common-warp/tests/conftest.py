"""Path setup so ``pytest common/common-warp/tests/`` resolves
``common_warp`` from ``src/`` whether or not the package is installed
into the active interpreter (mirrors common/common-py/tests/conftest.py;
keeps the cross-package regression sweep's ``cd <pkg> && pytest``
invocation runnable against the root .venv).
"""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

# examples/ on the path so the Subsystem-7 smoke sim imports as ``hello.sim``
# (mirrors common-py putting its ``smoke`` package root on sys.path).
_EXAMPLES = Path(__file__).resolve().parents[1] / "examples"
if str(_EXAMPLES) not in sys.path:
    sys.path.insert(0, str(_EXAMPLES))

"""Path setup so ``pytest common/common-3dgs/tests/`` resolves ``common_3dgs``
from ``src/`` and the smoke sim as ``smoke_3dgs.sim`` from ``examples/`` whether
or not the package is installed (mirrors common/common-warp/tests/conftest.py;
keeps the ``cd <pkg> && pytest`` invocation runnable against the root .venv).
"""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

# examples/ on the path so the smoke sim imports as ``smoke_3dgs.sim``
# (mirrors common-warp putting its ``examples`` root on sys.path for ``hello.sim``).
_EXAMPLES = Path(__file__).resolve().parents[1] / "examples"
if str(_EXAMPLES) not in sys.path:
    sys.path.insert(0, str(_EXAMPLES))

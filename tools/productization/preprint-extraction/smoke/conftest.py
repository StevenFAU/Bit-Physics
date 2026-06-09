"""Make the hyphenated preprint-extraction tool dir importable for the smoke suite.

The ``preprint-extraction/`` dir is not a Python package path (hyphen), so the
pipeline is invoked by PATH in CI. For the smoke tests we add the tool dir (for
``pipeline`` and ``extract``) to ``sys.path``.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

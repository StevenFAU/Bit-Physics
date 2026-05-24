"""Scaffold smoke test (Stage 1a COMMIT 1) — package imports + version.

Substantive Runtime / warp_harness tests land in COMMIT 2
(``test_runtime.py`` / ``test_harness.py``).
"""

from __future__ import annotations

import common_warp


def test_package_imports_and_version() -> None:
    assert common_warp.__version__ == "0.1.0"

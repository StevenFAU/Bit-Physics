"""pytest wrapper for check_registry.py — the sim-registry drift check.

CI runs the script directly in the web-deploy discover job (stdlib only); this
wrapper lets `pytest tools/productization/web-deploy/smoke` cover it locally.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent


def test_sim_registry_has_no_drift() -> None:
    spec = importlib.util.spec_from_file_location(
        "check_registry", TOOL / "check_registry.py"
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    assert mod.check() == []

"""DiagnosticReport envelope + serialization."""

from __future__ import annotations

import json
from pathlib import Path

from diagnostics.tier1.health import HealthReport
from diagnostics.tier1.reports import DiagnosticReport


def test_add_and_serialize(tmp_path: Path) -> None:
    report = DiagnosticReport(sim="rd-2d", seed=42)
    report.add(
        "tier1.health",
        HealthReport(
            ok=True, nan_count=0, inf_count=0, first_offending_step=None, first_offending_field=None
        ),
    )
    out = tmp_path / "report.json"
    report.write_json(out)
    loaded = json.loads(out.read_text(encoding="utf-8"))
    assert loaded["sim"] == "rd-2d"
    assert loaded["seed"] == 42
    assert loaded["checks"]["tier1.health"]["ok"] is True
    assert loaded["checks"]["tier1.health"]["nan_count"] == 0

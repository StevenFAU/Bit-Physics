"""Common report types + JSON serialization.

Diagnostic tiers each define their own concrete report dataclass
(HealthReport, BoundsReport, etc.). ``DiagnosticReport`` aggregates an
arbitrary set of those into one envelope for serialization.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, is_dataclass
from pathlib import Path
from typing import Any


@dataclass
class DiagnosticReport:
    """Aggregate envelope for a multi-check diagnostic sweep.

    Each entry maps a check name (e.g. ``"tier1.health"``) to its
    per-check dataclass; serialization flattens via ``dataclasses.asdict``.
    """

    sim: str
    seed: int | None
    checks: dict[str, Any] = field(default_factory=dict)

    def add(self, name: str, payload: Any) -> None:
        self.checks[name] = payload

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"sim": self.sim, "seed": self.seed, "checks": {}}
        for name, payload in self.checks.items():
            if is_dataclass(payload) and not isinstance(payload, type):
                out["checks"][name] = asdict(payload)
            else:
                out["checks"][name] = payload
        return out

    def write_json(self, path: Path) -> Path:
        Path(path).write_text(
            json.dumps(self.to_dict(), indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        return Path(path)

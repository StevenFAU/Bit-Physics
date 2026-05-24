"""Capture data model (Subsystem 2) — the §1.9.1 ``Capture`` dataclass.

The payload is a FLAT dict keyed by the canonical HDF5 path under the
payload root (mirroring `tools/testkit/capture`'s
``/steps/{N}/state/{field}`` + ``/steps/{N}/diagnostics/{check}`` layout,
without the leading slash), so a ``Capture`` round-trips losslessly
through `write_capture` / `read_capture`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

#: Payload-key kinds (the HDF5 sub-group under ``steps/{N}/``).
STATE = "state"
DIAGNOSTICS = "diagnostics"


@dataclass
class Capture:
    """In-memory representation of a capture matching capture-v1.json.

    ``manifest`` is the spec § 2.7 manifest dict (``schema_version``,
    ``sim``, ``stack``, ``config``, ``run``, ``payload``, ``determinism``).
    ``payload`` maps ``steps/{N}/state/{field}`` (and optionally
    ``steps/{N}/diagnostics/{check}``) to a NumPy array.
    """

    manifest: dict[str, Any]
    payload: dict[str, np.ndarray] = field(default_factory=dict)


def state_key(step: int, field_name: str) -> str:
    """Canonical payload key for a state field at ``step``."""
    return f"steps/{int(step)}/{STATE}/{field_name}"


def diagnostics_key(step: int, check_name: str) -> str:
    """Canonical payload key for a diagnostic scalar at ``step``."""
    return f"steps/{int(step)}/{DIAGNOSTICS}/{check_name}"


def parse_payload_key(key: str) -> tuple[int, str, str]:
    """Parse a payload key into ``(step, kind, name)``.

    ``kind`` is :data:`STATE` or :data:`DIAGNOSTICS`. Raises ``ValueError``
    on a malformed key.
    """
    parts = key.strip("/").split("/")
    if len(parts) != 4 or parts[0] != "steps" or parts[2] not in (STATE, DIAGNOSTICS):
        raise ValueError(
            f"malformed capture payload key {key!r}; expected "
            f"'steps/{{N}}/{STATE}|{DIAGNOSTICS}/{{name}}'"
        )
    return int(parts[1]), parts[2], parts[3]

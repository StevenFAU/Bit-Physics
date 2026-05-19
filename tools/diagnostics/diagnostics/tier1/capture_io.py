"""Thin layer over the testkit capture format for diagnostic use.

Schema-version policy: diagnostics REJECT capture manifests whose
`schema_version` major exceeds ``SUPPORTED_SCHEMA_MAJOR``. Silently
accepting an unknown future major means running diagnostics against a
payload structure the code doesn't actually understand — a classic
phantom-success failure mode. Minor / patch increments within the
supported major are forward-compatible.
"""

from __future__ import annotations

from collections.abc import Iterator

import numpy as np
from capture import Capture, StepState

SUPPORTED_SCHEMA_MAJOR = 1


class UnsupportedSchemaError(ValueError):
    """Raised when a capture's schema_version is forward-incompatible."""


def enforce_schema_version(capture: Capture) -> None:
    """Reject capture payloads on an unknown future major.

    Raises:
        UnsupportedSchemaError: if the manifest's `schema_version` major
            exceeds ``SUPPORTED_SCHEMA_MAJOR`` or is malformed.
    """
    raw = capture.manifest.schema_version
    try:
        major_str = raw.split(".", 1)[0]
        major = int(major_str)
    except (ValueError, AttributeError) as exc:
        raise UnsupportedSchemaError(f"manifest schema_version {raw!r} is malformed") from exc
    if major > SUPPORTED_SCHEMA_MAJOR:
        raise UnsupportedSchemaError(
            f"manifest schema_version {raw!r} (major {major}) exceeds "
            f"diagnostics-supported major {SUPPORTED_SCHEMA_MAJOR}"
        )


def iter_step_arrays(capture: Capture, field_name: str) -> Iterator[tuple[int, np.ndarray]]:
    """Yield ``(step_number, ndarray)`` pairs for ``field_name`` across all steps.

    Skips steps where the field is absent. Caller decides how to handle
    missing fields (Tier 2 conservation checks treat missing-field as a
    hard failure; the health check is field-agnostic).
    """
    enforce_schema_version(capture)
    for s in capture.steps():
        if field_name in s.state:
            yield s.step, s.state[field_name]


def iter_steps(capture: Capture) -> Iterator[StepState]:
    """Iterate every step, schema-version checked once up front."""
    enforce_schema_version(capture)
    yield from capture.steps()

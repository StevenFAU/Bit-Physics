"""Capture-manifest dataclass + reference-manifest TOML helper (spec § 2.7, § 2.8)."""

from __future__ import annotations

import json
import tomllib
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

_SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schemas"
_CAPTURE_SCHEMA_PATH = _SCHEMA_DIR / "capture-v1.json"
_REFERENCE_MANIFEST_SCHEMA_PATH = _SCHEMA_DIR / "reference-manifest-v1.json"


def _load_schema(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        data: dict[str, Any] = json.load(fh)
    return data


@dataclass
class CaptureManifest:
    """In-memory representation of a capture manifest (spec § 2.7).

    Fields mirror the JSON-Schema definition at
    `tools/testkit/schemas/capture-v1.json` exactly. The dataclass is the
    Python-side handle; serialization round-trips via `to_dict` / `from_dict`.
    """

    schema_version: str
    sim: dict[str, Any]
    stack: dict[str, Any]
    config: dict[str, Any]
    run: dict[str, Any]
    payload: dict[str, Any]
    determinism: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CaptureManifest:
        validate_capture_manifest(data)
        return cls(
            schema_version=data["schema_version"],
            sim=dict(data["sim"]),
            stack=dict(data["stack"]),
            config=dict(data["config"]),
            run=dict(data["run"]),
            payload=dict(data["payload"]),
            determinism=dict(data["determinism"]),
        )


def validate_capture_manifest(data: dict[str, Any]) -> None:
    """Validate a manifest dict against the canonical JSON Schema.

    Raises `jsonschema.ValidationError` on failure.
    """
    schema = _load_schema(_CAPTURE_SCHEMA_PATH)
    Draft202012Validator(schema).validate(data)


def load_reference_manifest(manifest_path: Path) -> dict[str, Any]:
    """Load and schema-validate a vendored-reference TOML manifest (spec § 2.8).

    Returns the parsed manifest dict.
    Raises `jsonschema.ValidationError` if the manifest fails schema validation.
    """
    text = Path(manifest_path).read_text(encoding="utf-8")
    parsed = tomllib.loads(text)
    schema = _load_schema(_REFERENCE_MANIFEST_SCHEMA_PATH)
    Draft202012Validator(schema).validate(parsed)
    return parsed

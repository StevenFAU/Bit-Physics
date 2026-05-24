"""Shared paths + fixtures for sph-water Stack-D acceptance tests.

The Stage 1b implementation will produce a Stack-D canonical capture at
``captures/sph-water-stack-d/<descriptor>.{h5,json}`` where ``<descriptor>``
matches the Phase-1-frozen NumPy-reference descriptor
``dam-break-100K-particles-seed42-step1000`` (probe § 1 + § 5; D4
ratification — full canonical step-1000 horizon). The NumPy-reference capture
at ``captures/sph-water-ref/...`` is the cross-stack equivalence partner
(gate 14; Stage 1c) — NOT a GPU Stack-B/Stack-C capture (probe § 9 F1: the
spec-designated Stack-C Vulkan primary is unimplemented; the frozen diff
partner is the Phase-1 CPU reference).

Tests resolve paths relative to the workspace root regardless of pytest cwd.
"""

from __future__ import annotations

from pathlib import Path

import pytest


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "pyproject.toml").exists() and (parent / "tools" / "testkit").is_dir():
            return parent
    raise RuntimeError(f"could not locate repo root above {here}")


REPO_ROOT = _repo_root()
CANONICAL_DESCRIPTOR = "dam-break-100K-particles-seed42-step1000"

STACK_D_CAPTURE_DIR = REPO_ROOT / "captures" / "sph-water-stack-d"
STACK_D_MANIFEST = STACK_D_CAPTURE_DIR / f"{CANONICAL_DESCRIPTOR}.json"
STACK_D_PAYLOAD = STACK_D_CAPTURE_DIR / f"{CANONICAL_DESCRIPTOR}.h5"

# NumPy-reference (the gate-14 LEFT/reference partner; probe § 9 F1).
REF_CAPTURE_DIR = REPO_ROOT / "captures" / "sph-water-ref"
REF_MANIFEST = REF_CAPTURE_DIR / f"{CANONICAL_DESCRIPTOR}.json"
REF_PAYLOAD = REF_CAPTURE_DIR / f"{CANONICAL_DESCRIPTOR}.h5"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def stack_d_manifest_path() -> Path:
    return STACK_D_MANIFEST


@pytest.fixture(scope="session")
def stack_d_payload_path() -> Path:
    return STACK_D_PAYLOAD


@pytest.fixture(scope="session")
def ref_manifest_path() -> Path:
    return REF_MANIFEST


@pytest.fixture(scope="session")
def ref_payload_path() -> Path:
    return REF_PAYLOAD

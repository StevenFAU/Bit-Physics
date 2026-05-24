"""Manifest-equality regression test (conventions doc § J.7).

§ J.7 documents a project-wide structural property: the ``sim.py`` manifest-builder
layer produces low mutation kill rates because downstream tests rarely equality-test
the manifest's field values, so mutations to those inline literals slip past the
diagnostic-tier test surface. The convention's remedy is a manifest-equality test that
asserts the full manifest dict the runner emits.

This is the **representative-single-sim** realization of that remedy (D11; the
representative-subset artifact class, MPM Stack-D D10). ``lattice-boltzmann-d3q19`` is
chosen because its :func:`sim_runner_diagnostic` builds the ``CaptureManifest``
*inline* (no ``_build_manifest_*`` helper) — the purest instance of the
inline-field-literal class § J.7 targets — and the diagnostic tier is a fast,
pure-NumPy 16x8 / 50-step run.

**Strategy (i) discipline (D10).** This test invokes the *existing*
``sim_runner_diagnostic`` and asserts on the manifest it already emits (the ``.json``
sidecar ``write_capture`` writes). It introduces NO public ``build_manifest()`` and
edits NO sim source — it is a new, additive test file only.

Volatile fields excluded from the literal lock, per the content-equivalent contract
(spec § 2.5; § J.7 / R-T2): ``run.wall_clock_seconds`` (real elapsed time, patched in
after ``write_capture``) and ``payload.checksum`` (the sha256 of the ``.h5`` payload —
asserting a fixed value would be the raw-file-byte-equality anti-pattern § F.3 warns
against; its shape is checked instead). A second test asserts run-to-run manifest
stability (the deterministic subset, including the checksum, must match across two
invocations on the same host).

This test LOCKS the manifest's current emitted values, including the cosmetically
hardcoded ``descriptor`` / ``payload.path`` (``poiseuille-16x8-seed42-step50``). The
LBM ``sim_runner_diagnostic`` cosmetic-descriptor interpolation stays BANKED (D6); were
it ever unbanked, that sealed-source change and this test would update together.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from lattice_boltzmann_d3q19.sim import (  # type: ignore[import-not-found]
    CANONICAL_NZ,
    CANONICAL_TAU,
    sim_runner_diagnostic,
)

_CHECKSUM_RE = re.compile(r"^sha256:[0-9a-f]{64}$")


def _expected_manifest() -> dict:
    """The full diagnostic manifest minus the two volatile fields.

    Numeric params are sourced from the module constants (``CANONICAL_TAU``,
    ``CANONICAL_NZ``) rather than hardcoded magic numbers; the remaining literals
    mirror the inline ``CaptureManifest`` in ``sim_runner_diagnostic``.
    """
    return {
        "schema_version": "1.0.0",
        "sim": {
            "name": "lattice-boltzmann-d3q19",
            "category": "lattice",
            "variant": "bgk-d3q19-qian-1992",
        },
        "stack": {
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-lattice-boltzmann-d3q19",
        },
        "config": {
            "tier": "diagnostic",
            "dims": [16, 8, CANONICAL_NZ],
            "dtype": "f64",
            "seed": 42,
            "params": {
                "descriptor": "poiseuille-16x8-seed42-step50",
                "tau": CANONICAL_TAU,
                "force_x_lattice": 1.0e-5,
                "nz_convention": "depth-3-z-periodic-slab",
                "boundary": "bounce-back-y-walls-periodic-xz",
            },
        },
        "run": {
            "step_count": 50,
            "capture_interval": 10,
            "start_utc": "2026-05-22T00:00:00Z",
        },
        "payload": {
            "format": "hdf5",
            "path": "poiseuille-16x8-seed42-step50.h5",
        },
        "determinism": {
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    }


def _load_manifest(path: Path) -> dict:
    with path.open() as fh:
        manifest: dict = json.load(fh)
    return manifest


def test_diagnostic_manifest_fields_locked(tmp_path: Path) -> None:
    """The full emitted manifest equals the expected literals (§ J.7).

    Mutating any inline manifest field value in ``sim_runner_diagnostic`` would
    change the emitted ``.json`` and fail this assertion — the manifest-builder
    kill-rate-floor mitigation § J.7 calls for.
    """
    manifest_path = sim_runner_diagnostic(seed=42, out_dir=tmp_path)
    manifest = _load_manifest(manifest_path)

    # Volatile fields: shape-check, then exclude from the literal lock.
    wall_clock = manifest["run"].pop("wall_clock_seconds")
    checksum = manifest["payload"].pop("checksum")
    assert isinstance(wall_clock, (int, float)) and wall_clock >= 0.0
    assert _CHECKSUM_RE.match(checksum), f"malformed payload.checksum: {checksum!r}"

    assert manifest == _expected_manifest()


def test_diagnostic_manifest_run_to_run_stable(tmp_path: Path) -> None:
    """The deterministic manifest subset (incl. payload.checksum) is identical
    across two invocations on the same host — wall_clock_seconds excepted."""
    m1 = _load_manifest(sim_runner_diagnostic(seed=42, out_dir=tmp_path / "run1"))
    m2 = _load_manifest(sim_runner_diagnostic(seed=42, out_dir=tmp_path / "run2"))
    m1["run"].pop("wall_clock_seconds")
    m2["run"].pop("wall_clock_seconds")
    assert m1 == m2

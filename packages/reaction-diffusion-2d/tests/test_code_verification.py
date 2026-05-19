"""Class (a) — Code verification (plan § 7.8 item 4a).

The canonical capture's per-step state matches a fresh NumPy reference
run at the canonical seed + parameters within
``rtol=1e-4, atol=1e-6`` (spec § 6 verification posture).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from capture import diff_captures, load_capture

CANONICAL_DESCRIPTOR = "gray-scott-lambda-128sq-seed42-step2000"


def _load_sim() -> object:
    """Deferred import — module is missing on the failing-tests commit."""
    from reaction_diffusion_2d import sim  # type: ignore[attr-defined]

    return sim


def test_canonical_capture_exists(canonical_manifest_path: Path) -> None:
    assert canonical_manifest_path.exists(), (
        f"canonical capture manifest missing at {canonical_manifest_path}"
    )


def test_canonical_capture_matches_numpy_reference(
    tmp_path: Path, canonical_manifest_path: Path
) -> None:
    """Element-wise diff at rtol=1e-4 / atol=1e-6 against fresh NumPy reference."""
    sim = _load_sim()
    reference_manifest = sim.sim_runner_seeded(seed=42, out_dir=tmp_path)  # type: ignore[attr-defined]
    diff = diff_captures(
        canonical_manifest_path,
        reference_manifest,
        mode="epsilon",
        rtol=1e-4,
        atol=1e-6,
    )
    cap = 1e-6 + 1e-4 * max(abs(_max_abs(canonical_manifest_path)), 1.0)
    assert diff.max_abs_err <= cap, (
        f"max_abs_err={diff.max_abs_err}, "
        f"max_rel_err={diff.max_rel_err}, "
        f"mismatched={diff.mismatched_fields}"
    )


def test_canonical_descriptor_matches_filename(
    canonical_manifest_path: Path,
) -> None:
    assert canonical_manifest_path.name == f"{CANONICAL_DESCRIPTOR}.json"


def _max_abs(manifest_path: Path) -> float:
    capture = load_capture(manifest_path)
    mx = 0.0
    for step in capture.steps():
        for arr in step.state.values():
            mx = max(mx, float(np.max(np.abs(arr))))
    return mx

"""Class (a) — Code verification (capture-round-trip vs NumPy reference).

The committed canonical capture's per-step spin state matches a fresh
NumPy reference run at the canonical seed + parameters bit-for-bit (the
canonical capture is produced by the same ``sim_runner_seeded`` oracle;
both are deterministic int8 spin fields, so the comparison is
bit-exact). Mirrors
``packages/reaction-diffusion-2d/tests/test_code_verification.py:32-50``.

Stage 1a: ``sim_runner_seeded`` raises ``NotImplementedError`` and the
canonical capture does not exist yet (``FileNotFoundError``). Stage 1b
inverts to GREEN.
"""

from __future__ import annotations

from pathlib import Path

from capture import diff_captures, load_capture

CANONICAL_DESCRIPTOR = "metropolis-128sq-T2.27-seed42-step10000"


def _load_sim() -> object:
    from ising_classical import sim

    return sim


def test_canonical_capture_exists(canonical_manifest_path: Path) -> None:
    # load_capture raises FileNotFoundError when the manifest/payload is
    # absent (allowed Stage-1a RED mode — "no captures yet").
    capture = load_capture(canonical_manifest_path)
    assert capture is not None


def test_canonical_capture_matches_numpy_reference(
    tmp_path: Path, canonical_manifest_path: Path
) -> None:
    """Bit-exact diff against a fresh NumPy reference run at seed 42."""
    sim = _load_sim()
    reference_manifest = sim.sim_runner_seeded(seed=42, out_dir=tmp_path)  # type: ignore[attr-defined]
    diff = diff_captures(canonical_manifest_path, reference_manifest, mode="bit-exact")
    assert diff.bit_exact, f"max_abs_err={diff.max_abs_err}, mismatched={diff.mismatched_fields}"


def test_canonical_descriptor_matches_filename(canonical_manifest_path: Path) -> None:
    assert canonical_manifest_path.name == f"{CANONICAL_DESCRIPTOR}.json"

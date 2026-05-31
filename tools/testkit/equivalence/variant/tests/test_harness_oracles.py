"""Oracle-grounded mutation-hardening tests for ``equivalence.variant.harness``.

Phase-4.1 foundation-hardening pass (`docs/_audits/phase-4/foundation-hardening-*.md`).
Every assertion is grounded in a hand-computed norm/threshold value or the
documented matched-time semantics — NEVER a snapshot of the code's output. The
existing ``test_compare.py`` exercises only ``relative_tol=0.0``, the L2/Linf
norms, and step-index frame matching; these tests pin the previously-unexercised
surface: the ``relative_tol * ||ref||`` threshold term, the Wasserstein branch,
the ``time`` / ``sim_time`` diagnostic frame-matching, nearest-time selection,
the empty-tolerances guard, and the named-missing-in-variant branch.
"""

from __future__ import annotations

import numpy as np
import pytest
from common_warp.capture import write_frames_capture

from equivalence.variant import VariantToleranceSpec, compare_captures


def _manifest(descriptor: str, n: int, schema: str = "1.1.0") -> dict:
    return {
        "schema_version": schema,
        "sim": {"name": "variant-oracle", "category": "test", "variant": "ref"},
        "stack": {"name": "numpy-reference", "version": "0.0.0", "build_id": "wu-f"},
        "config": {"tier": "test", "dims": [4], "dtype": "f64", "seed": 0, "params": {}},
        "run": {
            "step_count": n,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-30T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }


def _write(tmp_path, name, frames, n, schema="1.1.0") -> str:
    return str(write_frames_capture(frames, _manifest(name, n, schema), tmp_path))


# ----------------------------------------------------------------------------
# Threshold = absolute_tol + relative_tol * ||ref||  (the relative term).
# ----------------------------------------------------------------------------


def test_relative_tolerance_threshold_uses_ref_norm() -> None:
    """threshold = abs + rel * ||ref||_2 — hand-computed boundary.

    ref = [3, 4, 0, 0] → ||ref||_2 = 5. variant differs by [0.3, 0.4, 0, 0] →
    error ||diff||_2 = 0.5. With abs=0, rel=0.11: threshold = 0.55 > 0.5 → passes.
    With rel=0.05: threshold = 0.25 < 0.5 → fails. This pins the
    ``relative_tol * ref_norm`` term (a mutation dropping ref_norm, or turning
    ``*`` into ``+``, flips the verdict: ``rel + ref_norm`` would be ~5 in both
    cases, so both would pass).
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref_arr = np.array([3.0, 4.0, 0.0, 0.0])
    var_arr = np.array([3.3, 4.4, 0.0, 0.0])  # diff = [0.3, 0.4] → L2 = 0.5
    ref = _write(tmp / "r", "ref", [(0, {"f": ref_arr}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"f": var_arr}, {})], 1)

    spec_pass = VariantToleranceSpec(
        output_name="f", absolute_tol=0.0, relative_tol=0.11, norm="L2"
    )
    rep_pass = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec_pass], at_sim_time=0.0
    )
    assert rep_pass.per_output_errors["f"] == pytest.approx(0.5)
    assert rep_pass.passed  # error 0.5 <= threshold 0.11*5 = 0.55

    spec_fail = VariantToleranceSpec(
        output_name="f", absolute_tol=0.0, relative_tol=0.05, norm="L2"
    )
    rep_fail = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec_fail], at_sim_time=0.0
    )
    assert not rep_fail.passed  # error 0.5 > threshold 0.05*5 = 0.25


def test_absolute_plus_relative_additivity() -> None:
    """threshold = absolute_tol + relative_tol * ||ref|| (both terms add).

    ref = [3, 4] → ||ref||_2 = 5; error = 0.5. abs=0.3, rel=0.05 → threshold =
    0.3 + 0.25 = 0.55 > 0.5 → passes; abs alone (0.3) or rel alone (0.25) would
    fail. Kills a mutation that drops either summand.
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(tmp / "r", "ref", [(0, {"f": np.array([3.0, 4.0])}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"f": np.array([3.3, 4.4])}, {})], 1)
    spec = VariantToleranceSpec(output_name="f", absolute_tol=0.3, relative_tol=0.05, norm="L2")
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=0.0
    )
    assert rep.per_output_errors["f"] == pytest.approx(0.5)
    assert rep.passed  # 0.5 <= 0.3 + 0.05*5 = 0.55


# ----------------------------------------------------------------------------
# Norm choices — hand-computed L2, Linf, Wasserstein errors.
# ----------------------------------------------------------------------------


def test_linf_norm_is_max_abs_diff() -> None:
    """Linf error = max |ref - var| (hand-computed)."""
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(tmp / "r", "ref", [(0, {"f": np.array([1.0, 2.0, 3.0])}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"f": np.array([1.0, 2.0, 3.7])}, {})], 1)
    spec = VariantToleranceSpec(output_name="f", absolute_tol=0.0, relative_tol=0.0, norm="Linf")
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=0.0
    )
    assert rep.per_output_errors["f"] == pytest.approx(0.7)  # max(|0|,|0|,|0.7|)


def test_wasserstein_distance_branch() -> None:
    """Wasserstein-1 distance between a 0-mass and a 1-mass uniform = 1.0.

    ref = [0,0,0,0], var = [1,1,1,1] — every unit of mass moves distance 1, so
    W1 = 1.0 (scipy ``wasserstein_distance``). ref_norm = max|ref| = 0, so
    threshold = absolute_tol. abs=1.5 → passes; abs=0.5 → fails. Pins the
    Wasserstein branch (untested by ``test_compare.py``).
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(tmp / "r", "ref", [(0, {"f": np.zeros(4)}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"f": np.ones(4)}, {})], 1)
    spec_pass = VariantToleranceSpec(
        output_name="f", absolute_tol=1.5, relative_tol=0.0, norm="wasserstein"
    )
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec_pass], at_sim_time=0.0
    )
    assert rep.per_output_errors["f"] == pytest.approx(1.0)
    assert rep.passed
    spec_fail = VariantToleranceSpec(
        output_name="f", absolute_tol=0.5, relative_tol=0.0, norm="wasserstein"
    )
    rep_fail = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec_fail], at_sim_time=0.0
    )
    assert not rep_fail.passed


# ----------------------------------------------------------------------------
# Frame matching — time / sim_time diagnostic vs step index; nearest selection.
# ----------------------------------------------------------------------------


def test_frame_matching_uses_time_diagnostic_not_step() -> None:
    """When a ``time`` diagnostic is present it (not the step index) keys the match.

    Frames: step0@time=100 density=5, step1@time=200 density=5 (ref) vs density=99
    at step1 (var). At at_sim_time=100, time-matching selects step0 (both density
    5 → error 0 → pass). Step-index matching would select step1 (index 1 nearest
    to 100 → ref 5 vs var 99 → fail). ``passed is True`` ⇒ the time branch is live.
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(
        tmp / "r",
        "ref",
        [
            (0, {"d": np.array([5.0])}, {"time": 100.0}),
            (1, {"d": np.array([5.0])}, {"time": 200.0}),
        ],
        2,
    )
    var = _write(
        tmp / "v",
        "var",
        [
            (0, {"d": np.array([5.0])}, {"time": 100.0}),
            (1, {"d": np.array([99.0])}, {"time": 200.0}),
        ],
        2,
    )
    spec = VariantToleranceSpec(output_name="d", absolute_tol=1e-9, relative_tol=0.0, norm="L2")
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=100.0
    )
    assert rep.per_output_errors["d"] == pytest.approx(0.0)
    assert rep.passed


def test_frame_matching_falls_back_to_sim_time() -> None:
    """With no ``time`` but a ``sim_time`` diagnostic, ``sim_time`` keys the match.

    Mirrors the ``time`` test so it distinguishes sim_time-matching from the
    step-index fallback: at at_sim_time=100, sim_time-matching selects step0
    (both density 5 → error 0 → pass); step-index matching would select step1
    (index 1 nearest to 100 → ref 5 vs var 99 → fail). ``passed is True`` ⇒ the
    sim_time branch is live.
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(
        tmp / "r",
        "ref",
        [
            (0, {"d": np.array([5.0])}, {"sim_time": 100.0}),
            (1, {"d": np.array([5.0])}, {"sim_time": 200.0}),
        ],
        2,
    )
    var = _write(
        tmp / "v",
        "var",
        [
            (0, {"d": np.array([5.0])}, {"sim_time": 100.0}),
            (1, {"d": np.array([99.0])}, {"sim_time": 200.0}),
        ],
        2,
    )
    spec = VariantToleranceSpec(output_name="d", absolute_tol=1e-9, relative_tol=0.0, norm="L2")
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=100.0
    )
    assert rep.per_output_errors["d"] == pytest.approx(0.0)
    assert rep.passed


def test_pass_criterion_is_inclusive_at_threshold() -> None:
    """The per-output pass criterion is ``error <= threshold`` (inclusive).

    Construct error EXACTLY equal to threshold: ref=[0], var=[0.5], abs=0.5,
    rel=0, Linf → error = 0.5 == threshold 0.5. ``<=`` passes; the ``<`` mutation
    fails. Pins the boundary inclusivity.
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(tmp / "r", "ref", [(0, {"f": np.array([0.0])}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"f": np.array([0.5])}, {})], 1)
    spec = VariantToleranceSpec(output_name="f", absolute_tol=0.5, relative_tol=0.0, norm="Linf")
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=0.0
    )
    assert rep.per_output_errors["f"] == pytest.approx(0.5)
    assert rep.passed  # error 0.5 <= threshold 0.5 (inclusive)


def test_empty_field_linf_error_is_zero() -> None:
    """An empty (size-0) field yields Linf error 0.0 (the documented fallback).

    Pins ``float(np.max(np.abs(diff))) if diff.size else 0.0``: the mutated
    fallback ``1.0`` would make an empty-field comparison exceed a 0.5 budget.
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(tmp / "r", "ref", [(0, {"f": np.zeros(0)}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"f": np.zeros(0)}, {})], 1)
    spec = VariantToleranceSpec(output_name="f", absolute_tol=0.5, relative_tol=0.0, norm="Linf")
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=0.0
    )
    assert rep.per_output_errors["f"] == 0.0
    assert rep.passed


def test_nearest_time_selection_picks_closest_frame() -> None:
    """``_state_at_time`` selects the frame whose time is nearest at_sim_time.

    Times {10, 20, 30}; at_sim_time=21 → nearest is 20 (density 200), not 30. The
    matched ref/var differ only at time=20, so a non-zero error confirms the
    nearest-by-abs selection picked time=20.
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    frames_ref = [
        (0, {"d": np.array([100.0])}, {"time": 10.0}),
        (1, {"d": np.array([200.0])}, {"time": 20.0}),
        (2, {"d": np.array([300.0])}, {"time": 30.0}),
    ]
    frames_var = [
        (0, {"d": np.array([100.0])}, {"time": 10.0}),
        (1, {"d": np.array([201.0])}, {"time": 20.0}),
        (2, {"d": np.array([300.0])}, {"time": 30.0}),
    ]
    ref = _write(tmp / "r", "ref", frames_ref, 3)
    var = _write(tmp / "v", "var", frames_var, 3)
    spec = VariantToleranceSpec(output_name="d", absolute_tol=0.0, relative_tol=0.0, norm="Linf")
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=21.0
    )
    assert rep.per_output_errors["d"] == pytest.approx(1.0)  # |200 - 201| at time=20


# ----------------------------------------------------------------------------
# compare_captures verdict assembly — empty guard, missing-in-variant, skipped.
# ----------------------------------------------------------------------------


def test_no_tolerances_is_not_vacuously_passed() -> None:
    """With zero tolerances, ``passed`` is False (not vacuously True).

    ``passed = bool(per_output_passed) and all(...)`` — the empty-dict guard
    means "nothing was checked" is NOT a pass. Kills a mutation dropping the
    ``bool(per_output_passed)`` guard (``all([]) == True``).
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(tmp / "r", "ref", [(0, {"f": np.zeros(4)}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"f": np.zeros(4)}, {})], 1)
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[], at_sim_time=0.0
    )
    assert rep.per_output_passed == {}
    assert not rep.passed


def test_named_field_missing_in_variant_raises() -> None:
    """A tolerance naming a field absent from the *variant* capture raises ValueError.

    ``test_compare.py`` only covers missing-in-reference; this pins the
    missing-in-variant branch.
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(tmp / "r", "ref", [(0, {"velocity": np.zeros(4)}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"density": np.zeros(4)}, {})], 1)
    spec = VariantToleranceSpec(
        output_name="velocity", absolute_tol=1.0, relative_tol=0.0, norm="L2"
    )
    with pytest.raises(ValueError, match="absent from the variant"):
        compare_captures(
            reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=0.0
        )


def test_skipped_fields_are_unnamed_symmetric_difference() -> None:
    """Fields present in only one capture and not named by a tolerance are skipped.

    ref has {density, only_ref}; var has {density, only_var}. Naming only
    ``density`` → skipped = sorted(symmetric difference) = [only_ref, only_var].
    """
    import tempfile
    from pathlib import Path

    tmp = Path(tempfile.mkdtemp())
    ref = _write(tmp / "r", "ref", [(0, {"density": np.zeros(4), "only_ref": np.zeros(2)}, {})], 1)
    var = _write(tmp / "v", "var", [(0, {"density": np.zeros(4), "only_var": np.zeros(2)}, {})], 1)
    spec = VariantToleranceSpec(
        output_name="density", absolute_tol=1e-9, relative_tol=0.0, norm="L2"
    )
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=0.0
    )
    assert rep.skipped_fields == ["only_ref", "only_var"]

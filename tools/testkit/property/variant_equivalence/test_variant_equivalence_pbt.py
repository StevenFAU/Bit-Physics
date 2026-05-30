"""Phase-4 WU-F property-based tests (spec §2.14; plan §7.7 v9 addendum).

- ``identity_variant_passes`` — a variant whose output equals the parent's passes
  the harness (PASS) for any tolerance.
- ``tolerance_monotone`` — widening a tolerance never converts a PASS into a FAIL.
"""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

_SETTINGS = settings(max_examples=25, deadline=None, suppress_health_check=[HealthCheck.too_slow])


def _manifest(descriptor: str, n: int) -> dict:
    return {
        "schema_version": "1.1.0",
        "sim": {"name": "variant-pbt", "category": "test", "variant": "ref"},
        "stack": {"name": "numpy-reference", "version": "0.0.0", "build_id": "wu-f-pbt"},
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


def _write(out_dir, name, arrays):
    from common_warp.capture import write_frames_capture

    frames = [(k, {"u": arrays[k]}, {}) for k in range(len(arrays))]
    return str(write_frames_capture(frames, _manifest(name, len(arrays)), out_dir))


@_SETTINGS
@given(
    seed=st.integers(0, 2**31 - 1),
    abs_tol=st.floats(0.0, 10.0),
    norm=st.sampled_from(["L2", "Linf", "wasserstein"]),
)
def test_identity_variant_passes(seed, abs_tol, norm, tmp_path_factory) -> None:
    from equivalence.variant import VariantToleranceSpec, compare_captures

    rng = np.random.default_rng(seed)
    arrays = [rng.uniform(-3, 3, (4,)) for _ in range(3)]
    d = tmp_path_factory.mktemp("ident")
    ref = _write(d / "r", "ref", arrays)
    var = _write(d / "v", "var", arrays)  # identical
    spec = VariantToleranceSpec(output_name="u", absolute_tol=abs_tol, relative_tol=0.0, norm=norm)
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=1.0
    )
    assert rep.passed
    assert rep.per_output_errors["u"] == 0.0


@_SETTINGS
@given(seed=st.integers(0, 2**31 - 1), t_low=st.floats(0.0, 1.0), widen=st.floats(0.0, 5.0))
def test_tolerance_monotone(seed, t_low, widen, tmp_path_factory) -> None:
    from equivalence.variant import VariantToleranceSpec, compare_captures

    rng = np.random.default_rng(seed)
    ref_arrays = [rng.uniform(-2, 2, (4,)) for _ in range(3)]
    var_arrays = [a + rng.uniform(-1, 1, (4,)) for a in ref_arrays]
    d = tmp_path_factory.mktemp("mono")
    ref = _write(d / "r", "ref", ref_arrays)
    var = _write(d / "v", "var", var_arrays)

    def _passed(abs_tol: float) -> bool:
        spec = VariantToleranceSpec(
            output_name="u", absolute_tol=abs_tol, relative_tol=0.0, norm="L2"
        )
        return compare_captures(
            reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=1.0
        ).passed

    if _passed(t_low):
        assert _passed(t_low + widen)  # widening never flips PASS -> FAIL

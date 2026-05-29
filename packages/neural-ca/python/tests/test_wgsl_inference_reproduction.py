"""Gate-3 / gate-13 RED (Stage 1a): WGSL B-inference reproduction.

The Stack-B WGSL inference runs on a GPU host LOCALLY (spec § 7.8) and writes a
committed capture; CI never runs WGSL. This test is the CI-visible reproduction
check (``test-neural-ca-infer``): it loads the converted checkpoint weights,
re-runs the pure-NumPy NCA forward oracle, and asserts it reproduces the
committed WGSL B-inference capture to a tolerance — the ising
pytest-against-committed-capture + NumPy-oracle precedent.

RED at Stage 1a (the oracle + conversion raise ``NotImplementedError`` and the
committed capture does not yet exist); GREEN at Stage 1b-B.
"""

from __future__ import annotations

import h5py
import numpy as np

from neural_ca.convert_checkpoint import load_wgsl_weights
from neural_ca.reference import nca_forward_numpy

from .conftest import B_INFERENCE_CAPTURE, WGSL_BUFFER, WGSL_LAYOUT

# WGSL f32 vs NumPy f32 share the same algorithm and the same weights, so the
# NumPy oracle reproduces the committed WGSL capture to a tight absolute
# tolerance (conv-reduction order is the only divergence source). MEASURED and
# LOCKED at Stage 1b-B.
WGSL_REPRO_ABS_TOL = 1e-4


def test_numpy_oracle_reproduces_committed_wgsl_capture() -> None:
    weights = load_wgsl_weights(WGSL_BUFFER, WGSL_LAYOUT)

    with h5py.File(B_INFERENCE_CAPTURE, "r") as f:
        committed = np.asarray(f["frames"][:], dtype=np.float32)

    n_frames, h, _w, _ = committed.shape
    oracle = nca_forward_numpy(weights, grid_size=h, steps=n_frames - 1, seed=42)

    assert oracle.shape == committed.shape
    max_abs = float(np.max(np.abs(oracle - committed)))
    assert max_abs <= WGSL_REPRO_ABS_TOL, (
        f"NumPy oracle diverges from committed WGSL capture: max_abs {max_abs} "
        f"> {WGSL_REPRO_ABS_TOL}"
    )

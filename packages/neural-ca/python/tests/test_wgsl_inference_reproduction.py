"""Gate-3 / gate-13 (Stage 1b-B): WGSL B-inference reproduction.

The Stack-B WGSL inference runs on a GPU host LOCALLY (spec § 7.8) and writes a
committed capture; CI never runs WGSL. This is the CI-visible reproduction check
(``test-neural-ca-infer``): it loads the converted checkpoint weights, re-runs
the pure-NumPy NCA forward oracle (which shares the WGSL's PCG fire-mask RNG),
and asserts it reproduces the committed WGSL B-inference capture to a tolerance
— the ising pytest-against-committed-capture + NumPy-oracle precedent.

MEASURED (Stage 1b-B): the oracle reproduces the GPU capture to max_abs_diff =
3.5e-6 over 1000 steps (the PCG fire masks are bit-identical; the only divergence
is GPU-vs-CPU f32 conv-reduction order). The tolerance is kept generous (1e-4) for
CI-CPU/BLAS variance headroom.
"""

from __future__ import annotations

import numpy as np
from capture import load_capture

from neural_ca.convert_checkpoint import load_wgsl_weights
from neural_ca.reference import nca_forward_numpy

from .conftest import B_INFERENCE_CAPTURE, WGSL_BUFFER, WGSL_LAYOUT

# Generous bound vs the measured 3.5e-6 (CI-CPU/BLAS headroom).
WGSL_REPRO_ABS_TOL = 1e-4
_GRID = 64
_STEPS = 1000
_SEED = 42
_CAPTURE_EVERY = 50


def test_numpy_oracle_reproduces_committed_wgsl_capture() -> None:
    weights = load_wgsl_weights(WGSL_BUFFER, WGSL_LAYOUT)

    cap = load_capture(B_INFERENCE_CAPTURE.with_suffix(".json"))
    committed = {s.step: np.asarray(s.state["rgba"], dtype=np.float32) for s in cap.steps()}

    oracle = nca_forward_numpy(
        weights, grid_size=_GRID, steps=_STEPS, seed=_SEED, capture_every=_CAPTURE_EVERY
    )

    steps = sorted(committed)
    assert len(steps) == oracle.shape[0], "frame count mismatch oracle vs committed WGSL capture"

    max_abs = max(float(np.max(np.abs(oracle[i] - committed[s]))) for i, s in enumerate(steps))
    assert max_abs <= WGSL_REPRO_ABS_TOL, (
        f"NumPy oracle diverges from committed WGSL capture: max_abs {max_abs:.2e} "
        f"> {WGSL_REPRO_ABS_TOL}"
    )

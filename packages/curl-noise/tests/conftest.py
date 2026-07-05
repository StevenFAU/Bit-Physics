"""Shared fixtures — the canonical run is expensive (2-run witness), so
it is computed once per session."""

from __future__ import annotations

import numpy as np
import pytest

from curl_noise.reference.curlnoise import run_canonical


@pytest.fixture(scope="session")
def canonical_result():
    return run_canonical(42)


@pytest.fixture(scope="session")
def probe_points():
    rng = np.random.default_rng(7)
    return rng.uniform(-3.0, 3.0, size=(300, 3))

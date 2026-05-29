"""Class (c) — Property-based invariants (spec § 2.14; ≥ 2 per § 6.0 item 7).

Two invariants per charter § 6 D-DET:

1. ``field_values_bounded`` (regime-scoped) — at every step the full cell state
   is FINITE and the visible (clamped) RGBA ∈ [0, 1]. NOT all-16-channels ∈
   [0, 1] (the hidden channels drift by design — RE-DECLARED on evidence, see
   ``tools/testkit/property/sims/neural_ca/invariants.py``).
2. ``inference_determinism`` — same weights + seed + input → bit-exact output
   across two runs (the foundation for the D↔B statistical cross-stack gate).

Both exercise the TRAINED canonical checkpoint over seed-sampled short rollouts
(``n_examples = 20`` per the Phase-3 budget).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from property.harness import run_invariants
from property.sims.neural_ca import field_values_bounded
from property.strategies import random_seed

from neural_ca import run_inference
from neural_ca.model import NCAConfig, NCAModel
from neural_ca.pbt import CANONICAL_CHECKPOINT, sim_runner_pbt

pytestmark = pytest.mark.skipif(
    not CANONICAL_CHECKPOINT.exists(),
    reason="canonical checkpoint not present (run `python -m neural_ca train`)",
)


def test_pbt_field_values_bounded(tmp_path: Path) -> None:
    verdict = run_invariants(
        sim_runner_pbt,
        [field_values_bounded()],
        strategy=random_seed(),
        n_examples=20,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed, [(r.invariant, r.detail, r.counter_example) for r in verdict.results]


@settings(max_examples=20, deadline=None)
@given(seed=st.integers(min_value=0, max_value=2**31 - 1))
def test_pbt_inference_determinism(seed: int) -> None:
    from safetensors.torch import load_file

    model = NCAModel(NCAConfig(grid_size=28))
    model.load_state_dict(load_file(str(CANONICAL_CHECKPOINT)))
    a = run_inference(model, grid_size=28, steps=16, seed=seed, capture_every=8)
    b = run_inference(model, grid_size=28, steps=16, seed=seed, capture_every=8)
    assert np.array_equal(a, b), f"inference not bit-exact run-to-run at seed {seed}"

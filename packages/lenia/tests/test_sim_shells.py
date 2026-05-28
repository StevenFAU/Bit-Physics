"""Stage 1b — LeniaSim contract tests (rewritten from Stage-1a shell asserts).

Stage 1a committed shell-contract tests asserting
``pytest.raises(NotImplementedError)``; Stage 1b replaces those with
production-behavior assertions. The friction surfaced at Stage 1a §5
#3 is realized here.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np


def _load_sim_module() -> object:
    import lenia  # type: ignore[attr-defined]

    return lenia


def test_lenia_config_is_constructible_with_defaults() -> None:
    lenia = _load_sim_module()
    config = lenia.LeniaConfig()
    assert config.preset == "orbium-unicaudatus"
    assert config.grid == 64
    assert config.R == 13
    assert config.seed == 42
    assert config.steps == 100
    assert config.mu == 0.15
    assert config.sigma == 0.015
    assert config.T == 10


def test_lenia_sim_initial_field_is_bounded() -> None:
    """LeniaSim initialization produces a field in [0, 1] at the configured grid."""
    lenia = _load_sim_module()
    config = lenia.LeniaConfig(seed=42, grid=32, steps=2)
    sim = lenia.LeniaSim(config)
    field0 = sim.field()
    assert field0.shape == (32, 32)
    assert field0.dtype == np.float64
    assert float(np.min(field0)) >= 0.0
    assert float(np.max(field0)) <= 1.0


def test_lenia_sim_step_advances_field() -> None:
    """One step changes the field (not a no-op shell)."""
    lenia = _load_sim_module()
    config = lenia.LeniaConfig(seed=42, grid=32, steps=1)
    sim = lenia.LeniaSim(config)
    field0 = sim.field()
    sim.step()
    field1 = sim.field()
    # Field must remain bounded.
    assert float(np.min(field1)) >= 0.0
    assert float(np.max(field1)) <= 1.0
    # Field must actually change under a non-trivial growth step
    # (Orbium preset has |G| in [-1, 1], dt=0.1; small but non-zero
    # delta expected over the non-uniform IC).
    assert not np.array_equal(field0, field1)


def test_lenia_sim_capture_produces_manifest(tmp_path: Path) -> None:
    """capture() writes a manifest + payload pair and returns the manifest path."""
    lenia = _load_sim_module()
    config = lenia.LeniaConfig(seed=42, grid=16, steps=3)
    sim = lenia.LeniaSim(config)
    manifest_path = sim.capture(tmp_path)
    assert manifest_path.exists()
    assert manifest_path.suffix == ".json"
    # Payload sibling
    payload_path = manifest_path.with_suffix(".h5")
    assert payload_path.exists()

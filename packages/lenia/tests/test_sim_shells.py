"""Stage 1a RED tests — LeniaSim shell + config.

``LeniaConfig`` is a dataclass landed at Stage 1a so the test suite
can import it; ``LeniaSim.__init__`` records the config; every other
method raises ``NotImplementedError``. Stage 1b lands the Taichi-backed
implementation.
"""

from __future__ import annotations

from pathlib import Path


def _load_sim_module() -> object:
    """Deferred import — module imports cleanly at Stage 1a (shells)."""
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


def test_lenia_sim_step_raises_not_implemented() -> None:
    lenia = _load_sim_module()
    sim = lenia.LeniaSim(lenia.LeniaConfig())
    import pytest

    with pytest.raises(NotImplementedError, match="Stage 1b"):
        sim.step()


def test_lenia_sim_field_raises_not_implemented() -> None:
    lenia = _load_sim_module()
    sim = lenia.LeniaSim(lenia.LeniaConfig())
    import pytest

    with pytest.raises(NotImplementedError, match="Stage 1b"):
        sim.field()


def test_lenia_sim_capture_raises_not_implemented(tmp_path: Path) -> None:
    lenia = _load_sim_module()
    sim = lenia.LeniaSim(lenia.LeniaConfig())
    import pytest

    with pytest.raises(NotImplementedError, match="Stage 1b"):
        sim.capture(tmp_path)

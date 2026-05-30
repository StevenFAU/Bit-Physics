"""``TrainingLoop`` tests — the finite-difference reference optimiser genuinely
reduces render MSE / raises PSNR on a globally-recoverable appearance target.

The default optimiser fits a global DC-colour + opacity-logit offset (§0.3 SHIFT
documented in ``training.py``); the target here is reachable by exactly such a
global shift, so a correct loop drives the loss down.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from common_3dgs import Camera, GaussianSplatModel, TrainingHistory, TrainingLoop

K = 16
_C0 = 0.28209479177387814


def _scene(dc_offset: float = 0.0, opacity: float = 0.8) -> GaussianSplatModel:
    n = 3
    sh = np.zeros((n, K, 3), np.float32)
    base = (np.asarray([0.6, 0.4, 0.2], np.float32) - 0.5) / _C0
    sh[:, 0, :] = base + dc_offset
    return GaussianSplatModel(
        np.asarray([[-0.4, 0.0, 0.0], [0.4, 0.0, 0.0], [0.0, 0.3, 0.0]], np.float32),
        np.full((n, 3), 0.18, np.float32),
        np.tile(np.asarray([1.0, 0.0, 0.0, 0.0], np.float32), (n, 1)),
        np.full((n,), opacity, np.float32),
        sh,
    )


def _cam() -> Camera:
    return Camera.look_at(
        (0.0, 0.0, 3.0), (0.0, 0.0, 0.0), fov_y=math.radians(50.0), image_height=24, image_width=24
    )


def _target() -> np.ndarray:
    from common_3dgs import render

    return render(_scene(), _cam(), background=(0.0, 0.0, 0.0))


def test_fit_reduces_loss_and_raises_psnr() -> None:
    target = _target()
    perturbed = _scene(dc_offset=0.3, opacity=0.5)
    loop = TrainingLoop(
        model=perturbed, optimizer="adam", lr_color=0.06, lr_opacity=0.15, max_iter=40
    )
    history = loop.fit(train_views=[(_cam(), target)])
    assert history.iter_count == 40
    assert len(history.losses) == 40 == len(history.psnr) == len(history.n_gaussians)
    assert history.losses[-1] < history.losses[0]  # genuine descent
    assert history.psnr[-1] > history.psnr[0]
    assert history.losses[-1] < 0.5 * history.losses[0]


def test_step_returns_loss_and_psnr() -> None:
    loop = TrainingLoop(model=_scene(dc_offset=0.2), max_iter=1)
    out = loop.step([(_cam(), _target())])
    assert set(out) == {"loss", "psnr"}
    assert out["loss"] >= 0.0


def test_sgd_optimizer_also_descends() -> None:
    target = _target()
    loop = TrainingLoop(model=_scene(dc_offset=0.25), optimizer="sgd", lr_color=0.4, max_iter=30)
    history = loop.fit(train_views=[(_cam(), target)])
    assert history.losses[-1] < history.losses[0]


def test_invalid_optimizer_raises() -> None:
    with pytest.raises(ValueError, match="Unknown optimizer"):
        TrainingLoop(model=_scene(), optimizer="lbfgs")


def test_empty_batch_and_views_raise() -> None:
    loop = TrainingLoop(model=_scene(), max_iter=1)
    with pytest.raises(ValueError, match="at least one"):
        loop.step([])
    with pytest.raises(ValueError, match="at least one"):
        loop.fit(train_views=[])


def test_callbacks_fire_at_interval() -> None:
    fired: list[int] = []

    def cb(loop: TrainingLoop, it: int, hist: TrainingHistory) -> None:
        fired.append(it)

    loop = TrainingLoop(
        model=_scene(dc_offset=0.1), max_iter=10, densify_interval=5, prune_interval=5
    )
    loop.fit(train_views=[(_cam(), _target())], callbacks=[cb])
    assert fired == [4, 9]  # iters 5 and 10 (0-indexed it = 4, 9)

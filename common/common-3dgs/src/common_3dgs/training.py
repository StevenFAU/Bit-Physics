"""``common_3dgs.training`` — 3DGS optimisation-loop scaffold (§4.2.C).

Ships the reusable optimisation-loop surface the Phase-4.3 neural-rendered sims
(4.11-4.14) plug into: :class:`TrainingLoop` (``fit`` / ``step`` + densify/prune
callback hooks) and :class:`TrainingHistory`. ``GaussianSplatModel`` is
re-exported UNCHANGED from ``model.py`` (the plan §4.2.C names it under
``common_3dgs.training``; §0.3 landed reality keeps the definition in
``model.py``).

**Optimiser posture (§0.3 SHIFT, documented).** The landed ``render`` is a
forward Warp rasteriser with no differentiable tape wired; per plan §2523 the
differentiable rasterizer is an explicit per-sim concern at Stage 4.14 ("try
gsplat-style first; SHIFTED to FD if blocked"). WU-C therefore ships a genuine
**finite-difference reference optimiser** over a global appearance offset (DC
spherical-harmonic colour + opacity logit) that demonstrably reduces render MSE
and raises PSNR on an appearance-fit target — enough to exercise the loop, the
history, and the callback hooks. Per-gaussian differentiable-rasterizer training
is wired by the neural-rendered sim stages.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import dataclass, field

import numpy as np
import warp as wp

from .camera import Camera
from .model import GaussianSplatModel

__all__ = ["GaussianSplatModel", "TrainingHistory", "TrainingLoop"]

_FD_EPS = 1e-3


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return np.asarray(1.0 / (1.0 + np.exp(-x)), np.float64)


def _logit(p: np.ndarray) -> np.ndarray:
    p = np.clip(p, 1e-7, 1.0 - 1e-7)
    return np.log(p / (1.0 - p))


def _mse_to_psnr(mse: float) -> float:
    """PSNR (dB) for float images in ``[0, 1]`` (MAX_I = 1). Identity → +inf."""
    if mse <= 0.0:
        return float("inf")
    return 10.0 * math.log10(1.0 / mse)


@dataclass
class TrainingHistory:
    """3DGS scene-fit training history (distinct from §4.2.A ``History``)."""

    losses: list[float] = field(default_factory=list)
    psnr: list[float] = field(default_factory=list)
    n_gaussians: list[int] = field(default_factory=list)
    iter_count: int = 0


class TrainingLoop:
    """Reusable 3DGS optimisation loop (finite-difference reference optimiser)."""

    def __init__(
        self,
        *,
        model: GaussianSplatModel,
        optimizer: str = "adam",
        lr_position: float = 1.6e-4,
        lr_color: float = 2.5e-3,
        lr_opacity: float = 5e-2,
        lr_scale: float = 5e-3,
        lr_rotation: float = 1e-3,
        max_iter: int = 30_000,
        densify_interval: int = 100,
        prune_interval: int = 100,
    ) -> None:
        if optimizer not in ("adam", "sgd"):
            raise ValueError(f"Unknown optimizer: {optimizer!r}. Choose 'adam' or 'sgd'.")
        self.model = model
        self.optimizer = optimizer
        self.lr_position = lr_position
        self.lr_color = lr_color
        self.lr_opacity = lr_opacity
        self.lr_scale = lr_scale
        self.lr_rotation = lr_rotation
        self.max_iter = max_iter
        self.densify_interval = densify_interval
        self.prune_interval = prune_interval
        self._device = getattr(model, "_device", "cpu")

        # Optimised parameter: global appearance offset θ = [dc_r, dc_g, dc_b, op_logit].
        self._theta = np.zeros(4, dtype=np.float64)
        self._lr = np.array([lr_color, lr_color, lr_color, lr_opacity], dtype=np.float64)
        self._adam_m = np.zeros(4, dtype=np.float64)
        self._adam_v = np.zeros(4, dtype=np.float64)
        self._adam_t = 0

        npy = model.to_numpy()
        self._base_sh = npy["sh_coefficients"].copy()
        self._base_op_logit = _logit(npy["opacities"].astype(np.float64))

    # -- internal --------------------------------------------------------

    def _apply_theta(self, theta: np.ndarray) -> None:
        sh = self._base_sh.copy()
        sh[:, 0, :] += theta[:3].astype(np.float32)
        opacity = _sigmoid(self._base_op_logit + theta[3]).astype(np.float32)
        self.model.sh_coefficients = wp.array(sh, dtype=wp.float32, device=self._device)
        self.model.opacities = wp.array(opacity, dtype=wp.float32, device=self._device)

    def _loss_for(self, theta: np.ndarray, batch: list[tuple[Camera, np.ndarray]]) -> float:
        from .render import render

        self._apply_theta(theta)
        total = 0.0
        for camera, target in batch:
            image = render(self.model, camera)
            diff = image.astype(np.float64) - np.asarray(target, dtype=np.float64)
            total += float(np.mean(diff * diff))
        return total / max(len(batch), 1)

    def _fd_gradient(self, batch: list[tuple[Camera, np.ndarray]], base_loss: float) -> np.ndarray:
        grad = np.zeros(4, dtype=np.float64)
        for i in range(4):
            bumped = self._theta.copy()
            bumped[i] += _FD_EPS
            grad[i] = (self._loss_for(bumped, batch) - base_loss) / _FD_EPS
        return grad

    def _update(self, grad: np.ndarray) -> None:
        if self.optimizer == "sgd":
            self._theta -= self._lr * grad
            return
        # Adam.
        self._adam_t += 1
        b1, b2, eps = 0.9, 0.999, 1e-8
        self._adam_m = b1 * self._adam_m + (1.0 - b1) * grad
        self._adam_v = b2 * self._adam_v + (1.0 - b2) * (grad * grad)
        m_hat = self._adam_m / (1.0 - b1**self._adam_t)
        v_hat = self._adam_v / (1.0 - b2**self._adam_t)
        self._theta -= self._lr * m_hat / (np.sqrt(v_hat) + eps)

    # -- public ----------------------------------------------------------

    def step(self, batch: list[tuple[Camera, np.ndarray]]) -> dict[str, float]:
        """One optimisation step over a batch of ``(Camera, target_image)`` pairs."""
        if not batch:
            raise ValueError("step: batch must contain at least one (Camera, target) pair")
        base_loss = self._loss_for(self._theta, batch)
        grad = self._fd_gradient(batch, base_loss)
        self._update(grad)
        new_loss = self._loss_for(self._theta, batch)
        return {"loss": new_loss, "psnr": _mse_to_psnr(new_loss)}

    def fit(
        self,
        *,
        train_views: list[tuple[Camera, np.ndarray]],
        callbacks: list[Callable[[TrainingLoop, int, TrainingHistory], None]] | None = None,
    ) -> TrainingHistory:
        """Fit the model to ``train_views`` (list of ``(Camera, target_image)``).

        Densify/prune are exposed as interval-fired ``callbacks`` (each
        ``callback(loop, iter, history)``); full densification/pruning is wired
        per-sim at the neural-rendered stages.
        """
        if not train_views:
            raise ValueError("fit: train_views must contain at least one (Camera, target) pair")
        history = TrainingHistory()
        callbacks = callbacks or []
        for it in range(self.max_iter):
            result = self.step(train_views)
            history.losses.append(result["loss"])
            history.psnr.append(result["psnr"])
            history.n_gaussians.append(self.model.num_gaussians)
            history.iter_count = it + 1
            if (it + 1) % self.densify_interval == 0 or (it + 1) % self.prune_interval == 0:
                for cb in callbacks:
                    cb(self, it, history)
        return history

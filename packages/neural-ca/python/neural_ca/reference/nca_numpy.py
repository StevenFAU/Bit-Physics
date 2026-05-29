"""Pure-NumPy NCA forward pass — the CI-visible oracle for the WGSL capture.

Mirrors the WGSL forward inference (Stack B) in float32 NumPy: fixed
[identity, Sobel-x, Sobel-y] depthwise perception (zero-padded cross-correlation,
matching ``torch.nn.functional.conv2d``), the per-cell update MLP (ReLU then
linear), a **stateless PCG hash** stochastic fire mask, and alpha alive-masking.

The WGSL shader and this oracle share the SAME PCG fire-mask RNG (``pcg_fire``),
so the oracle reproduces the committed WGSL B-inference capture to a tight
absolute tolerance (the only divergence is GPU-vs-CPU f32 conv-reduction order).
The PyTorch D-inference uses a DIFFERENT RNG (``torch.rand``) — which is why the
D↔B cross-stack gate is statistical, not bit-exact.

Weights are the converted flat-f32 layout from ``convert_checkpoint.py``:
``w1.weight`` (128, 48, 1, 1), ``w1.bias`` (128), ``w2.weight`` (16, 128, 1, 1).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

ALIVE_THRESHOLD = np.float32(0.1)
_U32 = np.uint32


def pcg_fire(x: int, y: int, step: int, seed: int) -> float:
    """Stateless PCG-style hash → uniform [0, 1) for cell (x, y) at ``step``.

    Identical integer arithmetic to the WGSL ``pcg_fire``; all ops are u32 wrap
    (the overflow is intentional modular arithmetic — silenced via errstate)."""
    with np.errstate(over="ignore"):
        v = _U32(x) * _U32(1973) + _U32(y) * _U32(9277) + _U32(step) * _U32(26699)
        v = v + _U32(seed) * _U32(2654435761)
        v = v * _U32(747796405) + _U32(2891336453)
        word = ((v >> ((v >> _U32(28)) + _U32(4))) ^ v) * _U32(277803737)
        word = (word >> _U32(22)) ^ word
    return float(word) / 4294967296.0


def _fire_field(grid: int, step: int, seed: int, fire_rate: float) -> NDArray[np.float32]:
    """The (H, W) fire mask for ``step`` (vectorized ``pcg_fire``)."""
    yy, xx = np.mgrid[0:grid, 0:grid].astype(np.uint32)
    with np.errstate(over="ignore"):
        v = xx * _U32(1973) + yy * _U32(9277) + _U32(step) * _U32(26699)
        v = v + _U32(seed) * _U32(2654435761)
        v = v * _U32(747796405) + _U32(2891336453)
        word = ((v >> ((v >> _U32(28)) + _U32(4))) ^ v) * _U32(277803737)
        word = (word >> _U32(22)) ^ word
    u = word.astype(np.float64) / 4294967296.0
    fire: NDArray[np.float32] = (u <= fire_rate).astype(np.float32)
    return fire


def _conv3x3(state: NDArray[np.float32], kernel: NDArray[np.float32]) -> NDArray[np.float32]:
    """Zero-padded 3x3 cross-correlation per channel (matches F.conv2d)."""
    c, h, w = state.shape
    padded = np.zeros((c, h + 2, w + 2), dtype=np.float32)
    padded[:, 1:-1, 1:-1] = state
    out = np.zeros_like(state)
    for di in range(3):
        for dj in range(3):
            k = kernel[di, dj]
            if k != 0.0:
                out += np.float32(k) * padded[:, di : di + h, dj : dj + w]
    return out


def _perception_kernels() -> tuple[NDArray[np.float32], ...]:
    identity = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 0]], dtype=np.float32)
    sobel_x = np.outer([1.0, 2.0, 1.0], [-1.0, 0.0, 1.0]).astype(np.float32) / np.float32(8.0)
    sobel_y = sobel_x.T.copy()
    return identity, sobel_x, sobel_y


def _perceive(state: NDArray[np.float32]) -> NDArray[np.float32]:
    """(C, H, W) -> (3C, H, W) ordered [c0_id, c0_sx, c0_sy, c1_id, ...]."""
    c, h, w = state.shape
    idn, sx, sy = _perception_kernels()
    out = np.empty((3 * c, h, w), dtype=np.float32)
    out[0::3] = _conv3x3(state, idn)
    out[1::3] = _conv3x3(state, sx)
    out[2::3] = _conv3x3(state, sy)
    return out


def _alive_mask(state: NDArray[np.float32]) -> NDArray[np.bool_]:
    alpha = state[3]
    padded = np.full((alpha.shape[0] + 2, alpha.shape[1] + 2), -np.inf, dtype=np.float32)
    padded[1:-1, 1:-1] = alpha
    h, w = alpha.shape
    pooled = np.full_like(alpha, -np.inf)
    for di in range(3):
        for dj in range(3):
            pooled = np.maximum(pooled, padded[di : di + h, dj : dj + w])
    alive: NDArray[np.bool_] = pooled > ALIVE_THRESHOLD
    return alive


def nca_forward_numpy(
    weights: dict[str, NDArray[np.float32]],
    *,
    grid_size: int,
    steps: int,
    seed: int = 42,
    fire_rate: float = 0.5,
    capture_every: int = 1,
) -> NDArray[np.float32]:
    """Roll the NCA forward in NumPy f32 from the canonical seed using the
    converted ``weights``; return an ``(n_frames, H, W, 4)`` RGBA stack (clamped
    to [0, 1]). Frame 0 is the seed; thereafter every ``capture_every`` steps."""
    w1 = np.asarray(weights["w1.weight"], dtype=np.float32).reshape(128, -1)  # (128, 3C)
    b1 = np.asarray(weights["w1.bias"], dtype=np.float32)  # (128,)
    w2 = np.asarray(weights["w2.weight"], dtype=np.float32).reshape(-1, 128)  # (C, 128)
    channel_n = w2.shape[0]

    state = np.zeros((channel_n, grid_size, grid_size), dtype=np.float32)
    mid = grid_size // 2
    state[3:, mid, mid] = 1.0

    def rgba(s: NDArray[np.float32]) -> NDArray[np.float32]:
        return np.clip(s[:4], 0.0, 1.0).transpose(1, 2, 0).astype(np.float32)

    frames = [rgba(state)]
    for t in range(steps):
        pre_alive = _alive_mask(state)
        perc = _perceive(state)  # (3C, H, W)
        h = np.maximum(np.einsum("oi,ihw->ohw", w1, perc) + b1[:, None, None], 0.0)
        dx = np.einsum("oi,ihw->ohw", w2, h).astype(np.float32)
        fire = _fire_field(grid_size, t, seed, fire_rate)
        state = state + dx * fire[None, :, :]
        post_alive = _alive_mask(state)
        alive = (pre_alive & post_alive).astype(np.float32)
        state = (state * alive[None, :, :]).astype(np.float32)
        if (t + 1) % capture_every == 0:
            frames.append(rgba(state))
    return np.stack(frames, axis=0)

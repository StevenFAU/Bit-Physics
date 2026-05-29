"""NCA update-rule network (Stack D, PyTorch).

Reimplemented INDEPENDENTLY from Mordvintsev et al. 2020, "Growing Neural
Cellular Automata", Distill (citation anchors in
``references/growing-neural-ca/notebooks/growing_ca.ipynb``; cite-don't-import,
§ H.2). The per-cell update is:

1. **Perception** — a fixed depthwise convolution stacking three kernels per
   channel: identity, Sobel-x, Sobel-y (``Sobel = outer([1,2,1], [-1,0,1]) / 8``).
   Output is a ``3 * channel_n`` perception vector per cell
   (``growing_ca.ipynb`` line 249).
2. **Update MLP** — a per-cell 1x1-conv network ``Conv(128, relu) -> Conv(channel_n,
   zero-init)`` mapping the perception vector to a state delta
   (``growing_ca.ipynb`` line 233).
3. **Stochastic fire mask** — each cell applies its delta with probability
   ``fire_rate`` (= 0.5) independently per step (``growing_ca.ipynb`` line 260).
4. **Alive masking** — a cell is alive iff a 3x3 max-pool of the alpha channel
   exceeds 0.1; dead cells (pre & post) are zeroed (``growing_ca.ipynb`` line 217).

Channels: 0-2 RGB, 3 alpha, 4-15 hidden (``CHANNEL_N = 16``; ``growing_ca.ipynb``
line 159). RGB is premultiplied by alpha. Only RGBA is interpreted/visible; the
hidden channels are unbounded real values (regime note for PBT
``field_values_bounded``).

Stage 1a: ``NCAModel.forward`` / ``perceive`` raise ``NotImplementedError``;
implemented at Stage 1b-D.
"""

from __future__ import annotations

from dataclasses import dataclass

import torch
from torch import Tensor, nn
from torch.nn import functional as F

CHANNEL_N = 16
CELL_FIRE_RATE = 0.5
ALIVE_THRESHOLD = 0.1
HIDDEN_DIM = 128


@dataclass(frozen=True)
class NCAConfig:
    """Hyperparameters for the NCA reference sim."""

    channel_n: int = CHANNEL_N
    fire_rate: float = CELL_FIRE_RATE
    hidden_dim: int = HIDDEN_DIM
    grid_size: int = 64
    target_emoji: str = "lizard"


def seed_state(grid_size: int, channel_n: int = CHANNEL_N) -> Tensor:
    """The canonical seed: zeros everywhere, a single live cell at the center
    with all non-RGB channels (alpha + hidden) set to 1.0 (``growing_ca.ipynb``
    ``make_seed``). Returns a ``(1, channel_n, grid_size, grid_size)`` tensor.
    """
    x = torch.zeros(1, channel_n, grid_size, grid_size, dtype=torch.float32)
    mid = grid_size // 2
    x[:, 3:, mid, mid] = 1.0
    return x


class NCAModel(nn.Module):
    """Per-cell NCA update network (perception + update MLP)."""

    def __init__(self, config: NCAConfig | None = None) -> None:
        super().__init__()
        self.config = config or NCAConfig()
        c = self.config.channel_n
        # Update MLP: perception (3*c) -> hidden -> channel_n (zero-init last).
        self.w1 = nn.Conv2d(3 * c, self.config.hidden_dim, kernel_size=1)
        self.w2 = nn.Conv2d(self.config.hidden_dim, c, kernel_size=1, bias=False)
        nn.init.zeros_(self.w2.weight)
        self.register_buffer("_perception_kernel", _perception_kernel(c), persistent=False)

    def perceive(self, x: Tensor) -> Tensor:
        """Fixed depthwise [identity, Sobel-x, Sobel-y] convolution.

        Input ``(B, C, H, W)`` -> output ``(B, 3C, H, W)`` ordered
        ``[c0_id, c0_sobel_x, c0_sobel_y, c1_id, ...]``. Zero-padded 'SAME'
        (``growing_ca.ipynb`` ``perceive``).
        """
        kernel = self._perception_kernel
        assert isinstance(kernel, Tensor)
        return F.conv2d(x, kernel, padding=1, groups=self.config.channel_n)

    def _alive_mask(self, x: Tensor) -> Tensor:
        """A cell is alive iff a 3x3 max-pool of the alpha channel (index 3)
        exceeds ``ALIVE_THRESHOLD`` (``growing_ca.ipynb`` ``get_living_mask``)."""
        alpha = x[:, 3:4]
        return F.max_pool2d(alpha, kernel_size=3, stride=1, padding=1) > ALIVE_THRESHOLD

    def forward(self, x: Tensor, *, fire_rate: float | None = None) -> Tensor:
        """One stochastic NCA update step (``growing_ca.ipynb`` ``call``).

        The stochastic fire mask draws from the ambient ``torch`` RNG; pin
        ``torch.manual_seed`` upstream for bit-exact same-stack inference.
        """
        if fire_rate is None:
            fire_rate = self.config.fire_rate
        pre_alive = self._alive_mask(x)
        dx = self.w2(F.relu(self.w1(self.perceive(x))))
        fire = (torch.rand(x[:, :1].shape, device=x.device) <= fire_rate).to(x.dtype)
        x = x + dx * fire
        post_alive = self._alive_mask(x)
        alive = (pre_alive & post_alive).to(x.dtype)
        return x * alive


def _perception_kernel(channel_n: int) -> Tensor:
    """Build the fixed depthwise perception kernel ``(3C, 1, 3, 3)`` with the
    per-channel filter triple [identity, Sobel-x, Sobel-y]
    (``Sobel_x = outer([1,2,1], [-1,0,1]) / 8``; ``growing_ca.ipynb`` line 249).
    """
    identity = torch.tensor([[0.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 0.0]])
    sobel_x = torch.outer(torch.tensor([1.0, 2.0, 1.0]), torch.tensor([-1.0, 0.0, 1.0])) / 8.0
    sobel_y = sobel_x.t()
    triple = torch.stack([identity, sobel_x, sobel_y], dim=0)  # (3, 3, 3)
    kernel = triple.repeat(channel_n, 1, 1)  # (3C, 3, 3)
    return kernel.unsqueeze(1)  # (3C, 1, 3, 3)

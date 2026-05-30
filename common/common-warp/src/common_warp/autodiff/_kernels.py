# mypy: ignore-errors
"""Warp autodiff kernels (F-RB-3: Warp's partial typing → scoped mypy ignore).

``wp.atomic_add`` is differentiable, so the L2 reduction participates in the
``wp.Tape`` backward pass. Single, simple kernels keep the adjoint graph small.
"""

import warp as wp


@wp.kernel
def accumulate_l2(
    pred: wp.array(dtype=wp.float64),
    tgt: wp.array(dtype=wp.float64),
    out: wp.array(dtype=wp.float64),
):
    """Accumulate the L2 objective ``Σ (pred - tgt)²`` into ``out[0]``."""
    i = wp.tid()
    d = pred[i] - tgt[i]
    wp.atomic_add(out, 0, d * d)

# mypy: ignore-errors
"""Taichi autodiff kernels (IC-12 discipline).

Kept in a dedicated module WITHOUT ``from __future__ import annotations`` and
WITHOUT ``-> None`` return hints: Taichi 1.7.4 reads kernel argument
annotations as live objects, so a stringized ``ti.template()`` (the effect of
``from __future__ import annotations``) raises ``TaichiSyntaxError``. See the
Phase-3 lenia Taichi-kernel-module lesson. ``# mypy: ignore-errors`` because the
``@ti.kernel`` decorator is untyped and ``ti.template()`` is not a mypy type.
"""

import taichi as ti


@ti.kernel
def accumulate_l2(pred: ti.template(), tgt: ti.template(), out: ti.template()):
    """Accumulate the L2 objective ``Σ (pred - tgt)²`` into the scalar ``out``."""
    for i in pred:
        out[None] += (pred[i] - tgt[i]) ** 2

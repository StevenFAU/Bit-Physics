from __future__ import annotations

import math
import numpy as np

from sph_multiphase.reference.kernels import (
    adhesion_kernel,
    cohesion_kernel,
    cubic_grad,
    cubic_w,
)


def test_cubic_spline_branch_goldens() -> None:
    h = 0.2
    assert cubic_w(0, h, 3) == (1 / math.pi) / h**3
    assert cubic_w(h, h, 3) == 0.25 * (1 / math.pi) / h**3
    assert cubic_w(2 * h, h, 3) == 0.0
    assert np.array_equal(cubic_grad(np.zeros(3), h), np.zeros(3))


def test_akinci_kernel_support_and_branches() -> None:
    support = 0.4
    assert cohesion_kernel(0.0, support) == 0
    assert cohesion_kernel(support, support) == 0
    assert math.isfinite(cohesion_kernel(0.1, support))
    assert adhesion_kernel(0.2, support) == 0
    assert adhesion_kernel(0.3, support) > 0
    assert adhesion_kernel(0.5, support) == 0

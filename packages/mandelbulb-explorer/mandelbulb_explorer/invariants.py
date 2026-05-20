"""Property-based invariants for the mandelbulb-explorer sim (gate 11).

Declarations per spec § 6.6:

- ``de_lower_bound_property`` — for any sampled point ``c`` in the
  bounding box ``[-2, 2]^3``, the DE is a *lower bound* on the
  distance from ``c`` to the set. Because the origin is in the set,
  ``dist(c, S) <= |c|`` for any ``c``; we assert the looser but
  cheaper bound ``DE(c) <= |c| + FP slack``.
- ``map_p8_z_inversion_symmetry`` — for canonical ``p = 8``, the map
  ``z^p`` is invariant under ``phi -> phi + 2*pi/p`` in spherical
  coordinates (the period of ``sin/cos`` of ``p*phi`` is ``2*pi/p``).
"""

from __future__ import annotations

import math

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference.quilez import distance_estimator, pow_z

_CANONICAL_P = 8
_CANONICAL_R = 2.0
_CANONICAL_N_MAX = 16
_FP_SLACK = 1e-9


@given(
    x=st.floats(min_value=-2.0, max_value=2.0, allow_nan=False),
    y=st.floats(min_value=-2.0, max_value=2.0, allow_nan=False),
    z=st.floats(min_value=-2.0, max_value=2.0, allow_nan=False),
)
@settings(
    max_examples=25,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def de_lower_bound_property(x: float, y: float, z: float) -> None:
    """DE(c) is a lower bound on ``dist(c, S)``; cheaper bound used here.

    The origin is in the mandelbulb set (``z_0 = 0`` is a fixed point of
    the iterate); therefore ``dist(c, S) <= |c|`` for any ``c``. The DE
    must be no larger than this.
    """
    c = [float(x), float(y), float(z)]
    de = distance_estimator(
        c=c,
        p=_CANONICAL_P,
        escape_radius=_CANONICAL_R,
        n_max=_CANONICAL_N_MAX,
    )
    radius = math.sqrt(x * x + y * y + z * z)
    assert de <= radius + _FP_SLACK, (
        f"DE({c}) = {de}; expected <= |c| + slack = {radius + _FP_SLACK}"
    )


@given(
    r=st.floats(min_value=0.01, max_value=1.9, allow_nan=False),
    theta=st.floats(min_value=0.05, max_value=math.pi - 0.05, allow_nan=False),
    phi=st.floats(min_value=-math.pi, max_value=math.pi, allow_nan=False),
)
@settings(
    max_examples=25,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def map_p8_z_inversion_symmetry(r: float, theta: float, phi: float) -> None:
    """For p=8, ``z^p`` is invariant under ``phi -> phi + 2*pi/p``.

    The closed-form ``z^p`` map applies ``sin(p*phi)`` and
    ``cos(p*phi)``; both have period ``2*pi/p``, so shifting ``phi`` by
    ``2*pi/p`` cannot change the output (modulo FP rounding error).
    """
    sin_t = math.sin(theta)
    cos_t = math.cos(theta)
    z_a = np.array(
        [r * sin_t * math.cos(phi), r * sin_t * math.sin(phi), r * cos_t],
        dtype=np.float64,
    )
    phi_b = phi + (2.0 * math.pi / _CANONICAL_P)
    z_b = np.array(
        [r * sin_t * math.cos(phi_b), r * sin_t * math.sin(phi_b), r * cos_t],
        dtype=np.float64,
    )
    out_a = pow_z(z_a, _CANONICAL_P)
    out_b = pow_z(z_b, _CANONICAL_P)
    # Relative tolerance: at r=1.9 and p=8, r^p ~ 169; an FP error of
    # ~ 5e-13 * 169 ~ 1e-10 covers the 30+ trig/pow operations in pow_z.
    err = float(np.max(np.abs(out_a - out_b)))
    scale = float(np.max(np.abs(out_a))) + 1.0
    assert err < 1e-10 * scale, (
        f"pow_z(phi) - pow_z(phi + 2*pi/p) max-abs-diff {err} exceeds "
        f"1e-10 * scale={scale}"
    )


__all__ = [
    "de_lower_bound_property",
    "map_p8_z_inversion_symmetry",
]

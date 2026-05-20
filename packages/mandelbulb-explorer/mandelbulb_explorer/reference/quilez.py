"""Mandelbulb distance estimator (Quilez 2009 / Hubbard–Douady).

References:

- Quilez, I. (2009), "Mandelbulb (distance estimation)",
  https://iquilezles.org/articles/mandelbulb/.
- Hart, J. C., Sandin, D. J., & Kauffman, L. H. (1989),
  "Ray tracing deterministic 3-D fractals", SIGGRAPH '89, 23 (3),
  289-296. DOI 10.1145/74334.74363.
- Hart, J. C. (1996), "Sphere tracing", The Visual Computer, 12 (10).
  DOI 10.1007/s003710050084.

The DE for the iterated map ``z_{n+1} = z_n^p + c`` (``z_0 = c``) is
the Hubbard–Douady formula

    DE(c) = 0.5 * (|z| / |dz|) * log(|z|)

evaluated at the first iterate that escapes ``|z| > R``. The
derivative magnitude evolves via the chain rule

    dz_{n+1} = p * |z_n|^(p-1) * dz_n + 1,    dz_0 = 1.

When the iteration never escapes within ``n_max`` steps, the point is
inside the set; the sentinel ``DE = 0.0`` is returned by convention.

The ``z^p`` map itself is the spherical-coordinate identity

    z^p = r^p * (sin(p*theta) * cos(p*phi),
                 sin(p*theta) * sin(p*phi),
                 cos(p*theta)),

with ``r = |z|``, ``theta = acos(z_z / r)``, ``phi = atan2(z_y, z_x)``.
"""

from __future__ import annotations

import math

import numpy as np

_TINY = 1.0e-300


def pow_z(z: np.ndarray, p: int) -> np.ndarray:
    """Closed-form ``z^p`` map in spherical coordinates (Quilez 2009).

    Returns ``(0, 0, 0)`` when ``|z|`` underflows to zero.
    """
    arr = np.asarray(z, dtype=np.float64)
    r2 = float(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2])
    if r2 < _TINY:
        return np.zeros(3, dtype=np.float64)
    r = math.sqrt(r2)
    theta = math.acos(arr[2] / r)
    phi = math.atan2(arr[1], arr[0])
    rp = r**p
    pt = p * theta
    pphi = p * phi
    sin_pt = math.sin(pt)
    return np.array(
        [
            rp * sin_pt * math.cos(pphi),
            rp * sin_pt * math.sin(pphi),
            rp * math.cos(pt),
        ],
        dtype=np.float64,
    )


def iterate_map(z: np.ndarray, c: np.ndarray, p: int) -> np.ndarray:
    """One step of the iterated map: ``z -> z^p + c``."""
    return pow_z(z, p) + np.asarray(c, dtype=np.float64)


def distance_estimator(
    *,
    c: list[float] | np.ndarray,
    p: int,
    escape_radius: float,
    n_max: int,
) -> float:
    """Hubbard–Douady DE for the Quilez mandelbulb map (variant p).

    Returns ``0.0`` for points that never escape within ``n_max``
    iterations (in-set sentinel per Quilez 2009 "Distance estimation").
    """
    z = np.asarray(c, dtype=np.float64).copy()
    c_arr = np.asarray(c, dtype=np.float64)
    dz = 1.0
    er2 = float(escape_radius) * float(escape_radius)
    for _ in range(int(n_max)):
        r2 = float(z[0] * z[0] + z[1] * z[1] + z[2] * z[2])
        # SymPy generator semantics: check escape at the CURRENT iterate
        # before applying the chain-rule update (matches the
        # ``mandelbulb-de-samples.json`` golden DE values).
        if r2 > er2:
            r = math.sqrt(r2)
            return 0.5 * r * math.log(r) / dz
        r = math.sqrt(r2) if r2 > 0.0 else 0.0
        dz = p * (r ** (p - 1)) * dz + 1.0
        z = pow_z(z, p) + c_arr
    return 0.0


__all__ = ["distance_estimator", "iterate_map", "pow_z"]

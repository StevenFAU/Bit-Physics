"""Planar revolute serial-chain model (reduced/generalized-coordinate).

The articulated body is a serial kinematic tree of ``n`` rigid links connected
by revolute joints, all rotating about the world ``z`` axis (planar motion in
the ``x-y`` plane). Gravity acts in ``-y``. The generalized coordinate ``q[i]``
is the **joint angle of link i relative to its parent link** (Featherstone
reduced-coordinate convention, Ch. 7 §7.2); the base ("link -1") is the fixed
world frame whose ``x`` axis is the reference for ``q[0]``.

Each link ``i`` is a point mass ``mass[i]`` rigidly fixed at distance
``com_distance[i]`` from joint ``i`` along the link, with the child joint
``i+1`` at distance ``length[i]`` from joint ``i``. ``inertia[i]`` is the
link's scalar moment of inertia about its own COM (``0`` for a point mass;
``m L^2 / 12`` for a uniform rod). This is data only — the dynamics
(``aba``), integrators, analytic anchors, energy/momentum, and sim runner are
separate modules. No physics is computed here.
"""

from __future__ import annotations

from dataclasses import dataclass

#: Standard gravitational acceleration (m/s^2), magnitude; acts in -y.
DEFAULT_GRAVITY = 9.81


@dataclass(frozen=True)
class ArticulatedChain:
    """A planar revolute serial chain (reduced-coordinate articulated body).

    All tuples have length ``n_links``. ``q`` / ``qd`` state vectors are
    length-``n_links`` joint-space arrays (relative joint angles / rates).
    """

    masses: tuple[float, ...]
    lengths: tuple[float, ...]
    com_distances: tuple[float, ...]
    inertias: tuple[float, ...]
    gravity: float = DEFAULT_GRAVITY

    def __post_init__(self) -> None:
        n = len(self.masses)
        for name, seq in (
            ("lengths", self.lengths),
            ("com_distances", self.com_distances),
            ("inertias", self.inertias),
        ):
            if len(seq) != n:
                raise ValueError(
                    f"ArticulatedChain field {name!r} has length {len(seq)}, "
                    f"expected {n} to match masses"
                )
        if n == 0:
            raise ValueError("ArticulatedChain must have at least one link")

    @property
    def n_links(self) -> int:
        """Number of links = number of generalized coordinates (DOF)."""
        return len(self.masses)


def make_simple_pendulum(
    length: float = 1.0,
    mass: float = 1.0,
    gravity: float = DEFAULT_GRAVITY,
) -> ArticulatedChain:
    """Single revolute joint, point mass at the rod tip (``I_com = 0``).

    Inertia about the pivot is ``m L^2`` so the equation of motion is the ideal
    simple pendulum ``theta'' = -(g/L) sin(theta)`` — the configuration the
    analytic small/large-angle period + Jacobi-cn trajectory anchors describe.
    """
    return ArticulatedChain(
        masses=(float(mass),),
        lengths=(float(length),),
        com_distances=(float(length),),
        inertias=(0.0,),
        gravity=float(gravity),
    )


def make_double_pendulum(
    length1: float = 1.0,
    length2: float = 1.0,
    mass1: float = 1.0,
    mass2: float = 1.0,
    gravity: float = DEFAULT_GRAVITY,
) -> ArticulatedChain:
    """Classic double pendulum — two point masses on massless rods."""
    return ArticulatedChain(
        masses=(float(mass1), float(mass2)),
        lengths=(float(length1), float(length2)),
        com_distances=(float(length1), float(length2)),
        inertias=(0.0, 0.0),
        gravity=float(gravity),
    )


def make_nlink_chain(
    n: int,
    link_length: float = 1.0,
    link_mass: float = 1.0,
    gravity: float = DEFAULT_GRAVITY,
) -> ArticulatedChain:
    """Uniform ``n``-link chain of point masses on equal massless rods.

    ``n = 6`` is the ``6-dof`` CLI tier; arbitrary ``n`` is the ``N-link`` tier.
    """
    if n < 1:
        raise ValueError(f"n must be >= 1, got {n}")
    return ArticulatedChain(
        masses=tuple(float(link_mass) for _ in range(n)),
        lengths=tuple(float(link_length) for _ in range(n)),
        com_distances=tuple(float(link_length) for _ in range(n)),
        inertias=tuple(0.0 for _ in range(n)),
        gravity=float(gravity),
    )


__all__ = [
    "DEFAULT_GRAVITY",
    "ArticulatedChain",
    "make_double_pendulum",
    "make_nlink_chain",
    "make_simple_pendulum",
]

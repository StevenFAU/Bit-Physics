"""``NewtonState`` — a captured snapshot of Newton sim state (§4.2.D)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class NewtonState:
    """Snapshot of Newton sim state for capture + equivalence (§4.2.D).

    Arrays are NumPy/Warp arrays; shapes per the spec contract:
    body_positions ``(N_bodies, 3)``, body_orientations ``(N_bodies, 4)``
    quaternions, velocities matching, joint arrays ``(N_joints,)`` if
    articulated. ``sim_time`` is seconds.
    """

    body_positions: Any
    body_orientations: Any
    body_linear_velocities: Any
    body_angular_velocities: Any
    joint_positions: Any
    joint_velocities: Any
    sim_time: float

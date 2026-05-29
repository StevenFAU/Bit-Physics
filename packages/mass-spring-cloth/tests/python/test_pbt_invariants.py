#!/usr/bin/env python3
"""mass-spring-cloth PBT (gate-11) — cross-language subprocess wiring.

Charter D-PBT (operator-ratified, first C++-sim Python-PBT in Phase 3): Hypothesis
generates IC parameters → subprocess the C++ capture binary (passed as argv) →
read the emitted ``.h5`` → assert the declared invariants on the captured state.
This tests the ACTUAL Vulkan/C++ sim (not a Python re-implementation). Example
counts are bounded + meshes are small (subprocess-per-example).

Two invariants (≥2 per spec §2.14), predicate forms in
``property.sims.mass_spring_cloth.invariants``:

- ``length_bounded_above`` — ANY IC: no stretch spring exceeds rest·(1+ratio).
- ``momentum_conservation_free_no_gravity`` — FREE cloth, gravity off: total
  linear momentum is conserved (RE-DECLARED to the free regime; a pinned cloth
  does not conserve linear momentum).

Usage (driven by CTest from tools/testkit so `capture` + `property` import):
    uv run python test_pbt_invariants.py <capture_binary>
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from capture.reader import load_capture
from property.sims.mass_spring_cloth.invariants import (
    grid_stretch_edges,
    length_bounded_above_invariant,
    momentum_conservation_free_no_gravity_invariant,
)

LAVAPIPE_ENV = {
    "VK_DRIVER_FILES": "/usr/share/vulkan/icd.d/lvp_icd.json",
    "LP_NUM_THREADS": "0",
}
_CAPTURE_BIN = ""  # set in main()


def _run(args: list[str], out: Path) -> None:
    env = {**os.environ, **LAVAPIPE_ENV}
    subprocess.run(
        [_CAPTURE_BIN, str(out), *args], check=True, env=env, capture_output=True
    )


def _read_field(manifest: Path, name: str) -> np.ndarray:
    cap = load_capture(manifest)
    steps = sorted(s.step for s in cap.steps())
    return np.stack(
        [cap.field(n, name).reshape(-1, 3) for n in steps]
    )  # (n_steps, N, 3)


@settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    nx=st.integers(3, 7),
    ny=st.integers(3, 7),
    grav=st.floats(1.0, 20.0),
    steps=st.integers(20, 80),
)
def test_length_bounded_above(nx: int, ny: int, grav: float, steps: int) -> None:
    """ANY IC: stretch springs stay bounded (no runaway) for a pinned cloth."""
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "len.json"
        _run(
            [
                "--nx",
                str(nx),
                "--ny",
                str(ny),
                "--spacing",
                "1.0",
                "--steps",
                str(steps),
                "--capture-interval",
                str(max(1, steps // 4)),
                "--gravity",
                "0",
                f"-{grav}",
                "0",
                "--pin",
                "top-corners",
                "--stretch-compliance",
                "1e-7",
                "--bend-compliance",
                "1e-5",
                "--iterations",
                "40",
                "--damping",
                "0.02",
                "--no-determinism-check",
            ],
            out,
        )
        positions = _read_field(out, "positions")
    edges = grid_stretch_edges(nx, ny)
    assert length_bounded_above_invariant(
        positions, edges, spacing=1.0, max_stretch_ratio=0.5
    )


@settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    nx=st.integers(3, 6),
    ny=st.integers(3, 6),
    vx=st.floats(-1.0, 1.0),
    vy=st.floats(-1.0, 1.0),
    vz=st.floats(-1.0, 1.0),
    steps=st.integers(20, 60),
)
def test_momentum_conservation_free_no_gravity(
    nx: int, ny: int, vx: float, vy: float, vz: float, steps: int
) -> None:
    """FREE cloth, gravity off, perturbed IC + uniform drift: Σ mᵢvᵢ conserved."""
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "mom.json"
        _run(
            [
                "--nx",
                str(nx),
                "--ny",
                str(ny),
                "--spacing",
                "1.0",
                "--steps",
                str(steps),
                "--capture-interval",
                str(max(1, steps // 4)),
                "--gravity",
                "0",
                "0",
                "0",
                "--pin",
                "none",
                "--init-velocity",
                str(vx),
                str(vy),
                str(vz),
                "--perturb",
                "0.15",
                "--stretch-compliance",
                "1e-6",
                "--bend-compliance",
                "1e-5",
                "--iterations",
                "30",
                "--damping",
                "0.0",
                "--no-determinism-check",
            ],
            out,
        )
        velocities = _read_field(out, "velocities")
    # uniform particle_mass = 1.0; momentum conserved to a loose f64-accumulation atol
    assert momentum_conservation_free_no_gravity_invariant(
        velocities, particle_mass=1.0, atol=1e-6
    )


def main() -> int:
    global _CAPTURE_BIN
    if len(sys.argv) < 2:
        print("usage: test_pbt_invariants.py <capture_binary>", file=sys.stderr)
        return 2
    _CAPTURE_BIN = sys.argv[1]
    test_length_bounded_above()
    test_momentum_conservation_free_no_gravity()
    print("mass-spring-cloth PBT: both invariants PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

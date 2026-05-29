# mypy: ignore-errors
# ^ consumes the Warp-orchestration surface (common_warp Capture / write_capture
#   + aba via simulate); the public signature is honored by importers. F-RB-3.
"""SimRunner adapter — articulated-pedagogical replayable capture (Stack E).

Emits the canonical single-pendulum trajectory capture
``pendulum-trajectory-seed42-step1000.{h5,json}`` via the common-warp batch
``Capture`` + ``write_capture`` API (D-CAPTURE-API, charter §6 — NOT lenia's
incremental ``Writer``). Per-step joint-space pose arrays are accumulated into a
flat payload keyed by ``state_key(step, field)``; the manifest declares
``schema_version="1.0.0"``, ``dtype="f64"``, ``determinism.claimed=
"bit-exact-same-hw"`` (D-DET registry row ↔ capture sidecar, gate-10).

Determinism: the trajectory is produced by the Warp ABA (``dim=1`` serial CPU
launch, f64); ``common_warp.init("cpu", deterministic=True)`` selects the
backend. The pendulum has no RNG — ``seed`` is threaded into the descriptor +
manifest for the seed-pinned contract.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Final

import common_warp
import numpy as np
from common_warp.capture.model import diagnostics_key, state_key

from .dynamics import total_energy
from .integrators import simulate
from .model import make_simple_pendulum

CANONICAL_LENGTH: Final[float] = 1.0
CANONICAL_MASS: Final[float] = 1.0
CANONICAL_GRAVITY: Final[float] = 9.81
CANONICAL_THETA0: Final[float] = 2.0
CANONICAL_DT: Final[float] = 1e-3
CANONICAL_N_STEPS: Final[int] = 1000
CANONICAL_CAPTURE_INTERVAL: Final[int] = 10

_STACK: Final[dict[str, str]] = {
    "name": "warp-stack-e",
    "version": common_warp.__version__,
    "build_id": "sub-phase-phase-3-rigid-body",
}


def _build_manifest(*, descriptor: str, seed: int, wall_clock_seconds: float) -> dict[str, object]:
    return {
        "schema_version": "1.0.0",
        "sim": {
            "name": "rigid-body-pedagogical",
            "category": "rigid-body",
            "variant": "articulated-pedagogical-aba-single-pendulum",
        },
        "stack": dict(_STACK),
        "config": {
            "tier": "single-joint",
            "dims": [1],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "descriptor": descriptor,
                "algorithm": "featherstone-aba-reduced-coordinate",
                "integrator": "semi-implicit-euler",
                "length": CANONICAL_LENGTH,
                "mass": CANONICAL_MASS,
                "gravity": CANONICAL_GRAVITY,
                "theta0": CANONICAL_THETA0,
                "dt": CANONICAL_DT,
            },
        },
        "run": {
            "step_count": CANONICAL_N_STEPS,
            "capture_interval": CANONICAL_CAPTURE_INTERVAL,
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-29T00:00:00Z",
        },
        "payload": {
            "format": "hdf5",
            "path": f"{descriptor}.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        "determinism": {
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    }


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Run the canonical single-pendulum capture (seed-pinned, 1000 steps).

    Descriptor ``pendulum-trajectory-seed{seed}-step1000``. Returns the manifest
    JSON path.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    descriptor = f"pendulum-trajectory-seed{int(seed)}-step1000"

    common_warp.init("cpu", deterministic=True)
    chain = make_simple_pendulum(CANONICAL_LENGTH, CANONICAL_MASS, CANONICAL_GRAVITY)
    q0 = np.array([CANONICAL_THETA0], dtype=np.float64)
    qd0 = np.zeros(1, dtype=np.float64)

    t_start = time.perf_counter()
    q_traj, qd_traj = simulate(chain, q0, qd0, CANONICAL_DT, CANONICAL_N_STEPS)
    elapsed = time.perf_counter() - t_start

    payload: dict[str, np.ndarray] = {}
    for step in range(0, CANONICAL_N_STEPS + 1):
        if step % CANONICAL_CAPTURE_INTERVAL != 0 and step != CANONICAL_N_STEPS:
            continue
        payload[state_key(step, "theta")] = np.ascontiguousarray(q_traj[step], dtype=np.float64)
        payload[state_key(step, "theta_dot")] = np.ascontiguousarray(
            qd_traj[step], dtype=np.float64
        )
        energy = total_energy(chain, q_traj[step], qd_traj[step])
        payload[diagnostics_key(step, "total_energy")] = np.float64(energy)

    manifest = _build_manifest(descriptor=descriptor, seed=seed, wall_clock_seconds=elapsed)
    capture = common_warp.Capture(manifest=manifest, payload=payload)
    common_warp.write_capture(capture, out_dir / descriptor)
    return out_dir / f"{descriptor}.json"


__all__ = [
    "CANONICAL_DT",
    "CANONICAL_N_STEPS",
    "CANONICAL_THETA0",
    "sim_runner_seeded",
]

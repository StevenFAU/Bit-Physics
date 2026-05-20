"""1D advection smoke sim (charter § 7.1 deliverable E, common-py side).

Solves ``∂u/∂t + c ∂u/∂x = 0`` on a periodic 1D grid with an upwind
scheme. Coarse grid (64 cells), deterministic, 100 steps, capture
interval 10. Writes a capture file via :class:`common_py.capture.Writer`.

Mirrors the corresponding common-cpp smoke sim. The two captures are
intended for cross-stack equivalence comparison; see
``docs/common/py.md`` and ``docs/common/cpp.md`` for the equivalence
contract.
"""

from __future__ import annotations

import argparse
import time
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from common_py.capture import (
    ConfigMeta,
    DeterminismMeta,
    Manifest,
    PayloadMeta,
    RunMeta,
    SimMeta,
    StackMeta,
    StepData,
    Writer,
)
from common_py.determinism import Config, add_args, from_args

GRID_N = 64
STEP_COUNT = 100
CAPTURE_INTERVAL = 10
DX = 1.0 / GRID_N
ADVECTION_SPEED = 1.0
DT = 0.5 * DX / ADVECTION_SPEED  # CFL = 0.5


def initial_condition(seed: int) -> np.ndarray:
    # Single Gaussian pulse — deterministic regardless of seed, but
    # we accept seed to round-trip the IC-4 plumbing.
    _ = seed
    xs = (np.arange(GRID_N) + 0.5) * DX
    pulse = np.exp(-((xs - 0.5) ** 2) / (2 * (0.05**2)))
    return pulse.astype(np.float64)


def step_upwind(u: np.ndarray) -> np.ndarray:
    # First-order upwind, periodic boundary.
    return u - ADVECTION_SPEED * DT / DX * (u - np.roll(u, 1))


def run(out_dir: Path, config: Config) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    descriptor = f"advection-1d-seed{config.seed}-step{STEP_COUNT}"
    payload_path = Path(f"{descriptor}.h5")
    manifest = Manifest(
        schema_version="1.0.0",
        sim=SimMeta(name="advection-1d-smoke", category="smoke", variant="common-py"),
        stack=StackMeta(name="common-py", version="0.0.0", build_id="phase1-stage1"),
        config=ConfigMeta(
            tier="reference",
            dims=[GRID_N],
            dtype="f64",
            seed=int(config.seed),
            params={"c": ADVECTION_SPEED, "dt": DT, "dx": DX},
        ),
        run=RunMeta(
            step_count=STEP_COUNT,
            capture_interval=CAPTURE_INTERVAL,
            wall_clock_seconds=0.0,
            start_utc=datetime.now(UTC).isoformat(),
        ),
        payload=PayloadMeta(format="hdf5", path=payload_path, checksum=""),
        determinism=DeterminismMeta(
            claimed="bit-exact-same-hw" if config.deterministic else "epsilon",
            atomic_ops=False,
            subgroup_ops=False,
        ),
    )
    writer = Writer(out_dir / f"{descriptor}.json", manifest)
    u = initial_condition(config.seed)
    t0 = time.perf_counter()
    for step in range(STEP_COUNT + 1):
        if step % CAPTURE_INTERVAL == 0:
            writer.write_step(step, StepData(fields={"u": u.copy()}))
        u = step_upwind(u)
    manifest.run.wall_clock_seconds = time.perf_counter() - t0
    writer.finalize()
    return out_dir / f"{descriptor}.json"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="common-py 1D advection smoke sim")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("captures/common-py-smoke"),
    )
    add_args(parser)
    args = parser.parse_args(argv)
    config = from_args(args)
    manifest_path = run(args.out_dir, config)
    print(f"wrote {manifest_path}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

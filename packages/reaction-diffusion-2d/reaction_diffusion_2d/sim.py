"""SimRunner adapters wiring the NumPy reference into testkit protocols.

Phase 0 strategy (per Block 8 dispatch directive): the Python NumPy
reference is the load-bearing oracle, and the Stack-B WebGPU
implementation lives at ``packages/reaction-diffusion-2d/src/`` for
local-with-GPU validation (Phase 1+ exercises it in CI). The
acceptance tests under ``packages/reaction-diffusion-2d/tests/`` drive
this module, not the TypeScript code; the canonical capture
``captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}``
is produced by ``sim_runner_seeded(seed=42, ...)`` here.

Exports:
    sim_runner_seeded(seed, out_dir) -> Path
        SimRunner protocol (Block 3 / testkit determinism harness).
    sim_runner_pbt(initial_condition, out_dir) -> Path
        SimRunnerPBT protocol (Block 3 / testkit property harness).
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
from typing import Any

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference.gray_scott_numpy import (
    CANONICAL_DESCRIPTOR,
    CANONICAL_STEP_COUNT,
    GrayScottParams,
    canonical_params,
    initial_condition,
    step,
)

_CAPTURE_INTERVAL_SEEDED = 200  # records 11 frames over 2000 steps
_CAPTURE_INTERVAL_PBT = 5  # PBT runs are short; capture half the frames
_PBT_STEPS = 10
_PBT_GRID = 32  # 32x32 is fast (≤ ~10ms / run) and still resolves the BCs


def _manifest(
    params: GrayScottParams,
    payload_name: str,
    seed: int,
    step_count: int,
    capture_interval: int,
    *,
    variant: str = "gray-scott",
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "reaction-diffusion-2d",
            "category": "continuous-ca",
            "variant": variant,
        },
        stack={"name": "numpy-reference", "version": "0.0.1", "build_id": "phase-0"},
        config={
            "tier": "test",
            "dims": [params.n, params.n],
            "dtype": "f64",
            "seed": seed,
            "params": {
                "Du": params.Du,
                "Dv": params.Dv,
                "F": params.F,
                "k": params.k,
                "dx": params.dx,
                "dt": params.dt,
            },
        },
        run={
            "step_count": step_count,
            "capture_interval": capture_interval,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-19T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": payload_name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _evolve_to_states(
    params: GrayScottParams,
    seed: int,
    n_steps: int,
    capture_interval: int,
) -> Iterable[StepState]:
    """Evolve the NumPy reference and yield `StepState`s at the capture cadence.

    Identical numerical content to ``reference.gray_scott_numpy.evolve``;
    we re-implement here so each emitted snapshot uses fresh copies in a
    single pass (avoids the harness having to handle generator semantics
    around `write_capture`).
    """
    u, v = initial_condition(params, seed)
    yield StepState(
        step=0,
        state={"U": u.copy(), "V": v.copy()},
        diagnostics={
            "mass_U": float(np.sum(u)),
            "mass_V": float(np.sum(v)),
        },
    )
    for i in range(1, n_steps + 1):
        u, v = step(u, v, params)
        if i % capture_interval == 0 or i == n_steps:
            yield StepState(
                step=i,
                state={"U": u.copy(), "V": v.copy()},
                diagnostics={
                    "mass_U": float(np.sum(u)),
                    "mass_V": float(np.sum(v)),
                },
            )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Block-3 ``SimRunner`` protocol — produces the canonical descriptor capture.

    Always runs the locked canonical parameters (F=0.0367, k=0.0649,
    Du=0.16, Dv=0.08, dx=1, dt=1, n=128, 2000 steps); only ``seed`` and
    ``out_dir`` vary. The ``determinism.run_twice_and_diff`` harness
    invokes this twice at the same seed and asserts byte-equality.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    params = canonical_params()
    payload_name = f"{CANONICAL_DESCRIPTOR}.h5"
    manifest = _manifest(
        params,
        payload_name=payload_name,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=_CAPTURE_INTERVAL_SEEDED,
    )
    manifest_path: Path = write_capture(
        _evolve_to_states(params, seed, CANONICAL_STEP_COUNT, _CAPTURE_INTERVAL_SEEDED),
        manifest,
        out_dir,
    )
    return manifest_path


def _pbt_initial_condition(sample: Any, params: GrayScottParams) -> tuple[np.ndarray, np.ndarray]:
    """Build a 2-D RD-2D IC from a Hypothesis-generated sample.

    The PBT strategy ``smooth_scalar_field_in_unit_box(shape=(16,))``
    yields a 1-D smooth scalar profile. Tile it into 2-D for U and use
    a phase-shifted copy for V so the system has nontrivial reactive
    structure across both species. Values are clipped to [0, 1] which
    is the prescribed monotone-bound on Gray-Scott species.
    """
    profile = np.asarray(sample, dtype=np.float64)
    if profile.ndim != 1:
        raise ValueError(f"pbt strategy produced shape {profile.shape}; expected 1-D")
    n_src = profile.size
    n = params.n
    # Linearly tile/interpolate to params.n on both axes.
    idx = np.linspace(0, n_src - 1, n)
    base = np.interp(idx, np.arange(n_src), profile)
    u = np.tile(base, (n, 1))
    v = np.tile(np.roll(base, n // 4), (n, 1)).T
    np.clip(u, 0.0, 1.0, out=u)
    np.clip(v, 0.0, 1.0, out=v)
    return u, v


def _evolve_from_ic(
    u0: np.ndarray,
    v0: np.ndarray,
    params: GrayScottParams,
    n_steps: int,
    capture_interval: int,
) -> Iterable[StepState]:
    u = u0.copy()
    v = v0.copy()
    yield StepState(step=0, state={"U": u.copy(), "V": v.copy()}, diagnostics={})
    for i in range(1, n_steps + 1):
        u, v = step(u, v, params)
        if i % capture_interval == 0 or i == n_steps:
            yield StepState(step=i, state={"U": u.copy(), "V": v.copy()}, diagnostics={})


def sim_runner_pbt(initial_condition_sample: Any, out_dir: Path) -> Path:
    """Block-3 ``SimRunnerPBT`` protocol — runs a tiny RD-2D from a PBT IC.

    PBT runs are *short* (10 steps, 32x32) so the property harness can
    afford ``n_examples = 20`` without burning CI budget. The canonical
    capture (2000 steps, 128x128) is produced exclusively by
    ``sim_runner_seeded``.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    base = canonical_params()
    params = GrayScottParams(
        n=_PBT_GRID,
        Du=base.Du,
        Dv=base.Dv,
        F=base.F,
        k=base.k,
        dx=base.dx,
        dt=base.dt,
    )
    u0, v0 = _pbt_initial_condition(initial_condition_sample, params)
    payload_name = "rd-2d-pbt.h5"
    manifest = _manifest(
        params,
        payload_name=payload_name,
        seed=0,
        step_count=_PBT_STEPS,
        capture_interval=_CAPTURE_INTERVAL_PBT,
        variant="gray-scott-pbt",
    )
    manifest_path: Path = write_capture(
        _evolve_from_ic(u0, v0, params, _PBT_STEPS, _CAPTURE_INTERVAL_PBT),
        manifest,
        out_dir,
    )
    return manifest_path

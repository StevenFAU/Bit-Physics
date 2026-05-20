"""SimRunner adapter — reaction-diffusion-3d canonical capture.

Determinism strategy (charter § 1.5 — load-bearing; cited in the
continuous-CA-rd3d-stage-1 commit message footer):

1. **Stencil writes are per-cell from read-only neighbors.** The 7-point
   Laplacian at :func:`reaction_diffusion_3d.reference._laplacian_7point`
   is built from six ``np.roll`` terms minus 6× the centre field, then
   multiplied by a scalar. Every cell's update reads only its six
   immediate neighbors in the prior-step array (which is left immutable
   by ``np.roll``); no atomic scatter, no read-after-write hazard, no
   bucket-order leakage. This is the canonical Stack-C invariant from
   ``docs/sim-specs/continuous-ca/reaction-diffusion-3d/determinism.md``
   row 1, satisfied for free under NumPy's eager array semantics.

2. **No global reductions per step.** The Gray-Scott update is fully
   pointwise after the Laplacian is materialized; the only reduction in
   the canonical descriptor path is the per-step ``np.sum(u)`` /
   ``np.sum(v)`` diagnostic written into the capture's
   ``diagnostics`` group — a left-to-right deterministic traversal in
   NumPy's C implementation. No ``np.add.at`` over unsorted indices,
   no parallel reduction-tree.

3. **No stochastic operations inside the step.** The Pearson-1993
   λ-region update is fully deterministic given the IC; the only RNG
   draw is the seeded uniform perturbation in
   :func:`reaction_diffusion_3d.reference.initial_condition`, which
   threads through ``numpy.random.default_rng(seed)``. Bare
   ``numpy.random.*`` global-state APIs are banned in
   ``reaction_diffusion_3d.reference`` / ``.sim`` (RD-3D charter § 1.5
   clause 1) so the per-process RNG state cannot leak between
   invocations of ``sim_runner_seeded``.

4. **Periodic BCs are implemented via ``np.roll``** rather than via a
   ghost-zone copy + slice, eliminating an entire class of off-by-one
   stencil bugs (P23 playbook entry § 1) and keeping the operation
   shape stable across grid sizes — important for the MMS-pipeline
   refinement ladder.

5. **No BLAS / FMA path inside the kernel.** The step is elementwise
   addition / multiplication; NumPy's default BLAS configuration is
   never invoked. FMA fusion at the elementwise level is left at the
   compiler's default (typically unfused under glibc + GCC); if a
   future platform's compile alters fusion, the spec § 2.6
   same-stack-different-hw ``epsilon`` row absorbs it. Same-stack
   same-hardware stays bit-exact under this kernel.

6. **Capture ordering is deterministic.** The capture cadence
   (every ``_CANONICAL_CAPTURE_INTERVAL`` steps, plus the final step)
   is fixed across invocations; ``write_capture`` writes step groups
   in iteration order; ``h5py``'s default ordering is preserved.

7. **Deferred to Phase 2+:** Stack-C C++ / Vulkan compute-shader path
   per RD-3D ``determinism.md`` row 4 (driver/vendor FMA fusion is the
   one residual cross-vendor concern there; the Python NumPy reference
   shipped at THIS sub-phase has no such surface). Vulkan subgroup-
   collective ops (``determinism.md`` row 2) are n/a for the 7-point
   stencil and remain n/a for the Phase-2+ port.

Per spec § 2.5 the resulting claim is ``bit-exact-same-stack-same-hw``;
gate 11 (``test_run_twice_bit_exact``) witnesses it against the
Appendix D § D.2.3 descriptor
``gray-scott-lambda-64cube-seed42-step2000``.
"""

from __future__ import annotations

import time
from collections.abc import Iterable
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference import (
    CANONICAL_DESCRIPTOR,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT,
    Array3D,
    canonical_params,
    gray_scott_step_with_source,
    initial_condition,
)

_CANONICAL_CAPTURE_INTERVAL: Final[int] = 200  # 11 frames over 2000 steps,
# mirrors RD-2D's cadence so the diagnostic harness sees a comparable
# number of snapshots per canonical descriptor.


def _build_manifest(
    *,
    descriptor: str,
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
) -> CaptureManifest:
    p = canonical_params()
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "reaction-diffusion-3d",
            "category": "continuous-ca",
            "variant": "gray-scott-lambda",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-continuous-ca-rd3d",
        },
        config={
            "tier": "test",
            "dims": [int(p["n"]), int(p["n"]), int(p["n"])],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "Du": p["Du"],
                "Dv": p["Dv"],
                "F": p["F"],
                "k": p["k"],
                "dx": p["dx"],
                "dt": p["dt"],
                "n": int(p["n"]),
            },
        },
        run={
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-20T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": f"{descriptor}.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _evolve_to_step_states(
    seed: int,
    step_count: int,
    capture_interval: int,
) -> Iterable[StepState]:
    """Evolve the canonical IC and yield ``StepState``s at the capture cadence."""
    params = canonical_params()
    u, v = initial_condition(params, seed)
    yield StepState(
        step=0,
        state={"U": u.copy(), "V": v.copy()},
        diagnostics={
            "mass_U": float(np.sum(u)),
            "mass_V": float(np.sum(v)),
        },
    )
    for i in range(1, step_count + 1):
        u, v = gray_scott_step_with_source(u, v, params, source=None)
        if i % capture_interval == 0 or i == step_count:
            yield StepState(
                step=i,
                state={"U": u.copy(), "V": v.copy()},
                diagnostics={
                    "mass_U": float(np.sum(u)),
                    "mass_V": float(np.sum(v)),
                },
            )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produces the canonical RD-3D capture.

    Spec descriptor (Appendix D § D.2.3):
    ``gray-scott-lambda-64cube-seed42-step2000``.

    Always runs the locked Pearson-1993 λ-region parameters; only
    ``seed`` and ``out_dir`` vary. The ``determinism.run_twice_and_diff``
    harness invokes this twice at the same seed and asserts byte
    equality (gate 11).
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    states = list(
        _evolve_to_step_states(
            seed=seed,
            step_count=CANONICAL_STEP_COUNT,
            capture_interval=_CANONICAL_CAPTURE_INTERVAL,
        )
    )
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=CANONICAL_DESCRIPTOR,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=_CANONICAL_CAPTURE_INTERVAL,
        wall_clock_seconds=wall,
    )
    return write_capture(states, manifest, out_dir)


def compute_canonical_trajectory(
    *,
    seed: int = CANONICAL_SEED,
    n_steps: int = CANONICAL_STEP_COUNT,
    capture_interval: int = _CANONICAL_CAPTURE_INTERVAL,
) -> tuple[list[int], list[Array3D], list[Array3D]]:
    """In-memory canonical trajectory (no I/O).

    Used by ``test_diagnostics`` to inspect U / V fields without
    round-tripping through HDF5. Returns ``(step_indices, u_history,
    v_history)`` in capture-cadence order (step 0, then every
    ``capture_interval`` steps, plus the final step).
    """
    params = canonical_params()
    u, v = initial_condition(params, seed)
    step_indices: list[int] = [0]
    u_hist: list[Array3D] = [u.copy()]
    v_hist: list[Array3D] = [v.copy()]
    for i in range(1, int(n_steps) + 1):
        u, v = gray_scott_step_with_source(u, v, params, source=None)
        if i % capture_interval == 0 or i == int(n_steps):
            step_indices.append(i)
            u_hist.append(u.copy())
            v_hist.append(v.copy())
    return step_indices, u_hist, v_hist


__all__ = [
    "compute_canonical_trajectory",
    "sim_runner_seeded",
]

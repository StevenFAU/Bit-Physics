"""Subsystem 7 — the ``hello-warp`` smoke simulator (phase-2 plan §1.9.1).

A 2D advection-diffusion smoke sim on a 64x64 periodic grid: a localized
Gaussian density blob decays under explicit FTCS diffusion + first-order
upwind advection (both dissipative). The canonical trajectory is
**bounded + monotonically decaying** — max-field 1.0 -> ~0.219 over 400
steps, mass conserved under periodic BC (Stage-0 Task 0.6 design check;
the laminar opposite of the chaotic Taylor-Green Stack-D smoke port).

**W-3 "exercises every public API surface."** The sim consumes the
Subsystem-1 Runtime (:func:`common_warp.init`), Subsystem-3 Determinism
(:func:`common_warp.set_seed` + :func:`common_warp.deterministic_context`),
Subsystem-2 Capture (:func:`common_warp.write_capture`), and Subsystem-5
Grids (:class:`common_warp.ScalarField3D` /
:func:`common_warp.allocate_scalar_field`). Subsystems 4 (Particles) and 6
(HashGrid) are exercised via their own unit tests rather than forced into a
grid sim that does not naturally use them (Stage-0 S0-W1 W-3 tension note;
Stage-1c decision — exercise-via-unit-tests, documented in the checkpoint):
a pure 2D grid advection-diffusion has no particles or neighbor queries, and
augmenting them in would dilute the smoke sim. W-3 reads as
"exercises every public subsystem" collectively across the test suite.

**Determinism (D4 / W-2).** No RNG (analytic Gaussian IC; Warp has no global
RNG seed anyway), no atomics — every cell update is a per-cell stencil
*gather* from an immutable prior-step buffer (double-buffered ``cur``/``nxt``,
swapped each step). On Warp's CPU backend ``wp.launch`` runs serially over
the launch dimension, so the f32 field evolution is bit-identical
run-to-run (``bit-exact-same-hw``). ``set_seed`` is recorded in the manifest
for the contract even though the kernel consumes no RNG.

**Banked precedent #7 / O-W7.** The pure-literal ``4.0`` Laplacian-centre
coefficient is seeded ``wp.float32(4.0)`` (explicit dtype; Warp infers bare
numeric literals as f32 in ``@wp.kernel`` — seed defensively). The
diffusion / Courant coefficients are passed as ``wp.float32`` kernel args.
No kernel-local mutable ints are needed (the periodic-wrap indices are
computed once), so the O-W7 ``int(0)`` idiom does not apply here.

**O-W1.** "Capture" here is the project HDF5 capture I/O (Subsystem 2), NOT
``wp.capture_*`` CUDA-graph capture.

Kernel-defining module: omits ``from __future__ import annotations`` so the
``@wp.kernel`` argument annotations (``wp.array3d`` / ``wp.int32`` /
``wp.float32``) resolve at decoration time — the defensive posture mirrored
from ``tools/testkit/taichi_harness`` (Warp 1.13.0 tolerates PEP-563 per
O-W6, but the kernel module stays conservative).
"""

import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import warp as wp

import common_warp
from common_warp.capture.model import diagnostics_key, state_key

#: Stage-0 Task 0.6 canonical design parameters (bounded-decaying verified).
N_DEFAULT = 64
DIFFUSION = 0.10  # D — diffusion coefficient
VELOCITY = (0.5, 0.3)  # U = (ux, uy) — small constant advection (cells/time)
DT = 0.5
DX = 1.0
STEPS_DEFAULT = 400
CAPTURE_INTERVAL_DEFAULT = 40  # 11 frames over 400 steps (0, 40, ..., 400)
SEED_DEFAULT = 42

#: Capture descriptor (Stage-0 Task 0.6 naming; documented in the checkpoint).
DESCRIPTOR_DEFAULT = "hello-warp-adv-diff-64sq-seed42-step400"

_STACK = {
    "name": "warp-stack-e",
    "version": common_warp.__version__,
    "build_id": "sub-phase-common-warp-bootstrap",
}


@wp.kernel
def _advect_diffuse_step(
    cur: wp.array3d(dtype=wp.float32),
    nxt: wp.array3d(dtype=wp.float32),
    n: wp.int32,
    diff: wp.float32,  # D * dt / dx^2  (diffusion number)
    cx: wp.float32,  # ux * dt / dx     (Courant x; > 0 -> upwind backward)
    cy: wp.float32,  # uy * dt / dx     (Courant y; > 0 -> upwind backward)
):
    """One explicit FTCS-diffusion + first-order-upwind-advection step.

    Per-cell gather from ``cur`` (immutable this launch) into ``nxt``;
    periodic wrap via floored modulo. No scatter, no atomics -> determinism.
    """
    i, j = wp.tid()
    ip = (i + 1) % n
    im = (i - 1 + n) % n
    jp = (j + 1) % n
    jm = (j - 1 + n) % n
    c = cur[i, j, 0]
    lap = cur[ip, j, 0] + cur[im, j, 0] + cur[i, jp, 0] + cur[i, jm, 0] - wp.float32(4.0) * c
    # Upwind for positive (ux, uy): backward differences (c - upstream).
    adv = cx * (c - cur[im, j, 0]) + cy * (c - cur[i, jm, 0])
    nxt[i, j, 0] = c + diff * lap - adv


@dataclass
class HelloResult:
    """Outcome of :func:`run_hello_sim`."""

    max_history: list[float] = field(default_factory=list)  # per-step max (len steps+1)
    step_indices: list[int] = field(default_factory=list)  # captured frame steps
    mass_history: list[float] = field(default_factory=list)  # mass at each captured frame
    final_field: np.ndarray | None = None  # (N, N, 1) f32 final density
    capture_path: Path | None = None  # manifest .json path if a capture was written


def _gaussian_ic(n: int) -> np.ndarray:
    """Localized Gaussian bump, sigma = n/12, centered, peak normalized to 1.0."""
    idx = np.arange(n, dtype=np.float64)
    center = n / 2.0
    sigma = n / 12.0
    x, y = np.meshgrid(idx, idx, indexing="ij")
    bump = np.exp(-((x - center) ** 2 + (y - center) ** 2) / (2.0 * sigma**2))
    return (bump / bump.max()).reshape(n, n, 1)


def _build_capture(
    *,
    descriptor: str,
    seed: int,
    n: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
    frames: list[tuple[int, np.ndarray, float, float]],
) -> common_warp.Capture:
    """Assemble a §1.9.1 ``Capture`` (manifest + flat payload) for the run."""
    manifest = {
        "schema_version": "1.0.0",
        "sim": {
            "name": "hello-warp",
            "category": "smoke",
            "variant": "advection-diffusion-2d-upwind-ftcs",
        },
        "stack": dict(_STACK),
        "config": {
            "tier": "smoke",
            "dims": [int(n), int(n)],
            "dtype": "f32",
            "seed": int(seed),
            "params": {
                "diffusion": float(DIFFUSION),
                "velocity_x": float(VELOCITY[0]),
                "velocity_y": float(VELOCITY[1]),
                "dt": float(DT),
                "dx": float(DX),
                "n": int(n),
            },
        },
        "run": {
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-24T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }
    payload: dict[str, np.ndarray] = {}
    for step, density, max_field, mass in frames:
        payload[state_key(step, "density")] = density
        payload[diagnostics_key(step, "max_field")] = np.float64(max_field)
        payload[diagnostics_key(step, "mass")] = np.float64(mass)
    return common_warp.Capture(manifest=manifest, payload=payload)


def run_hello_sim(
    out_dir: str | Path | None = None,
    *,
    n: int = N_DEFAULT,
    steps: int = STEPS_DEFAULT,
    capture_interval: int = CAPTURE_INTERVAL_DEFAULT,
    seed: int = SEED_DEFAULT,
    device: str = "cpu",
    descriptor: str = DESCRIPTOR_DEFAULT,
) -> HelloResult:
    """Run the 2D advection-diffusion smoke sim; optionally write a capture.

    Returns a :class:`HelloResult` with the per-step max-field history (the
    bounded-decaying trajectory), the captured-frame mass history, the final
    density field, and — when ``out_dir`` is given — the written manifest
    ``.json`` path.
    """
    common_warp.init(device, deterministic=True)
    common_warp.set_seed(seed)

    diff_num = DIFFUSION * DT / (DX * DX)
    courant_x = VELOCITY[0] * DT / DX
    courant_y = VELOCITY[1] * DT / DX

    cur = common_warp.allocate_scalar_field((n, n, 1), spacing=(DX, DX, DX), device=device)
    nxt = common_warp.allocate_scalar_field((n, n, 1), spacing=(DX, DX, DX), device=device)
    cur.data.assign(np.ascontiguousarray(_gaussian_ic(n), dtype=np.float32))

    result = HelloResult()
    frames: list[tuple[int, np.ndarray, float, float]] = []

    def _record(step: int) -> float:
        arr = cur.data.numpy()
        m = float(arr.astype(np.float64).max())
        if step % capture_interval == 0 or step == steps:
            mass = float(arr.astype(np.float64).sum())
            frames.append((step, arr.copy(), m, mass))
            result.step_indices.append(step)
            result.mass_history.append(mass)
        return m

    t0 = time.perf_counter()
    with wp.ScopedDevice(device):
        result.max_history.append(_record(0))
        for step in range(1, steps + 1):
            wp.launch(
                _advect_diffuse_step,
                dim=(n, n),
                inputs=[
                    cur.data,
                    nxt.data,
                    wp.int32(n),
                    wp.float32(diff_num),
                    wp.float32(courant_x),
                    wp.float32(courant_y),
                ],
            )
            cur.data, nxt.data = nxt.data, cur.data  # double-buffer swap (gather, no scatter)
            result.max_history.append(_record(step))
        wp.synchronize()
    wall = time.perf_counter() - t0

    result.final_field = cur.data.numpy()

    if out_dir is not None:
        out = Path(out_dir)
        out.mkdir(parents=True, exist_ok=True)
        capture = _build_capture(
            descriptor=descriptor,
            seed=seed,
            n=n,
            step_count=steps,
            capture_interval=capture_interval,
            wall_clock_seconds=wall,
            frames=frames,
        )
        common_warp.write_capture(capture, out / descriptor)
        result.capture_path = out / f"{descriptor}.json"

    return result


def hello_sim_runner(seed: int, out_dir: Path) -> Path:
    """SimRunner-protocol adapter (testkit ``run_twice_and_diff`` / W-5).

    Produces the canonical ``hello-warp`` capture under ``out_dir`` and
    returns the manifest ``.json`` path (the protocol's contract).
    """
    res = run_hello_sim(out_dir, seed=seed)
    if res.capture_path is None:  # pragma: no cover — out_dir is always given here
        raise RuntimeError("hello_sim_runner: capture was not written")
    return res.capture_path


def main() -> None:  # pragma: no cover — manual / demo entry point
    """Run the canonical smoke sim and write its capture under examples/hello/captures/."""
    out = Path(__file__).resolve().parent / "captures"
    res = run_hello_sim(out)
    print(f"hello-warp: max 1.0 -> {res.max_history[-1]:.6f} over {STEPS_DEFAULT} steps")
    print(f"capture: {res.capture_path}")


if __name__ == "__main__":  # pragma: no cover
    main()

"""``export_capture_to_usd`` — write a captured trajectory to USD animation (§4.2.D)."""

from __future__ import annotations

import re

import numpy as np

from ..capture import read_capture

_PXR_MISSING_MSG = (
    "OpenUSD (`usd-core`) is required for USD export. Install with "
    "`uv pip install usd-core` (pinned in common-warp's `usd` extra). USD is "
    "CPU-only — no CUDA required."
)

_STATE_KEY_RE = re.compile(r"^steps/(\d+)/state/(.+)$")


def _discover_frames(
    payload: dict[str, np.ndarray],
) -> tuple[list[int], dict[str, dict[int, np.ndarray]]]:
    """Group payload state arrays by field name and step index."""
    by_field: dict[str, dict[int, np.ndarray]] = {}
    steps: set[int] = set()
    for key, arr in payload.items():
        m = _STATE_KEY_RE.match(key)
        if not m:
            continue
        step, field_name = int(m.group(1)), m.group(2)
        steps.add(step)
        by_field.setdefault(field_name, {})[step] = np.asarray(arr)
    return sorted(steps), by_field


def _pick_field(by_field: dict[str, dict[int, np.ndarray]], last_dim: int) -> str | None:
    """First field whose per-step arrays are 2-D with the given last dimension."""
    for name, per_step in sorted(by_field.items()):
        sample = next(iter(per_step.values()))
        if sample.ndim == 2 and sample.shape[1] == last_dim:
            return name
    return None


def export_capture_to_usd(
    capture_path: str,
    output_path: str,
    *,
    fps: float = 60.0,
) -> None:
    """Write a captured rigid-body trajectory to a USD animation (Omniverse/Houdini).

    Reads ``<capture_path>.h5`` + ``.json`` (``common_warp.read_capture``),
    discovers a per-body position field (shape ``(N, 3)``) and, if present, an
    orientation field (``(N, 4)`` quaternions), and writes a time-sampled
    ``UsdGeom.Xform`` per body. Frame ``k`` maps to USD timecode ``k`` at
    ``timeCodesPerSecond = fps``.
    """
    try:
        from pxr import Gf, Usd, UsdGeom
    except ImportError as exc:  # pragma: no cover - environment-dependent
        raise RuntimeError(_PXR_MISSING_MSG) from exc

    capture = read_capture(capture_path)
    steps, by_field = _discover_frames(capture.payload)
    if not steps:
        raise ValueError(f"{capture_path}: capture has no per-step state arrays to export")

    pos_field = _pick_field(by_field, 3)
    if pos_field is None:
        raise ValueError(
            f"{capture_path}: no (N, 3) position field found; available fields: {sorted(by_field)}"
        )
    quat_field = _pick_field(by_field, 4)

    n_bodies = int(next(iter(by_field[pos_field].values())).shape[0])
    stage = Usd.Stage.CreateNew(output_path)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    stage.SetTimeCodesPerSecond(fps)
    stage.SetStartTimeCode(float(steps[0]))
    stage.SetEndTimeCode(float(steps[-1]))
    world = UsdGeom.Xform.Define(stage, "/World")
    stage.SetDefaultPrim(world.GetPrim())

    xforms = []
    for i in range(n_bodies):
        xf = UsdGeom.Xform.Define(stage, f"/World/body_{i}")
        xforms.append((xf.AddTranslateOp(), xf.AddOrientOp() if quat_field else None))

    for step in steps:
        positions = by_field[pos_field][step]
        quats = by_field[quat_field][step] if quat_field else None
        tc = Usd.TimeCode(float(step))
        for i in range(n_bodies):
            translate_op, orient_op = xforms[i]
            p = positions[i]
            translate_op.Set(Gf.Vec3d(float(p[0]), float(p[1]), float(p[2])), tc)
            if orient_op is not None and quats is not None:
                q = quats[i]  # wxyz convention (portfolio Gaussian/rigid convention)
                orient_op.Set(Gf.Quatf(float(q[0]), float(q[1]), float(q[2]), float(q[3])), tc)

    stage.GetRootLayer().Save()

"""``create_scene_template`` — generate a USD rigid-body scene template (§4.2.D)."""

from __future__ import annotations

_PXR_MISSING_MSG = (
    "OpenUSD (`usd-core`) is required for USD scene templates. Install with "
    "`uv pip install usd-core` (pinned in common-warp's `usd` extra). USD is "
    "CPU-only — no CUDA required."
)


def create_scene_template(
    *,
    output_path: str,
    ground_plane: bool = True,
    gravity: tuple[float, float, float] = (0.0, -9.81, 0.0),
    units: str = "meters",
    up_axis: str = "Y",
) -> None:
    """Write a USD scene template with portfolio rigid-body defaults (§4.2.P).

    Defaults: meters, Y-up (matches OpenUSD + ``docs/portfolio-conventions.md``).
    Adds a ``UsdPhysics.Scene`` carrying the gravity vector and (optionally) a
    ground-plane mesh.
    """
    try:
        from pxr import Gf, Usd, UsdGeom, UsdPhysics
    except ImportError as exc:  # pragma: no cover - environment-dependent
        raise RuntimeError(_PXR_MISSING_MSG) from exc

    if up_axis not in ("Y", "Z"):
        raise ValueError(f"up_axis must be 'Y' or 'Z'; got {up_axis!r}")
    if units != "meters":
        raise ValueError(f"only 'meters' is supported (§4.2.P); got {units!r}")

    stage = Usd.Stage.CreateNew(output_path)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y if up_axis == "Y" else UsdGeom.Tokens.z)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    world = UsdGeom.Xform.Define(stage, "/World")
    stage.SetDefaultPrim(world.GetPrim())

    scene = UsdPhysics.Scene.Define(stage, "/World/physicsScene")
    g = Gf.Vec3f(*gravity)
    magnitude = float(g.GetLength())
    direction = Gf.Vec3f(0.0, -1.0, 0.0) if magnitude == 0.0 else (g / magnitude)
    scene.CreateGravityDirectionAttr().Set(direction)
    scene.CreateGravityMagnitudeAttr().Set(magnitude)

    if ground_plane:
        plane = UsdGeom.Mesh.Define(stage, "/World/groundPlane")
        s = 50.0
        plane.CreatePointsAttr(
            [Gf.Vec3f(-s, 0, -s), Gf.Vec3f(s, 0, -s), Gf.Vec3f(s, 0, s), Gf.Vec3f(-s, 0, s)]
        )
        plane.CreateFaceVertexCountsAttr([4])
        plane.CreateFaceVertexIndicesAttr([0, 1, 2, 3])
        UsdPhysics.CollisionAPI.Apply(plane.GetPrim())

    stage.GetRootLayer().Save()

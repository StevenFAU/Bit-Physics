"""SimRunner adapter — lbm-multiphase canonical gate captures + web assets.

Determinism strategy (the fdtd-optics posture, spec
`docs/sim-specs/lattice/lbm-multiphase/spec-ref.md` § 6.2):

1. **Pure grid solver.** Two-buffer pull streaming + fused collide is
   grid->grid elementwise NumPy — no scatter, no atomics, no reduction-order
   nondeterminism (all i-sums are pinned sequential accumulation).
2. **No RNG, no runtime transcendentals.** ICs are committed f64 fields;
   Tier-A psi is the committed LUT; Tier-B psi is polynomial+sqrt.
3. **Fixed step count, fixed checkpoints** per scene.
4. ``run_canonical`` runs each gate scene TWICE and asserts bit-identity
   before returning; the committed reference-blob sha256 values are pinned
   below and re-asserted by the tests AND by the deploy gate
   (`tools/productization/web-deploy/verify.py` `_gate_lbm_multiphase`).
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Final

import numpy as np

from .reference import MultiphaseScene, SceneResult, run_scene

WEB_PUBLIC: Final[Path] = Path(__file__).resolve().parents[1] / "web" / "public"

#: C-S critical temperature (f64, from thermo.cs_critical_point(); pinned as
#: a literal so scene definitions are import-time constants — the tests
#: re-derive it and assert equality).
T_C_CS: Final[float] = 0.09432870314880763

GATE_DESCRIPTOR: Final[str] = "flatA128x8+dropletB128-step2000"

#: sha256 of the committed f64 reference blobs (checkpoints x [rho,ux,uy] x
#: grid f64 row-major (i*ny+j), little-endian) — recomputed and pinned at
#: package build; any numeric drift in the NORMATIVE solver breaks these.
REFERENCE_SHA256: Final[dict[str, str]] = {
    "flat": "0a116e2dc9d7215cf09be9424ee209c2c2dfc6c757be44bef6636c361c19c149",
    "droplet": "89337be5e0ac719e275d6f167681b1ce96640c029dc16cbebcf1e1c8d7a49acb",
}

#: no-separation control scene length (negative control ii, browser + f64)
NOSEP_SCENE_STEPS: Final[int] = 3000

#: coexistence/tau-sweep protocol length (MEASURED: 12000 steps returns the
#: equilibrium coexistence to 0.006%/0.017% of Maxwell with tau-spread
#: 4.8e-5; the 2000-step trajectory window still carries a 0.44% reseed
#: transient — see goldens.py provenance)
COEX_SCENE_STEPS: Final[int] = 12000

_FIELDS: Final[tuple[str, str, str]] = ("rho", "ux", "uy")

GATE_FLAT_A: Final[MultiphaseScene] = MultiphaseScene(
    name="gate-flatA",
    nx=128,
    ny=8,
    psi_kind="exp-lut",
    g=-9.0,
    tau=1.0,
    forcing="guo",
    steps=2000,
    checkpoints=(200, 800, 2000),
    rho_ic=np.zeros((0, 0)),  # bound to the committed IC at run time
)

GATE_DROP_B: Final[MultiphaseScene] = MultiphaseScene(
    name="gate-dropletB",
    nx=128,
    ny=128,
    psi_kind="cs",
    g=-3.0,
    tau=0.8,
    forcing="li-sigma",
    sigma=0.105,
    cs_temp=0.8 * T_C_CS,
    steps=2000,
    checkpoints=(200, 800, 2000),
    rho_ic=np.zeros((0, 0)),
)


def gate_scene_defs() -> dict:
    """JSON-able gate-scene parameter block (manifest + sidecars)."""

    def d(s: MultiphaseScene) -> dict:
        return {
            "name": s.name,
            "nx": s.nx,
            "ny": s.ny,
            "psi_kind": s.psi_kind,
            "G": s.g,
            "tau": s.tau,
            "forcing": s.forcing,
            "sigma": s.sigma,
            "cs_temp": s.cs_temp,
            "steps": s.steps,
            "checkpoints": list(s.checkpoints),
        }

    return {
        "descriptor": GATE_DESCRIPTOR,
        "flat": d(GATE_FLAT_A),
        "droplet": d(GATE_DROP_B),
        "nosep_steps": NOSEP_SCENE_STEPS,
        "coex_steps": COEX_SCENE_STEPS,
        # droplet pointwise gating stops at 800: late-time pointwise fields
        # near interfaces are divergence-prone (measured f32 proxy: 1.8e-3
        # by step 2000 vs 6.8e-4 at 800); step 2000 is gated by observables
        # (spurious ceiling) and PROVE-displayed, not pointwise-gated.
        "pointwise_checkpoints": {"flat": [200, 800, 2000], "droplet": [200, 800]},
        "field_order": list(_FIELDS),
        "layout": "checkpoints x fields[rho,ux,uy] x grid f64 row-major (i*ny+j), little-endian",
    }


def load_ic(name: str, nx: int, ny: int) -> np.ndarray:
    """Load a committed f64 IC field from web/public."""
    raw = (WEB_PUBLIC / name).read_bytes()
    arr = np.frombuffer(raw, dtype=np.float64).copy()
    if arr.size != nx * ny:
        raise ValueError(f"{name}: expected {nx * ny} f64, got {arr.size}")
    return arr.reshape(nx, ny)


def _bind_ic(scene: MultiphaseScene, ic: np.ndarray) -> MultiphaseScene:
    from dataclasses import replace

    return replace(scene, rho_ic=ic)


def checkpoint_blob(res: SceneResult, scene: MultiphaseScene) -> bytes:
    """Committed byte layout: checkpoint-major, fields [rho, ux, uy], each
    nx*ny f64 row-major (i*ny+j), little-endian."""
    return b"".join(
        np.ascontiguousarray(f, dtype=np.float64).tobytes()
        for step in scene.checkpoints
        for f in res.checkpoints[step]
    )


def run_canonical(
    flat_ic: np.ndarray | None = None,
    drop_ic: np.ndarray | None = None,
    dtype: type = np.float64,
) -> dict[str, SceneResult]:
    """Run both gate scenes TWICE and assert bit-identity before returning
    (the run-twice determinism witness — the witness run IS the capture
    run). Tier-B additionally asserts its psi sqrt-argument stayed positive
    (the no-silent-clamp honesty rule)."""
    flat_ic = (
        flat_ic if flat_ic is not None else load_ic("lbm-gate-ic-flatA.bin", 128, 8)
    )
    drop_ic = (
        drop_ic
        if drop_ic is not None
        else load_ic("lbm-gate-ic-dropletB.bin", 128, 128)
    )
    out: dict[str, SceneResult] = {}
    for key, scene, ic in (
        ("flat", GATE_FLAT_A, flat_ic),
        ("droplet", GATE_DROP_B, drop_ic),
    ):
        bound = _bind_ic(scene, ic.astype(dtype))
        r1 = run_scene(bound, dtype)
        r2 = run_scene(bound, dtype)
        for step in scene.checkpoints:
            for name, a, b in zip(
                _FIELDS, r1.checkpoints[step], r2.checkpoints[step], strict=True
            ):
                if not np.array_equal(a, b):
                    raise AssertionError(
                        f"run-twice bit-identity violated: {key} step {step} field {name}"
                    )
        if not np.array_equal(r1.final_fbar, r2.final_fbar):
            raise AssertionError(f"run-twice bit-identity violated: {key} final state")
        if scene.psi_kind == "cs" and not (r1.psi_min_arg > 0.0):
            raise AssertionError(
                "Tier-B psi sqrt argument went non-positive in a gate scene"
            )
        out[key] = r1
    return out


def write_reference_bins(outdir: Path, res: dict[str, SceneResult]) -> dict[str, dict]:
    """Write the committed f64 reference trajectories; returns {scene:
    {file, sha256}}. Called by goldens.gen_gate_assets; the shas are pinned
    in REFERENCE_SHA256 (regen prints them for re-pinning)."""
    outdir.mkdir(parents=True, exist_ok=True)
    shas: dict[str, dict] = {}
    for key, scene in (("flat", GATE_FLAT_A), ("droplet", GATE_DROP_B)):
        blob = checkpoint_blob(res[key], scene)
        sha = hashlib.sha256(blob).hexdigest()
        fname = f"lbm-gate-{key}-step{scene.steps}.bin"
        (outdir / fname).write_bytes(blob)
        shas[key] = {"file": fname, "sha256": sha}
        pin = REFERENCE_SHA256.get(key)
        status = "OK" if pin == sha else f"RE-PIN NEEDED (pinned {str(pin)[:12]}…)"
        print(f"  reference {key}: {fname} sha={sha} [{status}]")
    return shas


__all__ = [
    "GATE_DESCRIPTOR",
    "GATE_DROP_B",
    "GATE_FLAT_A",
    "NOSEP_SCENE_STEPS",
    "REFERENCE_SHA256",
    "T_C_CS",
    "WEB_PUBLIC",
    "checkpoint_blob",
    "gate_scene_defs",
    "load_ic",
    "run_canonical",
    "write_reference_bins",
]

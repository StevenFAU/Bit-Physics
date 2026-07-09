"""SimRunner adapter — fdtd-optics canonical gate captures + web assets.

Determinism strategy (the heat-equation posture,
`docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md` § 6 G-runtwice):

1. **Pure grid solver.** The TF/SF gate scene is grid->grid elementwise
   NumPy (Yee leapfrog + sliced TF/SF corrections) — no particle scatter,
   no atomics, no reduction-order nondeterminism.
2. **No RNG anywhere.** The source is an analytic Ricker wavelet evaluated
   in f64 at integer steps; the scene is fully pinned by ``GATE_SCENE``.
3. **Fixed step count, fixed checkpoints** (step-index order).
4. ``run_canonical`` runs the scene TWICE and asserts bit-identity before
   returning (the witness run IS the capture run); the committed checkpoint
   blob sha256 is pinned below and re-asserted by the tests.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

import numpy as np

from .reference import GATE_SCENE, TfsfScene, run_tfsf

GATE_DESCRIPTOR: Final[str] = "tfsf-cyl128-eps2.25-step512"

#: sha256 of the f64 gate checkpoint blob (checkpoints 128,256,384,512 x
#: fields [ez,hx,hy] x 128^2 f64 row-major) — recomputed and pinned at
#: package build; any numeric drift in the NORMATIVE solver breaks this.
GATE_CHECKPOINT_SHA256: Final[str] = (
    "e79288dcc59a8de9afa16f64ef9b00a40ecdfca95505f5a48a3284a738a95dc6"
)

_FIELD_NAMES: Final[tuple[str, str, str]] = ("ez", "hx", "hy")


@dataclass
class FdtdResult:
    scene: TfsfScene
    checkpoints: dict[int, tuple[np.ndarray, np.ndarray, np.ndarray]] = field(
        default_factory=dict
    )
    diagnostics: list[dict[str, float]] = field(default_factory=list)
    determinism_witness_sha256: str = ""


def checkpoint_diagnostics(
    res: FdtdResult,
) -> list[dict[str, float]]:
    """Per-checkpoint scalar diagnostics: peak |Ez| and max |Hx|, |Hy| —
    the scalars the f32-proxy tolerance measurement compares (spec § 9)."""
    diags: list[dict[str, float]] = []
    for step in res.scene.checkpoints:
        ez, hx, hy = res.checkpoints[step]
        diags.append(
            {
                "step": float(step),
                "peak_abs_ez": float(np.max(np.abs(ez))),
                "max_abs_hx": float(np.max(np.abs(hx))),
                "max_abs_hy": float(np.max(np.abs(hy))),
            }
        )
    return diags


def checkpoint_blob(res: FdtdResult) -> bytes:
    """Committed byte layout: checkpoint-major, fields [ez, hx, hy], each
    n^2 f64 row-major (i*n+j), little-endian."""
    return b"".join(
        np.ascontiguousarray(f, dtype=np.float64).tobytes()
        for step in res.scene.checkpoints
        for f in res.checkpoints[step]
    )


def run_canonical(
    scene: TfsfScene | None = None, dtype: type = np.float64
) -> FdtdResult:
    """Run the gate scene TWICE and assert bit-identity before returning
    (the § 6 G-runtwice determinism witness — the witness run IS the
    capture run). The witness sha hashes field-major (all ez, all hx,
    all hy) so it stays distinct from the checkpoint-major blob sha."""
    scene = scene or GATE_SCENE
    c1 = run_tfsf(scene, dtype)
    c2 = run_tfsf(scene, dtype)
    for step in scene.checkpoints:
        for name, a, b in zip(_FIELD_NAMES, c1[step], c2[step], strict=True):
            if not np.array_equal(a, b):
                raise AssertionError(
                    f"run-twice bit-identity violated at step {step} field {name}"
                )
    res = FdtdResult(scene=scene, checkpoints=c1)
    res.diagnostics = checkpoint_diagnostics(res)
    h = hashlib.sha256()
    for idx in range(3):
        for step in scene.checkpoints:
            h.update(np.ascontiguousarray(c1[step][idx]).tobytes())
    res.determinism_witness_sha256 = h.hexdigest()
    return res


def write_gate_assets(outdir: Path) -> tuple[Path, Path]:
    """Write the committed web gate assets (bin + sidecar) for the browser
    PROVE layer, mirroring the heat-equation sidecar schema.

    ``<descriptor>.bin``: 4 checkpoints x [ez,hx,hy] x 128^2 f64 row-major
    (i*n+j), little-endian, checkpoint order 128,256,384,512 — 1,572,864
    bytes, sha-pinned against ``GATE_CHECKPOINT_SHA256``.
    """
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    res = run_canonical()
    scene = res.scene
    payload = checkpoint_blob(res)
    sha = hashlib.sha256(payload).hexdigest()
    if sha != GATE_CHECKPOINT_SHA256:
        raise AssertionError(
            f"gate checkpoint sha drifted: {sha} != {GATE_CHECKPOINT_SHA256}"
        )
    stem = "fdtd-gate-tfsf-cyl128-step512"
    bin_path = outdir / f"{stem}.bin"
    bin_path.write_bytes(payload)
    sidecar = {
        "file": bin_path.name,
        "sha256": sha,
        "dtype": "f64",
        "layout": (
            "checkpoints[128,256,384,512] x fields[ez,hx,hy] x 128^2 "
            "row-major (i*n+j), little-endian"
        ),
        "params": {
            "n": scene.n,
            "sc": scene.sc,
            "tfsf_box": {
                "ia": scene.ia,
                "ib": scene.ib,
                "ja": scene.ja,
                "jb": scene.jb,
            },
            "na": scene.na,
            "t0": scene.t0,
            "tau": scene.tau,
            "cylinder": {
                "cx": scene.cx,
                "cy": scene.cy,
                "r": scene.r,
                "eps": scene.eps_cyl,
            },
            "steps": scene.steps,
            "checkpoints": list(scene.checkpoints),
            "descriptor": GATE_DESCRIPTOR,
        },
        "diagnostics": res.diagnostics,
        "determinism_witness_sha256": res.determinism_witness_sha256,
        "source": "packages/fdtd-optics/fdtd_optics/sim.py run_canonical()",
    }
    json_path = outdir / f"{stem}.json"
    json_path.write_text(json.dumps(sidecar, indent=2) + "\n")
    return bin_path, json_path


__all__ = [
    "GATE_CHECKPOINT_SHA256",
    "GATE_DESCRIPTOR",
    "FdtdResult",
    "checkpoint_blob",
    "checkpoint_diagnostics",
    "run_canonical",
    "write_gate_assets",
]

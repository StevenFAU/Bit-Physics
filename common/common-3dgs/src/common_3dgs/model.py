"""``GaussianSplatModel`` — the 3DGS scene data abstraction (§3.2.1).

A Gaussian-splat scene is a set of N anisotropic 3D Gaussians, each carrying a
center, an anisotropic scale, an orientation quaternion, an opacity, and a bank
of spherical-harmonic colour coefficients. State is Warp-array-backed for
Stack-E (GPU-resident) residency, with NumPy accessors for host-side use and
verification.

Field shapes / dtypes (§3.2.1; ``docs/phases/phase-3-plan.md`` §3.2.1):

- ``positions``       — ``(N, 3) float32`` centres in world coordinates.
- ``scales``          — ``(N, 3) float32`` per-axis scales (covariance eigen-diag).
- ``rotations``       — ``(N, 4) float32`` unit quaternions, **wxyz** convention.
- ``opacities``       — ``(N,)  float32`` in ``[0, 1]``.
- ``sh_coefficients`` — ``(N, K, 3) float32`` SH coefficients per RGB channel,
  where ``K = (sh_degree + 1) ** 2`` (degree 3 → ``K = 16``).

The loader/saver speak Inria's .ply 3DGS scene format. The attribute layout is
cited from the vendored ``references/3DGS-reference/scene/gaussian_model.py``
(``construct_list_of_attributes`` / ``save_ply`` / ``load_ply``): per vertex
``x y z  nx ny nz  f_dc_0..2  f_rest_0..3(K-1)-1  opacity  scale_0..2  rot_0..3``,
binary-little-endian float32. Inria stores ``scale_* = log(scale)`` and
``opacity = logit(opacity)``; the loader applies ``exp`` / ``sigmoid``. The
parser is derived independently from that layout (spec § 2.4 symmetric-bug guard).
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
import warp as wp

#: Default spherical-harmonic degree (Inria 3DGS ships degree 3 → K = 16).
SH_DEGREE_DEFAULT = 3


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return np.asarray(1.0 / (1.0 + np.exp(-x)), dtype=np.float64)


def _logit(p: np.ndarray) -> np.ndarray:
    # Inverse sigmoid; clamp away from 0/1 to keep the log finite.
    p = np.clip(p, 1e-7, 1.0 - 1e-7)
    return np.log(p / (1.0 - p))


def _degree_for_k(k: int) -> int:
    deg = math.isqrt(k) - 1
    if (deg + 1) ** 2 != k:
        raise ValueError(f"sh_coefficients K={k} is not a perfect square (K=(deg+1)**2)")
    return deg


class GaussianSplatModel:
    """A 3D-Gaussian-Splatting scene (N anisotropic Gaussians)."""

    positions: wp.array[Any]
    scales: wp.array[Any]
    rotations: wp.array[Any]
    opacities: wp.array[Any]
    sh_coefficients: wp.array[Any]

    def __init__(
        self,
        positions: wp.array[Any] | np.ndarray,
        scales: wp.array[Any] | np.ndarray,
        rotations: wp.array[Any] | np.ndarray,
        opacities: wp.array[Any] | np.ndarray,
        sh_coefficients: wp.array[Any] | np.ndarray,
        *,
        device: str = "cpu",
    ) -> None:
        """Construct from per-field arrays; validate shapes + dtypes.

        Accepts NumPy or Warp arrays; stores Warp ``float32`` arrays on ``device``.
        Raises ``ValueError`` on a shape/dtype mismatch.
        """
        pos = _to_f32(positions)
        scl = _to_f32(scales)
        rot = _to_f32(rotations)
        opa = _to_f32(opacities)
        sh = _to_f32(sh_coefficients)

        n = pos.shape[0]
        if pos.shape != (n, 3):
            raise ValueError(f"positions must be (N, 3); got {pos.shape}")
        if scl.shape != (n, 3):
            raise ValueError(f"scales must be (N, 3); got {scl.shape}")
        if rot.shape != (n, 4):
            raise ValueError(f"rotations must be (N, 4) wxyz; got {rot.shape}")
        if opa.shape != (n,):
            raise ValueError(f"opacities must be (N,); got {opa.shape}")
        if sh.ndim != 3 or sh.shape[0] != n or sh.shape[2] != 3:
            raise ValueError(f"sh_coefficients must be (N, K, 3); got {sh.shape}")
        self._sh_degree = _degree_for_k(sh.shape[1])

        self.positions = wp.array(pos, dtype=wp.vec3, device=device)
        self.scales = wp.array(scl, dtype=wp.vec3, device=device)
        self.rotations = wp.array(rot, dtype=wp.float32, device=device)
        self.opacities = wp.array(opa, dtype=wp.float32, device=device)
        self.sh_coefficients = wp.array(sh, dtype=wp.float32, device=device)
        self._device = device

    @classmethod
    def load_ply(cls, path: str | Path, *, device: str = "cpu") -> GaussianSplatModel:
        """Load an Inria .ply 3DGS scene; validate SH degree, vertex count, attrs."""
        verts, names = _read_binary_ply(Path(path))
        col = {name: verts[:, i] for i, name in enumerate(names)}
        for required in ("x", "y", "z", "opacity", "scale_0", "rot_0"):
            if required not in col:
                raise ValueError(f"{path}: .ply missing required property '{required}'")

        positions = np.stack([col["x"], col["y"], col["z"]], axis=1)
        scales = np.exp(np.stack([col[f"scale_{i}"] for i in range(3)], axis=1))
        rotations = np.stack([col[f"rot_{i}"] for i in range(4)], axis=1)
        rotations = _normalize_quaternions(rotations)
        opacities = _sigmoid(col["opacity"])

        n_rest = sum(1 for nm in names if nm.startswith("f_rest_"))
        if n_rest % 3 != 0:
            raise ValueError(f"{path}: f_rest count {n_rest} is not divisible by 3")
        k = 1 + n_rest // 3
        n = positions.shape[0]
        sh = np.empty((n, k, 3), dtype=np.float32)
        sh[:, 0, :] = np.stack([col[f"f_dc_{i}"] for i in range(3)], axis=1)
        # Inria stores f_rest channel-major: [ch0_coeff0..ch0_coeff{K-2}, ch1_..., ch2_...].
        for ch in range(3):
            for c in range(k - 1):
                sh[:, c + 1, ch] = col[f"f_rest_{ch * (k - 1) + c}"]
        return cls(positions, scales, rotations, opacities, sh, device=device)

    def save_ply(self, path: str | Path) -> None:
        """Write this model to an Inria-compatible .ply 3DGS scene file."""
        npy = self.to_numpy()
        positions = npy["positions"]
        n = positions.shape[0]
        k = npy["sh_coefficients"].shape[1]

        names: list[str] = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2"]
        names += [f"f_rest_{i}" for i in range(3 * (k - 1))]
        names += ["opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]

        cols: list[np.ndarray] = [positions[:, 0], positions[:, 1], positions[:, 2]]
        cols += [np.zeros(n, np.float32)] * 3  # normals nx, ny, nz
        sh = npy["sh_coefficients"]
        cols += [sh[:, 0, 0], sh[:, 0, 1], sh[:, 0, 2]]  # f_dc per channel
        for ch in range(3):
            for c in range(k - 1):
                cols.append(sh[:, c + 1, ch])
        cols.append(_logit(npy["opacities"]))
        log_scales = np.log(np.clip(npy["scales"], 1e-12, None))
        cols += [log_scales[:, 0], log_scales[:, 1], log_scales[:, 2]]
        rot = npy["rotations"]
        cols += [rot[:, 0], rot[:, 1], rot[:, 2], rot[:, 3]]

        verts = np.stack(cols, axis=1).astype("<f4")
        _write_binary_ply(Path(path), verts, names)

    @property
    def num_gaussians(self) -> int:
        """Number of Gaussians N in the scene."""
        return int(self.positions.shape[0])

    @property
    def sh_degree(self) -> int:
        """Spherical-harmonic degree (``K = (sh_degree + 1) ** 2``)."""
        return self._sh_degree

    def to_numpy(self) -> dict[str, np.ndarray]:
        """Host-side accessor: every field as a NumPy ``float32`` array, keyed by name."""
        return {
            "positions": self.positions.numpy().reshape(-1, 3).astype(np.float32),
            "scales": self.scales.numpy().reshape(-1, 3).astype(np.float32),
            "rotations": self.rotations.numpy().reshape(-1, 4).astype(np.float32),
            "opacities": self.opacities.numpy().reshape(-1).astype(np.float32),
            "sh_coefficients": self.sh_coefficients.numpy().astype(np.float32),
        }

    def __len__(self) -> int:
        return self.num_gaussians


def _to_f32(arr: wp.array[Any] | np.ndarray) -> np.ndarray:
    """Coerce a NumPy or Warp array to a contiguous NumPy float32 array."""
    if isinstance(arr, np.ndarray):
        out = np.ascontiguousarray(arr, dtype=np.float32)
    else:
        out = np.ascontiguousarray(arr.numpy(), dtype=np.float32)
    # Warp vec3/vec4 arrays surface as (N, 3)/(N, 4); 1-D fields stay 1-D.
    return out


def _normalize_quaternions(q: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(q, axis=1, keepdims=True)
    norms = np.where(norms > 0.0, norms, 1.0)
    return (q / norms).astype(np.float32)


def _read_binary_ply(path: Path) -> tuple[np.ndarray, list[str]]:
    """Parse a binary-little-endian float32 PLY; return (vertices (N, P), prop names)."""
    with path.open("rb") as fh:
        if fh.readline().strip() != b"ply":
            raise ValueError(f"{path}: not a PLY file")
        fmt_ok = False
        n_vert = 0
        names: list[str] = []
        while True:
            line = fh.readline()
            if not line:
                raise ValueError(f"{path}: unexpected EOF in PLY header")
            tok = line.split()
            if tok[0] == b"format":
                if tok[1] != b"binary_little_endian":
                    raise ValueError(f"{path}: only binary_little_endian PLY is supported")
                fmt_ok = True
            elif tok[0] == b"element" and tok[1] == b"vertex":
                n_vert = int(tok[2])
            elif tok[0] == b"property":
                if tok[1] != b"float" and tok[1] != b"float32":
                    raise ValueError(f"{path}: only float32 PLY properties are supported")
                names.append(tok[2].decode("ascii"))
            elif tok[0] == b"end_header":
                break
        if not fmt_ok:
            raise ValueError(f"{path}: missing PLY format line")
        p = len(names)
        data = np.frombuffer(fh.read(n_vert * p * 4), dtype="<f4")
    return data.reshape(n_vert, p).astype(np.float32), names


def _write_binary_ply(path: Path, verts: np.ndarray, names: list[str]) -> None:
    n, p = verts.shape
    if p != len(names):
        raise ValueError("vertex column count does not match property-name count")
    header = "ply\nformat binary_little_endian 1.0\n"
    header += f"element vertex {n}\n"
    header += "".join(f"property float {nm}\n" for nm in names)
    header += "end_header\n"
    with path.open("wb") as fh:
        fh.write(header.encode("ascii"))
        fh.write(np.ascontiguousarray(verts, dtype="<f4").tobytes())

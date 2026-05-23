"""Determinism tests (gate 11; spec § 2.5).

Phase 1 shipped this as a ``raise NotImplementedError`` stub body; the
mpm-multimaterial sub-phase Stage 1 fills in the body (SHIFTED — S1
pattern, conventions doc § A.2 + § M.2 inheritance). The imported
:func:`sim_runner_seeded` Protocol contract is preserved as the
noqa-tagged contract import per probe report § 5.

Spec ``determinism.md`` declares ``epsilon-same-stack-same-hw`` for the
Stack-D Taichi target (the P2G atomic scatter-add breaks bit-exactness
even on identical hardware at Stack-D Taichi scope). The Stack-D Python
NumPy + numba reference at THIS sub-phase achieves cleanly bit-exact on
the same stack + hw (no atomic-scatter — single-threaded ``@njit`` with
``parallel=False`` default + sorted-particle iteration + lex 27-cell
P2G/G2P stencil — see ``sim.py`` module docstring clauses 1-10).
Over-achievement is informational only per conventions doc § F.4.

Uses :func:`sim_runner_diagnostic` (16³ × 5K particles × 50 steps)
rather than the canonical :func:`sim_runner_seeded` (128³ × 1M particles
× 500 steps) — the canonical drop-impact capture takes ~8-10 min but
produces a ~1.6 GB payload that we don't want to write to ``tmp_path``
twice per test invocation (sub-phase-eulerian-smoke / RD-3D / sph-water
/ LBM diagnostic-tier precedent).
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from mpm_multimaterial.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def test_run_twice_epsilon_diff(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """Diagnostic capture reproduces byte-for-byte under fixed seed.

    Per conventions doc § F.4: the spec declares
    ``epsilon-same-stack-same-hw`` for Stack-D Taichi; the Stack-D
    Python NumPy + numba reference over-achieves to bit-exact —
    the kernel has no atomic-scatter / parallel-reduction / subgroup-
    collective surfaces, so two invocations with the same seed
    produce byte-identical HDF5 payloads at the same hardware.
    """
    a_dir = tmp_path / "run_a"
    b_dir = tmp_path / "run_b"
    a_manifest = sim_runner_diagnostic(seed=42, out_dir=a_dir)
    b_manifest = sim_runner_diagnostic(seed=42, out_dir=b_dir)
    a_payload = a_manifest.with_suffix(".h5")
    b_payload = b_manifest.with_suffix(".h5")
    a_sha = _sha256_of_file(a_payload)
    b_sha = _sha256_of_file(b_payload)
    assert a_sha == b_sha, (
        f"determinism violated: run_a sha256={a_sha} run_b sha256={b_sha}"
    )

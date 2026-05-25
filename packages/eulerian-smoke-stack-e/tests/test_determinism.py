"""Determinism tests (gate 10; IC-13/IC-14; spec § 2.5), Stack-E.

The Stack-E NVIDIA Warp sim runs under ``set_warp_deterministic(seed,
device="cpu")`` -- Warp's CPU ``wp.launch`` is single-threaded serial over the
launch dimension, so the collocated-grid gather kernels (SL backtrace; 5/7-point
Laplacian; centered-difference div/grad/curl; fixed-20-sweep Jacobi) are
order-deterministic and bit-identical run-to-run (no atomic scatter; no RNG --
the canonical Taylor-Green / lid-driven ICs are analytic). D9: ``tolerance=0.0``
(CPU ``bit-exact-same-hw``) -- bit-exact EVEN THOUGH the canonical trajectory is
chaotic (within-stack determinism is order-determinism, independent of the
cross-stack positive-Lyapunov divergence that gate-14 witnesses).

TWO witnesses (charter § 3 gate-10):

- :func:`test_run_twice_content_equivalent` -- the testkit ``run_twice_and_diff``
  content-equivalence gate on the production ``sim_runner_diagnostic`` (the
  stack-uniform IC-14 surface).
- :func:`test_warp_harness_assert_deterministic_run` -- the common-warp § 1.9.1
  W-2 mechanism (``assert_deterministic_run``, ``tolerance=0.0``) on the
  cross-stack-sensitive 3D Jacobi pressure-projection surface (the § L.7 O-2
  chain checkpoint-2 surface). Asserts bit-exact DETERMINISM run-to-run; it does
  NOT assert reproduction of the Stage-0 R-A1 digest ``79d15705…b342b2eea2`` --
  the production ``project_pressure_3d`` follows the Phase-1 ``np.roll`` neighbor
  summation order, which differs from the Stage-0 ephemeral kernel's index order
  (FP addition is non-associative), so the digests are determinism-equivalent but
  not byte-equal. The Stage-0 digest is re-witnessed by re-running the ephemeral
  Stage-0 kernel (Stage-1b dispatch judgment), not by this production path.

The Stack-E sim / reference modules do NOT exist at the failing-tests commit
(Stage 1a) -- collection fails with ModuleNotFoundError cleanly until the
Stage-1b implementation lands.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from common_warp.warp_harness import (
    assert_deterministic_run,
    deterministic_context,
    set_warp_deterministic,
)
from determinism import run_twice_and_diff
from eulerian_smoke_stack_e.reference import (  # type: ignore[import-not-found]
    project_pressure_3d,
)
from eulerian_smoke_stack_e.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)

_SEED = 42
_GN = 16


def _projection_state() -> list[np.ndarray]:
    """Run the production 3D Jacobi projection on the fixed Stage-0 R-A1 IC.

    16³, seed-42 ``standard_normal`` u/v/w, dt=0.005, rho=1.0, dx=1/16,
    n_jacobi=20 (the Stage-0 R-A1 scenario). Returns the divergence-free velocity
    + pressure arrays for the bit-exact run-to-run comparison.
    """
    rng = np.random.default_rng(_SEED)
    u = rng.standard_normal((_GN, _GN, _GN)).astype(np.float64)
    v = rng.standard_normal((_GN, _GN, _GN)).astype(np.float64)
    w = rng.standard_normal((_GN, _GN, _GN)).astype(np.float64)
    params = {"dx": 1.0 / _GN, "dt": 0.005, "rho": 1.0, "n_jacobi": 20}
    u2, v2, w2, p = project_pressure_3d(u, v, w, params, n_iter=20)
    return [np.ascontiguousarray(a) for a in (u2, v2, w2, p)]


def test_run_twice_content_equivalent(tmp_path: Path) -> None:
    """IC-14 -- the diagnostic capture is content-equivalent under fixed seed."""
    capture_dir = tmp_path / "eulerian-smoke-stack-e-diag"
    capture_dir.mkdir()
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=capture_dir)
    assert verdict.content_equivalent, verdict.detail


def test_warp_harness_assert_deterministic_run() -> None:
    """W-2 (§ 1.9.1) -- the 3D Jacobi projection surface is bit-exact run-to-run."""
    set_warp_deterministic(_SEED, device="cpu")
    with deterministic_context():
        digest = assert_deterministic_run(_projection_state, runs=2, tolerance=0.0)
    assert isinstance(digest, str) and len(digest) == 64

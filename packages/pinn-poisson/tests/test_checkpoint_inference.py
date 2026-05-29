"""ALWAYS-ON fast gates — verify the COMMITTED checkpoint is correct (no re-train).

These load the committed, LFS-tracked checkpoint
(`tools/testkit/golden/checkpoints/pinn-poisson-mms-seed42.safetensors`) and assert
the frozen network reproduces the analytic anchor + the classical-FD reference + the
PBT residual envelopes + a healthy capture. Because the checkpoint reproduces a fresh
seed-42 train byte-for-byte (measured Stage 1b-PINN), these prove the same
correctness as the re-training suite but run in **seconds** — so they can gate EVERY
push to main. The full re-train + EFECT + cross-hardware convergence is the
path-filtered `pinn-train.yml` job (fires only on PINN training-code changes).

CI-hardening (L-PINN-2): split the ~70-min per-push re-train tax into this fast
always-on tier + an on-change re-train tier. No gate substance changed — the same
analytic/FD/PBT assertions execute, here against the committed checkpoint.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
import torch

from pinn_poisson import ANCHOR3, CANONICAL_PROBLEM, evaluate_on_grid, fd_solve
from pinn_poisson.infer import load_checkpoint
from pinn_poisson.residual import poisson_residual

_REPO_ROOT = Path(__file__).resolve().parents[3]
_CHECKPOINT = _REPO_ROOT / "tools/testkit/golden/checkpoints/pinn-poisson-mms-seed42.safetensors"

# Envelopes MEASURED at Stage 1b-PINN (same values as test_pbt_invariants — the
# trained regime, NOT widened).
_PDE_ENVELOPE = 0.1
_BOUNDARY_ENVELOPE = 0.01


def _checkpoint_present() -> bool:
    # An un-smudged LFS pointer is a tiny text file; the real safetensors is >1 KiB.
    return _CHECKPOINT.exists() and _CHECKPOINT.stat().st_size > 1024


pytestmark = pytest.mark.skipif(
    not _checkpoint_present(),
    reason=f"committed checkpoint not smudged at {_CHECKPOINT} (LFS pull required)",
)


def _relative_l2(approx: np.ndarray, exact: np.ndarray) -> float:
    return float(np.linalg.norm(approx - exact) / np.linalg.norm(exact))


def test_checkpoint_matches_analytic(golden_tolerance: dict[str, float]) -> None:
    """gate-4: the committed checkpoint reproduces the Anchor-3 analytic solution."""
    model = load_checkpoint(_CHECKPOINT)
    n = 64
    field = evaluate_on_grid(model, n)
    grid = np.linspace(0.0, 1.0, n)
    gx, gy = np.meshgrid(grid, grid, indexing="ij")
    exact = ANCHOR3.u_exact(gx, gy, np)
    rel = _relative_l2(field, exact)
    tol = golden_tolerance["analytical_l2"]
    assert rel <= tol, f"committed-checkpoint vs analytic rel-L2 {rel:.2e} > {tol:.0e}"


def test_checkpoint_matches_fd_reference(golden_tolerance: dict[str, float]) -> None:
    """gate-4/9: the committed checkpoint matches the classical 5-point FD reference."""
    model = load_checkpoint(_CHECKPOINT)
    n = 64
    field = evaluate_on_grid(model, n)
    fd = fd_solve(ANCHOR3, n)
    rel = _relative_l2(field, fd)
    tol = golden_tolerance["fd_l2"]
    assert rel <= tol, f"committed-checkpoint vs FD rel-L2 {rel:.2e} > {tol:.0e}"


def test_checkpoint_pde_residual_bounded() -> None:
    """gate-11: |Δu_NN - f| within the trained envelope on fresh interior samples."""
    model = load_checkpoint(_CHECKPOINT)
    gen = torch.Generator().manual_seed(123)
    eps = 1e-3
    x = (1 - 2 * eps) * torch.rand(2000, 1, dtype=torch.float64, generator=gen) + eps
    y = (1 - 2 * eps) * torch.rand(2000, 1, dtype=torch.float64, generator=gen) + eps
    x.requires_grad_(True)
    y.requires_grad_(True)
    res = poisson_residual(model, x, y, CANONICAL_PROBLEM).detach().abs()
    assert bool(torch.isfinite(res).all()) and float(res.max()) <= _PDE_ENVELOPE, (
        f"committed-checkpoint pde residual max {float(res.max()):.3e} > {_PDE_ENVELOPE}"
    )


def test_checkpoint_boundary_residual_bounded() -> None:
    """gate-11: |u_NN - g| within the trained envelope on ∂Ω samples."""
    model = load_checkpoint(_CHECKPOINT)
    nb = 256
    s = torch.linspace(0.0, 1.0, nb, dtype=torch.float64).reshape(-1, 1)
    zero, one = torch.zeros(nb, 1, dtype=torch.float64), torch.ones(nb, 1, dtype=torch.float64)
    xb = torch.cat([zero, one, s, s])
    yb = torch.cat([s, s, zero, one])
    with torch.no_grad():
        res = (model(xb, yb) - CANONICAL_PROBLEM.boundary_value(xb, yb, torch)).abs()
    assert bool(torch.isfinite(res).all()) and float(res.max()) <= _BOUNDARY_ENVELOPE, (
        f"committed-checkpoint boundary residual max {float(res.max()):.3e} > {_BOUNDARY_ENVELOPE}"
    )

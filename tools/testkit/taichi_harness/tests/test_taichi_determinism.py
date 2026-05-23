"""Taichi determinism regression test — sub-phase-taichi-integration.

NOTE — module deliberately does NOT use ``from __future__ import
annotations`` per spec § 4.4 limitation #2 + docs/common/taichi.md § 4.2
(stringified annotations break ``@ti.kernel`` argument-type resolution
at decoration time).

Verification surface for the project-wide Taichi convention documented
at ``docs/common/taichi.md``. Locks in three contracts (sister to
``tools/testkit/numba_harness/tests/test_numba_determinism.py``):

1. **FP-equivalence with pure-NumPy reference** at the load-bearing
   computation shape (1D explicit diffusion — mirrors the arithmetic
   pattern Stack-D Eulerian sims will exercise via Taichi).
   **FP-equivalence, NOT bit-equivalence**: NumPy's vectorized SIMD
   code and Taichi's lowered backend kernel code use different
   FP-accumulation patterns; the same algebraic formula produces
   slightly different bit patterns at large enough N. The tolerance
   (1e-9 absolute) is set well below the spec's cross-stack tolerance
   of 1e-4 relative.

2. **Run-to-run determinism** — two consecutive Taichi JIT runs with
   the same seed + same arch produce **bit-identical** output. This
   is the load-bearing same-stack-same-hw contract.

3. **Cold-vs-warm cache identity** — clearing Taichi's
   ``offline_cache`` between runs does not change the JIT output
   (bit-identical). This is the cross-compilation-invariance contract.

If contract (1) fails (drift > 1e-9), investigate banned-flag
discipline (``fast_math`` / ``default_fp=ti.f32`` mismatch / parallel
reduction). If (2) or (3) fail, **DO NOT relax the test** — those ARE
the project's determinism declaration; failing them means Taichi is
producing nondeterministic output and the convention is broken.

Per R-T1 mitigation (charter § 9): all tests use
``pytest.importorskip("taichi")`` at module top so they skip cleanly
when Taichi is unavailable in CI. Locally validated by sub-phase-
taichi-integration Stage 1.
"""

import math
import shutil
from pathlib import Path

import numpy as np
import pytest

ti = pytest.importorskip("taichi")  # R-T1 mitigation; skip if Taichi missing.

from common_py.determinism import Config, set_taichi_deterministic  # noqa: E402

# ----------------------------------------------------------------------
# Pure-NumPy reference. No JIT; deterministic via sequential update.
# ----------------------------------------------------------------------

GRID_N = 64
DX = 1.0 / GRID_N
DIFFUSIVITY = 0.05
DT = 0.25 * DX * DX / DIFFUSIVITY


def diffuse_pure_numpy(u0: np.ndarray, n_steps: int) -> np.ndarray:
    """Reference 1D periodic explicit-diffusion solver.

    Sequential left-to-right per-cell update; deterministic via
    np.roll-based stencil. Matches the arithmetic shape Stack-D
    Eulerian sims exercise via Taichi.
    """
    u = u0.astype(np.float64).copy()
    alpha = DIFFUSIVITY * DT / (DX * DX)
    for _ in range(n_steps):
        left = np.roll(u, 1)
        right = np.roll(u, -1)
        u = u + alpha * (left - 2.0 * u + right)
    return u


# ----------------------------------------------------------------------
# Taichi JIT variant. Kernel does NOT carry -> None annotation per
# Taichi 1.7.4 AST-transformer limitation (see hello_taichi.py).
# ----------------------------------------------------------------------


def _make_taichi_diffuse(n_cells: int):
    """Construct a Taichi diffuse kernel for the given grid size.

    Re-built per test invocation so each parametrize size gets a fresh
    Taichi field allocation. Returns ``(run, read)`` callables — run
    advances n_steps; read returns a NumPy snapshot.
    """
    u_curr = ti.field(dtype=ti.f64, shape=n_cells)
    u_next = ti.field(dtype=ti.f64, shape=n_cells)
    alpha = DIFFUSIVITY * DT / (DX * DX)

    @ti.kernel
    def _seed_from_ic(ic: ti.types.ndarray()):
        for i in range(n_cells):
            u_curr[i] = ic[i]

    @ti.kernel
    def _step():
        for i in range(n_cells):
            left = u_curr[(i - 1) % n_cells]
            right = u_curr[(i + 1) % n_cells]
            u_next[i] = u_curr[i] + alpha * (left - 2.0 * u_curr[i] + right)
        for i in range(n_cells):
            u_curr[i] = u_next[i]

    def run(ic: np.ndarray, n_steps: int) -> np.ndarray:
        _seed_from_ic(ic.astype(np.float64))
        for _ in range(n_steps):
            _step()
        out = np.empty(n_cells, dtype=np.float64)
        for i in range(n_cells):
            out[i] = float(u_curr[i])
        return out

    return run


# ----------------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------------


def _make_seeded_ic(seed: int, n: int) -> np.ndarray:
    """Seeded random 1D field — deterministic input for the harness."""
    rng = np.random.default_rng(int(seed))
    return rng.uniform(-1.0, 1.0, size=(int(n),)).astype(np.float64)


@pytest.fixture
def deterministic_taichi():
    """Init Taichi via the determinism wrapper before each test."""
    set_taichi_deterministic(Config(deterministic=True, seed=42), arch="cpu")
    yield
    # Reset Taichi so the next parametrize/test gets a clean slate.
    ti.reset()


# ----------------------------------------------------------------------
# Tests
# ----------------------------------------------------------------------


@pytest.mark.parametrize("n_cells", [64, 256, 1024])
def test_taichi_jit_fp_equivalent_with_pure_numpy(n_cells: int, deterministic_taichi) -> None:
    """Taichi JIT output is FP-equivalent with pure-NumPy reference.

    **FP-equivalence, NOT bit-equivalence** with the pure-NumPy
    np.roll-based reference: Taichi's lowered backend kernel code and
    NumPy's vectorized SIMD code use different FP-accumulation
    patterns. Both compute the same algebraic formula; FP-wise they
    diverge by ≲ eps * N per cell.

    What this test asserts: max_abs_diff ≤ 1e-9 (well below spec's
    cross-stack 1e-4 relative). What this test does NOT assert: bit-
    identity. Bit-identity is verified by the run-to-run + cold-vs-
    warm tests below; those ARE the load-bearing determinism contract.

    If max_abs_diff exceeds 1e-9, the JIT variant is doing something
    materially different from the pure-NumPy reference (banned flag
    snuck in: ``fast_math=True`` / ``default_fp=ti.f32`` mismatch /
    parallel reduction without explicit accumulator).
    """
    n_steps = 100
    ic = _make_seeded_ic(seed=42, n=n_cells)
    expected = diffuse_pure_numpy(ic, n_steps)

    taichi_run = _make_taichi_diffuse(n_cells)
    actual = taichi_run(ic, n_steps)

    assert expected.shape == actual.shape, (
        f"shape mismatch: numpy={expected.shape} taichi={actual.shape}"
    )
    max_abs_diff = float(np.max(np.abs(expected - actual)))
    assert max_abs_diff < 1e-9, (
        f"max_abs_diff={max_abs_diff:g} at N={n_cells} exceeds 1e-9 FP-equivalence "
        f"tolerance; Taichi JIT is doing something materially different from the "
        f"pure-NumPy reference (check banned-flag discipline per "
        f"docs/common/taichi.md § 3)"
    )


def test_taichi_jit_run_to_run_determinism(deterministic_taichi) -> None:
    """Two consecutive Taichi JIT runs with same input produce same output.

    Per docs/common/taichi.md § 2 — ``arch=ti.cpu``, ``random_seed``,
    ``cpu_max_num_threads=1``, ``offline_cache=True`` combination is
    the load-bearing same-stack-same-hw bit-determinism contract.
    """
    n_cells = 256
    n_steps = 100
    ic = _make_seeded_ic(seed=42, n=n_cells)

    taichi_run_a = _make_taichi_diffuse(n_cells)
    rho_a = taichi_run_a(ic, n_steps)
    taichi_run_b = _make_taichi_diffuse(n_cells)
    rho_b = taichi_run_b(ic, n_steps)
    assert np.array_equal(rho_a, rho_b), (
        "Taichi JIT not bit-deterministic with itself (violates docs/common/taichi.md § 2 contract)"
    )


def test_taichi_jit_cold_vs_warm_cache_identity(deterministic_taichi) -> None:
    """Clearing Taichi's offline cache between runs does not change output.

    Cache invalidation is automatic on source / version change; this
    test verifies the compiled artifact's bit pattern is consumer-
    invariant — recompiling from scratch produces the same output as
    a cached load. Catches any per-compilation nondeterminism (e.g.,
    random insertion order in LLVM optimization passes).

    Approach: run once (populates Taichi's offline cache); locate the
    Taichi user-level cache dir; remove its contents; reset Taichi;
    re-run; compare.
    """
    n_cells = 256
    n_steps = 100
    ic = _make_seeded_ic(seed=42, n=n_cells)

    taichi_run_warm = _make_taichi_diffuse(n_cells)
    rho_warm = taichi_run_warm(ic, n_steps)

    # Clear Taichi's offline cache for this process. The user-level cache
    # location varies by platform; ti.lang.misc may expose it but for
    # robustness we use the documented env var fallback.
    cache_dir = Path.home() / ".cache" / "taichi"
    if cache_dir.exists():
        shutil.rmtree(cache_dir, ignore_errors=True)

    # Reset Taichi runtime + re-init under the same determinism config.
    ti.reset()
    set_taichi_deterministic(Config(deterministic=True, seed=42), arch="cpu")
    taichi_run_cold = _make_taichi_diffuse(n_cells)
    rho_cold = taichi_run_cold(ic, n_steps)

    assert np.array_equal(rho_warm, rho_cold), (
        "Taichi JIT output differs between cached and uncached executions — "
        "compilation pipeline has unstable codegen for this kernel "
        "(violates docs/common/taichi.md § 2.4 cache-invariance contract)"
    )

    # Sanity: math.isfinite on every cell (smoke against NaN/Inf
    # leakage from the cache-clear path).
    assert all(math.isfinite(float(v)) for v in rho_cold)

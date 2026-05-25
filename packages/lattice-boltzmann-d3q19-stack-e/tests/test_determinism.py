"""Determinism tests (gate 10; IC-13/IC-14; spec § 2.5), Stack-E.

The Stack-E NVIDIA Warp sim runs under ``set_warp_deterministic(seed,
device="cpu")`` -- Warp's CPU ``wp.launch`` is single-threaded serial over the
launch dimension, so the D3Q19 kernels (19-term moment reductions, feq polynomial,
BGK relaxation, periodic-mod streaming gather, bounce-back) are order-deterministic
and bit-identical run-to-run (no atomic scatter -- ``atomic_ops=False``; no RNG --
the canonical Poiseuille / Couette ICs are analytic). D9: ``tolerance=0.0`` (CPU
``bit-exact-same-hw``).

THREE witnesses (charter § 3 gate-10):

- :func:`test_run_twice_content_equivalent` -- the testkit ``run_twice_and_diff``
  content-equivalence gate on the production ``sim_runner_diagnostic`` (the
  stack-uniform IC-14 surface).
- :func:`test_warp_harness_assert_deterministic_run` -- the common-warp § 1.9.1
  W-2 mechanism (``assert_deterministic_run``, ``tolerance=0.0``) on the
  cross-stack-sensitive BGK-collision surface (the § L.7 O-2 chain checkpoint-2
  surface). Asserts bit-exact DETERMINISM run-to-run; it does NOT assert
  reproduction of the Stage-0 R-A1 digest ``74e6bc16…282838bc`` -- the production
  ``bgk_step`` follows the Phase-1 ``np.roll`` streaming + ``einsum`` momentum
  contraction order, which differs from the Stage-0 ephemeral kernel's index order
  (FP addition is non-associative), so the digests are determinism-equivalent but
  not byte-equal (memory caveat / smoke-E S1a-SME note). The Stage-0 digest is
  re-witnessed by re-running the ephemeral Stage-0 kernel (Stage-1b dispatch
  judgment), not by this production path.
- :func:`test_content_equivalent_gate_catches_drift` -- R-D2 failure-mode-on-bug:
  a synthetic drifting SimRunner MUST register as a content-equivalence mismatch.

The Stack-E reference / sim modules do NOT exist at the failing-tests commit
(Stage 1a) -- collection fails with ModuleNotFoundError cleanly until the Stage-1b
implementation lands.
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
from lattice_boltzmann_d3q19_stack_e.reference import (  # type: ignore[import-not-found]
    bgk_step,
    feq_field,
)
from lattice_boltzmann_d3q19_stack_e.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)

_SEED = 42
_NX, _NY, _NZ = 16, 8, 3
_TAU = 0.7


def _collision_step_state() -> list[np.ndarray]:
    """Run one production force-free BGK collision + streaming on a fixed IC.

    16x8x3, seed-42 ``feq``-seeded distribution (rho ~ 1 + small noise, u small
    noise -- the Stage-0 R-A1 scenario). Returns the post-step distribution for
    the bit-exact run-to-run comparison (the BGK-collision FP-accumulation surface;
    IC-15 aspect #4).
    """
    rng = np.random.default_rng(_SEED)
    rho0 = 1.0 + 0.01 * rng.standard_normal((_NX, _NY, _NZ))
    u0 = 0.01 * rng.standard_normal((3, _NX, _NY, _NZ))
    f0 = feq_field(rho0, u0)
    f_post = bgk_step(f0, _TAU)
    return [np.ascontiguousarray(f_post)]


def test_run_twice_content_equivalent(tmp_path: Path) -> None:
    """IC-14 -- the diagnostic capture is content-equivalent under fixed seed."""
    verdict = run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail


def test_warp_harness_assert_deterministic_run() -> None:
    """W-2 (§ 1.9.1) -- the BGK-collision surface is bit-exact run-to-run."""
    set_warp_deterministic(_SEED, device="cpu")
    with deterministic_context():
        digest = assert_deterministic_run(_collision_step_state, runs=2, tolerance=0.0)
    assert isinstance(digest, str) and len(digest) == 64


def test_content_equivalent_gate_catches_drift(tmp_path: Path) -> None:
    """R-D2 spot-check: the harness MUST flag a drifting SimRunner as mismatch.

    A synthetic SimRunner whose state drifts per invocation must produce
    ``verdict.content_equivalent == False`` -- the failure-mode-on-bug witness
    that proves the content-equivalent contract catches synthetic drift.
    """
    from capture import CaptureManifest, StepState, write_capture

    call_count = {"n": 0}

    def drifting_runner(seed: int, out_dir: Path) -> Path:
        call_count["n"] += 1
        manifest = CaptureManifest(
            schema_version="1.0.0",
            sim={"name": "lbm-d3q19-stacke-rd2-stub", "category": "lattice", "variant": "ref"},
            stack={"name": "warp-stub", "version": "0.0.1", "build_id": "stub"},
            config={"tier": "test", "dims": [4], "dtype": "f64", "seed": seed, "params": {}},
            run={
                "step_count": 1,
                "capture_interval": 1,
                "wall_clock_seconds": 0.0,
                "start_utc": "2026-05-25T00:00:00Z",
            },
            payload={"format": "hdf5", "path": "stub.h5", "checksum": "sha256:" + "0" * 64},
            determinism={
                "claimed": "bit-exact-same-hw",
                "atomic_ops": False,
                "subgroup_ops": False,
            },
        )
        u = np.array([1.0, 2.0, 3.0, float(call_count["n"])], dtype=np.float64)
        states = [StepState(step=0, state={"U": u}, diagnostics={})]
        return write_capture(states, manifest, out_dir)

    verdict = run_twice_and_diff(drifting_runner, seed=42, tmp_dir=tmp_path)
    assert not verdict.content_equivalent, (
        "R-D2 violation: harness failed to detect synthetic drift; "
        "content-equivalent contract surface is weaker than expected."
    )
    assert "max_abs_err" in verdict.detail

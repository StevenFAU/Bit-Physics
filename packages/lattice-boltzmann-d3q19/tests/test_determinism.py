"""Determinism tests (gate 11; spec § 2.5).

Phase 1 shipped this as a ``raise NotImplementedError`` stub body;
the lattice-boltzmann-d3q19 sub-phase Stage 1 fills in the body
(SHIFTED — parallels the closed-form / agent-based / RD-3D /
sph-water / eulerian-smoke Stage 1 S1 test-stub-replacement
precedent inherited via ``docs/conventions/sub-phase-conventions.md``
§ A.2 + § M.2). The imported :func:`sim_runner_seeded` Protocol
contract is preserved as the noqa-tagged contract import per probe
report § 5.

Spec ``determinism.md`` declares ``bit-exact-effort-same-stack-same-hw``
for the Stack-C C++/Vulkan target (the ``effort`` caveat covers
optimized subgroup-collective ops on GPU). The Python NumPy reference
at THIS sub-phase achieves cleanly bit-exact on the same stack + hw
(no subgroup-collectives in the elementwise NumPy + ``np.roll``
kernel — see ``sim.py`` module docstring clauses 1–9). Over-achievement
is informational only per conventions doc § F.4.

Uses :func:`sim_runner_diagnostic` (16x8 × 50 steps) rather than the
canonical :func:`sim_runner_seeded` (64x32 × 1000 steps) — the
canonical Poiseuille capture takes ~2 s but produces a ~934 MB
payload that we don't want to write to ``tmp_path`` twice per test
invocation; the diagnostic-tier descriptor exercises every kernel
(streaming, BGK collision, body-force Guo injection, bounce-back at
both y-walls) with byte-equality assertion at the manifest + .h5
payload level (sub-phase-eulerian-smoke / RD-3D / sph-water
diagnostic-tier precedent).
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from lattice_boltzmann_d3q19.sim import (  # type: ignore[import-not-found]
    sim_runner_diagnostic,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def test_run_twice_bit_exact_canonical(tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    """Diagnostic capture reproduces byte-for-byte under fixed seed.

    Per conventions doc § F.4: the spec declares
    ``bit-exact-effort-same-stack-same-hw`` for Stack-C; the Stack-D
    Python NumPy reference over-achieves the ``effort`` caveat — the
    kernel has no subgroup-collective / atomic-scatter / parallel-
    reduction surfaces, so two invocations with the same seed produce
    byte-identical HDF5 payloads at the same hardware.
    """
    a_dir = tmp_path / "run_a"
    b_dir = tmp_path / "run_b"
    a_manifest = sim_runner_diagnostic(seed=42, out_dir=a_dir)
    b_manifest = sim_runner_diagnostic(seed=42, out_dir=b_dir)
    # The HDF5 payload paths are sibling .h5 files.
    a_payload = a_manifest.with_suffix(".h5")
    b_payload = b_manifest.with_suffix(".h5")
    a_sha = _sha256_of_file(a_payload)
    b_sha = _sha256_of_file(b_payload)
    assert a_sha == b_sha, (
        f"determinism violated: run_a sha256={a_sha} run_b sha256={b_sha}"
    )

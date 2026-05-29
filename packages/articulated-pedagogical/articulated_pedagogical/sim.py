"""SimRunner adapter — articulated-pedagogical replayable capture (Stack E).

Emits the canonical single-pendulum trajectory capture
``pendulum-trajectory-seed42-step1000.{h5,json}`` via the common-warp batch
``Capture`` + ``write_capture`` API (D-CAPTURE-API, charter §6 — NOT lenia's
incremental ``Writer``). The per-step joint-space pose arrays are accumulated
into a flat payload keyed by ``state_key(step, field)``; the manifest declares
``schema_version="1.0.0"``, ``dtype="f64"``, ``determinism.claimed=
"bit-exact-same-hw"`` (D-DET registry row ↔ capture sidecar, gate-10).

Determinism: ``common_warp.init("cpu", deterministic=True)`` +
``set_warp_deterministic(seed)`` + ``deterministic_context()`` (the Warp CPU
serial-launch mechanism, mpm-multimaterial-stack-e precedent).

Stage 1a: ``sim_runner_seeded`` raises ``NotImplementedError``; the capture
emission lands at Stage 1b once the Warp ABA + integrator are GREEN.
"""

from __future__ import annotations

from pathlib import Path

_STAGE_1B = (
    "articulated-pedagogical sim runner Stage 1a scaffold: the canonical "
    "pendulum-trajectory capture emission lands at Stage 1b atop the Warp ABA + "
    "semi-implicit-Euler integrator. See "
    "docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md §7."
)


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Run the canonical single-pendulum capture (seed-pinned, 1000 steps).

    Descriptor ``pendulum-trajectory-seed{seed}-step1000``. Returns the manifest
    JSON path.
    """
    raise NotImplementedError(_STAGE_1B)


__all__ = ["sim_runner_seeded"]

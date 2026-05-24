"""Runtime subsystem (Subsystem 1) — Warp init + device selection.

Thin wrapper over NVIDIA Warp 1.13.0's runtime API (Convention C —
upstream names cited verbatim):

- ``wp.init()`` — initialize the Warp runtime (no-arg in 1.13.0).
- ``wp.set_device(ident)`` — set the default device (``"cpu"``, a CUDA
  device string, …).
- ``wp.get_device(ident=None) -> wp.context.Device`` — resolve a device
  handle; with no argument returns the current default device.
- ``wp.is_cpu_available()`` / ``wp.is_cuda_available()`` — backend probes.

**Device posture (D4 / R-W3).** The phase-2 plan §1.9.1 API nominally
defaults to GPU (the zero-indexed CUDA device). The bootstrap
**overrides the default to CPU**: CPU is the ``bit-exact-same-hw``
determinism backend (``wp.launch`` runs serially over the launch
dimension — see ``warp_harness.determinism``), whereas GPU is
``epsilon-bounded-cross-stack`` (spec § 4.4; per-sim-port scope).
Callers wanting GPU pass an explicit CUDA device string.
"""

from __future__ import annotations

import warp as wp

#: D4 / R-W3 — CPU is the bit-determinism backend; the bootstrap overrides
#: §1.9.1's nominal GPU default to ``cpu``.
DEFAULT_DEVICE = "cpu"

_initialized = False


def init(device: str | None = None) -> str:
    """Initialize the Warp runtime and select a device. Idempotent.

    ``wp.init()`` is called at most once per process (guarded by a module
    flag); repeated ``init()`` calls re-select the device but do not
    re-initialize the runtime. ``device=None`` resolves to
    :data:`DEFAULT_DEVICE` (``"cpu"``; D4).

    Returns the resolved device name (e.g. ``"cpu"``).
    """
    global _initialized
    if not _initialized:
        wp.init()
        _initialized = True
    set_device(device or DEFAULT_DEVICE)
    return get_device()


def get_device() -> str:
    """Return the current default Warp device name (e.g. ``"cpu"``)."""
    if not _initialized:
        init()
    return str(wp.get_device())


def set_device(device: str) -> None:
    """Set the default Warp device. Ensures the runtime is initialized first."""
    global _initialized
    if not _initialized:
        wp.init()
        _initialized = True
    wp.set_device(device)

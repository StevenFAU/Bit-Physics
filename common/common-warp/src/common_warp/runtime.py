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

**§1.9.1 socket reconciliation (S1b-3 / Stage-1c Task 1c.1).** The
phase-2 plan §1.9.1 specifies ``init(device: str | None = None,
deterministic: bool = False) -> None`` (verbatim, plan lines 906-916).
Stage 1a landed ``init(device=None) -> str`` — the ``device`` default
already matched §1.9.1, but the ``deterministic`` flag was absent. Stage
1c adds it so the Stack-E ports code against the §1.9.1 surface verbatim.
The return type is kept ``-> str`` (the resolved device): a documented
superset of §1.9.1's ``-> None``, consistent with the Stage-1a posture
(``test_runtime`` asserts ``init() == "cpu"``); a caller ignoring the
return satisfies the ``-> None`` contract.

**``deterministic`` flag semantics.** Warp 1.13.0 exposes **no** global
deterministic toggle (``wp.config`` has no determinism knob) and **no**
global RNG seed (``wp.set_seed`` does not exist; randomness is per-thread
via ``wp.rand_init``). CPU bit-exactness is therefore *structural* — the
serial single-thread launch — not flag-driven. ``deterministic=True``
records the requested D4 posture (bit-exact-same-hw on CPU /
epsilon-bounded on GPU) for introspection; the CPU guarantee holds by
construction. §1.9.1's "set env vars disabling non-deterministic kernels"
is aspirational for backends Warp 1.13.0 does not expose such a control
for; the honest mechanism is the CPU serial launch.
"""

from __future__ import annotations

import warp as wp

#: D4 / R-W3 — CPU is the bit-determinism backend; the bootstrap overrides
#: §1.9.1's nominal GPU default to ``cpu``.
DEFAULT_DEVICE = "cpu"

_initialized = False
_deterministic = False


def init(device: str | None = None, deterministic: bool = False) -> str:
    """Initialize the Warp runtime and select a device. Idempotent.

    Matches the phase-2 plan §1.9.1 signature ``init(device: str | None =
    None, deterministic: bool = False)`` (Stage-1c Task 1c.1; S1b-3 socket
    reconciliation). ``wp.init()`` is called at most once per process
    (guarded by a module flag); repeated ``init()`` calls re-select the
    device + posture but do not re-initialize the runtime. ``device=None``
    resolves to :data:`DEFAULT_DEVICE` (``"cpu"``; D4).

    Args:
        device: Warp device string (a CUDA device, ``"cpu"``, or ``None``
            for the D4 default ``"cpu"``).
        deterministic: records the requested D4 determinism posture. On CPU
            the bit-exact-same-hw guarantee is structural (serial launch),
            so this flag has no Warp-global to flip in 1.13.0 — see the
            module docstring.

    Returns the resolved device name (e.g. ``"cpu"``).
    """
    global _initialized, _deterministic
    if not _initialized:
        wp.init()
        _initialized = True
    _deterministic = bool(deterministic)
    set_device(device or DEFAULT_DEVICE)
    return get_device()


def is_deterministic() -> bool:
    """Return whether the last :func:`init` requested the deterministic posture."""
    return _deterministic


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

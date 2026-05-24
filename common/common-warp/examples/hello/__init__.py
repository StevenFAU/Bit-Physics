"""Subsystem 7 — the ``hello-warp`` 2D advection-diffusion smoke simulator.

The canonical consumer of the common-warp public surface (W-3). See
:mod:`hello.sim` for the simulator; ``README.md`` for the design notes.
"""

from __future__ import annotations

from .sim import HelloResult, hello_sim_runner, run_hello_sim

__all__ = ["HelloResult", "hello_sim_runner", "run_hello_sim"]

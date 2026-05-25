"""eulerian-smoke Stack-E port (NVIDIA Warp, device='cpu').

SEVENTH spec-Phase-2 per-sim cross-stack port; SECOND Stack-E port consuming
``common-warp`` (socket-only: Runtime + Capture + Determinism per D7). Own
``wp.array(dtype=wp.float64)`` storage per D15 (common-warp Particles/Grids are
f32 convenience surfaces; smoke is f64 -- warp.md § 6.1). Content-equivalent
Warp reimplementation of the Phase-1-frozen Stam-Fedkiw stable-fluids NumPy
reference (``stack.name="numpy-reference"``); cross-stack-validated against the
Phase-1 canonical captures at ``relative = 1e-4`` (gate 14, ``smoke`` tolerance
category) -- the SECOND R-P2 chaotic-regime instance (``within_tolerance=False``
is the CORRECT verdict; D10).

The ``reference`` / ``sim`` / ``invariants`` modules land at Stage 1b; this
package is the Stage-1a gate-13 failing-tests RED anchor.
"""

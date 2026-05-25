"""lattice-boltzmann-d3q19 Stack-E port (NVIDIA Warp, device='cpu').

EIGHTH spec-Phase-2 per-sim cross-stack port; THIRD Stack-E port consuming
``common-warp`` (socket-only: Runtime + Capture + Determinism per D7); SECOND
``lattice-boltzmann-d3q19`` port (after the Stack-D Taichi port). Own
``wp.array(dtype=wp.float64, ndim=4)`` storage for the 19-component D3Q19
distribution per D8/D15 (common-warp Particles/Grids are f32-pinned
single-component convenience surfaces that cannot hold a 19-component f64
lattice -- warp.md § 6.1 / § 6.2). Content-equivalent Warp reimplementation of
the Phase-1-frozen D3Q19 BGK NumPy reference (``stack.name="numpy-reference"``);
cross-stack-validated against the Phase-1 canonical captures at
``relative = 1e-5`` (gate 14, ``lbm`` tolerance category, portfolio-tightest) --
a cross-stack BIT-EXACT witness (``within_tolerance=True``, ``max_abs_err=0.0``;
shape (a); D10), the THIRD shape-(a) instance and the FIRST on a LAMINAR
trajectory.

The ``reference`` / ``sim`` / ``invariants`` modules land at Stage 1b; this
package is the Stage-1a gate-13 failing-tests RED anchor.
"""

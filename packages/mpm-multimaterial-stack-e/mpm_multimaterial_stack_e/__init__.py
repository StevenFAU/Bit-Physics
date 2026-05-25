"""Spec-Phase-2 Stack-E mpm-multimaterial MLS-MPM/APIC port (NVIDIA Warp, device='cpu').

SIXTH per-sim cross-stack port; FIRST Stack-E port consuming ``common-warp``
(socket-only: Runtime + Capture + Determinism). Own ``wp.array(dtype=wp.float64)``
storage per D15 (common-warp Particles/Grids are f32 convenience surfaces).
"""

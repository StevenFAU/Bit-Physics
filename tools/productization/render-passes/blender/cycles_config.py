"""Deterministic Cycles configuration (phase plan § 6.4 determinism boundary).

The render determinism gate is BIT-EXACT on the decoded pixel buffer for two
renders of the same asset in the same Blender, same OS, same sample count, same
seed (MEASURED, not assumed — see ``docs/productization/render-passes.md`` § 6).
That equality only holds when every non-deterministic knob is pinned:

- ``device = 'CPU'`` — GPU Cycles (OptiX/CUDA/HIP) is not bit-reproducible across
  drivers; CI has no GPU anyway (§ 6.4 anticipated problem). CPU is the gate.
- ``samples`` fixed + ``seed`` fixed — the path-tracer's sample sequence is a pure
  function of (seed, samples) on CPU.
- ``use_denoising = False`` — OIDN/OptiX denoisers are version- and thread-count
  sensitive; they would defeat the bit-exact gate.
- ``threads`` does NOT change CPU Cycles pixel output (tile results are summed in a
  fixed order), but we pin a deterministic tiling posture defensively.

This module is imported by ``render.py`` inside Blender's bundled Python; it takes
``bpy`` as an argument rather than importing it at module load so the helpers stay
unit-inspectable.
"""

from __future__ import annotations

# Canonical determinism knobs. These ARE the gate; do not relax to chase speed.
CANONICAL_SEED = 42
CANONICAL_SAMPLES = 128
CANONICAL_RES = 512


def apply_deterministic_cycles(
    scene,
    *,
    seed: int = CANONICAL_SEED,
    samples: int = CANONICAL_SAMPLES,
    resolution: int = CANONICAL_RES,
) -> dict[str, object]:
    """Pin every knob the bit-exact pixel-buffer determinism gate depends on.

    Returns the applied settings dict so ``render.py`` can record them in the
    rendered frame's ``metadata.json`` sidecar (provenance for the audit).
    """
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.seed = seed
    scene.cycles.use_denoising = False
    # Adaptive sampling would make the per-pixel sample count input-dependent;
    # disable so `samples` is the exact, reproducible budget for every pixel.
    scene.cycles.use_adaptive_sampling = False
    # Fixed sub-frame / no motion blur (single static volume frame).
    scene.render.use_motion_blur = False

    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100

    # PNG output: full RGBA, zero compression so the encode path is fixed. (The
    # PNG *container* still carries run-varying ancillary chunks — eXIf timestamp,
    # tEXt render-time — so the gate compares the DECODED pixel buffer, not file
    # bytes; render.py strips those chunks for the committed canonical frame.)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 0
    # Stamp metadata off — keeps Blender from baking the wall-clock into pixels.
    scene.render.use_stamp = False

    return {
        "engine": "CYCLES",
        "device": "CPU",
        "samples": samples,
        "seed": seed,
        "resolution": [resolution, resolution],
        "use_denoising": False,
        "use_adaptive_sampling": False,
    }

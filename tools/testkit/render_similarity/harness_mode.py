"""Render-similarity harness mode (`docs/phases/phase-3-plan.md:384-394`).

Stage 1a: scaffold shell. Stage 1b implements per the §3.2.2 invocation:

    python -m equivalence \\
      --mode render-similarity \\
      --left  <capture-dir-or-image-sequence> \\
      --right <capture-dir-or-image-sequence> \\
      --tolerance-key <e.g., continuous-ca.neural-ca>

The mode pairs frames by index, applies PSNR/SSIM/LPIPS per pair, compares
against `tolerance.toml`'s `[render_similarity.<category>.<sim>]` table tree
(D-SCHEMA Stage-1a lean: additive top-level key; see `tolerance-schema.json`),
and reports per-frame + aggregate pass/fail.

D-HARNESS-CLI Stage-1a lean (a): the CLI entry point is
`tools/testkit/equivalence/__main__.py` which routes `--mode render-similarity`
to `harness_mode.run(...)`. The existing programmatic `compare_captures`
surface is unchanged (no destructive refactor → STOP-CLI not fired).
"""

from __future__ import annotations

from pathlib import Path

_STAGE_1A_SHELL = (
    "render-similarity harness mode Stage 1a scaffold: implementation lands at Stage 1b"
)


def run(
    left: Path,
    right: Path,
    tolerance_key: str,
    tolerance_table_path: Path | None = None,
) -> int:
    """Run the render-similarity mode and return an exit-code.

    Returns 0 on aggregate PASS, non-zero on aggregate FAIL. The Stage 1b
    implementation reads paired capture frames / image sequences and resolves
    the `[render_similarity.<category>.<sim>]` thresholds for `tolerance_key`.
    """
    raise NotImplementedError(_STAGE_1A_SHELL)

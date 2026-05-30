"""``compare_captures`` — same-stack variant-vs-reference equivalence (§4.2.F).

Phase 0's cross-stack harness (``equivalence.compare_captures``) compares two
*stacks*; this adds same-stack-different-*variant* comparison at a matched sim
time with per-output tolerances. Accepts mixed schema versions (spec §2.7): each
capture is read by ``capture.load_capture`` and compared on the intersection of
declared fields; fields present in only one version are skipped unless a
:class:`VariantToleranceSpec` names them (a named field missing in the reference
raises ``ValueError``).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from capture import load_capture

from .report import EquivalenceReport
from .tolerance import VariantToleranceSpec


def _frames_by_time(capture: Any) -> dict[float, dict[str, np.ndarray]]:
    """Map a time coordinate -> state dict for each captured frame.

    Uses a ``time``/``sim_time`` diagnostic if present, else the integer step
    index as the time coordinate.
    """
    frames: dict[float, dict[str, np.ndarray]] = {}
    for step_state in capture.steps():
        diag = step_state.diagnostics
        if "time" in diag:
            t = float(np.asarray(diag["time"]).reshape(-1)[0])
        elif "sim_time" in diag:
            t = float(np.asarray(diag["sim_time"]).reshape(-1)[0])
        else:
            t = float(step_state.step)
        frames[t] = {k: np.asarray(v) for k, v in step_state.state.items()}
    return frames


def _state_at_time(capture: Any, at_sim_time: float) -> dict[str, np.ndarray]:
    frames = _frames_by_time(capture)
    if not frames:
        raise ValueError("capture has no frames to compare")
    nearest = min(frames, key=lambda t: abs(t - at_sim_time))
    return frames[nearest]


def _error_for(ref: np.ndarray, var: np.ndarray, spec: VariantToleranceSpec) -> tuple[float, float]:
    """Return (error, threshold) for one output under the spec's norm."""
    ref64 = ref.astype(np.float64)
    var64 = var.astype(np.float64)
    if ref64.shape != var64.shape:
        raise ValueError(
            f"{spec.output_name}: shape mismatch ref {ref64.shape} vs variant {var64.shape}"
        )
    diff = ref64 - var64
    if spec.norm == "L2":
        error = float(np.linalg.norm(diff.ravel(), 2))
        ref_norm = float(np.linalg.norm(ref64.ravel(), 2))
    elif spec.norm == "Linf":
        error = float(np.max(np.abs(diff))) if diff.size else 0.0
        ref_norm = float(np.max(np.abs(ref64))) if ref64.size else 0.0
    else:  # wasserstein
        from scipy.stats import wasserstein_distance

        error = float(wasserstein_distance(ref64.ravel(), var64.ravel()))
        ref_norm = float(np.max(np.abs(ref64))) if ref64.size else 0.0
    threshold = spec.absolute_tol + spec.relative_tol * ref_norm
    return error, threshold


def compare_captures(
    *,
    reference_capture: str,
    variant_capture: str,
    tolerances: list[VariantToleranceSpec],
    at_sim_time: float,
) -> EquivalenceReport:
    """Compare two captures at a matched sim time with per-output tolerances."""
    ref_cap = load_capture(Path(reference_capture))
    var_cap = load_capture(Path(variant_capture))
    ref_version = str(ref_cap.manifest.schema_version)
    var_version = str(var_cap.manifest.schema_version)

    ref_state = _state_at_time(ref_cap, at_sim_time)
    var_state = _state_at_time(var_cap, at_sim_time)

    named = {spec.output_name for spec in tolerances}
    for name in named:
        if name not in ref_state:
            raise ValueError(
                f"tolerance names output {name!r} absent from the reference capture "
                f"(available: {sorted(ref_state)})"
            )
        if name not in var_state:
            raise ValueError(
                f"tolerance names output {name!r} absent from the variant capture "
                f"(available: {sorted(var_state)})"
            )

    per_output_errors: dict[str, float] = {}
    per_output_passed: dict[str, bool] = {}
    for spec in tolerances:
        error, threshold = _error_for(
            ref_state[spec.output_name], var_state[spec.output_name], spec
        )
        per_output_errors[spec.output_name] = error
        per_output_passed[spec.output_name] = error <= threshold

    skipped = sorted((set(ref_state) ^ set(var_state)) - named)
    passed = bool(per_output_passed) and all(per_output_passed.values())
    return EquivalenceReport(
        passed=passed,
        per_output_errors=per_output_errors,
        per_output_passed=per_output_passed,
        reference_capture=reference_capture,
        variant_capture=variant_capture,
        at_sim_time=at_sim_time,
        reference_schema_version=ref_version,
        variant_schema_version=var_version,
        skipped_fields=skipped,
    )

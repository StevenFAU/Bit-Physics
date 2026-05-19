"""Capture diff (spec § 2.5 / § 2.6 — bit-exact + epsilon modes)."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

import numpy as np

from .reader import Capture, StepState, load_capture

DiffMode = Literal["bit-exact", "epsilon"]


@dataclass
class CaptureDiff:
    bit_exact: bool
    max_abs_err: float
    max_rel_err: float
    mismatched_fields: list[str] = field(default_factory=list)


def _step_keys(c: Capture) -> set[int]:
    return {s.step for s in c.steps()}


def _diff_step_pair(
    left: StepState,
    right: StepState,
    mode: DiffMode,
    rtol: float,
    atol: float,
) -> tuple[float, float, list[str]]:
    max_abs = 0.0
    max_rel = 0.0
    mismatched: list[str] = []
    keys = set(left.state.keys()) | set(right.state.keys())
    for k in keys:
        if k not in left.state or k not in right.state:
            mismatched.append(k)
            continue
        a = left.state[k]
        b = right.state[k]
        if a.shape != b.shape:
            mismatched.append(k)
            continue
        if a.dtype != b.dtype:
            raise TypeError(f"diff_captures: dtype mismatch on field {k!r}: {a.dtype} vs {b.dtype}")
        diff = np.abs(a.astype(np.float64) - b.astype(np.float64))
        abs_err = float(diff.max()) if diff.size else 0.0
        denom = np.maximum(np.abs(a.astype(np.float64)), np.abs(b.astype(np.float64)))
        with np.errstate(divide="ignore", invalid="ignore"):
            rel = np.where(denom > 0, diff / denom, 0.0)
        rel_err = float(rel.max()) if rel.size else 0.0
        max_abs = max(max_abs, abs_err)
        max_rel = max(max_rel, rel_err)
        if mode == "bit-exact":
            if not np.array_equal(a, b):
                mismatched.append(k)
        else:
            if abs_err > atol + rtol * float(np.abs(b).max() if b.size else 0.0):
                mismatched.append(k)
    return max_abs, max_rel, mismatched


def diff_captures(
    left: Path,
    right: Path,
    mode: DiffMode = "bit-exact",
    rtol: float = 0.0,
    atol: float = 0.0,
) -> CaptureDiff:
    left_cap = load_capture(left)
    right_cap = load_capture(right)

    left_keys = _step_keys(left_cap)
    right_keys = _step_keys(right_cap)
    if left_keys != right_keys:
        only_left = sorted(left_keys - right_keys)
        only_right = sorted(right_keys - left_keys)
        return CaptureDiff(
            bit_exact=False,
            max_abs_err=float("inf"),
            max_rel_err=float("inf"),
            mismatched_fields=[
                *(f"step:{n}:only-left" for n in only_left),
                *(f"step:{n}:only-right" for n in only_right),
            ],
        )

    max_abs = 0.0
    max_rel = 0.0
    mismatched: list[str] = []
    for n in sorted(left_keys):
        ls = left_cap.step(n)
        rs = right_cap.step(n)
        a, r, m = _diff_step_pair(ls, rs, mode=mode, rtol=rtol, atol=atol)
        max_abs = max(max_abs, a)
        max_rel = max(max_rel, r)
        for k in m:
            mismatched.append(f"step:{n}:{k}")

    bit_exact = not mismatched and max_abs == 0.0
    return CaptureDiff(
        bit_exact=bit_exact,
        max_abs_err=max_abs,
        max_rel_err=max_rel,
        mismatched_fields=mismatched,
    )

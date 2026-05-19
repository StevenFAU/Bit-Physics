"""Run-twice determinism harness (spec § 2.5).

Given a caller-supplied `SimRunner` that produces a capture file at a chosen
seed, the harness invokes it twice with the same seed in independent output
directories and diffs the resulting captures in bit-exact mode (via Block-1's
`diff_captures`). A `DeterminismVerdict` reports `bit_exact` and a one-line
detail message.

The contract: a determinism-claimed sim must produce byte-identical captures
under the same (seed, hardware) tuple. Spec § 2.5 distinguishes three claims
(`bit-exact-same-hw`, `epsilon`, `non-deterministic`); this harness witnesses
the strongest claim (`bit-exact-same-hw`).
"""

from __future__ import annotations

import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from capture import diff_captures


class SimRunner(Protocol):
    """Caller-supplied: produces a capture at `seed`, writes under `out_dir`.

    The returned `Path` is the manifest JSON's location; Block-1's
    `write_capture` returns exactly this. Implementations must respect
    `seed` (re-seed every RNG-touching object on every call) for the
    determinism claim to hold.
    """

    def __call__(self, seed: int, out_dir: Path) -> Path: ...


@dataclass
class DeterminismVerdict:
    """Outcome of `run_twice_and_diff`.

    `bit_exact` is True iff every step's every field matches byte-for-byte.
    `detail` is a one-line message: either "captures match exactly" or a
    structured first-mismatch description.
    """

    bit_exact: bool
    detail: str


def _summarize_first_mismatch(
    max_abs_err: float, max_rel_err: float, mismatched_fields: list[str]
) -> str:
    if not mismatched_fields:
        return f"max_abs_err={max_abs_err:g}, max_rel_err={max_rel_err:g}"
    head = mismatched_fields[0]
    extra = f" (+{len(mismatched_fields) - 1} more)" if len(mismatched_fields) > 1 else ""
    return (
        f"max_abs_err={max_abs_err:g}, max_rel_err={max_rel_err:g}; first mismatch at {head}{extra}"
    )


def run_twice_and_diff(
    runner: SimRunner,
    seed: int = 42,
    tmp_dir: Path | None = None,
) -> DeterminismVerdict:
    """Run `runner` twice at `seed` and diff the resulting captures bit-exact.

    Args:
        runner: caller-supplied sim driver matching the `SimRunner` protocol.
        seed: deterministic seed; both invocations receive this value.
        tmp_dir: optional base directory under which the two run subdirs are
            created. When None, the system temp dir is used. The harness
            does NOT remove its output; callers may inspect the artifacts.

    Returns:
        DeterminismVerdict: `bit_exact = True` iff the two captures match
        byte-for-byte under `diff_captures(... mode="bit-exact", ...)`.
    """
    base = Path(tmp_dir) if tmp_dir is not None else Path(tempfile.mkdtemp(prefix="det-"))
    base.mkdir(parents=True, exist_ok=True)
    left_dir = base / "run-a"
    right_dir = base / "run-b"
    left_dir.mkdir(parents=True, exist_ok=True)
    right_dir.mkdir(parents=True, exist_ok=True)

    left_manifest = runner(seed, left_dir)
    right_manifest = runner(seed, right_dir)

    diff = diff_captures(left_manifest, right_manifest, mode="bit-exact")
    if diff.bit_exact:
        return DeterminismVerdict(bit_exact=True, detail="captures match exactly")
    return DeterminismVerdict(
        bit_exact=False,
        detail=_summarize_first_mismatch(
            diff.max_abs_err, diff.max_rel_err, diff.mismatched_fields
        ),
    )

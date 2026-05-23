"""Run-twice determinism harness (spec § 2.5).

Given a caller-supplied `SimRunner` that produces a capture file at a chosen
seed, the harness invokes it twice with the same seed in independent output
directories and diffs the resulting captures over the canonical Capture data
model (parsed steps x state x diagnostics — wall-clock-influenced storage-
format metadata such as HDF5 object-header timestamps is explicitly excluded
from the comparison). A `DeterminismVerdict` reports `content_equivalent` and
a one-line detail message.

The contract: a determinism-claimed sim must produce **content-equivalent**
captures under the same (seed, hardware) tuple — every state array and every
diagnostic entry in its canonical Capture is bit-identical
(``np.array_equal`` / equivalent) across two runs at the same seed on the
same hardware; storage-format metadata is excluded. Spec § 2.5 distinguishes
three claims (`bit-exact-same-hw`, `epsilon`, `non-deterministic`); this
harness witnesses the strongest claim (`bit-exact-same-hw`) under the
content-equivalent semantics established by
`sub-phase-capture-determinism-contract`.

The legacy attribute name ``DeterminismVerdict.bit_exact`` is preserved as a
backward-compatibility property that returns ``content_equivalent`` and
emits a ``DeprecationWarning`` on access. Migrate to ``content_equivalent``
in new code.
"""

from __future__ import annotations

import tempfile
import warnings
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

    `content_equivalent` is True iff every step's every state array and
    every diagnostic entry matches across the two captures under the
    content projection (parsed steps x state x diagnostics; storage-format
    metadata excluded). `detail` is a one-line message: either
    "captures match exactly" or a structured first-mismatch description.
    """

    content_equivalent: bool
    detail: str

    @property
    def bit_exact(self) -> bool:
        """Deprecated alias for :attr:`content_equivalent`.

        Preserved for backward-compatibility with pre-
        sub-phase-capture-determinism-contract callers. Migrate to
        ``content_equivalent`` in new code; the old name will be removed
        after a documented deprecation window.
        """
        warnings.warn(
            "DeterminismVerdict.bit_exact is deprecated; "
            "use DeterminismVerdict.content_equivalent instead. "
            "Same-stack same-hw determinism is content-equivalent over the "
            "parsed Capture projection per spec § 2.5 + "
            "sub-phase-capture-determinism-contract; "
            "raw-file byte-equality is not the contract.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.content_equivalent


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
    """Run `runner` twice at `seed` and diff the resulting captures.

    The comparison is content-equivalent over the parsed Capture data model
    (every state array and every diagnostic entry compared via
    ``np.array_equal`` semantics under ``diff_captures(... mode="bit-exact",
    ...)``). Storage-format metadata such as HDF5 object-header timestamps
    is excluded from the comparison.

    Args:
        runner: caller-supplied sim driver matching the `SimRunner` protocol.
        seed: deterministic seed; both invocations receive this value.
        tmp_dir: optional base directory under which the two run subdirs are
            created. When None, the system temp dir is used. The harness
            does NOT remove its output; callers may inspect the artifacts.

    Returns:
        DeterminismVerdict: `content_equivalent = True` iff every state
        array and every diagnostic entry in the two captures matches under
        `diff_captures(... mode="bit-exact", ...)`.
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
        return DeterminismVerdict(content_equivalent=True, detail="captures match exactly")
    return DeterminismVerdict(
        content_equivalent=False,
        detail=_summarize_first_mismatch(
            diff.max_abs_err, diff.max_rel_err, diff.mismatched_fields
        ),
    )

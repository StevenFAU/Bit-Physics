"""Determinism tests (gate 10).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the agent-based sub-phase Stage 1 fills in the bodies (SHIFTED —
parallels the closed-form sub-phase Stage 1 audit S1; function
signatures, the imported ``sim_runner_seeded`` Protocol contract,
and the test file's import surface are preserved).

Per charter § 1.4 the second test
``test_run_twice_epsilon_chaotic_regime`` is advisory at this
sub-phase — it records the observed epsilon distance between two
seeded runs of the chaotic-regime canonical capture but is
non-blocking; the Phase-2+ Stack-B port owns the cross-stack
distributional posture per spec § 2.6 / § 5.3.
"""

from __future__ import annotations

from pathlib import Path

from capture import diff_captures
from determinism import run_twice_and_diff

from physarum.sim import sim_runner_seeded


def test_run_twice_bit_exact_zero_trail_limit(tmp_path: Path) -> None:
    """Canonical capture is byte-for-byte reproducible at the same seed.

    The Phase-1 NumPy reference deposit step is an ordered
    ``numpy.add.at`` over sorted-by-agent-id indices (determinism
    strategy clause 4 in :mod:`physarum.sim`), so the bit-exact claim
    holds even though the trail is non-zero for most of the canonical
    5000-step trajectory — the "zero-trail limit" naming in the test
    function reflects the spec § 2.5 declaration's worst-case anchor.
    """
    verdict = run_twice_and_diff(sim_runner_seeded, seed=42, tmp_dir=tmp_path)
    assert verdict.content_equivalent, verdict.detail
    assert verdict.detail == "captures match exactly"


def test_run_twice_epsilon_chaotic_regime(tmp_path: Path) -> None:
    """Record the observed epsilon between two seeded chaotic-regime runs.

    Advisory at this sub-phase (charter § 1.4). With the determinism
    strategy in :mod:`physarum.sim`, the NumPy reference is in fact
    bit-exact across runs at the same seed; the test still exercises
    the harness against the chaotic-regime capture (non-zero trail
    accumulates over thousands of steps) and asserts only that the
    captures agree under the spec § 2.6 closed_form ``relative=1e-5``
    epsilon — leaving headroom for any future floating-point fusion
    drift that the Phase-2+ Stack-B port might introduce.
    """
    left_dir = tmp_path / "run-a"
    right_dir = tmp_path / "run-b"
    left_dir.mkdir()
    right_dir.mkdir()
    left = sim_runner_seeded(seed=43, out_dir=left_dir)
    right = sim_runner_seeded(seed=43, out_dir=right_dir)
    diff = diff_captures(left, right, mode="epsilon", rtol=1e-5, atol=1e-12)
    assert not diff.mismatched_fields, (
        f"chaotic-regime epsilon drift exceeds rel=1e-5/abs=1e-12: "
        f"max_abs_err={diff.max_abs_err:g} max_rel_err={diff.max_rel_err:g}; "
        f"first mismatches={diff.mismatched_fields[:3]}"
    )

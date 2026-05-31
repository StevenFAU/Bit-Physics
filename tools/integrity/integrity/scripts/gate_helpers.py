"""Light gate checks invoked by GATE_COMMANDS in ``replay_prior_phase``.

Each subcommand probes a Phase 0 artifact for its baseline invariants —
file present, parseable, and asserting the schema fields the Phase 0
landing audit attested to. These are presence/shape checks, not fresh
test runs; mutation testing in particular is intentionally NOT triggered
here (Phase 0 landed a framework-validated baseline per spec § 2.13;
fresh kill-rate runs activate later under Phase 1+ CI).

CLI:

    python -m integrity.scripts.gate_helpers <subcommand>

Subcommands return 0 on pass, non-zero on fail, with diagnostic text on
stderr so the replay log surfaces the failure mode cleanly.
"""

from __future__ import annotations

import argparse
import json
import sys
import tomllib
from pathlib import Path

# Legitimate mutation-baseline `status` values. The format evolved across
# phases: Phase 0 landed `framework-validated` (framework wired, per-target
# kill-rates deferred); from the first per-sim sub-phase onward the baselines
# carry `real-baseline` (actual measured kill-rates). BOTH are legitimate
# baseline declarations — the gate's load-bearing claim is "a real, parseable
# baseline file with targets exists", not a single frozen status literal.
# (Phase-4 D3: the gate_helper had drifted behind the baseline format; the
# latest committed baseline `baseline-2026-05-28T03-23-44Z.json` declares
# `real-baseline`, which this gate now accepts honestly. NOT a masking of any
# A3 change — A3 wrote `phase-4-a3-source-only-*.json`, which does not match the
# `baseline-*.json` glob below and is not consulted here.)
_VALID_BASELINE_STATUSES = frozenset({"framework-validated", "real-baseline"})


def _mutation_baseline_present() -> int:
    """Mutation gate: a legitimate mutation baseline is present.

    Asserts: a ``baseline-*.json`` exists under ``tools/testkit/mutation/``,
    parses as JSON, declares ``status`` in ``_VALID_BASELINE_STATUSES``, and
    carries a non-empty ``targets`` list.
    """
    mutation_dir = Path("tools/testkit/mutation")
    files = sorted(mutation_dir.glob("baseline-*.json"))
    if not files:
        print(
            f"gate_helpers: no mutation baseline file under {mutation_dir}/",
            file=sys.stderr,
        )
        return 1
    latest = files[-1]
    try:
        data = json.loads(latest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(
            f"gate_helpers: mutation baseline {latest} unreadable: {exc}",
            file=sys.stderr,
        )
        return 1
    status = data.get("status")
    if status not in _VALID_BASELINE_STATUSES:
        print(
            f"gate_helpers: mutation baseline {latest} status={status!r}; "
            f"expected one of {sorted(_VALID_BASELINE_STATUSES)}",
            file=sys.stderr,
        )
        return 1
    targets = data.get("targets")
    if not isinstance(targets, list) or not targets:
        print(
            f"gate_helpers: mutation baseline {latest} 'targets' missing or empty",
            file=sys.stderr,
        )
        return 1
    print(
        f"gate_helpers: mutation baseline OK ({latest.name} status={status} targets={len(targets)})"
    )
    return 0


def _mutation_promoted_floor() -> int:
    """Mutation gate: every PROMOTED target in the latest hardening ledger meets floor.

    The Phase-4.1 hardening pass earned the first per-target HARD_FAIL-at-landing
    promotions (spec § 2.13). This gate reads the latest
    ``tools/testkit/mutation/phase-*-hardening-*.json`` ledger and asserts that
    every target declaring ``posture == "HARD_FAIL-at-landing"`` records a
    ``score >= threshold``. A regression that drops a promoted target below floor
    cannot land without updating — and thus re-justifying — the ledger.

    No hardening ledger ⇒ no promotions to enforce ⇒ pass (additive gate).
    """
    mutation_dir = Path("tools/testkit/mutation")
    files = sorted(mutation_dir.glob("phase-*-hardening-*.json"))
    if not files:
        print("gate_helpers: no mutation-hardening ledger; no promoted targets to enforce")
        return 0
    latest = files[-1]
    try:
        data = json.loads(latest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"gate_helpers: hardening ledger {latest} unreadable: {exc}", file=sys.stderr)
        return 1
    targets = data.get("targets")
    if not isinstance(targets, list) or not targets:
        print(
            f"gate_helpers: hardening ledger {latest} 'targets' missing or empty", file=sys.stderr
        )
        return 1
    promoted = [t for t in targets if t.get("posture") == "HARD_FAIL-at-landing"]
    failures: list[str] = []
    for t in promoted:
        score, threshold = t.get("score"), t.get("threshold")
        if not isinstance(score, (int, float)) or not isinstance(threshold, (int, float)):
            failures.append(
                f"{t.get('target')!r}: non-numeric score/threshold ({score}/{threshold})"
            )
        elif score < threshold:
            failures.append(f"{t.get('target')!r}: score {score} < floor {threshold}")
    if failures:
        print(
            f"gate_helpers: promoted-target floor violated in {latest.name}: "
            + "; ".join(failures),
            file=sys.stderr,
        )
        return 1
    names = ", ".join(f"{t['target']}={t['score']}" for t in promoted)
    print(
        f"gate_helpers: mutation promoted-floor OK ({latest.name}; "
        f"{len(promoted)} promoted: {names or 'none'})"
    )
    return 0


def _tolerance_budget_trivial() -> int:
    """Phase 0 tolerance-budget gate (per Phase-1 plan R9 amendment).

    Asserts: ``tools/testkit/equivalence/tolerance-budget.toml`` exists,
    parses as TOML, has a top-level ``[phase]`` section with at least
    ``phase`` and ``opened_at`` keys, and carries no per-sim overrides
    (R9 amendment: "no per-sim overrides — the tolerance-budget gate
    passes trivially"). Per-sim *override* tables live in the sibling
    ``tolerance.toml`` file; their presence in ``tolerance-budget.toml``
    is a misuse the gate refuses.
    """
    path = Path("tools/testkit/equivalence/tolerance-budget.toml")
    if not path.exists():
        print(f"gate_helpers: tolerance budget file missing: {path}", file=sys.stderr)
        return 1
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as exc:
        print(
            f"gate_helpers: tolerance budget {path} unparseable: {exc}",
            file=sys.stderr,
        )
        return 1
    phase = data.get("phase")
    if not isinstance(phase, dict) or "phase" not in phase or "opened_at" not in phase:
        print(
            f"gate_helpers: tolerance budget {path} missing [phase] section "
            f"with phase + opened_at keys",
            file=sys.stderr,
        )
        return 1
    overrides = data.get("overrides")
    if overrides:
        print(
            f"gate_helpers: tolerance budget {path} has per-sim overrides "
            f"in the budget file; R9 'trivially passes' violated "
            f"(per-sim overrides belong in tolerance.toml, not -budget.toml)",
            file=sys.stderr,
        )
        return 1
    print(
        f"gate_helpers: tolerance budget OK ({path.name} "
        f"phase={phase.get('phase')!r}, no per-sim overrides)"
    )
    return 0


_SUBCOMMANDS = {
    "mutation-baseline-present": _mutation_baseline_present,
    "mutation-promoted-floor": _mutation_promoted_floor,
    "tolerance-budget-trivial": _tolerance_budget_trivial,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m integrity.scripts.gate_helpers",
        description=__doc__,
    )
    parser.add_argument(
        "subcommand",
        choices=sorted(_SUBCOMMANDS),
        help="Which gate-helper subcommand to run.",
    )
    args = parser.parse_args(list(argv) if argv is not None else sys.argv[1:])
    return _SUBCOMMANDS[args.subcommand]()


if __name__ == "__main__":
    raise SystemExit(main())

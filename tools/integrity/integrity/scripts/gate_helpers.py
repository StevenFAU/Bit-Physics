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


def _mutation_baseline_present() -> int:
    """Phase 0 mutation gate (per landing audit § 4).

    Asserts: a ``baseline-*.json`` exists under ``tools/testkit/mutation/``,
    parses as JSON, declares ``status == "framework-validated"``, and
    carries a non-empty ``targets`` list. The Phase 0 landing audit's
    only SHIFT was that fresh per-target kill-rates were deferred — the
    *framework-validated* invariant is what Phase 0 actually landed,
    and is the load-bearing claim this gate re-verifies.
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
    if status != "framework-validated":
        print(
            f"gate_helpers: mutation baseline {latest} status={status!r}; "
            f"expected 'framework-validated'",
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
        f"gate_helpers: mutation baseline OK ({latest.name} "
        f"status=framework-validated targets={len(targets)})"
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

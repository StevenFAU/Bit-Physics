"""Property-based testing harness (spec § 2.14).

`run_invariants(sim_runner, invariants, n_examples)` repeatedly invokes the
caller's `sim_runner` against random initial conditions sampled from a
Hypothesis strategy and asserts every supplied `Invariant` against the
returned capture. The first violation surfaces with a shrunken counter-
example (Hypothesis's shrinker drives the minimization).

The contract is intentionally narrow: an `Invariant` is a (name, category,
check_fn) triple. The harness does not interpret semantics; the invariant
library at `invariants/` ships the canonical implementations.
"""

from __future__ import annotations

import contextlib
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from hypothesis.strategies import SearchStrategy

from capture import Capture, load_capture


class SimRunnerPBT(Protocol):
    """Caller-supplied: produces a capture from a random initial condition.

    The signature is intentionally distinct from
    `bit_physics_testkit.determinism.SimRunner`: PBT sims consume the
    Hypothesis-generated `initial_condition` directly rather than a `seed`.
    """

    def __call__(self, initial_condition: Any, out_dir: Path) -> Path: ...


@dataclass
class Pass:
    """Invariant held on the capture."""

    detail: str = "ok"


@dataclass
class Fail:
    """Invariant violated; `counter_example` carries the offending input."""

    detail: str
    counter_example: Any = None


InvariantOutcome = Pass | Fail


@dataclass
class Invariant:
    """A named, category-scoped property of a capture.

    `check_fn(capture)` returns `Pass()` or `Fail(detail, counter_example)`.
    `applies_to_category` is a substring matched against the capture
    manifest's `sim.category`; the empty string matches all categories.
    """

    name: str
    applies_to_category: str
    check_fn: Callable[[Capture], InvariantOutcome]


@dataclass
class InvariantResult:
    """Per-invariant verdict from a `run_invariants` sweep."""

    invariant: str
    passed: bool
    detail: str
    counter_example: Any = None


@dataclass
class PropertyVerdict:
    """Top-level outcome of `run_invariants`."""

    all_passed: bool
    results: list[InvariantResult] = field(default_factory=list)


def _runs_for_invariant(
    sim_runner: SimRunnerPBT,
    invariant: Invariant,
    strategy: SearchStrategy[Any],
    n_examples: int,
    tmp_root: Path,
) -> InvariantResult:
    """Drive Hypothesis at a single invariant; return the first failure (shrunken)."""
    failure: dict[str, Any] = {}

    @settings(
        max_examples=n_examples,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        database=None,
    )
    @given(strategy)
    def _check(example: Any) -> None:
        idx = len(failure)  # never used for naming once a failure exists
        run_dir = tmp_root / invariant.name / f"ex-{idx:04d}"
        run_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = sim_runner(example, run_dir)
        capture = load_capture(manifest_path)
        outcome = invariant.check_fn(capture)
        if isinstance(outcome, Fail):
            failure["detail"] = outcome.detail
            failure["counter_example"] = (
                outcome.counter_example if outcome.counter_example is not None else example
            )
            raise AssertionError(failure["detail"])

    with contextlib.suppress(AssertionError):
        _check()

    if failure:
        return InvariantResult(
            invariant=invariant.name,
            passed=False,
            detail=failure["detail"],
            counter_example=failure["counter_example"],
        )
    return InvariantResult(invariant=invariant.name, passed=True, detail="ok")


def run_invariants(
    sim_runner: SimRunnerPBT,
    invariants: Sequence[Invariant],
    strategy: SearchStrategy[Any] | None = None,
    n_examples: int = 100,
    tmp_dir: Path | None = None,
) -> PropertyVerdict:
    """Run `invariants` over `n_examples` random initial conditions.

    Args:
        sim_runner: caller-supplied sim driver.
        invariants: list of `Invariant` objects to check.
        strategy: Hypothesis strategy producing one initial condition per
            example. When None, a degenerate strategy of `st.just(None)`
            is used (caller's sim must then ignore the IC). Real callers
            pass strategies from `property.strategies`.
        n_examples: per-invariant example budget.
        tmp_dir: optional base directory for the captures Hypothesis emits.

    Returns:
        PropertyVerdict aggregating per-invariant outcomes.
    """
    import tempfile

    base = Path(tmp_dir) if tmp_dir is not None else Path(tempfile.mkdtemp(prefix="pbt-"))
    base.mkdir(parents=True, exist_ok=True)
    effective_strategy: SearchStrategy[Any] = strategy if strategy is not None else st.just(None)
    results: list[InvariantResult] = []
    for inv in invariants:
        results.append(_runs_for_invariant(sim_runner, inv, effective_strategy, n_examples, base))
    return PropertyVerdict(
        all_passed=all(r.passed for r in results),
        results=results,
    )

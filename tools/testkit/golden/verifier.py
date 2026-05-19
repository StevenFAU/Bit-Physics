"""Golden-value verifier (spec § 2.4, Phase 0 plan § 3.3.4).

Loads a golden-value table from JSON, schema-validates against
`tools/testkit/schemas/golden-v1.json`, then runs the caller-supplied
`KernelEvaluator` on every test point and reports per-point pass/fail
against the table's tolerance.

The verifier knows nothing about specific algorithms; the caller passes
the table path and the evaluator. Block 5 INTEGRITY's Cat 3 check is the
first canonical consumer.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

from jsonschema import Draft202012Validator

_SCHEMA_PATH = Path(__file__).resolve().parent.parent / "schemas" / "golden-v1.json"


class KernelEvaluator(Protocol):
    """Caller-supplied callable: ``inputs (dict) -> outputs (dict)``.

    Per Phase 0 plan § 3.3.4. Both the inputs dict and the outputs dict
    are algorithm-specific; the table records what keys to expect.
    """

    def __call__(self, inputs: dict[str, Any]) -> dict[str, Any]: ...


@dataclass
class GoldenVerifierResult:
    """Outcome of running a `KernelEvaluator` against a golden table.

    Fields per Phase 0 plan § 3.3.4. `failures` carries one dict per
    diverging test point: ``{"index": int, "inputs": dict, "expected":
    dict, "actual": dict, "max_abs_err": float, "max_rel_err": float}``.
    """

    table_path: Path
    algorithm: str
    points_tested: int
    points_passed: int
    failures: list[dict[str, Any]] = field(default_factory=list)
    ok: bool = False


def _load_schema() -> dict[str, Any]:
    with _SCHEMA_PATH.open("r", encoding="utf-8") as fh:
        data: dict[str, Any] = json.load(fh)
    return data


def _within_tolerance(
    expected: float, actual: float, atol: float, rtol: float
) -> tuple[bool, float, float]:
    """Return ``(passed, abs_err, rel_err)``.

    Same semantics as `numpy.isclose`: `|a - e| <= atol + rtol * |e|`.
    `rel_err` is reported as `|a - e| / max(|e|, tiny)` for diagnostic
    purposes (tiny = 1e-300 to avoid division-by-zero on expected=0).
    """
    abs_err = abs(actual - expected)
    rel_err = abs_err / max(abs(expected), 1e-300)
    passed = abs_err <= atol + rtol * abs(expected)
    return passed, abs_err, rel_err


def verify_against_table(
    table_path: Path,
    evaluator: KernelEvaluator,
) -> GoldenVerifierResult:
    """Run ``evaluator`` against every test point in ``table_path``.

    Args:
        table_path: Path to a JSON file conforming to
            `tools/testkit/schemas/golden-v1.json`.
        evaluator: A `KernelEvaluator` returning a dict whose keys cover
            every key in each test point's ``expected`` dict.

    Returns:
        A `GoldenVerifierResult`. ``ok`` is True iff every test point
        passed the table's `tolerance` (absolute and relative both
        respected per-output-key).

    Raises:
        FileNotFoundError: if ``table_path`` does not exist.
        jsonschema.ValidationError: if the loaded table fails schema.
        KeyError: if the evaluator omits an expected output key.
    """
    table_path = Path(table_path)
    with table_path.open("r", encoding="utf-8") as fh:
        table: dict[str, Any] = json.load(fh)

    Draft202012Validator(_load_schema()).validate(table)

    algorithm = str(table["algorithm"])
    test_points = table["test_points"]
    atol = float(table["tolerance"]["absolute"])
    rtol = float(table["tolerance"]["relative"])

    failures: list[dict[str, Any]] = []
    points_passed = 0
    for idx, point in enumerate(test_points):
        inputs = dict(point["inputs"])
        expected = dict(point["expected"])
        actual = evaluator(inputs)

        point_passed = True
        max_abs = 0.0
        max_rel = 0.0
        for key, exp_val in expected.items():
            if key not in actual:
                raise KeyError(
                    f"evaluator output missing key {key!r} for point {idx} "
                    f"(inputs={inputs!r}); algorithm={algorithm!r}"
                )
            passed, abs_err, rel_err = _within_tolerance(
                float(exp_val), float(actual[key]), atol, rtol
            )
            if not passed:
                point_passed = False
            if abs_err > max_abs:
                max_abs = abs_err
            if rel_err > max_rel:
                max_rel = rel_err

        if point_passed:
            points_passed += 1
        else:
            failures.append(
                {
                    "index": idx,
                    "inputs": inputs,
                    "expected": expected,
                    "actual": actual,
                    "max_abs_err": max_abs,
                    "max_rel_err": max_rel,
                }
            )

    points_tested = len(test_points)
    return GoldenVerifierResult(
        table_path=table_path,
        algorithm=algorithm,
        points_tested=points_tested,
        points_passed=points_passed,
        failures=failures,
        ok=(points_passed == points_tested),
    )

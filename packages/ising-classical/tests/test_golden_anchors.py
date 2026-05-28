"""Class (a) — Golden-value anchors (closed-form vs golden tables).

Asserts the reference closed-form functions reproduce the golden-table
values (Onsager `T_c`, Yang `m(T)`) within the table tolerance, and
that each table carries ≥ 3 independent-reference anchors per spec
§ 2.4 (Cat 3 contract).

Stage 1a: the closed-form functions raise ``NotImplementedError`` (and
the golden tables do not exist yet). Stage 1b lands both and inverts to
GREEN.
"""

from __future__ import annotations

import json
from pathlib import Path

from ising_classical.reference import critical_temperature, onsager_magnetization


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "pyproject.toml").exists() and (parent / "tools" / "testkit").is_dir():
            return parent
    raise RuntimeError(f"could not locate repo root above {here}")


_GOLDEN = _repo_root() / "tools" / "testkit" / "golden" / "tables"
_TC_TABLE = _GOLDEN / "ising-classical-critical-temperature.json"
_MAG_TABLE = _GOLDEN / "ising-classical-magnetization.json"


def _count_independent_anchors(table: dict) -> int:
    return sum(1 for tp in table["test_points"] if "independent_reference" in tp)


def test_critical_temperature_table_anchors() -> None:
    # Call the closed-form first — at Stage 1a this raises NotImplementedError.
    tc = critical_temperature()
    table = json.loads(_TC_TABLE.read_text(encoding="utf-8"))
    assert _count_independent_anchors(table) >= 3, "Cat-3 needs ≥ 3 independent_reference anchors"
    rtol = float(table["tolerance"]["relative"])
    atol = float(table["tolerance"]["absolute"])
    for tp in table["test_points"]:
        expected = float(tp["expected"]["T_c"])
        assert abs(tc - expected) <= atol + rtol * abs(expected), (
            f"T_c closed-form {tc} != table anchor {expected} (rtol={rtol})"
        )


def test_magnetization_table_anchors() -> None:
    # Call the closed-form first — at Stage 1a this raises NotImplementedError.
    _ = onsager_magnetization(1.0)
    table = json.loads(_MAG_TABLE.read_text(encoding="utf-8"))
    assert _count_independent_anchors(table) >= 3, "Cat-3 needs ≥ 3 independent_reference anchors"
    rtol = float(table["tolerance"]["relative"])
    atol = float(table["tolerance"]["absolute"])
    for tp in table["test_points"]:
        temperature = float(tp["inputs"]["T"])
        expected = float(tp["expected"]["m"])
        got = onsager_magnetization(temperature)
        assert abs(got - expected) <= atol + rtol * abs(expected), (
            f"m({temperature}) closed-form {got} != table anchor {expected} (rtol={rtol})"
        )

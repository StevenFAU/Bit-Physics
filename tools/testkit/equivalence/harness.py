"""Cross-stack equivalence harness (spec § 2.6).

Given two capture manifests produced by different stacks (or the same stack
at different commit hashes) and the canonical tolerance table, the harness
diffs the two captures field-by-field and verdicts the comparison against the
category's tolerance.

The tolerance table is `tolerance.toml` at this directory; per-sim overrides
must remain within the per-category caps recorded in `tolerance-budget.toml`
(Block-5 INTEGRITY's Cat-X check enforces; the harness itself does not).
"""

from __future__ import annotations

import json
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
from jsonschema import validate as jsonschema_validate

from capture import load_capture

DEFAULT_TOLERANCE_TABLE: Path = Path(__file__).resolve().parent / "tolerance.toml"
_SCHEMA_PATH: Path = Path(__file__).resolve().parent / "tolerance-schema.json"


@dataclass
class EquivalenceVerdict:
    """Outcome of `compare_captures`.

    `per_field_diff` maps field-name to `{max_abs_err, max_rel_err}` (both
    floats). `tolerance_table_used` records the resolved `{category,
    relative, absolute}` used for the comparison.
    """

    within_tolerance: bool
    per_field_diff: dict[str, dict[str, float]] = field(default_factory=dict)
    tolerance_table_used: dict[str, Any] = field(default_factory=dict)


def _load_schema() -> dict[str, Any]:
    with _SCHEMA_PATH.open("r", encoding="utf-8") as fh:
        schema: dict[str, Any] = json.load(fh)
    return schema


def load_tolerance_table(path: Path) -> dict[str, Any]:
    """Load and schema-validate the tolerance table from a TOML file.

    Returns the parsed dict (defaults + optional overrides). Raises
    `jsonschema.ValidationError` on malformed tables.
    """
    with Path(path).open("rb") as fh:
        data = tomllib.load(fh)
    jsonschema_validate(instance=data, schema=_load_schema())
    return data


def _resolve_tolerance(table: dict[str, Any], sim_name: str, sim_category: str) -> dict[str, Any]:
    """Resolve effective {category, relative, absolute} for (sim, category)."""
    defaults = table["defaults"]
    overrides = table.get("overrides", {})
    base_category = sim_category
    relative: float
    absolute: float
    if sim_name in overrides:
        ov = overrides[sim_name]
        base_category = ov["category"]
        default_for_cat = defaults.get(base_category, {})
        relative = float(ov.get("relative", default_for_cat.get("relative", 0.0)))
        absolute = float(ov.get("absolute", default_for_cat.get("absolute", 0.0)))
    else:
        if sim_category not in defaults:
            raise KeyError(
                f"tolerance.toml has no defaults for category {sim_category!r}; "
                f"add `[defaults.{sim_category}]` or an override for sim {sim_name!r}"
            )
        relative = float(defaults[sim_category]["relative"])
        absolute = float(defaults[sim_category]["absolute"])
    return {"category": base_category, "relative": relative, "absolute": absolute}


def compare_captures(
    left: Path,
    right: Path,
    tolerance_table_path: Path | None = None,
) -> EquivalenceVerdict:
    """Field-by-field cross-stack diff against the resolved tolerance.

    The category and sim name are pulled from the LEFT manifest's
    `sim.category` and `sim.name`; the RIGHT manifest must agree (a mismatch
    is a HARD_FAIL via `within_tolerance=False` plus a synthetic
    `sim:category-mismatch` entry in `per_field_diff`).
    """
    table_path = tolerance_table_path or DEFAULT_TOLERANCE_TABLE
    table = load_tolerance_table(table_path)

    left_cap = load_capture(left)
    right_cap = load_capture(right)

    if left_cap.manifest.sim.get("category") != right_cap.manifest.sim.get(
        "category"
    ) or left_cap.manifest.sim.get("name") != right_cap.manifest.sim.get("name"):
        return EquivalenceVerdict(
            within_tolerance=False,
            per_field_diff={
                "sim:category-mismatch": {
                    "max_abs_err": float("inf"),
                    "max_rel_err": float("inf"),
                }
            },
            tolerance_table_used={"path": str(table_path)},
        )

    resolved = _resolve_tolerance(
        table,
        sim_name=str(left_cap.manifest.sim.get("name", "")),
        sim_category=str(left_cap.manifest.sim.get("category", "")),
    )
    rtol = resolved["relative"]
    atol = resolved["absolute"]

    left_steps = sorted(s.step for s in left_cap.steps())
    right_steps = sorted(s.step for s in right_cap.steps())
    if left_steps != right_steps:
        return EquivalenceVerdict(
            within_tolerance=False,
            per_field_diff={
                "step:set-mismatch": {
                    "max_abs_err": float("inf"),
                    "max_rel_err": float("inf"),
                }
            },
            tolerance_table_used={**resolved, "path": str(table_path)},
        )

    per_field: dict[str, dict[str, float]] = {}
    within = True
    for n in left_steps:
        ls = left_cap.step(n)
        rs = right_cap.step(n)
        keys = set(ls.state.keys()) | set(rs.state.keys())
        for k in keys:
            if k not in ls.state or k not in rs.state:
                per_field[f"step:{n}:{k}:missing"] = {
                    "max_abs_err": float("inf"),
                    "max_rel_err": float("inf"),
                }
                within = False
                continue
            a = ls.state[k]
            b = rs.state[k]
            if a.shape != b.shape:
                per_field[f"step:{n}:{k}:shape-mismatch"] = {
                    "max_abs_err": float("inf"),
                    "max_rel_err": float("inf"),
                }
                within = False
                continue
            if a.dtype != b.dtype:
                raise TypeError(
                    f"compare_captures: dtype mismatch on field {k!r}: {a.dtype} vs {b.dtype}"
                )
            diff = np.abs(a.astype(np.float64) - b.astype(np.float64))
            abs_err = float(diff.max()) if diff.size else 0.0
            denom = np.maximum(np.abs(a.astype(np.float64)), np.abs(b.astype(np.float64)))
            with np.errstate(divide="ignore", invalid="ignore"):
                rel = np.where(denom > 0, diff / denom, 0.0)
            rel_err = float(rel.max()) if rel.size else 0.0
            per_field[f"step:{n}:{k}"] = {
                "max_abs_err": abs_err,
                "max_rel_err": rel_err,
            }
            scale = float(np.abs(b).max()) if b.size else 0.0
            if abs_err > atol + rtol * scale:
                within = False

    return EquivalenceVerdict(
        within_tolerance=within,
        per_field_diff=per_field,
        tolerance_table_used={**resolved, "path": str(table_path)},
    )

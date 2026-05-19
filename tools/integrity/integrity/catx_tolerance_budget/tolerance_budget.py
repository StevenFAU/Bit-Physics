"""Cat-X.tolerance-budget — every per-sim override is within budget.

Spec § 2.6 + plan § 7.5 deliverable 7. HARD_FAIL on any
``[overrides.<sim>]`` entry in ``tolerance.toml`` whose `relative` or
`absolute` exceeds the corresponding cap in ``tolerance-budget.toml``.

Operator amendments live under
``docs/_audits/tolerance-budget-amendments/*.md`` and bump the cap
upward in this run; the amendment audit files use the canonical
front-matter (verdict CONFIRMED + an operator-signed entry in
``evidence_paths``). Phase 0 ships no amendments; the directory may
not exist yet.
"""

from __future__ import annotations

import tomllib
from pathlib import Path
from typing import Any

import yaml

from ..common.types import FailureMode, Finding

CHECK_ID = "catx.tolerance-budget"

_TOLERANCE = Path("tools/testkit/equivalence/tolerance.toml")
_BUDGET = Path("tools/testkit/equivalence/tolerance-budget.toml")
_AMENDMENTS_DIR = Path("docs/_audits/tolerance-budget-amendments")

_FRONT_MATTER_PREFIX = "---\n"


def _load_toml(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    with path.open("rb") as fh:
        return tomllib.load(fh)


def _amendment_caps(repo_root: Path) -> dict[tuple[str, str], dict[str, float]]:
    """Return the most-recent operator-approved amendments per (category, dimension).

    Each amendment file front-matter declares:
        verdict: CONFIRMED
        amendments:
          - { category: "<cat>", dimension: "cross_stack", relative: <float>,
              absolute: <float> }
    """
    out: dict[tuple[str, str], dict[str, float]] = {}
    base = repo_root / _AMENDMENTS_DIR
    if not base.exists():
        return out
    for md in sorted(base.glob("*.md")):
        try:
            text = md.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if not text.startswith(_FRONT_MATTER_PREFIX):
            continue
        try:
            _, body = text.split("---\n", 2)[:2]
            fm = yaml.safe_load(body)
        except (ValueError, yaml.YAMLError):
            continue
        if not isinstance(fm, dict) or fm.get("verdict") != "CONFIRMED":
            continue
        amendments = fm.get("amendments") or []
        if not isinstance(amendments, list):
            continue
        for entry in amendments:
            if not isinstance(entry, dict):
                continue
            category = entry.get("category")
            dimension = entry.get("dimension")
            if not isinstance(category, str) or not isinstance(dimension, str):
                continue
            cap = out.setdefault((category, dimension), {})
            rel = entry.get("relative")
            abs_ = entry.get("absolute")
            if isinstance(rel, int | float):
                cap["relative"] = float(rel)
            if isinstance(abs_, int | float):
                cap["absolute"] = float(abs_)
    return out


def run_catx_tolerance_budget(repo_root: Path, files: list[Path] | None = None) -> list[Finding]:
    # ``files`` is irrelevant — the check operates on two fixed files.
    del files
    tolerance = _load_toml(repo_root / _TOLERANCE)
    budget = _load_toml(repo_root / _BUDGET)
    findings: list[Finding] = []
    if tolerance is None:
        findings.append(
            Finding(
                check=CHECK_ID,
                severity=FailureMode.HARD_FAIL,
                path=_TOLERANCE,
                line=None,
                message="tolerance.toml is missing",
            )
        )
        return findings
    if budget is None:
        findings.append(
            Finding(
                check=CHECK_ID,
                severity=FailureMode.HARD_FAIL,
                path=_BUDGET,
                line=None,
                message="tolerance-budget.toml is missing",
            )
        )
        return findings

    overrides = tolerance.get("overrides", {}) or {}
    budgets = budget.get("budgets", {}) or {}
    amendments = _amendment_caps(repo_root)

    for sim, entry in overrides.items():
        if not isinstance(entry, dict):
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.HARD_FAIL,
                    path=_TOLERANCE,
                    line=None,
                    message=f"overrides.{sim} is not a table",
                )
            )
            continue
        category = entry.get("category")
        if not isinstance(category, str):
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.HARD_FAIL,
                    path=_TOLERANCE,
                    line=None,
                    message=(f"overrides.{sim}.category is missing or not a string"),
                )
            )
            continue
        cap_entry = budgets.get(category, {}).get("cross_stack")
        if not isinstance(cap_entry, dict):
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.HARD_FAIL,
                    path=_BUDGET,
                    line=None,
                    message=(f"no budget for category={category!r}; sim={sim!r} cannot validate"),
                )
            )
            continue
        eff_cap = {
            "relative": float(cap_entry.get("relative", float("inf"))),
            "absolute": float(cap_entry.get("absolute", float("inf"))),
        }
        amended = amendments.get((category, "cross_stack"))
        if amended is not None:
            for k, v in amended.items():
                eff_cap[k] = max(eff_cap[k], v)
        for dim in ("relative", "absolute"):
            override_v = entry.get(dim)
            if override_v is None:
                continue
            if not isinstance(override_v, int | float):
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=_TOLERANCE,
                        line=None,
                        message=(f"overrides.{sim}.{dim} = {override_v!r} is not a number"),
                    )
                )
                continue
            if float(override_v) > eff_cap[dim]:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=_TOLERANCE,
                        line=None,
                        message=(
                            f"overrides.{sim}.{dim} = {override_v} > budget cap "
                            f"{eff_cap[dim]} for category={category!r}"
                            + (" (with amendment applied)" if amended else "")
                        ),
                    )
                )
    return findings

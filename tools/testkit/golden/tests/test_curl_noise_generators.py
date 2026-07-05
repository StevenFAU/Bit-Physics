"""Producer-coverage tests for the six curl-noise golden generators
(B-2a pattern: exercise the GENERATOR's recompute-and-compare path, not
just the frozen table)."""

from __future__ import annotations

import copy
import json

import pytest

from golden.generator import (
    curl_noise_analytic_fields,
    curl_noise_boundary,
    curl_noise_crossprod,
    curl_noise_divergence,
    curl_noise_gradient_mms,
    curl_noise_helicity,
)
from golden.generator.curl_noise_common import verify_table

_GENERATORS = {
    "divergence": (
        curl_noise_divergence,
        curl_noise_divergence.TABLE_PATH,
    ),
    "gradient_mms": (
        curl_noise_gradient_mms,
        curl_noise_gradient_mms.TABLE_PATH,
    ),
    "crossprod": (curl_noise_crossprod, curl_noise_crossprod.TABLE_PATH),
    "boundary": (curl_noise_boundary, curl_noise_boundary.TABLE_PATH),
    "analytic_fields": (
        curl_noise_analytic_fields,
        curl_noise_analytic_fields.TABLE_PATH,
    ),
    "helicity": (curl_noise_helicity, curl_noise_helicity.TABLE_PATH),
}


def _fresh(mod):
    """Each thin CLI builds its --verify payload from build_table()'s
    compute; reuse build_table to get the exact fresh dict shape."""
    table = mod.build_table()
    fresh: dict = {}
    for tp in table["test_points"]:
        fresh.update(tp["expected"])
    return fresh


@pytest.mark.parametrize("name", sorted(_GENERATORS))
def test_generator_reproduces_committed_table(name):
    mod, path = _GENERATORS[name]
    assert path.exists(), f"missing committed table {path}"
    assert verify_table(path, _fresh(mod)) == 0


@pytest.mark.parametrize("name", sorted(_GENERATORS))
def test_generator_detects_mutation(name, tmp_path):
    mod, path = _GENERATORS[name]
    with path.open() as fh:
        table = json.load(fh)
    mutated = copy.deepcopy(table)

    def bump(obj) -> bool:
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, float) and v != 0.0:
                    obj[k] = v * 1.5 + 1.0
                    return True
                if isinstance(v, (dict, list)) and bump(v):
                    return True
        if isinstance(obj, list):
            for i, item in enumerate(obj):
                if isinstance(item, float) and item != 0.0:
                    obj[i] = item * 1.5 + 1.0
                    return True
                if isinstance(item, (dict, list)) and bump(item):
                    return True
        return False

    # mutate only COMPARED values (the expected blocks), never inputs
    assert any(bump(tp["expected"]) for tp in mutated["test_points"]), "no numeric leaf to mutate"
    bad = tmp_path / path.name
    with bad.open("w") as fh:
        json.dump(mutated, fh)
    assert verify_table(bad, _fresh(mod)) == 1


def test_missing_table_fails(tmp_path):
    mod, _ = _GENERATORS["helicity"]
    assert verify_table(tmp_path / "nope.json", _fresh(mod)) == 1

# Golden-value verification

Per spec § 2.4. The golden-value layer is the portfolio's
numerical-truth anchor: every algorithm with a closed-form analytic
result ships a JSON table of `(inputs, expected)` points, a symbolic
generator that regenerates the table, a canonical Python reference
implementation, and a verifier that runs any candidate evaluator against
the table.

Phase 0 Block 4 ships the first golden algorithm: the **Monaghan
cubic-spline SPH kernel (3D)**. Phase 1+ extends with additional kernel
families and any other closed-form algorithms a sim depends on.

## Layout

```
tools/testkit/golden/
├── __init__.py                      # re-exports verifier + result + protocol
├── verifier.py                      # verify_against_table(table_path, evaluator)
├── derivations/
│   └── cubic-spline-kernel.md       # math derivation + anchors + INFERENCE notes
├── tables/
│   └── cubic-spline-kernel.json     # values, schema-validated against golden-v1
├── generator/
│   └── cubic_spline.py              # SymPy regenerator, idempotent, cross-checks anchors
├── reference_implementations/
│   └── cubic_spline.py              # NumPy evaluate(inputs) -> dict — sole Python impl
└── tests/
    ├── test_generator.py            # byte-for-byte idempotency + anchor count
    ├── test_reference_implementation.py  # peak / boundary / support / scaling
    └── test_verifier.py             # API contract + pass/fail behavior
```

## Public surface

Phase 0 plan § 3.3.4 fixes the API. Block 5 INTEGRITY's Cat 3 check
consumes it verbatim:

```python
from pathlib import Path
from typing import Protocol
from dataclasses import dataclass

class KernelEvaluator(Protocol):
    def __call__(self, inputs: dict) -> dict: ...

@dataclass
class GoldenVerifierResult:
    table_path: Path
    algorithm: str
    points_tested: int
    points_passed: int
    failures: list[dict]
    ok: bool

def verify_against_table(table_path: Path,
                         evaluator: KernelEvaluator) -> GoldenVerifierResult: ...
```

## Authoring a new golden algorithm

1. **Derivation doc** at `derivations/<algo>.md`. Define the algorithm
   from first principles; cite the upstream paper(s); identify ≥ 3
   anchor points whose expected values can be derived by hand
   *independent* of both your symbolic tool and any vendored
   implementation. The anchors are spec § 2.4's anti-fragility against
   symmetric upstream bugs.
2. **Generator** at `generator/<algo>.py`. Use SymPy or similar to
   compute every table entry from the analytic definition. Cross-check
   committed anchor values against the symbolic values at generation
   time; HALT if they disagree.
3. **Table** at `tables/<algo>.json`. Schema:
   `tools/testkit/schemas/golden-v1.json`. Required fields:
   `schema_version`, `algorithm`, `category`, `derivation`,
   `test_points`, `tolerance`. ≥ 3 `independent_reference` anchors.
4. **Reference implementation** at
   `reference_implementations/<algo>.py`. Signature
   `evaluate(inputs: dict) -> dict`. **One** Python implementation per
   algorithm in the repo, full stop. Block 5 INTEGRITY imports from
   here; if a sim re-implements, that's Cat 6 (test-design fabrication).
5. **Tests** at `tests/`. Idempotency (generator byte-for-byte equals
   committed), reference passes, deliberately-wrong implementation
   fails, API-contract test using a fake table.
6. **Vendor upstream if any** at `references/<UpstreamName>/` with a
   MANIFEST.toml validated by
   `bit_physics_testkit.capture.load_reference_manifest`.

## Verifying

```bash
just test                                 # full testkit suite
cd tools/testkit && python -m golden.generator.<algo>  # regenerate
```

Idempotency: `python -m golden.generator.<algo>` produces no `git diff`.
If it does, either the symbolic definition drifted or the table was
hand-edited; both are bugs.

## Schema-validation invariants

`golden-v1.json` enforces (spec § 2.4):

- `schema_version` matches `^\d+\.\d+\.\d+$`.
- `derivation` carries `doc`, `upstream`, `upstream_sha`, `upstream_path`.
- `test_points[].expected` is an object (keys vary by algorithm).
- Optional `test_points[].independent_reference` carries `source`,
  `derived_by`, optional `doi`, and `expected` map.
- `tolerance` has non-negative `absolute` and `relative` numbers.

The schema does not enforce "≥ 3 anchors"; that's a per-table test
(`test_generator.py::test_table_has_at_least_three_independent_anchors`)
and a Block 5 INTEGRITY Cat 3 check.

## Cubic-spline-kernel-3d-monaghan (Phase 0 Block 4)

- **Convention:** Monaghan 1992/2005 classical form, $q \in [0, 2]$,
  $\sigma_3 = 1/\pi$, compact support at $q = 2$, piecewise switch at
  $q = 1$. See `tools/testkit/golden/derivations/cubic-spline-kernel.md`
  § 4 for the relationship to the SPlisHSPlasH support-radius
  parameterization.
- **Test grid:** $q \in \{0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2\}$
  at $h = 1$.
- **Anchors:** $q = 0$ (peak), $q = 1$ (piecewise boundary), $q = 2$
  (compact support) — all hand-derived from Monaghan 1992/2005.
- **Tolerance:** `absolute = 1e-12`, `relative = 1e-12`.
- **Upstream test target:**
  `references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.h` at SHA
  `6bff55a6eaf14083d34650f22a268ce156b62b54` (release `2.16.1`).
  The vendored source is **not** consulted during derivation; it
  exists to be tested against the table at runtime in a future SPH
  simulation.

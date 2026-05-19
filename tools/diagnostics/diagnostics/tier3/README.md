# Tier 3 — Per-sim shims (Phase 1+)

Per spec § 3.3. Each sim has its own Tier 3 module that composes Tier 1
+ Tier 2 primitives for sim-specific diagnostic needs.

Convention: `tools/diagnostics/diagnostics/tier3/<sim-name>/__init__.py`
exports a callable like:

```python
from diagnostics.tier1 import check_health, check_performance
from diagnostics.tier2.scalar_field import check_bounds, check_conservation

def run(capture):
    return [
        check_health(capture),
        check_performance(capture),
        check_bounds(capture, field="U", lo=0.0, hi=1.0),
        check_conservation(capture, field="U"),
    ]
```

Phase 0 ships no Tier 3 modules; the first one lands with Block 8
RD-2D.

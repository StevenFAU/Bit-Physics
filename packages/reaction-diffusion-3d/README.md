# reaction-diffusion-3d (package)

Phase 1 Stage 2 — TDD bootstrap. Implementation deferred to Phase 2+.

See [`docs/sim-specs/continuous-ca/reaction-diffusion-3d/`](../../docs/sim-specs/continuous-ca/reaction-diffusion-3d/).

```bash
(cd packages/reaction-diffusion-3d && PYTHONPATH=. python3 -m pytest tests/ -v)
```

Per charter shift #15 (partial checkpoint at 71b952f), Stack C sims
use Python pytest at TDD bootstrap level; the per-sim implementation
phase will add C++ build / ctest infrastructure when actual C++ code
lands.

# mandelbulb-explorer — Determinism declaration

> Per spec § 2.5. Per charter § 2.6 the tolerance row is read from
> `tools/testkit/equivalence/tolerance.toml`; no override is committed
> for this sim.

## Declaration

**`bit-exact-same-hw`** for the Stack B WebGPU implementation when run
on a fixed hardware/driver pair.

### Sources of nondeterminism

| Source | Present in this sim? | Mitigation |
|---|---|---|
| Atomic scatter-add | No | n/a — DE is per-pixel; no shared writes. |
| Subgroup-collective ops | No | per-pixel evaluation does not require collectives. |
| Floating-point reduction-tree shape | No | DE is a scalar accumulation per pixel only. |
| Driver / vendor FMA fusion | Yes (intrinsic to WGSL) | Pinned hardware/driver; cross-vendor reproducibility is epsilon (closed-form tolerance row). |

### Test coverage (Phase 2+ implementation contract)

- `tests/test_determinism.py::test_run_twice_bit_exact` — call
  `tools/testkit/determinism.run_twice_and_diff` on the canonical
  fixed-camera fixed-ray-set sample.

Stage 2 ships only the test stub that fails with module-not-found.

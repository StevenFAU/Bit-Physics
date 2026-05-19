# Gray-Scott RD-2D — determinism

## Declaration

`bit-exact-same-hw`. Two captures produced by the same code at the
same `seed` are byte-identical on the same hardware.

## Sources of nondeterminism — addressed

| Source | Mitigation |
|---|---|
| Random initial condition | `numpy.random.default_rng(seed)` reseeds every call; the IC builder receives `seed` explicitly and never touches global RNG state. |
| Floating-point reduction order | The NumPy reference uses elementwise ops only; no reductions in the time loop. |
| GPU atomic operations | Manifest declares `atomic_ops: false`; the WebGPU implementation uses a double-buffered read/write pattern with no atomic counters. |
| Subgroup operations | Manifest declares `subgroup_ops: false`. |
| Thread-scheduling non-determinism | The compute shader's per-cell write depends only on the previous frame's read buffer; no inter-thread communication mid-pass. |

## Verification

The determinism harness at
`tools/testkit/determinism/harness.py:run_twice_and_diff` runs the sim
twice at the same seed and diffs the resulting captures. The RD-2D
test suite at `packages/reaction-diffusion-2d/tests/test_determinism.py`
invokes this harness via the Python sim runner (the NumPy reference,
which is the deterministic oracle); the WebGPU implementation's bit-
exact guarantee is exercised locally with a real GPU adapter (deferred
from CI per spec § 7.8).

## Cross-stack determinism (Phase 1+)

When Phase 2 ports RD-2D to Stack C and Stack D, each stack's
determinism harness verdict gets re-checked. Cross-stack equivalence
falls under the `tolerance.toml` budget at the `reaction-diffusion`
category default `relative = 1e-4`.

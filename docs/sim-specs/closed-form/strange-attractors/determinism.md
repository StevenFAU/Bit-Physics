# strange-attractors — Determinism declaration

> Per spec § 2.5. Per charter § 2.6 the tolerance row is read from
> `tools/testkit/equivalence/tolerance.toml`; no override is committed
> for this sim.

## Declaration

**`bit-exact-same-hw`** for the Stack B WebGPU implementation when run
on a fixed hardware/driver pair and a single subgroup-op-free shader.

### Sources of nondeterminism

| Source | Present in this sim? | Mitigation |
|---|---|---|
| Atomic scatter-add (P2G-style) | No | n/a — RK4 is per-trajectory, no atomic reductions. |
| Subgroup-collective ops | No | RK4 is purely per-thread arithmetic at each step. |
| Floating-point reduction-tree shape | No (no reductions) | n/a. |
| Driver / vendor FMA fusion | Yes (intrinsic to WGSL) | Pinned hardware/driver; cross-vendor reproducibility falls back to epsilon (`relative=1e-5` per closed-form tolerance row). |
| Random sampling / Hypothesis | Only inside PBT runs | PBT seeds are explicit; non-PBT canonical runs do not invoke randomness. |

### Cross-stack reproducibility

Stack A (Shadertoy port) and Stack B (WebGPU compute) target
bit-exactness on identical hardware; cross-vendor and cross-stack are
bounded by the `closed_form` defaults at
`tools/testkit/equivalence/tolerance.toml`.

### Test coverage (Phase 2+ implementation contract)

- `tests/test_determinism.py::test_run_twice_bit_exact` — call
  `tools/testkit/determinism.run_twice_and_diff` on the canonical
  seeded run; require diff to be byte-equal.
- `tests/test_determinism.py::test_cross_seed_distinct` — sanity probe
  that different seeds yield distinct captures.

Stage 2 ships only the test stubs that fail with module-not-found.

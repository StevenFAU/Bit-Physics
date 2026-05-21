# numba — project-wide JIT-acceleration convention

> **Document type:** Project convention (per spec § 9.1 — Stack D /
> language-level conventions; spec § 2.5 — determinism harness).
> **Landed at:** sub-phase-numba-integration (post-`particle-fluids-sph-water`
> Stage 1 R18 STOP-AND-SURFACE).
> **Dep declaration:** `tools/testkit/pyproject.toml` (universal
> workspace dep at HEAD — every sim + integrity + diagnostics
> transitively gets numba).
> **Verification surface:** `tools/testkit/numba/tests/test_numba_determinism.py`.

## 1. When to use numba in this project

numba JIT-compiles a Python function to native machine code via LLVM.
Use it when a function meets **all** of:

1. **Hot inner loop in a reference-implementation sim at canonical
   scale.** Examples: per-particle force accumulation at N = 1M
   (sub-phase-particle-fluids-sph-water R18 motivation);
   per-grid-cell flux update at N = 256³ (future eulerian-smoke);
   per-particle-grid-cell mapping at N = 1M (future
   mpm-multimaterial).
2. **Pure-NumPy vectorization is interpretation-bound, not
   memory-bound.** Symptom: per-step wall-clock dominated by
   Python-interpreter overhead × N iterations OR by intermediate-
   array allocation cost (each `r_ij = positions[pair_i] -
   positions[pair_j]` materialization is ~1 GB at 50M pairs).
3. **The function's inputs and outputs are typed numpy arrays + Python
   scalars only** (no lists, no dicts, no Python objects in the hot
   path).
4. **The function is part of a sim's reference implementation, NOT
   a test or audit utility.** Tests and audits don't need numba's
   performance; their N is small.

(FACT — R18 surface analysis at
`docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-continuation-stop-and-surface-3-2026-05-21T03-50-14Z.txt`.)

**Do NOT use numba** for:

- Functions that are already vectorized + memory-bound (numba won't
  help; the cost is in the FP math + memory bandwidth, not in
  interpretation).
- Test functions (small N; the JIT compilation overhead exceeds the
  speedup).
- Audit / introspection utilities (clarity matters more than speed).
- Any function whose output bit-pattern must match Phase-0-pinned
  reference values (use the pure-NumPy reference and accept its
  wall-clock; numba's cross-version bit-equality is not formally
  guaranteed — see § 5 below).

## 2. Required decorator form

```python
from numba import njit

@njit(fastmath=False, cache=True)
def my_hot_loop(positions: np.ndarray, masses: np.ndarray, h: float) -> np.ndarray:
    """Hot inner loop — example."""
    ...
```

Both kwargs MUST be specified explicitly (no relying on numba's
defaults). Audit clarity matters: a reader scanning the source
should immediately see what determinism contract this function
operates under.

### 2.1 `fastmath=False`

**Required.** `fastmath=True` enables LLVM's fast-math flags
(`-ffast-math`, `contract`, `reassoc`, etc.), which re-associate
floating-point operations and allow contractions like FMA. Both
break bit-exactness against the pure-NumPy reference + against
prior runs of the same numba binary.

(FACT — numba docs, *Performance Tips* + `fastmath` flag
documentation; spec § 2.5 — bit-exact-same-hw determinism
declaration requires FP-non-associative discipline.)

### 2.2 `cache=True`

**Required.** numba caches compiled artifacts at `__pycache__/`
adjacent to the source file. With `cache=True`:

- First call: compile (5-30 s overhead depending on function
  complexity).
- Subsequent calls (same process or new processes): load from
  cache, near-zero overhead.
- Source change: cache invalidated automatically.
- Numba version change: cache invalidated automatically.

The cache write is a side-effect (writes to `__pycache__/`); it is
**not a determinism risk** — cache invalidation is automatic, and
the regression test at § 6 verifies the cached + uncached paths
produce identical output.

## 3. Banned decorator options

The following options are banned in this project:

| Option | Why banned |
|---|---|
| `fastmath=True` | Breaks bit-exactness against pure-NumPy reference (see § 2.1). |
| `parallel=True` | numba's `prange` has nondeterministic reduction semantics by default. If you NEED parallel acceleration, use single-threaded `@njit` first and benchmark; only adopt `parallel=True` with **explicit reduction ordering** via per-thread accumulator arrays + a final deterministic gather, AND with a regression-test update that verifies the bit-equivalent output. No exceptions. |
| `error_model="numpy"` | At HEAD this doesn't affect determinism on the tested code paths, but the explicit ban keeps the surface tight. If a future need surfaces, document the rationale + add a regression-test row. |
| `nopython=False` | Implicit; `@njit` already implies `nopython=True`. If you find yourself reaching for `@jit` with `nopython=False`, you're using numba wrong — the function isn't numba-amenable and should stay pure NumPy. |
| `boundscheck=False` | Default. `boundscheck=True` is allowed for debugging but should not land in committed code. |

## 4. AOT (ahead-of-time) vs JIT

This project uses JIT only. AOT (compiling numba functions to a
standalone shared library via `numba.pycc`) is **not used** at this
sub-phase. JIT's auto-cache (§ 2.2) gives near-zero per-process
overhead after first call; AOT would add a build-step + distribution
question that is not justified at sim-side scope.

If a future sub-phase finds JIT compilation overhead is the
bottleneck (e.g., a sim runs many short-lived processes that each
pay the cold-start cost), revisit AOT as a focused infrastructure
sub-phase like this one.

## 5. Cross-version bit-equality is not formally guaranteed

(FACT — numba upstream does not publish a bit-equality guarantee
across versions; LLVM upgrades, codegen-strategy changes, and
intrinsic-selection updates can all change the lowered code for a
mathematically-equivalent function. The project's pin and
regression-test mechanism (§ 6) are the verification surface.)

The project's discipline:

1. Pin numba to a known-good range in `tools/testkit/pyproject.toml`
   (`numba>=0.61,<0.66` at HEAD). The upper bound prevents
   accidental adoption of a future major version.
2. The regression test at § 6 runs on every CI invocation that
   touches numba-decorated code. If a future numba upgrade produces
   bit-drift, the test fails before the upgrade lands.
3. When raising the upper bound of the pin (e.g., to numba 0.66),
   that's a separate operator-approved commit + audit entry +
   regression-test re-verify. Not an automatic pin-roll.

## 6. Determinism regression test

The contract is verified by:

```
tools/testkit/numba/tests/test_numba_determinism.py
```

The test runs a known-deterministic numerical computation (multi-
particle pair-force accumulation, mirroring the kind of arithmetic
SPH and other sims use) under both pure NumPy and numba JIT, and
asserts:

1. **Bit-identical output between pure NumPy and numba JIT** at
   N ∈ {64, 256, 1024}.
2. **Run-to-run determinism** — two consecutive numba JIT runs with
   the same input produce bit-identical output.
3. **Cold-vs-warm cache identity** — clearing `__pycache__` between
   runs does not change the numba JIT output.

Invocation (Stack-D):

```
uv run --no-sync pytest tools/testkit/numba/tests/test_numba_determinism.py -v
```

The test is the verification surface for this entire convention. If
it fails, do NOT relax the test — investigate the determinism issue.

## 7. Example: applying the convention to a hot inner loop

INFERENCE — illustrative; not a committed function at HEAD.

```python
import numpy as np
from numba import njit

@njit(fastmath=False, cache=True)
def accumulate_pair_contributions(
    pair_i: np.ndarray,        # int64[:], sorted-by-i
    pair_j: np.ndarray,        # int64[:], sorted-by-j-within-each-i-segment
    contrib: np.ndarray,       # float64[:]
    n: int,
) -> np.ndarray:
    """Segment-sum pair contributions per i.

    Iterates pairs in input order (sorted-by-(i, j)); accumulates each
    particle's segment of contrib values into a per-particle output
    array. Sequential left-to-right summation per segment — matches
    Python `accum += val` semantics under FP non-associativity.

    Determinism: `fastmath=False` (banned re-association of float
    ops); `cache=True` (cached compiled artifact); no parallel
    reduction; sequential C-order per-segment sum.
    """
    out = np.zeros(n, dtype=np.float64)
    m = pair_i.shape[0]
    for k in range(m):
        out[pair_i[k]] += contrib[k]
    return out
```

The pure-NumPy reference for the above is `np.add.reduceat` over
sorted `pair_i` boundaries (see
`packages/sph-water/sph_water/reference/dfsph.py:density_evolution_vectorized`
for the established pattern). The numba variant should produce
**bit-identical output** to the NumPy reference; the regression
test at § 6 is the gate.

## 8. Update procedure

When a sub-phase adopts numba for a sim:

1. Add the `@njit(fastmath=False, cache=True)` decorator(s) to the
   function(s) at issue. Document in the function's docstring why
   numba is used (interpretation-bound at canonical scale; cite
   the R-class surface evidence that motivated the change).
2. Add a sim-specific equivalence test that asserts the numba
   variant's output is bit-identical to the pure-NumPy reference at
   small-N where both are tractable.
3. Update the sim's `determinism.md` to reflect that numba JIT is
   in the canonical-tier path (the project-wide determinism
   declaration: `bit-exact-same-stack-same-hw` is preserved by the
   convention above).
4. Update the sim's sub-phase audit § "Determinism declaration"
   section to note the numba surface.

The project-wide convention here is the determinism floor; sim-side
amendments are additive on top.

---

*End of project-wide numba convention. Inherits the determinism contract
from spec § 2.5; declared once here so per-sim adoption stays additive
(decorator + sim-specific equivalence test + sim's determinism.md update).*

# warp — Stack E DSL convention + `common-warp` public API

> **Document type:** Project convention (per spec § 9.1 — Stack E /
> language-level conventions; spec § 4.5 — Stack E verification posture;
> spec § 2.5 — determinism harness).
> **Landed at:** sub-phase-common-warp-bootstrap Stage 1c (the first
> Stack-E deliverable; the §1.9.1 seven-subsystem public API bootstrap).
> **Dep declaration:** `common/common-warp/pyproject.toml`
> `[project].dependencies` — `warp-lang>=1.13,<2.0` (D3: Warp is
> Stack-E-only; Stack-B/C/D developers omit common-warp from their
> workspace install).
> **Verification surface:** `common/common-warp/tests/` (27 tests:
> Runtime/Determinism/Capture/Particles/Grids/HashGrid + the
> `examples/hello/` smoke sim).
> **Sister conventions:** `docs/common/taichi.md` (Stack-D DSL; structural
> template for this doc), `docs/common/numba.md` (project-wide JIT).

## 1. Overview

NVIDIA Warp is the **primary Stack-E DSL** per spec § 4.5: a Python
framework that JIT-compiles `@wp.kernel`-decorated functions to native CPU
or CUDA code. It is the project's GPU-accelerated stack for the
particle/grid/hybrid sim families (MPM, smoke, LBM ports).

`common/common-warp/` is the minimal Phase-2 bootstrap module
(`bit-physics-common-warp`, import package `common_warp`) — the seven
subsystems specified at the phase-2 plan §1.9.1, exposed at the top-level
import. It is **shipped, then wired** (O-W4): at landing it is consumed only
by its own tests + `examples/hello/`; the forthcoming Stack-E sim ports
import and use it (§ 6).

Use Warp for a sim when it meets all of:

1. **Best-fit DSL.** Per spec § 4.5: particle systems (MPM), volumetric
   grids (smoke), lattice methods (LBM) — the kernel-parallel,
   data-structure-rich algorithms where Warp's `wp.array` / `wp.HashGrid` /
   warp-native kernels matter.
2. **The sim ships a Stack-E port** (per spec § 5 stack scoping; per the
   per-sim sub-phase plan).
3. **A cross-stack equivalence partner exists** (typically the Stack-B
   Python reference or a Stack-D Taichi port).

**Do NOT use Warp** for closed-form / agent-based / continuous-CA sims that
ship reference-only, or for test/audit utilities (use pure Python).

**Out of scope for the bootstrap** (phase-2 plan § 2.3 "Explicitly NOT in
scope"): autodiff beyond a minimal `wp.Tape` exercise, NanoVDB beyond
`wp.Volume`, USD, Newton, 3DGS, mesh primitives. A port needing one of
these surfaces a §1.9.1 amendment per Rule W1 (§1.8.2), not a unilateral
extension.

## 2. Installation + version pin

```
warp-lang>=1.13,<2.0
```

(FACT — `common/common-warp/pyproject.toml`; re-verified upstream-latest at
each edit per Convention #8.) Warp **1.13.0** (released 2026-05-04) is the
pinned floor; the upper bound excludes a future 2.x major per § H.4. The
wheel bundles the native runtime (`warp.so`) and the CUDA NVRTC toolchain;
the only Python runtime dependency is `numpy`. Wheel
`Requires-Python: >=3.10`; the repo's `>=3.12` is compatible.

`wp.init()` is idempotent (a double call is a no-op). On a host without a
CUDA driver, Warp initializes the CPU backend and reports CPU as the only
device (NVRTC compilation remains available) — the bootstrap's default and
determinism backend.

**Filterwarnings (D13).** Warp 1.13.0 emits **no** Python `Warning` that
reaches pytest's strict gate, so `common-warp/pyproject.toml` uses
`filterwarnings = ["error"]` only — no Warp-specific ignore line (unlike
common-py's Taichi locale filter). One benign `ResourceWarning` (Warp's
precompiled-header `TemporaryDirectory` cleanup) fires at interpreter
shutdown, after the pytest session ends; it does not fail runs (O-W5).

## 3. Public API surface (§1.9.1)

The module's surface is exactly the seven subsystems, re-exported at the
`common_warp` top level (phase-2 plan §1.9.1 import contract). The Stack-E
ports code against these signatures verbatim — they are a **socket**, not
stage-overrideable (§1.9.1 / plan line 1411).

| Subsystem | Surface | Module |
|---|---|---|
| **1 Runtime** | `init(device=None, deterministic=False) -> str` | `runtime.py` |
| **2 Capture I/O** | `Capture`, `write_capture`, `read_capture` | `capture/` |
| **3 Determinism** | `set_seed`, `get_seed`, `assert_deterministic_run`, `deterministic_context`, `set_warp_deterministic` | `warp_harness/` |
| **4 Particles** | `Particles`, `allocate_particles` | `particles/` |
| **5 Grids** | `ScalarField3D`, `VectorField3D`, `allocate_scalar_field`, `allocate_vector_field` | `grids/` |
| **6 HashGrid** | `HashGrid` (native `wp.HashGrid` + kernel `query_radius`) | `hashgrid/` |
| **7 Smoke sim** | `examples/hello/` — the canonical consumer (§ 5) | `examples/hello/` |

Notes:

- **Runtime** — `device=None` resolves to `"cpu"` (D4 / R-W3: the bootstrap
  overrides §1.9.1's nominal GPU default to the bit-exact CPU backend).
  Callers wanting GPU pass an explicit CUDA device string. `deterministic`
  records the requested D4 posture (§ 4). The return value is the resolved
  device name — a documented superset of §1.9.1's `-> None`.
- **Determinism** — `assert_deterministic_run(sim_fn, *, runs=2,
  tolerance=0.0)` matches §1.9.1 verbatim (the Stage-1c socket
  reconciliation; § 4). `deterministic_context()` is no-arg, using the
  current `init()` / `set_seed()` state. Warp has **no global RNG seed**:
  randomness is per-thread via `wp.rand_init(seed, offset)` →
  `wp.randf(state)`; `set_seed` owns the canonical project seed that kernels
  thread in.
- **Capture** — delegates the HDF5 + manifest emission to the Phase-0
  testkit `capture` module, so output is byte-for-byte the canonical
  capture-v1 layout that `equivalence.harness.compare_captures` reads (the
  W-5 guarantee). Warp arrays do not serialize to HDF5 directly; callers
  marshal through NumPy (`wp.array.numpy()` / `wp.from_numpy`). This is the
  project HDF5 capture, NOT `wp.capture_*` CUDA-graph capture (O-W1).
- **Grids** — `from_capture_payload` / `allocate_scalar_field` pass an
  explicit `dtype=wp.float32` to `wp.from_numpy`; a multi-dimensional scalar
  array mis-infers its shape otherwise (O-W7).
- **HashGrid** — `query_radius` runs a kernel using the kernel-only builtins
  `wp.hash_grid_query` / `wp.hash_grid_query_next`.

## 4. Determinism contract (D4)

(FACT — empirically verified at Stage-0 Task 0.2; reproduced through the
`warp_harness` mechanism at Stage 1a and the `examples/hello/` smoke sim at
Stage 1c.)

| Backend | Posture | Mechanism |
|---|---|---|
| **CPU** | `bit-exact-same-hw` | `wp.launch` runs serially over the launch dimension (single thread), so floating-point reductions — including `wp.atomic_add` — are order-deterministic and bit-identical run-to-run. The Warp analog of Taichi `cpu_max_num_threads=1` / numba `parallel=False`. |
| **GPU** | `epsilon-bounded-cross-stack` | GPU atomic update order is non-deterministic; cross-stack equivalence is epsilon-bounded, not bit-exact (spec § 4.4 FMA-fusion family). GPU certification is per-sim-port scope. |

The CPU guarantee is **structural**, not flag-driven: Warp 1.13.0 exposes
no global deterministic toggle in `wp.config` and no global RNG seed. The
`init(..., deterministic=True)` flag therefore *records the requested
posture* (introspectable via `runtime.is_deterministic()`); the bit-exact
property is the serial launch itself. The discipline for a determinism
claim: device is the CPU backend, no in-kernel non-deterministic reductions
(prefer per-cell stencil *gather* over atomic scatter), seed threaded via
`set_seed` → `wp.rand_init`.

**W-2 baseline.** The ratified empirical CPU bit-determinism baseline is the
sha256 `24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314`
(6/6 bit-identical, Stage-0 Task 0.2; reproduced by
`tests/test_harness.py::test_assert_deterministic_run_matches_stage0_baseline`).
The W-2 gate fully completes via `run_twice_and_diff` /
`assert_deterministic_run` on the smoke sim (`tests/test_hello.py`).

**§1.9.1 signature contract.** The Determinism + Runtime signatures match
the phase-2 plan §1.9.1 verbatim — `init(device, deterministic)`,
no-arg `deterministic_context()`, `assert_deterministic_run(sim_fn, *,
runs=2, tolerance=0.0)` — reconciled at Stage 1c (the S1b-3 finding). The
`tolerance=0.0` path is bit-exact (CPU); `tolerance>0.0` admits the
epsilon-bounded GPU posture. The names were correct since Stage 1a; the
signatures were reconciled before any Stack-E port consumes them.

**Cross-version bit-equality is not guaranteed.** Warp publishes no
bit-equality guarantee across versions (LLVM upgrades, codegen changes). The
pin's upper bound + the determinism regression test guard against drift;
raising the pin is a separate operator-approved commit + audit + re-verify
(§ H.4, same discipline as taichi.md § 8).

## 5. Usage examples

The canonical consumer of the full surface is the **`examples/hello/`** smoke
simulator (`common/common-warp/examples/hello/sim.py`) — a 2D
advection-diffusion sim that exercises Runtime + Determinism + Capture +
Grids and writes a capture-v1 capture. A minimal consumer:

```python
import common_warp

common_warp.init("cpu", deterministic=True)   # D4 bit-exact backend
common_warp.set_seed(42)

field = common_warp.allocate_scalar_field((64, 64, 1))   # ScalarField3D
# ... populate field.data, launch @wp.kernel steps (gather, no atomics) ...

cap = common_warp.Capture(manifest=manifest, payload=payload)
common_warp.write_capture(cap, "out/hello-warp-adv-diff-64sq-seed42-step400")
```

Determinism is asserted two ways (both in `tests/test_hello.py`):

```python
# (a) warp_harness mechanism — hash the final field over repeated runs
common_warp.assert_deterministic_run(run_sim, runs=2, tolerance=0.0)

# (b) testkit harness — content-equivalent capture diff (§1.5.2 W-2 surface)
from determinism import run_twice_and_diff
run_twice_and_diff(hello_sim_runner, seed=42)
```

Per banked precedent #7, pure-literal numeric constants inside a
`@wp.kernel` are seeded with an explicit `wp.float32(...)` / `wp.float64(...)`
(Warp infers bare literals as f32). Per O-W6, a kernel-defining module may
use `from __future__ import annotations` (Warp 1.13.0 resolves PEP-563
annotations), but the convention is to omit it defensively.

## 6. Stack-E port consumption guide

(FACT — phase-2 plan §1.9.1 "Stages 5, 7, 8 import and use"; D9 routes MPM
Stack-E as the next sub-phase.) Three forthcoming Stack-E ports consume this
module:

| Port | common-warp surface consumed |
|---|---|
| **MPM Stack-E** (next; D9) | the most of the surface — `Particles`, `HashGrid`, `ScalarField3D` (particle-to-grid transfer) |
| **Smoke Stack-E** | `SHIFTED` (D15; § 6.2) — predicted `ScalarField3D` / `VectorField3D`; **landed socket-only** (Runtime + Capture + Determinism + own f64 `wp.array`s). The f32-pinned dense-grid convenience surface structurally fits a dense-grid sim yet is f64-blocked. |
| **LBM Stack-E** | a `wp.array(dtype=wp.float32, ndim=4)` directly for the 19-component D3Q19 distribution functions — documented as "LBM-specific, not in common-warp" (the single-component `ScalarField3D` does not fit); the rest of the surface (Runtime, Determinism, Capture) applies |

Port adoption procedure:

1. Confirm the sim's spec-ref declares Stack-E as a target stack (spec § 5).
2. Import from `common_warp` per §1.9.1; do **not** invent new patterns or
   extend the socket unilaterally — a missing surface is a founder-confirmed
   §1.9.1 amendment per Rule W1 (§1.8.2).
3. Pin the determinism backend to the CPU device for gate-10/11
   (determinism + property tests); GPU-backend testing is the port's own
   scope (spec § 7.8).
4. Add a sim-specific Warp-vs-reference equivalence test; declare
   `bit-exact-same-hw` for the CPU Stack-E path and
   `epsilon-bounded-cross-stack` for the cross-stack pair in the sim's
   `determinism.md` / `equivalence.md`.
5. The sim's capture must set `sim.{name, category}` to match its
   cross-stack partner so `compare_captures` produces a meaningful
   field-by-field verdict (not a `sim:category-mismatch` HARD_FAIL).

### 6.1 Post-MPM-Stack-E correction (D16) — socket-only consumption

(FACT — `sub-phase-mpm-multimaterial-stack-e` plan-drafting probe [S-ME1] +
Stages 1a/1b/1c; D16/D15.) The § 6 table above PREDICTED MPM Stack-E would
consume "the most of the surface" — `Particles` + `HashGrid` + `ScalarField3D`.
**What actually landed is socket-only.** MPM Stack-E consumes only the
stack-agnostic sockets — Runtime (device + launch), Capture (`write_capture`),
Determinism (`deterministic_context`) — and rolls its OWN
`wp.array(dtype=wp.float64)` sim-state arrays. Two reasons, both HEAD-verified:

- **f64 precision (D15).** The MLS-MPM/APIC reference is f64 throughout, but the
  common-warp `Particles` / `ScalarField3D` / `VectorField3D` convenience
  surfaces are **f32-pinned**. Consuming them would downcast the f64 state, so
  the port allocates its own f64 `wp.array`s (the LBM-precedent of stack-specific
  arrays; § 6 LBM row). Bit-exact gate-14 vs the Phase-1 f64 numba reference
  confirmed the f64 path (`equivalence.md` Stack-E section).
- **No `HashGrid`.** MLS-MPM uses a **fixed 27-cell (3×3×3) B-spline stencil**
  indexed directly from each particle's base node — there is no neighbor-search,
  so the spatial-hash surface is unused. (`HashGrid` remains relevant to
  search-based ports, e.g. SPH neighbor queries.)

**General principle for future Stack-E ports (the consumption decision):** a
sim whose reference requires **f64** consumes the sockets only (Runtime +
Capture + Determinism) and rolls its own `wp.array(dtype=wp.float64)` state; a
sim that is **f32-acceptable** may additionally consume the f32 convenience
surfaces (`Particles` / `ScalarField3D` / `VectorField3D` / `HashGrid`). MPM
Stack-E is the data-backed first instance of the socket-only (f64) pattern; the
Smoke / LBM Stack-E rows above are predictions pending their own plan-drafting
HEAD-verification (the same S-ME1 discipline applies — verify the actual
consumption, do not assume the convenience surfaces fit). This note is ADDITIVE;
the original § 6 prediction is preserved above as the pre-port baseline.

### 6.2 Post-Smoke-Stack-E confirmation (D15) — the f64-principle holds even when the surface structurally fits

(FACT — `sub-phase-eulerian-smoke-stack-e` Stages 1b/1c/1c-revisited/2; D15. The
SECOND f64 socket-only consumer.) Smoke Stack-E **confirms** the § 6.1 f64-principle
and sharpens it. Where MPM Stack-E was a *particle* sim (the f32 `ScalarField3D` /
`VectorField3D` surfaces did not structurally fit anyway — no dense field + no
neighbor-search `HashGrid`), Smoke Stack-E is a **dense collocated-grid** sim — the
`ScalarField3D` / `VectorField3D` convenience surfaces are its *natural structural
home*. It STILL consumes socket-only and rolls its own
`wp.array(dtype=wp.float64)` fields, because:

- **f64 precision is load-bearing (D15/D8).** The Stam-Fedkiw reference is f64; the
  convenience surfaces are f32-pinned, and an f32 downcast would change the
  (positive-Lyapunov) trajectory itself. So even though the surface FITS structurally,
  f64 BLOCKS it. Smoke Stack-E is thus the cleaner demonstration of the f64-principle:
  the consumption decision is governed by **precision**, not by structural fit.
- **gate-14 confirmed the f64 path** — cross-stack **BIT-EXACT** vs the Phase-1 f64
  NumPy reference (`max_abs_err = 0.0`; `equivalence.md` § E), i.e. the own-f64-`wp.array`
  path reproduces the reference byte-for-byte.

**Refined general principle:** the consumption decision is `f64 → socket-only` vs
`f32-acceptable → may consume the convenience surfaces` — and the f64 branch holds
**regardless of whether the convenience surface structurally fits** (MPM: did not fit
+ f64; Smoke: fits + f64 → still socket-only). The § 6 table's Smoke row is updated
(`SHIFTED`) to the landed socket-only consumption; the LBM Stack-E row remains a
prediction pending its own plan-drafting. This note is ADDITIVE.

## 7. Warp upstream references

(FACT — NVIDIA Warp 1.13.0 documentation; Convention C upstream names cited
verbatim.)

- `wp.init()` / `wp.set_device(ident)` / `wp.get_device(ident=None)` /
  `wp.is_cpu_available()` / `wp.is_cuda_available()` — runtime + device API.
- `@wp.kernel` decoration; `wp.launch(kernel, dim, inputs=[...])`;
  `wp.tid()`; `wp.synchronize()`.
- `wp.array(dtype, ndim)` / `wp.zeros` / `wp.from_numpy(arr, dtype=...)` /
  `wp.array.numpy()` — array allocation + NumPy interconversion.
- `wp.vec3` / `wp.float32` / `wp.float64` / `wp.int32` — kernel dtypes.
- `wp.rand_init(seed, offset)` → `wp.randf(state)` — per-thread RNG (no
  global seed).
- `wp.HashGrid` + `wp.hash_grid_query` / `wp.hash_grid_query_next` — spatial
  hashing (kernel-only query builtins).
- `wp.ScopedDevice(ident)` — scoped device context for allocation + launch.
- Upstream releases: `github.com/NVIDIA/warp/releases`.

The bootstrap deliberately does NOT exercise: `wp.Tape` (autodiff beyond a
minimal probe), `wp.Volume` / NanoVDB, CUDA-graph capture (`wp.capture_*`),
mesh primitives — all Phase-3.7+ / per-port scope.

## 8. Methodology integration

- **S6-trajectory-simulation discipline** (conventions § L.4). The smoke
  sim's design was bounded-trajectory-checked *before* implementation
  (Stage-0 Task 0.6: max-field 1.0 → ~0.219 over 400 steps, monotone,
  mass-conserved), and the implementation reproduced it empirically
  (Stage-1c Task 1c.4: 0.218683, zero increases). This is the laminar
  opposite of the chaotic Taylor-Green Stack-D smoke port — the false-laminar
  risk does not apply (the decay is genuine diffusion + numerical
  diffusion).
- **Cross-stack-as-defect-amplifier** (conventions § L.4). The W-5 gate runs
  the smoke sim twice and diffs the two captures with `compare_captures`
  (capture-level run-twice-and-diff). A divergence between two runs of the
  same sim is a *determinism* defect, not a cross-stack defect, but the
  capture-level diff is more revealing than within-stack determinism alone —
  the methodology principle carries over. For the three Stack-E ports (§ 6),
  the same `compare_captures` surface becomes the genuine cross-stack
  amplifier against their Stack-B/C/D partners.
- **Determinism floor.** This convention is the project-wide Stack-E
  determinism floor (CPU `bit-exact-same-hw`); per-sim ports add sim-side
  amendments additively (the pattern of taichi.md § 7 / numba § 8).

---

*End of project-wide Warp convention + `common-warp` public API reference.
Inherits the determinism contract from spec § 2.5 + § 4.5; declared once
here so per-port Stack-E adoption stays additive (import + sim-specific
equivalence test + the sim's determinism.md update). Sister convention to
docs/common/taichi.md (Stack-D) and docs/common/numba.md (JIT).*

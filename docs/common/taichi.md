# taichi — Stack D DSL convention

> **Document type:** Project convention (per spec § 9.1 — Stack D /
> language-level conventions; spec § 4.4 — Stack D verification posture;
> spec § 2.5 — determinism harness).
> **Landed at:** sub-phase-taichi-integration (first spec-Phase-2
> deliverable).
> **Dep declaration:** `common/common-py/pyproject.toml`
> `[project].dependencies` — `taichi>=1.7,<2.0` (Task 0.3 routing (a):
> Taichi is Stack-D-only; Stack-B/C developers omit common-py from
> their workspace install).
> **Verification surface:** `tools/testkit/taichi_harness/tests/test_taichi_determinism.py`.
> **Sister convention:** `docs/common/numba.md` (project-wide JIT
> convention; structural template for this doc).

## 1. When to use Taichi in this project

Taichi is the **primary Stack-D DSL** per spec § 4.4. Use it when a sim
meets all of:

1. **Best-fit DSL for the algorithm.** Per spec § 4.4 "Best for: MPM
   family (the 88-line MLS-MPM reference is canonical Taichi). Lenia
   variants. Research-iteration sims where the DSL matters more than
   raw performance."
2. **The sim ships a Stack-D port** (per spec § 5 stack scoping; per
   the per-sim sub-phase plan).
3. **The sim's reference implementation already exists in another stack**
   (typically Stack-B Python reference per Phase-1; Stack-D Taichi port
   is the cross-stack equivalence partner).

(FACT — spec § 4.4 + spec § 11.3 Phase 2 scope + spec Appendix D § D.6
cross-stack equivalence framing.)

**Do NOT use Taichi** for:

- Closed-form sims (closed-form / agent-based / continuous-CA categories
  per Phase 1 — those ship reference-only in Python NumPy; no Stack-D
  port until spec-Phase-2+ routing).
- Sims whose Stack-D port would not exercise Taichi's DSL strengths
  (kernel-level parallelism, sparse data structures, autodiff per
  DiffTaichi).
- Test or audit utilities (use pure Python).

## 2. Required initialization form

(FACT — Taichi 1.7.4 `ti.init` signature inspected at HEAD via
`uv run --no-sync python -c "import taichi as ti; help(ti.init)"`;
**`deterministic_mode` is NOT a valid Taichi 1.7.4 `ti.init` kwarg** —
the determinism mechanism for Taichi 1.7.4 is the combination below.)

```python
import taichi as ti
ti.init(
    arch=ti.cpu,
    random_seed=<seed>,
    cpu_max_num_threads=1,
    offline_cache=True,
)
```

Or via the project wrapper:

```python
from common_py.determinism import Config, set_taichi_deterministic
set_taichi_deterministic(Config(deterministic=True, seed=42))
```

All four kwargs MUST be specified explicitly when invoking `ti.init`
directly (no relying on Taichi defaults). Audit clarity matters: a
reader scanning the source should immediately see what determinism
contract this `ti.init` call operates under.

### 2.1 `arch=ti.cpu` (or explicit backend)

**Required.** Bit-determinism in Taichi is currently achievable
reliably on the CPU LLVM backend with `cpu_max_num_threads=1`. GPU
backends (`ti.cuda`, `ti.vulkan`, `ti.metal`) have per-driver +
per-vendor FMA-fusion variability — cross-stack equivalence against
Stack C is epsilon-bounded, not bit-exact (spec § 4.4 verification
posture: "Cross-stack equivalence against Stack C is the harder
direction (FP order is not guaranteed equal)"). For per-sim sub-phase
gates 10–11 (determinism + property tests), pin to `ti.cpu`. GPU
backend testing is the per-sim sub-phase's own scope, gated under spec
§ 7.8 runtime-only display-surface discipline.

(FACT — three independent reference anchors per spec § 4.4 anchor
discipline:
1. spec § 4.4 limitation #4 — "FMA fusion across backends"; cross-stack
   equivalence is the harder direction.
2. Taichi compile_config.h surface — `cpu_max_num_threads` is the
   reduction-thread pin per `ti.init` `**kwargs` documentation.
3. numba § 3 — sister convention's `parallel=True` ban for the same
   nondeterministic-parallel-reduction reason. Same family of FP-order
   issues.)

### 2.2 `random_seed=<seed>`

**Required.** Pins Taichi's internal random generator (`ti.random`).
Default is 0; explicit declaration matches IC-4 `Config.seed` flow.

### 2.3 `cpu_max_num_threads=1`

**Required for bit-determinism.** Taichi's CPU backend parallelizes
`for i in range(N)` kernels by default; reduction order across threads
is nondeterministic without explicit per-thread accumulator + final
deterministic gather. Pin to 1 thread for the project's
`bit-exact-same-stack-same-hw` declaration. Per-sim sub-phases that
need parallel acceleration MUST use explicit reduction discipline AND
ship a regression-test update verifying bit-equivalent output (same
mechanism as numba § 3 `parallel=True` discipline).

### 2.4 `offline_cache=True`

**Required.** Taichi caches compiled kernel artifacts at
`~/.cache/taichi/` (or platform-specific equivalent). With
`offline_cache=True`:
- First call: compile (1-30 s overhead depending on kernel complexity).
- Subsequent calls (same process or new processes with cache hit):
  load from cache, near-zero overhead.
- Source change: cache invalidated automatically.
- Taichi version change: cache invalidated automatically.

The cache write is a side-effect (writes to user's home dir); it is
**not a determinism risk** — cache invalidation is automatic, and the
regression test at § 6 verifies the cached + uncached paths produce
identical output.

## 3. Banned flags

| Flag | Why banned |
|---|---|
| `default_fp=ti.f32` (when sim uses `f64`) | Silent precision downgrade — breaks FP-equivalence against pure-NumPy reference at the bit-deterministic-with-itself contract. |
| `fast_math=True` (Taichi's analogue of numba's `fastmath`) | Re-associates FP ops; breaks bit-exactness against the pure-NumPy reference. Same family of issues as numba's banned `fastmath=True` (§ 2.1 sister convention). |
| `cpu_max_num_threads > 1` without explicit per-thread accumulator + deterministic gather | Nondeterministic parallel reduction. If you need parallel acceleration, structure the kernel with explicit accumulator + gather AND add a regression-test update verifying bit-equivalent output. No exceptions. |
| `debug=True` in committed code | Boundary checks affect performance; debug mode acceptable for local debugging but should not land in committed source. |
| `print_ir=True` in committed code | Noise; local debugging only. |

## 4. Spec § 4.4 known limitations + workarounds

(FACT — spec § 4.4 Stack D "Notable" and "Known limitations" sections.)

### 4.1 `@ti.kernel` cannot hot-reload

`@ti.kernel` decorator captures the function's AST at decoration time;
in-process re-import of the kernel module does not pick up source
changes. Workaround: **watchfiles + process re-exec via os.execvp**.

The project's surface:

```python
from common_py.hotreload import watch_and_reexec
from pathlib import Path
watch_and_reexec([Path("path/to/sim.py")], debounce_ms=250)
```

Implementation at `common/common-py/src/common_py/hotreload.py:19`. The
watcher blocks; `execvp` replaces the process image on change (Taichi
runtime cleanup is implicit).

CI-skipped per spec § 7.8 (runtime-only interactive surface).

### 4.2 `@ti.kernel` argument annotations break with `from __future__ import annotations`

Taichi resolves `@ti.kernel` argument type annotations at decoration
time by introspecting the function signature. When the kernel module
uses `from __future__ import annotations` (PEP 563), all annotations
become strings; Taichi's introspection cannot resolve `ti.f64` /
`ti.i32` / etc. from string form and the kernel fails to compile.

**Discipline:** any Python module containing `@ti.kernel`-decorated
functions MUST NOT have `from __future__ import annotations` at module
top. Modules importing from such a kernel module ARE allowed to use
`from __future__ import annotations` themselves; the restriction is
on the kernel-defining module only.

The hello-physics smoke at `common/common-py/smoke/hello_taichi.py`
follows this restriction; static check at Stage 1 close verifies via
`grep`.

### 4.3 Taichi GGUI does not enumerate F-key constants

Taichi GGUI does not expose `ti.ui.F1` / ... / `ti.ui.F12` enum
constants per spec § 4.4 limitation #3. Bindings use string keycodes
(`"F1"`, `"F2"`, ...). Additionally, GGUI's overlay handler traps
F-keys for its own performance-overlay before user callbacks run, so
the documented workaround is poll-then-dispatch.

The project's surface:

```python
from common_py.ggui import KEYS_TRAPPED_BY_GGUI, FKeyDispatcher
dispatcher = FKeyDispatcher()
dispatcher.bind("F5", lambda: capture_screenshot())
# Inside the per-frame loop:
dispatcher.poll(window)
```

Implementation at `common/common-py/src/common_py/ggui.py:42`. The
poll-then-dispatch helper tracks edges so each handler fires once per
press, not once per frame held.

CI-skipped per spec § 7.8 (runtime-only display surface).

### 4.4 FMA fusion across backends

Per spec § 4.4 verification posture: "Cross-stack equivalence against
Stack C is the harder direction (FP order is not guaranteed equal)."
FMA (fused multiply-add) fusion is driver- and vendor-specific. Within
a single backend on fixed hardware + fixed driver + fixed Taichi
version, FMA fusion is deterministic. Across backends (CPU vs CUDA vs
Vulkan vs Metal), FMA fusion order differs.

**Implications for cross-stack equivalence:** Stack-D-vs-Stack-C
equivalence is **epsilon-bounded, not bit-exact**, per spec § 2.6
default tolerance table (`bit-exact-same-hw` declaration for Stack-D;
`epsilon-bounded-cross-stack` for the cross-stack pair). Per-sim
sub-phases declare the actual epsilon in their `equivalence.md` per
spec § 6.

This sub-phase ships only the CPU-backend regression-test harness; GPU
backend testing is per-sim sub-phase scope.

### 4.5 Taichi-vs-Python-3.12 internal deprecation (locale)

(FACT — observed at Stage 1 of this sub-phase; not in spec § 4.4 but
discovered during integration.)

Taichi 1.7.4 internally calls `locale.getdefaultlocale()` during
`ti.init()`. Python 3.12 deprecates this API (slated for removal in
3.15). `DeprecationWarning` is raised; under strict
`filterwarnings = ["error"]` pytest configurations (common-py's
posture), the warning converts to a test failure.

**Workaround at common-py:** `[tool.pytest.ini_options].filterwarnings`
adds `"ignore::DeprecationWarning:taichi.*"` to preserve strict-warnings
posture without coupling to Taichi-upstream's release cadence. See
`common/common-py/pyproject.toml` at HEAD.

When Taichi 1.8+ ships (assumed to fix the locale call), revisit the
filter; if obsolete, remove via a separate operator-approved commit.

## 5. Cross-version bit-equality is not formally guaranteed

(FACT — Taichi upstream does not publish a bit-equality guarantee
across versions; LLVM upgrades, codegen-strategy changes, backend
optimizations can all change the lowered kernel code. Same posture as
numba § 5.)

The project's discipline:

1. Pin Taichi to a known-good range in `common/common-py/pyproject.toml`
   (`taichi>=1.7,<2.0` at HEAD). The upper bound prevents accidental
   adoption of a future Taichi 2.x major version.
2. The regression test at § 6 runs whenever Taichi is available in the
   test env. If a future Taichi upgrade produces bit-drift, the test
   fails before the upgrade lands.
3. When raising the upper bound of the pin (e.g., to taichi 2.0),
   that's a **separate operator-approved commit + audit entry +
   regression-test re-verify**. Not an automatic pin-roll. Same
   discipline as conventions doc § H.4.

## 6. Determinism regression test

The contract is verified by:

```
tools/testkit/taichi_harness/tests/test_taichi_determinism.py
```

The test runs a known-deterministic numerical computation under both
pure NumPy and Taichi JIT, and asserts:

1. **FP-equivalence between pure NumPy and Taichi JIT** at
   N ∈ {64, 256, 1024} (max-abs-diff < 1e-9 absolute).
   **FP-equivalence, NOT bit-equivalence** — NumPy's vectorized SIMD
   code (AVX2 / AVX-512) and Taichi's lowered backend kernel code use
   different FP-accumulation patterns. The same algebraic formula
   produces slightly different bit patterns at scale. The 1e-9
   tolerance is set well below the spec's cross-stack 1e-4 relative;
   any drift exceeding it indicates a banned flag was used (`fast_math`
   / `default_fp=ti.f32` mismatch / nondeterministic-parallel
   reduction).
2. **Run-to-run determinism** — two consecutive Taichi JIT runs with
   the same seed produce **bit-identical** output. **This is the
   load-bearing same-stack-same-hw contract** for the convention.
3. **Cold-vs-warm cache identity** — clearing Taichi's `offline_cache`
   between runs does not change the JIT output (bit-identical). This
   verifies the compiled-artifact's output is consumer-invariant
   across cache state.

Invocation:

```
uv run --no-sync pytest tools/testkit/taichi_harness/tests/test_taichi_determinism.py -v
```

Tests use `pytest.importorskip("taichi")` at module top — they SKIP
cleanly when Taichi is unavailable in CI (R-T1 mitigation per Stage 1
charter § 9). The test surface is locally validated by Stage 1's
implementation pass.

If the harness fails when Taichi IS available, do NOT relax the test
— investigate per playbook entry P27 (Taichi determinism debugging,
charter § 9.1).

## 7. Workspace adoption procedure

When a sub-phase adopts Taichi for a sim's Stack-D port:

1. Confirm the sim's spec-ref / sim-spec declares Stack-D as a target
   stack per spec § 5 stack scoping.
2. Add a sim-specific Taichi reference module (typically
   `packages/<sim>/<sim>_module>/reference/<algorithm>_taichi.py` or
   analogue). Import `taichi as ti`; call `ti.init(...)` via
   `common_py.determinism.set_taichi_deterministic(config, arch=...)`
   wrapper (not raw `ti.init` — wrapper centralizes the determinism
   contract).
3. Declare the kernel module's restriction at its top: no
   `from __future__ import annotations` (§ 4.2 above).
4. Add a sim-specific Taichi-vs-NumPy equivalence test at
   `packages/<sim>/tests/test_<sim>_taichi_equivalent_to_numpy.py`
   asserting FP-equivalence at small N + bit-identity run-to-run.
5. Update the sim's `determinism.md` to reflect that Taichi JIT is in
   the canonical-tier Stack-D path; declare `bit-exact-same-stack-
   same-hw` for the Stack-D backend AND `epsilon-bounded-cross-stack`
   for the Stack-D-vs-Stack-C pair.
6. Update the sim's sub-phase audit § "Determinism declaration"
   section to note the Taichi surface; cite this convention doc.

The project-wide convention here is the determinism floor; sim-side
amendments are additive on top (same pattern as numba § 8).

## 8. Re-pin policy

When the upper bound of `taichi` needs raising (e.g., 1.x → 2.0), or
when a sim needs a newer Taichi feature (e.g., a 1.8+ DiffTaichi API),
that's a **separate operator-approved commit + audit entry +
regression-test re-verify per the convention** (conventions doc
§ H.4). Not an automatic pin-roll. Same discipline as numba § 5 +
spec § 9.2 vendored-upstream amendments.

When raising the lower bound to require a new feature, also update
this convention doc to reflect the new available surface.

---

*End of project-wide Taichi convention. Inherits the determinism
contract from spec § 2.5 + § 4.4; declared once here so per-sim
adoption stays additive (wrapper call + sim-specific equivalence
test + sim's determinism.md update). Sister convention to
docs/common/numba.md.*

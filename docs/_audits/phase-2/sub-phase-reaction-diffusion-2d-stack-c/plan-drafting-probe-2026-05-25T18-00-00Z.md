---
artifact: plan-drafting-probe
artifact_id: sub-phase-reaction-diffusion-2d-stack-c-plan-drafting
stage: plan-drafting
phase: 2
date: 2026-05-25T18-00-00Z
head_sha: 4f9e523aea6481fb32b71e3ee32bb2f7e16e0f65
head_sha_at_checkpoint: 15453bb5698ce31b109fb711444e335ffab488ac
verdict: NOT-MATURE — common-cpp-bootstrap PRECONDITION surfaced (Hard Rule 2 STOP; NO charter this stage)
---

# Plan-drafting probe — `reaction-diffusion-2d` → Stack C (Vulkan / C++)

8th and final spec § 11.3 cross-stack port; FIRST Stack-C port in the
portfolio. This probe's **load-bearing** deliverable is the common-cpp
maturity assessment (dispatch item (a)): it gates whether plan-drafting
proceeds to a charter, or whether a **common-cpp-bootstrap PRECONDITION
sub-phase** must be surfaced first (mirroring the `common-warp-bootstrap`
precedent).

**Probe verdict (§ 4): common-cpp is NOT MATURE.** It is a self-described
"Phase 1 Stage 1 scaffold" whose Vulkan device-init is declarations-only,
whose capture I/O is `raw-binary-v1` (NOT HDF5; `SHIFTED-NEEDS-HDF5-VENDOR`),
and whose determinism surface is a CLI `Config` struct + argv parser with no
execution-enforcement analog. It has **no executable Vulkan compute
substrate** at all. RD-2D-Stack-C cannot be chartered against it. Per the
IF-NOT-MATURE branch of the dispatch + Hard Rule 2, this stage produces the
probe + a **common-cpp-bootstrap precondition recommendation** (§ 10, in lieu
of a charter) + a plan-drafting landing that HOLDS for operator routing.

---

## § 1. Scope

- **Mission:** plan-drafting probe + charter (or precondition recommendation)
  for porting `reaction-diffusion-2d` (2D Gray-Scott, Pearson 1993) from its
  Phase-1 Stack-B (TypeScript / WebGPU) reference to **Stack C (C++ /
  Vulkan)**. Spec § 11.3 work-item 2.1.C; phase-2 plan § 2.4 "Stage 1 — RD-2D
  → Stack C / Vulkan".
- **Portfolio position:** 8th cross-stack port; closes spec § 11.3 enumeration
  on landing. FIRST Stack-C port (prior 7 are Stack-D Taichi ×5 + Stack-E Warp
  ×3 — wait: Stack-D ×4 [RD-2D, sph-water, LBM, MPM] + Stack-E ×3 [MPM, smoke,
  LBM]; RD-2D-Stack-C is the first to target the Vulkan/C++ backend).
- **Entering HEAD:** `15453bb` (LBM-Stack-E Stage-2 SHA back-fill), verified
  `git rev-parse HEAD` == `15453bb5698ce31b109fb711444e335ffab488ac`.
- **Cumulative shifts entering:** 218.
- **Deliverable conditionality:** because the load-bearing maturity gate
  resolves NOT MATURE, the deliverable set narrows per the dispatch:
  probe + precondition recommendation + plan-drafting landing; **NO charter**.

---

## § 2. Convention C / D / M / A discipline at HEAD

**Convention M (re-anchor before edit; HEAD wins on drift).** All assertions
in this probe are grounded in files READ at HEAD `15453bb`, not memory.
Read-only doc-anchor baselines (`git rev-parse HEAD:<path>`):

| Anchor | blob sha @ HEAD `15453bb` |
|---|---|
| `docs/conventions/sub-phase-conventions.md` | `b00de06767341f9bf84f0af9d8e274ec66a599a1` |
| `docs/conventions/cross-stack-equivalence-methodology.md` | `6e5e2ede6518ce8dfbfeaa4506719e188f3070e5` |
| `docs/common/warp.md` | `3dff0d91c0c6d370ef85d90243bd150a93fd92ab` |
| `docs/common/cpp.md` | `1bfa8a45e6a4eaf25364391f314f8d369a166e79` |
| `docs/architecture.md` | `2aa8f227fdf92597115a19cc75f1a776a9b5b3bb` |
| `docs/phases/phase-2-cross-stack-replication.md` | `87cd30bdbfa9be0eb20c155becf2d26ac64279c0` |
| `docs/phases/phase-1-plan.md` | `487891b7a83b0f82d94a717de574b6bc8e10f7f5` |
| `tools/testkit/equivalence/tolerance.toml` | `b2706882458d4160df0a7646a08fca1ebeb4a171` |

> Note: the entering dispatch quoted `architecture sha: e82b7b8e`. At HEAD the
> blob is `2aa8f227…`. SHIFTED — the dispatch value is stale; HEAD wins
> (Convention M). Architecture content is unchanged in substance across the
> Stack-E sub-phases; only the blob hash is cited here for the baseline.

**Convention C/D (API surfaces + call sites before drafting).** § 4 reads the
entire common-cpp public surface (5 headers + 2 `.cpp` impls + smoke consumer
+ CMakeLists + tests) and the common-warp § 1.9.1 socket it is measured
against — verbatim, no extrapolation from the prior Stack-E probes.

**Convention A (additive-only; new files first).** This stage adds three new
audit files under
`docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/`; it edits no
source and (NOT MATURE) creates no charter and no `tolerance.toml` change.

**Convention #8 (FACT/INFERENCE/SHIFTED; never assert from memory; web-fetch
at moment of assertion).** Vulkan determinism claims (§ 5 item (d)) are
web-researched at probe time and cited in § 11; the §6.8 backend-pair
observation is read at HEAD, not recalled.

---

## § 3. Entering-state reconciliation (dispatch ENTERING STATE + PROBE-MUST-HONOR)

| Entering claim | HEAD verification | Verdict |
|---|---|---|
| HEAD `15453bb` | `git rev-parse HEAD` == `15453bb5698…` | FACT — confirmed |
| Cumulative shifts 218 | carried from LBM-E landing | FACT — accepted as entering baseline |
| uv workspace members = 23 | counted in root `pyproject.toml` `[tool.uv.workspace].members` (incl. `common/common-py`, `common/common-warp`) | FACT — 23 |
| common-cpp NOT a uv member | `pyproject.toml` has no `common/common-cpp` entry; common-cpp is a CMake/C++ project (find_package), tracked outside the uv workspace | FACT — see § 4.5 (registration nuance) |
| Bit-identity replay invariant `9399fc33…718909f34` HELD | not re-run this stage (plan-drafting is doc-only, additive); replay HELD as of LBM-E Stage-2 sweep | INFERENCE — unchanged (no source touched) |
| Integrity sweep baseline `c19492ad…d22cb52` (0 HF / 14 SW) HELD | not re-run this stage (doc-only additive); HELD 16 contiguous sub-phases entering | INFERENCE — unchanged |
| RD-2D Phase-1 reference captures present | `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` exist | FACT — confirmed |

PROBE-MUST-HONOR items (a)–(j) are addressed in § 4 (item a, load-bearing) and
§ 5 (items b–j).

---

## § 4. LOAD-BEARING — common-cpp maturity assessment (dispatch item (a))

### § 4.1 Surface inventory (read verbatim at HEAD `15453bb`)

`git ls-files common/common-cpp/` — 13 tracked files, 1057 LOC total:

| Path | LOC | Substance |
|---|---|---|
| `CMakeLists.txt` | 89 | header comment: "Phase 1 Stage 1 scaffold … runtime implementations land in subsequent per-sim implementation phases." FetchContent nlohmann/json v3.11.3 + doctest v2.4.11; `find_package(Vulkan QUIET)`; static lib `bit_physics_common_cpp` from `capture.cpp` + `determinism.cpp`; smoke exe; doctest test exe. |
| `README.md` | 11 | "Phase 1 Stage 1 scaffold per charter … § 2.1 / IC-1 / IC-3." |
| `include/.../capture.hpp` | 119 | `Manifest`/`SimMeta`/`StackMeta`/`ConfigMeta`/`RunMeta`/`PayloadMeta`/`DeterminismMeta`; `FieldData`/`StepData`; `Reader`/`Writer`. Header banner: **"SHIFT from charter — payload format: HDF5 … is deferred … Phase 1 Stage 1 ships a raw-binary payload."** |
| `include/.../determinism.hpp` | 21 | `struct Config { bool deterministic; uint64_t seed; }` + `Config from_args(int& argc, char** argv)`. Nothing else. |
| `include/.../vulkan_init.hpp` | 107 | `DeviceConfig`/`SwapchainConfig`/`PresentModePolicy`; `Device`/`Swapchain`/`DescriptorAllocator` classes. Banner: **"Stage 1 ships the declarations only. Implementations land in a subsequent per-sim Stack C implementation phase that actually creates a window + swap chain."** When `BIT_PHYSICS_HAS_VULKAN==0` these collapse to bare forward declarations. |
| `include/.../export_hooks.hpp` | 63 | VDB/Alembic/USD export fns — all `throw std::logic_error("… surface stub …")`. |
| `include/.../imgui_hooks.hpp` | 32 | inline no-op overlay hooks. |
| `src/capture.cpp` | 261 | IMPLEMENTED: JSON manifest + `.bin` raw payload Writer/Reader. Exercisable end-to-end. **`raw-binary-v1`, not HDF5.** |
| `src/determinism.cpp` | 43 | IMPLEMENTED: `from_args` argv parsing of `--deterministic` / `--seed N`. |
| `smoke/advection_1d.cpp` | 107 | 1D upwind advection, periodic 64-cell grid, **pure host C++ (NOT Vulkan)**; writes a raw-binary capture; consumes `capture` + `determinism`. |
| `tests/{test_capture,test_determinism,test_main}.cpp` | 204 | doctest round-trip of capture + argv parsing; per `cpp.md` "8/8 passed, 35 assertions" at Stage-1 commit time. |

`docs/common/cpp.md` (the C++ analog of `warp.md`) confirms the scaffold
framing in its own words — **"Out of scope this stage:"** lists: "Full HDF5
capture vendoring (SHIFTED)", "A working Vulkan device-init body (header
surface only)", "Real ImGui / VDB / Alembic / USD output (header stubs only)",
"Top-level CMakeLists.txt registration of common-cpp as a subdirectory of the
project root (Convention A — Stage 3 owns)", "Cross-stack equivalence harness
with common-ts / common-py (SHIFTED to per-sim phase)."

### § 4.2 Socket comparison vs common-warp § 1.9.1 (the consumption contract Stack-E ports consume)

common-warp's `__init__.py` exports the § 1.9.1 socket consumed by every
Stack-E port: **Runtime** (`init`, `get_device`, `set_device`),
**Determinism** (`set_seed`, `get_seed`, `set_warp_deterministic`,
`deterministic_context`, `assert_deterministic_run`), **Capture** (`Capture`,
`read_capture`, `write_capture` — HDF5), plus data structures (`Particles`,
`ScalarField3D`/`VectorField3D`, `HashGrid`). Crucially, common-warp wraps an
**executable compute substrate**: Warp CPU `wp.launch` runs serially over the
launch dimension → structurally bit-deterministic (the W-2 baseline
`24d44c7e…0746f314`). A Stack-E port can `init()`, run kernels, capture, and
assert determinism out of the box.

Gap enumeration (common-warp socket → common-cpp at HEAD):

| § 1.9.1 socket | common-warp (Stack-E) | common-cpp @ HEAD | Gap |
|---|---|---|---|
| **Runtime / execution substrate** | `init(device, deterministic)`; Warp CPU serial launch executes kernels; bit-deterministic by construction | `vulkan_init.hpp` **declarations only** — `Device::create`/`Swapchain::create`/`DescriptorAllocator::allocate` linked-but-undefined; render-window-oriented (swap chain, present-mode), **NOT compute-oriented**; no instance/device body, no compute queue, no command buffers, no descriptor sets, **no compute pipeline / SPIR-V module load / buffer alloc-upload-readback / dispatch + sync** | **BLOCKING.** No code can execute on Vulkan. The single largest gap. |
| **Determinism (execution-enforced)** | `set_warp_deterministic`, `deterministic_context`, `assert_deterministic_run(sim_fn, runs=2, tolerance=0.0)` — 2-run bit-identity harness + structural CPU guarantee | `Config{bool deterministic; uint64 seed}` + `from_args` argv parser **only** | **BLOCKING.** No `assert_deterministic_run` analog, no 2-run harness, no execution-side determinism enforcement, no FloatControls discipline (see § 5(d)). |
| **Capture I/O (compare-ready)** | HDF5 `write_capture`/`read_capture` — `compare_captures`-compatible; matches the HDF5 Phase-1 references | `raw-binary-v1` JSON-manifest + `.bin` Writer/Reader, IMPLEMENTED + exercisable, but **NOT HDF5** — `cpp.md`: `cross-stack-equivalence:cpp-ts:SHIFTED-NEEDS-HDF5-VENDOR` | **BLOCKING for cross-stack.** Format-incompatible with the RD-2D HDF5 reference + the `compare_captures` harness. Surface exists; format is wrong. |
| **Data structures (fields)** | `ScalarField3D`/`VectorField3D` + allocators | NONE | Non-blocking (RD-2D can roll its own buffers — see § 5(i)/warp.md § 6.1 socket-only principle), but absent. |
| **Harness / run-loop** | `warp_harness` (`harness.py`, `determinism.py`) | NONE (sims hand-roll `main()`, as the 1D advection smoke does) | Non-blocking but absent. |
| **Smoke / example consumer** | `examples/hello/sim.py` — 2D advection-diffusion exercising the full socket on the actual backend | `smoke/advection_1d.cpp` — **pure host C++**, exercises capture+determinism-config but **never touches Vulkan** | The existing smoke does not de-risk the compute substrate (because there is none). |

### § 4.3 Maturity verdict: **NOT MATURE**

common-cpp at HEAD is a **surface scaffold**: every public name/signature for
capture + determinism-config is pinned and the capture path is exercisable in
CI, but the three load-bearing sockets a Vulkan/C++ sim must consume —
(1) an executable compute substrate, (2) execution-enforced determinism, and
(3) a `compare_captures`-compatible (HDF5) capture format — are **absent,
declarations-only, or in the wrong format** by the package's own explicit
design ("Out of scope this stage"). RD-2D-Stack-C **cannot be chartered**
against this surface.

### § 4.4 Plan-vs-reality tension (Hard Rule 2 STOP trigger)

There is a **direct contradiction** between the phase-2 plan's stated
assumption and the landed common-cpp:

- **phase-2 plan asserts common-cpp is mature** (read at HEAD `87cd30bd…`):
  - § (FACT, spec § 11.2 item 1.8): "`common/common-cpp/` — consumed by Stage 1
    (RD-2d→C; **Phase 1 already requires it for sims 1.4, 1.6, 1.7, so it must
    be mature**)."
  - Table row 2.1.C: "reaction-diffusion-2d | B | C (Vulkan/C++) | … |
    **consumes `common-cpp`** | First Stack C continuous-CA sim".
  - Rule (Stack-C/D port stages): "do NOT extend the common module. … **Common-
    module surface area changes are explicitly outside Phase 2 scope.**"
  - Stage-1 dependency table: "`common/common-cpp/` **mature module** …
    `target_link_libraries(... bit_physics::common_cpp)`".
- **landed common-cpp is a Phase-1-Stage-1 scaffold** (§ 4.1) whose Vulkan
  impl, HDF5 capture, and determinism execution are deferred, and whose own
  `cpp.md` says implementations "land in **the per-sim phase that first needs
  them**."

These cannot both hold. The plan forbids extending common-cpp in Phase 2, yet
the Vulkan compute substrate + HDF5 capture **do not exist** and must be built
*somewhere* before any Stack-C sim can run. This is a structural blocker
(Hard Rule 2): the probe STOPS and surfaces it rather than chartering RD-2D-
Stack-C against a socket that is materially incomplete. The recommended
resolution (§ 10) is a dedicated **common-cpp-bootstrap precondition sub-phase**
— the precedent-consistent analog of `common-warp-bootstrap`, which performed
exactly this role for the Stack-E ports.

> The repo also contains the *alternative* framing (cpp.md: "the per-sim phase
> that first needs them" → RD-2D-Stack-C builds a minimal Vulkan path inline).
> § 9 (D2) surfaces both options and routes the call to the operator; the lean
> is the bootstrap precondition (precedent-aligned; honors the plan's "do NOT
> extend common-cpp inside a port stage" rule).

### § 4.5 Workspace-registration nuance

common-warp-bootstrap registered the **20th uv workspace member** at its Stage
1a. common-cpp is a **CMake/C++ project**, NOT a uv (Python) workspace member —
it is absent from `pyproject.toml [tool.uv.workspace].members` and is consumed
via `find_package` / `target_link_libraries(... bit_physics::common_cpp)`. A
common-cpp-bootstrap would therefore **NOT change the uv member count (stays
23)**; its registration analog is top-level CMake subdirectory registration
(which `cpp.md` explicitly defers: "Top-level CMakeLists.txt registration …
Stage 3 owns"). This is a real divergence from the common-warp-bootstrap
precedent and is noted for the bootstrap charter (§ 10).

---

## § 5. Probe deliverables (b)–(j)

Several deliverables presuppose an executable Stack-C surface that does not
exist; for those, this probe reports the best-possible assessment + the
constraint, and defers the empirical step to the (post-bootstrap) charter.

### (b) S6-trajectory discipline (conventions § L.4) — REQUIRED; constrained

§ L.4 mandates the probe simulate the Phase-1 canonical for ~50–100 steps and
report the max-field growth rate (bounded → tame; exponential → chaotic);
§ L.8 R-SME9 (D16) sharpens this: simulate **at the canonical resolution**, not
a downscaled de-risk grid.

- **Cannot execute on Stack-C** — there is no Vulkan compute substrate (§ 4).
  The S6 *on-Stack-C* simulation is **DEFERRED to the post-bootstrap charter**
  (it requires the bootstrap's compute path).
- **Phase-1 reference behavior (documented from RD-2D-Stack-D landing,
  read at HEAD):** canonical `gray-scott-lambda-128sq-seed42-step2000`
  (128² grid, 2000 steps, capture interval 200 → 11 frames; F=0.0367,
  k=0.0649, D_u=0.16, D_v=0.08, dx=1.0, dt=1.0; fields `u`,`v`; **f32**
  NumPy reference; IC `numpy.random.default_rng(42)`). **Regime: CHAOTIC**
  (Pearson 1993 λ-region pattern-formation), confirmed at RD-2D-Stack-D.
- **Caveat carried (NOT a tame-laminar read):** RD-2D is a known-chaotic
  trajectory — the § L.4 "false-laminar" trap does not apply (we already know
  it is chaotic). The load-bearing question is whether that chaos *amplifies a
  cross-stack seed-difference* — see (c)+(e)+§ 6.

### (c) Step-1 cross-stack seed-difference assessment (load-bearing per § 6.1)

Per § L.7 O-1 + § 6.1, verdict shape is grounded in the step-1 seed-difference,
NOT extrapolated from regime (the error overturned at smoke-E S1c).

- **Cannot MEASURE on Stack-C** (no substrate) → DEFERRED to charter/Stage-0.
- **Prior data point (RD-2D-Stack-D vs Stack-B NumPy, read at HEAD):** step 0
  **bit-identical** (shared NumPy IC, seed 42); step-1 onward diverges at
  **FP-accumulation scale**, peaking `max_abs_err ≈ 1.9e-14` near step 1600,
  `within_tolerance=True` at `relative=1e-4` across the full step-2000 horizon.
  Shape **(b)**. R-P2 (chaotic divergence) was **empirically FALSIFIED for the
  Stack-B↔Stack-D pair** — chaos did not amplify the ~1e-14 seed-difference to
  the 1e-4 tolerance within the horizon.
- **Stack-C-specific prediction (§ 6).** The Stack-B↔Stack-C step-1 seed-
  difference is a property of the **Vulkan/C++ ↔ NumPy backend pair** and must
  be measured, not inherited. Two sub-cases:
  - If RD-2D-Stack-C shares the NumPy IC bit-for-bit AND its Vulkan kernel
    preserves NumPy's operation order with `NoContraction` (no FMA fusion),
    step-1 could be `0.0` → shape **(a)** bit-exact (the § L.7 O-1-refined
    condition: zero seed-difference is trajectory-orthogonal). This is **NOT
    assumed** — Vulkan FMA-contraction-by-default + denorm-flush + rounding-mode
    defaults make a non-zero step-1 the more likely outcome absent explicit
    FloatControls discipline (see (d)).
  - If step-1 is non-zero (the expected default), the chaotic λ-region regime
    means R-P2 **could** apply at the full horizon (shape **(c)**) — UNLIKE the
    Stack-D pair, because the Vulkan backend's FP arithmetic differs from
    NumPy's more than Taichi-CPU's did. **Leaning (§ 6): shape (b) most likely,
    shape (c) plausible at full horizon, shape (a) only under strict
    FloatControls discipline.** Grounded at Stage-0 step-1 measurement.

### (d) Vulkan compute-shader determinism assessment (web-researched at probe time; § 11 cites)

GUARANTEED vs COMMON distinction is load-bearing:

- **Core stencil arithmetic (add/sub/mul) is correctly rounded** — GUARANTEED
  by the SPIR-V "Precision and Operation of SPIR-V Instructions" appendix. A
  Gray-Scott update is add/sub/mul-dominated → favorable.
- **Division is 2.5-ULP-bounded, NOT correctly rounded** → avoid `/`; multiply
  by precomputed reciprocal constants to match NumPy bit-for-bit.
- **fp32 GUARANTEED; fp64 (`shaderFloat64`) OPTIONAL / device-dependent** —
  present on desktop GPUs + Mesa lavapipe (software CPU Vulkan), absent on all
  major mobile vendors. The RD-2D reference is **f32**, so an **f32 Vulkan
  kernel vs the f32 NumPy reference** is the universally comparable config (no
  `shaderFloat64` dependency). This is a fortunate alignment for Stack-C.
- **FMA contraction is ON by default** (`AllowContract` assumed) → the single
  biggest bit-exactness threat; suppressed per-op via `NoContraction` (GLSL
  `precise`). NumPy does not FMA-fuse, so the Vulkan kernel must be
  `NoContraction`-decorated to match.
- **Same-device / same-driver run-to-run bit-identity** for a no-atomics,
  no-reduction stencil (RD-2D is exactly this) is **achievable by construction**
  — the analog of the single-CPU-thread Warp guarantee.
- **Cross-device / cross-driver bit-identity is NOT guaranteed** (FMA
  placement, denorm flush, rounding mode, transcendental ULPs). Stack-C
  determinism must therefore pin a **single fixed backend** (recommend Mesa
  **lavapipe** software Vulkan on the CI host — the closest analog to the
  project's single-CPU-thread determinism posture; supports compute, runs on
  the host FPU like NumPy) with `NoContraction` + `RoundingModeRTE` +
  `DenormPreserve` execution modes asserted on devices advertising support.
- **Implication for the bootstrap:** the determinism socket common-cpp must
  grow is NOT just a config struct — it is (i) a pinned deterministic-execution
  backend choice, (ii) the FloatControls/`NoContraction` discipline, and
  (iii) an `assert_deterministic_run` analog (2-run bit-identity harness).

### (e) § 6.8 backend-pair observation — EXPLICIT NON-INHERITANCE

Methodology § 6.8 (read at HEAD `6e5e2ede…`) records the **n=2** observation
that **Warp CPU f64 reproduces NumPy byte-for-byte** (smoke-E + LBM-E), and
states verbatim it is "a cross-stack-equivalence claim about a **backend
pair's** FP faithfulness." **This does NOT port to Stack-C.** Vulkan/C++ ↔
NumPy is an **entirely different backend pair** with different FP behavior
(FMA-contraction-by-default, optional fp64, driver-dependent denorm/rounding —
see (d)). The § 6.8 property is explicitly NON-INHERITED here. The Stack-C
backend-pair property must be established **empirically** at Stage-0 step-1
measurement (post-bootstrap), not assumed from § 6.8. (Were RD-2D-Stack-C to
land bit-exact, it would be a *new, independent* backend-pair data point, not a
continuation of the Warp-CPU-f64 n=2 track.)

### (f) Tolerance reuse — VERIFIED at HEAD; no-op anticipated (moot under NOT MATURE)

`tools/testkit/equivalence/tolerance.toml` @ HEAD (`b2706882…`) contains:

```toml
[overrides.reaction-diffusion-2d]
category = "reaction-diffusion"   # rel=1e-4, abs=0.0 (AT-BUDGET; resolution wiring, not widening)
```

`compare_captures` keys on the LEFT/reference `sim.name` = `reaction-diffusion-2d`,
which is shared by the Stack-B reference. **Stack-C inherits the existing
override unchanged**; the (post-bootstrap) Stage-1c override edit is anticipated
a **no-op**. Confirmed (FACT). Moot this stage (no charter / no Stage-1c).

### (g) Inheritance of all 5 amendment sets (§ L.4 + § L.5 + § L.6 + § L.7 + § L.8)

Read at HEAD `b00de067…`. All inherited; applicability to a Vulkan/C++ port:

| Set | Substance | Applies to RD-2D-Stack-C? |
|---|---|---|
| § L.4 | S6-trajectory-simulation discipline; cross-stack-as-defect-amplifier; f64-seed for pure-literal kernel constants | YES (S6 — see (b)); the `ti.f64()` literal-seed is Taichi-specific (the *principle* — pin literal precision — carries to GLSL/SPIR-V as "declare constants at the kernel precision"). |
| § L.5 | GPU device-string prose discipline; socket-reconciliation Option B; plan-prose-gloss vs spec-verbatim | YES — esp. socket-reconciliation Option B (directly relevant if the common-cpp socket is refactored at bootstrap). |
| § L.6 | O-W7 `wp.float64()` int-index taint workaround | **NO** — Warp-specific (see (h)). |
| § L.7 | O-1 verdict taxonomy (a/b/c; shape (a) = zero seed-diff, trajectory-orthogonal); O-2 four-checkpoint determinism chain | YES (taxonomy — see § 6; chain pattern — see (i)). |
| § L.8 | R-P2 NOT stack-portable; O-W7 narrowing; resolution-dependent false-laminar trap (D16); charter-amendment-landing precedent | YES — esp. R-P2-not-portable (re-grounds (c)/(e)) + resolution-dependence (S6 at canonical 128², see (b)). O-W7 narrowing is Warp-specific. |

### (h) § L.6 O-W7 Warp quirks catalog — does NOT apply; Vulkan/C++ sibling needed

§ L.6 O-W7 is a **Warp 1.13.0** quirk (`wp.float64()` tainting an int loop
index). It has **no bearing on Vulkan/GLSL/SPIR-V**. The Stack-C analog quirk
surface is entirely different (FMA contraction, `NoContraction`/`precise`,
FloatControls execution modes, denorm flush, `shaderFloat64` gating, SPIR-V
optimizer FMA-folding). A **parallel Vulkan/C++ quirks catalog** (a § L.x
sibling to § L.6, or a new methodology subsection) **should be initiated at the
common-cpp-bootstrap** — surfaced as a Stage-2 banking candidate (§ 8 R-RD2C5;
§ 9 D5).

### (i) § L.7 O-2 four-checkpoint determinism chain — PATTERN ports; IMPLEMENTATION needs Vulkan analog

§ L.7 O-2 chain (Warp): (1) Stage-0 R-A1 anchor sha256 from a minimal
verification kernel → (2) Stage-1a gate-10 production kernel reproduces the
anchor → (3) Stage-1b canonical-scale 2-run determinism → (4) Stage-1c formal
gate-14 cross-stack equivalence.

- **The PATTERN ports** to Stack-C: a Vulkan compute dispatch can produce a
  digest of its output buffer; same-device run-to-run bit-identity is
  achievable (§ 5(d)) → checkpoints (1)–(3) are realizable; gate-14 (4) is
  stack-agnostic (compare_captures).
- **The IMPLEMENTATION needs a Vulkan/C++ equivalent of the Warp `@wp.kernel`
  R-A1 anchor**: a minimal GLSL/SPIR-V compute shader dispatched twice on the
  pinned backend, digesting the output buffer. **This requires the bootstrap's
  compute substrate + determinism harness** — it cannot exist until the
  bootstrap lands. The R-A1 anchor for RD-2D-Stack-C is therefore a
  **post-bootstrap Stage-0** deliverable.

### (j) Stage-decomposition authority — DEFERRED (no charter this stage)

Smoke-E + LBM-E established the 6-stage split (plan-drafting + 0 + 1a scaffold +
1b impl/reg/ckpts + 1c equivalence/un-skip/fixture/ckpt-4 + 2 landing). The
RD-2D-Stack-C charter would likely follow it — BUT there is **no charter this
stage** (NOT MATURE). Stage decomposition is deferred to the post-bootstrap
RD-2D-Stack-C charter. The **common-cpp-bootstrap** stage decomposition is
proposed in § 10 (mirroring common-warp-bootstrap's plan-drafting + 0 + 1a/1b/1c
+ 2).

---

## § 6. Predicted gate-14 verdict (inference order honored: seed-diff → regime → shape)

Per § L.7 O-1 + § 6.1, the inference order is **step-1 seed-difference FIRST,
then regime, then shape** (the smoke-E S1c calibration lesson). For RD-2D-
Stack-C the step-1 seed-difference is **UNMEASURED** (no substrate) → no firm
verdict prediction is asserted. Leaning, grounded in § 5(c)+(d):

| Condition | Predicted shape | Likelihood |
|---|---|---|
| Vulkan kernel preserves NumPy op-order + `NoContraction` + shared f32 IC → step-1 `= 0.0` | (a) bit-exact (trajectory-orthogonal per O-1 refinement; chaos irrelevant) | possible under strict FloatControls discipline |
| step-1 non-zero at FP-round-off, stays sub-tolerance over horizon | (b) FP-round-off within `rel=1e-4` | **most likely** (matches the Stack-D data point's shape) |
| step-1 non-zero AND chaotic λ-region amplifies it past `1e-4` before step 2000 | (c) R-P2 escape-hatch (`within_tolerance=False` = CORRECT) | plausible at full horizon — the Vulkan↔NumPy pair is arithmetically further apart than Taichi-CPU↔NumPy, so R-P2 (falsified for Stack-D) could re-engage for Stack-C |

**No verdict is pre-committed.** This is the calibration discipline from
smoke-E: predict from measured step-1, not regime extrapolation. The
measurement happens at the post-bootstrap Stage-0.

---

## § 7. Naming proposal (D1)

- **Sub-phase:** `sub-phase-reaction-diffusion-2d-stack-c` (mirrors the prior 7
  ports' `sub-phase-<sim>-stack-<X>` pattern). RATIFIED as the proposed name
  (operator confirms at charter — but the charter is deferred; the audit dir is
  already created under this name).
- **Precondition sub-phase (surfaced):** `sub-phase-common-cpp-bootstrap`
  (mirrors `sub-phase-common-warp-bootstrap`). Operator routes (§ 10 / D2).

---

## § 8. Risk register (R-RD2C*)

| ID | Risk | HEAD disposition |
|---|---|---|
| R-RD2C1 | **common-cpp not mature** — no Vulkan compute substrate, no HDF5 capture, no determinism execution | REALIZED → § 4 NOT MATURE; § 10 bootstrap precondition. BLOCKING. |
| R-RD2C2 | **plan-vs-reality contradiction** — plan says common-cpp mature + "do NOT extend in Phase 2"; reality = scaffold needing the substrate built | REALIZED → § 4.4 Hard Rule 2 STOP; D2 routes the resolution. |
| R-RD2C3 | **Vulkan FP non-determinism** (FMA contraction, denorm, rounding, cross-device divergence) | MITIGABLE → § 5(d): pin lavapipe + `NoContraction`+RTE+DenormPreserve; f32-vs-f32. Bootstrap owns the discipline. |
| R-RD2C4 | **HDF5 vendoring cost** (the `SHIFTED-NEEDS-HDF5-VENDOR` debt; ~25 MB FetchContent, ~minute build per cpp.md) OR a `compare_captures` raw-binary reader path | OPEN → bootstrap D-class decision (HDF5 vendor vs harness raw-binary support). |
| R-RD2C5 | **No Vulkan/C++ quirks catalog** (§ L.6 is Warp-only) | OPEN → initiate at bootstrap; banking candidate (D5). |
| R-RD2C6 | **R-P2 may re-engage for the Vulkan↔NumPy pair** (chaotic λ-region + larger backend arithmetic distance than Taichi-CPU) | OPEN → measure step-1 at post-bootstrap Stage-0; do not pre-commit verdict (§ 6). |
| R-RD2C7 | **canonical-descriptor discrepancy** — phase-2 plan table cites Stack-D port descriptor `gray-scott-lambda-512sq-seed42-step1000`, but RD-2D-Stack-D LANDED `gray-scott-lambda-128sq-seed42-step2000`; Stack-C source is Stack-B | OPEN → § N canonical-descriptor scope-analysis at the (post-bootstrap) RD-2D-Stack-C charter; bank as observation (§ 11 O-RD2C2). |
| R-RD2C8 | **source-tree layout** — plan § 2.4 uses `continuous-ca/reaction-diffusion-2d/ref-stack-c/`, but Stack-D landed as `packages/reaction-diffusion-2d-stack-d/` | OPEN → charter D-class (layout reconciliation); not this stage. |

---

## § 9. D-class question enumeration (surfaced; operator decides — NOT pre-committed)

| D | Question | Lean |
|---|---|---|
| D1 | Sub-phase naming `sub-phase-reaction-diffusion-2d-stack-c`? | YES (mirrors 7 priors). |
| D2 | **Resolve the maturity blocker via a `common-cpp-bootstrap` precondition sub-phase (precedent-aligned with `common-warp-bootstrap`), OR inline a minimal Vulkan compute path in RD-2D-Stack-C's `ref-stack-c/` (cpp.md framing)?** | **Bootstrap precondition** (honors plan's "do NOT extend common-cpp in a port stage"; precedent-consistent; de-risks 4 future Stack-C ports — RD-2D, sph-water 2.2.C-equiv, smoke 2.4.C, LBM 2.5.C). § 10 details the recommendation. |
| D3 | If bootstrap: HDF5-vendor common-cpp capture (resolve `SHIFTED-NEEDS-HDF5-VENDOR`) OR add a raw-binary reader to `compare_captures`? | HDF5 vendor (matches common-ts/common-py; keeps `compare_captures` single-format). |
| D4 | Deterministic-execution backend for Stack-C: Mesa **lavapipe** (software CPU Vulkan) pinned on CI, OR a real GPU + FloatControls? | lavapipe pinned (closest analog to single-CPU-thread determinism; host-FPU like NumPy; no `shaderFloat64`/driver-variance dependency; f32-vs-f32). |
| D5 | Initiate a Vulkan/C++ quirks catalog (§ L.x sibling to § L.6 O-W7)? | YES at bootstrap; bank now (R-RD2C5). |
| D6 | RD-2D-Stack-C workspace/registration: CMake top-level subdirectory registration (NOT a uv member) — uv count stays 23? | YES — common-cpp is CMake (§ 4.5); plan-track the CMake-registration analog at bootstrap. |
| D7 | Stage decomposition for RD-2D-Stack-C charter (post-bootstrap)? | DEFERRED — propose 6-stage split (smoke-E/LBM-E anchor) at the charter. |
| D8 | § N canonical-descriptor scope-analysis to reconcile R-RD2C7 (which Gray-Scott canonical Stack-C ports to)? | DEFERRED to charter; bank now. |

---

## § 10. common-cpp-bootstrap PRECONDITION recommendation (in lieu of charter)

**Surfaced (Hard Rule 2): RD-2D-Stack-C is BLOCKED on a `common-cpp-bootstrap`
precondition sub-phase.** Full scope sketch + proposed stage decomposition is
in the companion artifact
[`common-cpp-bootstrap-precondition-recommendation-2026-05-25T18-00-00Z.md`](./common-cpp-bootstrap-precondition-recommendation-2026-05-25T18-00-00Z.md)
(this stage's COMMIT 2, in lieu of a charter). Summary: the bootstrap must
mature common-cpp's three blocking sockets — (1) executable Vulkan compute
substrate, (2) execution-enforced determinism (`assert_deterministic_run`
analog + FloatControls/`NoContraction` discipline + pinned lavapipe backend),
(3) HDF5 (compare-ready) capture — plus a Vulkan-compute smoke sim that
de-risks all three, mirroring `common-warp-bootstrap`'s 6-stage shape. The
operator routes this precondition before RD-2D-Stack-C can charter.

---

## § 11. Discrepancies, observations, and web-fetch citation (Convention #8)

**Web-fetch (Convention #8 — Vulkan determinism, fetched at probe time
2026-05-25):** SPIR-V "Precision and Operation of SPIR-V Instructions" appendix
(correctly-rounded add/sub/mul; 2.5-ULP div); `VkPhysicalDeviceFloatControls­
Properties` (denorm/rounding/signed-zero-inf-nan preserve gating);
`shaderFloat64` optional feature (desktop + lavapipe; absent on mobile);
`NoContraction` decoration / GLSL `precise` (FMA suppression); Mesa
lavapipe/llvmpipe (software CPU Vulkan, compute + fp64). Full URL list retained
in the plan-drafting working notes; key sources: Khronos Vulkan registry
(`VkPhysicalDeviceFloatControlsProperties`, `VkPhysicalDeviceFeatures`),
KhronosGroup/Vulkan-Docs `appendices/spirvenv.txt`, SPIRV-Tools issue #5658
(FMA folding), Mesa3D llvmpipe/lavapipe docs, arXiv 2408.05148 (FP
non-associativity reproducibility).

**Observations:**

- **O-RD2C1 — dangling `_staging/deps.md` reference (drift).** `docs/common/cpp.md`
  (§ Dependencies) and `common/common-cpp/include/.../capture.hpp` (header
  banner) both cite `common/common-cpp/_staging/deps.md`; that file **does not
  exist** (never tracked; absent from working tree). Banking candidate
  (§ 8 cleanup). The deps budget it points to (HDF5/OpenVDB/Alembic/USD/ImGui)
  is load-bearing for the bootstrap D3.
- **O-RD2C2 — canonical-descriptor discrepancy** (R-RD2C7): phase-2 plan table
  cites `gray-scott-lambda-512sq-seed42-step1000` as the Stack-D descriptor;
  RD-2D-Stack-D LANDED `gray-scott-lambda-128sq-seed42-step2000`. Stack-C
  sources from Stack-B; the Stack-B reference capture present at HEAD is
  `gray-scott-lambda-128sq-seed42-step2000.{h5,json}`. Resolve via § N at the
  charter.
- **O-RD2C3 — architecture-sha drift in dispatch** (§ 2): dispatch said
  `e82b7b8e`; HEAD blob is `2aa8f227…`. HEAD wins (Convention M). Substance
  unchanged.
- **O-RD2C4 — entering cleanup carry-in still open** (LBM-E + smoke-E § 13):
  the stray untracked `captures/eulerian-smoke-stack-{d,e}/taylor-green-…`
  files are present in this working tree (`git status`), confirming the LBM-E
  §13 carry-in. Re-banked (§ landing § 8).

---

*Probe close. Verdict: NOT MATURE → common-cpp-bootstrap precondition surfaced;
NO charter this stage. See COMMIT 2 (precondition recommendation) + COMMIT 3
(plan-drafting landing, HOLD for operator routing).*

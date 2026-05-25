---
artifact: plan-drafting-probe
artifact_id: sub-phase-common-cpp-bootstrap-plan-drafting
stage: plan-drafting
phase: 2
date: 2026-05-25T19-00-00Z
head_sha: <COMMIT-1-SHA — back-filled per Convention #12>
head_sha_at_checkpoint: a33cb0b21ea2b4cfba43aac6be26d847635cc843
verdict: CONFIRMED — charter dispatchable; common-cpp NOT MATURE confirmed; 6-stage bootstrap refined; D1-D6 ratified + D7-D14 surfaced
---

# Plan-drafting probe — `common-cpp-bootstrap` (Stack-C / Vulkan-C++ workspace surface)

PRECONDITION sub-phase enabling RD-2D-Stack-C (and future Stack-C ports). Matures
`common-cpp` at HEAD to provide the Runtime + Determinism + Capture socket analog
to common-warp's § 1.9.1, plus a real Vulkan **compute** substrate, HDF5
(capture-v1-compatible) capture, Mesa lavapipe deterministic pinning, and a CMake
build + CI surface. Mirrors `sub-phase-common-warp-bootstrap` structurally;
diverges per **D6** (CMake-not-uv), **D4** (lavapipe deterministic backend), **D5**
(new Vulkan/C++ quirks catalog).

This probe takes commit `8605a31` (the RD-2D-Stack-C precondition recommendation —
authored by this agent, now the AUTHORITATIVE scope source) as input, VERIFIES the
gap analysis at HEAD, REFINES it with probe-time web research (lavapipe + HDF5
vendoring), and commits to the charter (COMMIT 2). **Verdict: CONFIRMED** — the
6-stage decomposition holds with refinements; no structural blocker beyond the
already-surfaced common-cpp immaturity (which is the scope, not a Hard-Rule-2 STOP).

---

## § 1. Scope

- **What this sub-phase IS:** a focused-infrastructure bootstrap that matures
  `common/common-cpp/` (currently a Phase-1-Stage-1 scaffold) into a consumable
  Stack-C socket: executable Vulkan compute substrate, execution-enforced
  determinism (lavapipe-pinned), HDF5 capture-v1-compatible I/O, a Vulkan-compute
  smoke sim, `docs/common/cpp.md` de-scaffolded, CMake build + CI. Establishes the
  patterns the Stack-C per-sim ports (RD-2D item 2.1.C; sph-water/smoke/LBM Stack-C
  if routed) consume.
- **What it is NOT:** not a per-sim cross-stack port (no Phase-1 canonical, no
  gate-14 numeric verdict, no `equivalence.md`); not a Vulkan render/display surface
  (headless compute only — swapchain/present/ImGui stay declarations-only); not a
  GPU-backend certification (lavapipe CPU software-Vulkan is the determinism
  contract; real-GPU is future per-sim scope); not full HDF5/OpenVDB/Alembic/USD
  vendoring (only capture-v1 HDF5 lands; the export-hook stubs stay stubs).
- **Enabler relationship:** RD-2D-Stack-C plan-drafting HELD pending this
  precondition (commits `4f9e523`/`8605a31`/`f772f71`/`a33cb0b`). The held RD-2D-
  Stack-C probe refreshes against the matured common-cpp after this lands (D11).
- **Entering HEAD:** `a33cb0b` (RD-2D-Stack-C plan-drafting SHA back-fill), verified.
- **Cumulative shifts entering:** 223.

---

## § 2. Convention C / D / M / A discipline at HEAD

**Convention M.** All assertions grounded in files read at HEAD `a33cb0b`. Parent-doc
content anchors (**sha256 of content**, matching the common-warp-bootstrap charter
citation convention — NOT git-blob-sha1; see the § 17 correction):

| Anchor | sha256 @ HEAD `a33cb0b` |
|---|---|
| `docs/conventions/sub-phase-conventions.md` | `b0a0c241b797080dc58469775db346b2adc5561d7270a60d5a10052643e8445f` |
| `docs/conventions/cross-stack-equivalence-methodology.md` | `48fca78275a312f5c062faba863faa4122b713d06f271a9d6b4adc7e7b79043f` |
| `docs/architecture.md` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` |
| `docs/common/warp.md` | `63b440d607892998178037e8c54884c5c7c9f15ab52c30d6bf8f047a61374bf0` |
| `docs/phases/phase-2-cross-stack-replication.md` | `8b35d37925e84f016c1c54b2ff306d3d957b8730cc2405804aa2fbf8240fde93` |

**Convention C/D.** common-cpp surface (5 headers + 2 impls + smoke + tests +
CMakeLists) read at HEAD (verbatim — § 4); common-warp § 1.9.1 socket
(`__init__.py`, `runtime.py`, `determinism.py`, `capture/{writer,model}.py`) read as
the analog target; the canonical capture-v1 HDF5 layout read at
`tools/testkit/capture/writer.py` (§ 7, the format common-cpp must match).

**Convention #8.** lavapipe + HDF5-vendoring facts web-researched at probe time
(2026-05-25; § 6/§ 7); cited § 17. No common-cpp specific asserted from memory.

**Convention A.** This stage adds probe + charter (`docs/phases/`) + landing +
sha-back-fill; edits no source.

---

## § 3. Entering-state reconciliation + D1-D6 ratification

| Item | HEAD verification | Verdict |
|---|---|---|
| HEAD `a33cb0b` | `git rev-parse HEAD` | FACT |
| Cumulative shifts 223 | RD-2D-Stack-C landing close | FACT (entering baseline) |
| uv members = 23; REMAINS 23 post-bootstrap (D6) | common-cpp is CMake, not in `[tool.uv.workspace].members` | FACT |
| Architecture sha `e82b7b8e` (dispatch said "2aa8f227 post-S-RD2C2") | **CORRECTION** — `e82b7b8e` is sha256-of-content (unchanged); `2aa8f227` is the git-blob-sha1 of the SAME file; S-RD2C2 was a hash-function-mismatch false positive (§ 17) | SHIFTED — architecture.md NOT drifted |
| Bit-identity replay `9399fc33…718909f34` HELD | not re-run (doc-only additive); HELD as of RD-2D-Stack-C | INFERENCE |
| Integrity baseline `c19492ad…d22cb52` (0 HF / 14 SW) HELD | not re-run (doc-only additive) | INFERENCE |

**D1-D6 ratified by operator** (this probe verifies the leans, surfaces refinements):

- **D2 RATIFIED** — bootstrap precondition (not inline). common-cpp-bootstrap IS
  Phase-2 scope as the precondition the plan's "do NOT extend the common module in a
  port stage" rule presupposes a *mature* module for. VERIFIED — no contradiction.
- **D3 RATIFIED** — HDF5-vendor capture. **Refined (§ 7 / S-CPPB2):** the lighter
  path is system `libhdf5-dev` + header-only **HighFive** (FetchContent), NOT a full
  HDF5 FetchContent vendor (~25 MB / minute-class). Honest refinement of the lean.
- **D4 RATIFIED** — Mesa lavapipe deterministic backend. **Verified + sharpened
  (§ 6):** lavapipe is CPU-only conformant Vulkan 1.3 with compute; determinism via
  `LP_NUM_THREADS=0` + fixed Mesa/LLVM build; **`shaderFloat64` is UNDOCUMENTED on
  lavapipe → runtime-probe at Stage 0** (S-CPPB1). RD-2D's f32 reference makes
  f32-vs-f32 the right call (sidesteps the unverified fp64); f64 future Stack-C ports
  (sph-water/LBM f64) need the probe resolved.
- **D5 RATIFIED** — initiate a Vulkan/C++ quirks catalog (§ 10; § L.6 O-W7 is
  Warp-only).
- **D6 RATIFIED** — CMake-not-uv registration; uv count stays 23 (§ 9; honest
  divergence from common-warp-bootstrap's 20th-uv-member precedent).

---

## § 4. common-cpp maturity gap→deliverable map (item a — refined from `8605a31`)

Re-verified at HEAD; the `8605a31` gap analysis HOLDS. Refined map (gap → concrete
deliverable → stage):

| Socket gap (vs common-warp § 1.9.1) | common-cpp @ HEAD | Bootstrap deliverable | Stage |
|---|---|---|---|
| Runtime / **executable compute substrate** | `vulkan_init.hpp` declarations-only, render-oriented; no compute | Headless Vulkan compute: instance + device + compute queue + command buffers + descriptor sets + compute pipeline + SPIR-V module load + buffer alloc/upload/readback + fence/timeline sync (§ 5) | 1a |
| Determinism (execution-enforced) | `Config` struct + argv parser | `assert_deterministic_run` analog (2-run output-digest harness) + FloatControls/`NoContraction` discipline + lavapipe pinning (§ 6, § 8) | 1b |
| Capture (compare-ready) | `raw-binary-v1`, not HDF5 | HighFive HDF5 writer/reader replicating the **testkit capture-v1 layout** (`/steps/{N}/state|diagnostics`, `/metadata` attrs, JSON sidecar) so `compare_captures` reads it unchanged (§ 7) | 1b |
| Data structures / harness | none | OPTIONAL — socket-only posture (sims roll their own buffers, per warp.md § 6.1 f64/f32 principle); minimal 2D-field helper only if the smoke needs it | 1a/1c |
| Smoke consumer | `advection_1d.cpp` is host-C++, never touches Vulkan | A **Vulkan-compute** 2D advection-diffusion smoke on lavapipe, exercising substrate + determinism + HDF5 capture; bounded/stable trajectory (§ L.4 S6-bootstrap analog) | 1c |
| Vulkan/C++ quirks catalog | none (§ L.6 Warp-only) | New conventions catalog seeded from Stage-0/1 discoveries (§ 10) | 2 |
| Docs | `cpp.md` is scaffold-framed ("Out of scope this stage") | De-scaffold `docs/common/cpp.md` (f32/f64 + lavapipe + FloatControls framing) (§ 14) | 1c |
| Build / CI | no top-level CMake registration; no C++ CI job | Top-level CMake aggregation (D6) + new C++ CI workflow (lavapipe; § 9) | 1a / 1c-2 |

**No additional blocking gaps surfaced** beyond `8605a31`. Two scope *additions*
surfaced by research: a **SPIR-V compilation toolchain** (glslang/glslc; § 5 /
S-CPPB4) and a **new C++ CI workflow** (§ 9; no existing workflow references C++).

---

## § 5. Vulkan compute substrate scope (item b)

**Lean: MVP headless-compute substrate** — the minimum to dispatch a deterministic
element-wise/stencil kernel and read its output back, extensible for future Stack-C
ports. Components (all currently absent / declarations-only):

1. `VkInstance` (validation optional, off in CI for determinism); physical-device
   select (lavapipe); `VkDevice` + a **compute** queue (no graphics/present queue).
2. `VkCommandPool` + command buffers; `VkDescriptorPool` + descriptor set layout +
   sets (the `DescriptorAllocator` decl gets a body).
3. **Compute pipeline** + `VkShaderModule` from SPIR-V; push-constants for small
   params.
4. Buffers: host-visible staging + device-local; upload (IC) / readback (capture);
   `VkDeviceMemory` alloc (or VMA — lean: hand-rolled minimal allocator, no VMA dep
   for MVP).
5. Dispatch (`vkCmdDispatch`) + synchronization (fences; timeline semaphores already
   in `DeviceConfig`).
6. **SPIR-V toolchain (NEW — S-CPPB4):** GLSL compute shaders compiled to SPIR-V via
   `glslangValidator`/`glslc` at build time (CMake custom command), OR checked-in
   SPIR-V. Lean: build-time compile, pin the compiler version. `NoContraction`/
   `precise` discipline applied in-shader (§ 6).

**Explicitly OUT (headless):** swapchain, surface, present-mode, ImGui — the
`vulkan_init.hpp` render surfaces stay declarations-only. RD-2D and the other Stack-C
sims are headless compute; the display surface is a later/optional concern.

---

## § 6. Mesa lavapipe pinning + determinism (item c — web-researched)

- **lavapipe** = Mesa's CPU software Vulkan ICD (reuses the llvmpipe LLVM backend);
  conformant Vulkan 1.3 (1.4 exposed-not-certified); **compute fully supported**;
  CPU-only. SPIR-V → NIR → LLVM → x86.
- **Determinism lever:** `LP_NUM_THREADS=0` forces single-thread (the determinism
  knob). For a **no-atomics element-wise/stencil kernel** (RD-2D Gray-Scott),
  per-element FP is order-independent even multithreaded; `LP_NUM_THREADS=0` removes
  residual doubt. **Same host + same Mesa/LLVM build → bit-reproducible run-to-run**
  (high confidence). **Cross-build / cross-CPU is NOT byte-guaranteed** (LLVM
  auto-vectorization / FMA) — same posture as the project's Warp/NumPy op-order
  notes. Mitigate cross-host with `GALLIUM_OVERRIDE_CPU_CAPS` / `LP_NATIVE_VECTOR_WIDTH`
  if needed; the determinism CONTRACT is **same-host-same-build** (matches the
  bit-exact-same-hw posture).
- **FMA contraction** is ON by default in SPIR-V (`AllowContract`) → kernels must be
  `NoContraction`/`precise`-decorated to match NumPy (which does not FMA-fuse).
- **`shaderFloat64`: UNDOCUMENTED on lavapipe → runtime-probe at Stage 0** (S-CPPB1;
  R-CPPB1). RD-2D is f32 → f32-vs-f32 is the determinism contract for THIS bootstrap;
  f64 is a banked future-port concern.
- **Pinning / selection:** apt `mesa-vulkan-drivers` (ships the lavapipe ICD);
  select with `VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json`
  (`VK_ICD_FILENAMES` is the deprecated alias). Mesa 25.x current (2026). CI:
  commonly available on GitHub Actions Ubuntu (`apt install mesa-vulkan-drivers
  vulkan-tools`); `vulkaninfo` confirms selection. Stage-0 verifies the CI recipe.

**Determinism baseline digest (the W-2 `24d44c7e…` analog — to be ESTABLISHED at
Stage 0, NOT asserted now):** a minimal ephemeral compute shader (e.g. a fill/saxpy)
dispatched 2× on lavapipe `LP_NUM_THREADS=0` → sha256 of the readback buffer;
run-to-run bit-identity = the C-stack determinism anchor.

---

## § 7. HDF5 strategy + capture-v1 layout match (item d — web-researched)

- **Library (D3 refined):** HighFive (header-only, C++14, Boost license; prefer the
  `highfive-devs/highfive` fork — BlueBrain wound down Dec 2024) over the HDF5 C API.
  HighFive still needs libhdf5 underneath → **system `libhdf5-dev` + FetchContent
  header-only HighFive** is the lighter path (avoids the ~25 MB / minute-class full
  vendor). Vendor a stripped HDF5 only if hermeticity is later required.
- **The format target is the testkit capture-v1 layout** (read at HEAD,
  `tools/testkit/capture/writer.py`) — NOT "common-warp's HDF5" loosely (common-warp
  *delegates* to this same testkit writer; it does not hand-roll h5py). common-cpp's
  HighFive writer must replicate:
  - groups `/steps/{N}/state/{field}` + `/steps/{N}/diagnostics/{check}` datasets;
    `/metadata` group with attrs `schema_version`, `sim_name`, `sim_category`,
    `sim_variant`, `stack_name`, `seed` (int).
  - determinism flags: `libver="earliest"`, link-creation-order tracking OFF
    (`track_order=False` analog), object-mtime OFF (`track_times=False` analog) —
    HighFive/HDF5 property-list equivalents (R-CPPB4 — verify these are reachable).
  - sidecar `<descriptor>.json` manifest (spec § 2.7 schema), `sort_keys=True`,
    `indent=2`, `payload.path` = `<descriptor>.h5`, `payload.checksum` =
    `"sha256:" + sha256(<h5 file>)`.
- **Bit-faithfulness:** pin file datatypes `H5T_IEEE_F32LE` / `F64LE`, **contiguous
  unfiltered** layout (no chunking/compression/shuffle).
- **Compatibility bar (lowered — key clarification):** `compare_captures` compares
  **parsed arrays, not raw file bytes** (testkit writer.py docstring). So
  byte-identical `.h5` containers across the C++/Python HDF5 libraries are **NOT
  required** — only that the **testkit Python reader parses common-cpp's `.h5` into
  the same arrays**. The C-6 gate is a **cross-language round-trip** (C++ HighFive
  write → Python testkit read → `compare_captures` produces a verdict), = the
  format-interoperability analog of common-warp's W-5 (D8 precedent).

---

## § 8. Determinism socket analog API (item e)

common-warp: `set_seed`/`get_seed`/`set_warp_deterministic`/`deterministic_context`/
`assert_deterministic_run(sim_fn, runs=2, tolerance=0.0)`. C++ analog (lean):

```cpp
namespace bit_physics::common_cpp::determinism {
  // existing: Config{bool deterministic; uint64 seed}; from_args(...)
  // NEW socket:
  struct DeterministicContext { /* pins LP_NUM_THREADS=0 posture, FloatControls,
                                   selected lavapipe device; RAII restore */ };
  // run sim_fn twice, digest the capture/output buffer each run, assert bit-identity
  bool assert_deterministic_run(const std::function<Capture()>& sim_fn,
                                int runs = 2);  // tolerance=0 → bit-identity
}
```

The structural determinism guarantee (the common-warp serial-CPU-launch analog) is
**lavapipe `LP_NUM_THREADS=0` + `NoContraction` shaders + fixed Mesa/LLVM build**
(§ 6). The 2-run harness digests the readback buffer (or the written `.h5`'s extracted
dataset bytes) and asserts equality — the C-stack form of `run_twice_and_diff`.

---

## § 9. CMake build system + CI (items f, j)

- **D6 — CMake-not-uv.** common-cpp registers via CMake target
  (`bit_physics::common_cpp`) + a **top-level CMake aggregation** (currently absent —
  `cpp.md` defers it to "Stage 3"; the bootstrap's Stage 1a owns it). It is **NOT** a
  uv workspace member → uv count **stays 23**. `compare_captures` reads common-cpp's
  `.h5` via the existing Python testkit reader (no C++↔Python build interop needed —
  the `.h5` file is the interop boundary).
- **CI (NEW — R-CPPB6):** no existing `.github/workflows/*` references C++/CMake/
  Vulkan (8 workflows, all Python/TS/integrity). The bootstrap adds a **`cpp-strict`
  (or similar) workflow**: `apt install mesa-vulkan-drivers vulkan-tools libhdf5-dev`,
  `cmake -S common/common-cpp -B build`, `ctest`, with
  `VK_DRIVER_FILES=…/lvp_icd.x86_64.json` + `LP_NUM_THREADS=0`. Stage-0 verifies the
  runner has lavapipe; Stage-1c/2 lands the workflow.

---

## § 10. Vulkan/C++ quirks catalog seed (item g — D5)

§ L.6 O-W7 is Warp-specific. A **new Vulkan/C++ quirks catalog** is needed. **Lean:
a new `§ L.9` (or `§ L`-sibling) in `sub-phase-conventions.md`**, attributed to
`sub-phase-common-cpp-bootstrap` (per-sub-phase-attribution, like § L.6 = MPM-E).
Seed entries (from probe-time research; formalized at Stage 2 with empirical
findings):

- **Q-CPP1 — FMA contraction ON by default** (SPIR-V `AllowContract`); decorate
  kernels `NoContraction`/GLSL `precise` to match a non-FMA NumPy reference.
- **Q-CPP2 — `shaderFloat64` device-dependent** (undocumented on lavapipe);
  runtime-probe before any f64 kernel.
- **Q-CPP3 — division is 2.5-ULP, not correctly-rounded**; multiply by reciprocal
  constants instead of `/` for bit-faithfulness.
- **Q-CPP4 — `LP_NUM_THREADS=0` for lavapipe determinism**; cross-build FP not
  byte-guaranteed (LLVM vectorization) — pin Mesa/LLVM.
- **Q-CPP5 — HDF5 determinism flags** (`libver=earliest`, link-order off, mtime off)
  must be set via HighFive property lists to match testkit captures.

---

## § 11. 6-stage decomposition refinement (item h)

The `8605a31` 6-stage sketch HOLDS. Refined (charter § 2 commits):

| Stage | Refined scope | Gate(s) |
|---|---|---|
| plan-drafting | probe + charter + landing + sha-back-fill (this chain) | — |
| **Stage 0** | replay re-anchor; lavapipe install + version-pin verify + CI-availability check; **shaderFloat64 runtime-probe** (S-CPPB1); SPIR-V toolchain (glslang) verify; **determinism baseline digest** establish (§ 6); FloatControls capability probe; § N scope-analysis | C-0 pre-flight |
| **Stage 1a** | Vulkan compute substrate (§ 5) + SPIR-V toolchain wiring + top-level CMake registration (D6) | C-3 substrate |
| **Stage 1b** | Determinism socket (§ 8) + HighFive HDF5 capture-v1 writer/reader (§ 7) | C-1 capture, C-2 determinism |
| **Stage 1c** | § 1.9.1-cpp socket reconciliation + Vulkan-compute smoke (§ 4) + `docs/common/cpp.md` de-scaffold (§ 14) + cross-language format-interop check + C++ CI workflow | C-4 smoke, C-5 docs, C-6 format-interop |
| **Stage 2** | landing: regression, integrity baseline-MATCH, replay HELD, Vulkan/C++ quirks catalog formalization (§ 10), CHANGELOG, roll-up | C-7 integrity |

**Sequencing note (R-CPPB9):** the Stage-0 determinism baseline digest needs a
*minimal* compute dispatch — a chicken/egg with the Stage-1a substrate. Resolved by
an **ephemeral minimal dispatch at Stage 0** (a throwaway fill/saxpy, the R-A1-anchor
analog), separate from the production substrate built at 1a — mirrors the Warp
Stage-0 ephemeral-kernel → Stage-1a production-kernel chain (§ L.7 O-2).

---

## § 12. Inheritance of amendment sets + § 6.8 non-inheritance (item i)

- **§ L.4 (S6-trajectory):** the W-3/C-4 smoke must be **stable bounded by design**
  (2D advection-diffusion, diffusion-dominated/decaying — the laminar bootstrap
  analog, like common-warp's hello sim); verify max-field bounded.
- **§ L.5 (socket-reconciliation Option B):** directly relevant — the § 1.9.1-cpp
  socket is reconciled to a verbatim contract at Stage 1c before any consumer.
- **§ L.6 (O-W7):** Warp-only; does NOT apply → § 10 initiates the Vulkan/C++ sibling.
- **§ L.7 (O-1 taxonomy + O-2 four-checkpoint chain):** O-2 chain pattern ports
  (Stage-0 ephemeral digest → Stage-1a substrate reproduces → Stage-1b 2-run → … );
  bootstrap has no gate-14 (not a per-sim port), so the chain's checkpoint-4 is the
  per-sim RD-2D-Stack-C's, not the bootstrap's.
- **§ L.8 (R-P2-not-portable; resolution-dependence):** forward-looking for the
  Stack-C ports; not exercised at bootstrap (no canonical).
- **Methodology § 6.8 (Warp-CPU-f64↔NumPy n=2):** EXPLICITLY does NOT inherit to the
  Vulkan/C++↔NumPy backend pair (different pair; FMA-default, optional/undocumented
  fp64). The Stack-C backend-pair property is established empirically at the per-sim
  ports, not assumed.

---

## § 13. Test harness scope (item k)

- `tests/test_vulkan_substrate.cpp` — instance/device/dispatch/readback smoke (C-3).
- `tests/test_determinism.cpp` (extend) — `assert_deterministic_run` 2-run
  bit-identity on lavapipe (C-2).
- `tests/test_capture_hdf5.cpp` — HighFive round-trip of the capture-v1 layout (C-1).
- **Cross-language format-interop** (C-6): a Python testkit test reading a common-cpp-
  emitted `.h5` via the testkit reader + `compare_captures` → verdict. Lives in the
  Python testkit (the reader side), exercised in the C++ CI after the C++ build emits
  a sample `.h5`.
- doctest stays the C++ framework (already vendored v2.4.11).

---

## § 14. docs/common/cpp.md decision (item l)

**YES — de-scaffold `docs/common/cpp.md` at Stage 1c.** It currently lists "Out of
scope this stage: full HDF5 vendoring / working Vulkan device-init body / top-level
CMake registration" — all of which the bootstrap LANDS. The de-scaffold mirrors the
warp.md f64/f32-principle framing, translated: "Vulkan compute is **f32-default**;
`shaderFloat64` is **optional + lavapipe-undocumented**; determinism is **lavapipe
`LP_NUM_THREADS=0` + `NoContraction` + fixed Mesa/LLVM build** (same-host-same-build
bit-exact); cross-stack equivalence with NumPy is a **backend-pair empirical** matter
(§ 6.8 does not pre-grant it)." Also resolves **B-RD2C1** (the dangling
`_staging/deps.md` reference) — either create the deps file or drop the reference.

---

## § 15. Risk register (R-CPPB*)

| ID | Risk | Disposition |
|---|---|---|
| R-CPPB1 | lavapipe `shaderFloat64` undocumented | f32-vs-f32 for RD-2D (sidesteps); runtime-probe Stage 0; f64 future-port concern banked. |
| R-CPPB2 | cross-build/cross-CPU lavapipe FP not byte-guaranteed (LLVM vectorize/FMA) | determinism contract = same-host-same-build; `LP_NUM_THREADS=0` + pin Mesa/LLVM + optional `GALLIUM_OVERRIDE_CPU_CAPS`. Same posture as Warp/NumPy op-order. |
| R-CPPB3 | SPIR-V FMA contraction ON by default | `NoContraction`/`precise` in shaders (Q-CPP1). |
| R-CPPB4 | HDF5 layout must match testkit capture-v1 (cross-language C++→Python read); determinism property-lists reachable in HighFive | C-6 round-trip gates it; verify HighFive exposes link-order/mtime/libver controls; bar is parse-equality not byte-equality (§ 7). |
| R-CPPB5 | Vulkan substrate scope underestimate (large surface) | MVP headless-compute only (§ 5); Stage-1a focus; no swapchain/render. |
| R-CPPB6 | no C++ CI exists; lavapipe CI availability + pin | Stage-0 verify runner; Stage-1c/2 add `cpp-strict` workflow. |
| R-CPPB7 | SPIR-V toolchain (glslang/glslc) new build dep | Stage-0 verify; pin compiler; build-time GLSL→SPIR-V (S-CPPB4). |
| R-CPPB8 | HDF5 build cost (~25 MB / minute vendor) | system `libhdf5-dev` + header-only HighFive (D3 refined; § 7). |
| R-CPPB9 | determinism-baseline chicken/egg (needs a dispatch before the substrate) | ephemeral minimal Stage-0 dispatch, separate from 1a production substrate (§ 11; § L.7 O-2 analog). |
| R-CPPB10 | uv-tooling regression from a non-uv member | none expected — common-cpp is outside the uv workspace; `uv sync --all-packages` unaffected (the cat4-hook `.venv`-prune memory item is uv-only). |

---

## § 16. D-class enumeration (D1-D6 ratified; D7-D14 surfaced)

| D | Question | Lean / status |
|---|---|---|
| D1 | Sub-phase name | `sub-phase-common-cpp-bootstrap` — RATIFIED. |
| D2 | Bootstrap precondition vs inline | bootstrap — RATIFIED. |
| D3 | HDF5 strategy | system `libhdf5-dev` + header-only HighFive (FetchContent), `highfive-devs` fork — RATIFIED+refined. |
| D4 | Deterministic backend | lavapipe pinned; `LP_NUM_THREADS=0`+`NoContraction`; f32-vs-f32 — RATIFIED+sharpened. |
| D5 | Vulkan/C++ quirks catalog | new `§ L.9` in conventions — RATIFIED. |
| D6 | Registration | CMake target + top-level aggregation; uv stays 23 — RATIFIED. |
| D7 | `docs/common/cpp.md` de-scaffold | YES (§ 14). |
| D8 | HDF5 lib choice detail | HighFive (Boost; `highfive-devs`) over HDF5 C API. |
| D9 | SPIR-V toolchain | glslang/glslc build-time GLSL→SPIR-V; pin compiler. |
| D10 | Gate naming | C-Gates C-0..C-7 (C-stack analog of W-Gates). |
| D11 | Next after bootstrap | RD-2D-Stack-C plan-drafting REFRESH (held probe `f772f71` re-runs against mature common-cpp). |
| D12 | Non-phase tag | NO TAG (standing). |
| D13 | Determinism baseline-digest method | minimal ephemeral compute dispatch ×2 on lavapipe `LP_NUM_THREADS=0` → sha256 of readback buffer (§ 6 / § 11). |
| D14 | lavapipe selection mechanism | `VK_DRIVER_FILES` + `LP_NUM_THREADS=0`; pinned `mesa-vulkan-drivers`. |

---

## § 17. Discrepancies, observations, web-fetch citation

**S-RD2C2 CORRECTION (load-bearing — Convention #8/E/F).** The RD-2D-Stack-C probe
recorded "S-RD2C2: architecture-sha drift `e82b7b8e` → `2aa8f227`." This was a
**hash-function-mismatch false positive**: `e82b7b8e4cc8…` is the **sha256 of
`docs/architecture.md` content** (the value the dispatch + the common-warp-bootstrap
charter cite); `2aa8f227…` is the **git-blob-sha1** of the *same, unchanged* file
(`git rev-parse HEAD:docs/architecture.md`). Two hash functions of one file —
incomparable. **`docs/architecture.md` did NOT drift**; its sha256 is `e82b7b8e…`
now and was `e82b7b8e…` entering RD-2D-Stack-C. The committed RD-2D-Stack-C landing
(`f772f71`) cannot be rewritten (append-only); this correction is surfaced here and
**banked for the cleanup sub-phase** (B-CPPB1). Lesson → Q-CPP-adjacent convention
note: **cite sha256-of-content for doc anchors (the project convention), never mix
with `git rev-parse` blob hashes.**

**Web-fetch (Convention #8; 2026-05-25):** Mesa lavapipe (CPU Vulkan 1.3, compute,
`LP_NUM_THREADS=0`, `VK_DRIVER_FILES`, `GALLIUM_OVERRIDE_CPU_CAPS`, `shaderFloat64`
undocumented), Mesa 25.x; HighFive (header-only, Boost, `highfive-devs` fork, needs
libhdf5), HDF5 `H5T_IEEE_F32LE/F64LE` + contiguous-unfiltered + compare-extracted-
bytes. Sources: docs.mesa3d.org (llvmpipe, envvars), Vulkanised-2025 lavapipe talk,
Phoronix (lavapipe Vulkan 1.4), github HighFive + discussion #741, HDF Group
datatype/chunking docs.

**Observations:**
- **O-CPPB1** — no `.github/workflows/*` references C++/CMake/Vulkan (8 workflows,
  all Python/TS/integrity) → a new C++ CI workflow is net-new bootstrap scope (§ 9).
- **O-CPPB2** — `compare_captures` compares parsed arrays not raw bytes (testkit
  writer.py) → the C-6 format-interop bar is parse-equality, not `.h5` byte-identity
  (§ 7). Lowers the cross-language HDF5 risk materially.
- **O-CPPB3** — common-warp's capture writer DELEGATES to the testkit `capture`
  module (does not hand-roll h5py) → common-cpp's HDF5 target is the **testkit
  capture-v1 layout**, the single source of truth both Python stacks already use.

---

*Probe close. Verdict CONFIRMED — charter (COMMIT 2) dispatchable; 6-stage
decomposition refined; D1-D6 ratified, D7-D14 surfaced; no Hard-Rule-2 blocker.*

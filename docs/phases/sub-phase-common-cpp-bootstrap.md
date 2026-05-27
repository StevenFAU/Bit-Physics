# common-cpp Bootstrap — Sub-Phase Charter (Stack-C / Vulkan-C++ workspace surface)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — focused-infrastructure sub-phase maturing the Stack-C (C++ / Vulkan) workspace surface before the Stack-C per-sim cross-stack ports (RD-2D item 2.1.C; sph-water / smoke / LBM Stack-C if routed) consume it. Structurally mirrors `sub-phase-common-warp-bootstrap` (which did the same for Stack-E / common-warp). This is NOT a per-sim implementation sub-phase. This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries. No `-phase-N` tag is proposed (D12).
> **Sub-phase identity:** the PRECONDITION surfaced at `sub-phase-reaction-diffusion-2d-stack-c` plan-drafting (commit `8605a31`, the precondition recommendation), now operator-routed. RD-2D-Stack-C plan-drafting is HELD pending this sub-phase landing (commits `4f9e523` / `8605a31` / `f772f71` / `a33cb0b`).
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` §§ 4.3 (Stack C / Vulkan), 11.2 item 1.8 (common-cpp matures in Phase 1 "at minimum"), 11.3 item 2.1.C (RD-2D → Stack C), 2.7 (capture manifest schema), 2.5 (determinism harness), 7.12 (phase-tag form). phase-2 plan § 2.4 (Stage 1 — RD-2D → Stack C), the row-2.1.C "consumes common-cpp" + "do NOT extend the common module in a port stage" rule (this bootstrap is the precondition that rule presupposes).
> **Parent conventions doc** (authoritative for every spec-Phase-2 sub-phase): `docs/conventions/sub-phase-conventions.md` (sha256 `b0a0c241b797080dc58469775db346b2adc5561d7270a60d5a10052643e8445f` at HEAD `a33cb0b`). Inherits role model, append-only discipline, checkpoint discipline, Convention #12 SHA back-fill, replay-chain non-participation, FACT/INFERENCE/SHIFTED tagging, § L.4–§ L.8 amendment sets, § N canonical-descriptor scope-analysis — by REFERENCE, not re-stated.
> **Parent methodology doc:** `docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `48fca78275a312f5c062faba863faa4122b713d06f271a9d6b4adc7e7b79043f` at HEAD). § 6.8's Warp-CPU-f64↔NumPy backend-pair observation EXPLICITLY does NOT inherit to the Vulkan/C++↔NumPy pair (different backend pair).
> **Parent sub-phase template** (structure inheritance): `docs/phases/sub-phase-common-warp-bootstrap.md` (the focused-infrastructure sister; the closest structural analog) + its landing `docs/_audits/phase-2/sub-phase-common-warp-bootstrap/landing-2026-05-24T22-15-00Z.md`.
> **Plan-drafting probe** (load-bearing source-of-truth pass): `docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/plan-drafting-probe-2026-05-25T19-00-00Z.md`.
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - 7 spec-Phase-2 cross-stack ports landed (4 Stack-D Taichi: rd2d / sph-water / lbm / mpm; 3 Stack-E Warp: mpm / smoke / lbm); common-warp-bootstrap landed (the Stack-E analog of this sub-phase).
> - Bit-identity replay invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` HELD (reverify Stage 0).
> - Integrity sweep baseline `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` byte-identical streak HELD into 17th sub-phase entering (reverify Stage 0).
> **Inherited shifts:** **223 documented entering** (FACT — RD-2D-Stack-C landing close). Carried by reference.
> **Vulkan/lavapipe/HDF5 upstream (FACT — Convention #8 web-fetch 2026-05-25; reverify at Stage 0 install):** Mesa **25.x** (lavapipe = CPU software Vulkan 1.3-conformant ICD with compute; `LP_NUM_THREADS=0` determinism lever; `VK_DRIVER_FILES` selection; `shaderFloat64` UNDOCUMENTED → runtime-probe). **HighFive** (header-only C++14, Boost license, `highfive-devs/highfive` fork; needs libhdf5). SPIR-V compute via glslang/glslc.
> **Date drafted:** 2026-05-25.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator after D7–D14 routing (D1–D6 ratified at dispatch).

---

## § 1. Scope

**What this sub-phase IS.** A focused-infrastructure bootstrap that matures
`common/common-cpp/` — currently a Phase-1-Stage-1 scaffold (declarations-only Vulkan,
`raw-binary-v1` capture, `Config`-struct determinism) — into a consumable Stack-C
socket: (1) an executable headless **Vulkan compute** substrate; (2) execution-enforced
determinism pinned to Mesa **lavapipe** (`LP_NUM_THREADS=0` + `NoContraction` + fixed
Mesa/LLVM build); (3) HDF5 capture I/O replicating the testkit **capture-v1** layout so
`compare_captures` reads common-cpp captures unchanged; (4) a Vulkan-compute smoke sim;
(5) a de-scaffolded `docs/common/cpp.md`; (6) top-level CMake aggregation + a C++ CI
workflow. It establishes the patterns the Stack-C per-sim ports consume.

**What this sub-phase is NOT.** Not a per-sim cross-stack port (no Phase-1 canonical, no
gate-14 numeric verdict, no `equivalence.md`). Not a Vulkan render/display surface
(swapchain / present-mode / ImGui stay declarations-only — headless compute only). Not a
real-GPU certification (lavapipe CPU software-Vulkan is the determinism contract; real
GPU is per-sim-port future scope). Not full HDF5 / OpenVDB / Alembic / USD vendoring
(only capture-v1 HDF5 lands; export-hook stubs stay `throw std::logic_error` stubs). Not
an f64 guarantee (RD-2D is f32; f32-vs-f32 is the bootstrap contract; `shaderFloat64` is
runtime-probed and banked for f64 future ports).

**Enabler relationship.** RD-2D-Stack-C plan-drafting is HELD pending this precondition
(the held probe `f772f71` refreshes against the matured common-cpp — D11). The Stack-C
ports become dispatchable only after this sub-phase lands.

## § 2. Stage decomposition (D2-adjacent; 6-stage — operator confirms at Stage-0 scope-analysis)

Mirrors common-warp-bootstrap's plan-drafting + Stage-0 + Stage-1(a/b/c) + Stage-2 shape;
refined per probe § 11. The Vulkan-compute substrate is a larger from-scratch surface
than common-warp's Python subsystems, so the 1a/1b/1c split is the lean.

| Stage | Content | Gate(s) |
|---|---|---|
| **Plan-drafting** | probe + this charter + plan-drafting landing + SHA back-fill (this chain). | — |
| **Stage 0 — pre-flight** | Task 0.0 replay re-anchor; 0.1 lavapipe install + Mesa version-pin verify + CI-availability; 0.2 **shaderFloat64 runtime-probe** (R-CPPB1); 0.3 SPIR-V toolchain (glslang/glslc) verify; 0.4 **determinism baseline digest** — minimal ephemeral compute dispatch ×2 on lavapipe `LP_NUM_THREADS=0` → sha256 of readback buffer, run-to-run bit-identity (the W-2 `24d44c7e…` analog; R-CPPB9 ephemeral-not-production); 0.5 FloatControls capability probe; 0.6 § N scope-analysis. | C-0 |
| **Stage 1a** | Vulkan compute substrate (instance / device / compute queue / command buffers / descriptor sets / compute pipeline / SPIR-V module / buffer alloc-upload-readback / fence sync) + SPIR-V build-time toolchain + **top-level CMake registration** (D6). | C-3 |
| **Stage 1b** | Determinism socket (`assert_deterministic_run` analog + `DeterministicContext` RAII + FloatControls/`NoContraction` discipline) + HighFive HDF5 capture-v1 writer/reader (probe § 7). | C-1, C-2 |
| **Stage 1c** | § 1.9.1-cpp socket reconciliation + Vulkan-compute 2D advection-diffusion smoke (bounded/stable — § L.4) + `docs/common/cpp.md` de-scaffold + cross-language format-interop check + C++ CI workflow. | C-4, C-5, C-6 |
| **Stage 2 — landing** | cross-package regression; integrity sweep baseline-MATCH (extend the streak); bit-identity replay; Vulkan/C++ quirks catalog formalization (§ L.9); CHANGELOG + project-state; landing audit; SHA back-fill. | C-7 |

Operator may collapse 1a/1b/1c if Stage-0 scope-analysis shows containment; the split is
the lean given the from-scratch Vulkan surface.

## § 3. Acceptance criteria (C-Gates 0-7 — D10; the W-Gate analog for Stack-C)

| Gate | Acceptance criterion | Verification surface |
|---|---|---|
| **C-0 Pre-flight** | lavapipe selected + compute dispatch runs headless; determinism baseline digest established + run-to-run bit-identical; shaderFloat64 probed; SPIR-V toolchain present. | Stage-0 evidence file (digest sha256; `vulkaninfo` lavapipe selection). |
| **C-1 Capture I/O** | HighFive writer emits the capture-v1 layout (`/steps/{N}/state\|diagnostics`, `/metadata` attrs, JSON sidecar `sort_keys`); round-trips. | `tests/test_capture_hdf5.cpp` — write → read-back → field+manifest equality. |
| **C-2 Determinism** | `assert_deterministic_run(runs=2)` bit-identical on lavapipe `LP_NUM_THREADS=0` + `NoContraction` shaders. | `tests/test_determinism.cpp`; 2-run readback-digest equality (D4 / D13). |
| **C-3 Vulkan compute substrate** | instance/device/compute-queue/pipeline/buffer-IO/dispatch/readback runs end-to-end headless on lavapipe. | `tests/test_vulkan_substrate.cpp`. |
| **C-4 Smoke simulator** | Vulkan-compute 2D advection-diffusion exercises substrate + determinism + HDF5 capture; **stable bounded trajectory** (§ L.4 S6-bootstrap analog; max-field bounded). | smoke target + a test asserting capture written + bounded. |
| **C-5 Public API documented** | `docs/common/cpp.md` de-scaffolded; Cat-2 contract verification passes. | `docs/common/cpp.md`; integrity Cat-2. |
| **C-6 Cross-stack format-interop** | the **Python testkit reader** parses a common-cpp-emitted `.h5`; `compare_captures` produces a verdict (format-interoperability = pass; numeric equivalence is per-sim-port scope, per common-warp W-5 / D8). | Python testkit test reading the C++-emitted `.h5` in the C++ CI job. |
| **C-7 Integrity gates green** | Cat-1 (citations), Cat-2 (contracts), Cat-4 (draft-time) pass; integrity sweep stays baseline-MATCH (`c19492ad…d22cb52`). | `uv run python -m integrity … --all --mode strict`. |

## § 4. Touch set per stage (additive — Convention A)

**Stage 1 creates / matures** (within the existing `common/common-cpp/`):
```
common/common-cpp/
├── CMakeLists.txt                 # mature: HighFive + libhdf5 + SPIR-V build rules + Vulkan compute lib
├── include/bit_physics/common/
│   ├── vulkan_compute.hpp         # NEW — compute substrate (instance/device/queue/pipeline/buffer/dispatch)
│   ├── determinism.hpp            # mature: + DeterministicContext + assert_deterministic_run
│   └── capture.hpp                # mature: + HDF5 (HighFive) writer/reader for capture-v1 layout
├── src/{vulkan_compute,determinism,capture}.cpp   # bodies
├── shaders/                       # NEW — GLSL compute shaders → SPIR-V (glslang build-time)
├── smoke/advection_diffusion_2d.cpp   # NEW — Vulkan-compute smoke (replaces/augments host-C++ advection_1d)
└── tests/{test_vulkan_substrate,test_determinism,test_capture_hdf5}.cpp
```
Plus (additive, existing-file or new):
- top-level CMake aggregation registering `bit_physics::common_cpp` (D6; currently absent).
- `.github/workflows/cpp-strict.yml` — NEW (lavapipe + cmake + ctest; § 9 of probe).
- `docs/common/cpp.md` — de-scaffold (C-5; resolves the dangling `_staging/deps.md` ref, B-RD2C1).
- `docs/conventions/sub-phase-conventions.md` § L.9 — NEW Vulkan/C++ quirks catalog (D5; Stage 2).
- a Python testkit test (cross-language read of a C++-emitted `.h5`; C-6).

**Stage 2 creates/edits (additive):** `CHANGELOG.md` entry; `docs/project-state.md` row;
landing audit + evidence + SHA back-fill.

> **Doc-truth note (added 2026-05-27, cleanup § 13 #26 / B-CPPB2).** `docs/project-state.md`
> was **never adopted** project-wide — it was specced in the early convergence-file model
> (alongside `CHANGELOG.md` + `tolerance.toml`) but no such file exists at any HEAD. Sub-phase
> status is tracked instead in the **landing audit** under `docs/_audits/<phase>/<sub-phase>/`
> plus the per-phase ledger (e.g. `docs/_audits/phase-0/ledger.md`). This "project-state.md row"
> line is a historical planning artifact superseded by this sub-phase's landing audit; the same
> stale mention recurs in sibling charters (`docs/phases/sub-phase-common-warp-bootstrap.md`,
> `docs/phases/phase-2-cross-stack-replication.md`) and is correctly guarded as "if present" in
> the unexecuted `docs/phases/phase-5-productization.md`.

**Explicitly NOT touched:** root `pyproject.toml [tool.uv.workspace].members` (D6 —
common-cpp is CMake, not a uv member; count stays 23).

## § 5. Risk surface (R-CPPB* — full register in probe § 15)

- **R-CPPB1** lavapipe `shaderFloat64` undocumented → f32-vs-f32 for RD-2D; runtime-probe Stage 0; f64 future-port banked.
- **R-CPPB2** cross-build/cross-CPU lavapipe FP not byte-guaranteed (LLVM vectorize/FMA) → contract = same-host-same-build; `LP_NUM_THREADS=0` + pin Mesa/LLVM (+ optional `GALLIUM_OVERRIDE_CPU_CAPS`). Same posture as Warp/NumPy op-order.
- **R-CPPB3** SPIR-V FMA contraction ON by default → `NoContraction`/`precise` shaders.
- **R-CPPB4** HDF5 layout must match testkit capture-v1 cross-language; HighFive determinism property-lists reachable → C-6 round-trip gates (bar = parse-equality, not byte-equality).
- **R-CPPB5** Vulkan substrate scope underestimate → MVP headless-compute only; no swapchain/render.
- **R-CPPB6** no C++ CI exists; lavapipe CI availability/pin → Stage-0 verify; Stage-1c/2 add workflow.
- **R-CPPB7** SPIR-V toolchain (glslang) new build dep → Stage-0 verify; pin compiler.
- **R-CPPB8** HDF5 vendor build cost → system `libhdf5-dev` + header-only HighFive (D3 refined).
- **R-CPPB9** determinism-baseline chicken/egg → ephemeral Stage-0 dispatch separate from 1a production substrate (§ L.7 O-2 analog).
- **R-CPPB10** uv-tooling regression → none expected (common-cpp outside the uv workspace).

## § 6. Convention discipline reminders

- **Convention M** — re-anchor before edit; HEAD wins. Stage-0 Task 0.0 re-verifies every value this charter carries. **Cite sha256-of-content for doc anchors; never mix with git-blob-sha1** (the S-RD2C2 lesson; probe § 17).
- **Convention #8** — never assert Vulkan/lavapipe/HDF5 specifics from memory; HEAD/upstream-verify at moment of use (the upstream facts reverified at Stage-0 install).
- **Convention C/D** — probe API surfaces (common-warp § 1.9.1 + testkit capture-v1 layout) before drafting; verbatim citations.
- **Convention A** — additive-only; new files first (§ 4).
- **Convention #9 / ruff** — N/A for C++ stages; the C++ analog is `clang-format`/`clang-tidy` if adopted (Stage-1a decision; not mandated here).
- **Convention #12** — SHA back-fill at EVERY stage close (Stage 0, 1a, 1b, 1c, 2), separate commit, never `--amend`, N1-enumerated.
- **§ A.3 role model** — one Claude Code agent at a time; one coordinator; one operator.

## § 7. Banked methodology-precedents consumed

(FACT — conventions § L.4–§ L.8; methodology § 6.)

- **S6-trajectory-simulation discipline (§ L.4).** Bootstrap analog: the C-4 smoke must be **stable bounded by design** (2D advection-diffusion, diffusion-dominated/decaying — the laminar bootstrap analog, like common-warp's hello sim). Verify max-field bounded at the smoke's resolution.
- **Socket-reconciliation Option B (§ L.5).** The § 1.9.1-cpp socket is reconciled to a verbatim contract at Stage 1c BEFORE the first consumer (RD-2D-Stack-C).
- **O-2 four-checkpoint determinism chain (§ L.7).** PATTERN ports: Stage-0 ephemeral digest → Stage-1a substrate reproduces → Stage-1b 2-run canonical-scale. The chain's checkpoint-4 (gate-14) belongs to the per-sim RD-2D-Stack-C, NOT this bootstrap (no canonical here).
- **R-P2 / § 6.1 / § 6.8 (methodology).** Forward-looking for the Stack-C ports; NOT exercised at bootstrap. **§ 6.8 explicitly does NOT inherit** to the Vulkan/C++↔NumPy backend pair — the Stack-C backend-pair FP property is established empirically at the per-sim ports.

**Produced (new):** the **Vulkan/C++ quirks catalog (§ L.9; D5)** — seeded from probe § 10 (FMA contraction, shaderFloat64-device-dependence, division-2.5-ULP, lavapipe-determinism, HDF5-determinism-flags), formalized with empirical findings at Stage 2.

## § 8. Out-of-scope

- The Stack-C per-sim ports (RD-2D item 2.1.C; sph-water / smoke / LBM Stack-C) — separate sub-phases after this lands (D11 = RD-2D-Stack-C refresh first).
- Vulkan render/display surface (swapchain / present / ImGui — declarations-only stay).
- Real-GPU backend (lavapipe CPU-only at bootstrap; real GPU is per-sim-port future scope).
- f64 guarantee (f32-vs-f32 contract; `shaderFloat64` probed + banked).
- OpenVDB / Alembic / USD export (stubs stay stubs).
- Full hermetic HDF5 vendor (system `libhdf5-dev` + header-only HighFive; D3 refined).
- Numeric cross-stack equivalence of the smoke (C-6 is format-interoperability; numeric is per-sim-port scope — D8).
- All STAY-BANKED carry-in items (RD-2D-Stack-C landing § 8; LBM-E + smoke-E § 13).

## § 9. Operator decisions surfaced (D1–D14)

(Full leans + alternatives + downstream in probe § 16. D1–D6 ratified at dispatch.)

| D | Question | Lean / status |
|---|---|---|
| D1 | Sub-phase name | `sub-phase-common-cpp-bootstrap` — RATIFIED |
| D2 | Bootstrap precondition vs inline | bootstrap — RATIFIED |
| D3 | HDF5 strategy | system `libhdf5-dev` + header-only HighFive (`highfive-devs` fork) — RATIFIED + refined |
| D4 | Deterministic backend | lavapipe; `LP_NUM_THREADS=0` + `NoContraction`; f32-vs-f32 — RATIFIED + sharpened |
| D5 | Vulkan/C++ quirks catalog | new conventions § L.9 — RATIFIED |
| D6 | Registration | CMake target + top-level aggregation; uv stays 23 — RATIFIED |
| D7 | `docs/common/cpp.md` de-scaffold | YES (probe § 14) |
| D8 | HDF5 lib choice | HighFive (Boost; `highfive-devs`) over HDF5 C API |
| D9 | SPIR-V toolchain | glslang/glslc build-time GLSL→SPIR-V; pin compiler |
| D10 | Gate naming | C-Gates C-0..C-7 |
| D11 | Next after bootstrap | RD-2D-Stack-C plan-drafting REFRESH (held probe `f772f71`) |
| D12 | Non-phase tag | NO TAG |
| D13 | Determinism baseline-digest method | minimal ephemeral compute dispatch ×2 on lavapipe `LP_NUM_THREADS=0` → sha256 of readback buffer |
| D14 | lavapipe selection mechanism | `VK_DRIVER_FILES` + `LP_NUM_THREADS=0`; pinned `mesa-vulkan-drivers` |

## § 10. Plan-drafting landing audit checklist

The plan-drafting landing (`…/plan-drafting-landing-2026-05-25T19-00-00Z.md`, COMMIT 3)
verifies before declaring drafting CONFIRMED:

- [ ] Probe (COMMIT 1) + this charter (COMMIT 2) committed; SHAs recorded.
- [ ] common-cpp NOT-MATURE re-confirmed at HEAD; gap→deliverable map verified (probe § 4).
- [ ] lavapipe + HDF5 upstream HEAD-verified (probe § 6/§ 7); D3/D4 leans grounded.
- [ ] C-Gates C-0..C-7 defined against HEAD (§ 3).
- [ ] D1-D6 ratification recorded; D7-D14 surfaced with leans (§ 9).
- [ ] S-RD2C2 architecture-sha correction surfaced + banked (probe § 17; B-CPPB1).
- [ ] Hard Rule 2 NOT a blocker (immaturity is the SCOPE, not a STOP).
- [ ] Shift count reconciled (223 entering; plan-drafting S-CPPB* enumerated).
- [ ] SHA back-fill (COMMIT 4) plan: N1-enumerate placeholder-bearing audits.

---

*End of charter. Plan-drafting landing audit follows (COMMIT 3); operator routes D7–D14,
then dispatches Stage 0 separately.*

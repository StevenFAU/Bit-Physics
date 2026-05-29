---
date: 2026-05-29
author: phase-3 mass-spring-cloth plan-drafting (Claude Code)
subject: probe report — task-5 mass-spring-cloth (sub-phase 3.4); first Stack-C (Vulkan/C++) sim of Phase 3
verdict: PROBE COMPLETE (charter ready; 5 D-classes open for operator + 7 resolved-in-charter)
head_sha: a54ade8
prior_sub_phase_landed_at: be3e468
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - common/common-cpp/include/bit_physics/common/common_cpp.hpp
  - common/common-cpp/include/bit_physics/common/vulkan_compute.hpp
  - common/common-cpp/include/bit_physics/common/determinism.hpp
  - common/common-cpp/include/bit_physics/common/capture.hpp
  - common/common-cpp/CMakeLists.txt
  - CMakeLists.txt
  - packages/reaction-diffusion-2d-stack-c/CMakeLists.txt
  - .github/workflows/cpp-strict.yml
  - references/SPlisHSPlasH/MANIFEST.toml
  - references/Chakazul-Lenia/MANIFEST.toml
  - tools/testkit/schemas/reference-manifest-v1.json
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/determinism/registry.toml
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
  - docs/phases/phase-3-plan.md
  - docs/_audits/phase-3/sub-phase-phase-3-mass-spring-cloth-probe-2026-05-29T01-46-23Z.md
---

# Probe report — task-5 mass-spring-cloth

First **Stack C (Vulkan / C++20)** sim of Phase 3. Probe per Convention #8
(verbatim live surfaces) + web-verify per the dispatch (do not trust
plan-supplied citations — task-4's Goldstein §4.3 was wrong). Feeds charter
`docs/phases/sub-phase-phase-3-mass-spring-cloth.md`.

## 0. Pre-flight + anchor (FACT)

- `uv run python tools/dispatch/preflight-phase.py 3` → **genuine exit 0** (8/8
  PASS: prior-phase-tag `v0.2.0-phase-2`, `common/common-warp`, `docs/common/warp.md`,
  the four Phase-2 ports, integrity-all-green). The F1/F2 stale-tooling
  false-positive is fixed (`1793b83`); no STOP-PREFLIGHT-NEW.
- `uv run python -m integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**
  at HEAD `be3e468`; full-stderr-report sha256 = `f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3`
  (§R measured, not copied). Clean tree.

## 1. common-cpp consumable surface (mature, Phase-2) — VERBATIM

Umbrella header `common/common-cpp/include/bit_physics/common/common_cpp.hpp`
re-exports capture / determinism / hash / vulkan_compute. CMake targets (top-level
`CMakeLists.txt` `add_subdirectory(common/common-cpp)`):

- **`bit_physics::common_cpp`** (core: determinism socket + hash + CLI args).
- **`bit_physics::common_cpp_vulkan`** (compute substrate; requires `Vulkan_FOUND`).
- **`bit_physics::common_cpp_hdf5`** (HDF5 capture-v1; requires `HDF5_FOUND`).

Public surfaces the cloth sim consumes:

- **Vulkan compute** (`vulkan_compute.hpp`, ns `bit_physics::common_cpp::vkcompute`):
  `ComputeContext` (instance/device/compute-queue/command-pool; `query_float_controls`,
  `assert_deterministic_float_controls`), `StorageBuffer` (`upload`/`download`/
  `fill_zero`, host-visible, zero-copy on lavapipe CPU), `ComputePipeline`
  (`Options{spirv, spirv_word_count, binding_count, push_constant_bytes,
  entry_point, pipeline_pnext}`; the `pipeline_pnext` hook lands FloatControls),
  `dispatch(ctx, pipeline, gx, gy, gz, push_constants)` (synchronous single-
  dispatch + fence wait — the deterministic path).
- **Determinism** (`determinism.hpp`, ns `…::determinism`): `Config{deterministic,
  seed}`, `from_args(int& argc, char** argv)` (parses `--deterministic`/`--seed N`),
  `set_seed`/`get_seed`/`is_deterministic`, `DeterministicContext` (RAII),
  **`std::string assert_deterministic_run(const std::function<std::vector<unsigned char>()>& sim_fn,
  int runs=2, double tolerance=0.0)`** — `tolerance=0.0` ⇒ sha256 byte-equality
  (bit-exact); `tolerance>0` ⇒ epsilon-bounded f32.
- **Capture I/O** (`capture.hpp`, ns `…::capture`): `Manifest{schema_version="1.0.0",
  sim, stack, config, run, payload, determinism}`, `FieldData{bytes, dtype, shape}`,
  `StepData{fields, diagnostics}`, **`Hdf5Writer(manifest_path, Manifest)` →
  `write_step(step, StepData)` → `finalize()`** (writes `.h5` + `.json` sidecar w/
  sha256; testkit-conformant layout `/steps/{N}/state/{field}`, `/steps/{N}/diagnostics/{check}`),
  `manifest_to_json`/`manifest_from_json` (nlohmann/json).
- **Hash** (`hash.hpp`): `hash::sha256_hex(const void*, size_t)`.
- **Stubs (NOT consumed by a headless cloth sim):** `imgui_hooks.hpp` (inline
  no-ops), `export_hooks.hpp` (`export_scene_to_usd`/`…_to_vdb`/`…_to_alembic`
  throw `std::logic_error`), `vulkan_init.hpp` (swapchain/window — Phase 2+).

**Build:** C++20 (`cxx_std_20`), CMake ≥ 3.28, FetchContent-pinned nlohmann/json
v3.11.3 + doctest v2.4.11 + HighFive v2.10.1 (HDF5); glslangValidator for SPIR-V.

→ **No Hard-Rule-2 missing surface.** Vulkan compute + determinism socket
(`assert_deterministic_run`) + HDF5 capture (`Hdf5Writer`) + hash cover the sim's
infra in full. The XPBD solver/kernels are the sim's own physics deliverable.

## 2. Stack-C package precedent — `packages/reaction-diffusion-2d-stack-c/` (the ONLY built Stack-C sim)

FACT: the eulerian-smoke / sph-water / lattice-boltzmann packages are Stack-**D/E**,
not Stack-C. The single Stack-C precedent is the Phase-2 port RD-2D-Stack-C.

- **Layout (flat, NO `cpp/` subdir):** `include/bit_physics/reaction_diffusion_2d_stack_c/`,
  `shaders/*.comp`, `src/*.cpp` (+ `*_capture_main.cpp` executable), `tests/*.cpp`
  (doctest) + `tests/python/` (cross-stack gate-14 script).
- **CMakeLists.txt** gates on `if (TARGET bit_physics_common_cpp_vulkan AND TARGET
  bit_physics_common_cpp_hdf5)`; embeds shaders via `bitphysics_embed_compute_shader(...)`;
  `add_library(bit_physics_rd2d_stack_c …)` → `target_link_libraries(… PUBLIC
  bit_physics_common_cpp_vulkan bit_physics_common_cpp_hdf5)`; a `…_capture` executable;
  a doctest test exe `add_test(NAME rd2d_stack_c_tests …)` with
  `set_tests_properties(… ENVIRONMENT "VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json;LP_NUM_THREADS=0")`.
- **Top-level `CMakeLists.txt`** registers `add_subdirectory(packages/reaction-diffusion-2d-stack-c)`
  AFTER `add_subdirectory(common/common-cpp)`.
- **Test runner: doctest + ctest** (NOT Catch2/gtest). Run via `cmake -S . -B build/cpp
  && cmake --build build/cpp && ctest --test-dir build/cpp --output-on-failure`.
- **CI: `.github/workflows/cpp-strict.yml`** (`build-cpp.yml` does NOT exist).
  Steps: apt `cmake g++ mesa-vulkan-drivers vulkan-tools libvulkan-dev glslang-tools
  libhdf5-dev` → `setup-uv` + testkit `uv sync --extra dev` → lavapipe probe →
  `cmake -S . -B build/cpp` → `cmake --build build/cpp -j` → `ctest --test-dir
  build/cpp --output-on-failure`. The lavapipe pin is via CTest `ENVIRONMENT`.
- **gate-14:** RD-2D-Stack-C ships a `rd2d_stack_c_gate14` cross-stack ctest
  because it is a PORT of a Phase-1 sim (has an other-stack twin). **Cloth, a NEW
  single-stack terminal sim, has no twin → no gate-14.**

## 3. Vendoring convention (FACT)

- **All upstreams are read-only sparse-checkout reference-oracles**, NOT
  runtime-linked: `references/` is excluded from pre-commit hooks (`exclude: ^references/`
  on eof-fixer/trailing-ws/ruff) and from Cat-2 (`tools/integrity/integrity/common/repo.py:18`:
  `"references/" # vendored upstreams are read-only`); `docs/testkit/references.md`
  ("an agent that modifies vendored source is HALTED").
- **Manifest format: `MANIFEST.toml`** (NOT `manifest.yaml`), validated against
  `tools/testkit/schemas/reference-manifest-v1.json` — required sections
  `[upstream]{name,version,sha,url,license,license_file}`, `[scope]{purpose,
  used_by_sims,used_by_checks}`, `[vendoring]{fetched_utc,fetched_by,fetch_command}`;
  optional `[[citations]]{file,line,quote,purpose}` rows (Chakazul-Lenia uses
  these for the Quad4 kernel/growth anchors).
- **Security check:** license SPDX + GitHub advisory scan at vendoring time;
  license change → BLOCKED (spec D.3 reverify rule `docs/architecture.md:2543`).
- **Precedent for cloth:** SPlisHSPlasH (Phase-0 SPH) — vendored cubic-spline
  kernel as anchor; the Python/C++ kernel re-derived INDEPENDENTLY from Monaghan
  to guard against symmetric upstream bugs (spec §2.4). This is exactly the
  D-VENDOR-ROLE pattern for Bender→XPBD.

## 4. tolerance-schema + determinism registry (FACT)

- `tolerance-schema.json` `golden_tolerance` branch: (category, sim) two-level
  nesting; per-sim entries permit additional number/boolean/string keys
  (`minProperties: 1`). Existing entries in `tolerance.toml`:
  `[golden_tolerance.continuous-ca.lenia]`, `[golden_tolerance.lattice-spin.ising-classical]`,
  `[golden_tolerance.rigid-body.articulated-pedagogical]`. **No `soft-body` row yet.**
- **§S.3 shape 3 EXPLICITLY enumerates** `mass-spring-cloth: position_abs,
  catenary_shape_rel` as a single-stack `[golden_tolerance.<category>.<sim>]` sim →
  D-TOL is resolved-in-charter (no schema extension, no cross_stack budget cap).
- `determinism/registry.toml` fields: `stack, class, scope, atomic_ops,
  subgroup_ops, seed_pinned, distributional_bound`. Rows at HEAD: Stack-B
  (`ising-classical`), Stack-D (`lenia`), Stack-E (`common-3dgs`,
  `articulated-pedagogical`) — all `class="bit-exact"`, `scope="same-stack-same-hw"`,
  `atomic_ops="none"`, `subgroup_ops="none"`. **No Stack-C row** — cloth's
  `[soft-body.mass-spring-cloth]` is the FIRST (D-DET). `scope` enum =
  `same-stack-same-hw | same-stack-any-hw | cross-stack | n/a` (no `same-driver`;
  cloth uses `same-stack-same-hw` + lavapipe-pin caveat).

## 5. Web-verify (Convention #8; do not trust plan citations)

- **Bender PositionBasedDynamics:** `gh release view` → latest stable release
  **`2.2.0`** (tag `aa62c44f0d43956452e1f960a40333ec2d6d3ea5`, published
  2022-12-13); `gh api …/commits/master` → master HEAD `d0894bdb0190c5f273c0500ecad0e8c2bf21fc5f`;
  `gh api … --jq .license.spdx_id` → **MIT** (no license change → not BLOCKED).
  **CONFLICT:** spec D.3 (`docs/architecture.md:2552`) pins "Latest stable" (=
  `2.2.0`/`aa62c44f`) but Phase-3 §2.18 recorded master-HEAD `d0894bdb`. → **D-VENDOR-SHA**.
- **XPBD citation CONFIRMED:** Macklin, Müller, Chentanez (2016), "XPBD:
  Position-Based Simulation of Compliant Constrained Dynamics," *Proc. 9th Intl.
  Conf. on Motion in Games (MIG '16)*, ACM, **DOI 10.1145/2994258.2994272**.
  Compliance↔stiffness: compliance `α = 1/k`; time-step-scaled `α̃ = α/Δt²`;
  constraint update `Δλ = −(C + α̃λ)/(∇C·M⁻¹·∇Cᵀ + α̃)` — iteration/Δt-independent
  stiffness (the PBD defect the paper fixes).
- **Catenary anchors — 2 of 3 plan cites are WRONG/SUSPECT** (same failure mode as
  task-4's Goldstein §4.3):
  - *Marion & Thornton §6.4* — Ch 6 = "Some Methods in the Calculus of Variations";
    §6.4 (5th ed) = "The Second Form of the Euler Equation" (minimal-surface /
    catenoid). The **hanging-chain** (fixed-length constraint) is the
    auxiliary-conditions section **§6.6**, not §6.4. **SUSPECT** for the hanging cable.
  - *Symon Mechanics 3rd ed §10.2* — Ch 10 = "Tensor algebra. Inertia and stress
    tensors"; continuous-media / hanging cable is **Ch 8**. **§10.2 is WRONG.**
  - *Beer & Johnston Statics "Table 7.2"* — the catenary IS in **Ch 7 (Forces in
    Beams and Cables)** as a section/equation (§7.5 in 12th-ed reorg, §7.11 older),
    **not a numbered "Table 7.2."** Chapter right; "Table 7.2" **dubious**.
  - The catenary equation `y(x)=a·cosh(x/a)`, `a=T₀/(ρg)` is itself correct. →
    **D-ANCHOR** (corrected set + Stage-1b grep-cite-re-verify + catenary-LIMIT
    regime caveat: elastic cloth ≠ ideal inextensible catenary).

## 6. D-class routing summary (full leans in charter §6)

| D-class | Status | Lean |
|---|---|---|
| **D-VENDOR-ROLE** ⚠ | OPEN (load-bearing) | vendored READ-ONLY reference-oracle + reimplement XPBD from Macklin 2016 |
| **D-VENDOR-SHA** ⚠ | OPEN | `2.2.0` (`aa62c44f`, spec D.3 "Latest stable", MIT); operator reconciles §2.18 master-HEAD `d0894bdb` |
| **D-DET** ⚠ | OPEN (load-bearing) | do NOT pre-declare; DEFAULT bit-exact/same-stack-same-hw row 1a, MEASURE 1b, characterize honestly (first Stack-C row) |
| **D-ANCHOR** ⚠ | OPEN | catenary eqn correct; correct the cites (Symon §10.2 WRONG, M&T §6.4→§6.6, Beer Table 7.2→Ch7); catenary-LIMIT caveat; re-verify 1b |
| **D-PBT** ⚠ | OPEN | `length_bounded_above` + re-declared `momentum_conservation_free_no_gravity` (FREE cloth); wiring = subprocess-capture-binary |
| D-LAYOUT | RESOLVED | `packages/mass-spring-cloth/` (flat, no `cpp/`; §0.3 + RD-2D-Stack-C) |
| D-CI | RESOLVED | `cpp-strict.yml` `test-mass-spring-cloth` (build-cpp.yml absent) |
| D-MANIFEST-FMT | RESOLVED | `MANIFEST.toml` (reference-manifest-v1.json) |
| D-TOL | RESOLVED | `[golden_tolerance.soft-body.mass-spring-cloth]` (§S.3-enumerated; no cross_stack cap) |
| D-CAPTURE-API | RESOLVED | C++ `Hdf5Writer` + `Manifest` |
| D-NAMING | RESOLVED | canonical `mass-spring-cloth`; `cloth-xpbd` (Appendix D.2.3/D.3) → spec-amendments-proposed corrigendum |
| D-TAG | RESOLVED | NO (phase-close-only) |

**Gate map:** 13 gates; **no gate-14** (single-stack terminal); **no mutation**
(sim, not testkit). USD cleanly OUT (cloth is Stack C, not Stack E — §2.5 binds
only Stack-E sims). New `.h5` fixture + canonical capture → LFS-touching (§Q at
execution). **Cloth is TERMINAL** (plan §3.1 — no downstream consumer obligation).

No HARD RULE 2 conflict blocks plan-drafting. The D-VENDOR-SHA spec-vs-§2.18 and
D-ANCHOR wrong-cites are surfaced (not silently adapted) per Hard-Rule-2 discipline.

# Phase 5 binary-release — Pre-implementation probe

## Front matter

| | |
|---|---|
| Sub-phase | 5.2 — binary-release (Stack C / C++ / Vulkan) |
| Probe date | 2026-06-08 |
| Author | Phase 5 binary-release agent (Claude Code) |
| Method | MEASURED live at HEAD `f836b33` (#8); FACT = ran/read/measured, INFERENCE = reasoned |
| Scope | build-and-validate ONLY — deploy gated off (§ 4.3 / § 4.5); no Release, no tag (I7) |

## § 1 — Sim inventory in scope

**MEASURED:** exactly **two** packages carry a Stack-C CMake build with a headless
`*_capture` executable target (`find packages -name CMakeLists.txt`):

| Package | CMake capture target | §13 (own) | Bootstrap routing |
|---|---|---|---|
| `reaction-diffusion-2d-stack-c` | `bit_physics_rd2d_stack_c_capture` | none of its own (shares the Stack-B rd2d spec, whose `binary:false` is the WEB sim's flag) | **capture_roundtrip** — `compare_captures` vs `captures/reaction-diffusion-2d-stack-c/…` |
| `mass-spring-cloth` | `bit_physics_mass_spring_cloth_capture` | `binary:true` (`docs/sim-specs/soft-body/mass-spring-cloth`) | **witness_pbt_surrogate** — in-binary 2-run witness + Hypothesis PBT |

Both build through the **top-level `CMakeLists.txt`** (`add_subdirectory`), gated on
the `common/common-cpp` substrate targets `bit_physics_common_cpp_vulkan` +
`_hdf5`. The binaries need lavapipe (`VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json`,
`LP_NUM_THREADS=0`).

**Per-sim flag conventions (probed):**
- rd2d: `bit_physics_rd2d_stack_c_capture <ref_manifest.json> <out_manifest.json>` —
  reads grid/seed/steps from the reference manifest config; writes `<out>.{h5,json}`.
- cloth: `bit_physics_mass_spring_cloth_capture <out_manifest.json> [flags]` — defaults
  reproduce the canonical `flag-wind-128x128-seed42-step1000`; `--seed/--steps/--nx/--ny/…`
  available; `assert_determinism` ON by default (internal 2-run bit-exact self-check).

**Correctly NOT in 5.2 (MEASURED):** the four Python-only `binary:true` canonical sims —
`sph-water`, `eulerian-smoke`, `lattice-boltzmann-d3q19`, `reaction-diffusion-3d` — have
NO CMakeLists; their `binary:true` flag is aspirational (a C++ port does not yet exist).
They ship via sub-phase 5.3 (pypi). DEFERRED, not patched (flag↔artifact mismatch X-4).

## § 2 — Testkit / framework API surface (Contract A→T)

- `equivalence.harness.compare_captures(left_json, right_json, tolerance_table_path)`
  → `EquivalenceVerdict(within_tolerance, per_field_diff, tolerance_table_used)` — the
  programmatic round-trip (R1). Confirmed live: resolves `reaction-diffusion` 1e-4/0.0
  for the rd2d Stack-C manifest (sim.name `reaction-diffusion-2d`).
- `capture.reader.load_capture` — reads the C++-emitted `.h5`/`.json` (C-6 cross-language).
- `property.sims.mass_spring_cloth.invariants` — the cloth PBT predicate forms, driven by
  `packages/mass-spring-cloth/tests/python/test_pbt_invariants.py <binary>`.

## § 3 — Existing CI workflow inventory

- `.github/workflows/cpp-strict.yml` builds the same top-level CMake tree on
  ubuntu-latest (apt: `cmake g++ mesa-vulkan-drivers vulkan-tools libvulkan-dev
  glslang-tools libhdf5-dev`; `uv sync --extra dev`; `cmake -S . -B build/cpp`;
  ctest). **Green on `f836b33`.** `binary-release.yml` mirrors its build steps and is
  non-clashing (distinct name, `bin-v*` tag prefix, path filters).

## § 4 — External-tool current state (web-fetched at authoring)

- AppImage tooling (linuxdeploy / appimagetool) — wired as a go-live CPACK_EXTERNAL
  hook (`cmake/cpack-hooks.cmake`); NOT exercised in Phase 5 (deploy gated off).
- `softprops/action-gh-release` — pinned in the gated deploy job; re-verify SHA at go-live.
- macOS signing — UNSIGNED (§ 4.3); `xattr` workaround documented.

## § 5 — Wall-clock estimate for smoke matrix

MEASURED locally (clean out-of-tree build + bootstrap): rd2d-stack-c ≈ **16 s**
(configure + build the capture target + re-emit + compare). cloth ≈ build + the
128×128×1000 2-run determinism capture + 10-example PBT (subprocess-per-example) —
within the § 4.12 60-minute soft ceiling for a 2-cell ubuntu matrix; no sharding needed.

## § 6 — Verdicts (four-state)

| Item | Verdict |
|---|---|
| Toolchain present (cmake/g++/ninja/glslang/lavapipe/libvulkan-dev/libhdf5-dev) | **CONFIRMED** (docker absent → clean-build-dir isolation §0.3) |
| 2-package qualifying scope (reconciliation §C) | **CONFIRMED** (measured `find`) |
| rd2d-stack-c capture_roundtrip bit-exact | **CONFIRMED** (within_tolerance=True 0.0/0.0, 22 fields) |
| cloth witness + PBT surrogate | **CONFIRMED** (binary 2-run determinism + both PBT invariants PASS) |
| Windows / macOS matrix | **SHIFTED** — DEFERRED-to-Phase-6 (lavapipe/linux gate; R-CPPB2) |
| Deploy publish | **N/A** — gated off this phase |

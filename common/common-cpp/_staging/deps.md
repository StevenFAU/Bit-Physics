# common-cpp — staged dependency entries (Phase 1 Stage 1)

Staged for Stage 3 consolidation into `docs/dependencies.md`.

## common-cpp dependencies (Phase 1)

| Name | Version | Rationale (spec § 9.2) | Provenance |
|---|---|---|---|
| `nlohmann/json` | `v3.11.3` | JSON manifest serialization for IC-1. Header-only; small. Pinned tag. | `common/common-cpp/CMakeLists.txt` `FetchContent_Declare(nlohmann_json ... GIT_TAG v3.11.3)` (FACT) |
| `doctest` | `v2.4.11` | Single-header C++ test framework. Spec-compatible with the Stack C testing posture (lighter than gtest). Pinned tag. | `common/common-cpp/CMakeLists.txt` `FetchContent_Declare(doctest ... GIT_TAG v2.4.11)` (FACT) |
| `Vulkan SDK` (system) | `1.3.x` (system loader; checked at configure) | Required by `vulkan_init.hpp` declarations; library not vendored. `BIT_PHYSICS_HAS_VULKAN` define is set based on `find_package(Vulkan QUIET)`. | `common/common-cpp/CMakeLists.txt` `find_package(Vulkan QUIET)` (FACT) |

### Banked / deferred dependencies (SHIFTED from charter)

| Name | Status | Reason | Owner |
|---|---|---|---|
| HDF5 | Not vendored | Phase 1 Stage 1 ships IC-1 with a JSON-manifest + raw-binary payload format (`raw-binary-v1`) instead of HDF5. The HDF5 surface is the long-term cross-stack format; vendoring it requires either `apt install libhdf5-dev` at build time or FetchContent of the HDF5 source (~25 MB, ~minute-class build). Deferred to the per-sim implementation phase that first lands a Stack C sim. Cross-stack equivalence with common-ts is also SHIFTED to that phase. | Phase 2+ Stack C sim phase |
| OpenVDB | Not vendored | `export_hooks.hpp` ships a `throw std::logic_error` stub. Vendoring OpenVDB requires Blosc + TBB + Boost; deferred to eulerian-smoke implementation phase per § 7.8. | Phase 2+ eulerian-smoke phase |
| Alembic | Not vendored | Same pattern — vendoring deferred to first sim needing particle exports (mpm-multimaterial recommended). | Phase 2+ |
| USD | Not vendored | Same — deferred. | Phase 2+ |
| Dear ImGui | Not vendored | `imgui_hooks.hpp` ships empty inline functions. Vendoring ImGui needs a Vulkan back-end pairing; deferred to first sim wanting a runtime UI. | Phase 2+ |

## Notes for Stage 3 consolidation

- Stage 3 appends the active dependencies table to
  `docs/dependencies.md` under a new `common-cpp` section. The banked
  table goes into a "Phase 1 banked / deferred" subsection so that
  the per-sim implementation phase has an explicit pickup list.
- Convention K (cross-stack convergence): nlohmann/json + doctest
  pins are independent of the Stack D pins, so no convergence
  required at consolidation time.

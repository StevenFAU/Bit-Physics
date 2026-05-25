---
artifact: stage-1b-evidence
artifact_id: sub-phase-common-cpp-bootstrap-stage-1b
stage: stage-1b
phase: 2
date: 2026-05-25T22-30-00Z
head_sha: d962069962e2bedced629667b97efdaff8651751
head_sha_at_checkpoint: cb11ede62b9f1859b912173c6cfe2010f8f74ed3
verdict: C-1 + C-2 GREEN — HDF5 capture-v1 round-trips; determinism socket 2-run bit-identical; FloatControls levers asserted; NoContraction discipline verified
evidence_paths:
  - common/common-cpp/include/bit_physics/common/determinism.hpp
  - common/common-cpp/src/determinism.cpp
  - common/common-cpp/include/bit_physics/common/hash.hpp
  - common/common-cpp/src/hash.cpp
  - common/common-cpp/include/bit_physics/common/capture.hpp
  - common/common-cpp/src/capture_hdf5.cpp
  - common/common-cpp/include/bit_physics/common/vulkan_compute.hpp
  - common/common-cpp/src/vulkan_compute.cpp
  - common/common-cpp/shaders/determinism_nocontract.comp
  - common/common-cpp/tests/test_capture_hdf5.cpp
  - common/common-cpp/tests/test_determinism_socket.cpp
  - common/common-cpp/tests/test_determinism.cpp
  - common/common-cpp/CMakeLists.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1b-integrity-sweep-2026-05-25T22-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1b-replay-2026-05-25T22-30-00Z.txt
---

# Stage-1b evidence — determinism socket + FloatControls/NoContraction + HDF5 capture-v1

All values FACT — measured at HEAD `cb11ede` on this dev environment (Mesa
lavapipe 25.2.8 / LLVM 20.1.2; libhdf5-dev 1.10.10 serial — operator-installed;
HighFive v2.10.1 via FetchContent; glslang 15.1.0; cmake 3.28.3; g++ 13.3.0).
`ctest` → **3/3 pass** (`common_cpp_tests`, `common_cpp_vulkan_tests`,
`common_cpp_hdf5_tests`).

## § 0. Dispatch-vs-charter drift reconciliation (Convention M; operator-acknowledged)

Two coordinator-side drifts were caught against charter §3 at HEAD and resolved
to the charter (operator confirmed both at dispatch time; banked S1b-CPPB1/2):

- **S1b-CPPB1 — C-1/C-2 gate labels swapped in the dispatch.** Charter §3:
  **C-1 = Capture I/O**, **C-2 = Determinism**. The dispatch (e) had them
  reversed. Charter wins.
- **S1b-CPPB2 — Python parse-equality framed into 1b.** The dispatch (d) framed
  the Python-reads-C++-`.h5` parse-equality as a 1b bar; charter scopes that to
  **C-6 = Stage 1c**. Stage 1b's C-1 bar is the **C++-internal** write→read-back
  round-trip (`tests/test_capture_hdf5.cpp`, field+manifest equality). The
  writer matches the testkit capture-v1 layout so 1c's C-6 passes, but the
  cross-language test is NOT pulled forward.

## § 1. C-1 — HDF5 capture-v1 writer/reader (C++ round-trip)

`bit_physics::common_cpp::capture::Hdf5Writer` / `Hdf5Reader` (HighFive +
libhdf5) replicate the testkit capture-v1 layout
(`tools/testkit/capture/writer.py`):
- `/steps/{N}/state/{field}` typed datasets (f32/f64/i32/i64/u32);
- `/steps/{N}/diagnostics/{check}` scalar datasets;
- `/metadata` attrs: `schema_version`, `sim_name`, `sim_category`, `sim_variant`,
  `stack_name`, `seed`;
- `.json` sidecar via `manifest_to_json` (nlohmann default ordered map ⇒
  `dump(2)` is the `sort_keys=True, indent=2` analog) with
  `payload.checksum = "sha256:"+<file hash>`;
- determinism flag `libver` low-bound = EARLIEST (h5py `libver="earliest"`
  semantics = `(EARLIEST, LATEST)`; HDF5 rejects a high bound of EARLIEST).

`test_capture_hdf5.cpp` (**25 assertions, all pass**): write 2 steps (f32 fields
`u`,`v` shape [2,2] + diagnostic) → read back → field bytes byte-equal, dtype +
shape equal, diagnostics equal, manifest subset equal, `/metadata` attrs equal,
sorted step numbers `[0,1]`. **C-1 GREEN.**

C-1's bar is the C++-internal round-trip. **Cross-language Python parse-equality
is C-6 (Stage 1c), NOT this stage** (S1b-CPPB2).

## § 2. C-2 — determinism socket + FloatControls + NoContraction

`determinism::assert_deterministic_run(sim_fn, runs, tolerance)` (D4 bit-exact:
sha256 each run, all must match, returns the witness) +
`determinism::DeterministicContext` RAII (sets/restores the canonical seed +
deterministic flag) + `determinism::set_seed`/`get_seed`/`is_deterministic`.
SHA-256 lives in the library (`hash::sha256_hex`), shared by the socket witness +
the capture-v1 checksum.

`test_determinism_socket.cpp` (lavapipe pin via CTest; **12 assertions pass**):
- **FloatControls (S0-CPPB2):** `ComputeContext::query_float_controls()` →
  `shaderRoundingModeRTEFloat32 = true`, `shaderSignedZeroInfNanPreserveFloat32
  = true` (both asserted; `assert_deterministic_float_controls()` does not throw);
  `denorm_preserve = false`, `denorm_ftz = false` (NOT pinnable on lavapipe —
  documented, banked for the quirks catalog; not asserted).
- **Socket reproduces the Stage-0 baseline (O-2 ckpt-3):**
  `assert_deterministic_run(contraction-allowed determinism_probe, runs=2)` →
  `a7f85bd4…2844f05` (== the Stage-0/1a substrate baseline; 2-run bit-identical).
- **NoContraction discipline:** `assert_deterministic_run(determinism_nocontract
  precise shader, runs=2)` → `48c92e95a75d139bb1371e4f1f5bd1131e7126476bd845d7acdaf292a174cbec`
  — 2-run bit-identical, distinct from the contracted baseline.

**C-2 GREEN.**

### § 2.1 NoContraction empirical finding (S1b-CPPB3 — banked SHIFT/observation)

`shaders/determinism_nocontract.comp` uses `precise` → glslang emits **6
`NoContraction` decorations** (the contraction-allowed `determinism_probe.comp`
has 0). On lavapipe this **changes the result**: the contracted probe yields the
Stage-0/1a baseline `a7f85bd4…` while the NoContraction shader yields
`48c92e95…`. So lavapipe DOES FMA-contract the default shader (R-CPPB3
confirmed), and NoContraction is the NumPy-match-friendly discipline.

**Caveat (banked):** the NoContraction determinism contract (charter C-2) must
NOT be asserted to reproduce the contracted `a7f85bd4…` baseline — they are
numerically distinct by construction. The dispatch's "determinism socket
reproduces a7f85bd4…" holds only for the contraction-allowed probe (which the
socket test also demonstrates). Analogous to
`[[smoke-stack-e-r-a1-reproduction-caveat]]`.

## § 3. libhdf5/HighFive integration (D3/D8)

- **libhdf5-dev 1.10.10** (serial) — operator-installed (`sudo apt-get install
  -y libhdf5-dev`); `find_package(HDF5 COMPONENTS C)` resolves
  `/usr/include/hdf5/serial` + `libhdf5_serial` cleanly (HDF5_FOUND=TRUE).
- **HighFive v2.10.1** (highfive-devs fork) via FetchContent, header-only,
  `HIGHFIVE_USE_BOOST=OFF` + tests/examples/docs OFF; HighFive's internal
  `find_package(HDF5)` resolves the serial install.
- NEW target `bit_physics::common_cpp_hdf5` (gated on `HDF5_FOUND`; additive —
  the core lib's raw-binary capture stays HDF5-free).

## § 4. Invariants (verified at HEAD cb11ede)

- **Integrity baseline:** `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
  — EXACT MATCH (0 HF / 14 SW). (Transient regression to 16 SW during a DRY
  refactor that removed `tests/sha256_util.hpp` — a Stage-1a evidence_paths entry
  — was resolved by retaining the file as a thin shim delegating to `hash`, per
  append-only audit discipline; back to 14.)
- **Bit-identity replay:** `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`
  — 8/8 PASS, HELD.
- **uv workspace members:** 23 (D6; common-cpp is CMake, not a uv member).
- **Clean-tree rebuild:** `cmake -S . -B <fresh>` + build + ctest → 3/3 pass.

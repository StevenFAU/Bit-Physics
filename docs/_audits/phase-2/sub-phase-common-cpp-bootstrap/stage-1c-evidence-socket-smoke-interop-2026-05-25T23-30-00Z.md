---
artifact: stage-1c-evidence
artifact_id: sub-phase-common-cpp-bootstrap-stage-1c
stage: stage-1c
phase: 2
date: 2026-05-25T23-30-00Z
head_sha: a78f8032679261682b9afcdfd73ec4b708268bec
head_sha_at_checkpoint: 9a4a0cb79a97e81c62c21bdbec7f61fcaca73f4a
verdict: C-4 + C-5 + C-6 GREEN — §1.9.1-cpp socket reconciled; advection-diffusion smoke bounded/stable; cpp.md de-scaffolded; cross-language interop passes; cpp-strict CI added
evidence_paths:
  - common/common-cpp/include/bit_physics/common/common_cpp.hpp
  - common/common-cpp/shaders/advection_diffusion_2d.comp
  - common/common-cpp/smoke/advection_diffusion_2d.hpp
  - common/common-cpp/smoke/advection_diffusion_2d.cpp
  - common/common-cpp/smoke/advection_diffusion_2d_main.cpp
  - common/common-cpp/tests/test_smoke_advection_diffusion.cpp
  - common/common-cpp/tests/python/test_cross_language_interop.py
  - common/common-cpp/src/capture_hdf5.cpp
  - docs/common/cpp.md
  - .github/workflows/cpp-strict.yml
  - common/common-cpp/CMakeLists.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1c-evidence-smoke-trajectory-2026-05-25T23-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1c-integrity-sweep-2026-05-25T23-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1c-replay-2026-05-25T23-30-00Z.txt
---

# Stage-1c evidence — §1.9.1-cpp socket + smoke + cpp.md + interop + CI

All values FACT — measured at HEAD `9a4a0cb` on this dev environment (Mesa
lavapipe 25.2.8 / LLVM 20.1.2; libhdf5 1.10.10 serial; HighFive v2.10.1; glslang
15.1.0). `ctest` → **5/5 pass** (`common_cpp_tests`, `common_cpp_vulkan_tests`
[C-2/C-3], `common_cpp_hdf5_tests` [C-1], `common_cpp_smoke_tests` [C-4],
`common_cpp_cross_language_interop` [C-6]).

## § 1. §1.9.1-cpp socket reconciliation (conventions §L.5 Option B)

NEW umbrella header `include/bit_physics/common/common_cpp.hpp` — the C++ analog
of common-warp's `__init__.py` §1.9.1 re-export contract: a single include
exposing the matured surface (substrate / determinism / capture / hashing /
smoke). Reconciled to a verbatim contract BEFORE the first consumer
(RD-2D-Stack-C, D11). Documented as the public contract in `docs/common/cpp.md`
§3. **No API surface gap surfaced** — the Stage-1a/1b substrate + socket +
capture API cover the smoke's full needs (substrate, determinism socket,
FloatControls assertion, push-constants, multi-binding ping-pong, HDF5 capture).

## § 2. C-4 — Vulkan-compute 2D advection-diffusion smoke (§L.4 bounded/stable)

`smoke::run_advection_diffusion` exercises the FULL matured surface end-to-end:
`ComputeContext` + `assert_deterministic_float_controls()` + two `StorageBuffer`s
(ping-pong) + a 2-binding `ComputePipeline` with push-constants + NoContraction
(`precise`) shader + `dispatch` + `Hdf5Writer` capture + `DeterministicContext`.

**S6-trajectory characterization (§L.4; MEASURED, not assumed):** 64×64 grid,
400 steps, diffusion-dominated (diff=1e-3, dt=0.02, periodic BC, upwind
advection vx=vy=0.1). max-field **monotone non-increasing**:

```
step   0  max=0.990509   (Gaussian peak, sampled at cell centres)
step 200  max=0.322510
step 400  max=0.192253
bounded=true monotone_nonincreasing=true
```

Laminar diffusion-dominated regime — the bootstrap analog of common-warp's hello
sim (1.0→0.219). Bounded/stable confirmed; the false-laminar risk does not apply
(genuine diffusion + numerical-diffusion decay). C-4 test asserts: bounded +
monotone + final<initial + capture round-trips + 2-run bit-identical (via
`assert_deterministic_run` — the determinism socket on a non-trivial workload).
**C-4 GREEN.**

## § 3. C-5 — docs/common/cpp.md de-scaffold

`docs/common/cpp.md` matured from the Phase-1 declarations-only scaffold to the
full Stack-C convention + §1.9.1-cpp public-API reference (warp.md template):
overview, build/toolchain, §1.9.1-cpp surface table, determinism contract (D4 +
FloatControls + the NoContraction/FMA caveat with both baselines a7f85bd4…
contracted / 48c92e95… NoContraction), capture-v1, usage, Stack-C port
consumption guide, upstream refs, methodology (§L.4). **Resolves the dangling
`_staging/deps.md` reference (B-RD2C1)** → points to `docs/dependencies.md`.
integrity **Cat-2 passes** (Python-module-exports contract — unaffected; cpp.md
is not a Cat-2 surface) and the sweep stays baseline-MATCH (§5). **C-5 GREEN.**

## § 4. C-6 — cross-stack format-interop (Python testkit reads C++ .h5)

`tests/python/test_cross_language_interop.py` runs the C++ smoke (emits a
capture-v1 `.h5`+`.json`), then: (1) the testkit `load_capture` **parses** it
(manifest schema-validates; `/metadata` attrs + the `u` field read back as a
`(64,64)` float32 numpy array, finite, max≈0.99); (2) `compare_captures(cpp, cpp)`
→ `within_tolerance=True` (category `smoke` resolves; max_abs_err=0). Format-
interoperability = **pass**. Numeric cross-stack equivalence is per-sim-port
scope (D8), not this check. **C-6 GREEN.**

**Two capture-v1 schema-compliance fixes surfaced by C-6** (banked S1c-CPPB2 —
the cross-language check doing its job; the Stage-1b C++-internal round-trip did
not validate the testkit JSON schema):
- `payload.format` must be `"hdf5"` (testkit schema enum), not `"capture-v1"`.
- `run.start_utc` must be non-empty (testkit schema requires min length 1).
Both fixed in `capture_hdf5.cpp` / the smoke manifest; NOT a Stage-1b structural
defect (trivial schema-value reconciliation — the iterative purpose of C-6).

## § 5. C++ CI workflow (cpp-strict.yml; S-CPPB5)

NEW `.github/workflows/cpp-strict.yml` (charter §4: lavapipe + cmake + ctest):
apt-installs `mesa-vulkan-drivers vulkan-tools libvulkan-dev glslang-tools
libhdf5-dev` + uv (syncs the testkit workspace for the C-6 interop ctest),
configures the top-level CMake, builds, runs the full `ctest`. YAML validated.
**Verified locally: 5/5 ctests pass.** Remote CI is operator-initiated
post-push (per dispatch).

**R-CPPB2 CI caveat (banked S1c-CPPB1):** the exact-digest tests (C-2/C-3
reproducing a7f85bd4… contracted + 48c92e95… NoContraction) are
same-host-same-build (the determinism contract). A CI runner with a different
Mesa/LLVM build may diverge on the FMA-**contracted** digest (the NoContraction
path is the more portable IEEE-754 RTE path). If the remote job is red on those,
it is expected R-CPPB2 cross-build divergence — pin Mesa (container) or relax to
2-run-determinism-only (banked follow-up), operator's call.

## § 6. Invariants (verified at HEAD 9a4a0cb)

- **Integrity baseline:** `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
  — EXACT MATCH (0 HF / 14 SW). The cpp.md de-scaffold + new source/test/workflow
  add 0 findings. (Report stream = stderr — `[[integrity-baseline-digest-method]]`.)
- **Bit-identity replay:** `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`
  — 8/8 PASS, HELD.
- **uv workspace members:** 23 (D6). Clean-tree rebuild + ctest 5/5.

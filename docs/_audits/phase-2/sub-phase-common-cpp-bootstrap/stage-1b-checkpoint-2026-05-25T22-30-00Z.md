---
artifact: stage-1b-checkpoint
artifact_id: sub-phase-common-cpp-bootstrap-stage-1b
stage: stage-1b
phase: 2
date: 2026-05-25T22-30-00Z
head_sha: <pending-stage-1b-checkpoint-commit-sha-backfill>
head_sha_at_checkpoint: cb11ede62b9f1859b912173c6cfe2010f8f74ed3
verdict: CONFIRMED — C-1 (capture-v1) + C-2 (determinism socket) GREEN; FloatControls levers asserted; NoContraction discipline verified; integrity baseline-MATCH + replay HELD; Stage 1c dispatchable
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
  - common/common-cpp/CMakeLists.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1b-evidence-determinism-capture-2026-05-25T22-30-00Z.md
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1b-integrity-sweep-2026-05-25T22-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1b-replay-2026-05-25T22-30-00Z.txt
---

# Stage-1b checkpoint — determinism socket + HDF5 capture-v1 (C-1 + C-2)

**Verdict: CONFIRMED.** common-cpp gains a determinism socket
(`assert_deterministic_run` + `DeterministicContext` + library `hash::sha256_hex`),
the FloatControls/NoContraction discipline, and an HDF5 capture-v1 writer/reader
(HighFive + libhdf5) replicating the testkit layout. `ctest` 3/3 pass; integrity
sweep byte-identical baseline-MATCH; bit-identity replay HELD. **No Hard-Rule-2
STOP triggered. Stage 1c (§1.9.1-cpp socket reconciliation + 2D advection-
diffusion smoke + docs/common/cpp.md + cross-language interop C-6 + C++ CI) is
dispatchable.**

## § 0. Charter re-anchor (Convention M) + dispatch-drift reconciliation

Charter §2 row "Stage 1b" + §3 C-1/C-2 + §4 read at HEAD `cb11ede`. **Two
coordinator-side dispatch drifts caught + resolved to the charter** (operator
acknowledged both at dispatch; the agent's Convention M call wins per the
S1a-CPPB3 precedent):

- **S1b-CPPB1:** dispatch (e) swapped the gate labels. Charter §3 is
  authoritative: **C-1 = Capture I/O**, **C-2 = Determinism**.
- **S1b-CPPB2:** dispatch (d) framed the Python-reads-C++-`.h5` parse-equality
  into 1b. Charter scopes that to **C-6 = Stage 1c**. Stage 1b's C-1 bar is the
  **C++-internal** write→read-back round-trip; the writer matches the testkit
  capture-v1 layout so 1c's C-6 passes, but the cross-language test is NOT
  pulled forward.

## § 1. Deliverables (charter §4 — additive, Convention A)

| Deliverable | File(s) | Status |
|---|---|---|
| Determinism socket | `determinism.hpp`/`.cpp` (+ `DeterministicContext`, `assert_deterministic_run`, `set/get_seed`) | ✓ backend-agnostic; CPU unit tests + lavapipe C-2 |
| Library SHA-256 | `hash.hpp` + `hash.cpp` | ✓ shared by socket witness + capture checksum; `tests/sha256_util.hpp` now a thin shim |
| FloatControls / NoContraction | `vulkan_compute` `query_float_controls()` + `assert_deterministic_float_controls()`; `shaders/determinism_nocontract.comp` | ✓ RTE + signed-zero/inf/nan asserted; NoContraction (6 decorations) verified |
| HDF5 capture-v1 | `capture.hpp` (`Hdf5Writer`/`Hdf5Reader` + `manifest_to_json`/`from_json`) + `capture_hdf5.cpp` | ✓ testkit capture-v1 layout; C++ round-trip |
| CMake | `CMakeLists.txt` (hash → core; HighFive FetchContent + HDF5 target + alias `bit_physics::common_cpp_hdf5`; new test exes) | ✓ |

## § 2. C-Gates status (D10)

| Gate | Status |
|---|---|
| C-0 / C-3 | GREEN (Stage 0 / Stage 1a). |
| **C-1 Capture I/O** | **GREEN** — HighFive writer emits capture-v1 layout + JSON sidecar (checksum); C++ write→read-back round-trip (field+manifest equality), 25 assertions (`test_capture_hdf5.cpp`). |
| **C-2 Determinism** | **GREEN** — `assert_deterministic_run(runs=2)` bit-identical on lavapipe `LP_NUM_THREADS=0`; FloatControls RTE + signed-zero/inf/nan asserted; NoContraction shader bit-identical (`test_determinism_socket.cpp`). |
| C-4, C-5, C-6 | not yet — Stage 1c. |
| C-7 | not yet — Stage 2 landing. |

## § 3. Hard-Rule-2 STOP-condition sweep (all NOT triggered)

| Condition | Result |
|---|---|
| Charter §2/§4 conflicts with dispatch in a load-bearing way | Surfaced two NON-load-bearing label/scope drifts (S1b-CPPB1/2); resolved to charter per Convention M; core C-1/C-2 deliverables match. NOT a STOP. |
| libhdf5-dev install fails / HighFive integration breaks | NO — libhdf5 1.10.10 installed (operator); HighFive v2.10.1 FetchContent builds; `find_package(HDF5)` resolves serial. |
| Determinism socket 2-run non-bit-identical | NO — bit-identical (a7f85bd4… contracted; 48c92e95… NoContraction). |
| FloatControls RTE / SignedZeroInfNanPreserve unassertable | NO — both advertised + asserted (S0-CPPB2 confirmed at substrate). |
| NoContraction not respected by lavapipe | NO — `precise` emits 6 NoContraction decorations + changes the digest (proves contraction was happening and is now suppressed). |
| HDF5 writer fails C-1 round-trip | NO — field+manifest+diagnostics+metadata round-trip exact. |
| Top-level CMake breaks non-common-cpp targets | NO — additive targets; clean rebuild. |
| New HARD_FAIL / new SOFT_WARN beyond 14-baseline | NO — EXACT baseline-MATCH (§4; a transient 16-SW during refactor was resolved in-stage, see §5). |
| uv member count ≠ 23 | NO — 23 (D6). |

## § 4. Invariants (verified at HEAD cb11ede)

- **Integrity baseline:** `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
  — EXACT MATCH (0 HF / 14 SW). Report stream = stderr
  (`[[integrity-baseline-digest-method]]`).
- **Bit-identity replay:** `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`
  — 8/8 PASS, HELD.
- **uv workspace members:** 23 (D6). Clean-tree rebuild + ctest 3/3.

## § 5. New observations banked (S1b-CPPB*)

- **S1b-CPPB1** — dispatch C-1/C-2 label swap (coordinator inference error;
  charter §3 wins). Quirks-catalog: N/A (process note).
- **S1b-CPPB2** — Python parse-equality is C-6/Stage-1c, not 1b (dispatch scope
  drift forward; charter wins). C-1 bar = C++-internal round-trip.
- **S1b-CPPB3 (SHIFT-class)** — lavapipe FMA-contracts the default determinism
  shader: `precise`/NoContraction yields a DISTINCT digest (`48c92e95…`) from the
  contracted Stage-0/1a baseline (`a7f85bd4…`). The NoContraction determinism
  contract (charter C-2) must NOT be asserted to reproduce the contracted
  baseline (analog of `[[smoke-stack-e-r-a1-reproduction-caveat]]`). R-CPPB3
  empirically confirmed. → quirks-catalog seed (FMA contraction; Stage 2).
- **S1b-CPPB4** — FloatControls f32 levers RTE + signed-zero/inf/nan preserve are
  asserted at the substrate (S0-CPPB2); denorm preserve/FTZ NOT pinnable on
  lavapipe (documented, not asserted) → quirks-catalog seed (denorm; Stage 2).
- **S1b-CPPB5** — HighFive `FileVersionBounds(EARLIEST, EARLIEST)` is rejected by
  HDF5 ("Bad value"); h5py `libver="earliest"` maps to `(EARLIEST, LATEST)` — use
  that. → quirks-catalog seed (HDF5 determinism flags; Stage 2).

## § 6. Cumulative shifts

S1b-CPPB1/2 are dispatch-vs-charter drifts (process; not plan-vs-reality).
**S1b-CPPB3 IS a plan-vs-reality observation** (the NoContraction discipline
produces a digest distinct from the contracted baseline — a numeric-method fact
the plan/dispatch framing did not anticipate) → **+1 shift**. **Cumulative
shifts: 230 entering Stage 1c** (229 + S1b-CPPB3). S1b-CPPB4/5 are
observations (quirks-catalog seed).

## § 7. Cleanup-banked carry-in (§ 13 form — NOT acted)

Carry-in unchanged from Stage-1a §7 + prior banks. **NEW (Stage 1b):**
S1b-CPPB3/4/5 (quirks-catalog seed for Stage 2: FMA contraction; denorm
non-pinnability; HDF5 libver bounds). The `tests/sha256_util.hpp` shim (retained
for the Stage-1a evidence link; could be removed at a future cleanup once the
1a audits are historical). STAY-BANKED.

## § 8. verify-self-check + next

- Additive-only (Convention A): NEW hash + capture_hdf5 + determinism socket +
  NoContraction shader + 2 test files; CMakeLists matured additively; existing
  raw-binary capture + core tests unchanged + still green; 0 edits to
  conventions/methodology/equivalence/tolerance/warp.md/cpp.md. ✓
- Convention #8: FACT-tagged; digests/levers measured at HEAD; sha256-of-content
  (S-CPPB6). ✓
- Convention #12/N1: commit chain = hash+socket (COMMIT 1) + FloatControls/
  NoContraction (COMMIT 2) + HDF5 capture (COMMIT 3) + checkpoint+evidence
  (COMMIT 4) + SHA back-fill (COMMIT 5, separate, never `--amend`). ✓
- Hard Rule 2: full sweep §3 — no STOP. ✓
- Terminal: NO push, NO tag (operator action per spec §7.12 + D12). ✓

**Next:** operator dispatches **Stage 1c** — §1.9.1-cpp socket reconciliation +
Vulkan-compute 2D advection-diffusion smoke (bounded/stable, §L.4) +
`docs/common/cpp.md` de-scaffold + cross-language format-interop (C-6: Python
testkit reads the C++ `.h5`) + C++ CI workflow; gates C-4, C-5, C-6.

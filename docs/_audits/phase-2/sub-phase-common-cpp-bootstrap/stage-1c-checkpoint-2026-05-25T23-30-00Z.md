---
artifact: stage-1c-checkpoint
artifact_id: sub-phase-common-cpp-bootstrap-stage-1c
stage: stage-1c
phase: 2
date: 2026-05-25T23-30-00Z
head_sha: a78f8032679261682b9afcdfd73ec4b708268bec
head_sha_at_checkpoint: 9a4a0cb79a97e81c62c21bdbec7f61fcaca73f4a
verdict: CONFIRMED — C-4 + C-5 + C-6 GREEN; §1.9.1-cpp socket reconciled; smoke bounded/stable; cpp.md de-scaffolded; cross-language interop passes; cpp-strict CI added; integrity baseline-MATCH + replay HELD; Stage 2 (landing) dispatchable
evidence_paths:
  - common/common-cpp/include/bit_physics/common/common_cpp.hpp
  - common/common-cpp/shaders/advection_diffusion_2d.comp
  - common/common-cpp/smoke/advection_diffusion_2d.cpp
  - common/common-cpp/smoke/advection_diffusion_2d_main.cpp
  - common/common-cpp/tests/test_smoke_advection_diffusion.cpp
  - common/common-cpp/tests/python/test_cross_language_interop.py
  - docs/common/cpp.md
  - .github/workflows/cpp-strict.yml
  - common/common-cpp/CMakeLists.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1c-evidence-socket-smoke-interop-2026-05-25T23-30-00Z.md
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1c-integrity-sweep-2026-05-25T23-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/stage-1c-replay-2026-05-25T23-30-00Z.txt
---

# Stage-1c checkpoint — socket + smoke + cpp.md + interop + CI (C-4 + C-5 + C-6)

**Verdict: CONFIRMED.** The §1.9.1-cpp socket is reconciled (umbrella header +
cpp.md §3 contract); a Vulkan-compute 2D advection-diffusion smoke exercises the
full matured surface end-to-end and is bounded/stable (§L.4); `docs/common/cpp.md`
is de-scaffolded; the Python testkit parses a common-cpp-emitted `.h5`
(cross-language format-interop); a C++ CI workflow (`cpp-strict.yml`) is added.
`ctest` 5/5; integrity byte-identical baseline-MATCH; replay HELD. **No
Hard-Rule-2 STOP triggered. Stage 2 (landing) is dispatchable.**

## § 0. Charter re-anchor (Convention M)

Charter §2 row "Stage 1c" + §3 (C-4/C-5/C-6 gate-to-deliverable mapping,
authoritative) + §7 §L.5 read at HEAD `9a4a0cb`. The dispatch this time cited the
gate numbers correctly and deferred the gate mapping to charter §3; verified:
**C-4 = Smoke simulator, C-5 = Public API documented (cpp.md), C-6 = Cross-stack
format-interop**. No load-bearing dispatch-vs-charter conflict surfaced this
stage.

## § 1. Deliverables (charter §2/§4 — additive, Convention A)

| Deliverable | File(s) | Gate | Status |
|---|---|---|---|
| §1.9.1-cpp socket reconciliation | `include/bit_physics/common/common_cpp.hpp` (NEW umbrella) + cpp.md §3 | (§L.5) | ✓ no API gap |
| 2D advection-diffusion smoke | `shaders/advection_diffusion_2d.comp` + `smoke/advection_diffusion_2d.{hpp,cpp}` + `_main.cpp` + `tests/test_smoke_advection_diffusion.cpp` | **C-4** | ✓ bounded/stable; 5/5 |
| `docs/common/cpp.md` de-scaffold | `docs/common/cpp.md` | **C-5** | ✓ matured; B-RD2C1 dangling ref resolved; Cat-2 green |
| Cross-language interop | `tests/python/test_cross_language_interop.py` | **C-6** | ✓ testkit parses C++ .h5; verdict within_tolerance |
| C++ CI workflow | `.github/workflows/cpp-strict.yml` (NEW) | (S-CPPB5) | ✓ local 5/5; remote operator-observed |

## § 2. C-Gates status (D10)

| Gate | Status |
|---|---|
| C-0 / C-1 / C-2 / C-3 | GREEN (Stage 0 / 1a / 1b). |
| **C-4 Smoke simulator** | **GREEN** — advection-diffusion exercises substrate + determinism + HDF5 capture; max-field 0.9905→0.1923 monotone, bounded (§L.4). |
| **C-5 Public API documented** | **GREEN** — cpp.md de-scaffolded; Cat-2 contract passes; integrity baseline-MATCH. |
| **C-6 Cross-stack format-interop** | **GREEN** — Python testkit reader parses the C++ `.h5`; `compare_captures` verdict within_tolerance (format-interop = pass). |
| C-7 Integrity gates green | Stage 2 (landing). |

## § 3. Hard-Rule-2 STOP-condition sweep (all NOT triggered)

| Condition | Result |
|---|---|
| Charter §2/§3/§4 conflicts with dispatch (load-bearing) | NO — gate mapping matched charter §3; no drift this stage. |
| Cross-language interop FAILS (testkit can't parse / mismatch) | NO — parses + verdict within_tolerance. Two schema-value fixes (payload.format="hdf5", non-empty start_utc) were trivial reconciliations C-6 surfaced (S1c-CPPB2), NOT a Stage-1b structural defect. |
| Smoke trajectory NOT bounded/stable (§L.4) | NO — monotone non-increasing, finite, bounded (measured). |
| Determinism socket non-bit-identical on the smoke | NO — 2-run bit-identical (`assert_deterministic_run`). |
| C++ CI diverges from dev | Local 5/5 pass. Remote: exact-digest tests are same-build (R-CPPB2; S1c-CPPB1) — operator-observed, expected divergence is banked, not structural. |
| §1.9.1-cpp socket reveals an API gap | NO — Stage-1a/1b surface covers the smoke fully. |
| New HARD_FAIL / new SOFT_WARN beyond 14-baseline | NO — EXACT baseline-MATCH. |
| uv member count ≠ 23 | NO — 23 (D6). |

## § 4. Invariants (verified at HEAD 9a4a0cb)

- **Integrity baseline:** `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
  — EXACT MATCH (0 HF / 14 SW); cpp.md + new source/test/workflow add 0 findings.
- **Bit-identity replay:** `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`
  — 8/8 PASS, HELD.
- **uv workspace members:** 23 (D6). Clean-tree rebuild + ctest 5/5.

## § 5. New observations banked (S1c-CPPB*)

- **S1c-CPPB1** — R-CPPB2 CI caveat: exact-digest tests (a7f85bd4… contracted /
  48c92e95… NoContraction) are same-host-same-build; a CI runner with a different
  Mesa/LLVM build may diverge on the FMA-contracted digest (NoContraction is the
  more portable IEEE-754 RTE path). → quirks-catalog seed (Stage 2); CI-pin
  follow-up banked.
- **S1c-CPPB2** — the testkit capture-v1 JSON schema requires `payload.format ==
  "hdf5"` (enum) + non-empty `run.start_utc` (min length 1). The Stage-1b
  C++-internal round-trip did not validate the testkit schema; C-6 surfaced both,
  fixed in `capture_hdf5.cpp` + the smoke manifest. → quirks-catalog seed
  (cross-language capture-v1 schema conformance; Stage 2).
- **S1c-CPPB3** — the §1.9.1-cpp socket has NO API gap vs the smoke's needs
  (substrate + determinism socket + FloatControls + push-constants + multi-binding
  ping-pong + HDF5 capture all sufficient); the Stage-1a `pipeline_pnext` hook +
  push-constant support sized the substrate correctly for a real sim. (process)

## § 6. Cumulative shifts

Stage 1c surfaced **0 new plan-vs-reality shifts** — the deliverables matched the
charter; S1c-CPPB1 (R-CPPB2 CI) is a pre-banked risk reaffirmed, S1c-CPPB2 is a
cross-language schema reconciliation (caught + fixed in-stage), S1c-CPPB3 is a
favorable process observation. **Cumulative shifts: 230 (unchanged) entering
Stage 2.** S1c-CPPB1..3 are observations (quirks-catalog seed for Stage 2).

## § 7. Cleanup-banked carry-in (§ 13 form — NOT acted)

Carry-in unchanged from Stage-1b §7 + prior banks (S1a-CPPB1-4, S1b-CPPB1-5).
**NEW (Stage 1c):** S1c-CPPB1 (CI Mesa-pin follow-up) + S1c-CPPB2 (capture-v1
schema conformance) → quirks-catalog seed for Stage 2; the `sha256_util.hpp`
shim (Stage-1b carry). STAY-BANKED.

## § 8. verify-self-check + next

- Additive-only (Convention A): NEW umbrella header + shader + smoke + smoke
  test + interop test + CI workflow; cpp.md matured; `capture_hdf5.cpp` + smoke
  manifest schema-value fixes (additive correctness); existing tests unchanged +
  still green; 0 edits to conventions/methodology/equivalence/warp.md/tolerance.
  ✓
- Convention #8: FACT-tagged; trajectory + digests measured at HEAD; sha256-of-
  content (S-CPPB6). ✓
- Convention §L.4: smoke S6-trajectory MEASURED (bounded/monotone), not assumed. ✓
- Convention #12/N1: commit chain = socket+smoke+CI impl + cpp.md + interop +
  checkpoint/evidence + SHA back-fill (separate, never `--amend`). ✓
- Hard Rule 2: full sweep §3 — no STOP. ✓
- Terminal: NO push, NO tag (operator action per spec §7.12 + D12). ✓

**Next:** operator dispatches **Stage 2 (landing)** — cross-package regression;
integrity sweep baseline-MATCH (extend the streak); bit-identity replay;
Vulkan/C++ quirks catalog formalization (§L.9; D5 — seed from S0/S1a/S1b/S1c-CPPB
observations); CHANGELOG + project-state; landing audit; SHA back-fill; gate C-7.
Then RD-2D-Stack-C plan-drafting REFRESH unblocks (D11).

# Productization — binary-release

Phase 5 sub-phase 5.2. Build-and-validate native **Stack-C (C++ / Vulkan)** capture
binaries; re-verify correctness via the spec § 3.8 bootstrap gate. **No publish** —
the `deploy` job is gated off (§ 4.3 / § 4.5). Tooling: `tools/productization/binary-release/`.

## 1. Purpose

Productize the Stack-C sims that compile to a native binary, proving the packaged
artifact reproduces the in-repo canonical capture. The "did packaging preserve
correctness" question collapses to re-running Layer-0 verification FROM the built
binary (spec § 3.8): build → run → re-emit → judge.

## 2. Pipeline shape

`pipeline.py` (§ 5.5): `discover` → `validate` (`configure_and_build` → bootstrap gate).
The build is a **clean out-of-tree CMake** configure+build of the sim's capture target
(the isolation boundary; no Docker — §0.3). Build steps mirror the green `cpp-strict.yml`.

## 3. Qualifying sim criteria (§ 6.2)

A package qualifies when it (a) has a CMakeLists building a headless `*_capture`
executable, and (b) is not opted out by its OWN spec-ref § 13 `binary:false`. MEASURED
pool (reconciliation §C): exactly two —

| Package | Gate (R1/R3) | Result |
|---|---|---|
| `reaction-diffusion-2d-stack-c` | capture_roundtrip — `compare_captures(canonical, reemit)`, `reaction-diffusion` 1e-4/0.0 | bit-exact 0.0/0.0 (22 fields) |
| `mass-spring-cloth` | witness_pbt_surrogate — in-binary 2-run determinism witness + Hypothesis PBT | witness held + both invariants PASS |

The four Python-only `binary:true` canonicals (sph-water, eulerian-smoke,
lattice-boltzmann-d3q19, reaction-diffusion-3d) have no CMakeLists → ship via 5.3, not
here (DEFERRED, not patched).

### 3.1 Why cloth uses a surrogate, never a fabricated tolerance

The soft-body cloth has no NumPy oracle and no `compare_captures` soft-body tolerance
op. Its § 3.8 surrogate (reconciliation §R3) is the binary's internal 2-run determinism
self-check (`assert_determinism`, tolerance 0.0) plus the Hypothesis PBT re-check. The
committed `.h5` payload sha256 is same-host-same-build (R-CPPB2); its cross-build drift
is recorded informationally, **never gated** — gating a cross-build byte match would
contradict the determinism contract and is not a tolerance to widen.

## 4. Smoke test contract

`smoke/test_pipeline.py` (gate 3): discovery (exactly the 2-package scope — a third C++
package fails the test loudly as a §0.3 SHIFT), routing, CMakeLists linter, results-JSON
schema. The heavy bootstrap is gated behind `BIT_PHYSICS_BINARY_BOOTSTRAP=1`; the matrix
runs it for real per package.

## 5. Sharding scheme

Two packages × ubuntu-latest = 2 cells, well under the § 4.12 60-min soft ceiling. No
sharding needed.

## 6. Failure modes

- **compare_captures diverges** — investigate first (RNG-state restore, shader-cache,
  Vulkan validation-layer or threading-determinism drift). Irreducible numeric divergence
  (not a tolerance to loosen) → BLOCKED-and-surfaced (HARD RULE 2); never widen tolerance.
- **2-run determinism fails** (cloth) — the binary aborts; a real determinism regression,
  surfaced not forced.
- **cmake ≥ 4.0 vendored-doctest policy error** — handled by `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`.

## 7. Go-live runbook (post-phase; operator)

1. Wire `cmake/Packaging.cmake` into a packaging configure
   (`-DCMAKE_PROJECT_bit_physics_INCLUDE=cmake/Packaging.cmake`); `cmake --build … --target package`.
2. Linux: AppImage via the `cmake/cpack-hooks.cmake` linuxdeploy CPACK_EXTERNAL hook;
   AppImage > 100 MB → Release asset, not Actions artifact (§ 6.2).
3. macOS: **unsigned** (§ 4.3). End-user workaround: `xattr -d com.apple.quarantine <binary>`.
4. Windows: zip + DLL bundling (`fixup_bundle` / `windeployqt`).
5. Run `binary-release.yml` via `workflow_dispatch` with `confirm_deploy=true` to draft
   the GitHub Release. Re-verify the `softprops/action-gh-release` pin.

## 8. Open issues / DEFERRED items (§0.3 SHIFTs)

- **Windows + macOS matrix — DEFERRED-to-Phase-6.** The bootstrap gate is lavapipe-pinned
  (linux software Vulkan; R-CPPB2 cross-build determinism). Mirrors `cpp-strict.yml`'s
  ubuntu-only posture. We do not emit fake-passing win/mac cells.
- **No Docker** → clean-build-dir isolation; perf-ledger env label `binary-cmake-<os>`.
- **AppImage / signing** — go-live only (deploy gated off).

## 9. Extending coverage (post-phase contributor note)

A new Stack-C sim with a `*_capture` target is auto-discovered; add a `BINARY_ROUTING`
entry (its bootstrap method + canonical/target) and the smoke 2-package assertion updates.
Until routed, discovery surfaces it as an un-routed §0.3 SHIFT.

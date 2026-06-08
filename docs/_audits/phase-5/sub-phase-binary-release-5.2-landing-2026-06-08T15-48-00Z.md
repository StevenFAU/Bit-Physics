---
date: 2026-06-08T15-48-00Z
author: phase-5 sub-phase 5.2 binary-release session (Claude Code)
subject: "Phase-5 sub-phase 5.2 (binary-release) — build-and-validate the qualifying Stack-C (C++/Vulkan) CMake pool through the spec § 3.8 bootstrap gate (clean CMake build → run capture binary → compare_captures round-trip / in-binary witness + PBT surrogate). NO publish (deploy gated OFF). Fresh session; oriented only from committed state."
kind: sub-phase-landing
verdict: SHIFTED
phase: 5
sub_phase: "5.2"
head_sha: <COMMIT_3_HEAD_SHA_PENDING_BACKFILL>
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
evidence_paths:
  - tools/productization/binary-release/pipeline.py
  - tools/productization/binary-release/lint.py
  - .github/workflows/binary-release.yml
  - docs/productization/binary-release.md
  - cmake/Packaging.cmake
  - docs/perf-ledger.md
  - tools/testkit/probes/reports/phase-5-binary-release.md
  - tools/testkit/failing-tests-evidence/phase-5-binary-release-2026-06-08T15-35-13Z.txt
evidence_hashes:
  tools/productization/binary-release/pipeline.py: sha256:88a9d07085f6b5824a33f209a28d05bd396ba9395dc50903384a08ed815746e0
  tools/productization/binary-release/lint.py: sha256:435ec2b664f957be4b348a582b4b1f2b3ad101d3d29bbd7c36229c79aa274ae9
  .github/workflows/binary-release.yml: sha256:d2b5d2edb45f2b25a5f5f78f2e5c77e7b6016e16d6d522b207355ab6e265ae8d
  docs/productization/binary-release.md: sha256:4b789333606044a86308908d08d3fe4ce7aa081394e48b5cb51665a1a7698043
  cmake/Packaging.cmake: sha256:2917e8515bdde0e4ab73709465d2e566df31c7cab91d6fdd5a1b7276f52fb273
  docs/perf-ledger.md: sha256:a36c26c9e905e90e869f2bc95bf6e29b23d6030f3934cdf5e6589d73be8033e8
  tools/testkit/probes/reports/phase-5-binary-release.md: sha256:57a066f43701cb89511c6e6fecc1edf1ad78d6cd8ba7b93a3ee3753c2c543821
  tools/testkit/failing-tests-evidence/phase-5-binary-release-2026-06-08T15-35-13Z.txt: sha256:750461876876641eb125c34773ff0e1c032ea8d06f9e30d3409046b94cdd56c8
reemit_evidence:
  reaction-diffusion-2d-stack-c:
    binary_sha256: f25d6401977c152d89a15869343ccf8ec9127d33216aa04fca1ef26d02a371ee
    reemit_h5_sha256: b011b87cb16af60f3de18e8ef109c9f5ba3c562fa7627053c7e4ee4faa59a3bb
    verdict: "within_tolerance=True max_abs=0.0 max_rel=0.0 fields=22 (reaction-diffusion 1e-4/0.0)"
  mass-spring-cloth:
    binary_sha256: fd86b328e28b01563049419a2e2b405efa196076a3bc8a58dc8694957f9f6411
    determinism_witness: 90c36c3706ec3f1585efe807c713a8e25e1149411099277e643ccd5e33b67b3e
    reemit_payload_sha256_NOT_gated: 56ffb25e3dfdeeaaf2126670ef81478b43c80e7f8f096fc789102728aa04a705
    verdict: "in-binary 2-run determinism (assert_determinism, tol 0.0) + Hypothesis PBT both invariants PASS"
---

# Phase 5 — sub-phase 5.2 (binary-release) build-and-validate landing

> Build-and-validate ONLY — NO publish; the `deploy` job in `binary-release.yml`
> stays gated OFF (§ 4.3 / § 4.5). The § 3.8 bootstrap round-trip / surrogate is the
> REAL gate; never stubbed, never fake-passed; no tolerance widened, no surrogate
> fabricated, no divergence hidden. FACT = ran/read/measured at the cited HEAD this
> session; INFERENCE = reasoned. Four-state verdicts (CONFIRMED / SHIFTED / BLOCKED /
> FLAGGED). Commits direct to `main` (trunk-based). NO tag (I7). Fresh session, NO
> prior context — oriented only from committed repo state. A fresh resume re-orients
> the same way (ORIENT list in the dispatch prompt).

## §0 — Headline

| | |
|---|---|
| **Build/validate commit** | `627e683` (commit 2). Commit 1 (new files) `fc9bf80`. This audit lands on top (commit 3); `head_sha` back-filled per Convention #12. — FACT |
| **Pool (live discover)** | **2 qualifying** Stack-C CMake-capture packages (MEASURED via `pipeline.py discover`, not the prompt): `reaction-diffusion-2d-stack-c` + `mass-spring-cloth`. — FACT |
| **Result** | **2 PASS / 0 BLOCKED.** rd2d-stack-c capture_roundtrip BIT-EXACT 0.0/0.0 (22 fields); mass-spring-cloth witness + PBT surrogate PASS. — FACT |
| **Toolchain** | cmake 4.2.3, g++ 15.2.0, ninja, glslangValidator, lavapipe (`lvp_icd.json`, llvmpipe LLVM 21.1.8), libvulkan-dev + libhdf5-dev present. **Docker ABSENT** → clean-build-dir isolation (§0.3). 580 GB free. — FACT |
| **Integrity (live)** | **0 HARD_FAIL / 14 SOFT_WARN, rc 0** — invariant HELD after every edit. Full-report digest `9894964135e582fc3d94448f87bdf8d859a1ff29e3675a45fa04a7f04b40b15f` (unchanged from the 5.3 close — this sub-phase is purely additive; the 0HF/14SW COUNTS are the invariant, digest drifts by design). — FACT |
| **Deploy** | stayed **gated OFF** — no GitHub Release drafted; no binary published. — FACT |
| **§S.5 CI sweep (627e683)** | **28/28 check-runs `success`, 0 failures** (public REST API) — incl. `cpp-strict` (the C++ build), `integrity`, `equivalence`, `determinism`, `test-render-similarity`. GREEN. — FACT |
| **Verdict** | **SHIFTED** — both packages validated, with honest landed-reality §0.3 SHIFTs (no Docker → clean-build-dir isolation + `binary-cmake-linux` perf label; cmake≥4.0 policy flag; programmatic compare_captures per R1; rd2d-stack-c qualifies on CMake-capture-target + no-own-binary:false, not naïve canonical-flag inheritance; Windows/macOS DEFERRED-to-Phase-6). No tolerance widened; no surrogate fabricated; no round-trip divergence hidden. |

## §1 — STEP 0 orientation outcome

- **HEAD at session start:** `f836b33` (= 5.3 close + sha-backfill). The local
  `origin/main` tracking ref was STALE (3 commits "ahead") because the HTTPS remote
  was never fetched in this moved environment; the TRUE remote (SSH `ls-remote` +
  public REST API) was already at `f836b33` == local HEAD. Clean tree (two
  pre-existing untracked `common/common-ts/package-lock.json` only). FACT.
- **Baseline CI GREEN:** `f836b33` check-runs = 28/28 `success` (incl. `cpp-strict`,
  `integrity`, `equivalence`, `determinism`, `test-render-similarity`). FACT.
- **5.1 landed-cleanly precondition:** 5.1 (web) is BLOCKED-by-design (zero qualifying
  web builds; reconciliation §B) — NOT a 5.2 blocker (5.2 is independent; § 4.15). The
  Appendix-C "if 5.1 has not landed cleanly, BLOCK" clause refers to a broken 5.1, not
  the ratified-BLOCKED web track. Proceeded. FACT/INFERENCE.
- **Re-orientation reading (committed):** phase-5 plan § 5 / § 6.2 / Appendix C; the
  reconciliation audit (R1 programmatic bootstrap, R2 §13 five-boolean, R3
  tolerance/surrogate routing, §C 2-package readiness call); the 5.3 landing audit (the
  pattern to mirror + bootstrap-gate shape); `sub-phase-conventions.md`; the two
  CMakeLists + capture mains + the gate-14 / PBT python drivers. FACT.

## §2 — Live inventory + the 2-package scope (FACT)

`find packages -name CMakeLists.txt` → exactly **two** Stack-C CMake packages, each with
a headless `*_capture` executable target, both built through the **top-level**
`CMakeLists.txt` (`add_subdirectory`, gated on the `common/common-cpp`
`bit_physics_common_cpp_vulkan` + `_hdf5` substrate targets):

| Package | §13 (own spec-ref) | Disposition |
|---|---|---|
| `reaction-diffusion-2d-stack-c` | none of its own (shares the Stack-B `reaction-diffusion-2d` spec, whose `binary:false` is the WEB sim's flag) | **QUALIFIES** — has a CMake capture target + no own `binary:false`; reconciliation §C ratifies it as the full 5.2 package |
| `mass-spring-cloth` | `binary:true` (`docs/sim-specs/soft-body/mass-spring-cloth`) | **QUALIFIES** |

**The four Python-only `binary:true` canonical sims** — `sph-water`, `eulerian-smoke`,
`lattice-boltzmann-d3q19`, `reaction-diffusion-3d` — declare `binary:true` in §13 but
have **NO CMakeLists** (no C++ port exists yet; the flag is aspirational). MEASURED:
they do not appear in the CMake-capture pool. They ship via sub-phase 5.3 (pypi) where
applicable; they are correctly **DEFERRED, not "binary-built"** (a Python sim has no
C++ to compile — flag↔artifact mismatch X-4). RECORDED, not patched. FACT.

## §3 — The bootstrap gate (R1/R3, not stubbed)

Per package, via `pipeline.py validate --sim <name>` driven by `uv run python` from the
testkit workspace (so `equivalence` / `property` import): clean out-of-tree CMake
configure (`-DCMAKE_POLICY_VERSION_MINIMUM=3.5`) → build the sim's capture target →
run the binary under the lavapipe pin (`VK_DRIVER_FILES=lvp_icd.json`, `LP_NUM_THREADS=0`)
→ judge per routing. Hardware `i7-12700KF-linux-7.0`; perf-ledger label `binary-cmake-linux`.

| Sim | Method (R1/R3) | Verdict | Evidence | wall (s) |
|---|---|---|---|---|
| reaction-diffusion-2d-stack-c | capture_roundtrip | **PASS** bit-exact | `compare_captures` within_tolerance=True max_abs=0.0 max_rel=0.0, 22 fields (reaction-diffusion 1e-4/0.0); reemit_h5 `b011b87c…` | 15.7 |
| mass-spring-cloth | witness_pbt_surrogate | **PASS** | in-binary 2-run determinism witness `90c36c37…` (assert_determinism, tol 0.0) + Hypothesis PBT (length_bounded_above + momentum_conservation_free_no_gravity) both PASS | 174.3 |

- **rd2d-stack-c** — the binary reads grid/seed/steps from the canonical manifest
  (argv[1]) and re-emits to argv[2]; `compare_captures(stack-c canonical, reemit)`
  resolves `reaction-diffusion` (the manifest's sim.name is `reaction-diffusion-2d`)
  → 1e-4/0.0. Deterministic f64/NoContraction on lavapipe → BIT-EXACT 0.0/0.0. This
  is the round-trip the dispatch named; the existing `rd2d_stack_c_gate14` ctest
  (vs the NumPy ref) is a sibling cross-stack witness, also bit-exact. FACT.
- **mass-spring-cloth** — no NumPy oracle and no `compare_captures` soft-body
  tolerance op → its § 3.8 surrogate (reconciliation §R3) is the binary's INTERNAL
  2-run bit-identical determinism self-check (`assert_determinism`, tolerance 0.0;
  the binary aborts on a re-run mismatch) + the cross-language Hypothesis PBT against
  the BUILT binary. NO tolerance row was added (never fabricated). FACT.

Every fresh clean build succeeded for both; both verdicts banked as committed
perf-ledger rows (commit 2). FACT.

## §4 — R-CPPB2 cross-build digest note (informational, NOT gated; FACT)

The cloth canonical's committed `.h5` payload checksum is
`sha256:7954eb6c…`; the re-emit on THIS environment is `sha256:56ffb25e…` — they
DIFFER. This is the **expected R-CPPB2 same-host-same-build determinism boundary**
(the canonical was generated on dev Mesa 25.2.8 / LLVM 20.1.2; this env is llvmpipe
LLVM 21.1.8 + a possibly-newer HDF5). The cloth determinism contract is explicitly
`bit-exact-same-hw`; gating a cross-build BYTE match would contradict the contract
and is NOT a tolerance to widen. The gate is therefore the in-binary 2-run witness +
PBT (both env-portable, both PASS), and the payload-checksum drift is recorded
informationally. (The rd2d-stack-c re-emit `.h5` sha also differs from its committed
canonical for the same reason; its NUMERIC `compare_captures` verdict is bit-exact —
"gate-14 acceptance is within_tolerance, NOT raw-byte-equality.") FACT.

## §5 — pipeline / infra this sub-phase (additive packaging/CI only; NO sim-code change)

- `tools/productization/binary-release/{pipeline,lint}.py` — discover (CMake-capture
  pool, own-§13 opt-out) → clean-build → bootstrap-validate; `BINARY_ROUTING` keyed by
  package; discovery cross-checks the LIVE pool against the table (a third C++ package
  surfaces as an un-routed §0.3 SHIFT, failing the smoke contract LOUDLY).
- `cmake/{Packaging.cmake}` (top-level — the ONE file outside the tool dir, § 6.2;
  rule-of-three candidate) + `binary-release/cmake/cpack-hooks.cmake` — CPack/AppImage
  hooks, NOT auto-included (the default top-level configure stays byte-for-byte the
  cpp-strict build, so that green job is unperturbed). `sign/` no-op stubs (§ 4.3).
- `.github/workflows/binary-release.yml` — discover + build-and-validate matrix
  (auto-discovers both packages) mirroring cpp-strict's apt/uv/cmake steps + deploy
  GATED OFF (workflow_dispatch + confirm_deploy). `smoke/` 9 passed / 1 skipped.
- NO `packages/**` sim source, NO CMakeLists, NO tolerance.toml edits. FACT.

## §6 — §0.3 SHIFTs (landed reality wins)

| # | Plan/Appendix-C premise | MEASURED reality | SHIFT applied |
|---|---|---|---|
| S-1 | "run in a fresh Docker container" (STEP 5a) | **Docker ABSENT** in this env | Clean out-of-tree CMake build dir is the isolation boundary (analogous to 5.3's fresh-venv); perf label `binary-cmake-linux` (the plan's `binary-docker-<os>`, de-Docker'd) |
| S-2 | STEP-5a `python -m testkit.equivalence … --strict` CLI | FALSIFIED (R1; no `testkit` module; CLI is render-similarity only) | Programmatic `compare_captures(json, json)` |
| S-3 | (implicit) standard cmake | local **cmake 4.2.3** drops pre-3.5 policy compat the vendored doctest declares | `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` (no-op cache var on CI's older apt cmake — cpp-strict is green without it) |
| S-4 | §13-flag inheritance picks the binary pool | rd2d-stack-c shares a canonical whose `binary:false` is the WEB sim's flag | Qualify on CMake-capture-target + no-OWN-`binary:false`; reconciliation §C ratifies rd2d-stack-c |
| S-5 | matrix × {ubuntu, windows, macos} | bootstrap gate is lavapipe/linux-pinned (R-CPPB2); cpp-strict is ubuntu-only | Windows/macOS **DEFERRED-to-Phase-6**; no fake-passing win/mac cells emitted |
| S-6 | "sph-water" as the canonical 5.2 example | sph-water is Python-only (no CMake) | Canonical example = rd2d-stack-c (the real bit-exact CMake package) |

## §7 — §S.5 full CI sweep (this push)

- **Local pre-push (FACT):** smoke 9 passed / 1 skipped; ruff clean; ruff format clean;
  integrity `--all --mode strict` 0 HF / 14 SW rc 0; the full harness validate (clean
  build → run → judge) PASS for both packages; YAML valid; YAML/whitespace/ruff
  pre-commit hooks passed on both commits.
- **Post-push CI** for `627e683` (push to `main`, no tag): the always-on push-to-main
  suite ran. **`binary-release.yml` does NOT run on a bare main push** (it triggers on
  `push: tags ['bin-v*']`, path-scoped PRs, or `workflow_dispatch`), mirroring
  `pypi-release.yml`; the build-and-validate matrix is exercised LOCALLY (this session)
  + on a path-scoped PR / dispatch. The C++ build itself is covered by the always-on
  `cpp-strict` job. CI conclusion for `627e683`: **28/28 `success`, 0 failures** (FACT,
  public REST API) — `cpp-strict`, `integrity`, `equivalence`, `determinism`,
  `tolerance-budget-check`, `mutation-testing`, `structure`, `python-strict`, `ts-strict`,
  `audit-append-only`, and the per-sim `test-*` matrix all green.

## §8 — §R digest + render/variant hard gates (FACT)

- **§R integrity digest at close HEAD:** `9894964135e582fc3d94448f87bdf8d859a1ff29e3675a45fa04a7f04b40b15f`; invariant 0 HF / 14 SW.
- **render_similarity (0.9242) + variant (0.8702) HARD mutation floors: UNAFFECTED.**
  This sub-phase touched no `tools/testkit/render_similarity/` or
  `tools/testkit/equivalence/variant/` SOURCE (the change set = the new
  `binary-release/` tool tree, `cmake/Packaging.cmake`, `binary-release.yml`, two docs,
  the probe, the failing-tests evidence, and two `perf-ledger.md` rows). The mutation
  floors are promoted on unrelated source; baseline `test-render-similarity` is green
  on `f836b33` and the gates are not in this change set's blast radius. FACT/INFERENCE.

## §9 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt / plan) | Measured / reasoned | Disposition |
|---|---|---|---|
| C-1 | 2 real C++ packages (rd2d-stack-c full + cloth surrogate) | CONFIRMED exactly 2 via `find` + discover | matches reconciliation §C |
| C-2 | "run in a fresh Docker container" | Docker absent | **SHIFTED** — clean-build-dir isolation (S-1) |
| C-3 | rd2d-stack-c carries binary:true in §13 | it has NO own §13; the shared rd2d spec is the Stack-B sim (binary:false) | **SHIFTED** — qualify on CMake-capture-target + no-own-opt-out (S-4) |
| C-4 | matrix over 3 OSes | lavapipe/linux gate; cpp-strict is ubuntu-only | **SHIFTED** — win/macOS DEFERRED-to-Phase-6 (S-5) |
| C-5 | cloth payload checksum should match committed | re-emit `.h5` sha differs (R-CPPB2 cross-build) | informational, NOT gated; witness + PBT are the gate (§4) |
| C-6 | possible round-trip divergence → BLOCKED | rd2d bit-exact 0.0/0.0; cloth determinism+PBT PASS | no BLOCKED package; no tolerance widened |
| C-7 | binary-release.yml runs on push sweep | path/tag-gated; not on bare main push (like pypi-release) | matrix run LOCALLY + on PR/dispatch; cpp-strict covers the build |

## §10 — SURFACED for operator (decide / ratify)

1. **Windows + macOS binary builds — DEFERRED-to-Phase-6.** The bootstrap gate is
   lavapipe/linux-pinned (R-CPPB2 cross-build determinism). Phase-6 brings up per-OS
   software-Vulkan devices + the cross-build digest story + AppImage/zip/.app packaging.
2. **macOS unsigned (§ 4.3)** — go-live ships unsigned; `xattr -d com.apple.quarantine`
   runbook documented. Apple Developer cert is an operator action before signing.
3. **`cmake/Packaging.cmake` rule-of-three** — the one file outside the tool tree;
   candidate for promotion if other sub-phases need top-level packaging (§ 6.2).
4. **The four Python-only `binary:true` canonicals** (sph-water, eulerian-smoke,
   lattice-boltzmann-d3q19, reaction-diffusion-3d) — their §13 `binary:true` is
   aspirational (no C++ port). Confirm they remain DEFERRED until a Stack-C port exists
   (then auto-discovered by adding a `BINARY_ROUTING` entry).

## §11 — Closing

Sub-phase 5.2 (binary-release) build-and-validate is COMPLETE; verdict **SHIFTED**. The
full live pool of **2 qualifying Stack-C CMake packages** was driven through the spec
§ 3.8 bootstrap gate: **2 PASS** — `reaction-diffusion-2d-stack-c` capture_roundtrip
BIT-EXACT 0.0/0.0 (22 fields) and `mass-spring-cloth` witness + PBT surrogate (in-binary
2-run determinism + both Hypothesis invariants). The four Python-only `binary:true`
canonicals are correctly DEFERRED (no CMake → routed to 5.3, not binary-built). Six
honest §0.3 SHIFTs from the Appendix-C recipe are documented (no Docker → clean-build-dir
isolation; cmake≥4.0 policy flag; programmatic compare_captures; CMake-capture-target
qualification; Windows/macOS deferred; canonical example rd2d-stack-c). Integrity held
0 HF / 14 SW across every edit; no tolerance was widened, no surrogate fabricated, no
round-trip divergence hidden. The **deploy job stayed gated OFF** (no Release, no
publish). The render_similarity (0.9242) + variant (0.8702) HARD floors are UNAFFECTED.
This sub-phase changed NO sim code (packaging/build/CI only) and pushed NO tag (I7).

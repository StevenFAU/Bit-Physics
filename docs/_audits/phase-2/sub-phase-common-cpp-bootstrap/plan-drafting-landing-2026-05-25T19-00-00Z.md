---
artifact: plan-drafting-landing
artifact_id: sub-phase-common-cpp-bootstrap-plan-drafting
stage: plan-drafting
phase: 2
date: 2026-05-25T19-00-00Z
head_sha: <COMMIT-3-SHA — back-filled per Convention #12>
head_sha_at_checkpoint: a33cb0b21ea2b4cfba43aac6be26d847635cc843
verdict: CONFIRMED — charter dispatchable; D1-D6 ratified + D7-D14 surfaced; 6-stage decomposition; 223 → 229 shifts
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/plan-drafting-probe-2026-05-25T19-00-00Z.md
  - docs/phases/sub-phase-common-cpp-bootstrap.md
---

# Plan-drafting landing — `common-cpp-bootstrap` (Stack-C / Vulkan-C++ workspace surface)

PRECONDITION sub-phase (RD-2D-Stack-C enabler). Plan-drafting CONFIRMED: probe verified
common-cpp's immaturity at HEAD as the SCOPE (not a Hard-Rule-2 blocker), refined the
`8605a31` 6-stage decomposition with probe-time research (lavapipe + HDF5), and committed
the charter. Operator routes D7–D14, then dispatches Stage 0.

---

## § 1. Deliverables + commit SHAs

| # | Artifact | Commit | head_sha (back-filled) |
|---|---|---|---|
| 1 | `plan-drafting-probe-2026-05-25T19-00-00Z.md` | COMMIT 1 — `docs(common-cpp-bootstrap-plan-drafting): plan-drafting probe report` | `<COMMIT-1-SHA>` |
| 2 | `docs/phases/sub-phase-common-cpp-bootstrap.md` (charter) | COMMIT 2 — `docs(common-cpp-bootstrap-plan-drafting): sub-phase charter` | `<COMMIT-2-SHA>` |
| 3 | `plan-drafting-landing-2026-05-25T19-00-00Z.md` (this file) | COMMIT 3 — `docs(common-cpp-bootstrap-plan-drafting): plan-drafting landing audit` | `<COMMIT-3-SHA>` |
| 4 | `plan-drafting-sha-back-fill-2026-05-25T19-00-00Z.md` | COMMIT 4 — `chore(common-cpp-bootstrap-plan-drafting-sha-backfill): …` | (ledger; own commit not back-filled) |

The charter (COMMIT 2) is a `docs/phases/` plan and carries **no `head_sha` front-matter**
(plans are not audits — common-warp-bootstrap precedent); its closing-commit SHA is
recorded in the ledger for the chain, not back-filled into the file.

## § 2. Verdict + load-bearing finding

**CONFIRMED — charter dispatchable.** common-cpp NOT-MATURE re-confirmed at HEAD (probe
§ 4); this is the sub-phase's SCOPE, not a Hard-Rule-2 STOP (the STOP fired at RD-2D-
Stack-C, surfacing THIS precondition; here the immaturity is the work). The `8605a31`
6-stage decomposition holds; refinements landed (D3 HDF5 lighter-path, D4 lavapipe
sharpened, new SPIR-V toolchain + C++ CI scope). No new blocking gap.

## § 3. D-class routing (D1–D14)

D1–D6 RATIFIED at dispatch (probe § 3 verified the leans; D3/D4 refined). D7–D14 surfaced
for operator routing (probe § 16; charter § 9):

| D | Verdict |
|---|---|
| D1 name / D2 bootstrap / D5 quirks-catalog / D6 CMake-not-uv | RATIFIED, verified. |
| D3 HDF5 | RATIFIED + refined → system `libhdf5-dev` + header-only HighFive (`highfive-devs`) (S-CPPB2). |
| D4 lavapipe | RATIFIED + sharpened → `LP_NUM_THREADS=0` + `NoContraction`; f32-vs-f32; shaderFloat64 runtime-probed (S-CPPB1). |
| D7 cpp.md de-scaffold | YES. |
| D8 HighFive over C-API | lean. |
| D9 SPIR-V toolchain (glslang) | lean (S-CPPB4). |
| D10 C-Gates C-0..C-7 | lean. |
| D11 next = RD-2D-Stack-C refresh | lean. |
| D12 NO TAG | standing. |
| D13 determinism baseline-digest method | minimal ephemeral dispatch ×2, readback sha256. |
| D14 lavapipe selection | `VK_DRIVER_FILES` + `LP_NUM_THREADS=0`. |

## § 4. Probe inventory summary (HEAD-verified)

- common-cpp scaffold re-read at HEAD; gap→deliverable map verified (probe § 4).
- common-warp § 1.9.1 socket + testkit capture-v1 HDF5 layout read as the analog/format
  targets (probe § 4/§ 7).
- lavapipe + HighFive/HDF5 web-researched at probe time (probe § 6/§ 7/§ 17).
- common-warp-bootstrap charter read as the structural template (mirrored in § 1–§ 10).
- parent-doc sha256 anchors recorded (probe § 2).

## § 5. Plan-drafting shifts surfaced (S-CPPB*)

| Shift | Description |
|---|---|
| S-CPPB1 | lavapipe `shaderFloat64` UNDOCUMENTED → runtime-probe Stage 0; refines D4 (f32-vs-f32 validated for RD-2D; f64 future-port banked). |
| S-CPPB2 | D3 HDF5 refined from "vendor" to **system `libhdf5-dev` + header-only HighFive** (FetchContent) — lighter path (avoids ~25 MB / minute full vendor). |
| S-CPPB3 | HDF5 compat target sharpened to the **testkit capture-v1 layout** (common-warp delegates to the testkit writer, not hand-rolled h5py); cross-language round-trip; bar = parse-equality, not `.h5` byte-equality. |
| S-CPPB4 | **SPIR-V compilation toolchain** (glslang/glslc, build-time GLSL→SPIR-V) is net-new build scope, absent from the `8605a31` sketch. |
| S-CPPB5 | **New C++ CI workflow** needed (no existing `.github/workflows/*` references C++/CMake/Vulkan). |
| S-CPPB6 | **S-RD2C2 correction** — the RD-2D-Stack-C "architecture-sha drift `e82b7b8e`→`2aa8f227`" was a hash-function-mismatch false positive (sha256-of-content vs git-blob-sha1 of the same unchanged file); architecture.md did NOT drift (probe § 17). Banked B-CPPB1. |

**Cumulative shifts: entering 223 → this plan-drafting 6 (S-CPPB1..S-CPPB6) → 229.**

## § 6. Blocking-dependency + drift assessment

- **No blocking dependency** beyond the (in-scope) common-cpp immaturity. The Vulkan
  toolchain (lavapipe, glslang, libhdf5) is an environment dependency verified at Stage 0,
  not a plan-drafting blocker.
- **Hard Rule 2 NOT triggered** as a blocker — the immaturity is the work to do.
- **Replay invariant + integrity baseline:** not re-run (doc-only additive stage). HELD as
  of RD-2D-Stack-C; Stage-0 Task 0.0 re-asserts.
- **Drift surfaced:** the S-RD2C2 hash-function-mismatch correction (S-CPPB6 / B-CPPB1) +
  the dangling `_staging/deps.md` reference (B-RD2C1, to be resolved at C-5 cpp.md de-scaffold).

## § 7. verify-self-check

- **Additive-only (Convention A):** probe + charter (`docs/phases/`) + landing + ledger; 0 source edits. ✓
- **Convention M:** entering HEAD `a33cb0b` re-verified; sha256-of-content anchors recorded; **architecture-sha correction (cite sha256, not blob-sha1)** surfaced. ✓
- **Convention #8:** FACT/INFERENCE/SHIFTED tagged; common-cpp + common-warp + testkit read at HEAD; lavapipe/HDF5 web-fetched + cited (probe § 17). ✓
- **Convention #12 / N1:** four-commit chain (probe / charter / landing / sha-back-fill); back-fill SEPARATE; never `--amend`; ledger N1-enumerates placeholders (charter carries none). ✓ (COMMIT 4).
- **Terminal discipline:** NO push, NO tag (operator action; D12). ✓

## § 8. Cleanup-banked inventory (§ 13 form — carry-in + new)

**Carry-in (RD-2D-Stack-C landing § 8 + LBM-E § 13 + smoke-E § 13) — NOT acted:** S0-LBME1
dispatch-hygiene; `uv sync --all-packages` prune nuance; methodology § 6 header staleness;
warp.md § 6.1 "predictions pending" stale line; stray `taylor-green` captures (still
untracked in this tree); integrity baseline-digest derivation undocumented; missing
CHANGELOG entries (smoke-D / common-warp-bootstrap / mpm-E); methodology § 6 "Fifth-pair"
+ conventions § L.7 attribution titles; D17 (2D-ref re-characterization); B-RD2C2 (RD-2D
canonical-descriptor discrepancy 512sq/step1000 vs 128sq/step2000); B-RD2C3 (cpp.md
de-scaffold pointer). STAY-BANKED.

**NEW (surfaced this stage):**
- **B-CPPB1 — S-RD2C2 architecture-sha false positive.** The RD-2D-Stack-C landing
  (`f772f71`, append-only — not editable) recorded a spurious "architecture-sha drift";
  it was sha256-of-content (`e82b7b8e…`, unchanged) vs git-blob-sha1 (`2aa8f227…`) of the
  same file. Cleanup: a one-line convention note — "doc anchors cite sha256-of-content;
  never compare against `git rev-parse` blob hashes." Cross-refs the integrity
  baseline-digest-method bank item (both are sha256-derivation hygiene).
- **B-RD2C1 (re-affirmed) — dangling `common/common-cpp/_staging/deps.md`.** To be
  resolved at C-5 (cpp.md de-scaffold) — create the deps file or drop the reference.

## § 9. Next step

Operator routes D7–D14, then dispatches **Stage 0** (pre-flight: lavapipe install +
shaderFloat64 probe + SPIR-V toolchain + determinism baseline digest + § N
scope-analysis). On bootstrap landing (all stages), RD-2D-Stack-C plan-drafting REFRESHES
(D11; the held probe `f772f71` re-runs against the matured common-cpp), then RD-2D-Stack-C
executes → spec § 11.3 enumeration closes → comprehensive cleanup sub-phase routes with the
full Phase-2 banked inventory.

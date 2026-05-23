# Capture-Determinism-Contract — Sub-Phase Charter (Second spec-Phase-2 Sub-Phase)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — **portfolio-wide contract-redesign sub-phase** establishing the canonical determinism contract (content-equivalent over a normalized capture-payload projection) ahead of any further Stack-D port work.
> **Sub-phase identity:** SECOND spec-Phase-2 deliverable. SUPERSEDES the Taichi-integration landing's § 10 next-sub-phase recommendation (RD-2D → Stack D) because the determinism contract is structurally upstream of any per-sim cross-stack port. Mirrors `sub-phase-conventions-refactor-post-phase-1` shape — portfolio-wide consolidation — adapted from doc-refactor surface to contract-redesign surface. This is NOT a per-sim implementation sub-phase. This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries (N a single integer). No `-phase-N` tag is proposed for this sub-phase.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.5 (Determinism harness — primary amendment site), 2.6 (Cross-stack equivalence — must remain consistent with new same-stack contract), 2.7 (Capture format — `payload.checksum` semantics + light description-only edit), 7.12 (phase-tag form), 7.13 (sub-phase artifact type).
> **Parent conventions doc** (authoritative for every spec-Phase-2 sub-phase): `docs/conventions/sub-phase-conventions.md` (sha256 `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734` — verified at HEAD per plan-drafting-probe § 1). Inherits role model, audit / append-only discipline, checkpoint discipline, Convention #12 SHA back-fill, replay-chain non-participation, FACT / INFERENCE tagging by REFERENCE.
> **Parent sub-phase templates** (structure inheritance):
> - `docs/phases/sub-phase-conventions-refactor-post-phase-1.md` (PRIMARY — portfolio-wide consolidation template; closest existing analog for contract-redesign).
> - `docs/phases/sub-phase-taichi-integration.md` (SECONDARY — most-recent prior sub-phase; spec-Phase-2 audit-dir conventions).
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Spec-Phase-1 landed at `v0.1.0-phase-1` (SHA `9998bc1`); landing audit `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` verdict CONFIRMED.
> - All 9 Phase-1 sims GREEN through gates 4-13 (Taichi-integration landing § 5 325-test cross-package sweep).
> - 13 sub-phase landings + 5 hotfix landings carried; conventions-refactor landed at `e2dc789`; Taichi-integration (FIRST spec-Phase-2 sub-phase) landed at `cf7d5535e96274084dade333a97135799807418b` per Stage 2 SHA back-fill `412b1b9`.
> - Conventions doc stabilised at sha256 `3698d19b…2bd734` (FACT — conventions-refactor landing § 3.2; Taichi-integration landing § 4 anchor row 1).
> - Bit-identity replay invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` held byte-identically across **17 invocations** through Taichi-integration Stage 0 (FACT — Taichi-integration landing § 11 "17th invocation").
> **Inherited shifts:** **99 documented entering this sub-phase** (FACT — Taichi-integration landing § 8.4: 97 + N6 + N7 = 99). Carried forward by reference; not re-stated, not re-litigated.
> **Plan-drafting-probe report:** `docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-2026-05-23T15-37-24Z.md`. Read FIRST. Authoritative for the exhaustive byte-equality test inventory (§ 2 of the probe), 9-sim determinism-contract inventory (§ 3), h5wasm 0.10.1 surface inventory (§ 4), spec amendment scope (§ 5), Phase 4 WU-A compatibility (§ 6), D1-D5 surface preview (§ 8), and the new shifts surfaced at plan-drafting (§ 9).
> **Date drafted:** 2026-05-23.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1-D5 routing.

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase IS

A **portfolio-wide capture-determinism-contract redesign**, replacing the current implicit byte-equality contract (raw HDF5 file sha256) with an explicit content-equivalent contract (parsed Capture array equality, with wall-clock-influenced storage-format metadata excluded).

The sub-phase ships:

1. **Canonical determinism-equivalence harness** — single source of truth for "two captures of the same sim at the same seed are equivalent." Python API and TypeScript API; both surface the same semantic contract under the same naming. **Substantially reuses** `tools/testkit/determinism/harness.py::run_twice_and_diff` which already parses Capture objects and compares NumPy arrays via `np.array_equal` (FACT — probe § 2.3); rename + docstring update + cross-language extension.
2. **Per-test refactor** of the 3 VULNERABLE tests identified in the probe inventory: V1 `common/common-ts/examples/hello-physics/hello-physics.test.ts:22-28`; V2 `packages/lattice-boltzmann-d3q19/tests/test_determinism.py:50-71`; V3 `packages/mpm-multimaterial/tests/test_determinism.py:45-65`. Each transitions from byte-equality (`Buffer.equals` / `_sha256_of_file`) to content-equivalence via the harness. The GUARANTEE each test verifies (same-stack same-hw run-to-run reproducibility) is PRESERVED; the MECHANISM (raw-file sha256 vs harness-projected array equality) changes.
3. **Source-level capture-writer fixes (defense-in-depth)** — `tools/testkit/capture/writer.py` sets `track_times=False` on the h5py.File + each `create_group` + `create_dataset` call; `common/common-ts/src/capture.ts`'s CaptureWriter patches `Module._emscripten_date_now` for the duration of the write window. These are belt-and-suspenders alongside the contract amendment — they eliminate the latent flake at the source even though the harness-based contract makes them non-load-bearing.
4. **Spec amendment** at `docs/architecture.md` § 2.5 (Determinism harness — PRIMARY contract wording site) + § 2.7 (Capture format — `payload.checksum` semantics clarification). Candidate wordings surfaced at D2 (§ 11.5); operator routes.
5. **`tools/testkit/schemas/capture-v1.json` description-only amendment** of the `payload.checksum` field semantics; field-shape unchanged unless operator picks "sibling content_checksum" at D2 sub-decision.
6. **Conventions doc additive amendment** at `docs/conventions/sub-phase-conventions.md` § F.3 (Bit-identical vs FP-equivalent row wording) + § A.2 (gate-11 cross-reference). Additive per the established conventions-doc-is-editable posture (conventions-consolidation `34c7d34` + conventions-refactor `e2dc789` precedents). **D5 verdict: no blocking dependency on a conventions-refactor-v2 sub-phase** (per probe § 8.5).
7. **CI gate redesign** — extend ts-strict + Python-strict workflows to enforce the new harness-based determinism contract project-wide. Replaces the implicit byte-equality assumption that produced the CI failure on hello-physics.test.ts post-Taichi-integration push to main.
8. **Cross-package regression sweep template extension** — operationalize the Stage 1 N6/N7 banked precedents (Taichi-integration landing § 8.3) into the conventions doc § B sweep-template addendum (additive). Stack-B + Stack-D + Stack-C (when surfaced) all fan-out under the new contract.
9. **CHANGELOG + `docs/dependencies.md` additive entries** documenting the contract redesign + harness API + new project-wide invariant.

(FACT — anchored against probe § 2-§ 7.)

### § 1.2 What this sub-phase is NOT

- A new spec-phase. The next spec-phase tag per spec § 7.12 is `v0.2.0-phase-2`; this sub-phase's commits accumulate to `main` without a `-phase-N` tag (see § 11.4).
- A per-sim Stack-D port. RD-2D / SPH-water / eulerian-smoke / LBM Stack-D ports are subsequent sub-phases that consume this sub-phase's contract.
- A new-sim introduction. The 9 Phase-1 sims surface unchanged.
- A hotfix (single-session repair). The portfolio-wide blast radius — 3 tests refactored + harness API rename + spec § 2.5 amendment + conventions doc amendment + 2 CaptureWriter source-level fixes + CI workflow extension — exceeds the focused-infrastructure-hotfix shape's scope (cf. `sub-phase-numba-integration` repair `569c883`). Three-stage cadence is the right shape.
- A new sim spec authoring. Sim spec-refs unchanged.
- A widening of any tolerance budget. `tools/testkit/equivalence/tolerance-budget.toml` `[budgets.*]` rows untouched.
- A renumbering of existing ICs (IC-1 through IC-12). The new ICs this sub-phase produces are IC-13 + IC-14 per § 3.2.
- An edit of any Phase 0, Phase 1, post-Phase-1, or Taichi-integration audit file. Audit chain is append-only per conventions doc § B.1.
- Editing any of the 14 protected-set SHAs' content (Phase 0 + Phase 1 + 13 prior sub-phase landings) in a non-additive way.
- Re-litigating the Taichi-integration CONFIRMED verdict. Taichi-integration is fully landed; this sub-phase consumes its outputs (common-py workspace adoption, hello-physics smoke surface as the V1 refactor site).
- Pre-committing D1 / D2 / D3 / D4 / D5. Those are operator decisions surfaced at § 11.5 for routing at charter close.

### § 1.3 Phase-1 + Taichi-integration inputs + 99 cumulative shifts inherited

(FACT — Taichi-integration landing § 8.4; conventions-refactor landing § 8.3 + § 9.3 row 5.)

**Closing posture this sub-phase inherits:**
- All 9 Phase-1 sims GREEN through gates 4-13.
- 99 cumulative shifts recorded across the audit chain (89 entering spec-Phase-2 + 3 plan-drafting + 1 Stage 0 + 4 Stage 1 + 2 Stage 2 from Taichi-integration).
- Bit-identity replay invariant `9399fc33…909f34` (17+ invocations).
- Conventions doc stabilised at `3698d19b…2bd734`.
- common-py is a first-class workspace member (Taichi-integration Stage 1 STEP 1; D2 row 2 RESOLVED).
- Taichi is workspace-accessible (`taichi>=1.7,<2.0` at `common/common-py/pyproject.toml`).
- Hello-physics smoke surface exists at `common/common-ts/examples/hello-physics/` — this is the V1 refactor site.

**Banked items consumed by THIS sub-phase** (D2 disposition; see § 11.2 for full table):
- **None marked SCOPED IN until D2 routes the candidate-wording selection.** The probe identifies the contract-redesign as the central deliverable; banked items 5 (evidence_paths LFS) and 7 (verify_evidence empty-file rejection) may interact with the harness build but are NOT in this sub-phase's scope.

**Banked items DEFERRED** (D2 disposition; see § 11.2):
- Testing-improvements sub-phase (separate banked-chat owner).
- Cross-stack verification methodology (first Stack-C-to-Stack-D port sub-phase).
- evidence_paths strict-verify LFS remediation (separate focused infrastructure hotfix).
- Mid-Phase-1 capture regeneration (per-sim work).
- The 4 Stack-D port sub-phases (RD-2D, sph-water, eulerian-smoke, LBM) consume this sub-phase's contract.

### § 1.4 Sub-phase-specific posture — the determinism contract semantics

#### § 1.4.1 The contract this sub-phase redefines

(FACT — current spec § 2.5 line 377; probe § 5.1 for the load-bearing wording site.)

**At HEAD** the spec says: *"A simulation is deterministic if it produces bit-identical output when run twice with the same seed on the same hardware."* The phrase "bit-identical output" is ambiguous between (a) raw capture-file byte equality and (b) content-projection equality. The hello-physics.test.ts CI failure proved (a) is unstable in practice (HDF5 OHDR mtime fields cross second boundaries; h5wasm 0.10.1's `H5Pset_obj_track_times` is absent from the WASM blob). (b) is what the Python `run_twice_and_diff` harness already implements (FACT — probe § 2.3; `np.array_equal` on parsed Capture arrays).

**The redesigned contract** (precise wording surfaced at D2 — § 11.5):
- Determinism is **content-equivalent** over a normalized projection of the capture payload.
- The normalization **explicitly excludes** storage-format metadata that is wall-clock-influenced (HDF5 object-header timestamps, file-system mtime, compression headers, library-version banners).
- The canonical mechanism is `tools/testkit/determinism::run_twice_and_diff` (Python) / `@bit-physics/common-ts::runTwiceAndDiff` (TypeScript).
- The mechanism is the SINGLE SOURCE OF TRUTH for "two captures of the same sim at the same seed on the same hardware are equivalent."

#### § 1.4.2 Equivalence-mechanism asymmetry posture

(FACT — probe § 4: h5py exposes `track_times=False`; h5wasm 0.10.1 does NOT expose `H5Pset_obj_track_times`.)

The canonical harness MUST produce equivalent verdicts from both Python and TypeScript paths even with this surface asymmetry. **Mechanism:** the harness contract is defined OVER the Capture data model (parsed steps × state × diagnostics), NOT over the underlying HDF5 file format. Both Python (via h5py read) and TypeScript (via h5wasm read) project to the same Capture structure; comparison is over the projected structure. **Storage-format asymmetry is invisible to the contract.**

The source-level fixes (defense-in-depth § 1.1 item 3) ALSO produce byte-identical files on both sides — Python via `track_times=False`, TypeScript via `_emscripten_date_now` shim. Two layers of guarantee: contract-level (harness API) + source-level (writer determinism). Either alone would fix hello-physics.test.ts; both together is principled.

#### § 1.4.3 Cross-stack equivalence interaction with spec § 2.6

(FACT — spec § 2.6 cross-stack tolerance table at architecture.md:404-414.)

Cross-stack equivalence (Stack-B vs Stack-C vs Stack-D vs Stack-E) is governed by spec § 2.6's per-sim tolerance table (bit-exact / epsilon / distributional). **The new same-stack contract MUST remain consistent with the cross-stack posture.**

Specifically: cross-stack tests already use `diff_captures` in epsilon mode against committed cross-stack-tolerance values from `tools/testkit/equivalence/tolerance.toml`. Those tests are content-equivalent at non-zero tolerance and were ALREADY immune to the HDF5-OHDR-mtime flake (they parse Capture objects). **No cross-stack test refactor is required.** The new same-stack content-equivalent contract slots in cleanly as "same-stack same-hw is the bit-exact (zero-tolerance) special case of the cross-stack content-equivalent posture, computed over the same Capture projection."

#### § 1.4.4 Phase 4 WU-A round-trip-claim consistency

(FACT — probe § 6; phase-4-plan.md:1590 verbatim.) WU-A's "every state array preserved bit-for-bit; every manifest field preserved" claim is content-level. The new contract is consistent. **No Phase 4 amendment required.**

### § 1.5 Role model, conventions, audit discipline

Inherited from conventions doc § A.3 + § C + § B verbatim. Single Claude Code agent at a time; single Claude.ai coordinator chat; one operator. Convention #12 SHA back-fill at every stage close per § B.2 tightened-discipline rule (full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed from earlier conversation context).

### § 1.6 Architecture — three stages

Adopts the three-stage cadence (Stage 0 pre-flight / Stage 1 implementation / Stage 2 landing) per conventions doc § A.2. **Rationale for three-stage rather than single-repair-audit (numba-integration-hotfix shape):**

- The hello-physics CI failure is a STRUCTURAL gap, not a localized bug. The fix touches Python harness + TS harness (new) + 3 tests across 2 sims + 1 TS example + spec § 2.5 + spec § 2.7 + capture-v1.json + conventions doc § F.3 + § A.2 + CI workflows + CHANGELOG. This blast radius is the portfolio-wide-consolidation shape (cf. conventions-refactor), not the focused-infrastructure-repair shape.
- Plan-drafting in advance (this charter) is appropriate; cross-phase replay against `v0.1.0-phase-1` is the right Stage 0 pre-flight discipline; the per-test refactor + harness build is the right Stage 1 surface; the landing-audit at Stage 2 properly closes convergence-file edits (spec / conventions doc / CHANGELOG / dependencies.md) under a single dedicated landing session.

- **Stage 0 — Pre-flight.** Cross-phase replay against `v0.1.0-phase-1` (18th invocation); tolerance-budget carryover; re-verify all 9 Phase-1 sims' RED evidence sha256; ratify the probe inventory empirically (re-run boundary-delay probe; re-grep for byte-equality patterns to confirm 3 VULNERABLE / 7 IMMUNE / 0 UNCLEAR at HEAD); identify any blocking dependencies that may have surfaced between probe authoring and Stage 0 dispatch; Stage 0 checkpoint audit + Convention #12 SHA back-fill.
- **Stage 1 — Implementation.** Harness build (Python rename + TS-side new) + source-level CaptureWriter fixes (Python + TS) + per-test refactor of V1/V2/V3 + spec § 2.5 + § 2.7 + capture-v1.json + conventions doc § F.3 + § A.2 amendments + CI gate redesign. Default monolithic; D1 routes Stage 1a/1b/1c decomposition if dispatch-time surface argues otherwise. Stage 1 checkpoint audit + Convention #12 SHA back-fill.
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive, `docs/dependencies.md` additive); full integrity sweep (Cat 1 / 2 / 3 / 4 / 5 / X); cross-package regression sweep at portfolio scale (Python + TypeScript fan-out — Stack-B and Stack-D); evidence-path verification; append-only check; sub-phase landing audit; Convention #12 SHA back-fill. **No `-phase-N` tag is prepared** — see § 11.4 for tag posture.

---

## § 2. Deliverables

The deliverable list is derived from the plan-drafting-probe report § 2-§ 7 + the canonical conventions doc + spec § 2.5 + § 2.7 + capture-v1.json + the closest existing analogue (`sub-phase-conventions-refactor-post-phase-1` 8-item table; portfolio-wide consolidation template).

| # | Deliverable | Acceptance |
|---|---|---|
| 1 | **Spec § 2.5 amendment** (PRIMARY contract wording site) | Wording per D2 routing (candidate-wordings D2-a / D2-b / D2-c surfaced at § 11.5; operator picks). Cross-reference to the new harness API + the new conventions doc § F.3 row. |
| 2 | **Spec § 2.7 amendment** + **`tools/testkit/schemas/capture-v1.json` description-only amendment** | `payload.checksum` semantics clarified per D2 sub-decision (probe lean: keep raw-file sha256, ADD description note that it is informational and that the contract lives at the harness). Field-shape unchanged unless operator picks "sibling content_checksum" (which requires schema_version bump + WU-A coordination — separate D2 sub-decision). |
| 3 | **Canonical Python harness** at `tools/testkit/determinism/harness.py` (rename + extend) | `run_twice_and_diff` renamed mechanism: `DeterminismVerdict.bit_exact` → `DeterminismVerdict.content_equivalent`; docstring updated to reflect content-equivalent contract; module-level `policy.md` updated; backward-compat shim retains the old field name for one minor version (with `DeprecationWarning`) per Convention A spirit. Acceptance: all 7 existing IMMUNE tests pass under the renamed API; 2 new tests verify the contract semantics on synthetic vulnerable-input Captures. |
| 4 | **Canonical TypeScript harness** at `common/common-ts/src/determinism/{captureReader.ts, diffCaptures.ts, runTwiceAndDiff.ts, index.ts}` (NEW) | TypeScript API mirror of the Python harness. `runTwiceAndDiff(runner, { seed, tmpDir })` returns `DeterminismVerdict { contentEquivalent, detail }`. Same semantic contract. Acceptance: new tests at `common/common-ts/src/determinism/__tests__/` verify the contract semantics. |
| 5 | **`tools/testkit/capture/writer.py` source-level fix** (defense-in-depth) | `h5py.File(..., "w", libver="earliest")` + `track_times=False` on every `create_group` + `create_dataset` + `meta_g` attrs. Acceptance: two consecutive `write_capture` calls at the same Capture data produce **byte-identical .h5 files at the same Unix instant AND across different Unix instants** (the second part is the new claim). Verified via 1 new test under `tools/testkit/capture/tests/`. |
| 6 | **`common/common-ts/src/capture.ts` source-level fix** (defense-in-depth) | `CaptureWriter.finalize` patches `Module._emscripten_date_now` (or `Date.now` via `Module.preRun`, per Stage 1 routing) for the write window. Acceptance: two consecutive `CaptureWriter.finalize` calls at the same data produce byte-identical .h5 files at the same Unix instant AND across different Unix instants. Verified via 1 new test under `common/common-ts/src/__tests__/`. |
| 7 | **Per-test refactor of V1** — `common/common-ts/examples/hello-physics/hello-physics.test.ts:22-28` | `payloadA.equals(payloadB)` replaced by `runTwiceAndDiff` → `expect(result.contentEquivalent).toBe(true)`. GREEN at CI; CI flake eliminated. |
| 8 | **Per-test refactor of V2** — `packages/lattice-boltzmann-d3q19/tests/test_determinism.py:50-71` | `_sha256_of_file` removed; test body invokes `run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=tmp_path)` and asserts `verdict.content_equivalent`. GREEN. |
| 9 | **Per-test refactor of V3** — `packages/mpm-multimaterial/tests/test_determinism.py:45-65` | Same pattern as V2. GREEN. |
| 10 | **Conventions doc § F.3 + § A.2 amendment** | § F.3 "Bit-identical run-to-run" row reworded to "Content-equivalent run-to-run" with cross-reference to the new spec § 2.5 wording + new harness API; § A.2 Stage 1 deliverable enumeration adds a cross-reference to the gate-11 mechanism being the harness. Additive only per conventions-doc-is-editable posture; D5 verdict: NO blocking dependency. |
| 11 | **CI gate redesign** | `.github/workflows/ts-strict.yml` (or current name) extended to invoke the new TS determinism gate via `pnpm vitest run common/common-ts/src/determinism/`; `.github/workflows/python-strict.yml` (or current name) extended similarly for the Python harness's own test suite + project-wide invocation across the 9 sims' refactored determinism tests. D4 routing: strict-fanout (default lean) vs phased (alternative). |
| 12 | **Cross-package regression sweep template extension** | Conventions doc § B audit-template addendum (additive sub-section) documenting the Python + TypeScript fan-out shape established at this sub-phase; consumed by every subsequent sub-phase's Stage 2 sweep step. |
| 13 | **CHANGELOG additive entry** | `### sub-phase-capture-determinism-contract` heading under `[Unreleased]`. Itemizes contract redesign + harness API (Python + TS) + 3-test refactor + 2 source-level fixes + spec § 2.5 + § 2.7 amendments + capture-v1.json description update + conventions doc § F.3 + § A.2 amendment + CI gate redesign + zero-regression sweep. |
| 14 | **`docs/dependencies.md` additive entry** | Records the new canonical determinism-equivalence-harness module surfaces (Python + TS); cross-references the new contract wording. |

**Acceptance for "sub-phase complete":** all 14 deliverables GREEN; integrity sweep clean (aspirational bit-identity to `810cd6e3…23411f98` baseline); cross-package sweep GREEN at portfolio scale (Python + TypeScript); landing audit committed; SHA back-fill committed. **No `-phase-N` tag is pushed**; optional non-phase point-release tag (e.g., `v0.1.10`, no suffix) banked operator decision at Stage 2 close.

---

## § 3. Interface contracts

### § 3.1 ICs consumed (existing, not redefined)

(FACT — Phase 1 charter § 3.9 IC catalog + Taichi-integration § 3.2 IC-11 + IC-12.)

- **IC-2 (capture I/O Python)** — `common_py.capture.{Reader, Writer}`. Source-level fix at deliverable 5 augments the Writer; Reader unchanged.
- **IC-4 (determinism config Python)** — `common_py.determinism.Config + add_args + from_args`. Unchanged.
- **IC-11 (Stack-D Taichi init wrapper)** — Taichi-integration deliverable. Unchanged.
- **IC-12 (Taichi convention doc)** — Taichi-integration deliverable. Unchanged.

### § 3.2 New ICs produced

| IC | Surface | Load-bearing for |
|---|---|---|
| **IC-13 (new — content-equivalence contract semantics)** | The canonical statement of "two captures are determinism-equivalent" at spec § 2.5 + conventions doc § F.3, expressed over the Capture data model with explicit metadata-exclusion clause. Tool-agnostic. | Every future sub-phase shipping a determinism gate (gate 11) consumes IC-13 by reference. Every cross-stack equivalence claim builds on it. Every Phase 4 schema-bump round-trip claim is parameterized by it. |
| **IC-14 (new — determinism-harness API, Python + TS)** | `tools/testkit/determinism::run_twice_and_diff` (Python) + `@bit-physics/common-ts::runTwiceAndDiff` (TypeScript). Both return a `DeterminismVerdict { content_equivalent, detail }` shape. | Every project-wide determinism test consumes IC-14 directly. Cross-language test parity established. |

Numbering convention per Taichi-integration § 3.2: IC-11 / IC-12 (Taichi-integration) → IC-13 / IC-14 (this sub-phase). Subsequent sub-phases continue IC-15+.

---

## § 4. Stage decomposition

### § 4.0 Stage decomposition rationale

Three-stage cadence per § 1.6 above. Single-stage (Stage 1a / Stage 1b / Stage 1c) decomposition for the implementation surface is **NOT warranted by default** because the harness build + source-level fixes + per-test refactor + spec amendment + CI gate redesign are a single coherent surface; splitting them creates artificial commit-boundaries without reducing risk.

**Sub-decomposition trigger (D1 alternative — § 11.5):** if dispatch-time inspection of the TypeScript Capture surface shows the new TS harness build is unexpectedly large (e.g., type-safety scaffolding around h5wasm's read surface inflates the surface beyond +500 lines net), Stage 1 splits into:
- **Stage 1a — Harness build (foundation).** Python rename + TS harness from scratch + both CaptureWriter source-level fixes. Single commit.
- **Stage 1b — Per-test refactor + spec amendment (consumers).** V1 + V2 + V3 refactor; spec § 2.5 + § 2.7 + capture-v1.json + conventions doc § F.3 + § A.2 amendments. Single commit.
- **Stage 1c — CI gate redesign + convergence (closing).** CI workflow extension + CHANGELOG + dependencies.md additive entries. Single commit.

Each sub-stage gets its own checkpoint commit per conventions doc § A.4. Default lean: **monolithic Stage 1**; split only on dispatch-time operator routing OR on Stage 0 finding of unexpected TS-harness scaffolding cost.

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay** (8-gate canonical set against `v0.1.0-phase-1`).
  ```
  uv run python -m integrity.scripts.replay_prior_phase \
    --prior-phase phase-1 \
    --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
    --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
  ```
  **18th invocation** of bit-identity invariant `9399fc33…909f34`. Exit 0 + sha256 match → proceed. Mismatch → BLOCKED per playbook P20; write `docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-blocked-replay-<UTC>.md`; surface; stop.

- **Task 0.1 — Tolerance-budget carryover.** Edit `tools/testkit/equivalence/tolerance-budget.toml`: set `[phase].phase = "sub-phase-capture-determinism-contract"`, bump `opened_at`. NO `[budgets.*]` widening. Commit: `chore(capture-determinism-contract-stage0-tolerance-budget): sub-phase carryover from sub-phase-taichi-integration`.

- **Task 0.2 — 9-sim RED evidence reverify against MPM-baseline.** sha256 all 9 sims' failing-tests-evidence files; compare to MPM landing § 6.2 baseline. Mass gate-13 precondition.

- **Task 0.3 — Probe-finding ratification.** Re-run the boundary-delay probe per plan-drafting-probe § 4.3 (1.5 s wall-clock separation; expect ~183-184 bytes differing, clustered at OHDR mtime regions). Re-grep for byte-equality patterns project-wide per probe § 2.1-§ 2.2; confirm 3 VULNERABLE / 7 IMMUNE / 0 UNCLEAR inventory at HEAD has not drifted. Empirically validate the TS-side `_emscripten_date_now` shim path (probe § 4.2 lean (b)) by patching h5wasm's loaded module and verifying byte-identical .h5 output across runs at different Unix instants. Empirically validate the Python-side `track_times=False` fix at h5py's surface.

- **Task 0.4 — Blocking-dependency identification.** If any of the following surfaces between probe authoring (2026-05-23T15-37-24Z) and Stage 0 dispatch, SURFACE before Stage 1:
  1. Conventions doc sha256 has drifted from `3698d19b…2bd734`.
  2. The 7 IMMUNE tests have ANY new failures at HEAD (i.e., the existing harness is broken).
  3. A new VULNERABLE test has been added (probe inventory count drifted).
  4. h5wasm has been bumped to a version that DOES expose `H5Pset_obj_track_times` (changes the TS-side fix scope from `_emscripten_date_now` shim to direct H5P binding — preferred but distinct).
  5. h5py has been bumped to a version that changes `track_times` default (low probability).

- **Closing.** `docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-checkpoint-<UTC>.md` per IC-9 abbreviated structure. Front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(capture-determinism-contract-stage0-checkpoint): Stage 0 pre-flight complete`. Apply Convention #12 SHA back-fill per § B.2 tightened-discipline if closing-commit SHA differs from the audit's `head_sha:`: NEW commit `chore(capture-determinism-contract-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`.

### § 4.2 Stage 1 — Implementation (single session; monolithic default per § 4.0)

Per-task sequence (new-files-first per Convention A):

1. **Harness rename + Python contract extension** (deliverable 3). Rename `bit_exact` → `content_equivalent` at `tools/testkit/determinism/harness.py` `DeterminismVerdict`; add deprecation-shim property `bit_exact` returning `content_equivalent` with a `DeprecationWarning`; update docstring + module-level header. Update `policy.md` to reflect the content-equivalent contract.

2. **TypeScript harness build** (deliverable 4). Create `common/common-ts/src/determinism/{captureReader.ts, diffCaptures.ts, runTwiceAndDiff.ts, index.ts}` + `__tests__/`. Mirror Python API semantically. Read h5wasm File → extract `/steps/{N}/state/{field_name}` Float64Array data → compare via element-wise equality OR (for non-bit-exact mode) `Math.abs(a - b) <= tol`. Tests at `__tests__/` verify the contract semantics on synthetic vulnerable-input Captures.

3. **Python CaptureWriter source-level fix** (deliverable 5). Edit `tools/testkit/capture/writer.py:51-67`: add `libver="earliest"` to `h5py.File(...)` and `track_times=False` to every `create_group` + `create_dataset` call. Add 1 new test under `tools/testkit/capture/tests/` verifying byte-identical .h5 output across two `write_capture` calls separated by 1.5 s wall-clock.

4. **TypeScript CaptureWriter source-level fix** (deliverable 6). Edit `common/common-ts/src/capture.ts` CaptureWriter.finalize() to patch `Module._emscripten_date_now` (or use the `Date.now` global-shim approach per Stage 1 dispatch-time routing) for the duration of the h5wasm write window. Add 1 new test under `common/common-ts/src/__tests__/`.

5. **Per-test refactor V1** (deliverable 7). Edit `common/common-ts/examples/hello-physics/hello-physics.test.ts:22-28`: replace `payloadA.equals(payloadB)` with `runTwiceAndDiff` invocation; assert `result.contentEquivalent === true`. Verify GREEN locally.

6. **Per-test refactor V2** (deliverable 8). Edit `packages/lattice-boltzmann-d3q19/tests/test_determinism.py`: remove `_sha256_of_file` helper; rewrite `test_run_twice_bit_exact_canonical` body to invoke `run_twice_and_diff(sim_runner_diagnostic, seed=42, tmp_dir=tmp_path)` and assert `verdict.content_equivalent`. Update docstring to match the new contract wording.

7. **Per-test refactor V3** (deliverable 9). Same pattern as V2 applied to `packages/mpm-multimaterial/tests/test_determinism.py`.

8. **Spec amendment** (deliverables 1 + 2). Edit `docs/architecture.md` § 2.5 per D2 routing; § 2.7 per D2 sub-routing; `tools/testkit/schemas/capture-v1.json` description-only edit.

9. **Conventions doc amendment** (deliverable 10). Edit `docs/conventions/sub-phase-conventions.md` § F.3 + § A.2 additively per D5 verdict (no blocking dependency). Also append the new § B sweep-template addendum (deliverable 12) — additive sub-section under § B documenting the Python + TypeScript fan-out shape.

10. **CI gate redesign** (deliverable 11). Edit `.github/workflows/*.yml` per D4 routing.

11. **Run all new tests + cross-package regression sweep** → all GREEN. Capture verbatim pytest output + vitest output to `docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-{pytest,vitest}-output-<UTC>.txt`; sha256 both. Capture cross-package sweep output sha256.

12. **Commit.** Default monolithic commit per Convention A: `feat(capture-determinism-contract-stage1): portfolio-wide content-equivalent determinism contract`. Footer cites:
    - Stage 0 checkpoint sha256.
    - Spec amendment summary (which clauses changed; per D2 routing).
    - Harness rename + TS-harness creation summary.
    - 3-test refactor witnesses (per-test before/after sha256).
    - Source-level CaptureWriter fix witnesses (byte-identical-across-seconds tests' sha256).
    - CI workflow extension summary.
    - Cross-package sweep sha256.

    Two-commit-or-three-commit fallback if dispatch-time surface argues for D1-decomposition.

**Closing.** `docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-checkpoint-<UTC>.md` per IC-9. Body: 14-row deliverable-status table + per-deliverable evidence sha256 + cross-package regression witness + SHIFTED entries. Front-matter: both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(capture-determinism-contract-stage1-checkpoint): Stage 1 implementation complete`. Apply Convention #12 SHA back-fill if needed.

### § 4.3 Stage 2 — Landing (single session if Stage 1 was clean)

Inherits `sub-phase-conventions-refactor-post-phase-1.md` § 4.3 Steps 2.1 → 2.9 structure. Deltas for this sub-phase:

- **Step 2.1 — Closing-commit anchor re-check** (conventions doc § B.2). Re-grep every concrete path / SHA / sha256 across charter + both stage checkpoints + new harness sources + amended spec + amended conventions doc + new CI workflows.

- **Step 2.2 — Test sweep at portfolio scale (Python + TypeScript fan-out).** Full per-package + tools sweep at HEAD per conventions-refactor § 6.1 pattern adapted to dual-language fan-out. Python: 9 sims + tools/integrity + tools/diagnostics + tools/testkit + common/common-py (mirror Taichi-integration § 5 325-test count + new harness tests). TypeScript: `common/common-ts` + `common/common-ts/examples/hello-physics`. Document any counting-variance per conventions-refactor § 6.1 N1 + Taichi-integration § 5.

- **Step 2.3 — Cat 3 disposition — NO-OP.** This sub-phase ships no golden table; no `_SUBDIRS_PICKED_UP` extension.

- **Step 2.4 — Full integrity sweep** (Cat 1, 2, 3, 4, 5, X). Aspirational bit-identity check against MPM-landing § 7.2 + conventions-refactor § 7.2 + Taichi-integration § 6 baseline `810cd6e3…23411f98`. If bit-identical: **fourth byte-identical sweep in a row** — strongest possible structural-correctness witness. If divergent: surface why; the harness rename + TS-harness creation are additive to integrity surface but could introduce a new Cat-1 (citations) or Cat-2 (public API) row.

- **Step 2.5 — Evidence-path verification.** `verify_evidence --strict` over all new sub-phase audits. New `evidence_paths` from this sub-phase have no LFS-tracked entries (no canonical captures shipped; the synthetic test Captures are not committed); § B.6 LFS-pointer-vs-content drift mode does not apply. **§ B.6 N6 banked empty-file pattern** (Taichi-integration § 8.3): the new TS-harness module's `__init__`-equivalent index.ts is non-empty (re-exports); should NOT trigger the empty-file rejection.

- **Step 2.6 — Gate-13 replay verification — NO-OP.** This sub-phase ships no per-sim implementation; no gate-13 anchor or worktree-replay contract.

- **Step 2.7 — Append-only check.** CI semantics + strict-mode. **15 protected sets at Stage 2 close** (Phase 0 + Phase 1 + 14 prior sub-phase landings including Taichi-integration).

- **Step 2.8 — Mutation gate — NO-OP.** This sub-phase ships no sim source changes.

- **Step 2.9 — Convergence-file edits.** CHANGELOG additive entry (deliverable 13); `docs/dependencies.md` additive entry (deliverable 14). Spec + conventions doc + capture-v1.json amendments already landed at Stage 1; Stage 2 may polish wording at operator routing.

- **Step 2.10 — Sub-phase landing audit.** `docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-<UTC>.md` per IC-9 body. Front-matter `artifact: sub-phase`, `artifact_id: sub-phase-capture-determinism-contract`, both `head_sha:` AND `head_sha_at_checkpoint:`. `evidence_paths:` + `evidence_hashes:` enumerate both stage-checkpoint logs + integrity-cats output + cross-package sweep (Python + TS) + harness test outputs + spec sha256 + conventions doc sha256 + CHANGELOG. Verdict-state CONFIRMED. Commit: `chore(capture-determinism-contract-stage2-landing-audit): sub-phase landing audit`.

- **Step 2.11 — Convention #12 SHA back-fill** (tightened § B.2 discipline). `git rev-parse HEAD` at summary-composition time → replace placeholder; new commit. NEVER `--amend`. Commit: `chore(capture-determinism-contract-stage2-sha-backfill): back-fill landing audit SHA per Convention #12`.

- **Step 2.12 — Final summary.** No `-phase-N` tag proposed. Optional `v0.1.10` non-phase point-release tag banked for operator (lean: NO tag, per conventions-refactor § 11 + Taichi-integration § 12 precedent — sub-phase commits + landing audit suffice). Surface to operator with landing-audit path, deliverable-status table, D1-D5 verdicts as routed, and next-sub-phase recommendation (RD-2D → Stack-D port per Taichi-integration § 10, now structurally unblocked).

---

## § 5. Dispatch — operator workflow

Inherited from `sub-phase-conventions-refactor-post-phase-1.md` § 5 + Taichi-integration § 5 verbatim. Identity reads "Capture-determinism-contract sub-phase coordinator chat"; § 7 prompts are the dispatchable units.

**Tag posture.** Same as Taichi-integration. No `-phase-N` tag. Lean: no intermediate tag. Optional non-phase point-release `v0.1.10` (no `-phase-N` suffix) is a banked operator decision. The agent never pushes any tag (operator-only per spec § 7.12).

---

## § 6. Coordinator prompt

Inherits Phase 1 § 6 / conventions-refactor § 6 / Taichi-integration § 6 verbatim; identity reads "Capture-determinism-contract sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + 9-sim RED reverify + probe-finding ratification + blocking-dep ID | pending | — | — | — |
| 1 | harness rename + TS-harness build + 2 source-level fixes + 3-test refactor + spec amendment + conventions doc + CI gate | pending | — | — | — |
| 2 | integrity sweep + portfolio-scale regression sweep + convergence + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these **sub-phase conventions** (inherited from conventions doc + Taichi-integration § 7 standing orders, with substitutions):

- Commit slug `chore` / `feat` / `docs` + `capture-determinism-contract-stage<N>-<scope>` (non-phase form; no `-phase-N` tag exists).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/`, `tools/testkit/{determinism, capture}/`.
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` per conventions doc § B.3.
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit committed at `v0.1.0-phase-1` OR within any of the 14 prior sub-phase audit chains.
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close per conventions doc § B.2 tightened-discipline.
- Operator-only tag-pushing per spec § 7.12; the agent NEVER runs `git tag` or `git push origin <tag>`.
- `verify_evidence` accepts `sha256:HEX` prefix at HEAD; use prefix form throughout.
- Empty-file rejection (Taichi-integration § 8.3 N6): when listing pytest-subpackage init files as evidence_paths, EITHER omit them OR add a single-line docstring.
- Hard Rule 2 — if anything looks structurally wrong, STOP and surface; do NOT paper over.

### § 7.1 Stage 0 — Pre-flight

```
You are the capture-determinism-contract sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-capture-determinism-contract.md (this sub-phase's charter — source of truth). § 7 standing orders are inherited; apply them.
  2. docs/conventions/sub-phase-conventions.md (POST-REFACTOR canonical, sha256 3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734). Verify the sha256 matches at HEAD.
  3. docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-<UTC>.md (the plan-drafting probe report — exhaustive byte-equality test inventory, h5wasm surface, D1-D5 surface preview).
  4. docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md (immediately-prior landing audit; § 8 SHIFTED entries; § 9 banked items disposition).
  5. docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md (portfolio-wide consolidation template).

Spec-Phase-1 landed at v0.1.0-phase-1 (SHA 9998bc1); all 9 Phase-1 sims GREEN; Taichi-integration landed at cf7d553. Stage 0 is pre-flight only; you do NOT implement the contract redesign (that's Stage 1).

Execute Tasks 0.0 → 0.4 → closing per charter § 4.1 exactly:

  Task 0.0 — Run replay_prior_phase against phase-1 with the 8-gate canonical set. 18th invocation of bit-identity invariant 9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34. Exit 0 + sha256 match → proceed. Mismatch → BLOCKED per P20; write stage-0-blocked-replay-<UTC>.md; surface; stop.

  Task 0.1 — Bump tolerance-budget.toml's [phase] to "sub-phase-capture-determinism-contract"; bump opened_at. NO [budgets.*] widening. Commit per charter § 4.1.

  Task 0.2 — sha256sum all 9 Phase-1 sims' failing-tests-evidence files; compare to MPM landing § 6.2 baseline. Mismatch → BLOCKED.

  Task 0.3 — Probe-finding ratification:
    (a) Re-run the boundary-delay probe per plan-drafting-probe § 4.3 (expect ~183-184 bytes differing at OHDR mtime regions).
    (b) Re-grep the byte-equality inventory; confirm 3 VULNERABLE / 7 IMMUNE / 0 UNCLEAR at HEAD.
    (c) Empirically validate the TS-side _emscripten_date_now shim path: patch h5wasm's loaded module's _emscripten_date_now; run hello-physics capture twice at different Unix instants; verify byte-identical .h5 output. Capture witness.
    (d) Empirically validate the Python-side track_times=False fix: invoke a synthetic h5py.File(..., "w") + create_group(track_times=False); write at two Unix instants; verify byte-identical output. Capture witness.

  Task 0.4 — Blocking-dependency identification (per charter § 4.1 Task 0.4). If any of the 5 enumerated conditions surfaces, STOP and surface to operator BEFORE Stage 1 dispatch.

  Closing — Commit docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-checkpoint-<UTC>.md per IC-9. Apply Convention #12 SHA back-fill. Surface and stop.

Out of scope: any Stage 1 implementation work; any edit outside tolerance-budget.toml + new audit files.

Stuck → conventions doc § 9 + charter § 9.
```

### § 7.2 Stage 1 — Implementation

```
You are the capture-determinism-contract sub-phase Claude Code agent, Stage 1 (implementation) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-capture-determinism-contract.md §§ 1.4 (contract semantics + D1-D5 routings as decided by operator at charter close), 2 (deliverables), 3 (IC contracts), 4.2 (Stage 1 12-step sequence), 7 (standing orders), 9 (new playbook entries).
  2. docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-checkpoint-<UTC>.md (Stage 0 pre-flight; replay PASS + probe-finding ratification + TS/Python fix-path validation).
  3. docs/architecture.md § 2.5 + § 2.6 + § 2.7 (the amendment targets; verify wording at HEAD before amending).
  4. tools/testkit/determinism/{harness.py, policy.md} (the existing Python harness — the surface you rename + extend, NOT rewrite).
  5. common/common-ts/src/capture.ts (the existing TS CaptureWriter; the surface you augment with the source-level fix).
  6. common/common-ts/examples/hello-physics/{hello-physics.test.ts, run.ts} (V1 refactor site).
  7. packages/lattice-boltzmann-d3q19/tests/test_determinism.py + packages/mpm-multimaterial/tests/test_determinism.py (V2 + V3 refactor sites).

Scope — 12-step sequence per charter § 4.2 (default monolithic single commit; D1-routed Stage 1a/1b/1c fallback if dispatch-time surface argues):

  1. Harness rename + Python contract extension.
  2. TypeScript harness build.
  3. Python CaptureWriter source-level fix (track_times=False).
  4. TypeScript CaptureWriter source-level fix (_emscripten_date_now shim).
  5. Per-test refactor V1 (hello-physics.test.ts).
  6. Per-test refactor V2 (lattice-boltzmann-d3q19).
  7. Per-test refactor V3 (mpm-multimaterial).
  8. Spec § 2.5 + § 2.7 + capture-v1.json amendment per D2 routing.
  9. Conventions doc § F.3 + § A.2 + § B sweep-template addendum (additive).
  10. CI gate redesign per D4 routing.
  11. Run all new tests + cross-package regression sweep (Python + TypeScript). Capture witness sha256s.
  12. Commit single sub-bundle (or Stage 1a/1b/1c per D1) per charter § 4.2 Step 12.

Closing — Commit docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-checkpoint-<UTC>.md per IC-9. Body: 14-row deliverable-status table + per-deliverable evidence sha256 + cross-package regression witness + SHIFTED entries. Convention #12 SHA back-fill. Then stop.

Out of scope: modifying any Phase 1 sim package's source (only the 2 sims' test files, not src/); touching convergence files (Stage 2 owns CHANGELOG + dependencies.md final landing); Cat 3 work; mutation-runner additions; Stack E (Warp) anything; per-sim Stack-D port work.

Stuck → conventions doc § 9 + charter § 9. On any structurally-wrong finding, STOP and SURFACE per Hard Rule 2.
```

### § 7.3 Stage 2 — Landing

```
You are the capture-determinism-contract sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-capture-determinism-contract.md §§ 4.3 (Stage 2 12-step sequence), 7 (standing orders), 11 (sub-phase coherence + D1-D5 routings as decided by operator).
  2. docs/_audits/phase-2/sub-phase-capture-determinism-contract/{stage-0-checkpoint, stage-1-checkpoint}-<UTC>.md.
  3. docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md (parent landing audit — § 6 byte-identical integrity sweep baseline 810cd6e3…23411f98).
  4. docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md (Stage 2 step-by-step template).

Execute Steps 2.1 → 2.12 per charter § 4.3 exactly.

Acceptance: all 14 deliverables GREEN; portfolio-scale regression sweep clean (Python + TypeScript fan-out); integrity sweep clean (aspirational fourth-byte-identical to 810cd6e3 baseline); evidence-path verification clean; append-only check clean; landing audit committed; Convention #12 SHA back-fill committed.

If Stage 2 surfaces a CONFIRMED-blocking issue (e.g., portfolio-scale sweep shows new regressions in a Phase-1 sim), STOP and SURFACE per Hard Rule 2; do NOT silently relax acceptance criteria.

Stuck → conventions doc § 9 + charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits conventions doc § A.3 + § A.4 + § B.2 verbatim. Stage 0 and Stage 1 each ship a checkpoint audit; Stage 2 ships the landing audit. All three closes are followed by Convention #12 SHA back-fill commits. Per-stage continuation uses fresh Claude Code sessions; coordinator chat persists across all sessions.

Stage 1's monolithic default may decompose into Stage 1a/1b/1c per D1 routing; each sub-stage carries its own checkpoint audit + back-fill commit.

---

## § 9. Risk surface + problem-solving playbook

Inherits conventions doc § 9 playbook entries P1-P26 verbatim. **NEW R-class entries SPECIFIC to this sub-phase:**

- **R-D1 — Spec § 2.5 amendment wording precision.** The contract wording must be precise enough to be machine-checkable + general enough to survive future harness reimplementations + concrete enough to disambiguate raw-file vs content-projection equality. D2 surfaces three candidate wordings (D2-a / D2-b / D2-c per probe § 5.1); operator picks. **Mitigation:** Surface candidate wordings to operator BEFORE Stage 1 dispatch; do NOT pre-commit wording at plan-drafting. Stage 1 implements the operator-routed wording verbatim.

- **R-D2 — Per-test refactor blast-radius (preserve GUARANTEE, change MECHANISM).** Each refactored test (V1 + V2 + V3) must preserve the determinism GUARANTEE the test verifies (same-stack same-hw run-to-run reproducibility at the same seed) while changing the MECHANISM (raw-file sha256 → harness-based content-equivalent). Accidentally weakening a sim's determinism claim during refactor would be WORSE than the current state. **Mitigation:** for each refactor, Stage 1 (i) preserves the failure-mode-on-bug witness (a hand-injected RNG state delta in the runner produces a verdict.content_equivalent = false outcome at test time, observable + assertable); (ii) preserves the docstring wording about over-achievement (per conventions doc § F.4); (iii) verifies the test STILL FAILS on a synthetic broken-determinism runner via a Stage 1 dispatch-time spot-check. The contract surface must be at least as strong as the byte-equality surface it replaces.

- **R-D3 — Cross-stack equivalence consistency with spec § 2.6.** The new same-stack content-equivalent contract MUST remain consistent with spec § 2.6's cross-stack tolerance table. **Mitigation:** Stage 1 reads spec § 2.6 verbatim before amending § 2.5; the amendment language explicitly frames same-stack-content-equivalent as "the bit-exact (zero-tolerance) special case of the cross-stack content-equivalent posture computed over the same Capture projection." If the operator picks a D2 wording that disrupts this framing, surface to operator BEFORE Stage 1 dispatch with an alternative wording proposal.

- **R-D4 — Phase 4 WU-A schema corpus interaction.** Probe § 6 confirms WU-A's "every state array preserved bit-for-bit" is content-level and consistent with the new contract; this risk is **resolved as informational** at plan-drafting. **Mitigation:** Stage 2 landing audit § 11 confirms the consistency verbatim; no Phase 4 amendment.

- **R-D5 — h5wasm/h5py asymmetry interaction with content-hash equivalence.** The Python and TypeScript harnesses must produce equivalent verdicts even though Python h5py exposes `track_times=False` and TypeScript h5wasm 0.10.1 does not expose `H5Pset_obj_track_times`. **Mitigation:** the contract is defined over the Capture data model (parsed steps × state × diagnostics), not over the underlying HDF5 storage. Both harnesses project to the Capture structure and compare over it; the asymmetry is invisible to the contract. The source-level fixes (Python `track_times=False` + TS `_emscripten_date_now` shim) provide defense-in-depth but are NOT load-bearing for the contract.

- **R-D6 — TS-harness scaffolding scope creep.** If the TypeScript CaptureReader requires substantial h5wasm type-safety scaffolding (h5wasm's read surface is loosely typed in current TS bindings; the new harness must safely extract `Float64Array` data from `/steps/{N}/state/{field_name}`), the Stage 1 surface estimate may exceed +500 lines net. **Mitigation:** D1 sub-decomposition trigger (charter § 4.0); Stage 0 Task 0.3(c) empirically validates the read-surface scaffolding cost; if it exceeds ~+200 lines for the read surface alone, surface D1 routing alternative to operator BEFORE Stage 1 dispatch.

---

## § 10. Audit-trail discipline

Inherits conventions doc § B verbatim. Sub-phase audit dir: `docs/_audits/phase-2/sub-phase-capture-determinism-contract/`. All audits in this dir are append-only per § B.1; 15 protected sets at Stage 2 close.

`evidence_paths:` and `evidence_hashes:` follow IC-9 conventions + § B.3 + § B.6 (LFS-pointer-vs-content discipline) + Taichi-integration § 8.3 N6 (empty-file rejection avoidance).

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

15 parent audits (Phase 1 landing + 9 per-sim landings + 5 hotfix landings; full list at front-matter when this charter ships its plan-drafting landing audit). The 14-row deliverable list derives from plan-drafting-probe § 2-§ 7 + the closest analogues — conventions-refactor's 8-row deliverable table (portfolio-wide consolidation template) + Taichi-integration's 11-row deliverable table (spec-Phase-2 entry shape).

**Cumulative shifts entering this sub-phase: 99** (Taichi-integration landing § 8.4). Plan-drafting closing-shift count expected ≥ 99 + 3 = 102 per probe § 9.

### § 11.2 Banked items inherited + their disposition

(FACT — Taichi-integration landing § 9 D2 disposition + § 10 next-sub-phase recommendation.)

| # | Item | Disposition at this charter close |
|---|---|---|
| 1 | Testing-improvements sub-phase | **DEFER** — separate routing |
| 2 | common-py adoption | **RESOLVED at Taichi-integration close** — consumed |
| 3 | Taichi-integration | **RESOLVED at Taichi-integration close** — consumed |
| 4 | Cross-stack verification methodology | **DEFER** — first Stack-C↔Stack-D port sub-phase per Taichi-integration § 9 row 4 |
| 5 | evidence_paths LFS remediation (per § B.6) | **DEFER** — focused infrastructure hotfix mirroring Taichi-integration shape; could BUNDLE with banked item 7 |
| 6 | Mid-Phase-1 capture regeneration | **DEFER** — per-sim work |
| 7 | conventions doc § B.6 addendum — empty-file rejection drift mode (Taichi N6) | **DEFER** — bundle candidate with banked item 5 |
| 8 | Taichi smoke kernel patterns as exemplars for first Stack-D port | **CONSUMED at next sub-phase (RD-2D → Stack-D port)** — not this sub-phase |

**This sub-phase consumes NO previously banked items in its deliverable scope** — it is a structurally-upstream contract redesign that surfaced via CI fan-out from Taichi-integration's push to main. The new banked precedents this sub-phase establishes (probe § 9 N1/N2/N3) carry forward to subsequent sub-phases.

### § 11.3 Outputs

After this sub-phase lands:

- **Every subsequent spec-Phase-2 sub-phase consumes the new contract by reference.** IC-13 + IC-14 are first-class workspace surfaces.
- **Every Stack-D port sub-phase's cross-stack equivalence work depends on this contract being settled.** Stack-D ports inherit the same-stack content-equivalent posture as the baseline against which cross-stack epsilon-bounded equivalence is measured.
- **Phase 4 WU-A schema-bump round-trip corpus** consumes the contract by reference (no WU-A amendment needed per probe § 6).
- **The recommended next sub-phase is RD-2D → Stack-D** (Taichi-integration § 10), now structurally unblocked.

### § 11.4 Replay-chain posture + tag posture

**Replay-chain non-participation** — same as all sub-phases per conventions doc § D.4. The next spec-phase pre-flight (spec-Phase-2 Stage 0 Task X.0) replays against `v0.1.0-phase-1`, NOT against this sub-phase's tag (which does not exist).

**Tag posture** — no `-phase-N` tag (forbidden per § D.2). Optional non-phase point-release `v0.1.10` (no `-phase-N` suffix) is a banked operator decision at Stage 2 close. Lean recommendation: NO intermediate tag, per conventions-refactor § 11 + Taichi-integration § 12 precedent.

### § 11.5 D1-D5 surface — operator-routable; NOT pre-committed by plan-drafting

(See probe § 8 for full surface preview. Reproduced here for charter-time routing.)

**D1 — Stage 1 monolithic vs decomposed.**
- **Probe lean:** monolithic (probability-weighted 70% ships cleanly).
- **Alternative:** Stage 1a (harness build + source-level fixes) → Stage 1b (per-test refactor + spec amendment) → Stage 1c (CI gate redesign + convergence). Each sub-stage gets its own checkpoint commit + SHA back-fill.
- **Downstream:** if monolithic ships, sub-phase converges in 8-9 total commits; if decomposed, 12-14 total commits.

**D2 — Spec § 2.5 amendment wording.**
- **Probe lean:** D2-c (project-onto-Capture).
- **Alternatives:** D2-a (narrow), D2-b (mechanism-explicit).
- **D2-sub:** capture-v1.json `payload.checksum` semantics (raw-file vs content-normalized vs sibling content_checksum field).
  - **Probe lean:** keep `payload.checksum` as raw-file sha256, ADD description note that it is informational and the contract lives at the harness.
  - **Alternative:** add sibling `content_checksum` field at schema v1.1.0 (additive bump; coordination cost with WU-A).
- **Downstream:** the operator-routed wording is the literal text Stage 1 commits to spec § 2.5; charter does NOT pre-commit it.

**D3 — Per-sim determinism-declaration refactor scope.**
- **Probe verdict:** **0 declarations need amendment** (per probe § 8.3; no `determinism.md` files exist; sim.py docstrings declare posture not mechanism).
- **Alternative:** if operator wants to harmonize the LBM + MPM sim.py docstring wording about "byte-identical HDF5 payloads" (LBM line 26-27; MPM line 14-15) post-refactor — i.e., update them to "content-equivalent Capture projections" to match the new contract — that is an inline edit of 2 docstrings during Stage 1 STEP 6/7. Operator routes.
- **Downstream:** if operator picks inline-docstring-update, +2 lines added to Stage 1 scope; if banked, no change.

**D4 — CI gate redesign — strict-fanout vs phased.**
- **Probe lean:** strict-fanout (single Stage 1 commit extends both Python-strict + ts-strict workflows).
- **Alternative:** phased (Python-strict first, ts-strict second across two sub-phases). Adds coordination cost; not principled if both fixes are small.
- **Downstream:** strict-fanout ships in this sub-phase's Stage 1; phased adds another sub-phase.

**D5 — Conventions doc amendment necessity.**
- **Probe verdict:** **NO blocking dependency** on a conventions-refactor-v2 sub-phase (per probe § 8.5). The § F.3 + § A.2 + § B sweep-template addendum amendments are additive per the established conventions-doc-is-editable posture; this sub-phase ships them as Stage 1 deliverables.
- **Alternative:** if operator decides the amendment surface is large enough to warrant its own sub-phase, the alternative is to bank the amendment for a conventions-refactor-v2 sub-phase ahead of this one. Probe lean: inline ship in this sub-phase.
- **Downstream:** inline ship adds ~+15/-5 lines to Stage 1; banked path adds another sub-phase + delays this one.

**Operator decisions on D1-D5 are recorded in the plan-drafting landing audit + cited back at each Stage's dispatch prompt as the routing context.**

---

## § 12. Sub-phase scope vocabulary

Per conventions doc § C.1: `<sub-phase-capture-determinism-contract-stage<N>-<scope>>` for Stage 0/1/2 commits; `<sub-phase-capture-determinism-contract-plan-drafting-<scope>>` for plan-drafting commits; SHA back-fill commits use `-sha-backfill` suffix per § B.2.

---

*End of charter. Stage 0 is dispatchable in a fresh Claude Code session against this plan after operator routing of § 11.5 (D1-D5).*

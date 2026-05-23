---
date: 2026-05-23T13-41-01Z
author: taichi-integration-plan-drafting-agent
phase: 2
artifact: task
artifact_id: sub-phase-taichi-integration-plan-drafting-probe
subject: "Plan-drafting probe report for spec-Phase-2 Taichi-integration sub-phase — anchor-source reads + grep-verified HEAD state + cross-doc inconsistency surface"
head_sha: e2d6cb5b0a2894d736f90b319a839101ad4a4158
head_sha_at_checkpoint: e2d6cb5b0a2894d736f90b319a839101ad4a4158
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md
  - docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md
evidence_paths:
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
  - docs/phases/sub-phase-agent-based.md
  - docs/phases/sub-phase-closed-form.md
  - docs/phases/sub-phase-conventions-refactor-post-phase-1.md
  - docs/phases/phase-2-cross-stack-replication.md
  - common/common-py/pyproject.toml
  - common/common-py/src/common_py/__init__.py
  - common/common-py/src/common_py/determinism.py
  - common/common-py/src/common_py/ggui.py
  - common/common-py/src/common_py/hotreload.py
  - common/common-py/src/common_py/capture.py
  - tools/integrity/integrity/scripts/replay_prior_phase.py
  - pyproject.toml
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
---

# Taichi-integration Plan-Drafting Probe Report

## 1. Purpose

(FACT — conventions doc § A.4 plan-then-dispatch discipline + Convention C/D probe-before-edit.) Anchor-probe artifact for the FIRST spec-Phase-2 deliverable — the Taichi-integration sub-phase charter at `docs/phases/sub-phase-taichi-integration.md`. Source-of-truth pass over the eight anchor reads the operator dispatched; grep-verified HEAD state for every claim the charter will make about common-py + taichi + workspace wiring; surfaces three cross-doc inconsistencies that motivate D1 / D2 / D3 routing at charter close.

## 2. Anchor reads — per-source summary

### 2.1 `docs/conventions/sub-phase-conventions.md` (POST-REFACTOR canonical)

**sha256 verify** (FACT — `sha256sum docs/conventions/sub-phase-conventions.md`):
```
3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
```
**Matches** the dispatch-prompt-cited value. Doc is authoritative for every spec-Phase-2 sub-phase per § 6 frontmatter.

Load-bearing items the Taichi-integration charter MUST inherit by reference:
- § A.1 sub-phase identity + § A.2 three-stage cadence (Stage 0 pre-flight / Stage 1 implementation / Stage 2 landing) — Taichi-integration is a **focused infrastructure hotfix flavor** per § A.1 row 2 (numba-integration / replay-tool / mutation-script / git-lfs-migration precedents), NOT a per-sim implementation sub-phase. Per § A.2 sentence 4 ("focused infrastructure hotfix sub-phases do NOT follow the three-stage cadence; they ship a single repair audit with embedded V1–V5 validation"), Taichi-integration's stage decomposition is OPEN by precedent — see § 4.0 of the charter.
- § A.3 role model (single Claude Code agent at a time; one coordinator chat; one operator) — inherited.
- § A.4 plan-then-dispatch (this probe + the charter ARE the plan-drafting deliverable; subsequent stages dispatch separately).
- § B.1 append-only invariant — protected set grows by one entry per landed sub-phase; at HEAD the conventions-refactor-post-phase-1 landing at `e2dc789` joins 12 prior sub-phase landings.
- § B.2 Convention #12 SHA back-fill at EVERY stage close (tightened-discipline form per Item F of the conventions-refactor: full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed).
- § B.6 evidence-paths strict-verify discipline + LFS extension (load-bearing if charter cites any LFS-tracked evidence).
- § C.1 commit-message convention — `chore | feat | docs | test | fix` types; `<sub-phase-slug>-<scope>` slug shape (hotfix-style, NO `-stage<N>-` segment unless the charter elects the three-stage cadence; D1 below routes this).
- § D.1 + § D.2 phase-tag form `v0.<N>.0-phase-<N>` reserved for spec-phase boundaries; sub-phases do NOT push phase tags; optional non-phase point-release tag is operator decision.
- § D.3 bit-identity replay invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` held byte-identically across 16+ invocations through conventions-refactor Stage 0 (FACT — conventions-refactor landing § 2 Task 0.0 row "16th invocation").
- § D.4 sub-phases NON-PARTICIPATE in cross-phase replay chain — the next spec-phase pre-flight replays against `v0.1.0-phase-1`, NOT against any intermediate sub-phase tag. Resolver regex `_PHASE_HANDLE_RE = ^phase-(\d+)$` + `_SEMVER_PHASE_TAG_RE = ^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$` mechanically rejects suffixed handles (verified at § 2.8 below). **D3 dispatched here.**
- § D.5 replay tool conventions — `uv run python -m integrity.scripts.replay_prior_phase --prior-phase phase-1 --audit ... --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`.
- § F numba convention + bit-vs-FP-equivalent contracts (§ F.3) — DIRECT precedent for Taichi's analogous SIMD-vs-scalar gap discipline + the FP-equivalence-not-bit-equivalence framing the charter will adopt for any Taichi-vs-NumPy equivalence test.
- § G numba convention — sister focused-infrastructure-hotfix shape; the cleanest analogue for Taichi-integration's deliverable.
- § L.2 row 4 + conventions-refactor landing § 9.2 row "common-py adoption decision" — banked for operator routing. **D2 disposition below.**
- § N + § P (Task 0.4 capture-cadence routing) — load-bearing at Stage 0 IF the sub-phase produces a canonical capture. Hello-physics smoke sim does not produce a canonical-corpus capture per Appendix D § D.2.3 (those are per-sim deliverables) but DOES produce a smoke-tier capture for W-Gate equivalence. Charter declares scope at § 4.

### 2.2 `docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md`

Located via `ls`. (FACT — landing audit at HEAD; verdict-state CONFIRMED at head_sha `e2dc78935c0dc6cb5374c5e87b2e298a8ca9b457`.)

§ 9.2 "Open (carried into spec-Phase-2 entry)" enumerates SIX banked items entering Phase 2:

| # | Item | Charter disposition (D2 lean) |
|---|---|---|
| 1 | **Testing-improvements sub-phase** (pytest-timeout adoption + sim.py manifest-builder test augmentation + gate-6 step-state advisory + Cat 3 evaluator shims for 7 algorithms) | **Defer to operator separate routing.** Out of Taichi-integration scope: not Taichi-shaped; testing-improvements has its own banked-chat owner per conventions-refactor landing § 9.2. |
| 2 | **`common-py` adoption decision** (focused infrastructure sub-phase OR Phase-2+ deliverable) | **Scope INTO Taichi-integration** — Taichi-integration is the natural surface to wire common-py into the workspace + add Taichi-specific surfaces. See D2 below + § 4 of the charter. |
| 3 | **Taichi-integration sub-phase** | **THIS sub-phase** — resolved by the existence of this charter. |
| 4 | **Cross-stack verification methodology** (spec § 5.7 + tolerance-budget enforcement at cross-stack scope + MMS-runner generalization) | **Defer to first Stack-C-to-Stack-D port sub-phase** — methodology consolidation is right-sized AFTER the second cross-stack pair lands per conventions doc § L.1 carry-forward discipline. Taichi-integration is infrastructure-only; no cross-stack equivalence runs yet. |
| 5 | **evidence_paths strict-verify remediation** (per § B.6's three options) | **Defer to operator separate routing.** Per conventions doc § B.6 lean, option (a) "teach verify_evidence about LFS" lands as a focused infrastructure hotfix sub-phase MIRRORING numba-integration / Taichi-integration shape. Two infrastructure hotfixes in series risks coupling; route separately. |
| 6 | **Mid-Phase-1 capture regeneration** (per § P.2 historical-instance caveat) | **Defer.** Out of Taichi-integration scope (per-sim capture work, not infrastructure). |

Plus § 9.2 row 7 (RD-3D / sph-water / eulerian-smoke / LBM / MPM test-augmentation candidates) and § 9.2 row 8 (B-hotfix-1 / B-hotfix-2) and row 9 (B2/B3/B4/B5/B6/B11/B16 Phase 1 open): all default-skip per the row labels.

**Cumulative inherited shifts**: 89 documented entering spec-Phase-2 (§ 8.3 / § 9.3 row 5; "21 from Phase 1 + 11 closed-form + 10 agent-based + 6 continuous-CA-rd3d + 13 particle-fluids-sph-water + 8 eulerian-smoke + 9 lattice-boltzmann + 7 mpm-multimaterial + 4 conventions-refactor"). **Verified by arithmetic** at HEAD: 21+11+10+6+13+8+9+7+4 = 89. **FACT.**

§ 10 "Phase 1 closure consolidation" spec-Phase-2 entry pre-conditions: rows 1–4 ✓ (all 9 sims GREEN, 5 hotfix sub-phases landed, bit-identity invariant held 16×, conventions doc stabilised); rows 5–6 ✗ (testing-improvements + common-py adoption — both **non-blocking** for spec-Phase-2 entry per the row labels). Spec-Phase-2 entry is dispatchable at `v0.2.0-phase-2` "when the operator routes"; recommended first deliverable is "Taichi-integration sub-phase mirroring the sub-phase-numba-integration pattern."

### 2.3 `docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md`

Located via `ls`. § 10.5 "Post-Phase-1 work surfaced for operator" item 4 names **Taichi-integration as the first spec-Phase-2 deliverable**, mirroring sub-phase-numba-integration pattern, establishing Stack-D Taichi infrastructure before subsequent cross-stack sim sub-phases consume it.

§ 10.1 all-9-sims-GREEN baseline (closing posture spec-Phase-2 inherits):

| Sim | Sub-phase landing SHA | Stack(s) at HEAD |
|---|---|---|
| strange-attractors / mandelbulb-explorer | `2cc0f21` | NumPy reference |
| boids-3d / physarum | `739c93f` | NumPy reference |
| reaction-diffusion-3d | `0df358d` | NumPy reference |
| sph-water | `281c74f` | NumPy + cKDTree + numba |
| eulerian-smoke | `cf13d1c` | NumPy reference |
| lattice-boltzmann-d3q19 | `4f79e19` | NumPy reference |
| mpm-multimaterial | `bd89e78` | NumPy + numba |

**Cross-stack equivalence baseline state**: per § 10.5 + § 9.4 row 8, NO sim has a Stack D port yet at HEAD. Every Phase-1 sim ships its NumPy reference at the Stack-B target category per spec § 5.3 (closed-form / agent-based) OR sits at the "Stack C target, Stack-B/Python reference shipped" position for Stack-C-target sims (RD-3D / sph-water / eulerian-smoke / LBM / MPM). **Stack D ports do not yet exist at HEAD.** Taichi-integration is the surface that lights up Stack D for downstream consumption.

### 2.4 `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` (Phase 1 original landing at `v0.1.0-phase-1`)

§ 14 original 21 baseline shifts: see lines 357–376. Shifts cover phase-1's TDD-bootstrap surface establishment; Taichi-integration inherits ALL 21 by reference, NOT verbatim, per conventions doc § M.1 framing. Shift #16 ("golden tables live at `tools/testkit/golden/tables/<category>/`") and shift #19 (`head_sha_at_checkpoint` / `head_sha` dual front-matter convention) are load-bearing for the charter's audit-discipline section.

§ 15 next-phase recommendations: item 5 explicitly names MPM as the LAST per-sim implementation sub-phase, exercising "common-py at full surface" with "Taichi limitations from spec § 4.4 documented in the sim's spec-ref § 11." (FACT.) This is the routing antecedent for Taichi-integration as the spec-Phase-2 entry surface that operationalises the spec § 4.4 limitations into actual workspace-consumable infrastructure.

§ 13 banked items: B17 (resolved through MPM PATH-A 5-proof-point baseline per conventions-refactor § 9.1); B-hotfix-1 / B-hotfix-2 carry forward to Phase 2 Stack-C; B2/B3/B4/B5/B6/B11/B16 carry forward per their original owners.

### 2.5 `docs/phases/sub-phase-agent-based.md` + `docs/phases/sub-phase-closed-form.md` (template precedents)

Both located + read in full. agent-based.md is the more-evolved 413-line template inheriting from closed-form.md (379 lines). Structurally the charter inherits the following section ordering:

- § 1 Scoping, posture, architecture (§§ 1.1–1.6) — what this sub-phase IS / is NOT / inherited shifts / posture / architecture three stages.
- § 2 Deliverables (per-sim or per-deliverable acceptance contract).
- § 3 IC contracts inherited (not redefined).
- § 4 Stage decomposition (4.1 Stage 0 / 4.2 Stage 1 / 4.3 Stage 2).
- § 5 Dispatch / operator workflow.
- § 6 Coordinator prompt.
- § 7 Agent prompts (per-stage pre-written).
- § 8 Checkpoint and continuation discipline.
- § 9 Risk surface + new playbook entry (P22 in agent-based).
- § 10 Audit-trail discipline.
- § 11 Sub-phase coherence (11.1 inputs / 11.2 banked / 11.3 outputs / 11.4 replay-chain + tag posture).

**Charter applies this template with the focused-infrastructure-hotfix-flavor adaptations** documented at § 4.0 / D1 below — per conventions doc § A.2 row 2 hotfix sub-phases historically ship a single repair audit, but Taichi-integration's surface is substantive enough that three-stage cadence is justified (see D1 routing).

### 2.6 numba-integration sub-phase precedent

**Charter file:** `docs/phases/sub-phase-numba-integration.md` **does NOT exist** (FACT — `ls docs/phases/ | grep numba` returns empty; ONLY `docs/common/numba.md` exists). The numba-integration sub-phase was dispatched WITHOUT a per-sub-phase plan document because it was a **spawned-from-parent-R-class-surface** focused infrastructure hotfix — the parent sph-water sub-phase R18 STOP-AND-SURFACE was the dispatch dossier; the numba-integration agent produced the landing audit + convention doc + regression test infrastructure in one session.

**Landing audit:** `docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md` (309 lines). Audit structure (V1–V5 validation embedded):

| § | Content |
|---|---|
| 1 | Motivation (parent R18 surface citation) |
| 2 | Dependency declaration (`numba >= 0.61, < 0.66` at `tools/testkit/pyproject.toml`) |
| 3 | Determinism convention (`@njit(fastmath=False, cache=True)` + banned options + FP-equivalent-not-bit-equivalent framing) |
| 4 | Regression test (`tools/testkit/numba_harness/` with 5 tests covering 3 contracts) |
| 5 | Validation V1–V5 (import / pytest / integrity sweep / per-package regression / cross-phase replay) |
| 6 | Phase 0 + Phase 1 substance untouched (diff-stat protected paths) |
| 7 | Impact on existing sub-phases (NONE — purely additive) |
| 8 | SHIFTED entries (3 new) |
| 9 | Banked items |
| 10 | Ready for re-dispatch |

**Critical re-anchor finding from numba landing § 2** (FACT — § 2 paragraph "Re-anchor finding"): the operator's stated lean was to declare numba at `common-py` since "common-py is the natural place for shared Python infrastructure." HEAD-state grep found common-py is NOT in workspace members AND nothing imports from common_py — so numba landed at `tools/testkit/pyproject.toml` (the de-facto universal workspace dep). **This re-anchor finding remains TRUE at HEAD** (verified at § 2.7 below) — Taichi has the same dispatch question.

**Critical determinism-contract framing from numba landing § 3** (FACT): "FP-equivalent within 1e-9 + bit-deterministic with itself + cold-vs-warm cache identity." This is the inheritable contract shape the Taichi-integration charter adapts for Taichi-vs-NumPy equivalence — Taichi has the same SIMD-vs-scalar-vs-Vulkan/CUDA-backend FP-order divergence numba surfaces.

**Subpackage-naming lesson (N2):** `tools/testkit/numba_harness/` NOT bare `tools/testkit/numba/` because `from numba import njit` would shadow the upstream `numba` package at pytest collection time. **Same constraint applies to Taichi**: charter must specify `taichi_harness/` or similar non-shadowing name if it ships a parallel regression-test subpackage at testkit.

### 2.7 Current common-py + taichi state at HEAD (grep-verified)

**`common/common-py/` layout** (FACT — `ls common/common-py/src/common_py/`):

| File | Lines | Surface |
|---|---:|---|
| `__init__.py` | 31 | Re-exports 7 modules (alembic, capture, determinism, ggui, hotreload, plotting, vdb) |
| `capture.py` | 226 | IC-2 Reader/Writer (HDF5 manifest + payload via testkit `capture`) |
| `determinism.py` | 79 | IC-4 Config + argparse glue + **`set_taichi_deterministic(config)`** — wraps `ti.init(arch=ti.cpu, deterministic_mode=True, random_seed=...)` |
| `ggui.py` | 73 | F-key workaround (KEYS_TRAPPED_BY_GGUI tuple + FKeyDispatcher poll-then-dispatch) |
| `hotreload.py` | 40 | watchfiles-based `watch_and_reexec` (process-restart pattern per spec § 4.4 limitation #1) |
| `alembic.py` | 40 | Export stub |
| `vdb.py` | 40 | Export stub |
| `plotting.py` | 81 | matplotlib helpers |
| `smoke/advection_1d.py` | (smoke sim using common_py.capture + common_py.determinism) |

**`common/common-py/pyproject.toml`** (FACT — direct read):

- name: `bit-physics-common-py`
- requires-python: `>=3.12`
- core deps: `bit-physics-testkit`, `h5py>=3.10`, `numpy>=2.0`, `watchfiles>=0.21`
- optional `[taichi]` extra: `taichi>=1.7` (with explanatory comment "Taichi is only required by `set_taichi_deterministic` and the hot-reload workflow; the rest of `common_py` works without it. Kept optional so Stack B/C developers can install common-py without pulling Taichi's CUDA/Vulkan binaries.")

**Workspace state** (FACT — `pyproject.toml` `[tool.uv.workspace].members`):
```
"tools/testkit", "tools/integrity", "tools/diagnostics",
"packages/reaction-diffusion-2d", "packages/strange-attractors",
"packages/mandelbulb-explorer", "packages/boids-3d", "packages/physarum",
"packages/reaction-diffusion-3d", "packages/sph-water",
"packages/eulerian-smoke", "packages/lattice-boltzmann-d3q19",
"packages/mpm-multimaterial"
```
**`common/common-py` is NOT a workspace member.** common-cpp, common-ts are similarly absent. This matches the numba-integration § 2 re-anchor finding verbatim and remains TRUE at HEAD.

**Actual common_py consumers at HEAD** (FACT — `grep -rn "from common_py\|import common_py" packages/ tools/ common/`):
- `common/common-py/tests/test_determinism.py` (imports `common_py.determinism.{Config, add_args, from_args, set_taichi_deterministic}`)
- `common/common-py/tests/test_capture_roundtrip.py` (imports `common_py.capture.*`)
- `common/common-py/tests/test_module_surfaces.py` (imports `common_py.{alembic, ggui, plotting, vdb}`)
- `common/common-py/tests/test_smoke_advection.py` (imports `common_py.{capture.Reader, determinism.Config}`)
- `common/common-py/smoke/advection_1d.py` (smoke sim)
- `tools/integrity/tests/test_cat4_api_shape.py` materializes a tiny `common/common-py/src/example/api.py` fixture for grammar testing — does NOT import from `common_py` itself
- `tools/integrity/integrity/cat4_draft_time/grammars/api_shape.py` paths-array lists `common/common-py/src` — does NOT import; AST-parses

**No package or tool in workspace at HEAD imports from `common_py`.** common-py is "infrastructure shipped, not yet wired." (FACT.)

**Taichi state at HEAD** (FACT — `grep -rn "taichi" packages/ tools/ common/`):

- `common/common-py/pyproject.toml` optional `[taichi]` extra (only declaration).
- `common/common-py/src/common_py/determinism.py:71` `import taichi as ti` (inside `set_taichi_deterministic`, ImportError-tolerant).
- `common/common-py/src/common_py/ggui.py` + `hotreload.py` docstrings reference spec § 4.4.
- `packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py:47` cites `taichi_mpm/mls-mpm88.cpp` (citation, not import).
- `tools/testkit/probes/reports/mpm-multimaterial.md:22–24` declares common-py surfaces "AS-COMMITTED at `bcd9cb2` per Stage 1 common-py surfaces" — these are forward-looking probe-report claims; the MPM implementation at HEAD ships in NumPy + numba, NOT in Taichi (FACT — `packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py` imports `numba`, not `taichi`).
- `tools/testkit/determinism/policy.md:37` documents `ti.init(arch=..., random_seed=<seed>)` as the Taichi seed-pinning recipe.
- `tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md` + `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` cite the canonical 88-line Taichi MLS-MPM reference (citations).

**No Taichi import in any sim package or testkit module at HEAD.** `taichi` is not in any workspace member's required dependencies; it is reachable ONLY via `common/common-py[taichi]` optional extra. (FACT.)

### 2.8 `tools/integrity/integrity/scripts/replay_prior_phase.py` regex constraints

(FACT — direct read at lines 43–45.)

```python
_PHASE_HANDLE_RE = re.compile(r"^phase-(\d+)$")
_SEMVER_PHASE_TAG_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$")
```

**Mechanically enforced**: only single-integer phase handles + single-integer phase tags. `v0.1.9` (the non-phase point-release tag pushed post-MPM landing) does NOT carry `-phase-N` suffix and is NOT resolvable by the replay tool. `v0.2.0-phase-2` would resolve, but **does not exist at HEAD** because spec-Phase-2 has not landed.

**D3 anchor implication.** Taichi-integration (and every spec-Phase-2 sub-phase preceding the eventual `v0.2.0-phase-2` landing tag push) MUST replay against `v0.1.0-phase-1`. This is the only resolvable phase-tag anchor at HEAD. See D3 routing below.

## 3. Cross-doc inconsistencies surfaced

### 3.1 `docs/phases/phase-2-cross-stack-replication.md` plan-shape vs sub-phase-conventions § A.4

(FACT — `docs/phases/phase-2-cross-stack-replication.md` 3084 lines; outline grep at § 1.4 "Sequential stage decomposition" + § 1.5.2 Stage 0 common-warp + § 2.1 coordinator initial prompt.)

The existing Phase 2 plan was drafted BEFORE the sub-phase pattern crystallized. It assumes:

- **One coordinator chat, one Claude Code agent role running auto-accept** that executes the entire Phase 2 (Stage 0 common-warp + Stages 1–8 per-sim ports + Stage 9 landing) within a single dispatch (§ 1.4.0 + § 2.1 coordinator initial prompt).
- **Stage 0 builds `common-warp` (Stack E)** — NOT common-py / Taichi-integration. The Stage 0 deliverable specified at § 1.9.1 is `common/common-warp/` with 7 subsystems for Stack E sims. Stack D / common-py / Taichi-integration shows up implicitly inside Stages 2/3/4/6 ("consumes common-py" per § 1.3.1 table), with **no analogous Stage 0 bootstrap deliverable for Stack D**. (FACT — § 1.5.2 W-Gates 1-6 enumerate common-warp acceptance only; no W-Gates declared for common-py.)
- **Stages 2/3/4/6 ARE the Stack D ports** (RD-2D / SPH-water / eulerian-smoke / LBM each to Stack D, per § 1.3.1 table rows 2.1.D / 2.2.D / 2.4.D / 2.5.D).

This shape conflicts with conventions doc § A.4 plan-then-dispatch + § A.3 "one Claude Code agent at a time" + the established Phase-1 evidence that single-session dispatch of multi-sim work has surfaced load-bearing risk surfaces (sph-water R12-R20, MPM R-MPM-3 P26). It also conflicts with § A.2 three-stage cadence which has been the established discipline across all 7 per-sim Phase-1 sub-phases.

**D1 routing implication.** Operator must decide whether to SUPERSEDE the 10-stage monolithic plan with per-sub-phase decomposition (matching Phase 1 sub-phase pattern), OR treat Taichi-integration as a PRECURSOR sub-phase whose deliverable the existing plan's subsequent stages then consume wholesale. See D1 below.

### 3.2 phase-2 plan § 1.9.1 common-warp public API specification AS A TEMPLATE for common-py

The existing plan specifies `common-warp` with seven subsystems (Runtime / Capture / Determinism / Particles / Grids / HashGrid / Smoke) and full Python signatures for each. This is the CLOSEST existing analogue for what a "Stack D Taichi-integration deliverable" should look like — but applied to Stack E (Warp), not Stack D (Taichi).

**Asymmetry**: common-py already EXISTS at HEAD with capture / determinism / ggui / hotreload / alembic / vdb / plotting surfaces (see § 2.7) — common-warp does not. So common-py's Taichi-integration sub-phase delta is SMALLER than a from-scratch common-warp Stage 0 would be:

- Wire common-py into the workspace (D2 dispatch).
- Add Taichi as a workspace-accessible dep (NOT optional-extra-only; or keep optional with workspace member added — operator routing).
- Augment `determinism.py` `set_taichi_deterministic` to support arch-selection (cpu vs cuda vs vulkan vs metal per spec § 4.4) + record-the-FMA-fusion-posture.
- Ship a hello-physics Taichi smoke sim (analogue to common-warp's § 1.9.1 Subsystem 7 hello sim) exercising every common-py public surface.
- Ship a Taichi-vs-NumPy FP-equivalence regression-test harness mirroring `tools/testkit/numba_harness/` (under non-shadowing name — `taichi_harness/` per numba § 2 N2 lesson).
- Integrity gates green (Cat 1 / 2 / 3 / 4 / 5 / X clean per current MPM-landing § 7.2 byte-identical sweep).
- Equivalence-harness compatibility with an existing common-* smoke capture (per phase-2 plan § 1.5.2 W-Gate 5 framing — adapted from common-warp to common-py).

### 3.3 mpm-multimaterial probe report § 5 claims common-py surfaces "AS-COMMITTED at `bcd9cb2`"

(FACT — `tools/testkit/probes/reports/mpm-multimaterial.md:16–24`.) The probe report names common-py surfaces as load-bearing for MPM Stack-D adoption, but MPM at HEAD ships in NumPy + numba (NOT Taichi). The probe-report claims were forward-looking aspirational at MPM-sub-phase drafting time, not currently-consumed surfaces. **Charter must not interpret these as evidence common-py is in active use** — see § 2.7 grep findings.

## 4. Charter deliverable shape (synthesised from anchor reads)

Charter at `docs/phases/sub-phase-taichi-integration.md` will structurally inherit `docs/phases/sub-phase-agent-based.md` (the established template) with these adaptations:

- **Identity** (§ 1.1 / § 1.2): focused infrastructure sub-phase mirroring numba-integration deliverable shape; NOT a per-sim implementation; specifically wires Stack D (Taichi) into the workspace + decides common-py adoption.
- **Phase scoping** (§ 1.3): inputs 89 cumulative inherited shifts; consumes banked items per § 2.2 above (D2 disposition table); replays against `v0.1.0-phase-1` per D3.
- **Sub-phase-specific posture** (§ 1.4): Taichi determinism strategy citing spec § 4.4 explicit flags (`ti.init(arch=..., random_seed=..., deterministic_mode=True)`); hot-reload via watchfiles + child-process re-exec (existing common-py.hotreload pattern); GGUI CI-gating per spec § 7.8 (non-CI-tested per phase-2 plan § 1.6.6); FMA fusion expectations against Stack C cross-stack equivalence (epsilon-bounded-cross-driver per spec § 4.4 "Cross-stack equivalence against Stack C is the harder direction").
- **Deliverables** (§ 2): determined per § 2.5 below.
- **IC contracts** (§ 3): new ICs Taichi-integration produces (IC-? Taichi-init wrapper; IC-? per-arch capture-payload bindings as needed); existing ICs consumed (IC-2 capture I/O Python, IC-4 determinism Python).
- **Stage decomposition** (§ 4): three-stage cadence (Stage 0 pre-flight / Stage 1 implementation / Stage 2 landing) — D1 routing pending; § 4.0 justifies the cadence choice. Alternative single-repair-audit shape (numba-integration precedent) is the fallback.
- **Per-stage agent prompts** (§ 7): pre-written Stage 0 / Stage 1 / Stage 2 prompts.
- **Risk surface** (§ 9): inherit closed-form / agent-based / RD-3D / sph-water / MPM playbook entries by reference; ADD Taichi-init-order, @ti.kernel-hot-reload-limitation, GGUI-key-binding-without-F-key-constants, FMA-fusion-under-CUDA-backend, future-annotations-breakage-of-@ti.kernel risks.
- **Audit-trail discipline** (§ 10): sub-phase audit dir `docs/_audits/phase-2/sub-phase-taichi-integration/`; Convention #12 SHA back-fill at EVERY stage close per § B.2 tightened-discipline rule.
- **Sub-phase coherence** (§ 11): inputs (Phase 1 closing posture + 89 cumulative shifts + common-py at HEAD); banked items disposition per § 2.2 above; outputs (Taichi infrastructure for subsequent Stack-D sim sub-phases — specifically the 4 ports per existing phase-2 plan § 1.3.1 + Phase 4 frontier variants per spec § 11.5 differentiable Taichi); replay-chain non-participation (per § D.4) + tag posture (no `-phase-N`, optional `v0.1.10` operator-routable).

## 5. Decisions surfaced for operator routing (D1 / D2 / D3)

### D1 — Phase 2 plan supersession vs precursor relationship

**Question:** Is `docs/phases/phase-2-cross-stack-replication.md` (10-stage monolithic plan, drafted pre-sub-phase-pattern) SUPERSEDED by per-sub-phase decomposition (Phase-1 pattern), OR is Taichi-integration a PRECURSOR sub-phase whose deliverable the existing plan's Stages 2/3/4/6/etc. then consume wholesale?

**Lean (recommend, do not decide):** **SUPERSEDE the existing plan's 10-stage monolithic structure with per-sub-phase decomposition matching the Phase-1 sub-phase pattern.** Rationale:

1. Phase-1 evidence is overwhelmingly in favor of single-session-per-sim discipline: every per-sim sub-phase that attempted multi-sim Stage 1 has surfaced R-class STOP-AND-SURFACE arcs (sph-water R12-R20 alone produced 5 surfaces + the numba-integration hotfix spawn). Per § A.3 of conventions doc, "one Claude Code agent at a time" is load-bearing discipline.
2. The existing plan's § 1.5.1 fourteen-gate criteria, § 1.5.2 six-W-Gate Stage 0 common-warp criteria, § 1.9 architecture sockets, § 1.7 report-back format are ALL useful as **reference material** for per-sub-phase plan-drafting, but the single-coordinator monolithic dispatch shape is the part that conflicts with conventions discipline.
3. Sub-phase decomposition is more consistent with the operator's actual Phase-1 dispatch pattern (each per-sim sub-phase got its own coordinator chat + Claude Code session).

**Alternative (precursor only):** Treat Taichi-integration as the precursor that resolves common-py adoption + Taichi wiring, then dispatch the existing plan's Stages 2/3/4/6 wholesale. Risk: surfaces the same multi-stage-monolithic-dispatch risk the Phase-1 evidence already demonstrated.

**Downstream effects of D1=SUPERSEDE:**
- Each of RD-2D→Stack-D / SPH→Stack-D / eulerian-smoke→Stack-D / LBM→Stack-D becomes its own sub-phase under `docs/phases/sub-phase-<sim>-stack-d.md`, dispatched separately after Taichi-integration lands.
- Existing plan retained as reference (or operator-routable for separate amendment/supersession audit).
- Stack-E common-warp + Stack-E ports become their own decomposition track (out of Taichi-integration scope; surfaced for future operator routing).
- Phase 4 differentiable-Taichi variants (spec § 11.5) inherit Taichi-integration's common-py + DiffTaichi substrate.

**Downstream effects of D1=PRECURSOR-ONLY:**
- Existing plan's Stages 2/3/4/6/etc. dispatch wholesale once Taichi-integration lands.
- Risk: monolithic-dispatch failure mode per Phase-1 evidence.
- Existing plan untouched.

**Charter posture pending D1:** Charter does NOT pre-commit either; surfaces D1 to operator at § 11 / landing audit § 9. Charter scope is bounded to Taichi-integration itself.

### D2 — Banked-item disposition

Per § 2.2 above, the six items in conventions-refactor landing § 9.2 split as follows:

| # | Item | Disposition | Rationale |
|---|---|---|---|
| 1 | Testing-improvements sub-phase | **Defer to operator separate routing** | Not Taichi-shaped; banked-chat owner per landing § 9.2 row 1 |
| 2 | `common-py` adoption decision | **Scope INTO Taichi-integration** | Taichi-integration is the natural surface; coupling common-py wiring + Taichi wiring is single-coherent-dispatch |
| 3 | Taichi-integration | **THIS sub-phase** | Resolved by existence of this charter |
| 4 | Cross-stack verification methodology | **Defer to first Stack-C-to-Stack-D port sub-phase** | Methodology consolidates after second cross-stack pair lands; Taichi-integration is infrastructure-only |
| 5 | evidence_paths strict-verify remediation (LFS) | **Defer to operator separate routing** | Two infrastructure hotfixes in series risks coupling; route separately |
| 6 | Mid-Phase-1 capture regeneration | **Defer** | Out of Taichi-integration scope; per-sim work |

Also from MPM landing § 9.3 / conventions-refactor landing § 9.2 row 7–9: **default-skip** (per the row labels). Out of scope.

**Charter posture:** § 11.2 documents this table verbatim; operator routes at landing-audit close if disposition needs amendment.

### D3 — spec-Phase-2 replay-chain anchor

**Constraint** (FACT — § 2.8 above): replay resolver regex mechanically enforces single-integer phase tags. `v0.1.9` is NOT a `-phase-N` tag and is not resolvable.

**Available anchors at HEAD:**
- `v0.1.0-phase-1` (Phase 1 landing tag; bit-identity invariant `9399fc33…909f34` verified 16+ times) — **RESOLVABLE**.
- `v0.1.9` (non-phase point-release marker for Phase-1-closure) — **NOT RESOLVABLE** by the replay tool.
- `v0.2.0-phase-2` (next spec-phase boundary tag) — **DOES NOT EXIST**; spec-Phase-2 has not landed.

**Lean (recommend, do not decide):** **Replay against `v0.1.0-phase-1`**. The only mechanically-resolvable phase tag at HEAD. Every Phase 1 sub-phase replayed against `v0.1.0-phase-1` per conventions doc § D.4; Taichi-integration as the FIRST spec-Phase-2 sub-phase inherits the same anchor by the same mechanical constraint. The 16+-invocations bit-identity invariant is the heritage; Taichi-integration's Stage 0 Task 0.0 becomes the 17th invocation.

**Alternative 1**: replay against a yet-to-be-decided spec-Phase-2-anchor commit (e.g., the conventions-refactor landing commit `e2dc789`). **Not resolvable by the replay tool** — would require a new tag carrying `-phase-N` suffix, but `-phase-2` is reserved for the eventual spec-Phase-2 landing per spec § 7.12. Forbidden.

**Alternative 2**: don't replay at all for spec-Phase-2 sub-phases until `v0.2.0-phase-2` lands. **Breaks the established Phase 1 discipline** of cross-phase replay as Stage 0 Task 0.0; would forfeit the bit-identity invariant as a structural-correctness witness. Not recommended.

**Downstream effects of D3=v0.1.0-phase-1:**
- All spec-Phase-2 sub-phases (Taichi-integration + every subsequent Stack-D port sub-phase) replay against `v0.1.0-phase-1` until `v0.2.0-phase-2` lands.
- Bit-identity invariant `9399fc33…909f34` continues as the structural-correctness anchor across spec-Phase-2.
- When `v0.2.0-phase-2` eventually lands (after the last spec-Phase-2 sub-phase per D1's per-sub-phase decomposition), the FIRST spec-Phase-3 sub-phase then replays against `v0.2.0-phase-2` per the same resolver constraint, NOT against any intermediate spec-Phase-2 sub-phase tag.

**Charter posture:** § 4.1 Stage 0 Task 0.0 specifies replay against `phase-1` → `v0.1.0-phase-1`, citing the resolver regex constraint as the load-bearing justification. § 11.4 documents replay-chain non-participation per § D.4.

## 6. Cumulative-shift count verify

(FACT — arithmetic at HEAD; matches conventions-refactor landing § 8.3 + § 9.3 row 5.)

| Source | Shifts |
|---|---:|
| Phase 1 baseline | 21 |
| closed-form Stage 1+2 | 11 |
| agent-based Stage 1+2 | 10 |
| continuous-CA-rd3d | 6 |
| particle-fluids-sph-water | 13 |
| eulerian-smoke | 8 |
| lattice-boltzmann-d3q19 | 9 |
| mpm-multimaterial | 7 |
| conventions-refactor-post-phase-1 | 4 |
| **Total entering spec-Phase-2** | **89** |

Plan-drafting sub-phases historically surface zero or near-zero new shifts (per closed-form / agent-based plan-drafting precedent). Expected post-plan-drafting count: **89** (no new shifts anticipated from charter-only work).

## 7. Probe report close

This probe report is the load-bearing artifact for the operator's D1 / D2 / D3 routing at charter close. Charter at `docs/phases/sub-phase-taichi-integration.md` lands next, then plan-drafting landing audit at `docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-landing-<UTC>.md`, then Convention #12 SHA back-fill on the landing audit.

Probe verdict: **CONFIRMED — drafting unblocked.** No structurally-wrong findings; three identified cross-doc inconsistencies are exactly what D1 / D2 / D3 routings address.

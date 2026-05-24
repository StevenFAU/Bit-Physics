---
date: 2026-05-24T18-47-00Z
author: common-warp-bootstrap-plan-drafting-agent
phase: 2
artifact: task
artifact_id: sub-phase-common-warp-bootstrap-plan-drafting-probe
subject: "Plan-drafting probe report for the common-warp bootstrap sub-phase (Stack-E / NVIDIA Warp workspace-surface bootstrap; phase-2 plan §1.5.2 W-Gates 1-6 + §1.9.1 seven-subsystem public API). Convention-M HEAD re-anchor of every SECTION-1 believed-state value; Convention-#8 moment-of-assertion Warp upstream verify (warp-lang 1.13.0, 2026-05-04; CPU+GPU; Python 3.10-3.14); Convention-C verbatim citation of common-py surface + phase-2 plan §1.9.1 API + equivalence harness + capture-v1 schema. Surfaces D1-D14 for operator routing. NO drift blocker (Hard Rule 2 clear); two believed-state corrections recorded (S-W1 hello path examples/hello/ not examples/hello-warp/; S-W2 module has SEVEN subsystems not six, with a GPU-default device= API that the CPU-determinism posture must reconcile)."
head_sha: 3ae3d2815add787f4080adcf1c3543226cd49205
head_sha_at_checkpoint: 060645f28950b8683be4731bd365a2e9ad51c44d
parent_audits:
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/landing-2026-05-24T18-30-00Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
evidence_paths:
  - docs/conventions/sub-phase-conventions.md
  - docs/conventions/cross-stack-equivalence-methodology.md
  - docs/phases/phase-2-cross-stack-replication.md
  - docs/common/taichi.md
  - docs/common/numba.md
  - common/common-py/pyproject.toml
  - common/common-py/src/common_py/__init__.py
  - common/common-py/src/common_py/determinism.py
  - common/common-py/src/common_py/capture.py
  - common/common-py/smoke/hello_taichi.py
  - common/common-py/tests/test_determinism.py
  - tools/testkit/equivalence/harness.py
  - tools/testkit/schemas/capture-v1.json
  - pyproject.toml
  - docs/dependencies.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:f4eb7eb705f6a8577127a3d83170ca68b4a1baec28c017be770f995daa7b292d
  docs/conventions/cross-stack-equivalence-methodology.md: sha256:61350ee47600f9d26f53f4e3fb0525b1099702ad91eecf27d0103c1c76d1da87
  docs/common/taichi.md: sha256:a420d275a154508bb03859addd169585e562301c2a9afb736945a3888b372e04
---

# Common-Warp Bootstrap — Plan-Drafting Probe Report

## § 1. Scope

(FACT — conventions doc § A.4 plan-then-dispatch + Convention C/D probe-before-edit.)
Anchor-probe artifact for the **common-warp bootstrap** sub-phase — the
focused-infrastructure deliverable that establishes the Stack-E (Python / NVIDIA
Warp) workspace surface, structurally analogous to what
`sub-phase-taichi-integration` did for Stack-D / common-py. This sub-phase is the
**enabler** the phase-2 plan calls "Stage 0" (`phase-2-cross-stack-replication.md`
§1.5.2 + §1.9.1); the three remaining spec § 11.3 Stack-E ports — MPM (item 2.3),
Smoke (item 2.4 second half), LBM (item 2.5 second half) — consume its public API
before they are dispatchable.

**Framing reconciliation (load-bearing).** The phase-2 plan was drafted
pre-sub-phase-pattern and frames common-warp bootstrap as the literal "Stage 0" of
a single-coordinator 9-stage monolithic Phase 2. That monolithic framing was
**SUPERSEDED** at `sub-phase-taichi-integration` plan-drafting close (D1 = SUPERSEDE;
`docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-probe-2026-05-23T13-41-01Z.md`
§ 5 D1), and every spec-Phase-2 deliverable since (5 Stack-D ports + 3 infra
sub-phases) has executed as an independent sub-phase under its own coordinator
chat. **This sub-phase therefore executes as `sub-phase-common-warp-bootstrap`,
mirroring the Taichi-integration shape**, while the phase-2 plan's §1.5.2 W-Gates
1-6 and §1.9.1 seven-subsystem API spec remain authoritative as **reference
material** (the same disposition D1 granted §1.5.1/§1.5.2/§1.9 as "useful reference,
monolithic-dispatch superseded"). This is recorded as shift S-W3 (§ 8) — not a
new decision, an inheritance of the already-ratified D1.

**Boundary.** This artifact + the charter (`docs/phases/sub-phase-common-warp-bootstrap.md`)
+ the plan-drafting landing + the SHA back-fill are the plan-drafting deliverable.
NO common-warp source, NO workspace-member edit, NO Warp install, NO docs/common/
authoring, NO CI run. Operator routes Stage 0 separately.

## § 2. Convention C / D / M / A discipline at HEAD

**Convention M (re-anchor; HEAD wins on drift).** HEAD is `060645f` at probe time
(`git rev-parse HEAD` = `060645f28950b8683be4731bd365a2e9ad51c44d`). Every SECTION-1
believed-state value was re-derived at HEAD (§ 3). No load-bearing drift since
`060645f`; the working tree carries only untracked artifacts (`.claude/`, two
`captures/eulerian-smoke-stack-d/taylor-green-128cube-seed42-step500.{h5,json}`
files — the chaotic-regime 3D artifact held local per smoke landing § 11; not a
tracked-state change).

**Convention #8 (never assert specifics from memory; moment-of-assertion verify).**
Warp upstream was web-fetched at probe time (§ 6): warp-lang **1.13.0** (released
**2026-05-04**), Python **3.10-3.14** supported, CPU + CUDA backends. common-py
current state was grep/read-verified at HEAD (§ 3 ITEM 2, § 5). No specific is
asserted from the dispatch prompt without HEAD or upstream corroboration.

**Convention C (probe API surfaces before drafting; verbatim citation).** Two API
surfaces probed verbatim: (a) common-py's actual public surface (`common_py/__init__.py`,
`determinism.py`, `capture.py`, `smoke/hello_taichi.py` — § 5); (b) the phase-2 plan
§1.9.1 `common_warp` public-API specification (the contract the charter's acceptance
criteria cite — § 5). Plus the equivalence harness (`compare_captures`) and the
`capture-v1.json` schema (W-1/W-5 anchors).

**Convention D (probe call sites; consumer-informed design).** How common-py is
consumed informs how common-warp will be. common-py at HEAD is consumed ONLY by its
own tests + smoke (probe § 5; the Taichi-integration probe § 2.7 finding "infrastructure
shipped, then wired"). The phase-2 plan §1.9.1 "What the Stack E port stages import"
block (lines 1118-1169) is the forward-looking consumer contract: Stages 5/7/8 call
`cw.init`, `cw.set_seed`, `cw.allocate_*`, `cw.HashGrid`, `cw.write_capture`. The
charter's API acceptance is shaped by those call sites, not invented.

**Convention A (additive-only; new files first).** Stage-0 work (out of plan-drafting
scope) is purely additive: a new `common/common-warp/` tree, new `docs/common/warp.md`,
a new workspace-member line, a new `docs/dependencies.md` row. NO existing-file
rewrites beyond additive registration. This plan-drafting chain itself adds only
new audit files + one new charter; touches nothing else.

## § 3. Believed-state reconciliation (SECTION 1 items, HEAD-verified)

| Item | Verdict | HEAD evidence |
|---|---|---|
| **HEAD = 060645f** | **CONFIRMED** | `git rev-parse HEAD` = `060645f28950b8683be4731bd365a2e9ad51c44d` |
| **Workspace member count = 19** | **CONFIRMED** | `pyproject.toml [tool.uv.workspace].members` = 14 Phase-1 + `common/common-py` + 5 Stack-D ports (rd2d/sph/lbm/mpm/smoke) = 19 (smoke `packages/eulerian-smoke-stack-d` is the 19th, registered at smoke Stage 1) |
| **Cumulative shifts entering = 165** | **CONFIRMED** | smoke landing § 12 closing total **165** (163 entering Stage 2 + S2-1/S2-2); arithmetic chain 89 (Taichi-integration entry) → … → 165 |
| **Bit-identity replay `9399fc33…718909f34`** | **CONFIRMED (HELD 32nd+)** | smoke landing § 4 + front-matter `evidence_hashes` replay = `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`; conventions § D.3 line 256 |
| **Integrity sweep baseline `c19492ad…d22cb52` (streak 8)** | **CONFIRMED** | smoke landing § 4 integrity-sweep `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` baseline-MATCH; byte-identical streak HELD into 8th sub-phase |
| **Conventions doc sha256 (post-§L.4)** | **CONFIRMED + re-pinned** | `sha256sum` at HEAD = `f4eb7eb705f6a8577127a3d83170ca68b4a1baec28c017be770f995daa7b292d` (supersedes the Taichi-probe-era `3698d19b…`; § L.4 three precedents present at lines 638-677) |
| **Methodology doc sha256 (post-§6 R-P2)** | **CONFIRMED + re-pinned** | `sha256sum` at HEAD = `61350ee47600f9d26f53f4e3fb0525b1099702ad91eecf27d0103c1c76d1da87`; § 6 chaotic-regime R-P2 formalization present (lines 301-405); § 7 References lists pair 5 as the witness template |
| **ITEM 1 — Warp NOT a workspace dep** | **CONFIRMED** | `common/common-warp/` ABSENT (`test ! -d` passes — Hard Rule 2 clear); no `warp` in any `pyproject.toml`; `docs/dependencies.md` mentions "Warp" only in a parenthetical capability list (line 29), zero dep declaration |
| **ITEM 2 — common-py workspace position** | **CONFIRMED** | `common/common-py` is a workspace member (`pyproject.toml` line 32, registered at Taichi-integration per D2 row 2); `taichi>=1.7,<2.0` declared at `common/common-py/pyproject.toml` line 17 (promoted from optional extra to required) |
| **ITEM 3 — S6-bootstrap-context analog** | **CONFIRMED (applies as W-3 stability check)** | conventions § L.4 S6-trajectory-simulation precedent present; bootstrap analog = the hello-warp smoke simulator (W-3) must produce a stable bounded trajectory at design time (§ 5 W-3) |
| **ITEM 4 — Stack-E port readiness** | **CONFIRMED (3 ports gated on this)** | phase-2 plan §1.3.1 table rows 2.3.E/2.4.E/2.5.E all "consumes common-warp"; §1.4 stage queue "Stage 0 gates Stages 5,7,8" (lines 401-419) |
| **ITEM 5 — full banked sweep** | **CONFIRMED** | § 4 table below; all major banked items present + STAY-BANKED |

**All SECTION-1 anchors CONFIRMED at HEAD. Hard Rule 2 not triggered as a blocker.**
The two believed-state corrections (S-W1, S-W2) are framing sharpenings, not
structural wrongness (§ 8).

## § 4. Banked-item enumeration sweep (ITEM 5)

(FACT — `grep -rl "BANKED\|banked" docs/_audits/phase-2/*/landing-*.md` + smoke
landing § 8 roll-up + conventions § L.2/L.3.)

| Banked item | Source | Disposition for common-warp bootstrap |
|---|---|---|
| **LFS-architecture sub-phase** (D13; remote-CI red on LFS download-bandwidth-quota) | smoke landing § 8 / § 11 | **STAY-BANKED.** Carries as D13-analog (D12 here). Local verification unaffected; common-warp's hello capture is small (64×64 2D smoke ≪ MB) so LFS pressure is negligible. |
| **LBM `sim_runner_diagnostic` cosmetic** | smoke landing § 8 | **STAY-BANKED.** No fold path through Warp bootstrap. |
| **actionlint install; check-yaml `.github/workflows/` coverage; supply-chain immutable-pin for 3 actions** | smoke landing § 8 (from ci-action-migration) | **STAY-BANKED.** CI-infra, not Warp-shaped. |
| **Manifest-equality smoke test (D7 deferred)** | smoke landing § 8 | **STAY-BANKED.** Testing-improvements scope; the LBM representative test covers the convention surface. (common-warp's W-3 e2e test exercises capture round-trip, a partial analog.) |
| **Phase-1-canonical re-characterization question (NEW from smoke landing)** | smoke landing § 8 NEW BANKED | **STAY-BANKED.** Bootstrap ships no Phase-1 canonical; the question is per-sim-port (Stage 5/7/8) scope, not infra. Recorded so the Stack-E smoke port (item 2.4) inherits it. |
| **Phase-1 open B2/B3/B4/B5/B6/B11/B16; B-hotfix-1/2; Cat-3 sibling subdirs + evaluator shims; DFSPH generator coverage** | conventions § L.3 | **STAY-BANKED.** Out of any current sub-phase scope. |
| **Testing-improvements sub-phase; cross-stack methodology full-formalization (#1 done, #2/#3/#5 deferred); mid-Phase-1 capture regeneration** | Taichi-integration probe § 2.2 D2 table | **STAY-BANKED.** Not Warp-shaped; methodology consolidates per-pair, not at infra bootstrap. |

**No surprise items.** No banked item has a fold-path through common-warp bootstrap.
The sub-phase is purely additive Stack-E infrastructure; it neither closes nor
re-opens any existing bank. (One bank is *prepared-for*, not closed: the Stack-E
ports the bootstrap enables will eventually exercise the chaotic-regime methodology
§ 6 and the Phase-1-canonical question — inherited, not resolved here.)

## § 5. W-Gate 1-6 readiness assessment at HEAD

The acceptance gates are phase-2 plan §1.5.2 (verbatim below); the module surface
they gate is §1.9.1's **seven subsystems** (Runtime, Capture, Determinism, Particles,
Grids, HashGrid, Smoke-sim). The six W-Gates verify the seven subsystems collectively.

> **§1.5.2 verbatim** (FACT — `phase-2-cross-stack-replication.md` lines 541-551):
> - **W-1 Capture I/O** — Implements `read_capture()` and `write_capture()` against
>   the canonical schema at `tools/testkit/schemas/capture-v1.json`.
> - **W-2 Determinism harness binding** — Exposes a `--deterministic` flag and seed
>   mechanism. The testkit's determinism harness produces a green report on the
>   module's smoke simulator.
> - **W-3 Smoke simulator** — A minimal "hello-physics" sim under
>   `common/common-warp/examples/hello/` that exercises every public subsystem.
>   Runs end-to-end; produces a capture.
> - **W-4 Public API documented** — `docs/common/warp.md` exists; Cat 2 contract
>   verification passes against the spec sheet.
> - **W-5 Cross-stack equivalence-harness compatibility** — The harness can compare
>   the common-warp smoke sim's capture against an existing common-cpp or common-py
>   smoke sim's capture, producing a diff report.
> - **W-6 Integrity gates green** — Cat 1, Cat 2, Cat 4 all pass against HEAD.

| Gate | Current state at HEAD | Design proposal (Convention-D consumer-informed) |
|---|---|---|
| **W-1 Capture I/O** | Canonical schema `tools/testkit/schemas/capture-v1.json` exists (FACT — required keys `schema_version, sim, stack, config, run, payload, determinism`). common-py's analog is `common_py.capture.{Reader, Writer, Manifest, …}` wrapping Phase-0 `testkit.capture` (`capture.py` lines 26-29). | §1.9.1 Subsystem 2 specifies `Capture` dataclass + `write_capture(capture, path, *, schema_version="1.0.0")` / `read_capture(path)` writing `<path>.h5 + <path>.json`. Implement over `h5py` + the testkit capture flat-module + jsonschema validation against `capture-v1.json`. **NB Warp-API collision (§ 6): `wp.capture_*` is CUDA-graph capture, NOT this file I/O — name the module function `write_capture`, never alias `wp.capture`.** |
| **W-2 Determinism harness binding** | common-py exposes `--deterministic`/`--seed` via `determinism.add_args`/`from_args` + `set_taichi_deterministic(Config, *, arch="cpu")` (`determinism.py` lines 48-128). The testkit determinism harness is `tools/testkit/equivalence/` + per-stack `*_harness/` (taichi_harness precedent). | §1.9.1 Subsystem 3 specifies `set_seed(seed)` / `get_seed()` / `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0)` + Subsystem-1 `init(device, deterministic)` + `deterministic_context()`. `set_seed` threads `wp.rand_init`/`wp.set_seed` + `random.seed` + NumPy RNG. **CPU-mode is the bit-determinism backend (§ 6 + D4).** Mirror taichi_harness with a non-shadowing `warp_harness/` (numba § 2 N2 lesson: `from warp import …` would shadow). |
| **W-3 Smoke simulator** | NO `common/common-warp/examples/hello/` at HEAD (module absent). common-py's analog `smoke/hello_taichi.py` (1D diffusion, 64-cell, 100 steps, exercises every common-py surface). | §1.9.1 Subsystem 7: a **2D advection-diffusion of a scalar field, 64×64**, exercising subsystems 1-5 end-to-end, writing `common/common-warp/examples/hello/captures/smoke-stack-e-ref.h5`; tests at `common/common-warp/tests/test_smoke_e2e.py` (gate W-3 + W-5). **S6-bootstrap analog (ITEM 3 / conventions § L.4):** the probe-time discipline requires the smoke sim's design produce a **stable bounded trajectory** — a 2D advection-diffusion with diffusivity > 0 and CFL-stable dt is unconditionally damping (decaying, bounded; the laminar opposite of smoke-Stack-D's chaotic Taylor-Green). Stage 0 must verify max-field-value is bounded/non-growing across the run (the W-3 e2e test asserts this). |
| **W-4 Public API documented** | `docs/common/warp.md` ABSENT at HEAD; sisters `cpp.md / py.md / numba.md / taichi.md / ts.md` all present. Cat-2 contract verification runs against the doc's cited spec sheet. | Author `docs/common/warp.md` mirroring `taichi.md`'s shape (§1 when-to-use, §2 required init form, §3 banned flags, §4 known limitations + workarounds, §5 cross-version posture, §6 determinism regression test, §7 workspace-adoption procedure, §8 re-pin policy). Sister to `taichi.md`/`numba.md`. Pin `warp-lang` per D3. |
| **W-5 Cross-stack equivalence compat** | Harness `tools/testkit/equivalence/harness.py:compare_captures(left, right, tolerance_table_path=None) → EquivalenceVerdict` exists. **CRITICAL FINDING:** it HARD_FAILs (`within_tolerance=False` + synthetic `sim:category-mismatch`) when `left.sim.{name,category} != right.sim.{name,category}` (lines 104-115). Existing smoke captures: common-py `hello-taichi-cpu` (`sim.name="hello-taichi-smoke"`, category `smoke`, 1D) + common-py/cpp `advection-1d-smoke` (1D). **No 2D advection-diffusion smoke capture exists** to numerically match the §1.9.1 hello-warp. | The gate's literal wording is **compatibility** ("the harness *can* compare … *producing a diff report*"), not GREEN numeric equivalence. Demonstrate `compare_captures` ingests a common-warp capture + an existing common-py/cpp capture and emits an `EquivalenceVerdict` (the diff report). For a *meaningful* (non-category-mismatch) diff, align the hello-warp manifest `sim.{name,category}` to the partner. **D8 surfaces this:** (a) align hello-warp's manifest to the existing 1D smoke for a real diff (physics differs → expect divergence, like a tame-regime witness), OR (b) treat W-5 as format-interoperability (verdict produced = pass) and defer numeric cross-stack equivalence to the per-sim Stage-5/7/8 ports. Lean (b) — numeric equivalence is per-sim-port scope, not bootstrap scope; this matches how Taichi-integration's hello smoke was a W-Gate-5 *compatibility* demonstration, not a sim-equivalence gate. |
| **W-6 Integrity gates green** | Cat-1 (citation resolution), Cat-2 (contracts), Cat-4 (draft-time spec verification) run against HEAD; integrity sweep baseline `c19492ad…d22cb52` (8-streak). common-py's W-Gates were verified GREEN at Taichi-integration landing (11 deliverables GREEN; sweep byte-identical). | Cat-1: every `path:line`/citation in `docs/common/warp.md` + module docstrings resolves at HEAD (the `cat4-path-line-assertions` pre-commit hook enforces commit-by-commit). Cat-2: `docs/common/warp.md` contract matches the module's actual public surface. Cat-4: draft-time spec verification on `docs/common/warp.md`. Integrity sweep must stay baseline-MATCH (new additive code only; the 8-streak should extend to a 9th, the FIRST Stack-E entrant). |

## § 6. Warp upstream HEAD-verify (Convention #8 — web-fetched at probe time)

(FACT — `pypi.org/project/warp-lang/` + `github.com/NVIDIA/warp/releases` +
`nvidia.github.io/warp/` + Warp-determinism web search, all fetched 2026-05-24.)

- **Current latest stable version:** **warp-lang 1.13.0**, released **2026-05-04**
  (≈3 weeks before this probe). Recent line: 1.12.x (Apr 2026), 1.11.x, 1.10.x.
  v1.13.0 added an experimental portable serialized-graph format (`.wrp` via
  `wp.capture_save`/`wp.capture_load`) — **CUDA-graph capture, unrelated to the
  project's HDF5 capture I/O** (see naming-collision note below).
- **Python support:** **3.10-3.14**. Repo requires `>=3.12` (`pyproject.toml`
  line 8) — **compatible**. No Python-version blocker.
- **CPU + GPU support:** **YES, both.** Warp runs on CPU (x86-64, ARMv8, Apple
  Silicon) with no CUDA requirement, OR on a CUDA-capable NVIDIA GPU (≥ GTX 9xx).
  `wp.init()` + a CPU device string ("cpu") is available. → **CPU-mode determinism
  path is viable** (D4); GPU is per-sim-port future scope (the §1.9.1 API defaults
  to `device="cuda:0"`, which the CPU-determinism posture must override — S-W2).
- **CPU-mode determinism posture:** Warp publishes **no formal cross-version
  bit-equality guarantee** (same posture as numba § 5 / taichi § 5). The general GPU
  reality (corroborated by the determinism web search): **kernels relying on atomic
  operations are NOT deterministic on GPU** (atomic update order varies across runs
  by hardware/runtime); determinism is achievable by structuring reductions as fixed
  hierarchical trees and avoiding atomics. **CPU single-device execution avoids the
  atomic-ordering nondeterminism** — the Warp analog of Taichi's `cpu_max_num_threads=1`
  and numba's `parallel=False`. **Stage 0 must empirically verify** bit-identity
  run-to-run on CPU (the W-2 determinism regression test); the posture is
  `bit-exact-same-hw` on CPU, `epsilon-bounded-cross-stack` against Stack-C/D — same
  table as taichi § 4.4. Seed mechanism: `wp.rand_init(seed, …)` per-thread RNG state
  (the §1.9.1 `set_seed` wrapper threads it). **(Convention #8: this RNG-API name is
  to be re-verified at Stage 0 moment-of-use against warp-lang 1.13.0's actual
  signature; not relied on from this probe's summary.)**
- **Capture/write surface — NAMING COLLISION (load-bearing).** Warp's `wp.capture_begin`
  / `wp.capture_end` / `wp.capture_save` / `wp.capture_load` is **CUDA-graph capture**
  (recording a kernel-launch graph for replay), **wholly unrelated** to the project's
  "capture I/O" (= simulation-state HDF5 + JSON manifest per spec § 2.7). The §1.9.1
  Subsystem-2 `write_capture`/`read_capture` are the project's own HDF5 functions
  built on `h5py` + the testkit capture module — **not** wrappers of `wp.capture_*`.
  `docs/common/warp.md` and the module docstrings MUST disambiguate to prevent a
  future agent conflating the two. (Recorded as observation O-W1, § 9.)
- **Filterwarnings posture (D12 / S0-1):** Warp's import/init behavior under Python
  3.12 + a strict `filterwarnings = ["error"]` pytest config is **not yet HEAD-verified**
  (Warp not installed; out of plan-drafting scope to install). The S0-1 banked
  precedent (bare-form `ignore::<Warning>` filters, established at smoke Stage 0 for
  Taichi's `SyntaxWarning`/`locale` DeprecationWarning) **applies pre-emptively IF**
  Warp emits any compile-time/import-time warning under strict pytest. **Stage 0 must
  HEAD-verify** Warp's warning emission and, if present, add the bare-form filter to
  `common/common-warp/pyproject.toml [tool.pytest.ini_options].filterwarnings` (mirror
  the `taichi.*` filter at `common/common-py/pyproject.toml` lines 63-72). Lean: apply
  bare-form discipline if-and-only-if a warning is observed; do not pre-add a filter
  for a warning that is not emitted (keeps the surface tight).

Sources: [warp-lang · PyPI](https://pypi.org/project/warp-lang/) ·
[NVIDIA Warp Documentation](https://nvidia.github.io/warp/) ·
[Releases · NVIDIA/warp](https://github.com/NVIDIA/warp/releases) ·
[Controlling Floating-Point Determinism in NVIDIA CCCL](https://developer.nvidia.com/blog/controlling-floating-point-determinism-in-nvidia-cccl/).

## § 7. Naming proposal

**D1 lean:** `sub-phase-common-warp-bootstrap` (charter
`docs/phases/sub-phase-common-warp-bootstrap.md`; audit dir
`docs/_audits/phase-2/sub-phase-common-warp-bootstrap/`; module
`common/common-warp/`, package `bit-physics-common-warp`, import name `common_warp`).
This mirrors `sub-phase-taichi-integration` (focused-infra, not per-sim) and matches
the phase-2 plan §1.9.1 package name `bit-physics-common-warp` verbatim. The "bootstrap"
suffix distinguishes it from the Phase-3.7 "common-warp matures" deliverable
(phase-2 plan line 359; `__version__ = "0.1.0"` minimal-bootstrap, bumps at 3.7).

## § 8. D-class question enumeration (leans; operator decides)

| D | Question | Lean (recommend, do not decide) |
|---|---|---|
| **D1** | Canonical sub-phase name | **`sub-phase-common-warp-bootstrap`** (§ 7). |
| **D2** | Stage decomposition | **5-commit single substantive stage** (plan-drafting + Stage 0 + Stage 1 + Stage 2), like Taichi-integration. BUT the §1.9.1 surface is LARGER than common-py's Taichi delta (7 from-scratch subsystems + 7 test files + smoke sim + warp.md vs Taichi-integration's "wire existing common-py + add one wrapper + one smoke"). Lean: **Stage 0 pre-flight (replay/baseline/Warp-install-verify/filterwarnings) → Stage 1 implementation (all 7 subsystems + tests + smoke + warp.md, possibly sub-split 1a runtime/capture/determinism / 1b particles/grids/hashgrid / 1c smoke+equivalence) → Stage 2 landing**. Operator confirms 1-split vs 1a/b/c at Stage 0 scope-analysis (Task 0.4 / § N). |
| **D3** | Warp version pin | **`warp-lang>=1.13,<2.0`** (1.13.0 known-good 2026-05-04; mirror `taichi>=1.7,<2.0` upper-bound-to-next-major discipline, conventions § H.4). Coordinator had no lean; HEAD-verified pin per Convention #8. Re-verify exact latest at Stage 0 moment-of-install. |
| **D4** | Warp CPU-mode determinism posture | **`bit-exact-same-hw` on CPU single-device** (the Warp analog of taichi `cpu_max_num_threads=1` / numba `parallel=False`); `epsilon-bounded-cross-stack` against Stack-C/D. CPU avoids atomic-ordering nondeterminism (§ 6). The §1.9.1 GPU-default `device="cuda:0"` is overridden to CPU for the bootstrap's determinism contract; GPU is per-sim-port future scope. **Stage 0 empirically verifies** run-to-run bit-identity (W-2 regression test). |
| **D5** | Hello-warp smoke surface | **§1.9.1 Subsystem 7 as specified: 2D advection-diffusion scalar field, 64×64, exercising subsystems 1-5, writing `examples/hello/captures/smoke-stack-e-ref.h5`**. Implement the kernels in `@wp.kernel` (`examples/hello/kernels.py`). Must be a **stable bounded trajectory** (S6-bootstrap analog, ITEM 3): diffusion-dominated, CFL-stable, decaying — verify max-field-value bounded at design time. |
| **D6** | Module name convention | **package `bit-physics-common-warp`, import `common_warp`** (§1.9.1 verbatim). **Layout sub-question (S-W4):** §1.9.1 shows a FLAT `common/common-warp/common_warp/` (no `src/`), whereas common-py uses `common/common-py/src/common_py/`. Lean: **follow §1.9.1's flat layout** (it is the authoritative spec) but note the divergence from common-py's `src/` layout; OR adopt `src/` for consistency with common-py + hatchling `packages=["src/common_warp"]`. Operator picks; lean = §1.9.1 flat (spec wins) unless src-layout consistency is preferred. |
| **D7** | `docs/common/warp.md` scope | **Mirror `taichi.md`'s 8-section shape** (when-to-use / init form / banned flags / known limitations / cross-version / determinism regression test / workspace-adoption / re-pin), adapted to Warp (CPU determinism, atomic-nondeterminism ban, `wp.capture_*`-vs-HDF5-capture disambiguation, GPU-epsilon posture). Sister to `taichi.md` + `numba.md`. |
| **D8** | W-Gate 5 cross-stack smoke-pair | **Treat W-5 as harness format-interoperability** (verdict/diff-report produced against an existing common-py/cpp smoke capture = pass); numeric cross-stack equivalence is per-sim-port (Stage 5/7/8) scope. **Finding:** `compare_captures` HARD_FAILs on `sim.{name,category}` mismatch (§ 5 W-5); no 2D advection-diffusion partner capture exists at HEAD. Alternative: align hello-warp's manifest `sim.{name,category}` to the existing 1D common-py smoke for a real (divergent, physics-differs) diff. Lean (b)/interoperability. |
| **D9** | Next Stack-E port routing (post-bootstrap) | **MPM-Stack-E** (spec § 11.3 item 2.3 "MPM to Stack E (Warp port)"; phase-2 plan §1.4 Stage 8 "load-bearing for Phase 4 critical-path"; freshest from MPM Stack-D landing). Coordinator lean honored. **Recorded for operator routing AFTER this sub-phase lands** — out of this sub-phase's scope. |
| **D10** | Optional non-phase point-release tag | **NO TAG** (consistent with all spec-Phase-2 sub-phase precedent; conventions § D.2). |
| **D11** | Replay-chain anchor | **`v0.1.0-phase-1`** (the only mechanically-resolvable phase tag at HEAD per the replay-resolver regex; Taichi-integration probe § 2.8 / D3). Stage 0 Task 0.0 becomes the 33rd+ bit-identity invocation. |
| **D12** | CI-red LFS-bandwidth state (carries from smoke D13) | **Record known-banked; no action.** Local verify/replay unaffected; common-warp's hello capture is tiny (64×64 2D ≪ MB; negligible LFS pressure). Stage 2 documents local-only posture if quota blocks CI. |
| **D13** | Filterwarnings posture if Warp emits SyntaxWarning analogs | **Apply S0-1 bare-form discipline IFF Warp emits a warning under strict pytest** (HEAD-verify at Stage 0; § 6). Do not pre-add a filter for an unobserved warning. |
| **D14** | Workspace registration as 20th member | **Register `common/common-warp` at root `pyproject.toml [tool.uv.workspace].members`** (the 20th member; first Stack-E entrant), at Stage-0/1 per the common-py D2-row-2 precedent. Declare `bit-physics-common-warp` + `warp-lang` pin; add `docs/dependencies.md` row + `docs/common/warp.md`. (Mechanical, but surfaced for completeness — mirrors the common-py registration.) |

## § 9. Discrepancies / observations

**Believed-state corrections (shifts; § 8 of coordinator report):**

- **S-W1 — hello-warp path.** SECTION 1 / ITEM 3 cite the smoke simulator at
  `common/common-warp/examples/hello-warp/`. **HEAD-authoritative path is
  `common/common-warp/examples/hello/`** (phase-2 plan §1.5.2 W-3 line 545 + §1.9.1
  layout line 857). Per Convention M, HEAD/plan wins. Believed-state correction,
  not a blocker.
- **S-W2 — seven subsystems + GPU-default API.** SECTION 1 frames the deliverable
  around "W-Gates 1-6." HEAD §1.9.1 specifies **seven subsystems** (Runtime, Capture,
  Determinism, Particles, Grids, HashGrid, Smoke-sim) — the six W-Gates verify the
  seven subsystems collectively. Additionally, the §1.9.1 API **defaults to
  `device="cuda:0"`** (GPU-first), which the bootstrap's CPU-determinism posture (D4)
  must override. Both are framing sharpenings the charter incorporates.
- **S-W3 — Stage-0 framing inheritance.** The phase-2 plan calls this "Stage 0" of a
  monolithic Phase 2; that monolithic dispatch was SUPERSEDED at Taichi-integration
  D1. This sub-phase executes as an independent sub-phase; §1.5.2/§1.9.1 remain
  authoritative reference. (Inheritance of a ratified decision, recorded for chain
  visibility.)

**Observations (no action this sub-phase):**

- **O-W1 — `wp.capture_*` vs HDF5-capture naming collision** (§ 6). `docs/common/warp.md`
  + module docstrings must disambiguate Warp's CUDA-graph capture from the project's
  capture I/O. Stage-1 implementation discipline.
- **O-W2 — pure-literal kernel-constant f64-seed discipline (conventions § L.4
  precedent #7).** Applies to `@wp.kernel` bodies analogously to `@ti.kernel`: seed
  any pure-literal non-power-of-2 constant if Warp's type inference defaults to f32
  absent an explicit dtype. **Stage 0 HEAD-verifies** Warp's literal-type-inference
  behavior; the hello-warp 2D advection-diffusion kernels should use explicit f64 (or
  Warp's `float64`) where the algorithm requires it. (Bootstrap is not a cross-stack
  pair, so the leak is not yet observable — documented as inherited discipline for the
  Stack-E ports.)
- **O-W3 — IC-15 chaotic-regime escape-hatch + S6-trajectory-simulation** (conventions
  § L.4; methodology § 6) are inherited methodology for the 3 Stack-E ports, NOT
  directly applicable to bootstrap (no cross-stack pair, no Phase-1 canonical). The
  W-3 hello smoke is the bootstrap-context S6 analog (stable bounded trajectory
  verified at design time). Recorded so MPM/Smoke/LBM Stack-E inherit it.
- **O-W4 — common-py is "shipped, then wired"** (Convention-D call-site finding,
  inherited from Taichi-integration probe § 2.7 / numba § 2). common-py is consumed
  only by its own tests at HEAD; the Stack-D ports consume `taichi` + `common_py`.
  common-warp will be the same on landing — infrastructure shipped, wired by the
  Stack-E ports that follow. Not a defect; the expected bootstrap shape.

## § 10. Probe report close

This probe is the load-bearing artifact for the operator's D1-D14 routing at charter
close. All SECTION-1 believed-state anchors CONFIRMED at HEAD; Warp upstream
HEAD-verified (1.13.0, CPU+GPU, Python-compatible); the §1.9.1 seven-subsystem API +
§1.5.2 W-Gates probed verbatim; the equivalence-harness `sim.{name,category}`-match
constraint surfaced as the load-bearing W-5 finding. **No drift blocker (Hard Rule 2
clear); `common/common-warp/` absent as expected.** Two believed-state corrections
(S-W1 path; S-W2 seven-subsystems/GPU-default) + one inheritance (S-W3 framing).

Charter at `docs/phases/sub-phase-common-warp-bootstrap.md` lands next (COMMIT 2),
then the plan-drafting landing audit (COMMIT 3), then the Convention #12 SHA back-fill
(COMMIT 4).

**Probe verdict: CONFIRMED — drafting unblocked.**

---

*End of plan-drafting probe. Charter follows (COMMIT 2).*

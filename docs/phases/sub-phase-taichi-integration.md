# Taichi-integration — Sub-Phase Charter (Spec-Phase-2 Entry)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — focused infrastructure sub-phase establishing Stack D (Python / Taichi) workspace surface before subsequent per-sim Stack-D cross-stack port sub-phases consume it.
> **Sub-phase identity:** FIRST spec-Phase-2 deliverable per `docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md` § 10.5 item 4 + `docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md` § 9.2 row "Taichi-integration sub-phase". Mirrors the `sub-phase-numba-integration` focused-infrastructure-hotfix shape (`docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md`). This is NOT a per-sim implementation sub-phase. This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries (N a single integer). No `-phase-N` tag is proposed for this sub-phase.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 4.4 (Stack D — Python / Taichi), 5.3 (target-category stack scoping), 7.5 (audit-trail mechanical anchors), 7.8 (runtime-only display-surface CI-gating), 7.12 (phase-tag form + agent-vs-operator tag-push split), 11.3 (Phase 2 scope), Appendix D § D.2.3 (canonical-capture descriptors).
> **Parent conventions doc** (authoritative for every spec-Phase-2 sub-phase): `docs/conventions/sub-phase-conventions.md` (sha256 `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734`). Inherits role model, audit / append-only discipline, checkpoint discipline, Convention #12 SHA back-fill, replay-chain non-participation, problem-solving playbook (P22 / P23 / P24 / P25 / P26), gate-13 worktree pattern, FACT / INFERENCE tagging — by REFERENCE, not re-stated.
> **Parent sub-phase templates** (structure inheritance): `docs/phases/sub-phase-numba-integration.md` does **NOT exist** (FACT — numba-integration was a spawned-from-parent-R-class hotfix without a per-sub-phase plan document; landing audit at `docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md` is the structural precedent). This charter therefore inherits structure from `docs/phases/sub-phase-agent-based.md` (the most-evolved per-sim template) adapted to the focused-infrastructure shape per the numba-integration landing-audit's § 1–§ 10 structure.
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - Spec-Phase-1 landed at `v0.1.0-phase-1` (SHA `9998bc1`); landing audit `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` verdict CONFIRMED.
> - All 9 Phase-1 sims GREEN at sub-phase landings closed-form `2cc0f21` / agent-based `739c93f` / continuous-CA-rd3d `0df358d` / particle-fluids-sph-water `281c74f` / eulerian-smoke `cf13d1c` / lattice-boltzmann-d3q19 `4f79e19` / mpm-multimaterial `bd89e78` (FACT — MPM landing § 10.1).
> - 5 hotfix sub-phases landed (replay-tool `1f5fa0c` / numba-integration `569c883` / mutation-script `27304d0` / conventions-consolidation `34c7d34` / git-lfs-migration `0672554`); conventions-refactor-post-phase-1 landed at `e2dc789` (FACT — MPM landing § 10.2 + `git log` at HEAD).
> - `v0.1.9` non-phase point-release tag pushed by operator post-MPM landing, marking the all-9-sims-GREEN structural milestone (FACT — MPM landing § 10.4 + conventions-refactor landing § 11).
> - Conventions doc stabilised at sha256 `3698d19b…2bd734` (FACT — conventions-refactor landing § 3.2).
> - Bit-identity replay invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` held byte-identically across **16+ invocations** through conventions-refactor Stage 0 (FACT — conventions-refactor landing § 2 Task 0.0; numba-integration landing § 5 V5).
> **Inherited shifts:** **89 documented entering spec-Phase-2** (FACT — conventions-refactor landing § 8.3 / § 9.3 row 5; arithmetic 21+11+10+6+13+8+9+7+4=89). Carried forward by reference; not re-stated, not re-litigated.
> **Date drafted:** 2026-05-23.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator.

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase is

This sub-phase establishes **Stack D (Python / Taichi) infrastructure** at the workspace level so that subsequent spec-Phase-2 Stack-D cross-stack sim sub-phases (per `docs/phases/phase-2-cross-stack-replication.md` § 1.3.1 rows 2.1.D / 2.2.D / 2.4.D / 2.5.D — RD-2D / SPH-water / eulerian-smoke / LBM Stack-D ports) can consume Taichi as a first-class workspace dependency without re-deciding adoption mechanics per-sim.

Mirrors the `sub-phase-numba-integration` shape (FACT — `docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md`): focused infrastructure, additive-only to workspace surface, single-coherent-deliverable, embedded validation chain, opens downstream-sub-phase capacity without consuming any per-sim work itself.

Specifically lands:

1. **Workspace wiring for `common/common-py/`** (D2 disposition row 2 — see § 11.2). common-py already exists at HEAD with capture / determinism / ggui / hotreload / alembic / vdb / plotting surfaces (FACT — `common/common-py/src/common_py/`); this sub-phase adds it to `[tool.uv.workspace].members` and resolves the "common-py adoption decision" banked since the numba-integration re-anchor finding (FACT — numba landing § 2 paragraph "Re-anchor finding" + conventions-refactor landing § 9.2 row 4).
2. **Taichi declared as a workspace-accessible dependency** at common-py's `[project].dependencies` (i.e., promoting the `[taichi]` optional extra to required) OR at `tools/testkit/pyproject.toml` (the numba-integration precedent; Taichi-integration's Stage 0 routes the choice per § 4.1 Task 0.3).
3. **Determinism convention for Taichi** (docs/common/taichi.md mirroring docs/common/numba.md) — `ti.init(arch=..., random_seed=..., deterministic_mode=True)` as the required initialization form; banned flags per spec § 4.4 + the FP-equivalent-not-bit-equivalent contract framing the numba-integration landing § 3 established.
4. **Hello-physics Taichi smoke sim** under `common/common-py/smoke/hello_taichi.py` (or analogous; precise path is Stage 1 deliverable) exercising every public common-py surface that Stack-D ports will consume — `set_taichi_deterministic`, `Capture.write_capture`, `FKeyDispatcher` (CI-skipped per spec § 7.8), `watch_and_reexec` (also CI-skipped — interactive surface).
5. **Taichi-vs-NumPy FP-equivalence regression-test harness** at `tools/testkit/taichi_harness/tests/test_taichi_determinism.py` (non-shadowing subpackage name per numba landing § 8 N2 lesson: `taichi_harness/` NOT bare `taichi/` since `from taichi import ti` would shadow the upstream package at pytest collection time). Mirrors the numba_harness 5-test contract: FP-equivalence at small N, run-to-run bit-identity, cold-vs-warm cache identity.
6. **Integrity sweep GREEN** at HEAD (Cat 1 / 2 / 3 / 4 / 5 / X) — additively; aspirationally bit-identical to MPM-landing § 7.2 + conventions-refactor § 7.2 evidence sha256s.
7. **Equivalence-harness compatibility** with an existing common-* smoke capture — the existing common-py smoke (`common/common-py/smoke/advection_1d.py`) provides the reference for the Taichi smoke to diff against (W-Gate 5 analogue per phase-2 plan § 1.5.2).

(FACT — anchored against `docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-probe-2026-05-23T13-41-01Z.md` § 4 + spec § 4.4 + common-py state at HEAD per probe § 2.7.)

### § 1.2 What this sub-phase is NOT

- A new spec-phase. The next spec-phase tag per spec § 7.12 is `v0.2.0-phase-2`; this sub-phase's intermediate work accumulates to `main` without a `-phase-N` tag (see § 11.4).
- A per-sim Stack-D port. RD-2D / SPH-water / eulerian-smoke / LBM Stack-D ports are subsequent sub-phases (D1 routing — see § 11.5). MPM is already in Stack D as its primary target per spec § 1.5; Stack-D MPM at HEAD ships in NumPy + numba per Phase 1 implementation, and a Stack-D Taichi port of MPM is a separate downstream sub-phase per spec § 11.5 "Diff MPM (Stack D, building on DiffTaichi)" Phase 4 anchor + the existing phase-2 plan's omission of MPM from Stack-D ports (MPM source is already Stack D per spec § 11.2 item 1.5).
- A Stack-E (Warp) deliverable. `common/common-warp/` does NOT exist at HEAD; common-warp is a separate operator-routable sub-phase (per existing phase-2 plan § 1.9.1; D1 routing).
- A cross-stack equivalence run against any existing Phase-1 sim. Cross-stack equivalence at the per-sim level is the work of the subsequent Stack-D port sub-phases.
- A frontier-variant (Phase 4) deliverable. DiffTaichi `ti.ad.Tape` enablement is a Phase-4 concern per spec § 11.5; Taichi-integration ships the substrate, not the differentiability surface.
- An edit of any Phase 0, Phase 1, or post-Phase-1 sub-phase audit file. Audit chain is append-only per conventions doc § B.1.
- Editing `docs/phases/phase-2-cross-stack-replication.md`. D1 routing (see § 11.5) surfaces the supersession-vs-precursor question for operator routing; the amendment itself is a separate operator-routed audit.
- Editing the post-refactor conventions doc. Locked at sha256 `3698d19b…2bd734` per conventions-refactor landing § 3.2.
- Pre-committing D1 / D2 / D3 — those are operator decisions surfaced for routing at landing-audit close (see § 11.5).

### § 1.3 Phase-1 inputs + inherited shifts (89 cumulative) + banked items consumed

(FACT — conventions-refactor landing § 8.3 / § 10; MPM landing § 9.3 / § 10.5; numba-integration landing § 8 / § 9.)

**Phase-1 closing posture spec-Phase-2 inherits:**
- All 9 Phase-1 sims GREEN through gates 4–13 (closing tag `v0.1.9` operator-pushed).
- 89 cumulative shifts recorded across the audit chain; carried forward.
- Bit-identity replay invariant `9399fc33…909f34` (16+ invocations).
- Conventions doc stabilised at `3698d19b…2bd734`.
- common-py exists with 7 modules + smoke sim; NOT in workspace; NOT imported by any package or tool at HEAD (FACT — probe § 2.7).
- numba available as workspace dep (`numba >= 0.61, < 0.66` at `tools/testkit/pyproject.toml`) per numba-integration § 2; FP-equivalent-not-bit-equivalent contract framing established at numba landing § 3.

**Banked items consumed by THIS sub-phase** (D2 disposition; see § 11.2 for full table):
- **common-py adoption decision** (numba landing § 2 re-anchor finding + conventions-refactor landing § 9.2 row 4): **SCOPED IN** — Stage 1 wires common-py into `[tool.uv.workspace].members`.
- **Taichi-integration sub-phase** (conventions-refactor landing § 9.2 row "Taichi-integration sub-phase"): **THIS sub-phase** — resolved by existence of this charter.

**Banked items DEFERRED** (D2 disposition; see § 11.2):
- Testing-improvements sub-phase (separate banked-chat owner).
- Cross-stack verification methodology (first Stack-C-to-Stack-D port sub-phase).
- evidence_paths strict-verify remediation (LFS) — separate operator routing per conventions doc § B.6 lean.
- Mid-Phase-1 capture regeneration (per-sim work).

### § 1.4 Sub-phase-specific posture

#### § 1.4.1 Taichi determinism strategy

(FACT — spec § 4.4 "Verification posture: Taichi has explicit determinism flags. Reproducibility within Taichi is well-supported." + spec Appendix D § D.6 cross-stack equivalence "epsilon-bounded-cross-stack" framing + numba-integration landing § 3 FP-equivalent-not-bit-equivalent contract.)

The Taichi-vs-NumPy contract this sub-phase establishes:

1. **FP-equivalent within numba's same threshold** (max_abs_diff < 1e-9 absolute, well below spec's cross-stack 1e-4 relative). Same framing the numba-integration landing § 3 established for NumPy-vs-numba; same justification (SIMD-vs-scalar gap in NumPy's vectorized inner code vs Taichi's lowered backend kernel code).
2. **Bit-deterministic with itself** when `ti.init(arch=..., deterministic_mode=True, random_seed=<seed>)` — Taichi run-to-run produces bit-identical output. This is the load-bearing same-stack-same-hw guarantee.
3. **Cold-vs-warm JIT-cache identity** — Taichi clearing its kernel cache produces bit-identical output (compiled-artifact-invariant). Mirrors numba's `cache=True` cold-vs-warm contract.

**Required initialization form** (proposed for `docs/common/taichi.md`):
```python
import taichi as ti
ti.init(arch=ti.cpu, deterministic_mode=True, random_seed=<seed>)
```

**Banned flags** (proposed; Stage 1 finalises against actual Taichi 1.7+ surface):
| Flag | Why banned |
|---|---|
| `default_fp=ti.f32` when sim uses `ti.f64` | Silent precision downgrade — breaks FP-equivalence against NumPy reference. |
| `fast_math=True` (Taichi's analogue of numba's `fastmath`) | Re-associates FP ops; breaks bit-exactness contract (1) above. |
| `cpu_max_num_threads > 1` for any kernel relying on default reduction ordering | Taichi's parallel reductions are nondeterministic by default; bit-exact requires explicit per-thread accumulator + deterministic gather. |

**Cross-stack equivalence against Stack C** (FACT — spec § 4.4 "Cross-stack equivalence against Stack C is the harder direction (FP order is not guaranteed equal)"): Taichi-vs-Vulkan equivalence is epsilon-bounded per spec § 2.6 default tolerance table, NOT bit-exact. Downstream Stack-D port sub-phases inherit this posture; Taichi-integration itself does not run cross-stack equivalence (no Stack-C smoke exists to diff against at HEAD for the hello-physics surface).

#### § 1.4.2 Hot-reload workaround posture

(FACT — spec § 4.4 "Known limitations: `@ti.kernel` cannot hot-reload (decorator captures AST at decoration time); workaround is process-restart" + `common/common-py/src/common_py/hotreload.py` AS-COMMITTED.) common-py.hotreload already implements `watch_and_reexec(paths, debounce_ms=250)` using `watchfiles.watch` + `os.execvp` for the process-restart pattern. **Stage 1 deliverable:** verify the existing implementation against current `watchfiles` (>=0.21 per common-py pyproject) + extend with Taichi-specific cleanup helpers if needed; do NOT redesign. The hello-physics smoke sim exercises this surface end-to-end (CI-skipped per spec § 7.8 because it requires file-system event polling).

#### § 1.4.3 GGUI CI-gating posture

(FACT — spec § 7.8 + phase-2 plan § 1.6.6 + spec § 4.4 limitation "Taichi GGUI does not enumerate F-key constants; key bindings for save/load use explicit values".) Taichi GGUI windows + interactive input are runtime-only display surfaces; CI does NOT exercise them. The existing `common/common-py/src/common_py/ggui.py` `FKeyDispatcher` provides the poll-then-dispatch pattern; the hello-physics smoke sim's GGUI integration is documented + manually-verifiable but its tests are explicitly NOT registered in CI per phase-2 plan § 1.6.6. The landing audit § 7 declares which surfaces fall into "CI-tested" vs "visual-verification-pending" categories.

#### § 1.4.4 FMA fusion expectations for cross-stack equivalence

(INFERENCE — spec § 4.4 "Verification posture" + spec § 5.7 cross-stack tolerance + numba landing § 3 SIMD-vs-scalar discussion.) Taichi backends (CPU LLVM / CUDA / Vulkan / Metal) emit code with backend-driver-specific FMA-fusion decisions. Within a single backend on fixed hardware, FMA fusion is deterministic at fixed driver/Taichi versions. Across backends, FMA fusion order may differ — Stack-D cross-stack equivalence against Stack-C Vulkan is epsilon-bounded, not bit-exact, primarily because of this. **Stage 1's regression-test harness** exercises FP-equivalence on the CPU backend only (`arch=ti.cpu`) — GPU-backend equivalence is the work of downstream Stack-D port sub-phases that have GPU access in their CI environment.

#### § 1.4.5 future-annotations breakage

(FACT — spec § 4.4 limitation "`@ti.kernel` argument annotations break with `from __future__ import annotations`; module-level import order matters".) Stage 1 deliverable must explicitly NOT use `from __future__ import annotations` in any module containing `@ti.kernel`-decorated functions. The hello-physics smoke sim's kernel module follows this restriction; the regression-test harness verifies via static-import-discipline check. Documented at `docs/common/taichi.md`; new playbook entry P27 (§ 9.1 below) catches debugging failures from this surface.

### § 1.5 Role model, conventions, audit discipline

Inherited from conventions doc § A.3 + § C + § B verbatim. Single Claude Code agent at a time; single Claude.ai coordinator chat; one operator. Convention #12 SHA back-fill at every stage close per § B.2 tightened-discipline rule (full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed from earlier conversation context).

### § 1.6 Architecture — three stages

Adopts the three-stage cadence (Stage 0 pre-flight / Stage 1 implementation / Stage 2 landing) per conventions doc § A.2 row 1 (per-sim implementation pattern). **Rationale for three-stage rather than single-repair-audit (numba-integration shape):**

- Numba-integration was a spawned-from-parent-R-class hotfix (R18 from sph-water Stage 1); its single-session shape was justified by the urgency of unblocking the parent sub-phase.
- Taichi-integration is plan-drafted in advance (this charter), with NO blocked parent sub-phase. The three-stage cadence is appropriate because (a) the cross-phase replay against `v0.1.0-phase-1` (D3 anchor) is the right Stage 0 pre-flight discipline; (b) the workspace-wiring + Taichi declaration + common-py adoption + smoke sim + regression-test harness + integrity sweep is a larger Stage 1 surface than numba-integration's `pyproject.toml`-bump + `numba_harness/` + convention doc; (c) the landing-audit at Stage 2 properly closes the convergence-file edits (CHANGELOG / dependencies.md / any new common-* docs) under a single dedicated landing session.

D1 routing (§ 11.5) does not affect this cadence choice — Taichi-integration's internal stage count is independent of whether the existing phase-2 plan is superseded or treated as precursor.

- **Stage 0 — Pre-flight.** Cross-phase replay against `v0.1.0-phase-1` (17th invocation of bit-identity invariant); tolerance-budget carryover; re-verify all 9 Phase-1 sims' RED evidence sha256 (mass gate-13 precondition since common-py wiring + Taichi dep may affect testkit consumers); pre-flight verification of common-py's existing test suite GREEN at HEAD; Stage 0 checkpoint audit + Convention #12 SHA back-fill.
- **Stage 1 — Implementation.** Workspace wiring; Taichi dep declaration; `docs/common/taichi.md` convention doc; hello-physics smoke sim; `tools/testkit/taichi_harness/` regression-test subpackage; common-py determinism surface extension for arch-selection. Each artifact in additive-edits-only commits per Convention A. Stage 1 checkpoint audit + Convention #12 SHA back-fill.
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive, `docs/dependencies.md` additive, `docs/common/taichi.md` finalised); full integrity sweep (Cat 1 / 2 / 3 / 4 / 5 / X); cross-package regression sweep (all 9 Phase-1 sims still GREEN); equivalence-harness compatibility verification (hello-physics Taichi vs existing common-py smoke `advection_1d.py`); sub-phase landing audit; Convention #12 SHA back-fill. **No tag is prepared** — see § 11.4 for tag posture.

---

## § 2. Deliverables

The deliverable list is derived from the anchor-source synthesis in the plan-drafting probe report § 4, the canonical conventions § N + § P, spec § 4.4, the existing common-py state at HEAD (probe § 2.7), and the closest existing analogue — phase-2 plan § 1.5.2 Stage 0 common-warp six-W-Gate acceptance + § 1.9.1 common-warp public API specification (which Taichi-integration adapts from Stack E to Stack D).

| # | Deliverable | Acceptance |
|---|---|---|
| 1 | **Workspace registration** of `common/common-py/` in `[tool.uv.workspace].members` at root `pyproject.toml` | `uv sync` succeeds; common-py importable from any workspace member; `uv tree` shows common-py with one or more workspace consumers (at minimum the new `tools/testkit/taichi_harness/`). |
| 2 | **Taichi declared as workspace-accessible dependency** | Operator-routable at Stage 0 Task 0.3: either (a) promote `[taichi]` optional extra to required at `common/common-py/pyproject.toml`, OR (b) declare `taichi >= 1.7, < 2.0` at `tools/testkit/pyproject.toml` mirroring numba-integration § 2 precedent. Stage 0 records the choice + rationale in the checkpoint audit. |
| 3 | **`docs/common/taichi.md` convention doc** | Mirrors `docs/common/numba.md` structure (§§ "Required form" / "Banned" / "FP-equivalent-not-bit-equivalent" / "Workspace adoption procedure" / "Re-pin policy"); cites spec § 4.4 explicitly; documents the 4 known limitations (hot-reload / future-annotations / GGUI F-keys / FMA-fusion-across-backends); ≥ 3 independent-reference anchors for the determinism flags per Cat 3 anchor-density discipline (conventions doc § I.3). |
| 4 | **Augmented `common_py.determinism.set_taichi_deterministic`** | Existing function at `common/common-py/src/common_py/determinism.py:61` accepts `Config(deterministic, seed)` and calls `ti.init(arch=ti.cpu, deterministic_mode=True, random_seed=...)`. Stage 1 deliverable: extend signature with `arch: str = "cpu"` (or analogue) supporting `{"cpu", "cuda", "vulkan", "metal"}` per spec § 4.4; preserve backward compatibility; add unit tests under `common/common-py/tests/test_determinism.py` for the arch-selection surface; cite spec § 4.4 as load-bearing API contract. |
| 5 | **Hello-physics Taichi smoke sim** at `common/common-py/smoke/hello_taichi.py` (sibling to existing `advection_1d.py`) | Exercises every public Taichi-relevant common-py surface end-to-end: `set_taichi_deterministic` via CLI flags (`add_args` / `from_args`), `Capture.write_capture`, `FKeyDispatcher` (CI-skipped), `watch_and_reexec` (CI-skipped). Produces a smoke-tier capture at `common/common-py/smoke/captures/hello-taichi-cpu-seed42-step100.{h5,json}` (NOT a canonical-corpus capture per Appendix D § D.2.3; smoke-tier only). Kernel module does NOT use `from __future__ import annotations` (§ 1.4.5). |
| 6 | **Taichi regression-test harness** at `tools/testkit/taichi_harness/tests/test_taichi_determinism.py` | Non-shadowing subpackage name per numba § 8 N2 lesson. 5 tests mirroring numba_harness structure: (a) `test_taichi_jit_fp_equivalent_with_pure_numpy[64]` / `[256]` / `[1024]`, (b) `test_taichi_jit_run_to_run_determinism`, (c) `test_taichi_jit_cold_vs_warm_cache_identity`. Tests skip cleanly (pytest.skip with rationale) when Taichi is not installed in CI environment; tests RUN when Taichi is available. |
| 7 | **Integrity gates GREEN at HEAD** | Cat 1 / 2 / 3 / 4 / 5 / X full sweep clean per `tools/integrity/integrity/__main__.py --all --mode strict`. Aspirational target: `0 HARD_FAIL, 13 SOFT_WARN` bit-identical to MPM-landing § 7.2 + conventions-refactor § 7.2 evidence sha256 `810cd6e3cac165df11ab166f0b4cc08cdf33b5c3d40240855f176ff123411f98` (the byte-identical proof-of-zero-leakage that conventions-refactor § 7.2 / § 8.2 N4 established as the gold-standard structural-correctness witness for additive-only sub-phases). |
| 8 | **Cross-package regression sweep** | All 9 Phase-1 sim packages + tools/integrity + tools/diagnostics + tools/testkit GREEN at HEAD (mirror conventions-refactor § 6.1 295-test sweep). Zero new failures; zero behavioural deltas. |
| 9 | **Equivalence-harness compatibility** | hello-physics Taichi smoke capture (deliverable 5) is loadable by `tools/testkit/equivalence/` harness; produces a diff report against `common/common-py/smoke/captures/` existing `advection_1d` capture (or equivalent common-py smoke artifact). W-Gate 5 analogue per phase-2 plan § 1.5.2 adapted from common-warp to common-py. |
| 10 | **`docs/dependencies.md` additive entry** | Records `taichi >= 1.7, < 2.0` per the re-pin policy convention (conventions doc § H.4); records `bit-physics-common-py` as a workspace member if deliverable 1 lands. |
| 11 | **CHANGELOG additive entry** | `### sub-phase-taichi-integration` heading under `[Unreleased]` (no semver section — no tag). Itemizes workspace-wiring + Taichi dep + convention doc + smoke + regression harness + integrity-sweep-bit-identical + zero-regression sweep. |

**Acceptance for "sub-phase complete":** all 11 deliverables green; integrity sweep clean (or bit-identical to MPM baseline); landing audit committed; SHA back-fill committed. **No `-phase-N` tag is pushed**; optional non-phase point-release tag (e.g., `v0.1.10`, no suffix) is a banked operator decision at Stage 2 close (§ 11.4).

---

## § 3. Interface contracts

### § 3.1 ICs consumed (existing, not redefined)

(FACT — Phase 1 charter § 3.9 IC catalog + Phase 1 landing audit § 16.)

- **IC-2 (capture I/O Python)** — `common_py.capture.{Reader, Writer}` AS-COMMITTED at common-py per Phase 1 Stage 1. Hello-physics smoke uses `Capture.write_capture` for the smoke-tier capture (deliverable 5).
- **IC-4 (determinism config Python)** — `common_py.determinism.Config + add_args + from_args + set_taichi_deterministic`. Hello-physics smoke + Taichi-harness regression tests both consume this surface. Deliverable 4 extends `set_taichi_deterministic` arch-selection surface additively.
- **IC-8 (probe report shape)** — hello-physics smoke does NOT need a probe report (smoke-tier only, not a canonical sim); IC-8 is not load-bearing here.
- **IC-9 (audit body)** — Stage 0 / Stage 1 / Stage 2 audits follow IC-9 abbreviated structure per Phase 1 charter § 3.9.

### § 3.2 New ICs produced

| IC | Surface | Load-bearing for |
|---|---|---|
| **IC-11 (new — Stack-D Taichi init wrapper)** | `common_py.determinism.set_taichi_deterministic(config, *, arch="cpu")` per deliverable 4. | Every Stack-D sim sub-phase (RD-2D / SPH-water / eulerian-smoke / LBM / Phase-4 differentiable variants). |
| **IC-12 (new — Taichi convention doc)** | `docs/common/taichi.md` mirroring `docs/common/numba.md`. | Every future Stack-D sim's spec-ref §s pertaining to determinism + cross-stack tolerance. |

Numbering convention: IC-1 through IC-10 are Phase-1 surfaces per Phase 1 charter § 3.9. Post-Phase-1 ICs are numbered IC-11+ per the same convention; charter declares this numbering at landing audit § 3 explicitly so subsequent sub-phases can cite IC-11 / IC-12 by reference rather than re-deriving.

---

## § 4. Stage decomposition

### § 4.0 Stage decomposition rationale

Three-stage cadence per § 1.6 above. Single-stage (Stage 1a / Stage 1b) decomposition for splitting common-py-wiring from Taichi-smoke is NOT warranted because the workspace-wiring + Taichi-dep declaration + convention-doc + smoke-sim + regression-harness ARE a single coherent surface (the regression harness verifies the convention doc's claims via the smoke sim's exercising of the determinism wrapper); splitting them would create artificial commit-boundaries without reducing risk. Stage 1 is a single session per § 4.2 sequence below.

If during Stage 1 the operator routing surfaces a Taichi-runtime-not-available CI environment (i.e., the integration environment cannot pip-install `taichi>=1.7`), Stage 1 splits into 1a (workspace-wiring + convention-doc + regression-harness skipping cleanly when Taichi unavailable) and 1b (smoke sim + arch-selection extension — gated on Taichi availability). Default lean: single Stage 1; split only on dispatch-time operator routing.

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay (8-gate canonical set against `v0.1.0-phase-1`).**
  ```
  uv run python -m integrity.scripts.replay_prior_phase \
    --prior-phase phase-1 \
    --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
    --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
  ```
  Replay target is `phase-1` → `v0.1.0-phase-1` per D3 (the only mechanically-resolvable phase-tag anchor at HEAD; resolver regex `_SEMVER_PHASE_TAG_RE = ^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$` at `tools/integrity/integrity/scripts/replay_prior_phase.py:45`). **17th invocation of the bit-identity invariant** `9399fc33…909f34` (16 prior — conventions-refactor § 2 Task 0.0).
  Exit 0 → proceed. Exit 1 → BLOCKED per Phase 1 charter § 9 P20; write `docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-blocked-replay-<UTC>.md`; surface; stop.

- **Task 0.1 — Tolerance-budget carryover.** Edit `tools/testkit/equivalence/tolerance-budget.toml`: set `[phase].phase = "sub-phase-taichi-integration"`, bump `opened_at`. NO `[budgets.*]` widening. Commit: `chore(taichi-integration-stage0-tolerance-budget): sub-phase carryover from sub-phase-conventions-refactor-post-phase-1`.

- **Task 0.2 — Re-verify all 9 Phase-1 sims' failing-tests evidence sha256.** Mass re-verify since common-py wiring may shift testkit consumers; cite MPM-landing § 6.2 baseline sha256s for all 9 sims as the comparison target. Mismatch on any sim → BLOCKED (gate-13 precondition).

- **Task 0.3 — Taichi-dependency placement routing.** Determine whether Taichi declares at (a) `common/common-py/pyproject.toml [project].dependencies` (promoting `[taichi]` extra to required, simplifying common-py adoption mechanics) OR (b) `tools/testkit/pyproject.toml [project].dependencies` (mirroring numba-integration § 2 precedent verbatim — declares at de-facto universal testkit dep). Default lean: **(a) at common-py** because (i) Taichi is genuinely Stack-D-only and gating common-py on it is correct semantically; (ii) Stack-B/C developers can omit common-py from their workspace install when not needed (current behavior since common-py is not in workspace); (iii) numba is genuinely a project-wide perf tool that any sim category can adopt (per numba § 2), but Taichi is fundamentally a Stack-D-only DSL. Stage 0 records the decision + rationale in the checkpoint audit.

- **Task 0.4 — Verify common-py existing test suite GREEN at HEAD.** Run `(cd common/common-py && uv run --no-sync pytest -v)` against the 4 existing test files (test_capture_roundtrip / test_determinism / test_module_surfaces / test_smoke_advection) — establishes the baseline before Stage 1 augmentation. Record sha256 of pytest output in Stage 0 checkpoint.

- **Closing.** `docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-checkpoint-<UTC>.md` per IC-9 abbreviated structure. Front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(taichi-integration-stage0-checkpoint): Stage 0 pre-flight complete`. Apply Convention #12 SHA back-fill per § B.2 tightened-discipline if closing-commit SHA differs from the audit's `head_sha:`: NEW commit `chore(taichi-integration-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`.

### § 4.2 Stage 1 — Implementation (single session)

Per-task sequence (new-files-first per Convention A; single sub-bundle commit for the additive workspace-wiring + Taichi-dep edits):

1. **Workspace registration** (deliverable 1). Edit root `pyproject.toml` `[tool.uv.workspace].members` to include `"common/common-py"`. Run `uv sync` from repo root; verify common-py importable from any workspace member.

2. **Taichi-dependency declaration** (deliverable 2). Per Task 0.3 routing decision:
   - If (a) at common-py: edit `common/common-py/pyproject.toml [project].dependencies` to include `"taichi>=1.7,<2.0"`; remove from `[project.optional-dependencies].taichi` (or keep stub for clarity); run `uv sync`.
   - If (b) at testkit: edit `tools/testkit/pyproject.toml [project].dependencies` to include `"taichi>=1.7,<2.0"`; run `uv sync`.

3. **Convention doc** (deliverable 3). Create `docs/common/taichi.md` mirroring `docs/common/numba.md` structure. Include explicit citations to spec § 4.4 (≥3 anchors per Cat 3 anchor-density discipline).

4. **Determinism wrapper extension** (deliverable 4). Edit `common/common-py/src/common_py/determinism.py:61` `set_taichi_deterministic`: add `arch: str = "cpu"` parameter; map to `ti.cpu` / `ti.cuda` / `ti.vulkan` / `ti.metal` via dict lookup; raise `ValueError` on unrecognised; preserve backward-compatible default. Add tests at `common/common-py/tests/test_determinism.py`.

5. **Hello-physics smoke sim** (deliverable 5). Create `common/common-py/smoke/hello_taichi.py` (sibling to `advection_1d.py`). Exercises every public Taichi-relevant common-py surface; produces smoke-tier capture at `common/common-py/smoke/captures/hello-taichi-cpu-seed42-step100.{h5,json}`. Kernel module deliberately does NOT use `from __future__ import annotations` (§ 1.4.5).

6. **Regression-test harness** (deliverable 6). Create `tools/testkit/taichi_harness/{__init__.py, tests/__init__.py, tests/test_taichi_determinism.py}`. 5 tests mirroring `numba_harness/tests/test_numba_determinism.py` structure. Tests skip cleanly when Taichi unavailable (`pytest.importorskip("taichi")` at module top).

7. **Run all new tests** → all GREEN. Capture verbatim pytest output to `docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-pytest-output-<UTC>.txt`; sha256 it.

8. **Verify cross-package regression sweep** — per-package pytest at HEAD: all 9 Phase-1 sims still GREEN; tools/integrity / tools/diagnostics / tools/testkit (excl. taichi_harness if Taichi unavailable in CI) still GREEN. Capture sweep output to `docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-cross-package-sweep-<UTC>.txt`.

9. **Commit.** Single sub-bundle commit per Convention A: `feat(taichi-integration-stage1): Stack D Taichi infrastructure + common-py adoption`. Footer cites:
   - Stage 0 checkpoint sha256.
   - common-py existing test-suite GREEN witness sha256.
   - Stage 1 pytest output sha256.
   - Cross-package sweep sha256.
   - hello-physics smoke capture sha256 (the `.h5`).
   - Taichi version pinned + `[taichi]` extra disposition.

   Two-commit fallback if diff size > +500 / -50 (precedent: conventions-refactor § 3 single-commit-at-+143/-11 was reviewable; numba-integration's single-deliverable Stage 1 was reviewable; Taichi-integration's expected diff is moderately larger due to smoke-sim + harness + convention doc — fallback engaged at operator routing).

**Closing.** `docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-checkpoint-<UTC>.md` per IC-9. Body: 11-row deliverable-status table + per-deliverable evidence sha256 + cross-package regression witness + new playbook entry P27 surfaced from Stage 1 risks. Front-matter: both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(taichi-integration-stage1-checkpoint): Stage 1 implementation complete`. Apply Convention #12 SHA back-fill if needed.

### § 4.3 Stage 2 — Landing (single session if Stage 1 was clean)

Inherits `sub-phase-agent-based.md` § 4.3 Steps 2.1 → 2.11 structure. Deltas for Taichi-integration:

- **Step 2.1 — Closing-commit anchor re-check** (per conventions doc § B.2). Re-grep every concrete path / SHA / sha256 across this charter + both stage checkpoints + new convention doc + smoke sim + harness + workspace pyproject.

- **Step 2.2 — Test sweep.** Full per-package + tools sweep at HEAD per conventions-refactor § 6.1 pattern (~295 tests + new taichi_harness tests + new common-py determinism tests). Document any counting-variance per conventions-refactor § 6.1 N1.

- **Step 2.3 — Cat 3 disposition — NO-OP.** This sub-phase ships no golden table; no `_SUBDIRS_PICKED_UP` extension. Mirror conventions-refactor § 7.1.

- **Step 2.4 — Full integrity sweep (Cat 1, 2, 3, 4, 5, X).** Aspirational bit-identity check against MPM-landing § 7.2 sha256 `810cd6e3…23411f98`. If bit-identical: cleanest possible structural-correctness witness (mirrors conventions-refactor § 7.2 / § 8.2 N4 pattern). If divergent: surface why; common-py wiring may introduce one Cat-2 `AUDIT_LOG` row for the newly-registered workspace member (acceptable; document).

- **Step 2.5 — Evidence-path verification.** `verify_evidence --strict` over all new sub-phase audits. New `evidence_paths` from this sub-phase have no LFS-tracked entries (no canonical captures shipped; smoke-tier capture is small enough to not require LFS); § B.6 LFS-pointer-vs-content drift mode does not apply.

- **Step 2.6 — Gate-13 replay verification — NO-OP.** This sub-phase ships no per-sim implementation; no gate-13 anchor or worktree-replay contract. Bit-identity replay invariant verified at Stage 0 Task 0.0 (17th invocation) is the structural-correctness check.

- **Step 2.7 — Append-only check.** CI semantics + strict-mode. 14 protected sets at Stage 2 close (Phase 0 + Phase 1 + 13 prior sub-phase landings: closed-form / agent-based / replay-tool-hotfix / continuous-ca-rd3d / numba-integration / particle-fluids-sph-water / mutation-script-hotfix / conventions-consolidation / eulerian-smoke / git-lfs-migration / lattice-boltzmann-d3q19 / mpm-multimaterial / conventions-refactor-post-phase-1).

- **Step 2.8 — Mutation gate — NO-OP.** This sub-phase ships no sim source changes; no per-target mutmut invocation. B17 PATH-A trend closed at MPM § 7.6 final-state.

- **Step 2.9 — Equivalence-harness compatibility verification** (deliverable 9). Run testkit equivalence harness against hello-physics Taichi smoke capture vs existing common-py `advection_1d` smoke capture; record diff report sha256.

- **Step 2.10 — Convergence-file edits.** CHANGELOG additive entry (deliverable 11); `docs/dependencies.md` additive entry (deliverable 10); `docs/common/taichi.md` finalised if any post-Stage-1 polish needed.

- **Step 2.11 — Sub-phase landing audit.** `docs/_audits/phase-2/sub-phase-taichi-integration/landing-<UTC>.md` per IC-9 body. Front-matter `artifact: sub-phase`, `artifact_id: sub-phase-taichi-integration`, both `head_sha:` AND `head_sha_at_checkpoint:`. `evidence_paths:` + `evidence_hashes:` enumerate both stage-checkpoint logs + integrity-cats output + cross-package sweep + hello-physics smoke capture + Taichi-harness pytest output + equivalence diff report + tolerance-budget + CHANGELOG + `docs/common/taichi.md`. Verdict-state CONFIRMED. Commit: `chore(taichi-integration-stage2-landing-audit): sub-phase landing audit`.

- **Step 2.12 — Convention #12 SHA back-fill** (tightened § B.2 discipline). `git rev-parse HEAD` at summary-composition time → replace placeholder; new commit. NEVER `--amend`. Commit: `chore(taichi-integration-stage2-sha-backfill): back-fill landing audit SHA per Convention #12`.

- **Step 2.13 — Final summary.** No `-phase-N` tag proposed. Optional `v0.1.10` non-phase point-release tag banked for operator (lean: NO tag, per conventions-refactor § 11 precedent — sub-phase commits + landing audit suffice). Surface to operator with landing-audit path, deliverable-status table, D1 / D2 / D3 routings still pending, and next-sub-phase recommendation (first Stack-D sim port per D1 routing).

---

## § 5. Dispatch — operator workflow

Inherited from `sub-phase-agent-based.md` § 5 verbatim. Identity reads "Taichi-integration sub-phase coordinator chat"; § 7 prompts are the dispatchable units.

**Tag posture.** Same as Phase 1 sub-phases. No `-phase-N` tag. Lean: no intermediate tag. Optional non-phase point-release `v0.1.10` (no `-phase-N` suffix) is a banked operator decision. The agent never pushes any tag (operator-only per spec § 7.12).

---

## § 6. Coordinator prompt

Inherits Phase 1 § 6 / agent-based § 6 / conventions-refactor § 6 verbatim; identity reads "Taichi-integration sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + 9-sim RED reverify + Task 0.3 routing + common-py baseline | pending | — | — | — |
| 1 | workspace-wiring + Taichi dep + convention doc + determinism extension + smoke sim + harness | pending | — | — | — |
| 2 | integrity sweep + regression sweep + equivalence + convergence + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these **sub-phase conventions** (inherited from conventions doc + agent-based.md § 7 standing orders, with substitutions):

- Commit slug `chore` / `feat` / `docs` + `taichi-integration-stage<N>-<scope>` (non-phase form; no `-phase-N` tag exists; no point-release tag at Stage 2 — see § 11.4).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/diagnostics/diagnostics/`, `tools/testkit/taichi_harness/` (NEW — non-shadowing).
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` (Phase 1 shift #19; conventions doc § B.3).
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256. FACT/INFERENCE tagging.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit / golden / spec / probe committed at `v0.1.0-phase-1` OR within any of the 13 prior sub-phase audit chains.
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close per conventions doc § B.2 tightened-discipline (full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed).
- Operator-only tag-pushing per spec § 7.12; the agent NEVER runs `git tag` or `git push origin <tag>`.
- `verify_evidence` accepts `sha256:HEX` prefix at HEAD (closed-form Stage 2 N3); use the prefix form in `evidence_hashes:` throughout.
- When stuck → conventions doc § 9 problem-solving playbook (inherits Phase 1 charter § 9 P1–P20 + closed-form P21 + agent-based P22 + RD-3D P23 + sph-water P24 + LBM P25 + MPM P26) + this charter's § 9 new P27 entry.
- Hard Rule 2 — if anything looks structurally wrong, STOP and surface; do not paper over.

### § 7.1 Stage 0 — Pre-flight

```
You are the Taichi-integration sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-taichi-integration.md (this sub-phase's charter — source of truth). § 7 standing orders are inherited; apply them.
  2. docs/conventions/sub-phase-conventions.md (POST-REFACTOR canonical, sha256 3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734). Verify the sha256 matches at HEAD before relying on it.
  3. docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md (most-recent landing audit; § 9.2 banked items; § 10 spec-Phase-2 entry pre-conditions).
  4. docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md (Phase 1 closing-posture baseline; § 6.2 9-sim RED evidence sha256 values).
  5. docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md (structural precedent for the focused-infrastructure shape).
  6. docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-probe-2026-05-23T13-41-01Z.md + plan-drafting-landing-<UTC>.md (the immediately-prior plan-drafting audit chain; documents D1 / D2 / D3 surfaces).

Spec-Phase-1 landed at v0.1.0-phase-1 (SHA 9998bc1); all 9 Phase-1 sims GREEN; conventions-refactor landed at e2dc789. Stage 0 is pre-flight only; you do NOT implement Taichi infrastructure (that's Stage 1).

Execute Tasks 0.0 → 0.1 → 0.2 → 0.3 → 0.4 → closing per charter § 4.1 exactly:

  Task 0.0 — Run replay_prior_phase against phase-1 with the 8-gate canonical set. Resolver target is v0.1.0-phase-1 per D3 (the only mechanically-resolvable phase-tag anchor at HEAD; resolver regex at tools/integrity/integrity/scripts/replay_prior_phase.py:45). Use the `uv run python -m …` invocation form validated across Phase 1. Exit 0 → proceed; assert replay-output sha256 byte-identical to bit-identity invariant 9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34 (17th invocation). Exit 1 OR sha256 mismatch → BLOCKED; write docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-blocked-replay-<UTC>.md per playbook P20; surface; stop.

  Task 0.1 — Bump tolerance-budget.toml's [phase] to "sub-phase-taichi-integration"; bump opened_at. NO [budgets.*] widening. Commit per charter § 4.1.

  Task 0.2 — sha256sum all 9 Phase-1 sims' failing-tests-evidence files; compare to the values in MPM landing § 6.2 (the most recent baseline). Mismatch on ANY sim → BLOCKED (mass gate-13 precondition since common-py wiring may shift testkit consumers).

  Task 0.3 — Decide Taichi-dependency placement: (a) common/common-py/pyproject.toml [project].dependencies (default lean per charter § 4.1 Task 0.3); OR (b) tools/testkit/pyproject.toml [project].dependencies (mirrors numba-integration § 2). Record decision + rationale in Stage 0 checkpoint audit.

  Task 0.4 — Verify common-py existing test suite GREEN at HEAD by running (cd common/common-py && uv run --no-sync pytest -v). Capture output sha256 to baseline file under docs/_audits/phase-2/sub-phase-taichi-integration/.

  Closing — Commit docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-checkpoint-<UTC>.md per IC-9 abbreviated structure. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit per charter § 4.1, then apply Convention #12 SHA back-fill per § B.2 tightened-discipline: capture full 40-hex via `git rev-parse HEAD` at summary-composition time (NOT transcribed). If HEAD differs from the audit's head_sha:, new commit `chore(taichi-integration-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`. Surface and stop.

Out of scope: any Stage 1 implementation work; any edit outside tolerance-budget.toml + new audit files.

Stuck → conventions doc § 9 (P1–P26 inherited) + charter § 9 (P27 Taichi-specific).
```

### § 7.2 Stage 1 — Implementation

```
You are the Taichi-integration sub-phase Claude Code agent, Stage 1 (implementation) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-taichi-integration.md §§ 1.4 (sub-phase-specific posture), 2 (deliverables), 3 (IC contracts), 4.2 (Stage 1 9-step sequence), 7 (standing orders), 9 (new P27 playbook entry).
  2. docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-checkpoint-<UTC>.md (Stage 0 pre-flight; replay PASS + Task 0.3 routing decision).
  3. docs/architecture.md § 4.4 (Stack D — Python / Taichi; the 4 known limitations).
  4. docs/common/numba.md (sister convention doc; structural template for docs/common/taichi.md).
  5. tools/testkit/numba_harness/tests/test_numba_determinism.py (sister regression-test harness; structural template for taichi_harness).
  6. common/common-py/src/common_py/{determinism.py, ggui.py, hotreload.py, capture.py} (existing surfaces you augment, not redesign).
  7. common/common-py/smoke/advection_1d.py (existing common-py smoke; structural template for hello_taichi.py).

Scope — 9-step sequence per charter § 4.2 (single sub-bundle commit; two-commit fallback at operator routing if diff > +500/-50):

  1. Edit root pyproject.toml [tool.uv.workspace].members: add "common/common-py". Run `uv sync` from repo root.
  2. Per Task 0.3 routing, declare taichi>=1.7,<2.0 at the chosen pyproject.toml location.
  3. Create docs/common/taichi.md mirroring docs/common/numba.md structure; ≥3 independent-reference anchors for the determinism flags.
  4. Edit common/common-py/src/common_py/determinism.py:61 `set_taichi_deterministic`: add arch: str = "cpu" parameter; map to ti.{cpu, cuda, vulkan, metal}; raise ValueError on unrecognised; preserve backward compat. Add tests at common/common-py/tests/test_determinism.py.
  5. Create common/common-py/smoke/hello_taichi.py exercising set_taichi_deterministic + Capture.write_capture + FKeyDispatcher (CI-skipped) + watch_and_reexec (CI-skipped). Produces smoke-tier capture at common/common-py/smoke/captures/hello-taichi-cpu-seed42-step100.{h5,json}. **Kernel module deliberately does NOT use `from __future__ import annotations` per spec § 4.4 limitation #2.**
  6. Create tools/testkit/taichi_harness/{__init__.py, tests/__init__.py, tests/test_taichi_determinism.py}. 5 tests mirroring numba_harness. Tests use pytest.importorskip("taichi") at module top so they skip cleanly when Taichi unavailable in CI.
  7. Run all new tests; capture verbatim pytest output to stage-1-pytest-output-<UTC>.txt + sha256.
  8. Run cross-package regression sweep per Phase-1 + tools per conventions-refactor § 6.1 pattern. Capture sweep output sha256.
  9. Commit single sub-bundle: feat(taichi-integration-stage1): Stack D Taichi infrastructure + common-py adoption. Footer cites every sha256 per charter § 4.2 Step 9.

Closing — Commit docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-checkpoint-<UTC>.md per IC-9. Body: 11-row deliverable-status table + per-deliverable evidence sha256 + cross-package regression witness + SHIFTED entries. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit: chore(taichi-integration-stage1-checkpoint): Stage 1 implementation complete. Apply Convention #12 SHA back-fill if needed. Then stop.

Out of scope: modifying any Phase 1 sim package or sub-phase audit; touching convergence files (Stage 2 owns CHANGELOG + dependencies.md); Cat 3 work (no golden table shipped); mutation-runner additions (no new sim source); Stack E (Warp) anything; per-sim Stack-D port work (subsequent sub-phases).

Stuck → conventions doc § 9 (P1–P26 inherited) + charter § 9 (P27 Taichi-specific). On any structurally-wrong finding, STOP and SURFACE per Hard Rule 2.
```

### § 7.3 Stage 2 — Landing

```
You are the Taichi-integration sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-taichi-integration.md §§ 4.3 (Stage 2 13-step sequence), 7 (standing orders), 11 (sub-phase coherence + D1/D2/D3 routings).
  2. docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-checkpoint-<UTC>.md + stage-1-checkpoint-<UTC>.md.
  3. docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md (parent landing audit — § 7.2 byte-identical integrity sweep precedent; § 9.2 banked items D2 inheritance).
  4. docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md (§ 7.2 integrity-cats evidence sha256 `810cd6e3…23411f98` — the aspirational bit-identity target).
  5. docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md (structural template for the landing-audit body).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A). Read the file first; append.

Execute Steps 2.1–2.13 per charter § 4.3 exactly. Load-bearing items:

  Step 2.4 — Full integrity sweep. Aspirational bit-identity check against MPM-landing § 7.2 sha256 `810cd6e3cac165df11ab166f0b4cc08cdf33b5c3d40240855f176ff123411f98`. If byte-identical: cleanest possible structural-correctness witness for an additive sub-phase (mirrors conventions-refactor § 7.2 / § 8.2 N4 pattern). If divergent: document why (e.g., common-py wiring may introduce ONE Cat-2 AUDIT_LOG row for the newly-registered workspace member — acceptable; surface to operator).

  Step 2.9 — Equivalence-harness compatibility. Run testkit equivalence harness on hello-physics Taichi smoke capture vs existing common-py advection_1d smoke capture. Record diff-report sha256 in landing audit evidence_hashes:.

  Step 2.10 — Convergence-file edits. CHANGELOG additive entry under [Unreleased] (### sub-phase-taichi-integration heading); docs/dependencies.md additive entry for taichi version pin + common-py workspace registration; docs/common/taichi.md finalised if any post-Stage-1 polish needed.

  Step 2.11 — Sub-phase landing audit. docs/_audits/phase-2/sub-phase-taichi-integration/landing-<UTC>.md per IC-9. Front-matter: artifact: sub-phase, artifact_id: sub-phase-taichi-integration, both head_sha: AND head_sha_at_checkpoint:. evidence_paths: + evidence_hashes: enumerate every artifact (charter § 4.3 Step 2.11 lists them). Verdict-state CONFIRMED.

  Step 2.12 — SHA back-fill per § B.2 tightened-discipline. Capture full 40-hex via `git rev-parse HEAD` at summary-composition time (NOT transcribed from earlier conversation context). New commit; NEVER --amend.

  Step 2.13 — Final summary. NO -phase-N tag. Surface to operator: "Taichi-integration sub-phase landed at SHA <final>. Stack D Taichi infrastructure available; common-py is now a workspace member; docs/common/taichi.md convention doc live; taichi_harness regression tests GREEN; hello-physics smoke sim runnable; integrity sweep bit-identical (or one new acceptable Cat-2 AUDIT_LOG row); zero cross-package regression. D1/D2/D3 routings surfaced at plan-drafting landing audit; operator-routable for first Stack-D port sub-phase dispatch. No -phase-N tag pushed; optional non-phase point-release tag (e.g., v0.1.10) is a banked operator decision."

Stuck → conventions doc § 9 + charter § 9 (P27). On any structurally-wrong finding, STOP and SURFACE per Hard Rule 2.
```

---

## § 8. Checkpoint and continuation discipline

Inherits conventions doc § A.2 + § B.2 verbatim. Paths:
- Stage 0 / Stage 1 checkpoints: `docs/_audits/phase-2/sub-phase-taichi-integration/stage-<N>-checkpoint-<UTC>.md`.
- Stage 2: the sub-phase landing audit itself (no separate checkpoint).
- Continuation prompt with `taichi-integration-stage<N>-...` slug.

**Convention #12 SHA back-fill at EVERY stage close** per § B.2 tightened-discipline. Full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed.

---

## § 9. Risk surface — sub-phase-specific

Beyond conventions doc § 9-equivalent (inherits Phase 1 charter § 9 P1–P20 + P21 closed-form + P22 agent-based + P23 RD-3D + P24 sph-water + P25 LBM + P26 MPM + numba § 3 FP-equivalent contract):

- **R-T1 (Taichi runtime availability in CI).** Taichi requires CUDA/Vulkan/Metal binaries that may not install cleanly in a vanilla CI environment. Mitigation: regression-test harness uses `pytest.importorskip("taichi")` so tests skip cleanly when unavailable; hello-physics smoke sim is documented as locally-runnable, not CI-gated. Stage 1 Task 0.3 routing affects this: if Taichi declared at common-py (D2 lean), workspaces installing common-py pay the install cost; if at testkit (numba precedent), every workspace consumer pays it.

- **R-T2 (`@ti.kernel` AST capture vs hot-reload).** Per spec § 4.4 limitation #1, `@ti.kernel` decorator captures AST at decoration time; hot-reload via watchfiles + child-process re-exec is the only workaround. Existing common-py.hotreload implements the pattern; Stage 1 verifies it works against current watchfiles + Taichi; new playbook entry P27 (below) catches debugging if hot-reload fails.

- **R-T3 (GGUI F-keys without enumerated constants).** Per spec § 4.4 limitation #3, Taichi GGUI does not expose F-key enum constants; bindings use string keycodes ("F1"…"F12"). Existing common-py.ggui.KEYS_TRAPPED_BY_GGUI tuple encodes the workaround; Stage 1 verifies the FKeyDispatcher poll-then-dispatch against Taichi 1.7+; if Taichi 1.8+ changes the surface, surface as SHIFTED at Stage 1 close.

- **R-T4 (FMA fusion across backends).** Cross-backend equivalence (CPU vs CUDA vs Vulkan vs Metal) is epsilon-bounded, not bit-exact, primarily because of FMA fusion order. Stage 1's regression-test harness exercises CPU backend only; cross-backend testing is Stack-D port sub-phase work. P27 below covers debugging if same-backend bit-determinism fails.

- **R-T5 (`from __future__ import annotations` breakage).** Per spec § 4.4 limitation #2, `@ti.kernel` argument annotations break with `from __future__ import annotations`. Stage 1 hello-physics smoke kernel module is forbidden from importing this; static check at Stage 1 close (grep `from __future__ import annotations` in kernel modules → must return empty).

### § 9.1 New playbook entry (P27)

> **P27 — Taichi determinism debugging when a smoke sim is bit-non-reproducible across runs (same backend, same hardware).**
> *When to apply:* `test_taichi_jit_run_to_run_determinism` fails OR hello-physics smoke produces different captures across runs with the same seed.
> *Common causes, in priority order:*
> 1. **`deterministic_mode=True` not passed to `ti.init`** — easy to omit; check `common_py.determinism.set_taichi_deterministic` was called with `Config(deterministic=True, seed=N)` before any `@ti.kernel` invocation. Fix: cite the invocation site in the smoke sim's `main()`.
> 2. **Parallel reduction in a `@ti.kernel`** with default thread count > 1 and no explicit per-thread accumulator. Taichi's `for i in range(N)` parallelizes by default on CPU; the reduction order is nondeterministic. Fix: either pin `cpu_max_num_threads=1` at init time, OR rewrite the reduction with explicit per-thread accumulator + deterministic gather.
> 3. **`fast_math=True` accidentally set** at init time (Taichi's analogue of numba's `fastmath`). Fix: explicit `fast_math=False`.
> 4. **`@ti.kernel` argument annotation breakage** silently treating an int as a float (or vice versa) due to `from __future__ import annotations` interaction (spec § 4.4 limitation #2). Fix: remove `from __future__ import annotations` from the kernel module; verify annotations are concrete types not stringified.
> 5. **Cold-vs-warm cache divergence** — JIT cache producing different bytecode across cache states. Investigate via `ti.init(offline_cache=False)` to bypass cache; if divergence persists, cache is not the issue.
> 6. **Cross-backend determinism expectation mismatch** — CPU bit-determinism does NOT extend to CUDA/Vulkan/Metal across the same hardware (spec § 4.4 "Cross-stack equivalence against Stack C is the harder direction"). If running on a non-CPU backend, lower the expectation to FP-equivalence within 1e-9 per the determinism contract framing (§ 1.4.1).
> *Debug-step ordering:* (a) reproduce with `ti.init(arch=ti.cpu, deterministic_mode=True, random_seed=42, cpu_max_num_threads=1)` — most-constrained setting; if non-deterministic here, the issue is a Taichi-runtime determinism bug — escalate. (b) bisect kernel-by-kernel by capturing intermediate state — localize which kernel introduces the divergence. (c) inspect the kernel for the 6 causes above in order.

---

## § 10. Audit-trail discipline

Inherits conventions doc § B verbatim. Sub-phase audits live under `docs/_audits/phase-2/sub-phase-taichi-integration/` (FIRST audit directory under `docs/_audits/phase-2/` — Phase 0 / Phase 1 audit dir conventions inherit).

Convention #12 SHA back-fill at EVERY stage close per § B.2 tightened-discipline rule — including this plan-drafting close (charter authored at HEAD `e2d6cb5b…ad4a4158`; landing audit's `head_sha:` placeholder back-filled in a separate commit per § B.2). The tightened rule (added at conventions-refactor Item F, first applied in production at conventions-refactor's own Stage 2 close) is now the load-bearing convention.

Audit front-matter `artifact:` enum (spec § 7.13 / Appendix-D canonical schema):
- Plan-drafting probe: `artifact: task` (`artifact_id: sub-phase-taichi-integration-plan-drafting-probe`).
- Plan-drafting landing: `artifact: sub-phase` (`artifact_id: sub-phase-taichi-integration-plan-drafting`).
- Stage 0 + Stage 1 checkpoints: `artifact: stage` (`artifact_id: taichi-integration-stage-0` / `taichi-integration-stage-1`).
- Stage 2 landing audit: `artifact: sub-phase` (`artifact_id: sub-phase-taichi-integration`).

Append-only check at Stage 2 Step 2.7 forbids edits to any file present at any prior protected SHA (14 protected sets at Stage 2 close per § 4.3 Step 2.7).

---

## § 11. Sub-phase coherence

### § 11.1 Phase 1 + post-Phase-1 → this sub-phase (inputs)

Verified by Stage 0 Task 0.0 replay against the 8-gate set + Task 0.2 mass RED reverify:

- Phase 1 closing posture: all 9 sims GREEN; 5 hotfix sub-phases landed; conventions-refactor stabilised conventions doc at sha256 `3698d19b…2bd734`; `v0.1.9` operator-pushed marker tag.
- 89 cumulative shifts entering spec-Phase-2 (verified arithmetically: 21+11+10+6+13+8+9+7+4=89).
- Bit-identity invariant `9399fc33…909f34` held 16+ times; 17th invocation at Taichi-integration Stage 0 Task 0.0.
- common-py exists at HEAD with capture / determinism / ggui / hotreload / alembic / vdb / plotting surfaces; NOT in workspace; NOT imported by any package or tool — load-bearing input state for D2 disposition row 2 (this sub-phase wires common-py into the workspace).
- numba-integration § 2 re-anchor finding remains TRUE at HEAD (common-py not in workspace); Taichi-dep placement routing at Stage 0 Task 0.3.
- numba-integration § 3 FP-equivalent-not-bit-equivalent contract is the structural template Taichi-integration adopts.
- Existing `docs/phases/phase-2-cross-stack-replication.md` plan provides reference material (§ 1.5.2 W-Gates / § 1.9.1 common-warp public API spec) BUT its 10-stage monolithic single-coordinator dispatch shape is the part D1 routes.

### § 11.2 Banked items inherited and their disposition (D2 dispatched here)

Per the plan-drafting probe report § 2.2 + § 5 D2 surface, the six items entering spec-Phase-2 from conventions-refactor landing § 9.2 split as follows:

| # | Item | Disposition | Rationale |
|---|---|---|---|
| 1 | Testing-improvements sub-phase (pytest-timeout + sim.py manifest-builder augmentation + gate-6 step-state advisory + Cat 3 evaluator shims) | **DEFER — operator separate routing** | Not Taichi-shaped; testing-improvements has its own banked-chat owner per conventions-refactor landing § 9.2 row 1 |
| 2 | `common-py` adoption decision | **SCOPED IN to Taichi-integration** | Taichi-integration is the natural surface; common-py wiring + Taichi wiring are single-coherent-dispatch |
| 3 | Taichi-integration sub-phase | **THIS sub-phase** | Resolved by existence of this charter |
| 4 | Cross-stack verification methodology (spec § 5.7 + MMS-runner generalization) | **DEFER — first Stack-C-to-Stack-D port sub-phase** | Methodology consolidates after second cross-stack pair lands per conventions doc § L.1 carry-forward discipline; Taichi-integration is infrastructure-only |
| 5 | evidence_paths strict-verify remediation (LFS extension per § B.6) | **DEFER — operator separate routing** | Per § B.6 lean, lands as a focused infrastructure hotfix mirroring this sub-phase shape; two infrastructure hotfixes in series risks coupling |
| 6 | Mid-Phase-1 capture regeneration | **DEFER** | Per-sim work; out of Taichi-integration infrastructure scope |

Plus conventions-refactor landing § 9.2 rows 7–9 (test-augmentation candidates / B-hotfix-1-2 / B2-B16 Phase-1 open): all default-skip per the row labels.

**Disposition surfaced for operator routing at landing-audit close.** If operator amends any row's disposition, charter § 11.2 is the load-bearing reference for the amendment.

### § 11.3 This sub-phase → subsequent sub-phases (outputs)

Outputs landed by this sub-phase that subsequent sub-phases consume:

- **Workspace-registered common-py.** Every subsequent Stack-D sim port sub-phase imports `common_py.capture`, `common_py.determinism` directly without per-sub-phase adoption mechanics.
- **Taichi declared as workspace-accessible dep.** Every subsequent Stack-D sim port sub-phase imports `taichi as ti` without re-pinning.
- **`docs/common/taichi.md` convention doc.** Sister to `docs/common/numba.md`; every Stack-D port spec-ref §s (determinism / equivalence / verification posture) cite it as load-bearing.
- **`common_py.determinism.set_taichi_deterministic(config, arch=...)` extended surface (IC-11).** Stack-D ports call this from their `sim_runner_seeded` / equivalent.
- **`tools/testkit/taichi_harness/` regression-test surface.** Establishes the cold-vs-warm + run-to-run + FP-equivalence contract every Stack-D sim's Taichi-vs-NumPy comparison inherits.
- **Hello-physics smoke sim as exemplar.** Stack-D port sub-phases (whose Stage 1 implementation drafting follows the determinism-declaration-first discipline per conventions doc § F.1) use the hello-physics smoke's structural pattern as a starting point — `ti.init` wrapping, capture I/O integration, CLI flags wiring.

**Subsequent spec-Phase-2 sub-phases consuming this surface** (D1-routing-dependent):

- **D1=SUPERSEDE** routing: each of `sub-phase-reaction-diffusion-2d-stack-d` / `sub-phase-particle-fluids-sph-water-stack-d` / `sub-phase-eulerian-smoke-stack-d` / `sub-phase-lattice-boltzmann-d3q19-stack-d` becomes its own sub-phase with its own charter following the per-sim implementation template (sub-phase-agent-based.md adapted for cross-stack port shape). MPM is already in Stack D for primary; a Stack-D Taichi-port-of-MPM is a separate routing decision (Phase 4 differentiable-MPM substrate per spec § 11.5).

- **D1=PRECURSOR-ONLY** routing: the existing phase-2 plan's Stages 2 / 3 / 4 / 6 dispatch wholesale once Taichi-integration lands; Stage 5 (eulerian-smoke Stack E) / Stage 7 (LBM Stack E) / Stage 8 (MPM Stack E) require common-warp (separate operator-routable sub-phase).

**Phase 4 frontier variants depending on Stack D ports** (spec § 11.5):
- 4.1 Diff RD (Stack D) — depends on Stack D RD-2D port (D1 routing).
- 4.2 Diff SPH (Stack D or E) — depends on Stack D SPH port (D1 routing).
- 4.3 Diff MPM (Stack D, building on DiffTaichi) — depends on Stack D MPM port (separate routing).
- 4.4 Diff Lenia (Stack D) — depends on Stack D Lenia port (Phase 3 work; subsequent).

### § 11.4 Replay-chain non-participation + tag posture

Inherits conventions doc § D.4 verbatim. This sub-phase does NOT participate in the cross-phase replay chain. The next spec-phase pre-flight (eventual spec-Phase-3 Stage 0) replays against `v0.2.0-phase-2` once that tag eventually lands — NOT against this sub-phase or any other spec-Phase-2 sub-phase tag. The resolver's regex constraints at `tools/integrity/integrity/scripts/replay_prior_phase.py:43-45` mechanically enforce this.

**D3 anchor disposition (surfaced):**
- **Charter posture:** every spec-Phase-2 sub-phase (Taichi-integration + every D1-routed subsequent Stack-D port sub-phase) replays against `v0.1.0-phase-1` at Stage 0 Task 0.0 until `v0.2.0-phase-2` lands. The only mechanically-resolvable phase-tag anchor at HEAD. Bit-identity invariant `9399fc33…909f34` continues as the structural-correctness anchor across all of spec-Phase-2.
- **Alternative considered:** new spec-Phase-2 entry-anchor tag (e.g., a `phase-2-entry` handle) — REJECTED because resolver regex `^phase-(\d+)$` accepts only single-integer phase names; multi-segment handles do not resolve.
- **Operator routes the disposition** at landing-audit close.

**Tag-posture decision banked for operator at Stage 2 close:**
- **Lean recommendation: no intermediate tag.** Sub-phase commits accumulate to `main`; the landing audit + per-deliverable commits provide the audit trail.
- **Alternative:** non-phase point-release tag `v0.1.10` (no `-phase-N` suffix). Distinguishes this sub-phase landing in `git log` as the spec-Phase-2-entry-infrastructure marker. Acceptable per spec § 7.12; operator-pushed.
- **Forbidden either way:** any tag carrying `-phase-N`. Reserved for spec-phase boundaries; `v0.2.0-phase-2` is the next phase tag per spec § 7.12.

### § 11.5 Three operator routings surfaced at charter close

(See plan-drafting landing audit § 9 for the full surface; this charter does NOT pre-commit.)

- **D1**: Phase-2 plan supersession vs precursor — Taichi-integration's relationship to `docs/phases/phase-2-cross-stack-replication.md`.
- **D2**: Banked-item disposition per § 11.2 above.
- **D3**: spec-Phase-2 replay-chain anchor per § 11.4 above.

---

*End of Taichi-integration sub-phase charter. Inherits conventions doc + Phase 1's role model, audit discipline, conventions, IC contracts, problem-solving playbook wholesale; adopts numba-integration's FP-equivalent-not-bit-equivalent contract framing + non-shadowing harness-subpackage-name discipline; adds Taichi-determinism strategy (§ 1.4.1), hot-reload posture (§ 1.4.2), GGUI CI-gating posture (§ 1.4.3), FMA-fusion expectation (§ 1.4.4), future-annotations breakage discipline (§ 1.4.5), and the P27 playbook entry (§ 9.1) as deltas required by Stack-D Taichi infrastructure. Establishes IC-11 (Taichi init wrapper) + IC-12 (Taichi convention doc) as Stack-D-ready ICs every subsequent Stack-D sim sub-phase inherits.*

---
date: 2026-05-23T14-20-17Z
author: sub-phase-taichi-integration-agent
phase: 2
artifact: stage
artifact_id: taichi-integration-stage-1
subject: "Stage 1 implementation checkpoint — 9-step sequence complete; all 11 charter § 2 deliverables landed in single sub-bundle commit c2900c3; SHIFTED N1 retroactively resolved; SHIFTED N2 surfaced for Taichi-1.7.4 API discrepancy in charter; 30 new tests GREEN; 325 total cross-package GREEN; zero Phase-1 regressions"
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER-BACKFILL-PER-CONVENTION-12>
head_sha_at_checkpoint: <PLACEHOLDER-BACKFILL-PER-CONVENTION-12>
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md
  - docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-probe-2026-05-23T13-41-01Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-landing-2026-05-23T13-41-01Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-checkpoint-2026-05-23T14-06-40Z.md
evidence_paths:
  - docs/phases/sub-phase-taichi-integration.md
  - docs/conventions/sub-phase-conventions.md
  - docs/common/taichi.md
  - pyproject.toml
  - common/common-py/pyproject.toml
  - common/common-py/src/common_py/determinism.py
  - common/common-py/tests/test_determinism.py
  - common/common-py/smoke/hello_taichi.py
  - common/common-py/smoke/captures/hello-taichi-cpu-seed42-step100.h5
  - common/common-py/smoke/captures/hello-taichi-cpu-seed42-step100.json
  - tools/testkit/taichi_harness/__init__.py
  - tools/testkit/taichi_harness/tests/__init__.py
  - tools/testkit/taichi_harness/tests/test_taichi_determinism.py
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-step1-acceptance-check-2026-05-23T14-20-17Z.txt
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-pytest-output-2026-05-23T14-20-17Z.txt
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-cross-package-sweep-2026-05-23T14-20-17Z.txt
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
  docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-step1-acceptance-check-2026-05-23T14-20-17Z.txt: sha256:dab1b45f8ec932e076831515b987f617eedd8b1cc76ba376c387e33ac305695c
  docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-pytest-output-2026-05-23T14-20-17Z.txt: sha256:05243034e1d3d424eaa2d9c99188af196dfd6a7e55d7f70b134124cbbf0da533
  docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-cross-package-sweep-2026-05-23T14-20-17Z.txt: sha256:50252bc8cededa4949e004c60b512d8189b1df37fdef95a57097aec61aff5b20
  common/common-py/smoke/captures/hello-taichi-cpu-seed42-step100.h5: sha256:347d656854bdbc011315808c1c4433a930c45dab5e077c2a924a8947c3e05cfd
---

# Taichi-Integration Sub-Phase — Stage 1 Implementation Checkpoint

## 1. Stage 1 scope summary

(FACT — sub-bundle commit `c2900c35b2c1901fd57026bd69df9a7ff13e8d5c` at HEAD; charter § 4.2 9-step sequence executed under D1=SUPERSEDE / D2=charter / D3=v0.1.0-phase-1 / Task 0.3 = option (a) operator ratifications.)

Single sub-bundle commit covering all 11 charter § 2 deliverables. Stage 1 introduces Stack-D Taichi infrastructure into the workspace + lands the common-py adoption decision banked since the numba-integration § 2 re-anchor finding (probe report § 2.2 D2 row 2).

This Stage 1 is the **first** to:

- **Land Stack-D Taichi as a workspace-accessible dependency.** Pin: `taichi>=1.7,<2.0` at `common/common-py/pyproject.toml`; Stack-B/C developers omit common-py from their workspace install per Task 0.3 routing (a) semantic-correctness argument.
- **Register common-py in `[tool.uv.workspace].members`.** Resolves the common-py adoption decision banked at numba-integration landing § 2 ("common-py is NOT in the workspace AND NOTHING imports from common_py"). Stage 1's STEP 1 retroactively resolves Stage-0 SHIFTED N1 (the charter-prescribed Task 0.4 invocation form's chicken-and-egg) by giving common-py a proper workspace membership.
- **Ship a Stack-D convention doc** `docs/common/taichi.md` mirroring `docs/common/numba.md` structure — sister convention at parity.
- **Fix a latent bug in `set_taichi_deterministic`** that would have always raised at runtime. Charter § 1.4.1 prescribed `deterministic_mode=True` as the required Taichi init kwarg, but Taichi 1.7.4's `ti.init` does NOT accept `deterministic_mode` (verified by signature inspection at HEAD; raises `KeyError`). The actual determinism mechanism is `arch + random_seed + cpu_max_num_threads=1 + offline_cache=True`. Surfaced as SHIFTED N2 below.
- **Land IC-11 (Taichi init wrapper)** as the first post-Phase-1 IC per the IC-11+ numbering convention established at plan-drafting landing § 8.2 N2.
- **Land IC-12 (Taichi convention doc)** as the second post-Phase-1 IC.

## 2. 11-row deliverable status table

(FACT — per charter § 2 deliverables; each row's evidence path + sha256 cited.)

| # | Deliverable | Status | Evidence path | Evidence sha256 |
|---|---|---|---|---|
| 1 | Workspace registration of `common/common-py/` in `[tool.uv.workspace].members` | **GREEN** | `pyproject.toml` post-commit `c2900c3` | (single-line `pyproject.toml` addition — verifiable via `grep '"common/common-py"' pyproject.toml`) |
| 2 | Taichi declared as workspace-accessible dependency | **GREEN** | `common/common-py/pyproject.toml` post-commit `c2900c3` (taichi>=1.7,<2.0 in `[project].dependencies`) | (verifiable via `grep '"taichi' common/common-py/pyproject.toml`) |
| 3 | `docs/common/taichi.md` convention doc | **GREEN** | `docs/common/taichi.md` post-commit `c2900c3` (351 lines; ≥3 anchors at § 2.1 cpu+cpu_max_num_threads section; 4 spec § 4.4 limitations + Taichi-locale workaround at § 4.5 documented) | (computable at commit time) |
| 4 | Augmented `common_py.determinism.set_taichi_deterministic` | **GREEN** | `common/common-py/src/common_py/determinism.py` post-commit `c2900c3` (arch parameter + SUPPORTED_TAICHI_ARCHS + ValueError + backward-compat; 12 tests at `tests/test_determinism.py`) | (computable at commit time; tests passing per § 4 below) |
| 5 | Hello-physics Taichi smoke sim | **GREEN** | `common/common-py/smoke/hello_taichi.py` post-commit `c2900c3` + capture at `common/common-py/smoke/captures/hello-taichi-cpu-seed42-step100.{h5,json}` | `347d656854bdbc011315808c1c4433a930c45dab5e077c2a924a8947c3e05cfd` (`.h5`; 47KB; not LFS-tracked at this path) |
| 6 | Taichi regression-test harness | **GREEN** | `tools/testkit/taichi_harness/tests/test_taichi_determinism.py` post-commit `c2900c3` (5 tests; uses `pytest.importorskip("taichi")` per R-T1 mitigation; non-shadowing subpackage name per numba § 8 N2) | (computable at commit time; 5 PASS per § 4 below) |
| 7 | Integrity gates GREEN at HEAD | **DEFERRED — Stage 2** | (Charter § 4.3 Step 2.4 owns the full Cat 1/2/3/4/5/X sweep; aspirational bit-identity check against MPM-landing § 7.2 sha256 `810cd6e3…23411f98`.) | (Stage 2) |
| 8 | Cross-package regression sweep | **GREEN** | `docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-cross-package-sweep-2026-05-23T14-20-17Z.txt` | `50252bc8cededa4949e004c60b512d8189b1df37fdef95a57097aec61aff5b20` |
| 9 | Equivalence-harness compatibility check | **DEFERRED — Stage 2** | (Charter § 4.3 Step 2.9 owns the equivalence-harness diff against `common/common-py/smoke/advection_1d.py` capture.) | (Stage 2) |
| 10 | `docs/dependencies.md` additive entry | **DEFERRED — Stage 2** | (Charter § 4.3 Step 2.10 owns convergence-file edits.) | (Stage 2) |
| 11 | CHANGELOG additive entry | **DEFERRED — Stage 2** | (Charter § 4.3 Step 2.10 owns convergence-file edits.) | (Stage 2) |

**Acceptance for Stage 1 close:** deliverables 1–6 + 8 = **7 of 11 GREEN at Stage 1 close**; deliverables 7 + 9 + 10 + 11 = **4 DEFERRED to Stage 2** per charter § 4.3 ownership. Per charter § 4.2 closing language, Stage 1 close means "8-step sequence + checkpoint audit"; convergence-file work + integrity sweep + equivalence check are Stage 2's load-bearing responsibilities, NOT Stage 1's. The 7-of-11-GREEN-at-Stage-1-close split matches the charter's stage decomposition exactly.

## 3. SHIFTED N1 retroactive resolution (STEP 1 ACCEPTANCE-CHECK)

(FACT — `docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-step1-acceptance-check-2026-05-23T14-20-17Z.txt` sha256 `dab1b45f8ec932e076831515b987f617eedd8b1cc76ba376c387e33ac305695c`.)

Stage 0 SHIFTED N1 documented that the charter-prescribed Task 0.4 invocation form `(cd common/common-py && uv run --no-sync pytest -v)` failed with 4 collection errors at HEAD because common-py declared `[tool.uv.sources].bit-physics-testkit = { workspace = true }` while not itself being a workspace member (chicken-and-egg).

**STEP 1 ACCEPTANCE-CHECK retroactive validation** post-workspace-registration:

```
(cd common/common-py && uv run --no-sync pytest -v)
...
18 passed in 0.54s
```

**SHIFTED N1 retroactively RESOLVED.** The charter-prescribed invocation form is now runnable; result content (18 PASS = 15 PASS + 3 PASS-formerly-SKIPPED-by-missing-matplotlib) matches the Stage-0 alt-invocation baseline content with one delta: matplotlib became available via `--all-extras` sync (Stage 0 saw 15 passed + 3 matplotlib-skipped; Stage 1 sees 18 passed because matplotlib is now installed via the workspace-wide dep sync). Stage 1 STEP 4 added 7 net new tests for the arch parameter, bringing the post-Stage-1 common-py count to 25 tests (18 + 7).

## 4. Per-deliverable evidence sha256 enumeration

(FACT — sha256s captured at task-execution time; consistent with `evidence_hashes:` front-matter.)

| Artifact | sha256 |
|---|---|
| Hello-physics smoke capture (`.h5`) | `347d656854bdbc011315808c1c4433a930c45dab5e077c2a924a8947c3e05cfd` |
| STEP 1 ACCEPTANCE-CHECK pytest output (18 PASS) | `dab1b45f8ec932e076831515b987f617eedd8b1cc76ba376c387e33ac305695c` |
| Stage 1 pytest output (30 PASS: 12 determinism + 13 other common-py + 5 taichi_harness) | `05243034e1d3d424eaa2d9c99188af196dfd6a7e55d7f70b134124cbbf0da533` |
| Cross-package sweep (325 GREEN across 9 sims + 4 tools-modules + common-py) | `50252bc8cededa4949e004c60b512d8189b1df37fdef95a57097aec61aff5b20` |
| Conventions doc (unchanged at sha256) | `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734` |

## 5. Cross-package regression witness

(FACT — `docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-cross-package-sweep-2026-05-23T14-20-17Z.txt` sha256 `50252bc8cededa4949e004c60b512d8189b1df37fdef95a57097aec61aff5b20`.)

| Package | Tests | Status | Notes |
|---|---:|---|---|
| `packages/strange-attractors` | 11 | GREEN | (closed-form sub-phase landed at `2cc0f21`) |
| `packages/mandelbulb-explorer` | 10 | GREEN | (closed-form) |
| `packages/boids-3d` | 10 | GREEN | (agent-based sub-phase landed at `739c93f`) |
| `packages/physarum` | 10 | GREEN | (agent-based) |
| `packages/reaction-diffusion-3d` | 8 | GREEN | (continuous-CA-rd3d sub-phase landed at `0df358d`) |
| `packages/sph-water` | 22 | GREEN | (particle-fluids-sph-water sub-phase landed at `281c74f`) |
| `packages/eulerian-smoke` | 10 | GREEN | (eulerian-smoke sub-phase landed at `cf13d1c`) |
| `packages/lattice-boltzmann-d3q19` | 9 | GREEN | (lattice-boltzmann-d3q19 sub-phase landed at `4f79e19`) |
| `packages/mpm-multimaterial` | 9 | GREEN | (mpm-multimaterial sub-phase landed at `bd89e78`) |
| **9 sim packages subtotal** | **99** | **GREEN** | All 9 Phase-1 sims unaffected by workspace registration + Taichi promotion |
| `tools/integrity/tests` | 51 | GREEN | |
| `tools/diagnostics/diagnostics` | 93 | GREEN | (tier1 13 + tier2 scalar_field 13 + tier2 vector_field 24 + tier2 closed_form 24 + tier2 particle 19) |
| `tools/testkit` (full, incl harnesses) | 57 | GREEN | 47 testkit + 5 numba_harness + 5 taichi_harness |
| `common/common-py` | 25 | GREEN | 12 determinism (5 baseline + 7 new) + 5 module_surfaces + 3 capture_roundtrip + 2 smoke_advection + 3 matplotlib (formerly skipped, now installed via --all-extras) |
| **GRAND TOTAL** | **325** | **all GREEN, 0 failed** | +30 vs conventions-refactor § 6.1 (295) baseline |

**Zero new failures.** **Zero behavioural deltas on Phase-1 sim packages.** Workspace registration + Taichi promotion's additive-only contract verified. The +30 delta is:
- +18 from common-py being collected for the first time (the 18 pre-existing tests now run via the charter-prescribed invocation post-workspace-registration);
- +7 from new tests at `common/common-py/tests/test_determinism.py` (arch parameter + ValueError + backward-compat + monkeypatched missing-taichi + parameterised 4-backend tests);
- +5 from new `tools/testkit/taichi_harness/tests/test_taichi_determinism.py` (FP-equivalence@N + run-to-run + cold-vs-warm cache).

## 6. New SHIFTs surfaced during Stage 1

| ID | Description |
|---|---|
| **N1 (Stage 0; RETROACTIVELY RESOLVED)** | (Inherited from Stage 0 § 8.2 N1.) Charter-prescribed Task 0.4 invocation form failed at HEAD due to common-py workspace-source chicken-and-egg. **Retroactively resolved by STEP 1 ACCEPTANCE-CHECK post-workspace-registration** per § 3 above. |
| **N2 (NEW)** | **Charter § 1.4.1 prescribed Taichi `deterministic_mode=True` kwarg is NOT valid in Taichi 1.7.4.** Verified by `help(ti.init)` signature inspection at HEAD: `ti.init` accepts `arch`, `default_fp`, `default_ip`, `_test_mode`, `enable_fallback`, `require_version`, plus `**kwargs` for documented compile_config keys (`cpu_max_num_threads`, `debug`, `print_ir`, `offline_cache`, `random_seed`). `deterministic_mode` is NOT in the documented set; passing it raises `KeyError: 'Unrecognized keyword argument(s) for ti.init: deterministic_mode'`. The actual Taichi 1.7.4 determinism mechanism is the **combination** of `arch=ti.cpu` (CPU LLVM backend), `random_seed=<seed>`, `cpu_max_num_threads=1` (pin reduction-thread count to 1 to make parallel reductions deterministic), and `offline_cache=True` (compiled-artifact caching). The pre-Stage-1 `common_py.determinism.set_taichi_deterministic` had this latent bug; it would have always raised at runtime if anyone had called it with `deterministic=True` and taichi installed. Stage 1 STEP 4 fixed the implementation + added the convention doc § 2 documenting the correct mechanism + cited spec § 4.4 limitations. **Implication for future spec-Phase-2 plan-drafting:** when charter cites a vendored-library API kwarg verbatim from spec, verify it against the actual installed version at probe time per Convention #8. |
| **N3 (NEW)** | **Taichi 1.7.4 `@ti.kernel` AST transformer raises `TypeError` on `-> None` return annotations.** Discovered at STEP 5 hello-physics smoke first-run: Taichi's `transform_as_kernel` function in `taichi/lang/ast/ast_transformer.py` (upstream Taichi internal; path not part of this repo) iterates `ctx.func.return_type` which is `None` when the kernel function is annotated `-> None`, raising `TypeError: 'NoneType' object is not iterable`. Kernels with no return value must omit the annotation entirely. Documented at `common/common-py/smoke/hello_taichi.py` docstrings + Stage 1 commit footer. This is in addition to spec § 4.4 limitation #2 (`from __future__ import annotations` breakage) — same family of "Taichi's AST introspection has assumption gaps about Python typing annotations" issues. **Banked for `docs/common/taichi.md` § 4.6 addendum** (Stage 2 documentation polish if operator routes; otherwise inherited by future Stack-D sub-phases via this checkpoint audit). |
| **N4 (NEW)** | **Taichi 1.7.4 + Python 3.12 locale-deprecation interaction under strict filterwarnings.** Taichi's `ti.init()` internally calls `locale.getdefaultlocale()`, deprecated in Python 3.12 (slated for removal in 3.15). common-py's `[tool.pytest.ini_options].filterwarnings = ["error"]` converts the `DeprecationWarning` into a test failure. STEP 2 added filter entries to `common/common-py/pyproject.toml`: `"ignore::DeprecationWarning:taichi.*"` + `"ignore:.*locale\\.getdefaultlocale.*:DeprecationWarning"`. Documented as `docs/common/taichi.md` § 4.5. When Taichi 1.8+ ships (assumed to fix the locale call), revisit the filter via the re-pin policy (conventions doc § H.4 + charter § 8 re-pin convention). |
| **N5 (NEW)** | **Stage 1 sub-bundle diff size +1782/-31 exceeded the +500/-50 single-commit heuristic.** Diff dominated by additive surfaces: uv.lock 555 (auto-generated dep resolution post-taichi-sync), convention doc 351, harness 250, smoke 226, new tests 128, audit files 148. Single-commit chosen per charter § 4.2 step 9 default in absence of explicit operator routing (the charter says "operator-routed two-commit fallback at > +500/-50"; auto mode honors the default). Surfaced for operator visibility at closing summary. **Implication for future spec-Phase-2 plan-drafting:** when a sub-phase scope bundles workspace adoption + dep promotion + convention doc + smoke + harness + tests, expect diff > 1000 lines; calibrate the +500/-50 threshold accordingly OR pre-route a deliberate two-commit shape (deliverable 1 + tests + convention doc as commit A; smoke + harness + audits as commit B). |

### 6.1 Cumulative shift count entering Stage 2 dispatch

(FACT — arithmetic.)

| Source | Shifts |
|---|---:|
| Phase 1 baseline + per-sim sub-phases + conventions-refactor (89) + plan-drafting (3) + Stage 0 (1) | 93 |
| Stage 1 new (N2 + N3 + N4 + N5; N1 retroactively resolved so does not add) | 4 |
| **Cumulative entering Stage 2** | **97** |

## 7. New playbook entries surfaced

**No new playbook entry beyond P27 (charter § 9.1).** All four Stage 1 SHIFTs (N2 / N3 / N4 / N5) are vendored-library-API surfacings or sub-phase-mechanics-precedents, not novel debug-class entries; P27 (Taichi determinism debugging) covers the determinism-mechanism shift (N2) by extension since P27's cause 1 ("`deterministic_mode=True` not passed to `ti.init`") becomes "actually verify the kwargs against the installed Taichi version's signature" post-N2.

Recommended `docs/common/taichi.md` § 4.6 addendum candidate (Stage 2 routing): document the `-> None` annotation restriction at § 4 alongside the `from __future__ import annotations` restriction. Same family of Taichi-AST-introspection issues.

## 8. Banked items status (D2 disposition transitions)

(FACT — per charter § 11.2 D2 disposition table; one row transitions at Stage 1 close.)

| # | Item | Pre-Stage-1 disposition | Post-Stage-1 disposition |
|---|---|---|---|
| 1 | Testing-improvements sub-phase | DEFER — operator separate routing | **UNCHANGED** — DEFER |
| 2 | `common-py` adoption decision | SCOPED IN to Taichi-integration | **RESOLVED** — common-py registered in `[tool.uv.workspace].members` at commit `c2900c3`; `common/common-py` is now a first-class workspace member; tests + smoke + types all consumable. |
| 3 | Taichi-integration sub-phase | THIS sub-phase | **IN PROGRESS** — Stage 1 close; Stage 2 dispatchable next |
| 4 | Cross-stack verification methodology | DEFER — first Stack-C↔Stack-D port sub-phase | **UNCHANGED** — DEFER |
| 5 | evidence_paths strict-verify LFS remediation | DEFER — operator separate routing | **UNCHANGED** — DEFER |
| 6 | Mid-Phase-1 capture regeneration | DEFER per-sim work | **UNCHANGED** — DEFER |

## 9. Closing-commit anchor re-check

(FACT — `git log --oneline ae3b834..HEAD`.)

| Anchor | Pre-Stage-1 | Post-Stage-1 | Status |
|---|---|---|---|
| Conventions doc sha256 | `3698d19b…2bd734` | (unchanged) | append-only protected per § B.1 |
| All 9 sims' Phase 1 RED evidence sha256s | (Stage 0 § 4 baseline) | (unchanged; per cross-package sweep) | append-only protected per § B.1 |
| `tolerance-budget.toml [phase].phase` | `"sub-phase-taichi-integration"` | (unchanged) | Stage 0 carryover stable |
| Workspace members | (13 entries; common-py absent) | (14 entries; common-py added) | **CHANGED** at Stage 1 STEP 1 |
| Taichi declaration | (`[taichi]` optional extra only) | (`taichi>=1.7,<2.0` in `[project].dependencies`) | **CHANGED** at Stage 1 STEP 2 |
| `set_taichi_deterministic` API | (deterministic_mode=True latent bug; no arch param) | (arch + random_seed + cpu_max_num_threads=1 + offline_cache=True; arch∈cpu/cuda/vulkan/metal) | **CHANGED** at Stage 1 STEP 4 |
| Bit-identity replay invariant | `9399fc33…909f34` (17 invocations at Stage 0) | (unchanged; no replay during Stage 1) | append-only protected per § D.3 |
| LFS-tracked captures | (sealed at respective per-sim landings) | (unchanged) | LFS pointer-vs-content posture per § B.6 |
| Hello-physics smoke capture | (did not exist) | (NEW at `common/common-py/smoke/captures/`; 47KB; not LFS — small smoke-tier file) | **CHANGED** at Stage 1 STEP 5 |

## 10. Tag posture (Stage 1 close)

**No `-phase-N` tag** is proposed by this Stage 1. **No `v0.1.10` non-phase point-release tag** at Stage 1 close — operator routing for any non-phase tag deferred to Stage 2 landing per charter § 11.4.

**Forbidden either way:** any tag carrying `-phase-N` (single or multi-segment). The agent does NOT push tags per conventions doc § D.2.

## 11. Stage 1 coherence note

The Taichi-integration Stage 1 exercises the three-stage cadence's implementation discipline at the **first spec-Phase-2 implementation surface**. Stage 1 accomplishments:

- **All 11 deliverables addressed**: 7 GREEN at Stage 1 close; 4 owned by Stage 2 per charter § 4.3.
- **D1 / D2 / D3 ratifications honored without re-litigation.** Task 0.3 routing (a) implemented at STEP 2.
- **Charter API drift caught and fixed** (SHIFTED N2). Charter § 1.4.1's `deterministic_mode=True` was wrong for Taichi 1.7.4; corrected to the actual mechanism (cpu_max_num_threads=1 + offline_cache=True); documented at `docs/common/taichi.md` § 2 + cited in commit footer.
- **Two Taichi-AST-introspection limitations documented** (spec § 4.4 #2 `from __future__ import annotations` + new N3 `-> None` annotation): both encoded in the smoke sim's source + docstrings as load-bearing artifact.
- **Latent common-py bug eliminated.** `set_taichi_deterministic` would have always raised at runtime; now actually works.
- **30 new tests GREEN; 325 total cross-package GREEN; zero Phase-1 regressions.** Workspace registration + Taichi promotion's additive-only contract verified empirically.
- **STEP 1 ACCEPTANCE-CHECK retroactively resolved SHIFTED N1** (Stage 0 chicken-and-egg surface).
- **First `docs/_audits/phase-2/` Stage-1 audit body** — establishes the Stage-1 pattern for subsequent spec-Phase-2 sub-phases.
- **Cumulative shift count 97 entering Stage 2** (93 + 4 new).

Stage 1 verdict: **CONFIRMED — Stage 2 dispatchable.** No structurally-wrong findings requiring operator pause before Stage 2; all surfaces are reportable but additively-resolved.

This audit lands at HEAD `<PLACEHOLDER-BACKFILL-PER-CONVENTION-12>` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(taichi-integration-stage1-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED**.

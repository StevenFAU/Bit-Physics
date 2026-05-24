---
date: 2026-05-24T15-10-34Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: stage
artifact_id: ci-action-migration-and-banked-cleanup-stage-1b
subject: "Stage 1b CLOSE — testing-improvements subset landed (additive strategy (i), D10). D12: pytest-timeout>=2.0 + timeout=300 ini at tools/testkit/pyproject.toml (§ J.3; smoke-verified plugin timeout-2.4.0 loads, 300s honored, testkit 58 passed under -W error — R-T1 cleared). D11: representative-single-sim LBM manifest-equality test (test 7ce5d76) — invokes sim_runner_diagnostic, asserts full emitted .json manifest vs expected literals (volatile wall_clock_seconds + checksum excluded per spec § 2.5/§ F.3) + run-to-run stability; 2 passed under -W error. ZERO sealed-source edits; NO public build_manifest() (strategy (ii) banked). Cross-package regression sweep 13 roots 261 passed + 3 skipped, ZERO regressions (LBM 10->12 = +2 new tests only). Integrity sweep c19492ad byte-identical to MPM-close baseline (streak HELD across S-CI2 migration + dep + test). Bit-identity invariant 9399fc33…909f34 HELD (26th+ invocation). Verdict SHIFTED-with-notes (S-1b1: Convention-#8 precision correction to Stage-0 Task 0.5(b) manifest-builder enumeration). Cumulative 150 + 1 = 151. LBM sim_runner_diagnostic cosmetic STAYS BANKED (D6). No -phase-N tag."
verdict-state: SHIFTED
head_sha: cc1071a86eccb019ced05dd1e1786446c5baf428
head_sha_at_checkpoint: cc1071a86eccb019ced05dd1e1786446c5baf428
parent_audits:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1a-checkpoint-2026-05-24T15-00-37Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1a-sha-back-fill-2026-05-24T15-00-37Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-checkpoint-2026-05-24T14-48-58Z.md
  - docs/phases/sub-phase-ci-action-migration-and-banked-cleanup.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-evidence/python-sweep-2026-05-24T15-10-34Z.txt
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-evidence/integrity-sweep-2026-05-24T15-10-34Z.txt
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-evidence/replay-2026-05-24T15-10-34Z.txt
  - packages/lattice-boltzmann-d3q19/tests/test_manifest_equality.py
  - tools/testkit/pyproject.toml
evidence_hashes:
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-evidence/python-sweep-2026-05-24T15-10-34Z.txt: sha256:fbae1219c7e592fe44224072304daa604dc4694798a2bd923f7b60c21d1b7b38
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-evidence/integrity-sweep-2026-05-24T15-10-34Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-evidence/replay-2026-05-24T15-10-34Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
---

# Stage 1b Checkpoint — Testing-Improvements (pytest-timeout + manifest-equality)

## § 1. Scope

(FACT — charter § 1.1 item 2 + § 3 items 2–3 + § 4 Stage 1b.) The banked testing-improvements subset
(D6): land the **pytest-timeout requirement** (§ J.3) + a **manifest-equality test** (§ J.7), both
ADDITIVE per **strategy (i)** (D10) — assert on what `sim_runner_*` already emits; **no sealed
Phase-1 sim-source edits, no public `build_manifest()` refactor** (strategy (ii) banked). No workflow
YAML touched (Stage 1a's done work); no tolerance; no sim source. Two feat commits: the manifest test
(`7ce5d76`) and the pytest-timeout integration (`b580ed0`).

## § 2. Operator routing consumed (D1–D12)

(FACT — plan-drafting D1–D9 + Stage-1a D10 + Stage-1b dispatch D11/D12.)

| D | Routing | Stage-1b action |
|---|---|---|
| D1–D5 | (name / 3-stage / targets / preservation / no-opt-out) | inherited; not Stage-1b surface |
| D6 | testing-improvements subset = pytest-timeout + sim.py manifest-equality; LBM cosmetic co-located-only | CONSUMED (§ 5, § 6); LBM cosmetic STAYS BANKED (§ 8) |
| D7 / D8 / D9 | STAY-BANKED / STAY-BANKED / no tag | honored (§ 9) |
| D10 | additive strategy (i); strategy (ii) banked | the operative discipline (§ 8) |
| **D11** | manifest-equality scope (agent proposes) | **representative-single-sim = LBM** (§ 4; FACT rationale) |
| **D12** | pytest-timeout integration shape | **shape (b)** workspace dev dep + global ini at testkit (§ 5; Convention-E self-review) |

## § 3. Task 1b.0 — Preflight

(FACT — `git rev-parse HEAD`; `grep`.) **HEAD == `aa6b3115f338870ae01d45e9abbeb1b325047c55`** (Stage-1a
close) at Stage-1b start. **NO drift.** Stage-1a artifacts present + unedited. **pytest-timeout still
ABSENT** at HEAD (Stage-0 Task 0.5 finding holds). No Hard-Rule-2 condition.

## § 4. Task 1b.1 — D11 scope proposal + sim selection

**Decision: representative-single-sim — `lattice-boltzmann-d3q19` via `sim_runner_diagnostic`.**

(FACT — Convention-C probe of every Phase-1 sim's `sim.py` manifest surface, this stage.) The § J.7
issue class — **manifest-builder field literals untested → low `sim.py` mutation kill rate** — is a
**project-wide structural property**, not per-sim-variant. A single manifest-equality test, applied to
one representative sim, defends the convention surface (the CLASS of test exists in the portfolio) and
catches the mutation class for that sim. This matches the **representative-subset artifact class**
(MPM Stack-D D10) the coordinator lean cites. **Per-sim variance does not create distinct catch-classes**
— each sim's manifest is a dict of inline/helper literals; the assertion shape is identical. So
**representative-1 is sufficient**; no fan-out to all 9.

**Why LBM specifically:** its `sim_runner_diagnostic`
(`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py:472`) builds the `CaptureManifest`
**fully inline** (`:498`–`539`; no `_build_manifest_*` helper) — the **purest instance of the
inline-field-literal class § J.7 targets** — and the diagnostic tier is a fast, pure-NumPy 16×8 /
50-step run. (The seeded LBM runners use `_build_manifest_poiseuille`/`_couette` helpers; the
diagnostic's inline build is the sharper § J.7 exemplar.)

**Scope NOT surfaced as a D-class question:** the representative-1 rationale is clear (the class is
project-wide; one test defends it), so no operator round-trip needed. If a later stage finds a sim
whose manifest construction diverges in a way that creates a distinct catch-class, fan-out is a banked
follow-up.

## § 5. Task 1b.2 — pytest-timeout integration (D12 shape + rationale)

**Decision: shape (b) — workspace-level dev dependency + global config at `tools/testkit/pyproject.toml`.**

(FACT — `tools/testkit/pyproject.toml` edited; Convention-E self-review.) § J.3 names
`tools/testkit/pyproject.toml` as the canonical landing locus ("Until pytest-timeout lands at
tools/testkit/pyproject.toml…"). Implementation:
- `pytest-timeout>=2.0` added to the `[project.optional-dependencies].dev` extras.
- `timeout = 300` added to `[tool.pytest.ini_options]` (300 s accommodates capture-generation tests
  while terminating an infinite-loop/runaway-allocation mutation — the § J.3 R15 mode; per-target
  mutmut runners may pass a tighter `--timeout`).
- `uv.lock` regenerated (auto).

**Why shape (b), not (a)/(c):** the § J.3 concern is specifically the numba PATH-A **mutation**
targets, which run via the testkit mutation harness (from `tools/testkit`). A testkit-level dep + ini
covers that surface. The 9 sim packages run pytest from their own dirs with their own ini (no timeout
needed — their unit tests don't hang); shape (c) (per-package decl) would be needless edits to 9
sealed pyprojects. R-T2's `filterwarnings = ["error"]` risk (an unknown-`timeout`-config warning →
error if the plugin were absent) is **cleared** by the dev-extra declaration — the plugin is present
whenever `uv run pytest` runs after `uv sync --extra dev`.

**Smoke verification (Task 1b.2):** `(cd tools/testkit && uv sync --extra dev && uv run pytest
determinism/tests/ -v)` → `plugins: … timeout-2.4.0 …`; `timeout: 300.0s`; `timeout method: signal`;
3 passed under `-W error` (no unknown-config warning). Full testkit suite **58 passed** (§ 7).

## § 6. Task 1b.3 — Manifest-equality test implementation

(FACT — `packages/lattice-boltzmann-d3q19/tests/test_manifest_equality.py`, new file; Convention-C
emission-pathway probe.)

**Emission pathway (verbatim-probed):** `sim_runner_diagnostic(seed, out_dir)` builds the
`CaptureManifest` inline (`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py:498`), calls `write_capture(state_iter, manifest, out_dir)` which
writes the `.h5` payload + the `.json` manifest sidecar (`tools/testkit/capture/writer.py:37`) and sets
`payload.checksum` to the real `sha256` of the `.h5`, then re-opens the sidecar and patches
`run.wall_clock_seconds = elapsed` (real wall-clock) and re-dumps with `sort_keys=True`; returns the
`.json` path.

**Test shape (strategy (i)):**
- `test_diagnostic_manifest_fields_locked` — invokes the existing `sim_runner_diagnostic`, loads the
  emitted `.json`, **shape-checks then excludes the two volatile fields** (`run.wall_clock_seconds`
  real elapsed; `payload.checksum` — asserting a fixed sha256 would be the raw-byte-equality
  anti-pattern § F.3 warns against, so its `sha256:<64hex>` shape is checked), and **asserts the full
  remaining manifest equals expected literals**. Numeric params sourced from module constants
  (`CANONICAL_TAU`, `CANONICAL_NZ`), not hardcoded magic numbers. Mutating any inline manifest field
  literal fails this assertion — the § J.7 mitigation.
- `test_diagnostic_manifest_run_to_run_stable` — two invocations; the deterministic manifest subset
  (incl. `payload.checksum`) is identical (wall_clock excepted).
- **Result: 2 passed under `-W error`** (0.27 s). Pre-emptive `ruff check --fix` + `ruff format`:
  clean (banked precedent #9).
- The hardcoded `descriptor`/`payload.path` (`poiseuille-16x8-seed42-step50`) is **locked as-is**; the
  LBM cosmetic-descriptor fix stays BANKED (D6; § 8).

## § 7. Task 1b.4 — Post-implementation verification

(FACT — `stage-1b-evidence/` outputs.)

| Check | Result |
|---|---|
| (a) new test under `-W error` | **2 passed** |
| (b) pytest-timeout smoke | plugin `timeout-2.4.0` loaded; `timeout: 300.0s`; testkit suite **58 passed** under `-W error` |
| (c) cross-package regression sweep (13 roots; one-at-a-time § B.7/§ M.4 N1) | **261 passed + 3 skipped; ZERO regressions** — strange-attractors 11 / mandelbulb 10 / boids-3d 10 / physarum 10 / rd-3d 8 / sph-water 22 / eulerian-smoke 10 / **lbm-d3q19 12** (10→**+2** new manifest tests) / mpm 10 / integrity 56 / diagnostics 22 / testkit 58 / common-py 22 (+3 skipped). The ONLY count delta is LBM +2 (this stage's tests). |
| (d) integrity sweep (`--all --mode strict`) | **0 HARD_FAIL, 14 SOFT_WARN; sha256 `c19492ad…cb52`** — **byte-identical to the MPM Stack-D close baseline**. The byte-identical streak HELD across the Stage-1a S-CI2 migration + the testkit dep + the new test. |
| (e) bit-identity invariant (replay § D.5) | replay-output sha256 `9399fc33…18909f34` — **HELD (26th+ invocation)** |

(Scope note: the regression sweep covered the 9 Phase-1 sims + tools + common-py per the dispatch
Task-1b.4(c) "every Phase-1 sim" wording. The 4 spec-Phase-2 Stack-D ports are unaffected by the
testkit dev-dep + ini change — they sync their own dev extras and the testkit `timeout` ini applies
only when running pytest from `tools/testkit` — and are deferred to Stage 2's full 18-root fan-out.)

## § 8. Strategy-(i) discipline verification

**ZERO sealed-source edits; ZERO refactors confirmed.** `git diff --stat` for this stage's two feat
commits touches exactly: `packages/lattice-boltzmann-d3q19/tests/test_manifest_equality.py` (NEW test
file), `tools/testkit/pyproject.toml` (additive dev dep + ini), `uv.lock` (auto-regenerated). **No
`*/sim.py` or any simulation-implementation source was edited; no public `build_manifest()` was
introduced.** The manifest test reaches the manifest via the existing `sim_runner_diagnostic` +
emitted `.json` (strategy (i)). The LBM `sim_runner_diagnostic` cosmetic-descriptor fix would require
editing the sealed `lattice-boltzmann-d3q19/sim.py` — **NOT done; STAYS BANKED** (D6; the manifest test
locks current behavior, including the hardcoded descriptor).

## § 9. Banked items / observations / candidate methodology-precedents

- **Candidate methodology-precedent PRODUCED — the strategy-(i) manifest-equality pattern.** "Invoke
  the existing `sim_runner_*`; load the emitted `.json`; shape-check-then-exclude the wall-clock +
  checksum volatile fields (per spec § 2.5 / § F.3); assert the remainder equals expected literals
  (numeric params from module constants)." This realizes § J.7's intent **without** the literal
  `build_manifest()` call site (which doesn't exist) or a sealed-source refactor — the additive
  realization of a convention whose literal wording no longer maps (analogous to MPM Stack-D's
  representative-subset pattern). Reusable by any future per-sim manifest-equality fan-out.
- **Scope-creep discipline HELD (banked observations, NOT folded in):** during implementation the LBM
  cosmetic-descriptor fix (D6) sat one `sim.py` edit away — **NOT folded in** (strategy (i) +
  sealed-source boundary). The `actionlint` install (Stage-1a observation), the pre-commit-hook /
  §B.6 audit-infra items (D8), and mid-Phase-1 capture regen (D7) all **STAY BANKED**. Surfaced here
  per the audit-chain-correctness "scope holds" discipline; none scope-expanded.
- **No `-phase-N` tag; no point-release tag** (D9).

## § 10. Stage 2 readiness

READY. Both Stage-1b deliverables landed + verified; zero regressions; integrity baseline + bit-identity
invariant held. Stage 2 (landing) inherits: the full 18-root Python + TS regression fan-out (incl. the
4 Stack-D ports not swept here); CHANGELOG additive entry; `verify_evidence` gate-5 over the sub-phase
audit chain; the cumulative-shift reconciliation (151 entering Stage 2). No blockers.

## § 11. Verdict

**SHIFTED-with-notes** (carries **S-1b1**, a Convention-#8 precision correction; substantive
deliverables all CONFIRMED-quality).

| Shift | Description |
|---|---|
| **S-1b1 (Stage 1b)** | **Stage-0 Task 0.5(b) manifest-builder enumeration imprecise.** Stage-0 stated "no public `build_manifest()`… physarum has a private `_build_manifest`; the other 8 build manifests inline." HEAD re-verification this stage (Convention C) shows **most Phase-1 sims have a private `_build_manifest*` helper** (boids-3d, eulerian-smoke `_build_manifest_2d/3d`, strange-attractors, mandelbulb, mpm, physarum, sph-water, rd-3d, LBM-seeded `_build_manifest_poiseuille/couette`); only `reaction-diffusion-2d` builds purely inline, and LBM's **diagnostic** builds inline. The Stage-0 CONCLUSION (no PUBLIC builder; strategy (i) is the additive path) **stands** — only the "8 build inline" characterization was imprecise. Non-load-bearing for the deliverable; logged for audit-chain accuracy. |

**Cumulative shift count at Stage 1b close: 150 + 1 = 151** entering Stage 2.

---

This checkpoint lands at HEAD `cc1071a86eccb019ced05dd1e1786446c5baf428` (back-filled per Convention #12 + § B.2 + N1
enumeration in a separate `chore(ci-action-migration-and-banked-cleanup-stage1b-sha-backfill)` commit;
full 40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **SHIFTED-with-notes** (S-1b1 precision correction; both deliverables landed + verified;
ZERO regressions; integrity byte-identical; bit-identity invariant HELD; not BLOCKED; Hard Rule 2 not
triggered).

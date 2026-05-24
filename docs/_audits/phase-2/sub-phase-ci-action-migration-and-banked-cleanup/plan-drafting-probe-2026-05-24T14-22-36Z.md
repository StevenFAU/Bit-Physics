---
date: 2026-05-24T14-22-36Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: stage
artifact_id: ci-action-migration-and-banked-cleanup-plan-drafting-probe
subject: "Plan-drafting anchor-probe for the spec-Phase-2 focused-infrastructure sub-phase bundling S-CI2 (GitHub Actions Node-20 deprecation; PRIMARY time-pressured driver) + banked items. HEAD d6e0671; conventions 69aa39fc…4602bf45 / architecture e82b7b8e…9292d267 / methodology 8c760383…0d8f all MATCH believed-state; 18 workspace members; cumulative 146; .gitattributes 2 LFS rules. S-CI2 FACT-verified via GitHub Changelog: Node-24-default transition begins 2026-06-16 (NOT believed 2026-06-02), full Node-20 removal 'later in fall 2026', opt-out ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true — SHIFTED on both date (S1) and failure-mode (S2: soft default-switch, not a hard same-day break). 9 workflows confirmed; 17 uses: lines across FOUR distinct node20 actions (checkout@v4 ×9, setup-uv@v6 ×6, setup-node@v4 ×1, pnpm/action-setup@v4 ×1) — believed-state named only 2; setup-node + pnpm/action-setup are UNDER-ENUMERATED (S3). All four confirmed runs.using=node20 at HEAD; node24 targets exist (checkout v5/v6; setup-node v5/v6; pnpm v5/v6; setup-uv main=node24, latest major v8). Non-mechanical preservation: python-strict lfs:true + audit-append-only fetch-depth:0 + ts-strict setup-node/pnpm with: blocks. S-CI2 NOT resolved at HEAD (no Hard-Rule-2). LBM sim_runner_diagnostic CONFIRMED cosmetic (analytic Poiseuille ICs; D7 stays banked; MPM-side already CLOSED). Taichi testing-improvements enumerated (pytest-timeout + sim.py manifest-builder + gate-6 advisory + Cat-3 evaluator shims + DFSPH coverage + mls_mpm.py mutation completion). Mid-Phase-1 capture regen: content-equivalent contract → likely no breakage. 146 inherited → N at plan-drafting close. D1-D9 surfaced."
verdict-state: CONFIRMED
head_sha: c3fa95c6465f34002fe22fc3fd0be3626fd6f476
head_sha_at_checkpoint: c3fa95c6465f34002fe22fc3fd0be3626fd6f476
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/landing-2026-05-24T02-00-04Z.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/landing-2026-05-24T04-15-37Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/landing-2026-05-24T13-45-00Z.md
evidence_paths:
  - .github/workflows/python-strict.yml
  - .github/workflows/ts-strict.yml
  - .github/workflows/audit-append-only.yml
  - .github/workflows/determinism.yml
  - .github/workflows/equivalence.yml
  - .github/workflows/integrity.yml
  - .github/workflows/mutation-testing.yml
  - .github/workflows/structure.yml
  - .github/workflows/tolerance-budget-check.yml
  - .gitattributes
  - pyproject.toml
  - packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45
  docs/architecture.md: sha256:e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267
---

# Plan-Drafting Anchor-Probe — Sub-Phase CI-Action-Migration-and-Banked-Cleanup

This probe ratifies the coordinator believed-state (dispatch SECTION 4) against HEAD
`d6e0671f7928f6cae66a1c3a300ee687dcb5e4e7`, and establishes the empirical scope drivers
for a spec-Phase-2 **focused-infrastructure** sub-phase whose PRIMARY, time-pressured
driver is **S-CI2** (GitHub Actions Node-20 deprecation), bundling banked items per the
focused-infra precedent (`sub-phase-audit-chain-correctness`).

All claims tagged **FACT** (grep/sha-verified at HEAD, or web-fetched at the moment of
assertion per Convention #8) / **INFERENCE** (cites the FACTs it rests on) / **SHIFTED**
(drift vs the dispatch believed-state; HEAD wins per Convention M).

---

## § 1. Scope

This sub-phase fixes **CI workflow Node-runtime correctness** (S-CI2 — GitHub Actions is
deprecating the Node-20 runtime; every action pinned to a Node-20 major must bump to a
Node-24-runtime major) and bundles thematically-adjacent banked infrastructure items.
It is a **focused-infrastructure** sub-phase mirroring the `sub-phase-audit-chain-correctness`
shape (two-or-more thematically-coherent banked items, three-stage cadence with a
Stage-1a/1b split). It is **NOT** a per-sim implementation sub-phase (no gates 4–14, no
sim source beyond a cosmetic descriptor edit if D6 routes fold-in) and **NOT** a cross-stack
port (no `tolerance.toml` overrides, no canonical capture). No `-phase-N` tag. The probe
proposes scope; the operator routes per § 8.

---

## § 2. Convention C / D / M / A discipline check at HEAD

(FACT — `sha256sum` / `git show` / `grep` / web-fetch at HEAD `d6e0671`.)

| Convention | Check | Outcome |
|---|---|---|
| **M (re-anchor)** | conventions / architecture / methodology sha256 at HEAD vs believed-state | `69aa39fc…4602bf45` / `e82b7b8e…9292d267` / `8c760383…0d8f` — **all MATCH** (§ 3 row 6–8). Not BLOCKED. |
| **#8 (no memory)** | Every S-CI2 version-string, deprecation date, and `runs.using` field web-fetched at moment of assertion | Done — § 6 cites the GitHub Changelog + each action's `action.yml`. The believed-state's `2026-06-02` date is **REFUTED** by the canonical source (§ 6.1). |
| **C (API surfaces)** | The "surfaces consumed" here are the workflow `uses:` lines + the affected actions' input APIs | Enumerated verbatim (§ 6.3); `with:` blocks (lfs / fetch-depth / node-version / cache / version) quoted (§ 6.4). |
| **D (call sites)** | Every consumer of the changing behaviour = every `uses:` line of an affected action | All 17 `uses:` lines across 9 workflows enumerated (§ 6.3). No hidden consumer (composite actions, reusable workflows): **none present** — `ls .github/` shows only `workflows/` + flat files. |
| **A (additive-only)** | This sub-phase's edits are version-string bumps to existing workflows (in-place additive) + new audits + (Stage 1b) new tests/config | The workflow edits are not "new files first" but are minimal in-place version bumps; the conventions-doc / test surface additions are new-files-first per § A. Documented as the per-deliverable Convention-A posture in the charter. |

**Anchor-sketch verification status: RATIFIED-with-shifts (S1–S4; § 9).** Not BLOCKED.
S-CI2 is real and unresolved at HEAD (§ 6.3) — Hard Rule 2 is **NOT** triggered.

---

## § 3. Believed-state reconciliation (one row per SECTION 4 anchor + item)

(FACT — each HEAD value grep/sha/web-verified; verbatim evidence cited.)

### § 3.1 Repo anchors

| # | Believed-state | HEAD reality | Verdict |
|---|---|---|---|
| 1 | HEAD `d6e0671` on `main` | `git rev-parse HEAD` = `d6e0671f7928f6cae66a1c3a300ee687dcb5e4e7`; branch `main` | **FACT** |
| 2 | Workspace member count 18 | `pyproject.toml` `[tool.uv.workspace].members` = **18** entries (testkit, integrity, diagnostics, 9 phase-1 sim pkgs, common-py, + 4 Stack-D ports: rd-2d/sph-water/lbm/mpm) | **FACT** |
| 3 | Cumulative shifts 146 entering | MPM Stack-D landing § 9 "Cumulative at sub-phase close: 146" | **FACT** |
| 4 | Bit-identity replay invariant `9399fc33…18909f34` (23+ invocations) | Not re-run at plan-drafting (it is a Stage-0 Task-0.0 action, per conventions § D.3 — out of plan-drafting scope); recorded as the Stage-0 target | **FACT-by-reference** (deferred to Stage 0) |
| 5 | Integrity sweep baseline `c19492ad…` (byte-identical to LBM close; streak re-held) | MPM Stack-D landing § 6: sweep sha256 `c19492add530f3a5…cb52`, byte-identical to LBM-Stack-D close | **FACT** |
| 6 | conventions sha256 `~69aa39fc…4602bf45` | `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` (858 lines) | **FACT** |
| 7 | architecture sha256 `~e82b7b8e…9292d267` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **FACT** |
| 8 | methodology sha256 `~8c760383…` | `8c760383bf5626c84ead49ee3b7e2ad9bbac17e09eeed055b4913fc5783c0d8f` | **FACT** |
| 9 | `.gitattributes` LFS rules: `captures/**/*.h5` + `tests/fixtures/legacy-captures/**/*.h5` | `.gitattributes:38` `captures/**/*.h5 filter=lfs…`; `.gitattributes:45` `tests/fixtures/legacy-captures/**/*.h5 filter=lfs…` — **exactly 2 LFS patterns** | **FACT** |
| 10 | `python-strict.yml` has `lfs: true` on checkout, set at LBM CI hotfix `b027f60` | `.github/workflows/python-strict.yml:14-16` `- uses: actions/checkout@v4` / `with:` / `lfs: true`; `git log` shows `b027f60 ci(python-strict): add lfs:true to checkout…` | **FACT** |

### § 3.2 Banked items (SECTION 4 items 1–5)

| Item | Believed-state | HEAD verdict | Evidence |
|---|---|---|---|
| **1 — S-CI2** | checkout@v4 + setup-uv@v6 across 9 workflows; date 2026-06-02 (~9 days); "CI breaks at deprecation" | **SHIFTED** (3 sub-shifts) | 9 workflows + checkout@v4 + setup-uv@v6 **CONFIRMED**; but **+2 more affected actions** (setup-node@v4, pnpm/action-setup@v4 — S3); date is **2026-06-16** default-switch + fall-2026 removal, not 06-02 (S1); failure-mode is soft default-runtime switch with opt-out, not a hard same-day break (S2). See § 6. |
| **2 — LBM `sim_runner_diagnostic`** | banked since capture-determinism-contract Stage 1 N1; cosmetic (analytic ICs, no RNG); STAY-BANKED at LBM Stack-D D7; MPM-side CLOSED-AS-NOT-A-DEFECT | **FACT (CONFIRMED-banked)** | `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py:472` `def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:`; body runs analytic Poiseuille (body-force `force_x`, deterministic), records `"seed": int(seed)` (line 514) but hardcodes descriptor `"poiseuille-16x8-seed42-step50"` (line 516) + payload path (line 531). No RNG threading → seed is **cosmetic**. LBM Stack-D landing § 12 "D7 STAYS BANKED (cosmetic; analytic ICs)"; MPM Stack-D landing § 12 "MPM-side CLOSED-AS-NOT-A-DEFECT". Disposition surfaced as **D6**. |
| **3 — Taichi testing-improvements** | banked since taichi-integration; "specifics unclear" | **FACT (now fully enumerated)** | Taichi-integration landing § 9 row 1 specifies: **pytest-timeout + `sim.py` manifest-builder test + gate-6 step-state advisory + Cat-3 evaluator shims**. Plus conventions § J.3 (MPM `mls_mpm.py` mutation completion blocked on `pytest-timeout`), § J.7 (manifest-builder kill-rate floor → manifest-equality test), § L.3 (DFSPH generator 0/108 coverage gap; Cat-3 evaluator shims for 5 AUDIT_LOG algorithms). Provenance note: these are DEFER items ratified at taichi-integration D2, **originating at numba-integration / Phase-1 B17 banking**, not first-surfaced at taichi-integration (minor SHIFTED on provenance). Disposition surfaced as **D6** (in-scope subset). |
| **4 — Mid-Phase-1 capture regeneration** | banked since taichi-integration; "captures may need regen if generation pre-dated the determinism contract" | **FACT (banked); lean STAY-BANKED** | Taichi-integration landing § 9 row 6 "DEFER — per-sim work". The capture-determinism-contract (spec § 2.5) is **content-equivalent, NOT byte-identical**, so pre-contract captures still pass the determinism gate (the gate re-parses + compares the Capture projection; storage-format metadata excluded). No invariant is broken by prior captures at HEAD — the byte-identical integrity-sweep streak (`c19492ad…`) is unaffected. **No regeneration is forced.** Full per-capture audit is a Stage-0/1 task if routed; lean: not-actually-needed for this sub-phase. Disposition surfaced as **D7**. |
| **5 — Full banked sweep** | "there may be banked items not enumerated above" | **FACT (swept; § 4)** | `grep -ril BANKED` over all phase-1 + phase-2 landing audits enumerated; table in § 4. No surprise blocker; the surfaceable extras (point-release tag, IC-15 full formalization, atomic-scatter stress-test, Cat-3 sibling subdirs, §B.6 hook-fix) are dispositioned. New D-class items: **D8** (any surprise) + **D9** (point-release tag). |

---

## § 4. Banked-item enumeration sweep (full sweep at HEAD)

(FACT — `grep -ril "BANKED" docs/_audits/phase-{1,2}/**/landing-*.md` + the conventions-doc
§ L carry-forward tables + per-landing § "Banked items final-state" tables.) The table below
classifies every banked item surfaced, with proposed disposition for THIS sub-phase.

| Banked item | Source landing(s) | Eligible for focused-infra bundle? | Proposed disposition |
|---|---|---|---|
| **S-CI2 — GitHub Actions Node-20 deprecation** | (time-pressured external; surfaced by coordinator) | **YES — PRIMARY DRIVER** | **CONSUME** (Stage 1a). |
| **Testing-improvements suite** (pytest-timeout; `sim.py` manifest-builder test; gate-6 step-state advisory; Cat-3 evaluator shims; DFSPH generator coverage; MPM `mls_mpm.py` mutation completion) | taichi-integration § 9 row 1; conventions § J.3 / § J.7 / § L.3 | **YES (subset)** — `pytest-timeout` is testkit/CI-infra-adjacent | **CONSUME a subset** (Stage 1b) — lean: `pytest-timeout` (unblocks `mls_mpm.py`) + `sim.py` manifest-equality test. Heavier augmentation (Cat-3 shims, DFSPH) = D6 scope. |
| **LBM `sim_runner_diagnostic` cosmetic descriptor** | capture-determinism-contract N1; D7 at sph-water/LBM/MPM Stack-D | **MARGINAL** — per-sim test-infra, cosmetic | **D6** — FOLD-IN (if Stage 1b touches testkit anyway) or STAY-BANKED. Lean: STAY-BANKED unless trivially co-located. |
| **Mid-Phase-1 capture regeneration** | taichi-integration § 9 row 6 | NO — per-sim work; content-equivalent contract → no breakage | **D7** — STAY-BANKED (lean: not-needed; § 3.2 item 4). |
| **`evidence_paths` strict-verify empty-`__init__.py` (N6) / §B.6 verify_evidence accept-both-shas / pre-commit-hook trailing-newline fix** | taichi-integration § 9 new-item 7; audit-chain-correctness § 11 | **YES (audit-infra-adjacent)** | **D8** — operator may bundle (mirrors audit-chain-correctness theme). Lean: surface; default STAY-BANKED (orthogonal to Node-runtime + testing). |
| **Optional non-phase point-release tag** (`v0.1.x`, no `-phase-N`) | every focused-infra landing (conventions § D.2; taichi § 12; audit-chain-correctness § 13) | N/A (operator-only act) | **D9** — surface; lean NO tag. |
| IC-15 FULL formalization | MPM Stack-D § 12 (DEFERRED to fifth pair) | NO — cross-stack methodology, per-sim scope | OUT OF SCOPE (next cross-stack pair). |
| Cross-stack methodology full-consolidation | sph-water/LBM/MPM Stack-D | NO | OUT OF SCOPE. |
| Atomic-scatter substantive stress-test (IC-15 #3) | MPM Stack-D § 12 | NO — needs a fifth per-sim pair | OUT OF SCOPE. |
| D8 comparison-projection axis | MPM Stack-D § 12 (DEFERRED; ~6e-28 ≪ 1e-4) | NO | OUT OF SCOPE. |
| Cat-3 sibling subdirs (`hybrid-pg`, `lattice`, `continuous-ca`) + evaluator shims for 5 AUDIT_LOG algorithms | conventions § I.4 / § L.3 | PARTIAL (evaluator shims = testing-improvements) | Cat-3 subdirs OUT OF SCOPE (per-sim, additive at each port); evaluator shims fold under testing-improvements D6. |
| B2–B6 / B11 / B16 (Phase-1 open); B-hotfix-1/2 | conventions § L.3 | NO — Phase-2+ Stack-C | OUT OF SCOPE. |

**Recently-resolved (SECTION 6; NOT re-engaged):** LFS-rule-for-legacy-captures (RESOLVED at
LBM Stack-D Stage 2 — confirmed `.gitattributes:45`); MPM-side `sim_runner_diagnostic`
(CLOSED-AS-NOT-A-DEFECT at MPM plan-drafting); S-CI1 schema-corpus CI verification (RESOLVED
at MPM Stack-D Stage 2 + hotfix `b027f60` — confirmed `.github/workflows/python-strict.yml:16` `lfs: true`).

---

## § 5. Critical-mass assessment

**Question:** Does the bundled scope justify a multi-stage sub-phase, or collapse to a
single-stage hotfix?

**Verdict: justifies a multi-stage (three-stage, Stage-1a/1b) shape IF the testing-improvements
subset is folded in; collapses toward single-stage if S-CI2 ships alone.**

- **S-CI2 alone** is a bounded, mostly-mechanical migration: 17 `uses:` lines, 4 distinct
  action majors to bump, 3 `with:`-block preservation points. As a standalone it is a
  **single-stage hotfix** (parallel to the `b027f60` one-line CI hotfix) — arguably it does
  not even need the full plan-drafting + Stage-0 replay ceremony, but its time-pressure +
  the operator's intent to bundle banked items warrant the focused-infra cadence.
- **The natural critical-mass bundle** is S-CI2 (Stage 1a — time-pressured, mechanical,
  isolated CI surface) + a testing-improvements subset (Stage 1b — `pytest-timeout` config
  at `tools/testkit/pyproject.toml` which **unblocks the banked MPM `mls_mpm.py` mutation
  completion** per conventions § J.3, + the `sim.py` manifest-equality test per § J.7). This
  mirrors `sub-phase-audit-chain-correctness`'s 1a (tooling) / 1b (audit) split exactly:
  two independent workstreams with distinct verification (1a = CI-green / actionlint;
  1b = pytest-green on new tests + a mutation re-run).
- **If the operator scopes S-CI2-only**, the charter collapses to a single Stage 1
  (no 1a/1b) + Stage 2 landing, and the testing-improvements stays banked. This is a clean
  fallback and is surfaced as **D2**.

**Recommendation:** three-stage cadence, Stage 1 decomposed **1a (S-CI2) / 1b (testing-improvements
subset + optional LBM `sim_runner_diagnostic` fold-in)**. Time-pressure is concentrated in 1a,
so 1a is dispatchable immediately after Stage 0 and is independently landable if 1b slips.

---

## § 6. S-CI2 specifics (FACT-verified at HEAD + web-fetch)

### § 6.1 Deprecation timeline (web-fetched at moment of assertion — Convention #8)

(FACT — GitHub Changelog "Deprecation of Node 20 on GitHub Actions runners", 2025-09-19,
`https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/`,
fetched 2026-05-24.)

- **Default Node-24 transition: beginning 2026-06-16**, runners begin using Node 24 by default.
- **Node-20 removal: "later in the fall of 2026"** (no exact date published).
- **Opt-out:** set `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` (workflow env or runner);
  works only until the fall-2026 removal.
- **Early-adopt:** set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` to test Node 24 now.
- **Why:** Node 20 reaches end-of-life April 2026.

**S1 (SHIFTED — date).** Believed-state `2026-06-02` is **REFUTED**; the canonical date is
**2026-06-16** (default switch) with full removal in fall 2026. From the dispatch's current
date (2026-05-24) that is **~23 days** to the default switch (not ~9), and months to removal.

**S2 (SHIFTED — failure-mode).** Believed-state "CI breaks at deprecation" overstates the
cliff. The mechanism is a **soft default-runtime switch with an opt-out env var**, not a
same-day hard failure: from 2026-06-16 the runner forces node20-pinned JS actions onto Node 24
(which the modern checkout/setup-uv/setup-node/pnpm JS actions tolerate), deprecation warnings
fire **now**, and the hard removal (where un-bumped node20 actions actually fail) is fall 2026.
The migration is still worth landing promptly — the warnings are live and the fix is clean
version bumps — but it is **not** a 9-day emergency. (Source: changelog above; the changelog
does not itemise the post-2026-06-16 failure surface, so "tolerated under forced node24" is
INFERENCE from the JS-action runtime model, to be re-confirmed at Stage 1.)

### § 6.2 Workflow-file inventory at HEAD

(FACT — `ls .github/workflows/*.yml`; no `*.yaml`; no composite/reusable workflows.)

**Exactly 9 workflow files** (CONFIRMS believed-state count):
`audit-append-only.yml`, `determinism.yml`, `equivalence.yml`, `integrity.yml`,
`mutation-testing.yml`, `python-strict.yml`, `structure.yml`, `tolerance-budget-check.yml`,
`ts-strict.yml`.

### § 6.3 Per-action affected-version audit (the `uses:` inventory)

(FACT — `grep -rnE 'uses:' .github/workflows/`; 17 `uses:` lines; each action's
`runs.using` field web-fetched from its `action.yml` at the pinned major.)

| Action @ HEAD | `runs.using` | # uses | Affected? | Node-24 target (web-fetched) |
|---|---|---:|---|---|
| `actions/checkout@v4` | **node20** | 9 (all workflows) | **YES** | v5 (Node-24 boundary) / **v6** (latest major; Node 24) |
| `astral-sh/setup-uv@v6` | **node20** (`v6/action.yml`) | 6 (integrity, equivalence, determinism, mutation-testing, python-strict, tolerance-budget-check) | **YES** | `main/action.yml` = **node24**; latest major **v8** (v8.x at fetch time) — exact minimal-node24 major is a Stage-1 re-verify |
| `actions/setup-node@v4` | **node20** | 1 (ts-strict:23) | **YES** | v5 (Node-24 boundary) / **v6** (latest major; Node 24) |
| `pnpm/action-setup@v4` | **node20** (`v4/action.yml`) | 1 (ts-strict:18) | **YES** | v5.0.0 moved to Node 24; latest major **v6** (`master/action.yml` = node24) |

**S3 (SHIFTED — under-enumeration).** Believed-state named only `actions/checkout@v4` +
`astral-sh/setup-uv@v6`. HEAD has **two additional node20 actions**, both in `ts-strict.yml`:
`actions/setup-node@v4` (line 23) and `pnpm/action-setup@v4` (line 18). Both are confirmed
`runs.using: node20` and MUST be in the migration scope. The migration touches **all 9
workflows** (every one has at least one node20 action).

Per-workflow `uses:` map (FACT — verbatim grep):

```
audit-append-only.yml:24      actions/checkout@v4        (with: fetch-depth: 0)
determinism.yml:19            actions/checkout@v4
determinism.yml:21            astral-sh/setup-uv@v6
equivalence.yml:16            actions/checkout@v4
equivalence.yml:18            astral-sh/setup-uv@v6
integrity.yml:15              actions/checkout@v4
integrity.yml:17              astral-sh/setup-uv@v6
mutation-testing.yml:19       actions/checkout@v4
mutation-testing.yml:21       astral-sh/setup-uv@v6
python-strict.yml:14          actions/checkout@v4        (with: lfs: true)
python-strict.yml:19          astral-sh/setup-uv@v6
structure.yml:14              actions/checkout@v4
tolerance-budget-check.yml:25 actions/checkout@v4
tolerance-budget-check.yml:27 astral-sh/setup-uv@v6
ts-strict.yml:15              actions/checkout@v4
ts-strict.yml:18              pnpm/action-setup@v4       (with: version: 10)
ts-strict.yml:23              actions/setup-node@v4      (with: node-version: 22, cache: pnpm, cache-dependency-path)
```

### § 6.4 Mechanical-vs-non-mechanical split

(FACT — `with:` blocks read verbatim from each workflow.)

- **Pure mechanical (version-string bump only):** 7 bare `actions/checkout@v4` (determinism,
  equivalence, integrity, mutation-testing, structure, tolerance-budget-check, ts-strict) + all
  6 `astral-sh/setup-uv@v6`. These have **no `with:` block** (or, for setup-uv, none) → a clean
  `@v4`→`@v5`/`@v6` and `@v6`→`@v8` string substitution.
- **Mechanical-WITH-preservation (bump the version, carry the `with:` block UNCHANGED):**
  - `.github/workflows/python-strict.yml:14` checkout — **must preserve `with: lfs: true`** (the
    LBM CI hotfix `b027f60`; required so `tests/fixtures/legacy-captures/**/*.h5` smudge in CI — S-CI1).
  - `.github/workflows/audit-append-only.yml:24` checkout — **must preserve `with: fetch-depth: 0`**
    (required so the append-only check can read the prior phase tag).
  - `.github/workflows/ts-strict.yml:23` `setup-node` — **must preserve `with: node-version: 22`,
    `cache: pnpm`, `cache-dependency-path: common/common-ts/pnpm-lock.yaml`**.
  - `.github/workflows/ts-strict.yml:18` `pnpm/action-setup` — **must preserve `with: version: 10`**.
- **Non-mechanical API migration:** **NONE.** The `with:` input keys used here (`lfs`,
  `fetch-depth`, `node-version`, `cache`, `cache-dependency-path`, `version`) are stable across
  the v4→v5/v6 (checkout, setup-node, pnpm) and v6→v8 (setup-uv) majors — these majors are
  **Node-runtime bumps, not input-API breaks**. (INFERENCE from each action's changelog; the
  Stage-1 agent re-verifies the target majors' `action.yml` input schema before editing, per
  Convention #8 — the only residual risk surface, captured as R-CI1.)

**Net:** the migration is **entirely version-string bumps**, with the load-bearing discipline
being **preservation** of the four `with:` blocks above (R-CI). `actionlint` (CI strict-mode
per architecture § G.9) is the mechanical verifier.

---

## § 7. Naming proposal (D1)

(Conventions § B.4 prescribes a descriptive `sub-phase-<slug>`; the coordinator lean is a name
that names the S-CI2 driver.)

| Option | Slug | Rationale | Lean |
|---|---|---|---|
| **A** | `sub-phase-ci-action-migration-and-banked-cleanup` | Names the S-CI2 driver (CI action migration) + the bundled banked cleanup; matches the coordinator lean + the focused-infra "theme not bundle" naming style | **PRIMARY** (provisionally adopted for paths/slugs in this probe) |
| **B** | `sub-phase-ci-node-runtime-migration` | Tighter, driver-only; cleaner slug; but understates the banked bundle (testing-improvements + sim_runner_diagnostic) | alternative if S-CI2-only scope (D2 single-stage) |
| **C** | `sub-phase-focused-infra-ci-and-testing` | Broad focused-infra frame; flexible if the testing-improvements subset grows | alternative if testing-improvements dominates |

**D1 recommendation: Option A** (`sub-phase-ci-action-migration-and-banked-cleanup`). If the
operator routes S-CI2-only (D2), **Option B** is the better fit and the charter file + audit
dir + commit slug require a mechanical rename **before Stage 0 dispatch**.

---

## § 8. D-class question enumeration (for operator routing)

| D | Question | Lean | Alternatives | Driver |
|---|---|---|---|---|
| **D1** | Canonical sub-phase name | Option A `sub-phase-ci-action-migration-and-banked-cleanup` (§ 7) | Option B / C | § 7 |
| **D2** | Stage decomposition | **Three-stage, Stage-1a (S-CI2) / 1b (testing-improvements subset)** (§ 5) | single-stage hotfix (S-CI2-only) → collapses to Stage 1 + Stage 2 | § 5 critical-mass |
| **D3** | S-CI2 target majors | **checkout→v5 (or v6), setup-uv→latest node24 major (v8 at fetch time), setup-node→v5 (or v6), pnpm→v6** | pin to Node-24-boundary minimum (v5/v5/v5/—) vs latest-major | § 6.3; Convention #8 re-verify at Stage 1 |
| **D4** | S-CI2 non-mechanical preservation set | preserve `lfs: true` (python-strict) + fetch-depth 0 (audit-append-only) + setup-node `with:` (node-version 22 / cache / cache-dependency-path) + pnpm version 10 (ts-strict) | — (all four are load-bearing; no optionality) | § 6.4 |
| **D5** | Opt-out env var as interim mitigation? | **NO** — migrate the version strings; do not ship `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` (it only defers to fall-2026 removal) | add the env var as a belt-and-suspenders bridge | § 6.1 |
| **D6** | Testing-improvements in-scope subset + LBM `sim_runner_diagnostic` fold-in | **`pytest-timeout` (unblocks MPM `mls_mpm.py` mutation) + `sim.py` manifest-equality test**; LBM `sim_runner_diagnostic` STAY-BANKED unless co-located | full augmentation (Cat-3 evaluator shims + DFSPH coverage); fold-in LBM cosmetic | § 3.2 item 2/3; § J.3 / § J.7 |
| **D7** | Mid-Phase-1 capture regeneration | **STAY-BANKED** (content-equivalent contract → no breakage; § 3.2 item 4) | regenerate-now / regenerate-later | § 3.2 item 4 |
| **D8** | Surprise banked items (§ 4) — bundle the §B.6/verify_evidence audit-infra items? | **STAY-BANKED** (orthogonal to Node-runtime + testing) | bundle (audit-chain-correctness theme) | § 4 |
| **D9** | Optional non-phase point-release tag (`v0.1.x`, no `-phase-N`) | **NO tag** (per all prior focused-infra landings) | operator-pushed point release | conventions § D.2 |

---

## § 9. Discrepancies and observations (plan-drafting shifts)

| ID | Description |
|---|---|
| **S1 (plan-drafting)** | **Believed-state deprecation date `2026-06-02` REFUTED.** Canonical GitHub Changelog: Node-24 default switch **2026-06-16**, removal "later in fall 2026" (§ 6.1). Coordinator-side Convention #8 (web-fetch the external date at the moment of assertion). |
| **S2 (plan-drafting)** | **Failure-mode SHIFTED.** Not a hard same-day CI break; a soft default-runtime switch with `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` opt-out until fall-2026 removal (§ 6.1). Time-pressure is real (live warnings + ~23-day default switch) but not a 9-day emergency. |
| **S3 (plan-drafting)** | **S-CI2 affected-action set UNDER-ENUMERATED.** Believed-state named 2 actions; HEAD has **4** node20 actions (adds `actions/setup-node@v4` + `pnpm/action-setup@v4` in `ts-strict.yml`; § 6.3). All 9 workflows are touched. |
| **S4 (plan-drafting)** | **Testing-improvements provenance SHIFTED.** Believed-state attributes the banked testing-improvements to taichi-integration as origin; they are DEFER items **ratified** at taichi-integration D2 but **originate at numba-integration / Phase-1 B17** banking (§ 3.2 item 3). Non-load-bearing; recorded for audit-chain accuracy. |

**Non-shift observations:**
- **Hard Rule 2 NOT triggered.** S-CI2 is real and unresolved at HEAD (all four actions still
  node20; § 6.3). All five SECTION-4 banked items exist as described (modulo the shifts above).
  No structural defect in the believed-state's load-bearing dimensions.
- **IC numbering.** Highest assigned IC at HEAD is **IC-16** (verify_evidence LFS-content-OID;
  audit-chain-correctness). A CI-action-version-pinning policy is infrastructure maintenance,
  not a new interface contract — **lean: claim no new IC** (IC-17 available if the operator
  wants the Node-runtime pin policy formalized; surfaced, not pre-committed).
- **`actionlint` availability.** Architecture § G.9 lists `actionlint` as the workflow-YAML
  strict-mode linter; the Stage-1 agent should confirm it is installed/invocable (or document
  the manual YAML-validity check) — captured as a Stage-0 re-anchor item.

**Cumulative shift count: 146 inherited (MPM Stack-D § 9 close) + 4 (S1–S4) = 150** entering
the plan-drafting landing audit (subject to the landing-audit's own re-count).

---

This probe lands at HEAD `c3fa95c6465f34002fe22fc3fd0be3626fd6f476` (back-filled per Convention #12 + § B.2 in a
separate `chore(ci-action-migration-and-banked-cleanup-plan-drafting-sha-backfill)` commit; full
40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED** (believed-state RATIFIED-with-four-shifts S1–S4; not BLOCKED; Hard Rule 2
not triggered).

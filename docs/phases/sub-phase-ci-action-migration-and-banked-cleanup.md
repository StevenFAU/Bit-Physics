# CI-Action-Migration-and-Banked-Cleanup — Sub-Phase Charter (Spec-Phase-2 Focused Infrastructure)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — focused-infrastructure sub-phase migrating the CI workflow Node-runtime (S-CI2 — GitHub Actions Node-20 deprecation; PRIMARY time-pressured driver) + bundling thematically-adjacent banked infrastructure items. NOT a per-sim implementation sub-phase; NOT a cross-stack port.
> **Sub-phase identity:** PRIMARY driver is **S-CI2** — GitHub Actions is deprecating the Node-20 runtime (Node-24 default 2026-06-16; Node-20 removal "later in fall 2026"; canonical source web-fetched at plan-drafting probe § 6.1). Every workflow `uses:` action pinned to a Node-20-runtime major must bump to a Node-24-runtime major, preserving its `with:` block. Bundles banked items per the focused-infra precedent (`sub-phase-audit-chain-correctness`): a testing-improvements subset (taichi-integration § 9 row 1) and, optionally, the LBM `sim_runner_diagnostic` cosmetic-descriptor fold-in. Mirrors the focused-infrastructure shape of `sub-phase-audit-chain-correctness` (two-or-more coherent banked items; three-stage cadence; Stage-1a/1b split) and `sub-phase-taichi-integration` (workspace-infra). This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` (N a single integer) for spec-phase boundaries. No `-phase-N` tag is proposed.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ **7.7** (strict-mode CI configuration — `actionlint` for workflow YAML, Appendix § G.9), **7.12** (trunk-based development + operator-only tag-pushing + server-side hooks), **G.9** / **G.10** (strict-mode CI + server-side hooks catalog). Conventions doc § B (audit-chain discipline), § C (commit-message convention), § J.3 (per-test wall-clock timeout / `pytest-timeout` banked for the testing-improvements sub-phase), § J.7 (`sim.py` manifest-builder kill-rate floor → manifest-equality test).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45`; 858 lines). Inherits role model, audit / append-only discipline, checkpoint discipline, Convention #12 SHA back-fill (+ N1 enumeration), replay-chain non-participation, problem-solving playbook, FACT/INFERENCE tagging — by REFERENCE, not re-stated.
> **Parent sub-phase templates** (structure inheritance): `docs/phases/sub-phase-audit-chain-correctness.md` (focused-infrastructure template — closest analog: two coherent banked items, Stage-1a/1b) + `docs/phases/sub-phase-taichi-integration.md` (focused-infra workspace-infra shape).
> **Parent audits / pre-conditions (FACT — re-verify at Stage 0 Task 0.0 / 0.2):**
> - MPM Stack-D landed SHIFTED at `f6c7f0e` (+ SHA back-fill HEAD `d6e0671`); all 14 gates GREEN; cumulative 146; S-CI1 SATISFIED (all 9 CI workflows GREEN), LBM/MPM `sim_runner_diagnostic` DECOMPOSED (MPM-side CLOSED, LBM-side STAYS BANKED). (FACT — `docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/landing-2026-05-24T13-45-00Z.md` §§ 9–12.)
> - `sub-phase-audit-chain-correctness` landed SHIFTED (`docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md`); established IC-16 + the focused-infra Stage-1a/1b template this sub-phase mirrors.
> - S-CI2 is REAL and UNRESOLVED at HEAD — all four node20 actions present (plan-drafting probe § 6.3); Hard Rule 2 not triggered.
> - Bit-identity replay invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` held byte-identically across 23+ invocations; Stage 0 Task 0.0 is the next invocation.
> **Inherited shifts:** **146 documented entering this sub-phase** (FACT — MPM Stack-D landing § 9 "Cumulative at sub-phase close: 146"). Plan-drafting added **4** (S1–S4; probe § 9) → **150** entering Stage 0 (subject to the plan-drafting landing audit's own re-count).
> **Date drafted:** 2026-05-24.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D9 routing (§ 9).

---

## § 1. Scope and primary driver

### § 1.1 What this sub-phase is

A **focused-infrastructure** sub-phase with **S-CI2 as the primary, time-pressured driver**:

1. **S-CI2 — GitHub Actions Node-20 → Node-24 runtime migration (PRIMARY).** GitHub deprecates the
   Node-20 runner runtime: Node-24 becomes the default on **2026-06-16**, with Node-20 removed
   "later in fall 2026" (canonical GitHub Changelog 2025-09-19, web-fetched at probe § 6.1). At
   HEAD, **all 9 workflows** reference Node-20-runtime actions (probe § 6.2–6.3): `actions/checkout@v4`
   (×9; `runs.using: node20`), `astral-sh/setup-uv@v6` (×6; `node20`), `actions/setup-node@v4` (×1,
   `ts-strict.yml`; `node20`), `pnpm/action-setup@v4` (×1, `ts-strict.yml`; `node20`). Each must bump
   to a Node-24-runtime major, **preserving its `with:` block**. This is an entirely version-string
   migration; the load-bearing discipline is `with:`-block preservation (§ 5 R-CI).

2. **Banked testing-improvements subset (bundled; D6).** Per taichi-integration landing § 9 row 1 +
   conventions § J.3 / § J.7: `pytest-timeout` at `tools/testkit/pyproject.toml` (which **unblocks the
   banked MPM `mls_mpm.py` mutation-completion** per § J.3 R15 precedent) + a `sim.py` manifest-equality
   test (per § J.7 manifest-builder kill-rate floor). Heavier augmentation (Cat-3 evaluator shims;
   DFSPH generator coverage) is surfaced as D6-expandable scope, default-excluded.

3. **LBM `sim_runner_diagnostic` cosmetic descriptor (optional fold-in; D6).** Cosmetic only (analytic
   Poiseuille ICs; no RNG threading — probe § 3.2 item 2); the MPM-side counterpart was
   CLOSED-AS-NOT-A-DEFECT at MPM Stack-D. Lean: STAY-BANKED unless Stage 1b touches the testkit/sim
   surface anyway, in which case interpolate the descriptor on the clean contract (mirroring the
   MPM-side close).

The plan-drafting probe (`docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/plan-drafting-probe-2026-05-24T14-22-36Z.md`)
empirically bounds the migration (17 `uses:` lines, 4 distinct action majors, 3 `with:`-preservation
points; no non-mechanical API break) and ratifies the believed-state with four shifts (S1–S4).

### § 1.2 What this sub-phase is NOT

- A per-sim implementation sub-phase. No gates 4–14; no sim source change except the optional cosmetic
  LBM `sim_runner_diagnostic` descriptor interpolation (D6 fold-in).
- A cross-stack equivalence sub-phase. Does not touch `tools/testkit/equivalence/tolerance.toml`.
- A shipper of the `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` opt-out as the fix (D5 — that only
  defers to the fall-2026 removal; the fix is version bumps).
- A migration that drops or alters any `with:` block (R-CI — `lfs: true`, `fetch-depth: 0`,
  `setup-node` inputs, `pnpm version`).
- An IC-15 full-formalization, cross-stack-methodology consolidation, atomic-scatter stress-test, or
  Cat-3 sibling-subdir extension (all per-sim / cross-stack scope; probe § 4 OUT-OF-SCOPE rows).
- A bundling of the §B.6 / `verify_evidence` audit-infra banked items (D8 — orthogonal; default
  STAY-BANKED).
- Pre-committing D1–D9 — operator decisions surfaced at plan-drafting landing close (§ 9).

### § 1.3 Inherited state (150 cumulative) + banked items consumed

(FACT — MPM Stack-D landing §§ 9–12; taichi-integration landing § 9; plan-drafting probe §§ 1–9.)

- 146 cumulative shifts entering (MPM Stack-D § 9 close); plan-drafting added 4 (S1–S4) → 150 entering Stage 0.
- Bit-identity replay invariant `9399fc33…909f34` (23+ invocations); Stage 0 Task 0.0 = next invocation.
- Conventions doc byte-stable at sha256 `69aa39fc…4602bf45`; architecture `e82b7b8e…9292d267`; methodology `8c760383…0d8f`.
- `.gitattributes` has exactly 2 LFS rules (`captures/**/*.h5` + `tests/fixtures/legacy-captures/**/*.h5`).
- S-CI2 fully characterized (probe § 6): 9 workflows, 4 node20 actions, 3 `with:`-preservation points, no non-mechanical break.

**Banked items CONSUMED (D6 disposition; § 9):** S-CI2 (Stage 1a); testing-improvements subset
(`pytest-timeout` + `sim.py` manifest-equality test; Stage 1b); optional LBM `sim_runner_diagnostic`
fold-in (Stage 1b).

**Banked items DEFERRED (§ 9):** mid-Phase-1 capture regeneration (D7 — content-equivalent contract →
no breakage); §B.6 / `verify_evidence` audit-infra items (D8); IC-15 full formalization + cross-stack
methodology consolidation + atomic-scatter stress-test + Cat-3 sibling subdirs (OUT-OF-SCOPE; next
cross-stack pair); optional point-release tag (D9).

### § 1.4 Architecture — three stages (D2 surfaced)

Three-stage cadence (Stage 0 pre-flight / Stage 1 implementation / Stage 2 landing) per conventions § A.2.
**D2 lean: Stage 1 decomposes 1a / 1b** (mirroring audit-chain-correctness): 1a is the **S-CI2 CI migration**
(time-pressured; isolated `.github/workflows/` surface; independently landable), 1b is the
**testing-improvements subset + optional LBM fold-in**. **Single-stage (S-CI2-only)** is the alternative
if the operator scopes the banked bundle out (§ 1.4 collapses to Stage 1 + Stage 2; the testing-improvements
stays banked). Critical-mass assessment (probe § 5): S-CI2 alone is a single-stage hotfix; the bundle
justifies the 1a/1b multi-stage shape.

- **Stage 0 — Pre-flight.** Cross-phase replay against `v0.1.0-phase-1`; tolerance-budget carryover;
  re-anchor the probe's S-CI2 empirical findings (action inventory; `runs.using` per target major;
  `with:`-preservation set) + confirm `actionlint` invocability; Stage 0 checkpoint + Convention #12 SHA back-fill.
- **Stage 1a — S-CI2 CI migration.** Bump the 4 node20 actions to Node-24 majors across all 9 workflows;
  preserve every `with:` block; `actionlint` (or documented YAML-validity check) GREEN; Stage 1a checkpoint + SHA back-fill.
- **Stage 1b — Testing-improvements subset (+ optional LBM fold-in).** `pytest-timeout` at
  `tools/testkit/pyproject.toml` + `sim.py` manifest-equality test; optional LBM `sim_runner_diagnostic`
  descriptor interpolation; Stage 1b checkpoint + SHA back-fill.
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive; `docs/dependencies.md` additive if a
  new IC is claimed — lean NO, § 9 D-note); full integrity sweep; cross-package regression sweep (Python +
  TypeScript fan-out — § B.7; ts-strict workflow is touched so the TS fan-out is exercised at sweep, but
  CI itself is NOT run by the agent per the boundary); evidence-path verification; sub-phase landing audit;
  Convention #12 SHA back-fill (+ N1 enumeration). **No tag** (§ 9 D9).

---

## § 2. Stage decomposition (D2)

| Stage | Owner session | Deliverable | Verification | Convention-A posture |
|---|---|---|---|---|
| **0** | one session | replay + tolerance carryover + S-CI2 re-anchor + actionlint-availability confirm | replay sha256 == `9399fc33…909f34`; re-grep action inventory matches probe § 6.3 | tolerance-budget edit (carryover) + new checkpoint audit |
| **1a** | one session | S-CI2: bump 4 node20 actions → Node-24 majors across all 9 workflows; preserve `with:` blocks | `actionlint` GREEN (or documented manual YAML check); `git diff` shows ONLY version-string + (preserved) `with:` lines | in-place additive version bumps to 9 existing workflows + new checkpoint |
| **1b** | one session | testing-improvements subset: `pytest-timeout` pin + `sim.py` manifest-equality test (+ optional LBM `sim_runner_diagnostic` fold-in) | new test GREEN; targeted mutation re-run on `mls_mpm.py` if pytest-timeout unblocks it (advisory) | new-files-first for tests; additive edit to `tools/testkit/pyproject.toml` + new checkpoint |
| **2** | one session | convergence (CHANGELOG + dependencies.md-if-IC) + integrity sweep + Python+TS regression sweep + gate-5 + landing audit + SHA back-fill | 0 HARD_FAIL; sweep counts vs MPM § 5/§ 6 baselines; `verify_evidence --strict` GREEN | additive convergence edits + new landing audit |

**If operator routes D2=single-stage (S-CI2-only):** rows 1a/1b collapse to a single Stage 1 (S-CI2 only);
testing-improvements + LBM fold-in stay banked; the charter file + audit dir + commit slug rename per D1 Option B.

---

## § 3. Acceptance criteria per scoped item

| # | Item | Acceptance |
|---|---|---|
| 1 | **S-CI2 CI migration** | Every workflow `uses:` line referencing a Node-20 action (`actions/checkout@v4`, `astral-sh/setup-uv@v6`, `actions/setup-node@v4`, `pnpm/action-setup@v4`) bumps to a Node-24-runtime major (D3); `runs.using` of each target major re-verified `node24` at edit time (Convention #8); **every `with:` block preserved verbatim** (`lfs: true` on `python-strict`; `fetch-depth: 0` on `audit-append-only`; `node-version: 22` / `cache: pnpm` / `cache-dependency-path` on `ts-strict` setup-node; `version: 10` on `ts-strict` pnpm). `actionlint` GREEN (or documented manual YAML-validity + `uses:` re-grep). No non-`uses:`/`with:` workflow lines changed. |
| 2 | **`pytest-timeout` pin** | `pytest-timeout` added to `tools/testkit/pyproject.toml` dev deps with a pin range; a per-test default timeout wired (conventions § J.3 mechanism 2); the testkit pytest suite still GREEN under the plugin. Advisory: re-attempt the banked MPM `mls_mpm.py` PATH-A mutation completion (conventions § J.3 R15); record outcome (non-blocking). |
| 3 | **`sim.py` manifest-equality test** | A test invoking `<sim>.sim.build_manifest()` (or the equivalent manifest-builder entry) + equality-asserting the full manifest dict, landing for at least one representative sim (conventions § J.7); GREEN; documented as the manifest-builder kill-rate-floor mitigation. |
| 4 | **(optional) LBM `sim_runner_diagnostic` fold-in (D6)** | IF routed: the descriptor filename + payload path interpolated from params on the clean contract (no Phase-1-sealed edit beyond the additive interpolation; mirror the MPM-side close); LBM tests GREEN. ELSE: NO-OP (stays banked). |
| 5 | **Convergence (Stage 2)** | CHANGELOG additive entry (`### sub-phase-<canonical-name>` under `[Unreleased]`); `docs/dependencies.md` additive IF a new IC is claimed (lean NO); integrity sweep 0 HARD_FAIL; Python + TS regression sweeps GREEN. |

**Acceptance for "sub-phase complete":** items 1 + 5 GREEN (S-CI2 is the load-bearing driver); items 2/3/4
per D6 routing; landing audit committed; SHA back-fill committed. **No `-phase-N` tag.**

---

## § 4. Touch set per stage

(FACT — plan-drafting probe § 6; Convention M re-anchor at each stage.)

- **Stage 0:** `tools/testkit/equivalence/tolerance-budget.toml` (`[phase]` carryover only; no `[budgets.*]` widening) + new Stage-0 checkpoint audit. (Re-anchor reads only; no other edits.)
- **Stage 1a (S-CI2):** all 9 `.github/workflows/*.yml` (version-string bumps + preserved `with:` blocks) + new Stage-1a checkpoint audit + (if `actionlint` output captured) a Stage-1a evidence `.txt`.
  - `audit-append-only.yml` (checkout) · `determinism.yml` (checkout + setup-uv) · `equivalence.yml` (checkout + setup-uv) · `integrity.yml` (checkout + setup-uv) · `mutation-testing.yml` (checkout + setup-uv) · `python-strict.yml` (checkout `lfs: true` + setup-uv) · `structure.yml` (checkout) · `tolerance-budget-check.yml` (checkout + setup-uv) · `ts-strict.yml` (checkout + pnpm + setup-node).
- **Stage 1b (testing-improvements):** `tools/testkit/pyproject.toml` (additive dev dep + timeout config) + new test file(s) under the relevant package's `tests/` (manifest-equality) + (optional D6) `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py` (cosmetic descriptor interpolation) + new Stage-1b checkpoint audit + pytest evidence `.txt`.
- **Stage 2:** `CHANGELOG.md` (additive) + `docs/dependencies.md` (additive if-IC) + Stage-2 evidence dir + the sub-phase landing audit + SHA back-fill audit.

---

## § 5. Risk surface (R-class)

Inherits conventions doc § 9 playbook P1–P26 + § K R-class stop-and-surface discipline verbatim. **NEW
R-class entries SPECIFIC to this sub-phase:**

- **R-CI (load-bearing) — `with:`-block preservation through the version bump.** The migration's only
  non-mechanical risk is dropping or mangling a `with:` block when bumping the version string. The four
  load-bearing blocks (probe § 6.4): `lfs: true` (python-strict — required so legacy-captures HDF5 smudge
  in CI; S-CI1 / hotfix `b027f60`), `fetch-depth: 0` (audit-append-only — required so the append-only
  check reads the prior phase tag), `setup-node` inputs (ts-strict — node-version/cache/cache-dependency-path),
  `pnpm version: 10` (ts-strict). **Mitigation:** edit ONLY the `@vN` token on each `uses:` line; re-grep
  `with:` blocks before/after; `actionlint` + `git diff` review confirm no `with:` line changed. Dropping
  `lfs: true` would re-break S-CI1 (the MPM Stack-D representative-subset CI round-trip); dropping
  `fetch-depth: 0` would break the append-only HARD_FAIL gate.
- **R-CI2 — target-major drift (Convention #8 re-verify at edit time).** Action majors move fast
  (`setup-uv` v6→v8 between Phase-1 and now; latest majors are moving targets). The Stage-1a agent MUST
  re-fetch each target major's `action.yml` `runs.using` field at edit time to confirm `node24` (do not
  trust the probe's fetch-time snapshot). If a target major's input schema changed (non-mechanical), STOP
  and surface (Hard Rule 2). Probe INFERENCE: no input-API break across these majors (Node-runtime bumps
  only), but this is the residual surface to re-confirm.
- **R-CI3 — `actionlint` availability.** Architecture § G.9 names `actionlint` as the workflow-YAML
  strict-mode linter; if it is not installed/invocable, fall back to a documented manual YAML-validity
  check + `uses:` re-grep (do NOT silently skip the verification). Confirm at Stage 0.
- **R-T1 — `pytest-timeout` interaction with numba @njit / capture-generation tests.** Per conventions
  § J.3, numba-using PATH-A targets need per-test wall-clock timeouts; a too-aggressive default could
  false-timeout legitimate slow capture-generation tests. **Mitigation:** tiered timeouts (e.g., 30 s unit
  / 300 s capture-generation per § J.3 mechanism 2); verify the existing testkit suite stays GREEN under
  the plugin before relying on it. The MPM `mls_mpm.py` mutation re-attempt is advisory (R15 precedent);
  if it still cannot complete, re-bank it (do NOT block the sub-phase on it).
- **R-T2 — manifest-equality test brittleness.** A full-dict equality assert can break on legitimate
  manifest evolution (wall-clock fields, build_id). **Mitigation:** assert the structural/literal fields
  per § J.7, excluding wall-clock-influenced fields (mirror the determinism content-equivalent contract,
  spec § 2.5).
- **R-S1 — single-stage collapse (D2).** If the operator routes S-CI2-only, do NOT author Stage 1b; the
  testing-improvements stays banked. Surface, do not assume the bundle.

---

## § 6. Convention discipline reminders specific to this sub-phase

(Inherited from conventions § A–P + audit-chain-correctness § 7 standing orders, with substitutions.)

- Commit slug `chore` / `feat` / `docs` / `test` + `<canonical-name>-stage<N>-<scope>` (non-phase form;
  no `-phase-N` tag; no point-release tag at Stage 2 — § 9 D9). The S-CI2 workflow edits use a `ci(...)`
  or `chore(...)`-typed commit consistent with the `b027f60` precedent (`ci(python-strict): …`).
- **Convention #8 — re-verify every action version-string + `runs.using` + deprecation fact against the
  live source at the moment of the edit** (exemplary here — the probe's web-fetched targets are a
  plan-drafting-time snapshot; majors move). The believed-state's `2026-06-02` date was REFUTED at probe
  § 6.1 — a coordinator-side Convention #8 gap.
- **Convention M — re-anchor each workflow file immediately before editing it** (re-grep the `uses:` +
  `with:` lines); do not edit from the probe's line numbers without re-confirming (the workflows are short
  and stable, but the discipline holds).
- **Convention A — additive/minimal-diff.** The workflow edits are in-place single-token version bumps
  (not new-files-first; the file already exists) — keep each diff to the `@vN` token + preserved `with:`.
  New tests are new-files-first.
- **Convention #12 — never `--amend`; SHA back-fill at EVERY stage close, enumerating EVERY
  placeholder-bearing audit (N1 enumeration)** per § B.2 tightened-discipline. Full 40-hex via
  `git rev-parse HEAD` at summary-composition time, NOT transcribed.
- **Cat-4 pre-commit hook HARD_FAILs on inline backtick `path:line` citations whose target doesn't resolve
  at HEAD** — use FULL repo-relative paths (`.github/workflows/python-strict.yml:14`, never the
  bare-filename + line form), and avoid the `word:number` backtick form for non-citations (`fetch-depth: 0`
  written without colon-number adjacency). (This bit the plan-drafting probe; § 10 checklist item.)
- **Pre-emptive `ruff check --fix` + `ruff format`** before the first Stage-1b commit attempt (banked
  precedent; relevant once Stage 1b touches Python — the manifest-equality test + the `sim.py` edit).
- **Operator-only tag-pushing** (spec § 7.12); the agent NEVER runs `git tag` / `git push origin <tag>`.
  Per the dispatch boundary, the agent also does NOT run any CI workflow, push to origin, or dispatch a
  subsequent stage.
- **Hard Rule 2** — if a target action major has a non-mechanical input-API break, or `actionlint` is
  unavailable and YAML validity is uncertain, or S-CI2 is found already-resolved → STOP and surface.

---

## § 7. Banked methodology-precedents this sub-phase consumes

(FACT — conventions § L; audit-chain-correctness § 10; MPM Stack-D § 11.)

- **Focused-infrastructure Stage-1a/1b template** (audit-chain-correctness): two coherent banked
  workstreams with distinct verification (1a tooling/CI; 1b test/audit).
- **Commit-first-then-sha256** (audit-chain-correctness banked precedent #1): record the committed-blob
  sha256, never in-memory pre-hook content (the `end-of-file-fixer` trailing-newline phantom; conventions
  § B.6 Mode 3).
- **SHA back-fill N1 enumeration** (audit-chain-correctness Stage 1b N1): the back-fill commit enumerates
  EVERY placeholder-bearing audit in the chain, not just the checkpoint.
- **`pytest-timeout` requirement for numba PATH-A targets** (conventions § J.3): the documented mechanism
  the testing-improvements subset finally lands.
- **Manifest-equality test for the `sim.py` kill-rate floor** (conventions § J.7).
- **S-CI1 CI corpus verification / `lfs: true` discipline** (MPM Stack-D + hotfix `b027f60`): the reason
  the `python-strict` `lfs: true` block is load-bearing through the migration (R-CI).
- **Cosmetic-descriptor close on the clean contract** (MPM Stack-D `sim_runner_diagnostic` MPM-side close):
  the pattern for the optional LBM fold-in (D6).

---

## § 8. Out-of-scope (explicitly excluded; operator may re-route)

- IC-15 full formalization; cross-stack-methodology full consolidation; atomic-scatter substantive
  stress-test (IC-15 #3); D8 comparison-projection axis — all next-cross-stack-pair / per-sim scope
  (MPM Stack-D § 12).
- Cat-3 sibling-subdir extension (`hybrid-pg`, `lattice`, `continuous-ca`) — per-sim additive (conventions § I.4).
- §B.6 / `verify_evidence` audit-infra items (empty-`__init__.py` rejection; accept-both-shas;
  pre-commit-hook trailing-newline fix) — audit-chain-correctness theme; orthogonal to Node-runtime +
  testing (D8; default STAY-BANKED).
- Mid-Phase-1 capture regeneration — content-equivalent contract → no breakage; not-needed (D7; STAY-BANKED).
- DFSPH generator coverage gap + Cat-3 evaluator shims for the 5 AUDIT_LOG algorithms — heavier
  testing-augmentation; D6-expandable but default-excluded.
- `--strict` flag re-wiring of `verify_evidence`; Phase-1 open items B2–B6/B11/B16; B-hotfix-1/2.
- `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` opt-out as the fix (D5 — defers, does not fix).

---

## § 9. Operator decisions surfaced (D1–D9)

(See the plan-drafting probe § 8 for the full surface + the plan-drafting landing audit § 5; this charter
does NOT pre-commit.)

- **D1** — Canonical sub-phase name. Lean: `sub-phase-ci-action-migration-and-banked-cleanup` (Option A;
  adopted provisionally for paths/slugs). Alternatives: `sub-phase-ci-node-runtime-migration` (B; tighter,
  S-CI2-only); `sub-phase-focused-infra-ci-and-testing` (C; broad).
- **D2** — Stage decomposition. Lean: three-stage, Stage-1a (S-CI2) / 1b (testing-improvements subset).
  Alternative: single-stage hotfix (S-CI2-only).
- **D3** — S-CI2 target majors. Lean: `actions/checkout`→v5-or-v6, `astral-sh/setup-uv`→latest node24
  major (v8 at probe fetch-time), `actions/setup-node`→v5-or-v6, `pnpm/action-setup`→v6. Re-verify each
  target's `runs.using: node24` at edit time (Convention #8 / R-CI2).
- **D4** — Non-mechanical preservation set. No optionality: preserve `lfs: true` (python-strict) +
  `fetch-depth: 0` (audit-append-only) + setup-node inputs + pnpm `version` (ts-strict).
- **D5** — Opt-out env var as interim mitigation? Lean: NO (migrate version strings; opt-out only defers).
- **D6** — Testing-improvements in-scope subset + LBM `sim_runner_diagnostic` fold-in. Lean: `pytest-timeout`
  + `sim.py` manifest-equality test; LBM cosmetic STAY-BANKED unless co-located. Alternative: full
  augmentation (Cat-3 shims + DFSPH coverage).
- **D7** — Mid-Phase-1 capture regeneration. Lean: STAY-BANKED (content-equivalent → no breakage).
- **D8** — Surprise / audit-infra banked items. Lean: STAY-BANKED (orthogonal).
- **D9** — Optional non-phase point-release tag (`v0.1.x`, no `-phase-N`). Lean: NO tag (per all prior
  focused-infra landings). Operator-only act either way.

**If operator routes alternatives to D1:** charter file path + audit dir + commit slug require a mechanical
rename BEFORE Stage 0 dispatch. **If operator routes alternatives to D2–D9:** the affected § 2 / § 4 / § 5
entries adjust accordingly.

---

## § 10. Plan-drafting landing audit checklist

The plan-drafting landing audit
(`docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/plan-drafting-landing-<UTC>.md`)
must, before its CONFIRMED verdict:

1. **Closing-anchor re-check** on every `file:line` citation in the probe + this charter (Convention F /
   § 7.9): re-grep each cited workflow `uses:`/`with:` line; re-`sha256sum` the three doc anchors; re-confirm
   the 4-action node20 inventory at HEAD.
2. **Believed-state verdict table** (CONFIRMED / SHIFTED / REFUTED / DEFERRED / CLOSED-AS-NOT-A-DEFECT) on
   each SECTION-4 item, carrying the probe § 3 verdicts.
3. **Cat-4 citation hygiene**: confirm all inline backtick `path:line` citations use full repo-relative
   paths and no `word:number` false-positive spans remain (the probe needed a fix-up; § 6 reminder).
4. **Shift re-count** at plan-drafting close (146 + plan-drafting shifts).
5. **D1–D9 enumeration** for operator routing.
6. **SHA references use placeholders** (`<COMMIT_N_SHA_PENDING>`); the SHA back-fill (Convention #12 + N1
   enumeration) is the FINAL plan-drafting commit, enumerating EVERY placeholder-bearing audit (probe +
   this charter + the plan-drafting landing audit).
7. **No `-phase-N` tag**; surface the S-CI2 time-pressure (default switch 2026-06-16) + next-step (operator
   reviews, routes D1–D9, dispatches Stage 0).

---

*End of CI-action-migration-and-banked-cleanup sub-phase charter. Inherits the conventions doc + Phase-1's
role model, audit/append-only discipline, conventions, IC contracts, and problem-solving playbook wholesale;
adopts the focused-infrastructure Stage-1a/1b template from `sub-phase-audit-chain-correctness`; adds the
S-CI2 Node-runtime migration scope (§ 1.1 + § 3 item 1), the `with:`-block preservation discipline (§ 5 R-CI),
and the testing-improvements-subset bundle (§ 3 items 2–3) as the deltas required by CI-infrastructure +
testing-improvements work. Claims no new IC (lean; IC-17 available if the operator formalizes a CI-action
Node-runtime pin policy).*

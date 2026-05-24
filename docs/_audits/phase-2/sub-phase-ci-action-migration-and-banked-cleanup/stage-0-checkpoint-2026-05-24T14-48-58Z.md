---
date: 2026-05-24T14-48-58Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: stage
artifact_id: ci-action-migration-and-banked-cleanup-stage-0
subject: "Stage 0 pre-flight CLOSE for sub-phase-ci-action-migration-and-banked-cleanup (focused-infrastructure; S-CI2 GitHub Actions Node-20 migration primary driver + banked testing-improvements subset). All 8 tasks (0.0-0.7) PASS. Task 0.0 cross-phase replay vs v0.1.0-phase-1 GREEN (8/8 gates, ok=True); replay-output sha256 9399fc33…909f34 byte-identical to the bit-identity invariant (24th invocation). Task 0.1 HEAD == f202a57 (NO drift since plan-drafting close). Task 0.2 INFORMATIONAL latest majors (Stage 1a re-fetches at edit time, D3): checkout v6 / setup-uv v8 / setup-node v6 / pnpm v6; Node-20 default-switch date 2026-06-16 CONFIRMED (plan-drafting S1 holds), removal fall 2026. Task 0.3 D4 preservation set: 4 of 4 verified verbatim, NO surprise with: blocks across the other 7 workflows. Task 0.4 tolerance-budget NO-OP (CI+testing scope; no equivalence work; no carryover artifact committed per D4). Task 0.5 testing-improvements scope: pytest-timeout ABSENT at HEAD (clean); no public build_manifest()/manifest-equality test in any sim (physarum has a private _build_manifest fixture-helper; other 8 build inline) — Stage 1b representative-subset scope ~1+ test. Task 0.6 LBM sim_runner_diagnostic STAYS BANKED (manifest-equality test is additive/new-file; no natural sealed-package co-location). Task 0.7 9 workflows confirmed. Verdict CONFIRMED; 0 new Stage-0 shifts; cumulative 150. No -phase-N tag."
verdict-state: CONFIRMED
head_sha: <COMMIT_N_SHA_PENDING>
head_sha_at_checkpoint: <COMMIT_N_SHA_PENDING>
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/landing-2026-05-24T13-45-00Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/plan-drafting-probe-2026-05-24T14-22-36Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/plan-drafting-landing-2026-05-24T14-22-36Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/sha-back-fill-2026-05-24T14-22-36Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-evidence/replay-2026-05-24T14-48-58Z.txt
  - docs/conventions/sub-phase-conventions.md
  - .github/workflows/python-strict.yml
  - .github/workflows/audit-append-only.yml
  - .github/workflows/ts-strict.yml
  - tools/testkit/equivalence/tolerance-budget.toml
evidence_hashes:
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-evidence/replay-2026-05-24T14-48-58Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/conventions/sub-phase-conventions.md: sha256:69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45
---

# Stage 0 Checkpoint — Sub-Phase CI-Action-Migration-and-Banked-Cleanup

## § 1. Scope

(FACT — charter `docs/phases/sub-phase-ci-action-migration-and-banked-cleanup.md` § 1.4 + § 2.)
Stage 0 pre-flight for the focused-infrastructure sub-phase whose PRIMARY driver is **S-CI2**
(GitHub Actions Node-20 runtime deprecation), bundling a banked testing-improvements subset
(Stage 1b). **Pre-flight only** — no workflow YAML, sim source, dependency, or tolerance edit
this stage (Stage 1a owns the S-CI2 version bumps; Stage 1b owns pytest-timeout + the
manifest-equality test). All 8 tasks (0.0–0.7) executed against current HEAD per Convention M
(re-anchor) + Convention #8 (web-fetch external facts at moment of assertion). Conventions doc
verified byte-stable at sha256 `69aa39fc…4602bf45` before reliance (not BLOCKED).

## § 2. Operator routing consumed (D1–D9)

(FACT — Stage-0 dispatch SECTION 1.)

| D | Routing | Stage-0 action |
|---|---|---|
| D1 | Name `sub-phase-ci-action-migration-and-banked-cleanup` RATIFIED | no rename (paths/slug already match) |
| D2 | THREE-STAGE (0 → 1a → 1b → 2) | this is Stage 0; produces no Stage-1a artifact |
| D3 | Targets = latest-node24 majors at Stage-1a edit time | Task 0.2 lists current latest INFORMATIONALLY; NOT a pin |
| D4 | Preservation set (no optionality) | Task 0.3 HEAD-verifies + captures verbatim (§ 6) |
| D5 | Opt-out env var NO | not in scope any stage |
| D6 | Testing-improvements: pytest-timeout + sim.py manifest-equality; LBM cosmetic co-located-only | Tasks 0.5 + 0.6 (§ 8, § 9) |
| D7 | Mid-Phase-1 capture regen STAY-BANKED | confirmed; no action |
| D8 | Surprise banked items STAY-BANKED | confirmed; no action |
| D9 | No point-release tag | agent pushes no tag |

## § 3. Task 0.0 — Bit-identity replay invariant verification

(FACT — `stage-0-evidence/replay-2026-05-24T14-48-58Z.txt`; canonical replay procedure per
conventions doc **§ D.5** [`replay_prior_phase` tool conventions] + § D.3 [the invariant]. The
dispatch cited "§ F" for the procedure — § F is the determinism convention; the canonical replay
procedure is § D.5. Minor dispatch citation slip; proceeded with § D.5 — see § 10.)

Invocation (8-gate canonical set vs `v0.1.0-phase-1`):

```
uv run --no-sync python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit <repo>/docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

(`--audit` passed as an absolute path; the relative form fails from the `tools/integrity` CWD that
`uv run` requires for module import — recorded for Stage-1 reuse.)

**Result: PASS.** `summary: prior_phase=v0.1.0-phase-1 ok=True`; 8/8 gates GREEN
(integrity / pytest / equivalence / determinism / perf-ledger / property / mutation /
tolerance-budget). The replay-output evidence file's sha256 is
`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` — **byte-identical to the
bit-identity replay invariant** (`9399fc33…18909f34`). **24th+ invocation; HELD.** No SHIFT; no
Hard-Rule-2 condition.

## § 4. Task 0.1 + 0.7 — HEAD re-anchor + workflow inventory

(FACT — `git rev-parse HEAD`; `git status`; `ls .github/workflows/*.yml`.)

- **Task 0.1 — HEAD == `f202a57f8cedeadd45ccd1161cc7fa75e68ca4d0`** (the plan-drafting SHA back-fill
  commit). **NO drift** since plan-drafting close. `git status` clean except untracked `.claude/`
  (tooling dir, not repo content). The four plan-drafting artifacts (probe / charter /
  plan-drafting-landing / sha-back-fill) are present + unedited. No Hard-Rule-2 condition (the
  plan-drafting artifacts have NOT been edited since `f202a57`).
- **Task 0.7 — exactly 9 workflow files** (CONFIRMS plan-drafting): `audit-append-only.yml`,
  `determinism.yml`, `equivalence.yml`, `integrity.yml`, `mutation-testing.yml`,
  `python-strict.yml`, `structure.yml`, `tolerance-budget-check.yml`, `ts-strict.yml`. This is the
  Stage-1a touch-set baseline. No `*.yaml`; no composite/reusable workflows.

## § 5. Task 0.2 — Informational web-fetch (latest action majors + deprecation date)

(FACT — web-fetched 2026-05-24 at moment of assertion per Convention #8. **INFORMATIONAL ONLY** —
D3 mandates Stage 1a re-fetch at its own edit time and pick the latest-at-that-moment majors; these
are NOT a pin.)

| Action | HEAD pin | Latest major (fetched 2026-05-24) | Node-24 boundary |
|---|---|---|---|
| `actions/checkout` | `@v4` (node20) | **v6** (v6.0.2) | v5 first node24; v6 latest |
| `astral-sh/setup-uv` | `@v6` (node20) | **v8** (v8.1.0) | main = node24; v8 latest |
| `actions/setup-node` | `@v4` (node20) | **v6** (v6.4.0) | v5 first node24; v6 latest |
| `pnpm/action-setup` | `@v4` (node20) | **v6** (v6.0.8) | v5 first node24; v6 latest |

(Release DATES from the fetch were not reliably extractable — the rendering returned inconsistent
years; the load-bearing datum is the latest MAJOR. Stage 1a re-verifies `runs.using: node24` on its
chosen target majors at edit time per R-CI2.)

**Node-20 deprecation date re-verification (canonical GitHub Changelog 2025-09-19):** Node-24
becomes the runner default **2026-06-16**; Node-20 removed "later in fall 2026". **CONFIRMS
plan-drafting S1** (date is 2026-06-16, NOT the original believed-state 2026-06-02). The changelog
notes the timeline was "updated twice (most recently May 2026)"; the 2026-06-16 default date holds.
~23 days from today (2026-05-24) to the default switch; months to removal. Time-pressure real but
soft (opt-out env var available until removal — D5 = do not use it; migrate instead).

## § 6. Task 0.3 — D4 preservation set (verbatim capture for Stage 1a byte-for-byte preservation)

(FACT — `sed -n` verbatim from each workflow at HEAD; full `.github/workflows/<file>:<line>`
citations per the new banked precedent.) **All 4 of 4 preservation items VERIFIED PRESENT.**

**(a) `lfs: true` on `actions/checkout` — `.github/workflows/python-strict.yml:14`–`16`:**
```yaml
      - uses: actions/checkout@v4
        with:
          lfs: true
```
(Load-bearing: legacy-captures HDF5 must smudge in CI; S-CI1 / hotfix `b027f60`.)

**(b) `fetch-depth: 0` on `actions/checkout` — `.github/workflows/audit-append-only.yml:24`–`26`:**
```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
```
(Load-bearing: the append-only check must read the prior phase tag.)

**(c) `setup-node` `with:` block — `.github/workflows/ts-strict.yml:23`–`27`:**
```yaml
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: common/common-ts/pnpm-lock.yaml
```

**(d) `pnpm/action-setup` `with:` block — `.github/workflows/ts-strict.yml:18`–`20`:**
```yaml
        uses: pnpm/action-setup@v4
        with:
          version: 10
```

**Surprise-`with:`-block sweep across the other 7 workflows: NONE.** Every other `actions/checkout@v4`
(`.github/workflows/determinism.yml:19`, `.github/workflows/equivalence.yml:16`,
`.github/workflows/integrity.yml:15`, `.github/workflows/mutation-testing.yml:19`,
`.github/workflows/structure.yml:14`, `.github/workflows/tolerance-budget-check.yml:25`,
`.github/workflows/ts-strict.yml:15`) and every `astral-sh/setup-uv@v6` (6×) is **bare** (no
`with:` block). The preservation set is **exactly the 4 D4 items** — no additional preservation surfaced.

## § 7. Task 0.4 — Tolerance-budget carryover (NO-OP)

(FACT — scope check per D4/Task 0.4.) This sub-phase's scope is CI workflows (Stage 1a) +
testing-improvements (Stage 1b) — **NOT equivalence work**. It does NOT touch
`tools/testkit/equivalence/tolerance.toml` or `tolerance-budget.toml`. Per dispatch Task 0.4:
**NO-OP — no carryover artifact committed.** (The `tolerance-budget.toml` `[phase]` field currently
reads `"sub-phase-mpm-multimaterial-stack-d"` / `opened_at = "2026-05-24T12:16:58Z"`; it is
intentionally NOT bumped — the per-sim/cross-stack `[phase]` carryover is an equivalence-scope
discipline that does not apply to this CI+testing-infra sub-phase. Recorded for the chain;
unchanged.) Stage-0 tolerance discipline performed; no commit.

## § 8. Task 0.5 — Testing-improvements scope-bound at HEAD (D6)

(FACT — `grep` of `pyproject.toml`/test dirs at HEAD.)

- **(a) `pytest-timeout` — ABSENT at HEAD.** No `pytest-timeout` / `pytest_timeout` entry in any
  `pyproject.toml`/`*.toml`/`*.cfg`. **Clean starting state.** Stage 1b adds it to
  `tools/testkit/pyproject.toml` dev deps + wires a tiered per-test timeout (conventions § J.3
  mechanism 2; R-T1 — verify the existing testkit suite stays GREEN under the plugin; the advisory
  MPM `mls_mpm.py` mutation re-attempt is non-blocking).
- **(b) Manifest-equality test — NONE exists per § J.7.** There is **no public `build_manifest()`**
  in any sim package. Manifests are assembled **inline** via `CaptureManifest(...)` inside the
  `sim_runner_*` functions (e.g. `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py:498`).
  The lone factored builder is **physarum's private `_build_manifest(descriptor=…, …)`**, used in
  `packages/physarum/tests/test_diagnostics.py:53` to construct a **fixture** (parametrized
  descriptor) — NOT a full-dict manifest-EQUALITY assert per § J.7.
  - **Scope estimate for Stage 1b (informational):** the § J.7 + charter § 3-item-3 acceptance is
    "at least one representative sim" → **minimum 1 new test file**. The manifest-builder kill-rate
    floor (§ J.7) is a project-wide property, so the test could extend to all 9 phase-1 sims
    (**up to ~9 test files**). A nuance for Stage 1b/operator: since no public `build_manifest()`
    exists, Stage 1b must either (i) assert on the manifest the `sim_runner_*` emits (additive;
    no sim-source edit), or (ii) factor out a public builder first (a sealed-package refactor).
    Option (i) is the lighter, additive-only path and aligns with the "representative subset" lean.

## § 9. Task 0.6 — LBM `sim_runner_diagnostic` co-location verdict

(FACT — `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py:472` + `:498`.) The LBM
`sim_runner_diagnostic(seed, out_dir)` builds its manifest **inline** with the hardcoded descriptor
`"poiseuille-16x8-seed42-step50"` (the cosmetic defect). **Verdict: STAY-BANKED (co-location does
NOT arise naturally).** Rationale: the Stage-1b manifest-equality test is **additive** (a new test
file asserting on the runner's emitted manifest) and does **NOT** require editing LBM's `sim.py`.
The cosmetic descriptor-interpolation fix WOULD require editing the **sealed Phase-1**
`lattice-boltzmann-d3q19` package — an additional sealed-package edit, not a natural fold. Per D6
("STAY-BANKED unless co-located opportunistically without additional sealed-package edit"), the
condition for folding is not met. (Contrast the MPM-side close, which fixed the cosmetic on the
**clean Stack-D contract**, not a sealed Phase-1 package.) If Stage 1b were to choose LBM as the
representative sim AND factor out its inline builder (option (ii) above), the operator could then
opt to fold the cosmetic fix — but that is a Stage-1b/operator call, not a Stage-0 pre-commitment.
**Default STAY-BANKED stands.**

## § 10. Banked items / observations

- **Dispatch citation slip (non-load-bearing):** Stage-0 dispatch Task 0.0 / SECTION 2 cite
  conventions "§ F" for the canonical replay procedure; § F is the **determinism convention**. The
  replay procedure is **§ D.5** (`replay_prior_phase` tool conventions) + § D.3 (the invariant).
  Proceeded with § D.5; no impact on the result. Recorded for audit-chain accuracy.
- **Reading-list discrepancy (non-load-bearing):** Stage-0 dispatch SECTION 2 references a
  `docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-sha-back-fill-*.md` precedent file;
  **it does NOT exist** — the audit-chain-correctness Stage-0 SHA back-fill was **commit-only**
  (`chore(audit-chain-correctness-stage0-sha-backfill)`; no dedicated ledger file). This sub-phase
  FOLLOWS ITS OWN DISPATCH (SECTION 5 COMMIT N+1) and DOES create a `stage-0-sha-back-fill-<UTC>.md`
  ledger (mirroring this sub-phase's plan-drafting back-fill ledger), an enhancement over the
  commit-only precedent. Proceeded with what is present (the `stage-0-checkpoint-*.md` template).
- **`build_manifest()` non-existence (Stage-1b scope nuance):** see § 8(b). § J.7's literal
  "invoke `<sim>.sim.build_manifest()`" does not map uniformly — no public builder exists; physarum
  has a private `_build_manifest`, the other 8 build inline. Surfaced for Stage-1b design.
- **`uv run` CWD requirement for `replay_prior_phase` (Stage-1 reuse):** the module imports only
  from the `tools/integrity` package context; pass `--audit` as an absolute path (the § D.5
  repo-relative form fails from that CWD). Recorded so future replays don't re-discover it.
- **New banked precedent APPLIED:** all workflow citations in this checkpoint use the full
  `.github/workflows/<file>:<line>` form (no bare-filename / `word:number` shorthand) — the Cat-4
  hook discipline produced at this sub-phase's plan-drafting.

## § 11. Verdict + Stage 1a readiness

**Verdict: CONFIRMED.** All 8 tasks (0.0–0.7) PASS; bit-identity invariant HELD (24th+ invocation);
HEAD un-drifted (`f202a57`); D4 preservation set 4/4 verified verbatim with no surprises; tolerance
NO-OP; testing-improvements scope bounded; LBM co-location STAYS BANKED. **0 new Stage-0 shifts.**

**Stage 1a readiness:** READY. The touch-set is the 9 workflows (§ 4); the bump targets are the
latest-node24 majors **re-fetched fresh at Stage-1a edit time** (D3; § 5 INFORMATIONAL only); the
4 preservation items (§ 6) must survive byte-for-byte (R-CI); `actionlint` (or a documented manual
YAML-validity + `uses:` re-grep) is the verifier (R-CI3 — confirm `actionlint` invocability at
Stage 1a). **Stage 1b readiness:** pytest-timeout starting state clean; manifest-equality test is a
new-file additive deliverable (representative subset; § 8). No blockers.

**Cumulative shift count at Stage 0 close: 150 + 0 = 150** entering Stage 1a.

---

This checkpoint lands at HEAD `<COMMIT_N_SHA_PENDING>` (back-filled per Convention #12 + § B.2 + N1
enumeration in a separate `chore(ci-action-migration-and-banked-cleanup-stage0-sha-backfill)`
commit; full 40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED** (all 8 tasks PASS; bit-identity invariant HELD; not BLOCKED; Hard Rule 2 not
triggered).

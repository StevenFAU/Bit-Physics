# Probe report — sub-phase-phase-2-cleanup (plan-drafting)

- **Probe author:** plan-drafting agent (Claude Code)
- **Probe date (UTC):** 2026-05-27
- **Repo HEAD at probe:** `e1fc154ba026e8079740b86e7b0f8ffdb8e8f15b` (`e1fc154`)
- **Sub-phase tag present:** `v0.2.1-sub-phase-lfs-architecture` → `8f4dea3` (FACT — `git tag -l` → present; `git ls-remote --tags origin` → on origin)
- **Convention #8 posture:** every concrete claim below is grep-/command-/file-verified against
  repo HEAD. Claims drawn from a published audit cite the audit path + section; claims drawn from
  live state (GitHub API, integrity output, pytest) cite the command.

---

## Preamble — preconditions + one deviation

### Preconditions (5 PASS / 1 DEVIATION — see § 0.1)

| # | Precondition | Result | Evidence |
|---|---|---|---|
| 1 | HEAD resolves to `v0.2.1-sub-phase-lfs-architecture` or successor | **PASS** | `git log -1` → `e1fc154`; `git describe --tags` → `v0.2.1-sub-phase-lfs-architecture-2-ge1fc154` (2 commits past the tag) |
| 2 | `v0.2.1-sub-phase-lfs-architecture` tag present on origin | **PASS** | `git ls-remote --tags origin` → `8f4dea3069fbd8f2a1adef0ab75147123dc3f144 refs/tags/v0.2.1-sub-phase-lfs-architecture^{}` |
| 3 | integrity 0 HARD_FAIL; baseline `c19492ad…d22cb52` held | **PASS** | `.venv/bin/python -m integrity --all --mode strict` → `summary: 0 HARD_FAIL, 14 SOFT_WARN`; sha256 of full report (stderr, per [[integrity-baseline-digest-method]]) = `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (exact baseline match) |
| 4 | verify_evidence on lfs Stage-2 sub-phase-landing | **PASS** | `.venv/bin/python -m integrity.scripts.verify_evidence --audit docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md` → `summary: 24 pass / 0 fail` |
| 5 | `pytest tools/testkit/lfs_migration/`: 16 passed | **DEVIATION → 15 passed / 1 failed** | see § 0.1 |
| 6 | post-reset CI green-check observed | **UNKNOWN-1 (carried forward)** | today is 2026-05-27, **before** the May 31/June 1 LFS-quota reset; the green-check cannot have happened yet. Latest CI run on `e1fc154`: `cpp-strict` + `python-strict` **failure** (expected pre-reset LFS-bandwidth state, § 13 item 15 / known item 3); all 7 other workflows green (`gh run list`) |

CLI note (FACT — same discrepancy the lfs probe self-recorded): the integrity CLI flag is `--all`
(with `--mode strict`), **not** `--check-all` as the dispatch brief wrote. `python` is not on PATH
in this environment; the workspace interpreter is `.venv/bin/python` (per [[bit-physics-uv-sync-prunes-venv]]).

### § 0.1 — Precondition-5 deviation analysis (the headline finding)

**FACT.** `pytest tools/testkit/lfs_migration/` → **15 passed, 1 failed**. The single failure is
`tools/testkit/lfs_migration/test_i7_no_agent_tags.py::test_no_tag_points_into_subphase_range`:

```
AssertionError: tag(s) in sub-phase range (I7 forbids agent tags): ['v0.2.1-sub-phase-lfs-architecture']
```

**Root cause (FACT).** The test (`tools/testkit/lfs_migration/test_i7_no_agent_tags.py:29-34`)
asserts that `git tag --contains v0.2.0-phase-2` lists *only* the phase tag — i.e. **no tag of any
kind** points into the sub-phase range. It was written at lfs Stage 1a under the docstring premise
"This sub-phase pushes no tag" (`tools/testkit/lfs_migration/test_i7_no_agent_tags.py:5`). By
sub-phase close the operator **legitimately** pushed `v0.2.1-sub-phase-lfs-architecture` → `8f4dea3`
(which preconditions 1 & 2 *require* to exist). The tag carries **no `-phase-N` segment**.

**Why this is NOT a substantive I7 failure (FACT).** I7 = "phase tags are operator-only; an
agent-pushed tag is a HARD_FAIL" (`tools/testkit/lfs_migration/test_i7_no_agent_tags.py:3-5`; spec
§ 7.12). The lfs Stage-2 landing audit explicitly reasons the tag satisfies I7:
`docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md:451-454`
— "The tag carries no `-phase-N` segment, so I7 / spec § 7.12 are satisfied — it is a point-release
handle, not a phase boundary." Conventions § D.2
(`docs/conventions/sub-phase-conventions.md:249`) confirms an optional non-phase point-release tag
is "a banked operator decision per sub-phase" — i.e. **permitted**. No *agent* pushed any tag.

**Disposition.** This is a **dispatch-internal contradiction** (preconditions 1+2 require the tag;
precondition 5's test fails *because* of it), not a regression and not a substantive invariant
breach. The test's "no tag in range" proxy is **over-strict** relative to the invariant it claims
to guard. Plan-drafting is pure enumeration/documentation with zero execution risk, and the failing
test is **itself a cleanup item** (PD-1, § P3) tightly coupled to known item 5 (§ D.2 amendment). A
hard STOP would suppress the very catalog that should carry this finding. Therefore: **PROCEED**,
fold the test fix into the basket (Cluster D), carry the deviation as **UNKNOWN-2** for Stage 0, and
lower the plan-drafting verdict to **SHIFTED-with-notes** per the dispatch's stated option ("SHIFTED
-with-notes if anything surfaces that needs charter amendment"). Operator may override to a hard STOP.

---

## § P1 — Phase 2 § 13 inventory enumeration

**Source (FACT).** The consolidated banked-for-cleanup inventory is
`docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md` § 9 (the section is titled "§ 13"), lines
316–363 — **41 distinct items**, deduplicated across all 17 terminal Phase-2 audits. The operator's
"~41" estimate is **exact** (no discrepancy; no STOP). Below, "src" = that landing audit § 9 item N.
Cluster assignment is in § P4. "State" flags items already RESOLVED upstream (verify-and-close) vs
OPEN.

| # | Item (abbrev) | src | Kind | Eff | State | Cluster |
|---|---|---|---|---|---|---|
| 1 | LBM/MPM `sim_runner_diagnostic` seed-prop / cosmetic-descriptor defect (D6/D7); MPM-side closed-not-a-defect, LBM-side cosmetic | §9.1 | code (cosmetic) | S | OPEN (LBM cosmetic) | C |
| 2 | IC-15 / spec-template formalization (#1 chaotic FORMALIZED; #3 atomic-scatter + #5 iterative-solver un-stress-tested) | §9.2 | methodology doc | M | PARTIAL | G |
| 3 | Cross-stack verification methodology full-consolidation | §9.3 | methodology doc | M | OPEN | G |
| 4 | § B.6 verify_evidence LFS-content-OID remediation | §9.4 | tooling | — | RESOLVED (IC-16) | F |
| 5 | § B.6 empty-file-rejection drift mode (Mode 3) | §9.5 | convention doc | S | OPEN | B |
| 6 | § B.6 LFS Mode-1/Mode-3 informational drift modes | §9.6 | convention doc | S | OPEN | B |
| 7 | Portfolio-wide capture `.json` phantom-sha audit | §9.7 | tooling | — | RESOLVED (audit-chain-correctness) | F |
| 8 | Mid-Phase-1 capture regeneration | §9.8 | captures (large) | L | OPEN | **OUT** (§ P3.X) |
| 9 | Testing-improvements sub-phase (pytest-timeout + manifest-builder LANDED; Cat-3 evaluator shims + mutmut characterization remain) | §9.9 | test/tooling | M | PARTIAL | G / OUT |
| 10 | `actionlint` not installed | §9.10 | tooling/env | S | OPEN | C |
| 11 | `check-yaml` pre-commit hook skips `.github/workflows/` | §9.11 | pre-commit config | S | OPEN | C |
| 12 | Supply-chain immutable-pin migration for 3 actions (checkout/setup-node/pnpm) | §9.12 | workflow | S | OPEN | C |
| 13 | Stack-D taichi `SyntaxWarning` filterwarnings gap (S-2.1) | §9.13 | code/config | S | OPEN | C |
| 14 | action-version web-fetch must distinguish latest-released vs usable-pinning-form | §9.14 | methodology doc | S | OPEN | C |
| 15 | LFS-architecture sub-phase (D13; remote-CI red on LFS-bandwidth) | §9.15 | sub-phase | — | LANDED (`v0.2.1-…`) | F |
| 16 | manifest-equality smoke test (D7) | §9.16 | test addition | S | OPEN | C |
| 17 | mypy `--strict` Warp partial-stub errors | §9.17 | code/typing | M | OPEN | C |
| 18 | Phase-1-canonical re-characterization / D17 2D-reference | §9.18 | methodology doc | M | OPEN | G |
| 19 | `uv sync --all-packages --all-extras` dev-extras-prune nuance (scipy/mutmut/pytest-timeout) | §9.19 | env-provisioning doc | S | OPEN | B |
| 20 | Missing/split `[Unreleased]` CHANGELOG entries (smoke-d / common-warp-bootstrap / mpm-e) + split-location reorg | §9.20 | doc | M | OPEN | E |
| 21 | Methodology § 6 header / section-title staleness | §9.21 | methodology doc | S | OPEN | B |
| 22 | Conventions § L.7 / § L.8 subsection-title attribution staleness | §9.22 | convention doc | S | OPEN | B |
| 23 | Conventions § M cumulative-shift inventory staleness (records 65; actual 242) | §9.23 | convention doc | M | OPEN | B |
| 24 | Stray untracked taylor-green captures + untracked `.claude/` (gitignore-or-remove) | §9.24 | repo hygiene | S | OPEN (present at HEAD) | E |
| 25 | Cat-3 evaluator shims / sibling subdirs | §9.25 | tooling | S | OPEN | E / OUT |
| 26 | B-CPPB2 — charter § 4 `project-state.md` mention vs no-such-file | §9.26 | doc | S | OPEN | E |
| 27 | `common/common-cpp/tests/sha256_util.hpp` shim (removable once 1a audits historical) | §9.27 | code (test) | S | OPEN (deferral-gated) | E |
| 28 | R-CPPB2 / Q-CPP5 — CI Mesa/LLVM-pin + exact-digest assertion scoping for `cpp-strict.yml` | §9.28 | workflow | M | OPEN | C |
| 29 | D16 — `assert_deterministic_float_controls()` f32-scoped; extend to f64 levers (Q-CPP2) | §9.29 | code | M | OPEN | G / OUT |
| 30 | S2-RD2C1 — per-port gate-12 perf-ledger row should be a Stage-1b acceptance check | §9.30 | template/doc | S | OPEN | B |
| 31 | S1c-RD2C1 — C++ gate-14 "un-skip" is a cross-language ctest (§ L.5 doc candidate) | §9.31 | convention doc | S | OPEN | B |
| 32 | S0-LBME1 — coordinator dispatch-hygiene drift (stale anchor shas; § L.5 S1c-1 precedent) | §9.32 | convention doc | S | OPEN | B |
| 33 | Integrity baseline-digest derivation not documented in a convention | §9.33 | convention doc | S | OPEN | B |
| 34 | LFS rule for `tests/fixtures/legacy-captures/` | §9.34 | config | — | RESOLVED (LbmD `.gitattributes`) | F |
| 35 | Coordinator scope-extrapolation drift (§ L.5 S1c-1 sibling) | §9.35 | convention doc | S | OPEN | B |
| 36 | Multi-material MPM extension (single-material scope, S1a-ME2) | §9.36 | feature impl | L | OPEN | **OUT** (§ P3.X) |
| 37 | Phase-1 open items B2–B6/B11/B16; B-hotfix-1/2; DFSPH generator coverage | §9.37 | impl backlog | L | OPEN | **OUT** (§ P3.X) |
| 38 | `_make_taichi_diffuse` / hello-physics smoke kernel exemplars | §9.38 | code/doc | S | OPEN | E |
| 39 | Stage-0 R-P1 task-scope expansion for cross-stack ports | §9.39 | methodology doc | S | OPEN | G |
| 40 | MPM `mls_mpm.py` mutation completion | §9.40 | test/mutation | M | OPEN | **OUT** (§ P3.X) / G |
| 41 | Optional non-phase point-release tag decisions (lean: NO tag throughout) | §9.41 | governance | S | OPEN | D |

**New-at-Stage-9 banked observations** (`docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:365-370`):
S9-PHASE2-1/2/3 + S-P2AR1/S-P2AR2 — candidates for methodology § 6.x / conventions § L.x
formalization. Folded into Cluster G (methodology). Not counted in the 41.

---

## § P2 — Operator-enumerated known-pre-queued items

The dispatch's 7 known items, continuing the numbering (K-prefix). K-1 **is** the § P1 set (the 41);
the others are net-new beyond § 13.

| # | Item | Source citation | Kind | Eff | Cluster | D-class |
|---|---|---|---|---|---|---|
| K-1 | Phase 2 § 13 inventory (= the 41 above) | `docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:316-363` | — | — | A–G | — |
| K-2 | § 2.13 golden-table planning-doc drift (`code_verification/golden` → `tools/testkit/golden/`); **19 occurrences** | `docs/phases/phase-1-plan.md` (9), `docs/phases/phase-3-plan.md` (7), `docs/phases/phase-2-cross-stack-replication.md` (3); origin commit `51e0ee1` | doc citation fix | M | A | D1 |
| K-3 | Post-reset CI green-check verification (cpp-strict + python-strict go green after quota reset) | `docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md` (D4 fallback); live `gh run list` | observe + document | S | C | — (UNKNOWN-1) |
| K-4 | M0 mutation re-tier operator action (drop `mutation-testing` from required checks) — **no-op** | `docs/ops/branch-protection.md:77-81`; live `gh api …/branches/main/protection` → 404 not protected | close as no-op | S | D | (D2) |
| K-5 | § D.2 sub-phase-conventions amendment (when an intermediate tag IS appropriate) | `docs/conventions/sub-phase-conventions.md:245-249` | convention amend | S | B/D | D3 |
| K-6 | Branch-protection live-vs-spec drift (entire `branch-protection.md` describes rules NOT configured live) | `docs/ops/branch-protection.md` (whole); live `gh api …/branches/main/protection` → 404; `…/tags/protection` → 404 | implement-OR-amend | M | D | D2 |
| K-7a | Synthesis item 5 — Stripe-Minions-style agent-boundary CODEOWNERS with agent-id sentinels | dispatch; no `CODEOWNERS` file exists (`ls CODEOWNERS .github/CODEOWNERS` → none) | net-new scaffolding | M | G | D4 |
| K-7b | Synthesis item 6 — ADR alignment of CONFIRMED/SHIFTED/REFUTED/DEFERRED to Nygard ADR states | dispatch; verdict vocab at `docs/architecture.md:1442,1476`; no ADR dir exists | doc cross-ref / scaffold | M | G | D5 |
| K-7c | Synthesis item 8 — differential-testing terminology for matched-pair gates (cross-reference, NOT mechanical rename) | dispatch; terminology in `docs/planning/bit-physics-master-catalog.md`; gate-14 "shape (a) bit-exact" in `docs/conventions/sub-phase-conventions.md:766-790` | doc cross-ref | S | G | D6 |

---

## § P3 — Probe-discovered items (PD-prefix)

Probed across the dispatch's UNKNOWNS categories. Only grep-verified findings below.

| # | Item | Evidence | Kind | Eff | Cluster | Note |
|---|---|---|---|---|---|---|
| PD-1 | `test_i7_no_agent_tags.py` over-strict: forbids ANY tag in sub-phase range, but I7 forbids only *agent* tags; now red after operator's legal non-phase tag | `tools/testkit/lfs_migration/test_i7_no_agent_tags.py:29-34`; § 0.1 above | test fix | S | D | couples to K-5 |
| PD-2 | Package READMEs use bare `python3 -m pytest` / `python -m pytest` (CI uses `uv run`); 11 files | `packages/*/README.md` (boids-3d, eulerian-smoke, eulerian-smoke-stack-e, reaction-diffusion-3d, lattice-boltzmann-d3q19, physarum, sph-water, mpm-multimaterial, lattice-boltzmann-d3q19-stack-e, mandelbulb-explorer, strange-attractors) | doc consistency | S | A | low priority; cosmetic |
| PD-3 | conventions § L stops at L.9; B-LFS1 ("verify_evidence offline-OID property — worth a § L.10 entry at landing") NOT formalized | `docs/conventions/sub-phase-conventions.md:924` (L.9 last); `docs/phases/sub-phase-lfs-architecture.md:657-658` (B-LFS1) | convention doc | S | B | OPTIONAL — lfs landing § 5 (`…sub-phase-landing-2026-05-27T18-38-40Z.md:55`) judged "no further charter amendment required" |
| PD-4 | conventions lettered-section order is L → P → M → N → O (§ P inserted out of order) | `docs/conventions/sub-phase-conventions.md` (§ L @602, § P @1020, § M @1060, § N @1158, § O @1225) | doc hygiene | S | B | cosmetic; touches one file |

**Probed-and-cleared (NOT items):**
- `docs/common/numba.md` **exists** (`ls` → present); a sub-probe's "missing" flag was a false positive — discarded.
- `tools/testkit/solution_verification/` is an **intentional** deferred-to-Phase-1+ scaffold (its README states so) — not dead tooling; leave as-is.
- `tools/testkit/probes/` is **live** (this very probe report lands there) — not dead.
- `tools/integrity/integrity/cat3_numerical/evaluators/cubic_spline.py` is a **live** registered shim — not dead.
- TODO comments at `tools/integrity/integrity/cat2_contracts/__init__.py:14,16` are forward-scoped Phase-1 placeholders (still-live), not aged-out.
- `mutation-testing.yml` triggers (`schedule` weekly + `workflow_dispatch` + path-filtered push) **match** catalog § 41.4 T4 and `docs/architecture.md` § 2.13 — no workflow-tier drift (the re-tier sibling chain `cd21148…5a5e18b` already landed it).

### § P3.X — Items NOT for cleanup (candidate sibling sub-phases / forward-routes)

These surfaced as sub-phase-sized in their own right. Surfaced for operator routing; **not absorbed**.

| # | Item | Why too big for cleanup | Routing lean |
|---|---|---|---|
| § 13 #36 | Multi-material MPM extension | Real feature implementation; new physics + new invariants; single-material is current scope (S1a-ME2) | Sibling sub-phase or Phase 3+ |
| § 13 #37 | Phase-1 open items B2–B6/B11/B16 + DFSPH generator coverage | Multi-item Phase-1 implementation backlog; real code + tests; not hygiene | Dedicated Phase-1-backlog sub-phase |
| § 13 #8 | Mid-Phase-1 capture regeneration | Large; regenerating canonical captures risks touching published-audit-anchored hashes (append-only risk, § P7) | Sibling sub-phase with append-only protocol |
| § 13 #40 | MPM `mls_mpm.py` mutation completion | Mutation-test authoring; pairs with § 13 #9's residual (mutmut characterization) → a **testing-improvements** sub-phase | Testing-improvements sub-phase |
| § 13 #9 (residual) | Cat-3 evaluator shims + mutmut characterization | Same testing-improvements bucket as #40 | Testing-improvements sub-phase |
| § 13 #29 (borderline) | D16 f32→f64 float-controls extension | Real code change to `assert_deterministic_float_controls()` + Q-CPP2; small but design-bearing | Operator routes: cleanup Cluster G *or* sibling |

---

## § P4 — Clustering

Seven clusters (A–G). Cluster F is verify-and-close (near-zero work). Each cluster maps to one
execution stage (Stage 1.A … 1.G).

- **Cluster A — Citation & path drift** (Stage 1.A). Items: K-2 (§ 2.13 golden-path, 19 occ),
  PD-2 (README `python3`). Files: `docs/phases/phase-1-plan.md`, `docs/phases/phase-2-cross-stack-replication.md`,
  `docs/phases/phase-3-plan.md` (D1-gated), `packages/*/README.md`. **D-class: D1** (phase-3-plan inclusion).
- **Cluster B — Conventions / methodology doc reconciliation** (Stage 1.B). Items: § 13 #5, #6,
  #19, #21, #22, #23, #30, #31, #32, #33, #35; PD-3, PD-4; K-5 (§ D.2 wording). Files:
  `docs/conventions/sub-phase-conventions.md`, `docs/methodology/*`. **D-class: D3** (§ D.2 wording).
- **Cluster C — CI / workflow / supply-chain hygiene** (Stage 1.C). Items: § 13 #1 (LBM cosmetic),
  #10, #11, #12, #13, #14, #16, #17, #28; K-3 (post-reset green-check). Files: `.github/workflows/*`,
  `.pre-commit-config.yaml`, tooling. **No D-class** (UNKNOWN-1 verification only).
- **Cluster D — Branch-protection & tag governance** (Stage 1.D). Items: K-6 (branch-protection
  drift), K-4 (M0 no-op close), PD-1 (I7 test), § 13 #41 (point-release tag decisions). Files:
  `docs/ops/branch-protection.md`, `tools/testkit/lfs_migration/test_i7_no_agent_tags.py`. **D-class: D2.**
- **Cluster E — Working-tree & doc-truth hygiene** (Stage 1.E). Items: § 13 #20 (CHANGELOG), #24
  (untracked captures + `.claude/`), #26 (project-state.md mention), #27 (sha256_util.hpp), #38
  (taichi exemplars). Files: `.gitignore`, `CHANGELOG.md`, `captures/`, charter docs, `common/common-cpp/tests/`.
  **No hard D-class** (but #24/#27 disposition choices noted).
- **Cluster F — Verify-and-close (already-resolved § 13 items)** (Stage 1.F). Items: § 13 #4, #7,
  #15, #34, and #9-partial-landed. Near-zero work: verify upstream resolution holds at HEAD, record
  closure. **No D-class.**
- **Cluster G — Methodology / synthesis-report dispositions** (Stage 1.G). Items: K-7a (CODEOWNERS),
  K-7b (ADR alignment), K-7c (differential-testing terminology), § 13 #2, #3, #18, #39; S9-PHASE2-1/2/3,
  S-P2AR1/2 formalization. Files: `docs/architecture.md`, `docs/methodology/*`, `docs/conventions/*`,
  new `CODEOWNERS` (D4), new ADR dir (D5). **D-class: D4, D5, D6.**

---

## § P5 — Cluster ordering and inter-cluster dependencies

```
            (D-class routings ratified at Stage 0)
                          │
        ┌─────────┬───────┼───────┬─────────┬─────────┐
        ▼         ▼       ▼        ▼         ▼         ▼
      1.F       1.C     1.E      1.A       1.B ◄──── 1.D
   (close)   (CI/wf)  (tree)  (cite/D1)  (conv) │  (branch/tag)
                                                 │     │
                                          K-5 (§ D.2 wording) ──┘
                                          PD-1 (I7 test) couples to K-5
```

- **No hard ordering** among 1.A / 1.C / 1.E / 1.F — independent file sets; any order.
- **Soft dependency 1.D → 1.B:** the § D.2 wording amendment (K-5, lands in 1.B) and the I7-test
  fix (PD-1, lands in 1.D) are two faces of the same finding. **Lean: do 1.D first** (fix the test +
  document the branch-protection/tag reality), then 1.B encodes the ratified § D.2 wording. Either
  order works if the agent cross-references; sequence avoids a second touch of § D.2.
- **1.G last:** it carries the heaviest D-class load (D4/D5/D6) and the most "defer-OUT-or-do"
  borderlines; running it last lets the lighter clusters bank momentum and surfaces any scope-creep
  before the landing.
- **Stage 0 precedes all**; **Stage 2 (landing) follows all.**

---

## § P6 — D-class decisions surfaced (detail in charter § 5)

| D | Question | Default lean | Decision-by |
|---|---|---|---|
| D1 | § 2.13 golden-path: fix executed plans (phase-1, phase-2) only? also unexecuted `phase-3-plan.md`? or leave phase-3 for its own plan-drafting re-anchor? | Fix executed plans now; **leave `phase-3-plan.md` for Phase-3 plan-drafting** (prior routing, Convention M re-anchor at dispatch) | Stage 0 / Stage 1.A |
| D2 | Branch-protection live-vs-spec (404, nothing configured): implement live rules to match spec, OR amend spec to match live? | Doc's own rule says "synced GitHub state wins" (`docs/ops/branch-protection.md:99-102`) → **amend doc**; BUT security posture argues operator should **apply** force-push/deletion protection. Operator routes (agent can only do the doc edit). M0 closes as no-op either way | Stage 0 |
| D3 | § D.2 amendment wording — conditions under which an intermediate non-phase tag IS appropriate | Agent drafts: "lean NO, **except** infra sub-phases adding external dependencies (e.g. R2/LFS) where a point-release handle aids rollback/citation; precedent `v0.2.1-sub-phase-lfs-architecture`." Operator ratifies wording | Stage 0 → Stage 1.B/1.D |
| D4 | CODEOWNERS agent-id sentinel granularity (per-package / per-sim / per-stack)? | **Per-package** (matches the 23-member workspace + `packages/*` boundary); sentinels as comment markers, not enforced reviewers (no live branch protection — D2) | Stage 0 → Stage 1.G |
| D5 | ADR alignment — introduce an ADR directory now, or defer scaffolding? | **Defer the directory**; do a doc **cross-reference** mapping the four-state verdicts ↔ Nygard states in `docs/architecture.md`/conventions. Standing up an ADR corpus is sibling-sized | Stage 0 → Stage 1.G |
| D6 | Differential-testing terminology — cross-reference in docs only, or rename test files/classes? | **Cross-reference only** (dispatch says "cross-reference, don't rename mechanically"); add a glossary note linking "matched-pair gate" ↔ "differential testing" | Stage 0 → Stage 1.G |

---

## § P7 — Risk register

- **R-1 (published-audit append-only).** Several items reference published audits (the § 13 source
  audit itself; § L.5 precedents; CHANGELOG split-location). Cleanup must **never** retroactively
  edit a published `docs/_audits/**` file. § 13 #8 (capture regeneration) and #20 (CHANGELOG reorg)
  are the closest to this line — #8 is routed OUT (§ P3.X); #20 touches `CHANGELOG.md` (not an audit)
  so is safe. **Any stage that finds it must edit a published audit → STOP.**
- **R-2 (unexecuted phase plans).** `phase-3-plan.md` is unexecuted; prior routing = its own
  plan-drafting re-anchors at Phase-3 dispatch. Cleanup does **not** touch it without D1 routing.
- **R-3 (oversized items).** § P3.X items must not be absorbed. If a Cluster-G item (esp. #29 f64
  controls, #2/#3 methodology consolidation) grows code-bearing, STOP and route.
- **R-4 (citation re-anchoring at scale).** K-2 is 19 occurrences across ≥2 files. Discipline: **one
  commit per cluster**, not one per occurrence; re-anchor against HEAD (Convention M) before edit.
- **R-5 (integrity baseline + cat1/cat4).** This probe report lands under `tools/testkit/probes/`
  (cat1.intra-repo full-path scan, per [[cat1-scans-probes-evidence-hashes-mapping]]); the charter +
  audits land under `docs/` (cat4 draft-time). Run `integrity --all` + `verify_evidence` before each
  commit. Baseline `c19492ad…d22cb52` must hold (regress → STOP).
- **R-6 (CI red is expected pre-reset).** `cpp-strict`/`python-strict` red until the May 31/Jun 1
  quota reset (UNKNOWN-1). A green Cluster-C "verification" must not be claimed before the reset; do
  not mistake the pre-reset red for a cleanup regression.

---

## § P8 — Summary counts

- **§ P1 (Phase 2 § 13):** 41 items (operator "~41" = exact). Of these: 4 RESOLVED (verify-and-close:
  #4, #7, #15, #34), ~5 routed OUT (#8, #36, #37, #40, #9-residual; #29 borderline), the rest OPEN.
- **§ P2 (known-pre-queued net-new beyond § 13):** 8 (K-2…K-6, K-7a/b/c).
- **§ P3 (probe-discovered net-new):** 4 (PD-1…PD-4).
- **Total distinct cleanup items:** 41 + 8 + 4 = **53** (with ~6 routed OUT to § P3.X).
- **Clusters:** 7 (A–G).
- **D-class decisions:** 6 (D1–D6).
- **UNKNOWNs for Stage 0:** UNKNOWN-1 (post-reset CI green-check), UNKNOWN-2 (precondition-5 I7-test
  deviation disposition — operator confirms PROCEED vs hard-STOP).
- **Hard Rule 2 STOPs encountered:** none (precondition-5 deviation analyzed → PROCEED; see § 0.1).
- **Verdict:** plan-drafting **SHIFTED-with-notes** (precondition-5 deviation + UNKNOWN-2).

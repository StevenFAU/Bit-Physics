---
date: 2026-06-10
author: post-close-housekeeping-agent
phase: 5
artifact: post-close-housekeeping
artifact_id: post-close-housekeeping-and-pages-launch
verdict: CONFIRMED
verdict-state: CONFIRMED
head_sha: 48ea1297e1f06ec07b9b7eae9efddca85537d6e1
prior_phase_tag: v0.5.0-phase-5
integrity_invariant: "0 HARD_FAIL / 17 SOFT_WARN (new explained baseline — § 6)"
parent_audits:
  - "[[phase-5-close-2026-06-10T12-38-41Z]]"
---

# Post-close housekeeping + GitHub Pages launch (operator-ratified Stage 2)

> Two-stage operator dispatch following the v0.5.0-phase-5 tag push: Stage 1
> was a read-only full-project health sweep (every stack's test surface run,
> not recalled — Convention #8); Stage 2 (this audit) executes the
> operator-ratified cleanup list and launches GitHub Pages. FACT =
> read/ran/measured this session. The ledger under docs/_audits/ was touched
> by NO auto-fixer and NO edit — this file is itself an append to the ledger.

## § 1 — Stage-1 sweep: what was verified green (condensed; full report in the session record)

| Surface | Result |
|---|---|
| Tags | 11/11 present, monotonic ancestors of main, local == remote byte-for-byte; v0.5.0-phase-5 == 922a850 — FACT |
| Python | 1348 passed / 3 failed / 2 skipped across 41 suites (the 3 = governance locks, § 3); goldens 7/7; tier-2 diagnostics 86/86 — FACT |
| TS/web | common-ts ts-strict mirror green; 7/7 frontends npm ci + tsc + vite build; node --check 12/12; 14 WGSL structurally sound; web-deploy smoke 9/9 — FACT |
| C++ (lavapipe) | clean configure, zero-warning build, ctest 10/10 — FACT |
| Browser-WebGPU spot-check (RADV, snap Chromium, end-to-end validate) | physarum PASS (run_twice=True, mass rel 1.7e-07); neural-ca PASS bit-exact 0.0 — post-close reality matches the close audit's RADV claims; contingency bounds correctly dormant on the canonical backend — FACT |
| Integrity at sweep time | 0 HARD_FAIL / 16 SOFT_WARN — exact documented baseline — FACT |
| verify_evidence phase-5 | exactly the known 7 by-construction failures (close § 7), nothing new — FACT |
| Append-only invariant | verified across the FULL tag chain v0.0.0→HEAD over all four _audits trees (beyond the CI gate's scope): all hops byte-prefix-clean EXCEPT the two historical violations in § 5.1 — FACT |
| LFS | fsck OK; 82/82 pointers resolve locally (69 unique OIDs); no prunable orphans; R2 creds absent locally (expected; CI proofs green 2026-05-27/28) — FACT |
| CI at HEAD | all 10 recently-triggered workflows green (922a850 / ab9f372); mutation baseline green 2026-06-08, thresholds per mutmut-config.toml (full campaign NOT re-run locally — CI + committed kill-rate JSONs are the evidence) — FACT |

## § 2 — Cleanup executed (operator-ratified in full; separate commits per category)

| Commit | Category | Content |
|---|---|---|
| 254dcb9 | A | testkit governance registries: v0.5.0-phase-5 → OPERATOR_PHASE_TAGS; 05dbd24a0866 → _CITATION_EXEMPT_SHAS; NEW _SUBJECT_FALSE_POSITIVE_SHAS with 760b0e06bcb5 (§ 4); capture requirements declared for the five Phase-5 workflows (4× reference-capture + preprint-extraction none) |
| 3f09ce2 | A | 27 ruff I001 mechanical fixes across the SEVEN Phase-2 stack-d/e ports (Stage-1 said six; rd2d-stack-d was masked in truncated hook output) + NEW python-strict `lint-phase-2-ports` matrix job closing the CI lint blind spot; all seven suites re-run green (110 passed / 2 skipped) |
| a9633c0 | A | pre-commit: docs/_audits/ excluded from trailing-whitespace + end-of-file-fixer (the sweep caught the fixers mutating two back-test verbatim evidence captures; both restored byte-identical before any commit). `pre-commit run --all-files` now clean at HEAD |
| 4a6dfce | B | deletions: dead packages/neural-ca/typescript/src/index.ts (+ spec-ref.md pointer notes; web build re-verified green); docs/phase4/_audits/.gitkeep; the two untracked npm lockfiles (+ .gitignore guard). Gitignored debris removed by targeted rm (~4.3 GB: build/pypi-validate, build/cpp, build/sweep-cpp, build/results, node_modules ×10, dist, caches) — NEVER `git clean -fdX`; .venv kept |
| eba567c | C | docs reconciliation: README status (was "Phase 0 in progress") + common-web; CHANGELOG restructured into per-tag sections v0.0.0-phase-0→v0.5.0-phase-5 (sections moved verbatim; stale mid-campaign "4/7" Phase-5 entry superseded by the honest 7/7 close summary); architecture § 11.6 all-pipelines delivered + § 11.7 ownership-table refresh; phase-6 charter NEW § 2.6 routed-deferrals backlog; CITATION.cff 0.5.0-phase-5; status banners (web-build-track LANDED, phase-5-productization "5.1 BLOCKED" superseded note, phase-3-plan D-LAYOUT note); master catalog superseded-baseline banner ONLY (ruling: no line edits) |
| 48ea129 | Pages | § 7 |

Post-cleanup test surface: tools/testkit 401 passed (was 398/3 — `just test`
green again); lfs_migration 17/17; web-deploy smoke 9/9; pre-commit
--all-files clean. — FACT (run this session)

## § 3 — Why `just test` was red at HEAD (none numeric)

Three lfs_migration governance locks doing exactly their job, invisible to CI
(no workflow runs the full testkit suite; these tests need full git
history/tags that CI checkouts don't fetch): (1) the operator-pushed
v0.5.0-phase-5 tag awaited its post-tag allowlist-add (v0.4.0 precedent);
(2) back-fill commit 05dbd24a0866 lacks the literal Convention #12 citation
(immutable history; SHA-keyed exemption ratified); (3) the five Phase-5
workflows lacked capture-requirement declarations (the registry lock caught
their addition, as designed).

## § 4 — DISCOVERED-DURING-EXECUTION (beyond the ratified wording; surfaced, not silent)

Exempting 05dbd24a0866 unmasked a SECOND subject-matcher hit behind it (the
i6 assert stops at the first offender): **760b0e06bcb5**
"feat(phase-5-reconciliation): five-boolean §13 backfill + measured tolerance
rows". Its subject word "backfill" names a spec-CONTENT backfill (R2:
prose→YAML in seven spec-ref.md files) and it touches
tools/testkit/equivalence/tolerance.toml (R3 measured rows) — it is NOT a
Convention-#12 SHA back-fill, so the citation-exemption route (which still
enforces doc-only) cannot apply. Disposition: NEW SHA-keyed
`_SUBJECT_FALSE_POSITIVE_SHAS` allowlist (same no-loophole shape as the
citation exemptions: full-40-hex key, >120-char documented reason, asserted
disjoint from _CITATION_EXEMPT_SHAS). Full enumeration of all 97
backfill-subject commits in range confirmed these two are the ONLY
non-citing entries. — FACT (enumerated this session)

## § 5 — DOCUMENTED-NOT-TOUCHED inventory (operator ruling: record, never edit)

### 5.1 Two historical append-only violations (full-chain check, beyond the CI gate's scope)

1. `docs/_audits/phase-0/progress.md` [hop v0.0.0-phase-0 → v0.1.0-phase-1]:
   trailing CONTINUE_FROM line REPLACED by a phase-0-closed ledger line + a
   structural note (file superseded by ledger.md + cue per spec amendment).
   Pre-dates gate enforcement.
2. `docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md`
   [hop v0.2.1 → v0.2.2]: Convention-#12 SHA back-fill performed as IN-PLACE
   replacement of `<...-SHA-PENDING>` placeholder tokens — the one back-fill
   in the chain that is not a pure append. It landed green because the
   then-current audit-append-only gate's `\.ledger\.md$` filter matched zero
   files (a no-op acknowledged in the workflow's own B-1 comment, since
   fixed).

Both are self-documented in-file, immutable history (unfixable without a
forbidden rewrite), and hereby carried as known exceptions to the otherwise
fully-verified invariant. Extending the CI gate to full-chain + all
`_audits` trees is routed to the Phase-6 charter § 2.6 (operator ruling).

### 5.2 verify_evidence stragglers, phases 0–4 (the phase-5 close scoped only the 14 phase-5 audits)

70 failing entries across 29 audits, all by-construction in character; most
were already inventoried (back-test D10 classes F-D10-1/2/3; phase-4 B-4).
Never-before-listed (now recorded): phase-0 blocks 2–4 empty-`__init__.py`
evidence entries (×5); phase-1 stage-1-blocked-replay dangling .txt paths
(×2); phase-3 rigid-body probe (7d52ce1, 2 dangling) + preflight-drift
(2da281a, self-citation-before-commit); phase-4 wu-c-probe front-matter
head_sha c618e6f3 resolving to no object (never-pushed sandbox commit;
informational probe); phase-4 batch-3-close (×3) + phase-4 landing (×3)
`at-head` sentinel entries (the sentinel is unsupported by verify_evidence —
they fail by construction forever).

### 5.3 PERMANENT evidence limitation (named): phase-1 rebased-away head_shas

The phase-1 eulerian-smoke **landing** (54043e12) and **stage-0** (dcef17d2)
audits carry head_shas that exist in NO fresh clone (rebased away; the
back-test's PASS verdicts of 2026-05-30 relied on loose objects local to the
back-test machine). verify_evidence results for these two audits are
therefore machine-local and NOT reproducible from clone — a permanent
limitation of the evidence trail, unfixable without history rewrite.
Recorded here as the durable home of that fact.

### 5.4 Close-audit § 5.2 count CORRECTION (appended note; the close audit is never edited)

`phase-5-close-2026-06-10T12-38-41Z.md` § 5.2 says "the **7** CUDA-bound
§ 11.5 frontier rows". The AUTHORITATIVE phase-4 landing
(`docs/_audits/phase-4/landing-2026-06-01T01-44-34Z.md` § 4, Home 1) ratifies
**Phase-4-CUDA = 10 sims** (ledger rows 15/16/17/18/22/31/32/33/34/35). The
close audit's "7" echoes the mid-phase-state § 4.1 hard-CUDA subgroup, not
the ratified deferral home. Per operator ruling this correction lives HERE as
an append-only note citing the landing as authoritative; architecture § 11.7
and the phase-6 charter § 2.6 carry the corrected count.

## § 6 — Integrity baseline: 16 → 17 SOFT_WARN (new explained baseline)

`integrity --all` after the cleanup: **0 HARD_FAIL / 17 SOFT_WARN**. The +1
vs the close baseline is `web-build-track-charter-2026-06-09T02-39-17Z.md`'s
`evidence_paths` entry for `packages/neural-ca/typescript/src/index.ts`,
which ratified deletion D-3 removed from HEAD. The charter audit is
append-only (not editable); the file remains verifiable at the charter's own
head_sha. Disposition mirrors the close's absorbed-cat5 precedent: ABSORBED,
named here; 17 is the documented baseline going forward. — FACT (run this
session)

## § 7 — GitHub Pages launch (step 9–10)

- **Mechanism** (commit 48ea129): the web-deploy `deploy` job — GATED OFF all
  phase — is un-gated to **operator-controlled `workflow_dispatch` only**
  (`confirm_deploy=true`; push-trigger deploys are a deliberate later
  decision). Go-live pins resolved to verified tag SHAs
  (upload-pages-artifact v3.0.1 = 56afc609, deploy-pages v4.0.5 = d6db9016).
  The job assembles `site/` = static landing page at the root + `sims/<sim>/`
  per validated bundle **from the same run's build-and-validate artifacts**
  (capture artifacts downloaded but never published; a missing bundle hard-
  fails the assemble step). Sims build with Vite base `./` → subdirectory-safe
  under the project-Pages path.
- **Landing page**
  (`tools/productization/web-deploy/web/pages/index.html`): minimal
  house-style instrument panel (IBM Plex Mono, dark palette, cyan-teal
  accent) — verification-posture paragraph, the 7 sim cards each naming the
  gate its bundle was re-verified through, Downloads section linking the
  GitHub **Releases** page (binaries are never copied into Pages; NONE are
  published yet — the binary-release pipeline is validated but its
  release-publishing dispatch remains a separate operator action), repo +
  close-audit + ledger links. Designed for replacement by the full
  interactive site.
- **EXPLICIT STATEMENT (per dispatch):** the deploy publishes
  already-validated bundles ONLY. The 13-gate / validate semantics are
  untouched; this launch adds NO new verification claims.
- **Deploy evidence:** the dispatch requires a GitHub write token, absent in
  this environment by design (I7-adjacent posture: the operator fires
  deploys). Repo Settings → Pages → Source must be "GitHub Actions" before
  the first run. Run ID, conclusion, and live-URL fetch results are APPENDED
  below after the operator dispatches (append-only-legal, Convention #12
  pattern).

## § 8 — Closing

Housekeeping executed exactly as ratified (one discovered-during-execution
item, § 4, surfaced and disposed in kind); every category re-verified by
running its surface; the ledger untouched except by append; Pages launch
artifact-complete and awaiting the operator's dispatch click. The portfolio's
verification core was and remains green — everything this sweep changed was
governance registries, debris, and prose that had fallen behind the landed
reality.

appended_by: post-close-housekeeping-agent
audit_commit_sha: 7dc2039  # Convention #12 back-fill

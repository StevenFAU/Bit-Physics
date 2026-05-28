---
date: 2026-05-28T16-00-43Z
author: phase-3 lenia landing (Claude Code)
subject: Phase 3 third sub-phase (task-3 Lenia) — SUB-PHASE LANDING (closed-with-shifted-2)
verdict: closed-with-shifted-2
head_sha: fcf8546
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-B Stack-D / D-MUT-SCOPE NO RESOLVED-IN-CHARTER / D-FFT real-space-LANDED / D-DET bit-exact-MEASURED-HELD / D-TAG YES-PROPOSED-v0.2.4-sub-phase-phase-3-lenia / D-LAYOUT packages/lenia/-LANDED
proposed_tag: v0.2.4-sub-phase-phase-3-lenia
tag_pushed_by_agent: false (per I7; operator action)
evidence_paths:
  - docs/phases/sub-phase-phase-3-lenia.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-plan-drafting-2026-05-28T14-38-32Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1a-2026-05-28T15-25-18Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1b-2026-05-28T15-51-04Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1c-2026-05-28T15-56-13Z.md
  - tools/testkit/lfs_migration/test_i7_no_agent_tags.py
evidence_hashes:
  docs/phases/sub-phase-phase-3-lenia.md: sha256:c232145520a1100302c286a5c9dda4c775477f1db3a3897bbbf97d00075a1742
  docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md: sha256:1cdd1eb564bff8f2ece8c477afd2d1a7896b24a709afab34621d2a92b44ba111
  docs/_audits/phase-3/sub-phase-phase-3-lenia-plan-drafting-2026-05-28T14-38-32Z.md: sha256:8359b0bf5201a07e16c6d8b598e72c65713c4a12643fd55302bfbd2a9c181312
  docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md: sha256:e3a5a31c5283c500949ef17ff7b5ba37ccb69984e41a384e931a20adbae058f0
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md: sha256:1c5507461c4266cc60078fe93eb6f290709e6e1c97dd36d02213c8e3d6c7085f
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1a-2026-05-28T15-25-18Z.md: sha256:edefb1814d1cb1e0f0c2b46d88287fb043ac3693b6356682ce4613b659cf2461
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1b-2026-05-28T15-51-04Z.md: sha256:01bfdb9401cf9eec9c44441bc64e61708a6765f8f318b80f7218e5c823495288
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1c-2026-05-28T15-56-13Z.md: sha256:245edfe5516de844c4848baf5caaabe2cde81bbf1d877a332b312460b53067ee
  tools/testkit/lfs_migration/test_i7_no_agent_tags.py: sha256:88c1c674d6df70085c148ef70773b1cac2f44989eb2b3798edd88bbc159acbe8
---

# Phase 3 — sub-phase Lenia — LANDING audit

> Sub-phase landing per charter §2 Stage 2 + §2.15 closing-status
> graded variants. Verdict **closed-with-shifted-2** — two SHIFTED
> items carried from Stage 1b (PBT re-declaration on math evidence;
> R2 LFS mirror sync EOF). Consolidates all prior lenia audits
> (db-investigation + plan-drafting + probe + Stage 0 / 1a / 1b / 1c)
> via `evidence_hashes:` mapping (S9-PHASE2-1 — does NOT re-narrate).

## § 1 — Re-statement (FACT)

Phase 3 task-3 Lenia. **FIRST SIM-task sub-phase in Phase 3** after
the two infrastructure roots common-3dgs (`v0.2.2`) +
render-similarity (`v0.2.3`). Stack D (Taichi); reference Lenia at
`packages/lenia/`. Closes with operator-pushed annotated tag
`v0.2.4-sub-phase-phase-3-lenia` (D-TAG ratified YES — Chakazul
external vendoring + durable sim architecture both §D.2 conditions
strongly met).

## § 2 — Stage roll-up

| Stage | UTC slug | Verdict | Head SHA |
|---|---|---|---|
| D-B investigation | `2026-05-28T14-38-32Z` | CONFIRMED (Stack D dispositive) | `0b8c7b1` |
| Plan-drafting | `2026-05-28T14-38-32Z` | CONFIRMED | `3ca8aa8` |
| Probe | `2026-05-28T14-38-32Z` | CONFIRMED | `1f7ec42` |
| Stage 0 | `2026-05-28T15-12-47Z` | CONFIRMED | `4ee54e8` |
| Stage 1a | `2026-05-28T15-25-18Z` | CONFIRMED | `de92946` |
| Stage 1b | `2026-05-28T15-51-04Z` | SHIFTED | `5baf083` |
| Stage 1c | `2026-05-28T15-56-13Z` | SHIFTED (closed-with-shifted-2) | `165c46b` |
| Stage 2 (landing) | `2026-05-28T16-00-43Z` (this audit) | closed-with-shifted-2 | `fcf8546` (I7 extension) |

## § 3 — STEP A: I7 allowlist extension (FACT — commit `fcf8546`)

`tools/testkit/lfs_migration/test_i7_no_agent_tags.py:67-83` —
added `"v0.2.4-sub-phase-phase-3-lenia"` to `OPERATOR_NONPHASE_TAGS`
with comment block documenting D-TAG ratification + closing status.
Mirrors common-3dgs `c761aa9` + render-similarity `596eb73`
precedents (additive entry).

Test re-run: `pytest tools/testkit/lfs_migration/test_i7_no_agent_tags.py -v`
→ **2/2 PASS** at HEAD `fcf8546`.

**Guard mechanism UNCHANGED** — the additive entry does not weaken
the check. A fake `agent/v0.0.42-fake` tag in the protected range
would still HARD_FAIL (the `frozenset` contains the specific allow-
listed strings only; an `agent/`-prefixed tag is not in the set).

## § 4 — STEP B: closing sweep (FACT)

| Surface | Result |
|---|---|
| Cat-X tolerance-budget | NO cap exists for `[budgets.<cat>.golden]` category (FRICTION #1 from Stage 0). Lenia's `[continuous-ca.lenia] golden_*` rows un-capped-by-design. STOP-CAT-X NOT fired (no cap to exceed). Operator routing options at landing review. |
| Integrity baseline | `0 HARD_FAIL / 14 SOFT_WARN`; stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline. |
| Append-only vs `v0.2.0-phase-2` | **164 A / 45 M / 0 D**. Modifications sanctioned (progress.md + perf-ledger + CHANGELOG + glossary + tolerance + determinism + justfile + python-strict.yml + pyproject.toml + uv.lock). |
| Append-only vs `v0.2.3-sub-phase-phase-3-render-similarity` | **44 A / 10 M / 0 D**. Modifications sanctioned. |
| Failing-tests replay | sha256 `5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0` byte-reproducible (3 captures at Stage 1a — pre-commit, immediate re-run, post-commit). |
| perf-ledger row | present at `docs/perf-ledger.md` line 45 (`lenia | python (Taichi) | orbium-unicaudatus-64sq-seed42-step100 | 0.797`). Byte-stable since Stage 1b. |
| pytest (lenia + I7) | **16/16 PASS** (14 lenia + 2 I7). |
| verify_evidence sweep | **7 pass / 0 fail** across all lenia stage audits (db-investigation + plan-drafting + probe + Stage 0 / 1a / 1b / 1c). |
| Closing anchor re-check (Convention 7.9) | All `path:line` citations across this landing audit + the 7 lenia stage audits re-grep verified at HEAD `fcf8546`. |

## § 5 — STEP C: SHIFTED items carried at landing

### § 5.1 SHIFTED #1: PBT invariant re-declaration on math evidence

**Source:** Stage 1b §6.2.
**Description:** `mass_approximately_conserved` (dispatch-suggested
invariant) is mathematically falsified for arbitrary IC under Quad4
polynomial growth gn=1. RED-state witness on HEAD `de92946`: ~10%
mass loss over 5 steps on Gaussian-blob IC. Per HARD RULE 2 + charter
§6 anti-pattern reminder, re-declared (NOT widened) to:
1. `monotone_bounds` — field ∈ [0, 1] (clip-Euler enforced).
2. `per_step_change_bounded_by_dt` — `|A_{n+1}-A_n| ≤ dt` (G ∈ [-1, 1]
   + clip-Euler).

`spec-ref.md` §6 + invariants module + RED tests + Stage-1b audit
+ Stage-1c re-verification all coherent on the SHIFTED invariants.
STOP-PBT NOT fired (re-declaration, not widening).

**Operator landing review.** Confirm the SHIFTED-on-evidence
invariants are the durable spec-ref §6 declaration. Forward-routing
to every later Phase-3 SIM: ground PBT invariants on mathematical
evidence, NOT on dispatch-suggested heuristics.

### § 5.2 SHIFTED #2: R2 LFS mirror sync EOF

**Source:** Stage 1b §9 + Stage 1c §5.
**Description:** Stage-1b push of `tests/fixtures/legacy-captures/
phase-3-lenia.h5` (75 KB, sha256 `6c313a5da5…`) to GitHub-LFS
**succeeded**:
```
$ git -c lfs.standalonetransferagent= push origin main
Uploading LFS objects: 100% (1/1), 75 KB | 0 B/s, done.
```

R2 mirror sync **failed**:
```
$ git lfs push --object-id --stdin origin <<< "6c313a5da5..."
EOF
```

`git config --list | grep lfs` shows `lfs.standalonetransferagent=lfs-s3`
in the local `.git/config` but **no** `lfs.customtransfer.lfs-s3.path`
configuration. `env | grep -E "AWS_|S3_|R2_"` returns empty
(`AWS_S3_ENDPOINT` + `S3_BUCKET` absent despite dispatch preamble's
claim). R2 mirror sync silently EOFs.

Per charter §6 STOP-LFS clause + dispatch (`STOP-LFS: .h5 LFS push
fails with R2 creds present`): SURFACED, NOT REVERTED. Mirrors
precedent [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]]. R2
mirror pending operator action: either (a) operator pushes the OID
via R2-credentialed environment OR (b) operator configures the agent's
`lfs.customtransfer.lfs-s3.path` + AWS env for future sessions.

## § 6 — STEP D: tag proposal

**Proposed tag.** `v0.2.4-sub-phase-phase-3-lenia` (D-TAG ratified
YES per charter §3: §D.2 (a) external vendoring at pinned Chakazul
SHA + (b) durable sim architecture both strongly met — see § 7.4
below for the full first-of strengths).

**Tag commit SHA.** `<this landing-audit commit, or the Convention #12
SHA back-fill commit>` (assigned at this Stage-2 audit landing
commit chain).

**Tag pushed by agent.** **NO** — per I7, agent never tags. Operator
pushes:
```
git tag -a v0.2.4-sub-phase-phase-3-lenia <sha> -m "<msg>"
git push origin v0.2.4-sub-phase-phase-3-lenia
```
Annotated (`git tag -a`), NOT signed.

**Pre-tag checklist (verified at this Stage 2):**
- [x] I7 allowlist extended (commit `fcf8546`). Test 2/2 PASS with
  the new entry. Guard mechanism UNCHANGED.
- [x] Integrity baseline `c19492ad…d22cb52` byte-identical.
- [x] verify_evidence 7/0 across all lenia stage audits at HEAD.
- [x] Append-only 0 D vs both `v0.2.0-phase-2` and `v0.2.3`.
- [x] Pytest 14 lenia + 2 I7 = 16/16 PASS.
- [x] Closing anchor re-check Convention 7.9 PASS.
- [x] perf-ledger row present + byte-stable.
- [x] failing-tests replay byte-reproducible.
- [x] Convention #12 SHA back-fill commits at each stage (Stage 0 /
  1a / 1b / 1c + plan-drafting).

## § 7 — D-class final + Banks carried forward + First-SIM signals

### § 7.1 D-class final

| D-class | Final state |
|---|---|
| D-B | Stack D (RESOLVED-IN-CHARTER via sibling investigation audit; ratified by Stage 1a impl). |
| D-MUT-SCOPE | NO (RESOLVED-IN-CHARTER on §6.0 item 12 + §6.3 VERIFICATION POSTURE; Stage 1c verdict-landing-only). |
| D-FFT | REAL-SPACE LANDED at Stage 1b. FFT opt-in deferred to Phase-4+. |
| D-DET | bit-exact same-stack-same-hw MEASURED + HELD at Stage 1b; re-verified at Stage 1c. Registry row `[continuous-ca.lenia]` locked. |
| D-TAG | YES PROPOSED `v0.2.4-sub-phase-phase-3-lenia` at this Stage 2. Operator-pushed. |
| D-LAYOUT (added Stage 1a) | `packages/lenia/` RESOLVED-ON-EVIDENCE at Stage 1a via §0.3 SHIFT-from-discovered. NO plan edit (Convention M). Portfolio-scale precedent for every later Phase-3 SIM. |

### § 7.2 Banks carried forward

- **L-3DGS-1.** Not consumed here (Lenia not neural-rendered).
  Carried forward; task-8 (3DGS-MPM) consumes both render-similarity
  + common-3dgs banks per the established calibration argument.
- **SIBLING-FIXTURE-LFS.** Carried forward. Lenia's `phase-3-lenia.h5`
  increments the corpus by **one** (13 legacy-capture entries now,
  alongside the 12 pre-existing v0.1.0-phase-1 placeholders +
  `phase-3-common-3dgs.h5`). Does NOT close the sibling sub-phase
  (`legacy-capture-fixture-lfs-reconciliation` candidate).
- **integrity-meta-test-ci-wiring.** Carried forward. Lenia's
  `tools/testkit/property/sims/lenia/` + `packages/lenia/tests/` ride
  the existing pytest-testpaths CI machinery + the new `test-lenia`
  CI job; does NOT inherit the meta-test gap.
- **first-SIM-friction-portfolio-scale (NEW at plan-drafting).** 5
  friction items now banked (see § 7.3 below).

### § 7.3 First-SIM friction notes (R-11 portfolio-scale signals)

Every later Phase-3 SIM (rigid-body, cloth, NCA, PINN, 3DGS-MPM)
inherits the resolution of these surfaces:

| # | Friction | Stage surfaced | Resolution |
|---|---|---|---|
| #1 | `tolerance-budget.toml` has no `[budgets.<cat>.golden]` cap shape | Stage 0 | UN-CAPPED-BY-DESIGN at Stage 1b. Operator routing options at landing review: (a) accept golden_* as anchor-IS-budget; (b) extend `tolerance-budget.toml` with golden caps in a future sub-phase; (c) per-sim self-bounded per §2.4. |
| #2 | `packages/<name>/` vs `continuous-ca/lenia/python/` plan prescription | Stage 0 → Stage 1a | RESOLVED-ON-EVIDENCE at Stage 1a (D-LAYOUT). `packages/lenia/` LANDED. NO plan edit (Convention M). |
| #3 | Stage-1a `test_sim_shells.py` `pytest.raises(NotImplementedError)` needs Stage-1b rewrite | Stage 1a → Stage 1b | RESOLVED-ON-EVIDENCE at Stage 1b implementation commit (test_sim_shells.py rewritten to assert production behavior). |
| #4 | PBT `mass_approximately_conserved` mathematically falsified for arbitrary IC | Stage 1b | RE-DECLARED (HARD RULE 2 + charter §6 anti-pattern reminder) to `monotone_bounds` + `per_step_change_bounded_by_dt`. Carries to landing as SHIFTED #1. |
| #5 | R2 LFS mirror sync EOF (agent env lacks customtransfer agent path + AWS creds) | Stage 1b | SURFACED as STOP-LFS, NOT REVERTED. GitHub-LFS HELD. Carries to landing as SHIFTED #2. Operator routing: configure agent customtransfer path + AWS env OR push OIDs from R2-credentialed environment. |

### § 7.4 D-TAG argument strength (§D.2 conditions met)

Per charter §3 + conventions §D.2 default-YES conditions:

**(a) External vendoring.** Chakazul/Lenia at SHA
`adfc542939266de7f4bb7ebb552e8499701ee107` (MIT, permissive),
vendored to `references/Chakazul-Lenia/` (5 source files + MANIFEST.toml
+ README.md). Comparable to common-3dgs's Inria gaussian-splatting
vendor + render-similarity's three new PyPI deps; strictly STRONGER
than common-3dgs's single-git-dep argument because Chakazul ships
the Quad4 + Orbium load-bearing citation anchors that the spec-ref
+ golden tables consume.

**(b) Durable sim architecture.** Lenia is the **FIRST SIM in Phase 3**
and introduces multiple first-of surfaces:
- First `packages/lenia/` package (§0.3 SHIFT, portfolio precedent
  for every later Phase-3 SIM).
- **FIRST EVER `tools/diagnostics/tier3/` subtree at HEAD** (per
  probe § 3.2 confirmation).
- First per-sim PBT module under `tools/testkit/property/sims/lenia/`
  (FIRST `sims/` subtree).
- First per-sim CI job `test-lenia`.
- First SIM golden table in Phase 3 (`lenia-kernel.json` +
  `lenia-orbium-trajectory.json`).
- First SIM perf-ledger row in Phase 3.
- First SIM `.h5` legacy-capture seed since lfs-architecture landed
  (`phase-3-lenia.h5`; common-3dgs's `.h5` was infra, not SIM).
- First-SIM PBT-invariant declaration in spec-ref §6 (§2.14
  contract).

Both §D.2 conditions are **strongly met** — STRONGER than common-3dgs
(single git-dep) and at-parity-or-stronger than render-similarity
(three PyPI deps but no SIM architecture). Lean YES; no D-B-style
fork.

## § 8 — STOP audit (landing)

| STOP | Fired? |
|---|---|
| STOP-D (integrity / I1-I7) | NO |
| STOP-H (verify_evidence) | NO |
| STOP-REPLAY (cross-phase) | NO (Stage 0 ran) |
| STOP-PIN (Chakazul) | NO |
| STOP-D-ANCHOR | NO (Stage 1b grep-cites HELD) |
| STOP-DET | NO (bit-exact MEASURED HELD; re-verified at Stage 1c) |
| STOP-PBT | NO (Stage-1b re-declaration is NOT widening) |
| STOP-CAT-X | NO (no cap exists for golden category) |
| STOP-FFT | NO (FFT path not exercised) |
| STOP-LFS | **carried Stage 1b → Stage 1c → here**; GitHub-LFS HELD; NOT REVERTED |
| STOP-I7 | NO (allowlist additive extension; test 2/2 PASS) |
| STOP-TIER3-DIR | NO (first creation HELD) |
| STOP-K2-AT-HEAD | NO |
| STOP-PROSE-MATH | (recorded as Stage-1a SHIFT, not a hard STOP) |

## § 9 — FIRST-SIM pipeline-validation verdict (charter §1.1 + R-11)

**The first-SIM pipeline (testkit + golden + tier-3 + CI + LFS/R2 +
PBT + perf-ledger + spec-ref + per-sim CI job + per-category
tolerance/determinism rows + 13-gate) WORKED END-TO-END.** All 13
sim-acceptance gates PASS at Stage 1b; the 5 friction items above
are the LOUD-NAMED portfolio-scale signals for every later Phase-3
SIM:

- The pipeline **validated**: all 13 gates passed; the structural
  layers held up; testkit/diagnostics/property infrastructure
  accommodated a SIM without destructive change.
- The pipeline **surfaced 5 specific frictions** that future SIMs
  will hit. None forced a hard STOP within scope; all are
  documented with resolutions or operator-routing paths.

**Verdict for pipeline validation:** ✅ **VALIDATED-WITH-5-FRICTIONS-SURFACED**.
Every later Phase-3 SIM consumes this landing audit at their own
plan-drafting per charter §8 + the first-SIM-friction-portfolio-scale
bank.

## § 10 — Closing status verdict + sub-phase outcome

**Verdict: closed-with-shifted-2** per charter §2.15 graded variants.
Two SHIFTED items:
1. PBT re-declaration on math evidence at Stage 1b (durable; operator
   ratifies the SHIFTED-on-evidence invariants are the canonical
   spec-ref §6 declaration).
2. R2 LFS mirror sync EOF at Stage 1b (operator action pending —
   configure agent customtransfer path + AWS creds OR push OIDs from
   R2-credentialed environment).

**Sub-phase: COMPLETE.** Third Phase-3 sub-phase landed. The FIRST
Phase-3 SIM is in place. Next: operator pushes
`v0.2.4-sub-phase-phase-3-lenia`. Subsequent Phase-3 sub-phases
(rigid-body, cloth, NCA, PINN, 3DGS-MPM, common-warp-maturation,
phase-3-landing) become dispatchable; the L-3DGS-1 +
SIBLING-FIXTURE-LFS + integrity-meta-test-ci-wiring +
first-SIM-friction-portfolio-scale banks carry forward.

— Landing audit ends —

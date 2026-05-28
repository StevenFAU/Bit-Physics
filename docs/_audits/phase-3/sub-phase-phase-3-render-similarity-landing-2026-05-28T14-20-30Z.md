---
date: 2026-05-28T14-20-30Z
author: phase-3 render-similarity landing (Claude Code)
subject: Phase 3 render-similarity — sub-phase landing audit
verdict: closed-with-shifted-1
head_sha: 28037b118357c571dd54e827885b3f0844fa1495
closing_status: closed-with-shifted-1
shifted_items:
  - Stage-1c mutation kill-rate 0.7857 vs 0.85 floor; threshold UNCHANGED; equivalent-mutant catalogue documented; banks calibration evidence into L-3DGS-1 (consumed at task-8 dispatch)
prior_sub_phase_tag: v0.2.2-sub-phase-phase-3-common-3dgs
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
mutation_kill_rate: 0.7857
mutation_threshold: 0.85  # UNCHANGED (STOP-I anti-pattern not exercised)
proposed_tag: v0.2.3-sub-phase-phase-3-render-similarity
tag_pushed: NO  # operator action required per I7 (charter § 3 D-TAG ratified YES)
banked_lessons:
  - L-3DGS-1 (consumed; calibration evidence input alongside common-3dgs 0.7610)
  - No new banks introduced by this stage
evidence_hashes:
  docs/phases/sub-phase-phase-3-render-similarity.md: sha256:3610dc3810fd33e93c92b4c2ec9d213a757bc903cbdf5218cef2fa36bb1f2591
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md: sha256:0017b85879b09d6c19efac208f34fdf179083d5d92571f6af59a2afaec3bbce4
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md: sha256:0f4eb0ccc4cab121de6f1213ba2431e8fa26ba3dcaf6bb70afeb663370526fdd
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md: sha256:9ae5528a0cd0bd478878cbd54a562bdbe056d99fd74a71075ff74f52944c4ddb
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md: sha256:a9bb0913de2741133985e3d6815ceb8c019286e5959e43a1d4eaad38b9abc099
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md: sha256:19634d004e72b8768e22a1caa01ed1df5604a07efcafda8900f5441bc5564351
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md: sha256:a724e927ae1be0129eb2bcf40398b6b7c53deb712192d34868ee74996b55ca9d
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1c-2026-05-28T14-14-36Z.md: sha256:5d0d9a6fd9ee9660a3487666b7e8b27b9524d25567ed75bdc524602e9d355211
  tools/testkit/lfs_migration/test_i7_no_agent_tags.py: sha256:1e543ee6d8ad64cf0d2440f1a310fc98c5426202087a08ef9aae653ffd24a7eb
  tools/testkit/mutation/mutmut-config.toml: sha256:c63f6dca96341f46f801fcdb63be792f72c6a822aef072a7854b6c6a6dbaca3c
  tools/testkit/mutation/sub-phase-phase-3-render-similarity-2026-05-28T14-01-50Z.json: sha256:f1c711c6b673fa2e858b21be12c4fbfbb264d9b39a5c02f6d290db81be3efbe1
  tools/testkit/render_similarity/metrics.py: sha256:2af642265446df0456b01d86370d6dfc9d5644b2db873c8989549a055da828a4
  tools/testkit/failing-tests-evidence/render-similarity-2026-05-28T12-54-18Z.txt: sha256:88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6
evidence_paths:
  - docs/phases/sub-phase-phase-3-render-similarity.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1c-2026-05-28T14-14-36Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-landing-2026-05-28T14-20-30Z.md
  - docs/_audits/phase-3/progress.md
  - tools/testkit/lfs_migration/test_i7_no_agent_tags.py
  - tools/testkit/mutation/mutmut-config.toml
  - tools/testkit/mutation/sub-phase-phase-3-render-similarity-2026-05-28T14-01-50Z.json
  - tools/testkit/render_similarity/metrics.py
  - tools/testkit/failing-tests-evidence/render-similarity-2026-05-28T12-54-18Z.txt
d_class_final:
  - D-LOC RESOLVED-IN-CHARTER → `tools/testkit/render_similarity/` package
  - D-WEIGHTS LANDED → lazy runtime-fetch + CI actions/cache + R-3 bundled-weight sha256 (alex/vgg pinned)
  - D-DET LANDED → bit-exact / same-stack-same-hw MEASURED across psnr/ssim/lpips-alex/lpips-vgg
  - D-ANCHOR LANDED → 3 anchors (PSNR hand-derivation, SSIM Wang 2004 + reflexivity, LPIPS self-consistency + Zhang 2018 monotonicity)
  - D-HARNESS-CLI LANDED → equivalence/__main__.py + --mode flag (lean (a) ratified)
  - D-SCHEMA LANDED → additive top-level `render_similarity` key in tolerance-schema.json (lean ratified)
  - D-TAG LANDED → `v0.2.3-sub-phase-phase-3-render-similarity` proposed (operator-pushed; I7 allowlist extended at commit 596eb73)
---

# Phase 3 render-similarity — sub-phase landing audit — closed-with-shifted-1

> **Closing status:** `closed-with-shifted-1` per `docs/phases/phase-3-plan.md`
> §2.15. The single SHIFTED item is the Stage-1c mutation 0.7857 vs 0.85 floor
> (threshold UNCHANGED; equivalent-mutant catalogue documented; banks
> calibration evidence into L-3DGS-1, consumed at task-8 dispatch).
> **Sub-phase: COMPLETE.** Integrity baseline byte-identical; I1–I7 hold; all
> 7 D-class items finalized; tag `v0.2.3-sub-phase-phase-3-render-similarity`
> proposed for operator push (I7 — agent does NOT tag); I7 allowlist
> extension landed at commit `596eb73`. No STOP fired this stage.

> **Template lineage (S9-PHASE2-1/2/3 — inherited from `docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md` via common-3dgs landing).**
> 1. S9-PHASE2-1: consolidates stage audits already on `main` via `evidence_hashes:` mapping; does NOT re-narrate them.
> 2. S9-PHASE2-2: supernumerary-tolerant reconciliation — additive well-documented outcomes (e.g. `ms_ssim` Phase-4-WU-C shell, deferred-to-Stage-1a D-HARNESS-CLI/D-SCHEMA decisions banked as ratified) are sanctioned; no strict 1:1 deliverable↔plan-item match required.
> 3. S9-PHASE2-3: no fictional anchors — does NOT reference `docs/project-state.md` (never existed) or `integrity.scripts.check_append_only` (never built); append-only verified via `git diff --name-status v0.2.2-sub-phase-phase-3-common-3dgs HEAD -- docs/_audits/`.

## § 1 — Anchor probe (FACT — landing-time re-check)

| Check | Result |
|---|---|
| HEAD chain since Stage 1c | `f1d7d02` (Stage-1c audit) → `6386033` (back-fill) → `596eb73` (test: extend I7 allowlist for v0.2.3) — Convention M HEAD == `origin/main` after this audit + back-fill |
| Tag `v0.0.0-phase-0` | annotated; commit `727ffb9b513f` ✓ |
| Tag `v0.1.0-phase-1` | annotated; commit `9998bc1897e8` ✓ |
| Tag `v0.2.0-phase-2` | annotated; commit `5832cbce86d2` ✓ |
| Tag `v0.2.1-sub-phase-lfs-architecture` | annotated; commit `0407fa5eb5c2` ✓ |
| Tag `v0.2.2-sub-phase-phase-3-common-3dgs` | annotated; commit `07aa1f5c87ae` ✓ |
| Integrity Cat 1–5 strict sweep | **0 HARD_FAIL / 14 SOFT_WARN**; sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline |
| `pytest tools/testkit/render_similarity/tests/ + tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | **35 passed** in 2.76 s |

### § 1.1 — verify_evidence sweep across all prior render-similarity audits (FACT)

`uv run --no-sync python -m integrity.scripts.verify_evidence --audit <A>`:

| Audit | Result |
|---|---|
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md` | 12 pass / 0 fail @ `872e3084251b` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md` | 16 pass / 0 fail @ `01764a6a462e` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md` | 18 pass / 0 fail @ `75b3d36f4d28` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md` | 28 pass / 0 fail @ `463283aa8415` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md` | 26 pass / 0 fail @ `d06f975c27e4` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md` | 38 pass / 0 fail @ `1b78a150f494` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-1c-2026-05-28T14-14-36Z.md` | 20 pass / 0 fail @ `f1d7d0218359` |

No regression. (S9-PHASE2-3: append-only verified via the `git diff
--name-status` below.)

### § 1.2 — Append-only diff vs `v0.2.0-phase-2` and `v0.2.2-sub-phase-phase-3-common-3dgs` (FACT)

```
git diff --name-status v0.2.0-phase-2 HEAD -- docs/_audits/
# (zero M or D entries on prior-phase audits)

git diff --name-status v0.2.2-sub-phase-phase-3-common-3dgs HEAD -- docs/_audits/
# M  docs/_audits/phase-3/progress.md   ← the sanctioned mutable surface
#                                         (mirrors common-3dgs Stage-2 landing,
#                                         which also showed 0 M/D vs v0.2.0
#                                         and 2 sanctioned Ms vs v0.2.1)
```

No prior `docs/_audits/**` file edited or shortened. `progress.md` is the
sanctioned mutable surface (appended at every stage), per the common-3dgs
Stage-2 landing precedent (S9-PHASE2-3 append-only-via-git-diff).

## § 2 — Stage roll-up (consolidates stage audits; S9-PHASE2-1)

Each stage audit is referenced via `evidence_hashes:` mapping (the front-
matter); not re-narrated here. The consolidation is the cadence
(plan-drafting → Stage 0 → 1a → 1b → 1c → 2).

| Stage | Verdict | Audit | Tip SHA | Notes |
|---|---|---|---|---|
| plan-drafting | CONFIRMED | `sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md` | `872e308` (charter-v2 chain tip) | charter §1.3 D-LOC RESOLVED-IN-CHARTER |
| probe | CONFIRMED | `sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md` | `01764a6` | sibling-of-charter probe |
| fixture-investigation | DECIDED | `sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md` | `75b3d36` | testkit-local placement on-evidence (charter-v2 reaffirm) |
| Stage 0 | CONFIRMED | `sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md` | `463283a` | replay ok=True 8/8; PyPI verify clean |
| Stage 1a | CONFIRMED | `sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md` | `d06f975` | scaffold + RED; D-HARNESS-CLI / D-SCHEMA ratified |
| Stage 1b | CONFIRMED | `sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md` | `1b78a15` | impl + 3 anchors + adversarial + 13-gate; D-DET MEASURED bit-exact |
| Stage 1c | **SHIFTED** | `sub-phase-phase-3-render-similarity-stage-1c-2026-05-28T14-14-36Z.md` | `f1d7d02` | mutation 0.7857; threshold UNCHANGED; equivalent-mutant catalogue; L-3DGS-1 banked |

## § 3 — D-class final disposition (FACT)

Per the charter §5 / Stage-0 amendment block / per-stage resolution:

| D-class | Lean | Resolution | Where landed |
|---|---|---|---|
| D-LOC | `tools/testkit/render_similarity/` package | **RESOLVED-IN-CHARTER** | plan-drafting (charter §5) |
| D-WEIGHTS | lazy runtime-fetch + R-3 sha256 + CI actions/cache | **LANDED** | Stage 1b (`metrics.py` `_assert_bundled_weights_hash` + `.github/workflows/python-strict.yml` actions/cache step) |
| D-DET | bit-exact / same-stack-same-hw, CPU-only LPIPS | **MEASURED HELD** | Stage 1b (`test_determinism.py` — 4/4 metrics bit-exact across two runs); STOP-DET not fired |
| D-ANCHOR | 3 independent-reference anchors | **LANDED** | Stage 1b (`test_anchors.py` — PSNR hand-derivation + SSIM Wang 2004 + LPIPS self-consistency/monotonicity); STOP-D-ANCHOR not fired |
| D-HARNESS-CLI | (a) `equivalence/__main__.py` + `--mode` flag | **RATIFIED-AS-LEAN-LANDED** | Stage 1a (`tools/testkit/equivalence/__main__.py`); STOP-CLI not fired |
| D-SCHEMA | additive top-level `render_similarity` key | **RATIFIED-AS-LEAN-LANDED** | Stage 1a (`tools/testkit/equivalence/tolerance-schema.json`); STOP-SCHEMA not fired |
| D-TAG | YES `v0.2.3-sub-phase-phase-3-render-similarity` | **PROPOSED** (operator-pushed; I7) | Stage 2 (this audit; I7 allowlist extended at `596eb73`) |

## § 4 — Supernumerary outcomes reconciliation (S9-PHASE2-2)

Per S9-PHASE2-2 (supernumerary-tolerant): additive, well-documented outcomes
beyond the §6.2 prompt content are sanctioned. The §6.2 deliverables A–J
(`docs/phases/phase-3-plan.md:1254-1271`) are reconciled below; deliverables
that exceeded the prompt or shifted location are documented as sanctioned
supernumeraries.

| §6.2 deliverable | Landed at | Supernumerary note |
|---|---|---|
| A. `tools/testkit/equivalence/render_similarity.py` per §3.2.2 | `tools/testkit/render_similarity/metrics.py` + `harness_mode.py` + `__init__.py` | **D-LOC charter ratification**: §3.2.2 + v8 locked-item-3 + v4 amendment-4 govern over the §6.2 file-form drift; package form is the most-recent normative statement. Sanctioned supernumerary. |
| B. `tools/testkit/equivalence/harness.py` — new "render-similarity" mode | `tools/testkit/equivalence/__main__.py` (CLI dispatcher with `--mode render-similarity`) + `tools/testkit/render_similarity/harness_mode.py` (runner) | **D-HARNESS-CLI lean (a) ratified**: the existing `compare_captures` programmatic surface stays untouched; the CLI is the new surface. Sanctioned supernumerary (additive, no destructive refactor). |
| C. `tolerance.toml` schema additions | additive `render_similarity` top-level key in `tools/testkit/equivalence/tolerance-schema.json` + explanatory comment in `tolerance.toml`; SCHEMA ONLY (no Phase-3 rows) | **D-SCHEMA lean ratified**. As §6.2 prescribes. |
| D. tests for render_similarity public surface | 5 test files at `tools/testkit/render_similarity/tests/`: `test_metrics_smoke.py` (16 tests), `test_metrics_pbt.py` (3 PBT), `test_anchors.py` (6 anchors), `test_adversarial_coverage.py` (2 meta-test), `test_determinism.py` (4 D-DET) — 33 GREEN (+2 added at Stage-1c tightening for mutmut #41/#72; +4 parametrized rows) | **Sanctioned supernumeraries**: the 13-gate + §2.11 infra-surrogates expand the §6.2 test list (anchors + adversarial + determinism + PBT + Stage-1c tightening). |
| E. `tools/testkit/pyproject.toml` deps pinned | `lpips==0.1.4`, `scikit-image>=0.26`, `torch>=2.0` landed at Stage 1b; mypy override block pre-wired at Stage 1a | As §6.2 prescribes. |
| F. `tools/testkit/equivalence/README.md` "Render-similarity mode" section | NEW file `tools/testkit/equivalence/README.md` covering BOTH `compare_captures` programmatic surface AND `--mode render-similarity` CLI dispatch | Sanctioned supernumerary: `README.md` didn't exist at HEAD, so the addition is net-new (charter §1.1 item 9). |
| G. `docs/testkit/equivalence.md` (Cat-2 doc↔impl contract) | Appended "Render-similarity mode" section to existing `docs/testkit/equivalence.md` | As §6.2 prescribes. |
| H. Shared-file updates | CHANGELOG.md (### sub-phase-phase-3-render-similarity), docs/glossary.md (PSNR/SSIM/LPIPS/MS-SSIM/perceptual-loss), `.github/workflows/python-strict.yml` (NEW `test-render-similarity` job per §2.14 mirroring `test-common-3dgs`) | As §6.2 prescribes (`build-py.yml` → `python-strict.yml` is the SHIFTED-from-prompt finding from Stage 1a, recorded in the Stage-1a audit). |
| I. progress.md entry | At each stage; this landing's entry below | As §6.2 prescribes. |
| J. Report at `docs/_audits/phase-3/task-2-render-similarity.md` | Matured per-sub-phase cadence: per-stage audits + this consolidated landing audit | Sanctioned supernumerary: matured cadence supersedes the §6.2 single-report prompt (charter §1.3 inherited-vs-reframed; mirrors common-3dgs §6.1 prompt-vs-reality reframe). |
| **K. (supernumerary)** Adversarial fixtures + meta-test | `tools/testkit/render_similarity/tests/fixtures/adversarial/{ssim_false_positive,lpips_false_negative}/` + `test_adversarial_coverage.py` | **Charter-v2 testkit-local placement on three-evidence stack** (identical CI breadth/freq + Cat 1-5 semantic mis-fit + `docs/architecture.md:673` Layer-0). NOT the v9 amendment's `tools/integrity/tests/fixtures/adversarial/cat3_wrong_render_similarity/` location (would fight the Cat 1-5+Cat-X semantic schema). Sanctioned-by-investigation-audit. |
| **L. (supernumerary)** Mutation baseline + tightening (Stage 1c) | `tools/testkit/mutation/sub-phase-phase-3-render-similarity-2026-05-28T14-01-50Z.json` + Stage-1c tightening tests | Charter §2 Stage 1c per v9 amendment `docs/phases/phase-3-plan.md:1248`. Verdict SHIFTED-bank-not-widen; threshold UNCHANGED at 0.85. |
| **M. (supernumerary)** I7 allowlist extension | `tools/testkit/lfs_migration/test_i7_no_agent_tags.py` `OPERATOR_NONPHASE_TAGS` extended with `v0.2.3-sub-phase-phase-3-render-similarity` at commit `596eb73` | Mirrors common-3dgs Stage 2 commit `c761aa9`. I7 guard unchanged; mutation-probed. |

All supernumeraries additive + well-documented; no §6.2 deliverable
silently dropped.

## § 5 — Mutation verdict (FACT)

Kill rate: **66/84 = 0.7857** on `tools/testkit/render_similarity/metrics.py`
(the source-only mutmut target per charter §2 Stage 1c). Verdict:
**SHIFTED-bank-not-widen** per the charter §2 Stage 1c pre-routed brackets
(0.78 ≤ 0.7857 < 0.85).

**Threshold UNCHANGED at 0.85** in `tools/testkit/mutation/mutmut-config.toml`
`[targets.render_similarity]`; STOP-I anti-pattern not exercised.

### § 5.1 — L-3DGS-1 calibration evidence input (FACT)

common-3dgs Stage 1c banked: "Neural-rendered category mutation threshold
may need calibration; revisit at task-8 dispatch with the 3DGS-MPM consumer
providing additional pixel-exact rotation / SH coverage."

This sub-phase's contribution: a second neural-rendered-category data point
at 0.7857 alongside common-3dgs's 0.7610. The combined picture
(two infrastructure-class modules each settling in the high-70s/low-80s
under non-anti-pattern test budgets) strengthens the structural-ceiling
argument. Task-8 dispatch consumes both data points.

The equivalent-mutant catalogue (Stage-1c audit § 4) is the load-bearing
detail: 11 string/fstring message mutations + 3 no-observable-effect +
4 LPIPS arithmetic symmetric across dtype paths = 18 of 18 survivors all
categorically un-killable without anti-pattern.

## § 6 — Closing sweep findings (FACT)

| Sweep gate | Result |
|---|---|
| Cat-X tolerance-budget | render-similarity adds no `[budgets.<cat>.cross_stack]` row (not a cross-stack-equivalence consumer); Phase-3 carryover opened at common-3dgs Stage 0 is verified-only — N/A documented |
| verify_evidence sweep across all 7 prior render-similarity audits + this landing | 0 failures across 7 audits (table § 1.1); this landing's self-reference resolves at Convention #12 back-fill |
| Append-only via git diff vs `v0.2.0-phase-2` | 0 M/D on prior-phase audits |
| Append-only via git diff vs `v0.2.2-sub-phase-phase-3-common-3dgs` | 1 sanctioned M (`progress.md` — common-3dgs Stage-2 landing precedent) |
| Failing-tests replay (gate-13) | `sha256sum tools/testkit/failing-tests-evidence/render-similarity-2026-05-28T12-54-18Z.txt` = `88b5194b83c97d363410f3efc8edd3b1fef4d99833cc221f7e18a88dafba18b6` — matches committed Stage-1a RED footer + Stage-1b impl witness footer |
| Mutation threshold UNCHANGED check | `tools/testkit/mutation/mutmut-config.toml [targets.render_similarity].threshold = 0.85` — unchanged from charter §2 Stage 1c value |
| Perf-ledger review | render-similarity does not run a sim (infra task per §2.11) → no perf-ledger row; mirrors common-3dgs precedent |
| Integrity Cat 1-5 at HEAD | byte-identical |
| Closing anchor re-check (Convention 7.9 — re-grep every file:line across all stage audits + landing) | every `tools/testkit/render_similarity/metrics.py:<N>` citation in Stage-1c § 4.1 / 4.2 / 4.3 verified against the at-HEAD source (one HARD_FAIL caught + fixed during Stage-1c commit: line 293 → `tools/testkit/render_similarity/metrics.py:291` is the actual `ms_ssim` shell raise) |

## § 7 — I7 invariant verification (FACT)

`tools/testkit/lfs_migration/test_i7_no_agent_tags.py`:

- `OPERATOR_NONPHASE_TAGS` extended with `v0.2.3-sub-phase-phase-3-render-similarity` at commit **`596eb73`** (this Stage-2 chain).
- `pytest tools/testkit/lfs_migration/test_i7_no_agent_tags.py` → **2 passed** (allowlist + presence).
- Mutation probe: `OPERATOR_SANCTIONED_TAGS` size = 6 = `OPERATOR_PHASE_TAGS` (3) + `OPERATOR_NONPHASE_TAGS` (3 — lfs-arch + common-3dgs + render-similarity). Fake agent-identity tag `agent/v0.0.42-fake-push-attempt` does NOT match the allowlist (membership check returns `False`) — additive extension does not weaken the guard.

## § 8 — STOP conditions NOT fired this stage (audit)

| STOP | Trigger | Fired? |
|---|---|---|
| STOP-D | integrity baseline divergence | NO — byte-identical |
| STOP-H | verify_evidence regression | NO — 7/7 prior audits PASS |
| STOP-LFS | LFS op fails with R2 creds present | NO — no LFS op this stage |
| STOP-I7 | agent-pushed tag detected | NO — allowlist extension is operator-sanctioned record per § D.2; tag NOT pushed this stage (operator action) |

## § 9 — Tag proposal (FACT — operator action required)

```
Proposed tag:       v0.2.3-sub-phase-phase-3-render-similarity
Tag commit SHA:     596eb73… (or the landing-audit commit / SHA back-fill if applicable)
Tag pushed:         NO (operator action required per I7)
Tag form:           annotated (`git tag -a`), NOT signed (operator has no GPG key)
```

**Pre-tag checklist (operator):**

- [x] I7 allowlist extended (`tools/testkit/lfs_migration/test_i7_no_agent_tags.py`); commit **`596eb73`**. `pytest` 2/2 GREEN.
- [x] Closing status: **closed-with-shifted-1** (Stage-1c mutation 0.7857 vs 0.85; threshold UNCHANGED; L-3DGS-1 banked).
- [x] Consumer import path stable: `from render_similarity import psnr, ssim, lpips, ms_ssim`. Tasks 6 + 8 consume this surface unchanged.
- [x] Annotated, not signed: operator runs
      ```
      git tag -a v0.2.3-sub-phase-phase-3-render-similarity <sha> -m "<msg>"
      git push origin v0.2.3-sub-phase-phase-3-render-similarity
      ```

D-TAG ratification (charter § 3): both (a) three external PyPI deps and
(b) durable architecture gating ALL Phase-4 neural-rendered sims strongly
met — stronger than common-3dgs (which earned its tag at one external git
dep + one durable API).

## § 10 — Banks carried forward (FACT)

- **L-3DGS-1** (consumed): neural-rendered mutation calibration evidence
  input alongside common-3dgs 0.7610. Task-8 dispatch consumes both data
  points.
- **SIBLING-FIXTURE-LFS** (common-3dgs Stage 2 bank; carried forward
  separately): 12 legacy-capture fixtures pre-existing as non-pointers
  from `v0.1.0-phase-1` — DIFFERENT dir from render-similarity's
  `tests/fixtures/adversarial/`; no overlap; independently routable.
- **integrity-meta-test-ci-wiring** (charter-v2 bank, carried forward):
  `docs/architecture.md:768` claims integrity meta-test "is itself part of
  CI" but no current workflow invokes `pytest tools/integrity/tests/`.
  Pre-existing gap; render-similarity's testkit-local meta-test does NOT
  inherit it (rides the `test-render-similarity` CI job in
  `.github/workflows/python-strict.yml`). Candidate sibling sub-phase.

## § 11 — Sub-phase: COMPLETE

Second Phase-3 sub-phase landed. Closing status **closed-with-shifted-1**.

**Next:**

- Operator pushes the proposed annotated tag `v0.2.3-sub-phase-phase-3-render-similarity`.
- Third Phase-3 sub-phase becomes dispatchable. Per `docs/phases/phase-3-plan.md:319-334` §3.1 deliverable map, the next sub-phases are the sim tasks (task-3 Lenia / task-3a Ising-classical / task-4 / task-5 / task-6 / task-7 / task-8); §4.1 default sequence + operator routing govern selection.
- task-6 (NCA D↔B equivalence) and task-8 (MPM-3DGS golden render) — the two HARD consumers of render-similarity — now have their HARD dep satisfied (`from render_similarity import psnr, ssim, lpips`).

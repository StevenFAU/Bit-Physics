---
date: 2026-05-28T12-44-20Z
author: phase-3 render-similarity stage-0 (Claude Code)
subject: Phase 3 render-similarity Stage 0 — pre-flight + PyPI verify + cross-phase replay
verdict: CONFIRMED
head_sha: 463283a (back-fill via Convention #12; the Stage-0 audit commit)
prior_sub_phase_tag: v0.2.2-sub-phase-phase-3-common-3dgs
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
replay_prior_phase: phase-2 → v0.2.0-phase-2 ok=True 8/8
evidence_hashes:    # mapping (path → sha256); R-7 corrected shape
  docs/phases/sub-phase-phase-3-render-similarity.md: sha256:3610dc3810fd33e93c92b4c2ec9d213a757bc903cbdf5218cef2fa36bb1f2591
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md: sha256:0f4eb0ccc4cab121de6f1213ba2431e8fa26ba3dcaf6bb70afeb663370526fdd
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md: sha256:0017b85879b09d6c19efac208f34fdf179083d5d92571f6af59a2afaec3bbce4
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md: sha256:9ae5528a0cd0bd478878cbd54a562bdbe056d99fd74a71075ff74f52944c4ddb
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
  tools/testkit/equivalence/harness.py: sha256:4a1478c86b1e23aa4ab89faf17286290305c94d999db0ca7f627ef24acff9958
  tools/testkit/equivalence/tolerance.toml: sha256:af42cac965de8f368f945f9b4dee325debcaca3950738493d724e06cb2f97111
  tools/testkit/equivalence/tolerance-schema.json: sha256:d4e57cc4f84ea196f6b438c5edcd00c3f45eebdb9a84b0146bf1127c7fbee9c2
  tools/testkit/equivalence/tolerance-budget.toml: sha256:0ecb3f2b25493e0bce552cce6b13f07ee27934971c6c27d31da7d5d7f2b43224
  tools/testkit/pyproject.toml: sha256:4d2c6d71059399e20fe4a9f10a896d04edea024e5a84cde55c141f13819ee811
  tools/testkit/mutation/mutmut-config.toml: sha256:d60b28fee41f00b271f3b5326452d1f2f0f161600ba2947a8151d420e87d1a89
  tools/integrity/tests/test_adversarial_coverage.py: sha256:1520c42da1913884a259ade65921c275c9f98eeff018e2fca738da92d3210503
evidence_paths:     # LIST per verify_evidence schema (R-7 corrected)
  - docs/phases/sub-phase-phase-3-render-similarity.md
  - docs/phases/phase-3-plan.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md
  - docs/_audits/phase-3/progress.md
  - tools/testkit/equivalence/harness.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/pyproject.toml
  - tools/testkit/mutation/mutmut-config.toml
  - tools/integrity/tests/test_adversarial_coverage.py
d_class_status:
  - D-LOC: RESOLVED-IN-CHARTER → tools/testkit/render_similarity/ package per §3.2.2
  - D-WEIGHTS: LEAN — lazy runtime-fetch + CI actions/cache; measure 1b
  - D-DET: LEAN — bit-exact / same-stack-same-hw, CPU-only LPIPS + eval+no_grad+pinned weights; MEASURE 1b
  - D-ANCHOR: LEAN — PSNR hand-derivation + SSIM Wang 2004 Eq.13 + LPIPS self-consistency + ≥1 published reference; STOP-D-ANCHOR if un-anchorable
  - D-TAG: LEAN YES → v0.2.3-sub-phase-phase-3-render-similarity (annotated, operator-pushed)
  - D-HARNESS-CLI: Stage-1a probe item; LEAN (a) tools/testkit/equivalence/__main__.py + --mode flag
  - D-SCHEMA: Stage-1a probe item; LEAN additive [render_similarity.<category>.<sim>] table family
---

# Phase 3 render-similarity Stage 0 — pre-flight + PyPI verify + cross-phase replay — CONFIRMED

> **Verdict: CONFIRMED.** Anchor probe clean; cross-phase replay `--prior-phase
> phase-2` ok=True 8/8 (no LFS-cache recovery needed this session); PyPI verify
> clean for the charter-pinned `lpips==0.1.4` + `scikit-image>=0.26` (deps land
> Stage 1b, not here); tolerance-budget Phase-3 carryover already opened at
> common-3dgs Stage 0 — verified, not re-opened; all five D-class default leans
> ratified into this Stage-0 amendment block. **No STOP fired.** Stage 1a
> (scaffold + RED) is unblocked. Posture: Convention #8 (every PyPI version
> web-fetched, none fabricated), Convention M (re-anchored against HEAD before
> any edit), HARD RULE 2 (no improvising through a STOP).

## § 0 — Re-statement (FACT)

Second Phase-3 sub-phase, Stage 0. The first (common-3dgs, task-1) LANDED at
`v0.2.2-sub-phase-phase-3-common-3dgs` with closing status `closed-with-shifted-1`
(SHIFTED item = Stage-1c mutation 0.7610 vs 0.80 floor; threshold UNCHANGED;
forward-routed to L-3DGS-1 at task-8). render-similarity is the remaining
infrastructure root per §3.1 deliverable map and HARD-blocks task-6 + task-8.
Charter-v2 authority: `docs/phases/sub-phase-phase-3-render-similarity.md` (chain
tip `40ce87b` at session start; HEAD == origin/main).

## § 1 — Anchor-probe findings (FACT)

Re-run at HEAD `40ce87b` (Convention M; `git rev-parse HEAD` == `git rev-parse
origin/main`; no successor commit — the expected anchor):

| Check | Result |
|---|---|
| `git rev-parse HEAD` == `git rev-parse origin/main` | `40ce87b70aa7bffc387ebc0d762fbac000e6d027` (no drift) |
| Chain to `40ce87b` | `872e308` → `119feb0` → `9220ffb` → `75b3d36` → `40ce87b` (charter-v2 chain tip) |
| Tag `v0.0.0-phase-0` | annotated → commit `727ffb9b513f…` (dereferenced); `git rev-parse` returns the tag object `75b674cb9d44…` — matches probe |
| Tag `v0.1.0-phase-1` | annotated → commit `9998bc1897e8…` ✓ |
| Tag `v0.2.0-phase-2` | annotated → commit `5832cbce86d2…` ✓ |
| Tag `v0.2.1-sub-phase-lfs-architecture` | annotated → commit `0407fa5eb5c2…` ✓ |
| Tag `v0.2.2-sub-phase-phase-3-common-3dgs` | annotated → commit `07aa1f5c87ae…` ✓ (operator-pushed; matches charter §3 D-TAG precedent) |
| Integrity Cat 1–5 strict sweep | **0 HARD_FAIL / 14 SOFT_WARN**; stderr-report `sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to the baseline |
| I7 invariant `pytest tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | **2 passed** (allowlist + presence) |

**Annotated-tag-vs-commit note (FACT).** `git rev-parse <tag>` returns the
annotated tag-object SHA; `git rev-parse <tag>^{commit}` dereferences to the
commit SHA. Probe §1 recorded both forms; matches re-confirmed.

### § 1.1 — verify_evidence sweep (FACT) — no regression (I1, STOP-H not fired)

`uv run --no-sync python -m integrity.scripts.verify_evidence --audit <A>`:

| Audit | Result |
|---|---|
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md` | 4 pass / 0 fail @ `b6230663b1d6` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md` | 0 pass / 0 fail @ `44cc8cbfadc4` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md` | 7 pass / 0 fail @ `6dd5494f2b7a` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md` | 12 pass / 0 fail @ `a376ee2e900e` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md` | 12 pass / 0 fail @ `f19b525fd986` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md` | 14 pass / 0 fail @ `9121e31459cc` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md` | 16 pass / 0 fail @ `d8e4c483b47a` |
| `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md` | 22 pass / 0 fail @ `e4011f2c0b58` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md` | 16 pass / 0 fail @ `01764a6a462e` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md` | 12 pass / 0 fail @ `872e3084251b` |
| `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md` | 18 pass / 0 fail @ `75b3d36f4d28` |

No regression on any Phase-3 audit (incl. the BLOCKED Stage-0 artifact). Pre-existing
historical phase-0/1/2 fails are unchanged across the landed common-3dgs sub-phase
+ this Stage 0 (carried through landing-audit sweep + render-similarity probe sweep).

## § 2 — Cross-phase replay (FACT — v9 first-action `docs/phases/phase-3-plan.md:18`)

```
uv run --no-sync python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-2 \
  --audit docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Result (verbatim summary):

| Gate | Result |
|---|---|
| integrity | PASS |
| pytest | PASS |
| equivalence | PASS |
| determinism | PASS |
| perf-ledger | PASS |
| property | PASS |
| mutation | PASS |
| tolerance-budget | PASS |
| **summary** | `prior_phase=v0.2.0-phase-2 ok=True` 8/8 |

LFS-cache-recovery mitigation ([[replay-needs-lfs-cache-recovery]]) **NOT required
this session** — replay completed without smudge failure. Carried forward as the
mitigation-of-record if a subsequent stage's worktree checkout encounters an LFS
backend unreachability. **STOP-REPLAY not fired.**

## § 3 — PyPI dep verify (WEB-FACT — Convention #8) — deps land Stage 1b, NOT here

Stage 0 verifies the charter-v2 pins are not yanked + carry no advisory affecting
the pinned version. Stage 1b adds them to `tools/testkit/pyproject.toml` alongside
the implementation (mirrors common-3dgs Stage 0 pinning the Inria SHA but Stage 1b
vendoring).

| Package | Latest stable | Source URL | Release date | requires-python | Yanked? | GitHub advisories |
|---|---|---|---|---|---|---|
| `lpips` | **0.1.4** | `https://pypi.org/pypi/lpips/json` | 2021-08-25 | not specified (classifiers: `Python :: 3`) | NO | **0** (`https://github.com/advisories?query=lpips`) |
| `scikit-image` | **0.26.0** | `https://pypi.org/pypi/scikit-image/json` | recent (not yanked) | `>=3.11` | NO | **0** published (`https://github.com/scikit-image/scikit-image/security/advisories`) |
| `torch` | (transitive) | `lpips` declares `torch>=0.4.0` | n/a (very permissive lower-bound) | n/a | n/a | **0** advisories on the pinned lower-bound range; Stage 1b records the resolved pin from `uv lock` |

**WEB-fetch posture (Convention #8):**
- `lpips==0.1.4` confirmed not yanked at `https://pypi.org/pypi/lpips/json`; dependency declaration `torch>=0.4.0`, `torchvision>=0.2.1`, `numpy>=1.14.3`, `scipy>=1.0.1`, `tqdm>=4.28.1`. No `requires_python` upper-bound; classifiers list only `Python :: 3` (broad). Testkit's `requires-python>=3.12` (`tools/testkit/pyproject.toml:8`) is well above `lpips`'s implicit floor and the modern `torch` wheel matrix supports 3.12.
- `scikit-image==0.26.0` confirmed not yanked at `https://pypi.org/pypi/scikit-image/json`; `requires_python=">=3.11"` (testkit's `>=3.12` compatible).
- `torch` is `lpips`'s transitive; the charter records "declare in manifest; pin within `lpips` compat window" — Stage 1b records the resolved pin (the explicit `torch>=2.0` line keeps wheels available for Python 3.12 CI runners and stays well inside `lpips`'s `>=0.4.0`).

**STOP-PYPI not fired.** No yank; no advisory affecting any pinned version.

## § 4 — Tolerance-budget Phase-3 carryover (FACT) — already opened; not re-opened

`tools/testkit/equivalence/tolerance-budget.toml` carries:

```
[phase]
phase = "phase-3"
opened_at = "2026-05-28T00-59-06Z"
```

Opened at common-3dgs Stage 0; render-similarity inherits. **No re-open;** no
per-category budget widened. render-similarity is single-purpose tooling (its
metric outputs are NOT cross-stack-equivalence inputs — they are golden-render
gate inputs consumed by tasks 6 and 8) so it adds no `[budgets.<cat>.cross_stack]`
override. Phase 3 budget remains 6 categories × `cross_stack` entries unchanged.

## § 5 — D-class amendment block (FACT — Stage-0 ratification)

Default leans from charter § 5 are ratified into this Stage-0 amendment so
Stage 1a–1c agents act on the recorded leans. None has been inverted at Stage 0.

| D-class | Default lean (charter § 5) | Stage-0 ratification | Decision-by |
|---|---|---|---|
| D-LOC | `tools/testkit/render_similarity/` package per §3.2.2 + v8/v4 amendments | **RESOLVED-IN-CHARTER**; no further action at Stage 0 | resolved-in-charter (plan-drafting) |
| D-WEIGHTS | lazy runtime-fetch + CI `actions/cache` keyed on Python ver + lpips ver; sha256 the cached weight on first download, assert match on subsequent runs (R-3) | **LEAN HELD**; STOP-WEIGHTS only if forced to LFS-vendor full pretrained AlexNet/VGG (~230 MB / ~530 MB) | Stage 1b |
| D-DET | bit-exact / same-stack-same-hw, CPU-only LPIPS (`model.eval()` + `torch.no_grad()` + pinned weights); MEASURE at Stage 1b | **LEAN HELD**; STOP-DET → re-characterize distributional + derive EFECT bound if non-bit-exact across two runs | Stage 1b (measure) |
| D-ANCHOR | PSNR hand-derivation (`PSNR = 20 log10(MAX_I/sqrt(MSE))`); SSIM Wang 2004 Eq.13 on textbook pair; LPIPS self-consistency + ≥1 published reference value | **LEAN HELD**; STOP-D-ANCHOR if un-anchorable without large fetch — Convention #8 forbids fabrication | Stage 1b |
| D-TAG | YES → `v0.2.3-sub-phase-phase-3-render-similarity` annotated (not signed), operator-pushed (I7) | **LEAN HELD**; I7 allowlist extension lands at Stage 2 (mirrors common-3dgs `c761aa9`) | Stage 2 |
| D-HARNESS-CLI (Stage-1a probe item) | (a) `tools/testkit/equivalence/__main__.py` + `--mode` flag dispatching `render-similarity` into the metric package | **LEAN HELD**; STOP-CLI only if compare_captures programmatic surface cannot host the new mode without a destructive refactor | Stage 1a (probe) |
| D-SCHEMA (Stage-1a probe item) | additive `[render_similarity.<category>.<sim>]` table family + `tolerance-schema.json` additive extension (no break to existing validators); SCHEMA ONLY — no Phase-3 rows | **LEAN HELD**; STOP-SCHEMA only if additive extension is impossible without breaking existing `[defaults.…]`/`[overrides.…]` validators | Stage 1a (probe) |

## § 6 — Mutation threshold (FACT — re-confirm for Stage 1c)

charter Stage 1c locks **≥ 0.85** (phase-3-plan §6.0 v9 amendment `:1248`,
"render-similarity testkit module: ≥ 85% (high; this gates Phase 4 neural variants)").
Pre-routed brackets (charter § 2 Stage 1c):

| Bracket | Disposition |
|---|---|
| ≥ 0.85 | CONFIRMED |
| 0.78–0.849 with equivalent-mutant rationale | SHIFTED — bank L-3DGS-1 calibration evidence; threshold UNCHANGED (anti-pattern to widen); feeds task-8 |
| < 0.78 | BLOCKED (STOP-MUT) |

This is NOT 0.80 — neural-sim gate. STOP-I (any temptation to widen) is the
charter-explicit anti-pattern.

## § 7 — STOP conditions NOT fired (audit)

| STOP | Trigger | Fired? | Notes |
|---|---|---|---|
| STOP-D | integrity baseline divergence | NO | byte-identical `c19492ad…d22cb52` |
| STOP-H | verify_evidence regression | NO | 11/11 prior Phase-3 audits PASS; pre-existing phase-0/1/2 fails historical |
| STOP-REPLAY | cross-phase replay discrepancy | NO | ok=True 8/8; LFS recovery not needed |
| STOP-PYPI | lpips/scikit-image yanked or CVE | NO | both unyanked, 0 advisories |
| STOP-D-ANCHOR | LPIPS un-anchorable (Stage-1b) | n/a | Stage 1b probe item |
| STOP-WEIGHTS | LFS-vendoring forced (Stage-1b) | n/a | Stage 1b probe item |
| STOP-DET | LPIPS non-bit-exact same-hw (Stage-1b) | n/a | Stage 1b measurement |
| STOP-CLI / STOP-SCHEMA | harness/schema destructive refactor (Stage-1a) | n/a | Stage 1a probe items |
| STOP-MUT | mutation < 0.78 (Stage-1c) | n/a | Stage 1c threshold check |
| STOP-LFS | LFS op fails with R2 creds present | NO | no LFS op this stage |

## § 8 — Forward routing (consumed by Stage 1a)

- Scaffold `tools/testkit/render_similarity/` package per D-LOC; expose
  `psnr` / `ssim` / `lpips` / `ms_ssim` shells with `NotImplementedError` bodies +
  the §3.2.2 input-validation contract (shape/dtype `ValueError`).
- D-HARNESS-CLI Stage-1a probe: add `tools/testkit/equivalence/__main__.py` +
  `--mode` flag (lean (a)).
- D-SCHEMA Stage-1a probe: additive `[render_similarity.<category>.<sim>]` table
  family in `tolerance.toml` + `tolerance-schema.json` extension (lean).
- RED smoke contracts for every public symbol (identity pair, known-perturbation
  pair, error cases) + ≥2 PBT invariants; failure mode is `ModuleNotFoundError` /
  `NotImplementedError`, NOT collection error. Output to
  `tools/testkit/failing-tests-evidence/render-similarity-<UTC>.txt`;
  `Failing-tests-output` + `Failing-tests-output-hash: sha256:…` in commit footer
  per v9 amendment `docs/phases/phase-3-plan.md:22`.

## § 9 — Exit

Stage 0 CONFIRMED. Anchor probe clean; replay 8/8; PyPI verify clean; D-class
ratified; tolerance-budget Phase-3 carryover verified-only. Stage 1a dispatch
READY at HEAD `463283a` (Stage-0 audit commit; back-filled via Convention #12).

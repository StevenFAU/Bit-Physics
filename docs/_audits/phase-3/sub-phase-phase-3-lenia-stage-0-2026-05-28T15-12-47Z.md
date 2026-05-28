---
date: 2026-05-28T15-12-47Z
author: phase-3 lenia stage-0 (Claude Code)
subject: Phase 3 third sub-phase (task-3 Lenia) — STAGE 0 pre-flight + integrity + verify_evidence + cross-phase replay + Chakazul SHA re-confirm
verdict: CONFIRMED
head_sha: 4ee54e87d54057627c69fa61e8095c729e677ece
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-B Stack-D RESOLVED-IN-CHARTER / D-MUT-SCOPE NO RESOLVED-IN-CHARTER / D-FFT real-space-default-decision-by-Stage-1b / D-DET bit-exact-lean-decision-by-Stage-1b-MEASURE / D-TAG YES-lean-decision-by-Stage-2
evidence_paths:
  - docs/phases/sub-phase-phase-3-lenia.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-plan-drafting-2026-05-28T14-38-32Z.md
  - docs/phases/phase-3-plan.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
  - tools/testkit/equivalence/tolerance-budget.toml
evidence_hashes:
  docs/phases/sub-phase-phase-3-lenia.md: sha256:c232145520a1100302c286a5c9dda4c775477f1db3a3897bbbf97d00075a1742
  docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md: sha256:e3a5a31c5283c500949ef17ff7b5ba37ccb69984e41a384e931a20adbae058f0
  docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md: sha256:1cdd1eb564bff8f2ece8c477afd2d1a7896b24a709afab34621d2a92b44ba111
  docs/_audits/phase-3/sub-phase-phase-3-lenia-plan-drafting-2026-05-28T14-38-32Z.md: sha256:8359b0bf5201a07e16c6d8b598e72c65713c4a12643fd55302bfbd2a9c181312
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
  tools/testkit/equivalence/tolerance-budget.toml: sha256:0ecb3f2b25493e0bce552cce6b13f07ee27934971c6c27d31da7d5d7f2b43224
---

# Phase 3 — sub-phase Lenia — Stage 0 audit

> Pre-flight: state checks, integrity, verify_evidence, cross-phase
> replay, Chakazul SHA re-confirm, tolerance-budget cap probe. Follows
> the matured per-sub-phase cadence (common-3dgs + render-similarity
> precedent). Verdict **CONFIRMED** — Stage 1a (scaffold + RED) is now
> safe to dispatch.

## § 1 — Anchor probe (FACT)

| Check | Expectation | Result |
|---|---|---|
| `git rev-parse HEAD` == `git rev-parse origin/main` | match | **MATCH** `4ee54e87d54057627c69fa61e8095c729e677ece` (lenia plan-drafting chain tip per [[phase-3-lenia-plan-drafting-landed]]) |
| All SIX phase / sub-phase tags resolve | resolve | **all resolve**: `v0.0.0-phase-0`, `v0.1.0-phase-1`, `v0.2.0-phase-2`, `v0.2.1-sub-phase-lfs-architecture`, `v0.2.2-sub-phase-phase-3-common-3dgs`, `v0.2.3-sub-phase-phase-3-render-similarity` |
| `uv run python -m integrity --all --mode strict` | `0 HARD_FAIL / 14 SOFT_WARN`, full-report sha256 byte-equal `c19492ad…d22cb52` | **PASS** — `summary: 0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 = `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` **byte-identical** to baseline |
| `pytest tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | 2/2 PASS | **2/2 PASS** at HEAD (I7 allowlist already includes `v0.2.2`, `v0.2.3`; `v0.2.4-sub-phase-phase-3-lenia` extension is a Stage-2 deliverable) |
| `uv sync --all-packages` | clean | **clean** at HEAD; workspace lockfile unchanged ([[bit-physics-uv-sync-prunes-venv]] caveat respected) |
| working tree clean | yes | yes |
| invariants I1–I7 | hold | hold (I7 explicitly tested above; I1–I6 covered by integrity sweep + clean tree) |

**Conclusion (FACT).** State checks GREEN; integrity baseline holds
**byte-identical**; HEAD == origin/main; six tags resolve.

## § 2 — verify_evidence sweep (FACT)

Sweep of **all 19 audit files in `docs/_audits/phase-3/`** with
`--strict` flag (excluding `progress.md`, which is intentionally
non-front-mattered):

| File | Result |
|---|---|
| `sub-phase-phase-3-common-3dgs-plan-drafting-2026-05-28T00-05-29Z.md` | 4 pass / 0 fail |
| `sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md` | 0 pass / 0 fail |
| `sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md` | 7 pass / 0 fail |
| `sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md` | 12 pass / 0 fail |
| `sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md` | 12 pass / 0 fail |
| `sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md` | 14 pass / 0 fail |
| `sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md` | 16 pass / 0 fail |
| `sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md` | 22 pass / 0 fail |
| `sub-phase-phase-3-render-similarity-plan-drafting-2026-05-28T11-34-56Z.md` | 12 pass / 0 fail |
| `sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md` | 16 pass / 0 fail |
| `sub-phase-phase-3-render-similarity-fixture-investigation-2026-05-28T12-09-40Z.md` | 18 pass / 0 fail |
| `sub-phase-phase-3-render-similarity-stage-0-2026-05-28T12-44-20Z.md` | 28 pass / 0 fail |
| `sub-phase-phase-3-render-similarity-stage-1a-2026-05-28T12-56-47Z.md` | 26 pass / 0 fail |
| `sub-phase-phase-3-render-similarity-stage-1b-2026-05-28T13-13-19Z.md` | 38 pass / 0 fail |
| `sub-phase-phase-3-render-similarity-stage-1c-2026-05-28T14-14-36Z.md` | 20 pass / 0 fail |
| `sub-phase-phase-3-render-similarity-landing-2026-05-28T14-20-30Z.md` | 28 pass / 0 fail |
| `sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md` | 8 pass / 0 fail |
| `sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md` | 29 pass / 0 fail |
| `sub-phase-phase-3-lenia-plan-drafting-2026-05-28T14-38-32Z.md` | 13 pass / 0 fail |

**Summary: 19 audits / 0 fail.** STOP-H not fired.

## § 3 — Cross-phase replay (FACT)

Per `docs/phases/phase-3-plan.md:18` + the matured per-sub-phase
cadence (mirrors common-3dgs / render-similarity Stage-0):

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-2 \
  --audit docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Output:

```
  PASS  gate=integrity         audit_verdict=None
  PASS  gate=pytest            audit_verdict=None
  PASS  gate=equivalence       audit_verdict=None
  PASS  gate=determinism       audit_verdict=None
  PASS  gate=perf-ledger       audit_verdict=None
  PASS  gate=property          audit_verdict=None
  PASS  gate=mutation          audit_verdict=None
  PASS  gate=tolerance-budget  audit_verdict=None
summary: prior_phase=v0.2.0-phase-2 ok=True
```

**8/8 gates PASS, `ok=True`.** STOP-REPLAY not fired. LFS-cache
recovery (per [[replay-needs-lfs-cache-recovery]]) not required at
this Stage-0 boundary.

## § 4 — Chakazul/Lenia SHA re-confirm (Convention #8)

WEB-FETCH `2026-05-28T15-12-47Z` (this Stage-0 audit time)
`https://api.github.com/repos/Chakazul/Lenia/branches/master`:

| Attribute | Value |
|---|---|
| Repository | `github.com/Chakazul/Lenia` |
| Default branch | `master` |
| HEAD SHA (master) | `adfc542939266de7f4bb7ebb552e8499701ee107` |
| Commit message | "upload LeniaF.py 'free kernel' version" |
| Commit date | `2022-03-15T17:08:40Z` |
| Author | Bert Chan |
| License (`/repos/Chakazul/Lenia`) | **MIT** |
| Archived | `false` |
| Security advisories | clean (probe `2026-05-28T14-38-32Z` confirmed empty array; no new advisory in the intervening 34 minutes) |

**Cross-check.** SHA **byte-equal** between:
- plan §2.18 pin (`docs/phases/phase-3-plan.md:301`) — `adfc542939266de7f4bb7ebb552e8499701ee107`
- probe re-fetch (`2026-05-28T14:38:32Z`) — same
- this Stage-0 re-fetch (`2026-05-28T15:12:47Z`) — same

**No drift.** STOP-PIN not fired. Vendoring at Stage 1b uses this
exact SHA.

## § 5 — Tolerance-budget cap probe (FACT)

Per the charter §2 Stage-0 row: probe `tools/testkit/equivalence/tolerance-budget.toml`
for a `[budgets.continuous-ca.golden]` (or analogous) cap that would
bound Lenia's `golden_kernel_abs=1e-6` / `golden_kernel_rel=1e-5` /
`golden_trajectory_abs=1e-4` rows.

**Grep result (FACT).**
`grep -nE 'continuous-ca|lenia|golden_kernel|golden_trajectory|^\[budgets\.continuous' tools/testkit/equivalence/tolerance-budget.toml`
returns **no match**.

**Observation (FRICTION #1, first-SIM signal — surfaced loudly per charter §1.1 R-11).**

The current `tolerance-budget.toml` carries only **cross-stack** budgets
(`closed_form.cross_stack`, `reaction-diffusion.cross_stack`,
`sph.cross_stack`, `mpm.cross_stack`, `smoke.cross_stack`,
`lbm.cross_stack`). There is **no `[budgets.<category>.golden]` cap**
for any of the existing sims, so Lenia's three golden_* entries cannot
be Cat-X-compared at Stage 1b under the current budget shape.

**Disposition (NOT a STOP).** Per charter §6 STOP-CAT-X is conditional on
*exceeding* an existing cap; **no cap exists**, so no widening, no
violation. Lenia's `[continuous-ca.lenia]` row in `tolerance.toml`
(landing at Stage 1b) is a baseline-setting first observation for the
continuous-ca / lenia category. The forward-routing entry below
("FRICTION #1") flags this as a first-SIM portfolio-scale signal:
**every later SIM (rigid-body, cloth, NCA, PINN, 3DGS-MPM) will encounter
the same lack-of-golden-cap surface at its first golden-table land,
because the existing budget shape is cross_stack-only.** Operator routing
options at the landing review:

- (a) accept golden_* as un-capped-by-design (golden tables anchor to
  closed-form math; the anchor IS the budget — within mantissa);
- (b) extend `tolerance-budget.toml` with `[budgets.<category>.golden]`
  caps in a future sub-phase (likely Phase-4 cleanup or as a sibling
  sub-phase to the `integrity-meta-test-ci-wiring` candidate); or
- (c) treat the per-sim `golden_*_abs/_rel` as self-bounded per §2.4
  independent-reference anchors (each anchor's tolerance is its own
  cap).

Charter §6 STOP-CAT-X interpretation: **fires only on widening a
declared cap**; without a cap, the per-sim tolerance.toml row IS the
declared bound. Lenia lands its bounds at Stage 1b without amendment.

## § 6 — Stale §6.3 surfaces re-confirmed at HEAD (FACT)

Per the charter §1.2 inheritance table, these §6.3 surfaces are
RE-FRAMED at this charter (NOT edited in `phase-3-plan.md`); Stage 0
re-confirms their HEAD state:

| §6.3 surface | Re-framed under | HEAD state |
|---|---|---|
| `BASE BRANCH: phase-3-integration` / `YOUR BRANCH: phase-3/task-3-lenia` / `gh pr create` | v8 trunk-based (`docs/phases/phase-3-plan.md:46`) | Stage 0 commits directly to `main`; no PR; no merge |
| "Sub-phase 3.1" framing (§1 scope-table ordinal) | matured per-sub-phase cadence — execution-third | Stage 0 audit filed as **third** Phase-3 stage-0 (after common-3dgs `2026-05-28T00-59-06Z` + render-similarity `2026-05-28T12-44-20Z`) |
| Multi-claude-session coordinator handoff | v8 single-agent | Stage 0 + the whole sub-phase runs in this single dispatch per the operator's prompt |
| `continuous-ca/lenia/python/` path prescription (`docs/phases/phase-3-plan.md:1307,1333,1343`) | **§0.3 SHIFT-from-discovered probe carried into Stage 1a** — on-disk convention at HEAD is `packages/<name>/` (per `packages/reaction-diffusion-2d/`, `packages/reaction-diffusion-2d-stack-d/`, etc.; flat naming with optional `-stack-X` suffix). | **NOT decided here.** Stage 1a will re-anchor via the dedicated Stage-1a anchor probe and decide on-evidence per §0.3 (existing-convention takes precedence). Flagged as **FRICTION #2** (first-SIM portfolio-scale signal). |
| `K(0)` peak (`docs/phases/phase-3-plan.md:1351` §6.3 E) | charter §1.2 — Quad4 evaluates `K(0) = 0` (compact-support boundary, NOT peak); peak is at `r=0.5` where `K(0.5) = 1` | Stage 1a re-grounds; charter records SHIFTED-surface-only; **NOT** plan-edited |

## § 7 — First-SIM friction notes (charter §1.1 R-11 — carry forward)

Two friction items surface at Stage 0 — both **portfolio-scale signals**
inheriting forward to every later Phase-3 SIM:

| # | Friction | First-SIM signal | Surfaced loudly per |
|---|---|---|---|
| **#1** | `tolerance-budget.toml` has no `[budgets.<category>.golden]` cap shape; only `cross_stack` budgets exist. Lenia's first `[continuous-ca.lenia] golden_*` row at Stage 1b will land un-capped-by-design. | every later SIM hits the same surface at its first golden-table row | charter §6 STOP-CAT-X re-interpretation; not a STOP under current budget shape |
| **#2** | Plan §6.3 prescribes `continuous-ca/lenia/python/` at repo root; **on-disk convention at HEAD is `packages/<name>/`** (per `packages/reaction-diffusion-2d/`, `-stack-c`, `-stack-d`, `reaction-diffusion-3d`, `eulerian-smoke`, `lattice-boltzmann-d3q19`, `mpm-multimaterial`, etc.). §0.3 (existing-convention precedence) likely routes Lenia to `packages/lenia/`. **NOT decided here** — Stage 1a re-anchors via dedicated probe and decides on-evidence. | every later SIM faces the same on-disk-vs-plan-prescription friction | charter §1.2 inheritance table (this is the THIRD §0.3 SHIFT-from-discovered — alongside the "peak K(0)" math and the surface re-frames) |

Both friction items are **NOT STOPs**. They are recorded here so the
Stage-1a probe + landing audit consume them as forward-routed context
(R-11 inheritance).

## § 8 — STOP audit

| STOP | Fired? | Notes |
|---|---|---|
| STOP-D (integrity / I1-I7) | NO | baseline byte-identical; I7 2/2 PASS; I1-I6 covered by integrity sweep |
| STOP-H (verify_evidence) | NO | 19 audits / 0 fail |
| STOP-REPLAY (cross-phase) | NO | 8/8 gates PASS, ok=True |
| STOP-PIN (Chakazul) | NO | SHA byte-equal across §2.18 + probe + this Stage-0 re-fetch; MIT; not archived; advisories clean |
| STOP-CAT-X (tolerance-budget) | NO | no cap exists for golden category — friction #1 surfaced; no widening |
| STOP-K2-AT-HEAD | NO | §6.3 golden paths read `tools/testkit/golden/` (confirmed by probe §1) |
| All other STOPs (D-ANCHOR / DET / FFT / LFS / PBT / PROSE-MATH / TIER3-DIR / I7) | not yet in scope | gated to later stages per the charter |

## § 9 — Stage-0 verdict + forward-routing

**Verdict: CONFIRMED.** Stage 1a (scaffold + RED + failing-tests-hash +
Chakazul anchor probe) may dispatch. No operator-pending external-state
gates.

Forward-routed:
- **FRICTION #1** (tolerance-budget golden-cap shape) → Stage 1b
  acceptance decision (lands without amendment under current shape;
  options (a)/(b)/(c) for operator landing review).
- **FRICTION #2** (`packages/<name>/` vs `continuous-ca/lenia/python/`
  prescription) → Stage 1a dedicated probe + on-evidence decision per
  §0.3.
- **§0.3 anchor re-grounding** (Quad4 K(0)=0 ≠ peak) → Stage 1a re-grounds
  + records FACT in `docs/sim-specs/continuous-ca/lenia/spec-ref.md`.

— Stage-0 audit ends —

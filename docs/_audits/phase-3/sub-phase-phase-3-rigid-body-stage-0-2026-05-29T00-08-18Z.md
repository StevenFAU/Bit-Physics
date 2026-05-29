---
date: 2026-05-29T00-08-18Z
author: phase-3 rigid-body-pedagogical stage-0 (Claude Code)
subject: Phase 3 fifth sub-phase (task-4 rigid-body-pedagogical, first Stack-E SIM of Phase 3) — STAGE 0 pre-flight + ratified-D charter flip (OPEN→RESOLVED v2) + §5.8 corrigendum routing + §Q R2 bootstrap + integrity baseline + cross-phase replay + verify_evidence sweep
verdict: CONFIRMED
head_sha: TO-BACKFILL
prior_sub_phase_landed_at: 2da281a
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 6096fa35cc2aa35c82be0ff99613e73f2f8ab027e4df446e02d8e9a190c7e1ac
d_class_status: D-ALGO RESOLVED(ABA, Featherstone Ch.7) / D-ANCHOR RESOLVED(corrected 3-anchor set) / D-TOL RESOLVED(golden_tolerance §S.3) / D-USD RESOLVED(DEFER→Phase-4 WU-D) / D-LAYOUT LOCKED(packages/articulated-pedagogical/) / D-DET RESOLVED-IN-CHARTER(measure 1b) / D-CI RESOLVED-IN-CHARTER(python-strict.yml) / D-CAPTURE-API RESOLVED-IN-CHARTER(batch Capture+write_capture) / D-PBT RESOLVED-IN-CHARTER(energy_drift_bounded+momentum_conservation) / D-TAG LOCKED(NO)
evidence_paths:
  - docs/phases/sub-phase-phase-3-rigid-body.md
  - docs/spec-amendments-proposed.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
  - tools/lfs/setup-lfs-s3-local.sh
evidence_hashes:
  docs/phases/sub-phase-phase-3-rigid-body.md: sha256:14c9a664e77f3a1937080c004d90768e70053427c602b3bb9082bf7dbc81418d
  docs/spec-amendments-proposed.md: sha256:c0e7b05ff25347698b7fd7edf67d294da6bcd33132a8b7bed67494c727d3a20e
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/architecture.md: sha256:97e70bad3f82800e0c28fb0d28d98ee81fddc5d504a81d68d66dee03d0e4703a
  docs/conventions/sub-phase-conventions.md: sha256:10734948cd03c4bb5699010063be76e09f307eb33302707c4d4f3652cc829bd7
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
  tools/lfs/setup-lfs-s3-local.sh: sha256:c4ff80e361134a1b48e3e30fc2f57ada0945d416ffb20fd04d6f2a6552d92f65
---

# Phase 3 — sub-phase rigid-body-pedagogical (task-4) — Stage 0 audit

> Pre-flight for the **fifth Phase-3 sub-phase** and the **first Stack-E (Warp)
> SIM of Phase 3**: anchor probe (§R live re-measure), operator-ratified D-class
> resolution + charter flip OPEN→RESOLVED (v2), §5.8 maximal→ABA corrigendum
> routing, §Q.3 R2-LFS bootstrap, cross-phase replay (`--prior-phase phase-2`),
> verify_evidence sweep. Verdict **CONFIRMED** — Stage 1a (scaffold + RED) unblocked.

## ACTION 1 — anchor probe (§R two-field, measure-don't-copy)

- `uv run python -m integrity --all --mode strict` → **0 HARD_FAIL / 14
  SOFT_WARN** (the env-independent invariant). [FACT]
- `integrity_invariant` = `0 HARD_FAIL / 14 SOFT_WARN` (stable cross-audit
  assertion; STOP-D fires only on a change to this).
- `integrity_digest_at_head` = `6096fa35cc2aa35c82be0ff99613e73f2f8ab027e4df446e02d8e9a190c7e1ac`
  — **measured live** at the pre-Stage-0 working tree (sha256 of the full
  `--all --mode strict` STDERR report), NOT copied from a prior audit. Matches the
  preflight-drift audit's measured digest at `2da281a`/`4f1f54a` (no integrity
  surface changed since); will legitimately drift this sub-phase as 3 golden tables
  + a capture/fixture land (§R.1 informational drift). [FACT]
- `preflight-phase.py 3` → **exit 0** (`ALL PASSED`; F1+F2 hardening landed before
  this session per `preflight-tooling-hardening` — `integrity-all-green` PASS,
  all four `packages/*-stack-*` port paths PASS). The charter's "known stale
  false-positive" caveat no longer applies post-hardening. [FACT]

## ACTION 2 — ratified-D charter flip + corrigendum routing (first repo action)

Operator-ratified D-class outcomes resolved into the charter (§6/§11 flipped
OPEN→RESOLVED, v2 revision entry added):

| D-class | Ratified outcome |
|---------|------------------|
| D-ALGO | **ABA**, reduced/generalized-coordinate, Featherstone Ch.7 §7.2–§7.3 pp.123–131. §5.8 "maximal-coordinate" = verified error. |
| D-ANCHOR | Corrected 3-anchor set: A1 Marion&Thornton §3.2; A2 DLMF §19.2 + §22.19(i) / L&L §11; A3 DLMF §22.19(i) + §22.2 (Jacobi sn). RK4-ref = numerical baseline, not analytic anchor. |
| D-TOL | `[golden_tolerance.rigid-body.articulated-pedagogical]` per §S.3 — NO cross_stack budget cap, NO §2.6 amendment, NO schema extension. |
| D-USD | **DEFER** (Phase-3-Stack-E-WIDE) → common-warp `common_warp.usd` built in Phase-4 WU-D; §2.5 gap documented in spec-ref; carried into closed-with-shifted-N. |

**Corrigendum routing (authoritative docs NOT edited inline):**
- §5.8 "maximal-coordinate" → "articulated-body (ABA, reduced-coordinate)":
  appended as **A-1** to the new `docs/spec-amendments-proposed.md`. Spec is FROZEN
  in Phase 3 (architecture.md §9.6) → operator applies at close. `docs/architecture.md`
  NOT edited. [FACT]
- Plan §6.4:1605 Goldstein §4.3 wrong-cite: per §0.3, NO plan edit — corrected
  anchors live in the charter/spec-ref/golden-derivation; the wrong-cite is recorded
  as a Stage-2 landing SHIFT. `docs/phases/phase-3-plan.md` NOT edited. [FACT]

## ACTION 3 — §Q.3 R2-LFS bootstrap (FIRST after anchor probe — sub-phase commits a new .h5)

- `source tools/lfs/setup-lfs-s3-local.sh` → **exit 0**;
  `lfs-s3 ready … endpoint=…r2.cloudflarestorage.com bucket=bit-physics-lfs`.
  No STOP-LFS-PUSH. [FACT]

## ACTION 4 — cross-phase replay (`--prior-phase phase-2`)

- `uv run python -m integrity.scripts.replay_prior_phase --prior-phase phase-2
  --audit docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md --gates
  integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`
  → `summary: prior_phase=v0.2.0-phase-2 ok=True`, **8/8 gates PASS**. No
  STOP-REPLAY; LFS-cache recovery NOT required. [FACT]

## ACTION 5 — verify_evidence sweep across prior phase-3 audits

Full `docs/_audits/phase-3/*.md` sweep (41 files): **33 pass / 8 fail**. The 4
landed sub-phase Stage-0 audits all verify clean (common-3dgs 12/0, lenia 14/0,
ising-classical 16/0, render-similarity 28/0) — the real **no-regression** signal.
The 8 failures are **pre-existing audit-hygiene artifacts, none caused by task-4
work** (zero repo content changed before this sweep ran):

| Audit | Failure class |
|-------|---------------|
| `progress.md` | not an audit — no YAML front-matter by design |
| `sub-phase-phase-3-ising-classical-{probe,plan-drafting,harness-investigation}.md`; `sub-phase-phase-3-rigid-body-plan-drafting.md` | literal `at-head` in `evidence_hashes` — verify_evidence compares it as a literal string (NO `at-head` resolution in `tools/integrity/integrity/scripts/verify_evidence.py:120`) so it always mismatches the real sha256 |
| `sub-phase-phase-3-rigid-body-probe.md` (head `7d52ce1`); `sub-phase-phase-3-rigid-body-preflight-drift.md` (head `2da281a`) | self-referential `head_sha` chicken-egg — audit references itself / the not-yet-created charter at a pinned prior-commit SHA |
| `lenia-mypy-strict-fix.md` (head `6b108768`) | stale `python-strict.yml` hash — the workflow was legitimately edited later by the r2-credentials-durability commit `d546ace` |

**Routing:** these belong to the established **audit-citation-hygiene** cluster
(per `phase-3-r2-credentials-durability-fix` L-R2CD-1), NOT owned by task-4.

**SURFACED (not a STOP — pre-existing, does not block sim work):** the
`evidence_hashes: <path>: at-head` sentinel is documented (e.g. back-fill commit
`4f1f54a`: *"evidence_hashes use the at-head sentinel (verify_evidence-resolved)"*)
as if verify_evidence resolves it — but `verify_evidence.py` has **no `at-head`
branch** and treats it as a literal, so every `at-head` audit fails the hash check.
This is a convention-belief-vs-code mismatch. **Decision for THIS sub-phase's
audits:** use **real measured sha256** in `evidence_hashes` (the empirically-clean
pattern of all 4 landed Stage-0 audits), never the `at-head` literal.

## Verdict

**CONFIRMED.** All Stage-0 preconditions discharged; four operator-ratified
D-classes flipped RESOLVED (charter v2); §5.8 corrigendum routed to
`spec-amendments-proposed.md`; replay `ok=True`; integrity invariant held.
**Stage 1a (scaffold + RED) unblocked.**

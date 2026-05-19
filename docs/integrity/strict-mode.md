# Integrity strict-mode policy

Per `architecture.md` § 7.7. Soft-warn exceptions are documented here.
Phase 0 Block 1 seeds the file; Block 5 (INTEGRITY) extends it as the Cat
1–5 + Cat-X checks ship.

## Default posture

| Check category | Default failure mode | Notes |
|---|---|---|
| Cat 1 — Citation integrity | HARD_FAIL | Every `path:line` resolves; every upstream SHA exists. |
| Cat 2 — Contract verification | HARD_FAIL | Public API surfaces resolve to implementations. |
| Cat 3 — Numerical correctness | SOFT_WARN (default) | Per-check upgrade to HARD_FAIL as evidence accrues. |
| Cat 4 — Draft-time spec verification | HARD_FAIL at pre-commit | Phase 0 grammar: `path:line[-range]` only. |
| Cat 5 — Provenance traceability | SOFT_WARN | Audit-trail anchors. |
| Cat-X — Tolerance budget | HARD_FAIL | Overrides exceeding the budget cap require a separate operator-approved amendment. |

## Per-check soft-warn exceptions

_(none yet — Block 5 populates as checks ship)_

## Suppression discipline

`# integrity-allow: <check>; <reason>; <tracking-id>` annotations are
themselves audited (Cat 5 provenance). Bare `# integrity-allow:` without
the three fields is rejected. Per `architecture.md` Appendix D § D.8 item 9,
suppressions require an owner-approval line in the annotation.

## Mode flag (Block 5)

```bash
python -m integrity --all                     # default: strict
python -m integrity --all --mode strict       # explicit
python -m integrity --all --mode advisory     # exit 0 even on HARD_FAIL
```

Phase-landing audits run `--mode strict`; release-candidate verification
also runs strict.

## Soft-warn escalation process (Block 5; per spec § 7.7)

An owner may, for time-bounded reasons, *upgrade* a SOFT_WARN check to
HARD_FAIL in strict mode by:

1. Documenting the exception in the relevant phase plan or audit.
2. Listing the specific check IDs being escalated.
3. Setting a deadline by which the exception is either resolved or
   downgraded back to advisory.

## Suppression-of-the-suppression (Phase 1+)

Strict-mode CI may optionally enforce that every active `integrity-allow:`
tracking ID has a matching open issue in the project tracker; orphan
suppressions (no matching issue) escalate to HARD_FAIL. Phase 0 documents
the invariant but does not enforce it (no tracker wired in yet).

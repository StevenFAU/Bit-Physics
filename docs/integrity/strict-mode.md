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

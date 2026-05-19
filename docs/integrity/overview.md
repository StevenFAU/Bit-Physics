# Integrity toolkit — overview

Spec § 3.2. The integrity toolkit is the portfolio's Layer 1: it catches
drift and fabrication at write-time, before tests even run.

Five categories plus Cat-X tolerance-budget enforcement. Every check
declares a failure mode (`HARD_FAIL`, `SOFT_WARN`, `AUDIT_LOG`) and a
canonical check ID.

## Phase 0 check inventory

| Check ID | Category | Severity | What it does |
|---|---|---|---|
| `cat1.intra-repo` | Citation integrity | HARD_FAIL | Backtick-fenced `path:line` citations in tracked files resolve. |
| `cat2.python-exports` | Contract verification | HARD_FAIL | Every public symbol declared in a Python `__init__.py` resolves to an actual definition. |
| `cat3.golden-values` | Numerical correctness | SOFT_WARN (numeric) + HARD_FAIL (< 3 anchors) | Every golden table verifies against its registered evaluator and carries ≥ 3 independent-reference anchors. |
| `cat4.path-line-assertions` | Draft-time verification | HARD_FAIL at pre-commit | Backtick-fenced `path:line` citations in docs/audits/spec prose resolve. |
| `cat5.audit-links` | Provenance traceability | SOFT_WARN | Audit `evidence_paths` resolve; FACT-tagged claims link to a file path. |
| `catx.tolerance-budget` | Equivalence-tolerance budget | HARD_FAIL | Per-sim overrides in `tolerance.toml` stay within `tolerance-budget.toml`'s caps. |

## Suppression annotation

```python
x = 1  # integrity-allow: cat1.intra-repo; legacy citation refs WIP doc; ABC-123
```

Every suppression is itself auditable per spec § 3.2. Per-file matching;
exact check-ID, no glob.

## Failure modes (spec § 3.2)

- `HARD_FAIL` — CI red; commit blocked.
- `SOFT_WARN` — CI yellow; warning logged.
- `AUDIT_LOG` — logged to audit, no CI signal.

## CLI

```
python -m integrity [--all | --cat N] [--mode strict|advisory]
                    [--staged-only] [files...]
```

Default: every category across the whole repo, exits 1 on any HARD_FAIL.

## Adversarial-fixture meta-test

`tools/integrity/tests/test_adversarial_coverage.py` is the load-bearing
correctness anchor: each adversarial fixture under
`tools/integrity/tests/fixtures/adversarial/<cat>/` must be flagged by
its Cat check. A fixture that goes undetected HARD_FAILs the meta-test.
This is what makes the integrity toolkit's correctness testable rather
than asserted.

## Phase 1+ extensions

- Cat 2 sub-checks for Stack-C (C++) and Stack-B (Bun/TS) headers and
  declared exports.
- Cat 4 grammars (b) phrase-present-in-file and (c) public-API-shape.
- Per-cat external-link checks (URL liveness; cross-repo SHA pinning).

## See also

- [`cat1-citations.md`](cat1-citations.md)
- [`cat2-contracts.md`](cat2-contracts.md)
- [`cat3-numerical.md`](cat3-numerical.md)
- [`cat4-draft-time.md`](cat4-draft-time.md)
- [`cat5-provenance.md`](cat5-provenance.md)
- [`catx-tolerance-budget.md`](catx-tolerance-budget.md)
- [`strict-mode.md`](strict-mode.md)

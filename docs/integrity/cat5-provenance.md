# Cat 5 — Provenance traceability

Spec § 3.2. **SOFT_WARN.**

## What it checks (Phase 0 scope)

`cat5.audit-links`: for every markdown file under `docs/_audits/`
(excluding `progress.md` and `spec-amendments-proposed.md`):

1. Parse YAML front-matter.
2. Every entry in `evidence_paths:` resolves to a tracked file OR a
   tracked directory (allowing module-level citations like
   `tools/testkit/golden/`).
3. Every FACT-tagged line cites a path that's either listed in
   `evidence_paths` or otherwise tracked in the repo. A FACT line that
   names no path at all is permitted (it's a numeric or descriptive
   claim without a file anchor).

## Light by design

Phase 0's Cat 5 is intentionally light — it catches obvious orphans but
doesn't enforce the full claim graph. Phase 1+ tightens via:

- `cat5.fact-graph`: every FACT links to a downstream consumer (claim
  graph well-formedness).
- `cat5.suppressions-grandfathered`: every `integrity-allow:` annotation
  has a tracking ID present in the open-issues catalog.

## evidence_paths invariants

- Front-matter is a closed schema (plan § 5.1).
- `evidence_paths` MUST be a list.
- Each entry MUST be a string.
- Each entry MUST resolve to a tracked file or directory at HEAD.

## Verify-evidence script

Use `tools/integrity/integrity/scripts/verify_evidence.py` for deeper
verification (file presence at the audit's `head_sha`, optional sha256
hash matching). Cat 5 calls into this script on demand for the most
recent landing audit at phase-boundary review.

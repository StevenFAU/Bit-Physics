# Phase 0 — proposed spec/plan amendments (deferred to LANDING)

Index of amendments surfaced by individual block agents during Phase 0
execution. Each entry is a proposal, not a decision; owner reviews at
the LANDING block aggregation. Rule-of-Three: if a proposal recurs
across three independent surfaces, it graduates from "noted" to
"adopt."

---

## Amendment: extend § 5.1 audit front-matter schema for vendoring blocks

Rationale: Block 4 surfaced that vendored upstream SHAs are
load-bearing audit evidence (per § 7.4). Phase 3 and Phase 4
will vendor additional upstream repos. If the Rule-of-Three
triggers across phases, owner should consider adding
`upstream_sha:` (or `upstream_shas:` as a list, for blocks
vendoring multiple repos) to the canonical front-matter
schema.

Status: deferred to LANDING aggregation; owner decides at
phase close.

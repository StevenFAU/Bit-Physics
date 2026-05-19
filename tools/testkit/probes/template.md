# Pre-implementation probe — &lt;sim or component name&gt;

> Template per `docs/architecture.md` § 2.9. Phase 0 Block 1 ships this
> template; Block 8 (RD-2D) lands the first concrete report at
> `tools/testkit/probes/reports/reaction-diffusion-2d.md`. Later sims and
> components add their own.

> **Cat 4 verifier code lives at** `tools/integrity/integrity/cat4_draft_time/`
> (Block 5), not here. This directory holds templates and per-sim probe
> reports only.

## 1. Scope

What this probe substantiates. The probe report is the input to the
implementation prompt; the implementer reads the probe rather than
re-deriving facts from memory.

## 2. API surfaces consumed

For each common-* module or testkit module the sim/component will import,
list:

- Module path (e.g., `common/common-ts/src/index.ts`).
- Public symbols imported (verbatim from current source).
- Signature snippet (grep-verified).
- Commit SHA of the source at probe time.

Each entry must be grep-verifiable; INFERENCEs are forbidden in this
section.

## 3. Upstream citations

For each vendored upstream the sim/component cites:

- `references/<name>/` path.
- Pinned SHA (verified at probe time).
- Specific file/line citations.
- License (verified at probe time).

## 4. Test-fixture paths

Every fixture the implementation will produce or consume. Paths must be
resolvable post-implementation; pre-implementation, declare the planned
path.

## 5. Public types / functions / structs exported

The public API the implementation will export. Used by the corresponding
Cat 2 (contract verification) check.

## 6. FACT / INFERENCE tagging

Every concrete claim in this report is tagged. Probe reports are
load-bearing inputs to the implementer; INFERENCE without a backing FACT
is a Cat 5 (provenance) failure.

## 7. Provenance

- Probe author / agent identity.
- Probe date (UTC ISO 8601, colons replaced with hyphens).
- Commit SHA at probe time.

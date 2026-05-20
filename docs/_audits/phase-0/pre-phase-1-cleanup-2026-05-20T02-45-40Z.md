---
date: 2026-05-20T02-45-40Z
author: phase-0-pre-phase-1-cleanup-agent
phase: 0
artifact: pre-phase-1-cleanup
artifact_id: pre-phase-1-cleanup
verdict: SHIFTED
evidence_paths:
  - docs/phases/phase-0-plan.md
  - docs/phases/phase-1-plan.md
  - docs/phases/phase-2-cross-stack-replication.md
  - docs/phases/phase-3-plan.md
  - docs/phases/phase-4-plan.md
  - docs/phases/phase-5-productization.md
  - docs/phases/phase-6-charter.md
  - docs/architecture.md
  - docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.addendum-2026-05-20T02-45-40Z.md
  - docs/_audits/phase-0/hotfix-preflight-phase-1-2026-05-20T01-34-58Z.md
  - docs/_audits/phase-0/reconciliation-sweep-2026-05-20T02-18-17Z.md
  - tools/dispatch/preflight-phase.py
  - tools/testkit/pyproject.toml
  - tools/integrity/pyproject.toml
  - tools/diagnostics/pyproject.toml
---

# Phase 0 pre-Phase-1 cleanup — close structural debt before Phase 1 dispatch

This is the **fourth and final** Phase 0 post-landing amendment this
session, after the preflight hotfix (commits `b4bb7d4` / `09bfa69`),
the naming reconciliation sweep (`fc793a9` / `c9186cd`), and the
source/vendor consolidation (`156d90c`). It closes three classes of
structural debt that would otherwise leak into Phase 1's dispatch:

1. **LANDING coverage gap** — Phase 0's LANDING didn't run the
   *successor* phase's preflight before declaring CONFIRMED. This is
   the bug class that produced the four preflight-phase-1 bugs the
   operator surfaced on Phase 1's first session. The fix patches
   Phase 1's plan so the same class of failure can't ship at Phase 2
   dispatch time.
2. **Residual naming drift** — the reconciliation sweep covered
   `docs/architecture.md` / `docs/phases/` (partially) /
   `docs/testkit/` / `docs/diagnostics/` / `docs/integrity/`, but
   left untouched references in five later phase plans:
   `docs/phases/phase-1-plan.md` (`bit_physics_*` discussion +
   `bit_physics_common` imports), `docs/phases/phase-3-plan.md`
   (one `tools.testkit.X.Y` CLI invocation), and
   `docs/phases/phase-4-plan.md` (12 `tools.{testkit,diagnostics}.X.Y`
   references including 6 real Python `import` statements).
3. **Stale references to deleted/renamed sources** — the consolidation
   commit deleted `gpu-sims-design-spec-v2.md` and `phase-0-plan.md`
   from the repo root and moved future-phase plans under
   `docs/phases/`. Several documents still pointed at the old paths.

Verdict is **SHIFTED** in the same sense as the prior three audits
this session: code is canonical; documentation amends to match.
Convention-12 (no `git --amend`, no tag-move) is honored — the
`v0.0.0-phase-0` tag remains on commit
`727ffb9b513f77a9a38442b256db3a416547d3c8`.

## 1. Pre-anchor

FACT — `git status` clean and HEAD = `156d90c` (the consolidation
commit) at dispatch start.

FACT — `uv run python tools/dispatch/preflight-phase.py 1` exit 0
(ALL PASSED); `uv run --directory tools/integrity python -m integrity
--all` exit 0 (0 HARD_FAIL, 3 pre-existing SOFT_WARNs — unchanged
since the Phase 0 landing).

## 2. Operator decisions captured at dispatch time

Four ambiguities surfaced before edits; resolved by operator
selection during this session:

1. **Bucket B "Spec anchor" references (15 hits across 6 phase
   plans)** → **Fix**. Each `gpu-sims-design-spec-v2.md` v2.4
   identity reference was rewritten as
   `docs/architecture.md` (v2.4; originally drafted as
   `gpu-sims-design-spec-v2.md`), preserving the version tag.
2. **`phase-4-plan.md` 12-hit `tools.X.Y` structural issue** →
   **Absorb into this dispatch**. The plan's import-namespace
   assumption was a single-file structural defect from a pre-hotfix
   draft. Letting it ship into Phase 4 dispatch would re-create the
   class of bug the preflight hotfix existed to remove.
3. **Addendum form for the Phase 0 landing audit** → **Sibling file
   matching the Block 8 precedent**. The parent landing audit's
   bytes stay frozen (cleanest under the append-only CI gate);
   the addendum is a new sibling at
   `docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.addendum-2026-05-20T02-45-40Z.md`.
4. **Internal self-references to pre-consolidation filenames
   (`phase1.md` x9, `phase-3.md` x6, `phase4-plan.md` x5; total
   20)** → **Carve out: separate follow-on commit**. This dispatch
   stays at its three originally-scoped tasks; the rename-drift
   fixes land in a fourth commit (Commit 3) on top of the Commit
   1 / Commit 2 pair.

## 3. Task 1 — LANDING coverage gap

### 3.1 What was added

FACT — `docs/phases/phase-1-plan.md` § 7.3 (Stage 3 prompt) gained a
new **STEP 5e — Next-phase preflight dry-run** between the
mutation-testing threshold check (STEP 5d) and the phase audit write
(STEP 6). The step runs
`python tools/dispatch/preflight-phase.py 2`, accepts only
`prior-phase-tag:v0.1.0-phase-1` as an expected `[FAIL]` (because the
tag is operator-pushed in STEP 9, post-audit-write), and HALTs on any
other failure with verdict `HALTED-ON-NEXT-PHASE-PRECONDITION`. STEP
6's body-content checklist gained a corresponding required-bullet:
"Next-phase preflight (preflight-phase 2) dry-run outcome
(FACT-tagged)." This is now a precondition for the CONFIRMED verdict.

FACT — A sibling addendum file was created at
`docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.addendum-2026-05-20T02-45-40Z.md`
documenting the gap retroactively. The parent landing audit's bytes
remain frozen; the addendum cross-references the preflight hotfix
audit at
`docs/_audits/phase-0/hotfix-preflight-phase-1-2026-05-20T01-34-58Z.md`
as surfacing evidence. The addendum follows the Block 8
`addendum-<UTC>.md` precedent (sibling file, not in-line append).

### 3.2 Forward effect

INFERENCE — Phase 1's landing will now produce verbatim
preflight-phase-2 stdout in its audit's
`## Next-phase preflight (preflight-phase 2)` subsection. If any
non-`prior-phase-tag` check fails, the landing cannot CONFIRMED; the
operator decides whether to repair preflight or queue a hotfix before
Phase 2 dispatches. The Phase 0 LANDING gap that allowed four
preflight-phase-1 bugs to ship cannot recur with the same shape.

INFERENCE — Phases 2 through 6 will need the equivalent STEP 5e in
their own Stage-3 / landing dispatches. This is queued as an open
item for the respective phase plans (see § 6 below). The convention
is now load-bearing for forward phases via the
`tools/dispatch/preflight-phase.py` script's lines 28–29 doc
("each subsequent phase's landing audit ships its successor's
preflight").

## 4. Task 2 — Residual naming drift sweep

### 4.1 Grep tallies before edits

FACT — Pre-edit grep across `docs/` excluding `docs/_audits/`:
- `bit_physics_testkit\|bit_physics_integrity\|bit_physics_common`:
  7 hits, all in `docs/phases/phase-1-plan.md`.
- `tools\.testkit\.\|tools\.integrity\.\|tools\.diagnostics\.`:
  14 hits — 12 in `docs/phases/phase-4-plan.md`, 1 in
  `docs/phases/phase-3-plan.md`, 1 intentional counter-example in
  `docs/architecture.md:1524` (inside a "(not `…`)" clause; preserved).

### 4.2 Edits applied

| File | Line(s) | Class of edit |
|---|---|---|
| `docs/phases/phase-1-plan.md` | 27, 58, 142 | Naming-convention discussion: replaced `bit_physics_testkit` / `bit_physics_integrity` examples with the actual flat-module names, cross-referencing the reconciliation sweep audit |
| `docs/phases/phase-1-plan.md` | 505, 569, 606, 638 | `bit_physics_common` (4 sites — 2 path strings + 2 `from … import …`) → `common_py` matching the post-sweep Appendix D.1 row 2409 |
| `docs/phases/phase-3-plan.md` | 329 | `python -m tools.testkit.equivalence.harness` → `python -m equivalence.harness` (matches testkit's flat-module wheel config) |
| `docs/phases/phase-4-plan.md` | 2701, 2702, 2704, 2731, 2733, 2735, 2759 | `tools.testkit.X.Y` (doc refs + Python `import` + `python -m`) → bare flat-module names (`code_verification.X`, `render_similarity`, `equivalence.variant.X`, `schemas`) |
| `docs/phases/phase-4-plan.md` | 2706, 2707, 2737, 2740 | `tools.diagnostics.tier2.X.Y` → `diagnostics.tier2.X.Y` (the `tools.diagnostics.` prefix dropped, but `diagnostics.` retained because the wheel ships one module `diagnostics` per `tools/diagnostics/pyproject.toml`, NOT flat tier modules) |

INFERENCE — The `diagnostics.tier2.X.Y` treatment is asymmetric to
testkit's flat layout because the wheel configs differ:
`tools/testkit/pyproject.toml` declares
`packages = ["capture", "code_verification", "determinism",
"equivalence", "golden", "property"]` (six bare top-level modules),
while `tools/diagnostics/pyproject.toml` declares
`packages = ["diagnostics"]` (one module with internal `tier1` and
`tier2` subdirectories). An over-strip during the bulk sed produced
bare `tier2.X.Y` for two lines (2737, 2740); a follow-up Edit
restored the `diagnostics.` prefix on those lines plus the
doc-cross-references at 2706–2707. The other dropped-prefix
substitutions for testkit modules were correct as-is.

### 4.3 Post-edit re-grep

FACT — `grep -rn "bit_physics_*" docs/ --exclude-dir=_audits` →
CLEAN (zero hits).

FACT — `grep -rn 'tools\.\(testkit\|integrity\|diagnostics\)\.'
docs/ --exclude-dir=_audits` → one hit at
`docs/architecture.md:1524` (the intentional counter-example).

## 5. Task 3 — Stale references to deleted root-level spec files

### 5.1 Grep tallies before edits

FACT — Pre-edit grep across the repo (excluding `docs/_audits/`,
`.git/`, and `tools/` code per dispatch hard rules):
- 7 genuinely-stale path references (bucket A)
- 15 "Spec anchor" / "Source of truth" identity references
  (bucket B)
- 2 code-level references in `tools/` — OUT OF SCOPE (dispatch
  rule: no `tools/` modifications)

### 5.2 Edits applied (buckets A + B)

| File | Line(s) | Class of edit |
|---|---|---|
| `docs/phases/phase-0-plan.md` | 4 | "Subject spec" header rewritten to declare `docs/architecture.md` as the sole canonical location |
| `docs/phases/phase-0-plan.md` | 52 | Source-of-truth-pointers table "Design spec" row (the KNOWN stale ref): now points at `docs/architecture.md` only, with reconciliation-sweep cross-reference |
| `docs/phases/phase-0-plan.md` | 413 | Directory-tree line referring to `design-spec-v2.md`: replaced with a clarifying comment that `architecture.md` IS the spec |
| `docs/phases/phase-0-plan.md` | 679 | Block 1's "Vendor the design spec" narrative: clarified that the upstream draft was retired post-Phase-0 |
| `docs/phases/phase-0-plan.md` | 1749 | "Source of truth" with the wrong vendored-at path: updated to `docs/architecture.md` |
| `docs/phases/phase-0-plan.md` | 1868 | Decision table row 3 ("Design spec in-repo location"): `docs/design-spec-v2.md` → `docs/architecture.md` with explanatory note |
| `docs/phases/phase-0-plan.md` | 1243, 1293, 1344, 1414, 1533, 1582, 1639 | Block N's "Source of truth" lines: identity references re-pointed at `docs/architecture.md` |
| `docs/phases/phase-1-plan.md` | 6 | "Spec anchor" header → `docs/architecture.md` (v2.4; originally drafted as `gpu-sims-design-spec-v2.md`) |
| `docs/phases/phase-2-cross-stack-replication.md` | 5 | Same as phase-1 |
| `docs/phases/phase-3-plan.md` | 8 | "Spec authority" header → same form |
| `docs/phases/phase-4-plan.md` | 5 | "Spec anchor" header → same form |
| `docs/phases/phase-5-productization.md` | 9 | Same |
| `docs/phases/phase-6-charter.md` | 5 | Same |
| `docs/architecture.md` | 1427 | Self-reference inside the spec rewritten: "this spec (`docs/architecture.md`)" |

### 5.3 Preserved hits (intentional, NOT edited)

- `docs/architecture.md:1524`: `tools.testkit.code_verification.gradient.harness` inside `(not `…`)` counter-example. Preserved as the reader-facing "don't write this" illustration.
- `docs/phases/phase-2-cross-stack-replication.md:2714`: historical narrative explicitly documenting "draft time" → "post-Phase-0" path migration (`/mnt/user-data/uploads/gpu-sims-design-spec-v2.md` → `/docs/architecture.md`). This IS the migration record; rewriting would erase load-bearing history.
- `docs/phases/phase-2-cross-stack-replication.md:2783`: historical-audit narrative describing a past section-by-section review of the spec by its draft-time name. Preserved as historical record.
- `docs/phases/phase-0-plan.md:679`: the original-title form `gpu-sims-design-spec-v2.md` is preserved INSIDE the rewritten Block-1 narrative as the upstream-draft identity. The rewrite makes the historical relationship explicit; it does not pretend the original-title file never existed.

### 5.4 Out of scope (dispatch hard rule)

- `tools/testkit/property/__init__.py:11` — comment mentions
  `phase-0-plan.md § 7.3 deliverable 3`. Code under `tools/`; not
  modified per hard rule.
- `tools/testkit/mutation/mutmut-config.toml:3` — comment mentions
  `phase-0-plan.md § 7.5 deliverable 13`. Same.

These remain available as known shorthand-style references; they
resolve to the correct file at `docs/phases/phase-0-plan.md` by
agent convention.

## 6. Verification

FACT — Post-edit grep for all three task patterns is clean except for
the four intentionally-preserved hits documented in § 4.3 and § 5.3
above.

FACT — `uv run python tools/dispatch/preflight-phase.py 1` exit 0
(ALL PASSED).

FACT — `uv run --directory tools/integrity python -m integrity --all`
exit 0 (0 HARD_FAIL, 3 SOFT_WARN — identical to pre-dispatch state;
no new findings).

FACT — `git status` clean working tree before commit (verified at
each task boundary; final state is 8 modified files + 1 new audit
file).

## 7. Conventions honored

- **Pattern N (Appendix E)** — narrowest-possible corrections per
  occurrence; the underlying naming-convention rationale (§ 7.11
  PEP 503/625 alignment) is preserved verbatim, only the examples
  amended.
- **Append-only audits (spec § 7.5)** — the Phase 0 landing audit's
  bytes remain frozen. The addendum is a sibling file (Block 8
  precedent). The current dispatch's audit (this file) and the
  ledger append are the only new entries under `_audits/`.
- **Convention-12 (no `git --amend`, no tag-move)** — honored. Three
  new commits append to the linear history; the `v0.0.0-phase-0`
  tag is unmoved.
- **Convention M (re-anchor before edit)** — re-anchored on
  prior three audits, Phase 1 plan's existing Stage 3 structure,
  and the current wheel configs before authoring.
- **FACT / INFERENCE / SHIFTED tagging** — applied throughout.
- **Append-only ledger** — `ledger.md` gains one new line for this
  dispatch (Commit 2; § 8 below).
- **Conventional Commits** — Commits 1 and 2 use the
  `docs(phase-1): …` / `docs(audit): …` forms; Commit 3 (the
  carved-out rename-drift fix) uses `docs(spec): …`.

## 8. Ledger entry

To be appended to `docs/_audits/phase-0/ledger.md` (Commit 2):

```
pre-phase-1-cleanup multi-task SHIFTED <commit-1-sha> docs/_audits/phase-0/pre-phase-1-cleanup-2026-05-20T02-45-40Z.md
```

The `cue` file is unchanged — Phase 0 remains `phase-0-closed`.
This is the fourth post-landing amendment after the
`v0.0.0-phase-0` tag; none reopen the phase.

## 9. Open items / forward propagation

- **Successor-preflight step in later phase plans.** STEP 5e was
  added only to `docs/phases/phase-1-plan.md`. Phases 2 through 6
  need the equivalent step (run `preflight-phase.py N+1` before
  CONFIRMED is written). Queue: amend each plan when it is touched
  next by an operator-dispatched session, or do a single
  `docs(spec): propagate next-phase preflight gate to phases 2-6`
  follow-up dispatch.
- **Internal self-references to pre-consolidation filenames** (the
  ~20 `phase1.md` / `phase-3.md` / `phase4-plan.md` hits). Resolved
  by operator decision into a separate Commit 3 in this session;
  see § 2 decision #4.
- **`docs/phases/phase-2-cross-stack-replication.md` body-text
  references at lines 2714 and 2783.** Preserved as historical
  migration narrative; a future maintainer may decide to
  consolidate the historical record after Phase 2 lands.
- **`tools/` code-level shorthand refs to `phase-0-plan.md`**
  (`tools/testkit/property/__init__.py:11`,
  `tools/testkit/mutation/mutmut-config.toml:3`). Out of scope per
  dispatch hard rule; resolve to the correct file by agent
  convention. Optional cleanup if a Phase 1 dispatch touches those
  files anyway.

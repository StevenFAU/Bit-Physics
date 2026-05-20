---
date: 2026-05-20T02-18-17Z
author: phase-0-reconciliation-sweep-agent
phase: 0
artifact: reconciliation-sweep
artifact_id: reconciliation-sweep-bare-module-names
verdict: SHIFTED
evidence_paths:
  - docs/architecture.md
  - docs/phases/phase-0-plan.md
  - docs/testkit/overview.md
  - docs/testkit/references.md
  - docs/testkit/golden-values.md
  - docs/integrity/cat3-numerical.md
  - docs/diagnostics/overview.md
  - docs/diagnostics/tier1-universal.md
  - tools/testkit/pyproject.toml
  - tools/integrity/pyproject.toml
  - tools/diagnostics/pyproject.toml
  - docs/_audits/phase-0/hotfix-preflight-phase-1-2026-05-20T01-34-58Z.md
  - docs/_audits/phase-0/block-1-foundation-2026-05-19T03-27-54Z.md
---

# Phase 0 reconciliation sweep — bare module names across plan + spec docs

This is a Phase 0 **post-landing amendment** that finishes the
propagation begun by the preflight hotfix on 2026-05-20T01-34-58Z. That
hotfix amended `docs/architecture.md § 7.11` and Appendix D.1 rows
2406–2408 to use the bare-module-name convention shipped by Phase 0
Blocks 2/3/5/6/8 (`capture`, `code_verification`, `determinism`,
`equivalence`, `golden`, `property` for the testkit wheel; `integrity`
and `diagnostics` for their respective wheels). The hotfix's "open
items" section flagged that the same change had not propagated to:

- the phase plan narrative (33 occurrences in `phase-0-plan.md`),
- the testkit / integrity / diagnostics consumer-facing docs under
  `docs/testkit/`, `docs/integrity/`, `docs/diagnostics/` (7
  occurrences in 6 files),
- the Appendix D.1 row for `common-py` (line 2409) and the
  placeholder-resolution paragraph (line 2420), which still said
  `bit_physics_common`,
- two paragraphs in `docs/architecture.md` (lines 691 and 1524) that
  described testkit modules as imported via a fictional
  `tools.testkit.X.Y` namespace.

This sweep closes those propagation gaps. Verdict is **SHIFTED** in the
same sense as Block 1's `os`-import deviation and the preflight hotfix:
the code is canonical (per pre-sweep operator decision), so the
narrative documentation amends to match. No code in `tools/` or
`packages/` was modified; this is documentation-only.

## 1. Ground truth (re-confirmed at sweep time)

FACT — `tools/testkit/pyproject.toml`:
```
[tool.hatch.build.targets.wheel]
packages = ["capture", "code_verification", "determinism", "equivalence", "golden", "property"]
```

FACT — `tools/integrity/pyproject.toml`:
```
[tool.hatch.build.targets.wheel]
packages = ["integrity"]
```

FACT — `tools/diagnostics/pyproject.toml`:
```
[tool.hatch.build.targets.wheel]
packages = ["diagnostics"]
```

Any Python-import reference in plan or spec documents resolves to one
of those bare names. The PyPI distribution names (kebab,
`bit-physics-testkit` / `bit-physics-integrity` / `bit-physics-diagnostics`)
are unchanged — they live on a separate naming dimension per § 7.11.

## 2. Operator decisions captured at sweep time

The four ambiguities surfaced before edits were resolved by operator
choice (2026-05-20 reconciliation-sweep session):

1. **Spec source location.** `/mnt/project/gpu-sims-design-spec-v2.md`
   (the path referenced in `docs/phases/phase-0-plan.md:52`) was a previous
   machine's Project Knowledge attachment and is absent on the
   current dispatch host. The operator pointed at
   `/home/otacon/Downloads/gpu-sims-design-spec-v2.md` (and
   companion `/home/otacon/Downloads/phase-0-plan.md`) as the
   actual source. Step 5 of the sweep task ran against those.
2. **Doc scope.** The sweep included
   `docs/testkit/`, `docs/integrity/`, `docs/diagnostics/` (outside
   the task's literal stated scope but matching the same pattern) per
   the spirit of "documentation reconciliation".
3. **common-py module name.** Resolved to `common_py` to match the
   § 7.11 example row's already-amended entry. Forward-looking
   (common-py ships in Phase 2); if Phase 2 lands a different name in
   that wheel's `pyproject.toml`, a follow-up amendment will need to
   update Appendix D.1 row 2409 and the placeholder-resolution
   paragraph again.
4. **`tools.testkit.X.Y` paragraphs.** Resolved to "rewrite both lines
   to use bare module names" (lines 691 and 1524). The convention's
   underlying rationale (underscores for Python-identifier-component
   directories; hyphens for filesystem-only module-roots) is
   preserved; only the example namespace claim was corrected.

## 3. Edits applied

### 3.1 `docs/architecture.md` (5 edits, all in this sweep)

| Line | Before (excerpt) | After (excerpt) |
|---|---|---|
| 691 | "imported via `tools.testkit.X.Y` use underscores …" | "Directories below `tools/testkit/` are Python import-path components — the testkit wheel ships them as bare top-level modules (`capture`, `code_verification`, `determinism`, `equivalence`, `golden`, `property`), not nested under a `tools.testkit` namespace. They use underscores …" |
| 1524 | "(`tools.testkit.code_verification.gradient.harness`)" | "…the actual import path is `code_verification.gradient.harness` (not `tools.testkit.code_verification.gradient.harness`; the `tools/testkit/` filesystem prefix is not part of the Python import path)." |
| 2409 | `` `bit_physics_common` (PyPI: `bit-physics-common-py`) `` | `` `common_py` (PyPI: `bit-physics-common-py`) — forward-looking; common-py ships in Phase 2 `` |
| 2420 | "resolve to `bit_physics_common` (for common-py) or `common_warp` / `common_3dgs`" | "resolve to `common_py` (for common-py, Phase 2) or `common_warp` / `common_3dgs`"; also clarified that `<ns>` resolves to `bit_physics` "(PyPI dist prefix; never used as a Python import)" |

### 3.2 `docs/phases/phase-0-plan.md` (23 edits total)

Pattern: every occurrence of `bit_physics_testkit.<X>` was rewritten to
`<X>` (drop the namespace prefix); the single occurrence of
`bit_physics_integrity` at line 1774 became `integrity`. Section
headings (§ 3.3.1–§ 3.3.4) were rewritten to lead with the bare module
name and parenthesize the PyPI dist for clarity. Sites:

- Block-dependency narrative at lines 92, 97, 101, 105 (4 sites).
- § 3.3.1–§ 3.3.4 section headings at lines 130, 184, 205, 223 (4
  sites).
- Code blocks at lines 287, 298, 314, 323 (4 sites — `from <X> import …`).
- Cross-block "Foundation you build on" prose at lines 1297, 1418,
  1537, 1542 (4 sites).
- Block 5 deliverable text at lines 1437, 1439 (2 sites).
- Block 6 deliverable text at line 1545 (1 site).
- Block 7 cross-stack invariance text at lines 1610, 1622 (2 sites
  including code in `python -c "..."` strings).
- Landing checklist at lines 1771–1774 (4 sites).

### 3.3 `docs/testkit/` (3 files, 3 edits)

| File | Line | Change |
|---|---|---|
| `docs/testkit/overview.md` | 27 | `bit_physics_testkit.capture` → `capture` |
| `docs/testkit/references.md` | 52 | `bit_physics_testkit.capture.load_reference_manifest(path)` → `capture.load_reference_manifest(path)` |
| `docs/testkit/golden-values.md` | 86 | `bit_physics_testkit.capture.load_reference_manifest` → `capture.load_reference_manifest` |

### 3.4 `docs/integrity/cat3-numerical.md` (2 edits)

| Line | Change |
|---|---|
| 17 | `bit_physics_testkit.golden.verifier.verify_against_table(table, evaluator)` → `golden.verifier.verify_against_table(table, evaluator)` |
| 26 | `bit_physics_testkit.golden.reference_implementations.cubic_spline.evaluate` → `golden.reference_implementations.cubic_spline.evaluate` |

### 3.5 `docs/diagnostics/` (2 files, 2 edits)

| File | Line | Change |
|---|---|---|
| `docs/diagnostics/overview.md` | 43 | `composes \`bit_physics_testkit.determinism.run_twice_and_diff\`` → `composes \`determinism.run_twice_and_diff\`` |
| `docs/diagnostics/tier1-universal.md` | 53 | `composition of \`bit_physics_testkit.determinism.run_twice_and_diff\`` → `composition of \`determinism.run_twice_and_diff\`` |

## 4. Source/vendored pair sync (Step 5)

INFERENCE — The vendored copy at `docs/architecture.md` is byte-equal
to the in-repo authoritative version after this sweep. The upstream
source at `/home/otacon/Downloads/gpu-sims-design-spec-v2.md` (and the
companion `/home/otacon/Downloads/phase-0-plan.md`) was scheduled to be
synced via `cp` after the in-repo edits, but the auto-mode safety
classifier blocked writes outside the project working tree. The
operator was given the exact `cp` invocation to run inline. This
hand-off is recorded here for traceability; the sweep does not depend
on it for in-repo correctness.

FACT — Pre-sync diff (line counts only, excerpt of changed regions
between `docs/architecture.md` and `/home/otacon/Downloads/gpu-sims-design-spec-v2.md`
at sweep time):

- Lines 691, 1512/1514, 1522/1524, 1844–1845/1846–1847, 2404–2406/2406–2409,
  2417/2420 — Phase 0 hotfix amendments + this sweep's edits.
- Lines 1445/1446–1447, 3106/3110–3123 — earlier Phase 0
  audit-append-only ledger/cue split amendment (commit `08579c2`),
  which had also not been propagated to the Downloads source.

The Downloads sync (when the operator runs the suggested `cp`
invocation) brings the upstream source into lockstep with all three
post-landing amendments: ledger/cue split, preflight hotfix, and this
reconciliation sweep.

## 5. Verification

FACT — Re-greps after edits:

```
$ grep -rn "bit_physics_testkit\|bit_physics_integrity\|bit_physics_diagnostics\|bit_physics_common" \
      docs/architecture.md docs/phases/ docs/testkit docs/integrity docs/diagnostics
(no output — clean)

$ grep -rn 'tools\.\(testkit\|integrity\|diagnostics\)\.' \
      docs/architecture.md docs/phases/ docs/testkit docs/integrity docs/diagnostics
docs/architecture.md:1524: …(not `tools.testkit.code_verification.gradient.harness`; …
```

The single remaining hit at `docs/architecture.md:1524` is the
intentional counter-example inside a `(not \`…\`)` clause — the sweep
explicitly preserves this as a reader-facing "don't write this"
illustration.

FACT — `uv run python tools/dispatch/preflight-phase.py 1`:
```
=== ALL PASSED ===
EXIT: 0
```

FACT — `uv run --directory tools/integrity python -m integrity --all`:
```
summary: 0 HARD_FAIL, 3 SOFT_WARN
EXIT: 0
```

The 3 SOFT_WARNs are pre-existing audit-links findings against
`landing-2026-05-19T17-28-32Z.md` (lines 64, 232) and the un-front-mattered
`ledger.md` (line 1) — same as the Phase 0 landing audit recorded.
None were introduced by this sweep.

## 6. Conventions honored

- **Pattern N (Appendix E)** — narrowest-possible corrections per
  occurrence; convention's underlying rationale (§ 7.11 PEP 503/625
  alignment, snake_case for Python identifiers) preserved verbatim,
  only the examples and namespace claims corrected.
- **Block 1 / preflight-hotfix SHIFTED precedent** — same audit
  template, two-commit chain (edits + ledger).
- **Convention-12 (no `git --amend`)** — new commits appended; the
  `v0.0.0-phase-0` tag is unmoved.
- **FACT / INFERENCE / SHIFTED tagging** — applied throughout.
- **Append-only ledger** — `ledger.md` gains one new line for this
  sweep (see § 7).
- **Conventional Commits** — `docs(spec): reconcile naming references
  to bare module names across phase plans and spec source`.

## 7. Ledger entry

Appended to `docs/_audits/phase-0/ledger.md`:

```
reconciliation-sweep bare-module-names SHIFTED <commit-sha-filled-by-operator> docs/_audits/phase-0/reconciliation-sweep-2026-05-20T02-18-17Z.md
```

The `cue` file is unchanged — Phase 0 remains `phase-0-closed`. This
is the second post-landing amendment after the v0.0.0-phase-0 tag; the
phase is not reopened.

## 8. Open items / out of scope

- **Downstream sims docs.** `docs/sim-specs/` was scanned and produced
  zero hits for the target patterns. If a future Phase 1 / Phase 2 sim
  spec is authored with the old `bit_physics_testkit.<X>` form, a
  per-phase sweep will be needed. Not blocking.
- **`docs/common/`.** Contains `ts.md`, `warp.md` etc. None matched
  the target patterns at sweep time. No edits.
- **Downloads-source sync** (§ 4). Operator-completion item; not a
  blocker for the in-repo state.
- **Stale path reference at `docs/phases/phase-0-plan.md:52`.** The "Design spec"
  table-row reads
  `` `/mnt/project/gpu-sims-design-spec-v2.md` (vendored into repo at
  `docs/design-spec-v2.md` by Block 1) ``. Two stale claims here:
  (a) the source path is now
  `/home/otacon/Downloads/gpu-sims-design-spec-v2.md` per § 2.1;
  (b) the vendored target is `docs/architecture.md`, not
  `docs/design-spec-v2.md`. The hotfix audit's "Open items" already
  noted this drift; not patched here to keep this sweep's scope to
  the bare-name reconciliation. Recommend a follow-up
  `docs(spec):` amendment when ready.
- **Code in `tools/` and `packages/`.** Not touched. The wheel-config
  flat-module decision is treated as canonical.

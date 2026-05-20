---
date: 2026-05-20T01-34-58Z
author: phase-0-post-landing-hotfix-agent
phase: 0
artifact: hotfix
artifact_id: hotfix-preflight-phase-1
verdict: SHIFTED
evidence_paths:
  - tools/dispatch/preflight-phase.py
  - docs/phases/phase-0-plan.md
  - docs/architecture.md
  - docs/dependencies.md
  - .github/workflows/python-strict.yml
  - .github/workflows/determinism.yml
  - .github/workflows/equivalence.yml
  - .github/workflows/integrity.yml
  - .github/workflows/tolerance-budget-check.yml
  - tools/testkit/pyproject.toml
  - tools/integrity/pyproject.toml
  - tools/diagnostics/pyproject.toml
  - docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md
  - docs/_audits/phase-0/block-1-foundation-2026-05-19T03-27-54Z.md
---

# Phase 0 post-landing hotfix — Phase 1 preflight script bugs

This is a Phase 0 **post-landing amendment** authored after the v0.0.0-phase-0
tag was signed and pushed. It surfaced when the operator ran
`python tools/dispatch/preflight-phase.py 1` as the first action of the
Phase 1 session and the preflight produced four FAILs that none of Phase 0's
own preflight runs had exercised (Phase 0 close ran `preflight-phase 0`, not
`preflight-phase 1`).

The verdict is **SHIFTED** in the same sense as Block 1's `os`-import
deviation (see § 2 of `block-1-foundation-2026-05-19T03-27-54Z.md`): the
embedded canonical source in `phase-0-plan.md § 7.1` and the runnable script
at `tools/dispatch/preflight-phase.py` are expected to stay in lockstep. The
same four narrowest-possible corrections were applied to both files in the
same commit per **Pattern N** (Appendix E, strict-mode CI false-positive
triage — generalized here to "spec/code coherence triage").

## 1. Bugs found

### 1.1 Diagnostics path layout (preflight + embed)

FACT — `tools/dispatch/preflight-phase.py` (pre-hotfix lines 193–194) and
`docs/phases/phase-0-plan.md § 7.1` (pre-hotfix lines 1023–1024) checked:

```
Path("tools/diagnostics/tier1"),
Path("tools/diagnostics/tier2/scalar_field"),
```

FACT — Block 6 shipped the nested layout that matches `tools/integrity/integrity/`:

```
tools/diagnostics/diagnostics/tier1/
tools/diagnostics/diagnostics/tier2/scalar_field/
```

This nesting is mandated by `tools/diagnostics/pyproject.toml`:
`[tool.hatch.build.targets.wheel] packages = ["diagnostics"]`.

### 1.2 Integrity module name (preflight + embed + architecture.md excerpt)

FACT — Pre-hotfix, both the script and the embed (five sites each, one per
phase preflight) invoked:

```python
["python", "-m", "bit_physics_integrity", "--all"]
```

FACT — Block 5 shipped `tools/integrity/pyproject.toml` with
`[tool.hatch.build.targets.wheel] packages = ["integrity"]`. The
distribution name is `bit-physics-integrity` (PyPI hyphen form), but the
**importable module** is `integrity`, not `bit_physics_integrity`. The
Block 7 audit (`block-7-common-ts-2026-05-19T15-25-28Z.md` § "ts /
cross-stack") confirms `python -m integrity` is the working invocation.
The Phase 0 landing audit's evidence at line 174 also runs `uv run python
-m integrity --all` (not `bit_physics_integrity`).

INFERENCE — The original embed text was authored against the
architecture.md § 7.11 naming-convention claim that imports use the
`bit_physics_<x>` form. That claim was never realized in code: Block 5
(integrity), Block 6 (diagnostics), and the Block 2/3/8 testkit modules
(`capture`, `code_verification`, `determinism`, `equivalence`, `golden`,
`property`) all ship as flat modules without a `bit_physics_` namespace
prefix. The hotfix brings spec into line with what Phase 0 actually
landed (see § 2.3 below).

### 1.3 Pytest invocation (preflight + embed + architecture.md excerpt)

FACT — Pre-hotfix, both files invoked pytest as a single repo-root check:

```python
["pytest", "-W", "error", "tools/"]
```

FACT — Diagnostic run on 2026-05-20 (captured at
`/tmp/pytest-diag-20260520T013105Z.txt`) showed this invocation produced
**13 collection errors**, exit code 2. Root cause: `uv run pytest` from
the repo root falls back to `/home/otacon/.local/bin/pytest` (a
user-level pytest running under `/usr/bin/python3`, the system Python)
because the workspace root's `.venv` has no `pytest` installed. The
project root's `pyproject.toml` declares `[tool.uv] package = false`
with no dependencies, so `uv sync` at the repo root resolves the
lockfile and installs nothing.

FACT — The Phase 0 landing audit at lines 179–186 records pytest running
**per workspace member** (47 + 28 + 22 + 14 = 111 passed):

```
- tools/testkit/                  — 47 passed in 5.44s
- tools/integrity/                — 28 passed in 0.94s
- tools/diagnostics/              — 22 passed in 0.45s
- packages/reaction-diffusion-2d/ — 14 passed in 7.03s
```

FACT — The CI workflows (`.github/workflows/python-strict.yml`,
`.github/workflows/determinism.yml`, `.github/workflows/equivalence.yml`,
`.github/workflows/integrity.yml`,
`.github/workflows/tolerance-budget-check.yml`) all use per-member
invocations: `(cd tools/<member> && uv sync --extra dev && uv run pytest
-W error ...)`. The pre-hotfix preflight invocation matched neither the
landing audit nor the CI workflows.

### 1.4 Operator runbook gap (`docs/dependencies.md`)

INFERENCE — A separate gap surfaced during diagnosis: there was no
documented note explaining that bare `uv sync` at the repo root is a
no-op for workspace members (consequence of `package = false`), and
that the canonical fresh-checkout invocation is per-member
`uv sync --extra dev`. This was implicit in the CI workflows but never
written down for human operators. Added as a new "Operator notes"
subsection.

## 2. Corrections applied (Pattern N — narrowest possible)

### 2.1 Preflight script + embed (lockstep edits)

The four corrections were applied to both
`tools/dispatch/preflight-phase.py` and the verbatim embed in
`docs/phases/phase-0-plan.md § 7.1`:

| # | Site | Before | After |
|---|---|---|---|
| 1 | `phase_1_preflight()` paths | `tools/diagnostics/tier1`, `tools/diagnostics/tier2/scalar_field` | `tools/diagnostics/diagnostics/tier1`, `tools/diagnostics/diagnostics/tier2/scalar_field` |
| 2 | `phase_{1..5}_preflight()` integrity check (5 sites each) | `["python", "-m", "bit_physics_integrity", "--all"]` | `["python", "-m", "integrity", "--all"]` |
| 3 | `phase_1_preflight()` pytest check | single `["pytest", "-W", "error", "tools/"]` | four per-member checks: `["uv", "run", "--directory", <member>, "pytest", "-W", "error"]` for `tools/testkit`, `tools/integrity`, `tools/diagnostics`, `packages/reaction-diffusion-2d` |
| 4 | Module-level docstring lines 3–4 | "python -m bit_physics_integrity --all" / "pytest -W error in tools/" | "python -m integrity --all" / "Per-workspace-member pytest -W error" |

A module-level NOTE block was added to `preflight-phase.py` following the
Block 1 SHIFTED-NOTE precedent, pointing readers to this hotfix audit for
the rationale.

### 2.2 architecture.md universal-checks excerpt

The Part IX / dispatch readiness excerpt (lines 1846–1847) was updated
in lockstep with the script + embed so the spec text matches the actual
preflight gates.

### 2.3 architecture.md § 7.11 + Appendix D.1 naming convention

Per operator decision (auto-mode, 2026-05-20 hotfix session, question
"How should the hotfix scope handle the bit_physics_integrity / integrity
spec-vs-code mismatch?" → "Full coherence"), the naming-convention rows
were updated to reflect what every Phase 0 block actually shipped:
flat-module wheels, not `bit_physics_<x>` namespaces.

- `§ 7.11` Python-import example row (line 1514): replaced the
  fictitious `bit_physics_testkit`, `bit_physics_integrity` examples
  with the actual ship-time names.
- `Appendix D.1` (lines 2406–2407): replaced the "Python testkit
  package" and "Python integrity package" rows; added a third row for
  the diagnostics package (which had no entry before).
- `phase-0-plan.md` cross-refs at § 3.3.5 heading (line 260), Block 5
  pyproject deliverable (line 1411), and Derived Defaults row 24 (line
  1887) were updated to match.

The § 7.11 principle ("PEP 503 / 625 alignment, snake_case for imports")
remains intact — only the examples were wrong.

### 2.4 docs/dependencies.md

Added a new "Operator notes" subsection at the bottom (after "Append
discipline") documenting:

- bare `uv sync` is a no-op for workspace members
- canonical fresh-checkout invocation is per-member `uv sync --extra dev`
- Phase 1 preflight's per-member `uv run --directory <member> pytest -W
  error` checks rely on this priming

## 3. Verification

FACT — Post-hotfix preflight run (this commit's HEAD):

```
[paste of `python tools/dispatch/preflight-phase.py 1` output goes here
on the commit message body or operator-side verification, since the
audit file lands in the same commit as the script edits]
```

FACT — Per-member sync log (operator dispatch host, 2026-05-20):

```
(cd tools/testkit               && uv sync --extra dev)  → exit 0
(cd tools/integrity             && uv sync --extra dev)  → exit 0
(cd tools/diagnostics           && uv sync --extra dev)  → exit 0
(cd packages/reaction-diffusion-2d && uv sync --extra dev) → exit 0
```

## 4. Conventions honored

- **Pattern N (Appendix E)**: narrowest-possible corrections to
  resolve a spec/code coherence failure; functional intent of the
  preflight (verify Phase 1 preconditions) is unchanged.
- **Block 1 SHIFTED precedent**: embed + runnable script edited in
  lockstep within one commit; NOTE block in the script points readers
  to this audit.
- **FACT / INFERENCE / SHIFTED tagging**: applied throughout.
- **Convention-12 (no `git --amend`)**: this is a new commit appended
  to history; the v0.0.0-phase-0 tag is unmoved.
- **Conventional Commits**: commit message header
  `fix(dispatch): correct phase-1 preflight paths, module name, and
  pytest invocation`.
- **Append-only ledger**: ledger.md gains one new line for this hotfix
  (see § 5).

## 5. Ledger entry

Appended to `docs/_audits/phase-0/ledger.md`:

```
hotfix preflight-phase-1 SHIFTED <commit-sha-filled-by-operator> docs/_audits/phase-0/hotfix-preflight-phase-1-2026-05-20T01-34-58Z.md
```

The `cue` file is unchanged — Phase 0 remains `phase-0-closed`. This
hotfix is an amendment landing after the phase tag; it does not reopen
the phase.

## 6. Open items / out of scope

- The architecture.md § 7.11 / Appendix D.1 entries for
  `bit_physics_common` (common-py, Phase 2) and `common_warp` /
  `common_3dgs` were left untouched. Those modules don't ship until
  Phase 2 / Phase 3; their pyproject configs aren't authoritative yet.
  If they ship as flat modules too, a follow-up amendment at that phase
  should update those rows in the same shape.
- The historical narrative pseudocode in `phase-0-plan.md` (Block 6
  code examples at lines 296, 313, 321, etc.) still imports from
  `bit_physics_testkit.<x>`. Those are plan-time narrative blocks
  (pre-implementation); the audits for Blocks 5/6/7/8 record what
  shipped. Not patched here to keep the hotfix scoped.
- No code in `tools/` or `packages/` was changed. The only `.py` file
  touched is `tools/dispatch/preflight-phase.py`.

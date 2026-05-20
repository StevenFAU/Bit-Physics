---
date: 2026-05-20
author: phase1-agent
phase: 1
stage: 1-infrastructure
verdict-state: complete
head_sha_at_checkpoint: 71d4a9e7233f1c3bed2ad18a680d61b9dfe06fc0
supersedes: docs/_audits/phase-1/stage-1-checkpoint-2026-05-20T04-22-10Z.md
subject: Phase 1 Stage 1 (Infrastructure) — final closing checkpoint
evidence_paths:
  - docs/_audits/phase-1/stage-1-verification-2026-05-20T12-10-58Z.md
  - docs/_audits/phase-1/stage-1-verification-2026-05-20T12-10-58Z.common-cpp-test-output.txt
  - tools/integrity/integrity/cat4_draft_time/grammars/
  - tools/integrity/tests/test_cat4_phrase_in_file.py
  - tools/integrity/tests/test_cat4_api_shape.py
  - docs/integrity/cat4-draft-time.md
---

# Phase 1 Stage 1 — final closing checkpoint

## 1. Summary (FACT)

This checkpoint **supersedes**
[`docs/_audits/phase-1/stage-1-checkpoint-2026-05-20T04-22-10Z.md`](./stage-1-checkpoint-2026-05-20T04-22-10Z.md)
(prior verdict: `partial-needs-continuation`). The prior checkpoint
documents the bulk of Stage 1's work (Task 1.0 cross-phase audit
replay, Task 1.1 tolerance-budget carryover, common-cpp / common-py /
tier2 ×3 substacks); see § 6 of that document for the running shifts
register inherited here.

This continuation session closes Stage 1 by landing:

- (Part 1) a banked verification spot-check of common-cpp's test
  state; verdict PASS — 8 of 8 doctest test cases pass, 35 of 35
  assertions pass, 0 failing, 0 skipped, 0 deferred.
- (Part 2) **B1** — Cat 4 grammars (b) `<phrase "X" in Y>` and (c)
  `<API X has shape Y>` per charter § 1.7 R8 amendments, including
  registry extension, 14 new tests (all passing), and documentation.

Verdict-state: **complete**. Stage 1 is ready for Stage 2 dispatch.

## 2. Commits in this continuation session (FACT)

| # | SHA | Subject | Files touched | Rationale |
|---|---|---|---|---|
| 1 | `c47827d` | `chore(phase1-stage1-verification): common-cpp test-state spot-check` | 2 (audit + test-output capture) | Part 1: confirms common-cpp test suite is fully green at HEAD; eliminates the operator's concern that "8/35" implied 27 failing/deferred tests. |
| 2 | `71d4a9e` | `feat(phase1-stage1-cat4-grammars): grammar (b) phrase-in-file and (c) API-has-shape` | 10 (4 new grammar files, 2 new test files, runner / `__init__` / existing test / docs updates) | Part 2 B1: completes the deferred Cat 4 grammar work from charter § 1.7 R8 amendment; enables Phase 4 cat2.api_imports. |

Prior-session commits (see prior checkpoint § 3):
`d57c7ad` Task 1.1; `98e630d` tier2/closed_form; `5258f00`
tier2/particle; `39f2c97` tier2/vector_field; `11d2b93` common-py;
`f30dc03` common-cpp; `c29abda` prior closeout checkpoint.

## 3. Part 1 verification result (FACT)

Audit:
[`stage-1-verification-2026-05-20T12-10-58Z.md`](./stage-1-verification-2026-05-20T12-10-58Z.md).
Raw output:
[`stage-1-verification-2026-05-20T12-10-58Z.common-cpp-test-output.txt`](./stage-1-verification-2026-05-20T12-10-58Z.common-cpp-test-output.txt)
(sha256 in the audit's front-matter).

Method (re-run at HEAD `c29abda`):

```
cmake -S common/common-cpp -B build/common-cpp-verify -G Ninja
cmake --build build/common-cpp-verify
./build/common-cpp-verify/bit_physics_common_cpp_tests \
    --reporters=console --duration=true
```

Outcome:

```
[doctest] test cases:  8 |  8 passed | 0 failed | 0 skipped
[doctest] assertions: 35 | 35 passed | 0 failed |
[doctest] Status: SUCCESS!
```

**Categorization:** all 8 test cases PASS; 0 SKIP, 0 DEFERRED, 0
FAIL. doctest's "8" is the count of `TEST_CASE` blocks; the "35" is
the count of `CHECK`/`REQUIRE` assertions inside them. They are
orthogonal counts, not "8 of 35 passing". The dispatch prompt's
inference of "27 deferred-pending-impl" was a misreading of
doctest's two-line summary format; **no discrepancy** in the prior
session's claim — both lines were reproduced verbatim in the prior
commit message (`f30dc03`) and in prior checkpoint § 6.

Stage 3's `common-module-red HALT` gate is not at risk from common-cpp.

## 4. Part 2 — B1 (Cat 4 grammar extensions) (FACT)

### Implementation

| Grammar | File | Resolver | Pass when | Fail (HARD_FAIL) when |
|---|---|---|---|---|
| (b) `<phrase "X" in Y>` | `tools/integrity/integrity/cat4_draft_time/grammars/phrase_in_file.py` | literal `bytes.__contains__` | `X` is a substring of (any glob-match of) `Y` | `Y` resolves to zero files; `Y` is absolute or escapes repo; `X` absent in all matches |
| (c) `<API X has shape Y>` | `tools/integrity/integrity/cat4_draft_time/grammars/api_shape.py` | Python AST (`.` symbol); C++ header regex (`::` symbol) | normalized shape of `X` equals normalized `Y` | `X` does not resolve; `X` resolves to multiple distinct shapes; resolved shape ≠ `Y` |

Both grammars share `_md_scope.py`, which strips fenced code blocks
and inline backtick spans so the grammar's own meta-documentation
does not self-trip (FACT verified: 0 findings on live repo after
the fix; would have produced 23 false positives without it).

### Registry

`tools/integrity/integrity/runner.py` extended:

- `_REGISTRY` now contains `cat4.phrase-in-file` and
  `cat4.api-shape` alongside `cat4.path-line-assertions`.
- `_CATEGORY_ALIASES["4"]` resolves to all three grammar check IDs.

`tools/integrity/integrity/cat4_draft_time/__init__.py` re-exports
all three `run_*` callables. The pre-commit hook entry
(`docs/integrity/cat4-draft-time.md`'s `--cat 4 --staged-only`)
automatically picks up the new grammars via the alias.

### Tests (FACT)

```
tests/test_cat4_phrase_in_file.py::test_positive_phrase_in_named_file PASSED
tests/test_cat4_phrase_in_file.py::test_positive_phrase_in_glob PASSED
tests/test_cat4_phrase_in_file.py::test_negative_phrase_missing PASSED
tests/test_cat4_phrase_in_file.py::test_negative_target_does_not_resolve PASSED
tests/test_cat4_phrase_in_file.py::test_negative_absolute_path_rejected PASSED
tests/test_cat4_phrase_in_file.py::test_glob_with_no_matches_hard_fails PASSED
tests/test_cat4_api_shape.py::test_positive_python_class_shape PASSED
tests/test_cat4_api_shape.py::test_positive_python_function_with_whitespace_variation PASSED
tests/test_cat4_api_shape.py::test_negative_python_symbol_absent PASSED
tests/test_cat4_api_shape.py::test_negative_python_signature_mismatch PASSED
tests/test_cat4_api_shape.py::test_positive_cpp_struct PASSED
tests/test_cat4_api_shape.py::test_positive_cpp_function PASSED
tests/test_cat4_api_shape.py::test_negative_cpp_signature_mismatch PASSED
tests/test_cat4_api_shape.py::test_negative_unqualified_symbol_rejected PASSED
============================== 14 passed in 0.10s ==============================
```

`tests/test_runner.py::test_resolve_checks_aliases` updated to
reflect the new alias list; 5/5 runner tests pass.

### Charter-required smoke (FACT)

```
$ uv run --directory tools/integrity python -m integrity \
      --cat cat4.phrase-in-file --mode advisory
summary: 0 HARD_FAIL, 0 SOFT_WARN
$ uv run --directory tools/integrity python -m integrity \
      --cat cat4.api-shape --mode advisory
summary: 0 HARD_FAIL, 0 SOFT_WARN
```

Both new grammars are clean on the live repo at HEAD — confirms no
false-positives against real content.

### Documentation

`docs/integrity/cat4-draft-time.md` extended:

- Grammar (b) section (syntax, semantics, pass/fail, example,
  narrative-scope rule).
- Grammar (c) section (syntax, dispatch rule, Python/C++ resolver
  scope, tradeoffs incl. banked libclang resolver, example).
- Narrative-scope rule documented (skip fenced code blocks, indented
  code blocks, and inline backtick spans).

FACT/INFERENCE tags applied per IC-9 discipline.

## 5. IC-1 through IC-7 final conformance summary

Unchanged from prior checkpoint § 4 — see
[`stage-1-checkpoint-2026-05-20T04-22-10Z.md`](./stage-1-checkpoint-2026-05-20T04-22-10Z.md)
§ 4. Surfaces match charter § 3.1–3.7 verbatim; path shifts
documented under § 5 of the prior checkpoint and inherited here.

### B1 addendum (this session)

| Charter ref | Deliverable | Outcome |
|---|---|---|
| § 1.7 R8 amendment | Cat 4 grammar (b) `<phrase "X" in Y>` | LANDED (6 tests, live-repo smoke clean) |
| § 1.7 R8 amendment | Cat 4 grammar (c) `<API X has shape Y>` | LANDED (8 tests; Python AST + C++ regex resolvers; live-repo smoke clean) |
| § 1.7 R8 amendment | Phase 4 `cat2.api_imports` unblock | INFERENCE: grammar (c) provides the symbol-resolution surface needed; Phase 4 will own the `cat2.api_imports` check itself. |

## 6. Charter shifts — running register

### Inherited from prior session (verbatim from prior checkpoint § 5)

1. Commit type `phase1(...)` rejected by pre-commit hook → using
   `chore` / `feat` with `phase1-stage1-<scope>` slug.
2. Tier 2 substack path `tools/diagnostics/diagnostics/tier2/...` vs
   charter's `tools/diagnostics/tier2/...`.
3. IC-1 payload format `raw-binary-v1` instead of HDF5.
4. IC-2 wraps Phase 0's `capture.CaptureManifest` schema.
5. `CheckResult` at `diagnostics.tier2._types`.
6. IC-5/6/7 import path reconciled.
7. Pre-existing README stubs unchanged (Convention A).

### New in this session

| # | Shift | Reason | Documented |
|---|---|---|---|
| 8 | Cat 4 grammar tests at `tools/integrity/tests/test_cat4_{phrase_in_file,api_shape}.py` rather than `tools/integrity/integrity/cat4_draft_time/tests/`. | The integrity package's `[tool.pytest.ini_options].testpaths` is `["tests"]`. Per Hard Rule 2 the existing layout wins; charter intent ("mirror grammar (a)'s test layout") is satisfied because grammar (a)'s tests also live at `tools/integrity/tests/`. | Commit `71d4a9e` message; this checkpoint § 4. |
| 9 | Grammar (c) C++ resolver is regex-based, not libclang. | Charter § 1.7 R8 acknowledged "shape extraction for grammar (c) is the hard part"; the dispatch prompt explicitly authorized "ship a regex-based extractor … bank the robust C++ AST follow-up". | `docs/integrity/cat4-draft-time.md` (Tradeoffs section); `api_shape.py` docstring. |
| 10 | Grammars (b) and (c) silently skip markdown fenced code blocks and inline backtick spans. | Without this, the grammar's own meta-documentation (this file, the charter, the spec) self-trips. Verified: would have produced 23 false positives on the live repo. | `docs/integrity/cat4-draft-time.md` (Narrative-scope rule); `_md_scope.py` docstring. |

### Discovered pre-existing gap (NOT introduced this session)

| # | Finding | Origin | Action |
|---|---|---|---|
| G1 | `cat2.python-exports` HARD_FAIL × 7 against `common/common-py/src/common_py/__init__.py`. `__all__` declares 7 symbols (`alembic`, `capture`, `determinism`, `ggui`, `hotreload`, `plotting`, `vdb`); the cat2 check sees no binding via explicit import / module-level assignment. `tests/test_runner.py::test_run_against_live_repo_has_no_hard_fail` is consequently RED at HEAD. | Prior session commit `11d2b93`. Predates this continuation. | **Surfaced to operator.** Out of scope for this dispatch (no authorization to edit prior session's deliverables). Two viable resolutions: (i) trim `__all__` to the actually-bound submodules (`capture`, `determinism`) — the rest are documented-but-unimplemented per charter "header surface only"; (ii) bind the absent submodule names with explicit `from .alembic import ...` style stubs. Recommended to land before Stage 3 since Stage 3 § "Failing-tests gate verification" expects this test green. |

## 7. Banked / deferred items — running register

Carried forward from prior checkpoint § 7:

- **B1** (Cat 4 grammar extension) — **LANDED in this session**
  (commit `71d4a9e`). REMOVE from banked list.
- **B2** Cross-stack equivalence common-cpp ↔ common-ts — still
  banked (per-sim Stack C).
- **B3** Cross-stack equivalence common-py ↔ common-cpp — still
  banked (per-sim Stack C).
- **B4** HDF5 vendoring for common-cpp — still banked (per-sim).
- **B5** OpenVDB / Alembic / USD / Dear ImGui — still banked
  (per-sim).
- **B6** Vulkan device-init runtime — still banked (per-sim).
- **B7** Workspace registration in root `pyproject.toml` / top-level
  CMake — still banked (Stage 3).
- **B8** `docs/dependencies.md` consolidation — still banked (Stage 3).
- **B9** Diagnostics testpaths registration in
  `tools/diagnostics/pyproject.toml` — still banked (Stage 3).
- **B10** (Stage 1 closeout commit landing the prior checkpoint) —
  LANDED at `c29abda`. REMOVE.

New in this session:

| # | Item | Reason | Owner |
|---|---|---|---|
| B11 | libclang-backed robust C++ AST resolver for grammar (c). | Current regex resolver handles the common-cpp public-surface envelope but rejects templated declarations / overload sets. Phase 4 `cat2.api_imports` should evaluate whether the regex envelope is sufficient or whether libclang is needed. | Phase 4 (or earlier per-sim phase that hits a templated public API). |
| B12 | Fix `common/common-py/src/common_py/__init__.py` `__all__` vs cat2 mismatch (see § 6 G1). | Pre-existing prior-session gap. Stage 3 "Failing-tests gate verification" expects `test_run_against_live_repo_has_no_hard_fail` green. | Operator dispatch — recommended ahead of Stage 3, or as part of Stage 3 convergence. |

## 8. Stage 2 readiness (FACT)

Stage 1 is **complete**. Stage 2 (per-sim TDD bootstraps) can be
dispatched under charter § 7.2.

**Commit-convention shift to inherit in Stage 2 dispatch:** the
Stage 2 dispatch prompt should use `chore` / `feat` with a
`phase1-stage2-<sim>` slug, not the `phase1(stage2/...)` form —
the local `conventional-pre-commit` hook rejects the latter (see
shift #1, inherited from prior session). Concrete example:

```
feat(phase1-stage2-strange-attractors): sim TDD bootstrap (IC-8)
chore(phase1-stage2-boids-3d): probe report + failing test suite
```

**Recommendation to operator (informational):** consider landing
B12 (cat2 / `__all__` reconciliation) ahead of or alongside Stage 2
so that Stage 3's failing-tests gate has a clean baseline. It is
not a Stage-2 blocker — Stage 2 adds per-sim red tests, none of
which interact with common-py's `__all__`.

## 9. Out of scope (already deferred elsewhere)

Unchanged from prior checkpoint § 9:

- Sim implementations (Stage 2+).
- Stage 2 per-sim TDD bootstraps (different dispatch).
- Stage 3 convergence-file edits (B7, B8, B9).
- Editing Phase 0 deliverables (common-ts, testkit, etc.).

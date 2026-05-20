# Cat 4 — Draft-time spec verification

Spec § 3.2. **HARD_FAIL at pre-commit.**

## What it checks (Phase 0 scope)

`cat4.path-line-assertions`: backtick-fenced `path:line` and
`path:start-end` citations inside `docs/`, `README.md`, `CHANGELOG.md`,
and `CONTRIBUTING.md` are grep-verified against repo HEAD before commit.
Same grammar as Cat 1; the difference is *timing* — Cat 4 runs at
commit-msg stage on staged files, so a draft can be caught before it
lands.

## Pre-commit hook

Configured in `.pre-commit-config.yaml`:

```yaml
- repo: local
  hooks:
    - id: cat4-path-line-assertions
      name: cat4 path:line assertions
      entry: uv run --directory tools/integrity python -m integrity --cat 4 --staged-only --mode strict
      language: system
      stages: [pre-commit]
      pass_filenames: false
```

(The hook stage is `pre-commit` rather than `commit-msg` — `commit-msg`
fires only on the message text; `pre-commit` fires on staged content,
which is what we need to scan.)

## Grammar (b) — phrase-present-in-file (Phase 1 Stage 1, FACT)

Syntax (narrative prose only — backtick-fenced examples are ignored):

```
<phrase "X" in Y>
<phrase 'X' in Y>
```

- `X` is a literal phrase. The verifier searches case-sensitively
  for `X` as a byte-for-byte substring (no regex metacharacters
  honored).
- `Y` is a path relative to repo root, OR a glob pattern (`*`, `?`,
  `**` resolved via `pathlib.Path.glob`). Absolute paths and paths
  that escape repo root are rejected.
- **Pass:** `X` appears at least once in `Y` (or in at least one file
  matched by `Y` when `Y` is a glob).
- **Fail (HARD_FAIL):** `Y` resolves to zero files at HEAD, OR `X` is
  absent from every file matched by `Y`.

Example (FACT):

```
The capture writer rejects further writes after finalize: see
<phrase "post-finalize" in common/common-cpp/src/capture.cpp>.
```

The verifier extracts the phrase and the path, opens the file at
repo HEAD, and HARD_FAILs the commit if the phrase isn't present.

## Grammar (c) — API-has-shape (Phase 1 Stage 1, FACT)

Syntax:

```
<API X has shape Y>
```

- `X` is a qualified symbol name. The verifier dispatches on the
  separator:
  - `.` → Python dotted name (e.g., `common_py.determinism.Config`).
    Resolution is AST-based: the verifier parses source files under
    `common/common-py/src/`, `tools/integrity/integrity/`,
    `tools/testkit/`, and `tools/diagnostics/diagnostics/`, finds
    the matching `FunctionDef` / `AsyncFunctionDef` / `ClassDef`,
    and reconstructs the signature.
  - `::` → C++ namespace-qualified name (e.g.,
    `bit_physics::common_cpp::determinism::Config`). Resolution is
    regex-based against header files under
    `common/common-cpp/include/`.
- `Y` is the declared shape (function signature, struct/class
  declaration). Bracket-balancing recognizes `->` arrows and `<T>`
  template brackets correctly.
- **Pass:** `X` resolves to exactly one definition whose normalized
  shape (whitespace runs collapsed) equals `Y` after the same
  normalization.
- **Fail (HARD_FAIL):** `X` does not resolve, OR resolves to multiple
  conflicting shapes, OR resolves to a shape that does not match `Y`.

Example (FACT, against this repo at HEAD):

```
The determinism Config is a two-field struct: <API
common_py.determinism.Config has shape class Config>.
```

Tradeoffs (INFERENCE): the C++ resolver is regex-only. It handles
the common-cpp public-API envelope (structs with named fields, free
functions with simple types, member-function declarations on classes
inside `namespace foo { ... }` blocks). Templated declarations and
overload sets are **out of scope** for this grammar and HARD_FAIL
with a diagnostic naming the limitation. A libclang-backed C++
resolver is banked for a follow-up phase.

## Narrative-scope rule (FACT)

Grammars (b) and (c) only fire on **narrative prose**. The
verifier skips:

- Triple-backtick fenced code blocks (` ``` ` / ` ~~~ `).
- Indented (≥ 4 space) code blocks.
- Inline backtick code spans.

This lets the spec / charter / this doc embed the literal grammar
inside backticks without the verifier double-checking its own
meta-documentation.

## Why HARD_FAIL at pre-commit

The dominant failure mode of multi-agent specification work is confident
assertion of facts from memory that turn out to be wrong. Cat 4 catches
that class at the moment the assertion is added, before any reviewer or
CI cycle.

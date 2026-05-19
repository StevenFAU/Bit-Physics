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

## Out of scope at Phase 0

- Grammar (b) — phrase-present-in-file citations (`"foo" in bar.py`):
  Phase 1+.
- Grammar (c) — public-API-shape citations (`API X has shape Y`):
  Phase 1+.

## Why HARD_FAIL at pre-commit

The dominant failure mode of multi-agent specification work is confident
assertion of facts from memory that turn out to be wrong. Cat 4 catches
that class at the moment the assertion is added, before any reviewer or
CI cycle.

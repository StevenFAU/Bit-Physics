# Cat 1 — Citation integrity

Spec § 3.2. **HARD_FAIL.**

## What it checks (Phase 0 scope)

`cat1.intra-repo`: every backtick-fenced `path:line` or `path:start-end`
citation appearing in a tracked text file resolves to a file under the
repo root, and the cited line (or range end) is within the file's line
count.

## Grammar

```
<path/to/file.ext>:<line>             — single-line citation
<path/to/file.ext>:<start>-<end>      — range citation; end >= start
```

Concrete example (taken from any of the in-repo docs):

> See the verifier API in `tools/testkit/golden/verifier.py:73` for the
> exact signature.

In that quote, the backtick-fenced `tools/testkit/golden/verifier.py:73`
is what Cat 1 grep-verifies against repo HEAD.

Paths are repo-relative POSIX paths. URLs and absolute paths are out of
scope at Phase 0; they're picked up by Phase 1+ external-link checks.

## File types scanned

`.md`, `.markdown`, `.rst`, `.txt`, `.toml`, `.yaml`, `.yml`, `.json`,
`.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.wgsl`, `.glsl`, `.sh`, `.cfg`,
`.ini`.

Vendored upstreams (`references/<UpstreamName>/`) and adversarial
fixtures (`tools/integrity/tests/fixtures/adversarial/`) are excluded.

## Failure modes

| Condition | Severity |
|---|---|
| File does not exist | HARD_FAIL |
| Range end < start | HARD_FAIL |
| Cited line > file line count | HARD_FAIL |
| Citation escapes repo root (`..` traversal) | HARD_FAIL |

## Phase 1+ extensions

- `cat1.upstream-citation`: upstream SHA in `references/*/MANIFEST.toml`
  matches the vendored tree (drift detection).
- `cat1.algebraic-derivation-links`: each derivation doc is reachable
  from at least one consumer.

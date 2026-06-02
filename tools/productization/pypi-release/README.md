# pypi-release (Phase 5 sub-phase 5.3)

Build-and-validate PyPI wheels for every qualifying Stack-D / Stack-E sim and
re-verify correctness via the spec § 3.8 bootstrap gate (build wheel → install in
a fresh isolated venv → re-emit the canonical capture from the installed artifact
→ `equivalence.harness.compare_captures` against the in-repo canonical, OR the
documented golden-table surrogate for sims with no committed `.h5`).

See `docs/productization/pypi-release.md` for the full spec, qualifying criteria,
failure modes, and the (post-phase) OIDC go-live runbook. **No publish:** the
`deploy` job in `.github/workflows/pypi-release.yml` is gated off.

Invoked by path (the `tools/dispatch/preflight-phase.py` precedent):

```
python tools/productization/pypi-release/pipeline.py discover --json
python tools/productization/pypi-release/pipeline.py validate --artifacts OUT --sim ising-classical --json
python tools/productization/pypi-release/lint.py packages/ising-classical/pyproject.toml
```

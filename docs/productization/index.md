# Productization pipelines (Phase 5)

Phase 5 ships five build-and-validate pipelines, one per sub-phase. Each has a
`build-and-validate` job group (CI-gated) and a `deploy` job group (gated off in
Phase 5 — artifact-ready, no live publish). See
`docs/phases/phase-5-productization.md` § 5 (shared architecture) and § 6.x.

| Sub-phase | Pipeline | Stack | Spec doc | Workflow | Tool tree |
|---|---|---|---|---|---|
| 5.1 | web-deploy | B | [web-deploy.md](web-deploy.md) | `.github/workflows/web-deploy.yml` | `tools/productization/web-deploy/` |
| 5.2 | binary-release | C | [binary-release.md](binary-release.md) | `.github/workflows/binary-release.yml` | `tools/productization/binary-release/` |
| 5.3 | pypi-release | D/E | [pypi-release.md](pypi-release.md) | `.github/workflows/pypi-release.yml` | `tools/productization/pypi-release/` |
| 5.4 | render-passes | any | [render-passes.md](render-passes.md) | `.github/workflows/render-passes.yml` | `tools/productization/render-passes/` |
| 5.5 | preprint-extraction | any | [preprint-extraction.md](preprint-extraction.md) | `.github/workflows/preprint-extraction.yml` | `tools/productization/preprint-extraction/` |

> Index created by the 5.1 (web-deploy) agent — the spec-numbered first sub-phase
> (§ 6.6). The 5.2–5.5 docs already existed (those sub-phases ran first chronologically);
> their rows are listed here for completeness.

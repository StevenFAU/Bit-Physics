---
date: 2026-05-28T01-35-19Z
author: phase-3 common-3dgs stage-1a (Claude Code)
subject: Phase 3 common-3dgs Stage 1a — scaffold + RED-failing-tests
verdict: CONFIRMED
head_sha: ed4e501783ba37cd3ff9664fb73feebfcc0fcde2
prior_phase_tag: v0.2.1-sub-phase-lfs-architecture
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:    # mapping (path → sha256); NO ": self" sentinel
  tools/testkit/probes/reports/common-3dgs.md: sha256:7fd94a87755fafe0c55b4c37ad9791cf5eb72708a1024ad765190bbef38df20a
  tools/testkit/failing-tests-evidence/common-3dgs-2026-05-28T01-28-53Z.txt: sha256:f1f80a0225567da81b73aca1d8ce84f3802b97b61c1c7fb6c9a081a7626c84c6
  tools/testkit/determinism/registry.toml: sha256:d3c5cb8863370f8c7c90bafda7add72692e1c9727153c03995fbaf1f180fdb5a
  references/3DGS-reference/MANIFEST.toml: sha256:e854a8d94541a845bcdecf0706d9e5932e74232e22dd5bf8c807259771989f5b
  common/common-3dgs/src/common_3dgs/__init__.py: sha256:e4d59bbb631ad4773324a0d9b82176944dbcbcf695fe694f84ff77f3c006b2cb
evidence_paths:     # list
  - tools/testkit/probes/reports/common-3dgs.md
  - tools/testkit/failing-tests-evidence/common-3dgs-2026-05-28T01-28-53Z.txt
  - tools/testkit/determinism/registry.toml
  - references/3DGS-reference/MANIFEST.toml
  - common/common-3dgs/src/common_3dgs/__init__.py
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md
  - docs/_audits/phase-3/progress.md
d_class_status:
  - D-C: bit-exact / same-stack-same-hw (Stage-1a DEFAULT declaration; MEASURED at Stage 1b)
  - D-D: common-3dgs writer (save_png; no common-py RGB-image writer exists)
---

# Phase 3 common-3dgs Stage 1a — scaffold + RED tests — CONFIRMED

> **Verdict: CONFIRMED.** The `common/common-3dgs/` package skeleton + §3.2.1
> public-API stubs (bodies `raise NotImplementedError`) + the vendored Inria
> reference at the §2.18-pinned SHA + the determinism-registry D-C default row are
> committed; the RED smoke-contract + property-based tests are committed failing
> (9 failed `NotImplementedError`, 1 passed), with a byte-reproducible
> failing-tests-output hash. Anchor probe clean; integrity baseline byte-identical;
> I1–I7 hold. No STOP fired. Stage 1b (implementation) is unblocked.

## § 0 — Stage-1a commit chain (FACT)

Trunk-based to `main` (no PR; no tag — I7). HEAD at session start ==
`origin/main` == `2c73a5f` (Stage-0 back-fill tip; Convention M — no successor).

| # | Commit | Type | Content |
|---|---|---|---|
| A | `5070965` | ci | exclude vendored `references/` from ruff + whitespace pre-commit hooks (enables read-only Python vendoring) |
| i | `4407dcb` | docs | `tools/testkit/probes/reports/common-3dgs.md` (probe report) |
| ii | `c5273ef` | feat | package scaffold + determinism registry + vendored Inria reference + workspace registration |
| iii | `ed4e501` | test | RED smoke-contract + PBT tests + failing-tests evidence |

This audit + the `progress.md` entry land next; the audit `head_sha` is
back-filled to its own commit SHA in a separate `chore` commit (Convention #12).

## § 1 — Anchor-probe findings (FACT)

| Check | Result |
|---|---|
| `git rev-parse HEAD` == `git rev-parse origin/main` (session start) | `2c73a5f7fb9dade3f32ccb47848c78cc617e07e4` (no drift) |
| Tag `v0.0.0-phase-0` / `v0.1.0-phase-1` / `v0.2.0-phase-2` / `v0.2.1-sub-phase-lfs-architecture` | all four resolve (annotated objects) |
| Integrity Cat 1–5 strict sweep (pre-edit, at `2c73a5f`) | **0 HARD_FAIL / 14 SOFT_WARN**; report sha256 `c19492ad…d22cb52` — **byte-identical** to baseline |
| Integrity Cat 1–5 strict sweep (post-scaffold, all new files staged) | **0 HARD_FAIL / 14 SOFT_WARN**; report sha256 **still** `c19492ad…d22cb52` (the new package + vendored reference + registry + probe produce zero new findings) — no STOP-D |
| `verify_evidence` sweep, 8 prior audits incl. Stage-0 | all pass, **0 fail** (20/36/7/24/24/4/7/12) — no STOP-H |
| I7 invariant test `pytest tools/testkit/lfs_migration/` | **16 passed** |
| Inria SHA (§2.18 `docs/phases/phase-3-plan.md:261`) | `git ls-remote https://github.com/graphdeco-inria/gaussian-splatting HEAD` → `54c035f7834b564019656c3e3fcc3646292f727d` (re-verified live; no drift from Stage-0) |

### § 1.1 — I1–I7 disposition (FACT)
- **I1 (verify_evidence no-regression):** 8 prior audits 0-fail (§1).
- **I2 (cross-phase replay):** confirmed `ok=True` 8/8 at Stage 0
  (`docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md:124`);
  Stage 1a's changes are purely additive (new package + vendored reference +
  new registry + workspace-member registration) and touch no audit / capture /
  tolerance artifact the replay inspects → replay verdict unchanged.
- **I3 (integrity baseline):** `c19492ad…d22cb52` byte-identical, 0 HARD_FAIL,
  with all new files staged (§1).
- **I4 (append-only):** no published `docs/_audits/**` file edited.
- **I5 (no fabrication):** the Inria SHA is web-fetched + verified, never
  transcribed from memory (Convention #8).
- **I6 (Convention #12):** this audit's `head_sha` is back-filled in a separate
  commit, never `--amend`.
- **I7 (no agent-pushed tags):** test 16/16; no tag pushed (the D-E intermediate
  tag is a Stage-2 deliverable, operator-pushed).

## § 2 — Probe findings (FACT)

Full probe report: `tools/testkit/probes/reports/common-3dgs.md`.

- **Existing common-module pattern.** Four common modules exist
  (`common/common-py`, `common/common-warp`, `common/common-ts`,
  `common/common-cpp`). The Stack-E (Warp) analog is `common/common-warp`
  (`src/common_warp/` package + `tests/` + `examples/<name>/sim.py`). common-3dgs
  follows it: `src/common_3dgs/` + `tests/` + `examples/smoke_3dgs/sim.py`,
  matching `common/common-warp/pyproject.toml` (hatchling, ruff E/F/I/B/UP/SIM/RUF,
  mypy strict, `filterwarnings=["error"]`).
- **Smoke-sim location (D-D step 1).** TWO discovered patterns: common-py ships
  smoke sims under `smoke/` (`common/common-py/smoke/advection_1d.py`); common-warp
  under `examples/<name>/` (`common/common-warp/examples/hello/sim.py`). As a
  Stack-E module, common-3dgs follows common-warp's `examples/` pattern →
  `common/common-3dgs/examples/smoke_3dgs/sim.py`, with `examples/` on the test
  sys.path (conftest mirrors `common/common-warp/tests/conftest.py`). §0.3
  follow-discovered.
- **D-D writer resolution (FACT).** No existing common-* module exposes an
  `(H,W,3)`-RGB-array → PNG writer. common-py's `plot_field_2d`
  (`common/common-py/src/common_py/plotting.py:79`) is a colormapped single-channel
  field `imshow` (matplotlib `savefig`) — semantically wrong for an RGB render.
  **D-D resolved: common-3dgs ships its own `save_png` writer** (matplotlib
  `imsave`-backed), with matplotlib as a core dependency (the repo's established
  image-writing dep, `common/common-py[plotting]`).
- **Determinism registry (NEW surface).** `tools/testkit/determinism/registry.toml`
  did NOT exist (grep-verified absent). §3.2.5 designs it as a new Phase-3 surface;
  prior sims declare determinism in capture manifests + `policy.md`. Stage 1a
  CREATES it with the first row `[neural-rendered.common-3dgs]`.

## § 3 — Scaffold manifest (FACT)

Created (`feat` commit `c5273ef`), the 23rd workspace member
(`pyproject.toml` + `uv.lock` updated):

| Path | Role |
|---|---|
| `common/common-3dgs/pyproject.toml` | package metadata (deps: testkit, numpy, warp-lang>=1.13,<2.0, matplotlib) |
| `common/common-3dgs/src/common_3dgs/__init__.py` | re-exports (`__all__` = Camera, GaussianSplatModel, render, save_png, __version__) |
| `common/common-3dgs/src/common_3dgs/model.py` | `GaussianSplatModel` (stub) |
| `common/common-3dgs/src/common_3dgs/camera.py` | `Camera` (stub) |
| `common/common-3dgs/src/common_3dgs/render.py` | `render` (stub; omits `from __future__ import annotations` for the Stage-1b `@wp.kernel`s, O-W6) |
| `common/common-3dgs/src/common_3dgs/image_io.py` | `save_png` (stub; D-D writer) |
| `common/common-3dgs/examples/smoke_3dgs/sim.py` | `run_3dgs_smoke` (stub) |
| `common/common-3dgs/tests/conftest.py` | src/ + examples/ sys.path injection |
| `common/common-3dgs/README.md` | package doc |
| `tools/testkit/determinism/registry.toml` | NEW; D-C default row |

The scaffold passes **ruff check + ruff format + mypy --strict** (the
`wp.array[Any]` annotation form keeps the Warp-stubbed generic strict-clean).

### § 3.1 — Inria vendoring confirmation (FACT)
`references/3DGS-reference/` vendored at SHA
`54c035f7834b564019656c3e3fcc3646292f727d` via sparse-checkout
(`git ls-remote` HEAD == the pinned SHA; clone HEAD == the pinned SHA). Contents:
`LICENSE.md` (NON-COMMERCIAL), `UPSTREAM_README.md`, `scene/gaussian_model.py`
(`.ply` attribute layout — `construct_list_of_attributes`/`save_ply`/`load_ply`),
`scene/cameras.py`, `utils/graphics_utils.py` (`getWorld2View2`/`getProjectionMatrix`),
`utils/sh_utils.py` (`eval_sh`/`C0`/`C1`), `gaussian_renderer/__init__.py`,
`MANIFEST.toml` (schema-validated against `tools/testkit/schemas/reference-manifest-v1.json`).
Read-only per architecture.md Appendix D § D.8; the non-commercial clause binds
task-8 + Phase-4 WU-C.

## § 4 — RED-tests evidence (FACT)

`common/common-3dgs/tests/test_smoke_contract.py` (one test per §3.2.1 public
symbol) + `common/common-3dgs/tests/test_properties.py` (three Hypothesis
invariants: render shape/dtype, render-empty-is-background, .ply round-trip).

- **RED result:** `9 failed, 1 passed`. The 9 failures are all
  `NotImplementedError` (the correct RED failure mode per §6.0 item 6a — NOT a
  collection / import error); the 1 pass is `test_package_surface` (the package
  exports the §3.2.1 symbols, which IS implemented at scaffold).
- **Failing-tests-output:** `tools/testkit/failing-tests-evidence/common-3dgs-2026-05-28T01-28-53Z.txt`
- **Failing-tests-output-hash: `sha256:f1f80a0225567da81b73aca1d8ce84f3802b97b61c1c7fb6c9a081a7626c84c6`** (FACT)
- **Reproducibility (Gate 13).** The evidence is captured with `--tb=line` and the
  repo-root prefix + wall-clock duration normalized out, so the hash is
  byte-reproducible. Re-run at HEAD `ed4e501` reproduces the identical hash
  (verified). PBT settings carry `derandomize=True, database=None` for run-to-run
  stability. The capture+normalize command is recorded in the `ed4e501` commit
  footer + the smoke-contract test docstring.

## § 5 — D-class disposition (Stage-1a)

- **D-C — render determinism (DEFAULT declared).** Registry row
  `[neural-rendered.common-3dgs]` = `class = "bit-exact"`,
  `scope = "same-stack-same-hw"`, `atomic_ops = "none"`, `subgroup_ops = "none"`,
  `seed_pinned = true`. Rationale: the renderer composites per-pixel front-to-back
  over a depth-sorted splat list (no atomic scatter, no subgroup ops) → bit-identical
  on Warp's serial CPU backend. **MEASURED at Stage 1b** (render twice on identical
  inputs; compare arrays); re-characterized to distributional + EFECT only if the
  measurement forces it (D-C / STOP-J).
- **D-D — capture writer (RESOLVED).** common-3dgs `save_png` (no common-py RGB
  writer exists). The smoke sim additionally writes a Layer-0 HDF5 capture
  (category `neural-rendered`) for the schema-corpus fixture at Stage 1b.

## § 6 — §0.3 SHIFTED findings (surfaced; follow-discovered)

1. **`MANIFEST.toml`, not `manifest.yaml`** — the discovered vendoring discipline
   (`docs/testkit/references.md`) uses `MANIFEST.toml` validated against
   `tools/testkit/schemas/reference-manifest-v1.json`. The charter §1.1 / §6.1 say
   `manifest.yaml`. Followed discovered.
2. **`python-strict.yml`, not `build-py.yml`** — the discovered Python CI workflow.
   The `test-common-3dgs` job lands in `python-strict.yml` at Stage 1b. Followed
   discovered.
3. **CHANGELOG `### sub-phase-…`, not `## Phase 3`** — the discovered CHANGELOG
   pattern (`## [Unreleased]` → `### sub-phase-<name>`). The Stage-1b entry follows it.
4. **determinism `registry.toml` is a NEW surface** — created here (no prior
   registry existed). Consistent with §3.2.5 (design for new surfaces).

None breaks the §3.2.1 contract → SHIFTED-surfaced, not a STOP-G.

## § 7 — Verdict + Stage-1b readiness

**CONFIRMED.** Acceptance met: RED committed with a grep-verifiable, byte-reproducible
failing-tests-output hash; integrity baseline byte-identical (0 HARD_FAIL); I1–I7
hold; the scaffold is ruff/mypy-strict clean; the Inria reference is vendored at the
pinned SHA; the D-C default row + D-D resolution are recorded. No STOP fired.

**Stage 1b (implementation + thirteen-gate + D-C measurement) is unblocked.** It
replaces each `NotImplementedError` (GaussianSplatModel + .ply I/O, Camera matrices,
the forward EWA-splatting `render`, `save_png`, the smoke sim), runs the thirteen
gates (Gate 14 N/A — single-stack), MEASURES D-C, adds the shared-file + CI updates,
and turns the RED tests GREEN (witnessing
`sha256:f1f80a02…626c84c6` in the implementation-commit footer).

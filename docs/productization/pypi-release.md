# Productization — pypi-release

> Phase 5 sub-phase: 5.3. Authored by: phase-5-pypi-release-agent (planning); extended by: per-sim authors (post-phase).
> Architecture: see `docs/phases/phase-5-productization.md` § 5 (shared) and § 6.3 (sub-phase-specific) + the v9 reconciliation amendment block (R1 programmatic bootstrap; R3 per-sim verification routing).

## 1. Purpose

Build a PyPI wheel for every qualifying Stack-D / Stack-E sim and re-verify that
packaging preserved correctness, by re-entering Layer 0's verification machinery
**from the installed artifact**. For each sim the pipeline builds the wheel,
installs it in a fresh isolated venv (the in-repo source is NOT on `sys.path`),
re-emits the canonical capture programmatically from the installed package, and
compares it to the in-repo canonical via `equivalence.harness.compare_captures`
(spec § 3.8 bootstrap-style verification). Consumers: downstream `pip install`
users and the post-phase OIDC publish. **Phase 5 ships artifact-ready only — no
publish.**

## 2. Pipeline shape

- **Jobs:** `discover` (emits the §13 `pypi:true` pool as a matrix) → `build-and-validate`
  (one job per qualifying sim) → `deploy` (GATED OFF).
- **Trigger:** `push` tags `pypi-v*`; `pull_request` on the pipeline/pyproject paths;
  `workflow_dispatch` with a `confirm_deploy` choice (default `false`).
- **Concurrency:** `pypi-release-${{ github.ref }}`, no cancel-in-progress.
- **Caching:** uv (`astral-sh/setup-uv`); per-sim fresh-venv installs from a local
  wheelhouse (sim wheel + `bit-physics-*` infra wheels) + the public index for
  third-party deps (numpy/h5py/taichi/torch/warp-lang).
- Reference § 5.4 of the phase plan for the shared workflow skeleton.

**Invocation is by PATH** (`python tools/productization/pypi-release/pipeline.py <verb>`),
not `python -m …` — the `pypi-release/` tool dir is hyphenated and not an importable
module (the `tools/dispatch/preflight-phase.py` precedent). This is a documented
SHIFT from the § 5.4 skeleton's `-m` form.

## 3. Qualifying sim criteria

Verbatim from phase plan § 6.3 (with the v9 R1 SHIFT):

- Has a `pyproject.toml` declaring required fields (linter enforces).
- Has a programmatic Python capture surface (`sim_runner_seeded` / `default_capture`)
  re-emitting the canonical descriptor in a clean venv. *(A `[project.scripts]`
  console-script is OPTIONAL per R1, NOT a qualifying gate.)*
- Installs in a clean venv on `ubuntu-latest`.
- Produces a schema-valid capture.
- Does not declare `productization.pypi: false` in its spec sheet § 13.

**Variant/frontier inheritance (SHIFT — measured at this dispatch).** The § 13
five-boolean block only exists on the 17 canonical sims. A package variant
(`-stack-d/-e`, `-diff`, `-sh-update`) or lenia-family frontier sim
(`particle-lenia`, `flow-lenia`) carries no § 13 of its own; it **inherits its
governing canonical's `pypi` flag**. This correctly includes the lenia / neural-ca /
ising-classical / mpm-multimaterial / pinn-poisson / 3dgs-mpm / articulated-pedagogical
families and excludes the eulerian-smoke / reaction-diffusion / lattice-boltzmann /
sph-water Stack-D/E ports (canonical `pypi:false`). Pool measured at 15 packages.

## 4. Smoke test contract

The six § 2.1 gates specialised:

1. **Spec doc** — this file.
2. **Probe** — `tools/testkit/probes/reports/phase-5-pypi-release.md`.
3. **Smoke harness verified failing first** — `tools/productization/pypi-release/smoke/test_pipeline.py`;
   failing output at `tools/testkit/failing-tests-evidence/phase-5-pypi-release-<UTC>.txt`.
4. **Bootstrap gate** — per-sim fresh-venv re-emit + `compare_captures` (capture_roundtrip)
   or the installed-wheel golden-anchor suite (golden_table_surrogate). PASS gates the sub-phase.
5. **Perf-ledger row** — `pypi-fresh-venv` environment, per validated sim.
6. **Evidence hashes** — re-emitted capture + verification + failing-tests sha256s in the audit.

## 5. Sharding scheme

Not required; the 15-sim matrix fits within the § 4.12 60-minute budget (one
`ubuntu-latest` job per sim, parallel). Heavy installs (torch / taichi / warp-lang)
dominate per-job wall-clock; `fail-fast: false` isolates per-sim failures.

## 6. Failure modes

- **CI red on `build-and-validate`:** packaging silently broke correctness for that
  sim (most likely `package_data` missing, transitive-dep drift, or a CPU/GPU branch).
  The wheel does not ship.
- **CI red on `deploy`:** should not happen — gated on `workflow_dispatch` +
  `confirm_deploy == 'true'`.
- **Re-running on the same SHA:** safe (idempotent; per-sim temp wheelhouse/venv).
- **Per-sim DEFERRED:** a sim governed by a `pypi:false` canonical, or a wheel that
  needs a CUDA runner with none available; the sim owner remediates per § 9.

## 7. Go-live runbook (post-phase; operator)

The `deploy` job is gated off in Phase 5. To go live:

1. **Reserve the `bit-physics-*` namespace on PyPI** and register the repo as an
   **OIDC trusted publisher** (`pypi.org/manage/account/publishing/`): publisher =
   GitHub, owner `StevenFAU`, repo `Bit-Physics`, workflow `pypi-release.yml`,
   environment `pypi`. No long-lived API token is stored (OIDC mints short-lived creds).
2. **Pin the publish action** — replace `pypa/gh-action-pypi-publish@release/v1`
   with a verified SHA; confirm `actions/download-artifact` pin.
3. **Resolve the namespace SHIFT** — sims ship plain names (`ising-classical`), not
   `bit-physics-<category>-<sim>` (§ 4.6). Decide whether to rename at publish time
   (a sim-owner action; Phase 5 does not patch sims) or publish under the plain names.
4. **Tag `pypi-v<semver>`** on a `main` commit; run the workflow with
   `confirm_deploy=true`. The build-and-validate gate must be green first.

## 8. Open issues / DEFERRED items

- **`bit-physics-testkit` wheel packaging fix** (applied this sub-phase): the wheel
  omitted `schemas/` (capture-v1 / golden-v1), so every sim's re-emit raised
  `FileNotFoundError` in a fresh venv. Fixed via a `force-include` (additive metadata,
  no code change). See the completion audit.
- **§ 4.6 namespace divergence** — every sim ships a plain name; SHIFTED, not patched.
- **`neural-ca` `[defaults.continuous-ca]`** — added at this dispatch from the MEASURED
  re-emit round-trip (R3 § C-6); needs the LFS checkpoint.
- **CUDA-required sims** — none of the qualifying pool requires a GPU at re-emit time
  (Warp / Taichi / torch run CPU-deterministic); revisit if a future sim does.

## 9. Extending coverage (post-phase contributor note)

(a) **Prerequisites.** A new sim qualifies when: its governing canonical's § 13 has
`pypi:true`; it has a `pyproject.toml` with required fields (run `lint.py`); and it
exposes `sim_runner_seeded(seed, out)` or `capture.default_capture(out)` (capture sim,
gets a `capture_roundtrip` route) **or** a committed golden-anchor test suite (gets a
`golden_table_surrogate` route).
(b) **Wiring.** Add a `VALIDATION_ROUTING` entry in `pipeline.py` (method + re-emit
surface + canonical-capture path, or surrogate description). Discovery and the matrix
pick it up automatically from § 13.
(c) **Validation.** Run `BIT_PHYSICS_PYPI_BOOTSTRAP=1 pytest tools/productization/pypi-release/smoke/`
or `pipeline.py validate --artifacts /tmp/out --sim <name> --json`; confirm
`within_tolerance` / golden-anchor PASS before opening a PR.

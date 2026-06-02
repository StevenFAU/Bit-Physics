# Phase 5 pypi-release — Pre-implementation probe

## Front matter

- Date (UTC): 2026-06-02T02:06:39Z
- Author: claude-code session (phase-5-pypi-release-agent)
- Subject: Phase 5 pypi-release probe
- HEAD SHA at probe time: ad2f8b28d99e6e7b5572531bd437ed0f6821a50a
- Verdict-state: see § 6 closure

## § 1 — Sim inventory in scope

The qualifying pool is the §13 `pypi:true` canonical sims + their variants/frontier
(inheritance). MEASURED at HEAD: **15 qualifying packages**, 32 packages with a
pyproject scanned, 10 pypi:false canonical families DEFERRED, 2 dirs with no
pyproject (mass-spring-cloth, reaction-diffusion-2d-stack-c — pure C++).

| Sim (package) | Governing canonical (§13 pypi) | Stack | Re-emit surface | Validation route |
|---|---|---|---|---|
| ising-classical | ising-classical (T) | D | `sim.sim_runner_seeded` | capture_roundtrip (lattice-spin 0.0/0.0) |
| articulated-pedagogical | articulated-pedagogical (T) | E | `sim.sim_runner_seeded` | capture_roundtrip (rigid-body; sim.name=rigid-body-pedagogical) |
| articulated-pedagogical-diff | articulated-pedagogical (T) | E | `capture.default_capture` | capture_roundtrip (rigid-body) |
| mpm-multimaterial | mpm-multimaterial (T) | D | `sim.sim_runner_seeded` | capture_roundtrip (overrides.mpm-multimaterial → mpm) |
| mpm-multimaterial-stack-d | mpm-multimaterial (T) | D | `sim.sim_runner_seeded` | capture_roundtrip (mpm) |
| mpm-multimaterial-stack-e | mpm-multimaterial (T) | E | `sim.sim_runner_seeded` | capture_roundtrip (mpm) |
| neural-ca | neural-ca (T) | D | `pbt`/`__main__` (LFS ckpt) | capture_roundtrip (continuous-ca — MEASURED row added) |
| lenia | lenia (T) | D | sim capture | golden_table_surrogate |
| lenia-diff | lenia (T) | D | `capture.default_capture` | golden_table_surrogate (gradient) |
| mpm-multimaterial-diff | mpm-multimaterial (T) | D | `capture.default_capture` | golden_table_surrogate (gradient) |
| particle-lenia | lenia (frontier, T) | D | `__main__` | golden_table_surrogate (force/energy) |
| flow-lenia | lenia (frontier, T) | D | `sim.capture` | golden_table_surrogate (mass-conservation) |
| pinn-poisson | pinn-poisson (T) | E | `__main__` | golden_table_surrogate (analytic+FD) |
| 3dgs-mpm | 3dgs-mpm (T) | E | `sim.write_capture_file` | golden_table_surrogate (coupling+render-sim) |
| 3dgs-mpm-sh-update | 3dgs-mpm (T) | E | `sim.write_capture_file` | golden_table_surrogate (SH-rotation) |

DEFERRED (canonical `pypi:false`): eulerian-smoke{,-diff,-neural,-stack-d,-stack-e},
reaction-diffusion-2d{,-diff,-stack-d}, reaction-diffusion-3d,
lattice-boltzmann-d3q19{,-stack-d,-stack-e}, sph-water{,-stack-d}, boids-3d, physarum,
mandelbulb-explorer, strange-attractors.

## § 2 — Testkit / framework API surface (Contract A→T)

- `equivalence.harness.compare_captures(left: Path, right: Path, tolerance_table_path: Path) -> EquivalenceVerdict`
  — takes `.json` manifest paths (R1); resolves tolerance from LEFT manifest's
  `sim.name`/`sim.category` via `_resolve_tolerance`. `EquivalenceVerdict.within_tolerance`
  is the gate. Verified live: `tools/testkit/equivalence/harness.py:86`.
- `tools/testkit/capture/reader.py:load_capture(manifest_path)` reads manifest + `.h5`.
- Re-emit surfaces are the sims' own `sim_runner_seeded(seed, out_dir) -> Path` /
  `default_capture(out_dir) -> Path`; descriptor locked in the sim (no CLI flags, R1).
- `tolerance.toml` present rows: `[defaults.lattice-spin]` 0.0/0.0, `[defaults.rigid-body]`
  0.0/0.0, `[overrides.mpm-multimaterial]` (→ mpm 1e-4/0.0). `[defaults.continuous-ca]`
  ABSENT — neural-ca precondition (added at this dispatch, MEASURED).

## § 3 — Existing CI workflow inventory

13 workflows under `.github/workflows/`; none named `pypi-release.yml` (non-clashing,
confirmed). Action pins in use: `actions/checkout@de0fac2…` (v6.0.2), `astral-sh/setup-uv@v8.1.0`.
LFS selective-pull + R2-routing pattern lifted from `python-strict.yml`.

## § 4 — External-tool current state (web-fetched at authoring)

- **Build tooling:** `uv build --package <name> --wheel -o <dir>` (uv 0.11.15);
  `python -m build` not standalone-installed → use `uv build`.
- **`actions/upload-artifact`** latest v7.0.1 = `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.
- **`actions/download-artifact`** latest v8.0.1 = `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c`.
- **PyPI OIDC trusted publisher** — `pypa/gh-action-pypi-publish@release/v1`, job-level
  `id-token: write` mandatory, `environment: pypi`; no long-lived token (docs.pypi.org/trusted-publishers).
- **CUDA runner** — GitHub-hosted `ubuntu-latest` has no GPU; the qualifying pool runs
  CPU-deterministic (Warp/Taichi/torch CPU), so no DEFERRAL on CUDA.

## § 5 — Wall-clock estimate for smoke matrix

End-to-end bootstrap MEASURED on ising-classical = **~45 s** (5 infra wheels + sim
wheel + fresh venv + install + re-emit + compare). Heavy-dep sims (torch/taichi/warp)
add install time (~1–3 min each). 15 parallel `ubuntu-latest` jobs → well under the
§ 4.12 60-min budget; no sharding required.

## § 6 — Verdicts (four-state)

| Assumption (phase plan § 6.3 / R1 / R3) | Verdict | Notes |
|---|---|---|
| Bootstrap re-emit is programmatic (`sim_runner_seeded`/`default_capture` + `compare_captures(json,json)`) | CONFIRMED | proven bit-exact on ising-classical |
| `python -m testkit.equivalence` CLI exists | REFUTED | no `testkit` module; programmatic harness only (R1) |
| `[project.scripts]` capture-CLI is a qualifying gate | REFUTED | optional (R1); no sim ships one |
| Every pypi:true sim has a committed capture to round-trip | SHIFTED | only 6 do; 8 use golden-table surrogate (R3) |
| sims follow `bit-physics-<category>-<sim>` namespace (§ 4.6) | SHIFTED | all ship plain names; lint = SHIFTED, not fail; not patched |
| sim wheels install correctly in a fresh venv | SHIFTED | `bit-physics-testkit` omitted `schemas/`; force-include fix applied (additive) |
| `[defaults.continuous-ca]` present for neural-ca | SHIFTED | absent; MEASURED + added at this dispatch (R3 § C-6) |
| Tool dir invoked via `python -m …` (§ 5.4 skeleton) | SHIFTED | hyphenated dir → invoked by PATH (preflight-phase.py precedent) |

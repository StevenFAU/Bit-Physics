---
date: 2026-06-08T14-54-09Z
author: phase-5 sub-phase 5.3 pypi-release session (Claude Code)
subject: "Phase-5 sub-phase 5.3 (pypi-release) — build-and-validate the full pypi:true pool through the spec § 3.8 bootstrap gate (fresh-venv install → re-emit → compare_captures / golden surrogate). NO publish (deploy gated OFF). Resumed after an environment move; oriented from committed state."
kind: sub-phase-landing
verdict: SHIFTED
phase: 5
sub_phase: "5.3"
head_sha: <PLACEHOLDER — back-filled per Convention #12 at the next commit>
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
evidence_paths:
  - tools/productization/pypi-release/pipeline.py
  - tools/testkit/equivalence/tolerance.toml
  - docs/perf-ledger.md
evidence_hashes:
  tools/productization/pypi-release/pipeline.py: sha256:684cb0caa63f924329bc51f128a607ed7b1c4de8f83df3b9ff5a958aeaae3925
  tools/testkit/equivalence/tolerance.toml: sha256:d19084331cd6504ac284db289ca0453dd92a690603beceb536ef0405bb51c0ba
  docs/perf-ledger.md: sha256:dfdf7db23a3e5ab08fb3565fffc386f04b381c22d17b340e67a1b33478f3ceff
---

# Phase 5 — sub-phase 5.3 (pypi-release) build-and-validate landing

> Build-and-validate ONLY — NO publish to live PyPI; the `deploy` job in
> `pypi-release.yml` stays gated OFF (§ 4.5). The § 3.8 bootstrap round-trip is the
> REAL gate; never stubbed, never fake-passed. FACT = ran/read/measured at the cited
> HEAD this session; INFERENCE = reasoned. Four-state verdicts (CONFIRMED / SHIFTED /
> BLOCKED / FLAGGED). Commits direct to `main` (trunk-based). NO tag (I7). Resumed
> after an environment move with NO prior context — oriented only from committed repo
> state (this audit's STEP 0). A fresh resume re-orients the same way.

## §0 — Headline

| | |
|---|---|
| **Build/validate commit** | `ecff491` (commit 2 — pipeline fixes + tolerance row + perf-ledger rows). This audit lands on top (commit 3); `head_sha` back-filled per Convention #12. — FACT |
| **Pool (live discover)** | **15 qualifying** pypi:true sims (MEASURED via `pipeline.py discover`, not the prompt). — FACT |
| **Result** | **14 PASS / 1 BLOCKED**. All 7 capture_roundtrip sims BIT-EXACT 0.0/0.0; 7 golden-table surrogates PASS; `3dgs-mpm-sh-update` BLOCKED on a fresh-venv Warp-deprecation in its test conftest (sim correct — anchors pass when filtered). — FACT |
| **Integrity (live)** | **0 HARD_FAIL / 14 SOFT_WARN, rc 0** — invariant HELD after every edit. Full-report digest `9894964135e582fc3d94448f87bdf8d859a1ff29e3675a45fa04a7f04b40b15f` (the 0HF/14SW COUNTS are the invariant; digest drifts by design). — FACT |
| **neural-ca tolerance** | `[defaults.continuous-ca] = 0.0/0.0` — MEASURED from the fresh-venv re-emit round-trip (21 fields, bit-exact). The R3/§C-6 named 5.3 precondition. measure-then-declare; NOT a widening. — FACT |
| **§0.3 SHIFT** | The fan-out MUST run under the uv-managed **Python 3.12.13** workspace interpreter; system `python3` is **3.14**, which has no Taichi/Torch cp314 wheels. CI already pins 3.12 (`uv python install 3.12`); the SHIFT is the local-invocation convention (`uv run python …`, not bare `python3`). — FACT |
| **Deploy** | stayed **gated OFF** — no publish; no PyPI upload occurred. — FACT |
| **Verdict** | **SHIFTED** — the full pool validated with two honest landed-reality SHIFTs (the 3.12-interpreter requirement; the wheelhouse-closure completion for dev-only siblings) and ONE surfaced BLOCKED package (sh-update Warp-deprecation). No round-trip divergence was hidden; no tolerance widened; no surrogate fabricated. |

## §1 — STEP 0 reconciliation outcome (new environment)

- **HEAD on origin/main** at session start: `d6f60f9` (= the WIP pre-environment-move
  safety checkpoint); local == origin, clean working tree (two pre-existing untracked
  `common/common-ts/package-lock.json` only). FACT.
- **Checkpoint check — PRESENT.** `d6f60f9` touches all four required files:
  `packages/mpm-multimaterial/pyproject.toml` (authored `[project.dependencies]`),
  `tools/productization/pypi-release/pipeline.py` (workspace-closure wheelhouse + venv
  cleanup), `tools/testkit/pyproject.toml` (schemas force-include), `uv.lock`. No
  re-derivation needed. FACT.
- **Disk:** 587 GB free at start (`/dev/nvme0n1p5`, 8% used); 580 GB free at close —
  the per-venv `shutil.rmtree(work/venv)` cleanup is WORKING (torch/taichi/warp venvs
  reclaimed; net +7 GB is the kept small pure-python wheelhouses + uv cache). FACT.
- **Tooling:** `uv 0.11.19`, `python3 3.14.4` (system), `git-lfs 3.7.1` present. The
  uv-managed workspace `.venv` is **CPython 3.12.13** (`uv run python` → 3.12.13). FACT.
- **R2/LFS credentials — ABSENT in env, but MITIGATED (FLAGGED).** No `R2_*` / `AWS_*`
  env vars are set; the custom `lfs-s3` standalone transfer agent is configured but
  unauthenticated locally. HOWEVER the LFS checkpoint neural-ca needs
  (`tools/testkit/golden/checkpoints/neural-ca-emoji-disk.safetensors`) is already
  **materialized** in the working tree (real 33 KB safetensors binary, `*` in
  `git lfs ls-files`, not a pointer), so neural-ca did NOT need a mid-fan-out R2 fetch.
  CI wires R2 via `secrets.R2_*` (`pypi-release.yml` lines 77-90) for the cloud run.
  FLAGGED for the operator: if a future local run needs a fresh LFS fetch, R2 creds
  must be configured in this environment. FACT (materialization) + FLAGGED (creds).
- **Re-orientation reading (committed state):** phase-5 plan § 5.3 / § 6.3; the
  reconciliation audit `reconciliation-2026-06-02T01-15-23Z.md` (R1 programmatic
  bootstrap, R2 § 13 five-boolean, R3 tolerance/surrogate routing, R4 canonicals);
  `sub-phase-conventions.md`; `tolerance.toml`; `pipeline.py`. No 5.3 probe/audit was
  present pre-session (only pre-dispatch-review + reconciliation under `phase-5/`). FACT.

## §2 — Method / the bootstrap gate (R1, not stubbed)

Per sim, via `pipeline.py validate --sim <name>` driven by `uv run python` (3.12.13):
build the sim's wheel + its transitive workspace-source wheelhouse → create a FRESH
isolated venv → `pip install` the wheel from the wheelhouse → re-emit / re-verify from
the INSTALLED artifact (site-packages isolation asserted) → judge:

- **capture_roundtrip** (committed `.h5` canonical): re-emit programmatically
  (`<pkg>.sim.sim_runner_seeded(42,out)` / `…capture.default_capture(out)` /
  `python -m neural_ca infer …`) then
  `equivalence.harness.compare_captures(canonical.json, reemit.json, tolerance.toml)`
  → assert `within_tolerance`. Deterministic same-hw → expect bit-exact 0.0/0.0.
- **golden_table_surrogate** (no committed `.h5`; R3): the installed wheel must pass the
  sim's OWN committed golden-anchor pytest suite (Quad4/Orbium, gradient-golden,
  force/energy, mass-conservation, analytic-L2/FD-L2, coupling/SH-rotation).

Hardware `i7-12700KF-linux-7.0` (same CPU as the prior `…-6.17` ledger rows; new kernel
post-move). Perf-ledger label `pypi-fresh-venv`.

## §3 — Per-package build-and-validate results (FACT)

All durations = full build + venv create + install + re-emit + compare, 3.12.13, venv
reclaimed post-validate.

| Sim | Stack | Gate | Verdict | Fields / anchors | wall (s) |
|---|---|---|---|---|---|
| ising-classical | D (NumPy) | compare_captures | **PASS** bit-exact 0.0/0.0 | 11 | 36.3 |
| articulated-pedagogical | E (Warp) | compare_captures | **PASS** bit-exact 0.0/0.0 | 202 | 33.4 |
| articulated-pedagogical-diff | E (Warp) | compare_captures | **PASS** bit-exact 0.0/0.0 | 4 | 39.1 |
| mpm-multimaterial | D (NumPy/numba) | compare_captures | **PASS** bit-exact 0.0/0.0 | 44 | 160.6 |
| mpm-multimaterial-stack-d | D (Taichi) | compare_captures | **PASS** bit-exact 0.0/0.0 | 44 | 409.5 |
| mpm-multimaterial-stack-e | E (Warp) | compare_captures | **PASS** bit-exact 0.0/0.0 | 44 | 338.4 |
| neural-ca | D (PyTorch) | compare_captures | **PASS** bit-exact 0.0/0.0 | 21 | 36.6 |
| lenia | D (Taichi) | golden surrogate | **PASS** (Quad4 + Orbium) | — | 35.0 |
| lenia-diff | D (Taichi) | golden surrogate | **PASS** (gradient-golden) | — | 52.2 |
| particle-lenia | D (Taichi) | golden surrogate | **PASS** (force/energy) | — | 36.5 |
| flow-lenia | D (Taichi) | golden surrogate | **PASS** (mass/zero-flow) | — | 38.6 |
| mpm-multimaterial-diff | D (Taichi) | golden surrogate | **PASS** (gradient-golden) | — | 80.1 |
| pinn-poisson | E (Torch) | golden surrogate | **PASS** (analytic-L2 + FD-L2) | — | 355.8 |
| 3dgs-mpm | E (Warp/Torch) | golden surrogate | **PASS** (coupling + render-sim, 11) | — | 44.1 |
| 3dgs-mpm-sh-update | E (Warp/Torch) | golden surrogate | **BLOCKED** (see § 5) | 9/9 filtered | n/a |

Every fresh-venv install succeeded for the 14; every capture_roundtrip reported
`within_tolerance=True` with `max_abs=0.0 max_rel=0.0`. Perf-ledger rows banked for all
14 (the BLOCKED row records the block). FACT.

**mpm-multimaterial dep-fix VALIDATED.** The Step-0 checkpoint authored
`[project.dependencies] = [bit-physics-testkit, h5py, numpy]` (it shipped with none); the
fresh-venv install now resolves `import numpy` / `from capture import …` and the
round-trip is bit-exact. The `sim.py` repo-relative `sys.path.insert` no-ops once testkit
is installed, as predicted. FACT.

## §4 — neural-ca MEASURED `[defaults.continuous-ca]` row (FACT)

- Re-emit surface wired this sub-phase: `pipeline.py` gained the **`module_main`** re-emit
  kind — roll the frozen LFS checkpoint forward via the INSTALLED console module
  `python -m neural_ca infer --grid 64 --steps 1000 --seed 42 --capture-every 50
  --checkpoint tools/testkit/golden/checkpoints/neural-ca-emoji-disk.safetensors`,
  locating the manifest by the canonical basename.
- MEASURED round-trip vs `captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000.json`
  (category continuous-ca; sim.name neural-ca): **21 fields, max_abs = 0.0, max_rel = 0.0
  (BIT-EXACT)**, `within_tolerance=True`. The installed wheel's deterministic same-hw CPU
  PyTorch inference (matched stateless-PCG fire mask, frozen checkpoint, seed 42)
  reproduces the D-inference capture exactly — even with the fresh-venv torch resolving a
  newer build than the canonical's 2.12.0.
- Row added at the MEASURED value: `[defaults.continuous-ca] relative=0.0 absolute=0.0`
  (measure-then-declare, spec § 2.6; NOT a widening). Matches the ising-classical /
  rigid-body bootstrap rows. Without it `compare_captures` KeyErrors on category
  continuous-ca. `reaction-diffusion-3d` (also continuous-ca) is pypi:false + no-CMake —
  outside the 5.3 pool, so the default's only 5.3 consumer is neural-ca. FACT.

## §5 — BLOCKED: 3dgs-mpm-sh-update (surfaced, not forced)

- **Failure (MEASURED):** the fresh-venv `pytest` aborts at COLLECTION with
  `DeprecationWarning: warp.config.quiet is deprecated; use warp.config.log_level =
  warp.LOG_WARNING` — promoted to an error by the package's
  `[tool.pytest.ini_options] filterwarnings = ["error"]`. Source:
  `packages/3dgs-mpm-sh-update/tests/conftest.py:23` sets `wp.config.quiet = True` (a
  gate-13 log-suppression knob to keep module-load timing out of the failing-tests hash —
  **zero numeric effect**) before kernel load.
- **Root cause:** `warp-lang>=1.13,<2.0` resolves a NEWER Warp in the fresh venv than the
  1.13.0 authoring pin; that newer Warp deprecated `wp.config.quiet`. The base
  `3dgs-mpm` passes because its conftest does not set the knob — so within the 5.3 pool
  this is a single isolated package.
- **NOT a correctness divergence (MEASURED):** running sh-update's golden-anchor pytest
  in-repo with the deprecation filtered (`-W ignore::DeprecationWarning`) →
  **9 passed, 2 deselected** — the SH-rotation Wigner-D anchors are correct. The block is
  purely a test-infra API deprecation under the env-drifted Warp.
- **Disposition: BLOCKED, surfaced.** Per the sub-phase's "additive packaging/tooling
  only, no sim-code change" scope + HARD RULE 2 (surface real conflicts, never force), the
  sim-package conftest was NOT unilaterally edited. Recommended fixes for operator (§ 10).

## §6 — pipeline.py fixes this sub-phase (additive tooling)

1. **Wheelhouse closure completion.** `_workspace_dep_closure` now also walks
   `[project.optional-dependencies]` for workspace-source siblings. The checkpoint's
   stated intent ("a variant like -diff gets its base-sim sibling") was only partly
   realized: `lenia-diff` / `mpm-multimaterial-diff` declare their base sibling
   (`lenia` / `mpm-multimaterial-stack-d`) as a **dev-only** dep (the forward/equivalence
   test imports it), which the dependencies-only closure missed → `{wheel}[dev]` could not
   resolve the sibling → the harness fell back to a no-dev install → pytest **collection**
   of the sibling-importing test file failed, sinking the whole run (even though the
   `-k`-targeted golden-anchor test does not import the sibling). With the fix, the dev
   sibling is in the wheelhouse, `{wheel}[dev]` resolves, collection succeeds, and the
   `-k` filter still restricts EXECUTION to golden anchors (no broadening of the gate).
   VALIDATED: lenia-diff + mpm-multimaterial-diff PASS. FACT.
2. **`module_main` re-emit kind** wired for neural-ca (§ 4). FACT.

`pipeline.py` ruff-clean; the 9-pass pipeline smoke suite stays green after the edits
(`tools/productization/pypi-release/smoke/`, 9 passed / 1 skipped). FACT.

## §7 — §S.5 full CI sweep (this push)

- **Local pre-push (FACT):** integrity `--all --mode strict` 0 HF / 14 SW rc 0;
  `tools/testkit/equivalence/` 34/34; tolerance/budget integrity 1/1 (94 deselected);
  pipeline smoke 9 passed / 1 skipped; ruff clean; mypy/python-strict does not scope the
  hyphenated `pypi-release/` dir (covered by its own smoke suite).
- **Post-push CI** for `ecff491` (push to `main`, no tag): the always-on push-to-main
  suite ran (integrity, equivalence, determinism, python-strict, structure,
  tolerance-budget-check, mutation-testing, audit-append-only, ts-strict, cpp-strict,
  per-sim test-* matrix). **`pypi-release.yml` does NOT run on a bare main push** (it
  triggers on `push: tags: ['pypi-v*']`, path-scoped PRs, or `workflow_dispatch`), so the
  BLOCKED sh-update validate cell does not gate the main-push sweep. CI conclusion
  back-filled at commit 3 below. (See § 9 C-7 for the latent PR-trigger note.)

## §8 — §R digest + render/variant hard gates (FACT)

- **§R integrity digest at close HEAD:** `9894964135e582fc3d94448f87bdf8d859a1ff29e3675a45fa04a7f04b40b15f`; invariant 0 HF / 14 SW.
- **render_similarity (0.9242) + variant (0.8702) HARD mutation floors: UNAFFECTED.**
  This sub-phase touched no `tools/testkit/render_similarity/` or
  `tools/testkit/equivalence/variant/` SOURCE (`git diff --name-only` over the change set
  = `pipeline.py`, `tolerance.toml`, `perf-ledger.md`, this audit). The `[defaults.continuous-ca]`
  row is tolerance DATA, not render_similarity/variant code; the mutation floors are
  promoted on unrelated source. FACT/INFERENCE.

## §9 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt / plan) | Measured / reasoned | Disposition |
|---|---|---|---|
| C-1 | Bootstrap PASSes "banked" for ising/articulated/diff | NOT in committed state (no pypi rows in perf-ledger; no 5.3 audit) | Re-ran ALL through the harness; banked committed evidence (measure-live > prompt) |
| C-2 | `python tools/.../pipeline.py` (plan/smoke invocation) | system python3=3.14 → Taichi/Torch fresh-venv installs FAIL (no cp314 wheels) | **SHIFTED** — drive under `uv run python` (3.12.13); CI already pins 3.12 |
| C-3 | Checkpoint "build the -diff base-sim sibling" intent complete | base sibling is a DEV-only dep → closure missed it → collection error | **SHIFTED** — closure extended to optional-deps workspace sources |
| C-4 | neural-ca round-trip may be non-bit-exact (f32 conv-order) → MEASURE-and-add | MEASURED bit-exact 0.0/0.0 (21 fields) even on a newer fresh-venv torch | Row = 0.0/0.0 (measured); cleaner than feared |
| C-5 | All pypi:true sims validate clean | 3dgs-mpm-sh-update conftest uses deprecated `wp.config.quiet` under newer Warp | **BLOCKED** (sim correct; anchors 9/9 filtered); surfaced § 5/§ 10 |
| C-6 | R2 creds needed mid-fan-out for neural-ca | LFS checkpoint already materialized locally → no fetch needed | FLAGGED (creds absent) but not blocking; CI uses secrets.R2_* |
| C-7 | (latent) pypi-release CI stays green | a path-scoped PR touching pipeline.py / packages pyproject would run the matrix → sh-update cell red until § 10 fix | Surfaced; not triggered by this no-tag main push |

## §10 — SURFACED for operator (decide / ratify)

1. **3dgs-mpm-sh-update Warp-deprecation (BLOCKED).** Choose: (a) migrate the conftest
   knob `wp.config.quiet = True` → `wp.config.log_level = wp.LOG_WARNING` (the
   warp-sanctioned replacement, zero numeric effect — a test-infra edit, held out here per
   "no sim-code change"); OR (b) pin `warp-lang` below the deprecating release. Note the
   project-wide convention `wp.config.quiet=True` (e.g. eulerian-smoke-neural conftest)
   will hit the same deprecation on the newer Warp outside the 5.3 pool.
2. **PyPI namespace reservation** — reserve `bit-physics-*` as an OIDC trusted publisher
   BEFORE 5.3 PUBLISHES (not before build-validate). One-time owner action (plan § 4.5/4.6).
3. **R2 credentials in the moved environment** — configure `R2_*`/`AWS_*` for the local
   `lfs-s3` agent if a future local run needs a fresh LFS fetch (this run did not).
4. **Local-invocation convention** — record that the pypi-release fan-out must be driven by
   `uv run python` (3.12 workspace interpreter), not bare `python3` (system 3.14). CI is
   already correct.

## §11 — Closing

Sub-phase 5.3 (pypi-release) build-and-validate is COMPLETE; verdict **SHIFTED**. The full
live pool of 15 pypi:true sims was driven through the spec § 3.8 bootstrap gate: **14 PASS**
(7 capture_roundtrip BIT-EXACT 0.0/0.0; 7 golden-table surrogates) and **1 BLOCKED**
(`3dgs-mpm-sh-update`, a test-infra Warp deprecation under env-drifted Warp — the sim's
anchors pass 9/9 when filtered; surfaced, not forced, per HARD RULE 2). The neural-ca
`[defaults.continuous-ca] = 0.0/0.0` row is MEASURED (the R3/§C-6 5.3 precondition);
`pipeline.py` gained the wheelhouse optional-deps closure completion + the `module_main`
re-emit kind. Integrity held 0 HF / 14 SW across every edit; no tolerance was widened, no
surrogate fabricated, no round-trip divergence hidden. The **deploy job stayed gated OFF**
(no publish). The render_similarity (0.9242) + variant (0.8702) HARD floors are UNAFFECTED.
Two landed-reality SHIFTs (the 3.12-interpreter requirement; the dev-sibling closure) and
the one BLOCKED package are surfaced for operator ratification (§ 10). This sub-phase pushed
NO tag (I7).

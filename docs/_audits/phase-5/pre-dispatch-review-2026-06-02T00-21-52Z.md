---
date: 2026-06-02T00-21-52Z
author: phase-5 pre-dispatch-review session (Claude Code; mandated phase-plan-review per spec § 7.4 Convention E-addendum + Phase-5 plan v8 amendment)
subject: "Phase-5 PRE-DISPATCH REVIEW — bootstrap-style verification precondition audit + sim inventory by stack + per-pipeline qualification + 5.4/5.5 canonical picks + five pipeline shapes; PROPOSED, HARD-STOP for operator ratification"
kind: pre-dispatch-review
verdict: PROPOSED
phase: 5
head_sha: 2f0dc87
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
evidence_paths:
  - docs/phases/phase-5-productization.md
  - docs/_audits/phase-4/landing-2026-06-01T01-44-34Z.md
  - tools/testkit/lfs_migration/test_i7_no_agent_tags.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/harness.py
  - docs/sim-specs/_template.md
  - docs/perf-ledger.md
---

# Phase 5 — Pre-dispatch review (bootstrap-verification precondition + inventory)

> The mandated phase-plan-review (spec § 7.4 Convention E-addendum; Phase-5 plan
> v8 amendment) that runs BEFORE any sub-phase dispatches, because Phase 5's
> bootstrap-style verification posture is novel. FACT = ran/read/measured at the
> cited HEAD this session; INFERENCE = reasoned. Four-state verdicts (CONFIRMED /
> SHIFTED / BLOCKED / FLAGGED). This audit is PROPOSED + a HARD-STOP for operator
> ratification. It does NOT begin any Phase-5 sub-phase. The ONLY repo write this
> pass is the post-tag I7 follow-up (§1). Commits direct to `main` (trunk-based).
> NO phase tag (I7 — operator-only).

## §0 — Headline

| | |
|---|---|
| **Phase-4 tag** | **v0.4.0-phase-4 is PUSHED** (annotated, on close commit `d41333a`, present on origin) — FACT |
| **I7 post-tag follow-up** | **LANDED + pushed** at `2f0dc87`; §S.5 sweep GREEN (9/9 workflows). Sub-phase 5.1's STEP-0 replay precondition (the tag) is satisfied |
| **Review HEAD** | `2f0dc87` (this audit lands on top); integrity 0 HF / 14 SW, rc 0 (FACT, measured live) |
| **5.1 web (Stack B)** | **BLOCKED — ZERO qualifying sims.** No Vite/`package.json` build exists anywhere in `packages/`; the §6.1 "Vite build succeeds" gate is unsatisfiable by every landed sim |
| **5.2 binary (Stack C)** | **1 fully-qualifying + 1 partial.** Only 2 packages have a C++/CMake build; the 4 `binary:true`-flagged canonical sims are Python-only |
| **5.3 PyPI (Stack D/E)** | **Largest pool, but two structural preconditions** — re-emit is programmatic (no capture-emitting CLI) + cross-stack `compare_captures` KeyErrors on single-stack sims |
| **Bootstrap precondition** | Captures re-emit BIT-EXACT (3/3 spot-checks). The EQUIVALENCE leg has real gaps: wrong CLI in the plan + missing tolerance entries for whole categories |
| **5.4 canonical pick** | **eulerian-smoke** (recommend) — but NO sim has the §4.8-mandated committed Alembic/VDB asset → 5.4 would `REFUTED-blocking` under the literal criterion |
| **5.5 canonical pick** | **pinn-poisson** (recommend) — cleanest §6 + vendored upstream; sph-water is the explicit-`preprint:true` alternative |
| **Verdict** | **PROPOSED** — six operator-decidable items surfaced (§7); NO unilateral commitment; HARD-STOP |

## §1 — Phase-4 close-state + I7 follow-up disposition (FACT)

**The v0.4.0-phase-4 tag IS PUSHED.** `git tag -l 'v0.4.0-phase-4'` → present;
`git rev-list -n 1 v0.4.0-phase-4` → `d41333a…` (= the close commit, = HEAD before
this session); `git ls-remote --tags origin v0.4.0-phase-4` → present on origin
(`1c5f11ee…` annotated-tag object). So the close-state branch is **PUSHED**, and the
pending post-tag I7 follow-up was authorized.

**The I7 guard was RED before the follow-up.** With the tag pushed and in-range
(`git tag --contains v0.2.0-phase-2` now lists `v0.4.0-phase-4`) but absent from
`OPERATOR_SANCTIONED_TAGS`, `test_no_agent_pushed_tag_in_subphase_range` FAILED
(verbatim: `unsanctioned tag(s) … ['v0.4.0-phase-4']`). This is exactly the
descendant-commit window the Phase-4 close audit §7 anticipated.

**Follow-up landed (the ONLY authorized write this pass).** Added `v0.4.0-phase-4`
to `OPERATOR_PHASE_TAGS` in `tools/testkit/lfs_migration/test_i7_no_agent_tags.py`
(it goes in `OPERATOR_PHASE_TAGS`, not `OPERATOR_NONPHASE_TAGS`, because it carries a
`-phase-N` segment and `test_operator_phase_tags_present` must see it exist — the
tag is pushed, so the assertion holds). Commit `2f0dc87` (Convention-A single
focused commit; no Convention-12 back-fill needed). Mirrors the `v0.3.0-phase-3`
precedent landed post-tag at `638b247`.

- **FACT (post-fix):** `pytest test_i7_no_agent_tags.py` → 2 passed.
- **FACT (§S.5 sweep on `2f0dc87`):** integrity, equivalence, determinism,
  tolerance-budget-check, python-strict, ts-strict, structure, cpp-strict,
  audit-append-only — **all 9 completed success** (`gh run list`). No red.
- **FACT (integrity live at review HEAD):** `integrity --all --mode strict` →
  0 HARD_FAIL / 14 SOFT_WARN, rc 0. The 14 SW are the pre-existing phase-1/2
  `cat5.audit-links` notes (the invariant per [[integrity-baseline-digest-method]];
  per [[phase-3-r2-credentials-durability-fix-landed]] the digest drifts but the
  0HF/14SW COUNTS are the invariant — counts unchanged).

**Disposition: CONFIRMED.** Sub-phase 5.1 is no longer tag-blocked — its STEP-0
`replay_prior_phase --prior-phase phase-4` will resolve `v0.4.0-phase-4`.

## §2 — Sim inventory by stack + per-pipeline qualification (FACT, measured live)

### §2.1 — Where the authority lives (measured, not assumed)

- **Sim specs:** `docs/sim-specs/<category>/<sim>/spec-ref.md` — **17** canonical
  spec-refs (NOT under `packages/`; `find packages -name spec-ref.md` = 0).
- **§13 productization opt-out:** the five-boolean YAML (`web/binary/pypi/render/
  preprint`, each defaulting `true`) lives in `spec-ref.md` § 13 per the
  `_template.md`. **10 of 17 carry the YAML block; 7 carry the § 13 HEADER but
  PROSE instead of the YAML** (see §2.4 — a real gap).
- **Build artifacts (the actual stack discriminator):** `package.json`/Vite (B),
  `CMakeLists.txt` (C), `pyproject.toml` (D/E). Measured across all 34 `packages/`
  dirs (recursive).
- **Canonical captures:** `captures/<sim>-ref/<descriptor>.h5` (+ `.json` manifest).
  All present as real HDF5 (no LFS-pointer stubs) — 17 `-ref` dirs + stack-variant
  capture dirs.

### §2.2 — The 17 canonical sims (stack from spec-ref §1/§5; flags from §13 YAML)

| # | Sim (category) | Primary stack | §13 web/bin/pypi/render/preprint | Build artifact present |
|---|---|---|---|---|
| 1 | boids-3d (agent-based) | **B** | T / F / F / T / F | `pyproject` only (no Vite) |
| 2 | physarum (agent-based) | **B** | T / F / F / T / F | `pyproject` only (no Vite) |
| 3 | mandelbulb-explorer (closed-form) | **B** | T / F / F / T / F | `pyproject` only (no Vite) |
| 4 | strange-attractors (closed-form) | **B** | T / F / F / T / F | `pyproject` only (no Vite) |
| 5 | reaction-diffusion-2d (continuous-ca) | **B** (+C/D/E variants) | T / **F** / F / T / **T** | WGSL `src/` + `pyproject`; **no Vite**. C++ build is in the `-stack-c` VARIANT |
| 6 | neural-ca (continuous-ca) | **B + D** (dual) | *prose-only (§2.4)* | `python/` (pyproject) + `typescript/` WGSL; **no Vite** |
| 7 | lenia (continuous-ca) | **D** | *prose-only* | `pyproject` |
| 8 | reaction-diffusion-3d (continuous-ca) | **C** | F / T / F / T / T | `pyproject` only — **no CMake** |
| 9 | mpm-multimaterial (hybrid-pg) | **D** (+E) | F / F / **T** / T / T | `pyproject` |
| 10 | lattice-boltzmann-d3q19 (lattice) | **C** (+D/E variants) | F / T / F / T / T | `pyproject` only — **no CMake** |
| 11 | ising-classical (lattice-spin) | **B** | *prose-only* | WGSL `src/` + `pyproject`; **no Vite** |
| 12 | pinn-poisson (learned-dynamics) | **E** (+PyTorch) | *prose-only* | `pyproject` |
| 13 | 3dgs-mpm (neural-rendered) | **E** | *prose-only* | `pyproject` |
| 14 | sph-water (particle-fluids) | **C** (+D variant) | F / T / F / T / T | `pyproject` only — **no CMake** |
| 15 | articulated-pedagogical (rigid-body) | **E** | *prose-only* | `pyproject` |
| 16 | mass-spring-cloth (soft-body) | **C** | *prose-only* | **`CMakeLists.txt`** ✓ |
| 17 | eulerian-smoke (volumetric-grid) | **C** (+D/E variants) | F / T / F / T / T | `pyproject` only — **no CMake** |

**Stack-variant packages (no own spec-ref; inherit the canonical §13):** the repo
also carries `*-stack-c / *-stack-d / *-stack-e / *-diff` ports — e.g.
`reaction-diffusion-2d-stack-c` (**CMake** ✓), `reaction-diffusion-2d-stack-d`,
`sph-water-stack-d`, `eulerian-smoke-stack-{d,e}`, `lattice-boltzmann-d3q19-stack-{d,e}`,
`mpm-multimaterial-stack-{d,e}`, plus Phase-4's 9 `-diff`/frontier packages
(`reaction-diffusion-2d-diff`, `mpm-multimaterial-diff`, `lenia-diff`,
`eulerian-smoke-diff`, `articulated-pedagogical-diff`, `3dgs-mpm-sh-update`,
`eulerian-smoke-neural`, `particle-lenia`, `flow-lenia`). **Build-artifact census
repo-wide: exactly 2 `packages/*/CMakeLists.txt` (`reaction-diffusion-2d-stack-c`,
`mass-spring-cloth`); ZERO `package.json`/`vite.config.*` (the only `package.json`
files are `common/common-ts/`); ~30 `pyproject.toml`.**

### §2.3 — Per-pipeline qualification

**5.1 web — Stack B (boids-3d, physarum, mandelbulb-explorer, strange-attractors,
reaction-diffusion-2d, neural-ca, ising-classical).** § 6.1 demands a *Vite build
that succeeds* + capture-export hook + settings panel + `web != false`. **No Vite
build exists for ANY sim.** WGSL shaders exist for only 3 (reaction-diffusion-2d,
neural-ca/typescript, ising-classical) — but no `package.json`, no settings panel,
no bundle harness. → **ALL Stack-B sims DEFERRED; 5.1 has ZERO qualifying sims.**
Verdict **BLOCKED** (operator-decidable — §7 item 2).

**5.2 binary — Stack C.** § 6.2 demands a CMake build + headless capture flags +
schema-valid capture + `binary != false`. The 4 canonical sims flagged `binary:true`
(reaction-diffusion-3d, lattice-boltzmann-d3q19, sph-water, eulerian-smoke) are
**Python-only — no C++ build** → DEFERRED. The only C++/CMake builds are
`reaction-diffusion-2d-stack-c` (its canonical §13 says `binary:FALSE`, but the flag
sits on the Python parent, not this variant — §2.5 mismatch) and `mass-spring-cloth`
(prose-only §13 → defaults true). → **Qualifying: `reaction-diffusion-2d-stack-c`
(full) + `mass-spring-cloth` (partial — no equivalence leg, §3.3).** Verdict
**SHIFTED** (real coverage = 1.5 sims, not the flag-implied 4).

**5.3 PyPI — Stack D + E.** Largest pool (~30 `pyproject` packages: the landed
Phase-2 stack ports + Phase-3 sims + Phase-4 `-diff`/frontier). § 6.3 demands
`pyproject` + a `[project.scripts]` capture-emitting CLI + clean-venv install + "CLI
runs N steps + produces capture" + `pypi != false`. **The capture-emitting CLI is
absent on the spot-checked sims** (§3.2) — re-emit is a programmatic call. So under
the *literal* § 6.3 criterion many Stack-D/E sims would DEFER; under a programmatic
re-emit the pool is large. Verdict **SHIFTED** (pool exists; the CLI criterion is
falsified — §3.2, §7 item 3).

### §2.4 — §13-MISSING sims (FLAG — a gap to surface, not silently fill)

**7 of 17 spec-refs have a `## 13. Productization status` HEADER but free-text PROSE
instead of the five-boolean YAML block** the spec-v2.1 template prescribes:

| Sim | §13 content (verbatim gist) |
|---|---|
| lenia | "Reference. Phase 3 task-3 is terminal…" |
| neural-ca | "Reference. task-6 is TERMINAL on the produce side…" |
| ising-classical | "Reference. …no later Phase-3 task imports `packages/ising-classical/`…" |
| pinn-poisson | "Reference sim (Layer 4). No USD export — DEFER…" |
| 3dgs-mpm | "`coupling.py` SIM-LOCAL… task-8 is TERMINAL on produce. NO tag." |
| articulated-pedagogical | "Phase-3 reference sim. Frontier variants… Phase-4+." |
| mass-spring-cloth | "Terminal reference sim. No downstream consumer-site obligation…" |

These are all Phase-3 sims that re-purposed the § 13 heading for a "reference-sim
terminality" note. Phase 5's `discover_qualifying_sims` reads
`productization.<stream>`; with NO `productization:` key present, behavior is
**undefined by the plan** (template says subkeys "default true," but here the whole
block is absent). FLAG: **resolve before 5.3/5.5 dispatch** (these include the 5.5
canonical candidate pinn-poisson and the only soft-body sim). Do NOT silently
backfill — operator decides whether the discover function treats a missing block as
all-true or as opt-out (§7 item 4). **Phase 5 does not patch sims; this is a
template-conformance gap on the Phase-3 cohort.**

## §3 — Bootstrap-verification precondition check (LOAD-BEARING — spot-checked live)

The productization gate (spec § 3.8; plan § 2.1 gate 7) = re-emit-canonical-capture-
in-fresh-env → round-trip-through-equivalence. I spot-checked ≥1 sim per stack by
**actually running re-emit + equivalence** (not assuming the path works).

### §3.1 — Re-emit leg: PASSES bit-exact (3/3 spot-checks)

| Stack | Sim spot-checked | Re-emit result | Equivalence verdict |
|---|---|---|---|
| **D** | reaction-diffusion-2d-stack-d | **byte-identical** (sha256 `2e93a751…`) | `compare_captures` **within_tolerance=True, bit-exact** (max_abs/rel_err=0.0, 22 entries) |
| **E** | articulated-pedagogical-diff | **byte-identical** (sha256 `fdd26edc…`) | `compare_captures` **RAISED KeyError** (no `[defaults.rigid-body]`) — §3.3 |
| **C** | reaction-diffusion-2d-stack-c | built+re-emit (12s configure, 4s build) | gate-14 driver **within_tolerance=True, bit-exact** (peak_abs/rel=0.0) under lavapipe |
| **C** | mass-spring-cloth | built+re-emit (witness hash `90c36c37…`) | **no equivalence op defined** (no soft-body tolerance / no NumPy oracle) — §3.3 |

All canonical captures are genuinely, deterministically re-emittable (bit-exact
same-hw — matching each manifest's `claimed = "bit-exact-same-hw"`). The C++
toolchain is present on this host (cmake 3.28.3, lavapipe LLVM 20.1.2, HDF5
1.10.10); both C++ binaries build in seconds. **The re-emit leg is sound.**

### §3.2 — Equivalence leg gap A: the plan's CLI does not exist (FLAG → SHIFTED)

The plan's STEP-5a commands invoke `python -m testkit.equivalence --source … --port …
--strict`. **Measured:** (a) there is no `testkit` top-level module
(`ModuleNotFoundError`); the actual module is **`equivalence`** (uv workspace member
under `tools/testkit/equivalence/`). (b) The `python -m equivalence` CLI exposes only
`--mode render-similarity` (required arg) — it **cannot perform a generic numeric
capture diff**; its own docstring states `compare_captures` is the contract surface
and the CLI must not invoke it implicitly. → **The bootstrap round-trip for 5.1/5.2/
5.3 must call the PROGRAMMATIC `equivalence.harness.compare_captures(left_json,
right_json)`, not the CLI shown in the plan.** Every sub-phase agent will hit this at
its Convention-M probe; the plan's STEP-5a command blocks are stale (Convention-M
drift). SHIFTED — corrected shape documented here for the pipeline-shape designs (§5).

Gap B (re-emit CLI): the § 6.3 / STEP-5a assumption that a sim re-emits via a
console-script (`bit-physics-… --seed 42 --steps 2000 --capture …`) is **FALSIFIED**
on both Stack-D and Stack-E spot-checks. reaction-diffusion-2d-stack-d has **no
`[project.scripts]`** at all; re-emit is `sim.sim_runner_seeded(seed, out_dir)`.
articulated-pedagogical-diff's CLI only PRINTS (no `--output`/`--seed`/capture path);
re-emit is `capture.default_capture(out_dir)`. The seed/steps/grid are locked in
`canonical_params()`/`CANONICAL_STEP_COUNT`, not CLI flags. → **5.3's pipeline must
re-emit via the sim's Python capture surface (or each sim must gain a capture-emitting
CLI — out of Phase-5 scope, "Phase 5 does not patch sims").** This is the single
biggest 5.3 design correction.

### §3.3 — Equivalence leg gap C: tolerance-table coverage holes (FLAG)

`compare_captures` resolves tolerance via the cross-stack `[defaults.<category>]` /
`[overrides.<sim>]` tables ONLY. `tolerance.toml` categories present:
`closed_form, reaction-diffusion, sph, mpm, smoke, lbm` (+ per-sim overrides). Sims
whose tolerances live solely under `[golden_tolerance.<cat>.<sim>]` (single-stack) —
**lenia, ising-classical, articulated-pedagogical(-diff), mass-spring-cloth (soft-body),
neural-ca-python, pinn-poisson, 3dgs-mpm(-sh-update), eulerian-smoke-neural** — are
NOT consulted by the cross-stack path → **`compare_captures` raises KeyError** (FACT,
reproduced on articulated-pedagogical-diff: *"tolerance.toml has no defaults for
category 'rigid-body'"*). And **mass-spring-cloth has NO equivalence operation at
all** (no NumPy oracle, no soft-body tolerance; determinism = in-binary witness hash +
Hypothesis PBT invariants). → For any qualifying sim in that set, the bootstrap gate
either needs a `[defaults.<cat>]`/`[overrides.<sim>]` entry added to `tolerance.toml`
(operator-gated, under `tolerance-budget.toml`; agents may NOT widen unilaterally —
plan exclusions), or the gate must consult the `golden_tolerance` branch / use
witness-hash+PBT. **This is a load-bearing precondition for each such sim's pipeline
to VALIDATE** (§7 item 5).

### §3.4 — Bootstrap-precondition verdict

**SHIFTED.** Re-emit is sound and bit-exact everywhere tested. The equivalence leg
does NOT work end-to-end as the plan literally specifies: (A) wrong CLI — use
programmatic `compare_captures`; (B) no capture-emitting CLI — re-emit via the sim's
Python surface; (C) tolerance-table holes — single-stack/soft-body sims KeyError or
have no equivalence op. None is fatal, but each is a concrete precondition the
relevant sub-phase must resolve (and several require operator-gated `tolerance.toml`
edits) before its `build-and-validate` gate can pass.

## §4 — Canonical-sim recommendations (5.4, 5.5) — RECOMMEND, operator decides

### §4.1 — 5.4 render-passes → **eulerian-smoke** (recommend), with a blocking caveat

§ 4.8 criteria (all five): committed Alembic/VDB asset · published spec-ref · visual
interest (volumetric/particle/mesh) · passes per-sim determinism gate · `render !=
false`.

**Binding FACT:** **NO Alembic/`.abc`, `.vdb`, or `.usd` asset is committed anywhere
in the repo** (only `.venv` Warp/USD library assets). The § 4.8 PRIMARY criterion is
satisfied by **zero** sims → under the literal criterion 5.4 hits `REFUTED-blocking`
(halt without picking). The captures are `.h5` grid/particle state, NOT render assets.

**Recommendation (conditional on relaxing §4.8 to "committed `.h5` capture +
h5→render-asset conversion step"):** **eulerian-smoke** — volumetric smoke (the
canonical hero-shot volume render), `render:true` (explicit), Stack-C bit-exact
deterministic, modest 4.4 MB capture (CI-friendly CPU Cycles). Alternatives:
**sph-water** (100K-particle dam-break — most visually striking, 61 MB, `render:true`),
**reaction-diffusion-3d** (iso-surface, `render:true`). Avoid mpm-multimaterial
(1.1 GB capture — too heavy for a CI render). Verdict **FLAGGED** — operator must
relax § 4.8 or add an export step (§7 item 6); the pick itself is then routine.

### §4.2 — 5.5 preprint-extraction → **pinn-poisson** (recommend)

§ 4.9 criteria (all five): MMS or GCI report committed · ≥1 vendored upstream in
`references/` · frontier-variant story · spec-ref §1/3/4/6/12 populated · `preprint !=
false`. **Vendored-upstream map (from `references/*/MANIFEST.toml` `used_by_sims`):**
3dgs-mpm (3DGS+PhysGaussian), lenia (Chakazul), neural-ca (growing-neural-ca),
pinn-poisson (PhysicsNeMo-PINN), mass-spring-cloth (PositionBasedDynamics), sph-water
(SPlisHSPlasH). **reaction-diffusion-2d/3d, lattice-boltzmann, eulerian-smoke,
mpm-multimaterial have NO vendored upstream** (their anchors are papers cited-not-
vendored per A-8; `references/papers/` = `.gitkeep`).

**No single landed sim satisfies all five criteria cleanly** — each candidate misses
one (a finding in itself):
- **pinn-poisson (RECOMMEND):** cleanest § 6 — two-pronged (analytic golden L2=1e-3,
  ≥3 independent anchors) + classical-FD (L2=1e-2) + an **MMS-grade convergence-order
  check** (O(h²) over h∈{1/16…1/128}); vendored PhysicsNeMo-PINN (Raissi-2019 anchor);
  genuinely publishable PINN; frontier learned-dynamics category. **Gap:** § 13 is
  prose-only (§2.4) → `preprint` flag implicit-true, contingent on the §7-item-4
  resolution.
- **sph-water (ALTERNATIVE):** explicit `preprint:true` + SPlisHSPlasH vendored +
  DFSPH frontier story, BUT § 6 code-verification is golden-value and **GCI is
  declared-deferred (not committed)** → the "MMS or GCI report committed" criterion is
  thin.
- **reaction-diffusion-2d:** explicit `preprint:true` + cleanest "testkit demo"
  framing, BUT **no vendored upstream** (Gray-Scott/Pearson cited-not-vendored) and
  GCI/MMS deferred → fails the vendored-upstream criterion.

Recommendation: **pinn-poisson** (strongest on the §6-verification axis the review
brief emphasizes), with sph-water as the fallback if the operator wants an explicit-
`preprint:true` sim that doesn't depend on the §13-gap resolution. Verdict
**PROPOSED** (operator decides — §7 item 1b).

## §5 — Pipeline shapes (per sub-phase; per plan § 5.4/§5.5/§6.x, corrected for §3 findings)

Common to all five (plan § 5.4 skeleton, locked): workflow `.github/workflows/
<name>.yml`; `on: push tags:['<prefix>-v*'] + workflow_dispatch`; `concurrency`
group; **`build-and-validate` (CI-gated) vs `deploy` (gated on `workflow_dispatch` +
`confirm_deploy=='true'` + secret — NOT exercised in Phase 5)**; pinned action SHAs;
pipeline CLI verbs `discover`/`build`/`validate`; JSON sidechannel; three-commit
decomposition (new-files → modify-existing → SHA-back-fill) per one Claude Code
session per sub-phase, **same agent-role identity, serial**, each re-anchoring on the
prior sub-phase's commit-3 (plan v7 amendment). **Correction applied from §3.2:** the
bootstrap-verification step calls programmatic `equivalence.harness.compare_captures`,
not `python -m testkit.equivalence`.

| Sub-phase | Workflow | Matrix fan-out | Bootstrap step | Perf-ledger env label | Deploy (NOT run) |
|---|---|---|---|---|---|
| **5.1 web-deploy** | `web-deploy.yml` (`web-v*`), runner ubuntu, `setup-node` | one job per qualifying Stack-B sim — **currently 0** | Playwright Chromium re-emit → `compare_captures` | `webgpu-headless-chromium` | `actions/deploy-pages` (pages env) |
| **5.2 binary-release** | `binary-release.yml` (`bin-v*`), `actions/cache` on CMakeLists hash | `(qualifying-sim × {ubuntu,windows,macos})`, sharded — qualifying = rd2d-stack-c (+ msc partial) | clean-Docker re-emit → `compare_captures` (msc: witness-hash+PBT, §3.3) | `binary-docker-<os>` | `softprops/action-gh-release` (draft) |
| **5.3 pypi-release** | `pypi-release.yml` (`pypi-v*`), `setup-python` cache:pip | one job per qualifying Stack-D/E sim on ubuntu — large pool | **fresh venv → re-emit via sim Python capture surface (§3.2) → `compare_captures` (needs tolerance entry per §3.3)** | `pypi-fresh-venv` | `pypa/gh-action-pypi-publish` OIDC (needs §7-item-1 namespace) |
| **5.4 render-passes** | `render-passes.yml` (`render-v*`), Blender Docker pinned-digest, **build-and-validate only (no deploy)** | single job (1 canonical: eulerian-smoke) — **needs h5→VDB step (§4.1)** | N/A (render); render-similarity quality gate (run1 vs run2, PSNR≥40 / SSIM≥0.98) | `render-cycles-blender-<digest>` | none (renders committed to `docs/renders/`) |
| **5.5 preprint-extraction** | `preprint-extraction.yml` (`preprint-v*`), TeX Live Docker pinned-digest, build-and-validate only | single job (1 canonical: pinn-poisson) | N/A; cross-extraction byte-equal reproducibility gate + `latexmk` clean | `preprint-extraction-texlive-<digest>` | none (`docs/preprints/<sim>/`) |

**LFS note (§Q):** captures are LFS-backed; the re-emit spot-checks worked because the
working-tree captures are already smudged (real HDF5). Per
[[phase-3-r2-credentials-durability-fix-landed]] §Q, any LFS-touching sub-phase Stage
0 sources `setup-lfs-s3-local.sh` as its first action after the anchor probe. This
review touched no LFS objects.

## §6 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (from plan/prompt) | Measured / reasoned | Disposition |
|---|---|---|---|
| X-1 | Preflight exit 0 → proceed | exit 1 — only `path-exists:tools/productization` missing (the dir Phase 5 BUILDS) | **Expected pre-build false-positive** for a review; prior-phase-tag + sim-specs + integrity all PASS. NOT a real blocker (§7 item 7) |
| X-2 | Tag not yet pushed (plan assumes BLOCKED-until-push) | tag IS pushed → I7 follow-up authorized + landed | **CONFIRMED** — 5.1 tag precondition satisfied (§1) |
| X-3 | Each sim's §13 has the five-boolean YAML | 7/17 carry prose, not YAML | **FLAGGED** §13-gap on the Phase-3 cohort (§2.4) |
| X-4 | `binary:true` sims are Stack-C binaries | 4 of them are Python-only; only 2 CMake builds exist | **SHIFTED** (§2.3) — flag↔artifact mismatch |
| X-5 | Bootstrap uses `python -m testkit.equivalence` CLI | module is `equivalence`; CLI is render-similarity-only → use programmatic `compare_captures` | **SHIFTED** (§3.2) |
| X-6 | Sims re-emit via a `--seed --steps --capture` CLI | no capture-emitting CLI on D/E spot-checks; programmatic surface only | **SHIFTED** (§3.2) — biggest 5.3 correction |
| X-7 | `compare_captures` works against `tolerance.toml` for all sims | KeyErrors on single-stack `golden_tolerance` sims; soft-body has no equivalence op | **FLAGGED** (§3.3) |
| X-8 | 5.4 picks a sim with a committed Alembic/VDB asset | zero such assets exist repo-wide | **FLAGGED** (§4.1) — literal §4.8 → REFUTED-blocking |
| X-9 | 5.5 canonical satisfies all §4.9 criteria | no single landed sim does; each misses one | **PROPOSED** pinn-poisson + caveats (§4.2) |
| X-10 | spec §11.6 "Parallel … not a serial successor" | plan v7/v8 = serial single-agent, 5 sessions | **Plan governs** (operator-ratified v7/v8 supersedes §11.6 prose; §0.3 landed-reality) |

## §7 — SURFACED for operator (decide / ratify — NOT unilaterally decided)

1. **(a) PyPI namespace reservation — REQUIRED before 5.3 dispatches.** Reserve the
   `bit-physics-*` prefix on PyPI as a trusted (OIDC) publisher — a one-time owner
   action (plan v7 amendment; § 4.6 `bit-physics-<category>-<sim>`). **(b) 5.5
   canonical pick:** ratify **pinn-poisson** (recommend) or **sph-water**.
2. **5.1 web is BLOCKED — zero qualifying sims** (no Vite build exists; §2.3).
   Decide: ship 5.1 as pipeline-only with all Stack-B sims DEFERRED, OR defer 5.1
   until web builds exist (building them is OUT of Phase-5 scope — "Phase 5 does not
   patch sims"), OR re-scope 5.1. The 3 WGSL sims (rd2d, neural-ca, ising) still lack
   `package.json`/settings-panel/bundle harness.
3. **5.3 re-emit shape (§3.2).** Ratify that 5.3's pipeline re-emits via each sim's
   **programmatic Python capture surface** (no capture-emitting CLI exists), and that
   the bootstrap round-trip uses programmatic `compare_captures` (not the plan's stale
   `python -m testkit.equivalence` CLI).
4. **§13-gap on 7 Phase-3 sims (§2.4).** Decide how `discover_qualifying_sims` treats
   a missing `productization:` block (all-true default vs opt-out). Affects 5.3 pool
   membership AND the 5.5 pinn-poisson pick. Do NOT silently backfill the sims.
5. **`tolerance.toml` coverage holes (§3.3).** For each single-stack/soft-body
   qualifying sim, authorize (operator-gated, under `tolerance-budget.toml`) either a
   `[defaults.<cat>]`/`[overrides.<sim>]` entry OR a gate that consults
   `golden_tolerance` / witness-hash+PBT (mass-spring-cloth has no NumPy oracle).
6. **5.4 render asset (§4.1).** No committed Alembic/VDB asset exists → literal §4.8 →
   REFUTED-blocking. Relax §4.8 to a committed-`.h5` + h5→render-asset conversion step,
   OR designate an asset-export precondition. Then ratify **eulerian-smoke** (recommend)
   / sph-water / reaction-diffusion-3d.
7. **Preflight `tools/productization` (§6 X-1).** Confirm the exit-1 is the expected
   pre-build state (the dir is what 5.1 creates) and not a STOP for this review.

## §8 — Closing

The mandated Phase-5 phase-plan-review is COMPLETE and the verdict is **PROPOSED**
with a **HARD-STOP**. The one authorized write — the post-tag I7 allowlist follow-up
— LANDED at `2f0dc87`, pushed, §S.5 GREEN (9/9), integrity 0HF/14SW held; sub-phase
5.1's tag precondition is satisfied. The re-emit half of the bootstrap gate is sound
and bit-exact across all three stacks spot-checked; the equivalence half has three
concrete, non-fatal preconditions (wrong CLI → programmatic `compare_captures`; no
capture-emitting CLI → programmatic re-emit; tolerance-table coverage holes) that the
relevant sub-phases must resolve, several requiring operator-gated `tolerance.toml`
edits. Per-pipeline qualification is far narrower than the §13 flags imply: **5.1 = 0
qualifying (BLOCKED), 5.2 = 1 full + 1 partial, 5.3 = the large pool (gated on the
re-emit-shape + tolerance preconditions), 5.4 = blocked on a missing render asset,
5.5 = no clean all-criteria sim.** Seven items are SURFACED for operator ratification
(§7); NONE is unilaterally decided. **Do NOT dispatch any sub-phase until the operator
ratifies (at minimum: PyPI namespace + the 5.1 BLOCKED decision + the §13-gap +
canonical picks).** Resume on "continue" (or amended scope) → sub-phase 5.1. Verdict
**PROPOSED**.

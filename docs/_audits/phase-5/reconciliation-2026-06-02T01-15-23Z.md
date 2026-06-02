---
date: 2026-06-02T01-15-23Z
author: phase-5 reconciliation session (Claude Code)
subject: "Phase-5 RECONCILIATION — settle the three structural gaps + render/preprint decisions so sub-phases 5.2-5.5 run mechanically and the web track is cleanly scoped (R1-R4 + Phase-B web-track + Phase-C readiness)"
kind: reconciliation
verdict: SHIFTED
phase: 5
head_sha: 4022a13
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
evidence_paths:
  - tools/testkit/equivalence/tolerance.toml
  - docs/phases/phase-5-productization.md
  - docs/phases/phase-5-web-build-track.md
  - docs/sim-specs/continuous-ca/lenia/spec-ref.md
  - docs/sim-specs/continuous-ca/neural-ca/spec-ref.md
  - docs/sim-specs/lattice-spin/ising-classical/spec-ref.md
  - docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md
  - docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md
  - docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md
  - docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md
evidence_hashes:
  tools/testkit/equivalence/tolerance.toml: sha256:4d0aebb59cadab505fb07e5797de61ab02abf8a1bc9fd6fd368b4141628e1117
  docs/phases/phase-5-productization.md: sha256:1ac0941cfaac604d9670901ea4b3a1e39a82e6bb6123e291f968481d6bff7a40
  docs/phases/phase-5-web-build-track.md: sha256:763361d0a451b7d49dbb550d62b4322a9aa1408fe48b2fce06e55b86dd404f4e
  docs/sim-specs/continuous-ca/lenia/spec-ref.md: sha256:2caec650b58584303dc31c28b872cc1abdde21caaf06b34b4a5813fc17fa1e47
  docs/sim-specs/continuous-ca/neural-ca/spec-ref.md: sha256:1b687748fd2ce90fa0ac277b1876fa8a1bfa7f45b681c1119790b481588debc6
  docs/sim-specs/lattice-spin/ising-classical/spec-ref.md: sha256:efb466653118f889d049e50e82b94c3d4aed75d73f82a322587b33a9774f5913
  docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md: sha256:229aec61aae06a87b6a125dcccac16b4531959e429cc15ab69a7732e8a2dfc55
  docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md: sha256:b1fd86df07017d35080bc8487213dfcfe7d45d1c5086a8a11e6f52b860b2f8a6
  docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md: sha256:4f8aeaebc9313bc4b8ba8ca2de3bff22f9f9b5f2f1b78c910acc06803f382782
  docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md: sha256:4dae9b00be60e2ae538aa459a8d8291452f10999d73e7d1a653fbb9e7c0afed7
---

# Phase 5 — Reconciliation pass (R1-R4 + web-track scope + dispatch readiness)

> Settles the three structural gaps the pre-dispatch review
> (`docs/_audits/phase-5/pre-dispatch-review-2026-06-02T00-21-52Z.md`) surfaced,
> plus the operator-ratified render/preprint decisions, so sub-phases 5.2-5.5 run
> mechanically and the web track is cleanly scoped. FACT = ran/read/measured at
> the cited HEAD this session; INFERENCE = reasoned. Four-state verdicts
> (CONFIRMED / SHIFTED / BLOCKED / FLAGGED). This pass does NOT begin any
> productization sub-phase build. Commits direct to `main` (trunk-based). NO tag (I7).

## §0 — Headline

| | |
|---|---|
| **Pass HEAD** | `4022a13` (this audit lands on top; head_sha back-filled commit 5) — FACT |
| **Integrity (live)** | **0 HARD_FAIL / 14 SOFT_WARN, rc 0** — invariant HELD after every edit (FACT). Full-report sha256 digest `9894964135e582fc3d94448f87bdf8d859a1ff29e3675a45fa04a7f04b40b15f` (drifts by design; the **0HF/14SW COUNTS** are the invariant per [[integrity-baseline-digest-method]] + the r2-credentials-durability note) |
| **R1 — bootstrap re-emit** | SHIFTED-applied. Plan v9 block: programmatic `sim_runner_seeded`/`default_capture` re-emit + programmatic `compare_captures(json,json)`; the `python -m testkit.equivalence` CLI + § 6.3 `[project.scripts]` criterion corrected |
| **R2 — § 13 backfill** | CONFIRMED-applied. 7 prose § 13 → five-boolean YAML; all valid; integrity green |
| **R3 — tolerance coverage** | SHIFTED-applied. 2 MEASURED bit-exact `[defaults.*]` rows (ising-classical, rigid-body); 3 of the dispatch's 5 (lenia/pinn/3dgs) reclassified to golden-table surrogates (no committed capture); cloth = witness-hash surrogate |
| **R4 — render/preprint** | CONFIRMED-applied. § 6.4 asset criterion relaxed to `.h5`+conversion; 5.4 canonical = eulerian-smoke; 5.5 canonical = pinn-poisson |
| **Phase B — web track** | CONFIRMED-named. `docs/phases/phase-5-web-build-track.md` scopes the 7 Stack-B sims; 5.1 stays BLOCKED until ≥1 real web build exists; no frontend built |
| **Verdict** | **SHIFTED** — all four reconciliations + the web track landed, with TWO honest measured SHIFTs from the dispatch's premise (lenia/pinn/3dgs have no committed capture; neural-ca needs a `[defaults.continuous-ca]` row at 5.3 dispatch). No tolerance widened; no fabricated rows |

## §1 — Method / measured facts

- **Preflight** (`python3 tools/dispatch/preflight-phase.py 5`) → exit 1, single
  failure `path-exists:tools/productization` (the dir Phase 5 BUILDS); prior-phase-tag
  `v0.4.0-phase-4` PASS, sim-specs PASS, integrity-all-green PASS. **Expected
  pre-build state, NOT a STOP** (pre-dispatch-review § 7 item 7; X-1). FACT.
- **`python` is not on PATH**; use `python3` / `uv run python` (per
  [[bit-physics-integrity-preflight-tooling-traps]]). FACT.
- Re-emit + `compare_captures` run via the `equivalence` uv workspace member;
  `compare_captures` takes the `.json` manifest paths (NOT `.h5`), confirmed live. FACT.

## §R1 — Bootstrap re-emit is PROGRAMMATIC (SHIFTED-applied)

**What was falsified (MEASURED).** (a) The plan's STEP 5a `python -m testkit.equivalence`
CLI: there is no `testkit` top-level module; the harness is the `equivalence` workspace
member; `python -m equivalence` exposes only `--mode render-similarity`. (b) The § 6.3
"`[project.scripts]` capture-emitting CLI" criterion: the spot-checked Stack-D/E sims have
no capture-emitting console-script — re-emit is the sim's Python capture surface, with
seed/steps/grid locked in `canonical_params()`/`CANONICAL_STEP_COUNT`.

**Applied.** Plan v9 amendment block (normative; supersedes below) + inline § 6.3 SHIFT
pointer. **Corrected per-sim bootstrap recipe** (now in the plan + each capture-bearing
sim's § 13):

1. **Re-emit** programmatically: `<pkg>.sim.sim_runner_seeded(seed, out_dir)` (ising,
   rigid-body, reaction-diffusion-2d-stack-d) or `capture.default_capture(out_dir)` /
   the sim's `__main__` capture path. Descriptor fixed by the sim, not by CLI flags.
2. **Compare** programmatically: `equivalence.harness.compare_captures(Path(canonical_json),
   Path(reemit_json))` → assert `verdict.within_tolerance`.
3. **Tolerance source**: `tolerance.toml` resolved via `[overrides.<sim>]` (cross-stack,
   budget-capped) or `[defaults.<category>]` (no budget requirement). Golden-table sims
   (lenia/pinn/3dgs) and the no-oracle soft-body (cloth) use surrogates (§R3).

Verdict: **SHIFTED** (the CLI + console-script premises were falsified; the programmatic
path is the real one).

## §R2 — Five-boolean § 13 backfill (CONFIRMED-applied)

7 prose `## 13` notes converted to the spec § 8.2 five-boolean YAML. DEFAULT OPT-IN per
actual stack/capability; `false` only where genuinely N/A. The terminality prose is
retained as a provenance note under each YAML block (the machine-read block is the fenced
`yaml`; `discover_qualifying_sims` reads `productization.<stream>`).

| Sim | web | binary | pypi | render | preprint | Rationale (per-sim flag basis) |
|---|---|---|---|---|---|---|
| lenia | F | F | **T** | T | T | Stack D Taichi; pypi via pyproject; render (creatures); preprint (Chakazul vendored). No web/CMake surface |
| neural-ca | **T** | F | **T** | T | T | Dual-stack: web on the WGSL `typescript/` surface, pypi on the PyTorch `python/`. No CMake |
| ising-classical | **T** | F | **T** | T | T | web on WGSL `src/`; **pypi SURFACED-ambiguity** — primary artifact is the web demo but it ships a Python reference package (has pyproject), enabled per "productize everything" |
| pinn-poisson | F | F | **T** | T | T | Stack E + PyTorch; pypi; 5.5 preprint canonical. No web/CMake |
| 3dgs-mpm | F | F | **T** | T | T | Stack E; pypi; render (Gaussian-splat). No web build in repo; no CMake |
| articulated-pedagogical | F | F | **T** | T | T | Stack E Warp; pypi. No vendored upstream → 5.5 may defer despite preprint:true |
| mass-spring-cloth | F | **T** | **F** | T | T | Stack C CMake → binary:true; **pypi:false is the one genuinely-N/A flag** (pure C++; NO pyproject) |

All 7 YAML blocks parsed valid (five booleans each); `integrity --all --mode strict` =
0 HF / 14 SW after the edits. FACT. Verdict: **CONFIRMED**.

**Surfaced ambiguities (NOT silently guessed):**
- `ising-classical.pypi = true` — the sim's canonical artifact is the Stack-B web demo;
  it also ships a CI-visible NumPy reference Python package. Both `web` and `pypi`
  enabled per operator intent. Operator may set `pypi:false` if the Python package is
  oracle-only and not meant to ship.
- `ising-classical.preprint` + `articulated-pedagogical.preprint` = true despite NO
  vendored upstream → 5.5 `discover` may DEFER them under the § 4.9 vendored-upstream
  criterion; the flag is opt-IN, the discover gate is the actual filter.

## §R3 — Tolerance / equivalence coverage holes (SHIFTED-applied; MEASURED)

**The dispatch premise — "re-emit the canonical capture, compare to the in-repo canonical"
— holds for only 2 of the 5 named sims.** A full capture-inventory scan (every
`captures/**/*.json` manifest `sim.name`) is the load-bearing measurement:

| Sim (dispatch R3 list) | Committed canonical `.h5`? | Disposition |
|---|---|---|
| ising-classical | YES (`captures/ising-classical-ref/`, sim.name `ising-classical`) | **MEASURED tolerance row** |
| articulated/rigid-body | YES (`captures/rigid-body-pedagogical-ref/`, sim.name **`rigid-body-pedagogical`**) | **MEASURED tolerance row** |
| lenia | **NO** (only `flow-lenia`/`particle-lenia` Phase-4 variants) | golden-table SURROGATE |
| pinn-poisson | **NO** (verifies via `pinn-poisson-canonical.json`) | golden-table SURROGATE |
| 3dgs-mpm | **NO** (verifies via `3dgs-mpm-coupling.json`) | golden-table SURROGATE |

**Measured round-trips (re-emit in a fresh process → field-by-field diff vs in-repo
canonical):**
- `ising-classical`: 11 steps, 11 fields, **max_abs_err = 0.0, max_rel_err = 0.0** (BIT-EXACT).
  Re-emit: `ising_classical.sim.sim_runner_seeded(42, tmp)`.
- `rigid-body-pedagogical`: 101 steps, 202 fields, **max_abs = 0.0, max_rel = 0.0** (BIT-EXACT).
  Re-emit: `articulated_pedagogical.sim.sim_runner_seeded(42, tmp)`.

**Rows added** (`tolerance.toml`), at the MEASURED bit-exact value (measure-then-declare,
spec § 2.6; NOT a widening):
```toml
[defaults.lattice-spin]
relative = 0.0
absolute = 0.0
[defaults.rigid-body]
relative = 0.0
absolute = 0.0
```
**Why `[defaults.<category>]` not `[overrides.<sim>]`:** `_resolve_tolerance` falls through
to `defaults[sim_category]` when the sim is absent from `[overrides]`; and
`Cat-X.tolerance-budget` validates `[overrides.*]` ONLY (each override REQUIRES a
`[budgets.<cat>.cross_stack]` cap, else HARD_FAIL —
`tools/integrity/integrity/catx_tolerance_budget/tolerance_budget.py:145`). A
`[defaults.*]` carries no budget-cap requirement, so the bootstrap gate resolves while
integrity stays 0-HF and the operator-gated `tolerance-budget.toml` is untouched. The
`[defaults.rigid-body]` row also fixes the `articulated-pedagogical-diff` KeyError the
pre-dispatch review § 3.3 reproduced (same category, single-stack Warp). VERIFIED live:
`compare_captures` returns `within_tolerance=True` for both, resolving `lattice-spin/0.0/0.0`
and `rigid-body/0.0/0.0`. FACT.

**Surrogates (NO fabricated tolerance row — "never widen/fabricate to force a pass"):**
- **lenia / pinn-poisson / 3dgs-mpm** — no committed `.h5`; their § 3.8 bootstrap
  surrogate is the **golden-table re-check** (regenerate the golden table, compare to the
  committed `lenia-kernel.json` / `lenia-orbium-trajectory.json` / `pinn-poisson-canonical.json`
  / `3dgs-mpm-coupling.json` + the frozen-network analytic/FD or render-similarity checks).
- **mass-spring-cloth** — has a committed `.h5` but no NumPy oracle; § 3.8 surrogate is
  the **in-binary witness-hash round-trip + Hypothesis PBT re-check** (per the dispatch).

Each disposition is recorded in the sim's § 13 provenance note. Verdict: **SHIFTED**
(2 measured rows + 4 surrogates; the dispatch's 5-rows premise was partially falsified
on measured state).

**Remaining hole SURFACED (not silently fixed):** `[defaults.continuous-ca]` is absent.
`neural-ca` (5.3 `pypi:true`, committed capture `captures/neural-ca-ref/`, category
`continuous-ca`) and `reaction-diffusion-3d` (category `continuous-ca`) would KeyError on
`compare_captures`. rd3d is moot (no CMake → 5.2 DEFERRED; pypi:false). **neural-ca's 5.3
round-trip needs a `[defaults.continuous-ca]` (or `[overrides.neural-ca]`) row, MEASURED
from its re-emit round-trip (which needs the LFS-tracked checkpoint).** Scoped as a
5.3-dispatch-time per-sim precondition; NOT fabricated here.

## §R4 — Render / preprint decisions (CONFIRMED-applied)

- **5.4 render asset RELAXED** (operator-ratified): § 6.4 "has exported Alembic or VDB
  asset committed" → **"has a committed `.h5` canonical capture + an h5→render-asset
  conversion/export step."** FACT: no `.abc`/`.vdb`/`.usd` is committed anywhere in-repo.
  Applied as plan v9 R4 + inline § 6.4 pointer.
- **5.4 render canonical = `eulerian-smoke`** — volumetric, `render:true`, Stack-C
  bit-exact, 4.4 MB (CI-friendly CPU Cycles).
- **5.5 preprint canonical = `pinn-poisson`** — cleanest § 6 (≥3 analytic anchors +
  classical-FD + MMS-grade O(h²) convergence); physicsnemo-sym v2.4.0 vendored; its § 13
  five-boolean is now present (R2). FACT.

Verdict: **CONFIRMED** (both picks recorded; the relaxation is the honest fix to landed state).

## §B — Web-build track scope (CONFIRMED-named)

`docs/phases/phase-5-web-build-track.md` NAMES + QUEUES the track. 5.1 is **BLOCKED —
zero qualifying sims** (no `package.json`/Vite build under `packages/`). Two cohorts
(MEASURED):
- **WGSL-seeded (3):** reaction-diffusion-2d, neural-ca, ising-classical — each ships one
  `.wgsl` + one `.ts` entry; need the Vite/`package.json`/settings-panel/capture-hook bundle.
- **Greenfield (4):** boids-3d, physarum, mandelbulb-explorer, strange-attractors —
  Python-only; the entire web surface (shader + bundle + UI) is unwritten.

Per-sim web-build needs (Vite build gate § 6.1, WGSL bundling, settings panel § 10.1,
capture-export hook, WebGPU headless) are enumerated in the note. **No frontend built;
5.1 `web-deploy.yml` NOT authored** (it is authored inside sub-phase 5.1 once real web
builds exist). Verdict: **CONFIRMED** (named + queued, as scoped).

## §C — Dispatch-readiness per sub-phase

| Sub-phase | Readiness | Basis |
|---|---|---|
| **5.2 binary** | **READY (narrow)** | 1 full (`reaction-diffusion-2d-stack-c`, CMake, gate-14 bit-exact) + 1 partial (`mass-spring-cloth`, CMake, witness-hash+PBT surrogate). The 4 `binary:true` canonical sims (rd3d/lbm/sph/smoke) are Python-only → DEFERRED (flag↔artifact mismatch X-4). § 13 + tolerance fixes applied |
| **5.3 PyPI** | **READY** after R1+R2+R3, with ONE per-sim precondition: neural-ca needs a MEASURED `[defaults.continuous-ca]` row at dispatch (§R3). ising + rigid-body resolve via the new `[defaults.*]`; lenia/pinn/3dgs use golden-table surrogates; mpm-multimaterial resolves via its existing `[overrides.mpm-multimaterial]` |
| **5.4 render** | **READY** after R4 — § 6.4 relaxed; canonical = eulerian-smoke; render-similarity quality gate (run1 vs run2) is the gate, not capture-equivalence |
| **5.5 preprint** | **READY** after R4 — canonical = pinn-poisson; its § 13 five-boolean is present; reproducibility (byte-equal extraction) + latexmk-clean are the gates |
| **5.1 web** | **BLOCKED — awaits the web-build track** (zero qualifying; `docs/phases/phase-5-web-build-track.md` names the upstream work) |

## §S.5 — Full CI sweep (per push)

Local pre-push evidence (FACT, this session): `integrity --all --mode strict` 0 HF /
14 SW rc 0; equivalence tests 4/4; integrity tolerance/catx tests 7/7; the 7 § 13 YAML
blocks parse valid; `compare_captures` `within_tolerance=True` (bit-exact) for both
capture-bearing sims; tolerance schema validates. The **render_similarity (0.9242) +
variant (0.8702) HARD mutation floors are UNAFFECTED** — this pass touched no
`tools/testkit/render_similarity/` or `tools/testkit/equivalence/variant/` source (only
`tolerance.toml` data, spec-refs, plan, and two new docs). Post-push `gh run` sweep result
is back-filled at commit 5 below.

## §6 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (dispatch / plan) | Measured / reasoned | Disposition |
|---|---|---|---|
| C-1 | Preflight exit 0 → proceed | exit 1, only `tools/productization` missing | Expected pre-build state; NOT a STOP (X-1) |
| C-2 | R3: 5 single-stack sims have committed captures to round-trip | only ising + rigid-body do; lenia/pinn/3dgs are golden-table-verified (no `.h5`) | **SHIFTED** — 2 measured rows + 3 golden-table surrogates |
| C-3 | articulated capture sim.name = `articulated-pedagogical` | manifest sim.name = **`rigid-body-pedagogical`**; capture dir `rigid-body-pedagogical-ref` | Row keyed on category `rigid-body` (covers the canonical + the -diff variant) |
| C-4 | Add `[overrides.<sim>]` rows | overrides REQUIRE a `[budgets.<cat>.cross_stack]` cap (Cat-X HARD_FAIL); single-stack sims have no cross-stack budget | **SHIFTED** to `[defaults.<category>]` (no budget requirement; integrity stays 0-HF) |
| C-5 | mass-spring-cloth has a pyproject (pypi candidate) | NO pyproject (pure C++) | `pypi:false` (genuinely N/A); `binary:true` |
| C-6 | All capture-bearing pypi sims resolve after R3 | neural-ca (category continuous-ca) still KeyErrors — no `[defaults.continuous-ca]` | SURFACED as a 5.3-dispatch per-sim precondition (not fabricated) |
| C-7 | render_similarity/variant gates might be affected | they are mutation-promoted floors on unrelated source; untouched | UNAFFECTED |

## §7 — SURFACED for operator (decide / ratify)

1. **PyPI namespace reservation** — reserve the `bit-physics-*` prefix on PyPI as an
   OIDC trusted publisher. Required before 5.3 **PUBLISHES**, NOT before 5.3
   build-and-validate. One-time owner action (plan § 4.5/§ 4.6).
2. **`ising-classical.pypi = true`** — confirm the sim should ship a PyPI package (it has
   a Python reference package) vs. keeping the Python as oracle-only (`pypi:false`).
3. **`[defaults.continuous-ca]` for neural-ca** — authorize the 5.3 agent to MEASURE
   neural-ca's re-emit round-trip (needs the LFS checkpoint) and add the resolving row at
   5.3 dispatch (§R3 / §C C-6).
4. **5.2 binary coverage** — confirm the 4 Python-only `binary:true` canonical sims
   (rd3d/lbm/sph/smoke) DEFER to post-phase (no CMake), leaving 5.2 = rd2d-stack-c (full)
   + mass-spring-cloth (witness-hash surrogate).
5. **Web-build track sequencing** — confirm the web sims are built (operator-ratified) as
   a sub-phase BEFORE 5.1 dispatches, vs. shipping 5.1 pipeline-only with all Stack-B sims
   DEFERRED.

## §8 — Closing

The Phase-5 reconciliation is COMPLETE; verdict **SHIFTED**. R1 (programmatic bootstrap),
R2 (5/5-boolean § 13 backfill on 7 sims), R3 (2 MEASURED bit-exact tolerance rows + 4
surrogates), and R4 (render-asset relaxation + canonical picks) are APPLIED; the web-build
track is NAMED + QUEUED. Integrity holds 0 HF / 14 SW across every edit; no tolerance was
widened and no row was fabricated. Two honest measured SHIFTs from the dispatch premise are
surfaced (lenia/pinn/3dgs have no committed capture → surrogates; neural-ca needs a
`[defaults.continuous-ca]` row at 5.3 dispatch). Sub-phases **5.2 / 5.3 / 5.4 / 5.5 are
dispatch-ready** (5.3 with one named per-sim precondition); **5.1 awaits the web-build
track**. Five items are surfaced for operator ratification (§ 7). This pass began no
sub-phase build and pushed no tag (I7).

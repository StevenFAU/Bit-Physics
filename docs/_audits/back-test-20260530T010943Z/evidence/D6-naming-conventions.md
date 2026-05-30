# D6 — Typos, naming, convention compliance — evidence

- **Back-test:** 20260530T010943Z
- **HEAD:** 4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9 (`docs(phase-3): 3dgs-mpm Stage 2 landing audit + progress (task-8, Phase-3 FINALE)`)
- **Worktree:** /home/otacon/Projects/bp-audit-2 (READ-ONLY for source)
- **Dimension D6:** (a) five-dimension canonical naming consistency per BUILT sim across all five surfaces; (b) Appendix-G + Appendix-D naming/convention rules in `docs/architecture.md`; (c) Phase-3 landing-audit filenames vs the `sub-phase-phase-3-<sim>-landing-<UTC>.md` convention; plus grammar on NEW spec/plan docs.
- **Method:** grep/read only. NO SAMPLING — every denominator stated, checked == denominator.
- **Delta vs prior back-test (20260529T124759Z, pin 869bf68):** tasks 5–8 (mass-spring-cloth, neural-ca, pinn-poisson, 3dgs-mpm) are now BUILT (were UNCHECKABLE-AT-PIN). Built canonical-sim denominator grew 15 → 19. Phase-3 sub-phase landing audits grew 5 → 9. Four prior MINORs re-confirmed LIVE; one prior MAJOR (M-6/N-5) LIVE; one prior MAJOR (BT-2/M-7) CHANGED (1 outlier → 5 outliers, now a systematic pattern).

Authority anchors (all `docs/architecture.md` unless noted):
- §D.1 five-dimension naming map: `:2401`; capture-dir rule `captures/<sim>-<variant-or-ref>/` `:2409`; spec-dir rule `docs/sim-specs/<category>/<sim-name>/` `:2406`; audit-dir rule `<artifact>-<UTC>.md` `:2407`.
- §D.1 sim-name canonical list: `:2426`–`:2438`.
- §D.1 category list: `:180`, `:2433` (`particle-fluid` singular).
- Landing-audit flat-convention: the on-disk Phase-3 sibling pattern `sub-phase-phase-3-<sim>-landing-<UTC>.md` + sub-phase-conventions §B.4 (`landing-<UTC>.md` token + UTC).

---

## Part (a) — Five-dimension canonical naming consistency per BUILT sim

### Denominator

The §D.1 canonical sim-name list (`:2426`–`:2438`) has **24 distinct canonical sim names** across 13 categories. At HEAD, BUILT base packages under `packages/` = 17 (excluding 9 cross-stack `-stack-c/d/e` variants). These map to **19 BUILT canonical sims** (17 base packages + the variant-only ports of eulerian-smoke/lbm/mpm/sph/rd2d carry the parent canonical name):

strange-attractors, mandelbulb-explorer, reaction-diffusion-2d, reaction-diffusion-3d, lenia, **neural-ca**, boids-3d, physarum, sph-water, eulerian-smoke, lattice-boltzmann-d3q19, ising-classical, mpm-multimaterial, articulated-pedagogical, mass-spring-cloth, **pinn-poisson**, **3dgs-mpm** (= 17 base) + cross-stack variants of rd-2d/eulerian/lbm/mpm/sph (fold into parent rows).

**Naming-denominator (built canonical sims) = 19. Checked = 19.**

UNCHECKABLE-AT-HEAD (5 of 24, no on-disk artifacts — Phase 4+): articulated-locomotion, granular-pile, manipulator-grasp, gns-particle, learned-closure-les.

### Cross-check method (per sim, EVERY surface that exists — not first-occurrence)

Five dimensions: (1) package dir `packages/<sim>/` (+ import module); (2) spec name (§D.1 list, §5.x reference-sim line, §D.2.3 descriptor row, `docs/sim-specs/<cat>/<sim>/`); (3) capture dir `captures/<sim>-ref/` + manifest `sim.name`; (4) registry keys (determinism `registry.toml`, golden/render `tolerance.toml`, golden-table filename); (5) CI job name. Plus legacy-capture fixture, tier3 dir, property-test dir, probe report.

### Result table (19 built sims)

| Sim (canonical) | Verdict | Notes |
|---|---|---|
| strange-attractors | CONSISTENT | pkg/spec/cap/registry/CI all `strange-attractors`. PBT helper `volume_contraction_rate_constant` (m-17a, see below). |
| mandelbulb-explorer | CONSISTENT | all surfaces |
| reaction-diffusion-2d | CONSISTENT-WITH-1-MINOR | live surfaces consistent; schema-corpus fixture `phase-0-rd-2d-ref.{h5,json}` abbreviates to `rd-2d` (m-6). PBT `periodic_bc_satisfied(tolerance=2.0)` in pkg tests (m-17b). |
| reaction-diffusion-3d | CONSISTENT | all surfaces |
| lenia | CONSISTENT-WITH-2-MINOR | pkg/cap-manifest/registry/CI/tier3/property all `lenia`; §5.2.2 (`:1065`) names it `lenia-fft` (m-4/lenia-fft); spec-ref `captures/lenia/` missing `-ref` (m-7). |
| **neural-ca** (NEW) | **DIVERGENT-1 (registry key)** | pkg `neural-ca`, import `neural_ca`, spec-ref + `captures/neural-ca-ref/` + manifest (pytorch + wgsl prongs) + determinism `[continuous-ca.neural-ca.training/.inference]` + render key `[render_similarity.continuous-ca.neural-ca]` + golden-table `cloth-*`/checkpoints + CI `test-neural-ca-train/-infer/-equiv` + legacy fixture `phase-3-neural-ca` ALL canonical. **BUT** golden key `[golden_tolerance.continuous-ca.neural-ca-python]` (`tolerance.toml:240`) appends `-python` to the SIM-NAME dimension. See N-8 (NEW). |
| boids-3d | CONSISTENT | all surfaces |
| physarum | CONSISTENT | all surfaces |
| sph-water | CONSISTENT-WITH-1-CATEGORY-MINOR | sim-name `sph-water` consistent everywhere; the CATEGORY dir is `docs/sim-specs/particle-fluids/` (plural) vs §D.1 canonical category `particle-fluid` (singular). See N-9 (NEW, pre-existing Phase-1/2). |
| eulerian-smoke | CONSISTENT | `captures/eulerian-smoke-ref/` canonical (unlike lbm/mpm siblings) |
| lattice-boltzmann-d3q19 | **DIVERGENT (capture dir)** | capture dir `captures/lbm-ref/` (abbrev `lbm` not in §D.1); manifest `sim.name` = correct `lattice-boltzmann-d3q19`. m-5/N-1 LIVE. |
| ising-classical | CONSISTENT | cap/registry/CI `test-ising-classical`/tier3/property all `ising-classical` |
| mpm-multimaterial | **DIVERGENT (capture dir)** | capture dir `captures/mpm-ref/` (abbrev `mpm` not in §D.1); manifest = correct `mpm-multimaterial`. m-5/N-2 LIVE. |
| articulated-pedagogical | **DIVERGENT (cluster, MAJOR)** | Canonical `articulated-pedagogical`: §D.1 (`:2438`), package, import, spec-ref leaf, determinism `[rigid-body.articulated-pedagogical]`, golden `[golden_tolerance.rigid-body.articulated-pedagogical]`. Divergent `rigid-body-pedagogical`: §5.8 (`:1175`), `captures/rigid-body-pedagogical-ref/` + manifest, CI `test-rigid-body-pedagogical` (`python-strict.yml:279`), tier3/property `rigid_body_pedagogical`, probe report, legacy fixture `phase-3-rigid-body-pedagogical`, landing audit `task-4-rigid-body-pedagogical.md`. M-6/N-5 LIVE. |
| mass-spring-cloth (NEW BUILT) | CONSISTENT-WITH-1-SPEC-MINOR | pkg/spec-ref/`captures/mass-spring-cloth-ref/` + manifest + determinism `[soft-body.mass-spring-cloth]` + golden `[golden_tolerance.soft-body.mass-spring-cloth]` + golden-tables `cloth-hanging/cloth-stretched.json` + CI (ctest-embedded, `cpp-strict.yml:95`) + legacy fixture `phase-3-mass-spring-cloth` ALL canonical. §D.2.3 (`:2509`) + §D.3 (`:2552`) STILL use stale id `cloth-xpbd` (m-9/N-6, on remediation path A-2). |
| **pinn-poisson** (NEW) | CONSISTENT-WITH-1-SPEC-MINOR | pkg `pinn-poisson`, import `pinn_poisson`, spec-ref leaf + §5.x + determinism `[learned-dynamics.pinn-poisson.training/.inference]` + golden `[golden_tolerance.learned-dynamics.pinn-poisson]` + golden-table `pinn-poisson-canonical.json` + CI `test-pinn-poisson` (`python-strict.yml:477`) + `test-pinn-poisson-train` (`pinn-train.yml:30`) + legacy fixture `phase-3-pinn-poisson` ALL canonical. Spec-ref `captures/pinn-poisson` (`:174`) missing `-ref` (same class as lenia m-7). See N-10 (NEW). |
| **3dgs-mpm** (NEW, digit-leading) | CONSISTENT (alias handled) | pkg dir `packages/3dgs-mpm/` + PyPI dist `3dgs-mpm` (kebab, `pyproject.toml:2`); import package `gs_mpm` (snake, PEP 8 no-leading-digit, documented `pyproject.toml:4` + `:41`); determinism `[neural-rendered.3dgs-mpm]` + golden `[golden_tolerance.neural-rendered.3dgs-mpm]` + render `[render_similarity.neural-rendered.3dgs-mpm]` + golden-table `3dgs-mpm-coupling.json` + CI `test-3dgs-mpm` (`python-strict.yml:541`) + legacy fixture `phase-3-3dgs-mpm` (manifest `sim.name="3dgs-mpm"`) + property dir `gs_mpm` ALL consistent. Digit-dir↔`gs_mpm` alias applied uniformly: kebab `3dgs-mpm` for the NAME dimension (dist/sim-name/capture/registry), snake `gs_mpm` ONLY where a Python module is needed. **No drift.** |

### Cross-stack variants (parent-name carriers)

`reaction-diffusion-2d-stack-c/d`, `eulerian-smoke-stack-d/e`, `lattice-boltzmann-d3q19-stack-d/e`, `mpm-multimaterial-stack-d/e`, `sph-water-stack-d` — all carry the parent canonical sim-name + `-stack-<x>` suffix correctly in pkg dir + capture dir + manifest. CONSISTENT; folded into parent rows.

---

## Part (b) — Convention / rule compliance

### Denominator

- **Appendix G distinct conventions** (`:2947`): **21** (G.2–G.12 + four G.7 audit-trail disciplines + two G.7.5 mechanical sub-disciplines). Count unchanged from prior back-test.
- **Appendix D §D.8 forbidden-actions rules 1–17** (`:2628`): **17**. Count unchanged.

**Compliance denominator = 21 + 17 = 38. Checked = 38.** Plus sub-phase-conventions.md §§ A–S self-consistency.

### Result (unchanged at HEAD vs prior back-test — re-verified)

- **Appendix G:** 0 VIOLATED. 8 COMPLIANT (artifact-backed: G2.3 probe reports, G3.3 audit_prose_freshness.py, G7.2 four-state verdicts, G7.3 audit-append-only.yml, G7.4 verify_evidence.py + replay_prior_phase.py [path-drift caveat N-7/m-8], G7.5 replay_failing_tests.py + failing-tests-evidence/, G9 strict-mode.md, G10 server-hook workflows). 13 UNCHECKABLE-STATICALLY (process/history/server-side).
- **§D.8 rules:** 0 VIOLATED. 6 COMPLIANT (1 schema-bump, 6 failing-tests-first, 7 papers/SHAs pre-resolved + A-1..A-7 routing, 10 top-level dirs, 16 append-only mechanism, 17 tolerance-budget mechanism). 11 UNCHECKABLE-STATICALLY.
- **sub-phase-conventions.md:** §§ A–S self-consistent; §B.4 (landing audit MUST carry `landing` token + `-<UTC>`) corroborates N-5b below. No internal contradiction.

**One naming-convention citation-hygiene VIOLATION carries from spec text (N-7/m-8): `tools/integrity/scripts/<x>.py` (5 cites) does not resolve; actual = `tools/integrity/integrity/scripts/<x>.py`.** This is the only Part-(b) on-disk-falsified item.

---

## Part (c) — Spelling / grammar on shipped + NEW docs

Scope (denominator): README.md, docs/architecture.md, `docs/phases/phase-*-plan.md` (phase-0/1/3/4 + phase-6-charter), and the 6 NEW task-5–8 spec/equivalence docs (`mass-spring-cloth/spec-ref.md`, `neural-ca/spec-ref.md`, `neural-ca/equivalence.md`, `pinn-poisson/spec-ref.md`, `3dgs-mpm/spec-ref.md`, `articulated-pedagogical/spec-ref.md`). Checked = all.

- Common-typo scan (teh/recieve/seperate/occured/definately/wich/thier/untill/accross/commited/necesary/comparision/paramter/lenght/begining/occurence/alot/wether/orthagonal, etc.): **0 hits** across architecture.md, phase-3-plan.md, and all 6 new spec docs.
- Doubled function-word scan (the the / a a / of of / to to / is is / and and / for for / that that / on on / by by / are are / it it / or or / at at / in in / an an / be be / as as / with with): **0 hits** in new docs + phase plans.
- **0 REAL spelling/grammar errors** in shipped or new docs (domain jargon excluded).

Content-staleness (NOT a typo, MINOR, carries from prior): `README.md:49` "Phase 0 (Foundation) in progress" — repo is end-of-Phase-3 at HEAD.

---

## Part (d) — Phase-3 landing-audit filename convention

### Denominator

Sub-phase LANDING audits under `docs/_audits/phase-3/`: **9 total** (one per landed sub-phase). Convention (flat Phase-3 sibling pattern + sub-phase-conventions §B.4) = `sub-phase-phase-3-<slug>-landing-<UTC>.md` (carries `sub-phase-phase-3-` prefix + `landing` token + `-<UTC>.md` suffix). Checked = 9.

| # | Landing audit filename | Verdict |
|---|---|---|
| 1 | `sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md` | CONFORMS |
| 2 | `sub-phase-phase-3-render-similarity-landing-2026-05-28T14-20-30Z.md` | CONFORMS |
| 3 | `sub-phase-phase-3-lenia-landing-2026-05-28T16-00-43Z.md` | CONFORMS |
| 4 | `sub-phase-phase-3-ising-classical-landing-2026-05-28T22-40-00Z.md` | CONFORMS |
| 5 | `task-4-rigid-body-pedagogical.md` | **BREAKS** (no prefix, no `landing` token, no UTC suffix; divergent sim-name) |
| 6 | `task-5-mass-spring-cloth.md` | **BREAKS** (no prefix/token/UTC) |
| 7 | `task-6-neural-ca.md` | **BREAKS** (no prefix/token/UTC) |
| 8 | `task-7-pinn-poisson.md` | **BREAKS** (no prefix/token/UTC) |
| 9 | `task-8-3dgs-mpm.md` | **BREAKS** (no prefix/token/UTC) |

**5 of 9 BREAK** — every SIM sub-phase from task-4 onward uses `task-N-<sim>.md`; only the 4 EARLY sub-phases (common-3dgs, render-similarity, lenia, ising-classical) conform. Each breaking file IS confirmed a landing audit via front-matter (`subject: … LANDING audit`, `verdict: closed-with-shifted-N`). The UTC is present only in front-matter `date:` (e.g. task-4 `2026-05-29T01-19-26Z`, task-8 `2026-05-29T22-55-29Z`), not the filename. The rigid-body sub-phase's own STAGE audits use slug `sub-phase-phase-3-rigid-body-stage-*` → the conforming landing filename would be `sub-phase-phase-3-rigid-body-landing-2026-05-29T01-19-26Z.md`. **CHANGED from prior:** prior back-test found 1/5 breaking (task-4 alone); at HEAD this is a 5/9 SYSTEMATIC pattern.

---

## Findings

Row shape: `ID | sev | location (file:line, repo-relative) | claim | observed | remediation`

### Re-tested prior findings — verdict table

| Prior ID | New ID | Sev | Status | Location | Observed at HEAD | Remediation |
|---|---|---|---|---|---|---|
| M-6 / N-5 | N-5 | **MAJOR** | **LIVE** | `docs/architecture.md:1175` (§5.8); `captures/rigid-body-pedagogical-ref/`; `.github/workflows/python-strict.yml:279`; tier3/property `rigid_body_pedagogical`; `tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.*`; `docs/_audits/phase-3/task-4-rigid-body-pedagogical.md` | One sim, TWO names: canonical `articulated-pedagogical` (§D.1 `:2438`, package, import, determinism+golden keys) vs divergent `rigid-body-pedagogical` (§5.8 + capture + CI + tier3 + property + probe + legacy fixture + landing audit). task-4 did NOT resolve it. `spec-amendments-proposed.md` **A-1** (`:10`–`:39`) PRESERVES `rigid-body-pedagogical` in BOTH current AND proposed §5.8 text (only changes the algorithm phrase "maximal-coordinate"→"ABA"), so the name split is NOT on a remediation path. | Pick `articulated-pedagogical` (App-D authoritative); add a §5.8 amendment renaming the sim; rename capture dir / CI job / tier3 / property / probe / legacy fixture + manifest `sim.name`. |
| M-7 / BT-2 | N-5b | **MAJOR** | **CHANGED (1→5)** | `docs/_audits/phase-3/task-{4,5,6,7,8}-*.md` | Prior: only task-4 broke `…-landing-<UTC>.md`. At HEAD ALL 5 SIM landing audits (task-4 rigid-body, task-5 cloth, task-6 nca, task-7 pinn, task-8 3dgs) use `task-N-<sim>.md` — no `sub-phase-phase-3-` prefix, no `landing` token, no `-<UTC>` filename suffix. 4 early sub-phases conform. Now a systematic convention divergence, not an outlier. | Rename to `sub-phase-phase-3-<slug>-landing-<UTC>.md` using each file's front-matter `date:` (e.g. task-8 → `sub-phase-phase-3-3dgs-mpm-landing-2026-05-29T22-55-29Z.md`). |
| m-5 | N-1, N-2 | MINOR | **LIVE** | `captures/lbm-ref/`, `captures/mpm-ref/` vs §D.2.1 `:2409` | Dirs use abbrevs `lbm`/`mpm` absent from §D.1; manifests `sim.name` = correct `lattice-boltzmann-d3q19` / `mpm-multimaterial`. Not flagged in any audit/amendment. | Rename dirs to `captures/lattice-boltzmann-d3q19-ref/` + `captures/mpm-multimaterial-ref/`. |
| m-6 | N-3 | MINOR | **LIVE** | `tests/fixtures/legacy-captures/phase-0-rd-2d-ref.{h5,json}` | Abbreviated `rd-2d`; manifest `sim.name` = `reaction-diffusion-2d`. Cosmetic fixture-naming. | Rename fixture leaf to canonical. |
| m-7 (lenia) | N-4b | MINOR | **LIVE** | `docs/sim-specs/continuous-ca/lenia/spec-ref.md:252` | Capture path prose `captures/lenia/` (missing `-ref`). | Write `captures/lenia-ref/`. |
| m-7 (lenia-fft) | N-4 | MINOR | **LIVE** | `docs/architecture.md:1065` (§5.2.2) | Reference-sim line names it `lenia-fft`; canonical everywhere else = `lenia`. Spec frozen → route to amendments (not yet there). | §5.2.2 amendment `lenia-fft`→`lenia`. |
| m-8 | N-7 | MINOR | **LIVE** | `docs/architecture.md:1450, 1459, 3131, 3149, 3204` | Cites `tools/integrity/scripts/<x>.py`; actual path = `tools/integrity/integrity/scripts/<x>.py` (5 non-resolving cites; `python -m integrity.scripts.<x>` invocations ARE correct). | Correct the 5 path cites. |
| m-9 | N-6 | MINOR | **LIVE (on remediation path)** | `docs/architecture.md:2509, 2552` | §D.2.3 + §D.3 use stale id `cloth-xpbd`; on-disk is canonical `mass-spring-cloth`. `spec-amendments-proposed.md` **A-2** (`:43`–) proposes the correction. | Apply A-2 at phase boundary. |
| m-17a | N-11 | LOW/NUANCE | **LIVE** | `packages/strange-attractors/strange_attractors/invariants.py:66` + `tests/test_pbt_invariants.py:13,19` | PBT helper `volume_contraction_rate_constant` (descriptive invariant-name, not a §D.1-governed five-dimension name). No canonical-name contract governs PBT-helper identifiers. Recorded; no remediation owed. | None (out of five-dimension scope; informational). |
| m-17b | N-12 | LOW/NUANCE | **LIVE** | `packages/reaction-diffusion-2d/tests/test_pbt_invariants.py:195` + `…-stack-d/…:62` | `periodic_bc_satisfied(tolerance=2.0)` — PBT tolerance value, not a naming item. | None (D6 names only; flagged for a tolerance/physics dimension). |

### NEW findings (tasks 5–8 + re-enumeration)

| ID | Sev | Location (file:line) | Claim | Observed | Remediation |
|---|---|---|---|---|---|
| N-8 | MINOR | `tools/testkit/equivalence/tolerance.toml:240` | Five-dimension registry-key sim-name dimension MUST equal §D.1 canonical (`neural-ca`). | Golden key is `[golden_tolerance.continuous-ca.neural-ca-python]` — the SOLE registry key across all golden/render/determinism tables that appends a suffix (`-python`) to the SIM-NAME segment. The sibling render key (`:222`) uses canonical `[render_similarity.continuous-ca.neural-ca]`; determinism uses `[continuous-ca.neural-ca.training]`/`.inference` (`registry.toml:130,143`) — i.e. prong distinction belongs in a SUB-KEY, not the sim-name. Schema (`tolerance-schema.json`) permits any short-name (additionalProperties) so it is schema-valid but NAME-non-canonical. | Rename key to `[golden_tolerance.continuous-ca.neural-ca]` (move the Python-prong distinction to a sub-key or the surrounding render/training row split, mirroring the determinism `.training`/`.inference` pattern). |
| N-9 | MINOR | `docs/sim-specs/particle-fluids/` (dir); `docs/architecture.md:510`; `docs/dependencies.md:156,495,543`; `tools/testkit/golden/tables/particle-fluids/` | §D.1 canonical CATEGORY = `particle-fluid` (singular, `:180`, `:2433`, `:339`); §D.1 spec-dir rule `docs/sim-specs/<category>/<sim-name>/`. | The sph-water spec dir + golden-tables dir + several prose cites use `particle-fluids` (plural) — divergent from the singular canonical category. PRE-EXISTING (Phase-1/2 surface, not introduced by tasks 5–8); not previously flagged (prior D6 audited sim-NAMES, not category-dir names). sim-name `sph-water` itself is consistent. | Normalize the category segment to singular `particle-fluid` (dir rename + prose), or amend §D.1 to accept the plural; pick one and reconcile. |
| N-10 | MINOR | `docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md:174` | Capture-path prose MUST be `captures/<sim>-ref/` per §D.2.1. | Spec-ref CLI example writes `--out captures/pinn-poisson` (missing `-ref` variant segment). Same class as lenia N-4b. pinn captures are LFS legacy-fixtures (`phase-3-pinn-poisson.h5`, canonical) so no on-disk dir contradicts; the prose path-form is non-conforming. | Write `captures/pinn-poisson-ref`. |

### Clean-at-HEAD (NEW sims, no naming drift found)

- **mass-spring-cloth** — package/import/spec-ref/capture-dir+manifest/determinism+golden keys/golden-tables (`cloth-hanging/cloth-stretched.json`)/CI (ctest-embedded)/legacy-fixture ALL canonical. Only the pre-existing spec-internal `cloth-xpbd` (N-6, on A-2 path).
- **3dgs-mpm** — digit-leading dir handled UNIFORMLY: kebab `3dgs-mpm` for every NAME dimension (dist/sim-name/capture-manifest/registry-keys/golden-table/CI-job/legacy-fixture), snake `gs_mpm` ONLY for the Python import package + property-test dir (PEP 8, documented in `pyproject.toml:4`). **No five-dimension drift.**
- **pinn-poisson** — all five dimensions canonical except the N-10 prose capture-path `-ref` omission.
- **neural-ca** — all canonical except the N-8 golden-key `-python` suffix.

---

## Coverage counts

- **Part (a) naming:** denominator = 19 built canonical sims (of 24 §D.1; 5 UNCHECKABLE-AT-HEAD: articulated-locomotion, granular-pile, manipulator-grasp, gns-particle, learned-closure-les). Checked = 19. DIVERGENT: 4 (lattice-boltzmann-d3q19 capture, mpm-multimaterial capture, articulated-pedagogical cluster, neural-ca registry-key) + spec-internal/fixture minors (lenia-fft, lenia-path, cloth-xpbd, rd-2d fixture, pinn capture-path, particle-fluid category).
- **Part (b) compliance:** denominator = 21 (App-G) + 17 (§D.8) = 38. Checked = 38. VIOLATED = 0 (1 on-disk-falsified spec citation N-7); COMPLIANT = 14; UNCHECKABLE-STATICALLY = 24. sub-phase-conventions §§ A–S self-consistent.
- **Part (c) grammar:** denominator = README + architecture + 5 phase plans/charter + 6 new spec docs. Checked = all. REAL errors = 0.
- **Part (d) landing-audit filenames:** denominator = 9 Phase-3 sub-phase landing audits. Checked = 9. Convention-breaking = 5 (all SIM sub-phases task-4..8).

## DEFERRED / UNKNOWN

- **UNCHECKABLE-AT-HEAD (naming):** 5 unbuilt canonical sims (Phase 4+) — no on-disk occurrences.
- **UNCHECKABLE-STATICALLY (compliance):** 24 process/history/server-side conventions — verifiable only via git-history walk, platform branch-protection, or full-source code audit (outside D6 static scope).
- **No fabrication.** Every file:line above grep- or read-verified at HEAD 4ee0ea9.

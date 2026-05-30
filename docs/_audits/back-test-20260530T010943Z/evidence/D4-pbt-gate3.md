# D4 — PBT meaningfulness + gate-3 RED-evidence (back-test @ HEAD 4ee0ea9)

Worktree: `/home/otacon/Projects/bp-audit-2` (read-only for source).
HEAD = `4ee0ea9` ("docs(phase-3): 3dgs-mpm Stage 2 landing audit + progress (task-8, Phase-3 FINALE)").
Mutation SCORES out of scope here (separate background job; mutmut NOT run). This file covers
PBT meaningfulness, gate-3 RED + footer-hash integrity, re-tests (M-13, m-1, m-18), and
mutation-target POLICY (config/§2.13/catalog §41.4 read only).

============================================================
## DENOMINATORS
============================================================

- **PBT denominator** = every `packages/<sim>/tests/.../test_pbt_invariants.py` committed at HEAD
  = **25** files (enumerated below). Checked = 25. The `tools/testkit/property` harness
  (`harness.py` + `tests/test_harness.py`) and the per-sim predicate modules under
  `tools/testkit/property/sims/<sim>/invariants.py` are the predicate forms the package tests
  consume; they carry no `@given` (predicate functions only) and are exercised via the package
  tests, so they are not separately counted as PBT-test files. test_harness.py is the harness's
  own unit test, not a sim PBT, and is excluded from the PBT-sim denominator.
- **gate-3 denominator** = `tools/testkit/failing-tests-evidence/*.txt` = 39 files, minus 13
  `*-implemented-*` GREEN impl-witness files, minus 1 `*-stage1c-gate14-*` GREEN equivalence
  witness = **25** gate-3 RED failing-tests-evidence files. Checked = 25.

============================================================
## PART A — PBT meaningfulness (genuine @given vs degenerate witness)
============================================================

Mechanism reference (`tools/testkit/property/harness.py:93-106,134-163`): `run_invariants(...,
strategy=<S>, n_examples=N)` wraps `@settings(max_examples=N)` + `@given(<S>)` internally, so a
package test that passes a non-trivial `strategy=` IS genuine Hypothesis sampling. When
`strategy=None` the harness falls back to `st.just(None)` (single point = degenerate). Package
tests that import an `@given`-decorated callable from `<pkg>/invariants.py` and call it are also
genuine (the decorator drives the sampling).

Per-sim table (25 PBT files; #@given-in-test / #@given-in-pkg-invariants / sampling form):

| # | sim PBT file | sampling form | quoted strategy | verdict |
|---|--------------|---------------|-----------------|---------|
| 1 | 3dgs-mpm/tests/test_pbt_invariants.py | 2 `@given` in test | `n=st.integers(1,16), s=lists(_pos,3,3), q=lists(_finite,4,4)` + `diag=lists(_pos,3,3)`; `_pos=floats(0.05,3.0)`, `_finite=floats(-2,2)` | GENUINE |
| 2 | articulated-pedagogical/tests/test_pbt_invariants.py | 2 `@given` in test | `@given(lists[2] floats)` (energy_drift + ang-momentum, 10 ex) | GENUINE |
| 3 | boids-3d/tests/test_pbt_invariants.py | witness → pkg `invariants.py` (2 `@given`) | `@given(seed/n_agents/n_steps)` in boids_3d/invariants.py | GENUINE |
| 4 | eulerian-smoke/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | `@given(seed=integers(0,2³¹-1))` + `(seed,n_steps=integers(1,20))` in eulerian_smoke/invariants.py:82,116 | GENUINE |
| 5 | eulerian-smoke-stack-d/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | same form, eulerian_smoke_stack_d/invariants.py | GENUINE |
| 6 | eulerian-smoke-stack-e/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | same form, eulerian_smoke_stack_e/invariants.py | GENUINE |
| 7 | ising-classical/tests/test_pbt_invariants.py | harness `run_invariants(strategy=random_seed())` | `strategy=random_seed()`, n_examples=20 (lines 94-97,106-109) | GENUINE |
| 8 | lattice-boltzmann-d3q19/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | `@given((rho,u))` in lattice_boltzmann_d3q19/invariants.py | GENUINE |
| 9 | lattice-boltzmann-d3q19-stack-d/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | same form, stack-d invariants.py | GENUINE |
| 10 | lattice-boltzmann-d3q19-stack-e/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | same form, stack-e invariants.py | GENUINE |
| 11 | **lenia/tests/test_pbt_invariants.py** | **fixed-config witness, NO `@given`** | **none — `LeniaConfig(seed=42, grid=32, steps=5)` hard-coded (lines 55,72)** | **DEGENERATE** |
| 12 | mandelbulb-explorer/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | `@given` over [-2,2]³ / spherical, mandelbulb_explorer/invariants.py | GENUINE |
| 13 | mass-spring-cloth/tests/python/test_pbt_invariants.py | 2 `@given` in test (subprocess→C++→.h5) | `nx=integers(3,7), ny=integers(3,7), grav=floats(1,20), steps=integers(20,80)` (len) + `nx/ny=integers(3,6), vx/vy/vz=floats(-1,1), steps=integers(20,60)` (mom) | GENUINE |
| 14 | mpm-multimaterial/tests/test_pbt_invariants.py | 2 `@given` in test | `@given(...)` (mass round-trip + PoU, 50 ex) | GENUINE |
| 15 | mpm-multimaterial-stack-d/tests/test_pbt_invariants.py | 2 `@given` in test | `@given(...)` + `@given(p=floats(-100,100))` | GENUINE |
| 16 | mpm-multimaterial-stack-e/tests/test_pbt_invariants.py | 2 `@given` in test | `@given(...)` + `@given(p=floats(-100,100))` | GENUINE |
| 17 | neural-ca/python/tests/test_pbt_invariants.py | harness `run_invariants(strategy=random_seed())` + 1 `@given` | `strategy=random_seed(), n_examples=20` (field_values_bounded) + `@given(seed=integers(0,2³¹-1))` (inference_determinism, 20 ex) | GENUINE |
| 18 | physarum/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | `@given` (mass-balance + count), physarum/invariants.py | GENUINE |
| 19 | pinn-poisson/tests/test_pbt_invariants.py | 2 `@given` in test | `@given(seed=integers(0,2³¹-1))` → `torch.rand(256,1, generator=manual_seed(seed))` interior + boundary points, 15 ex each | GENUINE |
| 20 | reaction-diffusion-2d/tests/test_pbt_invariants.py | harness `run_invariants(strategy=smooth_scalar_field_in_unit_box(...))` | `strategy=smooth_scalar_field_in_unit_box(shape=(16,), lo=0.0, hi=1.0)` ×3 invariants | GENUINE |
| 21 | reaction-diffusion-2d-stack-d/tests/test_pbt_invariants.py | harness `run_invariants(strategy=smooth_scalar_field_in_unit_box(...))` | `strategy=smooth_scalar_field_in_unit_box(shape=(16,), lo=0.0, hi=1.0)` ×3 | GENUINE |
| 22 | reaction-diffusion-3d/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | `@given` (monotone + periodic roll-roundtrip), reaction_diffusion_3d/invariants.py | GENUINE |
| 23 | sph-water/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | `@given(seed/n/h)`, sph_water/invariants.py | GENUINE |
| 24 | sph-water-stack-d/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | same form, sph_water_stack_d/invariants.py | GENUINE |
| 25 | strange-attractors/tests/test_pbt_invariants.py | witness → pkg (2 `@given`) | `@given` over box / phase-space, strange_attractors/invariants.py | GENUINE |

**PBT result: 24/25 GENUINE, 1/25 DEGENERATE (lenia).**

### NEW tasks 5–8 PBT (all GENUINE, quoted above)
- **mass-spring-cloth (#13):** GENUINE. Two `@given` strategies over IC space (mesh dims +
  gravity/velocity drift + step count); each example subprocesses the ACTUAL Vulkan/C++ capture
  binary (`_CAPTURE_BIN`), reads the emitted `.h5`, and asserts the imported predicate
  (`length_bounded_above_invariant` / `momentum_conservation_free_no_gravity_invariant`). This
  RESOLVES prior finding A1 (PBT-absent) — the file + the predicate module
  `tools/testkit/property/sims/mass_spring_cloth/invariants.py` now exist at HEAD.
- **neural-ca (#17):** GENUINE. `field_values_bounded` via harness `random_seed()` (20 ex);
  `inference_determinism` via `@given(seed=...)` (20 ex). Module skipif-gated on the canonical
  checkpoint's presence.
- **pinn-poisson (#19):** GENUINE. Both invariants `@given(seed=...)` → seeded
  `torch.rand` interior/boundary point samples; envelope-scoped to trained regime (not widened
  tolerance — envelopes carry ~8×/~15× headroom over MEASURED residuals).
- **3dgs-mpm (#1):** GENUINE. Two `@given` over Gaussian count + scale/quat/deformation batches.

### Part A findings

**A-D4-1 | PBT-meaningfulness | MAJOR | packages/lenia/tests/test_pbt_invariants.py:52-81**
spec/charter §6 declares `monotone_bounds` + `per_step_change_bounded_by_dt` as PBT invariants
(≥2 per §2.14). | Both tests (`test_pbt_monotone_bounds_witness`,
`test_pbt_per_step_change_bounded_by_dt_witness`) run a SINGLE hard-coded
`LeniaConfig(seed=42, grid=32, steps=5)` (lines 55, 72) with NO `@given`/Hypothesis strategy —
the "PBT" exercises exactly one point of the declared "arbitrary IC / duration of run" domain.
Predicate functions (`tools/testkit/property/sims/lenia/invariants.py:15,21`) and the bound /
derivative asserts are non-tautological (a violation at seed=42 would fail), but the universal
claim is never sampled. | layer-2 (testkit/PBT). **Remediation:** wrap both witnesses with
`@given` over `random_seed()` (or grid/steps strategies) via the harness, as ising-classical
and rd-2d already do. Counts as the sole degenerate PBT at HEAD.

**A-D4-2 | M-13 RE-TEST | VERDICT: LIVE (unchanged from prior `0efc2e7` audit)**
Prior audit A2 found lenia degenerate. At HEAD `4ee0ea9` the file is byte-for-byte the same
witness form — still NO `@given`, still `LeniaConfig(seed=42, grid=32, steps=5)`. NOT resolved.
This is the ONLY degenerate PBT among the 25 (mass-spring-cloth, the prior co-defect A1, is now
GENUINE — see #13).

============================================================
## PART B — gate-3 RED-evidence + footer-hash integrity
============================================================

Hashing contract (`tools/testkit/failing-tests-evidence/README.md:8-16` + architecture.md
§Appendix-G ledger, lines 3191-3196): the gate-3 commit footer carries
`Failing-tests-output:` AND `Failing-tests-output-hash: sha256:<hex>` where the hash is the
PLAIN `sha256sum` of the committed evidence-file body. Reconciliation method: for each of the
25 RED files I computed the HEAD body sha256 and collected every `sha256` footer across
`git log --all` for that path, then compared.

### B.1 — genuine RED-state (25/25 GENUINE)

All 25 RED files show genuine failures/errors at their failing-tests commit (none all-PASS):

| file | summary | RED? |
|------|---------|------|
| 3dgs-mpm-2026-05-29T22-15-39Z | 12 failed, 1 passed | YES |
| boids-3d-2026-05-20T13-04-01Z | 4 errors | YES |
| common-3dgs-2026-05-28T01-28-53Z | 9 failed, 1 passed | YES |
| eulerian-smoke-2026-05-20T13-37-41Z | 4 errors | YES |
| eulerian-smoke-stack-d-2026-05-24T17-29-59Z | 6 errors | YES (no footer hash — B-D4-1/m-1) |
| ising-classical-2026-05-28T21-40-00Z | 15 failed, 2 passed | YES |
| lattice-boltzmann-d3q19-2026-05-20T13-43-01Z | 5 errors | YES |
| lattice-boltzmann-d3q19-stack-d-2026-05-24T03-17-35Z | 7 errors | YES |
| lenia-2026-05-28T15-24-41Z | 10 failed, 4 passed | YES |
| lfs-architecture-stage-1a-2026-05-27T11-46-02Z | 3 failed, 13 passed | YES (infra) |
| mandelbulb-explorer-2026-05-20T12-54-18Z | 4 errors | YES |
| mass-spring-cloth-2026-05-29T02-29-56Z | CTest Errors (doctest THREW: Stage-1a RED) | YES (C++ ctest, free-form footer — B-D4-2/m-18) |
| mpm-multimaterial-2026-05-20T13-48-06Z | 4 errors | YES |
| mpm-multimaterial-stack-d-2026-05-24T12-36-43Z | 6 errors | YES |
| neural-ca-2026-05-29T05-00-00Z | 3 failed | YES |
| physarum-2026-05-20T13-04-01Z | 4 errors | YES |
| pinn-poisson-2026-05-29T13-13-00Z | 9 failed, 9 passed | YES (footer hashes superseded body — B-D4-3) |
| reaction-diffusion-2d-ref-2026-05-19T15-43-23Z | 10 failed, 4 passed | YES |
| reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z | 6 errors | YES |
| reaction-diffusion-3d-2026-05-20T13-26-32Z | 4 errors | YES |
| render-similarity-2026-05-28T12-54-18Z | 16 failed, 1 passed | YES |
| rigid-body-pedagogical-2026-05-29T00-29-56Z | 11 failed | YES |
| sph-water-2026-05-20T13-32-02Z | 5 errors | YES |
| sph-water-stack-d-2026-05-24T00-06-11Z | 7 errors | YES |
| strange-attractors-2026-05-20T12-54-18Z | 4 errors | YES |

### B.2 — footer-hash integrity (22 MATCH / 1 no-footer / 2 superseded-MISMATCH)

| status | count | files |
|--------|-------|-------|
| MATCH (committed footer hash == HEAD body sha256) | 22 | boids-3d, common-3dgs, eulerian-smoke, ising-classical, lattice-boltzmann-d3q19, lattice-boltzmann-d3q19-stack-d, lenia, lfs-architecture-stage-1a, mandelbulb-explorer, mass-spring-cloth, mpm-multimaterial, mpm-multimaterial-stack-d, neural-ca, physarum, reaction-diffusion-2d-ref, reaction-diffusion-2d-stack-d, reaction-diffusion-3d, render-similarity, rigid-body-pedagogical, sph-water, sph-water-stack-d, strange-attractors |
| NO footer hash (omitted entirely) | 1 | eulerian-smoke-stack-d (commit 2341920) |
| MISMATCH — superseded (footer hashes an OLDER, re-captured body) | 2 | 3dgs-mpm, pinn-poisson |

Concrete reconciliation for the 3 non-MATCH:
- **eulerian-smoke-stack-d** (commit `2341920`): footers carry only `Failing-tests-output:`; NO
  `Failing-tests-output-hash:` anywhere in history. HEAD body sha256 `80969ace…fa8708`
  un-anchored. (= prior B1 / dispatch m-1.)
- **3dgs-mpm**: HEAD body `6053e228…`; the ONLY committed footer hash is `892fb864…` (Stage-1a
  commit `ce50829`). The re-capture commit `ad09c51` ("correct failing-tests evidence to
  stdout-only") REWROTE the body (commit msg: "New evidence sha256 6053e228… supersedes the
  Stage-1a footer's 892fb864…") but carries NO `Failing-tests-output-hash:` line. So at HEAD the
  evidence body is anchored only by a superseded hash.
- **pinn-poisson**: HEAD body `49c865ad…`; the ONLY committed footer hash (free-form
  `gate-3 verbatim-output sha256:`) is `70df1923…` (Stage-1a commit `239e8a0`). The re-capture
  commit `7de4dcb` REWROTE the body ("re-captured in the gate-13 replay-compatible format … 9
  failed / 9 passed") but carries NO footer-hash line. Anchored only by a superseded hash.

Both re-captures are GENUINE-RED re-captures (same RED substance, reformatted for gate-13
replay-hash compatibility); the defect is the missing re-anchor, not a fabricated GREEN.

### Part B findings

**B-D4-1 | gate3-hash-contract | MAJOR | commit 2341920 (eulerian-smoke-stack-d-2026-05-24T17-29-59Z.txt)**
README.md:13-16 requires `Failing-tests-output-hash: sha256:<hex>` on the gate-3 commit. |
Commit `2341920` carries only `Failing-tests-output:` and omits the hash line entirely; HEAD
body sha256 `80969ace…fa8708` is un-anchored in git history (a silent edit would not be caught
by the footer-hash trail). Evidence IS genuine RED (6 errors). | layer-3 (commit/footer). 1/25.
(= prior B1; **m-1 RE-TEST VERDICT: LIVE — confirmed at HEAD `4ee0ea9`.**)

**B-D4-2 | gate3-footer-form | MINOR | commit b481ab8 (mass-spring-cloth-2026-05-29T02-29-56Z.txt)**
README.md:15 mandates the key `Failing-tests-output-hash: sha256:<hex>`. | The C++/ctest gate-3
commit uses a non-standard free-form footer `failing-tests-evidence sha256: ac64b1de…` instead
of the README key. The hash value DOES equal the committed body sha256 (`ac64b1de…074816ea`),
so integrity is verifiable; only the footer KEY deviates. | layer-3 (commit/footer convention).
Verifiable; non-blocking. (= prior B2; **m-18 RE-TEST VERDICT: LIVE — hash matches, key
deviates, confirmed at HEAD.**)

**B-D4-3 | gate3-superseded-hash | MAJOR (NEW) | commits ad09c51 (3dgs-mpm) + 7de4dcb (pinn-poisson)**
README.md:10-16: the commit that commits the evidence file must footer-anchor its body with
`Failing-tests-output-hash:`. | Both files were RE-CAPTURED in later commits (`ad09c51`,
`7de4dcb`) that rewrote the body to gate-13-replay-compatible form, but NEITHER re-capture
commit carries a `Failing-tests-output-hash:` footer. At HEAD the evidence bodies (3dgs-mpm
`6053e228…`, pinn-poisson `49c865ad…`) are anchored only by the SUPERSEDED Stage-1a hashes
(`892fb864…`, `70df1923…`) which hash the older stderr-contaminated / differently-formatted
content. The byte-integrity of the current RED evidence is therefore un-witnessed in git
history. | layer-3 (commit/footer). 2/25. **Remediation:** at the next touch, re-emit the
`Failing-tests-output-hash:` (or a documented re-capture-hash footer) over the current body, or
add the hash to a follow-up evidence-ledger commit. Both are genuine RED (no GREEN
fabrication); this is an anchoring-trail gap, not a falsified red-state.

============================================================
## PART C — mutation-target POLICY (independent read; SCORES out of scope)
============================================================

Config: `tools/testkit/mutation/mutmut-config.toml` = **17** `[targets.*]` blocks, classified by
path:
- **7 §2.13 testkit/integrity surfaces** (in spec scope): capture, code_verification_mms,
  golden, determinism, equivalence, property (all `tools/testkit/...`), cat4_draft_time
  (`tools/integrity/...`).
- **6 sim-source targets at `packages/**` or `common/**`** (NOT in §2.13 scope; the dispatch's
  6): reaction_diffusion_3d, sph_water, eulerian_smoke, lattice_boltzmann_d3q19,
  mpm_multimaterial (`packages/.../...`), common_3dgs (`common/common-3dgs/src/common_3dgs`).
- **4 satellite targets physically UNDER `tools/testkit/`** but sim-specific and likewise
  charter-additive: reaction_diffusion_3d_mms + incompressible_ns_2d_mms
  (`tools/testkit/code_verification/mms/solutions/...`), sph_water_dfsph_generator
  (`tools/testkit/golden/generator/...`), render_similarity
  (`tools/testkit/render_similarity/metrics.py`). These sit inside the §2.13 directory tree but
  are not in §2.13's enumerated module list either.

Authority read (READ-ONLY):
- **architecture.md §2.13 (lines 581-598)** scopes mutation explicitly to "**The testkit
  (Layer 0) and integrity toolkit (Layer 1)**" and enumerates exactly the 7 testkit/integrity
  targets (lines 589-594). HARD_FAIL-at-landing applies to "**any in-scope module**" (line 596).
  Sim-source modules are NOT enumerated.
- **catalog §41.4 (line 3491)**: "Mutation testing on **every testkit + integrity module**
  (HARD_FAIL on threshold regression)." Same scope. No sim modules.
- **Config comments (lines 48-67)** EXPLICITLY mark the sim targets advisory/non-blocking:
  "Sim-source modules carry no spec-pinned floor; we adopt **0.80 advisory** … The mutation
  gate remains **non-blocking (advisory)** at this sub-phase … PATH-A's contribution is the
  FIRST REAL BASELINE, **not a gate-flip**." Config has NO per-target `blocking=`/`required=`
  key (none exists in the file).
- **CI workflow `.github/workflows/mutation-testing.yml` (lines 22-35)** path-triggers ONLY on
  the 7 testkit + `tools/integrity/**` surfaces and states: "Per-sim packages/** targets are
  **intentionally excluded** (§2.13 scope is testkit + integrity tooling)." `run-mutation.sh
  --baseline` (the CI mode) path-VALIDATES all 17 targets but runs NO real mutation kills
  (line 109: "emit framework-validated JSON, no real mutation runs"); real sim kill-rates are
  produced advisory per sub-phase landing, not in the blocking CI gate.

**Independent verdict (concurs with D7):** the sim targets are **SANCTIONED-as-advisory**, NOT
a policy contradiction. They are charter-authorized additive baselines (config §lines 48-67),
self-described non-blocking, carry no blocking flag, and are deliberately excluded from the
blocking CI mutation gate, which remains §2.13/§41.4-scoped to testkit + integrity. The spec
text and catalog do NOT enumerate them and do NOT need to — the config extends §2.13's table
under per-sub-phase charter authorization without flipping any gate to HARD_FAIL.

**Finding C-D4-1 | mutation-scope-doc-gap | MINOR | mutmut-config.toml:69-277 vs architecture.md §2.13:589-594**
§2.13 + catalog §41.4 enumerate ONLY testkit + integrity modules; the config carries 10 extra
sim-source / MMS-solution / generator targets that no spec/catalog clause names. | They are
correctly self-marked advisory + CI-excluded, so there is NO live blocking contradiction; the
gap is documentary — a reader of §2.13 alone would not learn that `mutmut-config.toml` also
holds advisory sim baselines. | Remediation: a one-line §2.13 note ("per-sim advisory targets
may be added to the config; they are non-blocking and CI-excluded") would close the doc gap.
Severity MINOR (no gate behavior at stake). Independent of, and consistent with, D7's read.

============================================================
## COVERAGE / DEFERRED / UNKNOWN
============================================================

- Part A: PBT denominator = 25 test_pbt files; checked = 25 (100%). No sampling.
  24 GENUINE, 1 DEGENERATE (lenia). M-13 LIVE; A1 (mass-spring-cloth absent) RESOLVED-AT-HEAD.
- Part B: gate-3 denominator = 25 RED files; checked = 25 (100%). No sampling.
  25/25 genuine-RED; 22/25 valid footer-hash; 1 no-footer (m-1 LIVE); 2 superseded-hash (NEW
  B-D4-3); mass-spring-cloth free-form key but hash-valid (m-18 LIVE). 39 .txt total = 25 RED +
  13 impl-witness (GREEN) + 1 gate-14 (GREEN), the latter 14 out of the gate-3 universe.
- Part C: 17 config targets read; §2.13 + §41.4 + config comments + CI workflow cross-checked.
  Verdict sanctioned-advisory; doc-gap C-D4-1 MINOR.
- DEFERRED: mutation SCORES (separate background job; mutmut NOT run here per dispatch).
- UNKNOWN: none.

### Finding ledger (ID / severity / status)
- A-D4-1 | MAJOR | lenia degenerate PBT (1/25) — LIVE
- A-D4-2 (M-13 re-test) | MAJOR | lenia witness still no `@given` — LIVE (unchanged)
- B-D4-1 (m-1 re-test) | MAJOR | eulerian-smoke-stack-d gate-3 no footer hash — LIVE
- B-D4-2 (m-18 re-test) | MINOR | mass-spring-cloth free-form footer key, hash matches — LIVE
- B-D4-3 | MAJOR | NEW | 3dgs-mpm + pinn-poisson re-captured RED bodies anchored only by superseded hashes (2/25)
- C-D4-1 | MINOR | NEW | mutation-config sim targets advisory/sanctioned but undocumented in §2.13 (doc-gap, no gate contradiction)
- (RESOLVED) prior A1 mass-spring-cloth PBT-absent → now GENUINE @given at HEAD (#13)

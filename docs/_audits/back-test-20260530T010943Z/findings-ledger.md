---
title: Exhaustive Back-Test Re-Audit — Findings Ledger (remediation-ready)
head_sha: 4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9
this_run_utc: 20260530T010943Z
audit_branch: audit/back-test-20260530T010943Z
prior_run: docs/_audits/back-test-20260529T124759Z/ @ pin 869bf68 (2 BLOCKER / 16 MAJOR / 19 MINOR)
authority: FIND, VERIFY, ACCOUNT — remediation-ready. NO FIXES. Unmerged, untagged, main untouched.
status: D1-D10 + P2 + M2 + C++ ctest executed. Mutation re-measure 11/11 COMPLETE (golden finished — no timeout). Complete.
---

# Findings Ledger — Exhaustive Back-Test Re-Audit @ HEAD 4ee0ea9

Row shape: `ID · dim · sev · STATUS-vs-prior · location · claim · observed · remediation`.
STATUS: **RESOLVED-AT-HEAD** (fixed by tasks 4-8, resolving commit cited) · **LIVE** (re-evidenced at 4ee0ea9) · **CHANGED** (scope/shape shifted) · **NEW** (introduced by tasks 5-8, invisible to prior pin).
Severity: **BLOCKER** (silently-wrong / self-integrity) · **MAJOR** (trust erosion) · **MINOR** (cosmetic/hygiene) · **METHOD** (verified non-defect).

---

## BLOCKER (2 — both carried-LIVE; tasks 5-8 introduced ZERO new blockers)

**B-1 · D10 · BLOCKER · LIVE** — append-only CI enforcement guards the empty set.
`.github/workflows/audit-append-only.yml:62-63`. *Claim:* header asserts append-only "for every file under docs/_audits/". *Observed at HEAD:* the file-feed filter is `grep -E '\.ledger\.md$'`; run against the current `docs/_audits/` tree it matches **0 of 576** files (no `*.ledger.md` exists — the one real ledger is `phase-0/ledger.md`, and back-test ledgers are `findings-ledger.md`; both lack the literal `.ledger.md` suffix). The enforcement loop iterates an empty set → unconditional `exit 0`. The central mechanical trust invariant is non-functional. **D10.2 confirms the invariant currently HOLDS in practice (0 content violations across 576 files) — the risk is latent, not realized.** *Remediation:* replace the feed filter to guard ALL `docs/_audits/` files (net-new allowed), e.g. drop the grep, or `grep -E '(^|/|-)ledger\.md$|findings-ledger\.md$'` if ledger-only intended. **Cheap fold-in** (one workflow line).

**B-2 · D4 · BLOCKER · LIVE** — §2.13 mutation thresholds unmet on the core testkit AND unenforced in CI.
`tools/testkit/mutation/*` + `.github/workflows/mutation-testing.yml`. *Claim:* §2.13 sets 80-95% mutation thresholds for testkit+integrity tooling; CI gates them. *Observed:* CI runs only `--baseline` (path-validate, no kills; weekly SOFT_WARN per catalog §41.4) — never measures real scores. This run RE-MEASURED all 11 testkit/integrity targets. **Harness fidelity CONFIRMED: 4 of the unchanged-source targets reproduce the prior run byte-for-byte** (sph_water_dfsph_generator 0/127, incompressible_ns_2d_mms 53/29, determinism 71/62, render_similarity 66/18); reaction_diffusion_3d_mms within 1 mutant (0.8295 vs 0.8308). The scores are trustworthy signal (7 of 11 reproduce byte-for-byte — see `evidence/D4-mutation-scores.md`). **Still 10/11 below threshold; only reaction_diffusion_3d_mms (0.8295) passes** (golden completed this run at 547/2029=0.2696 — the raised 2400s timeout cleared the prior BLOCKED-partial). Worst cases: **cat4_draft_time 0.0669** (the live citation-enforcement hook — 460/493 mutants survive), **sph_water_dfsph_generator 0.0000** (B-2a below), property 0.2034, code_verification_mms 0.2650, golden 0.2696, equivalence 0.4811, determinism 0.5338, capture 0.6777. *Remediation:* produce + commit real per-target baselines for the 7 core modules; decide §2.13 is a gate (raise coverage / lower thresholds with rationale) or explicitly advisory (state so in the spec). Priority order: cat4_draft_time (live hook) → sph_water_dfsph_generator (zero signal) → property/code_verification_mms (the PBT + MMS frameworks). **Substantial engineering** (the audit's central work item).

**B-2a · D4 · sub-finding of B-2 · LIVE (reproduced exactly)** — a configured mutation target measures NOTHING.
`tools/testkit/mutation/mutmut-config.toml [targets.sph_water_dfsph_generator]`. *Observed:* score **0.000 (0 killed / 127 survived)**, reproduced byte-for-byte from the prior run. The configured runner is `pytest packages/sph-water/tests/test_dfsph_density_golden.py` — that test asserts against the COMMITTED golden table, so mutating the generator source (`tools/testkit/golden/generator/dfsph_density_evolution.py`) breaks no test. The generator's correctness IS covered by its own `--verify` mode (D3 confirmed 8/8 OK), but the mutation target's runner is mis-wired and yields zero protective signal. *Remediation:* point the runner at a test that regenerates-and-compares (so a mutated generator diverges), or remove the target from the §2.13 set and rely on `--verify`. **Cheap fold-in** (one config line) but exposes a coverage gap.

---

## MAJOR

**M-1 · P3 · MAJOR · CHANGED** — dirty-LFS fixtures still re-encode on checkout (commit-path risk reduced).
*Prior:* 3 RAW-HDF5 (~67 MB) + 9 PLACEHOLDER = 12 non-pointer fixtures forced `--no-verify`. *Observed at HEAD (P2 re-classification of all 56 LFS-filtered `.h5`):* **44 POINTER / 0 RAW-HDF5 / 12 PLACEHOLDER** — the three large raw-HDF5 blobs are GONE (migrated/removed since the pin); 4 placeholders (`physarum-ref`, `reaction-diffusion-3d-ref`, `sph-water-ref`, `strange-attractors-ref`) still show dirty-on-checkout (smudge re-encode). The `--no-verify` mechanism can still bite the dirty subset, but the 67 MB raw-blob hazard is eliminated. *Remediation:* migrate the remaining 12 placeholder fixtures to real LFS pointers (`git lfs migrate import` / re-add as pointers). Routes to banked `legacy-capture-fixture-lfs-reconciliation`. **Real engineering** (LFS migration; sequence FIRST to clear the commit path).

**M-2 · P3 · MAJOR · LIVE** — `main` branch protection not configured.
`gh api repos/StevenFAU/Bit-Physics/branches/main/protection` → **404 "Branch not protected"** (re-confirmed at HEAD). Spec rules-13-16 describe a server-side branch-protection/append-only/tag moat; none configured; no tag-signing workflow among the 13. *Remediation:* configure branch protection to match the claimed moat, or amend the spec to state the single-operator-trunk reality. **Operator action** (server config, not a code change).

**M-3 · D1/D7 · MAJOR · LIVE** — ≥3-independent-anchor gate counts field-presence only.
`tools/integrity/integrity/cat3_numerical/golden_values.py:61-65`. `_anchor_count = sum(1 for p if "independent_reference" in p)` — keyed-field count, no distinctness/independence check; HARD_FAIL only on `<3` keyed points. 3 IDENTICAL anchors PASS. D7 secondary: `_SUBDIRS_PICKED_UP` hard-codes 5 subdirs — a golden in an unlisted subdir is silently skipped under an explicit `files` invocation. *Remediation:* require ≥3 DISTINCT normalized `independent_reference.source` values; flag source ⊆ the derivation's own `upstream`. **Real engineering** (gate-semantics fix; sequence BEFORE the data fixes M-4/M-5 so the relabel is gate-checkable).

**M-4 · D1 · MAJOR · LIVE** — rigid-body-6dof golden has 1 distinct anchor (claims ≥3).
`tools/testkit/golden/tables/rigid-body-6dof-trajectory.json` (4 test_points) — all `independent_reference` IDENTICAL ("conservation of energy E(t)=E(0)"); derivation self-declares the RK4 ref doesn't count toward §2.4. *Remediation:* add 3 genuinely distinct published anchors, or relabel as a numerical baseline exempt from §2.4. **Cheap fold-in** (after M-3).

**M-5 · D1 · MAJOR · LIVE** — rigid-body-double-pendulum golden has 1 distinct anchor (claims ≥3).
`tools/testkit/golden/tables/rigid-body-double-pendulum-trajectory.json` (5 test_points, all "closed-form double-pendulum EOM"). Chaotic ⇒ honest fix = relabel as numerical baseline (exempt), not fabricate anchors. **Cheap fold-in** (after M-3).

**M-6 · D6 · MAJOR · LIVE** — sim-name split `articulated-pedagogical` ↔ `rigid-body-pedagogical` NOT resolved by task-4.
`docs/architecture.md:1175` (§5.8 "rigid-body-pedagogical") vs §D.1 canonical + package dir `articulated-pedagogical`. The A-1 amendment (`docs/spec-amendments-proposed.md:10-39`) PRESERVES the §5.8 name — the split is not on the remediation path. Diverges across ~8 surfaces (spec/capture/CI/tier3/property/fixture/audit). *Remediation:* reconcile to canonical `articulated-pedagogical` everywhere; amend §5.8 + rewrite A-1 to carry the rename. **Real engineering** (8-surface rename).

**M-7 · D6 · MAJOR · CHANGED (1→5, now systematic)** — Phase-3 SIM landing-audit filenames break convention.
`docs/_audits/phase-3/task-{4,5,6,7,8}-*.md`. *Prior:* only task-4 lacked the `sub-phase-phase-3-<slug>-landing-<UTC>.md` form. *Observed at HEAD:* ALL FIVE tasks-4-8 sim landing audits use the `task-N-<slug>.md` form (no `sub-phase` prefix, no `landing` token, no UTC suffix); the 4 earlier sub-phases conform. Now a systematic divergence, not a one-off. *Remediation:* rename all 5 using each file's front-matter `date:` to the convention form. **Cheap fold-in** (5 renames).

**M-8 · D8/D10/P2 · MAJOR · CHANGED** — legacy-capture LFS hygiene (raw-blob hazard eliminated).
`tests/fixtures/legacy-captures/`. *Prior:* 3 RAW-HDF5 + 9 PLACEHOLDER. *Observed:* 0 RAW-HDF5, 12 PLACEHOLDER (P2). Content remains correct (D10 pointer-masquerade PASS: working-tree sha256 == committed-blob sha256 for the 4 dirty files; no LFS pointer masquerades as content). Same remediation as M-1 (migrate the 12 placeholders to pointers). **Folds into M-1.**

**M-9 · D9 · MAJOR · LIVE (widened)** — architecture.md names non-existent per-phase preflight files.
`docs/architecture.md:56,1838,1841,2155,2847,2875,2926`. The tool is a single `tools/dispatch/preflight-phase.py` with `<N>` as a CLI arg; §9.6 prose writes `preflight-phase-<N>.py` and :2155 names a literal `preflight-phase-4.py` that doesn't exist; :1965 self-contradicts. Half-applied amendment seam. *Remediation:* update all phantom `<N>`-in-filename call-sites to `preflight-phase.py <N>`. **Cheap fold-in.**

**M-10 · D7/D9 · MAJOR · LIVE** — architecture.md:854 "ten-gate" back-compat note contradicts both ends.
`docs/architecture.md:854` — "ten-gate formulation … historical contract for Phase 0/Phase 1". Phase-0 RD-2D shipped 13 gates (block-8 landing) and Phase-1 locks gates 1-3; no sim ever ran a 1-10 contract. *Remediation:* rewrite as "gates 11-13 are v2.4-new; Phase-0 RD-2D cleared all 13; Phase-1 ships 1-3 and back-fills." (also nets the changelog:22 / §11.7 misref minors.) **Cheap fold-in.**

**M-11 · D9 · MAJOR · LIVE** — lenia spec-ref frozen as Stage-1a STUB though landed.
`docs/sim-specs/continuous-ca/lenia/spec-ref.md:6,70,75,237,282` — "Stage 1a posture: STUB" + `TODO(Stage-1b)` markers though lenia FULLY LANDED (derivation file exists). *Remediation:* strip the stub banner / fill the TODOs. **Cheap fold-in.** (See N-1: this defect class recurred on 3 of the 4 new sims.)

**M-12 · D9 · MAJOR · LIVE** — ising-classical spec-ref frozen as Stage-1a STUB though landed.
`docs/sim-specs/lattice-spin/ising-classical/spec-ref.md:6,71,89,227`. Same pattern as M-11 (full 13-section content exists). *Remediation:* same. **Cheap fold-in.**

**M-13 · D4 · MAJOR · LIVE** — lenia gate-11 PBT is degenerate (no `@given`).
`packages/lenia/tests/test_pbt_invariants.py` — `monotone_bounds` + `per_step_change_bounded_by_dt` are `..._witness()` on a fixed `LeniaConfig(seed=42,grid=32,steps=5)`, no Hypothesis sampling (sole degenerate of 25 PBT files; the other 24 are genuine `@given`). *Remediation:* add `@given` strategies over (seed, grid, steps, IC). **Cheap fold-in.**

**M-14 · D5 · MAJOR · RESOLVED-AT-HEAD** — mass-spring-cloth premature bit-exact declaration is now backed.
`tools/testkit/determinism/registry.toml [soft-body.mass-spring-cloth]` (line ~102). *Prior:* `class="bit-exact"` pre-declared at Stage-1a-RED with no capture (self-contradictory "invent-green"). *Observed at HEAD:* cloth is LANDED; the row is now backed by a REAL measurement — the C++ doctest `gate-7 determinism witness` (cloth.cpp:239, `assert_deterministic_run(runs=2,tol=0.0)`) PASSES (confirmed this run, ctest test #9 `mass_spring_cloth_pbt` + D5 build). Resolved by the task-5 landing chain (mass-spring-cloth sub-phase, HEAD `86b0aa5`). *No remediation.*

**M-15 · D3 · MAJOR · LIVE (HELD)** — solution-verification (GCI) tooling absent while the portfolio describes claiming it.
`tools/testkit/solution_verification/` (empty: `.gitkeep`+README); spec §2.3/§12.3 describes research-grade sims defaulting to claim solution-verified; architecture.md:668-671 depicts a `gci/richardson.py` tree that doesn't exist. *Observed:* harness unbuilt (honest README deferral); NO sim falsely claims solution-verified (all "declared, deferred"/"n.a."). Per charter §5 a MAJOR coverage gap. *Remediation:* build GCI/Richardson before any sim claims solution-verified, OR annotate the spec that the harness is deferred. **Real engineering OR cheap doc annotation** (operator decides posture).

**M-16 · D7 · MAJOR · LIVE** — stale "eleven-gate" live call-sites (5).
`docs/phases/phase-2-cross-stack-replication.md:477,1512,1697,2282,2639` — live pass/fail call-sites still say "eleven-gate" (the v6 amendment replaced eleven→fourteen); :1697 instructs filling an "eleven-gate table" that no longer exists. Totality re-proven (all 11 `eleven`-tokens in this one file). *Remediation:* `eleven-gate` → `fourteen-gate` at the 5 sites; `eleven-gate sim-port` → `fourteen-gate sim-port` at 1759/1789. **Cheap fold-in.**

**N-1 · D9 · MAJOR · NEW (tasks 5-8)** — the Stage-1a STUB-banner freeze RECURRED on 3 of the 4 new sims.
`docs/sim-specs/.../neural-ca/spec-ref.md:7-8,89,117,126,128,224,259` (7 TODOs incl. a measured gate-14); `.../pinn-poisson/spec-ref.md:7`; `.../sim-specs/.../3dgs-mpm/spec-ref.md:8,135,235,242,252` (SKELETON banner + TODO(Stage-2)). All landed (impl+tests+capture+landing audit) yet carry stub/skeleton banners and stale TODOs — the same defect class as M-11/M-12, now 5-of-7 Phase-3 sims (cloth + rigid-body are the clean counter-examples, proving it is a per-landing hygiene miss, not a template requirement). 23 stale done-but-marked markers total. The landing audits never caught it. *Remediation:* strip the stub/skeleton banners + resolve/cut the TODOs on neural-ca, pinn-poisson, 3dgs-mpm; add a landing-checklist item "no STUB banner survives a landing". **Cheap fold-in** + 1 process guard.

**N-2 · D4 · MAJOR · NEW (tasks 5-8)** — task-7/8 gate-3 RED evidence is anchored only by superseded hashes.
3dgs-mpm + pinn-poisson RED-evidence was re-captured (commits `ad09c51`, `7de4dcb`) but those re-capture commits carry NO `Failing-tests-output-hash:` footer; the HEAD evidence bodies (sha `6053e228`, `49c865ad`) are anchored in git history only by the SUPERSEDED Stage-1a hashes (`892fb864`, `70df1923`). The RED is genuine (tests do fail), but the byte-integrity of the CURRENT evidence is un-witnessed. *Remediation:* add a footer-hash to the re-captured evidence; add a gate-3-convention check that the footer-hash matches the evidence body at the landing commit. **Cheap fold-in** + 1 convention check. (Generalizes prior m-1.)

---

## MINOR (carried-LIVE + NEW)

- **m-1 · D4 · LIVE** — eulerian-smoke-stack-d gate-3 evidence (commit `2341920`, HEAD body `80969ace`) omits `Failing-tests-output-hash:`. Add a footer-hash check to the gate-3 convention.
- **m-2 · D2 · LIVE** — "Appendix D §D.10" → §D.9 (Appendix D ends at D.9, architecture.md:2648). phase-4-plan:70,146,2957; phase-3-plan:48; phase-2-cross:42.
- **m-3 · D2 · LIVE** — phase-2-cross-stack-replication.md:2750 §1.6.7 → §1.6.6 (headings stop at §1.6.6:588).
- **m-4 · D2 · LIVE** — catalog phantom compose-refs (4 dangling): bit-physics-master-catalog.md:713(×2),901,903 (§16.7.5/§18.7.12/§19.7.7; real sub-series are .4/.5).
- **m-5 · D6 · LIVE** — capture dirs `captures/lbm-ref/`, `captures/mpm-ref/` non-canonical vs `lattice-boltzmann-d3q19-ref`/`mpm-multimaterial-ref` (manifests correct).
- **m-6 · D6 · LIVE** — legacy fixture leaf `phase-0-rd-2d-ref` abbrev vs canonical `reaction-diffusion-2d`.
- **m-7 · D6 · LIVE** — `lenia-fft` (architecture.md:1065) + `captures/lenia/` (lenia spec-ref:252) missing `-ref` vs `lenia`/`captures/lenia-ref/`.
- **m-8 · D2/D6 · LIVE (broader: 9 vs prior 5)** — `tools/integrity/scripts/<x>.py` should be `tools/integrity/integrity/scripts/<x>.py`: architecture.md:1450,1459,3131,3149,3204 **+ phase-0-plan.md:1454,1456,1468,1780** (the `-m integrity.scripts.<x>` invocations are correct).
- **m-9 · D6 · LIVE (A-2 path)** — `cloth-xpbd` stale name (architecture.md:2509,2552) → `mass-spring-cloth`.
- **m-10 · D8/D1 · LIVE (A-3)** — Bender PBD SHA: §2.18 phase-3-plan.md:285 pins `d0894bdb` (master HEAD); MANIFEST/reality `aa62c44f` (=tag 2.2.0, satisfies "Latest stable"). Apply A-3.
- **m-11 · D7 · LIVE** — architecture.md:40 changelog "ten-gate criteria" (accurate as-of-v2.3). Annotate "(ten at v2.3; thirteen at v2.4)".
- **m-12 · D3 · LIVE (widened: 7 rows)** — golden tolerances uncapped: `tolerance-budget.toml` has only `cross_stack` cap shapes; `[golden_tolerance.*]` (7 rows: lenia/ising/rigid-body×2/cloth/pinn/3dgs) not budget-enforced. Cat-X cannot catch a loosened golden tolerance. Add `[budgets.<cat>.golden]` cap shape or document the exemption.
- **m-13 · D10 · LIVE** — 4 audits' `evidence_hashes` malformed (not a mapping) → verify_evidence can't parse. Convert to YAML mapping.
- **m-14 · D10 · LIVE** — 3 checkpoint audits' capture-sidecar hash drift (post-checkpoint eof-fixer/normalization). Operator confirm or re-hash.
- **m-15 · D10 · LIVE** — audit types carry `evidence_hashes` without `head_sha` (sha-back-fill/plan-drafting/probe) → unverifiable. Add head_sha or mark not-evidence-verified.
- **m-16 · D5 · LIVE (doc hygiene)** — replay gate token `perf` vs registry key `perf-ledger` (replay_prior_phase.py:62); `perf` → "unknown gate". Normalize invocation text.
- **m-17 · D4/D6 · LIVE** — PBT-helper name drift (strange-attractors `volume_contraction_rate_constant`, invariants.py:66) + rd-2d `periodic_bc_satisfied` tolerance=2.0 (test_pbt_invariants.py:195). Outside the 5-dimension name contract; informational.
- **m-18 · D4 · LIVE** — mass-spring-cloth C++ gate-3 uses free-form `failing-tests-evidence sha256:` key (hash `ac64b1de` matches body) vs README `Failing-tests-output-hash:`. Normalize the key.
- **m-19 · D9 · LIVE** — misc doc-internal: ToC under-lists Appendices D-G (architecture.md:114-116); §11.7 gate xref dangling (1984); v2.2 changelog forward-refs v2.3 (49); §2.11 task-list 1/2/9 vs plan 1/2/9/10 (559 vs phase-3-plan:20).
- **n-1 · D2 · NEW** — §0.3-residual: `phase-3-plan.md` (52 occurrences) still prescribes non-existent `<category>/<sim>/{python,cpp,typescript}/` paths; actual = flat `packages/<sim>/`. Ratified divergence ("NO unilateral plan edit"); annotate or accept as a known §0.3-SHIFT residue.
- **n-2 · D6 · NEW** — tolerance.toml:240 registry key `[golden_tolerance.continuous-ca.neural-ca-python]` is the SOLE key appending `-python` to the sim-NAME segment; sibling render/determinism keys use canonical `neural-ca` with the prong in a sub-key. Rename to `neural-ca` + sub-key.
- **n-3 · D6 · NEW** — category dir `docs/sim-specs/particle-fluids/` (plural) vs §D.1 canonical `particle-fluid` (singular); also dependencies.md:156/495/543, architecture.md:510. Pre-existing (Phase-1/2), not previously flagged. Normalize or amend §D.1.
- **n-4 · D6 · NEW** — `pinn-poisson/spec-ref.md:174` CLI prose `--out captures/pinn-poisson` missing `-ref`.
- **n-5 · D1 · NEW** — `3dgs-mpm-coupling.json` Anchor 2 (polar-decomp) self-declares "same theory (PhysGaussian Eq.9), NOT fully-independent" → strictly 2 fully-independent + 1 same-theory (disclosed in derivation). Add a numerical-eig cross-run anchor if strict-3 demanded.
- **n-6 · D1/D8 · NEW (A-6)** — §2.18 phase-3-plan.md:294 pins `NVIDIA/physicsnemo` core `766e485a` (v2.1.0) but task-7 vendored `physicsnemo-sym` v2.4.0 `acaeb6dc` — WRONG repo AND wrong SHA. Re-point §2.18 to physicsnemo-sym; corrigendum A-6 already queues it.
- **n-7 · D10 · NEW** — `docs/architecture.md:770` claims the integrity meta-test (`tools/integrity/tests/`) "is itself part of CI"; grep of all 13 workflows finds NO invocation of `pytest tools/integrity/tests/`. False doc claim. Wire the meta-test into CI (candidate sibling sub-phase `integrity-meta-test-ci-wiring`) or correct the claim.
- **n-8 · D4 · NEW (advisory scope-gap)** — `mutmut-config.toml` carries 10 sim/satellite targets beyond the 7 §2.13 testkit/integrity modules; config self-marks them non-blocking and CI excludes `packages/**`. Not a contradiction, but §2.13 never mentions them. Add one sentence to §2.13 acknowledging the advisory sim targets.
- **n-9 · D5 · NEW** — tasks 5-8 add determinism CLAIMS to `registry.toml` but NO `packages/<sim>/tests/test_determinism.py`; pinn same-seed + 3dgs two-run determinism are NOT exercised in CI (verified ad-hoc this run). Add per-sim determinism tests for cloth/nca/pinn/3dgs.
- **n-10 · D5 · NEW** — `replay_prior_phase.py` reads `--audit` relative to cwd, not repo-root (absolute path resolves). Doc the cwd requirement or resolve repo-relative.

---

## METHOD / RESOLVED-AT-HEAD (verified non-defects)

- **C++ ctest gate — NOW EXERCISED, GREEN (prior UNKNOWN).** Full repo-root CMake build under lavapipe (`VK_ICD_FILENAMES=lvp_icd.json`): configure/build/ctest all rc=0; **9/9 tests PASSED** (common_cpp ×5, rd2d_stack_c_tests, rd2d_stack_c_gate14, mass_spring_cloth_tests, mass_spring_cloth_pbt). The C++ toolchain (CMake/Vulkan/lavapipe/doctest) is present and the Stack-C gates are real-GREEN, not assumed. Evidence: `evidence/D-cpp-ctest.log`.
- **Landed-inventory — NO overcount (prior M-11/M-12 "overcount-by-two" hypothesis FALSIFIED).** 7/7 Phase-3 sims genuinely landed (real impl, 0 `NotImplementedError` in non-test source, tests, captures, landing audits); progress.md + CHANGELOG accurate. The stub banner is a spec-ref-header hygiene defect (N-1), not an inventory miscount.
- **D3 numerical — ZERO BLOCKER.** Golden generators 8/8 `--verify` OK; MMS 11/11 PASS + falsifiable broken-solver meta-test fails-as-designed; pinn FD orders independently recomputed `[2.0023,2.0005,2.0001]`→O(h²) byte-identical; 3dgs coupling anchors (F=I, Σ′=F·A·Fᵀ, polar) reproduce to ~1e-15; cloth catenary a=4.7308945 (Δ=8.9e-16); NCA EFECT 3σ=4.437e-6 + render floors consistent. No golden/MMS/anchor fails to reproduce.
- **D5 determinism — ZERO BLOCKER.** 21/21 per-sim bit-exact + harness 3/3; cross-phase replay `ok=True` 5/5 gates (integrity,pytest,equivalence,determinism,perf-ledger; prior_phase v0.2.0-phase-2; no LFS-smudge recurrence); NCA training-nondet/inference-det honest; pinn CPU same-seed byte-identical; 3dgs end-to-end byte-identical; cloth symmetric-GS bit-exact (doctest gate-7).
- **D10 append-only CONTENT — 0 violations / 576 files** (invariant HELD despite B-1's hollow workflow); **pointer-masquerade PASS** (4 dirty `.h5` content-sha == committed-blob-sha).
- **PhysGaussian cite-only CONFIRMED truthful (D8)** — `references/PhysGaussian/` = MANIFEST only; zero PhysGaussian/Inria source committed; `source_vendored=false` matches reality; NO-LICENSE re-confirmed.
- **A-1..A-7 corrigenda all REAL (D8)** — 7/7 cited defects verified present at HEAD verbatim; 0 stale, 0 already-applied.
- **Vendored SHAs (D8)** — 4 MATCH (Inria 54c035f7, Lenia adfc5429, PhysGaussian 8339ed6a, SPlisHSPlasH 6bff55a6); growing-CA 3d5547ca MANIFEST-only; 2 MISMATCH = the A-3/A-6 corrigenda.
- **PBT meaningfulness 24/25 genuine (D4)** — sole degenerate is lenia (M-13); prior co-defect "mass-spring-cloth PBT absent" is RESOLVED (genuine `@given` subprocess PBT exists).
- **D2 reference graph — 16,720/16,787 edges resolve**; all 67 unresolved are MINOR (m-2/3/4/8) or non-defect (external textbook §, RESERVED IC-17, proposed-new sections). SEED-2 + BT-1 RESOLVE.
- **gate-14 per-sim correct (D7)** — only neural-ca (dual-stack) carries gate-14; all 6 single-stack sims correctly omit it.

---

## DEFERRED / BLOCKED / UNKNOWN (charter §5 — honest residue)

- **D4 mutation — 11/11 COMPLETE, none BLOCKED** (golden finished at 547/2029=0.2696; the 2400s/target cap cleared the prior timeout-partial). Full table in `evidence/D4-mutation-scores.md`. No residual here.
- **D3.3 GCI/Richardson recompute — DEFERRED(tooling-absent)** — no harness exists (M-15); verified instead that no sim falsely claims solution-verified.
- **gate-3 replay byte-exact normalized hash — context** — `replay_failing_tests.py` runs; normalized-match is sensitive to repo-root + pytest version. Structural RED reproduces (D4: 25/25 genuine RED). Resume from a same-root checkout for byte-exact.

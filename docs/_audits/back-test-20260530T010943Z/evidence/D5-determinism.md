# D5 — Determinism & reproducibility [BLOCKER dimension]

HEAD `4ee0ea9` (worktree `bp-audit-2`, `audit/back-test-20260530T010943Z`). Run via
`uv run --no-sync …` from the worktree root. A concurrent mutation job mutates
`tools/.../reaction_diffusion_3d/solution.py` + four `tests/fixtures/legacy-captures/*.h5`
in the working tree; those touch neither the determinism tests nor the registry, so they
do not affect this dimension. Method follows the prior pin
(`back-test-20260529T124759Z/D5-*`): per-rootdir bit-exact run-twice, harness suite,
cross-phase replay, plus the NEW task-5–8 determinism claims re-executed at HEAD.

## Denominator accounting
- **Per-sim determinism tests** (`packages/<sim>/tests/test_determinism.py`): **21** enumerated,
  **21/21 PASS** (38 individual cases, all bit-exact run-twice). Same 21 as the prior pin —
  tasks 5–8 do NOT add `test_determinism.py` files (they encode determinism differently; see
  NEW findings). Full list in `D5-per-sim-determinism.log`.
- **Harness determinism suite** (`tools/testkit/determinism/tests/`): **3/3 PASS**.
- **Cross-phase replay gates**: **5/5 PASS** (integrity, pytest, equivalence, determinism, perf-ledger),
  `ok=True`, prior_phase `v0.2.0-phase-2`.
- **Determinism registry** (`tools/testkit/determinism/registry.toml`): **11 rows** across 10
  sims (neural-ca + pinn each have a training row + an inference row).

## D5.1 — Per-sim bit-exact replay + harness
21/21 per-sim PASS; harness 3/3 PASS. Every landed/captured classical sim replays bit-exact
run-to-run. **Verdict: PASS.**

## D5.2 — Cross-phase replay (EXECUTED, not BLOCKED)
`replay_prior_phase --prior-phase phase-2 --audit <landing-2026-05-26T02-30-00Z.md>
--gates integrity,pytest,equivalence,determinism,perf-ledger` → `ok=True`; all 5 gates PASS.
The `v0.2.0-phase-2` worktree checked out and ran clean — **no LFS-smudge recurrence**, so the
banked `.git/lfs/objects/<2>/<2>/<oid>` repopulation step was NOT needed. No leftover worktree
(prune clean). NOTE: the tool reads `--audit` relative to cwd; from cwd `tools/integrity` the
repo-relative path 404s — passing the absolute audit path resolves it (the tool finds repo_root
independently for the worktree). All gates report `audit_verdict=None` (tool re-runs gates
clean; does not cross-check front-matter verdicts — a tool characteristic). **Verdict: PASS.**

## NEW task-5 cloth — symmetric-GS bit-exact (M-14 re-test)
`registry.toml:102 [soft-body.mass-spring-cloth]` declares `class="bit-exact"`,
`scope="same-stack-same-hw"`. The serial symmetric Gauss-Seidel XPBD projection runs in a
single Vulkan invocation over a fixed constraint order; `cloth.cpp:239` calls
`det::assert_deterministic_run(trajectory, runs=2, tolerance=0.0)` (sha256 each run, throws
`DeterminismError` on divergence). Built from repo-root CMake under the lavapipe ICD
(`VK_DRIVER_FILES=…/lvp_icd.json`, `LP_NUM_THREADS=0`); the cloth doctest suite is **6/6 PASS
(152 assertions)**, including `GREEN[gate-7] determinism witness is produced (2-run bit-exact)`.
The bit-exact class is backed by a REAL measurement at HEAD. **Verdict: RESOLVED-AT-HEAD / PASS.**

## NEW task-6 neural-ca — mixed posture (training non-det / inference bit-exact)
- Inference: `test_pbt_invariants.py:51 test_pbt_inference_determinism` asserts
  `np.array_equal(run_inference(seed), run_inference(seed))` over multiple seeds — **PASS**.
  Matches `registry [continuous-ca.neural-ca.inference] class="bit-exact"`.
- Training: `test_train_convergence.py:24` asserts ONLY convergence (final L2 below bound +
  downward trend) — it does NOT assert bit-exactness. Matches
  `registry [continuous-ca.neural-ca.training] class="non-deterministic"` + `distributional_bound="EFECT"`
  (3σ upper 0.0653, locked 0.07). **No over-claim — the split is honestly declared.** PASS.

## NEW task-7 pinn — CPU same-seed bit-identical
`registry [learned-dynamics.pinn-poisson.inference] class="bit-exact"`;
`[…training] class="non-deterministic"` + EFECT (5 seeds → 3σ upper 4.44e-6, locked 5e-6).
There is NO encoded two-run determinism test, so I verified directly:
- (a) `evaluate_on_grid(load_checkpoint(seed42), 64)` twice → `np.array_equal=True`.
- (b) a fresh `train_pinn(CANONICAL_PROBLEM, PINNConfig())` (locked seed=42 / units=60 /
  lbfgs=2000) grid-eval == the committed checkpoint's grid-eval **byte-for-byte**
  (`np.array_equal=True`) — the "CPU same-seed bit-identical" claim HOLDS.
- `test_checkpoint_inference.py` 4/4 PASS (the load-bearing analytic + FD gates that rely on
  the byte-for-byte reproducibility). The EFECT 3σ 4.44e-6 is a TRAINING-convergence band, NOT
  the acceptance gate (analytic + FD on the frozen net are load-bearing) — no STOP-EFECT.
  **Verdict: PASS.**

## NEW task-8 3dgs-mpm — end-to-end pipeline determinism
`registry [neural-rendered.3dgs-mpm] class="bit-exact"` claims the end-to-end class composes
three bit-exact stages and is byte-identical run-to-run. Verified directly: two
`run_canonical_sim(seed=0)` runs → all 4 frame images `np.array_equal=True`. The golden test
`test_render_similarity_golden.py` (renders the canonical sim, compares to committed goldens)
is **2/2 PASS**. **Verdict: PASS.**

## m-16 re-test — replay gate token `perf` vs `perf-ledger`
`replay_prior_phase.py:62` registers the key `perf-ledger`; the module docstring (`:10`) and
usage (`:340`) both cite `perf-ledger`. An unknown gate (`perf`) appends
`GateResult(passed=False, discrepancy="unknown gate 'perf'")` → `ok=False` (`:285-296`). At
HEAD the in-repo tool is internally consistent (uses `perf-ledger`). The original F-D5-PERF was
about AUDIT-text invocations citing `perf`. **Doc/invocation hygiene caveat only; no code defect.**

## Verdict table (re-tested findings)
| ID | claim | observed @ HEAD | status |
|----|-------|-----------------|--------|
| F-D5-MSC / M-14 | prior pin: cloth row pre-declared `class="bit-exact"` at Stage-1a RED with no measurement (self-contradictory) | cloth LANDED; `cloth.cpp:239` `assert_deterministic_run(runs=2,tol=0.0)`; doctest gate-7 + full suite 6/6 PASS | **RESOLVED-AT-HEAD** |
| m-16 / F-D5-PERF | replay gate token hygiene | tool uses `perf-ledger` consistently (`:62/:10/:340`); `perf` → ok=False | **HOLDS (doc-hygiene caveat)** |
| D5.1 | 21/21 per-sim + 3/3 harness bit-exact | re-run GREEN at HEAD | **PASS** |
| D5.3 | phase-2 cross-phase replay ok=True | 5/5 gates PASS, ok=True, no LFS recurrence | **PASS** |

## NEW findings
| ID | claim/location | observed | severity | remediation |
|----|----------------|----------|----------|-------------|
| F-D5-NEWTEST | tasks 5–8 add determinism CLAIMS to `registry.toml` but add NO `packages/<sim>/tests/test_determinism.py`; the enumeration-by-filename denominator (21) silently EXCLUDES cloth/neural-ca/pinn/3dgs-mpm | every claim IS otherwise verified (cloth doctest gate-7; nca `test_pbt_inference_determinism`; pinn checkpoint-inference 4/4 + my direct retrain; 3dgs-mpm golden + my direct two-run) | MINOR | for a uniform determinism denominator, add a `test_determinism.py` (or tag-marker) per new sim so `find … test_determinism.py` enumerates all 10 registry sims, not 6 classical ones |
| F-D5-PINN-NOTEST | pinn "CPU same-seed bit-identical" (registry `learned-dynamics.pinn-poisson.training/inference`) has NO encoded two-run CI test; relies on the committed checkpoint + indirect inference gates | direct check confirms it (retrain byte-for-byte; inference byte-equal) — claim is TRUE but untested in CI | MINOR | add an inference two-run `np.array_equal` test (cheap) mirroring neural-ca `test_pbt_inference_determinism` |
| F-D5-3DGS-NOTEST | 3dgs-mpm `class="bit-exact"` end-to-end claim has no dedicated two-run/sha256 CI test; the golden test asserts floors-vs-committed-goldens, not run-to-run byte equality | direct two-run check confirms 4/4 frames `np.array_equal=True` — claim TRUE | MINOR | add a two-run `run_canonical_sim(seed=0)` `np.array_equal` test |
| F-D5-REPLAY-PATH | `replay_prior_phase --audit` is read relative to cwd, not repo-root; the documented cwd `tools/integrity` + a repo-relative `--audit docs/_audits/…` 404s | absolute audit path works | MINOR | resolve `--audit` against `find_repo_root()` (as the worktree already is), or document the absolute-path requirement |

## Summary
All landed/captured determinism is **sound and bit-exact**: 21/21 per-sim + 3/3 harness
(D5.1); cross-phase replay `ok=True` 5/5 (D5.2); every NEW task-5–8 claim re-executed and
confirmed at HEAD — cloth symmetric-GS 2-run bit-exact (doctest gate-7), neural-ca
inference bit-exact / training honestly non-det+EFECT, pinn same-seed byte-for-byte
(direct retrain), 3dgs-mpm end-to-end byte-identical (direct two-run). The prior MAJOR
**F-D5-MSC / M-14** (premature cloth bit-exact pre-declaration) is **RESOLVED-AT-HEAD** —
the row is now backed by a real measurement and a passing test. **No BLOCKER** (every sim
that claims bit-exact replays bit-exact). New findings are all MINOR test-coverage /
doc-hygiene gaps; no PREMATURE bit-exact declaration remains.

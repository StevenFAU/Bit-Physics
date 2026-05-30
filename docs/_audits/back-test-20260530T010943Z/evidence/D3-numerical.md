# D3 — Numerical / mathematical correctness [BLOCKER dimension]

HEAD `4ee0ea9`. Worktree `/home/otacon/Projects/bp-audit-2`, venv via `uv run --no-sync`.
Method inherited from prior D3 evidence (`bp-audit/.../back-test-20260529T124759Z/`); ALL
values below INDEPENDENTLY RECOMPUTED at this HEAD (prior/in-repo assertions not trusted).

A background mutmut job runs against
`tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/` — it mutates that file
in the working tree live (see D3.2 rd-3d note); recomputations are immune (pristine HEAD source).

## Denominator accounting
- **Golden generators with `--verify`: 8** (was 7; task-5 added `cloth_catenary`). `cubic_spline.py`
  is a shared helper with a `main()` but NO `--verify` flag (not a table generator) — excluded, as before.
- **MMS targets: 4 central modules + 7 per-package convergence files = 11**, plus task-7
  `pinn-poisson` FD-order + analytic targets. All run.
- **NEW numerical-anchor recomputations: 12 pinn golden u-values + 3 FD orders + 3 anchor
  harmonicity checks (task-7); 3 3dgs-mpm coupling anchors ×2 outputs (task-8); 32+8 cloth
  catenary nodes + a + sag (task-5); PINN/NCA EFECT + render-floor consistency (task-6/7).**

---

## D3.1 — Golden recompute vs committed tables — 8/8 OK (PASS)
`just` absent (process note, as prior); ran each `python -m golden.generator.<g> --verify` directly
(cwd `tools/testkit`). Full log: `D3-golden-verify.log`.

| generator | result |
|---|---|
| lorenz_structural | OK (SymPy canonical) |
| mandelbulb_de_samples | OK (SymPy p=8,R=2) |
| boids_3agent_step1 | OK (closed-form) |
| physarum_deposit_step1 | OK (closed-form) |
| dfsph_density_evolution | OK (closed-form) |
| d3q19_equilibrium | OK (closed-form) |
| mls_mpm_quadratic_bspline | OK (closed-form) |
| **cloth_catenary (NEW task-5)** | **OK ("cloth golden tables: VERIFIED")** |

All 8 verifiers recompute from closed-form / SymPy (independent of the FP sim impl). **Verdict: PASS.**

## D3.2 — MMS order-of-accuracy
- **Central framework** `tools/testkit/code_verification/mms/tests/`: **8 passed.**
- **Per-package (7 files), per-rootdir:** eulerian-smoke ✓(2), eulerian-smoke-stack-d ✓(2),
  eulerian-smoke-stack-e ✓(2), lattice-boltzmann-d3q19 ✓(1), …-stack-d ✓(1), …-stack-e ✓(1),
  **reaction-diffusion-3d — see note.**
- **rd-3d note (NOT a defect):** the working-tree pytest FAILED with `nan` because the live mutmut
  job had mutated `…/reaction_diffusion_3d/solution.py` in place (`solution.py.bak` == git HEAD
  byte-for-byte; working tree showed `-sin_t → +sin_t` / `* sin_t → / sin_t` mutants). Re-run against
  PRISTINE HEAD source via importlib injection:
  ```
  N= 16  ||e_U||=7.145971e-04  ||e_V||=9.840184e-06
  N= 32  ||e_U||=1.775487e-04  ||e_V||=2.699149e-06
  N= 64  ||e_U||=4.431470e-05  ||e_V||=6.902295e-07
  observed OOA  combined = 2.0056  (formal 2.0, tol ±0.5)  -> PASS
  ```
  Errors drop ~4× per grid-doubling = O(h²). **rd-3d MMS PASSES on pristine HEAD.**
- **Verdict: PASS** (11/11 MMS targets pass on pristine source; the lone working-tree red was a live
  mutant the mutation job is killing, confirmed by `.bak`==HEAD diff).

## D3.3 — Falsifiability control (broken-solver meta-test) — PASS
`tools/testkit/code_verification/mms/tests/test_broken_solver.py::test_broken_solver_observed_order_is_rejected`.
Independently computed:
- **BROKEN** (first-order forward-diff for u_xx): `observed_order_l2 = -0.025`, `passes = False` → CAUGHT.
- **CORRECT FTCS** (positive control): `observed_order_l2 = 2.0044`, `passes = True`.
The framework can go red on a deliberately-wrong solver. **Verdict: PASS (genuinely falsifiable).**

---

## D3.NEW-7 — pinn-poisson (task-7) — PASS
Files: `packages/pinn-poisson/`, golden `tools/testkit/golden/tables/pinn-poisson-canonical.json`.

**(a) FD convergence orders.** Claimed `[2.0023, 2.0005, 2.0001]` (computed by
`fd_convergence_orders(ANCHOR3, [16,32,64,128])`). Independently re-solved the 5-point-Laplacian FD
system myself, computed rel-L2 vs the analytic MMS solution at each grid, took log-log slopes with
h=1/(n-1):
```
n= 16 rel-L2 = 3.663440e-03
n= 32 rel-L2 = 8.562846e-04
n= 64 rel-L2 = 2.072485e-04
n=128 rel-L2 = 5.099462e-05
MY orders = [2.0023, 2.0005, 2.0001]   (repo fd_convergence_orders = [2.0023, 2.0005, 2.0001])
```
**MY recompute == claimed, byte-identical; all ≈2.0 → O(h²). PASS.**

**(b) 3 analytic anchors (incl. f≠0 MMS).** Verified Δu_exact == f for each (numpy FD of the analytic
u, scaled residual = discretization floor ~1e-10/1e-11):
- Anchor 1 `½ln((x+½)²+(y+½)²)` harmonic (f=0) ✓
- Anchor 2 `sinh(πx)sin(πy)` harmonic (f=0) ✓
- Anchor 3 (f≠0 MMS) `sin(πx)sin(πy)` ⇒ f = −2π²sin(πx)sin(πy); source formula matches exactly at
  test point (0.3,0.7): −12.919479888783744 ✓

**(c) golden table.** Recomputed all **12** `expected.u` values from the closed forms — **MISMATCHES: 0/12**
at tol 1e-12 (all |Δ|=0.00e+00). PASS.

**(d) FD-reference + analytic tests:** `pytest tests/test_fd_reference.py tests/test_analytic_problems.py`
→ **11 passed.**

## D3.NEW-8 — 3dgs-mpm coupling anchors (task-8) — PASS
`tools/testkit/golden/tables/3dgs-mpm-coupling.json` (tol abs/rel 1e-9). Independently built
A = R·diag(scale²)·Rᵀ from each quaternion, Σ′ = F·A·Fᵀ, scale_sorted = sort(√eig(Σ′)):

| anchor | claimed Σ′ diag | MY Σ′ diag | max|Δcov| | scale_sorted | max|Δscale| | result |
|---|---|---|---|---|---|---|
| anchor3-identity-F (F=I) | (1,4,9) | (1,4,9) | 0.00 | (1,2,3) | 0.00 | PASS |
| anchor1-covariance-transform | (16,0.25,20.25) | (16,0.25,20.25) | 7.11e-15 | (0.5,4,4.5) | 8.88e-16 | PASS |
| anchor2-polar-decomposition | (9,4,16) | (9,4,16) | 0.00 | (2,3,4) | 0.00 | PASS |

- **(a) F=I trivial:** Σ′=I·A·Iᵀ=A=diag(1,4,9) unchanged ✓
- **(b) Σ′=F·A·Fᵀ:** R_z(90°) ⇒ A=diag(4,1,9); F=diag(2,0.5,1.5) ⇒ Σ′=diag(16,0.25,20.25) ✓
- **(c) polar decomp:** A=I, F=R_z(90°)·diag(2,3,4) ⇒ Σ′=F·Fᵀ=diag(9,4,16), scales=(2,3,4)=σ(S) ✓

All within ~1e-15, far inside 1e-9. **PASS.**

## D3.NEW-5 — cloth catenary goldens (task-5) — PASS
`cloth-hanging.json` + `cloth-stretched.json`. Independent recompute (own Brent root-finder for the
catenary parameter, own arc-length inversion — NOT the repo's bisection):

**cloth-hanging** (catenary y=a·cosh(x/a); 2a·sinh(X/a)=S, X=9, S=31):
- catenary `a` = **4.730894497759548** (table 4.730894497759548; Δ=8.88e-16 = machine eps)
- 32 node positions: **max|dx|=5.33e-15, max|dy|=1.28e-14** vs table (sim tol catenary_shape_rel=2e-3).
- sag_depth: table 11.448661993500842 = the lowest-NODE y-magnitude (nodes k=15/16 at x'=±0.5), which
  I reproduce to 1e-14. (A naive continuous-low-point a(cosh(X/a)−1)=11.475 differs by 0.026, but the
  table's `sag_depth` is the discrete-node minimum, internally consistent and reproduced.)

**cloth-stretched** (uniform GAP/(n-1)=10.5/7=1.5, positions k·1.5):
- uniform_spacing = 1.5 (table 1.5) ✓; 8 node positions **max|d|=0.00e+00.**

**PASS** (both tables reproduce to machine precision; tolerances physically anchored).

## D3.NEW-6 — NCA checkpoint / EFECT numerics (task-6) — PASS
`packages/neural-ca/`. EFECT = upper-3σ band of the final-training-loss distribution across pinned
seeds (the training-convergence reproducibility bound; non-deterministic by design).

**EFECT internal consistency (recomputed from stated mean/std):**
- PINN (task-7, same registry shape): mean 2.37e-6, std 6.89e-7 ⇒ 3σ-upper = 2.37e-6 + 3·6.89e-7 =
  **4.437e-6** (claimed 4.44e-6 ✓); CV 0.291 (claimed 0.290 ✓); locked 5e-6 ≥ 4.44e-6 (margin) ✓.
- NCA training_loss_3sigma_upper = 0.07 (DERIVED EFECT band, bounded ⇒ no STOP-EFECT).

**NCA render-similarity / L2-floor consistency** (measured PSNR 23.92 / SSIM 0.824 / LPIPS_alex 0.0316;
checkpoint L2 measured 0.0219):
- locked psnr_min 23.0 ≤ 23.92 ✓ · ssim_min 0.80 ≤ 0.824 ✓ · lpips_max 0.05 ≥ 0.0316 ✓ ·
  golden_checkpoint_l2_max 0.03 ≥ 0.0219 ✓. Every locked floor sits on the correct (margin) side of
  its measured value.
- QUALITY-CONCERN (repo-flagged, not a falsity): mean PSNR 23.92<§2.12 floor 28, SSIM 0.824<0.85 —
  the cross-stack gate is STATISTICAL precisely because the stochastic per-cell fire-mask RNG
  (torch.rand vs WGSL PCG) drags pixel metrics; perceptual LPIPS 0.0316 PASSES floor 0.15. Internally
  consistent. Checkpoint + both captures are smudged real binaries (33KB / 1.4MB, not LFS pointers).
- NCA pytest suite: **10 passed in 392.84s** (slow under the live mutation job) — includes the
  golden-anchor checkpoint-L2 test, the cross-stack render-similarity gate-14, and train-convergence.

**EFECT is internally consistent. PASS.**

---

## Re-tested findings (verdict table)

| ID | finding | prior | this HEAD | status |
|---|---|---|---|---|
| M-15 | `tools/testkit/solution_verification/` GCI/Richardson harness absent | absent (`.gitkeep`+README) | UNCHANGED — only `.gitkeep`+README; no gci/richardson/report modules | HELD (DEFERRED, tooling-absent) |
| M-15 (false-claim hunt) | no sim FALSELY claims solution-verified | none | UNCHANGED — all §6.2 = declared-deferred / not-applicable / N/A-at-Phase-3. NEW sims: pinn "convergence-with-collocation" + FD-order-≈2 = code-verification NOT GCI; cloth "convergence axis" = iteration-convergence NOT GCI; 3dgs-mpm/articulated no GCI claim | HELD (no false claims) |
| m-12 | golden tolerances uncapped in `tolerance-budget.toml` (`[golden_tolerance.*]` not budget-enforced) | gap present (3 rows) | UNCHANGED + WIDER — `tolerance-budget.toml` has only `[budgets.*.cross_stack]` (6); NO `[budgets.*.golden]` cap shape. Now **7** `[golden_tolerance.*]` rows (lenia, ising, articulated-pedagogical, **cloth, neural-ca-python, pinn-poisson, 3dgs-mpm** NEW) sit off-budget. Each derivation-justified in-comment; values reproduce. | HELD (MINOR structural gap) |

## NEW numerical findings
NONE of BLOCKER class. Every NEW golden/MMS/anchor recomputed and reproduced:
- pinn FD orders [2.0023,2.0005,2.0001] reproduce byte-identical; 12/12 golden u-values |Δ|=0; 3 anchors harmonicity/forcing confirmed.
- 3dgs-mpm 3 coupling anchors reproduce within ~1e-15 (tol 1e-9).
- cloth catenary a + 32 nodes reproduce to ~1e-14; stretched 8 nodes exact.
- NCA/PINN EFECT 3σ + render floors internally consistent.

| finding ID | severity | status | location |
|---|---|---|---|
| F-D3-GCI (re-confirmed M-15) | MAJOR (coverage) | HELD — harness unbuilt, no false claims | `tools/testkit/solution_verification/` |
| F-D3-TOLCAP (re-confirmed m-12, widened) | MINOR (enforcement-shape) | HELD — 7 golden_tolerance rows off-budget by design | `tools/testkit/equivalence/tolerance-budget.toml` (no `[budgets.*.golden]`) ; `tools/testkit/equivalence/tolerance.toml:131,156,175,198,240,274,292` |

## Summary
D3 BLOCKER dimension at HEAD `4ee0ea9`: golden **8/8** ✓, MMS **11/11** pass on pristine source +
falsifiable ✓, all NEW anchors (pinn 12 golden + 3 FD orders + 3 harmonic; 3dgs-mpm 3 coupling; cloth
a+40 nodes; NCA/PINN EFECT) INDEPENDENTLY RECOMPUTED and reproduced, no false solution-verified claims ✓.
**Zero BLOCKER findings.** The two HELD findings are coverage/enforcement-shape (GCI harness absent;
golden tolerances off-budget), not wrong numbers. The single working-tree rd-3d red was a live mutmut
mutant (confirmed via `.bak`==HEAD), not a repo defect.

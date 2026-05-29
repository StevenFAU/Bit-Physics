---
sub_phase: sub-phase-phase-3-pinn-poisson
task: task-7
sim_identity: pinn-poisson
package_leaf: packages/pinn-poisson
category: learned-dynamics (NEW category)
stack: E (Warp substrate) + PyTorch
stage: execution (Stage 0 onward)
verdict: CONFIRMED-SHIFTED (plan-drafting); D-classes RATIFIED + RESOLVED at execution Stage 0
date: 2026-05-29
head_sha: 5cddb6c8ca88646068af9add2afce3335f63d436
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
revisions:
  - v1 (2026-05-29) — initial charter; Warp↔PyTorch interop probed WORKS (no BLOCK);
    D-classes routed with leans; A-6 staged for Stage 0.
  - v2 (2026-05-29) — execution Stage 0: operator-ratified D-classes flipped
    OPERATOR-PENDING → RESOLVED. D-WARP-TORCH-INTEROP re-probed live on Warp 1.13.0 /
    PyTorch 2.12.0 (CPU zero-copy, f64, round-trip bit-identical — WORKS, no BLOCK).
    physicsnemo-sym v2.4.0 (acaeb6dc…, Apache-2.0) vendored read-only +
    references/PhysicsNeMo-PINN/MANIFEST.toml. A-6 filed (spec D.3 + §2.18 plan note).
---

# Sub-phase charter — task-7 PINN-Poisson (Phase 3, sub-phase 3.6)

> **Authority precedence:** spec (`docs/architecture.md` v2.4) → plan §6.7
> (`docs/phases/phase-3-plan.md`) → conventions (`docs/conventions/sub-phase-conventions.md`)
> → sibling charters. Spec FROZEN in Phase 3 (§9.6): spec corrections route to
> `docs/spec-amendments-proposed.md`; plan corrections are documented as SHIFTs (§0.3,
> agent does NOT edit the plan). Every cite checked at assertion (Convention #8).
>
> **PLAN-DRAFTING ONLY.** This charter + its probe (`tools/testkit/probes/reports/pinn-poisson.md`)
> are the deliverable. Execution (Stage 0→2) is a separate dispatch after the operator
> ratifies the operator-pending D-classes in §6.

## 1. Scope and posture

task-7 is the **first learned-dynamics-CATEGORY** sim and the **terminal** sim of the
Phase-3 sim arc (per plan §3.1 `:329`, task-7 produces; task-9 is a soft/informational
common-warp consumer). It implements a **Physics-Informed Neural Network (PINN) solving
the 2D Poisson equation** `Δu = f` on the unit square, on **Stack E (Warp substrate) +
PyTorch** (single-stack), verified **two-pronged**: against **analytic** Poisson solutions
(golden values, ≥3 independent-reference anchors) AND against a **classical finite-
difference (FD) reference** that task-7 also ships as a **reusable testkit surface**
(`tools/testkit/code_verification/classical-references/poisson-2d-fd/`, §2.8 — future
learned-dynamics sims consume it). Solution-verification adds **convergence with
collocation density**. Reference: Raissi, Perdikaris & Karniadakis (2019),
*J. Comput. Phys.* **378, 686–707** (DOI 10.1016/j.jcp.2018.10.045); spec §5.12.

### 1.1 Friction table — single-stack relief + first-learned-dynamics-CATEGORY

CONTEXT-BRIDGE (read progress.md tasks 1–6). After NCA's **dual-stack + statistical
cross-stack gate-14**, task-7 is materially simpler on the equivalence axis but introduces
the learned-dynamics category and a new reusable verification surface.

| Friction / relief | Disposition | Where handled |
|---|---|---|
| **RELIEF:** single-stack → **NO gate-14, NO render-similarity, NO cross-stack budget** | verification returns to RIGOROUS ANALYTIC anchoring (golden values vs analytic Poisson + FD reference + convergence) | §6 D-ANCHOR-SET, §7 |
| **RELIEF:** first learned-dynamics CATEGORY, but the tolerance schema **already pre-bakes** `golden_tolerance.learned-dynamics.pinn-poisson` (`analytical_l2`, `fd_l2`) | NO schema extension / NO budget cap / NO §2.6 amendment — *cleaner than rigid-body's new-category friction* | §6 D-TOL |
| **Warp↔PyTorch interop** is load-bearing (PINN in PyTorch; capture/determinism in common-warp; the torch→wp Capture bridge) | **probed WORKS (CPU, zero-copy, f64)** — no BLOCK; pattern in §6 D-WARP-TORCH-INTEROP | §6 D-WARP-TORCH-INTEROP |
| **CPU-only env** (no CUDA driver) — training runs CPU, not CUDA | re-shapes D-DET; NCA's CPU same-seed-bit-identical finding *may* transfer — MEASURE, don't assume | §6 D-DET |
| Anchors 1 & 2 (plan §6.7) are **both harmonic (f=0)** — they don't exercise the Poisson **source term** | ADD Anchor 3 (inhomogeneous MMS `u=sin·sin → f=−2π²sin·sin`); REQUIRED in the anchor set | §6 D-ANCHOR-SET |
| NEW reusable **classical-FD reference** testkit surface (first classical-reference) | mutation-target question → defer (rule-of-three not met) | §6 D-MUTATION |
| PhysicsNeMo PINN tutorial lives in **physicsnemo-sym**, not the core repo pinned in §2.18 | D-VENDOR-SHA/ROLE; vendor physicsnemo-sym read-only; file A-6 | §6 D-VENDOR-* |
| Stack-E **USD export** mandate (§2.5) vs unbuilt common-warp USD surface | DEFER per task-4 ratified Phase-3-Stack-E-WIDE policy; closed-with-shifted item | §6 D-USD |
| EFECT for training non-determinism is a **new derivation** (NCA was first; first learned-dynamics CATEGORY here) | MEASURE-then-declare; STOP-EFECT if underivable; EFECT is **NOT** the acceptance gate | §6 D-DET |
| Inherited Warp-sim friction: **F-RB-1** (`failing-tests-evidence/` excluded from trailing-whitespace hook) + **F-RB-3** (`# mypy: ignore-errors` scoped to Warp-touching files) | apply at Stage 1a/1b; cf. task-4 landing | §2, §8 |

### 1.2 Inheritance and re-frames

- **Trunk-based to `main`; no PR; no tag (D-TAG NO).** The plan §6.7 "BASE BRANCH /
  YOUR BRANCH / MERGE PROTOCOL §4.3" lines are SUPERSEDED (plan v8/v9; tasks 4–6).
- **§0.3 SHIFTs** (follow-discovered; the §6.7 deliverable anchors carry stale prose):
  - layout `packages/pinn-poisson/` (flat) NOT `learned-dynamics/pinn-poisson/python/`
    (D-LAYOUT — lenia/rigid-body/neural-ca precedent);
  - CI `python-strict.yml` (`test-pinn-poisson` job) NOT `build-py.yml` (which does not exist);
  - vendor manifest `references/PhysicsNeMo-PINN/MANIFEST.toml` NOT `manifest.yaml`;
  - Strauss anchor cite **§6.2 "Rectangles and Cubes"** NOT §6.1 (§6.1 = "Laplace's Equation").
- **Spec sheet is authoritative for the algorithm**; spec §5.12 verification posture =
  "classical-reference comparison + convergence-with-training-data is its own axis"; §2.6
  learned-dynamics row = `distributional` (cross-stack) — N/A here (single-stack), but it
  underwrites the training-non-determinism posture.

## 2. Stage cadence

Mirrors rigid-body/lenia/NCA: **Stage 0 → 1a → 1b → 1c → 2**, trunk-based to `main`,
Convention-A new-files-first, ≤500-line commits, TDD with failing-output-hash footer
(§S6 — real sha256, no placeholders). Per the dispatch, **Stage 1b splits** into the FD
reference, the PINN training, and the verification wiring. Estimated ~25–50 commits.

| Stage | What |
|---|---|
| **0** | Preflight (exit 0); **§Q `source tools/lfs/setup-lfs-s3-local.sh` as first action after anchor probe** (STOP-LFS-PUSH on non-zero); cross-phase replay `v0.2.0-phase-2` (ok=True; LFS-cache recovery per [[replay-needs-lfs-cache-recovery]] if needed); **probe the Warp↔PyTorch interop live** (BLOCK on break); **vendor physicsnemo-sym read-only (web-re-verify SHA/license/example) + author `MANIFEST.toml`**; **file corrigendum A-6** (spec D.3 + §2.18 note); resolve operator-ratified D-classes BEFORE 1a. |
| **1a** | Scaffold `packages/pinn-poisson/` + RED. Failing TDD: training-convergence; inference-vs-analytic (Anchor 1/2/3); inference-vs-FD; convergence-with-collocation-density. Capture verbatim failing pytest → `tools/testkit/failing-tests-evidence/pinn-poisson-<UTC>.txt`, sha256 in commit footer (gate-3; **F-RB-1**: dir excluded from trailing-whitespace hook). Append **two determinism-registry rows** (training / inference, DEFAULT) + the **`[golden_tolerance.learned-dynamics.pinn-poisson]` tolerance row** (§S.2: read schema + one existing entry first). spec-ref §1–§13 committed. |
| **1b-FD** | Classical FD reference + analytic goldens. Implement `tools/testkit/code_verification/classical-references/poisson-2d-fd/solver.py` (pure NumPy 5-point Laplacian + sparse solve; mms `heat_1d_ftcs.py` precedent) + `classical-references/README.md`. Author analytic golden tables (G) + derivation (H: `poisson-2d-analytical.md`) with ≥3 independent-reference anchors per table (Anchor 1 Evans §2.2; Anchor 2 Strauss §6.2; Anchor 3 hand-derived MMS `f≠0`). FD solver verified against the analytic anchors (it is a NUMERICAL baseline anchored to (a), not independent — document in spec-ref §6). |
| **1b-PINN** | PINN training + checkpoint. Reimplement the Raissi-2019 soft-constraint PINN in PyTorch (MLP + `torch.autograd.grad` PDE residual + boundary loss; cite-don't-import; physicsnemo-sym cross-checks). Train to a loss bound; emit checkpoint (LFS). **MEASURE the training-loss distribution → derive the EFECT bound**; **MEASURE inference determinism** (`assert_deterministic_run` / `run_twice_and_diff`); re-declare the two determinism rows on evidence. Produce the canonical inference capture via the torch→wp→`Capture` bridge. PBT: `boundary_residual_bounded` + `pde_residual_bounded` (envelope-scoped; re-declare on falsification, do NOT widen — NCA `field_values_bounded` precedent). |
| **1c** | Verification wiring + landing prep. Wire PINN-vs-analytic (golden), PINN-vs-FD (classical-reference), and convergence-with-collocation gates green. Tier-3 diagnostic (J). Perf-ledger row (gate-12; **training_wall_clock recorded separately** — do NOT silently omit, S2-RD2C1 lesson). Schema-corpus seed `tests/fixtures/legacy-captures/phase-3-pinn-poisson.h5` + sidecar (LFS; §Q push in the SAME shell as the bootstrap). gate-13 replay (worktree, Convention E). |
| **2** | Landing audit. §R two-field integrity; replay; append-only verify; `verify_evidence` no-regression across prior Phase-3 audits; §S.5 FULL CI sweep green; close `closed-with-shifted-N` (§2.15) — USD-defer + any measured SHIFTs are the shifted items; progress.md final entry; **propose the Appendix D.2.3 capture-descriptor row** for operator; Convention #12 SHA back-fill; **NO tag**. |

## 3. Deliverables (Layer 4 per §5.4; §6.7 A–N + v9 addendum)

| §6.7 | Deliverable | Resolved path / note |
|---|---|---|
| A | spec sheet (`§6` two-pronged: vs analytical AND vs FD) | `docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md` |
| B | probe report | `tools/testkit/probes/reports/pinn-poisson.md` (done, plan-drafting) |
| C | failing TDD (train-convergence + inference vs analytical/FD) | `packages/pinn-poisson/tests/` (§0.3: flat, not `.../python/tests/`) |
| D | PINN sim (PyTorch + Warp); CLI per §3.2.6 | `packages/pinn-poisson/` |
| E | classical FD reference (reusable) | `tools/testkit/code_verification/classical-references/poisson-2d-fd/` |
| F | classical-ref pattern README | `tools/testkit/code_verification/classical-references/README.md` |
| G | golden tables (analytical + FD at canonical points) | `tools/testkit/golden/tables/pinn-poisson-canonical-{N}.json` |
| H | analytic derivation | `tools/testkit/golden/derivations/poisson-2d-analytical.md` |
| I | vendored PhysicsNeMo ref + MANIFEST | `references/PhysicsNeMo-PINN/MANIFEST.toml` (§0.3: TOML, not `manifest.yaml`) |
| J | Tier 3 diagnostic | `tools/diagnostics/tier3/pinn-poisson/` |
| K | Cat 1/2/3 gates green | per §7 |
| L | shared-file updates | `README.md`, `CHANGELOG.md` (`### sub-phase-…`), `docs/glossary.md` (PINN, Raissi formulation, collocation points, soft-constraint loss, physics-informed loss, PhysicsNeMo — all net-new), `justfile`, **`python-strict.yml`** (`test-pinn-poisson`; §0.3 NOT build-py.yml), `tolerance.toml` (`[golden_tolerance.learned-dynamics.pinn-poisson]` `analytical_l2=1e-3`, `fd_l2=1e-2`), `registry.toml` (two rows) |
| M | progress.md entry | `docs/_audits/phase-3/progress.md` (append-only) |
| N | report | `docs/_audits/phase-3/task-7-pinn-poisson.md` |
| v9 | TDD output-hash; ≥2 PBT invariants; ≥3 independent-reference anchors; perf row (+ `training_wall_clock`); schema-corpus seed; tolerance-budget compliance; evidence-hashes in audit | per §2, §7, §8 |

## 4. Out of scope (Phase 4+)

GNS-particle; learned-closure-LES; foundation models; PINN↔classical coupling;
time-dependent PDEs; differentiable inverse problems; PyTorch promotion into common-py
(locked §2.10; task-9 evaluates); USD export (deferred — D-USD); gate-14 / cross-stack
equivalence (single-stack); render-similarity; common-warp API extraction (rule-of-three;
task-9).

## 5. Pre-flight checks (Stage 0 discharges)

- `uv run python tools/dispatch/preflight-phase.py 3` → exit 0 (verified this session;
  STOP-PREFLIGHT-NEW on a genuine non-zero).
- Integrity `0 HARD_FAIL / 14 SOFT_WARN` (verified; §R measures the digest live — do NOT
  copy `b7460150…`, it drifts legitimately per [[integrity-baseline-digest-method]]).
- common-warp consumability (rigid-body consumer pattern); Warp↔PyTorch interop (BLOCK gate).
- §Q LFS bootstrap is the FIRST Stage-0 action after the anchor probe.

## 6. D-class decision routing

**RESOLVED at execution Stage 0 (operator-ratified; v2 — 2026-05-29):**
D-WARP-TORCH-INTEROP (re-probed WORKS), D-ANCHOR-SET, D-DET, D-VENDOR-SHA/ROLE (A-6 filed),
D-MUTATION — all flipped OPERATOR-PENDING → **RESOLVED** below. **Resolved-in-charter** (leans
per §0.3/precedent): D-USD, D-TOL, D-LAYOUT, D-CI, D-MANIFEST-FMT, D-NAMING, D-CAPTURE-DESC, D-TAG.

### D-WARP-TORCH-INTEROP ⚠ (BLOCK gate) — **RESOLVED v2: WORKS, no BLOCK** (re-probed Stage 0)
**Stage-0 re-probe (2026-05-29):** `wp.from_torch`/`wp.to_torch` round-trip **bit-identical**
(`torch.equal` True) on the installed **Warp 1.13.0 / PyTorch 2.12.0**; CPU **zero-copy
confirmed** (`t.data_ptr() == arr.ptr` True); **f64 preserved**. No BLOCK fired.
**Finding (probed live):** `wp.from_torch`/`wp.to_torch` round-trip bit-identical on the
installed Warp 1.13.0 / PyTorch 2.12.0; CPU zero-copy confirmed (shared ptr); f64 preserved.
**Pattern:** PINN computes in torch (autodiff residual); the canonical capture crosses the
boundary via `wp.from_torch(field_tensor)` → `Capture` payload → `write_capture`. GPU zero-copy
untestable (no CUDA driver) but off the critical path (CPU execution). **No work-around needed.**
Stage 0 re-probes on the installed versions and BLOCKs only on a genuine break (§6.7).

### D-ANCHOR-SET ⚠ — **RESOLVED v2** (operator-ratified) — verification-DESIGN (not just cite-checking)
**Finding:** plan §6.7 Anchor 1 (`u=log|z|`) and Anchor 2 (`u=sinh(πx)sin(πy)`) are **both
harmonic** (`Δu=0`, i.e. Poisson with `f=0`) — they verify the Laplacian + Dirichlet-BC
handling but NOT the Poisson **source term**. **LEAN (required):** the anchor set MUST include
**Anchor 3 — a genuine inhomogeneous MMS case**: `u=sin(πx)sin(πy) → f=−2π²sin(πx)sin(πy)`
(`f≠0`, zero Dirichlet BC on `[0,1]²`; hand-derived, verified). Each golden table ships ≥3
independent-reference anchors (Cat-3 HARD_FAILs otherwise, spec §2.4 `:373`):
- Anchor 1 — Evans PDE 2e **§2.2 "Laplace's Equation"** (§2.2.1 fundamental solution
  `Φ=−1/2π·log|x|`, n=2) — cite **verified correct**.
- Anchor 2 — Strauss PDE 2e **§6.2 "Rectangles and Cubes"** (separation-of-variables) —
  **SHIFT** from the plan's §6.1 (§6.1 = "Laplace's Equation", general theory; cite verified wrong).
- Anchor 3 — hand-derivation (MMS); the **load-bearing inhomogeneous (`f≠0`) Poisson case**.

The **FD solver is a high-precision NUMERICAL baseline anchored to the analytic set (a)**,
NOT itself independent (it inherits its own discretization error) — document explicitly in
spec-ref §6. NO plan edit (§0.3); SHIFTs documented in report §1.

### D-DET ⚠ — **RESOLVED v2** (operator-ratified; measure-then-declare at 1b-PINN) — two rows; EFECT not the gate
Two determinism-registry rows per §3.2.5 (`:487-503`), `[learned-dynamics.pinn-poisson.{training,inference}]`:
- **training** — DEFAULT non-deterministic-by-design (PyTorch backprop) + `distributional_bound="EFECT"`
  (NCA shape); scope `n/a`.
- **inference** — DEFAULT `bit-exact`, scope `same-stack-same-hw` (frozen weights → deterministic
  function evaluation).

**MEASURE-then-declare at 1b-PINN.** IMPORTANT delta from NCA's dispatch framing: this env is
**CPU-only (no CUDA)** — so the CUDA-atomic-non-determinism worry is moot; **NCA *measured*
same-seed CPU training to be bit-identical**, which *may* hold here too. Do NOT assume it
transfers (different net/optimizer); if measured bit-identical, **RE-DECLARE the training row on
evidence** (the registry already supports it). Derive the EFECT bound from the measured
training-loss distribution; **STOP-EFECT** (surface to operator, ising STOP-DET template
`docs/phases/sub-phase-phase-3-ising-classical.md`) if underivable. **CRITICAL SEPARATION:**
the EFECT bound characterizes TRAINING reproducibility — it is **NOT** the acceptance gate. The
load-bearing gates are the **analytic + FD verification** on the frozen network; a STOP-EFECT
does NOT block them.

### D-VENDOR-ROLE — **RESOLVED v2** (operator-ratified) — read-only reference-oracle (reimplement from Raissi)
**LEAN:** `references/PhysicsNeMo-PINN/` vendored **READ-ONLY reference-oracle**; reimplement the
PINN from **Raissi 2019** (cite by name, §H.2 cite-don't-import); physicsnemo-sym cross-checks at
derivation time; **do NOT runtime-link / pip-install the framework** (heavy; SPlisHSPlasH / Bender /
growing-ca precedent). `references/` excluded from end-of-file-fixer / trailing-whitespace / ruff
hooks + Cat-2 (cloth/NCA precedent).

### D-VENDOR-SHA ⚠ — **RESOLVED v2** (vendored physicsnemo-sym v2.4.0 `acaeb6dc…`; A-6 filed) — repo split + version drift
**Finding:** §2.18 (`:293-300`) pinned **`NVIDIA/physicsnemo` (core)** `766e485a` (v2.1.0); spec D.3
(`:2553`) pins `pip install nvidia-physicsnemo==<latest 1.x>`. But the **PINN / elliptic-PDE
tutorials live in `NVIDIA/physicsnemo-sym`** (`examples/`: `helmholtz`, `darcy`, `airfoil_pinn`, …);
the core repo has none. physicsnemo-sym latest stable = **v2.4.0** (Apache-2.0). The `<latest 1.x>`
pin text is stale (v1.x ended at v1.3.0); spec §2702's `1.x → 2.0 BLOCKED` is a **runtime-link**
rule that does not bind a **read-only** vendored source. **LEAN:** Stage 0 vendors the closest
2D-elliptic-Dirichlet PINN example from **physicsnemo-sym v2.4.0** read-only (web-re-verify the SHA,
license, and example choice — `helmholtz` reduces to Poisson at `k=0`, or a `darcy`/diffusion
example), authors `MANIFEST.toml`, and files **corrigendum A-6** correcting spec D.3 (PINN-tutorial
home = physicsnemo-sym; pin text stale) with the §2.18 plan-registry correction deferred to the
operator (A-4 pattern). **Surface to operator** (the §2.18 pin points at the wrong repo for the tutorial).

### D-MUTATION ⚠ — **RESOLVED v2** (operator-ratified DEFER to task-9) — classical-FD reference: defer the mutation target
task-7 is a **sim** (not a mutation target itself; §6.0 item 12 — mutation = task-1/2/9 testkit
territory). It ships a NEW reusable testkit surface (`poisson-2d-fd`), which raises the question:
is the FD reference a mutation target? **LEAN: DEFER** — its correctness is established by the
**analytic anchors** it is verified against, and per rule-of-three it is the **FIRST**
classical-reference (the pattern is not yet established by 3 consumers; live mutation convention
§J/§I has no mandate that a new testkit surface ships a mutation baseline). Route the mutation-target
decision to **task-9** (maturation); document the rationale in the report. Stage 0/1c **confirms
against the live mutation convention** (`tools/testkit/mutation/mutmut-config.toml`) and **surfaces**
(not silently skips) if the convention expects a baseline here.

### D-USD — DEFER (task-4 Phase-3-Stack-E-WIDE ratified policy)
**RESOLVED-BY-PRIOR-POLICY.** task-7 is Stack E, so §2.5 binds — BUT task-4 (rigid-body) already
established the operator-ratified **Phase-3-Stack-E-WIDE** policy: **DEFER USD to Phase-4 WU-D** (the
`common_warp.usd` export surface is unbuilt; no Stack-E sim ships USD; plan §6.7 deliverables A–N do
not list USD). **APPLY** that policy — do NOT build USD, do NOT re-litigate. Document the §2.5 gap in
spec-ref `§-export`; carry it as a `closed-with-shifted` item at Stage 2.

### D-TOL — RESOLVED-IN-CHARTER (cleaner than rigid-body)
**LEAN:** land `[golden_tolerance.learned-dynamics.pinn-poisson]` in `tolerance.toml`
(`analytical_l2=1e-3`, `fd_l2=1e-2` per §6.7 L; PINN tolerance is intentionally wider than the
analytic-solver tolerance — document rationale). The `golden_tolerance` schema branch **already
exists and explicitly names `pinn-poisson: analytical_l2, fd_l2` under `learned-dynamics`**
(lenia-tolerance-schema-fix, §S.3 shape 3) → **NO schema extension, NO `[budgets.*]` cap, NO §2.6
amendment** (unlike rigid-body's new-category situation, the schema already anticipated this sim).
§S.2: read `tolerance-schema.json` + one existing `golden_tolerance` entry before writing. The schema
permits a string `training_loss_distributional_bound="EFECT"` here too (optional; the registry row is
the primary home).

### D-LAYOUT — RESOLVED-IN-CHARTER
**LEAN:** `packages/pinn-poisson/` (flat; §0.3 precedence — `packages/{lenia,articulated-pedagogical,
neural-ca}/` are all flat). The §6.7 "learned-dynamics/pinn-poisson/python/" and the spec D.1
`<category>/<sim>/` are **stale category anchors** → SHIFT. Sim-spec at
`docs/sim-specs/learned-dynamics/pinn-poisson/` (sim-spec dir DOES use category per D.1).

### D-CI — RESOLVED-IN-CHARTER
**LEAN:** `python-strict.yml` (`test-pinn-poisson` job). `build-py.yml` does **NOT** exist (§6.7
deliverable L names it — SHIFT; cloth/rigid-body/NCA precedent). The job runs pytest + the gate
suite + `mypy --strict` (apply **F-RB-3** `# mypy: ignore-errors` scoped to Warp-touching files).

### D-MANIFEST-FMT — RESOLVED-IN-CHARTER
**LEAN:** `references/PhysicsNeMo-PINN/MANIFEST.toml` (cloth/lenia/NCA precedent; §6.7 "manifest.yaml"
= §0.3 SHIFT); validates against `tools/testkit/schemas/reference-manifest-v1.json`.

### D-NAMING / D-CAPTURE-DESC — RESOLVED-IN-CHARTER
`pinn-poisson` is canonical (spec D.1 `:2441`; §3.4/§5.12 consistent). **No `pinn-poisson` row exists
in Appendix D.2.3** (capture-descriptor table) → **propose** `poisson-sine-source-64sq-seed42-step1`
(the inhomogeneous-MMS canonical instance — the trained PINN field evaluated on a 64×64 grid; a steady
BVP has no time axis, so `step1` denotes the single captured evaluation; document the steady-state
note). Add the row to D.2.3 **at Stage-2 landing** (additive — D.2.3 permits "any phase landing audit
may extend this table for sims it shipped"). Operator confirms the descriptor at landing.

### D-TAG — RESOLVED-IN-CHARTER
**NO** tag (per dispatch; phase-close-only cadence — rigid-body/cloth/ising/NCA precedent).

## 7. Thirteen-gate acceptance map (spec §3.5 / D.6 v2.4)

This is a **sim**, not a testkit surface → **no new mutation target** (D-MUTATION defers the FD
reference to task-9). There is **NO gate-14** (single-stack; pinn-poisson absent from Phase 1/2; no
cross-stack pair, no render-similarity).

| Gate | spec §3.5 | pinn-poisson specialization |
|---|---|---|
| 1 | spec sheet + §6 posture | spec-ref §6: golden vs analytic + classical-FD comparison + convergence-with-collocation + determinism (training non-det/EFECT, inference bit-exact) |
| 2 | pre-impl probe report | `tools/testkit/probes/reports/pinn-poisson.md` |
| 3 | failing acceptance suite + output sha256 footer | `failing-tests-evidence/pinn-poisson-<UTC>.txt`; F-RB-1 hook exclusion; gate-13 replays |
| 4 | golden tests (Cat 3), ≥3 independent anchors | analytic + FD golden tables; **Anchors 1 (Evans §2.2), 2 (Strauss §6.2), 3 (MMS f≠0)** per table |
| 5 | Tier-1 diagnostics | residual / boundedness diagnostics |
| 6 | category Tier-2 diagnostics | learned-dynamics Tier-2 as applicable |
| 7 | citation chain (Cat 1) | Raissi 2019 + Apache-2.0 physicsnemo-sym vendor (read-only) |
| 8 | public API (Cat 2) | `pinn-poisson` training/inference CLI + checkpoint API; `references/` excluded |
| 9 | ships a replayable capture | inference capture `.h5` (torch→wp Capture bridge) |
| 10 | determinism decl ↔ capture | two registry rows ↔ capture sidecar `claimed` |
| 11 | PBT of declared invariants (§2.14) | `boundary_residual_bounded` + `pde_residual_bounded` (envelope-scoped; impl `tools/testkit/property/sims/pinn-poisson/`) |
| 12 | first-landing wall-clock in perf-ledger | perf row + **`training_wall_clock` separately** (do NOT silently omit — S2-RD2C1) |
| 13 | landing replays failing tests; hash matches | gate-3 hash re-witnessed at Stage 2 (worktree, Convention E) |
| mutation | — | **deferred** (D-MUTATION; FD reference → task-9) |
| 14 | — | **N/A** (single-stack; no cross-stack / render-similarity) |

## 8. Convention operationalization

- **§Q (LFS)** — Stage-0 first action after the anchor probe = `source tools/lfs/setup-lfs-s3-local.sh`;
  non-zero → STOP-LFS-PUSH (surface; rotate token before commit work). Objects: `phase-3-pinn-poisson.h5`,
  the inference canonical capture, the trained checkpoint. The bootstrap MUST be in the **SAME shell
  command** as each `git lfs push` (fresh shells don't inherit the creds env — ising root-cause). GitHub
  push = `git -c lfs.standalonetransferagent= push`; R2 = `source … && git lfs push --object-id --stdin origin`.
  `.gitattributes` LFS rule for the checkpoint (neural-ca `checkpoints/**` precedent).
- **§R (integrity two-field)** — every audit carries `integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"`
  (stable; STOP-D only on a HARD_FAIL or SOFT_WARN count ≠ 14) + `integrity_digest_at_head:` (measured
  sha256 of the FULL `integrity --all --mode strict` **stderr** report; never copied — it drifts as golden
  tables are added, [[integrity-baseline-digest-method]]). At HEAD `5cddb6c`: `b7460150…`.
- **§S (tolerance schema)** — §S.2 read `tolerance-schema.json` + one existing `golden_tolerance` entry
  BEFORE appending; §S.3 shape 3 (single-stack golden-table sim) = `[golden_tolerance.learned-dynamics.pinn-poisson]`.
  STOP-SCHEMA-FIT if a value doesn't fit (it does — schema pre-bakes `analytical_l2`/`fd_l2`).
- **§S.5 (post-push CI sweep)** — within ~2 min of each push, `gh run list --commit "$(git rev-parse HEAD)" --limit 30`;
  any push-to-main workflow failure → STOP-CI-RED (check the FULL set, not just the touched workflow).
- **§S6 (real sha256)** — every `evidence_hashes` is a measured sha256 or the `at-head` sentinel
  `verify_evidence` resolves; never fabricated, never `: self` (verify_evidence rejects it). `evidence_hashes`
  is a YAML **mapping**, not a list.
- **§H (vendoring)** — Stage 0 verify the `MANIFEST.toml` `[upstream].sha` == the re-verified physicsnemo-sym
  release SHA, `[scope].used_by_sims` has `pinn-poisson`, `[scope].used_by_checks` references the Cat-3 check,
  tree exists; SHA/tree drift → BLOCK.
- **Convention #8 / #12 / E** — cite-at-assertion; two-commit SHA back-fill at each stage close (never
  `--amend`); gate-13 via `git worktree` (NOT partial checkout).
- **cat4 hook** — every `path:line` in audits needs the **full repo-relative path** (e.g.
  `tools/testkit/code_verification/classical-references/poisson-2d-fd/solver.py:NN`, NOT a bare filename;
  NOT a workflow-job name); eof-fixer mutates capture `.json` sidecars (recompute sha256 post-hook).

## 9. Execution-session agent prompts

### Stage 0 (anchor + interop + vendor + corrigenda)
> Execute Stage 0 of sub-phase-phase-3-pinn-poisson per the charter. Preflight phase 3 (exit 0).
> FIRST action after the anchor probe: `source tools/lfs/setup-lfs-s3-local.sh` (STOP-LFS-PUSH on
> non-zero). Cross-phase replay `v0.2.0-phase-2` (ok=True; LFS-cache recovery if smudge fails).
> Re-probe the Warp↔PyTorch interop on the installed versions (BLOCK on a genuine break). Web-re-verify
> the physicsnemo-sym latest-stable SHA + license + pick the closest 2D-elliptic-Dirichlet PINN example;
> vendor `references/PhysicsNeMo-PINN/` READ-ONLY + author `MANIFEST.toml`. File corrigendum A-6 (spec D.3
> PINN-tutorial-home + stale pin) to `docs/spec-amendments-proposed.md`. Confirm operator ratifications of
> D-ANCHOR-SET / D-DET / D-VENDOR-* / D-MUTATION. Audit + #12 back-fill. Push; report.

### Stage 1a → 1c (scaffold/RED → FD ref → PINN → verification)
> Execute Stages 1a–1c per the charter §2. 1a: scaffold `packages/pinn-poisson/` + failing TDD
> (convergence + inference-vs-analytic Anchors 1/2/3 + inference-vs-FD + convergence-with-collocation);
> failing-tests-evidence + sha256 footer (F-RB-1); two determinism rows + the golden_tolerance row (§S.2).
> 1b-FD: pure-NumPy `poisson-2d-fd` solver + README + analytic golden tables (≥3 anchors/table) +
> derivation; FD verified vs analytic. 1b-PINN: reimplement Raissi-2019 PINN (cite-don't-import; physicsnemo-sym
> cross-check); train + checkpoint (LFS); MEASURE determinism + derive EFECT (STOP-EFECT if underivable);
> inference capture via torch→wp bridge; PBT invariants. 1c: wire the three verification gates green; Tier-3;
> perf row (+ training_wall_clock); schema-corpus fixture (§Q same-shell push); gate-13 worktree replay.
> Apply F-RB-3 (`# mypy: ignore-errors` on Warp files). Per-stage audits + #12 back-fills; §S.5 CI sweep; push.

### Stage 2 (landing)
> Execute Stage 2 landing per the charter. §R two-field integrity; replay; append-only; verify_evidence
> no-regression across prior Phase-3 audits; §S.5 full CI green. Close `closed-with-shifted-N` (USD-defer +
> measured SHIFTs). Propose the Appendix D.2.3 capture-descriptor row for the operator. progress.md final
> entry; #12 SHA back-fill; NO tag. Report; confirm task-7 TERMINAL (task-9 soft consumer).

## 10. Audit / report paths

| Artifact | Path |
|---|---|
| Charter | `docs/phases/sub-phase-phase-3-pinn-poisson.md` (this file) |
| Probe report | `tools/testkit/probes/reports/pinn-poisson.md` |
| Plan-drafting landing audit | `docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-plan-drafting-2026-05-29T12-24-25Z.md` |
| Stage audits | `docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-{0,1a,1b-fd,1b-pinn,1c}-<UTC>.md` |
| Final report | `docs/_audits/phase-3/task-7-pinn-poisson.md` |
| progress | `docs/_audits/phase-3/progress.md` (append-only) |
| Corrigenda | `docs/spec-amendments-proposed.md` (A-6+ APPEND; do NOT recreate A-1..A-5) |

Front-matter: `evidence_hashes` is a YAML **mapping** (real sha256 or `at-head`); §R two fields present.

## 11. Closing criteria & operator-ratification items

**Verdict: CONFIRMED-SHIFTED (plan-drafting).** Charter + probe complete; Warp↔PyTorch interop probed
WORKS (no BLOCK); all citations web-verified.

**Operator-ratification items (before Stage 0):**
1. **D-ANCHOR-SET** — anchor set = {1 harmonic (Evans §2.2), 2 harmonic (Strauss **§6.2**, SHIFT), **3
   inhomogeneous MMS `f≠0`** (REQUIRED)}; FD = numerical baseline anchored to analytic, not independent.
2. **D-DET** — two rows, measure-then-declare; CPU-only env (NCA CPU-bit-identical may transfer — measure,
   don't assume); EFECT derived at 1b, STOP-EFECT contingency; EFECT NOT the acceptance gate.
3. **D-VENDOR-SHA/ROLE** — vendor **physicsnemo-sym v2.4.0** (NOT the §2.18-pinned core repo) read-only;
   file **A-6**; §2.18 plan-registry correction deferred to operator.
4. **D-MUTATION** — defer the FD-reference mutation target to task-9 (rule-of-three); document.
5. **D-WARP-TORCH-INTEROP** — report-only (works); Stage 0 re-probes, BLOCKs only on genuine break.

**Resolved-in-charter:** D-USD (DEFER, task-4 policy, closed-with-shifted), D-TOL (golden_tolerance branch
pre-baked — no amendment), D-LAYOUT (`packages/pinn-poisson/`), D-CI (python-strict.yml), D-MANIFEST-FMT
(MANIFEST.toml), D-NAMING/D-CAPTURE-DESC (`poisson-sine-source-64sq-seed42-step1`, add to D.2.3 at landing),
D-TAG (NO).

**Staged corrigendum:** A-6 (spec D.3 PhysicsNeMo row: PINN-tutorial home = physicsnemo-sym; `<latest 1.x>`
pin stale; read-only-vendor role does not bind the §2702 runtime-link rule) — filed at Stage 0 after web-re-verify.

**SHIFTs (plan §6.7; documented, no plan edit per §0.3):** layout, CI workflow, manifest format, Strauss cite
§6.1→§6.2.

**task-7 is TERMINAL on produce** (plan §3.1 `:329`); task-9 is a soft/informational common-warp consumer.
No tag. Stage 0 dispatch is READY once the operator ratifies items 1–5.

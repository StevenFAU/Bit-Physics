---
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-0
stage: stage-0-checkpoint
phase: phase-2
head_sha: 1333384a9c5761a589b3d220e18171295a151477
head_sha_at_checkpoint: bc33ef11dfdca06e37cf89985cd2f3e5ea114239
date: 2026-05-25T00-59-10Z
verdict: stage-0-CONFIRMED
evidence_paths:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-evidence-warp-p2g-determinism-2026-05-25T00-59-10Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-replay-2026-05-25T00-59-10Z.txt
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-integrity-sweep-2026-05-25T00-59-10Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-replay-2026-05-25T00-59-10Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-integrity-sweep-2026-05-25T00-59-10Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
---

# Stage 0 pre-flight checkpoint — sub-phase-mpm-multimaterial-stack-e

> SIXTH per-sim cross-stack port; FIRST Stack-E port. Stage 0 (pre-flight)
> CLOSE. VERDICT stage-0-CONFIRMED. Empirical-verification stage: NO source
> created (`packages/mpm-multimaterial-stack-e/` is Stage 1a's job). Confirms the
> plan-drafting believed-state at HEAD `bc33ef1`: bit-identity replay HELD (41st);
> integrity baseline-MATCH (10th sub-phase position); `[overrides.mpm-multimaterial]`
> present (D7 reuse); canonical capture present + LFS; common-warp socket-only
> consumption surface verified; **Warp CPU P2G atomic-scatter determinism 6/6
> bit-identical (`a8f6e654…07ff1fe1`; D5 N/A confirmed empirically on the
> MPM-specific kernel).** 1 shift (S0-ME1, O-W7 extension). Cumulative 181 → 182.

## § 1. Scope

Stage 0 of `sub-phase-mpm-multimaterial-stack-e`. Pre-flight verification only:
re-anchor at HEAD, confirm the plan-drafting D1–D16 premises against HEAD,
empirically re-verify the MPM-specific Warp CPU P2G atomic-scatter determinism
(D5/banked #8), and document the Stage-1a consumption surface + 1a/1b/1c scope.
**No source modification** (Convention A; SECTION 6 boundary): no
`packages/mpm-multimaterial-stack-e/`, no `pyproject.toml` / `tolerance.toml` /
`warp.md` / methodology / sim-source edits. The Task 0.6 verification kernel is
ephemeral (reproduced in the evidence artifact; NOT committed to `packages/`).

## § 2. Operator routing consumed (D1–D16)

All sixteen RATIFIED per the Stage-0 dispatch SECTION 1. Load-bearing for this
stage: **D5** (cpu serial; N/A knob — Task 0.6), **D6** (capture present + LFS —
§ 6), **D7** (override reuse — § 5), **D10/D15** (socket-only / own f64 arrays —
§ 7), **D8/D4** (#3 present-but-not-exercised; tolerance=0.0 — § 8 / Stage 1a),
**D13** (CI-red banked — § 9). No re-litigation; this stage verifies the premises
hold at HEAD.

## § 3. Task 0.0 — Pre-flight (Convention M + § D.5)

(FACT — `git rev-parse HEAD`; `stage-0-replay-…txt`; `stage-0-integrity-sweep-…txt`.)

- **HEAD == `bc33ef11dfdca06e37cf89985cd2f3e5ea114239`** (plan-drafting close).
  No drift. Working tree clean except untracked `.claude/` + two untracked
  `captures/eulerian-smoke-stack-d/taylor-green-…` files (not load-bearing).
- **Bit-identity replay (§ D.5).** `python -m integrity.scripts.replay_prior_phase
  --prior-phase phase-1 --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`
  → 8/8 gates PASS, `ok=True`; output sha256
  `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` —
  **byte-identical to the replay invariant. HELD (41st invocation).**
- **Integrity sweep baseline-match.** `python -m integrity --all --mode strict`
  → `0 HARD_FAIL, 14 SOFT_WARN`, findings sha256
  `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` —
  **baseline-MATCH (streak HELD, 10th sub-phase position; FIRST after the
  FIRST-Stack-E common-warp bootstrap).** The 14 SOFT_WARN are the carried
  phase-0/1 cosmetic items (unchanged set).

**Hard Rule 2 (HEAD-drift / invariant-drift) NOT triggered.**

## § 4. Task 0.1 — Re-anchor against HEAD

(FACT — `pyproject.toml` `[tool.uv.workspace].members`; `git ls-files`.)

- **Workspace members: 20** (3 tools + 10 Phase-1 sims + `common-py` + 5 Stack-D
  ports + `common-warp`). MPM Stack-E is NOT yet registered (Stage 1a adds the
  21st member).
- `common/common-warp/` present (§ 1.9.1 socket); `packages/mpm-multimaterial-stack-d/`
  present (closest template); `packages/mpm-multimaterial/` Phase-1 reference
  present (sealed). All HEAD-verified.
- Doc anchors unchanged: conventions `49c90fc2…0dbe0d74`; methodology
  `61350ee4…6d1da87`; architecture `e82b7b8e…9292d267`.

## § 5. Task 0.2 — Tolerance reuse verification (D7 + S-ME2)

(FACT — `tools/testkit/equivalence/tolerance.toml` +
`tools/testkit/equivalence/tolerance-budget.toml` at HEAD.)

- **`[overrides.mpm-multimaterial]` PRESENT** with `category = "mpm"` (only
  `category`; `relative`/`absolute` fall back to `[defaults.mpm]` =
  `relative = 1e-4, absolute = 0.0`). Established by Stack-D Stage 1c.
- **`[budgets.mpm.cross_stack]`** = `relative = 1e-4, absolute = 0.0` (at-budget;
  no widening). The `tolerance-budget.toml` header `phase` field reads
  `sub-phase-mpm-multimaterial-stack-d` (carried; not edited this stage).
- **D7 REUSE premise CONFIRMED.** `compare_captures` resolves the category from
  the LEFT/reference manifest's `sim.name` (`"mpm-multimaterial"`; verified at
  plan-drafting `tools/testkit/equivalence/harness.py:118`); the Stack-E capture
  sets the same `sim.name` → the existing override resolves it. **Stage 1c
  override edit is a no-op** — MPM Stack-E is the FIRST per-sim cross-stack port
  to skip the Stage-1c `[overrides.<sim>]` add (all 5 prior ports each added a
  new row). **No `tolerance.toml` / `tolerance-budget.toml` edit this stage**
  (SECTION 6 boundary).

## § 6. Task 0.3 — Canonical-descriptor scope-analysis (§ N graduated discipline)

(FACT — `git ls-files` + `git show HEAD:…json` + LFS pointer at HEAD.)

- **Canonical descriptor:** `drop-impact-128cube-seed42-step500` (128³ grid;
  1,000,000 particles; 500 steps; cadence-50 → 11 frames). **Diagnostic-tier
  descriptor:** `drop-impact-16cube-seed42-step50` (16³; 5,000 particles; 50
  steps; cadence-10).
- **gate-14 LEFT-partner capture (PRESENT + LFS-tracked):**
  `captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` — `.h5` is an
  LFS pointer (`oid sha256:73e00d09…b5ebae`, `size 1125718712` ≈ **1.05 GiB**);
  manifest `sim = {name: mpm-multimaterial, category: hybrid-pg, variant:
  mls-mpm-hu-2018-multimaterial}`, `run.step_count=500`, `capture_interval=50`.
  **NOTE (reconfirms S-ME3):** the capture path is `captures/mpm-ref/` (the
  `-ref` suffix convention), NOT `captures/mpm-multimaterial-ref/` (the Stage-0
  dispatch reading-item-8 / Hard-Rule-2 / Task-0.3 name). `captures/mpm-multimaterial-ref/`
  does not exist; the captures ARE present at `captures/mpm-ref/`. Not a block —
  a believed-state path-name correction already banked at plan-drafting.
- **Stack-agnostic per § 1.9.3.** Stack-D already consumed this descriptor;
  Stack-E inherits the identical descriptor and produces its RIGHT-partner at
  `captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.{h5,json}`
  (Stage 1b).
- **Scope (§ N).** Stage 1b regenerates the canonical via Warp-CPU at 1M
  particles × 128³ × 500 steps. Reference wall-clock anchors: numba reference
  158.052 s; Stack-D Taichi (serialised posture) 360.773 s (Stack-D landing).
  Warp-CPU is single-threaded-serial (Task 0.6) + JIT-compiled; a conservative
  Stage-0 estimate sits in the §-N production-correction band [0.5×, 3×] of the
  Taichi anchor — re-measured at Stage 1b. Storage at cadence-50 ≈ 1.05 GiB
  (Stack-D witness) fits the W1 ceiling (2 GB). Schema-corpus entry routes a
  representative-subset ≤ ~256 MiB (methodology § 5.4; Stack-D landed a
  first-2-frames 195 MiB subset — Stack-E mirrors).

## § 7. Task 0.4 + 0.5 — CANONICAL_* constants + common-warp consumption (Stage 1a input)

### Task 0.4 — CANONICAL_* constants (Stage 1b re-derives verbatim; isolation, no Phase-1 import)

(FACT — `packages/mpm-multimaterial/mpm_multimaterial/reference/__init__.py` at
HEAD.) All f64 (R-MPME-F64 / D15):

| Constant | Value |
|---|---|
| `CANONICAL_DESCRIPTOR` | `drop-impact-128cube-seed42-step500` |
| `CANONICAL_GRID_N` | 128 |
| `CANONICAL_N_PARTICLES` | 1_000_000 |
| `CANONICAL_N_STEPS` | 500 |
| `CANONICAL_CAPTURE_INTERVAL` | 50 |
| `CANONICAL_DT` | 1.0e-4 |
| `CANONICAL_GRAVITY_Z` | −9.81 |
| `CANONICAL_YOUNGS_MODULUS` | 4.0e3 |
| `CANONICAL_POISSON_RATIO` | 0.3 |
| `CANONICAL_MU` | E/(2(1+ν)) |
| `CANONICAL_LAMBDA` | Eν/((1+ν)(1−2ν)) |
| `CANONICAL_BLOB_CENTER` | (0.5, 0.5, 0.65) |
| `CANONICAL_BLOB_RADIUS` | 0.15 |
| `CANONICAL_BLOB_VELOCITY_Z` | −2.0 |
| `CANONICAL_FLOOR_Z_INDEX` | 4 |
| diagnostic | `GRID_N=16, N_PARTICLES=5000, N_STEPS=50, CAPTURE_INTERVAL=10` |

Per the prior-ports isolation pattern: Stage 1b re-derives these as a Stack-E
module-local constant set (no `import mpm_multimaterial`). Single-material
neo-Hookean (`material_id` all-0); MLS-MPM Hu 2018 + APIC.

### Task 0.5 — common-warp consumption pattern (D10 SOCKET-ONLY; Stage 1a import surface)

(FACT — `common_warp.__init__` re-exports + signatures resolved at HEAD via
`inspect.signature`.) Stage 1a imports exactly:

```python
from common_warp import init, Capture, write_capture, read_capture
from common_warp.warp_harness import (
    set_warp_deterministic,
    deterministic_context,
    assert_deterministic_run,
)
```

Verified verbatim at HEAD:
- `init(device: str | None = None, deterministic: bool = False) -> str`
- `Capture` (dataclass); `write_capture(capture: Capture, path, *, schema_version='1.0.0') -> None` (f64-preserving — `np.asarray`, no downcast; D15); `read_capture(path) -> Capture`
- `set_warp_deterministic(seed: int, device: str = 'cpu') -> int`
- `deterministic_context() -> Iterator[int]` (no-arg)
- `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0) -> str`

**NOT consumed (D10):** `Particles` / `allocate_particles` (f32-pinned `wp.vec3`/
`wp.float32`), `ScalarField3D` / `VectorField3D` / `allocate_*_field` (f32-pinned),
`HashGrid` (MPM uses a fixed 27-cell stencil, no neighbor-search). The port
declares its OWN f64 storage: `wp.array(dtype=wp.float64)` for particle
`pos`/`vel`/`mass`/`affine_C`/`F`/`stress`/`volume` + grid `grid_mass`
(ndim=3 f64) / `grid_mom` (ndim=4 f64) — per warp.md § 6 LBM-precedent of
stack-specific arrays (D15).

## § 8. Task 0.6 — Warp CPU P2G atomic-scatter determinism (empirical; D5 + banked #8)

(FACT — ephemeral verification kernel; full source + raw output in
`stage-0-evidence-warp-p2g-determinism-2026-05-25T00-59-10Z.md`.)

A minimal MLS-MPM P2G kernel scatters per-particle mass + momentum into shared
grid nodes over a 27-cell quadratic-B-spline stencil via `wp.atomic_add`, all f64,
consuming the common-warp socket (`set_warp_deterministic(42,"cpu")` +
`deterministic_context()`). 5000 particles clustered near grid centre drive
genuine atomic contention on shared nodes.

- **6 runs (3 pairs), identical seed+inputs, `device="cpu"`: all 6 sha256
  identical → `a8f6e6546d984a704fb6a138eba7fdc83a68008297f2ac2c743e151607ff1fe1`.**
- **VERDICT: DETERMINISTIC (6/6 bit-identical).** D5 N/A premise CONFIRMED
  empirically on the MPM-specific atomic-scatter surface — Warp CPU `wp.launch`
  is structurally single-threaded serial, so `wp.atomic_add` accumulation order
  is fixed → bit-exact. **No `cpu_max_num_threads=1` equivalent needed**
  (banked #8 Warp analog verified). **Hard Rule 2 (Task 0.6e) NOT triggered.**
- **Correctness witness (partition-of-unity):** `sum(grid_mass) = 1.0` vs
  `sum(particle_mass) = 1.0000000000000002` (abs_err 2.22e-16, 1 ULP).
- This digest is the **Stage 1a R-A1 re-verification anchor** (the Stage-1a P2G
  kernel re-witnesses 6/6 determinism; the exact digest depends on the final IC).

## § 9. Task 0.8 — D13 CI-red banked acknowledgment

(FACT — D13 RATIFIED.) The remote-CI red state from the LFS-bandwidth-quota
condition is ongoing and known-banked. **No action at Stage 0.** Local
verification is unaffected: Task 0.0 replay + integrity both ran clean locally;
the canonical capture LFS pointer is present. The sub-phase lands LOCAL-ONLY (the
established posture of the prior 6 sub-phases).

## § 10. Task 0.7 — Stage 1a/1b/1c scope-analysis (Stage-1a-dispatch input)

(D2 RATIFIED shape: Stage 1a + 1b + 1c + Stage 2.) Per-sub-stage touch set:

- **Stage 1a (failing-tests + scaffold; gates 4–13 surface).**
  - NEW `packages/mpm-multimaterial-stack-e/` (pkg `mpm_multimaterial_stack_e/`
    + `pyproject.toml` + `tests/`). `pyproject` mirrors **common-warp's**
    filterwarnings posture (NO bare-form filter; Warp emits no Python Warning —
    § 8 / S0-1 N/A), deps `bit-physics-common-warp` + `warp-lang>=1.13,<2.0` +
    `h5py` + `hypothesis` + `numpy>=2.0`; `[[tool.mypy.overrides]]
    ignore_missing_imports` for `warp` + testkit modules.
  - Register the **21st workspace member** in root `pyproject.toml` (member
    count delta verified at Stage 1a, not Stage 0).
  - Warp `@wp.kernel` MLS-MPM reference at `mpm_multimaterial_stack_e/reference/`
    (Warp-naming, e.g. `mls_mpm_warp.py`; verify the prior-ports `reference/`
    naming at Stage 1a): `bspline_weights`, neo-Hookean `stress`, `p2g_scatter`,
    `grid_update`, `g2p`/APIC, `deformation_update`, `advect`. Own f64
    `wp.array`s; the O-W7 base-node + `wp.vec3d`-weight pattern (§ 11).
  - `sim.py` (`sim_runner_seeded` + `sim_runner_diagnostic`) consuming the
    socket per § 7; `invariants.py`; `tests/` for gates 4–13; gate-13 failing-
    tests replay anchor.
- **Stage 1b (implementation GREEN; per-port specifics).** Gates 4–13 GREEN
  (gate-4 GOLDEN-only quadratic-B-spline; NO MMS); ONE canonical capture via
  common-warp `write_capture` (f64); perf-ledger row (warp-cpu); gate-13 replay.
  Determinism docstring declares the Warp serial-launch posture + `wp.float64`
  seeds. **NOTE:** D7 override edit is a **no-op** (override already exists);
  the §5.1 third-instance methodology note is a **Stage 2** amendment per D8
  (not Stage 1b), and the warp.md §6 correction is **Stage 2** per D16 — neither
  is touched before Stage 2 (SECTION 6 boundary).
- **Stage 1c (gate-14 cross-stack equivalence + landing-prep).**
  `compare_captures(LEFT=captures/mpm-ref/…, RIGHT=captures/mpm-multimaterial-stack-e/…)`
  at `relative=1e-4`; per-field per-frame witness + step-horizon in
  `equivalence.md` (additive); schema-corpus representative-subset; un-skip
  gate-14 test. Override edit **no-op** (D7). `within_tolerance=True` expected at
  FP-round-off (BOUNDED canonical; cf. Stack-D ~24-order margin).
- **Stage 2 (landing).** 21-root regression sweep (per-package pytest-config; no
  blanket `-W error` — N1); integrity sweep; bit-identity replay; evidence-path
  verify; methodology §5.1 third-instance additive note (D8); warp.md §6
  correction (D16); CHANGELOG; banked roll-up.

## § 11. Banked items / observations

- **S0-ME1 (shift) — O-W7 extension (Warp 1.13.0 `wp.float64()` taint).**
  Applying `wp.float64(v)` to a kernel-local variable `v` taints `v`'s inferred
  type to float64 (reproduced minimally: `rx = fx - wp.float64(bx)` makes the
  later `bx + di` a forbidden `int32 + float64`). Discipline for Stage 1b
  `@wp.kernel` bodies: derive the integer base node via `wp.int32(<float_base>)`
  (float base not reused as int) and pack B-spline weights into a `wp.vec3d`
  indexed by the pure-int loop variable. Documented in the evidence artifact § 7;
  Stage-1b carry-forward (NOT an O-W7 methodology-doc amendment at this stage).
- **Methodology § 5.1 PRESENT-but-NOT-EXERCISED — THIRD portfolio instance.**
  After MPM Stack-D (atomic-scatter) + smoke (vorticity confinement), MPM
  Stack-E's atomic-scatter is the third instance (D8). The Stage-2 additive note
  (§5.1 is stack-portable; re-confirmed on Warp CPU) is the candidate amendment.
- **S0-1 filterwarnings N/A for Warp.** No bare-form filter needed (§ 8); the
  Stack-E `pyproject` inherits common-warp's posture, not the Taichi Stack-D
  ports' bare-form discipline.
- **Banked roll-up (D11):** no surprise items. LFS-architecture (D13),
  mypy-warp-stub, N1 per-package pytest-config all STAY-BANKED.

## § 12. Stage 1a readiness verdict

**READY.** All preflight premises hold at HEAD: HEAD stable; invariants HELD;
override present (reuse); canonical capture present + LFS; socket-only consumption
surface verified; Warp CPU P2G atomic-scatter determinism 6/6 bit-identical. No
blocking dependencies. No items require operator attention beyond the ratified
D1–D16. Stage 1a is dispatchable (scaffold + 21st member + Warp `@wp.kernel`
MLS-MPM + gates 4–13).

## § 13. Verdict

**stage-0-CONFIRMED.** 1 shift (S0-ME1 O-W7 extension); cumulative **181 → 182**.
Bit-identity replay HELD (41st); integrity baseline-MATCH (10th). D5 N/A confirmed
empirically (`a8f6e654…07ff1fe1`). NOT implementation:
`packages/mpm-multimaterial-stack-e/` NOT created. No `-phase-N` tag (D12).
Local-only (D13). Operator routes Stage 1a separately.

---

*End of Stage 0 pre-flight checkpoint. `head_sha` back-filled in COMMIT 2
(Convention #12; separate commit; never `--amend`; N1 enumeration).*

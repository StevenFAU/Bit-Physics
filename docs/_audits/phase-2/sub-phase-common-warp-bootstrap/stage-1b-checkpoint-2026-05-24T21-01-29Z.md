---
date: 2026-05-24T21-01-29Z
author: common-warp-bootstrap-stage-1b-agent
phase: 2
artifact: stage
artifact_id: sub-phase-common-warp-bootstrap-stage-1b
stage: stage-1b-checkpoint
subject: "Stage 1b (Capture + Particles + Grids + HashGrid; W-1 + W-5 mechanism) CLOSE for sub-phase-common-warp-bootstrap. VERDICT CONFIRMED. §1.9.1 Subsystems 2 (Capture I/O), 4 (Particles), 5 (Grids), 6 (HashGrid) landed under common/common-warp/src/common_warp/. Capture delegates HDF5 to the testkit capture module -> compare_captures-readable (W-5 format-interop mechanism GREEN against a synthetic pair; full W-5 gate at 1c). HashGrid wraps native wp.HashGrid with a kernel-based query_radius. Verification: common-warp 26 tests pass -W error (5 capture + 2 particles + 4 grids + 4 hashgrid + 11 Stage-1a); cross-package sweep 20 members ZERO regressions; integrity c19492ad...d22cb52 baseline-MATCH (streak HELD, 9 sub-phases); bit-identity replay 9399fc33...718909f34 HELD (37th). 3 shifts (S1b-1 device-default reconciliation; S1b-2 two Warp-API quirks caught+fixed; S1b-3 §1.9.1 socket vs landed Runtime/Determinism signature divergence — surfaced for operator). Cumulative 171 -> 174. No -phase-N tag. Stage 1c (smoke sim + docs + W-3/W-4/W-5/W-6 completion) routed separately."
head_sha: 59368bd7bb4f2994e8ca7d5c0407b61f06677614
head_sha_at_checkpoint: fae33500469d21f614be796da0afba112d3d22ce
parent_audits:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-checkpoint-2026-05-24T20-17-42Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-sha-back-fill-2026-05-24T20-17-42Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1b-replay-2026-05-24T21-01-29Z.txt
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1b-integrity-sweep-2026-05-24T21-01-29Z.txt
  - common/common-warp/src/common_warp/capture/writer.py
  - common/common-warp/src/common_warp/capture/reader.py
  - common/common-warp/src/common_warp/capture/model.py
  - common/common-warp/src/common_warp/particles/particles.py
  - common/common-warp/src/common_warp/grids/grids.py
  - common/common-warp/src/common_warp/hashgrid/hashgrid.py
  - common/common-warp/tests/test_capture.py
  - tools/testkit/equivalence/harness.py
  - docs/phases/phase-2-cross-stack-replication.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1b-replay-2026-05-24T21-01-29Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1b-integrity-sweep-2026-05-24T21-01-29Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
---

# Common-Warp Bootstrap — Stage 1b Checkpoint

> Data-structure stage. §1.9.1 Subsystems 2 (Capture I/O), 4 (Particles), 5
> (Grids), 6 (HashGrid) land under `common/common-warp/src/common_warp/`. The
> W-1 (Capture I/O) + W-5 (format-interop) mechanisms land here; both gates
> FULLY complete at Stage 1c via the Subsystem-7 smoke sim's actual capture.
> The smoke sim, `docs/common/warp.md`, and Runtime/Determinism changes are NOT
> touched here (§ 12 boundary).

## § 1. Scope

(FACT — Stage-1b dispatch SECTION 5 Tasks 1b.0–1b.6; charter § 2 allocation as
reconciled by Stage-0 S0-W1.) Additive-only (Convention A): all Stage-1b files
are new under `common/common-warp/`; no existing surface modified (root
`pyproject.toml`, `docs/dependencies.md`, and Stage-1a's Runtime/Determinism are
untouched). Canonical §1.9.1 numbering is used throughout (Capture = Subsystem 2,
Determinism = Subsystem 3; the dispatch's "Capture Subsystem 3" label is a
loose-numbering artifact, reconciled to the charter § 4 layout).

## § 2. Operator routing consumed (D1–D14 + S0-W1 + S1a inheritance)

D1–D14 ratified; S0-W1 (1a/1b/1c allocation) in force. Inherited Stage-1a
findings honored: import package `common_warp`; harnesses at
`tools/testkit/{taichi,numba}_harness/` (warp_harness stays in-package);
common-py dev-deps mirrored (no pytest-timeout/hypothesis); **S1a-2 GPU
device-string discipline** (zero-indexed CUDA devices named in prose, never the
`word`-colon-`digit` token — honored in all Stage-1b source + this audit; one
occurrence in `_internal/devices.py` was rephrased before commit); O-W6 (Warp
tolerates future-annotations — applied: the HashGrid kernel module nonetheless
omits it, defensive). W-5 contract (Stage-0 Task 0.5) drove the Capture design.

## § 3. Task 1b.0 — Preflight (W-2 baseline re-verification)

HEAD == `869af473f2fea50ffa75d4f34c1d4593e71b03dd` (no drift since Stage-1a
close). **W-2 baseline reproduces**: `test_assert_deterministic_run_matches_
stage0_baseline` GREEN (digest `24d44c7e…0746f314`). Bit-identity replay
`9399fc33…718909f34` HELD (36th invocation). Integrity sweep `c19492ad…d22cb52`
baseline-MATCH. Task 1b.0 verdict: **PASS** (no Hard Rule 2 trigger).

## § 4. Task 1b.1 — Capture subsystem (Subsystem 2); W-1 + W-5 mechanism

(FACT — COMMIT 1 `a8d25d0`; `capture/` subpackage: `model.py` / `writer.py` /
`reader.py` / `__init__.py`.) §1.9.1 surface implemented faithfully: `Capture`
dataclass (`manifest: dict` + `payload: dict[str, np.ndarray]` keyed
`steps/{N}/state|diagnostics/{name}`); `write_capture(capture, path, *,
schema_version="1.0.0") -> None` → `<path>.h5` + `<path>.json`;
`read_capture(path) -> Capture`; plus `read_manifest(path)` (sidecar-only
convenience, not top-level-exported).

- **Delegation = W-5 guarantee.** `write_capture` regroups the flat payload into
  testkit `StepState` rows and calls the Phase-0 testkit `capture.write_capture`
  (canonical HDF5 layout + schema-validated manifest); `read_capture` uses
  `capture.load_capture`. Because `compare_captures` loads via the same
  `load_capture`, common-warp captures are format-interoperable by construction.
  No hand-rolled h5py.
- **Warp → NumPy → h5py marshalling** documented: callers populate
  `Capture.payload` with NumPy arrays (`wp.array.numpy()`); Warp arrays do not
  serialize to HDF5 directly.
- **O-W1** disambiguation in module docstrings (project HDF5 capture, NOT
  `wp.capture_*` CUDA-graph capture).

## § 5. Task 1b.2 — Particles subsystem (Subsystem 4)

(FACT — COMMIT 2 `fae3350`; `particles/particles.py`.) §1.9.1 `Particles`
dataclass (positions/velocities as `wp.array(dtype=wp.vec3)`, masses as
`wp.array(dtype=wp.float32)`), `count`, `to_capture_payload` / `from_capture_
payload`, `allocate_particles(n, device=None)`. MPM-specific extensions
deliberately excluded per §1.9.1 (they live in the MPM sim's wrapper).

## § 6. Task 1b.3 — Grids subsystem (Subsystem 5)

(FACT — `grids/grids.py`.) §1.9.1 `ScalarField3D` (`wp.array` float32 ndim-3) +
`VectorField3D` (`wp.array` vec3 ndim-3), each with `spacing`/`origin`, `shape`,
`to_capture_payload` / `from_capture_payload`; `allocate_scalar_field` /
`allocate_vector_field`. Collocated cell-centered (smoke-Stack-D S-S3
convention). The scalar `from_capture_payload` requires an explicit
`dtype=wp.float32` on `wp.from_numpy` (§ 10 S1b-2).

## § 7. Task 1b.4 — HashGrid subsystem (Subsystem 6)

(FACT — `hashgrid/hashgrid.py`.) §1.9.1 `HashGrid(cell_size, max_particles,
device=None)` thin wrapper over native `wp.HashGrid` (table dims derived from
`max_particles`; `cell_size` passed to `wp.HashGrid.build` as the cell radius).
`query_radius(point, radius) -> wp.array(int32)` runs a kernel using the
kernel-only builtins `wp.hash_grid_query` / `wp.hash_grid_query_next` to gather
neighbor indices (verified correct on CPU: a 4-point line returns the expected
3 in-radius neighbors). Kernel module omits future-annotations (defensive).

## § 8. Task 1b.5 — Test verification (per-subsystem)

(FACT — `pytest -W error` GREEN.) **26 tests pass** (15 new + 11 Stage-1a):

| Test file | Count | Coverage |
|---|---|---|
| `test_capture.py` | 5 | write→files, read round-trip, schema-v1 compliance, Warp-array marshalling, **W-5 `compare_captures` handshake** (verdict with no sim/step/shape HARD_FAIL) |
| `test_particles.py` | 2 | allocate zeroed; capture-payload round-trip |
| `test_grids.py` | 4 | scalar/vector allocate shapes + capture-payload round-trips |
| `test_hashgrid.py` | 4 | query-before-build raises; neighbor-query correctness; far-query empty; **W-2-mechanism determinism over the query** (`assert_deterministic_run`, n_runs=3) |
| `test_*` (Stage 1a) | 11 | runtime + warp_harness (incl. 24d44c7e baseline) — unchanged |

## § 9. Task 1b.6 — Local verification sweep

- **Pre-emptive ruff** (banked #9): `ruff check --fix` + `ruff format` BEFORE
  commit; final `ruff check common/common-warp/` → **All checks passed** (one
  `UP018`/`RUF046` pair suppressed on the kernel's mutable-int idiom — § 10 S1b-2).
- **common-warp pytest** `-W error`: **26 passed**.
- **Cross-package regression sweep (20 roots, cold `.pyc`)**: **ZERO
  REGRESSIONS** (testkit 58 / integrity 56 / diagnostics 22 / 10 Phase-1 sims +
  5 Stack-D ports + common-py 25; eulerian-smoke-stack-d 15 passed / 1 skipped;
  **common-warp 26**).
- **Integrity sweep** `--all --mode strict`: **`c19492ad…d22cb52` baseline-MATCH**
  (0 HARD_FAIL, 14 SOFT_WARN; streak HELD into the 9th sub-phase). No Cat-1
  false-citation (the S1a-2 GPU-device-token discipline was applied pre-commit).
- **Bit-identity replay**: `9399fc33…718909f34` **HELD (37th invocation)**.

## § 10. W-1 mechanism + W-5 format-interop verification summary

- **W-1 (Capture I/O) mechanism**: `write_capture`/`read_capture` round-trip
  Warp-array-sourced NumPy payloads through the canonical capture-v1 HDF5 + JSON
  format; schema compliance verified (`test_capture_schema_v1_compliance`). Full
  W-1 gate completes at 1c when the smoke sim writes its actual capture.
- **W-5 (format-interop) mechanism — GREEN at the synthetic level.** A common-warp
  capture pair (same `sim.{name,category}` = `hello-warp-smoke`/`smoke`, same
  step-set/shape/dtype) feeds `compare_captures` and yields a verdict
  (`within_tolerance=True` for identical captures) with **no** HARD_FAIL marker
  (`sim:category-mismatch` / `step:set-mismatch` / `…:shape-mismatch` / `…:missing`)
  and no dtype `TypeError`. Full W-5 gate completes at 1c against an existing
  common-py/cpp smoke partner (D8 format-interop disposition).

**Shifts this stage (3):**

- **S1b-1 — device-default reconciliation.** §1.9.1's `allocate_*` /
  `from_capture_payload` / `HashGrid` signatures nominally default to the
  zero-indexed CUDA device. Stage 1b uses `device: str | None = None`, resolving
  `None` → the **current** runtime device (CPU by default; `_internal/devices.py
  :resolve_device`) WITHOUT resetting it — the consistent application of the
  D4/R-W3 CPU reconciliation already established for Runtime at Stage 1a. An
  explicit device string is honored verbatim (GPU ports pass one).
- **S1b-2 — two Warp-API implementation quirks (caught at Task 1b.6, fixed
  inline; routine drift).** (a) The HashGrid kernel needs a **mutable** int local
  for `wp.hash_grid_query_next(query, int& index)`; the Warp idiom `nbr = int(0)`
  declares it mutable, but ruff `UP018`/`RUF046` "simplify" it to a `0` literal,
  which Warp const-folds → the generated C++ fails to bind the non-const
  reference (compile error). Fixed: restored `int(0)` + `# noqa: UP018, RUF046`.
  (b) `wp.from_numpy` on a **3-D scalar** array mis-infers the shape (collapses to
  `(Nx,)`) unless given an explicit `dtype=wp.float32`; the vector field was
  unaffected (it passes `dtype=wp.vec3`). Both are recorded as **observation O-W7**
  (Warp kernel-local + from_numpy dtype discipline) for the Stage-1c smoke kernels.
- **S1b-3 — §1.9.1 socket vs landed Runtime/Determinism SIGNATURE divergence
  (SURFACED FOR OPERATOR; out of Stage-1b scope to fix per § 12 boundary).** The
  §1.9.1 socket (the contract the Stack-E ports import) specifies `init(device,
  deterministic) -> None`, a **no-arg** `deterministic_context()`, and
  `assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0)` (compares
  captures). Stage 1a landed (operator-routed) `init(device=None) -> str`,
  `deterministic_context(seed, device)`, and `assert_deterministic_run(run_fn,
  *args, n_runs=2) -> sha256`. The §1.9.1 **names** are all present at the top
  level (ports can import them), but the **signatures differ** — a port calling
  `assert_deterministic_run(sim_fn, runs=2, tolerance=1e-9)` per §1.9.1 would
  fail against the landed `n_runs=`/positional surface. The phase-2 plan treats
  §1.9.1 as a non-stage-overrideable socket (line 1411). **Recommendation:**
  operator reconciles before the first Stack-E port consumes the API — either
  amend §1.9.1 to the landed determinism surface, or file a socket-deviation per
  §1.8.2 / line 1411. (Capture/Particles/Grids/HashGrid surfaces landed this
  stage match §1.9.1 modulo the S1b-1 device default.)

## § 11. Banked items / observations

- **O-W7 (NEW)** — Warp implementation discipline (S1b-2): (1) declare
  kernel-local mutable ints with the `int(0)` idiom (ruff `UP018`/`RUF046` must
  be suppressed there); (2) pass an explicit `dtype=` to `wp.from_numpy` for
  multi-dimensional scalar arrays. Inherited by Stage-1c `@wp.kernel` smoke code.
- **Structural note** — Capture/Particles/Grids/HashGrid are realized as
  per-subsystem **subpackages** (e.g. `capture/{model,writer,reader}.py`) rather
  than the §1.9.1-illustrative flat modules (`capture.py`), per the operator's
  Stage-1b file manifest + the in-package subpackage precedent set at Stage 1a
  (`warp_harness/`). The §1.9.1 **public import contract is identical** (all
  symbols re-exported at `common_warp` top level). Not a behavioral shift.
- **O-W1 carried** (`wp.capture_*` vs HDF5 capture) — disambiguated in
  `capture/__init__.py`.
- **STAY-BANKED**: D12 CI-red LFS-bandwidth (no action); all other Stage-0/1a
  STAY-BANKED items unchanged.

## § 12. Stage 1c readiness

**READY.** Stage 1c implements **Subsystem 7** (`examples/hello/` 2D
advection-diffusion 64×64 smoke sim — Stage-0 Task-0.6 canonical params:
N=64, D=0.10, U=(0.5,0.3), dt=0.5, 400 steps, bounded-decaying) + `tests/
test_smoke_e2e.py` + `docs/common/warp.md` (8-section taichi.md mirror) +
**completes W-3 / W-4 / W-5 / W-6** (and the full §1.5.2 W-2 gate via
`run_twice_and_diff` on the smoke sim). The smoke sim consumes the Stage-1b
Capture (write a capture) + Grids (the scalar field) + Stage-1a Runtime +
Determinism; it does NOT exercise Particles/HashGrid (the grid-sim scope note
from Stage-0 § 10 — Stage 1c chooses augment-vs-unit-test-only). **Stage 1c
should consume the S1b-3 finding**: if it writes smoke-sim determinism via
`assert_deterministic_run`, it uses the landed `(run_fn, *args, n_runs=)`
signature, not §1.9.1's `(sim_fn, *, runs, tolerance)` — pending operator
socket-reconciliation.

## § 13. Verdict

**Stage 1b CONFIRMED.** Capture (W-1 mechanism + W-5 format-interop mechanism) +
Particles + Grids + HashGrid landed; 26 common-warp tests GREEN; ZERO
cross-package regressions; integrity baseline-MATCH (9-sub-phase streak);
bit-identity replay HELD (37th). 3 shifts (S1b-1/S1b-2/S1b-3); cumulative
**171 → 174**. **No `-phase-N` tag** (D10). Commits: Capture `a8d25d0` → data
structures `fae3350` → this checkpoint → SHA back-fill (separate, Convention
#12). Operator reviews this close, addresses the S1b-3 socket-reconciliation,
and dispatches Stage 1c separately.

---

*End of Stage-1b checkpoint. SHA back-fill follows (Convention #12 + N1
enumeration); operator routes Stage 1c (Subsystem-7 smoke sim + docs +
W-3/W-4/W-5/W-6 completion).*

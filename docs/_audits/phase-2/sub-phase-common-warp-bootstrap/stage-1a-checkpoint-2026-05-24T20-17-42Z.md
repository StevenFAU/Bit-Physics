---
date: 2026-05-24T20-17-42Z
author: common-warp-bootstrap-stage-1a-agent
phase: 2
artifact: stage
artifact_id: sub-phase-common-warp-bootstrap-stage-1a
stage: stage-1a-checkpoint
subject: "Stage 1a (workspace registration + Runtime + Determinism + warp_harness W-2 mechanism) CLOSE for sub-phase-common-warp-bootstrap. VERDICT CONFIRMED. common/common-warp/ comes into existence: 20th workspace member (D14); warp-lang>=1.13,<2.0 (D3; 1.13.0 re-verified upstream-latest per Convention #8); src/ layout (D6); filterwarnings=[error] only (D13/Task 0.3, no taichi-style filter). Runtime (Subsystem 1: init/get_device/set_device, cpu default per D4/R-W3) + Determinism (Subsystem 3: set_warp_deterministic/get_seed/deterministic_context/set_seed) + W-2 mechanism (warp_harness.assert_deterministic_run) landed. W-2 mechanism reproduces the Stage-0 Task-0.2 baseline sha256 24d44c7e...0746f314 over 6 runs (the full W-2 gate completes at Stage 1c via run_twice_and_diff on the smoke sim). Verification: common-warp 11 tests pass -W error; cross-package sweep 20 members ZERO regressions; integrity sweep c19492ad...d22cb52 baseline-MATCH (streak HELD, 9th sub-phase, FIRST Stack-E); bit-identity replay 9399fc33...718909f34 HELD (35th+). 2 shifts (S1a-1 dispatch-vs-HEAD common-py premises; S1a-2 Cat-1 GPU-device-token false-citation); cumulative 169 -> 171. No -phase-N tag. Stage 1b (Capture+Particles+Grids+HashGrid; W-1) routed separately."
head_sha: 5d5aefa946724eb479e5ea5d0a9aef8f63fbee37
head_sha_at_checkpoint: 327955e073d1524364427e2c64a5b15c297a45f6
parent_audits:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-checkpoint-2026-05-24T20-03-28Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-sha-back-fill-2026-05-24T20-03-28Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-1-checkpoint-2026-05-23T14-20-17Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-replay-2026-05-24T20-17-42Z.txt
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-integrity-sweep-2026-05-24T20-17-42Z.txt
  - common/common-warp/pyproject.toml
  - common/common-warp/src/common_warp/__init__.py
  - common/common-warp/src/common_warp/runtime.py
  - common/common-warp/src/common_warp/warp_harness/determinism.py
  - common/common-warp/src/common_warp/warp_harness/harness.py
  - common/common-warp/tests/test_harness.py
  - common/common-warp/tests/test_runtime.py
  - pyproject.toml
  - docs/dependencies.md
  - common/common-py/pyproject.toml
  - docs/conventions/sub-phase-conventions.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-replay-2026-05-24T20-17-42Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-integrity-sweep-2026-05-24T20-17-42Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
  common/common-py/pyproject.toml: sha256:a663ea10adb8ba1d25dc1266c7d5b15546b5c537f7291cf57ac8b0c75f108b3f
  docs/conventions/sub-phase-conventions.md: sha256:f4eb7eb705f6a8577127a3d83170ca68b4a1baec28c017be770f995daa7b292d
---

# Common-Warp Bootstrap — Stage 1a Checkpoint

> Workspace-registration + determinism-mechanism stage. `common/common-warp/`
> comes into existence here: the 20th workspace member, the `warp-lang`
> dependency, the Runtime + Determinism subsystems, and the W-2 determinism
> **mechanism** (`warp_harness`). The W-2 **gate** fully completes at Stage 1c
> (which runs the testkit `run_twice_and_diff` on the hello smoke simulator).
> Capture / Particles / Grids / HashGrid (Stage 1b) and the smoke sim + docs
> (Stage 1c) are NOT touched here.

## § 1. Scope

(FACT — Stage-1a dispatch SECTION 4 Tasks 1a.0–1a.6; charter § 2 allocation as
reconciled by Stage-0 S0-W1.) Stage 1a lands §1.9.1 **Subsystem 1 (Runtime)** +
**Subsystem 3 (Determinism)** + the **W-2 mechanism** + the **20th workspace
member** (D14) + the `warp-lang` dependency (D3) + the `docs/dependencies.md`
entry. Additive-only (Convention A): `common/common-warp/` is entirely new
files; the root `pyproject.toml` gains one member line; `docs/dependencies.md`
gains one section; `uv.lock` gains the additive resolution. No existing source
modified. The Capture / Particles / Grids / HashGrid subsystems (Stage 1b) and
the smoke simulator + `docs/common/warp.md` (Stage 1c) are explicitly out of
scope (§ 11 boundary).

## § 2. Operator routing consumed (D1–D14 + S0-W1 inheritance)

D1–D14 ratified at plan-drafting, all in force. Stage-1a-relevant rows + the
Stage-0 S0-W1 reconciliation inherited:

| Routing | Stage-1a consumption |
|---|---|
| **D3** pin `warp-lang>=1.13,<2.0` | Task 1a.1 re-fetched at edit time (Convention #8): 1.13.0 still upstream-latest; pinned `>=1.13,<2.0` in `common/common-warp/pyproject.toml`. |
| **D4** CPU bit-exact / GPU epsilon | Runtime `DEFAULT_DEVICE="cpu"`; determinism docstrings document the CPU serial-launch contract + GPU epsilon posture; W-2 baseline reproduced. |
| **D6** layout `src/common_warp/` | Adopted (mirrors common-py's `src/common_py/`); hatchling `packages=["src/common_warp"]`, mypy `files=["src/common_warp"]`. |
| **D13** filterwarnings iff-Warp-emits | Resolved "no" (Task 0.3): `filterwarnings=["error"]` only — no Warp/taichi-style bare-form filter. |
| **D14** 20th member at Stage 1a | `"common/common-warp"` appended to root `[tool.uv.workspace].members` (count 19 → 20). |
| **S0-W1** (Stage-0 reconciliation) | 1a = Runtime (1) + Determinism (3) + registration + warp_harness W-2 mechanism; the W-2 **gate** completes at 1c (needs the smoke sim + Capture). Honored verbatim. |

## § 3. Task 1a.0 — Preflight

(FACT — `git rev-parse HEAD`; replay/integrity outputs.) **HEAD ==
`5e56391def062e908ef200c2a3c19476b5546e0f`** at Stage-1a start (no drift since
Stage-0 close; working tree carried only the untracked `.claude/` + two
held-local eulerian-smoke captures). **Bit-identity replay** `9399fc33…718909f34`
**HELD (34th invocation)** (8/8 gates PASS, `ok=True`). **Integrity sweep**
`c19492ad…d22cb52` **baseline-MATCH** (0 HARD_FAIL, 14 SOFT_WARN). Append-only:
no prior audit edited. Task 1a.0 verdict: **PASS**.

## § 4. Task 1a.1 — Warp version re-fetch (Convention #8 fresh-at-edit)

(FACT — web-fetch `github.com/NVIDIA/warp/releases` 2026-05-24 + wheel metadata.)
Latest stable remains **warp-lang 1.13.0** (2026-05-04); top tags 1.13.0 / 1.12.1
(2026-04-06) / 1.12.0 (2026-03-06). **No 1.13.1 / 1.14.x / 2.x shipped** since
plan-drafting. Pin declared `warp-lang>=1.13,<2.0` (D3; minor-version style
mirroring `taichi>=1.7,<2.0`; upper bound to next major per § H.4). ABI: wheel
`Requires-Python: >=3.10` (classifiers 3.10–3.14); repo `>=3.12` compatible
(clean import on CPython 3.12.3). `wp.init()` confirmed idempotent (double-call
no-op). Task 1a.1 verdict: **PASS — pin range unchanged; 1.13.0 still latest.**

## § 5. Task 1a.2 — Scaffold + workspace registration + dependencies.md (COMMIT 1)

(FACT — COMMIT 1 `908e194`.) Per-file:

| File | Disposition |
|---|---|
| `common/common-warp/pyproject.toml` | NEW. `bit-physics-common-warp` v0.1.0; deps `bit-physics-testkit` (workspace) + `h5py>=3.10` + `numpy>=2.0` + `warp-lang>=1.13,<2.0`; dev `mypy>=1.10`/`pytest>=8.0`/`pytest-cov>=5.0`/`ruff>=0.5` (mirrors common-py's ACTUAL dev set — see S1a-1); hatchling `packages=["src/common_warp"]`; ruff (line 100, py312, select E/F/I/B/UP/SIM/RUF); mypy strict + `warp`/`capture`/`h5py` import-ignore overrides; `filterwarnings=["error"]` only; `testpaths=["tests"]`. |
| `common/common-warp/README.md` | NEW. Sister to common-py README; CPU-bit-exact / GPU-epsilon posture; forward-points to `docs/common/warp.md` (Stage 1c). |
| `src/common_warp/__init__.py` | NEW (placeholder at COMMIT 1; full §1.9.1 re-exports at COMMIT 2). |
| `src/common_warp/warp_harness/__init__.py` | NEW (placeholder at COMMIT 1; re-exports at COMMIT 2). |
| `tests/__init__.py`, `tests/conftest.py`, `tests/test_harness_smoke.py` | NEW. conftest injects `src/` into `sys.path` (mirrors common-py); smoke test asserts `__version__ == "0.1.0"`. |
| `pyproject.toml` (root) | +1 member `"common/common-warp"` → **20** (D14; first Stack-E). |
| `docs/dependencies.md` | +1 section (full `warp-lang` entry; promotes the § D.4 forward-looking parenthetical to an active pin). Append-only (existing § D.4 line untouched). |
| `uv.lock` | Additive (+`bit-physics-common-warp` v0.1.0, +`warp-lang` v1.13.0; +47 lines, no churn). |

Workspace member count **20** confirmed (delta +1; STOP-threshold satisfied).
Task 1a.2 verdict: **PASS**.

## § 6. Task 1a.3 — Runtime subsystem (Subsystem 1)

(FACT — COMMIT 2 `327955e`; `src/common_warp/runtime.py`.) Thin wrapper over
Warp 1.13.0 (Convention C, upstream names verbatim): `init(device=None)`
(idempotent — `wp.init()` guarded by a module flag; resolves `device` to
`DEFAULT_DEVICE="cpu"` per D4/R-W3, overriding §1.9.1's nominal GPU default),
`get_device() -> str`, `set_device(device)`. Cites `wp.init` / `wp.set_device` /
`wp.get_device` / `wp.is_cpu_available` / `wp.is_cuda_available`. Task 1a.3
verdict: **PASS**.

## § 7. Task 1a.4 — Determinism subsystem (Subsystem 3) + warp_harness (W-2 mechanism)

(FACT — COMMIT 2 `327955e`.) `warp_harness/determinism.py`:
`set_warp_deterministic(seed, device="cpu") -> int` (inits Warp on the device +
stores the canonical seed), `get_seed()` (raises if unset), `set_seed(seed)`,
`deterministic_context(seed, device="cpu")` (context manager; restores prior
seed + device on exit, no leak). `warp_harness/harness.py`:
`assert_deterministic_run(run_fn, *args, n_runs=2) -> str` (runs `run_fn`
`n_runs` times, sha256 over each result's concatenated array bytes, asserts
bit-identity, returns the witness digest) + the public `set_seed` wrapper. The
module documents the **D4 contract**: Warp's CPU backend launches serially over
the launch dimension (single thread), so f64 reductions incl. `wp.atomic_add`
are order-deterministic and bit-identical run-to-run (the Warp analog of Taichi
`cpu_max_num_threads=1` / numba `parallel=False`); GPU is epsilon-bounded.
Warp has no global RNG seed — randomness is per-thread via `wp.rand_init` /
`wp.randf`; the harness owns the canonical seed kernels thread in. The
`warp_harness` name is non-shadowing (`warp_harness` not bare `warp`). Task 1a.4
verdict: **PASS — W-2 mechanism landed (gate completes at 1c).**

## § 8. Task 1a.5 — Test verification (incl. 24d44c7e baseline match)

(FACT — `common/common-warp/tests/`; `pytest -W error` GREEN.) **11 tests pass.**

- `test_runtime.py` (4): `init()` idempotent; default device `cpu`; explicit
  `set_device`/`get_device`; auto-init on first `get_device`.
- `test_harness.py` (7): `set_warp_deterministic` returns the seed; `set_seed`/
  `get_seed` roundtrip; `deterministic_context` sets + restores (no leak);
  `assert_deterministic_run` detects a nondeterministic runner (raises) and
  rejects `n_runs<2`; and — load-bearing —
  **`test_assert_deterministic_run_matches_stage0_baseline`** reproduces the
  Stage-0 Task-0.2 kernel and asserts
  `assert_deterministic_run(_baseline_runner, n_runs=6) ==
  24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314`.

**W-2 baseline-match: YES.** The Stage-0 empirical CPU bit-determinism contract
reproduces through the Stage-1a `warp_harness` mechanism (6/6). The STOP-threshold
("baseline doesn't reproduce at first `assert_deterministic_run`") was NOT
triggered. Task 1a.5 verdict: **PASS**.

## § 9. Task 1a.6 — Local verification sweep

(FACT — evidence `stage-1a-replay-…txt` sha256 `9399fc33…718909f34`;
`stage-1a-integrity-sweep-…txt` sha256 `c19492ad…d22cb52`.)

- **Pre-emptive ruff** (banked #9): `ruff check --fix` (3 auto-fixed) +
  `ruff format` BEFORE COMMIT 1; final `ruff check common/common-warp/` →
  **All checks passed**.
- **common-warp pytest** `-W error`: **11 passed**.
- **Cross-package regression sweep (20 roots, cold `.pyc`)**: **ZERO
  REGRESSIONS** — testkit 58 / integrity 56 / diagnostics 22 / the 10 Phase-1
  sims + 5 Stack-D ports all GREEN (eulerian-smoke-stack-d 15 passed / 1 skipped,
  the 3D gate-14 held-local); common-py 25; **common-warp 11**.
- **Integrity sweep** `--all --mode strict`: **`c19492ad…d22cb52` baseline-MATCH**
  (0 HARD_FAIL, 14 SOFT_WARN; byte-identical streak HELD into the 9th sub-phase,
  the FIRST Stack-E entrant) — *after* the S1a-2 Cat-1 fix (§ 10).
- **Bit-identity replay**: `9399fc33…718909f34` **HELD (35th invocation)** —
  unaffected by the new common-warp surface (sealed Phase-1 tagged content).

Task 1a.6 verdict: **PASS — ZERO regressions; both invariants HELD; integrity
baseline-MATCH.**

## § 10. Banked items / observations

**Shifts this stage (2):**

- **S1a-1 — dispatch's common-py-mirror premises diverge from HEAD (consolidated
  believed-state correction).** The Stage-1a dispatch (SECTION 3 / Tasks 1a.2 /
  1a.5) asserted common-py facts that are wrong at HEAD; common-warp mirrors
  common-py's **actual** surface (Convention M):
  (a) import package is **`common_py`** (`src/common_py/`), not
  `bit_physics_common_py`;
  (b) the determinism harnesses live at **`tools/testkit/{taichi,numba}_harness/`**,
  NOT inside common-py's `src/` — so common-warp's `warp_harness/` is implemented
  as the operator-specified **in-package** subpackage (`src/common_warp/
  warp_harness/`), preserving the non-shadowing name; the determinism regression
  test lives in `common/common-warp/tests/test_harness.py`;
  (c) common-py's dev deps are exactly `mypy`/`pytest`/`pytest-cov`/`ruff` — it
  declares **no `pytest-timeout` and no `hypothesis`** (pytest-timeout exists
  only in `tools/testkit`); common-warp mirrors the actual set, so there is **no
  `@pytest.mark.timeout(5)`** (a 5 s timeout would also be flaky against Warp's
  ~2 s cold kernel compile).
- **S1a-2 — Cat-1 GPU-device-string false-citation (caught + fixed inline).** At
  the post-commit integrity sweep, `cat1.intra-repo` HARD_FAILed on a GPU
  device-string literal in `runtime.py`'s docstring (the spec's zero-indexed CUDA
  device, written in the `word`-colon-`digit` form) — the intra-repo citation
  parser mistook it for a `path:line` citation to a nonexistent target.
  **Fix:** rephrased the docstring/comment to name the CUDA device in prose
  (no `word:number` token); amended into COMMIT 2 (`327955e`); re-sweep →
  0 HARD_FAIL, `c19492ad…d22cb52` restored. **Reusable lesson:** any source/audit
  prose naming a zero-indexed GPU device must avoid the bare `word:number` token
  (use prose or a non-colon form), as Cat-1 treats it as an intra-repo citation.

**Observations (no shift):**

- **O-W6 (NEW) — Warp `@wp.kernel` tolerates `from __future__ import
  annotations`.** Unlike Taichi (`docs/common/taichi.md` § 4.2, which breaks on
  PEP-563 stringified kernel-arg annotations), Warp 1.13.0 resolves them
  correctly (verified empirically). Kernel-defining modules MAY use
  future-annotations; `tests/test_harness.py` nonetheless omits it, mirroring the
  `taichi_harness` defensive posture. Recorded for Stage 1c's `@wp.kernel` smoke.
- **O-W1 / O-W2 carried** (`wp.capture_*` naming collision; pure-literal f64 in
  kernels) — relevant at Stage 1b (capture) / 1c (smoke kernels).

**STAY-BANKED:** D12 CI-red LFS-bandwidth (no action); all other Stage-0
STAY-BANKED items unchanged.

## § 11. Stage 1b readiness

**READY.** Stage 1b implements (charter § 2 / S0-W1): **Subsystem 2 Capture**
(`Capture` / `write_capture` / `read_capture` over h5py + testkit `capture` +
jsonschema vs `capture-v1.json`; disambiguate from `wp.capture_*` per O-W1),
**Subsystem 4 Particles**, **Subsystem 5 Grids** (`ScalarField3D` /
`VectorField3D`), **Subsystem 6 HashGrid**; tests `test_capture.py` /
`test_particles.py` / `test_grids.py` / `test_hashgrid.py`. Gates **W-1**. The
scaffold + Runtime + Determinism foundation (this stage) is in place; the
`src/common_warp/__init__.py` re-export contract extends additively. The W-5
format-interop contract (Stage-0 Task 0.5) is the forward reference for Stage 1c.

## § 12. Verdict

**Stage 1a CONFIRMED.** `common/common-warp/` exists as the 20th workspace member;
Runtime + Determinism + the W-2 mechanism landed and reproduce the Stage-0
baseline `24d44c7e…0746f314`; ZERO cross-package regressions; integrity
baseline-MATCH (9th-sub-phase streak); bit-identity replay HELD (35th). 2 shifts
(S1a-1, S1a-2); cumulative **169 → 171**. **No `-phase-N` tag** (D10). Commits:
scaffold `908e194` → impl `327955e` → this checkpoint → SHA back-fill (separate,
Convention #12). Operator reviews this close and dispatches Stage 1b separately.

---

*End of Stage-1a checkpoint. SHA back-fill follows (Convention #12 + N1
enumeration); operator routes Stage 1b (Capture + Particles + Grids + HashGrid;
W-1 gate).*

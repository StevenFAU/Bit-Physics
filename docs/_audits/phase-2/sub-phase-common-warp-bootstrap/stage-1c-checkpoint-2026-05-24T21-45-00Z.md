---
date: 2026-05-24T21-45-00Z
author: common-warp-bootstrap-stage-1c-agent
phase: 2
artifact: stage
artifact_id: sub-phase-common-warp-bootstrap-stage-1c
stage: stage-1c-checkpoint
subject: "Stage 1c (Subsystem-7 smoke sim + docs/common/warp.md + W-3/W-4/W-5/W-6 + full W-2 completion) CLOSE for sub-phase-common-warp-bootstrap, PRECEDED BY the warp_harness §1.9.1 socket refactor reconciling S1b-3 (operator-routed Option B). VERDICT CONFIRMED. Refactor: init(device, deterministic), no-arg deterministic_context(), assert_deterministic_run(sim_fn, *, runs=2, tolerance=0.0) — matched to §1.9.1 VERBATIM (the dispatch's 'no None default / positional' prose-gloss reconciled to the spec's `device: str|None=None` per Convention C; runtime.py + test_runtime.py + test_hashgrid.py joined the refactor commit per Convention D blast-radius). W-2 baseline 24d44c7e…0746f314 REPRODUCES under the refactored signature (the load-bearing result; refactor is signature-only). Subsystem-7: examples/hello/ 2D advection-diffusion 64×64 (Stage-0 Task 0.6 params); empirical trajectory reproduces the design prediction 1.0 -> 0.218683 over 400 steps, zero increases, mass conserved (ratio 1.00000004); Particles/HashGrid via unit-tests (exercise-via-unit-tests decision). W-5 full gate: compare_captures(A, B) on the actual hello-warp capture within_tolerance=True, no HARD_FAIL. W-4: docs/common/warp.md 8-section. Verification: common-warp 38 tests pass -W error (26 -> 38, +12 Stage-1c); cross-package sweep 20 members ZERO regressions; integrity c19492ad…d22cb52 baseline-MATCH; bit-identity replay 9399fc33…718909f34 HELD. 1 consolidated shift (S1c-1 dispatch-vs-§1.9.1-verbatim + file-location reconciliation). Cumulative 174 -> 175. No -phase-N tag. Stage 2 (landing) routed separately."
verdict-state: CONFIRMED
head_sha: 03e75f75b6a1e4c290114dd0dbff50c6b62d7ea1
head_sha_at_checkpoint: 3f3f65035f15bdeeb09a065db061e5fe11d5182d
parent_audits:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1b-checkpoint-2026-05-24T21-01-29Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1b-sha-back-fill-2026-05-24T21-01-29Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-checkpoint-2026-05-24T20-17-42Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-checkpoint-2026-05-24T20-03-28Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1c-replay-2026-05-24T21-45-00Z.txt
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1c-integrity-sweep-2026-05-24T21-45-00Z.txt
  - common/common-warp/src/common_warp/runtime.py
  - common/common-warp/src/common_warp/warp_harness/determinism.py
  - common/common-warp/src/common_warp/warp_harness/harness.py
  - common/common-warp/examples/hello/sim.py
  - common/common-warp/tests/test_hello.py
  - docs/common/warp.md
  - docs/phases/phase-2-cross-stack-replication.md
  - tools/testkit/equivalence/harness.py
evidence_hashes:
  docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1c-replay-2026-05-24T21-45-00Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1c-integrity-sweep-2026-05-24T21-45-00Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
---

# Common-Warp Bootstrap — Stage 1c Checkpoint

> Final implementation stage. The §1.9.1 Subsystem 7 (smoke sim) lands at
> `common/common-warp/examples/hello/`; `docs/common/warp.md` lands; the
> **W-3 / W-4 / W-5 / W-6** gates complete and the **W-2** gate fully completes
> (mechanism at 1a; full gate here via the smoke sim). PRECEDED BY the
> operator-routed `warp_harness` §1.9.1 socket refactor (Task 1c.1) reconciling
> the S1b-3 finding. Stage 1c ends at its SHA back-fill; Stage 2 (landing) is
> routed separately.

## § 1. Scope

(FACT — Stage-1c dispatch SECTION 5 Tasks 1c.0–1c.8; charter § 2 allocation as
reconciled by Stage-0 S0-W1.) Stage 1c lands §1.9.1 **Subsystem 7** (the hello
smoke sim) + `docs/common/warp.md` + completes **W-3 / W-4 / W-5 / W-6** and the
**full W-2** gate. **Convention A (additive-only)** holds for the Subsystem-7
files + `warp.md`; the **sole exception** is the operator-routed Task-1c.1
§1.9.1 socket refactor (modifies `runtime.py`, `warp_harness/determinism.py`,
`warp_harness/harness.py` + their tests — signature-only). Subsystems 2/4/5/6
(Capture/Particles/Grids/HashGrid) are consumed, NOT modified (§ 14 boundary).

## § 2. Operator routing consumed (D1–D14; S0-W1; S1a-1/S1a-2; S1b-3 Option-B)

D1–D14 ratified at plan-drafting, all in force. Stage-1c-relevant inheritance:

- **S0-W1** (1a/1b/1c allocation): 1c = Subsystem 7 + W-3/W-4/W-5/W-6 + full
  W-2. Honored.
- **S1b-3 Option-B refactor routing**: refactor `warp_harness` to match §1.9.1
  **verbatim** BEFORE Subsystem-7 work; preserve the `tolerance=0.0` GPU
  epsilon-bounded determinism surface. Consumed at Task 1c.1 (§ 4).
- **S1a-2 GPU device-string discipline**: prose form for the zero-indexed CUDA
  device in all source + audit + `warp.md` text; zero bare `word`-colon-`digit`
  tokens (Cat-1 false-citation avoided — grep-verified on `warp.md`).
- **O-W7** (Warp quirks): `int(0)` idiom for kernel-local mutable ints; explicit
  `dtype=` to `wp.from_numpy` for multi-dim scalar arrays. Applied (§ 5).
- **Banked precedent #7** (pure-literal f32 seeding in `@wp.kernel`): applied
  (§ 5). **O-W6** (Warp tolerates future-annotations): the kernel module
  nonetheless omits it (defensive).

## § 3. Task 1c.0 — Preflight (incl. pre-refactor W-2 baseline re-verification)

(FACT — `git rev-parse HEAD`; test + replay + sweep outputs.)

- **HEAD == `d5423af172ff48ce68af86506fc7c1f7b24d7151`** at Stage-1c start (no
  drift since Stage-1b close; working tree carried only untracked `.claude/` +
  the two held-local eulerian-smoke captures). No Hard Rule 2 drift trigger.
- **Pre-refactor W-2 baseline re-verification**:
  `test_assert_deterministic_run_matches_stage0_baseline` GREEN at HEAD under the
  CURRENT (Stage-1a-landed) signature — digest `24d44c7e…0746f314` reproduces
  (the pre-refactor anchor).
- **Integrity baseline** `c19492ad…d22cb52` MATCH; **bit-identity replay**
  `9399fc33…718909f34` HELD. Task 1c.0 verdict: **PASS**.

## § 4. Task 1c.1 — warp_harness §1.9.1 socket refactor (S1b-3 reconciliation)

(FACT — COMMIT 1 `e380385`.) Signatures reconciled to the phase-2 plan §1.9.1
**verbatim** (plan lines 906–998):

| Symbol | Stage-1a landed | Stage-1c (§1.9.1 verbatim) |
|---|---|---|
| `init` (`runtime.py`) | `init(device=None) -> str` | `init(device: str \| None = None, deterministic: bool = False) -> str` |
| `deterministic_context` (`warp_harness/determinism.py`) | `(seed, device="cpu")` | `()` no-arg (uses current `init()`/`set_seed()` state) |
| `assert_deterministic_run` (`warp_harness/harness.py`) | `(run_fn, *args, n_runs=2) -> str` | `(sim_fn, *, runs=2, tolerance=0.0) -> str` |

**W-2 baseline reproduction (the load-bearing result).**
`test_assert_deterministic_run_matches_stage0_baseline` invoked under the
refactored `(sim_fn, *, runs=6)` signature returns
`24d44c7e2c5302a600e7ca3795b3fb95e4eb0b0f03c4635d18feed5f0746f314` — the Stage-0
baseline reproduces **unchanged**, confirming the refactor is signature-only and
NOT semantics-changing (the Hard-Rule-2 STOP-threshold — "baseline does not
reproduce under the refactored signature" — was NOT triggered).

**Semantics preserved.** `tolerance == 0.0` is byte-for-byte the landed
hash-comparison path; `tolerance > 0.0` adds an epsilon-bounded element-wise
comparison (the D4 GPU posture — `assert_deterministic_run(..., tolerance=1e-6)`
admits sub-tolerance drift, verified by a new test). The return value stays the
sha256 witness (a documented superset of §1.9.1's `-> None`, mirroring `init`'s
`-> str`). `deterministic` records the requested D4 posture; Warp 1.13.0 has no
global deterministic toggle and no `wp.set_seed` (both probed) — CPU bit-exactness
is structural (serial launch).

**Consolidated reconciliation shift — S1c-1** (the only Stage-1c shift; mirrors
the S1a-1 dispatch-premise-vs-HEAD pattern):
(a) **§1.9.1 `init` default.** The dispatch's prose ("both positional; device
explicit; no None default per §1.9.1") DIVERGES from §1.9.1 **verbatim**, which
is `device: str | None = None`. Reconciled to the spec (Convention C: cite §1.9.1
verbatim; Convention M: HEAD wins) — the landed `device` default already matched;
the real gap was the missing `deterministic` flag, added.
(b) **Return types.** §1.9.1 says `init -> None` and `assert_deterministic_run ->
None`; both keep their landed superset returns (`str` / sha256) — the accepted
Stage-1a posture (`test_runtime` asserts `init() == "cpu"`); a caller ignoring the
return satisfies `-> None`.
(c) **File location.** `init` lives in `runtime.py` (Subsystem 1), NOT
`determinism.py` as the dispatch's "determinism.py changes" / COMMIT-1 file-list
stated; `runtime.py` + `tests/test_runtime.py` therefore joined COMMIT 1
(SECTION 7 permits "Runtime/Determinism signatures only").
(d) **Call-site blast radius (Convention D).** `tests/test_hashgrid.py` called
`assert_deterministic_run(_run, n_runs=3)`; updated to `runs=3` or the suite
would break under the renamed kwarg. Joined COMMIT 1.
`set_warp_deterministic` (a landed extra, not a §1.9.1 symbol) is retained
(additive; used by the HashGrid + harness tests); `set_seed`/`get_seed` are
unchanged (not refactor targets).

## § 5. Task 1c.2 — Subsystem-7 implementation

(FACT — COMMIT 2 `921c45b`; `examples/hello/{__init__,sim}.py` + `README.md`.)
2D advection-diffusion smoke sim on a 64×64 periodic grid (Stage-0 Task 0.6
canonical params: N=64, D=0.10, U=(0.5,0.3), dt=0.5, dx=1.0, 400 steps). IC: a
localized Gaussian (σ=N/12), peak normalized to 1.0. Scheme: explicit FTCS
diffusion + first-order upwind advection (both dissipative); double-buffered
per-cell stencil **gather** (no atomic scatter, no RNG → bit-deterministic on the
CPU serial launch).

- **Subsystems exercised (W-3).** Runtime (`init(device, deterministic)`),
  Determinism (`set_seed`), Capture (`write_capture`), Grids
  (`ScalarField3D` / `allocate_scalar_field` — the density field is a
  `ScalarField3D` of shape `(N, N, 1)`).
- **Particles / HashGrid decision: exercise-via-unit-tests** (Stage-0 S0-W1
  W-3 tension; Stage-1c choice, documented). A pure 2D grid advection-diffusion
  has no particles or neighbor queries; forcing them into the sim would dilute
  it. Instead `tests/test_hello.py` exercises Particles + HashGrid over
  **smoke-field tracer particles** (seeded from the highest-density cells) — W-3
  "exercises every public subsystem" reads collectively across the test suite.
- **Banked #7 / O-W7.** The pure-literal `4.0` Laplacian-centre coefficient is
  seeded `wp.float32(4.0)`; the diffusion/Courant coefficients are `wp.float32`
  kernel args. No kernel-local mutable ints are needed (the periodic-wrap
  indices are computed once) — the `int(0)` idiom did not apply. The kernel
  module omits `from __future__ import annotations` (defensive, O-W6).
- **Capture descriptor**: `hello-warp-adv-diff-64sq-seed42-step400`; manifest
  `sim = {name: hello-warp, category: smoke, variant:
  advection-diffusion-2d-upwind-ftcs}`, `determinism.claimed =
  bit-exact-same-hw`, `config.dtype = f32`, 11 captured frames (cadence 40).

## § 6. Task 1c.3 — Test surface enumeration

(FACT — `tests/test_hello.py`; `pytest -W error` GREEN.) **38 common-warp tests**
(26 Stage-1a/1b + 12 Stage-1c):

| Test file | Count | Stage-1c additions |
|---|---|---|
| `test_hello.py` | 10 | runs-without-error; trajectory-bounded-decaying; capture-produced; schema-v1-compliant; read-capture roundtrip; **W-2 via warp_harness**; **W-2 via testkit run_twice_and_diff**; Particles tracers; HashGrid neighbor query; **W-5 compare_captures** |
| `test_harness.py` | 7 | +1 `…_tolerance_admits_epsilon` (the §1.9.1 `tolerance>0.0` path); 4 updated for the refactored signature (the 3 `assert_deterministic_run` tests `n_runs`→`runs`; `deterministic_context` → no-arg) |
| `test_runtime.py` | 5 | +1 `test_init_deterministic_flag` |
| `test_capture.py` / `test_grids.py` / `test_hashgrid.py` / `test_particles.py` / `test_harness_smoke.py` | 5/4/4/2/1 | unchanged (Stage 1b/1a) — `test_hashgrid.py` call-site `n_runs`→`runs` only |

## § 7. Task 1c.4 — Trajectory verification (S6-discipline empirical check)

(FACT — `run_hello_sim(seed=42)` canonical 64×64×400; max-field evolution.)

| Step | 0 | 50 | 100 | 200 | 400 |
|---|---|---|---|---|---|
| Stage-0 design (Task 0.6) | 1.000000 | 0.685580 | 0.526721 | 0.358262 | 0.218683 |
| Stage-1c empirical (f32) final | 1.000000 | — | — | — | **0.218683** |

- **Final max = 0.218683** — matches the Stage-0 design prediction 0.2186833 to
  f32 precision.
- **n_increases over all 400 steps = 0** (strictly monotone non-increasing;
  bounded-decaying).
- **Mass conserved**: ratio 1.00000004 (f32 roundoff over 400 steps; conserved
  under periodic BC as both the diffusion and upwind-advection sums telescope to
  zero).

The trajectory **matches the design-time prediction within FP tolerance** — the
Hard-Rule-2 STOP-threshold ("trajectory not bounded-decaying as Task 0.6
predicted") was NOT triggered. (The cadence-40 frames differ in their *intermediate*
values from the Stage-0 cadence-50 reference simply because they are different
step indices; the step-400 checkpoint is the design-anchor and matches exactly.)

## § 8. Task 1c.5 — W-5 full gate completion (run-twice-and-diff capture-level)

(FACT — COMMIT 3 `12ae691`; `test_hello_w5_compare_captures_run_twice`.)
(a) ran the Subsystem-7 sim → Capture A; (b) ran again at seed 42
(deterministic) → Capture B; (c) `compare_captures(A, B)`; (d)
`within_tolerance == True`; (e) **no HARD_FAIL** on any `sim:category-mismatch` /
`step:set-mismatch` / `…:missing` / `…:shape-mismatch` surface, no dtype
`TypeError`. Every per-field diff is exactly `0.0` (A and B are bit-identical on
CPU per D4). `sim.category = "smoke"` resolves directly to `tolerance.toml
[defaults.smoke]` (rtol 1e-4) — **no override added** (testkit untouched per
SECTION 7). **W-5 fully completes** (mechanism at 1b; full gate here against the
real capture).

## § 9. Task 1c.6 — docs/common/warp.md (W-4 gate)

(FACT — COMMIT 4 `3f3f650`; `docs/common/warp.md`.) 8-section doc mirroring the
`docs/common/taichi.md` shape (D7), warp-specialized: § 1 Overview · § 2
Installation + pin (`warp-lang>=1.13,<2.0`; D13 no-filter) · § 3 Public API
surface (the §1.9.1 seven subsystems) · § 4 Determinism contract (D4; W-2
baseline `24d44c7e…0746f314`; §1.9.1 signature contract; structural-not-flag CPU
guarantee) · § 5 Usage examples (`examples/hello/` canonical consumer) · § 6
Stack-E port consumption guide (MPM / Smoke / LBM Stack-E) · § 7 Warp upstream
references (1.13.0; Convention C verbatim) · § 8 Methodology integration
(S6-trajectory; cross-stack-as-defect-amplifier). **S1a-2 discipline**: GPU
device in prose throughout; zero bare `word:number` tokens (grep-verified).

## § 10. Task 1c.7 — W-6 integrity gate completion (Cat-1/Cat-2/Cat-4 + baseline)

(FACT — `python -m integrity --all --mode strict`; output captured to
`stage-1c-integrity-sweep-…txt`.) **`0 HARD_FAIL, 14 SOFT_WARN`**, output
**byte-identical to the baseline `c19492ad…d22cb52`** (the 14 SOFT_WARN are the
pre-existing phase-0/phase-1 audit-link warnings; `warp.md` + the common-warp
surface added ZERO new findings). **Cat-1** (intra-repo citations in `warp.md` +
module docstrings resolve at HEAD; no false GPU-device citation — S1a-2),
**Cat-2** (every `common_warp` public symbol resolves + is re-exported +
docstring'd), **Cat-4** (audit/source citation format; pre-commit hook
`integrity Cat 4` Passed on every commit) all clean. Integrity baseline-MATCH;
streak HELD into the Stage-1c landing position. W-6 **GREEN**.

## § 11. Task 1c.8 — Local verification sweep

(FACT — evidence `stage-1c-replay-…txt` `9399fc33…718909f34`;
`stage-1c-integrity-sweep-…txt` `c19492ad…d22cb52`.)

- **Pre-emptive ruff** (banked #9): `ruff check --fix` + `ruff format` BEFORE
  each commit; pre-commit `ruff check` / `ruff format` Passed on every commit.
- **common-warp pytest** `-W error`: **38 passed** (26 → 38; +12 Stage-1c).
- **Cross-package regression sweep (20 roots, cold `.pyc`)**: **ZERO
  REGRESSIONS** — testkit 68 / integrity 56 / diagnostics 93 / the 10 Phase-1
  sims + 5 Stack-D ports all GREEN (eulerian-smoke-stack-d 15 passed / 1 skipped,
  the held-local 3D gate-14, unchanged); common-py 25 (unchanged); **common-warp
  38**.
- **Integrity sweep**: **`c19492ad…d22cb52` baseline-MATCH** (byte-identical).
- **Bit-identity replay**: **`9399fc33…718909f34` HELD** (8/8 gates PASS,
  `ok=True`; Stage-1c final-sweep invocation).
- **mypy posture (inherited observation)**: `mypy --strict` reports pre-existing
  errors on the warp partial-stub surface (`grids`/`hashgrid`/`particles`/
  `runtime` — `.numpy()` untyped, `wp.array` generic) present at HEAD before the
  refactor; the Stage-1c refactor + sim introduced ZERO new mypy errors (the new
  functions are mypy-clean). mypy is not a landing gate at HEAD (prior stages
  gated on ruff + pytest); not chased (SECTION 7 boundary).

## § 12. W-Gate completion summary

| Gate | Mechanism stage | Full-gate stage | Status |
|---|---|---|---|
| **W-1** Capture I/O | 1b | 1c (Subsystem-7 capture written + reloaded) | **GREEN** |
| **W-2** Determinism | 1a (mechanism) | 1c (`assert_deterministic_run` + `run_twice_and_diff` on the smoke sim) | **GREEN** |
| **W-3** Smoke sim | n/a | 1c (`examples/hello/`; exercises the public surface) | **GREEN** |
| **W-4** Public API docs | n/a | 1c (`docs/common/warp.md`) | **GREEN** |
| **W-5** Equivalence compat | 1b (mechanism) | 1c (`compare_captures` run-twice-and-diff) | **GREEN** |
| **W-6** Integrity | n/a | 1c (Cat-1/2/4 + baseline-MATCH) | **GREEN** |

All six W-Gates GREEN. The §1.9.1 seven-subsystem public API is complete and the
socket signatures match §1.9.1 verbatim.

## § 13. Banked items / observations

- **S1c-1 (the single Stage-1c shift)** — consolidated dispatch-vs-§1.9.1-verbatim
  + file-location + call-site reconciliation (§ 4). Cumulative **174 → 175**.
- **Banked-precedent candidate — S1b-3 socket reconciliation (Option B).** When a
  plan socket (§1.9.x) and a landed implementation diverge in *signature* while
  agreeing in *name*, refactor the implementation to the socket verbatim BEFORE
  the first downstream consumer, preserving the load-bearing baseline (here the
  W-2 digest). Candidate for Stage-2 methodology formalization.
- **Banked-precedent candidate — S1a-2 GPU device-string discipline.** Prose-form
  GPU device naming in all source/audit/doc text (no bare `word:number`).
  Exercised again in `warp.md`; candidate for Stage-2 formalization.
- **O-W7 applied** (sim used explicit f32 seeding; no mutable-int idiom needed).
  **O-W6** (kernel module omits future-annotations, defensive). **O-W1** (project
  HDF5 capture vs `wp.capture_*`) disambiguated in `warp.md` + sim docstring.
- **Methodology note** — the determinism + W-5 tests use a reduced config
  (`n=32, steps=40`, the actual sim at smaller scale; mirrors the Stack-D
  `sim_runner_diagnostic` cost pattern); the trajectory test uses canonical
  64×64×400.
- **STAY-BANKED**: D12 CI-red LFS-bandwidth (no action; the hello capture is tiny
  — 64×64 f32 ≪ MB); all other Stage-0/1a/1b STAY-BANKED items unchanged.

## § 14. Stage 2 readiness

**READY.** All six W-Gates GREEN; the §1.9.1 surface is complete and
socket-faithful; ZERO cross-package regressions; both invariants HELD. Stage 2
(landing) inputs: (1) the Stage-1c commit chain (refactor → sim → W-5 → docs →
this checkpoint → SHA back-fill); (2) CHANGELOG entry for the first Stack-E module
+ the §1.9.1 socket reconciliation; (3) methodology-precedent formalization
candidates — **S1b-3 socket reconciliation** (Option-B: refactor-to-socket-before-
first-consumer) and **S1a-2 GPU device-string discipline**; (4) the D12 CI-red
LFS posture (local-only verification, documented). **Boundary**: Stage 1c does NOT
push, does NOT tag, does NOT dispatch any Stack-E port (D9 MPM Stack-E is the next
sub-phase, routed separately).

## § 15. Verdict

**Stage 1c CONFIRMED.** The `warp_harness` §1.9.1 socket refactor reconciled S1b-3
(W-2 baseline `24d44c7e…0746f314` reproduces under the refactored signature — the
load-bearing result); Subsystem-7 (`examples/hello/`) landed with a
bounded-decaying trajectory matching the Stage-0 design (1.0 → 0.218683, zero
increases, mass conserved); `docs/common/warp.md` landed; **W-2 / W-3 / W-4 / W-5
/ W-6 all GREEN** (W-1 carried GREEN from 1b, completed here via the actual
capture). 38 common-warp tests pass `-W error`; ZERO cross-package regressions
(20 roots); integrity `c19492ad…d22cb52` baseline-MATCH; bit-identity replay
`9399fc33…718909f34` HELD. 1 shift (S1c-1); cumulative **174 → 175**. **No
`-phase-N` tag** (D10). Commits: refactor `e380385` → smoke sim `921c45b` → W-5
`12ae691` → docs `3f3f650` → this checkpoint → SHA back-fill (separate,
Convention #12). Operator reviews this Stage-1c close and dispatches Stage 2
(landing) separately.

---

*End of Stage-1c checkpoint. SHA back-fill follows (Convention #12 + N1
enumeration); operator routes Stage 2 (landing) separately.*

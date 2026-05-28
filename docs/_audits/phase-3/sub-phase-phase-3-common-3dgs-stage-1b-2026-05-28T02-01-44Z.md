---
date: 2026-05-28T02-01-44Z
author: phase-3 common-3dgs stage-1b (Claude Code)
subject: Phase 3 common-3dgs Stage 1b — implementation + thirteen-gate + D-C measurement
verdict: CONFIRMED
head_sha: dd1c3eca4c73cf73f2b4ca4ea51b3af287bae2da
prior_phase_tag: v0.2.1-sub-phase-lfs-architecture
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:    # mapping (path → sha256); NO ": self" sentinel
  common/common-3dgs/src/common_3dgs/render.py: sha256:31caff03651d9582605c42f509e821f35c6222b5a1c4bc0b7cb4e4198f39e238
  common/common-3dgs/src/common_3dgs/model.py: sha256:95c4f83dcce703978bd046c94861830ed91bdc8160fd9ca0d99eda5df7db9d11
  common/common-3dgs/src/common_3dgs/_kernels.py: sha256:d2cf9b3a83b4861778d2f96826bd85dbb52d598d8ac8c83de8bbb937bf95160b
  common/common-3dgs/examples/smoke_3dgs/sim.py: sha256:db914ffa0c5cd94a18aff305ee8f43d95507a67ba7339f6fcf6853b193b260bf
  docs/common/3dgs.md: sha256:f14e734f1a7224ab57c0e364bb82a4dae14f05c01fe604cbda6beb12b7b7784a
  tools/testkit/failing-tests-evidence/common-3dgs-2026-05-28T01-28-53Z.txt: sha256:f1f80a0225567da81b73aca1d8ce84f3802b97b61c1c7fb6c9a081a7626c84c6
evidence_paths:     # list
  - common/common-3dgs/src/common_3dgs/render.py
  - common/common-3dgs/src/common_3dgs/model.py
  - common/common-3dgs/src/common_3dgs/_kernels.py
  - common/common-3dgs/examples/smoke_3dgs/sim.py
  - docs/common/3dgs.md
  - tools/testkit/failing-tests-evidence/common-3dgs-2026-05-28T01-28-53Z.txt
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md
  - docs/_audits/phase-3/progress.md
d_class_status:
  - D-C: bit-exact-confirmed (MEASURED max_abs_diff=0.0; bit-exact / same-stack-same-hw HOLDS, not re-characterized)
  - D-D: common-3dgs save_png (matplotlib imsave; no common-py RGB-image writer exists)
---

# Phase 3 common-3dgs Stage 1b — implementation + thirteen-gate + D-C — CONFIRMED

> **Verdict: CONFIRMED.** The §3.2.1 API is implemented (RED → GREEN: 10/10 tests),
> ruff + mypy --strict clean, integrity baseline byte-identical, I1–I7 hold. **D-C
> MEASURED bit-exact** (`max_abs_diff = 0.0`, identical sha256 over two renders) — the
> default declaration HOLDS, no re-characterization (no STOP-J). The thirteen gates
> pass (sim-specific gates N/A with §2.11 surrogates; Gate 14 N/A — single-stack).
> One **SHIFTED** infra item: the schema-corpus fixture is GENERATED + corpus-test-GREEN
> but its commit is DEFERRED — its `.h5` is LFS-routed and both LFS backends are
> unavailable in agent sessions (push EOF). Not a STOP — surfaced for the operator.

## § 0 — Stage-1b commit chain (FACT)

Trunk-based to `main`; pushed; no tag (I7). Parent `503d348` (Stage-1a tip).

| Commit | Type | Content |
|---|---|---|
| `87fe557` | feat | implement §3.2.1 (model + .ply I/O, Camera, render + `_kernels`, save_png, smoke); RED→GREEN. Footer witnesses `sha256:f1f80a02…` from `ed4e501` |
| `d9aa0e7` | docs | docs/common/3dgs.md + README + CHANGELOG + glossary + dependencies + perf-ledger |
| `dd1c3ec` | chore | python-strict.yml test-common-3dgs job + just recipes + tolerance-budget Phase-3 carryover + registry MEASURED + .gitignore |

This audit + the progress entry land next; `head_sha` back-fills to its own commit
(Convention #12). A reverted fixture commit (`c824c9c`, since `git reset --hard`) is
**not** in history — see § 5.

## § 1 — Implementation manifest (FACT)

| Module | Implements |
|---|---|
| `common/common-3dgs/src/common_3dgs/model.py` | `GaussianSplatModel`: shape/dtype validation; Warp `vec3`/`float32` fields; Inria `.ply` `load_ply`/`save_ply` (independent binary-LE parser; `scale=exp(log)`, `opacity=sigmoid(logit)` activation round-trip; channel-major `f_rest`); `to_numpy`, `num_gaussians`, `sh_degree` |
| `common/common-3dgs/src/common_3dgs/camera.py` | `Camera`: RH +Z-forward view + symmetric-perspective projection; `look_at`; derives `camera_center`, `fov_y` |
| `common/common-3dgs/src/common_3dgs/render.py` | `render`: NumPy projection / EWA-Jacobian covariance / SH→colour preprocessing + stable depth sort; per-pixel front-to-back compositing in the Warp kernel; empty/all-culled → background |
| `common/common-3dgs/src/common_3dgs/_kernels.py` | `composite_splats` `@wp.kernel` (per-pixel gather, no atomic scatter; CPU-serial → bit-exact). `# mypy: ignore-errors` (Warp annotation constructors) |
| `common/common-3dgs/src/common_3dgs/image_io.py` | `save_png` (matplotlib `imsave`; D-D writer) |
| `common/common-3dgs/examples/smoke_3dgs/sim.py` | `run_3dgs_smoke`: 6×6 colour-graded scene → `.ply` round-trip → render → PNG + Layer-0 `neural-rendered` HDF5 capture |

**Tests: 10/10 GREEN** (7 smoke-contract + 3 PBT). ruff + ruff-format + `mypy --strict`
clean (the `no-untyped-call` code relaxed at the Warp-interop boundary, documented in
`common/common-3dgs/pyproject.toml`; `wp.array[Any]` keeps the Warp-stubbed generic
strict-clean). The Stage-1a RED tests (`ed4e501`) turned GREEN unmodified;
implementation commit `87fe557` footer witnesses
`Failing-tests-output-hash-witnessed: sha256:f1f80a02…626c84c6`.

## § 2 — D-C measurement (FACT — authoritative)

Methodology: build the smoke scene + a fixed camera; call `render()` twice on the
identical model + camera + hw; compare the output arrays.

```
shape (96,96,3) float32 ; byte-identical run-to-run: True ; max_abs_diff: 0.0
sha256 run1 == sha256 run2 (37d0f34f…) ; min 4.1e-10 max 0.908 mean 0.282
```

**Result: bit-exact CONFIRMED.** The renderer composites per-pixel front-to-back over
a host-side stable-sorted splat list inside a Warp CPU kernel (serial `wp.launch`, no
atomic scatter, no subgroup ops) → bit-identical run-to-run. The D-C **default
declaration HOLDS**; the registry row `[neural-rendered.common-3dgs]` =
`class="bit-exact"`, `scope="same-stack-same-hw"`, `atomic_ops="none"`,
`subgroup_ops="none"`, `seed_pinned=true` is unchanged. **No STOP-J** (no
re-characterization to distributional/EFECT was forced).

## § 3 — Thirteen-gate verdict table (spec §3.5 v2.4; §2.11 infra surrogates)

| # | Gate | Verdict | Evidence |
|---|---|---|---|
| 1 | Spec sheet (§3.2.8) | **PASS (surrogate)** | infra task — `docs/common/3dgs.md` is the module contract doc (§2.11 surrogate for a per-sim `spec-ref.md`); ≥2 PBT invariants declared there + in the test suite |
| 2 | Probe report | **PASS** | `tools/testkit/probes/reports/common-3dgs.md` (Stage 1a) |
| 3 | Failing tests committed (TDD, separate commit, hash in footer) | **PASS** | `ed4e501`; `sha256:f1f80a02…` in footer |
| 4 | Implementation lands; footer references failing-tests SHA + witnessed hash | **PASS** | `87fe557` (`Implements-failing-tests-from: ed4e501`, `…-witnessed: sha256:f1f80a02…`) |
| 5 | Tests pass strict-mode; goldens ≥3 anchors | **PASS / golden N/A** | 10/10 strict; common-3dgs ships no golden table (infra) |
| 6 | Tier 1+2 diagnostics; Tier 3 module | **N/A (surrogate)** | infra — no sim diagnostics; §2.11 surrogates = smoke contracts + capture round-trip + determinism harness. Smoke emits diagnostics (mean_luminance, nonbackground_fraction); no `tier3/3dgs-smoke/` needed (§6.1 E "if needed") |
| 7 | Capture I/O working; `just run-…` replayable | **PASS** | `just run-3dgs-smoke` writes PNG + HDF5; `load_capture` round-trips (corpus test 21/21 with the entry present). The schema-corpus *seed commit* is DEFERRED (§5) but capture I/O itself works |
| 8 | Perf benchmark reproducible | **PASS** | `docs/perf-ledger.md` 3dgs-smoke 0.006s; command + hw documented |
| 9 | Cat 1–5 + Cat-X integrity | **PASS** | 0 HARD_FAIL, baseline `c19492ad…` byte-identical; tolerance-budget Phase-3 carryover (no over-budget override) |
| 10 | Audit report + progress.md | **PASS** | this audit + progress entry |
| 11 | PBT ≥2 invariants; Hypothesis DB | **PASS (DB note)** | 3 invariants GREEN; example DB intentionally `database=None`/`derandomize=True` for run-to-run hash determinism (RED gate-13) — derandomized + passing, so no `.hypothesis/` artifact is needed |
| 12 | First-landing wall-clock in perf-ledger | **PASS** | the 3dgs-smoke row |
| 13 | Failing-tests replay verifiable | **PASS** | re-run at HEAD reproduces `sha256:f1f80a02…` byte-identically (verified; deterministic `--tb=line` + normalized capture) |
| 14 | Cross-stack equivalence | **N/A** | common-3dgs is single-stack (Stack-E only); no Phase-1/2 3DGS counterpart exists → no cross-stack table. `tolerance.toml` adds no row (documented N/A) |

## § 4 — Shared-file change manifest (FACT)

- `docs/common/3dgs.md` (NEW; Cat-2 doc↔impl contract).
- `README.md` (common-modules listing); `CHANGELOG.md` (`### sub-phase-phase-3-common-3dgs`
  + v0.2.2 tag reservation); `docs/glossary.md` (3DGS / .ply-3DGS / spherical harmonics);
  `docs/dependencies.md` (common-3dgs + matplotlib + NON-COMMERCIAL vendoring);
  `docs/perf-ledger.md` (3dgs-smoke row).
- `.github/workflows/python-strict.yml` (`test-common-3dgs` job; pytest direct, §2.14).
- `justfile` (`run-3dgs-smoke`, `test-3dgs`); `.gitignore` (smoke `out/`).
- `tools/testkit/equivalence/tolerance-budget.toml` (Phase-3 carryover; no widening).
- `tools/testkit/determinism/registry.toml` (D-C row MEASURED-confirmed).
- `tolerance.toml`: **N/A** — common-3dgs is single-stack; no cross-stack row to add.

## § 5 — SHIFTED: schema-corpus fixture DEFERRED (LFS-backend-gated)

The schema-corpus seed `tests/fixtures/legacy-captures/phase-3-common-3dgs.{h5,json}`
was **generated** (the deterministic 3dgs-smoke capture) and the corpus test
(`capture/tests/test_legacy_captures_corpus.py`) **passed 21/21 with the entry present**
(loads + reads + schema-validates). Fixture digest: `.h5`
`sha256:651dbe459bbe50ca3efb18bb70942e697c03978a85a190774a246d41464653f1` (211 344 B).

**Its commit is DEFERRED.** `.h5` under `tests/fixtures/legacy-captures/` is LFS-routed
(`.gitattributes:45`, "going forward"). Both LFS backends are unavailable in agent
sessions — the `lfs-s3` standalone agent has no R2 credentials (push fails **EOF**),
and the GitHub-LFS fallback budget is exhausted (Stage-0 audit
`docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md:135`;
[[replay-needs-lfs-cache-recovery]] / lfs-architecture steady-state). An empirical push
of the LFS fixture returned EOF and was reverted (`git reset --hard`) to keep `main`
pushable; the fixture is **reproducible** via `just run-3dgs-smoke` (D-C bit-exact).
**HARD RULE 2:** rather than improvise around the operator's documented LFS routing (a
non-LFS blob bypass, or an unpushable pointer that would block all future pushes), the
fixture is surfaced for the operator to land with an LFS backend (or at Stage 2). This
does not gate Stage-1b correctness (capture I/O + corpus round-trip are demonstrated).

## § 6 — STOP-E disposition (task-8 consumption — cleared)

The §3.2.1 API **supports task-8's pattern** (mutate a working-copy
`GaussianSplatModel` per frame: translation from MPM positions, scale/rotation from the
deformation gradient, SH frozen). `GaussianSplatModel.__init__` accepts NumPy or Warp
arrays for each field, so task-8 constructs a per-frame model with mutated
positions/scales/rotations + the scene's frozen `sh_coefficients` and calls `render`.
No STOP-E.

## § 7 — Invariants (FACT)

I1 verify_evidence (prior audits 0-fail, re-confirmed Stage 1c); I2 replay (Stage-0
`ok=True` 8/8; Stage-1b additive — no audit/capture/tolerance the replay inspects was
altered); I3 integrity baseline byte-identical 0 HARD_FAIL; I4 no published audit
edited; I5 Inria SHA web-verified (no fabrication); I6 head_sha back-fill separate
commit; I7 no tag pushed (16/16). Regression: testkit capture+determinism 34/34 GREEN.

## § 8 — Verdict + Stage-1c readiness

**CONFIRMED.** §3.2.1 implemented + GREEN; D-C bit-exact MEASURED + HELD; thirteen gates
pass (sim/cross-stack gates N/A with §2.11 surrogates); shared files + CI landed;
integrity baseline held; I1–I7 hold. One DEFERRED infra item (schema-corpus fixture,
LFS-gated; §5) surfaced for the operator. STOP-E cleared.

**Stage 1c (mutation baseline ≥80% + PBT confirmation + verify_evidence + append-only +
integrity sweep + landing) is unblocked.** The determinism row is locked bit-exact.

---
date: 2026-06-09T04-12-03Z
author: phase-5-web-deploy-agent
phase: 5
artifact: sub-phase
artifact_id: web-deploy
verdict: SHIFTED-with-notes
verdict-state: SHIFTED
sub_phase: "web-deploy-5.1"
head_sha: 05dbd24a086643b5c0d4615d4874bf27ef0e45f4
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
parent_audits:
  - "[[web-build-track-batch-3-and-close-2026-06-09T03-54-41Z]]"
  - "[[web-build-track-charter-2026-06-09T02-39-17Z]]"
evidence_paths:
  - tools/productization/web-deploy/pipeline.py
  - tools/productization/web-deploy/verify.py
  - tools/productization/web-deploy/web/headless/driver.mjs
  - .github/workflows/web-deploy.yml
  - docs/productization/web-deploy.md
  - tools/testkit/probes/reports/phase-5-web-deploy.md
evidence_hashes:
  tools/productization/web-deploy/pipeline.py: sha256:13b029ddbc3d0109f0e4828913341f1fec6900a004b1eb94bba573311fc6cac5
  tools/productization/web-deploy/verify.py: sha256:5c8396a5790e9db41525f2d19d33d50da18d7a7e39bd180bf624f19b3d402380
  tools/productization/web-deploy/web/headless/driver.mjs: sha256:b72fb263f890e06c044842b59d3a077fde062a591f8d2b17c732715c362d0be8
  .github/workflows/web-deploy.yml: sha256:c34726b20b44577c4a0e2d17d8f3d95fb5b0f38214f20d8dddd6da54f909df36
  docs/productization/web-deploy.md: sha256:c1af727485e8de5ebe6a1071a816a9974aabd49a6429fc9c3da0272d05ea86fe
  tools/testkit/probes/reports/phase-5-web-deploy.md: sha256:0331210f3698a3b8f36e1c49143cca97bd4de08e59e2d0fea69c337ba80d329d
  tools/testkit/failing-tests-evidence/phase-5-web-deploy-2026-06-09T04-12-03Z.txt: sha256:7a895857cc53e569bb8c8b93f3ad63f6d66d171836f04f23f74fea8e77299d40
  # browser-emitted captures (ANGLE-Vulkan RX 6800 XT, secure-context localhost):
  capture/mandelbulb-explorer/capture-0.json: sha256:0866c015dc8fb99dec0c4a478373332c0389e28997d4c93d25811696f4a0d5c8
  capture/physarum/capture-0.json: sha256:56a2bdaa3eb6a343c34f1158cd19c8e0ce5ea705f31f096fab4b4c9e3e1a5781
  capture/strange-attractors/capture-0.json: sha256:03b4faf572cdc561c3bc99a771a5b23ff59604a2de162a20676d199054a1af53
  capture/ising-classical/capture-0.json: sha256:91e388e06b86efd76523b107a5add03f84d762e84530fd118a3aa0f323b2629d
  packages/reaction-diffusion-2d/web/dist/assets/index.js: sha256:a4633b832ac0d8c739bf8244dbd5ccbec5a8985fa56631390436c5c977b35288
deferred_items:
  - "rd2d / neural-ca browser round-trip diverges cross-implementation (browser Dawn f32 vs canonical wgpu-native) — sim-owner / operator: browser-specific canonical or tolerance-budget amendment, or structural-only browser gate"
  - "boids browser run-twice is non-deterministic (Dawn FP) — sim-owner / operator decision"
ci_activation:
  - { workflow: .github/workflows/web-deploy.yml, action: "created build-and-validate (matrix×7) + GATED-OFF deploy jobs; tag/PR/dispatch-triggered, not bare-main push — operator dispatch is the browser-delivery proof" }
commit_1_sha: 80d2fee08a0992ac6b320f7e67d0f694c3702440
commit_2_sha: dc7173c83030acb073621d37129e46e806302862
commit_3_sha: 05dbd24a086643b5c0d4615d4874bf27ef0e45f4
canonical_sim_selected: n/a
---

# Phase 5 web-deploy (5.1) — Completion report

> The FINAL Phase-5 pipeline. Build-and-validate the 7 Stack-B web frontends through a
> REAL headless browser, re-applying each sim's OWN established gate (web-build track) to
> the BROWSER-emitted capture. FACT = ran/read/measured this session (#8). Four-state
> verdicts. Commits direct to `main` (trunk-based). NO tag (I7). NO tolerance widened.

## § 0 — Headline

| | |
|---|---|
| **Commits** | `80d2fee` (new files), `dc7173c` (modify existing), `05dbd24` (this audit), + the #12 head_sha back-fill. — FACT |
| **Pipeline** | `tools/productization/web-deploy/` (pipeline.py §5.5 + verify.py + pinned-Playwright driver.mjs) + `.github/workflows/web-deploy.yml` (build-and-validate matrix×7 + GATED-OFF deploy) + `docs/productization/web-deploy.md`. — FACT |
| **Browser WebGPU** | **AVAILABLE locally** over a secure context (ANGLE-Vulkan, RX 6800 XT). CONTRADICTS the web-build track's "unavailable" — which was an `about:blank` (non-secure-context) probe artifact. The gate RAN LOCALLY, not deferred-to-CI. — FACT |
| **Gate result (7)** | **4 PASS / 3 DIVERGE** through the browser. PASS: mandelbulb, strange, physarum, ising. DIVERGE: rd2d, neural-ca (pointwise/bit-exact round-trip), boids (run-twice determinism). — FACT |
| **Tolerance** | **NONE added or widened.** `tolerance.toml` + `tolerance-budget.toml` byte-unchanged (sha `d190843…` / `e3922b3…`). The 3 divergences are characterized + surfaced, NOT relaxed. — FACT |
| **Integrity** | **0 HARD_FAIL / 14 SOFT_WARN** — invariant HELD (baseline digest). — FACT |
| **render_similarity / variant** | **0.9242 / 0.8702 floors UNAFFECTED** — pure additions; no such source touched. — FACT/INFERENCE |
| **deploy** | **GATED OFF** (`actions/deploy-pages` on `workflow_dispatch + confirm_deploy=true`; never run). — FACT |
| **Verdict** | **SHIFTED-with-notes** — pipeline delivered + the browser-WebGPU gate proven to RUN (locally + authored for CI); 4/7 clear their established gate through the browser; 3/7 exhibit characterized cross-implementation f32 divergence surfaced to operator/sim-owner; no widening; deploy gated off. |

## § 1 — Scope summary

Built the web-deploy build-and-validate pipeline over the 7 Stack-B WebGPU frontends from
the web-build track (phase plan § 6.1). Per sim: (1) Vite production build (exit 0); (2)
serve the bundle over a secure-context localhost, load in headless Chromium with WebGPU,
assert the WebGPU path engaged (`navigator.gpu` + real adapter + the settings panel
mounted — the apps have NO Canvas2D/WebGL fallback), drive the capture-export hook with
zero unexpected console errors; (3) re-apply the sim's OWN established gate
(`capture_roundtrip` / `observable` / `new_canonical`) to the browser-emitted capture via
`verify.py`, reusing the web-build track's thresholds byte-for-byte (parity-guarded). The
`deploy` job (GitHub Pages) is gated off.

## § 2 — Files added in commit 1 (`80d2fee`)

| Path | Purpose |
|---|---|
| tools/productization/web-deploy/pipeline.py | §5.5 discover/build/validate CLI; orchestrates build → browser drive → verify |
| tools/productization/web-deploy/verify.py | browser-emitted capture → each sim's established gate; thresholds parity-guarded vs gpu_gate.py |
| tools/productization/web-deploy/web/headless/driver.mjs | pinned-Playwright headless browser-WebGPU capture driver |
| tools/productization/web-deploy/web/headless/package.json + package-lock.json | pin Playwright 1.60.0 + its Chromium |
| tools/productization/web-deploy/web/embed/template.html | iframe embed template (deploy job, gated off) |
| tools/productization/web-deploy/smoke/test_pipeline.py | TDD harness (9 tests) |
| tools/productization/web-deploy/README.md, __init__.py(s) | tree scaffolding |
| docs/productization/web-deploy.md | spec doc (§5.6 template) |
| .github/workflows/web-deploy.yml | build-and-validate matrix×7 + gated-off deploy |
| tools/testkit/probes/reports/phase-5-web-deploy.md | pre-impl probe (§5.7) |
| tools/testkit/failing-tests-evidence/phase-5-web-deploy-2026-06-09T04-12-03Z.txt | TDD failing-first evidence (sha `7a89585…`) |

## § 3 — Files modified in commit 2 (`dc7173c`)

| Path | Diff intent |
|---|---|
| docs/productization/index.md | CREATED (§6.6 first sub-phase) — rows for all 5 Phase-5 pipelines |
| CHANGELOG.md | Phase-5 entry + web-deploy bullet |
| docs/architecture.md §11.6 | "Delivered" annotation for 5.1 (commit-1 SHA, back-filled in commit 3) |
| docs/perf-ledger.md | 7 `webgpu-headless-chromium` rows (browser-WebGPU wall-clocks + PASS/DIVERGE) |

## § 4 — Smoke harness results (browser-WebGPU gate, MEASURED LOCALLY)

Real browser WebGPU (ANGLE-Vulkan, RX 6800 XT, secure-context localhost), `pipeline.py
validate` per sim. Vite build exit 0 for all 7; WebGPU path engaged for all 7 (adapter +
panel mounted, zero unexpected console errors).

| Sim | Gate kind | Vite | WebGPU engaged | Established-gate verdict (browser capture) | wall (s) |
|---|---|---|---|---|---|
| mandelbulb-explorer | new_canonical | ✓ | ✓ | **PASS** — run-twice identical; f32-vs-f64 DE max_abs 1.5e-5 (== wgpu-native) | 0.83 |
| strange-attractors | new_canonical | ✓ | ✓ | **PASS** — run-twice identical; 11 pts on the dense f64 attractor envelope | 0.86 |
| physarum | new_canonical | ✓ | ✓ | **PASS** — run-twice identical; total_mass 22499.996 vs 22500 (rel 1.7e-7) | 1.66 |
| ising-classical | observable | ✓ | ✓ | **PASS** — energy −1.47 vs NumPy ensemble −1.418, z=1.46 < 3.0 | 38.17 |
| reaction-diffusion-2d | capture_roundtrip | ✓ | ✓ | **DIVERGES** — deterministic + correct to step 200 (1e-6); 0.074 > 1e-4 by step 2000 | 1.88 |
| neural-ca | capture_roundtrip | ✓ | ✓ | **DIVERGES** — Dawn f32 ≠ wgsl-canonical bit pattern; max_abs ~0.72–0.79 (not bit-exact) | 1.74 |
| boids-3d | new_canonical | ✓ | ✓ | **DIVERGES** — short-horizon 3.2e-3 + v_max OK, but run-twice NOT byte-identical (Dawn FP non-determinism, diverges after step 400) | 3.27 |

The `verify.py` harness itself is exercised locally without a browser by 9 smoke tests
(canonical-shaped bundles), all PASS: roundtrip accept (rd2d), bit-exact (neural-ca),
new-canonical run-twice + mass anchor (physarum), divergent-reject, nondeterminism-detect,
discovery, JSON contract, and the no-widening threshold-parity guard vs `gpu_gate.py`.

### § 4a — Disposition of the 3 divergences (NO widening; phase plan § 5a)

The browser-WebGPU f32 path (Chromium/Dawn over ANGLE-Vulkan, and independently Mesa
lavapipe in CI) is a DIFFERENT f32 implementation than the canonical's `wgpu-native`
(wgpu/naga over RADV). For the pointwise/bit-exact round-trips of sensitive systems
(rd2d, neural-ca) and the run-twice byte-identity of a sensitive flock (boids), this
cross-implementation difference is irreducible:

- **rd2d** — the browser is deterministic (run-twice byte-identical) and correct at setup
  (IC max_abs 3e-8, step-200 1e-6) with matching global ranges, but the f32 gray-scott
  pattern boundaries drift to 0.074 by step 2000. Same signature the web-build track used
  to reclassify strange/boids: sensitive f32, structure-preserving, but not a 1e-4 round-trip
  under a foreign f32 impl.
- **neural-ca** — bit-exactness (0/0) is implementation-specific by definition; Dawn ≠ RADV
  bit-for-bit (max_abs ~0.72–0.79, also run-to-run varying → Dawn FP non-determinism here too).
- **boids** — two browser runs are identical through step 400 then diverge (~0.11 by step
  1000): a 1-ULP Dawn run-to-run wobble amplified by flock sensitivity. The MANDATORY
  new_canonical determinism criterion fails in the browser (RADV wgpu-native was deterministic).

These are NOT tolerance-widening candidates. Per phase plan § 5a (investigate → if
irreducible, SHIFT to sim owner / propose a tolerance-budget amendment; the diverging
bundle does not ship — deploy is gated off regardless). **`tolerance.toml` is byte-unchanged.**
The dense pointwise / bit-exact / determinism gates remain validated by the web-build
track's `wgpu-native` `gpu_gate.py`. Operator/sim-owner options in `docs/productization/web-deploy.md` § 8.

## § 5 — Canonical sim chosen

n/a (web-deploy is a matrix over all qualifying sims, not a single-canonical sub-phase).

## § 6 — FACT / INFERENCE enumeration

- FACT — browser WebGPU is available over a secure context (localhost), unavailable on
  about:blank; MEASURED both (probe § 4 corrected table).
- FACT — the 4 PASS / 3 DIVERGE per-sim verdicts (measured twice, reproducible; § 4 table + perf-ledger).
- FACT — Vite build exit 0 for all 7; WebGPU path engaged for all 7 (adapter + panel + clean console).
- FACT — `tools/testkit/equivalence/tolerance.toml` (sha `d190843…`) + `tools/testkit/equivalence/tolerance-budget.toml` (sha `e3922b3…`) byte-unchanged; gpu_gate.py untouched (git clean).
- FACT — integrity `--all`: 0 HARD_FAIL / 14 SOFT_WARN (all 14 pre-existing phase-0/1/2 audit-link warnings).
- FACT — 9 smoke tests PASS; failing-first evidence sha `7a89585…`.
- INFERENCE — the 3 divergences are cross-implementation f32 (Dawn vs wgpu-native), not sim bugs (rd2d/neural-ca match at setup; boids dynamics correct short-horizon). Strongly evidenced, not bit-proven against a third impl.
- INFERENCE — render_similarity (0.9242) / variant (0.8702) floors unaffected — pure additions touch no such source; CI `test-render-similarity` confirms on the push sweep.

## § 7 — Four-state verdicts on per-sub-phase gates

| Gate | Verdict | Evidence path |
|---|---|---|
| Spec doc committed | CONFIRMED | docs/productization/web-deploy.md |
| Probe committed | CONFIRMED | tools/testkit/probes/reports/phase-5-web-deploy.md |
| Smoke harness committed and failing first | CONFIRMED | tools/testkit/failing-tests-evidence/phase-5-web-deploy-2026-06-09T04-12-03Z.txt (sha 7a89585…) |
| build-and-validate passes CI | SHIFTED (operator-dispatch) | web-deploy.yml is tag/PR/dispatch-triggered (not bare-main push); the browser-WebGPU gate is the operator's dispatch — the one workflow whose green proves browser delivery. Ran LOCALLY: 4/7 PASS, 3/7 characterized-divergent (§4) |
| At least one qualifying sim wired through | CONFIRMED | all 7 wired; 4 PASS their gate through the browser |
| Integrity gate does not block | CONFIRMED | 0 HARD_FAIL / 14 SOFT_WARN |
| No tolerance added/widened | CONFIRMED | tolerance.toml + tolerance-budget.toml byte-unchanged; verify.py thresholds byte-equal to gpu_gate.py (parity test) |
| deploy stays gated off | CONFIRMED | web-deploy.yml deploy job `if: workflow_dispatch && confirm_deploy=='true'` |

## § 8 — TDD discipline FACT

FACT: tests verified failing before implementation drafted on 2026-06-09T04-12-03Z (9
ERROR — `FileNotFoundError: pipeline.py`). Pytest output:
`tools/testkit/failing-tests-evidence/phase-5-web-deploy-2026-06-09T04-12-03Z.txt`,
sha256 `7a895857cc53e569bb8c8b93f3ad63f6d66d171836f04f23f74fea8e77299d40` (recorded in
commit `80d2fee` footer). Post-implementation: 9 passed.

## § 9 — §S.5 full sweep (this push)

- **Local pre-push (FACT):** integrity `--all` **0 HF / 14 SW** (digest unchanged); 9
  web-deploy smoke tests PASS; ruff check + format clean on the harness; tolerance.toml +
  tolerance-budget.toml byte-unchanged; gpu_gate.py untouched.
- **Post-push CI (`dc7173c`):** the push-triggered sweep ran (`audit-append-only`,
  `structure`, `tolerance-budget-check`, `ts-strict` GREEN at observation; `python-strict`,
  `integrity`, `cpp-strict`, `determinism`, `equivalence`, `test-render-similarity`, the
  per-sim test jobs in progress → confirmed at commit-4 back-fill below). **web-deploy.yml
  does NOT run on bare-main push** (tag/PR/dispatch, like every Phase-5 release workflow)
  — FLAGGED for the operator to `workflow_dispatch`; it is the one workflow whose green
  specifically proves browser delivery (and, on CI's lavapipe backend, its per-sim
  pass/diverge may differ from the local ANGLE-Vulkan measurement — both real browser WebGPU).
- **render_similarity (0.9242) + variant (0.8702): UNAFFECTED** — pure additions.

## § 10 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected | Measured | Disposition |
|---|---|---|---|
| C-1 | "headless browser WebGPU unavailable in-env" (web-build track) | AVAILABLE over a SECURE context; track's probe tested about:blank (non-secure) | CONTRADICTION — corrected; gate runs locally |
| C-2 | browser capture clears each sim's established gate | 4/7 yes; rd2d/neural-ca/boids diverge cross-implementation (Dawn vs wgpu-native) | SHIFTED — characterized, surfaced, NOT widened |
| C-3 | rd2d capture_roundtrip @ 1e-4 (wgpu-native 2.6e-5) | browser 0.074 (sensitive f32, deterministic, structure-preserving) | new-canonical-like signature under foreign f32; surfaced (§5a) |
| C-4 | boids run-twice byte-identical (RADV did) | browser non-deterministic after step 400 (Dawn FP) | mandatory determinism fails in-browser; surfaced |
| C-5 | render/variant floors | pure additions; untouched; tolerance.toml byte-unchanged | UNAFFECTED |

## § 11 — SURFACED for operator

1. **DISPATCH `web-deploy.yml`** (`workflow_dispatch`, confirm_deploy=false) — it does not
   run on bare-main push; its green build-and-validate is the browser-delivery proof. CI
   runs the gate on Mesa lavapipe (a 2nd browser-WebGPU backend); per-sim verdicts may
   differ from the local ANGLE-Vulkan measurement.
2. **3 cross-implementation divergences** (rd2d, neural-ca, boids) — sim-owner / operator
   decision: (a) mint a browser-specific canonical / tolerance-budget amendment (spec §2.6,
   operator-approved); (b) gate these at the structural/observable level for browser delivery
   (pointwise/bit-exact/determinism stays wgpu-native-validated); (c) pin a different browser
   WebGPU backend. Phase 5 does not patch sims.
3. **`tolerance-budget.toml` still says `phase = "phase-4"`** — left byte-unchanged
   (landed reality: all of 5.2–5.5 left it so; not in 5.1's widening scope). Operator may
   carry it to phase-5 separately.
4. **NO tag (I7)** — the phase tag `v0.5.0-phase-5` is the operator's separate ratified close.

## § 12 — Closing

Sub-phase 5.1 (`web-deploy`) — the FINAL Phase-5 pipeline — is **delivered**; verdict
**SHIFTED-with-notes**. The build-and-validate pipeline over the 7 Stack-B web frontends is
in place (Vite build → headless browser-WebGPU → each sim's OWN established gate on the
browser-emitted capture), with the `deploy` job gated off. The load-bearing browser-WebGPU
round-trip the web-build track deferred now RUNS — and, contradicting the track, runs
LOCALLY (browser WebGPU is available over a secure context; the "unavailable" was an
about:blank artifact). 4/7 sims clear their established gate through the browser
(mandelbulb, strange, physarum, ising); 3/7 (rd2d, neural-ca, boids) exhibit a real,
characterized, deterministic-where-applicable cross-implementation f32 divergence between
the browser's Dawn/ANGLE-Vulkan path and the canonical's wgpu-native path — surfaced to
operator + sim-owner per phase plan §5a, with **no tolerance added or widened**
(`tolerance.toml` byte-unchanged) and the dense gates still validated by the web-build
track's `gpu_gate.py`. Integrity held 0 HF / 14 SW; render_similarity (0.9242) + variant
(0.8702) floors unaffected. This sub-phase pushed NO tag (I7).

## § 13 — SHIFT (APPENDED 2026-06-09, post-CI-dispatch; § 0.3 append-only — no section above is edited)

The operator's first `web-deploy.yml` dispatch (run `27210300628`, on `89ea841`)
went 7/7 RED at the Validate step. The follow-up diagnosis session localized the
failure as post-capture/environmental and inferred **"not a missing dependency —
those steps all passed"**; full job logs (pulled with an Actions:read token)
**REFUTE that inference for 5/7 sims, and refute the single-cause framing
entirely** — there were TWO independent CI-environment failure modes. The install
steps that passed were the browser/LFS/build installs (Playwright + Chromium,
lavapipe, git-lfs, Vite), NOT the Python tool env: the workspace ROOT `[project]`
declares no dependencies, so the workflow's bare `uv run` resolved an EMPTY venv —
which the stdlib-only `discover`/`build` entrypoints masked until `validate`
reached `import verify`. This § 13 also revises § 11 item 1's implicit framing
that a red Validate would indicate the lavapipe gate verdict: this first red was
CI-harness plumbing; the lavapipe gate column is STILL unfilled.

**Mode A — 5/7 (boids-3d, strange-attractors, mandelbulb-explorer,
reaction-diffusion-2d, ising-classical).** Deciding log line (identical traceback
in all five; boids-3d job `80337242023`):

```
File ".../web-deploy/pipeline.py", line 218, in run_pipeline_for_sim
    import verify  # type: ignore
File ".../web-deploy/verify.py", line 42, in <module>
    import numpy as np
ModuleNotFoundError: No module named 'numpy'
```

The traceback sits AFTER the driver returned rc=0 with capture bundles in hand —
**browser-WebGPU capture on lavapipe SUCCEEDED for these 5**; the venv, not the
gate, failed. `results.json` was never written (process died pre-serialization).
FIX (commit `62ed5d9`): a per-sim `uv sync --package "${{ matrix.sim }}"` step
before Validate (workspace member names match matrix sim names 1:1), installing
ONLY deps already declared in `packages/<sim>/pyproject.toml`
(`bit-physics-testkit`, `bit-physics-diagnostics`, `h5py`, `numpy`, ...), which
covers verify.py's numpy import, the testkit `capture`/`equivalence` closure, and
the ising/strange/boids reference-module imports; Validate then runs
`uv run --no-sync`. No ad-hoc installs, no new dependency declarations,
`verify.py` byte-untouched.

**Mode B — 2/7 (neural-ca, physarum).** Deciding `results.json` notes line
(neural-ca job `80337242009`, duration 32.06s; physarum identical):

```
"notes": "driver failed (rc=1): driver FAIL — TimeoutError: page.waitForFunction: Timeout 30000ms exceeded."
```

That is the `driver.mjs` `__bitPhysicsReady` app-READINESS wait (30s), calibrated
on local RADV and never measured under software rasterization; lavapipe's pipeline
compilation exceeds it for these two heavier sims. FIX (commit `62ed5d9`): the
wait is now env-overridable (`BITPHYSICS_READY_TIMEOUT_MS`, default unchanged
30000 — local behavior byte-identical), set to 180000 in the CI Validate step
only, and the driver logs measured time-to-ready per run so the next green run
yields the actual lavapipe values for declaration here (measured-then-declared
applies to harness waits too). **This is a harness readiness wait, NOT a physics
tolerance** — the 300s capture wait, `tolerance.toml`, `gpu_gate.py`, the
established gates, and the fallback flags are all byte-unchanged. If a sim still
misses 180s, that is a real finding to surface, not a number to bump again.

Disposition: both modes **SHIFTED** (CI-harness environment, not physics; the
lavapipe gate verdicts of §§ 4/11 remain PENDING the re-dispatch). Local checks at
fix time: web-deploy smoke 9/9 green; workflow YAML parses; `node --check` clean.
Fix commit: `62ed5d9`. Audit-append commit: see Convention #12 back-fill below.

appended_by: phase-5-web-deploy-ci-fix-agent
appended_head_sha: 62ed5d9
appended_commit_sha: 947ad30  # Convention #12 back-fill

---
artifact_id: phase-4-batch-2-eulerian-smoke-neural-probe
sub_phase: phase-4-batch-2 (neural-rendered frontier; Sim B of 2)
stage: 0 (pre-implementation probe + anchor verification + D-class resolution)
date: 2026-05-31
head_sha: 6b73099
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 32848bd8ad2b4d784c9e7fd912b1b1c41940de4833d73dab4a56a705db944b4c
evidence_paths:
  - docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md
  - packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/sim.py
  - common/common-3dgs/src/common_3dgs/coupling.py
  - common/common-3dgs/src/common_3dgs/render.py
---

# Pre-implementation probe — eulerian-smoke-neural (phase-4 batch-2, Sim B / 2; "3dgs-smoke")

> Live-repo Stage-0 probe per the batch-2 charter
> (`docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md` §3.2 + §4.2 + §5).
> The §5.11 "3dgs-smoke" reference sim: couple the landed `eulerian-smoke-stack-e` volumetric
> smoke (Stam/Fedkiw stable fluids) to a Gaussian cloud and render it. Forward-render sim
> (NOT differentiable). FACT = ran/read at HEAD `6b73099`; INFERENCE = reasoned.

## 0. Environment

| Surface | Value | Source |
|---|---|---|
| HEAD | `6b73099` (Sim A 3dgs-mpm-sh-update LANDED + CI-GREEN at this tip) | `git rev-parse HEAD` (FACT) |
| Preflight | `python3 tools/dispatch/preflight-phase.py 4` → ALL PASSED (exit 0) | Sim A this session (FACT) |
| Integrity | 0 HARD_FAIL / 14 SOFT_WARN, rc 0, digest `32848bd8…b944b4c` (drifts as golden tables land; COUNTS are the invariant) | this session (FACT) |
| Cross-phase replay | base `v0.3.0-phase-3`; ok=False = the two known environmental artifacts (pytest `-W error timeout` config + mutmut unprovisioned), 6/8 substantive gates PASS → phase-3 intact (same disposition as the Sim-A probe §0.1) | Sim-A probe (FACT) |
| LFS bootstrap | `source tools/lfs/setup-lfs-s3-local.sh` → exit 0 (R2 live; Sim-A R2 push + CI R2-fetch verified) | this session (FACT) |
| Parent physics (smoke) | `packages/eulerian-smoke-stack-e/` — `stable_fluids_step_3d` + `_taylor_green_initial_condition` + `canonical_params_3d` (`packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/sim.py:60-72`); the 3D `density` field is the smoke (`packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/sim.py:218`) | read (FACT) |
| WU-C hooks | `common/common-3dgs/src/common_3dgs/coupling.py:97` `default_density_to_opacity` (`1−exp(−d)`), `:163` `PhysicsCoupling.update_opacity_from_density`; `common/common-3dgs/src/common_3dgs/render.py:116` `render` | read (FACT) |

## 1. Design (Stage-1a/1b plan)

- **Package:** `packages/eulerian-smoke-neural/` (§0.3 `<sim>-<variant>` flat, the `eulerian-smoke-diff`
  batch-1 precedent). Import `eulerian_smoke_neural`. Deps: `bit-physics-common-3dgs`,
  `bit-physics-common-warp`, `eulerian-smoke-stack-e`, testkit, diagnostics, warp.
- **Coupling (NumPy):** `density_to_gaussians(density (n,n,n), *, max_gaussians=256, ...)` — pick the
  **K densest voxels** (deterministic argsort; D-SAMPLE), positions = voxel centres `(i+0.5)/n`,
  opacities = `default_density_to_opacity(density[active])` (the WU-C Beer-Lambert hook), isotropic
  scales (~`0.5/n`), identity rotations, degree-0 DC SH = a fixed smoke colour. (D-COV: isotropic
  blobs for the MVP — the velocity-gradient covariance stretch `F=I+dt·∇u` via Eq. (8) is a
  documented further extension, NOT this sim.)
- **Driver:** evolve the smoke at a SMALL grid (`n≈24`; canonical is `n=128` → 2M voxels,
  CPU-intractable to render) via `stable_fluids_step_3d` from the Taylor-Green IC; per captured
  frame couple→render. **Physics-equivalence-vs-parent holds by construction** (the same
  `stable_fluids_step_3d` + IC → the `density` field is bit-equal to a direct `eulerian-smoke-stack-e`
  rollout at the same `n`/seed).
- **D-DET:** render bit-exact same-hw (warp atomic compositing serial CPU — the Sim-A result). MEASURE
  at 1b. **Apply the Sim-A lesson: `wp.config.quiet=True` in the conftest FROM Stage 1a** (Warp
  module-load stdout timing varies run-to-run and would break the gate-13 evidence hash); capture the
  failing-tests evidence in a clean `uv sync --all-packages` venv; run the gate-13 replay with a
  pre-synced worktree (the `replay_failing_tests` no-pre-sync path appends intermittent uv-build
  stdout — surfaced in the Sim-A close).

## 2. Verification-anchor plan (≥3 independent; pinned to the discretized code)

**Prong-1 — coupling-correctness numerical golden:**
- **A1 (closed-form, Beer-Lambert):** `default_density_to_opacity(d) = 1−exp(−d)` at `d ∈ {0, ln2, 5}`
  → `{0, 0.5, 0.993262…}`; monotone, bounded `[0,1)`. Source: Beer-Lambert volume-rendering opacity
  (hand-derivation); the WU-C `default_density_to_opacity` (`common/common-3dgs/src/common_3dgs/coupling.py:97`).
- **A2 (Kerbl 2023 Eq. (6) alpha-compositing — the landed WU-C render anchor):** a single centred
  Gaussian of known opacity `α` and DC colour `c` over a black background composites the centre pixel
  to `≈ α·c` (front-to-back emission-absorption; Gaussian peak = 1 at centre). Source: Kerbl et al.
  2023 (ACM TOG 42(4)) Eq. (6); the `common-3dgs` renderer. *Stage-0/1b: confirm the centre-pixel
  closed form against the renderer's compositing.*
- **A3 (zero-density degenerate — fully independent):** `density ≡ 0` → no active Gaussians / `α=0`
  → render == the background frame. Source: hand-derivation (degenerate).

**Prong-2 — perceptual render-similarity golden:** render the smoke→Gaussian frames vs OWN committed
golden PNGs; floors PSNR≥28 / SSIM≥0.85 / LPIPS≤0.15 (deterministic own-pipeline regression).

## 3. PBT / determinism / capture / mutation / CI

- **PBT (≥2):** `opacity_monotone_bounded` (random density ≥ 0 → `α` monotone non-decreasing, `α∈[0,1)`)
  + `render_similarity_self_identity` (a frame rendered twice → PSNR=∞ / SSIM=1; the WU-C PBT reused,
  exercising determinism). Re-declared on falsification, never widened.
- **Determinism:** registry `[neural-rendered.eulerian-smoke-neural]` (or `[volumetric-grid.eulerian-smoke.neural]`
  — read the schema/landed shape first, §S.2; the landed family is `neural-rendered.<sim>`); MEASURE at 1b.
- **Capture:** smoke + gaussian-transform history `.h5` (`common_warp.Capture` + `write_capture`).
- **Mutation:** `[targets.eulerian_smoke_neural]` (the coupling source); advisory (§2.13; mutmut
  unprovisioned in the package venv — MEASURE deferred, the batch-1/Sim-A precedent).
- **CI:** `python-strict.yml` `test-eulerian-smoke-neural` job with a selective LFS pull of the golden
  renders + smudge assert (mirror `test-3dgs-mpm-sh-update`).

## 4. D-class resolutions

| D-class | Resolution |
|---|---|
| D-SAMPLE | top-K densest voxels (K≈256), deterministic argsort (Stage-1b tune). |
| D-COV | isotropic blobs (MVP); `∇u` covariance stretch deferred (documented). |
| D-GRID | small `n≈24` for CPU-tractable render (canonical 128 too large); physics-equiv holds at any `n`. |
| D-DET | render bit-exact; conftest `wp.config.quiet=True` from 1a; MEASURE at 1b. |
| D-CI | `test-eulerian-smoke-neural` + selective LFS pull. |
| D-TAG | NO (I7). gate-14 N/A (single-stack); WU-C neural-axis floor applies. |
| D-PLACEMENT | `packages/eulerian-smoke-neural/`; spec `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-neural.md` (de-stub the WU-G stub). |

## 5. Disposition

**NO BLOCK.** Forward-render sim; foundation hooks confirmed (the WU-C density→opacity coupling is
purpose-built for this); anchors named to source, ≥3 independent. The Sim-A gate-13 / warp-quiet /
clean-venv lessons are pre-applied. Proceed to Stage 1a (scaffold + RED).

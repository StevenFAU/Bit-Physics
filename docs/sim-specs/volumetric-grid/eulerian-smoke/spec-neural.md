# spec-neural.md — eulerian-smoke (neural-rendered variant; "3dgs-smoke")

> **Status:** Phase-4 batch-2 Sim B; de-stubbed at Stage 1a from the Phase-4.0 pre-stage slot.
> **Parent reference sim:** `docs/sim-specs/volumetric-grid/eulerian-smoke/spec-ref.md`.
> **Variant type:** `neural` (3DGS-coupled render; spec § 5.11 "3dgs-smoke"). **Primary stack:** E.
> **Package:** `packages/eulerian-smoke-neural/` (import `eulerian_smoke_neural`).
> **Foundation consumed:** § 4.2.C (WU-C: `PhysicsCoupling`/`default_density_to_opacity`/`render`/`render_similarity`).
> **Stage-0 probe:** `tools/testkit/probes/reports/eulerian-smoke-neural.md`.
> **Charter:** `docs/_audits/phase-4/batch-2-charter-2026-05-31T20-04-45Z.md` § 3.2 / § 4.2.

## § 1 Scope

Couple the landed `eulerian-smoke-stack-e` volumetric smoke (Stam/Fedkiw stable fluids; the 3D
`density` field) to a Gaussian cloud and render it. One Gaussian per sampled smoke voxel; per-frame
opacity from density (Beer-Lambert). The first smoke→3DGS coupling in the portfolio.

## § 2 Physics / governing equations

- Smoke (UNCHANGED, reused from the parent): `stable_fluids_step_3d` (advect → diffuse → project)
  from the Taylor-Green IC (`eulerian-smoke-stack-e`).
- Coupling (NEW): per active voxel, `alpha = 1 − exp(−density)` (Beer-Lambert; the WU-C
  `default_density_to_opacity`), isotropic covariance, degree-0 DC SH = a fixed smoke colour;
  render via Kerbl 2023 Eq. (6) emission-absorption alpha-compositing (`common_3dgs.render`).

## § 3 Verification surfaces

Two-pronged (spec § 5.11): (1) coupling-correctness numerical golden (≥3 anchors, § 8);
(2) perceptual render-similarity vs OWN committed renders (§ 9). Plus physics-equivalence vs the
parent (the smoke `density` field bit-equal to a direct `eulerian-smoke-stack-e` rollout).

## § 4 Determinism

Bit-exact, same-stack-same-hw, seed-pinned. Composes the smoke step (serial `wp.launch` f64) →
coupling (deterministic NumPy: argsort + Beer-Lambert) → render (atomic-free serial CPU
`wp.launch`). Rasterization atomic-ordering is the sensitive surface — MEASURED at Stage 1b. No EFECT.

## § 5 Capture

Coupled-sim `.h5` (+ `.json`): smoke `density` + the gaussian-transform history (positions,
opacities) per captured frame. Written via `common_warp.Capture` + `write_capture`.

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

- `opacity_monotone_bounded` (variant-axis) — opacities ∈ `[0,1)` + monotone in density (Beer-Lambert).
- `render_similarity_self_identity` — a frame rendered twice scores PSNR = ∞ / SSIM = 1 (determinism).

## § 7 Citations (Cat 1)

- Kerbl et al. 2023 (ACM TOG 42(4)) — Eq. (6) emission-absorption alpha-compositing (the render).
- Beer-Lambert volume-rendering opacity (`alpha = 1 − exp(−density)`).
- Stam, J. (1999) "Stable Fluids" — the parent smoke solver.

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

- **A1** Beer-Lambert opacity `1 − exp(−d)` at known densities (the WU-C `default_density_to_opacity`).
- **A2** Kerbl 2023 Eq. (6) alpha-compositing: a single centred Gaussian (opacity `a`, colour `c`)
  renders the centre pixel to `≈ a·c` over a black background.
- **A3** zero-density degenerate: `density ≡ 0` → all opacities 0 → the render is the background.

## § 9 Replayable capture

`captures/eulerian-smoke-neural-ref/` + committed golden renders
`tools/testkit/golden/renders/eulerian-smoke-neural-canonical-frame-{N}.png` (LFS). Floors (§ 2.12):
PSNR ≥ 28 / SSIM ≥ 0.85 / LPIPS ≤ 0.15 (`tools/testkit/equivalence/tolerance.toml`
`[render_similarity.neural-rendered.eulerian-smoke-neural]`).

## § 10 Determinism ↔ capture

Registry `[neural-rendered.eulerian-smoke-neural]` (`tools/testkit/determinism/registry.toml`)
`class = "bit-exact"` ↔ capture sidecar `determinism.claimed` (MEASURED at Stage 1b).

## § 11 PBT

§ 6 invariants under `tests/test_pbt_invariants.py` (Hypothesis). Re-declared on falsification,
never widened.

## § 12 Perf-ledger

`docs/perf-ledger.md`: an `eulerian-smoke-neural` canonical-render wall-clock row (gate-12).

## § 13 Gate-13

Landing replays the Stage-1a failing-tests commit via `replay_failing_tests.py`; normalized hash
matches (`tools/testkit/failing-tests-evidence/eulerian-smoke-neural-<UTC>.txt`). The conftest
suppresses Warp's module-load chatter so the evidence is deterministic — version-adaptively
(`wp.config.log_level = wp.LOG_WARNING` on a newer Warp that deprecated `wp.config.quiet`;
`wp.config.quiet = True` on the 1.13.0 authoring pin, which predates the `log_level` API); the
replay worktree is pre-synced.

## Gate-14 / mutation

Gate-14 N/A (single-stack Stack E; no cross-stack neural sibling) — the WU-C neural-axis floor +
physics-equivalence-vs-parent apply. Mutation target `[targets.eulerian_smoke_neural]` (advisory;
oracle-grounded, snapshots forbidden). `render_similarity` (0.9242) + `variant` (0.8702) HARD gates
touched as CONSUMER only → re-confirmed passing at landing.

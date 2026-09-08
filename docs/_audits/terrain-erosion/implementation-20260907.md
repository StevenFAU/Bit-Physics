---
report_id: canyon-lab-implementation-20260907
phase: terrain-erosion
status: local-verified-release-in-progress
evidence_paths:
  - packages/terrain-erosion/evidence/pytest.txt
  - packages/terrain-erosion/evidence/browser-gate.json
  - packages/terrain-erosion/evidence/browser-lavapipe.json
  - packages/terrain-erosion/evidence/diagnostics.json
  - packages/terrain-erosion/evidence/ui/results.json
  - packages/terrain-erosion/evidence/scenarios.json
  - packages/terrain-erosion/evidence/accelerated.json
  - packages/terrain-erosion/evidence/performance.json
  - packages/terrain-erosion/evidence/soak-checkpoint.json
  - packages/terrain-erosion/evidence/failing-replay.json
  - packages/terrain-erosion/evidence/integrity.txt
---
# Canyon Lab implementation — 2026-09-07

Status: local implementation, canonical gates and the 30-minute soak passed; remote
release workflow is being completed. This is a first-order release baseline,
not a claim that every item in the original research roadmap is implemented.

## Delivered

A new `terrain-erosion` Python/WebGPU package. Four synthetic scenarios; shared
finite-volume face fluxes; hydrostatic HLL water; wet/dry states; layered rock
incision; loose-cover shielding/entrainment; sediment transport and exponential
settling; conservative alluvium-only talus; signed external-volume ledgers.

The renderer reads the production GPU state directly. Stratified terrain,
water, velocity arrows, cut/cover/resistance overlays, cross-sections, orbit/pan,
focus and orthographic plan view are coupled to the live fields. Water ripple
animation reads the actual GPU clock. Decorative normals do not affect physics.

Spatial water/dig/build/resistance/rain/source tools, discharge and material
controls, play/step/speed, checkpoint/restore, A/B, exact stroke undo, edit replay
and versioned project import/export are implemented. A bounded GPU presentation
queue avoids hiding overload behind an ever-growing command backlog.

## Common integration and existing-simulation review

- `common/common-ts/src/context.ts`: adapter/device negotiation, imported as
  browser-safe source; no Node capture dependencies bundled into the browser.
- `common/common-web/src/panel-shell.ts`: house instruments and capture hook.
- `common/common-web/src/capture-export.ts`: canonical browser capture protocol
  and isolated capture/live-loop coordination.
- Common testkit manifest/HDF5 writer and reader, Tier-1 health and Tier-2 scalar
  conservation; determinism, tolerance and golden-evaluator registrations.
- Heat's same-kernel isolated proof pattern and LBM's gather/ping-pong approach
  informed implementation. MPM/SPH/PIC-FLIP were assessed but not coupled: their
  3D representations would consume the landscape budget without improving this
  depth-averaged model. Their source is unchanged.

No generic framework or new common API was necessary. The numerical kernels,
terrain renderer and project format remain package-local.

## Verification evidence

All paths are repo-relative under `packages/terrain-erosion/evidence/` unless
otherwise stated.

- `pytest.txt`: 17 tests; flux anchors, lake at rest/wet island, closed/open
  budgets, exponential settling, incision/cover, unsafe timestep refusal,
  repeatability, random states, Hypothesis transfers, smooth standing-wave
  first-order convergence and negative controls.
- `browser-gate.json`, `browser-lavapipe.json`: production bundles, two fresh
  browser contexts per backend, field identity and live NumPy f64 comparisons.
  The fixed gate is 32² with checkpoints 0,20,100 for lake/dam/settling/channel.
  Absolute error cap 2e-4 was declared before implementation; observed errors
  are substantially smaller. No existing tolerance budget was widened.
- `diagnostics.json` and `captures/geomorphology/terrain-erosion/`: schema-valid
  browser-produced HDF5 capture, finite-state and conserved-scalar checks.
- `ui/results.json`: actual browser interactions, exact replay/undo/import,
  viewport overflow checks. Images reviewed separately, including narrow and
  200% zoom layouts; these checks are not substitutes for physical verification.
- `scenarios.json`: fixed 6000-step scenarios and paired interventions, real
  incision/deposition and distinguishable water response. Common prospective
  minimums: incision .1 m³, deposition .01 m³, intervention water L1 .05 m³;
  normalized budgets <=2e-4. No canyon-shape validation claim.
- `accelerated.json`: 512,000 steps / roughly 40 hydraulic minutes, including
  f64 re-summation of the raw GPU reservoirs. Finite and budget-bounded.
- `soak-checkpoint.json`: completed 1802.45 wall seconds, 432,608 steps and
  2059.05 hydraulic seconds at 256². No guard failures or browser errors; maximum
  normalized water error 9.59e-6 and grain error 1.18e-4 (cap 2e-4). A dig edit
  at minute five remained effective. Coarse browser heap counters do not establish
  total-memory stability. This tests the final numerical kernels; subsequent
  camera, overlay and presentation-queue refinements have separate UI checks.
- `performance.json`: 128²,256²,512² at 1440×900 on AMD RDNA2, Chrome 148.0.7778.96;
  60 rendered fps, about 240 substeps/s. Achieved simulated seconds per wall
  second decrease with resolution (approximately 2.76,1.30,.75). Measurements
  were made with a concurrent soak; allocated solver bytes exclude renderer,
  browser and checkpoint memory and are explicitly not total VRAM claims.
- `failing-replay.json` / `.txt`: original failing-output hash agrees with the
  footer of pre-implementation commit c5aef3b; isolated tests from that commit
  fail with the missing implementation. Cwd/timing-dependent traceback text is
  not falsely claimed byte-identical across replay environments.
- `integrity.txt`: scoped Cat 1–5/X checks; zero hard failures or warnings.

## Problems found and corrected

The initial broad terrain ripples obscured the river; scene shaping and camera
framing were refined. Visual inspection caught layout problems missed by DOM
assertions. Routine full-state readback was replaced with GPU-reduced statistics.
Snapshot step counters are captured before asynchronous copies, avoiding a
restore/replay race. Imports validate physical parameters and ordered events
before replacing the live GPU state.

An initial long run exposed accumulation drift. A Kahan-style revision was
insufficient on the tested compiler path. The final external ledgers use exact
coarse 1/16 m buckets and bounded residuals, carried through snapshots, captures
and diagnostics. The original failed measurements remain in
`probe-before-compensation.json` and `probe-kahan-soak.json`. The gate was not
loosened. `soak-checkpoint.json` is the final bounded-ledger run.

## Deliberate scope differences and remaining limits

The research plan's MUSCL/SSP-RK2 transport is not shipped: the current scheme is
first order, and convergence tests and UI labels say so. Higher order needs its
own positivity, wet/dry and steep-bed investigation before replacing this robust
baseline. The current model has one suspended sediment class, no bedload sorting,
no undercuts/arches or geological-time transport, and no laboratory calibration.

The A/B view toggles complete states using one camera; it is not two simultaneous
viewports. History has one explicit saved point and one stroke undo, plus a full
ordered edit replay, rather than an arbitrary checkpoint timeline. Terrain
resolution changes restart the project instead of silently regridding it.

Only the available discrete GPU and software Vulkan backend were tested. An
integrated GPU/device matrix, touch usability study, total-browser memory audit,
full forced-MMS suite and controlled steep-bed solution verification remain
follow-up work. The synthetic scenario checks establish behavior, not predictive
geomorphology. M6/M7 frontier tracks remain intentionally separate.

## Assessment (subjective scores, not test verdicts)

| Category | Score / 10 | Reason |
|---|---:|---|
| Interaction | 8 | Consequential tools, sections, replay and exact restore; fuller history would help |
| Visual presentation | 7.5 | Clear stratified terrain and responsive water; more natural cliff detail and stronger lighting would raise it |
| Performance | 8.5 | Dense GPU state, small diagnostics and bounded queue; integrated-GPU evidence still missing |
| Numerical verification | 8 | Independent reference, analytic anchors, negative controls, budgets and two backends; broader PDE tests remain |
| Physical realism | 6.5 | Useful coupled model; first-order transport and empirical single-class erosion limit fidelity |
| Repository integration | 9 | Existing context, UI, captures, diagnostics, registry and deploy gate reused |

Highest-value follow-ups: (1) higher-order wet/dry transport with steep-slope
benchmarks; (2) a bounded multilayer undercut/arch mode with support/collapse
accounting; (3) bedload and grain sorting; (4) richer checkpoint comparisons and
calibrated scene authoring. Integrated-GPU measurements should precede raising
quality defaults.

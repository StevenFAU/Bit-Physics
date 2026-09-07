# Canyon Lab pre-implementation probe — 2026-09-07

Inspected repository HEAD 69265d2 before implementation. User authorized full
implementation and integration. No external code is vendored; cited papers are
algorithm references, so no upstream software SHA is claimed.

Verified public existing surfaces by reading source:
- common/common-ts/src/context.ts: createContext(options), DeviceContext.
- common/common-web/src/panel-shell.ts: createSettingsPanel, PanelShellOptions.
- common/common-web/src/capture-export.ts: exposeCapture, field,
  runCaptureExclusive, CaptureBundle.
- Heat: same production kernels used for canonical proof, isolated capture.
- LBM: gather/ping-pong buffers; no floating point atomic requirement.
- MPM/SPH/PIC-FLIP: full 3D state cost and different physical representations;
  no solver dependency appropriate for the landscape core.

New planned public API (not existing-source claims): reference.initial, flux,
step, stable_dt, budgets; browser CanyonGpu, CanyonRenderer, scenes, capture.
Acceptance fixture path: packages/terrain-erosion/tests/test_reference.py.
Evidence: tools/testkit/failing-tests-evidence/terrain-erosion-20260907.txt.
Reference spec: docs/sim-specs/geomorphology/terrain-erosion/spec-ref.md.

Hardware visible: AMD Navi21 discrete GPU; actual browser adapter must be recorded.
M0 explicitly starts first-order HLL to establish positivity and visible incision.
Second order, other adapters, and long-run gates remain acceptance work, not claims.

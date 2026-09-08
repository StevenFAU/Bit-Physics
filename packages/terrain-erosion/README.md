# Canyon Lab

WebGPU shallow-water flow coupled to layered bedrock, loose cover and suspended
sediment. Sculpt a river, divert it, breach a sediment dam, or compare cover
shielding. Rendered geometry comes directly from the simulation buffers.

```sh
uv sync --package terrain-erosion --extra dev
uv run --package terrain-erosion pytest packages/terrain-erosion/tests
cd packages/terrain-erosion/web
npm ci
npm run dev
npm run build
```

Use Orbit (or right drag) to navigate and the tool shelf to edit. Save point /
Restore includes water, rock, sediment, source parameters, clock and ledgers.
The Instruments panel contains material accounting, isolated production-kernel
analytic checks, quality controls and project import/export. Space toggles play.

The solver is an original finite-volume HLL implementation with hydrostatic
reconstruction, matching bed pressure corrections, GPU CFL reduction, bounded
material transfers and conservative alluvium-only talus. f64 reference in
`terrain_erosion/reference.py`; f32 production in `web/src/core.wgsl`.

Reuse: `common-ts/context` for device negotiation; `common-web/panel-shell` and
`capture-export` for house instruments and browser capture. Heat's isolated
canonical-fixture pattern and LBM's gather/ping-pong design inform the runtime.
No change to existing MPM, SPH or PIC/FLIP solvers is needed.

This is an illustrative single-class dilute sediment model. The first-order
baseline does not model caves, bedload sorting, cantilever failure, infiltration
or geological timescales. Analytic checks verify implementation, not real-world
canyon prediction. See the adopted reference spec and implementation evidence.

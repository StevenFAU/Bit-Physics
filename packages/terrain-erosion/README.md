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

## First experiments

1. **Cut the Plateau:** save a point, select Dig and cut a shortcut across a
   bend. Resume, then compare A/B and open Section to inspect the bed and water.
   Use the incision overlay to distinguish removed rock from water color.
2. **River Heist:** build a low loose-sediment barrier across one route, or dig
   a competing route. Watch how the water redistributes; a granular barrier can
   itself erode.
3. **Break the Dam:** notch the sediment dam and watch the advancing water and
   downstream deposition. This is an illustrative breach, not a safety model.
4. **Sediment Shield:** compare the covered right half with the bare left half.
   Inspect loose cover and incision separately; they are different reservoirs.

The hydraulic clock is seconds on a 32 m domain. Playback changes the number
of numerical substeps, while erosion response changes empirical material rates.
Neither is a geological-years conversion. Higher resolution restarts the scene;
export your project first to retain a state. Shift/middle drag pans, double-click
focuses in Orbit, and Overhead switches to an orthographic plan view.

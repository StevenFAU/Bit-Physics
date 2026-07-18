# Flow Lenia M3 visual laboratory validation

Date: 2026-07-18

## Implemented laboratory surface

M3 keeps the M2 global-parameter solver and adds a deterministic manipulation and observation
layer:

- fixed-step event scheduling for pipette, add, erase, and stir brushes;
- an explicit open-system GPU ledger for add/erase and mass-closed displacement impulses for
  pipette/stir;
- pause, single step, 0.25×–4× time controls, pan, pinch/wheel zoom, reset, and occupied-mass fit;
- read-only local sampling of mass, density, affinity, pressure alpha, flow, displacement, clamp,
  all nine kernel perceptions, and all nine growth responses;
- organism glow, channels, affinity, flow, pressure, and flux views plus optional contours, adaptive
  flow glyphs, and render-only trails;
- a spatial three-ring kernel inset and bell-response plot with the inspected cell plotted on the
  curve;
- keyboard, pointer, secondary-button, wheel, pinch, and long-press radial touch-tool paths.

The six authored cards are Affinity swimmer, Spinner collision, Dividing droplets, Pressure
ablation, Sigma phase, and Expansion trap. Pressure ablation and Sigma phase allocate a second
solver lazily and advance both sides synchronously from identical mass bytes. All card source notes
identify them as Bit-Physics-authored transformations of the frozen ecosystem-v1 configuration;
no third-party preset data or media is redistributed.

## Event and ledger contract

Events are sorted by requested step and consumed before the relevant scientific operation:

1. add and erase execute before spectral perception;
2. normal Flow Lenia perception and pressure compute transport;
3. pipette and stir add component-bounded displacement impulses;
4. the unchanged exact finite-square destination gather transports all mass.

At most 32 records share a boundary. Add and erase update the mass buffer cell-locally and tally
their actual f32 deltas into commutative atomic u32 counters at 1/65,536 mass-unit resolution.
Metrics reconcile current mass against initial mass plus credited additions minus debited removals.
Pipette and stir do not touch those counters because their displacement still passes through the
closed gather.

The committed same-adapter event replay schedules add, erase, pipette, and stir across four fixed
boundaries, runs 32 steps twice, and produces identical final hashes:

`036e16fa6686c61cdcfc3425933b30e6c30cae011e3fc5ec7845c50c2a7d22b5`

It credited 2.14484 mass units, debited 10.52699, and ended with relative ledger error 1.40e-6.
The separate 24-step pipette/stir case left both open counters exactly zero and ended at 1.27e-6
relative drift. M3 uses a 1.2e-4 structural ceiling for open-tool/card gates to honestly include
fixed-point ledger quantization; the unchanged M2 closed-model gate retains its tighter 5e-5 limit.

## Six-card and ablation gates

Each authored 128² card runs for 64 steps with zero negative or non-finite values. Relative ledger
errors ranged from 1.10e-6 to 3.40e-6, and every card stayed below the declared clamp bound. Both
comparison cards also ran their synchronized second side:

| Card | Primary max density | Comparison max density | Absolute peak delta | Result |
|---|---:|---:|---:|---|
| Pressure ablation | 2.4974 | 11.5226, pressure off | 9.0252 | stable and divergent |
| Sigma phase | 3.8272, sigma 0.38 | 3.0711, sigma 1.05 | 0.7561 | stable and divergent |

The divergence check ensures the comparison is a causal solver ablation rather than two labels on
one rendered state. These outcomes are demonstrations for the authored regimes, not general claims
about agency, reproduction, or evolution.

## Render-only integrity and product gate

Every scientific renderer binding is `read-only-storage`. Scene rendering writes a presentation-only
texture; two additional presentation textures accumulate and display trails. A browser gate hashes
the live scientific mass, changes mode, contours, glyphs, persistence, and camera, renders eight
frames, then hashes mass again. The before/after bytes are identical.

The browser product gate also verifies six experiment cards, five tools, six scientific views, two
inspector plots, keyboard-focus metadata, and five radial touch choices. A 256² synchronized solver
pair owns 52.02 MiB, below the provisional 128 MiB budget before localized genomes. The committed
environment is headless Chromium 150 with Dawn/ANGLE Vulkan on the reported AMD RDNA2 adapter.

## Reproduction

From `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run check:m2
npm run check:m3
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_BIN=/path/to/chromium \
  npm run gate:m3
```

The measured report is committed at
`packages/flow-lenia/web/artifacts/m3-browser-gates.json`. `npm run gate:m2` remains an independent
regression of the f64-derived M2 numerical, long-horizon, and 256² performance gates. The standard
repository browser driver mounted the shared panel in 203 ms and 195 ms in two fresh contexts and
extracted one non-empty step-32 state from each default 256² run. Their scientific mass payloads
shared SHA-256 `8390ef4611ad0d2758ea301611790d024eaa15aee5420b20401a3c5ac98fe1d3`;
manifest timestamps and wall-clock fields intentionally differed.

## Boundary for M4

M3 does not add localized `H`/`Q`, fingerprint, lineage, identity, mutation, inheritance, or
environment fields. M4 may add those buffers and specialized gathers only after preserving the M2
scientific gates, M3 event ledger, and render-integrity contract.

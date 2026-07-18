# Flow Lenia ecosystem implementation plan

> Companion execution ledger for `spec-web-ecosystem.md`. Each chunk is intended to finish in one
> implementation context and leave a tested boundary for the next `/compact` continuation.

## Chunk 1 — f64 scientific oracle (M1)

Status: **implemented; validation recorded below**

- preserve the existing Taichi point-splat package and capture contract;
- add the versioned `flow-lenia-ecosystem-v1` configuration;
- freeze the primary three-ring cutoff, bell response, Sobel convention, pressure gate, component
  clamp, and finite-square overlap equations;
- implement direct periodic convolution and full multi-channel reference stepping;
- implement all five localized inheritance rules and seed-addressed patch mutation;
- add analytical anchors, property tests, and a small cross-language JSON fixture.

Primary implementation:

- `packages/flow-lenia/flow_lenia/ecosystem_config.py`
- `packages/flow-lenia/flow_lenia/ecosystem_reference.py`
- `packages/flow-lenia/tests/test_ecosystem_reference.py`
- `packages/flow-lenia/tests/test_ecosystem_properties.py`
- `packages/flow-lenia/tests/test_ecosystem_golden.py`

## Chunk 2 — WebGPU feasibility and package foundation (M0)

Status: **implemented; 256² desktop default frozen from the measured M0 result**

- audit and extract the repository's shared Stockham FFT surface;
- scaffold `packages/flow-lenia/web/` with the standard lifecycle, capture, and test hooks;
- add a batch/plane dimension to the FFT prototype;
- prototype the `dd=5` destination gather at mass-only and full state bandwidth;
- benchmark 128² and 256², inventory buffers/bindings/dispatches, and publish the M0 note;
- freeze 128² or 256² as the measured default rather than assuming it.

Exit boundary: browser smoke loads, M0 benchmark artifacts are reproducible, and no architectural
limit remains unknown.

Primary implementation:

- `packages/flow-lenia/web/src/fft-batch.ts`
- `packages/flow-lenia/web/src/probe.ts`
- `packages/flow-lenia/web/src/shaders/`
- `packages/flow-lenia/web/src/inventory.ts`
- `packages/flow-lenia/web/scripts/run-browser-benchmark.mjs`
- `packages/flow-lenia/web/artifacts/m0-browser-benchmark.json`
- `m0-webgpu-benchmark.md`

## Chunk 3 — WebGPU Organism Lab (M2)

Status: **implemented; numerical, structural, determinism, performance, and capture gates pass**

- implement batched convolution, growth, affinity, pressure, displacement, and faithful gather;
- add density/channel/affinity/flow scientific render modes;
- add exact-seed reset, capture, mass ledger, and compact PROVE diagnostics;
- compare GPU intermediates and short rollouts against the chunk-1 fixture/oracle;
- add long-horizon structural gates before enabling localized genomes.

Exit boundary: the full base model runs interactively and passes the declared CPU–GPU gates.

Primary implementation:

- `packages/flow-lenia/web/src/model/solver.ts`
- `packages/flow-lenia/web/src/model/config.ts`
- `packages/flow-lenia/web/src/model/kernels.ts`
- `packages/flow-lenia/web/src/shaders/organism_*.wgsl`
- `packages/flow-lenia/web/src/shaders/reintegrate_organism.wgsl`
- `packages/flow-lenia/web/src/render/renderer.ts`
- `packages/flow-lenia/web/src/prove.ts`
- `packages/flow-lenia/web/src/prove/organism-fixture.json`
- `packages/flow-lenia/web/artifacts/m2-browser-gates.json`
- `m2-organism-validation.md`

## Chunk 4 — interaction and visual laboratory (M3)

Status: **implemented; interaction, ledger, card, accessibility, and render-integrity gates pass**

- add camera, time controls, pipette/add/erase/stir/inspect tools, and event scheduling;
- add trails, flow glyphs, contours, pressure/flux views, kernel inset, and response plot;
- ship six stable organism/ablation cards with accessible keyboard, pointer, and touch controls;
- verify render-only effects never write scientific state.

Exit boundary: a visitor can form, perturb, inspect, compare, and reset an organism without paper
knowledge.

Primary implementation:

- `packages/flow-lenia/web/src/model/events.ts`
- `packages/flow-lenia/web/src/shaders/organism_events.wgsl`
- `packages/flow-lenia/web/src/experiments/cards.ts`
- `packages/flow-lenia/web/src/render/renderer.ts`
- `packages/flow-lenia/web/src/render/overlays.ts`
- `packages/flow-lenia/web/src/prove-m3.ts`
- `packages/flow-lenia/web/artifacts/m3-browser-gates.json`
- `m3-visual-laboratory-validation.md`

## Chunk 5 — localized ecosystem (M4)

Status: **implemented; five-rule numerical, determinism, mutation, ecosystem, identity-dilution,
render-integrity, memory, and performance gates pass**

- add packed `H`, `Q`, fingerprint, lineage, and flags ping-pong buffers;
- port average, whole, gene-wise, best-affinity, and negotiation gather specializations;
- add mutation patches, lineage ring, diversity metrics, and phenotype/lineage views;
- ship three-founder, negotiation-sea, and identity-dilution comparisons;
- extend numerical and determinism gates to every inheritance rule.

Exit boundary: localized ecosystems are reproducible, mass-conserving, and separately falsifiable.

## Chunk 6 — Arena Lab and productization (M5–M6)

Status: **implemented; Arena, reload, canonical-capture, responsive, public-deploy, quality,
determinism, integrity, memory, and performance gates pass**

- add soft walls, corridors, islands, affinity fields, storms, gates, and region metrics;
- ship corridor-divergence, maze, and recovery experiments plus versioned import/export;
- finish responsive UX, landing copy, canonical captures, posters, provenance, and browser matrix;
- integrate the package into the public `.io` catalogue only after correctness, performance,
  quality, determinism, and integrity gates pass.

Exit boundary: the spec's release acceptance criteria are satisfied and deployment-ready.

Primary implementation:

- `packages/flow-lenia/web/src/model/arena.ts`
- `packages/flow-lenia/web/src/model/experiment-io.ts`
- `packages/flow-lenia/web/src/shaders/arena_perceive.wgsl`
- `packages/flow-lenia/web/src/shaders/arena_events.wgsl`
- `packages/flow-lenia/web/src/experiments/arena-cards.ts`
- `packages/flow-lenia/web/src/arena-app.ts`
- `packages/flow-lenia/web/src/prove-m6.ts`
- `packages/flow-lenia/web/artifacts/m6-browser-release-gates.json`
- `packages/flow-lenia/web/artifacts/m6-canonical-capture-index.json`
- `m5-m6-arena-release-validation.md`

## Chunk 1 validation

Run from the repository root:

```bash
uv run ruff check packages/flow-lenia/flow_lenia packages/flow-lenia/tests
uv run pytest packages/flow-lenia/tests -q
PYTHONPATH=packages/flow-lenia .venv/bin/mypy \
  --config-file packages/flow-lenia/pyproject.toml \
  packages/flow-lenia/flow_lenia/ecosystem_config.py \
  packages/flow-lenia/flow_lenia/ecosystem_reference.py
```

The final validation result for this chunk is recorded in the completing agent response. Taichi may
emit a non-failing offline-cache lock warning in the restricted workspace; it does not change test
results.

## Chunk 2 validation

Run from `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run build
```

The real-browser reference artifact and reproduction command are recorded in
`m0-webgpu-benchmark.md`. The repository standard browser driver must also reach the WebGPU ready
flag, mount the shared settings panel, invoke its capture button, and extract a non-empty capture.

## Chunk 3 validation

Run the static and build gates from `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run check:m2
npm run build
```

Regenerate and verify the oracle fixture plus the complete Python regression from the repository
root:

```bash
PYTHONPATH=packages/flow-lenia uv run python packages/flow-lenia/scripts/generate_m2_fixture.py
uv run ruff check packages/flow-lenia/flow_lenia packages/flow-lenia/tests \
  packages/flow-lenia/scripts/generate_m2_fixture.py
uv run pytest packages/flow-lenia/tests -q
```

The real-browser numerical/structural/performance artifact and the standard capture-driver result
are recorded in `m2-organism-validation.md`.

## Chunk 4 validation

Run the static regressions and build from `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run check:m2
npm run check:m3
npm run build
```

Run the real-browser laboratory gate with local browser paths:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_BIN=/path/to/chromium \
  npm run gate:m3
```

The standard repository capture driver must also load the default 256² application, mount the
shared settings panel, invoke capture, and extract a non-empty state. Results and declared M3
tolerances are recorded in `m3-visual-laboratory-validation.md`.

## Chunk 5 validation

Regenerate the inheritance fixture and run the complete static regression from the repository root:

```bash
PYTHONPATH=packages/flow-lenia uv run python packages/flow-lenia/scripts/generate_m4_fixture.py
uv run ruff check packages/flow-lenia/flow_lenia packages/flow-lenia/tests \
  packages/flow-lenia/scripts/generate_m2_fixture.py \
  packages/flow-lenia/scripts/generate_m4_fixture.py
uv run pytest packages/flow-lenia/tests -q
```

Run the WebGPU static/build gates from `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run check:m2
npm run check:m3
npm run check:m4
npm run build
```

Run the real-browser localized-ecosystem gate with local browser paths:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_BIN=/path/to/chromium \
  npm run gate:m4
```

The standard capture driver must additionally open `?ecosystem=1`, capture mass plus H/Q and packed
identity state, and extract a non-empty state. Results and declared M4 tolerances are recorded in
`m4-localized-ecosystem-validation.md`.

## Chunk 6 validation

Run the complete static/build regression from `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run check:m2
npm run check:m3
npm run check:m4
npm run check:m6
npm run build
```

Run the real-browser Arena/release gate with local browser paths:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_BIN=/path/to/chromium \
  npm run gate:m6
```

Validate the exact public-deploy path and assembled catalogue from the repository root:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_BIN=/path/to/chromium \
  uv run --no-sync python tools/productization/web-deploy/pipeline.py validate \
  --artifacts /tmp/flow-lenia-web-release --sim flow-lenia --skip-build --json
node tools/productization/web-deploy/web/pages/check-links.mjs
```

The real-browser result, exact tolerances, canonical hash index, compatibility posture, poster/live
asset provenance, and complete regression are recorded in `m5-m6-arena-release-validation.md`.

## Continuation contract

All planned chunks are complete. Further work is a separately scoped extension rather than an
implicit Chunk 7; the release exclusions in `spec-web-ecosystem.md` remain exclusions.

Do not begin a later chunk while an earlier exit boundary is red. Preserve unrelated user files and
the legacy Taichi behavior throughout.

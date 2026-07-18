# Flow Lenia M5–M6 Arena and release validation

Date: 2026-07-18
Model: `flow-lenia-ecosystem-v1`
Environment schema: `flow-lenia-arena-environment-v1`
Experiment schema: `flow-lenia-arena-experiment-v1`

## Release boundary

Arena Lab extends the separately gated M4 ecosystem solver only when created with explicit Arena
resources. Organism Lab still allocates no genome or environment fields, and Ecosystem Lab retains
its measured 43.0107 MiB 256² allocation. Arena adds two scientific arrays—one `vec4f` field and one
`u32` region label—plus small uniforms/event records. The complete measured 256² Arena allocation
is 44.2613 MiB.

The environment is deliberately a soft-affinity model:

- field `x` is an authored or painted signed affinity;
- field `y` is a negative soft-wall contribution;
- field `z` is a negative gate contribution multiplied by the closed/open schedule;
- field `w` is a render/diagnostic wall opacity and never feeds transport;
- an analytic orbiting attractor and three-lobed storm pulse add signed affinity at a fixed step;
- the resulting scalar is multiplied by explicit per-channel response and added to `V_c` before
  the unchanged Sobel pressure, displacement clamp, and conservative destination gather.

There is no hard collision, reflected boundary, resource metabolism, or mass source/sink. Public
copy labels walls as soft affinity and recovery as a regional-distribution proxy, not biological
fitness or resilience.

## Product surface

The release ships three authored, repository-licensed Arena cards with no imported data:

| Card | Controlled mechanism | Primary metric |
|---|---|---|
| Corridor divergence | Two founder regions and a central gate that opens at step 48 | Region abundance before/after reconnection |
| Maze navigation | Authored soft-wall maze and slowly orbiting positive-affinity beacon | Target-region abundance and wall exposure |
| Storm recovery | Frozen three-lobed affinity pulse over steps 40–63 | Retained closed mass and regional-distribution recovery |

Six direct tools—sample, mutate, attract, repel, wall and erase—share primary/secondary, Shift,
Alt, wheel, pointer and keyboard semantics. Five read-only scientific views expose lineage,
phenotype, channels, flow and the fixed signed environment scale. A low-cadence panel displays all
three region masses, environment range, gate/storm state, a recovery trace, active lineage masses,
and mutation edges.

Complete experiment export stores packed mass, H, Q, identity, environment, regions, dynamics,
lineage ring, seed, fixed step, mixing rule, closed open-system ledger and authored provenance.
Import rejects incompatible grid/model versions, lengths, rules, modified dynamics and SHA-256. The release gate
restores every byte and proves another 24 steps remain byte-identical on the same adapter.

## Committed browser result

The primary artifact is
`packages/flow-lenia/web/artifacts/m6-browser-release-gates.json`, schema
`flow-lenia-m6-release-gates-v1`. It was measured in headless Chromium 150 through Dawn/ANGLE
Vulkan on AMD RDNA2.

| Gate | Measured result | Criterion | Verdict |
|---|---:|---:|---|
| Zero environment | mass/H/Q/identity byte-exact vs M4 specialization | exact | PASS |
| Constant-field affinity | max absolute residual `2.9802322387695312e-8` | `≤ 2e-6` | PASS |
| Timed gate | closed at 47, open at 48 | exact schedule | PASS |
| GPU affinity paint | environment bytes changed; mass remained closed | both required | PASS |
| Corridor replay | 96 steps × 2, byte-exact; drift `5.0977e-6` | drift `≤ 1.5e-4` | PASS |
| Maze replay | 96 steps × 2, byte-exact; drift `5.0721e-6` | drift `≤ 1.5e-4` | PASS |
| Storm replay | 96 steps × 2, byte-exact; drift `5.0886e-6` | pulse observed; drift `≤ 1.5e-4` | PASS |
| Export/import | tamper rejected; restore exact; 24-step continuation exact | exact | PASS |
| Render integrity | all six scientific arrays byte-exact across five views | exact | PASS |
| Arena allocation | 44.2613 MiB at 256² | `< 128 MiB` | PASS |
| Complete 256² step | 8 samples, p50 3.20 ms, p95 18.90 ms | p95 `≤ 33.3 ms` | PASS |
| Adaptive smoke | 128² at 390×844, touch + reduced motion | ready, panel mounted, no viewport overflow | PASS |

No readback or GPU-buffer allocation occurs in the simulation hot loop. Metrics, inspection,
capture, export and explicit proof runs are low-cadence or user-requested synchronization points.

## Capture and provenance

The Arena standard capture runs 72 exact steps and contains six fields: mass, H, Q, packed identity
values, packed environment values and region values. It also records the model/environment schema,
card provenance and the SHA-256 of the eight scientific/render WGSL sources. The committed
`m6-canonical-capture-index.json` pins:

- the M2 128²/256-step Organism structural state hash;
- the M4 128²/32-step whole-inheritance ecosystem state hash;
- the M6 128²/72-step Arena browser-capture state and shader hashes.

The catalogue poster and live VP9 loop are generated from the same built bundle, seed 42, authored
Maze Navigation card, and fixed frame schedules in `make-posters.mjs` / `make-loops.mjs`. The PNG is
48 KiB and the loop is 396 KiB, below the 1.5 MiB per-simulation live-asset budget. They are
presentation assets and never feed a solver or gate.

## Browser and public-deploy posture

The measured browser matrix claims Chromium desktop WebGPU and Chromium 390×844 adaptive/touch
WebGPU only. Both pass. Firefox and Safari are explicitly marked “not claimed—support varies”; no
cross-vendor bit identity is asserted.

The standard public pipeline loaded the default full Organism Lab in two fresh Chromium profiles,
reached WebGPU readiness in 198 ms and 200 ms, emitted two byte-identical step-32 mass captures, and
passed the new-canonical verifier. The public capture measured relative mass drift
`1.6940432e-6`, relative ledger error `1.6940403e-6`, zero negative/non-finite cells, zero clamp
fraction, and maximum displacement `0.53417`. The assembled 21-simulation site then resolved all
467 internal links and all 22 landing/per-sim favicons.

## Reproduction

From `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run check:m2
npm run check:m3
npm run check:m4
npm run check:m6
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_BIN=/path/to/chromium npm run gate:m6
```

From the repository root:

```bash
uv run ruff check packages/flow-lenia/flow_lenia packages/flow-lenia/tests \
  packages/flow-lenia/scripts/generate_m2_fixture.py \
  packages/flow-lenia/scripts/generate_m4_fixture.py \
  tools/productization/web-deploy/pipeline.py \
  tools/productization/web-deploy/verify.py
uv run pytest packages/flow-lenia/tests tools/productization/web-deploy/smoke -q
PYTHONPATH=packages/flow-lenia .venv/bin/mypy \
  --config-file packages/flow-lenia/pyproject.toml \
  packages/flow-lenia/flow_lenia/ecosystem_config.py \
  packages/flow-lenia/flow_lenia/ecosystem_reference.py
node tools/productization/web-deploy/web/pages/check-links.mjs
```

Real-browser M2, M3 and M4 regression gates were rerun after the Arena changes. All remained green:
M2 preserved its f64-derived numerical cases and byte-exact 256-step replay; M3 retained all six
cards, event ledger and render integrity; M4 retained all five inheritance gates, three ecosystems,
mutation identity and the identity-dilution falsification. The legacy Taichi behavior and its
captures were not changed.

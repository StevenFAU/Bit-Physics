# Flow Lenia M4 localized-ecosystem validation

> Status: **PASS** on the recorded Chromium/Dawn reference adapter. This note closes Chunk 5 of
> `implementation-plan.md`; Arena Lab and release productization remain M5–M6 work.

## Implemented boundary

M4 adds a separate localized ecosystem specialization without allocating genome state in Organism
Lab. Each ecosystem cell carries two ping-ponged arrays of three `vec4f` records for nine H genes
and nine Q genes, plus a ping-ponged `vec4u` identity containing the two-u32 fingerprint, lineage,
and flags. The scientific mass path remains the M2 three-channel/nine-kernel affinity, pressure,
clamp, and exact finite-square destination gather.

The localized gather binds exactly eight storage buffers: the transport source, next mass, current
and next H, current and next Q, and current and next identity. The transport record grows from the
M0 three-`vec4f` estimate to six records so the already-computed nine contextual growth values can
reach best-affinity and negotiation scoring without a ninth storage binding. This is one 96-byte
scratch record per cell and does not add persistent scientific state.

Five compute pipelines specialize one frozen streaming gather module:

- mass-weighted H/Q average with a mixed-lineage sentinel;
- whole-genome mass reservoir selection;
- one independently addressed mass reservoir for each of 18 H/Q genes;
- deterministic best contextual H·I selection with first-candidate tie break;
- contextual negotiation using `beta * incoming_mass * Q·I` plus streaming Gumbel-max.

The WGSL implementation emulates the oracle's SplitMix64 counter hash with two u32 lanes. Counters
are addressed by seed, step, destination, candidate, and gene; selection does not depend on GPU
scheduling. Candidate H/Q and identity are loaded only after positive overlap mass is established.

## Mutation and ecosystem instrumentation

Mutation is a fixed-step event over a contiguous toroidal patch. One seed-addressed Gaussian delta
vector is applied to all matching cells of the sampled parent lineage, H/Q is clamped to `[-2, 2]`,
and the patch receives one deterministic child fingerprint and lineage ID. A 128-record lineage ring
stores parent, child, step, centroid, affected mass, radius, and all 18 deltas. A small fixed-point GPU
counter records affected mass at the mutation boundary; it is diagnostic-only and never changes
scientific mass. Mutated flags also retain a compact parent-hue key so child lineage colors remain a
small deterministic offset from their parent while exact IDs remain separately inspectable.

Low-cadence ecosystem readback reports exact-lineage count and mass, the top lineage, Shannon
lineage diversity, mixed-identity mass, quantized H/Q phenotype clusters and entropy, and mutation
and extinction event counts. “Lineage,” “fingerprint,” and “phenotype” remain explicitly operational
simulation definitions rather than biological species.

The Ecosystem Lab is entered through `?ecosystem=1` or the in-canvas lab switch. It includes:

- three-founder and negotiation-sea cards;
- a synchronized three-pane average/gene-wise/negotiation identity-dilution comparison;
- exact lineage and approximate phenotype views plus density and flow views;
- sample and coherent mutate tools, radius/scale controls, fixed-step time controls, and keyboard
  access;
- ecosystem capture containing mass, H, Q, packed identity values, schema, rule, seed, step, and
  diversity diagnostics.

All three cards and visual parameters are Bit-Physics-authored and use no redistributed third-party
preset or media data.

## CPU–GPU numerical gate

`scripts/generate_m4_fixture.py` derives a compact 16² localized fixture from the M1 f64 oracle. It
freezes the same initial mass, three founder genomes, contextual growth, displacement, and mutation
event for all five rules. Expected floating fields cross the browser boundary as f32.

Declared ceilings are `1.2e-5` absolute for mass and H/Q and `6e-5` relative for the closed mass
ledger. The recorded maximum errors are:

| Rule | mass max abs | H max abs | Q max abs | lineage / flag mismatches |
|---|---:|---:|---:|---:|
| average | 1.94e-7 | 1.79e-7 | 2.38e-7 | 0 / 0 |
| whole | 1.94e-7 | 0 | 0 | 0 / 0 |
| gene-wise | 1.94e-7 | 0 | 0 | 0 / 0 |
| best | 1.94e-7 | 0 | 0 | 0 / 0 |
| negotiation | 1.94e-7 | 0 | 0 | 0 / 0 |

Every rule has a `5.15e-8` relative one-step mass residual against its f64-derived expected field.
The frozen mutation child identity and all 18 f32 deltas match exactly; its affected patch contains
`16.19374` mass units at the fixed-point boundary and its one-step relative mass drift is `4.74e-8`.

## Determinism, ecosystem, and falsification gates

Each inheritance specialization runs two independent 32-step 128² replays. SHA-256 covers mass, H,
Q, and identity, and all five replay pairs are byte-identical on the recorded adapter. No
cross-vendor bit-identity claim is made.

Longer authored-card gates remain finite, non-negative, unclamped, and within the declared `1.5e-4`
closed-ledger ceiling:

- three founders, whole-genome, 48 steps: three exact lineages and `2.55e-6` relative drift;
- negotiation sea, 96 steps: all three scheduled mutation events, seven active lineages, and
  `5.08e-6` relative drift;
- identity dilution, 48 steps per synchronized rule: stable under average, gene-wise, and
  negotiation with approximately `2.54e-6` relative drift.

Identity dilution is separately falsifiable rather than a cosmetic comparison. Average and
gene-wise produce essentially all mixed-sentinel mass while negotiation preserves exact selected
lineages. Their measured phenotype-bin counts are 139, 396, and 4 respectively. The gate requires
distinct outcomes and requires average mixed mass to exceed negotiation by at least one percentage
point.

Cycling lineage, phenotype, density, and flow render modes leaves mass, H, Q, and identity byte
exact. The product-surface gate records three experiments, five rules, four views, two tools, three
comparison panes, and a keyboard-focusable canvas.

## Reference browser measurement

Committed artifact: `packages/flow-lenia/web/artifacts/m4-browser-gates.json`.

Recorded environment:

- Chromium 150 / Dawn WebGPU;
- AMD RDNA2 adapter through ANGLE Vulkan;
- 256², C=3, K=9, `dd=5`, negotiation gather;
- queue-completion timing after warm-up.

The final run records a complete 256² allocation of **43.01 MiB**, below the provisional 128 MiB
budget, and a **19.3 ms p95** complete negotiation step over eight queue-completion samples. The
33.3 ms gate is the durable requirement; this one machine's timing is not a universal performance
claim.

## Reproduction

From the repository root:

```bash
PYTHONPATH=packages/flow-lenia uv run python packages/flow-lenia/scripts/generate_m4_fixture.py
uv run ruff check packages/flow-lenia/flow_lenia packages/flow-lenia/tests \
  packages/flow-lenia/scripts/generate_m2_fixture.py \
  packages/flow-lenia/scripts/generate_m4_fixture.py
uv run pytest packages/flow-lenia/tests -q
```

From `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run check:m2
npm run check:m3
npm run check:m4
npm run build

PLAYWRIGHT_MODULE=/path/to/playwright CHROME_BIN=/path/to/chromium npm run gate:m4
```

The real-browser gate rebuilds `artifacts/m4-browser-gates.json` and writes a visual inspection image
to `/tmp/flow-lenia-m4-ui.png` by default.

## Next boundary

M4 does not implement editable affinity environments, walls, corridors, islands, storms, regional
metrics, import/export, or public-catalogue integration. Those remain Chunk 6 (M5–M6); localized
ecosystem correctness no longer blocks them.

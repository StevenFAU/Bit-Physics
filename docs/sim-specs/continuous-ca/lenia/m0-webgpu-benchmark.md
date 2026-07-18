# Flow Lenia M0 WebGPU feasibility result

> **Verdict:** PASS on the reference desktop. Freeze **256²** as the desktop default and retain
> **128²** as the adaptive tier.
>
> **Scope:** dominant-path architecture probe, not a claim that the M2 model is implemented. The
> executable measures batched C=3/K=9 FFT fan-out and faithful `dd=5` finite-square transport. It
> intentionally omits growth, affinity, pressure, diagnostics, and rendering.

## Measured environment

- Date: 2026-07-18.
- OS: Ubuntu 26.04 LTS, Linux 7.0.0, x86-64.
- Browser: headless Chromium 150, Dawn/ANGLE Vulkan.
- Adapter reported by WebGPU: AMD, RDNA 2. The browser withheld the device/description strings.
- Timing source: WebGPU `timestamp-query`, 3 warm-up iterations and 12 measured samples per row.
- Prototype: f32, C=3, K=9, `dd=5`, `sigma=0.65`, 8×8 destination tiles.

The committed raw artifact is
[`packages/flow-lenia/web/artifacts/m0-browser-benchmark.json`](../../../../packages/flow-lenia/web/artifacts/m0-browser-benchmark.json).
The benchmark driver serves the production bundle over localhost, waits for the standard ready
flag, and calls the browser's exported M0 hook.

## Results

Independent rows have independent warm-up and sample windows, so combined-path timing need not be
the arithmetic sum of separately measured rows.

| Grid | Workload | Dispatches | p50 ms | p95 ms |
|---:|---|---:|---:|---:|
| 128² | batched FFT + C→K spectral expansion | 29 | 0.298 | 0.316 |
| 128² | mass-only faithful gather | 1 | 0.039 | 0.041 |
| 128² | full-state faithful gather | 1 | 0.066 | 0.069 |
| 128² | FFT + mass-only gather | 30 | 0.338 | 0.369 |
| 128² | FFT + full-state gather | 30 | 0.362 | 0.381 |
| 256² | batched FFT + C→K spectral expansion | 33 | 1.173 | 1.199 |
| 256² | mass-only faithful gather | 1 | 0.180 | 0.200 |
| 256² | full-state faithful gather | 1 | 0.226 | 0.230 |
| 256² | FFT + mass-only gather | 34 | 1.309 | 1.362 |
| 256² | FFT + full-state gather | 34 | 1.184 | 1.252 |

The dominant-path 256² full-state p95 is 1.252 ms against the provisional 33.3 ms desktop budget.
That leaves substantial room for the omitted pointwise model, diagnostics, and render passes; M2
must still measure the complete solver and may revise the product tier if the full frame graph
invalidates this headroom.

## Correctness anchors

The browser ran these 128² GPU anchors before accepting a timing result:

| Anchor | Measured | M0 ceiling | Result |
|---|---:|---:|---|
| C=3 forward FFT → K=9 identity spectra → inverse FFT, max absolute error | 2.3520e-7 | 5e-4 | PASS |
| Mass-only gather, worst per-channel relative ledger residual | 4.7225e-8 | 5e-5 | PASS |
| Full-state gather, worst per-channel relative ledger residual | 4.7225e-8 | 5e-5 | PASS |
| Uniform H/Q field preservation, max absolute error | 2.0266e-7 | 5e-5 | PASS |
| Uniform identity preservation | exact | exact | PASS |

These are feasibility anchors. The M2 CPU–GPU gate remains responsible for comparing real kernel
responses, growth, flow, and short rollouts against the f64 oracle.

## Buffer inventory

The projected complete M4 allocation is conservative and retains complex kernel spectra. Small
uniform, reduction, event, and readback buffers are excluded from the per-cell table but are far
below one MiB.

| Buffer family | Bytes/cell | Count | 256² MiB |
|---|---:|---:|---:|
| mass vec4f | 16 | 2 | 2.00 |
| derived transport source: mass + displacement x/y | 48 | 1 | 3.00 |
| K=9 complex FFT workspace | 72 | 2 | 9.00 |
| K=9 complex kernel spectra | 72 | 1 | 4.50 |
| K=9 real responses | 36 | 1 | 2.25 |
| three-channel affinity | 16 | 1 | 1.00 |
| flow x/y vec4f | 16 | 2 | 2.00 |
| H: three vec4f records | 48 | 2 | 6.00 |
| Q: three vec4f records | 48 | 2 | 6.00 |
| identity vec4u | 16 | 2 | 2.00 |
| **total** | **604** |  | **37.75** |

The 128² projection is 9.4375 MiB. The largest single 256² buffer is one nine-plane complex FFT
buffer at 4.50 MiB. The executable M0 probe itself allocates approximately 31.5 MiB at 256².

## Binding and dispatch decision

The repository shared numerical core in `common/common-web/src/fft-wgsl.ts` did not need to change.
`fft-batch.ts` adds plane-aware 2D addressing around that butterfly. A stage binds two storage
buffers and batches all active planes into one dispatch:

- C=3 forward: `2 log2(N)` dispatches;
- C→K spectral expansion: one dispatch with three storage bindings;
- K=9 inverse: `2 log2(N)` dispatches;
- faithful gather: one dispatch.

The full gather would exceed the portable eight-storage-buffer floor if mass and both flow
components were separately bound beside mass/H/Q/identity outputs. M0 resolves this by producing a
derived `transport source` scratch buffer with three vec4f records per cell: mass, displacement x,
and displacement y. Full gather then binds exactly eight storage buffers:

1. transport source;
2. next mass;
3. current H;
4. next H;
5. current Q;
6. next Q;
7. current identity;
8. next identity.

Canonical mass, H, Q, and identity remain structure-of-arrays; only the one-pass transport input is
packed. Mass-only gather binds two storage buffers. Neither specialization uses float atomics.

## Browser limits observed

| Limit | Observed | Required by 256² architecture |
|---|---:|---:|
| `maxBufferSize` | 256 MiB | 4.50 MiB largest buffer |
| `maxStorageBufferBindingSize` | 128 MiB | 4.50 MiB |
| `maxStorageBuffersPerShaderStage` | 8 | 8 |
| `maxBindingsPerBindGroup` | 1000 | 9 including the uniform |
| `maxComputeInvocationsPerWorkgroup` | 256 | 128 FFT / 64 gather |
| `maxComputeWorkgroupStorageSize` | 16 KiB | 0 in M0; portable tiling ceiling frozen at 16 KiB |
| `maxComputeWorkgroupsPerDimension` | 65535 | 2304 for the largest FFT stage dispatch |

No architectural limit remains unknown for M2. Full-state gather sits exactly on the portable
storage-binding floor, so M2 must keep purpose-specific pipeline layouts and must not add another
storage binding to that pass.

## Reproduction

From the repository root:

```bash
cd packages/flow-lenia/web
npm install
npm run typecheck
npm run check:m0
npm run build

PLAYWRIGHT_MODULE="$PWD/../../../tools/productization/web-deploy/web/headless/node_modules/playwright/index.js" \
CHROME_BIN=/snap/bin/chromium \
node scripts/run-browser-benchmark.mjs dist artifacts/m0-browser-benchmark.json
```

The repository's standard browser driver also passed: real WebGPU engaged, time-to-ready 42 ms, the
settings panel mounted, its capture control completed, and a one-frame diagnostic capture was
exported. The benchmark artifact is hardware-specific by design; reruns should be committed only
with their reported environment and without replacing this reference measurement silently.

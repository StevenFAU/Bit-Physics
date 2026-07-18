# Flow Lenia M2 Organism Lab validation

Date: 2026-07-18

## Implemented scientific path

M2 implements the complete global-parameter organism model from
`flow-lenia-ecosystem-v1`:

1. pack three mass channels and run one plane-batched forward 2D Stockham FFT;
2. multiply by nine precomputed, complex, discretely normalized radial-kernel spectra;
3. run one plane-batched inverse transform for all nine responses;
4. evaluate the frozen bell response and reduce weighted target-channel affinity;
5. compute the unnormalized periodic Sobel affinity and density gradients, pressure gate, flow,
   and component-clamped displacement;
6. perform the exact `dd=5` finite-square destination gather with fixed candidate order.

The step uses f32, has 37 compute dispatches at 256², and is normally encoded in one compute pass
and one queue submission. The organism specialization owns no `H`, `Q`, fingerprint, lineage, or
identity buffers. The density, channels, affinity, and flow render pipelines bind every scientific
buffer as read-only.

## CPU–GPU numerical gate

`scripts/generate_m2_fixture.py` evaluates the M1 pure-NumPy f64 oracle and quantizes only the
committed expected arrays to f32. The browser compares:

- all perception, growth, affinity, alpha, flow, and displacement intermediates for a smooth
  periodic field;
- one-step and four-step mass for that field;
- displacement and one-/four-step mass for a seam-loaded adversarial field;
- displacement and one-/four-step mass for a crowded pressure adversary.

The committed Chromium/Dawn run recorded these worst errors:

| Field | Max absolute error | Declared tolerance |
|---|---:|---:|
| perception | 2.98e-8 | 1.0e-6 |
| growth | 4.17e-7 | 1.0e-5 |
| affinity | 2.98e-7 | 1.0e-5 |
| alpha | 7.45e-9 | 2.0e-7 |
| flow | 8.20e-7 | 2.0e-5 |
| displacement, worst adversary | 7.75e-7 | 4.0e-6 |
| one-step mass, worst adversary | 1.19e-6 | 1.0e-5 |
| four-step mass, worst adversary | 8.94e-7 | 2.0e-5 |

The largest four-step fixture ledger residual was 2.26e-7. The tolerances are frozen in the
generated fixture and checked statically; they are not inferred from a passing browser result.

## Structural, determinism, and performance gates

The structural test executes the seeded 128², C=3, K=9 organism for 256 steps twice from the exact
same initial bytes. The measured reference result was:

- identical final SHA-256 hashes on both same-adapter replays;
- relative mass drift 1.3534e-5 against a 5e-5 limit;
- zero negative or non-finite values;
- zero displacement-clamped cells;
- maximum density 2.1249 and maximum displacement component 0.5749.

The complete 256² solver, including growth/affinity/pressure and faithful gather rather than the M0
dominant-path proxy, measured 3.30 ms p95 over 16 queue-completion samples. Its owned allocation is
26.01 MiB, including FFT pass uniforms, below the 33.3 ms and 128 MiB desktop budgets. This local
reference measurement used headless Chromium 150 with Dawn/ANGLE Vulkan on the reported AMD RDNA2
adapter. It is not a cross-device performance promise.

## Reproduction

From `packages/flow-lenia/web/`:

```bash
npm run typecheck
npm run check:m0
npm run check:m2
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_BIN=/path/to/chromium \
  npm run gate:m2
```

The measured report is committed at
`packages/flow-lenia/web/artifacts/m2-browser-gates.json`. The standard repository browser driver
also loads the default 256² app, mounts the shared panel, invokes exact-seed capture, and extracts a
non-empty scientific-state bundle. Two fresh browser contexts produced identical step-32 mass
hashes during M2 completion.

## Boundary for M3

M2 deliberately does not include localized genomes, mutation, environment editing, camera/tools,
trails, contours, pressure/flux overlays, inspectors, or experiment cards. Those are later
milestones. M3 must keep all visual effects read-only with respect to the scientific state and must
not weaken the M2 gates.

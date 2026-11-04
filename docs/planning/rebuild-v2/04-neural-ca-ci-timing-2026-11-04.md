# Grow CI timing investigation — 2026-11-04

The 30-minute job spends almost all its time in repeated browser boot and capture
work, not LFS. Reverting the live shader's explicit inner-loop expansion did not
produce a compile-time saving on the measured software adapter. No safe production
saving is established by this investigation; keep the checks and kernels unchanged.

## Where the time goes

Source: [deploy run 41761231494, neural-ca job 126608765287](https://github.com/StevenFAU/Bit-Physics/actions/runs/41761231494/job/126608765287),
at commit `fc362424`. Step timestamps from the Actions job API; readiness/boot
measurements from its log. These are elapsed times, not the configured timeouts.

| Work | Elapsed |
| --- | ---: |
| Entire job | 30m 10s |
| Validate both pages, two independent contexts per page | 15m 13s |
| Four viewport shell/accessibility checks | 13m 14s |
| LFS fetch (all captures, before the selective-fetch fix) | 41s |
| Everything else | 1m 02s |

Validation's root page took about 548s; v1 took about 365s. The four gate-ready
measurements were 91.802s, 90.473s, 89.320s and 89.409s. Both pages compile the
unchanged gated shader before ready. The remaining validation time includes the
four 1,000-step captures, the root page's live boot, browser teardown and Python
verification; the existing logs do not separate those costs. It would be incorrect
to attribute that entire remainder to the expanded live shader.

| Shell viewport | Gate ready | Live boot complete |
| --- | ---: | ---: |
| Phone 390 | 91.023s | 179.852s |
| Tablet 820 | 90.529s | 179.350s |
| Desktop 1440 | 91.527s | 180.360s |
| 200% zoom | 90.755s | 179.823s |

Boot accounts for 719.385s of the 794s shell step. The extra live-boot interval is
88.8–89.1s per viewport. Increasing or decreasing the 600s boot timeout cannot
improve a successful 180s boot.

## Testing the shader-size hypothesis

`packages/neural-ca/web/compile-profile.mjs` compiles the committed gate and then
the live update/mask pipelines with expanded and original loops. It uses the
production binding layouts (dynamic uniform offsets for the live variants),
prints the actual adapter, and runs no physics or app code. It does not establish
new equivalence claims or replace any gate.

A fresh-browser run of the committed probe on local Chromium 156.0.8078.47 /
SwiftShader measured:

| Update pipeline | Compile time |
| --- | ---: |
| Original gated source | 49.125s |
| Expanded live source | 49.636s |
| Original source with live layout | 49.502s |

Mask pipelines took 12–14ms. Source length grows from 5,086 to 8,077 characters;
compile time does not show a corresponding increase. The original live variant
also did not reuse the earlier gate compile. Two exploratory probes gave similar
48.2–49.7s update compiles. One requested Vulkan with the local lavapipe ICD, but
the reported adapter was still SwiftShader: these results are **not** a local
lavapipe measurement. The CI workflow installs lavapipe, but its historical capture
logs report an empty adapter object, so they cannot independently establish the
selected adapter. Local times are not runner benchmarks.

Reproduce with the root npm workspace installed:

```bash
CHROME_BIN=/snap/bin/chromium \
PLAYWRIGHT_MODULE="$PWD/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js" \
node packages/neural-ca/web/compile-profile.mjs swiftshader
```

## Why this is a finding, not a performance patch

Changing the live loop expansion has no demonstrated benefit here and would put
the measured Firefox fix at risk. The gate is already slow with its original loops;
its shader and capture path are frozen. Skipping a page, a second capture, a
viewport, or a fully booted shell would weaken a check. Sharing a WebGPU device
between independent capture contexts would change their isolation. The shell
harness deliberately restarts Chromium between viewports because background GPU
compiles previously delayed later boots past their limits.

A separate scheduling/cache experiment could still uncover savings: these results
do not prove optimization impossible. In particular, the logs cannot distinguish
capture execution from competition with background live/training compiles. Such a
change needs measured before/after runner timings and the existing equivalence and
browser checks; this investigation does not ship an unmeasured scheduling change.
No gate, tolerance, shader, browser selection, timeout or check is changed. Firefox
continues to receive exactly the existing source.

# Phase-5 web-build track — tooling

Builds and validates the seven Stack-B web frontends so sub-phase 5.1
(`web-deploy`) has qualifying bundles to deploy. Upstream of 5.1; this track
authors the frontends + their gates, it does **not** author `web-deploy.yml`.

Charter: `docs/_audits/phase-5/web-build-track-charter-2026-06-09T02-39-17Z.md`.

## The three per-sim gates

| Gate | What it proves | Tool |
|---|---|---|
| **1. Vite build** | the bundle compiles (§6.1 load-bearing) | `npm + vite build` in `packages/<sim>/web/` |
| **2. wgpu-native correctness** | the **committed `.wgsl`** the bundle ships produces the canonical | `gpu_gate.py` |
| **3. DOM-load smoke** | the bundle loads + its module runs (no unexpected errors) | `headless/smoke.mjs` |

Run all three: `uv run python tools/productization/web-build/validate.py <sim>`

## Headless-WebGPU SHIFT (§0.3 landed reality)

Real **headless browser WebGPU is unavailable in this environment** — neither
the snap Chromium nor a non-snap chrome-for-testing 149 brings up a WebGPU
adapter headless, even though the host has a working native Vulkan stack (AMD
RX 6800 XT / RADV + lavapipe). Chrome's headless GPU process cannot initialize
Vulkan here. So:

- **Gate 2 (correctness) runs the identical committed `.wgsl` via wgpu-native**
  (`wgpu-py` / Vulkan) on the real GPU — the repo's own sanctioned WGSL path
  (precedent: `packages/neural-ca/python/neural_ca/wgsl_harness.py`, which
  generated the committed WGSL canonical the same way). This is REAL GPU
  validation of the actual shader.
- **Gate 3 is the documented §6.1 fallback** — "page loads, error count = 0".
  It proves the bundle is well-formed; it does **not** validate the GPU path.
  The browser's real WebGPU path is exercised by 5.1's cloud Playwright on a
  WebGPU-capable runner.

Each sim's landing report states explicitly whether it validated under real
headless WebGPU or the fallback (per the ratified discipline). To date: **all
sims use the gate-2 real-GPU + gate-3 fallback split** (no sim has validated
under real *headless browser* WebGPU locally).

## Gate-2 kinds (per the charter's named gate, measured live)

| Sim | Gate-2 kind | Result |
|---|---|---|
| reaction-diffusion-2d | `capture_roundtrip` | PASS @ `[overrides.reaction-diffusion-2d]` rel=1e-4 (measured 2.6e-5); run-twice byte-identical |
| mandelbulb-explorer | `new_canonical` | run-twice byte-identical; f32 DE vs f64 canonical 1.5e-5 (single-precision floor, just outside the 1e-5 closed-form budget — **no tolerance widened**); golden DE anchor passes |

`new_canonical` gating requires run-twice **byte-identical** determinism before
any output is trusted as a reference (the ratified new-canonical discipline);
the cross-stack agreement is **reported, never widened to force a pass**.

## Toolchain (npm + Vite; pnpm kept)

Per-sim web apps build with **npm + Vite 6** (pnpm/corepack are absent locally).
The repo's `common/common-ts/` pnpm files are **kept** — the `ts-strict` CI job
installs them with `pnpm --frozen-lockfile`, so they are load-bearing, not
vestigial (a SHIFT from the charter's "retire pnpm" note; see the batch audit).
Shared browser helpers live in `common/common-web/` (outside the `ts-strict`
common-ts scope), consumed as source by each Vite app via relative import.

## Assets

`gen_ic.py` freezes seed-dependent initial conditions the browser cannot
reproduce (e.g. rd2d's numpy-PCG64 perturbation) to little-endian f32 binaries
the bundle fetches. The wgpu-native gate seeds from numpy directly — an
independent reproduction of the same canonical IC.

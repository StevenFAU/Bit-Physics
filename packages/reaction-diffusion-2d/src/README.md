# Stack-B WebGPU implementation

The TypeScript + WGSL Gray-Scott RD-2D compute-shader path.

## Phase 0 status

- `gray_scott.wgsl` — compute shader; 5-point Laplacian, periodic BCs,
  no atomics, no subgroup ops. Determinism declaration:
  `bit-exact-same-hw`.
- `index.ts` — driver that wires the shader through
  `@bit-physics/common-ts` (`createContext`, `makeBindGroupLayout`,
  `makeBindGroup`, `ComputePipeline`, `CaptureWriter`).
- **Local-only at Phase 0** per spec § 7.8 — CI runners lack a real GPU
  adapter. The Python NumPy reference produces the committed canonical
  capture; Phase 1+ exercises this path on a GPU host and verifies
  cross-stack equivalence at `rtol = 1e-4, atol = 1e-6` against the
  same canonical capture (spec § 6 verification posture).

## Run (local, requires a WebGPU adapter)

```bash
cd packages/reaction-diffusion-2d
pnpm install   # if not already installed at the workspace level
node --experimental-strip-types --no-warnings src/run-cli.ts
# or via Vitest (Phase 1+)
```

(`run-cli.ts` is intentionally not shipped in Phase 0; the WebGPU
path is exercised by Phase 1+ Stack-B tests that drive `runWebgpuGrayScott`
through Vitest. The `index.ts` export is the public surface.)

## API

```ts
import { runWebgpuGrayScott, CANONICAL_PARAMS, CANONICAL_DESCRIPTOR } from "./src/index.js";

const manifestPath = await runWebgpuGrayScott({
  outDir: "captures/reaction-diffusion-2d-ref",
});
console.log(`wrote ${manifestPath}`);
```

The default options run the canonical descriptor
(`gray-scott-lambda-128sq-seed42-step2000`) with 2000 steps at
`capture_interval=200`.

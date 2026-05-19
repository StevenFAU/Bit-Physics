# `@bit-physics/common-ts`

Stack-B common module (spec § 3.4, § 4.2). WebGPU primitives + h5wasm-
backed capture I/O + IndexedDB persistence + the cross-stack capture
invariance gate.

## Public surface

Per `docs/phases/phase-0-plan.md` § 3.3.7. Top-level re-exports at
`src/index.ts`:

- `createContext()`, `DeviceContext`
- `makeBindGroupLayout(ctx, storage, uniforms, label?)`,
  `makeBindGroup(ctx, layout, bindings, label?)`
- `ComputePipeline.create(ctx, source, options)`,
  `ComputePipeline#dispatch`, `ComputePipeline#reload`,
  `ComputePipeline#onReload` (hot-reload callback API)
- `RenderPipeline.create(ctx, source, options)`
- `CaptureWriter(manifest, outDir)` — writes HDF5 + JSON manifest
- `CaptureStore.open(options)` — IndexedDB store with explicit
  `schema_version` policy (rejects future-major requests)

## HDF5 in the browser

Captures are written via **h5wasm 0.10.1**
([usnistgov/h5wasm](https://github.com/usnistgov/h5wasm)), a WebAssembly
build of the HDF5 reference library. The TS payload is byte-compatible
with Python's `h5py`; the cross-stack invariance test at
`src/__tests__/cross-stack.test.ts` writes a capture via `CaptureWriter`
then spawns `uv run python -c "from capture import load_capture; ..."`
and asserts the values match.

### Layout (spec § 2.7)

```
/steps/{N}/state/{field_name}        dataset    per-field per-step ndarray
/steps/{N}/diagnostics/{check_name}  dataset    per-step scalar
/metadata/                           group with attrs replicating manifest
```

### dtype gotcha — `<d` and `<f`, not `<f8` and `<f4`

h5wasm uses a **shorter** dtype grammar than NumPy:

| h5wasm | NumPy / h5py | Bytes |
|---|---|---|
| `<d` | `<f8` / `float64` | 8 |
| `<f` | `<f4` / `float32` | 4 |
| `<i` | `<i4` / `int32` | 4 |
| `<q` | `<i8` / `int64` | 8 |

Passing `dtype: "<f8"` silently downcasts a Float64Array to float32.
The preflight (`common/common-ts/preflight/`) discovered this
empirically and the writer at `src/capture.ts` uses the h5wasm-native
codes throughout. See
[`preflight/README.md`](../../common/common-ts/preflight/README.md).

### h5wasm `create_attribute` quirk — explicit dtype required for numbers

h5wasm 0.10.1's `create_attribute` cannot infer the dtype for a bare
number or BigInt (throws `unguessable type for data`). The CaptureWriter
passes shape + dtype explicitly for the `seed` attribute:

```ts
meta.create_attribute("seed", [m.config.seed], [1], "<i");
```

Strings work without explicit dtype.

## Determinism

The `hello-physics` smoke sim runs a finite-difference FTCS scheme on a
periodic NxN grid. Same seed → byte-identical HDF5 payload. Tested at
`examples/hello-physics/hello-physics.test.ts`.

## Skipping WebGPU-device tests in CI

Per spec § 7.8, CI runners have no real GPU. Tests requiring a live
adapter are marked `it.skip(...)` in this package:

- `src/__tests__/pipelines.test.ts` — "compiles a trivial WGSL kernel"
- `src/__tests__/context.test.ts` — "returns a DeviceContext on a real GPU"

Local runs with a real adapter exercise the WebGPU surface; CI runs the
non-GPU subset.

## Running the gates

```bash
cd common/common-ts
pnpm install
pnpm typecheck             # tsc --noEmit
pnpm lint                  # eslint .
pnpm test                  # vitest run
pnpm test:cross-stack      # vitest run --reporter=default cross-stack
```

## IndexedDB schema version

`INDEXEDDB_SCHEMA_VERSION` is pinned at 1. `CaptureStore.open({
schemaVersion: > 1 })` rejects up front (same "reject unknown future
versions" posture as `bit-physics-diagnostics`).

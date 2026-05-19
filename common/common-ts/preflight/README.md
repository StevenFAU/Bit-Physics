# h5wasm round-trip preflight (Block 7 deliverable 0)

Confirms h5wasm (the WebAssembly HDF5 implementation) and h5py (the
Python reference reader) interoperate byte-for-byte on the canonical
capture-payload layout.

## Run

```bash
cd common/common-ts/preflight
pnpm install
node h5wasm-check.mjs                       # writes out/preflight.h5
cd ../../../tools/testkit
uv run python ../../common/common-ts/preflight/h5wasm-check.py
# expected: "match", exit 0
```

## What it proves

- h5wasm 0.10.1 installs cleanly on Node 24 LTS.
- h5wasm can write a float64 dataset whose binary representation is
  exactly what h5py expects.
- The round-trip preserves shape, dtype, and values bit-exactly.

## FACT — h5wasm dtype gotcha (discovered during preflight)

h5wasm uses NumPy-like dtype strings but its set is **shorter** than
NumPy's full grammar:

| h5wasm string | NumPy equivalent | Bytes |
|---|---|---|
| `<d` | `<f8` / `float64` | 8 |
| `<f` | `<f4` / `float32` | 4 |
| `<i` | `<i4` / `int32`   | 4 |
| `<q` | `<i8` / `int64`   | 8 |

**Passing `dtype: "<f8"` silently maps to float32 in h5wasm 0.10.1.**
That is, the `Float64Array` input is downcast to float32 at write
time, and h5py reads back a float32 dataset with the (downcast) values.

Always use the h5wasm-native codes (`<d`, `<f`, `<i`, `<q`). The
canonical layout used by `src/capture.ts` follows this convention.

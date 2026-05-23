# Determinism policy (spec § 2.5)

Per-stack guidance for what "deterministic" means in this portfolio and
which `determinism.claimed` value a sim should declare in its manifest.

The canonical contract — established by spec § 2.5 amendment under
`sub-phase-capture-determinism-contract` — is **content-equivalent over
the parsed Capture data model**. Two runs at the same seed on the same
hardware are deterministic iff every state array and every diagnostic
entry in their respective canonical Captures is bit-identical (np.array_equal
/ equivalent); wall-clock-influenced storage-format metadata (HDF5
object-header timestamps, file-system mtime, compression headers,
library-version banners) is explicitly excluded from the comparison.

The harness in this directory (`tools/testkit/determinism::run_twice_and_diff`)
witnesses this contract by parsing both captures into Capture objects and
diffing them under bit-exact mode (NumPy array-equality). Raw HDF5 file
byte-equality is NOT the contract.

## Claims

| Claim | Meaning |
|---|---|
| `bit-exact-same-hw` | Two runs on the same hardware with the same seed produce **content-equivalent** captures: every state array and every diagnostic entry is bit-identical under the canonical Capture projection. Storage-format metadata (HDF5 object-header timestamps, file-system mtime) is excluded from the comparison. The run-twice harness in this directory witnesses this claim. |
| `epsilon` | Two runs match within a documented tolerance, but not bit-exactly under the content projection. Cross-hardware claims, or claims involving non-associative floating-point summations across non-fixed worker pools, typically land here. The harness here does NOT witness `epsilon`; the cross-stack equivalence harness does. |
| `non-deterministic` | No reproducibility claim is made. Suitable only for exploratory work; not acceptable for Layer 4 reference sims. |

## Per-stack guidance

### Stack A (CPython / NumPy)

- Seed every `np.random.Generator` / `random.Random` at sim entry; do not rely on global state.
- Use `np.einsum` / dot-product over `np.add.reduce` where ordering matters.
- Avoid `set` iteration over floats (Python's `set` is hash-randomized).
- Avoid implicit parallelism: pin thread counts via `OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, or run inside a single-thread BLAS context.

### Stack B (TypeScript / WebGPU)

- WebGPU compute does not guarantee deterministic dispatch ordering across vendors. The portfolio's WebGPU sims claim `epsilon` by default; they upgrade to `bit-exact-same-hw` only when the workload uses no atomics, no subgroup ops, and a fixed workgroup tiling.
- Declare `atomic_ops` and `subgroup_ops` truthfully in the manifest — these flags are load-bearing for the integrity gate.
- Use a seeded PRNG (e.g. PCG32) implemented in the shader; do NOT call `Math.random()` from the host.
- The TypeScript determinism harness (`@bit-physics/common-ts::runTwiceAndDiff`) witnesses the same content-equivalent contract as the Python harness; both API surfaces are the canonical determinism gate for their respective stacks.

### Stack C (C++ / CUDA / HIP)

- Avoid `atomicAdd` on float types — its summation order is non-deterministic across launches.
- Pin `cudaStream` ordering and avoid `cudaDeviceSynchronize` races.
- Build with `-fp-contract=off` and a fixed FMA policy.

### Stack D (Taichi)

- Use `ti.init(arch=..., random_seed=<seed>)` and pass the same seed every run.
- Avoid `ti.atomic_add` over floats in conservation kernels; pre-sort indices.

### Stack E (JAX)

- Build with `jax.config.update("jax_enable_x64", True)` for deterministic floats where the algorithm allows.
- Use explicit PRNG keys (`jax.random.PRNGKey(seed)`); never rely on implicit randomness.

## Storage-format metadata posture (sub-phase-capture-determinism-contract)

The HDF5 capture payload format embeds wall-clock-influenced metadata in
its object headers (the H5O_MTIME_NEW message; one mtime per object
header). Two captures of the same simulation state written at different
Unix instants therefore produce non-byte-identical HDF5 files even when
the underlying data is identical. The pre-2026-05-23 byte-equality
contract was unstable across second boundaries; the post-amendment
content-equivalent contract is wall-clock-independent because the harness
compares parsed Capture arrays rather than raw file bytes.

Defense-in-depth at the writer surface: `tools/testkit/capture/writer.py`
sets `track_times=False` on every h5py object and uses
`libver="earliest"` to suppress HDF5 metadata variance at the source.
Producers of HDF5 captures in TypeScript (h5wasm 0.10.1) apply an
equivalent `Date.now()` shim during the write window — h5wasm does NOT
expose `H5Pset_obj_track_times` at the WASM-symbol level, so the shim is
the only viable userland path for this version.

## Promotion path

A sim that wants to upgrade its determinism claim from `epsilon` to
`bit-exact-same-hw` runs the harness in this directory ten times with the
same seed across an hour-long window and demands all ten verdicts come back
`content_equivalent=True`. The promotion commit cites the witness run-IDs in
its commit message footer.

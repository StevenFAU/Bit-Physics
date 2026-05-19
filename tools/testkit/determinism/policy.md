# Determinism policy (spec § 2.5)

Per-stack guidance for what "deterministic" means in this portfolio and
which `determinism.claimed` value a sim should declare in its manifest.

## Claims

| Claim | Meaning |
|---|---|
| `bit-exact-same-hw` | Two runs on the same hardware with the same seed produce byte-identical capture payloads. The run-twice harness in this directory witnesses this claim. |
| `epsilon` | Two runs match within a documented tolerance, but not bit-exactly. Cross-hardware claims, or claims involving non-associative floating-point summations across non-fixed worker pools, typically land here. The harness here does NOT witness `epsilon`; the cross-stack equivalence harness does. |
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

## Promotion path

A sim that wants to upgrade its determinism claim from `epsilon` to
`bit-exact-same-hw` runs the harness in this directory ten times with the
same seed across an hour-long window and demands all ten verdicts come back
`bit_exact=True`. The promotion commit cites the witness run-IDs in its
commit message footer.

# Determinism harness

Run-twice gate (spec § 2.5) that witnesses the `bit-exact-same-hw`
determinism claim. The harness lives at
`tools/testkit/determinism/harness.py` and exports the public surface
pinned in `docs/phases/phase-0-plan.md` § 3.3.2: `SimRunner` Protocol,
`DeterminismVerdict` dataclass, and `run_twice_and_diff()`.

## How it works

1. The caller supplies a `SimRunner(seed, out_dir) -> manifest_path`. The
   runner must respect `seed` deterministically (re-seed every RNG-touching
   object on every call).
2. `run_twice_and_diff()` invokes the runner twice with the same seed in
   independent output directories (`run-a/`, `run-b/`) beneath an optional
   `tmp_dir`.
3. The two resulting captures are diffed via Block-1's
   `diff_captures(..., mode="bit-exact")`. The verdict carries either
   `"captures match exactly"` or a structured first-mismatch detail.

The harness witnesses the strongest determinism claim only. Sims that
declare `epsilon` or `non-deterministic` are not relevant to this gate.

## Per-stack guidance

See `tools/testkit/determinism/policy.md` for guidance per stack (CPython
/ NumPy, TS / WebGPU, C++ / CUDA / HIP, Taichi, JAX).

## Tests

`tools/testkit/determinism/tests/test_harness.py` ships two stubs (a
deterministic one and a non-deterministic one) plus a third test that
asserts the harness creates the expected output directories. The
positive stub re-seeds `np.random.default_rng(seed)` on every call; the
negative stub uses `np.random.default_rng()` without a seed.

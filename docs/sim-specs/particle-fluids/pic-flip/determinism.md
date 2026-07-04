# pic-flip — Determinism strategy

> Per spec-ref § 8. Claim: **bit-exact-same-hw** for the Python NumPy
> reference (run-twice byte-identical captures; witnessed by
> `packages/pic-flip/tests/test_determinism.py` under the testkit
> `run_twice_and_diff` harness). The seven-clause declaration lives in
> the `pic_flip.sim` module docstring
> (`packages/pic-flip/pic_flip/sim.py`); summary:

1. **Lex-order particle + stencil iteration, no atomic scatter.** All
   hot kernels are single-threaded ``@njit(fastmath=False,
   cache=True)`` (per `docs/common/numba.md`) iterating particles in
   id order and the 9/27-node stencil in lex (di, dj[, dk]) order —
   fixed accumulation order, bit-identical FP residual across
   same-hardware runs (the MPM pattern).
2. **Fixed-iteration-cap masked Jacobi** — no tolerance early-stop
   branch (P24 pattern). The cap is per-canonical, chosen by measured
   hydrostatic convergence (spec-ref § 6.3), then pinned
   (`CANONICAL_N_JACOBI = 3000`).
3. **Deterministic regularizers.** Push-apart is a sequential
   Gauss-Seidel sweep in particle-id order over reverse-insertion cell
   linked lists — a pure function of the input ordering. The drift
   source is vectorized NumPy.
4. **CFL substep count** is `ceil(max_speed * dt / (cfl * dx))` — a
   deterministic function of the state, never wall-clock adaptive.
5. **RNG at IC synthesis only**, via `numpy.random.default_rng(seed)`;
   bare `numpy.random.*` global state banned in `reference` / `sim`.
   No Hypothesis leakage outside the PBT module.
6. **No BLAS path inside the step** — elementwise NumPy only in the
   projection / extrapolation sweeps.
7. **Deferred to the web frontend (Stack B):** fixed-point i32 atomic
   P2G run-twice byte-identity on-device (spec-ref § 9; the lumped
   diagonal mass makes the per-node accumulate independent, which is
   what makes that contract cheap). n/a in this reference.

APIC-specific note: FLIP's *exact* conservation route needs a full
(possibly singular) mass matrix — a coupled solve that is far harder
to bit-reproduce; APIC's lumped mass is one of the reasons it is the
primary verified mode (spec-ref § 8).

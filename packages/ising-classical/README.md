# ising-classical (Phase 3 task-3a)

Reference **2D Ising-classical** lattice-spin sim on **Stack B
(TypeScript / WebGPU)** — the first Stack-B SIM in Phase 3.

Metropolis-Hastings Monte Carlo with **checkerboard (red/black)
sublattice update** preserving detailed balance; `J = 1`, `h = 0`,
periodic boundary conditions, 128×128 lattice, `T = 2.27 ≈ T_c`.

- **NumPy reference (CI oracle):** `ising_classical/reference/ising_numpy.py`.
- **Stack-B WGSL impl (local-only, spec §7.8):** `src/metropolis.wgsl`
  + `src/index.ts` — PCG per-cell PRNG, no atomics, no subgroup ops.
- **Tests:** `tests/` (pytest-against-captures per RD-2D precedent;
  no `*.test.ts`).

Closed-form golden anchors: Onsager 1944 (`T_c = 2/ln(1+√2)`), Yang
1952 (`m(T)`), Kramers-Wannier 1941 (duality).

## Run

```
just run-ising-classical          # writes captures/ising-classical-ref/
just test-ising-classical         # pytest packages/ising-classical/tests/
```

Spec: `docs/sim-specs/lattice-spin/ising-classical/spec-ref.md`.
Charter: `docs/phases/sub-phase-phase-3-ising-classical.md`.

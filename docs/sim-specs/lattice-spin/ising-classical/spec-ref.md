# Ising-classical — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. Phase 3 task-3a
> deliverable A per `docs/phases/phase-3-plan.md:1388-1543` (§6.3a).

## 1. Scope

Reference 2D Ising-classical lattice-spin sim on **Stack B (TypeScript
/ WebGPU)**. Category: `lattice-spin`. Variant: `metropolis`. Stack: B
(per `docs/phases/phase-3-plan.md:59` + § 6.3a + spec
`docs/architecture.md:1195` § 5.10 + `docs/architecture.md:2012` §
11.4 item 3.7).

Method: Metropolis-Hastings Monte Carlo with **checkerboard (red/black)
sublattice update** preserving detailed balance (Glauber dynamics on a
bipartite lattice). 128×128 square lattice, periodic boundary
conditions, nearest-neighbour coupling `J = 1`, external field `h = 0`,
temperature `T = 2.27 ≈ T_c`.

**First Stack-B SIM in Phase 3** — its flow validates the
WebGPU/pytest-against-captures pipeline end-to-end (charter §1.1).

Non-goals (Phase 4+): cross-stack equivalence port, 3D Ising, Wolff /
Swendsen-Wang cluster updates, quantum Ising (Phase 6 ising-dwave
inherits this spec-sheet + glossary as documentation precedent only).

## 2. Upstream and reference anchor

No vendored upstream source (all anchors are closed-form / textbook):

- **Onsager, L. (1944).** *Crystal statistics. I. A two-dimensional
  model with an order-disorder transition.* Phys. Rev. **65**, 117.
  DOI `10.1103/PhysRev.65.117`. Critical temperature `T_c = 2/ln(1+√2)`.
- **Yang, C. N. (1952).** *The spontaneous magnetization of a
  two-dimensional Ising model.* Phys. Rev. **85**, 808. DOI
  `10.1103/PhysRev.85.808`. `m(T) = (1 - sinh⁻⁴(2β))^(1/8)`, `T < T_c`.
- **Kramers, H. A. & Wannier, G. H. (1941).** *Statistics of the
  two-dimensional ferromagnet. Part I.* Phys. Rev. **60**, 252. DOI
  `10.1103/PhysRev.60.252`. Duality `sinh(2β_c) = 1`.
- Textbook cross-anchors: Landau & Binder 2014; Baxter 1982 §7.10;
  Newman & Barkema 1999 Fig. 3.1 (cite-by-edition).
- Hand-derivation: `tools/testkit/golden/derivations/ising-onsager.md`
  (Stage-1b deliverable).

## 3. Algorithm

The 2D Ising Hamiltonian on an `n × n` periodic square lattice:

    H(s) = -J · Σ_<ij> s_i s_j  -  h · Σ_i s_i,   s_i ∈ {-1, +1}

evolves under Metropolis-Hastings Monte Carlo. One **step** is a
checkerboard sweep:

1. For every "white" site (parity `(i+j) % 2 == 0`), compute the local
   field `Σ_neighbours s`, the flip energy cost `ΔE = 2 s_i (J·Σ + h)`,
   and accept the flip with probability `min(1, exp(-β ΔE))`.
2. Repeat for every "black" site.

Because same-colour sites are never nearest neighbours, the
within-colour update is embarrassingly parallel and preserves detailed
balance — this is the structure the WGSL kernel exploits (no atomics,
no subgroup ops; PCG per-cell PRNG).

The ΔE derivation is grep-cited to the golden derivation
`tools/testkit/golden/derivations/ising-onsager.md`.

## 4. Algebraic form

Verifiable closed-form anchors at Stage 1a (grounded Stage 1b):

```
Critical temperature (Onsager 1944, J=1):
  T_c = 2 / ln(1 + √2) ≈ 2.2691853142

Kramers-Wannier duality (1941):
  sinh(2 β_c J) = 1   ⇒   β_c = ½ ln(1 + √2)   ⇒   T_c = 2/ln(1+√2)

Spontaneous magnetization (Yang 1952, T < T_c, J=1, β = 1/T):
  m(T) = (1 - sinh⁻⁴(2β))^(1/8)
  m(T) = 0                          for T ≥ T_c
```

The Kramers-Wannier duality hand-derivation lands at
`tools/testkit/golden/derivations/ising-onsager.md`.

## 5. Implementation

- Python Stack-B reference (CI oracle):
  `packages/ising-classical/ising_classical/reference/ising_numpy.py`.
- Shells landed at Stage 1a (raise `NotImplementedError`):
  - `reference/ising_numpy.py` (`critical_temperature`,
    `onsager_magnetization`, `initial_condition`, `metropolis_sweep`,
    `magnetization_per_spin`, `energy_per_spin`, `evolve`).
  - `sim.py` (`sim_runner_seeded`, `sim_runner_pbt`).
  - `__main__.py` (CLI per § 3.2.6).
- Stack-B WGSL impl (local-only per spec §7.8):
  `src/metropolis.wgsl` + `src/index.ts` — Stage 1b.
- Stage 1b implements all functions; the canonical capture is produced
  via `capture.write_capture`.

**§0.3 SHIFT layout note.** §6.3a literal
`lattice-spin/ising-classical/typescript/` is superseded by the
existing-convention `packages/<name>/` precedent (D-LAYOUT, mirrors
lenia). SHIFTED-surface-only — NO plan edit.

## 6. Verification posture (≥ 2 PBT invariants per spec § 2.14)

**Code verification.** Golden tables with ≥3 independent-reference
anchors per § 2.4:

- `tools/testkit/golden/tables/ising-classical-critical-temperature.json`
  — `T_c` anchored by Onsager 1944, Kramers-Wannier 1941 duality
  (hand-derivation), Landau & Binder 2014.
- `tools/testkit/golden/tables/ising-classical-magnetization.json` —
  `m(T)` at `T < T_c` anchored by Yang 1952, Baxter 1982 §7.10,
  Newman & Barkema 1999.

**Solution verification.** N/A at Phase 3.

**Property-based tests** (≥ 2 invariants per § 2.14 + § 6.0 item 7):

1. **`magnetization_bounded`** — `|m| = |(1/N) Σ s_i| ≤ 1` at every
   captured step, for randomly-sampled valid initial states +
   temperatures `T ∈ [1.0, 4.0]`. Holds by construction (`m` is the
   mean of `±1` spins).
2. **`energy_per_spin_bounded`** — `E/N ∈ [-2, 2]` at every captured
   step for the 2D nearest-neighbour Ising with `J = 1` (each of the
   `2N` bonds contributes `± J`; the per-spin extremum is `-2J` for a
   fully-aligned lattice). Holds for arbitrary spin configurations.

PBT module lives at `tools/testkit/property/sims/ising_classical/` per
§ 6.0 item 7; Hypothesis examples DB at
`packages/ising-classical/.hypothesis/` committed (NOT gitignored).

These invariants are mathematically pristine for Ising spins (the
lenia Stage-1b `mass_approximately_conserved` falsification does NOT
translate — Ising magnetization/energy bounds are exact, not
conservation laws).

**Determinism (D-WEBGPU-DET).** Bit-exact same-stack-same-hw via PCG
per-cell seed + deterministic checkerboard update order; no atomics,
no subgroup ops. Two-layer oracle:

- **Layer 1 (CI-visible):** `run_twice_and_diff(sim_runner_seeded,
  seed=42)` on the NumPy reference — `np.array_equal` on spin arrays +
  content-equivalent captures.
- **Layer 2 (local-only per spec §7.8):** WGSL kernel run twice with
  pinned seed; byte-identical capture payloads (D-DET-RUNTIME: CI has
  no GPU; recorded in the Stage-1b audit, not in CI).

STOP-DET re-characterizes distributional + EFECT if Layer 1 is NOT
bit-exact (charter §6 + smoke-stack-e gate-14 precedent).

**Mutation.** NO mutation gate at Stage 1c per D-MUT-SCOPE NO
RESOLVED-IN-CHARTER (§ 6.0 item 12 testkit-adjacent-only).

## 7. Golden values / Manufactured solutions

- `tools/testkit/golden/tables/ising-classical-critical-temperature.json`
  (Stage 1b) — `T_c` with three anchors.
- `tools/testkit/golden/tables/ising-classical-magnetization.json`
  (Stage 1b) — `m(T)` at canonical temperatures with three anchors.
- Derivation: `tools/testkit/golden/derivations/ising-onsager.md`.

## 8. Determinism

- Class: `bit-exact`. Scope: `same-stack-same-hw`.
- Atomic ops: `none`. Subgroup ops: `none`. Seed pinned: `true`.
- Registry row at `tools/testkit/determinism/registry.toml`
  (`[lattice-spin.ising-classical]`) lands at Stage 1b.

## 9. Equivalence

N/A at Phase 3 — Ising-classical is single-stack (Stack B only;
NumPy reference is the in-stack oracle, not a cross-stack pair).

Golden-table tolerances at
`tools/testkit/equivalence/tolerance.toml` per D-WIDE-TOL +
D-TOL-SCHEMA (Stage 1b): `critical_temp_rel = 1e-3` (finite-size shift
~1/L at L=128), `magnetization_rel = 5e-2` (MC statistical error at
10⁴ steps).

## 10. Diagnostics

Tier 3 module at `tools/diagnostics/tier3/ising_classical/` per § 3.2.9
(second `tier3/` subtree entry after `tier3/lenia/`). Magnetization
tracking, energy-per-spin bound, autocorrelation (documents critical
slowing-down; not gated per §6.3a H).

Tier 1 / Tier 2 surfaces consumed: `diagnostics.check_health`
(NaN/Inf), `diagnostics.check_bounds` (Tier-2 scalar_field, spins ∈
[-1, 1]).

## 11. Build and run

- `just run-ising-classical` — invoke the CLI (Stage 1b).
- `just test-ising-classical` — `pytest packages/ising-classical/tests/`.
- CI job: `.github/workflows/python-strict.yml` `test-ising-classical`
  (Stage 1b; mirrors `test-lenia` per D-CI).

```
python -m ising_classical --seed 42 --steps 10000 --grid 128 \
  --temp 2.27 --out captures/ising-classical-ref
```

## 12. References

- Onsager 1944 (Phys. Rev. 65, 117) — exact T_c.
- Yang 1952 (Phys. Rev. 85, 808) — spontaneous magnetization.
- Kramers-Wannier 1941 (Phys. Rev. 60, 252) — duality.
- `docs/phases/phase-3-plan.md` § 6.3a (`:1388-1543`) — task-3a prompt.
- `docs/phases/sub-phase-phase-3-ising-classical.md` — charter-v2.

## 13. Productization status

```yaml
productization:
  web: true      # 5.1 — Stack B WGSL surface (packages/ising-classical/src/)
  binary: false  # 5.2 — no CMake/C++ build
  pypi: true     # 5.3 — Python reference package (packages/ising-classical/pyproject.toml)
  render: true   # 5.4 — spin-domain fields are visually interesting
  preprint: true # 5.5 — canonical Ising model; Onsager/Yang analytic anchors
```

> Five-boolean block added at the Phase-5 reconciliation pass (converted from a
> prose note; see `docs/_audits/phase-5/reconciliation-*`). `pypi:true` is the
> SURFACED-ambiguity case: the sim's canonical artifact is the Stack-B WGSL web
> demo, but it also ships a CI-visible NumPy reference Python package, so both
> `web` and `pypi` are enabled (operator intent: productize everything). No
> vendored upstream (Onsager/Yang/KW cited-not-vendored), so 5.5 `discover` may
> defer it under the §4.9 vendored-upstream criterion despite `preprint:true`.
> Terminality context retained: task-3a unblocks task-4 onwards; no later Phase-3
> task imports `packages/ising-classical/`. Bootstrap-verification (spec § 3.8):
> `compare_captures` round-trip against `captures/ising-classical-ref/` resolves
> via the MEASURED bit-exact `[defaults.lattice-spin]` row (added at this pass).

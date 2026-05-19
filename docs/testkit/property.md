# Property-based testing harness

Hypothesis-backed property-based testing (spec § 2.14). The harness
lives at `tools/testkit/property/harness.py` and exports the surface
pinned in this document:

```
Pass(detail)
Fail(detail, counter_example)
Invariant(name, applies_to_category, check_fn)
InvariantResult(invariant, passed, detail, counter_example)
PropertyVerdict(all_passed, results)
run_invariants(sim_runner, invariants, strategy, n_examples, tmp_dir) -> PropertyVerdict
```

## How it works

1. The caller supplies a `SimRunnerPBT(initial_condition, out_dir) ->
   manifest_path` that produces a capture from a Hypothesis-generated
   initial condition.
2. `run_invariants` sweeps `n_examples` random ICs from the supplied
   strategy. For each `Invariant`, Hypothesis re-invokes the sim on
   randomly-generated ICs; the first `Fail` outcome triggers Hypothesis's
   shrinker to minimize the failing input. The shrunken counter-example
   is surfaced in `InvariantResult.counter_example`.
3. Per-invariant results aggregate into a `PropertyVerdict`.

## Built-in invariants

Located at `tools/testkit/property/invariants/`:

- `conservation_mass(field, tolerance)` — sum of `field` is conserved
  across all steps.
- `conservation_momentum(field, tolerance)` — likewise for a momentum
  field.
- `conservation_energy(field, tolerance)` — likewise for energy.
- `monotone_bounds(field, lo, hi)` — values stay within `[lo, hi]` at
  every step.
- `divergence_free_where_prescribed(field_x, field_y, tolerance)` — the
  discrete divergence of a 2D velocity field is below tolerance.
- `no_particle_overlap_within_epsilon(positions_field, epsilon)` — no
  pair of particles in a small-N configuration is closer than `epsilon`.

Each invariant declares its `applies_to_category` substring; the harness
does not enforce category matching at runtime (the author selects).

## Strategies

`tools/testkit/property/strategies.py`:

- `smooth_scalar_field_in_unit_box(shape, lo, hi)` — low-frequency
  Fourier-summed smooth field on a uniform grid; values clipped to
  `[lo, hi]`. Applicable to continuous-CA sims.
- `random_particle_configuration_1d(n_particles, domain)` — IID uniform
  particle positions; the shrinker drives toward coincident
  configurations.
- `random_seed()` — arbitrary nonnegative integer seed.

## Example database

Per spec § 2.14, the Hypothesis example database is committable so that
shrunken counter-examples reproduce across machines. `.gitignore` does
not exclude `.hypothesis/`; if the database becomes load-bearing in
Phase 1+ sims, those sims commit their per-test database under their
own packages. Phase-0 PBT runs use `database=None` to keep the test
environment hermetic; future phases may relax this.

## Tests

`tools/testkit/property/tests/test_harness.py` ships two stubs: a
mass-conserving sim (`np.roll`-based permutation; PBT passes) and a
mass-drifting sim (constant additive drift per step; PBT fails and
surfaces a counter-example). Both run against
`smooth_scalar_field_in_unit_box(shape=(32,))` with `n_examples=15`.

## Cost in CI

Phase 0 keeps `n_examples` small (≤ 15 in tests, ≤ 20 in Block-8 RD-2D
acceptance). Phase 1+ raises these budgets per sim.

# Tier 2 — Particle diagnostics

For sims whose primary state is a particle cloud (SPH-water, MPM,
boids-3d). Four checks exercise spatial admissibility, neighborhood
data-structure correctness, momentum conservation, and count
invariance.

> Status: scaffolded in Phase 1 Stage 1 per charter
> [`docs/phases/phase-1-plan.md`](../phases/phase-1-plan.md) § 3.5
> (interface contract IC-5).

## Source layout

| Path | Role |
|---|---|
| `tools/diagnostics/diagnostics/tier2/_types.py` | Shared `CheckResult` type (FACT) |
| `tools/diagnostics/diagnostics/tier2/particle/__init__.py` | Re-exports the four checks (FACT) |
| `tools/diagnostics/diagnostics/tier2/particle/no_overlap.py` | `check_no_overlap` (FACT) |
| `tools/diagnostics/diagnostics/tier2/particle/neighbor_list_integrity.py` | `check_neighbor_list_integrity` (FACT) |
| `tools/diagnostics/diagnostics/tier2/particle/momentum_conservation.py` | `check_momentum_conservation` (FACT) |
| `tools/diagnostics/diagnostics/tier2/particle/count_invariance.py` | `check_count_invariance` (FACT) |
| `tools/diagnostics/diagnostics/tier2/particle/tests/` | Synthetic-fixture pytest suite (FACT — 24 tests pass) |

## Checks

### `no_overlap` — `check_no_overlap(positions, epsilon) -> CheckResult`

For positions of shape `(N, D)`, verify every pair of distinct
particles is separated by at least `epsilon` (Euclidean). Returns
`value = min_pair_distance` (or `inf` for `N < 2`) and a
`n_violating_pairs` count in `details`.

Implementation: numpy-only O(N²) pairwise. Acceptable for Phase 1
Stage 2 fixtures (`N < 1024`); Phase 2+ implementer phases for
sph-water / mpm-multimaterial should swap in a kd-tree variant once
the substack is exercised at production scale.

INFERENCE: kd-tree swap deferred; charter does not mandate
``scipy`` as a Stage 1 dependency, and the spec § 9.2 dependency
rationale (deps cost integration) argues against pulling it in
purely for this check while N is bounded.

### `neighbor_list_integrity` — `check_neighbor_list_integrity(positions, neighbor_lists, cutoff_radius) -> CheckResult`

Verifies three invariants of a declared neighbor-list structure:

1. **Self-exclusion** — no particle appears in its own list.
2. **In-cutoff** — every declared `(i, j)` pair satisfies
   `|x_i - x_j| <= cutoff_radius`.
3. **Symmetry** — `j ∈ list[i] ⇒ i ∈ list[j]`.

`details` reports per-class violation counts.

### `momentum_conservation` — `check_momentum_conservation(velocities_t0, velocities_t1, masses, tolerance_rel=1e-5) -> CheckResult`

Component-wise relative drift of total momentum
`sum_i m_i v_i` between two snapshots. Zero-magnitude reference
falls back to absolute-difference comparison against `tolerance_rel`
(so elastic-collision systems where total momentum is the zero
vector also work).

### `count_invariance` — `check_count_invariance(count_t0, count_t1) -> CheckResult`

Smallest possible check: `count_t1 - count_t0 == 0`. Cheap; catches
whole classes of bugs early.

## Dependencies (Phase 1 Stage 1)

| Name | Version | Rationale (spec § 9.2) | Provenance |
|---|---|---|---|
| `numpy` | ≥ 2.0 | Array operations | Inherited from `tools/diagnostics/pyproject.toml` (FACT) |
| `pytest` | ≥ 8.0 | Test runner | Inherited dev dep (FACT) |

No new dependencies introduced. `scipy` is intentionally NOT added
(see INFERENCE under `no_overlap`).

## Verification posture (Roy 2005)

- **Code verification:** synthetic fixtures with hand-computable
  expected values (regular grids, colocated pairs, elastic
  collisions). 24 tests; all pass on Stage 1 commit.

## Stage 1 commit-time test outcome (FACT)

```
============================== 24 passed in 0.20s ==============================
```

## Consumers (forward-looking)

Consumed by Phase 1 Stage 2's `boids-3d`, `physarum`, `sph-water`,
`mpm-multimaterial` failing-test suites per charter § 7.5 / § 7.7 /
§ 7.10.

# boids-3d — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows
> charter IC-10. FACT/INFERENCE-tagged per IC-9.

## 1. Scope

3D Reynolds 1987 boids — separation, alignment, cohesion. Category
`agent-based` (spec § 5.3). Stack B (WebGPU compute + render). Variant
`reynolds-1987-canonical`. Non-goals: 2D variant, learned flocking
(Phase 4+), scalability frontier (large-N broadphase).

## 2. Upstream and reference anchors

- **Reynolds 1987.** DOI 10.1145/37401.37406.
- **Reynolds 1999.** <https://www.red3d.com/cwr/steer/>.

Algebraic anchor: [`algebraic.md`](./algebraic.md).

## 3. Algorithm

Per [`algebraic.md`](./algebraic.md) §§ 2–3:
1. For each agent, find neighbors within $r_{\mathrm{perc}}$.
2. Compute separation, alignment, cohesion forces.
3. Weighted-sum acceleration; explicit Euler velocity update; clamp.
4. Position update.

## 4. Algebraic form

See [`algebraic.md`](./algebraic.md). Canonical golden table at
`tools/testkit/golden/tables/agent-based/boids-3agent-step1.json`
encodes the closed-form post-step velocities and positions for the
3-agent fixture.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests only.
**Phase 2+ implementation contract:**

- Python reference at `packages/boids-3d/boids_3d/reference/`
  (separation, alignment, cohesion + Euler integrator).
- `boids_3d.sim.sim_runner_seeded` matching testkit `SimRunner`.
- Stack B WebGPU compute path at `packages/boids-3d/src/`.

## 6. Verification posture

### 6.1 Code verification
**Method:** golden-value.
**Fixture(s):** `tools/testkit/golden/tables/agent-based/boids-3agent-step1.json`.
**Pass criterion:** Phase 2+ reference reproduces the 3-agent fixture
within `absolute = 1e-12`.
**Phase 1 state:** test committed and failing with module-not-found
(`boids_3d.reference` does not exist).

### 6.2 Solution verification
**Method:** none. No PDE.
**Status:** not applicable.

### 6.3 Model validation
**Status:** declared. Flocking metrics (cohesion index, polarization)
vs. published values where available; deferred to Phase 2+ for
metric-by-metric validation.

### 6.4 Calculation validation
**Status:** not applicable.

### 6.5 Gate status
- Gates 1, 2, 3 of spec § 3.5 exercised in this phase.
- Gates 4–10 deferred.

### 6.6 PBT-covered invariants (≥ 2 per R9 amendment / spec § 2.14)

1. **`v_max_clamp_respected`** — for any IC and any number of steps,
   $\|\mathbf{v}_i\| \le v_{\max}$ post-clamp. PBT: random IC, random
   step count.
2. **`particle_count_invariant`** — the agent count is conserved
   across steps (no spawning / removal). PBT: random IC, random step
   count; assert `count(t_n) == count(t_0)`.

Implementation lives at `packages/boids-3d/boids_3d/invariants/`
(deferred).

## 7. Golden values / Manufactured solutions

Golden table: `tools/testkit/golden/tables/agent-based/boids-3agent-step1.json`.
No MMS (no PDE).

## 8. Determinism

`bit-exact-same-hw` if neighbor enumeration is deterministic
(broadphase-free at small N; spatial hash with deterministic bucket
order at large N). See [`determinism.md`](./determinism.md).

## 9. Equivalence

Category default per `tools/testkit/equivalence/tolerance.toml`. No
override at Phase 1. See [`equivalence.md`](./equivalence.md). Note —
the closed-form category default is appropriate here as boids has no
chaotic divergence at the 3-agent fixture (the chaotic large-N regime
is exercised by Phase 2+ tests with looser tolerance).

## 10. Diagnostics

- Tier 1: `check_health`, `check_performance`, `check_determinism`.
- Tier 2 particle (IC-5): `check_no_overlap`, `check_count_invariance`,
  `check_neighbor_list_integrity`, `check_momentum_conservation`
  (advisory — boids is not conservative under the steering forces).

## 11. Build and run

```bash
(cd packages/boids-3d && PYTHONPATH=. python3 -m pytest tests/ -v)
```

## 12. References

- Reynolds 1987, 1999, op. cit.
- Spec § 5.3, § 2.4, § 2.5, § 2.6, § 2.14, § 8.2.
- Charter § 7.5, § 3.8, § 3.10.

## 13. Productization status

```yaml
productization:
  web: true       # 5.1
  binary: false   # 5.2
  pypi: false     # 5.3
  render: true    # 5.4
  preprint: false # 5.5 — engineering, not research
```

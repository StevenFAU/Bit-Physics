# physarum — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows
> charter IC-10.

## 1. Scope

Jones 2010 *Physarum*-transport algorithm. Category `agent-based`
(spec § 5.3). Stack B (WebGPU compute). Variant `jones-2010-canonical`.
Non-goals: 3D extension (Phase 4+), differentiable variant, learned
update rule (Phase 4+).

## 2. Upstream and reference anchors

- **Jones 2010.** DOI 10.1162/artl.2010.16.2.16202.

Algebraic anchor: [`algebraic.md`](./algebraic.md).

## 3. Algorithm

Five-component step per [`algebraic.md`](./algebraic.md) § 2: sense,
rotate, move, deposit, diffuse+decay. Stochastic on tie at the rotate
step; deterministic-seeded otherwise.

## 4. Algebraic form

Per [`algebraic.md`](./algebraic.md). Closed-form deposit anchor at
`tools/testkit/golden/tables/agent-based/physarum-deposit-step1.json`.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests only.
**Phase 2+ contract:**

- Python reference at `packages/physarum/physarum/reference/`.
- `physarum.sim.sim_runner_seeded` matching testkit `SimRunner`.
- Stack B WebGPU compute path at `packages/physarum/src/`.

## 6. Verification posture

### 6.1 Code verification
**Method:** golden-value (deposit-step anchor) + distributional
(trail-density histogram at long horizon).
**Fixture(s):**
- `tools/testkit/golden/tables/agent-based/physarum-deposit-step1.json`
  (deterministic anchor; 3 independent-reference anchors).
- Canonical capture descriptor `physarum-jones-256x256-seed42-step10000`
  (placeholder sidecar; Phase 2+ implementation populates the
  payload; EFECT/χ² comparison is the harness).

**Pass criterion:**
- Deposit-step anchor: exact match (zero stochasticity in the
  deterministic limit).
- Long-horizon: distributional, EFECT or χ²; spec § 2.6 default
  closed-form tolerance applies as the **scalar-field** density
  histogram metric.

**Phase 1 state:** test committed and failing with
`ModuleNotFoundError`.

### 6.2 Solution verification
**Method:** none. No PDE in the per-agent model; the trail map's
diffuse-and-decay is a discrete operator.
**Status:** not applicable.

### 6.3 Model validation
**Status:** declared. Jones 2010 § 5 publishes pattern-formation
images for comparison (Phase 2+).

### 6.4 Calculation validation
**Status:** declared. Pattern density / fractal dimension vs.
published images (Phase 2+).

### 6.5 Gate status
- Gates 1, 2, 3 of spec § 3.5 exercised.
- Gates 4–10 deferred.

### 6.6 PBT-covered invariants (≥ 2)

1. **`trail_mass_conserves_modulo_decay`** — between deposit step
   (step 4) and the next deposit step (step 4 of the next iteration),
   trail mass changes by exactly `n_active_agents * deposit_amount -
   alpha * total_mass`. PBT: random IC, single step, verify the
   algebraic invariant.
2. **`agent_count_invariant`** — the agent count is preserved
   across steps. PBT: random IC, random step count.

Implementation at `packages/physarum/physarum/invariants/`
(deferred).

## 7. Golden values / Manufactured solutions

Golden table at
`tools/testkit/golden/tables/agent-based/physarum-deposit-step1.json`.
No MMS.

## 8. Determinism

`bit-exact-same-hw` for the deterministic limit (zero-trail IC).
For the chaotic regime: epsilon same-stack same-hw (atomics in
deposit are the source).

See [`determinism.md`](./determinism.md).

## 9. Equivalence

Stack-B-only at Phase 1. Per [`equivalence.md`](./equivalence.md).
Chaotic regime uses distributional metrics (EFECT or χ²).

## 10. Diagnostics

- Tier 1: `check_health`, `check_performance`, `check_determinism`.
- Tier 2 particle (IC-5): `check_count_invariance`, optionally
  `check_neighbor_list_integrity` (not relevant for boundless agent
  movement; advisory).
- Tier 2 scalar_field (Phase 0): `check_bounds` on the trail map,
  `check_conservation` (advisory — trail decays with α).

## 11. Build and run

```bash
(cd packages/physarum && PYTHONPATH=. python3 -m pytest tests/ -v)
```

## 12. References

- Jones 2010, op. cit.
- Spec § 5.3, § 2.4, § 2.5, § 2.6, § 2.14.
- Charter § 7.5.

## 13. Productization status

```yaml
productization:
  web: true       # 5.1
  binary: false   # 5.2
  pypi: false     # 5.3
  render: true    # 5.4
  preprint: false # 5.5
```

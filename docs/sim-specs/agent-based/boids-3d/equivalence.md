# boids-3d — Cross-stack equivalence

> Per charter § 2.2 and spec § 2.6.

## Tolerance row

Consumes `closed_form` defaults (the only nearest category default in
`tolerance.toml`; agent-based has no separate entry — the 3-agent
fixture is closed-form arithmetic):

| Axis | Value |
|---|---|
| `relative` | `1.0e-5` |
| `absolute` | `0.0` |

No per-sim override. **INFERENCE** — the lack of an `agent-based`
category default in `tolerance.toml` is a Phase 0 design choice; the
3-agent canonical-fixture comparison uses closed-form arithmetic and
should be bit-exact at the f64 level. Phase 2+ may add an
agent-based category entry if larger-N comparisons need distinct
tolerance.

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| Stack B (single GPU) self-replicates | Not yet exercised | Phase 2+ |
| Stack A (Shadertoy port) ↔ Stack B | Not planned | n/a |

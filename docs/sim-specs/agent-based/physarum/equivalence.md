# physarum — Cross-stack equivalence

> Per charter § 2.2 and spec § 2.6.

## Tolerance row

The Phase 0 `tolerance.toml` has no `agent-based` or `physarum`
category default; closed-form defaults apply for the deterministic
anchor (deposit step under zero-trail IC). Chaotic-regime
comparisons use **distributional** metrics:

| Metric | Tolerance |
|---|---|
| Deposit-step anchor (deterministic limit) | `relative = 1e-5`, `absolute = 0.0` (closed-form default) |
| Trail-density histogram at long horizon | EFECT or χ² (Phase 2+ implementation contract) |

**INFERENCE.** A future `physarum` per-sim override may tighten the
histogram tolerance once published target distributions are pinned.

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| Stack B self-replicates (deterministic limit) | Not yet exercised | Phase 2+ |
| Stack B self-replicates (chaotic regime) | Not yet exercised | Phase 2+ — distributional |

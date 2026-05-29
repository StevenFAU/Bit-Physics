# Classical references — reusable code-verification oracles

Pure, stack-agnostic **classical numerical solvers** that serve as independent
verification baselines for sims. Distinct from the `mms/` infrastructure (method of
manufactured solutions): a *classical reference* is a textbook numerical method
(e.g. a 5-point finite-difference Laplacian) verified against the analytic / MMS
solution, then reused as an oracle that other sims compare against.

Phase 3 task-7 (`pinn-poisson`) establishes this surface with the first reference.

## Pattern

Each reference is a self-contained subdirectory `<method>/` (hyphenated, so it is
**path-loaded**, not imported — the tier-3 diagnostics precedent) containing a pure
`solver.py`:

- **Stack-agnostic** — only `numpy`/`scipy`; **no** Warp / PyTorch / project-package
  imports. Callers pass plain callables (`source(x,y)`, `boundary(x,y)`), so any sim
  can supply its own problem.
- **Anchored, not independent** — a finite-difference (or similar) solver is a
  *numerical baseline anchored to the analytic solution*; it carries its own
  discretization error. It is NOT a second independent reference for Cat-3 anchor
  counting.
- **Ships a convergence-order check** — because a classical reference's correctness
  cannot be reduced to point-matching at a single resolution, each solver ships an
  `observed_convergence_orders(...)` (or equivalent) that refines the grid against
  the analytic/MMS solution and confirms the expected truncation order. This is the
  rigor substitute when the reference's mutation target is deferred (rule-of-three).

## Mutation-target policy (rule-of-three)

A classical reference is a NEW reusable testkit surface, which raises whether it
should ship a mutation-testing baseline. Per the rule-of-three, the **first**
classical reference does **not** — the pattern is not yet established by three
consumers, and its correctness rests on the analytic anchoring + the
convergence-order check. The mutation-target decision is routed to **task-9**
(maturation). New references should `# surface` (not silently skip) if the live
mutation convention (`tools/testkit/mutation/mutmut-config.toml`) ever mandates a
baseline for this surface.

## References

| Method | Path | Verified against | Order | First consumer |
|---|---|---|---|---|
| 2D Poisson, 5-point FD | `poisson-2d-fd/solver.py` | Evans §2.2 / Strauss §6.2 / MMS analytic anchors | `O(h²)` ≈ 2 | `pinn-poisson` (task-7) |

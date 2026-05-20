# physarum — Determinism declaration

> Per spec § 2.5.

## Declaration

**`bit-exact-same-hw`** in the deterministic limit (zero-trail IC,
canonical tie-breaker). **Epsilon same-stack same-hw** in the
chaotic regime (non-zero trail; atomic deposits to shared cells).

### Sources of nondeterminism

| Source | Present | Mitigation |
|---|---|---|
| Atomic add at deposit step | Yes (multiple agents may target same cell) | Pinned summation order; cross-stack falls back to **distributional** comparison per spec § 2.6 |
| Stochastic tie-break at rotate step | Only at random tie events | Seeded PRNG; same-hw + same-seed → bit-exact |
| Subgroup-collective ops | Optional (broadphase) | Skip in Phase 1+ canonical implementation |
| Driver / vendor FMA fusion | Yes | Pinned hardware/driver |

### Cross-stack reproducibility

Chaotic-regime cross-stack equivalence is **distributional**, not
trajectory-bit-exact (per Jones 2010 § 5 — pattern formation is a
sensitive function of initial trail noise).

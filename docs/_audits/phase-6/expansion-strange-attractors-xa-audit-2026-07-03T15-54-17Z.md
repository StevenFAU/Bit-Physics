---
date: 2026-07-03
author: expansion-agent
phase: 6
lane: "mixed (B polish + ratified expansion)"
artifact: dispatch-audit
artifact_id: expansion-strange-attractors-xa-audit
dispatch: "strange-attractors feature expansion — L-1..L-3 (Lane B) + X-A (ratified family)"
verdict: LANDED
verdict-state: X-B-ELIGIBLE
head_sha_at_start: 6588da58e242f8a5d467c6d1360409bed874ec36
evidence_paths:
  - packages/strange-attractors/web/feature-expansion-spec.md
  - common/common-web/src/colormap.ts
  - packages/strange-attractors/web/src/fields/attractors_rk4.wgsl
  - packages/strange-attractors/web/src/attractors.ts
  - packages/strange-attractors/strange_attractors/system.py
  - tools/testkit/golden/tables/closed-form/rossler-structural.json
  - tools/testkit/golden/tables/closed-form/aizawa-structural.json
  - tools/testkit/golden/tables/closed-form/sprott-a-structural.json
  - captures/strange-attractors-ref/rossler-trajectory-seed42-step10000.json
  - captures/strange-attractors-ref/aizawa-trajectory-seed42-step10000.json
  - captures/strange-attractors-ref/sprott_a-trajectory-seed42-step10000.json
---

# Phase-6 expansion audit — strange-attractors L-1..L-3 + X-A

> Append-only record for the feature-expansion dispatch (spec:
> `packages/strange-attractors/web/feature-expansion-spec.md`, v0.2).
> Operator ratification for ALL clusters (L-* Lane B + X-* full discipline)
> given 2026-07-03 ("execute the entire spec") and recorded in the spec
> commit. Boundary-crossing work is confined to the two `xa-family-*`
> commits — never slipped into a styling commit (charter § 3.1).

## § 1 — Work landed (commit chain, this dispatch)

1. `4d0bec3` — spec v0.1 (citation audit; ratification recorded).
2. `1657376` — **L-1** (Lane B): shared common-web colormap facility (repo's
   first), color-by drivers, wall projections, uniform-driven themed blit.
3. `742287d` — **L-2** (Lane B): return map, Poincaré section, live λ₁
   readout (windowed fit: naive 0.52 → windowed 0.84 vs lit. ≈0.9056),
   committed-kernel bifurcation sweep, ρ bifurcation-sequence chips.
4. `d17e37d` — **L-3** (Lane B): 3D orbit + zoom uniforms, Study scrub,
   deterministic IC nudger, deep-link URL hash.
5. `7f7803e` — **X-A backend** (ratified): System protocol + registry;
   Rössler/Aizawa/Sprott-A golden tables + derivations + SymPy generators;
   gated captures (real checksums; run-twice byte-identical + cross-seed
   distinct MEASURED); ≥2 PBT invariants per system; perf-ledger rows;
   spec-ref/determinism/equivalence updates; checksum placeholder retired.
6. `a44ae65` — **X-A web** (ratified): `attractors_rk4.wgsl` display kernel
   (THE boundary-crossing artifact), attractor registry, per-system EXPLAIN
   with committed-artifact links, registry-driven instruments.

## § 2 — The ratified boundary crossings, explicitly

- `packages/strange-attractors/web/src/fields/attractors_rk4.wgsl` — new
  compute kernel + step loop (charter § 3.1 class). Display buffers ONLY;
  the committed `packages/strange-attractors/src/lorenz_rk4.wgsl`, the
  capture path, tolerances and seeds are untouched (verified: capture export
  while Sprott-A selected emits variant=lorenz seed-42; pipeline validate
  `new_canonical + run-twice` PASS after every cluster).
- Backend family surface (`system.py`, `sim.py` generic path, reference
  helpers, invariants) — additive; the Lorenz entry points and their gate
  behavior are bit-identical (26/26 package tests green; the three SymPy
  generators `--verify` OK).

## § 3 — Pickover: deferred-with-cause (operator-voidable)

The chartered fifth member is NOT landed. MEASURED at implementation: the
`algebraic.md` § 6 "continuous" form under RK4 diverges unboundedly in y
(3 of 4 probe ICs, max|y| > 2e4) or converges to a stable fixed point — it
is the classical discrete map mislabeled with dots. A map iterator sits
outside spec-ref § 3 (RK4-only). Evidence: `algebraic.md` § 6 (resolution
note), spec-ref § 7, expansion spec § 9.2. Void condition: a source
documenting a genuinely chaotic continuous Pickover variant.

## § 4 — Gates at close

- `pipeline.py validate --sim strange-attractors`: **PASS** (run-twice
  byte-identical, on-attractor envelope; re-run after L-1, L-2, L-3, X-A).
- Package tests: **26 passed** (golden family ×10, PBT ×7, determinism,
  diagnostics); generators ×3 `--verify` exit 0.
- `tsc --noEmit`: clean; `gen-verification.mjs` idempotent, FAIL-HARD
  anchors extended to the family kernel + manifests.
- Perf-ledger: 3 baseline rows appended (numpy-reference, 2026-07-03).

## § 5 — Deferred / follow-ups

- X-B (Thomas, Halvorsen) and X-C (Dadras, Chen, Four-wing) require the
  spec-ref § 1 scope amendment as an explicit ratification deliverable
  (spec § 3.3); operator ratification already given 2026-07-03.
- Poster/loop regeneration: defaults reproduce pre-expansion output
  exactly, so no recalibration was required this dispatch.

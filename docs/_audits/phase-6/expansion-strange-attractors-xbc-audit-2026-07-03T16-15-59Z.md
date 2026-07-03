---
date: 2026-07-03
author: expansion-agent
phase: 6
lane: "ratified expansion (scope amendment)"
artifact: dispatch-audit
artifact_id: expansion-strange-attractors-xbc-audit
dispatch: "strange-attractors X-B (Thomas, Halvorsen) + X-C (Dadras, Chen, Four-wing)"
verdict: LANDED
verdict-state: EXPANSION-SPEC-COMPLETE
head_sha_at_start: f12dec5
parent_audits:
  - "[[expansion-strange-attractors-xa-audit-2026-07-03T15-54-17Z]]"
evidence_paths:
  - docs/sim-specs/closed-form/strange-attractors/spec-ref.md
  - docs/sim-specs/closed-form/strange-attractors/algebraic.md
  - packages/strange-attractors/web/src/fields/attractors_rk4.wgsl
  - packages/strange-attractors/web/src/attractors.ts
  - tools/testkit/golden/tables/closed-form/thomas-structural.json
  - tools/testkit/golden/tables/closed-form/halvorsen-structural.json
  - tools/testkit/golden/tables/closed-form/dadras-structural.json
  - tools/testkit/golden/tables/closed-form/chen-structural.json
  - tools/testkit/golden/tables/closed-form/fourwing-structural.json
---

# Phase-6 expansion audit — strange-attractors X-B + X-C (scope amendment)

> Closes the feature-expansion dispatch begun in the X-A audit. Both
> clusters were operator-ratified 2026-07-03 alongside X-A; per the
> expansion spec § 3.3 their ratification carries an explicit spec-ref
> § 1 scope amendment (these five systems were NOT in the original
> chartered family) — landed as a named deliverable of the
> `xbc-family` commit, not slipped in.

## § 1 — Work landed

Single dispatch commit (backend + web, both surfaces ratified):
`feat(phase-6/xbc-family)` — Thomas + Halvorsen (X-B), Dadras + Chen +
Four-wing (X-C), each with the full X-A-precedent per-system checklist:
reference module + structural helpers, golden table + derivation +
SymPy verify-generator, SYSTEMS registry row, canonical capture (real
checksum; run-twice byte-identical + cross-seed distinct MEASURED),
≥ 2 PBT invariants, perf-ledger baseline row, algebraic.md §§ 9–13,
spec-ref § 1 amendment + § 6.6 items 8–12 + § 7 table rows, display
kernel field_id 4–8, web registry rows + EXPLAIN anchors.

## § 2 — The ratified boundary crossings, explicitly

Five new field functions + switch cases in
`packages/strange-attractors/web/src/fields/attractors_rk4.wgsl`
(charter § 3.1 kernel class). Display buffers only. The committed
Lorenz kernel, capture path, tolerances and seeds are untouched:
capture export while Four-wing was selected emitted variant=lorenz
seed-42 (measured in the headless run), and the browser gate
(`new_canonical + run-twice`) passed after the wiring.

## § 3 — Measured facts of record

- dt/IC per system measured-then-declared vs the RK4 step-halving
  probe: Thomas 6.4e-6 @ dt=0.05, Halvorsen 4.6e-5 @ 0.005, Dadras
  3.5e-6 @ 0.005, Chen 9.2e-5 @ 0.002 (the spec § 3.3.1 stiff/fast
  note honored), Four-wing 1.2e-9 @ 0.01; all bounded full-horizon.
- DOIs for Thomas 1999 / Dadras–Momeni 2009 / Chen–Ueta 1999 verified
  against Crossref at implementation; no page-level citations were
  invented for the catalog-only systems (Halvorsen, Four-wing —
  anchored to Sprott 2003 / 2010 ISBNs + the repo's spec table).
- Thomas' transcendental diagonal fixed point anchored by three
  independent numerical routes (mpmath 30 dps / bisection / residual).

## § 4 — Gates at close

- `pipeline.py validate --sim strange-attractors`: **PASS**.
- Package tests: **52 passed** (26 golden-family items, 17 PBT,
  determinism, diagnostics); 5 generators `--verify` exit 0 with a
  perturbed-table negative control exercised.
- `tsc --noEmit` clean; `gen-verification.mjs` idempotent with
  FAIL-HARD anchors over all 8 family systems + Lorenz.

## § 5 — Family status at expansion-spec close

9 systems live in the instrument: Lorenz (committed Phase-2 kernel,
capture-pinned) + Rössler, Aizawa, Sprott-A (X-A) + Thomas, Halvorsen
(X-B) + Dadras, Chen, Four-wing (X-C). Pickover remains
deferred-with-cause (X-A audit § 3; operator-voidable). The
feature-expansion spec (v0.3) is fully executed.

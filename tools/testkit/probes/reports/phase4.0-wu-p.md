# Pre-implementation probe — WU-P (Portfolio Conventions), Phase 4.0

> Per `docs/architecture.md` § 2.9. WU-P is docs-only (no TDD); this probe
> substantiates the conventions `docs/portfolio-conventions.md` codifies, so the
> doc states established repo fact rather than re-derived memory.

## 1. Scope

WU-P produces `docs/portfolio-conventions.md` — the single canonical cross-sim
convention reference for Phase 4 (units, coordinates, time semantics, capture-field
naming registry, seed derivation, default tolerances). Every subsequent WU and
every Phase-4.1+ sim references it. Content is prescribed by phase-4-plan § 4.2.P.

## 2. API surfaces consumed

None (docs-only). WU-P imports no module.

## 3. Upstream citations

None vendored by WU-P. The Coordinates section cites OpenUSD's Y-up default
(consumed first-class by WU-D per phase-4-plan § 4.2.D).

## 4. Probe findings (grep-verified at HEAD `fe30cba`)

- **Existing portfolio-scope convention docs at Phase-3 close:** NONE.
  `docs/portfolio-conventions.md` is absent (`ls` confirms); `docs/architecture.md`
  has no Appendix-G "portfolio conventions" section. WU-P creates the canonical
  doc; it extends nothing.
- **Phase-1/3 sim units/coords/time observed:** sim `spec-ref.md` files use SI
  base units implicitly (physical sims) and dimensionless state for CA sims
  (`packages/lenia/`, `packages/neural-ca/` — `dt = 1.0`, non-physical state).
  No sim declares a Z-up deviation. Capture manifests carry `seed` and per-sim
  `params`; `sim_time` is implicit (step-indexed) in current captures — the doc
  declares the canonical going-forward field for Phase-4 sims.
- **Existing testkit tolerance values** (`tools/testkit/equivalence/tolerance.toml`
  `[defaults.*]`): `closed_form` rel 1e-5 / abs 0.0; `reaction-diffusion` rel 1e-4;
  `sph` rel 1e-4; etc. The "Default tolerances per category" section references
  these as the established defaults.
- **Capture-field naming:** existing captures use ad-hoc per-sim field names
  (e.g. neural-ca `rgba`, sph-water `position`/`velocity`). The registry codifies
  the Rule-of-Three canonical names for fields recurring across ≥3 sims, per
  phase-4-plan § 4.2.P (density, velocity, pressure, position, mass, force,
  temperature, deformation_gradient).
- **Strict-mode lint invocations:** `uv run --no-sync python -m integrity --all
  --mode strict` (Cat 4 validates any `<path>:<line>` assertions in the doc — WU-P
  has none, so it passes trivially); markdown rendering via the repo's standard
  doc-lint. No ruff/mypy (no code).

## 5. Deviations from plan § 4.2.P

None. The six prescribed sections are authored verbatim to the § 4.2.P content,
with the canonical field-name registry table reproduced exactly.

## Provenance

Read-only probe at HEAD `fe30cba` (Phase-4 PHASE-A + residue chain pushed; CI
green). Docs-only WU; no failing-tests output hash needed (acceptance = markdown
lint + Cat 4 green per § 7.1 v9 addendum).

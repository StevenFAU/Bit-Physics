---
date: 2026-05-19T15-03-05Z
author: phase-0-block-6-agent
phase: 0
artifact: block
artifact_id: block-6-diagnostics
verdict: CONFIRMED
evidence_paths:
  - tools/diagnostics/pyproject.toml
  - tools/diagnostics/README.md
  - tools/diagnostics/diagnostics/__init__.py
  - tools/diagnostics/diagnostics/tier1/__init__.py
  - tools/diagnostics/diagnostics/tier1/capture_io.py
  - tools/diagnostics/diagnostics/tier1/health.py
  - tools/diagnostics/diagnostics/tier1/performance.py
  - tools/diagnostics/diagnostics/tier1/determinism.py
  - tools/diagnostics/diagnostics/tier1/reports.py
  - tools/diagnostics/diagnostics/tier1/tests/conftest.py
  - tools/diagnostics/diagnostics/tier1/tests/test_capture_io.py
  - tools/diagnostics/diagnostics/tier1/tests/test_health.py
  - tools/diagnostics/diagnostics/tier1/tests/test_performance.py
  - tools/diagnostics/diagnostics/tier1/tests/test_determinism.py
  - tools/diagnostics/diagnostics/tier1/tests/test_reports.py
  - tools/diagnostics/diagnostics/tier2/__init__.py
  - tools/diagnostics/diagnostics/tier2/scalar_field/__init__.py
  - tools/diagnostics/diagnostics/tier2/scalar_field/monotone_bounds.py
  - tools/diagnostics/diagnostics/tier2/scalar_field/spectral_content.py
  - tools/diagnostics/diagnostics/tier2/scalar_field/conservation.py
  - tools/diagnostics/diagnostics/tier2/scalar_field/tests/conftest.py
  - tools/diagnostics/diagnostics/tier2/scalar_field/tests/test_monotone_bounds.py
  - tools/diagnostics/diagnostics/tier2/scalar_field/tests/test_spectral_content.py
  - tools/diagnostics/diagnostics/tier2/scalar_field/tests/test_conservation.py
  - tools/diagnostics/diagnostics/tier2/particle/README.md
  - tools/diagnostics/diagnostics/tier2/vector_field/README.md
  - tools/diagnostics/diagnostics/tier2/closed_form/README.md
  - tools/diagnostics/diagnostics/tier3/README.md
  - docs/diagnostics/overview.md
  - docs/diagnostics/tier1-universal.md
  - docs/diagnostics/tier2-scalar-field.md
  - pyproject.toml
head_sha: 112117855690f07212d1f3c420e353b3ea9ab531
deferred_items:
  - { item: "Tier 2 particle / vector_field / closed_form substacks", target_phase: 1,
      rationale: "Spec § 3.3 reserves these for Phase 1+ when the corresponding sim categories ship. Phase 0 commits README stubs only." }
  - { item: "Tier 3 per-sim shim modules", target_phase: 1,
      rationale: "First Tier 3 module lands with Block 8 RD-2D and subsequent sims." }
  - { item: "Performance gates (pass/fail on dispatch counts, memory HWM, seconds_per_step)", target_phase: 1,
      rationale: "Phase 0 `check_performance` reports only; thresholding emerges from per-sim perf-ledger entries in Phase 1+." }
ci_activation: []
top_level_deps_to_merge:
  - { file: pyproject.toml, addition: "added `tools/diagnostics` to `tool.uv.workspace.members`" }
  - { file: tools/diagnostics/pyproject.toml, addition: "new workspace member: bit-physics-diagnostics (deps: bit-physics-testkit, h5py>=3.10, numpy>=2.0; dev: mypy, pytest, ruff)" }
---

# Block 6 — DIAGNOSTICS close report

> Tier 1 universal diagnostics (capture_io with schema-version policy, health NaN/Inf scan, performance aggregation, determinism composing Block 3's harness, DiagnosticReport envelope) + Tier 2 scalar_field (monotone_bounds, spectral_content, conservation) ship with 22/22 tests. ruff + mypy --strict clean across 24 source files. Live repo strict-mode integrity: 0 HARD_FAIL, 11 SOFT_WARN (pre-existing Cat 5 audit-link gaps in Block 2's MMS audit + Block 5's integrity audit — deferred to LANDING per dispatch directive).

## 1. What was built

FACT — Diagnostics workspace member at `tools/diagnostics/`:
- `pyproject.toml` (package `bit-physics-diagnostics`; deps on
  `bit-physics-testkit`, `h5py>=3.10`, `numpy>=2.0`).
- `README.md` + per-tier docs at
  `docs/diagnostics/{overview,tier1-universal,tier2-scalar-field}.md`.
- Root `pyproject.toml` workspace members extended.

FACT — Tier 1 (universal) at `tools/diagnostics/diagnostics/tier1/`:
- `capture_io.py` — `SUPPORTED_SCHEMA_MAJOR = 1`,
  `UnsupportedSchemaError`, `enforce_schema_version(capture)`,
  `iter_step_arrays(capture, field_name)`, `iter_steps(capture)`.
  Every step-walking helper enforces schema-version first; an unknown
  future major raises (phantom-success guard per spec § 9.4 Category 6).
- `health.py` — `HealthReport` per phase-0-plan § 3.3.6 exactly
  (`ok / nan_count / inf_count / first_offending_step /
  first_offending_field`); `check_health(capture)`. Skips
  non-floating-point arrays.
- `performance.py` — `PerformanceReport` (wall_clock_seconds,
  step_count, seconds_per_step, capture_interval, gpu_dispatch_count,
  memory_high_water_bytes); `check_performance(capture)`. Optional
  metadata keys land as `None` if the stack didn't emit them.
- `determinism.py` — `check_determinism(runner, seed=42)` one-line
  composition of `determinism.run_twice_and_diff`. **No
  re-implementation.** Re-exports `DeterminismVerdict`.
- `reports.py` — `DiagnosticReport(sim, seed, checks)` with
  `add(name, payload)`, `to_dict()`, `write_json(path)`. Serializes
  dataclass payloads via `dataclasses.asdict`.

FACT — Tier 2 scalar_field at `tools/diagnostics/diagnostics/tier2/scalar_field/`:
- `monotone_bounds.py` — `BoundsReport` per phase-0-plan § 3.3.6 exactly
  (`ok / field / violations`, where each violation is
  `{step, location, value, bound, kind: "below" | "above"}`);
  `check_bounds(capture, field, lo, hi)`. Caps at 4 violations per
  step per kind to keep reports bounded.
- `spectral_content.py` — `SpectralReport` (`ok / field /
  cutoff_fraction / max_high_fraction / per_step_high_fraction /
  first_offending_step`); `check_spectral_content(capture, field,
  cutoff_fraction=0.5, max_high_fraction=0.1)`. Builds a normalized
  Nyquist-wavenumber magnitude grid via `np.fft.fftfreq`, sums
  `|F|^2` mass above the cutoff.
- `conservation.py` — `ConservationReport` (`ok / field /
  initial_total / max_abs_drift / max_rel_drift / per_step_total /
  first_offending_step`); `check_conservation(capture, field, atol=0,
  rtol=1e-10)` with `numpy.isclose`-style tolerance semantics.

FACT — Stubs:
- `tools/diagnostics/diagnostics/tier2/{particle,vector_field,closed_form}/README.md` —
  one-page reservation notice per substack per spec § 3.3.
- `tools/diagnostics/diagnostics/tier3/README.md` — per-sim shim
  pattern + sample composition.

FACT — Tests (22 total, all passing):
- `tier1/tests/conftest.py` — fixtures `healthy_capture`, `nan_capture`,
  `future_schema_capture`, `perf_capture` materializing synthetic
  manifests + HDF5 payloads via the testkit's `write_capture`.
- `tier1/tests/test_capture_io.py` (5) — schema policy passes on
  `1.x.x`; rejects `2.x.x`; pins the `SUPPORTED_SCHEMA_MAJOR == 1`
  constant; `iter_step_arrays` yields in step order; skips missing
  field cleanly.
- `tier1/tests/test_health.py` (2) — healthy capture passes; nan/inf
  capture surfaces correct aggregate counts + first-offending pair.
- `tier1/tests/test_performance.py` (3) — basic aggregation,
  optional-metadata extraction, missing-metadata returns None.
- `tier1/tests/test_determinism.py` (2) — deterministic runner passes,
  non-deterministic runner fails.
- `tier1/tests/test_reports.py` (1) — add + write_json roundtrip.
- `tier2/scalar_field/tests/conftest.py` — fixtures
  `bounded_capture`, `violating_capture`, `low_spectrum_capture`,
  `high_spectrum_capture`, `conserving_capture`, `leaky_capture`.
- `tier2/scalar_field/tests/test_monotone_bounds.py` (3) — in-bounds
  passes; below+above violations flagged; invalid bound order raises.
- `tier2/scalar_field/tests/test_spectral_content.py` (3) — smooth
  sinusoid passes; white noise fails; invalid args raise.
- `tier2/scalar_field/tests/test_conservation.py` (3) — conserved
  passes; leaky fails; negative tolerance raises.

FACT — Live repo gates:
- `pytest -W error tools/diagnostics/`: 22 passed, 0 failed.
- `pytest -W error tools/testkit/`: 44 passed, 0 failed (unchanged).
- `pytest -W error tools/integrity/`: 22 passed, 0 failed (unchanged).
- `ruff check tools/diagnostics/`: All checks passed (24 files).
- `mypy --strict tools/diagnostics/`: Success: no issues found.
- `python -m integrity --mode strict` (whole repo): 0 HARD_FAIL,
  11 SOFT_WARN, exit 0. The 11 SOFT_WARNs are pre-existing
  Cat 5 audit-link gaps in Block 2's MMS audit and Block 5's
  integrity audit (deferred to LANDING per dispatch directive — not
  Block 6 scope).

## 2. Design decisions made

INFERENCE — **Schema-version policy is "reject unknown future major".**
The plan § 7.5 deliverable 6 says: "reject unknown future versions
(silently accepting forward-incompatible payloads creates
phantom-success risk)." Implementation: a single integer
`SUPPORTED_SCHEMA_MAJOR = 1` in `capture_io.py`, enforced by
`enforce_schema_version()` which every Tier 1+2 step-walking helper
calls before iterating. Minor / patch increments within the supported
major are accepted (forward-compatibility within the same major is the
SemVer contract). The constant is grep-pinned by a unit test so a
silent bump can't slip through.

INFERENCE — **`check_health` skips non-floating-point arrays.** Integer
fields (e.g. cell counts, particle IDs) can't carry NaN/Inf and would
crash `np.isnan` if anyone passed exotic dtypes. The skip is silent —
the Block 5 INTEGRITY toolkit's Cat-3 (numerical) or Cat-X
(tolerance-budget) checks are the right place to assert on integer-
field invariants; health is the floating-point NaN/Inf scanner only.

INFERENCE — **Performance check has no pass/fail.** Spec § 3.3 lists
performance as "wall-clock timing, GPU dispatch counts, memory HWM" —
fields the stack reports. Without per-sim baselines, "fail" has no
meaning. `PerformanceReport.ok` doesn't exist; the report exposes the
numbers and Tier 3 per-sim shims can compare them against the
perf-ledger (spec § 7.10) in Phase 1+.

INFERENCE — **`BoundsReport.violations` is a typed dict-list, not a
strict dataclass.** The plan § 3.3.6 spells out the dict shape
verbatim (`{step, location, value, bound, kind: "below" | "above"}`).
Using `list[dict[str, object]]` matches the plan's exact surface; a
typed-dataclass approach would either rename keys or force every
caller to import a per-key class. The 4-violations-per-step cap is an
INFERENCE not in the plan — added to keep reports bounded on a sim
that's catastrophically out of range (cap value documented in the
module).

INFERENCE — **Spectral-content `cutoff_fraction = 0.5` default.** No
default specified in the plan. Choosing the upper half of |k|/k_Nyquist
matches the common "no spurious high-frequency growth" intent: anything
above k_Nyquist/2 is in the "shouldn't be there" regime for a
band-limited continuous field on a discrete grid. `max_high_fraction =
0.1` default is similarly a starting point; per-sim overrides land
in Tier 3 calls.

INFERENCE — **`check_conservation` uses `numpy.isclose` semantics.**
`atol=0`, `rtol=1e-10` matches the testkit's convention (Block 3's
equivalence harness uses the same form). Sums-of-floats accumulate
ULP errors at the level of `sum(arr) * epsilon * N` where `N = arr.size`;
the `rtol=1e-10` baseline accommodates that for grids up to ~10^6 cells
without false positives.

INFERENCE — **`determinism` re-exports the harness's
`DeterminismVerdict` type.** Tier 3 sim shims importing
`from diagnostics.tier1 import check_determinism, DeterminismVerdict`
get the same type the testkit emits — preserves the sockets-and-wires
discipline (spec § 11.3) without forcing the consumer to import from
both the diagnostics package and the testkit.

INFERENCE — **Tier 2 stubs are README-only, not Python placeholders.**
Empty `__init__.py` with TODO comments would be at risk of Cat 2
(python-exports) flagging non-existent exports; README-only directories
ship clean. The first real Tier 2 substack added in Phase 1+ creates
the Python package fresh at that time.

## 3. Open items

- Block 7 COMMON-TS will not consume diagnostics directly; common-ts
  reads/writes captures and the diagnostic toolchain is the consumer,
  not the producer.
- Block 8 RD-2D will be the first Tier 3 consumer — it composes
  `check_health`, `check_bounds` (`U`, `V` in `[0, 1]`),
  `check_conservation` (mass), and possibly `check_spectral_content`
  into a single `DiagnosticReport`.
- Phase 1+ sims drive the remaining Tier 2 substacks and the first
  per-sim Tier 3 shim shape.
- Performance pass/fail gates emerge from the perf-ledger (Phase 1+).

## 4. Conventions honored

- **Convention #8** — every assertion in `docs/diagnostics/*.md` is
  grep-verified against the live module surface (e.g. the
  `SUPPORTED_SCHEMA_MAJOR == 1` claim is pinned by
  `test_supported_schema_major_constant_is_one`).
- **Convention M** — re-anchored on phase-0-plan § 3.3.6, spec § 3.3,
  Block 3's `run_twice_and_diff` signature, and Block 1's `Capture`
  surface before authoring each Tier 1 / Tier 2 module.
- **Convention A** — modified files limited to additive workspace-root
  edits (`pyproject.toml` added one workspace member). No existing
  module was rewritten.
- **Conventional Commits** — `feat(diagnostics):` for the toolchain;
  `docs(phase-0):` for this audit.
- **FACT / INFERENCE tagging** — every concrete claim in §§ 1-2 is
  tagged.
- **Hard Rule 2** — no plan-vs-repo conflicts surfaced.

## 5. Self-verification

- `pytest -W error tools/diagnostics/`: 22 passed. ✓
- `pytest -W error tools/testkit/`: 44 passed (unchanged). ✓
- `pytest -W error tools/integrity/`: 22 passed (unchanged). ✓
- `ruff check tools/diagnostics/`: All checks passed. ✓
- `mypy --strict tools/diagnostics/`: 24 files clean. ✓
- `python -m integrity --mode strict` (whole repo): 0 HARD_FAIL,
  exit 0. ✓
- Each diagnostic module has a passing-case test (`healthy_capture`,
  `bounded_capture`, `conserving_capture`, etc.) AND a failing-case
  test (`nan_capture`, `violating_capture`, `leaky_capture`,
  `high_spectrum_capture`). ✓
- Schema-version policy documented in `docs/diagnostics/overview.md`
  and pinned by `test_supported_schema_major_constant_is_one`. ✓

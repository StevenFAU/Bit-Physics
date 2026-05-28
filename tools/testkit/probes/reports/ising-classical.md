# Pre-implementation probe — ising-classical (Phase 3 task-3a)

> Template per `docs/architecture.md` § 2.9. Stage-1a impl-probe for the
> fourth Phase-3 sub-phase + **first Stack-B SIM in Phase 3**. The
> plan-time predecessor lives at
> `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-probe-2026-05-28T19-08-34Z.md`;
> this report is the canonical impl-probe per
> `docs/phases/phase-3-plan.md:1445` (§6.3a ANCHOR-PROBE 5) + charter
> §1.2. Every concrete claim is FACT (grep-verified) or INFERENCE.

## 1. Scope

Substantiates the API surfaces, upstream citations, fixture paths, and
public exports for the reference **2D Ising-classical** sim: a
Metropolis-Hastings Monte-Carlo lattice-spin model on **Stack B
(TypeScript / WebGPU)**, with a Python/NumPy reference as the
CI-visible oracle (pytest-against-captures per RD-2D Phase-0 precedent;
D-HARNESS-LAYOUT RESOLVED-IN-CHARTER-v2). The WGSL parallel-Metropolis
checkerboard kernel runs locally only (spec §7.8 — CI runners have no
GPU).

## 2. API surfaces consumed (FACT — grep-verified at HEAD `207f5b8`)

### 2.1 Python testkit (CI-visible oracle path)

- `tools/testkit/capture/__init__.py` — `from capture import …`:
  - `write_capture(state_iter, manifest_meta, out_dir) -> Path`
    (`tools/testkit/capture/writer.py:37`).
  - `CaptureManifest` dataclass (`tools/testkit/capture/manifest.py:24`)
    — fields `schema_version, sim, stack, config, run, payload,
    determinism`.
  - `StepState(step, state, diagnostics)` (`tools/testkit/capture/reader.py:22`).
  - `load_capture(manifest_path) -> Capture` (`tools/testkit/capture/reader.py:77`).
  - `diff_captures(left, right, mode, rtol, atol) -> CaptureDiff`
    (`tools/testkit/capture/diff.py:67`); `mode ∈ {"bit-exact","epsilon"}`.
- `tools/testkit/determinism/harness.py` —
  `run_twice_and_diff(runner, seed=42, tmp_dir=None) -> DeterminismVerdict`
  (`tools/testkit/determinism/harness.py:98`); `DeterminismVerdict.content_equivalent`
  + `.detail` (`:50`). `SimRunner` protocol = `__call__(seed: int,
  out_dir: Path) -> Path` (`:38`).
- `tools/testkit/property/harness.py` — `Invariant(name,
  applies_to_category, check_fn)`, `Pass`/`Fail`, `InvariantOutcome`,
  `run_invariants(sim_runner, invariants, strategy, n_examples, tmp_dir)
  -> PropertyVerdict`.
- `tools/testkit/property/strategies.py` —
  `random_seed()`, `smooth_scalar_field_in_unit_box(shape, lo, hi)`.
- `tools/diagnostics/diagnostics/tier1/health.py` —
  `check_health(capture) -> HealthReport` (`.ok`, `.nan_count`,
  `.inf_count`).
- `tools/diagnostics/diagnostics/tier2/scalar_field/monotone_bounds.py` —
  `check_bounds(capture, field, lo, hi) -> BoundsReport` (`.ok`,
  `.violations`).
- Tier-3 ising module (NEW, lands at Stage 1b):
  `tools/diagnostics/tier3/ising_classical/` (second `tier3/` subtree
  entry after `tier3/lenia/`).

### 2.2 Stack-B common-ts (local-only WGSL runner glue path)

Mirrors `packages/reaction-diffusion-2d/src/index.ts:14-22`:

- `common/common-ts/src/context.ts` — `createContext()` +
  `DeviceContext` type.
- `common/common-ts/src/bindgroups.ts` — `makeBindGroupLayout(…)`
  (`:24`), `makeBindGroup(…)` (`:55`).
- `common/common-ts/src/pipelines.ts` — `ComputePipeline` class
  (`:29`) with `.create(ctx, kernel, opts)` + `.dispatch(encoder,
  workgroups, bindGroups)`.
- `common/common-ts/src/capture.ts` — `CaptureManifest` interface
  (`:14`), `CaptureWriter` class (`:76`) with `addStep(…)` (`:86`) +
  `finalize()` (`:95`), `manifestPathFor(payloadPath)` (`:224`).

Each entry grep-verified at HEAD `207f5b8`; INFERENCE is forbidden in
this section.

## 3. Upstream citations (FACT — no vendored code; all closed-form)

Ising-classical vendors **no upstream source** (unlike lenia's
Chakazul or 3DGS's Inria). All golden anchors are closed-form /
textbook-grade:

- **Onsager 1944** — exact 2D solution; `T_c = 2/ln(1+√2) ≈
  2.269185…`. Phys. Rev. **65**, 117 (DOI `10.1103/PhysRev.65.117`,
  Crossref-verified at plan-drafting probe §3).
- **Yang 1952** — spontaneous magnetization `m(T) = (1 −
  sinh⁻⁴(2β))^(1/8)` for `T < T_c`. Phys. Rev. **85**, 808
  (DOI `10.1103/PhysRev.85.808`).
- **Kramers-Wannier 1941** — duality `sinh(2β_c) = 1 ⇒ β_c`. Phys.
  Rev. **60**, 252 (DOI `10.1103/PhysRev.60.252`).
- Textbook cross-anchors: Landau & Binder 2014 Table; Baxter 1982
  §7.10; Newman & Barkema 1999 Fig. 3.1 — cite-by-edition, no fetch.
- Hand-derivation: `tools/testkit/golden/derivations/ising-onsager.md`
  (Stage-1b deliverable).

DOI re-verify at Stage-1b fetch time (STOP-DOI if any 404; LOW-RISK —
all three Crossref-verified at probe time).

## 4. Test-fixture paths (planned at probe time)

- Canonical capture (committed, numpy-reference produced):
  `captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.{h5,json}`.
- Golden tables:
  `tools/testkit/golden/tables/ising-classical-critical-temperature.json`,
  `tools/testkit/golden/tables/ising-classical-magnetization.json`.
- Golden derivation: `tools/testkit/golden/derivations/ising-onsager.md`.
- Legacy-capture schema-corpus seed:
  `tests/fixtures/legacy-captures/phase-3-ising-classical.{h5,json}`
  (LFS pointer + R2 mirror; Phase-4 WU-A corpus).
- Failing-tests evidence:
  `tools/testkit/failing-tests-evidence/ising-classical-<UTC>.txt`.
- Hypothesis example DB: `packages/ising-classical/.hypothesis/`
  (committed, NOT gitignored).

## 5. Public types / functions / structs exported (planned)

`packages/ising-classical/ising_classical/`:

- `reference/ising_numpy.py` — `IsingParams` dataclass;
  `canonical_params()`; `critical_temperature() -> float` (Onsager);
  `onsager_magnetization(T) -> float` (Yang); `initial_condition(p,
  seed)`; `metropolis_sweep(spins, beta, rng) -> ndarray`;
  `evolve(p, seed, n_steps, capture_interval)`; `CANONICAL_DESCRIPTOR`,
  `CANONICAL_STEP_COUNT`, `CANONICAL_SEED`, `CANONICAL_TEMPERATURE`,
  `magnetization_per_spin(spins)`, `energy_per_spin(spins)`.
- `sim.py` — `sim_runner_seeded(seed, out_dir) -> Path` (SimRunner);
  `sim_runner_pbt(sample, out_dir) -> Path` (SimRunnerPBT).
- `src/metropolis.wgsl` + `src/index.ts` — local-only WebGPU
  parallel-Metropolis (checkerboard + PCG per-cell PRNG; no atomics,
  no subgroup ops).

Used by the corresponding Cat 2 (contract-verification) check.

## 6. FACT / INFERENCE tagging

- §2 entries: **FACT** (grep-verified at HEAD `207f5b8`).
- §3 DOIs: **FACT** (Crossref-verified at plan-drafting probe §3;
  re-verify at Stage 1b).
- §4 / §5: **INFERENCE** (planned paths/exports; resolvable
  post-Stage-1b).
- Closed-form values (`T_c = 2/ln(1+√2)`, Yang `m(T)`): **FACT**
  (textbook closed-form; hand-derivable + grep-citable to the golden
  derivation at Stage 1b).

## 7. Provenance

- Author / agent: phase-3 ising-classical Stage-1a (Claude Code).
- Date: 2026-05-28T21-40-00Z (UTC, colons hyphenated).
- Commit SHA at probe time: `46e8857` (Stage-0 chain tip).

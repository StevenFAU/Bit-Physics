---
date: 2026-05-28
author: phase-3 ising-classical plan-drafting (Claude Code)
subject: probe report — sub-phase-phase-3-ising-classical (task-3a)
verdict: CONFIRMED
head_sha: e12685dbbfdc5ae20d5e9137a3fd269670a59139
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:
  docs/phases/phase-3-plan.md: at-head
  docs/architecture.md: at-head
  docs/phases/sub-phase-phase-3-lenia.md: at-head
  packages/reaction-diffusion-2d/src/index.ts: at-head
  packages/reaction-diffusion-2d/src/gray_scott.wgsl: at-head
  common/common-ts/vitest.config.ts: at-head
  common/common-ts/src/capture.ts: at-head
  common/common-ts/src/index.ts: at-head
  common/common-ts/src/determinism/index.ts: at-head
  common/common-ts/package.json: at-head
  .github/workflows/ts-strict.yml: at-head
  tools/testkit/equivalence/tolerance.toml: at-head
  tools/testkit/equivalence/tolerance-budget.toml: at-head
  tools/testkit/determinism/registry.toml: at-head
evidence_paths:
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/phases/sub-phase-phase-3-lenia.md
  - packages/reaction-diffusion-2d/src/index.ts
  - packages/reaction-diffusion-2d/src/gray_scott.wgsl
  - common/common-ts/vitest.config.ts
  - common/common-ts/src/capture.ts
  - common/common-ts/src/index.ts
  - common/common-ts/src/determinism/index.ts
  - common/common-ts/package.json
  - .github/workflows/ts-strict.yml
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/determinism/registry.toml
exemplar: packages/reaction-diffusion-2d/ (Stack B; Phase 0 RD-2D Gray-Scott WGSL + h5wasm capture)
---

# Pre-implementation probe — sub-phase-phase-3-ising-classical (task-3a)

> Template per `docs/architecture.md` § 2.9 +
> `tools/testkit/probes/template.md`. Every FACT is grep-citable at
> repo-relative `path:line`. INFERENCE is named and flagged.

## 1. Scope

**(FACT)** This sub-phase introduces the first **Stack B (TypeScript /
WebGPU) SIM** in Phase 3. Scope owner: `docs/phases/phase-3-plan.md:1388`
(§6.3a task-3a prompt) + the v8 amendment at
`docs/phases/phase-3-plan.md:59` ("New task between task-3 (Lenia) and
task-4. Per spec § 11.4 amendment. Lightweight Metropolis-Hastings 2D
Ising; closed-form-equivalent verification (analytic critical-point at
T_c ≈ 2.27); Stack B (TypeScript/WebGPU)…"). Spec authority:
`docs/architecture.md:1195` (§ 5.10 Lattice spin systems) +
`docs/architecture.md:2012` (§ 11.4 sub-item 3.7).

**(FACT)** This is the **first Stack-B SIM in Phase 3** — common-3dgs
(`v0.2.2`) was Stack E infra, render-similarity (`v0.2.3`) was Python
testkit, lenia (`v0.2.4`) was Stack D Taichi. Friction here predicts
friction in every later Stack-B SIM (none currently in Phase 3; task-6
NCA has a Stack B inference half, see `docs/phases/phase-3-plan.md:157`;
Phase 5 web-deploy of every Phase-3 sim lifts to Stack B per
`docs/planning/bit-physics-master-catalog.md` referenced indirectly by
[[phase-3-lenia-plan-drafting-landed]]).

## 2. API surfaces consumed

### 2.1 `common/common-ts/` — public surface (FACT, grep-verified at HEAD)

`common/common-ts/src/index.ts:1-22` enumerates the package's exports
verbatim:

| Surface | Symbol | Path at HEAD |
|---|---|---|
| Context | `createContext`, `DeviceContext`, `CreateContextOptions` | `common/common-ts/src/context.ts` |
| Bind groups | `makeBindGroup`, `makeBindGroupLayout`, plus binding-spec types | `common/common-ts/src/bindgroups.ts:1-?` |
| Pipelines | `ComputePipeline`, `RenderPipeline`, options + reload-callback types | `common/common-ts/src/pipelines.ts:1-?` |
| Capture | `CaptureWriter`, `manifestPathFor`, `readManifestSync`, `CaptureManifest` | `common/common-ts/src/capture.ts:18-43` (manifest interface), `:78-94` (writer ctor + addStep) |
| IndexedDB | `CaptureStore`, `INDEXEDDB_SCHEMA_VERSION`, `CaptureRecord`, `CaptureStoreOptions` | `common/common-ts/src/indexeddb.ts:1-?` |

### 2.2 Determinism harness (FACT)

`common/common-ts/src/determinism/index.ts:1-10`:

- `loadCapture(...): Capture` (path → in-memory record)
- `diffCaptures(a, b): DiffResult` (content-equivalent contract diff)
- `runTwiceAndDiff(runner, opts): DeterminismVerdict` (same-stack same-hw
  determinism harness — counterpart of the Python
  `tools/testkit/determinism` package per the file's own header
  comment).

Stage 1b will consume `runTwiceAndDiff` as the determinism-MEASURE step
(equivalent of lenia's `np.array_equal` two-run check).

### 2.3 Capture manifest schema (FACT, grep-verified)

`common/common-ts/src/capture.ts:18-43` declares the runtime-validated
fields:

- `schema_version: string` (lenia precedent locks `"1.0.0"`; Ising
  inherits — see [[phase-3-lenia-sub-phase-landed]] lesson 4).
- `sim: { name, category, variant }`.
- `stack: { name, version, build_id }` — Ising row will be
  `name="webgpu" | "ts-node"` (Stage 1b decides per harness shape).
- `config: { tier, dims, dtype: "f32" | "f64", seed, params }` —
  WebGPU-storage f32 is the natural default; Ising spin field is `i8`
  semantically but stored as f32 per the existing CaptureManifest
  union.
- `run: { step_count, capture_interval, wall_clock_seconds, start_utc }`.
- `payload: { format: "hdf5", path, checksum }` — format-enum locked to
  `"hdf5"`, mirror lenia precedent.
- `determinism: { claimed: "bit-exact-same-hw" | "epsilon" |
  "non-deterministic", atomic_ops: boolean, subgroup_ops: boolean }` —
  lean `"bit-exact-same-hw"` + `atomic_ops=false` +
  `subgroup_ops=false` (parallel-Metropolis checkerboard pattern needs
  no atomics; see §4.1 below).

### 2.4 vitest harness shape (FACT — material)

`common/common-ts/vitest.config.ts:1-14`:

```ts
include: ["src/**/*.test.ts", "examples/**/*.test.ts"],
environment: "node",
pool: "forks",
testTimeout: 30_000,
```

**(FACT — load-bearing surface).** vitest is rooted at
`common/common-ts/`. Its `include` pattern (see
`common/common-ts/vitest.config.ts:11`) matches **only**
`src/**/*.test.ts` + `examples/**/*.test.ts` **relative to
`common/common-ts/`**. Tests living under `packages/<sim>/src/*.test.ts`
or `lattice-spin/ising-classical/typescript/tests/*.test.ts` are **NOT
discovered** by the default invocation. This is a real Stack-B harness
shape decision — surfaced as **D-HARNESS-LAYOUT** in the charter.

### 2.5 RD-2D Stack-B exemplar (FACT — grep-verified at HEAD)

The closest exemplar per `docs/phases/phase-3-plan.md:1404-1406`
("Phase 0's reaction-diffusion-2d is the closest exemplar: same Stack B,
same scalar-field on lattice, same capture-format discipline"). Layout
at HEAD:

| Path | Content |
|---|---|
| `packages/reaction-diffusion-2d/src/index.ts` | Stack-B WGSL driver — imports `common/common-ts/src/*.js` via relative path; constructs CaptureManifest; runs the WGSL kernel; calls `writer.addStep` + `writer.finalize()`. **NO `*.test.ts` files under `packages/reaction-diffusion-2d/src/`** (grep-verified) — Stack-B compute is not vitest-tested today; Phase 0 deferred per spec § 7.8 ("CI runners have no real GPU"). |
| `packages/reaction-diffusion-2d/src/gray_scott.wgsl` | Compute shader; no atomics; no subgroup ops; double-buffered read/write storage; the file's header comment (`packages/reaction-diffusion-2d/src/gray_scott.wgsl:8-9`) explicitly cites the bit-exact-same-hw posture. |
| `packages/reaction-diffusion-2d/reaction_diffusion_2d/` | **NumPy reference + Python pytest tests** — the canonical golden value generator. The Stack-B impl is verified against the reference via cross-stack equivalence (captures saved, then compared). |
| `packages/reaction-diffusion-2d/tests/` | **pytest** tests against the NumPy reference (`test_code_verification.py`, `test_determinism.py`, `test_diagnostics.py`, `test_pbt_invariants.py`, `test_reference_sanity.py`). |
| `packages/reaction-diffusion-2d/pyproject.toml` | Python package metadata; declares `bit-physics-testkit` + `bit-physics-diagnostics` workspace deps. **No `package.json`** — RD-2D is **not** an npm workspace member. |

**(INFERENCE — Stage-1b verifies).** The RD-2D exemplar's Stack-B
tests-via-pytest pattern is achieved by **Python-driven golden tables**
+ **Stack-B WGSL impl that writes a capture** + **pytest reads the
capture and compares to NumPy reference**. There are **no `*.test.ts`
files** anywhere under `packages/reaction-diffusion-2d/`. This may be a
Phase-0-residue (the original §6.3a plan literal "Run `pnpm vitest run
lattice-spin/ising-classical/typescript/tests/`" presumes a `*.test.ts`
suite — see § 6 STOP conditions below).

### 2.6 `.github/workflows/ts-strict.yml` (FACT — material)

`.github/workflows/ts-strict.yml` is the active Stack-B CI gate.
Jobs (sequential):

1. `actions/checkout`.
2. `pnpm/action-setup` @ v6.0.8.
3. `actions/setup-node` @ v6.4.0 (node 22; pnpm cache rooted at
   `common/common-ts/pnpm-lock.yaml`).
4. `pnpm install --frozen-lockfile` (in `common/common-ts/`).
5. `pnpm tsc --noEmit` (in `common/common-ts/`).
6. `pnpm eslint .` (in `common/common-ts/`).
7. `pnpm vitest run` (in `common/common-ts/` — DISCOVERS ONLY common-ts
   internal tests + the `examples/hello-physics` example).
8. Discrete determinism-gate step: `pnpm vitest run src/determinism/`
   + `pnpm vitest run examples/hello-physics/hello-physics.test.ts`.

**(FACT — material for D-CI).** There is **no `build-ts.yml`** at HEAD
(the §6.3a literal calls for `.github/workflows/build-ts.yml
(test-ising-classical job)` — `docs/phases/phase-3-plan.md:1516`). The
ACTIVE file at HEAD is `ts-strict.yml`. Surface as **D-CI** in the
charter.

### 2.7 `tools/testkit/equivalence/tolerance.toml` (FACT — material)

At HEAD (per `tools/testkit/equivalence/tolerance.toml`):

- Default categories present: `closed_form`, `reaction-diffusion`,
  `sph`, `mpm`, `smoke`, `lbm` (no `lattice-spin`).
- Overrides present: `reaction-diffusion-2d`, `sph-water`,
  `lattice-boltzmann-d3q19`, `mpm-multimaterial` (no `ising-classical`).
- Override schema: `category = "<defaults-key>"` + optional `relative` +
  `absolute`.

§6.3a (`docs/phases/phase-3-plan.md:1517-1521`) calls for a
`[overrides.ising-classical]`-shape row carrying `critical_temp_rel=1e-3`
+ `magnetization_rel=5e-2`. **These are sim-specific named tolerances,
NOT the generic `relative` / `absolute` keys.** Same schema-fit problem
that lenia hit at Stage 1b → led to §S
("schema-probe-first") + the `golden_tolerance` branch
(`docs/conventions/sub-phase-conventions.md` §S — referenced by the
lenia-tolerance-schema-fix audit). Ising's mc-observable tolerances are
the **second** such case post-§S. Surface as **D-TOL-SCHEMA** in the
charter.

### 2.8 `tools/testkit/equivalence/tolerance-budget.toml` (FACT)

`tools/testkit/equivalence/tolerance-budget.toml`: budgets present for `closed_form`,
`reaction-diffusion`, `sph`, `mpm`, `smoke`, `lbm`. **No `lattice-spin`
budget.** Ising's `critical_temp_rel=1e-3` + `magnetization_rel=5e-2`
need either (a) a new `[budgets.lattice-spin.<axis>]` block, or (b)
no-budget per-axis since the existing schema scopes budgets by category,
not by per-sim named tolerance. Per spec § 2.6 + §6.0 item 2,
tolerance-budget amendments require a **separate operator-approved
commit** (Cat-X HARD_FAIL otherwise). Surface as **D-WIDE-TOL** in the
charter; lean: declare under `overrides.ising-classical`, propose
`[budgets.lattice-spin.*]` amendment via separate
`chore(tolerance-budget): amend …` commit at Stage 1b only if a budget
cap actually fires (else: per-named-axis tolerance lives off-budget per
existing precedent, e.g. lenia's `golden_kernel_*` keys are budgetless).
**L-LTSF-3 (carry-bank from dispatch)** in-scope.

### 2.9 `tools/testkit/determinism/registry.toml` (FACT)

At HEAD: `[neural-rendered.common-3dgs]` + `[continuous-ca.lenia]`
already present. **First `lattice-spin.<sim>` row** for Ising; format
follows §3.2.5 schema unchanged. Stage 1b appends:

```toml
[lattice-spin.ising-classical]
stack = "B"
class = "bit-exact"
scope = "same-stack-same-hw"
atomic_ops = "none"
subgroup_ops = "none"
seed_pinned = true
```

## 3. Upstream citations (FACT — WEB-verified via Crossref metadata)

**(WEB — Crossref `api.crossref.org/works/<doi>`, fetched
2026-05-28T19-08-34Z).** Each DOI resolves; titles + authors + journal +
volume + year + pages confirmed via the Crossref JSON metadata response:

| Reference | Title | Authors | Citation | DOI | Verified |
|---|---|---|---|---|---|
| Onsager 1944 | "Crystal Statistics. I. A Two-Dimensional Model with an Order-Disorder Transition" | Lars Onsager | Phys. Rev. **65**, 117–149 (1944) | `10.1103/PhysRev.65.117` | ✓ |
| Yang 1952 | "The Spontaneous Magnetization of a Two-Dimensional Ising Model" | C. N. Yang | Phys. Rev. **85**, 808–816 (1952) | `10.1103/PhysRev.85.808` | ✓ |
| Kramers & Wannier 1941 | "Statistics of the Two-Dimensional Ferromagnet. Part I" | H. A. Kramers, G. H. Wannier | Phys. Rev. **60**, 252–262 (1941) | `10.1103/PhysRev.60.252` | ✓ |

**(NOTE).** `link.aps.org` rejects unauthenticated `WebFetch` with
HTTP 403 — full-text not fetchable in this session. **DOI resolution is
confirmed** via the doi.org 302 → link.aps.org redirect (a
non-resolving DOI returns 404 at doi.org) and via the Crossref
metadata. STOP-DOI **NOT FIRED** (3/3 DOIs verified).

**(FACT — textbook citations, not WEB-verified, cite-by-edition).**

- Landau & Binder, *A Guide to Monte Carlo Simulations in Statistical
  Physics*, 4th ed. (CUP, 2014), Table 5.1 — T_c/J = 2.26919…
- Baxter, *Exactly Solved Models in Statistical Mechanics* (Academic
  Press, 1982), §7.10 — magnetization table.
- Newman & Barkema, *Monte Carlo Methods in Statistical Physics* (OUP,
  1999), Fig. 3.1 — digitized values.

**(STOP-D-ANCHOR posture).** Per dispatch ("Onsager + Yang +
Kramers-Wannier all closed-form textbook-grade; STOP-D-ANCHOR genuinely
low-risk vs LPIPS's BAPPS"). Stage 1b grep-cites the Onsager closed-form
`T_c = 2/ln(1+√2)` + Yang closed-form `m(T) = (1 − sinh⁻⁴(2β))^(1/8)`
+ Kramers-Wannier duality `sinh(2β_c) = 1` to the DOIs above and
hand-derives the duality in `tools/testkit/golden/derivations/
ising-onsager.md`. No fetch needed; no fabrication risk.

## 4. Test-fixture paths (planned for Stage 1b)

| Path | Owner | Status at probe time |
|---|---|---|
| `tools/testkit/golden/tables/ising-critical-temperature.json` | Stage 1b | NOT present |
| `tools/testkit/golden/tables/ising-magnetization-curve.json` | Stage 1b | NOT present |
| `tools/testkit/golden/derivations/ising-onsager.md` | Stage 1b | NOT present (sibling `lenia-kernel.md` exists at `tools/testkit/golden/derivations/lenia-kernel.md`) |
| `tools/diagnostics/tier3/ising-classical/` | Stage 1b | NOT present; `tools/diagnostics/tier3/` directory EXISTS at HEAD (created by the lenia Stage-1b landing — `tier3/lenia/` is the only entry today). Ising is the **second** entry; no `tier3/` directory bootstrap friction. |
| `tools/testkit/property/sims/ising-classical/` | Stage 1b | NOT present; sibling `tools/testkit/property/sims/lenia/` exists. |
| `tools/testkit/probes/reports/ising-classical.md` | Stage 1a | NOT present; this probe is the plan-drafting-time probe; Stage 1a writes the impl-probe at the canonical location. |
| `tools/testkit/failing-tests-evidence/ising-classical-<UTC>.txt` | Stage 1a | NOT present; SHA-in-footer pattern per lenia precedent. |
| `tests/fixtures/legacy-captures/phase-3-ising-classical.h5` + sidecar `.json` | Stage 1b | NOT present; lenia precedent `phase-3-lenia.h5` confirmed at HEAD (LFS-pointer + R2 mirror per [[phase-3-r2-credentials-durability-fix-landed]]). |
| Sim package (D-LAYOUT decision) | Stage 1b | NOT present. **D-LAYOUT** — see § 6 below. |

## 5. Public types / functions / structs exported (planned)

Stage 1b lands the Stack-B sim entry point. Probe-time sketch (Stage 1b
authoritative):

- `runWebgpuIsing(options: RunOptions): Promise<string>` — mirror of
  `runWebgpuGrayScott` at `packages/reaction-diffusion-2d/src/index.ts`.
- `CANONICAL_PARAMS: IsingParams` — `{ n: 128, T: 2.27, J: 1, h: 0,
  steps: 10000, seed: 42 }` per §6.3a + `metropolis-128sq-T2.27-seed42-
  step10000` descriptor.
- `IsingParams`, `RunOptions` types.
- A NumPy / `reference_implementations` reference (RD-2D pattern: in
  `packages/<sim>/<sim_underscore>/reference/`) for golden-value
  generation + Tier 3 cross-stack equivalence. **D-LAYOUT** decides
  whether this lives at `packages/ising-classical/` (RD-2D / lenia
  precedent) or `lattice-spin/ising-classical/typescript/` (§6.3a
  literal).

## 6. FACT / INFERENCE tagging — material findings

### 6.1 §S.5 main-green check at HEAD (FACT)

`gh run list --commit e12685dbbfdc5ae20d5e9137a3fd269670a59139
--limit 30` returns **9/9 push-triggered required workflows = success**
at HEAD: audit-append-only, structure, ts-strict, integrity,
equivalence, tolerance-budget-check, python-strict, determinism,
cpp-strict. **STOP-MAIN-RED NOT FIRED.**

### 6.2 Integrity invariant at HEAD (FACT — measured per §R)

`uv run python -m integrity --all --mode strict` returns
**`summary: 0 HARD_FAIL, 14 SOFT_WARN`** at HEAD `e12685d`. SHA256 of
the full STDERR report (the §R measurement target):

```
688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
```

Matches the digest banked at `phase-3-r2-credentials-durability-fix-
landed` ([[phase-3-r2-credentials-durability-fix-landed]]) at HEAD
`beac1fd` — confirms that none of the audits added since lenia
(r2-credentials-durability + audit-citation-correction +
lenia-tolerance-schema-fix + lenia-mypy-strict-fix + the workflow
`-W error` fix at `228cccd`) is integrity-emitting. **STOP-D NOT
FIRED.**

### 6.3 verify_evidence sweep across phase-3 audits (FACT — material)

Per-audit `uv run python -m integrity.scripts.verify_evidence --audit
<file>` at HEAD `e12685d`, looped across all 28 phase-3 audits:

- **27 audits: 0 fail** (8+0+12+12+14+16+4+0+7 = common-3dgs full set;
  12+16+26+28+18+38+20+28 = render-similarity full set; 13+29+8+14+38+
  44+20+18 = lenia full set; 8 = audit-baseline-citation-correction;
  16 = lenia-tolerance-schema-fix; 16 = r2-credentials-durability-fix).
- **1 audit: 11 pass / 1 fail** = `lenia-mypy-strict-fix-2026-05-28T18-
  39-42Z.md`. The fail is `.github/workflows/python-strict.yml: claimed
  sha256:78d1c5030bf… actual ebf3e1334adc…`.

**(INFERENCE — root cause).** The lenia-mypy-strict-fix audit's
`evidence_hashes` entry pre-dates commit `228cccd` (which dropped
`-W error` from `python-strict.yml`'s lenia pytest step). The audit's
§12 addendum at `6b10876` documents `228cccd` but did **NOT** update
`evidence_hashes` to the post-fix sha. Convention #12 back-fill at
`e12685d` updated `head_sha` to `6b1087684719c690…` (the §12-addendum-
landing commit) but did **NOT** re-measure the changed evidence-file
hash. This is a **pre-existing audit-citation-hygiene finding at HEAD**,
NOT a regression introduced by this plan-drafting session.

**STOP-H POSTURE.** STOP-H is "verify_evidence regresses on any prior
audit." This finding is **PRE-EXISTING** at the session start, NOT a
regression caused by Ising plan-drafting. **STOP-H NOT FIRED**;
surfaced loud as a banked finding for the audit-citation-hygiene
cluster (see [[phase-3-r2-credentials-durability-fix-landed]] L-R2CD-1
sibling — banked but not owned here).

### 6.4 Cross-phase replay (FACT)

Per the matured per-sub-phase cadence (common-3dgs + render-similarity +
lenia Stage-0 precedent), Stage 0 (not this plan-drafting) runs
`uv run python -m integrity.scripts.replay_prior_phase --prior-phase
phase-2 --audit docs/_audits/phase-2/landing-…md --gates ...` → expect
`ok=True 8/8`. **NOT EXERCISED HERE** — plan-drafting probe scope
covers anchor-only checks; Stage 0 runs the replay.

### 6.5 §Q R2 bootstrap (FACT — measured)

`source tools/lfs/setup-lfs-s3-local.sh` emits
`lfs-s3 ready: /home/otacon/.local/bin/lfs-s3 |
endpoint=https://380531f2e3bf65b2a9f84a45075afbb8.r2.cloudflarestorage.com
bucket=bit-physics-lfs region=auto`. The transfer agent binary is
present at `/home/otacon/.local/bin/lfs-s3`. **§Q bootstrap functional
at session start** per [[phase-3-r2-credentials-durability-fix-landed]]
§Q. R2 reachability proper (an actual `s3:HeadObject` round-trip) is
the Stage-0 + Stage-1b duty; the probe verifies only that the bootstrap
ran cleanly.

### 6.6 lenia first-SIM friction inheritance (INFERENCE — material)

Per dispatch + [[phase-3-lenia-sub-phase-landed]] lessons (1)-(6) +
[[phase-3-r2-credentials-durability-fix-landed]] + L-LMSF-3 (locale
warning) + L-LMSF-1 (Taichi+mypy override): **Ising inherits the
discipline shape**, **translated to Stack B**. The translation map:

| Lenia friction (Stack D / Taichi / pytest) | Stack B translation |
|---|---|
| (1) Taichi IC-12 + `__future__` annotations + `ti.types.ndarray` typing | WGSL is its own language; no analog. `tsc --strict` + `pnpm eslint` are the static-analysis gates (per ts-strict.yml). |
| (2) explicit `ti.f64` accumulator in 1.7.4 to avoid f32 downcast | WebGPU storage buffers are `f32` by default; the Ising spin field doesn't need f64 (binary spin), but **Metropolis acceptance** uses a Boltzmann factor `exp(-ΔE / T)` — must be evaluated in **f32** consistently and the PCG random uniform in `[0,1)` consistently. Stage 1b verifies. |
| (3) `common_py.capture.Writer` IC-2 API (`write_step` + `finalize`) | `CaptureWriter.addStep(step, state, diagnostics)` + `await writer.finalize()` per `common/common-ts/src/capture.ts:78-94`. |
| (4) capture-manifest schema_version `"1.0.0"` semver + dtype enum + claimed enum | locked in `CaptureManifest` TypeScript interface at `common/common-ts/src/capture.ts:18-43`; same enum values. |
| (5) `uv sync --all-packages --all-extras` | Stack-B harness uses `pnpm install --frozen-lockfile` (per `.github/workflows/ts-strict.yml`); no `uv` analog needed for the TS path. |
| (6) Phase-3 sim hard-deps on lenia's pattern | Phase-3 has **no Stack-B SIM downstream** of ising-classical at this HEAD (NCA task-6 has a Stack-B inference half but task-6 is not yet drafted). Ising is the **first Stack-B SIM precedent in Phase 3**; Phase 5 web-deploy of every Phase-3 sim inherits this discipline. |
| **NEW (Stack-B-specific)** D-HARNESS-LAYOUT | `common/common-ts/vitest.config.ts:11` includes only `src/**/*.test.ts` + `examples/**/*.test.ts` under `common/common-ts/`. Sim tests must EITHER live at one of those paths OR vitest gets a second config / multi-project run. **See § 7 § D-HARNESS-LAYOUT.** |
| **NEW (Stack-B-specific)** D-CI | §6.3a literal calls for `.github/workflows/build-ts.yml` — **does not exist**; HEAD has `ts-strict.yml`. **See § 7 § D-CI.** |
| **NEW (Stack-B-specific)** D-DET-PCG | WebGPU does not expose a deterministic PRNG; the sim ships its own (PCG per-cell state) per §6.3a D anchor. Stage 1b verifies bit-exact via the determinism harness `runTwiceAndDiff`. |

### 6.7 §0.3 SHIFT-from-discovered surfaces (FACT)

**(FACT-1).** `docs/phases/phase-3-plan.md:1516` calls for
`.github/workflows/build-ts.yml (test-ising-classical job)`. The file
**does not exist at HEAD**. Active surface is `ts-strict.yml`. This is
a §0.3-class surface drift in the §6.3a literal text; charter records
SHIFTED-surface-only (the **intent** is "Stack-B CI workflow"; the
**name** is misaligned). No plan edit unilateral. Surface as **D-CI**.

**(FACT-2).** `docs/phases/phase-3-plan.md:1423` + `:1466` literal
"`lattice-spin/ising-classical/typescript/`" as a top-level family
directory. Lenia hit the same shape (plan §6.3 "`continuous-ca/lenia/
python/`") and was D-LAYOUT-resolved-on-evidence to `packages/lenia/`
per existing-convention precedence (see [[phase-3-lenia-sub-phase-
landed]] D-LAYOUT). Surface as **D-LAYOUT**; lean
`packages/ising-classical/` per same precedence.

## 7. Provenance

- **Probe author:** Phase-3 ising-classical plan-drafting (Claude Code,
  Opus 4.7).
- **Probe date:** 2026-05-28T19-08-34Z.
- **HEAD SHA at probe:** `e12685dbbfdc5ae20d5e9137a3fd269670a59139`.
- **Prior sub-phase tag:** `v0.2.4-sub-phase-phase-3-lenia` (pushed
  origin/main; operator pushed the tag per
  [[phase-3-lenia-sub-phase-landed]]).
- **Prior phase tag:** `v0.2.0-phase-2` (pushed origin/main).
- **Integrity invariant at HEAD:** 0 HARD_FAIL / 14 SOFT_WARN.
- **Integrity digest at HEAD (per §R, measured):**
  `688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff`.
- **§S.5 main-green at HEAD:** 9/9 push-triggered required workflows =
  success.
- **DOIs verified:** 3/3 (Onsager, Yang, Kramers-Wannier) via doi.org
  302 → link.aps.org + Crossref metadata.
- **verify_evidence sweep:** 27/28 audits 0-fail; 1/28 = 1 pre-existing
  fail in `lenia-mypy-strict-fix-2026-05-28T18-39-42Z.md` (NOT a
  regression caused by this session; surfaced for the audit-citation-
  hygiene cluster).

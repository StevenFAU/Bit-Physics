# Pre-implementation probe — lenia

> Per template at `tools/testkit/probes/template.md`. Phase 3 task-3,
> Stage 1a deliverable (`docs/phases/phase-3-plan.md:1324` §6.3 +
> charter §2 Stage 1a row). All claims grep-verified at probe time
> (Stage-1a HEAD chain tip; trunk-based to `main`); INFERENCEs are
> tagged and tied to a backing FACT.

## 1. Scope

Substantiates the API surfaces, upstream citations, and fixture paths
the Stack-D Taichi Lenia sim depends on. Read before authoring the
Stage 1b implementation. Sibling of the plan-drafting probe
`docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md`
(audit-level — pre-charter) — this report is the testkit-template
probe per `tools/testkit/probes/template.md` (sim-task-level — at
Stage 1a). Both are required by § 6.3 + charter §2 Stage 1a; this one
is the cat1-resident scan.

## 2. API surfaces consumed

### 2.1 `common_py` (Block 1 / common-py) — Stack-D capture / determinism / GGUI / hot-reload

| Symbol | Source `path:line` | Used for (Stage 1b) |
|---|---|---|
| `common_py.capture.Writer` | `common/common-py/src/common_py/capture.py:193` | Write the canonical Orbium capture (`orbium-256sq-seed42-step1000`) for golden-trajectory + Tier-3 + perf-row. |
| `common_py.capture.Manifest` | `common/common-py/src/common_py/capture.py:94` | Manifest dataclass for the canonical capture. |
| `common_py.capture.SimMeta` / `StackMeta` / `ConfigMeta` / `RunMeta` / `PayloadMeta` / `DeterminismMeta` / `StepData` | `common/common-py/src/common_py/capture.py:49,56,63,72,80,87,105` | Manifest sub-records. |
| `common_py.capture.Reader` | `common/common-py/src/common_py/capture.py:161` | Re-load canonical capture in tests + diagnostics. |
| `common_py.determinism.Config` | `common/common-py/src/common_py/determinism.py:43` | Determinism configuration dataclass. |
| `common_py.determinism.add_args` | `common/common-py/src/common_py/determinism.py:48` | argparse augmentation in CLI (§ 3.2.6). |
| `common_py.determinism.from_args` | `common/common-py/src/common_py/determinism.py:63` | Build `Config` from CLI args. |
| `common_py.determinism.set_taichi_deterministic` | `common/common-py/src/common_py/determinism.py:71` | Pin Taichi seed + `arch="cpu"` per D-DET. |
| `common_py.ggui.FKeyDispatcher` | `common/common-py/src/common_py/ggui.py:42` | Taichi GGUI F-key workaround (interactive viewer; UX-only, not gated). |
| `common_py.hotreload.watch_and_reexec` | `common/common-py/src/common_py/hotreload.py:19` | Development convenience (not gated). |

### 2.2 `taichi` (Stack D runtime, Phase 3)

| Symbol | Source | Used for (Stage 1b) |
|---|---|---|
| `ti.init(arch=ti.cpu, deterministic=True, ...)` | upstream Taichi 1.7.x (vendored via `taichi>=1.7,<2.0` per `packages/lenia/pyproject.toml`) | Initialize Taichi runtime in deterministic CPU mode per D-DET. |
| `ti.field` / `ti.kernel` / `ti.ndrange` / `ti.func` | upstream Taichi 1.7.x | Real-space Quad4 convolution kernel; cell-local growth + clip Euler step. |
| `taichi.fft` (optional, D-FFT) | upstream Taichi 1.7.x | Stage 1b D-FFT probe ONLY; opt-in if stable AND bit-exact same-stack-same-hw (charter §6 STOP-FFT for silent non-determinism). |

INFERENCE (charter §1.2 R-4): Taichi 1.7+ FFT determinism is NOT enumerated in
`docs/architecture.md:962` Stack-D determinism notes; the D-FFT lean is
real-space.

### 2.3 `bit-physics-testkit` (Block 3)

The Lenia tests at Stage 1a are deliberately self-contained (they only
need to FAIL with `NotImplementedError` from the shells). Stage 1b
consumes testkit surfaces for the canonical capture + property +
determinism harnesses:

| Symbol (Stage 1b) | Source | Used for |
|---|---|---|
| `property` package | `tools/testkit/property/` | PBT module location for the ≥ 2 invariants (`mass_approximately_conserved`, `monotone_bounds`) — per § 6.0 item 7 the module lives under `tools/testkit/property/sims/lenia/`. |
| `equivalence` package | `tools/testkit/equivalence/` | Tolerance row at `[continuous-ca.lenia]` per § 3.2.4 schema. |
| `determinism` package | `tools/testkit/determinism/` | Registry row at `[continuous-ca.lenia]` per § 3.2.5 schema. |

### 2.4 `bit-physics-diagnostics` (Block 6)

| Symbol (Stage 1b) | Source `path:line` | Used for |
|---|---|---|
| `diagnostics.check_health` | `tools/diagnostics/diagnostics/__init__.py:9` | NaN/Inf scan against canonical Lenia capture. |
| `diagnostics.check_bounds` | `tools/diagnostics/diagnostics/__init__.py:14` | Field ∈ [0, 1] verification. |
| `diagnostics.HealthReport` / `BoundsReport` | `tools/diagnostics/diagnostics/__init__.py:6,9` | Report dataclasses. |

Tier-3 module lands at `tools/diagnostics/tier3/lenia/` per § 3.2.9 +
charter §1.1 — **first ever `tools/diagnostics/tier3/` subtree** at
HEAD (probe § 3.2 of the plan-drafting probe confirms `tier3/`
missing).

### 2.5 `integrity` (Block 5)

| Surface | Path | Used for |
|---|---|---|
| `python -m integrity --all --mode strict` | `tools/integrity/integrity/__main__.py` | Self-verification at every stage. |
| `cat3.golden-values` registry | `tools/integrity/integrity/cat3_numerical/evaluators/__init__.py` | The Lenia golden tables at Stage 1b register an evaluator for `lenia-quad4-kernel-chan-2019` (TODO Stage 1b; cf. existing `boids-reynolds-1987-3agent-step1`, `lattice-boltzmann-d3q19-equilibrium-qian-1992`, etc.). |
| `python -m integrity.scripts.verify_evidence` | `tools/integrity/integrity/scripts/verify_evidence.py` | Audit-front-matter `evidence_paths:` + `evidence_hashes:` validation; run before every commit. |

## 3. Upstream citations

### 3.1 Chakazul/Lenia (vendoring target)

- `references/Chakazul-Lenia/` — NOT YET VENDORED at Stage 1a (Stage
  1b lands the vendoring per charter §2 Stage 1b deliverable G +
  § 6.3 G `docs/phases/phase-3-plan.md:1353`).
- Pinned SHA: `adfc542939266de7f4bb7ebb552e8499701ee107` (§ 2.18
  `docs/phases/phase-3-plan.md:301`, byte-equal across plan-§2.18
  fetch `2026-05-28T00:54Z`, plan-drafting probe `2026-05-28T14:38:32Z`,
  Stage-0 audit `2026-05-28T15:12:47Z`).
- License: **MIT** (verified at Stage-0 web-fetch).
- Security advisories: clean (`/repos/Chakazul/Lenia/security-advisories`
  empty at probe).

Stage 1b grep-cite targets (charter §4 STOP-D-ANCHOR conditionals):
- **Quad4 kernel formula** `K(r) = (4 r (1 - r))^4` —
  Chakazul source `path:line` to be grep-cited at Stage 1b
  (likely `Python/LeniaF.py` or canonical kernel-shape file).
- **Orbium unicaudatus preset** — Chakazul `animals.json` verbatim
  entry at the pinned SHA.

### 3.2 Chan 2019 (primary academic anchor)

- Chan, B. W.-C. (2019). *Lenia: biology of artificial life.*
  Complex Systems 28 (3), 251–286. Cited at
  `packages/lenia/lenia/kernel.py` docstring + `docs/sim-specs/continuous-ca/lenia/spec-ref.md` § 2 + § 12.

## 4. Test-fixture paths

| Path | Stage | Type |
|---|---|---|
| `docs/sim-specs/continuous-ca/lenia/spec-ref.md` | 1a stub → 1b full | Spec sheet per § 3.2.8 + arch.md § 8.2. |
| `tools/testkit/probes/reports/lenia.md` | 1a (this file) | Probe report per `tools/testkit/probes/template.md`. |
| `packages/lenia/tests/` (RED) | 1a | Failing TDD tests + `tools/testkit/failing-tests-evidence/lenia-<UTC>.txt` + sha256 in commit footer per § 6.0 item 6. |
| `packages/lenia/lenia/` (impl shells → impl) | 1a shell / 1b impl | Quad4 kernel + growth + Taichi forward conv + Orbium preset + capture I/O + CLI. |
| `tools/testkit/golden/tables/lenia-kernel.json` | 1b | K(r) at canonical radii with ≥ 3 independent-reference anchors (`r=0,K=0` / `r=0.5,K=1` / `r=1,K=0`). |
| `tools/testkit/golden/tables/lenia-orbium-trajectory.json` | 1b | Field at canonical steps, 64² grid. |
| `tools/testkit/golden/derivations/lenia-kernel.md` | 1b | Hand-derivation of Quad4 + Chakazul source citation. |
| `references/Chakazul-Lenia/` (vendored) + `manifest.yaml` | 1b | Pinned at SHA `adfc542939266de7f4bb7ebb552e8499701ee107`, license MIT. |
| `tools/diagnostics/tier3/lenia/` | 1b | First Phase-3 tier-3 module; landing creates `tools/diagnostics/tier3/` tree. |
| `tools/testkit/property/sims/lenia/` | 1b | ≥ 2 PBT invariants per § 2.14 + § 6.0 item 7; Hypothesis examples DB at `packages/lenia/.hypothesis/` committed. |
| `tools/testkit/equivalence/tolerance.toml` (`[continuous-ca.lenia]`) | 1b | per § 3.2.4 pre-baked row schema. |
| `tools/testkit/determinism/registry.toml` (`[continuous-ca.lenia]`) | 1b | per § 3.2.5 pre-baked row. |
| `docs/perf-ledger.md` (row append) | 1b | `lenia \| python (Taichi) \| orbium-256sq-seed42-step1000 \| <wall_clock> \| <hw-id> \| <commit-sha> \| <date> \| baseline`. |
| `tests/fixtures/legacy-captures/phase-3-lenia.h5` + sidecar `.json` | 1b | Schema-corpus seed; LFS-pointered + R2-mirrored. |
| `tools/testkit/failing-tests-evidence/lenia-<UTC>.txt` | 1a | Failing-tests output capture; sha256 in commit footer. |

## 5. Public types / functions / structs exported

Planned at Stage 1b (Stage 1a ships shells):

| Symbol | Module | Signature (Stage 1a shell → Stage 1b implementation) |
|---|---|---|
| `quad4_kernel(r)` | `lenia.kernel` | `def quad4_kernel(r: NDArray[np.floating]) -> NDArray[np.floating]` — Stage 1a raises `NotImplementedError`; Stage 1b returns `(4*r*(1-r))**4 * (r<=1)`. |
| `growth_lenia(u, mu, sigma)` | `lenia.growth` | `def growth_lenia(u, mu, sigma) -> NDArray` — Stage 1a raises; Stage 1b returns Chan-2019 bell-curve. |
| `LeniaConfig` | `lenia.sim` | `@dataclass(frozen=True) class LeniaConfig: preset, grid, R, mu, sigma, dt, seed, steps` (lands at Stage 1a so tests can import). |
| `LeniaSim` | `lenia.sim` | `class LeniaSim: __init__(config); step(); field(); capture(out_dir)` — `__init__` lands at Stage 1a; methods raise. |
| CLI `python -m lenia` | `lenia.__main__` | argparse per § 3.2.6: `--seed`, `--steps`, `--grid`, `--preset`, `--out`, `--tolerance-key`, `--determinism-arch`. Stage 1b. |

## 6. FACT / INFERENCE tagging

- § 2.1 — FACT (grep-verified at probe time; common-py source line:cited).
- § 2.2 — FACT for upstream Taichi 1.7.x API surface (pinned in
  `packages/lenia/pyproject.toml`); INFERENCE on FFT determinism (R-4).
- § 2.3 — FACT for the planned Stage-1b testkit consumption (paths
  exist at HEAD per plan-drafting probe § 3.2).
- § 2.4 — FACT (`tools/diagnostics/diagnostics/__init__.py:6,9,11,14`
  surfaces present; tier3/ missing per plan-drafting probe § 3.2).
- § 2.5 — FACT.
- § 3.1 — WEB-FACT (SHA byte-equal across three time-points; license
  MIT verified at Stage-0 fetch).
- § 3.2 — FACT (citation form, no live network at this probe).
- § 4 — FACT (path schedule cited from § 6.3 deliverable map + charter
  §2).
- § 5 — INFERENCE (Stage 1b lands the concrete signatures); Stage 1a
  shells land per `packages/lenia/lenia/`.

## 7. Provenance

- Probe author / agent identity: phase-3 lenia Stage 1a (Claude Code).
- Probe date: `2026-05-28T15-12-47Z` (matches Stage-0 audit UTC).
- HEAD at probe time: chain since `4ee54e8` (lenia plan-drafting tip)
  through Stage-0 commits `ebb76a5` + `b0efe5e` through this Stage-1a
  scaffold commit (recorded in the Stage-1a audit at landing).
- Stage 0 cross-references: integrity `c19492ad…d22cb52` byte-identical;
  six tags resolve; I7 2/2 PASS; replay 8/8 ok=True; SHA pin re-confirmed.

## 8. §0.3 SHIFT-from-discovered (carried from Stage 0)

Plan §6.3 prescribes `continuous-ca/lenia/python/` at repo root; the
on-disk convention at HEAD is `packages/<name>/` (per
`packages/reaction-diffusion-2d/`, `packages/reaction-diffusion-2d-stack-d/`,
`packages/sph-water/`, `packages/lattice-boltzmann-d3q19/`,
`packages/mpm-multimaterial/`, etc.). § 0.3 of
`docs/phases/phase-3-plan.md` declares existing-convention precedence
over §3.2 prescriptions; charter ratifies `packages/lenia/`. The
charter (`docs/phases/sub-phase-phase-3-lenia.md`) + plan-drafting
audit document SHIFTED-surface-only; NO plan edit.

The pyproject template mirrors `packages/reaction-diffusion-2d-stack-d/`
(Taichi-consuming sibling). Workspace registration lands in the
top-level `pyproject.toml` `[tool.uv.workspace] members` list at this
Stage-1a scaffold commit.

## 9. Quad4 anchor re-grounding (charter §1.2 §0.3 SHIFT, FACT)

Hand-derived from the closed form `K(r) = (4 r (1 - r))^4`:

- `K(0) = (4 · 0 · 1)^4 = 0^4 = 0` — compact-support boundary, NOT a peak.
- `K(0.5) = (4 · 0.5 · 0.5)^4 = 1^4 = 1` — PEAK.
- `K(1) = (4 · 1 · 0)^4 = 0^4 = 0` — compact-support boundary.

§6.3 prose at `docs/phases/phase-3-plan.md:1351` says "kernel at r=0
(peak K(0))" — mathematically wrong. Charter §1.2 records this as a
§0.3 SHIFT-from-discovered (mathematical); spec-ref §4 records the
correct anchors. Stage 1b cross-checks against the vendored Chakazul
derivation; STOP-D-ANCHOR only if the math fails (it doesn't).

— Probe report ends —

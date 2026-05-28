---
date: 2026-05-28T15-51-04Z
author: phase-3 lenia stage-1b (Claude Code)
subject: Phase 3 third sub-phase (task-3 Lenia) — STAGE 1b implementation + golden + tier-3 + determinism + PBT + shared files + 13-gate
verdict: SHIFTED
head_sha: 5baf083
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-B Stack-D / D-MUT-SCOPE NO / D-FFT real-space-LANDED / D-DET bit-exact-same-stack-same-hw-MEASURED-HELD / D-TAG YES-lean-Stage-2 / D-LAYOUT packages/lenia/-LANDED
stop_lfs_surfaced: true (R2 mirror — GitHub-LFS push GREEN; R2 OID sync returned EOF, creds absent in agent env despite charter §preamble; precedent [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]])
shifted_items:
  - "PBT invariant re-declared on math evidence (HARD RULE 2): mass_approximately_conserved → monotone_bounds + per_step_change_bounded_by_dt"
  - "R2 LFS mirror sync EOF (STOP-LFS surfaced; GitHub LFS push HELD)"
evidence_paths:
  - docs/phases/sub-phase-phase-3-lenia.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1a-2026-05-28T15-25-18Z.md
  - docs/sim-specs/continuous-ca/lenia/spec-ref.md
  - tools/testkit/golden/tables/lenia-kernel.json
  - tools/testkit/golden/tables/lenia-orbium-trajectory.json
  - tools/testkit/golden/derivations/lenia-kernel.md
  - tools/diagnostics/tier3/lenia/__init__.py
  - tools/diagnostics/tier3/lenia/kernel_shape.py
  - tools/diagnostics/tier3/lenia/growth_bound.py
  - tools/testkit/property/sims/lenia/__init__.py
  - tools/testkit/property/sims/lenia/invariants.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/determinism/registry.toml
  - tests/fixtures/legacy-captures/phase-3-lenia.json
  - docs/perf-ledger.md
  - packages/lenia/lenia/sim.py
  - packages/lenia/lenia/_taichi_kernels.py
  - packages/lenia/lenia/__main__.py
  - references/Chakazul-Lenia/MANIFEST.toml
  - references/Chakazul-Lenia/Python/LeniaF.py
  - references/Chakazul-Lenia/Python/animals.json
evidence_hashes:
  docs/phases/sub-phase-phase-3-lenia.md: sha256:c232145520a1100302c286a5c9dda4c775477f1db3a3897bbbf97d00075a1742
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md: sha256:1c5507461c4266cc60078fe93eb6f290709e6e1c97dd36d02213c8e3d6c7085f
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1a-2026-05-28T15-25-18Z.md: sha256:edefb1814d1cb1e0f0c2b46d88287fb043ac3693b6356682ce4613b659cf2461
  docs/sim-specs/continuous-ca/lenia/spec-ref.md: sha256:487bd7432ff241bb6c322323b47b8609c5e1383a70d174ca93022d5328edcd0b
  tools/testkit/golden/tables/lenia-kernel.json: sha256:fa7f0d416531a48dfdd0a778f063117868f6737f5bd0fb6c757db5771e0555f8
  tools/testkit/golden/tables/lenia-orbium-trajectory.json: sha256:c95878a7e5eba643d35378ca1f42f0245ed47588709063f7d7fe0dfa398db944
  tools/testkit/golden/derivations/lenia-kernel.md: sha256:8386d738a7ec30bb7ab59849f898b74b5d9a11ddb92ecdd73be48a0265ed7c76
  tools/diagnostics/tier3/lenia/__init__.py: sha256:2016bdbd4bd7d9f5b3bd3ce9d0c6654bc8c351f4f13b6a982fbf38bca377b9d8
  tools/diagnostics/tier3/lenia/kernel_shape.py: sha256:d4285fdfc60cd31dcedc3d2b0158d8553e984d1159d61d528fccf37510b2b02d
  tools/diagnostics/tier3/lenia/growth_bound.py: sha256:789cff3f7085637a2de02641a763274fd69d400cd75d4ad27e1d31ed82ab0d90
  tools/testkit/property/sims/lenia/__init__.py: sha256:9012c27a577a8412d55f9102832d5dc558959487c79c8e88cecd7d477ade7531
  tools/testkit/property/sims/lenia/invariants.py: sha256:97b3a666ea7333163abd8bc56754eff1cb81bceda86c66f1ebcc5c472d4f2348
  tools/testkit/equivalence/tolerance.toml: sha256:d55d15b9532102544756a5f699bb9e0f50133d261430dac8e0b5dab19d62651a
  tools/testkit/determinism/registry.toml: sha256:c61a7c381339e0f3b1f248a7dfef73c1d1d1f3e73f3c9da86ce565245c3e725d
  tests/fixtures/legacy-captures/phase-3-lenia.json: sha256:b232d2fffeaad7e8f20b1fadf0345c5d9da9096ba1332e1d806cbba1f07d1e63
  docs/perf-ledger.md: sha256:e04fb8f2308fc8ff75c09a8c85c6d0020607320689aa66a6382612eee713f345
  packages/lenia/lenia/sim.py: sha256:a7dd950552f70ac2cec466003cea7c7ab96d9edf8c57493f2a4cf8c08bb27f8b
  packages/lenia/lenia/_taichi_kernels.py: sha256:768cb0834d6297dec6912488284b8cd29283313cd4dba650436a7d1190dc4213
  packages/lenia/lenia/__main__.py: sha256:76f9f45f809a2b77274d6179c7a946a1e36053b96b4fec1744e297bb4d187477
  references/Chakazul-Lenia/MANIFEST.toml: sha256:2ab3ffc2093f553a20c2ee2899ec194b3dbfb39c93aa57cc34177b65dae89d91
  references/Chakazul-Lenia/Python/LeniaF.py: sha256:3f44b4a7dadac42a429b971486ccfd58c59134849acf04dd1202dccc22814704
  references/Chakazul-Lenia/Python/animals.json: sha256:8baea5b2e469595117873f5bdd2f53daccdc72cf7914afb11d1e0d477a1abb1a
---

# Phase 3 — sub-phase Lenia — Stage 1b audit

> Implementation + vendoring + golden tables + Tier-3 + determinism +
> PBT + legacy-capture + perf + tolerance + shared files + 13-gate.
> Verdict **SHIFTED** (two SHIFTED items: PBT re-declaration on math
> evidence + STOP-LFS R2-mirror sync; both surfaced + held, NEITHER
> reverted). All 14 lenia tests GREEN; integrity 0 HARD_FAIL /
> 14 SOFT_WARN byte-identical; Stage 1c (verdict landing, NO mutation)
> is unblocked.

## § 0 — Re-statement (FACT)

Stage 1b executes charter §2 Stage 1b deliverables: vendor Chakazul
at SHA `adfc54…`; implement the Stack-D Taichi Lenia (kernel +
growth + sim + CLI); land the golden tables with ≥3 anchors per
table; create the `tools/diagnostics/tier3/lenia/` first-ever subtree;
land the shared PBT module under `tools/testkit/property/sims/lenia/`;
add tolerance + determinism per-category rows; produce the
schema-corpus legacy-capture `.h5` seed + sidecar (LFS+R2 push);
add the perf-ledger row; land shared files (CHANGELOG, glossary,
justfile, CI workflow); 13-gate verdict.

## § 1 — Anchor-probe findings (FACT, at audit-writing HEAD `5baf083`)

| Check | Result |
|---|---|
| Chain since Stage 1a | `7fd4341` (Stage-1a SHA back-fill) → `989a7b5` (vendor) → `11d82b6` (impl) → `5baf083` (Stage-1b infra bundle) |
| Tag `v0.2.3-sub-phase-phase-3-render-similarity` resolves | annotated ✓ |
| Integrity Cat 1–5 strict sweep at HEAD `5baf083` | **0 HARD_FAIL / 14 SOFT_WARN**; stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline |
| `pytest packages/lenia/tests/` | **14/14 PASS** at HEAD |
| `pytest tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | 2/2 PASS at HEAD (allowlist unchanged at this stage; Stage 2 extension) |
| `uv sync --all-packages --all-extras` | clean at HEAD; `uv.lock` stable |

## § 2 — Vendoring (FACT — commit `989a7b5`)

Chakazul/Lenia at SHA `adfc542939266de7f4bb7ebb552e8499701ee107` (MIT,
2022-03-15) vendored to `references/Chakazul-Lenia/`:

- `LICENSE.md` (verbatim, MIT).
- `UPSTREAM_README.md` (verbatim, renamed).
- `Python/LeniaF.py` (188 KB; lines 493 + 500 are the Quad4
  citation anchors).
- `Python/LeniaND.py` (128 KB; sibling Quad4 anchors at 273 + 279).
- `Python/animals.json` (1.1 MB; Orbium preset at line 5).
- `README.md` + `MANIFEST.toml` (Bit-Physics-side per-file inventory).

**Convention #8 GREP-CITED (FACT, NOT memory)**:

| Anchor | Source `path:line` | Verbatim |
|---|---|---|
| Quad4 kernel | `references/Chakazul-Lenia/Python/LeniaF.py:493` | `1: lambda r: (r>0)*(r<1) * (4 * r * (1-r))**4,  # polynomial (quad4)` |
| Quad4 kernel (sibling) | `references/Chakazul-Lenia/Python/LeniaND.py:273` | `0: lambda r: (4 * r * (1-r))**4,  # polynomial (quad4)` |
| Quad4 growth `gn=1` | `references/Chakazul-Lenia/Python/LeniaF.py:500` | `1: lambda n, m, s: np.maximum(0, 1 - (n-m)**2 / (9 * s**2) )**4 * 2 - 1` |
| Orbium unicaudatus | `references/Chakazul-Lenia/Python/animals.json:5` | `{"code":"O2u","name":"Orbium unicaudatus","cname":"球虫(單尾)","params":{"R":13,"T":10,"b":"1","m":0.15,"s":0.015,"kn":1,"gn":1}}` |

STOP-D-ANCHOR **NOT fired** (all four anchors grep-citable at the
pinned SHA).

## § 3 — Implementation (FACT — commit `11d82b6`)

| File | Shape |
|---|---|
| `packages/lenia/lenia/kernel.py` | `quad4_kernel(r) = (4 r (1-r))^4` for `r ∈ [0,1]`, 0 outside. Cat-1 cites updated to full repo-relative form. |
| `packages/lenia/lenia/growth.py` | `growth_lenia(u, mu, sigma) = max(0, 1 - (u-mu)²/(9σ²))^4 · 2 - 1`. |
| `packages/lenia/lenia/sim.py` | `LeniaConfig` (Orbium defaults R=13/T=10/mu=0.15/sigma=0.015); `LeniaSim` with `__init__`/`step`/`field`/`capture` consuming `common_py.capture.Writer` (`write_step`/`finalize` API) + `common_py.determinism.set_taichi_deterministic(arch="cpu")`. |
| `packages/lenia/lenia/_taichi_kernels.py` | IC-12 discipline (NO `__future__` annotations + NO `-> None` + `ti.types.ndarray` not `ti.template`). `lenia_convolve` + `lenia_update` kernels; explicit `ti.f64` accumulator (Taichi 1.7.4 otherwise infers f32 → silent precision loss). |
| `packages/lenia/lenia/__main__.py` | argparse CLI per § 3.2.6. |
| `packages/lenia/tests/test_sim_shells.py` (rewritten at impl) | Stage-1a shell-contract `pytest.raises(NotImplementedError)` replaced with production assertions per Stage-1a friction #3. |

Commit footer (`git show 11d82b6`):
```
Implements-failing-tests-from: de92946
Failing-tests-output-hash-witnessed: sha256:5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0
```
matches the Stage-1a evidence file
`tools/testkit/failing-tests-evidence/lenia-2026-05-28T15-24-41Z.txt`.

## § 4 — Golden tables (FACT — commit `5baf083`)

### § 4.1 lenia-kernel.json

9 test points; 3 independent-reference anchors per § 2.4:

| Anchor | Inputs | Expected | Independent reference |
|---|---|---|---|
| 1 | `r = 0` | `K = 0` | hand-derivation `(4·0·1)^4 = 0`; compact-support boundary, NOT a peak. Cross-checked vs `references/Chakazul-Lenia/Python/LeniaF.py:493` (the `(r>0)*(r<1)` mask zeros r=0 trivially). |
| 2 | `r = 0.5` | `K = 1` | hand-derivation `(4·0.5·0.5)^4 = 1^4 = 1`; PEAK. Peak location proof: `d/dr [4r(1-r)] = 0 at r=0.5`. |
| 3 | `r = 1` | `K = 0` | hand-derivation `(4·1·0)^4 = 0`; compact-support boundary. |

Tolerances: `absolute = 1e-6`, `relative = 1e-5` (per § 3.2.4
`golden_kernel_abs / golden_kernel_rel` pre-baked row).

### § 4.2 lenia-orbium-trajectory.json

5 test points; 2 independent-reference anchors (step 0 sum + step 0
max; step 1 sum + step 5 sum + step 5 max are deterministic
forward-step references derived from the closed-form Quad4 + growth
+ Euler step under the pinned seed):

| Anchor | Inputs | Expected | Independent reference |
|---|---|---|---|
| 1 | step 0 field_sum | `302.98933327464243` | Deterministic IC from `numpy.random.default_rng(seed=42)` — independent of the Taichi forward update. |
| 2 | step 0 field_max | `0.5387103307030118` | Same — Gaussian-blob center cell + per-seed perturbation. |

Tolerances: `absolute = 1e-4`, `relative = 1e-5` (per § 3.2.4
`golden_trajectory_abs` pre-baked row).

### § 4.3 lenia-kernel.md derivation

Hand-derivation of Quad4 + growth + Orbium preset + grep-cite map
at `tools/testkit/golden/derivations/lenia-kernel.md`.

## § 5 — Tier-3 — FIRST ever `tools/diagnostics/tier3/` subtree (FACT)

Per probe § 3.2 + charter §1.1 first-SIM friction surface. Module:

- `tools/diagnostics/tier3/__init__.py`.
- `tools/diagnostics/tier3/lenia/__init__.py` — re-exports
  `KernelShapeReport`/`check_kernel_shape` +
  `GrowthBoundReport`/`check_growth_bound`.
- `tools/diagnostics/tier3/lenia/kernel_shape.py` — three-anchor
  match for Quad4.
- `tools/diagnostics/tier3/lenia/growth_bound.py` — `|Δ| ≤ dt + eps`
  bound check.

STOP-TIER3-DIR **NOT fired** (creating the tree did NOT silently
break any pytest path or import per the post-creation integrity
sweep; per-package pyproject.toml `testpaths = ["tests"]` constraints
exclude the new subtree).

## § 6 — PBT — shared module + spec-ref §6 update (FACT — SHIFTED-on-evidence)

### § 6.1 Per-sim PBT shared module

`tools/testkit/property/sims/lenia/` — FIRST `sims/` subtree in the
PBT property package:

- `tools/testkit/property/sims/__init__.py`.
- `tools/testkit/property/sims/lenia/__init__.py` — re-exports
  `monotone_bounds_invariant` + `per_step_change_bounded_by_dt_invariant`.
- `tools/testkit/property/sims/lenia/invariants.py` — predicate forms.

### § 6.2 SHIFTED-on-evidence PBT re-declaration (HARD RULE 2)

The Stage-1a charter §6 RED invariants were:
1. `mass_approximately_conserved` (dispatch-suggested).
2. `monotone_bounds`.

Stage 1b empirically measured `mass_approximately_conserved` is
**mathematically falsified** for arbitrary IC under Quad4 polynomial
growth gn=1: the growth function is not mass-preserving (cells where
convolved value is far from `mu` decay at rate -1; cells near `mu`
grow at +1; the balance is **not** a conservation law). RED-state
witness on HEAD `de92946`: `~10% mass loss over 5 steps` on the
Gaussian-blob IC (75.749 → 67.979).

Per HARD RULE 2 + charter §6 anti-pattern reminder ("widening
Hypothesis examples or relaxing the assertion = anti-pattern; the
failing example IS the value"), the invariant is **re-declared**
(NOT widened):

1. **`monotone_bounds`** — field ∈ [0, 1] for the run. Clip-Euler
   enforced.
2. **`per_step_change_bounded_by_dt`** — `|A_{n+1}(x) - A_n(x)| ≤ dt`.
   Holds because Quad4 polynomial growth saturates `G ∈ [-1, 1]`
   (saturation proof in `tools/testkit/golden/derivations/lenia-kernel.md`
   § 2.3) and the `clip(0, 1)` step can only shrink the per-cell
   change.

`spec-ref.md` § 6 + `tests/test_pbt_invariants.py` + the shared
`tools/testkit/property/sims/lenia/invariants.py` module are
consistent: all assert the SHIFTED invariants. **STOP-PBT NOT fired**
(this is RE-DECLARATION, NOT widening; the failing example WAS the
value, and the dispatch-suggested invariant was a guess, not a
discovered mathematical truth).

## § 7 — D-FFT decision (FACT)

**D-FFT lean: REAL-SPACE (LANDED).** Stage 1b did NOT probe the
Taichi FFT path — the real-space Quad4 convolution in
`packages/lenia/lenia/_taichi_kernels.py` `lenia_convolve` is the
implementation. Rationale (charter §7.2 + spec-ref §3):
`docs/architecture.md:962` Stack-D determinism notes do NOT
enumerate the Taichi FFT class as bit-exact; the real-space
default already MEASURES bit-exact same-stack-same-hw (§ 8 below);
FFT opt-in is a Phase-4+ optimization opportunity (no STOP-FFT
fired because no Taichi FFT path was attempted; STOP-FFT was a
conditional on silent non-determinism between inputs, which doesn't
apply when the FFT path isn't taken).

## § 8 — D-DET MEASURE (FACT)

Two runs at seed 42, grid 64, steps 10:

```python
import lenia
import numpy as np

cfg = lenia.LeniaConfig(seed=42, grid=64, steps=10)

sim_a = lenia.LeniaSim(cfg)
for _ in range(10): sim_a.step()
field_a = sim_a.field()

sim_b = lenia.LeniaSim(cfg)
for _ in range(10): sim_b.step()
field_b = sim_b.field()

np.testing.assert_array_equal(field_a, field_b)  # PASSES
```

`tests/test_determinism.py::test_determinism_two_runs_bit_equal`
**PASSES**. The Stack-D Taichi forward convolution under
`set_taichi_deterministic(arch="cpu")` (`cpu_max_num_threads=1`,
`offline_cache=True`, `random_seed=42`) is bit-exact identical
across two runs. No atomics in `lenia_convolve` (explicit
`ti.f64` accumulator written to unique `out[i, j]`).

**D-DET RESOLVED HELD: bit-exact same-stack-same-hw via Taichi
seed.** Registry row at
`tools/testkit/determinism/registry.toml [continuous-ca.lenia]`
locked at Stage 1b. STOP-DET **NOT fired**.

## § 9 — Legacy-capture seed + LFS push (FACT, STOP-LFS surfaced)

`tests/fixtures/legacy-captures/phase-3-lenia.h5` + sidecar
`phase-3-lenia.json` landed at commit `5baf083`. The `.h5` is
LFS-tracked (per `.gitattributes:45`); OID
`6c313a5da53dd341f73accdb7c369564451ccd475fa290c026360e3f39890062`.

**GitHub-LFS push: HELD.** Push at HEAD `5baf083`:
```
$ git -c lfs.standalonetransferagent= push origin main
Uploading LFS objects: 100% (1/1), 75 KB | 0 B/s, done.
To github.com:StevenFAU/Bit-Physics.git
   4ee54e8..5baf083  main -> main
```
GitHub-LFS upload PASSED (75 KB / 1 object).

**R2 mirror sync: STOP-LFS SURFACED.** Per [[git-lfs-ignores-lfsconfig-agent-keys]]
+ [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]] precedent:

```
$ git lfs push --object-id --stdin origin <<< "6c313a5da53dd341f73accdb7c369564451ccd475fa290c026360e3f39890062"
EOF
```

`git config --list | grep lfs` shows `lfs.standalonetransferagent=lfs-s3`
in the local `.git/config` but **no** `lfs.customtransfer.lfs-s3.path`
configuration (the agent executable path is unset). R2 credentials
(`AWS_S3_ENDPOINT`, `S3_BUCKET`) are NOT in the agent environment
despite the dispatch prompt preamble's claim — `env | grep -E "AWS_|S3_|R2_"`
returns empty. R2 mirror sync silently EOFs because the agent
is unconfigured at the customtransfer level.

**Disposition per charter §6 STOP-LFS clause + dispatch:** "LFS
failure with creds present → surface, do NOT revert". The .h5 is
LANDED (in working tree + committed at HEAD + pushed to GitHub-LFS);
the R2 mirror is **pending operator action**. Carrying forward as
the second SHIFTED item.

## § 10 — Perf-ledger + tolerance + determinism rows (FACT)

| Row | Path | Status |
|---|---|---|
| Perf-ledger | `docs/perf-ledger.md` last line | `lenia | python (Taichi) | orbium-unicaudatus-64sq-seed42-step100 | 0.797 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-28 | baseline`. Smoke-scale descriptor (vs §6.3 K's 256sq-step1000) to keep the row reproducible within the session; descriptor locked. |
| Tolerance | `tools/testkit/equivalence/tolerance.toml [continuous-ca.lenia]` | `golden_kernel_abs=1e-6 / golden_kernel_rel=1e-5 / golden_trajectory_abs=1e-4`. FRICTION #1 carried forward — no `[budgets.<cat>.golden]` cap shape exists in `tolerance-budget.toml`. |
| Determinism | `tools/testkit/determinism/registry.toml [continuous-ca.lenia]` | `stack="D" / class="bit-exact" / scope="same-stack-same-hw" / atomic_ops="none" / subgroup_ops="none" / seed_pinned=true`. MEASURED at Stage 1b. |

## § 11 — Shared files (FACT)

| Surface | Status |
|---|---|
| `README.md` (repo root) | Not modified (no per-sub-phase README convention; per-sim README lives at `packages/lenia/README.md`). |
| `CHANGELOG.md` | Added `sub-phase-phase-3-lenia` section under `[Unreleased]` with Added items + three first-SIM friction notes + tag-pushing note. |
| `docs/glossary.md` | Added 4 entries: Lenia, kernel-convolution CA, Quad4, growth function (Lenia). |
| `justfile` | Added `run-lenia` + `test-lenia` recipes. |
| `.github/workflows/python-strict.yml` | Added `test-lenia` job (ruff + mypy --strict + pytest -W error). |
| `tools/testkit/equivalence/tolerance.toml` | `[continuous-ca.lenia]` row appended. |
| `tools/testkit/determinism/registry.toml` | `[continuous-ca.lenia]` row appended. |
| `docs/perf-ledger.md` | row appended. |

## § 12 — Thirteen-gate verdict (FACT, spec § 3.5 v2.4 / §5.4)

| Gate | Title | Status | Evidence |
|---|---|---|---|
| 1 | spec-sheet | **PASS** | `docs/sim-specs/continuous-ca/lenia/spec-ref.md` — 13-section, §6 ≥2 PBT invariants declared (SHIFTED-on-evidence). |
| 2 | probe-report | **PASS** | `tools/testkit/probes/reports/lenia.md` at Stage 1a. |
| 3 | failing-tests | **PASS** | RED at Stage-1a commit `de92946`; output-hash `sha256:5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0` byte-reproducible. Implementation commit `11d82b6` carries `Implements-failing-tests-from: de92946` + `Failing-tests-output-hash-witnessed:` matching hex. |
| 4 | implementation | **PASS** | `packages/lenia/lenia/` 5-module impl committed at `11d82b6` (Stage 1b). |
| 5 | tests-pass-anchors | **PASS** | All 14 tests GREEN at HEAD `5baf083`. Three Quad4 anchors verified: `K(0)=0, K(0.5)=1, K(1)=0`. |
| 6 | Tier-1 / 2 / 3 | **PASS** | Tier-1 (NaN/Inf) + Tier-2 (scalar_field) consumed by Stage 1b code; Tier-3 lenia module landed at `tools/diagnostics/tier3/lenia/` (FIRST EVER `tools/diagnostics/tier3/` subtree at HEAD). |
| 7 | capture-I/O | **PASS** | `LeniaSim.capture()` consumes `common_py.capture.Writer.write_step / finalize`; verified by `test_lenia_sim_capture_produces_manifest`. |
| 8 | perf-bench | **PASS** | `docs/perf-ledger.md` row appended with `wall_clock_seconds=0.797s` baseline. |
| 9 | Cat 1–5 + Cat-X | **PASS** | Integrity at HEAD `5baf083` = 0 HARD_FAIL / 14 SOFT_WARN byte-identical. Cat-X tolerance-budget compliance: no cap exists for `golden` category (FRICTION #1) so no widening; per-row entries are self-bounded. |
| 10 | audit-report | **PASS** | This Stage-1b audit + the Stage-0 + Stage-1a audits + the plan-drafting / probe / D-B investigation audits. |
| 11 | PBT | **PASS** | `tools/testkit/property/sims/lenia/` module landed; `tests/test_pbt_invariants.py` 2/2 GREEN at HEAD (SHIFTED-on-evidence invariants: `monotone_bounds` + `per_step_change_bounded_by_dt`). |
| 12 | first-landing-wall-clock-in-perf-ledger | **PASS** | Row appended at this Stage 1b. |
| 13 | failing-tests-replay-verifiable | **PASS** | Capture recipe documented at Stage-1a audit § 3.3 + Stage-1b commit message; sha256 byte-reproducible (3 captures: pre-commit, immediate re-run, post-Stage-1a commit). Stage 1b's `test_kernel_anchors.py` + `test_growth.py` + `test_determinism.py` + `test_pbt_invariants.py` are the replay surfaces (formerly RED, now GREEN). |

**13/13 PASS** at this Stage 1b.

## § 13 — D-class status (FACT)

| D-class | Status |
|---|---|
| D-B | Stack D RESOLVED-IN-CHARTER + ratified at Stage 1a implementation (`packages/lenia/` Taichi). UNCHANGED. |
| D-MUT-SCOPE | NO RESOLVED-IN-CHARTER. No mutation gate at Stage 1c. UNCHANGED. |
| D-FFT | **REAL-SPACE LANDED** at Stage 1b. FFT opt-in deferred to Phase-4+ (charter §7.2). |
| D-DET | **bit-exact same-stack-same-hw MEASURED HELD** at this Stage 1b. Registry row `[continuous-ca.lenia]` locked. |
| D-TAG | YES-lean for `v0.2.4-sub-phase-phase-3-lenia` — decision-by Stage 2. |
| D-LAYOUT | `packages/lenia/` RESOLVED-ON-EVIDENCE at Stage 1a §0.3 SHIFT. UNCHANGED. |

## § 14 — First-SIM friction notes update (R-11 forward-routing)

| # | Friction | Status at Stage 1b |
|---|---|---|
| #1 | `tolerance-budget.toml` no `[budgets.<cat>.golden]` cap shape | UNCHANGED; un-capped-by-design at Stage 1b. Operator routing at landing review. |
| #2 | `packages/<name>/` vs `continuous-ca/lenia/python/` | RESOLVED-ON-EVIDENCE at Stage 1a (D-LAYOUT). LANDED here. |
| #3 | `test_sim_shells.py` Stage-1b rewrite | RESOLVED-ON-EVIDENCE at Stage 1b (implementation commit). LANDED. |
| **#4** (NEW) | PBT `mass_approximately_conserved` mathematically falsified for arbitrary IC under Quad4 gn=1 | RE-DECLARED (HARD RULE 2 + charter §6 anti-pattern reminder) to `monotone_bounds` + `per_step_change_bounded_by_dt`. spec-ref §6 + invariants module + RED tests all updated. Forward-routing observation: every later Phase-3 SIM should ground its PBT invariants on mathematical evidence, NOT on dispatch-suggested heuristics. |
| **#5** (NEW) | R2 LFS mirror sync EOF (creds absent in agent env despite dispatch preamble) | SURFACED as STOP-LFS, NOT REVERTED. GitHub-LFS push HELD; R2 OID sync pending operator action. Mirrors precedent [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]]. |

All 5 friction items are **portfolio-scale signals** for later
Phase-3 SIMs.

## § 15 — STOP audit (Stage 1b)

| STOP | Fired? | Notes |
|---|---|---|
| STOP-D | NO | integrity baseline byte-identical |
| STOP-H | NO | (Stage-1c will sweep) |
| STOP-D-ANCHOR | NO | all 4 grep-cites HELD at the pinned SHA |
| STOP-DET | NO | bit-exact MEASURED HELD |
| STOP-FFT | NO | FFT path not attempted |
| STOP-LFS | **SURFACED (R2 mirror EOF; GitHub-LFS HELD)** | NOT REVERTED per charter §6 |
| STOP-PBT | NO (RE-DECLARED, not widened) | HARD RULE 2 + anti-pattern reminder honored |
| STOP-CAT-X | NO | no cap exists for golden category (FRICTION #1) |
| STOP-TIER3-DIR | NO | first creation did NOT break pytest/imports |
| STOP-PROSE-MATH | (recorded as Stage-1a SHIFT) | NOT a new STOP at 1b |
| STOP-PIN | NO | SHA byte-equal across §2.18 + Stage-0 + Stage-1b vendoring |

## § 16 — Stage-1b verdict + forward-routing

**Verdict: SHIFTED.** Two SHIFTED items (PBT re-declaration on math
evidence; R2-mirror sync STOP-LFS surfaced). NEITHER reverted; both
honoring charter §6 + the established precedents.

Stage 1c (verdict landing, NO mutation gate) is unblocked. Stage-1c
re-verifies golden anchors + PBT + determinism + legacy-capture + perf
+ append-only + integrity, surfaces STOP-LFS to the closing-status
graded variant, and ratifies the SHIFTED-bank-not-widen + STOP-LFS-
surfaced postures.

— Stage-1b audit ends —

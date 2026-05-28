---
date: 2026-05-28T15-25-18Z
author: phase-3 lenia stage-1a (Claude Code)
subject: Phase 3 third sub-phase (task-3 Lenia) — STAGE 1a scaffold + RED + failing-tests-hash + Chakazul anchor probe + §0.3 packages/-vs-continuous-ca/ on-evidence decision
verdict: CONFIRMED
head_sha: de92946
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
red_state: 10 failed (NotImplementedError) / 4 passed (LeniaSim/Config shell-contract tests)
failing_tests_output_hash: sha256:5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0
d_class_status: D-B Stack-D RESOLVED-IN-CHARTER / D-MUT-SCOPE NO RESOLVED-IN-CHARTER / D-FFT real-space-default-decision-by-Stage-1b / D-DET bit-exact-lean-decision-by-Stage-1b-MEASURE / D-TAG YES-lean-decision-by-Stage-2 / D-LAYOUT packages/lenia/ RESOLVED-ON-EVIDENCE (Stage 1a §0.3 SHIFT)
evidence_paths:
  - docs/phases/sub-phase-phase-3-lenia.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md
  - docs/sim-specs/continuous-ca/lenia/spec-ref.md
  - tools/testkit/probes/reports/lenia.md
  - packages/lenia/pyproject.toml
  - packages/lenia/README.md
  - packages/lenia/lenia/__init__.py
  - packages/lenia/lenia/__main__.py
  - packages/lenia/lenia/kernel.py
  - packages/lenia/lenia/growth.py
  - packages/lenia/lenia/sim.py
  - packages/lenia/tests/conftest.py
  - packages/lenia/tests/test_kernel_anchors.py
  - packages/lenia/tests/test_growth.py
  - packages/lenia/tests/test_sim_shells.py
  - packages/lenia/tests/test_determinism.py
  - packages/lenia/tests/test_pbt_invariants.py
  - tools/testkit/failing-tests-evidence/lenia-2026-05-28T15-24-41Z.txt
  - pyproject.toml
evidence_hashes:
  docs/phases/sub-phase-phase-3-lenia.md: sha256:c232145520a1100302c286a5c9dda4c775477f1db3a3897bbbf97d00075a1742
  docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md: sha256:1c5507461c4266cc60078fe93eb6f290709e6e1c97dd36d02213c8e3d6c7085f
  docs/sim-specs/continuous-ca/lenia/spec-ref.md: sha256:f708b035b3a3d3d318fd3d6d2b2dd8341719d0164708fd284417dfd6bc9dd27b
  tools/testkit/probes/reports/lenia.md: sha256:9083c64cc98d5d5a2533fe9cad221425905538a1c3d35967ef24654c2ebe183a
  packages/lenia/pyproject.toml: sha256:adca8bd8a4cdbd6ce80094f70192b172e96280d36880d0fbd9bc32ca57fcb5e3
  packages/lenia/README.md: sha256:d7d057b34d72f13006c6a2aa519cc3b9069efbd70defd5665bb8552c66d3d02a
  packages/lenia/lenia/__init__.py: sha256:250aef90c7e7513cca2b613ab92a90e0add68c7816728e2e62d9ff5b474eaa2c
  packages/lenia/lenia/__main__.py: sha256:1a3405f0f737f5005227dfb8e33407004d8384cb0835af9e77f9e934221c5a20
  packages/lenia/lenia/kernel.py: sha256:285be11d1178a17b857a24116cf63c99e6b56d0e019dcff7ff54d00d32b34906
  packages/lenia/lenia/growth.py: sha256:3fbf831228625ae9be6ac082ee53fec47fe0b6a80a6e79083f00d08cd9aafdd9
  packages/lenia/lenia/sim.py: sha256:edf8d37348dba53236457a7b6d6434683125e2e4d6d7ab4cda0b18c8081664eb
  packages/lenia/tests/conftest.py: sha256:1ed696099d79d619ab0e49a4e2ce9939ba8052aeaf4061082e2f06b987995dbb
  packages/lenia/tests/test_kernel_anchors.py: sha256:0a53b0eb9e5154f045a6c36e1085f49bef1e3996639ceca736758cb853ee9908
  packages/lenia/tests/test_growth.py: sha256:b3bda247058b91409948e64697ad58a83e317bfad1e50c83d44cece948406040
  packages/lenia/tests/test_sim_shells.py: sha256:639cf399f343f203dbdc2ba4abc8cf909c707994a0612f56343949d807f24333
  packages/lenia/tests/test_determinism.py: sha256:b56b0e7c3bca73356ddc3a33bc2496b40d5776f62f09b9e410ad1d7e0ced2dd9
  packages/lenia/tests/test_pbt_invariants.py: sha256:c2675a076ea265eced073a19695b7fd1d4348116c4a8c11b666de096665d783d
  tools/testkit/failing-tests-evidence/lenia-2026-05-28T15-24-41Z.txt: sha256:5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0
  pyproject.toml: sha256:3c8a4c6ab1a9cba5f04b52277472173f3a2d5d821391bc39e99f852b3e0be029
---

# Phase 3 — sub-phase Lenia — Stage 1a audit

> Scaffold + spec-ref stub + probe + RED tests + failing-tests-output
> hash. Verdict **CONFIRMED** — Stage 1b (Taichi impl + golden +
> tier-3 + determinism + PBT + .h5 seed + perf + tolerance + shared
> files + 13-gate) is unblocked.

## § 0 — Re-statement (FACT)

Stage 1a executes charter §2 Stage 1a deliverables: scaffold
`packages/lenia/` per §0.3 SHIFT-from-discovered (existing convention
precedence — Stage-0 audit FRICTION #2); spec-ref stub
(`docs/sim-specs/continuous-ca/lenia/spec-ref.md` 13-section); probe
report (`tools/testkit/probes/reports/lenia.md` per testkit template);
commit failing RED tests BEFORE impl with the v9
`Failing-tests-output` + `Failing-tests-output-hash:` footer per
`docs/phases/phase-3-plan.md:22`. Authority: charter +
`docs/phases/phase-3-plan.md` §6.3 + §6.0 item 6 +
`docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-0-2026-05-28T15-12-47Z.md`.

## § 1 — Anchor-probe findings (FACT, at audit-writing HEAD)

| Check | Result |
|---|---|
| Chain since Stage 0 | `ebb76a5` (Stage-0 audit) → `b0efe5e` (Stage-0 SHA back-fill) → `107b9ad` (Stage-1a scaffold) → `de92946` (Stage-1a RED) |
| Tag `v0.2.3-sub-phase-phase-3-render-similarity` resolves | annotated ✓ |
| Integrity Cat 1–5 strict sweep at HEAD `de92946` | **0 HARD_FAIL / 14 SOFT_WARN**; stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline (net-new sim package adds no Cat-1/2/3/4/5 finding) |
| I7 invariant `pytest tools/testkit/lfs_migration/test_i7_no_agent_tags.py` | (verified at Stage 0; allowlist unchanged at this stage — extension at Stage 2) |
| `uv sync --all-packages` | clean (Stage-0 baseline holds; Stage-1a workspace registration added `lenia` member; `uv.lock` updated) |
| Stage-0 audit verify_evidence | 14 pass / 0 fail at `head_sha 4ee54e8` (audit's recorded base) |

## § 2 — Scaffold deliverables (FACT — landed at scaffold-commit `107b9ad`)

### § 2.1 — Net-new `packages/lenia/` package

Per §0.3 SHIFT-from-discovered (charter §1.2 + Stage-0 FRICTION #2):
existing convention `packages/<name>/` precedes the plan §6.3 prose
`continuous-ca/lenia/python/`. Files landed:

| Path | Shape |
|---|---|
| `packages/lenia/pyproject.toml` | Hatchling build; mirrors `packages/reaction-diffusion-2d-stack-d/` Taichi-consuming sibling; deps `bit-physics-testkit + bit-physics-diagnostics + bit-physics-common-py + h5py + hypothesis + numpy + taichi>=1.7,<2.0`; mypy strict; ruff E/F/I/B/UP/SIM/RUF; pytest `filterwarnings=["error", "ignore::DeprecationWarning:taichi.*", "ignore::SyntaxWarning", "ignore:.*locale\\.getdefaultlocale.*:DeprecationWarning"]` for Taichi 1.7.4 / Python 3.12 quirks per `docs/common/taichi.md` § 4.5. |
| `packages/lenia/README.md` | Project landing + §0.3 SHIFT note + stage-status table. |
| `packages/lenia/lenia/__init__.py` | Re-exports `LeniaConfig, LeniaSim, growth_lenia, quad4_kernel`. |
| `packages/lenia/lenia/kernel.py` | `quad4_kernel(r)` shell — `NotImplementedError`; docstring carries the §0.3 three-anchor correction (K(0)=0 boundary, K(0.5)=1 PEAK, K(1)=0 boundary). |
| `packages/lenia/lenia/growth.py` | `growth_lenia(u, mu, sigma)` shell — `NotImplementedError`. |
| `packages/lenia/lenia/sim.py` | `LeniaConfig` (frozen dataclass with default `orbium-unicaudatus` preset; lands at Stage 1a so tests import); `LeniaSim` shell — `__init__` records config; `step()/field()/capture()` raise `NotImplementedError`. |
| `packages/lenia/lenia/__main__.py` | CLI shell — `NotImplementedError`; Stage 1b lands argparse per `docs/phases/phase-3-plan.md` § 3.2.6. |

### § 2.2 — Spec-ref stub + probe report

| Path | Shape |
|---|---|
| `docs/sim-specs/continuous-ca/lenia/spec-ref.md` | 13-section template per `docs/architecture.md` § 8.2; §1 scope (terminal in Phase 3); §2 upstream + Chakazul SHA + Chan 2019; §3 algorithm (Quad4 conv + growth + Euler); §4 algebraic form with **three correct anchors** (FACT); §5 implementation with §0.3 SHIFT note; **§6 declares 2 PBT invariants** (`mass_approximately_conserved` + `monotone_bounds`); §7 golden values; §8 determinism; §9 equivalence (N/A; tolerance row schema cited); §10 diagnostics (Tier-3 first-creation note); §11 build+run; §12 references; §13 productization status. Stub markers `TODO(Stage-1b)` in §3, §4 derivation reference, §7 golden-table content, §10 Tier-3 enumeration. |
| `tools/testkit/probes/reports/lenia.md` | cat1-resident probe per `tools/testkit/probes/template.md` (full repo-relative path:line cites; matches the [[cat1-scans-probes-evidence-hashes-mapping]] bank). § 2 API surfaces (common_py + taichi + testkit + diagnostics + integrity); § 3 upstream + Chakazul SHA + Stage-1b grep-cite targets; § 4 test-fixture paths; § 5 planned signatures; § 6 FACT/INFERENCE tagging; § 8 §0.3 SHIFT layout note; § 9 Quad4 three-anchor re-grounding (FACT). |

### § 2.3 — Workspace registration

`pyproject.toml` `[tool.uv.workspace] members` — appended `"packages/lenia"`
as 24th workspace member; comment block documents §0.3 SHIFT + the
first-SIM Phase-3 placement.

## § 3 — RED tests (FACT — landed at RED-commit `de92946`)

### § 3.1 — Test modules

| Path | Shape |
|---|---|
| `packages/lenia/tests/__init__.py` | Empty marker. |
| `packages/lenia/tests/conftest.py` | `REPO_ROOT` + `canonical_manifest_path` / `canonical_payload_path` fixtures pointing at `captures/lenia/orbium-256sq-seed42-step1000.{h5,json}` (produced at Stage 1b). |
| `packages/lenia/tests/test_kernel_anchors.py` | **5 tests** for Quad4 three-anchor + compact-support + vector form. |
| `packages/lenia/tests/test_growth.py` | 2 tests for `G(mu)=1` + `G(far)=-1`. |
| `packages/lenia/tests/test_sim_shells.py` | 4 tests asserting `LeniaConfig` constructs + `LeniaSim.{step,field,capture}` raise `NotImplementedError` (these **PASS** at Stage 1a; the shells ARE the contract). |
| `packages/lenia/tests/test_determinism.py` | D-DET MEASURE-twice-diff-zero witness. |
| `packages/lenia/tests/test_pbt_invariants.py` | `mass_approximately_conserved` + `monotone_bounds` witnesses (Stage-1b adds the shared `tools/testkit/property/sims/lenia/` module). |

### § 3.2 — RED state at HEAD `de92946`

```
FFFFFFFFFF....
=== short test summary info ===
FAILED packages/lenia/tests/test_determinism.py::test_determinism_two_runs_bit_equal
FAILED packages/lenia/tests/test_growth.py::test_growth_at_mu_is_positive_peak
FAILED packages/lenia/tests/test_growth.py::test_growth_far_from_mu_is_negative
FAILED packages/lenia/tests/test_kernel_anchors.py::test_quad4_anchor_r_zero_is_boundary
FAILED packages/lenia/tests/test_kernel_anchors.py::test_quad4_anchor_r_half_is_peak
FAILED packages/lenia/tests/test_kernel_anchors.py::test_quad4_anchor_r_one_is_boundary
FAILED packages/lenia/tests/test_kernel_anchors.py::test_quad4_compact_support_outside_unit_interval
FAILED packages/lenia/tests/test_kernel_anchors.py::test_quad4_three_anchor_vector
FAILED packages/lenia/tests/test_pbt_invariants.py::test_pbt_mass_approximately_conserved_witness
FAILED packages/lenia/tests/test_pbt_invariants.py::test_pbt_monotone_bounds_witness
10 failed, 4 passed
```

**RED summary:** `10 failed, 4 passed` — failure mode uniformly
`NotImplementedError` from the Stage-1a shells at
`packages/lenia/lenia/{kernel.py:55, growth.py:52, sim.py:77,85}` —
**NOT collection error** per `docs/phases/phase-3-plan.md:1337`.
The 4 GREEN are `test_sim_shells.py::*` — the LeniaConfig dataclass
constructs successfully and the LeniaSim shell methods raise as
asserted (shells ARE the contract; analogous to render-similarity's
`test_ms_ssim_raises_not_implemented` Phase-4-WU-C-style shell).

Stage 1b inverts the 10 FAILs to PASS while preserving the 4 shell-
contract greens (test_sim_shells's assertions for `step`/`field`/
`capture` will need rework — those shells are replaced by Stage-1b
implementations; the Stage-1b commit will rewrite `test_sim_shells.py`
to assert the production behavior instead).

### § 3.3 — Failing-tests evidence + reproducibility

Capture recipe (matches the commit-footer recipe; mirrors
render-similarity Stage 1a):

```
uv run --no-sync pytest packages/lenia/tests/ --tb=line -q \
  -p no:cacheprovider 2>&1 \
  | sed -E "s#${PWD}/##g; s/ in [0-9]+\\.[0-9]+s\$//; s/[[:space:]]+\$//"
```

| Run | sha256 of normalized output |
|---|---|
| Capture 1 (commit-time witness, pre-commit) | `5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0` |
| Capture 2 (immediate pre-commit re-run) | `5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0` |
| Capture 3 (post-commit re-run at HEAD `de92946`) | `5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0` |

**Reproducible byte-for-byte.** On-disk evidence at
`tools/testkit/failing-tests-evidence/lenia-2026-05-28T15-24-41Z.txt`
matches all three sha256s.

### § 3.4 — Commit footer

```
Failing-tests-output: tools/testkit/failing-tests-evidence/lenia-2026-05-28T15-24-41Z.txt
Failing-tests-output-hash: sha256:5ff5e74175e9a5318f3fbed82b494477365eae83dd7e57795305ec81849a51f0
```

Present in the RED commit `de92946`'s message body (`git show de92946`).

## § 4 — §0.3 SHIFT-from-discovered ratifications (FACT)

### § 4.1 — D-LAYOUT: `packages/lenia/` (RESOLVED-ON-EVIDENCE)

Stage-0 audit FRICTION #2 surfaced the path mismatch: plan §6.3
(`docs/phases/phase-3-plan.md:1307,1333,1343`) prescribes
`continuous-ca/lenia/python/`; on-disk convention at HEAD is
`packages/<name>/` (per 9 prior sim packages
`packages/reaction-diffusion-2d{,-stack-c,-stack-d}`,
`packages/reaction-diffusion-3d`, `packages/sph-water{,-stack-d}`,
`packages/eulerian-smoke{,-stack-d,-stack-e}`,
`packages/lattice-boltzmann-d3q19{,-stack-d,-stack-e}`,
`packages/mpm-multimaterial{,-stack-d,-stack-e}`, etc.).

§0.3 of `docs/phases/phase-3-plan.md` declares existing-convention
precedence over §3.2 prescriptions. Stage 1a ratifies the on-evidence
decision:

- Package root: `packages/lenia/`.
- Python package: `lenia/` (snake_case mirrors
  `packages/reaction-diffusion-2d/reaction_diffusion_2d/` convention
  for hyphenated → underscored package names; since `lenia` has no
  hyphens, both `packages/lenia/lenia/` and the canonical no-suffix
  module name `lenia` are concordant).
- Workspace member: `"packages/lenia"` in `pyproject.toml`
  `[tool.uv.workspace] members`.

**NO plan edit** (Convention M — SHIFTED-surface-only; charter +
plan-drafting audit + Stage-0 audit + this Stage-1a audit document
the SHIFT). Plan amendment, if desired, is operator-approved +
separate-commit only (charter §7 R-10).

### § 4.2 — Quad4 anchor re-grounding (RECORDED FACT)

§6.3 prose at `docs/phases/phase-3-plan.md:1351` says "kernel at
r=0 (peak K(0))". Hand-derivation:

```
K(r) = (4 r (1 - r))^4
K(0)   = (4 · 0 · (1 - 0))^4 = (0)^4 = 0   → compact-support BOUNDARY (NOT a peak)
K(0.5) = (4 · 0.5 · 0.5)^4   = (1)^4 = 1   → PEAK
K(1)   = (4 · 1 · 0)^4       = (0)^4 = 0   → compact-support BOUNDARY
```

Three CORRECT anchors recorded at:
- `packages/lenia/lenia/kernel.py:14-20` (docstring math).
- `docs/sim-specs/continuous-ca/lenia/spec-ref.md` § 4 (algebraic form).
- `tools/testkit/probes/reports/lenia.md` § 9 (probe re-grounding).
- `packages/lenia/tests/test_kernel_anchors.py` (the RED tests encode
  the corrected math; Stage 1b's implementation against these
  anchors confirms the math).

**NO plan edit** (Convention M). STOP-PROSE-MATH **not fired**
(the math is hand-derivable; STOP-D-ANCHOR routes to Stage 1b after
Chakazul vendoring — the hand-derivation is the independent reference
per `tools/testkit/golden/derivations/lenia-kernel.md` to land at
Stage 1b deliverable F).

## § 5 — First-SIM friction notes update (R-11 forward-routing)

Carrying Stage-0 frictions + recording one Stage-1a observation:

| # | Friction | Status |
|---|---|---|
| **#1** (Stage-0) | `tolerance-budget.toml` has no `[budgets.<category>.golden]` cap shape | UNCHANGED; lands at Stage 1b acceptance (Lenia `[continuous-ca.lenia]` rows un-capped-by-design). |
| **#2** (Stage-0) | `packages/<name>/` vs `continuous-ca/lenia/python/` plan prescription | **RESOLVED-ON-EVIDENCE** at this Stage 1a (D-LAYOUT `packages/lenia/`); SHIFTED-surface-only; carried forward as **PRECEDENT** for every later Phase-3 SIM. |
| **#3** (Stage-1a, new) | Stage-1a's `test_sim_shells.py` tests will need a Stage-1b rewrite — the shell-contract assertions (`pytest.raises(NotImplementedError)`) are not the production contract. Mirror of render-similarity's `test_ms_ssim_raises_not_implemented` posture but inverted (their `ms_ssim` shell stays raise through Stage 1b per Phase-4-WU-C; Lenia's `LeniaSim` is fully implemented at Stage 1b). | UNCHANGED at Stage 1a (the RED commit is correct as it stands; Stage 1b explicitly rewrites). Forward-routed. |

All three friction items are NON-STOP, all three are **portfolio-scale
signals** (every later Phase-3 SIM may face #1 + #2 + the rewrite-shell-
contract dynamic of #3).

## § 6 — STOP audit

| STOP | Fired? | Notes |
|---|---|---|
| STOP-D (integrity / I1-I7) | NO | baseline byte-identical at HEAD; I7 unchanged (allowlist extension at Stage 2) |
| STOP-H (verify_evidence) | NO | Stage-0 audit 14/0; this Stage-1a audit verified at its own commit |
| STOP-D-ANCHOR (Quad4 / Orbium grep-cite) | not yet in scope | Stage 1b after Chakazul vendoring; the §4.2 hand-derivation pre-grounds the three Quad4 anchors |
| STOP-PROSE-MATH | NO (recorded SHIFTED) | §4.2 ratifies the §0.3 SHIFT; charter §1.2 already recorded; NO plan edit |
| STOP-TIER3-DIR | not yet in scope | Stage 1b first-creates `tools/diagnostics/tier3/lenia/` |
| All other STOPs (DET / FFT / LFS / PBT / CAT-X / I7 / K2-AT-HEAD / PIN / REPLAY) | not yet in scope | gated to later stages per charter |

## § 7 — Stage-1a verdict + forward-routing

**Verdict: CONFIRMED.** Stage 1b (vendoring + Taichi impl + golden +
tier-3 + determinism + PBT + .h5 + perf + tolerance + shared files +
13-gate) may dispatch. No operator-pending external-state gates.

Forward-routed:
- **D-LAYOUT** RESOLVED-ON-EVIDENCE — packages/lenia/ (recorded here +
  charter + plan-drafting audit; portfolio-scale precedent for every
  later Phase-3 SIM).
- **Stage 1b deliverables** per charter §2 Stage 1b row (vendoring +
  impl + golden + tier-3 + PBT module + .h5 + perf + tolerance + shared
  files + 13-gate).
- **Three Quad4 anchors** pre-grounded by hand-derivation; Stage 1b
  cross-checks against vendored Chakazul derivation.
- **Friction #3** (test_sim_shells.py shape) — Stage 1b rewrites.

— Stage-1a audit ends —

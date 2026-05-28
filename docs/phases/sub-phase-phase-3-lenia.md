---
date: 2026-05-28
author: phase-3 lenia plan-drafting (Claude Code)
sub_phase: sub-phase-phase-3-lenia
phase: phase-3
head_sha_at_draft: d5587b4aa8a24366c21532f0ed8e210a0dba8559
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
version: charter-v1 (2026-05-28T14-38-32Z plan-drafting)
revisions:
  - v1 (2026-05-28T14-38-32Z) — first SIM in Phase 3; D-B Stack-D RESOLVED-IN-CHARTER on FACT (sibling investigation audit); D-MUT-SCOPE NO + D-FFT real-space default + D-DET bit-exact same-stack-same-hw + D-TAG YES leans seated.
posture: >
  Third Phase-3 sub-phase. First SIM in Phase 3 after the two infrastructure
  roots (common-3dgs `v0.2.2`, render-similarity `v0.2.3`). The first SIM's
  flow VALIDATES the testkit + golden + tier-3 + CI pipeline end-to-end —
  friction here predicts friction in every later SIM (rigid-body, cloth,
  NCA, PINN, 3DGS-MPM) per `docs/phases/phase-3-plan.md:1295-1302` (§ 6.3
  CONTEXT BRIDGE) + plan §4.1 ordering rationale `:764-765`. Per the
  matured per-sub-phase cadence (plan-drafting → Stage 0 → 1a / 1b / 1c →
  Stage 2), this charter inherits §6.3 (task-3 prompt) + §3.2.4 + §3.2.5 +
  §3.2.6 + §3.2.8 + §3.2.9 + §3.5 + §5.4 + §6.0 from
  `docs/phases/phase-3-plan.md` unchanged-by-citation and re-frames the v8
  single-agent-sequential branch/PR machinery + one §0.3-discovered
  mathematical drift (§6.3 prose anchor-1 "r=0 (peak K(0))" — actually K(0)=0
  for Quad4). Lenia is terminal in Phase 3 (`docs/phases/phase-3-plan.md:325`).
  DRAFT ONLY — Stages execute under operator-ratified D-class routings.
  Every execution commit preserves invariants I1-I7, append-only audits,
  trunk-based commits to main, no agent-pushed tags (I7).
---

# Sub-phase: Phase-3 Lenia (task-3) — CHARTER

> **This is a plan, not an execution.** Plan-drafting verdict **CONFIRMED**
> (subject to its own audit) — the probe + D-B investigation + charter are
> sound and Stage 0 may dispatch. It does **NOT** mean `continuous-ca/lenia/`
> exists. Every concrete claim is tagged FACT / INFERENCE / WEB and cites
> full repo-relative `path:line`. Probe FACTs live in
> `docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md`;
> the D-B stack-assignment decision lives in
> `docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md`;
> this charter summarizes, re-frames, and routes. DELIVERABLES / OUT OF SCOPE /
> ANCHOR-PROBE content is **inherited** from `docs/phases/phase-3-plan.md:1282-1373`
> (§6.3) + §3.2.4 (`:421-457`) + §3.2.5 (`:461-505`) + §3.2.6 (`:507-528`) +
> §3.2.8 (`:539-555`) + §3.2.9 (`:556-578`) + §5.4 (`:988-1007`) + §6.0 (`:1017-1069`);
> it is NOT re-authored here.

## § 1 — Scope and posture

**(FACT)** This sub-phase introduces **one SIM deliverable family**: a
reference **Lenia** implementation on **Stack D (Taichi)** at
`continuous-ca/lenia/python/`. Scope owner: `docs/phases/phase-3-plan.md:1282-1373`
(§6.3 task-3 prompt). Plan §1 scope table row "3.1 → Lenia → continuous-ca
(Lenia subfamily) → D (Taichi) → Chan 2019" (`docs/phases/phase-3-plan.md:154`).

**Why it is third (FACT + INFERENCE).** The §3.1 deliverable map
(`docs/phases/phase-3-plan.md:319-334`) has exactly two hard-blocking
infrastructure roots — task-1 common-3dgs (LANDED at `v0.2.2`) and task-2
render-similarity (LANDED at `v0.2.3`). The §4.1 default task order
(`:744`) names task-3 (Lenia) as the next sub-phase after both roots
land. Per plan §4.1 rationale `:764-765`:

> "**Easy before hard.** task-3 (Lenia) is the simplest sim — golden
> values, single stack, no upstream code beyond Chakazul's reference.
> Landing it first validates that the testkit + golden-table + tier-3 +
> CI pipeline works end-to-end before tackling harder sims."
>
> "**Cover stacks early.** task-3 (D), task-4 (E), task-5 (C) cover
> three stacks in sequence. By task-6 (D+B) the multi-stack testing
> posture is established."

**Why D-B = Stack D (RESOLVED-IN-CHARTER, FACT-cited).** Per the sibling
D-B investigation audit
(`docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md`),
Stack D is the plan-rationale-backed + catalog-§5.2.2-concurring +
no-downstream-Stack-B-consumer + maximum-pipeline-coverage choice. The
catalog Appendix B row `Lenia | B | E | n/a` (`docs/planning/bit-physics-master-catalog.md:4683`)
is **tier-accessibility crosswalk** (header `:4634` — Tier 0 / Tier 1 /
Tier 2 stacks), **NOT** a single-stack mandate. The catalog's own
§5.2.2 narrative (`:1065`) explicitly says "Stack D (Taichi or PyTorch),
with WebGPU deploy variant" — agreeing with the plan. **NO catalog
edit, NO plan edit** (Convention M).

**Lenia is terminal in Phase 3** (`docs/phases/phase-3-plan.md:325`). No
Phase-3 task imports `continuous-ca/lenia/` as a code dependency. Phase-4
introduces no Lenia consumer (`grep -n Lenia docs/phases/phase-4-plan.md`
no-match). The Phase-5 web-deploy lift to Stack B (per
`docs/planning/bit-physics-master-catalog.md:202`) is **compatible with**
the Stack-D reference and is **out of scope here** (Phase 4+ scope per
§6.3 OUT OF SCOPE `:1310-1312`).

### § 1.1 First-SIM-in-Phase-3 friction surfacing (CONTEXT-BRIDGE, load-bearing)

**(FACT + INFERENCE — load-bearing for every later Phase-3 SIM).** Per the
dispatch prompt's CONTEXT-BRIDGE clause + plan §6.3 CONTEXT-BRIDGE
(`docs/phases/phase-3-plan.md:1295-1302`):

> "Note: tasks 1 and 2 are infrastructure; you're the first SIM and your
> flow validates that the testkit + golden + tier-3 + CI pipeline works
> end-to-end. If you find friction, the friction likely affects later
> sim tasks — surface clearly."

Lenia exercises — for the **first time end-to-end** in Phase 3 — the
following pipeline surfaces:

| Surface | First-SIM exercise | Friction predicts |
|---|---|---|
| `tools/testkit/golden/tables/lenia-*.json` (Stack-D golden table, ≥3 independent-reference anchors per §2.4) | first SIM golden table in Phase 3 | rigid-body, cloth, NCA, PINN, 3DGS-MPM all ship golden tables |
| `tools/diagnostics/tier3/lenia/` (Tier-3 module tree creation per §3.2.9) | **first ever** `tools/diagnostics/tier3/` directory (`tools/diagnostics/diagnostics/tier1/` + `tier2/` exist; `tier3/` does not at HEAD per probe §3.2) | every later Phase-3 sim is the first to land a `tier3/<sim>/` subtree under this directory |
| `tools/testkit/property/sims/lenia/` (PBT ≥2 invariants per §2.14) | first SIM PBT module in Phase 3 (render-similarity had PBT under `tools/testkit/render_similarity/tests/test_metrics_pbt.py`; this is **per-sim** PBT, different location) | rigid-body, cloth, NCA, PINN, 3DGS-MPM all ship per-sim PBT |
| `tools/testkit/failing-tests-evidence/lenia-<UTC>.txt` + sha256-in-commit-footer (TDD output capture per §6.0 item 6 + spec § 1.3 step 4) | the SIM TDD discipline (the testkit-infra precedent at `c42a4a4` is render-similarity's `sha256:88b5194b…b6`; Lenia is the first SIM to apply this footer pattern) | every later Phase-3 SIM applies this pattern |
| `references/Chakazul-Lenia/` vendoring + `manifest.yaml` at pinned SHA (§2.11 + §6.3 G) | first SIM-task vendoring in Phase 3 (common-3dgs's `references/3DGS-reference/` was infra) | cloth (PositionBasedDynamics), NCA (no vendoring), PINN (PhysicsNeMo), 3DGS-MPM (PhysGaussian) all vendor at Stage 1b |
| `tests/fixtures/legacy-captures/phase-3-lenia.h5` + sidecar `.json` (schema-corpus seed per §6.0 item 10) + **LFS push + R2 mirror** | first SIM `.h5` push exercising the LFS/R2 path post-`v0.2.1-sub-phase-lfs-architecture` (common-3dgs's `phase-3-common-3dgs.h5` was the only prior; that one was infra) | rigid-body, cloth, NCA, PINN, 3DGS-MPM all push `.h5` seeds — STOP-LFS friction here is portfolio-scale (every later SIM hits the same path) |
| `docs/perf-ledger.md` row append (`lenia | python (Taichi) | orbium-256sq-seed42-step1000 | <wall-clock> | <hw-id> | <commit-sha> | <date> | baseline` per §6.0 item 9) | first SIM perf-row in Phase 3 | every later SIM appends a perf-row |
| `tools/testkit/equivalence/tolerance.toml` (`[continuous-ca.lenia]`) + `tools/testkit/determinism/registry.toml` (`[continuous-ca.lenia]`) | first SIM rows under continuous-ca category in Phase 3 | rigid-body, cloth, NCA, PINN, 3DGS-MPM all add per-category rows |
| `.github/workflows/build-py.yml` (or `python-strict.yml`) — `test-lenia` job per §3.2.10 | first per-sim CI job for a Phase-3 SIM | every later Phase-3 SIM adds a job |
| §6.3 `mass_approximately_conserved` + `monotone_bounds` PBT invariants (suggested) | first **PBT-invariant declaration in spec-ref §6** in Phase 3 (per §2.14) | rigid-body energy-drift, cloth max-stretch, NCA bounded-channel, PINN PDE-residual, 3DGS-MPM mass-conservation are the analogous later invariants |

**(STOP-load-bearing flag.)** Per § 6 below, any friction surfacing in
Stage 1a/1b/1c that is **specific to the per-sim discipline** (not the
Lenia algorithm itself) is to be **named loudly in the stage audit + the
landing audit**, even if it doesn't fire a hard STOP. Future SIM sub-
phases inherit the resolution.

### § 1.2 Inheritance and re-frames

| Layer | Authority | Note |
|---|---|---|
| § 6.3 task-3 prompt (DELIVERABLES A-O + OUT OF SCOPE + ANCHOR-PROBE + VERIFICATION POSTURE) | `docs/phases/phase-3-plan.md:1282-1373` | inherited unchanged-by-citation; charter does NOT re-author |
| § 6.0 sim-task discipline items 1-11 | `docs/phases/phase-3-plan.md:1023-1052` | inherited unchanged; cross-phase replay applies to task-1's first action ONLY (`:1023-1027`), so this sub-phase is **NOT** the cross-phase-replay owner — Stage 0 still runs replay per the matured per-sub-phase cadence (mirrors common-3dgs / render-similarity Stage-0 precedent) |
| § 3.2.4 tolerance row + § 3.2.5 determinism row | `docs/phases/phase-3-plan.md:426-433` + `:479-486` | inherited; **pre-baked at plan-time**, lands at Stage 1b |
| § 3.2.6 CLI conventions + § 3.2.8 spec-sheet + § 3.2.9 tier-3 + § 5.4 13-gate | `docs/phases/phase-3-plan.md:507-528` + `:539-555` + `:556-578` + `:988-1007` | inherited unchanged |
| § 6.3 ANCHOR-PROBE step `BASE BRANCH: phase-3-integration` / `YOUR BRANCH: phase-3/task-3-lenia` / `gh pr create` | `docs/phases/phase-3-plan.md:1290-1291` | **v8 trunk-based amendment supersedes** (`docs/phases/phase-3-plan.md:46`); commit directly to `main`, no PR, no merge step. Surface-only re-frame per Convention M. |
| § 6.3 "Sub-phase 3.1" framing | `docs/phases/phase-3-plan.md:1287` | **§1 scope-table ordinal**, not execution ordinal. By execution order this is the THIRD Phase-3 sub-phase (after common-3dgs, render-similarity). Surface-only. |
| § 6.3 ANCHOR-PROBE 1 "Clone, sub-branch, base-sha" | `docs/phases/phase-3-plan.md:1318` | **trunk-based**, no sub-branch; base-SHA = HEAD of `main`. |
| § 6.3 E "kernel at r=0 (peak K(0))" | `docs/phases/phase-3-plan.md:1351` | **§0.3 SHIFT-from-discovered (mathematical)**: Quad4 evaluates `K(0) = (4·0·(1-0))^4 = 0` — **NOT** a peak. The peak is at `r=0.5` where `4r(1-r)=1`, so `K(0.5)=1`. Stage 1b grounds the three anchors against Chakazul's canonical kernel-shape derivation; the **likely** anchor set is `r=0` (K=0, boundary), `r=0.5` (K=1, peak), `r=1` (K=0, compact-support boundary). Charter records SHIFTED-surface-only; NO plan edit (architecture-spec authority via `phase-3-plan.md`). |

## § 2 — Stage cadence

This charter ratifies the matured per-sub-phase cadence as the execution
shape, modeled on the **Phase-1 sim exemplar** (RD-2D spec-ref structure
at `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md`) and
the precedents at `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-*`
+ `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-*`. Sim
stage shape differs from infra by **NO mutation gate at Stage 1c**
(§6.0 item 12 testkit-adjacent-only; §6.3 VERIFICATION POSTURE
golden + PBT + determinism, no mutation).

### Stage 0 — Pre-flight + integrity baseline + verify_evidence sweep + cross-phase replay

| Surface | Operation |
|---|---|
| Anchor probe at HEAD | `git rev-parse HEAD` == `git rev-parse origin/main`; six phase tags resolve; integrity Cat 1-5 byte-identical `c19492ad…d22cb52` (0 HF / 14 SW); I1-I7 hold |
| verify_evidence sweep | 0-fail across all 17 prior Phase-3 audits (15 entering this session + the D-B investigation + this probe) + this Stage-0 audit's predecessors |
| Cross-phase replay (per matured per-sub-phase cadence) | `python -m integrity.scripts.replay_prior_phase --prior-phase phase-2 --audit docs/_audits/phase-2/landing-<UTC>.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget` → `ok=True` 8/8; STOP-REPLAY if discrepancy; LFS-cache recovery via [[replay-needs-lfs-cache-recovery]] applies BEFORE declaring blocked |
| Tolerance-budget Phase-3 carryover | Verified-only (opened at common-3dgs Stage 0; re-verified-only by render-similarity Stage 0); Lenia adds `[continuous-ca.lenia]` rows AT STAGE 1b under the carryover, not now |
| Tolerance-budget Lenia-side cap probe | At Stage 0 (in this Stage-0 audit), confirm that `golden_kernel_abs=1e-6`, `golden_kernel_rel=1e-5`, `golden_trajectory_abs=1e-4` (per § 3.2.4 pre-baked) fit within whatever `[budgets.continuous-ca.golden]` (or analogous) cap exists; if no cap exists for continuous-ca, surface for operator routing (not necessarily a STOP — see § 6.0 item 2) |
| `uv sync --all-packages` | clean (per [[bit-physics-uv-sync-prunes-venv]]) |
| Stage-0 audit + progress.md entry + SHA back-fill | per Convention #12 separate commit |

**Out-of-stage in Stage 0:** scaffolding, RED tests, vendoring,
implementation, golden values, Tier-3, PBT, schema-corpus seed,
perf-ledger row, CI workflow, intermediate tag.

### Stage 1a — Scaffold + RED + failing-tests-hash + Chakazul anchor probe

| Surface | Operation |
|---|---|
| Probe report | `tools/testkit/probes/reports/lenia.md` per `tools/testkit/probes/template.md` — enumerate common-py APIs consumed (probe § 3.1 above); Chakazul SHA + security (probe § 4.1); Quad4 kernel formula + Orbium preset citations grep-cited to vendored Chakazul source (NOT from memory — Convention #8). **STOP-D-ANCHOR if Quad4 or Orbium are not grep-citable at the pinned SHA.** |
| Spec-ref stub | `docs/sim-specs/continuous-ca/lenia/spec-ref.md` — 13-section template per `docs/architecture.md` §8.2 (RD-2D exemplar at `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md`); § 6 declares ≥ 2 PBT invariants (`mass_approximately_conserved` + `monotone_bounds` per § 6.3 A); rest may be stub-filled with `TODO(Stage-1b)` markers |
| Failing TDD tests | `continuous-ca/lenia/python/tests/` — `pytest -v 2>&1 \| tee tools/testkit/failing-tests-evidence/lenia-<UTC>.txt`; failure mode MUST be `ModuleNotFoundError` / `NotImplementedError` (NOT collection error); `sha256sum` the evidence file; commit footer carries `Failing-tests-output: …` + `Failing-tests-output-hash: sha256:…` per § 6.0 item 6 + spec § 1.3 step 4. Recipe per render-similarity Stage 1a (sha256 byte-reproducible recipe: `pytest` + post-format `sed` for trailing-whitespace normalization). |
| §0.3 SHIFT-from-discovered re-grounding of golden-anchor #1 | Stage-1a probe re-evaluates Quad4 at `r=0` (FACT: `K(0)=0`, NOT a peak); decide the three anchors against Chakazul derivation. Surface for charter §2 update at Stage 1b. |
| Stage-1a audit + progress entry + SHA back-fill | per Convention #12 |

**RED state expected:** every test in `continuous-ca/lenia/python/tests/`
raises `ModuleNotFoundError` (because the `continuous_ca.lenia` package
doesn't exist yet) OR `NotImplementedError` from stub shells.

### Stage 1b — Implementation + golden values + Tier-3 + PBT + shared files + CI + legacy-capture seed + perf-row + 13-gate

| Surface | Operation |
|---|---|
| Vendoring | `references/Chakazul-Lenia/` at SHA `adfc542939266de7f4bb7ebb552e8499701ee107` + `manifest.yaml` per §2.11 |
| Taichi impl | `continuous-ca/lenia/python/` — real-space Taichi-kernel convolution (D-FFT default); Orbium unicaudatus preset; capture I/O via `common_py.capture.Writer`; determinism via `common_py.determinism.set_taichi_deterministic(config, arch='cpu')`; CLI per §3.2.6; commit footer carries `Implements-failing-tests-from: <Stage-1a-commit-sha>` + `Failing-tests-output-hash-witnessed: sha256:<same-hex>` |
| D-FFT decision | Probe Taichi FFT path. If stable AND bit-exact same-stack-same-hw, opt-in. Else real-space only. Decision recorded in Stage-1b audit. |
| Spec-ref full | `docs/sim-specs/continuous-ca/lenia/spec-ref.md` — § 6 declares ≥2 PBT invariants per §2.14 |
| Golden tables (≥3 independent-reference anchors per §2.4) | `tools/testkit/golden/tables/lenia-kernel.json` (K(r) at canonical radii — Stage 1b decides the leaf location: top-level vs `continuous-ca/` subtree); `tools/testkit/golden/tables/lenia-orbium-trajectory.json` (field at canonical steps, 64² grid). Three Quad4-kernel anchors anchored per §4.2 probe re-grounding (likely r=0, r=0.5, r=1); each anchor carries `independent_reference` JSON field with source + DOI + page. **STOP-D-ANCHOR if any anchor cannot be grounded without large fetch or fabrication.** |
| Golden derivations | `tools/testkit/golden/derivations/lenia-kernel.md` — hand-derivation of Quad4 + Chakazul source citation |
| Tier-3 diagnostic module | `tools/diagnostics/tier3/lenia/` per §3.2.9 — **FIRST EVER `tools/diagnostics/tier3/` subtree** at HEAD; landing creates the `tier3/` parent directory |
| PBT | `tools/testkit/property/sims/lenia/` — ≥2 invariants per §2.14 + §6.0 item 7; Hypothesis examples DB at `.hypothesis/` committed (NOT gitignored) |
| Tolerance + determinism rows | `tools/testkit/equivalence/tolerance.toml [continuous-ca.lenia]` (per § 3.2.4 pre-baked: `golden_kernel_abs=1e-6` / `golden_kernel_rel=1e-5` / `golden_trajectory_abs=1e-4`); `tools/testkit/determinism/registry.toml [continuous-ca.lenia]` (per § 3.2.5 pre-baked: Stack D, bit-exact, same-stack-same-hw, atomic_ops=none, seed_pinned=true) |
| D-DET MEASURE | Run forward conv twice with pinned seed + CPU arch → assert bit-equal NumPy arrays + capture bytes. Mirrors render-similarity Stage-1b D-DET measure. **STOP-DET if NOT bit-exact** — surface and re-characterize as `distributional` + EFECT bound (Hard-Rule-2; precedent smoke-stack-e). |
| Perf-ledger row | `docs/perf-ledger.md` — `lenia | python (Taichi) | orbium-256sq-seed42-step1000 | <wall-clock> | <hw-id> | <commit-sha> | <date> | baseline` per §6.0 item 9 |
| Schema-corpus seed | `tests/fixtures/legacy-captures/phase-3-lenia.h5` + sidecar `phase-3-lenia.json` per §6.0 item 10. **LFS pointer + R2 mirror** — see § 1.1 friction surfacing; **STOP-LFS** if R2-push fails (do NOT revert per [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]]). LFS-push recipe: `git -c lfs.standalonetransferagent= push` + separate `git lfs push --object-id --stdin origin`. |
| Cat 1, 2 gates green + Cat-X tolerance-budget compliance | per §6.3 I + §6.0 item 2 |
| Shared files | `README.md`, `CHANGELOG.md`, `docs/glossary.md` (Lenia, kernel-convolution CA, Quad4, growth fn); `justfile` (`run-lenia`, `test-lenia`); `.github/workflows/build-py.yml` or `.github/workflows/python-strict.yml` (`test-lenia` job per §3.2.10) — per §6.3 M |
| Thirteen-gate verdict | per §5.4 / spec §3.5 v2.4 — 1 spec-sheet, 2 probe-report, 3 failing-tests, 4 implementation, 5 tests-pass-anchors, 6 Tier-1/2/3, 7 capture-I/O, 8 perf-bench, 9 Cat-1-5+Cat-X, 10 audit-report, 11 PBT, 12 first-landing-wall-clock-in-perf-ledger, 13 failing-tests-replay-verifiable. **All 13 PASS for sim acceptance.** |
| Stage-1b audit + progress entry + SHA back-fill | per Convention #12 |

### Stage 1c — Verdict landing (NO mutation gate)

| Surface | Operation |
|---|---|
| Golden-anchor verification | All ≥3 anchors per table assert at expected values within tolerance. |
| PBT-green | `mass_approximately_conserved` + `monotone_bounds` invariants pass at the spec § 2.14 example budget; Hypothesis DB committed. |
| Determinism MEASURED at Stage 1b | re-verified at Stage 1c (run twice, diff zero). |
| Legacy-capture seed verified | `phase-3-lenia.h5` present, LFS-pointer present, R2 mirror present (or STOP-LFS escalated). |
| Perf-ledger row anchored | the row landed at Stage 1b is byte-stable. |
| 13-gate verdict re-confirmed | 13/13 PASS (or per-gate verdict-state per outcome). |
| **NO mutation gate** | per § 6.0 item 12 testkit-adjacent-only scope. The sim is verified by golden + PBT + determinism. **D-MUT-SCOPE RESOLVED-IN-CHARTER (NO).** |
| Stage-1c audit + progress entry + SHA back-fill | per Convention #12 |

### Stage 2 — Sub-phase landing audit + I7 allowlist extension + closing sweep + operator-tag proposal

| Surface | Operation |
|---|---|
| Landing audit | `docs/_audits/phase-3/sub-phase-phase-3-lenia-landing-<UTC>.md` consolidating plan-drafting + D-B investigation + probe + Stage-0/1a/1b/1c via `evidence_hashes:` mapping (does NOT re-narrate). Verdict per §2.15 graded variants (closed-green / closed-with-shifted-N / closed-with-blockers-N). |
| I7 allowlist extension | append `v0.2.4-sub-phase-phase-3-lenia` to `OPERATOR_NONPHASE_TAGS` in `tools/testkit/lfs_migration/test_i7_no_agent_tags.py` (mirror common-3dgs `c761aa9` + render-similarity `596eb73`). Guard mechanism UNCHANGED — mutation-probed (fake `agent/v0.0.42-fake` still rejected). Test 2/2 GREEN. |
| Closing sweep | Cat-X tolerance-budget; integrity baseline byte-identical; append-only 0 M/D vs `v0.2.0-phase-2` (sanctioned M against the in-Phase-3 progress.md is allowed per common-3dgs precedent); failing-tests replay MATCH; perf-ledger present; closing anchor re-check Convention 7.9. Pytest GREEN. |
| Tag proposal | `v0.2.4-sub-phase-phase-3-lenia` (D-TAG ratified YES; § 3 D-TAG rationale). **Operator-pushed only** (I7); agent does NOT tag. Pre-tag checklist documented in landing audit § 9 mirror. Form: annotated (`git tag -a`), NOT signed. |
| Banks carried forward | L-3DGS-1 (consumed at render-similarity Stage 1c — not relevant here; Lenia is not neural-rendered). SIBLING-FIXTURE-LFS (carried forward; Lenia's `.h5` push exercises the same LFS/R2 pipeline; if successful, increments the corpus by one — does NOT close the sibling sub-phase). integrity-meta-test-ci-wiring (carried forward; Lenia's testkit/property/sims/lenia/ rides the existing pytest-testpaths machinery — does NOT inherit the gap). |
| Stage-2 audit + progress entry + SHA back-fill | per Convention #12 |

## § 3 — D-TAG argument (intermediate tag at Stage 2)

**(FACT — `docs/conventions/sub-phase-conventions.md` § D.2)**

§D.2 default is **YES** for sub-phases that introduce **(a) external
vendoring** OR **(b) durable sim architecture**. Lenia meets both:

- **(a) External vendoring (STRONG).** `references/Chakazul-Lenia/` at
  SHA `adfc542939266de7f4bb7ebb552e8499701ee107`, MIT, security clean
  (per probe § 4.1).
- **(b) Durable sim architecture (STRONG).** First SIM in Phase 3.
  First `continuous-ca/lenia/python/` package. **First** `tools/diagnostics/tier3/`
  directory creation (per probe § 1.1 surface table). First
  Lenia spec-sheet at `docs/sim-specs/continuous-ca/lenia/spec-ref.md`.
  First per-sim PBT module under `tools/testkit/property/sims/lenia/`.
  First per-sim CI job `test-lenia`.

**Lean: YES `v0.2.4-sub-phase-phase-3-lenia`.** Operator-pushed (I7); I7
allowlist extension at Stage 2 mirrors common-3dgs `c761aa9` + render-
similarity `596eb73`.

**Operator-pending caveat (surfaced).** If the operator has switched to
**phase-close-only tagging** since the render-similarity Stage-2 close
(2026-05-28), the lean reverts to **NO intermediate tag** and the Stage-2
landing closes without an I7 allowlist extension. The charter defaults
the lean to YES per the immediate precedents (`v0.2.2` and `v0.2.3`
both pushed by operator on 2026-05-28). Decision-by Stage 2.

## § 4 — Anchor-grounding STOP-conditions (Convention #8)

Stage 1b grep-cites the following against the vendored Chakazul tree at
SHA `adfc542939266de7f4bb7ebb552e8499701ee107`. Each is a STOP-D-ANCHOR
if not grep-citable:

| Anchor | Citation target | STOP condition |
|---|---|---|
| Quad4 kernel formula `K(r) = (4r(1-r))^4` | Chakazul source file (likely `Python/LeniaF.py` or canonical kernel-shape file) at the pinned SHA | NOT grep-citable at the named SHA → STOP-D-ANCHOR (Convention #8 — no fabrication) |
| Orbium unicaudatus preset | Chakazul `animals.json` (verbatim entry at the pinned SHA) | NOT grep-citable → STOP-D-ANCHOR |
| Golden-anchor #1 — `r=0` (`K(0)=0`, compact-support boundary) | mathematical FACT (`(4·0·(1-0))^4=0`) + Chakazul derivation | Stage 1b probe re-evaluates — §6.3 prose "peak K(0)" is mathematically wrong (probe §4.2 FACT) |
| Golden-anchor #2 — `r=0.5` (`K(0.5)=1`, peak) | mathematical FACT + Chakazul reference notebook (if discoverable) | NOT cross-checkable → STOP-D-ANCHOR; widening test = anti-pattern |
| Golden-anchor #3 — `r=1` (`K(1)=0`, compact-support boundary) | mathematical FACT + hand-derivation in `lenia-kernel.md` | derivation-grounded; STOP only if mathematics fails |

**Per `docs/phases/phase-3-plan.md:1006` anti-pattern reminder:** widening
a test to accept any value is anti-pattern. If r=0.5 (the peak) cannot be
cross-checked against actual Chakazul output without an impractical
fetch → **surface; do NOT fabricate**.

## § 5 — D-class register (each lean + decision-by)

### D-B — stack assignment

- **Question:** Stack D (plan-§6.3) vs Stack B/E (catalog Appendix B `:4683`)?
- **Lean / RESOLUTION:** **Stack D — RESOLVED-IN-CHARTER on FACT.** Per
  the sibling D-B investigation audit
  (`docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md`)
  — plan §4.1 rationale + §6.3 prompt + §3.2.4/§3.2.5 pre-baked rows
  + catalog § 5.2.2 narrative all agree on Stack D; catalog Appendix B
  is **tier-accessibility crosswalk** (per column header `:4634`), not
  a single-stack mandate. **Surface, not edit** (Convention M; no catalog
  amendment, no plan amendment).
- **Decision-by:** plan-drafting (RESOLVED — operator may override at
  plan-drafting landing review).

### D-MUT-SCOPE — does a SIM carry a mutation gate?

- **Question:** mutation-testing gate at Stage 1c (like common-3dgs +
  render-similarity)?
- **Lean / RESOLUTION:** **NO — RESOLVED-IN-CHARTER on FACT.** Per
  `docs/phases/phase-3-plan.md:1054-1058` § 6.0 item 12: mutation-testing
  thresholds apply to **testkit-adjacent modules** (common-3dgs at task-1,
  render-similarity at task-2, common-warp at task-9). Lenia (task-3) is
  a SIM, not testkit-adjacent. §6.3 VERIFICATION POSTURE (`:1369-1373`)
  cites golden + PBT + determinism, no mutation. Stage 1c is **verdict-
  landing only** (golden-anchor verification + PBT-green + determinism-
  measured + legacy-capture seed verified + perf-ledger row anchored).
- **Decision-by:** plan-drafting (RESOLVED).

### D-FFT — convolution path

- **Question:** real-space Taichi-kernel convolution vs FFT?
- **Lean:** **real-space default** per §6.3 D (`docs/phases/phase-3-plan.md:1344-1346`).
  FFT opt-in only if Stage-1b probe finds a stable AND bit-exact
  same-stack-same-hw Taichi FFT path.
- **Decision-by:** Stage 1b.

### D-DET — determinism class

- **Question:** bit-exact same-stack-same-hw or distributional EFECT?
- **Lean:** **bit-exact same-stack-same-hw via Taichi seed; no atomics
  in forward conv.** Pre-baked at plan-time at § 3.2.5
  (`docs/phases/phase-3-plan.md:479-486`). MEASURE at Stage 1b. STOP-DET
  if NOT bit-exact (re-characterize per smoke-stack-e gate-14 precedent —
  Hard-Rule-2 distributional + EFECT bound; NOT a hard STOP if EFECT
  derivable).
- **Decision-by:** Stage 1b MEASURE.

### D-TAG — intermediate tag

- **Question:** tag at Stage-2 landing or remain untagged?
- **Lean:** **YES `v0.2.4-sub-phase-phase-3-lenia`** per § 3 argument
  (§D.2 (a) Chakazul external vendoring + (b) durable sim architecture
  both strongly met). Operator-pushed (I7); I7 allowlist extension at
  Stage 2.
- **Decision-by:** Stage 2 (operator ratifies). Operator-pending
  caveat: if phase-close-only tagging is now policy, lean reverts to NO.

## § 6 — HARD RULE 2 STOP conditions (sub-phase-specific)

File a blocker in the relevant stage audit; do not improvise through.

- **STOP-D.** Integrity baseline diverges from `c19492ad…d22cb52`
  (HARD_FAIL > 0) at any stage; or any I1–I7 invariant fails. **→ STOP.**
- **STOP-H.** `verify_evidence` regresses on any prior audit (incl. all
  common-3dgs + render-similarity stage audits + the BLOCKED stage-0
  artifact + the D-B investigation + this charter's predecessors).
  **→ STOP.**
- **STOP-REPLAY.** Cross-phase audit replay `--prior-phase phase-2`
  discrepancy at Stage 0 (`docs/phases/phase-3-plan.md:18`). **→ BLOCKED.**
  Recovery via [[replay-needs-lfs-cache-recovery]] applies BEFORE
  declaring blocked.
- **STOP-PIN.** Chakazul/Lenia SHA `adfc542939266de7f4bb7ebb552e8499701ee107`
  yanks / archives / changes license / surfaces a CVE between probe
  (`2026-05-28T14-38-32Z`) and Stage-1b vendoring. **→ STOP**, do NOT
  improvise an alternate pin.
- **STOP-D-ANCHOR.** Any of the three golden-table anchors (Quad4 at
  `r=0`, `r=0.5`, `r=1`) cannot be grounded without a large fetch or
  fabrication at Stage 1b. **→ STOP** (Convention #8 + `docs/phases/phase-3-plan.md:1006`
  forbid fabrication / widening).
- **STOP-DET.** D-DET measurement (Stage 1b) shows Taichi forward conv is
  NOT bit-exact across two runs with pinned seed / CPU arch — **→ surface
  and re-characterize** as `distributional` + EFECT bound (Hard-Rule-2;
  precedent smoke-stack-e gate-14). NOT a hard STOP if EFECT bound is
  well-grounded; STOP only if EFECT bound cannot be derived.
- **STOP-FFT.** D-FFT Stage-1b probe finds a Taichi FFT path that PASSES
  bit-exact same-stack-same-hw at one input but FAILS at another (silent
  non-determinism). **→ STOP**, do NOT opt-in to FFT; fall back to
  real-space.
- **STOP-LFS.** Stage 1b LFS push of `phase-3-lenia.h5` fails to R2 OR
  fails to GitHub. **→ surface to operator + DO NOT REVERT** per
  [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]] precedent. Recipe:
  `git -c lfs.standalonetransferagent= push` + separate `git lfs push
  --object-id --stdin origin`.
- **STOP-PBT.** Either declared PBT invariant (`mass_approximately_conserved`,
  `monotone_bounds`) fails at the spec § 2.14 example budget at Stage 1c.
  **→ surface**; widening Hypothesis examples or relaxing the assertion =
  anti-pattern; the failing example IS the value.
- **STOP-CAT-X.** Lenia's `tolerance.toml [continuous-ca.lenia]` row
  exceeds the corresponding `tolerance-budget.toml` cap. **→ STOP**;
  surface tolerance-budget amendment via separate operator-approved
  `chore(tolerance-budget): amend …` commit per § 6.0 item 2; do NOT
  widen unilaterally.
- **STOP-I7.** Stage 2 I7 allowlist extension breaks the guard mechanism
  (fake `agent/v…` no longer rejected after the additive extension). **→
  STOP**; the extension must be additive-only.
- **STOP-K2-AT-HEAD.** Any §6.3 golden-path occurrence reads
  `code_verification/golden` at HEAD during Stage 0 (K-2 fix did not
  cover §6.3). **→ STOP**; surface to operator; the K-2 sub-phase-cleanup
  pre-bank may need extension. Probe § 1 confirms NOT fired at this HEAD.
- **STOP-PROSE-MATH.** Stage 1b discovers that **another** §6.3 prose
  characterization is mathematically wrong (analogous to the "r=0 (peak
  K(0))" surface in this charter's § 1.2). **→ surface** as §0.3
  SHIFT-from-discovered (NOT a hard STOP); record in stage audit; NO
  plan edit unilateral.
- **STOP-TIER3-DIR.** Creating `tools/diagnostics/tier3/` for the first
  time silently breaks an existing pytest path or import. **→ STOP**;
  inspect tree first (`docs/phases/phase-3-plan.md:556-578` § 3.2.9 names
  the interface; Stage 1b probe verifies). [[bit-physics-uv-sync-prunes-venv]]
  bank reminds: don't trust `uv sync` alone.

## § 7 — Risk register

- **R-1 (published-audit append-only).** NEVER edit a published
  `docs/_audits/**` file. Append-only verified by `git diff --name-status`
  at Stage 2. A stage that must edit a published audit → STOP.
- **R-2 (Chakazul SHA drift).** The §2.18 pin (fetched
  2026-05-28T00:54Z) byte-equals the probe re-fetch (14h later,
  2026-05-28T14:38:32Z). A SHA drift between probe and Stage 1b would
  invalidate the vendoring; re-verify at Stage 1b vendoring commit
  (Convention #8).
- **R-3 (Quad4-anchor cross-check ungroundability).** If Chakazul's
  vendored tree at SHA `adfc54…` does NOT contain a numerical reference
  notebook for K(0.5), the anchor cross-check is hand-derivation-only
  (which IS legitimate per §2.4 — "from first principles" is an
  independent reference, since the kernel-shape derivation is
  mathematical and not circular against the in-repo implementation).
  Stage 1b judges; STOP-D-ANCHOR only if hand-derivation also fails.
- **R-4 (Taichi FFT silent non-determinism).** Taichi 1.7+ FFT module is
  not documented as bit-exact in `docs/architecture.md:962` Stack-D
  determinism notes. D-FFT lean is real-space; STOP-FFT if FFT probe
  surfaces silent non-determinism. R-FFT: probe FFT at a representative
  input and a perturbed input; both must be bit-equal to the real-space
  reference for the same seed.
- **R-5 (LFS/R2 friction at first SIM `.h5` push).** Per § 1.1, Lenia is
  the first Phase-3 SIM to push an `.h5` legacy-capture seed since the
  lfs-architecture sub-phase landed. STOP-LFS recipe at § 6; friction
  here is **portfolio-scale signal** — every later SIM hits the same
  path. Operator-pending if R2 credentials aren't propagated session-
  to-session (per [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]]).
- **R-6 (scope creep into Phase 4+).** §6.3 OUT OF SCOPE
  (`docs/phases/phase-3-plan.md:1310-1312`): Stack-B port, Particle /
  Flow / Diff Lenia variants, 3D Lenia, save-creature UX, polyring
  kernels — all Phase 4+. A stage tempted to implement → STOP.
- **R-7 (integrity cat1/cat4).** This charter + audits are docs
  (cat4 draft-time path:line); the probe report at
  `tools/testkit/probes/reports/lenia.md` (Stage 1a deliverable) is
  cat1.intra-repo (full repo-relative paths, see
  [[cat1-scans-probes-evidence-hashes-mapping]]). Front-matter shape:
  `evidence_hashes:` MAPPING, `evidence_paths:` LIST (do NOT conflate;
  do NOT use `: self`). Run `integrity --all` + `verify_evidence` before
  each commit.
- **R-8 (PBT example-DB committed).** Per §2.14 + §6.0 item 7, the
  Hypothesis `.hypothesis/` examples DB MUST be committed (NOT
  gitignored). A Stage-1b that gitignores it = anti-pattern; surface as
  Stage-1b SHIFTED but do not silently let it through.
- **R-9 (perf-ledger row baseline status).** Per §6.0 item 9, Lenia's
  row is `baseline` (first measurement). Later regression-runs (Phase 4+)
  compare against this row. The hw-id MUST be specific enough to be
  reproducible (CPU model + arch + Taichi version pinned via
  `uv.lock`).
- **R-10 (Convention M — plan amendment).** Any `phase-3-plan.md` spec
  amendment (beyond what has already landed during common-3dgs +
  render-similarity) is operator-approved + separate-commit only (never
  unilateral). The §6.3 surface drifts surfaced here (branch ceremony,
  "Sub-phase 3.1" framing, multi-claude handoff, "peak K(0)" math) are
  **NOT edited** in `phase-3-plan.md` — they are recorded in this
  charter + the plan-drafting audit as DESIGN-SHIFTED, mirroring the
  common-3dgs + render-similarity precedent.
- **R-11 (first-SIM friction surfacing).** Per § 1.1, friction in the
  Stage 1a/1b/1c discipline surfaces is to be **named loudly** in the
  stage audit even if it doesn't fire a hard STOP. Future SIM sub-phases
  inherit the resolution. A "papered-over" friction = portfolio-scale
  technical debt; an explicit friction = portfolio-scale learning.

## § 8 — Open questions / forward-routing

- **D-MUT-SCOPE re-confirm at next-SIM dispatch.** This charter ratifies
  NO mutation gate for SIMs on §6.0-item-12 + §6.3-VERIFICATION-POSTURE
  evidence. Subsequent SIM sub-phases (rigid-body, cloth, NCA, PINN,
  3DGS-MPM) inherit the resolution. NCA (task-6, D+B cross-stack
  equivalence) and 3DGS-MPM (task-8, neural-rendered) may need re-
  examination because they consume the testkit equivalence / render-
  similarity modules — but those modules' own mutation gates were
  exercised at common-3dgs / render-similarity Stage 1c; the SIM
  consumption does not extend the gate to the SIM. Charter records as
  forward-routed observation.
- **L-3DGS-1.** Not consumed here (Lenia is not neural-rendered). The
  bank stays for task-8 (3DGS-MPM) per render-similarity Stage 2
  precedent.
- **SIBLING-FIXTURE-LFS basket.** Lenia adds `phase-3-lenia.h5` to
  `tests/fixtures/legacy-captures/` (a 13th entry alongside the 12
  pre-existing v0.1.0-phase-1 placeholders + `phase-3-common-3dgs.h5`).
  Does NOT close the sibling sub-phase (`legacy-capture-fixture-lfs-
  reconciliation`); does increment the corpus by one. Charter records as
  carried-forward.
- **integrity-meta-test-ci-wiring.** Not relevant here — Lenia's
  testkit/property/sims/lenia/ + tests/ rides existing pytest-testpaths
  CI machinery; no integrity meta-test gap inherited.
- **D-B re-anchoring at next-SIM dispatch.** Per render-similarity
  charter § 8: "D-B (catalog stack-drift) re-anchored per-sim at each
  dispatch." This sub-phase did so (probe § 0 + D-B investigation audit).
  Next-SIM (rigid-body, task-4, Stack E) repeats the investigation under
  its own evidence. Charter sets the **precedent template** for future
  D-B investigations.
- **Subsequent Phase-3 sub-phases** (rigid-body, cloth, NCA,
  pinn-poisson, 3dgs-mpm, common-warp-maturation, landing) are
  re-framed under this same cadence at their own plan-drafting; this
  charter drafts only the third. The §4.1 sequence
  (`docs/phases/phase-3-plan.md:744-757`) is the default order;
  task-3a (Ising-classical, Stack B, quantum-adjacent) per v8 amendment
  (`docs/phases/phase-3-plan.md:64`) inserts between task-3 and task-4.
- **Any `phase-3-plan.md` spec amendment** is operator-approved +
  separate-commit only (never unilateral). The §6.3 surface drifts (§1.2
  table + "peak K(0)" math) are **NOT edited**; they are recorded
  here + in the plan-drafting audit as DESIGN-SHIFTED.
- **Operator-pushed tag** at Stage 2 = `v0.2.4-sub-phase-phase-3-lenia`
  (D-TAG lean YES, § 3). Agent does NOT push tags (I7); the I7 allowlist
  extension is the Stage 2 deliverable.
- **First-SIM friction inheritance.** Per § 1.1, every later Phase-3 SIM
  inherits this sub-phase's resolution of the testkit + golden + tier-3
  + CI + LFS/R2 + PBT + perf-ledger + spec-ref + per-sim CI-job +
  per-category tolerance/determinism row + 13-gate discipline surfaces.
  Surface friction loudly; future SIM sub-phases consult this charter's
  landing audit at their own plan-drafting.

## § 9 — Plan-drafting verdict

**Verdict: CONFIRMED.** Plan ready for Stage 0 dispatch with no operator-
pending external-state gates. CONFIRMED (not SHIFTED) because:

- The D-B fork is **dispositively resolved** (sibling investigation
  audit on FACT-citation, no STOP-DB).
- The Chakazul SHA is pinned at plan §2.18 + re-verified at probe (no
  drift; STOP-PIN not fired).
- The catalog drift is **read-as-tier-crosswalk**, NOT edited
  (Convention M).
- D-MUT-SCOPE + D-DET leans are **RESOLVED-IN-CHARTER on FACT**;
  D-FFT + D-TAG carry default leans + decision-by stages — the matured
  cadence's normal posture.

No HARD RULE 2 STOP fired against plan-drafting. STOP-D-ANCHOR /
STOP-DET / STOP-FFT / STOP-LFS / STOP-PIN / STOP-CAT-X / STOP-PBT /
STOP-I7 / STOP-K2-AT-HEAD / STOP-PROSE-MATH / STOP-TIER3-DIR / STOP-D /
STOP-H / STOP-REPLAY are filed as Stage-0 / 1a / 1b / 1c / 2 conditional
STOPs in § 6.

— Charter ends —

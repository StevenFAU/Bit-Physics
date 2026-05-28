---
date: 2026-05-28
author: phase-3 ising-classical plan-drafting (Claude Code)
sub_phase: sub-phase-phase-3-ising-classical
phase: phase-3
head_sha_at_draft: e12685dbbfdc5ae20d5e9137a3fd269670a59139
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
version: charter-v2 (2026-05-28T21-00-21Z charter-revision)
revisions:
  - v1 (2026-05-28T19-08-34Z) — second Phase-3 SIM + first Stack-B SIM in Phase 3; D-WEBGPU-DET bit-exact-same-stack-same-hw + D-WIDE-TOL within-budget + D-PBT two-invariants + D-ANCHOR closed-form + D-DET-REGISTRY first-lattice-spin + D-HARNESS-LAYOUT + D-CI + D-LAYOUT + D-TOL-SCHEMA + D-TAG YES leans seated.
  - v2 (2026-05-28T21-00-21Z) — operator surfaced D-HARNESS-LAYOUT as convention-level (vitest vs pytest-against-captures), not layout-level. Charter-revision investigation (`docs/_audits/phase-3/sub-phase-phase-3-ising-classical-harness-investigation-2026-05-28T21-00-21Z.md`) DECIDED on evidence: **pytest-against-captures per RD-2D Phase-0 precedent**; §6.3a M.4 "pnpm vitest" call recorded as §0.3 SHIFT-from-discovered drift (§3.2.7 prescription's `pnpm -F <sim-package> test` precondition unrealized at HEAD: no root `pnpm-workspace.yaml`; RD-2D has no `package.json`). D-HARNESS-LAYOUT RESOLVED-IN-CHARTER; STOP-HARNESS unreachable; D-CI re-routed to `python-strict.yml/test-ising-classical` (mirror lenia precedent). D-TAG FLIPPED to RESOLVED-IN-CHARTER **NO** per operator routing: per-sub-phase tagging discontinued, phase-close-only going forward; Stage 2 closing-sweep + landing audit stand without tag proposal or I7 allowlist extension. L-ISING-AUDIT-HYGIENE banked (2 session-1 ising audits used literal `at-head` in evidence_hashes; sealed, routed to separate audit-citation-hygiene cluster session).
posture: >
  Fourth Phase-3 sub-phase. **First Stack-B SIM in Phase 3** (after
  common-3dgs Stack-E infra `v0.2.2`, render-similarity Python testkit
  `v0.2.3`, lenia Stack-D Taichi sim `v0.2.4`). Per §6.3a CONTEXT
  BRIDGE + plan §6.3 ("first SIM's flow validates the … pipeline works
  end-to-end — friction here predicts friction in every later SIM"):
  **first-Stack-B-SIM friction here predicts friction in every later
  Stack-B SIM** (Phase-5 web-deploy lift of every Phase-3 sim;
  immediately, the Stack-B inference half of task-6 NCA). This charter
  inherits §6.3a (task-3a prompt) + §3.2.4 + §3.2.5 + §3.2.6 + §3.2.7 +
  §3.2.8 + §3.2.9 + §3.2.10 + §3.5 + §5.4 + §6.0 from
  `docs/phases/phase-3-plan.md` unchanged-by-citation and re-frames the
  v8 single-agent-sequential branch/PR machinery + the three §0.3
  SHIFT-from-discovered drifts (build-ts.yml does not exist;
  `lattice-spin/ising-classical/typescript/` is not the local
  packaging convention; D-HARNESS-LAYOUT is a real Stack-B-discovery
  decision). The Lenia-precedent SIM cadence is the execution shape;
  Lenia's five first-SIM frictions are inherited where they translate
  to Stack B. DRAFT ONLY — Stages execute under operator-ratified
  D-class routings. Every execution commit preserves invariants I1-I7,
  append-only audits, trunk-based commits to main, no agent-pushed
  tags (I7).
---

# Sub-phase: Phase-3 Ising-classical (task-3a) — CHARTER

> **This is a plan, not an execution.** Plan-drafting verdict
> **CONFIRMED** (subject to its own audit) — the probe + charter are
> sound and Stage 0 may dispatch. It does **NOT** mean
> `packages/ising-classical/` or any Stack-B test exists. Every concrete
> claim is tagged FACT / INFERENCE / WEB and cites full repo-relative
> `path:line`. Probe FACTs live in `docs/_audits/phase-3/sub-phase-
> phase-3-ising-classical-probe-2026-05-28T19-08-34Z.md`; this charter
> summarizes, re-frames, and routes. DELIVERABLES / OUT OF SCOPE /
> ANCHOR-PROBE / VERIFICATION POSTURE content is **inherited** from
> `docs/phases/phase-3-plan.md:1388-1543` (§6.3a) + §3.2.4
> (`:421-457`) + §3.2.5 (`:461-505`) + §3.2.6 (`:507-528`) + §3.2.7
> (`:530-538`) + §3.2.8 (`:539-555`) + §3.2.9 (`:556-578`) + §3.2.10
> (`:580-?`) + §5.4 (`:988-1007`) + §6.0 (`:1017-1069`); it is **NOT**
> re-authored here.

## § 1 — Scope and posture

**(FACT)** This sub-phase introduces **one SIM deliverable family**: a
reference **2D Ising-classical** implementation on **Stack B
(TypeScript / WebGPU)** via **Metropolis-Hastings Monte Carlo with
checkerboard sublattice update**. Scope owner: `docs/phases/phase-3-
plan.md:1388-1543` (§6.3a task-3a prompt). Plan v8-amendment
authority: `docs/phases/phase-3-plan.md:59` ("…Stack B (TypeScript /
WebGPU); writes capture `metropolis-128sq-T2.27-seed42-step10000` per
spec Appendix D § D.2.3"). Spec authority: `docs/architecture.md:1195`
(§ 5.10 Lattice spin systems) + `docs/architecture.md:2012` (§ 11.4
sub-item 3.7).

**Why it is fourth (FACT + INFERENCE).** Plan §1 task ordering
(`docs/phases/phase-3-plan.md:147-162`) names task-3a between task-3
(Lenia, `v0.2.4` LANDED) and task-4 (rigid-body, not started). Per
plan §4.1 rationale + §3.1 deliverable map: common-3dgs (task-1) and
render-similarity (task-2) are infra roots (LANDED); Lenia (task-3)
was easy-before-hard / single-stack-D first-SIM precedent; ising-
classical (task-3a) is the **closed-form-equivalent classical
reference** that sets the Stack-B precedent before harder tasks
(task-5 cloth Stack-C, task-6 NCA D+B, task-7 PINN, task-8 3DGS-MPM,
task-9 common-warp).

**(FACT)** **Ising-classical is the first Stack-B SIM in Phase 3** and
the **lightest-weight quantum-adjacent classical reference** — no
training, no upstream model checkpoint, no neural-rendering metric, no
external vendoring. Onsager's exact 2D solution makes golden-anchor
grounding genuinely low-risk (compared to LPIPS's BAPPS-fetch or
Inria's 3DGS non-permissive license).

### § 1.1 First-Stack-B-SIM-in-Phase-3 friction surfacing (CONTEXT-BRIDGE, load-bearing)

**(FACT + INFERENCE — load-bearing for every later Stack-B SIM and
Phase-5 web-deploy lift).** Per the dispatch prompt's CONTEXT-BRIDGE
clause + plan §6.3 CONTEXT-BRIDGE (`docs/phases/phase-3-plan.md:1295-
1302` re-applied here as first-Stack-B): friction here predicts
friction in every later Stack-B SIM. Ising exercises — **for the first
time end-to-end in Phase 3** — the following Stack-B-specific surfaces:

| Surface | First-Stack-B exercise | Friction predicts |
|---|---|---|
| `packages/ising-classical/` (Stack-B sim package; D-LAYOUT) — RD-2D Stack-B precedent at `packages/reaction-diffusion-2d/` is Phase-0 (Stack-B impl inside a Python pyproject layout with no `package.json`); lenia precedent at `packages/lenia/` is Stack-D | first Phase-3 Stack-B sim package | Stack-B half of task-6 NCA; Phase-5 web-deploy lift of every Phase-3 sim |
| **vitest discovery scope** (`common/common-ts/vitest.config.ts:11` includes only `src/**/*.test.ts` + `examples/**/*.test.ts` under `common/common-ts/`). **Charter-v2 update:** D-HARNESS-LAYOUT resolved — ising follows RD-2D pytest-against-captures precedent, so this surface is observed but NOT consumed (no `*.test.ts` files under `packages/ising-classical/`). | first Phase-3 Stack-B sim test suite (RD-2D tests via pytest against captured fixtures; no `*.test.ts` files anywhere under `packages/`) | Stack-B half of task-6 NCA; every Phase-5 sim that lifts to Stack-B |
| `python-strict.yml` `test-ising-classical` job per harness DECISION + lenia precedent (charter-v2 routes here, NOT `ts-strict.yml`; §6.3a M.4's `build-ts.yml` literal records as §0.3 SHIFT-from-discovered) | first lattice-spin per-sim CI job | every later lattice-spin SIM CI job |
| **Stack-B determinism harness** `runTwiceAndDiff` from `common/common-ts/src/determinism/index.ts:1-10` — counterpart of lenia's `np.array_equal` Stage-1b two-run check | first SIM use of `runTwiceAndDiff` in Phase 3 (`hello-physics` example exercises the harness on the common-ts side) | every later Stack-B SIM determinism MEASURE |
| **WebGPU PCG per-cell PRNG state** — sim ships its own; checkerboard sublattice update has no atomics, no subgroup ops (`packages/reaction-diffusion-2d/src/gray_scott.wgsl:8-9` confirms the bit-exact-same-hw posture for Stack-B) | first SIM PRNG in WGSL | every later Stack-B SIM needs deterministic PRNG |
| `tools/testkit/golden/tables/ising-{critical-temperature, magnetization-curve}.json` (≥3 independent-reference anchors per §2.4) | first lattice-spin golden table in Phase 3 (lenia has continuous-ca) | every later Stack-B SIM ships golden tables (NCA inference, web-deploy validation) |
| `tools/diagnostics/tier3/ising-classical/` (Tier-3 module tree under the `tier3/` subtree) | second `tools/diagnostics/tier3/` entry after `tier3/lenia/` (subtree EXISTS at HEAD); first **Stack-B-feeding** Tier-3 (consumes `.h5` captures written by the Stack-B WGSL impl) | every later Stack-B SIM Tier-3 |
| `tools/testkit/property/sims/ising-classical/` (PBT ≥2 invariants per §2.14: `magnetization_bounded` + `energy_per_spin_bounded`) | first lattice-spin PBT module | every later Stack-B SIM ships per-sim PBT |
| `tools/testkit/failing-tests-evidence/ising-classical-<UTC>.txt` + sha256-in-commit-footer (TDD output capture per §6.0 item 6 + spec § 1.3 step 4) | first Stack-B SIM TDD output capture (lenia precedent at `Failing-tests-output-hash` for Stack-D pytest; render-similarity precedent for Python testkit) | every later Stack-B SIM TDD footer |
| `tests/fixtures/legacy-captures/phase-3-ising-classical.h5` + sidecar `.json` (schema-corpus seed per §6.0 item 10) + **LFS push + R2 mirror** | first Stack-B SIM `.h5` push (lenia's `phase-3-lenia.h5` was the previous SIM `.h5`; common-3dgs's was infra) | every later Stack-B SIM `.h5` push — STOP-LFS friction is portfolio-scale |
| `docs/perf-ledger.md` row append (`ising-classical \| typescript (WebGPU) \| metropolis-128sq-T2.27-seed42-step10000 \| <wall-clock> \| <hw-id> \| <commit-sha> \| <date> \| baseline` per §6.0 item 9) | first Stack-B SIM perf-row in Phase 3 | every later Stack-B SIM perf-row |
| `tools/testkit/equivalence/tolerance.toml` (`[overrides.ising-classical]`) — **first `lattice-spin` per-sim row** + sim-specific named tolerances (`critical_temp_rel=1e-3`, `magnetization_rel=5e-2`) that **do NOT fit** the existing `relative`+`absolute` override schema — repeats lenia's tolerance-schema-fix shape | first MC-statistical-tolerance row in Phase 3 | every later Stack-B SIM with MC-statistical observables (NCA inference, web-deploy validation) |
| `tools/testkit/determinism/registry.toml` (`[lattice-spin.ising-classical]`) | **first `lattice-spin.*` row** (only `[neural-rendered.common-3dgs]` + `[continuous-ca.lenia]` present at HEAD) | every later lattice-spin row |
| `docs/glossary.md` entries (Ising, Metropolis-Hastings, detailed balance, critical temperature, Onsager solution, Kramers-Wannier duality, parallel-Metropolis checkerboard) | first Phase-3 statistical-physics glossary block | every later quantum-adjacent / statistical-physics SIM (Phase-6 ising-dwave) |
| **R2 customtransfer + standalonetransferagent path** in agent env (§Q bootstrap) | first Stack-B `.h5` LFS push — same recipe as lenia (`git -c lfs.standalonetransferagent= push` + separate `git lfs push --object-id --stdin origin`) | every later Stack-B SIM LFS push |

**(STOP-load-bearing flag.)** Per § 6 below, any friction surfacing in
Stage 1a/1b/1c that is **specific to the Stack-B per-sim discipline**
(not the Ising algorithm itself) is to be **named loudly in the stage
audit + the landing audit**, even if it doesn't fire a hard STOP.
Future Stack-B sub-phases inherit the resolution.

### § 1.2 Inheritance and re-frames

| Layer | Authority | Note |
|---|---|---|
| § 6.3a task-3a prompt (DELIVERABLES A–O + OUT OF SCOPE + ANCHOR-PROBE + VERIFICATION POSTURE) | `docs/phases/phase-3-plan.md:1388-1543` | inherited unchanged-by-citation; charter does NOT re-author |
| § 6.0 sim-task discipline items 1-12 | `docs/phases/phase-3-plan.md:1017-1069` | inherited unchanged; cross-phase replay is the matured per-sub-phase cadence (mirrors lenia / render-similarity / common-3dgs Stage-0 precedent) |
| § 3.2.4 tolerance row + § 3.2.5 determinism row | `docs/phases/phase-3-plan.md:421-505` | **NOT pre-baked for ising-classical** (the §3.2.4 / §3.2.5 example blocks enumerate lenia / NCA / rigid-body / cloth / 3DGS-MPM / PINN, NOT ising — `:421-457` + `:461-505`). §6.3a M (`:1517-1523`) calls for the rows added directly at Stage 1b under the schema. **D-TOL-SCHEMA** scopes the schema-fit question. |
| § 3.2.6 CLI conventions + § 3.2.7 fixtures + § 3.2.8 spec-sheet + § 3.2.9 tier-3 + § 3.2.10 CI workflow shape + § 5.4 13-gate | `docs/phases/phase-3-plan.md:507-528` + `:530-538` + `:539-555` + `:556-578` + `:580+` + `:988-1007` | inherited unchanged |
| § 6.3a ANCHOR-PROBE step "BASE BRANCH: phase-3-integration" / "YOUR BRANCH: phase-3/task-3a-ising-classical" / `gh pr create` (if present per task-3 precedent) | `docs/phases/phase-3-plan.md:1393-1396` + `:46` | **v8 trunk-based amendment supersedes** — commit directly to `main`, no PR, no merge step. Surface-only re-frame per Convention M. |
| § 6.3a ANCHOR-PROBE 5 "File probe at `tools/testkit/probes/reports/ising-classical.md`" | `docs/phases/phase-3-plan.md:1445` | Stage 1a writes the impl-probe at the canonical location; this plan-drafting probe lives in `docs/_audits/phase-3/` and is the plan-time predecessor (lenia precedent). |
| § 6.3a M.4 `.github/workflows/build-ts.yml (test-ising-classical job)` | `docs/phases/phase-3-plan.md:1516` | **§0.3 SHIFT-from-discovered (surface)** charter-v1: `build-ts.yml` absent. **v2 RE-FRAME:** the right workflow for ising tests is `python-strict.yml` (pytest-against-captures per harness DECISION); `build-ts.yml` would have been the wrong CI surface even if it existed (sim tests don't belong in a TypeScript-strict gate). **D-CI** routes the `test-ising-classical` job into `python-strict.yml` per lenia precedent. NO plan edit unilateral. |
| § 6.3a B-D literal "lattice-spin/ising-classical/typescript/" | `docs/phases/phase-3-plan.md:1423` + `:1456` + `:1466` | **§0.3 SHIFT-from-discovered (layout)**: lenia hit the same shape (plan §6.3 "continuous-ca/lenia/python/"); D-LAYOUT-resolved-on-evidence to `packages/lenia/` per existing-convention precedence ([[phase-3-lenia-sub-phase-landed]]). **D-LAYOUT** routes the same way for ising; lean `packages/ising-classical/`. NO plan edit unilateral. |
| § 6.3a C `pnpm vitest run lattice-spin/ising-classical/typescript/tests/` | `docs/phases/phase-3-plan.md:1458` | **§0.3 SHIFT-from-discovered (convention) — charter-v2:** RD-2D (only Stack-B sim at HEAD) ships zero `*.test.ts` under `packages/`; its tests are pytest in `packages/reaction-diffusion-2d/tests/test_*.py` (capture-round-trip vs NumPy reference per `packages/reaction-diffusion-2d/tests/test_code_verification.py:1-5` + `packages/reaction-diffusion-2d/tests/test_determinism.py:1-7`). §6.3a's vitest call inherits plan §3.2.7's per-stack prescription whose `pnpm -F <sim-package> test` precondition is **unrealized at HEAD** (no root `pnpm-workspace.yaml`; RD-2D has no `package.json`). Ising follows RD-2D pytest-against-captures precedent per spec §7.8. D-HARNESS-LAYOUT RESOLVED-IN-CHARTER; NO plan edit unilateral. |
| § 6.3a M.5 `tools/testkit/equivalence/tolerance.toml (lattice-spin.ising row: critical_temp_rel=1e-3 ..., magnetization_rel=5e-2 ...)` | `docs/phases/phase-3-plan.md:1517-1521` | **§S schema-fit live**: the named keys `critical_temp_rel` + `magnetization_rel` are sim-specific, NOT the generic `relative`+`absolute` override pair. Lenia's prior schema-fix banked `golden_tolerance` as a new branch — **D-TOL-SCHEMA** routes whether ising's MC observables get their own branch or live as additive keys under `overrides.ising-classical`. |

## § 2 — Stage cadence

This charter ratifies the matured per-sub-phase cadence as the execution
shape, modeled on the **Phase-0 RD-2D Stack-B exemplar** + the
**Phase-3 lenia precedent** (the closed-with-shifted-2 sim cadence). Sim
stage shape differs from infra by **NO mutation gate at Stage 1c**
(§6.0 item 12 testkit-adjacent-only; §6.3a VERIFICATION POSTURE
`docs/phases/phase-3-plan.md:1537-1543` cites GOLDEN + PBT +
DETERMINISM, no mutation; lenia precedent confirmed).

### Stage 0 — Pre-flight + integrity baseline + verify_evidence sweep + cross-phase replay + §Q R2 bootstrap

| Surface | Operation |
|---|---|
| **§Q LFS bootstrap (first post-anchor action)** | `source tools/lfs/setup-lfs-s3-local.sh` per [[phase-3-r2-credentials-durability-fix-landed]] §Q — the **first** action after anchor probe at Stage 0; **STOP-LFS-PUSH** at anchor time, not Stage-1b push time |
| Anchor probe at HEAD | `git rev-parse HEAD` == `git rev-parse origin/main`; seven phase tags resolve (`v0.0.0-phase-0`, `v0.1.0-phase-1`, `v0.2.0-phase-2`, `v0.2.1-sub-phase-lfs-architecture`, `v0.2.2-sub-phase-phase-3-common-3dgs`, `v0.2.3-sub-phase-phase-3-render-similarity`, `v0.2.4-sub-phase-phase-3-lenia`); integrity Cat 1-5 byte-identical digest re-measured per §R (probe digest `688bc195…d22cb52` is the live anchor; **do not copy — re-measure**); I1-I7 hold |
| §S.5 all-workflow main-green at HEAD | `gh run list --commit "$(git rev-parse HEAD)" --limit 30` shows 0 failing required checks across **all** push-triggered workflows; STOP-MAIN-RED if any required workflow is red |
| verify_evidence sweep | 0-fail across all prior Phase-3 audits **excluding** the documented pre-existing 1-fail in `lenia-mypy-strict-fix-2026-05-28T18-39-42Z.md` (probe §6.3 — workflow `.github/workflows/python-strict.yml` `evidence_hashes` entry pre-dates commit `228cccd`). Stage 0 audit surfaces this as **pre-existing-at-session-start**, NOT a regression; STOP-H is regression-only |
| Cross-phase replay (per matured per-sub-phase cadence) | `uv run python -m integrity.scripts.replay_prior_phase --prior-phase phase-2 --audit docs/_audits/phase-2/landing-2026-05-27T<…>.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget` → `ok=True` 8/8; STOP-REPLAY if discrepancy; LFS-cache recovery via [[replay-needs-lfs-cache-recovery]] applies BEFORE declaring blocked |
| Tolerance-budget Phase-3 carryover | Verified-only (opened at common-3dgs Stage 0; re-verified by render-similarity + lenia Stage 0). **First `lattice-spin` per-sim row** lands AT STAGE 1b. Stage 0 confirms no `[budgets.lattice-spin.*]` exists yet; if `tolerance-budget.toml` amendment is needed for the MC tolerances, **separate operator-approved commit** at Stage 1b per § 6.0 item 2 — D-WIDE-TOL routes |
| `pnpm install --frozen-lockfile` (in `common/common-ts/`) | clean per `.github/workflows/ts-strict.yml` install step; verifies the Stack-B harness is reachable from this clone |
| `uv sync --all-packages` | clean (per [[bit-physics-uv-sync-prunes-venv]]) — Tier-3 + PBT + reference-impl tests use the Python pytest path |
| Stage-0 audit + progress.md entry + SHA back-fill | per Convention #12 separate commit |

**Out-of-stage in Stage 0:** scaffolding, RED tests, WebGPU impl,
golden values, Tier-3, PBT, schema-corpus seed, perf-ledger row, CI
workflow row, intermediate tag.

### Stage 1a — Scaffold + RED + failing-tests-hash + DOI re-verify + anchor probe

| Surface | Operation |
|---|---|
| Probe report | `tools/testkit/probes/reports/ising-classical.md` per `tools/testkit/probes/template.md` — enumerate `common/common-ts/` API surfaces consumed (`createContext`, `ComputePipeline`, `makeBindGroup{,Layout}`, `CaptureWriter`, `manifestPathFor`, `runTwiceAndDiff`); WebGPU determinism declaration (no atomics; no subgroup ops; PCG per-cell state); DOI-resolution re-verify at Stage-1a fetch time (Onsager + Yang + Kramers-Wannier; STOP-DOI if any 404) |
| Spec-ref stub | `docs/sim-specs/lattice-spin/ising-classical/spec-ref.md` — 12-section template per `docs/phases/phase-3-plan.md:539-555` § 3.2.8; § 6 declares ≥ 2 PBT invariants (`magnetization_bounded`: `\|m\| ≤ 1` + `energy_per_spin_bounded`: `E/N ∈ [-2, 2]` per § 6.3a A + I); rest may be stub-filled with `TODO(Stage-1b)` markers |
| D-LAYOUT decision | **packages/ising-classical/** (lean: existing-convention precedence per [[phase-3-lenia-sub-phase-landed]] D-LAYOUT) — Stage 1a creates the directory skeleton at the resolved location |
| Test harness | **pytest-against-captures per RD-2D Phase-0 precedent — RESOLVED-IN-CHARTER-v2** (`docs/_audits/phase-3/sub-phase-phase-3-ising-classical-harness-investigation-2026-05-28T21-00-21Z.md`). Tests live at `packages/ising-classical/tests/test_*.py` (pytest convention with `conftest.py` + `__init__.py`); each test reads the canonical capture via `load_capture` (mirror `packages/reaction-diffusion-2d/tests/test_code_verification.py:32-50`) and asserts against a NumPy reference Metropolis sim, golden tables, and Hypothesis PBT. **NO `*.test.ts` files under `packages/ising-classical/`.** vitest stays out-of-scope for sim testing in this project (library-only at `common/common-ts/`). |
| Failing TDD tests | `uv run pytest packages/ising-classical/tests/ -v 2>&1 \| tee tools/testkit/failing-tests-evidence/ising-classical-<UTC>.txt`; failure mode MUST be `ModuleNotFoundError` / `NotImplementedError` (NOT pytest collection error / fixture-import error); `sha256sum` the evidence file; commit footer carries `Failing-tests-output: …` + `Failing-tests-output-hash: sha256:…` per § 6.0 item 6 + spec § 1.3 step 4. Recipe per lenia Stage 1a (sha256 byte-reproducible — pytest output through standard normalization mirror) |
| §0.3 SHIFT-from-discovered carry | Stage-1a audit re-confirms D-LAYOUT (`packages/ising-classical/` vs §6.3a literal) + D-CI (`python-strict.yml` `test-ising-classical` job per harness DECISION + lenia precedent, NOT `build-ts.yml` or `ts-strict.yml`). D-HARNESS-LAYOUT no longer carried — RESOLVED at charter-v2. Surface for charter §1.2 update at Stage 1b if any reverse-on-evidence |
| Stage-1a audit + progress entry + SHA back-fill | per Convention #12 |

**RED state expected:** every test in the resolved test-suite location
raises `Cannot find module '@bit-physics/ising-classical'`-class error
OR `not implemented` from stub shells. SHA-stable failing-tests output
captured.

### Stage 1b — Implementation + golden values + Tier-3 + PBT + shared files + CI + legacy-capture seed + perf-row + 13-gate

| Surface | Operation |
|---|---|
| WebGPU impl (local-only per spec §7.8) | `packages/ising-classical/src/index.ts` + `packages/ising-classical/src/metropolis.wgsl` — parallel-Metropolis WGSL kernel with **checkerboard sublattice** update (standard parallel-Metropolis preserving detailed balance per Glauber dynamics); 128×128 grid default; periodic boundary conditions; configurable T / J / h via `Params` uniform; **PCG per-cell PRNG state** (no atomics; no subgroup ops); capture I/O via `CaptureWriter` (`common/common-ts/src/capture.ts`); produces the canonical capture at `captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.{h5,json}` (RD-2D pattern at `packages/reaction-diffusion-2d/src/index.ts:6-8` — "Phase 0 CI excludes WebGPU-device-requiring tests per spec section 7.8"); commit footer carries `Implements-failing-tests-from: <Stage-1a-commit-sha>` + `Failing-tests-output-hash-witnessed: sha256:<same-hex>` |
| NumPy reference impl (CI oracle) | `packages/ising-classical/ising_classical/reference/` — Python/NumPy reference Metropolis sim for golden-value generation + Tier-3 cross-stack equivalence + pytest oracle. Mirror RD-2D's `packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/`. **This is the CI-visible oracle** (the WGSL impl runs locally only); pytest in `packages/ising-classical/tests/` reads the canonical capture + runs the NumPy reference + asserts via `diff_captures` (mirror `packages/reaction-diffusion-2d/tests/test_code_verification.py:32-50`) |
| pytest test suite | `packages/ising-classical/tests/` — pytest convention with `conftest.py` + `__init__.py` + `test_code_verification.py` (capture-round-trip vs NumPy reference) + `test_determinism.py` (run_twice_and_diff on NumPy reference per RD-2D `packages/reaction-diffusion-2d/tests/test_determinism.py:5-7`) + `test_pbt_invariants.py` (Hypothesis PBT) + `test_diagnostics.py` (Tier 1/2/3) + `test_reference_sanity.py`. **NO `*.test.ts` files anywhere under `packages/ising-classical/`** (D-HARNESS-LAYOUT RESOLVED-v2 per harness investigation) |
| Spec-ref full | `docs/sim-specs/lattice-spin/ising-classical/spec-ref.md` — § 6 declares ≥2 PBT invariants per §2.14 |
| Golden tables (≥3 independent-reference anchors per §2.4) | `tools/testkit/golden/tables/ising-critical-temperature.json` (Onsager exact `T_c = 2/ln(1+√2) ≈ 2.269185`); `tools/testkit/golden/tables/ising-magnetization-curve.json` (Yang exact `m(T) = (1 − sinh⁻⁴(2β))^(1/8)` tabulated at T ∈ {0.5, 1.0, 1.5, 2.0, 2.2, 2.25}). Each anchor carries `independent_reference` JSON field with source + DOI (Crossref-verified, see probe §3) + page. Three anchors per table per § 4 below. STOP-D-ANCHOR if any anchor cannot be grounded without large fetch or fabrication. |
| Golden derivations | `tools/testkit/golden/derivations/ising-onsager.md` — hand-derivation of Kramers-Wannier duality `sinh(2β_c) = 1` + Onsager closed-form + Yang closed-form citations |
| Tier-3 diagnostic module | `tools/diagnostics/tier3/ising-classical/__init__.py` per §3.2.9 (RD-2D-stack-d-style `diagnose()` entry consuming a Layer-0 `.h5` capture) — magnetization tracking per step + energy per spin + autocorrelation diagnostic (document critical slowing-down; do not gate per §6.3a H) |
| PBT | `tools/testkit/property/sims/ising-classical/` — ≥2 invariants per §2.14 + §6.0 item 7 (`magnetization_bounded` + `energy_per_spin_bounded`); Hypothesis examples DB at `.hypothesis/` committed (NOT gitignored) |
| Tolerance + determinism rows | `tools/testkit/equivalence/tolerance.toml` add `[overrides.ising-classical]` with `category = "lattice-spin"` + `critical_temp_rel = 1e-3` + `magnetization_rel = 5e-2` (per §6.3a M.5); add `[defaults.lattice-spin]` block if needed by the schema validator (D-TOL-SCHEMA decides whether the named tolerances need a new `[overrides.ising-classical.<branch>]` shape per the §S precedent); `tools/testkit/determinism/registry.toml` add `[lattice-spin.ising-classical]` (Stack B, bit-exact, same-stack-same-hw, atomic_ops=none, subgroup_ops=none, seed_pinned=true) |
| D-DET MEASURE | **Two-layer determinism oracle per RD-2D precedent.** **Layer 1 (CI-visible, load-bearing oracle):** `run_twice_and_diff(sim_runner=reference.sim_runner_seeded, seed=42, tmp_dir)` on the NumPy reference (mirror `packages/reaction-diffusion-2d/tests/test_determinism.py:24-28`) — `np.array_equal` on the two captures' state arrays + identical sha256s; pytest-asserted in `packages/ising-classical/tests/test_determinism.py`. **Layer 2 (local-only per spec §7.8):** WGSL kernel run twice locally with pinned seed=42 / T=2.27 / steps=10000 / 128² grid → assert byte-identical capture payloads; recorded in the Stage-1b audit but NOT in CI (D-DET-RUNTIME unchanged from charter-v1 — spec §7.8 documents CI no-GPU; RD-2D landed Phase 0 with this same split). **STOP-DET if Layer 1 (NumPy reference) is NOT bit-exact** — surface and re-characterize as `distributional` + EFECT bound (Hard-Rule-2; precedent smoke-stack-e gate-14). |
| Tolerance-budget compliance (Cat-X) | If `critical_temp_rel=1e-3` or `magnetization_rel=5e-2` exceeds an existing `[budgets.lattice-spin.<axis>]` cap → STOP-CAT-X; surface separate `chore(tolerance-budget): amend …` commit per § 6.0 item 2; do NOT widen unilaterally. **L-LTSF-3 in-scope.** Lean: budget block doesn't exist; per-named-axis tolerance lives off-budget per lenia precedent — no amendment needed. Verify at Stage 1b |
| Perf-ledger row | `docs/perf-ledger.md` append `\| ising-classical \| typescript (WebGPU) \| metropolis-128sq-T2.27-seed42-step10000 \| <wall-clock> \| <hw-id> \| <commit-sha> \| <date> \| baseline \|` per §6.0 item 9 |
| Schema-corpus seed | `tests/fixtures/legacy-captures/phase-3-ising-classical.h5` + sidecar `phase-3-ising-classical.json` per §6.0 item 10. **LFS pointer + R2 mirror** — see § 1.1 friction surfacing; **STOP-LFS** if R2-push fails (do NOT revert per [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]] precedent + [[phase-3-lenia-sub-phase-landed]] STOP-LFS resolution). LFS-push recipe: `git -c lfs.standalonetransferagent= push` + separate `git lfs push --object-id --stdin origin`. §Q bootstrap from Stage 0 expected to make this succeed first try per [[phase-3-r2-credentials-durability-fix-landed]] |
| Cat 1, 2 gates green + Cat-X tolerance-budget compliance | per §6.3a L + §6.0 item 2 |
| Shared files | `README.md` (root + `packages/ising-classical/README.md`); `CHANGELOG.md`; `docs/glossary.md` (Ising, Metropolis-Hastings, detailed balance, critical temperature, Onsager solution, Kramers-Wannier duality, parallel-Metropolis checkerboard); `justfile` (`run-ising-classical`, `test-ising-classical`); CI workflow — **extend `.github/workflows/python-strict.yml` with a `test-ising-classical` job per harness DECISION + lenia precedent** (`python-strict.yml/test-lenia`). `ts-strict.yml` stays out-of-scope (common-ts library only); §6.3a M.4's "build-ts.yml" remains §0.3 SHIFT-from-discovered (would have been the wrong CI surface even if it existed). |
| Thirteen-gate verdict | per §5.4 / spec §3.5 v2.4 — 1 spec-sheet, 2 probe-report, 3 failing-tests, 4 implementation, 5 tests-pass-anchors, 6 Tier-1/2/3, 7 capture-I/O, 8 perf-bench, 9 Cat-1-5+Cat-X, 10 audit-report, 11 PBT, 12 first-landing-wall-clock-in-perf-ledger, 13 failing-tests-replay-verifiable. **All 13 PASS for sim acceptance.** |
| §S.5 all-workflow post-push poll | within ~2 min of pushing the chain, `gh run list --commit "$(git rev-parse HEAD)" --limit 30` shows 0 failing required across all push-triggered workflows; STOP-S5-CI-RED otherwise. The new `python-strict/test-ising-classical` job is among the required surfaces. |
| Stage-1b audit + progress entry + SHA back-fill | per Convention #12 |

### Stage 1c — Verdict landing (NO mutation gate)

| Surface | Operation |
|---|---|
| Golden-anchor verification | All ≥3 anchors per table assert at expected values within tolerance (Onsager `T_c = 2/ln(1+√2)`; Yang `m(T)` at 6 temperatures below `T_c`; Kramers-Wannier duality `sinh(2β_c) = 1` cross-check) |
| PBT-green | `magnetization_bounded` + `energy_per_spin_bounded` invariants pass at the spec § 2.14 example budget; Hypothesis DB committed |
| Determinism MEASURED at Stage 1b | re-verified at Stage 1c (run twice via `runTwiceAndDiff`, diff zero) |
| Legacy-capture seed verified | `phase-3-ising-classical.h5` present, LFS-pointer present, R2 mirror present (or STOP-LFS escalated) |
| Perf-ledger row anchored | the row landed at Stage 1b is byte-stable |
| 13-gate verdict re-confirmed | 13/13 PASS (or per-gate verdict-state per outcome) |
| **NO mutation gate** | per § 6.0 item 12 testkit-adjacent-only scope. The sim is verified by golden + PBT + determinism. **D-MUT-SCOPE RESOLVED-IN-CHARTER (NO).** |
| §S.5 all-workflow post-push poll | per Stage 1b |
| Stage-1c audit + progress entry + SHA back-fill | per Convention #12 |

### Stage 2 — Sub-phase landing audit + closing sweep (NO tag, NO I7 allowlist extension — D-TAG flipped NO in charter-v2)

| Surface | Operation |
|---|---|
| Landing audit | `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-landing-<UTC>.md` consolidating plan-drafting + harness-investigation + probe + Stage-0/1a/1b/1c via `evidence_hashes:` mapping (does NOT re-narrate). Verdict per §2.15 graded variants (closed-green / closed-with-shifted-N / closed-with-blockers-N) |
| ~~I7 allowlist extension~~ | **REMOVED in charter-v2.** Per operator routing this session: per-sub-phase tagging discontinued going forward; no tag at this landing, so no allowlist entry to add. `test_i7_no_agent_tags.py` is not edited. I7 guard mechanism UNCHANGED at HEAD. |
| Closing sweep | Cat-X tolerance-budget; integrity baseline byte-identical (`688bc195…d22cb52` or its measured-at-landing successor per §R); append-only 0 M/D vs `v0.2.0-phase-2` (sanctioned M against the in-Phase-3 progress.md is allowed per common-3dgs + lenia precedent); failing-tests replay MATCH; perf-ledger present; closing anchor re-check Convention 7.9. **Pytest GREEN** is the load-bearing assertion (vitest is library-only at `common/common-ts/`; ising adds no `*.test.ts` files so no new vitest surface to assert green). |
| ~~Tag proposal~~ | **REMOVED in charter-v2.** D-TAG flipped to RESOLVED-IN-CHARTER **NO** per operator routing: per-sub-phase tagging discontinued; phase-close-only going forward. Stage 2 closes without proposing `v0.2.5-sub-phase-phase-3-ising-classical`. The phase-close tag is operator work at Phase 3 close (`v0.3.0-phase-3` or equivalent), not this sub-phase's deliverable. |
| §S.5 all-workflow post-push poll | per Stage 1b/1c. The closing chain's post-push poll is the same surface — all required workflows green at chain-tip. |
| Banks carried forward | L-3DGS-1 (consumed at render-similarity Stage 1c — not relevant here; Ising is not neural-rendered). SIBLING-FIXTURE-LFS (carried forward; Ising's `.h5` push exercises the same LFS/R2 pipeline; if successful, increments the corpus by one — does NOT close the sibling sub-phase). integrity-meta-test-ci-wiring (carried forward; Ising's pytest tests at `packages/ising-classical/tests/` ride the existing pytest-testpaths machinery — does NOT inherit the gap). L-LMSF-3 (locale.getdefaultlocale CLI -W friction — Ising IS in scope per harness DECISION, because the new `python-strict/test-ising-classical` job runs pytest just like `test-lenia` did. Lenia's `-W error` fix at commit `228cccd` (dropping CLI -W in favor of pyproject filterwarnings) is the precedent; ising's pyproject inherits the same posture). **L-ISING-AUDIT-HYGIENE** (banked at charter-v2 — 2 session-1 ising audits used literal `at-head` in evidence_hashes; sealed, routed to separate audit-citation-hygiene cluster session). |
| Stage-2 audit + progress entry + SHA back-fill | per Convention #12 |

## § 3 — D-TAG decision (intermediate tag at Stage 2) — RESOLVED NO in charter-v2

**Charter-v1 lean was YES** (§D.2 (b) durable sim architecture; precedents
`v0.2.2` / `v0.2.3` / `v0.2.4`). **Charter-v2 flips to RESOLVED-IN-CHARTER
NO** per operator routing this session:

> Per-sub-phase tagging is discontinued going forward. Phase-3 closes with
> ONE tag at the operator's phase-close pass (`v0.3.0-phase-3` or
> equivalent), not per-sub-phase. Each remaining Phase-3 sub-phase
> (ising, rigid-body, cloth, NCA, PINN, 3DGS-MPM, common-warp-maturation)
> closes its Stage 2 without proposing an intermediate tag and without
> editing `tools/testkit/lfs_migration/test_i7_no_agent_tags.py`.

**Material consequences for ising-classical Stage 2:**

- **No tag proposal.** `v0.2.5-sub-phase-phase-3-ising-classical` is **NOT**
  proposed at landing. The "Tag proposal" row in §2 Stage 2 is removed
  (replaced with the explanation above).
- **No I7 allowlist extension.** `OPERATOR_NONPHASE_TAGS` in
  `tools/testkit/lfs_migration/test_i7_no_agent_tags.py` is **NOT** edited.
  The I7 guard mechanism stays unchanged at HEAD; fake `agent/v…` tags
  remain rejected.
- **Closing sweep + landing audit stand.** Stage 2 still produces
  `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-landing-<UTC>.md`
  consolidating all stage audits; integrity baseline / append-only /
  failing-tests-replay / perf-ledger checks still fire; §S.5 post-push
  poll still fires.
- **STOP-I7 collapses (no remaining surface).** Without an allowlist
  extension there is no additive-only mutation to guard against. STOP-I7
  is dropped from §6.
- **The phase-close tag is operator work** at Phase 3 close, not this
  sub-phase's deliverable. Convention-level: agent NEVER tags (I7
  unchanged).

**(b) Durable sim architecture is still STRONG** — first Stack-B SIM in
Phase 3, first `packages/ising-classical/`, first `tools/diagnostics/
tier3/ising-classical/`, first `lattice-spin/ising-classical/` spec-sheet,
first per-sim Stack-B PBT module, first per-sim `python-strict/
test-ising-classical` CI job per harness DECISION, first `[lattice-spin.*]`
determinism-registry row, first `[overrides.ising-classical]` tolerance
row. **(a) External vendoring NONE.** Both observations stand; the
tagging policy is what changed, not the architecture.

**Decision:** **RESOLVED-IN-CHARTER NO** (operator-routed this session).

## § 4 — Anchor-grounding STOP-conditions (Convention #8)

Stage 1b grep-cites the following against the DOI-verified primary
sources + textbook references. Each is a STOP-D-ANCHOR if not
grep-citable:

| Anchor | Citation target | STOP condition |
|---|---|---|
| Critical temperature exact `T_c = 2/ln(1+√2) ≈ 2.269185` (Onsager) | Phys. Rev. **65** 117, §V (DOI `10.1103/PhysRev.65.117`, Crossref-verified probe §3) | DOI fails to resolve at Stage-1b re-verify → STOP-DOI; closed-form not derivable from Kramers-Wannier duality → STOP-D-ANCHOR |
| Magnetization closed-form `m(T) = (1 − sinh⁻⁴(2β))^(1/8)` for T < T_c (Yang) | Phys. Rev. **85** 808 Eq. (96) (DOI `10.1103/PhysRev.85.808`, Crossref-verified) | DOI fails at Stage-1b → STOP-DOI; closed-form not assertable against the 6 temperatures {0.5, 1.0, 1.5, 2.0, 2.2, 2.25} below T_c → STOP-D-ANCHOR |
| Kramers-Wannier duality `sinh(2β_c) = 1` ⇒ T_c | Phys. Rev. **60** 252, §3 (DOI `10.1103/PhysRev.60.252`, Crossref-verified) + hand-derivation in `tools/testkit/golden/derivations/ising-onsager.md` | DOI fails → STOP-DOI; hand-derivation not reproducible → STOP-D-ANCHOR |
| Anchor 2 of T_c table — Landau & Binder 2014 Table 5.1 (T_c/J = 2.26919…) | textbook, edition-cited; no fetch needed | Cite-by-edition; STOP-D-ANCHOR only if Stage 1b can't grep-cite the table by author + edition + year + table number |
| Anchor 3 of T_c table — hand-derivation from Kramers-Wannier duality | `tools/testkit/golden/derivations/ising-onsager.md` | derivation-grounded; STOP only if mathematics fails |
| Anchor 2 of m(T) table — Baxter 1982 §7.10 magnetization table | textbook, edition-cited | as above |
| Anchor 3 of m(T) table — Newman & Barkema 1999 Fig. 3.1 digitized values | textbook, edition-cited | as above |

**Per `docs/phases/phase-3-plan.md:1006` anti-pattern reminder:**
widening a test to accept any value is anti-pattern. If the Yang
closed-form cannot be cross-checked at T=2.2 (very near T_c, finite-
size shift) without an impractical fetch → **surface; do NOT
fabricate** — declare Yang-anchor at T=2.2 as `mc_statistically_within_
finite_size_window` per § 6 D-WIDE-TOL routing, NOT a tightened bound.

## § 5 — D-class register (each lean + decision-by)

### D-WEBGPU-DET — Stack-B determinism class

- **Question:** bit-exact same-stack-same-hw or distributional EFECT
  for the WebGPU parallel-Metropolis kernel?
- **Lean:** **bit-exact same-stack-same-hw via PCG per-cell seed +
  checkerboard sublattice order; no atomics, no subgroup ops.** §6.3a
  VERIFICATION POSTURE (`docs/phases/phase-3-plan.md:1537-1543`):
  "Determinism: bit-exact same-stack-same-hw via PCG seed +
  deterministic checkerboard update order." RD-2D Stack-B precedent
  (`packages/reaction-diffusion-2d/src/gray_scott.wgsl:8-9` —
  "preserves the bit-exact-same-hw determinism declaration"). MEASURE
  at Stage 1b via `runTwiceAndDiff`. STOP-DET if NOT bit-exact (re-
  characterize per smoke-stack-e gate-14 precedent — Hard-Rule-2
  distributional + EFECT bound).
- **Caveat:** WebGPU on CI runners has no GPU per spec § 7.8;
  Stage-1b D-DET MEASURE may need a node-local wgpu fallback OR
  deferral to local-only verification with in-charter caveat — D-DET-
  RUNTIME flag surfaced at Stage 1b probe.
- **Decision-by:** Stage 1b MEASURE.

### D-WIDE-TOL — wide MC tolerances vs tolerance-budget caps

- **Question:** `critical_temp_rel=1e-3` (finite-size shift ~1/L at
  L=128) + `magnetization_rel=5e-2` (MC statistical error at 10⁴ steps)
  are wide vs the project's typical 1e-4 / 1e-5 tolerances. Within
  budget?
- **Lean:** declare under `[overrides.ising-classical]` with
  `category = "lattice-spin"` (per §S schema-fit, additive keys not
  generic `relative`/`absolute`); physics-justified per § 6.3a M.5
  rationale ("Monte Carlo finite-size effects shift observed T_c by
  ~1/L"; "Monte Carlo statistical error at 10⁴ steps"). Document
  rationale in spec-ref § 6 + golden-table `independent_reference`
  fields. **L-LTSF-3 IN-SCOPE.** If a `[budgets.lattice-spin.<axis>]`
  cap exists OR is introduced (none at HEAD per probe §2.8) → propose
  budget-amendment via separate `chore(tolerance-budget): amend …`
  commit per § 6.0 item 2; **do NOT widen unilaterally**. STOP-CAT-X
  if tempted.
- **Decision-by:** Stage 1b.

### D-PBT — property-based test invariants

- **Question:** PBT scope ≥2 per §2.14.
- **Lean:** **YES — implement both invariants exactly as §6.3a A
  declares** (`docs/phases/phase-3-plan.md:1450-1454`):
  - `magnetization_bounded`: `|m| ≤ 1` at every step for randomly-
    sampled valid initial states + temperature T ∈ [1.0, 4.0].
  - `energy_per_spin_bounded`: `E/N ∈ [-2, 2]` (for 2D nearest-
    neighbor Ising with J=1) at every step.
- **Note:** mass-conservation is NOT relevant (Ising is spin, not
  mass). The lenia-Stage-1b SHIFTED-on-evidence falsification of
  `mass_approximately_conserved` does NOT translate to Ising;
  per-spin invariants are mathematically pristine.
- **Decision-by:** plan-drafting (RESOLVED).

### D-ANCHOR — anchor grounding

- **Question:** anchor citations grep-cite-able without fabrication?
- **Lean:** **YES — three primary DOIs Crossref-verified at probe
  time** (Onsager `10.1103/PhysRev.65.117`; Yang
  `10.1103/PhysRev.85.808`; Kramers-Wannier `10.1103/PhysRev.60.252`
  — see probe § 3). Three textbook citations
  (Landau & Binder 2014 / Baxter 1982 / Newman & Barkema 1999) cite-by-
  edition. Hand-derivation lives at `tools/testkit/golden/derivations/
  ising-onsager.md`. **STOP-D-ANCHOR LOW-RISK** vs LPIPS-BAPPS or
  Inria-3DGS — all closed-form / textbook-grade.
- **Decision-by:** Stage 1b grep-cite + verify.

### D-DET-REGISTRY — first `[lattice-spin.*]` registry row

- **Question:** registry row shape.
- **Lean:** add `[lattice-spin.ising-classical]` to
  `tools/testkit/determinism/registry.toml` per §3.2.5 schema at
  Stage 1b:

  ```toml
  [lattice-spin.ising-classical]
  stack = "B"
  class = "bit-exact"
  scope = "same-stack-same-hw"
  atomic_ops = "none"
  subgroup_ops = "none"
  seed_pinned = true
  ```

- **Decision-by:** Stage 1b.

### D-HARNESS-LAYOUT — Stack-B sim test harness — RESOLVED-IN-CHARTER-v2 (pytest-against-captures)

- **Question (charter-v1 framing):** vitest test-file location under
  `common/common-ts/` vs `packages/ising-classical/`.
- **Question (charter-v2 re-framing, operator-surfaced):** Stack-B sim
  testing — vitest or pytest-against-captures?
- **Resolution:** **pytest-against-captures per RD-2D Phase-0
  precedent.** Per the harness-investigation audit
  (`docs/_audits/phase-3/sub-phase-phase-3-ising-classical-harness-
  investigation-2026-05-28T21-00-21Z.md`):
  - **(FACT §3.1)** RD-2D (only Stack-B sim at HEAD) ships zero
    `*.test.ts` files under `packages/reaction-diffusion-2d/`; tests
    are pytest in `packages/reaction-diffusion-2d/tests/test_*.py`
    (capture-round-trip vs NumPy reference per
    `packages/reaction-diffusion-2d/tests/test_code_verification.py:32-50`).
  - **(FACT §3.2)** All 8 `*.test.ts` files in the repo live under
    `common/common-ts/`; vitest is **library-only** in this project,
    not a sim-testing tool.
  - **(FACT §3.3)** `.github/workflows/ts-strict.yml` runs `pnpm vitest
    run` with `working-directory: common/common-ts`; it does NOT
    discover `packages/**/*.test.ts`.
  - **(FACT §3.4)** §6.3a's `pnpm vitest …` call inherits plan §3.2.7's
    per-stack prescription (`docs/phases/phase-3-plan.md:535`) whose
    precondition (`pnpm -F <sim-package> test` implies an npm workspace
    with sim packages) is **unrealized at HEAD**: no root
    `pnpm-workspace.yaml`; RD-2D has no `package.json`.
  - **(FACT §3.5)** Capture-driven pytest is fully reproducible for
    ising: same `Writer` API + same HDF5 layout + same `diff_captures`
    machinery; WGSL impl runs locally only per spec §7.8 (RD-2D
    Phase-0 precedent unchanged).
- **§6.3a C literal `pnpm vitest run lattice-spin/ising-classical/
  typescript/tests/`** (`docs/phases/phase-3-plan.md:1458`) records as
  **§0.3 SHIFT-from-discovered (convention)**. NO plan edit unilateral.
- **Lean A (vitest-mirror) + Lean B (extend-vitest-config) + STOP-HARNESS
  are all collapsed** — both leans presupposed vitest; the precedent
  says pytest.
- **Decision-by:** **charter-v2 RESOLVED** (operator's surfaced question
  forced the convention-level investigation at charter-revision time
  rather than as a Stage-1a afterthought).

### D-CI — workflow + job for ising-classical tests — RESOLVED-IN-CHARTER-v2

- **Question (charter-v1 framing):** extend `ts-strict.yml` vs create
  `build-ts.yml`.
- **Question (charter-v2 re-framing):** Given D-HARNESS-LAYOUT resolves
  to pytest-against-captures, where does the `test-ising-classical`
  job belong?
- **Resolution:** **extend `.github/workflows/python-strict.yml` with a
  `test-ising-classical` job, mirroring lenia's
  `python-strict.yml/test-lenia` job** (which landed at the
  `90f381e`→`228cccd` chain per `docs/_audits/phase-3/progress.md`
  lenia-mypy-strict-fix entry). `ts-strict.yml` stays out of scope
  (common-ts library only per FACT §3.3). §6.3a M.4's "build-ts.yml"
  remains §0.3 SHIFT-from-discovered — the file's absence at HEAD is
  not the gap; the gap is that the file would have been the wrong CI
  surface even if it existed.
- **Decision-by:** **charter-v2 RESOLVED** (consequence of
  D-HARNESS-LAYOUT resolution).

### D-LAYOUT — `lattice-spin/ising-classical/typescript/` vs `packages/ising-classical/`

- **Question:** §6.3a literal "`lattice-spin/ising-classical/
  typescript/`" (`docs/phases/phase-3-plan.md:1423` + `:1466`) vs the
  current `packages/*/` convention.
- **Lean:** **`packages/ising-classical/`** per existing-convention
  precedence. Lenia hit the same shape (plan §6.3 "continuous-ca/
  lenia/python/") and was D-LAYOUT-RESOLVED-ON-EVIDENCE to
  `packages/lenia/` ([[phase-3-lenia-sub-phase-landed]] D-LAYOUT).
  RD-2D Stack-B impl lives at `packages/reaction-diffusion-2d/src/
  index.ts`. Surface §0.3 SHIFT-from-discovered; NO plan edit
  unilateral.
- **Decision-by:** Stage 1a probe + Stage 1b implementation.

### D-TOL-SCHEMA — tolerance schema fit for MC-statistical named tolerances

- **Question:** `critical_temp_rel` + `magnetization_rel` are sim-
  specific named keys, NOT the generic `relative`+`absolute` override
  pair (probe §2.7). Lenia's prior schema-fit fix banked the
  `golden_tolerance` branch under `[overrides.<sim>]` per §S. Does
  ising need a NEW additive branch (e.g. `mc_observable_tolerance`)?
- **Lean:** **place as ADDITIVE KEYS under `[overrides.ising-
  classical]`** (mirror lenia's `golden_tolerance` branch shape: same
  parent-section, sim-specific keys at the same depth). NO new
  top-level branch unless Stage 1b discovers a schema validator
  failure that demands one. Surface the question explicitly at Stage 1b
  probe per §S ("further branches need explicit surfacing at plan-
  drafting, not at Stage 1b" — surfaced here).
- **STOP-S** if the schema validator rejects additive keys under
  `[overrides.<sim>]` AND a new branch is needed → operator routes
  the branch name at Stage 1b BEFORE the validator-fix commit.
- **Decision-by:** Stage 1b.

### D-MUT-SCOPE — does a SIM carry a mutation gate?

- **Question:** mutation-testing gate at Stage 1c (like common-3dgs +
  render-similarity)?
- **Lean / RESOLUTION:** **NO — RESOLVED-IN-CHARTER on FACT.** Per
  `docs/phases/phase-3-plan.md:1054-1058` § 6.0 item 12: mutation-
  testing thresholds apply to **testkit-adjacent modules** (common-
  3dgs at task-1, render-similarity at task-2, common-warp at task-9).
  Ising-classical (task-3a) is a SIM, not testkit-adjacent. §6.3a
  VERIFICATION POSTURE (`docs/phases/phase-3-plan.md:1537-1543`) cites
  GOLDEN + PBT + DETERMINISM, no mutation. Lenia precedent (`v0.2.4`)
  confirmed NO mutation gate. Stage 1c is **verdict-landing only**.
- **Decision-by:** plan-drafting (RESOLVED).

### D-TAG — intermediate tag — RESOLVED-IN-CHARTER-v2 NO

- **Question:** tag at Stage-2 landing or remain untagged?
- **Charter-v1 lean:** YES `v0.2.5-sub-phase-phase-3-ising-classical`
  per §D.2 (b) durable sim architecture; operator-pending caveat that
  phase-close-only tagging would flip the lean to NO.
- **Charter-v2 resolution: NO.** Operator routed per-sub-phase tagging
  as discontinued going forward; phase-close-only tagging is the new
  cadence (one tag per phase at operator's phase-close pass, not per
  sub-phase). See §3 for material consequences (no tag proposal at
  Stage 2 landing; no I7 allowlist extension; STOP-I7 collapses;
  closing-sweep + landing audit stand).
- **Decision-by:** **charter-v2 RESOLVED** (operator-routed this
  session; no further decision at Stage 2).

## § 6 — HARD RULE 2 STOP conditions (sub-phase-specific)

File a blocker in the relevant stage audit; do not improvise through.

- **STOP-D.** Integrity baseline diverges from the live-measured
  digest (probe digest `688bc195d8b785753ae9500b4e1d48800ae961dd38ac
  4410f16fb7446de127ff` — re-measure per §R, do NOT copy) (HARD_FAIL
  > 0) at any stage; or any I1–I7 invariant fails. **→ STOP.**
- **STOP-H.** `verify_evidence` regresses on any prior audit (incl.
  all common-3dgs + render-similarity + lenia stage audits + the
  baseline-citation-correction + r2-credentials-durability +
  lenia-tolerance-schema-fix + lenia-mypy-strict-fix audits + this
  charter's predecessors). **Pre-existing 1-fail in `lenia-mypy-strict-
  fix-2026-05-28T18-39-42Z.md` is documented in probe §6.3 and is NOT
  a regression caused by this session** — STOP-H is regression-only;
  pre-existing is surfaced not blocked. **→ STOP** only on a NEW
  regression.
- **STOP-MAIN-RED.** Any required workflow red at HEAD before drafting
  (§S.5 NEW WORDING). Probe §6.1 confirms 9/9 success at HEAD `e12685d`
  → NOT FIRED.
- **STOP-DOI.** Any of the three foundational DOIs (Onsager `10.1103/
  PhysRev.65.117`; Yang `10.1103/PhysRev.85.808`; Kramers-Wannier
  `10.1103/PhysRev.60.252`) fails to resolve at Stage-1b re-verify.
  Probe §3 Crossref-verified 3/3 at probe time → **NOT FIRED at
  charter-time**; re-verify at Stage 1b.
- **STOP-REPLAY.** Cross-phase audit replay `--prior-phase phase-2`
  discrepancy at Stage 0 (`docs/phases/phase-3-plan.md:18`). **→
  BLOCKED.** Recovery via [[replay-needs-lfs-cache-recovery]] applies
  BEFORE declaring blocked.
- **STOP-D-ANCHOR.** Any of the three golden-table anchors (T_c
  Onsager / m(T) Yang / Kramers-Wannier duality) cannot be grounded
  without a large fetch or fabrication at Stage 1b. **→ STOP**
  (Convention #8 + `docs/phases/phase-3-plan.md:1006` forbid
  fabrication / widening). LOW-RISK per probe §3 (all closed-form /
  textbook-grade).
- **STOP-DET.** D-WEBGPU-DET measurement (Stage 1b) shows the WebGPU
  parallel-Metropolis kernel is NOT bit-exact across two runs with
  pinned seed=42 / T=2.27 / 10⁴ steps / 128² grid — **→ surface and
  re-characterize** as `distributional` + EFECT bound (Hard-Rule-2;
  precedent smoke-stack-e gate-14). NOT a hard STOP if EFECT bound
  derivable; STOP only if EFECT bound cannot be derived. **D-DET-
  RUNTIME caveat:** CI runners have no GPU per spec §7.8; Stage-1b
  may need local-only verification with in-charter caveat.
- **STOP-LFS.** Stage 1b LFS push of `phase-3-ising-classical.h5`
  fails to R2 OR fails to GitHub. **→ surface to operator + DO NOT
  REVERT** per [[phase-3-common-3dgs-stage-1c-shifted-stop-lfs]] +
  [[phase-3-lenia-sub-phase-landed]] precedent. Recipe: `git -c
  lfs.standalonetransferagent= push` + separate `git lfs push
  --object-id --stdin origin`. §Q bootstrap at Stage 0 should make
  this succeed first try per [[phase-3-r2-credentials-durability-fix-
  landed]] — surface as L-R2CD-FOLLOWUP if NOT.
- **STOP-PBT.** Either declared PBT invariant
  (`magnetization_bounded`, `energy_per_spin_bounded`) fails at the
  spec § 2.14 example budget at Stage 1c. **→ surface**; widening
  Hypothesis examples or relaxing the assertion = anti-pattern; the
  failing example IS the value.
- **STOP-CAT-X.** Ising's `tolerance.toml [overrides.ising-classical]`
  named tolerances exceed a `tolerance-budget.toml [budgets.lattice-
  spin.<axis>]` cap (none at HEAD per probe §2.8). **→ STOP**;
  surface tolerance-budget amendment via separate operator-approved
  `chore(tolerance-budget): amend …` commit per § 6.0 item 2; do NOT
  widen unilaterally. **L-LTSF-3 in-scope.**
- ~~**STOP-HARNESS.**~~ **REMOVED in charter-v2.** D-HARNESS-LAYOUT
  RESOLVED to pytest-against-captures per the harness-investigation
  audit; no remaining vitest/pytest reconciliation to gate.
- **STOP-S.** D-TOL-SCHEMA discovers that the equivalence-table
  schema validator rejects additive keys under `[overrides.<sim>]`
  AND a new top-level branch is needed → operator routes the branch
  name at Stage 1b BEFORE the validator-fix commit (precedent §S).
- ~~**STOP-I7.**~~ **REMOVED in charter-v2.** D-TAG flipped to NO; no
  Stage-2 I7 allowlist extension is performed, so there is no additive
  mutation to guard against in this sub-phase. The I7 guard mechanism
  itself stays unchanged at HEAD; agent NEVER tags (convention-level
  I7 is unaffected).
- **STOP-PROSE-MATH.** Stage 1b discovers that **another** §6.3a prose
  characterization is mathematically wrong (analogous to lenia's
  "K(0) peak" surface). **→ surface** as §0.3 SHIFT-from-discovered
  (NOT a hard STOP); record in stage audit; NO plan edit unilateral.
  Probe §6.7 surfaces D-CI + D-LAYOUT at charter time; Stage 1a/1b
  watches for further drift.
- **STOP-S5-CI-RED.** §S.5 NEW WORDING post-push poll returns ANY
  failing required workflow at the chain-tip SHA at any stage close
  (NOT only at landing). **→ STOP**; surface failing-job names; do
  NOT proceed.

## § 7 — Risk register

- **R-1 (published-audit append-only).** NEVER edit a published
  `docs/_audits/**` file. Append-only verified by `git diff
  --name-status` at Stage 2. A stage that must edit a published audit
  → STOP.
- **R-2 (DOI drift between probe and Stage 1b).** Probe-time DOI
  resolution Crossref-verified at 2026-05-28T19-08-34Z. If a Stage-1b
  re-verify (hours/days later) shows a DOI 404 — primary anchor
  invalidated → STOP-DOI; the closed-form formulas are still
  textbook-grade and can be re-anchored against Landau & Binder /
  Baxter / Newman & Barkema, but the primary citation must be re-
  routed.
- **R-3 (Stack-B sim test-harness convention) — RESOLVED-IN-CHARTER-v2.**
  D-HARNESS-LAYOUT resolved on evidence to **pytest-against-captures
  per RD-2D Phase-0 precedent** (`docs/_audits/phase-3/sub-phase-phase-
  3-ising-classical-harness-investigation-2026-05-28T21-00-21Z.md`).
  Charter-v1 framed this as layout-level; operator surfaced that it is
  convention-level. The decision is **load-bearing for every later
  Stack-B SIM in this project** (Phase-5 web-deploy lift; Stack-B
  inference half of task-6 NCA): vitest stays library-only at
  `common/common-ts/`; sim testing lives in pytest under
  `packages/<sim>/tests/`. The only residual risk is convention drift
  if a future operator pivot rebuilds the `pnpm -F` workspace
  precedent — at which point this decision documents the prior choice
  + the evidence trail and the operator routes the migration.
- **R-4 (WebGPU determinism on CI runners).** Spec § 7.8 documents
  CI runners have no GPU. Stage-1b D-DET MEASURE may have no in-CI
  verifier; local-only with in-charter caveat is acceptable per
  spec § 7.8 + RD-2D Phase-0 precedent (`packages/reaction-diffusion-
  2d/src/index.ts:6-8` — "Phase 0 CI excludes WebGPU-device-requiring
  tests"). D-DET-RUNTIME flag carried.
- **R-5 (first Stack-B `.h5` LFS push).** R2 round-trip relies on §Q
  bootstrap from Stage 0. If R2 push fails despite §Q in agent env
  (regression of [[phase-3-r2-credentials-durability-fix-landed]]) →
  STOP-LFS; surface to operator; do NOT revert. L-R2CD-FOLLOWUP bank.
- **R-6 (audit-citation-hygiene cluster).** Probe §6.3 surfaces the
  pre-existing `lenia-mypy-strict-fix` 1-fail. This is **NOT a
  regression introduced by ising-classical**, and STOP-H does NOT
  fire. Carry-forward bank to the candidate audit-citation-hygiene
  cluster sub-phase (sibling of L-R2CD-1).
- **R-7 (Phase-3 SIM order non-blocking on this sub-phase).** Per plan
  §4.1: ising-classical is sequential between task-3 (Lenia, LANDED)
  and task-4 (rigid-body, not started). Ising's landing UNBLOCKS
  task-4 + onwards but no later Phase-3 task imports ising-classical
  as a code dependency. Phase 6 ising-dwave inherits the Ising
  spec-sheet + glossary entries as documentation precedent only.

## § 8 — Banks consumed / carried / opened

| Bank | Status | Note |
|---|---|---|
| L-3DGS-1 (neural-rendered structural ceiling) | NOT IN SCOPE — Ising is not neural-rendered |
| SIBLING-FIXTURE-LFS | CARRIED FORWARD — Ising's `.h5` push exercises the same R2-backed pipeline + increments the corpus by one; does NOT close the sibling sub-phase |
| integrity-meta-test-ci-wiring | CARRIED FORWARD — Ising's pytest property + Tier-3 tests ride existing pytest-testpaths machinery; does NOT inherit the gap |
| R-11 (lenia first-SIM frictions) | TRANSLATED-TO-STACK-B (probe §6.6) — capture-API + manifest-schema + R2-bootstrap inherit verbatim; Taichi-specific items NOT applicable. **Charter-v2 update:** D-HARNESS-LAYOUT resolved (pytest-against-captures); D-CI resolved (`python-strict.yml/test-ising-classical`); only D-DET-RUNTIME remains carried (CI no-GPU per spec §7.8, addressed by Layer-1/Layer-2 oracle split). |
| L-LTSF-3 (tolerance-budget cap-amendment shape) | IN-SCOPE — D-WIDE-TOL; ising's MC tolerances are the second post-§S case |
| L-LMSF-1 (Taichi + mypy-strict override pattern) | NOT IN SCOPE — Stack B is TypeScript, no Taichi |
| L-LMSF-3 (locale.getdefaultlocale CLI -W friction) | **CHARTER-v2 RE-FRAMING: IN-SCOPE.** Per D-CI resolution, ising's `test-ising-classical` job runs in `python-strict.yml` (NOT `ts-strict.yml`) and exercises pytest, so it inherits the same `-W error` failure mode lenia hit. Mitigation: ising's `pyproject.toml` inherits lenia's `filterwarnings = ["error", …]` posture + the workflow uses `uv run pytest tests/` (NOT `-W error`) per the `228cccd` lenia precedent. |
| L-LMSF-4 (Phase-1 stack-d unscoped from CI mypy) | NOT IN SCOPE — Stack B not Stack D |
| L-R2CD-1 (audit-citation-hygiene at integrity-digest carry-forward) | CARRIED FORWARD — Probe §6.3 surfaces pre-existing 1-fail on `lenia-mypy-strict-fix`; routes to the candidate audit-citation-hygiene cluster sub-phase |
| **L-ISING-AUDIT-HYGIENE** (charter-v2 OPENED) | OPENED — session-1 ising audits (`probe-2026-05-28T19-08-34Z` 14 fails; `plan-drafting-2026-05-28T19-08-34Z` 6 fails) used literal `at-head` instead of measured `sha256:<hex>` in `evidence_hashes`. Sealed at session-1 commits `762424c`→`fa06646`→`ac47074`. Per this dispatch ("DO NOT touch sealed audits") fix is out-of-scope here; routes to the audit-citation-hygiene cluster (sibling of L-R2CD-1). NOT a regression introduced by this session. |
| L-R2CD-FOLLOWUP (R2 push success at first-attempt-after-§Q) | OPEN — Stage 1b first-try LFS push is the live test of [[phase-3-r2-credentials-durability-fix-landed]] §Q |
| First-Stack-B-SIM precedent | OPENED-HERE — see § 1.1; charter-v2 narrows the open surfaces to D-DET-RUNTIME + the `lattice-spin` category bootstrap (D-HARNESS-LAYOUT + D-CI now resolved). |

## § 9 — Convention checklist

- **Convention #8 (no fabrications).** DOIs Crossref-verified at probe
  time (probe §3); closed-form anchors derivable from cited primary
  sources; textbook citations cite-by-edition.
- **Convention M (re-anchor; match precedent).** RD-2D Stack-B
  exemplar at `packages/reaction-diffusion-2d/` + lenia precedent
  `packages/lenia/` drive D-LAYOUT + D-CI + D-HARNESS-LAYOUT
  resolutions. Charter-v2's harness DECISION is Convention M applied
  to convention-level (vitest vs pytest), not just layout-level.
- **Convention #12 (SHA back-fill).** Each Stage's audit gets a
  Convention #12 back-fill commit per the §12 default cadence.
- **Cat 1 (full-path citations).** All `path:line` citations in this
  charter + the probe + the audits are repo-rooted (full repo-relative
  paths required; bare-filename citations like the negative example in
  the lenia plan-drafting bank trigger Cat-1 HARD_FAIL).
- **§Q (LFS bootstrap as first post-anchor action).** Stage 0 sources
  `tools/lfs/setup-lfs-s3-local.sh` as the first action after the
  anchor probe per [[phase-3-r2-credentials-durability-fix-landed]].
- **§R (measure-don't-copy).** Integrity-digest `688bc195…` in this
  charter is the probe-time live measurement; every later stage RE-
  MEASURES and asserts against the live value at the stage's HEAD,
  NOT a copy of this charter's value.
- **§S (tolerance-schema probe-first).** D-TOL-SCHEMA + D-WIDE-TOL
  surface the schema-fit question at charter time, not Stage 1b. New
  branches need explicit surfacing here — D-TOL-SCHEMA defaults to
  additive-keys-under-overrides, surfaces the alternative.
- **§S.5 (post-push all-workflow poll).** Every stage close fires the
  `gh run list --commit <sha> --limit 30` poll across ALL push-
  triggered workflows, not just sub-phase-touched ones.
- **I7 (no agent tags).** Agent NEVER pushes a tag. **Charter-v2:**
  D-TAG flipped to NO; no sub-phase tag is proposed at Stage 2; the
  Phase-3-close tag is operator work at phase close.
- **HARD RULE 2 (reality contradicts plan → STOP).** All remaining
  STOP conditions in § 6 are reality-contradicts-plan triggers.

## § 10 — Provenance

- **Author (charter-v1):** Phase-3 ising-classical plan-drafting
  (Claude Code, Opus 4.7), 2026-05-28T19-08-34Z, HEAD `e12685d`.
- **Author (charter-v2):** Phase-3 ising-classical charter-revision
  (Claude Code, Opus 4.7), 2026-05-28T21-00-21Z, HEAD `ac47074`.
- **Prior sub-phase tag (pushed):** `v0.2.4-sub-phase-phase-3-lenia`.
- **Prior phase tag (pushed):** `v0.2.0-phase-2`.
- **Proposed sub-phase tag (charter-v2):** **NONE** — D-TAG flipped to
  NO per operator routing (per-sub-phase tagging discontinued;
  phase-close-only going forward).
- **Probe report (sealed at session 1):**
  `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-probe-
  2026-05-28T19-08-34Z.md`.
- **Plan-drafting audit (sealed at session 1):**
  `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-plan-
  drafting-2026-05-28T19-08-34Z.md`.
- **Harness-investigation audit (this session):**
  `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-harness-
  investigation-2026-05-28T21-00-21Z.md`.
- **Exemplar:** `packages/reaction-diffusion-2d/` (Stack B; Phase 0
  Gray-Scott WGSL + h5wasm capture + pytest-against-captures
  oracle).
- **Precedent:** [[phase-3-lenia-sub-phase-landed]] (SIM cadence;
  closed-with-shifted-2 verdict shape; first-SIM friction-surfacing
  section).

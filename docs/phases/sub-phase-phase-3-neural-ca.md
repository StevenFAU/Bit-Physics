---
date: 2026-05-29
author: phase-3 neural-ca plan-drafting (Claude Code)
sub_phase: sub-phase-phase-3-neural-ca
phase: phase-3
head_sha_at_draft: PENDING-BACKFILL
prior_sub_phase_landed_at: 86b0aa5
prior_phase_tag: v0.2.0-phase-2
version: charter-v1 (2026-05-29T03-43-39Z)
posture: >
  Sixth Phase-3 sub-phase by dispatch order (task-6, sub-phase 3.2).
  **FIRST DUAL-STACK sim of Phase 3** — Stack D (PyTorch training +
  PyTorch inference) AND Stack B (custom-WGSL/WebGPU inference), tied by
  ONE trained checkpoint. Per §6.3 ("first SIM's flow validates the
  pipeline end-to-end — friction here predicts friction in every later
  SIM"): this is the FIRST cross-stack-equivalence gate of Phase 3 and
  the FIRST learned-dynamics sim — friction here (checkpoint conversion,
  D↔B render-similarity, EFECT training bound) predicts every later
  learned/cross-stack sim (task-8 3DGS-MPM golden-render; Phase-4
  frontier NCA variants; Phase-5 web-deploy of every Stack-B half). All
  five prior Phase-3 sims are single-stack with NO gate-14; NCA is the
  first with a real, intentionally STATISTICAL (render-similarity)
  cross-stack gate. Inherits §6.6 deliverables A–M + v9 addendum, §3.1
  (HARD dep on task-2 render-similarity — SATISFIED; terminal on produce)
  + §3.2.2 + §3.2.4 + §3.2.5 + §3.2.6 + §3.2.8 + §3.2.9 + §3.5 + §6.0
  from docs/phases/phase-3-plan.md unchanged-by-citation, re-frames the
  v8 single-agent-sequential branch/PR machinery (SUPERSEDED, trunk-based
  to main, no PR/tag — plan v8) and documents the §0.3
  SHIFT-from-discovered drifts (render_similarity is a package not
  equivalence/render_similarity.py; build-py.yml/build-ts.yml do not
  exist; packages/<sim>/ not continuous-ca/neural-ca/python/; Distill
  PSNR/SSIM anchors do not exist). DRAFT ONLY — Stages execute under
  operator-ratified D-class routings. Every execution commit preserves
  invariants I1-I7, append-only audits, trunk-based commits to main, no
  agent-pushed tags (I7).
---

# Sub-phase: Phase-3 Neural-CA (task-6) — CHARTER

> **This is a plan, not an execution.** Plan-drafting verdict **SHIFTED**
> (subject to its own audit): the probe + charter are sound and Stage 0 may
> dispatch *with operator routing of five D-classes*. It does **NOT** mean
> `packages/neural-ca/`, any checkpoint, or any test exists. Every concrete
> claim is tagged **FACT** / **INFERENCE** / **WEB** and cites full
> repo-relative `path:line`. Probe FACTs live in
> `docs/_audits/phase-3/sub-phase-phase-3-neural-ca-probe-2026-05-29T03-43-39Z.md`;
> this charter summarizes, re-frames, and routes. DELIVERABLES / OUT-OF-SCOPE
> / ANCHOR-PROBE / VERIFICATION-POSTURE content is **inherited** from
> `docs/phases/phase-3-plan.md:1765-1880` (§6.6 + v9 addendum) + §3.2.2
> (`:373-405`) + §3.2.4 (`:421-457`) + §3.2.5 (`:461-505`) + §3.2.6
> (`:507-528`) + §3.2.8 + §3.2.9 + §3.5.

## 1. Scope and posture

### 1.1 First-dual-stack friction-surfacing context bridge

NCA is the **first sim that crosses two stacks**. Every prior Phase-3 sim
(common-3dgs infra, render-similarity testkit, lenia Stack-D, ising Stack-B,
rigid-body Stack-E, cloth Stack-C) was single-stack and closed `no gate-14`.
NCA introduces, all for the first time in Phase 3:

| First-of | What | Predicts friction for |
|---|---|---|
| Cross-stack gate-14 | D-inference ↔ B-inference equivalence | task-8 3DGS-MPM golden-render |
| **Statistical** gate (not bit/epsilon) | render-similarity PSNR/SSIM/LPIPS | every learned/neural-rendered sim |
| Learned-dynamics sim | trained model IS the dynamics (spec §5.12) | gns-particle, pinn-poisson, learned-closure-les |
| Non-determinism-by-design | training is non-det; EFECT distributional bound | every stochastic/learned sim |
| Checkpoint artifact + conversion | `.safetensors` → WGSL-loadable, exact + tested | every deployed learned model |
| Dual-language one package | `python/` training + `typescript/` inference | task-8; Phase-5 web-deploy lift |

The dispatch's central conceptual point (honored throughout): **a learned model
run in PyTorch vs WGSL is NOT bit-equivalent cross-stack** (different f32 conv
reductions); the equivalence is statistical/perceptual (spec §2.6 learned row =
`distributional`, `docs/architecture.md:414`; spec §5.12). The gate is
**render-similarity** (task-2's harness), NOT `compare_captures`.

### 1.2 Inheritance and re-frames (what this charter changes vs the plan prose)

| Plan prose | Re-frame | Authority |
|---|---|---|
| `tools/testkit/equivalence/render_similarity.py` (§6.6/§3.1) | It is a **package** `tools/testkit/render_similarity/`; import `from render_similarity import psnr, ssim, lpips` | §0.3; task-2 landing; probe §2 |
| `continuous-ca/neural-ca/python/` + `…/typescript/` (§6.6) | **`packages/neural-ca/python/` + `packages/neural-ca/typescript/`** (unified package) | §0.3 existing-convention; ising precedent; probe §6 |
| `build-py.yml` (test-neural-ca-train) + `build-ts.yml` (test-neural-ca-infer) (§6.6 K) | Those workflows **do not exist**; route ALL pytest jobs to **`python-strict.yml`** (WGSL local-only per §7.8) | §0.3; ising D-CI; probe §1 |
| `references/growing-neural-ca/manifest.yaml` (§6.6 G) | `references/growing-neural-ca/MANIFEST.toml` | §0.3; cloth §H precedent |
| Anchor 1 "PSNR threshold from Mordvintsev 2020" + Anchor 2 "SSIM lower-bound from a published NCA reference" (§6.6 v9) | **Those published metrics do not exist** (Distill = L2 loss, qualitative) → D-ANCHOR re-shapes | WEB (distill.pub/2020/growing-ca); probe §8 |
| `[continuous-ca.neural-ca-*]` tolerance shape (§3.2.4) | Landed schema = `[render_similarity.continuous-ca.neural-ca]` + `[golden_tolerance.continuous-ca.neural-ca-python]` | §S.2/§S.3; probe §3 |
| "gate 14" as a spec gate | Spec has 13 gates (§3.5/D.6); gate-14 cross-stack is a **CI gate** per §2.6/§9.3 + a local convention | `docs/architecture.md:832-854`, `:2585-2606`; probe §9 |
| v8 BASE/YOUR-BRANCH/MERGE-PROTOCOL §4.3 + §6.6 lines | SUPERSEDED — trunk-based to `main`, no PR, no tag (D-TAG NO) | plan v8; tasks 3a/4/5 precedent |

Inherits the lenia/ising/cloth SIM cadence (Stage 0 → 1a → 1b → 1c → 2) and the
five first-SIM frictions where they translate. The Stack-B inference half inherits
ising's first-Stack-B resolutions (pytest-against-captures, WGSL local-only,
`common/common-ts` device init).

## 2. Stage cadence

Trunk-based to `main`; no PR; no tag (D-TAG NO). Convention-A new-files-first;
≤500-line commits; TDD with verbatim failing-output-hash footer (§S6 — real
sha256, no placeholders). Estimated ~30–60 commits (dual-stack ⇒ larger than a
single-stack sim). **Stage 1b SPLITS into 1b-D (PyTorch training) and 1b-B (WGSL
inference)** because the checkpoint produced by 1b-D is the input to 1b-B.

- **Stage 0 — anchor + vendor + corrigenda.** Anchor probe (preflight exit 0; §R
  count-invariant 0 HF / 14 SW re-confirm) → **§Q.3 LFS bootstrap
  `source tools/lfs/setup-lfs-s3-local.sh` as FIRST action after the probe** (NCA
  ships `.h5` + `.safetensors` + converted WGSL artifact → LFS-touching) →
  cross-phase replay `--prior-phase phase-2` (LFS-cache recovery per
  replay-needs-lfs-cache-recovery) → `verify_evidence` sweep. **Vendor**
  `references/growing-neural-ca/` at SHA `3d5547ca…` (web-re-verify with
  `gh api … --jq .license.spdx_id` → Apache-2.0; §H Stage-0 verify). **File
  corrigenda A-4 (plan §2.18 growing-neural-ca row) + A-5 (spec D.3 vendor row)**
  in `docs/spec-amendments-proposed.md`. Ratify the 5 operator-pending D-classes
  (charter-v2 if any flips).
- **Stage 1a — scaffold + RED (both stacks).** `packages/neural-ca/python/` +
  `…/typescript/` shells; spec-ref §1-13; failing TDD: training-convergence +
  checkpoint-serialization (Python) AND WGSL-inference-reproduction (TS, via the
  ising pytest-against-capture pattern). Determinism docstrings (§F.1): training
  non-det / inference bit-exact. **Append the two determinism-registry rows** +
  the two tolerance rows (§S.2 read schema first). Capture failing output →
  `tools/testkit/failing-tests-evidence/neural-ca-<UTC>.txt`, hash in commit footer.
- **Stage 1b-D — PyTorch training (Stack D).** Implement the NCA update rule
  (reimplemented from the Distill paper, cite by name; do NOT import the vendored
  oracle — §H.2). Train on a target emoji to a loss bound; emit
  `tools/testkit/golden/checkpoints/neural-ca-emoji-{name}.safetensors`. **MEASURE
  the training-loss distribution across pinned seeds → derive the EFECT bound**
  (`training_loss_distributional_bound`); produce the canonical D-inference
  capture `growing-emoji-64sq-seed42-step1000`. PBT: `field_values_bounded` +
  `inference_determinism` (`tools/testkit/property/sims/neural-ca/`).
- **Stage 1b-B — WGSL inference (Stack B).** Implement custom WGSL compute shaders
  for forward inference; **`convert_checkpoint.py`**: `.safetensors` → WGSL-loadable
  buffer (documented layout) + **round-trip weights-equality test** (bit-identical
  weight values pre/post — D-CHECKPOINT-CONVERSION). Run the WGSL inference on a
  GPU host LOCALLY (§7.8) → produce the B-inference render-capture (committed,
  LFS-tracked). The CI test reads the committed capture (NumPy/CPU oracle for the
  reproduction check).
- **Stage 1c — gate-14 D↔B render-similarity + perf + schema-corpus.** Wire the
  D↔B test (direct `from render_similarity import psnr, ssim, lpips`, frame-paired
  by index) → **MEASURE** PSNR/SSIM/LPIPS → **LOCK** `psnr_min`/`ssim_min`/`lpips_max`
  per §2.12; if below the §2.12 floors (PSNR≥28 / SSIM≥0.85 / LPIPS≤0.15) raise a
  quality-concern flag in report §6 (NOT auto-fail — learned = distributional).
  Write `docs/sim-specs/continuous-ca/neural-ca/equivalence.md` (RD-2D template,
  marked **statistical**). Perf-ledger: one row per stack. Schema-corpus seed
  `tests/fixtures/legacy-captures/phase-3-neural-ca.h5` + sidecar. Gate-13 replay.
- **Stage 2 — landing.** §R two-field integrity (0 HF / 14 SW invariant + measured
  digest); replay; append-only; `verify_evidence` (incl. this sub-phase's prior
  stage audits, 0-fail); §S.5 FULL-workflow CI sweep green at HEAD. Close per §2.15
  (`closed-with-shifted-N`). progress.md final entry. Convention-#12 SHA back-fill.
  **NO tag (D-TAG NO).**

## 3. Deliverables (plan §6.6 A–M + v9 addendum → resolved paths)

| §6.6 | Deliverable | Resolved path / note |
|---|---|---|
| A | spec-ref.md (§9: D↔B bounds locked per §2.12) | `docs/sim-specs/continuous-ca/neural-ca/spec-ref.md`; §6 declares the gate **statistical** |
| B | probe report | done — `docs/_audits/phase-3/sub-phase-phase-3-neural-ca-probe-2026-05-29T03-43-39Z.md` |
| C | failing TDD (train convergence + ckpt serialize; WGSL infer reproduce) | `packages/neural-ca/python/tests/` + `packages/neural-ca/typescript/tests/` (pytest-against-capture) |
| D | PyTorch training, `.safetensors` output, CLI (§3.2.6) | `packages/neural-ca/python/` |
| E | Stack-B WGSL inference, loads converted ckpt | `packages/neural-ca/typescript/` (+ `src/*.wgsl`) |
| F | checkpoint `.safetensors` | `tools/testkit/golden/checkpoints/neural-ca-emoji-{name}.safetensors` (NEW dir; LFS) |
| G | vendored upstream at pinned SHA | `references/growing-neural-ca/` + `MANIFEST.toml`; SHA `3d5547ca…` Apache-2.0 |
| H | equivalence harness D↔B (bounds locked; below-floor → quality flag) | D↔B test via direct metric import; `equivalence.md`; §6 flag if < §2.12 floor |
| I | Tier-3 | `tools/diagnostics/tier3/neural-ca/` (§3.2.9) |
| J | Cat 1/2/3 green per stack | spec-ref/API/golden per stack |
| K | shared-file updates | README/CHANGELOG/glossary/justfile; **`python-strict.yml` jobs** (NOT build-*.yml); `tolerance.toml` (2 rows); `registry.toml` (2 rows) |
| L | progress entry | `docs/_audits/phase-3/progress.md` |
| M | report | `docs/_audits/phase-3/task-6-neural-ca.md` |
| v9-2 | Cat-X cross-stack budget wider (learned = distributional) | document in spec-ref §9 |
| v9-7 | PBT ≥ 2: `field_values_bounded` + `inference_determinism` | `tools/testkit/property/sims/neural-ca/` |
| v9-9 | perf-ledger one row per stack | `docs/perf-ledger.md` |
| v9-10 | schema-corpus seed | `tests/fixtures/legacy-captures/phase-3-neural-ca.h5` + sidecar |

## 4. Out of scope

- Building Stack-B headless-WebGPU CI infra (Playwright/Dawn-Node/Deno) — **§7.8
  forbids it**; the WGSL inference is local-only and produces a committed capture.
- Completing task-2's deferred `harness_mode.run` CLI orchestrator (NCA imports the
  metric functions directly; see D-XSTACK-METHOD).
- Frontier NCA variants (DiffLogic CA etc. — Phase 4 Stage 28, `docs/architecture.md:2506`).
- `ms_ssim` (Phase-4 WU-C shell). USD/3D export. A neural-weights distribution
  format beyond the `.safetensors` + WGSL-buffer pair (post-Phase-5, `docs/architecture.md:1724`).
- Editing `docs/architecture.md` (FROZEN) or `docs/phases/phase-3-plan.md` (§0.3
  no-edit) inline — corrigenda route to `docs/spec-amendments-proposed.md`.

## 5. Pre-flight checks (Stage 0 ACTION #1)

`uv run python tools/dispatch/preflight-phase.py 3` → EXPECT genuine exit 0
(hardened `1793b83`). Real exit 1 → STOP-PREFLIGHT-NEW, surface, do not proceed.
Plan-drafting confirmed exit 0 at `86b0aa5` (probe §0).

## 6. D-class decision routing

**Operator action required on D-STACK-B-TEST-INFRA (confirm), D-XSTACK-METHOD,
D-ANCHOR, D-DET, D-CHECKPOINT-CONVERSION before Stage 0. The rest are
RESOLVED-IN-CHARTER.** Load-bearing pair: **D-XSTACK-METHOD + D-ANCHOR**.

### D-STACK-B-TEST-INFRA — does CI-testable Stack-B inference exist, or BLOCK? ⚠ → RESOLVED-IN-CHARTER (operator confirm)

- **LEAN / resolution:** **NOT a BLOCK.** The §6.6 ANCHOR-PROBE "IF NO PATTERN
  EXISTS: BLOCK per §5.3" clause does not fire. The pattern exists at the
  convention level (ising D-HARNESS-LAYOUT,
  `docs/phases/sub-phase-phase-3-ising-classical.md:383-421`): **pytest-against-committed-captures
  + NumPy/CPU oracle; WGSL local-only per spec §7.8** (`docs/architecture.md:1498-1500`).
- **The D↔B realization:** CI compares two **committed, offline-generated** captures
  (D-inference PyTorch + B-inference WGSL-on-GPU-host) with pure-Python
  render-similarity; CI never runs the WGSL render. Route to
  `python-strict.yml/test-neural-ca-equiv` (+ `test-neural-ca-train`,
  `test-neural-ca-infer`).
- **Operator confirms:** that the committed-offline-capture realization is the
  intended satisfaction of gate-14 (vs any expectation that WGSL runs in CI, which
  §7.8 forbids).

### D-XSTACK-METHOD — how is gate-14 realized? ⚠ (load-bearing)

- **LEAN:** **render-similarity (D-inference ↔ B-inference), NOT `compare_captures`.**
  Tolerance MEASURED-then-LOCKED per §2.12, declared **statistical-not-analytic** in
  spec-ref §6/§9 (spec §5.12 + §2.6 learned row `docs/architecture.md:414`). The
  D↔B test imports the metric functions **directly**
  (`from render_similarity import psnr, ssim, lpips`), pairs frames by index,
  asserts against `[render_similarity.continuous-ca.neural-ca]` — mirroring RD-2D's
  direct `compare_captures` import (`packages/reaction-diffusion-2d-stack-d/tests/test_cross_stack_equivalence.py:19-46`).
- **Why not `harness_mode.run`:** task-2 left `tools/testkit/render_similarity/harness_mode.py:31-43`
  a Stage-1a SHELL (raises `NotImplementedError`); completing it is task-2's
  deferred surface (out of scope §4). Direct import is the cleaner, precedented
  path. If a Tier-3 / reproducibility CLI genuinely needs the mode, implement it
  then and note as SHIFT.
- **Operator confirms:** render-similarity direct-import method (not compare_captures,
  not blocking on the harness-mode shell).

### D-ANCHOR — the published PSNR/SSIM anchors don't exist; re-shape ⚠ (load-bearing)

- **WEB (decisive):** Distill 2020 trains with pixel-wise **L2 loss on RGBA** and
  publishes **NO PSNR/SSIM/LPIPS** numbers (qualitative evaluation). Plan §6.6 v9
  Anchor-1 ("PSNR from Mordvintsev 2020") + Anchor-2 ("SSIM from a published NCA
  reference") **do not exist** → §0.3 SHIFT-from-discovered (document in report §1).
- **LEAN (re-shaped anchor set, §2.12 measure-then-lock + spec §9):**
  - **Anchor 1 (training golden, not cross-stack):** Mordvintsev L2 loss →
    `golden_checkpoint_match` (checkpoint reconstructs the target at a training-loss
    bound).
  - **Anchor 2 (acceptance floor):** spec §2.12 floors PSNR ≥ 28 / SSIM ≥ 0.85 /
    LPIPS ≤ 0.15.
  - **Anchor 3 (the locked gate):** MEASURED D↔B render-similarity at Stage 1c,
    locked per §2.12, + a hand-derived "patterns visually equivalent" criterion in
    spec-ref §9. Document the gate is **statistical** in spec-ref §6.
  - Grep/web-verify any cite kept; NO plan edit (§0.3).
- **Operator confirms:** the re-shaped 3-anchor set (no fabricated published metric).

### D-DET — mixed posture (training non-det / inference bit-exact) ⚠

- **LEAN:** **two registry rows** (plan §3.2.5 `:487-503`):
  `[continuous-ca.neural-ca.training]` class=`non-deterministic` (by design —
  PyTorch backprop atomics) + `distributional_bound="EFECT"`;
  `[continuous-ca.neural-ca.inference]` class=`bit-exact` scope=`same-stack-same-hw`.
  Keep training and inference SEPARATE — bit-exact fits inference only.
- **MEASURE-then-declare** (cloth/ising D-DET precedent): default the rows at 1a;
  at 1b-D MEASURE the training-loss distribution and **derive the EFECT bound**
  (`runTwiceAndDiff` for inference reproducibility, EFECT band for training-loss
  convergence). **No prior Phase-3 sim derived an EFECT bound** — if it cannot be
  derived → **STOP-EFECT** (re-characterize per ising STOP-DET template,
  `docs/phases/sub-phase-phase-3-ising-classical.md:539-546`; surface to operator).
  Note: the load-bearing gate is the D↔B render-similarity on the FROZEN checkpoint;
  the EFECT bound characterizes training-convergence reproducibility, it is NOT the
  cross-stack gate.
- **§2.6 nuance (probe §9):** the spec learned-row `same-stack-same-hw =
  trajectory-divergent` (`docs/architecture.md:414`) categorizes the learned SIM
  family's multi-step trajectories; the plan §3.2.5 resolves the single-forward-pass
  inference row as bit-exact. Honor both; MEASURE at 1b, do not pre-declare.
- **Operator confirms:** two-row mixed posture + the STOP-EFECT contingency.

### D-CHECKPOINT-CONVERSION — `.safetensors` → WGSL-loadable, exact + tested ⚠

- **LEAN (new pipeline, no precedent):** `convert_checkpoint.py` reads the
  `.safetensors`, emits a WGSL-loadable artifact (flat f32 buffer + a documented
  layout doc, or JSON), with a **round-trip weights-equality test** asserting
  bit-identical weight float values pre/post; the converted artifact is verified +
  committed (LFS). A lossy conversion breaks the D↔B gate (load-bearing).
- **Operator confirms:** the conversion-must-be-exact-and-tested contract + the
  `tools/testkit/golden/checkpoints/` artifact location (new dir).

### D-VENDOR-ROLE — RESOLVED-IN-CHARTER

`references/growing-neural-ca/` vendored **READ-ONLY reference-oracle**; reimplement
the NCA update rule from the Distill paper, cite by name, do NOT import/call (§H.2,
cloth `references/SPlisHSPlasH` precedent). `references/` excluded from
end-of-file-fixer/trailing-whitespace/ruff hooks + Cat-2.

### D-VENDOR-SHA — RESOLVED-IN-CHARTER (web-re-verify at Stage 0)

Pin `google-research/self-organising-systems` **`3d5547ca48b60ecac459834e2c05c9ff5df87991`**
(default-branch HEAD; the only release tag `biomaker-v1.0.0` is a different
sub-project), license **Apache-2.0**. NO §2.18 row exists → file **A-4** (plan
§2.18) + **A-5** (spec D.3) at Stage 0. Web-re-verify the SHA + SPDX at Stage 0
(cloth precedent — verify, don't transcribe).

### D-LAYOUT — RESOLVED-IN-CHARTER (SHIFT-on-evidence at Stage 0)

**Unified `packages/neural-ca/python/` (training) + `packages/neural-ca/typescript/`
(inference)** — one sim, two halves tied by one checkpoint (ising single-package
two-language precedent; NOT RD-2D's `-stack-{b,d}` independent-port suffix; §6.6's
own one-`neural-ca/`-dir shape). §6.6 `continuous-ca/neural-ca/…` is the stale
category anchor (§0.3 SHIFT-from-discovered). Confirm the live convention at the
Stage-0 probe.

### D-TOL — RESOLVED-IN-CHARTER

**Two rows, two branches** (§S.3 `docs/conventions/sub-phase-conventions.md:1518-1544`):
`[render_similarity.continuous-ca.neural-ca]` (psnr_min/ssim_min/lpips_max — TS
inference) + `[golden_tolerance.continuous-ca.neural-ca-python]`
(golden_checkpoint_match + training_loss_distributional_bound — training). §S.2 read
`tolerance-schema.json` + one existing entry FIRST. render-similarity is the wider
learned-dynamics budget (spec §2.6); it is NOT a `[budgets.*.cross_stack]` consumer.

### D-CI — RESOLVED-IN-CHARTER

`python-strict.yml` jobs (`test-neural-ca-train`, `test-neural-ca-infer`,
`test-neural-ca-equiv`), each with a selective LFS pull for its capture(s)
(ising `test-ising-classical` precedent). `build-py.yml`/`build-ts.yml` do NOT
exist (cloth/rigid-body); §6.6 K literals = §0.3 SHIFT. `ts-strict.yml` stays
library-only (`common/common-ts`); the WGSL inference is local-only (§7.8).

### D-MANIFEST-FMT — RESOLVED-IN-CHARTER

`references/growing-neural-ca/MANIFEST.toml` (cloth/lenia precedent), not
`manifest.yaml` (§6.6 G literal = §0.3 SHIFT). Validates against
`tools/testkit/schemas/reference-manifest-v1.json`.

### D-NAMING — RESOLVED-IN-CHARTER

`neural-ca` (consistent across §3.4/§6.6/§3.1/D.1 `docs/architecture.md:2431`).
Canonical capture descriptor `growing-emoji-64sq-seed42-step1000` (D.2.3
`docs/architecture.md:2505`). The Python tolerance row uses `neural-ca-python`
(§S.3 names it). No cloth-style sim-id split needed.

### D-TAG — RESOLVED-IN-CHARTER: **NO**

Per-sub-phase tagging discontinued (operator, ising charter-v2); phase-close-only.
Stage 2 closing-sweep + landing audit stand without a tag or I7 allowlist extension.

## 7. Gate map — 13 gates PER STACK + gate-14 (cross-stack, render-similarity)

The 13 Layer-4 gates (spec §3.5 / D.6 `docs/architecture.md:2585-2606`) apply
**per stack** (D-train + B-infer). gate-14 is the **local-convention cross-stack
equivalence CI gate** (§2.6/§9.3), realized as render-similarity. **NO mutation
target** (sim, not testkit — cloth/rigid-body/ising precedent; confirm).

| Gate | Stack D (train) | Stack B (infer) |
|---|---|---|
| 1 spec sheet §6 | shared spec-ref (per-stack §5/§6) | ↩ |
| 2 probe report | done (B) | ↩ |
| 3 failing TDD + hashed evidence | train-convergence + ckpt-serialize | WGSL-infer reproduction |
| 4 golden ≥3 anchors | `golden_checkpoint_match` (L2 anchor) | D↔B anchors (see gate-14) |
| 5 Tier-1 | training-loss/bounds diagnostics | inference-bounds diagnostics |
| 6 Tier-2 | continuous-ca category diagnostics | ↩ |
| 7 citation chain (Cat 1) | Mordvintsev/Distill + Apache-2.0 vendor | ↩ |
| 8 public API (Cat 2) | training CLI / checkpoint API | inference API (TS) |
| 9 ships a replayable capture | D-inference `.h5` | B-inference `.h5` |
| 10 determinism declaration ↔ capture | training non-det / EFECT | inference bit-exact |
| 11 PBT invariants | `field_values_bounded` | `inference_determinism` |
| 12 perf-ledger row | python (PyTorch training) row | typescript (WebGPU inference) row |
| 13 replay failing tests at landing | hash-match (pytest) | hash-match (pytest-against-capture) |
| **14** | **D↔B render-similarity**: PSNR/SSIM/LPIPS measured + locked per §2.12; statistical, < floor → quality flag (§6) | |

## 8. Convention operationalization

- **§Q (LFS, `:1314-1319`):** Stage-0 first action after the anchor probe =
  `source tools/lfs/setup-lfs-s3-local.sh`; non-zero → STOP-LFS-PUSH. Objects:
  `phase-3-neural-ca.h5`, the D-inference + B-inference canonical captures, the
  `.safetensors` checkpoint, the converted WGSL artifact. Push recipe (same shell):
  GitHub `git -c lfs.standalonetransferagent= push`; R2
  `source … && git lfs push --object-id --stdin origin`. R2 back-fill by landing
  (§Q.5).
- **§R (integrity two-field, `:1408-1456`):** every audit carries
  `integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"` (stable; STOP-D only on a
  HARD_FAIL appearing or the SOFT_WARN count ≠ 14) + `integrity_digest_at_head:`
  (measured `sha256` of the FULL `integrity --all --mode strict` stderr; never
  copied). Drift in the digest is informational.
- **§S (tolerance schema, `:1501-1544`):** §S.2 read `tolerance-schema.json` + one
  existing entry BEFORE appending; §S.3 NCA = render_similarity branch + golden_tolerance
  branch (two rows). Plan §3.2.4 prose is a starting design.
- **§S.5 (post-push CI sweep, `:1577-1601`):** within ~2 min of each push, query the
  FULL workflow set at the pushed SHA (`gh run list --commit "$(git rev-parse HEAD)"
  --limit 30`); any failure on a push-to-main workflow → STOP-CI-RED. `--workflow=<name>`
  is diagnostic narrowing, not the closure check.
- **§S6 (real sha256, no placeholders):** operationalized via §R.5 (measure-don't-copy)
  + §B.6 (evidence-paths strict-verify); every audit's `evidence_hashes` uses a real
  measured sha256 or the `at-head` sentinel `verify_evidence` resolves at the audit
  commit; **never** a fabricated hash, **never** `: self` (verify_evidence rejects
  it — common-3dgs BLOCKED-audit precedent). `evidence_hashes` is a YAML **mapping**,
  not a list.
- **§H (vendoring, `:387-417`):** Stage-0 verify the MANIFEST `[upstream].sha` ==
  `3d5547ca…`, `[scope].used_by_sims` has `neural-ca`, `used_by_checks` references
  the Cat-3 check, tree exists; SHA/tree drift → BLOCK. Cite by name, derive
  independently (§H.2).
- **Convention #12 (`:74-87`):** two-commit SHA back-fill at each stage close
  (placeholder → commit → `git rev-parse HEAD` → edit → `chore(<slug>-sha-backfill)`);
  never `--amend`.
- **Convention #8:** every cite checked at assertion, not from memory (the dispatch's
  §2.9/§2.10/§2.12 and the Distill anchors were wrong — verified in probe §8/§9).

## 9. Execution-session agent prompts (operator pastes)

```
Stage 0 — neural-ca (task-6, sub-phase 3.2). ACTION #1 preflight-phase.py 3 (exit 0).
§Q.3 LFS bootstrap FIRST after probe. §R two-field anchor (0 HF / 14 SW + measured digest).
Cross-phase replay --prior-phase phase-2 (LFS-cache recovery). Vendor references/growing-neural-ca/
@ 3d5547ca… (web-re-verify SHA + Apache-2.0; §H verify; MANIFEST.toml). File A-4 (plan §2.18 row)
+ A-5 (spec D.3 row) in docs/spec-amendments-proposed.md. Ratify D-STACK-B-TEST-INFRA / D-XSTACK-METHOD
/ D-ANCHOR / D-DET / D-CHECKPOINT-CONVERSION (charter-v2 if any flips). Stage-0 audit + progress.
```

```
Stage 1 — neural-ca, single combined session 1a → 1b-D → 1b-B → 1c.
1a: packages/neural-ca/{python,typescript}/ shells + spec-ref §1-13 + RED TDD (train-converge,
ckpt-serialize, WGSL-infer-reproduce) + 2 determinism rows + 2 tolerance rows (§S.2 schema-first);
failing-output hash footer (§S6).
1b-D: PyTorch NCA training (reimplement from Distill, cite-don't-import); emit .safetensors;
MEASURE training-loss → derive EFECT bound (STOP-EFECT if underivable); D-inference capture;
PBT field_values_bounded + inference_determinism.
1b-B: WGSL inference shaders + convert_checkpoint.py (.safetensors→WGSL, round-trip weights-equality
test, EXACT); WGSL inference LOCAL on GPU host (§7.8) → committed B-inference capture.
1c: D↔B gate-14 — from render_similarity import psnr,ssim,lpips, frame-paired, MEASURE → LOCK
psnr_min/ssim_min/lpips_max per §2.12 (< floor PSNR28/SSIM0.85/LPIPS0.15 → quality flag report §6,
NOT auto-fail); equivalence.md (RD-2D template, mark STATISTICAL); perf-ledger 2 rows; schema-corpus
seed phase-3-neural-ca.h5; gate-13 replay. Per-stage audits; Convention #12 back-fill each.
```

```
Stage 2 — landing audit docs/_audits/phase-3/task-6-neural-ca.md.
§R two-field (0 HF / 14 SW invariant + measured digest); replay; append-only; verify_evidence
(incl. this sub-phase's prior stage audits, 0-fail); §S.5 FULL-workflow CI sweep green at HEAD.
Close per §2.15 (closed-with-shifted-N). NO tag (D-TAG NO). progress.md final entry.
Convention-#12 SHA back-fill.
```

## 10. Audit / report paths

| Artifact | Path |
|---|---|
| Charter (this) | `docs/phases/sub-phase-phase-3-neural-ca.md` |
| Probe report | `docs/_audits/phase-3/sub-phase-phase-3-neural-ca-probe-2026-05-29T03-43-39Z.md` |
| Plan-drafting landing audit | `docs/_audits/phase-3/sub-phase-phase-3-neural-ca-plan-drafting-2026-05-29T03-43-39Z.md` |
| Stage 0 / 1a / 1b-D / 1b-B / 1c | `…-stage-{0,1a,1b-d,1b-b,1c}-<UTC>.md` |
| Final report | `docs/_audits/phase-3/task-6-neural-ca.md` |
| progress | `docs/_audits/phase-3/progress.md` (appended) |

Front-matter: `evidence_hashes` as a YAML **mapping** (not a list); `at-head`
sentinel accepted; §R two-field. Corrigenda → `docs/spec-amendments-proposed.md`
(A-4 plan §2.18, A-5 spec D.3 — next ids after A-1/A-2/A-3).

## 11. Closing criteria & operator-ratification items

**Charter verdict (v1): SHIFTED — ready for Stage 0 with 5 operator-pending
D-classes.**

Operator-pending (ratify before Stage 0):
1. **D-STACK-B-TEST-INFRA** — confirm the committed-offline-capture realization
   (NOT WGSL-in-CI, which §7.8 forbids) satisfies gate-14. *Lean: RESOLVED — not a
   BLOCK.*
2. **D-XSTACK-METHOD** — confirm render-similarity direct-import method (not
   `compare_captures`, not the deferred harness-mode shell). *Lean: render-similarity.*
3. **D-ANCHOR** — confirm the re-shaped 3-anchor set (published Distill PSNR/SSIM
   don't exist). *Lean: training-L2 + §2.12 floors + measured-locked-D↔B.*
4. **D-DET** — confirm two-row mixed posture (training non-det/EFECT + inference
   bit-exact) + the STOP-EFECT contingency. *Lean: measure-then-declare.*
5. **D-CHECKPOINT-CONVERSION** — confirm the exact-and-tested conversion contract +
   the new `tools/testkit/golden/checkpoints/` artifact location. *Lean: round-trip
   weights-equality.*

RESOLVED-IN-CHARTER (no operator action): D-VENDOR-ROLE, D-VENDOR-SHA, D-LAYOUT,
D-TOL, D-CI, D-MANIFEST-FMT, D-NAMING, D-TAG.

Staged for Stage 0 (NOT in this plan-drafting pass): corrigenda **A-4** (plan §2.18
growing-neural-ca row, `3d5547ca…` Apache-2.0) + **A-5** (spec Appendix D.3 vendor
pin/license row); the §0.3 SHIFT-from-discovered notes (render_similarity package
path; packages/neural-ca/ layout; python-strict.yml jobs; MANIFEST.toml; Distill
anchor non-existence).

**Sub-phase closes `closed-with-shifted-N` per §2.15. No tag (D-TAG NO).**
**task-6 is TERMINAL on the produce side; the HARD dep on task-2 (render-similarity)
is SATISFIED.**

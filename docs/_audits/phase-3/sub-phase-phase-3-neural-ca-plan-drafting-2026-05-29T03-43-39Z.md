---
date: 2026-05-29
author: phase-3 neural-ca plan-drafting (Claude Code)
subject: plan-drafting landing audit — task-6 neural-ca (sub-phase 3.2); FIRST DUAL-STACK sim of Phase 3 (D PyTorch + B WGSL)
verdict: SHIFTED (charter ready for Stage 0 WITH operator routing of 5 D-classes; Stack-B-test-infra BLOCK does NOT fire)
head_sha: PENDING-BACKFILL
prior_sub_phase_landed_at: 86b0aa5
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - docs/phases/sub-phase-phase-3-neural-ca.md
  - docs/_audits/phase-3/sub-phase-phase-3-neural-ca-probe-2026-05-29T03-43-39Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-neural-ca-plan-drafting-2026-05-29T03-43-39Z.md
  - docs/_audits/phase-3/progress.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/render_similarity/metrics.py
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/determinism/registry.toml
---

# Plan-drafting landing audit — task-6 neural-ca

Sub-phase 3.2, plan §6.6. **FIRST DUAL-STACK sim of Phase 3** (Stack D PyTorch
training+inference + Stack B WGSL inference, tied by one checkpoint). First
cross-stack-equivalence gate (gate-14) of Phase 3; first learned-dynamics sim.
Trunk-based to `main`; no PR; **no tag** (D-TAG NO).

## 1. Verdict

**SHIFTED** — charter `docs/phases/sub-phase-phase-3-neural-ca.md` is ready for
Stage 0 *with five operator-pending D-classes*: **D-STACK-B-TEST-INFRA** (surfaced
for confirmation; resolved-not-BLOCK), **D-XSTACK-METHOD**, **D-ANCHOR**, **D-DET**,
**D-CHECKPOINT-CONVERSION** (load-bearing pair = D-XSTACK-METHOD + D-ANCHOR). Eight
D-classes are RESOLVED-IN-CHARTER (D-VENDOR-ROLE, D-VENDOR-SHA, D-LAYOUT, D-TOL,
D-CI, D-MANIFEST-FMT, D-NAMING, D-TAG).

## 2. ⚠ The gating result FIRST — Stack-B test infra

**The §6.6 ANCHOR-PROBE "IF NO PATTERN EXISTS: BLOCK per §5.3" clause does NOT
fire.** A consumable CI-testable Stack-B pattern exists: **pytest-against-committed-captures
+ NumPy/CPU oracle, WGSL local-only per spec §7.8** (`docs/architecture.md:1498-1500`;
ising D-HARNESS-LAYOUT `docs/phases/sub-phase-phase-3-ising-classical.md:383-421`;
`.github/workflows/python-strict.yml:227-277`, the `test-ising-classical` job). The D↔B render-similarity gate
runs in CI as a **pure-Python comparison of two committed, offline-generated
captures** (D-inference PyTorch + B-inference WGSL-on-GPU-host); CI never executes
the WGSL render (§7.8 forbids it). This is fully precedented and §7.8-compliant.
Operator confirms the realization satisfies gate-14.

## 3. Anchor (§R two-field)

- `preflight-phase.py 3` → **genuine exit 0** (8/8 PASS; F1/F2 hardened `1793b83`;
  no STOP-PREFLIGHT-NEW).
- `integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN** at `86b0aa5`;
  full-stderr digest `b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e`
  (§R measured live, not copied; matches the task-5 closing digest — the
  plan-drafting chain is docs-only and not yet committed at measurement time).
- Invariant is the **count**; the digest is informational and drifts once these
  plan-drafting docs land (new audit-log lines per §R.1).

## 4. What was produced

| Artifact | Path |
|---|---|
| Charter | `docs/phases/sub-phase-phase-3-neural-ca.md` |
| Probe report | `docs/_audits/phase-3/sub-phase-phase-3-neural-ca-probe-2026-05-29T03-43-39Z.md` |
| This audit | `docs/_audits/phase-3/sub-phase-phase-3-neural-ca-plan-drafting-2026-05-29T03-43-39Z.md` |
| progress entry | `docs/_audits/phase-3/progress.md` (appended) |

Commit cadence (mirrors tasks 4/5): probe → charter+audit+progress → Convention #12
SHA back-fill. Agent pushes the plan-drafting chain to `main` per the established
Phase-3 plan-drafting norm (common-3dgs/render-similarity/ising/rigid-body/cloth
all agent-pushed their plan-drafting chains; no tag).

## 5. Web-verify results (Convention #8 — checked, not from memory)

- **Vendor (WEB):** `google-research/self-organising-systems`, **Apache-2.0**,
  default-branch `master` HEAD **`3d5547ca48b60ecac459834e2c05c9ff5df87991`**
  (2026-01-09). Only release tag `biomaker-v1.0.0` = different sub-project → pin =
  default-branch HEAD per plan §2.18 rule. **NO §2.18 row + NO spec D.3 row** exist
  → corrigenda A-4 (plan) + A-5 (spec) staged for Stage 0.
- **Anchors (WEB, decisive):** Distill 2020 uses pixel-wise **L2 loss on RGBA**,
  publishes **NO PSNR/SSIM/LPIPS** values. Plan §6.6 v9 Anchor-1/Anchor-2 "published
  metrics" **do not exist** → D-ANCHOR re-shapes (training-L2 + §2.12 floors +
  measured-locked-D↔B); §0.3 SHIFT-from-discovered (report §1 at execution).

## 6. Citation corrections surfaced (do NOT carry the dispatch's cites verbatim)

- "Gate 14" is **not** a spec gate — spec §3.5/D.6 define 13 gates; cross-stack is a
  CI gate (§2.6/§9.3) + local convention (`docs/architecture.md:832-854`, `:2585-2606`).
- Dispatch §2.9/§2.10/§2.12 "LOCK/floor" map to **plan §6.6** (`docs/phases/phase-3-plan.md:1781-1784`)
  + spec **§2.6 Tolerance budget** (`docs/architecture.md:418-445`), NOT architecture.md
  §2.9 (Pre-impl probes) / §2.10 (Layer0→N gate) / §2.12 (Schema-bump). Citing the
  latter HARD_FAILs Cat 4.
- §2.6 learned row `same-stack-same-hw = trajectory-divergent` vs plan §3.2.5
  inference `bit-exact` — reconciled in D-DET (category-trajectory vs single-forward-pass).
- `render_similarity` is a **package** (`tools/testkit/render_similarity/`), not
  `equivalence/render_similarity.py`; `harness_mode.run` is a Stage-1a shell.
- §S6 is not a section (S.1–S.5); = §R.5 + §B.6.

## 7. D-class routing summary (leans)

| D-class | Status | Lean |
|---|---|---|
| D-STACK-B-TEST-INFRA ⚠ | operator-confirm | NOT a BLOCK — committed-offline-capture + CI render-similarity |
| D-XSTACK-METHOD ⚠ | operator | render-similarity direct metric import (not compare_captures / not harness-mode shell) |
| D-ANCHOR ⚠ | operator | re-shaped 3-anchor (training-L2 + §2.12 floors + measured-locked-D↔B); published metrics don't exist |
| D-DET ⚠ | operator | 2 rows (training non-det/EFECT + inference bit-exact); measure-then-declare; STOP-EFECT contingency |
| D-CHECKPOINT-CONVERSION ⚠ | operator | exact + round-trip-tested `.safetensors`→WGSL; new `golden/checkpoints/` dir |
| D-VENDOR-ROLE | resolved | read-only oracle; reimplement from Distill (cite-don't-import) |
| D-VENDOR-SHA | resolved | `3d5547ca…` Apache-2.0; A-4/A-5 at Stage 0 |
| D-LAYOUT | resolved | unified `packages/neural-ca/{python,typescript}/` (ising precedent) |
| D-TOL | resolved | 2 rows: `[render_similarity.continuous-ca.neural-ca]` + `[golden_tolerance.continuous-ca.neural-ca-python]` |
| D-CI | resolved | `python-strict.yml` jobs; WGSL local-only (§7.8) |
| D-MANIFEST-FMT | resolved | `MANIFEST.toml` |
| D-NAMING | resolved | `neural-ca`; capture `growing-emoji-64sq-seed42-step1000` |
| D-TAG | resolved | NO |

## 8. HARD RULE 2 / BLOCK surfaces

- **No active BLOCK.** The one BLOCK-risk (Stack-B test infra) is resolved-not-fired
  (§2).
- **STOP-EFECT** (Stage 1b-D contingency, not now): if the training-loss EFECT bound
  cannot be derived (no prior Phase-3 sim derived one), re-characterize per ising's
  STOP-DET template and surface to operator. Not a hard stop if the bound is
  derivable.
- **STOP-LFS-PUSH** (Stage-0 §Q contingency): if `setup-lfs-s3-local.sh` returns
  non-zero, surface (do not revert).

## 9. Gate map + dependency

- 13 gates **per stack** (D-train + B-infer) + gate-14 render-similarity (charter §7).
  No mutation target (sim). No USD (not a Stack-E mandate surface for this sim's
  scope).
- **task-2 → task-6 HARD dep SATISFIED** (`from render_similarity import psnr, ssim,
  lpips`; render-similarity landed `closed-with-shifted-1`). **task-6 TERMINAL on
  produce** (plan §3.1 `:328`).

## 10. Provenance

Authority precedence: spec (`docs/architecture.md`) → plan §6.6
(`docs/phases/phase-3-plan.md`) → conventions
(`docs/conventions/sub-phase-conventions.md`) → sibling charters (cloth/ising/rigid-body).
Sibling structure mirrored: cloth (vendoring + measure-then-declare + verify-cites),
ising (non-determinism-by-design / EFECT / Stack-B pytest-against-captures),
rigid-body (D-routing + stage-cadence + closing format). All claims tagged
FACT/INFERENCE/WEB with full repo-relative `path:line`. STOP — no Stage 0/1/2.

---
date: 2026-05-29T12-54-44Z
author: phase-3 pinn-poisson stage-0 (Claude Code)
subject: Phase 3 seventh sub-phase (task-7 pinn-poisson, FIRST learned-dynamics CATEGORY) — STAGE 0 preflight + integrity + LFS bootstrap + cross-phase replay + verify_evidence sweep + Warp-PyTorch interop re-probe + physicsnemo-sym vendor + A-6 + charter D-class flip RESOLVED v2
verdict: CONFIRMED
head_sha: 43962c5
anchor_sha: f3e65f9e9817867454b50423ea7a498d96c9b7d1
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-WARP-TORCH-INTEROP RESOLVED-v2-WORKS / D-ANCHOR-SET RESOLVED-v2 / D-DET RESOLVED-v2-measure-at-1b-PINN / D-VENDOR-SHA-ROLE RESOLVED-v2-A6 / D-MUTATION RESOLVED-v2-defer-task-9 / D-USD-D-TOL-D-LAYOUT-D-CI-D-MANIFEST-FMT-D-NAMING-D-CAPTURE-DESC-D-TAG resolved-in-charter
evidence_paths:
  - docs/phases/sub-phase-phase-3-pinn-poisson.md
  - docs/spec-amendments-proposed.md
  - references/PhysicsNeMo-PINN/MANIFEST.toml
  - references/PhysicsNeMo-PINN/examples/helmholtz/helmholtz.py
  - docs/phases/phase-3-plan.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
  - tools/testkit/probes/reports/pinn-poisson.md
evidence_hashes:
  docs/phases/sub-phase-phase-3-pinn-poisson.md: sha256:9705cf3c9c110f371609d70ce6f2dec24f4542e0e9c637bd63a01b0ce3d494aa
  docs/spec-amendments-proposed.md: sha256:e124830bf2559345281578dce030efaf14e7086a2c843be991bb7b19e54d0c6f
  references/PhysicsNeMo-PINN/MANIFEST.toml: sha256:79605ce62eb9009847a5253adc437da6a2524f809c55f6cd32d4b80c7311d6e7
  references/PhysicsNeMo-PINN/examples/helmholtz/helmholtz.py: sha256:e4799b9e5f7de5553ceb6642c9222a9fea1519a84ce16a3aaf7b498fae81e4fd
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
  tools/testkit/probes/reports/pinn-poisson.md: sha256:f3fe952fb19a7e1cdb61875eed9c458295c8d223f3cfddc1c4ed416359d817a5
---

# Phase 3 — sub-phase pinn-poisson — Stage 0 audit

> Pre-flight for the **first learned-dynamics-CATEGORY** sim (task-7, sub-phase 3.6):
> state checks, integrity anchor probe (§R two-field), LFS bootstrap (§Q), cross-phase
> replay, verify_evidence sweep, **live Warp↔PyTorch interop re-probe** (BLOCK gate),
> **physicsnemo-sym v2.4.0 read-only vendor + MANIFEST.toml**, **corrigendum A-6**, and
> the operator-ratified **D-class flip OPERATOR-PENDING → RESOLVED v2**. Verdict
> **CONFIRMED** — Stage 1a (scaffold + RED) is now safe to dispatch.

## § 1 — Anchor probe (FACT)

| Check | Expectation | Result |
|---|---|---|
| `uv run python tools/dispatch/preflight-phase.py 3` | exit 0 | **exit 0** — all preflight checks PASS (prior-phase-tag, common-warp paths, four §11.3-port packages, integrity-all-green) |
| `uv run python -m integrity --all --mode strict` | `0 HARD_FAIL / 14 SOFT_WARN` | **PASS** — `summary: 0 HARD_FAIL, 14 SOFT_WARN` |
| integrity full-report sha256 (§R measure-don't-copy) | measured live (NOT copied; drifts as golden tables added) | **`b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e`** — measured live; equals the charter-HEAD value because the *finding set* is unchanged (the digest is a function of HARD_FAIL/SOFT_WARN findings, not file contents) |
| working tree clean after Stage-0 commits | yes | yes (commits `f800cee`, `f3e65f9`) |
| invariants I1–I7 | hold | hold (integrity sweep covers I1–I6; I7 no-agent-tags unaffected — no new tag) |

**Conclusion (FACT).** Preflight exit 0; integrity invariant **0 HARD_FAIL / 14 SOFT_WARN**
holds; digest measured live (not copied) per §R.

## § 2 — LFS bootstrap (§Q — FIRST action after anchor probe) (FACT)

`source tools/lfs/setup-lfs-s3-local.sh` → **exit 0**:
`lfs-s3 ready: /home/otacon/.local/bin/lfs-s3 | endpoint=…r2.cloudflarestorage.com
bucket=bit-physics-lfs region=auto`. No STOP-LFS-PUSH. This sub-phase ships LFS objects
(the inference `.h5` capture, the trained checkpoint, the schema-corpus fixture); each
`git lfs push` at Stage 1b/1c/2 MUST be in the **same shell command** as the bootstrap
(ising root-cause — fresh shells don't inherit the creds env).

## § 3 — Cross-phase replay (FACT)

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-2 \
  --audit docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```
→ **8/8 gates PASS**, `summary: prior_phase=v0.2.0-phase-2 ok=True`. LFS-cache recovery
not needed (replay gates do not smudge captures).

## § 4 — verify_evidence sweep (FACT — no-regression)

Swept **all phase-3 audit files** (excluding `progress.md`) with
`python -m integrity.scripts.verify_evidence --audit <f>`: **55 pass / 7 fail**.

The **7 fails are PRE-EXISTING** and unrelated to this sub-phase:
- Establishing the baseline by stashing this Stage-0's only tracked edit
  (`docs/spec-amendments-proposed.md`) and re-running the sweep yields the **identical
  7 fails** → zero regression introduced by Stage 0.
- **None** of the 7 failing audits reference `docs/spec-amendments-proposed.md` (the only
  tracked file Stage 0 modified before this audit) in their `evidence_paths` —
  grep-confirmed.
- The fails are the known "evidence pinned to a historical `head_sha`" pattern (FACT-tagged
  cites of untracked files / `at-head` entries that no longer resolve at the current HEAD):
  the lenia-mypy-strict-fix, ising-classical {harness-investigation, plan-drafting, probe},
  and rigid-body {plan-drafting, preflight-drift, probe} audits.

**Conclusion (FACT).** No-regression: Stage 0 adds zero new verify_evidence failures.

## § 5 — Warp↔PyTorch interop re-probe (BLOCK gate — FACT)

Re-probed live on the installed **Warp 1.13.0 / PyTorch 2.12.0+cu130** (CPU; no CUDA driver):

| Check | Result |
|---|---|
| `wp.from_torch(t)` (f64, 3×4) → device / dtype / shape | `cpu` / `warp.float64` / `(3, 4)` |
| round-trip `torch.equal(t, wp.to_torch(arr))` | **True** (bit-identical) |
| zero-copy `t.data_ptr() == arr.ptr` | **True** (shared storage) |
| `np.array_equal(t.numpy(), wp.to_torch(arr).numpy())` | **True** |

**WORKS — no BLOCK.** CPU zero-copy, f64-preserving, bit-identical round-trip. The
torch→wp Capture bridge (`wp.from_torch(field)` → `Capture` → `write_capture`) is the
inference-capture path. GPU zero-copy untestable (no CUDA driver) but off the critical
path — this is a **CPU-only** "Stack E" run (documented in the spec-ref CPU-scope note).

## § 6 — physicsnemo-sym vendor (D-VENDOR-* RESOLVED v2) (FACT)

Web-re-verified (Convention #8 — at assertion):

| Item | Verified value | How |
|---|---|---|
| Upstream | `NVIDIA/physicsnemo-sym` | GitHub |
| Latest stable release | **v2.4.0** | `gh api repos/NVIDIA/physicsnemo-sym/releases` |
| Tag → commit SHA | **`acaeb6dc38ecda58559b5286d3cb743e8cf930d3`** | `gh api repos/NVIDIA/physicsnemo-sym/git/refs/tags/v2.4.0` (lightweight tag → commit) |
| License | **Apache-2.0** | vendored `LICENSE.txt` (`Apache License Version 2.0`) |
| PINN example | `examples/helmholtz/{helmholtz.py, helmholtz_hardBC.py, helmholtz_ntk.py}` | `gh api …/contents/examples/helmholtz?ref=acaeb6dc…` |

Vendored **read-only** to `references/PhysicsNeMo-PINN/` (commit `f800cee`):
`LICENSE.txt`, `UPSTREAM_README.md`, `examples/helmholtz/helmholtz.py`,
`examples/helmholtz/helmholtz_hardBC.py`, `MANIFEST.toml` (5 citation anchors; core
tables validate against `tools/testkit/schemas/reference-manifest-v1.json`). LFS data
assets (NGC validation CSVs) deliberately NOT fetched (sparse-checkout) — minimal
footprint. `references/` is read-only and excluded from end-of-file-fixer /
trailing-whitespace / ruff hooks (verified `.pre-commit-config.yaml` `exclude:
^references/`).

**Role:** READ-ONLY reference-oracle. The `helmholtz.py` soft-constraint PINN (Helmholtz
at k=0 = Poisson) cross-checks our Raissi-2019 reimplementation methodology at derivation
time only — NOT pip-installed / NOT runtime-linked (spec §H.2 cite-don't-import).

## § 7 — Corrigendum A-6 (FACT)

Filed by **appending** to `docs/spec-amendments-proposed.md` (A-1..A-5 untouched; commit
`f3e65f9`). A-6 corrects spec Appendix D.3 (`docs/architecture.md:2553`):
1. **Wrong repo** — PINN/elliptic-PDE tutorials live in `physicsnemo-sym`, not the core
   `NVIDIA/physicsnemo` repo (the core repo has no `examples/helmholtz`).
2. **Stale pin** — `<latest 1.x>` no longer current: core 1.x ended at **v1.3.0**, latest
   **v2.1.0** (verified `gh api repos/NVIDIA/physicsnemo/releases`: 1.x = {v1.0.0, v1.0.1,
   v1.1.0, v1.1.1, v1.2.0, v1.3.0}).

The §2702 "1.x → 2.0 BLOCKED" rule is a **runtime-link** rule and does not bind a
read-only vendor. The related plan §2.18 defect (`docs/phases/phase-3-plan.md:293-300`
pins the core repo + names `manifest.yaml`) is **deferred to the operator** (A-4 pattern;
agent does NOT edit the plan per §0.3).

## § 8 — D-class flip (charter v2 — FACT)

Charter `docs/phases/sub-phase-phase-3-pinn-poisson.md` flipped to **v2** (commit
`f3e65f9`): the five operator-ratified D-classes moved OPERATOR-PENDING → **RESOLVED**:

| D-class | RESOLVED outcome |
|---|---|
| **D-WARP-TORCH-INTEROP** | WORKS (re-probed §5); no BLOCK |
| **D-ANCHOR-SET** | 3 anchors/table: Anchor 1 Evans §2.2, Anchor 2 Strauss §6.2 (SHIFT), Anchor 3 MMS `f≠0` (REQUIRED); FD = numerical baseline anchored to analytic |
| **D-DET** | two registry rows; MEASURE-then-declare at 1b-PINN; EFECT NOT the acceptance gate |
| **D-VENDOR-SHA/ROLE** | physicsnemo-sym v2.4.0 read-only vendored (§6); A-6 filed (§7) |
| **D-MUTATION** | DEFER FD-reference mutation target to task-9 (rule-of-three) |

Resolved-in-charter (unchanged): D-USD (DEFER), D-TOL (schema pre-baked), D-LAYOUT
(`packages/pinn-poisson/`), D-CI (`python-strict.yml`), D-MANIFEST-FMT (`MANIFEST.toml`),
D-NAMING/D-CAPTURE-DESC (`poisson-sine-source-64sq-seed42-step1`), D-TAG (NO).

## § 9 — Verdict

**CONFIRMED.** Preflight exit 0; integrity 0 HF / 14 SW; LFS bootstrap clean; replay
ok=True 8/8; verify_evidence no-regression; Warp↔PyTorch interop WORKS (no BLOCK);
physicsnemo-sym v2.4.0 vendored read-only + MANIFEST; A-6 filed; charter D-classes flipped
RESOLVED v2. **Stage 1a (scaffold + RED) is safe to dispatch.** No tag (D-TAG NO).

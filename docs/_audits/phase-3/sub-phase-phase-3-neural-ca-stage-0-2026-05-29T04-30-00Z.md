---
date: 2026-05-29
author: phase-3 neural-ca execution Stage 0 (Claude Code)
subject: Phase 3 sixth sub-phase (task-6 neural-ca, FIRST DUAL-STACK + FIRST cross-stack-gate-14 SIM of Phase 3) — STAGE 0 pre-flight + ratified-D charter flip (OPEN→RESOLVED v2) + A-4/A-5 corrigenda + growing-neural-ca vendoring + §Q R2 bootstrap + integrity baseline + cross-phase replay + verify_evidence sweep
verdict: CONFIRMED
head_sha: PLACEHOLDER-STAGE-0-AUDIT
prior_sub_phase_landed_at: 86b0aa5
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
d_class_status: >
  D-STACK-B-TEST-INFRA RESOLVED(operator-ratified: NOT a BLOCK; committed-offline-capture; no WGSL-in-CI §7.8) /
  D-XSTACK-METHOD RESOLVED(operator-ratified: render-similarity direct-import, NOT compare_captures) /
  D-ANCHOR RESOLVED(operator-ratified: re-shaped 3-anchor set; Distill PSNR/SSIM verified non-existent — L2-only) /
  D-DET RESOLVED(operator-ratified: two rows measure-then-declare EFECT + STOP-EFECT contingency) /
  D-CHECKPOINT-CONVERSION RESOLVED(operator-ratified: exact round-trip weights-equality; lossy → HARD RULE 2) /
  D-VENDOR-ROLE RESOLVED(read-only oracle, cite-don't-import §H.2) /
  D-VENDOR-SHA RESOLVED(3d5547ca… Apache-2.0 web-re-verified) /
  D-LAYOUT RESOLVED(packages/neural-ca/{python,typescript}/) /
  D-TOL RESOLVED(render_similarity + golden_tolerance branches) / D-CI RESOLVED(python-strict.yml) /
  D-MANIFEST-FMT RESOLVED(MANIFEST.toml) / D-NAMING RESOLVED(neural-ca) / D-TAG LOCKED(NO)
evidence_paths:
  - docs/phases/sub-phase-phase-3-neural-ca.md
  - docs/spec-amendments-proposed.md
  - references/growing-neural-ca/MANIFEST.toml
  - references/growing-neural-ca/LICENSE
  - references/growing-neural-ca/notebooks/growing_ca.ipynb
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
  - tools/lfs/setup-lfs-s3-local.sh
evidence_hashes:
  docs/phases/sub-phase-phase-3-neural-ca.md: sha256:6726f292505e34f00ea1be1ee6be3cc186d3c47efe6fd856de605f9ac2344e81
  docs/spec-amendments-proposed.md: sha256:d42d86c1ce86bba5cff4e42349328cd97b9ae58c3176cfd2517bcd08d7820e99
  references/growing-neural-ca/MANIFEST.toml: sha256:92c4e026429977891f20f3befa9fffc9e594f7999553d56436e76f2b46c3be4a
  references/growing-neural-ca/LICENSE: sha256:58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd
  references/growing-neural-ca/notebooks/growing_ca.ipynb: sha256:b53f365fce70d59aa1c8936f1e1f600625957d4a6d14d69dd9821e7d00583928
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/architecture.md: sha256:97e70bad3f82800e0c28fb0d28d98ee81fddc5d504a81d68d66dee03d0e4703a
  docs/conventions/sub-phase-conventions.md: sha256:10734948cd03c4bb5699010063be76e09f307eb33302707c4d4f3652cc829bd7
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
  tools/lfs/setup-lfs-s3-local.sh: sha256:c4ff80e361134a1b48e3e30fc2f57ada0945d416ffb20fd04d6f2a6552d92f65
---

# Phase 3 — sub-phase neural-ca (task-6) — Stage 0 audit

> Pre-flight for the **sixth Phase-3 sub-phase** and the **FIRST dual-stack SIM**
> (Stack D PyTorch training + Stack B custom-WGSL inference, tied by ONE checkpoint)
> and the **FIRST cross-stack gate-14 SIM** of Phase 3: anchor probe (§R live
> re-measure), §Q.3 R2-LFS bootstrap, cross-phase replay (`--prior-phase phase-2`),
> verify_evidence sweep, growing-neural-ca vendoring @ `3d5547ca…` (Apache-2.0
> web-re-verified), A-4/A-5 corrigenda routing, operator-ratified D-class
> resolution + charter flip OPEN→RESOLVED (v2). Verdict **CONFIRMED** — Stage 1a
> (scaffold + RED, both stacks) unblocked.

## ACTION 1 — pre-flight (charter §5)

`uv run python tools/dispatch/preflight-phase.py 3` → **exit 0** (genuine; hardened
`1793b83`). All checks PASS: prior-phase-tag `v0.2.0-phase-2`, `common/common-warp`,
`docs/common/warp.md`, the four phase-2 package paths, `integrity-all-green`. No
STOP-PREFLIGHT-NEW.

## ACTION 2 — anchor probe (§R two-field, measure-don't-copy)

`uv run python -m integrity --all --mode strict` → **`summary: 0 HARD_FAIL, 14
SOFT_WARN`** (exit 0). The **count-invariant `0 HARD_FAIL / 14 SOFT_WARN` HOLDS**
(the §R load-bearing field). The 14 SOFT_WARN are the long-standing phase-0/phase-1
audit-hygiene artifacts (FACT-cites not in evidence_paths; malformed front-matter on
`ledger.md`/`progress.md`-style files; stale evidence_paths entries) — unchanged.

- `integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN` (the stable assertion).
- `integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e`
  (measured `sha256` of the FULL `integrity --all --mode strict` **stderr**, 6108
  bytes, re-measured this Stage 0 — NOT copied; per `L-R2CD-1` the digest drifts and
  is informational, the **counts** are the invariant). Re-confirmed unchanged after
  vendoring `references/growing-neural-ca/` (the vendored tree adds no integrity
  warning).

## ACTION 3 — §Q.3 LFS bootstrap (FIRST after the probe)

`source tools/lfs/setup-lfs-s3-local.sh` → exit 0:
`lfs-s3 ready: …/lfs-s3 | endpoint=…r2.cloudflarestorage.com bucket=bit-physics-lfs
region=auto`. No STOP-LFS-PUSH. NCA will ship `.h5` captures + the `.safetensors`
checkpoint + the converted WGSL artifact (all LFS-touching) at Stages 1b/1c; the R2
push + same-shell back-fill recipe (§Q.5) applies there.

## ACTION 4 — cross-phase replay (`--prior-phase phase-2`)

`uv run python -m integrity.scripts.replay_prior_phase --prior-phase phase-2 --audit
docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md --gates
integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`
→ **`summary: prior_phase=v0.2.0-phase-2 ok=True`, 8/8 gates PASS**. No LFS-cache
recovery needed (clean pass).

## ACTION 5 — verify_evidence sweep across prior phase-3 audits

Full `docs/_audits/phase-3/*.md` sweep (55 files): **47 pass / 8 fail**. The 8
failures are the **identical pre-existing audit-hygiene baseline** the rigid-body
Stage-0 audit (`…rigid-body-stage-0…`) reported (then 33/8 over 41 files) — **none
caused by task-6 work** (zero repo content changed before the sweep ran):

| Audit | Failure class |
|-------|---------------|
| `progress.md` | not an audit — no YAML front-matter by design |
| `…ising-classical-{probe,plan-drafting,harness-investigation}.md`; `…rigid-body-plan-drafting.md` | literal `at-head` in `evidence_hashes` (no `at-head` resolution in `verify_evidence.py`) |
| `…rigid-body-{probe,preflight-drift}.md` | self-referential `head_sha` chicken-egg (pinned prior-commit SHA) |
| `lenia-mypy-strict-fix.md` | stale `python-strict.yml` hash (legitimately edited later by `d546ace`) |

**Routing:** the established **audit-citation-hygiene** cluster (`L-R2CD-1`), NOT
owned by task-6. **Decision for THIS sub-phase's audits:** real measured sha256 in
`evidence_hashes` (the empirically-clean pattern of all landed Stage-0 audits), never
the `at-head` literal. (This audit follows it — all 10 evidence_hashes are real
measured sha256.)

## ACTION 6 — vendor `references/growing-neural-ca/` @ `3d5547ca…` (§H, D-VENDOR-SHA)

- **Web-re-verify (Convention #8):** `gh api repos/google-research/self-organising-systems
  --jq .license.spdx_id` → **`Apache-2.0`**; `gh api …/commits/3d5547ca48b60ecac459834e2c05c9ff5df87991`
  → exists on the default branch (authored **2026-01-09**, "Replace unicode escaped
  characters in ipynb files"). License unchanged → no BLOCKED.
- **Vendored (read-only, hook-excluded `^references/`):** `LICENSE` (Apache-2.0,
  11357 B), `UPSTREAM_README.md` (from `README.md`), `notebooks/growing_ca.ipynb`
  (the canonical Distill "Growing Neural Cellular Automata", Mordvintsev et al. 2020,
  41132 B), `MANIFEST.toml`.
- **§H field verification:** MANIFEST `[upstream].sha == 3d5547ca…` ✓;
  `[scope].used_by_sims == ["continuous-ca/neural-ca"]` ✓; `[scope].used_by_checks ==
  ["cat1.upstream-citation"]` ✓; license `Apache-2.0` ✓; tree exists ✓. The core
  tables (`upstream`/`scope`/`vendoring`) VALIDATE against
  `tools/testkit/schemas/reference-manifest-v1.json`.
- **§0.3 SHIFT (documentary):** the `[[citations]]` array is **not** schema-enforced
  (`load_reference_manifest` is called only by unit tests, NOT by any integrity
  check; the schema's `additionalProperties:false` rejects `citations`), yet all four
  prior manifests (lenia, cloth, 3DGS, SPlisHSPlasH) include it. I mirror that
  established convention (7 citation anchors for the NCA update rule); integrity stays
  0 HF / 14 SW with the vendored tree staged.
- **D-ANCHOR Stage-0 verification (Convention #8 — decisive):** the vendored notebook
  trains with `loss_f(x) = tf.reduce_mean(tf.square(to_rgba(x)-pad_target))`
  (pixel-wise **L2 / MSE** on RGBA) and contains **zero** occurrences of
  psnr/ssim/lpips. The plan §6.6-v9 "published Distill PSNR/SSIM anchors" are
  **fabricated** → the re-shaped 3-anchor set (golden_checkpoint_match L2 + §2.12
  floors + measured-locked D↔B) stands; the cross-stack gate is necessarily
  STATISTICAL.

## ACTION 7 — corrigenda A-4 + A-5

Appended to `docs/spec-amendments-proposed.md` (existing A-1/A-2/A-3 preserved):

- **A-4** — plan §2.18 external-SHA registry: ADD the missing `growing-neural-ca`
  (task-6) pin row (`3d5547ca…`, Apache-2.0, HEAD-on-main). §2.18 claims it resolves
  "all five" upstreams but has no NCA row.
- **A-5** — spec Appendix D.3 vendored-dependency-pins: ADD the growing-neural-ca row.

**Principled pin-policy difference (intentional, NOT an inconsistency):**
growing-neural-ca pins **HEAD-on-main** per D.3's research-repo policy (the only
release tag, `biomaker-v1.0.0`, is a distinct sub-project), unlike A-3's Bender
tagged-stable-release.

## ACTION 8 — D-class flip + charter v2

The five formerly operator-pending D-classes (D-STACK-B-TEST-INFRA, D-XSTACK-METHOD,
D-ANCHOR, D-DET, D-CHECKPOINT-CONVERSION) flipped **OPEN→RESOLVED** in charter §6/§11
with the operator-ratified outcomes; front-matter `version: charter-v2` + a revision
entry recorded. PBT regime-scoping carried into §6 D-DET (`field_values_bounded`
scoped to visible/clamped RGBA ∈ [0,1] or full-state finiteness — NOT all-16-channels).

## Verdict

**CONFIRMED.** All Stage-0 preconditions discharged: preflight exit 0; integrity
invariant `0 HF / 14 SW` held (digest `b7460150…`); LFS bootstrap clean; replay
`ok=True` 8/8; growing-neural-ca vendored + web-re-verified Apache-2.0 (§H fields
pass); A-4/A-5 filed; all five D-classes ratified RESOLVED (charter v2). **Stage 1a
(scaffold + RED, both stacks) unblocked.**

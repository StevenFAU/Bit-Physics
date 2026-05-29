---
date: 2026-05-29T02-13-02Z
author: phase-3 mass-spring-cloth stage-0 (Claude Code)
subject: Phase 3 sixth sub-phase (task-5 mass-spring-cloth, first NEW Stack-C SIM of Phase 3) — STAGE 0 pre-flight + ratified-D charter flip (OPEN→RESOLVED v2) + A-2/A-3 corrigendum routing + Bender 2.2.0 vendoring + §Q R2 bootstrap + integrity baseline + cross-phase replay + verify_evidence sweep
verdict: CONFIRMED
head_sha: 2eb8c2d
prior_sub_phase_landed_at: be3e468
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3
d_class_status: D-VENDOR-ROLE RESOLVED(read-only oracle + reimplement Macklin 2016) / D-VENDOR-SHA RESOLVED(2.2.0 aa62c44f latest-stable; §2.18 → A-3) / D-DET RESOLVED(measure 1b; default bit-exact lavapipe serial GS) / D-ANCHOR RESOLVED(corrected catenary cites + LIMIT regime) / D-PBT RESOLVED(length_bounded_above + momentum_conservation_free_no_gravity; subprocess-capture wiring) / D-LAYOUT LOCKED(packages/mass-spring-cloth/) / D-CI RESOLVED-IN-CHARTER(cpp-strict.yml) / D-MANIFEST-FMT RESOLVED-IN-CHARTER(MANIFEST.toml) / D-TOL RESOLVED-IN-CHARTER(golden_tolerance §S.3) / D-CAPTURE-API RESOLVED-IN-CHARTER(C++ Hdf5Writer) / D-NAMING RESOLVED(mass-spring-cloth; A-2) / D-TAG LOCKED(NO)
evidence_paths:
  - docs/phases/sub-phase-phase-3-mass-spring-cloth.md
  - docs/spec-amendments-proposed.md
  - references/PositionBasedDynamics/MANIFEST.toml
  - references/PositionBasedDynamics/README.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
  - tools/lfs/setup-lfs-s3-local.sh
evidence_hashes:
  docs/phases/sub-phase-phase-3-mass-spring-cloth.md: sha256:dea81c0aba0d7f67d314d4015a0af3a530173caeec9b242bb13fc6ada0291233
  docs/spec-amendments-proposed.md: sha256:70963efc065944c75886ac2ba512a4ee6c747a3d72c401144968babc4185772e
  references/PositionBasedDynamics/MANIFEST.toml: sha256:8a24c43f965f844b9351b238a474994eeded7f9937899f49aa784aa5ee221379
  references/PositionBasedDynamics/README.md: sha256:d46d5319919e0169deb2c12ef997340e7b8ec164c48192d00d313c09a3334ec7
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
  tools/lfs/setup-lfs-s3-local.sh: sha256:c4ff80e361134a1b48e3e30fc2f57ada0945d416ffb20fd04d6f2a6552d92f65
---

# Phase 3 — sub-phase mass-spring-cloth (task-5) — Stage 0 audit

> Pre-flight for the **sixth Phase-3 sub-phase** and the **first NEW Stack-C
> (Vulkan/C++20) SIM of Phase 3** (RD-2D-Stack-C is a Phase-1 *port*): anchor
> probe (§R live re-measure), operator-ratified D-class resolution + charter flip
> OPEN→RESOLVED (v2), A-2/A-3 corrigendum routing, §Q.3 R2-LFS bootstrap,
> cross-phase replay (`--prior-phase phase-2`), verify_evidence sweep, and Bender
> 2.2.0 read-only vendoring. Verdict **CONFIRMED** — Stage 1a (scaffold + RED)
> unblocked.

## ACTION 1 — pre-flight

- `uv run python tools/dispatch/preflight-phase.py 3` → **genuine exit 0**; all 8
  checks PASS (prior-phase-tag `v0.2.0-phase-2`, `common/common-warp`,
  `docs/common/warp.md`, all four Phase-2 ports, integrity-all-green). [FACT]

## ACTION 2 — anchor probe (§R two-field, measure-don't-copy)

- `uv run python -m integrity --all --mode strict` → **0 HARD_FAIL / 14
  SOFT_WARN** (the env-independent invariant). [FACT]
- Live-measured digest (sha256 of the full `--all --mode strict` stderr report):
  `f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3` at the
  Stage-0 anchor `e9e83a0`. Matches the charter's `be3e468` measurement — the
  intervening commits (`9aed22f`, `e9e83a0`) were docs-only SHA back-fill, no
  integrity-scanned-surface change. **Measured live, not copied** (§R). The digest
  is informational and WILL drift this sub-phase (new golden tables + fixture +
  vendored reference); the count is the invariant. [FACT]

## ACTION 3 — §Q.3 R2-LFS bootstrap (FIRST after probe)

- `source tools/lfs/setup-lfs-s3-local.sh` → exit 0, `lfs-s3 ready` (endpoint +
  bucket `bit-physics-lfs` resolved). No STOP-LFS-PUSH. This sub-phase commits a
  new `.h5` fixture + the 128×128 canonical capture → LFS-touching, so the
  bootstrap is the Stage-0 first action after the probe. [FACT]

## ACTION 4 — cross-phase replay (`--prior-phase phase-2`)

- `uv run python -m integrity.scripts.replay_prior_phase --prior-phase phase-2
  --audit docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md --gates
  integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`
  → `summary: prior_phase=v0.2.0-phase-2 ok=True`, **8/8 gates PASS**. No
  STOP-REPLAY; LFS-cache recovery NOT required. [FACT]

## ACTION 5 — verify_evidence sweep across prior phase-3 audits

Full `docs/_audits/phase-3/*.md` sweep (48 files): **40 pass / 8 fail**. The 8
failures are the **same pre-existing audit-citation-hygiene artifacts**
characterized in the task-4 Stage-0 audit — **zero caused by task-5** (no repo
content changed before this sweep ran):

| Audit | Failure class |
|-------|---------------|
| `progress.md` | not an audit — no YAML front-matter by design |
| `sub-phase-phase-3-ising-classical-{probe,plan-drafting,harness-investigation}.md`; `sub-phase-phase-3-rigid-body-plan-drafting.md` | literal `at-head` in `evidence_hashes` — `verify_evidence.py` has no `at-head` resolution branch, so it always mismatches the real sha256 |
| `sub-phase-phase-3-rigid-body-probe.md`; `sub-phase-phase-3-rigid-body-preflight-drift.md` | self-referential `head_sha` chicken-egg (audit references itself at a pinned prior-commit SHA) |
| `lenia-mypy-strict-fix.md` | stale `python-strict.yml` hash (workflow legitimately edited later by `d546ace`) |

The pass count rose 33→40 vs task-4's sweep (task-4 added its own clean stage
audits) — the **no-regression** signal. Routing: established
**audit-citation-hygiene** cluster (per L-R2CD-1), NOT owned by task-5.
**Decision for THIS sub-phase's audits:** use **real measured sha256** (never the
`at-head` literal — the empirically-clean pattern). [FACT]

## ACTION 6 — Bender PositionBasedDynamics vendoring (D-VENDOR-ROLE + D-VENDOR-SHA)

- **SHA re-verified live (D-VENDOR-SHA):** `gh release view -R
  InteractiveComputerGraphics/PositionBasedDynamics` → latest stable release
  **`2.2.0`** (published 2022-12-13); `gh api …/git/refs/tags/2.2.0` → commit
  `aa62c44f0d43956452e1f960a40333ec2d6d3ea5` (lightweight tag → commit directly);
  `gh api …/license --jq .license.spdx_id` → **MIT**. Spec Appendix D.3
  (`docs/architecture.md:2552`) mandates "Latest stable" via `gh release view` —
  satisfied. [FACT]
- **§2.18 discrepancy (Hard-Rule-2 surfaced, NOT silently adapted):** the
  phase-3-plan §2.18 registry recorded master-HEAD `d0894bdb…`. master HEAD ≠
  "Latest stable". Spec D.3 is the top authority → task-5 vendors `2.2.0`;
  spec-amendment **A-3** proposes re-pointing §2.18 (operator reconciles; NO plan
  edit per §0.3). [FACT]
- **Vendored (D-VENDOR-ROLE, read-only oracle):** sparse-checkout of the
  `PositionBasedDynamics/` constraint subtree → `references/PositionBasedDynamics/`
  with `XPBD.{cpp,h}` + `PositionBasedDynamics.{cpp,h}`, `LICENSE` (MIT),
  `UPSTREAM_README.md`, `MANIFEST.toml`, `README.md`. **NOT** FetchContent'd, **NOT**
  runtime-linked. Security scan: no `system/exec/popen/socket/curl/http` calls in
  the vendored `.cpp/.h` (clean). `references/` is pre-commit-hook- and
  Cat-2-excluded (`.pre-commit-config.yaml:20,29,62`). [FACT]
- **Citation anchors grep-verified (Convention #8):** XPBD compliance↔stiffness
  mapping `alpha = 1/(stiffness*dt*dt)`
  (`references/PositionBasedDynamics/PositionBasedDynamics/XPBD.cpp:39` = Macklin
  2016 Eq. 8); Lagrange-multiplier update `delta_lambda = -Kinv*(C + alpha*lambda)`
  (`references/PositionBasedDynamics/PositionBasedDynamics/XPBD.cpp:53` = Eq. 18);
  distance constraint
  (`references/PositionBasedDynamics/PositionBasedDynamics/XPBD.h:28`); dihedral
  bending
  (`references/PositionBasedDynamics/PositionBasedDynamics/PositionBasedDynamics.h:71`).
  Note Bender's `stiffness` arg = 1/compliance = k; compliance = 1/stiffness. [FACT]
- **MANIFEST schema note (SURFACED, not a STOP):** `MANIFEST.toml` ships optional
  `[[citations]]` rows mirroring the **Chakazul-Lenia** precedent. The strict
  schema `reference-manifest-v1.json` is `additionalProperties:false` and does NOT
  include `citations`, so `capture.load_reference_manifest()` would *reject* both
  this manifest and Lenia's. But integrity's cat1 **never calls** that loader
  (verified: Lenia's manifest fails the loader yet integrity is green), so the
  `[[citations]]` extension is inert to the 0-HF invariant. Following the live
  precedent (existing-convention precedence, §0.3). Pre-existing schema-vs-precedent
  gap; candidate for the reference-manifest-schema-citations cluster, NOT owned
  here. [FACT/INFERENCE]

## D-class resolution + charter flip (v2)

All five operator-pending D-classes ratified (dispatch-locked) and flipped
OPEN→RESOLVED in charter §6/§11 with a v2 revision entry. Corrigenda routed to
`docs/spec-amendments-proposed.md`: **A-2** (Appendix D.2.3/D.3 `cloth-xpbd` →
`mass-spring-cloth`), **A-3** (§2.18 Bender SHA `d0894bdb` → `2.2.0`). NO plan
edit, NO architecture.md edit (§0.3 + spec FROZEN in Phase 3 §9.6).

## Stage-0 commit chain

- `faeb73b` — vendor Bender PositionBasedDynamics 2.2.0 (read-only XPBD oracle).
- `2eb8c2d` — charter v2 (D-classes RESOLVED) + A-2/A-3 corrigenda.
- (this audit) — Stage 0 audit.

## Verdict

**CONFIRMED.** Pre-flight genuine exit 0; integrity 0 HF / 14 SW; replay ok=True
8/8; verify_evidence no-regression (8 pre-existing hygiene fails); Bender 2.2.0
read-only vendored + MIT + grep-verified citations; all five D-classes RESOLVED;
A-2/A-3 routed. Stage 1a (scaffold + RED) unblocked.

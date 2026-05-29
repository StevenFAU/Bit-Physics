---
date: 2026-05-29T21-59-20Z
author: phase-3 3dgs-mpm stage-0 (Claude Code)
subject: Phase 3 finale (task-8 3dgs-mpm, FIRST neural-rendered CATEGORY) — STAGE 0 preflight + integrity anchor + LFS bootstrap + cross-phase replay + verify_evidence sweep + two-hard-dep re-confirm + Inria-probe + PhysGaussian cite-only MANIFEST + A-7 + spec-ref skeleton + charter D-class flip RESOLVED v2
verdict: CONFIRMED
head_sha: 28b005c
anchor_sha: 28b005c5bf9bd02549204cd3ce5c2d23ed75edda
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-PRECONDITIONS/CPU-RENDER RESOLVED-v2-DISCHARGED / D-RENDER-DET RESOLVED-v2-STOP-RENDER-FLOOR / D-ANCHOR-COUPLING RESOLVED-v2-Eq8-Eq9 / D-VENDOR-ROLE-SHA RESOLVED-v2-cite-only-A7 / D-SCOPE-MVP-STRETCH RESOLVED-v2-execution-decides / D-CI RESOLVED-v2-measure-then-split / D-SCENE RESOLVED-v2-small-synthetic / D-MPM-DET RESOLVED-v2-measure-1b / D-TOL-D-LAYOUT-D-API-D-MANIFEST-FMT-D-USD-D-MUTATION-D-CAPTURE-DESC-D-NAMING-D-TAG resolved-in-charter
evidence_paths:
  - docs/phases/sub-phase-phase-3-3dgs-mpm.md
  - docs/spec-amendments-proposed.md
  - references/PhysGaussian/MANIFEST.toml
  - docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md
  - tools/testkit/probes/reports/3dgs-mpm.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md
evidence_hashes:
  docs/phases/sub-phase-phase-3-3dgs-mpm.md: sha256:982be1d91520a9b492eb6d15cc63eec4d5108d941974ed88b1b578ebd754e53a
  docs/spec-amendments-proposed.md: sha256:bd20de1d1d7865408a261658ddb86bc698f07caa93a7f3d5b56907dfa8cc0da0
  references/PhysGaussian/MANIFEST.toml: sha256:d71eef0653c4c64f5cb576ac4cad04fe337df272e531e108403db35d6d109585
  docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md: sha256:19c4c4a1affb011590858474a3a7fa53d4184ec7a38dfb930b20596fc5ef25d0
  tools/testkit/probes/reports/3dgs-mpm.md: sha256:f8df45beb4220c4acccdda711218fa7566fdc19f13520ed0ddadf6d945855f62
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/architecture.md: sha256:97e70bad3f82800e0c28fb0d28d98ee81fddc5d504a81d68d66dee03d0e4703a
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md: sha256:641ff65c82e0f95ccc22afbd5de9d2c9bd6b0bfd6b5cc00156e2f279fee5db7b
---

# Phase 3 — sub-phase 3dgs-mpm — Stage 0 audit

> Pre-flight for the **FIRST neural-rendered-CATEGORY** sim (task-8, sub-phase 3.5) and the
> **Phase-3 FINALE**: state checks, integrity anchor probe (§R two-field), LFS bootstrap
> (§Q, HEAVIEST footprint of the phase), cross-phase replay, verify_evidence baseline,
> two-hard-dep + CPU-render live re-confirm, the **Inria-probe**, the **PhysGaussian
> cite-only `MANIFEST.toml`** + **corrigendum A-7**, the **spec-ref skeleton**, and the
> operator-ratified **D-class flip OPERATOR-PENDING → RESOLVED v2**. Verdict **CONFIRMED** —
> Stage 1a (scaffold + RED) is safe to proceed.

## § 1 — Anchor probe (FACT)

| Check | Expectation | Result |
|---|---|---|
| `uv run python tools/dispatch/preflight-phase.py 3` | exit 0 | **exit 0** — 8/8 PASS (prior-phase-tag v0.2.0-phase-2, common-warp paths, four §11.3-port packages incl. `packages/mpm-multimaterial-stack-e`, integrity-all-green) |
| `uv run python -m integrity --all --mode strict` | `0 HARD_FAIL / 14 SOFT_WARN` | **PASS** — `summary: 0 HARD_FAIL, 14 SOFT_WARN` |
| integrity digest (§R measure-don't-copy) | live | `5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1` (measured live at HEAD `28b005c`; the charter's `5c7172a2…` happens to match because the report content is unchanged 3a2a7ae→28b005c — but it was MEASURED, not copied, per §R) |

## § 2 — §Q LFS bootstrap (FACT)

`source tools/lfs/setup-lfs-s3-local.sh` → exit 0:
`lfs-s3 ready: /home/otacon/.local/bin/lfs-s3 | endpoint=…r2.cloudflarestorage.com
bucket=bit-physics-lfs region=auto`. No STOP-LFS-PUSH. (3dgs-mpm carries the heaviest LFS
footprint of Phase 3 — golden render PNGs + capture `.h5` with MPM+Gaussian state + the
synthetic scene — so the bootstrap runs FIRST after the anchor probe per §Q; each `git lfs
push` at Stage 1c will run in the SAME shell as the bootstrap, ising root-cause.)

## § 3 — Cross-phase replay + verify_evidence (FACT)

- **Replay** `replay_prior_phase --prior-phase phase-2 --audit
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md` → `prior_phase=v0.2.0-phase-2
  ok=True` (8/8 gates PASS: integrity, pytest, equivalence, determinism, perf-ledger,
  property, mutation, tolerance-budget). I1/I2 hold.
- **verify_evidence baseline (no-regression, NOT 0-fail at the working tree):** a sweep over
  `docs/_audits/phase-3/*.md` shows pre-existing failures on prior audits — all of the form
  "evidence path not present at `<historical-head_sha>`" (the audit recorded a head_sha
  before its own / a sibling charter file was committed) or sha-drift on legitimately-
  append-only files (`progress.md`, `tolerance.toml`). These are **pre-existing artifacts of
  the Convention #12 back-fill pattern, not regressions** — the working tree is clean (`git
  status` empty) and **this session has committed nothing yet**, so no failure here is
  attributable to task-8. THIS sub-phase's own audits will be 0-fail at landing (Stage 2
  gate). Recorded as the baseline.

## § 4 — Two hard deps + CPU-render re-confirm (FACT)

| Precondition | Live result |
|---|---|
| `common/common-3dgs/` + `docs/common/3dgs.md` | PRESENT; public API `GaussianSplatModel` / `render` / `Camera` / `save_png` (`common/common-3dgs/src/common_3dgs/__init__.py:13-26`) |
| `tools/testkit/render_similarity/metrics.py` | PRESENT; `from render_similarity import psnr, ssim, lpips` (`tools/testkit/render_similarity/__init__.py:20`) |
| `packages/mpm-multimaterial-stack-e/` (Phase-2 MPM) | PRESENT; kernel sequence `compute_particle_stresses → p2g_with_stress → grid_update → g2p → deformation_update → advect_particles`; per-particle `F (N,3,3) f64` |
| common-3dgs renders Warp-CPU | YES — `render()` → `wp.launch(..., device="cpu")` (`common/common-3dgs/src/common_3dgs/render.py:203`) |

Full verbatim API in the probe `tools/testkit/probes/reports/3dgs-mpm.md` (§§1–4, re-verified
live this Stage 0). No regression → **no feasibility BLOCK** (D-PRECONDITIONS/CPU-RENDER
discharged).

## § 5 — Inria-probe (FACT; NEW at Stage 0)

- common-3dgs's **own runtime source** carries **NO vendored Inria source** — `grep` over
  `common/common-3dgs/src/` returns docstring/comment citations only
  (`common/common-3dgs/src/common_3dgs/model.py:19`,
  `common/common-3dgs/src/common_3dgs/camera.py:6`); no `import references` at runtime. The
  rasterizer is an independent EWA re-derivation.
- `references/3DGS-reference/` IS a vendored Inria reference oracle but **properly licensed**
  (`references/3DGS-reference/MANIFEST.toml`: `license="NOASSERTION"`, `license_file=
  "LICENSE.md"` — Inria **NON-COMMERCIAL research license** present; SHA `54c035f7…`). Its
  scope note declares the source a citation/test oracle, NOT a redistributed dependency, and
  the **non-commercial clause is explicitly inherited by `neural-rendered/3dgs-mpm`** (in
  `used_by_sims`).
- 3dgs-mpm depends on common-3dgs's reimplemented renderer, NOT on the Inria reference. ⇒
  **NO transitive unlicensed-source dependency; NO HARD-RULE-2 surface.** The inherited
  non-commercial clause is recorded (research-only project). **NO BLOCK.**

## § 6 — PhysGaussian cite-only posture + A-7 (FACT, Convention #8)

- Live (`gh api`, 2026-05-29): `license: None`; `GET contents/LICENSE` → 404 (no LICENSE
  file); HEAD `8339ed6aa2cd5d50e1001a254a3d95aea678a956` = plan §2.18 pin byte-for-byte. ⇒
  all-rights-reserved → **cite-only, NO source vendored.**
- `references/PhysGaussian/MANIFEST.toml` authored as a **cite-only pointer**
  (`source_vendored = false`; the only file in the dir). Passes cat1.upstream-citation
  (integrity 0 HF/14 SW after authoring).
- **A-7** filed in `docs/spec-amendments-proposed.md`: spec `docs/architecture.md:2551`
  PhysGaussian License "MIT" → NONE/cite-only (rest of the row correct: SHA + arXiv id).
- **Coupling eq numbers re-verified verbatim** (arXiv:2311.12198v3): **Eq. (8)**
  `x_p(t)=φ(X_p,t)`, `a_p(t)=F_p A_p F_pᵀ` (§3.4, MVP core); **Eq. (9)** `f^t(d)=f^0(Rᵀd)`
  via polar decomp `F_p=R_p S_p` (§3.5, SH-rotation stretch); **Eq. (10)** rate-form (§3.6,
  NOT used). Confirms the charter's SHIFT from "Eq. (8)-(10)".

## § 7 — Charter D-class flip → RESOLVED v2 (FACT)

Operator RATIFIED all 8 §11 items (dispatch "RATIFIED D-CLASSES" block). Charter front-matter
gains a **v2 revision** entry; every §6 D-class header that was "LEAN" now reads "RESOLVED
(operator-ratified v2)"; §11 marks all items RATIFIED. spec-ref skeleton authored at
`docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md` (§§1–13, `TODO(Stage-1b)` where
measured; §6 verification posture + the deterministic-golden-render boundary + the two PBT
invariants fully declared per spec §2.14).

## § 8 — Verdict

**CONFIRMED.** Preconditions discharged (both hard deps present + usable, CPU-render live);
Inria-probe clean; PhysGaussian cite-only + A-7 filed; eq numbers + license + SHA re-verified
live; charter flipped to v2; integrity 0 HF/14 SW; replay ok=True. No BLOCK, no HARD-RULE-2
surface, no STOP. **Stage 1a (scaffold `packages/3dgs-mpm/` + RED tests) proceeds.**

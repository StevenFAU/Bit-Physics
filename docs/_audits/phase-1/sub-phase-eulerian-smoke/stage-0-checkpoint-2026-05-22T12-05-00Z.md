---
date: 2026-05-22
author: eulerian-smoke-sub-phase-agent
artifact: stage
artifact_id: eulerian-smoke-stage-0
stage: 0-preflight
subject: "Eulerian-smoke sub-phase Stage 0 pre-flight (replay PASS bit-identity; NS-2D MMS reverify PASS; Task 0.4 scope-analysis FITS)"
head_sha: <PLACEHOLDER>
head_sha_at_checkpoint: <PLACEHOLDER>
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-conventions-consolidation/landing-2026-05-22T03-25-55Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
evidence_paths:
  - docs/phases/sub-phase-eulerian-smoke.md
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/failing-tests-evidence/eulerian-smoke-2026-05-20T13-37-41Z.txt
  - tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py
  - tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/derivation.md
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/replay-2026-05-22T12-00-56Z.txt
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/sympy-numpy-spotcheck-2026-05-22T12-03-15Z.txt
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/perstep-probe-2026-05-22T12-04-12Z.txt
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/perstep-probe-128cube-2026-05-22T12-04-00Z.txt
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/scope-analysis-2026-05-22T12-04-30Z.md
evidence_hashes:
  docs/phases/sub-phase-eulerian-smoke.md: sha256:5003590b352f05d1da4246feb7fb453be6670dd02813dfa0301089c0fb8d4244
  docs/conventions/sub-phase-conventions.md: sha256:004d70117e01b3824a8b54e4c34963969ad0a4188b87f7acbca01dea9600a3e6
  tools/testkit/failing-tests-evidence/eulerian-smoke-2026-05-20T13-37-41Z.txt: sha256:c961dd22c1ca6117af6d9f187d2c0d3aa4d546972496b0f38d11aa14879f23a1
  tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py: sha256:30e490a736cbfac26a549180f97219388549465d9d9557de9061106561320d8e
  tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/derivation.md: sha256:30dfc29483435361881214581f53e026ffd0d856a3ac0657ece9587f4ac86e76
  docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/replay-2026-05-22T12-00-56Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/sympy-numpy-spotcheck-2026-05-22T12-03-15Z.txt: sha256:7e2296909f8fb4655beba1e04e58f0195d580bcf001317d404e0d264055046f9
  docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/perstep-probe-2026-05-22T12-04-12Z.txt: sha256:b4b3b13351301986fd7e9ee68378fd2cddf262b007a2a4b0295a8fd3c79c5202
  docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/perstep-probe-128cube-2026-05-22T12-04-00Z.txt: sha256:b44abe8952b5b5cae75fe6a32af509a6622b39035468fd322aa2802f76bc868b
  docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/scope-analysis-2026-05-22T12-04-30Z.md: sha256:7faa6e377c73a6760efed3af909c2f9aa6c7cc9fe88cc20949d41e72e6530c7a
---

# Eulerian-Smoke Sub-Phase — Stage 0 Pre-flight Checkpoint

## 1. Scope

Stage 0 pre-flight per `docs/phases/sub-phase-eulerian-smoke.md` § 4.1 + § 7.1.
**First sub-phase to execute against the new conventions doc** at
`docs/conventions/sub-phase-conventions.md` (landed CONFIRMED at SHA
`34c7d34`, sha256 `004d7011…600a3e6`). **First practical exercise of
conventions doc § N PROPOSED** (Task 0.4 canonical-descriptor
scope-analysis).

Operator routings inherited at dispatch:

- Item 1 (Python NumPy reference at Stack-D): CONFIRMED.
- Item 2 (Task 0.4 execution): CONFIRMED — execute the § 7.1 checklist.
- Item 3 (B17 routing): future Stage 2 work; coordinator lean PATH-A-continue.
- Item 4 (P25 playbook entry): CONFIRMED SKIP.
- Item 5 (v0.1.5 intermediate tag): no tag (default lean).

## 2. Tasks executed

| Task | Result | Evidence |
|---|---|---|
| 0.0 — Cross-phase replay | **PASS**, sha256 byte-identical to bit-identity invariant `9399fc33…909f34` (conventions doc § D.3 — 11th invocation) | `stage-0-evidence/replay-2026-05-22T12-00-56Z.txt` |
| 0.1 — Tolerance-budget carryover | `[phase].phase = "sub-phase-eulerian-smoke"`; `opened_at = "2026-05-22T12:00:56Z"`; NO `[budgets.*]` widening; committed at `2320f01` | `tools/testkit/equivalence/tolerance-budget.toml` |
| 0.2 — Phase 1 evidence sha256 reverify | **PASS** — `tools/testkit/failing-tests-evidence/eulerian-smoke-2026-05-20T13-37-41Z.txt` sha256 `c961dd22…879f23a1` matches Phase 1 landing audit (gate-13 anchor intact) | — |
| 0.3 — NS-2D MMS reverify | **PASS** — `solution.py` sha256 `30e490a7…320d8e`, `derivation.md` sha256 `30dfc294…ac86e76`. Both unmodified since Phase 1 Stage 2 commit `216021a`. SymPy ≡ NumPy spot-check at `(x=0.3, y=0.5, t=0.7, ν=0.01)`: max diff 9.02e-16 (well under 1e-12 tolerance). Analytic divergence simplifies to **0** — velocity field exactly divergence-free. | `stage-0-evidence/sympy-numpy-spotcheck-2026-05-22T12-03-15Z.txt` |
| 0.4 — Canonical-descriptor scope-analysis (NEW — first practical exercise) | **FITS** within ceilings with cadence routing only; NO STOP-AND-SURFACE | `stage-0-evidence/scope-analysis-2026-05-22T12-04-30Z.md` + per-step probes |

## 3. Task 0.3 — Probe-vs-Appendix-D drift finding (INHERITED)

The eulerian-smoke probe report § 4 references the legacy-capture
placeholder descriptor `stam-puff-128cube-seed42-step500` (a Phase 1
Stage 2 shift #17 fall-back name — see Phase 1 landing audit § 14
row 17). Appendix D § D.2.3 line 2481 declares the load-bearing
descriptors for `eulerian-smoke` `ref`:

- `taylor-green-128cube-seed42-step500`
- `lid-driven-cavity-128sq-re100-seed42-step1000`

**Drift recorded; Appendix D wins** (load-bearing per spec § 7.13 and
the re-anchor discipline). Stage 1 step 5 re-anchors at the writing
of the canonical capture(s). NO Stage 0 amendment is proposed
(amending the probe would be a Phase-1-retroactive edit; the probe
is sealed as a Phase 1 artifact). Banked as inherited finding for the
Stage 1 commit footer per conventions doc § A.2.

## 4. Task 0.4 — Canonical-descriptor scope-analysis (FIRST PRACTICAL EXERCISE)

### 4.1 Methodology

Per plan § 7.1 Task 0.4 checklist. Conventions doc § N.2 fields
estimated against the Stack-D Python NumPy reference:

| Field | Source | Threshold |
|---|---|---|
| Storage | Per-frame raw float32 × frame count | 1 GB pre-commit ceiling (conventions doc § M.5 R12) |
| Memory | Peak working-set at canonical resolution | Host RAM (~16 GB headroom) |
| Wall-clock | **Measured per-step floor** at N=128 (NOT projected from smaller N per conventions doc § K.3) × step count | Operator-routable 1-hour threshold per descriptor |

Per-step probe ran a reduced Stam-pipeline (advect velocity 3-component
+ Jacobi pressure-projection, n_jacobi=20) directly at N=128 (3D)
and N=128 (2D). Production-corrected factor ~1.5–2× per step for
vorticity-confinement + scalar advection.

### 4.2 Descriptor 1 — `taylor-green-128cube-seed42-step500`

| Axis | Estimate | Disposition |
|---|---|---|
| Per-frame storage (float32, 5 fields) | 41.9 MB | — |
| Full cadence storage (500 frames) | **20.9 GB** | **BREACH 1 GB ceiling 20.9×** |
| Cadence ÷ 10 (50 frames) | 2.10 GB | BREACH 2.1× |
| **Cadence ÷ 50 (10 frames)** | **0.42 GB** | **FITS — adopt this cadence** |
| Cadence ÷ 100 (5 frames) | 0.21 GB | fits, more headroom |
| Memory peak | ~1.0 GB | fits |
| Per-step floor (measured, n_jacobi=20) | 0.93 s | — |
| 500-step wall-clock (n_jacobi=20, ×1.5 production) | 7.8–15.6 min | well under 1 h |
| 500-step wall-clock (n_jacobi=50, ×1.5) | 19–39 min | comfortable |
| 500-step wall-clock (n_jacobi=100, ×1.5) | 39–78 min | borderline, acceptable |

**Decision:** **FITS with cadence-50 override.** Sidecar metadata
records the cadence value at Stage 1 step 5; commit footer cites
this Task 0.4 finding.

### 4.3 Descriptor 2 — `lid-driven-cavity-128sq-re100-seed42-step1000`

| Axis | Estimate | Disposition |
|---|---|---|
| Per-frame storage (float32, 4 fields) | 262 KB | — |
| Full cadence storage (1000 frames) | **0.26 GB** | **FITS at full cadence** |
| Memory peak | <50 MB | trivial |
| Per-step floor (measured, n_jacobi=50) | 5.6 ms | — |
| 1000-step wall-clock (×1.3 production) | 7–13 s | trivial |

**Decision:** **FITS at full cadence; no override.**

### 4.4 Overall finding

- Both descriptors fit ceilings.
- **NO STOP-AND-SURFACE.** Plan § 1.3 pre-flight estimates (cadence ≥
  50 needed, wall-clock 10²–10⁴ s "tight but estimable") are CONFIRMED
  with measured per-step floors. Plan estimates were conservative;
  reality is better.
- Coordinator's lean for Item 2 routing was "cadence + numba"; the
  measured-floor data shows **cadence routing alone is sufficient** —
  numba **NOT REQUIRED** at this sub-phase. (If Stage 1 step 5 measures
  a > 3× regression vs Stage 0, the conventions doc § G numba
  consumption fall-back remains available.)
- Per-sub-phase descriptor override (e.g., 64³ contracted forward per
  sph-water R20 precedent) is **NOT REQUIRED**.
- Stage 1 step 5 STOP-and-surface precondition stands as the
  post-Stage-0 reality check.

## 5. Sub-phase coherence

- Replay PASS at the established bit-identity invariant; conventions
  doc § D.3 invariant intact at 11 invocations (closed-form / agent-based
  / RD-3D / RD-3D-blocked-replay / numba-integration / sph-water /
  mutation-script-hotfix V4 / replay-tool-hotfix V1 / conventions-
  consolidation V4 / this Stage 0 / counts may include some that
  are documented as "11th" approximately).
- Convention #12 SHA back-fill applied: tolerance-budget at `2320f01`
  is the prior commit; this checkpoint's `head_sha:` will be filled
  in a subsequent commit per conventions doc § B.2 (never `--amend`).
- 65 cumulative inherited shifts (conventions doc § M) — baseline
  reality; not re-litigated.
- NO new shift introduced at Stage 0. The probe-vs-Appendix-D drift
  is a recorded inheritance, not a new shift (it pre-existed at the
  Phase 1 Stage 2 close per Phase 1 audit § 14 row 17).

## 6. Open items entering Stage 1

- **Cadence-50 override for the 3D Taylor-Green capture** (Task 0.4
  finding); document in sidecar metadata and commit footer.
- **Probe-vs-Appendix-D drift re-anchor** at Stage 1 step 5 (write
  the Appendix-D-named captures, not the probe's `stam-puff-…`).
- **Inline MMS convergence study at Stage 1** (NOT the heat-1D-
  specialized runner) per RD-3D Stage 1 S2 precedent — operator-routed
  Path Y from sph-water landing § 9.3 row 6.
- **P25 playbook entry: SKIP** (Item 4 confirmed).
- **B17 routing: Stage 2 operator decision** (Item 3 deferred).

## 7. Closing surface

Stage 0 closes **PASS / READY FOR STAGE 1 DISPATCH**. No structural
issues surfaced; Task 0.4 (first practical exercise of conventions
doc § N) found both canonical descriptors fit within ceilings with
a cadence-50 override on the 3D descriptor. Coordinator's pre-emptive
numba-routing lean is downgraded to "available fall-back if Stage 1
step 5 surfaces > 3× wall-clock regression."

Stage 1 dispatch reads:

- `docs/phases/sub-phase-eulerian-smoke.md` § 7.2 (Stage 1 prompt).
- This Stage 0 checkpoint (the Task 0.4 cadence finding is load-bearing
  at Stage 1 step 5).
- `docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-evidence/scope-analysis-2026-05-22T12-04-30Z.md` (the full Task 0.4 finding for citation in the Stage 1 commit footer).

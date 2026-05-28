---
date: 2026-05-28
author: phase-3-plan-drafting-agent
sub_phase: sub-phase-phase-3-common-3dgs
phase: phase-3
head_sha_at_draft: 44cc8cbfadc43682c42ff5c141c19a5fbd090885
prior_phase_tag: v0.2.1-sub-phase-lfs-architecture
version: charter-v1 (plan-drafting)
posture: >
  First Phase-3 sub-phase. Introduces the common/common-3dgs/ infrastructure
  module (spec §11.4 item 3.8; phase-3-plan §6.1 + §3.2.1) under the matured
  per-sub-phase cadence (plan-drafting → Stage 0 → 1a/1b/1c → Stage 2), which
  SUPERSEDES the v8 single-agent-sequential execution machinery (phase-3-plan
  §4–§9) while inheriting its scope / locked decisions / interface contracts /
  per-task DELIVERABLES unchanged. DRAFT ONLY — Stages execute under operator-
  ratified D-class routings + the two operator-pending Stage-0 gates (Inria SHA
  pin; pre-dispatch-review). Every execution commit preserves invariants I1–I7,
  append-only audits, trunk-based commits to main, no agent-pushed tags (I7).
---

# Sub-phase: Phase-3 common-3dgs (3.8) — CHARTER

> **This is a plan, not an execution.** Plan-drafting **SHIFTED** means the probe
> + charter are sound and the first sub-phase is determined, *with* two operator-
> pending Stage-0-dispatch gates and an execution-model re-frame (see § Verdict).
> It does **not** mean common-3dgs exists. Every concrete claim is tagged
> FACT / INFERENCE and cites full repo-relative `path:line`. The probe FACTs live
> in `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-probe-2026-05-28T00-05-29Z.md`;
> this charter summarizes, re-frames, and routes. DELIVERABLES / OUT OF SCOPE /
> ANCHOR-PROBE content is **inherited** from `docs/phases/phase-3-plan.md:1012-1129`
> (§6.1) + §3.2.1 (`docs/phases/phase-3-plan.md:282-313`); it is NOT re-authored here.

## § 1 — Scope and posture

**(FACT)** This sub-phase introduces **one infrastructure deliverable**:
`common/common-3dgs/` — the 3D-Gaussian-Splatting common module. Scope owner:
`docs/phases/phase-3-plan.md:1012-1129` (§6.1 task-1 prompt) + the §3.2.1 interface
contract (`docs/phases/phase-3-plan.md:282-313`). Phase-3 scope table row 3.8
(`docs/phases/phase-3-plan.md:161`); spec §11.4 lineage Inria gaussian-splatting.

**Why it is first (FACT + INFERENCE).** The §3.1 deliverable map
(`docs/phases/phase-3-plan.md:263-276`) has exactly two hard-blocking infrastructure
roots — task-1 common-3dgs (blocks task-8) and task-2 render-similarity (blocks
task-6 + task-8). They are co-equal roots (neither depends on the other). §4.1
(`docs/phases/phase-3-plan.md:681-712`) breaks the tie toward task-1 by
"dependencies first" + listing order. The dependency-graph re-anchor produces **no
different conclusion** (it is indifferent between the two roots; §4.1 default holds)
→ task-1 common-3dgs is the first sub-phase. The task-1-vs-task-2 ordering carries a
material asymmetry (the Inria-SHA Stage-0 gate) surfaced as **D-A** for operator
routing — not improvised here.

**Posture (FACT — non-negotiable).** Convention #8 (no fabrication; grep-verify
every claim — explicitly: do NOT fabricate the Inria SHA); Convention M (re-anchor
citations against HEAD before edit); append-only audits (NEVER edit a published
`docs/_audits/**` file); trunk-based commits to `main` (v8 amendment
`docs/phases/phase-3-plan.md:46`); I7 (no agent-pushed tags). Existing Phase-0/1/2
conventions take precedence over §3.2 prescriptions (§0.3,
`docs/phases/phase-3-plan.md:138-140`): the probe step is the verification gate —
follow discovered pattern, document SHIFTED if it differs.

### § 1.1 — In scope

1. `common/common-3dgs/` public API per §3.2.1 (`docs/phases/phase-3-plan.md:286-313`):
   `GaussianSplatModel` (positions/scales/rotations-wxyz/opacities/sh_coefficients,
   Warp-array-backed), `GaussianSplatModel.load_ply` (classmethod, Inria .ply),
   `model.save_ply` (instance), `render(model, camera, *, image_height, image_width,
   background)`, `Camera`. Smoke sim at the probe-discovered common-module location.
2. `docs/common/3dgs.md` (following discovered `warp.md`/`py.md` shape).
3. `references/3DGS-reference/manifest.yaml` + vendored Inria source **at the
   operator-pinned SHA** (§2.11 `docs/phases/phase-3-plan.md:226`).
4. Tier-3 diagnostic if needed; tests; Cat-2 doc↔impl contract; shared-file updates
   (README, CHANGELOG, glossary, justfile, `.github/workflows/build-py.yml`) per §6.1
   DELIVERABLES (`docs/phases/phase-3-plan.md:1085-1102`).
5. The v9 infrastructure-task discipline (`docs/phases/phase-3-plan.md:1076-1083`):
   cross-phase replay (Stage 0), tolerance-budget Phase-3 carryover, mutation baseline
   ≥ 80% (new target), smoke-contract tests, evidence-hashes in audits, append-only.

### § 1.2 — Out of scope (inherited verbatim intent, §6.1 `docs/phases/phase-3-plan.md:1042-1048`)

Differentiable splatting (Phase 4 WU-C); Stack-B viewer port (Phase 4); the coupling
primitive (task-8 builds sim-local; promotion at consumer #3 per rule-of-three);
training new 3DGS scenes (use vendored); `common-warp` changes (task-9); `TrainingLoop`
/ `PhysicsCoupling` (Phase-4 WU-C, §3.2.1 `docs/phases/phase-3-plan.md:307`).

### § 1.3 — Inherited-vs-reframed (the §6.1 prompt has stale surfaces — FACT)

The charter inherits §6.1's DELIVERABLES content but re-frames two stale surfaces
(probe §4); these are **surfaced, not edited into `phase-3-plan.md`** (only the K-2 fix
touches that file this session, per D1's narrow carve-out):

| §6.1 surface | Stale form | Governing form (charter follows) |
|---|---|---|
| Public API names | `GaussianSet`, `forward_splat(...)` (`docs/phases/phase-3-plan.md:1032,1037`) | `GaussianSplatModel`, `render(...)`, `load_ply` classmethod, `save_ply` instance (§3.2.1 `docs/phases/phase-3-plan.md:284-301`; v4/v8 amendment-2 `docs/phases/phase-3-plan.md:63`) — **§3.2.1 governs on conflict** |
| Branch / PR ceremony | `BASE BRANCH: phase-3-integration`, `phase-3/task-1-*`, `gh pr create`, MERGE PROTOCOL (`docs/phases/phase-3-plan.md:1021-1023,1104-1110`) | trunk-based to `main` (v8 amendment `docs/phases/phase-3-plan.md:46`); per-task PR cycle → matured Stage 1a/1b/1c/2 cadence |

## § 2 — Stage decomposition (matured cadence)

> Cadence: **plan-drafting** (this session, 4 commits) → **Stage 0** (pre-flight +
> anchor re-check + external-SHA pin) → **Stage 1a** (scaffold + RED tests) →
> **Stage 1b** (implementation + thirteen-gate) → **Stage 1c** (verdict landing +
> mutation baseline + evidence-hash audit) → **Stage 2** (sub-phase landing audit).
> Audit folder: `docs/_audits/phase-3/`. Each stage: entry preconditions · probe
> shape · deliverables · acceptance · failure response · exit state.

### Stage 0 — pre-flight + anchor re-check + external-SHA pin (~3 commits)

- **Entry preconditions (TWO are operator-pending GATES — see § 5 STOP-A/B):**
  (1) HEAD = this plan-drafting chain or successor; tags resolve; integrity baseline
  `c19492ad…d22cb52` held; verify_evidence on this plan-drafting landing PASS.
  (2) **GATE — pre-dispatch-review FILED** at
  `docs/_audits/phase-3/pre-dispatch-review-<UTC>.md` (v9 PHASE-PLAN-REVIEW amendment
  `docs/phases/phase-3-plan.md:34`; probe §2.1 = ABSENT).
  (3) **GATE — Inria gaussian-splatting SHA pinned in §2** of `phase-3-plan.md` by the
  operator (probe §2.2 = PENDING). Stage 0 vendors at that SHA; it is NOT fabricated.
- **Probe shape:** re-anchor §6.1 + §3.2.1 surfaces against HEAD (Convention M);
  **cross-phase audit replay** `replay_prior_phase --prior-phase phase-2 --audit
  docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md --gates integrity,pytest,
  equivalence,determinism,perf-ledger,property,mutation,tolerance-budget` (v9 first-
  action `docs/phases/phase-3-plan.md:18`, task-1 is Phase-3's first task → discrepancy
  = BLOCKED); web-fetch + verify the operator-pinned Inria SHA + security-advisory
  check (§6.1 probe item `docs/phases/phase-3-plan.md:1069`); discover the common-module
  smoke-sim location (§6.1 `docs/phases/phase-3-plan.md:1058-1060` — "do NOT impose a
  default location").
- **Deliverables:** ratify D-A…D-E routings into a Stage-0 amendment block (lfs/cleanup
  precedent); open the Phase-3 tolerance-budget (`tolerance-budget.toml [phase] phase =
  "phase-3"`, carry-forward only, no widening `docs/phases/phase-3-plan.md:1078`);
  Stage-0 checkpoint audit + Convention #12 back-fill.
- **Acceptance:** both gates satisfied; replay ok=True 8/8; integrity baseline held;
  I1–I7 hold; Inria SHA pinned + verified; D-class routed.
- **Failure response:** either gate unmet → **STOP/HALTED**, surface (do not vendor
  without a pinned SHA; do not dispatch without the review). Replay discrepancy →
  BLOCKED.
- **Exit:** gates cleared; SHA pinned; smoke-sim location known; ready for scaffold.

### Stage 1a — scaffold + RED tests (~2–3 commits)

- **Entry:** Stage 0 exit clean.
- **Deliverables (RED-first, TDD spec §1.3):** the `common/common-3dgs/` package
  skeleton + smoke-contract tests for every §3.2.1 public symbol
  (`docs/phases/phase-3-plan.md:1080`) committed **failing/red first**, with the
  failing-tests output recorded and **`Failing-tests-output: …` +
  `Failing-tests-output-hash: sha256:…`** in the commit footer (v9 amendment
  `docs/phases/phase-3-plan.md:22`); the determinism-registry row (§3.2.5
  `docs/phases/phase-3-plan.md:404-416`) for the render class drafted (D-C); the
  neural-rendered capture-writer choice scaffolded (D-D).
- **Acceptance:** RED committed with the output hash grep-verifiable; I2/I3/I1 still
  PASS on the otherwise-unchanged tree.
- **Failure response:** STOP, surface.
- **Exit:** red test surface exists; implementation can go green in 1b.

### Stage 1b — implementation + thirteen-gate (multi-commit)

- **Entry:** Stage 1a RED recorded.
- **Deliverables:** implement the §3.2.1 API (separate impl commit whose footer
  references the Stage-1a failing-tests-commit SHA + `Failing-tests-output-hash-
  witnessed: sha256:<same-hex>`, `docs/phases/phase-3-plan.md:937`); vendor
  `references/3DGS-reference/` + `manifest.yaml` at the pinned SHA; `docs/common/3dgs.md`
  (Cat-2 doc↔impl contract); smoke sim + `just run-3dgs-smoke`/`just test-3dgs`;
  shared-file updates; the `test-common-3dgs` CI job in `build-py.yml` (invoke pytest
  directly, not via `just`, §2.14 `docs/phases/phase-3-plan.md:237-239`).
- **Acceptance:** the **thirteen gates pass** per spec §3.5 v2.4 / §5.4 Layer-4 ref
  (`docs/phases/phase-3-plan.md:20`); common-3dgs is an **infrastructure task** so it is
  subject to the infrastructure-verification surrogates per spec §2.11
  (`docs/phases/phase-3-plan.md:20` — NOT the sim Gate-14 cross-stack equivalence,
  which has no Phase-1/2 3DGS counterpart); strict-mode ruff/mypy/pytest green; I1–I7
  hold.
- **Failure response:** STOP + surface; never widen a tolerance to pass a gate
  (`docs/phases/phase-3-plan.md:1006`).
- **Exit:** API green; vendored; CI job live.

### Stage 1c — verdict landing + mutation baseline + evidence-hash audit (~2–3 commits)

- **Entry:** Stage 1b green.
- **Deliverables:** per-gate verdict report; **mutation-testing baseline** for the new
  `common/common-3dgs/` target — `bash tools/testkit/mutation/run-mutation.sh --target
  common/common-3dgs/`, score ≥ 80% (spec §2.13), baseline JSON committed at
  `tools/testkit/mutation/phase-3-task-1-<UTC>.json` (`docs/phases/phase-3-plan.md:1079`);
  evidence-hashes (sha256 of the mutation JSON + render digests) in the Stage-1c audit
  (`docs/phases/phase-3-plan.md:1081`); render-determinism class confirmed (D-C);
  Stage-1c checkpoint + back-fill.
- **Acceptance:** mutation ≥ 80%; all gates CONFIRMED; render determinism matches the
  declared registry class; evidence-hashes resolve.
- **Failure response:** STOP, surface (mutation < 80% → tighten tests, not the gate).
- **Exit:** module verified; ready to land.

### Stage 2 — sub-phase landing audit (~3 commits)

- **Entry:** Stage 1c CONFIRMED.
- **Probe shape:** invariant verification sweep (I1–I7); integrity + verify_evidence +
  append-only sweeps.
- **Deliverables:** the sub-phase landing audit
  `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-<UTC>.md` (template
  below, § 4); CHANGELOG additive `### sub-phase-phase-3-common-3dgs` under a Phase-3
  header; `docs/_audits/phase-3/progress.md` entry; schema-corpus growth fixture if the
  smoke writes a capture (`tests/fixtures/legacy-captures/phase-3-common-3dgs.h5` +
  sidecar, v9 `docs/phases/phase-3-plan.md:42`); D-class disposition table; banked
  lessons; SHA back-fill.
- **Acceptance:** I1–I7 held; integrity baseline `c19492ad…d22cb52` held (0 HARD_FAIL;
  the digest itself will shift once new audit files land — gate is **0 HARD_FAIL**, not
  byte-equality, per [[integrity-baseline-digest-method]] / lfs I3); verify_evidence
  GREEN on the landing audit + no regression on prior audits; append-only via
  `git diff --name-status <prior-tag> HEAD -- docs/_audits/` (S9-PHASE2-3).
- **Failure response:** STOP on any invariant / baseline regression.
- **Exit state:** sub-phase landed. **Intermediate tag = lean YES** (§ 3); operator-
  pushed only (I7).

## § 3 — Intermediate-tag condition (§D.2)

**(INFERENCE — argued from §D.2 `docs/conventions/sub-phase-conventions.md:251-256`)**
Default is **NO**, but an intermediate non-phase tag is appropriate when the sub-phase
(a) adds an **external dependency**, (b) marks **durable architecture**, or (c) operator
historical significance. common-3dgs satisfies **(a) AND (b)**:

- **(a)** vendors the **Inria gaussian-splatting external dependency** at a pinned SHA
  (`references/3DGS-reference/`) — a point-release handle aids rollback/citation exactly
  as the R2 backend did for `v0.2.1-sub-phase-lfs-architecture` (the §D.2 precedent,
  `docs/conventions/sub-phase-conventions.md:256`).
- **(b)** establishes the **durable `GaussianSplatModel`/`render`/`Camera` API** that
  task-8 (3dgs-mpm) *and* Phase-4 WU-C consume unchanged (§3.2.1
  `docs/phases/phase-3-plan.md:309-311`) — a git-archaeology lookup handle for a
  first-of-kind common module.

**Lean: tag at Stage-2 landing as `v0.2.2-sub-phase-phase-3-common-3dgs`** (sub-phase-
named handle; no `-phase-N` segment, so it satisfies spec §7.12 and the phase-tag regex
correctly rejects it, `docs/conventions/sub-phase-conventions.md:243,256`). **Operator-
pushed only (I7).** NB: the I7 regression guard's allowlist
(`tools/testkit/lfs_migration/test_i7_no_agent_tags.py`) must gain this tag, or the
in-range tag HARD_FAILs as presumed-agent-pushed
(`docs/conventions/sub-phase-conventions.md:256`) — surfaced for the operator at the
tag decision. **Routed as D-E** (operator ratifies at Stage 2; default-lean YES). This
is distinct from the per-sim default: a terminal sim (e.g. Lenia) would lean **NO**.

## § 4 — Stage-2 landing-audit template (consumes S9-PHASE2-1/2/3)

**(FACT — lineage)** S9-PHASE2-1/2/3 are phase-close-mechanics refinements banked at the
Phase-2 Stage-9 landing (`docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:73,101,171`)
and routed to Phase-3 plan-drafting Convention-M consumption by cleanup Stage-1.G
(`docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-g-checkpoint-2026-05-27T22-51-18Z.md:56`).
Consumed by encoding them into this sub-phase's Stage-2 landing-audit template:

1. **(S9-PHASE2-1 — independent-sub-phase model is native.)** The landing audit
   **consolidates the terminal sub-phase audit(s) already on `main`** — it does NOT read
   stage-reports off a branch + merge. For a single-deliverable sub-phase the
   "consolidation" is the Stage 0/1a/1b/1c checkpoint chain on `main`; the matured cadence
   *is* the independent-sub-phase model the Phase-2 close had to retrofit. The eventual
   Phase-3 phase-level close (task-10) consolidates the per-sub-phase landings the same way.
2. **(S9-PHASE2-2 — supernumerary-tolerant reconciliation.)** The spec-§11.4-vs-execution
   reconciliation section accommodates **additive, well-documented supernumerary** outcomes
   (e.g. an extra diagnostic, a doc, a deferred-to-Phase-4 stretch item like the task-8 SH
   stretch `docs/phases/phase-3-plan.md:235`) — it does NOT assume a strict 1:1
   deliverable↔spec-item match.
3. **(S9-PHASE2-3 — no fictional anchors.)** The template does NOT reference
   `docs/project-state.md` (never existed) or `integrity.scripts.check_append_only` (never
   built). Status is recorded via `CHANGELOG.md` + the per-stage audits; append-only is
   verified by `git diff --name-status v0.2.1-sub-phase-lfs-architecture HEAD --
   docs/_audits/` (net-new files allowed; no prior audit edited or shortened).

## § 5 — D-class decisions (operator routing required)

Each carries a default lean + rationale + decision-by stage. None may be unilaterally
inverted by an execution stage.

### D-A — first-sub-phase sequencing: task-1 vs task-2
- **Question:** task-1 common-3dgs and task-2 render-similarity are co-equal §3.1 roots.
  task-1's Stage 0 is gated by the PENDING Inria SHA (§ 5 STOP-A); task-2 needs **no**
  external SHA (PSNR/SSIM/LPIPS via `scikit-image`+`lpips`, `docs/phases/phase-3-plan.md:317-324`).
  Hold task-1 first per §4.1, or run task-2 first so the cadence starts without waiting on
  operator SHA-pinning + the pre-dispatch-review?
- **Lean:** **hold task-1 first** (the §4.1 default; the dependency-graph re-anchor produces
  no different conclusion). The Inria-SHA + pre-dispatch-review gates are operator-pending
  preconditions of Stage 0 anyway, and both gate the *first dispatch* regardless; pinning the
  SHA is a quick operator action. Operator may elect **task-2-first** if SHA-pinning will lag.
- **Decision-by:** before Stage-0 dispatch (operator).

### D-B — catalog ↔ plan stack-assignment drift (forward)
- **Question:** master catalog assigns several Phase-3 sims to different stacks than the plan
  (Lenia B/E vs D `docs/planning/bit-physics-master-catalog.md:4683` vs
  `docs/phases/phase-3-plan.md:155`; the live exemplar). Resolve now or per-sim?
- **Lean:** **per-sim, at each sim's own plan-drafting** (Convention M re-anchor at dispatch,
  mirroring D1's unexecuted-plan deferral). Catalog is a planning artifact, not normative
  (architecture-vs-catalog authority ruling) → **not edited**. Where plan §2 documents a
  deliberate divergence (cloth→C `docs/phases/phase-3-plan.md:184`, rigid→Featherstone-E
  `docs/phases/phase-3-plan.md:188`) the locked decision governs. **Does NOT gate
  common-3dgs** (no catalog sim-stack-table row).
- **Decision-by:** Lenia/task-3 plan-drafting (not this sub-phase).

### D-C — common-3dgs render determinism class (§3.2.5 registry row)
- **Question:** the forward rasterizer (`render`, §3.2.1 "Deterministic given fixed inputs"
  `docs/phases/phase-3-plan.md:301`) uses alpha-accumulation that may be order-dependent.
  Declare `class = bit-exact, scope = same-stack-same-hw` or `class = distributional`
  (+ EFECT bound) in `tools/testkit/determinism/registry.toml` (`docs/phases/phase-3-plan.md:404-416`)?
- **Lean:** **MEASURE at Stage 1a/1c, default-declare `bit-exact / same-stack-same-hw`**
  (Warp f64 is bit-faithful to NumPy when op-order is preserved — [[stack-e-warp-f64-bit-faithful-to-numpy]]);
  if the rasterizer's atomic/parallel accumulation breaks bit-exactness even same-hw,
  re-characterize as `distributional` with an EFECT bound (Hard-Rule-2 re-characterization,
  precedent smoke-stack-e gate-14). Do NOT assume; measure.
- **Decision-by:** Stage 1a (draft) → Stage 1c (confirm).

### D-D — neural-rendered capture-writer (§3.2.3)
- **Question:** the neural-rendered category stores "rendered RGB image per step" via the
  common-3dgs writer OR a common-py PNG writer (`docs/phases/phase-3-plan.md:358`). Which does
  the smoke sim use?
- **Lean:** **follow the probe-discovered common-module smoke-sim pattern**
  (`docs/phases/phase-3-plan.md:1058-1060` — do NOT impose a default); default to the existing
  common-py PNG/capture writer if one exists, else a common-3dgs writer. §0.3 governs.
- **Decision-by:** Stage 1a probe.

### D-E — intermediate tag (`v0.2.2-sub-phase-phase-3-common-3dgs`)
- **Question:** tag at landing or remain untagged?
- **Lean:** **YES** (§3 argument: §D.2 criteria (a) external dependency + (b) durable
  architecture both met; lfs-architecture precedent). Operator-pushed (I7); the I7 allowlist
  in `tools/testkit/lfs_migration/test_i7_no_agent_tags.py` must be extended or the tag
  HARD_FAILs.
- **Decision-by:** Stage 2 (operator ratifies).

## § 6 — HARD RULE 2 STOP conditions (sub-phase-specific)

File a blocker in the relevant stage audit; do not improvise through.

- **STOP-A (Stage 0 gate).** The Inria gaussian-splatting SHA is **not pinned in §2** of
  `phase-3-plan.md` (probe §2.2 PENDING). Stage 0 cannot vendor `references/3DGS-reference/`
  without it, and Convention #8 forbids fabricating a SHA. **→ STOP; operator pins the SHA in
  §2 (separate operator-approved commit) before Stage-0 vendoring.**
- **STOP-B (Stage 0 gate).** The Phase-3 **pre-dispatch-review is ABSENT** (probe §2.1; v9
  amendment `docs/phases/phase-3-plan.md:34`). It gates the first sub-phase's dispatch. **→
  STOP; operator files `docs/_audits/phase-3/pre-dispatch-review-<UTC>.md` before Stage-0
  dispatch.**
- **STOP-C.** Cross-phase audit replay `--prior-phase phase-2` discrepancy at Stage 0
  (`docs/phases/phase-3-plan.md:18`). **→ BLOCKED.**
- **STOP-D.** Integrity baseline diverges from `c19492ad…d22cb52` (HARD_FAIL > 0) at any
  stage; or any I1–I7 invariant fails. **→ STOP.**
- **STOP-E.** The §3.2.1 API as discovered/built **cannot support task-8's consumption
  pattern** (mutate a working-copy `GaussianSplatModel` per frame: translation from MPM
  positions, scale/rotation from deformation gradient, SH frozen,
  `docs/phases/phase-3-plan.md:309`). **→ surface SHIFTED in the Stage-1b report** (probe-time
  per §3.2.1 `docs/phases/phase-3-plan.md:313`); STOP only if unrecoverable in scope.
- **STOP-F.** Mutation score < 80% on `common/common-3dgs/` at Stage 1c and not closable by
  test-tightening. **→ surface; do NOT widen the gate.**
- **STOP-G.** Discovered common-module / smoke-sim / capture pattern **differs from §3.2**
  → follow discovered pattern, document **SHIFTED** (§0.3 `docs/phases/phase-3-plan.md:138-140`)
  — surface, not a hard STOP unless it breaks the §3.2.1 contract.

## § 7 — Risk register

- **R-1 (published-audit append-only).** NEVER edit a published `docs/_audits/**` file.
  Append-only verified by `git diff --name-status` (S9-PHASE2-3). A stage that must edit a
  published audit → STOP.
- **R-2 (external-dependency vendoring).** Vendoring Inria code requires the pinned SHA +
  license + security-advisory check (§6.1 `docs/phases/phase-3-plan.md:1069`; §2.11 per-upstream
  `manifest.yaml`). No SHA → STOP-A. No fabrication (Convention #8).
- **R-3 (render non-determinism).** D-C: if the rasterizer is not bit-exact even same-hw,
  re-characterize the determinism class rather than forcing bit-exactness — STOP and route.
- **R-4 (scope creep into Phase-4 WU-C).** Differentiable splatting / training / `TrainingLoop`
  / `PhysicsCoupling` are OUT (§1.2). A stage tempted to build them → STOP, defer to Phase 4.
- **R-5 (integrity cat1/cat4).** This charter + audits are docs (cat4 draft-time path:line);
  any probe report under `tools/testkit/probes/` is cat1.intra-repo (full repo-relative paths;
  `evidence_hashes`/`evidence_paths` are YAML **mappings**, not lists —
  [[cat1-scans-probes-evidence-hashes-mapping]]). Run integrity --all + verify_evidence before
  each commit; baseline must hold.

## § 8 — Open questions / forward-routing

- **Operator-pending (gate Stage-0 dispatch, NOT plan-drafting):** STOP-A (Inria SHA pin in
  §2) and STOP-B (pre-dispatch-review filed). Both are surfaced; neither blocks this
  plan-drafting.
- **D-A sequencing** (task-1 vs task-2) — operator routes before Stage-0 dispatch.
- **Phase-4 pre-dispatch review** is a separate operator-pending track
  (`docs/_audits/phase-4/pre-dispatch-review-<UTC>.md`); NOT part of this sub-phase.
- **Other Phase-3 sub-phases** (render-similarity, lenia, rigid-body, cloth, NCA,
  pinn-poisson, 3dgs-mpm, common-warp-maturation, landing) are re-framed under this same
  cadence at their own plan-drafting; this charter drafts only the first. The §4.1 sequence
  (`docs/phases/phase-3-plan.md:681-701`) is the default order; the catalog stack-drift (D-B)
  is re-anchored per-sim at dispatch.
- **Any `phase-3-plan.md` spec amendment** (beyond the K-2 path fix already landed) is
  operator-approved + separate-commit only (never unilateral).

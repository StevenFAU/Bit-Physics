---
date: 2026-05-28T00-05-29Z
author: phase-3 plan-drafting (Claude Code)
subject: Phase 3 first sub-phase — common-3dgs ANCHOR-PROBE
verdict: SHIFTED
head_sha: 44cc8cbfadc43682c42ff5c141c19a5fbd090885
prior_phase_tag: v0.2.1-sub-phase-lfs-architecture
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN, byte-identical)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
scope_note: >
  Probe-only artifact. Every concrete claim is tagged FACT / INFERENCE and
  cites full repo-relative path:line where it is a repo fact. External facts are
  tagged WEB and were NOT fetched in this session (the probe records that they are
  PENDING in §2 of phase-3-plan.md, not their values). This probe re-anchors the
  Phase-3-plan-encoded scope against HEAD before the charter is drafted; it does
  not re-author DELIVERABLES / OUT OF SCOPE / ANCHOR-PROBE content from §6.1.
---

# Phase 3 first sub-phase (common-3dgs) — anchor-probe report

> Sibling of `docs/phases/sub-phase-phase-3-common-3dgs.md` (the charter). This
> document holds the probe FACTs; the charter summarizes + routes. Posture per
> Convention #8 (grep-verify, no fabrication) and Convention M (HEAD wins on
> drift). Probe run UTC `2026-05-28T00-05-29Z`.

## §0 — Mission re-statement

Re-frame Phase 3 EXECUTION (authored under the v8 single-agent sequential model,
`docs/phases/phase-3-plan.md:11,46,48`) as a sequence of sub-phases under the
matured per-sub-phase cadence (plan-drafting → Stage 0 → 1a/1b/1c → Stage 2),
inheriting scope / locked decisions / interface contracts / per-task DELIVERABLES
unchanged. Determine the FIRST sub-phase by re-anchoring the §3.1 deliverable-map
dependency graph, then draft it. This probe supports that determination.

## §1 — State checks (FACT)

| Check | Expectation | Result |
|---|---|---|
| HEAD on `origin/main` | successor of / equal to `44cc8cb` | **`44cc8cb`** (== the cleanup Stage-2 SHA-back-fill itself; `git rev-parse HEAD` == `git rev-parse origin/main`; no drift, no successor commit yet) |
| `v0.0.0-phase-0` resolves | yes | `727ffb9b513f…` ✓ |
| `v0.1.0-phase-1` resolves | yes | `990856502ac4…` ✓ |
| `v0.2.0-phase-2` resolves | yes | `fd21445614d2…` ✓ |
| `v0.2.1-sub-phase-lfs-architecture` resolves | yes | `8f4dea3069fb…` ✓ |
| Integrity Cat 1–5 sweep | 0 HARD_FAIL / 14 SOFT_WARN, digest `c19492ad…d22cb52` | **byte-identical** (`uv run --no-sync python -m integrity --all --mode strict` → stderr-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`; report summary line `0 HARD_FAIL, 14 SOFT_WARN`) ✓ |
| I2 bit-identity replay | `ok=True`, 8/8 gates | `replay_prior_phase --prior-phase phase-1` → `summary: prior_phase=v0.1.0-phase-1 ok=True`; integrity/pytest/equivalence/determinism/perf-ledger/property/mutation/tolerance-budget all PASS ✓ |
| I7 invariant test | green | `pytest tools/testkit/lfs_migration/` → **16 passed** (PD-1 fix from cleanup Stage-1.D held) ✓ |

**(FACT) Note on the "successor of 44cc8cb" expectation.** The dispatch brief expected HEAD
to be a *successor* of `44cc8cb`. At probe time HEAD **is** `44cc8cb` — `main` has not advanced
since the cleanup Stage-2 back-fill. This is the latest cleanup commit, not a regression;
Convention M (HEAD wins) → proceed against `44cc8cb`.

### §1.1 — verify_evidence sweep across prior landing audits (FACT)

`uv run --no-sync python -m integrity.scripts.verify_evidence --audit <A>`, all PASS / 0 fail:

| Audit | Result |
|---|---|
| `docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md` | 20 pass / 0 fail @ `85da2fc89112` |
| `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` | 36 pass / 0 fail @ `afdf44a509e7` |
| `docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md` | 7 pass / 0 fail @ `832e95abd1e3` |
| `docs/_audits/phase-2/sub-phase-lfs-architecture/sub-phase-landing-2026-05-27T18-38-40Z.md` | 24 pass / 0 fail @ `6139b5958354` |
| `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sub-phase-landing-2026-05-27T23-16-50Z.md` | 24 pass / 0 fail @ `abf077c31a64` |

No regression on any prior landing audit. → no verify_evidence BLOCKED condition.

## §2 — Phase-3-specific surfacings (report status; do not pre-resolve)

### §2.1 — Phase 3 pre-dispatch-review status: **ABSENT** (FACT)

`docs/_audits/phase-3/` did not exist at probe time (`ls` → no such directory); no
`pre-dispatch-review-*.md`. The v9 PHASE-PLAN-REVIEW amendment
(`docs/phases/phase-3-plan.md:34`) requires the owner to run a phase-plan-review
session before dispatch, landing at `docs/_audits/phase-3/pre-dispatch-review-<UTC>.md`,
because Phase 3 introduces first-of-kind components (common-3dgs, render-similarity,
MPM-3DGS coupling). → **operator-pending; gates the first sub-phase's Stage-0 dispatch,
NOT this plan-drafting.**

### §2.2 — External-SHA pinning status: **ALL FIVE PENDING** (FACT)

The v8 amendment block (`docs/phases/phase-3-plan.md:52-57`) states the owner web-fetches
and locks five external SHAs **in §2 (locked decisions)** before dispatch. Grep of §2
(`docs/phases/phase-3-plan.md:180-255`) for any 7–40-hex SHA → **NONE**. §2.3
(`:194`) and §2.4 (`:198`) say "at pinned SHA" with **no actual hex**.

| Upstream | Gates which task | §2 pin status |
|---|---|---|
| Inria gaussian-splatting | **task-1 common-3dgs** (`:53`, `:1069`, §2.11 `:226`) | **PENDING** |
| PhysGaussian | task-8 3dgs-mpm (`:54`) | PENDING |
| Bender PositionBasedDynamics | task-5 cloth (`:55`, §2.3 `:194`) | PENDING |
| PhysicsNeMo PINN tutorial | task-7 pinn-poisson (`:56`, §2.4 `:198`) | PENDING |
| Lenia reference repo (if vendoring) | task-3 lenia (`:57`) | PENDING |

**Consequence for the first sub-phase (HARD RULE 2 surface):** task-1 common-3dgs Stage 0
needs the Inria gaussian-splatting SHA pinned to vendor `references/3DGS-reference/`
(`docs/phases/phase-3-plan.md:1087-1088`, §3.2.1 smoke-sim loads a vendored Inria scene
`:305`). The SHA is **not** pinned in §2. Per the dispatch HARD RULE 2 STOP condition, this
gates **Stage-0 dispatch** of common-3dgs (operator-pending), not this plan-drafting. Filed as
a Stage-0 entry blocker in the charter (§ Stage 0).

### §2.3 — Catalog ↔ plan stack-assignment drift (FACT; do not edit catalog)

Master catalog stack table (`docs/planning/bit-physics-master-catalog.md:4683`) and §21.4.8
(`:1989`) vs `phase-3-plan.md` §1 scope table (`:152-162`):

| Sim | Catalog stack | Plan stack | Verdict |
|---|---|---|---|
| **Lenia** (task-3) | **B / E** (`docs/planning/bit-physics-master-catalog.md:4683`; §21.4.8 `docs/planning/bit-physics-master-catalog.md:1989` "Tier 0, 1") | **D (Taichi)** (`docs/phases/phase-3-plan.md:155`) | **DRIFT** (undocumented; the live exemplar) |
| Ising (task-3a) | B / E (`docs/planning/bit-physics-master-catalog.md:4683`) | B (Stack B / WebGPU, `docs/phases/phase-3-plan.md:59`) | matches at Tier-0 B |
| Mass-spring cloth (task-5) | B / E (`docs/planning/bit-physics-master-catalog.md:886` §10.6.2) | C (Vulkan) (`docs/phases/phase-3-plan.md:157`) | divergence **documented + locked** by plan §2.1 (`docs/phases/phase-3-plan.md:184`); not undocumented drift |
| Rigid-body (task-4) | XPBD, B / E (`docs/planning/bit-physics-master-catalog.md:888` §10.6.3) | E (Warp), Featherstone-ABA (`docs/phases/phase-3-plan.md:156`) | algorithm differs (Featherstone ≠ XPBD); E partially aligns; plan §2.2 (`docs/phases/phase-3-plan.md:188`) documents |
| 3DGS / common-3dgs (task-1/8) | Phase-4 WU-C frontier-variant (`docs/planning/bit-physics-master-catalog.md:199`, `docs/planning/bit-physics-master-catalog.md:535`) | Phase-3 introduction, Stack-E ecosystem (`docs/phases/phase-3-plan.md:161`) | forward-placement; plan §3.2.1 (`docs/phases/phase-3-plan.md:282`) coordinates naming w/ Phase-4 WU-C; **no sim-stack-table row → does NOT gate common-3dgs** |

**(INFERENCE) Default lean (charter D-class):** none of these gate the FIRST sub-phase
(common-3dgs is infrastructure with no catalog sim-stack-table row). Each sim sub-phase
re-anchors its own stack-vs-catalog at its own plan-drafting (Convention M, mirroring the
D1 precedent that deferred unexecuted-plan re-anchoring to dispatch time). The catalog is a
planning artifact, not a normative spec (architecture-vs-catalog authority ruling); it is
**not edited**. Where plan §2 locked-decisions document a deliberate divergence (cloth→C,
rigid→Featherstone-E), the locked decision governs. The Lenia B/E-vs-D drift is the routable
exemplar when task-3 dispatches.

## §3 — Dependency-graph re-anchor → first sub-phase (FACT + INFERENCE)

### §3.1 — §3.1 deliverable-map edges (FACT, `docs/phases/phase-3-plan.md:263-276`)

Hard inter-task edges only: **task-1 → task-8** (common-3dgs blocks 3dgs-mpm);
**task-2 → task-6** and **task-2 → task-8** (render-similarity blocks NCA D↔B gate +
3dgs-mpm golden-render gate). All other dependencies are informational (task-9 reads
consumer sites; task-10 reads all reports). Phase 3 is "mostly terminal sims with
independent verification" (`:276`).

### §3.2 — Roots and the §4.1 default (FACT)

task-1 and task-2 are **co-equal roots** — neither depends on the other; both are pure
infrastructure that unblocks downstream sims. §4.1 (`:681-712`) breaks the tie toward
**task-1 common-3dgs** by "dependencies first" + listing order (`:682`, `:705`).

**(INFERENCE) Re-anchor conclusion:** the dependency graph does **NOT** force task-1 over
task-2; it is indifferent between the two roots. The §4.1 default (task-1) therefore stands
as the first sub-phase — the graph produces **no different conclusion** that would trip the
HARD RULE 2 "first-sub-phase-choice-differs" STOP. The charter is drafted for **task-1
common-3dgs** (short-name `common-3dgs`).

### §3.3 — Material-consequence asymmetry surfaced (FACT → D-class, not a unilateral swap)

There IS a material consequence to the task-1-vs-task-2 ordering that the §4.1 listing did
not weigh: **task-1's Stage 0 is gated by the PENDING Inria SHA (§2.2); task-2 render-similarity
needs NO external SHA** (PSNR/SSIM/LPIPS via `scikit-image` + the `lpips` PyPI package,
`docs/phases/phase-3-plan.md:317-324`). Choosing task-1 first means the cadence cannot start
until the operator pins the Inria SHA + files the pre-dispatch-review. This is surfaced as a
**D-class sequencing proposal** (charter D-A) for operator routing — **not** an improvised swap
(dispatch: "do not improvise the choice").

## §4 — §6.1 task-1 prompt: internal drift to surface (FACT; do NOT re-author)

The §6.1 common-3dgs prompt (`docs/phases/phase-3-plan.md:1012-1129`) carries two stale
surfaces that later amendments + the matured cadence supersede. The charter inherits the
DELIVERABLES / OUT OF SCOPE / ANCHOR-PROBE *content* but re-frames these:

1. **Stale API names.** §6.1 (`:1032,1037`) names `GaussianSet` + `forward_splat(...)`. §3.2.1
   (`:284-301`) supersedes with `GaussianSplatModel` + `render(model, camera, ...)` +
   `load_ply` classmethod + `save_ply` instance method, and §3.2.1's own note (`:284`) states
   the earlier `GaussianSet`/`forward_splat`/free-`load_ply` draft "ha[s] been aligned to Phase
   4's naming." v4/v8 amendment-2 (`:63`) locks the §3.2.1 names. **§3.2.1 governs on conflict.**
2. **Branch ceremony.** §6.1 (`:1021-1023,1104-1110`) carries `BASE BRANCH: phase-3-integration`,
   `YOUR BRANCH: phase-3/task-1-*`, `gh pr create`, MERGE PROTOCOL. The v8 trunk-based amendment
   (`:46`) supersedes all of it → commit directly to `main`; the matured sub-phase cadence
   replaces the per-task PR cycle with Stage 1a/1b/1c/2. **Charter re-frames to trunk-based +
   stages.**

These are recorded as charter §"Inherited-vs-reframed" notes — surfaced, not silently dropped,
and not edited into phase-3-plan.md (that is each sim's own dispatch-time concern; the K-2 fix
is the only phase-3-plan.md edit this session, per D1's narrow carve-out).

## §5 — Banked items consumed (Convention M re-anchor)

### §5.1 — K-2 (cleanup-banking): golden-path drift in phase-3-plan.md (FACT)

Grep at HEAD: **exactly 7** occurrences of `tools/testkit/code_verification/golden/` at lines
1246, 1263, 1361, 1383, 1518, 1538, 1648 — **matches** the coordinator's banked count of 7
(no STOP). Canonical per §3.2.7 (`:478`) is `tools/testkit/golden/<type>/<sim-name>.<ext>`;
`tools/testkit/code_verification/` exists but its `golden/` subdir is fictional (conventions
§B note #16, `docs/conventions/sub-phase-conventions.md:1140`; the golden tree is at
`tools/testkit/golden/`). Fixed surgically (drop `code_verification/`) in its own commit —
mirrors the cleanup Stage-1.A executed-plan fix (`c58d4ab`). Lineage: D1 routing in
`docs/phases/sub-phase-phase-2-cleanup.md:48,176-179`.

### §5.2 — S9-PHASE2-1/2/3 (cleanup-banking): phase-close-mechanics refinements (FACT)

Defined at the Phase-2 Stage-9 landing audit; routed to Phase-3 plan-drafting Convention-M
consumption by cleanup Stage-1.G (`docs/_audits/phase-2/sub-phase-phase-2-cleanup/stage-1-g-checkpoint-2026-05-27T22-51-18Z.md:56`):

- **S9-PHASE2-1** (`docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:73`): the §2.12 Stage-9
  landing mechanism was authored for single-linear-dispatch (read N stage-reports off a branch +
  merge); execution was N independent sub-phases on `main`. The landing **consolidates the
  terminal sub-phase audits already on `main`** instead.
- **S9-PHASE2-2** (`:171`): execution landed a **supernumerary** 9th port sub-phase beyond the
  spec §11.3 1:1 enumeration; the reconciliation must accommodate additive, well-documented
  supernumerary sub-phases, not assume strict 1:1.
- **S9-PHASE2-3** (`:101`): two §2.12 anchors don't exist — `docs/project-state.md` (never built)
  and `integrity.scripts.check_append_only` (never built). Status is served by `CHANGELOG.md` +
  per-sub-phase audits; append-only is verified by
  `git diff --name-status <prior-tag> HEAD -- docs/_audits/`.

**Consumption:** encoded into the charter's Stage-2 landing-audit template (charter § Stage 2 /
§ landing-audit template). Lineage cited there.

## §6 — progress.md status (FACT)

`docs/_audits/phase-3/progress.md` **ABSENT** at probe time. §9.4 / §3.5
(`docs/phases/phase-3-plan.md:628-659`) require an append-only progress bridge. Initialized
this session (deliverable E) with a one-line header + the plan-drafting entry. Adapted to the
sub-phase cadence: the v8 schema's "Branch merged at SHA / PR" rows (`:639-640`) are
trunk-based-superseded → recorded as "Landed at SHA" (no PR).

## §7 — Probe verdict

**SHIFTED.** The Phase-3-encoded scope re-anchors cleanly to HEAD and the first sub-phase
(common-3dgs) is determined per the §4.1 default with the dependency graph confirming (no
different-choice STOP). SHIFTED — not CONFIRMED — because the probe surfaces that **Stage-0
dispatch of common-3dgs is gated by two operator-pending preconditions** (Inria SHA pin §2.2;
pre-dispatch-review §2.1), the v8 single-agent execution model is re-framed into the matured
sub-phase cadence (a structural shift from plan §4–§9), and multiple D-class routings + §6.1
internal drift are surfaced. No HARD RULE 2 STOP fired against *plan-drafting itself*; the
SHA-pin STOP is filed as a Stage-0-dispatch blocker (the charter is draftable and drafted).

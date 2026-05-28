# Phase 3 — Reference sims, secondary categories

> **Version:** 8.0 (dispatch-hardening pass, May 18 2026)
> **Date drafted:** 2026-05-17 (v7); 2026-05-18 (v8 amendments)
> **Project:** Bit-Physics portfolio
> **Repo:** `git@github.com:StevenFAU/Bit-Physics.git`
> **Owner / human-in-loop:** Steven Cohen
> **Spec authority:** `docs/architecture.md` (v2.4; originally drafted as `gpu-sims-design-spec-v2.md`) + spec Appendix D + spec Appendix G + spec Appendix E
> **Plan location:** `docs/phases/phase-3-plan.md` (this file).
> **Status:** dispatch-ready (contingent on Phase 2 landing CONFIRMED and owner preflight per § 9).
> **Execution model:** Sequential single-agent. One Claude Code agent role at a time, working through all tasks; one claude.ai chat coordinator. Per Anthropic's long-running-agent guidance, sessions bridge via a progress file + git history.
> **Stance:** Two equal-weight halves:
> - **Architecture (§3):** the interface contracts ("sockets") between Phase 3 deliverables.
> - **Coordination (§4–§9):** sequential task flow, trunk-based commits per task, failure recovery, runbook.

> **v9 verification-hardening amendments (May 18 2026, post-design-spec v2.4):** Normative; supersedes conflicting text below.
>
> **CROSS-PHASE AUDIT REPLAY (task-1 first action):** Before any other action in task-1, the agent runs `python -m integrity.scripts.replay_prior_phase --prior-phase phase-2 --audit docs/_audits/phase-2/landing-<UTC>.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`. Discrepancy → BLOCKED. Per spec § 7.5.
>
> **GATE COUNT EXPANDED:** Tasks 3, 3a, 4, 5, 6, 7, 8 (the sim tasks) pass the spec § 3.5 thirteen gates (v2.4 expansion). Plus cross-stack equivalence Gate 14 for tasks that touch sims also present in Phase 1/2. Tasks 1, 2, 9, 10 are infrastructure tasks subject to the infrastructure-verification surrogates per spec § 2.11.
>
> **FAILING-TESTS OUTPUT HASH:** Every sim task's failing-tests commit MUST carry `Failing-tests-output: …` + `Failing-tests-output-hash: sha256:…` in the footer per spec § 1.3 step 4. The implementation commit references the witnessed hash. Task-10 (closing) replays 2 random sim tasks' failing-tests commits to verify hashes.
>
> **TOLERANCE-BUDGET COMPLIANCE:** Per spec § 2.6, every per-sim override in `tolerance.toml` is within `tolerance-budget.toml` cap. Cat-X HARD_FAILs over-budget overrides. Tolerance-budget amendments require separate operator-approved commit + audit at `docs/_audits/tolerance-budget-amendments/<UTC>.md`.
>
> **PERF-LEDGER ROW PER SIM:** Each sim task appends a row to `docs/perf-ledger.md`. Task-10 reviews for regressions.
>
> **MUTATION-TESTING:** Task-1 (common-3dgs) and task-2 (render-similarity) introduce new testable surfaces in the testkit family; thresholds per spec § 2.13. Task-9 (common-warp maturation) extends an existing surface; mutation score must not regress.
>
> **PROPERTY-BASED TESTING:** Every sim task declares ≥ 2 PBT invariants in spec § 6 and implements them per spec § 2.14.
>
> **INDEPENDENT-REFERENCE ANCHORS:** New golden tables (e.g., task-3a Ising classical Onsager critical-point reference, task-7 PINN-Poisson analytical solution comparison) carry ≥ 3 independent-reference anchors per spec § 2.4.
>
> **PHASE-PLAN REVIEW:** Phase 3 introduces several first-of-kind components (common-3dgs, render-similarity, MPM-3DGS coupling). Per spec § 7.4 Convention E-addendum, the owner runs a phase-plan-review session before dispatch. Review audit lands at `docs/_audits/phase-3/pre-dispatch-review-<UTC>.md`.
>
> **OPERATOR-ONLY TAG PUSHING:** Task-10's closing report ends with `Tag pushed: NO (operator action required)`. Agent does not push `v0.3.0-phase-3`; operator does after independent review.
>
> **EVIDENCE-PATH VERIFICATION:** Task-10 runs `verify_evidence.py` on every task report. Failure → REFUTED.
>
> **APPEND-ONLY CHECK:** Task-10 includes the append-only check against `v0.2.0-phase-2` (no Phase 0/1/2 audit may be edited or shortened).
>
> **SCHEMA-CORPUS GROWTH:** Each sim task appends `tests/fixtures/legacy-captures/phase-3-<sim>.h5`+sidecar for Phase 4 WU-A's schema-bump round-trip test.

> **v8 dispatch-hardening amendments (May 18 2026):** This block is normative and supersedes any conflicting text below.
>
> **TRUNK-BASED DEVELOPMENT (LOCKED):** All references to `phase-3-integration` base branch, `phase-3/task-N-*` sub-branches, `gh pr create`, "MERGE PROTOCOL", `--base phase-3-integration`, and any branch/PR ceremony in §§ 2.16, 4.3, 5.2, and the per-task prompts at §§ 6.1–6.10 are SUPERSEDED. Every commit goes directly to `main` per spec § 7.12. Wherever a task prompt says `BASE BRANCH: phase-3-integration`, read `BASE BRANCH: main`. Wherever it says `YOUR BRANCH: phase-3/task-N-<name>`, ignore that line and commit directly to `main`. Wherever it says `gh pr create ...`, skip — there is no PR. Wherever it says "MERGE PROTOCOL per phase plan §4.3", replace with "COMMIT PROTOCOL: commit directly to `main`; tag at phase landing." An agent encountering branch-ceremony instructions SHOULD follow the trunk-based form per this amendment.
>
> **SINGLE-AGENT DISPATCH:** One coordinator chat + one Claude Code agent role for the whole phase. The agent runs auto-accept; reads this whole plan; works through task-1 → task-3 → task-3a → task-4 → … → task-10 sequentially; reports at each task close. Context-spanning sessions supported via `docs/_audits/phase-3/progress.md` per spec Appendix D § D.10.
>
> **ACTION #1:** Every Claude Code session in this phase starts with `python tools/dispatch/preflight-phase.py 3`. Exit 0 → proceed. Exit 1 → BLOCKED.
>
> **EXTERNAL SHAS PINNED PRE-DISPATCH:** Owner web-fetches and locks the following SHAs in § 2 (locked decisions) before Phase 3 dispatches:
> - Inria gaussian-splatting SHA (for task-1 common-3dgs vendoring)
> - PhysGaussian SHA (cited; also for Phase 4 Stage 19)
> - Bender PositionBasedDynamics SHA (for task-5 cloth-xpbd)
> - PhysicsNeMo PINN tutorial pin (for task-7)
> - Lenia reference repo SHA if vendoring (task-3)
>
> **TASK-3A ISING-CLASSICAL:** New task between task-3 (Lenia) and task-4. Per spec § 11.4 amendment. Lightweight Metropolis-Hastings 2D Ising; closed-form-equivalent verification (analytic critical-point at T_c ≈ 2.27); Stack B (TypeScript/WebGPU); writes capture `metropolis-128sq-T2.27-seed42-step10000` per spec Appendix D § D.2.3. Task-3a prompt body inserted at § 6.3a.
>
> **OTHER LOCKED ITEMS** (carried from v4 review amendments):
> 1. Defensive review (~15–20 min, spot-check FACTs + re-run one gate) for tasks **1, 2, 9** (first deployment of new patterns). Acceptance review (~2 min, read report + verify CI green) for tasks **3, 3a, 4–8, 10** (subsequent applications). Owner attention total: under an hour.
> 2. common-3dgs API per v4 review § 7.7: `GaussianSplatModel`, `render(model, camera)`, `load_ply` classmethod, `save_ply` instance method.
> 3. Render-similarity location: `tools/testkit/render_similarity/` (underscored, per spec § 3.1).
> 4. Audit-file paths per spec § 8.1: `docs/_audits/phase-3/<task-name>-<UTC>.md`.
> 5. Report front-matter per canonical YAML schema (spec § 7.5).
>
> The earlier v4 review amendment block below is retained for changelog tracking; v8 overrides any conflict.

> **v4 review amendments (apply before dispatch):**
>
> 1. **Branch model superseded by spec § 7.12 trunk-based development.** This plan's `phase-3-integration` long-lived branch + per-task PR sub-branches (§2.16, §4.3) are superseded. Each task commits directly to `main`. Owner review happens between tasks via the report; no GitHub UI PR step. §9.2's branch-protection preflight is dropped (no protected branches).
> 2. **PR review semantics:** defensive review (~15–20 min) for tasks **1, 2, 9** (first deployment of new patterns: common-3dgs, render-similarity, common-warp maturation). Acceptance review (~2 min) for tasks **3–8**.
> 3. **common-3dgs API aligned with Phase 4 WU-C naming per v4 review § 7.7.**
> 4. **Render-similarity location at `tools/testkit/render_similarity/`.**
> 5. **Add task-3a: ising-classical (Stack B, quantum-adjacent).**
> 6. **Audit-file paths standardized per spec § 8.1.**
> 7. **Report front-matter per canonical YAML schema (spec § 7.5).**
> 8. **Single-agent dispatch (May 18 2026 amendment).**

---

## Table of contents

- §0. Plan confidence & known unknowns
- §1. Phase 3 scope
- §2. Locked decisions
- §3. Architecture & interface contracts
  - §3.1 Deliverable map
  - §3.2 Interface contracts (sockets)
  - §3.3 Sequential data flow
  - §3.4 Canonical naming
  - §3.5 Progress-file bridge
- §4. Sequential execution model
  - §4.1 Task sequence and ordering rationale
  - §4.2 Coordinator responsibilities
  - §4.3 Per-task branch + PR cycle
  - §4.4 Failure recovery
- §5. Protocols
  - §5.1 Standard task report format
  - §5.2 PR description template
  - §5.3 Drift-handling playbook
  - §5.4 Layer 4 thirteen-gate reference (v2.4)
- §6. Task prompts (§6.1 through §6.10)
- §7. Audit-trail expectations
- §8. Coordinator chat prompt
- §9. Owner preflight + runbook

---

## 0. Plan confidence & known unknowns

### 0.1 Confident

- Phase 3 sub-items (3.1–3.8) faithful to spec §11.4.
- Sequential single-agent execution model defensible against industry standards (Anthropic workflow-pattern guidance, see deviation rationale §4 intro).
- Architecture (§3) defines interface contracts upfront so each task has clear inputs and outputs.
- Naming canonical (§3.4): one short-name per task used in branch + report + sim path + spec path.
- Coordination protocol (§4): linear task sequence with PR-based merges and owner as human-in-loop.
- Failure recovery procedure (§4.4) clean because sequential isolates each task.
- Progress-file bridge (§3.5) per Anthropic long-running-agent guidance.
- Drift-handling playbook (§5.3) covers expected task friction.

### 0.2 Cannot verify without synced Phase-2-end repo (task-probe responsibilities)

- Exact public API surfaces of `common/common-py/`, `common/common-warp/`, `common/common-cpp/`, `common/common-ts/`.
- Whether `tools/testkit/probes/template.md` exists per spec §11.1 item 0.7.
- Whether `tools/testkit/equivalence/` baseline harness shape matches §3.2.2 assumptions (task-2 adapts at probe time if not).
- Whether `tools/testkit/determinism/` has a per-sim registry; exact filename probe-discovered.
- Actual `common-warp` consumer count at the time task-9 dispatches.
- Stack B test infra. task-6 probes.
- `wp.from_torch()` / `wp.to_torch()` interop. task-7 probes.
- Location convention for common-module smoke sims. task-1 probes.
- Exact convention numbers in spec Appendix G. Plan uses conceptual identifiers (Convention #8 = "no fabrication from memory", Convention M = "re-anchor before edit", etc.); tasks consult local numbering.
- Exact spec section numbers. Plan references by spec ToC at draft time; if re-numbered, tasks resolve via section title. Mismatches → SHIFTED in report §1.
- Whether spec uses Tier 1/2/3 diagnostics, Cat 1–5 integrity, Cat 1–7 (Roy V&V), or hybrid. Plan uses Tier + Cat per user history; tasks adapt per §5.3.

### 0.3 Existing conventions take precedence over §3.2 prescriptions

§3.2 specifies interface contracts (CLI flag set, spec sheet schema, tier-3 diagnostic signature, capture formats, tolerance/registry row schemas). **Where Phase 0/1/2 has already established a pattern for any of these surfaces, the task SHALL follow the established pattern.** §3.2 contracts are starting designs for new surfaces only; they are not authoritative over what already exists. Each task's probe step is the verification gate — if discovered pattern differs from §3.2, follow discovered pattern and document SHIFTED in report §1.

### 0.4 What this plan adds beyond the spec

The spec defines categories, stacks, anchors, layered verification, and convention vocabulary. It does NOT specify per-sim CLI flags, tolerance row schemas, capture format details, test fixture naming, CI workflow job templates, or the exact public API of new common modules. **Those are this plan's job** — and they're in §3.

---

## 1. Phase 3 scope

Per spec §11.4. Eight spec sub-items plus one Phase-3-only addition:

| # | Sub-phase | Category | Stack | Anchor / lineage |
|---|---|---|---|---|
| 3.1 | Lenia | continuous-ca (Lenia subfamily) | D (Taichi) | Chan 2019 |
| 3.2 | Neural CA | continuous-ca (NCA subfamily) | D (PyTorch train) + B (custom WGSL inference) | Mordvintsev 2020 |
| 3.3 | Rigid-body pedagogical | rigid-body **(NEW)** | E (Warp) | Featherstone 2008; no Newton dep; textbook citation only |
| 3.4 | Soft-body cloth | soft-body **(NEW)** | C (Vulkan) | XPBD (Macklin 2016); Bender PBD upstream |
| 3.5 | First 3DGS — MPM-3DGS | neural-rendered **(NEW)** | E (Warp) | PhysGaussian (Xie 2024) |
| 3.6 | First learned-dynamics — PINN 2D Poisson | learned-dynamics **(NEW)** | E + PyTorch | Raissi 2019; PhysicsNeMo PINN tutorial upstream |
| 3.7 | `common-warp` matures | infrastructure | E | rule-of-three + doc polish + test coverage + API stabilization |
| 3.8 | `common-3dgs` introduced | infrastructure **(NEW common-module)** | E ecosystem | Inria gaussian-splatting |
| **3.x** | **Render-similarity harness** **(Phase-3 infra)** | testkit extension | Python | PSNR/SSIM/LPIPS in `tools/testkit/equivalence/` |

**Four new top-level folders:** `rigid-body/`, `soft-body/`, `neural-rendered/`, `learned-dynamics/`. One new common-module (`common/common-3dgs/`); one testkit extension; one maturation pass on `common/common-warp/`.

**Not in Phase 3** (banked for Phase 4+): Newton-backed sims (4.23–4.25), differentiable variants, sparse/NanoVDB variants, frontier neural-rendered sims, Stack F adoption, GNS / learned LES / foundation models.

### 1.1 Scope discipline

Each Phase 3 sim is a **Layer 4 reference**. Out-of-scope drift is a common Phase 3 failure mode; tasks refer to their per-prompt `OUT OF SCOPE` list when tempted.

### 1.2 Wall-clock

Spec §11.8: 3–6 months. Sequential execution puts critical path at the upper end of that range (estimated 12–18 weeks for ten tasks). Owner-review time ~30–60 min × 10 PRs = 5–10 hours total.

The sequential wall-clock is materially longer than v6's parallel estimate (6–10 weeks). This is the cost of the reliability gain. Per §4 deviation rationale, that trade is intentional.

---

## 2. Locked decisions

The coordinator does not relitigate. Tasks work to these; surface override evidence in reports; task-10 reconciles at landing.

### 2.1 3.4 cloth — Stack C (Vulkan)

Balances `common-cpp` vs `common-warp` consumer counts. Phase 3 loads Stack E with 3.3, 3.5, 3.6. Aligns with SIGGRAPH 2025 native-performance soft-body frontier. Gives `common-cpp` a third active-development consumer.

### 2.2 3.3 rigid-body — Featherstone textbook citation only

No vendored OSS code upstream. Cat 1 citation discipline applies to code upstreams; textbook references go in spec §12 with page numbers. Verification: analytical pendulum + RK4-reference trajectories. Algorithm: Articulated-Body Algorithm (ABA) per Featherstone Ch. 7. Convention choices in `algebraic.md`.

### 2.3 3.4 cloth upstream — Bender PositionBasedDynamics

Vendor `InteractiveComputerGraphics/PositionBasedDynamics` at pinned SHA. Cite Macklin 2016 in spec §12.

### 2.4 3.6 PINN upstream — NVIDIA PhysicsNeMo PINN tutorial

Vendor at pinned SHA. Aligns with Stack E industry-tooling-frontier (spec §6.4, §12.6).

### 2.5 OpenUSD — preferred for new Stack E sims

Per spec §12.2. Phase 3 Stack E sims (3.3, 3.5, 3.6) ship USD export.

### 2.6 Stack F (Rust/wgpu) — defer

Spec §12.1 marks Phase 3 boundary as revisit. Decision: defer. **task-10 banks** at `docs/_audits/phase-3/stack-f-revisit.md`.

### 2.7 task-6 — single task for both Stack D + Stack B (NCA)

Equivalence gate ties them; splitting would risk the cross-stack contract.

### 2.8 task-7 — owns the 2D Poisson classical-FD reference

Phase 0 ships 1D heat MMS; 2D Poisson FD not pre-existing. task-7 ships at `tools/testkit/code_verification/classical-references/poisson-2d-fd/`.

### 2.9 task-6 — Stack B inference: custom WGSL compute shaders

Not ONNX Runtime Web, not TF.js. NCA is KB-scale; multi-MB runtime dep overkill. Aligns with Stack B's WebGPU-native posture (spec §4.2).

### 2.10 PyTorch in common-py — DEFER per rule-of-three

Tasks 6 and 7 use PyTorch directly (`import torch`). task-9 evaluates promotion at maturation pass.

### 2.11 Vendoring manifest — per-upstream `manifest.yaml`

Each `references/<upstream>/manifest.yaml` with SHA, source URL, license, vendoring date, citation pointer. No global manifest.

### 2.12 Render-similarity quality floors

PSNR ≥ 28 dB, SSIM ≥ 0.85, LPIPS ≤ 0.15. Tasks 6 and 8 lock spec sheet §9 bounds at their measured values. Below floor: surface as quality concern in §6.

### 2.13 task-8 PhysGaussian — explicit MVP + stretch

- **MVP (must-ship):** MPM particles drive Gaussian centers (translation); def-grad applied to scale + rotation; SH coefficients FROZEN at scene-load values.
- **Stretch:** Per-frame SH coefficient rotation. If >~3 days or test-stability issues: defer to Phase 4 as `3dgs-mpm-sh-update`, surface in report §10.

### 2.14 CI workflow steps — call commands directly, not via `just`

`pytest soft-body/mass-spring-cloth/cpp/tests/`, not `just test-cloth`. `just` recipes are for human convenience locally.

### 2.15 Phase 3 closing status — graded variants

- `closed-green`: all sub-phases CONFIRMED at all gates.
- `closed-with-shifted-N`: N sub-phases SHIFTED; sim ships, drift documented.
- `closed-with-blockers-N`: N sub-phases BLOCKED; owner decides re-dispatch / accept / re-scope.

### 2.16 Merge protocol — PR-based, owner-merged

Each task pushes branch and opens a PR via `gh pr create`. Owner reviews and merges via GitHub UI. Coordinator advances when owner confirms merge.

### 2.17 Sequential dispatch — one task at a time

Coordinator dispatches `task-N` only after `task-(N-1)` PR is merged (owner-confirmed). No parallelism. Failure of `task-N` halts dispatch until owner decides recovery (§4.4).

### 2.18 External upstream SHA pins (Stage-0 resolved — clears the v8 "EXTERNAL SHAS PINNED PRE-DISPATCH" gate)

Resolves the v8 amendment (§ "EXTERNAL SHAS PINNED PRE-DISPATCH", this file's preamble) for **all five** Phase-3 external upstreams in one place, per the coordinator-ratified delegation (2026-05-28) that the Stage-0 agent web-fetches + verifies + pins the SHAs (the pre-dispatch-review/STOP-B overhead having been retired in the same chat). Each SHA was web-fetched from the GitHub API and verified; none is fabricated (Convention #8). Pinning rule: latest stable release tag if one exists within the last 12 months (relative to the fetch date 2026-05-28), otherwise default-branch HEAD as of fetch time. Per-upstream `manifest.yaml` (§2.11) is authored by the consuming sub-phase at vendoring time and copies its row's SHA + license verbatim from here.

```
- Repo: https://github.com/graphdeco-inria/gaussian-splatting          # task-1 common-3dgs (THIS sub-phase)
  SHA: 54c035f7834b564019656c3e3fcc3646292f727d
  Released: default-branch HEAD (main; repo has NO tags)
  License: NOASSERTION (GitHub "Other"); the Gaussian-Splatting research license — NON-COMMERCIAL
  License-note: FIRST NON-PERMISSIVE upstream in the repo. Vendoring into references/3DGS-reference/
    is acceptable — references/ holds research material cited for derivation, NOT a redistributed
    binary or a relicensed component of Bit-Physics's MIT distribution — but the non-commercial
    clause is load-bearing: NO commercial use, NO relicensing. Every subsequent 3DGS sub-phase
    (task-8, Phase-4 WU-C) inherits this constraint. Surfaced, NOT a STOP-A (does not materially
    block research-material vendoring).
  Security: clean (2026-05-28; repository security-advisories array empty)
  Fetched: 2026-05-28T00:44Z
  Citation-pointer: docs/architecture.md §12 (references) + references/3DGS-reference/manifest.yaml (task-1 Stage-1b)
- Repo: https://github.com/XPandora/PhysGaussian                        # task-8 3dgs-mpm (cite-only here)
  SHA: 8339ed6aa2cd5d50e1001a254a3d95aea678a956
  Released: default-branch HEAD (main; repo has NO tags)
  License: NONE (no LICENSE file; GitHub license=null → all-rights-reserved by default)
  License-note: NO LICENSE present. Cite-only at this sub-phase (no vendoring of PhysGaussian by
    task-1). task-8's vendoring sub-phase MUST resolve license posture before vendoring
    references/PhysGaussian/ (request a license, or vendor cite-only/by-name per §2.2 / spec §2.4
    independent-derivation discipline). Flagged; not a STOP for common-3dgs Stage 0 (cite-only).
  Security: clean (2026-05-28; repository security-advisories array empty)
  Fetched: 2026-05-28T00:35Z
  Citation-pointer: docs/architecture.md §12 + references/PhysGaussian/manifest.yaml (task-8, later)
- Repo: https://github.com/InteractiveComputerGraphics/PositionBasedDynamics   # task-5 cloth-xpbd
  SHA: d0894bdb0190c5f273c0500ecad0e8c2bf21fc5f
  Released: default-branch HEAD (master). Latest release tag 2.2.0 is 2022-12-13 (>12 months); per
    the pinning rule, default-branch HEAD is used rather than the stale release.
  License: MIT
  License-note: permissive; MIT-compatible with Bit-Physics's MIT distribution posture.
  Security: clean (2026-05-28; repository security-advisories array empty)
  Fetched: 2026-05-28T00:50Z
  Citation-pointer: §2.3 (Macklin 2016, spec §12) + references/PositionBasedDynamics/manifest.yaml (task-5)
- Repo: https://github.com/NVIDIA/physicsnemo                           # task-7 pinn-poisson
  SHA: 766e485a4eddf4e5e50d371c87b39e6d4d65ea59
  Released: v2.1.0 (release published 2026-05-27; within 12 months → release tag pinned, not HEAD)
  License: Apache-2.0
  License-note: permissive; Apache-2.0-compatible with Bit-Physics's MIT distribution posture.
  Security: clean (2026-05-28; repository security-advisories array empty)
  Fetched: 2026-05-28T00:53Z
  Citation-pointer: §2.4 (spec §6.4/§12.6) + references/PhysicsNeMo-PINN/manifest.yaml (task-7)
- Repo: https://github.com/Chakazul/Lenia                               # task-3 lenia
  SHA: adfc542939266de7f4bb7ebb552e8499701ee107
  Released: default-branch HEAD (master). Latest release tag v3.5 is 2020-10-13 (>12 months); per
    the pinning rule, default-branch HEAD is used rather than the stale release.
  License: MIT
  License-note: permissive. Vendored at references/Chakazul-Lenia/ per §3.1 deliverable map
    (task-3 produces it); Chan 2019 cited in spec §12.
  Security: clean (2026-05-28; repository security-advisories array empty)
  Fetched: 2026-05-28T00:54Z
  Citation-pointer: §3.1 references/Chakazul-Lenia/ + references/Chakazul-Lenia/manifest.yaml (task-3)
```

---

## 3. Architecture & interface contracts

This is the section the spec doesn't write for Phase 3. It defines what each task produces and consumes, the exact shape of shared files, and the conventions across sims. Even sequentially, the contracts matter — each task needs to know what surfaces it can rely on from prior tasks.

### 3.1 Deliverable map — what each task produces, what each consumes

| Task | Produces (the socket) | Consumed by | Consumer dependency type |
|---|---|---|---|
| **task-1** | `common/common-3dgs/` public API; `docs/common/3dgs.md`; `references/3DGS-reference/`; 3dgs-smoke | **task-8** | hard |
| **task-2** | `tools/testkit/equivalence/render_similarity.py`; harness "render-similarity" mode; tolerance schema additions | **task-6** (D↔B gate); **task-8** (golden-render gate) | hard |
| **task-3** | `continuous-ca/lenia/python/`; golden tables; tier3 diagnostics; references/Chakazul-Lenia/ | (terminal) | — |
| **task-4** | `rigid-body/articulated-pedagogical/python/`; golden trajectories; tier3 diagnostics | **task-9** (common-warp consumer) | soft (informational) |
| **task-5** | `soft-body/mass-spring-cloth/cpp/`; golden positions; tier3 diagnostics; references/PositionBasedDynamics/ | (terminal) | — |
| **task-6** | `continuous-ca/neural-ca/python/`; `continuous-ca/neural-ca/typescript/`; golden checkpoint | (terminal) | — |
| **task-7** | `learned-dynamics/pinn-poisson/python/`; classical-FD reference; golden tables; references/PhysicsNeMo-PINN/ | **task-9** (common-warp consumer) | soft (informational) |
| **task-8** | `neural-rendered/3dgs-mpm/python/`; coupling.py (sim-local); golden renders; references/PhysGaussian/ | **task-9** (common-warp consumer) | soft (informational) |
| **task-9** | `common/common-warp/` extractions (if STRONG candidates); updated `docs/common/warp.md`; consumer-site refactors | **task-10** (closing audit lists) | informational |
| **task-10** | progress.md final entry; landing-<UTC>.md; stack-f-revisit.md; sha-back-fill.md | (final — closes phase) | — |

Phase 3 is mostly **terminal sims with independent verification**. The only hard inter-task dependencies are: task-1 → task-8, and task-2 → task-6 + task-8. All other dependencies are informational (task-9 reads consumer sites; task-10 reads all audit reports).

### 3.2 Interface contracts (sockets)

These define the exact shape of cross-task interfaces. Producing tasks read these as their design target. Consuming tasks read these as their consumption contract. **Per §0.3, where existing Phase 0/1/2 conventions exist for any of these surfaces, those existing conventions take precedence; §3.2 is the design for new surfaces only.**

#### 3.2.1 `common-3dgs` public API contract (task-1 produces; task-8 + Phase 4 WU-C consume)

**Note on naming alignment with Phase 4 (per v4 review § 7.7 + spec § 7.11):** This API contract uses the names Phase 4 WU-C (Gaussian Splatting maturation) will consume. Phase 4 WU-C extends this baseline by adding `TrainingLoop` and `PhysicsCoupling`; it does NOT rename the symbols here. Earlier drafts of this plan used `GaussianSet` / `forward_splat()` / free-function `load_ply`; those have been aligned to Phase 4's naming.

**Required operations:**

`GaussianSplatModel` data abstraction with these members:
- `positions: (N, 3) float32` — centers in world coordinates.
- `scales: (N, 3) float32` — per-axis scales (the diagonal of the covariance's eigen-decomposition).
- `rotations: (N, 4) float32` — quaternions (wxyz convention).
- `opacities: (N,) float32` — in [0, 1].
- `sh_coefficients: (N, K, 3) float32` — K spherical harmonic coefficients per RGB channel; K depends on SH degree (degree 3 → K=16).

Storage: Warp arrays for GPU-resident state. Conversion to NumPy / CPU available via accessor.

**Loader:** `GaussianSplatModel.load_ply(path) -> GaussianSplatModel` (classmethod). Reads Inria's .ply 3DGS scene format. Validates SH degree, vertex count, attribute presence.

**Saver:** `model.save_ply(path)` (instance method). Writes the same format.

**Forward renderer:** `render(model, camera, *, image_height=None, image_width=None, background=(0,0,0)) -> Image` where `Image = (H, W, 3) float32 array in [0,1]`. Deterministic given fixed inputs. Image dimensions taken from camera if not specified.

**Camera abstraction:** `Camera` carries view matrix, projection matrix, near/far planes, and image dimensions. Construction helpers from intrinsics + extrinsics.

**Smoke sim:** `common/common-3dgs/<smoke-sim-location>/` — loads a vendored Inria scene, renders one frame, writes PNG. Invoked via `just run-3dgs-smoke`.

**Out of scope for common-3dgs in Phase 3:** differentiable splatting, training new scenes, `TrainingLoop`, `PhysicsCoupling` (these are Phase 4 WU-C scope; coupling for task-8 is sim-local at `neural-rendered/3dgs-mpm/coupling.py`).

**task-8's consumption:** imports `GaussianSplatModel`, `render`, `Camera` from `common-3dgs`. Mutates a working copy of the loaded `GaussianSplatModel` per frame (translation from MPM particle positions; scale/rotation from MPM deformation gradient; SH frozen for MVP, optionally rotated for stretch).

**Phase 4 WU-C's consumption:** extends this baseline. WU-C adds `TrainingLoop`, `TrainingHistory`, `PhysicsCoupling`, and a viewer module. WU-C does NOT rebuild this surface; it imports `GaussianSplatModel`, `render`, `Camera` unchanged.

**task-1 designs the exact Python module structure and Warp kernel signatures**; the contract above is the operation set. task-8's probe surfaces SHIFTED in §1 if discovered API can't support the consumption pattern.

#### 3.2.2 Render-similarity harness contract (task-2 produces; tasks 6 and 8 consume)

**Module:** `tools/testkit/render_similarity/metrics.py` (Python-imported subdirectory under `tools/testkit/`; underscored per spec § 3.1 directory-tree convention; Phase 4 WU-C extends this surface). Functions:

- `psnr(image_a, image_b) -> float` — peak signal-to-noise ratio (dB). Accepts (H,W,C) NumPy arrays; uint8 [0,255] OR float32 [0,1] (auto-detect by dtype). Returns sentinel value for identical pairs.
- `ssim(image_a, image_b) -> float` — structural similarity. Uses `scikit-image.metrics.structural_similarity`. Returns [0, 1] where 1 = identical.
- `lpips(image_a, image_b, net: Literal['alex', 'vgg'] = 'alex') -> float` — learned perceptual similarity. Uses `lpips` PyPI package. Returns 0+ where 0 = identical. Network choice configurable; 'alex' default.
- `ms_ssim(image_a, image_b) -> float` — multi-scale SSIM (added in Phase 4 WU-C scope; task-2 ships the function shell, returns NotImplementedError until Phase 4).

**Input validation:** shape mismatch raises `ValueError`. Wrong dtype raises `ValueError`. Lazy-loads heavy deps (LPIPS network) on first call.

**Harness mode:** `tools/testkit/equivalence/harness.py` gains mode `"render-similarity"`. Invocation:

```bash
python -m equivalence.harness \
  --mode render-similarity \
  --left <capture-dir-or-image-sequence> \
  --right <capture-dir-or-image-sequence> \
  --tolerance-key <e.g., continuous-ca.neural-ca>
```

The harness pairs frames by index, applies PSNR/SSIM/LPIPS per pair, compares against tolerance.toml's `psnr_min`, `ssim_min`, `lpips_max` for the given tolerance-key. Reports pass/fail per frame and aggregate.

**tolerance.toml schema additions** (task-2 ships schema only; tasks 6 and 8 add rows):

```toml
[<category>.<sim>]
psnr_min = <float>
ssim_min = <float>
lpips_max = <float>
```

**Quality floors per §2.12:** if tasks 6 or 8 lock bounds below PSNR=28, SSIM=0.85, LPIPS=0.15: surface as quality concern in report §6.

#### 3.2.3 Capture file format expectations per category

Spec §3.1 defines Layer 0 capture format. Phase 3 sims write captures via their stack's `common-X` capture helper. Schema is category-specific:

| Category | Stored per step | Stack module |
|---|---|---|
| continuous-ca (3.1, 3.2-D, 3.2-B-inference) | scalar/multi-channel field as 2D array | common-py / common-ts capture I/O |
| rigid-body (3.3) | per-body poses (positions, rotations, joint angles) | common-warp capture I/O |
| soft-body (3.4) | per-vertex positions + per-vertex attributes | common-cpp capture I/O |
| neural-rendered (3.5) | rendered RGB image per step (or stride) | common-3dgs writer OR common-py PNG writer |
| learned-dynamics (3.6) | scalar field on sample grid | common-py / common-warp capture I/O |

Each task's probe verifies the available capture-writer API. If a stack's capture helper doesn't yet support the category: Phase 2 incompletion → BLOCK per §5.3.

#### 3.2.4 `tolerance.toml` row schema

Per-sim tolerance rows under `[<category>.<sim>]`. Phase 3 sims add:

```toml
[continuous-ca.lenia]                              # task-3
golden_kernel_abs = 1e-6
golden_kernel_rel = 1e-5
golden_trajectory_abs = 1e-4

[continuous-ca.neural-ca-python]                   # task-6
golden_checkpoint_match = true
training_loss_distributional_bound = "EFECT"

[continuous-ca.neural-ca-typescript]               # task-6
psnr_min = <measured>
ssim_min = <measured>
lpips_max = <measured>

[rigid-body.articulated-pedagogical]               # task-4
pendulum_period_rel = 1e-3
trajectory_abs = 1e-2
energy_drift_rel_per_second = 1e-3

[soft-body.mass-spring-cloth]                      # task-5
position_abs = 1e-3
catenary_shape_rel = 1e-2

[neural-rendered.3dgs-mpm]                         # task-8
psnr_min = <measured>
ssim_min = <measured>
lpips_max = <measured>

[learned-dynamics.pinn-poisson]                    # task-7
analytical_l2 = 1e-3
fd_l2 = 1e-2
```

Each task edits `tools/testkit/equivalence/tolerance.toml` directly (no convergence protocol needed; sequential).

#### 3.2.5 Determinism registry row schema

`tools/testkit/determinism/registry.toml` (filename probe-discovered). Per-sim row with these keys:

```toml
[<category>.<sim>]                # or [<category>.<sim>.<phase>] for training/inference split
stack = "<A|B|C|D|E>"
class = "<bit-exact | distributional | non-deterministic>"
scope = "<same-stack-same-hw | same-stack-any-hw | cross-stack | n/a>"
atomic_ops = "<none | sum-only | full>"
subgroup_ops = "<none | warp-level | full>"
seed_pinned = <true | false>
distributional_bound = "<EFECT | n/a>"  # required if class = distributional
```

Examples:

```toml
[continuous-ca.lenia]
stack = "D"
class = "bit-exact"
scope = "same-stack-same-hw"
atomic_ops = "none"
subgroup_ops = "none"
seed_pinned = true

[continuous-ca.neural-ca.training]
stack = "D"
class = "non-deterministic"
scope = "n/a"
atomic_ops = "full"
subgroup_ops = "n/a"
seed_pinned = true
distributional_bound = "EFECT"

[continuous-ca.neural-ca.inference]
stack = "B"
class = "bit-exact"
scope = "same-stack-same-hw"
atomic_ops = "none"
subgroup_ops = "none"
seed_pinned = true
```

Each task edits the registry directly.

#### 3.2.6 Sim CLI conventions

Every Phase 3 sim's main entry point implements at least these flags:

| Flag | Type | Default | Purpose |
|---|---|---|---|
| `--tier <name>` | string | "default" | Pre-canned scenario name |
| `--seed <int>` | int | 0 | Random seed |
| `--steps <int>` | int | tier-default | Number of simulation steps |
| `--capture-interval <int>` | int | 0 | Write capture every N steps; 0 disables |
| `--capture-out <path>` | path | `<sim>-capture-<timestamp>.<ext>` | Output path |
| `--deterministic` | bool flag | false | Enable deterministic mode |
| `--config <path>` | path | none | Optional config file overriding tier defaults |

Stack-specific notes:
- Python sims (3.1, 3.2-D, 3.3, 3.5, 3.6): `argparse` or `click`. Entry: `python -m <category>.<sim>.python`.
- C++ sim (3.4): any standard C++ arg-parsing lib; same flag names.
- TypeScript sim (3.2-B): browser-only; CLI applies to a `tools/<sim>/cli.ts` node-side driver if applicable (task-6 probes Stack B convention).

Additional sim-specific flags allowed (e.g., `--n-particles`, `--joint-count`).

`just run-<sim>` invokes the entry with tier=default seed=0 capture-interval=10 deterministic.

#### 3.2.7 Test fixture conventions

- Per sim: `<category>/<sim>/<stack>/tests/`.
- Python: pytest. Test files `test_*.py`. Strict-mode: `pytest -W error <category>/<sim>/python/tests/`.
- C++: ctest via CMake. Test sources under `<category>/<sim>/cpp/tests/`. Strict-mode: `-Wall -Wextra -Werror`.
- TypeScript: vitest. Test files `*.test.ts`. Strict-mode: `pnpm -F <sim-package> test` with tsconfig strict=true.
- Golden files: `tools/testkit/golden/<type>/<sim-name>.<ext>` where type ∈ {tables, derivations, checkpoints, renders}.
- Tests load goldens via repo-relative path. CI runs from repo root.

#### 3.2.8 Spec sheet schema

Per spec §8.2. Each Phase 3 `docs/sim-specs/<category>/<sim>/spec-ref.md` contains:

1. Overview
2. Lineage / anchor
3. Algorithm
4. Algebraic form
5. Verification posture
6. Code verification gates
7. Solution verification (if applicable)
8. Model validation (if applicable)
9. Equivalence (if cross-stack)
10. Determinism declaration
11. Performance benchmark
12. References

#### 3.2.9 Tier 3 diagnostic module interface

Each sim's tier3 lives at `tools/diagnostics/tier3/<sim-name>/`. Exposes:

```python
# tools/diagnostics/tier3/<sim-name>/__init__.py

from pathlib import Path
from tools.diagnostics import DiagnosticReport

def diagnose(capture_path: Path, *, output_dir: Path | None = None) -> DiagnosticReport:
    """Run sim-specific diagnostics on a Layer 0 capture file.

    Returns DiagnosticReport with:
      - status: "pass" | "warn" | "fail"
      - findings: list[Finding]
      - artifacts: list[Path]
    """
    ...
```

`DiagnosticReport` and `Finding` types inherited from `tools/diagnostics/` (Phase 0/1/2 deliverable). If absent: probe-time SHIFTED; adapt to what Phase 2 actually provides.

#### 3.2.10 CI workflow job shape

Each task adds new jobs to `.github/workflows/build-py.yml`, `build-cpp.yml`, or `build-ts.yml` directly (no convergence protocol).

**Python job template:**

```yaml
test-<sim-name>:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: '3.12'
    - name: Install
      run: pip install -e ./<category>/<sim>/python --break-system-packages
    - name: Test (strict mode)
      run: pytest <category>/<sim>/python/tests/ -W error
    - name: Type check
      run: mypy --strict ./<category>/<sim>/python
    - name: Lint
      run: ruff check --strict ./<category>/<sim>/python
```

**C++ job template:**

```yaml
test-<sim-name>:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install Vulkan SDK
      run: <existing common-cpp Vulkan SDK install step>
    - name: Configure
      run: cmake -B build/<sim-name> -S ./<category>/<sim>/cpp -DCMAKE_BUILD_TYPE=Release
    - name: Build
      run: cmake --build build/<sim-name> --parallel
    - name: Test
      run: ctest --test-dir build/<sim-name> --output-on-failure
```

**TypeScript job template:**

```yaml
test-<sim-name>:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: Install pnpm
      run: corepack enable && corepack prepare pnpm@latest --activate
    - name: Install deps
      run: pnpm install --frozen-lockfile
    - name: Test
      run: pnpm -F <sim-package> test
    - name: Type check
      run: pnpm -F <sim-package> tsc --noEmit
```

Stack B headless WebGPU testing: depends on Phase 2's chosen approach (task-6 probes; if no approach exists, BLOCK).

### 3.3 Sequential data flow

```
TASK 1 ──→ produces common/common-3dgs/ ─────────────────────────┐
                                                                  │
TASK 2 ──→ produces tools/testkit/equivalence/render_similarity.py│
                                                                  │
TASK 3 ──→ Lenia (terminal)                                       │
                                                                  │
TASK 4 ──→ rigid-body-pedagogical (consumes common-warp)─────────┐│
                                                                 ││
TASK 5 ──→ cloth (terminal)                                      ││
                                                                 ││
TASK 6 ──→ NCA (consumes render_similarity from task-2)──────────┘│
                                                                  │
TASK 7 ──→ PINN (consumes common-warp; consumes PyTorch direct)──┐│
                                                                 ││
TASK 8 ──→ 3DGS-MPM (consumes common-3dgs from task-1 + ─────────┘│
                     render_similarity from task-2 + Phase 2 MPM-Warp)
                                                                 │
TASK 9 ──→ common-warp matures (consumes tasks 4, 7, 8) ─────────┘
                                                                 │
TASK 10 ─→ landing (consumes all reports from docs/_audits/phase-3/)
```

Sequential execution means each task starts from a fully-merged repo state: every prior task's PR is merged, every prior task's report is filed at `docs/_audits/phase-3/`, every prior task's progress entry is in `progress.md`. No race conditions, no patch reconciliation.

### 3.4 Canonical naming

| Task | Sub-phase | Short-name | Branch | Report file | Sim/path |
|---|---|---|---|---|---|
| task-1 | 3.8 | `common-3dgs` | `phase-3/task-1-common-3dgs` | `docs/_audits/phase-3/task-1-common-3dgs.md` | `common/common-3dgs/` |
| task-2 | 3.x | `render-similarity` | `phase-3/task-2-render-similarity` | `docs/_audits/phase-3/task-2-render-similarity.md` | `tools/testkit/equivalence/` (extension) |
| task-3 | 3.1 | `lenia` | `phase-3/task-3-lenia` | `docs/_audits/phase-3/task-3-lenia.md` | `continuous-ca/lenia/` |
| task-4 | 3.3 | `rigid-body-pedagogical` | `phase-3/task-4-rigid-body-pedagogical` | `docs/_audits/phase-3/task-4-rigid-body-pedagogical.md` | `rigid-body/articulated-pedagogical/` |
| task-5 | 3.4 | `mass-spring-cloth` | `phase-3/task-5-mass-spring-cloth` | `docs/_audits/phase-3/task-5-mass-spring-cloth.md` | `soft-body/mass-spring-cloth/` |
| task-6 | 3.2 | `neural-ca` | `phase-3/task-6-neural-ca` | `docs/_audits/phase-3/task-6-neural-ca.md` | `continuous-ca/neural-ca/` |
| task-7 | 3.6 | `pinn-poisson` | `phase-3/task-7-pinn-poisson` | `docs/_audits/phase-3/task-7-pinn-poisson.md` | `learned-dynamics/pinn-poisson/` |
| task-8 | 3.5 | `3dgs-mpm` | `phase-3/task-8-3dgs-mpm` | `docs/_audits/phase-3/task-8-3dgs-mpm.md` | `neural-rendered/3dgs-mpm/` |
| task-9 | 3.7 | `common-warp-maturation` | `phase-3/task-9-common-warp-maturation` | `docs/_audits/phase-3/task-9-common-warp-maturation.md` | `common/common-warp/` + consumer sims |
| task-10 | landing | `landing` | `phase-3/task-10-landing` | `docs/_audits/phase-3/landing-<UTC>.md` (doubles as report; v9 amendment standardizes naming with other phases) | (cross-cutting) |

Probe report short-names align: `tools/testkit/probes/reports/<short-name>.md` matches the task short-name.

### 3.5 Progress-file bridge

Per Anthropic's long-running-agent guidance, sequential sessions need a state-bridging surface so each new Claude Code session can pick up context without rebuilding it from scratch. The progress file is that surface, alongside git history.

**File:** `docs/_audits/phase-3/progress.md`. Append-only. Owner creates at preflight; each completing task appends its entry; task-10's final commit closes the file.

**Schema (one entry per task, in order):**

```markdown
## task-N — <short-name> — <completion date ISO>

- **Branch merged at SHA:** <merge-sha>
- **PR:** <pr-url>
- **Report:** docs/_audits/phase-3/task-N-<short-name>.md
- **Status:** CLEAN | SHIFTED | BLOCKED-recovered
- **Deliverables in repo:** <short list of new top-level paths>
- **Next task should know:**
  - <key fact about your work that affects subsequent tasks>
  - <e.g., "common-3dgs API uses Warp arrays; load_ply returns GaussianSet with quaternion rotations (wxyz)">
  - <e.g., "tolerance.toml schema additions live in [schema-section]; per-sim rows under [<category>.<sim>]">
- **Open follow-ups for Phase 4:** <one-line refs to your report §10 entries, if any>
- **Drift surfaced:** <one-line refs to your report §1 SHIFTED entries, if any>
```

**Each task's flow:**
1. At session start: read `progress.md` from start to end. Understand what prior tasks landed and what they noted for you.
2. Read git log on phase-3-integration to see commits since base SHA.
3. Read `docs/_audits/phase-3/` directory contents to see filed reports.
4. Proceed with work.
5. At session end (before PR open): append your entry to `progress.md` on your sub-branch. Your entry lands when your PR merges.

This is the formal mechanism Anthropic's "Effective harnesses for long-running agents" guide describes. Lighter than maintaining a shared state across context windows; heavier than relying on git log alone; appropriate for ten-task wall-clock-month work.

---

## 4. Sequential execution model

### 4.0 Deviation rationale (defending against industry standards)

**Industry/community standard for multi-step Claude Code work:** Anthropic's published guidance lists five workflow patterns — sequential, operator, split-and-merge, agent teams, and headless. Sequential is the foundational pattern, recommended when "errors are costly" and "failure modes need to be predictable" (Anthropic engineering blog; MindStudio Claude Code workflow guide, 2026).

**This plan uses sequential execution.** Earlier iterations (v6) used a three-wave parallel model. The parallel model has two well-documented costs that motivated the switch:

1. **Compounding failure probability.** With six parallel Wave-2 tasks each at ~15% rework probability, the cumulative chance of at least one failure approaches 62%, and the recovery is non-trivial because branches may have diverged. Anthropic's own guidance: "If a step fails in a sequential flow, you know exactly where" — vs parallel where "you also need to account for partial failures."

2. **Merge complexity overhead.** The convergence-diff protocol v6 used to coordinate parallel writes (patch emission + Agent-8 reconciliation) is itself a complex surface with its own failure modes. Anthropic's guidance: "the merge step is often underestimated."

**The trade is wall-clock for reliability.** Sequential adds 6–8 weeks to the critical path. Owner-review cognitive load drops because PRs arrive one at a time, not in bursts. Failure recovery is bounded to one task. Per Anthropic: "New workflows should start interactive (sequential or operator with human review). Graduate to headless [or parallel] only after the failure modes are well understood." Phase 3 is the first phase using this multi-task orchestration in this repo; sequential is the appropriate starting posture.

**State bridging across sessions** follows Anthropic's "Effective harnesses for long-running agents" pattern: progress file (§3.5) plus git history.

### 4.1 Task sequence and ordering rationale

```
task-1: common-3dgs               [prerequisite infrastructure; blocks task-8]
   ↓
task-2: render-similarity         [prerequisite infrastructure; blocks task-6 + task-8]
   ↓
task-3: Lenia                     [easiest sim; validates Stack D testkit flow]
   ↓
task-4: rigid-body-pedagogical    [Stack E; validates Stack E testkit flow]
   ↓
task-5: mass-spring-cloth         [Stack C; validates Stack C testkit flow]
   ↓
task-6: NCA                       [cross-stack equivalence; consumes task-2]
   ↓
task-7: PINN-Poisson              [Stack E + PyTorch; classical FD ref]
   ↓
task-8: 3DGS-MPM                  [hardest sim; consumes task-1 + task-2 + Phase 2 MPM-Warp; deferred until infrastructure validated]
   ↓
task-9: common-warp-maturation    [needs tasks 4, 7, 8 landed for rule-of-three]
   ↓
task-10: landing                  [reads all reports; closes phase]
```

**Ordering principles:**

- **Dependencies first.** task-1 and task-2 unblock task-6 and task-8; must land first.
- **Easy before hard.** task-3 (Lenia) is the simplest sim — golden values, single stack, no upstream code beyond Chakazul's reference. Landing it first validates that the testkit + golden-table + tier-3 + CI pipeline works end-to-end before tackling harder sims.
- **Cover stacks early.** task-3 (D), task-4 (E), task-5 (C) cover three stacks in sequence. By task-6 (D+B) the multi-stack testing posture is established.
- **Hardest near end.** task-8 (PhysGaussian) is research-frontier — most likely to need iteration, hit unexpected complexity, surface scope decisions. Putting it after task-1 (its dependency), task-2 (its dependency), task-4 (Stack E warm-up), and task-7 (Stack E + non-trivial verification) means by the time task-8 starts, the surrounding infrastructure has been exercised.
- **Maturation after consumers.** task-9 needs ≥3 Stack E common-warp consumers landed to find STRONG candidates. tasks 4, 7, 8 are those consumers.
- **Landing last.** task-10 reads all prior reports.

This ordering respects all dependency edges and lets the owner pull the cord early if a structural issue appears in the testkit flow.

### 4.2 Coordinator responsibilities

> **v8 amendment (May 18 2026):** Per the v8 dispatch-hardening amendment at the top of this document, dispatch is single-agent. The coordinator's role is light, not per-task.

The coordinator is one claude.ai chat session opened in this project folder. Its job is narrow:

1. Read `docs/phases/phase-3-plan.md` in full at session start (including the v8 amendment block at top).
2. Confirm owner attestation that preflight (§9) is complete, including the v8 owner-actionable items (external SHAs pinned).
3. **Dispatch the phase opener** by spawning one Claude Code session with auto-accept ON. Paste this prompt:

   ```
   You are the Phase 3 agent for Bit-Physics. Auto-accept is on. Read docs/phases/phase-3-plan.md in full (including the v8 amendment block). Work through tasks 1 → 3 → 3a → 4 → 5 → 6 → 7 → 8 → 9 → 10 sequentially per §4.1. The §6.1–§6.10 task prompts are sections you consult at each task boundary; treat branch/PR ceremony in those prompts as SUPERSEDED per the v8 trunk-based amendment — commit directly to main. At each task close, append a one-line summary to docs/_audits/phase-3/progress.md, write the task report at docs/_audits/phase-3/task-N-<name>-<UTC>.md, and report the one-liner back to me. Proceed to the next task unless context is near full.
   ```

4. **Receive each task's one-line summary.** Format: `task <N> <name> <verdict> <head-sha> <audit-path>`. Apply escalation criteria (§8) on report contents.

5. **For CONFIRMED verdicts:** acknowledge; the agent proceeds to the next task. No owner-merge step (trunk-based per v8; commits land directly on `main`).

6. **For non-CONFIRMED verdicts:** surface to owner. Owner decides whether to (a) accept SHIFTED and let the agent continue, (b) direct a revision, or (c) pause.

7. **Defensive review of CONFIRMED tasks (per v4/v8 amendment 2):** for tasks 1, 2, 9 (first-deployment-of-new-patterns: common-3dgs, render-similarity, common-warp maturation), owner does a defensive review (~15-20 min, spot-check FACTs + re-run one gate). For tasks 3, 3a, 4–8, 10, owner does acceptance review (~2 min, read report + verify CI green).

8. **If the agent ends a session with a CONTINUE_FROM cue** (context-fill), dispatch a continuation session:

   ```
   You are the Phase 3 agent for Bit-Physics, continuing from a prior session's context-fill checkpoint. Auto-accept on. Read docs/phases/phase-3-plan.md in full. Read docs/_audits/phase-3/progress.md for the CONTINUE_FROM cue. Resume at the named task and proceed per §4.1.
   ```

9. **When task-10 (landing) reports CONFIRMED**, the phase-landing commit is on `main`. Tag it `v0.3.0-phase-3`. Surface phase-close to owner.

**The coordinator does NOT:**
- Dispatch each task separately. The agent runs the phase.
- Write code, run probes, validate work.
- Merge anything. Trunk-based per v8: there are no PRs, no merges. Commits land on `main` directly.
- Make decisions. Decisions are locked in §2 + the v8 amendment.

### 4.3 Per-task commit cycle (v8 — supersedes branch + PR cycle)

> **v8 amendment:** The original §4.3 described a per-task branch + PR cycle with `phase-3-integration` base branch. That model is SUPERSEDED by trunk-based development per spec § 7.12. The new cycle (this section, post-v8) commits directly to `main`. The agent does NOT create feature branches, does NOT push sub-branches, does NOT open PRs.

Each task in the agent's single-session sequence follows this cycle:

1. **Agent re-anchors** by viewing the current state of `main` (commits since last task close).
2. **Agent reads** `docs/_audits/phase-3/progress.md` to confirm where the prior task left off.
3. **Agent reads** the task's prompt in §6.N. **Per v8, ignore any `BASE BRANCH: phase-3-integration` / `YOUR BRANCH: phase-3/task-N-*` / `gh pr create` / "MERGE PROTOCOL" instructions in §6.N.** Commit directly to `main`.
4. **Agent probes** existing infrastructure per Convention-C/D.
5. **Agent does work** per the task's DELIVERABLES section.
6. **Agent runs strict-mode local gates** (ruff/mypy/pytest/ctest/vitest per stack).
7. **Agent commits to `main`** (one or more commits per Convention-A new-files-first split).
8. **Agent writes report** at `docs/_audits/phase-3/task-N-<short-name>-<UTC>.md` per §5.1.
9. **Agent appends one line** to `docs/_audits/phase-3/progress.md`.
10. **Agent reports the one-liner** back to the coordinator and proceeds to the next task (unless context near full).

**Files each task may touch** (sequential — no contention):
- Its own sim directory + `docs/sim-specs/<category>/<sim>/`.
- `references/<upstream>/` for its vendored upstream.
- `tools/testkit/probes/reports/<short-name>.md`.
- `tools/testkit/golden/<type>/<sim-name>.<ext>`.
- `tools/diagnostics/tier3/<sim-name>/`.
- `docs/_audits/phase-3/task-N-<short-name>-<UTC>.md` (its report).
- `docs/_audits/phase-3/progress.md` (append its entry).
- Shared files: `README.md`, `CHANGELOG.md`, `docs/glossary.md`, `justfile`, `.github/workflows/*.yml`, `tools/testkit/equivalence/tolerance.toml`, `tools/testkit/determinism/registry.toml`.
- **task-9 only:** consumer sims it refactors during rule-of-three extraction.

No convergence-touch protocol. No patch emission. Each task edits whatever it needs directly because there is no concurrent work and no branch ceremony.

### 4.4 Failure recovery

Sequential execution makes recovery clean. Possible failure modes:

| Failure mode | Recovery |
|---|---|
| Task reports CLEAN, PR opens, CI green, owner merges — but later a downstream task surfaces SHIFTED for the work | Subsequent task adapts per §5.3 playbook. No recovery of prior task. |
| Task reports BLOCKED (probe failure, missing infra, unresolved drift) | Coordinator pauses dispatch. Owner reviews the BLOCKED finding. Owner decides: re-dispatch with adjusted scope, fix the upstream issue (e.g., Phase 2 gap) and re-dispatch, or re-scope Phase 3 to defer the sub-phase to Phase 4. |
| Task's PR fails CI | Owner asks the task to fix (open new Claude Code session with feedback, or push fix commits directly). If unfixable in scope, mark as BLOCKED. |
| Task's PR review surfaces concerns (owner reads report, thinks work is incomplete) | Owner posts review feedback. New Claude Code session continues the branch with feedback. If unresolvable, BLOCKED. |
| Task crashes / context-window-exhausts mid-work without filing report | Owner starts new Claude Code session. Initial step: read git log on sub-branch + read progress.md + read partial work to understand state. Continue. (This is the standard Anthropic long-running-agent pattern.) |
| Task lands but introduces regression in prior task's tests | Subsequent task's CI catches. Owner reverts merge (`git revert`) or asks for forward-fix in next task. |
| Phase 2 gap discovered mid-Phase-3 (e.g., common-warp missing function task-7 needs) | BLOCK. Coordinator pauses. Owner closes the Phase 2 gap on a separate branch, merges to phase-3-integration, then re-dispatches task. |

Sequential's recovery property: **the blast radius of any task failure is one task plus the cost of redo.** Prior tasks are merged and untouched. Subsequent tasks haven't started. There is no convergence-diff to reconcile, no parallel branches to rebase.

---

## 5. Protocols

### 5.1 Standard task report format

Every task report follows this exact structure.

```markdown
---
date: <ISO-8601>
author: task-N (Claude Code)
subject: Phase 3.<sub> — <short-name>
branch: phase-3/task-N-<short-name>
base-sha: <SHA at branch creation>
branch-pushed-sha: <SHA at push>
pr-url: <GitHub PR URL>
merge-sha: pending-owner-merge
verdict-state: {gate-1: CONFIRMED, gate-2: ..., ...}
evidence-paths: [<file:line citations>]
status: <CLEAN | SHIFTED | BLOCKED>
---

## 1. Probe findings
Four-state verdict per anchor-sketch checked. Each cites file:line evidence.

## 2. Per-gate verdict table
| Gate (per §5.4 Layer 4 thirteen-gate ref, spec § 3.5 v2.4) | Verdict | Evidence |
|---|---|---|
| 1. Spec sheet (with PBT § 6 declarations) | CONFIRMED | docs/sim-specs/.../spec-ref.md |
| 2. Probe report | CONFIRMED | tools/testkit/probes/reports/<short-name>.md |
| 3. Failing tests committed (TDD) with output-hash footer | CONFIRMED | commit <SHA>; tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt sha256 |
| 4. Implementation lands; commit witnesses output-hash | CONFIRMED | <path>/ + commit <SHA> |
| 5. Tests pass (with independent-ref anchors in goldens) | CONFIRMED | pytest summary |
| 6. Tier 1+2 diagnostics | CONFIRMED | tools/diagnostics/... |
| 7. Capture I/O working | CONFIRMED | `just run-<short-name>` produces replayable capture |
| 8. Performance benchmark | CONFIRMED | <command + numbers> |
| 9. Cat 1–5 + Cat-X integrity | CONFIRMED | tools/integrity/ output |
| 10. Audit report filed | CONFIRMED | this file |
| 11. Property-based tests pass (≥ 2 invariants) | CONFIRMED | tools/testkit/property/ test run |
| 12. Perf-ledger row appended | CONFIRMED | docs/perf-ledger.md entry |
| 13. Failing-tests replay verifiable | CONFIRMED | hash from commit footer matches replay sha256 |

## 3. Files landed
File-by-file: path + one-line description. New vs modified explicit.

## 4. Test execution summary
Commands run, exit codes, pass/fail/skip counts. Strict-mode flags used.

## 5. Vendored upstream SHAs
For each `references/X/`: upstream name, repo URL, pinned SHA, vendoring date, manifest path, license, security-advisory check.

## 6. Tolerance / threshold values determined
Per §3.2.4 schema. If render-similarity below §2.12 floor: quality concern flag.

## 7. Performance benchmark
Reproducible command, hardware, headline numbers.

## 8. Branch commit log
Each commit SHA + first line of message in chronological order.

## 9. Open questions / spec-amendment proposals
Mark each "trivial" or "substantive":
- **Trivial:** glossary entries, typo fixes, terminology consistency, cross-reference fixes, citation additions.
- **Substantive:** new conventions, scope changes, taxonomy changes (Tier vs Cat), architectural changes, posture changes, anything affecting more than one sub-phase. If unsure: classify substantive.

## 10. Known follow-ups intentionally deferred
Items deferred to Phase 4+ with rationale. task-10 aggregates these into closing.md and forwards to Phase 4 planning.

## 11. Drift / blocker findings
Anchor-sketches that came back SHIFTED / REFUTED / BLOCKED and how handled per §5.3.

## 12. progress.md entry
Verbatim copy of the entry you appended to docs/_audits/phase-3/progress.md (per §3.5 schema).
```

### 5.2 PR description template

```markdown
# Phase 3.<sub> — <short-name> (task-N)

**Status:** <CLEAN | SHIFTED | BLOCKED>
**Branch:** phase-3/task-N-<short-name>
**Base:** phase-3-integration (SHA: <base-sha>)
**Full report:** `docs/_audits/phase-3/task-N-<short-name>.md`
**Progress entry:** `docs/_audits/phase-3/progress.md` (this task's section)

## Summary
- Sub-phase: <e.g., 3.1 Lenia (Stack D)>
- All thirteen Layer 4 gates per spec § 3.5 v2.4: <N/13 CONFIRMED, M SHIFTED, K BLOCKED>
- Test execution: <pass/fail/skip>
- Quality flags: <none | render-similarity below floor (PSNR=X) | etc.>
- Spec amendments proposed: <none | N trivial | N substantive>
- Phase-4 deferrals: <none | list>
- Phase-4 deferrals: <none | list>

## Drift / blocker findings
<None | summarize from report §11>

## Reviewer notes
- Strict-mode CI runs on this PR via `.github/workflows/`.
- This PR includes all sim deliverables AND the progress.md entry AND any shared-file updates (README, CHANGELOG, glossary, tolerance.toml, etc.) the task needed.

— task-N (Claude Code)
```

### 5.3 Drift-handling playbook

When a task's probe or work surfaces friction, use this playbook. Solve in-scope drift autonomously; escalate out-of-scope drift via report.

| Situation | Response |
|---|---|
| Common-X API differs from probe expectation but the function exists with different signature | Adapt to actual API. SHIFTED in §1. Proceed. |
| Common-X function you need does NOT exist | BLOCK in §11. Do NOT extend common-X (that is task-9 maturation work or Phase 4). |
| Existing convention (CLI flag name, tolerance schema, etc.) differs from §3.2 prescription | Per §0.3, follow the existing convention. Document SHIFTED in §1. |
| Vendored upstream has known-broken latest stable | Web-fetch issue tracker. Pin last-known-good. Document in §5. |
| Vendored upstream has known security vulnerability | Web-fetch security advisories. Pin patched version. Document in §5. |
| Vendored upstream license incompatible | BLOCK. Do not vendor. |
| Dep version conflict (e.g., Warp ↔ PyTorch version mismatch) | BLOCK. Do not work around with venvs without owner discussion. |
| Spec contradicts itself | Defer to most-specific section. Document in §9 as substantive amendment. |
| Test runner not configured for your stack | BLOCK. Do NOT set up test infra (Phase 0 work). |
| Referenced testkit file doesn't exist | Phase-2-incompletion in §11. Work without; document gap. If fatal: BLOCK. |
| Phase 2 sim at different path than expected | Adapt. SHIFTED in §1. |
| Phase 2 sim doesn't exist | BLOCK. Phase 2 incompletion. |
| TDD test ERRORs on import instead of FAILing | Stub impl with `raise NotImplementedError` so test fails not errors. |
| Render-similarity below §2.12 floor | Lock at measured. Ship with quality concern flag in §6. Surface in §9. |
| Spec ambiguous on something in your scope | Decide. Document in spec sheet. Propose amendment in §9 per trivial/substantive classification. |
| Strict-mode CI false-positive (e.g., type-checker over vendored pkg) | Narrow `# type: ignore[...]` or `# noqa: ...` with comment. Do NOT disable globally. |
| Work taking significantly longer than estimated | Fine. Report when done. Do NOT cut scope unilaterally — propose in §9 and pause. |
| Branch can't push (e.g., CI infra error) | Surface in §11. Owner debugs CI infra. |
| GitHub Actions CI fails on your PR | Investigate. Your-work fault: fix on branch, push, CI re-runs. Env/infra issue: surface to owner. |
| You discover a tool or test pattern that would benefit other sims | Document in §10 as Phase-4 candidate. Do NOT take on the work mid-task. |
| Context window approaching capacity mid-work | Append progress entry with current state. Commit progress. Push. Open PR as "in-progress" if work is partial; owner spawns new session to continue. |

### 5.4 Layer 4 thirteen-gate reference (per spec §3.5 v2.4 expansion; was ten gates pre-v2.4)

The standard report's §2 covers these:

1. **Spec sheet** at `docs/sim-specs/<category>/<short-name>/spec-ref.md` per §3.2.8 schema (with § 6 declaring ≥ 2 PBT-covered invariants per spec § 2.14).
2. **Probe report** at `tools/testkit/probes/reports/<short-name>.md`.
3. **Failing tests committed** in `<sim>/<stack>/tests/` (TDD; separate commit from impl), with verbatim pytest output at `tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt` and sha256 in commit footer per spec § 1.3 step 4.
4. **Implementation lands** in `<sim>/<stack>/` with public API complete; implementation commit footer references the failing-tests-commit SHA and witnessed output-hash.
5. **Tests pass** under strict-mode; golden tables (where applicable) carry ≥ 3 independent-reference anchors per spec § 2.4.
6. **Tier 1 + Tier 2 diagnostics pass.** Tier 3 module at `tools/diagnostics/tier3/<short-name>/` per §3.2.9.
7. **Capture I/O working.** `just run-<short-name>` produces replayable capture per §3.2.3 category schema.
8. **Performance benchmark reproducible.** Documented command + hardware + numbers (informational, not blocking).
9. **Cat 1–5 + Cat-X integrity green.** Citation (Cat 1), spec↔impl contract (Cat 2), numerical correctness (Cat 3), env/repro (Cat 4), transparency (Cat 5), tolerance budget (Cat-X per spec § 2.6).
10. **Audit report filed** per §5.1, including progress.md entry.

**New v2.4 gates 11–13:**

11. **Property-based tests pass** for the ≥ 2 declared invariants per spec § 2.14. Hypothesis example database committed.
12. **First-landing wall-clock recorded** in `docs/perf-ledger.md` per spec § 2.15.
13. **Failing-tests replay verifiable** — phase-closing audit can check out the failing-tests commit, run pytest, compute sha256, and confirm it matches the hash in the commit footer per spec § 1.3 step 4.

---

## 6. Task prompts

> **v8 amendment:** Per the single-agent dispatch model (v8 amendment block at top + §4.2 rewrite), these task prompts are **sections the agent consults at each task boundary**, not separate dispatch targets. The agent reads `phase-3-plan.md` in full at session start, then refers to § 6.N when it begins task N. The "owner copy-pastes into a fresh Claude Code session" framing in the prior draft is superseded: the agent self-dispatches from task to task within one Claude Code session (or across continuation sessions on context-fill). Any "BASE BRANCH: phase-3-integration" / "YOUR BRANCH: phase-3/task-N-*" / "gh pr create" instructions in the per-task prompts below are also SUPERSEDED per the v8 trunk-based amendment — commit directly to `main`.

Each prompt is a self-contained block the agent consults at the task boundary. Tasks execute strictly in order; the agent proceeds to task-(N+1) immediately on task-N CONFIRMED unless context is near full.

### 6.0 Per-task verification discipline (normative; applies to every task prompt below)

This block is the load-bearing verification-discipline reference. Every per-task prompt in §§ 6.1–6.10 inherits the discipline below by reference; the per-task prompt notes which subset applies (sim tasks vs infrastructure tasks) and adds task-specific deliverables on top.

**Applies to ALL tasks (1–10):**

1. **Cross-phase audit replay at task-1 first action** (per spec § 7.5 + v9 amendment): task-1 runs `python -m integrity.scripts.replay_prior_phase --prior-phase phase-2 --audit docs/_audits/phase-2/landing-<UTC>.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget` before ANY other work. Discrepancy → BLOCKED; surface to operator; do not begin task-1 work.
2. **Tolerance-budget compliance** (spec § 2.6): no `tolerance.toml` override exceeds the corresponding `tolerance-budget.toml` cap. Cat-X HARD_FAILs over-budget overrides. Genuine widening requires a separate operator-approved `chore(tolerance-budget): amend …` commit + audit at `docs/_audits/tolerance-budget-amendments/<UTC>.md`.
3. **Append-only audit discipline** (spec § 7.5): no file under `docs/_audits/` already present at `v0.2.0-phase-2` may be edited or shortened during Phase 3. Append-only.
4. **Server-side hooks** (spec § 7.12 + v8 trunk-based amendment): no `git push --force`; no remote branches other than `main`; no phase-tag pushes from agent identity.
5. **Evidence-paths + evidence-hashes** in every task report front-matter (spec § 7.5 + v9 amendment): cite every artifact path; for non-trivial artifacts (failing-tests output files, capture files, mutation-score JSON) include sha256 in `evidence_hashes:`.

**Applies to SIM tasks (3, 3a, 4, 5, 6, 7, 8) — i.e., tasks that ship a sim ref-impl:**

6. **TDD with failing-tests output capture** (spec § 1.3 step 4 + v9 amendment). The TDD cycle:
   - (a) Author the failing test suite. Run `pytest <test-path> -v 2>&1 | tee tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt`. The output MUST show `ModuleNotFoundError` / `NotImplementedError` (implementation missing), NOT `pytest collection error` or `ImportError on fixture` (framework misconfigured). If wrong failure mode, fix test setup first.
   - (b) Compute `sha256sum tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt`. Record the hex.
   - (c) Commit the test files AND the failing-output evidence file together. Commit footer:
     ```
     Failing-tests-output: tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt
     Failing-tests-output-hash: sha256:<full-64-char-hex>
     ```
   - (d) Implementation commit's footer references the witnessed hash:
     ```
     Implements-failing-tests-from: <failing-tests-commit-sha>
     Failing-tests-output-hash-witnessed: sha256:<same-hex>
     ```
7. **PBT invariant declarations** in spec § 6 (spec § 2.14 + v9 amendment): ≥ 2 PBT-covered invariants declared in the sim's spec-ref.md § 6 (verification posture). PBT implementation at `tools/testkit/property/sims/<sim>/`. Hypothesis example database committed at `.hypothesis/` (per spec § 2.14, NOT gitignored).
8. **Independent-reference anchors in golden tables** (spec § 2.4 + v9 amendment): ≥ 3 anchors per golden table from sources independent of the in-repo derivation AND independent of any vendored upstream (paper appendix, textbook table, hand-derivation from first principles). Generator verifies SymPy values agree with anchor values at anchor points to 1e-10 absolute.
9. **Perf-ledger row appended** (spec § 2.15 + v9 amendment): one row in `docs/perf-ledger.md` recording `(sim, stack, descriptor, wall_clock_seconds, hardware_id, commit_sha, date, baseline)`.
10. **Schema-corpus seed** (spec § 2.7/2.12 + v9 amendment): copy the canonical capture to `tests/fixtures/legacy-captures/phase-3-<sim>.h5` + sidecar `.json`. Phase 4 WU-A's schema bump round-trips every entry; Phase 3 contributes.
11. **All 13 gates per spec § 3.5 v2.4** documented in the task report's per-gate verdict table per §5.1 §2 template.

**Applies to INFRASTRUCTURE tasks (1, 2, 9, 10):**

12. **Mutation-testing thresholds** (spec § 2.13 + v9 amendment): tasks that touch testkit-adjacent modules (common-3dgs at task-1, render-similarity at task-2, common-warp at task-9) include mutation-score generation as part of their acceptance. Per-target thresholds:
    - Common-3dgs new code: ≥ 80%
    - Render-similarity testkit module: ≥ 85% (high; this gates Phase 4 neural variants)
    - common-warp extensions: no regression below Phase 2 baseline (Stage 0 baseline JSON at `tools/testkit/mutation/phase-2-<UTC>.json`)
13. **Infrastructure-verification surrogates** (spec § 2.11): MMS/GCI don't apply; substitute smoke contracts + capture round-trip + determinism harness where applicable.

**Applies to task-10 (CLOSING):**

14. **Full v9 closing sweep**: Cat-X tolerance-budget; evidence-path verification via `verify_evidence.py`; append-only check against `v0.2.0-phase-2`; failing-tests replay spot-check (2 of 7 sim tasks chosen randomly); mutation-testing threshold gate via `run-mutation.sh --gate --baseline tools/testkit/mutation/phase-2-<UTC>.json`; perf-ledger review. Any HARD_FAIL → REFUTED, do NOT push tag.
15. **Operator-only tag pushing** (spec § 7.12): closing.md's final summary contains `Tag pushed: NO (operator action required)`. Agent does NOT run `git tag` or `git push origin v0.3.0-phase-3`.

**Anti-patterns** (every task):
- Never widen a tolerance to make a port pass; either tighten the numerics or surface a tolerance-budget-amendment proposal to the operator.
- Never declare a sim "implementation done" without the failing-tests-output-hash being grep-verifiable in the prior commit footer.
- Never push a tag from the agent identity.
- Never edit a prior-phase audit file.
- Never silently drop a gate from the report's per-gate verdict table.

### 6.1 task-1 — common-3dgs introduction (3.8)

```
You are task-1 of Phase 3, Bit-Physics portfolio. Sequential single-task execution model.

ROLE: Introduce common/common-3dgs/. Sub-phase 3.8. Phase 3's first
task. Your work blocks task-8 (3.5 MPM-3DGS).

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (owner-created at preflight).
YOUR BRANCH: phase-3/task-1-common-3dgs (create off phase-3-integration
HEAD; record base-sha for report).

CONTEXT BRIDGE (per phase plan §3.5):
- Read docs/_audits/phase-3/progress.md from start to end. It's empty
  (you're task-1) but the file exists — owner initialized it at preflight.
- Read git log on phase-3-integration to confirm Phase-2-end state.
- Read docs/_audits/phase-2/closing.md to know what Phase 2 delivered.

INTERFACE YOU PRODUCE (the socket — per phase plan §3.2.1):
- GaussianSet abstraction: positions (N,3), scales (N,3), rotations
  (N,4 quaternions wxyz), opacities (N,), sh_coefficients (N,K,3).
  Warp-array-backed.
- Loader: load_ply(path) -> GaussianSet for Inria .ply 3DGS format.
- Saver: save_ply(gaussians, path).
- Forward renderer: forward_splat(gaussians, camera, h, w, *,
  background) -> (H,W,3) float32 image. Deterministic.
- Camera abstraction with view/projection construction.
- Smoke sim: load vendored scene + render one frame.

OUT OF SCOPE:
- Differentiable splatting (Phase 4).
- Stack B viewer port (Phase 4 unless trivially in-scope).
- Coupling primitive (task-8 builds sim-local; promotion at consumer
  #3 per rule-of-three; Phase 4+).
- Training new 3DGS scenes (use vendored).
- common-warp changes (task-9).

ANCHOR-PROBE STEP (Convention C/D, before drafting):

1. Clone, checkout phase-3-integration, record base-sha, create
   sub-branch phase-3/task-1-common-3dgs.
2. View:
   - common/ (existing common-* modules).
   - docs/common/ (pick warp.md or py.md as shape reference for
     docs/common/3dgs.md).
   - For smoke sim location: inspect how existing common modules
     ship their smoke sims. Follow discovered pattern; do NOT impose
     a default location.
   - tools/testkit/capture/ (Layer 0 capture format — consume).
   - tools/testkit/probes/template.md.
   - tools/integrity/ (Cat 1–5 you must pass).
   - references/ (vendoring pattern; per-upstream manifest.yaml).
3. File probe at tools/testkit/probes/reports/common-3dgs.md.
   Enumerate verbatim:
   - Every public API surface you'll create (signature + docstring).
   - Every external surface you consume with file:line citations.
   - Inria gaussian-splatting repo SHA (web-fetch to verify; check
     security advisories).
   - .ply 3DGS format spec (cite source).
   - Smoke sim location (discovered).

DELIVERABLES (Layer 3 §3.4 per-module requirements):

**v9 addendum (inlined per §6.0; infrastructure-task discipline per §6.0 items 12 + 13):**
- **Cross-phase audit replay (§6.0 item 1):** task-1 is Phase 3's FIRST task — before any other action, run `python -m integrity.scripts.replay_prior_phase --prior-phase phase-2 --audit docs/_audits/phase-2/landing-<UTC>.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`. Discrepancy → BLOCKED.
- **Tolerance-budget Phase 3 carryover:** update `tools/testkit/equivalence/tolerance-budget.toml`: `[phase] phase = "phase-3"`, `opened_at = "<UTC>"`. Do NOT widen per-category budgets (carry-forward only).
- **Mutation-testing baseline for common-3dgs (§6.0 item 12):** `bash tools/testkit/mutation/run-mutation.sh --target common/common-3dgs/`. Score ≥ 80% per spec § 2.13. Baseline JSON committed at `tools/testkit/mutation/phase-3-task-1-<UTC>.json`. This is a *new* mutation-testing target; Phase 3 closing audit (task-10) confirms no regression on subsequent tasks.
- **Smoke-contract test for common-3dgs public API (per spec § 2.11):** every public class / function / type in §3.2.1's API has at least one test that imports + instantiates + calls + asserts return shape. Lives at `common/common-3dgs/tests/`.
- **Evidence-hashes in audit (§6.0 item 5):** report includes sha256 for mutation-score baseline JSON.
- **Append-only check against v0.2.0-phase-2 (§6.0 item 3):** no Phase 2 audit file may be edited or shortened.
- **No tag pushing (§6.0 item 4):** task-1 doesn't reach phase tag; that's task-10. No `git tag` or `git push origin v*` from task-1.

A. common/common-3dgs/ with public API per phase plan §3.2.1.
B. docs/common/3dgs.md following discovered pattern (warp.md or py.md).
C. references/3DGS-reference/manifest.yaml + vendored source at
   pinned SHA per phase plan §2.11.
D. Smoke sim at probe-discovered location.
E. Tier 3 diagnostic at tools/diagnostics/tier3/3dgs-smoke/ if needed.
F. Integrity Cat 2 contract: docs/common/3dgs.md ↔ implementation.
G. Tests committed and passing for the public API.
H. Updates to shared files (sequential — edit directly, no patches):
   - README.md (common-3dgs in common-modules listing per §3.2.10 style).
   - CHANGELOG.md (new entry under ## Phase 3 header; create header if
     it doesn't exist).
   - docs/glossary.md (3DGS, Spherical Harmonics, .ply 3DGS format).
   - justfile (just run-3dgs-smoke, just test-3dgs).
   - .github/workflows/build-py.yml (test-common-3dgs job per §3.2.10
     Python template; invoke pytest directly per §2.14).
I. progress.md entry per §3.5 schema (append to end).
J. Report at docs/_audits/phase-3/task-1-common-3dgs.md per §5.1.

MERGE PROTOCOL per phase plan §4.3:
1. Commit, push.
2. `gh pr create --base phase-3-integration --head
   phase-3/task-1-common-3dgs --title "3.8 — common-3dgs" --body
   "$(use phase plan §5.2 template)"`.
3. File report. Front-matter merge-sha = "pending-owner-merge".
4. Session ends. Owner reviews + merges.

DISCIPLINES per phase plan §5.3 drift playbook:
- Convention #8: vendor + grep — no memory assertions.
- Convention M: re-anchor before edit.
- Convention C/D: probe first.
- Convention A: new-files-first.
- Convention E: spec-author-self-test.
- Convention #12: no SHA back-fill in your report (task-10 owns).
- Strict-mode CI default (ruff --strict, mypy --strict, pytest -W error).
- §0.3: existing Phase 0/1/2 conventions take precedence over §3.2
  prescriptions. Follow discovered pattern; document SHIFTED if
  discovered differs.

REPORT — docs/_audits/phase-3/task-1-common-3dgs.md per §5.1. All
twelve sections required.

START: clone, checkout phase-3-integration, create sub-branch, read
progress.md (empty), probe.
```

### 6.2 task-2 — render-similarity harness extension (3.x)

```
You are task-2 of Phase 3, Bit-Physics portfolio. Sequential
single-task execution.

ROLE: Extend tools/testkit/equivalence/ with render-similarity
(PSNR, SSIM, LPIPS). Sub-phase 3.x (Phase-3 infra). Your work
blocks task-6 (3.2 NCA D↔B equivalence) and task-8 (3.5 MPM-3DGS
golden-render gate).

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post-task-1 merged).
YOUR BRANCH: phase-3/task-2-render-similarity.

CONTEXT BRIDGE per §3.5:
- Read docs/_audits/phase-3/progress.md. Note task-1's entry: which
  paths landed, which interfaces are now usable, any drift flags.
- Read task-1's report at docs/_audits/phase-3/task-1-common-3dgs.md
  if context relevant.
- Read git log since task-1's merge SHA to confirm state.

INTERFACE YOU PRODUCE (the socket — per phase plan §3.2.2):
- tools/testkit/equivalence/render_similarity.py with functions:
  * psnr(image_a, image_b) -> float (returns sentinel for identical).
  * ssim(image_a, image_b) -> float (scikit-image; [0,1]).
  * lpips(image_a, image_b, net='alex'|'vgg') -> float (lpips pkg).
  * Input validation: HxWxC uint8/float32; shape mismatch raises
    ValueError; wrong dtype raises ValueError.
  * Lazy-load LPIPS network on first call.
- Harness mode "render-similarity" via tools/testkit/equivalence/
  harness.py CLI flag --mode render-similarity. Reads paired captures.
  Compares against tolerance.toml psnr_min / ssim_min / lpips_max.
- tolerance.toml schema additions (schema only — no Phase 3 rows;
  tasks 6 and 8 add rows).

OUT OF SCOPE:
- Per-sim tolerance rows (tasks 6 and 8 add).
- Additional perceptual metrics beyond PSNR/SSIM/LPIPS.
- Render-similarity in determinism harness (wrong tool).

ANCHOR-PROBE STEP per §5.3:

1. Clone, checkout phase-3-integration, record base-sha, create
   sub-branch.
2. View:
   - tools/testkit/equivalence/ (existing harness, tolerance loader,
     capture consumption).
   - tools/testkit/equivalence/tolerance.toml (existing schema).
   - tools/testkit/capture/ (format you consume).
   - tools/testkit/pyproject.toml (dep posture).
3. File probe at tools/testkit/probes/reports/render-similarity.md.
   Enumerate harness mode-dispatch points; tolerance.toml schema
   additions; PyPI versions of lpips and scikit-image to pin
   (web-fetch latest stable; check security advisories).

DELIVERABLES:

**v9 addendum (inlined per §6.0; infrastructure-task discipline per §6.0 items 12 + 13):**
- **Mutation-testing for render-similarity module (§6.0 item 12; spec § 2.13):** this is a new testkit-adjacent module that gates ALL Phase 4 neural-rendered sims. Mutation threshold ≥ 85% (higher than standard 80% because false-negatives here let broken neural sims ship). `bash tools/testkit/mutation/run-mutation.sh --target tools/testkit/equivalence/render_similarity.py --threshold 0.85`. Baseline JSON at `tools/testkit/mutation/phase-3-task-2-<UTC>.json`.
- **Smoke contracts (§6.0 item 13 + spec § 2.11):** every public function in render_similarity.py has a smoke test (identity pair, known-perturbation pair, error cases). Already enumerated in deliverable D below; v9 amendment makes this normative for this module.
- **Adversarial fixtures for render-similarity:** add fixtures to `tools/integrity/tests/fixtures/adversarial/cat3_wrong_render_similarity/`: (a) a pair of images that should be flagged as different but where a buggy SSIM might pass; (b) a pair that should be flagged identical but where a buggy LPIPS might fail. Adversarial meta-test confirms detection.
- **Independent-reference anchors for the metric implementations:** Anchor 1 (SSIM): Wang et al. 2004 "Image Quality Assessment: From Error Visibility to Structural Similarity" Eq. 13 — test SSIM on a known-textbook pair. Anchor 2 (LPIPS): Zhang et al. 2018 "The Unreasonable Effectiveness of Deep Features as a Perceptual Metric" — test on official BAPPS test pairs (cite specific). Anchor 3 (PSNR): mathematical definition PSNR = 20 log10(MAX_I/sqrt(MSE)) — hand-derivation. These anchors gate the *metric implementations*, not just the harness.
- **Evidence-hashes in audit (§6.0 item 5):** report includes sha256 for mutation-score JSON + adversarial-fixture pack.

A. tools/testkit/equivalence/render_similarity.py per §3.2.2.
B. tools/testkit/equivalence/harness.py — new "render-similarity" mode.
C. tools/testkit/equivalence/tolerance.toml — schema additions only.
D. tools/testkit/equivalence/tests/test_render_similarity.py:
   - Identity pair → PSNR=sentinel, SSIM=1.0, LPIPS≈0.
   - Known-perturbation pair → metrics in expected ranges.
   - Shape mismatch → ValueError; wrong dtype → ValueError.
E. tools/testkit/pyproject.toml — pinned: lpips==<x>, scikit-image
   >=<x>, torch (transitive; declare in manifest).
F. tools/testkit/equivalence/README.md — "Render-similarity mode" section.
G. docs/testkit/equivalence.md (or equivalent per probe).
H. Shared-file updates (edit directly):
   - CHANGELOG.md (append entry under ## Phase 3).
   - docs/glossary.md (PSNR, SSIM, LPIPS, perceptual loss).
   - .github/workflows/build-py.yml (test-render-similarity job per
     §3.2.10).
I. progress.md entry per §3.5.
J. Report at docs/_audits/phase-3/task-2-render-similarity.md per §5.1.

MERGE PROTOCOL per §4.3.

DISCIPLINES per §5.3: Convention #8, M, C/D, E. Strict-mode CI. §0.3.

REPORT per §5.1.

START: clone, sub-branch, read progress.md (task-1 entry), probe.
```

### 6.3 task-3 — Lenia (3.1, Stack D)

```
You are task-3 of Phase 3, Bit-Physics portfolio. Sequential.

ROLE: Reference Lenia on Stack D (Taichi). Sub-phase 3.1.

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post tasks 1–2 merged).
YOUR BRANCH: phase-3/task-3-lenia.

Spec §5.2.2. Ref: Chan, B. W.-C. (2019). Complex Systems 28(3).

CONTEXT BRIDGE per §3.5:
- Read progress.md (tasks 1 and 2 entries).
- Note: tasks 1 and 2 are infrastructure; you're the first SIM and your
  flow validates that the testkit + golden + tier-3 + CI pipeline works
  end-to-end. If you find friction, the friction likely affects later
  sim tasks — surface clearly.

INTERFACES YOU CONSUME:
- common/common-py/ (Taichi capture I/O, GGUI, hot-reload).
- tools/testkit/golden/ (golden-table pattern).

INTERFACES YOU PRODUCE:
- continuous-ca/lenia/python/ — terminal sim.
- Golden tables (consumed only by your own tests).

OUT OF SCOPE (Phase 4+):
- Stack B port; Particle/Flow/Diff Lenia; 3D Lenia; save-creature UX;
  polyring kernels.

ANCHOR-PROBE STEP per §5.3:

1. Clone, sub-branch, base-sha.
2. View:
   - common/common-py/ (Taichi capture I/O).
   - Phase 1 docs/sim-specs/continuous-ca/reaction-diffusion-2d/
     (CA spec sheet pattern; copy structure).
   - tools/testkit/golden/.
   - tools/testkit/probes/template.md.
   - references/ (vendoring pattern).
3. File probe at tools/testkit/probes/reports/lenia.md. Enumerate
   common-py APIs consumed; Chakazul/Lenia SHA (web-fetch + security);
   Quad4 kernel formula K(r)=(4r(1-r))^4 cited to Chakazul source
   file:line; Orbium unicaudatus preset cited to animals.json.

DELIVERABLES (Layer 4 thirteen gates per spec § 3.5 v2.4 + § 5.4):

A. docs/sim-specs/continuous-ca/lenia/spec-ref.md per §3.2.8. **§ 6 declares ≥ 2 PBT-covered invariants (spec § 2.14):** suggested invariants — `mass_approximately_conserved` (Lenia preserves total field mass within numerical tolerance) and `monotone_bounds` (field values remain in [0, 1] for normalized Lenia under random valid initial conditions).
B. tools/testkit/probes/reports/lenia.md.
C. continuous-ca/lenia/python/tests/ — failing TDD tests committed
   BEFORE impl (separate commit) **with failing-tests output capture per spec § 1.3 step 4 + §6.0 item 6:**
   - Run `pytest continuous-ca/lenia/python/tests/ -v 2>&1 | tee tools/testkit/failing-tests-evidence/lenia-<UTC>.txt`.
   - Compute `sha256sum tools/testkit/failing-tests-evidence/lenia-<UTC>.txt`.
   - Confirm failure mode is `ModuleNotFoundError` / `NotImplementedError` (NOT collection error).
   - Commit message footer:
     ```
     Failing-tests-output: tools/testkit/failing-tests-evidence/lenia-<UTC>.txt
     Failing-tests-output-hash: sha256:<full-hex>
     ```
D. continuous-ca/lenia/python/ — Taichi impl (separate commit, footer references the failing-tests-commit SHA + `Failing-tests-output-hash-witnessed: sha256:<same-hex>`):
   - Real-space Taichi-kernel convolution (default).
   - FFT only if stable Taichi-compatible FFT path exists (probe).
   - Orbium unicaudatus preset minimum.
   - Capture I/O via common-py.
   - CLI per §3.2.6.
E. tools/testkit/golden/tables/lenia-kernel.json (K(r) at canonical
   radii); lenia-orbium-trajectory.json (field at canonical steps,
   64² grid). **Each table has ≥ 3 independent-reference anchors per spec § 2.4 + §6.0 item 8:** for the kernel table, anchor at r=0 (peak K(0)), r=0.5 (mid-range — cross-checked against Chakazul's reference notebook output), and r=1 (compact-support boundary, K(1)=0). Each anchor includes source citation (paper + DOI + page) in JSON `independent_reference` field.
F. tools/testkit/golden/derivations/lenia-kernel.md.
G. references/Chakazul-Lenia/manifest.yaml + vendored at pinned SHA.
H. Tier 3 at tools/diagnostics/tier3/lenia/ per §3.2.9.
I. Cat 1, 2 gates green. **Plus Cat-X tolerance-budget compliance** (spec § 2.6 + §6.0 item 2): any `tolerance.toml` entry below within `tolerance-budget.toml` cap. If not, propose tolerance-budget amendment via separate operator-approved commit; do NOT widen unilaterally.
J. **Property-based tests at `tools/testkit/property/sims/lenia/`** (spec § 2.14 + §6.0 item 7): implement the ≥ 2 invariants declared in spec-ref.md § 6. Hypothesis examples database at `.hypothesis/` committed.
K. **Perf-ledger row** in `docs/perf-ledger.md` (spec § 2.15 + §6.0 item 9): `| lenia | python (Taichi) | orbium-256sq-seed42-step1000 | <wall_clock> | <hw-id> | <commit-sha> | <date> | baseline |`.
L. **Schema-corpus seed** at `tests/fixtures/legacy-captures/phase-3-lenia.h5` + sidecar (spec § 2.7/2.12 + §6.0 item 10): copy the canonical capture for Phase 4 WU-A's schema-bump round-trip.
M. Shared-file updates:
   - README.md, CHANGELOG.md.
   - docs/glossary.md (Lenia, kernel-convolution CA, Quad4, growth fn).
   - justfile (just run-lenia, just test-lenia).
   - .github/workflows/build-py.yml (test-lenia job per §3.2.10).
   - tools/testkit/equivalence/tolerance.toml (continuous-ca.lenia
     row per §3.2.4: golden_kernel_abs=1e-6, golden_kernel_rel=1e-5,
     golden_trajectory_abs=1e-4) — **verify each value is within tolerance-budget.toml cap before commit.**
   - tools/testkit/determinism/registry.toml (continuous-ca.lenia row
     per §3.2.5).
N. progress.md entry.
O. Report at docs/_audits/phase-3/task-3-lenia.md per §5.1, **with `evidence_paths:` and `evidence_hashes:` populated per §6.0 item 5:** include sha256 of the failing-tests-evidence file, the canonical capture, and the perf-ledger row commit.

VERIFICATION POSTURE:
- Code verification: GOLDEN VALUES (with independent-reference anchors).
- Determinism: bit-exact same-stack-same-hw via Taichi seed; no
  atomics in forward conv.
- Property-based: ≥ 2 invariants per spec § 2.14.

MERGE PROTOCOL: per v8 trunk-based amendment, commit directly to `main`; no merge step.

DISCIPLINES per §5.3 + §6.0: Convention #8 (vendor + grep Chakazul, no
memory), M, K, E. Strict-mode CI. TDD with output-hash footer. §0.3.

REPORT per §5.1.

START: clone, sub-branch, read progress.md (tasks 1, 2 entries), probe.
```

### 6.3a task-3a — Ising-classical (3.x quantum-adjacent classical reference, Stack B)

```
You are task-3a of Phase 3, Bit-Physics portfolio. Sequential.

ROLE: 2D Ising model on Stack B (TypeScript/WebGPU) via Metropolis-
Hastings Monte Carlo. Per v8 amendment + spec § 11.4: a classical
reference sim in the quantum-adjacent track. Lightweight; pedagogical
foundation for the future ising-dwave Phase 6 sim. No quantum hardware
dependency.

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: main (per v8 trunk-based amendment).
Commit directly to main; no feature branch.

Spec § 5.10 (Lattice spin systems). Onsager (1944) "Crystal Statistics.
I. A Two-Dimensional Model with an Order-Disorder Transition" provides
the exact analytic critical temperature T_c = 2/ln(1+√2) ≈ 2.269185.
Yang (1952) provides the exact magnetization curve for T < T_c.

CONTEXT BRIDGE per §3.5:
- Read progress.md (tasks 1, 2, 3 entries).
- Stack B sim → consumes common-ts (Phase 0 + Phase 1 mature) and
  common-3dgs (task-1 introduction; not actually used here, but
  task-3a is a Stack B sim so the Phase 0 patterns apply).
- Phase 0's reaction-diffusion-2d is the closest exemplar: same Stack B,
  same scalar-field on lattice, same capture-format discipline.

INTERFACES YOU CONSUME:
- common/common-ts/ (Phase 0 mature) — WebGPU compute primitives,
  capture I/O via h5wasm.
- tools/testkit/golden/.
- tools/testkit/probes/template.md.

INTERFACES YOU PRODUCE:
- lattice-spin/ising-classical/typescript/ — Stack B sim package.
- Golden tables anchored to Onsager (analytic critical temperature)
  and Yang (analytic magnetization curve).
- Tier 3 diagnostic for spin systems.
- Capture at descriptor `metropolis-128sq-T2.27-seed42-step10000` per
  spec Appendix D § D.2.3.

OUT OF SCOPE (Phase 6+):
- ising-dwave (hardware quantum annealer; pending hardware access).
- Cluster algorithms (Wolff, Swendsen-Wang) — Metropolis only here.
- 3D Ising or higher dimensions.
- Continuous spins (XY, Heisenberg).

ANCHOR-PROBE STEP per §5.3:

1. Probe common-ts WebGPU compute API: view actual signatures.
2. Probe Phase 0 RD-2D structure (closest exemplar): file layout,
   spec-ref.md shape, golden-table format.
3. View tools/testkit/golden/ to confirm table schema.
4. Web-fetch Onsager 1944 (DOI 10.1103/PhysRev.65.117) and Yang 1952
   (DOI 10.1103/PhysRev.85.808) for critical temperature + magnetization
   formula. Cite exactly.
5. File probe at tools/testkit/probes/reports/ising-classical.md.

DELIVERABLES (Layer 4 thirteen gates per spec § 3.5 v2.4 + §6.0):

A. docs/sim-specs/lattice-spin/ising-classical/spec-ref.md per §3.2.8.
   **§ 6 declares ≥ 2 PBT-covered invariants per spec § 2.14:**
   - `magnetization_bounded`: |m| ≤ 1 at every step for randomly-
     sampled valid initial states + temperature (T ∈ [1.0, 4.0]).
   - `energy_per_spin_bounded`: E/N ∈ [-2, 2] (for the 2D nearest-
     neighbor Ising with J=1) at every step.
B. tools/testkit/probes/reports/ising-classical.md.
C. lattice-spin/ising-classical/typescript/tests/ — failing TDD tests
   committed BEFORE impl, with failing-output capture per §6.0 item 6:
   - Run `pnpm vitest run lattice-spin/ising-classical/typescript/tests/ 2>&1 | tee tools/testkit/failing-tests-evidence/ising-classical-<UTC>.txt`.
   - Compute `sha256sum tools/testkit/failing-tests-evidence/ising-classical-<UTC>.txt`.
   - Confirm failure mode shows missing-module error.
   - Commit message footer:
     ```
     Failing-tests-output: tools/testkit/failing-tests-evidence/ising-classical-<UTC>.txt
     Failing-tests-output-hash: sha256:<full-hex>
     ```
D. lattice-spin/ising-classical/typescript/ — WebGPU Metropolis impl
   (separate commit; footer includes `Implements-failing-tests-from`
   + `Failing-tests-output-hash-witnessed`):
   - Compute shader: parallel Metropolis with checkerboard sublattice
     update (standard parallel-Metropolis pattern; preserves detailed
     balance per Glauber dynamics).
   - 128×128 grid default; periodic boundary conditions.
   - Configurable T (temperature), J (coupling, default 1), h (external
     field, default 0).
   - PCG random number generator (per-cell state, deterministic seed).
   - Capture I/O via h5wasm; writes capture at the descriptor in
     spec Appendix D § D.2.3.
E. tools/testkit/golden/tables/ising-critical-temperature.json:
   Onsager's exact T_c = 2/ln(1+√2) ≈ 2.269185. **≥ 3 independent-
   reference anchors per spec § 2.4:**
   - Anchor 1: Onsager 1944, Phys. Rev. 65 §V; exact value 2/ln(1+√2).
   - Anchor 2: Landau & Binder *A Guide to Monte Carlo Simulations in
     Statistical Physics* (4th ed., 2014) Table 5.1: T_c/J = 2.26919...
   - Anchor 3: Hand-derivation from the duality argument (Kramers-
     Wannier 1941, Phys. Rev. 60 §3); β_c sinh(2β_c) = 1.
F. tools/testkit/golden/tables/ising-magnetization-curve.json: Yang
   1952 exact magnetization m(T) = (1 - sinh⁻⁴(2β))^(1/8) for T < T_c.
   Tabulated at T ∈ {0.5, 1.0, 1.5, 2.0, 2.2, 2.25} (below T_c). **≥ 3
   independent-reference anchors:**
   - Anchor 1: Yang 1952, Phys. Rev. 85 Eq. (96).
   - Anchor 2: Baxter *Exactly Solved Models in Statistical Mechanics*
     (1982) §7.10 magnetization table.
   - Anchor 3: Newman & Barkema *Monte Carlo Methods in Statistical
     Physics* (1999) Fig. 3.1 (digitized values at T=1, 2).
G. tools/testkit/golden/derivations/ising-onsager.md: derivation
   summary citing Onsager + Kramers-Wannier; not a re-derivation
   (the full transfer-matrix solution is textbook material).
H. Tier 3 at tools/diagnostics/tier3/ising-classical/ per §3.2.9:
   - Magnetization tracking per step.
   - Energy per spin tracking.
   - Autocorrelation diagnostic (Metropolis suffers from critical
     slowing-down near T_c; document, do not gate).
I. **Property-based tests** at tools/testkit/property/sims/ising-classical/
   per spec § 2.14 + §6.0 item 7: implement the two invariants from § 6.
   Hypothesis example database at `.hypothesis/` committed.
J. **Perf-ledger row** in docs/perf-ledger.md per spec § 2.15 + §6.0 item 9:
   `| ising-classical | typescript (WebGPU) | metropolis-128sq-T2.27-seed42-step10000 | <wall_clock> | <hw-id> | <commit-sha> | <date> | baseline |`.
K. **Schema-corpus seed** at tests/fixtures/legacy-captures/phase-3-ising-classical.h5 + sidecar per spec § 2.7/2.12 + §6.0 item 10.
L. Cat 1, 2 gates green. **Plus Cat-X tolerance-budget compliance**:
   any tolerance.toml entry within tolerance-budget.toml cap.
M. Shared-file updates:
   - README.md, CHANGELOG.md.
   - docs/glossary.md (Ising, Metropolis-Hastings, detailed balance,
     critical temperature, Onsager solution, Kramers-Wannier duality).
   - justfile (just run-ising-classical, just test-ising-classical).
   - .github/workflows/build-ts.yml (test-ising-classical job).
   - tools/testkit/equivalence/tolerance.toml (lattice-spin.ising row:
     critical_temp_rel=1e-3 — Monte Carlo finite-size effects shift
     observed T_c by ~1/L; magnetization_rel=5e-2 — Monte Carlo
     statistical error at 10^4 steps). **Within tolerance-budget.toml
     caps.**
   - tools/testkit/determinism/registry.toml (lattice-spin.ising-classical
     row: bit-exact same-stack-same-hw via PCG seeding; document
     parallel-Metropolis checkerboard's deterministic order).
N. progress.md entry.
O. Report at docs/_audits/phase-3/task-3a-ising-classical.md per §5.1
   with evidence_paths + evidence_hashes per §6.0 item 5.

VERIFICATION POSTURE:
- Code verification: GOLDEN VALUES via Onsager-anchored critical-
  temperature reference + Yang-anchored magnetization-curve reference.
  Statistical-error tolerance is wide (Monte Carlo); per-test
  documented.
- Determinism: bit-exact same-stack-same-hw via PCG seed + deterministic
  checkerboard update order.
- Property-based: ≥ 2 invariants per spec § 2.14.
- Solution verification: not applicable (no continuum limit).
- Model validation: Onsager exact solution at infinite-size limit;
  finite-size scaling per Landau & Binder § 4.

MERGE PROTOCOL: per v8 trunk-based amendment, commit directly to `main`.

DISCIPLINES per §5.3 + §6.0: Convention #8 (Onsager + Yang cited
verbatim with DOI), M, K, E. Strict-mode CI. TDD with output-hash
footer. §0.3.

REPORT per §5.1.

START: read progress.md (tasks 1, 2, 3 entries), probe Onsager + Yang
references, file probe report.
```

### 6.4 task-4 — rigid-body-pedagogical (3.3, Stack E)

```
You are task-4 of Phase 3, Bit-Physics portfolio. Sequential.

ROLE: Rigid-body pedagogical on Stack E (Warp). NO Newton dep. NO
vendored implementation. Textbook citation only. Sub-phase 3.3.

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post tasks 1–3 merged).
YOUR BRANCH: phase-3/task-4-rigid-body-pedagogical.

Spec §5.8. NEW top-level rigid-body/ folder.
Featherstone, R. (2008). Rigid Body Dynamics Algorithms. Textbook —
citation only per phase plan §2.2. Algorithm: ABA Ch. 7.

CONTEXT BRIDGE per §3.5:
- Read progress.md (tasks 1, 2, 3 entries).
- You're the first Stack E sim of Phase 3. Your flow validates the
  Stack E sim pattern. Surface any friction.

INTERFACES YOU CONSUME:
- common/common-warp/ (Phase 2 state).
- tools/testkit/golden/.

INTERFACES YOU PRODUCE:
- rigid-body/articulated-pedagogical/python/ — terminal sim.
- Golden trajectories (analytical pendulum + RK4-reference for double
  pend + 6-DOF).
- Tier 3 diagnostic.
- Common-warp consumer site for task-9 to inventory.

OUT OF SCOPE (Phase 4+):
- Newton (4.23–4.25); contact mechanics (joint-only); diff rigid-body;
  Isaac Lab; runtime linking against rigid-body OSS.

ANCHOR-PROBE STEP per §5.3:

1. Clone, sub-branch, base-sha.
2. View:
   - common/common-warp/ + docs/common/warp.md.
   - Existing per-category folder layouts (hybrid-pg/, volumetric-grid/,
     particle-fluid/) — pattern for new rigid-body/.
   - tools/testkit/golden/.
   - tools/testkit/probes/template.md.
3. File probe at tools/testkit/probes/reports/rigid-body-pedagogical.md.

DELIVERABLES (Layer 4 per §5.4):

**v9 addendum (inlined per §6.0; spec § 3.5 v2.4 thirteen-gate):**
- **TDD output-hash (§6.0 item 6):** capture failing output at `tools/testkit/failing-tests-evidence/rigid-body-pedagogical-<UTC>.txt`; sha256 in failing-tests commit footer; witnessed hash in implementation commit footer.
- **PBT invariants in spec § 6 (§6.0 item 7):** ≥ 2 invariants — suggested `energy_drift_bounded` (frictionless system: total energy drift per second < threshold under random valid ICs at integer-step times) and `momentum_conservation` (no external forces: linear + angular momentum preserved under random valid ICs). Implementation at `tools/testkit/property/sims/rigid-body-pedagogical/`.
- **Independent-reference anchors in golden tables (§6.0 item 8):** pendulum analytical solutions (Anchor 1: Marion & Thornton *Classical Dynamics* (5th ed.) §3.2 small-angle T = 2π√(L/g); Anchor 2: Goldstein *Classical Mechanics* (3rd ed.) §4.3 elliptic-integral large-angle solution; Anchor 3: NIST DLMF §22 Jacobi elliptic functions for high-amplitude reference values). RK4-reference for double pendulum is NOT independent (it's a numerical reference); document this clearly in spec sheet § 6 — the RK4 reference is a higher-precision numerical baseline, not an analytic anchor.
- **Perf-ledger row (§6.0 item 9):** `| rigid-body-pedagogical | warp | <descriptor> | <wall_clock> | <hw> | <sha> | <date> | baseline |`.
- **Schema-corpus seed (§6.0 item 10):** `tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.h5` + sidecar.
- **Cat-X tolerance-budget compliance (§6.0 item 2):** the tolerance.toml entries below (pendulum_period_rel=1e-3, trajectory_abs=1e-2, energy_drift_rel_per_second=1e-3) must be within tolerance-budget.toml caps. If `rigid-body` category has no budget cap, Stage 0 of Phase 3 (or the operator at pre-dispatch) adds one to tolerance-budget.toml before task-4 dispatches.
- **Evidence-hashes in audit (§6.0 item 5):** report's front-matter includes sha256 for failing-tests-evidence file, RK4-reference golden table, perf-ledger row.

A. docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md per
   §3.2.8.
B. docs/sim-specs/rigid-body/articulated-pedagogical/algebraic.md —
   ABA derivation. Document conventions EXPLICITLY: spatial vs body-
   fixed frames, Plücker conventions, joint axis orientations. Cite
   textbook page + equation throughout.
C. tools/testkit/probes/reports/rigid-body-pedagogical.md.
D. rigid-body/articulated-pedagogical/python/tests/ — failing TDD:
   - Single revolute joint: pendulum period vs analytical
     T=2π√(L/g) small-amplitude; elliptic-integral large-amplitude.
   - Double pendulum: trajectory vs HIGH-FIDELITY RK4 REFERENCE
     (100× smaller timestep than sim).
   - 6-DOF serial chain: trajectory vs RK4-reference; energy
     conservation no-friction.
E. rigid-body/articulated-pedagogical/python/ — Warp ABA. Integrator:
   semi-implicit Euler default + RK4 option. CLI per §3.2.6 with
   --tier ∈ {single-joint, double-pendulum, 6-dof, N-link}.
F. tools/testkit/golden/tables/rigid-body-pendulum-trajectory.json
   (analytical); rigid-body-double-pendulum-trajectory.json (RK4-ref);
   rigid-body-6dof-trajectory.json (RK4-ref).
G. tools/testkit/golden/derivations/rigid-body-pendulum.md
   (analytical small-angle + elliptic-integral);
   rigid-body-rk4-reference.md (high-fidelity numerical reference
   generation protocol).
H. Tier 3 at tools/diagnostics/tier3/rigid-body-pedagogical/ per §3.2.9.
I. Cat 1 trivially passes (no code upstream). Cat 2 green.
J. Shared-file updates:
   - README.md, CHANGELOG.md.
   - docs/glossary.md (Featherstone, ABA, Plücker coords, spatial vs
     body-fixed frame, revolute/prismatic/spherical joints, semi-
     implicit Euler, RK4).
   - justfile.
   - .github/workflows/build-py.yml (test-rigid-body-pedagogical job).
   - tools/testkit/equivalence/tolerance.toml (rigid-body row per
     §3.2.4: pendulum_period_rel=1e-3, trajectory_abs=1e-2,
     energy_drift_rel_per_second=1e-3).
   - tools/testkit/determinism/registry.toml (rigid-body row).
K. progress.md entry.
L. Report at docs/_audits/phase-3/task-4-rigid-body-pedagogical.md.

VERIFICATION POSTURE:
- Code verification: GOLDEN TRAJECTORIES. Analytical pendulum +
  RK4-reference for double pend + 6-DOF. RK4 reference committed.
- Solution verification: per-integrator OOA.
- Model validation: analytical mechanics (pendulum period).
- Determinism: bit-exact same-stack-same-hw via Warp deterministic mode.

MERGE PROTOCOL per §4.3.

DISCIPLINES per §5.3: Convention #8 (Featherstone cited page+equation,
no memory); document EVERY convention choice in algebraic.md; M, K, E.
Strict-mode CI. §0.3.

REPORT per §5.1.

START: clone, sub-branch, read progress.md (tasks 1-3 entries), probe.
```

### 6.5 task-5 — mass-spring-cloth (3.4, Stack C)

```
You are task-5 of Phase 3, Bit-Physics portfolio. Sequential.

ROLE: Soft-body cloth via XPBD on Stack C (Vulkan). Sub-phase 3.4.

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post tasks 1–4 merged).
YOUR BRANCH: phase-3/task-5-mass-spring-cloth.

Spec §5.9. NEW top-level soft-body/ folder.
Macklin, Müller, Chentanez (2016). XPBD.
Stack C per phase plan §2.1. Bender upstream per §2.3.

CONTEXT BRIDGE per §3.5:
- Read progress.md (tasks 1–4).
- You're the first Stack C sim of Phase 3. Validates Stack C sim flow.

INTERFACES YOU CONSUME:
- common/common-cpp/ (Vulkan abstractions; capture I/O; ImGui).

INTERFACES YOU PRODUCE:
- soft-body/mass-spring-cloth/cpp/ — terminal sim.
- Golden positions; tier 3 diagnostic; vendored Bender ref.

OUT OF SCOPE (Phase 4+):
- JGS2/MGPBD/C5D; Newton VBD; diff cloth; volumetric soft-bodies;
  self-collision beyond baseline XPBD.

ANCHOR-PROBE STEP per §5.3:

1. Clone, sub-branch, base-sha.
2. View:
   - common/common-cpp/ (Vulkan abstractions, capture I/O, ImGui).
   - Phase 1 Stack C sims (eulerian-smoke, sph-water, lattice-
     boltzmann — CMake + folder pattern).
   - tools/testkit/golden/.
   - tools/testkit/probes/template.md.
3. File probe at tools/testkit/probes/reports/mass-spring-cloth.md.

DELIVERABLES (Layer 4 per §5.4):

**v9 addendum (inlined per §6.0; spec § 3.5 v2.4 thirteen-gate):**
- **TDD output-hash (§6.0 item 6):** capture failing C++ test output at `tools/testkit/failing-tests-evidence/mass-spring-cloth-<UTC>.txt`; sha256 in commit footer; witnessed in implementation commit. (C++ test runner: ctest produces parseable output; pipe via `2>&1 | tee`.)
- **PBT invariants in spec § 6 (§6.0 item 7):** ≥ 2 — suggested `length_bounded_above` (XPBD constraint solver: no spring exceeds rest_length × (1 + max_stretch_ratio) under random valid ICs) and `momentum_conservation_no_gravity` (cloth with gravity disabled: linear momentum preserved per step under random ICs). Implementation at `tools/testkit/property/sims/mass-spring-cloth/` (note: PBT in Python; C++ sim exposes via the Stack C capture-replay API so Python PBT can verify post-hoc on captures).
- **Independent-reference anchors (§6.0 item 8):** for catenary equilibrium golden — Anchor 1: catenary analytic y(x) = a·cosh(x/a) where a = T_0/(ρg); cite *Marion & Thornton* §6.4 or *Symon Mechanics* (3rd ed.) §10.2. Anchor 2: hand-derivation of equilibrium force balance at midpoint. Anchor 3: cross-check against textbook table values (e.g., Beer & Johnston *Statics* (12th ed.) Table 7.2 catenary).
- **Perf-ledger row (§6.0 item 9):** `| mass-spring-cloth | cpp (Vulkan) | <descriptor> | <wall_clock> | <hw> | <sha> | <date> | baseline |`.
- **Schema-corpus seed (§6.0 item 10):** `tests/fixtures/legacy-captures/phase-3-mass-spring-cloth.h5` + sidecar.
- **Cat-X tolerance-budget compliance (§6.0 item 2):** all tolerance.toml entries below within tolerance-budget.toml caps.
- **Evidence-hashes in audit (§6.0 item 5):** report's front-matter includes sha256 for failing-tests-evidence file, catenary golden table, and capture sidecar.

A. docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md per §3.2.8.
B. tools/testkit/probes/reports/mass-spring-cloth.md.
C. soft-body/mass-spring-cloth/cpp/tests/ — failing TDD:
   - Hanging cloth under gravity (catenary-like equilibrium).
   - Stretched cloth between fixed points (linear-elastic limit).
   - Cloth at rest (zero-motion preservation).
D. soft-body/mass-spring-cloth/cpp/ — Vulkan + C++20. CMake +
   FetchContent. XPBD: distance + bending (structural); shear
   (optional); Gauss-Seidel projection; compliance↔stiffness mapping
   per Macklin 2016. CLI per §3.2.6.
E. tools/testkit/golden/tables/cloth-hanging.json,
   cloth-stretched.json — golden positions, 32×32 mesh.
F. tools/testkit/golden/derivations/cloth-catenary-limit.md.
G. references/PositionBasedDynamics/manifest.yaml + vendored at
   pinned SHA + security check.
H. Tier 3 at tools/diagnostics/tier3/mass-spring-cloth/ per §3.2.9.
I. Cat 1, 2 gates green.
J. Shared-file updates:
   - README.md, CHANGELOG.md.
   - docs/glossary.md (XPBD, PBD, Gauss-Seidel projection, compliance,
     catenary, distance/bending constraints).
   - justfile (just run-cloth, just test-cloth — CMake wrappers).
   - .github/workflows/build-cpp.yml (test-mass-spring-cloth job per
     §3.2.10).
   - tools/testkit/equivalence/tolerance.toml (cloth row per §3.2.4).
   - tools/testkit/determinism/registry.toml (cloth row).
K. progress.md entry.
L. Report at docs/_audits/phase-3/task-5-mass-spring-cloth.md.

VERIFICATION POSTURE:
- Code verification: GOLDEN POSITIONS.
- Solution verification: convergence with XPBD iteration count.
- Model validation: hanging shape vs catenary.
- Determinism: bit-exact same-stack-same-driver via Vulkan.

MERGE PROTOCOL per §4.3.

DISCIPLINES per §5.3: Convention #8, M, K, E. TDD. Strict-mode CI. §0.3.

REPORT per §5.1.

START: clone, sub-branch, read progress.md (tasks 1-4), probe.
```

### 6.6 task-6 — Neural CA (3.2, Stack D + Stack B)

```
You are task-6 of Phase 3, Bit-Physics portfolio. Sequential.

ROLE: NCA — Stack D PyTorch training AND Stack B custom-WGSL
inference. Sub-phase 3.2. Single task because equivalence gate ties
both stacks. Cross-stack render-similarity verification via task-2's
harness.

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post tasks 1–5 merged).
YOUR BRANCH: phase-3/task-6-neural-ca.

Spec §5.2.3 (Mordvintsev 2020, Distill).

LOCKS:
- Stack B framework: custom WGSL compute shaders. Per §2.9.
- PyTorch direct (NOT promoted to common-py). Per §2.10.

CONTEXT BRIDGE per §3.5:
- Read progress.md (tasks 1–5).
- task-2 produced render_similarity.py. Read its progress entry for
  consumption hints.

INTERFACES YOU CONSUME:
- common/common-py/ (non-PyTorch utilities only; PyTorch direct).
- common/common-ts/ (WebGPU device init, settings panel).
- tools/testkit/equivalence/render_similarity.py (task-2's deliverable
  per §3.2.2).
- Stack B test infra (probe-discovered; if absent, BLOCK).

INTERFACES YOU PRODUCE:
- continuous-ca/neural-ca/python/ — terminal training sim.
- continuous-ca/neural-ca/typescript/ — terminal inference sim.
- Golden checkpoint (consumed by both Python tests AND TS tests).

OUT OF SCOPE (Phase 4+):
- DiffLogic / Universal / ARC / Petri Dish / HyperNCA.
- Browser training. ONNX/TF.js (locked §2.9). PyTorch in common-py
  (locked §2.10).

ANCHOR-PROBE STEP per §5.3:

1. Clone, sub-branch, base-sha.
2. View:
   - common/common-py/ (non-PyTorch utilities).
   - common/common-ts/.
   - Phase 1 docs/sim-specs/continuous-ca/reaction-diffusion-2d/.
   - tools/testkit/equivalence/render_similarity.py (consume per §3.2.2).
   - tools/testkit/golden/checkpoints/ (pattern; design if new).
   - STACK B TEST INFRA: how do existing Stack B sims test inference?
     Playwright? Dawn-Node? Headless puppeteer? Manual only? Find and
     consume. IF NO PATTERN EXISTS: BLOCK per §5.3. Do NOT set up
     Stack B testing infra.
3. File probe at tools/testkit/probes/reports/neural-ca.md. Note
   Stack B test infra findings explicitly.

DELIVERABLES (Layer 4):

**v9 addendum (inlined per §6.0; spec § 3.5 v2.4 thirteen-gate):**
- **TDD output-hash (§6.0 item 6):** capture failing pytest output at `tools/testkit/failing-tests-evidence/neural-ca-python-<UTC>.txt` AND failing Stack B test output at `tools/testkit/failing-tests-evidence/neural-ca-typescript-<UTC>.txt`. Each gets its own sha256 in the corresponding failing-tests commit footer. Witnessed in implementation commits.
- **PBT invariants in spec § 6 (§6.0 item 7):** ≥ 2 — suggested `field_values_bounded` (NCA output values clamped/normalized: f(x,t) ∈ [-1, 1] or [0, 1] at every step under random valid initial seeds) and `inference_determinism` (same weights + same seed + same input → bit-exact output across two runs; this is the foundation for D↔B render-similarity). Implementation at `tools/testkit/property/sims/neural-ca/`.
- **Independent-reference anchors (§6.0 item 8):** trained-model checkpoints are NOT golden-tablish — they're trained outputs that vary with seed and hyperparameters. Instead, anchor the **D↔B render-similarity test** via published render-similarity metrics: Anchor 1: PSNR threshold from Mordvintsev et al. 2020 "Growing Neural Cellular Automata" Distill notebook (cite specific section). Anchor 2: SSIM lower-bound from a separately-published NCA reference (e.g., a different lab's NCA reproduction). Anchor 3: hand-derived "patterns visually equivalent" criterion documented in spec sheet § 9. Note: this is a softer anchor than analytic tables, but appropriate for a learned-dynamics sim per spec § 5.12. **Document in spec § 6 that this gate is statistical rather than analytic.**
- **Perf-ledger row (§6.0 item 9):** one row per stack — `| neural-ca | python (PyTorch training) | … | baseline |` AND `| neural-ca | typescript (WebGPU inference) | … | baseline |`.
- **Schema-corpus seed (§6.0 item 10):** `tests/fixtures/legacy-captures/phase-3-neural-ca.h5` + sidecar (the Stack B inference capture; the Python training capture also seeded if it's in canonical format).
- **Cat-X tolerance-budget compliance (§6.0 item 2):** render-similarity tolerances within budget. Cross-stack equivalence-budget for D↔B is wider than other sims (per spec § 2.6 default table: learned dynamics is "distributional", not strict equivalence). Document in spec § 9.
- **Evidence-hashes in audit (§6.0 item 5):** report includes sha256 for failing-tests-evidence files, trained-checkpoint file, and D↔B render-similarity report.

A. docs/sim-specs/continuous-ca/neural-ca/spec-ref.md per §3.2.8.
   §9 equivalence: D↔B render-similarity bounds locked from your
   measurements per §2.12.
B. tools/testkit/probes/reports/neural-ca.md.
C. continuous-ca/neural-ca/python/tests/ — failing TDD for training
   convergence + checkpoint serialization.
   continuous-ca/neural-ca/typescript/tests/ — failing TDD for WGSL
   inference reproduction (via probe-discovered Stack B test infra).
D. continuous-ca/neural-ca/python/ — PyTorch training. .safetensors
   checkpoint output. CLI per §3.2.6.
E. continuous-ca/neural-ca/typescript/ — Stack B WebGPU inference.
   Custom WGSL compute shaders. Loads converted checkpoint.
F. tools/testkit/golden/checkpoints/neural-ca-emoji-{name}.safetensors.
G. references/growing-neural-ca/manifest.yaml + vendored at pinned SHA.
H. Equivalence harness configured for D↔B via task-2's harness.
   Bounds locked from measurements. IF below §2.12 floors: quality
   concern flag in report §6.
I. Tier 3 at tools/diagnostics/tier3/neural-ca/ per §3.2.9.
J. Cat 1, 2, 3 gates green per stack.
K. Shared-file updates:
   - README.md, CHANGELOG.md.
   - docs/glossary.md (Neural CA, NCA, growing CA, fire-rate).
   - justfile (just train-neural-ca, just run-neural-ca-web,
     just test-neural-ca).
   - .github/workflows/build-py.yml (test-neural-ca-train job).
   - .github/workflows/build-ts.yml (test-neural-ca-infer job).
   - tools/testkit/equivalence/tolerance.toml (two rows per §3.2.4).
   - tools/testkit/determinism/registry.toml (two rows: training
     non-det, inference det).
L. progress.md entry.
M. Report at docs/_audits/phase-3/task-6-neural-ca.md.

VERIFICATION POSTURE:
- Code verification: GOLDEN CHECKPOINT.
- Determinism: training non-det (EFECT distributional); inference
  bit-exact given fixed weights.
- Cross-stack equivalence: D-inference ↔ B-inference render-similarity.

MERGE PROTOCOL per §4.3.

DISCIPLINES per §5.3: Convention #8, M, K, E. TDD. Strict-mode CI. §0.3.

REPORT per §5.1.

START: clone, sub-branch, read progress.md (tasks 1-5), probe + Stack B
test infra check.
```

### 6.7 task-7 — PINN-Poisson (3.6, Stack E + PyTorch)

```
You are task-7 of Phase 3, Bit-Physics portfolio. Sequential.

ROLE: PINN solving 2D Poisson on Stack E + PyTorch. Sub-phase 3.6.

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post tasks 1–6 merged).
YOUR BRANCH: phase-3/task-7-pinn-poisson.

Spec §5.12. NEW top-level learned-dynamics/ folder.
Raissi, Perdikaris, Karniadakis (2019). JCP 378.

LOCKS:
- Upstream: NVIDIA PhysicsNeMo PINN tutorial per phase plan §2.4.
- Classical-FD reference in-scope per §2.8.
- PyTorch direct (NOT via common-py) per §2.10.

CONTEXT BRIDGE per §3.5:
- Read progress.md (tasks 1–6).

INTERFACES YOU CONSUME:
- common/common-warp/.
- common/common-py/ (non-PyTorch utilities only).

INTERFACES YOU PRODUCE:
- learned-dynamics/pinn-poisson/python/ — terminal sim.
- tools/testkit/code_verification/classical-references/poisson-2d-fd/
  — reusable classical FD ref (future learned-dynamics sims consume).
- Golden tables; tier 3 diagnostic; vendored PhysicsNeMo ref.

OUT OF SCOPE (Phase 4+):
- GNS; learned LES; foundation models; PINN-classical coupling;
  time-dependent PDEs; PyTorch in common-py (locked §2.10).

ANCHOR-PROBE STEP per §5.3:

1. Clone, sub-branch, base-sha.
2. View:
   - common/common-warp/.
   - common/common-py/ (non-PyTorch utilities only).
   - WARP/PYTORCH INTEROP: probe wp.from_torch() and wp.to_torch()
     with a tiny test script. If broken / version-incompatible:
     BLOCK per §5.3. Do NOT work around.
   - tools/testkit/code_verification/ (classical-references/ likely
     new; design).
   - tools/testkit/code_verification/mms/solutions/ (Phase 0 1D heat
     MMS as structural ref).
   - tools/testkit/probes/template.md.
   - references/.
3. File probe at tools/testkit/probes/reports/pinn-poisson.md.

DELIVERABLES (Layer 4 per §5.4):

**v9 addendum (inlined per §6.0; spec § 3.5 v2.4 thirteen-gate):**
- **TDD output-hash (§6.0 item 6):** capture failing output at `tools/testkit/failing-tests-evidence/pinn-poisson-<UTC>.txt`; sha256 in commit footer; witnessed in implementation.
- **PBT invariants in spec § 6 (§6.0 item 7):** ≥ 2 — suggested `boundary_residual_bounded` (PINN's residual loss on boundary points: ‖u_θ(x ∈ ∂Ω) - g(x)‖ < ε under random valid (Ω, g) sampled within the trained-domain envelope) and `pde_residual_bounded` (interior residual: ‖Δu_θ(x) + f(x)‖ < ε under random interior x). These verify the PINN as a Poisson solver under PBT-randomized inputs within the training-domain envelope. Implementation at `tools/testkit/property/sims/pinn-poisson/`.
- **Independent-reference anchors (§6.0 item 8):** TWO anchor categories — (a) **Analytic Poisson solutions:** Anchor 1: harmonic-function reference u = log|z| on annulus (cite *Evans Partial Differential Equations* (2nd ed.) §2.2); Anchor 2: separation-of-variables solution u = sinh(πx)sin(πy) on unit square (cite *Strauss Partial Differential Equations* (2nd ed.) §6.1); Anchor 3: hand-derivation of f given a chosen u via Δu computation. (b) **Classical FD reference:** the FD solver itself is not independent (it's a numerical method), but the verified-analytic anchors are. Document in spec § 6 that the FD solver is a high-precision *numerical* baseline anchored to (a).
- **Perf-ledger row (§6.0 item 9):** `| pinn-poisson | python (PyTorch + Warp) | <descriptor> | <wall_clock> | <hw> | <sha> | <date> | baseline |`. Note: training time dominates; record separately as `training_wall_clock`.
- **Schema-corpus seed (§6.0 item 10):** `tests/fixtures/legacy-captures/phase-3-pinn-poisson.h5` + sidecar.
- **Cat-X tolerance-budget compliance (§6.0 item 2):** PINN tolerance is wider than analytic-solver tolerance (typical 1e-3 vs 1e-6). Document in tolerance.toml with rationale; verify within tolerance-budget.toml cap for learned-dynamics category.
- **Evidence-hashes in audit (§6.0 item 5):** report includes sha256 for failing-tests-evidence file, trained-model checkpoint, FD-reference golden table, analytic-solution golden table.

A. docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md per §3.2.8.
   §6 two-pronged verification: vs analytical AND vs FD.
B. tools/testkit/probes/reports/pinn-poisson.md.
C. learned-dynamics/pinn-poisson/python/tests/ — failing TDD for
   training convergence + inference vs analytical and FD.
D. learned-dynamics/pinn-poisson/python/ — Warp + PyTorch. CLI per §3.2.6.
E. tools/testkit/code_verification/classical-references/poisson-2d-fd/
   — minimal classical FD solver. Same canonical instances.
F. tools/testkit/code_verification/classical-references/README.md —
   document classical-ref pattern for future sims.
G. tools/testkit/golden/tables/pinn-poisson-canonical-{N}.json
   (analytical + FD at canonical points).
H. tools/testkit/golden/derivations/poisson-2d-analytical.md.
I. references/PhysicsNeMo-PINN/manifest.yaml + vendored at pinned SHA.
J. Tier 3 at tools/diagnostics/tier3/pinn-poisson/ per §3.2.9.
K. Cat 1, 2, 3 gates green.
L. Shared-file updates:
   - README.md, CHANGELOG.md.
   - docs/glossary.md (PINN, Raissi formulation, collocation points,
     soft-constraint loss, physics-informed loss, PhysicsNeMo).
   - justfile.
   - .github/workflows/build-py.yml (test-pinn-poisson job).
   - tools/testkit/equivalence/tolerance.toml (learned-dynamics.
     pinn-poisson row per §3.2.4: analytical_l2=1e-3, fd_l2=1e-2).
   - tools/testkit/determinism/registry.toml (two rows: training
     non-det, inference det).
M. progress.md entry.
N. Report at docs/_audits/phase-3/task-7-pinn-poisson.md.

VERIFICATION POSTURE:
- Code verification: GOLDEN VALUES vs analytical 2D Poisson.
- Classical-reference comparison: PINN vs FD.
- Solution verification: convergence with collocation density.
- Determinism: training non-det; inference det given fixed weights.

MERGE PROTOCOL per §4.3.

DISCIPLINES per §5.3: Convention #8, M, K, E. TDD. Strict-mode CI. §0.3.

REPORT per §5.1.

START: clone, sub-branch, read progress.md (tasks 1-6), probe (incl.
Warp/PyTorch interop check).
```

---

### 6.8 task-8 — 3DGS-MPM coupling (3.5, Stack E)

```
You are task-8 of Phase 3, Bit-Physics portfolio. Sequential.

ROLE: PhysGaussian-style MPM-3DGS coupling on Stack E (Warp).
Sub-phase 3.5. Phase 3's hardest task; placed late so surrounding
infrastructure has been validated.

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post tasks 1–7 merged).
YOUR BRANCH: phase-3/task-8-3dgs-mpm.

Spec §5.11. NEW top-level neural-rendered/ folder.
Reference: Xie, T., Zong, Z., Qiu, Y., et al. (2024). "PhysGaussian."
CVPR. arXiv:2311.12198. github.com/XPandora/PhysGaussian.

SCOPE per phase plan §2.13:
- MVP (must-ship): MPM particles drive Gaussian centers (translation);
  def-grad applied to Gaussian scale + rotation; SH coefficients
  FROZEN at scene-load values.
- Stretch (ship if straightforward, defer if not): per-frame SH
  coefficient rotation under deformation. If >~3 days or test-
  stability issues: defer to Phase 4 as `3dgs-mpm-sh-update`;
  surface in report §10.

PRECONDITIONS (verify at probe; if missing, BLOCK):
- task-1 deliverables present: common/common-3dgs/ + docs/common/3dgs.md.
- task-2 deliverables present: tools/testkit/equivalence/render_similarity.py.

CONTEXT BRIDGE per §3.5:
- Read progress.md (tasks 1–7).
- Pay especial attention to task-1 (common-3dgs) and task-2
  (render-similarity) entries — your hard dependencies.
- Pay attention to task-4 and task-7 entries — they're Stack E sims;
  read their progress hints for Stack E common-warp consumption patterns
  you can mirror.

INTERFACES YOU CONSUME (per §3.2.1, §3.2.2, §3.2.3):
- common/common-3dgs/ public API (GaussianSet, load_ply, forward_splat,
  Camera).
- tools/testkit/equivalence/render_similarity.py.
- common/common-warp/ (Stack E substrate).
- Phase 2.3 hybrid-pg/mpm-multimaterial/python-warp/ MPM particle
  state schema + capture format.

INTERFACES YOU PRODUCE:
- neural-rendered/3dgs-mpm/python/ — terminal sim.
- neural-rendered/3dgs-mpm/coupling.py — SIM-LOCAL coupling primitive
  (NOT promoted to common-3dgs; rule-of-three; Phase 4+).
- Golden renders (PNG); tier 3 diagnostic; vendored PhysGaussian ref.

OUT OF SCOPE (Phase 4+):
- 3DGS-SPH, 3DGS-smoke; i-PhysGaussian, GASP, PhysSplat, PIDG, MILo;
  training new 3DGS scenes; diff splatting; coupling promotion to
  common-3dgs.

ANCHOR-PROBE STEP per §5.3:

1. Clone, sub-branch, base-sha.
2. VERIFY PRECONDITIONS: common-3dgs and render_similarity.py at
   expected paths. If not, BLOCK.
3. View:
   - common/common-3dgs/ + docs/common/3dgs.md (consume documented
     surface only per §3.2.1).
   - tools/testkit/equivalence/render_similarity.py (per §3.2.2).
   - common/common-warp/.
   - hybrid-pg/mpm-multimaterial/python-warp/ (Phase 2.3 — read
     particle state schema + capture format).
   - hybrid-pg/mpm-multimaterial/python/ (Phase 1 Stack D MPM ref).
   - references/PhysGaussian/ (vendor here).
4. File probe at tools/testkit/probes/reports/3dgs-mpm.md.

DELIVERABLES (Layer 4 per §5.4):

**v9 addendum (inlined per §6.0; spec § 3.5 v2.4 thirteen-gate):**
- **TDD output-hash (§6.0 item 6):** capture failing output at `tools/testkit/failing-tests-evidence/3dgs-mpm-<UTC>.txt`; sha256 in commit footer; witnessed in implementation.
- **PBT invariants in spec § 6 (§6.0 item 7):** ≥ 2 — suggested `gaussian_count_invariant` (no Gaussians created/destroyed during MPM coupling step under random valid initial configurations) and `def_grad_determinant_positive` (deformation gradient F has det(F) > 0 at every step for valid material under random valid ICs — physically required, mathematically a real invariant). Implementation at `tools/testkit/property/sims/3dgs-mpm/`.
- **Independent-reference anchors (§6.0 item 8):** for the coupling-correctness golden — Anchor 1: PhysGaussian Eq. (8)-(10) def-grad → Gaussian-param transform (cite paper section + equation numbers). Anchor 2: hand-derivation of the polar decomposition of F into rotation R + stretch S, applied to a single Gaussian (Anchor 2 is independent of PhysGaussian's *implementation* but cites the same *theory*; document this caveat). Anchor 3: cross-check at the trivial-case F = I (identity): Gaussian params unchanged. Render-similarity goldens are anchored via task-2's render-similarity harness with externally-published PSNR/SSIM thresholds.
- **Perf-ledger row (§6.0 item 9):** `| 3dgs-mpm | python (Warp + 3dgs) | <descriptor> | <wall_clock> | <hw> | <sha> | <date> | baseline |`. Note: GPU memory peak also recorded as 3DGS is memory-heavy.
- **Schema-corpus seed (§6.0 item 10):** `tests/fixtures/legacy-captures/phase-3-3dgs-mpm.h5` + sidecar. Note: this capture includes Gaussian-set state in addition to MPM particle state; document the schema fields in spec sheet § 7.
- **Cat-X tolerance-budget compliance (§6.0 item 2):** render-similarity tolerances within budget. The MPM-coupling tolerance is tighter than render-similarity (numerical coupling has bit-exact-or-epsilon tolerance; rendering has perceptual tolerance).
- **Evidence-hashes in audit (§6.0 item 5):** report includes sha256 for failing-tests-evidence file, MPM-coupling-correctness golden table, render-similarity goldens (per-frame), and capture sidecar.

A. docs/sim-specs/neural-rendered/3dgs-mpm/spec-ref.md per §3.2.8.
   §3 algorithm; §4 algebraic form with PhysGaussian equation
   numbers; explicit MVP vs stretch SH-update scope per §2.13;
   §9 render-similarity bounds locked from your measurements.
B. tools/testkit/probes/reports/3dgs-mpm.md.
C. neural-rendered/3dgs-mpm/python/tests/ — failing TDD:
   - Coupling correctness (def-grad → Gaussian-param transform).
   - Render-similarity at canonical frames vs goldens via task-2's
     render_similarity.py.
D. neural-rendered/3dgs-mpm/python/ — Warp + common-3dgs + common-warp.
   coupling.py sim-local. Per-frame: step MPM; def-grad per Gaussian;
   update scale/rotation (SH if stretch landed); render via
   common-3dgs forward_splat. CLI per §3.2.6.
E. tools/testkit/golden/renders/3dgs-mpm-canonical-frame-{N}.png —
   golden reference renders. PSNR/SSIM/LPIPS bounds locked in spec
   §9. IF below §2.12 floors: quality concern flag in report §6.
F. references/PhysGaussian/manifest.yaml + vendored at pinned SHA +
   security check.
G. Tier 3 at tools/diagnostics/tier3/3dgs-mpm/ per §3.2.9.
H. Cat 1, 2, 3 gates green.
I. Shared-file updates:
   - README.md, CHANGELOG.md.
   - docs/glossary.md (PhysGaussian, deformation gradient, SH update
     — merge with task-6's SH entry if present).
   - justfile.
   - .github/workflows/build-py.yml (test-3dgs-mpm job).
   - tools/testkit/equivalence/tolerance.toml (neural-rendered.3dgs-mpm
     row per §3.2.4 with render-similarity bounds).
   - tools/testkit/determinism/registry.toml (3dgs-mpm row).
J. progress.md entry. If SH-update deferred: note in entry.
K. Report at docs/_audits/phase-3/task-8-3dgs-mpm.md per §5.1. §10
   must list SH-update deferral status.

VERIFICATION POSTURE:
- Code verification: RENDER-SIMILARITY via task-2's harness.
- Solution verification: inherits MPM GCI.
- Model validation: visual + qualitative.
- Determinism: inherits MPM posture; coupling deterministic.

MERGE PROTOCOL per §4.3.

DISCIPLINES per §5.3: Convention #8 (vendor + grep PhysGaussian; cite
repo lines not paper prose); M-addendum (preconditions verified before
drafting); M, K, E. TDD. Strict-mode CI. §0.3.

If you realize mid-work that the stretch SH-update will take >~3 days
or hits test-stability issues: STOP, document deferral plan in
progress.md note + report §10, ship MVP only.

REPORT per §5.1.

START: clone, sub-branch, verify preconditions, read progress.md
(tasks 1-7), probe.
```

### 6.9 task-9 — common-warp maturation (3.7)

```
You are task-9 of Phase 3, Bit-Physics portfolio. Sequential.

ROLE: common-warp maturation. Sub-phase 3.7. Broader than rule-of-
three alone per spec §11.4 "common-warp matures":
  (a) Rule-of-three promotion pass (primary).
  (b) Documentation polish: docs/common/warp.md complete + consistent.
  (c) Test coverage check: gaps in common-warp's own tests.
  (d) Public API stabilization: mark APIs as "stable" vs "experimental".

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post tasks 1–8 merged).
YOUR BRANCH: phase-3/task-9-common-warp-maturation.

Stack E consumers of common-warp at your dispatch time:
- Phase 2 MPM-Warp (hybrid-pg/mpm-multimaterial/python-warp/)
- Phase 2 Smoke-Warp (location probe-discovered)
- task-4: rigid-body-pedagogical (rigid-body/articulated-pedagogical/)
- task-7: pinn-poisson (learned-dynamics/pinn-poisson/)
- task-8: 3dgs-mpm (neural-rendered/3dgs-mpm/)

≥5 consumers. Convention 7.10: 3+ consumers → STRONG promotion candidate.

Zero STRONG candidates is a LEGITIMATE outcome. If so, focus on (b),
(c), (d). Phase 3 still closes.

CONTEXT BRIDGE per §3.5:
- Read progress.md fully (all prior tasks).
- Tasks 4, 7, 8 are your common-warp consumers. Read their entries
  carefully for any patterns they noted in their work.
- Read tasks 4, 7, 8 full reports at docs/_audits/phase-3/ for
  detailed common-warp usage.
- For Phase 2 consumers (MPM-Warp, Smoke-Warp): view source directly.

INTERFACES YOU CONSUME: all five Stack E consumer sites.

INTERFACES YOU PRODUCE:
- common/common-warp/ extractions (if STRONG candidates) with tests.
- Consumer-site refactors (surgical edits).
- Updated docs/common/warp.md.
- API stability markers.

OUT OF SCOPE:
- Extractions into other common modules.
- MODERATE / LOCAL extractions.
- New features not rule-of-three-driven.
- Consumer behavior changes beyond refactor-to-consume.
- Newton scaffolding (Phase 4).
- Stack F deferral banking — task-10 owns per phase plan §2.6.
- PyTorch utilities promotion to common-py — locked §2.10 (surface as
  MODERATE if pattern emerges; do NOT promote).

ANCHOR-PROBE STEP per §5.3:

1. Clone, sub-branch, base-sha.
2. View:
   - common/common-warp/ current source.
   - docs/common/warp.md.
   - All five consumer sites' source.
   - common/common-warp/tests/.
3. File probe at tools/testkit/probes/reports/common-warp-maturation.md.
   Full inventory across (a)(b)(c)(d):
   - Candidate patterns; consumer-count per pattern; strength
     (STRONG ≥3 / MODERATE 2 / LOCAL 1).
   - PyTorch usage patterns across tasks 6 and 7 (per §2.10 deferral
     — MODERATE candidates; do NOT promote).
   - common-warp doc completeness gaps.
   - common-warp test coverage gaps.
   - APIs stable across consumers vs APIs in flux.

PATTERNS TO LOOK FOR (anchor sketches; probe verifies):
- Capture I/O glue around Warp arrays.
- USD export for Stack E scene serialization.
- Determinism control (wp.config.deterministic-style).
- Warp kernel preambles (init, shape validation).
- ImGui integration for Warp-driven sims.
- Hash-grid / neighbor-search utilities.
- Render-loop boilerplate.
- Capture-write throttling.
- CLI flag parsing pattern (§3.2.6 conventions).

CLASSIFICATION:
- 3+ consumers → STRONG → extract.
- 2 consumers → MODERATE → document for Phase 4. No extraction.
- 1 consumer → LOCAL → no action.

DELIVERABLES:

**v9 addendum (inlined per §6.0; infrastructure-task discipline per §6.0 items 12 + 13):**
- **Mutation-testing for any extracted common-warp code (§6.0 item 12; spec § 2.13):** every STRONG candidate that gets extracted into common-warp is subjected to mutation testing. Threshold: no regression below the Phase 2 common-warp baseline (`tools/testkit/mutation/phase-2-<UTC>.json`). New extractions establish their own per-extraction baseline. `bash tools/testkit/mutation/run-mutation.sh --target common/common-warp/<new-submodule>/`. Baseline JSON at `tools/testkit/mutation/phase-3-task-9-<UTC>.json`.
- **Smoke contracts on existing common-warp (§6.0 item 13; spec § 2.11):** task-9 also covers `(c) test coverage`. The deliverable D smoke-tests every public API; v9 makes this normative. Any public API without a smoke test is a HARD_FAIL deliverable.
- **Consumer-site refactor preserves failing-tests output hashes:** if task-9 refactors consumer code in any Phase 3 sim (tasks 3, 3a, 4, 5, 6, 7, 8), the refactor commits must NOT alter the test-suite contents in ways that would change the failing-tests output sha256 recorded in the original failing-tests commit. If a refactor genuinely changes test surface, the sim's spec sheet § 6 is amended in a separate commit and the rationale is documented; task-10 spot-check will verify hashes still match.
- **Tolerance.toml entries (if any) within budget:** if task-9 extraction introduces new tolerance entries (unlikely but possible for any new equivalence-harness extensions), they must be within tolerance-budget.toml caps.
- **Evidence-hashes in audit (§6.0 item 5):** report includes sha256 for the mutation-score JSON.
- **Append-only check (§6.0 item 3):** any new common-warp documentation appends; does NOT edit prior-phase docs/common/warp.md content.

A. tools/testkit/probes/reports/common-warp-maturation.md — full
   inventory across (a)(b)(c)(d).
B. Per STRONG candidate (may be zero):
   - Implementation in common/common-warp/ with tests.
   - Consumer-site refactor (surgical edits; no redesign).
   - docs/common/warp.md update.
C. Documentation polish (b):
   - docs/common/warp.md complete + consistent with public API.
   - Each public API: signature + brief desc + example usage.
   - Stability markers per (d).
D. Test coverage (c):
   - Inventory tests for each public API.
   - Add tests for uncovered APIs (best-effort; if extensive, document
     in §10 as Phase 4 follow-up).
E. API stabilization (d):
   - APIs used by 3+ consumers without signature drift → "stable".
   - APIs used by <3 or with recent signature changes → "experimental".
   - Markers as docstring tags + reflected in docs/common/warp.md.
F. All consumer tests pass post-refactor. NO regressions.
G. Shared-file updates:
   - CHANGELOG.md (common-warp maturation entry).
   - `docs/architecture.md` Appendix G (only if new convention banks; likely none).
H. progress.md entry.
I. Report at docs/_audits/phase-3/task-9-common-warp-maturation.md.
   §1 covers all four maturation dimensions; §3 documents consumer-
   site refactors; §10 lists Phase-4-deferred maturation.

CROSS-DIRECTORY REACH PRE-AUTHORIZED for this task because extractions
inherently touch consumers — exception applies ONLY to task-9.

MERGE PROTOCOL per §4.3.

DISCIPLINES per §5.3:
- Convention #8 — re-grep consumer sites; reports are starting hints,
  source is truth.
- Convention G — refactors safe at every site. Run FULL test suite of
  every consumer sim you refactor.
- Convention M — re-anchor before edit.
- Convention A — one commit per STRONG extraction; consumer refactors
  follow.
- If extraction proves harder than expected (signatures subtly differ):
  surface as MODERATE and defer. Do NOT invent a new common API.
- §0.3.

REPORT per §5.1.

START: clone, sub-branch off post-task-8 phase-3-integration, read
progress.md fully, probe.
```

### 6.10 task-10 — landing

```
You are task-10 — Phase 3 landing task, Bit-Physics portfolio.
Sequential. The final task of Phase 3.

ROLE: File closing audit; run final local strict-mode gates; bank
Stack F deferral; SHA back-fill; verify rebase-readiness against
main. Leave phase-3-integration merge-ready for owner's final merge
to main.

REPO: git@github.com:StevenFAU/Bit-Physics.git
BASE BRANCH: phase-3-integration (post tasks 1–9 merged).
YOUR BRANCH: phase-3/task-10-landing.

YOU DO NOT push to main. You leave phase-3-integration merge-ready.
Owner does the final phase-3-integration → main merge.

CONTEXT BRIDGE per §3.5:
- Read docs/_audits/phase-3/progress.md fully. Nine prior entries.
- Read each prior task's report at docs/_audits/phase-3/. You read
  the reports DIRECTLY from the repo — the coordinator does NOT
  paste them inline.
- Read git log on phase-3-integration since Phase 3 start.

ANCHOR-PROBE STEP (Convention C/D + 7.9 closing anchor re-check):

1. Clone, checkout phase-3-integration, record base-sha (current
   HEAD), create sub-branch phase-3/task-10-landing.
2. View integration-branch state. Confirm:
   - All nine prior task PRs merged (grep git log).
   - Each task's claimed deliverables present at the paths reports
     declare.
   - tools/integrity/ Cat 1–5 wired and runnable.
3. Read every prior task report's §11 (drift) and §10 (deferrals).
4. Read every prior task's progress.md entry.

DELIVERABLES (no separate report; landing-<UTC>.md IS your report):

A. docs/_audits/phase-3/landing-<UTC>.md per §5.1 standard format. (Naming-convention note: pre-v9, Phase 3 used `closing.md` without UTC suffix. Per v9 standardization, Phase 3 now matches Phase 0/1/2/4/5's `landing-<UTC>.md` pattern. Phase 4's replay command cites this filename; the `<UTC>` resolves at landing time.) Includes:
   * Front-matter per spec § 7.5 + Appendix G.7: date=today (ISO), author=task-10, subject=Phase 3
     closing, verdict-state per sub-phase, `evidence_paths:` (every prior task report + every failing-tests-evidence file), `evidence_hashes:` (sha256 per non-trivial evidence), `head_sha_at_audit_time` populated.
   * status: closed-green | closed-with-shifted-N | closed-with-
     blockers-N per §2.15.
   * Per-sub-phase status table (3.1–3.8 + 3.x with verdict).
   * Per-task gate-summary table (aggregate from each task's report §2).
   * Aggregated open questions / spec amendments from each task §9,
     classified trivial vs substantive (per §5.1).
   * Aggregated Phase-4 deferrals from each task §10 — this is the
     Phase 4 planning kickoff list.
   * Conventions banked: list (likely none).
   * Quality-floor flags: sims below §2.12 with measured values.

B. docs/_audits/phase-3/stack-f-revisit.md per §2.6: "Decision:
   defer. Reasons: no Phase 3 sim has a story Stack F serves better
   than Stack B/C split. Re-revisit at Phase 4 boundary."

C. docs/_audits/phase-3/spec-amendments-proposed.md if any task §9
   surfaced SUBSTANTIVE amendments. One section per proposal.
   Trivial amendments already folded into the relevant files; this
   file is for substantives only. DO NOT modify docs/architecture.md.

D. progress.md final entry: phase-closed marker, pointers to
   closing.md and spec-amendments-proposed.md.

E. After closing.md ships: SHA back-fill via SEPARATE follow-up
   commit per Convention #12 (NEVER git --amend). File
   docs/_audits/phase-3/sha-back-fill.md logging which audits got
   which SHAs.

COMMIT CHAIN:

COMMIT 1 — Closing audit:
- Title: "phase-3: closing audit and deferral banking"
- Files: closing.md, stack-f-revisit.md, spec-amendments-proposed.md
  (if any), progress.md final entry.

COMMIT 2 — SHA back-fill (Convention #12, SEPARATE commit):
- Title: "phase-3: SHA back-fill per Convention #12"
- File: sha-back-fill.md.

GATE RUN (verification only; before committing closing):
- `ruff check --strict` across repo.
- `mypy --strict` per Python package.
- `pytest -W error` per sim's tests/.
- Per-stack test targets directly per §2.14.
- Determinism harness against every sim per registry.toml.
- Equivalence harness for task-6 NCA D↔B (render-similarity).
- Render-similarity gate for task-8 3dgs-mpm goldens.
- Integrity Cat 1–5 across repo.
- **Cat-X tolerance-budget (v9 amendment):** every per-sim tolerance.toml override is within `tolerance-budget.toml` cap. HARD_FAIL on over-budget.
- **Evidence-path verification (v9 amendment):** `for r in docs/_audits/phase-3/*-report.md docs/_audits/phase-3/*.md; do python -m integrity.scripts.verify_evidence --audit "$r" --strict || exit 1; done`. Failure → REFUTED, blocker.
- **Append-only audit check (v9 amendment):** against `v0.2.0-phase-2` tag; no Phase-0/1/2 audit may be edited or shortened during Phase 3. Failure → REFUTED, blocker.
- **Failing-tests replay spot-check (v9 amendment):** randomly pick 2 of the 7 sim tasks (tasks 3, 3a, 4, 5, 6, 7, 8); for each, check out the failing-tests commit, run pytest, compute sha256 of output, compare to the hash in the commit footer. Mismatch → REFUTED, blocker.
- **Mutation-testing threshold gate (v9 amendment):** `bash tools/testkit/mutation/run-mutation.sh --gate --baseline tools/testkit/mutation/phase-2-<UTC>.json`. Per-target thresholds per spec § 2.13. Regression → HARD_FAIL, blocker. New JSON committed at `tools/testkit/mutation/phase-3-<UTC>.json`.
- **Perf-ledger review (v9 amendment):** read `docs/perf-ledger.md`; flag any new row > 2× slower than its Phase 1/2 baseline. Informational; surface in closing.md "Performance observations" section.

Any failure: file blocker in closing.md, DO NOT push, pause for
owner. Status becomes closed-with-blockers-N.

REBASE READINESS CHECK:
- Per v8 trunk-based amendment: there is no `phase-3-integration` branch. Work has been on `main` throughout. This check is reduced to: confirm `main` is in expected state (HEAD commit is task-10's final commit prior to tag push, all CI green).

CLOSING ANCHOR RE-CHECK (Convention 7.9):
Before committing closing.md, re-grep every file:line citation in
the nine prior reports + closing.md + stack-f-revisit.md +
spec-amendments-proposed.md (if exists). Confirm each anchor
resolves at HEAD. Stale caught NOW.

PHASE-TAG PROTOCOL (v9 amendment, per spec § 7.12 operator-only tag pushing):

Per v8 trunk-based amendment, the MERGE PROTOCOL is superseded — work goes directly to `main`. Per v9 amendment, the tag is pushed by the operator, not the agent.

The agent's closing.md ends with:

```
Proposed tag: v0.3.0-phase-3
Tag commit SHA: <Commit 2 SHA, or Commit 1 SHA if no back-fill>
Tag pushed: NO (operator action required)
```

The agent does NOT run `git tag` or `git push origin <tag>`. The operator reads closing.md, runs `verify_evidence.py` independently, runs `replay_prior_phase.py --prior-phase phase-3` from a Phase 4 perspective as a pre-check, and pushes:

```
git tag -s v0.3.0-phase-3 <sha>
git push origin v0.3.0-phase-3
```

DISCIPLINES per §5.3:
- Convention #8 — integrator, not implementer. Malformed report or
  missing deliverable → surface in closing.md as blocker; do NOT
  invent fix.
- Convention M — re-anchor before each edit.
- Convention 7.9 — anchor re-check before closing commits.
- Convention #12 — SHA back-fill is Commit 2, never amend.
- §0.3.
- Hard Rule 2 — gate-green claim that visibly doesn't match HEAD:
  pause, file blocker.
- **Operator-only tag pushing (spec § 7.12 + v9):** Agent never runs `git tag` or `git push origin <tag>`.

REPORT — docs/_audits/phase-3/landing-<UTC>.md (this IS your report).
Status flags per §2.15.

START: clone, sub-branch off phase-3-integration HEAD, read
progress.md fully, read all nine task reports, anchor-probe.
```

---

## 7. Audit-trail expectations

Per spec §7.5:

- All reports under `docs/_audits/phase-3/`.
- Append-only. Corrections are new reports referencing prior.
- Front-matter per §5.1 standard.
- Four-state verdicts (CONFIRMED / SHIFTED / REFUTED / DEFERRED).
- FACT/INFERENCE tagging on every concrete claim.

### 7.1 Reports expected at phase end

- `progress.md` — owner-created at preflight; appended by each task; closed by task-10.
- `task-1-common-3dgs.md`
- `task-2-render-similarity.md`
- `task-3-lenia.md`
- `task-4-rigid-body-pedagogical.md`
- `task-5-mass-spring-cloth.md`
- `task-6-neural-ca.md`
- `task-7-pinn-poisson.md`
- `task-8-3dgs-mpm.md`
- `task-9-common-warp-maturation.md`
- `closing.md` (doubles as task-10 report)
- `stack-f-revisit.md`
- `spec-amendments-proposed.md` (if substantive amendments surfaced)
- `sha-back-fill.md`

### 7.2 Convention banking watchlist

Per Convention 7.10 rule-of-three: new convention banks at 3+ occurrences. Phase 3 may surface candidates; most ripen Phase 4+.

---

## 8. Coordinator chat prompt

> **Paste this entire block into a new claude.ai chat.**

```
You are the Phase 3 coordinator for the Bit-Physics portfolio.
Sequential single-task execution model.

Your job is narrow: dispatch task prompts one at a time, in order;
wait for owner-merge confirmations; track progress.

Repo: git@github.com:StevenFAU/Bit-Physics.git
Owner / human-in-loop: Steven Cohen
Base branch: phase-3-integration (owner set up at preflight)
Plan: docs/phases/phase-3-plan.md (source of truth)
Merge model: PR-based per plan §4.3 — tasks push branches and open
PRs; owner reviews and merges via GitHub UI.

EXECUTION MODEL: SEQUENTIAL. One Claude Code session at a time, in
task order (task-1 → task-2 → ... → task-10). NO parallelism.

YOU DO NOT:
- Write code (Claude Code tasks do).
- Run probes (each task does its own).
- Validate task work (task-10 + CI do).
- Carry task reports between tasks (reports live in repo; tasks read
  what they need from docs/_audits/phase-3/).
- Merge anything (owner does, via GitHub UI).
- Make decisions (locked in plan §2).
- Edit any repo file.

YOU DO:
- Read docs/phases/phase-3-plan.md in full at session start.
- Confirm owner attestation that preflight (plan §9) is complete.
- Hand owner each task prompt from plan §6 in order. Verbatim.
- Acknowledge each task report as owner pastes the PR link.
- Wait for owner: "task-N merged at SHA <X>; PR link: <URL>" before
  dispatching task-(N+1).
- Apply escalation criteria below.

Sequence (in order, one at a time):

  task-1 (§6.1) — common-3dgs
  task-2 (§6.2) — render-similarity
  task-3 (§6.3) — lenia
  task-4 (§6.4) — rigid-body-pedagogical
  task-5 (§6.5) — mass-spring-cloth
  task-6 (§6.6) — neural-ca
  task-7 (§6.7) — pinn-poisson
  task-8 (§6.8) — 3dgs-mpm
  task-9 (§6.9) — common-warp-maturation
  task-10 (§6.10) — landing

For task-10: no special assembly. task-10's prompt instructs the
landing agent to read docs/_audits/phase-3/ directly from the repo.

Phase 3 done when:
- task-10's closing.md status is closed-green | closed-with-shifted-N
  | closed-with-blockers-N.
- Owner has merged task-10's PR.

Explicit escalation criteria — surface to owner IMMEDIATELY:

A. Any task's report status=BLOCKED.
B. SHIFTED finding in §1 that affects subsequent tasks (e.g.,
   common-warp API drift affecting tasks 4, 7, 8).
C. Spec-amendment proposals tagged "substantive" in §9.
D. Render-similarity below plan §2.12 floors in task-6 or task-8
   §6 (PSNR<28, SSIM<0.85, LPIPS>0.15).
E. Task reports it couldn't push/open PR (CI infra failure).
F. task-8 deferred SH-update stretch (note in §10 per §2.13). Not
   a blocker; owner should know.
G. task-9 finds zero STRONG candidates AND no work in (b)(c)(d).
   Phase 3 still closes; surface so owner knows.
H. task-10 reports closed-with-blockers-N or rebase-conflicts-pending.
I. CI fails on any PR; owner decides re-push vs override vs escalate.
J. Task estimates significantly longer than expected (>2× initial
   estimate); surface so owner can decide pause/proceed.

When escalating: post the specific report excerpt to owner. Pause
dispatch until owner decides proceed / re-dispatch / re-scope.

Do not editorialize. Do not summarize away detail.

Your first action: confirm you have read docs/phases/phase-3-plan.md in
full. Then prompt owner to confirm preflight (plan §9) is complete
AND that they understand the runbook (plan §9.5). After owner
confirms, dispatch task-1.
```

---

## 9. Owner preflight + runbook

### 9.1 Phase 2 closure

- [ ] `docs/_audits/phase-2/closing.md` exists.
- [ ] Phase 2 closing status is `closed-green` or owner-accepted variant.
- [ ] All Phase 2 sub-items per spec §11.3 are CONFIRMED (or owner explicitly accepted SHIFTED).

If Phase 2 didn't close clean: do not spawn the Phase 3 coordinator. Either close Phase 2 first or re-scope Phase 3 (requires this plan revised).

### 9.2 Branch setup + protection

- [ ] `phase-3-integration` branch created off `main` at known SHA.
- [ ] Branch protection on `phase-3-integration`: require PR for merge; require CI green; no direct push; require status checks for `build-py`, `build-cpp`, `build-ts`, `integrity` pipelines.
- [ ] Branch protection on `main`: only protected-source merges; admin approval.

### 9.3 CI infrastructure

- [ ] Workflows `.github/workflows/build-py.yml`, `build-cpp.yml`, `build-ts.yml`, `integrity.yml` exist and run on push to `phase-3-integration` AND on PRs.
- [ ] Strict-mode defaults active (spec §9.3 Convention 7.7).
- [ ] CI runners available; no quota concerns for the wall-clock.

### 9.4 Testkit + progress file

- [ ] `tools/testkit/probes/template.md` exists per spec §11.1 item 0.7.
- [ ] `tools/testkit/equivalence/` baseline harness exists.
- [ ] `tools/testkit/determinism/registry.toml` (or equivalent) exists.
- [ ] **Owner creates** `docs/_audits/phase-3/progress.md` with a header and empty body (each task appends its entry). Sample header:

```markdown
# Phase 3 progress log

Append-only. Each task appends its entry on completion per phase plan §3.5 schema.

---
```

### 9.5 Owner runbook — sequential execution

**Pre-execution (one-time):**

1. Verify §9.1–9.4 checklist items.
2. Open a NEW claude.ai chat. This is your **coordinator chat**.
3. Paste the §8 coordinator prompt into the coordinator chat.
4. Coordinator confirms it has read the plan. Tell it: "Preflight done. Dispatch task-1."

**For each of the ten tasks (task-1 through task-10):**

5. Coordinator hands you the task-N prompt (from §6.N).
6. Open ONE Claude Code session. Paste the task prompt. Agent clones repo (if needed), creates its sub-branch, reads `progress.md`, does its work.
7. Agent finishes: pushes branch, opens PR via `gh pr create`, files report. PR appears in GitHub.
8. **Review the PR:**
   - Read the agent report (`docs/_audits/phase-3/task-N-<short-name>.md`).
   - Read the agent's `progress.md` entry (it's part of the PR diff).
   - Check the PR description summary.
   - Run `gh pr checks <PR-num>` for CI status.
   - Skim the diff. Spot-check that deliverables are present.
9. If satisfied: merge via GitHub UI. Note the merge SHA.
10. If not satisfied: post review feedback on PR. Owner-decide: re-dispatch a new Claude Code session with feedback (it will continue the branch), or mark the task as BLOCKED and consider re-scope.
11. Once merged: tell coordinator "task-N merged at SHA <X>; PR link: <URL>".
12. Coordinator dispatches task-(N+1).

**Special notes per task:**

- **task-1 + task-2:** No prior dependencies; these are infrastructure setup.
- **task-3:** First sim; if testkit pipeline has friction, this is where you'll see it. Don't be afraid to pause and fix infra before continuing.
- **task-6:** Stack B test infra may not exist. If task-6 reports BLOCKED on Stack B test infra absence, decision: spin up a Stack B test infra side-task (out of this Phase 3 plan; owner-led) OR re-scope task-6 to "Stack D PyTorch training only, Stack B inference deferred to Phase 4."
- **task-7:** Warp/PyTorch interop may break. If task-7 reports BLOCKED, debug interop on a side-branch before re-dispatching.
- **task-8:** Hardest. Likely to take longest. SH-update stretch may defer. Read report §10 carefully.
- **task-9:** May find zero STRONG candidates. Legitimate.
- **task-10:** Reads everything from repo. No coordinator assembly.

**Post-Phase-3 (one-time):**

13. Verify GitHub Actions CI green on phase-3-integration (latest push, after task-10 PR merged).
14. Pull `phase-3-integration` locally. Sanity-check if desired.
15. Merge `phase-3-integration` → `main` via GitHub UI (admin approval per branch protection).
16. Review aggregated `spec-amendments-proposed.md`. Owner-decide each substantive amendment: apply to `docs/architecture.md` as separate commit, defer to Phase 4, or reject.
17. Tag the main commit: `git tag phase-3-complete && git push --tags`.
18. **Phase 4 kickoff:** the aggregated Phase-4 deferrals from closing.md's "Aggregated Phase-4 deferrals" section IS the starting point for Phase 4 planning. Read closing.md as the first artifact when drafting Phase 4 plan. Plan §3.2 contracts (CLI conventions, spec sheet schema, tolerance schema, tier-3 interface) carry into Phase 4 sims.
19. Phase 3 done.

**Owner time estimate (sequential):**
- Preflight: ~1–2 hours.
- Per-PR review: ~30–60 min × 10 PRs = ~5–10 hours.
- Final merge + spec amendments + tag + Phase 4 kickoff prep: ~2–3 hours.
- **Total: ~8–15 hours across the 12–18 week wall-clock.**

Comparable to v6's parallel estimate (~7–14 hours) — the per-task review work is similar; the difference is wall-clock spread.

### 9.6 Spec freeze posture

- [ ] `docs/architecture.md` not actively amended by parallel work during Phase 3.
- [ ] Spec amendments route via `spec-amendments-proposed.md` at Phase 3 close.

### 9.7 Owner availability

- [ ] Owner available for wall-clock duration (12–18 weeks) to review PRs and handle escalations per coordinator §8 criteria A–J.

---

## End of Phase 3 plan v7

Source of truth for the Phase 3 coordinator chat. Sequential
execution model defensible against industry standards per §4.0
deviation rationale. Two-half structure:
- **§3 Architecture** defines interface contracts so each task knows
  its inputs and outputs.
- **§4–§9 Coordination** defines the linear flow through tasks,
  branches, PRs, recovery, runbook.

Not modified during execution. Execution discoveries file as audit
reports under `docs/_audits/phase-3/`; material spec changes route
via task-10's `spec-amendments-proposed.md` to the owner for explicit
revision of `docs/architecture.md` after Phase 3 closes.

— end —

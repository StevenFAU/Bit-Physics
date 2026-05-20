---
date: 2026-05-20T18-52-10Z
author: continuous-ca-rd3d-sub-phase-agent
artifact: stage-0-blocked-replay
artifact_id: sub-phase-continuous-ca-rd3d-stage-0-blocked-replay
stage: 0-preflight
subject: "Stage 0 BLOCKED on Task 0.0 (cross-phase audit replay) — HEAD-tool / prior-phase-content version-skew on Cat 3 _SUBDIRS_PICKED_UP"
verdict-state: BLOCKED
blocker: cross-phase-audit-replay (Stage 0 Task 0.0) integrity gate
head_sha: 90449f45ee5fc3b2b00e1aaa1eec6c10e415c5f4
head_sha_at_checkpoint: 90449f45ee5fc3b2b00e1aaa1eec6c10e415c5f4
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
prior_phase_tag: v0.1.0-phase-1
prior_phase_tag_sha: 9998bc1897e8b70e28eab496977f6e82edd7485a
evidence_paths:
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-replay-2026-05-20T18-52-10Z.txt
  - docs/phases/sub-phase-continuous-ca-rd3d.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - tools/integrity/integrity/scripts/replay_prior_phase.py
  - tools/integrity/integrity/cat3_numerical/golden_values.py
evidence_hashes:
  docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-replay-2026-05-20T18-52-10Z.txt: sha256:a1477be940d741c4258dce7eb94feeec3350b07e4045908fa46bf367441df496
gates_failed:
  - integrity (HEAD-tool / prior-phase-content version-skew — see § 3)
gates_passed:
  - pytest
  - equivalence
  - determinism
  - perf-ledger
  - property
  - mutation
  - tolerance-budget
phase1_substance_assessment: HEALTHY (per § 3 below — the integrity failure is a known structural artifact of HEAD's Cat 3 _SUBDIRS_PICKED_UP extension landing AFTER v0.1.0-phase-1 was tagged; no Phase 1 / sub-phase regression observed)
---

# Stage 0 — BLOCKED on Task 0.0 (cross-phase audit replay)

## 1. Summary

(FACT — Task 0.0 invocation per `docs/phases/sub-phase-continuous-ca-rd3d.md` § 4.1 / § 7.1 — verbatim form below.)

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

(FACT — `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-replay-2026-05-20T18-52-10Z.txt`
sha256:`a1477be940d741c4258dce7eb94feeec3350b07e4045908fa46bf367441df496`.)

```
  FAIL  gate=integrity audit_verdict=None
  PASS  gate=pytest audit_verdict=None
  PASS  gate=equivalence audit_verdict=None
  PASS  gate=determinism audit_verdict=None
  PASS  gate=perf-ledger audit_verdict=None
  PASS  gate=property audit_verdict=None
  PASS  gate=mutation audit_verdict=None
  PASS  gate=tolerance-budget audit_verdict=None
summary: prior_phase=v0.1.0-phase-1 ok=False
```

Exit code 1. Per `docs/phases/sub-phase-continuous-ca-rd3d.md` § 4.1 Task 0.0 closing instruction + Phase 1 playbook P20 (`docs/phases/phase-1-plan.md` lines 1861–1865): **BLOCKED**. Do NOT proceed to Task 0.1. Surface to operator.

## 2. Failure-mode diagnosis

The integrity gate's invocation is `[sys.executable, "-m", "integrity", "--all", "--mode", "strict"]` per `tools/integrity/integrity/scripts/replay_prior_phase.py:54`. The script materializes a worktree at the resolved tag (`v0.1.0-phase-1` per `_resolve_phase_handle`) and `cd`s into it, but `sys.executable` resolves to the OUTER repository's interpreter and `-m integrity` imports the OUTER repository's integrity package (since the outer `.venv` editable-installs `integrity`). The integrity tool is therefore HEAD-version-of-code running against v0.1.0-phase-1-content-of-tables.

Reproduced manually (FACT — `git worktree add --detach /tmp/bp-replay-debug-v010 v0.1.0-phase-1` + `/home/otacon/Projects/Bit-Physics/.venv/bin/python -m integrity --all --mode strict`; worktree removed post-debug):

```
[HARD_FAIL] cat3.golden-values tools/testkit/golden/tables/agent-based/boids-3agent-step1.json — only 1 independent_reference anchors; spec § 2.4 requires ≥ 3
[HARD_FAIL] cat3.golden-values tools/testkit/golden/tables/agent-based/physarum-deposit-step1.json — only 1 independent_reference anchors; spec § 2.4 requires ≥ 3
[AUDIT_LOG] cat3.golden-values … agent-based/boids-3agent-step1.json — no Python evaluator registered for algorithm 'boids-reynolds-1987-3agent-step1'; skipping numeric verification
[AUDIT_LOG] cat3.golden-values … agent-based/physarum-deposit-step1.json — no Python evaluator registered for algorithm 'physarum-jones-2010-4agent-deposit-step1'; skipping numeric verification
[AUDIT_LOG] cat3.golden-values … closed-form/lorenz-structural.json — no Python evaluator registered …
[AUDIT_LOG] cat3.golden-values … closed-form/mandelbulb-de-samples.json — no Python evaluator registered …
[SOFT_WARN] cat5.audit-links (×12 inherited)
summary: 2 HARD_FAIL, 12 SOFT_WARN
```

Two HARD_FAILs, both on Cat 3 anchor-count.

## 3. Substance assessment — Phase 1 + sub-phase chain remains HEALTHY

The HARD_FAILs are NOT a Phase 1 regression and are NOT a closed-form / agent-based sub-phase regression. They are a structural artifact of how `replay_prior_phase.py` runs the gates:

1. **At v0.1.0-phase-1 (tagged at SHA `9998bc1`)** — `tools/integrity/integrity/cat3_numerical/golden_values.py::_SUBDIRS_PICKED_UP = (Path("closed-form"),)`. Cat 3 recurses only into `closed-form/`. The agent-based goldens (`boids-3agent-step1.json`, `physarum-deposit-step1.json`) exist at v0.1.0-phase-1 but are NOT recursed; their 1-anchor structure does not surface.
2. **At HEAD (`90449f4`)** — `_SUBDIRS_PICKED_UP = (Path("closed-form"), Path("agent-based"))` per agent-based Stage 2 commit `d156792`. Cat 3 now recurses into `agent-based/` too.
3. **In parallel at agent-based Stage 2 commit `3ce7809`** — the agent-based goldens were lifted from 1 anchor (single `independent_reference.source` block packing three citations) to 3 anchors (three discrete `test_points`, each with its own `independent_reference`). At HEAD, Cat 3 + agent-based goldens = PASS.
4. **In the replay** — HEAD-of-integrity-tool + v0.1.0-phase-1-content-of-agent-based-goldens = FAIL, because the v0.1.0-phase-1 tables still have the 1-anchor structure (the lift happened post-tag in the sub-phase chain).

The agent-based landing audit § 8.2 N4 explicitly predicted this failure mode when documenting the choice to land Decision A (lift + pickup) rather than Decision B (further bank). The audit-time observation was: "Picking up agent-based / hybrid-pg / lattice / particle-fluids would currently HARD_FAIL on the anchor-count" — this referred to the HEAD content at THAT time, but the implication for cross-phase replay was not surfaced. The sub-phase audit chain's correctness at HEAD is intact; the cross-phase replay tool's design just happens to be incompatible with the post-Stage-2 `_SUBDIRS_PICKED_UP` extension because it imports HEAD's integrity, not the worktree's.

**Pytest / equivalence / determinism / perf-ledger / property / mutation / tolerance-budget all PASS** — the substantive Phase 1 + sub-phase chain remains GREEN under the replay.

## 4. Banked operator-routable remediation paths

Per Phase 1 playbook P20: "Do NOT proceed to Task 1.1. … operator decides whether to repair Phase 0 or revise the plan." Applied to this sub-phase: do not proceed to Task 0.1; operator decides among the following options. Default lean is **(c)** — accept-as-expected via a Stage-0-charter amendment for THIS sub-phase, with the harness fix queued as a separate hotfix sub-phase.

- **(a) Repair the replay tool — version-pin integrity to the worktree** (preferred long-term). Edit `tools/integrity/integrity/scripts/replay_prior_phase.py:54` so the integrity invocation uses the worktree's local copy of the integrity module rather than the outer one. Two viable shapes:
  - Add the worktree to `PYTHONPATH` and use `sys.executable` (still outer interpreter) so `-m integrity` resolves to the worktree's source. Verify against the closed-form sub-phase's Stage 0 replay output sha256 to confirm byte-equivalence with the now-broken HEAD invocation pre-`d156792`.
  - Use the worktree's `.venv/bin/python` after the `uv sync --frozen --all-packages --all-extras` step (already wired at `_checkout_worktree`). This requires the worktree's `.venv` to ship integrity; verify the worktree builds the integrity package on sync.
  Either form is a hotfix sub-phase — Convention A additive on `replay_prior_phase.py` plus a regression test under `tools/integrity/tests/`.
- **(b) Make Cat 3 `_SUBDIRS_PICKED_UP` recursion lazy** — only recurse into a subdir if every table within satisfies the anchor-count contract (i.e., skip-with-AUDIT_LOG rather than HARD_FAIL when a subdir is recursed-but-undersized). This preserves the pickup intent but tolerates version skew across replay boundaries. Edit at `tools/integrity/integrity/cat3_numerical/golden_values.py`. Also a hotfix sub-phase; broader semantic change to Cat 3.
- **(c) Accept-as-expected: amend this sub-phase's Stage 0 charter** to declare the integrity-gate-failure-under-replay a known structural artifact and skip-with-attestation. Concretely: § 7.1 Stage 0 prompt is amended (Convention-A-additive paragraph) to accept exit-1 from replay IF AND ONLY IF the failure-mode matches this audit's documented mode (Cat 3 HARD_FAIL on agent-based goldens, all other 7 gates PASS), AND the replay output sha256 matches a verifiable shape. Sub-phase proceeds to Task 0.1. Hotfix queued separately. **Default lean.**
- **(d) Override via re-tag** — push a `v0.1.0-phase-1` to a different SHA that includes the agent-based goldens at 3-anchor structure. Forbidden by spec § 7.12 (phase-tag immutability); recorded only for completeness.
- **(e) Add a `--skip-gate` flag to replay_prior_phase.py** that lets Stage 0 pass `--skip-gate=integrity`. Hotfix sub-phase; narrower than (a) but introduces an asymmetry between the replay tool's documented behavior and its invocation form.

## 5. SHIFTED finding (cross-phase replay tool — surface for sub-phase plan amendment OR hotfix sub-phase dispatch)

**S(new) — `replay_prior_phase.py` integrity-gate invocation imports HEAD-of-integrity rather than worktree-of-integrity; the cross-phase replay therefore fails on the integrity gate any time `_SUBDIRS_PICKED_UP` is extended additively in a sub-phase Stage 2.** This is a structural defect of the cross-phase replay tool with respect to the sub-phase-chain's additive integrity-tooling discipline. The sub-phase-chain's additive discipline is correct; the replay tool's binding strategy is the broken side. The agent-based sub-phase's Decision A (Cat 3 anchor-count lift + pickup) — confirmed correct at HEAD — exposed the defect.

The defect was first PREDICTED at closed-form audit § 8.2 N4 ("Picking up agent-based … would currently HARD_FAIL …") and at agent-based audit § 8.2 N1 (which documented landing Decision A); the implication for cross-phase replay's HEAD-vs-tag tool-binding was not surfaced at either landing. This audit surfaces it now.

The same defect will recur with EVERY subsequent sub-phase Stage 0 replay until remediation path (a), (b), (c), or (e) above lands.

## 6. Stage 0 progression

Per playbook P20: HALTED. Task 0.0 BLOCKED. Tasks 0.1 (tolerance-budget carryover), 0.2 (Phase 1 RD-3D evidence sha256 reverify), 0.3 (RD-2D MMS regression-scope surfacing) NOT executed. No Stage 0 closing checkpoint authored.

The operator dispatches remediation in a separate session. After remediation lands, Stage 0 of this sub-phase resumes with a fresh `stage-0-replay-<UTC>.txt` capture from Task 0.0.

## 7. Out-of-scope surfacing — operator decision required

Tasks 0.2 (RD-3D evidence sha256 reverify) and 0.3 (RD-2D MMS regression-scope surfacing) are queued behind Task 0.0. Both run UNCHANGED once Task 0.0 unblocks. For Task 0.3 specifically: the operator has pre-routed Reading (b) per Item 2 (sub-phase dispatch); the surfacing in the eventual Stage 0 checkpoint records "out-of-scope per operator routing." That routing is unaffected by this BLOCKED state.

The B17 PATH-A LOAD-BEARING assignment (sub-phase § 4.3 Step 2.7) and the Cat 3 NO-OP decision for `continuous-ca` (sub-phase § 4.3 Step 2.3) are Stage-2 concerns and unaffected by this BLOCKED state.

## 8. Verdict

**BLOCKED.** Stage 0 cannot progress under the sub-phase plan's Task 0.0 contract. The 42 cumulative inherited shifts remain unmodified; S(new) above is queued for incorporation by the eventual unblocking commit.

Surface to operator with the four remediation paths in § 4. Default lean: (c) — accept-as-expected, amend this sub-phase's § 7.1 Stage 0 prompt additively, proceed to Task 0.1 in this session OR a follow-up.

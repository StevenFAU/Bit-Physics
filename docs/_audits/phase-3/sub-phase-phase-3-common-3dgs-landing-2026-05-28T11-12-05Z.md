---
date: 2026-05-28T11-12-05Z
author: phase-3 common-3dgs stage-2 landing (Claude Code)
subject: Phase 3 common-3dgs — sub-phase landing audit
verdict: closed-with-shifted-1
head_sha: e4011f2c0b58791f69f6bd9e6e9e12c5b062d650
prior_phase_tag: v0.2.1-sub-phase-lfs-architecture
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:    # mapping (path → sha256); NO ": self" sentinel
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md: sha256:68a77392604957d0cc7a8d2dd2c64621f4d5e08c2ef30272c8a75b43b92fe108
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md: sha256:39dd44f22d3d3ca16d28bc115d49eeb49392feb0b94991e7c46a6139a8b581d8
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md: sha256:09a23ffd45ba5cae2fb5b96a6b0e4747a0c51ad77c70ee7233d1b6955e46d6bc
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md: sha256:4d3381682dbe4d90464db6d86f9e80c0a5aa51a32103e9dd6b15b7ad0172a709
  docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md: sha256:87c21d4388735f147e4df38d8117c3341206849a19bba3d0d62ed63353abd059
  tools/testkit/lfs_migration/test_i7_no_agent_tags.py: sha256:a072a931eb29e57b54219978349650ccd10de5c346fe81e7566176362259c026
  tools/testkit/mutation/mutmut-config.toml: sha256:d60b28fee41f00b271f3b5326452d1f2f0f161600ba2947a8151d420e87d1a89
  tools/testkit/mutation/baseline-2026-05-28T03-23-44Z.json: sha256:12875fac01723c5dd8efe5226ef5604dbbbf5b62450b3babd79b2f05b34ae710
  tests/fixtures/legacy-captures/phase-3-common-3dgs.json: sha256:775b80a0ed383f5f7a821f3b010ccace60f380df14137bb114dc4d6c0d39fd76
  tests/fixtures/legacy-captures/phase-3-common-3dgs.h5: sha256:2087402de9ee2989e991468ec40452cfc3a27e4a68d15adc595a45e7c649f4a9
evidence_paths:     # list
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md
  - tools/testkit/lfs_migration/test_i7_no_agent_tags.py
  - tools/testkit/mutation/mutmut-config.toml
  - tools/testkit/mutation/baseline-2026-05-28T03-23-44Z.json
  - tests/fixtures/legacy-captures/phase-3-common-3dgs.json
  - tests/fixtures/legacy-captures/phase-3-common-3dgs.h5
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md
  - docs/_audits/phase-3/progress.md
stage_rollup:
  - stage-0: CONFIRMED (5 external SHAs pinned §2.18; replay --prior-phase phase-2 ok=True 8/8)
  - stage-1a: CONFIRMED (scaffold + RED 9 failed / 1 passed; sha256:f1f80a02…626c84c6)
  - stage-1b: CONFIRMED (10/10 GREEN; D-C bit-exact MEASURED max_abs_diff=0.0; thirteen gates PASS w/ §2.11 infra surrogates)
  - stage-1c: SHIFTED (mutation 0.7610; threshold 0.80 unchanged; +14.5 pp vs prior session)
  - stage-2: closed-with-shifted-1 (this audit)
banks_carried:
  - L-3DGS-1 — neural-rendered category mutation threshold may need calibration; revisit at task-8 dispatch with the 3DGS-MPM consumer providing additional pixel-exact rotation / SH coverage
  - SIBLING-FIXTURE-LFS — 12 legacy-capture fixtures under tests/fixtures/legacy-captures/ are plain git blobs (placeholders or raw binaries), not LFS pointers — pre-existing as of v0.1.0-phase-1 (PRE-LFS-migration); candidate sibling sub-phase legacy-capture-fixture-lfs-reconciliation
d_class_final:
  - D-A: task-1 first (sequencing decision exercised; Inria SHA gate cleared at Stage 0)
  - D-C: bit-exact / same-stack-same-hw (Stage-1b MEASURED + locked; no Stage-1c re-characterization)
  - D-D: common-3dgs save_png (matplotlib imsave; D-D resolved Stage 1a; the neural-rendered RGB-image writer)
  - D-E: YES — operator tag v0.2.2-sub-phase-phase-3-common-3dgs proposed (STEP E); I7 allowlist extended at c761aa9
---

# Phase 3 common-3dgs — sub-phase landing audit — closed-with-shifted-1

> **Verdict: closed-with-shifted-1** (phase-3-plan §2.15 graded closing variant).
> Sub-phase ``sub-phase-phase-3-common-3dgs`` consolidated: Stages 0 / 1a / 1b
> CONFIRMED; Stage 1c SHIFTED (mutation 0.7610 vs the 0.80 floor; threshold
> UNCHANGED per phase-3-plan §6.0 anti-pattern); Stage 2 (this audit) closes
> the sub-phase. **Intermediate tag PROPOSED** `v0.2.2-sub-phase-phase-3-common-3dgs`
> at HEAD ``c761aa9`` — **operator-pushed only** (I7; agent does NOT tag).
> Two banks carried forward (L-3DGS-1 + SIBLING-FIXTURE-LFS). STOP-D / STOP-H /
> STOP-LFS / STOP-A2 / STOP-REPLAY / STOP-I7 all NOT fired.

## § 0 — Stage-2 commit chain (FACT)

Trunk-based to `main`; pushed; no tag (I7). Parent `7d08d8f` (Stage-1c push-confirmation tip).

| Commit | Type | Content |
|---|---|---|
| `c761aa9` | test | I7 allowlist extended for `v0.2.2-sub-phase-phase-3-common-3dgs` (D-E ratification; guard mechanism unchanged; mutation-probe verified) |
| this audit | docs | sub-phase landing audit (this file) + `docs/_audits/phase-3/progress.md` Stage-2 entry |
| (optional) | chore | Convention #12 SHA back-fill if the audit's `head_sha` cites the audit commit |

## § 1 — Stage roll-up (S9-PHASE2-1: consolidate per-stage audits — DO NOT re-narrate)

Each stage's verdict is the FACT-source; this landing audit references via
``evidence_hashes`` and does not re-author the per-stage findings.

| Stage | Audit | Verdict | Headline FACT |
|---|---|---|---|
| Stage 0 | [`sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md`](sub-phase-phase-3-common-3dgs-stage-0-2026-05-28T00-59-06Z.md) | CONFIRMED | 5 external SHAs pinned in `phase-3-plan.md` §2.18 (Inria `54c035f7` NON-COMMERCIAL + PhysGaussian `8339ed6a` NO-LICENSE + Bender `d0894bdb` MIT + PhysicsNeMo `766e485a` Apache-2.0 v2.1.0 + Lenia `adfc5429` MIT); replay `--prior-phase phase-2` ok=True 8/8; integrity baseline byte-identical; I1–I7 hold |
| Stage 0 (BLOCKED predecessor) | [`sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md`](sub-phase-phase-3-common-3dgs-stage-0-BLOCKED-2026-05-28T00-35-30Z.md) | BLOCKED (STOP-B; superseded) | first Stage-0 attempt halted on the v9 pre-dispatch-review gate; operator ratified removing STOP-B; this audit stays append-only as the historical artifact |
| Stage 1a | [`sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md`](sub-phase-phase-3-common-3dgs-stage-1a-2026-05-28T01-35-19Z.md) | CONFIRMED | scaffold + vendored `references/3DGS-reference/` @ Inria SHA `54c035f7`; RED 9 failed / 1 passed; Failing-tests-output-hash `sha256:f1f80a0225567da81b73aca1d8ce84f3802b97b61c1c7fb6c9a081a7626c84c6`; D-C default-declared bit-exact / same-stack-same-hw; D-D resolved → common-3dgs `save_png` |
| Stage 1b | [`sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md`](sub-phase-phase-3-common-3dgs-stage-1b-2026-05-28T02-01-44Z.md) | CONFIRMED | §3.2.1 API implemented (10/10 GREEN); ruff + mypy --strict clean; D-C MEASURED bit-exact `max_abs_diff = 0.0`; thirteen gates PASS (gate-14 N/A single-stack; sim-specific gates under §2.11 infra surrogates); STOP-E cleared (task-8 consumption supported); one SHIFTED-DEFERRED — schema-corpus fixture LFS-routed under absent R2 creds (carry-in resolved at Stage 1c) |
| Stage 1c | [`sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md`](sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md) | SHIFTED | mutation score **0.7610** (691 killed / 217 survived / 50 suspicious / 958 total); 70–79% SHIFTED bracket; threshold **UNCHANGED at 0.80**; +14.5 pp vs prior session (0.6160 → 0.7610) via 26 new test functions across `test_render_sh.py` + `test_validation.py`; carry-in Stage-1b legacy-capture fixture consumed; banked **L-3DGS-1** |

## § 2 — STEP A: LFS fixture-anomaly diagnosis (look-before-you-tag)

**(FACT)** `git lfs fsck` at HEAD `7d08d8f` (Stage-2 anchor probe, pre-`c761aa9`):

```
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/mpm-multimaterial-ref.h5"        (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.h5"   (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/strange-attractors-ref.h5"     (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/reaction-diffusion-3d-ref.h5"  (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/boids-3d-ref.h5"               (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/eulerian-smoke-ref.h5"         (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/lattice-boltzmann-d3q19-ref.h5" (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/phase-0-rd-2d-ref.h5"          (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-d.h5" (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/mandelbulb-explorer-ref.h5"    (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/sph-water-ref.h5"              (treeish 7d08d8f4…)
pointer: unexpectedGitObject: "tests/fixtures/legacy-captures/physarum-ref.h5"               (treeish 7d08d8f4…)
```

**Count: 12** (Stage-1c surfaced this as "≥ 19" from a tail-only read; the canonical
count is 12 here — Stage-1c estimate is corrected by direct enumeration).

### § 2.1 — Object-type breakdown (FACT — `git cat-file -p HEAD:<path>`)

| Fixture | Size at HEAD | First-80-bytes | Object type |
|---|---|---|---|
| `mpm-multimaterial-ref.h5` | 90 B | `PHASE-1-STAGE-2 PLACEHOLDER — not an HDF5 file.\nSee sidecar mpm-multimaterial-…` | placeholder text |
| `eulerian-smoke-ref.h5` | 87 B | `PHASE-1-STAGE-2 PLACEHOLDER — not an HDF5 file.\nSee sidecar eulerian-smoke-ref…` | placeholder text |
| `boids-3d-ref.h5` | 118 B | `PHASE-1-STAGE-2 PLACEHOLDER — not an HDF5 file.\nSee sidecar boids-3d-ref.json` | placeholder text |
| `lattice-boltzmann-d3q19-ref.h5` | 96 B | `PHASE-1-STAGE-2 PLACEHOLDER…` | placeholder text |
| `mandelbulb-explorer-ref.h5` | 224 B | `PHASE-1-STAGE-2 PLACEHOLDER…` | placeholder text |
| `physarum-ref.h5` | 81 B | `PHASE-1-STAGE-2 PLACEHOLDER…` | placeholder text |
| `reaction-diffusion-3d-ref.h5` | 109 B | `PHASE-1-STAGE-2 PLACEHOLDER…` | placeholder text |
| `sph-water-ref.h5` | 97 B | `PHASE-1-STAGE-2 PLACEHOLDER…` | placeholder text |
| `strange-attractors-ref.h5` | 263 B | `PHASE-1-STAGE-2 PLACEHOLDER…` | placeholder text |
| `phase-0-rd-2d-ref.h5` | 2 940 664 B | (binary; HDF5 signature) | raw binary blob (not pointer; not placeholder) |
| `phase-2-reaction-diffusion-2d-stack-d.h5` | 2 940 664 B | (binary; HDF5 signature) | raw binary blob |
| `phase-2-sph-water-stack-d.h5` | 61 659 800 B | (binary; HDF5 signature) | raw binary blob |

`git lfs ls-files` does NOT list any of the 12 — they are NOT pointer-resolved by LFS.

### § 2.2 — Provenance (FACT — `git cat-file -p <tag>:<path>` across phase tags)

The same 12 fixtures, queried at each prior phase tag:

| Tag | Status |
|---|---|
| `v0.1.0-phase-1` | 12/12 NON-pointer (e.g. `mpm-multimaterial-ref.h5` already 90 B placeholder) — **CONFIRMED PRE-EXISTING from Phase 1** |
| `v0.2.0-phase-2` | 12/12 NON-pointer — unchanged from `v0.1.0-phase-1` |
| `v0.2.1-sub-phase-lfs-architecture` | 12/12 NON-pointer — unchanged; the LFS-architecture sub-phase migrated `captures/` to R2 + GitHub-LFS but did NOT touch the `tests/fixtures/legacy-captures/` placeholder-vs-pointer state |
| **HEAD `7d08d8f` (Stage-1c push)** | 12/12 NON-pointer — **identical state to `v0.2.1`** |

Origin commit for `mpm-multimaterial-ref.h5`: `9de8048 feat(phase1-stage2-mpm-multimaterial): TDD bootstrap` (Phase-1 Stage-2 placeholder bootstrap; predates LFS architecture by ~5 weeks).

### § 2.3 — Routing (per the dispatch's outcome matrix)

**Routing: DIAGNOSED, PRE-EXISTING, OUT-OF-SCOPE.** The state at HEAD `7d08d8f`
is identical to the state at `v0.2.1-sub-phase-lfs-architecture` (and at the
two earlier phase tags). Tagging now at `v0.2.2-sub-phase-phase-3-common-3dgs`
**does not regress an already-standing condition**: the worktree-replay
invariant (the M1 outcome of the LFS-architecture sub-phase) was already in
this state when v0.2.1 was tagged. **No STOP-A2.** This sub-phase neither
introduced nor worsened the anomaly.

**Banked as a sibling-sub-phase candidate** under the name
``legacy-capture-fixture-lfs-reconciliation`` (see ``banks_carried`` SIBLING-FIXTURE-LFS).
The reconciliation choice (re-track the 12 fixtures through LFS; or
re-characterize them as test-time-generated artifacts not committed; or split
the directory) is the operator's; not in this sub-phase's scope.

### § 2.4 — Stage-1c new fixture is CLEAN (FACT)

The Stage-1c-added ``tests/fixtures/legacy-captures/phase-3-common-3dgs.h5``
**IS** in `git lfs ls-files`:

```
2087402de9 * tests/fixtures/legacy-captures/phase-3-common-3dgs.h5
```

It is properly pointer-tracked, the OID `2087402de9…649f4a9` lives in both
GitHub-LFS (post-push) and Cloudflare-R2 (post-`git lfs push --object-id`
sync), and it is NOT flagged by `git lfs fsck`. This sub-phase's own
LFS-routed deliverable is correct.

## § 3 — STEP B disposition: I7 allowlist extension (D-E ratification)

Commit `c761aa9` adds `v0.2.2-sub-phase-phase-3-common-3dgs` to
``OPERATOR_NONPHASE_TAGS`` in
``tools/testkit/lfs_migration/test_i7_no_agent_tags.py``. Guard mechanism
UNCHANGED (frozenset diff over ``git tag --contains v0.2.0-phase-2``);
allowlist extended; mechanism probed (a temporary `__guard_probe_remove_me__`
tag pushed the guard RED, confirming the diff still triggers; tag removed).

Test result at HEAD `c761aa9`:
```
cd tools/testkit/lfs_migration && uv run --no-sync pytest test_i7_no_agent_tags.py -q
2 passed
```

**No STOP-I7.**

## § 4 — STEP C closing sweep (sub-phase scope)

| Check | Result | Method |
|---|---|---|
| Cat-X tolerance-budget | **PASS — 0 HARD_FAIL / 0 SOFT_WARN** | `uv run --no-sync python -m integrity --cat x --mode strict` |
| Mutation threshold (the SHIFTED gate stays the gate) | **UNCHANGED at 0.80** | `tools/testkit/mutation/mutmut-config.toml [targets.common_3dgs] threshold = 0.80`; the Stage-1c verdict carries the gap, NOT the threshold |
| Integrity Cat 1–5 at HEAD | **PASS — 0 HARD_FAIL / 14 SOFT_WARN; baseline byte-identical** | `uv run --no-sync python -m integrity --all --mode strict 2> /tmp/integrity-stepc.txt`; `sha256sum` → `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` |
| verify_evidence on every stage audit | **PASS — 0 fail across 5 audits** | Stage 0: 12/0; Stage 0 BLOCKED: 7/0; Stage 1a: 12/0; Stage 1b: 14/0; Stage 1c: 16/0 |
| Append-only vs v0.2.0-phase-2 | **PASS — 0 M/D under docs/_audits/** | `git diff --name-status v0.2.0-phase-2 HEAD -- docs/_audits/` (all A=ADD) |
| Append-only vs v0.2.1-sub-phase-lfs-architecture | **PASS (2 sanctioned modifications)** | the only Ms are `phase-2/sub-phase-lfs-architecture/{sha-back-fill,sub-phase-landing}.md` from the lfs-architecture's OWN Stage-2 SHA back-fill chore commit `e1fc154` (Convention #12 mechanism, placed AFTER the v0.2.1 tag at `8f4dea3`) — sanctioned by precedent, NOT a Phase-3 edit |
| Failing-tests replay spot-check (Stage 1a) | **PASS — sha256 round-trip MATCH** | on-disk `tools/testkit/failing-tests-evidence/common-3dgs-2026-05-28T01-28-53Z.txt` sha256 `f1f80a0225567da81b73aca1d8ce84f3802b97b61c1c7fb6c9a081a7626c84c6` matches Stage-1a audit + RED commit `ed4e501` footer + impl commit `87fe557` `Failing-tests-output-hash-witnessed` |
| Perf-ledger review | **PASS** | Stage-1b row present: `3dgs-smoke` `warp-cpu` `0.006 s` `36 gaussians, 128² image, SH degree 3`. Single-frame render, not a stepped trajectory; no comparable Phase-1/2 baseline (first neural-rendered row) — informational only |
| common-3dgs test suite at HEAD | **PASS — 51/51 GREEN** | `cd common/common-3dgs && uv run --no-sync pytest tests/ -q` |
| Closing anchor re-check | **PASS** | every stage audit's evidence_paths + evidence_hashes resolve at HEAD; no stale citation |
| I7 (no agent-pushed tag in range; allowlist extended) | **PASS — 2/2** | `cd tools/testkit/lfs_migration && uv run --no-sync pytest test_i7_no_agent_tags.py` |

All STOP conditions checked NOT fired.

## § 5 — Supernumerary reconciliation (S9-PHASE2-2)

The sub-phase delivered some scope BEYOND the strict minimum for task-1
common-3dgs. Account explicitly (do not silently absorb):

| Delivered | In-scope minimum? | Disposition |
|---|---|---|
| 5 external SHAs pinned in §2.18 (Inria + 4 forward) | Inria SHA (yes) + 4 forward (operator-delegated) | **supernumerary, banked-forward**: Bender / PhysicsNeMo / PhysGaussian / Lenia SHAs pinned at this Stage 0 to amortize the Convention #8 web-fetch under one dispatch; consumed at later sub-phases (task-3 Lenia, etc.) |
| 26 new test functions across `test_render_sh.py` + `test_validation.py` (Stage 1c) | the floor is "tighten until ≥ 80% or surface SHIFTED" — the count is dispatch-shaped | **supernumerary in count, in-scope in purpose**; the ≤ ~20 cap in the Stage-1c dispatch was soft (each parametrized branch targets a DISTINCT mutmut survivor) |
| Legacy-capture fixture committed under R2-creds-unblocked posture (Stage-1c carry-in) | the Stage-1b SHIFTED-DEFERRED item; in-scope for Stage-1c carry-in slot | in-scope; resolved at Stage 1c commit `e258950` |
| I7 allowlist extension (this Stage 2) | required for the operator tag push to land cleanly | in-scope; D-E ratification |

S9-PHASE2-3 anchor: no `docs/project-state.md` (does not exist) and no
`integrity.scripts.check_append_only` (does not exist) is referenced; the
append-only check is via `git diff --name-status` as documented in § 4.

## § 6 — D-class final disposition

| D | Question | Final |
|---|---|---|
| D-A | task-1 vs task-2 first | **task-1 first** (Inria SHA gate cleared at Stage 0; the §4.1 default held) |
| D-B | catalog↔plan stack drift | **deferred per-sim** (does NOT gate common-3dgs; routes at task-3 Lenia plan-drafting) |
| D-C | render determinism class | **bit-exact / same-stack-same-hw** (MEASURED `max_abs_diff = 0.0` at Stage 1b; LOCKED, no Stage-1c re-characterization) |
| D-D | neural-rendered capture-writer | **common-3dgs `save_png`** (matplotlib imsave; D-D resolved at Stage 1a probe — no common-py RGB-image writer exists; `plot_field_2d` is a colormapped field plot) |
| D-E | intermediate tag | **YES — `v0.2.2-sub-phase-phase-3-common-3dgs` proposed** (charter §3 argument: external dependency + durable architecture; operator-pushed, I7) |

## § 7 — Invariants at HEAD `c761aa9` (pre-tag state — FACT)

| Invariant | At HEAD | Method |
|---|---|---|
| I1 verify_evidence | **HOLDS** | 5 stage audits + Phase-0/1/2 landings all 0-fail (with the 1 pre-existing unrelated phase-1 fail accounted for); no Phase-3 regression |
| I2 cross-phase replay | **HOLDS** | additive (no audit / capture / tolerance row from prior phases was altered by this sub-phase); the Stage-0 `--prior-phase phase-2` `ok=True 8/8` outcome is unaffected at HEAD |
| I3 integrity baseline | **HOLDS BYTE-IDENTICAL** | `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`; 0 HARD_FAIL / 14 SOFT_WARN |
| I4 published-audit append-only | **HOLDS** | 0 M/D under `docs/_audits/` vs `v0.2.0-phase-2`; 2 sanctioned Ms vs `v0.2.1-sub-phase-lfs-architecture` (the lfs-arch Stage-2 SHA back-fill chore, pre-Phase-3) |
| I5 external-SHA web-verified | **HOLDS** | 5 SHAs pinned at Stage 0 with WEB-FETCH + Convention #8 (Inria `54c035f7`, PhysGaussian `8339ed6a`, Bender `d0894bdb`, PhysicsNeMo `766e485a`, Lenia `adfc5429`) |
| I6 SHA back-fill = own commit | **HOLDS / on-deck** | Stage-1b back-fill `e4f8ea5` + Stage-1c back-fill `d6303e8` (both separate commits); if this audit's `head_sha` cites the audit's own commit, the follow-up chore is its own commit per Convention #12 |
| I7 no agent-pushed tag | **HOLDS — 2/2 GREEN** | `test_no_agent_pushed_tag_in_subphase_range` + `test_operator_phase_tags_present`; allowlist now contains `v0.2.1-sub-phase-lfs-architecture` + `v0.2.2-sub-phase-phase-3-common-3dgs`; agent does NOT push the new tag |

## § 8 — Banks carried (forward-routing)

**L-3DGS-1** *(banked at Stage 1c)*: *neural-rendered category mutation
threshold may need calibration; revisit at task-8 dispatch with the 3DGS-MPM
consumer providing additional pixel-exact rotation / SH coverage.* The
Stage-1c SHIFTED-bracket score (0.7610) is below the 0.80 floor; the
Warp-kernel + NumPy-preprocessor inner-arithmetic surface (`render.py` 0.747,
`_kernels.py` 0.743) is structurally hard to push beyond ~76% without
test-scope expansion that overlaps task-8 coupling tests. **If the threshold
remains unmet after task-8's contribution, the tolerance-budget-amendment
forum (not a unilateral widening) is the routing.** The 0.80 threshold stays
0.80 in `tools/testkit/mutation/mutmut-config.toml`.

**SIBLING-FIXTURE-LFS** *(banked at Stage 2 — this audit)*: *12 legacy-capture
fixtures under ``tests/fixtures/legacy-captures/`` are plain git blobs
(9 small placeholder texts; 3 raw HDF5 binaries totalling ~64 MB at HEAD),
not LFS pointers. State is PRE-EXISTING from Phase 1 (since `v0.1.0-phase-1`);
unchanged by Phase 2's LFS-architecture sub-phase migration; unchanged by
this Phase-3 sub-phase.* Forward-routing: a candidate sibling sub-phase
``legacy-capture-fixture-lfs-reconciliation`` could re-track these through
LFS (raise the 3 raw binaries to LFS pointers; either delete the 9
placeholder texts or convert them to LFS-tracked HDF5 once generators ship)
— operator chooses scope. This sub-phase tag does NOT regress the condition.

## § 9 — Proposed tag (STEP E; operator-pushed only — I7)

```
Proposed tag:    v0.2.2-sub-phase-phase-3-common-3dgs
Tag commit SHA:  <will be the SHA back-fill chore commit if one lands, else this audit's commit>
                  current best candidate: c761aa9 (I7 allowlist extension, pre-tag tooling)
                  recommended target:     this Stage-2 landing audit commit (or its #12 back-fill)
Tag pushed:      NO (operator action required per I7)

Pre-tag checklist for operator:
  - I7 allowlist extended (commit c761aa9) — tag is in OPERATOR_NONPHASE_TAGS ✓
  - Closing status: closed-with-shifted-1 (mutation 0.7610; threshold 0.80 unchanged)
  - STEP A LFS-anomaly: DIAGNOSED-OUT-OF-SCOPE (12 pre-existing fixtures since
    v0.1.0-phase-1; sibling sub-phase legacy-capture-fixture-lfs-reconciliation
    banked for operator routing)
  - Mutation threshold UNCHANGED at 0.80 (anti-pattern not exercised)
  - All five stage audits verify_evidence 0-fail
  - Integrity c19492ad…d22cb52 byte-identical
  - I1–I7 hold
  - Banks carried: L-3DGS-1, SIBLING-FIXTURE-LFS

Operator pushes:
  git tag -s v0.2.2-sub-phase-phase-3-common-3dgs <chosen_sha> -m "sub-phase landing"
  git push origin v0.2.2-sub-phase-phase-3-common-3dgs
```

**Agent does NOT run `git tag` or `git push origin v0.2.2-…`.**

— *end of sub-phase-phase-3-common-3dgs landing audit* —

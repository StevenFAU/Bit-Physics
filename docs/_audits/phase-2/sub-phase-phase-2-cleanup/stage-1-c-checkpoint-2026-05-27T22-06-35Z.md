---
date: 2026-05-27T22-06-35Z
author: phase-2-cleanup-stage-1-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-stage-1-c
stage: stage-1-c-checkpoint
verdict: SHIFTED-with-notes
head_sha: caafdc9d08899154581d39d9c98f06110fde96e1
head_sha_at_checkpoint: caafdc9d08899154581d39d9c98f06110fde96e1
evidence_paths:
  - .github/workflows/ts-strict.yml
  - docs/dependencies.md
  - packages/lattice-boltzmann-d3q19/tests/test_manifest_equality.py
  - docs/phases/sub-phase-phase-2-cleanup.md
evidence_hashes:
  .github/workflows/ts-strict.yml: sha256:b4f64064edf49b362411d1b64b3ddbe3448cb310c03cd6919a8c02651165df20
  docs/dependencies.md: sha256:ba7c2fef45a4820766bb0dee85a76b8ed7b2f0e4d1c55021581c9c85a4ea0655
  packages/lattice-boltzmann-d3q19/tests/test_manifest_equality.py: sha256:68a399e0fdd13d85dd6980fcf8bbaf51db99d5f4d4627ebce4f78c9ce7b93380
  docs/phases/sub-phase-phase-2-cleanup.md: sha256:57c8306a12dc4424b4422f2b336cf72488e728c1ae76cd6046de3eeba8c84aa9
deferred_items:
  - "K-3 (UNKNOWN-1) post-reset CI green-check — unverifiable this session (pre-reset 2026-05-27); operator-ratified Option 1 carry; routed to a small post-reset follow-up dispatch (early June), separate from Stage 2"
  - "§13 #10 actionlint — DEFER-OUT to a future infra sub-phase (CIM-routed; not installable/validatable here)"
  - "§13 #17 mypy --strict Warp partial-stubs — DEFER-OUT to a typing/testing-improvements sub-phase (93 errors / 9 files in common-warp alone)"
  - "§13 #28 cpp-strict Mesa/LLVM-pin + exact-digest scoping — DEFER-OUT to a CI-determinism sub-phase (design-bearing FMA substrate; unvalidatable pre-reset)"
  - "§13 #1 LBM sim_runner_diagnostic cosmetic descriptor — STAYS BANKED (R-1 append-only-sealed Phase-1 code; analytic ICs; locked by #16's regression test; operator-routing-only per origin audit)"
ci_activation: []
top_level_deps_to_merge: []
---

# Stage-1.C checkpoint audit — sub-phase-phase-2-cleanup (Cluster C: CI / workflow / supply-chain hygiene)

**Verdict: SHIFTED-with-notes.** The cluster's 9 items re-shaped materially at execution-time
probe (two operator-ratified STOP-and-surface events; see § 5). Substantive deliverables landed:
**#12** (supply-chain SHA-pin of 3 actions) + **#14** (version-fetch methodology note). Three items
**verify-closed** (already resolved upstream: #11, #13, #16); one **stays banked** (#1, R-1); three
**deferred OUT** as sub-phase-sized in disguise (#10, #17, #28); **K-3 carried** (UNKNOWN-1, pre-reset,
ratified Option 1). The SHIFT is a scope-resolution shift, **not** an execution failure — every
executed item landed cleanly, integrity baseline held byte-for-byte, I1–I7 hold.

## § 1 — Cluster-open re-anchor (Convention M)

Re-anchored each item against HEAD (Cluster A had advanced HEAD to `1a312db`; this cluster starts
there). Item-source = `docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:323-362` (§ 13 #1, #10–#14,
#16, #17, #28) + K-3. The re-anchor surfaced that several items were **already resolved** or
**larger than cleanup-shaped** — driving the two STOP-and-surface events (§ 5).

## § 2 — Item-by-item disposition

| Item | Disposition | Evidence |
|---|---|---|
| **#12** supply-chain immutable-pin (checkout/setup-node/pnpm) | **RESOLVED** (`caafdc9`) | 3 actions pinned to verified commit SHAs (`checkout@de0fac2e… # v6.0.2` ×12; `setup-node@48b55a01… # v6.4.0`; `pnpm/action-setup@0e279bb9… # v6.0.8`). SHAs `gh api`-verified; pnpm annotated tag dereffed; major == latest patch. setup-uv out of scope (precise patch tag). YAML valid; `check-yaml` Passed on staged workflows |
| **#14** action-version-fetch methodology | **RESOLVED** (`caafdc9`) | `docs/dependencies.md` appended (append-only): latest-released (mutable tag) vs usable-pinning (immutable commit SHA) distinction + annotated-tag deref + pin format. Records the 3 pins in the file's table convention |
| **#11** check-yaml skips `.github/workflows/` | **VERIFY-CLOSE** (no real gap) | `pre-commit run check-yaml --files .github/workflows/cpp-strict.yml python-strict.yml` → **Passed**. The "(no files to check) Skipped" the CIM Stage-1a noted (`…ci-action-migration…/stage-1a-checkpoint-2026-05-24T15-00-37Z.md:145-147`) is the normal *no-YAML-staged-in-commit* behavior, not a workflow exclusion (no `exclude:` in `.pre-commit-config.yaml`; default `types: [yaml]` matches `.yml`). Live re-confirmation: `check-yaml` ran + Passed on the `caafdc9` workflow commit |
| **#13** Stack-D taichi `SyntaxWarning` filterwarnings gap | **VERIFY-CLOSE** (folded upstream) | all 5 Stack-D pkgs carry `"ignore::SyntaxWarning"` with the taichi-cold-`.pyc` comment (eulerian-smoke-d, lattice-boltzmann-d3q19-d, mpm-multimaterial-d, reaction-diffusion-2d-d, sph-water-d). The 3 Stack-E pkgs lack it correctly — Stack-E is Warp, imports no taichi (`grep -rln "import taichi" packages/*-stack-e/` → empty) → no gap. "Folded at SmkD" (§ 13 #13) confirmed |
| **#16** manifest-equality smoke test (D7) | **VERIFY-CLOSE** (exists) | `packages/lattice-boltzmann-d3q19/tests/test_manifest_equality.py` is the D7/D10/D11 realization (conventions § J.7; strategy-(i) additive). Locks the full emitted manifest incl. the cosmetic descriptor; second test asserts run-to-run stability |
| **#1** LBM `sim_runner_diagnostic` cosmetic descriptor | **STAYS BANKED** (R-1) | origin LBM-D audit ruled **D7 = STAY BANKED** (`…lattice-boltzmann-d3q19-stack-d/plan-drafting-probe-2026-05-24T02-30-12Z.md:236,239`): LBM ICs are analytic (no RNG to thread a seed into) → "fix" is cosmetic-only; Phase-1 source is **append-only-sealed** (editing = R-1 STOP); now **locked** by #16's regression test. "do NOT fold in without explicit operator ratification of the append-only-seal exception" → operator-routing-only. No change |
| **#10** `actionlint` not installed | **DEFER-OUT** | CIM Stage-1a explicitly routed it: "a **future infra sub-phase** or operator routing … orthogonal to scope" (`…ci-action-migration…/stage-1a-checkpoint-2026-05-24T15-00-37Z.md:138-143`). `actionlint` not on PATH here; the pyyaml `safe_load` fallback (architecture § G.9-adjacent) stands. Adding it as a hook is infra (unvalidatable pre-reset, may cascade workflow-lint findings). **Routing lean:** infra/tooling sub-phase |
| **#17** mypy `--strict` Warp partial-stub errors | **DEFER-OUT** | **Discovered scope: 93 errors across 9 files** in `common/common-warp` alone (`uv run --no-sync mypy --strict .` → "Found 93 errors in 9 files (checked 29 source files)"). CI runs `mypy --strict` only on testkit `capture/` + `determinism/` (`.github/workflows/python-strict.yml:40-41`), **not** Warp — so nothing currently gates on these. Extending coverage + resolving 93 errors is typing work, not hygiene. **Routing lean:** typing/testing-improvements sub-phase |
| **#28** cpp-strict Mesa/LLVM-pin + exact-digest scoping | **DEFER-OUT** | design-bearing: pinning Mesa/LLVM in CI bears on the FMA-contracted-digest determinism substrate (R-CPPB2; `.github/workflows/cpp-strict.yml:8-14` already documents the dev-pin Mesa 25.2.8 / LLVM 20.1.2 and frames cross-build divergence as **expected**, not a bug). Touches the currently-red `cpp-strict`; unvalidatable pre-reset. **Routing lean:** CI-determinism sub-phase |
| **K-3** post-reset CI green-check | **CARRY (UNKNOWN-1)** | see § 3 |

## § 3 — K-3 / UNKNOWN-1 — post-reset CI green-check (carried, operator-ratified Option 1)

**(FACT)** Session date **2026-05-27** is **before** the May 31/Jun 1 LFS-quota reset. The dispatch
framed Cluster C as a *post-reset* check ("should be GREEN now"); that was a coordinator-side date
error (Convention M: substantive intent — verify CI state at execution-time, flag if unexpected —
outranks the literal date assumption). Live state at the latest pushed HEAD (`origin/main e1fc154`;
the cleanup chain is unpushed): `cpp-strict` + `python-strict` = **failure**, all 7 other workflows
green (`gh run list`). **Both red workflows fail at the LFS-fetch step** (`cpp-strict`: "Selective
LFS fetch — RD-2D reference capture", exit 2; `python-strict`: "Selective LFS fetch — legacy-captures
corpus only", exit 2) — *before* any code/test/lint runs. This is the **benign LFS-bandwidth throttle**
the charter UNKNOWN-1 / R-6 anticipated, **NOT** a code or cleanup regression, and **NOT** the
alarming "post-reset still-red" scenario the dispatch STOP was written to catch.

**Disposition (operator-ratified, Option 1):** carry K-3 unchanged; R-6 forbids claiming a green-check
pre-reset. K-3's verification is **not architecturally load-bearing** for closing this sub-phase (the
substantive execution-time CI state is "as-expected for pre-reset"; the post-reset green is forward
verification of the already-landed LFS migration). **Routed to a small post-reset follow-up dispatch
(early June), separate from this sub-phase's Stage-2 landing.** If Stage 2 dispatches first, the
sub-phase may land with K-3 documented as deferred to that follow-up.

## § 4 — Commit boundaries (R-4)

| Commit | Theme | Files | Net |
|---|---|---|---|
| `caafdc9` | #12 SHA-pin + #14 methodology (coupled: the doc records the pins) | 12 × `.github/workflows/*.yml`, `docs/dependencies.md` | 51 ins / 14 del |

(Verify-close, stays-banked, and defer-OUT items are documentation-only dispositions — no source
change — so they carry no commit; they are recorded here and in the SHA back-fill.)

## § 5 — STOP-and-surface events (Hard Rule 2; both operator-ratified)

1. **UNKNOWN-1 date divergence (K-3).** Surfaced the pre-reset/post-reset mismatch + benign LFS-fetch
   red. Operator ratified **Option 1** (carry K-3; execute the 8 reset-independent items; SHIFTED-with-notes).
2. **Cluster-C scope re-shape.** Probe revealed only 2 of 8 items are cleanup-shaped; 3 already-resolved,
   1 append-only-blocked, 3 sub-phase-sized. Operator **ratified** the full re-routing (execute #12+#14;
   verify-close #11/#13/#16; #1 banked; defer #10/#17/#28 OUT). No scope absorbed (dispatch Hard Rule 2).

## § 6 — Charter § 9 deferred-OUT additions

The three defer-OUT items join the charter § 9 candidate-sibling-sub-phase set (recorded here; the
charter § 9 table is amended at Stage 2 landing if the operator routes a tagging/amendment pass):
#10 → infra/tooling sub-phase; #17 → typing/testing-improvements sub-phase; #28 → CI-determinism sub-phase.

## § 7 — Invariant verification (I1–I7) at HEAD `caafdc9`

| I | Invariant | State | Evidence |
|---|---|---|---|
| I1 | LFS pointer/content unchanged | **HOLD** | only `.github/workflows/` + `docs/dependencies.md` edited; no `captures/`/`.gitattributes`/LFS pointer touched |
| I2 | Cross-phase replay bit-identity | **HOLD** | no code / integrity-logic change |
| I3 | integrity 0 HARD_FAIL; baseline byte-for-byte | **HOLD** | `0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 `c19492ad…d22cb52` |
| I4 | verify_evidence GREEN (no regression) | **HOLD** | 1.A checkpoint 8/0; this checkpoint resolves at `caafdc9` |
| I5 | append-only (no published audit edited) | **HOLD** | net-new audit; `dependencies.md` is a doc, appended not rewritten |
| I6 | Convention #12 SHA back-fill separate commit | **HOLD** | back-fill is the separate next commit |
| I7 | no agent-pushed tags | **HOLD** | no tag pushed |

## § 8 — Verification sweep (FACT)

- `.venv/bin/python -m integrity --all --mode strict` → `0 HARD_FAIL, 14 SOFT_WARN`; full-report
  sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (baseline held).
- `pytest tools/testkit/lfs_migration/` → `15 passed, 1 failed` (PD-1 proxy gap; unchanged; Cluster D fixes it).
- `pre-commit run check-yaml --files .github/workflows/...` → **Passed** (#11 evidence).
- `gh api .../git/refs/tags/<tag>` → each pin SHA verified (#12 evidence).

## § 9 — Banked lesson (for Stage 2)

**L-CLEANUP-1:** *plan-drafting enumeration sometimes under-resolves items that look cleanup-shaped at
low resolution but reveal sub-phase complexity at execution-time probe.* Cluster C: 3 of 8 items
(#10/#17/#28) were probe-clustered as cleanup (effort S/M) but proved sub-phase-sized on execution-time
inspection (#17 alone = 93 mypy errors / 9 files). The remedy is the per-cluster Convention-M re-anchor
already in the cadence — but the Stage-2 landing should note this pattern so future basket sub-phases
budget probe-depth for "M"-effort CI/typing items specifically. Bank into the Stage-2 banked-lessons section.

## § 10 — Exit state

Cluster C closed as **SHIFTED-with-notes**: #12/#14 RESOLVED; #11/#13/#16 VERIFY-CLOSE; #1 STAYS-BANKED;
#10/#17/#28 DEFER-OUT (charter § 9); K-3 CARRY (post-reset follow-up). No scope absorbed. Next cluster
per dispatch order: **1.E** (working-tree & doc-truth hygiene).

## Conventions honored

Convention #8 (every SHA `gh api`-verified; 93-error count + check-yaml-Passed grep-/command-verified;
no fabrication); Convention M (re-anchored against HEAD; surfaced the dispatch date error); Convention A
(net-new checkpoint; back-fill follows); Convention #12 (SHA back-fill separate next commit); R-1
(#1 not edited — append-only seal honored); R-4 (one commit for the coupled #12/#14 theme); Hard Rule 2
(two STOP-and-surface events, both ratified; no scope absorbed); `evidence_paths` a list /
`evidence_hashes` a YAML mapping; four-state verdict (SHIFTED-with-notes); FACT/INFERENCE tagging; no
agent-pushed tag (I7).
</content>

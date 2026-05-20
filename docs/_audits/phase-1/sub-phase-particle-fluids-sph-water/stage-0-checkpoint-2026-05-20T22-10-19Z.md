---
date: 2026-05-20
author: particle-fluids-sph-water-sub-phase-agent
artifact: stage
artifact_id: particle-fluids-sph-water-stage-0
stage: 0-preflight
subject: "Particle-fluids sph-water sub-phase Stage 0 (pre-flight) checkpoint"
verdict-state: complete
head_sha: PLACEHOLDER-BACKFILL-AT-CONVENTION-12-CLOSE
head_sha_at_checkpoint: PLACEHOLDER-BACKFILL-AT-CONVENTION-12-CLOSE
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
evidence_paths:
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-replay-2026-05-20T22-10-19Z.txt
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-evidence/manifest-verify-2026-05-20T22-10-19Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt
  - references/SPlisHSPlasH/MANIFEST.toml
evidence_hashes:
  docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-replay-2026-05-20T22-10-19Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-evidence/manifest-verify-2026-05-20T22-10-19Z.txt: sha256:d4d1de82ec6127fac1ed1a27ebb895bf5902f943a3801c893e5e01ebadf01ea5
  tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt: sha256:82fb91bcf19581cd9adc0eca4ba194de033d4a58aa9c5319d52dabc40cf12b1f
---

# Particle-fluids sph-water Sub-Phase — Stage 0 (Pre-flight) Checkpoint

## 1. Scope

(FACT — `docs/phases/sub-phase-particle-fluids-sph-water.md` § 4.1 / § 7.1.)
Stage 0 is pre-flight for the particle-fluids sph-water sub-phase
(fourth per-sim implementation sub-phase under spec-Phase-1; sibling
half of the originally-bundled "continuous-CA + sph-water" pair per
charter § 1.2; the first sub-phase to consume a Phase-0-vendored
upstream at sim-test scale per charter § 1.6). Four tasks executed:

- Task 0.0 — cross-phase audit replay against `v0.1.0-phase-1` (with
  bit-identity invariant check on the replay-output sha256);
- Task 0.1 — tolerance-budget carryover to
  `sub-phase-particle-fluids-sph-water`;
- Task 0.2 — Phase 1 sph-water failing-tests evidence sha256 re-verify;
- Task 0.3 (RESHAPED THIS SUB-PHASE per charter § 1.6 / § 4.1) —
  SPlisHSPlasH vendored-manifest-state verification.

No sim work; no edits outside `tools/testkit/equivalence/tolerance-budget.toml`
and new audit files under
`docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/`. The
SPlisHSPlasH vendored tree at `references/SPlisHSPlasH/` is read-only
per spec § 9.2 + charter § 1.6.

Pre-state at session start: `HEAD =
f71751e66698e7ec36ad675bfe631f6b051e94ae` (post charter draft).
Working tree clean. The sibling continuous-CA-RD-3D sub-phase landed
at SHA `0df358d` (post-Convention-#12 SHA back-fill on `ca3b311`); it
is NOT in the replay-chain parent set (charter § 11.4 —
`_resolve_phase_handle`'s single-integer regex mechanically rejects
multi-segment / suffixed phase handles, so sibling sub-phases are not
replay parents).

The six operator routings of the § 11.5 operator-routable items
(supplied at dispatch) are AUTHORITATIVE for this sub-phase and
unchanged by this checkpoint:

| # | Item | Operator routing |
|---|---|---|
| 1 | § 1.4 language-pivot re-anchor | CONFIRMED — Python NumPy reference; Stack C C++/Vulkan + vendored-kernel-consumption deferred to Phase 2+ cross-stack sub-phase. |
| 2 | § 1.3 / Task 0.3 SPlisHSPlasH manifest bare-slug-vs-prefixed-form | CONFIRMED no amendment — bare slug `"sph-water"` is functionally correct; spec § 9.2 prefixed example is illustrative not mandatory; record drift as inherited-shift finding (see § 7 SHIFT N1) and move on. |
| 3 | § 4.3 Step 2.3 Cat 3 routing | CONFIRMED Decision A — at Stage 2, additively lift DFSPH density-evolution golden from 1 anchor → ≥ 3 discrete entries; append `Path("particle-fluids")` to `_SUBDIRS_PICKED_UP`. Two-commit shape mirroring agent-based `3ce7809` + `d156792`. |
| 4 | § 4.3 Step 2.7 B17 routing | CONFIRMED PATH-A continue — second proof-point of runner generalization; target list: `sph_water.{reference.dfsph,sim,invariants}` + `tools/testkit/golden/generator/dfsph_density_evolution.py`; cubic-spline-kernel Phase-0 deliverable OUT of scope; R15 STOP-AND-SURFACE precondition preserved. |
| 5 | § 2 gate 10 / R12 canonical-capture vs 64-MB ceiling | OPERATOR ROUTES AT STAGE 1 STEP 5 — estimate capture size before generating; if estimate exceeds 64 MB, STOP and surface with three remediation paths (raise ceiling / downsample cadence / Appendix D smaller-N amendment); do NOT pre-emptively raise the ceiling. |
| 6 | § 11.4 v0.1.4 tag | No intermediate tag; default lean. |

## 2. Commits in this stage

| SHA | Commit message | Sub-deliverable | Notes |
|---|---|---|---|
| `f71751e` | `docs(sub-phase-particle-fluids-sph-water): initial draft of sph-water implementation plan` | (pre-Stage-0) | Charter draft (515 lines); reviewed by operator pre-dispatch. |
| `7ad4565` | `chore(particle-fluids-sph-water-stage0-tolerance-budget): sub-phase carryover from phase-1` | Task 0.1 — `[phase]` carryover | Only `[phase].phase` and `[phase].opened_at` changed; no `[budgets.*]` widening (spec § 2.6 prohibits widening without separate operator amendment). |
| (this commit) | `chore(particle-fluids-sph-water-stage0-checkpoint): Stage 0 pre-flight complete` | Closing — this audit | Convention #12 SHA back-fill follows in a separate commit per charter § 4.1 closing + inherited every-stage-close discipline. |
| (next commit) | `chore(particle-fluids-sph-water-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12` | SHA back-fill | New commit; never `--amend`. |

## 3. Task 0.0 — Cross-phase audit replay

(FACT — `…/stage-0-replay-2026-05-20T22-10-19Z.txt`,
sha256 `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`.)

Invocation (per charter § 4.1 / § 7.1):

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Exit code: 0. Eight gates PASS. Replay handle resolves to
`v0.1.0-phase-1`. Output body (verbatim):

```
  PASS  gate=integrity audit_verdict=None
  PASS  gate=pytest audit_verdict=None
  PASS  gate=equivalence audit_verdict=None
  PASS  gate=determinism audit_verdict=None
  PASS  gate=perf-ledger audit_verdict=None
  PASS  gate=property audit_verdict=None
  PASS  gate=mutation audit_verdict=None
  PASS  gate=tolerance-budget audit_verdict=None
summary: prior_phase=v0.1.0-phase-1 ok=True
```

**Bit-identity invariant check (charter § 7.1 standing order 10 inheritance).**
The replay-output sha256
`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`
**byte-matches the established invariant** carried across:

| Prior Stage 0 replay | sha256 | Source |
|---|---|---|
| Closed-form Stage 0 | `9399fc33…909f34` | `docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md` |
| Agent-based Stage 0 | `9399fc33…909f34` | `docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md` |
| Hotfix V1 validation | `9399fc33…909f34` | `docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md` |
| Continuous-CA RD-3D Stage 0 (post-hotfix) | `9399fc33…909f34` | `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md` § 2 |
| **THIS Stage 0** | `9399fc33…909f34` | (this audit) |

The deterministic-replay invariant holds; no structural-correctness
alarm triggered. Proceed.

## 4. Task 0.1 — Tolerance-budget carryover

(FACT — commit `7ad4565`; `tools/testkit/equivalence/tolerance-budget.toml`
at HEAD.)

Edited `[phase]` block only:

```diff
 [phase]
-phase = "sub-phase-continuous-ca-rd3d"
-opened_at = "2026-05-20T19:14:51Z"
+phase = "sub-phase-particle-fluids-sph-water"
+opened_at = "2026-05-20T22:10:19Z"
```

No `[budgets.*]` widening (spec § 2.6 forbids widening cross-stack
tolerance caps without separate operator-approved amendment). The six
existing cross-stack categories (`closed_form`, `reaction-diffusion`,
`sph`, `mpm`, `smoke`, `lbm`) unchanged.

## 5. Task 0.2 — Phase 1 failing-tests evidence sha256 re-verify

(FACT.) sha256 of
`tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt`
at HEAD:

```
82fb91bcf19581cd9adc0eca4ba194de033d4a58aa9c5319d52dabc40cf12b1f
```

**Match** against the Phase 1 landing audit `evidence_hashes:` value:

```
docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md:
  tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt:
    sha256:82fb91bcf19581cd9adc0eca4ba194de033d4a58aa9c5319d52dabc40cf12b1f
```

Gate-13 precondition (charter § 1.3 / charter § 11.4) holds.

## 6. Task 0.3 — SPlisHSPlasH vendored-manifest-state verification (RESHAPED)

(FACT — `…/stage-0-evidence/manifest-verify-2026-05-20T22-10-19Z.txt`,
sha256 `d4d1de82ec6127fac1ed1a27ebb895bf5902f943a3801c893e5e01ebadf01ea5`.)

Per charter § 1.6 + § 4.1 — first practical exercise of spec § 9.2
vendored-upstream consumption discipline at sim-test scale. Four
checks executed against `references/SPlisHSPlasH/MANIFEST.toml` at
HEAD:

| Check | Expected | At HEAD | Verdict |
|---|---|---|---|
| (a) `[upstream].sha` | `6bff55a6eaf14083d34650f22a268ce156b62b54` | `6bff55a6eaf14083d34650f22a268ce156b62b54` | PASS |
| (b) `[scope].used_by_sims` contains an sph-water reference | per spec § 9.2 — illustrative `"particle-fluid/sph-water"` | `["sph-water"]` (bare slug; landed at Phase 1 Stage 3 commit `83b3f5f` per Phase 1 landing audit § 4) | PASS-with-DRIFT (see § 7 SHIFT N1) |
| (c) `[scope].used_by_checks` references `cat3.cubic-kernel` | `cat3.cubic-kernel` present | `["cat1.upstream-citation", "cat3.cubic-kernel"]` | PASS |
| (d) On-disk vendored tree | `SPHKernels.{h,cpp}`, `LICENSE`, `UPSTREAM_README.md` exist | All four exist (sha256-witnessed in evidence file) | PASS |

**Verdict: PASS with one drift finding.** All four manifest fields
verified at HEAD; the bare-slug-vs-prefixed-form deviation in (b) is
recorded as SHIFT N1 (§ 7) and not amended per operator Item 2
routing. The vendored discipline contract (cite by name, do not
import vendored sources, do not modify vendored sources) is now
established for Stage 1 to follow.

## 7. SHIFTED register

| # | Shift | Rationale |
|---|---|---|
| N1 | **SPlisHSPlasH manifest `[scope].used_by_sims` uses bare slug `"sph-water"` rather than spec § 9.2 worked-example prefixed form `"particle-fluid/sph-water"`.** The manifest at HEAD carries `used_by_sims = ["sph-water"]` (landed at Phase 1 Stage 3 commit `83b3f5f`). Spec § 9.2 shows the prefixed form as an illustrative example; the spec text does not mandate the prefix. Per operator Item 2 routing the bare slug is **functionally correct** (no downstream consumer at HEAD parses the value by prefix-segment); the drift is **NOT amended** at this sub-phase. Recorded as inherited-shift finding so future readers don't expect amendment work at Stage 2. Banked Phase-1-amendment candidate if a future sub-phase finds the prefixed form load-bearing (e.g., cross-stack sub-phase distinguishing multiple particle-fluids upstreams). | Per operator Item 2 routing at dispatch; no amendment work. |

(No SHIFTED items from Tasks 0.0, 0.1, or 0.2 — all PASS-clean.)

## 8. Banked items posture

Inherits the 48-cumulative-shift baseline from charter § 11.2 + the
inherited banked-items table verbatim from continuous-CA-RD-3D
landing § 9 (no new bankings at Stage 0; the bare-slug-vs-prefixed-form
drift is recorded as a SHIFT, not a banked item, per the operator
routing).

The four operator-routed items (Items 3, 4, 5, 6) await Stage 2 / Stage
1 execution per the routing table in § 1 above.

## 9. Outputs to Stage 1

- Tolerance budget owns the new sub-phase identifier.
- Phase 1 sph-water failing-tests-evidence sha256 confirmed unchanged
  → gate-13 worktree replay at `cd20faa` will be the load-bearing
  comparison at Stage 1 step 9.
- SPlisHSPlasH vendored discipline contract confirmed: Stage 1 cites
  Bender & Koschier 2015 + Monaghan 1992/2005 by name in docstrings;
  does NOT import or call vendored sources; does NOT modify
  `references/SPlisHSPlasH/` (Stage 2 append-only check enforces).
- Bit-identity replay invariant confirmed unbroken across the gap from
  RD-3D Stage 0.
- The six operator routings are authoritative for the remainder of
  the sub-phase.

## 10. Closing

Stage 0 complete. Stage 1 (per-sim implementation) is dispatchable in
a fresh session per charter § 5 dispatch workflow / § 7.2 Stage 1
prompt. The agent does NOT proceed into Stage 1 in this session.

Convention #12 SHA back-fill at close per charter § 4.1 / § 10
discipline: a NEW commit (never `--amend`) will replace the
`PLACEHOLDER-BACKFILL-AT-CONVENTION-12-CLOSE` placeholders in this
audit's front-matter after the closing commit lands.

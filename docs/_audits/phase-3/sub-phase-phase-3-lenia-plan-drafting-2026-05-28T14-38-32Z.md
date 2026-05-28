---
date: 2026-05-28T14-38-32Z
author: phase-3 lenia plan-drafting (Claude Code)
subject: Phase 3 third sub-phase plan-drafting — Lenia (task-3, first SIM)
verdict: CONFIRMED
head_sha: d5587b4aa8a24366c21532f0ed8e210a0dba8559
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md
  - docs/phases/sub-phase-phase-3-lenia.md
  - docs/phases/phase-3-plan.md
  - docs/planning/bit-physics-master-catalog.md
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
  - docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-landing-2026-05-28T14-20-30Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md
evidence_hashes:
  docs/phases/sub-phase-phase-3-lenia.md: sha256:2391728fe616ceaba3c8ddff3ed70b21635427aea488eca9d9d4f1c758714b9a
  docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md: sha256:1cdd1eb564bff8f2ece8c477afd2d1a7896b24a709afab34621d2a92b44ba111
  docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md: sha256:3ea42de404e73d9f67df044e4dfad97fc5bed4920d9b735739a2adbca4d9f14d
banked_consumed: []
banked_forward_routed:
  - L-3DGS-1 (carried forward — Lenia is not neural-rendered; bank stays for task-8 / 3DGS-MPM consumer)
  - SIBLING-FIXTURE-LFS (carried forward — Lenia's phase-3-lenia.h5 push exercises the LFS/R2 pipeline but does NOT close the sibling sub-phase; increments corpus by one)
  - integrity-meta-test-ci-wiring (carried forward — Lenia's testkit/property/sims/lenia/ + tests/ rides existing pytest-testpaths machinery; no integrity meta-test gap inherited)
  - first-SIM-friction-portfolio-scale (NEW — § 1.1 of charter; every later Phase-3 SIM inherits this sub-phase's resolution of testkit/golden/tier-3/CI/LFS-R2/PBT/perf-ledger/spec-ref/per-sim-CI-job/per-category-tolerance-determinism/13-gate discipline surfaces)
d_class_surfaced:
  - D-B Stack D (RESOLVED-IN-CHARTER on FACT; sibling investigation audit per `docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md`; plan §4.1 rationale + §6.3 prompt + §3.2.4/§3.2.5 pre-baked rows + catalog §5.2.2 narrative concur; catalog Appendix B is tier-accessibility crosswalk per `:4634` column header, NOT single-stack mandate; surface-only — no catalog edit, no plan edit)
  - D-MUT-SCOPE NO (RESOLVED-IN-CHARTER on FACT; §6.0 item 12 testkit-adjacent-only; §6.3 VERIFICATION POSTURE golden+PBT+determinism, no mutation; Stage 1c is verdict-landing only)
  - D-FFT real-space default (lean; STOP-FFT silent-non-determinism conditional; FFT opt-in at Stage 1b probe ONLY if stable AND bit-exact same-stack-same-hw)
  - D-DET bit-exact same-stack-same-hw via Taichi seed (§3.2.5 pre-baked; MEASURE at Stage 1b; STOP-DET if NOT bit-exact → re-characterize distributional+EFECT per smoke-stack-e gate-14 precedent)
  - D-TAG YES v0.2.4-sub-phase-phase-3-lenia (lean — §D.2 (a) Chakazul vendoring + (b) durable sim architecture both strongly met; operator-pushed; I7 allowlist extension at Stage 2; operator-pending caveat — if phase-close-only tagging now policy, lean reverts to NO)
db_decision: Stack D (RESOLVED-IN-CHARTER)
---

# Plan-drafting landing audit — sub-phase-phase-3-lenia

**Verdict: CONFIRMED.** Plan ready for Stage 0 dispatch with no operator-
pending external-state gates. CONFIRMED (not SHIFTED) because:

- The **D-B fork is dispositively resolved** at plan-drafting via the
  sibling investigation audit on FACT-citation. Stack D — plan §4.1
  rationale + §6.3 prompt + §3.2.4/§3.2.5 pre-baked rows + catalog
  §5.2.2 narrative all concur; catalog Appendix B is
  tier-accessibility crosswalk (per `:4634` column header), NOT a
  single-stack mandate. STOP-DB not fired (the prompt's expected
  outcome).
- The Chakazul SHA is pinned at plan §2.18 + re-verified at probe (no
  drift; STOP-PIN not fired).
- D-MUT-SCOPE + D-DET leans are RESOLVED-IN-CHARTER on FACT; D-FFT +
  D-TAG carry default leans + decision-by stages — the matured cadence's
  normal posture.

No HARD RULE 2 STOP fired against plan-drafting. STOP-D-ANCHOR /
STOP-DET / STOP-FFT / STOP-LFS / STOP-PIN / STOP-CAT-X / STOP-PBT /
STOP-I7 / STOP-K2-AT-HEAD / STOP-PROSE-MATH / STOP-TIER3-DIR / STOP-D /
STOP-H / STOP-REPLAY are filed in the charter (`docs/phases/sub-phase-phase-3-lenia.md`
§ 6) as Stage-0 / 1a / 1b / 1c / 2 conditional STOPs.

## § 1 — Commit chain (this plan-drafting session)

| Commit | Artifact | Path |
|---|---|---|
| 1 — `1f7ec42a4bfa…` | D-B investigation audit | `docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md` |
| 2 — `d5587b4aa8a2…` | probe report | `docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md` |
| 3 (this commit) | charter + this audit + progress.md entry | `docs/phases/sub-phase-phase-3-lenia.md` + this file + `docs/_audits/phase-3/progress.md` |
| 4 (optional Convention #12) | SHA back-fill for `head_sha` row | this audit only — terminal artifact, never `--amend` |

Charter sha256 `2391728f…14b9a`; D-B investigation sha256
`1cdd1eb5…ba111`; probe sha256 `3ea42de4…f14d` — all three recorded
in front-matter `evidence_hashes` and verifiable by `verify_evidence`
at this audit's back-filled `head_sha` (= commit-3 SHA, where all
three exist).

## § 2 — Anchor-probe state checks (FACT)

All re-run at HEAD `d5587b4` (Convention M — `git rev-parse HEAD` ==
`git rev-parse origin/main` at commit-2 time; charter + this audit
land at commit-3, the back-fill writes the back-filled SHA):

| Check | Result |
|---|---|
| Tags `v0.0.0-phase-0` / `v0.1.0-phase-1` / `v0.2.0-phase-2` / `v0.2.1-sub-phase-lfs-architecture` / `v0.2.2-sub-phase-phase-3-common-3dgs` / `v0.2.3-sub-phase-phase-3-render-similarity` | **all six resolve** |
| Integrity Cat 1–5 sweep | **0 HARD_FAIL / 14 SOFT_WARN**; full-report sha256 byte-identical to baseline `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` |
| verify_evidence — Phase-3 prior audits (15 entering + the D-B investigation in this session + the probe in this session) | **0-fail across all 17**; new audits (D-B 8/0, probe 29/0) added cleanly; 15 entering verified at HEAD before this session opened |
| `git rev-parse HEAD` == `git rev-parse origin/main` | **MATCH** at probe time `1f7ec42a4bfa…`; HEAD advanced to `d5587b4aa8a2…` after commit-2 (probe report) |
| `uv sync --all-packages` | **clean** (workspace lockfile unchanged; cat4 hook pre-commit PASS) |
| K-2-at-HEAD (§6.3 golden paths read `tools/testkit/golden/`, NOT `code_verification/golden`) | **CONFIRMED** — `grep -n code_verification/golden docs/phases/phase-3-plan.md docs/architecture.md` returns empty |
| All §6.3 task-3 prompt surfaces present at HEAD | DELIVERABLES A-O (`:1329-1366`); OUT OF SCOPE (`:1310-1312`); ANCHOR-PROBE step (`:1316-1327`); VERIFICATION POSTURE (`:1369-1373`); §3.2.4 row (`:426-433`); §3.2.5 row (`:479-486`) — all present |
| Chakazul/Lenia SHA `adfc542939266de7f4bb7ebb552e8499701ee107` | **byte-equal** between §2.18 Stage-0 pin (fetched 2026-05-28T00:54Z) and probe re-fetch (2026-05-28T14-38-32Z); MIT license; security advisories empty; active |

## § 3 — D-B decision (the crux)

The dispatch prompt named D-B as the charter's crux. The D-B
investigation audit (`docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md`)
performs the prompt's investigation #1–#4 and decides on FACT-citation:

| Question | Evidence | Conclusion |
|---|---|---|
| #1: Does Stack D have stated rationale? | §4.1 `:764-765` (three rationale citations); §4.1 `:747` diagram annotation; §6.3 `:1287` ROLE line; §6.3 `:1370` Taichi-seed determinism; §3.2.4 `:426-433` + §3.2.5 `:479-486` row schemas pre-baked under Stack D / Python / Taichi | **YES — strongly stated.** Plan-locked rationale-backed assignment. |
| #2: Does the catalog's B/E have a dependency reason? | catalog `:4634` table header reads "Tier 0 / Tier 1 / Tier 2 stacks" (recommended-stack-per-tier crosswalk); catalog §5.2.2 `:1065` narrative explicitly says "Stack D (Taichi or PyTorch), with WebGPU deploy variant"; catalog §21.4.8 `:1992` Tier-0 framing = "gallery-quality browser sim" (the Phase-5 web-deploy lift, not the Phase-3 reference) | **NO — Appendix B is tier-accessibility projection, NOT single-stack mandate.** Catalog's own §5.2.2 narrative agrees with Stack D. The apparent fork dissolves under the column-semantics rule. |
| #3: Downstream consumer requires Stack B? | plan §3.1 `:325` task-3 is **(terminal)**; phase-4-plan.md `grep -n Lenia` no-match; catalog `:4180` roadmap mention only (no composition row locking Stack B); catalog §21.4.8 "image-driven kernel" composition is Phase-5 gallery-mode (compatible with Stack-D reference + Stack-B deploy variant) | **NO — no downstream consumer requires Stack B.** |
| #4: What does Stack D buy vs Stack B? | plan `:765` ordering rationale ("task-3 (D) covers Stack D in sequence"); arch.md §4.4 `:955-962` (Stack D = Taichi explicit-determinism-flags, bit-exact reproducibility); the testkit's central Python surface (mutmut, Hypothesis, pytest, integrity Cat 1-5) is exercised maximally on Stack D | **Maximum testkit-pipeline coverage on Stack D.** Stack B would route around the testkit's Python surface — defensible at Phase-5 deploy but counter-productive at Phase-3 pipeline-validation. |

**Decision: Stack D — RESOLVED-IN-CHARTER.** Per the prompt's decision
rule, this is the expected outcome. Charter §1 + §5 D-B record the
decision; charter §1 records the catalog row as
**surfaced-read-as-tier-crosswalk** (NO catalog edit; catalog-v3.0 is a
separate amendment track). No STOP-DB fired.

## § 4 — Other D-class items (each lean cited)

### D-MUT-SCOPE — NO (RESOLVED-IN-CHARTER on FACT)

**(FACT — `docs/phases/phase-3-plan.md:1054-1058` § 6.0 item 12.)**
Mutation-testing thresholds apply to testkit-adjacent modules
(common-3dgs / render-similarity / common-warp) — NOT to SIM tasks.
**(FACT — `docs/phases/phase-3-plan.md:1369-1373` § 6.3 VERIFICATION
POSTURE.)** Code verification = GOLDEN VALUES + ≥3 anchors; determinism
= bit-exact same-stack-same-hw via Taichi seed; PBT = ≥2 invariants. NO
mutation gate. Stage 1c is verdict-landing only (golden-anchor verify +
PBT-green + determinism-measured + legacy-capture seed verified +
perf-ledger row anchored).

### D-FFT — real-space default (Decision-by Stage 1b)

**(FACT — `docs/phases/phase-3-plan.md:1344-1346` § 6.3 D.)** "Real-space
Taichi-kernel convolution (default). FFT only if stable Taichi-compatible
FFT path exists (probe)." STOP-FFT (silent non-determinism between
inputs) conditional in charter §6.

### D-DET — bit-exact same-stack-same-hw via Taichi seed (MEASURE Stage 1b)

**(FACT — `docs/phases/phase-3-plan.md:479-486` § 3.2.5 pre-baked row.)**
`stack="D" class="bit-exact" scope="same-stack-same-hw" atomic_ops="none"
seed_pinned=true`. **(FACT — `docs/architecture.md:955-962` § 4.4.)**
"Taichi has explicit determinism flags. Reproducibility within Taichi is
well-supported." Stage 1b uses `common_py.determinism.set_taichi_deterministic(config,
arch='cpu')`. STOP-DET conditional if NOT bit-exact (re-characterize as
distributional + EFECT bound per smoke-stack-e gate-14 precedent — NOT
a hard STOP if EFECT derivable).

### D-TAG — YES v0.2.4-sub-phase-phase-3-lenia (Decision-by Stage 2)

**(FACT — `docs/conventions/sub-phase-conventions.md` § D.2.)** Default
YES for sub-phases with external vendoring OR durable sim architecture.
Lenia has BOTH: Chakazul vendoring at MIT-licensed pinned SHA + first
SIM in Phase 3 + first `continuous-ca/lenia/python/` package + first
`tools/diagnostics/tier3/` tree creation + first Lenia spec-sheet +
first per-sim PBT module + first per-sim `test-lenia` CI job. Operator-
pending caveat: if phase-close-only tagging is now policy, lean reverts
to NO; charter default holds YES per immediate precedents (`v0.2.2` and
`v0.2.3` both pushed by operator on 2026-05-28).

## § 5 — Stale §6.3 surfaces (Convention M — surface-only re-frames, NO plan edit)

| Stale surface | §6.3 cite | Re-framed under |
|---|---|---|
| `BASE BRANCH: phase-3-integration` / `YOUR BRANCH: phase-3/task-3-lenia` / `gh pr create` | `docs/phases/phase-3-plan.md:1290-1291` | v8 trunk-based amendment `:46` |
| "Sub-phase 3.1" framing | `docs/phases/phase-3-plan.md:1287` | This is the third Phase-3 sub-phase by execution order (after common-3dgs + render-similarity). §1 scope-table ordinal is plan-spec, not execution. |
| Multi-claude-session coordinator handoff | `docs/phases/phase-3-plan.md:1295-1302` | v8 single-agent dispatch |
| ANCHOR-PROBE 1 "Clone, sub-branch, base-sha" | `docs/phases/phase-3-plan.md:1318` | trunk-based; base-SHA = HEAD of `main` |
| §6.3 E anchor-1 "kernel at r=0 (peak K(0))" | `docs/phases/phase-3-plan.md:1351` | §0.3 SHIFT-from-discovered (mathematical): Quad4 K(0)=0, NOT a peak. Peak at r=0.5 (K=1). Stage 1b re-grounds against Chakazul derivation; likely three anchors r=0 (K=0), r=0.5 (K=1, peak), r=1 (K=0). NO plan edit (architecture-spec authority). |

Per `docs/conventions/sub-phase-conventions.md` Convention M and the
common-3dgs charter §1.3 / render-similarity charter §1.3 precedent,
these are **surface-only re-frames**; the charter records them in §1.2
without editing `phase-3-plan.md` (operator-approved + separate-commit
only). The "peak K(0)" math drift may eventually warrant a plan
amendment — but that is **operator decision**, NOT this sub-phase's
unilateral action.

## § 6 — First-SIM friction surfacing (load-bearing)

Per the dispatch prompt's CONTEXT-BRIDGE: Lenia validates the testkit +
golden + tier-3 + CI pipeline end-to-end for the first time. The charter
§ 1.1 enumerates the pipeline surfaces Lenia exercises first; friction
in any of them predicts friction in **every later Phase-3 SIM** (rigid-
body, cloth, NCA, PINN, 3DGS-MPM).

Future SIM sub-phases inherit this sub-phase's landing audit at their
own plan-drafting. The charter's § 7 R-11 explicitly requires Stage 1a/1b/1c
audits to **name friction loudly** even when it doesn't fire a hard STOP.
A "papered-over" friction = portfolio-scale technical debt; an explicit
friction = portfolio-scale learning.

The most load-bearing first-SIM surfaces:
- **LFS/R2 pipeline** at Stage 1b `.h5` push (every later SIM hits the same path).
- **`tools/diagnostics/tier3/` directory creation** (Lenia is the FIRST to land this subtree at HEAD).
- **Per-sim CI job** (`test-lenia` in `.github/workflows/build-py.yml` — Lenia is the first per-sim CI job for a Phase-3 SIM).
- **§0.3 SHIFT-from-discovered mathematical drift** (the "peak K(0)" surface — every later SIM's spec-ref will be re-evaluated for analogous prose-vs-math drifts).
- **Anchor-grounding STOP-D-ANCHOR routing** (every later SIM with golden tables hits the same Convention #8 grep-cite discipline).

## § 7 — STOP-conditions filed (NONE fired at plan-drafting)

Per charter § 6:
- STOP-D (integrity baseline diverges or I1-I7 fails) — **not fired**.
- STOP-H (verify_evidence regresses) — **not fired**.
- STOP-REPLAY (cross-phase replay discrepancy at Stage 0) — Stage 0
  conditional.
- STOP-PIN (Chakazul SHA drift) — **not fired** at plan-drafting
  (byte-equal between Stage-0 pin and probe re-fetch).
- STOP-D-ANCHOR (Quad4 anchors ungroundable) — Stage 1b conditional.
- STOP-DET (Taichi forward conv not bit-exact) — Stage 1b conditional.
- STOP-FFT (FFT silent non-determinism) — Stage 1b conditional.
- STOP-LFS (R2 push fails) — Stage 1b conditional.
- STOP-PBT (PBT invariant fails at example budget) — Stage 1c conditional.
- STOP-CAT-X (tolerance row exceeds budget cap) — Stage 0 + Stage 1b conditional.
- STOP-I7 (allowlist extension breaks guard) — Stage 2 conditional.
- STOP-K2-AT-HEAD — **not fired** at plan-drafting (verified at probe §1).
- STOP-PROSE-MATH (further math drifts in §6.3) — Stage 1b conditional.
- STOP-TIER3-DIR (first `tools/diagnostics/tier3/` creation collides) — Stage 1b conditional.
- STOP-DB (D-B fork → operator) — **not fired** at plan-drafting
  (resolved on FACT-citation).

## § 8 — Cumulative repo-state snapshot

| Surface | Count at HEAD `d5587b4aa8a2…` |
|---|---|
| Phase-3 audits in `docs/_audits/phase-3/` | 18 (`progress.md` + 8 common-3dgs + 7 render-similarity + 2 lenia [D-B investigation + probe]); this commit adds the lenia plan-drafting landing → 19; commit-4 SHA back-fill is in-place edit, count unchanged |
| Phase-3 charters in `docs/phases/sub-phase-phase-3-*` | 2 (common-3dgs + render-similarity); this commit adds lenia → 3 |
| Phase / sub-phase tags at HEAD | 6 (phase-0/1/2 + lfs-architecture + common-3dgs + render-similarity) |
| Integrity baseline | `c19492ad…d22cb52` (0 HARD_FAIL / 14 SOFT_WARN), byte-identical |
| I1-I7 | hold |
| `continuous-ca/lenia/` | **does NOT exist at HEAD** (Stage 1a creates it) |
| `references/Chakazul-Lenia/` | **does NOT exist at HEAD** (Stage 1b creates it) |
| `tools/diagnostics/tier3/` | **does NOT exist at HEAD** (Stage 1b creates it) |

## § 9 — Forward-routing

- Stage 0 dispatch READY. Stage 0 conditional gates: STOP-REPLAY,
  STOP-CAT-X (tolerance-budget cap probe for continuous-ca).
- D-B / D-MUT-SCOPE / D-DET RESOLVED-IN-CHARTER on FACT; D-FFT / D-TAG
  carry default leans + decision-by stages (Stage 1b for D-FFT, Stage 2
  for D-TAG).
- Convention #12 SHA back-fill is the optional commit-4; back-fills
  this audit's `head_sha:` row to the commit-3 SHA (where charter +
  this audit + progress entry land together). The probe's `head_sha:`
  was already back-fillable at commit-2 time (it lands referencing
  commit-1's SHA `1f7ec42a4bfa…`).

— Audit ends —

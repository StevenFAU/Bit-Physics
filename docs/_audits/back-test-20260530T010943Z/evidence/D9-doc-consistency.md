---
audit: back-test-20260530T010943Z
dimension: D9 — Doc-internal consistency + amendment-seam sweep
pin: 4ee0ea9
worktree: /home/otacon/Projects/bp-audit-2
worktree_head: 4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9
note: |
  Live docs at HEAD 4ee0ea9 are byte-identical to pin: `git diff --name-only HEAD -- docs/`
  returns empty (the only working-tree modifications are LFS fixture binaries +
  one golden generator under tools/, NOT docs). docs/_audits/** EXCLUDED (frozen).
posture: READ-ONLY; verdicts honest; NO sampling (checked == denominator).
prior_evidence: /home/otacon/Projects/bp-audit/docs/_audits/back-test-20260529T124759Z/evidence/D9-doc-consistency.md
date: 2026-05-29
---

# D9 — Doc-internal consistency + amendment-seam sweep (HEAD 4ee0ea9)

Universe = LIVE docs: `docs/architecture.md`, `docs/phases/**`, `docs/planning/**`,
`docs/conventions/**`, `docs/sim-specs/**`, `docs/common/**`, `docs/testkit/**`,
`docs/integrity/**`, `docs/diagnostics/**`. `docs/_audits/**` EXCLUDED (frozen, read
for evidence only). `file:line` relative to pin `4ee0ea9`.

Tasks 5–8 docs (mass-spring-cloth / neural-ca / pinn-poisson / 3dgs-mpm) are NEW vs the
prior run and are fully re-enumerated.

## Re-test verdict table (prior findings + dispatch-named markers)

| ID | sev | location file:line | claim | observed at HEAD | verdict |
|---|---|---|---|---|---|
| M-9 | MAJOR | architecture.md:56,1838,1841,2155,2847,2875,2926 (§9.6 + playbook) | spec names per-phase `tools/dispatch/preflight-phase-<N>.py`; invocation `python tools/dispatch/preflight-phase-<N>.py` | only `tools/dispatch/preflight-phase.py` exists (single file; `<N>` is a CLI arg). :2155 names a literal `preflight-phase-4.py` that does NOT exist. :1965 itself correctly says `tools/dispatch/preflight-phase.py` (single file) — internal self-contradiction. | **LIVE** (unchanged from prior D9-1) |
| M-10 | MAJOR | architecture.md:854 (§3.5 backward-compat note) | "earlier ten-gate formulation … historical contract for Phase 0 / Phase 1 sims" | Phase-0 RD-2D shipped 13 gates (landing record); Phase-1 sims shipped gates 1–3 only (F.2:2860 / §11.2:1984 / D.6:2608 / phase-1-plan.md:26). NO sim was ever held to a 10-gate (1–10) contract. Doc-consistency framing: :854 contradicts §3.5 body (13 gates) + the locks. (D7 owns gate-count token math; D9 owns the cross-section framing.) | **LIVE** (unchanged from prior D9-3) |
| M-11 | MAJOR | sim-specs/continuous-ca/lenia/spec-ref.md:6,70,75,237,282 | "Stage 1a posture: STUB" + 3× `TODO(Stage-1b)` | lenia FULLY LANDED (Stages 0→2, sub-phase-phase-3-lenia-landing audit). `tools/testkit/golden/derivations/lenia-kernel.md` EXISTS; Quad4/growth grep-cited at Stage-1b commit 11d82b6. STUB banner + all TODO(Stage-1b) markers STILL PRESENT (lenia spec-ref last touched at 11d82b6 Stage-1b, banner carried forward, never cleaned). | **LIVE** (unchanged from prior D9-7) |
| M-12 | MAJOR | sim-specs/lattice-spin/ising-classical/spec-ref.md:6,71,89,227 | "Stage 1a posture: STUB" + 2× `TODO(Stage-1b)` | ising-classical FULLY LANDED (sub-phase-phase-3-ising-classical-landing audit). spec-ref is a COMPLETE 13-section doc (`## 1`..`## 13` verified). `tools/testkit/golden/derivations/ising-onsager.md` EXISTS. spec-ref ONLY ever touched at Stage-1a commit a4e1a20 (`git log` = 1 commit) — never updated post-landing. STUB banner + TODO(Stage-1b) markers FROZEN. | **LIVE** (unchanged from prior D9-8) |
| m-19a | MINOR | architecture.md:114-116 (ToC) | ToC lists Appendices A, B, C | Doc has Appendices A–G (D Shared invariants :2396, E Agent playbook :2675, F Operating model :2838, G Convention catalog :2947) all EXIST; ToC under-lists D/E/F/G. | **LIVE** (unchanged from prior D9-6) |
| m-19b | MINOR | architecture.md:1984 (§11.2) | "Phase 1 … ships gates 1–3 only per §11.7 deferral" | §11.7 (:2075 "Ongoing"; :2083 Deferred-item ownership table) has NO gate-deferral row. The gate-deferral authority is §3.5:854 / D.6:2608 / F.2:2860 / phase-1-plan.md:26. Cross-ref points at the wrong section. | **LIVE** (unchanged from prior D9-5) |
| m-19c | MINOR | architecture.md:49 (v2.2 changelog) | v2.2 §2.7 entry: "(was in Appendix D § D.2.3 in v2.2; consolidated v2.3)" | v2.2 changelog block forward-refs a v2.3 action; self-referential "in v2.2" inside the v2.2 block. Retroactive-edit anachronism. | **LIVE** (unchanged from prior D9-9) |
| m-19d | MINOR | architecture.md:559 (§2.11) vs phase-3-plan.md:20 | §2.11:559 lists Phase-3 infra cases "tasks 1 / 2 / 9"; plan:20 lists "tasks 1, 2, 9, 10" | Task-10 (phase-close) is in the plan's infra-surrogate list but absent from spec §2.11:559. Benign scope-wording drift. | **LIVE** (unchanged from prior D9-10) |
| BT-3 | (reconciled) | architecture.md:1967 (§11.1) vs :2608 (D.6) | §11.1 "thirteen gates" RD-2D vs D.6 "Phase 1 gates 1–3 only, 4–13 deferred" | Different subjects (Phase-0 RD-2D vs Phase-1 broad sweep); RD-2D recorded 13 GREEN per landing-2026-05-19 record. NON-DEFECT on the §11.1↔D.6 axis. | **RECONCILED (still holds)** |
| common-3dgs sub-lead | (reconciled) | sub-phase-phase-3-common-3dgs.md:161 vs phase-3-plan.md | "thirteen gates pass" + §2.11 surrogate routing in same sentence | Not in tension; only Gate-14 (cross-stack) is replaced by §2.11 surrogates. Lead's :57 line-cite is mislocated (actual routing at plan:20). | **RECONCILED (still holds)** |

## NEW findings (tasks 5–8 docs + endemic stub-banner sweep)

| ID | sev | location file:line | claim | observed | remediation |
|---|---|---|---|---|---|
| D9N-1 | MAJOR | sim-specs/continuous-ca/neural-ca/spec-ref.md:7-8,89,117,126,128,224,259 | "Stage 1a posture: STUB with `TODO(Stage-1b-D)`/`TODO(Stage-1b-B)`/`TODO(Stage-1c)` markers"; §9:128 "MEASURED D↔B render-similarity … `TODO(Stage-1c)`"; :126 "lock the L2 bound … `TODO(Stage-1b-D)`" | neural-ca FULLY LANDED closed-with-shifted-6 (task-6-neural-ca.md landing). spec-ref WAS edited through Stage 1c (commit 06acd3a "gate-14 D↔B render-similarity measured + locked"; Stage 1b-D 0fa7511 "canonical checkpoint + locked values") — yet the STUB banner + 7 TODO markers calling for work that LANDED were carried forward through every edit and never removed at landing. | strip the Stage-1a STUB banner; replace each `TODO(Stage-X)` with the landed value / cross-ref, or delete the marker. |
| D9N-2 | MAJOR | sim-specs/learned-dynamics/pinn-poisson/spec-ref.md:7 | "Stage 1a posture: STUB with `TODO(Stage-1b)` markers where values are measured (training-loss EFECT band, perf wall-clock)" | pinn-poisson FULLY LANDED closed-with-shifted-8 (task-7-pinn-poisson.md). EFECT band locked at Stage 1b-PINN commit 2297268; spec-ref edited at that commit but STUB banner carried forward, not removed at landing. | strip STUB banner at landing; the EFECT/perf values are measured and live in the landed tables/registry. |
| D9N-3 | MAJOR | sim-specs/neural-rendered/3dgs-mpm/spec-ref.md:8,135,235,242,252 | "Stage 0 posture: SKELETON with `TODO(Stage-1b)` markers"; :135 "`TODO(Stage-1b): per-anchor numeric values → tools/testkit/golden/tables/3dgs-mpm-coupling.json`"; :242 "`TODO(Stage-1c): final argv + CI shape`"; :252 "`TODO(Stage-2): final reconciliation.`" | 3dgs-mpm FULLY LANDED closed-with-shifted-8 — the Phase-3 FINALE (task-8-3dgs-mpm.md). spec-ref edited through Stage 1b (1dbae8d). `tools/testkit/golden/tables/3dgs-mpm-coupling.json` EXISTS (verified); CI job `test-3dgs-mpm` GREEN; Stage-2 landing audit filed. SKELETON banner + `TODO(Stage-1b/1c/2)` markers (incl. an explicit `TODO(Stage-2): final reconciliation`) all FROZEN though every referenced stage landed. | strip SKELETON banner + all 4 TODO markers; the coupling table/CI/landing all exist. |
| D9N-4 | MINOR | sim-specs/neural-rendered/3dgs-mpm/spec-ref.md:235 | "Tier-3 coupling diagnostic at `tools/diagnostics/tier3/3dgs-mpm/`" | Broken path. The landed Tier-3 dir is `tools/diagnostics/tier3/gs_mpm/` (digit-leading-dir → `gs_mpm` import-alias pattern; full tier3 listing: gs_mpm, ising_classical, lenia, mass_spring_cloth, neural_ca, pinn_poisson, rigid_body_pedagogical). `tier3/3dgs-mpm/` does NOT exist. | correct the path to `tools/diagnostics/tier3/gs_mpm/`. |
| D9N-5 | INFO | mass-spring-cloth + articulated-pedagogical spec-refs | (no stub banner) | The task-4 (rigid-body) + task-5 (cloth) spec-refs carry NO Stage-1a stub/TODO posture banner (clean). This proves the stub-banner-freeze is NOT a universal Phase-3 convention; 5-of-7 landed sims regressed, 2 did not. The defect is a per-sub-phase landing-hygiene miss, not a template requirement. | no remediation; corroborates that D9N-1/2/3 + M-11/M-12 are genuine misses. |

## CRITICAL — LANDED-INVENTORY COUNT reconciliation (BLOCKER-class check)

**Question (carried from prior run):** the prior D9 flagged lenia + ising spec-refs frozen as
"Stage-1a stub" though landed (M-11/M-12), raising whether the landed-inventory OVER-COUNTS by
two. At HEAD (tasks 5–8 also landed), establish the TRUE count of fully-landed Phase-3 sims vs
what the docs CLAIM.

### Independent count of fully-landed Phase-3 SIM sub-phases (method: real non-stub impl + tests + landing audit + capture)

Phase-3 sim tasks per phase-3-plan.md:154-159 + task-3a (§6.3a): 3.1 lenia, 3.2 neural-ca,
3.3 rigid-body (articulated-pedagogical), 3.4 mass-spring-cloth, 3.5 3dgs-mpm, 3.6 pinn-poisson,
+ task-3a ising-classical = **7 sim sub-phases**.

Per-sim landing evidence (all four legs verified):

| sim (task) | real impl (no NotImplementedError stub) | tests | capture (.h5) | landing audit |
|---|---|---|---|---|
| lenia (3.1) | packages/lenia/ 6 src .py, 0 NIE stubs | packages/lenia/tests/* | tests/fixtures/legacy-captures/phase-3-lenia.h5 | sub-phase-phase-3-lenia-landing-2026-05-28T16-00-43Z.md |
| ising-classical (3a) | packages/ising-classical/ 5 src .py, 0 NIE | packages/ising-classical/tests/* | …/phase-3-ising-classical.h5 + captures/ising-classical-ref/metropolis-128sq-…h5 | sub-phase-phase-3-ising-classical-landing-2026-05-28T22-40-00Z.md |
| rigid-body (3.3) | packages/articulated-pedagogical/ 9 src .py, 0 NIE | packages/articulated-pedagogical/tests/* | (Warp; capture in tests) | task-4-rigid-body-pedagogical.md |
| mass-spring-cloth (3.4) | packages/mass-spring-cloth/ C++20 (cloth.{hpp,cpp} + cloth_capture_main.cpp); 0 .py src by design (Stack C) | packages/mass-spring-cloth/tests/python/* | …/phase-3-mass-spring-cloth.h5 | task-5-mass-spring-cloth.md |
| neural-ca (3.2) | packages/neural-ca/ 12 src .py, 0 NIE | packages/neural-ca/python/tests/* | …/phase-3-neural-ca.h5 | task-6-neural-ca.md |
| pinn-poisson (3.6) | packages/pinn-poisson/ 8 src .py, 0 NIE | packages/pinn-poisson/tests/* | …/phase-3-pinn-poisson.h5 | task-7-pinn-poisson.md |
| 3dgs-mpm (3.5) | packages/3dgs-mpm/ 5 src .py, 0 NIE | packages/3dgs-mpm/tests/* | …/phase-3-3dgs-mpm.h5 | task-8-3dgs-mpm.md |

**Independent count = 7 fully-landed Phase-3 sim sub-phases** (every leg present; NO sim has
a residual `raise NotImplementedError` in non-test source — grep across all 7 = 0).

### Docs' CLAIM of what is landed

- `docs/_audits/phase-3/progress.md`: closing entries record closed-with-shifted verdicts for
  ALL 7 sims (lenia "closed-with-shifted-2" :316; ising "closed-with-shifted-2" :527;
  rigid-body "closed-with-shifted-6" :558; cloth "closed-with-shifted-7" :587; neural-ca
  "closed-with-shifted-6" :676; pinn "closed-with-shifted-8" :702; 3dgs-mpm "closed-with-shifted-8"
  :728) + the infra tasks (common-3dgs :83, render-similarity :198). Final line :737:
  "Phase 3 substantively complete (tasks 1-8)."
- `CHANGELOG.md`: per-sim landed sections for cloth (:10), rigid-body (:36), ising (:63), …;
  describes the ising spec-ref as "13-section" (:85) — structurally TRUE (verified `## 1`..`## 13`).

### Verdict — does the overcount-by-two still hold?

**RESOLVED — NO overcount. The landed-inventory is CORRECT at 7; the public tally does NOT
misrepresent what is landed.** The prior run's "over-count by two" hypothesis was about whether
the STUB-banner on lenia/ising spec-refs meant those sims were only scaffolded. **Falsified:** both
have real impl (0 NotImplementedError), full tests, landing audits, and committed captures. The
stub banner is a *documentation-hygiene defect on the spec-ref's own header* (M-11/M-12), NOT an
inventory miscount — the progress/CHANGELOG "landed" tally is accurate.

**However the underlying defect WIDENED, not resolved.** What was a 2-sim stub-banner freeze
(lenia, ising) is now a **5-of-7** stub/skeleton-banner freeze (lenia, ising, neural-ca, pinn,
3dgs-mpm) — the same regression repeated on three of the four NEW tasks-5–8 sims. The 3dgs-mpm
spec-ref even carries an explicit unreconciled `TODO(Stage-2): final reconciliation` (:252) though
the Phase-3 FINALE landed. The internal contradiction is: a landed sim's spec-ref headers itself
as "Stage 0/1a STUB/SKELETON" while its TODO'd artifacts (derivation files, coupling table,
locked bounds, CI jobs) all demonstrably exist on disk. **Not BLOCKER** (inventory truthful), but
a recurring MAJOR doc-consistency miss the landing audits did not catch.

## Coverage (denominators; checked == denominator; NO sampling)

### (a) Locked-decision / settled-choice statements — denominator 14, checked 14
Central registry F.2 (architecture.md, 7 rows) + 7 ancillary locks re-verified at HEAD; all
cross-references resolve. The SOLE contradiction among locked decisions is M-10 (§3.5:854
ten-gate note vs the gates-1–3 / 13-gate locks). All others mutually consistent. Unchanged from
prior run (no Phase-3 sub-phase added a new conflicting lock; the per-sim charters
sub-phase-phase-3-{lenia,ising,rigid-body,cloth,neural-ca,pinn,3dgs-mpm}.md D-class tables are
internally consistent with their landing records).

### (b) ToC vs actual headings — architecture.md denominator 16 ToC lines, checked 16
All 16 ToC entries (architecture.md:101-116) resolve to existing headings. Defect m-19a
(Appendices D/E/F/G exist at :2396/:2675/:2838/:2947 but absent from ToC — under-listing).
Phase-plan ToCs: phase-3-plan.md task→sim map (:154-159) + §6.x section anchors all resolve.

### (c) TODO/STUB/PLACEHOLDER markers in live docs — raw denominator 343, actionable subset enumerated
343 raw `TODO|STUB|PLACEHOLDER|TBD|FIXME|XXX|SKELETON` word-boundary matches across live docs
(by-file breakdown computed). The overwhelming majority are correctly-forward-scoped (un-dispatched
phase-4/5/6 plans; stack-D/E sub-phase charters for un-landed work; prose uses of "stub"). The
D9-actionable subset = **done-but-still-marked markers in LANDED-sim spec-refs**, fully enumerated:
- lenia spec-ref: 5 markers (banner + 2 TODO(Stage-1b) work-DONE + Tier-3 list + closing line) → M-11
- ising spec-ref: 4 markers (banner + 2 TODO(Stage-1b) work-DONE + closing line) → M-12
- neural-ca spec-ref: 8 markers (banner + TODO-1b-D/1b-B/1c work-DONE) → D9N-1
- pinn-poisson spec-ref: 1 marker (STUB banner; EFECT locked) → D9N-2
- 3dgs-mpm spec-ref: 5 markers (SKELETON banner + TODO-1b/1c/2 work-DONE) → D9N-3
Total done-but-marked across the 5 landed-sim spec-refs = 23 stale markers. Cloth + rigid-body
spec-refs carry ZERO such markers (D9N-5).

### (d) Duplicate section numbers within a doc — denominator 28 docs scanned, 0 real duplicates
architecture.md, phase-0..6 plans, master-catalog, sub-phase-conventions, all 17 spec-refs, all
sub-phase charters scanned with full numbered-heading-token extraction (boundary-disambiguated).
Initial regex flagged phase-4 "4.2" — disambiguated as 4.2 vs 4.2.P (distinct). CLEAN across the
entire doc set.

### (e) Amendment-seam consistency (half-applied) — architecture.md changelog 36 REVISED/NEW entries, checked 36
- §9.6 (NEW, preflight): definition prescribes per-phase `preflight-phase-<N>.py`; the single-file
  `preflight-phase.py` was actually built (:1965 itself, phase-0-plan, ALL phase plans). HALF-APPLIED
  → M-9. The phantom-file call-sites at :56/:1838/:1841/:2155/:2847/:2875/:2926 were never
  back-fixed to the settled single-file design.
- §3.5 (REVISED 10→13): body lists 13 ✓ APPLIED; back-compat note :854 contradicts the locks → M-10.
- Appendices D/E/F/G (NEW v2.3): sections exist ✓ but ToC call-site stale → m-19a.
- §11.2:1984 "§11.7 deferral" cross-ref dangling → m-19b.
- All other 31 REVISED/NEW seams: definition + call-site verified consistent.
NEW Phase-3 amendment seams checked: the 5 landed-sim spec-refs each declare "Stage X posture"
in their own header-seam; the seam was opened at Stage-1a/0 and NEVER closed at landing for
lenia/ising/neural-ca/pinn/3dgs-mpm (D9N-1/2/3 + M-11/M-12) — half-applied at the sim-doc layer.

## DEFERRED / UNKNOWN / BLOCKED
- None. Every (a)-(e) sub-check, all dispatch-named markers (M-9..M-12, m-19a-d), both
  reconciliations, and the BLOCKER-class landed-inventory reconciliation driven to a verdict with
  file:line evidence. No BLOCKED/UNKNOWN.

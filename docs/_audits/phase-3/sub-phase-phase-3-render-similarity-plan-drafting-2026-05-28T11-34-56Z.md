---
date: 2026-05-28T11-34-56Z
author: phase-3 render-similarity plan-drafting (Claude Code)
subject: Phase 3 second sub-phase plan-drafting — render-similarity
verdict: CONFIRMED
head_sha: pending
prior_sub_phase_tag: v0.2.2-sub-phase-phase-3-common-3dgs
prior_phase_tag: v0.2.0-phase-2
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md
  - docs/phases/sub-phase-phase-3-render-similarity.md
  - docs/phases/phase-3-plan.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md
  - tools/testkit/equivalence/harness.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/mutation/mutmut-config.toml
  - tools/integrity/tests/test_adversarial_coverage.py
evidence_hashes:
  docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md: sha256:7ddd10d4f46ab64e042fd1d0ceb0c6b0877dbbf06684fa32740bd4d449cee923
  docs/phases/sub-phase-phase-3-render-similarity.md: sha256:9306351c0f1ef67b46b4c41fc4519c776942ffb7d80c987a308838686f7d5d75
banked_consumed: []
banked_forward_routed:
  - L-3DGS-1 (common-3dgs Stage 1c — neural-rendered mutation-threshold calibration; render-similarity Stage 1c result feeds the calibration evidence base; final consumer = task-8 / 3dgs-mpm)
  - SIBLING-FIXTURE-LFS (common-3dgs Stage 2 — 12 legacy-capture placeholders; DIFFERENT fixture dir from render-similarity adversarial fixtures, no overlap)
d_class_surfaced:
  - D-LOC tools/testkit/render_similarity/ package (RESOLVED-IN-CHARTER per §3.2.2 most-recent normative + v8 locked-item-3 + v4 amendment-4 concurrence; §6.2 file-form is stale; surface-only — no phase-3-plan.md edit)
  - D-WEIGHTS LPIPS pretrained weights (lean — lazy runtime-fetch + CI cache; Stage 1b; STOP-WEIGHTS if LFS-vendoring forced)
  - D-DET render-similarity determinism class (lean — bit-exact / same-stack-same-hw with CPU-only LPIPS + pinned weights; MEASURE at Stage 1b)
  - D-ANCHOR three independent-reference anchors (PSNR hand-derivation; SSIM Wang 2004 Eq. 13; LPIPS Zhang 2018 BAPPS tiny-subset OR self-consistency + 1 published; STOP-D-ANCHOR if un-anchorable without large fetch)
  - D-TAG intermediate tag v0.2.3-sub-phase-phase-3-render-similarity (lean — YES; §D.2 (a)+(b) STRONGLY met: 3 PyPI deps + gates all Phase-4 neural sims; operator-pushed; I7 allowlist extension at Stage 2)
---

# Plan-drafting landing audit — sub-phase-phase-3-render-similarity

**Verdict: CONFIRMED.** Plan ready for Stage 0 dispatch with no operator-
pending external-state gates. CONFIRMED (not SHIFTED) because:
- No operator-pending git-SHA pin gates this sub-phase (no upstream vendored;
  probe §2.2); the pre-dispatch-review was settled at common-3dgs Stage 0
  ([[phase-3-common-3dgs-plan-drafting-landed]]; `docs/_audits/phase-3/progress.md:31,36`).
- D-LOC is RESOLVED at plan-drafting via the §3.2.2 most-recent-normative
  ruling (charter § 5 D-LOC + § 1.3); the §6.2 + §3.1-deliverable-map drift
  is SHIFTED-surface-only (mirrors common-3dgs §6.1 stale-API-name pattern,
  not the K-2 pre-banked-fix pattern).
- D-WEIGHTS, D-DET, D-ANCHOR, D-TAG carry default leans + rationales +
  decision-by stages — the matured cadence's normal posture.

No HARD RULE 2 STOP fired against plan-drafting. STOP-D-ANCHOR / STOP-WEIGHTS
/ STOP-DET / STOP-PYPI / STOP-CLI / STOP-SCHEMA / STOP-MUT / STOP-LOC-OVERRIDE
/ STOP-REPLAY / STOP-D / STOP-H are filed in the charter as Stage-0 / 1a / 1b
/ 1c / 2 conditional STOPs.

## § 1 — Commit chain (this plan-drafting session)

| Commit | Artifact | Path |
|---|---|---|
| 1 | probe report | `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md` |
| 2 | charter + this audit + progress.md entry | `docs/phases/sub-phase-phase-3-render-similarity.md` + this file + `docs/_audits/phase-3/progress.md` |
| 3 (optional) | Convention #12 SHA back-fill | this audit (`head_sha` row) — terminal artifact, never `--amend` |

Probe sha256 `7ddd10d4…cee923`; charter sha256 `9306351c…d5d75` — both
recorded in front-matter `evidence_hashes` and verifiable by `verify_evidence`
at this audit's back-filled `head_sha` (= commit-2 SHA, where probe + charter
both exist).

## § 2 — Anchor-probe state checks (FACT)

All re-run at HEAD `01764a6` (Convention M — `git rev-parse HEAD` ==
`git rev-parse origin/main`; no successor commit yet):

| Check | Result |
|---|---|
| Tags `v0.0.0-phase-0` / `v0.1.0-phase-1` / `v0.2.0-phase-2` / `v0.2.1-sub-phase-lfs-architecture` / `v0.2.2-sub-phase-phase-3-common-3dgs` | all five resolve (`727ffb9b` / `99085650` / `fd214456` / `8f4dea30` / `07aa1f5c`) |
| Integrity Cat 1–5 sweep | **0 HARD_FAIL / 14 SOFT_WARN**; full-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — **byte-identical** to baseline |
| verify_evidence — Phase-3 audits, all eight | 0-fail across plan-drafting (4/0), probe (0/0), stage-0-BLOCKED (7/0), stage-0 CONFIRMED (12/0), stage-1a (12/0), stage-1b (14/0), stage-1c (16/0), landing (22/0) — see probe §1.1 |
| verify_evidence — prior phase / sub-phase landings | no new regression vs common-3dgs probe baseline; pre-existing phase-0/1/2 checkpoint/blocked-replay fails (head_shas not present in repo) are HISTORICAL |
| `uv sync --all-packages` | clean (`pytest`, `ruff`, `mutmut`, `pytest-timeout`, `pytest-cov`, `toml` dev extras present) |
| `find tools/testkit -name 'render_similarity*' -o -name '*render_similarity*'` | **empty** (neither candidate location exists; D-LOC unconstrained by HEAD — probe §3.1) |
| `grep -n 'render_similarity\|render-similarity' docs/phases/phase-3-plan.md` | **57 matches** (full scope coverage; both §3.2.2 package form and §6.2 file form appear → D-LOC drift confirmed) |

**Invariants I1–I7 hold at HEAD.** I3 (integrity baseline) byte-identical;
I1 (verify_evidence) no-regression on Phase-3 stage audits + prior landings;
I4 (append-only) — no published audit edited; I6 (Convention #12) — back-fill
is a separate commit (commit 3, never `--amend`); I7 (no agent-pushed tags) —
this session pushes no tag.

## § 3 — Second-sub-phase determination (dependency-graph re-anchor)

The §3.1 deliverable map (`docs/phases/phase-3-plan.md:319-334`) has two
co-equal hard-blocking infrastructure roots — task-1 common-3dgs (blocks
task-8; **LANDED** at `v0.2.2-sub-phase-phase-3-common-3dgs`) and task-2
render-similarity (blocks task-6 + task-8). Common-3dgs is **complete** at
HEAD; render-similarity is the **remaining** infrastructure root. The §4.1
"dependencies first" + listing order (`docs/phases/phase-3-plan.md:737-770`)
that ratified task-1-first reaches the same conclusion in reverse: with
task-1 done, task-2 is the next dependency-floor item before any sim
(task-6 / task-8 are HARD-dependent on task-2). The re-anchor produces **no
different conclusion** → the HARD RULE 2 "first-choice-differs" STOP does
**not** fire; render-similarity is the second sub-phase. D-A (carried-over
from common-3dgs) is therefore SETTLED, not re-litigated here.

## § 4 — D-LOC resolution evidence (charter § 5 D-LOC)

**Plan-internal conflict (FACT):**
- §3.2.2 (`docs/phases/phase-3-plan.md:375`): `tools/testkit/render_similarity/metrics.py`
  — package form. Most-recent normative statement (Interface contracts
  section). Concurred by v8 locked-item-3 (`:64`) + v4 amendment-4 (`:75`).
- §6.2 (`:1212`, deliverable A `:1254`) + §3.1 deliverable map (`:324`):
  `tools/testkit/equivalence/render_similarity.py` — file form, stale per
  the v8/v4 amendments above.

**Resolution evidence:**
- Probe §3.1: neither form exists at HEAD; D-LOC unconstrained by Convention
  M (no HEAD wins).
- §3.2.2 is the latest normative statement; v8 + v4 amendments concur.
- Phase-4 WU-C consumes from this surface (§3.2.2 `:375` "Phase 4 WU-C
  extends this surface") — the package form gives room for the surface to
  grow (`metrics.py`, `harness_mode.py`, `_anchors/`, etc.) without splitting
  across `equivalence/`.
- Consumer import path stability: `from render_similarity import psnr, ssim,
  lpips` is the contract task-6 / task-8 will import; the import path must
  be stable and documented.

**Decision (RESOLVED-IN-CHARTER):** `tools/testkit/render_similarity/`
package form. Stale §6.2 + §3.1 references are surfaced as DESIGN-SHIFTED;
NOT edited into `phase-3-plan.md` (the K-2 carve-out in common-3dgs Stage 0
was a *pre-banked* cleanup-D1 fix; this drift is not pre-banked, parallel to
common-3dgs's own §6.1 stale-API-name pattern that the common-3dgs charter §1.3
surfaced rather than edited).

## § 5 — Stage-0 / Stage-1+ external preconditions (none operator-pending)

Unlike common-3dgs plan-drafting (which surfaced TWO operator-pending Stage-0
gates: Inria SHA pin + pre-dispatch-review), render-similarity has **none**:

| Gate candidate | Status |
|---|---|
| Git-upstream SHA pin (probe §2.2) | **NOT APPLICABLE** — no git upstream vendored; deps are PyPI (handled at Stage 0 via WEB-fetched values, probe §3.2) |
| Pre-dispatch-review (`docs/_audits/phase-3/pre-dispatch-review-*.md`) | **RATIFIED-REMOVED** at common-3dgs Stage 0 (`docs/_audits/phase-3/progress.md:31,36`); does NOT regate this sub-phase |
| Cross-phase replay `--prior-phase phase-2` (charter Stage 0 deliverable) | NOT an operator gate — Stage 0 itself runs it; success expected (last verified GREEN at common-3dgs landing); [[replay-needs-lfs-cache-recovery]] mitigation forward-carried |
| PyPI dep advisories | probe §3.2 WEB: lpips 0.1.4 zero advisories; scikit-image 0.26.0 zero open advisories — clean at probe time; Stage 0 re-verifies (Convention #8) |

→ Plan-drafting verdict is **CONFIRMED** (not SHIFTED). No operator action is
required between this plan-drafting landing and Stage-0 dispatch.

## § 6 — D-class surfaced (default leans; operator routes)

See charter § 5 for full rationale.

- **D-LOC**: RESOLVED-IN-CHARTER → `tools/testkit/render_similarity/` package
  (§ 4 above).
- **D-WEIGHTS**: lean — lazy runtime-fetch + CI cache step; decision-by
  Stage 1b; STOP-WEIGHTS if LFS vendoring forced.
- **D-DET**: lean — bit-exact / same-stack-same-hw with CPU-only LPIPS +
  pinned weights; MEASURE at Stage 1b; STOP-DET → re-characterize as
  distributional + EFECT bound (precedent smoke-stack-e gate-14).
- **D-ANCHOR**: lean — PSNR hand-derivation + SSIM Wang 2004 Eq. 13 +
  LPIPS tiny-BAPPS-subset OR self-consistency + 1 published; STOP-D-ANCHOR
  if un-anchorable without large fetch or fabrication (Convention #8).
- **D-TAG**: lean YES → `v0.2.3-sub-phase-phase-3-render-similarity`
  (§D.2 (a) + (b) STRONGLY met); operator-pushed; I7 allowlist extension is
  a Stage 2 deliverable mirroring common-3dgs `c761aa9`.

**Stage-1a probe items (NOT formal D-class):**
- **D-HARNESS-CLI** (probe §3.3): existing `compare_captures` is programmatic-
  only; lean — add `tools/testkit/equivalence/__main__.py` + `--mode` flag,
  dispatch `render-similarity` → `render_similarity.harness_mode.run()`.
- **D-SCHEMA** (probe §3.4): existing tolerance.toml is field-by-field
  {relative, absolute}; lean — additive top-level `[render_similarity.<category>.<sim>]`
  table family + schema extension; no breaking change to existing validators.

## § 7 — Banked items consumed / forward-routed (Convention M)

- **Consumed THIS session:** none. Plan-drafting consumes no banked items
  directly; the pre-dispatch-review-RATIFIED-REMOVED + D-A-SETTLED leaning
  on common-3dgs precedents are **inheritance**, not banking-consumption.
- **L-3DGS-1** (common-3dgs Stage 1c, `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md`):
  "Neural-rendered category mutation threshold may need calibration; revisit
  at task-8 dispatch with the 3DGS-MPM consumer providing additional pixel-
  exact rotation / SH coverage." Render-similarity's Stage 1c mutation result
  feeds INTO this calibration evidence base (the metric module's internal
  kill rate is one data point; task-8's consumer-site coverage is the other).
  Forward-routed to task-8 plan-drafting consumption; NOT consumed here.
- **SIBLING-FIXTURE-LFS** (common-3dgs Stage 2, `docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-landing-2026-05-28T11-12-05Z.md`):
  12 pre-existing `tests/fixtures/legacy-captures/` placeholders from
  `v0.1.0-phase-1`. Render-similarity's adversarial fixtures live under
  `tools/testkit/render_similarity/tests/fixtures/adversarial/` (charter
  §1.1 item 5; probe §3.5) — a DIFFERENT dir; no overlap. Sibling sub-phase
  remains independently routable; not consumed here.

## § 8 — §6.2 internal drift surfaced (re-framed, not edited into phase-3-plan.md)

Probe §4 / charter §1.3 catalog **four** §6.2-internal drifts:

1. **Module location** — `tools/testkit/equivalence/render_similarity.py`
   (file) vs `tools/testkit/render_similarity/metrics.py` (package); §3.2.2
   most-recent-normative + v8/v4 amendments concur on the package form.
2. **Branch / PR ceremony** — `BASE BRANCH: phase-3-integration` +
   `phase-3/task-2-…` + `gh pr create` (`:1201-1202`, `:1273`) superseded by
   v8 trunk-based (`:46`) + the matured Stage 1a/1b/1c/2 cadence.
3. **Adversarial-fixture path** — v9's `tools/integrity/tests/fixtures/adversarial/cat3_wrong_render_similarity/`
   (`:1250`) silently breaks the integrity meta-test contract (probe §3.5);
   re-routed to testkit-local `tools/testkit/render_similarity/tests/fixtures/adversarial/`
   with its own meta-test.
4. **Pre-dispatch-review** — v9 `:34` required for first dispatch; ratified-
   REMOVED at common-3dgs Stage 0 (`docs/_audits/phase-3/progress.md:31,36`).

All four re-frame cleanly under the matured cadence. None require a
`phase-3-plan.md` edit (the D1-narrow-carve-out + K-2 precedent — only
pre-banked fixes touch the plan; these drifts are surfaced for transparency,
parallel to how the common-3dgs charter handled §6.1's stale-API-name drift).

## § 9 — Forward-routing

- **Operator-pending:** none for plan-drafting → Stage-0 dispatch. The
  charter records D-WEIGHTS / D-DET / D-ANCHOR / D-TAG default leans + a
  decision-by stage for each; operator may invert any lean at the relevant
  decision-by stage without re-opening plan-drafting.
- **Subsequent Phase-3 sub-phases** (lenia, rigid-body, cloth, NCA,
  pinn-poisson, 3dgs-mpm, common-warp-maturation, landing) re-framed under
  this cadence at their own plan-drafting; §4.1 (`docs/phases/phase-3-plan.md:681-701`)
  is the default order; D-B (catalog stack-drift) re-anchored per-sim at
  each dispatch.
- **No tag from this session** (plan-drafting is not a landing; I7).
  Stage 2 proposes `v0.2.3-sub-phase-phase-3-render-similarity` for
  operator push.
- **Stage 0 dispatch is READY.** D-LOC resolved; D-A SETTLED (carried-over);
  pre-dispatch-review RATIFIED-REMOVED; no SHA pin gate; PyPI advisories
  clean; integrity baseline byte-identical; I1–I7 hold; verify_evidence
  no-regression across all Phase-3 audits.

---
date: 2026-05-28
author: phase-3 render-similarity plan-drafting (Claude Code)
sub_phase: sub-phase-phase-3-render-similarity
phase: phase-3
head_sha_at_draft: 01764a6a462e7f15b8a1a68e494744c380c31e86
prior_sub_phase_tag: v0.2.2-sub-phase-phase-3-common-3dgs
prior_phase_tag: v0.2.0-phase-2
version: charter-v1 (plan-drafting)
posture: >
  Second Phase-3 sub-phase. Introduces the render-similarity metric module
  (PSNR / SSIM / LPIPS / `ms_ssim` shell) + harness "render-similarity" mode
  under tools/testkit/, the remaining infrastructure root after task-1
  common-3dgs. Per the matured per-sub-phase cadence (plan-drafting → Stage 0 →
  1a / 1b / 1c → Stage 2), this charter inherits §6.2 + §3.2.2 + §2.12 + §3.5 +
  §6.0 from `docs/phases/phase-3-plan.md` unchanged-by-citation and re-frames
  the v8 single-agent-sequential branch/PR machinery + one stale surface
  (§6.2's module location). Hard-blocks task-6 (3.2 NCA D↔B equivalence) and
  task-8 (3.5 MPM-3DGS golden-render gate). DRAFT ONLY — Stages execute under
  operator-ratified D-class routings. Every execution commit preserves
  invariants I1–I7, append-only audits, trunk-based commits to main, no
  agent-pushed tags (I7).
---

# Sub-phase: Phase-3 render-similarity (task-2) — CHARTER

> **This is a plan, not an execution.** Plan-drafting verdict **CONFIRMED**
> (subject to its own audit) — the probe + charter are sound and Stage 0 may
> dispatch. It does **NOT** mean render-similarity exists. Every concrete
> claim is tagged FACT / INFERENCE / WEB and cites full repo-relative
> `path:line`. Probe FACTs live in
> `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-probe-2026-05-28T11-34-56Z.md`;
> this charter summarizes, re-frames, and routes. DELIVERABLES / OUT OF SCOPE /
> ANCHOR-PROBE content is **inherited** from `docs/phases/phase-3-plan.md:1189-1280`
> (§6.2) + §3.2.2 (`docs/phases/phase-3-plan.md:373-405`) + §2.12 (`:228-230`) +
> §3.5 (`:988-1007`) + §6.0 (`:1017-1069`); it is NOT re-authored here.

## § 1 — Scope and posture

**(FACT)** This sub-phase introduces **one infrastructure deliverable family**:
the **render-similarity metric module + harness mode** under `tools/testkit/`.
Scope owner: `docs/phases/phase-3-plan.md:1189-1280` (§6.2 task-2 prompt) +
the §3.2.2 interface contract (`:373-405`) + §2.12 quality floors (`:228-230`).
Phase-3 scope table row "task-2 → 3.x" (`docs/phases/phase-3-plan.md:324`);
v8 locked-item-3 (`:64`) + v4 amendment-4 (`:75`) co-name the location.

**Why it is second (FACT + INFERENCE).** The §3.1 deliverable map
(`docs/phases/phase-3-plan.md:319-334`) has exactly two hard-blocking
infrastructure roots — task-1 common-3dgs and task-2 render-similarity, co-
equal (neither depends on the other). Common-3dgs has **LANDED** at
`v0.2.2-sub-phase-phase-3-common-3dgs` (the §4.1 default order plus D-A's
ratified "hold task-1 first"); render-similarity is the **remaining** root and
the natural second sub-phase. Both `task-6` (3.2 NCA D↔B equivalence) and
`task-8` (3.5 MPM-3DGS golden-render gate) — i.e. **every Phase-3 sim with
neural-rendered output** — consume render-similarity as a HARD dependency
(`docs/phases/phase-3-plan.md:324`). Locking it next clears the
infrastructure floor of Phase 3 before any sim task dispatches.

**Posture (FACT — non-negotiable).** Convention #8 (no fabrication; grep-verify
every claim — explicitly: do NOT fabricate PyPI versions or LPIPS reference
values); Convention M (re-anchor citations against HEAD before edit); append-
only audits (NEVER edit a published `docs/_audits/**` file); trunk-based
commits to `main` (v8 amendment `docs/phases/phase-3-plan.md:46`); I7 (no
agent-pushed tags). Existing Phase-0/1/2/3 conventions take precedence over
§3.2 prescriptions (§0.3, `:138-140`): probe is the verification gate — follow
discovered pattern, document SHIFTED if it differs. **Cross-phase replay
needs LFS cache recovery** in agent sessions ([[replay-needs-lfs-cache-recovery]]).

### § 1.1 — In scope

1. **Render-similarity metric module** at `tools/testkit/render_similarity/`
   (charter § 1.3 / probe §3.1 — package form per §3.2.2 governs over the §6.2
   file-form drift):
   - `metrics.py` exposing `psnr(image_a, image_b) -> float` (sentinel for
     identical pairs), `ssim(image_a, image_b) -> float` (via
     `scikit-image.metrics.structural_similarity`), `lpips(image_a, image_b,
     net: Literal['alex','vgg'] = 'alex') -> float` (via `lpips` PyPI package,
     lazy-loaded), `ms_ssim(image_a, image_b) -> float` (Phase-4 WU-C shell —
     `NotImplementedError` until Phase 4 per `docs/phases/phase-3-plan.md:380`).
   - Input validation: (H,W,C) NumPy arrays; uint8 [0,255] OR float32 [0,1]
     (auto-detect by dtype); shape mismatch → `ValueError`; wrong dtype →
     `ValueError`; lazy-load heavy deps (LPIPS network) on first call.
2. **Harness "render-similarity" mode** at `tools/testkit/equivalence/harness.py`
   (mode-dispatch surface — exact integration form is a Stage-1a probe item;
   probe §3.3). Pairs frames by index, applies PSNR/SSIM/LPIPS per pair,
   compares against tolerance.toml's `psnr_min` / `ssim_min` / `lpips_max` for
   the given tolerance-key. Reports pass/fail per frame and aggregate.
3. **tolerance.toml schema additions** (schema only — no Phase-3 rows; tasks 6
   and 8 add rows) — exact additive-extension shape is a Stage-1a probe item
   (probe §3.4: render-similarity thresholds are NOT relative/absolute
   tolerances; need a distinct additive section).
4. `tools/testkit/pyproject.toml` deps pinned (probe §3.2 WEB-fetch values):
   `lpips==0.1.4`, `scikit-image>=0.26`, `torch` (declare; pin within `lpips`'s
   compatibility window).
5. **Adversarial fixtures** for render-similarity, **DESIGN-SHIFTED** under the
   testkit module under test (`tools/testkit/render_similarity/tests/fixtures/adversarial/`
   with a parallel meta-test) — NOT under `tools/integrity/...` (probe §3.5).
6. **Independent-reference anchors** for the metric implementations (D-ANCHOR):
   PSNR hand-derivation, SSIM Wang 2004 Eq. 13, LPIPS Zhang 2018 BAPPS subset
   (or self-consistency + 1 published reference).
7. **v9 infrastructure-task discipline** (`docs/phases/phase-3-plan.md:1247-1252`):
   smoke contracts; tolerance-budget Phase-3 carryover (already opened at
   common-3dgs Stage 0); mutation baseline **≥ 0.85** (NOT 0.80 — neural-sim
   gating per `docs/phases/phase-3-plan.md:1248`); evidence-hashes in audits;
   append-only verified by `git diff --name-status v0.2.2-sub-phase-phase-3-common-3dgs HEAD --
   docs/_audits/`.
8. Shared-file updates (sequential — edit directly, no patches):
   `CHANGELOG.md` (additive entry); `docs/glossary.md` (PSNR / SSIM / LPIPS /
   perceptual loss); `.github/workflows/python-strict.yml` (new
   `test-render-similarity` job per `docs/phases/phase-3-plan.md:1268-1269`,
   invoke pytest directly per §2.14 `:237-239`).
9. Tests, Cat-2 doc↔impl contract (`docs/testkit/equivalence.md` or
   probe-discovered equivalent), `README.md` "Render-similarity mode" section
   in `tools/testkit/equivalence/`.

### § 1.2 — Out of scope (inherited verbatim intent, §6.2 `docs/phases/phase-3-plan.md:1225-1228`)

- Per-sim tolerance rows (tasks 6 and 8 add at their own dispatch).
- Additional perceptual metrics beyond PSNR / SSIM / LPIPS (the `ms_ssim` shell
  ships shape-only; **`NotImplementedError` until Phase 4** per `:380`).
- Render-similarity in determinism harness (wrong tool — that harness is for
  intra-stack determinism class declarations, not cross-image similarity).
- Vendoring of git upstreams (none — deps are PyPI, see probe §2.2).

### § 1.3 — Inherited-vs-reframed (the §6.2 prompt has stale surfaces — FACT)

The charter inherits §6.2's DELIVERABLES content but re-frames stale surfaces
(probe §4); these are **surfaced, not edited into `phase-3-plan.md`** (parallel
to the common-3dgs charter's §6.1-internal-drift handling):

| §6.2 surface | Stale form | Governing form (charter follows) |
|---|---|---|
| Module location | `tools/testkit/equivalence/render_similarity.py` (`docs/phases/phase-3-plan.md:1212`, deliverable A `:1254`) + §3.1 row 2 (`:324`) | `tools/testkit/render_similarity/metrics.py` package per §3.2.2 (`:375`) + v8 locked-item-3 (`:64`) + v4 amendment-4 (`:75`) — **§3.2.2 governs on conflict; v8/v4 amendments concur** |
| Branch / PR ceremony | `BASE BRANCH: phase-3-integration`, `phase-3/task-2-render-similarity`, `gh pr create`, MERGE PROTOCOL (`:1201-1202`, `:1273`) | trunk-based to `main` (v8 amendment `:46`); per-task PR cycle → matured Stage 1a / 1b / 1c / 2 cadence |
| Adversarial-fixture path | `tools/integrity/tests/fixtures/adversarial/cat3_wrong_render_similarity/` (v9 amendment `:1250`) | testkit-local `tools/testkit/render_similarity/tests/fixtures/adversarial/` with its own meta-test mirroring `tools/integrity/tests/test_adversarial_coverage.py` — render-similarity is not an integrity check; placing the fixture under `tools/integrity/...` would silently break the integrity meta-test contract (probe §3.5) |
| Pre-dispatch-review gate | required for first dispatch (v9 `:34`) | RATIFIED-REMOVED at common-3dgs Stage 0 (`docs/_audits/phase-3/progress.md:31,36`) — does NOT regate this sub-phase |

## § 2 — Stage decomposition (matured cadence)

> Cadence: **plan-drafting** (this session, ~3-4 commits) → **Stage 0**
> (pre-flight + anchor re-check + PyPI pinning + cross-phase replay) →
> **Stage 1a** (scaffold + RED tests + failing-tests-hash) → **Stage 1b**
> (implementation + 3 anchors + adversarial fixtures + thirteen-gate +
> determinism + shared-file updates) → **Stage 1c** (mutation baseline ≥ 0.85
> + verdict landing + evidence-hash audit) → **Stage 2** (I7 allowlist + closing
> sweep + sub-phase landing audit + tag proposal). Audit folder: `docs/_audits/phase-3/`.

### Stage 0 — pre-flight + anchor re-check + PyPI pin + cross-phase replay (~2–3 commits)

- **Entry preconditions:** HEAD = this plan-drafting chain tip or successor;
  tags resolve (v0.0.0-phase-0 / v0.1.0-phase-1 / v0.2.0-phase-2 /
  v0.2.1-sub-phase-lfs-architecture / v0.2.2-sub-phase-phase-3-common-3dgs);
  integrity baseline `c19492ad…d22cb52` held; verify_evidence on this
  plan-drafting landing PASS. **Pre-dispatch-review gate REMOVED** (settled at
  common-3dgs Stage 0); **no external git-SHA pin gate** (no upstream vendored
  by render-similarity, probe §2.2).
- **Probe shape:** re-anchor §6.2 + §3.2.2 + §2.12 surfaces against HEAD
  (Convention M); **cross-phase audit replay** `replay_prior_phase --prior-phase
  phase-2 --audit docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md --gates
  integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,
  tolerance-budget` (v9 first-action `docs/phases/phase-3-plan.md:18`;
  carry the [[replay-needs-lfs-cache-recovery]] mitigation forward — repopulate
  `.git/lfs/objects/<2>/<2>/<oid>` from byte-identical working-tree if the
  smudge fails); re-fetch PyPI versions (`lpips`, `scikit-image`,
  `torch`-via-`lpips`-compat) + security-advisory check (Convention #8).
- **Deliverables:** ratify D-WEIGHTS / D-DET / D-ANCHOR / D-TAG routings into
  a Stage-0 amendment block (mirrors common-3dgs Stage 0 + lfs-architecture
  precedent); record probed PyPI pins as FACT in the Stage-0 audit (the deps
  themselves do NOT land at Stage 0 — Stage 1b adds them to
  `tools/testkit/pyproject.toml` alongside the implementation, mirroring how
  common-3dgs Stage 0 pinned the Inria SHA but Stage 1b did the vendoring);
  tolerance-budget Phase-3 carry-forward (already opened at common-3dgs
  Stage 0 — verify, do NOT re-open); Stage-0 checkpoint audit + Convention #12
  back-fill (separate commit, never `--amend`).
- **Acceptance:** replay `ok=True` 8/8; integrity baseline held; I1–I7 hold;
  PyPI versions pinned + advisories clean; D-class routed.
- **Failure response:** replay discrepancy → **BLOCKED**, surface; integrity /
  invariants regression → STOP-D; lpips/scikit-image yanked-or-CVE → STOP, file
  blocker (do not improvise an alternate package).
- **Exit:** all gates clear; ready for scaffold.

### Stage 1a — scaffold + RED tests (~2–3 commits)

- **Entry:** Stage 0 exit clean.
- **Probe shape (Stage-1a-specific):**
  - **D-HARNESS-CLI**: how does the harness mode dispatch? Inspect
    `tools/testkit/equivalence/harness.py` — at HEAD it is programmatic-only
    (probe §3.3). Choose: (a) add `tools/testkit/equivalence/__main__.py` +
    `--mode` flag dispatching `render-similarity` → calls into
    `render_similarity.harness_mode.run()`, OR (b) ship the mode as a separate
    entry point under `render_similarity/__main__.py`. **Default-lean (a)** —
    keeps a single CLI surface per §3.2.2 invocation. Operator may invert at
    Stage 1a if consumer (task-6/task-8) shape argues otherwise.
  - **D-SCHEMA**: how does `tolerance.toml` extend? Probe §3.4 found the
    existing schema is field-by-field numeric; render-similarity wants
    `{psnr_min, ssim_min, lpips_max}` per-sim. **Default-lean**: add a top-
    level `[render_similarity.<category>.<sim>]` table family + extend
    `tolerance-schema.json` additively (no breaking change to existing
    `[defaults.…]` / `[overrides.…]` validators). Operator may route to
    "separate `render-similarity-tolerance.toml` file" at Stage 1a if cleaner.
  - **Consumer pattern**: are task-6 + task-8 expected to call the metric
    functions directly from their own test code, or only via the harness mode?
    Both — the **function-level** surface is the hard dependency (probe §3.3
    last paragraph); the harness mode is the dispatch convenience.
- **Deliverables (RED-first, TDD spec §1.3):** the
  `tools/testkit/render_similarity/` package skeleton + smoke-contract tests
  for every public symbol (`psnr` / `ssim` / `lpips` / `ms_ssim`) committed
  **failing/red first**, with the failing-tests output recorded under
  `tools/testkit/failing-tests-evidence/render-similarity-<UTC>.txt` and
  **`Failing-tests-output: …` + `Failing-tests-output-hash: sha256:…`** in the
  commit footer (v9 amendment `docs/phases/phase-3-plan.md:22`); failure mode
  is `ModuleNotFoundError` / `NotImplementedError` (NOT collection error); the
  harness-mode + tolerance-schema scaffolds (D-HARNESS-CLI + D-SCHEMA picks
  encoded in the Stage-1a checkpoint audit).
- **Acceptance:** RED committed with the output hash grep-verifiable; I2 / I3 /
  I1 still PASS on the otherwise-unchanged tree; D-HARNESS-CLI + D-SCHEMA
  decisions recorded as Stage-1a SHIFTs (§0.3 — follow-discovered) if they
  diverge from default leans.
- **Failure response:** STOP, surface.
- **Exit:** RED test surface exists; implementation can go green in 1b.

### Stage 1b — implementation + 3 anchors + adversarial fixtures + thirteen-gate (multi-commit)

- **Entry:** Stage 1a RED recorded.
- **Probe shape (Stage-1b-specific):**
  - **D-WEIGHTS** decision (charter § 5).
  - **D-DET** measurement: run two-image PSNR / SSIM / LPIPS in same-stack-
    same-hw, compute byte-identical outputs across two runs. If LPIPS forward-
    pass produces non-bit-exact across two `model.eval()` no-grad calls on the
    same input (CPU; pinned weights; seed fixed) → re-characterize as
    `distributional` with an EFECT bound (Hard-Rule-2; precedent
    smoke-stack-e). Do NOT assume; measure.
  - **D-ANCHOR** sourcing: locate at least 3 independent-reference anchors.
    LPIPS-anchor risk: BAPPS is large — lean to **tiny published subset** or
    **self-consistency anchor + 1 published reference value**. If no LPIPS
    reference can be grounded without a large fetch → **STOP**, file blocker;
    Convention #8 forbids fabricating a number.
- **Deliverables:**
  - Implement `psnr` / `ssim` / `lpips` / `ms_ssim`-shell per §3.2.2
    (separate impl commit whose footer references the Stage-1a failing-tests-
    commit SHA + `Failing-tests-output-hash-witnessed: sha256:<same-hex>`,
    `docs/phases/phase-3-plan.md:937`).
  - Add PyPI deps to `tools/testkit/pyproject.toml`: `lpips==0.1.4`,
    `scikit-image>=0.26`, `torch` (declare; pin within `lpips` compat window).
  - Harness "render-similarity" mode wired per D-HARNESS-CLI Stage-1a decision;
    `tolerance.toml` schema additions per D-SCHEMA Stage-1a decision.
  - 3 independent-reference anchors landed (D-ANCHOR resolution):
    - **Anchor 1 (PSNR):** hand-derivation tied to `PSNR = 20 log10(MAX_I /
      sqrt(MSE))` on a textbook pair.
    - **Anchor 2 (SSIM):** Wang et al. 2004 "Image Quality Assessment: From
      Error Visibility to Structural Similarity" Eq. 13 — test SSIM on a
      known-textbook pair with citation.
    - **Anchor 3 (LPIPS):** Zhang et al. 2018 BAPPS subset value OR self-
      consistency anchor + one published reference value, fully cited.
  - **Adversarial fixtures** under `tools/testkit/render_similarity/tests/fixtures/adversarial/`:
    (a) image pair that should be flagged DIFFERENT but where a buggy SSIM
    might pass; (b) image pair that should be flagged IDENTICAL but where a
    buggy LPIPS might fail. Each fixture dir carries a `manifest.json` with
    `{ "metric": "ssim"|"lpips"|..., "expected_classification":
    "different"|"identical", "fixture_files": [...] }`. Meta-test
    `tools/testkit/render_similarity/tests/test_adversarial_coverage.py`
    iterates fixtures, runs the appropriate metric, asserts the
    classification.
  - Shared-file updates: `CHANGELOG.md` (additive entry under existing or new
    `### sub-phase-phase-3-render-similarity`); `docs/glossary.md` (PSNR /
    SSIM / LPIPS / perceptual loss); `.github/workflows/python-strict.yml`
    new `test-render-similarity` job (invoke pytest directly per §2.14
    `docs/phases/phase-3-plan.md:237-239`, mirroring the
    `test-common-3dgs` job pattern at `.github/workflows/python-strict.yml`);
    `tools/testkit/equivalence/README.md` "Render-similarity mode" section;
    `docs/testkit/equivalence.md` (or probe-discovered equivalent) for the
    Cat-2 doc↔impl contract.
- **Acceptance:** the **thirteen gates pass** per spec §3.5 v2.4 / §5.4
  Layer-4 ref (`docs/phases/phase-3-plan.md:988-1007`); render-similarity is
  an **infrastructure task** so it is subject to the infrastructure-
  verification surrogates per spec §2.11 (NOT the sim Gate-14 cross-stack
  equivalence — there is no Phase-1/2 render-similarity counterpart; gate-14
  N/A, mirrors common-3dgs); strict-mode ruff/mypy/pytest green; I1–I7 hold;
  D-DET measurement recorded.
- **Failure response:** STOP + surface; never widen a tolerance / threshold
  to pass a gate (`docs/phases/phase-3-plan.md:1006`); D-ANCHOR un-anchorable
  without a large fetch → STOP, file blocker.
- **Exit:** API green; deps pinned; CI job live; anchors + adversarial
  fixtures landed.

### Stage 1c — mutation baseline ≥ 0.85 + verdict landing (~2–3 commits)

- **Entry:** Stage 1b green.
- **Probe shape:** mutation-target registration check (`tools/testkit/mutation/mutmut-config.toml`
  must gain a `[targets.render_similarity]` section, threshold = 0.85, runner
  pytests `tools/testkit/render_similarity/tests/`; mirrors the
  `[targets.common_3dgs]` block at common-3dgs Stage 1c).
- **Deliverables:** per-gate verdict report; **mutation-testing baseline**
  for the new `tools/testkit/render_similarity/` target — `bash
  tools/testkit/mutation/run-mutation.sh --target render_similarity --threshold 0.85`,
  baseline JSON committed at `tools/testkit/mutation/sub-phase-phase-3-render-similarity-<UTC>.json`
  (`docs/phases/phase-3-plan.md:1248`); evidence-hashes (sha256 of the
  mutation JSON + adversarial-fixture pack + failing-tests evidence) in the
  Stage-1c audit (`:1252`); D-DET re-confirm; Stage-1c checkpoint + back-fill.
- **Acceptance:** mutation **≥ 0.85**; all gates CONFIRMED; render-similarity
  determinism matches the declared D-DET; evidence-hashes resolve.
- **Failure response — mutation score brackets (charter pre-route):**
  - **≥ 0.85**: CONFIRMED.
  - **0.78–0.849**: SHIFTED-bank-not-widen — bank a calibration lesson
    (rationale: equivalent-mutant ceiling on library-delegated `scikit-image`
    / `lpips` forwards; mirror common-3dgs L-3DGS-1 banking precedent);
    threshold **UNCHANGED** in `mutmut-config.toml` (anti-pattern per
    phase-3-plan §6.0); forward-route the calibration to task-6 or task-8
    dispatch (their pixel-exact consumer surface may add coverage).
  - **< 0.78**: **BLOCKED** — tighten tests, do NOT widen; STOP-MUT if
    structurally unclosable.
- **Exit:** module verified; ready to land.

### Stage 2 — sub-phase landing audit + tag proposal (~3 commits)

- **Entry:** Stage 1c CONFIRMED (or SHIFTED-banked per § 1c brackets).
- **Probe shape:** invariant verification sweep (I1–I7); integrity +
  verify_evidence + append-only sweeps; I7 allowlist extension probe (D-E
  default-lean YES — tag form `v0.2.3-sub-phase-phase-3-render-similarity`).
- **Deliverables:**
  - The sub-phase landing audit
    `docs/_audits/phase-3/sub-phase-phase-3-render-similarity-landing-<UTC>.md`
    (template § 4 below); CHANGELOG additive `### sub-phase-phase-3-render-
    similarity` under the existing Phase-3 header; `docs/_audits/phase-3/progress.md`
    entry; D-class disposition table; banked lessons; SHA back-fill.
  - **I7 allowlist extension** at `tools/testkit/lfs_migration/test_i7_no_agent_tags.py`
    (`OPERATOR_NONPHASE_TAGS`) for `v0.2.3-sub-phase-phase-3-render-similarity`
    (mirrors common-3dgs Stage 2 `c761aa9`); test mutation-probed; 2/2 GREEN.
- **Acceptance:** I1–I7 held; integrity baseline 0 HARD_FAIL (digest will
  shift naturally as new audit files land — gate is **0 HARD_FAIL**, not
  byte-equality, per [[integrity-baseline-digest-method]] / lfs I3);
  verify_evidence GREEN on the landing audit + no regression on prior audits;
  append-only via `git diff --name-status v0.2.2-sub-phase-phase-3-common-3dgs HEAD
  -- docs/_audits/` (S9-PHASE2-3 native to the cadence).
- **Failure response:** STOP on any invariant / baseline regression. If LFS
  push fails (R2 creds / GitHub-LFS budget) — recall the common-3dgs Stage-1c
  precedent: `-c lfs.standalonetransferagent= push` one-shot to GitHub-LFS
  then `git lfs push --object-id --stdin origin` to R2 (M3 mechanism). Render-
  similarity is **unlikely** to write any LFS object (no captures, no large
  weights — `lpips` fetches weights at runtime per D-WEIGHTS lean), but if
  D-ANCHOR resolution requires a small vendored fixture, this is the recovery.
- **Exit state:** sub-phase landed. **Intermediate tag = lean YES** (§ 3);
  operator-pushed only (I7).

## § 3 — Intermediate-tag condition (§D.2)

**(INFERENCE — argued from §D.2 `docs/conventions/sub-phase-conventions.md:251-256`)**
Default is **NO**, but an intermediate non-phase tag is appropriate when the
sub-phase (a) adds an **external dependency**, (b) marks **durable
architecture**, or (c) operator historical significance. render-similarity
satisfies **(a) AND (b) strongly**:

- **(a)** introduces three **PyPI external dependencies** (`lpips`,
  `scikit-image`, `torch`-transitive) that the project did not previously
  carry; a point-release handle aids rollback/citation, mirroring how R2
  earned `v0.2.1-sub-phase-lfs-architecture` and Inria earned
  `v0.2.2-sub-phase-phase-3-common-3dgs` (the §D.2 precedents,
  `docs/conventions/sub-phase-conventions.md:256`).
- **(b)** establishes a **durable metric module** that gates **every** Phase-4
  neural sim (`docs/phases/phase-3-plan.md:1190` "Mutation threshold ≥ 85%
  (higher than standard 80% because false-negatives here let broken neural
  sims ship"); §3.2.2 "Phase 4 WU-C extends this surface" `:375`) — a git-
  archaeology lookup handle for a first-of-kind common testkit surface.

**Lean: tag at Stage-2 landing as `v0.2.3-sub-phase-phase-3-render-similarity`**
(sub-phase-named handle; no `-phase-N` segment, so it satisfies spec § 7.12
and the phase-tag regex correctly rejects it,
`docs/conventions/sub-phase-conventions.md:243,256`). **Operator-pushed only
(I7).** NB: the I7 regression guard's allowlist
(`tools/testkit/lfs_migration/test_i7_no_agent_tags.py`) must gain this tag,
or the in-range tag HARD_FAILs as presumed-agent-pushed
(`docs/conventions/sub-phase-conventions.md:256`) — surfaced for the operator
at the tag decision; the extension lands at Stage 2 (commit shape mirrors
common-3dgs's `c761aa9`). **Routed as D-TAG** (operator ratifies at Stage 2;
default-lean YES). This is **stronger** than common-3dgs's argument
(common-3dgs added 1 external git dep + 1 durable API; render-similarity adds
3 PyPI deps + a module that gates an entire downstream class of sims).

## § 4 — Stage-2 landing-audit template (consumes S9-PHASE2-1/2/3 natively)

**(FACT — lineage)** S9-PHASE2-1/2/3 are phase-close-mechanics refinements
banked at the Phase-2 Stage-9 landing (`docs/_audits/phase-2/landing-2026-05-26T02-30-00Z.md:73,101,171`)
and consumed by the common-3dgs charter § 4 + landing audit. Inherited
verbatim by this sub-phase:

1. **(S9-PHASE2-1 — independent-sub-phase model is native.)** The landing
   audit **consolidates the stage audits already on `main`** (Stage 0 / 1a /
   1b / 1c via `evidence_hashes` mapping) — it does NOT re-narrate them; the
   matured cadence *is* the independent-sub-phase model.
2. **(S9-PHASE2-2 — supernumerary-tolerant reconciliation.)** The §6.2-vs-
   execution reconciliation accommodates **additive, well-documented
   supernumerary** outcomes (e.g. an extra documentation page, a Phase-4-WU-C
   `ms_ssim` shell shipped with `NotImplementedError`, a deferred-to-Stage-1a
   D-HARNESS-CLI/D-SCHEMA decision banked as SHIFTED) — it does NOT assume a
   strict 1:1 deliverable↔plan-item match.
3. **(S9-PHASE2-3 — no fictional anchors.)** The template does NOT reference
   `docs/project-state.md` (never existed) or `integrity.scripts.check_append_only`
   (never built). Status is recorded via `CHANGELOG.md` + per-stage audits;
   append-only is verified by `git diff --name-status
   v0.2.2-sub-phase-phase-3-common-3dgs HEAD -- docs/_audits/` (net-new files
   allowed; no prior audit edited or shortened).

## § 5 — D-class decisions (operator routing required)

Each carries a default lean + rationale + decision-by stage. None may be
unilaterally inverted by an execution stage.

### D-LOC — render-similarity module location (RESOLVED-IN-CHARTER)

- **Question:** §3.2.2 (`docs/phases/phase-3-plan.md:375`) names
  `tools/testkit/render_similarity/metrics.py` (package). §6.2 + §3.1
  deliverable map (`:324`, `:1212`, `:1254`) name
  `tools/testkit/equivalence/render_similarity.py` (file). Neither exists at
  HEAD (probe §3.1). Which form does Stage 1a scaffold?
- **Resolution (charter records this):** **`tools/testkit/render_similarity/`
  package** per §3.2.2 (the most-recent normative statement; v8 locked-item-3
  `:64` + v4 amendment-4 `:75` concur). The §6.2 + §3.1-deliverable-map
  references are the **stale** form (parallel to common-3dgs §6.1's
  `GaussianSet` / `forward_splat` staleness handled in the common-3dgs
  charter § 1.3). Consumer import path: `from render_similarity import psnr,
  ssim, lpips` (the stable contract task-6 / task-8 consume). **Surfaced, not
  edited** into `phase-3-plan.md` (the D1 carve-out — plan edits only via
  operator-approved separate commits; this drift is not a pre-banked fix like
  K-2 was).
- **Decision-by:** RESOLVED at plan-drafting (this charter). Stage 1a
  scaffolds per the resolution; the §6.2 stale form is noted as a Stage-1a
  SHIFTED-from-prompt finding (§0.3 follow-discovered) and surfaces in the
  Stage-1a checkpoint.

### D-WEIGHTS — LPIPS pretrained weights handling

- **Question:** `lpips` requires AlexNet / VGG pretrained weights for the
  perceptual forward pass. Vendor the weight blobs into the repo (LFS-scale
  binaries), or lazy-fetch on first call + cache in CI?
- **Lean:** **lazy runtime-fetch + documented CI cache step**. Rationale:
  - Vendoring weights = adding ~ 100-200 MB of binary LFS objects (AlexNet
    ~ 230 MB, VGG ~ 530 MB) → SIBLING-FIXTURE-LFS-class regression risk + R2
    bandwidth pressure.
  - `lpips` package on first call downloads to `~/.cache/torch/hub/checkpoints/`
    (PyTorch hub mechanism). CI caches that path via standard `actions/cache`
    keyed on Python version + `lpips` version.
  - Determinism preservation: same `lpips==0.1.4` pin + same PyTorch hub
    weights download → bit-identical inputs to the forward pass.
- **Decision-by:** Stage 1b (implement under the lazy-fetch posture; if it
  fails CI repeatedly without the cache, route to a small vendored fixture
  weight under a NEW `legacy-fixture-LFS` allowance). **STOP-WEIGHTS** if the
  resolution forces LFS vendoring of full pretrained weights — surface,
  defer-to-operator, do not improvise.

### D-DET — render-similarity determinism class

- **Question:** PSNR / SSIM are pure `numpy` / `scipy` numerical pipelines —
  deterministic. LPIPS is a torch forward-pass through pretrained AlexNet /
  VGG features. Declare `class = bit-exact, scope = same-stack-same-hw` (with
  pinned weights + `model.eval()` + `torch.no_grad()`) or `class =
  distributional` (+ EFECT bound)? Registry row at
  `tools/testkit/determinism/registry.toml`.
- **Lean:** **bit-exact / same-stack-same-hw**, with **MEASUREMENT** at
  Stage 1b. Rationale:
  - PSNR + SSIM trivially bit-exact (numpy op-order preserved across runs).
  - LPIPS forward-pass with pinned weights, `model.eval()`, `torch.no_grad()`,
    CPU-only (no CUDA non-associative parallel reductions): expected bit-exact
    same-stack-same-hw. Precedent [[stack-e-warp-f64-bit-faithful-to-numpy]] —
    pure numeric forward passes through `numpy`-compatible code paths preserve
    bit-exactness.
  - GPU LPIPS (CUDA) would NOT be bit-exact across runs (atomic reductions);
    Stage 1b commits to **CPU-only LPIPS** in CI for the determinism
    declaration. Sim consumers may run LPIPS on GPU for performance but the
    determinism *gate* is the CPU value.
- **Decision-by:** Stage 1b (measure, then lock). If LPIPS CPU-eval is NOT
  bit-exact across two runs with pinned weights / seed → re-characterize as
  `distributional` + EFECT bound (Hard-Rule-2 re-characterization, mirroring
  smoke-stack-e gate-14 precedent).

### D-ANCHOR — independent-reference anchors (3 required)

- **Question:** spec §2.4 + phase-3-plan v9 (`docs/phases/phase-3-plan.md:1251`)
  require **3 independent-reference anchors** for the metric implementations.
  PSNR / SSIM anchors are tractable (textbook hand-derivation + Wang 2004 Eq.
  13 with a known-textbook pair). LPIPS anchor is **load-bearing risk**:
  Zhang et al. 2018's BAPPS dataset is large (~ 5 GB official archive); the
  project must NOT vendor it wholesale.
- **Lean:** at Stage 1b, attempt in priority order:
  1. **Tiny published subset** of BAPPS test pairs with the corresponding
     LPIPS values from the Zhang 2018 paper / supplementary or the official
     `lpips` package examples — a handful of pairs ≤ 100 KB total.
  2. If (1) is not feasible without a large fetch: **self-consistency anchor
     + 1 published reference value** — verify (a) LPIPS(image, image) = 0
     (or ≤ floating-point epsilon, network-architecture-dependent); (b) one
     published value from the paper / official examples reproduces within a
     tight tolerance.
  3. **STOP-D-ANCHOR**: if neither (1) nor (2) can be grounded WITHOUT a large
     fetch or fabrication, **STOP** and file a blocker. Convention #8 forbids
     fabricating a reference number; widening the test to accept any value is
     anti-pattern (`docs/phases/phase-3-plan.md:1006`).
- **Decision-by:** Stage 1b probe.

### D-TAG — intermediate tag `v0.2.3-sub-phase-phase-3-render-similarity`

- **Question:** tag at Stage-2 landing or remain untagged?
- **Lean:** **YES** (§ 3 argument: §D.2 (a) external PyPI dep + (b) durable
  architecture both **strongly** met; lfs-architecture + common-3dgs
  precedents). Operator-pushed (I7); I7 allowlist in
  `tools/testkit/lfs_migration/test_i7_no_agent_tags.py` must be extended (or
  the in-range tag HARD_FAILs) — the extension is a Stage-2 deliverable
  mirroring common-3dgs `c761aa9`.
- **Decision-by:** Stage 2 (operator ratifies).

## § 6 — HARD RULE 2 STOP conditions (sub-phase-specific)

File a blocker in the relevant stage audit; do not improvise through.

- **STOP-D.** Integrity baseline diverges from `c19492ad…d22cb52` (HARD_FAIL
  > 0) at any stage; or any I1–I7 invariant fails. **→ STOP.**
- **STOP-H.** `verify_evidence` regresses on any prior audit (incl. all
  common-3dgs stage audits + the BLOCKED stage-0 artifact). **→ STOP.**
- **STOP-REPLAY.** Cross-phase audit replay `--prior-phase phase-2` discrepancy
  at Stage 0 (`docs/phases/phase-3-plan.md:18`). **→ BLOCKED.** Recovery
  via [[replay-needs-lfs-cache-recovery]] applies BEFORE declaring this
  blocked.
- **STOP-PYPI.** `lpips` / `scikit-image` yanked or carries a CVE
  affecting the pinned version at Stage 0 verify. **→ STOP**, file blocker,
  do NOT improvise an alternate package.
- **STOP-D-ANCHOR.** D-ANCHOR (LPIPS in particular) cannot be grounded
  without a large fetch or fabrication — Stage 1b. **→ STOP**; Convention #8
  + `:1006` forbid fabrication / widening.
- **STOP-WEIGHTS.** D-WEIGHTS resolution forces LFS-vendoring of full
  pretrained AlexNet/VGG weights — **→ STOP**, defer-to-operator (mirrors the
  R2-creds Stage-1c precedent at common-3dgs).
- **STOP-DET.** D-DET measurement (Stage 1b) shows LPIPS CPU-eval is NOT
  bit-exact across two runs with pinned weights / seed — **→ surface and
  re-characterize** as `distributional` + EFECT bound (Hard-Rule-2 re-
  characterization; precedent smoke-stack-e gate-14). Not a hard STOP if the
  re-characterization is well-grounded; STOP only if the EFECT bound cannot
  be derived.
- **STOP-MUT.** Mutation score < 0.78 at Stage 1c (the "BLOCKED" bracket per
  § 2 Stage 1c) and not closable by test-tightening. **→ surface; do NOT
  widen the threshold** (anti-pattern).
- **STOP-LOC-OVERRIDE.** Operator overrides D-LOC at Stage 1a in a way that
  breaks the consumer (task-6 / task-8) import contract (charter § 5 D-LOC) →
  surface, charter records BLOCKED-pending until resolution.
- **STOP-CLI/STOP-SCHEMA.** D-HARNESS-CLI / D-SCHEMA Stage-1a probe finds the
  existing equivalence harness CANNOT support the new mode without a
  destructive refactor of the existing `compare_captures` programmatic
  surface — **→ STOP**, route the consumer pattern explicitly (Stage 1a
  audit), do not improvise.

## § 7 — Risk register

- **R-1 (published-audit append-only).** NEVER edit a published
  `docs/_audits/**` file. Append-only verified by `git diff --name-status`
  (S9-PHASE2-3). A stage that must edit a published audit → STOP.
- **R-2 (PyPI dep-pin drift).** `lpips==0.1.4` is 2021-08-25 vintage; a
  Stage-0-pinned version that yanks/CVEs mid-stage would block. Re-verify
  PyPI status at Stage 0 + at Stage 2 (pre-tag) per Convention #8.
- **R-3 (LPIPS weights cache invalidation in CI).** D-WEIGHTS lazy-fetch
  relies on `actions/cache` keyed on Python version + `lpips` version. A
  cache miss in CI = slow first run (acceptable, not blocking); a cache
  *corruption* would change the perceptual values silently. Stage 1b's
  evidence-hash on the cached weights file mitigates (sha256 the weights file
  on first download; assert match on subsequent runs).
- **R-4 (LPIPS non-determinism between hardware classes).** D-DET locks
  same-stack-same-hw bit-exact. A consumer running LPIPS on GPU will diverge
  from the CI CPU value; surface in the metric's docstring + `docs/testkit/equivalence.md`.
- **R-5 (mutation-score ceiling on library-delegated metrics).** SSIM-via-
  scikit-image + LPIPS-via-torch are opaque to mutmut at the call site;
  equivalent-mutant ceilings are plausible. Charter pre-routes 0.78-0.849 as
  SHIFTED-bank-not-widen, < 0.78 as BLOCKED. Mirrors common-3dgs L-3DGS-1
  banking precedent.
- **R-6 (scope creep into Phase-4 WU-C).** The `ms_ssim` shell ships
  `NotImplementedError` ONLY. Differentiable LPIPS (gradient flow),
  perceptual losses for training (vs evaluation), and multi-scale variants
  beyond `ms_ssim` are OUT (`docs/phases/phase-3-plan.md:380`, §1.2). A stage
  tempted to implement them → STOP, defer to Phase 4.
- **R-7 (integrity cat1/cat4).** This charter + audits are docs (cat4 draft-
  time path:line); any probe report under `tools/testkit/probes/` is
  cat1.intra-repo (full repo-relative paths;
  `evidence_hashes`/`evidence_paths` are YAML **mappings**, not lists —
  [[cat1-scans-probes-evidence-hashes-mapping]]). Run integrity --all +
  verify_evidence before each commit; baseline must hold.
- **R-8 (adversarial-fixture path under integrity/).** v9 amendment
  `docs/phases/phase-3-plan.md:1250` proposes `tools/integrity/tests/fixtures/adversarial/cat3_wrong_render_similarity/`.
  Probe §3.5 finds this would silently break the integrity meta-test
  contract (no `run_cat3_render_similarity` handler). Charter routes the
  fixture pack to the testkit module under test (charter § 1.1 item 5);
  surface only, not a `phase-3-plan.md` edit.

## § 8 — Open questions / forward-routing

- **D-A re-confirm**: common-3dgs Stage 0 settled D-A "hold task-1 first"
  (charter precedent); the §3.1 dep-graph re-anchor under THIS sub-phase
  (probe §0) reaches the same conclusion (render-similarity is the
  natural second sub-phase). No new HARD RULE 2 trigger.
- **D-HARNESS-CLI** + **D-SCHEMA**: Stage-1a probe items (charter § 2 Stage
  1a; default leans documented). NOT formal D-class; encoded in the
  Stage-1a checkpoint audit.
- **L-3DGS-1 banking precedent**: common-3dgs Stage 1c banked
  "neural-rendered category mutation threshold may need calibration; revisit
  at task-8 dispatch with the 3DGS-MPM consumer providing additional pixel-
  exact rotation / SH coverage." Render-similarity's Stage 1c mutation result
  feeds INTO L-3DGS-1's calibration evidence base (the metric module's
  internal kill rate is one input; task-8's consumer-site coverage is the
  other). Not consumed here; forward-routed.
- **SIBLING-FIXTURE-LFS basket**: common-3dgs Stage 2 banked the 12
  pre-existing `tests/fixtures/legacy-captures/` placeholders from
  `v0.1.0-phase-1` for a future `legacy-capture-fixture-lfs-reconciliation`
  sibling sub-phase. Render-similarity touches a DIFFERENT fixture dir
  (`tools/testkit/render_similarity/tests/fixtures/adversarial/`) so there is
  **no overlap**; the sibling sub-phase remains independently routable.
- **Subsequent Phase-3 sub-phases** (lenia, rigid-body, cloth, NCA,
  pinn-poisson, 3dgs-mpm, common-warp-maturation, landing) are re-framed
  under this same cadence at their own plan-drafting; this charter drafts
  only the second. The §4.1 sequence (`docs/phases/phase-3-plan.md:681-701`)
  is the default order; D-B (catalog stack-drift) re-anchored per-sim at
  each dispatch.
- **Any `phase-3-plan.md` spec amendment** (beyond what has already landed
  during common-3dgs) is operator-approved + separate-commit only (never
  unilateral). The §6.2 D-LOC + adversarial-fixture-path drift surfaced
  here is **not edited**; it is recorded in the charter + plan-drafting
  audit as DESIGN-SHIFTED, mirroring the common-3dgs charter §1.3 / §7
  pattern.
- **Operator-pushed tag** at Stage 2 = `v0.2.3-sub-phase-phase-3-render-
  similarity` (D-TAG lean YES, § 3). Agent does NOT push tags (I7); the I7
  allowlist extension is the Stage 2 deliverable.

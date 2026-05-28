---
date: 2026-05-28T12-09-40Z
author: phase-3 render-similarity charter-revision (Claude Code)
subject: Phase 3 render-similarity adversarial-fixture placement — investigation + decision
verdict: DECIDED — testkit-local (charter-v1 placement REAFFIRMED; rationale REWRITTEN on evidence)
head_sha: pending
prior_sub_phase_tag: v0.2.2-sub-phase-phase-3-common-3dgs
integrity_baseline: c19492ad…d22cb52 (0 HARD_FAIL / 14 SOFT_WARN)
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:
  docs/phases/sub-phase-phase-3-render-similarity.md: sha256:3610dc3810fd33e93c92b4c2ec9d213a757bc903cbdf5218cef2fa36bb1f2591
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  docs/architecture.md: sha256:97e70bad3f82800e0c28fb0d28d98ee81fddc5d504a81d68d66dee03d0e4703a
  .github/workflows/integrity.yml: sha256:53af44776a3fc84ea3c25bfc8baa196f830bca6ce34213f6c66b9b90b1370194
  .github/workflows/python-strict.yml: sha256:e40788df8590ec8fb31778045ede924b161a2cada32d65bb138c47518e28038e
  tools/integrity/integrity/runner.py: sha256:0995035e3782b1fc58be3ce23dbe92e7c6b09fb2b0023a2b186b2d9812dfb2ad
  tools/integrity/tests/test_adversarial_coverage.py: sha256:1520c42da1913884a259ade65921c275c9f98eeff018e2fca738da92d3210503
evidence_paths:
  - docs/phases/sub-phase-phase-3-render-similarity.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - .github/workflows/integrity.yml
  - .github/workflows/python-strict.yml
  - tools/integrity/integrity/runner.py
  - tools/integrity/integrity/__main__.py
  - tools/integrity/tests/test_adversarial_coverage.py
  - tools/integrity/tests/fixtures/adversarial/cat3_wrong_goldens/manifest.json
  - tools/integrity/tests/fixtures/adversarial/cat3_wrong_goldens/wrong-cubic-spline.json
  - tools/integrity/integrity/cat3_numerical/golden_values.py
---

# Render-similarity adversarial-fixture placement — investigation + decision

> Resolves one open architectural question on the
> `docs/phases/sub-phase-phase-3-render-similarity.md` charter (charter-v1
> §1.1 item 5, §1.3 table, §7 R-8): where do render-similarity's
> adversarial fixtures belong, and is the integrity Cat-3 handler wired or
> not? Investigation per FACT-cited config + framework evidence. Decision
> follows the rule encoded in the dispatch; no improvised tie-break.

## §0 — Anchor probe (CONFIRMED before the charter is touched)

| Check | Result |
|---|---|
| HEAD | `119feb043944` (== `origin/main`; Convention M — HEAD wins on drift) |
| Tags v0.0.0-phase-0 / v0.1.0-phase-1 / v0.2.0-phase-2 / v0.2.1-sub-phase-lfs-architecture / v0.2.2-sub-phase-phase-3-common-3dgs | all resolve |
| Integrity Cat 1–5 sweep (`python -m integrity --all --mode strict`) | **0 HARD_FAIL / 14 SOFT_WARN**; full-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` — byte-identical to baseline |
| verify_evidence sweep across all 10 Phase-3 audits (incl. the BLOCKED stage-0 + the plan-drafting + probe + investigation predecessors) | **all PASS, 0 fail** |
| I7 invariant test (via testkit dev extras) | 16 passed |
| Adversarial meta-test (`pytest tools/integrity/tests/`) | 56 passed (local; CI-status caveat documented at §1.3 below) |

→ Invariants I1–I7 hold at HEAD. No STOP-D / STOP-H fired. Proceed with
investigation.

## §1 — INVESTIGATION

### §1.1 — Coverage breadth (the crux) — FACT

**Integrity-sweep CI trigger** (`.github/workflows/integrity.yml:5-8`):
```yaml
on:
  push:
    branches: [main]
  pull_request:
```
**No path filters.** Runs on every push to `main` and every PR.

**python-strict CI trigger** (`.github/workflows/python-strict.yml:5-8`):
```yaml
on:
  push:
    branches: [main]
  pull_request:
```
**No path filters.** Same trigger conditions.

**`test-common-3dgs` job** (`.github/workflows/python-strict.yml:67-96`) —
the existing per-module test job that the future `test-render-similarity`
job will model on. Lives inside the `python-strict.yml` workflow file, so
it inherits the workflow-level `on:` trigger — no path filters. Runs every
push to main + every PR.

**Coverage-breadth verdict (FACT):** the integrity sweep and (the future)
`test-render-similarity` job run with **IDENTICAL** trigger conditions —
both every push to `main`, both every PR, neither path-filtered. There is
**NO** breadth or frequency advantage to placing fixtures under
`tools/integrity/...`. An indirect regression (a `scikit-image` / `torch`
bump, a util refactor render_similarity imports, any change with NO touch
to `render_similarity/` files) is caught equally by both job types because
NEITHER job is path-filtered. The "broader coverage" hypothesis the
dispatch raised is FALSIFIED by the actual CI config.

### §1.2 — Integrity Cat-3 contract — FACT

**What `integrity --all` runs** (`tools/integrity/integrity/runner.py:28-37`):
```python
_REGISTRY: dict[str, CheckFn] = {
    "cat1.intra-repo": run_cat1_intra_repo,
    "cat2.python-exports": run_cat2_python_exports,
    "cat3.golden-values": run_cat3_golden_values,
    "cat4.path-line-assertions": run_cat4_path_line_assertions,
    "cat4.phrase-in-file": run_cat4_phrase_in_file,
    "cat4.api-shape": run_cat4_api_shape,
    "cat5.audit-links": run_cat5_audit_links,
    "catx.tolerance-budget": run_catx_tolerance_budget,
}
```
Hand-registered, named by **semantic category**: citations, contracts,
numerical-golden-values, draft-time grammars, audit-link provenance,
tolerance-budget. The integrity CLI invokes the handlers in `_REGISTRY`
only.

**Cat-3 specifically** is **`run_cat3_golden_values`** (`tools/integrity/integrity/cat3_numerical/golden_values.py`). The fixture under
`tools/integrity/tests/fixtures/adversarial/cat3_wrong_goldens/wrong-cubic-spline.json`
is shaped as a **golden table**:
```json
{
  "algorithm": "cubic-spline-kernel-3d-monaghan",
  "category": "sph-kernel",
  "derivation": { "doc": "...", "upstream": "SPlisHSPlasH", "upstream_sha": "..." },
  "schema_version": "1.0.0",
  "test_points": [
    { "inputs": {"h": 1.0, "q": 0.0},
      "expected": {"W": 999.999, "grad_W_magnitude": 999.999} },
    ...
  ]
}
```
The Cat-3 paradigm is **algorithm + test_points + numerical verification
against a registered evaluator** (e.g. cubic-spline-kernel-3d-monaghan).
Render-similarity is **image-pair classification** (PSNR / SSIM / LPIPS
verdict for an image pair) — a categorically different paradigm.

**Adversarial meta-test contract** (`tools/integrity/tests/test_adversarial_coverage.py`):
the meta-test is NOT a generic discovery loop. It is a series of
**hand-written test functions**, one per fixture family (`test_cat1_*`,
`test_cat2_*`, `test_cat3_*`, `test_cat4_*`, `test_cat5_*`, `test_catx_*`).
Each function:
1. Materializes the fixture in `tmp_path` (with fixture-specific
   directory layout — see e.g. `test_cat3_wrong_goldens_detected`
   `tools/integrity/tests/test_adversarial_coverage.py:86-105`).
2. Invokes the matching `run_catN_*` handler with the right args.
3. Asserts severity + count.

**Wiring corollary (FACT correction to charter-v1):** dropping a new
fixture directory under `tools/integrity/tests/fixtures/adversarial/`
**without** adding a corresponding hand-written test function does NOT
"silently break the integrity meta-test contract" (charter-v1 R-8 / §1.3
claim) — it just sits there inert; nothing iterates fixture directories
auto-discoverably. **Charter-v1's rationale was category-correct on
placement (testkit-local) but incorrect on mechanism (the breakage
hypothesis).**

**Wiring cost for a cat3-style render-similarity handler:** would require
(a) a new check module exposing `run_cat3_render_similarity` (or a new
cat6 with its own subdir/__init__.py + Finding-emitting logic), (b) a new
entry in `_REGISTRY` + `_CATEGORY_ALIASES`, (c) a new hand-written test
function in `test_adversarial_coverage.py` mirroring the existing pattern,
(d) the handler must import the testkit's `render_similarity` package —
creating a tools/integrity → tools/testkit dependency direction that
`tools/integrity/pyproject.toml` does NOT currently take (it depends on
`bit-physics-testkit` for capture types only). This is a substantial
extension, **NOT** the dispatch's hypothetical "bounded clean ~tens of
lines following existing pattern."

**Architecture-spec semantic boundary** (`docs/architecture.md:720-770`):
the integrity-toolkit categories are SEMANTIC — Cat 1 (citations), Cat 2
(contracts), Cat 3 (numerical correctness of vendored algorithm
implementations against golden tables / MMS), Cat 4 (draft-time spec
grammars), Cat 5 (audit-link provenance), Cat X (tolerance-budget).
**Render-similarity is none of these.** Architecture.md positions
`render_similarity/` as a **Layer-0 testkit component**
(`docs/architecture.md:673` — "render_similarity/ — Python-imported subdir
→ underscore (added Phase 4 WU-C); metrics.py psnr, ssim, lpips,
ms_ssim; report.py; tests/"), parallel to `code_verification/`,
`golden/`, `determinism/`, `equivalence/`. It is NOT positioned as part
of `tools/integrity/`.

**Integrity-Cat-N-contract verdict (FACT):** wiring a render-similarity
handler into `_REGISTRY` would (1) bend the framework's semantic
category schema (Cat 3 = golden-value numerical correctness, not
image-pair classification), (2) introduce a new tools/integrity →
tools/testkit dep direction without architectural support, (3) require
hand-writing a new test function in the meta-test (no auto-discovery).
This **fights the framework's design** at three layers.

### §1.3 — CI-status caveat (incidental FACT; pre-existing, not introduced by this work)

`docs/architecture.md:768` declares "**The meta-test is itself part of
CI**" — but **no current CI workflow** invokes `pytest tools/integrity/tests/`.
`integrity.yml` (`.github/workflows/integrity.yml:23-25`) runs
`python -m integrity --all` only (the cat-handlers; NOT the
meta-test). `python-strict.yml` testpaths cover testkit pytest under
`tools/testkit/`, NOT `tools/integrity/tests/`. `.pre-commit-config.yaml`
runs `python -m integrity --cat 4 --staged-only` only. The adversarial
meta-test passes locally (56 passed; verified at §0) but is NOT exercised
in CI at HEAD.

This is a **pre-existing gap between `docs/architecture.md:768` and the live CI
config**, NOT introduced or resolvable by the render-similarity sub-phase.
**Surfaced, NOT a STOP for this charter revision.** Forward-routed as a
banked observation for any future integrity-CI-coverage sub-phase. Has
**no bearing on the placement decision** here, because charter-v2's
testkit-local meta-test IS wired into CI via the future
`test-render-similarity` job in `python-strict.yml` (modeled on
`test-common-3dgs` `:67-96`).

### §1.4 — Single-home vs dual-home — FACT

The hand-written meta-test pattern at
`tools/integrity/tests/test_adversarial_coverage.py` materializes
fixtures into `tmp_path` with fixture-specific layouts. There is NO
shared discovery loop; the meta-test cannot be made to consume
testkit-local fixtures without rewriting the matching test function.
Conversely, the testkit's own pytest can directly read its own fixtures
under `tools/testkit/render_similarity/tests/fixtures/adversarial/`
without going through any integrity machinery.

Dual-home would mean **two copies** of every fixture — one at the
integrity path for a cat3-style handler (if wired) and one at the
testkit path for the metric's own pytest — with no mechanism for keeping
them in sync. Single-home in **testkit** keeps the fixtures co-located
with the metric they verify, identical to the integrity adversarial
pattern's own co-location (Cat 3 fixtures live next to the cat3 handler
in the same `tools/integrity/...` tree). The architectural symmetry
favors testkit-local for a testkit Layer-0 component.

### §1.5 — Plan-author intent signal (semantic vs naming) — FACT

`docs/phases/phase-3-plan.md:1250` (v9 amendment):

> Add fixtures to `tools/integrity/tests/fixtures/adversarial/cat3_wrong_render_similarity/`:
> (a) a pair of images that should be flagged as different but where a
> buggy SSIM might pass; (b) a pair that should be flagged identical but
> where a buggy LPIPS might fail. Adversarial meta-test confirms
> detection.

The `cat3_wrong_` naming convention signals that the v9 amendment author
**intended to file render-similarity under Cat 3**. But Cat 3 is
authoritatively defined at `docs/architecture.md:724`: *"Implementations
of upstream algorithms and PDE solvers match the testkit's golden values
and MMS-derived expected orders of accuracy"* — i.e., golden-value
verification of vendored algorithm ports. Image-pair classification is
**not** within Cat 3's semantic scope, even if naming-by-convention
("cat3_wrong_*") would put it there. The architecture spec (Part III §3.1
`docs/architecture.md:673`) places `render_similarity/` under
`tools/testkit/`, not under integrity. **Architecture-spec authority
governs over phase-plan v9 naming convenience** (Convention M; the
[[architecture-vs-catalog-authority-ruling]] precedent).

The v9 amendment is therefore best read as a **"please cover this with
adversarial fixtures + a meta-test"** instruction — semantically sound —
that named the location by analogy to existing cat3_wrong_* fixtures
without re-checking the framework's semantic boundary. The charter
should honor the intent (mandatory adversarial coverage of the metric's
failure modes via a meta-test) without inheriting the location error.

## §2 — DECISION (per the dispatch's rule)

Applying the decision rule to the §1 facts:

- **#1 (coverage):** integrity sweep and `test-render-similarity` job
  run with **IDENTICAL** trigger conditions (`on: push branches:[main],
  pull_request:`; no path filters in either workflow). The
  "strictly-broader-or-more-frequent" coverage hypothesis is
  **FALSIFIED**. The coverage argument for centralizing in integrity
  **collapses**.
- **#2 (clean extension):** wiring a `run_cat3_render_similarity`
  handler fights the framework at three layers — bends the Cat 1-5 +
  Cat-X semantic category schema (Cat 3 = golden-value numerical
  correctness, not image-pair classification per `docs/architecture.md:724`),
  requires a new tools/integrity → tools/testkit dependency direction,
  requires hand-writing a new test function. **NOT** a bounded, clean,
  one-time extension.
- **#3 (single-home vs dual-home):** the meta-test pattern admits no
  shared discovery; dual-home means two fixture copies with no sync.
  Single-home testkit-local is architecturally symmetric (Cat
  fixtures co-locate with their handlers under integrity; render-
  similarity fixtures co-locate with their metric under testkit).
- **#4 (plan-author intent):** the `cat3_wrong_` naming signaled
  intended adversarial-coverage scope but mis-located it relative to
  Cat 3's authoritative semantic definition (`docs/architecture.md:724`).
  Honor the intent (adversarial fixtures + meta-test), correct the
  location to where architecture.md places the module (`tools/testkit/render_similarity/`).

**Decision rule branch 2 applies:** #1 shows identical breadth/frequency
→ "the coverage argument collapses; charter-v1's testkit-local placement
stands on its tidiness merits." And — independently — branch 3 also
applies: #2 shows wiring fights the framework → testkit-local placement
with the documented small-coverage-gap caveat. Both branches converge on
the same answer.

**Decision (FINAL, evidence-grounded):**

1. **Adversarial-fixture location:**
   `tools/testkit/render_similarity/tests/fixtures/adversarial/` — the
   testkit module under test. Single-home; co-located with the metric.

2. **Meta-test:**
   `tools/testkit/render_similarity/tests/test_adversarial_coverage.py`
   — hand-written test functions (mirroring
   `tools/integrity/tests/test_adversarial_coverage.py` in form),
   directly invoking the `render_similarity.{psnr, ssim, lpips}`
   functions on each fixture and asserting the expected classification.
   No materialize-into-tmp_path step needed (the fixture image pairs
   are read directly).

3. **CI wiring:** the future Stage-1b `test-render-similarity` job in
   `.github/workflows/python-strict.yml` (modeled on `test-common-3dgs`
   `:67-96`; trigger inherits the workflow's path-filter-free
   `on: push branches:[main], pull_request:`) runs the meta-test on
   every push and PR. Coverage is **IDENTICAL** to what an integrity-
   homed fixture pack would provide.

4. **Integrity Cat-N handler:** **NOT WIRED.** No
   `run_cat3_render_similarity` is added to `_REGISTRY`; no new check
   category is introduced. Rationale: render-similarity is not a Cat 1-5
   + Cat-X category (per `docs/architecture.md:720-770`); it is a
   Layer-0 testkit component (per `docs/architecture.md:673`).

5. **Coverage-gap risk register:** because the python-strict workflow is
   **NOT path-filtered**, indirect regressions to the oracle (scikit-
   image / torch bumps, util refactors, any change with no touch to
   render_similarity/ files) are caught by `test-render-similarity` on
   every push/PR identically to how they would be caught under
   integrity-homed placement. **There is no accepted coverage gap.**

6. **Charter-v1 rationale REWRITE (not just placement re-affirm):** the
   prior charter said "would silently break the integrity meta-test
   contract" — that was wrong (§1.2 verdict). Charter-v2 records the
   evidence-grounded rationale: identical CI breadth/frequency + Cat 1-5
   semantic-schema mis-fit + architecture.md Layer-0 placement.

## §3 — Charter-v2 edits required

Logged here so the next session (or a reader of just this audit) can
trace the v1 → v2 diff without re-running the investigation:

| § | Edit |
|---|---|
| front matter | `version: charter-v2 (fixture placement on-evidence + R-7 evidence_paths-list fix); revised 2026-05-28T12-09-40Z` |
| § 1.1 item 5 | reaffirm testkit-local; replace rationale (was: "NOT under tools/integrity/...") with the evidence cite (identical CI breadth/freq + Cat 1-5 semantic schema mis-fit + arch.md:673 Layer-0 placement) |
| § 1.3 row "Adversarial-fixture path" | reframe: the v9 amendment named cat3_wrong_render_similarity/ by analogy to existing cat3 fixtures but the location conflicts with Cat 3's authoritative scope (`docs/architecture.md:724` — golden-value numerical correctness, not image-pair classification); architecture.md:673 governs |
| § 2 Stage 1b deliverable "adversarial fixtures" | clarify CI wiring: meta-test runs under the `test-render-similarity` job in `python-strict.yml` (modeled on `.github/workflows/python-strict.yml:67-96` (test-common-3dgs job)); trigger is `on: push branches:[main], pull_request:` no path filter |
| § 7 R-8 | rewrite from "documented coverage gap" to "naming-convenience drift, NOT coverage gap" — charter-v2 owns: integrity-CI-coverage gap (`docs/architecture.md:768` claim vs live CI config) is pre-existing, render-similarity inherits it on the same terms as every other testkit component; banked observation, not a render-similarity risk |
| § 7 R-7 | FIX: `evidence_paths` is a LIST (not a mapping); `evidence_hashes` is the mapping. The two slots have different shapes; charter-v1's R-7 conflated them. |

(D-LOC stands — `tools/testkit/render_similarity/` package — that
resolution was sound; this revision does not touch it.)

## §4 — Banked / forward-routed

- **Banked observation (NOT a render-similarity STOP):** the
  `docs/architecture.md:768` "the meta-test is itself part of CI" claim is
  not matched by the live CI config (`.github/workflows/integrity.yml`
  runs only `python -m integrity --all`, not `pytest tools/integrity/tests/`).
  Pre-existing gap; render-similarity does not introduce it and does
  not need to close it (its adversarial meta-test runs in CI via
  `test-render-similarity` directly). Candidate sibling sub-phase:
  "integrity-meta-test-ci-wiring" or fold into a future integrity
  hygiene sub-phase.
- **Memory correction:** the
  [[cat1-scans-probes-evidence-hashes-mapping]] note conflates
  `evidence_paths` and `evidence_hashes` shapes. Confirmed via the
  existing common-3dgs Stage-1c audit front-matter
  (`docs/_audits/phase-3/sub-phase-phase-3-common-3dgs-stage-1c-2026-05-28T03-25-29Z.md:10-22`):
  `evidence_hashes:` is a YAML **mapping** (path → sha256); `evidence_paths:`
  is a YAML **list**. The two slots are distinct shapes. To be corrected
  alongside this charter revision.
- **Forward-routed to next stage:** no new D-class items; D-LOC stands;
  D-WEIGHTS / D-DET / D-ANCHOR / D-TAG default leans unchanged; Stage
  1a probe items D-HARNESS-CLI / D-SCHEMA unchanged.

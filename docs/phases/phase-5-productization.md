<!-- integrity-allow: cat4.forward-reference; phase plan asserts forward-looking paths that resolve as Phase 5 lands; n/a -->

# Phase 5 — Productization (execution plan)

> **Version:** 7.0 (dispatch-hardening pass, May 18 2026)
> **Date:** 2026-05-17 (v6); 2026-05-18 (v7 amendments)
> **Status:** dispatch-ready (contingent on Phase 4 partial-or-full landing + § 0 preconditions).
> **Repo:** `github.com/StevenFAU/Bit-Physics` (owner: Steven Cohen).
> **Spec anchor:** `gpu-sims-design-spec-v2.md` v2.4 Part X (Shipping and distribution) and § 11.6 (Phase 5 roadmap entry) + spec § 3.8 v2.4 (bootstrap-style verification posture for productized artifacts) + spec Appendix D + spec Appendix G + spec Appendix E.
> **Execution model:** Sequential single-agent.

> **v8 verification-hardening amendments (May 18 2026, post-design-spec v2.4):** Normative; supersedes conflicting text below.
>
> **CROSS-PHASE AUDIT REPLAY (sub-phase 5.1 first action):** Before any work in sub-phase 5.1 (the first sub-phase), the agent runs `python -m integrity.scripts.replay_prior_phase --prior-phase phase-4 --audit docs/_audits/phase-4/landing-<UTC>.md --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget`. Discrepancy → BLOCKED; surface to operator. Per spec § 7.5.
>
> **BOOTSTRAP-STYLE VERIFICATION (sub-phase 5.3 onward, per spec § 3.8 v2.4 amendment):** Productization workflows package sims that already exist. The verification of "did productization preserve correctness" is therefore a re-entry into Layer 0's verification machinery FROM the productized artifact. Concretely, for each productized artifact (PyPI package in 5.3; binary in 5.2; web demo in 5.1; render in 5.4; preprint in 5.5 — though only 5.1/5.2/5.3 can run programmatic captures):
>
> 1. Install/load the artifact in a fresh, isolated environment (clean venv for PyPI; clean Docker image for binaries; clean headless browser context for web demos).
> 2. Run the artifact to re-emit its canonical capture (the same descriptor that landed in Phase 1 / Phase 2 / Phase 3 / Phase 4).
> 3. Pass the re-emitted capture through the testkit's equivalence harness against the in-repo canonical capture for that sim at the per-sim tolerance (§ 2.6).
> 4. The equivalence verdict is the productization gate.
>
> This means each productization sub-phase's "did the artifact work" question collapses to "does the testkit accept the artifact's output as equivalent to the in-repo canonical." No new verification primitives; just re-application of existing ones from Phase 0.
>
> **PERF-LEDGER (cross-environment):** Each sub-phase that re-emits a canonical capture appends a perf-ledger row marked with the environment (`pypi-fresh-venv`, `binary-docker`, `webgpu-headless-chromium`). The closing audit flags any > 2× regression from the source-stack baseline. Surfaces packaging-overhead regressions.
>
> **OPERATOR-ONLY TAG PUSHING:** Each sub-phase's commit-3 (SHA back-fill + audit closing) does NOT push the phase tag. The closing audit at the end of sub-phase 5.5 proposes `v0.5.0-phase-5`; operator pushes after independent review.
>
> **EVIDENCE-PATH VERIFICATION:** Each sub-phase's audit (commit-3) cites evidence paths + hashes (re-emitted capture sha256, equivalence-report sha256, dist artifact sha256). The closing audit runs `verify_evidence.py` against every sub-phase audit; failure → REFUTED.
>
> **APPEND-ONLY CHECK:** The closing audit runs append-only check against `v0.4.0-phase-4` tag.
>
> **PHASE-PLAN REVIEW:** Phase 5 introduces customer-facing artifacts; the bootstrap-style verification is novel. Per spec § 7.4 Convention E-addendum, owner runs phase-plan-review session BEFORE dispatch. Review audit at `docs/_audits/phase-5/pre-dispatch-review-<UTC>.md`.

> **v7 dispatch-hardening amendments (May 18 2026):** This block is normative.
>
> **DISPATCH MODEL CLARIFIED:** One coordinator chat (claude.ai). **Five Claude Code sessions** — one per sub-phase — with the **SAME agent role identity** across them. This resolves the ambiguity in v4 amendment 5 between "one session for the whole phase" and "five sessions, one per sub-phase." Reconciling factors:
> 1. Each sub-phase's three-commit decomposition (Convention-A + Convention-12: new-files, modify-existing, SHA-back-fill) is a natural session boundary.
> 2. CI gate between commit 2 and commit 3 of each sub-phase requires waiting for green; the agent ends after commit 2 and a fresh session writes commit 3 once CI returns.
> 3. The "same agent role identity" means: each new session reads `docs/_audits/phase-5/progress.md` at start and treats prior sub-phases as completed work to consume, not to redo. The agent does not re-anchor against Phase 4 every session; it re-anchors against the prior sub-phase's commit-3 SHA.
>
> Practical sequence per sub-phase:
> 1. Coordinator dispatches Claude Code session N with the sub-phase N prompt (Appendix A's ACTION 1/2/3 dispatches Appendix B/C/D/E/F at the right boundaries).
> 2. Session N agent runs `python tools/dispatch/preflight-phase.py 5` (Action #1).
> 3. Session N agent runs sub-phase N's workflow: probe, build, commit 1 (new files), commit 2 (modify existing), wait for CI green.
> 4. If CI green: commit 3 (SHA back-fill + audit closing). End session. Coordinator dispatches session N+1.
> 5. If CI red: remediation report, end session, surface to owner.
>
> **PYPI NAMESPACE RESERVATION:** Owner reserves `bit-physics-*` prefix on PyPI as trusted publisher BEFORE Phase 5 dispatches. This is a one-time owner action enumerated in the dispatch-readiness checklist § 3.
>
> **PRODUCTIZATION OPT-OUT FLAG:** Spec § 8.2 v2.1 amendment added § 13 to the sim-spec template. Phase 0 Block 1 (per v0.9 amendment) commits the template with § 13 included. Every Phase 1+ sim's `spec-ref.md` § 13 has the five-boolean opt-out YAML. Each sub-phase reads § 13 to determine qualifying sims; non-qualifying are DEFERRED, not patched.
>
> **ACTION #1:** Every Claude Code session in this phase starts with `python tools/dispatch/preflight-phase.py 5`. Exit 0 → proceed.
>
> **CONVENTION NAMES** per spec Appendix G. Earlier references to "Convention A" and "Convention #12" resolve to Convention-A and Convention-12 in the catalog.
>
> The v4 review amendment block below is retained for changelog tracking.

> **v4 review amendments (apply before dispatch):**
>
> 1. **PyPI namespace `bit-physics-<category>-<sim>` confirmed.**
> 2. **Productization opt-out mechanism per spec § 8.2 section 13.**
> 3. **Audit-file paths standardized per spec § 8.1.**
> 4. **Report front-matter per canonical YAML schema (spec § 7.5).**
> 5. **Single-agent dispatch (May 18 2026 amendment) — resolved by v7 above into "five sessions, one agent role identity, sequential."**

This document is the architectural and logistical contract for Phase 5. The V2 spec gives the *what* and the *why*; this plan gives the *how* and the *who*. It exists to front-load decisions so the Claude Code agent executing each sub-phase can act mechanically — probe, instantiate locked templates, commit, report — without having to invent shape under time pressure.

---

## 0. Preconditions

This plan does not run until all three hold:

1. **The V2 design spec is committed** to `docs/architecture.md` per its own § 8.1 documentation hierarchy.
2. **This phase plan is committed** to `docs/phases/phase-5-productization.md`. The coordinator and every agent session read it from this path.
3. **Phases 0–4 have shipped to `main`.** Layer 0 testkit, Layer 1 integrity toolkit, Layer 2 diagnostic toolchain, Layer 3 common-* modules, and Layer 4/5/6 sims are present. Partial Phase 4 completion is acceptable — each sub-phase covers what qualifies at its dispatch time.

---

## 1. Phase scope

Per spec § 11.6, Phase 5 builds five productization pipelines, dispatched serially:

- **5.1** Web deploy pipeline for every qualifying Stack B sim.
- **5.2** Binary release pipeline for every qualifying Stack C sim.
- **5.3** PyPI release pipeline for every qualifying Stack D and Stack E sim.
- **5.4** Render passes pipeline (one canonical sim, extensible).
- **5.5** First academic-preprint extraction pipeline (one canonical sim, extensible).

The phase ships **pipelines**, not exhaustive coverage. Sub-phases 5.1–5.3 fan out automatically (matrix builds); 5.4 and 5.5 ship the pipeline plus one canonical sim as proof. Remaining coverage is post-phase work using the same pipelines.

The phase deliberately does not ship to live destinations. Every workflow has two job groups: `build-and-validate` (CI-gated) and `deploy` (gated on explicit `workflow_dispatch` + secret presence). Phase 5 acceptance is on `build-and-validate` only.

**A note on verification posture.** Phase 5 is the first phase where the spec's central verification machinery (MMS for code verification, GCI for solution verification, Roy 2005 V&V vocabulary) does not directly apply — Phase 5 builds CI pipelines and tooling, not sims. The pipelines themselves are not PDE solvers; their correctness is functional (does the artifact assemble; does it round-trip through the testkit) rather than mathematical. The plan substitutes three verification surrogates: (a) smoke contracts that exercise each pipeline against qualifying sims end-to-end; (b) capture-roundtrip validation against the testkit's canonical schema, anchoring Phase 5's output to Phase 0's verification primitives; (c) the determinism harness where applicable (binaries, renders). Future phases that ship infrastructure rather than science will face the same gap.

---

## 2. Acceptance criteria

### 2.1 Per-sub-phase gates

Each sub-phase lands when all gates hold:

1. **Spec doc committed** at `docs/productization/<sub-phase-name>.md` following the template in § 5.6.
2. **Pre-implementation probe committed** at `tools/testkit/probes/reports/phase-5-<sub-phase-name>.md` following the template in § 5.7.
3. **Smoke harness committed and verified to fail without implementation** (TDD discipline per spec § 1.3). Agent captures verbatim failing pytest output at `tools/testkit/failing-tests-evidence/phase-5-<sub-phase>-<UTC>.txt` and records sha256 in commit footer per spec § 1.3 step 4. Agent reports "tests verified failing before implementation drafted" as a FACT in completion report along with the output-hash.
4. **`build-and-validate` job group passes CI** on smoke fixture or canonical sim end-to-end.
5. **At least one qualifying sim wired through** per stream-specific criteria in § 6.
6. **Integrity gate does not block.** Cat 1–5 + Cat-X (spec § 3.2 + § 2.6): HARD_FAIL blocks; SOFT_WARN documented and proceeds.
7. **Bootstrap-style verification gate (v8 amendment per spec § 3.8).** Applies to sub-phases 5.1, 5.2, 5.3:
   - Install/load the artifact in a fresh isolated environment (clean venv / clean Docker / clean headless browser context).
   - Run the artifact under the same canonical descriptor that was committed during Phase 1/2/3/4.
   - Pass the re-emitted capture through `testkit.equivalence.compare_captures` against the in-repo canonical capture at the per-sim tolerance from `tolerance.toml` (under `tolerance-budget.toml` cap).
   - **PASS verdict gates the sub-phase.** A FAIL means the productization pipeline silently broke correctness; the artifact does not ship.
   - For sub-phase 5.4 (renders) and 5.5 (preprint), this gate is N/A; the artifact is a render image or arXiv pre-print, not a capture re-emitter.
8. **Perf-ledger row appended** for any sub-phase that re-emits a capture (5.1, 5.2, 5.3). Row marks the environment (`pypi-fresh-venv`, `binary-docker`, `webgpu-headless-chromium`) and the wall-clock for the canonical capture descriptor. Flags > 2× regression from source-stack baseline informationally.
9. **Evidence-hashes in audit** — sub-phase audit's front-matter `evidence_hashes:` includes the sha256 of the re-emitted capture, the equivalence-report, and the failing-tests-output file.

### 2.2 Phase-level gates

The phase is complete when:

- All five sub-phases meet § 2.1.
- Each sub-phase's audit landed at `docs/_audits/phase-5/<sub-phase-name>-<UTC-date>.md` per spec § 7.5.
- The shared files in § 6.6 (productization index, CHANGELOG, architecture § 11.6 "delivered" annotations, project-state) reflect all five sub-phases.
- **Closing audit (v8 amendment)** at `docs/_audits/phase-5/landing-<UTC>.md`:
  - Verify_evidence.py passes on every sub-phase audit. Failure → REFUTED.
  - Append-only check passes against `v0.4.0-phase-4` tag. Failure → REFUTED.
  - Bootstrap-style verification (sub-phases 5.1/5.2/5.3) is documented as passing with evidence paths to the re-emitted capture sha256s.
  - Perf-ledger reviewed for cross-environment regressions; flagged rows surfaced to owner.
  - Final summary line: `Proposed tag: v0.5.0-phase-5` / `Tag commit SHA: <sha>` / `Tag pushed: NO (operator action required)`.

The operator reads the closing audit, runs `verify_evidence.py` independently, optionally runs `replay_prior_phase.py --prior-phase phase-5` from a Phase 6 perspective, and pushes `v0.5.0-phase-5` after approving.

---

## 3. Conventions in force

All operating conventions in spec Part VII apply. Specifically:

- **Plan-vs-spec authority.** Where this plan extends the spec (e.g., file layout under `tools/productization/`, workflow YAML skeleton, completion-report template), the plan is authoritative. Where this plan conflicts with the spec, the spec is authoritative — agents halt under Hard Rule 2 and surface.
- **Convention C / D** — agents probe before drafting.
- **Convention M** — agents re-anchor against live source before editing.
- **Convention A** — each sub-phase's commits decompose into new-files-first, then modify-existing. Three commits per sub-phase total (with Convention #12 SHA back-fill as the third).
- **Convention #8** — no memory assertions. Probe or web-fetch every concrete claim.
- **Convention #12** — SHA back-fill is the third commit per sub-phase, never `git --amend`.
- **Hard Rule 2** — if any agent finds the plan or spec disagrees with synced state on a load-bearing assumption, it halts, files a completion report tagged `halted-Hard-Rule-2`, and ends. The coordinator surfaces verbatim; no other sub-phases dispatch until the user resolves.
- **FACT / INFERENCE tagging** on every concrete claim.
- **Four-state verdicts** (CONFIRMED / SHIFTED / REFUTED / DEFERRED) on every gate.
- **Append-only audits** — reports under `_audits/` are never edited.
- **Strict-mode CI default (§ 7.7)** — `ruff` strict, `mypy --strict`, `pytest -W error` on all Python; workflow-yaml lint as the repo enforces.

### 3.1 Industry-standard practices baked into the architecture

These are not in spec Part VII but are load-bearing for production-quality CI workflows. § 5.4's workflow skeleton enforces all of them by construction:

- **Trunk-based development.** Agents commit directly to `main`. No feature branches. Suited to solo-developer / small-team workflow per industry consensus (DORA's State of DevOps research consistently associates trunk-based + small-batch with delivery performance).
- **Concurrency control** via `concurrency:` key on every workflow.
- **Cache management** per ecosystem (npm, pip, cmake) with key derivation from dependency-manifest hashes.
- **Build-validate / deploy separation** — CI gates `build-and-validate`; secrets gate `deploy`.
- **Pinned action SHAs and container digests** for reproducibility.
- **Idempotent workflows** — same SHA + same inputs → same artifact.
- **Failure-mode declaration** — each workflow's spec doc declares what red means and what re-running does.

---

## 4. Settled choices

| # | Choice | Resolution |
|---|---|---|
| 4.1 | Web hosting provider | **GitHub Pages.** Provider switch is a post-phase change to the `deploy` job only. |
| 4.2 | Production domain | **`stevenfau.github.io/Bit-Physics/`.** Custom domain registration is a post-phase user action. |
| 4.3 | macOS signing | **Unsigned.** `xattr -d com.apple.quarantine` workaround documented in `binary-release.md` go-live runbook. |
| 4.4 | Linux binary format | **AppImage.** |
| 4.5 | PyPI publishing | **OIDC trusted publisher.** Steven registers Bit-Physics with PyPI as a post-phase go-live action. |
| 4.6 | PyPI namespace | **`bit-physics-<category>-<sim>` (per spec § 10.3 as amended via v4 review). |
| 4.7 | Conda distribution | **PyPI only** for Phase 5. |
| 4.8 | Render canonical sim | **Sub-phase `render-passes` agent picks at probe time.** Criteria in § 6.4. |
| 4.9 | Preprint canonical sim | **Sub-phase `preprint-extraction` agent picks at probe time.** Criteria in § 6.5. Reads `spec-ref.md` only. |
| 4.10 | Houdini Karma | **Not in Phase 5.** Blender Cycles only. |
| 4.11 | Tag namespace | **Per-pipeline prefixes:** `web-v*`, `bin-v*`, `pypi-v*`, `render-v*`, `preprint-v*`. Workflows trigger only on tags whose underlying commit is reachable from `main` (`if: github.event.base_ref == 'refs/heads/main'` or equivalent — agent verifies current syntax). |
| 4.12 | CI time budget per sub-phase | **60-minute soft ceiling per sub-phase's smoke matrix.** Sharding if exceeded. Hard ceiling: GitHub Actions per-job 6-hour limit. |
| 4.13 | Bespoke per-sim productization needs | **DEFERRED to post-phase per-sim work.** Frontier-variant non-standard needs (3DGS viewer, neural weights, gradient export) opt out via spec sheet or accept standard treatment with caveats. |
| 4.14 | Tool tree location | **All five sub-phases' tooling lives under `tools/productization/<sub-phase-name>/`** for consistency. Renders and preprints may be promoted to `tools/render/` and `tools/preprint/` post-phase via rule-of-three (Convention 7.10) if non-productization consumers emerge. |
| 4.15 | Sub-phase dispatch order | **Spec-numbered order: 5.1 → 5.2 → 5.3 → 5.4 → 5.5.** Sub-phases are independent so any order is valid; spec order is chosen for mental simplicity and consistency with the V2 spec text. |

---

## 5. Architecture

This section is the shared scaffolding every sub-phase instantiates. The point is that an agent reading its prompt does not need to invent layout, workflow shape, API surfaces, or report formats — those are locked here. Each sub-phase's agent session instantiates the same scaffolding with sub-phase-specific values.

### 5.1 Sub-phase identifiers and naming consistency

Every sub-phase has one functional name used everywhere:

| Sub-phase | Spec ref | Stack | Name |
|---|---|---|---|
| 1 | 5.1 web deploy | B | `web-deploy` |
| 2 | 5.2 binary release | C | `binary-release` |
| 3 | 5.3 PyPI release | D, E | `pypi-release` |
| 4 | 5.4 render passes | one canonical | `render-passes` |
| 5 | 5.5 preprint extraction | one canonical | `preprint-extraction` |

The name appears in:

| Surface | Pattern | Example |
|---|---|---|
| Workflow file | `.github/workflows/<sub-phase-name>.yml` | `.github/workflows/web-deploy.yml` |
| Tool tree | `tools/productization/<sub-phase-name>/` | `tools/productization/web-deploy/` |
| Spec doc | `docs/productization/<sub-phase-name>.md` | `docs/productization/web-deploy.md` |
| Probe report | `tools/testkit/probes/reports/phase-5-<sub-phase-name>.md` | `tools/testkit/probes/reports/phase-5-web-deploy.md` |
| Completion report | `docs/_audits/phase-5/<sub-phase-name>-<UTC-date>.md` | `docs/_audits/phase-5/web-deploy-2026-05-18.md` |
| Agent identifier | "Phase 5 `<sub-phase-name>` agent" | "Phase 5 `web-deploy` agent" |

A `git grep <sub-phase-name>` returns every file related to that sub-phase.

### 5.2 Inter-component contracts (sockets and wires)

Four named contracts govern how components connect. Each sub-phase's agent operates within these contracts; the coordinator routes between them.

**Contract A→T (Agent → Testkit, read direction).** Every sub-phase's pipeline calls testkit functions to validate captures. The actual function names are probed; the contract is *capability*:

- Capability "validate capture against schema": input is a path to a capture file; output is a (bool, message) result.
- Capability "replay capture for determinism check": input is a capture file path; output is a state-equivalence verdict.
- Capability "read capture manifest": input is a capture file path; output is the manifest dict per spec § 2.7.

If any capability is missing at the time of dispatch, the consuming sub-phase halts under Hard Rule 2.

**Contract A→F (Agent → Filesystem, write direction).** Each sub-phase's agent writes to its declared touch-set and to the shared files (§ 6.6) in an incremental, additive fashion. Touch-set:

- `tools/productization/<sub-phase-name>/` — pipeline code (full ownership of this sub-phase)
- `.github/workflows/<sub-phase-name>.yml` — workflow file (full ownership)
- `docs/productization/<sub-phase-name>.md` — spec doc (full ownership)
- `tools/testkit/probes/reports/phase-5-<sub-phase-name>.md` — probe report (full ownership)
- `docs/_audits/phase-5/<sub-phase-name>-<UTC>.md` — completion report (full ownership)
- Sub-phase-specific output paths (e.g., `docs/renders/<canonical-sim>/` for `render-passes`)

Plus incremental edits to shared files in § 6.6.

**Contract A→C (Agent → Coordinator, report direction).** Each sub-phase's agent emits one completion report at `docs/_audits/phase-5/<sub-phase-name>-<UTC>.md` following the § 5.8 template. The completion report's overall-summary tag is the only signal the coordinator interprets — one of `CONFIRMED-all`, `SHIFTED-with-notes`, `REFUTED-blocking`, `halted-Hard-Rule-2`.

**Contract A→R (Agent → Repo, commit direction).** Each sub-phase's agent lands three commits directly to `main` per Conventions A and #12:

1. `feat(phase-5/<sub-phase-name>): new files`
2. `feat(phase-5/<sub-phase-name>): modify existing surfaces`
3. `chore(phase-5/<sub-phase-name>): SHA back-fill and audit`

The agent's own session does the CI gate between commit 2 and commit 3, gating only `build-and-validate` jobs. `deploy` jobs are not exercised. If CI red, the agent files a remediation report at `docs/_audits/phase-5/<sub-phase-name>-<UTC>-ci-red.md` and ends without commit 3; the coordinator surfaces to the user.

### 5.3 Shared directory layout per sub-phase

Every `tools/productization/<sub-phase-name>/` has this layout:

```
tools/productization/<sub-phase-name>/
├── __init__.py
├── README.md                       # one-paragraph purpose; links to docs/productization/<sub-phase-name>.md
├── pipeline.py                     # entry point; the API in § 5.5
├── smoke/
│   ├── __init__.py
│   ├── test_pipeline.py            # pytest module; TDD harness
│   └── fixtures/
│       └── (sub-phase-specific minimal fixtures or generators)
└── (sub-phase-specific subdirs as needed)
```

Examples of sub-phase-specific subdirs:

- `web-deploy/` → adds `web/headless/` (Playwright config), `web/embed/` (iframe templates)
- `binary-release/` → adds `cmake/` (CPack hooks), `sign/` (signing-hook stubs)
- `pypi-release/` → adds `lint.py` (pyproject linter), `pyproject-template.toml`
- `render-passes/` → adds `blender/` (Python scripts: scene_setup, import_asset, camera, lighting, cycles_config, render), `blender/presets/`
- `preprint-extraction/` → adds `extract.py`, `template/` (LaTeX class, BibTeX style, figures)

The shared `pipeline.py` API in § 5.5 is the same shape across all five sub-phases.

### 5.4 Shared workflow YAML skeleton

Every workflow file follows this skeleton. Agents instantiate placeholders (denoted `<...>`); the structure is locked.

```yaml
name: <sub-phase-name>

on:
  push:
    tags: ['<tag-prefix>-v*']
  workflow_dispatch:
    inputs:
      confirm_deploy:
        description: 'Set to "true" to run the deploy job. Default is false (Phase 5 artifact-ready only).'
        required: true
        default: 'false'
        type: choice
        options: ['false', 'true']

concurrency:
  group: <sub-phase-name>-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: read
  # sub-phase-specific permissions as needed (e.g., pages: write for web-deploy's deploy job; id-token: write for pypi-release OIDC)

jobs:
  build-and-validate:
    name: Build and validate
    strategy:
      fail-fast: false
      matrix:
        # sub-phase-specific matrix dimensions (sim, os, sim-group for sharding)
    runs-on: <runner>
    steps:
      - name: Checkout (pinned)
        uses: actions/checkout@<pinned-sha>

      - name: Set up toolchain (pinned)
        uses: <toolchain-action>@<pinned-sha>

      - name: Discover qualifying sims
        run: python -m tools.productization.<sub-phase-name>.pipeline discover --json > sims.json

      - name: Build artifacts
        run: python -m tools.productization.<sub-phase-name>.pipeline build --sims-json sims.json --output ${{ runner.temp }}/artifacts

      - name: Validate against testkit
        run: python -m tools.productization.<sub-phase-name>.pipeline validate --artifacts ${{ runner.temp }}/artifacts --json > results.json

      - name: Surface results
        if: always()
        run: cat results.json

      - name: Upload artifacts
        if: success()
        uses: actions/upload-artifact@<pinned-sha>
        with:
          name: <sub-phase-name>-${{ matrix.* }}
          path: ${{ runner.temp }}/artifacts
          retention-days: 30

  deploy:
    name: Deploy (gated)
    needs: build-and-validate
    if: github.event_name == 'workflow_dispatch' && inputs.confirm_deploy == 'true'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@<pinned-sha>
      # sub-phase-specific deploy step (deploy-pages, gh-release-create, pypi-publish, etc.)
```

**What's locked:** trigger conditions, concurrency, permission baseline, job names (`build-and-validate`, `deploy`), step names (`Discover`, `Build`, `Validate`, `Surface`, `Upload`), the pipeline.py CLI verbs (`discover`, `build`, `validate`), the JSON sidechannel.

**What the agent fills in:** matrix dimensions, runner, toolchain action, cache keys, sub-phase-specific deploy step, additional permissions.

### 5.5 Shared smoke-harness contract (`pipeline.py` API)

Every sub-phase's `tools/productization/<sub-phase-name>/pipeline.py` exposes this API. Types are illustrative; agents adjust to current Python conventions in the repo. The shape preserves: a dataclass `SimSpec` per qualifying sim, a dataclass `PipelineResult` per processed sim, three core functions (`discover_qualifying_sims`, `run_pipeline_for_sim`, `assemble_deploy_artifact`), and three CLI entry points (`main_discover`, `main_build`, `main_validate`).

```python
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

@dataclass(frozen=True)
class SimSpec:
    """A qualifying sim this sub-phase's pipeline will process.
    Discovered by walking the repo. Fields populated from on-disk metadata.
    """
    name: str
    category: str
    stack: str          # 'B' | 'C' | 'D' | 'E'
    path: Path
    metadata: dict      # sub-phase-specific fields (entry_point, target_name, etc.)


@dataclass(frozen=True)
class PipelineResult:
    sim: SimSpec
    status: Literal['pass', 'fail', 'deferred']
    artifact_path: Path | None
    capture_validated: bool
    duration_seconds: float
    notes: str


def discover_qualifying_sims() -> list[SimSpec]:
    """Walk the repo and return sims meeting this sub-phase's qualifying
    criteria. Criteria are defined per sub-phase in phase plan § 6.x.
    Non-qualifying sims are reported via stderr, not returned.
    """
    ...


def run_pipeline_for_sim(sim: SimSpec, output_dir: Path) -> PipelineResult:
    """Build the artifact for one sim, validate it against the testkit,
    return the result. Idempotent for a given sim at a given SHA.
    """
    ...


def assemble_deploy_artifact(results: list[PipelineResult], output_dir: Path) -> Path:
    """Combine per-sim artifacts into a single deployable bundle.
    Called by the 'deploy' job; not exercised by Phase 5 CI gate.
    """
    ...


# === CLI entry points (called from workflow YAML) ===

def main_discover() -> int:
    """CLI: emit qualifying sims JSON to stdout; non-qualifying with reasons
    to stderr. Exit 0 if any qualifying sim found, else 2.
    """
    ...


def main_build() -> int:
    """CLI: read sims JSON from --sims-json; build artifacts to --output;
    emit per-sim build status JSON to stdout. Exit 0 if all attempted;
    per-sim status carries pass/fail/deferred.
    """
    ...


def main_validate() -> int:
    """CLI: read artifacts from --artifacts; validate each against testkit;
    emit results JSON to stdout. Exit 0 only if every qualifying sim passes
    or is documented as deferred. Any 'fail' exits 1.
    """
    ...
```

**Smoke results JSON schema** (emitted by `validate`, consumed by CI):

```json
{
  "sub_phase": "<sub-phase-name>",
  "commit_sha": "<HEAD SHA at validate time>",
  "qualifying_sims": [<list of sim names>],
  "non_qualifying": [{"name": "...", "reason": "..."}, ...],
  "sim_results": {
    "<sim-name>": {
      "status": "pass" | "fail" | "deferred",
      "duration_seconds": 0.0,
      "artifact_path": "<path or null>",
      "capture_validated": true | false,
      "notes": "..."
    }
  },
  "overall_status": "pass" | "fail",
  "deferred_count": 0,
  "fail_count": 0,
  "pass_count": 0
}
```

The agent's own CI gate (Contract A→R) checks `overall_status == "pass"` before commit 3.

### 5.6 Shared spec-doc template

Every `docs/productization/<sub-phase-name>.md` has these sections in order.

```markdown
# Productization — <sub-phase-name>

> Phase 5 sub-phase: <number>. Authored by: phase-5-<sub-phase-name>-agent (planning); extended by: per-sim authors (post-phase).
> Architecture: see `docs/phases/phase-5-productization.md` § 5 (shared) and § 6.<x> (sub-phase-specific).

## 1. Purpose

(One paragraph. What this pipeline does, what artifact it produces, who consumes it.)

## 2. Pipeline shape

(Job groups: build-and-validate, deploy. Trigger conditions. Concurrency. Caching. Reference § 5.4 of the phase plan for shared shape.)

## 3. Qualifying sim criteria

(Verbatim from phase plan § 6.<x>.)

## 4. Smoke test contract

(The six gates from § 2.1 specialized to this sub-phase's specifics.)

## 5. Sharding scheme

(If smoke matrix > 60 min per § 4.12, describe sharding. Otherwise: "Not required; matrix fits within budget.")

## 6. Failure modes

- CI red on `build-and-validate`: <what does this mean for the artifact / user>
- CI red on `deploy`: <should not happen accidentally; gated on workflow_dispatch>
- Re-running on the same SHA: <safe / damaging>
- Per-sim DEFERRED: <how the sim owner remediates>

## 7. Go-live runbook

(Step-by-step user actions to take the pipeline from "artifact ready" to "live destination". Includes any secret-registration or DNS steps. The post-phase coordinator does this.)

## 8. Open issues / DEFERRED items

(Anything the sub-phase agent flagged for follow-up.)

## 9. Extending coverage (post-phase contributor note)

(How a future contributor adds a new sim to this pipeline. Three subsections: (a) prerequisites — what the new sim must have to be a qualifying sim; (b) wiring — what config change adds the sim to coverage; (c) validation — how the contributor verifies their addition before opening a PR.)
```

### 5.7 Shared probe-report template

Every `tools/testkit/probes/reports/phase-5-<sub-phase-name>.md` has these sections.

```markdown
# Phase 5 <sub-phase-name> — Pre-implementation probe

## Front matter

- Date (UTC): <YYYY-MM-DDTHH:MM:SSZ>
- Author: claude-code session <id>
- Subject: Phase 5 <sub-phase-name> probe
- HEAD SHA at probe time: <40-char SHA>
- Verdict-state: see § 6 closure

## § 1 — Sim inventory in scope

| Sim path | Name | Version | Entry point | Opt-out marker | Qualifying status |
|---|---|---|---|---|---|

(One row per sim. Verbatim grep / view evidence below each row in a fenced code block.)

## § 2 — Testkit / framework API surface

(Function names, signatures, schema paths probed from disk. NOT from spec text. One subsection per capability consumed.)

## § 3 — Existing CI workflow inventory

(Every `.github/workflows/` file, its triggers, naming convention. Confirm new workflow filename non-clashing.)

## § 4 — External-tool current state

(Web-fetch evidence for third-party syntax. One subsection per external tool.)

## § 5 — Wall-clock estimate for smoke matrix

(Per-sim estimate × qualifying-sim count. If > 60 min, sharding scheme drafted here.)

## § 6 — Verdicts (four-state)

(One verdict per load-bearing assumption from phase plan § 6.<x> for this sub-phase.)

| Assumption | Verdict | Notes |
|---|---|---|
| ... | CONFIRMED / SHIFTED / REFUTED / DEFERRED | ... |
```

### 5.8 Shared completion-report template

Every `docs/_audits/phase-5/<sub-phase-name>-<UTC-date>.md` has these sections. The front matter is YAML conforming to spec § 7.5 canonical schema (extended with sub-phase-specific fields per v4 review § 7.15).

```markdown
---
date: <UTC ISO 8601, e.g., 2026-06-01T14-30-00Z>
author: phase-5-<sub-phase-name>-agent
phase: 5
artifact: sub-phase
artifact_id: <sub-phase-name>           # web-deploy | binary-release | pypi-release | render-passes | preprint-extraction
verdict: CONFIRMED-all                  # | SHIFTED-with-notes | REFUTED-blocking | halted-Hard-Rule-2
evidence_paths:
  - tools/productization/<sub-phase-name>/pipeline.py
  - .github/workflows/<sub-phase-name>.yml
  - docs/productization/<sub-phase-name>.md
head_sha: <commit 3 SHA, back-filled in commit 3 itself>
deferred_items: []
ci_activation:
  - { workflow: .github/workflows/<sub-phase-name>.yml, action: "created build-and-validate jobs" }
top_level_deps_to_merge: []
# Sub-phase-specific fields below the canonical block:
commit_1_sha: <40-char SHA>
commit_2_sha: <40-char SHA>
commit_3_sha: <40-char SHA, back-filled>
canonical_sim_selected: <name or "n/a">  # render-passes + preprint-extraction only
---

# Phase 5 <sub-phase-name> — Completion report

## § 1 — Scope summary

(What was built; reference to phase plan § 6.<x>.)

## § 2 — Files added in commit 1

| Path | Purpose |
|---|---|

## § 3 — Files modified in commit 2

| Path | Diff intent |
|---|---|

## § 4 — Smoke harness results

(JSON output from `pipeline.py validate` embedded as fenced code block. Plus per-sim narrative for fails and deferreds.)

## § 5 — Canonical sim chosen

(For `render-passes` and `preprint-extraction` only. Sim name + criteria-satisfaction evidence per phase plan § 4.8 or § 4.9.)

## § 6 — FACT / INFERENCE enumeration

(Every concrete claim made in this report or the patch series, tagged.)

## § 7 — Four-state verdicts on per-sub-phase gates

| Gate | Verdict | Evidence path |
|---|---|---|
| Spec doc committed | CONFIRMED | docs/productization/<sub-phase-name>.md |
| Probe committed | CONFIRMED | tools/testkit/probes/reports/phase-5-<sub-phase-name>.md |
| Smoke harness committed and failing first | CONFIRMED | <evidence path> |
| build-and-validate passes CI | <verdict> | <CI run URL> |
| At least one qualifying sim wired through | <verdict> | <sim name(s)> |
| Integrity gate does not block | <verdict> | <integrity gate output> |

## § 8 — TDD discipline FACT

FACT: tests verified failing before implementation drafted on <timestamp>. Pytest output snippet:

```
<failing pytest output>
```

## § 9 — CHANGELOG entry added

(The text of the entry added to CHANGELOG.md in commit 2.)

## § 10 — Edits to shared files in commit 2

(List of edits to docs/productization/index.md, docs/architecture.md § 11.6, project-state.md, and any sim spec sheets that gained productization opt-out declarations.)

## § 11 — Rule-of-three promotion candidates

(Patterns this sub-phase developed that may want promotion if other sub-phases develop the same. Per spec § 7.10. Future sub-phases read this section.)

## § 12 — Anticipated-problems encountered

(Which of the anticipated problems listed in this sub-phase's agent prompt fired; how they were resolved.)

## § 13 — Open items / DEFERRED

(Items for post-phase follow-up.)
```

### 5.9 Sub-phase execution flow

Every sub-phase agent session follows these nine steps in order. The agent prompt walks the agent through them.

1. **Read inputs.** Phase plan (this document) + V2 spec + any prior sub-phase artifacts (spec docs, completion reports, pipeline.py implementations) for pattern-grounding.
2. **Probe.** Write probe report at `tools/testkit/probes/reports/phase-5-<sub-phase-name>.md` following § 5.7 template.
3. **Decide.** Canonical sim (for `render-passes` and `preprint-extraction`); qualifying sims; sharding scheme. Record in probe verdicts.
4. **Author tests** at `tools/productization/<sub-phase-name>/smoke/test_pipeline.py`. Run them. Observe failing with no implementation. Capture failing pytest output for completion report § 8.
5. **Author implementation** following § 5.3 directory layout, § 5.5 API contract, § 5.4 workflow YAML skeleton, § 5.6 spec doc template.
6. **Verify tests pass** locally. Verify build-and-validate would pass in CI (run smoke harness against discovered qualifying sims locally where feasible).
7. **Commit 1 — new files.** All new files in this sub-phase's touch-set. Per Convention A. Commit message: `feat(phase-5/<sub-phase-name>): new files`.
8. **Commit 2 — modify existing.** Edits to CHANGELOG.md (create if absent), docs/productization/index.md (create on first sub-phase, append row on subsequent), docs/architecture.md § 11.6 (append delivered annotation with `<COMMIT_1_SHA_PENDING>` placeholder), project-state.md if present, any sim spec sheets that gained productization opt-out declarations. Also commit the completion-report draft (with commit-3 SHA placeholder). Commit message: `feat(phase-5/<sub-phase-name>): modify existing surfaces`. Wait for CI green on `build-and-validate` jobs. If CI red, file remediation report and end without commit 3.
9. **Commit 3 — SHA back-fill and audit closing.** Replace `<COMMIT_1_SHA_PENDING>` in docs/architecture.md § 11.6 with the actual commit 1 SHA. Back-fill the commit-3 SHA placeholder in the completion report's front matter (post-write reference). Set the overall-summary tag. Commit message: `chore(phase-5/<sub-phase-name>): SHA back-fill and audit`. Report back to coordinator: three commit SHAs, overall-summary tag, completion report path.

---

## 6. Sub-phase specifications

Each sub-phase specifies the deltas from § 5: matrix dimensions, qualifying-sim criteria, stream-specific subdirs, stream-specific deploy step, anticipated problems.

### 6.1 Sub-phase `web-deploy` (5.1)

**Inputs.** Stack B sims. Testkit capture-format validator (Contract A→T capability "validate capture against schema").

**Qualifying Stack B sim criteria (all must hold):**
- Has a Vite (or equivalent — probe) build that succeeds.
- Exposes a capture-export hook (probe convention).
- Has a settings panel per spec § 10.1 (tier, seed, capture-to-disk).
- Does not declare `productization.web: false` in its spec sheet § 13 "Productization status" (per spec § 8.2 amended template).

Sims missing any criterion → DEFERRED verdict addressed to sim owner. Phase 5 does not patch sims.

**Workflow matrix.** One job per qualifying sim. Sharded if > 60 min total.

**Deploy step.** `actions/deploy-pages@<pinned-sha>` to the GitHub Pages environment.

**Sub-phase-specific subdirs under `tools/productization/web-deploy/`:**
- `web/headless/` — Playwright config and runner
- `web/embed/` — iframe template if needed
- `web/bundle/` — Vite-aggregation helper if multiple sims share a build root

**Anticipated problems and resolutions** (handle inline; document in completion report § 12):
- WebGPU not supported on Safari / Firefox: web-fetch caniuse current state; smoke runs Chromium only; document in spec doc § 6.
- Bundle size > ceiling: SHIFTED; leave to sim owner.
- Headless browser can't initialize WebGPU: fall back to "page loads, error count = 0" integration test; document.
- COOP/COEP headers needed for SharedArrayBuffer: document required GitHub Pages config in go-live runbook.
- Vite plugin version mismatch across sims: flag per-sim DEFERRED.
- Sim has no settings panel: DEFERRED; do not patch.

### 6.2 Sub-phase `binary-release` (5.2)

**Inputs.** Stack C sims with CMake targets. Testkit capture-format validator + determinism harness.

**Qualifying Stack C sim criteria:**
- Builds cleanly via CMake on the runner's OS.
- Accepts `--deterministic`, `--seed`, `--steps`, `--capture`, `--no-display` (probe actual flag names — convention may vary).
- Produces a schema-valid capture under headless run.
- Does not declare `productization.binary: false` in its spec sheet § 13 "Productization status" (per spec § 8.2 amended template).

**Workflow matrix.** `(qualifying_sim, os)` over `{ubuntu-latest, windows-latest, macos-latest}`. Likely needs sharding.

**Deploy step.** `softprops/action-gh-release@<pinned-sha>` (or current equivalent — probe) to draft a Release with binaries attached.

**Sub-phase-specific subdirs under `tools/productization/binary-release/`:**
- `cmake/` — CPack hooks; complements the top-level `cmake/Packaging.cmake`
- `sign/` — no-op signing-hook stubs (per § 4.3)
- `smoke/per_os/` — per-OS headless launch harnesses

**One file landed outside `tools/productization/binary-release/`:** `cmake/Packaging.cmake` (top-level, because CMake include-path convention puts it there). Document this exception in completion report § 11 as a rule-of-three candidate (likely the only sub-phase that needs this).

**Anticipated problems:**
- System libraries (Vulkan SDK, OpenVDB) needed: install in per-OS workflow setup; document.
- DLL bundling on Windows: use CMake `fixup_bundle` or `windeployqt` (probe what's current); document.
- macOS Apple Silicon arm64 vs x86_64: matrix on architecture if needed; DEFERRED if one arch fails for documented reason.
- X11 needed for "headless" runs: use `xvfb-run` on Linux; document.
- ImGui-only sims: ship as GUI-only with capture bypassed; DEFERRED on smoke.
- AppImage > 100MB: upload as Release asset, not Actions artifact; document.
- Apple Developer cert not available: unsigned, `xattr` workaround in runbook.

### 6.3 Sub-phase `pypi-release` (5.3)

**Inputs.** Stack D + E sims with `pyproject.toml`. Testkit capture-format validator + determinism harness.

**Qualifying Stack D / E sim criteria:**
- Has a `pyproject.toml` declaring required fields (linter enforces).
- Has a `[project.scripts]` entry point matching spec § 10.3 pattern (adapted to `bit-physics-<category>-<sim>` per § 4.6).
- Installs in a clean venv on `ubuntu-latest`.
- CLI runs N steps without error.
- Produces schema-valid capture.
- Does not declare `productization.pypi: false` in its spec sheet § 13 "Productization status" (per spec § 8.2 amended template).

CUDA-required sims: marker in pyproject. Install smoke runs on CUDA-capable runner if available (probe via web-fetch); DEFERRED otherwise.

**Workflow matrix.** One job per qualifying sim on `ubuntu-latest` (Python builds are OS-independent for pure-Python sims).

**Deploy step.** `pypa/gh-action-pypi-publish@<pinned-sha>` (verify current name) via OIDC trusted publisher. Requires `id-token: write` permission.

**Sub-phase-specific files under `tools/productization/pypi-release/`:**
- `lint.py` — pyproject linter (CLI; called from workflow)
- `pyproject-template.toml` — canonical template every Stack D / E sim instantiates

**Anticipated problems:**
- Taichi / Warp packages require GPU at runtime: DEFERRED if no CUDA runner; document.
- A sim has both `setup.py` and `pyproject.toml`: linter flags SHIFTED; sim owner removes `setup.py` per PEP 621.
- Version coordination across packages: probe for single source of truth.
- License consistency: linter enforces match with repo license.
- `manylinux` wheel for compiled extensions: DEFERRED if a sim has C extensions.
- CLI entry-point name divergent from spec § 10.3: probe per-sim and DEFERRED.

**Namespace.** PyPI namespace is `bit-physics-<category>-<sim>` per spec § 10.3 (amended via v4 review). No tension; no flag needed in completion report.

### 6.4 Sub-phase `render-passes` (5.4)

**Inputs.** Sims of any stack with exported Alembic or VDB assets on disk. Testkit capture-manifest reader (for `build_id`).

**Canonical-sim selection at probe time (all five criteria must hold):**
- Has exported Alembic or VDB asset committed.
- Has a published spec sheet (`spec-ref.md` exists with required sections).
- Has visual interest (volumetric / particle / mesh; not pure-shader closed-form).
- Passes its own per-sim determinism gate (probe to confirm).
- Does not declare `productization.render: false` in its spec sheet § 13 "Productization status" (per spec § 8.2 amended template).

If zero sims qualify → overall-summary tag `REFUTED-blocking`; halt without picking.

**Workflow matrix.** Single job (one canonical sim). No `deploy` job — renders are committed to the repo at `docs/renders/<sim>/`, not deployed externally.

**Sub-phase-specific files under `tools/productization/render-passes/blender/`:**
- `scene_setup.py`, `import_asset.py`, `camera.py`, `lighting.py`, `cycles_config.py`, `render.py`
- `presets/<category>.py` — per-category preset modules (particle / scalar-field / vector-field / closed-form matching diagnostic Tier 2)

**Anticipated problems:**
- CUDA not in CI for GPU Cycles: CPU rendering; slower but deterministic. Document wall-clock impact.
- Absolute asset paths in Alembic: write relative paths in render scripts; document.
- VDB material assignment: probe what the canonical sim's VDB declares; default if absent.
- Blender version drift: pin Docker image to digest in workflow.
- Cross-runner-instance render divergence on same OS: expected; document as "epsilon across runs, PSNR > 40dB" boundary.

**Coverage note.** Phase 5 ships ONE canonical sim's hero shot. Remaining sims' renders are post-Phase-5 follow-on using the same pipeline.

### 6.5 Sub-phase `preprint-extraction` (5.5)

**Inputs.** Sims with `spec-ref.md` + verification artifacts + vendored upstreams. Testkit equivalence-data reader (for evaluation tables, where present).

**Canonical-sim selection at probe time (all five criteria must hold):**
- Has MMS or GCI report committed.
- Has at least one vendored upstream in `references/`.
- Has a frontier-variant story (per spec § 5 frontier columns).
- `spec-ref.md` exists with sections 1, 3, 4, 6, 12 populated.
- Does not declare `productization.preprint: false` in its spec sheet § 13 "Productization status" (per spec § 8.2 amended template).

If zero sims qualify → `REFUTED-blocking`; halt.

**Extracts from `spec-ref.md` only.** Variant-sim spec sheets (`spec-diff.md`, `spec-sparse.md`, etc.) are out of Phase 5 scope.

**Workflow matrix.** Single job. No `deploy` to arXiv — post-phase user action.

**Sub-phase-specific files under `tools/productization/preprint-extraction/`:**
- `extract.py` — extractor; input is `spec-ref.md` path; output is `main.tex` + `references.bib`
- `template/` — LaTeX class, BibTeX style, figures placeholder

**Mapping per spec § 10.5:**
- spec § 1 (Scope) → `\section{Introduction}`
- spec § 3 (Algorithm) → `\section{Method}`
- spec § 4 (Algebraic form) → `\section{Mathematical Formulation}`
- spec § 6 (Verification posture) → `\section{Evaluation}`, including MMS / GCI / cross-stack equivalence tables if present
- spec § 12 (References) → BibTeX entries from `references/<upstream>/manifest.toml`

**Anticipated problems:**
- LaTeX class licensing: pick a permissively-licensed standard class.
- BibTeX entries with missing fields: graceful fallback to minimal entry; flag.
- Markdown math `$...$` in spec sheets: convert to LaTeX inline math; document conversion rules.
- PNG figures in spec sheets: copy to `docs/preprints/<sim>/figures/`; LaTeX `\includegraphics`.
- arXiv-specific package restrictions: conservative class.
- Cross-stack equivalence table shape varies: robust extractor; DEFERRED if shape unusual.

### 6.6 Shared-file edit conventions (cross-sub-phase incremental edits)

These files are edited by more than one sub-phase. Each sub-phase appends or extends incrementally in its own commit 2.

| File | First sub-phase action | Subsequent sub-phase action |
|---|---|---|
| `docs/productization/index.md` | Create with one row for this sub-phase | Append one row |
| `CHANGELOG.md` | Create with one Phase-5 entry containing one sub-phase bullet (if file absent) OR append a Phase-5 entry (if absent before Phase 5) OR add a sub-phase bullet to existing Phase-5 entry | Add one sub-phase bullet to the existing Phase-5 CHANGELOG entry |
| `docs/architecture.md` § 11.6 | Append "delivered" annotation with this sub-phase's commit-1 SHA | Append additional annotation under the same "delivered" sub-section |
| `project-state.md` (if present) | Append one row for this sub-phase | Append one row |

Each sub-phase's agent reads the current state of these files in step 1 (Read inputs) and edits incrementally in step 8 (commit 2). No two sub-phases ever conflict because they run serially.

---

## 7. Phase progression strategy

The coordinator dispatches sub-phases in spec-numbered order (§ 4.15): 5.1 → 5.2 → 5.3 → 5.4 → 5.5. Each dispatch is one Claude Code session.

**Dispatch sequence:**

1. Coordinator dispatches sub-phase 5.1 (`web-deploy`) using Appendix B.
2. Agent does steps 1–9 of § 5.9. Lands three commits to `main`. Files completion report. Reports back to coordinator with overall-summary tag.
3. Coordinator logs the completion in an inline ledger.
4. **If overall-summary tag is `CONFIRMED-all` or `SHIFTED-with-notes`:** coordinator dispatches sub-phase 5.2 (`binary-release`) using Appendix C.
5. **If overall-summary tag is `REFUTED-blocking` or `halted-Hard-Rule-2`:** coordinator surfaces the completion report path to the user verbatim and pauses. The user decides whether to amend the plan or spec, then re-dispatches the affected sub-phase (or skips it). Remaining sub-phases do not dispatch until the user resolves.
6. **If commit 3 was never reached because CI red after commit 2:** the agent files a remediation report at `docs/_audits/phase-5/<sub-phase-name>-<UTC>-ci-red.md`. Two commits land but the audit doesn't close. The coordinator surfaces the remediation report path and pauses. User decides whether to fix the CI red (possibly via a new agent session) and re-dispatch the failed sub-phase's commit 3, or revert the partial sub-phase, or amend the plan.
7. Repeat steps 1–6 for sub-phases 5.2, 5.3, 5.4, 5.5 in order.
8. After all five sub-phases land successfully, coordinator surfaces phase completion to the user with the five completion-report paths and the five overall-summary tags.

**Why serial.** Phase 5's sub-phases are independent at the work level (different stacks, different tools, different artifacts), but the serial execution model collapses several risk surfaces present in parallel execution: no base-SHA reconciliation needed; no branch rebase; no cross-stream coordination on shared files (each sub-phase edits them incrementally); no concurrent completion-report reconciliation; one halt stops the chain cleanly rather than wasting four parallel agents' work. The cost is longer total dispatch time. The trade is appropriate given Steven's preference for low-risk linear progress.

**Why direct commits to main.** Trunk-based development with sequential feature commits is the industry-default for solo-developer projects (DORA's State of DevOps research consistently associates trunk-based + small-batch with delivery performance). Feature branches add overhead with no benefit when there's no concurrent work and no code review process to gate. Each sub-phase's three-commit decomposition (Convention A + #12) preserves the "Decompose, don't bundle" discipline within the trunk-based pattern.

---

## 8. Audit-trail expectations

Each sub-phase emits one completion report at `docs/_audits/phase-5/<sub-phase-name>-<UTC-date>.md`. Append-only. Required front-matter per spec § 7.5. FACT/INFERENCE tags. Four-state verdicts. Overall-summary tag.

Five completion reports total over the phase.

No separate phase-level audit. The post-phase retrospective at `docs/retro/phase-5-productization.md` (INFERENCE: path follows V1 convention; spec § 8.1 does not list `docs/retro/`) provides the meta-view. The retro is not required for Phase 5 acceptance; it is required before any productization scope expansion (per spec § 8.3).

---

## 9. Anticipated risks and mitigations

| Risk | Mitigation |
|---|---|
| Agent session fails before reporting | Coordinator re-dispatches the same sub-phase. If commits 1 and 2 already landed, the new agent picks up where it left off and writes commit 3. |
| Sub-phase N fails (REFUTED-blocking or halted-Hard-Rule-2) | Coordinator surfaces verbatim. User resolves (amend plan/spec, re-dispatch). Sub-phases N+1 through 5 do not run until N resolves. |
| Sub-phase N's commit 2 lands but CI goes red | Agent files remediation report and ends without commit 3. Coordinator surfaces. User decides next step. Sub-phase N is in a "two-of-three commits" state — the user may amend, re-run, or revert. |
| First sub-phase reveals architectural issue in shared scaffolding (§ 5) | Surfaces as DEFERRED or REFUTED in that sub-phase's verdicts. User amends plan § 5; subsequent sub-phases use updated scaffolding. Sub-phases 1's already-landed work may need a separate adjustment commit. |
| Testkit API has evolved beyond V2 spec text | Hard Rule 2: agent halts and surfaces. § 5.2 contract specifies capability, not literal names. |
| Settings panel missing on Stack B sim (web-deploy) | DEFERRED verdict to sim owner. Phase 5 does not patch sims. |
| Frontier variant has bespoke productization need | § 4.13 DEFERRED. Per-sim post-phase work. |
| Bundle / artifact size exceeds CI quotas | Probe estimates; per-artifact upload; sharding per § 4.12. |
| macOS Gatekeeper warning on unsigned binary | `xattr -d com.apple.quarantine` documented in `binary-release.md` go-live runbook. |
| PyPI namespace `bit-physics-*` per spec § 10.3 (amended via v4 review); no tension. |
| Cycles render non-deterministic across hardware | Determinism boundary documented in `render-passes.md`: bit-exact same-Blender-same-OS-same-sample-count; epsilon across (PSNR > 40dB). |
| LaTeX class licensing / arXiv-specific restrictions | Sub-phase `preprint-extraction` web-fetches current best practice; picks permissive standard class. |
| Workflow YAML lint fails | § 5.4 skeleton designed to pass standard `actionlint`; agent probes any repo-specific lint rules. |
| Deploy job fails for missing secrets | `deploy` gated on `workflow_dispatch` + secret presence. CI gate checks only `build-and-validate`. |
| Plan-spec drift discovered by agent | Hard Rule 2 halt. User amends plan/spec, re-dispatches sub-phase. |
| Total dispatch time longer than parallel | Accepted trade-off. ~5x serial; ~1x parallel. User chose serial for risk containment. |

---

## How to use this plan (operator quick-start)

1. **Commit the V2 spec** to `docs/architecture.md` in Bit-Physics.
2. **Commit this plan** to `docs/phases/phase-5-productization.md`.
3. **Open a fresh Claude.ai chat** and paste Appendix A as the coordinator prompt.
4. The coordinator dispatches the first sub-phase using Appendix B.
5. Wait for the agent to land three commits + file a completion report.
6. When the coordinator surfaces the completion-report path, verify briefly. If overall-summary tag is `CONFIRMED-all` or `SHIFTED-with-notes`, instruct the coordinator to dispatch the next sub-phase.
7. Repeat through sub-phases 5.2, 5.3, 5.4, 5.5.
8. After all five land, request the retrospective separately (the retro is not part of Phase 5 acceptance per spec § 8.3).

---

# Appendix A — Coordinator initial prompt

> **Use:** paste into a fresh Claude.ai chat. The coordinator dispatches one Claude Code agent session per sub-phase, in order. The coordinator does not validate, decide, or interpret.

```text
You are the Phase 5 Coordinator for the Bit-Physics repo (github.com/StevenFAU/Bit-Physics). You orchestrate. You do not validate, decide, judge, or interpret.

The phase plan at docs/phases/phase-5-productization.md is fully scoped. Phase 5 has five sub-phases dispatched serially to one Claude Code agent over five sessions. Order is spec-numbered: 5.1 → 5.2 → 5.3 → 5.4 → 5.5 (per phase plan § 4.15).

Each sub-phase's agent lands three commits directly to main per Conventions A and #12, files a completion report at docs/_audits/phase-5/<sub-phase-name>-<UTC>.md, and reports back to you with three commit SHAs and an overall-summary tag.

Your actions:

ACTION 1 — Dispatch sub-phase 5.1 (web-deploy).

Take the prompt from Appendix B of the phase plan and start a new Claude Code session with it.

ACTION 2 — Wait for completion.

The agent reports back with:
  - three commit SHAs (commit 1, commit 2, commit 3)
  - overall-summary tag (CONFIRMED-all / SHIFTED-with-notes / REFUTED-blocking / halted-Hard-Rule-2)
  - completion report path

Maintain an inline ledger in this chat as a simple list:

  - Sub-phase 5.1 (web-deploy): <commit SHAs> | <tag> | <report path>
  - Sub-phase 5.2 (binary-release): pending
  - Sub-phase 5.3 (pypi-release): pending
  - Sub-phase 5.4 (render-passes): pending
  - Sub-phase 5.5 (preprint-extraction): pending

If the agent reports a remediation-report path instead of three commit SHAs (because CI red after commit 2), or an overall-summary tag of REFUTED-blocking or halted-Hard-Rule-2, surface the report path to the user verbatim and pause. Do not dispatch the next sub-phase. The user decides next steps.

If overall-summary tag is CONFIRMED-all or SHIFTED-with-notes, proceed to ACTION 3.

ACTION 3 — Dispatch the next sub-phase.

  - After 5.1 completes: dispatch 5.2 using Appendix C of the phase plan.
  - After 5.2 completes: dispatch 5.3 using Appendix D.
  - After 5.3 completes: dispatch 5.4 using Appendix E.
  - After 5.4 completes: dispatch 5.5 using Appendix F.

Each dispatch starts a fresh Claude Code session with the corresponding appendix's prompt verbatim.

ACTION 4 — After all five sub-phases land.

Surface to the user:
  - The five completion-report paths
  - The five overall-summary tags
  - A note: "Phase 5 has completed. Retrospective is due per spec § 8.3 before any productization scope expansion."

That is the end of your role.

You do NOT:
  - Validate any agent's work or reports.
  - Interpret, summarize, or override any agent's verdicts.
  - Run any probes yourself.
  - Make decisions about scope, canonical-sim selection, opt-outs, or conventions.
  - Edit the phase plan or any committed file.
  - Pause unless an agent's tag is REFUTED-blocking or halted-Hard-Rule-2, or unless an agent files a remediation report.
  - Dispatch sub-phases out of order without explicit user instruction.

You are a relay. The plan is the spec; the agents do the work; each agent lands its own sub-phase. You are the bookkeeper and dispatcher.

Begin by viewing docs/phases/phase-5-productization.md to confirm it is the version intended for this dispatch. Then proceed to ACTION 1.
```

---

# Appendix B — Phase 5 web-deploy agent prompt (sub-phase 5.1)

> **Use:** the coordinator dispatches one Claude Code agent with this prompt for sub-phase 5.1. The agent lands three commits to main and reports back.

```text
You are the Phase 5 web-deploy agent for the Bit-Physics repo (github.com/StevenFAU/Bit-Physics). Your scope is sub-phase 5.1.

Read end-to-end before any action:
  - docs/phases/phase-5-productization.md (especially § 5 shared architecture, § 6.1 your sub-phase, § 5.9 execution flow, § 9 risks)
  - docs/architecture.md (V2 spec; especially § 10.1 and § 11.6)
  - Any prior Phase 5 sub-phase artifacts under tools/productization/, docs/productization/, and docs/_audits/phase-5/*.md (none exist yet for the first sub-phase; future sub-phases read these for pattern-grounding).

Rules (per phase plan § 3):
  - Convention M: re-view / grep live source before asserting or editing.
  - Convention #8: never assert paths, sim names, package names, or workflow YAML syntax from memory. Probe directly or web-fetch external docs at moment of assertion.
  - Convention C / D: probe API surfaces and call sites before drafting.
  - TDD: write tests, observe failing, then write implementation, then observe passing. **Per spec § 1.3 step 4 + v8 amendment**: capture verbatim failing pytest output at `tools/testkit/failing-tests-evidence/phase-5-web-deploy-<UTC>.txt`; compute `sha256sum`; record hash in the failing-tests commit footer as `Failing-tests-output-hash: sha256:<hex>`. The implementation commit footer references both the failing-tests-commit SHA and the witnessed hash. State "tests verified failing before implementation drafted" + the recorded hash as a FACT in completion report § 8.
  - FACT / INFERENCE: tag every concrete claim.
  - Hard Rule 2: spec/plan disagreement with synced state → halt. File completion report with overall-summary tag halted-Hard-Rule-2. End session without committing.
  - Strict-mode CI: Python passes ruff strict, mypy --strict, pytest -W error. Workflow YAML passes repo's lint.
  - Trunk-based: commit directly to main. No feature branches.
  - **Operator-only tag pushing (per spec § 7.12 + v8 amendment)**: the phase tag `v0.5.0-phase-5` is pushed by the operator at the end of sub-phase 5.5, NOT by any sub-phase agent. The agent never runs `git tag` or `git push origin v*`.
  - **Append-only audit discipline (per spec § 7.5 + v8 amendment)**: no file under `docs/_audits/` already present at `v0.4.0-phase-4` may be edited or shortened. Append-only.

Follow the sub-phase execution flow in phase plan § 5.9 (nine steps).

STEP 0 — **Cross-phase audit replay (sub-phase 5.1 ONLY; per spec § 7.5 + v8 amendment).** Sub-phase 5.1 is the FIRST sub-phase of Phase 5. Before any other action, run:

    python -m integrity.scripts.replay_prior_phase \
      --prior-phase phase-4 \
      --audit docs/_audits/phase-4/landing-<UTC>.md \
      --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget

Resolve `<UTC>` by listing `docs/_audits/phase-4/` for the landing file.

- Exit 0 → record replay-pass FACT and proceed to STEP 1.
- Exit 1 → BLOCKED. Write `docs/_audits/phase-5/sub-phase-5.1-blocked-replay-<UTC>.md` citing the discrepancy. End session and surface to operator. Do NOT begin Step 1; Phase 4 foundation is suspect.

Subsequent sub-phases (5.2, 5.3, 5.4, 5.5) skip STEP 0 — they assume Phase 5 is in progress and prior sub-phases have landed cleanly.

STEP 0a — **Tolerance-budget Phase 5 carryover (sub-phase 5.1 ONLY).** Update `tools/testkit/equivalence/tolerance-budget.toml`: `[phase] phase = "phase-5"`, `opened_at = "<UTC>"`. Do NOT widen budgets — carry forward.

STEP 1 — Read inputs (as listed above).

STEP 2 — Probe at tools/testkit/probes/reports/phase-5-web-deploy.md per § 5.7 template. Stream-specific § 1 content:
  - Every Stack B sim. Per-sim row: path, package.json name/version, Vite entry, capture-export hook, settings-panel presence (per spec § 10.1), productization.web opt-out marker, qualifying status (per phase plan § 6.1).

§ 2 (testkit / framework API): probe the capture-format validator capability per § 5.2 Contract A→T. Record actual function names and signatures.

§ 3 (CI inventory): existing .github/workflows/ files. Confirm web-deploy.yml does not clash.

§ 4 (external-tool state): web-fetch current actions/deploy-pages docs; web-fetch current Playwright (or alternative) syntax.

§ 5 (wall-clock): full Stack B qualifying-sim matrix. If > 60 min per § 4.12, draft sharding scheme.

§ 6 (verdicts): four-state on phase plan § 6.1 assumptions.

STEP 3 — Decide. Qualifying sims; sharding scheme. Record in probe verdicts.

STEP 4 — Author tests at tools/productization/web-deploy/smoke/test_pipeline.py. **Run them and capture verbatim failing output per spec § 1.3 step 4:**

    pytest tools/productization/web-deploy/smoke/test_pipeline.py -v 2>&1 | tee tools/testkit/failing-tests-evidence/phase-5-web-deploy-<UTC>.txt
    sha256sum tools/testkit/failing-tests-evidence/phase-5-web-deploy-<UTC>.txt

Confirm failure mode is `ModuleNotFoundError` / `NotImplementedError`, not framework misconfiguration. Record the sha256 hex for use in the commit footer at STEP 7.

STEP 5 — Author implementation:

a. tools/productization/web-deploy/ per phase plan § 5.3 layout. Sub-phase-specific subdirs: web/headless/ (Playwright config), web/embed/ (iframe template if needed), web/bundle/ (Vite aggregation if needed).

b. tools/productization/web-deploy/pipeline.py implementing the API in phase plan § 5.5.

c. .github/workflows/web-deploy.yml following the skeleton in phase plan § 5.4. Sub-phase-specific instantiation:
   - tag prefix: 'web-v*'
   - matrix: one job per qualifying Stack B sim (sharded per probe)
   - runner: ubuntu-latest
   - toolchain action: actions/setup-node@<pinned-sha>
   - cache: npm via setup-node's cache option
   - deploy step: actions/deploy-pages@<pinned-sha> (gated on workflow_dispatch + confirm_deploy)
   - permissions: contents: read, pages: write (deploy job only), id-token: write (deploy job only)
   - environment: 'github-pages' (deploy job)

d. docs/productization/web-deploy.md per phase plan § 5.6 template. Sub-phase-specific content per phase plan § 6.1.

STEP 5a — **Bootstrap-style verification gate (per spec § 3.8 + v8 amendment; phase plan § 2.1 gate 7).** Before STEP 6:

1. Build the canonical sim into a headless-deployable bundle (the smoke harness's standard step).
2. Run the bundle in a fresh Playwright Chromium context (clean profile, no cached state).
3. Drive the sim to re-emit the canonical capture for one designated sim (e.g., `reaction-diffusion-2d`'s `gray-scott-lambda-128sq-seed42-step2000` descriptor).
4. Compare the re-emitted capture against the in-repo `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5` via:

    python -m testkit.equivalence \
      --source captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5 \
      --port /tmp/web-deploy-reemit-<UTC>.h5 \
      --tolerance-table tools/testkit/equivalence/tolerance.toml \
      --tolerance-budget tools/testkit/equivalence/tolerance-budget.toml \
      --report-out /tmp/web-deploy-bootstrap-verify-<UTC>.md \
      --strict

PASS verdict gates the sub-phase. FAIL means the productization pipeline silently broke correctness; the bundle does not ship. Diagnose first (WebGPU driver differences? Bundle minification reordering?); SHIFTED to sim owner if irreducible. Compute `sha256sum` on the re-emitted capture and on the verification report; record both in completion report § 8 evidence-hashes.

STEP 5b — **Perf-ledger row (per spec § 2.15 + v8 amendment).** Read `run.wall_clock_seconds` from the re-emitted capture's manifest. Append to `docs/perf-ledger.md`:

    | reaction-diffusion-2d | webgpu-headless-chromium | gray-scott-lambda-128sq-seed42-step2000 | <wall_clock> | <ci-runner-id> | <commit-sha-pending> | <date> | web-bootstrap |

Flag-bracket > 2× regression from the source-stack baseline informationally; do not block.

STEP 6 — Verify tests pass. Run smoke harness against discovered qualifying sims locally where feasible.

STEP 7 — Commit 1: new files. All new files in this sub-phase's touch-set per § 5.2 Contract A→F, **including the failing-tests-evidence file from STEP 4**. Commit message:

    feat(phase-5/web-deploy): new files

    Failing-tests-output: tools/testkit/failing-tests-evidence/phase-5-web-deploy-<UTC>.txt
    Failing-tests-output-hash: sha256:<full-hex-from-step-4>

(For sub-phase 5.1, the failing-tests-output evidence is captured WITHIN commit 1's new-files set because the test files themselves are new. Commit 1's footer carries the output-hash. Subsequent commits do not need to re-state the hash — it is grep-recoverable from commit 1's message.)

STEP 8 — Commit 2: modify existing surfaces.
  - docs/productization/index.md: create file with one row for web-deploy (this is the first sub-phase).
  - CHANGELOG.md: create with one Phase-5 entry containing the web-deploy bullet (if file absent) or append entry (if absent before Phase 5).
  - docs/architecture.md § 11.6: append 'delivered' annotation with placeholder '<COMMIT_1_SHA_PENDING>' (back-filled in commit 3).
  - project-state.md (if present): append one row.
  - **docs/perf-ledger.md: append the web-bootstrap row from STEP 5b**, with commit-1 SHA in the appropriate column once known (back-filled in commit 3 if necessary).
  - Any sim spec sheet that needs a productization.web opt-out declaration (only if a sim's current state warrants it).
  - Completion report at docs/_audits/phase-5/web-deploy-<UTC>.md per phase plan § 5.8 template, with commit-3 SHA placeholder in front matter. **Front-matter `evidence_hashes:` includes:**
    - tools/testkit/failing-tests-evidence/phase-5-web-deploy-<UTC>.txt: <sha256>
    - /tmp/web-deploy-reemit-<UTC>.h5 (also committed at captures/_bootstrap-verification/phase-5-web-deploy/<UTC>.h5): <sha256>
    - /tmp/web-deploy-bootstrap-verify-<UTC>.md (also committed at docs/_audits/phase-5/web-deploy-bootstrap-<UTC>.md): <sha256>

Commit message: 'feat(phase-5/web-deploy): modify existing surfaces'.

Wait for CI green on build-and-validate jobs on commit 2. If CI red, file remediation report at docs/_audits/phase-5/web-deploy-<UTC>-ci-red.md and end session without commit 3. Report the remediation path to the coordinator.

STEP 9 — Commit 3: SHA back-fill and audit closing.
  - Replace '<COMMIT_1_SHA_PENDING>' in docs/architecture.md § 11.6 with the actual commit 1 SHA.
  - Back-fill the commit-3 SHA placeholder in the completion report's front matter.
  - Back-fill any commit-1 SHA placeholder in docs/perf-ledger.md if used.
  - Set the overall-summary tag (CONFIRMED-all / SHIFTED-with-notes / REFUTED-blocking; you would not be at this step if halted-Hard-Rule-2).

Commit message: 'chore(phase-5/web-deploy): SHA back-fill and audit'.

Report back to the coordinator: three commit SHAs, overall-summary tag, completion report path, bootstrap-verify outcome, perf-ledger entry.

Anticipated problems (handle inline; document in completion report § 12):
  - WebGPU not on Safari / Firefox: web-fetch caniuse; smoke runs Chromium only; document.
  - Bundle size > ceiling: SHIFTED to sim owner.
  - Headless WebGPU init fails: fall back to "page loads + error count = 0"; document. **Note: if headless WebGPU fails, the bootstrap-style verification gate cannot run — sub-phase reports BLOCKED on STEP 5a, not SHIFTED. The verification gate is load-bearing per spec § 3.8.**
  - COOP/COEP needed: document in go-live runbook.
  - Vite plugin version mismatch across sims: per-sim DEFERRED.
  - Sim has no settings panel: DEFERRED; do not patch.
  - **Bootstrap-verify capture diverges from in-repo canonical: investigate before SHIFTED. Common causes: bundle minification reordering FP ops (try `--target esnext` to preserve order); WebGPU driver fp16 fallback (force fp32 in WGSL); browser timer resolution. If irreducible, surface to sim owner for tolerance-budget amendment.**

You do NOT:
  - Use a feature branch. Commit directly to main per § 3.1 trunk-based development.
  - Edit .github/workflows/ files other than web-deploy.yml.
  - Edit files outside this sub-phase's touch-set per § 5.2 Contract A→F, with the exception of incremental edits to shared files per § 6.6.
  - Patch sims to add settings panels or capture-export hooks.
  - Surface to the coordinator mid-work. Completion report is your channel.
  - **Push any tag from this session.** The phase tag `v0.5.0-phase-5` is the operator's act after sub-phase 5.5 closes.
  - **Widen any tolerance unilaterally.** If bootstrap-verify fails and the diff is "narrow miss" within reason, file a tolerance-budget-amendment proposal per spec § 2.6 for the operator to approve in a separate commit. Do NOT just relax tolerance.toml.
  - **Edit any audit file under `docs/_audits/` that existed at `v0.4.0-phase-4`.** Append-only.

Begin by viewing the input documents and running STEP 0 (cross-phase audit replay).
```

---

# Appendix C — Phase 5 binary-release agent prompt (sub-phase 5.2)

> **Use:** the coordinator dispatches one Claude Code agent with this prompt for sub-phase 5.2. Dispatched after 5.1 completes.

```text
You are the Phase 5 binary-release agent for the Bit-Physics repo (github.com/StevenFAU/Bit-Physics). Your scope is sub-phase 5.2.

Read end-to-end:
  - docs/phases/phase-5-productization.md (§ 5 shared, § 6.2 sub-phase, § 9 risks)
  - docs/architecture.md (V2 spec; § 10.2, § 11.6, § 4.3)
  - Prior Phase 5 artifacts: tools/productization/web-deploy/, docs/productization/web-deploy.md, docs/_audits/phase-5/web-deploy-*.md. Read these for pattern-grounding — your pipeline.py shape and workflow YAML structure should match.

Rules: same as the web-deploy agent (Convention M, #8, C/D, TDD with failing-tests output hash per spec § 1.3 step 4, FACT/INFERENCE, Hard Rule 2, strict-mode CI, trunk-based, operator-only tag pushing per spec § 7.12, append-only audits per spec § 7.5).

**Cross-phase replay (STEP 0)** does NOT run for 5.2 — that was sub-phase 5.1's responsibility. 5.2 assumes Phase 5 is in progress; if 5.1 has not landed cleanly to main, surface to coordinator and BLOCK.

Follow phase plan § 5.9 (nine steps).

STEP 2 — Probe at tools/testkit/probes/reports/phase-5-binary-release.md per § 5.7.

§ 1: every Stack C sim. Per-sim: CMakeLists target, install rule, ImGui/GGUI dependency, headless capability, --deterministic / --seed / --steps / --capture / --no-display flag conventions (probe per-sim — they may vary), qualifying status per phase plan § 6.2.

§ 2: testkit capture-format validator + determinism harness capabilities per § 5.2 Contract A→T.

§ 3: confirm binary-release.yml non-clashing.

§ 4: current AppImage tooling (linuxdeployqt / linuxdeploy / appimagetool — web-fetch); macOS .app bundling; Windows zip + DLL bundling (CMake fixup_bundle / windeployqt — web-fetch).

§ 5: full (qualifying-sim × 3-OS) matrix wall-clock. Sharding likely needed.

STEP 4 — Author tests at tools/productization/binary-release/smoke/test_pipeline.py. **Capture failing output per spec § 1.3 step 4:**

    pytest tools/productization/binary-release/smoke/test_pipeline.py -v 2>&1 | tee tools/testkit/failing-tests-evidence/phase-5-binary-release-<UTC>.txt
    sha256sum tools/testkit/failing-tests-evidence/phase-5-binary-release-<UTC>.txt

Confirm `ModuleNotFoundError` failure mode (not framework misconfiguration). Record hex for commit 1 footer.

STEP 5 — Implementation:

a. tools/productization/binary-release/ per § 5.3. Sub-phase-specific subdirs: cmake/ (CPack hooks), sign/ (no-op signing stubs per § 4.3), smoke/per_os/.

b. tools/productization/binary-release/pipeline.py per § 5.5.

c. cmake/Packaging.cmake — landed at top-level cmake/, not under tools/productization/binary-release/, per phase plan § 6.2. This is the ONE file this sub-phase lands outside tools/productization/<sub-phase-name>/. Document in completion report § 11 as a rule-of-three candidate.

d. .github/workflows/binary-release.yml per § 5.4. Sub-phase-specific:
   - tag prefix: 'bin-v*'
   - matrix: (qualifying-sim × {ubuntu-latest, windows-latest, macos-latest}); sharded
   - cache: CMake build deps via actions/cache@<pinned-sha> keyed on CMakeLists.txt hash + OS
   - deploy step: softprops/action-gh-release@<pinned-sha> (verify current) gated on workflow_dispatch + confirm_deploy
   - permissions: contents: write (deploy job, for Release creation)

e. docs/productization/binary-release.md per § 5.6.

STEP 5a — **Bootstrap-style verification gate (per spec § 3.8 + v8 amendment).** Before STEP 6:

1. Build the canonical Stack C sim binary (e.g., `sph-water`) for the host OS (or in a clean Docker image per CI's matrix).
2. Run the binary in a fresh Docker container with NO pre-existing repo mount; the container has only the binary and its bundled deps.
3. Re-emit the canonical capture for `sph-water` at descriptor `dam-break-1M-particles-seed42-step1000`.
4. Mount the canonical capture from the host repo and run equivalence diff:

    python -m testkit.equivalence \
      --source captures/sph-water-ref/dam-break-1M-particles-seed42-step1000.h5 \
      --port /tmp/binary-reemit-<UTC>.h5 \
      --tolerance-table tools/testkit/equivalence/tolerance.toml \
      --tolerance-budget tools/testkit/equivalence/tolerance-budget.toml \
      --report-out /tmp/binary-bootstrap-verify-<UTC>.md \
      --strict

PASS gates the sub-phase. FAIL means the binary packaging silently broke correctness (e.g., wrong shader-cache directory; missing system lib; CPU-feature flag drift). Diagnose first. Record sha256 of re-emitted capture + verification report.

For Windows + macOS: same verification but run in the matrix-specific runner. If a single OS fails to bootstrap-verify but others pass, SHIFTED with the OS marked as deferred-to-Phase-6 in the completion report.

STEP 5b — **Perf-ledger row.** For each OS that bootstrap-verifies, append:

    | sph-water | binary-docker-<os> | dam-break-1M-particles-seed42-step1000 | <wall_clock> | <ci-runner-id> | <commit-sha> | <date> | binary-bootstrap |

STEP 8 — Commit 2 shared-file edits:
  - docs/productization/index.md: append row for binary-release.
  - CHANGELOG.md: add binary-release bullet to the existing Phase-5 entry (created by sub-phase 5.1).
  - docs/architecture.md § 11.6: append delivered annotation with '<COMMIT_1_SHA_PENDING>'.
  - project-state.md (if present): append row.
  - **docs/perf-ledger.md: append binary-bootstrap rows from STEP 5b** (one per OS that verified).
  - Spec sheet opt-outs as needed.
  - Completion report at docs/_audits/phase-5/binary-release-<UTC>.md, with `evidence_hashes:` for failing-tests-evidence file, re-emitted captures (one per OS), and verification reports.

Commit message convention follows § 5.9 step 7-9. **Commit 1 footer includes:**

    Failing-tests-output: tools/testkit/failing-tests-evidence/phase-5-binary-release-<UTC>.txt
    Failing-tests-output-hash: sha256:<full-hex>

Anticipated problems per phase plan § 6.2:
  - System libs (Vulkan SDK, OpenVDB): install in per-OS setup.
  - Windows DLL bundling: CMake fixup_bundle or windeployqt.
  - macOS Apple Silicon: matrix on architecture if needed; DEFERRED on documented failure.
  - X11 needed for Linux headless: xvfb-run.
  - ImGui-only sims: GUI-only; DEFERRED on smoke.
  - AppImage > 100MB: Release asset path.
  - macOS unsigned: xattr workaround in go-live runbook.
  - **Bootstrap-verify capture diverges from in-repo canonical: investigate before SHIFTED.** Common causes for binary packaging: wrong RNG state restore (CPU-feature-specific PRNG path); shader-cache lookup failing in clean container (re-compile at start); Vulkan validation layer differences; OS-level threading determinism (e.g., Windows ThreadPool differs from Linux pthreads). If irreducible, file tolerance-budget-amendment proposal.

Exclusions: same as web-deploy. **No tag pushing.** **No tolerance widening without operator-approved amendment.** **No edits to prior-phase audit files.**

Begin by viewing the input documents.
```

---

# Appendix D — Phase 5 pypi-release agent prompt (sub-phase 5.3)

> **Use:** the coordinator dispatches one Claude Code agent with this prompt for sub-phase 5.3. Dispatched after 5.2 completes.

```text
You are the Phase 5 pypi-release agent for the Bit-Physics repo (github.com/StevenFAU/Bit-Physics). Your scope is sub-phase 5.3.

Read:
  - docs/phases/phase-5-productization.md (§ 5 shared, § 6.3 sub-phase, § 4.6 namespace, § 9 risks)
  - docs/architecture.md (V2 spec; § 10.3, § 11.6, § 4.4, § 4.5)
  - Prior Phase 5 artifacts: tools/productization/web-deploy/, tools/productization/binary-release/, their docs, their completion reports. Match the established pipeline.py and workflow YAML shape.

Rules: same as prior sub-phases (TDD with output-hash per spec § 1.3 step 4; operator-only tag pushing per spec § 7.12; append-only audits per spec § 7.5).

STEP 2 — Probe at tools/testkit/probes/reports/phase-5-pypi-release.md per § 5.7.

§ 1: every Stack D + E sim. Per-sim: pyproject.toml location, declared name, [project.scripts] entry, CUDA-required marker, declared deps, qualifying status per phase plan § 6.3.

§ 2: testkit capture-format validator + determinism harness Python invocation per § 5.2 Contract A→T.

§ 3: confirm pypi-release.yml non-clashing.

§ 4: current GitHub Actions ↔ PyPI OIDC trusted-publisher syntax (web-fetch PyPI docs at authoring time — do NOT rely on training knowledge); current Python build tooling (uv / pip / build / hatch — probe); CUDA-capable GitHub Actions runner availability (web-fetch).

§ 5: full Stack D + E matrix wall-clock.

STEP 4 — Author tests at tools/productization/pypi-release/smoke/test_pipeline.py. **Capture failing output per spec § 1.3 step 4:**

    pytest tools/productization/pypi-release/smoke/test_pipeline.py -v 2>&1 | tee tools/testkit/failing-tests-evidence/phase-5-pypi-release-<UTC>.txt
    sha256sum tools/testkit/failing-tests-evidence/phase-5-pypi-release-<UTC>.txt

Confirm failure mode. Record hex.

STEP 5 — Implementation:

a. tools/productization/pypi-release/ per § 5.3. Sub-phase-specific files: lint.py (CLI), pyproject-template.toml.

b. tools/productization/pypi-release/pipeline.py per § 5.5.

c. .github/workflows/pypi-release.yml per § 5.4. Sub-phase-specific:
   - tag prefix: 'pypi-v*'
   - matrix: one job per qualifying sim on ubuntu-latest
   - cache: pip via actions/setup-python@<pinned-sha> with cache: 'pip'
   - deploy step: pypa/gh-action-pypi-publish@<pinned-sha> via OIDC; gated on workflow_dispatch + confirm_deploy + trusted-publisher registration
   - permissions: contents: read; id-token: write (deploy job, OIDC)
   - environment: 'pypi' (deploy job)

d. lint.py enforces: name follows bit-physics-<category>-<sim> per § 4.6; version matches repo semver; license matches repo license; entry point matches spec § 10.3 pattern with bit-physics namespace; classifiers include OS + Python Version; dependencies declared explicitly.

e. pyproject-template.toml — canonical template.

f. docs/productization/pypi-release.md per § 5.6. Include OIDC trusted-publisher setup steps in go-live runbook (Steven registers the repo with PyPI pre-publish).

STEP 5a — **Bootstrap-style verification gate (per spec § 3.8 + v8 amendment). This sub-phase is the CANONICAL bootstrap-verification example per spec § 3.8.** Before STEP 6:

1. Build the wheel for one designated Stack D sim — for example `bit-physics-continuous-ca-reaction-diffusion-3d` — via the smoke harness's standard `python -m build` invocation.
2. Create a **fresh empty virtual environment** outside the repo: `python -m venv /tmp/pypi-bootstrap-venv-<UTC>`.
3. Activate the venv and install the wheel: `pip install dist/bit_physics_continuous_ca_reaction_diffusion_3d-*.whl`.
4. Confirm the in-repo source is not on `sys.path`: `python -c 'import sys; assert "/path/to/Bit-Physics" not in str(sys.path)'`.
5. Run the installed entry-point to re-emit the canonical capture:

    bit-physics-continuous-ca-reaction-diffusion-3d \
      --seed 42 \
      --steps 2000 \
      --capture /tmp/pypi-reemit-<UTC>.h5

6. Activate the host repo's virtual environment (or invoke equivalence harness via uvx). Run the equivalence diff:

    python -m testkit.equivalence \
      --source captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.h5 \
      --port /tmp/pypi-reemit-<UTC>.h5 \
      --tolerance-table tools/testkit/equivalence/tolerance.toml \
      --tolerance-budget tools/testkit/equivalence/tolerance-budget.toml \
      --report-out /tmp/pypi-bootstrap-verify-<UTC>.md \
      --strict

PASS gates the sub-phase. FAIL means the wheel packaging silently broke correctness (most likely culprits: missing data files in `package_data`; pip-installed sim picking up a wrong-version dep; CUDA-vs-CPU branch difference; entrypoint shim losing CLI flags). Diagnose. Record sha256 of re-emitted capture + verification report.

**This is the load-bearing test for the PyPI productization. The artifact's correctness is verified by re-entering the testkit's equivalence harness FROM the installed artifact in a fresh environment, exactly as a downstream user would.**

STEP 5b — **Perf-ledger row.** Append to `docs/perf-ledger.md`:

    | reaction-diffusion-3d | pypi-fresh-venv | gray-scott-lambda-64cube-seed42-step2000 | <wall_clock> | <ci-runner-id> | <commit-sha> | <date> | pypi-bootstrap |

STEP 8 — Commit 2 shared-file edits as established (append rows / bullets / annotations). **Also append the perf-ledger row from STEP 5b to docs/perf-ledger.md.** Completion report `evidence_hashes:` includes failing-tests-evidence + re-emitted capture + verification report sha256s.

Commit 1 footer:

    Failing-tests-output: tools/testkit/failing-tests-evidence/phase-5-pypi-release-<UTC>.txt
    Failing-tests-output-hash: sha256:<full-hex>

Anticipated problems per phase plan § 6.3:
  - Taichi / Warp GPU at runtime: DEFERRED if no CUDA runner.
  - setup.py legacy: linter SHIFTED.
  - Version coordination: probe single source of truth.
  - License inconsistency: linter enforces.
  - manylinux for compiled extensions: DEFERRED for non-pure-Python sims.
  - CLI entry-point divergence: per-sim DEFERRED.
  - **Bootstrap-verify capture diverges from in-repo canonical: investigate first.** Common causes: `package_data` missing (data file referenced by sim but not in wheel — fix `MANIFEST.in` or `pyproject.toml [tool.setuptools.package-data]`); transitive-dep version drift (lock dep versions in pyproject.toml `[project.dependencies]`); console-script entrypoint losing `argv` (use `[project.scripts]` not `[project.entry-points]` for CLI); CUDA fallback to CPU (force `--cpu` if no GPU runner). If irreducible, file tolerance-budget-amendment proposal.

Namespace: PyPI is `bit-physics-<category>-<sim>` per spec § 10.3 (amended via v4 review). No completion-report flag needed.

Conda excluded (§ 4.7).

Exclusions: same as prior sub-phases. **No tag pushing.** **No tolerance widening without operator-approved amendment.** **No edits to prior-phase audit files.**

Begin by viewing the input documents.
```

---

# Appendix E — Phase 5 render-passes agent prompt (sub-phase 5.4)

> **Use:** the coordinator dispatches one Claude Code agent with this prompt for sub-phase 5.4. Dispatched after 5.3 completes.

```text
You are the Phase 5 render-passes agent for the Bit-Physics repo (github.com/StevenFAU/Bit-Physics). Your scope is sub-phase 5.4.

Read:
  - docs/phases/phase-5-productization.md (§ 5 shared, § 6.4 sub-phase, § 4.8 canonical-sim criteria, § 4.10 Karma exclusion, § 9 risks)
  - docs/architecture.md (V2 spec; § 10.4, § 11.6)
  - Prior sub-phase artifacts. Match established patterns.

Rules: same as prior sub-phases (TDD with output-hash per spec § 1.3 step 4; operator-only tag pushing per spec § 7.12; append-only audits per spec § 7.5).

**Bootstrap-style verification (per spec § 3.8): N/A for sub-phase 5.4.** Renders are static image artifacts, not capture re-emitters; there is no equivalence harness for rendered images against rendered images that mirrors testkit.equivalence. The render-similarity machinery from Phase 3 task-2 IS used at STEP 5a below, but it gates render-quality (PSNR/SSIM bounds) rather than physical-correctness re-emit.

STEP 2 — Probe at tools/testkit/probes/reports/phase-5-render-passes.md per § 5.7.

§ 1: every sim across all stacks for canonical-sim selection. Per-sim: exported Alembic / VDB asset (path, format) presence, spec sheet status, visual interest category, per-sim determinism gate status. Apply § 4.8 criteria. Pick canonical sim with criteria-satisfaction evidence. If zero qualify, set overall-summary tag REFUTED-blocking; halt without commits.

§ 2: testkit capture-manifest reader (for build_id extraction) per § 5.2 Contract A→T.

§ 3: existing render workflows; docs/renders/ state. Confirm render-passes.yml non-clashing.

§ 4: current Blender Docker image options (web-fetch). Pin to specific digest.

§ 5: wall-clock for one canonical sim render with deterministic Cycles.

STEP 4 — Author tests at tools/productization/render-passes/smoke/test_pipeline.py. **Capture failing output per spec § 1.3 step 4:**

    pytest tools/productization/render-passes/smoke/test_pipeline.py -v 2>&1 | tee tools/testkit/failing-tests-evidence/phase-5-render-passes-<UTC>.txt
    sha256sum tools/testkit/failing-tests-evidence/phase-5-render-passes-<UTC>.txt

Confirm failure mode. Record hex for commit 1 footer.

STEP 5 — Implementation:

a. tools/productization/render-passes/ per § 5.3. Sub-phase-specific subdir: blender/ with scene_setup.py, import_asset.py, camera.py, lighting.py, cycles_config.py, render.py, and presets/<category>.py (one per diagnostic Tier 2 category).

b. tools/productization/render-passes/pipeline.py per § 5.5. discover_qualifying_sims returns the chosen canonical sim only.

c. .github/workflows/render-passes.yml per § 5.4, build-and-validate only (NO deploy job — renders committed to repo). Sub-phase-specific:
   - tag prefix: 'render-v*'
   - matrix: single job (one canonical sim)
   - container: Blender Docker image pinned to digest

d. docs/productization/render-passes.md per § 5.6. Determinism boundary in § 6 Failure modes.

e. docs/renders/<canonical-sim>/ with at least one rendered hero shot (PNG), metadata.json sidecar (Blender version, Cycles seed, sample count, camera params, source-asset SHA, sim build_id), README.md linking to sim spec sheet.

STEP 5a — **Render-similarity quality gate (per spec § 2.12 + Phase 3 task-2 + v8 amendment).** The Blender output is not equivalence-checkable against an in-repo canonical, but it IS quality-gated:

1. Re-run the render twice with the same Cycles seed in the same pinned-digest Blender container.
2. Pass both renders through `tools/testkit/render_similarity/` from Phase 3 task-2:

    python -m testkit.render_similarity \
      --a docs/renders/<canonical-sim>/run1.png \
      --b docs/renders/<canonical-sim>/run2.png \
      --psnr-floor 40 \
      --ssim-floor 0.98

3. PSNR ≥ 40 dB AND SSIM ≥ 0.98 gates the sub-phase. Lower means Cycles non-determinism (despite seed) or environmental drift; investigate before SHIFTED.

STEP 5b — **Perf-ledger row.** Append to `docs/perf-ledger.md`:

    | <canonical-sim> | render-cycles-blender-<digest> | <descriptor> | <render_wall_clock> | <ci-runner-id> | <commit-sha> | <date> | render-bootstrap |

STEP 8 — Commit 2 shared-file edits as established. **Append the perf-ledger row from STEP 5b.** Completion report `evidence_hashes:` includes failing-tests-evidence file + hero render PNG + render-similarity gate report.

Commit 1 footer:

    Failing-tests-output: tools/testkit/failing-tests-evidence/phase-5-render-passes-<UTC>.txt
    Failing-tests-output-hash: sha256:<full-hex>

Anticipated problems per phase plan § 6.4:
  - No CUDA in CI: CPU Cycles.
  - Absolute Alembic paths: write relative.
  - VDB material assignment: probe; default if absent.
  - Blender version drift: pinned digest.
  - Cross-runner render divergence: documented PSNR > 40dB epsilon. **If PSNR < 40 dB on two consecutive Cycles runs with same seed, that's a Cycles non-determinism issue specific to the container; document and surface; do NOT SHIFTED-with-notes silently.**

Karma is excluded (§ 4.10).

Coverage: ONE canonical sim only. Remaining sims post-phase.

Exclusions: same. **No tag pushing.** **No tolerance widening without operator-approved amendment.** **No edits to prior-phase audit files.**

Begin by viewing the input documents.
```

---

# Appendix F — Phase 5 preprint-extraction agent prompt (sub-phase 5.5)

> **Use:** the coordinator dispatches one Claude Code agent with this prompt for sub-phase 5.5. Dispatched after 5.4 completes.

```text
You are the Phase 5 preprint-extraction agent for the Bit-Physics repo (github.com/StevenFAU/Bit-Physics). Your scope is sub-phase 5.5.

Read:
  - docs/phases/phase-5-productization.md (§ 5 shared, § 6.5 sub-phase, § 4.9 canonical-sim criteria, § 9 risks)
  - docs/architecture.md (V2 spec; § 10.5, § 11.6, § 8 sim-spec hierarchy)
  - Prior sub-phase artifacts. Match established patterns.

Rules: same.

STEP 2 — Probe at tools/testkit/probes/reports/phase-5-preprint-extraction.md per § 5.7.

§ 1: every sim's reference spec sheet (spec-ref.md only). Per-sim: spec-ref.md presence + sections 1/3/4/6/12 populated, MMS / GCI / cross-stack-equivalence artifact presence (per spec § 2.6, § 10.5), vendored-upstream count from references/<upstream>/manifest.toml used_by_sims, frontier-variant story. Apply § 4.9 criteria. Pick canonical sim with criteria-satisfaction evidence. If zero qualify, REFUTED-blocking; halt without commits.

§ 2: testkit equivalence-data reader per § 5.2 Contract A→T.

§ 3: confirm preprint-extraction.yml non-clashing.

§ 4: current arXiv-friendly LaTeX class (web-fetch); current TeX Live container image (web-fetch); current latexmk best practice; on-disk references/<upstream>/manifest.toml schema (exact field names for BibTeX assembly).

§ 5: wall-clock for one canonical sim extraction + latexmk compile.

STEP 5 — Implementation:

a. tools/productization/preprint-extraction/ per § 5.3. Sub-phase-specific files: extract.py, template/ (LaTeX class, BibTeX style, figures placeholder directory).

b. tools/productization/preprint-extraction/pipeline.py per § 5.5. discover_qualifying_sims returns the chosen canonical sim.

c. extract.py implements the mapping per phase plan § 6.5.

d. .github/workflows/preprint-extraction.yml per § 5.4, build-and-validate only. Sub-phase-specific:
   - tag prefix: 'preprint-v*'
   - matrix: single job (one canonical sim)
   - container: TeX Live image pinned to digest

e. docs/productization/preprint-extraction.md per § 5.6.

f. docs/preprints/<canonical-sim>/main.tex + references.bib (NO PDF committed; workflow builds on demand).

g. Reproducibility test: tools/productization/preprint-extraction/smoke/test_pipeline.py asserts fixed input spec sheet produces byte-equal main.tex across runs.

STEP 4 — Author tests at tools/productization/preprint-extraction/smoke/test_pipeline.py. **Capture failing output per spec § 1.3 step 4:**

    pytest tools/productization/preprint-extraction/smoke/test_pipeline.py -v 2>&1 | tee tools/testkit/failing-tests-evidence/phase-5-preprint-extraction-<UTC>.txt
    sha256sum tools/testkit/failing-tests-evidence/phase-5-preprint-extraction-<UTC>.txt

Confirm failure mode. Record hex for commit 1 footer.

**Bootstrap-style verification (per spec § 3.8): N/A for sub-phase 5.5.** The preprint output is a LaTeX document, not a capture re-emitter; physical-correctness is upstream of preprint extraction (the source sim's spec sheet was already gated through Phase 1+ acceptance). The deliverable's correctness gate is the byte-equal-across-runs reproducibility test (deliverable g above) plus latexmk-compiles-clean.

STEP 5a — **Cross-extraction reproducibility gate (deliverable g, made normative here per spec § 3.8 surrogate):**

1. Run `extract.py <spec-sheet-path> --output /tmp/main-run1.tex`.
2. Run `extract.py <spec-sheet-path> --output /tmp/main-run2.tex`.
3. Assert `cmp /tmp/main-run1.tex /tmp/main-run2.tex` returns 0 (byte-identical).
4. Run `latexmk -interaction=nonstopmode /tmp/main-run1.tex` in the pinned TeX Live container — must compile clean (exit 0, no missing-references warnings).

PASS gates the sub-phase. FAIL means the extraction is nondeterministic (likely cause: dict-iteration order in Python <3.7 or any hashed-collection iteration; document and fix by sorting keys before emission).

STEP 5b — **Perf-ledger row (informational; preprint extraction is fast).** Append:

    | <canonical-sim> | preprint-extraction-texlive-<digest> | spec-ref.md | <wall_clock> | <ci-runner-id> | <commit-sha> | <date> | preprint-bootstrap |

STEP 8 — Commit 2 shared-file edits as established. **This is the FINAL sub-phase: completing Phase 5 in full.** Completion report `evidence_hashes:` includes failing-tests-evidence file + main.tex sha256 + cross-extraction reproducibility-gate report.

Commit 1 footer:

    Failing-tests-output: tools/testkit/failing-tests-evidence/phase-5-preprint-extraction-<UTC>.txt
    Failing-tests-output-hash: sha256:<full-hex>

STEP 9a — **PHASE-CLOSE PROTOCOL (sub-phase 5.5 ONLY; per spec § 7.12 + v8 amendment).**

After commit 3 of sub-phase 5.5 lands and CI is green, prepare the phase tag. **DO NOT PUSH.** Per spec § 7.12 (operator-only phase-tag pushing):

1. Compose the proposed-tag block in commit 3's body:

       Proposed tag: v0.5.0-phase-5
       Tag commit SHA: <commit-3 SHA>
       Tag pushed: NO (operator action required)

2. Compose the Phase 5 landing audit at `docs/_audits/phase-5/landing-<UTC>.md`:
   - Front-matter per spec § 7.5 + Appendix G.7: date, author (this agent's session), subject (Phase 5 closing), verdict (CONFIRMED-all expected; or SHIFTED with documented per-sub-phase shifts), `evidence_paths:` listing every sub-phase audit + every failing-tests-evidence file + every re-emitted capture, `evidence_hashes:` with sha256 for each.
   - Body: aggregate verdicts from all five sub-phases; bootstrap-style verification outcomes (5.1, 5.2, 5.3 each PASS or SHIFTED-with-documented-divergence); render-similarity outcomes (5.4); preprint reproducibility outcome (5.5); evidence-path verification + append-only check outcomes; perf-ledger cross-environment observations.
   - Run `verify_evidence.py` on every sub-phase audit + this landing audit; record outcome as FACT.
   - Run append-only check against `v0.4.0-phase-4`; record outcome as FACT.
   - Final summary line: `Proposed tag: v0.5.0-phase-5` / `Tag commit SHA: <sha>` / `Tag pushed: NO (operator action required)`.

3. Commit the landing audit (commit 4 of sub-phase 5.5):

    git add docs/_audits/phase-5/landing-<UTC>.md
    git commit -m "phase5(stage5/preprint-extraction): closing audit + Phase 5 landing"

4. **The agent does NOT run `git tag` or `git push origin v0.5.0-phase-5`.** The operator reads the landing audit, runs `verify_evidence.py` independently, optionally runs `replay_prior_phase.py --prior-phase phase-5` from a Phase 6 perspective as a pre-check, and pushes:

    git tag -s v0.5.0-phase-5 <sha>
    git push origin v0.5.0-phase-5

Anticipated problems per phase plan § 6.5:
  - LaTeX class licensing: permissive standard class.
  - Missing BibTeX fields: minimal-entry fallback.
  - Markdown math: convert to LaTeX inline.
  - PNG figures: copy to figures/.
  - arXiv package restrictions: conservative class.
  - Cross-stack equivalence shape: robust extractor; DEFERRED if unusual.
  - **Cross-extraction reproducibility fails: investigate sort-order in the extractor. Common cause: emitting BibTeX in dict-iteration order. Fix: sort keys before emit. Surface to operator if irreducible; do NOT SHIFTED silently.**

Scope: extracts from spec-ref.md ONLY. Variant-sim spec sheets out of Phase 5. One canonical sim only.

Exclusions: same. **No tag pushing — operator only.** **No tolerance widening without operator-approved amendment.** **No edits to prior-phase audit files.**

Begin by viewing the input documents.
```

---

*End of Phase 5 plan.*

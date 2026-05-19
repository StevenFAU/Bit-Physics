---
date: 2026-05-19T03-27-54Z
author: phase-0-block-1-agent
phase: 0
artifact: block
artifact_id: block-1-foundation
verdict: SHIFTED
evidence_paths:
  - LICENSE
  - README.md
  - CHANGELOG.md
  - CITATION.cff
  - .gitignore
  - .gitattributes
  - .editorconfig
  - CONTRIBUTING.md
  - CODE_OF_CONDUCT.md
  - SECURITY.md
  - pyproject.toml
  - justfile
  - docs/architecture.md
  - docs/glossary.md
  - docs/phases/phase-0-plan.md
  - docs/dependencies.md
  - docs/perf-ledger.md
  - docs/sim-specs/_template.md
  - docs/testkit/overview.md
  - docs/testkit/capture-format.md
  - docs/testkit/references.md
  - docs/integrity/strict-mode.md
  - docs/ops/branch-protection.md
  - tools/dispatch/preflight-phase.py
  - tools/testkit/pyproject.toml
  - tools/testkit/README.md
  - tools/testkit/schemas/capture-v1.json
  - tools/testkit/schemas/golden-v1.json
  - tools/testkit/schemas/reference-manifest-v1.json
  - tools/testkit/capture/__init__.py
  - tools/testkit/capture/manifest.py
  - tools/testkit/capture/reader.py
  - tools/testkit/capture/writer.py
  - tools/testkit/capture/diff.py
  - tools/testkit/capture/tests/test_capture.py
  - tools/testkit/probes/template.md
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/solution_verification/README.md
  - tools/testkit/failing-tests-evidence/README.md
  - tests/fixtures/legacy-captures/README.md
  - references/README.md
  - .pre-commit-config.yaml
  - .github/workflows/structure.yml
  - .github/workflows/python-strict.yml
  - .github/workflows/ts-strict.yml
  - .github/workflows/integrity.yml
  - .github/workflows/determinism.yml
  - .github/workflows/equivalence.yml
  - .github/workflows/audit-append-only.yml
  - .github/workflows/tolerance-budget-check.yml
  - .github/workflows/mutation-testing.yml
evidence_hashes:
  - tools/dispatch/preflight-phase.py: ba20036e74ed2ad4f03704138366881d677fccb60cd900cb10b3aeb76c43e8b6
  - tools/testkit/schemas/capture-v1.json: 7f4b5fa5a74c730996deb89aa5623644445f98ab8e69f901e6e31f4cb21cf2e1
  - tools/testkit/schemas/golden-v1.json: 8344b304b30247def1cf655db43b2df21a92e34ddb93c274727b52abc3e5258f
  - tools/testkit/schemas/reference-manifest-v1.json: 63cde2bad18694cd61969adcd54e62cd30bb91ed575bb263d36d1f2d3f90839b
  - tools/testkit/capture/__init__.py: 9f316190c08de8bf0f1def0623421bfec3217273fa8e9ecc259b4b97a5dac5bf
  - tools/testkit/capture/reader.py: aafe6c5bc5a017ecc196875dfb28c04dbd63d4612844e0cf395a2329c94a2ffe
  - tools/testkit/capture/writer.py: 29493e2b393e0c875858b6b42545f72e68d791b13b8eba9bd7a3971fbf084bec
  - tools/testkit/capture/diff.py: 9f84b1682969e716bd340a3265cd49893ff8340c1252b1e4e097995d5b745fa8
  - tools/testkit/capture/manifest.py: 2f5694c74b4c6d774c34b2ff77898d0c7f5e4f3db388ecb976da806780e762d0
  - tools/testkit/equivalence/tolerance-budget.toml: ff335be9fbbf848dd051f2bf3bc3234bf93cd7d428d11be71aa3b472ab7f3a96
  - .pre-commit-config.yaml: c695813bc452031d7b6efc3becac50c08a543b2afe86c92bb5124c0e7f85a1ec
head_sha: 1f052dfd10062bea9c20f7767697f7578798335d
deferred_items:
  - { item: "pnpm install (local + CI)", target_phase: 0, rationale: "Block 7 (COMMON-TS) precondition; Phase 0 preflight reports FAIL on tool-available:pnpm. Documented in docs/dependencies.md and surfaced here so the operator installs pnpm before Block 7 begins." }
  - { item: "Activate `audit-append-only.yml` against the first phase tag", target_phase: 1, rationale: "Phase 0 has no prior phase tag; the workflow goes live for Phase 1's first push per phase-0-plan.md § 7.1 deliverable 13." }
ci_activation: []
top_level_deps_to_merge:
  - { file: tools/testkit/pyproject.toml, addition: "h5py>=3.10, jsonschema>=4.20, numpy>=2.0" }
  - { file: tools/testkit/pyproject.toml, addition: "[dev] mypy>=1.10, pytest>=8.0, pytest-cov>=5.0, ruff>=0.5" }
---

## 1. What was built

All file paths below are FACT-tagged (each was committed in
`1f052dfd10062bea9c20f7767697f7578798335d`; `git ls-files` enumerates them).

### Repo skeleton and metadata

- **FACT:** `LICENSE` — MIT (spec § 12.7, Decision #5).
- **FACT:** `README.md`, `CHANGELOG.md` (Keep a Changelog v1.1.0),
  `CITATION.cff`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- **FACT:** `.gitignore`, `.gitattributes` (LF normalization for text;
  binary marker for `.h5`/`.png`/`.jpg`/`.pdf` etc.), `.editorconfig`.
- **FACT:** `pyproject.toml` — uv workspace root with `[tool.uv.workspace]
  members = ["tools/testkit"]`.
- **FACT:** `justfile` — `test`, `lint`, `build-all` recipes.

### Vendored canonical documents

- **FACT:** `docs/architecture.md` — `gpu-sims-design-spec-v2.md` v2.4 vendored at
  3256 lines. Includes Appendices D (shared invariants), E (agent playbook),
  F (dispatch operations), G (convention catalog full text) as required by
  Phase 0 plan deliverable #6.
- **FACT:** `docs/phases/phase-0-plan.md` — v0.10 vendored at 2045 lines.
- **FACT:** `docs/glossary.md` — Appendix C mirrored verbatim (Phase 0 plan
  deliverable #4).

### Documentation scaffolding

- **FACT:** `docs/dependencies.md` populated with pre-commit-hooks v6.0.0,
  ruff-pre-commit v0.15.13, conventional-pre-commit v4.4.0, uv 0.11.15,
  Python 3.12+, Node 22+, pnpm 10+, h5py / numpy / jsonschema (Phase 0
  Block 1 deliverable #9 + § 4 verified dependencies). Tags verified via
  `gh release view -R <repo>` on 2026-05-18.
- **FACT:** `docs/testkit/{overview,capture-format,references}.md` (plan
  deliverables #11, #12 docs, #15).
- **FACT:** `docs/ops/branch-protection.md` documents the operator-applied
  server-side rules (plan deliverable #13a).
- **FACT:** `docs/perf-ledger.md` scaffold (plan deliverable #21).
- **FACT:** `docs/sim-specs/_template.md` — 13-section template (plan
  deliverable #17 + spec § 8.2 v2.1 amendment; § 13 "Productization status").
- **FACT:** `docs/integrity/strict-mode.md` stub (plan deliverable in spirit
  of Block 5; seeded here so Block 5 extends rather than creates).
- **FACT:** `docs/_audits/phase-0/.gitkeep`, `docs/diagnostics/_audits/.gitkeep`,
  `docs/integrity/_audits/.gitkeep`,
  `docs/_audits/tolerance-budget-amendments/.gitkeep` (plan deliverable #20).

### Dispatch + preflight

- **FACT:** `tools/dispatch/preflight-phase.py` — script with
  `phase_0_preflight()` through `phase_5_preflight()` + CLI entry point per
  plan deliverable #10. Local run on Block 1 close:
  `python3 tools/dispatch/preflight-phase.py 0` → PASS for git/python3/uv/
  node/in-git-repo; FAIL on pnpm (Block 7 precondition; deferred item).

### Testkit (Block 1 scope)

- **FACT:** `tools/testkit/pyproject.toml` — workspace member; deps h5py,
  jsonschema, numpy + dev extras (mypy, pytest, pytest-cov, ruff).
- **FACT:** `tools/testkit/schemas/{capture-v1,golden-v1,reference-manifest-v1}.json`
  — Draft 2020-12; each schema validates against the Draft 2020-12
  meta-schema (`Draft202012Validator.check_schema(...)` returns clean).
- **FACT:** Capture format module per the public API in
  `docs/phases/phase-0-plan.md` § 3.3.1: `__init__.py`, `reader.py`
  (`Capture`, `StepState`, `load_capture`), `writer.py` (`write_capture`),
  `diff.py` (`CaptureDiff`, `diff_captures` with `bit-exact` + `epsilon`
  modes; raises `TypeError` on dtype mismatch), `manifest.py`
  (`CaptureManifest`, `validate_capture_manifest`,
  `load_reference_manifest`). HDF5 payload layout matches spec § 2.7:
  `/steps/{N}/state/{field_name}`, `/steps/{N}/diagnostics/{check_name}`,
  `/metadata/` attrs.
- **FACT:** `tools/testkit/capture/tests/test_capture.py` — 11 tests, all
  green under `pytest -W error`:
  - `test_schema_validates_canonical_manifest`
  - `test_schema_rejects_bad_version`
  - `test_schema_rejects_unknown_field`
  - `test_write_then_read_round_trip`
  - `test_hdf5_layout_matches_spec`
  - `test_diff_bit_exact_same`
  - `test_diff_epsilon_equal`
  - `test_diff_fails_on_mismatch`
  - `test_diff_raises_on_dtype_mismatch`
  - `test_load_reference_manifest_validates`
  - `test_load_reference_manifest_rejects_missing_field`
- **FACT:** `tools/testkit/probes/template.md` (plan deliverable #18) +
  `tools/testkit/probes/reports/.gitkeep`.
- **FACT:** `tools/testkit/solution_verification/.gitkeep` + `README.md`
  declaring Phase 1+ deferral (plan deliverable #19).
- **FACT:** `tools/testkit/failing-tests-evidence/.gitkeep` + `README.md`
  documenting the TDD output-hash convention per spec § 1.3 step 4
  (plan deliverable #22).
- **FACT:** `tools/testkit/equivalence/tolerance-budget.toml` with the spec
  § 2.6 default caps (plan deliverable #23).
- **FACT:** `tools/testkit/references` → `../../references` symlink
  (plan deliverable #16).

### Schema-corpus + references scaffolds

- **FACT:** `tests/fixtures/legacy-captures/.gitkeep` + `README.md` (plan
  deliverable #24; Block 8 lands first entry).
- **FACT:** `references/.gitkeep`, `references/README.md`,
  `references/papers/.gitkeep` (plan deliverable #16 / # in spirit of
  Phase 4 pre-dispatch vendoring).

### Pre-commit + CI

- **FACT:** `.pre-commit-config.yaml` with the v0.10-locked toolchain
  versions (plan deliverable #14):
  - `pre-commit/pre-commit-hooks` `v6.0.0`
  - `astral-sh/ruff-pre-commit` `v0.15.13`
  - `compilerla/conventional-pre-commit` `v4.4.0`

  `pre-commit run --all-files` PASS on Block 1 close.
- **FACT:** Nine CI workflows under `.github/workflows/` (plan deliverable
  #13). `structure.yml` and `python-strict.yml` are **active**;
  `ts-strict.yml`, `integrity.yml`, `determinism.yml`, `equivalence.yml`,
  `audit-append-only.yml`, `tolerance-budget-check.yml`,
  `mutation-testing.yml` are **gated** `if: ${{ false }}` (Block 9
  activates per their respective owning blocks).

## 2. Design decisions made

### SHIFTED: preflight-phase.py byte-for-byte rule

- **INFERENCE:** Phase 0 plan § 7.1 deliverable 10 requires the script to
  be committed verbatim from the embedded source. The embedded source
  imports `os` but never uses it; ruff F401 fires under strict-mode CI
  (Convention G.9), creating a direct conflict between deliverable 10
  ("byte-for-byte") and the self-verification list ("`pre-commit run
  --all-files` passes"). Per **Pattern N** in Appendix E (strict-mode CI
  false-positive triage), the narrowest correction was applied: drop the
  unused import. A short comment was added at the top of the imports block
  documenting the SHIFTED deviation and pointing the reader here. The
  script's functional behavior is identical to the embedded source.
- The other ruff-format cosmetic reflow (trailing commas, line wraps) on
  the same file is idempotent; it does not change semantics.

### SHIFTED: pnpm not present in the dispatch host

- **FACT:** `python3 tools/dispatch/preflight-phase.py 0` reports
  `[FAIL] tool-available:pnpm` on the dispatch host (`pnpm` was not in
  PATH at Block 1 time). All other Phase 0 preflight tools are available
  (`git`, `python3`, `uv`, `node`).
- **INFERENCE:** pnpm is a Block 7 precondition (Stack B TypeScript work).
  It is harmless to defer the install; logged here as a deferred item and
  in `docs/dependencies.md` so the operator installs pnpm before Block 7
  begins.

### INFERENCE: directories owned by later blocks are NOT pre-scaffolded

- Per § 3.4 of the Phase 0 plan, the file-system layout includes many
  directories Block 1 does not own (e.g., `common/common-ts/`,
  `packages/reaction-diffusion-2d/`, `tools/integrity/`, `tools/diagnostics/`,
  `tools/testkit/code_verification/mms/`). Block 1 deliberately does NOT
  create stub READMEs for these; later blocks own the directories and their
  initial commit creates them. The `structure.yml` CI check lists only the
  directories Block 1 actually ships; later blocks extend the check.

### INFERENCE: pre-commit hook tag pins

- The plan instructs to "look up current tags at Block 1 time" (deliverable
  #14). Per Convention-8 I verified each via `gh release view -R <repo>`
  on 2026-05-18 and recorded the tags in both `.pre-commit-config.yaml`
  and `docs/dependencies.md`. Re-verification at a later block (e.g., when
  pre-commit auto-updates) is operator-discretionary.

## 3. Open items

- **pnpm** must be installed before Block 7's preflight passes. See
  deferred-items entry.
- **`audit-append-only.yml`** has no prior phase tag to compare against
  during Phase 0; it goes live for Phase 1's first push. The workflow ships
  gated and includes a `git tag --list 'v*-phase-*'` early-out for the
  first run.
- **Cat 4 hook** is reserved for Block 5 in `.pre-commit-config.yaml` via a
  trailing comment placeholder. No action required from Block 2.
- **Failing-tests evidence scaffold** is empty; Block 8 produces the first
  real entry.
- **Schema-corpus** at `tests/fixtures/legacy-captures/` is empty; Block 8
  seeds `phase-0-rd-2d-ref.h5` + `.json`.
- **uv.lock** committed at workspace root; locks pytest-cov / mypy / ruff
  / numpy / h5py / jsonschema for reproducible CI.

## 4. Conventions honored

- **Convention-A** (new-files-first decomposition). Every file in this
  commit is net-new; the constraint is satisfied trivially.
- **Convention-8** (no fabrication). Pre-commit hook tag versions and uv
  version verified at execution time via `gh release view` / `uv
  --version` rather than asserted from memory; values recorded in
  `docs/dependencies.md` and `.pre-commit-config.yaml`.
- **Convention-M** (re-anchor before edit). N/A on a fresh repo with all-new
  files; will apply from Block 2 onward.
- **Convention-12** (no `git --amend`). Honored — the Block 1 commit was
  authored once and the SHA is `1f052dfd10062bea9c20f7767697f7578798335d`.
- **Conventional Commits** — commit message header
  `feat(foundation): Phase 0 Block 1 — repo skeleton, capture format, CI scaffolds`.
- **FACT / INFERENCE tagging** applied throughout this report.
- **Hard Rule 2** — the empty-repo baseline matched the v0.9 expectation;
  no surface was needed.

## 5. Acceptance summary

Block 1 deliverables 1–24 are all landed (deliverables 7, 8 explicitly
removed in v0.10). Verdict is **SHIFTED** rather than CONFIRMED solely
because of the byte-for-byte deviation on `preflight-phase.py` (one unused
import dropped to satisfy strict-mode CI). The shift is functionally inert
and is documented above per Pattern N.

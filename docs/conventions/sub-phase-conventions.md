# Sub-Phase Conventions — Cross-Sub-Phase Reference

> **Document type:** Project convention reference (consolidation of cross-cutting patterns from four landed per-sim implementation sub-phases — closed-form, agent-based, continuous-CA-rd3d, particle-fluids-sph-water — plus three focused infrastructure-hotfix sub-phases — replay-tool, numba-integration, mutation-script).
> **Landed at:** sub-phase-conventions-consolidation (per `sub-phase-particle-fluids-sph-water` landing audit § 9.3 row 7 banked observation; operator decision to consolidate at cumulative shift count 65).
> **Status:** referenceable. Every convention in §§ A–P is something that has actually happened across the audit chain (FACT or INFERENCE-from-multiple-audits, tagged at the convention level). § N graduated from PROPOSED to established at `sub-phase-conventions-refactor-post-phase-1` per three single-session-ready Stage 1s (eulerian-smoke / LBM / MPM); § P (capture cadence routing) was added at the same refactor.
> **Read order:** future sub-phase plan-drafting agents read this document FIRST, then inherit specifics from the most-recent prior sub-phase landing audit. Per-sub-phase plans at `docs/phases/sub-phase-*.md` remain self-contained inheritance-by-most-recent-template artifacts and are NOT retroactively rewritten to point at this document.
> **Reading by topic:** §§ A B C D E K L M are universally load-bearing for any sub-phase. §§ F G are load-bearing for per-sim implementation sub-phases (not for infrastructure hotfixes). § H is load-bearing only for sub-phases consuming vendored upstream. §§ I J are load-bearing only at Stage 2. §§ N P are load-bearing at Stage 0 for sub-phases producing a canonical capture (Task 0.4 + capture cadence routing).

---

## § A. Sub-phase architecture

### A.1 Sub-phase identity

A **sub-phase** is a spec § 7.13 artifact type that gates work scoped under a spec-phase (here, spec-Phase-1). It is NOT a new spec-phase: spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries (N a single integer), and the regex `_SEMVER_PHASE_TAG_RE` at `tools/integrity/integrity/scripts/replay_prior_phase.py` mechanically rejects multi-segment or suffixed phase tags. Two flavors observed:

| Flavor | Examples | Identity |
|---|---|---|
| **Per-sim implementation sub-phase** | `sub-phase-closed-form`, `sub-phase-agent-based`, `sub-phase-continuous-ca-rd3d`, `sub-phase-particle-fluids-sph-water` | Implements gates 4–13 (spec § 3.5) for one or two sims under spec-Phase-1's category surface. |
| **Focused infrastructure hotfix sub-phase** | `sub-phase-replay-tool-hotfix`, `sub-phase-numba-integration`, `sub-phase-mutation-script-hotfix` | Surgical infrastructure repair, audit-chained + regression-tested. Resumed by the blocked sub-phase against the repaired infrastructure. |

(FACT — sub-phase identity declared at `sub-phase-closed-form.md` § 1.1 frontmatter; pattern continued at every subsequent sub-phase. Hotfix precedent established at `sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md`.)

### A.2 Three-stage cadence

Every per-sim implementation sub-phase ships under three stages:

| Stage | Owner | Output |
|---|---|---|
| **Stage 0 — Pre-flight** | Single Claude Code session | Cross-phase replay PASS; tolerance-budget carryover; failing-tests-evidence sha256 re-verify; sub-phase-specific Task 0.3 (e.g., RD-2D MMS scope, SPlisHSPlasH manifest, canonical-descriptor analysis per § N); Stage 0 checkpoint audit. |
| **Stage 1 — Per-sim implementation** | One Claude Code session per sim; partial-checkpoint pattern permitted | 13-gate GREEN for the sim(s); per-sim sub-bundle commit (gates 4–13); Stage 1 checkpoint audit. |
| **Stage 2 — Landing** | Single Claude Code session if Stage 1 was clean | Convergence-file edits (CHANGELOG additive, integrity registries if any); integrity sweep; gate-13 replay verification per sim; mutation-score artifact; sub-phase landing audit; Convention #12 SHA back-fill. |

(FACT — three-stage cadence declared at `sub-phase-closed-form.md` § 1.5; inherited verbatim at `sub-phase-agent-based.md`, `sub-phase-continuous-ca-rd3d.md`, `sub-phase-particle-fluids-sph-water.md` with at most a per-sub-phase delta — e.g., RD-3D's 10-step sequence vs closed-form's 8-step sequence to absorb MMS gate-5 + commit-footer ladder.)

**Gate-11 (determinism) mechanism.** Within the Stage 1 13-gate GREEN target, gate-11 is witnessed by `tools/testkit/determinism::run_twice_and_diff` (Python) or `@bit-physics/common-ts::runTwiceAndDiff` (TypeScript). The harness compares parsed Capture projections (every state array + every diagnostic entry element-wise) under the content-equivalent contract established at `sub-phase-capture-determinism-contract` per spec § 2.5. See § F.3 for the Content-equivalent vs FP-equivalent contract distinction.

**Focused infrastructure hotfix sub-phases do NOT follow the three-stage cadence.** They ship a single repair audit with embedded V1–V5 validation, parallel to the replay-tool-hotfix shape (FACT — `repair-2026-05-20T19-06-35Z.md` § 7 validation table).

### A.3 Role model

(FACT — inherited from Phase 1 plan § 1.5, declared at `sub-phase-closed-form.md` § 1.4, every subsequent sub-phase plan cites it.) Per sub-phase: one Claude Code agent at a time, one Claude.ai coordinator chat, one operator. The coordinator validates nothing substantively; routing is the operator's. **One agent dispatch per session**: Stage 0, Stage 1 (per sim), Stage 2 each get a fresh Claude Code session; continuation prompts (Phase 1 plan § 8.3 pattern) re-anchor when context tightens.

### A.4 Plan-then-dispatch discipline

Every sub-phase has a plan document committed at `docs/phases/sub-phase-<slug>.md` BEFORE Stage 0 is dispatched. The plan-drafting session is itself a coordinator-driven Claude Code session ahead of the implementation sessions. Each plan inherits structure from the most-recent prior sub-phase plan (the "inherit-by-most-recent-template" pattern):

- `sub-phase-closed-form.md` is the original template.
- `sub-phase-agent-based.md` inherits closed-form + adds determinism-strategy declaration + P22.
- `sub-phase-continuous-ca-rd3d.md` inherits agent-based + adds MMS gate-5 (P23) + scope-decomposition rationale.
- `sub-phase-particle-fluids-sph-water.md` inherits RD-3D + adds vendored-upstream discipline (P24).

(INFERENCE — chain visible across the four plan documents' frontmatter "Parent sub-phase templates:" field.) **Per-sim playbook entries (P21 closed-form, P22 agent-based, P23 RD-3D, P24 SPH) stay in their sub-phase's plan**; only the PATTERN of adding playbook entries per sub-phase is consolidated here.

---

## § B. Audit chain discipline

### B.1 Append-only invariant

Audit files are **sealed at the boundary where they land**:

- Phase 0 landing audit sealed at `v0.0.0-phase-0`.
- Phase 1 Stage 1 / Stage 2 / Stage 3 audits sealed at `v0.1.0-phase-1`.
- Each per-sim sub-phase audit chain sealed at that sub-phase's landing SHA (closed-form `2cc0f21`, agent-based `739c93f`, replay-tool-hotfix `1f5fa0c`, continuous-CA-rd3d `0df358d`, numba-integration `569c883`, particle-fluids-sph-water `281c74f1` then mutation-script-hotfix landing).

(FACT — `sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md` § 7.5 enumerates four protected sets; `sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md` § 7.5 enumerates six.) The protected set grows by one entry per sub-phase. Stage 2 step 2.6 ("Append-only check") verifies no edits to files present at any prior protected-set SHA.

**Two enforcement modes:**

- **CI semantics** (load-bearing): `grep -E '\.ledger\.md$'` in `.github/workflows/audit-append-only.yml`. Filters to `*.ledger.md` files only. At HEAD no `*.ledger.md` file exists, so CI is trivially clean for sub-phase work.
- **Strict mode** (advisory): all files at the protected SHA. The Phase 1 landing audit § 7 Step 5c documented the historical Phase 0 `progress.md` → `ledger.md` supersedence (commit `8776791`) as the reason CI filters; strict mode flags it as a false positive.

### B.2 Convention #12 — SHA back-fill at every stage close

(FACT — Phase 1 plan § 7.5 / § 10; established at `sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md` § 8.2 N2 as a load-bearing discipline.)

**The pattern.** When closing a stage, you cannot know the closing-commit SHA at the time the audit body is authored, because the audit IS the closing commit's payload. The discipline:

1. Author the audit with `head_sha:` set to a placeholder (e.g., the prior commit SHA, or `<PLACEHOLDER>`).
2. Commit the audit (the closing commit).
3. `git rev-parse HEAD` to capture the actual closing-commit SHA. **The full 40-hex SHA MUST be captured via `git rev-parse HEAD` at summary-composition time, NOT transcribed from earlier conversation context.** Same-short-SHA-prefix collisions are routine: the first 8 hex characters cover ~4 billion possibilities, and per-sub-phase activity routinely produces multiple SHAs sharing a short prefix. Eulerian-smoke Stage 2 N1 and MPM Stage 2 closing summary both surfaced transcription drift on the closing-summary SHA — same short prefix, different full hex. This is a **belt-and-suspenders discipline**: even when documented, the transcription failure mode persists when agents carry SHAs through context rather than regenerating; the corrective is always-regenerate at summary-composition time. The same discipline applies to every closing-summary SHA an audit body cites (Stage 0 / Stage 1 / Stage 2 closing-commit SHAs; per-sim sub-bundle commit SHAs; etc.) — regenerate via `git rev-parse HEAD` or `git log -1 --format='%H'`, do not transcribe.
4. Edit the audit's `head_sha:` field to the actual SHA.
5. Commit AGAIN as `chore(<slug>-sha-backfill): back-fill landing audit SHA per Convention #12`.

**Never `--amend`.** A `--amend` changes the closing-commit SHA, which would invalidate the back-fill. The two-commit pattern is load-bearing.

**Apply at every stage close, not just landing.** The closed-form audit § 8.2 N2 surfaced a Stage 0 SHA back-fill omission as a defect (the Stage 0 checkpoint's `head_sha:` was set to the prior tolerance-budget commit `6d5ac0e` rather than the closing-commit `3537651`). Agent-based onwards apply Convention #12 SHA back-fill at Stage 0, Stage 1, AND Stage 2 closes (FACT — `sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md` § 4 lists `92ca669`, `9c4eb2f`, and the Stage-2 back-fill).

### B.3 Front-matter fields

(FACT — inherited from Phase 1 audit § 1; Phase 1 Stage 3 shift #19 documented a tool-vs-convention drift since resolved at closed-form Stage 2 N3 / commit `3b79cfa`.)

| Field | Required? | Notes |
|---|---|---|
| `date:` | always | ISO date or UTC timestamp. |
| `author:` | always | `<sub-phase-slug>-agent` for sub-phase work; `<scope>-agent` for hotfixes. |
| `artifact:` | always | Enum: `block | stage | task | wu | sub-phase | phase-landing`. Stage checkpoints use `stage`; landing audits use `sub-phase`. |
| `artifact_id:` | always | e.g., `sub-phase-agent-based`, `agent-based-stage-1`. |
| `verdict-state:` | landing audits | `CONFIRMED` or `BLOCKED`. |
| `head_sha:` | always | Required by `verify_evidence.py`; back-filled per Convention #12. |
| `head_sha_at_checkpoint:` | always | Convention-preserving field for author-convention; verify_evidence reads `head_sha:`. Phase 1 shift #19 noted future audits should standardize on `head_sha:`; the dual field is retained for clarity. |
| `parent_audits:` | every checkpoint + landing audit | List the prior-stage / prior-sub-phase landings the current audit inherits from. |
| `supersedes:` | continuations only | Used at Stage 1 final-checkpoint to supersede a Stage 1 partial-checkpoint (FACT — `sub-phase-particle-fluids-sph-water/stage-1-checkpoint-2026-05-22T01-31-12Z.md` supersedes `…/stage-1-checkpoint-partial-2026-05-20T22-27-08Z.md`). |
| `evidence_paths:` | always | Files cited as evidence. `verify_evidence --strict` resolves each. |
| `evidence_hashes:` | always | sha256 of each evidence path. Use the `sha256:HEX` prefix form (tool-accepted after closed-form Stage 2 N3). For LFS-tracked entries the recorded hash is the **actual content sha256** (matching `git lfs ls-files` OID and direct `sha256sum` on the smudged file), NOT the LFS pointer-text sha256. See § B.6. |

### B.4 Audit directory structure

(FACT — established at `sub-phase-closed-form/`; pattern continued.) Sub-phase audits live under `docs/_audits/phase-N/sub-phase-<slug>/`, nested under the parent phase's audit dir. Hotfix audits are siblings, NOT children of any per-sim sub-phase: `docs/_audits/phase-1/sub-phase-replay-tool-hotfix/`, etc.

Per sub-phase the audit chain typically contains:

```
docs/_audits/phase-1/sub-phase-<slug>/
├── stage-0-checkpoint-<UTC>.md            # Stage 0 close
├── stage-0-blocked-replay-<UTC>.md        # if Stage 0 BLOCKED
├── stage-0-evidence-reverify-<UTC>.txt    # supporting evidence
├── stage-0-replay-<UTC>.txt               # supporting evidence
├── stage-1-checkpoint-<UTC>.md            # Stage 1 close (or partial)
├── stage-1-checkpoint-partial-<UTC>.md    # if Stage 1 ran long
├── stage-1-continuation-stop-and-surface-N-<UTC>.txt  # R-class surfaces (see § K)
├── stage-1-gate13-replay-<UTC>.txt        # gate-13 worktree replay output
├── stage-1-<other-equivalence>-<UTC>.txt  # per-sub-phase supporting evidence
├── stage-2-evidence/                      # Stage 2 evidence subdirectory
│   ├── anchor-recheck-<UTC>.txt
│   ├── test-sweep-positive-<UTC>.txt
│   ├── test-sweep-negative-<UTC>.txt
│   ├── integrity-cats-<UTC>.txt
│   ├── integrity-cat3-<UTC>.txt
│   ├── verify-evidence-<UTC>.txt
│   ├── gate13-replay-<sim>-<UTC>.txt
│   ├── append-only-<UTC>.txt
│   └── mutation-pathA-output-<UTC>.txt    # if PATH-A
└── landing-<UTC>.md                       # Stage 2 close (the sub-phase landing audit)
```

### B.5 Audit-internal cross-references

Use `[[<audit-name>]]` (without the `.md` extension) to link related audits inside an audit body (FACT — pattern visible across landing audits' "Stage 2 convergence commits" tables). At HEAD this is a documentation convention; no machine-readable index resolves it, but the consistency aids grep-based navigation.

### B.7 Cross-package regression sweep — Python + TypeScript fan-out

(FACT — established at `sub-phase-capture-determinism-contract`; the FIRST sub-phase to ship both Python and TypeScript implementation surface in a single Stage 1 commit.)

When a sub-phase ships implementation surface in BOTH Python (workspace members at `packages/*` / `tools/*` / `common/common-py/`) AND TypeScript (`common/common-ts/`), the Stage 2 cross-package regression sweep MUST fan out across both stacks. The shape:

```
# Python fan-out (per-package per § M.4 N1 import-path-collision; one-package-at-a-time)
for pkg in <9 phase-1 sims> tools/integrity tools/diagnostics tools/testkit common/common-py; do
  (cd <pkg> && uv run pytest tests/ -v)
done

# TypeScript fan-out
(cd common/common-ts && pnpm install --frozen-lockfile && pnpm vitest run)
```

Both sweeps' outputs are captured to the Stage 2 evidence directory with their respective sha256s. The landing audit § 5 (or § 6, per the per-sub-phase convention) records both totals (Python tests count + TypeScript tests count) and reports any counting-variance per the conventions-refactor § 6.1 N1 reporting-mode discipline.

**When a sub-phase ships ONLY Python surface**, only the Python fan-out runs; the TypeScript fan-out is a NO-OP. Symmetric for TypeScript-only sub-phases. The fan-out shape is declared at Stage 0 Task 0.x routing per the sub-phase's deliverable surface.

(INFERENCE — first per-sub-phase exercise of this discipline at `sub-phase-capture-determinism-contract`; subsequent sub-phases consume the discipline by reference rather than re-declaring it.)

### B.6 Evidence-paths strict-verify discipline

(FACT — recurring drift pattern across RD-3D Stage 2 N1, eulerian-smoke Stage 2 N1, LBM Stage 2 N2, MPM Stage 2 N2 — **4 of 7 per-sim sub-phases**.)

**Authoritative rule.** The audit-recorded `evidence_hashes` value is the **sealed-at-commit-time** sha256 of the evidence-path file. Per § B.1's append-only invariant, the sealed value is the load-bearing artifact identity; any divergence reported by `verify_evidence` against HEAD is interpreted relative to the sealed value, NOT the other way around.

**Recurring drift modes.**

- **Mode 1: file content evolved between audit-time and HEAD** (RD-3D N1, eulerian-smoke N1, LBM N2). The `verify_evidence` strict-mode comparison flags a mismatch when an evidence file is touched by a later commit. Per § B.1 the sealed sha256 is load-bearing; the divergence is informational, not corrective.
- **Mode 2: LFS-tracked evidence pointer-vs-content** (MPM N2; first surface of this mode). `verify_evidence`'s `tools/integrity/integrity/common/repo.py:62-72::file_at_sha()` uses `git show <sha>:<path>` to read evidence at the recorded SHA. For LFS-tracked files, `git show` returns the LFS **pointer-text stub** (the `version https://git-lfs.github.com/spec/v1\noid sha256:<actual-content-sha>...` payload), NOT the smudged actual content. The audit's claimed sha256 is the **actual on-disk content sha256** (matching `git lfs ls-files` OID + direct `sha256sum` on the smudged file). `verify_evidence` therefore compares the audit's content-sha256 against the pointer-stub's sha256 and structurally cannot match.

**Concrete remediation options (operator-routable; this convention documents the discipline, does NOT pick an option).**

1. **Teach `verify_evidence` about LFS smudging.** Extend `file_at_sha()` to detect LFS pointer files and invoke `git lfs smudge` (or equivalent) before hashing. Single-tool change; preserves the existing `evidence_hashes:` schema. Risk: requires LFS to be installed and configured everywhere `verify_evidence` runs.
2. **Split `evidence_hashes` into `pointer_sha256` vs `content_sha256` for LFS entries.** Schema extension carrying both hashes for LFS-tracked evidence; `verify_evidence` checks either against the on-disk artifact based on file type. Risk: schema churn in landing audits; back-fill on prior audits would be append-only-invariant-breaking.
3. **Accept the recurring pattern with explicit annotation.** Document in landing audits (per the MPM landing § 7.3 pattern) that LFS-tracked evidence_paths trigger an expected-shape `verify_evidence` mismatch; the sealed `evidence_hashes` content sha256 remains load-bearing per § B.1; no tool change. Risk: ongoing audit-time annotation burden across every sub-phase shipping LFS-tracked evidence.

**Lean for spec-Phase-2 entry.** Option 1 (teach `verify_evidence` about LFS) is the principled fix; landing it under a focused infrastructure hotfix sub-phase (mirroring `sub-phase-mutation-script-hotfix` shape) would close the recurring drift cleanly. Operator decision at next available routing point. Cross-reference: `docs/_audits/phase-1/sub-phase-git-lfs-migration/landing-2026-05-22T21-04-05Z.md` for the LFS infrastructure context.

**Mode 2 RESOLUTION (sub-phase-audit-chain-correctness Stage 1a; `feat(audit-chain-correctness-stage1a)`).** §B.6 **Mode 2 is RESOLVED.** Option 1 landed via its **OID-parse refinement**: `verify_evidence` (through `tools/integrity/integrity/common/repo.py` `lfs_pointer_oid()`) detects an LFS pointer stub by its `version https://git-lfs.github.com/spec/v1` prefix and parses the `oid sha256:<hex>` line — the content-addressed sha256 that *is* the audit-recorded content OID per § B.1 — and compares THAT against `evidence_hashes`. Non-LFS blobs hash unchanged (git-blob sha256); the mismatch→error contract is preserved. This **dissolves Option 1's stated install/network risk**: no `git lfs smudge`, no network, no LFS authentication — the OID is parsed offline from the committed pointer text. Empirical proof: `verify_evidence` on the RD-2D Stack-D landing audit moved from **29 pass / 2 fail** (the two `captures/**/*.h5` pointer-vs-content shape-mismatches) to **31 pass / 0 fail**. **Consequence for every subsequent sub-phase: Option-3 annotation is NO LONGER REQUIRED** — LFS-tracked `evidence_hashes` entries verify GREEN directly, so landing audits need not carry the MPM § 7.3-style §B.6 Mode-2 annotation. This is **IC-16** (verify_evidence LFS-content-OID semantics). (Mode 1 remains informational per § B.1; a **Mode 3 — phantom-sha / pre-commit-hook trailing-newline** — is added at this sub-phase's Stage 1b, re-classifying the RD-3D-ref drift currently mis-listed under Mode 1.)

- **Mode 3: phantom-sha / pre-commit-hook trailing-newline drift** (sub-phase-audit-chain-correctness Stage 1b; `docs(audit-chain-correctness-stage1b)`). A recorded `evidence_hashes` sha256 equals the sha256 of the artifact content *without* its trailing newline. **Root cause:** an agent computed the sha256 on **in-memory pre-hook content**; the pre-commit `end-of-file-fixer` hook (active since Phase 0 Block 1, `1f052df`) appended a trailing newline at commit time, so the committed blob's sha256 differs from the in-memory pre-hook content's sha256. **Detection signature:** the recorded value equals the sha256 of the committed content with a single trailing newline stripped. **Resolution:** NOT a tool fix at this sub-phase — the working mitigation is the **commit-first-then-sha256** agent discipline (record the committed-blob sha256, never in-memory pre-hook content). Banked future-tooling options (out of scope here): remove/modify the `end-of-file-fixer` hook, OR teach `verify_evidence` to optionally accept both the content sha256 and the trailing-newline-stripped sha256 for text artifacts. **Portfolio-wide incidence: exactly 2** (per the Stage 1b audit) — the RD-2D Stack-D capture `.json` (`a7780645…`, in the RD-2D Stack-D Stage 1b/1c checkpoints) and the RD-3D-ref capture `.json` (`ccd0e4ea…`, in the RD-3D-ref Stage 1 checkpoint + Stage 2 evidence); both live only in sealed checkpoints, and both sub-phase landings record the correct committed value. **Re-classification:** the RD-3D-ref drift listed under **Mode 1** above ("content evolved") is **re-classified as Mode 3** — the RD-3D-ref blob never changed (single commit `2942407`; RD-3D-ref landing § 8 N1), so the drift is phantom-sha, not content evolution. Mode 1's other listed examples (eulerian-smoke N1, LBM N2) are genuine content-evolution and stand. **Reference:** `docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-2026-05-23T22-39-45Z.md` (charter § 1.4.2). Per Convention A + § 12 + D5 the phantom-bearing prior checkpoints are NOT amended or annotated; this Mode-3 entry + the Stage-1b report are the canonical going-forward record.

---

## § C. Commit-message convention

### C.1 Slug form

All sub-phase commits use the form:

```
<type>(<scope>): <subject>
```

(FACT — inherited from Phase 1 plan § 7.5; sub-phase scopes established at `sub-phase-closed-form.md` § 7 standing orders.)

| Type | Use | Examples |
|---|---|---|
| `chore` | infrastructure, audit, back-fill | `chore(agent-based-stage0-checkpoint)`, `chore(closed-form-stage2-cat3-recurse)` |
| `feat` | new feature / implementation | `feat(continuous-ca-rd3d-stage1)`, `feat(agent-based-stage1-boids-3d)` |
| `docs` | documentation-only edits | `docs(agent-based-stage2-changelog)`, `docs(sub-phase-conventions-consolidation)` |
| `test` | test additions / regression locks | `test(mutation-script-hotfix-validator-regression)` |
| `fix` | bug fix | `fix(mutation-script-hotfix-validator)` |

**Scope shape:** `<sub-phase-slug>-stage<N>-<scope>` (per-sim implementation sub-phases) or `<sub-phase-slug>-<scope>` (hotfix sub-phases). Each plan declares its own scope vocabulary.

### C.2 Historical context — the rejected `phase1(...)` form

(FACT — Phase 1 landing audit § 2 shift #1.) The original Phase 1 charter prose used commit types like `phase1(stage1)`. The pre-commit hook rejects this form (configured to enforce Conventional-Commit-style types). Phase 1 shifted to `chore` / `feat` / `docs` with the `phase1-stage<N>-<scope>` slug. Sub-phases inherit the same hook discipline with `<sub-phase-slug>-stage<N>-<scope>` substituted.

### C.3 Footer fields

Stage 1 / Stage 2 commit footers may carry load-bearing artifact citations. Fields observed across the audit chain:

| Field | Used at | Purpose |
|---|---|---|
| Phase 1 RED evidence + sha256 | every Stage 1 sim commit | Gate-13 anchor (FACT — visible in `feat(closed-form-stage1-*)` footers). |
| GREEN evidence + sha256 | every Stage 1 sim commit | RED→GREEN witness for that sim. |
| Capture sidecar path + .h5 sha256 | every Stage 1 sim commit (gate 9) | Canonical capture identity. |
| Perf-ledger wall_clock_seconds | every Stage 1 sim commit (gate 12) | Cross-references the perf-ledger row. |
| Determinism-strategy declaration summary | Stage 1 commits from agent-based onward | Per § F.1; cite the docstring as load-bearing artifact. |
| MMS convergence-rate ladder summary | RD-3D Stage 1; subsequent MMS-using sims | Per RD-3D playbook P23; cite the per-grid error table. |
| Capture-sha256 / Failing-tests-output-hash | every relevant commit | Mechanically anchors the audit evidence to commit reality. |

Cite only what's load-bearing for that commit's gate(s); footers do not enumerate every possible field.

---

## § D. Replay-mechanism participation and tag posture

### D.1 Phase-tag form and enforcement

(FACT — spec § 7.12 + `tools/integrity/integrity/scripts/replay_prior_phase.py:_SEMVER_PHASE_TAG_RE`.) Phase tags take the form `v0.<N>.0-phase-<N>` with N a single integer:

- `v0.0.0-phase-0` (Phase 0 landed)
- `v0.1.0-phase-1` (Phase 1 landed)
- `v0.2.0-phase-2` (next; reserved)

The resolver's regex `^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$` mechanically rejects multi-segment or suffixed phase handles. The phase-handle regex `^phase-(\d+)$` (in `_resolve_phase_handle`) accepts only single-integer phase names.

### D.2 Sub-phases do NOT push phase tags

(FACT — declared at `sub-phase-closed-form.md` § 5 + § 11.4; honored at every subsequent sub-phase.) Spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries; sub-phases accumulate to `main` without a `-phase-N` tag. **Forbidden either way:** any tag carrying `-phase-N` (single or multi-segment). The agent NEVER runs `git tag` or `git push origin <tag>`; tag-pushing is operator-only.

**Optional non-phase point-release tag** (e.g., `v0.1.1`, `v0.1.2`, `v0.1.3`, `v0.1.4`, no `-phase-N` suffix) is a banked operator decision per sub-phase. Lean recommendation across all four landed per-sim sub-phases: **NO intermediate tag**. Sub-phase commits + landing audit + per-sim commits provide the audit trail.

### D.3 Bit-identity replay invariant

(FACT — established across closed-form / agent-based / RD-3D / numba-integration / particle-fluids-sph-water Stage 0 replays + the replay-tool-hotfix V1 and mutation-script-hotfix V4 validations.) Every cross-phase replay of `phase-1` → `v0.1.0-phase-1` with the canonical 8-gate set produces a replay-output sha256 of:

```
9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
```

This is the **bit-identity replay invariant**. Its meaning:

- Structural: the replay tool, the cached integrity logic at `v0.1.0-phase-1`, and the integrity output are deterministic together.
- Operational: divergence from `9399fc33…909f34` is a structural-correctness alarm. BLOCKED-with-surface, NOT proceed-with-shift.

Stage 0 Task 0.0 MUST record this sha256 and verify it matches the established value.

### D.4 Cross-phase replay participation

(FACT — declared at `sub-phase-closed-form.md` § 11.4; honored at every subsequent sub-phase.) Sub-phases do NOT participate in the cross-phase replay chain. The next spec-phase pre-flight (spec-Phase-2 Stage 0 Task X.0) replays against `v0.1.0-phase-1`, NOT against any intermediate sub-phase tag. The resolver's single-integer regex mechanically enforces this.

Sub-phase work is protected across the gap to the next spec-phase by spec § 3.5 gate 13: each sub-phase's Phase-1-recorded failing-tests-evidence sha256s must continue to match at the `v0.1.0-phase-1` commit even after the implementation lands. Stage 1 implementations consume the bootstrap tests as the GREEN target; they do not modify the failing-tests-evidence files (the gate-13 anchor).

### D.5 replay_prior_phase tool conventions

(FACT — established at `sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md`.) The replay tool uses each worktree's own `.venv/bin/python` (B-hotfix-1, the `_resolve_cmd_for_worktree` helper) rather than the outer repository's `sys.executable`. This is load-bearing: HEAD's integrity package may have evolved (e.g., closed-form Stage 2 extended `_SUBDIRS_PICKED_UP`); replay verifies the tagged content using the tagged commit's own gate logic. Stage 0 Task 0.0 invocation form:

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

The `uv run python -m …` invocation form is the workspace-validated one (B-hotfix-2; preflight invocation form fix surfaced during the hotfix).

---

## § E. Gate-13 worktree pattern

(FACT — closed-form Stage 1 shift S5; pattern continued at every subsequent per-sim sub-phase.)

Gate 13 ("failing-tests replay verifiable", spec § 3.5) requires that at the Phase 1 RED bootstrap SHA, the failing-tests-evidence file's failure-mode is reproducible. The technique:

```
git worktree add /tmp/bp-replay-<bootstrap-SHA>-<sim> <bootstrap-SHA>
PYTHONPATH=. uv run pytest packages/<sim>/tests/ -v
git worktree remove --force /tmp/bp-replay-<bootstrap-SHA>-<sim>
```

**Use `git worktree`, NOT `git checkout <SHA> -- packages/<sim>/tests/`.** The closed-form Stage 1 S5 documented that the partial-checkout form leaves HEAD's implementation modules in place, which shifts the failure mode (the tests collect successfully and may pass at HEAD even though the bootstrap state was RED). The worktree at the bootstrap SHA materializes the full repository state including the absence of `<sim>.reference`, `<sim>.sim`, `<sim>.invariants` modules — reproducing the `ModuleNotFoundError` failure mode that the Phase 1 evidence file recorded.

**Load-bearing assertions across replay** (FACT — Phase 1 landing audit § 5b):

1. sha256 match between the on-disk Phase 1 RED evidence file at HEAD and the value the Phase 1 landing audit recorded.
2. Failure-mode reproduction in the worktree: same module paths, same error class (`ModuleNotFoundError`), same `errors during collection` summary.

**NOT load-bearing:** full-text bit-equality of pytest output across replay (banners include UTC timestamps + runtime durations).

---

## § F. Determinism convention

### F.1 Per-sim determinism-strategy declaration

(FACT — declared at `sub-phase-agent-based.md` § 1.4 as a load-bearing discipline; inherited verbatim at RD-3D § 1.5 and SPH-water § 1.5.) Before drafting any sim's implementation, the agent writes the determinism strategy as a **docstring at the top of `<sim>.sim`** and cites which clauses of the sim's `determinism.md` are implemented vs deferred to Phase-2+.

Clauses to enumerate, in priority order keyed to P22 / P23 / P24:

1. Reduction-ordering posture (which reductions are sequenced and in what order).
2. Index-sorting / iteration-order pinning for any potentially-non-deterministic operation.
3. RNG threading through `common_py.determinism.Config`.
4. (sim-specific) atomic-scatter discipline, FMA-fusion posture, parallel-reduction posture, MMS grid domain (P23), iteration-convergence pinning (P24).
5. Phase-2+ deferred items (Stack-C atomics, driver FMA fusion, Vulkan subgroup-collectives).

**Cite the docstring in the Stage 1 commit-message footer.** The declaration is a load-bearing artifact, NOT a documentation nicety.

### F.2 Dual-implementation pattern

(FACT — `sub-phase-particle-fluids-sph-water` introduced `density_vectorized` + `density_evolution_vectorized` alongside loop variants; consolidated as a project-wide pattern at `sub-phase-numba-integration` landing § 3.) Some sims ship two implementations of the same algorithm:

- **Diagnostic tier** (naive): clearer, smaller-N, used by Tier 1 + Tier 2 diagnostic tests at small N.
- **Canonical tier** (optimized): vectorized NumPy + numba-JIT'd inner loops, used to produce the canonical capture.

**Equivalence between tiers is FP-equivalent, not bit-equivalent** (see § F.3). When this pattern applies:

- Both tiers' module paths are recorded in the sim's docstring.
- A sim-specific equivalence test (`test_<sim>_vectorized_equivalent_to_loop_variant` shape) verifies the two tiers agree within 1e-9 at small-N.
- Stage 1 commit footer cites both tier names.

(INFERENCE — this pattern is established at one sub-phase; subsequent sub-phases adopt only if their canonical-tier requirement is interpretation-bound. Closed-form / agent-based / RD-3D have a single implementation each at HEAD.)

### F.3 Bit-identical vs FP-equivalent

(FACT — formalized at `sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md` § 3 + § 8 N3; consolidated at `docs/common/numba.md` § 6.) Two distinct contracts:

| Contract | Holds across | Tolerance | Example sites |
|---|---|---|---|
| **Content-equivalent run-to-run** | repeated runs of the SAME implementation on the SAME hardware | 0 (exact, element-wise over the parsed Capture projection; storage-format metadata excluded per spec § 2.5) | gate-11 `test_run_twice_*` (every Phase-1 sim + hello-physics TS smoke). Canonical mechanism: `tools/testkit/determinism::run_twice_and_diff` (Python) and `@bit-physics/common-ts::runTwiceAndDiff` (TypeScript) — both surfaces return `DeterminismVerdict { content_equivalent, detail }`. Numba's cold-vs-warm cache identity. |
| **FP-equivalent cross-implementation** | vectorized-NumPy vs scalar-loop vs numba-JIT'd | absolute < 1e-9 | dual-implementation equivalence tests. The numba determinism-harness regression test. |

The SIMD-vs-scalar gap is intrinsic: NumPy's AVX2/AVX-512 4-or-8-double-wide accumulators with pairwise summation, vs numba's lowered scalar inner loop, vs hand-rolled Python loops — these use different FP-accumulation orders. The same algebraic formula produces slightly different bit patterns at scale (residual ~1e-12 at N=1024 even after aligning operation orders). The 1e-9 tolerance is well below spec's cross-stack 1e-4 relative.

**Failing an FP-equivalence test indicates a violation** (a banned flag like `fastmath=True`, or an unsorted index in a scatter-add) — do NOT relax the test; investigate.

**Content-equivalent NOT raw-file-byte-equality** (FACT — established at `sub-phase-capture-determinism-contract`; spec § 2.5 amended at this sub-phase). The contract is content-equivalent over the parsed Capture data model (every state array + every diagnostic entry compared via `np.array_equal` / equivalent); wall-clock-influenced storage-format metadata (HDF5 H5O_MTIME_NEW object-header messages, file-system mtime, compression headers, library-version banners) is excluded from the comparison. Pre-`sub-phase-capture-determinism-contract` tests that asserted raw-file sha256 equality (LBM `_sha256_of_file`; MPM `_sha256_of_file`; hello-physics TS `payloadA.equals(payloadB)`) were refactored to the harness-based content-equivalent contract at that sub-phase. Defense-in-depth: the Python CaptureWriter uses `track_times=False` + `libver="earliest"`; the TypeScript CaptureWriter freezes `globalThis.Date.now` for the h5wasm write window (h5wasm 0.10.1 does not expose `H5Pset_obj_track_times`). Neither defense is load-bearing — the contract lives at the harness — but both eliminate the latent flake at the source for downstream consumers that compare bytes for forensic round-tripping.

### F.4 Over-achieving the spec

(FACT — surfaced at `sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md` § 3.3 gate 11.) When the spec declares a weaker determinism posture for the Stack-C target (e.g., `epsilon-same-stack-same-hw` for sph-water Stack-C) but the Python NumPy reference at this sub-phase observes bit-exact, the Stage 1 commit footer records the over-achievement as informational. The over-achievement does NOT promote the spec declaration: the Phase-2+ Stack-C target remains the declared posture. Stage 2 landing audit notes the over-achievement in the sub-phase coherence summary.

---

## § G. Numba convention

(FACT — first-class project infrastructure landed at `sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md`; the convention itself lives at `docs/common/numba.md`.)

**Do NOT restate** the numba convention here. The single source of truth is `docs/common/numba.md`. Load-bearing items referenced from sub-phase plans:

| Item | Where | Load-bearing because |
|---|---|---|
| `@njit(fastmath=False, cache=True)` required form | `docs/common/numba.md` § 2 | `fastmath=True` breaks bit-exactness; `cache=True` is consumer-invariant. |
| Banned: `parallel=True` (without explicit accumulator), `error_model="numpy"`, `nopython=False`, `boundscheck=False` | `docs/common/numba.md` § 3 | Each breaks one of the three contracts in § 6. |
| `numba >= 0.61, < 0.66` pin at `tools/testkit/pyproject.toml` | `sub-phase-numba-integration` § 2 + `docs/common/numba.md` § 5 | Upper-bound prevents future major-version drift. Raising it is a separate operator-approved audit. |
| Mutation testing propagates through numba cache | `sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md` § 7.6 N3 (operational verification) | mutmut mutates source; numba's `cache=True` keys off source-hash; cache invalidates on source change. The 600-mutant kill of `dfsph.py` confirmed propagation. |
| Subpackage name MUST NOT be bare `numba` | `sub-phase-numba-integration` § 8 N2 | Would shadow upstream `numba` package at pytest collection. Use `numba_harness/`. |

When a sub-phase adopts numba for a sim, follow the four-step update procedure at `docs/common/numba.md` § 8.

---

## § H. Vendored-upstream discipline

(FACT — spec § 9.2; first exercised at sim-test scale by `sub-phase-particle-fluids-sph-water` consuming the Phase-0-vendored SPlisHSPlasH.)

### H.1 Manifest scope verification at Stage 0

(FACT — `sub-phase-particle-fluids-sph-water.md` § 4.1 Task 0.3.) When a sub-phase consumes a Phase-0-vendored upstream, Stage 0 Task 0.3 (reshaped per sub-phase) verifies:

1. `[upstream].sha` at the manifest matches the documented vendored SHA.
2. `[scope].used_by_sims` contains an entry for the current sim.
3. `[scope].used_by_checks` references the relevant Cat 3 check.
4. The on-disk vendored tree at the documented paths exists.

Drift on (1) / (4) → BLOCK with surface. Drift on (2) / (3) → proceed but surface as banked Phase-1-amendment candidate (not a Stage 0 blocker per Stage 0 operator routing at sph-water Item 2).

### H.2 Citation-by-name, no-import discipline

(FACT — sph-water § 1.6; consumed pattern at HEAD.) The Python NumPy reference cites vendored algorithms BY NAME in docstrings (e.g., "DFSPH — Bender & Koschier 2015, eq. (5); cubic-spline kernel — Monaghan 1992/2005, § 2.2"). It DOES NOT import or call vendored sources. The implementation is derived independently from the cited papers — explicit guard against symmetric upstream bugs per spec § 2.4.

### H.3 Manifest-format drift precedent

(FACT — `sub-phase-particle-fluids-sph-water` Stage 0 N1.) The first documented manifest-format drift was the bare-slug-vs-prefixed-form question for `[scope].used_by_sims` at the SPlisHSPlasH manifest (`"sph-water"` at HEAD vs spec § 9.2 worked-example `"particle-fluid/sph-water"`). Stage 0 operator routed "no amendment" per scope discipline. Future vendored-consumption sub-phases inheriting this convention should:

- Verify the manifest format vs the spec § 9.2 worked example.
- Surface any drift to the operator at Stage 0 Task 0.3.
- Default lean: no amendment unless drift is functionally load-bearing (vs cosmetic). Manifest amendment is itself a Phase-1-amendment candidate.

### H.4 Re-pin policy

(FACT — `sub-phase-numba-integration` § 9 + `docs/common/numba.md` § 5.) When the upper bound of a vendored-or-pinned package's version range needs raising (e.g., numba 0.65 → 0.66, or SPlisHSPlasH 2.16.1 → 2.17), that's a **separate operator-approved commit + audit entry + regression-test re-verify**. NOT an automatic pin-roll. Same discipline as spec § 9.2 vendored-upstream amendments.

---

## § I. Cat 3 `_SUBDIRS_PICKED_UP` additive pattern

### I.1 Origin

(FACT — Phase 1 landing audit § 7 + Stage 2 shift #16.) The Cat 3 (golden-values) integrity check at `tools/integrity/integrity/cat3_numerical/golden_values.py::_gather_tables` does NOT recurse into subdirectories of `tools/testkit/golden/tables/` by default. The closed-form sub-phase introduced an additive extension: a module-level tuple `_SUBDIRS_PICKED_UP` enumerates the subdirectories the check recurses into.

(FACT — `sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md` § 8.2 N4, commit `20d02e0`.) `_SUBDIRS_PICKED_UP` started as `(Path("closed-form"),)`.

### I.2 The additive lift-then-pickup pattern

(FACT — established at `sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md` § 7.1, two-commit shape `3ce7809` + `d156792`.) When a sub-phase ships a golden in a not-yet-picked-up subdir, Stage 2 Step 2.3 routes between:

- **Decision A (lift + pick up)** — restructure the golden's `independent_reference` blocks into ≥ 3 discrete entries (Cat 3 anchor floor per spec § 2.4 R9), then extend `_SUBDIRS_PICKED_UP` additively. Two commits per the agent-based template:
  ```
  chore(<slug>-stage2-cat3-anchors): lift <category> goldens to ≥ 3 discrete anchors
  chore(<slug>-stage2-cat3-subdirs): extend _SUBDIRS_PICKED_UP for <category> subdir
  ```
- **Decision B (bank)** — record in landing audit § 9 that the subdir is banked to the next per-sim implementation sub-phase. No commit.
- **NO-OP** — when the sub-phase ships no golden table (e.g., RD-3D's MMS-based gate 5 per `sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md` § 7.1 / § 8.2 N2). `_SUBDIRS_PICKED_UP` is not extended; no `<category>/` subdir is created.

(INFERENCE across closed-form, agent-based, particle-fluids-sph-water: Decision A is the established default for sub-phases shipping a golden. Decision B has not been exercised in practice. NO-OP is correct for MMS-only sims.)

### I.3 Anchor count semantics

(FACT — `tools/integrity/integrity/cat3_numerical/golden_values.py:_anchor_count`; SPH-water Stage 2 N1.) Anchor count is determined by counting **discrete `independent_reference` entries**, not by counting citations within a single block. Multiple citations packed into one `independent_reference.source` block count as ONE anchor. The lift in Decision A restructures one block-with-N-citations into N discrete entries, preserving every citation verbatim — mechanical restructuring, not new evidence.

**Empirical observation across five PATH-A proof-points (RD-3D, sph-water, eulerian-smoke, LBM, MPM partial):** per-source-file mutation kill rates above the 0.80 advisory threshold consistently correlate with ≥ 4 discrete `independent_reference` anchors in the consuming golden table, not with general test richness:

- LBM `reference/constants.py` (0.8547) + `reference/equilibrium.py` (0.8469) — both anchored to `d3q19-equilibrium.json` (4 anchors post-lift).
- sph-water `kernel.py` (0.8456) — anchored to `cubic-spline-kernel.json` (3 anchors).
- MPM `reference/shape_functions.py` (0.8846) — anchored to `mls-mpm-shape-functions.json` (4 anchors post-lift).

Per-sim source-tier mutation kill-rate baseline across all five proof-points: mean **0.5466**, range **[0.4879, 0.5927]**, ±10% of mean (RD-3D 0.5927, sph-water 0.5581, eulerian-smoke 0.4879, LBM 0.5354, MPM 0.5591 partial — see MPM landing § 7.6 for the trend table). **Per-file kill rates above 0.80 reflect anchor density, NOT richer behavioural tests.** Implication for spec-Phase-2+ test-augmentation routing: lifting a given source file's kill rate above the 0.80 threshold is more reliably achieved by lifting the consuming golden's anchor count to ≥ 4 discrete entries (Decision A lift; see § I.2) than by augmenting behavioural tests around the source file. Cross-reference: § J.5 mutation gate advisory posture.

### I.4 Current state of `_SUBDIRS_PICKED_UP`

At HEAD (post-sph-water landing):

```python
_SUBDIRS_PICKED_UP = (Path("closed-form"), Path("agent-based"), Path("particle-fluids"))
```

Sibling subdirs (`hybrid-pg`, `lattice`, `continuous-ca`) remain non-recursed pending their per-sim implementation sub-phases.

---

## § J. B17 PATH-A vs PATH-B routing

### J.1 The B17 banked item

(FACT — Phase 1 audit § 13.) "Per-target mutation runners + first real kill-rate baseline" was banked as B17 at Phase 1 close, recommended owner the first per-sim implementation sub-phase to want the mutation gate live.

### J.2 PATH-A vs PATH-B

Per the closed-form template § 4.3 Step 2.7, every sub-phase routes between:

- **PATH-A** — extend per-target mutmut targets for the new sim's source + golden generator; rework runner harness as needed; produce REAL per-target kill-rate baseline.
- **PATH-B** — produce framework-validated `sub-phase-<slug>-<UTC>.json` artifact with the existing testkit/integrity targets; re-bank B17 to the next per-sim implementation sub-phase.

(FACT across the four landed per-sim sub-phases:)

| Sub-phase | Decision | Commit | Rationale |
|---|---|---|---|
| closed-form | PATH-B | `dcc3c90` | Two-sim surface; per-sim mutmut would require runner rework against a shallow target list. |
| agent-based | PATH-B | `fcfdc91` | Same calculus + re-bank to continuous-CA per Phase 1 audit § 13. |
| continuous-CA-rd3d | **PATH-A (load-bearing)** | `chore(continuous-ca-rd3d-stage2-mutation-pathA)` | First REAL per-target baseline; RD-3D source + MMS solution targets; per-target mutmut + uv-workspace runner now first-class. |
| particle-fluids-sph-water | PATH-A continue | `dae7040` | Second proof-point; sph-water source + DFSPH generator targets; first mutation run against @njit-decorated code. |

### J.3 Per-target mutmut config schema

(FACT — established at RD-3D Stage 2 commit landing PATH-A; consolidated at sph-water Stage 2 continue.) Additive `[tool.mutmut.targets.<target_id>]` blocks in `tools/testkit/mutation/mutmut-config.toml`. Existing Phase-0 testkit/integrity targets (`capture`, `code_verification_mms`, `golden`, `determinism`, `equivalence`, `property`, `cat4_draft_time`) are NEVER modified. Each block points at `paths_to_mutate` + the per-target `tests_dir` runner.

**Runner form:**

```
uv run --no-sync mutmut run \
  --paths-to-mutate <path> \
  --runner "<per-target runner>" \
  --disable-mutation-types string,fstring
```

The `--disable-mutation-types string,fstring` flag (added mid-stage at RD-3D Stage 2; recorded as a convention from N3) skips docstring mutations that don't probe sim behavior — sub-phase determinism-strategy docstrings would otherwise dominate the mutant count.

**Per-test wall-clock timeout for numba-using PATH-A targets (REQUIRED).** PATH-A targets exercising @njit-decorated modules with potentially-unbounded mutations (e.g., MPM `mls_mpm.py` 1257 mutants; sph-water `dfsph.py` 600 mutants) MUST include a per-test wall-clock timeout in the runner spec. The MPM Stage 2 R15 STOP-AND-SURFACE precedent (MPM landing § 8.2 N5): `mls_mpm.py` mutation could not complete across 5 mutmut restart attempts due to a `timeout × numba × infinite-loop-mutation × systemd-userspace orphan-pytest` interaction. Pathological mutations either looped indefinitely (e.g., mutations to rejection-sampler bounds) or allocated extreme memory (29 GB on some @njit kernel mutations); orphan pytest grandchildren reparented to systemd PID 2643 past the outer `timeout` command's reach.

Two complementary mechanisms:

1. **Shell-level `timeout` wrapper** around the pytest invocation:
   ```
   --runner "timeout --kill-after=10 60 prlimit --as=4G .venv/bin/python -m pytest ..."
   ```
   Worked at MPM Stage 2 recovery run at scope-restricted ~1m45s for 98 mutants across `invariants.py`, `reference/__init__.py`, `reference/shape_functions.py` (4 of the 5 MPM source files completed; `mls_mpm.py` banked). The `timeout --kill-after=10 60` chain wraps pytest with a 60-s wall-clock + 10-s SIGKILL grace; `prlimit --as=4G` caps virtual memory; dropping `uv run` and `setsid` eliminates the extra subprocess layer and preserves the parent-child relationship the kernel needs to reap stuck pytest processes.

2. **`pytest-timeout` plugin** with per-test default timeouts (e.g., 30 s unit / 300 s capture-generation). Bypasses the OS-level orphan-reparenting issue entirely — pytest's own signal handlers can terminate the offending test before the orphan accumulates.

**This convention documents the requirement; adopting `pytest-timeout` is the testing-improvements sub-phase's responsibility, NOT a per-sim sub-phase or this conventions refactor's deliverable.** Until `pytest-timeout` lands at `tools/testkit/pyproject.toml`, the shell-`timeout` form (mechanism 1) is the documented minimum for numba-using PATH-A targets. MPM `mls_mpm.py` mutation completion is banked for the testing-improvements work.

**LANDED (`sub-phase-ci-action-migration-and-banked-cleanup` Stage 1b, additive D12 shape (b)).** `pytest-timeout` is now a `tools/testkit/pyproject.toml` dev dependency (`pytest-timeout>=2.0`) with a default per-test ceiling of 300 seconds set in `[tool.pytest.ini_options]`; mechanism 2 is therefore available in the testkit env (smoke-verified: the `timeout` plugin loads and the ceiling is honored under `filterwarnings = ["error"]`). Per-target mutmut runners may pass a tighter `--timeout`. **MPM `mls_mpm.py` mutation completion remains banked** — the plugin now exists to support it, but actually running that completion is a mutation-focused effort's deliverable, not this sub-phase's.

### J.4 Per-target exclusions

(FACT — sph-water Stage 2 R15 routing precedent.) When a per-target runner would exclude certain test files (e.g., canonical-capture-generation tests that take minutes per mutant), the per-target runner spec is the right place for the exclusion. The exclusion + rationale is recorded in the sub-phase plan § 4.3 Step 2.7 and in the landing audit § 7.6.

### J.5 Mutation gate advisory posture

(FACT — across all four landings.) The mutation gate is advisory (non-blocking) at sub-phase scope. Real per-target kill-rate baselines are surfaced + carried forward; sub-source coverage gaps are banked as test-augmentation candidates (RD-3D `0.5927 < 0.80`; sph-water `0.5581 < 0.80`). Spec § 2.13 threshold compliance becomes gating at a later phase per the spec's per-target threshold table; sub-phase work establishes the baseline, not the gate-flip.

### J.6 Mutmut data extraction

(FACT — LBM Stage 2 N2 banked precedent.) Mutmut writes per-mutant detailed results to a SQLite database at `.mutmut-cache` (project root; gitignored). The Phase-0 framework artifacts at `tools/testkit/mutation/baseline-*.json` and the per-sub-phase artifact JSONs at `tools/testkit/mutation/sub-phase-<slug>-<UTC>.json` are **summary stubs** (Phase-0 framework-validated structure carrying summary counts: tested / killed / survived / timeouts / suspicious / kill rate). **Per-target detailed mutant-by-mutant results live in `.mutmut-cache` SQLite, NOT in the JSON stubs.**

Future PATH-A sub-phases querying per-mutant kill/survive/timeout breakdowns SHOULD query the SQLite cache directly via targeted Python extraction. Example shape:

```python
import sqlite3
con = sqlite3.connect(".mutmut-cache")
rows = con.execute(
    "SELECT filename, status FROM mutants WHERE filename LIKE '%mpm_multimaterial/%'"
).fetchall()
```

**Warn against full-file reads of the summary JSONs at audit time.** LBM Stage 2 N2 demonstrated the failure mode: a multi-megabyte baseline JSON full-file read can trigger API tool output limits during audit reconciliation. The summary JSON's role is to be a small, citable artifact (≤ 3 KB) recording the summary counts; per-mutant detail lives in the SQLite cache and is queried as needed.

### J.7 Manifest-builder low-kill-rate pattern

(FACT — eulerian-smoke landing § 7.6 `sim.py` 0.1707 + LBM landing § 7.6 `sim.py` 0.2287 + MPM landing § 7.6 `sim.py` 0.5862 partial.) Across the five PATH-A proof-points, `sim.py` modules — the manifest-builder / runner-glue layer at every per-sim package — have consistently produced **low** mutation kill rates relative to the `reference/` modules at the same sub-phase:

| Sub-phase | `sim.py` kill rate | `reference/<core>.py` kill rate |
|---|---:|---:|
| eulerian-smoke | 0.1707 | (reference modules higher; see eulerian-smoke landing § 7.6) |
| LBM | 0.2287 | 0.8547 (`constants.py`), 0.8469 (`equilibrium.py`) |
| MPM (partial) | 0.5862 (highest; multi-test coverage) | 0.8846 (`shape_functions.py`) |

**Root cause: the manifest-field-equality pattern.** `sim.py` is the manifest-builder / runner-glue layer; it composes the per-sim manifest dict (e.g., `'algorithm': 'mls-mpm-quadratic-bspline-1d-hu-2018'`, capture metadata, perf-ledger row inputs) and dispatches the canonical runner. Mutations to literal field values in the manifest dict DO change the manifest output, but downstream tests rarely equality-test every field — most mutations are unkilled. Mutations to runner glue (e.g., arg-parsing) similarly tend to slip past the diagnostic-tier test surface.

**This is expected at the sub-phase scope, NOT a coverage gap requiring augmentation at per-sim sub-phase landing.** The manifest-builder kill-rate floor (~0.20 across the five proof-points, with MPM's 0.59 driven by unusually broad multi-gate coverage of `sim.py` paths via `sim_runner_diagnostic`) is a project-wide structural property of the runner-glue layer.

**Test-augmentation candidate for the testing-improvements sub-phase** (separate scope from per-sim sub-phases): adding a manifest-equality test invoking `<sim>.sim.build_manifest()` and equality-asserting the full dict structure would lift this surface mechanically. Banked alongside the other test-augmentation candidates per § L.

**REALIZED via strategy (i) (`sub-phase-ci-action-migration-and-banked-cleanup` Stage 1b; methodology-precedent #14).** The literal `<sim>.sim.build_manifest()` call site does NOT exist at HEAD — no sim exposes a public `build_manifest()`; most build the manifest via a private `_build_manifest*` helper and a few (e.g. the LBM diagnostic) build it inline. The **strategy-(i) additive realization** of this convention's intent, WITHOUT a sealed-source refactor: invoke the existing `sim_runner_*` (or its diagnostic-tier variant), load the emitted `.json` manifest sidecar, shape-check-then-exclude the volatile `run.wall_clock_seconds` + `payload.checksum` fields (per spec § 2.5 + § F.3 — asserting a fixed checksum would be the raw-file-byte-equality anti-pattern), and assert the remainder equals expected literals (numeric params sourced from module constants). A complementary run-to-run assertion locks the deterministic subset. This catches the manifest-field-literal mutation class § J.7 targets. Landed as a **representative-single-sim** test (`lattice-boltzmann-d3q19`, whose diagnostic builds the manifest inline — the purest instance of the class; the representative-subset artifact class). Reusable for any future per-sim manifest-equality fan-out; strategy (ii) (factoring out a public builder first) stays banked.

---

## § K. R-class STOP-AND-SURFACE discipline

### K.1 R-class naming

(FACT — pioneered at `sub-phase-particle-fluids-sph-water`; the most extensively-routed sub-phase to date.) When Stage 1 hits an obstacle that cannot be resolved within the sub-phase's plan scope, the agent emits a **stop-and-surface audit** rather than ad-hoc routing:

```
docs/_audits/phase-1/sub-phase-<slug>/stage-<N>-continuation-stop-and-surface-<M>-<UTC>.txt
```

(FACT — sph-water shipped five surfaces, R12 through R20, plus R16 superseded by R17 mid-arc.)

### K.2 R-class audit shape

The surface text is structured:

1. **Concern statement** — what blocks progress, with measured evidence.
2. **Remediation paths analysis** — typically 3–5 lettered options (A, B, C, …) with cost / risk / scope analysis per option.
3. **Default lean** — the agent's recommendation, with rationale.
4. **HALT** — explicit instruction to wait for operator routing; no autonomous decision.

The R-class surfaces are **append-only** like other audit artifacts. Their resolution is recorded in the next Stage 1 commit's footer + the Stage 1 final checkpoint (or, for cross-sub-phase resolutions like R18 → numba-integration, in the spawned hotfix sub-phase's landing audit).

### K.3 Threshold-discipline lesson

(FACT — sph-water Stage 2 N3 / landing § 9.3 row 2 banked observation.) R19 (1-hour threshold) was revoked at R20 dispatch as "arbitrary" — set without per-step decomposition rationale at the prompt's authoring time. The R17/R18/R19 projection-based wall-clocks were all overly optimistic.

**The R20 surface text is the model** for stop-and-surface thresholds: explicit per-step decomposition with **measured component floors** (not projected), explicit rationale for each threshold value, explicit operator-routable alternatives. Future stop-and-surface thresholds attach this discipline.

### K.4 Resolved R-class arc historical record

(FACT — sph-water § 3.1 — for posterity, showing the kinds of issues that have recurred.)

| R | Concern | Resolution |
|---|---|---|
| R12 | Storage > 64 MB pre-commit ceiling | Raise ceiling to 1 GB. |
| R16 | O(N²) tensor OOM at N=1M (21.8 TiB allocation) | Spatial-hash cell-list (intermediate; superseded). |
| R17 | Python-loop bottleneck at N=1M (14h+ projected) | scipy.cKDTree + pair-array fast path. |
| R18 | Aggregate runtime > 10⁴ s (3.6 hours) | Numba @njit(fastmath=False, cache=True) — spawned numba-integration sub-phase. |
| R19 | 1-hour wall-clock threshold (arbitrary) | REVOKED at R20 dispatch. |
| R20 | 3-hour threshold breached at N=1M | 100K-instance per-sub-phase descriptor override; full N=1M contracted forward to Stack-C Phase-2+. |

Future sub-phases with multi-GB / multi-N canonical scope SHOULD use § N (canonical-descriptor scope-analysis at Stage 0) to catch the same arc earlier.

---

## § L. Banked observations carry-forward

### L.1 The pattern

(FACT — every landing audit § 9 has a Banked / Open table.) Each landing audit records:

- **Resolved during this sub-phase** — items closed at this sub-phase + their commits.
- **Open (carried into next sub-phases)** — items the next plan-drafting reads as the inherited carry-forward.

The carry-forward chain is visible by reading the audits in order. The conventions doc consolidates only the items that have stabilized as cross-cutting (everything below); per-sub-phase-specific carry-forwards stay in the prior sub-phase's landing audit § 9.

### L.2 Open banked observations going into the NEXT sub-phase (eulerian-smoke or LBM)

(FACT — `sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md` § 9.3 — surfaced for next-sub-phase plan-drafting consideration.)

| Observation | Recommendation |
|---|---|
| **(1) Canonical-descriptor scope-analysis as a Stage 0 task.** The R12 → R20 arc demonstrates a Stage-0-vs-Stage-1 gap. | See § N — PROPOSED-convention for the next sub-phase's plan-drafting. |
| **(2) Threshold-discipline lesson.** | Future stop-and-surface thresholds attach explicit per-step decomposition with MEASURED component floors. See § K.3. |
| **(3) Gate 7 single-scale exercise pattern.** Gate 7 (Tier 2 particle) exercised at diagnostic-tier (N=64) only; the canonical-tier path with cKDTree+numba is NOT certified by gate 7 at HEAD. | For sims with canonical-tier-only algorithms, either add a canonical-tier gate-7 exercise OR document the gap explicitly. |
| **(4) `common-py` not actually consumed in workspace at HEAD.** Numba-integration sub-phase re-anchor finding. | Banked for explicit operator decision: land common-py adoption as a focused infrastructure sub-phase, OR document as Phase-2+ deliverable. |
| **(5) FP-equivalent-within-1e-9 contract project-wide.** | See § F.3. Now project-wide via numba convention; no further plan-drafting needed. |
| **(6) MMS-runner-scaffolding generalization** (RD-3D Stage 1 S2 elevated). | Operator decides at next MMS-using per-sim sub-phase plan-drafting time whether to interpolate a focused MMS-pipeline-generalization sub-phase, or inline-then-generalize at the first MMS-using sibling's plan-time. Load-bearing for eulerian-smoke + LBM. |
| **(7) Stop-and-surface threshold rationale-attachment discipline.** | See § K.3. R20 text is the model. |

### L.3 Open banked items (open across multiple sub-phases)

| ID | Item | Inherited from |
|---|---|---|
| Cat 3 sibling subdirs (`hybrid-pg`, `lattice`, `continuous-ca`) | Extend `_SUBDIRS_PICKED_UP` per § I.4. | Each per-sim implementation sub-phase, additive. |
| Cat 3 evaluator shims for the 5 AUDIT_LOG algorithms | Register Python evaluator shims at `tools/integrity/integrity/cat3_numerical/evaluators/`. | Banked to a future sub-phase. |
| RD-3D / sph-water test-augmentation candidates | Per-file surviving-mutant IDs in mutation artifact JSONs. | Operator-routable; default-skip for siblings; spec-Phase-2+ owner. |
| DFSPH generator test-coverage gap (0/108 kill rate) | Add a test invoking the generator's `--verify` entry. | Operator-routable; banked for sph-water test-augmentation OR testkit infra. |
| B2 / B3 / B4 / B5 / B6 / B11 / B16 (Phase 1 open) | Per their original Phase 1 audit § 13 owners. | Out of any current sub-phase's scope. |
| B-hotfix-1 / B-hotfix-2 (replay-tool-hotfix) | Phase-2+ Stack-C effort. | Banked. |

### L.4 Formalized methodology-precedents — eulerian-smoke-stack-d Stage 2 (chaotic-regime first instance)

(FACT — `sub-phase-eulerian-smoke-stack-d` Stage 1 § S1-4 + Stage 2 Option-2
routing. The FIFTH cross-stack pair was the FIRST of five to exercise the IC-15
R-P2 chaotic-regime escape-hatch substantively; both canonical trajectories are
numerically unstable (positive Lyapunov). Three cross-cutting precedents stabilized
for all future plan-drafting + cross-stack work. Cross-reference: methodology
`docs/conventions/cross-stack-equivalence-methodology.md` § 6.)

- **S6-trajectory-simulation discipline.** S6 plan-drafting discipline (read the
  Phase-1 `sim.py` at HEAD — § 3 methodology precedent) is NECESSARY but
  INSUFFICIENT: a code-structure read alone misses chaotic-regime instabilities.
  Phase-1's within-stack determinism is bit-exact even for chaos; finite-NaN/Inf
  masks late-stage divergence (smoke's reference reaches `5e19` without NaN/Inf).
  Smoke is the data-backed FIRST instance where the S6 code-read gave a false
  "tame/laminar" verdict that cross-stack execution refuted. **Applies to: all
  future plan-drafting probes for cross-stack ports.** The probe protocol
  ADDITIONALLY executes `sim_runner_diagnostic` (or a small-N canonical) for
  ~50-100 steps and reports the max-field-value growth rate: bounded → tame
  regime; exponential → chaotic regime (R-P2 escape-hatch expected; plan gate-14
  as a divergence-rate witness from the start).

- **Cross-stack testing as defect-amplifier (beyond equivalence-as-contract).**
  Cross-stack equivalence testing surfaces latent defects that within-stack
  verification structurally cannot. Smoke is the data-backed FIRST instance:
  Phase-1's within-stack determinism + finite-NaN/Inf gates were GREEN, yet
  cross-stack execution (a second arithmetic backend) revealed the canonical
  trajectory is numerically unstable. Cross-stack testing's value extends beyond
  equivalence-as-contract to **equivalence-as-defect-amplifier** — a second
  deterministic backend exposes sensitive-dependence that one backend cannot.

- **Banked precedent #7 (f64-accumulator-seed) extends to pure-literal kernel
  constants.** Banked precedent #7 (`ti.f64(0.0)` accumulator seeds; methodology
  § 4.1) extends from in-kernel REDUCTION accumulators to **pure-literal numerical
  constants** in `@ti.kernel` bodies. Smoke's 3D Jacobi pure-literal `1.0/6.0`
  (both operands literals, no f64 ndarray) inferred f32 absent `default_fp=ti.f64`
  (~1e-9 cross-stack leak) until seeded `ti.f64(1.0) / ti.f64(6.0)`; the 2D `0.25`
  is exact in f32 (no seed needed). **Applies to: all future Taichi-DSL ports** —
  seed ANY pure-literal non-power-of-2 constant in a numerical kernel, not only
  reduction accumulators.

### L.5 Formalized methodology-precedents — common-warp-bootstrap Stage 2 (Stack-E bootstrap)

(FACT — `sub-phase-common-warp-bootstrap` Stage 1a § 10 [S1a-2], Stage 1b § 10
[S1b-3], Stage 1c § 4 [S1c-1] + landing § 7. The FIRST Stack-E sub-phase — the
`common/common-warp/` Python/NVIDIA-Warp bootstrap — stabilized three
cross-cutting precedents. New subsection rather than an append to § L.4 because
§ L.4 is the eulerian-smoke-stack-d chaotic-regime locus; per-sub-phase
attribution is preserved.)

- **S1a-2 — GPU device-string discipline.** A bare zero-indexed CUDA device
  token (the `cuda:N` form where N is a digit) written in audit prose, source
  comments, or docstrings parses as a `path:line` citation under
  `cat1.intra-repo` and HARD_FAILs the integrity sweep (the `cuda` part reads as
  a filename, the digit as a line number; first caught at Stage 1a on a
  `runtime.py` docstring). **Discipline:** name GPU devices in **prose form**
  ("CUDA device zero", "the zero-indexed CUDA device", "GPU device with index
  0") — never the bare `cuda:N` token in running text. (Inline backtick spans
  and fenced code blocks are exempt: Cat-1 skips them per § M.1 shift #10, so a
  back-ticked `` `device="cuda:N"` `` code reference is safe — the discipline
  governs *un-backticked prose*.) **Applies to: all future Stack-E ports + any
  audit/source/doc text naming a GPU device.**

- **S1b-3 — socket-reconciliation precedent (Option B: refactor implementation
  to match the plan socket).** When a plan's load-bearing socket contract (a
  §1.9.x signature) diverges from the landed implementation signature post-hoc,
  **Option B — refactor the implementation to match the socket verbatim, BEFORE
  the first downstream consumer** — is the methodologically-correct recovery: it
  preserves the plan's "sockets are NOT stage-overrideable" framing, keeps the
  contract intact for downstream consumers, and REQUIRES load-bearing-baseline
  reproduction verification under the refactored signature (here the W-2 digest
  `24d44c7e…0746f314` reproduced unchanged, confirming signature-only / not
  semantics-changing). **Option A** (amend the plan to match the implementation)
  is the fallback when refactor risk is unbounded OR the socket's design intent
  is genuinely wrong (NOT the case here — the §1.9.1 `tolerance=0.0` determinism
  surface was load-bearing and the landed signature would have dropped it).
  **Applies to: any future plan-socket-vs-landed-implementation divergence.**

- **S1c-1 — plan-prose-gloss vs spec-verbatim discipline.** A plan-drafting
  dispatch that *paraphrases* plan/spec language in its operative instructions
  can introduce drift even when the underlying intent matches (here the dispatch
  glossed §1.9.1's `init(device: str | None = None, deterministic: bool = False)`
  as "both positional; no None default", which the agent reconciled to the spec
  verbatim per Convention C/M). **Discipline:** dispatches reference plan
  sections **by section number for verbatim consumption**; paraphrase belongs in
  coordinator-side *framing* only, never in operative instruction language.
  Execution-time Convention C (cite the spec verbatim) + Convention M (HEAD/spec
  wins on drift) are the agent's reconciliation backstop. **Applies to: all
  future plan-drafting dispatches + execution-stage socket consumption.**

### L.6 Formalized methodology-precedents — mpm-multimaterial-stack-e Stage 0/1a (first Stack-E consumer port)

(FACT — `sub-phase-mpm-multimaterial-stack-e` Stage 0 Task 0.6 [S0-ME1] +
Stage 1a kernel application. The FIRST Stack-E *consumer* port — the first sim
to write production `@wp.kernel` MLS-MPM bodies against the common-warp socket.
New subsection rather than an append to § L.5 because § L.5 is the
common-warp-bootstrap locus; per-sub-phase attribution is preserved [§ L.5
preamble]. Cross-reference: the O-W6/O-W7 base Warp-quirk set is documented at
`docs/common/warp.md` § 5 + the common-warp-bootstrap landing.)

- **O-W7 extension — the `wp.float64()` taint workaround.** In NVIDIA Warp
  1.13.0, applying `wp.float64(v)` to a kernel-local variable **taints `v`'s
  inferred type to float64** for its subsequent uses (reproduced minimally:
  `rx = fx - wp.float64(bx)` makes the later `bx + di` a forbidden
  `int32 + float64` and the `@wp.kernel` fails to compile). This is the THIRD
  Warp `@wp.kernel`-authoring quirk after the O-W7 base set (the `int(0)` idiom
  for kernel-local mutable ints; explicit `dtype=` to `wp.from_numpy` for
  multi-dimensional scalar arrays). **Discipline:** when deriving an integer grid
  index from a float quantity (e.g. a base node from `particle_pos / dx`), derive
  it via `wp.int32(<float_base>)` where the float base is NOT reused as an int;
  and pack B-spline weights / node offsets / other per-axis vector quantities
  into a `wp.vec3d` indexed by the pure-int stencil loop variable — never
  `wp.float64(di)` on a loop variable also used as an int index. Discovered at
  `sub-phase-mpm-multimaterial-stack-e` Stage 0 Task 0.6 (the P2G atomic-scatter
  determinism kernel; see that sub-phase's Stage-0 evidence artifact) and applied
  throughout the Stage-1a MLS-MPM kernels (`reference/mls_mpm_warp.py`'s `p2g` /
  `p2g_with_stress` / `g2p` via the `_bspline_w` / `_node_off` `@wp.func`
  helpers). **Applies to: all future Stack-E ports' `@wp.kernel` implementations**
  (Smoke Stack-E / LBM Stack-E remain).

### L.7 Formalized observations — mpm-multimaterial-stack-e Stage 2 (landing)

(FACT — `sub-phase-mpm-multimaterial-stack-e` Stages 0/1a/1b/1c + landing. The
FIRST Stack-E *consumer* port to complete the full gate chain; these are
OBSERVATIONS — taxonomy/process clarifications for future plan-drafting — not
"must-apply" precedents. New subsection per per-sub-phase-stage attribution
[§ L.5 preamble]; § L.6 is this sub-phase's Stage-0/1a locus.)

- **O-1 — Cross-stack equivalence verdict taxonomy.** Cross-stack equivalence
  pairs produce one of three verdict shapes: **(a) bit-exact** (`max_abs_err = 0.0`
  all fields/frames; arises from verbatim re-derived algebra + same operation
  order + an algebraically-tame trajectory — MPM Stack-E `drop-impact` rigid
  free-fall is the data-backed first instance); **(b) FP-round-off within
  tolerance** (the typical expected case; `within_tolerance=True` at a residual
  far below the category threshold — the Stack-D ports' `~1e-28`–`~1e-10`
  `max_abs_err`); **(c) chaotic-regime escape-hatch** (`within_tolerance=False`,
  the CORRECT verdict; R-P2 invoked per `cross-stack-equivalence-methodology.md`
  § 6 — `eulerian-smoke` Stack-D is the data-backed first instance). **Downstream
  applicability:** future plan-drafting probes' gate-14 predictions SHOULD
  enumerate which shape is expected, with rationale (trajectory boundedness from
  the § L.4 S6-simulation probe; algebraic faithfulness; backend arithmetic),
  rather than defaulting to (b). Bit-exact is canonical-specific, never a general
  port claim.

- **O-2 — Warp CPU determinism four-checkpoint chain.** For Stack-E ports using
  common-warp's deterministic execution, the determinism-verification chain spans
  four stage checkpoints: **(1) Stage 0** establishes the R-A1 anchor sha256 via a
  minimal verification kernel (MPM Stack-E: the P2G atomic-scatter determinism
  kernel `a8f6e654…07ff1fe1`); **(2) Stage 1a** gate-10 has the production kernel
  reproduce the R-A1 anchor bit-for-bit; **(3) Stage 1b** the canonical-scale
  capture reproduces deterministically across 2+ runs (MPM: 2/2 content-digest
  MATCH at 1M particles / 128³); **(4) Stage 1c** formal gate-14 cross-stack
  equivalence. MPM Stack-E is the data-backed first instance of the full
  four-checkpoint chain (the R-A1 anchor re-verified at every stage's preflight).
  **Downstream applicability:** future Stack-E ports inherit this chain as the
  determinism-evidence template — anchor at Stage 0, production-kernel reproduce
  at Stage 1a, canonical-scale at Stage 1b, gate-14 at Stage 1c.

---

## § P. Capture cadence routing

(FACT — eulerian-smoke / LBM / MPM Stage 0 Task 0.4 routings + `sub-phase-particle-fluids-sph-water` W1 1 GB raise + `sub-phase-lattice-boltzmann-d3q19` W1 2 GB raise precedents. Section letter P chosen to avoid disturbing existing § A–O numbering.)

### P.1 Default: full cadence when feasible

When full-cadence capture (one frame per step) at the canonical descriptor fits the W1 storage ceiling — possibly after operator-routed W1 ceiling raise — full cadence is the **default routing**. Cadence-N (e.g., every-50, every-100) is the **fallback** when full-cadence storage is genuinely infeasible at the W1 ceiling after raise consideration.

Decision rule at Stage 0 Task 0.4:

1. Compute full-cadence storage: `per-frame payload × step count`.
2. Compare against the W1 ceiling (`tools/testkit/golden/W1.toml`; post-sph-water R12 raise + post-LBM raise).
3. If full-cadence ≤ W1 ceiling — or ≤ ~1.5× W1 with raise feasible — route **full cadence** + W1 raise if needed.
4. If full-cadence > ~1.5× W1 ceiling after raise consideration: route **cadence-N** as fallback. Cadence-N selection: choose the smallest cadence whose product fits under ~70% of W1 ceiling (~30% headroom for future descriptor refinements).

### P.2 Existing committed captures stay as committed

(FACT — eulerian-smoke landing § 3 + 4; sph-water + RD-3D + MPM committed cadences.) Phase 1 committed captures remain at their committed cadences for the audit chain:

| Sim | Capture | Cadence | Reason at landing-time |
|---|---|---|---|
| RD-3D | Gray-Scott | every-100 | analogy to RD-2D (legacy) |
| sph-water | dam-break | every-100 | analogy to RD-3D |
| eulerian-smoke | lid-driven-cavity | every-100 | **analogy to RD-3D / sph-water — full cadence was actually feasible at W1 2 GB; suboptimal but acceptable historically. Documented as the historical instance pre-dating this discipline.** |
| eulerian-smoke | Taylor-Green | every-50 | matches the longer step-count; ~64% of W1 2 GB |
| MPM | drop-impact | every-50 | full cadence infeasible at 79.6 GiB raw; cadence-50 lands at 1.13 GB ≈ 56% W1 2 GB |

Stack-C / Stack-D Phase-2+ regeneration may revisit cadence at the full-feasibility witness per § P.1 — this discipline is **forward-looking**, not a retroactive recadence of committed Phase 1 work.

### P.3 W1 ceiling-raise routing

(FACT — sph-water R12 surface — `tools/testkit/golden/W1.toml` raise from 64 MB → 1 GB; LBM W1 raise from 1 GB → 2 GB.) W1 ceiling raises are operator-routable per sub-phase, in concert with cadence routing:

- **Raise W1** when raising would let the sub-phase commit at full cadence (or a higher cadence) that better serves downstream cross-stack verification.
- **Cadence down** when raise would imbalance the W1 budget against other-sim allocations or push committed storage beyond proportionate scope.

Cite the W1 raise + cadence decision in the sub-phase plan § 4.1 Task 0.4 and the Stage 0 checkpoint per the established Task 0.4 discipline (see § N).

---

## § M. The 65 cumulative shifts inventory (one-line summaries)

(FACT — cumulative shift count crossed 60 at sph-water Stage 2; final tally is **65 going into the next sub-phase**.) Future plans cite shifts by their canonical IDs rather than re-deriving them. The full inventory:

### M.1 Phase 1 baseline (21 shifts) — Phase 1 landing audit § 14

1. Commit type `phase1(...)` rejected; `chore` / `feat` with `phase1-stage<N>-<scope>` slug.
2. Tier 2 substack path is doubled-directory `tools/diagnostics/diagnostics/tier2/...`.
3. IC-1 payload format `raw-binary-v1` instead of HDF5.
4. IC-2 wraps Phase 0's `capture.CaptureManifest` schema.
5. `CheckResult` at `diagnostics.tier2._types`.
6. IC-5/6/7 import path reconciled.
7. Pre-existing README stubs unchanged (Convention A).
8. Cat 4 grammar tests at `tools/integrity/tests/test_cat4_*`.
9. Grammar (c) C++ resolver is regex-based, not libclang.
10. Grammars (b)+(c) skip markdown fenced code blocks + inline backtick spans.
11. Stack-B per-sim tests use pytest, not vitest.
12. Sim packages NOT registered in root workspace at Stage 2 (resolved at Stage 3).
13. Mandelbulb far-field anchor uses SymPy 30-digit precision value.
14. `tolerance.toml` has no `agent-based` category default; closed_form defaults apply.
15. Stack C sims use Python pytest at TDD-bootstrap level.
16. Golden tables at `tools/testkit/golden/tables/<category>/`, not the dispatch's `tools/testkit/code_verification/golden/tables/`.
17. Eulerian-smoke + lattice-boltzmann legacy-capture descriptors not enumerated in R8.
18. LBM and eulerian-smoke share the `incompressible_ns_2d` MMS solution.
19. Audit front-matter convention drift: `head_sha_at_checkpoint` vs `head_sha`.
20. `audit-append-only.yml` CI filters to `*.ledger.md` only.
21. Step 4.2 (top-level CMakeLists.txt) + Step 4.9 (CI workflows per sim) skipped at Phase 1.

### M.2 Closed-form sub-phase (11 shifts)

**Stage 1 (S1–S6):**

- S1 — Phase 1 test stub bodies replaced with gate-fulfilling implementations.
- S2 — perf-ledger `hardware_id` `i7-12700KF-linux-6.17` concrete CPU.
- S3 — IC-7 closed_form check signatures at HEAD differ from probe INFERENCE shapes; HEAD wins.
- S4 — `distance_estimator` escape-semantics mismatch (SymPy generator's check-then-update order).
- S5 — **Gate-13 worktree pattern** (see § E) — replaces partial-checkout form.
- S6 — Capture sidecar JSONs via `tools/testkit/capture` rather than IC-2 wrapper (bytes identical).

**Stage 2 (N1–N5):**

- N1 — `pytest` shared `tests.conftest` import-path collision; one package at a time.
- N2 — Stage 0 Convention #12 SHA back-fill omission (lesson; see § B.2).
- N3 — `verify_evidence` `sha256:HEX` prefix rejection; tool fixed at commit `3b79cfa`.
- N4 — Cat 3 `_SUBDIRS_PICKED_UP` extended additively for `closed-form/`; pattern origin.
- N5 — B17 PATH-B re-bank chosen over PATH-A.

### M.3 Agent-based sub-phase (10 shifts)

**Stage 1 (S1–S8):**

- S1 — Phase 1 test stub bodies replaced (closed-form S1 precedent).
- S2 — perf-ledger `hardware_id` (closed-form S2 precedent).
- S3 — Boids `sim_runner_seeded_3agent` sibling callable for 3-agent canonical capture.
- S4 — Physarum canonical descriptor follows Appendix D, not probe report § 4 placeholder.
- S5 — Physarum chaotic-regime determinism test implemented as non-blocking ε-comparison.
- S6 — Agent-based goldens shipped at 1-anchor structure (resolved at Stage 2 N1).
- S7 — `_DIAGNOSTIC_N_STEPS = 50` shared fixture for tier-1+tier-2 diagnostic tests.
- S8 — Physarum `test_tier2_scalar_field_conservation_advisory` inline recurrence (`m' = m(1-α) + Nd(1-α)`) rather than `check_conservation`.

**Stage 2 (N1–N2):**

- N1 — Cat 3 Decision A (lift to 3 anchors + extend `_SUBDIRS_PICKED_UP` for `agent-based/`).
- N2 — B17 PATH-B re-bank, named to continuous-CA.

### M.4 Continuous-CA-rd3d sub-phase (6 shifts)

**Stage 1 (S1–S2):**

- S1 — **MMS grid domain `[0, 2·soln.L]³`** (P23 cause-#1 exemplar). The committed solution uses wavenumber κ = π/L; period is 2L per axis.
- S2 — MMS test runs inline convergence study (heat-1D `runner.py` scaffolding is heat-1D-specialized; banked as MMS-runner-scaffolding generalization).

**Stage 2 (N1–N4):**

- N1 — Stage 1 checkpoint front-matter mis-recorded a JSON sidecar sha256; underlying blob correct. Convention #12 + § B.1 forbid retroactive edit.
- N2 — Cat 3 NO-OP for `continuous-ca` subdir (RD-3D ships no golden; MMS gate-5).
- N3 — **B17 PATH-A landed (load-bearing)** — first REAL per-target kill-rate baseline.
- N4 — Mid-Stage-1 `.pre-commit-config.yaml` `maxkb` raise (10240 → 65536) to absorb 3D captures.

### M.5 Particle-fluids-sph-water sub-phase (13 shifts: S1–S5 Stage 1 partial + S6–S12 Stage 1 post-partial + N1–N4 Stage 2)

Refer to `sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md` § 8 for full enumeration. Highlights:

- 6 R-class surfaces R12–R20 (with R19 revoked) resolved through the sub-phase + spawned numba-integration hotfix.
- Stage 2 N1 — DFSPH density-evolution golden lifted 1 → 3 anchors (Decision A continuation).
- Stage 2 N2 — `_SUBDIRS_PICKED_UP` extended for `particle-fluids/`.
- Stage 2 N3 — first mutation-testing run against @njit-decorated code; numba cache propagates source mutations correctly.
- Stage 2 N4 — DFSPH generator 0/108 kill rate flagged as test-coverage gap (not implementation defect).
- Per-sub-phase canonical-descriptor override pattern (100K-instance vs Appendix D 1M descriptor; full N contracted forward to Stack-C Phase-2+).

### M.6 Cumulative count

21 (Phase 1) + 11 (closed-form) + 10 (agent-based) + 6 (RD-3D) + 13 (sph-water Stage 1 partial + post-partial + Stage 2 — but the count discipline at sph-water Stage 2 § 8.3 records cumulative 65 entering the next sub-phase, matching the carry-forward count) = **65** documented to date.

Hotfix sub-phases (replay-tool, numba-integration, mutation-script) are audit-chained as siblings, not children, and their shifts are NOT counted into the per-sim cumulative — they are documented separately within each hotfix's repair audit.

---

## § N. Stage 0 canonical-descriptor scope-analysis

(Established discipline — graduated from PROPOSED at `sub-phase-conventions-refactor-post-phase-1` per three consecutive single-session-ready Stage 1s anchoring the empirical baseline: eulerian-smoke landing `cf13d1c`, LBM landing `4f79e19`, MPM landing `bd89e78`. See § N.4 for the anchoring evidence and § N.5 for the production-correction factor range.)

### N.1 Motivation

The R12 → R20 arc in sph-water demonstrated a Stage-0-vs-Stage-1 gap: the canonical descriptor's N (1M particles × 1000 steps) was incompatible with the Python NumPy reference stack at the sub-phase's wall-clock + memory + storage budget, but this incompatibility surfaced only mid-Stage-1, after substantial implementation work. A pre-flight scope-analysis task would catch the mismatch BEFORE Stage 1 dispatch.

### N.2 Task 0.4

Add Task 0.4 to Stage 0 of each per-sim sub-phase plan whose canonical descriptor might mismatch the implementation stack:

```
Task 0.4 — Canonical-descriptor scope-analysis.

Read:
  - The canonical descriptor from Phase 1 charter R8 amendment + spec Appendix D § D.2.3.
  - spec-ref § 5 (or wherever the spec bounds canonical scale per stack) for the
    sub-phase's implementation stack.

Estimate per the implementation stack:
  - Storage: per-frame payload × frame count, against the pre-commit ceiling
    (raised to 1 GB at sph-water R12).
  - Memory: intermediate-tensor allocations at canonical N, against host RAM.
  - Wall-clock: per-step floor × step count, against operator-routed thresholds.
    Use MEASURED component floors (not projected), per § K.3.

Flag scope mismatch BEFORE Stage 1 dispatch:
  - If estimates exceed any ceiling: surface to operator with at least three
    routing options (e.g., per-sub-phase descriptor override; capture downsampling
    cadence; ceiling raise; descriptor partition).
  - If estimates fit within ceilings: proceed to Stage 1.

Decision recorded in Stage 0 checkpoint.
```

### N.3 Sub-phases that should apply N.2

(FACT — eulerian-smoke / LBM / MPM Stage 0 Task 0.4 routings.) eulerian-smoke (large grid N), lattice-boltzmann-d3q19 (large grid N + larger per-step compute), mpm-multimaterial (1M particle scatter, denser than DFSPH). **All three exercised Task 0.4 at Stage 0 with clean signal and closed Stage 1 in a single session** — see § N.4 for the anchoring evidence.

closed-form, agent-based, RD-3D, sph-water-class diagnostic-tier sub-phases: scope-analysis is likely under all ceilings and the Task 0.4 surfaces an explicit "fits within ceilings" finding.

### N.4 Empirical baseline — three single-session-ready Stage 1s

(FACT — eulerian-smoke landing `cf13d1c` / LBM landing `4f79e19` / MPM landing `bd89e78`.) Task 0.4 was exercised at three consecutive per-sim sub-phases. All three closed Stage 1 in a single Claude Code session — the strongest signal the discipline structurally amortizes the R-class arc that originally motivated it (sph-water R12 → R20). The graduation from PROPOSED to established was routed at `sub-phase-conventions-refactor-post-phase-1`.

### N.5 Production-correction factor range

(FACT — eulerian-smoke landing § 3 + LBM landing § 8 N3 + MPM landing § 8.2 N4.) Stage 0 Task 0.4 estimates are **conservative upper bounds, not point estimates**. Production-correction factors observed across the three anchoring sub-phases:

| Sub-phase | Stage 1 vs Stage 0 projection | Factor |
|---|---|---|
| eulerian-smoke | over Stage-0 projection (Stage 0 measured at slightly-under-canonical grid; Stage 1 ran canonical) | 1.45× over |
| LBM | under Stage-0 projection (Stage 0 measured raw-f payload; Stage 1 committed macroscopic moments — 4× narrower) | 0.5× under |
| MPM | under Stage-0 projection (Stage 0 measured 2M-particle bench; Stage 1 committed 1M-particle) | 0.6× under |

Empirical range across three sub-phases: **[0.5×, 1.45×]**. Framing as **[0.5×, 3×] sim-shape-dependent** accommodates Phase-2+ variance — small n (=3); safety margin on the upper bound matters more than a tight observed band for the rule-of-thumb routing purpose this convention serves.

Direction of bias correlates with **sim-shape**:

- **NumPy-vectorized sims** where Stage 0 measurement closely matches Stage 1 implementation trend toward the **over-shoot direction** (eulerian-smoke 1.45× over).
- **Python-loop-heavy or Stage-0-scope-wider-than-Stage-1-scope sims** trend toward the **under-shoot direction** (LBM 0.5×, MPM 0.6× under). Under-shoot is characteristic of sub-phases where Stage 0 measurement is wider than Stage 1 commits: LBM Stage 0 measured raw-f payload but Stage 1 committed macroscopic moments (4× narrower); MPM Stage 0 measured a 2M-particle bench but Stage 1 committed 1M-particle (0.5× scaling).

**Operational consequence.** When Task 0.4 surfaces a Stage 0 estimate at the W1-ceiling boundary, route on whether the sim's likely production-correction band trends over (NumPy-vectorized; Stage-0-matches-Stage-1 shape) or under (Python-loop-heavy; Stage-0-wider-than-Stage-1 shape). Plan downstream W1 raises or cadence routing (see § P) accordingly.

---

## § O. Coherence note

This document is the consolidation of cross-cutting patterns from the following audit chain (chronological):

- `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` — Phase 1 landing (21 baseline shifts).
- `docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md` — first per-sim sub-phase.
- `docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md` — added determinism-strategy declaration + P22.
- `docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md` — first focused infrastructure-hotfix sub-phase.
- `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md` — first MMS gate-5 + P23 + B17 PATH-A landed.
- `docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md` — numba project infrastructure.
- `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md` — most-extensively-routed sub-phase; six R-class arcs; P24.
- `docs/_audits/phase-1/sub-phase-mutation-script-hotfix/repair-2026-05-22T02-57-31Z.md` — surgical mutation-runner validator fix.

Per-sub-phase plans at `docs/phases/sub-phase-*.md` remain self-contained inheritance-by-most-recent-template artifacts and are not retroactively rewritten to point at this document. Future sub-phase plan-drafting agents read this document FIRST, then inherit specifics from the most-recent prior sub-phase landing audit.

---

*End of sub-phase conventions reference. Consolidates cross-cutting patterns from four landed per-sim implementation sub-phases plus three focused infrastructure-hotfix sub-phases under spec-Phase-1.*

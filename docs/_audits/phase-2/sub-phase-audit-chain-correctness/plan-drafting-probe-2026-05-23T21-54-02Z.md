---
date: 2026-05-23T21-54-02Z
author: audit-chain-correctness-sub-phase-agent
phase: 2
artifact: stage
artifact_id: audit-chain-correctness-plan-drafting-probe
subject: "Plan-drafting anchor-probe for the spec-Phase-2 audit-chain-correctness sub-phase (focused-infrastructure shape; bundles §B.6 Option-1 verify_evidence LFS-content-OID fix + portfolio-wide capture .json phantom-sha audit, both N5 banked items from RD-2D Stack-D landing § 10). Conventions doc sha256 167fe349…f2c58c2e verified at HEAD (854 lines; not BLOCKED). Empirical phantom-sha survey: 14 capture .json enumerated; exactly 2 phantom drifts (rd-2d-stack-d a7780645, rd-3d-ref ccd0e4ea), both trailing-newline-signature-confirmed, both ALREADY caught at their respective landings; 5 MATCH; 7 with no recorded sidecar sha. verify_evidence fix surface located at common/repo.py file_at_sha; LFS pointer stub embeds the content OID directly (no smudge/network/auth required — R-A1 defused). Two plan-drafting shifts surfaced: S1 dispatch §7.6 anchor falsified (verify_evidence semantics live at architecture.md §7.5; §7.6 is Sandbox-probe-before-assert); S2 §B.6 Mode-1 mis-classifies the rd-3d-ref phantom-sha as content-evolution (candidate §B.6 Mode-3). D1-D6 surface preview with leans. 120 shifts inherited → 122 at plan-drafting close."
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER — back-filled per Convention #12>
head_sha_at_checkpoint: <PLACEHOLDER>
parent_audits:
  - docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
evidence_paths:
  - tools/integrity/integrity/scripts/verify_evidence.py
  - tools/integrity/integrity/common/repo.py
  - tools/integrity/tests/test_verify_evidence.py
  - .gitattributes
  - .pre-commit-config.yaml
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
---

# Plan-Drafting Anchor-Probe — Sub-Phase Audit-Chain-Correctness

This probe ratifies the dispatch's anchor sketch against HEAD `2eb2a2d` and
establishes the empirical scope drivers for the two bundled deliverables:
(1) the §B.6 Option-1 `verify_evidence` LFS-content-OID fix, and (2) the
portfolio-wide capture `.json` phantom-sha audit. Both surfaced as **N5a / N5b
banked-for-operator items** at the RD-2D Stack-D landing (§ 10).

All claims tagged **FACT** (grep/sha-verified at HEAD) / **INFERENCE** (cites
the FACTs it rests on) / **SHIFTED** (drift vs the dispatch anchor sketch).

## 1. Anchor verification (Convention M)

(FACT — `sha256sum` / `git show` / `wc -l` at HEAD `2eb2a2d56170fc67cfe1b7e376c684ea664d13e9`.)

| Anchor | Dispatch sketch | HEAD reality | Status |
|---|---|---|---|
| Conventions doc sha256 | `167fe349…f2c58c2e`; 854 lines | `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e`; 854 lines | **MATCH** — not BLOCKED |
| `verify_evidence` path | `tools/integrity/integrity/scripts/verify_evidence.py` | exists at that path | **MATCH** |
| `file_at_sha` LFS-relevant surface | "fix surface is the hash function" | `tools/integrity/integrity/common/repo.py:62-72` (`git show <sha>:<path>`) feeds `tools/integrity/integrity/scripts/verify_evidence.py:113` `hashlib.sha256(blob)` | **REFINED** — fix surface spans repo.py + verify_evidence.py (see § 2) |
| `.gitattributes` LFS pattern | "verify `captures/**/*.h5 filter=lfs`; identify OTHER LFS patterns" | **ONLY** `captures/**/*.h5 filter=lfs diff=lfs merge=lfs -text` is LFS-filtered | **MATCH + NARROWED** — see § 3 |
| `end-of-files` hook | "activation date determines lookback" | `end-of-file-fixer` present in the **initial** `.pre-commit-config.yaml` (`1f052df`, 2026-05-18, Phase 0 Block 1) | **MATCH** — lookback is **portfolio-wide** (§ 4) |
| Spec/arch § 7.6 = audit-chain discipline | dispatch anchor-probe step 11 | architecture.md **§ 7.5** is "Audit-trail discipline" (verify_evidence home); **§ 7.6** is "Sandbox-probe-before-assert" | **SHIFTED (S1)** — dispatch anchor falsified (§ 9) |
| RD-2D Stack-D landing | `7747d68`+back-fill `2eb2a2d`; SHIFTED N1–N5 | landing head_sha `7747d68…`, HEAD `2eb2a2d` (SHA back-fill) | **MATCH** |
| `tolerance.toml` `[overrides.reaction-diffusion-2d]` | "present; cross-reference only; do NOT touch" | present at line 45 (Stage 1c artifact) | **MATCH** — out of scope, confirmed |

**Anchor-sketch verification status: RATIFIED-with-two-shifts (S1, S2).** Not
BLOCKED. The conventions doc is byte-stable at the post-amendment baseline; this
is the third sub-phase to dispatch against it.

## 2. `verify_evidence` implementation inventory (item-1 fix surface)

(FACT — `tools/integrity/integrity/scripts/verify_evidence.py` + `common/repo.py` read fully at HEAD.)

- **Hash function call site.** `tools/integrity/integrity/scripts/verify_evidence.py:109-120` — for each
  `evidence_hashes` entry it calls `blob = file_at_sha(root, head_sha, path_str)`
  then `actual = hashlib.sha256(blob).hexdigest()` and compares to the claimed
  hex (accepting a `sha256:` prefix per `tools/integrity/integrity/scripts/verify_evidence.py:114`).
- **The LFS-blind read.** `tools/integrity/integrity/common/repo.py:62-72` `file_at_sha()` shells
  `git show <sha>:<path>` and returns stdout bytes. For an LFS-tracked path,
  `git show` returns the **pointer stub**, not the smudged content.
- **Empirical pointer stub at HEAD** (`git show HEAD:captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.h5`):

  ```
  version https://git-lfs.github.com/spec/v1
  oid sha256:2e93a75164bafdf104b0b247fffdeb5e3d8be0806b5fa42f17b6d5741041b13d
  size 2940664
  ```

  **KEY DESIGN FINDING (INFERENCE → defuses R-A1).** The pointer stub's
  `oid sha256:` line is **literally the content OID** —
  `2e93a751…` — which is **exactly** the value the RD-2D Stack-D landing records
  in `evidence_hashes` for that `.h5` (landing § 4 / front-matter line 50). So the
  fix has two viable designs, the first strictly preferable:
  1. **OID-parse (preferred).** Detect the pointer (blob begins with
     `version https://git-lfs.github.com/spec/v1`), parse `oid sha256:<hex>`, and
     compare that hex to the claimed content sha256. **No `git lfs smudge`, no
     network, no LFS auth, no working-tree dependency.** Pure, deterministic,
     offline. Defuses R-A1 entirely.
  2. **Smudge (faithful fallback).** `git cat-file --filters` or pipe through
     `git lfs smudge`, then hash the smudged bytes. Verifies the *actual content*
     (not just the recorded OID). Requires git-lfs installed; `git-lfs 3.4.1` IS
     on PATH at `/usr/bin/git-lfs` at HEAD, so this is available, but it carries
     the R-A1 install/network surface the OID-parse path avoids.
  - **Recommendation for charter § 1.4.1:** land OID-parse as the primary path
    (closes the drift with zero new runtime dependency), optionally add a
    smudge-and-compare belt-and-suspenders check guarded by git-lfs availability.
- **`--strict` mode is a latent no-op.** `tools/integrity/integrity/scripts/verify_evidence.py:128-135` declares
  `--strict` and the docstring describes it, but `args.strict` is **never read**
  in `main()` (the structured-failure exit-1 path runs regardless). **This bears
  directly on R-A4:** there is no `--strict`-specific code path to preserve — the
  fix must (a) not introduce one inadvertently, and (b) decide whether to wire
  `--strict` to its documented semantics as part of this sub-phase or leave it
  banked. Surfaced as a charter R-A4 note; lean = leave `--strict` wiring banked
  (out of the two bundled deliverables' theme) unless operator routes it in.
- **Test surface.** `tools/integrity/tests/test_verify_evidence.py` — 5 tests
  (valid paths pass; missing path fails; hash mismatch fails; `sha256:` prefix
  accepted; no-front-matter raises). **No LFS test exists.** The fix adds LFS
  fixture tests (pointer→content-OID match; non-LFS unchanged; regression of the
  5 existing). Note: the existing tests use `git commit --amend` in fixtures —
  that's fixture-internal and not a Convention #12 concern.

## 3. `.gitattributes` LFS-tracked-pattern inventory (item-1 blast radius)

(FACT — `.gitattributes` read fully at HEAD.)

**Exactly one LFS-filtered pattern:** `captures/**/*.h5 filter=lfs diff=lfs merge=lfs -text`.

All other binary types (`*.hdf5 *.png *.bin *.npy *.npz *.zip *.tar *.gz …`) are
marked `binary` (no diff/normalize) but are **NOT** `filter=lfs`. They are stored
as ordinary git blobs, so `file_at_sha` reads their true content and hashes
correctly. **The fix therefore only needs to handle `captures/**/*.h5`** — but it
should detect LFS membership *structurally* (pointer-stub sniff and/or
`git check-attr filter <path>`), not by hard-coding `.h5`, so it stays correct if
future patterns join the LFS filter. (INFERENCE — pointer-sniff is the robust
detector; it is content-driven and pattern-agnostic.)

## 4. `end-of-files` hook activation + lookback window (item-2 scope)

(FACT — `git show 1f052df:.pre-commit-config.yaml` + `git log -- .pre-commit-config.yaml`.)

- The `end-of-file-fixer` hook (pre-commit-hooks `v6.0.0`) is present in the
  **initial** `.pre-commit-config.yaml`, committed at `1f052df`
  (2026-05-18T23:27:28, "feat(foundation): Phase 0 Block 1 — repo skeleton").
- **Lookback window = portfolio-wide** (Phase 0 → HEAD). Every capture `.json`
  ever committed went through the hook. This is the worst-case lookback, but the
  empirical survey (§ 5) shows the actual drift incidence is small and bounded.
- The hook appends a trailing `\n` to text files at commit time, **after** an
  agent computes sha256 on in-memory pre-hook content → committed blob carries the
  newline → `sha256(committed_blob) ≠ sha256(pre-hook_content)`. This is the
  "phantom-sha" mechanism (RD-2D Stack-D § 8 N1).

## 5. Empirical phantom-sha survey (item-2 deliverable-scope driver)

(FACT — for each tracked `captures/**/*.json`: committed sha via
`git show HEAD:<path> | sha256sum`; recorded sha via `grep` of the audit corpus;
trailing-newline signature via `git show … | perl -0777 -pe 's/\n\z//' | sha256sum`.)

**14 capture `.json` files enumerated.** Recorded-in-audit vs committed-at-HEAD:

| Capture `.json` | Committed (HEAD) | Recorded in audits | Status |
|---|---|---|---|
| `boids-3d-ref/flock-1000agents-…` | `7e39a750…` | — (no sidecar sha) | NO-RECORD |
| `boids-3d-ref/flock-3agents-canonical-…` | `3eabebd1…` | — | NO-RECORD |
| `eulerian-smoke-ref/lid-driven-cavity-…` | `52e89e95…` | `52e89e95…` | **MATCH** |
| `eulerian-smoke-ref/taylor-green-…` | `9d6a78ed…` | `9d6a78ed…` | **MATCH** |
| `lbm-ref/couette-…` | `d9fbcafb…` | — | NO-RECORD |
| `lbm-ref/poiseuille-…` | `8347922d…` | — | NO-RECORD |
| `mandelbulb-explorer-ref/de-probe-points-…` | `3ad25d64…` | — | NO-RECORD |
| `mpm-ref/drop-impact-…` | `ea3531e0…` | `ea3531e0…` | **MATCH** |
| `physarum-ref/network-canonical-…` | `0c67b04d…` | — | NO-RECORD |
| `reaction-diffusion-2d-ref/gray-scott-…` | `585d7d8a…` | `585d7d8a…` | **MATCH** |
| `reaction-diffusion-2d-stack-d/gray-scott-…` | `e1752ceb…` | `e1752ceb…` (landing) **+ `a7780645…` (checkpoints)** | **PHANTOM-DRIFT** |
| `reaction-diffusion-3d-ref/gray-scott-…` | `5c64375f…` | `5c64375f…` (landing) **+ `ccd0e4ea…` (Stage-1 checkpoint)** | **PHANTOM-DRIFT** |
| `sph-water-ref/dam-break-…` | `84dbc448…` | `84dbc448…` | **MATCH** |
| `strange-attractors-ref/lorenz-…` | `dbb7b77d…` | — | NO-RECORD |

**Tally: 5 MATCH · 7 NO-RECORD · 2 PHANTOM-DRIFT.**

**Trailing-newline signature — both phantom drifts CONFIRMED:**

| File | committed = `sha256(content + \n)` | `sha256(content − trailing \n)` | recorded phantom |
|---|---|---|---|
| rd-2d-stack-d `.json` | `e1752ceb…` | `a7780645…` | `a7780645…` ✓ |
| rd-3d-ref `.json` | `5c64375f…` | `ccd0e4ea…` | `ccd0e4ea…` ✓ |

Both phantoms are **exactly** `sha256` of the manifest content *without* the
trailing newline the hook appended — the identical mechanism. **Both were already
caught at their respective landings** (both landing audits record the *correct*
committed value); the phantoms survive only in **sealed checkpoints**
(append-only, untouchable per § B.1 + Convention #12).

**Critical re-classification (S2).** The rd-3d-ref phantom (`ccd0e4ea…`) is
catalogued in conventions § B.6 **Mode 1 ("file content evolved between
audit-time and HEAD")** — but the rd-3d landing § 8 N1 itself states the blob
"has never been modified since" `2942407` (single commit on file). The blob did
NOT evolve; the checkpoint recorded the pre-hook (no-newline) sha. So this is the
**phantom-sha mechanism, not content-evolution** — § B.6 Mode 1 mis-classifies
it. By contrast, **LBM N2 IS genuine Mode 1**: `.pre-commit-config.yaml` +
`docs/perf-ledger.md` were modified by *later* Stage-1 commits before the
checkpoint snapshot (FACT — LBM landing § 9.3 N2). The phantom-sha audit's
substantive contribution is to separate these two modes (§ 9 S2).

## 6. Estimated phantom-sha drift count (Stage-1 audit-report scope)

(INFERENCE — from § 5.)

- **Confirmed capture-`.json` phantom drifts: exactly 2** (rd-2d-stack-d,
  rd-3d-ref), both in sealed checkpoints, both already landing-caught.
- **R-A3 decomposition trigger (>20 / >30 drifts): NOT hit.** The "potentially
  affected portfolio-wide" framing resolves to a bounded ≤2.
- **Stage-1 phantom-sha-audit report scope: SMALL** (~+200–300 lines): the
  14-row enumeration table, the 2-drift trailing-newline classification, the
  rd-3d-ref Mode-1→phantom re-classification narrative, and a clean bill for the
  5 MATCH + 7 NO-RECORD. No corrective amendment to any sealed prior audit
  (Convention A + #12; both landings already record the correct value).

## 7. §B.6 Mode-2 annotation incidence (item-1 forward blast radius)

(FACT — `grep` of `Mode 2` / `pointer` / `§B.6` across all 17 landing audits.)

§B.6 Mode-2 (LFS pointer-vs-content) is referenced in **5 landing audits**: MPM
(`§ 7.3`, first surface, the `.h5` `73e00d09…` content-OID vs `7bed5802…`
pointer-stub FAIL), conventions-refactor-post-phase-1 (consolidated §B.6 into the
conventions doc), Taichi-integration, capture-determinism-contract, and RD-2D
Stack-D (N2; Option-3 annotate). The `.h5` LFS migration landed 2026-05-22
(`sub-phase-git-lfs-migration`), so every sub-phase since carries the annotation
burden, and **every future cross-stack port ships 2 capture `.h5`** → the fix's
forward value is high and recurring. **The fix retires the Option-3 annotation
obligation for all subsequent landings** (this is the §B.6 Mode-2 RESOLVED
amendment).

## 8. D-class decision surface preview (NOT pre-committed)

| D | Question | Lean | Alternatives | Driver |
|---|---|---|---|---|
| **D1** | Canonical sub-phase name | `sub-phase-audit-chain-correctness` (adopted provisionally for paths) | `sub-phase-evidence-hash-correctness` (narrower); `sub-phase-verify-evidence-lfs-fix-and-audit` (verbose) | Conventions §B.4 prescribes descriptive `sub-phase-<slug>`; no narrower canon. Both deliverables are audit-chain hash correctness → broad frame fits |
| **D2** | Stage 1 monolithic vs decomposed | **1a/1b two-way** (1a: verify_evidence OID-parse fix + tests + §B.6 Mode-2-RESOLVED amendment; 1b: phantom-sha audit report + §B.6 Mode-3 + optional §7.5 clarification) | monolithic Stage 1 | ~+500–650 net (§ 10); two cleanly-separable workstreams (tooling vs audit); 1a GREEN tests are a clean checkpoint before 1b. NOT 1a/1b/1c — too granular for this size |
| **D3** | Spec §7.5 amendment | **optional additive clarification** (not required) | no amendment | architecture.md **§ 7.5** (not §7.6 — see S1) says verify_evidence hashes "the file content at head_sha"; SILENT on LFS-smudge. Plain-language "file content" intent *aligns* with the fix; a one-line clarification ("for LFS-tracked artifacts, the content OID") is additive |
| **D4** | CI gate redesign | **NO** | optional: add a CI verify_evidence job | `grep -rln verify_evidence .github/` = **empty**. verify_evidence runs at founder/phase-closing-agent time, not CI. integrity Cat-5 (`cat5_provenance`) does audit-LINK checks, not evidence_hashes; the LFS drift was present during RD-2D's `0 HARD_FAIL` sweep, proving Cat-5 does not hash evidence. Optional forward enhancement = banked |
| **D5** | Corrective-annotation-commit to high-incidence prior audits | **NO** | additive follow-up annotation commit per drifted audit | Both phantom landings ALREADY record the correct value; phantoms live only in sealed checkpoints (append-only). The new phantom-sha report is sufficient + discoverable. Strong NO |
| **D6** | LBM/MPM `sim_runner_diagnostic` seed-propagation defect | **confirm DEFER (STAYS BANKED)** | fold in | Probe surfaced NO adjacency to audit-chain hash correctness; it is per-sim test-infra of different shape. Bundling adds template-shape confusion. Folds into the next per-sim sub-phase touching LBM/MPM |

**New-IC note (§ 3 of charter):** highest assigned IC is **IC-15** (cross-stack
methodology *candidate*, deferred per RD-2D D5). "IC-16" exists only as a
forward-reference in the RD-2D charter (`§ 205`). If this sub-phase formalizes the
`verify_evidence` LFS-content-OID verification semantics as a canonical surface,
it claims **IC-16**; IC-15 stays reserved for the cross-stack template.

## 9. Plan-drafting shifts surfaced

| ID | Description |
|---|---|
| **S1 (plan-drafting)** | **Dispatch's "spec/architecture § 7.6 = audit-chain discipline; verify_evidence semantics" anchor FALSIFIED.** At HEAD, architecture.md **§ 7.5** is "Audit-trail discipline" (the verify_evidence + evidence_hashes home; also Appendix G.7 line 3127+); **§ 7.6** is "Sandbox-probe-before-assert (cross-role)". The D3 spec-amendment surface, if any, is **§ 7.5 + Appendix G.7**, not § 7.6. Precedent: RD-2D Stack-D N2 falsified-LFS-anchor — coordinator-side Convention #8 (verify dispatch anchors against HEAD, do not infer). Banked. |
| **S2 (plan-drafting)** | **§ B.6 Mode-1 mis-classifies the rd-3d-ref capture-`.json` phantom-sha (`ccd0e4ea…`) as "file content evolved between audit-time and HEAD."** Empirically (§ 5) the blob never changed (rd-3d landing § 8 N1 confirms single-commit-on-file) and `ccd0e4ea…` is exactly `sha256(content − trailing \n)` — the hook-induced phantom, identical to rd-2d-stack-d N1. The phantom-sha is a **distinct third mode** (recorded sha = pre-hook content sha; committed blob carries the hook's appended `\n`), separable from genuine content-evolution (LBM N2) and from LFS pointer-vs-content (Mode 2). **Surfaces a candidate § B.6 Mode-3 ("phantom-sha / pre-commit-hook trailing-newline") classification** — additive conventions-doc amendment, in-scope for this sub-phase's §B.6 surface. New precedent. |

**Cumulative shift count: 120 inherited (RD-2D Stack-D § 8 close) + 2
(S1, S2) = 122** entering Stage 0 dispatch.

## 10. Estimated Stage-1 diff size + D2 recommendation

(INFERENCE — from §§ 2, 6, 7.)

| Deliverable | Est. net lines |
|---|---|
| `verify_evidence` OID-parse fix (`repo.py` + `verify_evidence.py`) | +40–90 |
| LFS test suite (`test_verify_evidence.py`) | +150–250 |
| Phantom-sha audit report (14-row + classification) | +200–300 |
| § B.6 amendment (Mode-2 RESOLVED + candidate Mode-3) | +25–50 |
| § 7.5 / Appendix G.7 clarification (D3, optional) | +5–10 |
| Convergence (CHANGELOG additive; dependencies.md if IC-16 formalized) | +15–30 |
| **Total** | **~+450–650** |

**D2 recommendation: 1a/1b two-way decomposition.** Borderline against
Convention A's +500 single-commit heuristic, and the two workstreams (tooling
fix vs audit report) are independent with distinct verification (1a = pytest
GREEN on new LFS tests; 1b = the report + amendments). Monolithic is viable if
operator prefers fewer commits; surfaced as the alternative.

## 11. Blocking dependencies

**None.** git-lfs 3.4.1 is installed (smudge fallback available); the OID-parse
primary path needs no runtime dependency. Conventions doc is byte-stable. The
fix surface is fully characterized. No anchor BLOCKED. The charter is
Stage-0-dispatchable pending operator routing of D1–D6.

---

This probe lands at HEAD `<PLACEHOLDER>` (back-filled per Convention #12 + § B.2
in a separate `chore(audit-chain-correctness-plan-drafting-sha-backfill)` commit;
full 40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED** (anchor-sketch RATIFIED-with-two-shifts; not BLOCKED).

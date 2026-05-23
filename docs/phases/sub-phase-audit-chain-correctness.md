# Audit-Chain-Correctness — Sub-Phase Charter (Spec-Phase-2 Focused Infrastructure)

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — focused infrastructure sub-phase fixing audit-chain hash-correctness tooling + auditing prior capture-`.json` phantom-sha drift. NOT a per-sim implementation sub-phase; NOT a cross-stack port.
> **Sub-phase identity:** Bundles the two banked-for-operator items surfaced as **N5a / N5b** at `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md` § 8 N5 + § 10: (a) §B.6 **Option 1** — teach `verify_evidence` to resolve the LFS content OID before comparing; (b) portfolio-wide capture-`.json` phantom-sha audit. Both are about **audit-chain hash correctness** — thematically coherent. Mirrors the focused-infrastructure shape of `sub-phase-taichi-integration` (workspace infrastructure) and the consolidation/amendment shape of `sub-phase-capture-determinism-contract` (harness change + spec/conventions amendment). This is NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` (N a single integer) for spec-phase boundaries. No `-phase-N` tag is proposed.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ **7.5** (Audit-trail discipline — `verify_evidence` + `evidence_hashes` semantics; NOT § 7.6, which is "Sandbox-probe-before-assert" — dispatch anchor corrected, see plan-drafting probe § 9 S1), 7.12 (phase-tag form + agent-vs-operator tag split), Appendix G.7 / G.7.5 (mechanical audit anchors). Conventions doc § B (audit-chain discipline), especially **§ B.1** (content-OID load-bearing posture) + **§ B.6** (LFS-pointer-vs-content drift modes; Mode 2 is the active mode this sub-phase resolves Option 1 of).
> **Parent conventions doc** (authoritative): `docs/conventions/sub-phase-conventions.md` (sha256 `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e`; 854 lines). Inherits role model, audit / append-only discipline, checkpoint discipline, Convention #12 SHA back-fill, replay-chain non-participation, problem-solving playbook, FACT / INFERENCE tagging — by REFERENCE, not re-stated. This is the **third** sub-phase to dispatch against the post-amendment baseline; § B is the substantive surface it amends.
> **Parent sub-phase templates** (structure inheritance): `docs/phases/sub-phase-taichi-integration.md` (focused-infrastructure template — closest analog) + `docs/phases/sub-phase-capture-determinism-contract.md` (portfolio-wide amendment-pattern: harness change + spec amendment + conventions-doc amendment).
> **Parent audits / pre-conditions (FACT — reverify at Stage 0 Task 0.0):**
> - RD-2D Stack-D landed SHIFTED-with-N1–N5 at `7747d68` (+ SHA back-fill HEAD `2eb2a2d`); all 14 gates GREEN (FACT — RD-2D Stack-D landing § 2 / § 3). N5a/N5b are this sub-phase's mandate.
> - Taichi-integration landed CONFIRMED (`docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md`); capture-determinism-contract landed CONFIRMED (`docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md`).
> - §B.6 Mode 2 (LFS pointer-vs-content) first surfaced at MPM § 7.3 (`docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md`); annotated (Option 3) across **5 landing audits** (probe § 7).
> - Bit-identity replay invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` held byte-identically across 19+ invocations.
> **Inherited shifts:** **120 documented entering this sub-phase** (FACT — RD-2D Stack-D landing § 8 "Cumulative shift count at Stage 2 close: 115 + 5 = 120"). Plan-drafting added **2** (S1 / S2; probe § 9) → **122** entering Stage 0. Carried forward by reference; not re-litigated.
> **Date drafted:** 2026-05-23.
> **Status:** drafting CONFIRMED; subsequent stages dispatchable by operator pending D1–D6 routing (§ 11.5).

---

## § 1. Scoping, posture, architecture

### § 1.1 What this sub-phase is

This sub-phase fixes **audit-chain hash correctness** along two thematically-coherent axes, both surfaced at the RD-2D Stack-D landing as banked-for-operator N5 items:

1. **`verify_evidence` LFS-content-OID fix (§B.6 Option 1; N5a).** `tools/integrity/integrity/common/repo.py:62-72` `file_at_sha()` reads evidence via `git show <sha>:<path>`, which returns the **LFS pointer stub** for `captures/**/*.h5` artifacts; `tools/integrity/integrity/scripts/verify_evidence.py:113` then hashes that stub. The audit chain records the **content OID** as load-bearing per § B.1. The drift between tool behavior and audit semantics (§B.6 **Mode 2**) is fixed by teaching `verify_evidence` to resolve the content OID for LFS-tracked artifacts before comparing. Portfolio-wide tooling consumed by every sub-phase's gate-5 evidence check.

2. **Portfolio-wide capture-`.json` phantom-sha audit (N5b).** The pre-commit `end-of-file-fixer` hook appends a trailing `\n` to text files at commit time, after agents compute sha256 on in-memory pre-hook content; the committed blob carries the newline, so `sha256(blob) ≠ sha256(pre-hook content)`. First surfaced for the RD-2D Stack-D capture `.json` at landing (`a7780645…` phantom → `e1752ceb…` committed; landing § 8 N1). This sub-phase enumerates every capture-`.json` sha256 recorded in any audit committed since hook activation, verifies each against the committed file, and documents drifts in a NEW report — **with no corrective amendment to append-only prior audits**.

The plan-drafting probe (`docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-probe-2026-05-23T21-54-02Z.md`) empirically bounds both: the LFS fix has a clean OID-parse design path (the pointer stub literally embeds `oid sha256:<content-OID>`, so no smudge/network/auth is required); and the phantom-sha incidence is **exactly 2 confirmed drifts** (rd-2d-stack-d, rd-3d-ref), both already caught at their respective landings, both following the identical trailing-newline signature.

### § 1.2 What this sub-phase is NOT

- A per-sim implementation sub-phase. No gates 4–14; no sim source; no canonical capture.
- A cross-stack equivalence sub-phase. Does not touch `tools/testkit/equivalence/tolerance.toml` `[overrides.reaction-diffusion-2d]` (RD-2D Stack-D Stage 1c artifact; cross-reference only).
- A fix of the LBM/MPM `sim_runner_diagnostic` seed-propagation defect — that **STAYS BANKED** (D6; § 11.2). It is a per-sim test-infrastructure concern of different shape; folding it in adds template-shape confusion for marginal savings. It folds into whichever future per-sim sub-phase next touches LBM or MPM.
- A conventions-doc amendment beyond § B.6 (and the § B.6-adjacent Mode-3 classification the probe surfaced) unless Stage 1 surfaces a further need (surface per Hard Rule 2).
- An edit of any Phase 0 / Phase 1 / post-Phase-1 / Taichi-integration / capture-determinism-contract / RD-2D Stack-D audit file (append-only per § B.1 + Convention A). The phantom-sha audit documents drifts in a NEW report; it does NOT correct prior audits in place.
- An edit of `docs/phases/phase-2-cross-stack-replication.md` (SUPERSEDED).
- A `--strict`-mode re-wiring of `verify_evidence` (the flag is a latent no-op at HEAD — probe § 2; R-A4). Banked unless operator routes it in.
- Pre-committing D1 / D2 / D3 / D4 / D5 / D6 — operator decisions surfaced at landing-audit close (§ 11.5).

### § 1.3 Inputs + inherited shifts (122 cumulative) + banked items consumed

(FACT — RD-2D Stack-D landing § 8 / § 10; Taichi-integration landing; capture-determinism-contract landing; plan-drafting probe §§ 1–11.)

**Closing posture this sub-phase inherits:**
- 120 cumulative shifts entering (RD-2D Stack-D § 8 close); plan-drafting added 2 (S1 / S2) → 122 entering Stage 0.
- Bit-identity replay invariant `9399fc33…909f34` (19+ invocations); Stage 0 Task 0.0 = next invocation.
- Conventions doc byte-stable at sha256 `167fe349…f2c58c2e`.
- `verify_evidence` LFS-blindness fully characterized (probe § 2); git-lfs 3.4.1 installed (smudge fallback available); **exactly one** LFS-filtered pattern (`captures/**/*.h5`; probe § 3).
- `end-of-file-fixer` active since Phase 0 Block 1 (`1f052df`, 2026-05-18) → phantom-sha lookback is portfolio-wide (probe § 4), but empirical incidence is a bounded ≤2 (probe §§ 5–6).

**Banked items CONSUMED by THIS sub-phase** (D5 disposition; see § 11.2):
- **§B.6 Option 1 — `verify_evidence` LFS-smudge/OID fix** (RD-2D Stack-D N5a; supersedes the Taichi-integration-era "evidence_paths LFS remediation" banked item — note the supersession explicitly per RD-2D Stack-D § 10).
- **Portfolio-wide capture-`.json` phantom-sha audit** (RD-2D Stack-D N5b).

**Banked items DEFERRED** (D5/D6 disposition; § 11.2): LBM/MPM `sim_runner_diagnostic` seed-propagation defect (STAYS BANKED — D6); IC-15 spec-template formalization (second cross-stack pair); cross-stack methodology full-consolidation (second cross-stack pair); testing-improvements; mid-Phase-1 capture regeneration.

### § 1.4 Sub-phase-specific posture

#### § 1.4.1 `verify_evidence` LFS-content-OID semantics design

(FACT — probe § 2; the LFS pointer stub at HEAD for the RD-2D Stack-D `.h5` is `version https://git-lfs.github.com/spec/v1` / `oid sha256:2e93a751…` / `size 2940664`, and `2e93a751…` is exactly the audit-recorded content OID.)

The contract this sub-phase establishes: for an `evidence_hashes` entry whose path is LFS-tracked, `verify_evidence` compares the **content OID** (not the pointer-stub sha256) against the claimed value; for non-LFS paths, behavior is unchanged (hash the git blob).

**Two design paths; (1) is the lean.**

1. **OID-parse (PREFERRED).** Detect the pointer (blob begins with `version https://git-lfs.github.com/spec/v1`), parse the `oid sha256:<hex>` line, and compare that hex to the claimed content sha256. **No `git lfs smudge`, no network, no LFS auth, no working-tree dependency — pure, deterministic, offline.** This is sound because the audit-recorded value (per § B.1 + § B.3) is defined to be the content OID, and the pointer's `oid` line IS that OID, signed by git-lfs's own content-addressing. **Defuses R-A1 entirely.**
2. **Smudge-and-hash (FAITHFUL FALLBACK).** Resolve actual content via `git cat-file --filters` (or pipe through `git lfs smudge`) and hash the smudged bytes. Verifies the *content itself*, not just the recorded OID; requires git-lfs installed. Optional belt-and-suspenders, guarded by git-lfs availability.

**Detection must be structural, not `.h5`-hardcoded** (probe § 3): pointer-stub sniff (and/or `git check-attr filter <path>`) so the fix stays correct if future patterns join the LFS filter. **The fix must NOT relax the mismatch→error behavior on legitimate non-LFS mismatches** (R-A4).

#### § 1.4.2 Phantom-sha audit methodology + non-corrective framing

(FACT — probe §§ 4–6; RD-2D Stack-D § 8 N1; conventions § B.1 + Convention #12.)

- **Lookback:** portfolio-wide (hook active since Phase 0 Block 1). **Method:** for every tracked `captures/**/*.json`, compute committed sha256 at HEAD; enumerate every sha256 recorded for that path in any audit committed since activation; classify each recorded value as MATCH / phantom (= `sha256(content − trailing \n)`) / genuine content-evolution / no-record.
- **Empirical baseline (probe § 5):** 14 captures → 5 MATCH · 7 NO-RECORD · **2 PHANTOM-DRIFT** (rd-2d-stack-d `a7780645…`, rd-3d-ref `ccd0e4ea…`), both trailing-newline-signature-confirmed, both **already caught at their landings** (both landings record the correct committed value; the phantoms survive only in sealed checkpoints).
- **Non-corrective framing (load-bearing):** the audit documents drifts in a NEW report at `docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-<UTC>.md`. It does **NOT** edit any prior audit in place (Convention A + #12; § B.1 append-only). Both phantom landings already record the correct value, so no prior LANDING is wrong — the phantoms live in append-only checkpoints that are immutable by design. The report is the canonical going-forward record (RD-2D Stack-D § 8 N1 precedent).
- **Re-classification deliverable (probe § 9 S2):** § B.6 **Mode 1** currently lists "RD-3D N1" as "file content evolved between audit-time and HEAD," but the rd-3d landing § 8 N1 states the blob never changed; `ccd0e4ea…` is the trailing-newline phantom. The report separates genuine content-evolution (e.g., LBM N2: `.pre-commit-config.yaml` / `docs/perf-ledger.md` touched by later commits) from the phantom-sha mode, and the § B.6 amendment (§ 1.4.3) introduces a candidate **Mode 3** for it.

#### § 1.4.3 § B.6 Mode-2 resolution at portfolio scale

(FACT — probe § 7; conventions § B.6 lines 164–181.)

On the `verify_evidence` fix landing, § B.6 **Mode 2 is RESOLVED**: subsequent sub-phases no longer need Option-3 (annotate) entries in landing audits for LFS-tracked evidence. The § B.6 amendment (additive) records: (a) Mode 2 resolved at this sub-phase's fix; (b) a candidate **Mode 3 — phantom-sha (pre-commit-hook trailing-newline)** classification, distinct from Mode 1 (content evolution) and Mode 2 (LFS pointer). Whether the Mode-3 amendment lands is a D-class consideration folded into D2's 1b; the Mode-2-resolved amendment is unconditional.

### § 1.5 Role model, conventions, audit discipline

Inherited from conventions doc § A.3 + § C + § B verbatim. Single Claude Code agent at a time; single Claude.ai coordinator chat; one operator. Convention #12 SHA back-fill at every stage close per § B.2 tightened-discipline (full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed). **Convention #8 is exemplary-load-bearing here:** this sub-phase exists partly because of a coordinator-side Convention #8 propagation gap (RD-2D Stack-D N4) — re-verify every path / SHA / sha256 against the committed artifact at each propagation point, especially text artifacts where the end-of-file hook introduces drift.

### § 1.6 Architecture — three stages

Three-stage cadence (Stage 0 pre-flight / Stage 1 implementation / Stage 2 landing) per conventions doc § A.2. Stage 1 default-decomposes **1a / 1b** per D2 lean (§ 4.0): 1a is the tooling fix + tests + § B.6 Mode-2-RESOLVED amendment; 1b is the phantom-sha audit report + candidate § B.6 Mode-3 + optional § 7.5 clarification. Monolithic Stage 1 is the alternative (probe net estimate ~+450–650 lines; § 10 of the probe). The two workstreams are independent with distinct verification (1a = pytest GREEN on new LFS tests; 1b = report + amendments), which is why decomposition is the lean; the call is D2 (operator-routable).

- **Stage 0 — Pre-flight.** Cross-phase replay against `v0.1.0-phase-1`; tolerance-budget carryover; re-anchor the probe's empirical findings (verify_evidence surface; LFS pattern; phantom incidence) against HEAD; Stage 0 checkpoint + Convention #12 SHA back-fill.
- **Stage 1 (1a/1b) — Implementation.** 1a: `verify_evidence` OID-parse fix + LFS test suite + § B.6 Mode-2-RESOLVED amendment. 1b: phantom-sha audit report + candidate § B.6 Mode-3 amendment + optional § 7.5/Appendix-G.7 clarification (D3). Each stage closes with a checkpoint + SHA back-fill.
- **Stage 2 — Landing.** Convergence-file edits (CHANGELOG additive; `docs/dependencies.md` additive if IC-16 formalized); full integrity sweep; cross-package regression sweep (Python-only surface — § B.7 fan-out); evidence-path verification (now GREEN on LFS `.h5` via the fix — the first sub-phase whose own gate-5 consumes the fix); sub-phase landing audit; Convention #12 SHA back-fill. **No tag** — § 11.4.

---

## § 2. Deliverables

Derived from the plan-drafting probe §§ 2–10 + deliverable-shape inheritance from Taichi-integration / capture-determinism-contract.

| # | Deliverable | Acceptance |
|---|---|---|
| 1 | **`verify_evidence` LFS-content-OID fix** at `tools/integrity/integrity/scripts/verify_evidence.py` (+ helper in `tools/integrity/integrity/common/repo.py` if the LFS-resolution helper lands there) | For an LFS-tracked `evidence_hashes` path, the hash compared is the content OID (OID-parse per § 1.4.1), matching `git lfs ls-files` + direct `sha256sum` on the smudged file. Non-LFS paths hash unchanged. Mismatch→error preserved (R-A4). |
| 2 | **Test suite for the fix** at `tools/integrity/tests/test_verify_evidence.py` (additive to the 5 existing tests) | New tests: (a) LFS-tracked-file evidence_hashes verifies against the content OID (fixture commits an LFS pointer stub + asserts pass); (b) non-LFS-tracked-file hashes to the normal git-blob sha256 (regression); (c) the 5 existing tests still GREEN; (d) a pointer-shaped-but-corrupt-OID case fails (R-A4 negative path). |
| 3 | **Portfolio-wide phantom-sha audit report** at `docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-<UTC>.md` | Every tracked capture-`.json`: recorded-audit-sha vs committed-file-sha, categorized by sub-phase; root-cause classification (end-of-file-fixer trailing-newline phantom vs genuine content-evolution vs LFS-pointer vs MATCH vs no-record). Documents the 2 confirmed phantom drifts + the rd-3d-ref Mode-1→phantom re-classification. **No corrective amendment to any prior audit.** |
| 4 | **§ B.6 conventions-doc amendment (additive)** at `docs/conventions/sub-phase-conventions.md` | Records: § B.6 Mode 2 **RESOLVED** at this sub-phase's `verify_evidence` fix (subsequent landings need no Option-3 annotation); candidate § B.6 **Mode 3** (phantom-sha / pre-commit-hook trailing-newline) classification distinct from Mode 1 / Mode 2. Append-only-respecting (additive lines; conventions doc sha256 changes — this is a legitimate amendment landed at Stage 1 per capture-determinism-contract precedent). |
| 5 | **Spec § 7.5 / Appendix G.7 clarification** at `docs/architecture.md` (D3; **optional**) | IF operator routes D3 in: a one-line additive clarification that `verify_evidence` resolves the content OID for LFS-tracked artifacts (the plain-language "file content at head_sha" already aligns; this makes it explicit). Default lean: no amendment needed (spec is silent, not incompatible — probe § 8 D3). |
| 6 | **CI gate (D4; optional, default NO)** | Default: NO CI redesign (`verify_evidence` is not invoked in CI — probe § 8 D4). IF operator routes a forward-guard in: a CI job invoking `verify_evidence` on the most-recent landing audit. Banked otherwise. |
| 7 | **Convergence-file edits (Stage 2)** | CHANGELOG additive entry (`### sub-phase-audit-chain-correctness` under `[Unreleased]`); `docs/dependencies.md` additive entry IF IC-16 is formalized (§ 3.2); integrity sweep GREEN; cross-package regression sweep GREEN (Python-only — § B.7). |

**Acceptance for "sub-phase complete":** deliverables 1–4 + 7 green (5/6 are D-class-conditional); the new LFS tests GREEN; the fix's own gate-5 (`verify_evidence --strict` over this sub-phase's landing audit, which cites LFS `.h5` evidence) PASSES via the fix; landing audit committed; SHA back-fill committed. **No `-phase-N` tag**; optional non-phase point-release is a banked operator decision (§ 11.4).

---

## § 3. Interface contracts

### § 3.1 ICs consumed (existing, not redefined)

(FACT — Phase 1 charter § 3.9 IC catalog + RD-2D Stack-D landing § 11.)

- **IC-2 (capture I/O Python)** — the capture `.h5` / `.json` artifacts whose hashing this sub-phase corrects are IC-2 outputs. Not modified; the hashing of them is.
- **IC-9 (audit body)** — Stage 0 / 1a / 1b / 2 audits + the phantom-sha report follow IC-9 abbreviated structure.
- **IC-13 / IC-14 (capture determinism contract)** — the capture-`.json` manifests this sub-phase audits are determinism-contract artifacts; the phantom-sha audit confirms their committed identity. Consumed, not redefined.

### § 3.2 New ICs produced

| IC | Surface | Load-bearing for |
|---|---|---|
| **IC-16 (new — `verify_evidence` LFS-content-OID verification semantics)** | `verify_evidence` resolves the content OID for LFS-tracked `evidence_hashes` entries (§ 1.4.1). | Every subsequent sub-phase's gate-5 evidence check that cites LFS-tracked `.h5` evidence (every cross-stack port ships 2 capture `.h5`). |

Numbering: highest assigned IC at HEAD is **IC-15** (cross-stack methodology *candidate*, deferred per RD-2D Stack-D D5). "IC-16" exists only as a forward-reference in the RD-2D Stack-D charter. This sub-phase claims **IC-16** for the `verify_evidence` LFS semantics; IC-15 stays reserved for the cross-stack template. Whether to *formalize* IC-16 (vs leave the fix as un-numbered tooling) is folded into D2's 1a close — surface at landing § 3.

---

## § 4. Stage decomposition

### § 4.0 Stage decomposition rationale (D2 surfaced here)

Three-stage cadence per § 1.6. **D2 lean: 1a / 1b two-way decomposition.** Rationale: probe net estimate ~+450–650 (probe § 10) straddles Convention A's +500 single-commit heuristic; the two workstreams are independent with distinct verification surfaces; 1a's GREEN LFS tests are a clean checkpoint before 1b authors the audit report. **NOT 1a/1b/1c** — the conventions/spec amendments are small (~+25–60) and ride with the stage that earns them (Mode-2-RESOLVED with 1a; Mode-3 + § 7.5 with 1b), so a third sub-stage adds boundary overhead without risk reduction. **Monolithic Stage 1** is the alternative if operator prefers fewer commits (the surface IS coherent — both deliverables address audit-chain hash correctness). Probe data (2 phantom drifts, not >20/>30; R-A3 not triggered) keeps either shape tractable.

### § 4.1 Stage 0 — Pre-flight (single session)

- **Task 0.0 — Cross-phase audit replay (8-gate canonical set against `v0.1.0-phase-1`).**
  ```
  uv run python -m integrity.scripts.replay_prior_phase \
    --prior-phase phase-1 \
    --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
    --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
  ```
  Replay target `v0.1.0-phase-1` (only mechanically-resolvable phase-tag anchor at HEAD; resolver regex `^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$` in `tools/integrity/integrity/scripts/replay_prior_phase.py`). Next invocation of bit-identity invariant `9399fc33…909f34`; assert byte-identical. Exit 0 + sha256 match → proceed. Exit 1 OR mismatch → BLOCKED per playbook P20; write `docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-blocked-replay-<UTC>.md`; surface; stop.

- **Task 0.1 — Tolerance-budget carryover.** Edit `tools/testkit/equivalence/tolerance-budget.toml`: set `[phase].phase = "sub-phase-audit-chain-correctness"`, bump `opened_at`. NO `[budgets.*]` widening. Commit: `chore(audit-chain-correctness-stage0-tolerance-budget): sub-phase carryover from sub-phase-reaction-diffusion-2d-stack-d`.

- **Task 0.2 — Re-anchor the probe's empirical findings against HEAD.** Re-verify: (a) `verify_evidence` + `file_at_sha` surface unchanged at HEAD; (b) `.gitattributes` LFS pattern still exactly `captures/**/*.h5` (re-grep — do NOT infer); (c) the LFS pointer stub for the RD-2D Stack-D `.h5` still embeds content OID `2e93a751…`; (d) the 2 phantom drifts (`a7780645…` / `ccd0e4ea…`) still satisfy the trailing-newline signature at HEAD. Record outcomes in the Stage 0 checkpoint. Any divergence → surface (Hard Rule 2).

- **Task 0.3 — Confirm the bounded phantom-sha scope** by re-running the probe's 14-capture survey at HEAD; confirm incidence is still ≤2 (R-A3 not triggered). If incidence > 30 → STOP and surface (D2 decomposition trigger).

- **Closing.** `docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-checkpoint-<UTC>.md` per IC-9. Front-matter: both `head_sha:` AND `head_sha_at_checkpoint:`. Commit: `chore(audit-chain-correctness-stage0-checkpoint): Stage 0 pre-flight complete`. Convention #12 SHA back-fill if closing SHA differs: `chore(audit-chain-correctness-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12`.

### § 4.2 Stage 1a — `verify_evidence` LFS-content-OID fix (single session)

New-files-first / additive-edits per Convention A.

1. **Fix** (deliverable 1). Implement LFS-pointer detection + OID-parse in `verify_evidence` (per § 1.4.1; lean = OID-parse). Structural detection (pointer-sniff and/or `git check-attr filter`), not `.h5`-hardcoded. Preserve non-LFS behavior + mismatch→error (R-A4).
2. **Tests** (deliverable 2). Add LFS-fixture tests to `tools/integrity/tests/test_verify_evidence.py`: LFS-OID match passes; non-LFS regression; corrupt-OID fails; 5 existing GREEN. Run `(cd tools/integrity && uv run --no-sync pytest tests/test_verify_evidence.py -v)`; capture verbatim output + sha256 to `docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-pytest-<UTC>.txt`.
3. **§ B.6 Mode-2-RESOLVED amendment** (deliverable 4, part 1). Additive lines to `docs/conventions/sub-phase-conventions.md` § B.6: Mode 2 RESOLVED at this fix; subsequent landings need no Option-3 annotation. Record the new conventions-doc sha256 in the checkpoint.
4. **Re-verify the fix end-to-end** against a real LFS-tracked audit: run `verify_evidence` against the RD-2D Stack-D landing audit (which cites `captures/reaction-diffusion-2d-stack-d/…h5` content OID `2e93a751…`); confirm it now PASSES where it previously reported the Mode-2 shape-mismatch. Capture output + sha256.
5. **Commit** (sub-bundle, Convention A): `feat(audit-chain-correctness-stage1a): verify_evidence LFS-content-OID fix + tests + §B.6 Mode-2 resolution`. Footer cites: Stage 0 checkpoint sha256; new test pytest sha256; the RD-2D Stack-D re-verify sha256; the new conventions-doc sha256.

**Closing.** `docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-checkpoint-<UTC>.md` per IC-9. Body: deliverable-status table + evidence sha256 + the before/after `verify_evidence` witness on real LFS evidence. Front-matter: both head_sha fields. Commit: `chore(audit-chain-correctness-stage1a-checkpoint): Stage 1a complete`. Convention #12 SHA back-fill.

### § 4.3 Stage 1b — Phantom-sha audit + § B.6 Mode-3 (single session)

1. **Phantom-sha audit report** (deliverable 3). Author `docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-<UTC>.md`: the 14-capture enumeration (recorded vs committed), classification, the 2 confirmed phantom drifts with trailing-newline proofs, the rd-3d-ref Mode-1→phantom re-classification, and the clean bill for MATCH + NO-RECORD. **No corrective amendment to any prior audit** (§ 1.4.2). Use full repo-relative paths in any backtick `path:line` citation (Cat-4 pre-commit hook HARD_FAILs on unresolved targets).
2. **§ B.6 candidate Mode-3 amendment** (deliverable 4, part 2). Additive lines to § B.6 introducing Mode 3 (phantom-sha / pre-commit-hook trailing-newline), distinct from Mode 1 (content evolution) and Mode 2 (LFS pointer); cross-reference the phantom-sha audit report.
3. **Spec § 7.5 / Appendix G.7 clarification** (deliverable 5; D3-conditional). If operator routed D3 in: additive clarification at `docs/architecture.md` § 7.5 + Appendix G.7. Else NO-OP.
4. **Commit:** `docs(audit-chain-correctness-stage1b): portfolio-wide phantom-sha audit + §B.6 Mode-3`. Footer cites the report sha256 + the new conventions-doc sha256.

**Closing.** `docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1b-checkpoint-<UTC>.md` per IC-9. Front-matter: both head_sha fields. Commit: `chore(audit-chain-correctness-stage1b-checkpoint): Stage 1b complete`. Convention #12 SHA back-fill.

### § 4.4 Stage 2 — Landing (single session)

Inherits the Stage-2 step structure from `sub-phase-taichi-integration.md` § 4.3 / `sub-phase-capture-determinism-contract.md` § 4 Stage 2. Deltas:

- **Step 2.1 — Closing-commit anchor re-check** (§ B.2). Re-grep every path / SHA / sha256 across this charter + Stage 0/1a/1b checkpoints + the fix + the phantom-sha report + the § B.6 amendment.
- **Step 2.2 — Cross-package regression sweep — Python-only** (§ B.7 fan-out; this sub-phase ships no TypeScript surface). All 9 Phase-1 sims + Stack-D + tools/integrity + tools/diagnostics + tools/testkit + common-py GREEN. **`tools/integrity` count grows by the new LFS tests** — document the expected delta (not a regression).
- **Step 2.3 — Cat 3 — NO-OP** (no golden table).
- **Step 2.4 — Full integrity sweep (Cat 1/2/3/4/5/X).** Compare to MPM-landing § 7.2 baseline `810cd6e3…23411f98`. **Byte-identity is NOT expected** (this sub-phase adds source + a conventions-doc amendment; the integrity-cats output may shift). Document the delta + why it is legitimate (the 5-in-a-row byte-identical streak from RD-2D Stack-D § 6 breaks here for a benign, expected reason).
- **Step 2.5 — Evidence-path verification.** `verify_evidence --strict` over all new sub-phase audits. **This sub-phase's own landing audit cites LFS `.h5` evidence** (the RD-2D Stack-D captures, as drift exemplars) — so this is the FIRST gate-5 that consumes the fix from deliverable 1 and reports GREEN on LFS content OIDs (no § B.6 Option-3 annotation needed — Mode 2 RESOLVED).
- **Step 2.6 — Gate-13 replay — NO-OP** (no per-sim implementation).
- **Step 2.7 — Append-only check.** CI semantics + strict-mode. Protected sets at Stage 2 close = Phase 0 + Phase 1 + every prior sub-phase landing through RD-2D Stack-D. **The § B.6 conventions-doc amendment is a legitimate additive edit** (NOT a violation) — the conventions doc is not an `_audits/` file and amendments land at Stage 1 per established pattern; document explicitly.
- **Step 2.8 — Mutation gate — NO-OP** (no sim source).
- **Step 2.10 — Convergence-file edits.** CHANGELOG additive (deliverable 7); `docs/dependencies.md` additive IF IC-16 formalized.
- **Step 2.11 — Sub-phase landing audit.** `docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-<UTC>.md` per IC-9. Front-matter `artifact: sub-phase`, `artifact_id: sub-phase-audit-chain-correctness`, both head_sha fields, verdict-state CONFIRMED. `evidence_paths` + `evidence_hashes` enumerate the fix + tests + phantom-sha report + § B.6 amendment + stage checkpoints + sweeps; include ≥1 LFS `.h5` to exercise the fix at gate-5.
- **Step 2.12 — Convention #12 SHA back-fill.** `git rev-parse HEAD` at summary-composition; new commit `chore(audit-chain-correctness-stage2-sha-backfill): back-fill landing audit SHA per Convention #12`. NEVER `--amend`.
- **Step 2.13 — Final summary.** No `-phase-N` tag. Surface: fix landed (every subsequent gate-5 now resolves LFS content OIDs; § B.6 Mode 2 RESOLVED; Option-3 annotation obligation retired); phantom-sha audit baseline established (2 confirmed drifts, both pre-caught; rd-3d-ref re-classified); D1–D6 routings; next-sub-phase recommendation (operator-routable — next cross-stack port, or a banked item).

---

## § 5. Dispatch — operator workflow

Inherited from `sub-phase-taichi-integration.md` § 5 / conventions doc § A.3 verbatim. Identity reads "audit-chain-correctness sub-phase coordinator chat"; the § 7 prompts are the dispatchable units.

**Tag posture.** No `-phase-N` tag. Lean: no intermediate tag. Optional non-phase point-release (e.g., `v0.1.12`, no suffix) is a banked operator decision at Stage 2 close. The agent never pushes any tag (operator-only per spec § 7.12).

---

## § 6. Coordinator prompt

Inherits Phase 1 § 6 / agent-based § 6 / Taichi-integration § 6 verbatim; identity reads "audit-chain-correctness sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + probe-finding re-anchor + bounded-scope confirm | pending | — | — | — |
| 1a | verify_evidence LFS-OID fix + tests + §B.6 Mode-2 resolution + real-LFS re-verify | pending | — | — | — |
| 1b | phantom-sha audit report + §B.6 Mode-3 + (D3) §7.5 clarification | pending | — | — | — |
| 2 | integrity sweep + Python regression sweep + gate-5-via-fix + convergence + landing + SHA back-fill | pending | — | — | — |

(If operator routes D2=monolithic, rows 1a/1b collapse to a single Stage 1 row.)

---

## § 7. Agent prompts

All prompts share these **sub-phase conventions** (inherited from conventions doc + Taichi-integration § 7 standing orders, with substitutions):

- Commit slug `chore` / `feat` / `docs` / `test` + `audit-chain-correctness-stage<N>-<scope>` (non-phase form; no `-phase-N` tag; no point-release tag at Stage 2 — § 11.4).
- Doubled-directory paths: `tools/integrity/integrity/`, `tools/integrity/tests/`.
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` (conventions doc § B.3).
- Convention #8 — never assert from memory; grep- or sha-verify every path / signature / sha256 against the committed artifact at each propagation point (exemplary here — § 1.5). FACT / INFERENCE / SHIFTED tagging.
- Convention A — additive edits to pre-existing files only; new files first. Never edit any audit committed at any prior protected SHA. The phantom-sha audit is a NEW report; it does NOT correct prior audits.
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close (full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed).
- Cat-4 pre-commit hook HARD_FAILs on backtick-fenced `path:line` citations whose target doesn't resolve at HEAD — use full repo-relative paths (`tools/integrity/integrity/scripts/verify_evidence.py:113`, never the bare-filename form `verify_evidence.py` + line).
- `verify_evidence` accepts `sha256:HEX` prefix; use the prefix form in `evidence_hashes:`.
- Operator-only tag-pushing per spec § 7.12; the agent NEVER runs `git tag` / `git push origin <tag>`.
- When stuck → conventions doc § 9 problem-solving playbook + this charter's § 9 R-A1–R-A5.
- Hard Rule 2 — if anything looks structurally wrong (LFS-smudge complexity beyond OID-parse; phantom incidence > 30; spec § 7.5 wording incompatible with the fix), STOP and surface before proceeding.

### § 7.1 Stage 0 — Pre-flight

```
You are the audit-chain-correctness sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/phases/sub-phase-audit-chain-correctness.md (this charter — source of truth). § 7 standing orders apply.
  2. docs/conventions/sub-phase-conventions.md (POST-amendment canonical, sha256 167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e). Verify the sha256 matches at HEAD before relying on it. §B.1 + §B.6 are the substantive surface.
  3. docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-probe-2026-05-23T21-54-02Z.md (the empirical anchor source — verify_evidence surface, LFS pattern, phantom incidence, D1-D6 preview).
  4. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md (§8 N1/N2 + §10 N5a/N5b — this sub-phase's mandate).
  5. docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md §7.3 (first §B.6 Mode-2 surface; the annotation pattern this sub-phase resolves).

Execute Tasks 0.0 → 0.3 → closing per charter § 4.1 exactly. Stage 0 is pre-flight only; you do NOT implement the fix or author the phantom-sha audit (Stage 1a/1b).

  Task 0.0 — replay_prior_phase against phase-1 with the 8-gate canonical set; target v0.1.0-phase-1; assert replay-output sha256 byte-identical to 9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34. Exit 1 OR mismatch → BLOCKED; write stage-0-blocked-replay-<UTC>.md per P20; surface; stop.
  Task 0.1 — tolerance-budget carryover (charter § 4.1 Task 0.1). NO budget widening.
  Task 0.2 — re-anchor probe findings against HEAD (verify_evidence surface; .gitattributes LFS pattern exactly captures/**/*.h5; RD-2D Stack-D .h5 pointer embeds OID 2e93a751…; the 2 phantom shas a7780645…/ccd0e4ea… still satisfy the trailing-newline signature). Re-grep; do NOT infer. Divergence → surface.
  Task 0.3 — re-run the 14-capture phantom survey; confirm incidence ≤2 (R-A3 not triggered). Incidence > 30 → STOP and surface (D2 decomposition trigger).
  Closing — commit stage-0-checkpoint-<UTC>.md per IC-9 (both head_sha fields); chore(audit-chain-correctness-stage0-checkpoint); Convention #12 SHA back-fill. Surface and stop.

Out of scope: any Stage 1 fix/audit work; any edit outside tolerance-budget.toml + new audit files.
Stuck → conventions doc § 9 + charter § 9 (R-A1–R-A5).
```

### § 7.2 Stage 1a — verify_evidence LFS-content-OID fix

```
You are the audit-chain-correctness sub-phase Claude Code agent, Stage 1a (verify_evidence fix) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-audit-chain-correctness.md §§ 1.4.1, 1.4.3, 2 (deliverables 1/2/4), 3, 4.2, 7, 9 (R-A1/R-A4).
  2. docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-checkpoint-<UTC>.md (Stage 0 re-anchor).
  3. tools/integrity/integrity/scripts/verify_evidence.py + tools/integrity/integrity/common/repo.py (the fix surface — read fully).
  4. tools/integrity/tests/test_verify_evidence.py (the 5 existing tests you extend, not redesign).
  5. docs/conventions/sub-phase-conventions.md §B.6 (the amendment surface).

Scope — charter § 4.2 steps 1-5:
  1. Implement LFS-pointer detection + content-OID resolution in verify_evidence (OID-parse lean per § 1.4.1: detect `version https://git-lfs.github.com/spec/v1`, parse `oid sha256:<hex>`, compare to claimed). Structural detection (pointer-sniff and/or git check-attr filter), NOT .h5-hardcoded. Preserve non-LFS hashing + mismatch→error (R-A4).
  2. Add LFS-fixture tests to test_verify_evidence.py (LFS-OID match passes; non-LFS regression; corrupt-OID fails; 5 existing GREEN). Run pytest; capture verbatim output + sha256.
  3. Additive §B.6 Mode-2-RESOLVED amendment to the conventions doc; record new sha256.
  4. End-to-end re-verify: run verify_evidence against the RD-2D Stack-D landing audit; confirm the LFS .h5 (content OID 2e93a751…) now PASSES (previously a §B.6 Mode-2 shape-mismatch). Capture output + sha256.
  5. Commit feat(audit-chain-correctness-stage1a): … (footer cites all sha256s).
  Closing — stage-1a-checkpoint-<UTC>.md per IC-9 (both head_sha fields); chore(audit-chain-correctness-stage1a-checkpoint); Convention #12 SHA back-fill. Stop.

If LFS-smudge surfaces unexpected complexity (auth/network/smudge-on-demand semantics) beyond the OID-parse path → STOP and surface (R-A1; Hard Rule 2). Do NOT relax --strict / mismatch→error behavior (R-A4).
Out of scope: the phantom-sha audit (Stage 1b); convergence files (Stage 2).
Stuck → conventions doc § 9 + charter § 9.
```

### § 7.3 Stage 1b — Phantom-sha audit + § B.6 Mode-3

```
You are the audit-chain-correctness sub-phase Claude Code agent, Stage 1b (phantom-sha audit) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-audit-chain-correctness.md §§ 1.4.2, 1.4.3, 2 (deliverables 3/4/5), 4.3, 7, 9 (R-A2/R-A3).
  2. docs/_audits/phase-2/sub-phase-audit-chain-correctness/{stage-0-checkpoint,stage-1a-checkpoint}-<UTC>.md + plan-drafting-probe-2026-05-23T21-54-02Z.md §§ 5-6 (the empirical survey to expand into the report).
  3. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md §8 N1 + docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md §8 N1 (the 2 phantom drifts).
  4. docs/conventions/sub-phase-conventions.md §B.6 (post-1a Mode-2-RESOLVED state; you add Mode-3).

Scope — charter § 4.3 steps 1-4:
  1. Author phantom-sha-audit-<UTC>.md: 14-capture recorded-vs-committed table, classification (phantom / content-evolution / LFS-pointer / MATCH / no-record), the 2 phantom drifts with trailing-newline proofs, the rd-3d-ref Mode-1→phantom re-classification. NO corrective amendment to any prior audit (Convention A + #12). Full repo-relative paths in any backtick path:line citation (Cat-4 hook).
  2. Additive §B.6 candidate Mode-3 (phantom-sha / pre-commit-hook trailing-newline) amendment; record new sha256.
  3. (D3-conditional) §7.5 / Appendix G.7 clarification at docs/architecture.md — only if operator routed D3 IN; else NO-OP.
  4. Commit docs(audit-chain-correctness-stage1b): … (footer cites report + conventions sha256).
  Closing — stage-1b-checkpoint-<UTC>.md per IC-9; chore(audit-chain-correctness-stage1b-checkpoint); Convention #12 SHA back-fill. Stop.

If the survey surfaces > 30 phantom drifts (vs the 2 expected) → STOP and surface (R-A3; D2 decomposition trigger). If operator floated a corrective-annotation-commit posture for a high-incidence prior audit → that is D5; default is NO additive annotation to prior audits (the report suffices). Surface, do not assume.
Out of scope: verify_evidence code (Stage 1a, done); convergence files (Stage 2).
Stuck → conventions doc § 9 + charter § 9.
```

### § 7.4 Stage 2 — Landing

```
You are the audit-chain-correctness sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/phases/sub-phase-audit-chain-correctness.md §§ 4.4, 7, 11 (coherence + D1-D6 routings).
  2. docs/_audits/phase-2/sub-phase-audit-chain-correctness/{stage-0,stage-1a,stage-1b}-checkpoint-<UTC>.md + phantom-sha-audit-<UTC>.md.
  3. docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md (parent landing; §6 byte-identical streak — expect it to break benignly here).
  4. docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md (landing-audit body template).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A); read first, append.

Execute Steps 2.1-2.13 per charter § 4.4. Load-bearing:
  Step 2.4 — full integrity sweep; byte-identity NOT expected (source + conventions amendment shifted it); document the benign delta vs 810cd6e3…23411f98.
  Step 2.5 — verify_evidence --strict over new audits; this landing cites LFS .h5 evidence → FIRST gate-5 to consume the Stage-1a fix; confirm GREEN on content OIDs (no §B.6 Option-3 annotation).
  Step 2.7 — append-only check; the §B.6 conventions amendment is a legitimate additive edit, NOT a violation; document.
  Step 2.10 — CHANGELOG additive; docs/dependencies.md additive IF IC-16 formalized.
  Step 2.11 — landing-<UTC>.md per IC-9 (artifact: sub-phase; both head_sha fields; verdict-state CONFIRMED; evidence_paths/hashes include ≥1 LFS .h5).
  Step 2.12 — Convention #12 SHA back-fill (git rev-parse HEAD at summary-composition; NEVER --amend).
  Step 2.13 — final summary; NO -phase-N tag; surface D1-D6 + next-sub-phase recommendation.

Stuck → conventions doc § 9 + charter § 9. On any structurally-wrong finding, STOP and SURFACE (Hard Rule 2).
```

---

## § 8. Checkpoint and continuation discipline

Inherits conventions doc § A.2 + § B.2 verbatim. Paths:
- Stage 0 / 1a / 1b checkpoints: `docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-<N>-checkpoint-<UTC>.md`.
- Phantom-sha audit report: `docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-<UTC>.md` (Stage 1b deliverable; NOT a checkpoint).
- Stage 2: the sub-phase landing audit itself (no separate checkpoint).
- Continuation prompt with `audit-chain-correctness-stage<N>-…` slug.

**Convention #12 SHA back-fill at EVERY stage close** per § B.2 tightened-discipline. Full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed. (This plan-drafting close itself applies it: probe + landing audit committed with placeholder `head_sha:`, back-filled in a separate `chore(audit-chain-correctness-plan-drafting-sha-backfill)` commit.)

---

## § 9. Risk surface + problem-solving playbook

Inherits conventions doc § 9 playbook entries P1–P26 verbatim (Taichi-integration § 9.1 added a charter-local P27; not load-bearing here). **NEW R-class entries SPECIFIC to this sub-phase:**

- **R-A1 — `verify_evidence` LFS-resolution complexity.** A `git lfs smudge` path may require LFS auth / network / smudge-on-demand semantics that differ from smudge-on-checkout, and may not work in a CI environment. **Mitigation (lean):** the OID-parse design (§ 1.4.1) reads the content OID directly from the pointer stub — no smudge, no network, no auth — and is sound because the audit-recorded value IS the content OID per § B.1. The smudge path is an optional belt-and-suspenders fallback guarded by git-lfs availability. If Stage 1a finds OID-parse insufficient (e.g., a recorded value that is NOT the OID), STOP and surface before proceeding.
- **R-A2 — phantom-sha audit append-only constraint.** Convention #12 forbids `--amend`; Convention A forbids non-additive edits to prior audits. The audit documents drifts in a NEW report; it does NOT correct prior audits in place. Both phantom landings already record the correct value, so no LANDING is wrong; the phantoms live in immutable checkpoints. If operator routes a corrective-annotation-commit posture for some prior audit (additive follow-up, NOT `--amend`), that is **D5** — surface; default is NO.
- **R-A3 — bounded discovery surface for the phantom-sha audit.** Scope depends on hook-activation date + affected-capture count. Probe established **exactly 2** confirmed drifts (≤ the >20/>30 trigger). If Stage 0 Task 0.3 or Stage 1b surfaces > 30 drifts, that is a Stage-1 decomposition trigger (D2) — STOP and surface.
- **R-A4 — `verify_evidence` `--strict` interaction + mismatch→error preservation.** The `--strict` flag is a **latent no-op** at HEAD (parsed at `tools/integrity/integrity/scripts/verify_evidence.py:128-135`, never read). The fix must NOT (a) inadvertently relax the mismatch→error behavior on legitimate non-LFS mismatches, nor (b) wire `--strict` to its documented semantics as a side-effect (that re-wiring is banked unless operator routes it in). Tests cover the negative path (corrupt-OID fails).
- **R-A5 — banked Stage-0 R-P1 scope-expansion (cross-stack ports) does NOT apply here.** RD-2D Stack-D banked a methodology-precedent that subsequent cross-stack Stage 0 R-P1 expects end-to-end harness invocation (not just parser perf). THIS sub-phase invokes no harness, so R-A5 is documented for completeness only and is not load-bearing.

---

## § 10. Audit-trail discipline

Inherits conventions doc § B verbatim. Sub-phase audits live under `docs/_audits/phase-2/sub-phase-audit-chain-correctness/`.

Convention #12 SHA back-fill at EVERY stage close per § B.2 tightened-discipline — including this plan-drafting close.

Audit front-matter `artifact:` enum:
- Plan-drafting probe: `artifact: stage` (`artifact_id: audit-chain-correctness-plan-drafting-probe`).
- Plan-drafting landing: `artifact: stage` (`artifact_id: audit-chain-correctness-plan-drafting-landing`).
- Stage 0 / 1a / 1b checkpoints: `artifact: stage`.
- Phantom-sha audit report: `artifact: task` (`artifact_id: audit-chain-correctness-phantom-sha-audit`).
- Stage 2 landing audit: `artifact: sub-phase` (`artifact_id: sub-phase-audit-chain-correctness`).

Append-only check at Stage 2 Step 2.7 forbids edits to any file present at any prior protected SHA. The § B.6 conventions-doc amendment is a legitimate additive edit (conventions doc is not under `_audits/`); document explicitly.

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

(Verified by Stage 0 Task 0.0 replay + Task 0.2 re-anchor.)

- 120 shifts entering (RD-2D Stack-D § 8 close); 122 at plan-drafting close (S1 / S2).
- Bit-identity invariant `9399fc33…909f34` (19+ invocations).
- Conventions doc byte-stable at `167fe349…f2c58c2e`.
- `verify_evidence` LFS-blindness + the single LFS pattern + the bounded ≤2 phantom incidence fully characterized at plan-drafting (probe §§ 2–6).
- § B.6 Mode-2 annotated across 5 landing audits (probe § 7) — the recurring burden this sub-phase retires.

### § 11.2 Banked items disposition (D5/D6 surfaced here)

| Item | Disposition | Rationale |
|---|---|---|
| §B.6 Option 1 — `verify_evidence` LFS fix (RD-2D Stack-D N5a) | **CONSUMED — this sub-phase** (deliverables 1/2/4). Supersedes the Taichi-integration-era "evidence_paths LFS remediation" banked item (note the supersession). | The N5a mandate. |
| Portfolio-wide capture-`.json` phantom-sha audit (RD-2D Stack-D N5b) | **CONSUMED — this sub-phase** (deliverable 3). | The N5b mandate. |
| LBM/MPM `sim_runner_diagnostic` seed-propagation defect | **STAYS BANKED (D6 — confirm DEFER).** | Per-sim test-infra of different shape; bundling adds template-shape confusion for marginal savings; folds into the next per-sim LBM/MPM sub-phase. Probe surfaced NO adjacency to audit-chain hash correctness. |
| IC-15 spec-template formalization | **DEFERS to second cross-stack pair** | Per RD-2D Stack-D D5. |
| Cross-stack methodology full-consolidation | **DEFERS to second cross-stack pair** | Per RD-2D Stack-D D5. |
| Testing-improvements; mid-Phase-1 capture regeneration | **DEFER (unchanged)** | Separate routing; not audit-chain-shaped. |

**Disposition surfaced for operator routing at landing-audit close.**

### § 11.3 Outputs (this sub-phase → subsequent)

- **`verify_evidence` LFS-content-OID fix becomes baseline tooling** consumed by every subsequent sub-phase's gate-5 evidence check (IC-16). Every cross-stack port ships 2 capture `.h5`; their gate-5 now reports GREEN on content OIDs with no annotation.
- **§ B.6 Mode-2 RESOLVED** propagates to subsequent landings: no more Option-3 annotation obligation. Candidate **Mode-3** (phantom-sha) classification available for any future trailing-newline drift.
- **Phantom-sha audit baseline established:** the portfolio's capture-`.json` identity is verified (2 confirmed drifts, both pre-caught, both in sealed checkpoints; rd-3d-ref re-classified); subsequent sub-phases inherit a clean, surveyed baseline.
- **Coordinator-side Convention #8 exemplified** (RD-2D Stack-D N4 banked precedent): re-verify text-artifact shas against the committed blob at each propagation point — the discipline gap that motivated this sub-phase, now closed in tooling.

### § 11.4 Replay-chain non-participation + tag posture

Inherits conventions doc § D.4 verbatim. This sub-phase does NOT participate in the cross-phase replay chain; the next spec-phase pre-flight replays against `v0.2.0-phase-2` once that tag lands — NOT against any spec-Phase-2 sub-phase tag. The resolver regex mechanically enforces this.

**Tag-posture decision banked for operator at Stage 2 close:**
- **Lean: no intermediate tag.** Sub-phase commits + the landing audit + per-deliverable commits provide the audit trail.
- **Alternative:** non-phase point-release tag (e.g., `v0.1.12`, no `-phase-N` suffix). Acceptable per spec § 7.12; operator-pushed.
- **Forbidden either way:** any tag carrying `-phase-N` (reserved for spec-phase boundaries; `v0.2.0-phase-2` is next).

### § 11.5 Six operator routings surfaced at charter close

(See plan-drafting landing audit § 5 for full surface + downstream implications; this charter does NOT pre-commit.)

- **D1** — Canonical sub-phase name. Lean: `sub-phase-audit-chain-correctness` (adopted provisionally for paths/slugs). Alternatives: `sub-phase-evidence-hash-correctness` (narrower); `sub-phase-verify-evidence-lfs-fix-and-audit` (verbose).
- **D2** — Stage 1 monolithic vs 1a/1b. Lean: 1a/1b (§ 4.0).
- **D3** — Spec § 7.5 / Appendix G.7 amendment. Lean: optional additive clarification (spec silent, not incompatible).
- **D4** — CI gate redesign. Lean: NO (verify_evidence not invoked in CI).
- **D5** — Corrective-annotation-commit posture for high-incidence prior audits. Lean: NO (the report suffices; prior audits append-only by design).
- **D6** — LBM/MPM `sim_runner_diagnostic` defect. Lean: confirm DEFER (STAYS BANKED).

**If operator routes alternatives to D1:** charter file path + audit dir + commit slug require mechanical rename BEFORE Stage 0 dispatch. **If operator routes alternatives to D2–D6:** the affected § 4 / § 7 prompts adjust accordingly.

---

*End of audit-chain-correctness sub-phase charter. Inherits the conventions doc + Phase 1's role model, audit/append-only discipline, conventions, IC contracts, and problem-solving playbook wholesale; adopts the focused-infrastructure template from `sub-phase-taichi-integration` and the portfolio-wide amendment-pattern from `sub-phase-capture-determinism-contract`; adds the verify_evidence LFS-content-OID semantics design (§ 1.4.1), the phantom-sha audit methodology + non-corrective framing (§ 1.4.2), the § B.6 Mode-2 portfolio-scale resolution + candidate Mode-3 (§ 1.4.3), and R-class entries R-A1–R-A5 (§ 9) as the deltas required by audit-chain hash-correctness work. Establishes IC-16 (verify_evidence LFS-content-OID verification semantics) as the new baseline tooling every subsequent sub-phase's gate-5 inherits.*

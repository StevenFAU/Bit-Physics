---
date: 2026-05-24T14-22-36Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: stage
artifact_id: ci-action-migration-and-banked-cleanup-plan-drafting-landing
subject: "Plan-drafting landing for the spec-Phase-2 focused-infrastructure sub-phase (S-CI2 primary driver + banked bundle). Probe + charter committed (c3fa95c / b7741a1). Believed-state RATIFIED-with-four-shifts: repo anchors all FACT (HEAD d6e0671, 18 members, cumulative 146, conventions 69aa39fc / architecture e82b7b8e / methodology 8c760383 / .gitattributes 2 LFS rules / python-strict lfs:true at b027f60); S-CI2 SHIFTED (S1 date 2026-06-16 not believed 06-02; S2 soft default-switch not hard break; S3 +2 under-enumerated node20 actions setup-node@v4 + pnpm/action-setup@v4); LBM sim_runner_diagnostic CONFIRMED-banked (cosmetic, analytic ICs, D7); testing-improvements FACT-enumerated (S4 provenance shift); mid-Phase-1 capture regen DEFERRED (content-equivalent → no breakage). Hard Rule 2 NOT triggered (S-CI2 unresolved at HEAD). Closing-anchor re-check GREEN across probe + charter citations. Cumulative 146 + 4 plan-drafting shifts = 150. D1-D9 surfaced. SHA placeholders pending back-fill (Convention #12 + N1 enumeration). No -phase-N tag."
verdict-state: CONFIRMED
head_sha: a0afe827b90f489f91980e8a98fd2bc16ab33f1f
head_sha_at_checkpoint: a0afe827b90f489f91980e8a98fd2bc16ab33f1f
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/landing-2026-05-24T13-45-00Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/plan-drafting-probe-2026-05-24T14-22-36Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/plan-drafting-probe-2026-05-24T14-22-36Z.md
  - docs/phases/sub-phase-ci-action-migration-and-banked-cleanup.md
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
  - docs/conventions/cross-stack-equivalence-methodology.md
  - .github/workflows/python-strict.yml
  - .github/workflows/ts-strict.yml
  - .github/workflows/audit-append-only.yml
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45
  docs/architecture.md: sha256:e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267
  docs/conventions/cross-stack-equivalence-methodology.md: sha256:8c760383bf5626c84ead49ee3b7e2ad9bbac17e09eeed055b4913fc5783c0d8f
---

# Plan-Drafting Landing Audit — Sub-Phase CI-Action-Migration-and-Banked-Cleanup

> **Back-fill-induced sha-drift note (read first; audit-chain-correctness § 9 N2 banked precedent).**
> The plan-drafting probe + charter (and this landing audit) carry placeholder `head_sha:` values that
> are back-filled in the FINAL plan-drafting commit (Convention #12 + N1 enumeration). The back-fill
> EDITS their blobs, so their sha256s change post-back-fill. This landing audit therefore records
> `evidence_hashes` ONLY for the **stable doc anchors** (conventions / architecture / methodology —
> not touched by the back-fill) and lists the probe + charter under `evidence_paths` (existence-check)
> WITHOUT a hash. Per the N2 precedent: cite the post-back-fill HEAD sha (verify, don't transcribe) if
> a downstream artifact needs the probe/charter hash.

## § 1. Scope

This audit lands the **plan-drafting** stage of a spec-Phase-2 **focused-infrastructure** sub-phase whose
PRIMARY, time-pressured driver is **S-CI2** (GitHub Actions Node-20 deprecation), bundling banked
testing-improvements + an optional LBM cosmetic fold-in. Deliverables: the plan-drafting probe
(`c3fa95c`) + the charter (`b7741a1`). This audit re-checks every closing anchor, records the
believed-state verdicts, enumerates D1–D9, and recounts shifts. **No implementation work** — plan-drafting
ends at the SHA back-fill (COMMIT 4); the operator routes Stage 0 separately.

## § 2. Believed-state verdict table (one row per dispatch SECTION-4 item)

(FACT — carried from probe § 3; re-verified at this landing per § 3 closing-anchor re-check.)

### § 2.1 Repo anchors

| # | Believed-state | Verdict | HEAD evidence |
|---|---|---|---|
| 1 | HEAD `d6e0671` on `main` | **CONFIRMED** | `git rev-parse` = `d6e0671f…` (charter/probe added atop) |
| 2 | 18 workspace members | **CONFIRMED** | `pyproject.toml` `[tool.uv.workspace].members` = 18 |
| 3 | Cumulative shifts 146 | **CONFIRMED** | MPM Stack-D landing § 9 |
| 4 | Bit-identity invariant `9399fc33…18909f34` (23+) | **DEFERRED** (Stage-0 Task-0.0 action, not plan-drafting) | conventions § D.3 |
| 5 | Integrity baseline `c19492ad…` | **CONFIRMED** | MPM Stack-D landing § 6 |
| 6 | conventions `~69aa39fc…4602bf45` | **CONFIRMED** | `69aa39fc…4602bf45` |
| 7 | architecture `~e82b7b8e…9292d267` | **CONFIRMED** | `e82b7b8e…9292d267` |
| 8 | methodology `~8c760383…` | **CONFIRMED** | `8c760383…0d8f` |
| 9 | `.gitattributes` 2 LFS rules | **CONFIRMED** | `.gitattributes:38` + `.gitattributes:45` |
| 10 | `python-strict.yml` `lfs: true` at `b027f60` | **CONFIRMED** | `.github/workflows/python-strict.yml:16`; `git log` `b027f60` |

### § 2.2 Banked items (SECTION-4 items 1–5)

| Item | Verdict | HEAD evidence |
|---|---|---|
| **1 — S-CI2** | **SHIFTED** (S1+S2+S3) | 9 workflows + checkout@v4 + setup-uv@v6 CONFIRMED; date **2026-06-16** not 06-02 (S1); soft default-switch with opt-out, not hard break (S2); **+2 under-enumerated** node20 actions `actions/setup-node@v4` + `pnpm/action-setup@v4` in `ts-strict.yml` (S3). All four `runs.using: node20`. (probe § 6) |
| **2 — LBM `sim_runner_diagnostic`** | **CONFIRMED-banked** (D7 STAYS BANKED) | `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py:472` cosmetic (analytic Poiseuille ICs; descriptor hardcoded); MPM-side already CLOSED-AS-NOT-A-DEFECT (MPM Stack-D § 12). |
| **3 — Taichi testing-improvements** | **CONFIRMED** (fully enumerated; S4 provenance shift) | taichi-integration § 9 row 1: pytest-timeout + `sim.py` manifest-builder + gate-6 advisory + Cat-3 evaluator shims; conventions § J.3 / § J.7 / § L.3. Provenance = numba-integration/Phase-1, ratified at taichi D2 (S4). |
| **4 — Mid-Phase-1 capture regeneration** | **DEFERRED** (lean STAY-BANKED) | content-equivalent contract (spec § 2.5) → pre-contract captures still pass; no invariant broken; not-needed (D7). |
| **5 — Full banked sweep** | **CONFIRMED** (swept; probe § 4) | `grep -ril BANKED` over all phase-1 + phase-2 landings; no surprise blocker; extras dispositioned (D8/D9). |

**No item REFUTED on a load-bearing dimension; Hard Rule 2 NOT triggered.** S-CI2 is real + unresolved at
HEAD (all four node20 actions present); every banked item exists as described (modulo S1–S4).

## § 3. Closing-anchor re-check (Step — every citation in probe + charter)

(FACT — `sha256sum` / `grep` at HEAD `b7741a1`, post-probe + post-charter; Convention F + § 7.9.)

| Anchor / citation | Probe/charter claim | HEAD re-check | Status |
|---|---|---|---|
| conventions doc sha256 | `69aa39fc…4602bf45` | `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` | **MATCH** |
| architecture sha256 | `e82b7b8e…9292d267` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **MATCH** |
| methodology sha256 | `8c760383…0d8f` | `8c760383bf5626c84ead49ee3b7e2ad9bbac17e09eeed055b4913fc5783c0d8f` | **MATCH** |
| action inventory | checkout@v4 ×9 / setup-uv@v6 ×6 / setup-node@v4 ×1 / pnpm@v4 ×1 | `grep` of `.github/workflows/` = identical counts | **MATCH** |
| `with: lfs: true` | `.github/workflows/python-strict.yml:16` | present at line 16 | **MATCH** |
| `with: fetch-depth: 0` | `.github/workflows/audit-append-only.yml` (uses at :24) | `fetch-depth: 0` at line 26 (uses at 24, with at 25) | **MATCH** |
| `with: version: 10` | `.github/workflows/ts-strict.yml:18` (pnpm) | `version: 10` at line 20 (uses at 18) | **MATCH** |
| `with: node-version: 22` etc. | `.github/workflows/ts-strict.yml:23` (setup-node) | `node-version: 22` at line 25 (uses at 23) | **MATCH** |
| `.gitattributes` LFS rules | lines 38 + 45 | both present | **MATCH** |
| LBM `sim_runner_diagnostic` | `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py:472` | `def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:` at 472 | **MATCH** |

**No anchor drift.** All probe + charter citations resolve at HEAD. (Workflows are untouched by the
plan-drafting commits — only `docs/` files added.)

## § 4. Cat-4 citation hygiene

(FACT — pre-commit `cat4-path-line-assertions` hook outcome.) The probe's first commit attempt HARD_FAILed
on 8 bare-filename / false-positive `word:number` inline citations; all were corrected to full
repo-relative paths (`.github/workflows/<file>:<line>`) + de-backticked non-citations (`fetch-depth: 0`,
`version: 10`) before the probe committed GREEN (`c3fa95c`). The charter's one illustrative bare-filename
backtick was likewise rephrased before committing GREEN (`b7741a1`). **Banked precedent (this sub-phase):
workflow-file citations in audits MUST use the `.github/workflows/<file>:<line>` full form**; this is added
to the charter § 6 reminders + § 10 checklist.

## § 5. D-class enumeration (for operator routing)

(Carried from probe § 8 / charter § 9; this audit does NOT pre-commit.)

- **D1** — Canonical name. Lean: `sub-phase-ci-action-migration-and-banked-cleanup` (A). Alts: `…-ci-node-runtime-migration` (B); `…-focused-infra-ci-and-testing` (C).
- **D2** — Stage decomposition. Lean: three-stage, Stage-1a (S-CI2) / 1b (testing-improvements). Alt: single-stage hotfix (S-CI2-only).
- **D3** — S-CI2 target majors. Lean: checkout→v5/v6, setup-uv→latest-node24 (v8 at probe fetch-time), setup-node→v5/v6, pnpm→v6. Re-verify `runs.using: node24` at edit time (R-CI2).
- **D4** — Preservation set. No optionality: `lfs: true` + `fetch-depth: 0` + setup-node inputs + pnpm `version`.
- **D5** — Opt-out env var as the fix? Lean: NO (migrate versions; opt-out only defers to fall-2026 removal).
- **D6** — Testing-improvements subset + LBM fold-in. Lean: pytest-timeout + `sim.py` manifest-equality test; LBM cosmetic STAY-BANKED unless co-located. Alt: full augmentation.
- **D7** — Mid-Phase-1 capture regeneration. Lean: STAY-BANKED.
- **D8** — Surprise / audit-infra banked items. Lean: STAY-BANKED (orthogonal).
- **D9** — Optional non-phase point-release tag. Lean: NO tag.

## § 6. Shift count

**Inherited: 146** (MPM Stack-D § 9 close). **Plan-drafting added 4** (S1–S4; § 7). **Cumulative at
plan-drafting close: 146 + 4 = 150** entering Stage 0.

## § 7. Plan-drafting shifts (S1–S4)

| ID | Description |
|---|---|
| **S1** | Believed-state deprecation date `2026-06-02` **REFUTED**; canonical GitHub Changelog (web-fetched probe § 6.1) = Node-24 default **2026-06-16**, removal fall 2026. Coordinator-side Convention #8. |
| **S2** | Failure-mode SHIFTED: soft default-runtime switch with `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` opt-out until fall-2026 removal — not a hard same-day break. Time-pressure real (live warnings; ~23-day default switch) but not a 9-day emergency. |
| **S3** | S-CI2 affected-action set UNDER-ENUMERATED: HEAD has 4 node20 actions (adds `actions/setup-node@v4` + `pnpm/action-setup@v4` in `ts-strict.yml`); all 9 workflows touched. |
| **S4** | Testing-improvements provenance SHIFTED: DEFER items ratified at taichi-integration D2 but originating at numba-integration / Phase-1 B17 banking. Non-load-bearing; audit-chain accuracy only. |

## § 8. Verdict

**CONFIRMED** (believed-state RATIFIED-with-four-shifts S1–S4; not BLOCKED; Hard Rule 2 not triggered).
Plan-drafting deliverables (probe `c3fa95c` + charter `b7741a1`) GREEN; closing-anchor re-check GREEN;
D1–D9 surfaced for operator routing. The SHA back-fill (Convention #12 + N1 enumeration) is the FINAL
plan-drafting commit, enumerating EVERY placeholder-bearing audit (probe + charter + this landing). No
`-phase-N` tag.

---

This audit lands at HEAD `a0afe827b90f489f91980e8a98fd2bc16ab33f1f` (back-filled per Convention #12 + § B.2 + N1 enumeration
in a separate `chore(ci-action-migration-and-banked-cleanup-plan-drafting-sha-backfill)` commit; full
40-hex via `git rev-parse HEAD` at summary-composition time).

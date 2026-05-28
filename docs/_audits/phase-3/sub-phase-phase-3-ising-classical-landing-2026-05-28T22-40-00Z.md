---
date: 2026-05-28T22-40-00Z
author: phase-3 ising-classical landing (Claude Code)
subject: Phase 3 ising-classical (task-3a) — SUB-PHASE LANDING audit (closing sweep + stage roll-up; NO TAG per D-TAG NO)
verdict: closed-with-shifted-2
head_sha: 4b71991dfd53c01e7f9cfe0c4083437339d62922
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-WEBGPU-DET MEASURED-bit-exact / D-WIDE-TOL off-budget / D-PBT pass / D-ANCHOR 6-anchors / D-DET-REGISTRY first-lattice-spin-row / D-HARNESS-LAYOUT pytest-against-captures / D-CI python-strict.yml/test-ising-classical / D-LAYOUT packages/ising-classical/ / D-TOL-SCHEMA golden_tolerance-branch-on-evidence / D-MUT-SCOPE NO / D-TAG NO
evidence_paths:
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-0-2026-05-28T21-40-00Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-1a-2026-05-28T21-55-00Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-1b-2026-05-28T22-15-00Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-1c-2026-05-28T22-30-00Z.md
  - docs/phases/sub-phase-phase-3-ising-classical.md
  - packages/ising-classical/ising_classical/reference/ising_numpy.py
  - captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.json
evidence_hashes:
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-0-2026-05-28T21-40-00Z.md: sha256:f37c1f2b44d1b40038a3f257a36ea3c5ac2c1d52764b755c7c3538f081351722
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-1a-2026-05-28T21-55-00Z.md: sha256:7d0227ff6943f48bfcf3aabef9559c7ee66168eef9892c84c3c1e75d1dfcfe05
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-1b-2026-05-28T22-15-00Z.md: sha256:a06059ea76a6ef205c7e54a557116a3240eefd187f3ecb8fc3e61c69bcf7be21
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-stage-1c-2026-05-28T22-30-00Z.md: sha256:f7d298f925437a5b6e9c44d9966b2a0eab7603498b2ef7cb706da9c14ebe17ae
  docs/phases/sub-phase-phase-3-ising-classical.md: sha256:1180cb003dc7fc9c3f25b5bd430f51ffec28cdf0e19bccfad64a902bd054405b
  packages/ising-classical/ising_classical/reference/ising_numpy.py: sha256:f7728b27c1c8bad9de46f6a7e0f0cf53dbdc5ca149cd88ebb2dec3cfcb5c7686
  captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.json: sha256:863963efe4e2f001fe5bf4c582b9b7b0a6e5e15852276cf98ab372f9637f1e58
---

# Phase 3 — sub-phase Ising-classical (task-3a) — LANDING audit

> Consolidated sub-phase landing (closing sweep + stage roll-up).
> **Verdict closed-with-shifted-2** per §2.15. **NO TAG** (D-TAG NO;
> per-sub-phase tagging discontinued — phase-close-only cadence). **NO
> I7 allowlist extension.** Does NOT re-narrate the stage audits;
> consolidates them via `evidence_hashes`.

## § 1 — Stage roll-up

| Stage | HEAD | Verdict |
|---|---|---|
| Stage 0 (pre-flight + §Q + replay) | `46e8857` | CONFIRMED |
| Stage 1a (scaffold + RED + failing-tests-hash) | `a4d9607` | CONFIRMED |
| Stage 1b (impl + golden + tier-3 + determinism + PBT + .h5 + perf + tolerance + CI + 13-gate) | `d60fe3c` | CONFIRMED |
| Stage 1c (verdict landing, NO mutation) | `af209e5` | CONFIRMED |
| Stage 2 (closing sweep + landing) | `4b71991`→ this | closed-with-shifted-2 |

## § 2 — Closing sweep (FACT)

- **failing-tests replay spot-check:** committed evidence sha256
  `572c9e4e…3683` == Stage-1a footer. MATCH.
- **verify_evidence (--strict)** on all four ising stage audits:
  Stage-0 16/0, Stage-1a 18/0, Stage-1b 32/0, Stage-1c 12/0 — **0
  fail across all** (§S6 real-hash discipline; L-ISING-AUDIT-HYGIENE
  remediation rule held for every audit this session authored — the
  three sealed session-1 audits were NOT touched).
- **append-only:** 0 M/D in `docs/_audits/**` vs `v0.2.0-phase-2` AND
  `v0.2.4-sub-phase-phase-3-lenia` (only the sanctioned in-Phase-3
  `progress.md` append). R-1 HELD.
- **closing anchor re-check (Convention 7.9):** 6 golden anchors +
  descriptor lock re-assert (3/3 pytest).
- **I7 guard:** `tools/testkit/lfs_migration/test_i7_no_agent_tags.py`
  UNCHANGED vs lenia tag (no allowlist edit — D-TAG NO; STOP-I7 removed
  in charter-v2).
- **integrity Cat 1-5** at HEAD: 0 HARD_FAIL / 14 SOFT_WARN; live
  digest `688bc195…de127ff`.
- **Cat-X tolerance-budget:** off-budget (no `[budgets.lattice-spin.*]`
  cap; STOP-CAT-X not fired).

## § 3 — D-class final dispositions

| D-class | Final |
|---|---|
| D-WEBGPU-DET | MEASURED bit-exact same-stack-same-hw (Layer-1 NumPy oracle); Layer-2 WGSL local-only (D-DET-RUNTIME, no GPU in CI — RD-2D precedent) |
| D-WIDE-TOL | off-budget (no cap exists; L-LTSF-3 lenia precedent) — no amendment |
| D-PBT | `magnetization_bounded` + `energy_per_spin_bounded` PASS (charter-declared, mathematically pristine — no lenia-style falsification) |
| D-ANCHOR | 6 anchors grounded (Onsager / Kramers-Wannier / Landau-Binder; Yang / Baxter / Newman-Barkema) — all closed-form / textbook |
| D-DET-REGISTRY | first `[lattice-spin.ising-classical]` row locked |
| D-HARNESS-LAYOUT | pytest-against-captures (charter-v2) |
| D-CI | `python-strict.yml/test-ising-classical` job (green in CI) |
| D-LAYOUT | `packages/ising-classical/` (existing-convention) |
| **D-TOL-SCHEMA** | **SHIFTED-on-evidence:** lean was additive-keys-under-`[overrides.ising-classical]`; the `overrides` schema is `additionalProperties:false` and REJECTS the named keys → resolved to the existing `[golden_tolerance.lattice-spin.ising-classical]` branch (lenia precedent; single-stack). STOP-S NOT fired (no new branch). |
| D-MUT-SCOPE | NO (mutmut not run) |
| D-TAG | NO (no tag; no I7 allowlist edit) |

## § 4 — SHIFT register (closed-with-shifted-2)

- **SHIFT-1 (D-TOL-SCHEMA).** Charter lean (additive named keys under
  `[overrides.ising-classical]`) falsified by the schema validator
  (`additionalProperties:false`); re-routed to the `golden_tolerance`
  branch on-evidence (lenia-tolerance-schema-fix precedent). NOT a new
  branch → STOP-S not fired. Bank-aligned with lenia.
- **SHIFT-2 (physics, §0.3).** Spontaneous magnetization is the
  ordered-phase order parameter: it is reproduced by `onsager_magnetization`
  exactly and by an **aligned-IC** MC run within `magnetization_rel=5e-2`
  (rel-err <5e-4 at T∈{1,1.5,2}); a **random-IC** MC run forms domains
  with |m|≈0.39 ≠ Yang 0.986. The MC-vs-Yang cross-check uses the
  aligned-IC protocol (documented in `tools/testkit/golden/derivations/ising-onsager.md`
  §4). No fabrication / no widening (the anti-pattern would have been
  to relax to a random-IC window) — charter §4 anticipated this and
  the resolution is cleaner than its fallback.
- **Minor §0.3 note (not a counted shift).** The §6.3a perf-row stack
  label "typescript (WebGPU)" is recorded as `numpy-reference` (the
  committed canonical capture's actual producer + CI oracle; WGSL is
  local-only/unmeasured per spec §7.8) — mirrors RD-2D's perf-row.

## § 5 — First-Stack-B-SIM pipeline verdict (load-bearing)

**VALIDATED end-to-end.** The WebGPU/pytest-against-captures pipeline
accommodated the first Stack-B SIM with **no destructive shared-infra
change** (STOP-FRICTION not fired). The full chain — package scaffold,
NumPy-reference oracle, committed canonical capture (LFS + R2),
pytest-against-captures, golden tables, Tier-3 subtree, PBT module,
determinism registry, tolerance branch, `python-strict/test-ising-classical`
CI job with R2-routed selective LFS pull — is **green in CI at
`d60fe3c`** (10/10 workflows; `test-ising-classical` job success). This
is a STRONGER validation than lenia: ising's CI job is the **first
per-sim job that reads a committed LFS capture** (lenia instantiates
in-process), so it exercised the R2/GitHub-LFS pull path that every
later Stack-B SIM (task-6 NCA Stack-B half; Phase-5 web-deploy lift of
every Phase-3 sim) inherits.

**Friction banked for later Stack-B / all sims:**
1. **L-R2CD-FOLLOWUP RESOLVED (FRICTION #4, load-bearing).** The §Q R2
   bootstrap must be re-`source`d **in the same shell command** as each
   LFS push — a fresh shell (CI step / agent tool-call) does NOT inherit
   the creds env from a prior `source`. This is the actual root cause of
   the recurring "R2 EOF" surfaced at common-3dgs + lenia Stage-1c (it
   was mis-read as an env/durability regression of
   [[phase-3-r2-credentials-durability-fix-landed]]; it is a per-shell
   sourcing requirement). The GitHub push uses
   `git -c lfs.standalonetransferagent= push`; the R2 mirror sync uses
   `source tools/lfs/setup-lfs-s3-local.sh && git lfs push --object-id
   --stdin origin`. Both succeeded this session — STOP-LFS NOT fired.
2. **RUF002 ambiguous unicode** — keep `×`→`x` (and avoid confusables)
   in Python docstrings (ruff RUF002).
3. **failing-tests evidence hash** — compute sha256 from the
   **post-pre-commit-hook-normalized** file (trailing-ws/eof).
4. **pytest dev extras** — `uv sync --all-packages --all-extras`.

## § 6 — Banks carried / consumed

| Bank | Disposition |
|---|---|
| L-3DGS-1 | NOT IN SCOPE (not neural-rendered) — carried |
| SIBLING-FIXTURE-LFS | CARRIED — ising's `.h5` increments the corpus +1 (does NOT close the 12-fixture sibling) |
| integrity-meta-test-ci-wiring | CARRIED — ising rides existing pytest-testpaths; does not inherit the gap |
| R-11 (lenia first-SIM frictions) | TRANSLATED-to-Stack-B + consumed; D-DET-RUNTIME (CI no-GPU) confirmed via Layer-1/Layer-2 split |
| L-LTSF-3 | IN-SCOPE; off-budget confirmed (no amendment) |
| L-LMSF-3 (locale -W friction) | NOT triggered — ising has no Taichi; pytest job used `uv run pytest tests/` (pyproject `filterwarnings=["error"]`) with no deprecation surface |
| L-ISING-AUDIT-HYGIENE | session-1 sealed audits NOT touched; this session wrote REAL sha256 in every `evidence_hashes` (verify_evidence 0-fail on all 4 ising stage audits) — remediation rule HELD; the cluster fix for the 3 sealed audits remains routed elsewhere |
| L-R2CD-FOLLOWUP | RESOLVED (see § 5.1) |

## § 7 — Cumulative / forward routing

- `packages/ising-classical/` = 25th workspace member; first
  `lattice-spin` sim; first `tools/diagnostics/tier3/ising_classical/`;
  first `[lattice-spin.*]` determinism row; first
  `[golden_tolerance.lattice-spin.*]`; first per-sim CI job reading a
  committed LFS capture.
- **Unblocks** task-4 (rigid-body) onwards; no later Phase-3 task imports
  `packages/ising-classical/` as a code dependency (charter R-7). Phase-6
  ising-dwave inherits the spec-sheet + glossary as documentation
  precedent.
- **NO tag.** The Phase-3-close tag (`v0.3.0-phase-3` or equivalent) is
  operator work at phase close, not this sub-phase's deliverable
  (charter §3).

## § 8 — Verdict

**closed-with-shifted-2** (SHIFT-1 D-TOL-SCHEMA golden_tolerance branch;
SHIFT-2 physics aligned-IC magnetization). 13/13 gates PASS; determinism
bit-exact; integrity 0 HARD_FAIL / 14 SOFT_WARN; verify_evidence 0-fail;
append-only HELD; §S.5 10/10 green. First-Stack-B-SIM pipeline VALIDATED.
No HARD RULE 2 STOP fired. **Sub-phase COMPLETE.**

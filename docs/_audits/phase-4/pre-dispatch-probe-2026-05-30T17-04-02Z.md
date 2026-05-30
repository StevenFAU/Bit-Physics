---
date: 2026-05-30T17-04-02Z
subject: "Phase-4 pre-dispatch foundation-readiness reconnaissance (ground-truth + mechanical-completeness probes, consolidated)"
kind: pre-dispatch-reconnaissance
verdict: INFORMATIONAL
head_sha: <PLACEHOLDER — back-filled per Convention #12>
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
author: phase-4 pre-dispatch reconnaissance (Claude Code, read-only probe)
parent_audits:
  - docs/_audits/phase-3/close-R0-20260530T131801Z.md
  - docs/_audits/phase-3/close-R1-R2-20260530T141541Z.md
  - docs/_audits/phase-3/close-R3-R5-task9-20260530T145125Z.md
---

# Phase-4 Pre-Dispatch Foundation-Readiness Probe

> **This is the RECONNAISSANCE artifact, not the disposition.** The Phase-4 opener
> writes a separate `pre-dispatch-review-<UTC>.md` (the operator-ratified go/no-go).
> This doc consolidates two read-only probes run at HEAD `638b247` against the
> committed repo: (A) a post-Phase-3 ground-truth probe and (B) a Stages-1–8
> mechanical-completeness probe. `verdict: INFORMATIONAL` so the replay tool never
> treats its front-matter as a gated claim. Findings are FACT (ran/read) or
> INFERENCE (reasoned). It DISTILLS — raw file contents trivially re-derivable from
> the checkout are cited by path/line-range, not re-pasted.

---

## §1 — Phase-3 CLOSED + Phase-4 entry state (FACT)

- HEAD `638b247`; the only commit past the tag is the I7-allowlist follow-up.
- Tag `v0.3.0-phase-3` is **annotated-UNSIGNED** (no PGP block), tagger
  `cohens2025@fau.edu`, → commit `362179f`. The 8-line follow-up `638b247` adds the
  tag to the I7 operator-tag allowlist.
- **Close campaign R0–R5 + corrigenda are LANDED**, across three audits +
  `da61e86`:
  - `docs/_audits/phase-3/close-R0-20260530T131801Z.md` — R0: 12 placeholder
    legacy-capture fixtures LFS-migrated (`git add --renormalize`, commit `f08af5f`);
    `docs/_audits/back-test-` added to integrity `EXCLUDED_PREFIXES` (`6cb56b8`).
  - `docs/_audits/phase-3/close-R1-R2-20260530T141541Z.md` — R1 mutation moat
    (sph_water_dfsph_generator 0→0.7874; cat4_draft_time 0.067→0.5823; 8 generators
    producer-covered; meta-test wired into `.github/workflows/integrity.yml`) + R2
    anchor-independence gate (≥3 DISTINCT sources, numerical-baseline exemption).
  - `docs/_audits/phase-3/close-R3-R5-task9-20260530T145125Z.md` — R3 (append-only
    glob un-hollowed; gate-3 hash robustness), R4 (stub-banner strip; landing-hygiene),
    R5 (doc minors), corrigenda A-1..A-7, task-9 common-warp maturation.
  - Corrigenda **A-1..A-7 APPLIED at `da61e86`** (spec freeze lifted at close);
    marked APPLIED in `docs/spec-amendments-proposed.md` at `c78cb95`.
- **Honest residue (carried, not faked):** the `property` (0.2034) and
  `code_verification_mms` (0.2650) mutation targets got +51/+29 constraining tests
  RED-verified on injected mutants, but a full score **re-measure is DEFERRED**
  (their mutmut `path` includes the `tests/` subtree, diluting source signal;
  ~30–60 min/run). The pre-improvement numbers stand; recorded at
  `docs/_audits/phase-3/close-R1-R2-20260530T141541Z.md` (the deferred-re-measure note).
- **⚠ NO `docs/_audits/phase-3/landing-<UTC>.md` EXISTS** (FACT — `ls` returns
  nothing). The Phase-3 phase-level close = the **three close-R*.md audits + the
  tag annotation**, NOT a single landing audit. This is load-bearing for §2.
- Branch protection / server-side tag moat remain **descriptive only** (spec
  `docs/architecture.md:3260` D.8 row 4 claims a `git verify-tag` pre-receive hook;
  back-test M-2 measured `branches/main/protection` → 404). Operator punch-list.

---

## §2 — Replay-path gap + fix (the WU-P / Stage-1 first action) (FACT)

The Stage-1 dispatch (`docs/phases/phase-4-plan.md:1442`) hard-codes:

```
python -m integrity.scripts.replay_prior_phase --prior-phase phase-3 \
  --audit docs/_audits/phase-3/landing-<UTC>.md --gates integrity,pytest,...
```

That `--audit` target **does not exist** (§1). In
`tools/integrity/integrity/scripts/replay_prior_phase.py` the audit file is read by
`read_text()` (~line 117); the only handler in `main` is
`except (subprocess.CalledProcessError, ValueError)` (line 349), which does **NOT**
catch `FileNotFoundError` → the tool **crashes with a traceback**, not a clean BLOCKED.

How the tool actually uses its inputs (FACT, from the source):
- **The prior-phase tag is derived from `--prior-phase`, NOT from the audit file.**
  `_resolve_phase_handle` (line 143) lists `git tag v*.*.*-phase-3` and picks the
  highest semver = `v0.3.0-phase-3`. The gate set re-runs at that tag.
- The `--audit` file is read ONLY for front-matter; `_audit_verdict_for_gate`
  (line 127) honors a `gates: {name: PASS}` map OR a whole-audit `verdict:` string.
- A claimed-vs-actual **discrepancy fires only if** the verdict string is in
  `{CONFIRMED, PASS, OK}` AND the live re-run failed (line ~303). Any other verdict
  string ⇒ no per-gate assertion; `ok` = "did all gates pass at the tag."

**REQUIRED FIX = REPOINT** `--audit` to an existing front-mattered file, e.g.
`docs/_audits/phase-3/close-R3-R5-task9-20260530T145125Z.md` (valid YAML
front-matter; its `verdict: R3-R5-CORRIGENDA-TASK9-LANDED` is not in the assertion
set, so the replay validates that the 8 gates pass at `v0.3.0-phase-3` without a
claimed-vs-actual cross-check — functionally a valid replay). Authoring a
consolidated `landing-<UTC>.md` is **OPTIONAL** — needed only if you want the
discrepancy cross-check engaged (then give it `verdict: CONFIRMED` or a `gates:` map).
INFERENCE: repoint is sufficient and correct; no new tooling required.

---

## §3 — 13-gate definition (D.6) — the per-stage acceptance reference (FACT, verbatim)

Source: `docs/architecture.md:2588` (Appendix D.6, authoritative per §3.5).

| # | Checks | Run mechanism |
|---|---|---|
| 1 | Spec sheet committed (full §6 verification posture) | file presence: `docs/sim-specs/<cat>/<sim>/spec-ref.md` |
| 2 | Pre-impl probe report committed | `tools/testkit/probes/reports/<sim>.md` |
| 3 | Acceptance suite committed + *failing*, verbatim output hashed | `tools/testkit/failing-tests-evidence/<sim>-<UTC>.txt` + `Failing-tests-output-hash:` footer (§1.3 step 4) |
| 4 | MMS/golden pass, ≥3 independent-reference anchors per golden table | Cat 3 via `integrity --all`; anchor-distinctness now gate-enforced (close R2) |
| 5 | Tier 1 diagnostics pass | pytest tier-1 |
| 6 | Category Tier 2 diagnostics pass | pytest tier-2 (substack per D.7) |
| 7 | Citation chain resolves | Cat 1 (`integrity --all`) |
| 8 | Public API resolves | Cat 2 (`integrity --all`; `docs/common/<stack>.md` api blocks) |
| 9 | Ships a capture the testkit can replay | `load_capture` / `compare_captures` |
| 10 | Determinism declaration consistent with capture | manifest `determinism.claimed` vs registry |
| 11 | PBT of declared invariants pass (§2.14) | `tools/testkit/property/...` (≥2 `@given` invariants) |
| 12 | First-landing wall-clock in `docs/perf-ledger.md` (§2.15) | perf-ledger row present |
| 13 | Phase-landing replays the failing-tests commit + confirms output hash | `tools/integrity/integrity/scripts/replay_failing_tests.py` (normalized-hash match) |

Gate 14 (cross-stack equivalence) applies only to sims with cross-stack siblings.
The foundation WUs 1–8 are infrastructure, not Layer-4 sims — they self-validate
against the per-WU acceptance criteria (§7.1–7.8), not the full 13; the 13 bind
Stages 9–35.

---

## §4 — WU-A schema-bump reconciliations (FACT)

The contract the 27 frontier sims depend on; surface mismatches the WU-A agent must
reconcile (the §7.2 dispatch at `docs/phases/phase-4-plan.md:1567` is imprecise here):

- **common-warp ALREADY has the kwarg.**
  `common/common-warp/src/common_warp/capture/writer.py:34` —
  `def write_capture(capture, path, *, schema_version: str = "1.0.0")`; sets
  `manifest.setdefault("schema_version", ...)` at :66 and validates via
  `_CaptureManifest.from_dict(manifest)` at :73. WU-A bumps the default + adds
  `MAX_SUPPORTED_VERSION`.
- **common-py has NO `write_capture` function.**
  `common/common-py/src/common_py/capture.py` exposes a `Writer` class
  (`write_step`/`finalize`); the schema-version surface is the `Manifest`
  dataclass field `schema_version` (:95), not a function kwarg. The plan's
  "extend `common_py.capture.write_capture` signature" is shape-mismatched — in
  common-py it's `Manifest.schema_version` + a `MAX_SUPPORTED_VERSION` constant.
- **Root schema is `additionalProperties: false`.**
  `tools/testkit/schemas/capture-v1.json:7` (root) with `required` = the 7 keys
  (`:8`). `gradient_fields` (WU-A) and `active_mask` (WU-B) go in `properties`
  and **must be left OUT of `required`** so legacy captures still validate. The
  schema file alone is NOT the validator: the real check is the Phase-0 testkit
  `CaptureManifest.from_dict` under `tools/testkit/capture/` (imported by BOTH
  writers) — it must accept the new keys too. The §7.2 C2 list names
  `capture-v1.json` + the three writers but NOT this validator layer (probe-discoverable).
- **Backward-compat corpus = 26 pairs** (`.h5` + `.json`) under
  `tests/fixtures/legacy-captures/` (FACT — plan estimated ~25). Breakdown:
  1 Phase-0 + 9 Phase-1 `-ref` + 8 `phase-2-*` + 8 `phase-3-*`. The round-trip test
  auto-discovers pairs, so all 26 are exercised. NOTE the Phase-3 fixture leaf is
  `tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.json` (legacy name —
  see §6 M-6).

---

## §5 — §0.3 path drift: `<category>/<sim>/` has ZERO landed code (FACT)

- Landed reality is **flat** `packages/<sim>/` (single-stack: `packages/articulated-pedagogical/`,
  `packages/pinn-poisson/`) or `packages/<sim>/<stack>/` (dual-stack:
  `packages/neural-ca/python/`). **No `<category>/<sim>/` code dir exists anywhere.**
- The phase-4-plan prescribes category-nested CODE dirs for the frontier variants,
  contradicting all landed precedent. 57 stale occurrences across phase docs; **13
  in `docs/phases/phase-4-plan.md`** at lines 1089, 1220, 1222, 2310, 2311, 2312,
  2313, 2411, 2416, 2418, 2426, 2666, 2667. WU-G (Stage 8) is where it first bites —
  it creates the spec stubs and the variant-dir convention the rest of Phase 4 inherits.
- **Distinction (keep, do not "fix"):** the DOCS path
  `docs/sim-specs/<category>/<sim>/spec-<variant>.md` IS correct/canonical and
  category-enforced (sim-specs ARE organized by category, e.g.
  `docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md` exists). Only the CODE
  path `<category>/<sim>/<variant>/` is the drift. INFERENCE: WU-G / per-WU
  plan-drafting must ratify "category-nested vs flat-`packages/`" for Phase-4 CODE
  as an explicit §0.3 SHIFT before Stage 9.

---

## §6 — M-6 (`articulated-pedagogical` ↔ `rigid-body-pedagogical`): 4 legacy surfaces (FACT)

Spec + package dir are already canonical (`articulated-pedagogical`; architecture.md
has 0 `rigid-body-pedagogical` after A-1/M-6). The un-renamed residue:

1. Captures dir + JSON name:
   `captures/rigid-body-pedagogical-ref/pendulum-trajectory-seed42-step1000.json:39`
   → `"name": "rigid-body-pedagogical"`; dir leaf `captures/rigid-body-pedagogical-ref/`;
   fixture `tests/fixtures/legacy-captures/phase-3-rigid-body-pedagogical.json`.
2. CI job key + LFS glob: `.github/workflows/python-strict.yml:279`
   (`test-rigid-body-pedagogical:`) and the pull at `.github/workflows/python-strict.yml:325`
   (`captures/rigid-body-pedagogical-ref/**`); every step inside already uses
   `packages/articulated-pedagogical`.
3. Plan sim-name column: `docs/phases/phase-3-plan.md:690` (+ §6.4 header at
   `docs/phases/phase-3-plan.md:1567`).
4. Landing-audit filename: `docs/_audits/phase-3/task-4-rigid-body-pedagogical.md`
   (append-only-locked).

**Why prospective-only (NOT an inline fold-in):** close R4 attempted the rename and
**reverted under HARD RULE 2** — renaming the audit broke a referencing audit's
`verify_evidence` head_sha (8/0 → 6/2) and dangled an append-only-locked
`evidence_paths` entry. The captures-dir + fixture rename also drags LFS OIDs and
recomputes the JSON `name`, and renaming the fixture collides with the WU-A
26-pair corpus round-trip (§4). Disposition: operator punch-list, apply
prospectively in Phase 4 (or a dedicated rename sub-phase), not folded in silently.

---

## §7 — write_frames_capture: no helper exists yet; 6 consumers span 3 call-site layers (FACT)

There is **no `write_frames_capture` in source** — it lives only in `docs/common/warp.md`
and the close audit as a banked proposal. The actual duplicated tail is an identical
2-line `common_warp.Capture(...)` + `common_warp.write_capture(...)` preceded by a
per-sim payload-assembly loop. The 6 consumers are **NOT uniform**:

| Consumer | Capture site | Layer |
|---|---|---|
| articulated-pedagogical | `packages/articulated-pedagogical/articulated_pedagogical/sim.py:124` | sim.py tail |
| eulerian-smoke-stack-e | `packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/sim.py:276` | sim.py loop+tail |
| lattice-boltzmann-d3q19-stack-e | `packages/lattice-boltzmann-d3q19-stack-e/lattice_boltzmann_d3q19_stack_e/sim.py:243` | sim.py loop+tail |
| mpm-multimaterial-stack-e | `packages/mpm-multimaterial-stack-e/mpm_multimaterial_stack_e/sim.py:330` | local `_write_capture(...)` helper (the de-facto shape) |
| pinn-poisson | `packages/pinn-poisson/pinn_poisson/infer.py:150` | infer.py (inference, not a step loop) |
| 3dgs-mpm | `packages/3dgs-mpm/gs_mpm/__main__.py` | driver `__main__` |

Shared-helper home would be `common/common-warp/src/common_warp/capture/` (alongside
`writer.py` / `model.py`). A single `write_frames_capture(frames, manifest, out_dir)`
must absorb three call-site layers (sim.py loop ×3, local helper ×1, infer.py ×1,
`__main__.py` ×1). INFERENCE: deferred "additive-helper-then-migrate" refactor with
regression risk on 6 landed sims — NOT a drop-in. mpm-e's local `_write_capture` is
the closest existing template.

---

## §8 — Vendor pins + manifest shape (FACT)

§3.3 table (`docs/phases/phase-4-plan.md:243`):

| Dep | Treatment | License | Pin | WU |
|---|---|---|---|---|
| OpenVDB (+NanoVDB) | Vendored `references/openvdb/` | MPL-2.0 | "specific release tag — probe at vendoring time" (NO pre-baked SHA) | B |
| Newton 1.0 GA | Vendored `references/newton/` | Apache-2.0 | "1.0.x specifically" (no exact SHA) | D |
| OpenUSD | pip `usd-core` | Apache-2.0 | version probe-time | D |
| NVIDIA PhysicsNeMo | pip `nvidia-physicsnemo` | Apache-2.0 | "specific 1.x" — **STALE vs A-6** (core 1.x ended v1.3.0; framework now 2.x; read-only PINN ref is physicsnemo-sym 2.4.0) | E |
| PyTorch Lightning | pip `lightning` | Apache-2.0 | version probe-time | E |

- INFERENCE: OpenVDB + Newton SHAs are deliberately **probe-then-pin** (Convention #8);
  an A4 pin-consistency guard cannot pre-bake them — it can assert only "a sha +
  license exist and match §3.3's repo/license."
- **Manifest file is `MANIFEST.toml` (UPPERCASE)** — 7/7 under `references/` (e.g.
  `references/SPlisHSPlasH/MANIFEST.toml`), NOT the plan-prose lowercase
  `manifest.toml`. Shape: `[upstream] name/version/sha/url/license/license_file`,
  `[scope] purpose/used_by_sims/used_by_checks`, `[vendoring] fetched_utc/fetched_by/fetch_command`.
  An A4 guard targets `[upstream]` sha/license/url in `MANIFEST.toml`.

---

## §9 — Per-stage + per-fold-in readiness verdicts (INFERENCE from §§1–8)

| Stage / Fold-in | Verdict | If THIN — what's missing |
|---|---|---|
| §7.1 WU-P Conventions | SELF-SUFFICIENT | (global: replay `--audit` repoint, §2) |
| §7.2 WU-A Autodiff | SELF-SUFFICIENT | common-py has no `write_capture` fn; validator layer (`CaptureManifest.from_dict`) not named in C2 (§4) |
| §7.3 WU-B Sparse | SELF-SUFFICIENT | OpenVDB SHA probe-then-pin (by design) |
| §7.4 WU-C 3DGS | SELF-SUFFICIENT | — |
| §7.5 WU-D Newton | SELF-SUFFICIENT | Newton SHA + CUDA availability resolve at probe (CPU fallback pre-ratified) |
| §7.6 WU-E Learning | SELF-SUFFICIENT (1 THIN) | PhysicsNeMo "1.x" guidance stale vs A-6; re-resolve runtime pin at probe |
| §7.7 WU-F Variant Equiv | SELF-SUFFICIENT | — (numeric budget caps inline) |
| §7.8 WU-G Phase Ledger | SELF-SUFFICIENT (1 THIN) | bakes the unresolved §0.3 code-path convention into stub paths (§5) |
| Fold-in: replay-path (A1) | SELF-SUFFICIENT | repoint `--audit` to an existing front-mattered file; consolidated landing OPTIONAL (§2) |
| Fold-in: M-6 rename | THIN | not a one-liner: LFS captures-dir + append-only audit-filename (reverted under HARD RULE 2); fixture rename collides with WU-A corpus → dedicated rename / prospective-only (§6) |
| Fold-in: write_frames_capture | THIN (inline) / SELF-SUFFICIENT (deferred refactor) | 6 call-sites across 3 layers; helper must absorb all → real refactor, not a drop-in (§7) |
| Fold-in: §0.3 path SHIFT | THIN | no ratified Phase-4 CODE-dir layout (plan `<category>/<sim>/`, reality flat `packages/<sim>/`) (§5) |

**Bottom line (INFERENCE):** the eight foundation briefings are mechanically
self-sufficient to execute (paths, API names, gates, acceptance all concrete; the
only opens are by-design probe-then-pin vendor SHAs and the global replay repoint).
The fold-ins are the soft spots: the A1 replay fix is trivial (repoint), but M-6,
write_frames_capture, and the §0.3 code-path convention are real scoped work a
precise dispatch must call out rather than fold in silently.

---

## Provenance

Two read-only probes at HEAD `638b247`, consolidated here as the reconnaissance
artifact ahead of the Phase-4 opener's `pre-dispatch-review-<UTC>.md` disposition.
The probes themselves performed NO repo writes; this single documentation commit is
the one authorized write. No tag (I7). Not evidence-gated (`verdict: INFORMATIONAL`);
front-matter carries no `evidence_hashes`, so `verify_evidence` does not treat it as
a claim. Convention #12 SHA back-fill applies to `head_sha:` above.

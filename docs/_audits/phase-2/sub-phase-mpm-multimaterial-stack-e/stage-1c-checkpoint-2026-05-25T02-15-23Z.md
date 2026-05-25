---
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-1c
stage: stage-1c-checkpoint
phase: phase-2
head_sha: a53a8316e608c6c24b4351821f5e3ac031fc5e74
head_sha_at_checkpoint: 12bc66c9bb8ded896333d8fcb6a1032b8f316b83
date: 2026-05-25T02-15-23Z
verdict: stage-1c-CONFIRMED
evidence_paths:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1c-gate14-equivalence-2026-05-25T02-15-23Z.txt
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1c-replay-2026-05-25T02-15-23Z.txt
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1c-integrity-sweep-2026-05-25T02-15-23Z.txt
  - docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md
  - packages/mpm-multimaterial-stack-e/tests/test_cross_stack_equivalence.py
  - captures/mpm-ref/drop-impact-128cube-seed42-step500.json
  - captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.json
evidence_hashes:
  docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1c-gate14-equivalence-2026-05-25T02-15-23Z.txt: sha256:51951f3c25a4f1891729351fd5c85fdff32ac6b6d08d2ed60657cec6e4f3e442
  docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1c-replay-2026-05-25T02-15-23Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1c-integrity-sweep-2026-05-25T02-15-23Z.txt: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52
---

# Stage 1c checkpoint — sub-phase-mpm-multimaterial-stack-e

> SIXTH per-sim cross-stack port; FIRST Stack-E (Warp) port. Stage 1c (formal
> gate-14 cross-stack equivalence + `equivalence.md` per-field witness) CLOSE.
> VERDICT stage-1c-CONFIRMED. Formal `compare_captures(LEFT=mpm-ref,
> RIGHT=stack-e)` returns **`within_tolerance=True`; `max_abs_err = max_rel_err =
> 0.0` across all 4 fields × all 11 frames → BIT-EXACT** — reproducing the
> Stage-1b incidental result (S1b-ME2) EXACTLY (no determinism question). The
> `equivalence.md` Stack-E section authored ADDITIVELY (159 insertions, 0
> deletions; Stack-D content untouched, Convention A). D7 override REUSE verified
> (no edit). Integrity baseline-MATCH (`c19492ad…`); bit-identity replay HELD
> (`9399fc33…`, 46th). 2 shifts (S1c-1/S1c-2); cumulative 189 → 191.

## § 1. Scope

Stage 1c of `sub-phase-mpm-multimaterial-stack-e`: the lightest substantive stage
(D7 RATIFIED REUSE makes the tolerance override a no-op; gate-14 already passed
incidentally at Stage 1b per S1b-ME2). Two substantive deliverables: (a) the
FORMAL gate-14 cross-stack equivalence execution committed as an audit-trail
witness; (b) the `equivalence.md` per-field witness authoring (ADDITIVE Stack-E
section). Plus: (c) `test_cross_stack_equivalence.py` skip-guard release
verification + a minor additive docstring cleanup (S1c-1); (d) D7 tolerance
override REUSE verify-only (NO edit). Additive only (Convention A). No edits to
`tolerance.toml`/`tolerance-budget.toml` (D7 no-op), the
cross-stack-equivalence-methodology doc (Stage 2 D8), `warp.md` (Stage 2 D16),
the conventions doc (§ L.6 landed at Stage 1b), any sim kernel, the canonical
capture, or the spec sheet (SECTION 7 boundary).

## § 2. Operator routing consumed (D1–D16 + Stage-1b inheritance + S1b-ME2)

All ratified D1–D16 in force. Load-bearing this stage: **D7** (override REUSE —
`[overrides.mpm-multimaterial] category="mpm"` already resolves the pair; Stage-1c
edit is a confirmed no-op), **D8** (IC-15 #3 atomic-scatter PRESENT-but-NOT-
EXERCISED; #1/#5 N/A; PARTIAL HOLDS — the optional § 5.1 stack-portability note is
Stage 2), **D3** (S6-trajectory verdict BOUNDED → R-P2 escape-hatch N/A),
**D16** (warp.md § 6 correction stays Stage 2 — NOT touched). Stage-1b
inheritance: the canonical capture (`drop-impact-128cube-seed42-step500`; both
partners LFS-present); the O-W7 § L.6 extension framing (informational; no kernel
touched). **S1b-ME2 incidental bit-exact result** is the load-bearing predecessor:
Stage 1c FORMALIZES + COMMITS it as a witness rather than running-and-hoping.

## § 3. Task 1c.0 — Preflight + D7 verification

(FACT — `git rev-parse`; replay/integrity re-runs.) HEAD entering = `40622ea`
(Stage-1b SHA back-fill close). **No drift.** Working tree: untracked `.claude/`
+ two untracked `captures/eulerian-smoke-stack-d/taylor-green-…` files (NOT
load-bearing; NOT touched / NOT committed this stage). Bit-identity replay →
`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` **HELD (45th)**.
Integrity sweep → `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
**baseline-MATCH** (0 HARD_FAIL, 14 SOFT_WARN). **D7 verification:**
`[overrides.mpm-multimaterial] category = "mpm"` PRESENT at HEAD in
`tools/testkit/equivalence/tolerance.toml` (established by Stack-D Stage 1c; the
"Fourth per-sim override" comment intact) — **no drift since Stage 0 Task 0.5**;
`[defaults.mpm]` = `relative 1e-4, absolute 0.0` unchanged. Hard Rule 2 NOT
triggered.

## § 4. Task 1c.1 — Formal gate-14 cross-stack equivalence execution

(FACT — `stage-1c-gate14-equivalence-…txt`; `equivalence.harness.compare_captures`
invoked directly on the two manifests.)

`compare_captures(LEFT=captures/mpm-ref/drop-impact-128cube-seed42-step500.json,
RIGHT=captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.json)`:

- **`within_tolerance = True`.**
- **`tolerance_table_used = {category: mpm, relative: 0.0001, absolute: 0.0}`** —
  resolved via `[overrides.mpm-multimaterial] category="mpm"` → `[defaults.mpm]`
  (D7 REUSE; no new row).
- **44 `per_field_diff` entries = 4 fields × 11 frames.** Fields:
  `particle_pos`, `particle_vel`, `particle_material_id`, `grid_mom`. Frames:
  steps `0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500`.
- **EVERY entry: `max_abs_err = 0.0`, `max_rel_err = 0.0`.** Roll-up over ALL
  fields × ALL frames: `max_abs_err = 0.0`, `max_rel_err = 0.0` → **BIT-EXACT.**
- **Margin:** the 1e-4 relative threshold is cleared by a zero error at every
  cell — effectively infinite margin (a zero diff clears any positive composite
  threshold `atol + rtol·field_scale`). No near-zero-field relative artifact
  arises (the diff is exactly zero, so `max_rel_err` is exactly zero too — unlike
  the Stack-D Taichi pair's `~9e-7` relative-error harness artifact).
- **Match to S1b-ME2 incidental result: YES, EXACTLY.** Re-running at Stage 1c
  produced the identical bit-exact verdict — the SECTION 2 stop condition
  ("DIFFERENT result than Stage 1b") is NOT met; LFS marshalling + harness
  invocation are stable between the Stage-1b and Stage-1c instances.

## § 5. Task 1c.2 — test surface verification

(FACT — per-package cold-`.pyc` pytest; `git diff`.)
`packages/mpm-multimaterial-stack-e/tests/test_cross_stack_equivalence.py`:

- **Skip-guard: RELEASED.** The `_both_present(ref, cand)` guard is True (both
  canonical partners present since Stage 1b), so the test RUNS the assertion — it
  is NOT skipped. The skip-guard is conditional-on-capture-presence (not a bare
  `@pytest.mark.skip`); capture-presence releases it.
- **Verdict under pytest: PASS** (not skipped, not incidental). The assertion
  shape is the standard `assert verdict.within_tolerance` — which here passes in
  its STRONGEST form (bit-exact `max_abs_err = 0.0`, not merely within-threshold).
- **Cleanup (S1c-1):** a minor ADDITIVE docstring fix of the stale Stage-1a-stub
  comment ("Stage 1c populates the canonical capture; until then this gate is
  SKIPPED" — wrong: the capture is a Stage-1b deliverable, already landed). The
  method + module docstrings now state the capture landed at Stage 1b, the gate
  RUNS, and the achieved verdict is BIT-EXACT. **Test LOGIC unchanged** (`git diff`
  = 12 insertions / 6 deletions, all within the two docstrings; no executable
  line altered). The `×` glyph was rendered `x` in the Python docstring to clear
  ruff RUF002 (ambiguous-unicode; pre-commit-mechanical; `×` retained in the
  Markdown `equivalence.md` which ruff does not scan).

## § 6. Task 1c.3 — `equivalence.md` per-field witness authoring

(FACT — `git diff --numstat`; `git show HEAD:…equivalence.md | sha256sum`.) Path:
`docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md`. **File-state at probe:
case (a)** — the file EXISTS and was authored by the Stack-D Taichi-CPU port
(documents Phase-1 numba ↔ Stack-D at gate-14; `particle_vel` ~6.2e-28
FP-round-off residual; `within_tolerance=True`). Stage-E adds a NEW top-level
section ADDITIVELY (mirroring the smoke `---` + top-level-heading delimiter), never
modifying Stack-D content (159 insertions, **0 deletions** — verified). Committed-
blob sha256 `b6ccc014d8cac12fdd50e83af80d70a88c634d139b194bd624eb8975808c47bc`.

The Stack-E section (`# mpm-multimaterial — Stack-E (Warp) cross-stack equivalence
(BIT-EXACT)`) carries §§ 1–7: (1) the pair (Phase-1 numba LEFT ↔ Stack-E Warp
RIGHT — a NEW pair, NOT the deferred Stack-D ↔ Stack-E pair; the "unimplemented"
framing superseded); (2) gate-14 verdict (within_tolerance=True; bit-exact;
D7-resolved tolerance); (3) port faithfulness (step-0 bit-exact baseline; rigid
free-fall BOUNDED per Task 1.6; mass-conservation 4.44e-16 partition-of-unity
exact; 2/2 determinism; verbatim algebra, no Phase-1 import); (4) the per-field
per-frame witness table (4 × 11 all `0.0/0.0`); (5) why bit-exact (verbatim
algebra + same operation order + rigid free-fall → order-independent P2G sum) +
the HONEST canonical-specific framing (NOT a general Stack-E claim; contrasts
Stack-D ~1e-28 and smoke chaotic `within_tolerance=False`); (6) methodology
consistency (§ 5.1 atomic-scatter PRESENT-but-NOT-EXERCISED; § 6 R-P2 NOT INVOKED);
(7) implications for the remaining Stack-E ports (smoke may engage R-P2; LBM TBD;
the BIT-EXACT / FP-round-off / chaotic-escape-hatch spectrum). Phase-1 spec cited
BY SECTION (`algebraic.md` § 3, `spec-ref-stack-e.md` §§ 5–6/8); GPU devices in
prose form ("CPU execution", "Warp CPU serial launch") — no bare device token
(§ L.5 S1a-2 + S1c-1).

## § 7. Task 1c.4 — Local verification

(FACT — cold-`.pyc` pytest; `integrity --cat 1` + `--all`; replay re-run.)

- **Package pytest (per-package config, cold `.pyc`, N1):** `16 passed, 0 skipped`
  (gate-14 RUNS + PASSES; not skipped). `filterwarnings=["error"]` posture clean.
- **Cat-1 citation chain on `equivalence.md`:** `integrity --cat 1` → **0
  HARD_FAIL, 0 SOFT_WARN** (clean; the §-number citations + prose-form device
  references resolve; no spurious `path:line`).
- **Integrity sweep (`--all --mode strict`):** `c19492ad…d22cb52` **baseline-MATCH**
  (0 HARD_FAIL, 14 SOFT_WARN) — UNCHANGED after the `equivalence.md` + test edits
  (neither adds an integrity finding; the 14 SOFT_WARN are the carried phase-0/1
  cosmetic set).
- **Bit-identity replay:** `9399fc33…718909f34` **HELD (46th)**.
- **Cross-package regression:** zero-touch outside this package (only
  `equivalence.md`, the test docstring, + audit artifacts changed); no kernel /
  tolerance / common-warp / methodology edit.

## § 8. Banked items / observations (shifts S1c-1, S1c-2)

- **S1c-1 — `test_cross_stack_equivalence.py` docstring cleanup (additive).** The
  Stage-1a stub's docstrings carried an obsolete "Stage 1c populates the canonical
  capture; until then this gate is SKIPPED" claim — wrong post-Stage-1b (the
  capture is a Stage-1b deliverable, landed; the gate RUNS). Fixed additively
  (prose only; logic untouched) per Task 1c.2's anticipated cleanup. Routine drift
  handled inline (SECTION 2); NOT a stop condition.
- **S1c-2 — Stage-1c committed dedicated gate-14 / replay / integrity evidence
  txts.** Stage 1b embedded its verification results in checkpoint prose; Stage 1c
  RE-INTRODUCES the Stage-0 evidence-file form (three `stage-1c-*.txt` artifacts in
  the audit dir, cited by committed-blob sha in front-matter) because Task 1c.1
  calls for committing the gate-14 witness as an audit-trail artifact. Additive;
  in-scope (audit dir); strengthens the FACT-tag chain.
- **Operational (not shifts):** the canonical captures + LFS pointers are unchanged
  (no re-production — Stage-1b's done work); the untracked `.claude/` +
  `eulerian-smoke-stack-d` captures were left untouched / uncommitted.
- **STAY-BANKED (no surprises):** LFS-architecture (D13); the O-W7 § L.6 extension
  (no kernel touched this stage); N1 per-package pytest-config; the §5.1
  atomic-scatter PRESENT-but-NOT-EXERCISED disposition (Stage 2 D8).

## § 9. Stage 2 readiness (landing)

**READY.** Stage 2 (landing) receives, per the operator report-back catalog:

- **Landing audit** + **CHANGELOG entry** (Stack-E Warp port cross-stack-validated
  at gate-14, BIT-EXACT).
- **warp.md § 6 correction (D16):** the MPM-consumption prediction (HashGrid + f32
  Particles/Grids NOT consumed; own f64 `wp.array`s per D15) — Stage 2's doc-edit
  job; NOT touched this stage.
- **§ 5.1 third-instance methodology note (D8):** the atomic-scatter
  PRESENT-but-NOT-EXERCISED pattern is now a THIRD instance (after MPM Stack-D and
  LBM), and additionally STACK-PORTABLE (Taichi → Warp) — an optional ADDITIVE
  methodology-doc note (option (b) PARTIAL HOLDS + REFINEMENT; does NOT promote
  partial → full). Stage 2 D8 job; NOT touched this stage.
- **Banked-items roll-up** + **20+ sub-phase audit `verify_evidence`** (IC-16
  evidence-path verify across the chain).
- Both gate-14 partners present + LFS-tracked; the gate-14 test runs GREEN under
  normal pytest; the `equivalence.md` witness is committed.

## § 10. Verdict

**stage-1c-CONFIRMED.** Formal gate-14 cross-stack equivalence executed +
committed (BIT-EXACT: `within_tolerance=True`, `max_abs_err = max_rel_err = 0.0`
across 4 fields × 11 frames; matches S1b-ME2 exactly); `equivalence.md` Stack-E
per-field witness authored ADDITIVELY (159 ins / 0 del; Convention A); D7 override
REUSE verified (no edit); gate-14 test runs GREEN (skip-guard released; docstring
cleanup S1c-1). Integrity baseline-MATCH (`c19492ad…`); bit-identity replay HELD
(`9399fc33…`, 46th). 2 shifts (S1c-1, S1c-2); cumulative **189 → 191**. No
`-phase-N` tag (D12). Local-only (D13). Operator routes Stage 2 (landing)
separately.

---

*End of Stage 1c checkpoint. `head_sha` back-filled in the next commit
(Convention #12; separate commit; never `--amend`; N1 enumeration).*

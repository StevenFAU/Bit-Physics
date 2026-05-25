---
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-1b
stage: stage-1b-checkpoint
phase: phase-2
head_sha: <COMMIT_4_SHA_PENDING>
head_sha_at_checkpoint: 7a1c8fcf7b7290fd7797df8db8b0c1f7f680f9ce
date: 2026-05-25T01-58-57Z
verdict: stage-1b-CONFIRMED
evidence_paths:
  - captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.json
  - captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.h5
  - docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-e.md
  - docs/conventions/sub-phase-conventions.md
  - docs/perf-ledger.md
---

# Stage 1b checkpoint — sub-phase-mpm-multimaterial-stack-e

> SIXTH per-sim cross-stack port; FIRST Stack-E port. Stage 1b (canonical capture
> + spec sheet + O-W7 methodology amendment) CLOSE. VERDICT stage-1b-CONFIRMED.
> The full **128cube canonical capture** landed (1.05 GiB; LFS; **canonical-scale
> determinism 2/2 MATCH**; mass-conservation 4.44e-16); `spec-ref-stack-e.md`
> authored (gate-7 Cat-1 surface); the **O-W7 `wp.float64()`-taint extension**
> landed in conventions **§ L.6** (Option A). **Notable:** producing the canonical
> capture auto-enabled gate-14, which passes **BIT-EXACT** (max_abs_err 0.0 all
> fields/all 11 frames) — confirming the Stage-1c prediction early. Integrity
> baseline-MATCH (`c19492ad…`); bit-identity replay HELD (`9399fc33…`, 44th).
> 2 shifts (S1b-ME1/S1b-ME2); cumulative 187 → 189.

## § 1. Scope

Stage 1b of `sub-phase-mpm-multimaterial-stack-e`: the lighter post-implementation
stage (Stage 1a landed the gates-4-13-GREEN port). Three deliverables: (a) the
full canonical 128cube capture; (b) the `spec-ref-stack-e.md` spec sheet; (c) the
optional O-W7 methodology amendment (Option A taken). Additive only (Convention
A): new capture + new spec sheet + a `+1` perf-ledger row + an additive
conventions § L.6. Per D7 RATIFIED REUSE, the tolerance.toml override edit is a
no-op (NOT touched). No edits to Phase-1 source, common-warp, tolerance.toml,
warp.md, or the cross-stack-equivalence-methodology doc (SECTION 7 boundary).

## § 2. Operator routing consumed (D1–D16 + Stage-1a inheritance)

All ratified D1–D16 in force. Load-bearing this stage: **D7** (override REUSE —
no tolerance edit; documented in the spec sheet § 9), **D5/banked #8** (Warp CPU
serial-launch determinism at canonical scale), **D15** (own f64 wp.arrays at
production scale), **D16** (warp.md § 6 correction stays Stage 2 — NOT touched).
Stage-1a inheritance: **R-A1 anchor** `a8f6e654…07ff1fe1` (re-verified at
preflight); **S1a-ME1** gate-4 golden-only (cited in spec sheet § 6); **S1a-ME2**
single-material scope (spec sheet § 1); **S0-ME1 / O-W7** taint workaround (now
formalized in § L.6).

## § 3. Task 1b.0 — Preflight

(FACT — `git rev-parse`; replay/integrity re-runs.) HEAD entering = `75afad8`
(Stage-1a close). Bit-identity replay → `9399fc33…718909f34` **HELD (43rd)**.
Integrity sweep → `c19492ad…d22cb52` **baseline-MATCH** (0 HARD_FAIL, 14
SOFT_WARN). **R-A1 anchor re-verify:** `test_determinism.py` (3 tests) passed —
the production P2G still reproduces `a8f6e654…07ff1fe1` at HEAD (kernels unchanged
since Stage 1a). Hard Rule 2 NOT triggered.

## § 4. Task 1b.1 — Canonical 128cube capture production

(FACT — `/tmp/canon_capture.py` two-run driver; manifest.)

- **Descriptor:** `drop-impact-128cube-seed42-step500` (128³ grid; **1,000,000
  particles**; 500 steps; cadence-50 → 11 frames). Emitted via
  `sim_runner_seeded(42, captures/mpm-multimaterial-stack-e/)`.
- **Wall-clock:** **304.492 s** (~5.1 min; manifest `run.wall_clock_seconds`).
  Well under the ~10-min scaled estimate (and the 30-min stop threshold). **1.93×**
  the numpy-numba-reference baseline (158.052 s) — **WITHIN the 2× regression
  band** (contrast Stack-D taichi-cpu's 2.28×, FLAGGED) and **0.84×** of Stack-D
  taichi-cpu (360.773 s). The per-step NumPy↔Warp marshalling over ~3000 launches
  is the dominant cost (Stage-1a sim.py; unchanged — kernels are not re-touched).
- **Capture size:** `1,125,718,712` bytes (~1.05 GiB) — **matches the Phase-1 ref
  capture size exactly** (same N, cadence, frame set). LFS-tracked (`.h5` LFS oid
  `dfc4d69957d54a494aad6369f464e4b267b8ddacf2dcae227ed92e2f4554d0a9`; `.json`
  committed-blob sha256 `29be120f8f62ad7c83d1809afd41b2df7e8d21fffefd2ff4ed340a0f79b23204`).
- **Canonical-scale determinism (gate-10 analog):** ran the sim TWICE (same seed,
  same hardware, `deterministic_context`); the per-frame state-array content
  digest is **identical** across both runs
  (`dd62c046f6124ed187c25fac9fe84c27b19fa6599d366679c36038567586ac80`) →
  **2/2 MATCH**. (Content digest, not raw `.h5` bytes — HDF5 metadata can carry
  non-determinism; this is the `run_twice_and_diff` semantics at canonical scale.)
- **Mass-conservation at canonical scale:** a 1-step P2G at 1M particles / 128³
  gives `sum(grid_mass) − sum(mass)` `abs_err = 4.44e-16` (2 ULP) — the SAME ORDER
  as the diagnostic-scale `2.22e-16` (1 ULP); partition-of-unity exact at
  canonical scale; **no substantive drift** (the SECTION 2 stop threshold is not
  approached).

## § 5. Task 1b.2 — Spec sheet authoring (`spec-ref-stack-e.md`)

`docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-e.md` authored,
mirroring `spec-ref-stack-d.md` (§§ 1–13). Cites Phase-1 `spec-ref.md` BY SECTION
NUMBER (§ L.5 S1c-1); upstream anchors Hu et al. 2018 (DOI 10.1145/3197517.3201293)
+ the 88-line MLS-MPM reference + Steffen-Kirby-Berzins 2008 (DOI 10.1002/nme.2360,
the gate-4 golden derivation). Documents: single-material scope (S1a-ME2);
common-warp socket-only consumption (D10); own f64 wp.arrays (D15); Warp CPU
serial-launch determinism + R-A1 anchor (§ 8); the O-W7 taint workaround (§ 5);
gate-4 golden-only (§ 6, S1a-ME1); gate-14 vs the Phase-1 ref at `relative=1e-4`
via the REUSED `[overrides.mpm-multimaterial]` (§ 9, D7 — no new row). GPU device
references in prose form (§ L.5 S1a-2). **gate-7 Cat-1 clean** (integrity
baseline-MATCH; § 9 verification).

## § 6. Task 1b.3 — Perf-ledger canonical row

`docs/perf-ledger.md` additive canonical row: `mpm-multimaterial | warp-cpu |
drop-impact-128cube-seed42-step500 | 304.492 | …` (sibling to the Stage-1a
diagnostic row). Records the 1.93×-numba / 0.84×-Stack-D ratios + the 2/2
determinism + 4.44e-16 mass-conservation.

## § 7. Task 1b.4 — O-W7 extension methodology amendment (DECISION: Option A)

**Option A taken** (the dispatch's recommendation). The O-W7 `wp.float64()`-taint
workaround is formalized in conventions **§ L.6** (NOT § L.5) — per the § L.5
preamble's per-sub-phase-attribution discipline ("New subsection rather than an
append … per-sub-phase attribution is preserved"): § L.5 is the
common-warp-bootstrap locus, so the mpm-multimaterial-stack-e-discovered extension
gets its own § L.6. The amendment documents the taint behavior (`wp.float64(v)`
taints `v`'s inferred type) + the discipline (derive int base via
`wp.int32(<float_base>)`; pack per-axis vectors in `wp.vec3d` indexed by the
pure-int loop variable), cites the Stage-0 evidence + Stage-1a application, and
scopes applicability to the remaining Stack-E ports (Smoke, LBM). **Rationale:**
three Warp `@wp.kernel`-authoring quirks now (the `int(0)` idiom + explicit
`dtype=` to `wp.from_numpy` + the `wp.float64()` taint) constitute a real
methodology surface for the two remaining Stack-E ports — methodologically
integrated now rather than deferred. Conventions doc sha256 advanced
`49c90fc2…0dbe0d74` → `3b97dc0475e8d3f4cbd458b1ae57ef38e8f24af1a98a3e34d7d0a9f3629d106c`.

## § 8. Task 1b.5 — Stage 1c readiness (gate-14 prediction → CONFIRMED early)

- **LEFT partner:** `captures/mpm-ref/drop-impact-128cube-seed42-step500.h5`
  (Phase-1 reference; present + LFS).
- **RIGHT partner:** `captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.h5`
  (produced this stage; present + LFS).
- **Tolerance:** `relative=1e-4, absolute=0.0` via `[overrides.mpm-multimaterial]
  category="mpm"` (D7 REUSE — already exists; Stage 1c override edit is a no-op).
- **Predicted verdict:** `within_tolerance=True` at FP-round-off (BOUNDED rigid
  free-fall; methodology § 5.1 PRESENT-but-NOT-EXERCISED for atomic-scatter).
- **CONFIRMED EARLY (S1b-ME2; informational):** producing the canonical capture
  auto-enabled `test_cross_stack_equivalence.py` (its skip-guard releases once
  both partners exist), which **PASSES** — `compare_captures(LEFT=mpm-ref,
  RIGHT=stack-e)` returns `within_tolerance=True` with **`max_abs_err = 0.0`,
  `max_rel_err = 0.0` across ALL 4 fields (`particle_pos`/`particle_vel`/
  `particle_material_id`/`grid_mom`) and ALL 11 frames (steps 0…500)** — i.e.
  **BIT-EXACT** cross-stack (stronger than Stack-D's ~1e-28 `particle_vel`
  residual; the verbatim-algebra + same-operation-order re-derivation reproduces
  the numba f64 reference bit-for-bit on the rigid-free-fall canonical). **This is
  an incidental verification bonus, NOT the Stage-1c deliverable:** the FORMAL
  gate-14 execution + `equivalence.md` per-field-witness authoring (+ the no-op
  override confirmation) remain Stage 1c. Stage 1c inherits a known-GREEN gate-14.

## § 9. Task 1b.6 — Local verification

- **Integrity sweep:** `c19492ad…d22cb52` **baseline-MATCH** (0 HARD_FAIL, 14
  SOFT_WARN) — HELD even after the § L.6 conventions amendment + the spec sheet +
  the canonical capture (none add integrity findings).
- **Bit-identity replay:** `9399fc33…718909f34` **HELD (44th)**.
- **Package sanity:** `pytest` → **16 passed, 0 skipped** (was 15 passed + 1
  skipped at Stage 1a; gate-14 now runs + passes — § 8).
- **LFS marshalling:** the 1.05 GiB `.h5` is staged as an LFS pointer (oid
  `dfc4d699…4554d0a9`), not bare in git (verified at COMMIT 1 `git diff --cached`).
- **ruff:** no code touched this stage (capture + docs only); N/A.

## § 10. Banked items / observations (shifts S1b-ME1, S1b-ME2)

- **S1b-ME1 — O-W7 extension landed in § L.6 (not § L.5).** The dispatch framed
  the amendment as "§ L.5 (or new § L.6)". Per the § L.5 preamble's per-sub-phase-
  attribution discipline, the mpm-stack-e-discovered extension gets a new § L.6
  (the correct locus); § L.5 stays the common-warp-bootstrap locus. (Option A;
  § 7.)
- **S1b-ME2 — gate-14 auto-confirmed BIT-EXACT at Stage 1b.** Landing the
  canonical capture released the `test_cross_stack_equivalence.py` skip-guard; the
  cross-stack diff is `0.0` (bit-exact) on all fields/frames — exceeding the
  FP-round-off prediction and confirming the Stage-1c outcome a stage early. The
  formal Stage-1c authoring (equivalence.md) still applies (boundary respected: no
  equivalence.md / tolerance.toml edit this stage).
- **Operational (not shifts):** the canonical `.json` received an EOF-fixer
  trailing newline at COMMIT 1 (§ B.6 Mode 3; harmless). The conventions doc
  sha256 advanced (§ 7) — expected from the additive § L.6.
- **STAY-BANKED (no surprises):** LFS-architecture (D13); mypy-warp-stub; N1
  per-package pytest-config.

## § 11. Stage 1c readiness verdict

**READY.** Stage 1c deliverables: (a) formal gate-14 cross-stack equivalence
execution (KNOWN-GREEN — bit-exact per § 8) + `equivalence.md` per-field-witness
authoring (the `docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md`
additive section); (b) tolerance.toml override edit = **no-op** (D7 — the override
already resolves the pair; confirm-only); (c) un-skip / land the gate-14 test as
the closing-prep. No blocking dependencies; both gate-14 partners are present +
LFS-tracked.

## § 12. Verdict

**stage-1b-CONFIRMED.** Canonical 128cube capture landed (1.05 GiB; 2/2
determinism; mass-conservation 4.44e-16; wall-clock 304.492 s within 2× band);
`spec-ref-stack-e.md` authored (gate-7 Cat-1 clean); O-W7 extension formalized in
§ L.6 (Option A); gate-14 auto-confirmed BIT-EXACT (informational). Integrity
baseline-MATCH (`c19492ad…`); bit-identity replay HELD (`9399fc33…`, 44th). 2
shifts (S1b-ME1, S1b-ME2); cumulative **187 → 189**. No `-phase-N` tag (D12).
Local-only (D13). Operator routes Stage 1c separately.

---

*End of Stage 1b checkpoint. `head_sha` back-filled in COMMIT 5 (Convention #12;
separate commit; never `--amend`; N1 enumeration).*

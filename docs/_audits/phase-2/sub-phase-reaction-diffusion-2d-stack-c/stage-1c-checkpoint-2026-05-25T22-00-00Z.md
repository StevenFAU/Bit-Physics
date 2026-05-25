---
artifact: stage-1c-checkpoint
artifact_id: sub-phase-reaction-diffusion-2d-stack-c-stage-1c
stage: stage-1c
phase: 2
date: 2026-05-25T22-00-00Z
head_sha: PENDING-BACKFILL
head_sha_at_checkpoint: PENDING-BACKFILL
verdict: stage-1c-CONFIRMED
verdict-state: CONFIRMED
parent_audits:
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1b-checkpoint-2026-05-25T21-30-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1c-evidence/gate14-2026-05-25T22-00-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1c-evidence/corpus-roundtrip-2026-05-25T22-00-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1c-evidence/stage-1c-integrity-sweep-2026-05-25T22-00-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1c-evidence/stage-1c-replay-2026-05-25T22-00-00Z.txt
evidence_hashes:
  - "stage-1c-replay: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34"
  - "stage-1c-integrity-sweep: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52"
---

# Stage 1c checkpoint — `reaction-diffusion-2d` → Stack C (Vulkan / C++)

Cross-stack equivalence landing per charter §2 row "Stage 1c": formal gate-14
(`compare_captures`) + equivalence.md additive §Stack-C witness + gate-14
cross-language test + schema-corpus fixture + D17 tolerance-reuse verify + §L.7
O-2 checkpoint 4. **Verdict: stage-1c-CONFIRMED.** Verdict-recording (the
bit-exactness was confirmed at Stage 1b canonical scale).

## § 1 — Scope (charter authoritative)

Charter §2 Stage 1c row. The gate-14 "un-skip" mechanism for the C++ port is a
cross-language ctest (`compare_captures` via uv), NOT a pytest skip-marker removal
(§L.5 S1c-1: Python pattern not paraphrased; S1c-RD2C1, §11).

## § 2 — Anchor re-verification (Convention M)

Anchors unchanged (sha256-of-content): conventions `0ab2c058…`, methodology
`48fca782…`, architecture `e82b7b8e…`, cpp.md `68e59c62…`, common_cpp.hpp
`38d73c17…`. §1.9.1-cpp socket unchanged since `fd8453b`. Canonical capture LFS
oid `00081dc42b…` resolves. Workspace 23. CLEAN.

## § 3 — Commits + deliverables

| # | Deliverable | Commit |
|---|---|---|
| 14 | equivalence.md §Stack-C + gate-14 cross-language test + CMake reg + corpus fixture | (back-filled) |
| 15 | this checkpoint + evidence | (back-filled) |
| 16 | SHA back-fill | (separate; never `--amend`) |

## § 4 — Formal gate-14 (§L.7 O-2 checkpoint 4)

`compare_captures(LEFT = reaction-diffusion-2d-ref, RIGHT =
reaction-diffusion-2d-stack-c, tolerance.toml)`:

```
gate-14: within_tolerance=True peak_max_abs_err=0.0 peak_max_rel_err=0.0 n_entries=22
gate-14 GREEN — shape (a) BIT-EXACT (Vulkan/C++ f64 == NumPy f64; rd-2d/1e-4)
```

- **within_tolerance == True**; peak `max_abs_err == 0.0` across all 22 entries
  (11 frames × {U,V}). **Shape (a) BIT-EXACT** through the full canonical horizon.
- Resolved tolerance `reaction-diffusion`/`1e-4` via the **reused**
  `[overrides.reaction-diffusion-2d]` (D17 verify-only no-op; §7).
- FIRST Vulkan/C++ f64↔NumPy gate-14; THIRD shape-(a) instance (smoke-E chaotic +
  LBM-E laminar + RD-2D-Stack-C laminar); FIRST non-Warp shape-(a). (Methodology
  §6.8 + §L.7 O-1 portfolio notes are Stage 2.)
- **O-2 chain now 4/4:** ckpt 1 R-A1 `9d8ca9b0…` (Stage 0) · ckpt 2 canonical
  reproduction (Stage 1b) · ckpt 3 2-run determinism `493ffbba…` (Stage 1b) ·
  **ckpt 4 formal gate-14 (this stage).**

## § 5 — equivalence.md §Stack-C witness (additive)

`docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` — additive
"Stack-C (Vulkan / C++) bit-exactness witness" section (C.1–C.6); Stack-B↔Stack-D
§§1–7 untouched. Descriptive prose (no §L.7 O-1 nomenclature beyond
"bit-exact"/"shape (a)" — taxonomy refinement is Stage 2). Covers: C.1 verdict;
C.2 posture + §6.8 backend pair (first Vulkan/C++ f64↔NumPy data point,
non-inherited); C.3 within-sim cross-backend contrast (Stack-D ~1.9e-14 shape (b)
vs Stack-C 0.0); C.4 faithfulness boundary (S1b-RD2C1 IC sourcing); C.5
file-checksum vs dataset-equivalence (S1b-RD2C2); C.6 gate-4 MMS order 2.0008 +
distinct provenance.

## § 6 — gate-14 cross-language test + corpus fixture

- **gate-14 ctest:** `tests/python/test_gate14_cross_stack.py` (regenerates the
  Stack-C capture via the C++ binary, then `compare_captures` vs the NumPy
  reference) registered as `rd2d_stack_c_gate14` (uv-driven from tools/testkit;
  common-cpp C-6 pattern). `ctest -R rd2d_stack_c_gate14` PASSES (1.32 s).
- **Schema-corpus fixture:** `tests/fixtures/legacy-captures/phase-2-reaction-diffusion-2d-stack-c.{h5,json}`
  (LFS oid `00081dc42b…`, 2.94 MB ≤ 256 MiB; `payload.path` re-pointed). Auto-discovered
  by the corpus glob; round-trip + schema-valid pytest **19 passed** (was 17; +2).

## § 7 — D17 tolerance-reuse verify (no-op)

`[overrides.reaction-diffusion-2d]` (category `reaction-diffusion`, rel=1e-4,
abs=0.0) resolved cleanly at gate-14 — no `tolerance.toml` edit. RD-2D-Stack-C is
the **4th port to skip** the Stage-1c override edit (after MPM-E + smoke-E + LBM-E).

## § 8 — Integrity + replay

- Integrity `--all --mode strict`: **0 HARD_FAIL, 14 SOFT_WARN**; digest
  `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` = baseline
  EXACT (HELD; §Stack-C prose + fixture add no report lines).
- Replay invariant: 8/8 PASS; sha256 `9399fc33…718909f34`. **HELD.**

## § 9 — Hard Rule 2 assessment

All STOP conditions clear: charter vs dispatch no load-bearing conflict; gate-14
verdict is the EXPECTED within_tolerance=True + max_abs_err=0.0 (NOT a falsification
trigger); full-horizon faithfulness unchanged from Stage 1b (0.0); capture oid
resolves; D17 override resolves; integrity 0 new HF/SW; workspace 23. **Hard Rule 2
NOT triggered.**

## § 10 — Shifts + cumulative + banked

- **S1c-RD2C1** — the C++ gate-14 "un-skip" is realized as a cross-language ctest
  (`compare_captures` via uv; common-cpp C-6 pattern), NOT a pytest skip-marker
  removal — the Python un-skip mechanism does not port to the Vulkan/C++ stack
  (§L.5 S1c-1 discipline). §1/§6.

**Cumulative shifts: entering 238 → 239 (1 Stage-1c shift).**

**Banked for cleanup (carry-in unchanged):** D16 (FloatControls f32-scoped);
R-CPPB2 CI Mesa-pin; B-CPPB2; prior §13 banks.

## § 11 — Stage 2 carry-forward stack (consolidated)

Stage 2 (landing) handles all portfolio/doc-level reconciles (NOT Stage 1c scope):
1. **Charter §2 Stage-1b row SHIFTED-tag** to the landed scope (plain +
   manufactured-source kernels + 4-grid ladder) per S0-RD2C1.
2. **methodology §6.8** — add the Vulkan/C++ f64↔NumPy bit-exact data point
   (first non-Warp backend pair; graduates the cross-pair observation toward a
   second backend family). §6.7 within-sim contrast (Stack-D ~1.9e-14 vs Stack-C 0.0).
3. **§L.7 O-1** — shape-(a) fourth instance + FIRST non-Warp note.
4. **cpp.md / §L.9** — D16 FloatControls-f32-scoped consumption note (cleanup-candidate).
5. **CHANGELOG** entry; portfolio sweep (23 uv + Stack-C CMake target); integrity
   baseline + replay invariant re-confirm; **Phase-2 formal close (8/8 ports)**.
6. Banked observations: S1b-RD2C1 (IC sourcing), S1b-RD2C2 (file-vs-dataset),
   S1c-RD2C1 (C++ gate-14 mechanism).

## § 12 — SHA back-fill discipline

`head_sha` + `head_sha_at_checkpoint` carry `PENDING-BACKFILL`; back-filled in a
separate commit (Convention #12; never `--amend`; N1-tightened; full 40-hex via
`git rev-parse HEAD`): `head_sha_at_checkpoint` = the equivalence/test/fixture
commit (14); `head_sha` = this checkpoint's commit (15).

## § 13 — Next step

Operator routes **Stage 2** (landing): per §11 carry-forward stack →
**Phase-2 formal close (8 of 8 spec § 11.3 ports)**; cleanup sub-phase becomes
routable. Cumulative shifts entering Stage 2: **239**. §L.7 O-2 chain complete (4/4).

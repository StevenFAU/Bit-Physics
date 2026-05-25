---
artifact: stage-1b-checkpoint
artifact_id: sub-phase-reaction-diffusion-2d-stack-c-stage-1b
stage: stage-1b
phase: 2
date: 2026-05-25T21-30-00Z
head_sha: PENDING-BACKFILL
head_sha_at_checkpoint: 8a9d6fc34fd1d9c2c28b165fc11cec14634b8dc5
verdict: stage-1b-CONFIRMED
verdict-state: CONFIRMED
parent_audits:
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1a-checkpoint-2026-05-25T21-00-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1b-evidence/gates-green-2026-05-25T21-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1b-evidence/capture-verify-2026-05-25T21-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1b-evidence/stage-1b-integrity-sweep-2026-05-25T21-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1b-evidence/stage-1b-replay-2026-05-25T21-30-00Z.txt
evidence_hashes:
  - "stage-1b-replay: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34"
  - "stage-1b-integrity-sweep: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52"
  - "canonical-capture.h5: sha256:00081dc42b192e653656705ca81c1c974735728efae10b6b2f9b6c0bce032f42"
---

# Stage 1b checkpoint — `reaction-diffusion-2d` → Stack C (Vulkan / C++)

Implementation + CMake registration + gates 4-13 GREEN + canonical capture +
§L.7 O-2 ckpts 2 & 3, per charter §2 row "Stage 1b" + S0-RD2C1 banking.
**Verdict: stage-1b-CONFIRMED.**

## § 1 — Scope (charter authoritative + S0-RD2C1)

Charter §2 Stage 1b row ("Full Gray-Scott f64 kernel + run-loop; CMake
registration (D11); gates 4-13 GREEN; canonical capture; determinism O-2 ckpts
2/3"). Per S0-RD2C1 (Stage 0), gate-4 is MMS single-arm, so Stage 1b also lands
the manufactured-source kernel variant + 4-grid order-ladder. Charter at HEAD is
silent on the second kernel (not contradictory) → S0-RD2C1 banking authoritative;
Stage 2 SHIFTED-tags charter §2 to the landed scope (forward-signal, §10).

## § 2 — Anchor re-verification (Convention M)

Anchors unchanged (sha256-of-content): conventions `0ab2c058…`, methodology
`48fca782…`, architecture `e82b7b8e…`, cpp.md `68e59c62…`, common_cpp.hpp
`38d73c17…`. §1.9.1-cpp socket unchanged since `fd8453b`. R-A1 `9d8ca9b0…` (Stage
0). All resolve. CLEAN.

## § 3 — Commits + deliverables

| # | Deliverable | Commit |
|---|---|---|
| 10 | impl + top-level CMake registration (D11) | `732aeee` |
| 11 | canonical capture (LFS) | `8a9d6fc` |
| 12 | this checkpoint + evidence | (back-filled) |
| 13 | SHA back-fill | (separate; never `--amend`) |

## § 4 — Implementation (§1.9.1-cpp consumption)

`packages/reaction-diffusion-2d-stack-c/src/gray_scott.cpp` consumes
`vkcompute::{ComputeContext(require_float64), StorageBuffer, ComputePipeline,
dispatch}` + `capture::{Hdf5Reader, Hdf5Writer}` + `determinism::{DeterministicContext,
assert_deterministic_run}` + `hash::sha256_hex`. Two embedded SPIR-V kernels
(plain + manufactured-source; f64 `precise`/NoContraction). FloatControls asserted
f32-scoped (Q-CPP2/D16); f64 path = inherent IEEE-754 + NoContraction. CMake gates
on the substrate TARGETs (`bit_physics_common_cpp_vulkan`/`_hdf5`) — `find_package`
`*_FOUND` vars set in common-cpp's subdir scope do not cross into the port's
sibling scope (build-system note, not a sub-phase shift).

**S1b-RD2C1 (IC sourcing):** `load_reference_ic` reads the canonical IC (step-0
U,V) from the Phase-1 reference capture. The NumPy reference IC is a seeded PCG64
draw — a NumPy artifact, not ported dynamics; the C++ backend does not reproduce
NumPy's RNG. Frame 0 thus matches by construction; frames 1.. are the cross-stack
dynamics test (the stepping kernel is the unit under test). Stack-D regenerated
the IC via the same NumPy call; the Vulkan/C++ backend cannot. (§10 shift.)

## § 5 — Gates 4-13 results (charter §3)

doctest suite flipped Stage-1a RED → **GREEN** (3 cases / 9 assertions; exit 0;
`stage-1b-evidence/gates-green-…txt`):
- **gate-5** canonical fields (n²=16384 U,V; 11 captured frames). GREEN.
- **gate-7** determinism witness present (2-run bit-identical; O-2 ckpt 3). GREEN.
- **gate-9** bounded/dissipative (§L.4). GREEN.
- **gate-4** MMS observed L2 order = **2.0008** (within 2.0±0.5; 4-grid ladder
  N∈{16,32,64,128}, t_final=0.05, manufactured-source kernel). GREEN.
- **gate-13** replay: the Stage-1a RED anchor (5/5 fail) is now GREEN; registered
  `ctest -R rd2d_stack_c_tests` PASSES (2.32 s).

## § 6 — §L.7 O-2 checkpoints 2 & 3

- **Ckpt 2 — production reproduction at canonical scale (128²×2000):** the
  gate-14 precursor — Stack-C canonical trajectory is **byte-identical** to the
  Phase-1 NumPy f64 reference at every captured frame: `max_abs_err = 0.0` across
  all 11 frames (U+V), measured both in-test and via independent HDF5 dataset
  comparison (`capture-verify-…txt`: `byte_identical=True`). **Shape (a)
  BIT-EXACT confirmed at full horizon** — the refresh-probe step-1=0.0 prediction
  holds through 2000 steps. FIRST non-Warp shape-(a); FIRST Vulkan/C++ f64↔NumPy
  full-horizon bit-exact (§6.8 data point).
- **Ckpt 3 — canonical-scale 2-run determinism:** `assert_deterministic_run`
  (runs=2, tol=0.0) bit-identical; witness `493ffbbae5c124b599aff2628f03a397b514bf161acd748d814e30869fad2e4f`
  (Q-CPP1/Q-CPP3). NOTE (per smoke-E S1a-SME2 inheritance): ckpt 3 asserts
  determinism at canonical scale, NOT byte-reproduction of the grid-specific
  Stage-0 R-A1 digest `9d8ca9b0…`.

## § 7 — Canonical capture

`captures/reaction-diffusion-2d-stack-c/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`
(LFS). h5 oid/sha256 `00081dc42b192e653656705ca81c1c974735728efae10b6b2f9b6c0bce032f42`;
2,940,664 bytes. Q-CPP4-conformant (`payload.format="hdf5"`, non-empty
`run.start_utc`, sha256 checksum).

**S1b-RD2C2 (observation; Stage-1c forward-note):** the port .h5 FILE checksum
(`00081dc42b…`) differs from the reference .h5 (`bcae544ae5…`) even though the
state datasets U,V are byte-identical. Cause: HDF5 container metadata + the
`mass_U`/`mass_V` diagnostics (port uses naive accumulation; the reference's
`np.sum` is pairwise — a ~1e-13 difference). gate-14 (`compare_captures`) compares
DATASETS, not raw file bytes, so the state shape-(a) verdict holds and any
diagnostics delta is within `rel=1e-4`. Banked so Stage 1c does not misread the
file-hash difference.

## § 8 — Integrity + replay

- Integrity `python -m integrity --all --mode strict`: **0 HARD_FAIL, 14
  SOFT_WARN**; report digest `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`
  = baseline EXACT (HELD; the new C++ package + LFS capture add no report lines).
- Replay invariant: 8/8 PASS; sha256 `9399fc33…718909f34` byte-identical. **HELD.**

## § 9 — Hard Rule 2 assessment

All STOP conditions clear: charter vs dispatch no load-bearing conflict (charter
silent on 2nd kernel, not contradictory → S0-RD2C1 authoritative); R-A1 + socket
+ capture-oid resolve; **step-1/full-horizon port faithfulness HELD (max_abs_err
0.0, NOT a failure — the expected shape-(a) outcome)**; 2-run determinism
bit-identical; gate-4 order 2.0008 ∈ 2.0±0.5; integrity 0 new HF/SW; workspace 23;
top-level CMake registration did not break common-cpp targets (full build + all
ctests pass). **Hard Rule 2 NOT triggered.**

## § 10 — Shifts + cumulative + banked + forward-signal

- **S1b-RD2C1** — IC sourcing: the C++ port consumes the reference step-0 IC
  (NumPy PCG64 not reproduced; isolates the ported dynamics). §4.
- **S1b-RD2C2** — port .h5 file-checksum ≠ reference file-checksum while state
  datasets byte-identical (diagnostics naive-vs-pairwise sum + HDF5 metadata);
  gate-14 compares datasets. §7.

**Cumulative shifts: entering 236 → 238 (2 Stage-1b shifts).**

**Forward-signal (Stage 2 SHIFTED-tag):** charter §2 Stage-1b row should be
reconciled to the landed scope (plain + manufactured-source kernels + order
ladder) per S0-RD2C1 — a Stage-2 doc-landing reconcile, not a Stage 1b edit.

**Banked for cleanup (carry-in unchanged):** D16 (FloatControls f32-scoped);
R-CPPB2 CI Mesa-pin; B-CPPB2; prior §13 banks.

## § 11 — SHA back-fill discipline

`head_sha: PENDING-BACKFILL` (head_sha_at_checkpoint = the capture commit
`8a9d6fc`); back-filled to this checkpoint's commit in a separate commit
(Convention #12; never `--amend`; N1-tightened; full 40-hex via `git rev-parse HEAD`).

## § 12 — Next step

Operator routes **Stage 1c** (equivalence): formal gate-14 via `compare_captures`
(LEFT NumPy ref vs RIGHT Stack-C capture; `reaction-diffusion` rel=1e-4) →
shape (a) within_tolerance=True; tolerance-override no-op verify (D17, 4th skip);
cross-language interop fixture (Python reads the C++ .h5); O-2 ckpt 4 (formal
gate-14). Cumulative shifts entering Stage 1c: **238**.

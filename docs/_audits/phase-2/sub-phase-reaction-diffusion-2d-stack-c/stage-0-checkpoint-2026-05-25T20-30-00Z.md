---
artifact: stage-0-checkpoint
artifact_id: sub-phase-reaction-diffusion-2d-stack-c-stage-0
stage: stage-0
phase: 2
date: 2026-05-25T20-30-00Z
head_sha: 04a7d8f02672b0b9f4035c06ed178f2df31152d2
head_sha_at_checkpoint: 6ac0ec5add08fc95830a48f3fc0833891e05f94b
verdict: stage-0-CONFIRMED
verdict-state: CONFIRMED
parent_audits:
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-refresh-landing-2026-05-25T20-00-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-0-evidence/rd2d_ra1.cpp
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-0-evidence/ra1-determinism-2026-05-25T20-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-0-evidence/stage-0-replay-2026-05-25T20-30-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-0-evidence/stage-0-integrity-sweep-2026-05-25T20-30-00Z.txt
evidence_hashes:
  - "ra1-determinism: sha256:9d8ca9b08dce3fb6f78ac4261a165781a61e8cedb8db67627b7ecc32b676a766"
  - "stage-0-replay: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34"
  - "stage-0-integrity-sweep: sha256:c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52"
---

# Stage 0 checkpoint — `reaction-diffusion-2d` → Stack C (Vulkan / C++)

Pre-flight per charter §2 + §5 + §7 row "Stage 0" at HEAD `6ac0ec5`
(`docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md`). No source / scaffold /
registration (Stage 1a/1b). **Verdict: stage-0-CONFIRMED.**

## § 1 — Scope (charter authoritative)

Charter §2 Stage 0 row: "Convention-M anchor re-check; lavapipe f64 determinism
R-A1 anchor (O-2 ckpt 1); NoContraction baseline confirmation; integrity + replay
sweeps." (The charter has §1–§7; the dispatch's "§9" reference is absent at HEAD —
charter wins per §L.5 S1c-1, non-load-bearing, proceeded on charter scope.)

## § 2 — Pre-flight anchor verifications (Convention M; sha256-of-content)

| Anchor | sha256 (16) | vs refresh |
|---|---|---|
| `docs/conventions/sub-phase-conventions.md` | `0ab2c05868d0755d` | UNCHANGED |
| `docs/conventions/cross-stack-equivalence-methodology.md` | `48fca78275a312f5` | UNCHANGED |
| `docs/architecture.md` | `e82b7b8e4cc88441` | UNCHANGED |
| `docs/common/cpp.md` | `68e59c628022887f` | UNCHANGED |
| `common/common-cpp/include/bit_physics/common/common_cpp.hpp` | `38d73c1713e9abff` | UNCHANGED |

HEAD `6ac0ec5`; workspace members **23** (D11 invariant); cumulative shifts
entering **235**. **§1.9.1-cpp socket unchanged since bootstrap `fd8453b`**
(empty `git diff fd8453b HEAD` on `common_cpp.hpp` + `vulkan_compute.hpp` — Hard
Rule 2 socket-regression condition cleared). All anchors resolve. **CLEAN.**

## § 3 — R-A1 ephemeral Vulkan/C++ determinism digest (O-2 ckpt 1)

Representative ephemeral Gray-Scott f64 kernel (the refresh-probe shader
`stage-0-evidence/../plan-drafting-refresh-evidence/rd2d_step.comp`, `precise`→
SPIR-V `NoContraction`), K=100 ephemeral steps on the canonical IC, run RUNS=6 on
lavapipe (`VK_DRIVER_FILES=lvp_icd.json`, `LP_NUM_THREADS=0`). Harness
`stage-0-evidence/rd2d_ra1.cpp` consumes `vkcompute::{ComputeContext(require_float64),
StorageBuffer, ComputePipeline, dispatch}` + `hash::sha256_hex`.

```
device=llvmpipe (LLVM 20.1.2, 256 bits) float64=ENABLED
FloatControls assert at pipeline-context: PASS (f32-scoped)
multi-run bit-identity: 6/6
K(ephemeral steps)=100  N=128  posture=NoContraction(f64)
R-A1 ephemeral determinism digest (sha256-of-content): 9d8ca9b08dce3fb6f78ac4261a165781a61e8cedb8db67627b7ecc32b676a766
```

- **6/6 bit-identical** → Q-CPP3 (lavapipe element-wise no-atomics determinism)
  confirmed for the RD-2D Gray-Scott kernel surface. (FACT — measured.)
- **R-A1 anchor** `9d8ca9b0…b676a766` — RD-2D-Stack-C's own ephemeral determinism
  digest; **distinct** from bootstrap's `a7f85bd4…` (contracted FMA) and
  `48c92e95…` (NoContraction polynomial). Per Q-CPP1, this digest pins the
  NoContraction f64 posture and does NOT cross-validate the contracted baseline.
- **FloatControls assertion PASS** at context creation (Q-CPP2; f32 RTE+SZINP
  advertised — note f32-scoped per D16, the f64 path relies on lavapipe inherent
  IEEE-754 f64 + NoContraction; the bit-exact step-1 at refresh confirms sufficiency).

## § 4 — Scope analyses (charter §1/§3/§4)

- **Canonical-descriptor:** `gray-scott-lambda-128sq-seed42-step2000` confirmed at
  HEAD (`packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py:50`;
  S-RD2C4 closed). dtype **f64**.
- **Tolerance-override:** `[overrides.reaction-diffusion-2d]` present
  (`tools/testkit/equivalence/tolerance.toml:45-51`; rel=1e-4, abs=0.0). Reused
  unchanged; Stage 1c edit no-op (D17).
- **common-cpp socket:** §1.9.1-cpp covers RD-2D's needs (probe §7); unchanged
  since `fd8453b` (§2).
- **MMS gate-4 (NEW scope finding — S0-RD2C1):** RD-2D gate-4 (Cat 3 code
  verification) is **MMS single-arm**, NOT dual-arm like LBM-E (no closed-form
  golden table for Gray-Scott). It consumes the shared
  `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py`
  (present) via a 4-grid ladder N∈{16,32,64,128} at t_final=0.05, asserting
  observed L2 order within ±0.5 of formal order 2.0 (5-point Laplacian). The
  Stack-D reference exposes BOTH `step_diffuse_react` (plain) and
  `step_diffuse_react_with_source` (MMS variant). **→ Stage 1b scope: the Stack-C
  port must implement a SECOND kernel variant (Gray-Scott step + manufactured
  source term) and the order-ladder harness for gate-4.** Banked for Stage 1a/1b
  (§ 8).

## § 5 — Phase-1 reference capture verification (D14-class)

`captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`
present + LFS-tracked (oid `bcae544ae5…`; h5 2.94 MB). gate-14 LEFT-partner
confirmed accessible. RIGHT-partner (Stack-C Stage 1c output) ≈ 2.88 MB raw (128²
f64 × 2 fields × 11 frames) → **LFS-committable** (well under the 2 GB hook
ceiling); D14-class = committable, NOT held-local.

## § 6 — Integrity + replay sweeps

- **Integrity:** `python -m integrity --all --mode strict` → **0 HARD_FAIL,
  14 SOFT_WARN**; full-report digest **`c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52`**
  = baseline `c19492ad…d22cb52` EXACT. **Baseline HELD** (18th contiguous
  sub-phase). The 14 SW are the known pre-existing audit-link/golden-evaluator
  set (per memory `integrity-baseline-digest-method`).
- **Replay invariant (§ D.5):** `replay_prior_phase --prior-phase phase-1 --audit
  docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md --gates integrity,pytest,
  equivalence,determinism,perf-ledger,property,mutation,tolerance-budget` →
  8/8 gates PASS, `ok=True`; output sha256 **`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`**
  = invariant `9399fc33…718909f34` byte-identical. **HELD.**

## § 7 — Hard Rule 2 assessment

All eight dispatch STOP conditions checked, none triggered: (1) charter vs
dispatch — no load-bearing conflict (the §9 reference is benign); (2) §1.9.1-cpp
surface unchanged since `fd8453b`; (3) R-A1 kernel 6/6 bit-identical; (4) Phase-1
capture present, LFS oid resolves; (5) socket not regressed; (6) integrity baseline
EXACT (no new HF/SW); (7) workspace = 23; (8) FloatControls assertion PASS at
pipeline context. **Hard Rule 2 NOT triggered.**

## § 8 — Shifts + cumulative + banked cleanup

- **S0-RD2C1** — gate-4 is MMS single-arm; Stack-C Stage 1b must add an MMS-source
  kernel variant + 4-grid order-ladder harness (§ 4). Scope refinement (charter §2
  Stage 1b row did not enumerate the second kernel). **1 shift; cumulative 235 → 236.**

**Banked for cleanup-sub-phase (carry-in unchanged + this stage):** D16
(§1.9.1-cpp FloatControls f32-scoped — re-confirmed at R-A1, still NOT a blocking
gap); B-CPPB2 / `sha256_util.hpp` shim / R-CPPB2 CI Mesa-pin; LBM-E/smoke-E/
common-cpp-bootstrap §13 banks. No new cross-cutting cleanup item this stage.

## § 9 — Boundary + SHA back-fill discipline

Boundary honored: no source/scaffold/registration; no methodology/conventions/
tolerance.toml/cpp.md edits; no quirks-catalog extension; no push/tag. New files
only (checkpoint + evidence). `head_sha: PENDING-BACKFILL` back-filled to this
checkpoint's closing-commit SHA in a separate commit (Convention #12; never
`--amend`; N1-tightened, full 40-hex via `git rev-parse HEAD`).

## § 10 — Next step

Operator routes **Stage 1a** (scaffold + RED failing tests): CMake target skeleton
(port tree + plain step shader + MMS-source shader per S0-RD2C1), RED gates 4–13 +
gate-14 fixtures-absent. Cumulative shifts entering Stage 1a: **236**.

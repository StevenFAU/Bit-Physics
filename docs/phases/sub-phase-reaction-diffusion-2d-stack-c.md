# Sub-phase charter — `reaction-diffusion-2d` → Stack C (Vulkan / C++)

- **Sub-phase:** `sub-phase-reaction-diffusion-2d-stack-c`
- **Phase:** 2 (cross-stack equivalence ports; spec § 11.3)
- **Produced at:** plan-drafting-refresh, 2026-05-25T20-00-00Z (HEAD `fd8453b`)
- **Status:** CHARTERED (replaces the held chain's HELD-no-charter state; produced
  against the matured common-cpp substrate). D-class D9–D18 ratified per standing
  operator posture; refinements documented inline.
- **Predecessor:** held plan-drafting chain (`4f9e523`/`8605a31`/`f772f71`/`a33cb0b`,
  in-tree, HISTORICAL) + `sub-phase-common-cpp-bootstrap` (landing `fd8453b`,
  precondition RESOLVED). Refresh probe:
  `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-refresh-probe-2026-05-25T20-00-00Z.md`.

## § 1 — Canonical scope: what port, where, from/to

Port the Phase-1 NumPy reference `packages/reaction-diffusion-2d/` (Gray-Scott
reaction-diffusion 2D, explicit forward-Euler, 5-point Laplacian, periodic BC,
**f64**) to a **Stack-C Vulkan / C++** implementation consuming the §1.9.1-cpp
common-cpp substrate. **8th and final spec § 11.3 cross-stack port; FIRST Stack-C
port** in the portfolio. `SHIFTED` (operator routing, Stage 2): after this lands,
Phase-2 is **substantively complete** (8/8 spec § 11.3 ports landed); the **formal
close** (phase-level closing audit + `v0.2.0-phase-2` tag) is a dedicated **Stage 9 —
Landing** pass per Phase-2 plan § 2.12, not this sub-phase's Stage 2.

- **Canonical descriptor:** `gray-scott-lambda-128sq-seed42-step2000` — n=128,
  F=0.0367, k=0.0649, Du=0.16, Dv=0.08, dx=1.0, dt=1.0, seed=42, 2000 steps,
  capture interval 200 → 11 frames (steps 0,200,…,2000). dtype **f64**.
  (Resolves S-RD2C4: the `512sq/step1000` was a stale plan-table entry; the
  reference's `CANONICAL_DESCRIPTOR` at HEAD is `128sq/step2000`.)
- **Source of truth:** `reaction_diffusion_2d.reference.gray_scott_numpy`
  (`initial_condition`, `step`) — op-order is load-bearing; the port matches it
  byte-for-byte (probe § 6).
- **gate-14 LEFT-partner:** `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`.
- **gate-14 RIGHT-partner:** `captures/reaction-diffusion-2d-stack-c/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` (Stage 1c output).
- **f64 posture (D12):** the port targets f64 (`ComputeContextConfig::require_float64
  = true`; lavapipe `shaderFloat64` enabled, confirmed at probe). GLSL `double`
  buffers; SPIR-V `Float64` capability.
- **Contraction posture (D13; Q-CPP1):** **NoContraction** (`precise` GLSL →
  SPIR-V `NoContraction`), the NumPy-match path. The determinism gate pins the
  NoContraction posture and does NOT cross-validate the contracted FMA baseline.

## § 2 — Stage decomposition (6-stage split; smoke-E / LBM-E anchor)

| Stage | Deliverables | Gates |
|---|---|---|
| **plan-drafting-refresh** (DONE) | This charter + refresh probe (step-1 measured) + refresh landing + SHA back-fill | held HELD verdict resolved |
| **Stage 0 — pre-flight** | Convention-M anchor re-check; lavapipe f64 determinism R-A1 anchor (O-2 ckpt 1); NoContraction baseline confirmation; integrity + replay sweeps | pre-flight checkpoint |
| **Stage 1a — scaffold** | CMake target skeleton (port tree + shader); RED failing tests (gates 4-13 + gate-14 fixtures absent) | scaffold + RED evidence |
| **Stage 1b — implementation** | `SHIFTED` (S0-RD2C1; reconciled at Stage 2 to the landed scope): **two** f64 SPIR-V kernels — the plain Gray-Scott step **and** a manufactured-source variant — + run-loop + the **4-grid MMS order-ladder** harness (N∈{16,32,64,128}, gate-4) + capture-v1 HDF5 writer; CMake registration (D11); gates 4-13 GREEN; canonical capture; determinism O-2 ckpts 2/3. (Original row said "Full Gray-Scott f64 kernel"; gate-4 is MMS single-arm, so the port required the second kernel + ladder per the Stage-0 S0-RD2C1 banking — charter was silent, not contradictory.) | gates 4-13 GREEN |
| **Stage 1c — equivalence** | gate-14 cross-stack witness (`compare_captures` vs NumPy ref); tolerance-override **no-op** verify (D17, 4th skip); corpus fixture; O-2 ckpt 4 | **gate-14 GREEN** |
| **Stage 2 — landing** | Portfolio sweep (23 uv + Stack-C + common-cpp CMake targets); integrity baseline; replay invariant; methodology §6.7/§6.8 (Option α); §L.7 O-1 fourth-instance note; §L.9/cpp.md D16 note; charter §§ reconcile; CHANGELOG; gate-12 perf-row restoration (S2-RD2C1); landing audit. `SHIFTED` (operator routing, Stage 2): **Phase-2 formal close split out** — this landing delivers SUBSTANTIVE completeness (8/8 spec § 11.3 ports landed; cleanup + LFS-architecture sub-phases become routable), while the FORMAL close MECHANISM (phase-level closing audit + cross-cutting sweeps + proposed `v0.2.0-phase-2` tag) is a dedicated **Stage 9 — Landing** pass per Phase-2 plan § 2.12 (the §2.12 mechanism predates the sub-phase execution model; routed as its own dispatch). | all 14 gates GREEN |

Each stage closes with a checkpoint + SHA back-fill (Convention #12, separate
commit, never `--amend`).

## § 3 — Gate policy

All 14 gates apply (Phase-1 gates 1–13 + Phase-2 gate-14 cross-stack equivalence).

- **gate-14** is the cross-stack-equivalence witness: `compare_captures` LEFT
  (NumPy ref f64) vs RIGHT (Stack-C Vulkan/C++ f64) at `reaction-diffusion`
  category (rel=1e-4, abs=0.0). **Predicted shape (a) BIT-EXACT**
  (`within_tolerance=True`, `max_abs_err=0.0`) — grounded in the **measured**
  step-1 cross-stack seed-difference of EXACTLY 0.0 (probe § 6 Part B), NOT
  regime extrapolation. The gate **re-measures** at full horizon; no verdict is
  pre-committed.
- **Determinism gate:** 2-run bit-identity (`assert_deterministic_run`,
  tolerance 0.0) on the NoContraction f64 path (Q-CPP1). `LP_NUM_THREADS=0`;
  single-dispatch-per-submit + fence-wait; element-wise no-atomics kernel (Q-CPP3).
- **Q-CPP2 denorm caveat:** denorm-preserve/FTZ not pinnable on lavapipe; the S6
  trajectory keeps the field in the normal-f64 range (min ~1e-36), so the risk
  does not engage — but gate-14 MEASURES rather than assumes.
- **Q-CPP5 CI portability:** gate-14 asserts cross-stack bit-exactness vs the
  sealed NumPy reference (host-independent) + 2-run determinism — NOT a
  lavapipe-internal exact digest. The NoContraction f64 path is IEEE-754-RTE
  portable. `cpp-strict.yml` scopes any lavapipe-internal exact-digest assertion
  to the pinned Mesa/LLVM host.

## § 4 — Registration decision (D11; tolerance, override, workspace)

- **Build registration:** **CMake** — top-level `add_subdirectory` (like
  common-cpp), a Vulkan+HDF5-gated C++ target. **NOT** a uv workspace member
  (the port is C++/Vulkan, not Python). **uv workspace count stays 23.** This
  diverges from Stack-D/smoke-E/LBM-E (uv members) deliberately, on language
  grounds (S-RD2C5 / S-RD2C-r5).
- **Tolerance override:** `[overrides.reaction-diffusion-2d]` already present at
  HEAD (`tools/testkit/equivalence/tolerance.toml:45-51`, category `reaction-diffusion`, rel=1e-4, abs=0.0,
  established by RD-2D-Stack-D). Stack-C **reuses unchanged**; the Stage 1c edit is
  a **no-op** (D17; 4th port to skip after MPM-E + smoke-E + LBM-E).
- **Capture (Q-CPP4):** the Stage 1b HDF5 writer emits capture-v1-conformant
  `.h5` + `.json` (`payload.format="hdf5"`, non-empty `run.start_utc`, sha256
  checksum); validated cross-language via `compare_captures`, not only C++
  round-trip.

## § 5 — Risk + STOP surface (R-RD2C*)

| Risk | Level | Disposition |
|---|---|---|
| R-RD2C1 gate-14 verdict | LOW | step-1 measured 0.0 → shape (a) grounded |
| R-RD2C2 lavapipe f64 | LOW | `shaderFloat64` enabled (probe FACT) |
| R-RD2C3 FloatControls f32-scoped | LOW (observation) | f64 relies on inherent IEEE-754 + NoContraction; bit-exact confirms sufficiency |
| R-RD2C4 Q-CPP2 denorm | NEGLIGIBLE | field stays normal-f64; MEASURE at gate-14 |
| R-RD2C5 Q-CPP5 CI digest | LOW | assert cross-stack bit-exact vs ref, not host digest |
| R-RD2C6 CMake registration | LOW | common-cpp precedent |

**STOP surface (Hard Rule 2):** applies ONLY to a step-1 port-faithfulness failure
(a genuine defect) — as for LBM-E, the shape-(a) prediction is measured/grounded,
so a non-bit-exact gate-14 would indicate a port bug, not a surprise regime. A
surfaced common-cpp API gap (vs RD-2D needs) would also STOP and route back to
bootstrap — none surfaced (probe § 7).

## § 6 — Equivalence + verdict shape (§L.7 O-1 + methodology §6)

- **Predicted shape (a) BIT-EXACT** (`within_tolerance=True`, `max_abs_err=0.0`),
  grounded in the measured step-1 seed-difference = 0.0 (probe § 6 Part B).
- **§6.8 backend-pair (non-inheritance, explicit):** this is the FIRST empirical
  data point for the **Vulkan/C++ f64 (lavapipe, NoContraction) ↔ NumPy f64**
  pair — established independently, NOT inherited from Warp-CPU-f64↔NumPy. If
  gate-14 lands shape (a), RD-2D-Stack-C is the **FIRST non-Warp shape-(a)
  instance** and extends the backend-pair arithmetic-faithfulness observation to a
  second backend family. Bank in methodology §6.8 (additional data point) + §6.7.
- **§6.1 R-P2:** does NOT engage — (i) the trajectory is bounded/dissipative (no
  positive-Lyapunov amplification; probe § 6 Part A; corroborated by Stack-D's flat
  ~1.9e-14), AND (ii) the cross-stack seed-difference is zero. Either condition
  alone forecloses R-P2; both hold.
- **§L.7 O-1:** RD-2D-Stack-C is planned as a shape-(a) instance. Stack-D (same sim,
  Taichi↔NumPy) is shape (b) (`~1.9e-14`) — the (a)/(b) split is a **backend-pair**
  property, not a trajectory property (within-sim cross-backend corroboration,
  mirroring LBM-D/LBM-E).

## § 7 — Terminal / landing

- **Artifacts:** one canonical capture pair (`gray-scott-lambda-128sq-seed42-step2000.{h5,json}`,
  128² × 11 frames f64 ≈ a few MiB → LFS-committable).
- **Integrity baseline:** `c19492ad…d22cb52` (0 HF / 14 SW) — HELD; landing
  re-verifies (full `integrity --all --mode strict` report digest per memory
  `integrity-baseline-digest-method`).
- **Replay invariant:** `9399fc33…718909f34` — HELD; landing re-verifies.
- **Cumulative shifts:** entering plan-drafting-refresh 230 → 235 (5 refresh shifts).
- **Phase-2 substantive completeness + formal-close routing (`SHIFTED`, Stage 2):**
  this landing is the **8th of 8** spec § 11.3 ports, so Phase-2 is **substantively
  complete** and the comprehensive cleanup sub-phase + the deferred LFS-architecture
  sub-phase (D13) become routable. The **formal close** — a phase-level closing audit
  consolidating all 8 sub-phase landings + cross-cutting `verify_evidence`/perf-ledger/
  append-only sweeps + a proposed `v0.2.0-phase-2` tag (operator-only push; D12) — is
  the dedicated **Stage 9 — Landing** pass (Phase-2 plan § 2.12), routed as its own
  dispatch after this Stage 2 lands. The charter is authoritative that Phase-2 closes;
  the § 2.12 Stage-9 mechanism (authored for the superseded single-linear-dispatch
  model) is the close mechanism, executed separately.
- **Terminal discipline:** no push, no tag — operator action at landing per spec
  § 7.12 + standing D12 NO-TAG default.

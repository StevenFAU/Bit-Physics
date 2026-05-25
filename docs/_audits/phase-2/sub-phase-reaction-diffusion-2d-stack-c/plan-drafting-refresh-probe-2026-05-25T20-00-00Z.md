---
artifact: plan-drafting-refresh-probe
artifact_id: sub-phase-reaction-diffusion-2d-stack-c-plan-drafting-refresh
stage: plan-drafting-refresh
phase: 2
date: 2026-05-25T20-00-00Z
head_sha: PENDING-BACKFILL
head_sha_at_checkpoint: fd8453b597b8ed2d59402d356b57c10a70708888
verdict: MATURE — held-chain gaps CLOSED at common-cpp-bootstrap; step-1 cross-stack seed-difference MEASURED = 0.0 (shape (a) BIT-EXACT anchored); fresh charter PRODUCED
parent_audits:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-probe-2026-05-25T18-00-00Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/common-cpp-bootstrap-precondition-recommendation-2026-05-25T18-00-00Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-landing-2026-05-25T18-00-00Z.md
  - docs/_audits/phase-2/sub-phase-common-cpp-bootstrap/  (full chain, landing fd8453b)
evidence_paths:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-refresh-evidence/rd2d_step.comp
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-refresh-evidence/rd2d_probe.cpp
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-refresh-evidence/gen_ic.py
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-refresh-evidence/s6_traj.py
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-refresh-evidence/step1-measurement-2026-05-25T20-00-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/plan-drafting-refresh-evidence/s6-trajectory-2026-05-25T20-00-00Z.txt
---

# Plan-drafting-refresh probe — `reaction-diffusion-2d` → Stack C (Vulkan / C++)

8th and final spec § 11.3 cross-stack port; **FIRST Stack-C (Vulkan / C++) port**
in the portfolio. The held plan-drafting chain (probe `4f9e523` / precondition
`8605a31` / HELD landing `f772f71` / back-fill `a33cb0b`) returned **NOT-MATURE**
and surfaced a `common-cpp-bootstrap` precondition (Hard Rule 2 STOP, no charter).
That precondition is now **RESOLVED** at `sub-phase-common-cpp-bootstrap` landing
(HEAD `fd8453b`; C-0..C-7 GREEN; §1.9.1-cpp umbrella header operational; §L.9
Q-CPP1-5 catalog seeded). This refresh (a) verifies each held-chain gap closure,
(b) grounds fresh empirical measurements against the matured substrate, and
produces a fresh charter. Per the smoke-E 1c-revisited precedent, the refresh
appends new artifacts; the held chain stays in-tree (Convention A).

## § 1 — Scope

READ-ONLY probe (no source edits; new audit + evidence + charter commits only).
Load-bearing deliverables, per dispatch PROBE-MUST-HONOR (a)–(i):

- **(a)** Held-chain delta verification — S-RD2C1–S-RD2C5 closure status (§ 3).
- **(b)** S6-trajectory discipline at canonical resolution (§ 6, Part A).
- **(c)** Step-1 cross-stack seed-difference, **empirically measured** on the
  matured common-cpp Vulkan/C++ substrate (§ 6, Part B). **Load-bearing.**
- **(d)** § 6.8 backend-pair non-inheritance, documented empirically (§ 6, Part C).
- **(e)** common-cpp §1.9.1-cpp socket consumption assessment for RD-2D (§ 7).
- **(f)** Tolerance reuse assessment (§ 8).
- **(g)** §L.9 Q-CPP1–Q-CPP5 applicability map (§ 7).
- **(h)** Stage-decomposition authority — 6-stage split proposal (§ 9 + charter §2).
- **(i)** Workspace-registration nuance — uv-member vs CMake (§ 9 + charter §4).

## § 2 — Convention C/D/M/A discipline + HEAD anchors

All anchors verified at HEAD `fd8453b` (Convention M — HEAD wins on drift).
Anchor SHAs are **sha256-of-content** (S-CPPB6; per memory `doc-anchor-sha-is-sha256-not-git-blob`), NOT `git rev-parse` blob-sha1.

| Anchor | sha256-of-content (16) | Status |
|---|---|---|
| `docs/conventions/sub-phase-conventions.md` | `0ab2c05868d0755d` | FACT — §L.4–L.9 all inherited |
| `docs/conventions/cross-stack-equivalence-methodology.md` | `48fca78275a312f5` | FACT — §6 incl. §6.1/§6.7/§6.8 |
| `docs/architecture.md` | `e82b7b8e4cc88441` | FACT — closes S-RD2C2 (see § 3) |
| `docs/common/cpp.md` | `68e59c628022887f` | FACT — de-scaffolded consumption surface |
| `common/common-cpp/include/bit_physics/common/common_cpp.hpp` | `38d73c1713e9abff` | FACT — §1.9.1-cpp umbrella header |

- Workspace members: **23** (FACT — `pyproject.toml [tool.uv.workspace]`; common-cpp is CMake-registered, not a uv member).
- Cumulative shifts entering refresh probe: **230** (FACT — common-cpp-bootstrap landing).
- Determinism baselines: `a7f85bd4…` (contracted FMA) + `48c92e95…` (NoContraction); Q-CPP1 two-baseline rule.
- Integrity baseline `c19492ad…d22cb52` (0 HF / 14 SW HELD); replay invariant `9399fc33…718909f34` (HELD).

## § 3 — Held-chain delta verification (S-RD2C1–S-RD2C5 closure)

The held chain's gap-map at `8605a31` is **exactly** what the bootstrap landed.
Per-item closure status (Convention C/D — verify each closure at HEAD):

| Held shift | Held status | Closure at HEAD | Verdict |
|---|---|---|---|
| **S-RD2C1** plan-vs-reality: common-cpp was a scaffold, not mature | load-bearing blocker | `sub-phase-common-cpp-bootstrap` landed (`fd8453b`); §1.9.1-cpp operational (compute substrate + determinism socket + HDF5 capture-v1 + hash); C-0..C-7 GREEN | **RESOLVED** (FACT) |
| **S-RD2C2** architecture-sha "drift" (`e82b7b8e` vs `2aa8f227`) | OPEN | `e82b7b8e4cc88441` is the **sha256-of-content** at HEAD; `2aa8f227` was a `git`-blob-sha1 — two different hash spaces (B-CPPB1; memory `doc-anchor-sha-is-sha256-not-git-blob`). No content drift. | **FALSE POSITIVE — CLOSED** (SHIFTED→resolved) |
| **S-RD2C3** dangling `_staging/deps.md` | OPEN | bootstrap Stage 1c resolved the dependency surface to `docs/dependencies.md`; `_staging/deps.md` reference retired | **RESOLVED** (INFERENCE — bootstrap chain) |
| **S-RD2C4** canonical-descriptor `512sq/step1000` vs `128sq/step2000` | STILL ACTIVE | Phase-1 reference `CANONICAL_DESCRIPTOR = "gray-scott-lambda-128sq-seed42-step2000"` at HEAD (`packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py:50`); the `512sq/step1000` was a stale **phase-2 plan-table** entry, never the reference. Stack-C ports the reference canonical. Charter §1 reflects empirical canonical. | **RESOLVED — empirical canonical CONFIRMED** (FACT) |
| **S-RD2C5** CMake-not-uv registration nuance | structurally noted | RD-2D-Stack-C is a **C++/Vulkan** port → CMake registration like common-cpp, NOT a uv member; uv count stays 23. Diverges from Stack-D/E (Python/Warp/Taichi) uv-member pattern because the port language is C++. Charter §4 ratifies. | **RESOLVED — fresh §4 decision** (INFERENCE; § 9) |

**Held verdict-shape lean is NOT carried forward.** The held probe leaned "(b)
FP-round-off most likely / (c) R-P2 plausible (Vulkan↔NumPy arithmetically
further apart than Taichi↔NumPy)." Per the refresh mandate + smoke-E calibration
lesson, verdict shape is grounded in **empirical step-1 measurement** (§ 6), not
regime extrapolation. The measurement **overturns** the held lean (S-RD2C-r1, § 11).

## § 4 — Believed-state reconciliation (dispatch ENTERING STATE)

| Dispatch claim | Verdict at HEAD |
|---|---|
| HEAD `fd8453b`; cumulative 230; members 23 | CONFIRMED (FACT) |
| §1.9.1-cpp umbrella header operational | CONFIRMED — `common_cpp.hpp` includes capture/determinism/hash/vulkan_compute (FACT) |
| `docs/common/cpp.md` de-scaffolded | CONFIRMED (FACT) |
| §L.9 Q-CPP1-5 catalog seeded | CONFIRMED — applicability map § 7 (FACT) |
| Two determinism baselines available | CONFIRMED — `a7f85bd4` contracted / `48c92e95` NoContraction (FACT) |
| Toolchain: lavapipe Mesa/LLVM 20.1.2; glslang 15.1.0; libhdf5 1.10.10; HighFive 2.10.1 | CONFIRMED — probe ran on `llvmpipe (LLVM 20.1.2)`; glslang 15.1.0 (FACT, § 6) |
| `[overrides.reaction-diffusion-2d]` present | CONFIRMED — `tools/testkit/equivalence/tolerance.toml:45-51`, rel=1e-4 abs=0.0 (FACT, § 8) |

## § 5 — RD-2D-Stack-C port-specific risk surface (R-RD2C*)

| Risk | Assessment |
|---|---|
| **R-RD2C1** gate-14 verdict shape | **LOW.** Step-1 cross-stack seed-difference MEASURED = **0.0** (§ 6 Part B); shape (a) BIT-EXACT predicted, grounded (not extrapolated). STOP applies only to step-1-port-faithfulness failure (a real defect), as for LBM-E. |
| **R-RD2C2** f64 posture on lavapipe | **LOW.** `shaderFloat64` advertised + enabled on lavapipe (FACT, § 6); the port targets f64 (reference is f64). Charter §1. |
| **R-RD2C3** §1.9.1-cpp FloatControls is f32-scoped | **LOW (observation, not blocker).** Socket asserts f32 RTE+SZINP only; f64 path relies on lavapipe inherent IEEE-754 f64 + NoContraction. Bit-exact step-1 confirms sufficiency. NOT a Hard Rule 2 API gap (§ 7; S-RD2C-r3). |
| **R-RD2C4** Q-CPP2 denorm near-zero risk | **NEGLIGIBLE for this regime.** S6-trajectory min-field stays ~1e-36 (normal f64, ≫ ~1e-308 denormal threshold); denorm-preserve absence does not engage (§ 6 Part A; S-RD2C-r4). MEASURE at gate-14 per calibration. |
| **R-RD2C5** Q-CPP5 exact-digest CI portability | **LOW.** gate-14 asserts cross-stack bit-exactness **vs the sealed NumPy reference** (host-independent), not a lavapipe-internal digest; the NoContraction f64 path is the IEEE-754-RTE portable one. Charter §3/§4. |
| **R-RD2C6** CMake (not uv) registration | **LOW.** common-cpp precedent; uv stays 23. Charter §4 (§ 9; S-RD2C-r5). |

No STOP risk surfaced (the inverse of smoke-Stack-D); shape-(a) prediction is measured/grounded.

## § 6 — LOAD-BEARING: S6-trajectory + step-1 cross-stack seed-difference

Method: identical f64 IC fed to both stacks. The Phase-1 NumPy reference
(`gray_scott_numpy.initial_condition` + `step`, imported verbatim — no
re-implementation) generates `u0,v0` (IC) and `u1,v1` (one forward-Euler step);
the Vulkan/C++ port loads the **same** `u0,v0`, runs one dispatch, and is compared
to `u1,v1`. This isolates the step-1 **kernel arithmetic** (the cross-stack
seed-difference) from IC generation (identical by construction). IC+ref provenance
sha256 `81b3b869af878fb837aaee08e106527d2a7a5a6869905a35da084a4e3caa533b`.
Evidence: `plan-drafting-refresh-evidence/` (shader, harness, generators, logs).

### Part A — S6-trajectory regime (§L.4 + §L.8 R-SME9 at CANONICAL 128²)

Canonical `gray-scott-lambda-128sq-seed42-step2000` simulated full horizon:

| step | max\|U\| | max\|V\| |
|---|---|---|
| 0 | 1.000000000000 | 0.250999954041 |
| 200 | 0.999999873897 | 0.417311507136 |
| 1000 | 1.000000000000 | 0.355895614689 |
| 2000 | 1.000000000000 | 0.376076548674 |

**VERDICT: bounded / dissipative / pattern-forming.** `max|U| ≤ 1.0`,
`max|V| ∈ [0.25, 0.42]`, finite through the full horizon; min-field stays
~1e-36 (normal f64). NOT chaotic-amplifying — corroborates RD-2D-Stack-D's
flat `~1.9e-14` cross-stack diff (R-P2 falsified for the Taichi↔NumPy pair;
Stack-D landing § 6). The held chain's "CHAOTIC (Pearson λ-region)" label is
refined: pattern-forming but **no positive-Lyapunov amplification of the
cross-stack seed-difference over this horizon** (S-RD2C-r4). Note: even were it
chaotic, shape (a) is orthogonal to regime (smoke-E O-1 refinement) — a zero
seed-difference stays bit-exact through any horizon.

### Part B — Step-1 cross-stack seed-difference (Vulkan/C++ f64 lavapipe ↔ NumPy f64)

Faithful scratch port: `rd2d_step.comp` (GLSL `double`, `precise`→SPIR-V
`NoContraction`, periodic-BC modulo, op-order matched byte-for-byte to the
reference) compiled with glslangValidator 15.1.0 (`--target-env vulkan1.2`;
`OpCapability Float64` + `NoContraction` decorations confirmed in disassembly);
harness built on `ComputeContext(require_float64=true)` + `StorageBuffer`×4 +
`ComputePipeline` (4 std430 f64 bindings) + `dispatch` (16×16 workgroups); run on
lavapipe (`VK_DRIVER_FILES=lvp_icd.json`, `LP_NUM_THREADS=0`).

```
device      : llvmpipe (LLVM 20.1.2, 256 bits)
float64     : ENABLED
f32 RTE     : 1 | f32 SZINP: 1 | f32 denorm-preserve: 0 | f32 FTZ: 0
fc assert   : PASS (f32-scoped)
determinism : run1==run2 TRUE (bit-identical)
U: max_abs_err=0  ndiff=0/16384  max_rel_err=0
V: max_abs_err=0  ndiff=0/16384  max_rel_err=0
step-1 max_abs_err (both fields) = 0
```

**VERDICT: step-1 cross-stack seed-difference = EXACTLY 0.0** (FACT — measured;
`ndiff = 0/16384` on both U and V). The Vulkan/C++ f64 port is **byte-identical**
to the NumPy f64 reference at step 1. Run-to-run bit-identical (Q-CPP1/Q-CPP3).
→ **gate-14 predicted shape (a) BIT-EXACT** (`within_tolerance=True`,
`max_abs_err=0.0`), grounded in measurement. NO verdict pre-committed from regime;
the measurement decides, and the gate re-measures at full horizon.

### Part C — § 6.8 backend-pair non-inheritance (explicit)

§ 6.8 is explicit: Warp-CPU-f64↔NumPy `n=2` bit-faithfulness does **NOT**
auto-port to the Vulkan/C++↔NumPy pair (different backend, different toolchain).
This probe establishes the **FIRST empirical data point for the Vulkan/C++ f64
(lavapipe, NoContraction) ↔ NumPy f64 pair independently**: it IS bit-exact for
RD-2D step-1 (S-RD2C-r2). If RD-2D-Stack-C lands shape (a), it is the **FIRST
non-Warp shape-(a) instance** in the portfolio and extends the backend-pair
arithmetic-faithfulness observation to a **second backend family** (Vulkan/C++ f64
on lavapipe), when NoContraction + IEEE-754-RTE-f64 + NumPy op-order are
preserved. This is surfaced as a fresh observation, NOT inherited.

## § 7 — common-cpp socket consumption (item e) + Q-CPP1-5 applicability (item g)

**§1.9.1-cpp covers RD-2D's needs (no blocking API gap; S1c-CPPB3 re-verified for
RD-2D):** the probe consumed `vkcompute::{ComputeContext, StorageBuffer,
ComputePipeline, dispatch}` end-to-end with 4 f64 std430 bindings; `hash::sha256_hex`
for the determinism witness. Stage 1b/1c will additionally consume
`capture::Hdf5Writer` (capture-v1) + `determinism::assert_deterministic_run`.

One **socket observation (NOT a Hard Rule 2 gap)** — S-RD2C-r3: the `FloatControls`
struct + `assert_deterministic_float_controls()` are **f32-scoped** (RTE +
signed-zero/inf/nan preserve for Float32). An f64 port has no f64-FloatControls
assertion in the socket; it relies on lavapipe's inherent IEEE-754 f64 +
SPIR-V `NoContraction`. The measured bit-exact step-1 confirms this is sufficient.
The port still calls `assert_deterministic_float_controls()` (PASS, f32-scoped)
to assert the f32 levers are present. Bank as observation for cleanup/methodology.

| Quirk | Applicability to RD-2D-Stack-C |
|---|---|
| **Q-CPP1** FMA contraction two-baseline rule | Port chooses **NoContraction** (`precise` shader; SPIR-V `NoContraction` confirmed). NumPy-match path. Determinism gate pins the NoContraction posture; does NOT cross-validate the contracted baseline. |
| **Q-CPP2** FloatControls partial pinning | Assert f32 RTE + SZINP (PASS). Denorm preserve/FTZ NOT pinnable — **moot here** (S6 min-field ~1e-36, normal f64). MEASURE at gate-14. |
| **Q-CPP3** lavapipe element-wise determinism | Kernel is no-atomics, element-wise → run-to-run bit-identical (confirmed). `LP_NUM_THREADS=0` set in env/CI; single-dispatch-per-submit + fence-wait (substrate default). |
| **Q-CPP4** capture-v1 cross-language conformance | Stage 1b/1c writer must emit schema-conformant `.h5` + `.json` (`payload.format="hdf5"`, non-empty `run.start_utc`, sha256 checksum); validate via `compare_captures`, not only C++ round-trip. |
| **Q-CPP5** exact-digest CI portability | gate-14 asserts cross-stack bit-exactness vs the sealed NumPy reference (host-independent) + 2-run determinism, NOT a lavapipe-internal digest → portable. Charter §3/§4. |

## § 8 — Phase-1 surface mapping + tolerance reuse (item f) + S-RD2C4

- **Port source:** `packages/reaction-diffusion-2d/` (Phase-1 NumPy reference, f64).
- **Canonical (S-RD2C4 resolved):** `gray-scott-lambda-128sq-seed42-step2000` —
  n=128, F=0.0367, k=0.0649, Du=0.16, Dv=0.08, dx=1.0, dt=1.0, seed=42, 2000 steps,
  capture interval 200 → 11 frames (FACT, `packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py:50-65`). dtype **f64**.
- **gate-14 LEFT-partner:** `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` (manifest `dtype:"f64"`).
- **Tolerance reuse (FACT):** `[overrides.reaction-diffusion-2d]` present at HEAD
  (`tools/testkit/equivalence/tolerance.toml:45-51`), `category="reaction-diffusion"` → rel=1e-4, abs=0.0,
  "Established by sub-phase-reaction-diffusion-2d-stack-d Stage 1c." Stack-C
  **inherits unchanged**; the Stage 1c override edit is a **no-op** (4th port to
  skip after MPM-E + smoke-E + LBM-E).

## § 9 — Naming, stage decomposition (item h), registration (item i)

- **Naming (D1):** chain `sub-phase-reaction-diffusion-2d-stack-c-plan-drafting-refresh`
  (refresh variant per smoke-E 1c-revisited precedent); charter at
  `docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md`.
- **Stage decomposition (D7; h):** 6-stage split (smoke-E/LBM-E anchor) —
  plan-drafting-refresh (this) → Stage 0 (pre-flight) → Stage 1a (scaffold + RED)
  → Stage 1b (impl + registration + gates 4-13 + captures + O-2 ckpts 2/3)
  → Stage 1c (gate-14 cross-stack + override no-op + fixture + O-2 ckpt 4)
  → Stage 2 (portfolio + integrity + landing; Phase-2 close). Charter §2 authoritative.
- **Registration (D6; i):** **CMake** (top-level `add_subdirectory`, like common-cpp),
  **NOT** a uv workspace member — the port is C++/Vulkan, not Python. uv count
  stays **23**. Diverges from Stack-D/smoke-E/LBM-E (uv members) because the
  language is C++. Charter §4 ratifies (S-RD2C-r5).

## § 10 — D-class enumeration (numbering continues from held chain D1–D8)

NONE pre-committed; operator routes. Leans:

| D | Question | Lean |
|---|---|---|
| **D9** | Confirm refresh-chain naming + charter location? | YES (§ 9). |
| **D10** | Stage decomposition = 6-stage split? | YES (§ 9; charter §2). |
| **D11** | Registration = CMake (not uv member); uv stays 23? | YES (§ 9; S-RD2C-r5). |
| **D12** | f64 port posture (`require_float64=true`)? | YES — reference is f64; lavapipe f64 enabled (§ 6). |
| **D13** | Contraction posture = NoContraction (`precise`)? | YES — measured bit-exact (§ 6; Q-CPP1). |
| **D14** | gate-14 predicted shape (a) BIT-EXACT, grounded in step-1=0.0? | YES — measured (§ 6 Part B). |
| **D15** | §6.8 new backend-pair observation home (methodology §6.8 / §6.7)? | YES — first non-Warp shape-(a) candidate; bank as fresh data point (S-RD2C-r2). |
| **D16** | §1.9.1-cpp FloatControls f32-scoped observation → cleanup/methodology? | YES — bank (S-RD2C-r3); NOT a Hard Rule 2 gap. |
| **D17** | Tolerance override edit anticipated no-op (4th skip)? | YES (§ 8). |
| **D18** | Phase-2 closes formally on this landing (8/8 § 11.3 ports)? | YES — charter §7 + landing finishing-line. |

## § 11 — Refresh shifts surfaced (S-RD2C-r*)

Held shifts S-RD2C1–S-RD2C5 are **closures** (§ 3), already counted in the held
landing (218→223); they do not re-increment. New refresh shifts:

- **S-RD2C-r1 (most consequential)** — held verdict-shape lean OVERTURNED. Held
  predicted "(b) most likely / (c) R-P2 plausible"; measured step-1 cross-stack
  seed-difference = **0.0** → shape (a) BIT-EXACT. Calibration discipline (measure,
  don't extrapolate) vindicated; the "Vulkan↔NumPy arithmetically further apart"
  premise is empirically falsified.
- **S-RD2C-r2** — §6.8 new backend-pair data point: Vulkan/C++ f64 (lavapipe,
  NoContraction) ↔ NumPy f64 is bit-exact for RD-2D step-1. FIRST data point for
  this pair (non-inheritance honored); first non-Warp shape-(a) candidate.
- **S-RD2C-r3** — §1.9.1-cpp FloatControls API is f32-scoped; f64 ports rely on
  inherent lavapipe IEEE-754 f64 + NoContraction. Socket observation, NOT a
  blocking gap (Hard Rule 2 NOT triggered).
- **S-RD2C-r4** — S6-trajectory re-characterized bounded/dissipative pattern-forming
  (not chaotic-amplifying); Q-CPP2 denorm residual-risk moot (min-field normal-f64).
- **S-RD2C-r5** — registration is CMake (not uv member); uv stays 23 (C++ port,
  diverges from Stack-D/E uv pattern).

**Cumulative shifts: entering 230 → 235 (5 refresh shifts).**

## § 12 — Hard Rule 2 assessment

Five conditions checked: (1) HEAD drift vs anchors — NO (sha256-of-content match);
(2) common-cpp API gap vs RD-2D needs — NO (socket covers needs; FloatControls
f32-scope is an observation, not a gap); (3) Phase-1 trajectory unexpected — NO
(bounded/dissipative as expected); (4) lavapipe f64 determinism unachievable — NO
(run-to-run bit-identical); (5) step-1 port-faithfulness failure — NO (bit-exact).
**Hard Rule 2 NOT triggered.** The held chain's STOP is RESOLVED (precondition met).

## § 13 — Next step

Operator reviews this refresh, routes D9–D18, and dispatches Stage 0 (pre-flight)
separately. The fresh charter (`docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md`)
is produced alongside this probe; the refresh landing audit resolves the held
HELD verdict and records the Phase-2 finishing-line status.

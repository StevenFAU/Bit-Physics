---
artifact: precondition-recommendation
artifact_id: sub-phase-reaction-diffusion-2d-stack-c-plan-drafting
stage: plan-drafting
phase: 2
date: 2026-05-25T18-00-00Z
head_sha: 8605a31f2e65f64dd4d45826aa578fc96f44d17e
head_sha_at_checkpoint: 15453bb5698ce31b109fb711444e335ffab488ac
verdict: RECOMMENDATION — route a `common-cpp-bootstrap` precondition sub-phase before RD-2D-Stack-C charter
supersedes: (none — this artifact stands in lieu of a charter; the RD-2D-Stack-C charter is deferred to post-bootstrap)
---

# common-cpp-bootstrap — precondition recommendation (in lieu of RD-2D-Stack-C charter)

This artifact is the COMMIT-2 deliverable of the RD-2D-Stack-C plan-drafting
stage. Because the load-bearing maturity gate resolved **NOT MATURE** (probe
§ 4), there is no socket to charter RD-2D-Stack-C against; per Hard Rule 2 the
stage surfaces a **`common-cpp-bootstrap` PRECONDITION sub-phase** instead. This
recommendation is the precedent-consistent analog of `sub-phase-common-warp-
bootstrap` (which matured common-warp's § 1.9.1 socket before the Stack-E ports
could consume it). **Operator routes** this precondition; only after it lands
can RD-2D-Stack-C (and the remaining Stack-C ports) charter.

---

## § 1. Why a precondition (not inline)

The phase-2 plan (HEAD `87cd30bd…`) **forbids extending the common module
inside a Phase-2 port stage** ("do NOT extend the common module … Common-module
surface area changes are explicitly outside Phase 2 scope") and **assumes
common-cpp is mature from Phase 1** (row 2.1.C "consumes `common-cpp`"; "must be
mature"). The landed common-cpp is a Phase-1-Stage-1 scaffold (probe § 4). The
two cannot be reconciled inside RD-2D-Stack-C without violating the plan's "do
NOT extend" rule. A dedicated bootstrap sub-phase resolves the contradiction the
same way `common-warp-bootstrap` did for Stack-E: it matures the shared module
in its own scope, leaving the per-sim ports to *consume* (not extend) it.

**Leverage:** common-cpp is consumed by **four** Stack-C work-items
(spec § 11.2 items 1.4/1.6/1.7 + § 11.3 item 2.1.C → RD-2D, sph-water, smoke,
LBM on Stack C). The bootstrap de-risks all of them once, not four times.

**Alternative (D2 in probe § 9):** inline a minimal Vulkan path in
`ref-stack-c/` per cpp.md's "the per-sim phase that first needs them" framing.
Documented for completeness; NOT recommended (violates the plan's "do NOT
extend"; does not de-risk the other three Stack-C ports; duplicates the substrate).

---

## § 2. Gap → deliverable mapping (probe § 4.2 socket gaps → bootstrap scope)

| § 1.9.1 socket gap (probe § 4.2) | Bootstrap deliverable |
|---|---|
| **Runtime / executable Vulkan compute substrate** (vulkan_init.hpp declarations-only; render-oriented; no compute) | A real compute substrate: instance + device creation bodies; **compute** queue + command buffers; descriptor sets; **compute pipeline + SPIR-V module load**; buffer alloc / host-upload / device-readback; dispatch + fence/timeline sync. (The render-oriented `Swapchain`/`PresentModePolicy` surface is NOT needed for headless compute and may stay declarations-only.) |
| **Determinism (execution-enforced)** (Config struct + argv only) | `assert_deterministic_run` analog (2-run output-buffer-digest bit-identity harness); a pinned deterministic-execution backend (recommend Mesa **lavapipe** software Vulkan); FloatControls discipline (`NoContraction`/`precise`, `RoundingModeRTE`, `DenormPreserve`, `SignedZeroInfNanPreserve` where advertised). Establishes the C-stack determinism baseline digest (the analog of common-warp's W-2 `24d44c7e…`). |
| **Capture I/O (compare-ready)** (`raw-binary-v1`, not HDF5; `SHIFTED-NEEDS-HDF5-VENDOR`) | HDF5 capture (vendor libhdf5 via FetchContent, or equivalent), `compare_captures`-compatible with the Phase-1 HDF5 references — OR (D3) extend `compare_captures` with a raw-binary reader. Resolve the `cpp-ts:SHIFTED-NEEDS-HDF5-VENDOR` debt. |
| **Data structures / harness** (none) | OPTIONAL — a minimal 2D field/buffer abstraction + run-loop, OR adopt the warp.md § 6.1 **socket-only** posture (sims roll their own buffers). Lean: socket-only (matches the f64/f32 socket-only principle; minimal surface). |
| **Smoke consumer** (`advection_1d.cpp` is host-C++, never touches Vulkan) | A **Vulkan-compute** smoke sim (e.g. 2D advection-diffusion on lavapipe) exercising substrate + determinism + HDF5 capture end-to-end — the analog of common-warp's `examples/hello/sim.py`. De-risks all three matured sockets. |
| **Vulkan/C++ quirks catalog** (§ L.6 O-W7 is Warp-only; probe (h)) | Initiate a Vulkan/C++ quirks catalog (FMA contraction, FloatControls, denorm flush, `shaderFloat64` gating, SPIR-V optimizer FMA-folding) — a § L.x sibling or methodology subsection, formalized at the bootstrap's Stage 2. |

---

## § 3. Proposed stage decomposition (mirrors common-warp-bootstrap's 6-stage shape)

`common-warp-bootstrap` ran plan-drafting + Stage 0 (empirical pre-flight +
determinism baseline) + Stage 1a/1b/1c (socket build, split for the large
surface) + Stage 2 (landing). Proposed analog (agent ratifies at the
bootstrap's own charter):

| Stage | Proposed scope |
|---|---|
| **plan-drafting** | bootstrap charter + probe (Vulkan toolchain HEAD-verify: SDK/loader version, lavapipe availability, libhdf5 vendoring cost; § 1.9.1-cpp socket contract framing). |
| **Stage 0** | empirical pre-flight: pin the deterministic backend (lavapipe); establish the **C-stack determinism baseline digest** (a minimal compute shader dispatched 2× → bit-identical output-buffer sha256, the `24d44c7e…` analog); FloatControls capability probe; canonical-descriptor scope-analysis (§ N). |
| **Stage 1a** | Runtime substrate — instance/device/compute-queue/command-buffer/descriptor/pipeline/buffer-IO + CMake top-level registration (NOT a uv member — § 4.5 of probe). |
| **Stage 1b** | Determinism socket (`assert_deterministic_run` analog + FloatControls discipline) + HDF5 (compare-ready) capture (resolve `SHIFTED-NEEDS-HDF5-VENDOR`). |
| **Stage 1c** | § 1.9.1-cpp socket reconciliation + Vulkan-compute smoke sim + `docs/common/cpp.md` update (de-scaffold; drop the "Out of scope this stage" deferrals as they land) + W-gate-analog cross-stack format-interop check. |
| **Stage 2** | landing: integrity-sweep baseline-MATCH, replay HELD, regression, Vulkan/C++ quirks catalog formalization, CHANGELOG, roll-up. |

**Gate-analog plan:** mirror common-warp-bootstrap's W-Gates (Capture I/O,
Determinism, Smoke simulator, Public API documented, Cross-stack format-interop,
Integrity gates) recast for the C-stack. Cross-stack equivalence at the
**numeric** level remains per-sim-port scope (deferred to RD-2D-Stack-C); the
bootstrap proves **format interoperability** + same-device determinism, exactly
as common-warp-bootstrap's W-5 did.

---

## § 4. Registration + member-count nuance (divergence from common-warp-bootstrap)

common-warp-bootstrap registered the **20th uv workspace member** at Stage 1a.
common-cpp is a **CMake/C++ project** (consumed via
`target_link_libraries(... bit_physics::common_cpp)`), **not** a uv member —
so `common-cpp-bootstrap` does **NOT change the uv member count (stays 23)**.
Its registration analog is the deferred **top-level CMakeLists.txt subdirectory
registration** that cpp.md currently assigns to "Stage 3". The bootstrap charter
must reconcile this (the project root currently has no C++ build aggregation;
CI builds common-cpp via its own `cmake -S common/common-cpp`).

---

## § 5. What this UNBLOCKS

Once `common-cpp-bootstrap` lands with the three sockets mature + the
Vulkan-compute smoke GREEN:

- **RD-2D-Stack-C** charters normally (6-stage per-sim port; S6 on-Stack-C
  simulation at canonical 128² becomes executable; Stage-0 R-A1 anchor becomes
  implementable; step-1 cross-stack seed-difference becomes MEASURABLE → verdict
  shape grounded per probe § 6).
- The remaining Stack-C work-items (sph-water, smoke, LBM on Stack C, if/when
  routed) consume the same matured socket.
- spec § 11.3 enumeration can then close on the RD-2D-Stack-C landing.

---

*Recommendation close. Operator routes `sub-phase-common-cpp-bootstrap` (or
selects the D2 inline alternative). RD-2D-Stack-C plan-drafting HOLDS until the
precondition resolves — see the plan-drafting landing audit.*

---
artifact: stage-1a-checkpoint
artifact_id: sub-phase-reaction-diffusion-2d-stack-c-stage-1a
stage: stage-1a
phase: 2
date: 2026-05-25T21-00-00Z
head_sha: PENDING-BACKFILL
head_sha_at_checkpoint: PENDING-BACKFILL
verdict: stage-1a-CONFIRMED
verdict-state: CONFIRMED
parent_audits:
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-0-checkpoint-2026-05-25T20-30-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1a-evidence/red-suite-2026-05-25T21-00-00Z.txt
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-c/stage-1a-evidence/shader-compile-2026-05-25T21-00-00Z.txt
---

# Stage 1a checkpoint — `reaction-diffusion-2d` → Stack C (Vulkan / C++)

Scaffold + RED per charter §2 row "Stage 1a" at HEAD
(`docs/phases/sub-phase-reaction-diffusion-2d-stack-c.md`): "CMake target
skeleton (port tree + shader); RED failing tests (gates 4-13 + gate-14 fixtures
absent)." No implementation, no top-level registration (Stage 1b). **Verdict:
stage-1a-CONFIRMED.**

## § 1 — Scope (charter authoritative)

Charter §2 Stage 1a row. The C++ RED-anchor mechanism is NOT prescribed by the
charter — chosen by agent judgment (§ 4) and NOT paraphrased from the Python
`ModuleNotFoundError` precedent (§L.5 S1c-1 caution honored: C++ ≠ Python).

## § 2 — Anchor re-verification (Convention M)

HEAD entering `f1cb102`. Anchors unchanged (sha256-of-content): conventions
`0ab2c058…`, methodology `48fca782…`, architecture `e82b7b8e…`, cpp.md
`68e59c62…`, common_cpp.hpp `38d73c17…`. §1.9.1-cpp socket unchanged since
`fd8453b`. R-A1 anchor `9d8ca9b0…` (Stage 0) unchanged. Phase-1 ref capture LFS
oid `bcae544ae5…` resolves. Workspace members **23** (D11). All resolve. CLEAN.

## § 3 — Scaffold layout (additive; `packages/reaction-diffusion-2d-stack-c/`)

```
shaders/gray_scott_2d.comp        plain f64 NoContraction Gray-Scott step (push-constant nx/ny + f64 params)
shaders/gray_scott_2d_mms.comp    manufactured-source variant (gate-4 / S0-RD2C1; src_u,src_v bindings)
include/bit_physics/reaction_diffusion_2d_stack_c/gray_scott.hpp   port API (run_gray_scott, mms_observed_l2_order)
src/gray_scott.cpp                Stage-1a STUB (throws NotImplemented) — the RED anchor; Vulkan-free
tests/test_main.cpp               doctest main
tests/test_gray_scott.cpp         gates 4-13 surface (RED): gate-5 fields / gate-9 bounded / gate-7 determinism
tests/test_mms_order.cpp          gate-4 MMS 4-grid order ladder (RED)
tests/test_cross_stack_equivalence.cpp   gate-14 RIGHT-capture writer + fixture-absent (RED)
CMakeLists.txt                    target skeleton; top-level add_subdirectory deferred to Stage 1b (D11)
README.md
```

The two-shader structure (plain + MMS-source) accommodates S0-RD2C1 WITHOUT
locking in impl (the C++ run-loop + ladder harness are Stage 1b). The API header
declares both `run_gray_scott` (canonical seeded trajectory + optional capture-v1)
and `mms_observed_l2_order` (gate-4). Defaults are the canonical descriptor.

## § 4 — RED-anchor mechanism + evidence

**Mechanism (agent judgment; charter-unprescribed):** C++ TDD RED — the impl is a
stub (`src/gray_scott.cpp` throws `NotImplemented`), and the doctest suite calls
the declared API so each TEST CASE fails deterministically with a clear "not yet
implemented (Stage 1b …)" signal. This is the C++ analog of the Python stacks'
collection-time RED (clean, intentional, deterministic) — NOT a paraphrase of the
Python mechanism (a C++ link/compile-error RED was rejected as messier).

Built standalone (doctest v2.4.11 from the FetchContent tree; stub has no Vulkan
dependency) and run (`stage-1a-evidence/red-suite-…txt`):

```
[doctest] test cases: 5 | 0 passed | 5 failed | 0 skipped
[doctest] Status: FAILURE!   exit_code=1
```

All 5 cases THREW `NotImplemented` — gates 4-13 surface (3), gate-4 MMS ladder (1),
gate-14 RIGHT-capture (1). **RED confirmed.** Stage 1b flips these GREEN.

## § 5 — Shader compile verification

Both shaders compile under glslangValidator 15.1.0 (`--target-env vulkan1.2`):
`gray_scott_2d.comp` (7000 B SPIR-V), `gray_scott_2d_mms.comp` (7120 B). Both use
`double` (`Float64` capability) + `precise` (`NoContraction`) — the same f64
NoContraction constructs verified bit-exact at the refresh probe + Stage-0 R-A1.
(`stage-1a-evidence/shader-compile-…txt`.) Note: the plain shader is now
push-constant-parameterised (nx/ny + f64 scalars) to serve the MMS 4-grid ladder;
f64-push-constant **execution** is a Stage-1b verification (Stage 1a compiles only).

## § 6 — Boundary honored

- NO implementation (stub only); NO top-level CMake registration (`grep` of
  top-level `CMakeLists.txt` for the port = absent — Stage 1b per charter §2).
- NO methodology/conventions/equivalence/tolerance.toml/cpp.md edits; NO quirks
  catalog extension; NO push/tag.
- Additive-only (Convention A): all changes are new files under
  `packages/reaction-diffusion-2d-stack-c/` + the audit dir. Workspace **23**
  (D11 invariant; CMake-not-uv).

## § 7 — Hard Rule 2 assessment

All STOP conditions clear: charter vs dispatch — no load-bearing conflict (the
charter has §1–§7; the dispatch's "§4 row Stage 1a / §9" references resolve to the
§2 stage table — non-load-bearing, charter scope followed per §L.5 S1c-1); R-A1
`9d8ca9b0…` matches Stage 0; socket unchanged since `fd8453b`; capture oid
resolves; workspace = 23; the RED-anchor mechanism is well-specified once chosen
(not ambiguous — agent judgment exercised, documented). **Hard Rule 2 NOT triggered.**

## § 8 — Shifts + cumulative + banked + forward-signal

- **No new shift this stage.** The MMS two-kernel scope was banked as S0-RD2C1
  (Stage 0); the scaffold realises it. **Cumulative shifts entering Stage 1b: 236.**
- **Forward-signal (Stage-1b dispatch handles):** charter §2 Stage-1b row reads
  "Full Gray-Scott f64 kernel + run-loop"; per S0-RD2C1 Stage 1b must implement
  TWO kernels (plain + manufactured-source) + the 4-grid order-ladder harness for
  gate-4. The scaffold has both shader slots + the `mms_observed_l2_order` API; a
  charter §2 Stage-1b clarification (or in-stage note) covers it. Signal-only here.
- **Banked for cleanup (carry-in unchanged):** D16 (FloatControls f32-scoped);
  B-CPPB2 / `sha256_util.hpp` shim / R-CPPB2 CI Mesa-pin; prior §13 banks.

## § 9 — SHA back-fill discipline

`head_sha` + `head_sha_at_checkpoint` carry `PENDING-BACKFILL`; back-filled in a
separate commit (Convention #12; never `--amend`; full 40-hex via
`git rev-parse HEAD`): `head_sha_at_checkpoint` = the scaffold commit; `head_sha`
= this checkpoint's commit.

## § 10 — Next step

Operator routes **Stage 1b** (implementation): top-level `add_subdirectory`
registration (D11); the Vulkan/C++ f64 NoContraction kernel + run-loop consuming
§1.9.1-cpp (`vkcompute` + `capture::Hdf5Writer` + `determinism::assert_deterministic_run`);
the manufactured-source variant + 4-grid ladder (gate-4 / S0-RD2C1); gates 4-13
GREEN; canonical capture; determinism O-2 ckpts 2/3. Cumulative entering Stage 1b: **236**.

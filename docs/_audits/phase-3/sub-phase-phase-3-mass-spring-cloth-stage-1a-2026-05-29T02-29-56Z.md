---
date: 2026-05-29T02-29-56Z
author: phase-3 mass-spring-cloth stage-1a (Claude Code)
subject: Phase 3 task-5 mass-spring-cloth STAGE 1a (scaffold + RED) — packages/mass-spring-cloth/ + serial-GS XPBD shader + RED doctest acceptance suite + gate-3 ctest evidence + spec-ref/derivation skeletons + DEFAULT determinism row
verdict: CONFIRMED-RED
head_sha: b481ab8
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3
gate_3_failing_tests_sha256: ac64b1de3636359f358c928202a6e54d309551354ec0ede6f2392335074816ea
evidence_paths:
  - packages/mass-spring-cloth/include/bit_physics/mass_spring_cloth/cloth.hpp
  - packages/mass-spring-cloth/shaders/cloth_xpbd.comp
  - packages/mass-spring-cloth/tests/test_cloth.cpp
  - docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md
  - tools/testkit/golden/derivations/cloth-catenary-limit.md
  - tools/testkit/determinism/registry.toml
  - tools/testkit/failing-tests-evidence/mass-spring-cloth-2026-05-29T02-29-56Z.txt
evidence_hashes:
  packages/mass-spring-cloth/include/bit_physics/mass_spring_cloth/cloth.hpp: sha256:f0488e4b0e95a17dcd1d12665a150ff8820cb284f9b566ae4eb5a7654429df98
  packages/mass-spring-cloth/shaders/cloth_xpbd.comp: sha256:5bedb0f5d72b9803a148eff026488a5fa6809f03d1f1c0abb699219fa3902cfe
  packages/mass-spring-cloth/tests/test_cloth.cpp: sha256:abc17244a0cfadef5592a826c5707901b465fa57a2e7d710ae6fa56a76cc4f6b
  docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md: sha256:a002f6db459ef352433ea16f827aaef03c06f381f897ed3acca8bb1c201f69d3
  tools/testkit/golden/derivations/cloth-catenary-limit.md: sha256:8d8a09259a0f781358cbc222875edfabcb4a8e47b27ac4e3fa6fa36666bb3494
  tools/testkit/determinism/registry.toml: sha256:9ad2b189bb428b53b997f15c407650e1d07717eaada0752164faff5ca2e15905
  tools/testkit/failing-tests-evidence/mass-spring-cloth-2026-05-29T02-29-56Z.txt: sha256:ac64b1de3636359f358c928202a6e54d309551354ec0ede6f2392335074816ea
---

# Phase 3 — mass-spring-cloth (task-5) — Stage 1a audit (scaffold + RED)

> Scaffold the first NEW Stack-C sim + first soft-body category, with a genuine
> RED doctest acceptance suite (gate-3). Verdict **CONFIRMED-RED** — Stage 1b
> (implementation → GREEN) unblocked.

## Deliverables (Stage 1a)

- **Package** `packages/mass-spring-cloth/` (flat: `include/` `src/` `shaders/`
  `tests/`, NO `cpp/` subdir — D-LAYOUT): `cloth.hpp` public API,
  `shaders/cloth_xpbd.comp` serial-GS XPBD compute shader (single invocation,
  fixed constraint order, f64, `precise`/NoContraction, no atomics/subgroups —
  charter D-DET), `src/cloth.cpp` RED stub (throws), doctest acceptance suite.
- **CMake**: gated on `bit_physics_common_cpp_vulkan` AND `_hdf5`; registered in
  the top-level `CMakeLists.txt` after `reaction-diffusion-2d-stack-c` (NOT a uv
  member — uv stays 23). Builds clean; shader compiles via glslang.
- **Skeletons**: `docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md` (§3.2.8
  sheet) + `tools/testkit/golden/derivations/cloth-catenary-limit.md` (3 D-ANCHOR
  anchors + catenary-LIMIT regime note + golden-value recipe).
- **Determinism registry**: `[soft-body.mass-spring-cloth]` DEFAULT row (first
  soft-body + first Stack-C SIM row; bit-exact / same-stack-same-hw / serial-GS
  lavapipe realization; MEASURED at 1b).

## RED evidence (gate-3)

`ctest -R mass_spring_cloth_tests --output-on-failure` → **4/4 doctest cases
FAIL** (`run_cloth` / `build_grid_positions` not implemented — Stage 1a RED).
Captured to `tools/testkit/failing-tests-evidence/mass-spring-cloth-2026-05-29T02-29-56Z.txt`
with variable timing lines normalized (`<NORMALIZED>`) for gate-13 replay
stability. footer sha256 `ac64b1de…16ea` (matches the committed file). [FACT]

The acceptance tests assert regime-level physics computable without golden files:
(1) at-rest zero-motion (gravity off, rest config → no motion); (2) hanging chain
catenary-limit (pins held at span D=18 < rest length 31 → sags symmetrically,
monotone descent); (3) stretched chain linear-elastic (pins at gap 10.5 > rest
span 7 → uniform extension, collinear); (4) determinism witness produced. Golden
**value** comparisons (catenary / stretched) are gate-4 at Stage 1b.

## Commit chain (Stage 1a)

- `889b79e` — package scaffold (header + serial-GS shader + RED stub + suite +
  CMake) + top-level registration.
- `dff007a` — spec-ref + catenary derivation + DEFAULT determinism row.
- `b481ab8` — RED ctest evidence (gate-3, footer sha256).

## Verdict

**CONFIRMED-RED.** Scaffold builds; suite RED (4/4); evidence captured + hashed;
DEFAULT determinism row + skeletons landed. Stage 1b (real serial-GS XPBD →
GREEN, golden tables, PBT, D-DET measure) unblocked.

# C-1 / U-3 `lattice-boltzmann-d3q19` frontier-moment-encoded — pre-implementation probe (gate 2)

> **Cluster:** Phase 6 / C-1 (charter `docs/phases/phase-6/c1-charter.md`, RATIFIED § 10;
> D-2 ratified: new quantization tolerance category, measured-then-declared).
> **Unit:** U-3 = Phase-4 ledger row 29 / spec § 11.5 item 4.21 — Stack C.
> **Session:** build dispatch 2026-06-11; probe at HEAD `0e2f28b` (U-1, U-2 landed; CI 10/10
> green at both).

## § 1 — SHIFT: charter § 3.3 premise corrected on measured reality (dispatch § 4.5 minor path)

The charter § 3.3 phrase "on the **landed Stack-C D3Q19 parent**" is WRONG — measured at
HEAD, **no Stack-C LBM exists**. The landed LBM surfaces are: the Phase-1 numpy reference
(`packages/lattice-boltzmann-d3q19`, capture `captures/lbm-ref/poiseuille-64x32-seed42-step1000`
+ couette), the Phase-2 Stack-D Taichi port, and the Phase-2 Stack-E Warp port. **Scope is
unchanged** by the correction: the ratified unit (original ledger stack assignment `C`,
charter "Stack: C — CONFIRM"; batch-3's "heavy Stack-C Vulkan lift" assessment priced
exactly this) ships the moment-encoded variant as the **first Stack-C LBM surface**, with
the bounded-quantization equivalence target being the **landed parent capture**
(`lbm-ref`, numpy-reference) — which is what anchor (c) already named. Documented here;
not silently absorbed (HARD RULE 2); proceed per dispatch § 4.5 (no scope change).

## § 2 — Landed surfaces (measured at HEAD)

- **Stack-C precedent:** `packages/reaction-diffusion-2d-stack-c/` — the ONLY landed
  Stack-C package: CMake subdirectory (NOT a uv member, D11), GLSL compute shaders
  embedded via `bitphysics_embed_compute_shader`, f64 `require_float64` + NoContraction,
  doctest suite + capture-writer executable + a uv-driven Python gate-14 ctest reading the
  C++-emitted `.h5` through `compare_captures`. Lavapipe pin
  `VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json` + `LP_NUM_THREADS=0` (CI
  `cpp-strict.yml`; locally `lvp_icd.json` present, llvmpipe reported by vulkaninfo).
- **Parent reference:** `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/`
  — D3Q19 velocity set + weights (`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/constants.py:39`-66), Qian-1992 equilibrium
  (`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/equilibrium.py:33`-53), BGK collide + lex-ordered stream + Guo-2002 body force
  (`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/bgk.py:45`-112), half-way bounce-back y-walls (`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/bgk.py:145`-216), density/momentum
  moments (`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/equilibrium.py:101`-112). All f64. Canonical capture
  `poiseuille-64x32-seed42-step1000` (64×32×3, force_x=1e-5, 202 MB, present locally) +
  `couette-32x16-seed42-step500`.
- **§ 4.2.B socket is vestigial for this row** (measured): the sparse consumer is row 18
  (sparse-amr, Phase-4-CUDA-parked); the moment-encoded variant consumes no SparseVolume /
  NanoVDB surface. Charter § 3.3 already listed no WU-B deliverable; recorded here.
- **Tolerance:** `[defaults.lbm] relative=1e-5` (`tools/testkit/equivalence/tolerance.toml:38`-40) with equal budget
  cap. D-2 ratifies a NEW category for the vs-parent quantization equivalence; the Cat-X
  gate accepts operator-approved amendments at
  `docs/_audits/tolerance-budget-amendments/*.md` (verdict: CONFIRMED + amendments list) —
  the D-2 ratification (charter § 10) is the operator approval this amendment will cite.

## § 3 — Plan of record

- **Package:** `packages/lattice-boltzmann-d3q19-frontier-moment-encoded/` (CMake
  subdirectory per the RD2D-stack-c D11 precedent; NOT a uv member). GLSL compute shader
  (f64, NoContraction) implementing the D3Q19 BGK step with **16-bit moment-encoded
  state**: per cell the 19 populations are stored as 19 moments `m = M f` quantized to
  uint16 with per-moment stability-guided ranges (decode → f = M⁻¹ m → BGK collide+stream
  in f64 → encode). The frontier delta (16-bit moment quantization) mirrors
  arXiv:2602.05295 (anchor S-5/§ 10: Fig.-1 25%/4.3× vs HOME-LBM; abstract up-to-6×/50%);
  the moment basis is constructed programmatically from the velocity-set monomials
  (Gram-Schmidt, Krüger 2017 § 10.4 / d'Humières-style) and committed as data with its
  inverse — anchor (b) verifies `M·M⁻¹ = I` to FP on the EXACT basis used.
- **Anchors (≥3):** A1 mass+momentum conservation exact-to-FP over collide+stream
  (periodic, no-force regime; Krüger 2017); A2 `M·M⁻¹ = I` linear-algebra golden +
  quantization round-trip error ≤ the closed-form bound `(hi−lo)/2/65535` per moment;
  A3 bounded-quantization equivalence vs the landed `lbm-ref` parent capture on the
  canonical Poiseuille descriptor + the analytic parabolic-profile/no-slip checks.
- **PBT (≥2):** `mass_moment_conserved` + `momentum_moment_conserved` (charter § 3.1
  proposal), via the C++ doctest suite (deterministic property sweeps; Stack-C has no
  Hypothesis — the RD2D precedent runs property-style sweeps in doctest).
- **D-2 amendment:** measure max |variant − parent| (rel/abs) on the canonical descriptor
  at build; declare `[defaults.lbm-quantized]` + `[budgets.lbm-quantized.cross_stack]` +
  `[overrides.<variant-sim-name>]` with the measured value + documented margin; amendment
  note at `docs/_audits/tolerance-budget-amendments/` citing charter § 10 D-2.
- **Posture expectation:** bit-exact same-stack-same-hw under the lavapipe pin (RD2D
  precedent); vs-parent = bounded by construction (quantization), NOT bit-exact.
- **Capture:** `captures/lattice-boltzmann-d3q19-frontier-moment-encoded/poiseuille-64x32-seed42-step1000.{h5,json}`
  (descriptor per Appendix D.2.3 row — matches, no SHIFT) + corpus seed (lock 37→38).
- **TDD shape (Stack-C adaptation):** failing doctest suite committed first (RED via
  stubbed step function returning error), evidence from the ctest run; gates mirror RD2D
  stack-c (the gate-13 replay tool targets pytest — for the C++ unit the RED evidence is
  the ctest log, hashed in the commit footer; the Python-side equivalence test keeps the
  pytest path for gate-13). Local builds need `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`
  (vendored doctest; banked env note).

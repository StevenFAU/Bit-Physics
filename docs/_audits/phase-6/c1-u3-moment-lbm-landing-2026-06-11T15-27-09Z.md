# C-1 / U-3 `lattice-boltzmann-d3q19-frontier-moment-encoded` — unit landing report

> **Cluster:** Phase 6 / C-1 (charter `docs/phases/phase-6/c1-charter.md`, RATIFIED § 10;
> D-2 exercised).
> **Unit:** U-3 = Phase-4 ledger row 29 / spec § 11.5 item 4.21 — Stack C; the FIRST
> Stack-C LBM surface.
> **Verdict:** **LANDED** — 13 gates green (doctest 8/8 + frontier-equivalence ctest at
> the declared D-2 tolerance; corpus 40/40; integrity strict 0 HARD_FAIL).
> **Commit chain:** `838b161` (stage-0 probe incl. the no-Stack-C-parent SHIFT) →
> `53c826e` (stage-1a scaffold+RED, ctest evidence footer-hashed) → `9aedc3c` (stage-1b
> GREEN 8/8 + the stability-guided-ranges defect fix) → `c06d0b1` (stage-1c D-2 category
> + amendment + capture + corpus + registry + perf + CI) → *(stage-2 SHA back-filled per
> Convention #12)*.

## Gates (spec Appendix D.6, Stack-C adaptation)

| Gate | Verdict | Evidence |
|---|---|---|
| 1 spec sheet | GREEN | `docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-frontier.md` de-stubbed |
| 2 probe | GREEN | probe report incl. **SHIFT: no landed Stack-C LBM** (charter § 3.3 premise corrected; scope unchanged) + vestigial § 4.2.B socket recorded |
| 3 failing-first | GREEN | RED ctest (2 failed: doctest 5/8 via the run_lbm throw + equivalence harness) at `53c826e`; evidence sha footer-hashed |
| 4 goldens (≥3 anchors) | GREEN | A1 conservation exact-to-FP (f64) / budget-bounded (quantized); A2 `M·M⁻¹=I` ≤1e-12 + 16-bit round-trip ≤ closed-form bound; A3 canonical-horizon parent equivalence + analytic Poiseuille structure |
| 5/6 diagnostics | GREEN | per-frame rho/u diagnostics in the capture; positivity/finiteness sweeps |
| 7 citations | GREEN | arXiv:2602.05295 (live-verified, S-5 + § 10), Qian 1992, Guo 2002, Krüger 2017 |
| 8 public API | GREEN | `bit_physics::lbm_d3q19_me` header surface; clean build, no warnings observed in the lbm targets |
| 9 capture | GREEN | `captures/lattice-boltzmann-d3q19-frontier-moment-encoded/poiseuille-64x32-seed42-step1000.{h5,json}` — the D.2.3 descriptor VERBATIM; .h5 sha256 `dabb947ca87f6429d7473327941810ad9917be7b040857f9265811365e2ba763` (202 MB LFS) |
| 10 determinism↔capture | GREEN | in-run 2-run bit-identity witness (tolerance 0.0; canonical sha `2fe02516…`); registry `[lattice.lattice-boltzmann-d3q19-frontier-moment-encoded]`; manifest `bit-exact-same-hw` |
| 11 PBT (≥2) | GREEN | `mass_moment_conserved` + `momentum_moment_conserved` (+ positivity) via deterministic doctest sweeps across (tau, force) regimes |
| 12 perf-ledger | GREEN | 34.60 s canonical invocation (calibration + witness + capture) |
| 13 failing-replay | GREEN | worktree at `53c826e` rebuilt; ctest reproduces the same 2-failed RED shape (the pytest replay tool does not drive ctest — adaptation documented in spec § 13) |
| 14 cross-stack | **GREEN (two-tier)** | f64 mode vs the numpy parent: rho 3.7e-15 / u 1.6e-15 over 201 frames — INSIDE the parent `lbm` 1e-5 category (~9 orders margin); quantized mode at the NEW `lbm-quantized` category |

## D-2 exercised (measured-then-declared)

Canonical-horizon measurement (1001 frames): rho max_abs **8.5e-15**; u max_abs
**3.12e-6** (u_peak 8.65e-3 → peak-rel 3.6e-4; small-cell max_rel 1.98e-2). Declared
`[defaults.lbm-quantized] relative=5e-2, absolute=1e-5` + budget cap + amendment
`docs/_audits/tolerance-budget-amendments/2026-06-11T15-22-14Z-lbm-quantized.md` (cites
the charter § 10 D-2 operator ratification). The parent `lbm` 1e-5 category is untouched.

## SHIFTs + findings (documented)

1. **No landed Stack-C LBM** (probe § 1): charter § 3.3's "landed Stack-C D3Q19 parent"
   corrected; the variant is the first Stack-C LBM; equivalence target = the landed
   numpy `lbm-ref` capture (as anchor (c) already named). Scope unchanged.
2. **Stability-guided ranges defect (stage 1b, MEASURED):** a 64-step calibration
   envelope clamped the still-accelerating momentum moments → u error ~60% of peak at
   200 steps; full-horizon calibration brought it to 4.5e-7. Honest record of the
   paper's "stability-guided" requirement bites.
3. **§ 4.2.B socket vestigial** for row 29 (probe § 2): the sparse consumer is row 18
   (CUDA-parked); no SparseVolume surface consumed.
4. **Mutation N/A** (C++; mutmut is python-only — the rd2d-stack-c precedent).
5. **Gate-13 tooling gap** (banked): `replay_failing_tests` is pytest-only; ctest RED
   evidence is hash-footer + manual worktree replay. A ctest-mode for the tool is a
   Phase-6 tooling candidate.

## Ledger fold

`docs/phase4/ledger.md` row 29 → **landed** (this commit). The A-2 record conflict
(ledger "sound-anchor needed" vs batch-3 "rigorous anchors EXIST") was ratified at § 10
(batch-3 governs) — the landed anchors vindicate batch-3's assessment.

**Next unit per ratified § 4 order:** U-4 `eulerian-smoke-frontier-clebsch-pfm` (S23 /
4.15, Stack C — opens the greenfield particle-flow-map substrate).
